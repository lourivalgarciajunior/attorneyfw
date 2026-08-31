/**
 * Conferencia numerica da peca pronta.
 *
 * Tres defeitos encontrados em oito pecas reais, nenhum deles exigindo
 * conhecimento juridico — todos exigindo conferencia:
 *
 * 1. **Extenso contra algarismo.** Num alvara: `R$ 7.155,76` mais `R$ 27,10`
 *    dao `R$ 7.182,86`, e a soma esta certa; o extenso na mesma linha diz
 *    *"...e oitenta centavos"*. Em pedido de alvara o extenso costuma
 *    prevalecer, entao o que saiu errado foi justamente a parte que o cartorio
 *    le com atencao.
 * 2. **Item alegado contra item pedido.** Numa declaratoria, a lista numerada
 *    vai de 1 a 76 e tem 75 itens; um numero esta grafado com ponto-e-virgula no
 *    meio dos digitos e reaparece assim **dentro do pedido**; e o pedido inclui
 *    um item que nao consta dos fatos.
 * 3. **Numero dentro das aspas.** Numa anulatoria fiscal, a transcricao do auto
 *    de infracao diz `,21` e o paragrafo seguinte usa `,25` — e a soma da peca
 *    fecha com o `,25`. O erro esta na citacao direta do documento que a propria
 *    autora juntou.
 *
 * O que os tres tem em comum: sao **comparacoes**, nao juizos. A pessoa atenta
 * falha justamente neles, porque confia no numero que ja leu uma vez. Maquina
 * nao le duas vezes — compara.
 *
 * Duas regras valem para os tres (ver ADR):
 *
 * - **Divergencia sai como par**, com os dois lados a vista. Nunca "valor
 *   incorreto": a ferramenta nao sabe qual dos dois esta certo, e fingir que
 *   sabe faria o advogado corrigir o lado errado.
 * - **Nada e corrigido.** Nas tres pecas o lado certo foi diferente.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Erro, acharEscritorio, c, canon, entregas, exigirMateria, lista, rel, slug, tabela } from './core.mjs';
import { alvosDe } from './entrega.mjs';
import { build } from './build.mjs';
import { centavos, emReais } from './dinheiro.mjs';
import { MESES, citacoesDe, cobre } from './citacao.mjs';

const sa = (s) => String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// ------------------------------------------------------- extenso -> numero

const UNIDADES = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6,
  sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14,
  catorze: 14, quinze: 15, dezesseis: 16, dezasseis: 16, dezessete: 17, dezassete: 17,
  dezoito: 18, dezenove: 19, dezanove: 19, vinte: 20, trinta: 30, quarenta: 40,
  cinquenta: 50, cincoenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
  cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300,
  quatrocentos: 400, quatrocentas: 400, quinhentos: 500, quinhentas: 500,
  seiscentos: 600, seiscentas: 600, setecentos: 700, setecentas: 700,
  oitocentos: 800, oitocentas: 800, novecentos: 900, novecentas: 900,
};
const ESCALAS = { mil: 1e3, milhao: 1e6, milhoes: 1e6, bilhao: 1e9, bilhoes: 1e9 };
const IGNORA = new Set(['e', 'de', 'do', 'da']);

/**
 * Soma um trecho por extenso. Devolve `null` quando encontra palavra que nao
 * conhece — silencio e melhor que palpite, porque um numero "conferido" errado
 * e pior que um numero nao conferido.
 */
function paraNumero(txt) {
  const palavras = sa(txt).split(/[^a-z]+/).filter(Boolean).filter((w) => !IGNORA.has(w));
  if (!palavras.length) return null;
  let total = 0;
  let grupo = 0;
  let viu = false;
  for (const w of palavras) {
    if (UNIDADES[w] !== undefined) { grupo += UNIDADES[w]; viu = true; continue; }
    if (ESCALAS[w] !== undefined) {
      // "mil" sozinho vale 1000; "duzentos mil" vale 200 x 1000.
      total += (grupo || 1) * ESCALAS[w];
      grupo = 0;
      viu = true;
      continue;
    }
    return null;
  }
  return viu ? total + grupo : null;
}

/** `"mil reais e cinquenta centavos"` vira 100050 centavos. */
export function extensoEmCentavos(txt) {
  const t = sa(txt);
  const iReal = t.search(/\breais\b|\breal\b/);
  const iCent = t.search(/\bcentavos?\b/);

  if (iReal >= 0) {
    const inteiro = paraNumero(t.slice(0, iReal));
    if (inteiro === null) return null;
    if (iCent > iReal) {
      const cent = paraNumero(t.slice(iReal, iCent).replace(/^\s*(reais|real)/, ''));
      if (cent === null) return null;
      return inteiro * 100 + cent;
    }
    return inteiro * 100;
  }
  if (iCent >= 0) {
    const cent = paraNumero(t.slice(0, iCent));
    return cent === null ? null : cent;
  }
  const n = paraNumero(t);
  return n === null ? null : n * 100;
}

