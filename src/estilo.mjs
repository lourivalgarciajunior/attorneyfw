/**
 * Style card juridico — como **este** escritorio escreve.
 *
 * O `bookfw` ja provou o mecanismo: a Euterpe deriva a voz do autor de amostras
 * dele, e a prosa passa a soar como ele em vez de soar como um modelo. Aqui o
 * `adv-gaio` redigia com a voz que o modelo tem.
 *
 * A decisao que da forma a este arquivo esta no ADR, e e a diferenca entre um
 * card util e um card perigoso: **ele descreve, e nao prescreve**.
 *
 * Um card prescritivo — "chame a parte de Requerente" — e mais acionavel e
 * transforma uma medicao de oito pecas numa regra de redacao. Oito pecas nao
 * sustentam regra nenhuma, e corrigir o advogado pela frequencia e o mesmo
 * defeito da porcentagem de exito recusada na 0.3.0: numero pequeno com cara de
 * norma.
 *
 * Por isso cada traco sai com o `n`, nenhuma linha diz "escreva assim", e o
 * unico gate que o card habilita cobra **consistencia interna** — peca que usa
 * dois rotulos para a mesma parte —, que se verifica dentro da peca e nao
 * depende de o card estar certo.
 *
 * **Nenhum gate cobra aderencia a voz**, aqui nem em lugar nenhum: estilo nao se
 * reprova. Desde a 0.7.0 o card chega ao briefing de quem escreve, e chega la
 * como observacao — fora da secao de instrucoes, e com o `n` em cada linha.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Erro, acharEscritorio, c, escrever, hoje, rel } from './core.mjs';
import { lerTexto } from './importar.mjs';

export const ARQUIVO_ESTILO = 'estilo.yaml';

/**
 * Os tracos medidos. Cada um e uma contagem sobre o texto — nada aqui
 * interpreta, e nada aqui recomenda.
 */
const TRACOS = [
  { chave: 'tratamento_excelencia', rotulo: 'trata o juizo por "Excelência"', re: /\bExcel[êe]ncia\b/gi },
  { chave: 'tratamento_vossa', rotulo: 'usa "Vossa Excelência"', re: /\bVossa\s+Excel[êe]ncia\b/gi },
  { chave: 'lastro_conforme_anexo', rotulo: 'aponta prova com "conforme … anexo"', re: /\bconforme\b[^;\n]{0,60}?\banexos?\b/gi },
  { chave: 'convite_vejamos', rotulo: 'convida com "vejamos"', re: /\bvejamos\b/gi },
  { chave: 'venia', rotulo: 'usa "data venia" ou "com o devido respeito"', re: /\bdata\s+venia\b|\bcom o devido respeito\b/gi },
  { chave: 'fecho_nao_restou', rotulo: 'fecha com "não restou alternativa"', re: /\bn[ãa]o restou alternativa\b/gi },
];

/** Os dois pares de rotulo de parte que o corpus mostrou convivendo. */
const ROTULOS = {
  requerente: /\bRequerentes?\b|\bRequerid[ao]s?\b/g,
  autor: /\bAutor(?:a|es|as)?\b|\bR[ée]us?\b|\bR[ée]s?\b/g,
};

const CAIXA_ALTA = /\b[A-ZÀ-Ú]{3,}(?:[ \t]+[A-ZÀ-Ú]{2,}){2,}\b/g;

function medir(textos) {
  const n = textos.length;
  const tracos = TRACOS.map((t) => {
    let total = 0;
    let pecas = 0;
    for (const txt of textos) {
      t.re.lastIndex = 0;
      const q = (txt.match(t.re) || []).length;
      total += q;
      if (q) pecas++;
    }
    return { ...t, total, pecas };
  });

  const rotulos = Object.entries(ROTULOS).map(([chave, re]) => {
    let total = 0;
    let pecas = 0;
    for (const txt of textos) {
      const q = (txt.match(re) || []).length;
      total += q;
      if (q) pecas++;
    }
    return { chave, total, pecas };
  });

  // Peca que usa os dois pares. E o achado do corpus: metade das pecas alterna,
  // para a mesma pessoa, e ninguem percebe lendo — quem le sabe de quem se fala
  // e completa sozinho.
  const misturam = textos.filter((txt) => (txt.match(ROTULOS.requerente) || []).length
    && (txt.match(ROTULOS.autor) || []).length).length;

  const paragrafos = textos.flatMap((t) => t.split('\n').map((l) => l.trim().split(/\s+/).filter(Boolean).length))
    .filter((x) => x > 6).sort((a, b) => a - b);
  const mediana = paragrafos.length ? paragrafos[Math.floor(paragrafos.length / 2)] : 0;

  const caixaAlta = textos.reduce((a, t) => a + (t.match(CAIXA_ALTA) || []).length, 0);

  return { n, tracos, rotulos, misturam, mediana, paragrafos: paragrafos.length, caixaAlta };
}

