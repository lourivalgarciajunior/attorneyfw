#!/usr/bin/env node
/**
 * attorneyfw — governanca de trabalho juridico.
 * DEC -> tese/mapa de risco -> plano de entregas -> kanban -> protocolo.
 */
import { readFileSync } from 'node:fs';
import { Erro, c } from '../src/core.mjs';
import { init, materiaNew, materiaList, materiaFechar } from '../src/init.mjs';
import { dec, estrategiaNew, plano, entregaNew } from '../src/novo.mjs';
import { entregaMove, entregaRenumber, entregaRetitle } from '../src/entrega.mjs';
import { topicoAdd } from '../src/topico.mjs';
import { canonNew } from '../src/canon.mjs';
import { prazoSet, prazoLista } from '../src/prazo.mjs';
import { brief } from '../src/brief.mjs';
import { status, context } from '../src/status.mjs';
import { validate } from '../src/validate.mjs';
import { build } from '../src/build.mjs';
import { docx } from '../src/docx.mjs';
import { atualizar, indiceLista } from '../src/atualizar.mjs';
import { buscar } from '../src/buscar.mjs';
import { diagrama } from '../src/diagrama.mjs';
import { custas } from '../src/custas.mjs';
import { relatorio } from '../src/relatorio.mjs';
import { jurisprudenciaAdd, jurisprudenciaLista } from '../src/jurisprudencia.mjs';
import { prognostico } from '../src/prognostico.mjs';
import { anonimizar } from '../src/anonimizar.mjs';
import { dados } from '../src/dados.mjs';
import { conferir } from '../src/conferir.mjs';
import { parteNew, parteList } from '../src/parte.mjs';
import { importar } from '../src/importar.mjs';
import { estilo } from '../src/estilo.mjs';
import { modeloDestilar, modeloAplicar, modeloLista } from '../src/modelo.mjs';
import { indiceAtualizar } from '../src/indice.mjs';

// fonte unica: duplicar a versao aqui deixaria o CLI dizendo uma e o pacote outra
const VERSAO = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
).version;

