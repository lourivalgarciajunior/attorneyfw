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
  exigirMateria, lerEscritorio, lista, pedidos as pedidosDa, pendencias, prazoDe, rel, slug,
} from './core.mjs';
import { contarRotulos, vozDoEscritorio } from './estilo.mjs';
import { checklistAberto } from './modelo.mjs';
import { citacoesDe, cobre } from './citacao.mjs';

/**
 * A secao de voz. Ela existe porque a 0.5.0 mediu como o escritorio escreve e
 * guardou o resultado num arquivo que ninguem abria na hora de escrever.
 *
 * E ela nao entra em `## Instrucoes`, de proposito. Um traco que diz `em 6/8`
 * colocado dentro de um pacote de instrucoes deixa de ser descricao no instante
 * em que e lido: quem redige tratara a frequencia como norma, e o resultado e
 * uma peca que imita tique em vez de escrever com a voz da casa. **O card
 * descreve, e nao prescreve** — e nenhum gate cobra aderencia a voz.
 */
function secaoVoz(raiz, voc, anteriores) {
  const l = ['', `## Voz do escritorio — observacao, e nao instrucao`];
  const v = vozDoEscritorio(raiz);

  if (!v) {
    l.push('(sem estilo.yaml — a voz do escritorio nao foi derivada, e o texto vai');
    l.push('sair com a voz do modelo. Derive: attorneyfw estilo --de "peca1.docx,...")');
    return l.join('\n');
  }

  l.push(`Derivada de ${v.n} peca(s) do proprio escritorio em ${v.derivadoEm || '?'}.`);
  l.push('Cada linha diz "assim aparece em N de M". Nenhuma diz "escreva assim".');
  l.push('');
  if (v.amostraFina) {
    l.push(`Amostra de ${v.n} peca(s) — pequena demais para descrever voz. Nenhum traco incluido.`);
  } else if (!v.tracos.length) {
    l.push(`Nenhum traco apareceu em mais da metade das ${v.n} pecas medidas.`);
  } else {
    for (const t of v.tracos) l.push(`- ${t.rotulo} — em ${t.pecas}/${t.de}`);
  }
  if (v.ritmo) l.push(`- ritmo: mediana de ${v.ritmo} palavras por paragrafo`);

  // O que a peca ja fez pesa mais que o que o escritorio costuma fazer: o gate
  // cobra consistencia dentro da peca, e nao a escolha do par.
  const r = contarRotulos(anteriores.join('\n'));
  if (r.requerente && r.autor) {
    l.push(`- rotulo: esta ${voc.entrega} ja usa OS DOIS pares (Requerente ${r.requerente}, Autor/Ré ${r.autor}) — o gate avisa`);
  } else if (r.requerente || r.autor) {
    l.push(`- rotulo: esta ${voc.entrega} ja usa ${r.requerente ? 'Requerente/Requerida' : 'Autor/Ré'} — mantenha`);
  } else if (v.parDominante) {
    l.push(`- rotulo: o escritorio usa ${v.parDominante.par} em ${v.parDominante.pecas}/${v.parDominante.de}`);
  }
  return l.join('\n');
}

/** Comparacao frouxa de texto livre — item de checklist contra o que a materia ja tem. */
const pareceCom = (a, b) => {
  const [x, y] = [slug(a).slice(0, 40), slug(b).slice(0, 40)];
  return Boolean(x && y && (x.includes(y) || y.includes(x)));
};

/**
 * O checklist do tipo de acao, filtrado ao que **falta**.
 *
 * Repetir o que ja esta no contrato duas secoes acima e ruido, e lista repetida
 * e lista pulada — o defeito que o ADR do modelo nomeou: checklist que erra por
 * excesso ensina a ignorar a lista, e lista ignorada e pior que lista ausente.
 * O que serve e a **diferenca**, que e comparacao.
 *
 * Sem checklist, a secao nao aparece: materia que nao precisa de um nao ganha
 * cobranca por nao ter.
 */
function secaoChecklist(m, t, cn) {
  const ck = checklistAberto(m);
  if (!ck) return '';


  const declaradas = lista(t.fundamento).flatMap((f) => citacoesDe(f));
  const fundamentos = ck.fundamentos.filter((i) => {
    const cits = citacoesDe(i.texto);
    if (cits.length) return !cits.some((ci) => declaradas.some((d) => cobre(d, ci)));
    return !lista(t.fundamento).some((f) => pareceCom(i.texto, f));
  });

  const objecoes = ck.objecoes.filter((i) => !pareceCom(i.texto, t.risco || ''));

  const noCanon = cn.documentos.flatMap((d) => [d.nome, ...(d.apelidos || [])]);
  const documentos = ck.documentos.filter((i) => !noCanon.some((x) => pareceCom(i.texto, x)));

  const l = ['', `## O que este tipo de acao (${ck.tipos.join(', ')}) costuma ter, e esta materia ainda nao tem`];
  l.push('Itens ainda abertos do checklist do proprio escritorio, filtrados contra o');
  l.push(`contrato deste ${m.voc.topico} e contra o canon. **Sao pendencias, e nao verdades.**`);
  l.push('');
  const bloco = (titulo, itens) => {
    if (!itens.length) return;
    l.push(`${titulo}:`);
    for (const i of itens) l.push(`- ${i.texto}${i.procedencia ? `  (${i.procedencia})` : ''}`);
  };
  bloco(`fundamentos que o contrato deste ${m.voc.topico} nao declara`, fundamentos);
  bloco('objecoes que o risco declarado nao previu', objecoes);
  bloco('documentos que o canon da materia nao tem', documentos);
  if (!fundamentos.length && !objecoes.length && !documentos.length) {
    l.push(`(nada em aberto que este ${m.voc.topico} ja nao cubra)`);
  }
  return l.join('\n');
}

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

${secaoVoz(raiz, m.voc, anteriores)}
${secaoChecklist(m, t, cn)}

## Instrucoes
- Escreva apenas ESTE ${m.voc.topico}, texto corrido, sem cabecalho de peca.
- O ${m.voc.topico} tem de sustentar exatamente o que o contrato declara — nada alem.
- Todo ${m.voc.pendencia} citado precisa aparecer no texto amarrado ao ${m.voc.lastro} declarado.
- Nao invente fato, data, valor nem documento: se faltar, escreva e liste a pendencia ao final.
- Nao cite dispositivo, sumula ou precedente que nao esteja em fundamento. Se precisar de outro, liste como pendencia — quem assina confere.
- Responda ao risco declarado antes que a parte contraria o levante.
- Nao force traco de estilo. A secao de voz e observacao, e nao instrucao: ela diz como o escritorio escreve, e nao como voce deve escrever. Nenhum gate cobra aderencia a voz.
- Nao afirme item da lista. Sao pendencias do arquivo do escritorio, e nada ali esta provado nesta materia.
- Se um item da lista importa para este ${m.voc.topico} e nao esta provado, escreva a pendencia ao final — nao o escreva como fato.
- Nao encerre a ${m.voc.entrega} se ela continua.

${est ? `## ${m.voc.artefato.charAt(0).toUpperCase() + m.voc.artefato.slice(1)} em vigor (${est.arquivo})\n${est.corpo.trim()}` : `(sem ${m.voc.artefato} — o briefing esta cego)`}`);
}
