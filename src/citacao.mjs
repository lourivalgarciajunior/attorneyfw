/**
 * Extrator e normalizador de citacao juridica.
 *
 * Existe por um motivo so: o contrato de topico declara `fundamento: [...]` —
 * uma lista branca de citacoes — e ate a 0.5.1 nenhuma linha de codigo comparava
 * essa lista com o que a prosa cita. O dispositivo que entra na peca sem passar
 * pelo contrato e exatamente o que ninguem conferiu.
 *
 * Para comparar duas listas escritas por maos diferentes e preciso uma **chave
 * canonica**: `art. 373, II, do CPC` e `artigo 373 do Codigo de Processo Civil`
 * sao a mesma coisa, e `art. 373, II` e `art. 373` tambem sao — por decisao, e
 * nao por limitacao (ver ADR).
 *
 * O que este modulo **nao** faz, e nao vai fazer:
 *
 * - nao verifica se o dispositivo existe;
 * - nao verifica se esta em vigor;
 * - nao verifica se foi revogado, superado ou distinguido;
 * - nao julga se ele sustenta o que o paragrafo afirma.
 *
 * As quatro sao leitura, e ficam com o agente de fundamento. Uma ferramenta que
 * dissesse "esse artigo nao sustenta isso" estaria opinando sobre merito com
 * cara de gate — e gate em que se pode discordar e gate que se aprende a
 * ignorar.
 *
 * E a regra que vale para o extrator inteiro: **forma que ele nao reconhece nao
 * vira citacao**. Silencio, e nao palpite — a mesma disciplina do extenso, que
 * devolve `null` diante de palavra desconhecida. Fundamento "conferido" errado e
 * pior que fundamento nao conferido.
 */

const sa = (s) => String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/**
 * Tabela declarada de leis. Nada aqui e inferido: sigla que nao esta nesta
 * tabela nao vira lei, porque duas letras maiusculas no meio de uma peca sao
 * mais frequentemente uma abreviacao do escritorio que um codigo.
 *
 * `numeros` amarra o apelido a forma numerica: `art. 38 da LEF` e `art. 38 da
 * Lei 6.830/80` tem de dar a mesma chave, senao a conferencia acusa divergencia
 * onde ha identidade.
 */
export const LEIS = [
  { id: 'cf', rotulo: 'CF', siglas: ['CF', 'CRFB', 'CRFB/88', 'CF/88'], nomes: ['constituicao federal', 'constituicao da republica', 'constituicao da republica federativa do brasil'], numeros: [] },
  { id: 'cpc', rotulo: 'CPC', siglas: ['CPC', 'CPC/15', 'CPC/2015', 'NCPC'], nomes: ['codigo de processo civil'], numeros: ['13105/2015'] },
  { id: 'cc', rotulo: 'CC', siglas: ['CC', 'CC/02', 'CC/2002'], nomes: ['codigo civil'], numeros: ['10406/2002'] },
  { id: 'cp', rotulo: 'CP', siglas: ['CP'], nomes: ['codigo penal'], numeros: ['2848/1940'] },
  { id: 'cpp', rotulo: 'CPP', siglas: ['CPP'], nomes: ['codigo de processo penal'], numeros: ['3689/1941'] },
  { id: 'clt', rotulo: 'CLT', siglas: ['CLT'], nomes: ['consolidacao das leis do trabalho'], numeros: ['5452/1943'] },
  { id: 'ctn', rotulo: 'CTN', siglas: ['CTN'], nomes: ['codigo tributario nacional'], numeros: ['5172/1966'] },
  { id: 'cdc', rotulo: 'CDC', siglas: ['CDC'], nomes: ['codigo de defesa do consumidor'], numeros: ['8078/1990'] },
  { id: 'ctb', rotulo: 'CTB', siglas: ['CTB'], nomes: ['codigo de transito brasileiro'], numeros: ['9503/1997'] },
  { id: 'eca', rotulo: 'ECA', siglas: ['ECA'], nomes: ['estatuto da crianca e do adolescente'], numeros: ['8069/1990'] },
  { id: 'lef', rotulo: 'LEF', siglas: ['LEF'], nomes: ['lei de execucao fiscal', 'lei de execucoes fiscais'], numeros: ['6830/1980'] },
  { id: 'estatuto-do-idoso', rotulo: 'Estatuto do Idoso', siglas: [], nomes: ['estatuto do idoso', 'estatuto da pessoa idosa'], numeros: ['10741/2003'] },
];

