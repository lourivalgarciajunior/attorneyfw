---
status: Accepted
date: 2026-08-31
author: "Lourival Garcia"
---

# ADR: A continuidade de fato se confere contra o que foi declarado, e nunca inferindo que dois fatos sao o mesmo

> Date: 2026-08-31 | Status: Accepted

## Context

O template da cronologia, criado na 0.1.0 e escrito pela propria ferramenta em
toda materia nova, diz isto:

> *"E daqui que sai a narrativa da peca, e e contra isto que se confere se a data
> citada no topico 4 bate com a do topico 9."*

**Nada confere.** A frase esta no arquivo desde o primeiro dia, e nenhuma linha
de codigo a cumpre. O `conferir` compara numeros dentro da peca — extenso, soma,
item, transcricao — e, desde a 0.6.0, o texto do topico contra o contrato dele.
Nenhuma das cinco olha para **fato**.

O cabecalho do `src/canon.mjs` nomeia o mesmo buraco pelo outro lado:

> *"a peca 7 esquece o que a peca 2 afirmou — nome grafado de outro jeito, valor
> que mudou, data que nao bate com a cronologia. A contraparte le as duas."*

O canon foi construido exatamente para isso. Ele guarda a grafia canonica de cada
parte, os apelidos, os documentos com id e ficha, e a cronologia com uma linha por
fato datado. Tudo declarado, tudo legivel por maquina — o `diagrama` ja le a
tabela da cronologia para desenhar a linha do tempo. **O dado esta pronto e a
comparacao nao existe.**

E ha uma razao para ela nunca ter sido feita, que precisa ser enfrentada de frente
antes de qualquer decisao: **continuidade parece exigir entender o texto.** Dizer
que "o topico 4 fala do mesmo evento do topico 9" e leitura. Se a regra precisar
disso, ela nao pertence a esta ferramenta — pertence ao agente de fato e prova,
que le.

Entao a pergunta que decide o ADR nao e *"como conferir continuidade"*. E: **o que
em continuidade e comparacao?**

A resposta e que so e comparavel o que tem **ancora declarada**. A cronologia
declara as datas dos fatos. O contrato de topico declara os documentos. O canon
declara a grafia de cada nome. Contra essas tres ancoras, comparar e mecanico.
Fora delas, e opiniao.

## Decision

**1. Nasce a sexta conferencia: continuidade de fato, sempre contra uma ancora
declarada.**

Ao lado das cinco existentes, no mesmo `conferir` e no mesmo gate. Mesma familia:
comparacao, par a vista, nada corrigido.

**2. Data no texto que a cronologia nao registra sai como par.**

A ancora e a cronologia. E o cumprimento literal da promessa que o template faz
desde a 0.1.0.

**3. Datas divergentes entre topicos que declaram o mesmo documento saem como
par, com os dois topicos nomeados.**

A ancora e o documento declarado em `documentos:`. Se a ficha dele tambem declara
`data:`, a comparacao inclui a ficha. E a unica comparacao verdadeiramente **entre
topicos** — e ela so existe porque os dois lados apontaram para o mesmo `D3`.

**4. Grafia divergente de um nome do canon sai como par.**

A ancora e o nome canonico e seus apelidos. Diferenca **so de caixa nao conta**: a
qualificacao em caixa alta e forma normal de peca, e reclamar dela seria ruido em
toda peca do mundo. O que se aponta e acento perdido e grafia derivada.

**5. A ferramenta nunca infere que dois fatos sao o mesmo fato.**

Sem ancora declarada, ela **cala**. Nao ha heuristica de proximidade, nao ha "o
marco mais parecido", nao ha juizo sobre qual evento o paragrafo descreve. Esta e
a linha que separa esta regra de opiniao automatizada, e ela nao se move.

**6. Nada dentro de bloco de transcricao e conferido aqui.**

O que esta entre aspas e do documento, e a ferramenta ja decidiu que transcricao
nao se corrige. Data ali dentro que diverge da cronologia e **dado**, e nao
defeito — e apontar seria pedir que se falsificasse a citacao.

