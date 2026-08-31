---
status: Accepted
date: 2026-08-31
author: "Lourival Garcia"
---

# ADR: Numero gerado sai com procedencia — serie e tabela em arquivo versionado, memoria obrigatoria

> Date: 2026-08-31 | Status: Accepted

## Context

Um escritorio pediu duas coisas que, na superficie, sao a mesma: correcao
monetaria com juros (item 9 da lista) e orcamento de custas processuais
(item 7). A formulacao dele para a primeira foi *"se eu pudesse so informar a
data de vencimento num prompt e a minuta ja vier com o valor atualizado e
memoria de calculo eu ganharia muuuuiiiitoooo tempo"*. Para a segunda:
*"a gente que tem acoes no Brasil inteiro, cada justica tem uma tabela"*.

As duas produzem **um numero que vai para uma peca ou para um orcamento a
cliente**. E ai comeca o problema, que nao e de aritmetica.

Ha tres desenhos possiveis, e dois sao ruins:

**Raspagem ao vivo.** O comando consulta o site do tribunal ou o do indice na
hora. Parece o mais atualizado e e o pior: a saida nao sabe dizer de onde veio,
a pagina muda de layout e o comando quebra em silencio ou — pior — devolve
numero errado, e o resultado nao e reproduzivel. Rodar duas vezes com um mes de
intervalo pode dar dois numeros sem que nada no output explique a diferenca.

**Numero embutido no codigo.** Reproduzivel e sempre desatualizado. Custas
mudam por resolucao anual; a tabela que estava certa em janeiro nao esta em
dezembro, e quem le a saida nao tem como saber qual das duas usou.

**Serie e tabela em arquivo versionado.** Reproduzivel, datada, auditavel, e o
custo de manter e um comando de atualizacao.

Ha um segundo eixo, independente do primeiro: **o que a saida entrega junto com
o numero.** Uma correcao monetaria que devolve `R$ 14.208,73` e inutil na pratica
— a outra parte impugna e o juiz nao homologa sem conferir. O que se usa numa
peca e a memoria: indice de cada mes, fator acumulado, marco inicial de cada
juro, e a norma de cada componente. Sem a memoria, o tempo economizado na
minuta e gasto de volta na impugnacao, com juros.

Esta e a mesma familia de decisao que ja governa o `contarPrazo`: a contagem e
**conferencia**, nao a contagem oficial, e a ressalva e cobrada por regra de
lint que reprova o build se sumir.

## Decision

**1. Toda serie e toda tabela normativa mora em arquivo, na carteira, versionada.**

`tabelas/indices/<serie>.csv` para as series (INPC, IPCA-E, IGP-M, Selic) e
`tabelas/custas/<tribunal>-<ano>.yaml` para as tabelas de custas. O repositorio
do CLI traz apenas o **formato** e, quando muito, uma semente; o conteudo e da
carteira, como o `escritorio.yaml` e as materias.

**2. A rede so entra por um comando explicito de atualizacao, nunca no calculo.**

`attorneyfw indice atualizar` busca e grava; `attorneyfw atualizar` apenas le o
que esta gravado. Calculo nunca faz requisicao. Consequencia deliberada: o
calculo funciona offline, e o mesmo comando com os mesmos arquivos devolve
sempre o mesmo numero.

**3. Todo numero gerado sai acompanhado de procedencia e memoria.**

Procedencia e o par **norma + data**: qual resolucao, de quando; qual serie,
publicada quando, com que cobertura. Memoria e o passo a passo aritmetico.
Nenhum comando devolve valor final sozinho — nem em modo resumido.

**4. Quando a serie nao cobre o periodo pedido, o comando falha.**

Nao extrapola, nao repete o ultimo indice, nao interpola. Diz ate onde vai e
manda atualizar. Estimar silenciosamente e a forma mais facil de produzir um
numero errado com aparencia de certo.

**5. A ressalva de conferencia vale para todos eles, sob a mesma regra de lint.**

A regra que hoje protege a ressalva do prazo passa a cobrir correcao e custas.
O texto muda de assunto, o mecanismo e o mesmo: se a ressalva sumir de qualquer
superficie, o build reprova.

## Consequences

**A favor.**

- Reproduzivel: mesmo arquivo, mesmo numero, hoje e daqui a um ano.
- Auditavel: a saida diz qual norma aplicou e de que data. Quem discorda ataca
  a norma, nao o software.
- Offline: calculo nao depende de rede, o que importa numa audiencia.
- Um formato de tabela serve para todos os tribunais; crescer e acrescentar
  arquivo, nao codigo.

**Contra, e aceito.**

- A serie envelhece se ninguem rodar a atualizacao. Mitigado por (4): o comando
  falha em vez de mentir, e a falha diz o que fazer.
- Publicar uma tabela de custas nova da trabalho manual a cada resolucao. E
  trabalho de conferencia, que e exatamente onde ele deve estar.
- O CLI nao vem com dados prontos. Carteira nova comeca com tabela vazia — mas
  material normativo de escritorio nao entra neste repositorio, pela mesma
  regra que ja mantem `materias/` fora dele.

## Alternatives considered

**API paga de calculo judicial.** Resolveria a manutencao da serie e criaria
dependencia externa num numero que vai para peca — sem poder mostrar a memoria,
que e o unico formato que a peca aceita. Rejeitada.

**Aceitar o numero sem memoria em modo resumido.** Tentador para a saida de
terminal. Rejeitada porque o modo resumido e o que acaba copiado para a peca.

## Related

- `ADR-2026-08-31-prazo-material-conta-pelo-ctn-e-a-divergencia-do-termo-inicial-sai-declarada.md`
  — a mesma politica aplicada a contagem de prazo, e a origem da regra de lint.
- `ADR-2026-08-31-prognostico-e-semaforo-com-premissas-a-vista-e-jurisprudencia-e-amostra-conferida.md`
  — o caso em que a procedencia nao pode ser garantida, e a consequencia disso.