const POR_SIGLA = new Map();
const POR_NOME = new Map();
const POR_NUMERO = new Map();
for (const l of LEIS) {
  for (const s of l.siglas) POR_SIGLA.set(sa(s), l);
  for (const n of l.nomes) POR_NOME.set(n, l);
  for (const n of l.numeros) POR_NUMERO.set(n, l);
}

const ORGAOS = ['STF', 'STJ', 'TST', 'TSE', 'STM', 'TNU', 'CARF', 'TRF', 'TJ'];
const CLASSES = ['REsp', 'AREsp', 'RE', 'ARE', 'AgInt', 'AgRg', 'ADI', 'ADC', 'ADPF', 'ADO', 'RR', 'AIRR', 'HC', 'MS', 'RMS'];

/**
 * Ano de dois digitos. A lei brasileira citada por numero vai de 1930 para ca:
 * `/43` e a CLT, `/15` e o CPC. Corte em 30 — acima e seculo XX.
 */
function ano(y) {
  const n = Number(y);
  if (String(y).length === 4) return String(n);
  return String(n < 30 ? 2000 + n : 1900 + n);
}

/** `5º` -> `5`; `1.078` -> `1078`; `1o` -> `1`. */
const numArtigo = (s) => String(s).replace(/[.\s]/g, '').replace(/[º°ª]/g, '').replace(/[oa]$/i, '');

const chaveLei = (numero, y) => `lei-${String(numero).replace(/\./g, '')}-${ano(y)}`;

// ------------------------------------------------------------------- leis

// Uma alternacao unica com todas as formas de referir uma lei. A ordem importa:
// as formas por extenso vem antes das siglas, senao `CF` casaria dentro de
// `Constituicao Federal` abreviada e o resto da expressao ficaria orfao.
const ALT_NOMES = LEIS.flatMap((l) => l.nomes).sort((a, b) => b.length - a.length)
  .map((n) => n.replace(/[a-z]/g, (ch) => {
    const acentos = { a: '[aáàâã]', e: '[eéêè]', i: '[ií]', o: '[oóôõ]', u: '[uúü]', c: '[cç]' };
    return acentos[ch] || ch;
  })).join('|');
