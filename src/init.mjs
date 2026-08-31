import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ESTADOS, Erro, TIPOS, acharEscritorio, c, escrever, hoje, rel, slug, template } from './core.mjs';

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
  }));
  escrever(join(dir, 'docs/canon/cronologia.md'), template('cronologia.md', { titulo, data: hoje() }));
  escrever(join(dir, 'docs/canon/autos.md'), template('autos.md', { titulo, data: hoje() }));

  console.log(`${c.green('materia criada')}  ${rel(raiz, dir)}  ${c.dim(`(${tipo})`)}`);
  console.log(c.dim(`  proximo: cd materias/${nome} && attorneyfw ${tipo === 'contencioso' ? 'tese' : 'mapa'}`));
}

/** Lista as materias da carteira. Existe porque `--materia` pede o slug exato. */
export function materiaList() {
  const raiz = acharEscritorio();
  const base = join(raiz, 'materias');
  const dirs = existsSync(base)
    ? readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    : [];
  if (!dirs.length) {
    console.log(c.dim('nenhuma materia — attorneyfw materia new "Cliente — Assunto"'));
    return;
  }
  for (const d of dirs) {
    const ok = existsSync(join(base, d, 'materia.yaml'));
    console.log(`${ok ? c.green('ok ') : c.yellow('??? ')} ${d}${ok ? '' : c.dim('  (sem materia.yaml)')}`);
  }
}
