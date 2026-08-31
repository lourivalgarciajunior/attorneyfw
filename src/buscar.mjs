/**
 * `attorneyfw buscar` — a memoria institucional do escritorio.
 *
 * Existe porque a carteira ja guardava a experiencia e nao a devolvia. Ha grep,
 * e grep basta para achar uma palavra; nao basta para a pergunta real, que e
 * *"que materias enfrentaram esta tese, e como terminaram?"*. Essa pergunta
 * cruza tese, fundamento e desfecho, e ninguem a faz com tres greps encadeados
 * no meio de um dia de trabalho.
 *
 * Duas decisoes de desenho, ambas no ADR:
 *
 * 1. **Devolve materia, nao linha.** Uma linha solta nao responde; a materia
 *    responde, porque traz junto o tipo, o estado e o desfecho.
 * 2. **Nao varre corpo de minuta.** Minuta contem citacao e transcricao, e
 *    busca por termo juridico casaria com o que foi *citado* em vez do que foi
 *    *sustentado*. Ruido treina a ignorar o resultado, e um resultado ignorado
 *    e pior que nenhum.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ESTADOS_ATIVOS, Erro, RESULTADOS, TIPOS, acharEscritorio, artefatos, c, canon,
  entregas, estrategia, materias, soDigitos, valor,
} from './core.mjs';

const semAcento = (s) => String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Termo que so tem digito e pontuacao de documento vira so os digitos. */
const normalizarTermo = (t) => (/^[\d.\-/\s]+$/.test(t) && soDigitos(t).length >= 11 ? soDigitos(t) : t);

/**
 * O que a busca le, e o rotulo com que cada acerto aparece. A lista e explicita
 * de proposito: "varre a carteira" sem dizer o que varre e uma promessa que o
 * usuario nao consegue conferir.
 */
function fontes(m) {
  const out = [];
  const est = estrategia(m);
  if (est) out.push({ rotulo: m.voc.artefato, arquivo: est.arquivo, texto: est.corpo });
  for (const d of artefatos(m, 'dec')) out.push({ rotulo: 'DEC', arquivo: d.arquivo, texto: d.corpo });
  const crono = join(m.dir, 'docs', 'canon', 'cronologia.md');
  if (existsSync(crono)) out.push({ rotulo: 'cronologia', arquivo: 'cronologia.md', texto: readFileSync(crono, 'utf8') });
  for (const e of entregas(m)) {
    // So o titulo da entrega, nunca o corpo — ver o cabecalho deste arquivo.
    out.push({ rotulo: 'entrega', arquivo: e.arquivo, texto: valor(e.fm.titulo) || e.arquivo });
  }
  // As partes entram pelo nome E pelo documento: "que processos essa empresa
  // tem conosco?" e a pergunta que a carteira ja poderia responder e nao
  // respondia. Documento normalizado, para achar com ou sem pontuacao.
  for (const parte of canon(m, acharEscritorio()).partes) {
    const doc = parte.documento || '';
    out.push({
      rotulo: 'parte',
      arquivo: parte.arquivo,
      texto: [parte.nome, ...parte.apelidos, doc, soDigitos(doc)].filter(Boolean).join(' · '),
    });
  }
  return out;
}

