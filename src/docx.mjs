/**
 * A entrega em DOCX — o arquivo que vai para o peticionamento eletronico ou
 * para a mao do cliente. A4, serifado, espacamento 1,5, sem marcacao de
 * trabalho.
 *
 * `docx` e dependencia opcional: o resto do attorneyfw nao tem dependencia
 * nenhuma, e quem so governa prazo e kanban nao precisa carregar um gerador de
 * OOXML para rodar `status` ou `validate`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { Erro, acharEscritorio, c, entregas, exigirMateria, hoje, lerEscritorio, rel } from './core.mjs';
import { alvosDe } from './entrega.mjs';
import { build } from './build.mjs';

const A4 = { width: 11906, height: 16838 };
const MARGENS = { top: 1701, bottom: 1134, left: 1701, right: 1134 };
const SERIF = 'Times New Roman';
const MARCA = '@@DIAGRAMA_';

/**
 * O renderizador de Mermaid e externo e opcional. Sem ele, a peca sai com um
 * aviso no lugar da figura — e sai. Exportador de imagem faltando nao pode
 * impedir um protocolo, e essa e a razao de este caminho degradar em vez de
 * lancar erro.
 */
async function acharRenderizador() {
  const { spawnSync } = await import('node:child_process');
  for (const cmd of ['mmdc', 'mmdc.cmd']) {
    try {
      const r = spawnSync(cmd, ['--version'], { encoding: 'utf8', timeout: 15000, shell: process.platform === 'win32' });
      if (r.status === 0) return cmd;
    } catch { /* proximo candidato */ }
  }
  return null;
}

