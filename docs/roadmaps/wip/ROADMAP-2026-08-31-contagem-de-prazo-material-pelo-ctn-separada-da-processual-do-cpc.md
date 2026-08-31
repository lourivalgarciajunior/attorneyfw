---
status: wip
date: 2026-08-31
req: docs/req/REQ-2026-08-31-contagem-de-prazo-material-pelo-ctn-separada-da-processual-do-cpc.md
adr: docs/adr/ADR-2026-08-31-prazo-material-conta-pelo-ctn-e-a-divergencia-do-termo-inicial-sai-declarada.md
---

# Roadmap: Contagem de prazo material pelo CTN, separada da processual do CPC

> Created: 2026-08-31 | Status: wip

## Context

O `contarPrazo` aplica a regra do CPC a todo prazo. Prazo material do CTN conta
diferente, e a 0.1.0 devolve data **posterior** a correta quando o dia seguinte
ao fato cai em dia sem expediente. Errar para mais faz o advogado acreditar em
folga que nao existe.

REQ: `docs/req/REQ-2026-08-31-contagem-de-prazo-material-pelo-ctn-separada-da-processual-do-cpc.md`
ADR: `docs/adr/ADR-2026-08-31-prazo-material-conta-pelo-ctn-e-a-divergencia-do-termo-inicial-sai-declarada.md`

## Acceptance Criteria

- [ ] Regime material implementado, com a divergencia do paragrafo unico declarada
- [ ] Regime processual inalterado — o smoke da 0.1.0 passa sem ajuste
- [ ] Os dois casos medidos no caso real cobertos por teste
- [ ] `npm run check` verde, CI verde nos dois sistemas
- [ ] Skill e agente do plugin atualizados
- [ ] 0.2.0 no CHANGELOG e no README

## Wave 0 — Falsificacao

> Bloqueia a implementacao. Sem isto, a correcao pode trocar um erro por outro.

### ML-0A — Fixar os casos de verdade antes de escrever a regra

**Status:** ✅ Concluído
**Files affected:** nenhum (analise registrada aqui)
**Acoes:**
1. Calcular a mao os dois casos do ROC real e registrar o resultado esperado.
2. Enumerar em que direcao cada regime pode errar, e qual direcao e inaceitavel.
3. Declarar o residual: o que esta correcao **nao** cobre.

**Aceite:**
- [x] Datas esperadas escritas antes de qualquer linha de implementacao
- [x] Direcao de erro inaceitavel declarada

## Wave 1 — O nucleo

### ML-1A — `contarPrazo` com regime

**Status:** ✅ Concluído
**Files affected:** `src/core.mjs`
**Aceite:**
- [x] `regime: 'material'` conta pelo *caput* do art. 210
- [x] Vencimento prorroga nos dois regimes
- [x] Devolve `inicioAlternativo` e `fimAlternativo` quando as leituras divergem
- [x] `regime: 'processual'` produz exatamente o que produzia antes

### ML-1B — `prazoDe` expondo a divergencia

**Status:** ✅ Concluído
**Files affected:** `src/core.mjs` (sequencial com ML-1A: mesmo arquivo)
**Aceite:**
- [x] Le `prazo_regime` do frontmatter, com `processual` como padrao
- [x] `fim` recebe a data mais curta; `fimAlternativo` e `divergencia` acompanham
- [x] Regime invalido vira erro legivel, nao silencio

## Wave 2 — As superficies

> Sequencial com a Wave 1: todas leem o que o `prazoDe` passou a devolver.

### ML-2A — `prazo set --material` e a agenda

**Status:** ✅ Concluído
**Files affected:** `src/prazo.mjs`, `bin/attorneyfw.mjs`, `templates/entrega.md`, `src/novo.mjs`
**Aceite:**
- [x] `--material` grava `prazo_regime: material`
- [x] A agenda marca o regime e mostra a data alternativa quando ha divergencia
- [x] Entrega nova nasce com `prazo_regime` no frontmatter

### ML-2B — Gate, status e context

**Status:** ✅ Concluído
**Files affected:** `src/validate.mjs`, `src/status.mjs`
**Aceite:**
- [x] Gate avisa em `corridos` + `processual` — quase sempre material mal declarado
- [x] Gate recusa `prazo_regime` fora do vocabulario
- [x] Divergencia aparece no `status` e no `context`

## Wave 3 — Provas e publicacao

### ML-3A — Smoke

**Status:** ✅ Concluído
**Files affected:** `test/smoke.mjs`
**Aceite:**
- [x] Caso com divergencia: 26.12.2025 + 30 dias material → `fim` 2026-01-26, `fimAlternativo` 2026-01-27
- [x] Caso sem divergencia: 19.01.2026 + 30 dias material → `fim` 2026-02-19, sem alternativa
- [x] Regressao: os casos processuais da 0.1.0 passam sem alteracao
- [x] Fluxo de ponta a ponta pelo CLI, com `--material`

### ML-3B — Documentacao e release

**Status:** ✅ Concluído
**Files affected:** `README.md`, `CHANGELOG.md`, `package.json`
**Aceite:**
- [x] 0.2.0, com o defeito e a medida no CHANGELOG
- [x] README explicando os regimes e a divergencia
- [x] `npm run check` verde

### ML-3C — Skill e agente no plugin-skill

**Status:** ⬜ Pendente
**Files affected:** `plugin-skill/plugins/attorneyfw/skills/attorneyfw-prazo/SKILL.md`, `plugin-skill/plugins/attorneyfw/agents/adv-modestino.md`, `plugin-skill/plugins/attorneyfw/commands/prazo.md`, `plugin.json`
**Aceite:**
- [ ] Armadilha substituida pela regra nova — o texto que manda conferir a mao sai
- [ ] `version` do plugin subida
- [ ] `npm run lint`, `claude plugin validate .` e `trackfw validate` verdes la

## Validacao final

Preencher com o comando e o resultado medidos.
