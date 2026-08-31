---
status: Accepted
date: 2026-08-31
author: "Lourival Garcia"
---

# ADR: Prognostico e semaforo com premissas a vista, e jurisprudencia e amostra conferida

> Date: 2026-08-31 | Status: Accepted

## Context

Dois pedidos do escritorio, que so fazem sentido juntos:

> *"Analise jurisprudencial dos 50 casos mais recentes (com indicador, ex: 80%
> dos ultimos 50 casos no TJPR foram favoraveis)"*
>
> *"Um indicador que leve em consideracao os 3 acima demonstrando a
> possibilidade de exito (no direito, mais importante que ganhar e nao perder)"*

A pergunta por tras e legitima e frequente: o cliente quer saber se vale a pena.
A forma pedida e que produz um artefato pior do que a pergunta merece.

**Sobre os cinquenta casos, ha um obstaculo de acesso e um de metodo.**

O de acesso: os tribunais estaduais nao oferecem consulta programavel de inteiro
teor, e o buscador do TJPR tem captcha — que este projeto nao contorna, por
decisao e por politica. A base publica do CNJ, ate onde se apurou e **sujeito a
confirmacao antes de qualquer investimento**, entrega movimentacao e metadados,
nao o texto da decisao. Sem texto nao se classifica resultado. Sobra base paga
com acesso programavel, ou raspagem fragil.

O de metodo e maior, e nao se resolve com dinheiro: **classificar cinquenta
acordaos exige le-los**. Um deles pode ter sido favoravel por fundamento que nao
serve ao caso em maos, e entra na conta como vitoria. Uma classificacao que
ninguem auditou vira estatistica com aparencia de objetividade — e o numero
redondo e justamente o que dispensa quem le de perguntar como foi feito.

**Sobre o indicador de exito, o problema e de unidade.** Forca de argumento,
risco processual e frequencia historica nao estao na mesma escala e nao se
somam. Uma porcentagem produzida dessas tres coisas e uma media de coisas
incomensuraveis com quatro casas de precisao aparente. E ela nao fica na tela:
sai da tela e vai para conversa com cliente, onde ninguem pergunta como foi
calculada.

Ha ainda o risco profissional. Numero de probabilidade de exito, dado a cliente,
opera como promessa de resultado — terreno do art. 34, IV, do Estatuto da
Advocacia e do Codigo de Etica. A ferramenta nao deve empurrar seu usuario para
la, e menos ainda automatizar o empurrao.

E o proprio pedido ja contem a resposta melhor: *"mais importante que ganhar e
nao perder"*. Isso nao e uma probabilidade. E teto, piso e escopo negativo — que
a tese ja obriga a declarar desde a 0.1.0.

## Decision

**1. A ferramenta nao produz probabilidade de exito em porcentagem. Nunca.**

Nao e limitacao temporaria a ser removida quando houver dados melhores. E o que
a ferramenta se recusa a gerar, na mesma familia da recusa de assinar,
protocolar e aprovar.

**2. O prognostico e semaforo com as premissas a vista.**

Verde, amarelo ou vermelho, seguido das razoes que o produziram — cada uma
apontando o artefato de onde saiu: um fato sem documento, um risco sem
mitigacao, um precedente contrario nao distinguido, um fundamento nao conferido.
Quem discorda ataca a razao, e a razao tem endereco.

**3. O semaforo e derivado do que ja e cobrado, e nao introduz criterio novo.**

Sai da tese, do mapa de risco e do gate — fatos provados, riscos mitigados,
fundamento conferido, escopo negativo declarado, teto e piso preenchidos. Nao ha
peso arbitrario a calibrar porque nao ha nota a compor.

**4. Jurisprudencia e amostra conferida, e o tamanho da amostra e visivel.**

De dez a quinze julgados, cada um com identificador, link do inteiro teor e a
razao de estar na coluna em que esta. A saida diz quantos foram lidos e quantos
foram encontrados — nunca apresenta a amostra como se fosse o universo.

**5. Julgado nao lido nao entra classificado.**

Entra na lista como pendente de leitura, visivelmente. E a mesma regra do
`[CONFERIR NA FONTE]` que ja governa citacao: o que nao foi verificado carrega a
marca ate ser.

**6. Nao se contorna captcha nem se raspa fonte que o proibe.**

Fonte que exige contrato entra por chave de API configurada pelo escritorio, ou
nao entra. Nenhuma coleta se apresenta como navegador humano.

**7. Quando a base propria tiver massa, ela e a fonte preferida.**

Os resultados registrados na carteira sao auditados por quem os viveu, o que
nenhuma base externa oferece. E ainda assim entram como amostra declarada, com o
n a vista, nao como porcentagem.

## Consequences

**A favor.**

- Nao se entrega ao cliente numero que nao se sustenta sob pergunta.
- O semaforo aponta trabalho concreto — o amarelo diz qual fato falta provar —
  enquanto a porcentagem so informa.
- Amostra pequena e conferida custa menos que censo mal feito e vale mais.
- A ferramenta nao empurra o usuario para promessa de resultado.

**Contra, e aceito.**

- E menos impressionante em reuniao. Um percentual convence mais rapido do que
  tres razoes, e essa e exatamente a razao de nao produzi-lo.
- Amostra de dez a quinze nao sustenta afirmacao estatistica. Correto, e a saida
  diz isso em vez de esconder.
- Marcar julgados como pendentes deixa a lista visivelmente incompleta. E o
  estado verdadeiro dela.

## Alternatives considered

**Porcentagem com intervalo de confianca.** Mais honesto matematicamente, e o
intervalo e a primeira coisa que se perde quando o numero e copiado para um
e-mail. Rejeitada.

**Nota de 0 a 10 em vez de porcentagem.** O mesmo problema com outra escala, e
sem a defesa de ser uma frequencia. Rejeitada.

**Nao entregar nada.** Deixaria a pergunta legitima do cliente sem resposta e
empurraria o advogado de volta ao numero improvisado, que e pior. Rejeitada.

## Related

- `ADR-2026-08-31-a-carteira-e-a-memoria-institucional-resultado-no-encerramento-e-busca-transversal.md`
  — a base propria de resultados que, com massa, vira a fonte preferida.
- `ADR-2026-08-31-numero-gerado-sai-com-procedencia-serie-e-tabela-em-arquivo-versionado-memoria-obrigatoria.md`
  — a politica geral de procedencia, aqui no caso em que ela nao pode ser
  garantida.
