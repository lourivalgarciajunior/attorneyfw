/**
 * Nucleo do attorneyfw: descoberta de escritorio e materia, frontmatter,
 * contrato de topico, kanban de entregas, canon e contagem de prazo.
 * Zero dependencias — so node:fs e node:path.
 *
 * Duas hierarquias, uma so cadeia:
 *
 *   escritorio.yaml            a carteira — advogado, OAB, feriados, politica
 *     materias/<slug>/
 *       materia.yaml           tipo: contencioso | consultivo
 *       docs/dec/              decisao de estrategia
 *       docs/tese/             contencioso: fatos F1..Fn, pedidos P1..Pn
 *       docs/mapa-risco/       consultivo: riscos R1..Rn
 *       docs/plano/            o que sera entregue, em que ordem
 *       docs/canon/            partes, documentos, cronologia, autos
 *       entregas/<estado>/     o kanban
 *       saida/                 o que vai para o protocolo ou para o cliente
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync, statSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ESTADOS = ['backlog', 'pesquisa', 'minuta', 'revisao', 'entregue', 'bloqueado', 'abandonado'];
export const ESTADOS_ATIVOS = ['backlog', 'pesquisa', 'minuta', 'revisao', 'entregue'];

export const TIPOS = ['contencioso', 'consultivo'];

/**
 * Regime de contagem. `processual` segue o CPC — termo inicial no primeiro dia
 * util seguinte. `material` segue o art. 210 do CTN — dia seguinte, util ou
 * nao. Nao se infere um do outro: adivinhar prazo e o unico erro desta
 * ferramenta que custa o caso. Ver ADR-2026-08-31.
 */
export const REGIMES = ['processual', 'material'];

/**
 * O vocabulario muda com o tipo da materia, o codigo nao. Um topico de peticao
 * e uma clausula de contrato tem a mesma anatomia — sustenta algo, se apoia em
 * fundamento, tem um contra-argumento previsivel e uma resposta a ele — e o
 * mesmo gate serve para os dois. O que muda e o que a cadeia numera: no
 * contencioso sao fatos controvertidos que a prova precisa pagar; no
 * consultivo sao riscos mapeados que a clausula precisa mitigar.
 */
export const VOCABULARIO = {
  contencioso: {
    artefato: 'tese',
    dirArtefato: 'tese',
    prefixoArtefato: 'TESE',
    entrega: 'peca',
    entregas: 'pecas',
    topico: 'topico',
    fechada: 'protocolada',
    pendencia: 'fato',
    pendencias: 'fatos',
    letra: 'F',
    paga: 'provado',
    lastro: 'documentos',
  },
  consultivo: {
    artefato: 'mapa de risco',
    dirArtefato: 'mapa-risco',
    prefixoArtefato: 'MAPA',
    entrega: 'minuta',
    entregas: 'minutas',
    topico: 'clausula',
    fechada: 'entregue ao cliente',
    pendencia: 'risco',
    pendencias: 'riscos',
    letra: 'R',
    paga: 'mitigado',
    lastro: 'fundamento',
  },
};

export const ROOT_CLI = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const TEMPLATES = join(ROOT_CLI, 'templates');

