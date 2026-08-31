---
status: wip
date: 2026-08-31
req: docs/req/REQ-2026-08-31-o-briefing-passa-a-carregar-o-style-card-e-o-checklist-do-tipo-de-acao.md
adr: docs/adr/ADR-2026-08-31-o-briefing-carrega-a-voz-e-a-lista-do-tipo-de-acao-como-observacao-nunca-como-instrucao.md
---

# Roadmap: A voz e a lista no briefing, em tres ondas

> Created: 2026-08-31 | Status: wip

## Context

`estilo.yaml` e `docs/checklist-<tipo>.md` foram construidos, testados e
documentados — e nao sao lidos no unico momento em que serviriam, que e o
briefing de quem redige.

REQ: `docs/req/REQ-2026-08-31-o-briefing-passa-a-carregar-o-style-card-e-o-checklist-do-tipo-de-acao.md`

ADR: `docs/adr/ADR-2026-08-31-o-briefing-carrega-a-voz-e-a-lista-do-tipo-de-acao-como-observacao-nunca-como-instrucao.md`

## Por que as ondas sao sequenciais

A **onda 1** entrega os dois leitores, e e insumo puro da onda 2 — sem eles o
briefing nao tem o que costurar. A **onda 2** toca `src/brief.mjs` e
`test/smoke.mjs`, e a onda 1 tambem toca o segundo arquivo. A **onda 3** toca
`bin`, `README`, `CHANGELOG`, `tools/lint.mjs` e o plugin, e so faz sentido
depois de o comportamento existir.

Os dois leitores da onda 1 vao para modulos ja alcancados pelo bin
(`src/estilo.mjs` e `src/modelo.mjs`), entao nao ha risco de `modulo-orfao` —
a armadilha que reorganizou o roadmap anterior no meio da execucao.

## Acceptance Criteria

- [ ] As tres ondas concluidas, cada uma com `npm run check` verde
- [ ] Nenhuma linha da secao de voz dentro de `## Instrucoes`
- [ ] Nenhuma regra de gate nova, e nenhuma cobranca de aderencia a voz
- [ ] Traco abaixo do piso nao aparece; card fino diz por que calou
- [ ] `trechos_em_caixa_alta` nao chega ao briefing
- [ ] Checklist entra como diferenca, e nao repetido inteiro
- [ ] O briefing e leitura: `docs/checklist-<tipo>.md` nao e alterado
- [ ] Zero dependencia de runtime nova
- [ ] CI verde em Linux e Windows ao fim de cada onda
- [ ] Plugin `attorneyfw` atualizado, com a versao alinhada ao CLI

---

## Wave 1 — Os dois leitores

> Primeira porque e insumo puro da onda 2. Os dois modulos ja sao alcancados
> pelo bin, entao nenhum nasce orfao.

### ML-1A — `vozDoEscritorio` em `src/estilo.mjs`

**Status:** ✅ Concluído
**Files affected:** `src/estilo.mjs`
**Acoes:**
1. Ler `estilo.yaml` da raiz da carteira. Sem arquivo, devolver `null` — o
   briefing simplesmente nao ganha a secao.
2. Devolver `{ n, derivadoEm, tracos, ritmo, parDominante, amostraFina }`.
3. **Piso**: traco so entra com `n >= 3` **e** presenca em mais da metade das
   pecas. Abaixo disso, `tracos: []` e `amostraFina: true`.
4. `ritmo` = mediana de palavras por paragrafo. **`trechos_em_caixa_alta` nao e
   devolvido** — decisao do ADR, e nao esquecimento.
5. `parDominante` = o par de rotulos com mais pecas, com o `em`; empate devolve
   `null`.

**Aceite:** card com traco em 2/8 nao o devolve; em 6/8 devolve com `6/8`; card
com `n: 2` devolve `tracos: []` e `amostraFina: true`.
**Validacao:** `npm run check`

### ML-1B — `checklistAberto` em `src/modelo.mjs`

**Status:** ✅ Concluído
**Files affected:** `src/modelo.mjs`
**Acoes:**
1. Localizar `docs/checklist-*.md` na materia; sem arquivo, devolver `null`.
2. Ler so os itens em `- [ ]`, ignorando `- [x]`, separados por bloco
   (`documentos`, `fundamentos`, `objecoes`), com o texto e a procedencia.
3. **Nao escrever nada**: o briefing e leitura.

