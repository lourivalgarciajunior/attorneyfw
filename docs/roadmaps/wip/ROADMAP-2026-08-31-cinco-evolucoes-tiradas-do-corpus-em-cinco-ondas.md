---
status: wip
date: 2026-08-31
req: docs/req/REQ-2026-08-31-cinco-evolucoes-tiradas-da-leitura-de-oito-pecas-reais.md
adr: docs/adr/ADR-2026-08-31-anonimizacao-e-um-mapa-aplicado-de-uma-vez-nunca-uma-varredura.md
---

# Roadmap: Cinco evolucoes tiradas do corpus, em cinco ondas

> Created: 2026-08-31 | Status: wip

## Context

Oito pecas reais de areas diferentes, lidas em conjunto. Cada uma das cinco
ondas tem pelo menos um defeito encontrado e conferido no corpus — nenhuma nasce
de parecer boa ideia.

REQ: `docs/req/REQ-2026-08-31-cinco-evolucoes-tiradas-da-leitura-de-oito-pecas-reais.md`

ADRs:
- `docs/adr/ADR-2026-08-31-anonimizacao-e-um-mapa-aplicado-de-uma-vez-nunca-uma-varredura.md`
- `docs/adr/ADR-2026-08-31-numero-se-confere-contra-si-mesmo-e-contra-o-documento-de-onde-foi-transcrito.md`
- `docs/adr/ADR-2026-08-31-o-canon-sobe-para-a-carteira-parte-recorrente-tem-uma-qualificacao-so.md`
- `docs/adr/ADR-2026-08-31-modelo-por-tipo-de-acao-sai-do-arquivo-do-escritorio-nunca-de-conhecimento-generico.md`

## Por que as ondas sao sequenciais

Todas tocam `bin/attorneyfw.mjs`, `README.md`, `CHANGELOG.md` e `tools/lint.mjs`.
Microbatches que compartilham arquivo tem de ser sequenciais.

Ha ainda duas dependencias de conteudo: a **onda 5** precisa do comparador
numerico da **onda 2** e da ficha de documento que a **onda 3** consolida; e a
**onda 4** destila do canon que a onda 3 arruma.

## Acceptance Criteria

- [ ] As cinco ondas concluidas, cada uma com `npm run check` verde
- [ ] Nenhuma substituicao automatica de dado pessoal
- [ ] Nenhuma correcao automatica de extenso, soma ou item
- [ ] Nenhum modelo de acao sem materia de origem
- [ ] Zero dependencia de runtime nova
- [ ] CI verde em Linux e Windows ao fim de cada onda
- [ ] Plugin `attorneyfw` atualizado no `plugin-skill`

---

## Wave 1 — Anonimizacao por mapa

> Primeira porque e o unico caso em que o erro sai do processo e alcanca quem
> nao e parte de nada.

### ML-1A — O mapa e a aplicacao total

**Status:** ⬜ Pendente
**Files affected:** `src/anonimizar.mjs` (novo), `templates/anonimizacao.yaml` (novo)
**Acoes:**
1. Leitura do mapa `real: ficticio`, com recusa de par curto demais ou ambiguo.
2. Aplicacao de **todos** os pares sobre **todo** o texto, numa passada.
3. `--reverter` pelo mesmo mapa.
4. Falha antes de gravar quando algum par nao pode ser aplicado.

**Aceite:**
- [ ] Nunca grava meia substituicao — e a propriedade central desta onda
- [ ] A mesma pessoa recebe o mesmo nome ficticio em toda peca da materia
- [ ] Ida e volta devolve o texto original, byte a byte

### ML-1B — Deteccao que so acusa

**Status:** ⬜ Pendente
**Files affected:** `src/dados.mjs` (novo), `bin/attorneyfw.mjs`
**Aceite:**
- [ ] CPF, CNPJ, RG, e-mail, telefone e cartao reconhecidos; **texto intacto**
- [ ] CPF e CNPJ validados por digito verificador — reduz falso positivo
- [ ] A saida declara que reconhece formato, e nao pessoa
- [ ] Aponta o que esta fora do mapa, quando ha mapa

### ML-1C — O gate, o `.gitignore` e a documentacao

**Status:** ⬜ Pendente
**Files affected:** `src/validate.mjs`, `.gitignore`, `tools/lint.mjs`, `test/smoke.mjs`, `README.md`, `CHANGELOG.md`
**Aceite:**
- [ ] Gate **avisa** (nao viola) sobre dado com formato reconhecivel fora do mapa
- [ ] `anonimizacao.yaml` ignorado — e a chave que desfaz tudo de uma vez
- [ ] Smoke cobre aplicacao total, recusa parcial, ida e volta, e deteccao sem substituicao

