/**
 * `attorneyfw importar` — a porta de entrada.
 *
 * A 0.4.0 decidiu que o modelo de acao sai das materias que o escritorio ja
 * trabalhou. Ao encostar isso na realidade aparece o problema: **um escritorio
 * com quinhentas pecas no disco tem zero materias na carteira**. O arquivo
 * existe, o conhecimento existe, e a ferramenta comeca vazia. Ninguem redigita.
 *
 * Este comando resolve isso e carrega o risco de resolve-lo: parsing de peca
 * alheia erra. Por isso ele **assiste, e nao preenche** (ver ADR):
 *
 * 1. Produz um **relatorio de pendencias**, e nao uma materia pronta. Tudo em
 *    `- [ ]`, para uma pessoa confirmar ou descartar item a item.
 * 2. **Nada entra na tese, no plano nem no contrato de topico.** Peca importada
 *    e material bruto; a cadeia continua comecando pela DEC.
 * 3. O que e mecanico entra **classificado por confianca**, e o que so a leitura
 *    resolve sai numa secao fixa — *"o que esta importacao NAO extraiu"*.
 *    Silencio sobre o que faltou seria a importacao se apresentando como
 *    completa.
 *
 * E a terceira vez que esta forma e recusada, depois do modelo de acao e da
 * amostra jurisprudencial — e a mais tentadora das tres, porque o resultado
 * pareceria trabalho pronto.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import {
  Erro, acharEscritorio, c, escrever, exigirMateria, hoje, rel, slug,
} from './core.mjs';
import { tipoDocumento } from './parte.mjs';
import { achar } from './dados.mjs';

// ------------------------------------------------------------- leitura docx

/**
 * Texto de um `.docx`, sem dependencia nenhuma.
 *
 * O pacote e um zip e o corpo esta em `word/document.xml`, com deflate cru — que
 * o `inflateRawSync` do proprio node resolve. Trazer uma biblioteca de zip para
 * abrir uma entrada seria dependencia de runtime, e o projeto tem zero.
 */
export function textoDoDocx(buf) {
  const ALVO = 'word/document.xml';
  const ASSINATURA_LOCAL = 0x04034b50;

  for (let i = 0; i < buf.length - 30; i++) {
    if (buf.readUInt32LE(i) !== ASSINATURA_LOCAL) continue;
    const metodo = buf.readUInt16LE(i + 8);
    const comprimido = buf.readUInt32LE(i + 18);
    const nomeLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    const nome = buf.toString('utf8', i + 30, i + 30 + nomeLen);
    const inicio = i + 30 + nomeLen + extraLen;
    if (nome !== ALVO) continue;

    // Tamanho zero no cabecalho local quer dizer que ele so existe no descritor,
    // depois dos dados. Nesse caso vai-se ate a assinatura do descritor.
    let fim = comprimido || buf.indexOf(Buffer.from([0x50, 0x4b, 0x07, 0x08]), inicio);
    fim = comprimido ? inicio + comprimido : (fim < 0 ? buf.length : fim);

    const bruto = buf.subarray(inicio, fim);
    const xml = metodo === 0 ? bruto.toString('utf8') : inflateRawSync(bruto).toString('utf8');
    return paragrafos(xml);
  }
  throw new Erro('nao achei word/document.xml — o arquivo nao parece um .docx');
}

/** `<w:p>` vira uma linha. `<w:delText>` — texto excluido — fica de fora. */
function paragrafos(xml) {
  return (xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [])
    .map((p) => (p.match(/<w:t[^>]*>[\s\S]*?<\/w:t>/g) || [])
      .map((t) => t.replace(/<[^>]+>/g, ''))
      .join('')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim())
    .join('\n');
}

// ---------------------------------------------------------------- extracao

const RE_DATA = /\b(\d{2})[./-](\d{2})[./-](\d{4})\b/g;
const RE_VALOR = /R\$\s*R?\$?\s*([\d.]+,\d{2})/g;
// O ponto entra no trecho: valor em portugues tem ponto de milhar, e exigir
// texto sem ponto antes de "conforme" descartava justamente as frases que
// citam documento junto de valor — as mais uteis.
const RE_ANEXO = /([^;\n]{12,110}?)\b(?:conforme|consoante|segundo)\b[^;\n]{0,80}?\banexos?\b/gi;
const RE_ENDERECAMENTO = /^(?:EXCELENT[ÍI]SSIM[OA]|AO\s+JU[ÍI]ZO|MERIT[ÍI]SSIM[OA])[^\n]{10,200}$/im;

