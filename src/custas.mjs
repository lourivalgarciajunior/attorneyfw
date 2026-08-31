/**
 * Orcamento de custas processuais.
 *
 * O que sai daqui e CONFERENCIA, nao o calculo oficial: o valor que vale e o da
 * guia emitida pelo tribunal. A ferramenta serve para responder ao cliente sem
 * abrir cinco tabelas — nao para substituir a emissao da guia.
 *
 * O desenho central esta no ADR, e e o mesmo do subsistema de correcao: **a
 * tabela mora em arquivo versionado na carteira, nunca em raspagem ao vivo**.
 * Custas mudam por ato normativo datado, e um numero raspado de uma pagina nao
 * sabe dizer de onde veio. Aqui a saida diz qual norma aplicou e de que data.
 *
 * Duas recusas, ambas deliberadas:
 *
 * 1. **Tabela sem `norma` e `norma_data` nao carrega.** Procedencia nao e campo
 *    opcional num numero que vai para orcamento a cliente.
 * 2. **Tabela sem `conferido_em` nao produz orcamento** sem `--provisorio`. A
 *    semente que o CLI gera traz valores de exemplo; se ela pudesse orcar em
 *    silencio, o exemplo viraria o orcamento de alguem.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  Erro, acharEscritorio, c, dataValida, escrever, hoje, rel, template,
} from './core.mjs';
import { centavos, emReais, numeroBR } from './dinheiro.mjs';

export const dirCustas = (raiz) => join(raiz, 'tabelas', 'custas');
const TIPOS_COMPONENTE = ['percentual', 'fixo', 'faixas'];

/**
 * Parser do subconjunto de YAML que a tabela usa: escalares na raiz e uma lista
 * de mapas em `componentes:`. Estrito de proposito — o que nao for reconhecido
 * vira erro, e nao um campo silenciosamente ignorado. Custas ignoradas em
 * silencio sao a metade do orcamento que falta.
 */