---

## Wave 2 — Conferencia numerica

### ML-2A — Os tres comparadores

**Status:** ⬜ Pendente
**Files affected:** `src/conferir.mjs` (novo)
**Aceite:**
- [ ] Extenso x algarismo, com parser de valor por extenso em portugues
- [ ] Soma declarada x parcelas
- [ ] Item alegado x item pedido, com faltante, malformado e orfao
- [ ] Toda divergencia sai como **par**, com os dois lados
- [ ] Nada e corrigido

### ML-2B — `attorneyfw conferir`

**Status:** ⬜ Pendente
**Files affected:** `bin/attorneyfw.mjs`, `test/smoke.mjs`, `README.md`, `CHANGELOG.md`
**Aceite:**
- [ ] Roda sobre o markdown que o `build` gerou, e recostura se faltar
- [ ] `--json`
- [ ] Smoke reproduz os tres casos do corpus, conferidos a mao antes do teste

---

## Wave 3 — Canon na carteira

> A maior das cinco, e a que mexe em mais lugar.

### ML-3A — A ficha da carteira

**Status:** ⬜ Pendente
**Files affected:** `templates/parte-carteira.md` (novo), `src/parte.mjs` (novo), `src/core.mjs`
**Aceite:**
- [ ] `partes/<slug>.md` na raiz, com documento obrigatorio
- [ ] CPF ou CNPJ validado por digito verificador
- [ ] Matriz e filial sao fichas distintas, ligadas por `matriz:`

### ML-3B — A materia referencia

**Status:** ⬜ Pendente
**Files affected:** `src/canon.mjs`, `templates/parte.md`, `src/core.mjs` (sequencial com ML-3A)
**Aceite:**
- [ ] `ref: <slug>` herda a qualificacao; papel continua da materia
- [ ] Ficha antiga sem `ref` carrega sem migracao

### ML-3C — Gate, busca e diagrama

**Status:** ⬜ Pendente
**Files affected:** `src/validate.mjs`, `src/buscar.mjs`, `src/diagrama.mjs`, `bin/attorneyfw.mjs`, `test/smoke.mjs`, `README.md`, `CHANGELOG.md`
**Aceite:**
- [ ] Divergencia carteira x materia e **violacao**, com as duas versoes a vista
- [ ] `buscar` acha materia por nome ou documento de parte
- [ ] `diagrama partes` le a ficha da carteira quando ha `ref`
- [ ] Smoke reproduz o caso do corpus: mesmo documento, duas sedes, reprova

---

## Wave 4 — Modelo por tipo de acao

### ML-4A — Destilar

**Status:** ⬜ Pendente
**Files affected:** `src/modelo.mjs` (novo), `templates/modelo-acao.yaml` (novo)
**Aceite:**
- [ ] Destila documentos, fundamentos e objecoes de materias indicadas
- [ ] Cada linha carrega os slugs de origem e a contagem
- [ ] Item de uma materia so sai marcado
- [ ] Sem materia de origem, **falha** — e manda usar o agente de fundamento

### ML-4B — Aplicar

**Status:** ⬜ Pendente
**Files affected:** `src/modelo.mjs`, `bin/attorneyfw.mjs`, `test/smoke.mjs`, `README.md`, `CHANGELOG.md`
**Aceite:**
- [ ] Cria itens **pendentes**; nada dado por provado ou fundamentado
- [ ] A saida declara sempre o `n` de materias destiladas
- [ ] O gate continua cobrando a tese exatamente como cobra hoje

---

## Wave 5 — Transcricao com lastro

> Depende do comparador da Wave 2 e da ficha de documento da Wave 3.

### ML-5A — Transcricao declarada e conferida

**Status:** ⬜ Pendente
**Files affected:** `src/conferir.mjs`, `src/validate.mjs`, `src/build.mjs`, `bin/attorneyfw.mjs`, `test/smoke.mjs`, `README.md`, `CHANGELOG.md`
**Aceite:**
- [ ] Bloco de transcricao declara o id do documento no canon
- [ ] Numeros conferidos contra os que a ficha registra
- [ ] Numero desconhecido da ficha vira **aviso**
- [ ] Transcricao sem documento declarado e apontada pelo gate
- [ ] Smoke reproduz o caso do corpus: valor divergente dentro das aspas

---

## Barreira final

- [ ] `npm run check` verde
- [ ] `trackfw validate` sem violacoes de escopo de projeto
- [ ] CI verde em Linux e Windows
- [ ] Plugin publicado com `version` subida
- [ ] REQ e roadmap em `done/`, com status batendo com a pasta
