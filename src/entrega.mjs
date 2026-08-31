/**
 * Operacoes de entrega que mexem em nome de arquivo E frontmatter ao mesmo
 * tempo. Feitas na mao, as duas coisas desencontram: o arquivo diz ent-07 e o
 * frontmatter diz 8, ou o titulo muda e o slug do nome fica preso ao antigo.
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Erro, acharEscritorio, c, entregas, exigirMateria, moverEntrega, rel, slug, valor } from './core.mjs';

/**
 * Resolve o alvo por arquivo, id ou numero. Aceita lista e faixa:
 * `3,4,7` e `3..7`. Fechar as sete manifestacoes de uma tacada era sete comandos.
 */
export function alvosDe(lista, texto) {
  const pedidos = String(texto).split(',').map((x) => x.trim()).filter(Boolean);
  const achados = [];
  for (const pedido of pedidos) {
    const faixa = pedido.match(/^(\d+)\.\.(\d+)$/);
    if (faixa) {
      const [de, ate] = [Number(faixa[1]), Number(faixa[2])];
      if (de > ate) throw new Erro(`Faixa "${pedido}" esta invertida.`);
      const naFaixa = lista.filter((x) => x.numero >= de && x.numero <= ate);
      if (!naFaixa.length) throw new Erro(`Nenhuma entrega na faixa ${pedido}.`);
      achados.push(...naFaixa);
      continue;
    }
    const alvo = lista.find((x) =>
      x.arquivo === pedido || x.arquivo === `${pedido}.md` || x.fm.id === pedido || String(x.numero) === pedido);
    if (!alvo) throw new Erro(`Entrega "${pedido}" nao encontrada.`);
    achados.push(alvo);
  }
  // sem repetir: `3..7,4` e um pedido plausivel e nao deve mover duas vezes
  return [...new Map(achados.map((x) => [x.caminho, x])).values()];
}

export function entregaMove(args) {
  const m = exigirMateria(args);
  const raiz = acharEscritorio();
  const [pedido, destino] = args._;
  if (!pedido || !destino) throw new Erro('Uso: attorneyfw entrega move <entrega|lista|faixa> <estado> [--forcar]');

  const alvos = alvosDe(entregas(m), pedido);
  // Em lote, uma peca ja protocolada no meio da faixa nao pode abortar as
  // outras depois de metade ja ter movido. Confere tudo antes de mexer.
  if (!args.forcar) {
    const fechadas = alvos.filter((x) => x.estado === 'entregue' && destino !== 'entregue');
    if (fechadas.length) {
      throw new Erro(`${fechadas.map((x) => x.arquivo).join(', ')} em entregue — nada foi movido.\n`
        + '       Reabrir o que ja saiu do escritorio e deliberado; repita com --forcar se for isso mesmo.');
    }
  }

  // Fechar entrega sem registrar a data e perder a unica prova de tempestividade
  // que o escritorio controla. O gate cobra depois; carimbar aqui evita a volta.
  const carimbo = args.em || new Date().toISOString().slice(0, 10);

  for (const alvo of alvos) {
    const r = moverEntrega(m, alvo.arquivo, destino, { forcar: Boolean(args.forcar) });
    // `valor`, nao `!alvo.fm.entregue_em`: chave vazia no YAML raso vira `[]`,
    // que e truthy — o carimbo era pulado em toda entrega recem-criada.
    if (destino === 'entregue' && !valor(alvo.fm.entregue_em)) {
      const raw = readFileSync(r.caminho, 'utf8');
      // Reescreve a chave inteira, e nao so o valor: o template traz
      // `entregue_em:` sem espaco, e preservar o que veio produzia
      // `entregue_em:2026-02-19`. O `yamlRaso` daqui e leniente e lia assim
      // mesmo, mas em YAML de verdade isso e uma string solta, nao um par
      // chave-valor — e o arquivo da entrega e material que outra ferramenta
      // pode abrir. Encontrado conferindo um caso real.
      writeFileSync(r.caminho, raw.replace(/^entregue_em:.*$/m, `entregue_em: ${carimbo}`), 'utf8');
    }
    console.log(`${c.cyan(r.de)} -> ${c.green(r.para)}  ${rel(raiz, r.caminho)}`);
  }
  if (destino === 'entregue') console.log(c.dim(`  ${m.voc.fechada} em ${carimbo}`));
  if (alvos.length > 1) console.log(c.dim(`  ${alvos.length} entregas movidas`));
}