// --------------------------------------------------------------- extenso

const RE_VALOR_COM_EXTENSO = /R\$\s*R?\$?\s*([\d.]+,\d{2})\s*\(([^)]{8,220})\)/g;

function confereExtenso(texto) {
  const out = [];
  for (const m of texto.matchAll(RE_VALOR_COM_EXTENSO)) {
    const algarismo = centavos(m[1]);
    const porExtenso = extensoEmCentavos(m[2]);
    if (porExtenso === null || porExtenso === algarismo) continue;
    out.push({
      tipo: 'extenso',
      esquerda: { rotulo: 'algarismo', valor: `R$ ${emReais(algarismo)}` },
      direita: { rotulo: 'por extenso', valor: `R$ ${emReais(porExtenso)}` },
      trecho: m[2].replace(/\s+/g, ' ').slice(0, 120),
    });
  }
  return out;
}

// ------------------------------------------------------------------ soma

const RE_TOTAL = /(?:totaliz\w*|perfaz\w*|no total de|somando)[^.]{0,60}?R\$\s*([\d.]+,\d{2})/gi;
const RE_VALOR = /R\$\s*R?\$?\s*([\d.]+,\d{2})/g;

/**
 * Confere o total declarado contra as parcelas que o antecedem.
 *
 * A janela comeca no paragrafo do total e recua ate dois paragrafos — no caso do
 * alvara, uma das parcelas estava dois paragrafos atras. Assim que alguma
 * combinacao final fecha, para: erra-se para o silencio, e nao para o alarme.
 */
function confereSoma(texto) {
  const paras = texto.split(/\n{2,}/);
  const out = [];

  paras.forEach((p, i) => {
    RE_TOTAL.lastIndex = 0;
    const mt = RE_TOTAL.exec(p);
    if (!mt) return;
    const total = centavos(mt[1]);

    const janela = paras.slice(Math.max(0, i - 2), i + 1).join('\n\n');
    const ate = janela.lastIndexOf(mt[0]);
    RE_VALOR.lastIndex = 0;
    const parcelas = [...janela.slice(0, ate).matchAll(RE_VALOR)].map((x) => centavos(x[1]));
    if (parcelas.length < 2) return;

    // As k ultimas parcelas, de 2 ate todas. Qualquer uma que feche encerra.
    for (let k = 2; k <= parcelas.length; k++) {
      const usadas = parcelas.slice(-k);
      if (usadas.reduce((a, b) => a + b, 0) === total) return;
    }
    out.push({
      tipo: 'soma',
      esquerda: { rotulo: 'parcelas somadas', valor: parcelas.map((x) => `R$ ${emReais(x)}`).join(' + ') },
      direita: { rotulo: 'total declarado', valor: `R$ ${emReais(total)}` },
      trecho: mt[0].replace(/\s+/g, ' ').slice(0, 120),
    });
  });
  return out;
}

// ------------------------------------------------------------------ itens

/**
 * Item de lista enumerada. O valor e capturado **inteiro**, ate o fim da linha,
 * e classificado depois.
 *
 * A primeira versao exigia que o valor nao tivesse `;` no meio — e com isso o
 * item malformado `98841;1749` simplesmente nao casava, e a lista aparecia com
 * um indice a menos. O relatorio dizia "falta o item 72" onde o certo e "o item
 * 72 esta malformado", que e outro defeito e outra correcao. Capturar e depois
 * classificar diz a verdade nos dois casos.
 */
const RE_ITEM = /^[ \t]*(\d{1,4})\s*[-.)]\s*(\S.*?)[;,.]?[ \t]*$/gm;
const RE_PEDIDO = /(?:ante o exposto|diante do exposto|isto posto|pelo exposto|dos pedidos|requer)/i;

/**
 * Lista enumerada nos fatos contra a lista no pedido.
 *
 * O pedido e o que vira dispositivo da sentenca. Item malformado ali nao casa
 * com nenhuma linha da fatura, e a declaracao de inexistencia nao o alcanca —
 * sobra exatamente a cobranca que se queria derrubar.
 */
