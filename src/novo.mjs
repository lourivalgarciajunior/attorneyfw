import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  Erro, acharEscritorio, artefatos, c, entregas, escrever, estrategia, exigirMateria,
  hoje, linhasDoPlano, plano as planoEmVigor, rel, slug, template,
} from './core.mjs';

function checaTitulo(t) {
  if (!t) throw new Erro('Titulo obrigatorio.');
  if (t.includes(':')) throw new Erro('Titulo com ":" — o NTFS trunca o arquivo para 0 byte. Use travessao ou hifen.');
  return t;
}

export function dec(args) {
  const m = exigirMateria(args);
  const titulo = checaTitulo(args._.join(' '));
  const nome = `DEC-${hoje()}-${slug(titulo)}.md`;
  const caminho = join(m.dir, 'docs/dec', nome);
  if (existsSync(caminho)) throw new Erro(`${nome} ja existe.`);
  escrever(caminho, template('dec.md', { titulo, data: hoje(), id: nome.replace('.md', ''), materia: m.cfg.titulo || m.slug }));
  console.log(`${c.green('DEC criada')}  ${rel(acharEscritorio(), caminho)}`);
}

/**
 * O artefato de estrategia. Um comando so para os dois tipos: `tese` no
 * contencioso, `mapa` no consultivo. O tipo da materia decide o template e o
 * diretorio — pedir tese numa materia consultiva e sinal de estar na pasta
 * errada, e recusar sai mais barato que criar o artefato que ninguem le.
 */
export function estrategiaNew(args, chamado) {
  const m = exigirMateria(args);
  const esperado = m.tipo === 'contencioso' ? 'tese' : 'mapa';
  if (chamado !== esperado) {
    throw new Erro(`A materia "${m.slug}" e ${m.tipo}. Use \`attorneyfw ${esperado}\`, nao \`${chamado}\`.`);
  }
  const titulo = checaTitulo(args._.join(' ') || m.cfg.titulo || m.slug);
  const nome = `${m.voc.prefixoArtefato}-${hoje()}-${slug(titulo)}.md`;
  const caminho = join(m.dir, 'docs', m.voc.dirArtefato, nome);
  if (existsSync(caminho)) throw new Erro(`${nome} ja existe.`);

  const decs = artefatos(m, 'dec').map((d) => `- ${d.arquivo.replace('.md', '')}`).join('\n') || '- (nenhuma ainda)';
  escrever(caminho, template(m.tipo === 'contencioso' ? 'tese.md' : 'mapa-risco.md', {
    titulo, data: hoje(), decs,
    cliente: m.cfg.cliente || 'a definir',
    papel: m.cfg.papel || 'a definir',
    adverso: m.cfg.adverso || 'a definir',
    processo: m.cfg.processo || '(sem numero de processo)',
    juizo: m.cfg.juizo || 'a definir',
  }));
  console.log(`${c.green(`${m.voc.artefato} criada`)}  ${rel(acharEscritorio(), caminho)}`);
  console.log(c.dim(`  numere os ${m.voc.pendencias} como ${m.voc.letra}1, ${m.voc.letra}2 — o gate cobra cada um`));
}

export function plano(args) {
  const m = exigirMateria(args);
  if (args.materializar || args.simular) return materializar(m, args);

  const est = estrategia(m);
  if (!est) {
    throw new Erro(`Nenhuma ${m.voc.artefato}. Rode \`attorneyfw ${m.tipo === 'contencioso' ? 'tese' : 'mapa'}\` antes — `
      + `plano de entrega sem ${m.voc.artefato} e trabalho sem destino.`);
  }
  const titulo = checaTitulo(args._.join(' ') || m.cfg.titulo || m.slug);
  const nome = `PLANO-${hoje()}-${slug(titulo)}.md`;
  const caminho = join(m.dir, 'docs/plano', nome);
  if (existsSync(caminho)) throw new Erro(`${nome} ja existe.`);
  escrever(caminho, template('plano.md', {
    titulo, data: hoje(), tipo: m.tipo,
    artefato: est.arquivo.replace('.md', ''),
    entrega: m.voc.entrega, entregas: m.voc.entregas,
  }));
  console.log(`${c.green('plano criado')}  ${rel(acharEscritorio(), caminho)}`);
  console.log(c.dim('  preencha a tabela e rode `attorneyfw plano --materializar`'));
}

/**
 * Materializa o plano no kanban. Idempotente: entrega que ja existe e pulada,
 * entao acrescentar uma linha ao plano e rodar de novo so cria o que falta.
 */
