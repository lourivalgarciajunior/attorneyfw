---
status: Done
date: 2026-08-31
author: "Lourival Garcia"
adr: "ADR-2026-08-31-numero-gerado-sai-com-procedencia-serie-e-tabela-em-arquivo-versionado-memoria-obrigatoria"
roadmap: "ROADMAP-2026-08-31-ampliacao-pedida-pelo-escritorio-em-seis-ondas"
---

# REQ: Ampliacao pedida pelo escritorio — correcao monetaria, memoria de casos, visual law, custas, relatorio e amostra jurisprudencial

> Date: 2026-08-31 | Status: Done

## Decisoes que amarram esta REQ

ADR: `docs/adr/ADR-2026-08-31-numero-gerado-sai-com-procedencia-serie-e-tabela-em-arquivo-versionado-memoria-obrigatoria.md`
— ondas 1 e 4: serie e tabela em arquivo versionado, memoria e procedencia sempre.

ADR: `docs/adr/ADR-2026-08-31-a-carteira-e-a-memoria-institucional-resultado-no-encerramento-e-busca-transversal.md`
— ondas 2 e 5: resultado no encerramento e busca transversal.

ADR: `docs/adr/ADR-2026-08-31-visual-law-deriva-do-canon-e-da-cronologia-nunca-de-texto-livre.md`
— onda 3: diagrama e projecao do canon.

ADR: `docs/adr/ADR-2026-08-31-prognostico-e-semaforo-com-premissas-a-vista-e-jurisprudencia-e-amostra-conferida.md`
— onda 6: semaforo em vez de porcentagem, amostra em vez de censo.

Roadmap: `docs/roadmaps/done/ROADMAP-2026-08-31-ampliacao-pedida-pelo-escritorio-em-seis-ondas.md`

## Motivation

Um escritorio que usou a ferramenta mandou dez pedidos de funcionalidade,
numerados por ele ate onze (nao veio um oito). A triagem contra o que a 0.2.0 ja
faz esta no documento de diagnostico enviado a ele, e o resultado foi:

| Bucket | Itens | Situacao |
|---|---|---|
| ja existe | 1, 2, 10 | sumario de argumentos, de contra-argumentos e checklist de provas ja sao estrutura obrigatoria e ja sao cobrados pelo gate |
| quase pronto | 6 | a carteira ja e a base; faltam resultado e busca |
| barato | 9, 5, 11 | correcao monetaria, visual law, relatorio ao cliente |
| caro, mas vale | 7 | custas processuais |
| entregar diferente | 3, 4 | amostra conferida em vez de censo; semaforo em vez de porcentagem |

Esta REQ implementa **seis** deles, na ordem acordada: **9 → 6 → 5 → 7 → 11 → 3**.
Os itens 1, 2 e 10 nao geram trabalho — o que existe deles ja e o que deve
existir. O item 4 nao e implementado como pedido: vira o semaforo do item 3, na
forma decidida em ADR.

A ordem nao e arbitraria. O 9 e o de maior retorno por hora e nao depende de
nada. O 6 desbloqueia o 11. O 5 usa dado que ja existe. O 7 e volume de tabela,
nao dificuldade. O 3 vem por ultimo porque e o unico com dependencia externa
incerta.

## Acceptance Criteria

### Onda 1 — item 9, correcao monetaria com memoria de calculo

- [x] `attorneyfw indice atualizar [serie]` busca INPC, IPCA-E, IGP-M e Selic e grava em `tabelas/indices/<serie>.csv` na carteira
- [x] `attorneyfw atualizar <valor> --de <data> [--ate <data>]` devolve o valor corrigido
- [x] Juros de mora configuraveis: `--juros <pct-ao-mes>`, `--juros-de <data>`, e `--selic` para a taxa unica do art. 406 do CC
- [x] A saida traz **sempre** a memoria linha a linha: mes, indice, fator acumulado, e o marco inicial de cada componente
- [x] A saida traz a procedencia: qual serie, qual cobertura, e a data da ultima atualizacao do arquivo
- [x] Periodo fora da cobertura da serie **falha** com mensagem que diz ate onde a serie vai e manda atualizar — nao extrapola, nao repete, nao interpola
- [x] `--json` para consumo por outro comando
- [x] Calculo nao faz nenhuma requisicao de rede; so `indice atualizar` faz
- [x] Regra de lint estende a ressalva de conferencia a correcao monetaria

### Onda 2 — item 6, memoria de casos

- [x] `materia.yaml` ganha `valor_pedido`, `resultado`, `resultado_em`, `resultado_valor` e `resultado_nota`
- [x] `resultado` aceita apenas `ganho`, `ganho_parcial`, `perda`, `acordo`, `extinto` ou vazio
- [x] `attorneyfw materia fechar --resultado <r> [--valor V] [--nota "..."]` grava o desfecho
- [x] `attorneyfw buscar <termo> [--tipo] [--resultado]` varre a carteira e devolve **materias** com tipo, estado, resultado e trecho
- [x] A busca varre tese, mapa de risco, DEC e titulos de entrega — **nao** varre corpo de minuta
- [x] `materia list` e `status` na raiz mostram o resultado
- [x] `context` da carteira inclui o resultado das materias fechadas
- [x] `validate` **avisa** (nao viola) quando todas as entregas estao em `entregue` ha mais de 90 dias sem resultado

