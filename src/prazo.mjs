/**
 * A agenda de prazos — o unico lugar do attorneyfw onde errar custa o caso.
 *
 * O que sai daqui e CONFERENCIA, nao a contagem oficial. O prazo que vale e o
 * dos autos e o do sistema do tribunal. Feriado do foro, suspensao de
 * expediente e decisao que altera o termo inicial nao chegam aqui sozinhos:
 * entram a mao em docs/feriados.md. Esta ferramenta serve para o prazo nao
 * passar despercebido, nao para substituir a conferencia de quem assina.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  ESTADOS_ATIVOS, Erro, acharEscritorio, acharMateria, c, contextoPrazo, dataValida,
  entregas, exigirMateria, materias, prazoDe, rel, valor,
} from './core.mjs';
import { alvosDe } from './entrega.mjs';

const AVISO = 'conferencia, nao contagem oficial — o prazo que vale e o dos autos';

/** Grava o prazo no frontmatter da entrega e mostra o vencimento calculado. */
export function prazoSet(args) {
  const m = exigirMateria(args);
  const raiz = acharEscritorio();
  const pedido = args._[0];
  if (!pedido) throw new Erro('Uso: attorneyfw prazo set <entrega> --intimacao AAAA-MM-DD --dias N [--corridos] [--material] [--fatal]');
  if (!args.intimacao || !args.dias) throw new Erro('--intimacao e --dias sao obrigatorios. Prazo pela metade nao e prazo.');
  if (!dataValida(args.intimacao)) throw new Erro(`--intimacao "${args.intimacao}" nao e AAAA-MM-DD.`);
  const dias = Number(args.dias);
  if (!Number.isInteger(dias) || dias < 1) throw new Erro(`--dias "${args.dias}" nao e um numero de dias.`);

  const [alvo] = alvosDe(entregas(m), pedido);
  // Prazo material e continuo por definicao (art. 210, caput, do CTN). Aceitar
  // `--material --uteis` seria gravar uma combinacao que a lei nao tem.
  if (args.material && args.uteis) throw new Erro('--material conta em dias corridos; --uteis nao se combina com ele.');
  const regime = args.material ? 'material' : (valor(alvo.fm.prazo_regime) || 'processual');
  const contagem = args.corridos || args.material ? 'corridos' : 'uteis';
  const fatal = args.fatal ? 'true' : (valor(alvo.fm.prazo_fatal) || 'false');

  const raw = readFileSync(alvo.caminho, 'utf8');
  let atualizado = raw
    .replace(/^(prazo_intimacao:[ \t]*).*$/m, `$1${args.intimacao}`)
    .replace(/^(prazo_dias:[ \t]*).*$/m, `$1${dias}`)
    .replace(/^(prazo_contagem:[ \t]*).*$/m, `$1${contagem}`)
    .replace(/^(prazo_fatal:[ \t]*).*$/m, `$1${fatal}`);
  if (atualizado === raw && !/^prazo_intimacao:/m.test(raw)) {
    throw new Erro(`${alvo.arquivo} nao tem os campos de prazo no frontmatter — acrescente prazo_intimacao, prazo_dias, prazo_contagem e prazo_fatal a mao.`);
  }
  // Entrega criada pela 0.1.0 nao tem `prazo_regime`. Acrescentar em vez de
  // recusar: o campo e novo, e recusar obrigaria a editar a mao todo arquivo
  // que ja existe.
  atualizado = /^prazo_regime:/m.test(atualizado)
    ? atualizado.replace(/^(prazo_regime:[ \t]*).*$/m, `$1${regime}`)
    : atualizado.replace(/^(prazo_contagem:[ \t]*.*)$/m, `$1\nprazo_regime: ${regime}`);
  writeFileSync(alvo.caminho, atualizado, 'utf8');

  const ctx = contextoPrazo(raiz, [Number(String(args.intimacao).slice(0, 4))]);
  const p = prazoDe({ fm: { ...alvo.fm, prazo_intimacao: args.intimacao, prazo_dias: dias, prazo_contagem: contagem, prazo_regime: regime, prazo_fatal: fatal } }, ctx);

  console.log(`${c.green('prazo gravado')}  ${rel(raiz, alvo.caminho)}`);
  console.log(`  intimacao ${p.intimacao} | ${p.dias} dias ${p.contagem} (${p.regime}) | inicio ${p.inicio} | ${c.b(`vence ${p.fim}`)}${p.fatal ? c.red('  FATAL') : ''}`);
  if (p.divergencia) explicarDivergencia(p);
  console.log(c.dim(`  ${AVISO}`));
}

