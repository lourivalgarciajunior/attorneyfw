---
status: In Progress
date: 2026-08-31
author: "Lourival Garcia"
adr: "ADR-2026-08-31-entre-calar-e-inventar-o-comparador-cala-e-o-extrator-de-citacao-se-mede-contra-as-formas-reais-do-arquivo"
roadmap: "ROADMAP-2026-08-31-o-extrator-medido-contra-o-arquivo-real-em-tres-ondas"
---

# REQ: Tres defeitos do extrator de citacao, e a guarda fora de ordem no comparador de itens

> Date: 2026-08-31 | Status: In Progress

## Decisoes que amarram esta REQ

ADR: `docs/adr/ADR-2026-08-31-entre-calar-e-inventar-o-comparador-cala-e-o-extrator-de-citacao-se-mede-contra-as-formas-reais-do-arquivo.md`
— a decisao inteira: o extrator cumpre a propria regra, ganha corpus de formas
como teste, e a guarda do comparador de itens passa a valer para as tres
checagens.

ADR: `docs/adr/ADR-2026-08-31-o-texto-do-topico-se-confere-contra-o-proprio-contrato.md`
— onde a regra do silencio foi escrita, e que dois destes defeitos violavam.

Roadmap: `docs/roadmaps/wip/ROADMAP-2026-08-31-o-extrator-medido-contra-o-arquivo-real-em-tres-ondas.md`

## Motivation

Varredura de `citacoesDe` e `conferirTexto` sobre as **nove pecas reais** do
arquivo do escritorio, em 2026-08-31. Medido, e nao estimado:

| Forma na peca | Devolvido hoje | Certo | Ocorrencias no corpus |
|---|---|---|---|
| `Art. 1.048, II, do CPC` | `cpc#1` + `cpc#048` | `cpc#1048` | **6** |
| `Lei nº 10.741 de 01 de Outubro de 2003` | `lei-10741-2001` | `estatuto-do-idoso` | 2 |
| `Lei nº 9.279, de 14 de maio de 1996` | nada | `lei-9279-1996` | **7** |

Os dois primeiros **inventam** — e o cabecalho de `src/citacao.mjs` diz, desde a
0.6.0, que forma nao reconhecida nao vira citacao. A regra estava escrita e nao
estava sendo cumprida, porque os testes usam as formas curtas que eu tinha em
mente, e as pecas usam as longas.

O do artigo e o mais caro: na quinta conferencia ele produz *"citacao fora do
contrato"* para um `art. 048` que nao existe. Aviso falso e o que ensina a
ignorar o aviso verdadeiro.

E o comparador `item x pedido` apontou *"lista de 1 a 10, falta o 2"* sobre a
**ementa numerada de um acordao do STJ** colada na peca, e leu um **titulo de
secao** como item noutra. A guarda de forma dominante existe; a checagem de
buraco na sequencia roda **antes** dela.

## Scope

1. **`art. 1.048` vira um artigo.** O tokenizer de `artigosDe` para de quebrar no
   separador de milhar.
2. **Lei com data por extenso.** `Lei nº X, de DD de mes de AAAA` — com virgula e
   sem — passa a ser reconhecida, e o ano sai da **data**, e nao do dia.
3. **`MESES` sobe para `src/citacao.mjs`**, e `src/conferir.mjs` passa a
   importa-la — hoje a lista existe so no segundo, e o primeiro vai precisar
   dela.
4. **Corpus de formas** em `test/smoke.mjs`: uma tabela `forma -> chave esperada`
   com as formas reais colhidas nas nove pecas. **So numero de lei e de artigo**,
   que sao direito publico.
5. **A guarda do comparador de itens passa a valer para as tres checagens** —
   inclusive a de buraco na sequencia.
6. **Doutrina**: README, CHANGELOG, e o cabecalho de `src/citacao.mjs` dizendo
   que a regra do silencio tem teste.

## Negative scope — o que esta REQ NAO faz

- **Nao entra material de cliente no repositorio.** Nada de nome, CPF, CNPJ,
  valor, data de peca ou numero de processo. Só numero de lei e de artigo.
- **Nao afrouxa nada.** Nenhuma das correcoes faz o extrator ou o comparador
  aceitar o que hoje recusam.
- **Nao muda a comparacao por artigo** — inciso, paragrafo e alinea continuam
  descartados.
- **Nao exige bloco declarado para `item x pedido`.** Ele continua rodando sobre
  texto nao declarado, por decisao registrada no ADR.
- **Nao acrescenta lei a tabela `LEIS`** por causa do corpus: sigla fora da
  tabela continua nao virando citacao.
- **Nao cria regra de gate nova**, e nenhuma conferencia passa a reprovar o que
  hoje avisa.
- **Nao mexe nas outras cinco conferencias.**
- **Nao corrige as pecas do escritorio.** Os achados sobre elas sao do advogado.

## Acceptance criteria

- [ ] `Art. 1.048, II, do CPC` devolve **uma** chave, `cpc#1048`.
- [ ] `art. 1.015, II, do CPC` devolve `cpc#1015`; `art. 1.022 do CPC`, `cpc#1022`.
- [ ] `art. 373 do CPC` e `art. 5º da CF` continuam iguais — teste de regressao.
- [ ] `Lei nº 10.741 de 01 de Outubro de 2003` devolve `estatuto-do-idoso`, e nao um ano 2001.
- [ ] `Lei nº 9.279, de 14 de maio de 1996` devolve `lei-9279-1996`.
- [ ] `Lei 6.830/80` continua devolvendo `lef` — a forma com barra nao regride.
- [ ] Sigla fora da tabela continua nao virando citacao.
- [ ] Sequencia numerada de prosa (ementa) **nao** produz "falta o item N".
- [ ] Lista de inventario homogenea continua produzindo os tres achados de antes.
- [ ] O corpus de formas roda como teste, e so tem numero de lei e de artigo.
- [ ] `npm run check` verde: 16 regras de lint e o smoke nos dois tipos de materia.
- [ ] `trackfw validate` sem violacoes.
