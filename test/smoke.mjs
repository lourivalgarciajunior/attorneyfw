/**
 * Smoke do attorneyfw: cria uma carteira descartavel, percorre o fluxo inteiro
 * nos dois tipos de materia e confere que o gate reprova o que tem de reprovar.
 *
 *   npm test
 */
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { contarPrazo, diasUteisAte, feriadosNacionais } from '../src/core.mjs';

const CLI = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'attorneyfw.mjs');
const raiz = mkdtempSync(join(tmpdir(), 'attorneyfw-'));
let falhas = 0;

/** saida junta stdout e stderr — aviso do CLI sai em stderr e tambem e testavel. */
const rodarEm = (cwd) => (...args) => {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' });
  return { saida: (r.stdout || '') + (r.stderr || ''), codigo: r.status ?? 1 };
};
const run = rodarEm(raiz);
const ok = (nome, cond) => {
  if (cond) console.log(`  ok   ${nome}`);
  else { console.log(`  FALHA ${nome}`); falhas++; }
};

/**
 * Leitura normalizada para LF. O teste substitui trecho multilinha dentro de
 * arquivo gerado a partir de template; com CRLF no disco, a busca por um
 * trecho que atravessa quebra de linha nao casa, e o teste falha dizendo
 * outra coisa — no Windows, "fato F1 nao existe na tese", em cima de uma
 * tese que parece certa. O .gitattributes normaliza o checkout; isto
 * protege quem clonar com outra configuracao.
 */
const lerLF = (...p) => readFileSync(join(...p), 'utf8').replace(/\r\n/g, '\n');

const HOJE = new Date().toISOString().slice(0, 10);
const diasAtras = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

console.log(`smoke em ${raiz}`);

// ------------------------------------------------------------- contagem de prazo
console.log('\ncontagem de prazo');
{
  // 2026-09-01 e uma terca. Intimacao na terca: contagem comeca quarta 02,
  // e 15 dias uteis terminam na quarta 23 (o feriado de 07/09 e uma segunda).
  const r = contarPrazo({ intimacao: '2026-09-01', dias: 15, feriados: feriadosNacionais(2026) });
  ok('inicio no dia util seguinte a intimacao', r.inicio === '2026-09-02');
  ok('15 dias uteis pulando o feriado de 7 de setembro', r.fim === '2026-09-23');

  // sexta-feira: a contagem so comeca na segunda
  const sexta = contarPrazo({ intimacao: '2026-09-04', dias: 5, feriados: feriadosNacionais(2026) });
  ok('intimacao na sexta comeca na segunda', sexta.inicio === '2026-09-07' || sexta.inicio === '2026-09-08');

  // recesso do art. 220: 20/12 a 20/01 nao conta
  const recesso = contarPrazo({ intimacao: '2026-12-15', dias: 5, feriados: feriadosNacionais(2026), recesso: true });
  ok('recesso empurra o vencimento para depois de 20/01', recesso.fim > '2027-01-20');
  const semRecesso = contarPrazo({ intimacao: '2026-12-15', dias: 5, feriados: feriadosNacionais(2026), recesso: false });
  ok('sem recesso o mesmo prazo vence em dezembro', semRecesso.fim < '2027-01-01');

  // prazo em dias corridos que cai em sabado prorroga (art. 224 par. 1)
  const corridos = contarPrazo({ intimacao: '2026-09-01', dias: 5, contagem: 'corridos', feriados: feriadosNacionais(2026) });
  ok('prazo corrido nao vence em dia sem expediente', ![0, 6].includes(new Date(`${corridos.fim}T12:00:00Z`).getUTCDay()));

  ok('carnaval de 2026 e feriado', feriadosNacionais(2026).has('2026-02-16'));
  ok('20 de novembro e feriado nacional', feriadosNacionais(2026).has('2026-11-20'));
  ok('dias uteis negativos quando a data ja passou', diasUteisAte('2026-09-23', '2026-09-01') < 0);
}

