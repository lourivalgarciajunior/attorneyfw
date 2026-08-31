/**
 * Gate de governanca. Zero violacoes antes de protocolar ou de entregar ao
 * cliente. Cada regra existe porque trabalho juridico quebra sempre nos mesmos
 * lugares: prazo que ninguem viu passar, fato alegado que nenhuma prova
 * sustenta, documento citado que nao esta no processo, topico sem
 * contra-argumento previsto, peca que saiu sem registro de quando saiu.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  ESTADOS_ATIVOS, RESULTADOS, acharEscritorio, acharMateria, artefatos, c, canon, soDigitos,
  contextoPrazo, dataValida, diasCorridosAte, entregas, estrategia, exigirMateria,
  lerEscritorio, linhasDoPlano, lista, materias, nomesDoCanon,
  pedidos as pedidosDa, pendencias, plano as planoEmVigor, prazoDe, rel, slug, valor,
} from './core.mjs';
import { ARQUIVO_MAPA } from './anonimizar.mjs';
import { tipoDocumento } from './parte.mjs';
import { achar } from './dados.mjs';
import { rotulosMisturados } from './estilo.mjs';
import { formulas } from './formulas.mjs';

const OBRIGATORIOS = ['sustenta', 'fundamento', 'risco'];

const semAcentoGate = (s) => String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/**
 * O que o titulo promete depois de `c/c`, reduzido as palavras que carregam
 * sentido.
 *
 * Forma livre de proposito conservador: quando a regra nao reconhece o cumulo,
 * ela **cala**. Errar para o silencio e a direcao certa num aviso.
 */
const PARADAS = new Set(['pedido', 'pedidos', 'de', 'da', 'do', 'com', 'e', 'a', 'o', 'em', 'por']);
function cumuloDoTitulo(titulo) {
  const t = semAcentoGate(titulo);
  const m = t.match(/\bc[/.]\s?c[.]?\s+(.{4,80})$|\bcumulada?\s+com\s+(.{4,80})$/);
  if (!m) return [];
  return (m[1] || m[2]).split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 5 && !PARADAS.has(w))
    .slice(0, 4);
}

/** Idade em anos completos. Sem data, `null` — e a regra que a usa nao roda. */
function idadeEm(nascimento, hojeIso) {
  if (!dataValida(nascimento)) return null;
  const [an, mn, dn] = nascimento.split('-').map(Number);
  const [ah, mh, dh] = hojeIso.split('-').map(Number);
  let idade = ah - an;
  if (mh < mn || (mh === mn && dh < dn)) idade--;
  return idade >= 0 && idade < 130 ? idade : null;
}


export function validate(args) {
  const raiz = acharEscritorio();
  const esc = lerEscritorio(raiz);
  const escolhida = args.materia ? exigirMateria(args) : acharMateria();
  const alvo = escolhida ? [escolhida] : materias(raiz);
  const ctx = contextoPrazo(raiz);

  const erros = [];
  const avisos = [];
  let entregasTotal = 0;
  let topicosTotal = 0;

  if (!alvo.length) avisos.push('materias: carteira vazia — attorneyfw materia new "Cliente — Assunto"');

  for (const m of alvo) {
    const r = validarMateria(m, { raiz, esc, ctx });
    erros.push(...r.erros);
    avisos.push(...r.avisos);
    entregasTotal += r.entregas;
    topicosTotal += r.topicos;
  }

  if (args.json) {
    console.log(JSON.stringify({ erros, avisos, materias: alvo.length, entregas: entregasTotal, topicos: topicosTotal }, null, 2));
    return erros.length ? 1 : 0;
  }

  console.log(`materias ${alvo.length} | entregas ${entregasTotal} | topicos ${topicosTotal}`);
  for (const a of avisos) console.log(`  ${c.yellow('aviso')}  ${a}`);
  for (const e of erros) console.log(`  ${c.red('ERRO')}   ${e}`);
  if (erros.length) {
    console.log(`\n${erros.length} violacao(oes). Gate reprovado.`);
    return 1;
  }
  console.log(`\n${c.green('OK')}${avisos.length ? ` — ${avisos.length} aviso(s)` : ''}.`);
  return 0;
}