function confereItens(texto) {
  const itens = [...texto.matchAll(RE_ITEM)].map((m) => ({ idx: Number(m[1]), valor: m[2] }));
  if (itens.length < 5) return []; // lista curta e enumeracao de topico, nao inventario

  const out = [];

  // 1. buraco na sequencia
  const max = Math.max(...itens.map((x) => x.idx));
  const presentes = new Set(itens.map((x) => x.idx));
  const faltando = [];
  for (let i = 1; i <= max; i++) if (!presentes.has(i)) faltando.push(i);
  if (faltando.length) {
    out.push({
      tipo: 'item',
      esquerda: { rotulo: 'a numeracao vai ate', valor: String(max) },
      direita: { rotulo: 'itens presentes', valor: `${itens.length} — falta ${faltando.slice(0, 8).join(', ')}` },
      trecho: 'lista enumerada nos fatos',
    });
  }

  // 2. forma divergente: a maioria manda, e quem foge dela e o suspeito
  const forma = (v) => `${/^\d+$/.test(v) ? 'd' : 'x'}${v.length}`;
  const contagem = {};
  for (const x of itens) contagem[forma(x.valor)] = (contagem[forma(x.valor)] || 0) + 1;
  const dominante = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0];
  if (!dominante || dominante[1] < itens.length * 0.7) return out;

  const bons = itens.filter((y) => forma(y.valor) === dominante[0]);
  const digitos = dominante[0][0] === 'd' ? Number(dominante[0].slice(1)) : 0;
  for (const x of itens.filter((y) => forma(y.valor) !== dominante[0])) {
    out.push({
      tipo: 'item',
      esquerda: { rotulo: `item ${x.idx}`, valor: x.valor },
      direita: { rotulo: 'forma dos demais', valor: digitos ? `${digitos} digitos` : dominante[0] },
      trecho: 'item malformado — no pedido, nao casa com nenhuma linha da cobranca',
    });
  }

  // 3. lista dos fatos contra a lista do pedido. So os bem-formados entram na
  //    comparacao: o malformado ja foi apontado acima, e conta-lo de novo como
  //    "ausente do pedido" diria duas coisas sobre o mesmo defeito.
  const iPedido = texto.search(RE_PEDIDO);
  if (iPedido < 0 || !digitos) return out;
  const pedido = texto.slice(iPedido);

  // Numero de fatura, processo ou protocolo tem a mesma forma e nao e item.
  const alvo = new RegExp(`(.{0,12}?)\\b(\\d{${digitos}})\\b`, 'g');
  const noPedido = new Set(
    [...pedido.matchAll(alvo)]
      .filter((m) => !/n[.ºo°]\s*$|fatura\s*$|processo\s*$|protocolo\s*$|autos\s*$/i.test(m[1]))
      .map((m) => m[2]),
  );
  if (noPedido.size < 3) return out;
  const nosFatos = new Set(bons.map((x) => x.valor));

  for (const v of [...nosFatos].filter((x) => !noPedido.has(x))) {
    out.push({
      tipo: 'item',
      esquerda: { rotulo: 'alegado nos fatos', valor: v },
      direita: { rotulo: 'no pedido', valor: 'ausente' },
      trecho: 'item alegado que o pedido nao alcanca',
    });
  }
  for (const v of [...noPedido].filter((x) => !nosFatos.has(x))) {
    out.push({
      tipo: 'item',
      esquerda: { rotulo: 'pedido inclui', valor: v },
      direita: { rotulo: 'nos fatos', valor: 'ausente' },
      trecho: 'item pedido sem causa de pedir individualizada',
    });
  }
  return out;
}

// ---------------------------------------------------- transcricao com lastro

const RE_TRANSCRICAO = /^```transcricao[ \t]+([A-Za-z0-9-]+)[ \t]*\n([\s\S]*?)^```[ \t]*$/gm;

/**
 * A mesma transcricao **depois do `build`**, que a converte em citacao recuada e
 * a assina com o id do documento.
 *
 * As duas formas sao aceitas porque o `conferir` roda sobre o markdown gerado —
 * e e ele que sai —, mas quem rodar sobre o rascunho tambem tem de ser atendido.
 */
const RE_TRANSCRICAO_RENDERIZADA = /((?:^>.*\n)+?)^>[ \t]*_\(([A-Za-z0-9-]+)\)_[ \t]*$/gm;

function blocosDeTranscricao(texto) {
  const out = [];
  for (const m of texto.matchAll(RE_TRANSCRICAO)) out.push({ id: m[1], corpo: m[2] });
  for (const m of texto.matchAll(RE_TRANSCRICAO_RENDERIZADA)) {
    out.push({ id: m[2], corpo: m[1].replace(/^>[ \t]?/gm, '') });
  }
  return out;
}