/** O trecho em volta do acerto, numa linha, com o termo marcado. */
function trecho(texto, termo, largura = 96) {
  const alvo = semAcento(texto);
  const i = alvo.indexOf(semAcento(termo));
  if (i < 0) return '';
  const linhaIni = texto.lastIndexOf('\n', i) + 1;
  const linhaFim = texto.indexOf('\n', i);
  const linha = texto.slice(linhaIni, linhaFim < 0 ? texto.length : linhaFim).trim();
  const pos = semAcento(linha).indexOf(semAcento(termo));
  const de = Math.max(0, pos - Math.floor(largura / 3));
  const corte = linha.slice(de, de + largura);
  const marcado = corte.replace(
    new RegExp(termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
    (mm) => c.b(mm),
  );
  return `${de > 0 ? '…' : ''}${marcado}${de + largura < linha.length ? '…' : ''}`;
}

export function buscar(args) {
  const raiz = acharEscritorio();
  const termo = args._.join(' ').trim();
  if (!termo) {
    throw new Erro('Uso: attorneyfw buscar <termo> [--tipo contencioso|consultivo] [--resultado perda]');
  }
  if (args.tipo && !TIPOS.includes(String(args.tipo))) {
    throw new Erro(`--tipo deve ser ${TIPOS.join(' ou ')}.`);
  }
  if (args.resultado && !RESULTADOS.includes(String(args.resultado))) {
    throw new Erro(`--resultado deve ser um de: ${RESULTADOS.join(', ')}.`);
  }

  const todas = materias(raiz)
    .filter((m) => !args.tipo || m.tipo === String(args.tipo))
    .filter((m) => !args.resultado || m.resultado === String(args.resultado));

  const alvo = normalizarTermo(termo);
  const achados = [];
  for (const m of todas) {
    const acertos = fontes(m)
      .map((f) => ({ ...f, tem: semAcento(f.texto).includes(semAcento(alvo)) }))
      .filter((f) => f.tem);
    if (acertos.length) achados.push({ m, acertos });
  }

  if (args.json) {
    console.log(JSON.stringify({
      termo,
      varridos: ['tese ou mapa de risco', 'DEC', 'cronologia', 'titulo de entrega', 'parte (nome e documento)'],
      naoVarrido: 'corpo de minuta',
      materias: achados.map(({ m, acertos }) => ({
        slug: m.slug, titulo: valor(m.cfg.titulo), tipo: m.tipo,
        resultado: m.resultado || null, resultadoEm: valor(m.cfg.resultado_em) || null,
        onde: acertos.map((a) => ({ rotulo: a.rotulo, arquivo: a.arquivo })),
      })),
    }, null, 2));
    return;
  }

  console.log(c.b(`buscar "${termo}"`) + c.dim(`  ${achados.length} de ${todas.length} materia(s)`));
  if (!achados.length) {
    console.log(c.dim('\n  nada. A busca le tese ou mapa, DEC, cronologia e titulo de entrega —'));
    console.log(c.dim('  nao le corpo de minuta, para nao casar com o que foi citado em vez do que foi sustentado.'));
    return;
  }
  console.log('');

  for (const { m, acertos } of achados) {
    const es = entregas(m);
    const abertas = es.filter((x) => ESTADOS_ATIVOS.includes(x.estado) && x.estado !== 'entregue').length;
    const desfecho = m.resultado
      ? `${m.resultado === 'perda' ? c.red(m.resultado) : m.resultado === 'ganho' ? c.green(m.resultado) : c.cyan(m.resultado)}`
        + c.dim(` em ${valor(m.cfg.resultado_em) || '?'}`)
      : c.dim(`em curso, ${abertas} entrega(s) aberta(s)`);

    console.log(`  ${c.b(m.slug)}  ${c.dim(m.tipo)}  ${desfecho}`);
    const nota = valor(m.cfg.resultado_nota);
    if (nota) console.log(c.dim(`    ${nota}`));
    for (const a of acertos) {
      console.log(`    ${c.dim(a.rotulo.padEnd(12))} ${trecho(a.texto, termo)}`);
    }
    console.log('');
  }

  const perdas = achados.filter((x) => x.m.resultado === 'perda').length;
  if (perdas) {
    console.log(c.yellow(`  ${perdas} materia(s) com este termo terminaram em perda.`));
    console.log(c.dim('  Vale conferir o que se alegou la antes de repetir a tese aqui.'));
  }
  console.log(c.dim('  varrido: tese ou mapa, DEC, cronologia, titulo de entrega e parte (nome e documento).'));
  console.log(c.dim('  Corpo de minuta nao entra.'));
}
