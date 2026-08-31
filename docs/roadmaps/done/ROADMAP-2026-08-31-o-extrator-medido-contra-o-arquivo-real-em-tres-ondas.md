---
status: done
date: 2026-08-31
req: docs/req/REQ-2026-08-31-tres-defeitos-do-extrator-de-citacao-e-a-guarda-fora-de-ordem-no-comparador-de-itens.md
adr: docs/adr/ADR-2026-08-31-entre-calar-e-inventar-o-comparador-cala-e-o-extrator-de-citacao-se-mede-contra-as-formas-reais-do-arquivo.md
---

# Roadmap: O extrator medido contra o arquivo real, em tres ondas

> Created: 2026-08-31 | Status: done

## Context

Varredura sobre as nove pecas reais do escritorio achou tres defeitos no extrator
de citacao — dois deles **inventando** citacao, contra a regra que o proprio
modulo declara desde a 0.6.0 — e uma guarda fora de ordem no comparador de itens,
que leu a ementa de um acordao como lista de inventario.

REQ: `docs/req/REQ-2026-08-31-tres-defeitos-do-extrator-de-citacao-e-a-guarda-fora-de-ordem-no-comparador-de-itens.md`

ADR: `docs/adr/ADR-2026-08-31-entre-calar-e-inventar-o-comparador-cala-e-o-extrator-de-citacao-se-mede-contra-as-formas-reais-do-arquivo.md`

## Por que as ondas sao sequenciais

A **onda 1** corrige o extrator e a **onda 2** o comparador de itens; as duas
tocam `test/smoke.mjs`, e a onda 1 tambem mexe em `src/conferir.mjs` (o `MESES`
sobe para `citacao.mjs`), que e onde a onda 2 trabalha. A **onda 3** documenta.

Nenhum modulo novo: as duas correcoes moram onde o codigo ja esta.

## Acceptance Criteria

- [x] As tres ondas concluidas, cada uma com `npm run check` verde
- [x] Nenhuma correcao afrouxa nada — todas apertam
- [x] Nenhum dado de cliente entra no repositorio; so numero de lei e de artigo
- [x] As formas curtas de hoje nao regridem
- [x] Nenhuma regra de gate nova
- [x] Zero dependencia de runtime nova
- [x] CI verde em Linux e Windows ao fim de cada onda
- [x] Plugin `attorneyfw` com a versao alinhada ao CLI

---

## Wave 1 — O extrator

> Toca `src/citacao.mjs`, `src/conferir.mjs` e `test/smoke.mjs`.

### ML-1A — `art. 1.048` e um artigo, e nao dois

**Status:** ✅ Concluído
**Files affected:** `src/citacao.mjs`
**Acoes:**
1. No tokenizer de `artigosDe`, reconhecer o numero com separador de milhar como
   **um** token: `1.048` nao se quebra em `1` e `048`.
2. Manter o sufixo ordinal no mesmo token: `5º` continua um token so.
3. `numArtigo` continua removendo o ponto — `1.048` vira `1048`.

**Aceite:** `art. 1.048, II, do CPC` devolve `cpc#1048`, uma chave so;
`art. 373 do CPC` e `art. 5º da CF` nao mudam.
**Validacao:** `npm run check`

**Raio maior que o medido na REQ.** Com a correcao, a peca de divorcio passou de
`art. 1 | 571 | 583 | 694 | 710 do CC` para `art. 1571 | 1583 | 1694 | 1710` — os
artigos certos da dissolucao, da guarda e dos alimentos. O fundamento inteiro
daquela peca estava sendo mutilado, e a REQ contou 6 ocorrencias no corpus quando
so o divorcio tinha 4.

### ML-1B — Lei com data por extenso

**Status:** ✅ Concluído
**Files affected:** `src/citacao.mjs`, `src/conferir.mjs`
**Acoes:**
1. Mover `MESES` de `src/conferir.mjs` para `src/citacao.mjs`, exportada;
   `conferir.mjs` passa a importa-la.
2. Reconhecer `Lei nº X, de DD de mes de AAAA` — **com e sem virgula** —, com o
   ano lido da **data**, e nao do dia.
3. A forma com barra (`Lei 6.830/80`) continua valendo, e vem depois.

