---
status: Done
date: 2026-08-31
author: "Lourival Garcia"
adr: "ADR-2026-08-31-o-texto-do-topico-se-confere-contra-o-proprio-contrato"
roadmap: "ROADMAP-2026-08-31-a-quinta-conferencia-texto-contra-contrato-em-quatro-ondas"
---

# REQ: Conferencia do texto do topico contra o contrato declarado

> Date: 2026-08-31 | Status: Done

## Decisoes que amarram esta REQ

ADR: `docs/adr/ADR-2026-08-31-o-texto-do-topico-se-confere-contra-o-proprio-contrato.md`
— a decisao inteira: as cinco comparacoes, os quatro limites e a razao de a
quinta conferencia rodar na bancada, e nao no papel.

ADR: `docs/adr/ADR-2026-08-31-numero-se-confere-contra-si-mesmo-e-contra-o-documento-de-onde-foi-transcrito.md`
— a familia em que ela entra: par a vista, nada corrigido, silencio no lugar de
palpite.

Roadmap: `docs/roadmaps/done/ROADMAP-2026-08-31-a-quinta-conferencia-texto-contra-contrato-em-quatro-ondas.md`

## Motivation

O gate cobra que o contrato de topico **exista**. Nao cobra que o texto o
**honre**.

Medido no codigo de hoje, e nao estimado:

| declaracao do contrato | o gate confere | contra o texto |
|---|---|---|
| `sustenta:` | preenchido | nao |
| `fundamento:` | preenchido | **nao** |
| `documentos:` | existe no canon | nao |
| `pedidos:` | existe na tese | nao |
| `risco:` / `resposta:` | preenchidos | nao |

A linha do meio e a que custa. `fundamento:` e uma **lista branca de citacoes**
— esta escrita, esta parseada em `topicosDe`, e nenhuma linha de codigo a compara
com o que a prosa cita. Um topico pode declarar `fundamento: [art. 300 do CPC]`,
citar no texto o art. 373, II, e a Sumula 7 do STJ, e passar no gate inteiro.

O dispositivo que entra sem passar pelo contrato e exatamente o que ninguem
conferiu: nao passou pelo agente de fundamento, nao foi distinguido, nao teve
vigencia checada. Das oito pecas reais lidas em 2026-08-31, **tres** tinham erro
de fundamento (Lei 9.610/98 numa acao de marca; arts. 303 e 304 do CPC em peca
que nao era antecedente; art. 38 da LEF sem a Sumula Vinculante 28) — os tres,
dispositivos que entraram no texto sem contrato.

E o topico com contrato cheio e prosa vazia hoje passa: o gate conta palavras da
**entrega inteira**, entao um topico vazio se esconde atras de outro bem escrito.

## Scope

1. **Extrator e normalizador de citacao** (`src/citacao.mjs`): reconhece
   dispositivo (`art. N` + lei, por apelido ou por numero), sumula, sumula
   vinculante, tema repetitivo e precedente por numero de recurso. Normaliza ao
   **artigo**, ignorando inciso, paragrafo e alinea. Devolve nada para forma que
   nao reconhece.
2. **Quinta conferencia** (`conferirTopicos`): cinco comparacoes entre o texto do
   topico e o contrato dele — citacao fora do contrato, fundamento nao usado,
   documento declarado e nao mencionado, topico sem texto, e o caso em que nao ha
   o que comparar.
3. **`attorneyfw conferir` mostra a quinta**, lendo a entrega na origem — onde
   contrato e prosa ainda estao lado a lado —, com os pares a vista e a nota
   final do que **nao** foi conferido.
4. **O gate emite os avisos** por topico, e reprova topico sem texto em `revisao`
   e `entregue`.
5. **Doutrina no lugar certo**: README, `AJUDA` do bin, CHANGELOG, skill, agente
   e comando do plugin — e regra de lint que reprova o build se a recusa (nao
   verifica existencia, vigencia, superacao nem pertinencia) sumir do texto.

## Negative scope — o que esta REQ NAO faz

- **Nao verifica se o dispositivo existe.** Nenhuma consulta a base externa,
  nenhuma tabela de artigos vigentes.
- **Nao verifica vigencia nem superacao.** Revogacao e superacao legislativa
  ficam com o agente de fundamento.
- **Nao julga pertinencia.** Nunca dira que um artigo "nao sustenta" o
  paragrafo: isso e leitura, e nao comparacao.
- **Nao corrige, e nao completa `fundamento:`.** Nao acrescenta ao contrato a
  citacao que achou no texto — quem declara o contrato e quem assina a peca.
- **Nao compara inciso, paragrafo nem alinea.** Por decisao, nao por limitacao.
- **Nao reprova citacao fora do contrato.** Aviso, porque a excecao legitima e
  diaria.
- **Nao roda sobre o markdown do `build`.** O contrato e removido dali de
  proposito.
- **Nao mexe no formato do contrato de topico.** Nenhum campo novo.
- **Nao inventa apelido de lei por heuristica.** Tabela declarada; sigla fora
  dela nao vira lei.

## Acceptance criteria

- [x] `citacoesDe("art. 373, II, do CPC")` e `citacoesDe("artigo 373 do Codigo de Processo Civil")` produzem a mesma chave normalizada.
- [x] `citacoesDe` reconhece `Sumula 7 do STJ`, `Sumula Vinculante 28`, `SV 28`, `Tema 69 do STF`, `RE 574.706`, `REsp 1.221.170`.
- [x] Sigla que nao esta na tabela nao vira citacao — nenhum achado.
- [x] Topico que cita no texto dispositivo ausente de `fundamento:` produz um par com os dois lados.
- [x] Topico com `fundamento:` declarado e nao citado no texto produz um par.
- [x] Topico com `documentos: [D3]` e texto que nunca menciona D3 nem o nome dele no canon produz um par.
- [x] Topico com contrato e texto vazio e **erro** em `revisao`; **nao** e erro em `pesquisa`.
- [x] `art. 373, II` no texto e `art. 373` no contrato **nao** produzem achado.
- [x] `attorneyfw conferir` termina dizendo que nao conferiu existencia, vigencia, superacao nem pertinencia.
- [x] `npm run check` verde: 13 regras de lint e o smoke nos dois tipos de materia.
- [x] `trackfw validate` sem violacoes.
