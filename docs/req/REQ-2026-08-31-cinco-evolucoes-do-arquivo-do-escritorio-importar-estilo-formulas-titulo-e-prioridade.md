---
status: Done
date: 2026-08-31
author: "Lourival Garcia"
adr: "ADR-2026-08-31-importar-assiste-e-nao-preenche-tudo-entra-pendente-e-o-que-nao-e-mecanico-e-recusado-em-voz-alta"
roadmap: "ROADMAP-2026-08-31-cinco-evolucoes-do-arquivo-em-cinco-ondas"
---

# REQ: Cinco evolucoes do arquivo do escritorio — importar, estilo, formulas, titulo e prioridade

> Date: 2026-08-31 | Status: Done

## Decisoes que amarram esta REQ

ADR: `docs/adr/ADR-2026-08-31-importar-assiste-e-nao-preenche-tudo-entra-pendente-e-o-que-nao-e-mecanico-e-recusado-em-voz-alta.md`
— onda 1: a porta de entrada, que assiste e nao preenche.

ADR: `docs/adr/ADR-2026-08-31-o-style-card-descreve-o-escritorio-e-nao-prescreve-o-certo.md`
— onda 2: o card descreve, com o `n` a vista.

ADR: `docs/adr/ADR-2026-08-31-formula-de-peca-e-dado-da-carteira-e-nao-literal-no-codigo.md`
— onda 3: enderecamento e fecho saem de arquivo, e nao do codigo.

ADR: `docs/adr/ADR-2026-08-31-o-gate-cobra-o-que-a-peca-anuncia-sobre-si-mesma.md`
— ondas 4 e 5: titulo que promete, e prioridade que nao bate com a idade.

Roadmap: `docs/roadmaps/done/ROADMAP-2026-08-31-cinco-evolucoes-do-arquivo-em-cinco-ondas.md`

## Motivation

As duas ampliacoes anteriores tiraram do corpus os **defeitos** das pecas. Esta
tira delas outra coisa: elas sao o **arquivo do escritorio**, e a ferramenta nao
sabe ler arquivo nenhum.

Isso e mais que uma funcionalidade faltando. A 0.4.0 decidiu que o modelo de
acao sai das materias que o escritorio ja trabalhou — e um escritorio com
quinhentas pecas no disco tem **zero** materias na carteira. Sem porta de
entrada, o `modelo destilar` destila do vazio, a memoria institucional acumula em
anos, e a busca transversal responde "nada" sobre quem tem tudo.

Medido nas oito pecas, e nao estimado:

| | |
|---|---|
| formas distintas de enderecamento | **6** |
| o que o `build` emite hoje | uma setima forma, que **nao aparece em nenhuma** delas |
| "Excelência" | 14 ocorrencias, em 5 pecas |
| "conforme … anexo" | 15 ocorrencias, em 6 pecas |
| mediana do paragrafo | 39 palavras |
| pecas que alternam Requerente/Autor **dentro de si** | **3 de 8** |
| titulo que promete `c/c` e nao pede | 1 |
| prioridade anunciada com idade que nao bate | 1 |
| CPF de parte com digito verificador invalido | 1 |

## Acceptance Criteria

### Onda 1 — importar peca arquivada

- [x] `attorneyfw importar <arquivo.docx|.txt|.md>` le e produz `docs/importado-<slug>.md`
- [x] ~~`templates/importado.md`~~ — dispensado: o relatorio e inteiramente derivado, e template que nenhum comando le e template morto (o lint reprova)
- [x] Extrai **classificado por confianca**: CPF/CNPJ com digito, enderecamento, datas, valores, candidatos a documento ("conforme … anexo"), candidatos a nome de parte
- [x] **Tudo entra como `- [x]`** — nada na tese, no plano nem no contrato de topico
- [x] Secao fixa **"o que esta importacao nao extraiu"**, sempre presente
- [x] Documento com digito invalido entra **marcado**, e nao em silencio
- [x] Partes viram **sugestao** de `attorneyfw parte new`, e nunca ficha gravada
- [x] `--criar-materia` cria so o esqueleto: pasta e `materia.yaml`, sem tese e sem plano
- [x] O arquivo importado **nao e alterado nem movido**
- [x] PDF fora do escopo, declarado na saida
- [x] Smoke cobre: extracao com digito valido e invalido, tudo pendente, e a secao do que nao foi extraido

### Onda 2 — style card