/**
 * Confere os numeros de dentro das aspas contra os que a ficha do documento
 * registra.
 *
 * Nasceu do pior achado do corpus: numa anulatoria fiscal, a transcricao do auto
 * de infracao dizia `R$ 344.568,21` e o paragrafo seguinte usava `R$ 344.568,25`
 * — e a soma da propria peca fecha com o `,25`. O erro estava **dentro da
 * citacao direta**, marcada com "(Grifo nosso)".
 *
 * E a pior posicao possivel para um erro de digitacao. A peca inteira sustenta
 * que o Fisco errou; a Fazenda responde exibindo que a autora transcreveu errado
 * o documento que ela mesma juntou.
 */
function confereTranscricoes(texto, documentos) {
  const out = [];
  const porId = new Map(documentos.map((d) => [String(d.id), d]));

  for (const { id, corpo } of blocosDeTranscricao(texto)) {
    const d = porId.get(id);
    if (!d) {
      out.push({
        tipo: 'transcricao',
        esquerda: { rotulo: 'transcricao declara', valor: id },
        direita: { rotulo: 'no canon de documentos', valor: 'ausente' },
        trecho: 'transcricao com origem que o canon nao conhece',
      });
      continue;
    }
    const registrados = d.valores.map((v) => centavos(v));
    if (!registrados.length) continue; // a ficha ainda nao registra valor: nada a comparar

    RE_VALOR.lastIndex = 0;
    for (const v of corpo.matchAll(RE_VALOR)) {
      const transcrito = centavos(v[1]);
      if (registrados.includes(transcrito)) continue;

      // Mesma parte inteira e centavos diferentes e o sinal forte: e digitacao,
      // e nao outro valor. Vira par; o resto vira aviso mais adiante.
      const parecido = registrados.find((r) => Math.trunc(r / 100) === Math.trunc(transcrito / 100));
      out.push({
        tipo: 'transcricao',
        esquerda: { rotulo: `transcrito de ${id}`, valor: `R$ ${emReais(transcrito)}` },
        direita: parecido === undefined
          ? { rotulo: `a ficha de ${id} registra`, valor: d.valores.map((x) => `R$ ${emReais(centavos(x))}`).join(', ') || '(nada)' }
          : { rotulo: `a ficha de ${id} registra`, valor: `R$ ${emReais(parecido)}` },
        trecho: parecido === undefined
          ? 'valor transcrito que a ficha do documento nao registra'
          : 'valor transcrito diverge do que a ficha registra — dentro das aspas',
      });
    }
  }
  return out;
}

// ------------------------------------------ texto do topico x contrato dele

/**
 * A quinta conferencia.
 *
 * As quatro primeiras comparam a peca com ela mesma e com a ficha do documento.
 * Esta compara o texto do topico com o **contrato** declarado logo acima dele —
 * e por isso e a unica que nao roda sobre o markdown do `build`: o contrato e
 * removido de proposito antes de a peca sair.
 *
 * Cinco comparacoes:
 *
 * 1. citacao no texto que o contrato nao declara;
 * 2. fundamento declarado que a prosa nao invoca;
 * 3. documento declarado que o texto nao menciona;
 * 4. contrato preenchido e prosa vazia;
 * 5. e o caso em que nao ha o que comparar — que sai calado.
 *
 * O que ela **nao** confere e o mesmo que o extrator recusa: existencia,
 * vigencia, superacao e pertinencia do dispositivo. As quatro sao leitura, e
 * ficam com o agente de fundamento.
 */
const MIN_PALAVRAS_TOPICO = 25;

