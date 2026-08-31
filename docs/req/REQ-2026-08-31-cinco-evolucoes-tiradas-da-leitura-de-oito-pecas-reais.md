---
status: Done
date: 2026-08-31
author: "Lourival Garcia"
adr: "ADR-2026-08-31-anonimizacao-e-um-mapa-aplicado-de-uma-vez-nunca-uma-varredura"
roadmap: "ROADMAP-2026-08-31-cinco-evolucoes-tiradas-do-corpus-em-cinco-ondas"
---

# REQ: Cinco evolucoes tiradas da leitura de oito pecas reais

> Date: 2026-08-31 | Status: Done

## Decisoes que amarram esta REQ

ADR: `docs/adr/ADR-2026-08-31-anonimizacao-e-um-mapa-aplicado-de-uma-vez-nunca-uma-varredura.md`
— onda 1: o mapa aplicado de uma vez, e a deteccao que so acusa.

ADR: `docs/adr/ADR-2026-08-31-numero-se-confere-contra-si-mesmo-e-contra-o-documento-de-onde-foi-transcrito.md`
— ondas 2 e 5: extenso, soma, item x pedido, e transcricao com lastro.

ADR: `docs/adr/ADR-2026-08-31-o-canon-sobe-para-a-carteira-parte-recorrente-tem-uma-qualificacao-so.md`
— onda 3: uma qualificacao por parte, na carteira.

ADR: `docs/adr/ADR-2026-08-31-modelo-por-tipo-de-acao-sai-do-arquivo-do-escritorio-nunca-de-conhecimento-generico.md`
— onda 4: modelo destilado do arquivo, nunca gerado do nada.

Roadmap: `docs/roadmaps/done/ROADMAP-2026-08-31-cinco-evolucoes-tiradas-do-corpus-em-cinco-ondas.md`

## Motivation

A ampliacao da 0.3.0 nasceu de **pedidos**. Esta nasce de **evidencia**: oito
pecas reais de areas diferentes, lidas em conjunto, com os defeitos conferidos um
a um.

Os cinco itens abaixo tem, cada um, pelo menos um caso encontrado no corpus. Nao
ha aqui nenhuma funcionalidade proposta por parecer boa ideia.

| # | O que | Caso encontrado |
|---|---|---|
| 1 | anonimizacao por mapa | tres pecas anonimizadas pela metade; numa delas sobrou o CPF de uma crianca ao lado do diagnostico |
| 2 | conferencia numerica | extenso divergindo do algarismo num alvara; item de lista malformado, e assim tambem no pedido, numa declaratoria |
| 3 | canon na carteira | o mesmo CNPJ e filial de Pernambuco numa peca e autora com inscricao no Parana noutra |
| 4 | modelo por tipo de acao | oito tipos de acao no arquivo, cada um sabendo quais documentos foram juntados |
| 5 | transcricao com lastro | valor transcrito errado **dentro das aspas** da citacao do auto de infracao |

A ordem segue o dano, e nao a facilidade. O item 1 e o unico em que o erro sai do
processo e alcanca quem nao e parte de nada.

## Acceptance Criteria

### Onda 1 — anonimizacao por mapa

- [x] `templates/anonimizacao.yaml` com pares `real: ficticio` e a explicacao do porque do mapa
- [x] `attorneyfw anonimizar [entrega]` aplica **todos** os pares sobre **todo** o texto, numa passada
- [x] Par que nao pode ser aplicado **falha e nao grava nada** — nunca meia substituicao no disco
- [x] `--reverter` desfaz, usando o mesmo mapa
- [x] `attorneyfw dados [entrega]` detecta CPF, CNPJ, RG, e-mail, telefone e cartao, e **nao substitui nada**
- [x] A saida da deteccao declara que reconhece **formato, e nao pessoa** — nome proprio nao se detecta
- [x] O gate **avisa** (nao viola) quando ha dado com formato reconhecivel fora do mapa
- [x] `anonimizacao.yaml` no `.gitignore` do CLI — e a chave que desfaz tudo de uma vez
- [x] Smoke cobre: aplicacao total, recusa de aplicacao parcial, ida e volta, e a deteccao sem substituicao

### Onda 2 — conferencia numerica

- [x] `attorneyfw conferir <entrega>` roda sobre o markdown que o `build` gerou
- [x] Confere **extenso x algarismo** em `R$ N,NN (por extenso)`
- [x] Confere **soma** quando a peca declara total a partir de parcelas
- [x] Confere **item alegado x item pedido** em lista enumerada
- [x] Aponta item faltante na sequencia, item malformado, e item no pedido ausente dos fatos
- [x] O valor do item e capturado **inteiro** e classificado depois — capturar so o que tem a forma esperada faz item malformado virar "indice faltante", que e outro defeito e outra correcao
- [x] Divergencia sai **sempre como par**, com os dois lados a vista — nunca "valor incorreto"
- [x] **Nao corrige nada automaticamente**, em nenhuma das tres verificacoes
- [x] `--json`
- [x] Smoke reproduz os tres casos do corpus, com os numeros conferidos a mao