function cartao(m, origens) {
  const l = [];
  l.push(`# Style card — como este escritorio escreve`);
  l.push(`# Derivado por attorneyfw em ${hoje()}, de ${m.n} peca(s).`);
  l.push('#');
  l.push('# Isto DESCREVE, e nao prescreve. Nenhuma linha aqui diz "escreva assim":');
  l.push('# todas dizem "assim aparece em N de M". Amostra deste tamanho nao sustenta');
  l.push('# regra de redacao, e transformar frequencia em norma seria a mesma familia');
  l.push('# da porcentagem de exito, que esta ferramenta recusa.');
  l.push('#');
  l.push('# A unica regra que este card habilita no gate e a de consistencia interna:');
  l.push('# peca que usa dois rotulos para a mesma parte recebe aviso. Isso se verifica');
  l.push('# dentro da peca, e nao depende de este card estar certo.');
  l.push('');
  l.push(`derivado_em: ${hoje()}`);
  l.push(`n: ${m.n}`);
  l.push(`amostras: [${origens.join(', ')}]`);
  l.push('');
  l.push('tracos:');
  for (const t of m.tracos) {
    l.push(`  - traco: ${JSON.stringify(t.rotulo)}`);
    l.push(`    chave: ${t.chave}`);
    l.push(`    em: ${t.pecas}/${m.n}`);
    l.push(`    ocorrencias: ${t.total}`);
  }
  l.push('');
  l.push('rotulo_das_partes:');
  for (const r of m.rotulos) {
    l.push(`  - par: ${r.chave === 'requerente' ? 'Requerente/Requerida' : 'Autor/Ré'}`);
    l.push(`    em: ${r.pecas}/${m.n}`);
    l.push(`    ocorrencias: ${r.total}`);
  }
  l.push(`  # pecas que usam OS DOIS pares, para a mesma parte: ${m.misturam}/${m.n}`);
  l.push('');
  l.push('ritmo:');
  l.push(`  paragrafos_medidos: ${m.paragrafos}`);
  l.push(`  palavras_por_paragrafo_mediana: ${m.mediana}`);
  l.push('');
  l.push('enfase:');
  l.push(`  trechos_em_caixa_alta: ${m.caixaAlta}`);
  l.push('');
  return l.join('\n');
}

