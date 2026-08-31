/**
 * Relatorio de resultado ao cliente.
 *
 * O pedido do escritorio era pos-venda: explicar a vitoria e, sobretudo,
 * explicar a derrota parcial. *"Perdi uma causa em que o consumidor pedia
 * 50.000 de danos morais, mas o juiz condenou a 20.000. O relatorio sai
 * demonstrando o ganho de 30.000 para o cliente."*
 *
 * Aquele exemplo carrega a regra inteira deste modulo: **os mesmos dois numeros
 * sao ganho de trinta mil para o reu e perda parcial de trinta mil para o
 * autor.** O sinal nao esta nos numeros; esta em de que lado o cliente estava.
 *
 * Por isso o polo **nao se infere**. Sem papel declarado no canon — ou, na
 * falta dele, no `materia.yaml` —, o comando falha. Relatorio com o sinal
 * trocado nao e um relatorio ruim: e um documento que diz ao cliente que ele
 * ganhou quando perdeu.
 */
import { join } from 'node:path';
import {
  Erro, acharEscritorio, c, canon, escrever, exigirMateria, hoje, lerEscritorio,
  materias, rel, valor,
} from './core.mjs';
import { SERIE_PADRAO, centavos, corrigir, emReais, lerSerie } from './dinheiro.mjs';

const POLO_ATIVO = ['autor', 'autora', 'requerente', 'exequente', 'impetrante', 'reclamante'];
const POLO_PASSIVO = ['reu', 'ré', 're', 'requerido', 'requerida', 'executado', 'executada', 'impetrado', 'reclamado'];

const semAcento = (s) => String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

/**
 * O papel do cliente, procurado primeiro no canon de partes — que e onde ele e
 * declarado com qualificacao — e so depois no `materia.yaml`.
 */
function poloDoCliente(m) {
  const cliente = semAcento(valor(m.cfg.cliente));
  const ficha = canon(m).partes.find(
    (p) => semAcento(p.nome) === cliente || p.apelidos.some((a) => semAcento(a) === cliente),
  );
  const papel = semAcento(valor(ficha?.fm.papel) || valor(m.cfg.papel));

  if (POLO_ATIVO.includes(papel)) return { polo: 'ativo', papel, fonte: ficha ? 'canon de partes' : 'materia.yaml' };
  if (POLO_PASSIVO.includes(papel)) return { polo: 'passivo', papel, fonte: ficha ? 'canon de partes' : 'materia.yaml' };

  throw new Erro(
    `nao da para dizer de que lado o cliente estava (papel "${papel || 'vazio'}").\n`
    + `  Declare em docs/canon/partes/, ou em materia.yaml, um destes:\n`
    + `    polo ativo   ${POLO_ATIVO.join(', ')}\n`
    + `    polo passivo ${POLO_PASSIVO.join(', ')}\n`
    + '  O polo nao se infere: os mesmos dois numeros sao ganho para um lado e\n'
    + '  perda para o outro, e relatorio com o sinal trocado diz ao cliente que\n'
    + '  ele ganhou quando perdeu.',
  );
}

/** Corrige, quando ha data de referencia; senao devolve o nominal, dizendo. */
function talvezCorrigir(raiz, cents, de, ate, nomeSerie) {
  if (!de) return { valor: cents, corrigido: false };
  const serie = lerSerie(raiz, nomeSerie);
  const k = corrigir({ valor: cents, de, ate, serie });
  return { valor: k.corrigido, corrigido: true, fator: k.fator, serie: serie.rotulo, de: k.de, ate: k.ate };
}

