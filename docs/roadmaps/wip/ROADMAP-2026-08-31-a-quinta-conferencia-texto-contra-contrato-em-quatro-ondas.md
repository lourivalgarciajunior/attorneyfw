---
status: wip
date: 2026-08-31
req: docs/req/REQ-2026-08-31-conferencia-do-texto-do-topico-contra-o-contrato-declarado.md
adr: docs/adr/ADR-2026-08-31-o-texto-do-topico-se-confere-contra-o-proprio-contrato.md
---

# Roadmap: A quinta conferencia — texto contra contrato, em quatro ondas

> Created: 2026-08-31 | Status: wip

## Context

O gate cobra que o contrato de topico exista. Nao cobra que o texto o honre. A
lista branca de `fundamento:` esta escrita, esta parseada, e nenhuma linha de
codigo a compara com o que a prosa cita.

REQ: `docs/req/REQ-2026-08-31-conferencia-do-texto-do-topico-contra-o-contrato-declarado.md`

ADR: `docs/adr/ADR-2026-08-31-o-texto-do-topico-se-confere-contra-o-proprio-contrato.md`

## Por que as ondas sao sequenciais

A **onda 1** e insumo puro das outras: sem chave normalizada de citacao, nao ha
o que comparar. As **ondas 2 e 3** tocam ambas `test/smoke.mjs`, e a onda 3
consome o comparador. A **onda 4** toca `bin/attorneyfw.mjs`, `README.md`,
`CHANGELOG.md` e `tools/lint.mjs`, e so faz sentido depois de o comportamento
existir.

**Correcao feita durante a execucao.** O extrator ia sozinho na onda 1, e o
comparador vinha na onda 2. Nao fecha: a regra `modulo-orfao` do lint reprova
modulo que o bin nao alcanca, e ela esta certa — modulo que ninguem importa nao
embarca. Entao o **primeiro consumidor entrou na onda 1**, e a onda 2 ficou so
com a superficie de linha de comando.

## Acceptance Criteria

- [ ] As quatro ondas concluidas, cada uma com `npm run check` verde
- [ ] Nenhuma das cinco comparacoes verifica existencia, vigencia, superacao ou pertinencia
- [ ] Quatro das cinco sao aviso; so topico sem texto reprova, e so em `revisao` e `entregue`
- [ ] Sigla fora da tabela declarada nao vira citacao — silencio, e nao palpite
- [ ] O contrato de topico nao ganha campo novo
- [ ] Zero dependencia de runtime nova
- [ ] CI verde em Linux e Windows ao fim de cada onda
- [ ] Plugin `attorneyfw` atualizado no `plugin-skill`, com a versao alinhada ao CLI

---

## Wave 1 — O extrator de citacao

> Primeira porque e insumo das outras duas: sem chave normalizada, nao ha
> comparacao possivel. Modulo puro, sem I/O, testavel sozinho.

### ML-1A — `src/citacao.mjs`

**Status:** ✅ Concluído
**Files affected:** `src/citacao.mjs` (novo)
**Acoes:**
1. Tabela `LEIS` de apelidos declarados — `CPC`, `CC`, `CF`, `CLT`, `CTN`, `CDC`,
   `CP`, `CPP`, `LEF`, `CTB`, `ECA`, `Estatuto do Idoso` — cada um com as formas
   por extenso que aparecem em peca.
2. `citacoesDe(texto)`: reconhece dispositivo (`art.`/`artigo` + numero + lei por
   apelido, por extenso ou por numero `Lei 6.830/80`), sumula, sumula vinculante,
   tema repetitivo e precedente por numero de recurso (`RE`, `REsp`, `AREsp`,
   `AI`, `RR`).
3. Normalizacao ao **artigo**: inciso, paragrafo e alinea sao lidos e
   descartados. Chave canonica `lei#artigo`, `sumula:orgao#n`, `sv#n`,
   `tema:orgao#n`, `precedente:classe#n`.
4. Devolver `[]` para forma nao reconhecida — nenhum palpite, nenhuma heuristica
   de sigla.
5. Exportar tambem `rotuloDe(chave)`, a forma legivel que vai para o par.

**Aceite:** `art. 373, II, do CPC` e `artigo 373 do Codigo de Processo Civil` dao
a mesma chave; `art. 5o da Lei 9.999/99` (lei fora da tabela, mas com numero) e
reconhecido; `conforme o XYZ` nao produz nada.
**Validacao:** `node -e "import('./src/citacao.mjs').then(m=>console.log(m.citacoesDe('art. 373, II, do CPC')))"`

### ML-1B — `conferirTopicos`, o primeiro consumidor

**Status:** ✅ Concluído
**Files affected:** `src/conferir.mjs`
**Acoes:**
1. `conferirTopicos(topicos, documentos)` — cinco comparacoes, no mesmo formato
   de achado das outras quatro (`tipo`, `esquerda`, `direita`, `trecho`).
2. `citacao-fora-do-contrato`: chave no texto ausente de `fundamento:`.
3. `fundamento-nao-usado`: chave em `fundamento:` ausente do texto.
4. `documento-nao-citado`: id em `documentos:` cujo id e cujo nome no canon nao
   aparecem no texto.