export function conferirTopicos(topicos, documentos = []) {
  const out = [];
  const porId = new Map(documentos.map((d) => [String(d.id || '').toLowerCase(), d]));

  for (const t of topicos || []) {
    const quem = String(t.id || '?');
    const declaradas = lista(t.fundamento)
      .map((f) => ({ texto: f, cits: citacoesDe(f) }));
    const todas = declaradas.flatMap((d) => d.cits);
    const resumo = lista(t.fundamento).join('; ') || '(nada)';

    // Contrato cheio e prosa vazia e uma promessa com nada atras dela. O gate
    // contava palavras da entrega inteira, e um topico vazio se escondia atras
    // de outro bem escrito.
    if ((t.palavras || 0) < MIN_PALAVRAS_TOPICO) {
      if (String(t.sustenta || '').trim() || todas.length) {
        out.push({
          tipo: 'topico-sem-texto', topico: quem,
          esquerda: { rotulo: 'o contrato sustenta', valor: String(t.sustenta || '(preenchido)').trim() },
          direita: { rotulo: 'o texto do topico tem', valor: `${t.palavras || 0} palavra(s)` },
          trecho: 'contrato declarado e prosa vazia',
        });
      }
      continue; // sem texto nao ha o que comparar: as outras quatro calam
    }

    const noTexto = citacoesDe(t.texto);
    const leisDeclaradas = new Set(todas.map((c) => c.lei || c.chave));

    for (const cit of noTexto) {
      if (todas.some((d) => cobre(d, cit))) continue;
      // Mencao a lei sem artigo so vira achado quando a lei inteira esta fora do
      // contrato. "A Lei 9.610/98 protege..." depois de a lei ja ter sido
      // declarada com artigo e mencao de passagem — e aviso que dispara sempre e
      // aviso que ninguem le.
      if (cit.tipo === 'lei' && leisDeclaradas.has(cit.chave)) continue;
      out.push({
        tipo: 'citacao-fora-do-contrato', topico: quem,
        esquerda: { rotulo: 'o texto cita', valor: cit.rotulo },
        direita: { rotulo: 'o fundamento declara', valor: resumo },
        trecho: 'citacao que o contrato do topico nao declara',
      });
    }

    for (const d of declaradas) {
      // Declaracao que o extrator nao reconhece nao e comparada em direcao
      // nenhuma. Silencio, e nao palpite.
      if (!d.cits.length) continue;
      if (d.cits.some((dc) => noTexto.some((ct) => cobre(dc, ct) || cobre(ct, dc)))) continue;
      out.push({
        tipo: 'fundamento-nao-usado', topico: quem,
        esquerda: { rotulo: 'o fundamento declara', valor: d.texto },
        direita: { rotulo: 'a prosa do topico', valor: 'nao o invoca' },
        trecho: 'fundamento declarado e nao usado no texto',
      });
    }

    const alvo = sa(t.texto);
    for (const id of lista(t.documentos)) {
      const d = porId.get(String(id).toLowerCase());
      const apelidos = [id, ...(d ? [d.nome, ...(d.apelidos || [])] : [])].filter(Boolean);
      if (apelidos.some((a) => alvo.includes(sa(a)))) continue;
      out.push({
        tipo: 'documento-nao-citado', topico: quem,
        esquerda: { rotulo: 'o contrato declara', valor: `documentos: [${id}]` },
        direita: { rotulo: 'a prosa do topico', valor: 'nao o menciona' },
        trecho: 'documento declarado e nunca mencionado no texto',
      });
    }
  }
  return out;
}

// ---------------------------------------- continuidade de fato entre topicos

/**
 * A sexta conferencia.
 *
 * O template da cronologia promete, desde a 0.1.0 e em toda materia nova, que
 * "e contra isto que se confere se a data citada no topico 4 bate com a do
 * topico 9". Ate a 0.7.0 nada conferia: quatro modulos liam a cronologia — o
 * diagrama, o brief, a busca e o status — e nenhum comparava.
 *
 * A pergunta que da forma a isto nao e "como conferir continuidade". E: **o que
 * em continuidade e comparacao?** Dizer que o topico 4 fala do mesmo evento do
 * topico 9 e leitura, e leitura nao mora aqui.
 *
 * So e comparavel o que tem **ancora declarada**: a cronologia declara as datas
 * dos fatos, o contrato declara os documentos, o canon declara as grafias. Contra
 * as tres, comparar e mecanico. Fora delas, a ferramenta **cala** — nao ha
 * casamento por proximidade, nao ha "o marco mais parecido", e ela **nunca infere
 * que dois fatos sao o mesmo fato**.
 */
const RE_DATA_NUM = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/g;
const RE_DATA_EXT = new RegExp(`\\b(\\d{1,2})\\s+de\\s+(${MESES.map((x) => x.replace('c', '[cç]')).join('|')})\\s+de\\s+(\\d{4})\\b`, 'gi');
const RE_ISO = /\b(\d{4})-(\d{2})-(\d{2})\b/g;

const iso = (a, m, d) => {
  const [A, M, D] = [Number(a), Number(m), Number(d)];
  if (M < 1 || M > 12 || D < 1 || D > 31) return null;
  return `${A}-${String(M).padStart(2, '0')}-${String(D).padStart(2, '0')}`;
};

