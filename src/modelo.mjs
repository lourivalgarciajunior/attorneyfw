/**
 * Modelo por tipo de acao — o checklist de provas do item 10, entregue de um
 * jeito que a ferramenta pode sustentar.
 *
 * Na triagem original a resposta foi que a lista *antes de existir tese* seria
 * conhecimento de tipo de acao, e portanto trabalho de agente. A leitura de oito
 * pecas reais mostrou que isso estava metade certo: o arquivo do escritorio
 * **ja sabe** quais documentos foram juntados em cada tipo de acao, qual
 * fundamento sustentou o pedido e qual objecao apareceu.
 *
 * A diferenca em relacao a um modelo generico nao e de qualidade — e de
 * responsabilidade. Modelo generico e uma afirmacao sobre o direito, feita pela
 * ferramenta, que ninguem conferiu. Modelo destilado do proprio arquivo e uma
 * afirmacao sobre **o que aquele escritorio ja fez**, que o advogado reconhece
 * ou corrige.
 *
 * E ha um risco pratico que decide a questao: checklist generico erra por
 * **excesso**, manda juntar o que o caso nao pede, e o advogado aprende a
 * ignorar a lista. Lista ignorada e pior que lista ausente, porque ocupa o lugar
 * da que seria lida.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  Erro, acharEscritorio, c, canon, entregas, escrever, estrategia, exigirMateria,
  hoje, lista, materias, rel, slug, valor,
} from './core.mjs';

export const dirModelos = (raiz) => join(raiz, 'modelos');
const arquivo = (raiz, tipo) => join(dirModelos(raiz), `${tipo}.yaml`);

/** O que uma materia contribui para o modelo do tipo dela. */
function extrair(m, raiz) {
  const cn = canon(m, raiz);
  const topicos = entregas(m).flatMap((e) => e.topicos);
  return {
    slug: m.slug,
    documentos: cn.documentos
      .map((d) => valor(d.fm.prova) || d.nome)
      .map((x) => x.trim())
      .filter(Boolean),
    fundamentos: [...new Set(topicos.flatMap((t) => lista(t.fundamento)))],
    objecoes: [...new Set(topicos.map((t) => valor(t.risco)).filter(Boolean))],
  };
}

/** Agrupa por texto normalizado, guardando de quais materias veio. */
function consolidar(contribuicoes, campo) {
  const mapa = new Map();
  for (const c1 of contribuicoes) {
    for (const item of c1[campo]) {
      const k = slug(item).slice(0, 50) || item.toLowerCase();
      if (!mapa.has(k)) mapa.set(k, { texto: item, de: [] });
      if (!mapa.get(k).de.includes(c1.slug)) mapa.get(k).de.push(c1.slug);
    }
  }
  return [...mapa.values()].sort((a, b) => b.de.length - a.de.length || a.texto.localeCompare(b.texto));
}

const bloco = (titulo, itens, n) => [
  `${titulo}:`,
  ...(itens.length ? itens.map((i) => {
    // A procedencia sai em cada linha: item apoiado numa materia so nao e regra
    // do escritorio, e uma vez — e quem le precisa poder distinguir.
    const marca = i.de.length === 1 ? '  # visto uma vez so' : '';
    return `  - texto: ${JSON.stringify(i.texto)}\n    em: ${i.de.length}/${n}\n    de: [${i.de.join(', ')}]${marca}`;
  }) : ['  # nenhum']),
  '',
].join('\n');