5. `topico-sem-texto`: contrato preenchido e prosa vazia ou irrisoria.
6. Nada e corrigido, e `fundamento:` nunca e completado com o que se achou.

**Aceite:** os quatro primeiros produzem par com os dois lados; `art. 373, II` no
texto contra `art. 373` no contrato nao produz achado.
**Validacao:** `npm run check`

### ML-1C — Testes do extrator e do comparador

**Status:** ✅ Concluído
**Files affected:** `test/smoke.mjs`
**Acoes:**
1. Equivalencia entre apelido e forma por extenso, nas seis leis mais usadas.
2. Inciso, paragrafo e alinea descartados: `art. 373, II` == `art. 373`.
3. Sumula, SV, tema e precedente reconhecidos nas formas do corpus.
4. Teste **negativo**: sigla fora da tabela nao vira citacao. Ancorado a linha,
   e nao a primeira ocorrencia do texto.

**Validacao:** `npm run check`

---

## Wave 2 — A quinta conferencia

> Depende da onda 1. Toca `src/conferir.mjs` e `test/smoke.mjs`.

### ML-2A — `attorneyfw conferir` mostra a quinta

**Status:** ✅ Concluído
**Files affected:** `src/conferir.mjs`, `test/smoke.mjs`
**Acoes:**
1. Ler a entrega **na origem** (`e.topicos`), e nao o markdown do `saida/` — o
   `build` remove o contrato de proposito.
2. Acrescentar os rotulos ao mapa `ROTULO`, e os achados ao `--json`.
3. Fechar o relatorio com o que **nao** foi conferido: existencia, vigencia,
   superacao e pertinencia.
4. Manter a nota de que a divergencia sai como par e nada foi corrigido.

**Aceite:** `conferir` sobre entrega com citacao fora do contrato sai com codigo
1 e mostra os dois lados; a linha final da recusa aparece tambem quando nao ha
achado nenhum.
**Validacao:** `npm run check`

---

## Wave 3 — O gate

> Depende da onda 1 (consome `conferirTopicos`). Toca `src/validate.mjs` e
> `test/smoke.mjs` — sequencial com a onda 2 pelo segundo arquivo.

### ML-3A — Avisos por topico, e o erro do topico vazio

**Status:** ✅ Concluído
**Files affected:** `src/validate.mjs`, `test/smoke.mjs`
**Acoes:**
1. Rodar `conferirTopicos` por entrega fora de `backlog` e `pesquisa`.
2. Emitir os quatro primeiros como **aviso**, com os dois lados na mensagem.
3. Emitir `topico-sem-texto` como **erro**, e so em `revisao` e `entregue`.
4. Nao rodar em `backlog` nem `pesquisa`: la o contrato esta sendo levantado.

**Aceite:** materia com citacao fora do contrato em `minuta` da aviso e nao
violacao; topico vazio em `revisao` da violacao; o mesmo topico em `pesquisa` nao
da nada. Cada teste cria a propria fixture.
**Validacao:** `npm run check`

---

## Wave 4 — Doutrina e publicacao

> Por ultimo: documenta comportamento que ja existe. Toca `bin/attorneyfw.mjs`,
> `README.md`, `CHANGELOG.md`, `tools/lint.mjs` e o plugin.

### ML-4A — README, AJUDA e a regra de lint

**Status:** ✅ Concluído
**Files affected:** `README.md`, `bin/attorneyfw.mjs`, `tools/lint.mjs`
**Acoes:**
1. README: a quinta conferencia, as cinco comparacoes e os quatro limites.
2. `AJUDA` do bin: a recusa em uma linha, no verbete do `conferir`.
3. Lint **regra 13**: reprovar o build se a recusa (nao verifica existencia,
   vigencia, superacao nem pertinencia) sumir de `README.md`,
   `bin/attorneyfw.mjs` ou `src/citacao.mjs`.

**Aceite:** apagar a frase da recusa em qualquer um dos tres reprova
`npm run lint`.
**Validacao:** `npm run check`

### ML-4B — CHANGELOG, versao e plugin

**Status:** 🔄 Em andamento
**Files affected:** `CHANGELOG.md`, `package.json`, `plugin-skill/plugins/attorneyfw/**`
**Acoes:**
1. CHANGELOG 0.6.0 — o que passou a ser conferido, e o que continua sem ser.
2. `package.json` para `0.6.0`.
3. Skill, agente `adv-gaio`, agente `adv-celso` e comando `conferir` do plugin:
   a quinta conferencia e a recusa.
4. `plugin.json` para `0.6.0` — a versao do plugin e a do CLI que ele documenta.
5. Publicar: `claude plugin marketplace update indieexpert` +
   `claude plugin update attorneyfw@indieexpert`, e conferir o cache com
   `diff -r`.

**Aceite:** `claude plugin validate .` passa; `diff -r` do cache contra a fonte
sai limpo.
**Validacao:** `npm run check` · `trackfw validate` · `claude plugin validate .`
