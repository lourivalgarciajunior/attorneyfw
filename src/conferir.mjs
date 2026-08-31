/**
 * Conferencia numerica da peca pronta.
 *
 * Tres defeitos encontrados em oito pecas reais, nenhum deles exigindo
 * conhecimento juridico — todos exigindo conferencia:
 *
 * 1. **Extenso contra algarismo.** Num alvara: `R$ 7.155,76` mais `R$ 27,10`
 *    dao `R$ 7.182,86`, e a soma esta certa; o extenso na mesma linha diz
 *    *"...e oitenta centavos"*. Em pedido de alvara o extenso costuma
 *    prevalecer, entao o que saiu errado foi justamente a parte que o cartorio
 *    le com atencao.
 * 2. **Item alegado contra item pedido.** Numa declaratoria, a lista numerada
 *    vai de 1 a 76 e tem 75 itens; um numero esta grafado com ponto-e-virgula no
 *    meio dos digitos e reaparece assim **dentro do pedido**; e o pedido inclui
 *    um item que nao consta dos fatos.
 * 3. **Numero dentro das aspas.** Numa anulatoria fiscal, a transcricao do auto
 *    de infracao diz `,21` e o paragrafo seguinte usa `,25` — e a soma da peca
 *    fecha com o `,25`. O erro esta na citacao direta do documento que a propria
 *    autora juntou.
 *
 * O que os tres tem em comum: sao **comparacoes**, nao juizos. A pessoa atenta
 * falha justamente neles, porque confia no numero que ja leu uma vez. Maquina
 * nao le duas vezes — compara.
 *
 * Duas regras valem para os tres (ver ADR):
 *
 * - **Divergencia sai como par**, com os dois lados a vista. Nunca "valor
 *   incorreto": a ferramenta nao sabe qual dos dois esta certo, e fingir que
 *   sabe faria o advogado corrigir o lado errado.
 * - **Nada e corrigido.** Nas tres pecas o lado certo foi diferente.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Erro, acharEscritorio, c, entregas, exigirMateria, rel } from './core.mjs';
import { alvosDe } from './entrega.mjs';
import { build } from './build.mjs';
import { centavos, emReais } from './dinheiro.mjs';

const sa = (s) => String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// ------------------------------------------------------- extenso -> numero

const UNIDADES = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6,
  sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14,
  catorze: 14, quinze: 15, dezesseis: 16, dezasseis: 16, dezessete: 17, dezassete: 17,
  dezoito: 18, dezenove: 19, dezanove: 19, vinte: 20, trinta: 30, quarenta: 40,
  cinquenta: 50, cincoenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
  cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300,
  quatrocentos: 400, quatrocentas: 400, quinhentos: 500, quinhentas: 500,
  seiscentos: 600, seiscentas: 600, setecentos: 700, setecentas: 700,
  oitocentos: 800, oitocentas: 800, novecentos: 900, novecentas: 900,
};
const ESCALAS = { mil: 1e3, milhao: 1e6, milhoes: 1e6, bilhao: 1e9, bilhoes: 1e9 };
const IGNORA = new Set(['e', 'de', 'do', 'da']);

/**
 * Soma um trecho por extenso. Devolve `null` quando encontra palavra que nao
 * conhece — silencio e melhor que palpite, porque um numero "conferido" errado
 * e pior que um numero nao conferido.
 */
function paraNumero(txt) {
  const palavras = sa(txt).split(/[^a-z]+/).filter(Boolean).filter((w) => !IGNORA.has(w));
  if (!palavras.length) return null;
  let total = 0;
  let grupo = 0;
  let viu = false;
  for (const w of palavras) {
    if (UNIDADES[w] !== undefined) { grupo += UNIDADES[w]; viu = true; continue; }
    if (ESCALAS[w] !== undefined) {
      // "mil" sozinho vale 1000; "duzentos mil" vale 200 x 1000.
      total += (grupo || 1) * ESCALAS[w];
      grupo = 0;
      viu = true;
      continue;
    }
    return null;
  }
  return viu ? total + grupo : null;
}

/** `"mil reais e cinquenta centavos"` vira 100050 centavos. */
export function extensoEmCentavos(txt) {
  const t = sa(txt);
  const iReal = t.search(/\breais\b|\breal\b/);
  const iCent = t.search(/\bcentavos?\b/);

  if (iReal >= 0) {
    const inteiro = paraNumero(t.slice(0, iReal));
    if (inteiro === null) return null;
    if (iCent > iReal) {
      const cent = paraNumero(t.slice(iReal, iCent).replace(/^\s*(reais|real)/, ''));
      if (cent === null) return null;
      return inteiro * 100 + cent;
    }
    return inteiro * 100;
  }
  if (iCent >= 0) {
    const cent = paraNumero(t.slice(0, iCent));
    return cent === null ? null : cent;
  }
  const n = paraNumero(t);
  return n === null ? null : n * 100;
}

// --------------------------------------------------------------- extenso