export function modeloDestilar(args) {
  const raiz = acharEscritorio();
  const tipo = args._[0];
  if (!tipo) throw new Erro('Uso: attorneyfw modelo destilar <tipo-de-acao> --de <slug,slug,...>');
  if (!/^[a-z0-9-]+$/.test(tipo)) throw new Erro(`"${tipo}" nao serve de nome de arquivo — use minusculas e hifens.`);

  const pedidas = String(args.de || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (!pedidas.length) {
    throw new Erro(
      'sem materia de origem, nao ha modelo.\n'
      + '  Use  --de <slug,slug>  com materias que o escritorio ja trabalhou neste tipo.\n'
      + '  Um modelo gerado do nada seria a ferramenta afirmando direito que ninguem\n'
      + '  conferiu. Para o que o arquivo ainda nao tem, use o agente de fundamento\n'
      + '  (attorneyfw:adv-ulpiano), que pesquisa e marca o que precisa ser conferido.',
    );
  }

  const todas = materias(raiz);
  const origem = [];
  for (const s of pedidas) {
    const m = todas.find((x) => x.slug === s);
    if (!m) throw new Erro(`nao ha materia "${s}" na carteira. Rode \`attorneyfw materia list\`.`);
    origem.push(m);
  }

  const contribuicoes = origem.map((m) => extrair(m, raiz));
  const n = contribuicoes.length;
  const docs = consolidar(contribuicoes, 'documentos');
  const fund = consolidar(contribuicoes, 'fundamentos');
  const obj = consolidar(contribuicoes, 'objecoes');

  if (!docs.length && !fund.length && !obj.length) {
    throw new Erro(
      `as materias indicadas nao tem canon de documentos nem contrato de topico preenchido.\n`
      + '  Nao ha o que destilar: o modelo sai do que ja foi feito, e nao de conhecimento geral.',
    );
  }

  const texto = [
    `# Modelo de acao — ${tipo}`,
    `# Destilado por attorneyfw em ${hoje()}, de ${n} materia(s): ${origem.map((m) => m.slug).join(', ')}`,
    '#',
    '# Isto NAO e uma afirmacao sobre o direito. E o registro do que este escritorio',
    '# ja fez neste tipo de acao. Cada linha diz em quantas das materias destiladas',
    '# ela apareceu, e de quais — item visto uma vez so nao e regra do escritorio.',
    '#',
    '# Aplicar este modelo cria itens PENDENTES na materia nova, para alguem',
    '# confirmar ou descartar. Nada e dado por provado ou por fundamentado porque',
    '# o modelo disse: o gate continua cobrando a tese como cobra hoje.',
    '',
    `tipo: ${tipo}`,
    `destilado_em: ${hoje()}`,
    `materias: [${origem.map((m) => m.slug).join(', ')}]`,
    `n: ${n}`,
    '',
    bloco('documentos', docs, n),
    bloco('fundamentos', fund, n),
    bloco('objecoes', obj, n),
  ].join('\n');

  const caminho = arquivo(raiz, tipo);
  escrever(caminho, texto);

  console.log(`${c.green('modelo destilado')}  ${rel(raiz, caminho)}`);
  console.log(c.dim(`  de ${n} materia(s): ${origem.map((m) => m.slug).join(', ')}`));
  console.log(c.dim(`  ${docs.length} documento(s) | ${fund.length} fundamento(s) | ${obj.length} objecao(oes)`));
  const umaVez = [...docs, ...fund, ...obj].filter((i) => i.de.length === 1).length;
  if (umaVez) console.log(c.yellow(`  ${umaVez} item(ns) vistos numa materia so — nao sao regra do escritorio`));
  if (n < 3) console.log(c.dim(`  amostra de ${n}: pouco para destilar. O modelo melhora a cada materia encerrada.`));
}

export function modeloAplicar(args) {
  const m = exigirMateria(args);
  const raiz = acharEscritorio();
  const tipo = args._[0];
  if (!tipo) throw new Erro('Uso: attorneyfw modelo aplicar <tipo-de-acao>');

  const caminho = arquivo(raiz, tipo);
  if (!existsSync(caminho)) {
    throw new Erro(
      `nao ha modelo "${tipo}" na carteira.\n`
      + `  Destile de materias que o escritorio ja trabalhou:\n`
      + `    attorneyfw modelo destilar ${tipo} --de <slug,slug>`,
    );
  }
  const bruto = readFileSync(caminho, 'utf8');
  const n = Number((bruto.match(/^n:\s*(\d+)/m) || [])[1] || 0);

  // Le os blocos sem parser de YAML: o formato e raso e conhecido, e o que
  // interessa aqui e o par texto/procedencia.
  const secao = (nome) => {
    const i = bruto.indexOf(`\n${nome}:`);
    if (i < 0) return [];
    const resto = bruto.slice(i + nome.length + 2);
    const fim = resto.search(/\n[a-z_]+:/);
    const corpo = fim < 0 ? resto : resto.slice(0, fim);
    return [...corpo.matchAll(/- texto:\s*(".*?"|\S.*?)\n\s*em:\s*(\S+)\n\s*de:\s*\[([^\]]*)\]/g)]
      .map((x) => ({
        texto: x[1].startsWith('"') ? JSON.parse(x[1]) : x[1].trim(),
        em: x[2],
        de: x[3],
      }));
  };

  const docs = secao('documentos');
  const fund = secao('fundamentos');
  const obj = secao('objecoes');

  const md = [
    '---',
    `modelo: ${tipo}`,
    `aplicado_em: ${hoje()}`,
    'estado: pendente',
    '---',
    '',
    `# Checklist do modelo "${tipo}"`,
    '',
    `Destilado de ${n} materia(s) do proprio escritorio, e **nao** de conhecimento`,
    'geral. Cada linha diz em quantas delas apareceu.',
    '',
    '**Isto e pendencia, e nao verdade.** Nada aqui esta provado, fundamentado nem',
    `dado por necessario — confirme ou descarte item a item. A ${m.voc.artefato} e o`,
    'gate continuam cobrando o que cobram hoje.',
    '',
    '## Documentos que apareceram neste tipo de acao',
    '',
    ...(docs.length ? docs.map((d) => `- [ ] ${d.texto}  _(${d.em} — ${d.de})_`) : ['- _nenhum registrado_']),
    '',
    '## Fundamentos que sustentaram o pedido',
    '',
    ...(fund.length ? fund.map((d) => `- [ ] ${d.texto}  _(${d.em} — ${d.de})_`) : ['- _nenhum registrado_']),
    '',
    '## Objecoes que a outra parte levantou',
    '',
    ...(obj.length ? obj.map((d) => `- [ ] ${d.texto}  _(${d.em} — ${d.de})_`) : ['- _nenhuma registrada_']),
    '',
    '## O que este checklist nao sabe',
    '',
    'Ele nao conhece nada que o escritorio ainda nao fez. Para o que falta, use o',
    'agente de fundamento — e o que ele trouxer entra como citacao a conferir na',
    'fonte, nao como item deste arquivo.',
    '',
  ].join('\n');

  const alvo = join(m.dir, 'docs', `checklist-${tipo}.md`);
  escrever(alvo, md);

  const total = docs.length + fund.length + obj.length;
  console.log(`${c.green('checklist criado')}  ${rel(raiz, alvo)}`);
  console.log(c.dim(`  ${total} item(ns) pendentes, destilados de ${n} materia(s)`));
  console.log(c.yellow('  Sao pendencias, e nao verdades: confirme ou descarte item a item.'));
  console.log(c.dim(`  Nada foi dado por provado — a ${m.voc.artefato} e o gate seguem cobrando o que cobram.`));
}