function lerTabelaYaml(texto, arq) {
  const raiz = {};
  const componentes = [];
  let atual = null;
  let emComponentes = false;
  let emFaixas = false;

  const linhas = texto.replace(/\r\n/g, '\n').split('\n');
  for (let n = 0; n < linhas.length; n++) {
    const bruta = linhas[n];
    if (!bruta.trim() || bruta.trim().startsWith('#')) continue;
    const recuo = bruta.length - bruta.trimStart().length;
    const l = bruta.trim();

    if (recuo === 0) {
      const [, k, v] = l.match(/^([\w-]+):[ \t]*(.*)$/) || [];
      if (!k) throw new Erro(`${arq}, linha ${n + 1}: nao entendi "${l}"`);
      emComponentes = k === 'componentes';
      emFaixas = false;
      atual = null;
      if (!emComponentes) raiz[k] = v.replace(/^["'](.*)["']$/, '$1').trim();
      continue;
    }
    if (!emComponentes) continue; // comentario indentado sob escalar

    if (l.startsWith('- ')) {
      const dentro = l.slice(2).trim();
      if (emFaixas) {
        const [, k, v] = dentro.match(/^([\w-]+):[ \t]*(.*)$/) || [];
        atual.faixas.push({ [k]: v.trim() });
        continue;
      }
      atual = { faixas: [] };
      componentes.push(atual);
      const [, k, v] = dentro.match(/^([\w-]+):[ \t]*(.*)$/) || [];
      if (k) atual[k] = v.replace(/^["'](.*)["']$/, '$1').trim();
      continue;
    }
    if (!atual) throw new Erro(`${arq}, linha ${n + 1}: "${l}" fora de um componente`);

    const [, k, v] = l.match(/^([\w-]+):[ \t]*(.*)$/) || [];
    if (!k) throw new Erro(`${arq}, linha ${n + 1}: nao entendi "${l}"`);
    if (k === 'faixas') { emFaixas = true; continue; }
    if (emFaixas && atual.faixas.length) {
      atual.faixas[atual.faixas.length - 1][k] = v.trim();
      continue;
    }
    atual[k] = v.replace(/^["'](.*)["']$/, '$1').trim();
  }
  return { ...raiz, componentes };
}

const arquivoTabela = (raiz, tribunal, ano) => join(dirCustas(raiz), `${tribunal}-${ano}.yaml`);

/** As tabelas que a carteira tem, para a mensagem de erro poder ser util. */
export function tabelasNaCarteira(raiz) {
  const dir = dirCustas(raiz);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.yaml')).map((f) => f.slice(0, -5)).sort();
}

export function lerTabela(raiz, tribunal, ano) {
  const caminho = arquivoTabela(raiz, tribunal, ano);
  if (!existsSync(caminho)) {
    const tem = tabelasNaCarteira(raiz);
    throw new Erro(
      `nao ha tabela de custas para ${tribunal.toUpperCase()} em ${ano}.\n`
      + `  Crie:  attorneyfw custas init --tribunal ${tribunal} --ano ${ano}\n`
      + `  Depois preencha com a tabela publicada e marque conferido_em.\n`
      + (tem.length ? `  Na carteira ha: ${tem.join(', ')}` : '  A carteira ainda nao tem nenhuma tabela.'),
    );
  }
  const t = lerTabelaYaml(readFileSync(caminho, 'utf8'), rel(raiz, caminho));

  // Procedencia nao e opcional. Numero de custas sem norma e sem data nao se
  // defende diante do cliente nem diante do juizo.
  if (!t.norma || !t.norma_data) {
    throw new Erro(
      `${rel(raiz, caminho)} sem procedencia (falta "norma:" ou "norma_data:").\n`
      + '  Custas mudam por ato normativo datado. Tabela que nao diz qual norma\n'
      + '  aplica, e de quando, nao produz orcamento.',
    );
  }
  if (!dataValida(t.norma_data)) throw new Erro(`${rel(raiz, caminho)}: norma_data "${t.norma_data}" nao e AAAA-MM-DD`);
  if (!t.componentes.length) throw new Erro(`${rel(raiz, caminho)} nao tem nenhum componente`);

  for (const comp of t.componentes) {
    if (!comp.id) throw new Erro(`${rel(raiz, caminho)}: componente sem "id"`);
    if (!TIPOS_COMPONENTE.includes(comp.tipo)) {
      throw new Erro(`${rel(raiz, caminho)}: componente "${comp.id}" com tipo "${comp.tipo || '(vazio)'}" — use ${TIPOS_COMPONENTE.join(', ')}`);
    }
  }
  return { ...t, tribunal, ano, caminho, conferida: dataValida(t.conferido_em) };
}

// ------------------------------------------------------------------ calculo

/** Um componente, com a memoria de como chegou ao valor. */
function calcular(comp, base) {
  if (comp.tipo === 'fixo') {
    const v = centavos(comp.valor);
    return { valor: v, como: `valor fixo de R$ ${emReais(v)}` };
  }
  if (comp.tipo === 'percentual') {
    const pct = comp.percentual ? numeroBR(comp.percentual) : NaN;
    if (!Number.isFinite(pct)) throw new Erro(`componente "${comp.id}": percentual invalido`);
    let v = Math.round(base * (pct / 100));
    let como = `${pct}% sobre R$ ${emReais(base)}`;
    const piso = comp.piso ? centavos(comp.piso) : null;
    const teto = comp.teto ? centavos(comp.teto) : null;
    if (piso !== null && v < piso) { como += `, elevado ao piso de R$ ${emReais(piso)}`; v = piso; }
    if (teto !== null && v > teto) { como += `, limitado ao teto de R$ ${emReais(teto)}`; v = teto; }
    return { valor: v, como };
  }
  // faixas: a primeira cujo `ate` alcance a base; `ate` vazio e a ultima faixa.
  for (const f of comp.faixas) {
    const ate = f.ate ? centavos(f.ate) : null;
    if (ate === null || base <= ate) {
      const v = centavos(f.valor);
      return { valor: v, como: `faixa ${ate === null ? 'acima da ultima' : `ate R$ ${emReais(ate)}`} — R$ ${emReais(v)}` };
    }
  }
  throw new Erro(`componente "${comp.id}": nenhuma faixa alcanca R$ ${emReais(base)} e nao ha faixa final (sem "ate")`);
}

const AVISO = 'conferencia, nao calculo oficial — o valor que vale e o da guia emitida pelo tribunal';

export function custas(args) {
  const raiz = acharEscritorio();
  if (args._[0] === 'init') { args._.shift(); return custasInit(args, raiz); }

  const bruto = args._[0];
  if (!bruto) throw new Erro('Uso: attorneyfw custas <valor-da-causa> --tribunal tjpr [--ano 2026] [--provisorio] [--json]');
  if (!args.tribunal) throw new Erro('--tribunal e obrigatorio. Cada justica tem tabela propria; nao ha padrao.');

  const base = centavos(bruto);
  const ano = String(args.ano || hoje().slice(0, 4));
  const t = lerTabela(raiz, String(args.tribunal).toLowerCase(), ano);

  // A semente que o CLI gera traz valores de exemplo. Se ela pudesse orcar em
  // silencio, o exemplo viraria o orcamento de alguem.
  if (!t.conferida && !args.provisorio) {
    throw new Erro(
      `${rel(raiz, t.caminho)} ainda nao foi conferida na fonte (campo "conferido_em" vazio).\n`
      + '  Confira os valores contra a norma publicada, preencha conferido_em: AAAA-MM-DD,\n'
      + '  e rode de novo. Para ver o calculo assim mesmo, use --provisorio.',
    );
  }

  const itens = t.componentes.map((comp) => ({
    id: comp.id,
    rotulo: comp.rotulo || comp.id,
    ...calcular(comp, base),
    obs: comp.observacao || '',
  }));
  const total = itens.reduce((a, x) => a + x.valor, 0);

  if (args.json) {
    console.log(JSON.stringify({
      tribunal: t.tribunal, ano: t.ano, norma: t.norma, normaData: t.norma_data,
      conferidoEm: t.conferido_em || null, provisorio: !t.conferida,
      valorCausa: base, itens, total, ressalva: AVISO,
    }, null, 2));
    return;
  }

  console.log(c.b(`custas — ${t.tribunal.toUpperCase()} ${t.ano}`));
  console.log(c.dim(`${AVISO}\n`));
  if (!t.conferida) {
    console.log(c.red('  *** ORCAMENTO PROVISORIO: esta tabela nao foi conferida na fonte. ***'));
    console.log(c.red('  *** Nao envie ao cliente antes de preencher conferido_em.        ***\n'));
  }

  console.log(`  valor da causa      R$ ${emReais(base).padStart(16)}\n`);
  for (const i of itens) {
    console.log(`  ${i.rotulo.padEnd(30)} R$ ${emReais(i.valor).padStart(14)}`);
    console.log(c.dim(`    ${i.como}${i.obs ? ` — ${i.obs}` : ''}`));
  }
  console.log(`\n  ${c.b('TOTAL'.padEnd(30))} ${c.b(`R$ ${emReais(total).padStart(14)}`)}`);

  console.log(`\n${c.b('procedencia')}`);
  console.log(c.dim(`  norma      ${t.norma}`));
  console.log(c.dim(`  de         ${t.norma_data}`));
  console.log(c.dim(`  conferida  ${t.conferido_em || c.red('NUNCA')}${t.fonte ? `   ${t.fonte}` : ''}`));
  console.log(c.dim(`  tabela     ${rel(raiz, t.caminho)}`));
  if (t.observacao) console.log(c.dim(`  nota       ${t.observacao}`));
}

function custasInit(args, raiz) {
  if (!args.tribunal) throw new Erro('Uso: attorneyfw custas init --tribunal tjpr [--ano 2026]');
  const tribunal = String(args.tribunal).toLowerCase();
  const ano = String(args.ano || hoje().slice(0, 4));
  const caminho = arquivoTabela(raiz, tribunal, ano);
  if (existsSync(caminho)) throw new Erro(`${rel(raiz, caminho)} ja existe.`);

  escrever(caminho, template('custas-tribunal.yaml', {
    tribunal: tribunal.toUpperCase(), tribunal_slug: tribunal, ano, data: hoje(),
  }));
  console.log(`${c.green('tabela de custas criada')}  ${rel(raiz, caminho)}`);
  console.log(c.yellow('  Os valores sao EXEMPLO. Substitua pelos da norma publicada.'));
  console.log(c.dim('  Enquanto conferido_em estiver vazio, o orcamento so sai com --provisorio.'));
}
