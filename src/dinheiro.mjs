/**
 * Correcao monetaria e juros de mora, com memoria de calculo.
 *
 * Existe porque o escritorio pedia o valor atualizado na minuta e o obtinha
 * digitando datas num site externo. O ganho de tempo, porem, nao esta no numero
 * final: esta na memoria. Valor corrigido sem memoria a outra parte impugna e o
 * juiz nao homologa — e o tempo economizado na minuta volta a ser gasto na fase
 * em que custa mais.
 *
 * Tres regras, todas por motivo (ver ADR "Numero gerado sai com procedencia"):
 *
 * 1. **Nenhuma requisicao de rede aqui.** Este modulo so le arquivo. Quem busca
 *    e grava e o `indice.mjs`, por comando explicito. Consequencia deliberada:
 *    o calculo funciona offline e os mesmos arquivos devolvem sempre o mesmo
 *    numero, hoje e daqui a um ano.
 * 2. **Fora da cobertura da serie, falha.** Nao extrapola, nao repete o ultimo
 *    indice, nao interpola. Estimar em silencio e a forma mais facil de produzir
 *    numero errado com aparencia de certo.
 * 3. **Aritmetica em centavos inteiros.** Ponto flutuante em dinheiro acumula
 *    residuo, e residuo em peca vira impugnacao. Arredonda-se uma vez, no fim.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Erro } from './core.mjs';

/**
 * As series conhecidas.
 *
 * O arquivo guarda **o que a fonte publica**: variacao percentual mensal. Nao
 * um numero-indice ja calculado. O motivo e auditoria — assim cada linha do CSV
 * confere contra a serie publicada, e quem duvidar do valor final refaz a conta
 * a partir do dado bruto. O numero-indice e derivado na leitura.
 *
 * A Selic e outra coisa e por isso tem unidade propria: ela **soma** em vez de
 * compor, porque e assim que se aplica na pratica tributaria e no art. 406 do
 * Codigo Civil — soma-se a taxa mensal do periodo e acrescenta-se 1% no mes do
 * pagamento. Compor daria numero maior e errado.
 */
export const SERIES = {
  inpc:     { rotulo: 'INPC',   unidade: 'variacao-mensal-pct', fonte: 'IBGE' },
  ipca:     { rotulo: 'IPCA',   unidade: 'variacao-mensal-pct', fonte: 'IBGE' },
  'ipca-e': { rotulo: 'IPCA-E', unidade: 'variacao-mensal-pct', fonte: 'IBGE' },
  'igp-m':  { rotulo: 'IGP-M',  unidade: 'variacao-mensal-pct', fonte: 'FGV' },
  selic:    { rotulo: 'Selic',  unidade: 'taxa-mensal-pct',     fonte: 'Banco Central' },
};

export const SERIE_PADRAO = 'inpc';

export const dirSeries = (raiz) => join(raiz, 'tabelas', 'indices');
const arquivoSerie = (raiz, nome) => join(dirSeries(raiz), `${nome}.csv`);

// ------------------------------------------------------------------ dinheiro

/**
 * "1.234,56", "1234,56", "1234.56" e "1234" viram 123456 centavos.
 *
 * A ambiguidade real e "1.234": ponto como milhar ou como decimal? Resolve-se
 * pelo numero de casas — tres depois do separador so pode ser milhar.
 */
export function centavos(entrada) {
  const s = String(entrada ?? '').trim().replace(/\s|R\$/g, '');
  if (!s) throw new Erro('valor vazio');
  if (!/^-?[\d.,]+$/.test(s)) throw new Erro(`valor nao numerico: "${entrada}"`);

  const sinal = s.startsWith('-') ? -1 : 1;
  let n = s.replace('-', '');
  const ultimo = Math.max(n.lastIndexOf(','), n.lastIndexOf('.'));
  let inteiro = n;
  let frac = '';
  if (ultimo >= 0 && n.length - ultimo - 1 <= 2) {
    inteiro = n.slice(0, ultimo);
    frac = n.slice(ultimo + 1);
  }
  inteiro = inteiro.replace(/[.,]/g, '');
  if (!inteiro) inteiro = '0';
  if (!/^\d*$/.test(inteiro) || !/^\d*$/.test(frac)) throw new Erro(`valor nao numerico: "${entrada}"`);
  return sinal * (Number(inteiro) * 100 + Number(frac.padEnd(2, '0').slice(0, 2)));
}

