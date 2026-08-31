---
status: wip
date: 2026-08-31
req: docs/req/REQ-2026-08-31-a-sexta-conferencia-continuidade-de-fato-entre-topicos-da-mesma-peca.md
adr: docs/adr/ADR-2026-08-31-a-continuidade-de-fato-se-confere-contra-o-que-foi-declarado-e-nunca-inferindo-que-dois-fatos-sao-o-mesmo.md
---

# Roadmap: A sexta conferencia, em tres ondas

> Created: 2026-08-31 | Status: wip

## Context

O template da cronologia promete, desde a 0.1.0, que e contra ela que se confere
se a data do topico 4 bate com a do topico 9. Nada confere. O canon guarda tudo
declarado e legivel, e nenhuma comparacao o usa para isso.

REQ: `docs/req/REQ-2026-08-31-a-sexta-conferencia-continuidade-de-fato-entre-topicos-da-mesma-peca.md`

ADR: `docs/adr/ADR-2026-08-31-a-continuidade-de-fato-se-confere-contra-o-que-foi-declarado-e-nunca-inferindo-que-dois-fatos-sao-o-mesmo.md`

## Por que as ondas sao sequenciais

A **onda 1** entrega o comparador, e a onda 2 o exibe. As duas tocam
`test/smoke.mjs`; a onda 1 toca `src/core.mjs`, `src/diagrama.mjs` e
`src/conferir.mjs`, e a onda 2 volta a `src/conferir.mjs` e a `src/validate.mjs`.
A **onda 3** toca `bin`, `README`, `CHANGELOG`, `tools/lint.mjs` e o plugin.

O comparador **nao** ganha modulo proprio: nasceria orfao ate ser ligado, e a
regra `modulo-orfao` do lint reprova. Ela e um comparador, e mora com os
comparadores — decisao registrada no ADR para nao ser refeita.

## Acceptance Criteria

- [ ] As tres ondas concluidas, cada uma com `npm run check` verde
- [ ] Toda comparacao tem ancora declarada; sem ancora, silencio
- [ ] Nada dentro de bloco de transcricao e conferido
- [ ] Nenhuma das tres vira violacao — todas tem excecao legitima
- [ ] Ano solto nao vira data
- [ ] Diferenca so de caixa em nome nao vira achado
- [ ] Cronologia vazia sai declarada como "nao conferido", e nao como cobranca
- [ ] Zero modulo novo e zero dependencia de runtime nova
- [ ] CI verde em Linux e Windows ao fim de cada onda
- [ ] Plugin `attorneyfw` atualizado, com a versao alinhada ao CLI

---

## Wave 1 — O comparador

> Primeira porque e o comportamento. Toca `src/core.mjs`, `src/diagrama.mjs`,
> `src/conferir.mjs` e `test/smoke.mjs`.

### ML-1A — `tabela()` sobe para o core

**Status:** ✅ Concluído
**Files affected:** `src/core.mjs`, `src/diagrama.mjs`
**Acoes:**
1. Mover `tabela(corpo, alias)` de `src/diagrama.mjs` para `src/core.mjs`,
   exportada, com o comentario que explica a leitura por nome de coluna.
2. `src/diagrama.mjs` passa a importa-la.

**Aceite:** o diagrama de linha do tempo continua saindo igual — os testes de
`visual law` cobrem isso e nao podem mudar.
**Validacao:** `npm run check`

### ML-1B — Datas em prosa, e a exclusao da transcricao

**Status:** ✅ Concluído
**Files affected:** `src/conferir.mjs`
**Acoes:**
1. `datasEmProsa(texto)`: reconhece `12/03/2024` e `12 de marco de 2024`,
   normaliza a `AAAA-MM-DD`, devolve com a grafia original.
2. **Excluir bloco de transcricao antes de extrair.** O que esta entre aspas e do
   documento, e apontar seria pedir que se falsificasse a citacao.
3. **Ano solto nao e data.** `Lei 8.078, de 1990` nao produz nada.

**Aceite:** as duas grafias dao a mesma chave; data em `transcricao` nao sai; ano
solto nao sai.
**Validacao:** `npm run check`

### ML-1C — `conferirContinuidade`

**Status:** ✅ Concluído
**Files affected:** `src/conferir.mjs`
**Acoes:**
1. `data-fora-da-cronologia` — ancora: a tabela de `docs/canon/cronologia.md`.
2. `data-divergente-do-documento` — ancora: o documento declarado em
   `documentos:`. Nomeia **os dois topicos**. Inclui o `data:` da ficha quando
   ela o declara.
