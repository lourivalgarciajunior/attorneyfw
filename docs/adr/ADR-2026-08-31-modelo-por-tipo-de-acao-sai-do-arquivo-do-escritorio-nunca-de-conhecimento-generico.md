---
status: Accepted
date: 2026-08-31
author: "Lourival Garcia"
---

# ADR: Modelo por tipo de acao sai do arquivo do escritorio, nunca de conhecimento generico

> Date: 2026-08-31 | Status: Accepted

## Context

O item 10 da lista do escritorio pedia um **checklist de provas proativo**:
*"quais documentos a I.A. entende necessario para entrar com a demanda"*.

Na triagem original, a resposta foi que o esqueleto de cobranca ja existia — fato
alegado precisa de documento que o pague, e o gate reprova quem nao tem — mas que
a lista *antes de existir tese* seria conhecimento de tipo de acao, e portanto
trabalho de agente, nao de CLI.

A leitura das oito pecas mostrou que isso estava metade certo.

O corpus tem oito tipos de acao — alvara em sucessoes, anulatoria fiscal,
cobranca securitaria, indenizacao por fraude, obrigacao de fazer contra plano de
saude, divorcio consensual, uso indevido de marca, declaratoria de inexistencia
de debito. Cada peca **ja sabe**, na pratica, quais documentos foram juntados,
qual fundamento sustentou o pedido e qual objecao a outra parte levantou ou
levantaria.

Isso e um checklist. So que um checklist que sai da experiencia daquele
escritorio, e nao de conhecimento geral.

A diferenca nao e de qualidade — e de responsabilidade. Um modelo generico de
"documentos para acao de plano de saude" e uma afirmacao sobre o direito, feita
pela ferramenta, que ninguem conferiu. Um modelo destilado das pecas do proprio
escritorio e uma afirmacao sobre **o que aquele escritorio ja fez**, que o
advogado reconhece ou corrige.

Ha um precedente direto na propria ferramenta, e ele foi decidido na onda 6: a
amostra jurisprudencial nao vira censo nem porcentagem porque classificar sem ler
produz estatistica com aparencia de objetividade. Modelo de acao gerado de
conhecimento generico e o mesmo defeito com outra roupa — checklist com aparencia
de doutrina.

E ha um risco pratico que decide a questao. Checklist generico erra por
**excesso**: manda juntar documento que o caso nao pede, e o advogado aprende a
ignorar a lista. Lista ignorada e pior que lista ausente, porque ocupa o lugar da
que seria lida.

## Decision

**1. O modelo e semeado de materias reais da carteira, e nunca gerado do nada.**

`modelos/<tipo>.yaml`, produzido por `attorneyfw modelo destilar` a partir de
materias que o escritorio indica. O que entra na semente sai de peca que existiu:
os documentos que estavam no canon, os fundamentos que os topicos declararam, os
riscos e respostas que os contratos registraram.

**2. Sem materia de origem, nao ha modelo.**

Tipo de acao que o escritorio nunca trabalhou nao ganha checklist. O comando diz
isso em vez de oferecer um modelo plausivel — e a mensagem manda usar o agente de
fundamento para a pesquisa, que e onde essa pergunta pertence.

**3. Cada linha do modelo carrega de onde veio.**

Documento, fundamento e objecao trazem o slug das materias que os sustentam e em
quantas apareceram. Item apoiado em uma materia so aparece marcado como tal — nao
e regra do escritorio, e uma vez.

**4. O modelo sugere; o gate continua cobrando a tese.**

Aplicar um modelo cria itens **pendentes** na materia nova, para que uma pessoa
confirme ou descarte. Nada e dado por provado, por fundamentado ou por
necessario porque o modelo disse. O mecanismo de fato provado com documento
continua exatamente como esta.

**5. O modelo nao afirma direito.**

Nao diz "esta acao exige X". Diz "nas N materias deste tipo que o escritorio
tem, X apareceu em M delas". A diferenca esta na saida, e nao so na intencao.

**6. Distribuir modelo entre escritorios fica fora.**

Modelo e material de cliente destilado: mora na carteira, e o repositorio da
ferramenta traz apenas o formato. Modelo compartilhado seria conhecimento
generico entrando pela porta dos fundos.

## Consequences

**A favor.**

- O checklist do item 10 fica util sem que a ferramenta afirme direito.
- O modelo melhora sozinho: cada materia encerrada e uma amostra a mais.
- Fecha o ciclo com a memoria institucional — materia com desfecho registrado
  passa a valer mais na destilacao que materia so protocolada.
- Advogado reconhece o proprio trabalho na lista, que e a diferenca entre uma
  lista lida e uma lista ignorada.

**Contra, e aceito.**

- Escritorio novo nao tem modelo nenhum, e vai levar meses para ter. Correto: e o
  estado verdadeiro do conhecimento acumulado dele.
- Modelo reproduz o vies do arquivo, inclusive os erros. Mitigado por (3): a
  procedencia de cada item esta a vista, e item de uma materia so sai marcado.
- Oito materias sao amostra pequena para destilar qualquer coisa. Por isso a
  saida sempre declara o `n`, como na amostra jurisprudencial.

## Alternatives considered

**Modelo de partida embutido no CLI.** Resolveria o escritorio novo e faria a
ferramenta afirmar direito que ninguem conferiu, com cara de padrao. Rejeitada
pelo mesmo motivo que nao ha porcentagem de exito.

**Modelo gerado por agente a cada materia nova.** Flexivel, e produz lista
diferente a cada execucao para o mesmo tipo de acao — nao acumula, nao se audita
e nao vira conhecimento do escritorio. O agente continua util para pesquisar o
que o arquivo nao tem; nao para substituir o arquivo.

## Related

- `ADR-2026-08-31-a-carteira-e-a-memoria-institucional-resultado-no-encerramento-e-busca-transversal.md`
  — a base de onde a destilacao tira as materias.
- `ADR-2026-08-31-prognostico-e-semaforo-com-premissas-a-vista-e-jurisprudencia-e-amostra-conferida.md`
  — a mesma recusa de produzir afirmacao que ninguem conferiu.