/** `12/03/2024`, `12 de marco de 2024` e `2024-03-12` viram a mesma chave. */
export function normalizarData(txt) {
  const t = String(txt || '').trim();
  for (const [re, ordem] of [[RE_DATA_NUM, 'dmy'], [RE_DATA_EXT, 'ext'], [RE_ISO, 'ymd']]) {
    re.lastIndex = 0;
    const m = re.exec(t);
    if (!m) continue;
    if (ordem === 'dmy') return iso(m[3], m[2], m[1]);
    if (ordem === 'ymd') return iso(m[1], m[2], m[3]);
    return iso(m[3], MESES.findIndex((x) => sa(x) === sa(m[2])) + 1, m[1]);
  }
  return null;
}

/**
 * O texto do topico sem o que e citacao.
 *
 * Bloco cercado e trecho recuado sao do documento, e nao da peca. A ferramenta ja
 * decidiu que transcricao nao se corrige — apontar uma data ali dentro seria pedir
 * que se falsificasse a citacao para ela bater com a cronologia.
 */
const prosaDe = (texto) => String(texto || '')
  .replace(/```[\s\S]*?```/g, '')
  .replace(/^[ \t]*>.*$/gm, '');

/** Datas completas da prosa. Ano solto nao e data: `Lei 8.078, de 1990` nao entra. */
export function datasEmProsa(texto) {
  const t = prosaDe(texto);
  const out = [];
  for (const re of [RE_DATA_NUM, RE_DATA_EXT]) {
    re.lastIndex = 0;
    for (const m of t.matchAll(re)) {
      const chave = normalizarData(m[0]);
      if (chave) out.push({ chave, grafia: m[0] });
    }
  }
  return out;
}

/**
 * Grafia que casa com um nome do canon a menos de acento ou pontuacao, mas nao e
 * a declarada.
 *
 * Diferenca **so de caixa nao conta**: qualificacao em caixa alta e forma normal
 * de peca, e reclamar dela seria ruido em toda peca do mundo.
 */
export function grafiasForaDoCanon(texto, aceitas) {
  const palavras = prosaDe(texto).split(/\s+/)
    .map((w) => w.replace(/^[^\wÀ-ÿ]+|[^\wÀ-ÿ]+$/g, ''))
    .filter(Boolean);
  const porChave = new Map();
  for (const a of aceitas) {
    const k = slug(a);
    if (k.length < 4) continue; // sigla curta casa com qualquer coisa
    if (!porChave.has(k)) porChave.set(k, a);
  }
  const tamanhos = [...new Set([...porChave.values()].map((a) => a.trim().split(/\s+/).length))];

  const out = new Map();
  for (const n of tamanhos) {
    for (let i = 0; i + n <= palavras.length; i++) {
      const trecho = palavras.slice(i, i + n).join(' ');
      const declarada = porChave.get(slug(trecho));
      if (!declarada) continue;
      if (trecho.toUpperCase() === declarada.toUpperCase()) continue;
      out.set(`${trecho} ${declarada}`, { grafia: trecho, declarada });
    }
  }
  return [...out.values()];
}

const m0 = (id) => `topico ${id}`;

