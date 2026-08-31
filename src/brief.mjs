/**
 * O briefing de um topico — o pacote minimo e suficiente para redigir um
 * argumento sem reler os autos inteiros. E o que resolve o gargalo real do
 * escritorio: ninguem escreve uma peca, escreve-se um topico com contrato
 * declarado, canon fechado e o contra-argumento ja na mesa.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  Erro, acharEscritorio, artefatos, c, canon, contextoPrazo, entregas, estrategia,
  exigirMateria, lerEscritorio, lista, pedidos as pedidosDa, pendencias, prazoDe, rel,
} from './core.mjs';

export function brief(args) {
  const m = exigirMateria(args);
  const raiz = acharEscritorio();
  const esc = lerEscritorio(raiz);
  const alvoId = args._[0];
  if (!alvoId) throw new Erro('Uso: attorneyfw brief <entrega> [--topico N]');

  const todas = entregas(m);
  const e = todas.find((x) => x.arquivo === alvoId || x.arquivo === `${alvoId}.md` || String(x.numero) === String(alvoId) || x.fm.id === alvoId);
  if (!e) throw new Erro(`Entrega "${alvoId}" nao encontrada.`);

  // brief e leitura, entao nao recusa — mas pedir briefing de peca protocolada
  // costuma ser alvo errado, e o aviso sai antes de alguem escrever por cima.
  if (e.estado === 'entregue') console.error(`[aviso] ${e.arquivo} ja esta em entregue (${m.voc.fechada}).\n`);

  const cn = canon(m);
  const idx = args.topico
    ? e.topicos.findIndex((t, i) => String(t.id) === String(args.topico) || i + 1 === Number(args.topico))
    : e.topicos.findIndex((t) => !t.texto);
  const t = idx >= 0 ? e.topicos[idx] : e.topicos[0];
  if (!t) throw new Erro(`${e.arquivo} nao tem contrato de ${m.voc.topico}. Rode \`attorneyfw topico add ${e.numero}\` antes.`);

  const est = estrategia(m);
  const pend = pendencias(m);
  const peds = pedidosDa(m);

  const citadas = new Set(lista(t[m.voc.pendencias]).concat(lista(t[m.voc.paga])));
  const relevantes = pend.filter((p) => citadas.has(p.id));
  const docsCitados = lista(t.documentos).map((d) => d.toLowerCase());
  const docs = cn.documentos.filter((d) => docsCitados.includes(String(d.id).toLowerCase()) || docsCitados.includes(d.nome.toLowerCase()));
  const pedsCitados = lista(t.pedidos);
  const ctx = contextoPrazo(raiz);
  const p = prazoDe(e, ctx);

  const cronologia = join(m.dir, 'docs/canon/cronologia.md');
  const autos = join(m.dir, 'docs/canon/autos.md');
  const ler = (caminho) => (existsSync(caminho) ? readFileSync(caminho, 'utf8').trim() : '');

  const decs = artefatos(m, 'dec').map((d) => d.corpo.trim()).join('\n\n');
  const anteriores = e.topicos.slice(0, Math.max(0, idx)).map((x) => x.texto).filter(Boolean);
  const cauda = (anteriores.at(-1) || '').split(/\s+/).slice(-250).join(' ');

  console.log(`# BRIEFING DE ${m.voc.topico.toUpperCase()} — ${m.cfg.titulo || m.slug}
Arquivo: ${rel(raiz, e.caminho)}
Materia ${m.slug} (${m.tipo}) | ${m.voc.entrega} ${e.numero} — ${e.fm.titulo || ''} (${e.fm.tipo || 'sem tipo'})
${m.voc.topico} ${t.id || idx + 1} de ${e.topicos.length}${p && !p.erro ? ` | prazo vence ${p.fim} (${p.restam} dias uteis)${p.fatal ? ' — FATAL' : ''}` : ''}

## Contrato invariavel da materia
cliente:   ${m.cfg.cliente || '-'} (${m.cfg.papel || '-'})
adverso:   ${m.cfg.adverso || '-'}
processo:  ${m.cfg.processo || '(sem numero)'}
juizo:     ${m.cfg.juizo || '-'}
rito:      ${m.cfg.rito || '-'}
assina:    ${esc.advogado || '-'} — OAB ${esc.oab || '-'}
${decs ? `\n### Decisoes de estrategia\n${decs}` : ''}

## Contrato deste ${m.voc.topico}
tipo:       ${t.tipo || '-'}
sustenta:   ${t.sustenta || '-'}
${m.voc.pendencias}:${' '.repeat(Math.max(1, 11 - m.voc.pendencias.length))}${lista(t[m.voc.pendencias]).join(', ') || '-'}
${m.voc.paga}:${' '.repeat(Math.max(1, 11 - m.voc.paga.length))}${lista(t[m.voc.paga]).join(', ') || '-'}
documentos: ${lista(t.documentos).join(', ') || '-'}
fundamento: ${lista(t.fundamento).join(', ') || '-'}
${m.tipo === 'contencioso' ? `pedidos:    ${pedsCitados.join(', ') || '-'}\n` : ''}risco:      ${t.risco || '-'}
resposta:   ${t.resposta || '-'}

## ${m.voc.pendencias.charAt(0).toUpperCase() + m.voc.pendencias.slice(1)} que este ${m.voc.topico} carrega
${relevantes.map((x) => `- ${x.id} — ${x.texto}`).join('\n') || `(nenhum ${m.voc.pendencia} citado no contrato)`}

## Documentos citados
${docs.map((d) => `### ${d.id || ''} ${d.nome}\n${d.corpo.trim()}`).join('\n\n') || '(nenhum documento do canon citado)'}

## Partes
${cn.partes.map((x) => `- ${x.nome}${x.apelidos.length ? ` (${x.apelidos.join(', ')})` : ''} — ${x.fm.papel || 'papel nao declarado'}`).join('\n') || '(canon de partes vazio)'}
${m.tipo === 'contencioso' && peds.length ? `\n## Pedidos da tese\n${peds.map((x) => `- ${x.id} — ${x.texto}`).join('\n')}` : ''}

## Cronologia
${ler(cronologia) || '(vazia)'}

## Andamento
${ler(autos) || '(vazio)'}

## Onde o texto parou
${cauda || `(primeiro ${m.voc.topico} da ${m.voc.entrega})`}

## Instrucoes
- Escreva apenas ESTE ${m.voc.topico}, texto corrido, sem cabecalho de peca.
- O ${m.voc.topico} tem de sustentar exatamente o que o contrato declara — nada alem.
- Todo ${m.voc.pendencia} citado precisa aparecer no texto amarrado ao ${m.voc.lastro} declarado.
- Nao invente fato, data, valor nem documento: se faltar, escreva e liste a pendencia ao final.
- Nao cite dispositivo, sumula ou precedente que nao esteja em fundamento. Se precisar de outro, liste como pendencia — quem assina confere.
- Responda ao risco declarado antes que a parte contraria o levante.
- Nao encerre a ${m.voc.entrega} se ela continua.

${est ? `## ${m.voc.artefato.charAt(0).toUpperCase() + m.voc.artefato.slice(1)} em vigor (${est.arquivo})\n${est.corpo.trim()}` : `(sem ${m.voc.artefato} — o briefing esta cego)`}`);
}
