---
status: wip
date: 2026-08-31
req: docs/req/REQ-2026-08-31-ampliacao-pedida-pelo-escritorio-correcao-monetaria-memoria-de-casos-visual-law-custas-relatorio-e-amostra-jurisprudencial.md
adr: docs/adr/ADR-2026-08-31-numero-gerado-sai-com-procedencia-serie-e-tabela-em-arquivo-versionado-memoria-obrigatoria.md
---

# Roadmap: Ampliacao pedida pelo escritorio, em seis ondas

> Created: 2026-08-31 | Status: wip

## Context

Dez pedidos de um escritorio usuario, triados contra a 0.2.0. Tres ja existem
(1, 2, 10), um nao sera feito como pedido (4, vira semaforo), e seis viram
trabalho, nesta ordem: **9 → 6 → 5 → 7 → 11 → 3**.

REQ: `docs/req/REQ-2026-08-31-ampliacao-pedida-pelo-escritorio-correcao-monetaria-memoria-de-casos-visual-law-custas-relatorio-e-amostra-jurisprudencial.md`

ADRs:
- `docs/adr/ADR-2026-08-31-numero-gerado-sai-com-procedencia-serie-e-tabela-em-arquivo-versionado-memoria-obrigatoria.md`
- `docs/adr/ADR-2026-08-31-a-carteira-e-a-memoria-institucional-resultado-no-encerramento-e-busca-transversal.md`
- `docs/adr/ADR-2026-08-31-visual-law-deriva-do-canon-e-da-cronologia-nunca-de-texto-livre.md`
- `docs/adr/ADR-2026-08-31-prognostico-e-semaforo-com-premissas-a-vista-e-jurisprudencia-e-amostra-conferida.md`

## Por que as ondas sao sequenciais

Nao ha paralelismo real aqui, e vale registrar por que em vez de fingir que ha.
Toda onda toca `bin/attorneyfw.mjs` (roteamento e `AJUDA`), `README.md`,
`CHANGELOG.md` e `tools/lint.mjs`. Microbatches que compartilham arquivo tem de
ser sequenciais, e estes compartilham quatro.

Ha ainda duas dependencias de conteudo, nao so de arquivo:

- a **onda 5** (relatorio) precisa do `resultado` da **onda 2** e da correcao da
  **onda 1** — sem as duas, ela nao tem o que comparar nem com que corrigir;
- a **onda 6** (prognostico) le o que as ondas anteriores passaram a registrar.

Dentro de cada onda, os MLs sao sequenciais pelo mesmo motivo de arquivo.

## Acceptance Criteria

- [ ] As seis ondas concluidas, cada uma com `npm run check` verde
- [ ] Nenhuma porcentagem de probabilidade de exito em nenhuma superficie
- [ ] Nenhuma requisicao de rede dentro de calculo
- [ ] Ressalva de conferencia cobrindo prazo, correcao, custas e amostra, sob lint
- [ ] Zero dependencia de runtime nova
- [ ] CI verde em Linux e Windows ao fim de cada onda
- [ ] Plugin `attorneyfw` atualizado no `plugin-skill`

---

## Wave 1 — Item 9: correcao monetaria com memoria de calculo

> Primeira porque nao depende de nada e e a de maior retorno por hora.

### ML-1A — O nucleo do calculo

**Status:** ✅ Concluído
**Files affected:** `src/dinheiro.mjs` (novo)
**Acoes:**
1. Leitura de serie de indice em CSV (`mes,indice`), com validacao de cobertura.
2. `corrigir({ valor, de, ate, serie })` devolvendo valor e **memoria linha a linha**.
3. `juros({ valor, de, ate, taxaMes })` e a variante Selic do art. 406 do CC.
4. Fora da cobertura: erro que diz ate onde a serie vai. Nao extrapola.

**Aceite:**
- [x] Aritmetica em inteiro de centavos — sem ponto flutuante em dinheiro
- [x] Memoria com mes, indice, fator acumulado e marco inicial de cada componente
- [x] Periodo fora de cobertura falha com mensagem acionavel
- [x] Nenhuma chamada de rede neste modulo

