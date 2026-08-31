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
  if (!pedido) throw new Erro('Uso: attorneyfw prazo set <entrega> --intimacao AAAA-MM-DD --dias N [--corridos] [--fatal]');
  if (!args.intimacao || !args.dias) throw new Erro('--intimacao e --dias sao obrigatorios. Prazo pela metade nao e prazo.');
  if (!dataValida(args.intimacao)) throw new Erro(`--intimacao "${args.intimacao}" nao e AAAA-MM-DD.`);
  const dias = Number(args.dias);
  if (!Number.isInteger(dias) || dias < 1) throw new Erro(`--dias "${args.dias}" nao e um numero de dias.`);

  const [alvo] = alvosDe(entregas(m), pedido);
  const contagem = args.corridos ? 'corridos' : 'uteis';
  const fatal = args.fatal ? 'true' : (valor(alvo.fm.prazo_fatal) || 'false');

  const raw = readFileSync(alvo.caminho, 'utf8');
  const atualizado = raw
    .replace(/^(prazo_intimacao:[ \t]*).*$/m, `$1${args.intimacao}`)
    .replace(/^(prazo_dias:[ \t]*).*$/m, `$1${dias}`)
    .replace(/^(prazo_contagem:[ \t]*).*$/m, `$1${contagem}`)
    .replace(/^(prazo_fatal:[ \t]*).*$/m, `$1${fatal}`);
  if (atualizado === raw && !/^prazo_intimacao:/m.test(raw)) {
    throw new Erro(`${alvo.arquivo} nao tem os campos de prazo no frontmatter — acrescente prazo_intimacao, prazo_dias, prazo_contagem e prazo_fatal a mao.`);
  }
  writeFileSync(alvo.caminho, atualizado, 'utf8');

  const ctx = contextoPrazo(raiz, [Number(String(args.intimacao).slice(0, 4))]);
  const p = prazoDe({ fm: { ...alvo.fm, prazo_intimacao: args.intimacao, prazo_dias: dias, prazo_contagem: contagem, prazo_fatal: fatal } }, ctx);

  console.log(`${c.green('prazo gravado')}  ${rel(raiz, alvo.caminho)}`);
  console.log(`  intimacao ${p.intimacao} | ${p.dias} dias ${p.contagem} | inicio ${p.inicio} | ${c.b(`vence ${p.fim}`)}${p.fatal ? c.red('  FATAL') : ''}`);
  console.log(c.dim(`  ${AVISO}`));
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

  if (!linhas.length) {
    console.log(c.dim(daqui.length ? 'nenhum prazo em aberto.' : 'nenhuma materia na carteira.'));
    return 0;
  }

  linhas.sort((a, b) => {
    if (a.erro) return -1;
    if (b.erro) return 1;
    return a.p.fim.localeCompare(b.p.fim);
  });

  console.log(c.b(`agenda de prazos${daqui.length > 1 ? ` — ${daqui.length} materias` : ''}`));
  console.log(c.dim(`hoje ${ctx.hoje} | ${AVISO}\n`));

  let vencidos = 0;
  for (const l of linhas) {
    const onde = `${l.m.slug}/${String(l.e.numero).padStart(2, '0')}`;
    if (l.erro) {
      console.log(`  ${c.yellow('???       ')} ${onde.padEnd(28)} ${l.e.fm.titulo || l.e.arquivo}  ${c.yellow(l.erro)}`);
      continue;
    }
    const { fim, restam, fatal, vencido } = l.p;
    if (vencido) vencidos++;
    const rotulo = vencido
      ? c.red(`VENCIDO ${String(-restam).padStart(2)}d`)
      : restam <= 2 ? c.red(`${String(restam).padStart(2)}d uteis`)
        : restam <= 5 ? c.yellow(`${String(restam).padStart(2)}d uteis`)
          : c.dim(`${String(restam).padStart(2)}d uteis`);
    console.log(`  ${fim}  ${rotulo}  ${onde.padEnd(28)} ${(l.e.fm.titulo || l.e.arquivo).padEnd(38)} ${c.dim(l.e.estado)}${fatal ? c.red('  FATAL') : ''}`);
  }

  if (vencidos) {
    console.log(`\n${c.red(`${vencidos} prazo(s) vencido(s) sem entrega registrada.`)}`);
    return 1;
  }
  return 0;
}
