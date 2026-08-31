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
  valor as valorDe,
} from './core.mjs';
import { alvosDe } from './entrega.mjs';
import { gerarDiagrama } from './diagrama.mjs';
import { enderecamento, formulas, marcadoresVazios, preencher } from './formulas.mjs';

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

/**
 * A marca do diagrama no corpo do topico:
 *
 *     ```diagrama
 *     linha-do-tempo
 *     ```
 *
 * Bloco cercado, e nao comentario HTML. Comentario nesta ferramenta ja quer
 * dizer outra coisa — nota de trabalho, que o `textoDe` remove justamente para
 * nao vazar para a peca. Marcar diagrama assim seria pedir uma figura que
 * desaparece antes do `build` ver, em silencio. Descoberto no smoke.
 */
const MARCA_DIAGRAMA = /^```diagrama[ \t]*\n[ \t]*([a-z-]+)[ \t]*\n```[ \t]*$/gm;

/**
 * Troca cada marca de diagrama pelo bloco Mermaid correspondente.
 *
 * A marca e explicita de proposito: a peca decide onde a figura entra, e o
 * `build` nao adivinha. Diagrama que se insere sozinho aparece no lugar errado
 * na primeira peca que nao o queria.
 *
 * Se o diagrama nao puder ser gerado — cronologia vazia, canon sem partes —, o
 * `build` **nao para**. Deixa um aviso visivel no lugar da figura e segue: falta
 * de figura nao pode impedir um protocolo, e o aviso no corpo e mais dificil de
 * ignorar do que uma linha no terminal.
 */
/**
 * Um bloco `transcricao D3` vira citacao recuada na peca, assinada com o id do
 * documento.
 *
 * A assinatura fica **visivel**, e nao em comentario: comentario e removido
 * antes de a peca sair, e o `conferir` roda sobre o markdown gerado. Com o id no
 * corpo da citacao, a origem sobrevive ao `build` — e o leitor da peca tambem
 * sabe de qual documento veio o trecho, que e o que uma transcricao deve dizer.
 */
function renderizarTranscricoes(texto) {
  return texto.replace(
    /^```transcricao[ \t]+([A-Za-z0-9-]+)[ \t]*\n([\s\S]*?)^```[ \t]*$/gm,
    (_, id, corpo) => {
      const linhas = corpo.trimEnd().split('\n').map((l) => `> ${l}`.trimEnd());
      return [...linhas, '>', `> _(${id})_`].join('\n');
    },
  );
}

function embutirDiagramas(m, texto) {
  const diagramas = [];
  const avisos = [];
  const saida = texto.replace(MARCA_DIAGRAMA, (_, tipo) => {
    try {
      const { mermaid, avisos: av } = gerarDiagrama(m, tipo);
      diagramas.push(tipo);
      avisos.push(...av.map((a) => `${tipo}: ${a}`));
      return `\`\`\`mermaid\n${mermaid}\n\`\`\``;
    } catch (err) {
      avisos.push(`${tipo}: ${err.message.split('\n')[0]}`);
      return `> **[DIAGRAMA "${tipo}" NAO GERADO — ${err.message.split('\n')[0]}]**`;
    }
  });
  return { texto: saida, diagramas, avisos };
}

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
  // As formulas moram na carteira, e nao aqui: enderecamento muda por
  // escritorio, por comarca e por foro, e o que muda assim nao pode estar
  // compilado. Ver ADR "Formula de peca e dado da carteira".
  const { f: form, semente, origem } = formulas(raiz);
  const campos = {
    juizo: valorDe(m.cfg.juizo),
    comarca: valorDe(m.cfg.comarca) || valorDe(esc.comarca),
    cliente: valorDe(m.cfg.cliente).toUpperCase(),
    adverso: valorDe(m.cfg.adverso),
    processo: valorDe(m.cfg.processo),
    titulo: valorDe(e.fm.titulo).toUpperCase(),
    advogado: valorDe(esc.advogado),
    oab: valorDe(esc.oab),
    hoje: hoje(),
  };

  if (m.tipo === 'contencioso') {
    partes.push(enderecamento(form, valorDe(m.cfg.foro) || 'civel', campos));
    partes.push('');
    if (m.cfg.processo) partes.push(`Processo n. ${campos.processo}`);
    partes.push(preencher(form.qualificacao, campos));
    partes.push('');
    partes.push(`**${campos.titulo}**`);
    partes.push('');
    partes.push(preencher(form.em_face, campos));
  } else {
    partes.push(`# ${e.fm.titulo || m.cfg.titulo}`);
    partes.push('');
    partes.push(`**Consulente:** ${m.cfg.cliente || '-'}  `);
    partes.push(`**Materia:** ${m.cfg.titulo || m.slug}  `);
    partes.push(`**Data:** ${hoje()}`);
  }
  partes.push('');

  // ---- topicos
  const bruto = textoFinal(e);
  const { texto, diagramas, avisos } = embutirDiagramas(m, renderizarTranscricoes(bruto));
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
  partes.push(preencher(form.fecho_primeira, campos));
  partes.push(preencher(form.fecho_segunda, campos));
  partes.push('');
  partes.push(preencher(form.local_e_data, campos));
  partes.push('');
  partes.push(preencher('{advogado}', campos));
  partes.push(preencher('OAB {oab}', campos));

  const alvo = join(m.dir, 'saida', `${e.fm.id || e.arquivo.replace('.md', '')}.md`);
  escrever(alvo, `${partes.join('\n')}\n`);

  const total = palavras(texto);
  console.log(`${c.green('entrega costurada')}  ${rel(raiz, alvo)}`);
  console.log(c.dim(`  ${e.topicos.length} ${m.voc.topico}s | ${total} palavras | estado ${e.estado}${p && !p.erro ? ` | prazo ${p.fim}` : ''}`));
  if (diagramas.length) console.log(c.dim(`  ${diagramas.length} diagrama(s): ${diagramas.join(', ')}`));
  // Uma vez por execucao: quem nao sabe que esta usando a semente acha que a
  // peca ja sai com a cara do escritorio.
  if (semente) {
    console.log(`  ${c.yellow('formulas')}  usando a ${origem} — o enderecamento nao e o do seu escritorio`);
    console.log(c.dim('    substitua formulas.yaml pelas formulas das suas pecas'));
  }
  // Marcador sem valor sai visivel no papel de proposito; aqui ele e contado,
  // para nao depender de alguem reparar.
  const vazios = marcadoresVazios(partes.join('\n'));
  if (vazios.length) {
    console.log(`  ${c.yellow('sem valor')}  ${vazios.map((x) => `{${x}}`).join(', ')} — sai assim no papel`);
  }
  // O aviso do diagrama vai para o terminal E para o corpo da peca. A figura
  // mostra o marco como nao provado; quem monta precisa saber disso antes.
  for (const a of avisos) console.log(`  ${c.yellow('diagrama')}  ${a}`);
  const semTexto = e.topicos.filter((t) => !t.texto).length;
  if (semTexto) console.log(`  ${c.yellow(`${semTexto} ${m.voc.topico}(s) sem redacao`)} — o arquivo saiu incompleto`);
  if (e.estado !== 'revisao' && e.estado !== 'entregue') {
    console.log(c.dim(`  ${e.estado} ainda nao passou pela revisao — rode \`attorneyfw validate\` antes de protocolar`));
  }
  console.log(c.dim('  versao para protocolo em DOCX: attorneyfw docx ' + e.numero));
}