export const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  b: (s) => `\x1b[1m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

export class Erro extends Error {}

// ---------------------------------------------------------------- descoberta

function subir(from, arquivo) {
  let dir = resolve(from);
  for (;;) {
    if (existsSync(join(dir, arquivo))) return dir;
    const pai = dirname(dir);
    if (pai === dir) return null;
    dir = pai;
  }
}

/** Sobe ate achar escritorio.yaml. Todo comando precisa de um. */
export function acharEscritorio(from = process.cwd()) {
  const raiz = subir(from, 'escritorio.yaml');
  if (!raiz) throw new Erro('Nenhum escritorio attorneyfw aqui. Rode `attorneyfw init "Nome do escritorio"` primeiro.');
  return raiz;
}

/** A materia em que o cwd esta, ou null quando o comando roda na raiz da carteira. */
export function acharMateria(from = process.cwd()) {
  const dir = subir(from, 'materia.yaml');
  return dir ? materiaDe(dir) : null;
}

/**
 * A materia, ou o erro que diz como escolher uma. Comando que mexe em artefato
 * de materia nao tem default: agir na materia errada e pior que recusar.
 */
export function exigirMateria(args = {}) {
  if (args.materia) {
    const raiz = acharEscritorio();
    const dir = join(raiz, 'materias', String(args.materia));
    if (!existsSync(join(dir, 'materia.yaml'))) {
      const nomes = materias(raiz).map((m) => m.slug).join(', ') || '(nenhuma)';
      throw new Erro(`Materia "${args.materia}" nao existe. Ha: ${nomes}`);
    }
    return materiaDe(dir);
  }
  const m = acharMateria();
  if (!m) {
    const raiz = acharEscritorio();
    const nomes = materias(raiz).map((m2) => m2.slug).join(', ') || '(nenhuma — rode `attorneyfw materia new`)';
    throw new Erro(`Este comando roda dentro de uma materia.\n`
      + `       Entre na pasta dela ou passe --materia <slug>. Ha: ${nomes}`);
  }
  return m;
}

function materiaDe(dir) {
  const cfg = yamlRaso(readFileSync(join(dir, 'materia.yaml'), 'utf8'));
  const tipo = TIPOS.includes(cfg.tipo) ? cfg.tipo : 'contencioso';
  return { dir, slug: basename(dir), cfg, tipo, voc: VOCABULARIO[tipo] };
}

/** Todas as materias da carteira, em ordem de slug. */
export function materias(raiz = acharEscritorio()) {
  const base = join(raiz, 'materias');
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(base, d.name, 'materia.yaml')))
    .map((d) => materiaDe(join(base, d.name)))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

// ------------------------------------------------------------------ formatos

/** YAML raso — chave: valor, listas inline [a, b] e listas com hifen. */
export function yamlRaso(texto) {
  const campos = {};
  let chaveLista = null;
  for (const linha of texto.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*#/.test(linha) || !linha.trim()) continue;
    const item = linha.match(/^\s+-\s+(.*)$/);
    if (item && chaveLista) { campos[chaveLista].push(limpa(item[1])); continue; }
    const m = linha.match(/^([A-Za-zÀ-ÿ0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    const valor = m[2].trim();
    if (valor === '') { chaveLista = m[1]; campos[m[1]] = []; continue; }
    chaveLista = null;
    campos[m[1]] = valor.startsWith('[')
      ? valor.replace(/^\[(.*)\]$/s, '$1').split(',').map(limpa).filter(Boolean)
      : limpa(valor);
  }
  // Chave sem valor tem de ser falsy. Ela nasce `[]` aqui porque pode ser o
  // inicio de uma lista em bloco, e array vazio e truthy: `if (!fm.processo)`
  // dava falso e a peca saia com "Processo n. " em branco no cabecalho, e o
  // gate reclamava de "prazo mal declarado" em toda entrega recem-criada.
  // Lista que recebeu item continua lista; a que ficou vazia vira ''.
  for (const [k, v] of Object.entries(campos)) if (Array.isArray(v) && !v.length) campos[k] = '';
  return campos;
}
const limpa = (v) => v.trim().replace(/^["'](.*)["']$/s, '$1');

/** Separa frontmatter YAML do corpo do markdown. */
export function frontmatter(raw) {
  const t = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (!t.startsWith('---\n')) return { fm: {}, corpo: t };
  const fim = t.indexOf('\n---', 3);
  if (fim === -1) return { fm: {}, corpo: t };
  return { fm: yamlRaso(t.slice(4, fim)), corpo: t.slice(fim + 4).replace(/^\n/, '') };
}

export function lerEscritorio(raiz) {
  return yamlRaso(readFileSync(join(raiz, 'escritorio.yaml'), 'utf8'));
}

export const slug = (s) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export const hoje = () => new Date().toISOString().slice(0, 10);

export function template(nome, subs = {}) {
  let t = readFileSync(join(TEMPLATES, nome), 'utf8');
  for (const [k, v] of Object.entries(subs)) t = t.replaceAll(`{{${k}}}`, v);
  return t;
}

export function escrever(caminho, conteudo) {
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, conteudo, 'utf8');
  return caminho;
}

export const rel = (raiz, p) => p.replace(raiz, '').replace(/^[\\/]/, '').replace(/\\/g, '/');

export const palavras = (t) => (t.trim().match(/[\p{L}\p{N}'\u2019-]+/gu) || []).length;

/** Lista vinda do YAML raso, que devolve string quando ha um item so. */
export const lista = (v) => (v === undefined || v === null || v === '' ? [] : [].concat(v))
  .map((x) => String(x).trim()).filter(Boolean);

/**
 * Valor escalar do YAML raso, ou string vazia.
 *
 * `prazo_intimacao:` sem valor vira `[]` no parser, e array vazio e truthy:
 * `if (!fm.prazo_intimacao)` dava falso e o gate reclamava de "prazo mal
 * declarado" em toda entrega recem-criada. Todo campo escalar lido de
 * frontmatter passa por aqui.
 */
export const valor = (v) => (Array.isArray(v) ? v.join(' ') : String(v ?? '')).trim();

// -------------------------------------------------------------------- prazos

const DIA = 86400000;
/** Meio-dia UTC: a aritmetica de dia nao pode depender de fuso nem de horario de verao. */
const dt = (isoStr) => new Date(`${isoStr}T12:00:00Z`);
const iso = (d) => d.toISOString().slice(0, 10);
export const dataValida = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !Number.isNaN(dt(s).getTime());

/** Pascoa pelo algoritmo de Meeus/Butcher — de onde saem carnaval e corpus christi. */
function pascoa(ano) {
  const a = ano % 19, b = Math.floor(ano / 100), cc = ano % 100;
  const d1 = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d1 - g + 15) % 30;
  const i = Math.floor(cc / 4), k = cc % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia, 12));
}

const FIXOS = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'];

/**
 * Feriados nacionais de um ano — os de data fixa mais os que dependem da
 * Pascoa. Nao inclui feriado estadual, municipal nem suspensao de expediente
 * do tribunal: isso e local, muda todo ano e sai do `docs/feriados.md` do
 * escritorio. O CLI nao tem como adivinhar, e fingir que tem seria pior.
 */
export function feriadosNacionais(ano) {
  const out = new Set(FIXOS.map((md) => `${ano}-${md}`));
  const p = pascoa(ano);
  const desloca = (n) => iso(new Date(p.getTime() + n * DIA));
  out.add(desloca(-48)); // segunda de carnaval
  out.add(desloca(-47)); // terca de carnaval
  out.add(desloca(-46)); // quarta-feira de cinzas
  out.add(desloca(-2)); // sexta-feira da paixao
  out.add(desloca(60)); // corpus christi
  return out;
}

/**
 * O calendario do escritorio: os nacionais dos anos pedidos mais as linhas
 * `- AAAA-MM-DD — motivo` de docs/feriados.md. E ali que entram o feriado do
 * foro, a suspensao de expediente e o recesso local.
 */
export function feriados(raiz, anos = []) {
  const set = new Set();
  const alcance = anos.length ? anos : [new Date().getUTCFullYear()];
  for (const ano of new Set(alcance.flatMap((a) => [a - 1, a, a + 1]))) {
    for (const f of feriadosNacionais(ano)) set.add(f);
  }
  const caminho = join(raiz, 'docs', 'feriados.md');
  if (existsSync(caminho)) {
    for (const [, data] of readFileSync(caminho, 'utf8').matchAll(/^-\s*(\d{4}-\d{2}-\d{2})/gm)) set.add(data);
  }
  return set;
}

/** Recesso forense do art. 220 do CPC: 20/12 a 20/01, inclusive. */
export function noRecesso(d) {
  const mes = d.getUTCMonth() + 1;
  const dia = d.getUTCDate();
  return (mes === 12 && dia >= 20) || (mes === 1 && dia <= 20);
}

function fabricaUtil(fer, recesso) {
  return (d) => {
    const w = d.getUTCDay();
    if (w === 0 || w === 6) return false;
    if (fer.has(iso(d))) return false;
    if (recesso && noRecesso(d)) return false;
    return true;
  };
}

/**
 * Contagem de prazo processual. Art. 224 do CPC — exclui o dia do comeco e
 * inclui o do vencimento; a contagem comeca no primeiro dia util seguinte ao
 * da publicacao. Art. 219 — prazo processual conta em dias uteis. Art. 220 —
 * suspende entre 20/12 e 20/01.
 *
 * Isto e uma conferencia, nao a contagem oficial. O prazo que vale e o dos
 * autos: feriado local, suspensao de expediente e decisao que altera o termo
 * inicial nao chegam aqui sozinhos.
 */
export function contarPrazo({
  intimacao, dias, contagem = 'uteis', regime = 'processual',
  recesso = true, feriados: fer = new Set(),
}) {
  if (!dataValida(intimacao)) throw new Erro(`Data de intimacao invalida: "${intimacao}". Use AAAA-MM-DD.`);
  const n = Number(dias);
  if (!Number.isInteger(n) || n < 1) throw new Erro(`Prazo em dias invalido: "${dias}".`);
  if (!REGIMES.includes(regime)) throw new Erro(`Regime "${regime}" nao existe. Use: ${REGIMES.join(', ')}`);
  // O recesso do art. 220 do CPC suspende o prazo PROCESSUAL, e so ele. Prazo
  // tributario corre entre 20/12 e 20/01 como em qualquer outro dia. Aplicar o
  // recesso ao regime material empurrava o vencimento em quase um mes — e para
  // frente, que e a direcao que faz o advogado acreditar em folga que nao tem.
  // Encontrado rodando o CLI de ponta a ponta: o teste unitario passava
  // `recesso: false` a mao e nunca exercitou este caminho.
  const util = fabricaUtil(fer, regime === 'material' ? false : recesso);

  /** Do termo inicial ate o vencimento, prorrogando o que cair sem expediente. */
  const correr = (partida) => {
    let cur = new Date(partida);
    if (contagem === 'uteis') {
      for (let restam = n - 1; restam > 0; restam--) {
        do { cur = new Date(cur.getTime() + DIA); } while (!util(cur));
      }
    } else {
      cur = new Date(cur.getTime() + (n - 1) * DIA);
      // art. 224 par. 1 do CPC e art. 210 par. unico do CTN: vencimento em dia
      // sem expediente normal prorroga para o seguinte.
      while (!util(cur)) cur = new Date(cur.getTime() + DIA);
    }
    return iso(cur);
  };

  const seguinte = new Date(dt(intimacao).getTime() + DIA);

  if (regime === 'processual') {
    // art. 224, par. 3: a contagem comeca no primeiro dia UTIL seguinte.
    let cur = new Date(seguinte);
    while (!util(cur)) cur = new Date(cur.getTime() + DIA);
    return { regime, inicio: iso(cur), fim: correr(cur) };
  }

  // Material — art. 210 do CTN. O caput exclui o dia do inicio e conta continuo
  // a partir do dia seguinte, util ou nao. O paragrafo unico diz que os prazos
  // "so se iniciam ou vencem em dia de expediente normal", e ha duas leituras:
  // o deslocamento alcanca so o vencimento, ou tambem o termo inicial. No caso
  // real que originou esta regra as duas dao datas diferentes, e nenhuma e
  // obviamente errada — entao devolvemos as duas. Ver ADR-2026-08-31.
  const inicio = iso(seguinte);
  let porParagrafo = new Date(seguinte);
  while (!util(porParagrafo)) porParagrafo = new Date(porParagrafo.getTime() + DIA);
  const inicioAlternativo = iso(porParagrafo);

  const fim = correr(seguinte);
  const fimAlternativo = correr(porParagrafo);

  // `fim` fica com a leitura do caput, que e sempre a data igual ou anterior.
  // Entre duas leituras defensaveis, esta ferramenta nao pode ser a que concede
  // folga: prazo curto demais faz trabalhar antes; longo demais perde o caso.
  return inicio === inicioAlternativo
    ? { regime, inicio, fim }
    : { regime, inicio, fim, inicioAlternativo, fimAlternativo, divergencia: true };
}

/** Dias uteis entre duas datas, contando o dia final. Negativo quando ja venceu. */
export function diasUteisAte(de, ate, fer = new Set(), recesso = true) {
  const util = fabricaUtil(fer, recesso);
  const inicio = dt(de);
  const fim = dt(ate);
  const sinal = fim >= inicio ? 1 : -1;
  let cur = new Date(sinal > 0 ? inicio : fim);
  const limite = sinal > 0 ? fim : inicio;
  let n = 0;
  while (cur < limite) {
    cur = new Date(cur.getTime() + DIA);
    if (util(cur)) n++;
  }
  return sinal * n;
}

/**
 * O prazo de uma entrega, ja calculado, ou null quando ela nao declara prazo.
 * Nem toda entrega tem: peticao inicial e parecer se entregam quando ficam
 * prontos. O que nao pode e prazo declarado pela metade.
 */
export function prazoDe(entrega, ctx) {
  const fm = entrega.fm || {};
  const intimacao = valor(fm.prazo_intimacao);
  const bruto = valor(fm.prazo_dias);
  if (!intimacao && !bruto) return null;
  if (!intimacao || !bruto) {
    return { erro: 'prazo declarado pela metade — precisa de prazo_intimacao E prazo_dias' };
  }
  if (!dataValida(intimacao)) return { erro: `prazo_intimacao "${intimacao}" nao e AAAA-MM-DD` };
  const dias = Number(bruto);
  if (!Number.isInteger(dias) || dias < 1) return { erro: `prazo_dias "${bruto}" nao e um numero de dias` };

  const contagem = valor(fm.prazo_contagem) === 'corridos' ? 'corridos' : 'uteis';
  // Regime em branco e `processual` — o padrao da 0.1.0, para que entrega
  // antiga continue lida do mesmo jeito. Regime escrito errado nao vira padrao
  // em silencio: prazo contado pela regra errada e o defeito que esta correcao
  // existe para acabar.
  const regime = valor(fm.prazo_regime) || 'processual';
  if (!REGIMES.includes(regime)) {
    return { erro: `prazo_regime "${regime}" nao existe — use ${REGIMES.join(' ou ')}` };
  }

  const c = contarPrazo({
    intimacao, dias, contagem, regime, recesso: ctx.recesso, feriados: ctx.feriados,
  });
  const hj = ctx.hoje || hoje();
  return {
    intimacao,
    dias,
    contagem,
    regime,
    inicio: c.inicio,
    fim: c.fim,
    inicioAlternativo: c.inicioAlternativo,
    fimAlternativo: c.fimAlternativo,
    divergencia: Boolean(c.divergencia),
    fatal: valor(fm.prazo_fatal).toLowerCase() === 'true',
    restam: diasUteisAte(hj, c.fim, ctx.feriados, ctx.recesso),
    vencido: c.fim < hj,
  };
}

/** Contexto de contagem do escritorio — feriados e politica de recesso, uma vez so. */
export function contextoPrazo(raiz, anosExtras = []) {
  const cfg = lerEscritorio(raiz);
  const ano = new Date().getUTCFullYear();
  return {
    feriados: feriados(raiz, [ano, ...anosExtras]),
    recesso: String(cfg.prazo_suspensao_recesso ?? 'true').toLowerCase() !== 'false',
    hoje: hoje(),
  };
}

// ------------------------------------------------------------------ entregas

/** Todas as entregas do kanban de uma materia, com estado, topicos e texto. */
export function entregas(materia) {
  const out = [];
  for (const estado of ESTADOS) {
    const dir = join(materia.dir, 'entregas', estado);
    if (!existsSync(dir)) continue;
    for (const arq of readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
      const caminho = join(dir, arq);
      const raw = readFileSync(caminho, 'utf8');
      const { fm, corpo } = frontmatter(raw);
      out.push({
        arquivo: arq, caminho, estado, fm, corpo, raw, materia,
        numero: Number(fm.numero ?? (arq.match(/ent-(\d+)/)?.[1] ?? 0)),
        topicos: topicosDe(corpo),
        palavras: palavras(textoDe(corpo)),
      });
    }
  }
  return out.sort((a, b) => a.numero - b.numero);
}

/**
 * Contrato de topico: bloco ```topico com YAML raso. Um topico de peticao e
 * uma clausula de contrato declaram a mesma coisa — o que sustentam, em que se
 * apoiam, o que a parte contraria vai opor e como se responde a isso. O campo
 * `risco` existe porque topico sem contra-argumento previsto e topico que
 * ninguem pensou ate o fim; e o que a contraparte vai escrever primeiro.
 */
