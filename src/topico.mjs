/**
 * Acrescenta um contrato de topico a uma entrega. O contrato e o que separa
 * argumento de paragrafo: sem `sustenta`, `fundamento` e `risco` declarados, o
 * que se escreve e opiniao — e a parte contraria responde primeiro.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Erro, acharEscritorio, c, entregas, exigirMateria, rel } from './core.mjs';
import { alvosDe } from './entrega.mjs';

const TIPOS_CONTENCIOSO = ['fato', 'preliminar', 'prejudicial', 'merito', 'tutela', 'pedido'];
const TIPOS_CONSULTIVO = ['definicao', 'obrigacao', 'garantia', 'risco', 'saida', 'conclusao'];

export function topicoAdd(args) {
  const m = exigirMateria(args);
  const pedido = args._[0];
  if (!pedido) throw new Erro(`Uso: attorneyfw topico add <entrega> [--tipo ${m.tipo === 'contencioso' ? 'merito' : 'obrigacao'}]`);

  const [alvo] = alvosDe(entregas(m), pedido);
  const validos = m.tipo === 'contencioso' ? TIPOS_CONTENCIOSO : TIPOS_CONSULTIVO;
  const tipo = String(args.tipo || validos[0]);
  if (!validos.includes(tipo)) throw new Erro(`--tipo deve ser um de: ${validos.join(', ')}`);

  const n = alvo.topicos.length + 1;
  const id = `${alvo.numero}.${n}`;
  const rotulo = m.voc.topico.charAt(0).toUpperCase() + m.voc.topico.slice(1);

  const bloco = [
    '', `## ${rotulo} ${n}`, '',
    '```topico',
    `id: ${id}`,
    `tipo: ${tipo}`,
    `sustenta: ${args.sustenta || ''}`,
    `${m.voc.pendencias}: [${args[m.voc.pendencias] || ''}]`,
    `${m.voc.paga}: []`,
    'documentos: []',
    'fundamento: []',
    ...(m.tipo === 'contencioso' ? ['pedidos: []'] : []),
    `risco: ${args.risco || ''}`,
    'resposta:',
    '```',
    '',
    `<!-- o texto d${m.voc.topico === 'clausula' ? 'a clausula' : 'o topico'} entra aqui, logo abaixo do contrato -->`,
    '',
  ].join('\n');

  const raw = readFileSync(alvo.caminho, 'utf8');
  writeFileSync(alvo.caminho, `${raw.replace(/\s*$/, '')}\n${bloco}`, 'utf8');

  console.log(`${c.green(`${m.voc.topico} ${id} adicionad${m.voc.topico === 'clausula' ? 'a' : 'o'}`)}  ${rel(acharEscritorio(), alvo.caminho)}`);
  console.log(c.dim(`  preencha sustenta, fundamento e risco — o gate cobra os tres`));
}
