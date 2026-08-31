import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ESTADOS_ATIVOS, RESULTADOS, acharEscritorio, acharMateria, artefatos, c, canon,
  contextoPrazo, entregas, estrategia, exigirMateria, lerEscritorio, lista, materias,
  pedidos as pedidosDa, pendencias, plano as planoEmVigor, prazoDe, rel, valor,
} from './core.mjs';
import { rotuloResultado } from './init.mjs';

export function status(args) {
  const raiz = acharEscritorio();
  const escolhida = args.materia ? exigirMateria(args) : acharMateria();
  if (escolhida) return statusMateria(escolhida, raiz);
  return statusCarteira(raiz);
}

/** Na raiz: a carteira. E o unico lugar de onde se ve o proximo prazo de todas. */
function statusCarteira(raiz) {
  const esc = lerEscritorio(raiz);
  const todas = materias(raiz);
  const ctx = contextoPrazo(raiz);

  console.log(c.b(esc.nome || 'escritorio') + c.dim(`  ${esc.advogado || ''}${esc.oab ? ` — OAB ${esc.oab}` : ''}`));
  console.log(c.dim(`${todas.length} materia(s) | hoje ${ctx.hoje}\n`));
  if (!todas.length) {
    console.log(c.dim('  attorneyfw materia new "Cliente — Assunto" --tipo contencioso'));
    return;
  }

  for (const m of todas) {
    const es = entregas(m);
    const abertas = es.filter((x) => ESTADOS_ATIVOS.includes(x.estado) && x.estado !== 'entregue');
    const prazos = abertas.map((e) => prazoDe(e, ctx)).filter((p) => p && !p.erro).sort((a, b) => a.fim.localeCompare(b.fim));
    const prox = prazos[0];
    const marca = !prox ? c.dim('sem prazo   ')
      : prox.vencido ? c.red(`VENCIDO ${prox.fim}`)
        : prox.restam <= 2 ? c.red(`${prox.fim} ${String(prox.restam).padStart(2)}d`)
          : prox.restam <= 5 ? c.yellow(`${prox.fim} ${String(prox.restam).padStart(2)}d`)
            : c.dim(`${prox.fim} ${String(prox.restam).padStart(2)}d`);
    const est = estrategia(m) ? 'ok' : c.red('SEM');
    console.log(`  ${marca}  ${m.slug.padEnd(30)} ${c.dim(m.tipo.padEnd(12))} ${String(abertas.length).padStart(2)} aberta(s) / ${String(es.length).padStart(2)}  ${m.voc.artefato} ${est}${m.resultado ? `  ${rotuloResultado(m)}` : ''}`);
  }

  // O placar da carteira. Existe para a pergunta que o escritorio fez — que a
  // base responda "ja perdemos isto antes?" sem depender da memoria de ninguem.
  const fechadas = todas.filter((m) => m.fechada);
  if (fechadas.length) {
    const conta = {};
    for (const m of fechadas) conta[m.resultado] = (conta[m.resultado] || 0) + 1;
    const placar = RESULTADOS.filter((r) => conta[r]).map((r) => `${conta[r]} ${r}`).join(' · ');
    console.log(c.dim(`\n  encerradas ${fechadas.length}/${todas.length}: ${placar}`));
  }

  console.log(c.dim('\n  detalhe de uma materia: cd materias/<slug> && attorneyfw status'));
  console.log(c.dim('  agenda completa: attorneyfw prazo'));
  console.log(c.dim('  a memoria da carteira: attorneyfw buscar <termo>'));
}