### ML-1B — `attorneyfw indice atualizar`

**Status:** ✅ Concluído
**Files affected:** `src/indice.mjs` (novo), `bin/attorneyfw.mjs`
**Acoes:**
1. Buscar INPC, IPCA-E, IGP-M e Selic e gravar em `tabelas/indices/<serie>.csv`.
2. Gravar cabecalho de procedencia: fonte, data da coleta, cobertura.
3. Sem rede, falhar dizendo o que fazer — jamais gravar arquivo parcial.

**Aceite:**
- [x] Este e o **unico** ponto do subsistema que toca a rede
- [x] Arquivo gravado de forma atomica; coleta interrompida nao corrompe a serie
- [x] Serie ja existente e estendida, nao substituida

### ML-1C — `attorneyfw atualizar` e a ressalva

**Status:** ✅ Concluído
**Files affected:** `src/atualizar.mjs` (novo — a superficie saiu do bin, que so roteia), `bin/attorneyfw.mjs`, `tools/lint.mjs`, `test/smoke.mjs`, `README.md`, `CHANGELOG.md`, `.gitignore`, `package.json`
**Aceite:**
- [x] `--de`, `--ate`, `--juros`, `--juros-de`, `--selic`, `--serie`, `--json`
- [x] Saida sempre com memoria e procedencia, inclusive em modo resumido
- [x] Lint reprova se a ressalva de conferencia sumir da correcao monetaria
- [x] Smoke cobre um caso de correcao com aritmetica conferida a mao

---


**Medido ao fim da onda:**

- Coleta real contra o SGS do Banco Central: INPC, IPCA e IGP-M de 1994-07 a
  2026-07/08 (385 e 386 meses), Selic idem. IPCA-E ficou de fora, declarado.
- Correcao real de R$ 8.500,00 de 14.03.2024 a 31.07.2026 pelo INPC: fator
  1,10909835, corrigido R$ 9.427,34, com mora de 1% ao mes R$ 12.158,13.
- 14 asserts novos no smoke, com a aritmetica conferida a mao antes de escrever
  o teste (serie sintetica de fator exato 1,0251).

**Defeito encontrado rodando, nao lendo:** backtick dentro do template literal
do `AJUDA` quebrou o bin inteiro. O lint passou verde — ele nao parseia o bin —
e quem pegou foi o smoke, na primeira asserção que roda o CLI.

## Wave 2 — Item 6: memoria de casos

> Sequencial com a Wave 1 (mesmos arquivos de roteamento e documentacao).

### ML-2A — Resultado no `materia.yaml`

**Status:** ✅ Concluído
**Files affected:** `templates/materia.yaml`, `src/core.mjs`, `src/init.mjs`
**Aceite:**
- [x] `valor_pedido`, `resultado`, `resultado_em`, `resultado_valor`, `resultado_nota`
- [x] `resultado` restrito a `ganho|ganho_parcial|perda|acordo|extinto` ou vazio
- [x] Materia antiga sem os campos continua carregando — sem migracao forcada

### ML-2B — `materia fechar` e o aviso do gate

**Status:** ✅ Concluído
**Files affected:** `src/init.mjs`, `src/validate.mjs`, `bin/attorneyfw.mjs`
**Aceite:**
- [x] `materia fechar --resultado <r> [--valor V] [--nota "..."]`
- [x] Resultado fora do vocabulario vira erro legivel
- [x] `validate` **avisa** (nao viola) em materia toda entregue ha 90+ dias sem resultado

### ML-2C — `attorneyfw buscar`

**Status:** ✅ Concluído
**Files affected:** `src/buscar.mjs` (novo), `bin/attorneyfw.mjs`, `src/status.mjs`, `test/smoke.mjs`, `README.md`, `CHANGELOG.md`
**Aceite:**
- [x] Devolve **materias** com tipo, estado, resultado e trecho — nao linhas soltas
- [x] Varre tese, mapa, DEC e titulos de entrega; **nao** varre corpo de minuta
- [x] `--tipo` e `--resultado` filtram
- [x] `materia list`, `status` na raiz e `context` mostram o resultado

