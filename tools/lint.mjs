/**
 * Lint do proprio attorneyfw. Nao e lint de estilo — para isso o smoke serve.
 * Cada regra existe porque a coisa correspondente ja quebrou no trackfw ou no
 * bookfw, que sao os dois antecessores diretos desta ferramenta.
 *
 *   npm run lint
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ler = (...p) => readFileSync(join(RAIZ, ...p), 'utf8');
const erros = [];
const falha = (regra, msg) => erros.push(`${regra}: ${msg}`);

const pkg = JSON.parse(ler('package.json'));
const srcs = readdirSync(join(RAIZ, 'src')).filter((f) => f.endsWith('.mjs'));
const bin = ler('bin', 'attorneyfw.mjs');
const todoOCodigo = [bin, ...srcs.map((f) => ler('src', f))].join('\n');
const templates = readdirSync(join(RAIZ, 'templates'));

// 1. Template no disco que nenhum comando le e template morto.
for (const t of templates) {
  if (!todoOCodigo.includes(`'${t}'`)) falha('template-morto', `templates/${t} nao e lido por nenhum comando`);
}

// 2. Placeholder que nenhuma substituicao preenche sai no arquivo do escritorio
//    como `{{nome}}` cru.
for (const t of templates) {
  for (const [, chave] of ler('templates', t).matchAll(/\{\{(\w+)\}\}/g)) {
    if (!todoOCodigo.includes(`${chave}:`) && !todoOCodigo.includes(`${chave},`)) {
      falha('placeholder-orfao', `templates/${t} usa {{${chave}}} e nada no codigo passa essa chave`);
    }
  }
}

// 3. Comando que existe no switch do bin e nao aparece na ajuda e comando que
//    so quem leu o codigo sabe que existe.
const ajuda = bin.slice(bin.indexOf('const AJUDA'), bin.indexOf('function parse'));
const ignorar = new Set(['version', '--version', '-v', 'help', '--help', '-h', 'undefined']);
for (const [, cmd] of bin.slice(bin.indexOf('switch (cmd)')).matchAll(/case '([a-z-]+)':/g)) {
  if (!ignorar.has(cmd) && !ajuda.includes(`attorneyfw ${cmd}`)) {
    falha('comando-sem-ajuda', `"${cmd}" existe no bin e nao aparece em AJUDA`);
  }
}

// 4. Versao publicada sem entrada no changelog e release que ninguem le depois.
if (!ler('CHANGELOG.md').includes(`## ${pkg.version} `)) {
  falha('changelog', `nao ha secao "## ${pkg.version}" no CHANGELOG.md`);
}

// 5. O que o npm empacota.
for (const obrigatorio of ['bin', 'src', 'templates', 'README.md', 'CHANGELOG.md']) {
  if (!pkg.files.includes(obrigatorio)) falha('files', `package.json nao empacota ${obrigatorio}`);
}

// 6. Todo modulo de src precisa ser alcancavel a partir do bin. Arquivo orfao
//    e codigo que ninguem executa e ninguem testa.
const alcancados = new Set();
const alcancar = (arq) => {
  if (alcancados.has(arq)) return;
  alcancados.add(arq);
  for (const [, dep] of ler('src', arq).matchAll(/from '\.\/([\w-]+\.mjs)'/g)) alcancar(dep);
};
for (const [, arq] of bin.matchAll(/from '\.\.\/src\/([\w-]+\.mjs)'/g)) alcancar(arq);
for (const f of srcs) if (!alcancados.has(f)) falha('modulo-orfao', `src/${f} nao e importado a partir do bin`);

// 7. O README precisa citar todo comando da ajuda: e a porta de entrada de quem
//    nao roda `attorneyfw help`.
const readme = ler('README.md');
for (const [, cmd] of ajuda.matchAll(/attorneyfw ([a-z-]+)/g)) {
  if (cmd !== 'help' && !readme.includes(`attorneyfw ${cmd}`)) {
    falha('readme', `comando "${cmd}" nao aparece no README`);
  }
}

// 8. As ressalvas de que o numero gerado e conferencia nao podem sumir de lugar
//    nenhum que o usuario le. Sao as unicas coisas nesta ferramenta que, se
//    forem entendidas errado, custam o caso ou o dinheiro do cliente.
// Acento nao pode decidir se a regra passa: o README escreve "conferência" e o
// help escreve "CONFERENCIA", e as duas dizem a mesma coisa.
const semAcento = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const RESSALVAS = [
  { assunto: 'a contagem de prazo', ancora: 'contagem oficial', onde: ['src/prazo.mjs'] },
  { assunto: 'a correcao monetaria', ancora: 'calculo oficial', onde: ['src/atualizar.mjs'] },
  { assunto: 'o orcamento de custas', ancora: 'guia', onde: ['src/custas.mjs'] },
];
for (const r of RESSALVAS) {
  for (const arq of ['bin/attorneyfw.mjs', 'README.md', ...r.onde]) {
    const t = semAcento(arq === 'README.md' ? readme : arq === 'bin/attorneyfw.mjs' ? bin : ler(...arq.split('/')));
    if (!(t.includes(r.ancora) && /conferencia|nao substitui/.test(t))) {
      falha('ressalva', `${arq} nao diz que ${r.assunto} e conferencia, nao a oficial`);
    }
  }
}

// 8b. A recusa em produzir porcentagem de exito e uma decisao, nao um vazio de
//     implementacao. Se ela sumir do texto, some tambem a razao de nao a
//     reintroduzir — e a proxima pessoa a implementa achando que faltava.
for (const arq of ['bin/attorneyfw.mjs', 'README.md', 'src/prognostico.mjs']) {
  const t = semAcento(arq === 'README.md' ? readme : arq === 'bin/attorneyfw.mjs' ? bin : ler(...arq.split('/')));
  if (!(/nao produz|nunca produz|nao sai porcentagem|nenhuma porcentagem/.test(t) && t.includes('exito'))) {
    falha('recusa-porcentagem', `${arq} nao declara que a ferramenta nao produz porcentagem de exito`);
  }
}
// 8c. O teste negativo correspondente: nenhuma linha de codigo pode emitir um
//     percentual ao lado de "exito". Comentario e linha que nega estao fora.
for (const f of srcs) {
  ler('src', f).split(/\r?\n/).forEach((linha, i) => {
    const t = semAcento(linha);
    if (!t.includes('exito') || !linha.includes('%')) return;
    if (/^\s*(\*|\/\/|\/\*)/.test(linha) || /nao|nunca/.test(t)) return;
    falha('porcentagem-de-exito', `src/${f}:${i + 1} parece emitir percentual de exito`);
  });
}

// 10. Arquivo que o CLI precisa e que o git nao versiona nao existe para quem
//     clona. Um padrao de .gitignore sem ancora engoliu
//     `templates/anonimizacao.yaml`, o smoke local passou porque o arquivo
//     estava no disco, e so a CI reprovou — depois do merge.
{
  let versionados = null;
  try {
    versionados = new Set(
      execFileSync('git', ['ls-files'], { cwd: RAIZ, encoding: 'utf8' })
        .split(/\r?\n/)
        .filter(Boolean)
        .map((f) => f.split('\\').join('/')),
    );
  } catch { /* sem git: nada a conferir, e nao e erro */ }
  if (versionados) {
    for (const dir of ['bin', 'src', 'templates', 'tools', 'test']) {
      for (const f of readdirSync(join(RAIZ, dir))) {
        const rel = `${dir}/${f}`;
        if (!versionados.has(rel)) falha('nao-versionado', `${rel} nao esta no git — quem clonar nao vai te-lo`);
      }
    }
  }
}