// ------------------------------------------------- prazo material (art. 210 CTN)
// Os dois casos vieram de um Recurso Ordinario Constitucional real, e foram
// calculados a mao ANTES da implementacao. Sao o motivo desta regra existir:
// a 0.1.0 devolvia 2026-01-27 no primeiro, data POSTERIOR a correta.
console.log('\nprazo material — art. 210 do CTN');
{
  const fer = new Set([...feriadosNacionais(2025), ...feriadosNacionais(2026)]);
  // `recesso: true` de proposito: o regime material tem de ignora-lo sozinho.
  // Passar `false` aqui mascarava o defeito, que so apareceu rodando o CLI.
  const material = (intimacao, dias) => contarPrazo({
    intimacao, dias, contagem: 'corridos', regime: 'material', recesso: true, feriados: fer,
  });

  // 26.12.2025 e sexta. Pelo caput a contagem comeca no sabado 27; se o
  // "iniciam" do paragrafo unico tambem deslocar, comeca na segunda 29.
  const a = material('2025-12-26', 30);
  ok('caput conta do dia seguinte, util ou nao', a.inicio === '2025-12-27');
  ok('30o dia em domingo prorroga para segunda', a.fim === '2026-01-26');
  ok('a outra leitura do paragrafo unico e devolvida', a.divergencia === true && a.fimAlternativo === '2026-01-27');
  ok('adotada e a data mais curta', a.fim < a.fimAlternativo);

  // 19.01.2026 e segunda: o dia seguinte ja e util, entao as leituras coincidem.
  // O 30o dia cai na quarta-feira de cinzas e prorroga — e o argumento do ROC.
  const b = material('2026-01-19', 30);
  ok('sem divergencia quando o dia seguinte ja e util', !b.divergencia && b.fimAlternativo === undefined);
  ok('30o dia na quarta de cinzas prorroga', b.fim === '2026-02-19');

  // O defeito que originou a correcao: a regra processual devolve data posterior.
  const errado = contarPrazo({ intimacao: '2025-12-26', dias: 30, contagem: 'corridos', recesso: false, feriados: fer });
  ok('a regra processual erra para MAIS neste caso', errado.fim > a.fim);
  ok('o recesso do art. 220 nao suspende prazo material', a.fim === '2026-01-26');

  ok('regime invalido e recusado', (() => {
    try { material('2026-01-19', 30); contarPrazo({ intimacao: '2026-01-19', dias: 5, regime: 'penal' }); return false; }
    catch { return true; }
  })());
}

// ---------------------------------------------------------------------- carteira
console.log('\ncarteira e materias');
ok('init cria o escritorio', run('init', 'Escritorio de Teste', '--advogado', 'Fulana', '--oab', 'SP 1').codigo === 0);
ok('init recusa a segunda vez', run('init', 'Outro').codigo === 1);
ok('status na raiz mostra a carteira vazia', run('status').codigo === 0);
ok('comando de materia fora de materia e recusado', run('dec', 'Qualquer').codigo === 1);

ok('materia contenciosa', run('materia', 'new', 'Acme — Cobranca indevida', '--tipo', 'contencioso',
  '--cliente', 'Acme Ltda', '--adverso', 'Banco Reu', '--processo', '1000-00.2026.8.26.0100',
  '--juizo', 'da 1a Vara Civel', '--slug', 'acme').codigo === 0);
ok('materia consultiva', run('materia', 'new', 'Beta — Contrato de fornecimento', '--tipo', 'consultivo',
  '--cliente', 'Beta SA', '--slug', 'beta').codigo === 0);
ok('materia repetida e recusada', run('materia', 'new', 'Outra', '--slug', 'acme').codigo === 1);
ok('tipo invalido e recusado', run('materia', 'new', 'X', '--tipo', 'tributario', '--slug', 'x').codigo === 1);
ok('materia list', run('materia', 'list').saida.includes('acme'));

const acme = join(raiz, 'materias', 'acme');
const beta = join(raiz, 'materias', 'beta');
const emAcme = rodarEm(acme);
const emBeta = rodarEm(beta);

// ------------------------------------------------------------------- contencioso
console.log('\ncontencioso');
ok('tese', emAcme('tese').codigo === 0);
ok('mapa e recusado em materia contenciosa', emAcme('mapa').codigo === 1);
ok('dec', emAcme('dec', 'Defesa por ilegitimidade passiva').codigo === 0);
ok('titulo com dois-pontos e recusado', emAcme('dec', 'Isto e: proibido').codigo === 1);
ok('plano sem tese preenchida ainda assim cria', emAcme('plano').codigo === 0);

