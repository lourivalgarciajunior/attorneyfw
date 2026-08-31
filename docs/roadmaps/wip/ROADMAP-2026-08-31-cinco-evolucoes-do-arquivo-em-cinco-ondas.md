---
status: wip
date: 2026-08-31
req: docs/req/REQ-2026-08-31-cinco-evolucoes-do-arquivo-do-escritorio-importar-estilo-formulas-titulo-e-prioridade.md
adr: docs/adr/ADR-2026-08-31-importar-assiste-e-nao-preenche-tudo-entra-pendente-e-o-que-nao-e-mecanico-e-recusado-em-voz-alta.md
---

# Roadmap: Cinco evolucoes do arquivo, em cinco ondas

> Created: 2026-08-31 | Status: wip

## Context

As duas ampliacoes anteriores tiraram do corpus os **defeitos** das pecas. Esta
tira delas o que elas tambem sao: o **arquivo do escritorio**.

REQ: `docs/req/REQ-2026-08-31-cinco-evolucoes-do-arquivo-do-escritorio-importar-estilo-formulas-titulo-e-prioridade.md`

ADRs:
- `docs/adr/ADR-2026-08-31-importar-assiste-e-nao-preenche-tudo-entra-pendente-e-o-que-nao-e-mecanico-e-recusado-em-voz-alta.md`
- `docs/adr/ADR-2026-08-31-o-style-card-descreve-o-escritorio-e-nao-prescreve-o-certo.md`
- `docs/adr/ADR-2026-08-31-formula-de-peca-e-dado-da-carteira-e-nao-literal-no-codigo.md`
- `docs/adr/ADR-2026-08-31-o-gate-cobra-o-que-a-peca-anuncia-sobre-si-mesma.md`

## Por que as ondas sao sequenciais

Todas tocam `bin/attorneyfw.mjs`, `README.md`, `CHANGELOG.md` e `tools/lint.mjs`.

Ha uma dependencia de conteudo que vale registrar: a **onda 1** produz o insumo
das ondas 2 e 3 — o card de estilo e as formulas saem de pecas, e a importacao e
o que leva peca para dentro. As ondas 4 e 5 sao independentes, e vem por ultimo
por serem as menores.

## Acceptance Criteria

- [ ] As cinco ondas concluidas, cada uma com `npm run check` verde
- [ ] A importacao nao preenche tese, plano nem contrato de topico
- [ ] O card de estilo nao prescreve, e nenhum gate reprova aderencia a voz
- [ ] O foro e declarado, e nunca inferido
- [ ] Nenhuma das ondas 2, 4 e 5 reprova o gate — as tres tem caso legitimo
- [ ] Zero dependencia de runtime nova
- [ ] CI verde em Linux e Windows ao fim de cada onda
- [ ] Plugin `attorneyfw` atualizado no `plugin-skill`

---

## Wave 1 — Importar peca arquivada

> Primeira porque e a porta de entrada: sem ela, o modelo de acao da 0.4.0
> destila do vazio e as ondas 2 e 3 nao tem insumo.

### ML-1A — Leitura e extracao

**Status:** ⬜ Pendente
**Files affected:** `src/importar.mjs` (novo)
**Acoes:**
1. Ler `.docx` (unzip + `word/document.xml`), `.txt` e `.md`.
2. Extrair por regra, **classificado por confianca**: documento com digito
   verificador, enderecamento, datas, valores, "conforme … anexo", nome em
   maiuscula antes do documento.
3. Marcar documento com digito invalido, em vez de ignora-lo.

**Aceite:**
- [ ] `.docx` lido sem dependencia nova — o mesmo caminho de OOXML que o projeto ja usa
- [ ] Cada item traz origem e confianca
- [ ] Digito invalido sai marcado

### ML-1B — O relatorio, e o que ele recusa

**Status:** ⬜ Pendente
**Files affected:** `src/importar.mjs`, `templates/importado.md` (novo), `bin/attorneyfw.mjs`
**Aceite:**
- [ ] `docs/importado-<slug>.md` com **tudo** em `- [ ]`
- [ ] Secao fixa "o que esta importacao nao extraiu", **sempre** presente
- [ ] Partes saem como **sugestao** de `attorneyfw parte new`, e nao gravadas
- [ ] `--criar-materia` cria so pasta e `materia.yaml`
- [ ] O arquivo de origem nao e alterado nem movido

