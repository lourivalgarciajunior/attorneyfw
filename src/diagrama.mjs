/**
 * Visual law: linha do tempo, organograma de partes e mapa fato→prova.
 *
 * O caminho obvio seria pedir ao modelo que desenhasse lendo a minuta. Ele
 * funciona na demonstracao e falha na terceira versao da peca, quando se
 * corrige uma data no corpo e a figura continua com a antiga. Divergencia e
 * pior que ausencia: a figura tem autoridade visual, o leitor confia nela mais
 * do que no paragrafo, e e a contraparte quem encontra a contradicao.
 *
 * Por isso **diagrama aqui e projecao de dado estruturado**, nunca de texto
 * livre. As tres fontes ja sao obrigatorias por outro motivo — cronologia,
 * canon de partes e canon de documentos —, e a figura nao pode divergir da peca
 * porque as duas leem o mesmo lugar. Ver ADR "Visual law deriva do canon".
 *
 * Consequencia aceita: nao se desenha qualquer coisa. Fluxograma de rito, por
 * exemplo, fica de fora ate existir dado estruturado que o sustente. E
 * limitacao deliberada, nao esquecimento.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  Erro, acharEscritorio, c, canon, entregas, escrever, estrategia, exigirMateria,
  lista, pendencias, rel, valor,
} from './core.mjs';

export const TIPOS_DIAGRAMA = ['linha-do-tempo', 'partes', 'fato-prova'];

/** Rotulo de no em Mermaid. Aspas e colchete quebram o parser; `#` vira entidade. */
function rot(s, max = 64) {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  const curto = t.length > max ? `${t.slice(0, max - 1)}…` : t;
  return curto
    .replace(/#/g, '#35;')
    .replace(/"/g, '#quot;')
    .replace(/[[\]{}()]/g, ' ')
    .replace(/\|/g, '/');
}

/**
 * Le uma tabela markdown por NOME de coluna, nao por posicao — escritorio troca
 * a ordem das colunas sem avisar, e leitura posicional quebraria calada. Mesma
 * regra que o `linhasDoPlano` ja aplica ao plano de entregas.
 */
function tabela(corpo, alias) {
  const linhas = corpo.replace(/\r\n/g, '\n').split('\n');
  const iCab = linhas.findIndex((l, i) => /^\|/.test(l.trim()) && /^\|[\s|:-]*\|?$/.test((linhas[i + 1] || '').trim()));
  if (iCab < 0) return [];
  const celulas = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((x) => x.trim());
  const cab = celulas(linhas[iCab]).map((h) => h.toLowerCase());
  const idx = {};
  for (const [chave, nomes] of Object.entries(alias)) {
    idx[chave] = cab.findIndex((h) => nomes.some((n) => h.includes(n)));
  }
  const out = [];
  for (let i = iCab + 2; i < linhas.length; i++) {
    const l = linhas[i].trim();
    if (!/^\|/.test(l)) break;
    const cs = celulas(l);
    const reg = {};
    for (const k of Object.keys(alias)) reg[k] = idx[k] >= 0 ? (cs[idx[k]] || '') : '';
    if (Object.values(reg).some((v) => v)) out.push(reg);
  }
  return out;
}

const NAO_PROVADO = 'NAO PROVADO';

// ------------------------------------------------------------ linha do tempo

/**
 * Cada marco carrega o documento que o prova, e marco sem documento sai
 * **visivelmente** marcado. Nao e enfeite: e a mesma exigencia que o gate faz
 * ao texto, aplicada a figura. Marco nao provado saindo igual aos outros seria
 * a figura mentindo com mais autoridade que o paragrafo.
 */
function linhaDoTempo(m) {
  const arq = join(m.dir, 'docs', 'canon', 'cronologia.md');
  if (!existsSync(arq)) throw new Erro('sem docs/canon/cronologia.md — a linha do tempo sai dela, e nao da minuta');
  const cn = canon(m, acharEscritorio());
  const idsDoc = new Set(cn.documentos.map((d) => String(d.id).toLowerCase()).filter(Boolean));
  const nomesDoc = new Map(cn.documentos.map((d) => [String(d.nome).toLowerCase(), d.id]));

  const marcos = tabela(readFileSync(arq, 'utf8'), {
    data: ['data'], fato: ['fato', 'evento'], documento: ['documento', 'prova'], fonte: ['fonte'],
  }).filter((x) => x.data && x.fato);

  if (!marcos.length) {
    throw new Erro(
      'a tabela de docs/canon/cronologia.md esta vazia.\n'
      + '  O marco que nao esta na cronologia nao entra na figura — acrescente-o la,\n'
      + '  que e onde o gate ja o cobra, e nao no desenho.',
    );
  }

  const linhas = ['flowchart TD'];
  const semDoc = [];
  marcos.forEach((x, i) => {
    const cru = String(x.documento || '').trim();
    const id = idsDoc.has(cru.toLowerCase()) ? cru : (nomesDoc.get(cru.toLowerCase()) || '');
    const provado = Boolean(id);
    if (!provado) semDoc.push(x);
    const selo = provado ? id : (cru ? `${cru} — fora do canon` : NAO_PROVADO);
    linhas.push(`  M${i}["${rot(x.data, 12)}<br/>${rot(x.fato, 72)}<br/><i>${rot(selo, 40)}</i>"]`);
    if (i) linhas.push(`  M${i - 1} --> M${i}`);
    linhas.push(`  class M${i} ${provado ? 'provado' : 'pendente'}`);
  });
  linhas.push('  classDef provado fill:#eef4ee,stroke:#2c5f4f,stroke-width:1px');
  linhas.push('  classDef pendente fill:#fdf0ee,stroke:#8d392d,stroke-width:2px,stroke-dasharray: 5 3');

  return { mermaid: linhas.join('\n'), avisos: semDoc.map((x) => `${x.data} "${x.fato}" sem documento no canon`) };
}

// ------------------------------------------------------------------- partes

function organograma(m) {
  const cn = canon(m, acharEscritorio());
  if (!cn.partes.length) {
    throw new Erro('canon de partes vazio — attorneyfw canon new parte "Nome" --papel autor');
  }
  const linhas = ['flowchart TD'];
  const centro = m.cfg.processo ? `Processo ${m.cfg.processo}` : (valor(m.cfg.titulo) || m.slug);
  linhas.push(`  P0(["${rot(centro, 56)}"])`);
  cn.partes.forEach((p, i) => {
    const papel = valor(p.fm.papel) || 'papel nao declarado';
    // Com `ref`, o nome sai da ficha da carteira: a figura nao pode grafar a
    // parte de um jeito e a peca de outro.
    const doc = p.documento ? `<br/><i>${rot(p.documento, 24)}</i>` : '';
    const apel = p.apelidos.length ? `<br/><i>${rot(p.apelidos.join(', '), 40)}</i>` : '';
    linhas.push(`  A${i}["${rot(p.nome, 56)}${doc}${apel}"]`);
    linhas.push(`  P0 -- "${rot(papel, 28)}" --> A${i}`);
    linhas.push(`  class A${i} ${valor(p.fm.papel) ? 'declarado' : 'pendente'}`);
  });
  linhas.push('  classDef declarado fill:#eef4ee,stroke:#2c5f4f,stroke-width:1px');
  linhas.push('  classDef pendente fill:#fdf0ee,stroke:#8d392d,stroke-width:2px,stroke-dasharray: 5 3');

  const semPapel = cn.partes.filter((p) => !valor(p.fm.papel) || valor(p.fm.papel) === 'a definir');
  return { mermaid: linhas.join('\n'), avisos: semPapel.map((p) => `${p.nome} sem papel declarado`) };
}

// --------------------------------------------------------------- fato→prova

/**
 * Liga cada pendencia numerada da estrategia ao documento que a paga, lendo o
 * contrato de topico — que e o mesmo lugar de onde o gate tira a cobranca. Um
 * fato sem documento aparece ligado a um no vermelho, e nao simplesmente
 * ausente: ausencia nao se ve, e o ponto da figura e justamente ver.
 */
function fatoProva(m) {
  const pend = pendencias(m);
  if (!pend.length) {
    const est = estrategia(m);
    throw new Erro(
      est
        ? `a ${m.voc.artefato} nao tem ${m.voc.pendencias} numerados (${m.voc.letra}1, ${m.voc.letra}2...)`
        : `sem ${m.voc.artefato} — o mapa sai dela`,
    );
  }
  const cn = canon(m, acharEscritorio());
  const nomeDoc = new Map(cn.documentos.map((d) => [String(d.id), d]));
  const topicos = entregas(m).flatMap((e) => e.topicos);

  // O lastro so conta se o topico o declarar junto com a pendencia que ele
  // paga. Um `D3` citado num topico que nao paga aquele fato nao prova aquele
  // fato — e essa distincao e o que separa o mapa de uma nuvem de citacoes.
  //
  // No consultivo o lastro e fundamento, nao documento: risco se mitiga com
  // dispositivo e precedente, que nao moram no canon. Por isso a consulta ao
  // canon so vale no contencioso.
  const noCanon = m.tipo === 'contencioso';
  const pagaCom = new Map();
  for (const t of topicos) {
    const pagas = lista(t[m.voc.paga]);
    const lastros = lista(t[m.voc.lastro]);
    for (const id of pagas) pagaCom.set(id, [...(pagaCom.get(id) || []), ...lastros]);
  }

  const linhas = ['flowchart LR'];
  const orfaos = [];
  pend.forEach((x, i) => {
    linhas.push(`  F${i}["${x.id}<br/>${rot(x.texto, 72)}"]`);
    const docs = [...new Set(pagaCom.get(x.id) || [])];
    if (!docs.length) {
      orfaos.push(x);
      linhas.push(`  X${i}["${NAO_PROVADO}"]`);
      linhas.push(`  F${i} --> X${i}`);
      linhas.push(`  class F${i} pendente`);
      linhas.push(`  class X${i} pendente`);
      return;
    }
    linhas.push(`  class F${i} provado`);
    docs.forEach((id, j) => {
      const d = noCanon ? nomeDoc.get(id) : null;
      const rotulo = noCanon
        ? `${rot(id, 12)}<br/>${rot(d ? d.nome : 'fora do canon', 56)}`
        : rot(id, 68);
      linhas.push(`  D${i}_${j}["${rotulo}"]`);
      linhas.push(`  F${i} --> D${i}_${j}`);
      linhas.push(`  class D${i}_${j} ${!noCanon || d ? 'documento' : 'pendente'}`);
    });
  });
  linhas.push('  classDef provado fill:#eef4ee,stroke:#2c5f4f,stroke-width:1px');
  linhas.push('  classDef documento fill:#eef1f6,stroke:#2e5e86,stroke-width:1px');
  linhas.push('  classDef pendente fill:#fdf0ee,stroke:#8d392d,stroke-width:2px,stroke-dasharray: 5 3');

  return {
    mermaid: linhas.join('\n'),
    avisos: orfaos.map((x) => `${x.id} "${x.texto}" sem ${m.voc.lastro} em nenhum ${m.voc.topico}`),
  };
}

// ------------------------------------------------------------------ comando

const GERADORES = {
  'linha-do-tempo': linhaDoTempo,
  partes: organograma,
  'fato-prova': fatoProva,
};

/** Gera o Mermaid de um diagrama. Usado pelo comando e pelo `build`. */
export function gerarDiagrama(m, tipo) {
  const g = GERADORES[tipo];
  if (!g) throw new Erro(`diagrama "${tipo}" nao existe. Ha: ${TIPOS_DIAGRAMA.join(', ')}`);
  return g(m);
}

export function diagrama(args) {
  const m = exigirMateria(args);
  const raiz = acharEscritorio();
  const tipo = args._[0];
  if (!tipo) throw new Erro(`Uso: attorneyfw diagrama <${TIPOS_DIAGRAMA.join('|')}> [--salvar]`);

  const { mermaid, avisos } = gerarDiagrama(m, tipo);

  if (args.salvar) {
    const alvo = join(m.dir, 'docs', 'diagramas', `${tipo}.mmd`);
    escrever(alvo, `${mermaid}\n`);
    console.log(`${c.green('diagrama salvo')}  ${rel(raiz, alvo)}`);
    // Bloco cercado, e nao comentario HTML: comentario nesta ferramenta ja quer
    // dizer nota de trabalho, e o `textoDe` o remove antes de a peca sair.
    console.log(c.dim('  na entrega, peca-o com um bloco cercado:'));
    console.log(c.dim(['    ```diagrama', `    ${tipo}`, '    ```'].join('\n')));
  } else {
    console.log('```mermaid');
    console.log(mermaid);
    console.log('```');
  }

  // O aviso e o produto, tanto quanto a figura: ele diz o que a peca vai
  // mostrar como nao provado se sair assim.
  for (const a of avisos) console.error(`  ${c.yellow('nao provado')}  ${a}`);
  if (avisos.length) {
    console.error(c.dim(`  ${avisos.length} item(ns) sairao marcados como nao provados na figura.`));
  }
}