/**
 * O paragrafo unico do art. 210 do CTN diz que o prazo "so se inicia ou vence"
 * em dia de expediente normal. Se o deslocamento alcanca o termo inicial, ou so
 * o vencimento, e questao em aberto — e no caso que originou esta regra as duas
 * leituras dao datas diferentes. Adotamos a mais curta e mostramos a outra:
 * decidir calada seria a ferramenta resolvendo questao juridica no lugar de
 * quem assina. Ver ADR-2026-08-31.
 */
function explicarDivergencia(p) {
  console.log(`  ${c.yellow('duas leituras do art. 210, par. unico, do CTN — adotada a mais curta')}`);
  console.log(c.dim(`    caput: contagem de ${p.inicio}, vence ${p.fim}  ${c.b('<- adotada')}`));
  console.log(c.dim(`    se "iniciam" tambem deslocar: de ${p.inicioAlternativo}, vence ${p.fimAlternativo}`));
}

export { explicarDivergencia };

/**
 * A linha da agenda, em pedacos.
 *
 * Existe uma funcao so porque a linha sai em dois lugares: colorida no terminal
 * e limpa dentro do `--json`. Montar cada uma por conta criaria duas maneiras de
 * apresentar a mesma coisa, e uma delas ficaria para tras — que e exatamente o
 * que o hook do plugin ja dizia querer evitar quando reemitia a saida do CLI em
 * vez de reformata-la.
 *
 * Os pedacos carregam o nome da cor, e nao a sequencia ANSI: quem quer cor pinta,
 * quem quer texto junta. Nenhum consumidor precisa tirar cor com regex.
 */
function pedacos(l) {
  const onde = `${l.m.slug}/${String(l.e.numero).padStart(2, '0')}`;
  const titulo = l.e.fm.titulo || l.e.arquivo;
  if (l.erro) {
    return [
      { t: '  ' }, { t: '???       ', cor: 'yellow' }, { t: ' ' },
      { t: onde.padEnd(28) }, { t: ' ' }, { t: titulo }, { t: '  ' },
      { t: l.erro, cor: 'yellow' },
    ];
  }
  const { fim, restam, fatal, vencido, regime } = l.p;
  const rotulo = vencido
    ? { t: `VENCIDO ${String(-restam).padStart(2)}d`, cor: 'red' }
    : restam <= 2 ? { t: `${String(restam).padStart(2)}d uteis`, cor: 'red' }
      : restam <= 5 ? { t: `${String(restam).padStart(2)}d uteis`, cor: 'yellow' }
        : { t: `${String(restam).padStart(2)}d uteis`, cor: 'dim' };
  return [
    { t: '  ' }, { t: fim }, { t: '  ' }, rotulo, { t: '  ' },
    { t: onde.padEnd(28) }, { t: ' ' }, { t: titulo.padEnd(38) }, { t: ' ' },
    { t: l.e.estado, cor: 'dim' },
    // O regime so aparece quando nao e o padrao: coluna que repete "processual"
    // em toda linha vira ruido e para de ser lida.
    ...(regime === 'material' ? [{ t: '  CTN', cor: 'cyan' }] : []),
    ...(fatal ? [{ t: '  FATAL', cor: 'red' }] : []),
  ];
}

const emTexto = (ps) => ps.map((p) => p.t).join('');
const emCor = (ps) => ps.map((p) => (p.cor ? c[p.cor](p.t) : p.t)).join('');

