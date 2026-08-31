/**
 * `attorneyfw atualizar` — a superficie da correcao monetaria.
 *
 * O que sai daqui e CONFERENCIA, nao o calculo oficial. O valor que vale e o da
 * memoria homologada nos autos, e a conta que a contadoria do juizo faz nem
 * sempre adota a mesma convencao. Esta ferramenta serve para o valor chegar a
 * minuta com a memoria junto, nao para substituir a conferencia de quem assina.
 *
 * Nenhum comando aqui produz valor final sozinho — nem no modo resumido, que e
 * justamente o que acaba copiado para a peca.
 */
import {
  Erro, acharEscritorio, c, dataValida, hoje,
} from './core.mjs';
import {
  SERIE_PADRAO, SERIES, centavos, conta, emReais, lerSerie, seriesNaCarteira,
} from './dinheiro.mjs';

const AVISO = 'conferencia, nao calculo oficial — o valor que vale e o da memoria homologada nos autos';

const pct = (n, casas = 4) => `${(n * 100).toFixed(casas)}%`;

export function atualizar(args) {
  const raiz = acharEscritorio();

  const bruto = args._[0];
  if (!bruto) {
    throw new Erro(
      'Uso: attorneyfw atualizar <valor> --de AAAA-MM-DD [--ate AAAA-MM-DD]\n'
      + '                              [--serie inpc|ipca|ipca-e|igp-m] [--juros 1] [--juros-de DATA] [--selic]',
    );
  }
  const valor = centavos(bruto);

  if (!args.de) throw new Erro('--de e obrigatorio: sem termo inicial nao ha correcao.');
  if (!dataValida(args.de)) throw new Erro(`--de "${args.de}" nao e AAAA-MM-DD.`);
  const ate = args.ate === undefined ? hoje() : String(args.ate);
  if (!dataValida(ate)) throw new Erro(`--ate "${args.ate}" nao e AAAA-MM-DD.`);

  const nomeSerie = String(args.serie || SERIE_PADRAO);
  const serie = lerSerie(raiz, nomeSerie);

  // Juros: ou a taxa fixa ao mes, ou a Selic. As duas juntas seria contar duas
  // vezes o mesmo periodo de mora.
  if (args.juros && args.selic) throw new Erro('--juros e --selic nao se combinam: escolha uma forma de mora.');
  let juros = null;
  if (args.selic) {
    juros = { modo: 'selic', de: String(args['juros-de'] || args.de), serie: lerSerie(raiz, 'selic') };
  } else if (args.juros) {
    const taxaMes = Number(String(args.juros).replace(',', '.'));
    if (!Number.isFinite(taxaMes) || taxaMes < 0) throw new Erro(`--juros "${args.juros}" nao e uma taxa ao mes.`);
    juros = { modo: 'simples', de: String(args['juros-de'] || args.de), taxaMes };
  }
  if (juros && !dataValida(juros.de)) throw new Erro(`--juros-de "${juros.de}" nao e AAAA-MM-DD.`);

  const r = conta({ valor, de: args.de, ate, serie, juros });

  if (args.json) {
    console.log(JSON.stringify({
      ...r,
      ressalva: AVISO,
      correcao: { ...r.correcao, memoria: r.correcao.memoria },
    }, null, 2));
    return;
  }

  imprimir(r, { de: args.de, ate, serie });
}

function imprimir(r, ctx) {
  const { correcao: k, juros: j, total } = r;

  console.log(c.b(`correcao monetaria — ${k.rotulo}`));
  console.log(c.dim(`${AVISO}\n`));

  console.log(`  valor original      R$ ${emReais(k.valor).padStart(16)}   em ${ctx.de}`);
  console.log(`  fator acumulado     ${String(k.fator.toFixed(8)).padStart(19)}   ${k.de} a ${k.ate}`);
  console.log(`  ${c.b('valor corrigido')}     ${c.b(`R$ ${emReais(k.corrigido).padStart(16)}`)}   em ${ctx.ate}`);
  console.log(c.dim(`  diferenca           R$ ${emReais(k.diferenca).padStart(16)}`));

  if (j) {
    console.log('');
    console.log(`  juros de mora       ${c.dim(j.convencao)}`);
    if (j.modo === 'simples') {
      console.log(c.dim(`    ${j.dias} dias = ${j.meses.toFixed(4)} meses, ${pct(j.percentual)} sobre o corrigido`));
    } else {
      console.log(c.dim(`    Selic somada de ${j.de} a ${j.ate}: ${pct(j.percentual, 4)}`));
    }
    console.log(`  ${c.b('juros')}               ${c.b(`R$ ${emReais(j.juros).padStart(16)}`)}`);
    console.log('');
    console.log(`  ${c.b('TOTAL')}               ${c.b(`R$ ${emReais(total).padStart(16)}`)}`);
  }

  // A memoria e o motivo de o comando existir. Ela nunca e opcional: valor
  // corrigido sem memoria a outra parte impugna e o juiz nao homologa.
  console.log(`\n${c.b('memoria de calculo')}`);
  console.log(c.dim(`  base: ${k.rotulo} de ${k.de} (indice do mes do termo inicial = 1,00000000)`));
  console.log(c.dim(`  convencao: ${k.convencao}\n`));
  console.log(c.dim('    mes       var. %      fator acumulado'));
  for (const l of k.memoria) {
    console.log(`    ${l.mes}  ${String(l.variacao.toFixed(2)).padStart(8)}  ${String(l.fator.toFixed(8)).padStart(19)}`);
  }
  if (j?.memoria) {
    console.log(c.dim('\n    mes       Selic %     acumulado'));
    for (const l of j.memoria) {
      console.log(`    ${l.mes}  ${String(l.taxa.toFixed(2)).padStart(8)}  ${String(l.acumulado.toFixed(2)).padStart(12)}${l.nota ? c.dim(`  ${l.nota}`) : ''}`);
    }
  }

  console.log(`\n${c.b('procedencia')}`);
  console.log(c.dim(`  serie      ${k.rotulo} — ${k.fonte}${k.serieFonte ? ` (${k.serieFonte})` : ''}`));
  console.log(c.dim(`  cobertura  ${k.cobertura}`));
  console.log(c.dim(`  coletada   ${k.coletadaEm}   (rode \`attorneyfw indice atualizar\` para estender)`));
}

/** `attorneyfw indice` sem subcomando: o que a carteira tem. */
export function indiceLista() {
  const raiz = acharEscritorio();
  const tem = seriesNaCarteira(raiz);
  console.log(c.b('series de indice na carteira'));
  if (!tem.length) {
    console.log(c.dim('  nenhuma. Rode `attorneyfw indice atualizar`.'));
    return;
  }
  for (const nome of tem) {
    try {
      const s = lerSerie(raiz, nome);
      console.log(`  ${c.green(s.rotulo.padEnd(7))} ${s.de} a ${s.ate}  ${c.dim(`${s.fonte}, coletada em ${s.coletadaEm}`)}`);
    } catch (e) {
      console.log(`  ${c.red(nome.padEnd(7))} ${c.red(e.message.split('\n')[0])}`);
    }
  }
  const faltam = Object.keys(SERIES).filter((s) => !tem.includes(s));
  if (faltam.length) console.log(c.dim(`  sem serie: ${faltam.join(', ')}`));
}