// 9. Os dois tipos de materia precisam ter vocabulario completo: uma chave a
//    menos num deles vira `undefined` no meio de uma mensagem do gate.
const core = ler('src', 'core.mjs');
const voc = core.slice(core.indexOf('export const VOCABULARIO'), core.indexOf('export const ROOT_CLI'));
const chaves = (tipo) => {
  const bloco = voc.slice(voc.indexOf(`${tipo}: {`));
  return new Set([...bloco.slice(0, bloco.indexOf('},')).matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]));
};
const [a, b] = [chaves('contencioso'), chaves('consultivo')];
for (const k of a) if (!b.has(k)) falha('vocabulario', `consultivo nao tem a chave "${k}" que contencioso tem`);
for (const k of b) if (!a.has(k)) falha('vocabulario', `contencioso nao tem a chave "${k}" que consultivo tem`);

console.log(`attorneyfw ${pkg.version} | ${srcs.length} modulos | ${templates.length} templates | vocabulario ${a.size} chaves`);
if (!existsSync(join(RAIZ, 'test', 'smoke.mjs'))) falha('teste', 'test/smoke.mjs sumiu');
for (const e of erros) console.log(`  ERRO   ${e}`);
console.log(erros.length ? `\n${erros.length} problema(s).` : '\nOK.');
process.exit(erros.length ? 1 : 0);
