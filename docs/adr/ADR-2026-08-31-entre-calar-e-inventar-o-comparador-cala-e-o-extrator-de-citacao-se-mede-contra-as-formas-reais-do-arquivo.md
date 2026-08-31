---
status: Accepted
date: 2026-08-31
author: "Lourival Garcia"
---

# ADR: Entre calar e inventar, o comparador cala — e o extrator de citacao se mede contra as formas reais do arquivo

> Date: 2026-08-31 | Status: Accepted

## Context

A 0.6.0 escreveu, no cabecalho de `src/citacao.mjs`, a regra do extrator:

> *"forma que ele nao reconhece nao vira citacao. Silencio, e nao palpite."*

Rodando o extrator contra as nove pecas reais do arquivo do escritorio, **ele
viola a propria regra em dois dos tres defeitos encontrados**:

| Forma na peca | O que o extrator devolve | |
|---|---|---|
| `Art. 1.048, II, do CPC` | `cpc#1` e `cpc#048` | **inventa dois** artigos que nao existem |
| `Lei nº 10.741 de 01 de Outubro de 2003` | `lei-10741-2001` | **inventa** o ano |
| `Lei nº 9.279, de 14 de maio de 1996` | nada | cala |

O terceiro esta na direcao certa e mesmo assim incomoda: e a **forma canonica de
citar lei numa peca**, e aparece 7 vezes nas nove pecas. O extrator nao a
conhece.

Os dois primeiros nao estao na direcao certa, e o do artigo e o pior de todos.
Artigo de quatro digitos e comum e importante — 1.015 (agravo), 1.022 (embargos
de declaracao), 1.048 (prioridade de tramitacao) —, e sao **6 ocorrencias** nas
nove pecas. Cada uma vira duas citacoes falsas. Na quinta conferencia, isso sai
como *"citacao fora do contrato"* de um `art. 048` que nao existe em lugar
nenhum — e aviso falso e o que ensina a ignorar o aviso verdadeiro.

A causa dos tres e a mesma, e vale nomea-la: **o extrator foi medido so contra as
formas que eu tinha em mente ao escreve-lo.** Os testes usam `art. 373 do CPC` e
`Lei 6.830/80`. As pecas usam `Art. 1.048, II, do Código de Processo Civil` e
`Lei nº 9.279, de 14 de maio de 1996`.

Ha um quarto defeito, de outra natureza, encontrado na mesma varredura. O
comparador `item x pedido` apontou *"lista de 1 a 10, falta o 2"* numa anulatoria
fiscal — e a "lista" e a **ementa numerada de um acordao do STJ**, colada na peca.
Na telefonia ele leu um **titulo de secao** como item. Ele e o unico dos seis
comparadores que roda sobre texto que ninguem declarou como lista.

Olhando o codigo, o defeito nao e falta de guarda: a guarda existe — a forma
dominante precisa cobrir 70% dos itens. **Ela esta na ordem errada.** A checagem
de buraco na sequencia roda antes dela, entao qualquer sequencia numerada, prosa
inclusive, produz "falta o item N".

## Decision

**1. A regra do extrator vale para o extrator: entre calar e inventar, ele cala.**

Ela ja estava escrita e nao estava sendo cumprida. Passa a ter teste que a cobra
nas formas reais, e nao so na intencao.

**2. `art. 1.048` e um artigo, e nao dois.**

O separador de milhar deixa de quebrar o numero em dois tokens. E o defeito que
mais custa, porque inventa — e inventa dentro da conferencia que existe para
pegar citacao nao conferida.

**3. Lei citada com data por extenso tem o ano lido da data, e nao do dia.**

`Lei nº 10.741 de 01 de Outubro de 2003` e de 2003. A forma `Lei nº X, de DD de
mes de AAAA` passa a ser reconhecida — inclusive com a virgula, que hoje faz o
casamento falhar inteiro.

**4. O extrator ganha um corpus de formas como teste, tirado das pecas reais.**

