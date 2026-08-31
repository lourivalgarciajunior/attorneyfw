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

## Proximos passos plausiveis

- **Plugin `attorneyfw` em `plugin-skill/plugins/`** — skills e agents, como o
  bookfw tem. Nao existe ainda. Skill so muda la, nunca em `~/.claude/skills/`.
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
