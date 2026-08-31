/**
 * O canon da materia: quem sao as partes e o que cada documento prova. Existe
 * pelo motivo pratico de que a peca 7 esquece o que a peca 2 afirmou — nome
 * grafado de outro jeito, valor que mudou, data que nao bate com a cronologia.
 * A contraparte le as duas.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Erro, acharEscritorio, c, canon, escrever, exigirMateria, hoje, rel, slug, template } from './core.mjs';

const TIPOS = { parte: 'partes', documento: 'documentos' };

export function canonNew(args) {
  const m = exigirMateria(args);
  const tipo = args._.shift();
  if (!TIPOS[tipo]) throw new Erro('Uso: attorneyfw canon new parte|documento "Nome"');
  const nome = args._.join(' ').trim();
  if (!nome) throw new Erro(`Uso: attorneyfw canon new ${tipo} "Nome"`);
  if (nome.includes(':')) throw new Erro('Nome com ":" — o NTFS trunca o arquivo para 0 byte. Use travessao ou hifen.');

  const sub = TIPOS[tipo];
  const caminho = join(m.dir, 'docs/canon', sub, `${slug(nome)}.md`);
  if (existsSync(caminho)) throw new Erro(`${rel(acharEscritorio(), caminho)} ja existe.`);

  // Documento responde por um id curto — e por "D3" que o contrato de topico
  // cita, nao pelo nome comprido do arquivo digitalizado.
  const id = args.id || (tipo === 'documento' ? proximoIdDoc(m) : '');

  escrever(caminho, template(tipo === 'parte' ? 'parte.md' : 'documento.md', {
    nome, id, data: hoje(),
    apelidos: args.apelidos ? `[${args.apelidos}]` : '[]',
    papel: args.papel || (m.tipo === 'contencioso' ? 'a definir' : 'consulente'),
  }));

  console.log(`${c.green(`${tipo} no canon`)}  ${rel(acharEscritorio(), caminho)}${id ? c.dim(`  (${id})`) : ''}`);
  if (tipo === 'documento') console.log(c.dim(`  cite-o nos contratos de topico como  documentos: [${id}]`));
}

function proximoIdDoc(m) {
  const usados = canon(m).documentos
    .map((d) => Number(String(d.id).match(/^D(\d+)$/)?.[1] || 0));
  return `D${Math.max(0, ...usados) + 1}`;
}
