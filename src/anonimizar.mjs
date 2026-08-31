/**
 * Anonimizacao por mapa.
 *
 * Nasceu de tres pecas reais que tinham sido anonimizadas a mao antes de sair, e
 * que sairam **pela metade**: numa delas ficou o CPF de uma crianca ao lado do
 * diagnostico; noutra, quem foi anonimizado foi a falecida, e cinco pessoas
 * vivas sairam com nome, CPF, RG e endereco; na terceira — um modelo, que vai
 * ser reaproveitado — a substituicao escapou num paragrafo do meio.
 *
 * O diagnostico nao e "faltou cuidado". E que **meia anonimizacao e pior que
 * nenhuma**, e nao pelo que deixa passar: pelo que faz acreditar. Arquivo
 * marcado como anonimizado circula por e-mail, entra em pasta compartilhada e
 * vira modelo — porque parece seguro. Arquivo nao anonimizado ninguem manda.
 *
 * Daí o desenho, que esta no ADR:
 *
 * 1. **E um mapa declarado, nao uma deteccao.** O escritorio escreve
 *    `real: ficticio` uma vez, e a substituicao cobre o texto inteiro.
 * 2. **Uma passada so.** Um regex com todas as chaves, alternadas e ordenadas da
 *    mais longa para a mais curta. Sem cascata: nada do que sai da substituicao
 *    volta a ser substituido.
 * 3. **Aplicar pela metade e impossivel.** Qualquer impedimento faz o comando
 *    falhar antes de gravar. Meia substituicao no disco seria exatamente o
 *    defeito que este modulo existe para impedir.
 * 4. **Ida e volta devolve o original byte a byte.** Por isso so duas formas
 *    sao aceitas — a declarada e a MAIUSCULA —, que sao as duas invertiveis.
 *    Qualquer outra variacao de caixa faz falhar, dizendo qual acrescentar.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  Erro, acharEscritorio, c, entregas, escrever, exigirMateria, hoje, rel, template,
} from './core.mjs';
import { alvosDe } from './entrega.mjs';

export const ARQUIVO_MAPA = 'anonimizacao.yaml';
const MIN = 4;

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Le o mapa da materia. Formato deliberadamente raso: `real: ficticio`, um por
 * linha. Nao ha aninhamento, porque nao ha nada para aninhar — e formato simples
 * e formato que alguem revisa antes de mandar a peca para fora.
 */