const RE_VALOR_COM_EXTENSO = /R\$\s*R?\$?\s*([\d.]+,\d{2})\s*\(([^)]{8,220})\)/g;

function confereExtenso(texto) {
  const out = [];
  for (const m of texto.matchAll(RE_VALOR_COM_EXTENSO)) {
    const algarismo = centavos(m[1]);
    const porExtenso = extensoEmCentavos(m[2]);
    if (porExtenso === null || porExtenso === algarismo) continue;
    out.push({
      tipo: 'extenso',
      esquerda: { rotulo: 'algarismo', valor: `R$ ${emReais(algarismo)}` },
      direita: { rotulo: 'por extenso', valor: `R$ ${emReais(porExtenso)}` },
      trecho: m[2].replace(/\s+/g, ' ').slice(0, 120),
    });
  }
  return out;
}

// ------------------------------------------------------------------ soma

const RE_TOTAL = /(?:totaliz\w*|perfaz\w*|no total de|somando)[^.]{0,60}?R\$\s*([\d.]+,\d{2})/gi;
const RE_VALOR = /R\$\s*R?\$?\s*([\d.]+,\d{2})/g;

/**
 * Confere o total declarado contra as parcelas que o antecedem.
 *
 * A janela comeca no paragrafo do total e recua ate dois paragrafos — no caso do
 * alvara, uma das parcelas estava dois paragrafos atras. Assim que alguma
 * combinacao final fecha, para: erra-se para o silencio, e nao para o alarme.
 */
function confereSoma(texto) {
  const paras = texto.split(/\n{2,}/);
  const out = [];

  paras.forEach((p, i) => {
    RE_TOTAL.lastIndex = 0;
    const mt = RE_TOTAL.exec(p);
    if (!mt) return;
    const total = centavos(mt[1]);

    const janela = paras.slice(Math.max(0, i - 2), i + 1).join('\n\n');
    const ate = janela.lastIndexOf(mt[0]);
    RE_VALOR.lastIndex = 0;
    const parcelas = [...janela.slice(0, ate).matchAll(RE_VALOR)].map((x) => centavos(x[1]));
    if (parcelas.length < 2) return;

    // As k ultimas parcelas, de 2 ate todas. Qualquer uma que feche encerra.
    for (let k = 2; k <= parcelas.length; k++) {
      const usadas = parcelas.slice(-k);
      if (usadas.reduce((a, b) => a + b, 0) === total) return;
    }
    out.push({
      tipo: 'soma',
      esquerda: { rotulo: 'parcelas somadas', valor: parcelas.map((x) => `R$ ${emReais(x)}`).join(' + ') },
      direita: { rotulo: 'total declarado', valor: `R$ ${emReais(total)}` },
      trecho: mt[0].replace(/\s+/g, ' ').slice(0, 120),
    });
  });
  return out;
}

// ------------------------------------------------------------------ itens

/**
 * Item de lista enumerada. O valor e capturado **inteiro**, ate o fim da linha,
 * e classificado depois.
 *
 * A primeira versao exigia que o valor nao tivesse `;` no meio — e com isso o
 * item malformado `98841;1749` simplesmente nao casava, e a lista aparecia com
 * um indice a menos. O relatorio dizia "falta o item 72" onde o certo e "o item
 * 72 esta malformado", que e outro defeito e outra correcao. Capturar e depois
 * classificar diz a verdade nos dois casos.
 */
const RE_ITEM = /^[ \t]*(\d{1,4})\s*[-.)]\s*(\S.*?)[;,.]?[ \t]*$/gm;
const RE_PEDIDO = /(?:ante o exposto|diante do exposto|isto posto|pelo exposto|dos pedidos|requer)/i;

/**
 * Lista enumerada nos fatos contra a lista no pedido.
 *
 * O pedido e o que vira dispositivo da sentenca. Item malformado ali nao casa
 * com nenhuma linha da fatura, e a declaracao de inexistencia nao o alcanca —
 * sobra exatamente a cobranca que se queria derrubar.
 */
