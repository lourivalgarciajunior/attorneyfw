---
status: Accepted
date: 2026-08-31
author: "Lourival Garcia"
---

# ADR: O briefing carrega a voz e a lista do tipo de acao como observacao, nunca como instrucao

> Date: 2026-08-31 | Status: Accepted

## Context

A 0.4.0 destilou o **modelo por tipo de acao** do arquivo do escritorio. A 0.5.0
derivou o **style card** das pecas dele. As duas foram construidas, testadas,
documentadas — e **nenhuma das duas e lida na hora de escrever**.

O `attorneyfw brief` monta o pacote que vai para quem redige: contrato invariavel
da materia, contrato do topico, pendencias, documentos citados, partes,
cronologia, andamento, cauda do texto anterior e a estrategia em vigor. Nao le
`estilo.yaml`, que esta na raiz da carteira, nem `docs/checklist-<tipo>.md`, que
esta dentro da propria materia.

O efeito e o que o ADR do style card ja tinha nomeado como o problema a resolver:
**o `adv-gaio` redige com a voz que o modelo tem.** A ferramenta mediu a voz do
escritorio e guardou o resultado num arquivo que ninguem abre no momento em que
ele serviria. O mesmo vale para a lista: o escritorio sabe que documento juntou,
que fundamento sustentou o pedido e que objecao apareceu naquele tipo de acao — e
quem escreve nao ve nada disso.

Ha um risco que decide a forma desta decisao, e nao e pequeno.

**O briefing termina numa secao chamada `## Instrucoes`.** Um card que diz
`traco: usa "vejamos" — em 6/8` colocado dentro de um pacote de instrucoes deixa
de ser descricao no instante em que e lido. Quem redige — pessoa ou modelo —
tratara a frequencia como norma, e o resultado e uma peca que imita tique em vez
de escrever com a voz da casa. Seria transformar em prescricao exatamente o
arquivo que a 0.5.0 decidiu que **descreve, e nao prescreve**.

O mesmo perigo, em outra chave, vale para o checklist: ele nasce com todos os
itens em `- [ ]` e o cabecalho diz, em negrito, que sao **pendencias, e nao
verdades**. Despejado num briefing, vira lista de coisas para afirmar.

## Decision

**1. As duas entram, e nenhuma das duas entra em `## Instrucoes`.**

Secoes proprias, antes das instrucoes, rotuladas como observacao. A secao de
instrucoes recebe apenas as linhas que dizem o que **nao** fazer com elas.

**2. O card entra com o `n` em cada linha, e so acima de um piso.**

So sai traco presente em **mais da metade** das pecas medidas, e so quando a
amostra tem **tres ou mais**. Abaixo disso o briefing nao traz traco nenhum e diz
que a amostra e pequena demais para descrever voz.

Traco visto em 2 de 8 e ruido. Carregado para todo briefing, ruido vira estilo da
casa em duas semanas — e ninguem lembra que era ruido.

**3. Enfase em caixa alta fica de fora, por decisao.**

E o unico traco medido que se imita em excesso sem esforco, e excesso de caixa
alta e defeito de peca, nao voz de escritorio. Fica registrado aqui para nao ser
acrescentado depois como "faltava".

**4. Ritmo entra: mediana de palavras por paragrafo.**

E medicao pura, dificil de imitar em excesso, e e o traco que mais separa a prosa
de um escritorio da prosa de um modelo.

**5. O rotulo das partes sai da materia primeiro, e do card so na falta dela.**

Se os topicos ja escritos desta entrega usam um par, o briefing diz **esse**. O
gate cobra consistencia dentro da peca, e nao a escolha do par — entao o dado que
importa e o que a peca ja fez, nao o que o escritorio costuma fazer. Sem texto
anterior, entra o par dominante do card, com o `n`.

**6. O checklist entra filtrado ao que falta, e nao repetido inteiro.**

Somente itens ainda abertos (`- [ ]`), e somente os que **nao** estao no contrato
do topico nem no canon da materia:

- fundamento que o escritorio costuma invocar neste tipo e que este topico nao
  declara;
- objecao que ja apareceu neste tipo e que o topico nao previu no `risco`;
- documento que o escritorio costuma juntar e que nao esta no canon.

Repetir o que ja esta no contrato duas secoes acima e ruido; o que serve e a
diferenca. E diferenca e comparacao, que e o que esta ferramenta sabe fazer.

**7. Item de checklist nunca vira afirmacao, e a instrucao diz isso.**

`Nao afirme item da lista. Se ele importa para este topico e nao esta provado,
escreva a pendencia.` E a mesma disciplina do `modelo aplicar`, agora no ponto em
que alguem poderia esquece-la.

**8. Card ausente e checklist ausente nao viram cobranca.**

A secao simplesmente nao aparece, e uma linha diz que a voz do escritorio nao foi
derivada — a peca vai sair com a voz do modelo. Materia que nao precisa de
checklist nao ganha demanda por nao ter um.

**9. Nenhuma regra de gate nova.**

O card continua habilitando **uma** regra, a de rotulos misturados. Estender o
gate para aderencia a voz seria corrigir o advogado pela frequencia, que e o que
a 0.5.0 recusou.

## Consequences

**A favor.**

- Dois artefatos construidos e nao lidos passam a chegar onde serviriam.
- A voz do escritorio entra no unico ponto em que muda o texto, sem virar regra
  em ponto nenhum.
- O checklist chega como **diferenca** — o que falta —, que e a forma em que uma
  lista e lida em vez de ignorada.
- Nada disso cria arquivo novo, campo novo nem dependencia nova.

**Contra, e aceito.**

- O briefing cresce. Aceito: as duas secoes sao curtas por construcao, e a do
  checklist encolhe conforme o contrato do topico fica completo.
- O piso do traco vai calar em escritorio com poucas pecas importadas. E a
  direcao certa do erro, e a linha que sai explica por que calou.
- Quem redige pode imitar o traco mesmo com o `n` a vista. Nao ha como impedir, e
  fingir que ha seria pior; o que se pode e nao dar ordem, e nao dar.

## Alternatives considered

**Colocar o card dentro de `## Instrucoes`.** Mais acionavel, e e exatamente a
conversao de descricao em prescricao que a 0.5.0 recusou. Rejeitada.

**Levar o checklist inteiro para o briefing.** Repete o que ja esta no contrato e
no canon logo acima, e lista repetida e lista pulada. Rejeitada em favor da
diferenca.

**Gate de aderencia a voz.** Corrigir o advogado pela frequencia de oito pecas e
a mesma familia da porcentagem de exito. Registrada aqui para nao ser tentada.

**Sem piso, trazendo todo traco medido com o `n`.** O `n` a vista nao desfaz o
efeito de repetir um ruido em todo briefing. Rejeitada.

## Related

- `ADR-2026-08-31-o-style-card-descreve-o-escritorio-e-nao-prescreve-o-certo.md`
  — a decisao que esta aqui respeita, e que quase se perde ao levar o card para
  dentro de um pacote de instrucoes.
- `ADR-2026-08-31-modelo-por-tipo-de-acao-sai-do-arquivo-do-escritorio-nunca-de-conhecimento-generico.md`
  — a lista que entra, e a razao de ela ser pendencia e nao verdade.
- `ADR-2026-08-31-o-texto-do-topico-se-confere-contra-o-proprio-contrato.md`
  — o outro lado do mesmo laco: aquele confere o que foi escrito, este alimenta o
  que vai ser.
