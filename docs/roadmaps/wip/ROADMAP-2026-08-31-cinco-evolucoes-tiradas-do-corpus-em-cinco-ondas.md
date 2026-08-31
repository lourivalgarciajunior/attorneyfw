---
status: wip
date: 2026-08-31
req: docs/req/REQ-2026-08-31-cinco-evolucoes-tiradas-da-leitura-de-oito-pecas-reais.md
adr: docs/adr/ADR-2026-08-31-anonimizacao-e-um-mapa-aplicado-de-uma-vez-nunca-uma-varredura.md
---

# Roadmap: Cinco evolucoes tiradas do corpus, em cinco ondas

> Created: 2026-08-31 | Status: wip

## Context

Oito pecas reais de areas diferentes, lidas em conjunto. Cada uma das cinco
ondas tem pelo menos um defeito encontrado e conferido no corpus — nenhuma nasce
de parecer boa ideia.

REQ: `docs/req/REQ-2026-08-31-cinco-evolucoes-tiradas-da-leitura-de-oito-pecas-reais.md`

ADRs:
- `docs/adr/ADR-2026-08-31-anonimizacao-e-um-mapa-aplicado-de-uma-vez-nunca-uma-varredura.md`
- `docs/adr/ADR-2026-08-31-numero-se-confere-contra-si-mesmo-e-contra-o-documento-de-onde-foi-transcrito.md`
- `docs/adr/ADR-2026-08-31-o-canon-sobe-para-a-carteira-parte-recorrente-tem-uma-qualificacao-so.md`
- `docs/adr/ADR-2026-08-31-modelo-por-tipo-de-acao-sai-do-arquivo-do-escritorio-nunca-de-conhecimento-generico.md`

## Por que as ondas sao sequenciais

Todas tocam `bin/attorneyfw.mjs`, `README.md`, `CHANGELOG.md` e `tools/lint.mjs`.
Microbatches que compartilham arquivo tem de ser sequenciais.

Ha ainda duas dependencias de conteudo: a **onda 5** precisa do comparador
numerico da **onda 2** e da ficha de documento que a **onda 3** consolida; e a
**onda 4** destila do canon que a onda 3 arruma.

## Acceptance Criteria

- [ ] As cinco ondas concluidas, cada uma com `npm run check` verde
- [ ] Nenhuma substituicao automatica de dado pessoal
- [ ] Nenhuma correcao automatica de extenso, soma ou item
- [ ] Nenhum modelo de acao sem materia de origem
- [ ] Zero dependencia de runtime nova
- [ ] CI verde em Linux e Windows ao fim de cada onda
- [ ] Plugin `attorneyfw` atualizado no `plugin-skill`

---

## Wave 1 — Anonimizacao por mapa

> Primeira porque e o unico caso em que o erro sai do processo e alcanca quem
> nao e parte de nada.

### ML-1A — O mapa e a aplicacao total

**Status:** ✅ Concluído
**Files affected:** `src/anonimizar.mjs` (novo), `templates/anonimizacao.yaml` (novo)
**Acoes:**
1. Leitura do mapa `real: ficticio`, com recusa de par curto demais ou ambiguo.
2. Aplicacao de **todos** os pares sobre **todo** o texto, numa passada.
3. `--reverter` pelo mesmo mapa.
4. Falha antes de gravar quando algum par nao pode ser aplicado.

**Aceite:**
- [x] Nunca grava meia substituicao — e a propriedade central desta onda
- [x] A mesma pessoa recebe o mesmo nome ficticio em toda peca da materia
- [x] Ida e volta devolve o texto original, byte a byte

### ML-1B — Deteccao que so acusa

**Status:** ✅ Concluído
**Files affected:** `src/dados.mjs` (novo), `bin/attorneyfw.mjs`
**Aceite:**
- [x] CPF, CNPJ, RG, e-mail, telefone e cartao reconhecidos; **texto intacto**
- [x] CPF e CNPJ validados por digito verificador — reduz falso positivo
- [x] A saida declara que reconhece formato, e nao pessoa
- [x] Aponta o que esta fora do mapa, quando ha mapa