/** Forma de CPF e de CNPJ, para achar tambem o que **nao** fecha o digito. */
const RE_DOC_FORMA = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g;

/**
 * Nome da parte: maiuscula antes da qualificacao.
 *
 * **Sem `i`**, de proposito. Com a flag, `[A-ZÀ-Ú]` passa a casar minuscula e o
 * padrao pega "solteiro", "casada" e o resto da qualificacao como se fosse nome.
 *
 * Entre o nome e a virgula cabe um parentese com o nome fantasia — foi por nao
 * prever isso que a primeira versao perdeu **todas** as partes da peca de marca.
 *
 * E `[ \t]`, e nao `\s`: com `\s` o padrao atravessa a quebra de linha, comeca no
 * enderecamento em caixa alta da linha de cima e vai ate a qualificacao da
 * primeira parte — que entao e descartada inteira pelo filtro, junto com o
 * cabecalho. O efeito era perder **a primeira parte de cada peca**, em silencio.
 */
const RE_NOME = /\b([A-ZÀ-Ú][A-ZÀ-Ú0-9&./ \t-]{6,70}?)[ \t]*(?:\([^)]{2,40}\))?[ \t]*,[ \t]*(?:brasileir|pessoa\s+jur|jur[íi]dica|sociedade|empres)/g;

const item = (valor, confianca, nota = '') => ({ valor, confianca, nota });

function extrair(texto) {
  const achado = {
    enderecamento: [], documentos: [], nomes: [], datas: [], valores: [], anexos: [],
  };

  const end = texto.match(RE_ENDERECAMENTO);
  if (end) achado.enderecamento.push(item(end[0].trim().replace(/\s+/g, ' '), 'alta'));

  // O reconhecedor e o mesmo do `attorneyfw dados`, e nao uma segunda
  // implementacao: a primeira versao deste comando tinha um regex proprio que
  // nao casava CPF nenhum, e o defeito so apareceu rodando contra peca de
  // verdade. Duas implementacoes do mesmo reconhecimento divergem sempre.
  //
  // Aqui, porem, o invalido interessa — e o `achar` so devolve o que fecha o
  // digito. Entao a varredura de invalidos e feita a parte, sobre a mesma forma.
  const vistos = new Set();
  for (const d of achar(texto).filter((x) => x.tipo === 'CPF' || x.tipo === 'CNPJ')) {
    vistos.add(d.valor.replace(/\D/g, ''));
    achado.documentos.push(item(d.valor, 'alta', d.tipo));
  }
  for (const m of texto.matchAll(RE_DOC_FORMA)) {
    const so = m[0].replace(/\D/g, '');
    if (vistos.has(so) || tipoDocumento(m[0])) continue;
    vistos.add(so);
    achado.documentos.push(item(m[0], 'alta', 'DIGITO VERIFICADOR NAO FECHA — confira antes de usar'));
  }

  const nomes = new Set();
  for (const m of texto.matchAll(RE_NOME)) {
    const n = m[1].replace(/\s+/g, ' ').trim().replace(/[,.]$/, '');
    if (n.length > 6 && !/JU[ÍI]ZO|VARA|COMARCA|EXCELENT|ESTADO DE/i.test(n)) nomes.add(n);
  }
  for (const n of [...nomes].slice(0, 20)) {
    // Erra nos dois sentidos, e o relatorio precisa dizer os dois: pega
    // cabecalho e nome de advogado, e **perde** parte cuja qualificacao esteja
    // escrita de um jeito que a regra nao preve. Medido no corpus: numa das
    // pecas a autora nao foi extraida e a re foi.
    achado.nomes.push(item(n, 'media', 'pode pegar cabecalho, e pode faltar parte'));
  }

  const datas = new Set();
  for (const m of texto.matchAll(RE_DATA)) {
    const [, d, mo, a] = m;
    if (Number(mo) > 12 || Number(mo) < 1 || Number(d) > 31 || Number(d) < 1) continue;
    datas.add(`${a}-${mo}-${d}`);
  }
  // Data e alta na forma e NENHUMA no significado: nao se sabe se marca fato,
  // vencimento, protocolo ou nascimento.
  for (const d of [...datas].sort()) achado.datas.push(item(d, 'forma', 'o que ela marca nao foi extraido'));

  const valores = new Set();
  for (const m of texto.matchAll(RE_VALOR)) valores.add(m[1]);
  for (const v of [...valores]) achado.valores.push(item(`R$ ${v}`, 'forma', 'o papel que exerce nao foi extraido'));

  // O trecho util e a frase **inteira**, e nao so o que vem antes de "conforme":
  // e depois dela que o documento e nomeado — "conforme fatura anexo".
  const anexos = new Set();
  for (const m of texto.matchAll(RE_ANEXO)) {
    const t = m[0].replace(/\s+/g, ' ').trim();
    if (t.length > 10) anexos.add(t.slice(0, 140));
  }
  for (const a of [...anexos].slice(0, 40)) {
    achado.anexos.push(item(a, 'media', 'aponta prova; nao diz qual documento'));
  }

  return achado;
}

