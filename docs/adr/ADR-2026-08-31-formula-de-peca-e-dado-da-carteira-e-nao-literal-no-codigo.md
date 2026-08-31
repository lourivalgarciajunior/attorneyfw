---
status: Accepted
date: 2026-08-31
author: "Lourival Garcia"
---

# ADR: Formula de peca e dado da carteira, e nao literal no codigo

> Date: 2026-08-31 | Status: Accepted

## Context

O `build` monta o enderecamento com uma linha escrita no codigo desde a 0.1.0:

```
EXCELENTISSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) <juizo>
```

Ela foi escrita para ser neutra — sem acento, com o genero entre parenteses — e o
resultado e que **nao aparece em nenhuma das oito pecas reais do corpus**. As
oito usam a forma cheia, com acento e genero resolvido, e ela varia com o juizo:

| Juizo | Como o escritorio escreve |
|---|---|
| vara civel | `EXCELENTISSIMO SENHOR DOUTOR JUIZ DE DIREITO DA __ VARA CIVEL DA COMARCA DE …` |
| fazenda publica | `… DA __ª VARA DA FAZENDA PUBLICA DA COMARCA DE …` |
| familia e sucessoes | `… DA __ VARA DE FAMILIA E SUCESSOES DE …` |
| familia, juiza | `EXCELENTISSIMA SENHORA DOUTORA JUIZA DE DIREITO DA VARA DE FAMILIA DA COMARCA DE …` |
| juizado especial | `AO JUIZO DE DIREITO DO JUIZADO ESPECIAL CIVEL DA COMARCA DE …` |
| vara civel, forma curta | `AO JUIZO DE DIREITO DA __ VARA CIVEL DA COMARCA DE …` |

Seis formas em oito pecas. E o `build` emite uma setima, que nao e de ninguem.

O padrao e conhecido e ja foi decidido duas vezes nesta ferramenta, com outros
nomes: a serie de indice mora em arquivo versionado na carteira, e nao no codigo;
a tabela de custas tambem, com norma e data. O motivo e o mesmo — **o que muda
por escritorio, por comarca e por ano nao pode estar compilado**.

O enderecamento e a primeira coisa que o juizo le. Sair numa forma que o
escritorio nao usa denuncia a peca antes do primeiro argumento.

## Decision

**1. As formulas moram em `formulas.yaml`, na carteira.**

Enderecamento por tipo de juizo, formula de qualificacao, fecho e assinatura.
Texto com marcadores — `{juizo}`, `{comarca}`, `{cliente}` — e nada de logica.

**2. O CLI traz **uma** semente, marcada como semente.**

Nao ha "formula padrao correta". Ha uma forma de partida, que o escritorio
substitui pela dele — e o comando de importacao sugere as que achou no arquivo.

**3. Sem `formulas.yaml`, o `build` usa a semente e diz que usou.**

Nao falha: peca tem de sair. Mas avisa, uma vez por execucao, que o
enderecamento nao e o do escritorio.

**4. A escolha da formula e por chave declarada, e nao inferida do texto do
juizo.**

`materia.yaml` ganha `foro:` — `civel`, `fazenda`, `familia`, `juizado`,
`trabalho`. Adivinhar pelo nome do juizo funcionaria em quase todos os casos, e
"quase todos" enderecca peca ao juizo errado no que sobra.

**5. Marcador sem valor sai visivel, e nao vazio.**

`{comarca}` sem comarca declarada vira `{comarca}` no papel, e nao um espaco em
branco que ninguem nota. Peca com buraco tem de parecer peca com buraco.

## Consequences

**A favor.**

- A peca gerada passa a se parecer com as do escritorio na primeira linha, que e
  onde a diferenca aparece primeiro.
- Formula nova nao exige versao nova do CLI.
- Comarca, vara e rito novos entram como dado.
- O importador tem para onde levar o que extrai das pecas antigas.

**Contra, e aceito.**

- Mais um arquivo de carteira para manter. Mitigado por (3): sem ele, tudo
  continua funcionando, com aviso.
- Formula errada no arquivo produz peca errada em silencio. E o mesmo risco da
  tabela de custas, e a mesma resposta: e material do escritorio, conferido por
  quem assina.
- `foro:` e mais um campo declarado. Preferivel a inferencia que erra pouco — e o
  pouco e endereçar ao juizo errado.

## Alternatives considered

**Inferir o foro do texto de `juizo:`.** Funciona em quase todos os casos do
corpus, e o resto enderecca errado. Mesma familia da recusa de inferir o polo do
cliente no relatorio: quando o erro e desse tamanho, declara-se. Rejeitada.

**Manter no codigo e so acrescentar variantes.** Empurra para o CLI uma decisao
que e de cada escritorio, e obriga release para acomodar comarca nova.
Rejeitada.

## Related

- `ADR-2026-08-31-numero-gerado-sai-com-procedencia-serie-e-tabela-em-arquivo-versionado-memoria-obrigatoria.md`
  — a mesma decisao para serie de indice e tabela de custas.
- `ADR-2026-08-31-o-style-card-descreve-o-escritorio-e-nao-prescreve-o-certo.md`
  — o card que descreve a voz; aqui, as formulas que a materializam.