export function conferirContinuidade(topicos, cn = {}, cronologia = '') {
  const out = [];
  const ts = (topicos || []).filter((t) => String(t.texto || '').trim());

  const marcos = tabela(cronologia, { data: ['data'], fato: ['fato', 'evento'] })
    .map((x) => normalizarData(x.data)).filter(Boolean);
  const naCrono = new Set(marcos);

  // ---- 1. data no texto que a cronologia nao registra
  if (naCrono.size) {
    const onde = new Map();
    for (const t of ts) {
      for (const d of datasEmProsa(t.texto)) {
        if (naCrono.has(d.chave)) continue;
        if (!onde.has(d.chave)) onde.set(d.chave, { grafia: d.grafia, topicos: [] });
        const reg = onde.get(d.chave);
        if (!reg.topicos.includes(String(t.id))) reg.topicos.push(String(t.id));
      }
    }
    for (const [, reg] of onde) {
      out.push({
        tipo: 'data-fora-da-cronologia', topico: reg.topicos.join(', '),
        esquerda: { rotulo: 'a peca cita', valor: reg.grafia },
        direita: { rotulo: 'a cronologia tem', valor: `${naCrono.size} marco(s), nenhum nesta data` },
        trecho: 'data no texto que a cronologia nao registra',
      });
    }
  }

  // ---- 2. datas divergentes entre topicos que declaram o mesmo documento
  // Topico que declara DOIS documentos fica de fora: atribuir a data a um deles
  // seria inferencia, e inferencia nao mora aqui.
  const porDoc = new Map();
  for (const t of ts) {
    const docs = lista(t.documentos);
    if (docs.length !== 1) continue;
    const id = String(docs[0]);
    if (!porDoc.has(id)) porDoc.set(id, []);
    for (const d of datasEmProsa(t.texto)) porDoc.get(id).push({ ...d, topico: String(t.id) });
  }
  const fichaDe = new Map((cn.documentos || []).map((d) => [String(d.id), d]));
  for (const [id, citadas] of porDoc) {
    // Por TOPICO, e nao por data solta. Duas datas dentro do mesmo topico sao
    // legitimas — contrato e aditivo —, e dizer qual delas e a do documento seria
    // inferencia. A divergencia so existe entre topicos que **nao compartilham
    // nenhuma** data: se um cita 12/03 e 15/03 e o outro cita 15/03, eles
    // concordam em alguma coisa, e nao ha o que apontar.
    const porTopico = new Map();
    for (const x of citadas) {
      if (!porTopico.has(x.topico)) porTopico.set(x.topico, []);
      porTopico.get(x.topico).push(x);
    }
    const tops = [...porTopico.entries()];
    for (let i = 0; i < tops.length; i++) {
      for (let j = i + 1; j < tops.length; j++) {
        const [ta, da] = tops[i];
        const [tb, db] = tops[j];
        if (da.some((x) => db.some((y) => y.chave === x.chave))) continue;
        out.push({
          tipo: 'data-divergente-do-documento', topico: `${ta}, ${tb}`,
          esquerda: { rotulo: `${m0(ta)} cita`, valor: da.map((x) => x.grafia).join(', ') },
          direita: { rotulo: `${m0(tb)} cita`, valor: db.map((x) => x.grafia).join(', ') },
          trecho: `datas sem interseccao em topicos que declaram ${id}`,
        });
      }
    }

    // Contra a ficha, so quando NENHUMA das datas do topico e a registrada: com
    // a data da ficha presente ao lado de outra, o topico ja a cita.
    const daFicha = normalizarData(fichaDe.get(id)?.fm?.data || '');
    if (!daFicha) continue;
    for (const [top, ds] of porTopico) {
      if (ds.some((x) => x.chave === daFicha)) continue;
      out.push({
        tipo: 'data-divergente-do-documento', topico: top,
        esquerda: { rotulo: `${m0(top)} cita`, valor: ds.map((x) => x.grafia).join(', ') },
        direita: { rotulo: `a ficha de ${id} registra`, valor: fichaDe.get(id).fm.data },
        trecho: 'nenhuma data do topico e a que a ficha do documento registra',
      });
    }
  }

  // ---- 3. grafia divergente de um nome do canon
  const aceitas = [...(cn.partes || []), ...(cn.documentos || [])]
    .flatMap((x) => [x.nome, ...(x.apelidos || [])]).filter(Boolean);
  for (const t of ts) {
    for (const g of grafiasForaDoCanon(t.texto, aceitas)) {
      out.push({
        tipo: 'grafia-fora-do-canon', topico: String(t.id),
        esquerda: { rotulo: 'o texto escreve', valor: g.grafia },
        direita: { rotulo: 'o canon declara', valor: g.declarada },
        trecho: 'grafia que nao e a declarada no canon',
      });
    }
  }
  return out;
}


/**
 * O que a continuidade **nao** conferiu nesta peca.
 *
 * Sem cronologia nao ha ancora, e a comparacao simplesmente nao roda. Isso sai
 * dito — e nao vira cobranca: relatorio calado sobre o que nao olhou e lido como
 * se tivesse olhado tudo.
 */
export function continuidadeNaoConferida(topicos, cronologia = '') {
  const marcos = tabela(cronologia, { data: ['data'], fato: ['fato'] })
    .map((x) => normalizarData(x.data)).filter(Boolean);
  if (marcos.length) return '';
  const n = new Set((topicos || []).flatMap((t) => datasEmProsa(t.texto).map((d) => d.chave))).size;
  if (!n) return '';
  return `  A peca cita ${n} data(s) e a cronologia esta vazia — nenhuma foi conferida contra ela.`;
}

// ---------------------------------------------------------------- comando

export function conferirTexto(texto, documentos = []) {
  return [
    ...confereExtenso(texto),
    ...confereSoma(texto),
    ...confereItens(texto),
    ...confereTranscricoes(texto, documentos),
  ];
}

const ROTULO = {
  extenso: 'extenso x algarismo',
  soma: 'soma x total',
  item: 'item x pedido',
  transcricao: 'transcricao x ficha do documento',
  'citacao-fora-do-contrato': 'texto x contrato do topico',
  'fundamento-nao-usado': 'texto x contrato do topico',
  'documento-nao-citado': 'texto x contrato do topico',
  'topico-sem-texto': 'texto x contrato do topico',
  'data-fora-da-cronologia': 'continuidade de fato',
  'data-divergente-do-documento': 'continuidade de fato',
  'grafia-fora-do-canon': 'continuidade de fato',
};

