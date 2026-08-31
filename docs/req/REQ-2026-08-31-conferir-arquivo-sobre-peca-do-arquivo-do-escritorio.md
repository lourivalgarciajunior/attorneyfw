---
status: In Progress
date: 2026-08-31
author: "Lourival Garcia"
adr: "ADR-2026-08-31-conferir-peca-do-arquivo-roda-so-o-que-nao-precisa-de-declaracao-e-diz-em-voz-alta-o-que-nao-rodou"
roadmap: "ROADMAP-2026-08-31-conferir-arquivo-em-duas-ondas"
---

# REQ: `conferir --arquivo` sobre peça do arquivo do escritório

> Date: 2026-08-31 | Status: In Progress

## Decisoes que amarram esta REQ

ADR: `docs/adr/ADR-2026-08-31-conferir-peca-do-arquivo-roda-so-o-que-nao-precisa-de-declaracao-e-diz-em-voz-alta-o-que-nao-rodou.md`
— a decisao inteira: as tres que rodam, a declaracao obrigatoria das tres que
nao rodam, e por que o fundamento invocado nao entra.

ADR: `docs/adr/ADR-2026-08-31-importar-assiste-e-nao-preenche-tudo-entra-pendente-e-o-que-nao-e-mecanico-e-recusado-em-voz-alta.md`
— o `lerTexto` reusado, e a disciplina de declarar o que nao se alcancou.

Roadmap: `docs/roadmaps/wip/ROADMAP-2026-08-31-conferir-arquivo-em-duas-ondas.md`

## Motivation

As seis conferencias rodam sobre **entrega de materia**. Peca ja arquivada nao
passa por nenhuma delas, e o `importar` produz relatorio de pendencias — nao
materia pronta.

Medido em 2026-08-31: para conferir nove pecas reais de um escritorio foi preciso
**escrever um script** chamando `lerTexto`, `conferirTexto` e `citacoesDe` direto
dos modulos, porque nao ha comando. Esse script achou divergencia em cinco das
nove — dois valores por extenso que nao fecham, um valor de causa sem os
centavos, um item deformado que chega ao pedido e um numero pedido sem constar
dos fatos.

Um escritorio com quinhentas pecas no disco nao transforma cada uma em materia
para conferir um extenso. A conferencia mais barata da ferramenta e justamente a
que o arquivo nao alcanca.

| Conferencia | Compara contra | Roda sobre arquivo solto? |
|---|---|---|
| extenso x algarismo | a propria peca | **sim** |
| soma x total | a propria peca | **sim** |
| item x pedido | a propria peca | **sim** |
| transcricao x ficha | ficha do documento no canon | nao |
| texto x contrato do topico | contrato de topico | nao |
| continuidade de fato | cronologia e canon | nao |

## Scope

1. **`attorneyfw conferir --arquivo <peca> [<peca>...]`** — roda as tres que
   comparam a peca com ela mesma, uma peca por vez, sem comparar entre elas.
2. **`lerTexto` reusado** de `src/importar.mjs`: `.docx`, `.txt` e `.md`.
3. **Cabecalho e rodape proprios**: a contagem diz *"tres das seis"*, e o rodape
   nomeia as tres que nao rodaram **e o que cada uma precisaria** — ficha de
   documento, contrato de topico, cronologia.
4. **`--json`** com `modo: "arquivo"`, a lista de conferencias que rodaram e a
   das que nao rodaram, alem dos achados.
5. **Nao exige carteira.** Peca do arquivo se confere de qualquer diretorio.
6. **Doutrina**: README, `AJUDA`, CHANGELOG, skill, comando `conferir` do plugin,
   e regra de lint que reprova o build se a declaracao do que nao rodou sumir.

## Negative scope — o que esta REQ NAO faz

- **Nao roda as tres que precisam de declaracao.** Sem canon, sem contrato e sem
  cronologia elas nao tem ancora, e inventar ancora e o que o `importar` recusa.
- **Nunca diz "seis conferencias" no modo arquivo.**
- **Nao cria materia**, nao escreve, nao altera o arquivo lido.
- **Nao compara um arquivo com o outro** — seria continuidade sem ancora
  declarada.
- **Nao lista o fundamento invocado.** Listar nao e conferir, e a secao seria
  lida como fundamento conferido.
- **Nao anonimiza nem varre dado pessoal** — isso e `dados` e `anonimizar`, e
  eles pedem materia.
- **Nao muda o modo de materia** do `conferir`: mesma saida, mesmos codigos.
- **Nao cria modulo nem dependencia de runtime nova.**
- **Nao le PDF.**

## Acceptance criteria

- [ ] `conferir --arquivo peca.docx` roda fora de carteira, sem erro de "nao achei escritorio".
- [ ] Roda extenso, soma e item; **nao** roda transcricao, contrato nem continuidade.
- [ ] O relatorio diz "tres das seis" e **nomeia as tres que nao rodaram**, com o que cada uma precisaria.
- [ ] Peca sem divergencia sai com 0 e **nao** diz "nenhuma divergencia nas seis".
- [ ] Peca com extenso divergente sai com 1 e mostra o par.
- [ ] Dois arquivos numa chamada produzem dois relatorios, e nenhum achado que compare um com o outro.
- [ ] `--json` traz `modo: "arquivo"` e as duas listas de conferencias.
- [ ] `.txt` e `.md` funcionam pelo mesmo `lerTexto`.
- [ ] Arquivo inexistente falha com mensagem clara, e nao com stack.
- [ ] O modo de materia continua idêntico — teste de regressao.
- [ ] `npm run check` verde: 17 regras de lint e o smoke nos dois tipos de materia.
- [ ] `trackfw validate` sem violacoes.
