---
status: Accepted
date: 2026-08-31
author: "Lourival Garcia"
---

# ADR: Importar assiste e nao preenche — tudo entra pendente, e o que nao e mecanico e recusado em voz alta

> Date: 2026-08-31 | Status: Accepted

## Context

A 0.4.0 entregou o `modelo destilar`, que tira o checklist de um tipo de acao das
materias que o escritorio ja trabalhou. E a decisao que o sustenta e que **sem
materia de origem nao ha modelo** — modelo generico seria a ferramenta afirmando
direito que ninguem conferiu.

Ao rodar isso contra a realidade, aparece o problema: **um escritorio com
quinhentas pecas no disco tem zero materias na ferramenta.** O arquivo existe, o
conhecimento existe, e a carteira comeca vazia. Ninguem vai redigitar. Sem
caminho de entrada, o `destilar` destila do vazio, a memoria institucional
acumula em anos em vez de dias, e a busca transversal responde "nada" sobre um
escritorio que tem tudo.

O mesmo vale para as duas coisas que a leitura do corpus mostrou serem
derivaveis do arquivo: o style card e as formulas de endereçamento. Todas
dependem de haver arquivo **dentro** da ferramenta.

Isto e, portanto, a porta de entrada. E porta de entrada tem um risco proprio:
parsing de peca alheia erra.

Foi possivel medir quanto. Nas oito pecas do corpus, o que sai por regra
mecanica e confiavel:

| O que | Como | Confiabilidade |
|---|---|---|
| CPF e CNPJ | forma + digito verificador | alta — o digito ja reprovou um CPF invalido no corpus |
| endereçamento | primeira linha, padrao de juizo | alta — 6 formas distintas em 8 pecas, todas reconheciveis |
| datas | forma `dd/mm/aaaa` e `dd.mm.aaaa` | alta na forma, **nenhuma** no significado |
| valores | `R$ n,nn` | alta na forma, nenhuma no papel que exercem |
| documentos | "conforme … anexo" | media — a expressao aponta prova, e nao diz qual |
| nome da parte | maiuscula antes do documento | media — pega tambem juizo e cabecalho |
| tipo de acao | titulo do arquivo ou linha do pedido | media |

E o que **nao** sai: qual fato e controvertido, qual documento prova o que, qual
fundamento sustenta qual pedido, qual e a tese. Isso e leitura, e leitura nao se
extrai por regra.

Ha um antecedente direto na propria ferramenta, decidido duas vezes: o modelo
cria pendencia e nao verdade, e a amostra jurisprudencial registra julgado nao
lido como pendente. Importacao que preenche a tese seria a terceira chance de
cometer o mesmo erro, e a mais tentadora, porque o resultado parece trabalho
pronto.

## Decision

**1. A importacao produz um relatorio de pendencias, e nao uma materia pronta.**

`docs/importado-<origem>.md`, com tudo em `- [ ]`, para uma pessoa confirmar ou
descartar item a item. E o mesmo formato do checklist do modelo, pelo mesmo
motivo.

**2. Nada entra na tese, no plano nem no contrato de topico.**

Nem fato, nem pedido, nem fundamento. O gate continua cobrando o que cobra, e a
cadeia continua comecando pela DEC. Uma peca importada e material bruto, e nao
uma materia governada.

**3. O que e mecanico entra classificado por confianca; o resto e recusado em
voz alta.**

Cada item traz de onde foi extraido e com que confianca. E ha uma secao fixa —
**"o que esta importacao nao extraiu"** — que lista, sempre, o que so a leitura
resolve. Silencio sobre o que faltou seria a importacao se apresentando como
completa.

**4. Documento com digito verificador invalido entra marcado, e nao entra em
silencio.**

No corpus, um CPF de requerente nao fecha o digito. Importar sem conferir teria
propagado o erro para a ficha da carteira, que e a fonte de todas as pecas
seguintes.

**5. `--criar-materia` e opcional, e cria o esqueleto vazio.**

Pasta, `materia.yaml` com o que foi extraido com confianca alta, e o relatorio
ao lado. Sem tese, sem plano, sem entrega.

**6. Partes viram sugestao de ficha da carteira, e nunca ficha gravada.**

O comando imprime o `attorneyfw parte new` correspondente. Gravar direto
significaria criar qualificacao sem ninguem ter olhado — e a ficha da carteira e
justamente a que nao pode estar errada, porque todas as materias herdam dela.

**7. A peca importada nao e alterada, nem movida.**

Le-se e escreve-se ao lado. O arquivo do escritorio e do escritorio.

## Consequences

**A favor.**

- A ferramenta passa a ter caminho de adocao para quem ja tem arquivo, que e
  todo mundo que ela serve.
- O `modelo destilar`, o style card e as formulas de peca deixam de depender de
  meses de uso para ter insumo.
- O que a maquina faz bem — conferir digito, achar forma, contar — entra; o que
  ela faz mal fica declarado como faltante.
- A qualificacao importada passa pelo mesmo dedo verificador que ja pegou um
  erro no corpus.

**Contra, e aceito.**

- Importar da trabalho: alguem confere item a item. E menos trabalho que
  redigitar, e mais que apertar um botao — e o botao produziria uma carteira
  cheia de coisa nao conferida, que e pior que carteira vazia.
- A extracao de nome de parte pega ruido (juizo, cabecalho, nome de advogado).
  Aceito: vem marcado como confianca media, e descartar e um risco de caneta.
- PDF fica de fora nesta versao. Declarado, e nao escondido.

## Alternatives considered

**Importacao que preenche tese e plano.** Produz trabalho aparente e uma cadeia
de governanca que ninguem decidiu — exatamente o contrario do que a ferramenta
existe para impor. Rejeitada; e a terceira vez que esta forma e recusada, depois
do modelo e da amostra jurisprudencial.

**Extracao por modelo de linguagem.** Acharia o que a regra nao acha — fato
controvertido, papel do documento —, com falso negativo silencioso e resultado
diferente a cada execucao. Aqui a garantia importa mais que o alcance: o que
entra na carteira e a fonte de todas as pecas seguintes. Rejeitada para a
extracao; o agente continua util **depois**, sobre o relatorio, com o advogado
junto.

## Related

- `ADR-2026-08-31-modelo-por-tipo-de-acao-sai-do-arquivo-do-escritorio-nunca-de-conhecimento-generico.md`
  — o consumidor direto do que a importacao traz.
- `ADR-2026-08-31-o-canon-sobe-para-a-carteira-parte-recorrente-tem-uma-qualificacao-so.md`
  — a ficha que a importacao sugere, e que por isso nao pode ser gravada sozinha.
