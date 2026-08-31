---
status: Accepted
date: 2026-08-31
author: "Lourival Garcia"
---

# ADR: O texto do topico se confere contra o proprio contrato

> Date: 2026-08-31 | Status: Accepted

## Context

O contrato de topico existe desde a 0.1.0 e o gate o cobra desde entao. Mas o
que ele cobra e que os **campos estejam preenchidos** — que `sustenta`,
`fundamento` e `risco` nao estejam em branco, que o documento citado exista no
canon, que o pedido exista na tese.

Nenhuma regra olha para o **texto** que fica logo abaixo do contrato.

A consequencia e direta: um topico pode declarar `fundamento: [art. 300 do CPC]`
e escrever tres paragrafos que citam o art. 373, II, e a Sumula 7 do STJ, e a
peca passa no gate inteira. A lista branca de fundamento esta escrita, esta
parseada, e **ninguem a compara contra nada**.

Isto importa por um motivo que nao e de estilo. A citacao que entra na peca sem
passar pelo contrato e exatamente a citacao que ninguem conferiu: ela nao passou
pelo agente de fundamento, nao foi distinguida, nao foi checada quanto a
vigencia. Nas oito pecas reais lidas em 2026-08-31, tres tinham erro de
fundamento — Lei 9.610/98 numa acao de marca, arts. 303 e 304 do CPC numa peca
que nao era antecedente, art. 38 da LEF sem a Sumula Vinculante 28. Os tres sao
dispositivos que entraram no texto sem contrato.

O mecanismo ja existe e ja esta provado nesta ferramenta: **comparar o que a
peca declara sobre si mesma com o que ela contem**. E o que o `conferir` faz com
numero, e o que o gate faz com titulo e pedido. O contrato de topico e a unica
declaracao da peca que ainda nao e conferida contra o corpo.

Ha um limite que precisa ficar escrito antes da decisao, porque e a fronteira
que separa esta regra de opiniao automatizada. A comparacao alcanca **duas
listas de citacoes**. Ela nao alcanca:

- se o dispositivo existe;
- se esta em vigor;
- se foi revogado, superado ou distinguido;
- se sustenta o que o paragrafo afirma que ele sustenta.

Essas quatro sao leitura, e ficam com o agente de fundamento. Uma ferramenta que
dissesse "art. 373, II, nao sustenta isso" estaria opinando sobre merito com
cara de gate — e um gate em que se pode discordar e um gate que se aprende a
ignorar.

## Decision

**1. Nasce a quinta conferencia: texto x contrato do topico.**

Ao lado de extenso x algarismo, soma x total, item x pedido e transcricao x
ficha. Mesma familia, mesmo mecanismo: comparacao, e nao juizo.

**2. Citacao no texto que nao esta em `fundamento:` sai como par — aviso.**

`o texto cita art. 373, II, do CPC` / `o fundamento declara art. 300 do CPC`.

Aviso, e nao violacao, porque ha caso legitimo: citar o dispositivo da parte
contraria para refuta-lo, invocar o artigo do proprio ato processual, remeter a
lei em passagem que nao e fundamento do topico. O gate desta ferramenta so
reprova o que nao tem excecao — e por isso o que ele reprova e levado a serio.

**3. Fundamento declarado que nao aparece no texto sai como par — aviso.**

O inverso, e vale o mesmo raciocinio: o contrato prometeu um apoio que a prosa
nao invocou. Pode ser parafrase deliberada; pode ser o fundamento que se
esqueceu de usar. A ferramenta nao sabe qual, e mostra os dois lados.

**4. Documento declarado em `documentos:` e nunca mencionado no texto sai como
par — aviso.**

Mesmo Chekhov que o gate ja aplica a fato controvertido, agora no nivel do
topico.

**5. Topico com contrato e sem texto e erro, em `revisao` e `entregue`.**