function validarMateria(m, { raiz, esc, ctx }) {
  const erros = [];
  const avisos = [];
  const pref = m.slug;
  const erro = (onde, msg) => erros.push(`${pref}/${onde}: ${msg}`);
  const aviso = (onde, msg) => avisos.push(`${pref}/${onde}: ${msg}`);

  // ---- identidade da materia
  if (!m.cfg.cliente || m.cfg.cliente === 'a definir') aviso('materia.yaml', 'cliente nao declarado');
  if (m.tipo === 'contencioso' && !String(m.cfg.processo || '').trim()) {
    aviso('materia.yaml', 'sem numero de processo — se ja foi distribuido, registre; a peca sai com ele no cabecalho');
  }
  if (!esc.advogado || esc.advogado === 'a definir' || !esc.oab || esc.oab === 'a definir') {
    aviso('escritorio.yaml', 'advogado ou OAB nao declarados — peca sem subscritor nao protocola');
  }

  // ---- cadeia
  const decs = artefatos(m, 'dec');
  const ests = artefatos(m, m.voc.dirArtefato);
  const plans = artefatos(m, 'plano');
  if (!ests.length) erro(`docs/${m.voc.dirArtefato}`, `nenhuma ${m.voc.artefato} — trabalhar sem ela e escrever sem destino`);
  // Qual artefato esta valendo tem de ser visivel: com dois no diretorio, so um
  // deles e cobrado, e revisar a estrategia desligaria a cobranca em silencio.
  if (ests.length > 1) {
    aviso(`docs/${m.voc.dirArtefato}`, `${ests.length} versoes — vale ${ests[ests.length - 1].arquivo}, as outras nao sao lidas`);
  }
  if (!decs.length) aviso('docs/dec', 'nenhuma DEC — a estrategia nao esta fixada em lugar nenhum');
  if (ests.length && !plans.length) erro('docs/plano', `${m.voc.artefato} sem plano de entregas — nao ha o que redigir`);

  const es = entregas(m);
  const cn = canon(m, raiz);
  const nomes = nomesDoCanon(cn);
  const pend = pendencias(m);
  const peds = pedidosDa(m);
  const levantadas = new Set();
  const pagas = new Set();
  const pagasSemLastro = new Set();
  const pedidosSustentados = new Set();

  // ---- kanban contra o plano
  // Divergencia entre plano e kanban e aviso, nao erro: o trabalho e iterativo
  // e a decisao de qual lado corrigir e de quem assina. O que nao pode e a
  // divergencia ficar invisivel — foi assim que o plano virou decoracao.
  const pl = planoEmVigor(m);
  if (pl) {
    const { linhas, ignoradas } = linhasDoPlano(pl.corpo);
    const planejado = new Map(linhas.map((l) => [l.numero, l]));
    const materializado = new Set(es.filter((x) => x.estado !== 'abandonado').map((x) => x.numero));

    for (const e of es) {
      if (e.estado === 'abandonado') continue;
      const linha = planejado.get(e.numero);
      const onde = rel(m.dir, e.caminho);
      if (!linha) {
        aviso(onde, `entrega ${e.numero} nao esta no plano (${pl.arquivo}) — feita fora do plano, ou o plano ficou para tras`);
        continue;
      }
      // Comparacao por slug: acento, caixa e travessao mudam sem que o titulo
      // tenha mudado, e cobrar isso seria ruido.
      if (e.fm.titulo && slug(e.fm.titulo) !== slug(linha.titulo)) {
        aviso(onde, `titulo "${e.fm.titulo}" diverge do plano ("${linha.titulo}")`);
      }
    }
    for (const l of linhas) {
      if (!materializado.has(l.numero)) {
        aviso('docs/plano', `entrega ${l.numero} ("${l.titulo}") planejada e nao materializada — rode: attorneyfw plano --materializar`);
      }
    }
    for (const ig of ignoradas) {
      aviso('docs/plano', `linha "${ig.bruto}" nao vira entrega (${ig.motivo}) — pendencia declarada no plano`);
    }
  }

  // ---- WIP
  const emMinuta = es.filter((x) => x.estado === 'minuta');
  const wip = Number(m.cfg.wip_limit || 2);
  if (emMinuta.length > wip) {
    erro('entregas/minuta', `${emMinuta.length} entregas em minuta, limite e ${wip} — feche ou mova para bloqueado`);
  }

  // ---- numeracao
  const vistos = new Map();
  for (const e of es) {
    if (vistos.has(e.numero)) erro(rel(m.dir, e.caminho), `numero ${e.numero} duplicado com ${vistos.get(e.numero)}`);
    else vistos.set(e.numero, e.arquivo);
  }

  // ---- entrega a entrega
  for (const e of es) {
    const onde = rel(m.dir, e.caminho);
    if (e.estado === 'abandonado') continue;
    if (e.fm.estado && e.fm.estado !== e.estado) {
      erro(onde, `frontmatter diz estado "${e.fm.estado}" mas o arquivo esta em ${e.estado}/`);
    }

    // ---- prazo: a regra mais cara do gate
    const p = prazoDe(e, ctx);
    if (p?.erro) erro(onde, `prazo mal declarado — ${p.erro}`);
    if (p && !p.erro) {
      // Prazo em dias corridos declarado como processual e, quase sempre, prazo
      // material que ninguem marcou: a unidade foi trocada e o regime ficou
      // para tras. O termo inicial sai errado e a data devolvida vem depois da
      // correta — errar prazo para mais e a direcao que perde caso.
      if (p.contagem === 'corridos' && p.regime === 'processual') {
        aviso(onde, 'prazo em dias corridos com regime processual — se e prazo do CTN, rode: attorneyfw prazo set --material');
      }
      // A divergencia adotada e a data mais curta, mas quem le a agenda precisa
      // saber que existe leitura em que o prazo vai adiante.
      if (p.divergencia) {
        aviso(onde, `art. 210, par. unico, do CTN tem duas leituras aqui — adotado o vencimento em ${p.fim}; pela outra seria ${p.fimAlternativo}`);
      }
      const entregueEm = String(e.fm.entregue_em || '').trim();
      if (e.estado === 'entregue') {
        if (!entregueEm) erro(onde, 'entregue sem entregue_em — sem data nao ha como provar tempestividade');
        else if (entregueEm > p.fim) erro(onde, `entregue em ${entregueEm}, prazo venceu em ${p.fim} — intempestiva`);
      } else if (p.vencido) {
        erro(onde, `prazo venceu em ${p.fim} (ha ${-p.restam} dias uteis) e a entrega esta em ${e.estado}`);
      } else if (p.restam <= 2) {
        (p.fatal ? erro : aviso)(onde, `vence em ${p.fim} — ${p.restam} dia(s) util(eis)${p.fatal ? ', prazo FATAL' : ''}, e esta em ${e.estado}`);
      } else if (p.fatal && p.restam <= 5 && ['backlog', 'pesquisa'].includes(e.estado)) {
        erro(onde, `prazo FATAL vence em ${p.fim} (${p.restam} dias uteis) e a entrega nem saiu de ${e.estado}`);
      }
    } else if (!p && ['minuta', 'revisao'].includes(e.estado) && m.tipo === 'contencioso') {
      aviso(onde, 'sem prazo declarado — se ha intimacao nos autos, rode: attorneyfw prazo set');
    }

    if (e.estado === 'entregue' && !String(e.fm.entregue_em || '').trim()) {
      erro(onde, `${m.voc.fechada} sem entregue_em — registre a data`);
    }

    if (!['backlog', 'pesquisa'].includes(e.estado) && e.topicos.length === 0) {
      erro(onde, `sem contrato de ${m.voc.topico} — rode: attorneyfw topico add ${e.numero}`);
    }

    // ---- topico a topico
    e.topicos.forEach((t, i) => {
      const tag = `${onde} ${m.voc.topico} ${t.id || i + 1}`;
      const emBranco = OBRIGATORIOS.filter((campo) => !t[campo] || String(t[campo]).trim() === ''
        || (Array.isArray(t[campo]) && t[campo].length === 0));
      if (emBranco.length && ['backlog', 'pesquisa'].includes(e.estado)) {
        // em pesquisa o contrato ainda esta sendo levantado, de proposito
        aviso(tag, `contrato em branco (${emBranco.join(', ')}) — preencha antes de mover para minuta`);
      } else {
        for (const campo of emBranco) {
          erro(tag, campo === 'risco'
            ? `sem "risco" — ${m.voc.topico} sem contra-argumento previsto e ${m.voc.topico} que a parte contraria responde primeiro`
            : `sem "${campo}" — ${m.voc.topico} sem ${campo} e paragrafo, nao argumento`);
        }
      }
      if (String(t.risco || '').trim() && !String(t.resposta || '').trim() && !['backlog', 'pesquisa'].includes(e.estado)) {
        erro(tag, 'risco declarado e sem "resposta" — apontar o proprio ponto fraco sem responder a ele e escrever a peca da outra parte');
      }

      // documento citado tem de existir no canon: peca que menciona prova que
      // nao esta nos autos e o erro que a contraparte usa para desqualificar
      // o resto do argumento.
      for (const d of lista(t.documentos)) {
        if (!nomes.has(d.toLowerCase())) {
          erro(tag, `documento "${d}" nao existe no canon — rode: attorneyfw canon new documento "${d}"`);
        }
      }
      for (const parte of lista(t.partes)) {
        if (!nomes.has(parte.toLowerCase())) {
          aviso(tag, `parte "${parte}" nao esta no canon — rode: attorneyfw canon new parte "${parte}"`);
        }
      }

      const idsPend = new Set(pend.map((x) => x.id));
      for (const x of lista(t[m.voc.pendencias])) {
        if (!idsPend.has(x)) erro(tag, `${m.voc.pendencia} "${x}" nao existe na ${m.voc.artefato}`);
        levantadas.add(x);
      }
      const lastro = lista(t[m.voc.lastro]);
      for (const x of lista(t[m.voc.paga])) {
        if (!idsPend.has(x)) { erro(tag, `${m.voc.pendencia} "${x}" nao existe na ${m.voc.artefato}`); continue; }
        levantadas.add(x);
        if (lastro.length) pagas.add(x);
        else pagasSemLastro.add(x);
      }
      if (m.tipo === 'contencioso') {
        const idsPed = new Set(peds.map((x) => x.id));
        for (const x of lista(t.pedidos)) {
          if (!idsPed.has(x)) erro(tag, `pedido "${x}" nao existe na tese`);
          else pedidosSustentados.add(x);
        }
      }
    });

    if (['revisao', 'entregue'].includes(e.estado) && e.palavras < 150) {
      erro(onde, `so ${e.palavras} palavras de texto — entrega em ${e.estado} sem redacao`);
    }
  }

  // ---- o mecanismo de Chekhov do direito
  // Enquanto a materia esta em curso e aviso; quando tudo saiu do escritorio,
  // e erro: nao ha mais peca em que pagar o que ficou em aberto.
  const fechada = es.length > 0 && es.every((x) => ['entregue', 'abandonado'].includes(x.estado));
  const cobrar = fechada ? erro : aviso;
  for (const x of pend) {
    if (!levantadas.has(x.id)) {
      cobrar(`docs/${m.voc.dirArtefato}`, `${m.voc.pendencia} ${x.id} ("${x.texto}") nao aparece em nenhum ${m.voc.topico}`);
    } else if (pagasSemLastro.has(x.id) && !pagas.has(x.id)) {
      erro(`docs/${m.voc.dirArtefato}`, `${m.voc.pendencia} ${x.id} declarado ${m.voc.paga} sem ${m.voc.lastro} — afirmar sem lastro e o que a outra parte impugna`);
    } else if (!pagas.has(x.id)) {
      cobrar(`docs/${m.voc.dirArtefato}`, `${m.voc.pendencia} ${x.id} levantado e nunca ${m.voc.paga} — declare "${m.voc.paga}: [${x.id}]" com ${m.voc.lastro} no ${m.voc.topico} que o sustenta`);
    }
  }
  for (const x of peds) {
    if (!pedidosSustentados.has(x.id)) {
      cobrar('docs/tese', `pedido ${x.id} ("${x.texto}") nao e sustentado por nenhum topico — pedido sem causa de pedir e inepcia`);
    }
  }

  // ---- canon
  const idsDoc = new Map();
  for (const d of cn.documentos) {
    if (!String(d.id || '').trim()) { aviso(`docs/canon/documentos/${d.arquivo}`, 'sem id — o contrato de topico cita documento por id (D1, D2)'); continue; }
    if (idsDoc.has(d.id)) erro(`docs/canon/documentos/${d.arquivo}`, `id ${d.id} duplicado com ${idsDoc.get(d.id)}`);
    else idsDoc.set(d.id, d.arquivo);
  }
  if (!cn.partes.length && ESTADOS_ATIVOS.some((s) => es.some((e) => e.estado === s && s !== 'backlog'))) {
    aviso('docs/canon/partes', 'canon de partes vazio — nome grafado de dois jeitos entre pecas e o erro mais barato de evitar');
  }

  // ---- sigilo
  if (String(m.cfg.sigilo || '').toLowerCase() === 'true') {
    aviso('materia.yaml', 'materia em segredo de justica — confira antes de gerar saida ou compartilhar contexto');
  }

  // ---- parte referenciada na carteira
  // Aqui reprovar e o comportamento certo, ao contrario da regra de dado
  // pessoal: nao ha caso legitimo em que o mesmo documento tenha duas
  // qualificacoes. Se a carteira estiver errada, corrige-se a carteira — num
  // lugar so, e todas as materias acompanham.
  for (const p of cn.partes) {
    if (!p.refSlug) continue;
    if (!p.ref) {
      erro(`docs/canon/partes/${p.arquivo}`, `ref "${p.refSlug}" nao existe em partes/ na raiz da carteira`);
      continue;
    }
    const local = valor(p.fm.nome);
    if (local && local !== p.ref.nome) {
      erro(`docs/canon/partes/${p.arquivo}`,
        `nome diverge da carteira — aqui "${local}", em partes/${p.refSlug}.md "${p.ref.nome}"`);
    }
    const docLocal = valor(p.fm.documento);
    if (docLocal && soDigitos(docLocal) !== soDigitos(p.ref.documento)) {
      erro(`docs/canon/partes/${p.arquivo}`,
        `documento diverge da carteira — aqui "${docLocal}", em partes/${p.refSlug}.md "${p.ref.documento}"`);
    }
  }

  // ---- formulas de peca
  // A condicao e permanente e a informacao nao muda entre uma peca e a
  // seguinte, entao o lugar dela e aqui: o gate roda por materia, e nao por
  // entrega. O `build` avisa so na primeira peca costurada — repetir a cada
  // build ensinava a pular a linha amarela, e a proxima sumia junto.
  if (formulas(raiz).semente && es.some((x) => ESTADOS_ATIVOS.includes(x.estado))) {
    // O `onde` do aviso e relativo a materia, e o arquivo esta na raiz da
    // carteira: dizer "acme/formulas.yaml" mandaria o usuario ao caminho errado.
    aviso('..', 'formulas.yaml na raiz ainda e a semente — o enderecamento que sai nao e o do escritorio');
  }

  // ---- o titulo promete o que a peca nao pede
  // Numa anulatoria fiscal do corpus, o titulo anuncia "c/c pedido de tutela
  // provisoria de urgencia", o art. 300 aparece na qualificacao — e o pedido de
  // tutela nao e formulado. E a remissao vazia que o gate ja persegue no corpo,
  // agora no lugar mais visivel da peca.
  //
  // Aviso, e nao violacao: ha caso legitimo em que o cumulo se resolve num
  // topico e nao ganha alinea propria. Mas a divergencia nao pode ficar
  // invisivel, que era o estado ate aqui.
  for (const e of es) {
    if (e.estado === 'abandonado' || e.estado === 'backlog') continue;
    const promessa = cumuloDoTitulo(valor(e.fm.titulo));
    if (!promessa.length) continue;
    const sustentados = new Set(e.topicos.flatMap((t) => lista(t.pedidos)));
    const textoDosPedidos = semAcentoGate([
      ...peds.filter((x) => sustentados.has(x.id)).map((x) => x.texto),
      ...e.topicos.map((t) => valor(t.sustenta)),
    ].join(' '));
    const faltando = promessa.filter((w) => !textoDosPedidos.includes(w));
    if (faltando.length === promessa.length) {
      aviso(rel(m.dir, e.caminho),
        `o titulo promete "${promessa.join(' ')}" e o pedido nao menciona — a peca anuncia e nao cumpre`);
    }
  }

  // ---- prioridade de tramitacao contra a idade da ficha
  // Num alvara do corpus, o cabecalho anuncia "autores com 64 anos" e cita o
  // Estatuto do Idoso; entre os cinco requerentes, o mais velho tem 69 e tres
  // passam de 60. O numero escolhido nao e o do mais velho nem o do limite
  // legal.
  //
  // Sem `nascimento:` na ficha, nada disto roda — e nao ha aviso de campo
  // faltando: campo que a materia nao precisa nao vira cobranca.
  {
    const idades = cn.partes
      .map((p) => ({ nome: p.nome, idade: idadeEm(p.nascimento, ctx.hoje) }))
      .filter((x) => x.idade !== null);
    if (idades.length) {
      const maisVelho = idades.reduce((a, b) => (b.idade > a.idade ? b : a));
      const menor = idades.find((x) => x.idade < 18);
      const merece = maisVelho.idade >= 60 || Boolean(menor);

      for (const e of es) {
        if (e.estado === 'abandonado' || e.estado === 'backlog') continue;
        const corpo = semAcentoGate(`${valor(e.fm.titulo)} ${e.corpo}`);
        const pede = /prioridade|preferencia na tramit/.test(corpo);

        if (merece && !pede) {
          const razao = menor ? `${menor.nome} tem ${menor.idade} anos` : `${maisVelho.nome} tem ${maisVelho.idade} anos`;
          aviso(rel(m.dir, e.caminho),
            `${razao} e a peca nao pede prioridade de tramitacao — se ha razao para nao pedir, ela e sua`);
        }
        if (pede) {
          for (const mm of e.corpo.matchAll(/\b(\d{2,3})\s*anos\b/g)) {
            const dito = Number(mm[1]);
            if (idades.some((x) => x.idade === dito)) continue;
            aviso(rel(m.dir, e.caminho),
              `a peca fala em ${dito} anos e nenhuma parte da ficha tem essa idade — a mais velha tem ${maisVelho.idade}`);
            break;
          }
        }
      }
    }
  }

  // ---- rotulo da parte, dentro da peca
  // Metade das pecas do corpus alterna "Requerente" e "Autor" para a mesma
  // pessoa, e ninguem percebe lendo: quem le sabe de quem se fala e completa
  // sozinho. Aviso, e nunca violacao — ha caso legitimo, como peca que trata de
  // dois processos com polos diferentes.
  for (const e of es) {
    const mix = rotulosMisturados(e.corpo);
    if (!mix) continue;
    aviso(rel(m.dir, e.caminho),
      `usa os dois pares de rotulo para a parte — Requerente/Requerida ${mix.requerente}x e Autor/Re ${mix.autor}x`);
  }

  // ---- transcricao com lastro
  // Numero errado DENTRO das aspas e a pior posicao possivel para um erro de
  // digitacao: a peca sustenta que a outra parte errou, e a resposta e que a
  // transcricao e que esta errada. Por isso a transcricao declara a origem.
  {
    const idsDoc = new Set(cn.documentos.map((d) => String(d.id)).filter(Boolean));
    for (const e of es) {
      const onde = rel(m.dir, e.caminho);
      for (const t of e.corpo.matchAll(/^```transcricao[ 	]*([A-Za-z0-9-]*)[ 	]*$/gm)) {
        if (!t[1]) {
          erro(onde, 'transcricao sem documento declarado — use ```transcricao <id> para o gate poder conferir os numeros');
        } else if (!idsDoc.has(t[1])) {
          erro(onde, `transcricao aponta o documento "${t[1]}", que nao esta no canon`);
        }
      }
    }
  }

  // ---- dado pessoal na saida
  // Aviso, e nunca violacao: peca de verdade TEM de conter o CPF da parte, e o
  // CPF que qualifica o autor no processo dele nao e vazamento. Reprovar por
  // isso transformaria a regra em ruido no primeiro dia, e regra ignorada nao
  // protege ninguem. O que o gate faz e lembrar antes de o arquivo circular.
  {
    const dirSaida = join(m.dir, 'saida');
    if (existsSync(dirSaida)) {
      const temMapa = existsSync(join(m.dir, ARQUIVO_MAPA));
      for (const arq of readdirSync(dirSaida).filter((f) => f.endsWith('.md') && !f.endsWith('-anonimizado.md'))) {
        const achados = achar(readFileSync(join(dirSaida, arq), 'utf8'))
          .filter((x) => x.confianca === 'alta');
        if (!achados.length) continue;
        const tipos = [...new Set(achados.map((x) => x.tipo))].join(', ');
        aviso(`saida/${arq}`, temMapa
          ? `${achados.length} dado(s) com formato reconhecivel (${tipos}) — confira o mapa antes de o arquivo circular`
          : `${achados.length} dado(s) com formato reconhecivel (${tipos}) e a materia nao tem mapa de anonimizacao`);
      }
    }
  }

  // ---- desfecho
  // Aviso, e nao violacao: nem todo desfecho chega em noventa dias, e reprovar
  // o gate por causa de um processo que so demora transformaria a regra em
  // ruido. Mas materia inteira entregue e sem resultado e experiencia que a
  // carteira perdeu — e era esse o problema que o registro veio resolver.
  if (!m.resultado) {
    const ativas = es.filter((e) => ESTADOS_ATIVOS.includes(e.estado));
    const todasEntregues = ativas.length > 0 && ativas.every((e) => e.estado === 'entregue');
    if (todasEntregues) {
      const datas = ativas.map((e) => valor(e.fm.entregue_em)).filter(dataValida).sort();
      const ultima = datas[datas.length - 1];
      if (ultima && diasCorridosAte(ultima, ctx.hoje) > 90) {
        aviso('materia.yaml', `tudo entregue desde ${ultima} e sem resultado — attorneyfw materia fechar <resultado>`);
      }
    }
  } else if (!RESULTADOS.includes(m.resultado)) {
    erro('materia.yaml', `resultado "${m.resultado}" fora do vocabulario (${RESULTADOS.join(', ')})`);
  }

  return { erros, avisos, entregas: es.length, topicos: es.reduce((a, x) => a + x.topicos.length, 0) };
}