export async function relatorio(args) {
  const m = exigirMateria(args);
  const raiz = acharEscritorio();
  const esc = lerEscritorio(raiz);

  // O tipo vem antes de tudo: mandar um consultivo registrar desfecho para so
  // entao dizer que o comando nao serve para ele seria fazer trabalho a toa.
  // Consultivo nao tem polo, e forcar um seria inventar uma disputa que nao houve.
  if (m.tipo === 'consultivo') {
    throw new Erro(
      'o relatorio de resultado e de materia contenciosa.\n'
      + '  Em consultivo nao ha pedido nem condenacao para comparar, e o ganho de um\n'
      + '  parecer nao e "pedido menos obtido". O desfecho ja esta registrado no\n'
      + '  materia.yaml e aparece em `attorneyfw status` e `attorneyfw buscar`.',
    );
  }

  if (!m.resultado) {
    throw new Erro(
      'a materia nao tem resultado registrado.\n'
      + '  Rode:  attorneyfw materia fechar <ganho|ganho_parcial|perda|acordo|extinto>\n'
      + '  O relatorio nao adivinha desfecho a partir do kanban: entrega protocolada\n'
      + '  registra que a peca saiu, nao o que aconteceu depois.',
    );
  }

  const { polo, papel, fonte } = poloDoCliente(m);
  const pedidoBruto = valor(m.cfg.valor_pedido);
  const obtidoBruto = valor(m.cfg.resultado_valor);
  if (!pedidoBruto) {
    throw new Erro(
      'falta `valor_pedido` no materia.yaml.\n'
      + '  Sem ele, o relatorio teria de deduzir o pedido da peca — e deduzir e adivinhar.',
    );
  }

  const pedido = centavos(pedidoBruto);
  const obtido = obtidoBruto ? centavos(obtidoBruto) : 0;
  const ate = valor(m.cfg.resultado_em) || hoje();
  const nomeSerie = String(args.serie || SERIE_PADRAO);
  const dePedido = valor(m.cfg.valor_pedido_em) || (args.de ? String(args.de) : '');

  const kPedido = talvezCorrigir(raiz, pedido, dePedido, ate, nomeSerie);
  const pedidoRef = kPedido.valor;

  // Aqui esta a regra inteira: para o polo ativo, ganho e o que entrou; para o
  // passivo, e o que se deixou de pagar.
  const ganho = polo === 'ativo' ? obtido : pedidoRef - obtido;
  const naoObtido = polo === 'ativo' ? pedidoRef - obtido : obtido;
  const proporcao = pedidoRef ? ganho / pedidoRef : 0;

  const md = [];
  md.push(`# Relatorio de resultado — ${valor(m.cfg.titulo) || m.slug}`);
  md.push('');
  md.push(`**Cliente:** ${valor(m.cfg.cliente) || '-'} (${papel})  `);
  if (valor(m.cfg.processo)) md.push(`**Processo:** ${valor(m.cfg.processo)}  `);
  md.push(`**Desfecho:** ${m.resultado.replace('_', ' ')} em ${ate}  `);
  md.push(`**Emitido em:** ${hoje()}`);
  md.push('');

  md.push('## O que estava em discussao');
  md.push('');
  md.push(polo === 'ativo'
    ? `Pedimos ${fmt(pedido)}${kPedido.corrigido ? `, que corrigidos ate ${ate} equivalem a ${fmt(pedidoRef)}` : ''}.`
    : `A parte contraria pedia ${fmt(pedido)}${kPedido.corrigido ? `, que corrigidos ate ${ate} equivalem a ${fmt(pedidoRef)}` : ''}.`);
  md.push('');

  md.push('## O resultado');
  md.push('');
  md.push(polo === 'ativo'
    ? `Obtivemos ${fmt(obtido)}.`
    : `A condenacao ficou em ${fmt(obtido)}.`);
  md.push('');
  md.push(polo === 'ativo'
    ? `**Ganho para o cliente: ${fmt(ganho)}**, correspondente a ${(proporcao * 100).toFixed(1)}% do que se pediu.`
    : `**Ganho para o cliente: ${fmt(ganho)}** — o que se deixou de pagar, correspondente a ${(proporcao * 100).toFixed(1)}% do que era exigido.`);
  md.push('');
  if (naoObtido > 0) {
    md.push(polo === 'ativo'
      ? `Nao obtivemos ${fmt(naoObtido)} do que foi pedido.`
      : `Restou a pagar ${fmt(naoObtido)}.`);
    md.push('');
  }
  if (valor(m.cfg.resultado_nota)) {
    md.push(`> ${valor(m.cfg.resultado_nota)}`);
    md.push('');
  }

  if (kPedido.corrigido) {
    md.push('## Como o valor foi atualizado');
    md.push('');
    md.push(`Correcao pelo ${kPedido.serie}, de ${kPedido.de} a ${kPedido.ate}, fator ${kPedido.fator.toFixed(8)}.`);
    md.push('');
    md.push(`Memoria completa: \`attorneyfw atualizar ${pedidoBruto} --de ${dePedido} --ate ${ate} --serie ${nomeSerie}\`.`);
    md.push('');
  }

  md.push('## Ressalva');
  md.push('');
  md.push('Os valores acima sao conferencia, nao o calculo oficial. O que vale e o apurado '
    + 'na fase de liquidacao e a memoria homologada nos autos.');

  const alvo = join(m.dir, 'saida', `relatorio-${m.slug}.md`);
  escrever(alvo, `${md.join('\n')}\n`);

  console.log(c.b(`relatorio — ${valor(m.cfg.cliente) || m.slug}`));
  console.log(c.dim(`polo ${polo} (${papel}, de ${fonte}) | desfecho ${m.resultado} em ${ate}\n`));
  console.log(`  pedido${kPedido.corrigido ? ' corrigido' : ' (nominal)'}   R$ ${emReais(pedidoRef).padStart(16)}`);
  console.log(`  obtido                R$ ${emReais(obtido).padStart(16)}`);
  console.log(`  ${c.b('ganho ao cliente')}      ${c.b(`R$ ${emReais(ganho).padStart(16)}`)}  ${c.dim(`${(proporcao * 100).toFixed(1)}%`)}`);
  if (!kPedido.corrigido) {
    console.log(c.yellow('\n  valores NOMINAIS: falta `valor_pedido_em` no materia.yaml (ou use --de).'));
  }
  console.log(`\n${c.green('gravado')}  ${rel(raiz, alvo)}`);

  if (args.docx) {
    const { markdownParaDocx } = await import('./docx.mjs');
    await markdownParaDocx({
      raiz,
      esc,
      texto: `${md.join('\n')}\n`,
      titulo: `Relatorio de resultado — ${valor(m.cfg.titulo) || m.slug}`,
      alvo: join(m.dir, 'saida', `Relatorio — ${valor(m.cfg.titulo) || m.slug}.docx`),
      rodape: rel(raiz, alvo),
    });
  }

  // Um relatorio so faz sentido depois de a materia fechar; se ha outras
  // fechadas, vale lembrar de onde a memoria da carteira esta.
  const outras = materias(raiz).filter((x) => x.slug !== m.slug && x.fechada).length;
  if (outras) console.log(c.dim(`  ${outras} outra(s) materia(s) encerrada(s) na carteira — attorneyfw buscar <termo>`));
}

const fmt = (cents) => `R$ ${emReais(cents)}`;