// A recusa vai impressa em toda conferencia, com achado ou sem achado. Relatorio
// que so lista o que achou e lido como se tivesse achado tudo — e aqui o que
// falta e justamente a parte que exige advogado.
const NAO_CONFERIDO = [
  '  Nao foi conferido: se o dispositivo existe, se esta em vigor, se foi',
  '  superado, nem se sustenta o que o topico afirma. Isso e leitura, e nao',
  '  comparacao. Tambem nao confere numero dentro de imagem anexada.',
  '  E a continuidade nao infere que dois fatos sao o mesmo fato: ela compara',
  '  contra ancora declarada — a cronologia, o documento do contrato, o nome do',
  '  canon — e cala fora delas. Nao diz qual das duas datas esta certa.',
];

/** A cronologia da materia, ou vazio — a ancora da primeira comparacao. */
const cronologiaDe = (m) => {
  const arq = join(m.dir, 'docs', 'canon', 'cronologia.md');
  return existsSync(arq) ? readFileSync(arq, 'utf8') : '';
};

export function conferir(args) {
  const m = exigirMateria(args);
  const raiz = acharEscritorio();
  const pedido = args._[0];
  if (!pedido) throw new Erro('Uso: attorneyfw conferir <entrega> [--json]');

  const [e] = alvosDe(entregas(m), pedido);
  // Conferir uma versao e protocolar outra e pior que nao conferir: o texto
  // examinado tem de ser o que sai.
  const fonte = join(m.dir, 'saida', `${e.fm.id || e.arquivo.replace('.md', '')}.md`);
  if (!existsSync(fonte)) build({ ...args, _: [String(e.numero)] });
  const texto = readFileSync(fonte, 'utf8');

  const cn = canon(m, raiz);
  const docs = cn.documentos;
  const crono = cronologiaDe(m);
  const achados = [
    ...conferirTexto(texto, docs.map((d) => ({ id: d.id, valores: lista(d.fm.valores) }))),
    // A quinta e a sexta nao rodam sobre o papel: o `build` remove o contrato de
    // topico de proposito, e sem contrato nao ha com o que comparar o texto nem a
    // quem atribuir a data. As duas leem a entrega na origem.
    ...conferirTopicos(e.topicos, docs.map((d) => ({ id: d.id, nome: d.nome, apelidos: d.apelidos }))),
    ...conferirContinuidade(e.topicos, cn, crono),
  ];
  const naoConferida = continuidadeNaoConferida(e.topicos, crono);

  if (args.json) {
    console.log(JSON.stringify({
      arquivo: rel(raiz, fonte), achados, corrigiu: false,
      nota: 'divergencia sai como par; a ferramenta nao sabe qual lado esta certo',
      naoConferido: ['existencia', 'vigencia', 'superacao', 'pertinencia do dispositivo',
        'qual das duas datas esta certa', 'que dois fatos sejam o mesmo fato'],
      continuidade: naoConferida || 'conferida contra a cronologia',
    }, null, 2));
    return achados.length ? 1 : 0;
  }

  console.log(c.b(`conferencia — ${rel(raiz, fonte)}`));
  if (!achados.length) {
    console.log(c.green('\n  Nenhuma divergencia nas seis conferencias.'));
    console.log(c.dim('  Extenso, soma, item, transcricao, texto x contrato e continuidade.\n'));
    if (naoConferida) console.log(c.yellow(naoConferida));
    for (const l of NAO_CONFERIDO) console.log(c.dim(l));
    return 0;
  }

  console.log(c.dim(`${achados.length} divergencia(s) — nada foi corrigido\n`));
  for (const a of achados) {
    const onde = a.topico ? c.dim(` [${m.voc.topico} ${a.topico}]`) : '';
    console.log(`  ${c.yellow(ROTULO[a.tipo])}${onde}  ${c.dim(a.trecho)}`);
    console.log(`    ${a.esquerda.rotulo.padEnd(22)} ${c.b(a.esquerda.valor)}`);
    console.log(`    ${a.direita.rotulo.padEnd(22)} ${c.b(a.direita.valor)}`);
    console.log('');
  }
  console.log(c.dim('  Os dois lados estao a vista de proposito: a ferramenta nao sabe qual'));
  console.log(c.dim('  esta certo. Escolher qual prevalece e de quem assina.\n'));
  if (naoConferida) console.log(c.yellow(naoConferida));
  for (const l of NAO_CONFERIDO) console.log(c.dim(l));
  return 1;
}