export function lerMapa(materia) {
  const caminho = join(materia.dir, ARQUIVO_MAPA);
  if (!existsSync(caminho)) {
    throw new Erro(
      `a materia nao tem ${ARQUIVO_MAPA}.\n`
      + `  Crie:  attorneyfw anonimizar --init\n`
      + '  Sem mapa nao ha anonimizacao: varredura automatica cobre so o que tem\n'
      + '  formato, e foi nome proprio que escapou nas pecas que originaram isto.',
    );
  }
  const pares = [];
  for (const [n, linha] of readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n').split('\n').entries()) {
    const l = linha.trim();
    if (!l || l.startsWith('#')) continue;
    const i = l.indexOf(':');
    if (i < 0) throw new Erro(`${ARQUIVO_MAPA}, linha ${n + 1}: falta o ":" entre o real e o ficticio`);
    const real = l.slice(0, i).trim().replace(/^["'](.*)["']$/, '$1');
    const falso = l.slice(i + 1).trim().replace(/^["'](.*)["']$/, '$1');
    if (!real || !falso) throw new Erro(`${ARQUIVO_MAPA}, linha ${n + 1}: par incompleto`);
    pares.push({ real, falso, linha: n + 1 });
  }
  if (!pares.length) throw new Erro(`${ARQUIVO_MAPA} nao tem nenhum par`);
  return { caminho, pares };
}

/**
 * As recusas. Todas acontecem **antes** de qualquer escrita, e todas existem
 * porque o contrario quebraria a ida e volta ou a cobertura total.
 */
function conferirMapa(pares, texto, reverso) {
  const problemas = [];
  const de = (p) => (reverso ? p.falso : p.real);
  const para = (p) => (reverso ? p.real : p.falso);

  for (const p of pares) {
    // Chave curta acerta dentro de palavra: "Sa" casaria em "Sao Paulo".
    if (de(p).length < MIN) {
      problemas.push(`linha ${p.linha}: "${de(p)}" tem menos de ${MIN} caracteres — acertaria dentro de outra palavra`);
    }
    if (de(p) === para(p)) problemas.push(`linha ${p.linha}: os dois lados sao iguais`);
  }

  // Cascata: o que sai de um par nao pode ser a entrada de outro. Aqui nao
  // acontece, porque a substituicao e de uma passada so — mas se acontecesse, a
  // ida e volta ficaria ambigua, e e a ida e volta que garante o original.
  const entradas = new Set(pares.map(de));
  for (const p of pares) {
    if (entradas.has(para(p))) {
      problemas.push(`linha ${p.linha}: "${para(p)}" e, ao mesmo tempo, o resultado de um par e a entrada de outro`);
    }
  }

  // O lado de chegada nao pode ja existir no texto: a volta transformaria
  // ocorrencias legitimas no nome de outra pessoa.
  for (const p of pares) {
    const re = new RegExp(escapar(para(p)), 'i');
    if (re.test(texto)) {
      problemas.push(`linha ${p.linha}: "${para(p)}" ja aparece no texto — a volta trocaria ocorrencia legitima`);
    }
  }

  if (problemas.length) {
    throw new Erro(
      `o mapa nao pode ser aplicado, e nada foi gravado:\n${problemas.map((x) => `  ${x}`).join('\n')}\n`
      + '  Aplicar so os pares validos deixaria o arquivo anonimizado pela metade,\n'
      + '  que e pior que nao anonimizar — porque parece seguro.',
    );
  }
}

/**
 * Aplica todos os pares numa passada.
 *
 * Duas formas de caixa sao aceitas, e so duas: a declarada e a MAIUSCULA. Sao as
 * unicas que voltam iguais. Qualquer outra variacao encontrada faz falhar
 * dizendo exatamente qual par acrescentar — a peca escreve o nome de tres jeitos
 * e o mapa tem de saber disso.
 */
export function aplicar(texto, pares, { reverso = false } = {}) {
  const de = (p) => (reverso ? p.falso : p.real);
  const para = (p) => (reverso ? p.real : p.falso);

  const porChave = new Map();
  for (const p of pares) porChave.set(de(p).toLowerCase(), p);

  const alternativas = [...pares]
    .sort((a, b) => de(b).length - de(a).length)
    .map((p) => escapar(de(p)));
  const re = new RegExp(alternativas.join('|'), 'gi');

  const variantes = [];
  const saida = texto.replace(re, (achado) => {
    const p = porChave.get(achado.toLowerCase());
    if (!p) return achado;
    if (achado === de(p)) return para(p);
    if (achado === de(p).toUpperCase()) return para(p).toUpperCase();
    variantes.push({ achado, esperado: de(p), linha: p.linha });
    return achado;
  });

  if (variantes.length) {
    const lista = [...new Map(variantes.map((v) => [v.achado, v])).values()];
    throw new Erro(
      'o texto escreve o mesmo nome com outra caixa, e nada foi gravado:\n'
      + lista.map((v) => `  "${v.achado}" (o mapa declara "${v.esperado}", linha ${v.linha})`).join('\n')
      + '\n  Acrescente cada variacao como par propria. So a forma declarada e a\n'
      + '  MAIUSCULA voltam iguais; adivinhar a caixa quebraria a ida e volta.',
    );
  }
  return saida;
}

// ------------------------------------------------------------------ comando

function arquivoDaEntrega(m, args) {
  const pedido = args._[0];
  if (!pedido) return null;
  const [e] = alvosDe(entregas(m), pedido);
  const md = join(m.dir, 'saida', `${e.fm.id || e.arquivo.replace('.md', '')}.md`);
  if (!existsSync(md)) {
    throw new Erro(`${rel(acharEscritorio(), md)} nao existe — rode \`attorneyfw build ${e.numero}\` antes.`);
  }
  return { entrega: e, md };
}

export function anonimizar(args) {
  const m = exigirMateria(args);
  const raiz = acharEscritorio();

  if (args.init) {
    const caminho = join(m.dir, ARQUIVO_MAPA);
    if (existsSync(caminho)) throw new Erro(`${rel(raiz, caminho)} ja existe.`);
    escrever(caminho, template('anonimizacao.yaml', { titulo: m.cfg.titulo || m.slug, data: hoje() }));
    console.log(`${c.green('mapa criado')}  ${rel(raiz, caminho)}`);
    console.log(c.yellow('  Ele e a chave que desfaz a anonimizacao de todas as pecas de uma vez.'));
    console.log(c.dim('  Nao versione, nao anexe, nao mande junto com a peca anonimizada.'));
    return;
  }

  const alvo = arquivoDaEntrega(m, args);
  if (!alvo) throw new Erro('Uso: attorneyfw anonimizar <entrega> [--reverter]   ou   attorneyfw anonimizar --init');

  const { pares } = lerMapa(m);
  const reverso = Boolean(args.reverter);
  const origem = reverso
    ? alvo.md.replace(/\.md$/, '-anonimizado.md')
    : alvo.md;
  if (!existsSync(origem)) throw new Erro(`${rel(raiz, origem)} nao existe.`);

  const texto = readFileSync(origem, 'utf8');
  conferirMapa(pares, texto, reverso);
  const saida = aplicar(texto, pares, { reverso });

  const destino = reverso ? alvo.md : alvo.md.replace(/\.md$/, '-anonimizado.md');
  writeFileSync(destino, saida, 'utf8');

  const trocas = pares.filter((p) => saida !== texto && !new RegExp(escapar(reverso ? p.falso : p.real), 'i').test(saida)).length;
  console.log(`${c.green(reverso ? 'original restaurado' : 'peca anonimizada')}  ${rel(raiz, destino)}`);
  console.log(c.dim(`  ${pares.length} par(es) no mapa | ${trocas} com ocorrencia trocada nesta peca`));
  if (!reverso) {
    console.log(c.dim('  Confira o resultado: o mapa cobre o que foi declarado, e nome nao declarado sai inteiro.'));
    console.log(c.dim(`  O que tem formato reconhecivel e nao esta no mapa: attorneyfw dados ${alvo.entrega.numero}`));
  }
}