export function topicosDe(corpo) {
  const blocos = [];
  const re = /```topico\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(corpo))) blocos.push({ dados: yamlRaso(m[1]), inicio: m.index, fim: m.index + m[0].length });

  // O texto de um topico vai do fim do contrato dele ate o contrato seguinte.
  // Nota de trabalho vai em comentario HTML, que sai daqui e da peca.
  return blocos.map((b, i) => {
    const ate = i + 1 < blocos.length ? blocos[i + 1].inicio : corpo.length;
    const texto = corpo.slice(b.fim, ate)
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/^#{1,6} .*$/gm, '')
      .trim();
    return { ...b.dados, texto, palavras: palavras(texto) };
  });
}

/** Texto = corpo sem os contratos, sem os comentarios e sem os cabecalhos. */
export function textoDe(corpo) {
  return corpo
    .replace(/```topico\n[\s\S]*?```/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^#{1,6} .*$/gm, '');
}

export function moverEntrega(materia, nome, destino, opts = {}) {
  if (!ESTADOS.includes(destino)) throw new Erro(`Estado "${destino}" nao existe. Use: ${ESTADOS.join(', ')}`);
  const alvo = entregas(materia).find((e) =>
    e.arquivo === nome || e.arquivo === `${nome}.md` || e.fm.id === nome || String(e.numero) === String(nome));
  if (!alvo) throw new Erro(`Entrega "${nome}" nao encontrada.`);

  // Reabrir peca protocolada e sempre deliberado. O que foi para os autos
  // saiu do controle do escritorio: mexer no arquivo depois cria uma versao
  // que diverge da que o juizo leu, sem ninguem ter decidido isso.
  if (alvo.estado === 'entregue' && destino !== 'entregue' && !opts.forcar) {
    throw new Erro(
      `${alvo.arquivo} esta em entregue (${materia.voc.fechada}).\n`
      + '       O texto que saiu do escritorio nao volta para a bancada em silencio —\n'
      + '       repita com --forcar se for isso mesmo.',
    );
  }
  const novoDir = join(materia.dir, 'entregas', destino);
  mkdirSync(novoDir, { recursive: true });
  const novo = join(novoDir, alvo.arquivo);
  const atualizado = alvo.raw.replace(/^(estado:[ \t]*).*$/m, `$1${destino}`);
  writeFileSync(alvo.caminho, atualizado, 'utf8');
  if (novo !== alvo.caminho) renameSync(alvo.caminho, novo);
  return { de: alvo.estado, para: destino, caminho: novo };
}

// ----------------------------------------------------------------- artefatos

/** Arquivos de um diretorio de artefato (dec/, tese/, mapa-risco/, plano/). */
export function artefatos(materia, sub) {
  const dir = join(materia.dir, 'docs', sub);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.md')).sort()
    .map((f) => {
      const caminho = join(dir, f);
      const { fm, corpo } = frontmatter(readFileSync(caminho, 'utf8'));
      return { arquivo: f, caminho, fm, corpo };
    });
}

/**
 * O artefato de estrategia em vigor — tese no contencioso, mapa de risco no
 * consultivo. Os arquivos sao `<PREFIXO>-<data>-<slug>.md`, entao a ordem
 * alfabetica e a cronologica e o que vale e o ultimo. Revisar a estrategia
 * nao pode desligar a cobranca dos fatos em silencio.
 */
export function estrategia(materia) {
  const todos = artefatos(materia, materia.voc.dirArtefato);
  return todos.length ? todos[todos.length - 1] : null;
}

/** O plano de entregas em vigor. Mesma regra: vale o ultimo. */
export function plano(materia) {
  const todos = artefatos(materia, 'plano');
  return todos.length ? todos[todos.length - 1] : null;
}

/**
 * Le a tabela do plano por NOME de coluna, nao por posicao: escritorio troca a
 * ultima coluna sem avisar, e leitura posicional quebraria calada.
 */
export function linhasDoPlano(corpo) {
  const celulas = (l) => l.replace(/^\||\|$/g, '').split('|').map((x) => x.trim());
  const separador = (l) => /^\|[\s|:-]*\|?$/.test(l);

  const todas = corpo.split('\n').map((l) => l.trim());
  const blocos = [];
  let atual = null;
  for (const l of todas) {
    if (l.startsWith('|')) (atual ??= blocos[blocos.push([]) - 1]).push(l);
    else atual = null;
  }

  const bloco = blocos.find((b) => {
    const cab = celulas(b[0]).map((x) => x.toLowerCase());
    return cab.includes('#') && cab.some((x) => /^t[ií]tulo$/.test(x));
  });
  if (!bloco) return { linhas: [], ignoradas: [], temTabela: blocos.length > 0 };

  const cab = celulas(bloco[0]).map((x) => x.toLowerCase());
  const col = (...nomes) => cab.findIndex((x) => nomes.includes(x));
  const iNum = col('#');
  const iTit = col('titulo', 'título');
  const iTipo = col('tipo');
  const iPrazo = col('prazo', 'intimacao', 'intimação');
  const iDias = col('dias');

  const linhas = [];
  const ignoradas = [];
  for (const l of bloco.slice(1)) {
    if (separador(l)) continue;
    const cs = celulas(l);
    const bruto = String(cs[iNum] || '').replace(/\*\*/g, '').trim();
    const titulo = String(cs[iTit] || '').replace(/\*\*/g, '').trim();
    // "3–5" nao e entrega, e um vao ainda por definir. Virar 35 em silencio
    // criaria uma peca que ninguem planejou.
    const m = bruto.match(/^0*(\d+)$/);
    if (!m || !titulo) {
      if (bruto || titulo) ignoradas.push({ bruto, titulo, motivo: m ? 'sem titulo' : 'numero nao e uma entrega so' });
      continue;
    }
    const cel = (i) => (i >= 0 ? String(cs[i] || '').replace(/\*\*/g, '').trim() : '');
    linhas.push({
      numero: Number(m[1]),
      titulo,
      tipo: cel(iTipo),
      intimacao: (cel(iPrazo).match(/\d{4}-\d{2}-\d{2}/) || [''])[0],
      dias: cel(iDias).replace(/[^0-9]/g, ''),
    });
  }
  return { linhas, ignoradas, temTabela: true };
}

/**
 * As pendencias numeradas do artefato de estrategia: `- F1 — texto` na secao
 * Fatos (contencioso) ou `- R1 — texto` na secao Riscos (consultivo). E o
 * mecanismo de Chekhov do direito: fato alegado que a prova nao paga e derrota
 * anunciada, risco mapeado sem clausula que o mitigue e o parecer que ninguem
 * leu ate o fim.
 */
export function pendencias(materia) {
  const est = estrategia(materia);
  if (!est) return [];
  const alvo = materia.tipo === 'contencioso' ? /^Fatos/i : /^Riscos/i;
  const sec = est.corpo.split(/^## /m).find((s) => alvo.test(s)) || '';
  const re = new RegExp(`^-[ \\t]*(${materia.voc.letra}\\d+)[ \\t]*[\u2014\u2013-][ \\t]*(\\S.*)$`, 'gm');
  // Exemplo dentro de bloco cercado nao e pendencia; travessao no meio do texto e.
  return [...sec.replace(/^```[\s\S]*?^```/gm, '').matchAll(re)]
    .map((m) => ({ id: m[1], texto: m[2].trim() }));
}

/** Os pedidos do contencioso: `- P1 — texto` na secao Pedidos da tese. */
export function pedidos(materia) {
  if (materia.tipo !== 'contencioso') return [];
  const est = estrategia(materia);
  if (!est) return [];
  const sec = est.corpo.split(/^## /m).find((s) => /^Pedidos/i.test(s)) || '';
  return [...sec.replace(/^```[\s\S]*?^```/gm, '').matchAll(/^-[ \t]*(P\d+)[ \t]*[\u2014\u2013-][ \t]*(\S.*)$/gm)]
    .map((m) => ({ id: m[1], texto: m[2].trim() }));
}

// --------------------------------------------------------------------- canon

/** Canon da materia: um arquivo por parte e por documento. */
export function canon(materia) {
  const ler = (sub) => {
    const dir = join(materia.dir, 'docs', 'canon', sub);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
    return readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => {
      const { fm, corpo } = frontmatter(readFileSync(join(dir, f), 'utf8'));
      return {
        arquivo: f,
        nome: fm.nome || basename(f, '.md'),
        id: fm.id || '',
        apelidos: lista(fm.apelidos),
        fm,
        corpo,
      };
    });
  };
  return { partes: ler('partes'), documentos: ler('documentos') };
}

/**
 * Todo nome e id pelo qual algo do canon pode ser chamado, em minusculas.
 * O documento responde tanto por `D3` quanto por "contrato de locacao".
 */
export function nomesDoCanon(cn) {
  return new Set(
    [...cn.partes, ...cn.documentos]
      .flatMap((x) => [x.nome, x.id, ...x.apelidos])
      .filter(Boolean)
      .map((n) => String(n).toLowerCase()),
  );
}