// --------------------------------------------------------------- relatorio

const cx = (i) => `- [ ] ${i.valor}${i.nota ? `  _(${i.nota})_` : ''}`;

function relatorio(origem, achado, texto) {
  const l = [];
  const secao = (titulo, itens, vazio) => {
    l.push(`## ${titulo}`, '');
    l.push(...(itens.length ? itens.map(cx) : [`- _${vazio}_`]));
    l.push('');
  };

  l.push('---', `origem: ${origem}`, `importado_em: ${hoje()}`, 'estado: pendente', '---', '');
  l.push(`# Importacao de ${origem}`, '');
  l.push('**Tudo aqui e pendencia, e nao verdade.** A importacao le o que sai por regra');
  l.push('mecanica; ela nao le a peca. Confirme ou descarte item a item.');
  l.push('');
  l.push('Nada disto entrou na tese, no plano ou em contrato de topico, e o gate continua');
  l.push('cobrando exatamente o que cobra.');
  l.push('');
  l.push(`Lidas ${texto.split('\n').length} linhas e ${texto.split(/\s+/).filter(Boolean).length} palavras.`);
  l.push('');

  secao('Enderecamento', achado.enderecamento, 'nao encontrado');
  secao('Documentos das partes — CPF e CNPJ', achado.documentos, 'nenhum com forma reconhecivel');

  l.push('### Fichas sugeridas para a carteira', '');
  if (achado.nomes.length && achado.documentos.length) {
    l.push('Os comandos abaixo **nao foram executados**. A ficha da carteira e a fonte de');
    l.push('todas as pecas seguintes, e nao se cria sem alguem olhar.');
    l.push('');
    l.push('```bash');
    for (const n of achado.nomes.slice(0, 8)) {
      l.push(`attorneyfw parte new "${n.valor.replace(/"/g, "'")}" --documento <o CPF ou CNPJ dele, da lista acima>`);
    }
    l.push('```');
  } else {
    l.push('- _nao ha nome e documento suficientes para sugerir ficha_');
  }
  l.push('');

  secao('Nomes candidatos a parte', achado.nomes, 'nenhum reconhecido');
  secao('Datas', achado.datas, 'nenhuma');
  secao('Valores', achado.valores, 'nenhum');
  secao('Trechos que apontam documento anexo', achado.anexos, 'nenhum');

  // Secao fixa, que nunca some. Sem ela a importacao se apresentaria como
  // completa — e o que ela nao traz e justamente o que sustenta uma peca.
  l.push('## O que esta importacao NAO extraiu', '');
  l.push('Nada disto sai por regra, e nenhuma versao futura deste comando vai tirar:', '');
  l.push('- **qual fato e controvertido**, e qual e incontroverso;');
  l.push('- **qual documento prova o que** — a lista acima diz que ha anexo, e nao qual;');
  l.push('- **qual fundamento sustenta qual pedido**;');
  l.push('- **a tese** — o que se sustenta, e por que se ganha;');
  l.push('- **o papel de cada parte** no processo;');
  l.push('- **o que cada data marca**: fato, vencimento, protocolo ou nascimento.');
  l.push('');
  l.push('E a lista de nomes acima **pode estar incompleta**: ela sai de um padrao de');
  l.push('qualificacao, e parte escrita de outro jeito nao aparece. Confira contra a peca');
  l.push('quantas partes ela realmente tem.');
  l.push('');
  l.push('Isso e leitura, e leitura nao se extrai por regra. Para essa parte o caminho e a');
  l.push('cadeia normal — `attorneyfw dec`, depois a tese —, com os agentes trabalhando a');
  l.push('partir **deste** relatorio e com o advogado junto.');
  l.push('');

  return l.join('\n');
}

