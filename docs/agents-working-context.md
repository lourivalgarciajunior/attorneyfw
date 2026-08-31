# Working context — attorneyfw

> Atualizado em 2026-08-31.

## Onde o projeto esta

Versao **0.1.0**, primeira. `npm run check` verde; CI em Linux e Windows.
`trackfw validate` sem violacao de projeto (as 12 que aparecem sao do harness
global em `~/.trackfw`, e aparecem igual no bookfw).

Cadeia do repositorio fechada: ADR aceita, REQ em Done, ROADMAP em
`docs/roadmaps/done/`.

## O que existe

12 modulos em `src/`, 12 templates, 21 comandos no bin. Carteira com dois tipos
de materia — contencioso e consultivo — sobre um nucleo so. Agenda de prazos
com contagem pelo CPC. Gate com regra de tempestividade e o mecanismo de
Chekhov adaptado (fato provado com documento, risco mitigado com fundamento).

## O que ficou de fora, de proposito

Consulta a tribunal, download de intimacao, peticionamento, controle de horas,
financeiro, CRM, terceiro tipo de materia, banco de dados. Esta no escopo
negativo da REQ — nao invente por conta.

## Ultimo trabalho fechado — 0.6.0, a quinta conferencia

O gate cobrava que o contrato de topico **existisse**; nao cobrava que o texto o
**honrasse**. `fundamento:` era uma lista branca de citacoes escrita, parseada e
nunca comparada com nada. `src/citacao.mjs` normaliza citacao a chave canonica
(`cpc#373`), e `conferirTopicos` compara texto e contrato em cinco frentes.

Quatro saem como aviso — a excecao legitima e diaria. So topico com contrato e
prosa vazia reprova, e so em `revisao` e `entregue`.

**O que continua fora, por decisao, e protegido pela regra 13 do lint:**
existencia, vigencia, superacao e pertinencia do dispositivo. Sao leitura, e
ficam com o agente de fundamento. Nao implemente "confere se o artigo existe"
achando que faltava.

## Proximos passos plausiveis

- **Continuidade entre topicos da mesma peca.** O `conferir` compara numeros;
  nao compara fatos. Data no topico 4 divergindo da do topico 9 e exatamente o
  defeito que o canon existe para evitar, e ele so age quando alguem declara.
- **O briefing nao carrega a voz nem o checklist.** O `brief` monta contrato,
  canon e cronologia, e nao le o `estilo.yaml` nem o `modelo` do tipo de acao —
  os dois existem desde a 0.4.0 e ninguem os le na hora de escrever.
- **`--json` no `attorneyfw prazo`**, para o hook do plugin parar de depender do
  texto da saida (acoplamento aceito e declarado em ADR).
- **`attorneyfw publish` no npm** — nunca foi publicado; o `package.json` ja
  esta com `files` correto e o lint cobra.
- **Feriados por tribunal** — hoje `docs/feriados.md` e um arquivo so por
  escritorio. Um escritorio que atua em duas comarcas precisa de um por foro.
- **Segundo tipo de saida no consultivo** — parecer e minuta de contrato usam o
  mesmo `build`; a formatacao de contrato (clausulas numeradas, paragrafo unico)
  ainda nao existe.

## Armadilhas ja pagas

Estao listadas em `CLAUDE.md`, secao "Regras do dominio que ja custaram
correcao", e no roadmap em `done/`, secao "Defeitos encontrados e corrigidos".
Leia as duas antes de mexer em `core.mjs`.