### ML-1C — O gate, o `.gitignore` e a documentacao

**Status:** ✅ Concluído
**Files affected:** `src/validate.mjs`, `.gitignore`, `tools/lint.mjs`, `test/smoke.mjs`, `README.md`, `CHANGELOG.md`
**Aceite:**
- [x] Gate **avisa** (nao viola) sobre dado com formato reconhecivel fora do mapa
- [x] `anonimizacao.yaml` ignorado — e a chave que desfaz tudo de uma vez
- [x] Smoke cobre aplicacao total, recusa parcial, ida e volta, e deteccao sem substituicao

---

**Medido ao fim da onda:** 16 asserts novos. Os que importam sao os quatro de
**recusa** — o comando tem de falhar sem gravar — e o de **ida e volta byte a
byte**, que e a propriedade que sustenta as outras.

**Decisao autonoma:** so a forma declarada e a MAIUSCULA sao aceitas. Reconstruir
caixa mista (`José da Silva`) quebraria a ida e volta, porque o `da` minusculo
nao se recupera. Preferiu-se falhar dizendo qual par acrescentar a devolver texto
quase igual ao original.

**Correcao num teste, nao no codigo:** o assert do gate amarrava ao codigo de
saida do `validate`, e por isso quebrava junto com qualquer violacao que a
fixture tivesse por outro motivo. A propriedade e "avisa, e nao reprova por
isso" — hoje ele confere que a linha do achado e uma linha de aviso.

## Wave 2 — Conferencia numerica

### ML-2A — Os tres comparadores

**Status:** ✅ Concluído
**Files affected:** `src/conferir.mjs` (novo)
**Aceite:**
- [x] Extenso x algarismo, com parser de valor por extenso em portugues
- [x] Soma declarada x parcelas
- [x] Item alegado x item pedido, com faltante, malformado e orfao
- [x] Toda divergencia sai como **par**, com os dois lados
- [x] Nada e corrigido

### ML-2B — `attorneyfw conferir`

**Status:** ✅ Concluído
**Files affected:** `bin/attorneyfw.mjs`, `test/smoke.mjs`, `README.md`, `CHANGELOG.md`
**Aceite:**
- [x] Roda sobre o markdown que o `build` gerou, e recostura se faltar
- [x] `--json`
- [x] Smoke reproduz os tres casos do corpus, conferidos a mao antes do teste

---

**Medido ao fim da onda:** 10 asserts, e o comparador rodado contra as **oito
pecas do corpus**. Sobre elas ele aponta exatamente dois achados, e nenhum falso
positivo: o extenso do alvara e o item malformado da declaratoria.

**O que esta onda mediu de mais util nao foi um defeito na peca — foi um na
analise.** A leitura manual dizia "falta o item 35" e "o pedido tem numero
ausente dos fatos". Nenhum indice falta: o regex manual era estrito demais e
derrubava o item malformado e um terminado por virgula. O comparador corrigiu a
conferencia humana, e o codigo foi ajustado para capturar o valor inteiro e
classificar depois — de modo que item malformado seja reportado como malformado,
e nao como indice faltante.

Os documentos de governanca e o relatorio ao escritorio foram corrigidos.

## Wave 3 — Canon na carteira

> A maior das cinco, e a que mexe em mais lugar.

### ML-3A — A ficha da carteira

**Status:** ✅ Concluído
**Files affected:** `templates/parte-carteira.md` (novo), `src/parte.mjs` (novo), `src/core.mjs`
**Aceite:**
- [x] `partes/<slug>.md` na raiz, com documento obrigatorio
- [x] CPF ou CNPJ validado por digito verificador
- [x] Matriz e filial sao fichas distintas, ligadas por `matriz:`

### ML-3B — A materia referencia

**Status:** ✅ Concluído
**Files affected:** `src/canon.mjs`, `templates/parte.md`, `src/core.mjs` (sequencial com ML-3A)
**Aceite:**
- [x] `ref: <slug>` herda a qualificacao; papel continua da materia
- [x] Ficha antiga sem `ref` carrega sem migracao

### ML-3C — Gate, busca e diagrama

