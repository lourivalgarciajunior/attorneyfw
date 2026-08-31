/**
 * Prognostico por semaforo.
 *
 * **Esta ferramenta nao produz probabilidade de exito em porcentagem, e nao vai
 * produzir.** Nao e limitacao a ser removida quando houver dados melhores: e
 * recusa, na mesma familia de nao assinar, nao aprovar e nao protocolar.
 *
 * O motivo tem tres camadas. A primeira e de unidade: forca de argumento, risco
 * processual e frequencia historica nao estao na mesma escala e nao se somam; a
 * media delas e um numero com precisao aparente e sem referente. A segunda e de
 * uso: aquele numero nao fica na tela — sai dela e vai para conversa com
 * cliente, onde ninguem pergunta como foi calculado. A terceira e profissional:
 * numero de probabilidade dado a cliente opera como promessa de resultado, e a
 * ferramenta nao deve empurrar seu usuario para la.
 *
 * O que ela faz e o que responde a mesma pergunta sem fingir precisao: verde,
 * amarelo ou vermelho, seguido das razoes — e **cada razao aponta o artefato de
 * onde saiu**. Quem discorda ataca a razao, e a razao tem endereco.
 *
 * Os criterios nao sao novos. Sao os que o gate ja cobra, lidos em conjunto:
 * fato provado, risco mitigado, pedido sustentado, fundamento conferido, prazo
 * em dia, teto e piso declarados. Nao ha peso arbitrario a calibrar porque nao
 * ha nota a compor.
 */
import {
  ESTADOS_ATIVOS, acharEscritorio, c, contextoPrazo, entregas, estrategia,
  exigirMateria, lista, pedidos as pedidosDa, pendencias, prazoDe, valor,
} from './core.mjs';
import { amostra } from './jurisprudencia.mjs';

const VERMELHO = 'vermelho';
const AMARELO = 'amarelo';
const VERDE = 'verde';

