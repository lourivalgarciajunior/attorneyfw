---
status: Accepted
date: 2026-08-31
author: "Lourival Garcia"
---

# ADR: A agenda de prazos sai tambem como contrato tipado, com a ressalva dentro do payload

> Date: 2026-08-31 | Status: Accepted

## Context

O hook `SessionStart` do plugin — `scripts/carteira-em-foco.mjs` — poe a carteira
em foco quando a sessao abre dentro dela. Ele roda `attorneyfw prazo --dias 15` e
**le a saida de texto**. Tres acoplamentos, todos ao vocabulario do relatorio:

| O hook decide | Lendo |
|---|---|
| se a agenda esta vazia | `linha.startsWith('nenhum prazo')` ou `'nenhuma materia'` |
| **se ha prazo vencido** | `linha.includes('VENCIDO')` |
| o que exibir | as linhas do CLI, depois de tirar a cor com regex |

O do meio e o que importa. `VENCIDO` e a palavra que dispara o unico alarme deste
plugin: *"HA PRAZO VENCIDO COM ENTREGA EM ABERTO. Trate antes de qualquer outra
coisa."* Se alguem reescrever aquele rotulo — para `EXPIRADO`, para `vencido ha
3d`, para qualquer coisa —, **o hook para de gritar e continua imprimindo a
agenda**. Nada falha, nada avisa, e o unico erro desta ferramenta que custa o caso
do cliente passa a nao ter alarme.

Esse acoplamento foi registrado como aceito quando o hook nasceu, e a razao era
boa: nao havia saida tipada, e inventar uma so para o hook seria construir um
segundo formato sem consumidor. Hoje ha tres comandos com `--json` — `validate`,
`conferir` e `dinheiro` —, o padrao esta estabelecido, e o consumidor existe.

Ha um segundo fato que decide a forma da saida. O `c.*` do core **sempre** emite
ANSI: nao ha teste de TTY. Por isso o hook carrega um `semCor()` proprio. Qualquer
formato tipado que repita as sequencias de cor mantem esse problema.

E ha uma armadilha especifica deste comando, que nao existia nos outros tres. A
contagem de prazo desta ferramenta e **conferencia, e nao a contagem oficial** —
regra tao central que ha lint reprovando o build se a ressalva sumir do README, do
bin ou do `src/prazo.mjs`. Um payload tipado e feito para ser consumido por
programa, e programa **nao le rodape**. Se a ressalva ficar so na renderizacao de
texto, o numero viaja sozinho para dentro de qualquer consumidor — e um prazo
apresentado como oficial e exatamente o defeito que o resto da ferramenta gasta
esforco para nao cometer.

## Decision

**1. `attorneyfw prazo --json` emite a agenda como payload tipado.**

Somente a agenda. `prazo set` continua sem `--json`: ele grava, e quem grava le a
confirmacao. Hook nenhum chama `set`.

**2. A ressalva e um campo do payload, e nao uma linha do relatorio.**

`ressalva` no topo, com o mesmo texto que a saida de terminal ja imprime. Programa
nao le rodape — se a ressalva nao for dado, ela nao chega ao consumidor.

**3. O payload declara `versao`.**

Um consumidor que parseia campo precisa poder recusar o que nao entende. Sem
numero de versao, renomear um campo troca um acoplamento de texto por um
acoplamento de forma, que quebra igual e sem aviso.

**4. O que hoje e rotulo renderizado vira dado.**

`vencido: true`, `restam: -3`, `fatal: true`, `regime`, `divergencia` como objeto.
Nunca a palavra `VENCIDO` como sinal. E o que mata o acoplamento que importa.

**5. Cada entrada carrega tambem `linha`: a linha que o CLI imprimiria, sem cor.**

Sem isso o consumidor teria de reformatar, e o comentario do proprio hook ja
nomeia por que isso e ruim: *"reformata-la aqui so criaria uma segunda maneira de
apresentar a mesma coisa, e uma delas ficaria para tras."*

Entao: **decide-se pelos campos, exibe-se pela `linha`.** Nenhum dos dois lados
reimplementa o outro, e nao ha segunda renderizacao para envelhecer.

**6. A `linha` sai sem ANSI, por construcao.**

Nao e o consumidor que tira a cor. O `c.*` do core sempre colore, e delegar a
limpeza cria um `semCor()` em cada consumidor — cada um com um regex diferente,
cada um errando de um jeito.

**7. Prazo mal declarado entra no payload, e nao some.**

A linha de erro (`prazo_intimacao "..." nao e AAAA-MM-DD`) e uma entrada com
`erro` preenchido. Um consumidor que so lesse as entradas validas deixaria de fora
justamente a materia cujo prazo ninguem consegue calcular — que e o pior silencio
possivel aqui.

**8. O codigo de saida nao muda.**

`--json` continua saindo com 1 quando ha vencido. Consumidor que ignora o payload
inteiro ainda recebe o sinal.

**9. O hook passa a decidir pelos campos, e continua nao recalculando nada.**

A regra 2 do proprio hook — *"nunca reimplementa contagem"* — vale igual: ele le o
que o CLI diz, agora em forma que nao se quebra por reescrita de rotulo.

## Consequences

**A favor.**

- O alarme de prazo vencido deixa de depender de uma palavra. Era o unico
  acoplamento desta ferramenta cuja quebra e silenciosa **e** cara.
- O `semCor()` do hook desaparece, e com ele o regex de ANSI duplicado.
- A ressalva passa a viajar com o numero, para qualquer consumidor futuro.
- Fecha o padrao: quatro comandos com `--json`, todos com a mesma forma.

**Contra, e aceito.**

- O payload precisa ser mantido junto com a renderizacao: campo novo no relatorio
  que nao entre no JSON cria divergencia. Mitigado pela `linha`, que sai da mesma
  funcao que o terminal usa.
- `versao: 1` e uma promessa de estabilidade que custa disciplina depois.
- Um segundo formato para manter. Aceito: ele nao e novo — e o mesmo que
  `validate`, `conferir` e `dinheiro` ja tem.

## Alternatives considered

**Deixar o hook rodar o CLI duas vezes — JSON para decidir, texto para exibir.**
Dobra o custo do `SessionStart`, com timeout de 10s cada. Rejeitada em favor da
`linha` dentro do payload.

**Reformatar no hook, a partir dos campos.** E a segunda renderizacao que o
proprio hook diz que nao quer, e a que ficaria para tras. Rejeitada.

**Ressalva so no relatorio de texto.** E o estado de hoje, e e o que faz o numero
viajar sozinho. Rejeitada, com regra de lint para nao voltar.

**Estender o `--json` a `prazo set`.** Nao ha consumidor, e formato sem consumidor
nasce desatualizado. Fora de escopo, e registrado aqui para nao ser confundido com
esquecimento.

## Related

- `ADR-2026-08-31-prazo-material-conta-pelo-ctn-e-a-divergencia-do-termo-inicial-sai-declarada.md`
  — a divergencia do art. 210 que o payload passa a carregar como objeto.
- `ADR-2026-08-31-numero-gerado-sai-com-procedencia-serie-e-tabela-em-arquivo-versionado-memoria-obrigatoria.md`
  — a mesma familia: numero nao viaja sem de onde veio e sem o que ele nao e.