const AJUDA = `attorneyfw ${VERSAO} — governanca de trabalho juridico

  attorneyfw init "Escritorio"          cria a carteira
  attorneyfw materia new "Cliente — X"  nova materia (--tipo contencioso|consultivo,
                            --foro civel|fazenda|familia|juizado|trabalho)
  attorneyfw estilo [--de a.docx,b.docx] style card do escritorio, com o n a vista
  attorneyfw importar <arquivo>         le peca arquivada e produz relatorio de
                            PENDENCIAS (.docx/.txt/.md) [--criar-materia "T"]
  attorneyfw materia list               as materias da carteira, com o desfecho
  attorneyfw materia fechar <resultado> ganho|ganho_parcial|perda|acordo|extinto
                            [--valor V] [--nota "..."] [--em AAAA-MM-DD]
  attorneyfw dec "Decisao"              decisao de estrategia da materia
  attorneyfw tese ["Titulo"]            contencioso: fatos F1..Fn e pedidos P1..Pn
  attorneyfw mapa ["Titulo"]            consultivo: riscos R1..Rn
  attorneyfw plano ["Titulo"]           plano de entregas
  attorneyfw plano --materializar       a tabela do plano vira kanban
  attorneyfw entrega new "Titulo"       nova entrega em backlog/
  attorneyfw entrega move <e|3..7> <es> move no kanban, uma ou varias (--forcar)
  attorneyfw entrega renumber <e> <n>   troca o numero, arquivo e frontmatter juntos
  attorneyfw entrega retitle <e> "T"    troca o titulo, arquivo e frontmatter juntos
  attorneyfw topico add <entrega>       novo contrato de topico ou clausula
  attorneyfw parte new "Nome" --documento <CPF|CNPJ> [--matriz <slug>]
                            ficha de parte da CARTEIRA — uma qualificacao so
  attorneyfw parte list                 as partes da carteira
  attorneyfw canon new <tipo> "Nome"    ficha de parte ou documento da materia
                            (parte aceita --ref <slug> da carteira)
  attorneyfw prazo set <e> --intimacao AAAA-MM-DD --dias N [--corridos]
                            [--material] [--fatal]
  attorneyfw prazo [--dias N] [--json] agenda; na raiz, a carteira inteira.
                            --json publica o contrato tipado, com a ressalva
                            dentro do payload e a linha ja sem cor
  attorneyfw brief <entrega> [--topico N]  o pacote de quem redige — leva a voz
                            do escritorio e o que falta do checklist do tipo de acao,
                            as duas como observacao, e nenhuma como instrucao
  attorneyfw buscar <termo>             a memoria da carteira — que materias ja
                            enfrentaram isto, e como terminaram [--tipo] [--resultado]
  attorneyfw status                     kanban da materia, ou a carteira na raiz
  attorneyfw context                    dump da governanca para LLM
  attorneyfw validate [--json]          gate — zero violacoes antes de protocolar
  attorneyfw modelo destilar <tipo> --de <slug,slug>
                            destila o checklist do arquivo do escritorio
  attorneyfw modelo aplicar <tipo>      cria o checklist PENDENTE na materia
  attorneyfw modelo                     os modelos da carteira
  attorneyfw conferir <entrega>         extenso x algarismo, soma x total, item x pedido,
                            transcricao x ficha, texto x contrato do topico e
                            continuidade de fato contra a cronologia e o canon.
                            Nao confere se o dispositivo existe, se esta em vigor,
                            se foi superado nem se sustenta o que o topico afirma,
                            e nao infere que dois fatos sao o mesmo fato
  attorneyfw dados <entrega>            o que tem formato de dado pessoal (so acusa)
  attorneyfw anonimizar --init          cria o mapa real -> ficticio da materia
  attorneyfw anonimizar <entrega>       aplica o mapa inteiro numa passada [--reverter]
  attorneyfw diagrama <tipo> [--salvar] linha-do-tempo | partes | fato-prova
                            projecao do canon; na peca, <!-- diagrama: tipo -->
  attorneyfw build <entrega>            costura a entrega em markdown
  attorneyfw docx <entrega>             a versao de protocolo (pede o pacote docx)
  attorneyfw indice [atualizar [serie]] series de indice da carteira
  attorneyfw jurisprudencia [add "<id>"] amostra conferida — com o n a vista
                            [--tribunal T] [--data D] [--resultado R] [--lido]
  attorneyfw prognostico [--json]       semaforo com as razoes a vista
  attorneyfw relatorio [--docx]          o resultado explicado ao cliente
  attorneyfw custas init --tribunal <t>  cria a tabela de custas do tribunal
  attorneyfw custas <valor> --tribunal <t> [--ano N] [--provisorio] [--json]
  attorneyfw atualizar <valor> --de AAAA-MM-DD [--ate AAAA-MM-DD]
                       [--serie inpc|ipca|ipca-e|igp-m] [--juros N] [--juros-de D]
                       [--selic] [--json]     correcao monetaria com memoria

estados: backlog pesquisa minuta revisao entregue bloqueado abandonado
--materia <slug> roda o comando numa materia sem entrar na pasta dela

regimes de prazo: processual (CPC) e material (art. 210 do CTN, --material)

A contagem de prazo e CONFERENCIA, nao a contagem oficial: feriado do foro e
suspensao de expediente entram a mao em docs/feriados.md. O prazo que vale e o
dos autos.

A correcao monetaria e as custas tambem sao CONFERENCIA, nao o calculo oficial:
o valor que vale e o da memoria homologada nos autos e o da guia do tribunal.

O prognostico e semaforo com as razoes a vista. Esta ferramenta NAO produz
porcentagem de probabilidade de exito, e nao vai produzir: nao e limitacao, e
recusa — da mesma familia de nao assinar e nao protocolar. Serie de indice mora na carteira, em
tabelas/indices/, e so o comando 'indice atualizar' toca a rede.`;

