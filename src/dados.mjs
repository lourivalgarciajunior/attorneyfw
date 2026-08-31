/**
 * `attorneyfw dados` — o que tem formato de dado pessoal numa peca.
 *
 * Este comando **nao substitui nada**, e a recusa e o ponto dele. O corpus que
 * originou este trabalho tinha tres pecas anonimizadas a mao e as tres sairam
 * pela metade; quem roda uma varredura e le "3 ocorrencias tratadas" conclui que
 * acabou. Aqui o texto sai intacto e a saida serve para **escrever o mapa** —
 * que e o que cobre de verdade.
 *
 * A segunda recusa importa tanto quanto: ele reconhece **formato, e nao pessoa**.
 * Nome proprio foi o que escapou nas tres pecas, e nenhum regex o acharia. Dizer
 * o contrario seria o unico jeito de piorar o que ja existe — o usuario passaria
 * a confiar numa cobertura que nao existe.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Erro, acharEscritorio, c, entregas, exigirMateria, rel } from './core.mjs';
import { alvosDe } from './entrega.mjs';
import { ARQUIVO_MAPA, lerMapa } from './anonimizar.mjs';

/** Digito verificador do CPF. Sem ele, toda sequencia de 11 numeros vira alarme. */
function cpfValido(d) {
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dig = (ate) => {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * (ate + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dig(9) === Number(d[9]) && dig(10) === Number(d[10]);
}

/** Digito verificador do CNPJ, pelo mesmo motivo. */
function cnpjValido(d) {
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const dig = (ate) => {
    const pesos = ate === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * pesos[i];
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dig(12) === Number(d[12]) && dig(13) === Number(d[13]);
}

const so = (s) => s.replace(/\D/g, '');

/**
 * O que se reconhece. `confianca: alta` e o que tem digito verificador ou
 * sintaxe fechada; `media` e o que so tem forma, e por isso da falso positivo.
 */
const RECONHECEDORES = [
  {
    tipo: 'CPF',
    confianca: 'alta',
    re: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,
    aceita: (m) => cpfValido(so(m)),
  },
  {
    tipo: 'CNPJ',
    confianca: 'alta',
    re: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g,
    aceita: (m) => cnpjValido(so(m)),
  },
  {
    tipo: 'e-mail',
    confianca: 'alta',
    re: /\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g,
    aceita: () => true,
  },
  {
    tipo: 'telefone',
    confianca: 'media',
    re: /(?:\(\d{2}\)\s?|\b0?\d{2}[\s-])?\b9?\d{4}[-\s]?\d{4}\b/g,
    // Ano, valor e numero de processo tem a mesma forma. So conta o que traz
    // marca de telefone perto, ou DDD entre parenteses.
    aceita: (m, ctx) => /\(\d{2}\)/.test(m) || /(?:tel|fone|celular|whats|contato)/i.test(ctx),
  },
  {
    tipo: 'RG',
    confianca: 'media',
    re: /\b\d{1,2}\.?\d{3}\.?\d{3}-?[\dxX]\b/g,
    aceita: (m, ctx) => /\b(?:RG|R\.G\.|identidade|SESP|SSP)\b/i.test(ctx),
  },
  {
    tipo: 'cartao',
    confianca: 'media',
    re: /\b(?:\d{4}[\s.-]?){3}\d{4}\b/g,
    aceita: (m, ctx) => !/(?:processo|autos|protocolo)/i.test(ctx),
  },
];

/** Varre o texto e devolve o que tem formato reconhecivel. */
export function achar(texto) {
  const out = [];
  for (const r of RECONHECEDORES) {
    r.re.lastIndex = 0;
    for (const m of texto.matchAll(r.re)) {
      const ctx = texto.slice(Math.max(0, m.index - 60), m.index + m[0].length + 30);
      if (!r.aceita(m[0], ctx)) continue;
      out.push({ tipo: r.tipo, confianca: r.confianca, valor: m[0], indice: m.index });
    }
  }
  // Um mesmo CPF grafado com e sem pontuacao e o mesmo dado.
  const vistos = new Set();
  return out
    .filter((x) => {
      const k = `${x.tipo}:${so(x.valor) || x.valor.toLowerCase()}`;
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    })
    .sort((a, b) => a.indice - b.indice);
}

export function dados(args) {
  const m = exigirMateria(args);
  const raiz = acharEscritorio();
  const pedido = args._[0];
  if (!pedido) throw new Erro('Uso: attorneyfw dados <entrega> [--json]');

  const [e] = alvosDe(entregas(m), pedido);
  const md = join(m.dir, 'saida', `${e.fm.id || e.arquivo.replace('.md', '')}.md`);
  const alvo = existsSync(md) ? md : e.caminho;
  const texto = readFileSync(alvo, 'utf8');

  const achados = achar(texto);

  // Se ha mapa, o que interessa e o que esta FORA dele — o resto ja tem dono.
  let cobertos = new Set();
  let temMapa = false;
  try {
    const { pares } = lerMapa(m);
    temMapa = true;
    const chaves = pares.flatMap((p) => [p.real, p.falso]).map((x) => so(x) || x.toLowerCase());
    cobertos = new Set(chaves.filter(Boolean));
  } catch { /* sem mapa: tudo esta fora dele */ }

  const foraDoMapa = achados.filter((x) => !cobertos.has(so(x.valor) || x.valor.toLowerCase()));

  if (args.json) {
    console.log(JSON.stringify({
      arquivo: rel(raiz, alvo),
      temMapa,
      achados,
      foraDoMapa,
      reconhece: 'formato, nao pessoa — nome proprio nao e detectado',
      substitui: false,
    }, null, 2));
    return;
  }

  console.log(c.b(`dados com formato reconhecivel — ${rel(raiz, alvo)}`));
  console.log(c.dim('nada foi alterado: este comando acusa, nao substitui\n'));

  if (!achados.length) {
    console.log(c.dim('  nenhum CPF, CNPJ, e-mail, telefone, RG ou cartao com formato reconhecivel.'));
  } else {
    for (const x of achados) {
      const marca = cobertos.has(so(x.valor) || x.valor.toLowerCase())
        ? c.green('no mapa  ')
        : c.yellow('FORA     ');
      const conf = x.confianca === 'alta' ? '' : c.dim('  (so pela forma — pode ser falso positivo)');
      console.log(`  ${marca} ${x.tipo.padEnd(9)} ${x.valor}${conf}`);
    }
    console.log('');
    if (!temMapa) {
      console.log(c.yellow(`  A materia nao tem ${ARQUIVO_MAPA}. Comece por  attorneyfw anonimizar --init`));
    } else if (foraDoMapa.length) {
      console.log(c.yellow(`  ${foraDoMapa.length} item(ns) fora do mapa.`));
    } else {
      console.log(c.green('  Tudo o que tem formato reconhecivel esta no mapa.'));
    }
  }

  // A ressalva nao e rodape: e a diferenca entre esta saida e uma falsa
  // sensacao de cobertura.
  console.log(c.dim('\n  Este comando reconhece FORMATO, e nao pessoa. Nome proprio, apelido, razao'));
  console.log(c.dim('  social e endereco nao sao detectados por forma nenhuma — e foi nome proprio'));
  console.log(c.dim('  que escapou nas pecas que originaram este recurso. Ver "nada esta coberto'));
  console.log(c.dim('  aqui" nao quer dizer que a peca possa circular.'));
}