**7. Data processual nao entra.**

Intimacao, prazo e vencimento sao do `attorneyfw prazo`, que tem ressalva propria
dizendo que a contagem e conferencia, e nao a oficial. Misturar as duas colocaria
uma data com ressalva dentro de um relatorio que nao a repete.

**8. Ano solto nao e data.**

`Lei 8.078, de 1990` nao vira marco de cronologia. So data completa — `12/03/2024`
ou `12 de marco de 2024`.

**9. Todas as tres sao aviso. Nenhuma reprova.**

Ao contrario da quinta conferencia, aqui **nao ha nenhuma comparacao sem excecao
legitima**: data de lei citada de passagem, nome social de parte, documento com
duas datas (emissao e vencimento). O gate desta ferramenta so reprova o que nao
tem excecao — e por isso o que ele reprova e levado a serio.

**10. Cronologia vazia desliga a comparacao 2, e isso sai dito.**

Uma linha no relatorio: a peca cita N datas e a cronologia esta vazia, entao nada
foi conferido contra ela. **Nao e cobranca** — e a mesma disciplina do `importar`,
que sempre termina dizendo o que nao extraiu. Relatorio silencioso sobre o que nao
olhou e lido como se tivesse olhado tudo.

## Consequences

**A favor.**

- Uma promessa que a ferramenta escrevia em toda materia nova passa a ser
  cumprida. Ate hoje o template mentia por omissao.
- O canon passa a servir a peca, e nao so ao diagrama. Ele foi construido para
  isto e ainda nao tinha sido usado para isto.
- A comparacao entre topicos existe sem que a ferramenta entenda uma frase — o
  documento declarado faz o trabalho que a leitura faria.
- Nenhum modulo novo, nenhum campo novo de contrato, nenhuma dependencia.

**Contra, e aceito.**

- Data de lei e data de julgado citadas em prosa vao aparecer como "fora da
  cronologia". E ruido conhecido; o par a vista deixa obvio o que e, e o custo de
  filtrar por heuristica seria calar tambem o defeito real.
- As tres sao aviso, entao quem quiser ignorar ignora. E a escolha certa enquanto
  a excecao legitima existir.
- Grafia divergente so pega nome que ja esta no canon. Parte fora do canon nao e
  conferida — e o gate ja cobra parte no canon por outro caminho.

## Alternatives considered

**Casar a data do texto com o marco mais proximo da cronologia e apontar a
diferenca.** Seria o achado que o advogado mais quer — "o topico diz 12/03 e o
fato e 13/03". E exige decidir que os dois falam do mesmo evento, que e leitura.
Rejeitada, e registrada aqui para nao ser tentada como heuristica de proximidade.

**Reprovar data fora da cronologia.** Transformaria em impedimento algo com
excecao diaria — a peca cita data de lei o tempo todo. Rejeitada.

**Conferir tambem valores entre topicos.** Fora de bloco de transcricao, um valor
citado num topico pode vir de qualquer lugar, e nao ha ancora declarada. Ficaria
sem a propriedade que sustenta as outras tres. Rejeitada.

**Modulo novo `src/continuidade.mjs`.** Nasceria orfao ate ser ligado, e a regra
`modulo-orfao` do lint reprova — a armadilha que reorganizou o roadmap da 0.6.0 no
meio da execucao. Ela e um comparador, e vai morar com os comparadores.

## Related

- `ADR-2026-08-31-numero-se-confere-contra-si-mesmo-e-contra-o-documento-de-onde-foi-transcrito.md`
  — as quatro primeiras, e a regra do par a vista.
- `ADR-2026-08-31-o-texto-do-topico-se-confere-contra-o-proprio-contrato.md`
  — a quinta, e a mesma fronteira: a comparacao vale ate onde a declaracao alcanca.
- `ADR-2026-08-31-visual-law-deriva-do-canon-e-da-cronologia-nunca-de-texto-livre.md`
  — o outro consumidor da tabela da cronologia, que ja provou que ela e legivel.
