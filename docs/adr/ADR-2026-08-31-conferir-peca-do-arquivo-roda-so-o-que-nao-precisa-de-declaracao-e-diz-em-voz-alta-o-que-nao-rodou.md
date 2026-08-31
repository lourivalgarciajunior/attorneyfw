---
status: Accepted
date: 2026-08-31
author: "Lourival Garcia"
---

# ADR: Conferir peca do arquivo roda so o que nao precisa de declaracao, e diz em voz alta o que nao rodou

> Date: 2026-08-31 | Status: Accepted

## Context

As seis conferencias rodam sobre **entrega de materia**. Peca que ja esta no
arquivo do escritorio nao passa por nenhuma delas sem antes virar materia — e o
`importar`, que e a porta de entrada, produz **relatorio de pendencias**, e nao
materia pronta, por decisao registrada.

O efeito pratico apareceu em 2026-08-31: para conferir nove pecas reais de um
escritorio foi preciso **escrever um script** que chamava `lerTexto`,
`conferirTexto` e `citacoesDe` direto dos modulos. Nao havia comando. E o
resultado desse script achou defeito em cinco das nove — incluindo dois valores
por extenso que nao fecham e um item deformado que chega ao pedido.

Um escritorio com quinhentas pecas no disco nao vai transformar cada uma em
materia para conferir um extenso. A conferencia mais barata da ferramenta —
comparar numero com numero — e justamente a que o arquivo nao alcanca.

Mas nem todas as seis podem rodar sobre um arquivo solto, e a razao e a mesma que
sustenta cada uma delas: **elas comparam contra algo declarado**.

| Conferencia | Contra o que compara | Roda sobre arquivo solto? |
|---|---|---|
| extenso x algarismo | a propria peca | **sim** |
| soma x total | a propria peca | **sim** |
| item x pedido | a propria peca | **sim** |
| transcricao x ficha | a ficha do documento no canon | nao |
| texto x contrato do topico | o contrato de topico | nao |
| continuidade de fato | a cronologia e o canon | nao |

Tres contra a propria peca, tres contra declaracao que so existe dentro da
materia. Nao ha como faze-las rodar sem inventar a declaracao — e inventar
declaracao e exatamente o que o `importar` recusa.

Ha um perigo especifico nesta funcionalidade, e ele decide a forma dela. O
`conferir` de hoje termina com *"Nenhuma divergencia nas seis conferencias"*. Se
o mesmo comando disser isso depois de rodar **tres**, ele mente por omissao — e
mente na direcao que causa dano, porque quem le entende "peca conferida" e
protocola. **Meia conferencia apresentada como conferencia e pior que nenhuma.**

## Decision

**1. `attorneyfw conferir --arquivo <peca>` roda as tres que comparam a peca com
ela mesma.**

Extenso x algarismo, soma x total, item x pedido. Nenhuma outra.

**2. O relatorio declara, sempre, quais tres nao rodaram e o que cada uma
precisaria.**

Nao um rodape generico: os tres nomes, e o que falta para cada uma — ficha de
documento no canon, contrato de topico, cronologia. Assim quem quiser as outras
tres sabe exatamente o que construir.

**3. A contagem nunca diz "seis".**

Sobre arquivo, o texto e *"tres das seis conferencias"*. A diferenca entre os dois
modos fica na primeira linha do relatorio, e nao escondida no fim.

**4. Nao cria materia, nao escreve nada, nao altera o arquivo.**

E leitura, como o `importar`. Peca do arquivo e material de terceiro, e ate a
propria peca do escritorio ja protocolada nao se mexe.

**5. Aceita os mesmos formatos que o `importar`**, pelo mesmo `lerTexto`.

Um leitor so. Dois leitores de `.docx` divergiriam no primeiro arquivo estranho.

**6. Aceita mais de um arquivo, e confere cada um por si.**

Escritorio confere lote, nao peca. Mas **nao compara entre arquivos**: dizer que
duas pecas divergem entre si exigiria saber que falam do mesmo fato, e isso e a
inferencia que a sexta conferencia recusa por principio.

**7. Nao lista o fundamento que a peca invoca.**

O extrator de citacao ja existe e a tentacao e obvia — foi lendo a lista de
citacoes que apareceu, na varredura, uma peca que invoca lei de direito autoral
numa acao de marca. Mas **listar nao e conferir**, e uma secao de fundamento
dentro de um relatorio chamado "conferencia" seria lida como fundamento
conferido. Isso e trabalho do agente de fundamento, e a ferramenta ja recusa
opinar sobre ele em tres lugares.

**8. Codigo de saida e `--json` como no modo de materia.**

1 com divergencia, 0 sem. O payload declara qual modo rodou e quais conferencias
ficaram de fora.

## Consequences

**A favor.**

- A conferencia mais barata da ferramenta passa a alcancar o arquivo, que e onde
  esta o volume.
- O script que foi preciso escrever em 2026-08-31 vira comando, com teste.
- Quem quiser as outras tres ve, no proprio relatorio, o que precisa declarar —
  e isso e um caminho para a materia, e nao um muro.
- Nenhuma dependencia nova: `lerTexto` e os tres comparadores ja existem.

**Contra, e aceito.**

- Duas superficies de relatorio para manter. Mitigado: os comparadores sao os
  mesmos, e so o cabecalho e o rodape mudam.
- Peca do arquivo sem as outras tres conferencias pode passar verde e ter defeito
  de contrato ou de continuidade. E por isso que a declaracao do que nao rodou e
  decisao, e nao cortesia.

## Alternatives considered

**Rodar as seis, com as tres de declaracao passando em silencio.** E a forma que
produz o dano descrito: verde depois de tres conferencias lidas como seis.
Rejeitada.

**Criar materia automaticamente a partir do arquivo para rodar as seis.** E
exatamente o que o `importar` recusa desde a 0.5.0 — parsing de peca alheia erra,
e materia inventada vira tese inventada. Rejeitada, e pela terceira vez nesta
ferramenta.

**Comando novo, `attorneyfw arquivo <peca>`.** Separaria o que e a mesma coisa —
conferir — e faria o usuario aprender dois nomes para uma operacao. Rejeitada em
favor da flag.

**Listar o fundamento invocado junto.** Util, e do jeito errado: viraria
fundamento conferido na leitura. Registrada aqui para nao ser acrescentada
depois como "faltava".

## Related

- `ADR-2026-08-31-importar-assiste-e-nao-preenche-tudo-entra-pendente-e-o-que-nao-e-mecanico-e-recusado-em-voz-alta.md`
  — a porta de entrada, o `lerTexto` reusado, e a disciplina de declarar o que
  nao se extraiu.
- `ADR-2026-08-31-numero-se-confere-contra-si-mesmo-e-contra-o-documento-de-onde-foi-transcrito.md`
  — as tres que rodam, e a que nao roda por depender da ficha.
- `ADR-2026-08-31-a-continuidade-de-fato-se-confere-contra-o-que-foi-declarado-e-nunca-inferindo-que-dois-fatos-sao-o-mesmo.md`
  — por que nao se compara um arquivo com o outro.
