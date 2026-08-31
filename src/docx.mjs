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
  const texto = readFileSync(fonte, 'utf8');

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

  const filhos = [];
  for (const bruto of texto.replace(/\r\n/g, '\n').split(/\n{2,}/)) {
    const bloco = bruto.trim();
    if (!bloco) continue;
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
    title: `${e.fm.titulo || e.arquivo} — ${m.cfg.processo || m.slug}`,
    description: `Gerado por attorneyfw em ${hoje()}. Conferir antes de protocolar.`,
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

  const nome = `${String(e.numero).padStart(2, '0')} — ${e.fm.titulo || e.arquivo.replace('.md', '')}.docx`;
  const alvo = join(m.dir, 'saida', nome);
  mkdirSync(join(m.dir, 'saida'), { recursive: true });
  writeFileSync(alvo, await Packer.toBuffer(doc));

  console.log(`${c.green('docx gerado')}  ${rel(raiz, alvo)}`);
  console.log(c.dim(`  ${filhos.length} paragrafos | de ${rel(raiz, fonte)}`));
  console.log(c.dim('  confira antes de protocolar — o CLI monta, quem assina responde'));
}