**Status:** ✅ Concluído
**Files affected:** `src/validate.mjs`, `src/buscar.mjs`, `src/diagrama.mjs`, `bin/attorneyfw.mjs`, `test/smoke.mjs`, `README.md`, `CHANGELOG.md`
**Aceite:**
- [x] Divergencia carteira x materia e **violacao**, com as duas versoes a vista
- [x] `buscar` acha materia por nome ou documento de parte
- [x] `diagrama partes` le a ficha da carteira quando ha `ref`
- [x] Smoke reproduz o caso do corpus: mesmo documento, duas sedes, reprova

---

**Medido ao fim da onda:** 18 asserts. O que reproduz o corpus e o de documento
divergente: o mesmo CNPJ com duas qualificacoes reprova o gate, e a mensagem
mostra os dois lados sem escolher qual esta certo.

**Segunda vez que um assert amarrado ao codigo de saida do `validate` quebrou por
motivo alheio.** A propriedade a testar e "nao gera violacao **desta** regra", e
nao "o gate passa" — o gate passar depende de toda a fixture. Agora o helper
`violacoes()` filtra as linhas de erro e o teste olha so as suas; quando falha,
imprime as violacoes, para a proxima nao exigir investigacao.

## Wave 4 — Modelo por tipo de acao

### ML-4A — Destilar

**Status:** ✅ Concluído
**Files affected:** `src/modelo.mjs` (novo), `templates/modelo-acao.yaml` (novo)
**Aceite:**
- [x] Destila documentos, fundamentos e objecoes de materias indicadas
- [x] Cada linha carrega os slugs de origem e a contagem
- [x] Item de uma materia so sai marcado
- [x] Sem materia de origem, **falha** — e manda usar o agente de fundamento

### ML-4B — Aplicar

**Status:** ✅ Concluído
**Files affected:** `src/modelo.mjs`, `bin/attorneyfw.mjs`, `test/smoke.mjs`, `README.md`, `CHANGELOG.md`
**Aceite:**
- [x] Cria itens **pendentes**; nada dado por provado ou fundamentado
- [x] A saida declara sempre o `n` de materias destiladas
- [x] O gate continua cobrando a tese exatamente como cobra hoje

---

**Medido ao fim da onda:** 18 asserts. O que mais importa e o ultimo — aplicar o
modelo **nao muda a contagem de violacoes do gate**. E a prova de que o que ele
cria e pendencia, e nao verdade.

**Desvio do plano, deliberado:** o `templates/modelo-acao.yaml` previsto nao foi
criado. O arquivo do modelo e **inteiramente derivado** das materias de origem —
nao ha parte fixa a preencher. Um template so para satisfazer a linha do plano
seria template morto, e o lint reprova template que nenhum comando le. O formato
esta documentado no cabecalho que o proprio `destilar` escreve.

**Correcao estrutural no smoke:** o helper `violacoes()` subiu para o topo do
arquivo, junto do `ok`. Ele tinha nascido no meio do bloco da onda 3, e a onda 4
— inserida antes dele — nao o enxergava.

## Wave 5 — Transcricao com lastro

> Depende do comparador da Wave 2 e da ficha de documento da Wave 3.

### ML-5A — Transcricao declarada e conferida

**Status:** ⬜ Pendente
**Files affected:** `src/conferir.mjs`, `src/validate.mjs`, `src/build.mjs`, `bin/attorneyfw.mjs`, `test/smoke.mjs`, `README.md`, `CHANGELOG.md`
**Aceite:**
- [ ] Bloco de transcricao declara o id do documento no canon
- [ ] Numeros conferidos contra os que a ficha registra
- [ ] Numero desconhecido da ficha vira **aviso**
- [ ] Transcricao sem documento declarado e apontada pelo gate
- [ ] Smoke reproduz o caso do corpus: valor divergente dentro das aspas

---

## Barreira final

- [ ] `npm run check` verde
- [ ] `trackfw validate` sem violacoes de escopo de projeto
- [ ] CI verde em Linux e Windows
- [ ] Plugin publicado com `version` subida
- [ ] REQ e roadmap em `done/`, com status batendo com a pasta