- [x] `attorneyfw estilo --de <arquivo,arquivo>` produz `estilo.yaml` na carteira
- [x] Mede tratamento do juizo, rotulo das partes, formula de lastro, ritmo de paragrafo, caixa alta
- [x] **Cada traco traz o `n`** — em quantas amostras apareceu, de quantas lidas
- [x] Nenhuma linha prescreve; todas descrevem
- [x] `attorneyfw estilo` sem `--de` mostra o card em vigor
- [x] Gate **avisa** quando uma peca usa dois rotulos para a mesma parte
- [x] Amostra pequena declarada na propria saida
- [x] Smoke reproduz o caso do corpus: peca com os dois rotulos recebe aviso

### Onda 3 — formulas de peca

- [x] `templates/formulas.yaml` com enderecamento por foro, qualificacao e fecho
- [x] `materia.yaml` ganha `foro:` — `civel|fazenda|familia|juizado|trabalho`
- [x] `build` le `formulas.yaml` da carteira quando existe
- [x] Sem o arquivo, usa a semente e **avisa uma vez** que o enderecamento nao e o do escritorio
- [x] Marcador sem valor sai **visivel** no papel, e nao como espaco em branco
- [x] O foro e **declarado**, e nunca inferido do texto de `juizo:`
- [x] Smoke cobre: formula da carteira, semente com aviso, e marcador sem valor

### Onda 4 — o titulo promete o que a peca nao pede

- [x] Gate **avisa** quando o titulo anuncia `c/c X` e o pedido nao menciona X
- [x] A mensagem mostra o que o titulo promete e o que o pedido traz
- [x] Aviso, e nao violacao
- [x] Smoke reproduz o caso do corpus

### Onda 5 — prioridade e idade

- [x] Ficha de parte ganha `nascimento:`
- [x] Idade **derivada** da data, e nunca digitada
- [x] Gate **avisa** quando ha parte com 60+ ou menor e a peca nao pede prioridade
- [x] Gate **avisa** quando a prioridade anunciada traz idade que nao bate com a ficha, com os dois lados a vista
- [x] Sem `nascimento:`, a regra nao roda — e nao ha aviso de campo faltando
- [x] Smoke cobre os tres casos

### Transversal

- [x] `npm run check` verde ao fim de cada onda; CI verde em Linux e Windows
- [x] `trackfw validate` sem violacoes de escopo de projeto antes de cada commit
- [x] README, `AJUDA` do bin e CHANGELOG atualizados a cada onda
- [x] Plugin `attorneyfw` atualizado no `plugin-skill`, com `version` subida

## Escopo negativo

Nao implementar, e nao inventar por conta:

- **A importacao nao preenche tese, plano nem contrato de topico.** Nem fato,
  nem pedido, nem fundamento. E a terceira vez que esta forma e recusada, depois
  do modelo de acao e da amostra jurisprudencial.
- **Nao extrair por modelo de linguagem.** Falso negativo silencioso e resultado
  diferente a cada execucao, num dado que vira a fonte de todas as pecas
  seguintes. O agente continua util **depois**, sobre o relatorio.
- **Nao gravar ficha de parte automaticamente.** A ficha da carteira e a que nao
  pode estar errada; a importacao sugere o comando.
- **Nao alterar nem mover a peca importada.**
- **PDF fica de fora** nesta REQ, e a saida diz isso.
- **O style card nao prescreve.** Nenhuma regra do tipo "escreva assim", e
  nenhum gate de aderencia a voz. Estilo nao se reprova.
- **Nao inferir o foro** do texto de `juizo:`. Erra pouco, e o pouco enderecca ao
  juizo errado.
- **Nao afirmar cabimento.** O gate diz que a peca anuncia e nao cumpre; nao diz
  que a tutela era cabivel nem que a prioridade e devida.
- **Nao calcular idade a partir do CPF.** Nao da — o CPF nao carrega a data.
- **Nao reprovar** nada nas ondas 2, 4 e 5: as tres tem caso legitimo, e o gate
  so reprova o que nao tem excecao.
- **Nao mexer** em prazo, correcao, custas, conferencia numerica nem
  anonimizacao. Saem desta REQ identicos ao que entraram.
- **Nao trazer material de cliente para este repositorio.** `estilo.yaml` e
  `formulas.yaml` sao da carteira.

## Out of scope, para depois

- Importacao de PDF, com ou sem OCR.
- Card de estilo por tipo de peca, em vez de um por escritorio.
- Formula de fecho e de assinatura por comarca.
