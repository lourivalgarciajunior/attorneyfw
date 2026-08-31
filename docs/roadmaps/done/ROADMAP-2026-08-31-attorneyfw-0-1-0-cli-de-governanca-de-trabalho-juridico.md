---
status: Done
date: 2026-08-31
req: "REQ-2026-08-31-attorneyfw-0-1-0-cli-de-governanca-de-trabalho-juridico"
adr: "ADR-2026-08-31-carteira-de-materias-com-dois-tipos-sob-a-mesma-cadeia-e-um-so-nucleo"
---

# ROADMAP: attorneyfw 0.1.0 — CLI de governanca de trabalho juridico

> Date: 2026-08-31 | Status: Done
> REQ: `docs/req/REQ-2026-08-31-attorneyfw-0-1-0-cli-de-governanca-de-trabalho-juridico.md`
> ADR: `docs/adr/ADR-2026-08-31-carteira-de-materias-com-dois-tipos-sob-a-mesma-cadeia-e-um-so-nucleo.md`

Onda unica: o repositorio nasce inteiro. Os microlotes sao sequenciais porque
todos tocam `src/core.mjs` ou o mesmo `bin/attorneyfw.mjs`, e a razao esta
declarada em cada um.

## ML-1 — Nucleo

**Status:** ✅ Concluido

**Arquivos:** `package.json`, `.gitignore`, `src/core.mjs`

Descoberta de escritorio e materia, YAML raso, frontmatter, tabela
`VOCABULARIO`, kanban de entregas, contrato de topico, canon, leitura de plano
por nome de coluna, pendencias e pedidos numerados.

**Aceite:** `node -e "import('./src/core.mjs')"` sem erro; `VOCABULARIO` com as
mesmas chaves nos dois tipos.

## ML-2 — Contagem de prazo

**Status:** ✅ Concluido

**Arquivos:** `src/core.mjs` (sequencial com ML-1: mesmo arquivo)

Pascoa por Meeus/Butcher, feriados nacionais fixos e moveis, recesso do art.
220, `contarPrazo` pelos arts. 219 e 224, `diasUteisAte`, `prazoDe`,
`contextoPrazo`.

**Aceite:** intimacao em 2026-09-01 com 15 dias uteis vence em 2026-09-23,
pulando o feriado de 7 de setembro; prazo de dezembro atravessa o recesso.

## ML-3 — Comandos de criacao

**Status:** ✅ Concluido

**Arquivos:** `src/init.mjs`, `src/novo.mjs`, `src/canon.mjs`, `src/topico.mjs`, `templates/*`

`init`, `materia new|list`, `dec`, `tese`, `mapa`, `plano`,
`plano --materializar`, `entrega new`, `topico add`, `canon new`.

**Aceite:** `tese` recusa materia consultiva e `mapa` recusa contenciosa;
materializar duas vezes nao duplica; linha de vao e dita, nao engolida.

## ML-4 — Kanban e prazo

**Status:** ✅ Concluido

**Arquivos:** `src/entrega.mjs`, `src/prazo.mjs` (sequencial com ML-3: `alvosDe` e usado pelos dois)

`entrega move|renumber|retitle` com lista e faixa, guarda do estado `entregue`,
carimbo de `entregue_em`, `prazo set` e a agenda.

**Aceite:** reabrir entrega em `entregue` sem `--forcar` e recusado; a agenda na
raiz ordena a carteira inteira por vencimento e sai com codigo 1 se ha vencido.

## ML-5 — Gate

**Status:** ✅ Concluido

**Arquivos:** `src/validate.mjs`

Cadeia, plano contra kanban, WIP, numeracao, prazo, contrato de topico, canon,
Chekhov de fatos e riscos, pedidos sem topico, sigilo.

**Aceite:** `attorneyfw validate` sai com 1 em prazo vencido, fato provado sem
documento, risco sem resposta, documento fora do canon e entrega intempestiva.

## ML-6 — Leitura e saida

**Status:** ✅ Concluido

**Arquivos:** `src/brief.mjs`, `src/status.mjs`, `src/build.mjs`, `src/docx.mjs`, `bin/attorneyfw.mjs`

Briefing de topico, status de materia e de carteira, dump de contexto,
costura da entrega com enderecamento vindo do `materia.yaml`, e DOCX lendo o
markdown que o `build` gerou em vez de reconstruir a selecao.

**Aceite:** o markdown de saida traz o numero do processo do `materia.yaml`;
topico sem redacao sai carimbado `[SEM REDACAO — NAO PROTOCOLAR]`.

## ML-7 — Gates do proprio CLI

**Status:** ✅ Concluido

**Arquivos:** `tools/lint.mjs`, `test/smoke.mjs`, `.github/workflows/ci.yml`, `README.md`, `CHANGELOG.md`

Nove regras de lint — as sete do bookfw mais a ressalva de prazo e a paridade
de vocabulario — e um smoke que percorre os dois tipos de materia.

**Aceite:** `npm run check` verde; CI em Linux e Windows.

## Validacao final

```
$ npm run check
attorneyfw 0.1.0 | 12 modulos | 12 templates | vocabulario 12 chaves
OK.
...
OK.        (69 asserts do smoke, zero falhas)
```

Passeio manual de ponta a ponta gravado em 2026-08-31: escritorio, materia
contenciosa, tese, plano, entrega, topico, prazo (`vence 2026-09-23`), canon,
gate reprovando o topico incompleto, `build` com enderecamento e `docx` de 13
paragrafos.

## Defeitos encontrados e corrigidos durante a execucao

1. **Chave YAML vazia virava `[]`, que e truthy.** `prazo_intimacao:` em branco
   passava por prazo declarado e o gate reclamava de "prazo mal declarado" em
   toda entrega recem-criada; `entregue_em` nunca recebia carimbo; a peca saia
   com `Processo n. ` em branco. Corrigido na raiz, no `yamlRaso`: lista que
   ficou vazia vira `''`.
2. **`\s*` nas regexes de frontmatter engolia a quebra de linha.**
   `/^(prazo_intimacao:\s*).*$/m` casava ate o campo seguinte e o apagava ao
   substituir. Trocado por `[ \t]*` em `prazo.mjs`, `entrega.mjs` e `core.mjs`.
3. **Regra de lint da ressalva de prazo era sensivel a acento** e reprovava o
   README, que escreve "conferência". Normaliza diacriticos antes de comparar.