// preenche a tese com fatos e pedidos numerados
const teseArq = readdirSync(join(acme, 'docs', 'tese'))[0];
const tese = lerLF(acme, 'docs', 'tese', teseArq)
  .replace('- F1 — \n- F2 — ', '- F1 — a cobranca foi lancada sem contrato\n- F2 — o cliente contestou por escrito')
  .replace('- P1 — \n- P2 — ', '- P1 — declaracao de inexigibilidade\n- P2 — devolucao em dobro');
writeFileSync(join(acme, 'docs', 'tese', teseArq), tese, 'utf8');

// preenche o plano e materializa
const planoArq = readdirSync(join(acme, 'docs', 'plano'))[0];
const plano = lerLF(acme, 'docs', 'plano', planoArq)
  .replace('| 01 |  |  |  |  |', `| 01 | Peticao inicial | inicial |  |  |`)
  .replace('| 02 |  |  |  |  |', `| 02 | Replica | replica | ${diasAtras(3)} | 15 |`)
  // um vao declarado no plano: nao vira entrega, mas tem de ser dito em voz alta
  .replace('| 02 | Replica', '| 3–5 | a definir |  |  |\n| 02 | Replica');
writeFileSync(join(acme, 'docs', 'plano', planoArq), plano, 'utf8');

ok('plano --simular nao escreve', emAcme('plano', '--simular').saida.includes('criaria'));
const mat = emAcme('plano', '--materializar');
ok('plano --materializar cria as entregas', mat.codigo === 0 && mat.saida.includes('Peticao inicial'));
ok('materializar de novo pula o que existe', emAcme('plano', '--materializar').saida.includes('ja existe'));
ok('linha de vao e ignorada e dita', emAcme('plano', '--materializar').saida.includes('ignorada'));

ok('gate passa com contrato em branco no backlog', emAcme('validate').codigo === 0);
ok('entrega move', emAcme('entrega', 'move', '1', 'minuta').codigo === 0);
ok('gate reprova contrato em branco fora do backlog', emAcme('validate').codigo === 1);

// preenche o contrato do topico
const entPath = join(acme, 'entregas', 'minuta', 'ent-01-peticao-inicial.md');
let ent = lerLF(entPath)
  .replace('sustenta:', 'sustenta: a cobranca e inexigivel por falta de contrato')
  .replace('fatos: []', 'fatos: [F1, F2]')
  .replace('provado: []', 'provado: [F1, F2]')
  .replace('documentos: []', 'documentos: [D1]')
  .replace('fundamento: []', 'fundamento: [art. 373 CPC]')
  .replace('pedidos: []', 'pedidos: [P1, P2]')
  .replace('risco:', 'risco: o banco vai alegar contrato verbal')
  .replace('resposta:', 'resposta: contrato bancario exige forma escrita')
  .replace('<!-- o texto entra aqui, logo abaixo do contrato -->', 'texto '.repeat(200));
writeFileSync(entPath, ent, 'utf8');

ok('gate reprova documento fora do canon', emAcme('validate').saida.includes('D1'));
ok('canon new documento', emAcme('canon', 'new', 'documento', 'Fatura contestada').codigo === 0);
ok('canon new parte', emAcme('canon', 'new', 'parte', 'Acme Ltda', '--papel', 'autor').codigo === 0);
ok('gate passa com o canon completo', emAcme('validate').codigo === 0);

ok('pedido inexistente e reprovado', (() => {
  writeFileSync(entPath, ent.replace('pedidos: [P1, P2]', 'pedidos: [P1, P9]'), 'utf8');
  const r = emAcme('validate').saida.includes('P9');
  writeFileSync(entPath, ent, 'utf8');
  return r;
})());

ok('fato provado sem documento e reprovado', (() => {
  writeFileSync(entPath, ent.replace('documentos: [D1]', 'documentos: []'), 'utf8');
  const r = emAcme('validate').codigo === 1;
  writeFileSync(entPath, ent, 'utf8');
  return r;
})());

ok('risco sem resposta e reprovado', (() => {
  writeFileSync(entPath, ent.replace('resposta: contrato bancario exige forma escrita', 'resposta:'), 'utf8');
  const r = emAcme('validate').saida.includes('resposta');
  writeFileSync(entPath, ent, 'utf8');
  return r;
})());