/** Reescreve id, numero e titulo no frontmatter e renomeia o arquivo junto. */
function reescrever(m, alvo, { numero = alvo.numero, titulo = alvo.fm.titulo || '' }) {
  const id = `ent-${String(numero).padStart(2, '0')}-${slug(titulo)}`;
  const novo = join(m.dir, 'entregas', alvo.estado, `${id}.md`);
  const raiz = acharEscritorio();
  if (novo !== alvo.caminho && existsSync(novo)) throw new Erro(`${rel(raiz, novo)} ja existe.`);

  const raw = readFileSync(alvo.caminho, 'utf8');
  // Casa CRLF tambem: no Windows o arquivo abre com `---\r\n`, e procurar
  // `---\n` cru faria o comando recusar toda entrega do disco.
  const mm = /^(﻿?---\r?\n)([\s\S]*?)(\r?\n---)/.exec(raw);
  if (!mm) throw new Erro(`${alvo.arquivo} nao tem frontmatter — corrija a mao.`);
  // so o frontmatter e reescrito: `^numero:` solto pegaria linha do texto
  const fm = mm[2]
    .replace(/^id:.*$/m, `id: ${id}`)
    .replace(/^numero:.*$/m, `numero: ${numero}`)
    .replace(/^titulo:.*$/m, `titulo: ${titulo}`);
  writeFileSync(alvo.caminho, mm[1] + fm + raw.slice(mm[1].length + mm[2].length), 'utf8');
  if (novo !== alvo.caminho) renameSync(alvo.caminho, novo);
  return { id, caminho: novo };
}

export function entregaRenumber(args) {
  const m = exigirMateria(args);
  const [pedido, destino] = args._;
  if (!pedido || !destino) throw new Erro('Uso: attorneyfw entrega renumber <entrega> <novo numero>');
  const numero = Number(destino);
  if (!Number.isInteger(numero) || numero < 1) throw new Erro(`"${destino}" nao e um numero de entrega.`);

  const todas = entregas(m);
  const [alvo] = alvosDe(todas, pedido);
  if (alvo.numero === numero) throw new Erro(`Entrega ja e a numero ${numero}.`);
  const ocupado = todas.find((x) => x.numero === numero);
  if (ocupado) {
    throw new Erro(`Numero ${numero} ja e de ${ocupado.arquivo}.\n`
      + '       Renumerar por cima troca duas entregas de lugar sem dizer — mova a outra antes.');
  }

  const antes = alvo.arquivo;
  const r = reescrever(m, alvo, { numero });
  console.log(`${c.green('renumerada')}  ${antes} -> ${rel(acharEscritorio(), r.caminho)}`);
  console.log(c.dim('  confira o plano: o gate compara os dois'));
}

export function entregaRetitle(args) {
  const m = exigirMateria(args);
  const pedido = args._.shift();
  const titulo = args._.join(' ').trim();
  if (!pedido || !titulo) throw new Erro('Uso: attorneyfw entrega retitle <entrega> "Titulo novo"');
  if (titulo.includes(':')) throw new Erro('Titulo com ":" — o NTFS trunca o arquivo para 0 byte. Use travessao ou hifen.');

  const [alvo] = alvosDe(entregas(m), pedido);
  const antes = alvo.arquivo;
  const r = reescrever(m, alvo, { titulo });
  console.log(`${c.green('retitulada')}  ${antes} -> ${rel(acharEscritorio(), r.caminho)}`);
  console.log(c.dim(`  "${alvo.fm.titulo || '(sem titulo)'}" -> "${titulo}"`));
  console.log(c.dim('  confira o plano: o gate compara os dois'));
}
