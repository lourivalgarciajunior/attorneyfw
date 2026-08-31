/**
 * As formulas de peca — enderecamento, qualificacao e fecho.
 *
 * Ate a 0.4.0 o enderecamento era uma linha escrita no `build`, feita para ser
 * neutra: sem acento e com o genero entre parenteses. Medida contra oito pecas
 * reais de um escritorio, ela **nao aparecia em nenhuma**. As oito usavam a
 * forma cheia, com acento e genero resolvido, e ela variava com o foro — seis
 * formas distintas em oito pecas. O `build` emitia uma setima, que nao era de
 * ninguem.
 *
 * O padrao ja foi decidido duas vezes nesta ferramenta com outros nomes: a serie
 * de indice mora em arquivo na carteira, e a tabela de custas tambem. **O que
 * muda por escritorio, por comarca e por ano nao pode estar compilado.**
 *
 * Enderecamento e a primeira coisa que o juizo le. Sair numa forma que o
 * escritorio nao usa denuncia a peca antes do primeiro argumento.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Erro, TEMPLATES, valor, yamlRaso } from './core.mjs';

export const ARQUIVO_FORMULAS = 'formulas.yaml';
export const FOROS = ['civel', 'fazenda', 'familia', 'juizado', 'trabalho'];

/**
 * As formulas em vigor, e de onde vieram.
 *
 * Sem arquivo na carteira nao se falha: peca tem de sair. Usa-se a semente e
 * diz-se que se usou — uma vez, por execucao.
 */
export function formulas(raiz) {
  const daCarteira = join(raiz, ARQUIVO_FORMULAS);
  if (existsSync(daCarteira)) {
    const f = yamlRaso(readFileSync(daCarteira, 'utf8'));
    return { f, semente: String(valor(f.semente)).toLowerCase() === 'true', origem: ARQUIVO_FORMULAS };
  }
  const semente = yamlRaso(readFileSync(join(TEMPLATES, 'formulas.yaml'), 'utf8'));
  return { f: semente, semente: true, origem: 'semente do CLI' };
}

/**
 * Preenche os marcadores. O que nao tiver valor **fica visivel**, como
 * `{comarca}`, e nao vira espaco em branco: peca com buraco tem de parecer peca
 * com buraco, e espaco em branco ninguem nota na revisao.
 */
export function preencher(texto, ctx) {
  return String(texto || '').replace(/\{(\w+)\}/g, (marca, chave) => {
    const v = ctx[chave];
    return v === undefined || v === null || String(v).trim() === '' ? marca : String(v);
  });
}

/** Quais marcadores ficaram sem valor num texto ja preenchido. */
export const marcadoresVazios = (texto) => [...new Set(
  [...String(texto).matchAll(/\{(\w+)\}/g)].map((m) => m[1]),
)];

/** O enderecamento do foro declarado. Foro invalido e erro, e nao palpite. */
export function enderecamento(f, foro, ctx) {
  const chave = `enderecamento_${foro}`;
  if (!FOROS.includes(foro)) {
    throw new Erro(
      `foro "${foro}" nao existe. Declare em materia.yaml um de: ${FOROS.join(', ')}.\n`
      + '  O foro nao e inferido do texto de `juizo:`: inferir acerta quase sempre, e\n'
      + '  o que sobra enderecca a peca ao juizo errado.',
    );
  }
  const bruto = valor(f[chave]);
  if (!bruto) throw new Erro(`${ARQUIVO_FORMULAS} nao tem a chave "${chave}"`);
  return preencher(bruto, ctx);
}