### Onda 3 — canon na carteira

- [x] `partes/<slug>.md` na raiz da carteira, com documento obrigatorio
- [x] `attorneyfw parte new "Nome" --documento <cpf|cnpj>` cria a ficha da carteira
- [x] Ficha da materia aceita `ref: <slug>` e herda a qualificacao
- [x] **Papel e da materia; qualificacao e da carteira**
- [x] Matriz e filial sao fichas distintas, ligadas por `matriz: <slug>`
- [x] Divergencia entre a ficha da carteira e a da materia e **violacao**, nao aviso
- [x] Ficha antiga sem `ref` continua carregando, sem migracao
- [x] `attorneyfw buscar` acha materia por nome ou documento de parte
- [x] `attorneyfw diagrama partes` le a ficha da carteira quando ha `ref`
- [x] Smoke reproduz o caso do corpus: o mesmo documento com duas sedes reprova

### Onda 4 — modelo por tipo de acao

- [x] ~~`templates/modelo-acao.yaml`~~ — dispensado: o arquivo e inteiramente derivado, e template que nenhum comando le e template morto (o lint reprova). O formato esta no cabecalho que o `destilar` escreve
- [x] `attorneyfw modelo destilar <tipo> --de <slug,slug>` produz `modelos/<tipo>.yaml`
- [x] **Cada linha carrega o slug das materias de origem e em quantas apareceu**
- [x] Item apoiado em uma materia so sai marcado como tal
- [x] `attorneyfw modelo aplicar <tipo>` cria itens **pendentes** na materia — nada dado por provado
- [x] Tipo sem materia de origem **falha**, e a mensagem manda usar o agente de fundamento
- [x] A saida declara sempre o `n` de materias destiladas
- [x] Smoke cobre destilacao, aplicacao e a recusa por falta de origem

### Onda 5 — transcricao com lastro

- [x] Bloco de transcricao declara o id do documento no canon
- [x] Numeros dentro da transcricao sao conferidos contra os que a ficha do documento registra
- [x] Numero que a ficha nao conhece vira **aviso**, nao violacao
- [x] Transcricao sem documento declarado e apontada pelo gate
- [x] Smoke reproduz o caso do corpus: valor divergente dentro das aspas

### Transversal

- [x] `npm run check` verde ao fim de cada onda; CI verde em Linux e Windows
- [x] `trackfw validate` sem violacoes de escopo de projeto antes de cada commit
- [x] README, `AJUDA` do bin e CHANGELOG atualizados a cada onda
- [x] Plugin `attorneyfw` atualizado no `plugin-skill`, com `version` subida

## Escopo negativo

Nao implementar, e nao inventar por conta:

- **Nenhum corretor gramatical.** Ha erro de concordancia e digitacao em quase
  todas as oito pecas; o Word ja pega. Construir seria gastar a ferramenta na
  unica camada em que ela nao tem vantagem.
- **Nenhuma substituicao automatica de dado pessoal.** Deteccao acusa, e o texto
  sai intacto. Substituir por asterisco produziria o mesmo falso "acabou" que o
  corpus mostrou.
- **Nao prometer deteccao de nome proprio.** Reconhece-se formato, e a saida diz
  isso. Foi nome proprio que escapou nas tres pecas, e nenhum regex o acharia.
- **Nao corrigir extenso, soma nem item.** A ferramenta aponta o par; qual lado
  prevalece e de quem assina — e nas tres pecas o lado certo foi diferente.
- **Nao decidir qual ficha esta certa** quando carteira e materia divergem. O
  gate reprova e mostra as duas.
- **Nenhum modelo de acao embutido no CLI.** Sem materia de origem, nao ha
  modelo. Modelo generico seria a ferramenta afirmando direito que ninguem
  conferiu.
- **Nao distribuir modelo entre escritorios.** Modelo e material de cliente
  destilado; o repositorio traz o formato.
- **Nao dar nada por provado a partir de modelo.** O que ele cria e pendencia,
  e o gate continua cobrando a tese como cobra hoje.
- **Nao ler numero dentro de imagem.** Fica declarado, nao escondido.
- **Nao introduzir dependencia de runtime.** O `docx` continua a unica opcional.
- **Nao mexer em prazo, correcao monetaria nem custas.** Saem desta REQ
  identicos ao que entraram.
- **Nao trazer material de cliente para este repositorio.** `anonimizacao.yaml`,
  `partes/` e `modelos/` sao da carteira, e entram no `.gitignore`.

## Out of scope, para depois

- Reconhecimento de entidade nomeada para achar nome proprio. So valeria com
  garantia que hoje nao existe, e falso negativo silencioso e o defeito que esta
  REQ combate.
- Conferencia de numero dentro de imagem anexada.
- Modelo de acao compartilhado entre escritorios do mesmo grupo.