function materializar(m, args) {
  const raiz = acharEscritorio();
  const pl = planoEmVigor(m);
  if (!pl) throw new Erro('Nenhum plano. Rode `attorneyfw plano` antes.');
  const { linhas, ignoradas, temTabela } = linhasDoPlano(pl.corpo);
  if (!linhas.length) {
    // Sem tabela e tabela em branco sao problemas diferentes, e a saida tem de
    // dizer qual: um se corrige no cabecalho, o outro preenchendo.
    throw new Erro(temTabela
      ? `A tabela de ${pl.arquivo} nao tem nenhuma linha com "#" e "Titulo" preenchidos.\n`
        + '       Preencha o plano primeiro — materializar plano vazio so cria arquivo vazio.'
      : `${pl.arquivo} nao tem tabela de entregas. Ela precisa das colunas "#" e "Titulo".`);
  }

  const existentes = entregas(m);
  const criadas = [];
  const puladas = [];

  for (const linha of linhas) {
    const jaExiste = existentes.find((x) => x.numero === linha.numero);
    if (jaExiste) { puladas.push({ ...linha, arquivo: jaExiste.arquivo }); continue; }
    if (linha.titulo.includes(':')) {
      throw new Erro(`Entrega ${linha.numero} tem ":" no titulo — o NTFS trunca o arquivo para 0 byte. Corrija ${pl.arquivo}.`);
    }
    const id = `ent-${String(linha.numero).padStart(2, '0')}-${slug(linha.titulo)}`;
    const caminho = join(m.dir, 'entregas', 'backlog', `${id}.md`);
    if (!args.simular) escrever(caminho, corpoEntrega(m, { id, ...linha }));
    criadas.push({ ...linha, caminho });
  }

  console.log(`${args.simular ? c.yellow('simulacao') : c.green('plano materializado')}  de ${pl.arquivo}`);
  for (const x of criadas) console.log(`  ${args.simular ? 'criaria' : c.green('criada ')} ${String(x.numero).padStart(2, '0')} ${x.titulo}`);
  for (const x of puladas) console.log(c.dim(`  ja existe ${String(x.numero).padStart(2, '0')} ${x.arquivo}`));
  // Linha ignorada tem de aparecer: some-la daria a impressao de plano inteiro
  // materializado, e o que sobrou e trabalho pendente.
  for (const x of ignoradas) {
    console.log(`  ${c.yellow('ignorada')} "${x.bruto}" ${x.titulo ? `— ${x.titulo} ` : ''}(${x.motivo})`);
  }
  console.log(c.dim(`\n  ${criadas.length} ${args.simular ? 'a criar' : 'criadas'} | ${puladas.length} ja no kanban | ${linhas.length} no plano${ignoradas.length ? ` | ${ignoradas.length} ignorada(s)` : ''}`));
  if (args.simular && criadas.length) console.log(c.dim('  repita com --materializar para escrever'));
  if (!args.simular && criadas.length) console.log(c.dim(`  ${rel(raiz, m.dir)} — confira os prazos: attorneyfw prazo`));
}

/**
 * O contrato de topico nasce com os campos do tipo da materia. Um template
 * unico com `fatos`/`provado` cravados deixava toda minuta consultiva com o
 * contrato do contencioso, e o gate cobrava campo que ninguem ia preencher.
 */
function corpoEntrega(m, { id, numero, titulo, tipo, intimacao, dias }) {
  return template('entrega.md', {
    id, titulo, numero: String(numero), data: hoje(),
    tipo: tipo || (m.tipo === 'contencioso' ? 'manifestacao' : 'minuta'),
    topico: m.voc.topico.charAt(0).toUpperCase() + m.voc.topico.slice(1),
    pendencias: m.voc.pendencias,
    paga: m.voc.paga,
    extra: m.tipo === 'contencioso' ? 'pedidos: []\n' : '',
    prazo_intimacao: intimacao || '',
    prazo_dias: dias || '',
    prazo_contagem: m.tipo === 'contencioso' ? 'uteis' : 'corridos',
    // Regime nasce processual e nao se infere: prazo material se declara.
    prazo_regime: 'processual',
  });
}

export function entregaNew(args) {
  const m = exigirMateria(args);
  const titulo = checaTitulo(args._.join(' '));
  const existentes = entregas(m);
  const numero = Number(args.numero ?? (Math.max(0, ...existentes.map((x) => x.numero)) + 1));
  if (existentes.some((x) => x.numero === numero)) throw new Erro(`Ja existe entrega numero ${numero}.`);
  const id = `ent-${String(numero).padStart(2, '0')}-${slug(titulo)}`;
  const caminho = join(m.dir, 'entregas', 'backlog', `${id}.md`);
  escrever(caminho, corpoEntrega(m, {
    id, numero, titulo, tipo: args.tipo, intimacao: args.intimacao, dias: args.dias,
  }));
  console.log(`${c.green(`${m.voc.entrega} criada`)}  ${rel(acharEscritorio(), caminho)}`);
}