// ------------------------------------------------------------------------ prazos
console.log('\nprazos');
ok('prazo set', emAcme('prazo', 'set', '1', '--intimacao', HOJE, '--dias', '15').codigo === 0);
ok('prazo set sem --dias e recusado', emAcme('prazo', 'set', '1', '--intimacao', HOJE).codigo === 1);
ok('prazo set com data invalida e recusado', emAcme('prazo', 'set', '1', '--intimacao', '01/09/2026', '--dias', '15').codigo === 1);
ok('agenda mostra o prazo', emAcme('prazo').saida.includes('acme/01'));
ok('agenda avisa que e conferencia', emAcme('prazo').saida.includes('conferencia'));
ok('agenda da carteira roda na raiz', run('prazo').codigo === 0 || run('prazo').codigo === 1);

// --material grava o regime e a agenda mostra a divergencia
ok('prazo set --material', emAcme('prazo', 'set', '2', '--intimacao', '2025-12-26', '--dias', '30', '--material').codigo === 0);
ok('--material grava o regime', readFileSync(join(acme, 'entregas', 'backlog', 'ent-02-replica.md'), 'utf8').includes('prazo_regime: material'));
ok('a saida mostra as duas leituras', emAcme('prazo', 'set', '2', '--intimacao', '2025-12-26', '--dias', '30', '--material').saida.includes('2026-01-27'));
ok('--material com --uteis e recusado', emAcme('prazo', 'set', '2', '--intimacao', '2025-12-26', '--dias', '30', '--material', '--uteis').codigo === 1);
ok('a agenda marca o regime do CTN', emAcme('prazo').saida.includes('CTN'));
ok('gate avisa corridos com regime processual', (() => {
  const p = join(acme, 'entregas', 'backlog', 'ent-02-replica.md');
  const antes = readFileSync(p, 'utf8');
  writeFileSync(p, antes.replace('prazo_regime: material', 'prazo_regime: processual'), 'utf8');
  const r = emAcme('validate').saida.includes('--material');
  writeFileSync(p, antes, 'utf8');
  return r;
})());
ok('regime invalido reprova o gate', (() => {
  const p = join(acme, 'entregas', 'backlog', 'ent-02-replica.md');
  const antes = readFileSync(p, 'utf8');
  writeFileSync(p, antes.replace('prazo_regime: material', 'prazo_regime: penal'), 'utf8');
  const r = emAcme('validate').codigo === 1;
  writeFileSync(p, antes, 'utf8');
  return r;
})());

// prazo vencido com a entrega ainda aberta: erro
ok('gate reprova prazo vencido em entrega aberta', (() => {
  emAcme('prazo', 'set', '1', '--intimacao', diasAtras(40), '--dias', '5');
  const r = emAcme('validate').saida.includes('venceu');
  return r;
})());
ok('agenda sai com codigo 1 quando ha vencido', emAcme('prazo').codigo === 1);

ok('entrega intempestiva e reprovada', (() => {
  emAcme('entrega', 'move', '1', 'entregue', '--em', HOJE);
  const r = emAcme('validate').saida.includes('intempestiva');
  emAcme('entrega', 'move', '1', 'revisao', '--forcar');
  emAcme('prazo', 'set', '1', '--intimacao', HOJE, '--dias', '15');
  return r;
})());

ok('reabrir entregue sem --forcar e recusado', (() => {
  emAcme('entrega', 'move', '1', 'entregue');
  const r = emAcme('entrega', 'move', '1', 'minuta').codigo === 1;
  emAcme('entrega', 'move', '1', 'revisao', '--forcar');
  return r;
})());

// ------------------------------------------------------ leitura, saida e kanban
console.log('\nleitura e saida');
ok('brief monta o pacote do topico', emAcme('brief', '1').saida.includes('BRIEFING DE TOPICO'));
ok('brief avisa o prazo', emAcme('brief', '1').saida.includes('prazo vence'));
ok('status da materia', emAcme('status').saida.includes('Acme'));
ok('status da carteira na raiz', run('status').saida.includes('acme'));
ok('context', emAcme('context').saida.includes('Contexto da materia'));
ok('context exige materia na raiz', run('context').codigo === 1);
ok('--materia funciona da raiz', run('status', '--materia', 'acme').saida.includes('Acme'));
ok('--materia inexistente e recusado', run('status', '--materia', 'nada').codigo === 1);

ok('build costura a entrega', emAcme('build', '1').codigo === 0);
ok('build sai com enderecamento', readFileSync(join(acme, 'saida', 'ent-01-peticao-inicial.md'), 'utf8').includes('EXCELENTISSIMO'));
ok('build inclui os pedidos citados', readFileSync(join(acme, 'saida', 'ent-01-peticao-inicial.md'), 'utf8').includes('inexigibilidade'));
ok('build sem alvo lista as abertas', emAcme('build').codigo === 1);

