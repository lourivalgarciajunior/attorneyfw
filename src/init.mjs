import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ESTADOS, Erro, RESULTADOS, TIPOS, acharEscritorio, c, dataValida, escrever,
  exigirMateria, gravarCampoYaml, hoje, materias, rel, slug, template,
} from './core.mjs';

export function init(args) {
  const nome = args.nome || args._.join(' ');
  if (!nome) throw new Erro('Uso: attorneyfw init "Nome do escritorio"');
  const raiz = process.cwd();
  if (existsSync(join(raiz, 'escritorio.yaml'))) throw new Erro('Ja existe um escritorio.yaml aqui.');
  if (existsSync(join(raiz, 'materia.yaml'))) {
    throw new Erro('Esta pasta e uma materia. O escritorio e a pasta de cima.');
  }

  mkdirSync(join(raiz, 'materias'), { recursive: true });
  mkdirSync(join(raiz, 'docs'), { recursive: true });

  escrever(join(raiz, 'escritorio.yaml'), template('escritorio.yaml', {
    nome, slug: slug(nome), data: hoje(),
    advogado: args.advogado || 'a definir',
    oab: args.oab || 'a definir',
  }));
  escrever(join(raiz, 'docs/feriados.md'), template('feriados.md', { nome, data: hoje() }));

  console.log(`${c.green('escritorio criado')} — ${nome}`);
  console.log(c.dim('  proximo: attorneyfw materia new "Cliente — Assunto" --tipo contencioso'));
}

/**
 * Uma materia e uma pasta com kanban proprio. O nome curto e o slug, e e por
 * ele que `--materia` chama: nome de cliente com acento e travessao nao serve
 * de identificador em linha de comando.
 */
export function materiaNew(args) {
  const raiz = acharEscritorio();
  const titulo = args._.join(' ').trim();
  if (!titulo) throw new Erro('Uso: attorneyfw materia new "Cliente — Assunto" --tipo contencioso|consultivo');
  if (titulo.includes(':')) throw new Erro('Titulo com ":" — no Windows o NTFS abre alternate data stream e o arquivo fica com 0 byte. Use travessao.');

  const tipo = String(args.tipo || 'contencioso');
  if (!TIPOS.includes(tipo)) throw new Erro(`--tipo deve ser ${TIPOS.join(' ou ')}.`);

  const nome = args.slug ? slug(String(args.slug)) : slug(titulo);
  const dir = join(raiz, 'materias', nome);
  if (existsSync(dir)) throw new Erro(`Ja existe a materia "${nome}" em ${rel(raiz, dir)}.`);

  const dirs = [
    'docs/dec', 'docs/plano',
    'docs/canon/partes', 'docs/canon/documentos',
    'entregas', 'saida',
  ];
  const artefato = tipo === 'contencioso' ? 'docs/tese' : 'docs/mapa-risco';
  for (const d of [...dirs, artefato]) mkdirSync(join(dir, d), { recursive: true });
  for (const e of ESTADOS) mkdirSync(join(dir, 'entregas', e), { recursive: true });

  escrever(join(dir, 'materia.yaml'), template('materia.yaml', {
    titulo, slug: nome, tipo, data: hoje(),
    cliente: args.cliente || 'a definir',
    papel: args.papel || (tipo === 'contencioso' ? 'autor' : 'consulente'),
    adverso: args.adverso || 'a definir',
    processo: args.processo || '',
    juizo: args.juizo || 'a definir',
    valor_pedido: args['valor-pedido'] || '',
  }));
  escrever(join(dir, 'docs/canon/cronologia.md'), template('cronologia.md', { titulo, data: hoje() }));
  escrever(join(dir, 'docs/canon/autos.md'), template('autos.md', { titulo, data: hoje() }));

  console.log(`${c.green('materia criada')}  ${rel(raiz, dir)}  ${c.dim(`(${tipo})`)}`);
  console.log(c.dim(`  proximo: cd materias/${nome} && attorneyfw ${tipo === 'contencioso' ? 'tese' : 'mapa'}`));
}

/**
 * Registra o desfecho da materia.
 *
 * Existe porque a carteira ja guardava tudo menos o que aconteceu no fim: a
 * ultima entrega em `entregue` diz que a peca saiu, e nao se ganhou. Sem o
 * desfecho, a base responde "ja fizemos" e nao responde "ja perdemos" — que e a
 * pergunta que evita repetir uma causa perdida em vez de propor acordo.
 */
export function materiaFechar(args) {
  const m = exigirMateria(args);
  const raiz = acharEscritorio();
  const r = String(args.resultado || args._[0] || '');
  if (!RESULTADOS.includes(r)) {
    throw new Erro(
      `--resultado deve ser um de: ${RESULTADOS.join(', ')}.\n`
      + '  O vocabulario e fechado para que a carteira consiga contar. O que nao\n'
      + '  couber nele vai em --nota, que fica ao lado.',
    );
  }
  const em = args.em ? String(args.em) : hoje();
  if (!dataValida(em)) throw new Erro(`--em "${args.em}" nao e AAAA-MM-DD.`);

  const caminho = join(m.dir, 'materia.yaml');
  let raw = readFileSync(caminho, 'utf8');
  raw = gravarCampoYaml(raw, 'resultado', r);
  raw = gravarCampoYaml(raw, 'resultado_em', em);
  if (args.valor !== undefined) raw = gravarCampoYaml(raw, 'resultado_valor', String(args.valor));
  if (args.nota !== undefined) raw = gravarCampoYaml(raw, 'resultado_nota', String(args.nota));
  writeFileSync(caminho, raw, 'utf8');

  console.log(`${c.green('materia fechada')}  ${rel(raiz, caminho)}  ${c.b(r)}  ${c.dim(em)}`);
  if (args.nota) console.log(c.dim(`  ${args.nota}`));
  console.log(c.dim('  a memoria da carteira: attorneyfw buscar <termo>'));
}

const MARCA_RESULTADO = {
  ganho: c.green, ganho_parcial: c.cyan, acordo: c.cyan, perda: c.red, extinto: c.dim,
};

/** Como o desfecho aparece em lista. Materia em curso nao ganha rotulo. */
export const rotuloResultado = (m) =>
  (m.resultado ? (MARCA_RESULTADO[m.resultado] || c.dim)(m.resultado) : c.dim('em curso'));

/** Lista as materias da carteira. Existe porque `--materia` pede o slug exato. */
export function materiaList() {
  const raiz = acharEscritorio();
  const todas = materias(raiz);
  if (!todas.length) {
    console.log(c.dim('nenhuma materia — attorneyfw materia new "Cliente — Assunto"'));
    return;
  }
  for (const m of todas) {
    console.log(`  ${m.slug.padEnd(34)} ${c.dim(m.tipo.padEnd(12))} ${rotuloResultado(m)}`);
  }
  // Pasta sem materia.yaml nao e materia, e some da lista acima — mas some
  // tambem do gate e do prazo, entao ela precisa aparecer em algum lugar.
  const base = join(raiz, 'materias');
  if (existsSync(base)) {
    const conhecidas = new Set(todas.map((m) => m.slug));
    for (const d of readdirSync(base, { withFileTypes: true }).filter((x) => x.isDirectory())) {
      if (!conhecidas.has(d.name)) console.log(`  ${c.yellow(d.name.padEnd(34))} ${c.yellow('sem materia.yaml — invisivel para o gate')}`);
    }
  }
}