/** A figura, ou o aviso de que ela nao pode ser gerada aqui. */
async function paragrafosDoDiagrama(fonte, render, { Paragraph, AlignmentType, run }) {
  const aviso = (t) => new Paragraph({
    spacing: { before: 200, after: 200 }, alignment: AlignmentType.CENTER, indent: { firstLine: 0 },
    children: [run(t, { italics: true, color: '8D392D' })],
  });

  if (!render) {
    return [aviso(
      '[FIGURA NAO RENDERIZADA — instale o mermaid-cli (npm i -g @mermaid-js/mermaid-cli) '
      + 'e gere de novo, ou insira a imagem a mao antes de protocolar]',
    )];
  }

  const { spawnSync } = await import('node:child_process');
  const { tmpdir } = await import('node:os');
  const { mkdtempSync, rmSync } = await import('node:fs');
  const tmp = mkdtempSync(join(tmpdir(), 'attorneyfw-mmd-'));
  try {
    const entrada = join(tmp, 'd.mmd');
    const saidaPng = join(tmp, 'd.png');
    writeFileSync(entrada, `${fonte}\n`, 'utf8');
    const r = spawnSync(render, ['-i', entrada, '-o', saidaPng, '-b', 'white', '-s', '2'], {
      encoding: 'utf8', timeout: 120000, shell: process.platform === 'win32',
    });
    if (r.status !== 0 || !existsSync(saidaPng)) {
      return [aviso(`[FIGURA NAO RENDERIZADA — o mermaid-cli falhou: ${String(r.stderr || r.error?.message || 'sem detalhe').split('\n')[0].slice(0, 120)}]`)];
    }
    const { ImageRun } = await import('docx');
    return [new Paragraph({
      spacing: { before: 240, after: 240 }, alignment: AlignmentType.CENTER, indent: { firstLine: 0 },
      children: [new ImageRun({
        type: 'png', data: readFileSync(saidaPng), transformation: { width: 560, height: 420 },
      })],
    })];
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

async function carregarDocx(raiz) {
  const normalizar = (m) => (m && m.Document ? m : m?.default);
  try {
    const m = normalizar(await import('docx'));
    if (m?.Document) return m;
  } catch { /* tenta o repositorio do escritorio */ }
  try {
    const req = createRequire(pathToFileURL(join(raiz, 'package.json')));
    const m = normalizar(req('docx'));
    if (m?.Document) return m;
  } catch { /* cai na mensagem abaixo */ }
  throw new Erro(
    '`attorneyfw docx` precisa do pacote `docx`, que e uma dependencia opcional.\n'
    + '       Instale na raiz do escritorio:  npm i docx',
  );
}

export async function docx(args) {
  const m = exigirMateria(args);
  const raiz = acharEscritorio();
  const esc = lerEscritorio(raiz);
  const pedido = args._[0];
  if (!pedido) throw new Erro('Uso: attorneyfw docx <entrega>');
  const [e] = alvosDe(entregas(m), pedido);

  // O DOCX nao reimplementa a costura: le o mesmo arquivo que o `build` gera.
  // O gerador copiado do bookfw divergiu do build por reconstruir a selecao
  // sozinho; aqui a fonte e uma so, e a saida do papel e a do markdown.
  const fonte = join(m.dir, 'saida', `${e.fm.id || e.arquivo.replace('.md', '')}.md`);
  if (!existsSync(fonte) || args.recostura) build({ ...args, _: [String(e.numero)] });

  await markdownParaDocx({
    raiz, esc, texto: readFileSync(fonte, 'utf8'),
    titulo: `${e.fm.titulo || e.arquivo} — ${m.cfg.processo || m.slug}`,
    alvo: join(m.dir, 'saida', `${String(e.numero).padStart(2, '0')} — ${e.fm.titulo || e.arquivo.replace('.md', '')}.docx`),
    rodape: rel(raiz, fonte),
  });
}

/**
 * Markdown -> DOCX. E o unico gerador de OOXML da ferramenta, e todos os
 * comandos que produzem papel passam por aqui.
 *
 * A regra que ele existe para sustentar: **nada reconstroi a selecao do texto**.
 * O `docx` le o markdown que o `build` gerou; o relatorio le o markdown que o
 * `relatorio` gerou. Foi um gerador copiado que divergiu do build, no bookfw,
 * e o preco foi quatro livros com a mesma correcao aplicada quatro vezes.
 */
export async function markdownParaDocx({ raiz, esc, texto, titulo, alvo, rodape = '' }) {
  const {
    Document, Packer, Paragraph, TextRun, AlignmentType, Footer, PageNumber, LineRuleType,
  } = await carregarDocx(raiz);

  const run = (t, opts = {}) => new TextRun({ text: t, font: SERIF, size: 24, ...opts });
  const p = (t, opts = {}) => new Paragraph({
    spacing: { after: 200, line: 360, lineRule: LineRuleType.AUTO },
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 709 },
    ...opts,
    children: Array.isArray(t) ? t : [run(t)],
  });

  // Os blocos Mermaid saem do texto antes da divisao em paragrafos: um deles
  // pode conter linha em branco, e o `split` os partiria ao meio. Voltam
  // adiante, como figura ou como aviso.
  const fontes = [];
  const semDiagrama = texto.replace(/\r\n/g, '\n').replace(
    /^```mermaid\n([\s\S]*?)^```[ \t]*$/gm,
    (_, fonte) => `\n\n${MARCA}${fontes.push(fonte.trimEnd()) - 1}@@\n\n`,
  );
  const render = fontes.length ? await acharRenderizador() : null;

  const filhos = [];
  for (const bruto of semDiagrama.split(/\n{2,}/)) {
    const bloco = bruto.trim();
    if (!bloco) continue;

    const marca = bloco.match(new RegExp(`^${MARCA}(\\d+)@@$`));
    if (marca) {
      filhos.push(...await paragrafosDoDiagrama(
        fontes[Number(marca[1])], render, { Paragraph, AlignmentType, run },
      ));
      continue;
    }
    const cab = bloco.match(/^#{1,3}\s+(.*)$/);
    if (cab) {
      filhos.push(new Paragraph({
        spacing: { before: 360, after: 240 }, alignment: AlignmentType.LEFT, indent: { firstLine: 0 },
        children: [run(cab[1].replace(/\*\*/g, ''), { bold: true, allCaps: true })],
      }));
      continue;
    }
    const negrito = bloco.match(/^\*\*(.+)\*\*$/s);
    if (negrito) {
      filhos.push(new Paragraph({
        spacing: { before: 300, after: 300 }, alignment: AlignmentType.CENTER, indent: { firstLine: 0 },
        children: [run(negrito[1].replace(/\n/g, ' '), { bold: true, allCaps: true })],
      }));
      continue;
    }
    // Enderecamento, fecho e assinatura nao levam recuo de primeira linha.
    const semRecuo = /^(EXCELENTISSIMO|Processo n\.|Nestes termos|pede deferimento|OAB )/.test(bloco)
      || /^[a-z]\)\s/.test(bloco) || bloco.split('\n').length === 1 && bloco.length < 60;
    filhos.push(p(bloco.replace(/\*\*/g, '').replace(/\n/g, ' '), semRecuo ? { indent: { firstLine: 0 } } : {}));
  }

  const doc = new Document({
    creator: esc.advogado || 'attorneyfw',
    title: titulo,
    description: `Gerado por attorneyfw em ${hoje()}. Conferir antes de assinar.`,
    sections: [{
      properties: { page: { size: A4, margin: MARGENS } },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT], font: SERIF, size: 18, color: '888888' })],
          })],
        }),
      },
      children: filhos,
    }],
  });

  mkdirSync(join(alvo, '..'), { recursive: true });
  writeFileSync(alvo, await Packer.toBuffer(doc));

  console.log(`${c.green('docx gerado')}  ${rel(raiz, alvo)}`);
  console.log(c.dim(`  ${filhos.length} paragrafos${rodape ? ` | de ${rodape}` : ''}`));
  console.log(c.dim('  confira antes de assinar — o CLI monta, quem assina responde'));
  return alvo;
}
