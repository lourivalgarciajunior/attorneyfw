---
status: Done
date: 2026-08-31
author: "Lourival Garcia"
adr: "ADR-2026-08-31-prazo-material-conta-pelo-ctn-e-a-divergencia-do-termo-inicial-sai-declarada"
roadmap: "ROADMAP-2026-08-31-contagem-de-prazo-material-pelo-ctn-separada-da-processual-do-cpc"
---

# REQ: Contagem de prazo material pelo CTN, separada da processual do CPC

> Date: 2026-08-31 | Status: Done

## Motivation

O `contarPrazo` da 0.1.0 aplica a regra do CPC a tudo. Prazo de direito
material tem regra propria, e a diferenca nao e teorica: medida sobre um caso
real, a 0.1.0 devolve **27.01.2026** onde a conta correta da **26.01.2026**.

Errar prazo para mais e a pior direcao. Prazo curto demais faz o escritorio
trabalhar antes da hora; prazo longo demais faz o advogado acreditar em folga
que nao existe, e e assim que se perde caso.

O defeito foi encontrado conferindo a aritmetica de um Recurso Ordinario
Constitucional real, e esta hoje documentado como armadilha na skill
`attorneyfw-prazo` e no agente `adv-modestino`, que mandam conferir prazo
material a mao. Documentacao que pede conferencia manual e melhor que nada, mas
numero errado na tela vence documentacao.

## Acceptance Criteria

- [x] `contarPrazo` aceita `regime: 'processual' | 'material'`
- [x] Regime `material` implementa o art. 210, *caput*, do CTN: exclui o dia do inicio, conta continuo a partir do dia seguinte (util ou nao), inclui o do vencimento
- [x] Vencimento em dia sem expediente normal prorroga para o seguinte, nos dois regimes
- [x] Quando as duas leituras do paragrafo unico divergem, `prazoDe` devolve `fim`, `fimAlternativo` e `divergencia`, com `fim` recebendo a data **mais curta**
- [x] Campo `prazo_regime` no frontmatter da entrega, com `--material` no `attorneyfw prazo set`
- [x] `prazo`, `status`, `context` e `validate` mostram o regime e a divergencia quando houver
- [x] Gate avisa quando ha `prazo_contagem: corridos` com `prazo_regime: processual` — combinacao que quase sempre e prazo material mal declarado
- [x] Smoke cobre o caso medido: fato em 26.12.2025, 30 dias material, `fim` 2026-01-26 e `fimAlternativo` 2026-01-27
- [x] Smoke cobre o caso sem divergencia: fato em 19.01.2026, 30 dias material, `fim` 2026-02-19 (quarta-feira de cinzas prorrogada) e sem `fimAlternativo`
- [x] `npm run check` verde; CI verde em Linux e Windows
- [x] Skill `attorneyfw-prazo` e agente `adv-modestino` atualizados no `plugin-skill`, com a armadilha substituida pela regra nova
- [x] CHANGELOG e README refletindo a 0.2.0

## Escopo negativo

Nao implementar, e nao inventar por conta:

- **Nenhum outro regime.** Prazo prescricional, decadencial, trabalhista e
  contratual tem regras que nao sao a do art. 210. Ficam de fora; quem precisar
  declara `material` e confere a mao.
- **Nao inferir o regime** a partir do tipo da entrega, da materia ou do
  fundamento. O regime e declarado. Adivinhar prazo nao se faz.
- **Nao escolher entre as duas leituras do paragrafo unico.** A ferramenta
  devolve as duas e adota a mais curta; a decisao juridica e de quem assina.
- **Nao mexer no calendario de feriados** nem tentar descobrir expediente de
  reparticao. Continua saindo de `docs/feriados.md`, a mao.
- **Nao alterar a contagem processual.** O regime `processual` sai desta REQ
  identico ao que entrou — o smoke da 0.1.0 tem de continuar passando sem
  ajuste.
- **Nao remover a ressalva** de que a contagem e conferencia. Ela vale mais
  depois desta correcao, nao menos.

## Linked ADR

ADR: `docs/adr/ADR-2026-08-31-prazo-material-conta-pelo-ctn-e-a-divergencia-do-termo-inicial-sai-declarada.md`

## Blocked by ADRs
<!-- none -->

## Linked Roadmap

Roadmap: `docs/roadmaps/done/ROADMAP-2026-08-31-contagem-de-prazo-material-pelo-ctn-separada-da-processual-do-cpc.md`