### ML-1C — Documentacao e smoke

**Status:** ⬜ Pendente
**Files affected:** `test/smoke.mjs`, `README.md`, `CHANGELOG.md`, `package.json`
**Aceite:**
- [ ] Smoke cobre digito valido e invalido, tudo pendente, e a secao do que faltou
- [ ] PDF declarado fora do escopo na saida

---

## Wave 2 — Style card

### ML-2A — A medicao

**Status:** ⬜ Pendente
**Files affected:** `src/estilo.mjs` (novo)
**Aceite:**
- [ ] Tratamento do juizo, rotulo das partes, formula de lastro, ritmo, caixa alta
- [ ] **Cada traco com o `n`** — em quantas amostras, de quantas lidas
- [ ] Nenhuma linha prescritiva

### ML-2B — O card, e o unico gate que ele habilita

**Status:** ⬜ Pendente
**Files affected:** `src/estilo.mjs`, `src/validate.mjs`, `bin/attorneyfw.mjs`, `test/smoke.mjs`, `README.md`, `CHANGELOG.md`
**Aceite:**
- [ ] `estilo.yaml` na carteira; `attorneyfw estilo` sem `--de` mostra o card
- [ ] Gate **avisa** quando a peca usa dois rotulos para a mesma parte
- [ ] Nao ha gate de aderencia a voz
- [ ] Smoke reproduz o caso do corpus

---

## Wave 3 — Formulas de peca

### ML-3A — O arquivo e a semente

**Status:** ⬜ Pendente
**Files affected:** `templates/formulas.yaml` (novo), `src/formulas.mjs` (novo), `templates/materia.yaml`
**Aceite:**
- [ ] Enderecamento por foro, qualificacao e fecho, com marcadores
- [ ] `foro:` no `materia.yaml`, **declarado**
- [ ] Uma semente, marcada como semente

### ML-3B — O `build` usa, e avisa quando nao tem

**Status:** ⬜ Pendente
**Files affected:** `src/build.mjs`, `bin/attorneyfw.mjs`, `test/smoke.mjs`, `README.md`, `CHANGELOG.md`
**Aceite:**
- [ ] Le `formulas.yaml` da carteira quando existe
- [ ] Sem ele, usa a semente e **avisa uma vez**
- [ ] Marcador sem valor sai **visivel** no papel

---

## Wave 4 — O titulo promete o que a peca nao pede

### ML-4A — A regra

**Status:** ⬜ Pendente
**Files affected:** `src/validate.mjs`, `test/smoke.mjs`, `README.md`, `CHANGELOG.md`
**Aceite:**
- [ ] Aviso quando o titulo anuncia `c/c X` e o pedido nao menciona X
- [ ] A mensagem mostra os dois lados
- [ ] Aviso, e nao violacao
- [ ] Smoke reproduz o caso do corpus

---

## Wave 5 — Prioridade e idade

### ML-5A — `nascimento:` e as duas regras

**Status:** ⬜ Pendente
**Files affected:** `templates/parte-carteira.md`, `templates/parte.md`, `src/core.mjs`, `src/validate.mjs`, `test/smoke.mjs`, `README.md`, `CHANGELOG.md`
**Aceite:**
- [ ] Idade **derivada** da data, nunca digitada
- [ ] Aviso com parte de 60+ ou menor e sem pedido de prioridade
- [ ] Aviso quando a idade anunciada nao bate com a ficha, com os dois lados
- [ ] Sem `nascimento:`, a regra nao roda e nao ha aviso de campo faltando
- [ ] Smoke cobre os tres casos

---

## Barreira final

- [ ] `npm run check` verde
- [ ] `trackfw validate` sem violacoes de escopo de projeto
- [ ] CI verde em Linux e Windows
- [ ] Plugin publicado com `version` subida
- [ ] REQ e roadmap em `done/`, com status batendo com a pasta