function statusMateria(m, raiz) {
  const es = entregas(m);
  const cn = canon(m);
  const ctx = contextoPrazo(raiz);
  const pend = pendencias(m);
  const peds = pedidosDa(m);

  console.log(c.b(m.cfg.titulo || m.slug) + c.dim(`  ${m.tipo}`));
  console.log(c.dim(`${m.cfg.cliente || 'cliente a definir'} (${m.cfg.papel || '-'}) x ${m.cfg.adverso || '-'} | ${m.cfg.processo || 'sem processo'} | ${m.cfg.juizo || '-'}`));
  console.log(c.dim(`${m.voc.artefato} ${estrategia(m) ? 'sim' : 'NAO'} | plano ${planoEmVigor(m) ? 'sim' : 'NAO'} | DEC ${artefatos(m, 'dec').length} | partes ${cn.partes.length} | documentos ${cn.documentos.length}`));
  console.log('');

  for (const estado of ESTADOS_ATIVOS) {
    const doEstado = es.filter((x) => x.estado === estado);
    const cor = estado === 'minuta' ? c.cyan : estado === 'entregue' ? c.green : c.dim;
    console.log(cor(`${estado.padEnd(9)}`) + ` ${doEstado.length}`);
    for (const e of doEstado) {
      const p = prazoDe(e, ctx);
      const prazo = !p ? '' : p.erro ? c.yellow('  prazo mal declarado')
        : p.vencido && estado !== 'entregue' ? c.red(`  VENCIDO ${p.fim}`)
          : `  ${p.fim}${estado === 'entregue' ? '' : ` (${p.restam}d)`}${p.regime === 'material' ? c.cyan(' CTN') : ''}${p.fatal ? c.red(' FATAL') : ''}`;
      console.log(`  ${String(e.numero).padStart(2, '0')} ${(e.fm.titulo || e.arquivo).padEnd(38)} ${String(e.topicos.length).padStart(2)} ${m.voc.topico}s ${String(e.palavras).padStart(5)} pal${prazo}`);
    }
  }

  const bloq = es.filter((x) => x.estado === 'bloqueado');
  if (bloq.length) {
    console.log(c.yellow(`\nbloqueado ${bloq.length}`));
    for (const e of bloq) console.log(`  ${e.arquivo} — ${e.fm.motivo || 'sem motivo declarado'}`);
  }

  if (pend.length) {
    const todos = es.flatMap((x) => x.topicos);
    const pagas = new Set(todos.flatMap((t) => lista(t[m.voc.paga])));
    console.log(`\n${m.voc.pendencias} ${m.voc.paga}s ${pagas.size}/${pend.length}`);
    for (const x of pend) console.log(`  ${pagas.has(x.id) ? c.green('x') : ' '} ${x.id} ${x.texto}`);
  }
  if (peds.length) {
    const sust = new Set(es.flatMap((x) => x.topicos).flatMap((t) => lista(t.pedidos)));
    console.log(`\npedidos sustentados ${sust.size}/${peds.length}`);
    for (const x of peds) console.log(`  ${sust.has(x.id) ? c.green('x') : ' '} ${x.id} ${x.texto}`);
  }

  console.log(c.dim(`\n${rel(raiz, m.dir)}`));
}

/**
 * Dump da governanca formatado para LLM. E o que um agente le ao retomar uma
 * materia sem contexto nenhum. Roda dentro da materia de proposito: despejar a
 * carteira inteira mistura clientes, e material de cliente nao se mistura.
 */