ok('entrega renumber', emAcme('entrega', 'renumber', '2', '9').codigo === 0);
ok('renumber para numero ocupado e recusado', emAcme('entrega', 'renumber', '9', '1').codigo === 1);
ok('entrega retitle', emAcme('entrega', 'retitle', '9', 'Replica a contestacao').codigo === 0);
ok('retitle levou o nome do arquivo junto', existsSync(join(acme, 'entregas', 'backlog', 'ent-09-replica-a-contestacao.md')));
ok('entrega move em faixa', emAcme('entrega', 'move', '1,9', 'revisao').codigo === 0);

// --------------------------------------------------------------------- consultivo
console.log('\nconsultivo');
ok('mapa de risco', emBeta('mapa').codigo === 0);
ok('tese e recusada em materia consultiva', emBeta('tese').codigo === 1);
const mapaArq = readdirSync(join(beta, 'docs', 'mapa-risco'))[0];
writeFileSync(join(beta, 'docs', 'mapa-risco', mapaArq),
  lerLF(beta, 'docs', 'mapa-risco', mapaArq)
    .replace('- R1 — \n- R2 — ', '- R1 — multa sem teto\n- R2 — foro de eleicao abusivo'), 'utf8');
ok('plano consultivo', emBeta('plano').codigo === 0);
const planoBeta = readdirSync(join(beta, 'docs', 'plano'))[0];
writeFileSync(join(beta, 'docs', 'plano', planoBeta),
  lerLF(beta, 'docs', 'plano', planoBeta)
    .replace('| 01 |  |  |  |  |', '| 01 | Minuta do contrato | minuta |  |  |'), 'utf8');
ok('materializa a minuta', emBeta('plano', '--materializar').codigo === 0);

const minPath = join(beta, 'entregas', 'backlog', 'ent-01-minuta-do-contrato.md');
ok('contrato consultivo nasce com riscos e mitigado', (() => {
  const t = lerLF(minPath);
  return t.includes('riscos: []') && t.includes('mitigado: []') && !t.includes('pedidos:');
})());

writeFileSync(minPath, lerLF(minPath)
  .replace('sustenta:', 'sustenta: a multa fica limitada a 10% do valor do contrato')
  .replace('riscos: []', 'riscos: [R1, R2]')
  .replace('mitigado: []', 'mitigado: [R1, R2]')
  .replace('fundamento: []', 'fundamento: [art. 412 CC]')
  .replace('risco:', 'risco: a contraparte vai pedir multa livre')
  .replace('resposta:', 'resposta: teto e praxe no setor')
  .replace('<!-- o texto entra aqui, logo abaixo do contrato -->', 'clausula '.repeat(200)), 'utf8');
ok('topico add usa o vocabulario consultivo', emBeta('topico', 'add', '1', '--tipo', 'garantia').saida.includes('clausula'));
ok('topico add com tipo do outro dominio e recusado', emBeta('topico', 'add', '1', '--tipo', 'merito').codigo === 1);
ok('gate consultivo passa', (() => {
  emBeta('entrega', 'move', '1', 'revisao');
  // o segundo topico, vazio, tem de reprovar
  const reprovou = emBeta('validate').codigo === 1;
  return reprovou;
})());
ok('build consultivo nao usa enderecamento judicial', (() => {
  emBeta('build', '1');
  const t = readFileSync(join(beta, 'saida', 'ent-01-minuta-do-contrato.md'), 'utf8');
  return !t.includes('EXCELENTISSIMO') && t.includes('Consulente');
})());

// --------------------------------------------------------------- gate da carteira
console.log('\ngate');
ok('validate na raiz percorre a carteira', run('validate').saida.includes('materias 2'));
ok('validate --json', (() => {
  const r = run('validate', '--json');
  try { return Array.isArray(JSON.parse(r.saida).erros); } catch { return false; }
})());
ok('help', run('help').saida.includes('attorneyfw'));
ok('comando desconhecido sai com 1', run('inexistente').codigo === 1);

rmSync(raiz, { recursive: true, force: true });
console.log(falhas ? `\n${falhas} falha(s).` : '\nOK.');
process.exit(falhas ? 1 : 0);