/** Secao do artefato de estrategia, pelo titulo. */
function secao(est, re) {
  if (!est) return '';
  return est.corpo.split(/^## /m).find((s) => re.test(s)) || '';
}

export function prognostico(args) {
  const m = exigirMateria(args);
  const raiz = acharEscritorio();
  const est = estrategia(m);
  const es = entregas(m);
  const ctx = contextoPrazo(raiz);
  const topicos = es.flatMap((e) => e.topicos);

  const impeditivos = [];
  const reservas = [];

  // ---- a cadeia existe
  if (!est) impeditivos.push({ razao: `sem ${m.voc.artefato}`, onde: `docs/${m.voc.dirArtefato}/` });

  // ---- pendencia levantada e nao paga (fato sem prova / risco sem mitigacao)
  const pend = pendencias(m);
  const pagas = new Set(topicos.flatMap((t) => lista(t[m.voc.paga])));
  const naoPagas = pend.filter((x) => !pagas.has(x.id));
  if (!pend.length && est) {
    reservas.push({ razao: `nenhum ${m.voc.pendencia} numerado`, onde: `${m.voc.artefato}, secao ${m.tipo === 'contencioso' ? 'Fatos' : 'Riscos'}` });
  }
  for (const x of naoPagas) {
    impeditivos.push({ razao: `${x.id} sem ${m.voc.paga} — ${x.texto.slice(0, 60)}`, onde: `${m.voc.artefato}` });
  }

  // ---- pedido sem topico que o sustente
  const sustentados = new Set(topicos.flatMap((t) => lista(t.pedidos)));
  for (const p of pedidosDa(m).filter((x) => !sustentados.has(x.id))) {
    impeditivos.push({ razao: `${p.id} sem topico que o sustente — ${p.texto.slice(0, 60)}`, onde: 'tese, secao Pedidos' });
  }

  // ---- prazo vencido com entrega em aberto
  for (const e of es.filter((x) => ESTADOS_ATIVOS.includes(x.estado) && x.estado !== 'entregue')) {
    const p = prazoDe(e, ctx);
    if (p && !p.erro && p.vencido) {
      impeditivos.push({ razao: `prazo vencido em ${p.fim} com entrega em aberto`, onde: `entregas/${e.estado}/${e.arquivo}` });
    }
  }

  // ---- citacao nao conferida
  for (const e of es) {
    if (/CONFERIR NA FONTE/i.test(e.corpo)) {
      reservas.push({ razao: 'ha citacao marcada como nao conferida na fonte', onde: `entregas/${e.estado}/${e.arquivo}` });
    }
  }

  // ---- julgado contrario nao distinguido, e amostra nao lida
  const { julgados } = amostra(m);
  const contrarios = julgados.filter((j) => j.lido && j.resultado === 'contrario');
  const naoLidos = julgados.filter((j) => !j.lido);
  for (const j of contrarios) {
    impeditivos.push({ razao: `julgado contrario nao distinguido: ${j.julgado}`, onde: `${m.voc.artefato}, amostra jurisprudencial` });
  }
  if (naoLidos.length) {
    reservas.push({ razao: `${naoLidos.length} julgado(s) da amostra ainda nao lidos no inteiro teor`, onde: `${m.voc.artefato}, amostra jurisprudencial` });
  }
  if (est && !julgados.length) {
    reservas.push({ razao: 'nenhum julgado na amostra', onde: `${m.voc.artefato}, amostra jurisprudencial` });
  }

  // ---- topico sem contra-argumento previsto
  for (const t of topicos.filter((x) => !valor(x.risco) || !valor(x.resposta))) {
    reservas.push({ razao: `${m.voc.topico} ${t.id || '?'} sem risco ou resposta declarados`, onde: 'contrato de topico' });
  }

  // ---- teto, piso e escopo negativo
  if (est) {
    for (const [titulo, re] of [['teto e piso', /^Teto e piso/i], ['escopo negativo', /^Escopo negativo/i]]) {
      const sec = secao(est, re);
      if (!sec) continue;
      const texto = sec.split('\n').slice(1).join('\n');
      // O template vem com a instrucao ja escrita; o que interessa e se alguem
      // acrescentou alguma coisa a ela.
      if (texto.replace(/\s/g, '').length < 120) {
        reservas.push({ razao: `${titulo} nao preenchido`, onde: `${m.voc.artefato}` });
      }
    }
  }

  const luz = impeditivos.length ? VERMELHO : reservas.length ? AMARELO : VERDE;

  if (args.json) {
    console.log(JSON.stringify({
      semaforo: luz,
      impeditivos,
      reservas,
      // Declarado no proprio payload para que nenhum consumidor derive um
      // percentual a partir das contagens e o apresente como se fosse nosso.
      probabilidadeDeExito: null,
      nota: 'esta ferramenta nao produz probabilidade de exito em porcentagem; ver ADR',
    }, null, 2));
    return impeditivos.length ? 1 : 0;
  }

  const pinta = luz === VERMELHO ? c.red : luz === AMARELO ? c.yellow : c.green;
  console.log(c.b(`prognostico — ${valor(m.cfg.titulo) || m.slug}`));
  console.log(`\n  ${pinta(`### ${luz.toUpperCase()} ###`)}\n`);

  if (impeditivos.length) {
    console.log(c.red('  impeditivo — resolva antes de protocolar'));
    for (const x of impeditivos) console.log(`    ${x.razao}\n      ${c.dim(x.onde)}`);
    console.log('');
  }
  if (reservas.length) {
    console.log(c.yellow('  reserva — nao impede, mas enfraquece'));
    for (const x of reservas) console.log(`    ${x.razao}\n      ${c.dim(x.onde)}`);
    console.log('');
  }
  if (luz === VERDE) {
    console.log(c.dim('  Nenhum impeditivo e nenhuma reserva nos criterios que o gate cobre.'));
    console.log(c.dim('  Isso nao e prognostico de vitoria: e ausencia de defeito conhecido.\n'));
  }

  console.log(c.dim('  Este semaforo NAO e probabilidade de exito, e a ferramenta nao produz uma.'));
  console.log(c.dim('  Forca de argumento, risco processual e frequencia historica nao estao na'));
  console.log(c.dim('  mesma escala e nao se somam; a media delas teria precisao aparente e nenhum'));
  console.log(c.dim('  referente. O que responde a pergunta do cliente sem fingir precisao esta na'));
  console.log(c.dim(`  ${m.voc.artefato}: teto e piso, matriz de risco e escopo negativo.`));

  return impeditivos.length ? 1 : 0;
}