// ----------------------------------------------------------------- comando

export const EXTENSOES = ['.docx', '.txt', '.md'];

/** Texto de um arquivo que o projeto sabe ler. Usado tambem pelo `estilo`. */
export function lerTexto(caminho) {
  const ext = extname(caminho).toLowerCase();
  if (ext === '.pdf') {
    throw new Erro(
      `${basename(caminho)}: PDF esta fora do escopo desta versao, e nao ha extracao parcial.
`
      + '  Converta para .docx, ou extraia o texto para .txt.',
    );
  }
  if (!EXTENSOES.includes(ext)) throw new Erro(`nao sei ler "${ext}". Sei ler: ${EXTENSOES.join(', ')}`);
  return ext === '.docx' ? textoDoDocx(readFileSync(caminho)) : readFileSync(caminho, 'utf8');
}

export async function importar(args) {
  const raiz = acharEscritorio();
  const alvo = args._.join(' ').trim();
  if (!alvo) {
    throw new Erro('Uso: attorneyfw importar <arquivo.docx|.txt|.md> [--criar-materia "Cliente — Assunto"] [--materia <slug>]');
  }
  if (!existsSync(alvo) || !statSync(alvo).isFile()) throw new Erro(`nao achei o arquivo ${alvo}`);

  const ext = extname(alvo).toLowerCase();
  if (ext === '.pdf') {
    throw new Erro(
      'PDF esta fora do escopo desta versao, e nao ha extracao parcial.\n'
      + '  Converta para .docx, ou extraia o texto para .txt e importe o resultado.',
    );
  }
  if (!EXTENSOES.includes(ext)) throw new Erro(`nao sei ler "${ext}". Sei ler: ${EXTENSOES.join(', ')}`);

  const texto = ext === '.docx' ? textoDoDocx(readFileSync(alvo)) : readFileSync(alvo, 'utf8');
  if (!texto.trim()) throw new Erro(`${basename(alvo)} nao tem texto extraivel`);

  const achado = extrair(texto);
  const origem = basename(alvo);
  const nome = slug(basename(alvo, ext)).slice(0, 50);

  // A materia so nasce se pedirem, e nasce vazia: pasta e materia.yaml. Sem
  // tese e sem plano — peca importada e material bruto, e nao materia governada.
  let materiaDir = null;
  if (args['criar-materia']) {
    const { materiaNew } = await import('./init.mjs');
    const titulo = typeof args['criar-materia'] === 'string' ? args['criar-materia'] : basename(alvo, ext);
    materiaNew({ _: [titulo], tipo: args.tipo || 'contencioso', slug: nome });
    materiaDir = join(raiz, 'materias', nome);
  } else if (args.materia) {
    materiaDir = exigirMateria(args).dir;
  }

  const destino = join(materiaDir || raiz, 'docs', `importado-${nome}.md`);
  escrever(destino, relatorio(origem, achado, texto));

  const invalidos = achado.documentos.filter((d) => d.nota.includes('NAO FECHA'));
  const total = Object.values(achado).reduce((a, x) => a + x.length, 0);

  console.log(`${c.green('peca importada')}  ${rel(raiz, destino)}`);
  console.log(c.dim(`  de ${origem} — o arquivo de origem nao foi alterado nem movido`));
  console.log(c.dim(`  ${total} item(ns), todos pendentes: ${achado.documentos.length} documento(s), `
    + `${achado.nomes.length} nome(s), ${achado.datas.length} data(s), ${achado.valores.length} valor(es)`));
  for (const d of invalidos) {
    console.log(`  ${c.red('digito nao fecha')}  ${d.valor} — marcado no relatorio`);
  }
  console.log(c.yellow('  Nada entrou na tese, no plano ou em contrato de topico.'));
  console.log(c.dim('  O relatorio tem uma secao dizendo o que a importacao NAO extraiu. Leia-a.'));
}