/** 123456 vira "1.234,56". Sem simbolo — quem imprime decide se poe "R$". */
export function emReais(cents) {
  const neg = cents < 0;
  const s = String(Math.abs(Math.round(cents))).padStart(3, '0');
  const inteiro = s.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${neg ? '-' : ''}${inteiro},${s.slice(-2)}`;
}

/** Meio a meio para cima, que e a convencao das tabelas praticas. */
const arredondar = (n) => Math.round(n);

// --------------------------------------------------------------------- datas

const mesDe = (iso) => String(iso).slice(0, 7);
const ehMes = (s) => /^\d{4}-\d{2}$/.test(String(s || ''));

/** Todos os meses de `a` ate `b`, inclusive. */
function meses(a, b) {
  const out = [];
  let [ano, mes] = a.split('-').map(Number);
  const [anoF, mesF] = b.split('-').map(Number);
  while (ano < anoF || (ano === anoF && mes <= mesF)) {
    out.push(`${ano}-${String(mes).padStart(2, '0')}`);
    if (++mes > 12) { mes = 1; ano++; }
  }
  return out;
}

const DIA = 86400000;
const dt = (iso) => new Date(`${iso}T12:00:00Z`);
const diasEntre = (de, ate) => Math.round((dt(ate) - dt(de)) / DIA);

// --------------------------------------------------------------------- serie

/**
 * Le a serie do disco. O cabecalho `# chave: valor` carrega a procedencia, e
 * ela e obrigatoria: serie sem fonte e sem data de coleta produz numero que
 * ninguem consegue defender.
 */
export function lerSerie(raiz, nome) {
  const meta = SERIES[nome];
  if (!meta) {
    throw new Erro(`serie desconhecida "${nome}". Conhecidas: ${Object.keys(SERIES).join(', ')}`);
  }
  const caminho = arquivoSerie(raiz, nome);
  if (!existsSync(caminho)) {
    throw new Erro(
      `a serie ${meta.rotulo} nao esta na carteira (falta tabelas/indices/${nome}.csv).\n`
      + `  Rode:  attorneyfw indice atualizar ${nome}`,
    );
  }

  const cab = {};
  const pontos = new Map();
  for (const linha of readFileSync(caminho, 'utf8').split(/\r?\n/)) {
    const l = linha.trim();
    if (!l) continue;
    if (l.startsWith('#')) {
      const [, k, v] = l.match(/^#\s*([\w-]+)\s*:\s*(.*)$/) || [];
      if (k) cab[k] = v.trim();
      continue;
    }
    if (l.startsWith('mes,')) continue;
    const [mes, val] = l.split(',');
    if (!ehMes(mes)) continue;
    const n = Number(val);
    if (!Number.isFinite(n)) throw new Erro(`tabelas/indices/${nome}.csv: valor invalido em ${mes}`);
    pontos.set(mes, n);
  }

  if (!pontos.size) throw new Erro(`tabelas/indices/${nome}.csv nao tem nenhum ponto`);
  if (!cab.fonte || !cab.coletada_em) {
    throw new Erro(
      `tabelas/indices/${nome}.csv sem procedencia (falta "# fonte:" ou "# coletada_em:").\n`
      + '  Serie sem fonte e sem data nao vai para peca. Rode `attorneyfw indice atualizar`.',
    );
  }

  const ordenados = [...pontos.keys()].sort();
  const unidade = cab.unidade || meta.unidade;

  // Um buraco no meio da serie e pior que a serie curta: a razao entre dois
  // pontos passaria por cima do mes que falta e devolveria fator menor, sem
  // nenhum sinal de que algo faltou.
  const esperados = meses(ordenados[0], ordenados[ordenados.length - 1]);
  const faltando = esperados.filter((m) => !pontos.has(m));
  if (faltando.length) {
    throw new Erro(
      `tabelas/indices/${nome}.csv tem buraco: falta ${faltando.slice(0, 3).join(', ')}`
      + `${faltando.length > 3 ? ` e mais ${faltando.length - 3}` : ''}.\n`
      + `  Rode:  attorneyfw indice atualizar ${nome}`,
    );
  }

  // O numero-indice e derivado, nunca guardado: o arquivo tem de continuar
  // conferivel contra a serie publicada.
  const indice = new Map();
  if (unidade === 'variacao-mensal-pct') {
    let acc = 100;
    for (const m of esperados) {
      acc *= 1 + pontos.get(m) / 100;
      indice.set(m, acc);
    }
  }

  return {
    nome,
    rotulo: meta.rotulo,
    unidade,
    fonte: cab.fonte,
    serieFonte: cab.serie_fonte || '',
    coletadaEm: cab.coletada_em,
    pontos,
    indice,
    de: ordenados[0],
    ate: ordenados[ordenados.length - 1],
    caminho,
  };
}

/** As series que a carteira ja tem, para o `atualizar` dizer o que existe. */
export function seriesNaCarteira(raiz) {
  const dir = dirSeries(raiz);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.csv')).map((f) => f.slice(0, -4)).sort();
}

function exigirCobertura(serie, mes, papel) {
  if (serie.pontos.has(mes)) return;
  throw new Erro(
    `${serie.rotulo} nao cobre ${mes} (${papel}).\n`
    + `  A serie vai de ${serie.de} a ${serie.ate}.\n`
    + `  Rode:  attorneyfw indice atualizar ${serie.nome}\n`
    + '  Fora da cobertura o calculo para. Nao se estima indice.',
  );
}

// ------------------------------------------------------------------ correcao

/**
 * Corrige `valor` de `de` ate `ate`, em centavos.
 *
 * Corrige por **mes cheio**: o marco e o mes das datas, nao o dia. E a
 * convencao das tabelas praticas dos tribunais. Pro rata die existe e nao e
 * padrao; quem precisar dele confere a mao, e a saida diz qual convencao usou.
 */
export function corrigir({ valor, de, ate, serie }) {
  if (serie.unidade !== 'variacao-mensal-pct') {
    throw new Erro(`${serie.rotulo} e serie de ${serie.unidade} — nao serve para correcao monetaria`);
  }
  const mesIni = mesDe(de);
  const mesFim = mesDe(ate);
  if (mesFim < mesIni) throw new Erro(`a data final (${ate}) e anterior a inicial (${de})`);

  exigirCobertura(serie, mesIni, 'termo inicial');
  exigirCobertura(serie, mesFim, 'termo final');

  const base = serie.indice.get(mesIni);

  // O mes do termo inicial e a base e por isso nao entra na memoria com
  // variacao: o que corrige o valor sao os meses posteriores a ele.
  const memoria = [];
  for (const m of meses(mesIni, mesFim)) {
    if (m === mesIni) continue;
    memoria.push({
      mes: m,
      variacao: serie.pontos.get(m),
      fator: serie.indice.get(m) / base,
    });
  }

  const fator = serie.indice.get(mesFim) / base;
  const corrigido = arredondar(valor * fator);
  return {
    tipo: 'correcao',
    serie: serie.nome,
    rotulo: serie.rotulo,
    fonte: serie.fonte,
    serieFonte: serie.serieFonte,
    coletadaEm: serie.coletadaEm,
    cobertura: `${serie.de} a ${serie.ate}`,
    convencao: 'mes cheio, base no mes do termo inicial',
    de: mesIni,
    ate: mesFim,
    valor,
    fator,
    corrigido,
    diferenca: corrigido - valor,
    memoria,
  };
}

/**
 * Juros de mora simples, `taxaMes` por cento ao mes, pro rata die sobre trinta
 * dias. E a forma mais comum nas contas judiciais; a saida declara a convencao
 * para que quem confere saiba o que esta conferindo.
 */
export function jurosSimples({ valor, de, ate, taxaMes }) {
  const dias = diasEntre(de, ate);
  if (dias < 0) throw new Erro(`a data final (${ate}) e anterior a inicial dos juros (${de})`);
  const mesesCorridos = dias / 30;
  const percentual = (taxaMes / 100) * mesesCorridos;
  const juros = arredondar(valor * percentual);
  return {
    tipo: 'juros',
    modo: 'simples',
    convencao: `${taxaMes}% ao mes, pro rata die sobre 30 dias`,
    de,
    ate,
    dias,
    meses: mesesCorridos,
    percentual,
    base: valor,
    juros,
  };
}

/**
 * Juros pela Selic acumulada — soma das taxas mensais do periodo, sem o mes do
 * termo inicial e sem o mes do pagamento, mais 1% no mes do pagamento. E a
 * regra do art. 13 da Lei 9.065/1995 e do art. 406 do Codigo Civil, e a razao
 * de a Selic somar em vez de compor.
 */
export function jurosSelic({ valor, de, ate, serie }) {
  if (serie.unidade !== 'taxa-mensal-pct') {
    throw new Erro(`${serie.rotulo} nao e serie de taxa mensal — nao serve para juros pela Selic`);
  }
  const mesIni = mesDe(de);
  const mesFim = mesDe(ate);
  if (mesFim < mesIni) throw new Erro(`a data final (${ate}) e anterior a inicial (${de})`);

  const memoria = [];
  let soma = 0;
  // Exclui o mes do termo inicial e o mes do pagamento; o ultimo entra como 1%.
  for (const m of meses(mesIni, mesFim)) {
    if (m === mesIni || m === mesFim) continue;
    exigirCobertura(serie, m, 'mes da Selic');
    const taxa = serie.pontos.get(m);
    soma += taxa;
    memoria.push({ mes: m, taxa, acumulado: soma });
  }
  soma += 1;
  memoria.push({ mes: mesFim, taxa: 1, acumulado: soma, nota: 'mes do pagamento (1%)' });

  const juros = arredondar(valor * (soma / 100));
  return {
    tipo: 'juros',
    modo: 'selic',
    convencao: 'Selic acumulada por soma, exclusos o mes inicial e o do pagamento, mais 1% no mes do pagamento',
    serie: serie.nome,
    rotulo: serie.rotulo,
    fonte: serie.fonte,
    coletadaEm: serie.coletadaEm,
    de: mesIni,
    ate: mesFim,
    percentual: soma / 100,
    base: valor,
    juros,
    memoria,
  };
}

/**
 * Correcao e juros na ordem em que a conta judicial os aplica: corrige-se
 * primeiro, e os juros incidem sobre o valor ja corrigido.
 */
export function conta({ valor, de, ate, serie, juros }) {
  const correcao = corrigir({ valor, de, ate, serie });
  let jur = null;
  if (juros) {
    const base = correcao.corrigido;
    jur = juros.modo === 'selic'
      ? jurosSelic({ valor: base, de: juros.de, ate, serie: juros.serie })
      : jurosSimples({ valor: base, de: juros.de, ate, taxaMes: juros.taxaMes });
  }
  return { correcao, juros: jur, total: correcao.corrigido + (jur?.juros || 0) };
}
