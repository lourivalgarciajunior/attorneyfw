---
status: Accepted
date: 2026-08-31
author: "Lourival Garcia"
---

# ADR: O canon sobe para a carteira — parte recorrente tem uma qualificacao so

> Date: 2026-08-31 | Status: Accepted

## Context

O canon de partes existe desde a 0.1.0 com uma justificativa escrita no proprio
codigo: *"a peca 7 esquece o que a peca 2 afirmou — nome grafado de outro jeito,
valor que mudou, data que nao bate. A contraparte le as duas."*

A leitura de oito pecas reais mostrou que a justificativa estava certa e o
**escopo estava errado**.

Quatro das oito pecas eram do mesmo cliente industrial. Cruzando os CNPJ:

| CNPJ | Numa peca | Noutra peca |
|---|---|---|
| `…/0004-96` | filial de **Pernambuco**, listada entre as tres filiais | a **autora**, com sede em Arapongas-PR e inscricao CAD/ICMS-**PR**, demandando o Estado do Parana |
| `…/0001-43` | matriz, com sede na rodovia | matriz, "situada" no endereco que a outra peca atribui a filial `…/0002-24` |

E o corpo de uma delas afirma que a matriz esta em Rolandia, contra a propria
qualificacao dela, que declara Arapongas.

A primeira linha e a que importa. Um estabelecimento nao e filial em Pernambuco e
contribuinte de ICMS no Parana com sede em Arapongas. Uma das duas descricoes
esta errada — e em acao anulatoria de ICMS o **estabelecimento e o
contribuinte**: nao e divergencia cadastral, e a identificacao da parte e do
credito que se pretende desconstituir.

**O gate nao veria isso nem em cem execucoes**, e o motivo e estrutural: o canon
e por materia. A contradicao nao estava dentro de nenhuma peca. Estava entre
duas materias diferentes, que compartilham o cliente e nada mais.

Cliente recorrente e a regra num escritorio, nao a excecao. Quatro de oito.

## Decision

**1. A ficha de parte sobe para a carteira.**

`partes/<slug>.md` na raiz, ao lado de `escritorio.yaml`. Uma qualificacao por
pessoa ou empresa, com CPF ou CNPJ, endereco e grafia do nome — a versao que sai
em toda peca.

**2. A materia referencia, e nao recria.**

O canon da materia passa a aceitar `ref: <slug-da-carteira>`, que traz a
qualificacao de cima e acrescenta apenas o que e proprio daquele processo — o
papel, o que a parte afirma naqueles autos, a procuracao.

**3. Papel e da materia; qualificacao e da carteira.**

A mesma empresa e autora num processo e re noutro; o CNPJ e o endereco nao mudam
com isso. Misturar os dois niveis foi o que permitiu a divergencia: cada materia
redigitou a qualificacao inteira, e a segunda digitacao discordou da primeira.

**4. Divergencia entre a ficha da carteira e a da materia e violacao, nao aviso.**

Aqui, ao contrario da regra de dados pessoais, reprovar e o comportamento certo:
nao ha caso legitimo em que o mesmo CNPJ tenha duas sedes. Se a carteira estiver
errada, corrige-se a carteira — em um lugar, e todas as materias acompanham.

**5. Estabelecimento e identidade, e nao atributo.**

Matriz e filial sao **fichas distintas**, cada uma com seu CNPJ completo, ligadas
por `matriz: <slug>`. Tratar filial como campo de endereco da matriz e
exatamente o que produziu o erro observado.

**6. Ficha antiga continua valendo.**

Materia que ja tem canon proprio sem `ref` carrega sem migracao. A subida e
oportunidade, nao ruptura: quem nunca criar ficha na carteira usa a ferramenta
como antes.

**7. A busca transversal enxerga as partes.**

`attorneyfw buscar` passa a achar materia pelo nome ou pelo documento da parte —
"que processos essa empresa tem conosco?" e a pergunta que a carteira ja poderia
responder e nao respondia.

## Consequences

**A favor.**

- A classe de erro observada deixa de ser possivel: uma qualificacao, um lugar.
- Cliente recorrente para de ser redigitado a cada materia, que era a origem
  mecanica da divergencia.
- Matriz e filial deixam de se confundir, que e o caso em que o erro custa mais —
  materia tributaria, trabalhista e previdenciaria seguem o estabelecimento.
- A pergunta "quantos processos esse cliente tem" ganha resposta.

**Contra, e aceito.**

- Duas camadas de canon sao mais para entender que uma. Mitigado por (6): quem
  nao usa a de cima nao paga nada.
- Corrigir a carteira muda o que sai em materias antigas ja protocoladas. E o
  comportamento desejado — o que ja foi protocolado esta nos autos, e o que sera
  gerado dali em diante deve sair certo —, mas precisa ficar visivel, e o gate o
  torna visivel.
- Nome de pessoa fisica repetido entre clientes diferentes exige slug cuidadoso.
  O documento resolve, e por isso ele e obrigatorio na ficha da carteira.

## Alternatives considered

**Manter o canon na materia e comparar entre materias no gate.** Menos invasivo e
nao resolve: comparar duas digitacoes independentes acha a divergencia depois de
ela existir, e nao impede a segunda digitacao. Alem disso obrigaria a decidir
qual das duas prevalece — que e o que a ferramenta nao pode fazer. Rejeitada.

**Base de dados de partes fora dos arquivos.** Consulta melhor, e tira a
qualificacao do versionamento, do diff e do backup do escritorio. Rejeitada pela
mesma razao que a carteira inteira e texto.

## Related

- `ADR-2026-08-31-a-carteira-e-a-memoria-institucional-resultado-no-encerramento-e-busca-transversal.md`
  — a carteira como base consultavel, que esta decisao estende as partes.
- `ADR-2026-08-31-visual-law-deriva-do-canon-e-da-cronologia-nunca-de-texto-livre.md`
  — o organograma de partes, que passa a ler a ficha da carteira.
