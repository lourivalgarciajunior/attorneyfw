---
status: Accepted
date: 2026-08-31
author: "Lourival Garcia"
---

# ADR: Visual law deriva do canon e da cronologia, nunca de texto livre

> Date: 2026-08-31 | Status: Accepted

## Context

O pedido: peca *"utilizando imagens, organogramas, fluxogramas para facilitar a
compreensao dos fatos, linhas temporais, etc., compativel com o conceito de
visual law"*.

O caminho obvio e pedir ao modelo que desenhe a linha do tempo lendo a minuta.
Ele funciona na demonstracao e falha em producao, por um motivo que so aparece
na terceira versao da peca: **a figura e o texto passam a divergir**. Corrige-se
uma data no corpo e a linha do tempo continua com a antiga. A divergencia e
pior que a ausencia da figura, porque a figura tem autoridade visual — o leitor
confia nela mais do que no paragrafo, e e a contraparte quem encontra a
contradicao.

A ferramenta ja resolveu esse problema uma vez, e a licao esta registrada: o
`docx` le o markdown que o `build` gerou, e nao reconstroi a selecao. Foi o erro
que o bookfw pagou com o gerador copiado em quatro livros.

E ha material estruturado disponivel. A materia ja obriga a ter:

- **cronologia** — fatos com data, em ordem;
- **canon de documentos** — cada documento com id curto (`D3`), o que prova, e
  se ja esta nos autos;
- **canon de partes** — quem e quem, com papel;
- **tese** — fatos numerados (`F1..Fn`), cada um provado por documento.

Uma linha do tempo desses dados nao e geracao: e projecao. E, por construcao,
nao pode divergir da peca, porque as duas leem a mesma fonte.

## Decision

**1. Diagrama e projecao de dado estruturado. Nao ha diagrama de texto livre.**

Tres geradores, e so eles:

| Diagrama | Fonte | O que mostra |
|---|---|---|
| linha do tempo | cronologia × canon de documentos | fato, data, e o documento que o prova |
| organograma de partes | canon de partes | quem e quem, papel, e a relacao declarada |
| mapa fato→prova | tese × canon de documentos | cada `F` ligado ao `D` que o paga |

Se o dado nao esta no canon, nao entra na figura. Quem quiser um marco na linha
do tempo acrescenta o fato a cronologia — que e onde ele deveria estar de
qualquer modo, e onde o gate ja o cobra.

**2. O marco da linha do tempo carrega o documento que o prova.**

Nao e enfeite: e a mesma exigencia que o gate faz ao texto, aplicada a figura.
Marco sem documento sai **visivelmente marcado como nao provado**, nao sai
silenciosamente igual aos outros.

**3. A fonte do diagrama e Mermaid em texto, versionada junto com a peca.**

O gerador escreve Mermaid; a renderizacao para SVG e um passo separado e
opcional. Consequencia: o diagrama e legivel em diff, revisavel em pull request,
e a peca continua compilando sem nenhuma ferramenta de imagem instalada.

**4. Renderizacao ausente degrada, nao quebra.**

Sem renderizador, o `build` mantem o bloco Mermaid no markdown e o `docx` insere
um aviso no lugar da figura. A peca sai. Um exportador de imagem faltando nao
pode impedir um protocolo.

**5. O `docx` continua lendo o que o `build` gerou.**

A regra ja existente vale sem excecao para as figuras. O `docx` nao consulta
canon nem cronologia.

## Consequences

**A favor.**

- A figura nao pode contradizer a peca. E a unica propriedade que importa aqui.
- Custo marginal baixo: os dados ja sao obrigatorios por outro motivo.
- Diagrama em texto entra no versionamento e na revisao como qualquer outra
  parte da peca.
- Marco nao provado fica visivel na figura — que e uma forma de conferencia que
  a leitura corrida do texto nao oferece.

**Contra, e aceito.**

- Nao se desenha qualquer coisa. Fluxograma de rito processual, por exemplo,
  fica de fora ate existir dado estruturado que o sustente. E limitacao
  deliberada, nao ausencia.
- Mermaid tem estetica propria e limitada. Aceito: a peca precisa de figura
  correta, nao de figura bonita.
- Renderizar para o DOCX depende de ferramenta externa. Mitigado por (4).

## Alternatives considered

**Modelo desenha lendo a peca.** Mais flexivel, e produz a divergencia descrita
no contexto. Rejeitada pelo mesmo motivo que o `docx` nao reconstroi a selecao.

**SVG escrito a mao pelo gerador.** Controle total sobre a estetica, e um
gerador de layout para manter. Rejeitada: nao e o problema que vale resolver
aqui.

## Related

- `ADR-2026-08-31-carteira-de-materias-com-dois-tipos-sob-a-mesma-cadeia-e-um-so-nucleo.md`
  — o canon e a cronologia de onde os diagramas saem.
