/**
 * Smoke do attorneyfw: cria uma carteira descartavel, percorre o fluxo inteiro
 * nos dois tipos de materia e confere que o gate reprova o que tem de reprovar.
 *
 *   npm test
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
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
 * As linhas de violacao do gate.
 *
 * Existe porque assert amarrado ao codigo de saida do `validate` ja quebrou duas
 * vezes por motivo alheio: ele passa a depender de toda violacao que a fixture
 * tenha por outra razao. A propriedade a testar e quase sempre "nao gera
 * violacao DESTA regra", e nao "o gate passa".
 */
const violacoes = (r) => r.saida.split(/\r?\n/).filter((l) => l.includes('ERRO'));

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

ok('entregue_em sai como YAML valido, com espaco', (() => {
  emAcme('entrega', 'move', '1', 'entregue', '--em', HOJE);
  const t = readFileSync(join(acme, 'entregas', 'entregue', 'ent-01-peticao-inicial.md'), 'utf8');
  emAcme('entrega', 'move', '1', 'revisao', '--forcar');
  // `entregue_em:2026-02-19` sem espaco nao e par chave-valor em YAML de
  // verdade, e o arquivo da entrega e material que outra ferramenta pode abrir.
  return t.includes(`entregue_em: ${HOJE}`);
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

// -------------------------------------------------- transcricao com lastro
console.log('\ntranscricao com lastro');

// O caso do corpus: a transcricao do auto de infracao diz ,21 e o resto da peca
// usa ,25 — e a soma fecha com o ,25. O erro esta DENTRO das aspas.
const fichaDoc = join(acme, 'docs', 'canon', 'documentos', 'fatura-contestada.md');
// Um por linha, com hifen: em lista inline a virgula do valor parte o numero
// em dois, e a comparacao passa a ser feita contra "344.568" e "25".
writeFileSync(fichaDoc, lerLF(fichaDoc).replace(/^valores:.*$/m, ['valores:', '  - 344.568,25'].join('\n')), 'utf8');

const comTranscricao = (id, valor) => ent.replace('texto '.repeat(200),
  ['```transcricao ' + id,
   `Utilizou-se indevidamente de creditos no valor total de R$ ${valor}.`,
   '```'].join('\n'));

writeFileSync(entPath, comTranscricao('D1', '344.568,21'), 'utf8');
emAcme('build', '1');
const trans = emAcme('conferir', '1');
ok('valor transcrito divergente da ficha e apontado',
  trans.saida.includes('344.568,21') && trans.saida.includes('344.568,25'));
ok('a divergencia diz que esta dentro das aspas', trans.saida.includes('dentro das aspas'));
ok('sai com o rotulo de transcricao', trans.saida.includes('transcricao x ficha'));

ok('a transcricao vira citacao assinada na peca', (() => {
  const md = readFileSync(join(acme, 'saida', 'ent-01-peticao-inicial.md'), 'utf8');
  return md.includes('> Utilizou-se') && md.includes('_(D1)_') && !md.includes('```transcricao');
})());

ok('valor que bate com a ficha nao vira alarme', (() => {
  writeFileSync(entPath, comTranscricao('D1', '344.568,25'), 'utf8');
  emAcme('build', '1');
  return !emAcme('conferir', '1').saida.includes('transcricao x ficha');
})());

ok('valor que a ficha nao registra sai como par, dizendo que ela nao registra', (() => {
  writeFileSync(entPath, comTranscricao('D1', '9.999,00'), 'utf8');
  emAcme('build', '1');
  const r = emAcme('conferir', '1');
  return r.saida.includes('9.999,00') && r.saida.includes('nao registra');
})());

ok('ficha sem valores nao gera comparacao', (() => {
  const bom = lerLF(fichaDoc);
  writeFileSync(fichaDoc, bom.replace(/^valores:\n {2}- .*$/m, 'valores:'), 'utf8');
  emAcme('build', '1');
  const r = emAcme('conferir', '1');
  writeFileSync(fichaDoc, bom, 'utf8');
  return !r.saida.includes('transcricao x ficha');
})());

// O gate: transcricao tem de declarar a origem.
ok('transcricao sem documento declarado reprova', (() => {
  writeFileSync(entPath, ent.replace('texto '.repeat(200), '```transcricao\ntrecho qualquer\n```'), 'utf8');
  return violacoes(emAcme('validate')).some((l) => l.includes('sem documento declarado'));
})());
ok('transcricao com origem fora do canon reprova', (() => {
  writeFileSync(entPath, comTranscricao('D99', '10,00'), 'utf8');
  return violacoes(emAcme('validate')).some((l) => l.includes('D99'));
})());

writeFileSync(entPath, ent, 'utf8');
emAcme('build', '1');

// --------------------------------------------------- modelo por tipo de acao
console.log('\nmodelo por tipo de acao');

ok('sem materia de origem nao ha modelo', (() => {
  const r = run('modelo', 'destilar', 'cobranca');
  return r.codigo === 1 && r.saida.includes('adv-ulpiano');
})());
ok('materia de origem inexistente e recusada',
  run('modelo', 'destilar', 'cobranca', '--de', 'nao-existe').codigo === 1);
ok('nome de tipo invalido e recusado',
  run('modelo', 'destilar', 'Cobranca Civel', '--de', 'acme').codigo === 1);

const dest = run('modelo', 'destilar', 'cobranca', '--de', 'acme,beta');
ok('destila de duas materias', dest.codigo === 0 && dest.saida.includes('2 materia'));

const modeloArq = join(raiz, 'modelos', 'cobranca.yaml');
ok('grava o modelo na carteira', existsSync(modeloArq));
ok('o modelo declara o n e as materias de origem', (() => {
  const t = lerLF(modeloArq);
  return t.includes('n: 2') && t.includes('materias: [acme, beta]');
})());
ok('cada linha carrega a procedencia', (() => {
  const t = lerLF(modeloArq);
  return /em: \d+\/2/.test(t) && /de: \[[a-z]/.test(t);
})());
ok('item visto uma vez so sai marcado', lerLF(modeloArq).includes('visto uma vez so'));
ok('o modelo diz que nao e afirmacao sobre o direito',
  lerLF(modeloArq).includes('NAO e uma afirmacao sobre o direito'));
ok('amostra pequena e declarada', dest.saida.includes('pouco para destilar'));

ok('modelo sem subcomando lista', run('modelo').saida.includes('cobranca'));

ok('aplicar tipo inexistente e recusado', (() => {
  const r = emAcme('modelo', 'aplicar', 'inventado');
  return r.codigo === 1 && r.saida.includes('modelo destilar');
})());

const apl = emAcme('modelo', 'aplicar', 'cobranca');
const checklist = join(acme, 'docs', 'checklist-cobranca.md');
ok('aplicar cria o checklist', apl.codigo === 0 && existsSync(checklist));
ok('os itens entram como PENDENTES', lerLF(checklist).includes('- [ ]'));
ok('o checklist diz que e pendencia, e nao verdade',
  lerLF(checklist).includes('pendencia, e nao verdade'));
ok('o checklist carrega a procedencia de cada item', /_\(\d+\/2 — /.test(lerLF(checklist)));
ok('o checklist declara o que nao sabe', lerLF(checklist).includes('nao conhece nada que o escritorio ainda nao fez'));

// Nada e dado por provado porque o modelo disse: o gate segue igual.
ok('aplicar o modelo nao mexe no que o gate cobra', (() => {
  const antes = violacoes(emAcme('validate')).length;
  emAcme('modelo', 'aplicar', 'cobranca');
  return violacoes(emAcme('validate')).length === antes;
})());

// ------------------------------------- o que a peca anuncia sobre si mesma
console.log('\ntitulo e prioridade');

// O caso do corpus: o titulo anuncia "c/c pedido de tutela provisoria de
// urgencia" e a peca nao formula o pedido de tutela.
ok('titulo que promete c/c e o pedido nao menciona vira aviso', (() => {
  emAcme('entrega', 'retitle', '1', 'Peticao inicial c/c pedido de tutela provisoria de urgencia');
  const r = emAcme('validate');
  const linha = r.saida.split('\n').find((l) => l.includes('o titulo promete'));
  return Boolean(linha) && linha.includes('aviso');
})());
ok('a mensagem mostra o que o titulo prometeu', emAcme('validate').saida.includes('tutela'));
ok('e nao reprova o gate por isso',
  !violacoes(emAcme('validate')).some((l) => l.includes('titulo promete')));

ok('titulo sem c/c nao gera aviso', (() => {
  emAcme('entrega', 'retitle', '1', 'Peticao inicial');
  return !emAcme('validate').saida.includes('o titulo promete');
})());

// Prioridade: a idade vem da ficha, e nao do texto.
const nasc = (anos) => {
  const d = new Date(Date.now() - anos * 365.25 * 86400000);
  return d.toISOString().slice(0, 10);
};
// Ficha propria, criada aqui: depender de uma criada num bloco posterior
// acopla este teste a ordem dos blocos, e a ordem muda a cada onda nova.
emAcme('canon', 'new', 'parte', 'Parte Com Idade', '--papel', 'autor');
const fichaIdosa = join(acme, 'docs', 'canon', 'partes', 'parte-com-idade.md');

ok('sem nascimento, a regra da idade nao roda', (() => {
  const r = emAcme('validate');
  return !r.saida.includes('prioridade de tramitacao') && !r.saida.includes('nascimento');
})());

ok('parte de 60+ sem pedido de prioridade vira aviso', (() => {
  const bom = lerLF(fichaIdosa);
  writeFileSync(fichaIdosa, bom.replace(/^nascimento:.*$/m, `nascimento: ${nasc(69)}`), 'utf8');
  const r = emAcme('validate');
  writeFileSync(fichaIdosa, bom, 'utf8');
  const linha = r.saida.split('\n').find((l) => l.includes('prioridade de tramitacao'));
  return Boolean(linha) && linha.includes('aviso') && linha.includes('69 anos');
})());

ok('menor sem pedido de prioridade vira aviso', (() => {
  const bom = lerLF(fichaIdosa);
  writeFileSync(fichaIdosa, bom.replace(/^nascimento:.*$/m, `nascimento: ${nasc(4)}`), 'utf8');
  const r = emAcme('validate');
  writeFileSync(fichaIdosa, bom, 'utf8');
  return r.saida.includes('prioridade de tramitacao') && r.saida.includes('4 anos');
})());

// O caso exato do alvara: o cabecalho diz uma idade que nenhuma parte tem.
ok('idade anunciada que nenhuma parte tem vira aviso, com os dois lados', (() => {
  const bomF = lerLF(fichaIdosa);
  const bomE = lerLF(entPath);
  writeFileSync(fichaIdosa, bomF.replace(/^nascimento:.*$/m, `nascimento: ${nasc(69)}`), 'utf8');
  writeFileSync(entPath, bomE.replace('texto '.repeat(200),
    'Prioridade de tramitacao, autores com 64 anos de idade, na forma da lei.'), 'utf8');
  const r = emAcme('validate');
  writeFileSync(fichaIdosa, bomF, 'utf8');
  writeFileSync(entPath, bomE, 'utf8');
  return r.saida.includes('fala em 64 anos') && r.saida.includes('a mais velha tem 69');
})());

ok('idade anunciada que bate com a ficha nao gera aviso', (() => {
  const bomF = lerLF(fichaIdosa);
  const bomE = lerLF(entPath);
  writeFileSync(fichaIdosa, bomF.replace(/^nascimento:.*$/m, `nascimento: ${nasc(69)}`), 'utf8');
  writeFileSync(entPath, bomE.replace('texto '.repeat(200),
    'Prioridade de tramitacao, autor com 69 anos de idade.'), 'utf8');
  const r = emAcme('validate');
  writeFileSync(fichaIdosa, bomF, 'utf8');
  writeFileSync(entPath, bomE, 'utf8');
  return !r.saida.includes('fala em');
})());

emAcme('build', '1');

// ---------------------------------------------------------------- formulas
console.log('\nformulas de peca');

const formulasArq = join(raiz, 'formulas.yaml');
ok('o init cria formulas.yaml na carteira', existsSync(formulasArq));
ok('e ele vem marcado como semente', lerLF(formulasArq).includes('semente: true'));

// O aviso da semente e uma vez por MATERIA, e nao a cada build: a informacao
// nao muda entre uma peca e a seguinte, e repetir ensina a pular a linha
// amarela — levando junto a proxima, que talvez importe.
ok('o aviso da semente nao se repete a cada build', (() => {
  const r = emAcme('build', '1');   // acme ja costurou peca antes
  return !r.saida.includes('nao e o do seu escritorio');
})());
// Materia propria, criada aqui. Depender de outra "ainda nao ter costurado
// nada" acopla o teste a ordem dos blocos — e a ordem muda a cada onda nova.
// Terceira vez que este acoplamento quebra um teste nesta sequencia de REQs.
ok('mas ele aparece na primeira peca costurada de uma materia', (() => {
  run('materia', 'new', 'Gama — Primeira peca', '--tipo', 'contencioso',
    '--cliente', 'Gama Ltda', '--juizo', '1a Vara Civel', '--slug', 'gama');
  const emGama = rodarEm(join(raiz, 'materias', 'gama'));
  emGama('tese');
  emGama('plano');
  emGama('entrega', 'new', 'Peticao inicial');
  emGama('entrega', 'move', '1', 'minuta');
  return emGama('build', '1').saida.includes('nao e o do seu escritorio');
})());
ok('e a condicao permanente fica no gate, que roda por materia', (() => {
  const linha = emAcme('validate').saida.split(/\r?\n/).find((l) => l.includes('ainda e a semente'));
  return Boolean(linha) && linha.includes('aviso');
})());
ok('o gate nao manda ao caminho errado — formulas.yaml esta na raiz',
  !emAcme('validate').saida.includes('acme/formulas.yaml'));

const saidaAcme = () => readFileSync(join(acme, 'saida', 'ent-01-peticao-inicial.md'), 'utf8');
ok('o enderecamento sai da formula, e nao do codigo',
  saidaAcme().includes('EXCELENTISSIMO SENHOR DOUTOR JUIZ DE DIREITO DA')
  && !saidaAcme().includes('EXCELENTISSIMO(A)'));

// A formula da carteira manda. E ela some o aviso de semente.
ok('formula da carteira substitui a semente', (() => {
  const bom = lerLF(formulasArq);
  writeFileSync(formulasArq, bom
    .replace(/^semente:.*$/m, 'semente: false')
    .replace(/^enderecamento_civel:.*$/m, 'enderecamento_civel: AO DOUTO JUIZO DA {juizo}, COMARCA DE {comarca}'), 'utf8');
  const r = emAcme('build', '1');
  const md = saidaAcme();
  writeFileSync(formulasArq, bom, 'utf8');
  return md.includes('AO DOUTO JUIZO DA') && !r.saida.includes('nao e o do seu escritorio');
})());

// Marcador sem valor tem de aparecer no papel.
ok('marcador sem valor sai visivel, e nao em branco', (() => {
  const bom = lerLF(formulasArq);
  writeFileSync(formulasArq, `${bom}\nenderecamento_civel: JUIZO {inexistente} DE {comarca}\n`, 'utf8');
  const r = emAcme('build', '1');
  const md = saidaAcme();
  writeFileSync(formulasArq, bom, 'utf8');
  return md.includes('{inexistente}') && r.saida.includes('sem valor');
})());

// O foro e declarado. Foro invalido e erro, e nao palpite.
ok('foro invalido e recusado com a lista', (() => {
  const mat = join(acme, 'materia.yaml');
  const bom = lerLF(mat);
  writeFileSync(mat, bom.replace(/^foro:.*$/m, 'foro: penal'), 'utf8');
  const r = emAcme('build', '1');
  writeFileSync(mat, bom, 'utf8');
  return r.codigo === 1 && r.saida.includes('civel, fazenda, familia, juizado, trabalho');
})());

ok('foro juizado usa a formula do juizado', (() => {
  const mat = join(acme, 'materia.yaml');
  const bom = lerLF(mat);
  writeFileSync(mat, bom.replace(/^foro:.*$/m, 'foro: juizado'), 'utf8');
  emAcme('build', '1');
  const md = saidaAcme();
  writeFileSync(mat, bom, 'utf8');
  emAcme('build', '1');
  return md.includes('AO JUIZO DE DIREITO DO');
})());

// -------------------------------------------------------------------- estilo
console.log('\nstyle card');

const amostraA = join(raiz, 'amostra-a.txt');
const amostraB = join(raiz, 'amostra-b.txt');
writeFileSync(amostraA, [
  'Excelencia, a Requerente vem expor o que segue.',
  'A Requerida foi notificada, conforme documento anexo.',
  'Vejamos o que diz a norma. Excelencia, com o devido respeito, a Requerida errou.',
].join('\n'), 'utf8');
// A segunda amostra mistura os dois pares para a mesma parte — o achado do corpus.
writeFileSync(amostraB, [
  'A Requerente e parte legitima. O Autor juntou os documentos.',
  'A Re foi citada e nao contestou.',
].join('\n'), 'utf8');

const est = run('estilo', '--de', `${amostraA},${amostraB}`);
ok('deriva o card das amostras', est.codigo === 0 && existsSync(join(raiz, 'estilo.yaml')));

const card = () => lerLF(raiz, 'estilo.yaml');
ok('o card declara o n', card().includes('n: 2'));
ok('cada traco traz em quantas apareceu', card().includes('em: 1/2') || card().includes('em: 2/2'));
ok('o card diz que DESCREVE e nao prescreve', card().includes('DESCREVE, e nao prescreve'));
ok('e diz por que a amostra nao sustenta regra', card().includes('porcentagem de exito'));
ok('nenhuma linha manda escrever de um jeito', !/escreva assim|use "|prefira /i.test(card().replace(/^#.*$/gm, '')));
ok('conta as pecas que misturam rotulo', card().includes('OS DOIS pares'));
ok('o terminal avisa da mistura', est.saida.includes('usam OS DOIS pares'));

ok('estilo sem --de mostra o card', run('estilo').saida.includes('derivado_em'));
ok('sem card, manda derivar das pecas do escritorio', (() => {
  const r = rodarEm(beta)('estilo');
  return r.saida.includes('estilo.yaml') || r.codigo === 0;
})());

// O unico gate que o card habilita, e ele nao depende do card.
ok('gate avisa quando a peca usa os dois rotulos', (() => {
  writeFileSync(entPath, ent.replace('texto '.repeat(200),
    'A Requerente pagou. O Autor juntou o comprovante. A Requerida nao contestou.'), 'utf8');
  const r = emAcme('validate');
  const linha = r.saida.split('\n').find((l) => l.includes('dois pares de rotulo'));
  return Boolean(linha) && linha.includes('aviso');
})());
ok('peca com um rotulo so nao gera aviso', (() => {
  writeFileSync(entPath, ent.replace('texto '.repeat(200),
    'A Requerente pagou. A Requerida nao contestou.'), 'utf8');
  return !emAcme('validate').saida.includes('dois pares de rotulo');
})());

writeFileSync(entPath, ent, 'utf8');
emAcme('build', '1');

// ---------------------------------------------------------------- importar
console.log('\nimportar peca arquivada');

// CPF valido e CPF com digito que nao fecha, lado a lado. O invalido e o caso
// do corpus: numa peca real, o CPF de um requerente nao existe — e importar sem
// conferir o teria propagado para a ficha da carteira.
const CPF_BOM = '529.982.247-25';
const CPF_RUIM = '529.982.247-99';
const pecaArquivada = join(raiz, 'peca-antiga.txt');
writeFileSync(pecaArquivada, [
  'EXCELENTISSIMO SENHOR DOUTOR JUIZ DE DIREITO DA 2a VARA CIVEL DA COMARCA DE ARAPONGAS - PR',
  '',
  `JOAO DA SILVA SAURO, brasileiro, casado, inscrito no CPF ${CPF_BOM}, e`,
  `MARIA DE SOUZA LIMA, brasileira, solteira, inscrita no CPF ${CPF_RUIM}, vem propor acao`,
  'em face de INDUSTRIA ZEBRA LTDA, pessoa juridica de direito privado, CNPJ 11.222.333/0001-81.',
  '',
  'Em 14/03/2024 houve a cobranca de R$ 8.500,00, conforme fatura anexo.',
  'Em 02/04/2024 a autora reclamou, conforme protocolo anexo.',
].join('\n'), 'utf8');

const imp = run('importar', pecaArquivada);
const relImp = join(raiz, 'docs', 'importado-peca-antiga.md');
ok('importa e grava o relatorio', imp.codigo === 0 && existsSync(relImp));

const rel = () => lerLF(relImp);
ok('CPF valido entra classificado', rel().includes(`${CPF_BOM}  _(CPF)_`));
ok('CPF com digito que nao fecha entra MARCADO, e nao em silencio',
  rel().includes(CPF_RUIM) && rel().includes('DIGITO VERIFICADOR NAO FECHA'));
ok('o terminal tambem avisa do digito', imp.saida.includes('digito nao fecha'));
ok('CNPJ valido entra', rel().includes('11.222.333/0001-81'));
ok('enderecamento extraido', rel().includes('VARA CIVEL DA COMARCA DE ARAPONGAS'));
ok('nomes candidatos extraidos', rel().includes('JOAO DA SILVA SAURO') && rel().includes('INDUSTRIA ZEBRA LTDA'));
ok('datas extraidas', rel().includes('2024-03-14') && rel().includes('2024-04-02'));
ok('valores extraidos', rel().includes('R$ 8.500,00'));
ok('trecho que aponta anexo extraido', rel().toLowerCase().includes('conforme'));

// A propriedade central: nada e afirmado.
// So as secoes de extracao: a secao final "o que NAO extraiu" tambem tem
// bullets, e eles sao texto explicativo, nao item pendente.
ok('TUDO o que foi extraido entra como pendente', (() => {
  const corpo = rel().split('## O que esta importacao NAO extraiu')[0];
  const linhas = corpo.split('\n').filter((l) => l.startsWith('- ') && !l.startsWith('- _'));
  return linhas.length > 5 && linhas.every((l) => l.startsWith('- [ ] '));
})());
ok('a secao do que NAO foi extraido esta la', rel().includes('O que esta importacao NAO extraiu'));
ok('e ela diz que a tese nao sai por regra', rel().includes('a tese'));
ok('e que a lista de nomes pode estar incompleta', rel().includes('pode estar incompleta'));

// Ficha da carteira e sugerida, e nunca gravada — ela e a fonte de todas as
// pecas seguintes.
ok('a ficha da carteira e sugerida, e nao criada', (() => {
  const sugere = rel().includes('attorneyfw parte new "JOAO DA SILVA SAURO"');
  const naoCriou = !existsSync(join(raiz, 'partes', 'joao-da-silva-sauro.md'));
  return sugere && naoCriou;
})());
ok('o relatorio diz que os comandos nao foram executados', rel().includes('nao foram executados'));

// Nada toca tese, plano ou contrato de topico.
ok('a importacao nao cria tese nem plano', (() => {
  const antes = violacoes(emAcme('validate')).length;
  emAcme('importar', pecaArquivada);
  return violacoes(emAcme('validate')).length === antes
    && !existsSync(join(acme, 'docs', 'tese', 'importado.md'));
})());

ok('o arquivo de origem nao e alterado', (() => {
  const t = lerLF(pecaArquivada);
  run('importar', pecaArquivada);
  return lerLF(pecaArquivada) === t;
})());

ok('PDF e recusado com instrucao', (() => {
  const pdf = join(raiz, 'x.pdf');
  writeFileSync(pdf, '%PDF-1.4', 'utf8');
  const r = run('importar', pdf);
  return r.codigo === 1 && r.saida.includes('fora do escopo');
})());
ok('extensao desconhecida e recusada', (() => {
  const odd = join(raiz, 'x.rtf');
  writeFileSync(odd, 'nada', 'utf8');
  return run('importar', odd).codigo === 1;
})());
ok('arquivo inexistente e recusado', run('importar', join(raiz, 'nao-existe.txt')).codigo === 1);

// --------------------------------------------------------- canon da carteira
console.log('\ncanon da carteira');

const CNPJ_MATRIZ = '11.222.333/0001-81';
const CNPJ_FILIAL = '11.222.333/0002-62';

ok('documento e obrigatorio', run('parte', 'new', 'Alfa Ltda').codigo === 1);
ok('documento com digito verificador errado e recusado',
  run('parte', 'new', 'Alfa Ltda', '--documento', '11.222.333/0001-99').codigo === 1);
ok('parte nova na carteira',
  run('parte', 'new', 'Industria Alfa Ltda', '--documento', CNPJ_MATRIZ, '--slug', 'alfa').codigo === 0);
ok('documento repetido e recusado — uma qualificacao por documento', (() => {
  const r = run('parte', 'new', 'Outra Razao Social', '--documento', CNPJ_MATRIZ, '--slug', 'outra');
  return r.codigo === 1 && r.saida.includes('alfa');
})());

// Matriz e filial sao fichas distintas. Tratar filial como campo de endereco da
// matriz foi o que produziu a divergencia que originou esta onda.
ok('filial e ficha propria, ligada a matriz',
  run('parte', 'new', 'Industria Alfa — filial', '--documento', CNPJ_FILIAL,
    '--matriz', 'alfa', '--slug', 'alfa-filial').codigo === 0);
ok('matriz inexistente e recusada',
  run('parte', 'new', 'X Ltda', '--documento', '11.444.777/0001-61', '--matriz', 'nao-existe', '--slug', 'x').codigo === 1);
ok('parte list mostra a filial como filial', run('parte', 'list').saida.includes('filial de alfa'));

// A materia referencia em vez de redigitar.
ok('canon new parte --ref liga a ficha da carteira', (() => {
  const r = emAcme('canon', 'new', 'parte', 'Industria Alfa Ltda', '--papel', 'autor', '--ref', 'alfa');
  return r.codigo === 0 && r.saida.includes('herdada');
})());
ok('--ref inexistente e recusado',
  emAcme('canon', 'new', 'parte', 'Beta Ltda', '--ref', 'nao-existe').codigo === 1);

const fichaAlfa = join(acme, 'docs', 'canon', 'partes', 'industria-alfa-ltda.md');
ok('a ficha da materia guarda o ref', lerLF(fichaAlfa).includes('ref: alfa'));
// A propriedade e "a ficha referenciada nao gera violacao" — nao "o gate passa".
ok('ficha referenciada nao gera violacao', (() => {
  const v = violacoes(emAcme('validate'));
  if (!v.some((l) => /carteira|ref /.test(l))) return true;
  console.log(v.map((l) => `       ${l}`).join('\n'));
  return false;
})());

// O caso do corpus: o mesmo documento com duas qualificacoes. Aqui reprovar e o
// certo — nao ha caso legitimo em que o mesmo CNPJ tenha duas sedes.
ok('documento divergente da carteira reprova o gate', (() => {
  const bom = lerLF(fichaAlfa);
  writeFileSync(fichaAlfa, bom.replace(/^documento:.*$/m, `documento: ${CNPJ_FILIAL}`), 'utf8');
  const r = emAcme('validate');
  writeFileSync(fichaAlfa, bom, 'utf8');
  return r.codigo === 1 && r.saida.includes('documento diverge da carteira');
})());
ok('a reprovacao mostra os dois lados', (() => {
  const bom = lerLF(fichaAlfa);
  writeFileSync(fichaAlfa, bom.replace(/^nome:.*$/m, 'nome: Industria Alfa S/A'), 'utf8');
  const r = emAcme('validate');
  writeFileSync(fichaAlfa, bom, 'utf8');
  return r.saida.includes('Industria Alfa S/A') && r.saida.includes('Industria Alfa Ltda');
})());

// Ficha antiga, sem ref, continua carregando.
ok('ficha sem ref carrega sem migracao', (() => {
  emAcme('canon', 'new', 'parte', 'Parte Antiga Sem Ref', '--papel', 'reu');
  return !violacoes(emAcme('validate')).some((l) => /carteira|ref /.test(l));
})());

ok('buscar acha a materia pelo nome da parte', run('buscar', 'Industria Alfa').saida.includes('acme'));
ok('buscar acha pelo documento, com pontuacao', run('buscar', CNPJ_MATRIZ).saida.includes('acme'));
ok('buscar acha pelo documento, sem pontuacao', run('buscar', '11222333000181').saida.includes('acme'));
ok('o diagrama de partes usa o nome da carteira', (() => {
  const r = emAcme('diagrama', 'partes');
  return r.saida.includes('Industria Alfa Ltda') && r.saida.includes(CNPJ_MATRIZ);
})());

// ------------------------------------------------------- conferencia numerica
console.log('\nconferencia numerica');

// Os tres casos vieram do corpus e foram conferidos a mao ANTES do teste.
// 7.155,76 + 27,10 = 7.182,86; o extenso do alvara dizia "oitenta centavos".
writeFileSync(entPath, ent.replace('texto '.repeat(200), [
  'Foi depositada a quantia de R$ 7.155,76 (sete mil cento e cinquenta e cinco reais e setenta e seis centavos).',
  '',
  'Alem do deposito havia R$ 27,10 (vinte e sete reais e dez centavos), totalizando assim o saldo de R$ 7.182,86 (sete mil cento e oitenta e dois reais e oitenta centavos).',
  '',
  'Os aparelhos recebidos sem solicitacao foram:',
  '',
  '1- 988002419;',
  '2- 988025333;',
  '3- 988041029;',
  '4- 98841;1749;',
  '5- 988046595;',
  '6- 988055574;',
  '',
  'Diante do exposto, requer seja declarada a inexistencia de debito dos numeros 988002419; 988025333; 988041029; 98841;1749; 988046595 e 988055574, referentes a fatura n. 114405363.',
].join('\n')), 'utf8');
emAcme('build', '1');

const conf = emAcme('conferir', '1');
ok('conferir sai com 1 quando ha divergencia', conf.codigo === 1);
ok('extenso divergente do algarismo e apontado',
  conf.saida.includes('7.182,86') && conf.saida.includes('7.182,80'));
ok('a soma que fecha nao vira alarme', !conf.saida.includes('soma x total'));
ok('item malformado e apontado como malformado, e nao como indice faltante',
  conf.saida.includes('98841;1749') && conf.saida.includes('item 4') && !conf.saida.includes('falta'));
ok('numero de fatura nao vira item do pedido', !conf.saida.includes('114405363'));
ok('nada e corrigido', (() => {
  const md = readFileSync(join(acme, 'saida', 'ent-01-peticao-inicial.md'), 'utf8');
  return md.includes('oitenta centavos') && md.includes('98841;1749');
})());
ok('a divergencia sai como par, com os dois lados', conf.saida.includes('algarismo') && conf.saida.includes('por extenso'));
ok('--json nao corrige', (() => {
  const r = emAcme('conferir', '1', '--json');
  try { const j = JSON.parse(r.saida); return j.corrigiu === false && j.achados.length >= 2; }
  catch { return false; }
})());

// Soma que NAO fecha tem de acusar, e a janela recua paragrafo para achar a
// parcela que ficou para tras — no alvara, uma delas estava dois atras.
ok('soma que nao fecha e apontada', (() => {
  writeFileSync(entPath, ent.replace('texto '.repeat(200), [
    'Pagou-se R$ 100,00 (cem reais) na primeira parcela.',
    '',
    'E mais R$ 50,00 (cinquenta reais), totalizando R$ 160,00 (cento e sessenta reais).',
  ].join('\n')), 'utf8');
  emAcme('build', '1');
  const r = emAcme('conferir', '1');
  return r.saida.includes('soma x total') && r.saida.includes('160,00');
})());

ok('peca sem divergencia passa limpa', (() => {
  writeFileSync(entPath, ent.replace('texto '.repeat(200),
    'Pagou-se R$ 100,00 (cem reais) e mais R$ 50,00 (cinquenta reais), totalizando R$ 150,00 (cento e cinquenta reais).'), 'utf8');
  emAcme('build', '1');
  const r = emAcme('conferir', '1');
  return r.codigo === 0 && r.saida.includes('Nenhuma divergencia');
})());

writeFileSync(entPath, ent, 'utf8');
emAcme('build', '1');

// ------------------------------------------------------- dado pessoal na peca
console.log('\ndado pessoal');

// CPF e CNPJ validos, gerados para o teste. O reconhecedor confere digito
// verificador justamente para nao alarmar em cima de numero de processo.
const CPF_OK = '529.982.247-25';
const CNPJ_OK = '11.222.333/0001-81';

writeFileSync(entPath, ent.replace('texto '.repeat(200),
  [`O autor JOSE CARLOS DE ALMEIDA, CPF ${CPF_OK}, contratou a`,
   `Industria Zebra Ltda, CNPJ ${CNPJ_OK}, pelo e-mail contato@zebra.com.br.`,
   'Jose Carlos de Almeida assinou o instrumento.',
   'Processo n. 0001234-56.2020.8.16.0000 nao e telefone.'].join('\n')), 'utf8');
emAcme('build', '1');
const saidaMd = join(acme, 'saida', 'ent-01-peticao-inicial.md');

const det = emAcme('dados', '1');
ok('detecta CPF com digito verificador', det.saida.includes(CPF_OK));
ok('detecta CNPJ e e-mail', det.saida.includes(CNPJ_OK) && det.saida.includes('zebra.com.br'));
ok('numero de processo nao vira telefone nem cartao', !det.saida.includes('0001234'));
ok('a saida diz que reconhece formato, e nao pessoa', det.saida.includes('FORMATO, e nao pessoa'));
ok('deteccao nao altera o arquivo', (() => {
  const antes = readFileSync(saidaMd, 'utf8');
  emAcme('dados', '1');
  return readFileSync(saidaMd, 'utf8') === antes;
})());
ok('sem mapa, manda criar o mapa', det.saida.includes('anonimizar --init'));

ok('anonimizar --init cria o mapa', emAcme('anonimizar', '--init').codigo === 0);
ok('--init nao sobrescreve', emAcme('anonimizar', '--init').codigo === 1);

const mapa = join(acme, 'anonimizacao.yaml');
const escreveMapa = (linhas) => writeFileSync(mapa, `${lerLF(mapa)}\n${linhas.join('\n')}\n`, 'utf8');
const mapaBase = lerLF(mapa);

// --- as quatro recusas, todas antes de gravar qualquer coisa
const semGravar = () => readFileSync(saidaMd, 'utf8');
const antesDeTudo = semGravar();

ok('par curto demais e recusado', (() => {
  writeFileSync(mapa, `${mapaBase}\nJos: Ful\n`, 'utf8');
  const r = emAcme('anonimizar', '1');
  return r.codigo === 1 && r.saida.includes('4 caracteres') && semGravar() === antesDeTudo;
})());

ok('ficticio que ja existe no texto e recusado', (() => {
  writeFileSync(mapa, `${mapaBase}\nIndustria Zebra Ltda: Jose Carlos de Almeida\n`, 'utf8');
  const r = emAcme('anonimizar', '1');
  return r.codigo === 1 && r.saida.includes('ja aparece no texto');
})());

ok('cascata entre pares e recusada', (() => {
  writeFileSync(mapa, `${mapaBase}\nJose Carlos de Almeida: Fulano de Tal\nFulano de Tal: Beltrano\n`, 'utf8');
  const r = emAcme('anonimizar', '1');
  return r.codigo === 1 && r.saida.includes('resultado de um par');
})());

// A peca escreve o mesmo nome em MAIUSCULA e em caixa mista. As duas voltam
// iguais, entao as duas passam.
ok('a forma declarada e a MAIUSCULA sao aceitas juntas', (() => {
  writeFileSync(mapa, `${mapaBase}\nJose Carlos de Almeida: Fulano de Tal\n${CPF_OK}: 000.000.000-00\n`, 'utf8');
  const r = emAcme('anonimizar', '1');
  const anon = readFileSync(saidaMd.replace('.md', '-anonimizado.md'), 'utf8');
  return r.codigo === 0
    && anon.includes('FULANO DE TAL')            // veio de JOSE CARLOS DE ALMEIDA
    && anon.includes('Fulano de Tal')            // veio de Jose Carlos de Almeida
    && !anon.includes('Almeida')
    && anon.includes('000.000.000-00');
})());

ok('caixa nao declarada falha dizendo qual acrescentar', (() => {
  writeFileSync(saidaMd, `${antesDeTudo}\nJOSE carlos DE almeida compareceu.\n`, 'utf8');
  const r = emAcme('anonimizar', '1');
  writeFileSync(saidaMd, antesDeTudo, 'utf8');
  return r.codigo === 1 && r.saida.includes('outra caixa');
})());

// A propriedade central: ida e volta byte a byte.
ok('ida e volta devolve o original byte a byte', (() => {
  const original = readFileSync(saidaMd, 'utf8');
  emAcme('anonimizar', '1');
  emAcme('anonimizar', '1', '--reverter');
  return readFileSync(saidaMd, 'utf8') === original;
})());

ok('com o mapa, o detector marca o que esta dentro dele', (() => {
  const r = emAcme('dados', '1');
  return r.saida.includes('no mapa');
})());
// A propriedade e "avisa, e nao reprova" — nao "o gate passa". Amarrar ao
// codigo de saida acoplaria este teste a toda violacao que a fixture tiver por
// outro motivo, e ele passaria a quebrar sem que nada de errado acontecesse.
ok('gate avisa sobre dado na saida, e nao reprova por isso', (() => {
  const r = emAcme('validate');
  const linha = r.saida.split('\n').find((l) => l.includes('formato reconhecivel'));
  return Boolean(linha) && linha.includes('aviso');
})());

writeFileSync(entPath, ent, 'utf8');
emAcme('build', '1');

// ------------------------------------------------------------------ diagramas
console.log('\nvisual law');

ok('diagrama inexistente e recusado', emAcme('diagrama', 'zebra').codigo === 1);
ok('linha do tempo sem cronologia preenchida e recusada com instrucao', (() => {
  const r = emAcme('diagrama', 'linha-do-tempo');
  return r.codigo === 1 && r.saida.includes('cronologia');
})());

// A cronologia e a fonte. D1 esta no canon; D9 nao, e o marco sem documento
// tem de sair marcado — figura que esconde o nao provado mente com mais
// autoridade que o paragrafo.
const cronoArq = join(acme, 'docs', 'canon', 'cronologia.md');
writeFileSync(cronoArq, lerLF(cronoArq).replace(
  '|  |  |  |  |',
  ['| 2024-03-14 | Cobranca indevida na fatura | D1 | autos |',
   '| 2024-04-02 | Reclamacao no SAC | D9 | autos |',
   '| 2024-05-10 | Negativacao | | autos |'].join('\n'),
), 'utf8');

const lt = emAcme('diagrama', 'linha-do-tempo');
ok('linha do tempo sai em mermaid', lt.saida.includes('```mermaid') && lt.saida.includes('flowchart TD'));
ok('marco provado carrega o documento', lt.saida.includes('Cobranca indevida') && lt.saida.includes('<i>D1</i>'));
ok('marco sem documento sai marcado', lt.saida.includes('NAO PROVADO'));
ok('documento fora do canon nao passa por provado', lt.saida.includes('fora do canon'));
ok('a saida avisa quantos sairao nao provados', lt.saida.includes('nao provado'));
ok('a ordem da cronologia vira a ordem do grafo', lt.saida.includes('M0 --> M1'));

// Leitura por NOME de coluna, nao por posicao: escritorio troca a ordem sem avisar.
ok('tabela lida por nome de coluna', (() => {
  writeFileSync(cronoArq, lerLF(cronoArq)
    .replace('| Data | Fato | Documento | Fonte |', '| Fonte | Documento | Fato | Data |')
    .replace('| 2024-03-14 | Cobranca indevida na fatura | D1 | autos |',
      '| autos | D1 | Cobranca indevida na fatura | 2024-03-14 |'), 'utf8');
  const r = emAcme('diagrama', 'linha-do-tempo');
  return r.saida.includes('2024-03-14') && r.saida.includes('<i>D1</i>');
})());

ok('organograma de partes sai do canon', (() => {
  const r = emAcme('diagrama', 'partes');
  return r.saida.includes('Acme Ltda') && r.saida.includes('autor');
})());
ok('fato-prova liga F ao D que o paga', (() => {
  const r = emAcme('diagrama', 'fato-prova');
  return r.saida.includes('F1') && r.saida.includes('D1') && r.saida.includes('Fatura contestada');
})());
ok('--salvar grava a fonte em texto, versionavel', (() => {
  emAcme('diagrama', 'partes', '--salvar');
  return existsSync(join(acme, 'docs', 'diagramas', 'partes.mmd'));
})());

// O build embute onde a peca pedir, e nao adivinha.
writeFileSync(entPath, ent.replace('texto '.repeat(200),
  ['```diagrama', 'linha-do-tempo', '```', '', 'texto '.repeat(50)].join('\n')), 'utf8');
const comFig = emAcme('build', '1');
ok('build embute o diagrama pedido', comFig.saida.includes('1 diagrama'));
ok('o mermaid entra no markdown da saida',
  readFileSync(join(acme, 'saida', 'ent-01-peticao-inicial.md'), 'utf8').includes('```mermaid'));

// Falta de figura nao pode impedir protocolo.
writeFileSync(entPath, ent.replace('texto '.repeat(200), ['```diagrama', 'zebra', '```'].join('\n')), 'utf8');
const semFig = emAcme('build', '1');
ok('diagrama que falha nao derruba o build', semFig.codigo === 0);
ok('a peca sai com aviso no lugar da figura',
  readFileSync(join(acme, 'saida', 'ent-01-peticao-inicial.md'), 'utf8').includes('NAO GERADO'));

// Comentario HTML nesta ferramenta ja quer dizer nota de trabalho, e o
// `textoDe` o remove antes de a peca sair. Usa-lo de marca pediria uma figura
// que desaparece antes de o build ver, em silencio.
ok('comentario HTML nao serve de marca — ele e nota de trabalho', (() => {
  writeFileSync(entPath, ent.replace('texto '.repeat(200), '<!-- diagrama: linha-do-tempo -->'), 'utf8');
  const r = emAcme('build', '1');
  const md = readFileSync(join(acme, 'saida', 'ent-01-peticao-inicial.md'), 'utf8');
  return r.codigo === 0 && !md.includes('mermaid') && !md.includes('diagrama:');
})());

writeFileSync(entPath, ent, 'utf8');
emAcme('build', '1');

// ------------------------------------------------------- memoria da carteira
console.log('\nmemoria da carteira');

ok('resultado fora do vocabulario e recusado', emAcme('materia', 'fechar', 'quase').codigo === 1);
ok('materia fechar grava o desfecho',
  emAcme('materia', 'fechar', 'perda', '--em', '2026-08-20', '--valor', '0',
    '--nota', 'improcedencia mantida em segundo grau').codigo === 0);

// `resultado:ganho` sem espaco nao e YAML: e string solta. O gravador reescreve
// a chave inteira, e nao so o valor, exatamente para nao produzir isso.
ok('o campo sai como par YAML de verdade', (() => {
  const y = lerLF(acme, 'materia.yaml');
  return y.includes('resultado: perda') && y.includes('resultado_em: 2026-08-20');
})());
ok('materia list mostra o desfecho', run('materia', 'list').saida.includes('perda'));
ok('status na raiz mostra o placar', run('status').saida.includes('encerradas 1/'));

// A busca le a tese; nao le o corpo da minuta. Um termo que so existe no corpo
// nao pode aparecer, senao a busca casa com o que foi CITADO em vez do que foi
// SUSTENTADO — e ruido treina a ignorar o resultado.
writeFileSync(join(acme, 'docs', 'tese', teseArq),
  lerLF(acme, 'docs', 'tese', teseArq).replace('## Fundamento', '## Fundamento\n\nSumula zebrafundamento do STJ.'), 'utf8');
writeFileSync(entPath, ent.replace('texto '.repeat(200), 'zebraminuta '.repeat(50)), 'utf8');

ok('buscar acha na tese', run('buscar', 'zebrafundamento').saida.includes('acme'));
ok('buscar devolve materia com desfecho', run('buscar', 'zebrafundamento').saida.includes('perda'));
ok('buscar nao le corpo de minuta', (() => {
  const r = run('buscar', 'zebraminuta');
  return !r.saida.includes('acme') && r.saida.includes('nada');
})());
ok('buscar diz o que varreu', run('buscar', 'zebraminuta').saida.includes('corpo de minuta'));
ok('buscar filtra por resultado',
  run('buscar', 'zebrafundamento', '--resultado', 'ganho').saida.includes('0 de'));
ok('buscar avisa quando a tese ja foi perdida',
  run('buscar', 'zebrafundamento').saida.includes('terminaram em perda'));
ok('buscar --json declara o que nao varre', (() => {
  const r = run('buscar', 'zebrafundamento', '--json');
  try { return JSON.parse(r.saida).naoVarrido.includes('minuta'); } catch { return false; }
})());
ok('buscar sem termo e recusado', run('buscar').codigo === 1);

// Materia irma encerrada tem de chegar a quem redige sem ninguem pedir.
ok('context empurra as materias ja encerradas',
  emBeta('context').saida.includes('Materias ja encerradas') && emBeta('context').saida.includes('acme'));
ok('context traz o desfecho da propria materia', emBeta('context').saida.includes('desfecho em curso'));

writeFileSync(entPath, ent, 'utf8');

// ------------------------------------------------------------------- dinheiro
console.log('\ncorrecao monetaria');

// Serie sintetica, com a aritmetica conferida a mao antes de escrever o teste:
//   indice(2024-01) = 100      x 1,01  = 101
//   indice(2024-02) = 101      x 1,02  = 103,02
//   indice(2024-03) = 103,02   x 1,005 = 103,5351
// Corrigir de 2024-01 para 2024-03 e 103,5351 / 101 = 1,02 x 1,005 = 1,0251 exato.
// R$ 1.000,00 x 1,0251 = R$ 1.025,10.
const SERIE_BOA = [
  '# serie: inpc', '# unidade: variacao-mensal-pct', '# fonte: IBGE (sintetica, smoke)',
  '# coletada_em: 2024-04-01', 'mes,valor',
  '2024-01,1.00', '2024-02,2.00', '2024-03,0.50', '',
].join('\n');
mkdirSync(join(raiz, 'tabelas', 'indices'), { recursive: true });
const serieArq = join(raiz, 'tabelas', 'indices', 'inpc.csv');
writeFileSync(serieArq, SERIE_BOA);

const corr = run('atualizar', '1000,00', '--de', '2024-01-15', '--ate', '2024-03-20');
ok('correcao bate com a conta feita a mao', corr.saida.includes('1.025,10'));
ok('fator acumulado exato', corr.saida.includes('1.02510000'));
ok('memoria sai sempre', corr.saida.includes('memoria de calculo') && corr.saida.includes('2024-03'));
ok('mes do termo inicial e base, e nao linha da memoria',
  corr.saida.split('memoria de calculo')[1].includes('2024-02')
  && !corr.saida.split('memoria de calculo')[1].includes('2024-01  '));
ok('procedencia sai junto', corr.saida.includes('procedencia') && corr.saida.includes('coletada'));
ok('ressalva de conferencia na saida', corr.saida.includes('nao calculo oficial'));

// 65 dias corridos de 15.01 a 20.03.2024 (ano bissexto) = 2,1666667 meses.
// 1% ao mes sobre R$ 1.025,10 = R$ 22,21. Total R$ 1.047,31.
const comJuros = run('atualizar', '1000,00', '--de', '2024-01-15', '--ate', '2024-03-20', '--juros', '1');
ok('juros simples pro rata die', comJuros.saida.includes('1.047,31'));

ok('--json devolve o total em centavos', (() => {
  const r = run('atualizar', '1000,00', '--de', '2024-01-15', '--ate', '2024-03-20', '--juros', '1', '--json');
  try { return JSON.parse(r.saida).total === 104731; } catch { return false; }
})());

// Estimar fora da cobertura e a forma mais facil de produzir numero errado com
// aparencia de certo. O comando tem de parar, e dizer ate onde a serie vai.
const foraDaSerie = run('atualizar', '1000,00', '--de', '2023-01-15', '--ate', '2024-03-20');
ok('fora da cobertura falha', foraDaSerie.codigo === 1 && foraDaSerie.saida.includes('2024-01'));
ok('a falha diz o que rodar', foraDaSerie.saida.includes('indice atualizar'));

// Buraco no meio e pior que serie curta: a razao entre dois pontos passaria por
// cima do mes faltante e devolveria fator menor, sem nenhum sinal.
writeFileSync(serieArq, SERIE_BOA.replace('2024-02,2.00\n', ''));
const comBuraco = run('atualizar', '1000,00', '--de', '2024-01-15', '--ate', '2024-03-20');
ok('buraco na serie falha em vez de silenciar', comBuraco.codigo === 1 && comBuraco.saida.includes('buraco'));
writeFileSync(serieArq, SERIE_BOA);

// Serie sem procedencia nao vai para peca.
writeFileSync(serieArq, 'mes,valor\n2024-01,1.00\n2024-02,2.00\n2024-03,0.50\n');
ok('serie sem fonte e sem data e recusada',
  run('atualizar', '1000,00', '--de', '2024-01-15').codigo === 1);
writeFileSync(serieArq, SERIE_BOA);

ok('indice lista o que a carteira tem', run('indice').saida.includes('2024-01'));
ok('serie desconhecida nao e adivinhada', run('atualizar', '10', '--de', '2024-01-15', '--serie', 'xpto').codigo === 1);

// ------------------------------------------- amostra jurisprudencial e semaforo
console.log('\namostra e prognostico');

ok('julgado sem identificador e recusado', emAcme('jurisprudencia', 'add').codigo === 1);
ok('resultado fora do vocabulario e recusado',
  emAcme('jurisprudencia', 'add', 'X-1', '--resultado', 'talvez').codigo === 1);
ok('identificador com barra vertical e recusado — quebraria a tabela',
  emAcme('jurisprudencia', 'add', 'A | B').codigo === 1);

// Classificar sem ter lido e o defeito que esta amostra existe para evitar.
const semLer = emAcme('jurisprudencia', 'add', '0002079-26.2017.8.16.0004',
  '--tribunal', 'TJPR', '--data', '2018-08-16', '--resultado', 'favoravel');
ok('classificado sem --lido avisa', semLer.saida.includes('PENDENTE DE LEITURA'));
ok('e entra como pendente, nao como favoravel',
  emAcme('jurisprudencia').saida.includes('pendente'));

ok('com --lido entra classificado', (() => {
  emAcme('jurisprudencia', 'add', '1514292-8', '--tribunal', 'TJPR',
    '--data', '2016-11-22', '--resultado', 'favoravel', '--lido', '--razao', 'enfrenta a objecao pelo nome');
  const r = emAcme('jurisprudencia');
  return r.saida.includes('favoravel') && r.saida.includes('enfrenta a objecao');
})());
ok('a saida declara o n da amostra', emAcme('jurisprudencia').saida.includes('amostra de 2'));
ok('e diz que nao e censo', emAcme('jurisprudencia').saida.includes('nao censo'));
ok('nenhuma porcentagem sai da amostra', !/\d+([.,]\d+)?%/.test(emAcme('jurisprudencia').saida));
ok('--json nao traz universo', (() => {
  const r = emAcme('jurisprudencia', '--json');
  try { const j = JSON.parse(r.saida); return j.n === 2 && j.universo === null && j.lidos === 1; }
  catch { return false; }
})());

// O semaforo se testa pela transicao, e nao pela luz num instante: a luz depende
// de todo o estado da materia, e um teste que a fixa quebra a cada regra nova
// sem nada de errado ter acontecido. O que tem de valer e a regra.
const antes = JSON.parse(emAcme('prognostico', '--json').saida);
ok('julgado nao lido e reserva, e nao impeditivo',
  antes.reservas.some((x) => x.razao.includes('nao lidos')));
ok('cada reserva tem endereco', antes.reservas.every((x) => x.onde && x.razao));

// Julgado contrario lido e nao distinguido e impeditivo.
ok('julgado contrario lido acrescenta um impeditivo e pinta de vermelho', (() => {
  emAcme('jurisprudencia', 'add', 'CONTRA-1', '--tribunal', 'TJPR', '--resultado', 'contrario', '--lido');
  const r = emAcme('prognostico');
  const dep = JSON.parse(emAcme('prognostico', '--json').saida);
  return dep.semaforo === 'vermelho'
    && dep.impeditivos.length === antes.impeditivos.length + 1
    && dep.impeditivos.some((x) => x.razao.includes('CONTRA-1'))
    && r.codigo === 1;
})());

ok('a recusa da porcentagem sai na propria saida',
  emAcme('prognostico').saida.includes('NAO e probabilidade de exito'));
ok('nenhuma porcentagem sai do prognostico', !/\d+([.,]\d+)?%/.test(emAcme('prognostico').saida));
ok('--json declara probabilidadeDeExito null', (() => {
  const r = emAcme('prognostico', '--json');
  try { const j = JSON.parse(r.saida); return j.probabilidadeDeExito === null && j.semaforo === 'vermelho'; }
  catch { return false; }
})());
ok('cada impeditivo tem endereco', (() => {
  const r = emAcme('prognostico', '--json');
  try { return JSON.parse(r.saida).impeditivos.every((x) => x.onde && x.razao); } catch { return false; }
})());

// ----------------------------------------------------------------- relatorio
console.log('\nrelatorio ao cliente');

// A regra inteira deste comando esta no sinal: os mesmos dois numeros sao ganho
// para o reu e perda parcial para o autor. Por isso os dois casos sao testados
// com os MESMOS valores, e o que muda e so o papel.
const matAcme = join(acme, 'materia.yaml');
const yamlBase = lerLF(matAcme)
  .replace(/^valor_pedido:.*$/m, 'valor_pedido: 50000,00')
  .replace(/^resultado_valor:.*$/m, 'resultado_valor: 20000,00');
writeFileSync(matAcme, yamlBase, 'utf8');

// A ficha do canon diz "autor" — o cliente pediu 50 mil e obteve 20 mil.
const comoAutor = emAcme('relatorio');
ok('polo ativo: ganho e o que entrou', comoAutor.saida.includes('20.000,00'));
ok('polo ativo: a proporcao e do que se pediu', comoAutor.saida.includes('40.0%'));
ok('relatorio grava o markdown', existsSync(join(acme, 'saida', 'relatorio-acme.md')));
ok('sem data de referencia, avisa que o valor e nominal', comoAutor.saida.includes('NOMINAIS'));

// Mesmos numeros, papel trocado: o ganho passa a ser o que se deixou de pagar.
const fichaParte = join(acme, 'docs', 'canon', 'partes', 'acme-ltda.md');
writeFileSync(fichaParte, lerLF(fichaParte).replace(/^papel: .*$/m, 'papel: reu'), 'utf8');
const comoReu = emAcme('relatorio');
ok('polo passivo: ganho e o que se deixou de pagar', comoReu.saida.includes('30.000,00'));
ok('polo passivo: 60% do que era exigido', comoReu.saida.includes('60.0%'));
ok('o texto diz "deixou de pagar" so no polo passivo',
  readFileSync(join(acme, 'saida', 'relatorio-acme.md'), 'utf8').includes('deixou de pagar'));

// O polo nao se infere. Papel fora do vocabulario tem de parar o comando.
ok('papel desconhecido para o relatorio', (() => {
  writeFileSync(fichaParte, lerLF(fichaParte).replace(/^papel: .*$/m, 'papel: interessado'), 'utf8');
  const r = emAcme('relatorio');
  writeFileSync(fichaParte, lerLF(fichaParte).replace(/^papel: .*$/m, 'papel: autor'), 'utf8');
  return r.codigo === 1 && r.saida.includes('de que lado');
})());

// Com data de referencia, corrige pela serie da onda 1.
ok('com valor_pedido_em, corrige e mostra o fator', (() => {
  writeFileSync(matAcme, yamlBase
    .replace(/^valor_pedido_em:.*$/m, 'valor_pedido_em: 2024-01-15')
    .replace(/^resultado_em:.*$/m, 'resultado_em: 2024-03-20'), 'utf8');
  const r = emAcme('relatorio');
  // 50.000,00 x 1,0251 = 51.255,00, pela mesma serie sintetica da correcao.
  return r.saida.includes('51.255,00') && r.saida.includes('pedido corrigido');
})());

ok('sem valor_pedido o comando falha em vez de deduzir', (() => {
  writeFileSync(matAcme, yamlBase.replace(/^valor_pedido:.*$/m, 'valor_pedido:'), 'utf8');
  const r = emAcme('relatorio');
  writeFileSync(matAcme, yamlBase, 'utf8');
  return r.codigo === 1 && r.saida.includes('valor_pedido');
})());

ok('consultivo nao tem polo, e o comando diz isso', (() => {
  const r = emBeta('relatorio');
  return r.codigo === 1 && r.saida.includes('contenciosa');
})());

ok('materia sem resultado nao gera relatorio', (() => {
  const bom = lerLF(matAcme);
  writeFileSync(matAcme, bom.replace(/^resultado: .*$/m, 'resultado:'), 'utf8');
  const r = emAcme('relatorio');
  writeFileSync(matAcme, bom, 'utf8');
  return r.codigo === 1 && r.saida.includes('materia fechar');
})());

// --------------------------------------------------------------------- custas
console.log('\ncustas');

ok('sem tribunal e recusado', run('custas', '1000').codigo === 1);
ok('tabela ausente diz qual arquivo criar', (() => {
  const r = run('custas', '1000', '--tribunal', 'tjxx', '--ano', '2026');
  return r.codigo === 1 && r.saida.includes('custas init');
})());
ok('custas init cria a tabela', run('custas', 'init', '--tribunal', 'tjxx', '--ano', '2026').codigo === 0);
ok('init nao sobrescreve', run('custas', 'init', '--tribunal', 'tjxx', '--ano', '2026').codigo === 1);

const tabCustas = join(raiz, 'tabelas', 'custas', 'tjxx-2026.yaml');

// A semente traz valores de exemplo. Se ela orcasse em silencio, o exemplo
// viraria o orcamento de alguem.
const naoConferida = run('custas', '85000,00', '--tribunal', 'tjxx', '--ano', '2026');
ok('tabela nao conferida nao orca', naoConferida.codigo === 1 && naoConferida.saida.includes('conferido_em'));
ok('--provisorio mostra, e marca como provisorio', (() => {
  const r = run('custas', '85000,00', '--tribunal', 'tjxx', '--ano', '2026', '--provisorio');
  return r.codigo === 0 && r.saida.includes('PROVISORIO');
})());

// Procedencia nao e opcional.
ok('tabela sem norma nao carrega', (() => {
  const bom = lerLF(tabCustas);
  writeFileSync(tabCustas, bom.replace(/^norma:.*$/m, 'norma:'), 'utf8');
  const r = run('custas', '1000', '--tribunal', 'tjxx', '--ano', '2026', '--provisorio');
  writeFileSync(tabCustas, bom, 'utf8');
  return r.codigo === 1 && r.saida.includes('procedencia');
})());

// Conta conferida a mao sobre a semente, com valor da causa de R$ 85.000,00:
//   custas-iniciais   1% de 85.000,00 = 850,00 (entre o piso 100 e o teto 10.000)
//   taxa-diligencia   fixo             =  50,00
//   fundo             faixa ate 100.000 = 120,00
//   TOTAL                              = 1.020,00
writeFileSync(tabCustas, lerLF(tabCustas).replace(/^conferido_em:.*$/m, 'conferido_em: 2026-08-31'), 'utf8');
const orc = run('custas', '85000,00', '--tribunal', 'tjxx', '--ano', '2026');
ok('tabela conferida orca sem --provisorio', orc.codigo === 0 && !orc.saida.includes('PROVISORIO'));
ok('o total bate com a conta feita a mao', orc.saida.includes('1.020,00'));
ok('a memoria diz como cada componente saiu', orc.saida.includes('1% sobre') && orc.saida.includes('faixa ate'));
ok('a saida traz norma e data', orc.saida.includes('procedencia') && orc.saida.includes('2026-01-01'));
ok('ressalva de conferencia na saida', orc.saida.includes('guia emitida pelo tribunal'));

// Piso e teto sao a parte que erra em silencio se ninguem olhar.
ok('piso eleva a causa pequena', (() => {
  const r = run('custas', '1000,00', '--tribunal', 'tjxx', '--ano', '2026');
  return r.saida.includes('elevado ao piso') && r.saida.includes('180,00');
})());
ok('teto limita a causa grande', (() => {
  const r = run('custas', '5000000,00', '--tribunal', 'tjxx', '--ano', '2026');
  return r.saida.includes('limitado ao teto') && r.saida.includes('10.000,00');
})());
ok('faixa final vale para o que passa de todas', (() => {
  const r = run('custas', '5000000,00', '--tribunal', 'tjxx', '--ano', '2026');
  return r.saida.includes('acima da ultima') && r.saida.includes('300,00');
})());
ok('--json traz o total em centavos', (() => {
  const r = run('custas', '85000,00', '--tribunal', 'tjxx', '--ano', '2026', '--json');
  try { return JSON.parse(r.saida).total === 102000; } catch { return false; }
})());
ok('componente com tipo desconhecido e recusado', (() => {
  const bom = lerLF(tabCustas);
  // Ancorado na linha, e nao no primeiro "tipo: fixo" do arquivo: o template
  // documenta cada tipo num comentario, e a troca ingenua acertava o comentario
  // — o teste passava a exercitar nada e a devolver verde.
  writeFileSync(tabCustas, bom.replace(/^(\s+)tipo: fixo$/m, '$1tipo: chute'), 'utf8');
  const r = run('custas', '1000', '--tribunal', 'tjxx', '--ano', '2026');
  writeFileSync(tabCustas, bom, 'utf8');
  return r.codigo === 1 && r.saida.includes('chute');
})());

// --------------------------------------------------------------- gate da carteira
console.log('\ngate');
ok('validate na raiz percorre a carteira', /materias [2-9]/.test(run('validate').saida));
ok('validate --json', (() => {
  const r = run('validate', '--json');
  try { return Array.isArray(JSON.parse(r.saida).erros); } catch { return false; }
})());
ok('help', run('help').saida.includes('attorneyfw'));
ok('comando desconhecido sai com 1', run('inexistente').codigo === 1);

rmSync(raiz, { recursive: true, force: true });
console.log(falhas ? `\n${falhas} falha(s).` : '\nOK.');
process.exit(falhas ? 1 : 0);
