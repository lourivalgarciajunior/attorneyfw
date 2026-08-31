---
status: Accepted
date: 2026-08-31
author: "Lourival Garcia"
---

# ADR: A carteira e a memoria institucional — resultado no encerramento e busca transversal

> Date: 2026-08-31 | Status: Accepted

## Context

O pedido, na formulacao do escritorio:

> *"manter uma base de dados com os casos do proprio escritorio (casos ja
> concluidos, vencidos ou nao) para que meu advogado funcionario tenha acesso a
> uma memoria de casos passados. Nao faz sentido eu atuar em um mesmo caso se eu
> ja perdi; caso a demanda se repita posso fazer um acordo. E tambem, a memoria
> de casos interna ajuda a nao ficar tudo na cabeca dos socios, ou de advogados
> empregados, que podem sair do emprego e levar a experiencia com eles."*

A carteira **ja e** essa base. Uma pasta por materia, com DEC, tese ou mapa de
risco, fatos numerados, canon de partes e documentos, cronologia e kanban de
entregas — tudo em markdown, versionado. A experiencia esta no disco desde a
0.1.0. Faltam duas coisas para que ela seja consultavel, e as duas sao pequenas.

**A primeira e o resultado.** A materia hoje termina com a ultima entrega em
`entregue`. Isso registra que a peca saiu, nao o que aconteceu depois. Sem o
desfecho, a base responde "ja fizemos" e nao responde "ja perdemos" — que e a
pergunta do pedido.

**A segunda e a busca.** Ha grep, e grep basta para achar uma palavra. Nao basta
para a pergunta real, que e *"que materias enfrentaram esta tese, e como
terminaram?"*. Essa pergunta cruza tese, fundamento e resultado, e ninguem a faz
com tres greps encadeados no meio de um dia de trabalho.

Ha um risco de desenho a evitar. Registrar resultado convida a modelar processo
judicial — instancias, recursos, sucumbencia, transito em julgado. Esse caminho
transforma a ferramenta num sistema de acompanhamento processual, que ja existe
no mercado, e o escritorio nao pediu isso.

## Decision

**1. O resultado e um estado da materia, nao da entrega.**

Campo `resultado` no `materia.yaml`, com valor fechado — `ganho`, `ganho_parcial`,
`perda`, `acordo`, `extinto` ou vazio enquanto corre. Ao lado dele:
`resultado_em` (data), `resultado_valor` (o obtido, quando ha), e
`resultado_nota` (uma linha de por que).

Fechado por design: campo livre nao agrega, e o valor da base esta em conseguir
contar quantas perdas houve numa tese.

**2. O valor pedido tambem e registrado, e nao se infere.**

`valor_pedido` entra na abertura da materia. Sem ele, o relatorio ao cliente
(item 11) teria de deduzir o pedido da peca, e deduzir e adivinhar.

**3. A busca transversal e um comando proprio, e devolve materia, nao linha.**

`attorneyfw buscar <termo>` varre a carteira inteira e devolve **materias**, com
tipo, estado, resultado e o trecho que casou. Uma linha solta nao responde a
pergunta; a materia responde.

**4. O que a busca varre e declarado, e nao e o disco inteiro.**

Tese e mapa de risco (incluindo fundamento e escopo negativo), DEC, e os titulos
das entregas. Nao varre o corpo das minutas. Motivo: minuta contem texto de
citacao e transcricao, e busca por termo juridico casaria com o que foi citado
em vez do que foi sustentado — ruido que treina a ignorar o resultado.

**5. Nao se modela processo judicial.**

Sem instancias, sem recursos, sem cadeia de sucumbencia, sem prazo de transito.
A materia tem um desfecho, uma data e um valor. Quem precisa de acompanhamento
processual usa o sistema do tribunal, que e a fonte.

**6. O `context` da carteira passa a incluir o resultado das materias fechadas.**

E o que faz a memoria chegar a quem esta trabalhando sem precisar procurar —
mesma logica do hook que poe a agenda de prazos na sessao.

## Consequences

**A favor.**

- A pergunta "ja perdemos essa antes?" passa a ter resposta em segundos, e o
  argumento para acordo em vez de repeticao fica documentado.
- A experiencia deixa de sair pela porta com quem sai do escritorio, que era o
  problema declarado.
- O relatorio ao cliente (item 11) fica trivial: pedido, obtido e corrigido ja
  estao todos registrados.
- Vocabulario fechado permite contar. Contar permite, mais tarde, o prognostico
  por semaforo, com base propria em vez de estatistica de terceiro.

**Contra, e aceito.**

- Alguem tem de lembrar de registrar o resultado. Mitigado: o `validate` avisa
  quando uma materia tem todas as entregas em `entregue` ha mais de noventa dias
  e nenhum resultado — aviso, nao violacao, porque nem todo desfecho chega nesse
  prazo.
- Vocabulario fechado nao cabe em tudo. `ganho_parcial` com nota cobre o meio
  termo; o que nao couber vira materia mal classificada, e isso e visivel.
- A base so vale depois de acumular. Nos primeiros meses o comando devolve
  pouco, e isso e esperado.

## Alternatives considered

**Banco de dados em vez de arquivos.** Traria consulta melhor e tiraria a base
do versionamento, do diff e do backup que o escritorio ja faz. Rejeitada: o
formato em texto e o que garante que a memoria sobreviva a ferramenta.

**Resultado como campo livre.** Mais expressivo, incontavel. Rejeitada — a nota
livre existe ao lado do campo fechado, que e o arranjo que preserva os dois.

## Related

- `ADR-2026-08-31-carteira-de-materias-com-dois-tipos-sob-a-mesma-cadeia-e-um-so-nucleo.md`
  — a carteira que esta decisao completa.
- `ADR-2026-08-31-prognostico-e-semaforo-com-premissas-a-vista-e-jurisprudencia-e-amostra-conferida.md`
  — o uso futuro dos resultados acumulados aqui.