export function estilo(args) {
  const raiz = acharEscritorio();
  const caminho = join(raiz, ARQUIVO_ESTILO);

  const pedidas = String(args.de || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (!pedidas.length) return mostrar(raiz, caminho);

  const textos = [];
  const origens = [];
  for (const f of pedidas) {
    if (!existsSync(f)) throw new Erro(`nao achei o arquivo ${f}`);
    textos.push(lerTexto(f));
    origens.push(f.split(/[\\/]/).pop());
  }

  const m = medir(textos);
  escrever(caminho, cartao(m, origens));

  console.log(`${c.green('style card derivado')}  ${rel(raiz, caminho)}`);
  console.log(c.dim(`  de ${m.n} peca(s), ${m.paragrafos} paragrafos medidos`));
  for (const t of m.tracos.filter((x) => x.pecas)) {
    console.log(`  ${String(`${t.pecas}/${m.n}`).padEnd(6)} ${t.rotulo}  ${c.dim(`${t.total} ocorrencia(s)`)}`);
  }
  const [req, aut] = m.rotulos;
  console.log(c.dim(`  rotulo: Requerente/Requerida em ${req.pecas}/${m.n}, Autor/Ré em ${aut.pecas}/${m.n}`));
  if (m.misturam) {
    console.log(c.yellow(`  ${m.misturam} de ${m.n} peca(s) usam OS DOIS pares, para a mesma parte`));
  }
  console.log(c.dim(`  mediana de ${m.mediana} palavras por paragrafo | ${m.caixaAlta} trecho(s) em caixa alta`));
  console.log('');
  console.log(c.dim('  O card DESCREVE, e nao prescreve. Amostra deste tamanho nao sustenta regra'));
  console.log(c.dim('  de redacao — cada traco sai com o n para que ninguem o leia como norma.'));
}

function mostrar(raiz, caminho) {
  if (!existsSync(caminho)) {
    throw new Erro(
      `a carteira nao tem ${ARQUIVO_ESTILO}.\n`
      + '  Derive das pecas do proprio escritorio:\n'
      + '    attorneyfw estilo --de "peca1.docx,peca2.docx"\n'
      + '  Nao ha card de partida: um card embutido seria opiniao sobre estilo juridico\n'
      + '  vinda de quem nao advoga.',
    );
  }
  console.log(readFileSync(caminho, 'utf8'));
}

/**
 * O card lido para quem vai escrever — o que o `brief` costura.
 *
 * Duas decisoes moram aqui, e as duas sao do ADR:
 *
 * 1. **Piso.** So sai traco presente em mais da metade das pecas, e so com
 *    amostra de tres ou mais. Traco visto em 2 de 8 e ruido; carregado para todo
 *    briefing, ruido vira estilo da casa em duas semanas — e ninguem lembra que
 *    era ruido.
 * 2. **Caixa alta nao sai daqui.** E o unico traco medido que se imita em
 *    excesso sem esforco, e excesso de caixa alta e defeito de peca, nao voz de
 *    escritorio. Nao e esquecimento: e para nao ser acrescentado depois como
 *    "faltava".
 *
 * Sem `estilo.yaml`, devolve `null` — e o briefing simplesmente nao ganha a
 * secao. Card ausente nao vira cobranca.
 */
const MIN_AMOSTRA = 3;

export function vozDoEscritorio(raiz) {
  const caminho = join(raiz, ARQUIVO_ESTILO);
  if (!existsSync(caminho)) return null;
  const bruto = readFileSync(caminho, 'utf8');

  const n = Number((bruto.match(/^n:\s*(\d+)/m) || [])[1] || 0);
  const derivadoEm = (bruto.match(/^derivado_em:\s*(\S+)/m) || [])[1] || '';
  const amostraFina = n < MIN_AMOSTRA;

  const todos = [...bruto.matchAll(/- traco:\s*(".*?"|\S.*?)\n\s*chave:\s*(\S+)\n\s*em:\s*(\d+)\/(\d+)/g)]
    .map((x) => ({
      rotulo: x[1].startsWith('"') ? JSON.parse(x[1]) : x[1].trim(),
      chave: x[2],
      pecas: Number(x[3]),
      de: Number(x[4]),
    }));

  const pares = [...bruto.matchAll(/- par:\s*(\S+)\n\s*em:\s*(\d+)\/(\d+)/g)]
    .map((x) => ({ par: x[1], pecas: Number(x[2]), de: Number(x[3]) }))
    .sort((a, b) => b.pecas - a.pecas);

  return {
    n,
    derivadoEm,
    amostraFina,
    // Maioria estrita: metade exata nao descreve nada, e e onde o ruido mora.
    tracos: amostraFina ? [] : todos.filter((t) => t.pecas * 2 > n),
    ritmo: Number((bruto.match(/palavras_por_paragrafo_mediana:\s*(\d+)/) || [])[1] || 0),
    // Empate nao elege par: dizer "o escritorio usa X" com 4 a 4 seria inventar
    // uma preferencia que a medicao nao mostrou.
    parDominante: pares.length && (pares.length === 1 || pares[0].pecas > pares[1].pecas) ? pares[0] : null,
  };
}

/**
 * A unica regra de gate que o card habilita: **dentro** de uma peca, os dois
 * pares de rotulo convivendo.
 *
 * Nao depende do card, e por isso nao herda a fragilidade dele. Aviso, e nunca
 * violacao: ha caso legitimo — peca que trata de dois processos com polos
 * diferentes.
 */
export function rotulosMisturados(texto) {
  const { requerente, autor } = contarRotulos(texto);
  return requerente && autor ? { requerente, autor } : null;
}

/**
 * Quantas vezes cada par de rotulo aparece num texto.
 *
 * O `brief` usa isto para dizer qual par a **propria peca** ja adotou. Esse dado
 * pesa mais que o do card: o gate cobra consistencia dentro da peca, e nao a
 * escolha do par — entao o que importa e o que ela ja fez, e nao o que o
 * escritorio costuma fazer.
 */
export function contarRotulos(texto) {
  const t = String(texto || '');
  return {
    requerente: (t.match(ROTULOS.requerente) || []).length,
    autor: (t.match(ROTULOS.autor) || []).length,
  };
}
