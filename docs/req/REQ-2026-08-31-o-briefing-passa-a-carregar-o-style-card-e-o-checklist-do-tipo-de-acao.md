---
status: Done
date: 2026-08-31
author: "Lourival Garcia"
adr: "ADR-2026-08-31-o-briefing-carrega-a-voz-e-a-lista-do-tipo-de-acao-como-observacao-nunca-como-instrucao"
roadmap: "ROADMAP-2026-08-31-a-voz-e-a-lista-no-briefing-em-tres-ondas"
---

# REQ: O briefing passa a carregar o style card e o checklist do tipo de acao

> Date: 2026-08-31 | Status: Done

## Decisoes que amarram esta REQ

ADR: `docs/adr/ADR-2026-08-31-o-briefing-carrega-a-voz-e-a-lista-do-tipo-de-acao-como-observacao-nunca-como-instrucao.md`
— a decisao inteira: as duas secoes fora de `## Instrucoes`, o piso do traco, a
caixa alta que fica de fora, e o checklist filtrado a diferenca.

ADR: `docs/adr/ADR-2026-08-31-o-style-card-descreve-o-escritorio-e-nao-prescreve-o-certo.md`
— o que nao pode ser desfeito ao levar o card para dentro do briefing.

ADR: `docs/adr/ADR-2026-08-31-modelo-por-tipo-de-acao-sai-do-arquivo-do-escritorio-nunca-de-conhecimento-generico.md`
— por que o item de checklist e pendencia, e nao verdade.

Roadmap: `docs/roadmaps/done/ROADMAP-2026-08-31-a-voz-e-a-lista-no-briefing-em-tres-ondas.md`

## Motivation

Duas coisas foram construidas, testadas, documentadas — e nao sao lidas no unico
momento em que serviriam.

| Artefato | Onde mora | Quem le hoje |
|---|---|---|
| `estilo.yaml` (0.5.0) | raiz da carteira | so o `attorneyfw estilo` e a regra de rotulos misturados |
| `docs/checklist-<tipo>.md` (0.4.0) | dentro da materia | **ninguem** |
| briefing de topico | `attorneyfw brief` | quem redige |

O `brief` monta contrato invariavel, contrato do topico, pendencias, documentos
citados, partes, cronologia, andamento, cauda do texto anterior e a estrategia em
vigor. **Nao le nenhum dos dois.**

O ADR do style card abriu dizendo qual era o problema: *"o `adv-gaio` redigia com
a voz que o modelo tem"*. A ferramenta mediu a voz do escritorio e guardou o
resultado num arquivo que ninguem abre na hora de escrever — o problema
permaneceu de pe, com a solucao pronta ao lado.

## Scope

1. **`vozDoEscritorio(raiz)`** em `src/estilo.mjs`: le `estilo.yaml` e devolve os
   tracos acima do piso (`n >= 3` e presenca em mais da metade), o ritmo, o par
   de rotulos dominante e o `n`. Sem arquivo, devolve `null`.
2. **`checklistAberto(m, tipo)`** em `src/modelo.mjs`: le
   `docs/checklist-<tipo>.md` e devolve so os itens ainda em `- [ ]`, separados
   por bloco, com a procedencia de cada um.
3. **A diferenca**: filtrar os itens abertos contra o contrato do topico e o
   canon da materia — fundamento que o topico nao declara, objecao que o `risco`
   nao previu, documento que o canon nao tem.
4. **`brief` costura as duas secoes**, antes de `## Instrucoes`, rotuladas como
   observacao; e o par de rotulos sai dos topicos ja escritos quando ha algum.
5. **Tres instrucoes novas**, todas negativas: nao forcar traco, nao afirmar item
   da lista, e escrever a pendencia quando o item importa e nao esta provado.
6. **Doutrina**: README, `AJUDA`, CHANGELOG, skill, `adv-gaio`, comando
   `redigir`, e regra de lint que reprova o build se a recusa sumir.

## Negative scope — o que esta REQ NAO faz

- **Nenhuma regra de gate nova.** O card continua habilitando uma so, a de
  rotulos misturados.
- **Nao cobra aderencia a voz**, nem no gate, nem no `conferir`, nem em aviso.
- **Nao prescreve traco.** Nenhuma linha do briefing dira "escreva assim"; todas
  dirao "assim aparece em N de M".
- **Nao inclui enfase em caixa alta**, por decisao — e o traco que se imita em
  excesso sem esforco.
- **Nao marca item de checklist como feito**, e nao altera
  `docs/checklist-<tipo>.md`. O briefing e leitura.
- **Nao cria arquivo, campo de contrato nem dependencia de runtime.**
- **Nao cobra card nem checklist ausentes.** Materia que nao tem segue sem.
- **Nao deriva o card automaticamente** dentro do `brief` — derivar continua
  sendo `attorneyfw estilo`, comando proprio e deliberado.

## Acceptance criteria

- [x] `vozDoEscritorio` devolve `null` quando nao ha `estilo.yaml`, e o briefing sai sem a secao.
- [x] Traco presente em 2 de 8 pecas **nao** aparece; presente em 6 de 8 aparece com `6/8`.
- [x] Card com `n: 2` nao traz traco nenhum, e o briefing diz que a amostra e pequena demais.
- [x] Nenhuma linha da secao de voz aparece dentro de `## Instrucoes`.
- [x] `trechos_em_caixa_alta` nao chega ao briefing.
- [x] O par de rotulos vem dos topicos ja escritos quando ha texto anterior; do card quando nao ha.
- [x] `checklistAberto` ignora item ja marcado `- [x]`.
- [x] Fundamento que ja esta em `fundamento:` do topico **nao** aparece na lista do briefing.
- [x] Documento que ja esta no canon **nao** aparece na lista do briefing.
- [x] O briefing traz as tres instrucoes negativas, com essas palavras.
- [x] `npm run check` verde: 14 regras de lint e o smoke nos dois tipos de materia.
- [x] `trackfw validate` sem violacoes.