function confereItens(texto) {
  const itens = [...texto.matchAll(RE_ITEM)].map((m) => ({ idx: Number(m[1]), valor: m[2] }));
  if (itens.length < 5) return []; // lista curta e enumeracao de topico, nao inventario

  const out = [];

  // 1. buraco na sequencia
  const max = Math.max(...itens.map((x) => x.idx));
  const presentes = new Set(itens.map((x) => x.idx));
  const faltando = [];
  for (let i = 1; i <= max; i++) if (!presentes.has(i)) faltando.push(i);
  if (faltando.length) {
    out.push({
      tipo: 'item',
      esquerda: { rotulo: 'a numeracao vai ate', valor: String(max) },
      direita: { rotulo: 'itens presentes', valor: `${itens.length} — falta ${faltando.slice(0, 8).join(', ')}` },
      trecho: 'lista enumerada nos fatos',
    });
  }

  // 2. forma divergente: a maioria manda, e quem foge dela e o suspeito
  const forma = (v) => `${/^\d+$/.test(v) ? 'd' : 'x'}${v.length}`;
  const contagem = {};
  for (const x of itens) contagem[forma(x.valor)] = (contagem[forma(x.valor)] || 0) + 1;
  const dominante = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0];
  if (!dominante || dominante[1] < itens.length * 0.7) return out;

  const bons = itens.filter((y) => forma(y.valor) === dominante[0]);
  const digitos = dominante[0][0] === 'd' ? Number(dominante[0].slice(1)) : 0;
  for (const x of itens.filter((y) => forma(y.valor) !== dominante[0])) {
    out.push({
      tipo: 'item',
      esquerda: { rotulo: `item ${x.idx}`, valor: x.valor },
      direita: { rotulo: 'forma dos demais', valor: digitos ? `${digitos} digitos` : dominante[0] },
      trecho: 'item malformado — no pedido, nao casa com nenhuma linha da cobranca',
    });
  }

  // 3. lista dos fatos contra a lista do pedido. So os bem-formados entram na
  //    comparacao: o malformado ja foi apontado acima, e conta-lo de novo como
  //    "ausente do pedido" diria duas coisas sobre o mesmo defeito.
  const iPedido = texto.search(RE_PEDIDO);
  if (iPedido < 0 || !digitos) return out;
  const pedido = texto.slice(iPedido);

  // Numero de fatura, processo ou protocolo tem a mesma forma e nao e item.
  const alvo = new RegExp(`(.{0,12}?)\\b(\\d{${digitos}})\\b`, 'g');
  const noPedido = new Set(
    [...pedido.matchAll(alvo)]
      .filter((m) => !/n[.ºo°]\s*$|fatura\s*$|processo\s*$|protocolo\s*$|autos\s*$/i.test(m[1]))
      .map((m) => m[2]),
  );
  if (noPedido.size < 3) return out;
  const nosFatos = new Set(bons.map((x) => x.valor));

  for (const v of [...nosFatos].filter((x) => !noPedido.has(x))) {
    out.push({
      tipo: 'item',
      esquerda: { rotulo: 'alegado nos fatos', valor: v },
      direita: { rotulo: 'no pedido', valor: 'ausente' },
      trecho: 'item alegado que o pedido nao alcanca',
    });
  }
  for (const v of [...noPedido].filter((x) => !nosFatos.has(x))) {
    out.push({
      tipo: 'item',
      esquerda: { rotulo: 'pedido inclui', valor: v },
      direita: { rotulo: 'nos fatos', valor: 'ausente' },
      trecho: 'item pedido sem causa de pedir individualizada',
    });
  }
  return out;
}

// ---------------------------------------------------------------- comando

export function conferirTexto(texto) {
  return [...confereExtenso(texto), ...confereSoma(texto), ...confereItens(texto)];
}

const ROTULO = { extenso: 'extenso x algarismo', soma: 'soma x total', item: 'item x pedido' };

export function conferir(args) {
  const m = exigirMateria(args);
  const raiz = acharEscritorio();
  const pedido = args._[0];
  if (!pedido) throw new Erro('Uso: attorneyfw conferir <entrega> [--json]');

  const [e] = alvosDe(entregas(m), pedido);
  // Conferir uma versao e protocolar outra e pior que nao conferir: o texto
  // examinado tem de ser o que sai.
  const fonte = join(m.dir, 'saida', `${e.fm.id || e.arquivo.replace('.md', '')}.md`);
  if (!existsSync(fonte)) build({ ...args, _: [String(e.numero)] });
  const texto = readFileSync(fonte, 'utf8');

  const achados = conferirTexto(texto);

  if (args.json) {
    console.log(JSON.stringify({
      arquivo: rel(raiz, fonte), achados, corrigiu: false,
      nota: 'divergencia sai como par; a ferramenta nao sabe qual lado esta certo',
    }, null, 2));
    return achados.length ? 1 : 0;
  }

  console.log(c.b(`conferencia numerica — ${rel(raiz, fonte)}`));
  if (!achados.length) {
    console.log(c.green('\n  Nenhuma divergencia nas tres verificacoes.'));
    console.log(c.dim('  Extenso, soma e item. Nao confere numero dentro de imagem anexada.'));
    return 0;
  }

  console.log(c.dim(`${achados.length} divergencia(s) — nada foi corrigido\n`));
  for (const a of achados) {
    console.log(`  ${c.yellow(ROTULO[a.tipo])}  ${c.dim(a.trecho)}`);
    console.log(`    ${a.esquerda.rotulo.padEnd(22)} ${c.b(a.esquerda.valor)}`);
    console.log(`    ${a.direita.rotulo.padEnd(22)} ${c.b(a.direita.valor)}`);
    console.log('');
  }
  console.log(c.dim('  Os dois lados estao a vista de proposito: a ferramenta nao sabe qual'));
  console.log(c.dim('  esta certo. Escolher qual prevalece e de quem assina.'));
  return 1;
}
