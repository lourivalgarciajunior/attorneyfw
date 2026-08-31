/**
 * Amostra jurisprudencial — o item 3 do escritorio, entregue diferente do que
 * foi pedido, e o ADR diz por que.
 *
 * O pedido era *"analise dos 50 casos mais recentes, com indicador: 80% dos
 * ultimos 50 no TJPR foram favoraveis"*. Ha um obstaculo de acesso e um de
 * metodo, e o segundo nao se resolve com dinheiro: **classificar cinquenta
 * acordaos exige le-los**. Um deles pode ter sido favoravel por fundamento que
 * nao serve ao caso em maos, e entra na conta como vitoria. Classificacao que
 * ninguem auditou vira estatistica com aparencia de objetividade — e o numero
 * redondo e justamente o que dispensa quem le de perguntar como foi feito.
 *
 * Daí as tres regras deste modulo:
 *
 * 1. **Julgado nao lido entra como pendente, visivelmente.** Mesma disciplina do
 *    `[CONFERIR NA FONTE]` que ja governa citacao.
 * 2. **A saida declara sempre o `n`.** Nunca apresenta a amostra como universo.
 * 3. **Nao ha coleta automatica aqui.** Registro e manual. Fonte que exige
 *    contrato entra por chave configurada pelo escritorio, ou nao entra; e
 *    captcha nao se contorna.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  Erro, acharEscritorio, c, dataValida, estrategia, exigirMateria, rel,
} from './core.mjs';

export const RESULTADOS_JULGADO = ['favoravel', 'contrario', 'distinguivel', 'pendente'];

const TITULO = '## Amostra jurisprudencial';
const CABECALHO = '| Julgado | Tribunal | Data | Resultado | Lido | Razao | Fonte |';
const SEPARADOR = '|---|---|---|---|---|---|---|';
const VAZIA = '|  |  |  |  |  |  |  |';

const cel = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((x) => x.trim());

/** As linhas da tabela de amostra do artefato de estrategia em vigor. */
export function amostra(materia) {
  const est = estrategia(materia);
  if (!est) return { julgados: [], est: null };
  const sec = est.corpo.split(/^## /m).find((s) => /^Amostra jurisprudencial/i.test(s));
  if (!sec) return { julgados: [], est };

  const julgados = [];
  const linhas = sec.split('\n');
  for (const l of linhas) {
    if (!/^\|/.test(l.trim()) || /^\|[\s|:-]*\|?$/.test(l.trim())) continue;
    const [julgado, tribunal, data, resultado, lido, razao, fonte] = cel(l);
    if (!julgado || /^julgado$/i.test(julgado)) continue;
    julgados.push({
      julgado, tribunal, data, razao, fonte,
      resultado: RESULTADOS_JULGADO.includes(resultado) ? resultado : 'pendente',
      lido: /^(sim|s|x)$/i.test(lido),
    });
  }
  return { julgados, est };
}

/**
 * Insere a linha na tabela da secao de amostra, **dentro das fronteiras da
 * secao**.
 *
 * A primeira versao procurava a ultima linha de tabela a partir de um
 * deslocamento fixo depois do titulo, e ia parar na tabela de Riscos, que vem
 * adiante no mesmo arquivo. O julgado era gravado no lugar errado e sumia da
 * amostra sem erro nenhum. Aqui as fronteiras sao os `##` que delimitam a secao.
 */
function inserirNaTabela(raw, linha) {
  const linhas = raw.replace(/\r\n/g, '\n').split('\n');
  const ini = linhas.findIndex((l) => l.trim() === TITULO);
  if (ini < 0) {
    return `${raw.replace(/\n*$/, '')}\n\n${TITULO}\n\n${CABECALHO}\n${SEPARADOR}\n${linha}\n`;
  }
  let fim = linhas.findIndex((l, i) => i > ini && /^## /.test(l));
  if (fim < 0) fim = linhas.length;

  // A linha vazia do template e o primeiro lugar; depois dela, o fim da tabela.
  const iVazia = linhas.findIndex((l, i) => i > ini && i < fim && l.trim() === VAZIA);
  if (iVazia >= 0) {
    linhas[iVazia] = linha;
    return linhas.join('\n');
  }
  let ultima = -1;
  for (let i = ini; i < fim; i++) if (/^\|/.test(linhas[i].trim())) ultima = i;
  if (ultima < 0) {
    linhas.splice(fim, 0, CABECALHO, SEPARADOR, linha, '');
    return linhas.join('\n');
  }
  linhas.splice(ultima + 1, 0, linha);
  return linhas.join('\n');
}

export function jurisprudenciaAdd(args) {
  const m = exigirMateria(args);
  const raiz = acharEscritorio();
  const est = estrategia(m);
  if (!est) throw new Erro(`sem ${m.voc.artefato} — a amostra mora nela`);

  const julgado = args._.join(' ').trim();
  if (!julgado) {
    throw new Erro(
      'Uso: attorneyfw jurisprudencia add "<identificador>" --tribunal TJPR --data AAAA-MM-DD\n'
      + '       [--resultado favoravel|contrario|distinguivel] [--razao "..."] [--fonte URL] [--lido]',
    );
  }
  if (julgado.includes('|')) throw new Erro('o identificador nao pode conter "|" — ele quebraria a tabela');

  const resultado = String(args.resultado || 'pendente');
  if (!RESULTADOS_JULGADO.includes(resultado)) {
    throw new Erro(`--resultado deve ser um de: ${RESULTADOS_JULGADO.join(', ')}`);
  }
  if (args.data && !dataValida(args.data)) throw new Erro(`--data "${args.data}" nao e AAAA-MM-DD`);

  // Classificar sem ter lido e o defeito que esta amostra existe para evitar.
  // Aceita-se o registro, mas ele nao pode se passar por conferido.
  const lido = Boolean(args.lido);
  if (!lido && resultado !== 'pendente') {
    console.log(c.yellow('  aviso  classificado sem --lido: entra como PENDENTE DE LEITURA'));
  }
  const resultadoFinal = lido ? resultado : 'pendente';

  const linha = ['', julgado, String(args.tribunal || ''), String(args.data || ''),
    resultadoFinal, lido ? 'sim' : 'nao',
    String(args.razao || '').replace(/\|/g, '/'),
    String(args.fonte || ''), ''].join(' | ').replace(/^ \| /, '| ').replace(/ \| $/, ' |');

  writeFileSync(est.caminho, inserirNaTabela(readFileSync(est.caminho, 'utf8'), linha), 'utf8');

  console.log(`${c.green('julgado registrado')}  ${rel(raiz, est.caminho)}`);
  console.log(`  ${julgado}  ${c.dim(`${args.tribunal || '?'} ${args.data || ''}`)}  ${cor(resultadoFinal)}`);
  if (!lido) {
    console.log(c.yellow('  Ele NAO conta como classificado enquanto ninguem abrir o inteiro teor.'));
    console.log(c.dim('  Depois de ler:  attorneyfw jurisprudencia add "<id>" --resultado <r> --lido --razao "..."'));
  }
}

const cor = (r) => (r === 'favoravel' ? c.green(r) : r === 'contrario' ? c.red(r) : r === 'distinguivel' ? c.cyan(r) : c.yellow(r));

export function jurisprudenciaLista(args) {
  const m = exigirMateria(args);
  const { julgados } = amostra(m);

  if (args.json) {
    console.log(JSON.stringify({
      n: julgados.length,
      lidos: julgados.filter((j) => j.lido).length,
      amostra: true,
      universo: null,
      ressalva: 'amostra conferida, nao censo — nao sustenta afirmacao estatistica',
      julgados,
    }, null, 2));
    return;
  }

  console.log(c.b('amostra jurisprudencial'));
  if (!julgados.length) {
    console.log(c.dim('  nenhum julgado registrado — attorneyfw jurisprudencia add "<id>" --tribunal TJPR'));
    return;
  }

  const lidos = julgados.filter((j) => j.lido);
  const conta = {};
  for (const j of lidos) conta[j.resultado] = (conta[j.resultado] || 0) + 1;

  // O `n` sai antes da contagem, e nunca uma porcentagem. Ver ADR: a ferramenta
  // nao produz probabilidade de exito, nem aqui nem em lugar nenhum.
  console.log(c.dim(`  amostra de ${julgados.length}, ${lidos.length} lido(s) na fonte\n`));
  for (const j of julgados) {
    console.log(`  ${cor(j.resultado.padEnd(12))} ${(j.julgado || '').padEnd(34)} ${c.dim(`${j.tribunal || '?'} ${j.data || ''}`)}`);
    if (j.razao) console.log(c.dim(`    ${j.razao}`));
    if (!j.lido) console.log(c.yellow('    pendente de leitura no inteiro teor'));
  }

  console.log('');
  console.log(c.dim(`  lidos: ${RESULTADOS_JULGADO.filter((r) => conta[r]).map((r) => `${conta[r]} ${r}`).join(' · ') || 'nenhum'}`));
  console.log(c.dim(`  Amostra de ${julgados.length}, nao censo. Nao sustenta afirmacao estatistica,`));
  console.log(c.dim('  e por isso nenhuma porcentagem sai daqui.'));
}