**Aceite:** item marcado `- [x]` nao volta; a procedencia `_(3/5 — a, b)_` volta
junto do texto.
**Validacao:** `npm run check`

### ML-1C — Testes dos dois leitores

**Status:** ✅ Concluído
**Files affected:** `test/smoke.mjs`
**Acoes:**
1. Piso do traco: 2/8 fora, 6/8 dentro, `n: 2` cala.
2. Caixa alta **nao** e devolvida — teste negativo, ancorado a chave.
3. Par dominante, e empate devolvendo `null`.
4. `- [x]` ignorado, e checklist ausente devolvendo `null`.

**Validacao:** `npm run check`

---

## Wave 2 — O briefing costura

> Depende da onda 1. Toca `src/brief.mjs` e `test/smoke.mjs`.

### ML-2A — As duas secoes, fora das instrucoes

**Status:** ✅ Concluído
**Files affected:** `src/brief.mjs`
**Acoes:**
1. `## Voz do escritorio (observacao, nao instrucao)` — tracos com o `em N/M`,
   ritmo, e a linha do card fino quando for o caso. Antes de `## Instrucoes`.
2. `## O que este tipo de acao costuma ter, e este topico ainda nao tem` — a
   **diferenca**: fundamento aberto que o topico nao declara, objecao que o
   `risco` nao previu, documento que o canon nao tem.
3. **Rotulo das partes**: dos topicos ja escritos desta entrega quando ha texto
   anterior; do card quando nao ha. O gate cobra consistencia dentro da peca, e
   nao a escolha do par — entao o que a peca ja fez pesa mais.
4. Sem card e sem checklist, as secoes nao aparecem; uma linha diz que a voz nao
   foi derivada, e a peca sai com a voz do modelo.
5. Tres instrucoes negativas em `## Instrucoes`: nao force traco, nao afirme item
   da lista, escreva a pendencia quando o item importar e nao estiver provado.

**Aceite:** nenhuma linha de traco dentro de `## Instrucoes`; fundamento ja
declarado no contrato nao aparece na lista; documento ja no canon nao aparece.
**Validacao:** `npm run check`

### ML-2B — Testes do briefing

**Status:** ✅ Concluído
**Files affected:** `test/smoke.mjs`
**Acoes:**
1. Materia propria, criada no proprio teste.
2. Card presente: traco aparece com o `em`, e **acima** de `## Instrucoes`.
3. Sem card: a secao some e a linha da voz nao derivada aparece.
4. Diferenca: fundamento declarado no contrato **nao** repete; o nao declarado
   aparece.
5. O briefing nao altera `docs/checklist-<tipo>.md` — comparar o arquivo antes e
   depois.

**Validacao:** `npm run check`

---

## Wave 3 — Doutrina e publicacao

> Por ultimo: documenta comportamento que ja existe.

### ML-3A — README, AJUDA e a regra de lint

**Status:** ✅ Concluído
**Files affected:** `README.md`, `bin/attorneyfw.mjs`, `tools/lint.mjs`
**Acoes:**
1. README: o que o briefing passou a carregar, o piso, a caixa alta que ficou de
   fora, e a diferenca em vez da lista inteira.
2. `AJUDA`: uma linha no verbete do `brief`.
3. Lint **regra 14**: reprovar o build se a recusa — o card descreve e nao
   prescreve, e nenhum gate cobra aderencia a voz — sumir de `README.md`,
   `src/brief.mjs` ou `src/estilo.mjs`.

**Aceite:** apagar a frase em qualquer um dos tres reprova `npm run lint`,
provado um de cada vez com copia de backup **fora do git**.
**Validacao:** `npm run check`

### ML-3B — CHANGELOG, versao e plugin

**Status:** ⬜ Pendente
**Files affected:** `CHANGELOG.md`, `package.json`, `plugin-skill/plugins/attorneyfw/**`
**Acoes:**
1. CHANGELOG 0.7.0.
2. `package.json` para `0.7.0`.
3. Skill, `adv-gaio` e comando `redigir` do plugin: o briefing traz a voz e a
   lista, e nenhuma das duas e ordem.
4. `plugin.json` para `0.7.0` — versao nova, nunca reutilizada (ver
   `CONTRIBUTING.md` do `plugin-skill`).
5. Publicar e conferir o cache com `diff -r`.

**Aceite:** `claude plugin validate .` passa; `diff -r` do cache sai limpo.
**Validacao:** `npm run check` · `trackfw validate` · `claude plugin validate .`