Nada de material de cliente entra no repositorio: **numero de lei e de artigo sao
direito publico**, e e so isso que vai. A tabela existe para que a proxima forma
que aparecer no arquivo do escritorio vire teste antes de virar defeito.

**5. A guarda do comparador de itens passa a valer para as tres checagens.**

Sem forma dominante que cubra 70% dos itens, **nenhuma** das tres roda — inclusive
a de buraco na sequencia. Lista de prosa numerada nao e inventario, e nao se
confere contra pedido.

**6. `item x pedido` continua rodando sobre texto nao declarado — e continua
sendo o unico.**

Exigir bloco declarado, como a transcricao faz, mataria o comparador: o defeito
que ele acha — item malformado que chega ao pedido — aparece em **peca
importada**, onde nao ha declaracao nenhuma. O que muda nao e a exigencia de
ancora: e a direcao do erro. Ele passa a calar diante do que nao tem forma de
inventario, em vez de inventar buraco numa ementa.

**7. Nenhuma das correcoes afrouxa nada.**

Todas apertam: menos citacao falsa, menos aviso falso, mais forma reconhecida.
Nenhuma passa a aceitar o que hoje recusa.

## Consequences

**A favor.**

- A quinta conferencia para de produzir aviso falso em artigo de quatro digitos —
  o defeito que mais rapido ensinaria a ignorar a conferencia inteira.
- A forma canonica de citar lei passa a ser reconhecida, e com ela 7 citacoes por
  corpus deste tamanho.
- O comparador de itens para de ler ementa e titulo como lista.
- O extrator passa a ter medida real, e nao a minha intencao sobre como se cita.

**Contra, e aceito.**

- A guarda mais rigorosa vai calar em lista de inventario curta ou heterogenea.
  E a direcao certa do erro, e esta declarada.
- A tabela de formas precisa crescer conforme o arquivo do escritorio cresce.
  Aceito: e a mesma classe de manutencao da tabela de leis e da de custas.

**O que nao muda.**

- Sigla fora da tabela continua nao virando citacao.
- A comparacao continua sendo por artigo, ignorando inciso e paragrafo.
- Nenhuma regra de gate nova, e nenhuma das seis conferencias passa a reprovar o
  que hoje avisa.

## Alternatives considered

**Exigir bloco declarado para `item x pedido`, como a transcricao faz.** Seria a
aplicacao literal da ancora declarada da 0.8.0 — e mataria o unico comparador que
funciona sobre peca importada, que e de onde vieram os tres defeitos que ele ja
achou. Rejeitada, e o motivo fica registrado para nao ser refeito.

**Tratar `art. 1.048` como artigo 1 e ignorar o resto.** Meia correcao: continua
inventando um artigo. Rejeitada.

**Deixar a forma `Lei nº X, de DD de mes de AAAA` sem reconhecer.** Esta na
direcao certa, entao seria defensavel — mas e a forma mais comum no corpus, e um
extrator que ignora a forma mais comum nao esta calando por prudencia, esta
calando por nao ter sido medido. Rejeitada.

**Corrigir os tres sem tabela de formas.** Corrigiria estes tres e deixaria o
quarto para a proxima varredura. A tabela e o que transforma um achado em
regressao coberta.

## Related

- `ADR-2026-08-31-o-texto-do-topico-se-confere-contra-o-proprio-contrato.md`
  — onde a regra do silencio foi escrita, e que estes defeitos violavam.
- `ADR-2026-08-31-a-continuidade-de-fato-se-confere-contra-o-que-foi-declarado-e-nunca-inferindo-que-dois-fatos-sao-o-mesmo.md`
  — a ancora declarada, e por que ela nao se aplica ao `item x pedido`.
- `ADR-2026-08-31-numero-se-confere-contra-si-mesmo-e-contra-o-documento-de-onde-foi-transcrito.md`
  — o comparador de itens, e o defeito real que ele acha e que se quer preservar.