---


**Medido ao fim da onda:** 15 asserts novos. Os dois que mais importam sao
negativos — `buscar` nao pode achar termo que so existe no corpo da minuta, e
`resultado: perda` tem de sair com espaco, porque `resultado:perda` nao e um par
YAML e sim uma string solta.

**Decisao autonoma:** `gravarCampoYaml` foi extraido para o `core.mjs` em vez de
duplicar no `init.mjs` a substituicao que o `entrega.mjs` ja fazia. As duas
armadilhas — `[ 	]*` em vez de `\s*`, e reescrever a chave inteira — passaram a
ter um lugar so, com o motivo escrito ao lado.

## Wave 3 — Item 5: visual law

> Sequencial com a Wave 2. Le canon e cronologia, que a Wave 2 nao altera, mas
> compartilha `bin`, `build` e documentacao.

### ML-3A — Os tres geradores de Mermaid

**Status:** ✅ Concluído
**Files affected:** `src/diagrama.mjs` (novo), `bin/attorneyfw.mjs`
**Aceite:**
- [x] `linha-do-tempo` a partir de cronologia × canon de documentos
- [x] `partes` a partir do canon de partes
- [x] `fato-prova` ligando cada `F` ao `D` que o paga
- [x] Marco ou fato sem documento sai **visivelmente marcado** como nao provado
- [x] Nenhum diagrama aceita texto livre como fonte

### ML-3B — `build` embute, `docx` degrada

**Status:** ✅ Concluído
**Files affected:** `src/build.mjs`, `src/docx.mjs`, `README.md`, `CHANGELOG.md`
**Aceite:**
- [x] `build` embute os blocos Mermaid pedidos pela entrega
- [x] `docx` sem renderizador insere aviso e **a peca sai**
- [x] `docx` continua lendo o markdown do `build`, sem consultar canon

---

**Medido ao fim da onda:** 17 asserts novos, dogfood com cronologia real de tres
marcos — um deles sem documento, saindo marcado.

