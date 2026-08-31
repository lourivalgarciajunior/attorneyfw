/**
 * Costura uma entrega no arquivo que vai para o protocolo ou para o cliente.
 * Le o kanban, monta o enderecamento a partir da materia e do escritorio, e
 * concatena so o texto dos topicos — contrato e comentario nao saem daqui.
 *
 * O cabecalho vem do `materia.yaml` e do `escritorio.yaml` de proposito: peca
 * com numero de processo digitado a mao e o erro que protocola no processo do
 * outro cliente.
 */
import { join } from 'node:path';
import {
  Erro, acharEscritorio, c, contextoPrazo, entregas, escrever, exigirMateria, hoje,
  lerEscritorio, lista, palavras, pedidos as pedidosDa, prazoDe, rel, textoDe,
} from './core.mjs';
import { alvosDe } from './entrega.mjs';

/**
 * O texto final de uma entrega: os topicos costurados, ou o corpo limpo.
 *
 * Topico sem redacao sai com carimbo, nao com o cabecalho sozinho. Um `## II`
 * seguido de nada tem a mesma cara de um topico curto, e o que sai da bancada
 * incompleto e o que se protocola sem perceber.
 */
export function textoFinal(e) {
  if (!e.topicos.length) return textoDe(e.corpo).trim();
  return e.topicos
    .map((t, i) => {
      const cabeca = t.sustenta ? `## ${romano(i + 1)} — ${t.sustenta}` : `## ${romano(i + 1)}`;
      const corpo = t.texto || '> [SEM REDACAO — NAO PROTOCOLAR]';
      return `${cabeca}\n\n${corpo}`.trim();
    })
    .join('\n\n');
}

const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
const romano = (n) => ROMANOS[n - 1] || String(n);

export function build(args) {
  const m = exigirMateria(args);
  const raiz = acharEscritorio();
  const esc = lerEscritorio(raiz);
  const pedido = args._[0];
  if (!pedido) {
    const abertas = entregas(m).filter((x) => ['minuta', 'revisao'].includes(x.estado));
    throw new Erro(`Uso: attorneyfw build <entrega>\n`
      + `       em minuta ou revisao: ${abertas.map((x) => `${x.numero} (${x.fm.titulo || x.arquivo})`).join(', ') || '(nenhuma)'}`);
  }

  const [e] = alvosDe(entregas(m), pedido);
  const ctx = contextoPrazo(raiz);
  const p = prazoDe(e, ctx);
  const partes = [];

  // ---- enderecamento
  if (m.tipo === 'contencioso') {
    partes.push(`EXCELENTISSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) ${String(m.cfg.juizo || '').toUpperCase()}`);
    partes.push('');
    if (m.cfg.processo) partes.push(`Processo n. ${m.cfg.processo}`);
    partes.push(`${String(m.cfg.cliente || '').toUpperCase()}, ja qualificad${m.cfg.papel === 'autor' ? 'o(a) nos autos' : 'o(a)'}, vem, por seu advogado que esta subscreve, apresentar`);
    partes.push('');
    partes.push(`**${String(e.fm.titulo || '').toUpperCase()}**`);
    partes.push('');
    partes.push(`em face de ${m.cfg.adverso || '(parte adversa)'}, pelas razoes de fato e de direito a seguir expostas.`);
  } else {
    partes.push(`# ${e.fm.titulo || m.cfg.titulo}`);
    partes.push('');
    partes.push(`**Consulente:** ${m.cfg.cliente || '-'}  `);
    partes.push(`**Materia:** ${m.cfg.titulo || m.slug}  `);
    partes.push(`**Data:** ${hoje()}`);
  }
  partes.push('');

  // ---- topicos
  const texto = textoFinal(e);
  partes.push(texto || `> _[entrega ainda sem redacao — ${e.topicos.length} ${m.voc.topico}s planejados]_`);

  // ---- pedidos
  if (m.tipo === 'contencioso') {
    const citados = new Set(e.topicos.flatMap((t) => lista(t.pedidos)));
    const peds = pedidosDa(m).filter((x) => citados.has(x.id));
    if (peds.length) {
      partes.push('');
      partes.push('## DOS PEDIDOS');
      partes.push('');
      partes.push('Ante o exposto, requer:');
      partes.push('');
      peds.forEach((x, i) => partes.push(`${String.fromCharCode(97 + i)}) ${x.texto};`));
    }
    if (m.cfg.valor_causa) {
      partes.push('');
      partes.push(`Da-se a causa o valor de ${m.cfg.valor_causa}.`);
    }
  }

  // ---- fecho
  partes.push('');
  partes.push('Nestes termos,');
  partes.push('pede deferimento.');
  partes.push('');
  partes.push(`${esc.comarca || m.cfg.comarca || '(comarca)'}, ${hoje()}.`);
  partes.push('');
  partes.push(`${esc.advogado || '(advogado)'}`);
  partes.push(`OAB ${esc.oab || '(oab)'}`);

  const alvo = join(m.dir, 'saida', `${e.fm.id || e.arquivo.replace('.md', '')}.md`);
  escrever(alvo, `${partes.join('\n')}\n`);

  const total = palavras(texto);
  console.log(`${c.green('entrega costurada')}  ${rel(raiz, alvo)}`);
  console.log(c.dim(`  ${e.topicos.length} ${m.voc.topico}s | ${total} palavras | estado ${e.estado}${p && !p.erro ? ` | prazo ${p.fim}` : ''}`));
  const semTexto = e.topicos.filter((t) => !t.texto).length;
  if (semTexto) console.log(`  ${c.yellow(`${semTexto} ${m.voc.topico}(s) sem redacao`)} — o arquivo saiu incompleto`);
  if (e.estado !== 'revisao' && e.estado !== 'entregue') {
    console.log(c.dim(`  ${e.estado} ainda nao passou pela revisao — rode \`attorneyfw validate\` antes de protocolar`));
  }
  console.log(c.dim('  versao para protocolo em DOCX: attorneyfw docx ' + e.numero));
}