function parse(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      args[k] = v ?? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true);
    } else args._.push(a);
  }
  return args;
}

const [, , cmd, ...resto] = process.argv;
const args = parse(resto);

try {
  switch (cmd) {
    case 'init': init(args); break;
    case 'materia': {
      const sub = args._.shift();
      if (sub === 'new') materiaNew(args);
      else if (sub === 'list') materiaList(args);
      else if (sub === 'fechar') materiaFechar(args);
      else throw new Erro('Uso: attorneyfw materia new|list|fechar');
      break;
    }
    case 'dec': dec(args); break;
    case 'tese': estrategiaNew(args, 'tese'); break;
    case 'mapa': estrategiaNew(args, 'mapa'); break;
    case 'plano': plano(args); break;
    case 'entrega': {
      const sub = args._.shift();
      if (sub === 'new') entregaNew(args);
      else if (sub === 'move') entregaMove(args);
      else if (sub === 'renumber') entregaRenumber(args);
      else if (sub === 'retitle') entregaRetitle(args);
      else throw new Erro('Uso: attorneyfw entrega new|move|renumber|retitle');
      break;
    }
    case 'topico': {
      const sub = args._.shift();
      if (sub === 'add') topicoAdd(args);
      else throw new Erro('Uso: attorneyfw topico add <entrega>');
      break;
    }
    case 'parte': {
      const sub = args._.shift();
      if (sub === 'new') parteNew(args);
      else if (sub === 'list') parteList(args);
      else throw new Erro('Uso: attorneyfw parte new|list');
      break;
    }
    case 'canon': {
      const sub = args._.shift();
      if (sub === 'new') canonNew(args);
      else throw new Erro('Uso: attorneyfw canon new parte|documento "Nome"');
      break;
    }
    case 'prazo': {
      if (args._[0] === 'set') { args._.shift(); prazoSet(args); }
      else process.exitCode = prazoLista(args);
      break;
    }
    case 'brief': brief(args); break;
    case 'status': status(args); break;
    case 'context': context(args); break;
    case 'validate': process.exitCode = validate(args); break;
    case 'build': build(args); break;
    case 'indice': {
      const sub = args._.shift();
      if (sub === 'atualizar') await indiceAtualizar(args);
      else if (sub === undefined) indiceLista();
      else throw new Erro('Uso: attorneyfw indice [atualizar [serie]]');
      break;
    }
    case 'atualizar': atualizar(args); break;
    case 'buscar': buscar(args); break;
    case 'custas': custas(args); break;
    case 'relatorio': await relatorio(args); break;
    case 'jurisprudencia': {
      const sub = args._[0] === 'add' ? args._.shift() : undefined;
      if (sub === 'add') jurisprudenciaAdd(args);
      else jurisprudenciaLista(args);
      break;
    }
    case 'prognostico': process.exitCode = prognostico(args); break;
    case 'diagrama': diagrama(args); break;
    case 'anonimizar': anonimizar(args); break;
    case 'dados': dados(args); break;
    case 'importar': await importar(args); break;
    case 'estilo': estilo(args); break;
    case 'conferir': process.exitCode = conferir(args); break;
    case 'modelo': {
      const sub = args._[0] === 'destilar' || args._[0] === 'aplicar' ? args._.shift() : undefined;
      if (sub === 'destilar') modeloDestilar(args);
      else if (sub === 'aplicar') modeloAplicar(args);
      else modeloLista(args);
      break;
    }
    case 'docx': await docx(args); break;
    case 'version': case '--version': case '-v': console.log(VERSAO); break;
    case undefined: case 'help': case '--help': case '-h': console.log(AJUDA); break;
    default:
      console.error(`${c.red('comando desconhecido')} "${cmd}"\n`);
      console.log(AJUDA);
      process.exitCode = 1;
  }
} catch (e) {
  if (e instanceof Erro) {
    console.error(`${c.red('erro')} ${e.message}`);
    process.exitCode = 1;
  } else throw e;
}
