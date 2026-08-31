---
status: done
date: 2026-08-31
req: docs/req/REQ-2026-08-31-contagem-de-prazo-material-pelo-ctn-separada-da-processual-do-cpc.md
adr: docs/adr/ADR-2026-08-31-prazo-material-conta-pelo-ctn-e-a-divergencia-do-termo-inicial-sai-declarada.md
---

# Roadmap: Contagem de prazo material pelo CTN, separada da processual do CPC

> Created: 2026-08-31 | Status: done

## Context

O `contarPrazo` aplica a regra do CPC a todo prazo. Prazo material do CTN conta
diferente, e a 0.1.0 devolve data **posterior** a correta quando o dia seguinte
ao fato cai em dia sem expediente. Errar para mais faz o advogado acreditar em
folga que nao existe.

REQ: `docs/req/REQ-2026-08-31-contagem-de-prazo-material-pelo-ctn-separada-da-processual-do-cpc.md`
ADR: `docs/adr/ADR-2026-08-31-prazo-material-conta-pelo-ctn-e-a-divergencia-do-termo-inicial-sai-declarada.md`

## Acceptance Criteria

- [x] Regime material implementado, com a divergencia do paragrafo unico declarada
- [x] Regime processual inalterado — o smoke da 0.1.0 passa sem ajuste
- [x] Os dois casos medidos no caso real cobertos por teste
- [x] `npm run check` verde, CI verde nos dois sistemas
- [x] Skill e agente do plugin atualizados
- [x] 0.2.0 no CHANGELOG e no README

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

**Status:** ✅ Concluído
**Files affected:** `plugin-skill/plugins/attorneyfw/skills/attorneyfw-prazo/SKILL.md`, `plugin-skill/plugins/attorneyfw/agents/adv-modestino.md`, `plugin-skill/plugins/attorneyfw/commands/prazo.md`, `plugin.json`
**Aceite:**
- [x] Armadilha substituida pela regra nova — o texto que manda conferir a mao sai
- [x] `version` do plugin subida
- [x] `npm run lint`, `claude plugin validate .` e `trackfw validate` verdes la

## Validacao final

```
$ npm run check
attorneyfw 0.2.0 | 12 modulos | 12 templates | vocabulario 12 chaves
OK.
...
OK.        (smoke completo, zero falhas)
```

Os casos fixados no ML-0A, medidos pelo CLI depois da implementacao:

```
$ attorneyfw prazo set 1 --intimacao 2025-12-26 --dias 30 --material
  intimacao 2025-12-26 | 30 dias corridos (material) | inicio 2025-12-27 | vence 2026-01-26
  duas leituras do art. 210, par. unico, do CTN — adotada a mais curta
    caput: contagem de 2025-12-27, vence 2026-01-26  <- adotada
    se "iniciam" tambem deslocar: de 2025-12-29, vence 2026-01-27
```

E o caso do ROC, sem divergencia porque o dia seguinte ja e util: intimacao
2026-01-19, 30 dias material, vence **2026-02-19** — o 30o dia cai na
quarta-feira de cinzas e prorroga.

`trackfw validate`: as 12 violacoes sao do harness global em `~/.trackfw`,
identicas as do bookfw. Nenhuma de projeto.

## Defeito encontrado durante a execucao

**O recesso do art. 220 do CPC estava suspendendo prazo material.** Ele e
processual, e prazo tributario corre entre 20/12 e 20/01 normalmente. O
vencimento da leitura alternativa saltava de 2025-12-29 para 2026-01-21 — quase
um mes para frente, na direcao que faz acreditar em folga inexistente.

O teste unitario nao pegou porque passava `recesso: false` a mao e nunca
exercitou o caminho. Apareceu rodando o CLI de ponta a ponta. O teste agora
passa `recesso: true` de proposito, e ha assert dedicado.

E a segunda vez nesta correcao que o erro apontava para o mesmo lado: prazo
longo demais. Vale registrar como padrao — a direcao perigosa deste dominio nao
e a conta curta.

## Desvio de processo, declarado

Sem commit de inicio de ML: os ML rodaram encadeados na mesma sessao, com o
roadmap em `wip/` o tempo todo. Cada ML tem seu commit de conclusao, com a
transicao de status dentro dele.