Esta e a unica das cinco sem excecao. Contrato preenchido com prosa vazia e uma
promessa com nada atras dela, e o gate hoje so conta palavras da entrega
inteira — um topico vazio se esconde atras de outro bem escrito. Em `backlog` e
`pesquisa` nao roda: la o contrato esta sendo levantado, de proposito.

**6. A comparacao e por artigo, ignorando inciso, paragrafo e alinea.**

`art. 373, II` e `art. 373` sao o mesmo fundamento para efeito de contrato.
Distinguir incisos multiplicaria o aviso por cada refinamento de escrita, e
aviso que dispara sempre e aviso que ninguem le.

**7. Citacao que o extrator nao reconhece nao vira aviso nenhum.**

Silencio, e nao palpite — a mesma regra do extenso, que devolve `null` quando
encontra palavra que nao conhece. Um fundamento "conferido" errado e pior que um
fundamento nao conferido.

**8. O relatorio termina dizendo o que ele NAO conferiu.**

Que nao verificou existencia, vigencia, superacao nem pertinencia do
dispositivo. A mesma disciplina do `importar`, e pela mesma razao: relatorio que
so lista o que achou e lido como se tivesse achado tudo.

**9. A quinta conferencia roda sobre a bancada, e nao sobre o papel.**

As outras quatro rodam sobre o markdown que o `build` gerou. Esta nao pode: o
`build` **remove o contrato** do texto que sai, de proposito. Entao ela le a
entrega na origem, onde contrato e prosa ainda estao lado a lado — e por isso
ela tambem vive no gate, que e onde a bancada e percorrida.

## Consequences

**A favor.**

- A lista branca de fundamento passa a valer alguma coisa. Ate hoje ela era um
  campo obrigatorio que ninguem lia depois de preencher.
- A porta por onde entra citacao nao conferida fica com uma campainha. Nao com
  uma tranca — mas hoje nao tem nem campainha.
- Topico vazio deixa de se esconder atras da contagem de palavras da entrega.
- Usa mecanismo provado: duas listas, um par a vista, nada corrigido.

**Contra, e aceito.**

- O extrator de citacao vai calar em forma que ele nao reconhece. Direcao certa
  do erro, e declarada no relatorio.
- Quatro dos cinco achados sao aviso. Quem quiser ignorar, ignora — e essa e a
  escolha certa enquanto a excecao legitima existir.
- Tabela de apelidos de lei (`CPC`, `CC`, `CF`, `CLT`, `CTN`, `CDC`, `LEF`) e
  manutencao permanente. Aceito: e a mesma classe de dado das tabelas de custas.

## Alternatives considered

**Reprovar a citacao fora do contrato.** Transformaria em impedimento algo com
excecao legitima diaria — a peca cita o dispositivo da outra parte o tempo todo.
Rejeitada.

**Conferir se o dispositivo sustenta o que o paragrafo afirma.** E o que o
advogado quer, e nao e comparacao: e leitura. Fica com o agente de fundamento, e
esta registrada aqui para nao ser tentada como regra de gate.

**Rodar a quinta conferencia sobre o markdown do `build`.** Nao da: o contrato e
removido de proposito antes de a peca sair. Descartada por impossibilidade, e
anotada para nao ser tentada de novo.

**Comparar inciso a inciso.** Precisao que ninguem pediu, ao custo de um aviso
em quase todo topico. Rejeitada.

## Related

- `ADR-2026-08-31-o-gate-cobra-o-que-a-peca-anuncia-sobre-si-mesma.md` — a mesma
  familia, no nivel do titulo e do pedido; esta desce ao nivel do topico.
- `ADR-2026-08-31-numero-se-confere-contra-si-mesmo-e-contra-o-documento-de-onde-foi-transcrito.md`
  — as quatro primeiras conferencias, e a regra do par a vista.
- `ADR-2026-08-31-carteira-de-materias-com-dois-tipos-sob-a-mesma-cadeia-e-um-so-nucleo.md`
  — clausula de contrato tem contrato de topico igual, e a regra vale nos dois.