const ALT_SIGLAS = LEIS.flatMap((l) => l.siglas).sort((a, b) => b.length - a.length)
  .map((s) => s.replace(/\//g, '\\/')).join('|');
const ALT_NUMERADA = '(?:Lei\\s+Complementar|Lei|Decreto[-\\s]Lei|Decreto)\\s+n?[\\u00ba\\u00b0.]{0,3}\\s*([\\d.]{3,12})\\s*[\\/de\\s]{1,5}\\s*(\\d{2,4})';

const RE_LEI = new RegExp(`(?:${ALT_NUMERADA})|\\b(${ALT_NOMES})\\b|\\b(${ALT_SIGLAS})(?![a-zA-Z])`, 'gi');

/** Resolve uma ocorrencia de `RE_LEI` na lei da tabela, ou numa lei por numero. */
function leiDaOcorrencia(m) {
  const [, numero, y, nome, sigla] = m;
  if (numero) {
    const k = `${String(numero).replace(/\./g, '')}/${ano(y)}`;
    const conhecida = POR_NUMERO.get(k);
    return conhecida
      ? { id: conhecida.id, rotulo: conhecida.rotulo }
      : { id: chaveLei(numero, y), rotulo: `Lei ${numero}/${y}` };
  }
  if (nome) {
    const l = POR_NOME.get(sa(nome));
    return l ? { id: l.id, rotulo: l.rotulo } : null;
  }
  if (sigla) {
    const l = POR_SIGLA.get(sa(sigla));
    return l ? { id: l.id, rotulo: l.rotulo } : null;
  }
  return null;
}

// ------------------------------------------------------------- dispositivo

/**
 * O que pode aparecer entre o numero do artigo e a lei. Lista **branca**: se o
 * trecho tiver qualquer outra coisa, nao e um `art. X da Lei Y` e nada e
 * extraido. Foi assim que ficou possivel ancorar na lei e olhar para tras sem
 * atravessar fronteira de frase — `art. 5o do CC. O CPC preve` nao casa, porque
 * entre `5o` e `CPC` ha texto fora da lista.
 */
const MEIO = '(?:[\\d.,;:\\s\\u00ba\\u00b0\\u00aa\\u00a7-]|\\d+[oa]\\b|\\bcaput\\b|\\binc\\b|\\bincisos?\\b|\\bpar[aá]grafos?\\b|\\bal[ií]neas?\\b|\\b[IVXLCivxlc]{1,7}\\b|\\b[a-z]\\)?\\b)';
const RE_ARTIGOS_ANTES = new RegExp(`\\bart(?:igos?|s)?\\.?\\s*(\\d[\\d.]*[oaºª]?(?:${MEIO})*?)\\s*,?\\s*(?:\\bd[aoe]s?\\s+)?$`, 'i');

/**
 * Os numeros de artigo de um trecho como `373, II` ou `303 e 304`.
 *
 * Anda token a token e **para** no primeiro sinal de refinamento — `§`,
 * `paragrafo`, `alinea`, `caput`. E preciso parar, e nao so ignorar: em
 * `art. 373, § 1o, do CPC` o `1` do paragrafo viraria o artigo 1 do CPC, que
 * nao esta citado em lugar nenhum. Inciso e algarismo romano sao pulados, e nao
 * param a leitura, para que `arts. 373, II e 400` renda os dois artigos.
 */
const PARA_AQUI = /^(§|par[aá]grafos?|al[ií]neas?|caput)$/i;
const PULA = /^([,;.]|e|inc|incisos?|[IVXLCivxlc]{1,7})$/i;
function artigosDe(seg) {
  const out = [];
  for (const tok of String(seg).match(/§|[\wº°ª]+|[,;.]/g) || []) {
    if (/^\d/.test(tok)) { out.push(numArtigo(tok)); continue; }
    if (PARA_AQUI.test(tok) || !PULA.test(tok)) break;
  }
  return out.filter(Boolean);
}

// ------------------------------------------------------- sumula, tema, precedente

const RE_SV = /\b(?:s[uú]mula\s+vinculante|SV)\s*n?[º°.]{0,3}\s*(\d{1,3})\b/gi;
const RE_SUMULA = new RegExp(`\\bs[uú]mula\\s*(?!vinculante)n?[º°.]{0,3}\\s*(\\d{1,4})\\b(?:\\s*d[aoe]\\s*(${ORGAOS.join('|')})\\b)?`, 'gi');
const RE_TEMA = new RegExp(`\\btema\\s*(?:repetitivo|de\\s+repercuss[aã]o\\s+geral)?\\s*n?[º°.]{0,3}\\s*([\\d.]{1,7})\\b(?:\\s*d[aoe]\\s*(${ORGAOS.join('|')})\\b)?`, 'gi');
const RE_PRECEDENTE = new RegExp(`\\b(${CLASSES.join('|')})\\s*n?[º°.]{0,3}\\s*(\\d[\\d.\\-\\/]{3,25})`, 'g');

// ------------------------------------------------------------------ extrator

/**
 * Todas as citacoes de um texto, cada uma com a chave canonica e o rotulo que
 * vai para o par. Ordem de aparicao, sem repetir chave.
 *
 * Tipos: `dispositivo` (`cpc#373`), `lei` (`lef`, sem artigo), `sumula`
 * (`sumula:stj#7`), `sv` (`sv#28`), `tema` (`tema:stf#69`) e `precedente`
 * (`resp#1221170`).
 *
 * O tipo `lei` — mencao a lei sem artigo — sai marcado a parte de proposito. No
 * contrato ele e uma declaracao ampla, que cobre qualquer artigo daquela lei; no
 * texto ele quase nunca e fundamento, e sim mencao de passagem. Quem decide o
 * que fazer com essa assimetria e o comparador, nao o extrator.
 */
export function citacoesDe(texto) {
  const t = String(texto || '');
  const out = [];
  const vistas = new Set();
  const poe = (c) => { if (!vistas.has(c.chave)) { vistas.add(c.chave); out.push(c); } };

  RE_LEI.lastIndex = 0;
  for (const m of t.matchAll(RE_LEI)) {
    const lei = leiDaOcorrencia(m);
    if (!lei) continue;

    // Olhar para tras a partir da lei, e nao para frente a partir de `art.`:
    // e o unico jeito de `arts. 303 e 304 do CPC` render dois artigos sem que
    // o casamento atravesse a fronteira da frase seguinte.
    const antes = t.slice(Math.max(0, m.index - 90), m.index);
    const seg = antes.match(RE_ARTIGOS_ANTES);
    if (!seg) { poe({ tipo: 'lei', chave: lei.id, lei: lei.id, artigo: '', rotulo: lei.rotulo, indice: m.index }); continue; }

    const artigos = artigosDe(seg[1]);
    if (!artigos.length) { poe({ tipo: 'lei', chave: lei.id, lei: lei.id, artigo: '', rotulo: lei.rotulo, indice: m.index }); continue; }
    for (const a of artigos) {
      poe({ tipo: 'dispositivo', chave: `${lei.id}#${a}`, lei: lei.id, artigo: a, rotulo: `art. ${a} do ${lei.rotulo}`, indice: m.index });
    }
  }

  RE_SV.lastIndex = 0;
  for (const m of t.matchAll(RE_SV)) {
    poe({ tipo: 'sv', chave: `sv#${Number(m[1])}`, rotulo: `Sumula Vinculante ${Number(m[1])}`, indice: m.index });
  }

  RE_SUMULA.lastIndex = 0;
  for (const m of t.matchAll(RE_SUMULA)) {
    const orgao = m[2] ? sa(m[2]) : '?';
    poe({ tipo: 'sumula', chave: `sumula:${orgao}#${Number(m[1])}`, orgao, rotulo: `Sumula ${Number(m[1])}${m[2] ? ` do ${m[2].toUpperCase()}` : ''}`, indice: m.index });
  }

  RE_TEMA.lastIndex = 0;
  for (const m of t.matchAll(RE_TEMA)) {
    const n = numArtigo(m[1]);
    const orgao = m[2] ? sa(m[2]) : '?';
    poe({ tipo: 'tema', chave: `tema:${orgao}#${n}`, orgao, rotulo: `Tema ${n}${m[2] ? ` do ${m[2].toUpperCase()}` : ''}`, indice: m.index });
  }

  RE_PRECEDENTE.lastIndex = 0;
  for (const m of t.matchAll(RE_PRECEDENTE)) {
    const n = String(m[2]).replace(/[.\-/]/g, '');
    poe({ tipo: 'precedente', chave: `${sa(m[1])}#${n}`, rotulo: `${m[1]} ${m[2]}`, indice: m.index });
  }

  return out.sort((a, b) => a.indice - b.indice);
}

/**
 * A citacao declarada `a` cobre a citacao encontrada `b`?
 *
 * Duas assimetrias deliberadas:
 *
 * - **Lei sem artigo cobre qualquer artigo dela.** `fundamento: [Lei 9.610/98]`
 *   e uma declaracao de escopo; cobrar artigo por artigo transformaria uma
 *   declaracao legitima numa enxurrada de avisos.
 * - **Sumula ou tema sem orgao casa com qualquer orgao.** Quem escreveu
 *   `Sumula 7` no contrato nao errou; so nao repetiu o obvio.
 */
export function cobre(a, b) {
  if (!a || !b) return false;
  if (a.chave === b.chave) return true;
  if (a.tipo === 'lei' && b.lei === a.lei) return true;
  if ((a.tipo === 'sumula' || a.tipo === 'tema') && a.tipo === b.tipo) {
    return (a.orgao === '?' || b.orgao === '?') && a.chave.split('#')[1] === b.chave.split('#')[1];
  }
  return false;
}

/** A forma legivel de uma chave canonica, para quando nao ha o texto original. */
export function rotuloDe(chave) {
  const [esq, n] = String(chave).split('#');
  if (esq === 'sv') return `Sumula Vinculante ${n}`;
  if (esq.startsWith('sumula:')) return `Sumula ${n}${esq.slice(7) === '?' ? '' : ` do ${esq.slice(7).toUpperCase()}`}`;
  if (esq.startsWith('tema:')) return `Tema ${n}${esq.slice(5) === '?' ? '' : ` do ${esq.slice(5).toUpperCase()}`}`;
  if (CLASSES.some((c) => sa(c) === esq)) return `${CLASSES.find((c) => sa(c) === esq)} ${n}`;
  const lei = LEIS.find((l) => l.id === esq);
  const nome = lei ? lei.rotulo : esq.replace(/^lei-(\d+)-(\d+)$/, 'Lei $1/$2');
  // "do CPC" mas "da Lei 9.999/99": a preposicao errada denuncia texto gerado.
  return n ? `art. ${n} ${/^(Lei|Consolida|Constitui)/.test(nome) ? 'da' : 'do'} ${nome}` : nome;
}
