---
status: Accepted
date: 2026-08-31
author: "Lourival Garcia"
---

# ADR: Carteira de materias com dois tipos sob a mesma cadeia e um so nucleo

> Date: 2026-08-31 | Status: Accepted

## Context

O attorneyfw nasce do que o trackfw e o bookfw ja provaram: cadeia de
artefatos com gate que reprova, kanban de estados, contrato declarado antes do
texto, e um mecanismo de Chekhov que cobra o que foi levantado e nao foi pago.

O que nao vinha decidido era a unidade de trabalho. Trabalho juridico tem duas
naturezas que parecem exigir ferramentas diferentes:

- **contencioso** — peca, prazo, prova, pedido, protocolo;
- **consultivo** — minuta, clausula, risco, mitigacao, entrega ao cliente.

E um escritorio nao tem uma so: tem uma carteira com as duas ao mesmo tempo, e
o prazo fatal de uma nao pode ficar invisivel porque a outra e de outro tipo.

Tres desenhos estavam na mesa: um CLI so de contencioso; um so de consultivo;
ou a carteira com os dois. Escolher um dos dois primeiros deixaria metade do
escritorio de fora e obrigaria a um segundo CLI depois, com nucleo duplicado —
que e exatamente o erro que o `bookfw docx` corrigiu ao parar de reconstruir a
selecao que o `build` ja fazia.

## Decision

**A raiz e a carteira; a materia e a pasta; o tipo e um campo.**

```
escritorio.yaml           advogado, OAB, comarca, politica de prazo, feriados
materias/<slug>/materia.yaml    tipo: contencioso | consultivo
```

Os dois tipos compartilham nucleo, kanban (`backlog · pesquisa · minuta ·
revisao · entregue`), canon, briefing, gate e saida. O que muda e uma tabela de
vocabulario em `src/core.mjs`:

| | contencioso | consultivo |
|---|---|---|
| artefato de estrategia | tese (`F1..Fn`, `P1..Pn`) | mapa de risco (`R1..Rn`) |
| unidade do texto | topico | clausula |
| o gate cobra | fato **provado** com **documento** | risco **mitigado** com **fundamento** |

O contrato de topico e o mesmo objeto nos dois: um topico de peticao e uma
clausula de contrato declaram a mesma coisa — o que sustentam, em que se
apoiam, o que a outra parte vai opor e como se responde a isso. Essa
equivalencia e o que torna a unificacao honesta, e nao uma abstracao forcada
para economizar arquivo.

Comandos de materia rodam dentro dela ou com `--materia <slug>`. Nao ha
materia default: agir na materia errada e pior que recusar.

Dois comandos divergem por tipo — `tese` e `mapa` — e cada um recusa a materia
do outro tipo em vez de criar o artefato que ninguem vai ler.

## Consequences

- **Um gate so.** `attorneyfw validate` na raiz percorre a carteira inteira;
  dentro da materia, so ela.
- **`attorneyfw prazo` na raiz e a agenda consolidada** — o unico lugar de onde
  se ve dois prazos fatais no mesmo dia, que era o motivo de a carteira existir.
- **Regra de lint nova:** um tipo com uma chave de vocabulario que o outro nao
  tem reprova o build. Sem isso, a chave faltante vira `undefined` no meio de
  uma mensagem do gate — e mensagem de gate quebrada e gate ignorado.
- **Custo aceito:** mensagens do gate sao montadas a partir do vocabulario, e
  nao sao literais no codigo. Ficam menos legiveis na leitura de `validate.mjs`
  do que estariam se houvesse dois validadores.
- **Terceiro tipo nao esta previsto.** Trabalhista, tributario e criminal
  entram como materia contenciosa; se algum exigir cadeia propria, isso e uma
  ADR nova, nao uma terceira coluna acrescentada em silencio.

## Alternatives Considered

| Opcao | Por que nao |
|---|---|
| Um CLI so de contencioso | Deixa o consultivo de fora do gate e da agenda, e obriga a um segundo CLI com nucleo duplicado. O bookfw ja pagou esse preco com o gerador de DOCX copiado em quatro livros. |
| Um repositorio por materia, como o bookfw faz por obra | Funciona para livro porque o autor escreve um por vez. O advogado tem trinta materias e um so calendario: sem raiz comum, a agenda consolidada nao existe. |
| Um so tipo generico, sem vocabulario | O gate ficaria generico junto — "pendencia levantada e nao paga" nao diz a um advogado o que "fato alegado sem prova" diz. O valor do gate esta em ele falar a lingua de quem le. |
| Banco de dados em vez de arquivos | Arquivo em markdown versionado e o que faz o trabalho ser revisavel por outro advogado e diffavel no git. Vale para os tres CLIs da familia. |
