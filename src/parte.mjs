/**
 * `attorneyfw parte` — a ficha de parte da carteira.
 *
 * A justificativa do canon estava escrita no codigo desde a 0.1.0: *"a peca 7
 * esquece o que a peca 2 afirmou — nome grafado de outro jeito, valor que mudou,
 * data que nao bate. A contraparte le as duas."* Estava certa; o **escopo**
 * estava errado.
 *
 * A leitura de oito pecas reais achou uma divergencia que o gate nao veria nem
 * em cem execucoes, porque ela nao estava dentro de peca nenhuma: um CNPJ era
 * filial de um estado numa materia e a autora, com sede e inscricao estadual de
 * outro, na materia vizinha. Cliente recorrente era quatro de oito.
 *
 * Aqui a qualificacao mora em um lugar so, e a materia referencia em vez de
 * redigitar. Redigitar era a origem mecanica da divergencia.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  Erro, acharEscritorio, c, escrever, hoje, partesDaCarteira, rel, slug, soDigitos, template, valor,
} from './core.mjs';

/** Digito verificador do CPF. */
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

/** Digito verificador do CNPJ. */
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

/** `cpf`, `cnpj` ou `null`. O digito verificador evita ficha aberta com numero trocado. */
export function tipoDocumento(bruto) {
  const d = soDigitos(bruto);
  if (d.length === 11) return cpfValido(d) ? 'cpf' : null;
  if (d.length === 14) return cnpjValido(d) ? 'cnpj' : null;
  return null;
}

export function parteNew(args) {
  const raiz = acharEscritorio();
  const nome = args._.join(' ').trim();
  if (!nome) throw new Erro('Uso: attorneyfw parte new "Nome completo" --documento <CPF|CNPJ> [--matriz <slug>]');
  if (nome.includes(':')) throw new Erro('Nome com ":" — o NTFS trunca o arquivo para 0 byte. Use travessao ou hifen.');

  // O documento e obrigatorio, e nao por burocracia: e ele que distingue duas
  // pessoas com o mesmo nome, e e ele que o gate compara entre materias.
  const doc = String(args.documento || '').trim();
  if (!doc) {
    throw new Erro(
      '--documento e obrigatorio.\n'
      + '  E o documento que distingue homonimo e que o gate compara entre materias.\n'
      + '  Ficha sem ele nao serve para o que esta ficha existe.',
    );
  }
  const tipo = tipoDocumento(doc);
  if (!tipo) {
    throw new Erro(
      `"${doc}" nao e um CPF nem um CNPJ valido (digito verificador nao fecha).\n`
      + '  Confira antes de abrir a ficha: numero trocado aqui se propaga para toda peca da carteira.',
    );
  }

  const nomeSlug = args.slug ? slug(String(args.slug)) : slug(nome);
  const caminho = join(raiz, 'partes', `${nomeSlug}.md`);
  if (existsSync(caminho)) throw new Erro(`${rel(raiz, caminho)} ja existe.`);

  const jaTem = partesDaCarteira(raiz).find((p) => soDigitos(p.documento) === soDigitos(doc));
  if (jaTem) {
    throw new Erro(
      `o documento ${doc} ja esta na ficha ${jaTem.slug} ("${jaTem.nome}").\n`
      + '  Uma qualificacao por documento — e o ponto desta ficha. Se for outro\n'
      + '  estabelecimento, o CNPJ e outro; se for a mesma parte, use a ficha existente.',
    );
  }

  if (args.matriz) {
    const m = partesDaCarteira(raiz).find((p) => p.slug === String(args.matriz));
    if (!m) throw new Erro(`nao ha ficha "${args.matriz}" na carteira para ser a matriz.`);
    if (tipo !== 'cnpj') throw new Erro('--matriz so faz sentido em pessoa juridica.');
  }

  escrever(caminho, template('parte-carteira.md', {
    nome, documento: doc, slug: nomeSlug, data: hoje(),
    apelidos: args.apelidos ? `[${args.apelidos}]` : '[]',
    matriz: args.matriz || '',
  }));

  console.log(`${c.green('parte na carteira')}  ${rel(raiz, caminho)}  ${c.dim(`(${tipo.toUpperCase()})`)}`);
  console.log(c.dim(`  na materia, referencie com  ref: ${nomeSlug}  na ficha de parte`));
  if (tipo === 'cnpj' && !args.matriz) {
    console.log(c.dim('  filial e ficha propria, com o CNPJ dela e  matriz: ' + nomeSlug));
  }
}

export function parteList() {
  const raiz = acharEscritorio();
  const todas = partesDaCarteira(raiz);
  if (!todas.length) {
    console.log(c.dim('nenhuma parte na carteira — attorneyfw parte new "Nome" --documento <CPF|CNPJ>'));
    return;
  }
  console.log(c.b(`partes da carteira`) + c.dim(`  ${todas.length}`));
  for (const p of todas) {
    const tipo = tipoDocumento(p.documento);
    const marca = tipo ? c.dim(tipo.toUpperCase()) : c.red('DOC?');
    const filial = p.matriz ? c.dim(`  filial de ${p.matriz}`) : '';
    console.log(`  ${marca}  ${p.slug.padEnd(30)} ${p.documento.padEnd(20)} ${p.nome}${filial}`);
  }
  console.log(c.dim('\n  a materia referencia com  ref: <slug>  na ficha de parte dela'));
}