**Defeito de desenho encontrado rodando:** a marca do diagrama tinha sido
desenhada como comentario HTML, e comentario nesta ferramenta ja quer dizer nota
de trabalho — o `textoDe` o remove para nao vazar para a peca. A marca sumia
antes de o `build` ve-la, **em silencio**. Trocada por bloco cercado
```` ```diagrama ````, que e o idioma que o contrato de topico ja usa, e fixada
por um teste que exige que o comentario continue nao servindo de marca.

## Wave 4 — Item 7: custas processuais

### ML-4A — Formato da tabela e o motor

**Status:** ✅ Concluído
**Files affected:** `src/custas.mjs` (novo), `templates/custas-tribunal.yaml` (novo)
**Aceite:**
- [x] Faixas, formula, piso e teto, com `norma` e `norma_data` obrigatorios
- [x] Tabela sem `norma`/`norma_data` e recusada — procedencia nao e opcional
- [x] Tabela ausente falha dizendo qual arquivo criar

### ML-4B — `attorneyfw custas` e a ressalva

**Status:** ✅ Concluído
**Files affected:** `bin/attorneyfw.mjs`, `tools/lint.mjs`, `README.md`, `CHANGELOG.md`
**Aceite:**
- [x] Saida com norma, data e memoria de cada componente
- [x] Semente de um tribunal marcada **conferir na fonte**, e nao no `files` do pacote
- [x] Lint estende a ressalva de conferencia a custas

---

**Medido ao fim da onda:** 17 asserts novos, com o total conferido a mao sobre a
semente — 1% de R$ 85.000,00 mais R$ 50,00 fixos mais a faixa de R$ 120,00 dao
R$ 1.020,00.

**Dois defeitos, os dois encontrados rodando:**

1. `percentual: 1.0` era lido como **10%**. O leitor de numero tratava o ponto
   como milhar sempre. O orcamento saia com um zero a mais e nada avisava.
   Corrigido com uma regra so — `numeroBR` — usada por todo o subsistema de
   dinheiro.
2. O teste do tipo desconhecido trocava o **primeiro** `tipo: fixo` do arquivo,
   que esta num comentario do template. Ele exercitava nada e devolvia verde.
   Agora ancora na linha.

## Wave 5 — Item 11: relatorio ao cliente

> Depende de conteudo: `resultado` (Wave 2) e correcao (Wave 1).

### ML-5A — O relatorio

**Status:** ✅ Concluído
**Files affected:** `src/relatorio.mjs` (novo), `src/docx.mjs` (extracao do `markdownParaDocx`), `templates/materia.yaml`, `bin/attorneyfw.mjs`, `test/smoke.mjs`, `README.md`, `CHANGELOG.md`
**Aceite:**
- [x] Compara `valor_pedido` × `resultado_valor`, corrigidos pela Wave 1
- [x] **O sinal do ganho vem do papel do cliente no canon de partes**
- [x] Falta de resultado ou de papel **falha** — nao infere
- [x] Sai em markdown, e em DOCX pelo caminho existente

---

**Medido ao fim da onda:** 12 asserts. Os dois centrais usam os **mesmos**
valores — pedido 50.000, obtido 20.000 — e trocam so o papel: como autor o ganho
e 20.000 (40%); como reu, 30.000 (60%). E a prova de que o sinal esta no polo, e
nao nos numeros.

**Decisao autonoma:** o `markdownParaDocx` foi extraido do `docx.mjs` em vez de
o relatorio ganhar um gerador proprio. Gerador copiado foi exatamente o defeito
que o bookfw pagou com quatro livros.

## Wave 6 — Item 3: amostra jurisprudencial e semaforo

> Ultima porque e a unica com dependencia externa incerta.

### ML-6A — Amostra conferida

**Status:** ✅ Concluído
**Files affected:** `src/jurisprudencia.mjs` (novo), `templates/tese.md`, `templates/mapa-risco.md`, `bin/attorneyfw.mjs`
**Aceite:**
- [x] Julgado com identificador, link, resultado e razao da classificacao
- [x] Sem leitura confirmada, entra como **pendente** e assim aparece
- [x] Saida declara sempre o `n` da amostra
- [x] Nenhuma coleta automatica nesta onda — registro manual e o escopo

### ML-6B — `attorneyfw prognostico`

**Status:** ✅ Concluído
**Files affected:** `src/prognostico.mjs` (novo), `bin/attorneyfw.mjs`, `tools/lint.mjs`, `README.md`, `CHANGELOG.md`
**Aceite:**
- [x] Semaforo verde/amarelo/vermelho, com razoes apontando o artefato de origem
- [x] Criterios derivados do que o gate ja cobra — sem peso arbitrario novo
- [x] **Nenhuma porcentagem**, e lint que reprova se alguma superficie emitir uma
- [x] Smoke cobre os tres estados do semaforo

---

**Medido ao fim da onda:** 17 asserts. A guarda contra porcentagem foi
**verificada quebrando-a de proposito** — uma linha emitindo `${pct}% de exito`
em `prognostico.mjs` reprova o lint com nome e numero de linha.

**Defeito encontrado rodando:** a insercao do segundo julgado ia parar na tabela
de **Riscos**, que vem adiante no mesmo arquivo — a busca pela ultima linha de
tabela partia de um deslocamento fixo depois do titulo, e nao das fronteiras da
secao. O julgado era gravado no lugar errado e sumia da amostra sem erro nenhum.

**Decisao autonoma sobre o teste:** o semaforo e testado **pela transicao**, e
nao pela luz num instante. Fixar a luz num ponto do smoke faria o teste quebrar
a cada criterio novo sem nada de errado ter acontecido; o que tem de valer e a
regra — acrescentar um julgado contrario acrescenta exatamente um impeditivo.

## Barreira final

- [ ] `npm run check` verde
- [ ] `trackfw validate` sem violacoes de projeto
- [ ] CI verde em Linux e Windows
- [ ] Plugin publicado com `version` subida
- [ ] REQ e roadmap em `done/`, com status batendo com a pasta