3. `grafia-fora-do-canon` — ancora: nome e apelidos do canon. Diferenca so de
   caixa **nao** conta.
4. Cronologia vazia: devolver o aviso de "nao conferido", com a contagem de datas
   que a peca cita. Nao e cobranca.
5. **Nenhuma inferencia.** Sem ancora declarada, silencio — sem casamento por
   proximidade, sem "o marco mais parecido".

**Aceite:** dois topicos com datas diferentes e sem documento comum nao produzem
nada; com `D3` declarado nos dois, produzem par nomeando os dois.
**Validacao:** `npm run check`

### ML-1D — Testes do comparador

**Status:** ✅ Concluído
**Files affected:** `test/smoke.mjs`
**Acoes:**
1. Normalizacao das duas grafias de data; ano solto; data em transcricao.
2. Data fora e dentro da cronologia.
3. Par entre topicos com documento comum, e silencio sem documento comum.
4. Grafia sem acento acusa; caixa alta nao acusa; apelido nao acusa.
5. Cronologia vazia devolvendo a linha de nao conferido.

**Validacao:** `npm run check`

---

## Wave 2 — O relatorio e o gate

> Depende da onda 1. Toca `src/conferir.mjs`, `src/validate.mjs` e
> `test/smoke.mjs`.

### ML-2A — `conferir` e o gate mostram a sexta

**Status:** ✅ Concluído
**Files affected:** `src/conferir.mjs`, `src/validate.mjs`
**Acoes:**
1. Rotulos no mapa `ROTULO`, achados no `--json`, contagem "seis conferencias".
2. Acrescentar a recusa ao rodape do relatorio: nao decide qual data esta certa, e
   nao infere que dois fatos sao o mesmo.
3. Gate: emitir as tres como **aviso**, nunca violacao, fora de `backlog` e
   `pesquisa`.

**Aceite:** materia com data fora da cronologia da aviso e nao violacao; o rodape
sai com achado e sem achado.
**Validacao:** `npm run check`

**Defeito achado rodando, e nao lendo.** A primeira versao da comparacao 2
agrupava por documento e comparava datas soltas — e num topico que citava
contrato e aditivo o par saiu como `topico 1.1, 1.1`: uma divergencia "entre
topicos" dentro de um topico so. Duas datas no mesmo topico sao legitimas, e
dizer qual delas e a do documento seria inferencia. A comparacao passou a exigir
topicos diferentes **sem interseccao de datas**, e a ficha so acusa quando
nenhuma data do topico e a dela. Tres testes de regressao.


### ML-2B — Testes do relatorio e do gate

**Status:** ✅ Concluído
**Files affected:** `test/smoke.mjs`
**Acoes:**
1. Materia propria, criada no proprio teste.
2. `conferir` sai com 1 e mostra os dois lados.
3. Gate: aviso, e a contagem de violacoes nao muda.
4. A recusa aparece no rodape mesmo sem achado.

**Validacao:** `npm run check`

---

## Wave 3 — Doutrina e publicacao

### ML-3A — README, AJUDA e a regra de lint

**Status:** ⬜ Pendente
**Files affected:** `README.md`, `bin/attorneyfw.mjs`, `tools/lint.mjs`
**Acoes:**
1. README: a sexta conferencia, as tres ancoras, e a promessa do template
   finalmente cumprida.
2. `AJUDA`: a sexta no verbete do `conferir`.
3. Lint **regra 15**: reprovar o build se a recusa — nao infere que dois fatos
   sao o mesmo — sumir de `README.md`, `src/conferir.mjs` ou
   `templates/cronologia.md`.

**Aceite:** apagar a frase em qualquer um dos tres reprova `npm run lint`,
provado um de cada vez com copia de backup **fora do git**.
**Validacao:** `npm run check`

### ML-3B — CHANGELOG, versao e plugin

**Status:** ⬜ Pendente
**Files affected:** `CHANGELOG.md`, `package.json`, `plugin-skill/plugins/attorneyfw/**`
**Acoes:**
1. CHANGELOG 0.8.0 e `package.json` para `0.8.0`.
2. Skill, `adv-paulo`, `adv-celso` e comando `conferir` do plugin.
3. `plugin.json` para `0.8.0` — versao nunca publicada antes.
4. Publicar e conferir o cache com `diff -r`.

**Aceite:** `claude plugin validate .` passa; `diff -r` do cache sai limpo.
**Validacao:** `npm run check` · `trackfw validate` · `claude plugin validate .`