### Onda 3 — item 5, visual law

- [x] `attorneyfw diagrama linha-do-tempo [--materia]` gera Mermaid a partir de cronologia × canon de documentos
- [x] `attorneyfw diagrama partes` gera Mermaid a partir do canon de partes
- [x] `attorneyfw diagrama fato-prova` gera Mermaid ligando cada `F` ao `D` que o paga
- [x] Marco ou fato **sem documento** sai visivelmente marcado como nao provado
- [x] `build` embute os blocos Mermaid pedidos pela entrega
- [x] `docx` renderiza o que conseguir e, sem renderizador, insere aviso no lugar da figura — **a peca sai de qualquer modo**
- [x] `docx` continua lendo o markdown do `build` e nao consulta canon nem cronologia

### Onda 4 — item 7, custas processuais

- [x] Formato `tabelas/custas/<tribunal>-<ano>.yaml` com norma, data da norma, faixas e formula
- [x] `attorneyfw custas <valor> --tribunal <t> [--ano N]` devolve o orcamento
- [x] A saida diz qual norma aplicou, de que data, e a memoria de cada componente
- [x] Tabela ausente falha dizendo qual arquivo criar
- [x] Ao menos um tribunal semeado como exemplo de formato, marcado como **conferir na fonte**
- [x] Regra de lint estende a ressalva de conferencia a custas

### Onda 5 — item 11, relatorio de resultado ao cliente

- [x] `attorneyfw relatorio [--materia]` produz o relatorio de encerramento
- [x] Compara `valor_pedido` × `resultado_valor`, corrigidos pela onda 1
- [x] **O sinal do ganho depende do papel do cliente no canon de partes** — o mesmo par de numeros e ganho para o reu e perda parcial para o autor
- [x] Falha, sem inventar, quando falta resultado ou papel
- [x] Sai em markdown, e em DOCX pelo caminho ja existente

### Onda 6 — item 3, amostra jurisprudencial e semaforo

- [x] `tese`/`mapa` ganham secao de amostra jurisprudencial com identificador, link, resultado e a razao da classificacao
- [x] `attorneyfw jurisprudencia add` registra um julgado; sem leitura confirmada ele entra como **pendente**
- [x] A saida sempre declara o `n` da amostra — nunca a apresenta como universo
- [x] `attorneyfw prognostico` devolve **semaforo** (verde/amarelo/vermelho) com as razoes, cada uma apontando o artefato de origem
- [x] Nenhuma superficie produz porcentagem de exito
- [x] Regra de lint reprova se qualquer superficie passar a emitir probabilidade de exito

### Transversal

- [x] `npm run check` verde ao fim de cada onda; CI verde em Linux e Windows
- [x] `trackfw validate` sem violacoes de projeto antes de cada commit
- [x] README, `AJUDA` do bin e CHANGELOG atualizados a cada onda
- [x] Plugin `attorneyfw` no `plugin-skill` atualizado — skills, agentes e comandos que passam a ter superficie nova

## Escopo negativo

Nao implementar, e nao inventar por conta:

- **Nenhuma porcentagem de probabilidade de exito.** Nao e limitacao temporaria;
  e recusa, na mesma familia de nao assinar e nao protocolar. Ver ADR.
- **Nao raspar fonte que exige captcha ou que o proibe.** Fonte contratada entra
  por chave configurada pelo escritorio, ou nao entra. Nenhuma coleta se
  apresenta como navegador humano.
- **Nao classificar julgado nao lido.** Entra como pendente, visivelmente.
- **Nao fazer requisicao de rede dentro de calculo.** Rede so em comando
  explicito de atualizacao.
- **Nao extrapolar serie de indice.** Fora da cobertura, falha.
- **Nao modelar processo judicial** — sem instancias, recursos, sucumbencia ou
  transito em julgado. A materia tem desfecho, data e valor.
- **Nao gerar diagrama de texto livre.** Diagrama e projecao do canon e da
  cronologia; o que nao esta la nao entra na figura.
- **Nao deixar o `docx` reconstruir a selecao.** Ele le o markdown do `build`,
  com figuras ou sem.
- **Nao inferir o papel do cliente** para calcular ganho no relatorio. Sem papel
  declarado, o comando falha.
- **Nao remover a ressalva de conferencia** de nenhuma superficie — prazo,
  correcao, custas ou amostra. A regra de lint cobre as quatro ao fim desta REQ.
- **Nao trazer material de cliente para este repositorio.** Series, tabelas de
  custas e julgados sao da carteira, e a carteira esta no `.gitignore`. O
  repositorio traz formato e, quando muito, semente marcada.
- **Nao introduzir dependencia de runtime.** O `docx` continua opcional; nada
  mais entra.
- **Nao mexer na contagem de prazo.** Ela sai desta REQ identica ao que entrou.

## Out of scope, para depois

Registrado para nao virar trabalho inventado no meio da execucao:

- `--json` no `attorneyfw prazo`, para o hook do plugin parar de depender do
  texto da saida. Acoplamento ja declarado como aceito em ADR anterior.
- Base propria como fonte preferida do prognostico. So faz sentido com massa de
  resultados acumulada, que a onda 2 comeca a produzir.
- Mais tribunais na tabela de custas. Crescer e acrescentar arquivo, e isso e
  trabalho de conferencia do escritorio, nao de codigo.