export function context(args) {
  const m = exigirMateria(args);
  const raiz = acharEscritorio();
  const esc = lerEscritorio(raiz);
  const es = entregas(m);
  const cn = canon(m);
  const ctx = contextoPrazo(raiz);
  const out = [];

  out.push(`# Contexto da materia — ${m.cfg.titulo || m.slug}`);
  out.push(`Tipo ${m.tipo} | cliente ${m.cfg.cliente} (${m.cfg.papel}) | adverso ${m.cfg.adverso}`);
  out.push(`Processo ${m.cfg.processo || '(sem numero)'} | juizo ${m.cfg.juizo} | rito ${m.cfg.rito || '-'} | valor ${m.cfg.valor_causa || '-'}`);
  out.push(`Assina ${esc.advogado} — OAB ${esc.oab}${String(m.cfg.sigilo || '').toLowerCase() === 'true' ? ' | SEGREDO DE JUSTICA' : ''}`);
  out.push(
    `Pedido ${valor(m.cfg.valor_pedido) || '(nao declarado)'} | desfecho `
    + (m.resultado
      ? `${m.resultado} em ${valor(m.cfg.resultado_em) || '?'}${valor(m.cfg.resultado_valor) ? `, ${valor(m.cfg.resultado_valor)}` : ''}`
        + `${valor(m.cfg.resultado_nota) ? ` — ${valor(m.cfg.resultado_nota)}` : ''}`
      : 'em curso'),
  );

  // A memoria institucional entra no contexto sem ninguem pedir: quem redige
  // aqui precisa saber que uma materia irma com a mesma tese terminou em perda,
  // e essa e informacao que so aparece se for empurrada.
  const irmas = materias(raiz).filter((x) => x.slug !== m.slug && x.fechada);
  if (irmas.length) {
    out.push('\n## Materias ja encerradas na carteira');
    out.push('Consulte antes de repetir tese: `attorneyfw buscar <termo>`.');
    for (const x of irmas) {
      out.push(`- ${x.slug} (${x.tipo}) — ${x.resultado} em ${valor(x.cfg.resultado_em) || '?'}`
        + `${valor(x.cfg.resultado_nota) ? `: ${valor(x.cfg.resultado_nota)}` : ''}`);
    }
  }

  const est = estrategia(m);
  if (est) out.push(`\n## ${m.voc.artefato} (${est.arquivo})\n${est.corpo.trim()}`);
  for (const d of artefatos(m, 'dec')) out.push(`\n## ${d.arquivo}\n${d.corpo.trim()}`);

  const pl = planoEmVigor(m);
  if (pl) out.push(`\n## Plano de entregas (${pl.arquivo})\n${pl.corpo.trim()}`);

  for (const [titulo, arq] of [['Cronologia', 'cronologia.md'], ['Andamento processual', 'autos.md']]) {
    const caminho = join(m.dir, 'docs/canon', arq);
    if (existsSync(caminho)) out.push(`\n## ${titulo}\n${readFileSync(caminho, 'utf8').trim()}`);
  }

  out.push('\n## Canon — partes');
  for (const p of cn.partes) out.push(`- ${p.nome}${p.apelidos.length ? ` (${p.apelidos.join(', ')})` : ''} [${p.fm.papel || '?'}]: ${(p.fm.resumo || '').slice(0, 200)}`);
  out.push('\n## Canon — documentos');
  for (const d of cn.documentos) out.push(`- ${d.id || '?'} ${d.nome}${d.fm.prova ? ` — prova: ${d.fm.prova}` : ''}${d.fm.fls ? ` (fls. ${d.fm.fls})` : ''}`);

  // Razao de levantado e pago: e o estado mais caro de reconstruir lendo as
  // pecas, e o mais barato de imprimir aqui.
  const pend = pendencias(m);
  if (pend.length) {
    const todos = es.flatMap((x) => x.topicos);
    const levantadas = new Set(todos.flatMap((t) => lista(t[m.voc.pendencias])));
    const pagas = new Set(todos.flatMap((t) => lista(t[m.voc.paga])));
    out.push(`\n## ${m.voc.pendencias}`);
    for (const x of pend) {
      const e = pagas.has(x.id) ? m.voc.paga : levantadas.has(x.id) ? `levantado, nao ${m.voc.paga}` : 'nao levantado';
      out.push(`- ${x.id} [${e}] ${x.texto}`);
    }
  }
  const peds = pedidosDa(m);
  if (peds.length) {
    const sust = new Set(es.flatMap((x) => x.topicos).flatMap((t) => lista(t.pedidos)));
    out.push('\n## Pedidos');
    for (const x of peds) out.push(`- ${x.id} [${sust.has(x.id) ? 'sustentado' : 'sem topico'}] ${x.texto}`);
  }

  out.push('\n## Kanban de entregas');
  for (const e of es) {
    const p = prazoDe(e, ctx);
    const prazo = p && !p.erro
      ? ` — prazo ${p.fim} [${p.regime}]${e.estado === 'entregue' ? '' : ` (${p.restam}d uteis)`}${p.fatal ? ' FATAL' : ''}`
        + (p.divergencia ? ` (art. 210 par. unico tem outra leitura: ${p.fimAlternativo})` : '')
      : '';
    out.push(`- [${e.estado}] ${String(e.numero).padStart(2, '0')} ${e.fm.titulo || e.arquivo} — ${e.topicos.length} ${m.voc.topico}s, ${e.palavras} palavras${prazo}`);
  }
  out.push(`\nArquivos: ${es.map((x) => rel(m.dir, x.caminho)).join(', ') || '(nenhum)'}`);
  console.log(out.join('\n'));
}
