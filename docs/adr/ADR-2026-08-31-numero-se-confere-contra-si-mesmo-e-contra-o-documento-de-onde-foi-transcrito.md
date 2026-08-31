---
status: Accepted
date: 2026-08-31
author: "Lourival Garcia"
---

# ADR: Numero se confere contra si mesmo e contra o documento de onde foi transcrito

> Date: 2026-08-31 | Status: Accepted

## Context

Tres defeitos numericos apareceram na leitura de oito pecas reais, e nenhum deles
exigiu conhecimento juridico para ser encontrado — exigiu conferencia.

**1. Extenso contra algarismo.** Num alvara judicial: `R$ 7.155,76` mais
`R$ 27,10` dao `R$ 7.182,86`, e a soma da peca esta certa. O extenso na mesma
linha diz *"sete mil cento e oitenta e dois reais e **oitenta** centavos"*. Seis
centavos. O valor e pequeno e o problema nao e o valor: em pedido de alvara, o
montante por extenso costuma prevalecer sobre o algarismo — e o que saiu errado
foi justamente a parte que o cartorio le com atencao.

**2. Item alegado contra item pedido.** Numa declaratoria de inexistencia de
debito, a narrativa alega **76** aparelhos e a lista numerada traz os 76. O item
**72**, porem, esta grafado `98841;1749` — com um ponto-e-virgula no meio dos
digitos —, e reaparece assim **dentro do pedido**.

Este achado tem uma historia que vale mais que ele. Na primeira leitura, feita a
mao, o relatorio dizia que faltava o item 35 e que o pedido trazia um numero
ausente dos fatos. Estava errado: o regex da conferencia manual era estrito
demais e derrubava tanto o item malformado quanto um item terminado por virgula.
**Foi o proprio comparador, ja implementado, que corrigiu a analise humana** — e
depois de ajustado para capturar o valor inteiro e classificar depois, passou a
dizer a verdade: nenhum indice falta, um item esta malformado.

O pedido e o que vira dispositivo da sentenca. Numero malformado ali nao casa com
nenhuma linha da fatura, e a declaracao de inexistencia nao o alcanca — sobra
exatamente a cobranca que se queria derrubar.

**3. Numero dentro das aspas.** Numa anulatoria de debito fiscal, a transcricao
do auto de infracao diz `R$ 344.568,21`; o paragrafo seguinte usa
`R$ 344.568,25`. A soma da propria peca — base, multa e juros — fecha com o `,25`.
Ou seja, **o numero errado esta dentro da citacao direta**, marcada com "(Grifo
nosso)".

Essa e a pior posicao possivel para um erro de digitacao. A peca inteira sustenta
que o Fisco errou; a Fazenda responde exibindo que a autora transcreveu errado o
documento que ela mesma juntou.

O que os tres tem em comum: sao **comparacoes**, nao juizos. E a pessoa atenta
falha justamente neles, porque confia no numero que ja leu uma vez. Maquina nao
le duas vezes — compara.

## Decision

**1. A conferencia numerica roda sobre o markdown que o `build` gerou.**

Nao sobre o kanban, nao sobre os topicos soltos. O texto conferido tem de ser o
texto que sai — a mesma regra que ja impede o `docx` de reconstruir a selecao.
Conferir uma versao e protocolar outra e pior que nao conferir.

**2. Tres verificacoes, e as tres sao mecanicas.**

| Verificacao | O que compara |
|---|---|
| extenso | `R$ 1.234,56 (mil duzentos e trinta e quatro reais e cinquenta e seis centavos)` — os dois lados do parenteses |
| soma | parcelas declaradas contra o total declarado, quando a peca escreve "totalizando" |
| item | lista enumerada nos fatos contra a lista no pedido |

Nenhuma delas interpreta. Todas apontam o par que diverge e param ali.

**3. A verificacao de item e extensao do mecanismo que ja existe.**

O gate ja cobra `fato → prova` e `pedido → topico`. Passa a cobrar
`item alegado → item pedido`. Vale para linha telefonica, nota fiscal, parcela,
matricula, lote — qualquer conjunto que a peca enumera e depois pede.

**4. Transcricao declara de qual documento veio.**

Bloco de transcricao marcado com o id do documento no canon. Os numeros dentro
dele sao conferidos contra os numeros que a ficha daquele documento registra.
Numero transcrito que a ficha nao conhece vira aviso — nao violacao, porque a
ficha pode simplesmente nao registrar aquele valor ainda.

**5. Divergencia e sempre reportada como par, com os dois lados a vista.**

Nunca "valor incorreto". Sempre "aqui diz X, ali diz Y". A ferramenta nao sabe
qual dos dois esta certo, e fingir que sabe faria o advogado corrigir o lado
errado.

**6. Nao se corrige nada automaticamente.**

Nem o extenso a partir do algarismo, nem o contrario. Escolher qual lado
prevalece e decisao de quem assina, e nas tres pecas o lado certo foi diferente.

## Consequences

**A favor.**

- Tres classes de defeito real deixam de depender de leitura atenta.
- A verificacao de item protege o pedido, que e a parte da peca em que errar
  custa o resultado inteiro.
- Reportar como par mantem a ferramenta no lugar dela: aponta, nao decide.
- Custo marginal baixo: roda sobre texto ja gerado, sem estrutura nova.

**Contra, e aceito.**

- Falso positivo em extenso e certo. Portugues escreve valor de muitos jeitos, e
  o comparador nao cobre todos. Por isso e aviso, e por isso mostra os dois lados
  — o advogado descarta em um segundo.
- A verificacao de soma so funciona quando a peca declara o total. Nao ha
  inferencia de qual conta se pretendia fazer.
- Numero dentro de imagem nao e conferido. A peca de fraude tem prova em
  captura de tela, e isso fica fora — declarado, nao escondido.

## Alternatives considered

**Corretor gramatical.** Ha erros de concordancia e digitacao em quase todas as
oito pecas. Rejeitado: o Word ja pega, e construir seria gastar a ferramenta na
unica camada em que ela nao tem vantagem nenhuma.

**Corrigir o extenso automaticamente.** Tentador e errado: nas tres pecas o lado
certo foi diferente, e num alvara o extenso e o que prevalece. Rejeitada.

## Related

- `ADR-2026-08-31-numero-gerado-sai-com-procedencia-serie-e-tabela-em-arquivo-versionado-memoria-obrigatoria.md`
  — a disciplina de procedencia para numero **gerado**; aqui, para numero
  **escrito**.
- `ADR-2026-08-31-visual-law-deriva-do-canon-e-da-cronologia-nunca-de-texto-livre.md`
  — a mesma regra de nao reconstruir o que o `build` ja produziu.
