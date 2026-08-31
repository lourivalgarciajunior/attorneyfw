---
status: Accepted
date: 2026-08-31
author: "Lourival Garcia"
---

# ADR: O gate cobra o que a peca anuncia sobre si mesma

> Date: 2026-08-31 | Status: Accepted

## Context

Duas coisas apareceram na leitura de oito pecas reais que nao sao erro de direito
nem erro de conta. Sao **promessas que a peca faz sobre si mesma e nao cumpre** —
e as duas passam despercebidas porque quem le sabe do que se trata e completa
sozinho.

**1. O titulo promete um pedido que a peca nao formula.** Numa anulatoria de
debito fiscal, o titulo e *"Acao anulatoria de debito fiscal c/c pedido de tutela
provisoria de urgencia"*, o art. 300 do CPC aparece no paragrafo de qualificacao
— e **o pedido de tutela nao e formulado**. O `c/c` do titulo e o que o juizo le
para saber o que decidir de imediato.

Isto e a mesma remissao vazia que o gate ja persegue no corpo — *"conforme
adiante transcrito"* sem transcricao —, so que no lugar mais visivel da peca.

**2. A prioridade anunciada nao bate com a idade declarada.** Num alvara, o
cabecalho diz *"Prioridade de tramitacao autores com 64 anos de idade"* e cita o
art. 71 do Estatuto do Idoso. Entre os cinco requerentes qualificados logo
abaixo, **o mais velho tem 69**, e ha tres com mais de 60. O numero escolhido nao
e o do mais velho nem o do limite legal — e um numero solto.

Nenhuma das duas exige conhecimento juridico para ser encontrada. Exige comparar
o que a peca diz de si com o que ela contem, e essa e a mesma familia da
conferencia numerica: **comparacao, e nao juizo**.

Ha um limite que precisa ficar claro. O gate pode conferir que o titulo anuncia
`c/c X` e o pedido nao menciona X. Nao pode conferir se X era **cabivel** — isso
e leitura, e fica com o agente de fundamento. A regra vale exatamente ate onde a
comparacao alcanca.

## Decision

**1. O que o titulo anuncia com `c/c`, o pedido tem de mencionar.**

Aviso, e nao violacao: ha caso legitimo em que o cumulo se resolve num topico e
nao ganha alinea propria no pedido. Mas a divergencia nao pode ficar invisivel,
que e o estado de hoje.

**2. A ficha de parte ganha `nascimento:`, e a idade deixa de ser digitada.**

Idade escrita a mao envelhece no dia seguinte e nao se confere contra nada. Com a
data, a idade e derivada — e conferivel.

**3. Peca com parte de 60 anos ou mais, ou com menor, e sem pedido de
prioridade, recebe aviso.**

Aviso porque prioridade se requer, e nao se impoe: ha razao para nao pedir. O que
nao pode e deixar de pedir por nao ter percebido.

**4. Prioridade anunciada com idade que nao bate com a ficha vira aviso, com os
dois lados a vista.**

Como toda divergencia nesta ferramenta: "o cabecalho diz 64, a parte mais velha
tem 69". Nao se corrige, e nao se escolhe qual esta certo.

**5. A regra vale ate onde a comparacao alcanca, e a mensagem diz isso.**

O gate nao afirma que a tutela era cabivel, nem que a prioridade e devida. Diz
que a peca anuncia e nao cumpre. Estender alem disso seria o gate opinando sobre
merito.

**6. Sem `nascimento:`, a regra da idade simplesmente nao roda.**

Nao ha aviso de "faltou data de nascimento". Ficha antiga continua valendo, e
campo que a materia nao precisa nao vira cobranca.

## Consequences

**A favor.**

- Duas classes de defeito real, encontradas em duas das oito pecas, deixam de
  depender de leitura atenta.
- A idade passa a ser derivada, e nao digitada — deixa de envelhecer.
- Ambas usam o mecanismo que ja existe: comparar o declarado com o contido.
- A prioridade e a que mais custa quando passa: ela vale para o processo inteiro
  e nao se recupera depois.

**Contra, e aceito.**

- `c/c` no titulo tem forma livre. O aviso vai errar quando o cumulo estiver
  escrito de um jeito que a regra nao reconhece — e vai calar, que e a direcao
  certa do erro.
- Data de nascimento e dado pessoal a mais na ficha. Aceito: ela ja tem CPF, e a
  varredura de dados e a anonimizacao cobrem a ficha como cobrem a peca.
- Nem toda parte idosa quer prioridade. Por isso e aviso.

## Alternatives considered

**Reprovar quando o titulo promete e o pedido nao entrega.** Transformaria em
impedimento uma divergencia que tem caso legitimo. Rejeitada; o gate ja tem a
disciplina de reprovar so o que nao tem excecao — e por isso o que ele reprova e
levado a serio.

**Calcular a idade a partir do CPF.** Nao da: o CPF nao carrega data de
nascimento. Descartada por impossibilidade, e registrada aqui para nao ser
tentada de novo.

## Related

- `ADR-2026-08-31-numero-se-confere-contra-si-mesmo-e-contra-o-documento-de-onde-foi-transcrito.md`
  — a mesma familia: comparacao, e nao juizo; par a vista, e nada corrigido.
- `ADR-2026-08-31-o-canon-sobe-para-a-carteira-parte-recorrente-tem-uma-qualificacao-so.md`
  — a ficha que passa a carregar `nascimento:`.
