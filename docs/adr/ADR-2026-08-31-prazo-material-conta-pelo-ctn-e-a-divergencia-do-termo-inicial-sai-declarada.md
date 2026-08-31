---
status: Accepted
date: 2026-08-31
author: "Lourival Garcia"
---

# ADR: Prazo material conta pelo CTN e a divergencia do termo inicial sai declarada

> Date: 2026-08-31 | Status: Accepted

## Context

O `contarPrazo` da 0.1.0 implementa uma regra so: a do CPC. Termo inicial no
primeiro dia **util** seguinte (art. 224, § 3º), contagem em dias uteis
(art. 219), recesso do art. 220. A flag `--corridos` troca a unidade, mas nao
troca o termo inicial.

Prazo de direito material nao segue essa regra. O art. 210 do CTN diz:

> *caput* — Os prazos fixados nesta Lei ou legislacao tributaria serao
> continuos, excluindo-se na sua contagem o dia de inicio e incluindo-se o do
> vencimento.
>
> Paragrafo unico — Os prazos so se iniciam ou vencem em dia de expediente
> normal na reparticao em que corra o processo ou deva ser praticado o ato.

O defeito foi medido conferindo um Recurso Ordinario Constitucional real:

| | contagem correta pelo *caput* | o que a 0.1.0 devolvia |
|---|---|---|
| fato em 26.12.2025 (sexta), 30 dias | inicio 27.12 (sabado), 30º dia 25.01.2026 (domingo), prorroga para 26.01 | inicio 29.12 (segunda), fim 27.01 |

Errar prazo **para mais** e a pior direcao possivel: o advogado acredita ter
folga que nao tem.

Ao escrever a regra, porem, apareceu uma questao que o relato do defeito nao
tinha: o paragrafo unico diz que os prazos "so se **iniciam** ou vencem em dia
de expediente normal". Ha duas leituras, e elas nao sao equivalentes.

**Leitura A — so o vencimento se desloca.** O *caput* fixa o termo inicial no
dia seguinte, corrido; o paragrafo unico cuida apenas do vencimento. Foi o que
o proprio acordao do caso real aplicou: contou a partir de sabado, 27.12, e
prorrogou o vencimento de domingo para segunda.

**Leitura B — os dois extremos se deslocam.** "Iniciam" e literal: se o dia
seguinte nao tem expediente, a contagem so comeca no proximo dia util.

No caso medido as duas leituras dao datas diferentes — 26.01 contra 27.01 — e
nenhuma das duas e obviamente errada. Escolher uma em silencio seria a
ferramenta decidindo uma questao juridica no lugar de quem assina.

## Decision

**Tres decisoes, encadeadas.**

**1. O regime e declarado, nao inferido.** Nasce o campo `prazo_regime:
processual | material` no frontmatter da entrega, com `--material` no
`attorneyfw prazo set`. O padrao e `processual`, que e o que a maioria das
entregas de contencioso usa. Inferir o regime a partir do tipo da entrega seria
adivinhacao, e adivinhar prazo e o unico erro desta ferramenta que custa o caso.

**2. O regime material implementa o *caput* como regra principal** — termo
inicial no dia seguinte, corrido, util ou nao; contagem continua; vencimento
prorrogado para o proximo dia de expediente normal.

**3. Quando as duas leituras divergem, a ferramenta devolve as duas, e adota a
mais curta.** O `prazoDe` passa a expor `fim`, `fimAlternativo` e `divergencia`.
`fim` recebe sempre a data da Leitura A, que e a **anterior** — porque entre
duas leituras defensaveis, a ferramenta nunca pode ser a que concede folga.

Quando o dia seguinte a intimacao ja e dia de expediente normal, as leituras
coincidem, nao ha `fimAlternativo` e a saida e uma data so. Divergencia so
aparece quando ela existe de verdade.

## Consequences

- **A ferramenta para de errar para mais.** Era o ponto.
- **A divergencia vira visivel em vez de virar decisao silenciosa.** Quem le a
  agenda ve as duas datas e a razao, e decide. E a mesma doutrina da ressalva de
  contagem: o CLI confere, quem assina responde.
- **O gate e a agenda trabalham sobre a data mais curta.** Uma entrega marcada
  como vencida sob a Leitura A e ainda viva sob a B aparece como vencida — e o
  texto diz que ha leitura em que nao esta. Falso alarme de prazo custa menos
  que silencio.
- **A skill `attorneyfw-prazo` e o agente `adv-modestino` mudam junto.** Hoje
  eles mandam conferir prazo material a mao. Passam a mandar declarar o regime,
  e a explicar a divergencia.
- **Custo aceito:** mais um campo no frontmatter e mais um caminho no
  `contarPrazo`. O regime nao inferido significa que quem esquecer de declarar
  `--material` recebe a conta processual — por isso o gate avisa quando uma
  entrega tem prazo em dias corridos e regime processual, combinacao que quase
  sempre e prazo material mal declarado.
- **Nao ha promessa de cobertura de outros regimes.** Prazo prescricional,
  decadencial e contratual tem regras proprias que nao sao a do art. 210. Quem
  precisar deles declara `material` e confere a mao, ou abre ADR nova.

## Alternatives Considered

| Opcao | Por que nao |
|---|---|
| Trocar so o termo inicial do `--corridos`, sem campo novo | `--corridos` e sobre a **unidade** de contagem; regime e outra dimensao. Prazo processual em dias corridos existe (art. 224, § 1º), e fundir os dois conceitos impediria expressa-lo. |
| Escolher a Leitura B, mais literal, e nao mencionar a A | Devolve data **posterior** — exatamente o erro que esta ADR existe para corrigir. Seria trocar um erro para mais por outro. |
| Escolher a Leitura A e nao mencionar a B | Mais seguro que a anterior, mas esconde do advogado uma leitura que o tribunal pode adotar. A ferramenta nao decide questao juridica calada. |
| Inferir o regime pelo tipo da entrega | Adivinhacao sobre prazo. Nao. |
| Deixar como esta e so documentar na skill | Foi o estado da 0.1.0. Documentacao que pede conferencia a mao e melhor que nada, mas o CLI continua devolvendo numero errado, e numero errado na tela vence documentacao. |