const notaDivergencia = (p) => `${' '.repeat(14)}outra leitura do art. 210, par. unico: vence ${p.fimAlternativo} — adotada a mais curta`;

/** Uma entrada da agenda, na forma que o `--json` publica. Ver ADR. */
function entrada(l) {
  const base = {
    materia: l.m.slug,
    entrega: l.e.numero,
    titulo: l.e.fm.titulo || l.e.arquivo,
    estado: l.e.estado,
    linha: emTexto(pedacos(l)),
  };
  if (l.erro) {
    return {
      ...base, erro: l.erro,
      intimacao: null, dias: null, contagem: null, regime: null,
      inicio: null, fim: null, restam: null, vencido: null, fatal: null,
      divergencia: null,
    };
  }
  const p = l.p;
  return {
    ...base, erro: null,
    intimacao: p.intimacao, dias: p.dias, contagem: p.contagem, regime: p.regime,
    inicio: p.inicio, fim: p.fim, restam: p.restam,
    vencido: Boolean(p.vencido), fatal: Boolean(p.fatal),
    divergencia: p.divergencia
      ? { adotada: p.fim, alternativa: p.fimAlternativo, nota: notaDivergencia(p) }
      : null,
  };
}

/**
 * A agenda. Dentro de uma materia mostra a dela; na raiz da carteira, a de
 * todas — que e o unico jeito de ver que dois prazos fatais caem no mesmo dia.
 */
export function prazoLista(args) {
  const raiz = acharEscritorio();
  const daqui = args.materia ? [exigirMateria(args)] : (acharMateria() ? [acharMateria()] : materias(raiz));
  const ctx = contextoPrazo(raiz);
  const janela = args.dias === undefined ? null : Number(args.dias);

  const linhas = [];
  for (const m of daqui) {
    for (const e of entregas(m)) {
      if (!ESTADOS_ATIVOS.includes(e.estado)) continue;
      const p = prazoDe(e, ctx);
      if (!p) continue;
      if (p.erro) { linhas.push({ m, e, erro: p.erro }); continue; }
      if (e.estado === 'entregue') continue;
      if (janela !== null && p.restam > janela) continue;
      linhas.push({ m, e, p });
    }
  }

  linhas.sort((a, b) => {
    if (a.erro) return -1;
    if (b.erro) return 1;
    return a.p.fim.localeCompare(b.p.fim);
  });
  const vencidos = linhas.filter((l) => l.p && l.p.vencido).length;

  // O payload existe porque o hook do plugin decidia "ha prazo vencido?" lendo a
  // palavra VENCIDO na saida. Reescrever aquele rotulo desligaria o unico alarme
  // do plugin sem que nada falhasse. Aqui o sinal e campo, e nao texto.
  //
  // A ressalva vai DENTRO do payload, e nao no rodape: programa nao le rodape, e
  // um numero de conferencia que viaja sozinho chega ao consumidor com cara de
  // contagem oficial.
  if (args.json) {
    console.log(JSON.stringify({
      versao: 1,
      hoje: ctx.hoje,
      ressalva: AVISO,
      janela,
      materias: daqui.length,
      vencidos,
      prazos: linhas.map(entrada),
    }, null, 2));
    return vencidos ? 1 : 0;
  }

  if (!linhas.length) {
    console.log(c.dim(daqui.length ? 'nenhum prazo em aberto.' : 'nenhuma materia na carteira.'));
    return 0;
  }

  console.log(c.b(`agenda de prazos${daqui.length > 1 ? ` — ${daqui.length} materias` : ''}`));
  console.log(c.dim(`hoje ${ctx.hoje} | ${AVISO}\n`));

  for (const l of linhas) {
    console.log(emCor(pedacos(l)));
    if (l.p && l.p.divergencia) console.log(c.dim(notaDivergencia(l.p)));
  }

  if (vencidos) {
    console.log(`\n${c.red(`${vencidos} prazo(s) vencido(s) sem entrega registrada.`)}`);
    return 1;
  }
  return 0;
}
