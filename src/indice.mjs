/**
 * `attorneyfw indice atualizar` — o unico ponto do subsistema de dinheiro que
 * toca a rede.
 *
 * A separacao e deliberada e esta no ADR: calculo nunca busca nada. Aqui se
 * busca e se grava; la se le. As duas consequencias que importam sao que a
 * correcao monetaria funciona sem internet — o que conta numa audiencia — e que
 * o mesmo comando, com os mesmos arquivos, devolve o mesmo numero daqui a um
 * ano.
 *
 * O arquivo guarda a variacao mensal como o Banco Central a publica, e nao um
 * numero-indice ja calculado, para que cada linha continue conferivel contra a
 * fonte.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { Erro, acharEscritorio, c, hoje, rel } from './core.mjs';
import { SERIES, dirSeries, seriesNaCarteira } from './dinheiro.mjs';

/**
 * Codigo da serie no SGS do Banco Central.
 *
 * Serie sem codigo aqui **nao e adivinhada**: o comando manda preencher a mao a
 * partir da fonte. Buscar o codigo errado produziria uma serie plausivel e
 * errada, que e o pior resultado possivel num numero que vai para peca.
 */
const SGS = {
  inpc: 188,
  ipca: 433,
  'igp-m': 189,
  selic: 4390,
};

const URL_SGS = (cod, de) =>
  `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${cod}/dados?formato=json&dataInicial=${de}`;

const INICIO = '01/07/1994'; // Plano Real: antes disso a serie nao serve para corrigir.

/** "01/03/2026" vira "2026-03". */
function mesBR(dataBR) {
  const [, m, a] = String(dataBR).split('/');
  return `${a}-${String(m).padStart(2, '0')}`;
}

async function buscar(nome) {
  const cod = SGS[nome];
  const url = URL_SGS(cod, INICIO);
  let resp;
  try {
    resp = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
  } catch (e) {
    throw new Erro(
      `nao foi possivel falar com o Banco Central (${e.message}).\n`
      + `  A serie no disco continua intacta. Tente de novo, ou preencha a mao:\n  ${url}`,
    );
  }
  if (!resp.ok) throw new Erro(`Banco Central respondeu ${resp.status} para a serie SGS ${cod}`);

  let dados;
  try {
    dados = await resp.json();
  } catch {
    throw new Erro(`Banco Central devolveu resposta ilegivel para a serie SGS ${cod}`);
  }
  if (!Array.isArray(dados) || !dados.length) throw new Erro(`serie SGS ${cod} veio vazia`);

  const pontos = new Map();
  for (const p of dados) {
    const mes = mesBR(p.data);
    const v = Number(String(p.valor).replace(',', '.'));
    if (!/^\d{4}-\d{2}$/.test(mes) || !Number.isFinite(v)) continue;
    pontos.set(mes, v);
  }
  if (!pontos.size) throw new Erro(`serie SGS ${cod} nao trouxe nenhum ponto utilizavel`);
  return { pontos, cod };
}

/** Le os pontos ja gravados, para estender a serie em vez de substitui-la. */
function pontosNoDisco(caminho) {
  const pontos = new Map();
  if (!existsSync(caminho)) return pontos;
  for (const linha of readFileSync(caminho, 'utf8').split(/\r?\n/)) {
    const [mes, val] = linha.trim().split(',');
    if (/^\d{4}-\d{2}$/.test(mes) && Number.isFinite(Number(val))) pontos.set(mes, Number(val));
  }
  return pontos;
}

/**
 * Grava por arquivo temporario e rename. Coleta interrompida no meio nao pode
 * deixar meia serie no disco: meia serie tem buraco, e buraco devolve fator
 * menor sem avisar.
 */
function gravar(caminho, texto) {
  mkdirSync(join(caminho, '..'), { recursive: true });
  const tmp = `${caminho}.tmp`;
  writeFileSync(tmp, texto, 'utf8');
  try {
    renameSync(tmp, caminho);
  } catch (e) {
    try { unlinkSync(tmp); } catch { /* o rename ja falhou; o tmp e o que sobra */ }
    throw e;
  }
}

export async function indiceAtualizar(args) {
  const raiz = acharEscritorio();
  const pedidas = args._.length ? args._ : Object.keys(SGS);

  for (const nome of pedidas) {
    if (!SERIES[nome]) throw new Erro(`serie desconhecida "${nome}". Conhecidas: ${Object.keys(SERIES).join(', ')}`);
    if (!SGS[nome]) {
      throw new Erro(
        `${SERIES[nome].rotulo} nao tem coleta automatica nesta versao.\n`
        + `  Preencha tabelas/indices/${nome}.csv a mao, com a variacao mensal publicada pelo ${SERIES[nome].fonte},\n`
        + '  e o cabecalho "# fonte:", "# coletada_em:" e "# unidade: variacao-mensal-pct".\n'
        + '  Serie sem codigo confirmado nao e adivinhada: codigo errado da numero plausivel e errado.',
      );
    }
  }

  for (const nome of pedidas) {
    const meta = SERIES[nome];
    const caminho = join(dirSeries(raiz), `${nome}.csv`);
    const antes = pontosNoDisco(caminho);

    process.stdout.write(`${c.dim(`buscando ${meta.rotulo}...`)}\r`);
    const { pontos, cod } = await buscar(nome);

    const merged = new Map([...antes, ...pontos]);
    const ordenados = [...merged.keys()].sort();

    const linhas = [
      `# serie: ${nome}`,
      `# rotulo: ${meta.rotulo}`,
      `# unidade: ${meta.unidade}`,
      `# fonte: ${meta.fonte}`,
      `# serie_fonte: Banco Central, SGS ${cod}`,
      `# coletada_em: ${hoje()}`,
      `# cobertura: ${ordenados[0]} a ${ordenados[ordenados.length - 1]}`,
      '# a variacao e a publicada pela fonte; o numero-indice e derivado na leitura',
      'mes,valor',
      ...ordenados.map((m) => `${m},${merged.get(m)}`),
      '',
    ];
    gravar(caminho, linhas.join('\n'));

    const novos = ordenados.length - antes.size;
    console.log(
      `${c.green(meta.rotulo.padEnd(7))} ${rel(raiz, caminho)}  `
      + `${ordenados[0]} a ${ordenados[ordenados.length - 1]}  `
      + c.dim(`${ordenados.length} meses${novos > 0 ? `, ${novos} novo(s)` : ''}`),
    );
  }

  const faltam = Object.keys(SERIES).filter((s) => !seriesNaCarteira(raiz).includes(s));
  if (faltam.length) console.log(c.dim(`  ainda sem serie na carteira: ${faltam.join(', ')}`));
}