**Aceite:** `Lei nº 10.741 de 01 de Outubro de 2003` devolve `estatuto-do-idoso`;
`Lei nº 9.279, de 14 de maio de 1996` devolve `lei-9279-1996`; `Lei 6.830/80`
continua `lef`.
**Validacao:** `npm run check`

### ML-1C — O corpus de formas como teste

**Status:** ✅ Concluído
**Files affected:** `test/smoke.mjs`
**Acoes:**
1. Tabela `forma -> chave esperada`, com as formas reais colhidas nas nove pecas.
2. **So numero de lei e de artigo** — direito publico. Nenhum dado de cliente.
3. Teste negativo mantido: sigla fora da tabela nao vira citacao.
4. Regressao das formas curtas, que sao as que ja funcionavam.

**Validacao:** `npm run check`

---

## Wave 2 — A guarda do comparador de itens

> Depende da onda 1 pelo `test/smoke.mjs`. Toca `src/conferir.mjs`.

### ML-2A — A guarda passa a valer para as tres checagens

**Status:** ✅ Concluído
**Files affected:** `src/conferir.mjs`
**Acoes:**
1. Mover a apuracao da forma dominante para **antes** da checagem de buraco na
   sequencia.
2. Sem forma dominante que cubra 70% dos itens, devolver `[]` — nenhuma das tres
   roda.
3. Comentar por que, com o caso real: ementa numerada de acordao virava "falta o
   item 2".

**Aceite:** sequencia numerada de prosa nao produz achado; lista de inventario
homogenea continua produzindo os tres de antes.
**Validacao:** `npm run check`

**Escopo acrescentado durante a execucao, e por que.** So mover a guarda nao
bastava. Na telefonia o comparador dava 7 itens malformados, e 6 eram titulos de
secao varridos para dentro da lista — "4. DOS DANOS MORAIS", "7. DOS PEDIDOS" —
com o unico defeito real, `98841;1749`, enterrado no meio. Divergente passou a
so contar como malformado quando ainda e **majoritariamente digito**, ou seja,
deformacao da forma dominante. Cabe na decisao 5 do ADR: a direcao do erro.

No corpus: de 9 achados de item (1 ementa + 6 titulos + 2 reais) para os 2 reais.


### ML-2B — Testes da guarda

**Status:** ✅ Concluído
**Files affected:** `test/smoke.mjs`
**Acoes:**
1. Ementa numerada com buraco na sequencia: **nenhum** achado.
2. Lista de inventario com buraco: achado, como hoje.
3. Item malformado e item x pedido continuam saindo — regressao dos testes que
   ja existem.

**Validacao:** `npm run check`

---

## Wave 3 — Doutrina e publicacao

### ML-3A — README, cabecalho e CHANGELOG

**Status:** ✅ Concluído
**Files affected:** `README.md`, `src/citacao.mjs`, `CHANGELOG.md`, `package.json`
**Acoes:**
1. README: o que o extrator passou a reconhecer, e a guarda do comparador.
2. Cabecalho de `src/citacao.mjs`: a regra do silencio agora tem corpus de teste,
   e os dois defeitos que a violavam ficam registrados.
3. CHANGELOG 0.10.0 e `package.json` para `0.10.0`.

**Aceite:** `npm run check` verde; a regra 13 do lint continua passando.
**Validacao:** `npm run check`

### ML-3B — Plugin e publicacao

**Status:** ✅ Concluído
**Files affected:** `plugin-skill/plugins/attorneyfw/**`
**Acoes:**
1. `plugin.json` para `0.10.0` — versao nunca publicada antes.
2. Comando `conferir` e `adv-ulpiano`: o extrator reconhece a forma longa, e o
   que ele continua nao reconhecendo cala.
3. Publicar e conferir o cache com `diff -r`.

**Aceite:** `claude plugin validate .` passa; `diff -r` do cache sai limpo.

Medido contra `main` em `9905865` (0.9.0): **395 -> 402 asserts**, 30 modulos e
nenhum novo, 16 regras de lint (nenhuma nova — as correcoes apertam codigo, e nao
doutrina). No corpus: de 9 achados de item para os 2 reais, e o fundamento de uma
peca inteira deixou de sair mutilado.

**Validacao:** `npm run check` · `trackfw validate` · `claude plugin validate .`
