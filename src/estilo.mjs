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
 * A unica regra de gate que o card habilita: **dentro** de uma peca, os dois
 * pares de rotulo convivendo.
 *
 * Nao depende do card, e por isso nao herda a fragilidade dele. Aviso, e nunca
 * violacao: ha caso legitimo — peca que trata de dois processos com polos
 * diferentes.
 */
export function rotulosMisturados(texto) {
  const req = (texto.match(ROTULOS.requerente) || []).length;
  const aut = (texto.match(ROTULOS.autor) || []).length;
  return req && aut ? { requerente: req, autor: aut } : null;
}