/**
 * O checklist da materia, reduzido ao que ainda esta em aberto.
 *
 * Item marcado `- [x]` ja foi confirmado ou descartado por quem assina, e
 * relembra-lo no briefing seguinte e a forma mais rapida de ensinar a pular a
 * lista inteira.
 *
 * **Nao escreve nada.** O briefing e leitura: marcar item por conta seria decidir
 * pelo advogado exatamente onde a decisao e dele.
 */
const RE_ABERTO = /^- \[ \] (.+?)(?:\s+_\((.+?)\)_)?[ \t]*$/gm;

export function checklistAberto(m) {
  const dir = join(m.dir, 'docs');
  if (!existsSync(dir)) return null;
  const arqs = readdirSync(dir).filter((f) => /^checklist-.+\.md$/.test(f)).sort();
  if (!arqs.length) return null;

  const blocos = { documentos: [], fundamentos: [], objecoes: [] };
  const tipos = [];
  for (const f of arqs) {
    tipos.push(f.replace(/^checklist-|\.md$/g, ''));
    const bruto = readFileSync(join(dir, f), 'utf8');
    // O bloco e identificado pelo cabecalho que o `modelo aplicar` escreve.
    const seccoes = [
      ['documentos', '## Documentos'],
      ['fundamentos', '## Fundamentos'],
      ['objecoes', '## Objecoes'],
    ];
    for (const [chave, titulo] of seccoes) {
      const i = bruto.indexOf(titulo);
      if (i < 0) continue;
      const resto = bruto.slice(i + titulo.length);
      const fim = resto.indexOf('\n## ');
      RE_ABERTO.lastIndex = 0;
      for (const x of (fim < 0 ? resto : resto.slice(0, fim)).matchAll(RE_ABERTO)) {
        blocos[chave].push({ texto: x[1].trim(), procedencia: (x[2] || '').trim() });
      }
    }
  }
  return { tipos, ...blocos };
}

export function modeloLista() {
  const raiz = acharEscritorio();
  const dir = dirModelos(raiz);
  const nomes = existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith('.yaml')).map((f) => f.slice(0, -5)).sort()
    : [];

  console.log(c.b('modelos de acao na carteira'));
  if (!nomes.length) {
    console.log(c.dim('  nenhum — attorneyfw modelo destilar <tipo> --de <slug,slug>'));
    console.log(c.dim('  O modelo sai do arquivo do escritorio. Sem materia de origem, nao ha modelo.'));
    return;
  }
  for (const nome of nomes) {
    const t = readFileSync(arquivo(raiz, nome), 'utf8');
    const n = (t.match(/^n:\s*(\d+)/m) || [])[1] || '?';
    const de = (t.match(/^materias:\s*\[([^\]]*)\]/m) || [])[1] || '';
    const em = (t.match(/^destilado_em:\s*(\S+)/m) || [])[1] || '?';
    console.log(`  ${c.green(nome.padEnd(28))} n=${String(n).padEnd(3)} ${c.dim(`${em}  ${de}`)}`);
  }
  console.log(c.dim('\n  aplicar numa materia: attorneyfw modelo aplicar <tipo>'));
}
