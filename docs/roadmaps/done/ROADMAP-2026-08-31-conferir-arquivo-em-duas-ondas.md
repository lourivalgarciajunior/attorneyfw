---
status: done
date: 2026-08-31
req: docs/req/REQ-2026-08-31-conferir-arquivo-sobre-peca-do-arquivo-do-escritorio.md
adr: docs/adr/ADR-2026-08-31-conferir-peca-do-arquivo-roda-so-o-que-nao-precisa-de-declaracao-e-diz-em-voz-alta-o-que-nao-rodou.md
---

# Roadmap: `conferir --arquivo`, em duas ondas

> Created: 2026-08-31 | Status: done

## Context

Para conferir nove pecas reais de um escritorio foi preciso escrever um script
chamando os modulos direto, porque nao ha comando que aceite peca do arquivo. O
script achou divergencia em cinco das nove.

REQ: `docs/req/REQ-2026-08-31-conferir-arquivo-sobre-peca-do-arquivo-do-escritorio.md`

ADR: `docs/adr/ADR-2026-08-31-conferir-peca-do-arquivo-roda-so-o-que-nao-precisa-de-declaracao-e-diz-em-voz-alta-o-que-nao-rodou.md`

## Por que as ondas sao sequenciais

A **onda 1** entrega o comando e os testes; a **onda 2** documenta e publica.
Nenhum modulo novo: `conferirTexto` e `lerTexto` ja existem, e o comando mora em
`src/conferir.mjs`, que o bin ja alcanca.

Ha uma dependencia de import que vale registrar: `conferir.mjs` passa a importar
`lerTexto` de `importar.mjs`, e `importar.mjs` **nao** importa de `conferir.mjs`
— entao nao ha ciclo. Conferir antes de escrever.

## Acceptance Criteria

- [x] As duas ondas concluidas, cada uma com `npm run check` verde
- [x] O modo arquivo nunca diz "seis conferencias"
- [x] O relatorio nomeia as tres que nao rodaram e o que cada uma precisaria
- [x] Nao cria materia, nao escreve, nao altera o arquivo lido
- [x] Nao compara um arquivo com o outro
- [x] Nao lista o fundamento invocado
- [x] O modo de materia sai identico ao de hoje
- [x] Zero dependencia de runtime nova
- [x] CI verde em Linux e Windows ao fim de cada onda
- [x] Plugin `attorneyfw` com a versao alinhada ao CLI

---

## Wave 1 — O comando

> Toca `src/conferir.mjs`, `bin/attorneyfw.mjs` e `test/smoke.mjs`.

### ML-1A — `conferirArquivo`

**Status:** ✅ Concluído
**Files affected:** `src/conferir.mjs`
**Acoes:**
1. Confirmar que nao ha ciclo de import antes de escrever
   (`importar.mjs` nao importa `conferir.mjs`).
2. `conferirArquivo(args)`: para cada caminho, `lerTexto` e `conferirTexto` com
   `documentos: []` — o que desliga a conferencia de transcricao por falta de
   ficha, e nao por acaso.
3. **Nao exigir carteira**: o comando roda de qualquer diretorio.
4. Arquivo inexistente ou ilegivel falha com `Erro` e mensagem, e nao com stack.
5. Varios arquivos: um relatorio por arquivo, **sem comparacao entre eles**.

**Aceite:** roda fora de carteira; `.docx`, `.txt` e `.md` pelo mesmo `lerTexto`;
dois arquivos dao dois relatorios independentes.
**Validacao:** `npm run check`

### ML-1B — O relatorio que declara o que nao rodou

**Status:** ✅ Concluído
**Files affected:** `src/conferir.mjs`, `bin/attorneyfw.mjs`
**Acoes:**
1. Cabecalho e contagem dizendo **"tres das seis"**, nunca seis.
2. Rodape nomeando as tres ausentes **com o que cada uma precisaria**:
   transcricao x ficha (ficha de documento no canon), texto x contrato (contrato
   de topico), continuidade (cronologia e canon).
3. Manter a recusa que ja existe — nao confere existencia, vigencia, superacao
   nem pertinencia; nao infere que dois fatos sao o mesmo.
4. `--json` com `modo: "arquivo"`, `conferencias` e `naoRodaram`.
5. `--arquivo` no despacho do bin e no `AJUDA`.

**Aceite:** peca limpa sai com 0 e **sem** a frase "nenhuma divergencia nas seis";
o rodape nomeia as tres ausentes com achado e sem achado.
**Validacao:** `npm run check`

### ML-1C — Testes

**Status:** ✅ Concluído
**Files affected:** `test/smoke.mjs`
**Acoes:**
1. Fixture `.txt` com extenso divergente: sai com 1 e mostra o par.
2. Fixture limpa: sai com 0, e a saida **nao** contem "seis conferencias".
3. O rodape nomeia as tres ausentes — teste positivo por nome.
4. Dois arquivos numa chamada: dois relatorios, nenhum achado cruzado.
5. Arquivo inexistente: codigo 1 e mensagem, sem stack.
6. **Regressao**: o modo de materia continua com a saida de hoje.
7. Teste negativo: a saida do modo arquivo **nao** lista fundamento.

**Validacao:** `npm run check`

---

## Wave 2 — Doutrina e publicacao

### ML-2A — README, AJUDA, lint e CHANGELOG

**Status:** ✅ Concluído
**Files affected:** `README.md`, `bin/attorneyfw.mjs`, `tools/lint.mjs`, `CHANGELOG.md`, `package.json`
**Acoes:**
1. README: o modo arquivo, a tabela das tres que rodam e das tres que nao, e por
   que o fundamento invocado nao entra.
2. `AJUDA`: `--arquivo` no verbete do `conferir`.
3. Lint **regra 17**: reprovar o build se a declaracao do que nao rodou sumir de
   `src/conferir.mjs` ou do `README.md`.
4. CHANGELOG 0.11.0 e `package.json` para `0.11.0`.

**Aceite:** apagar a declaracao reprova `npm run lint`, provado com copia de
backup **fora do git**.
**Validacao:** `npm run check`

### ML-2B — Plugin e publicacao

**Status:** ✅ Concluído
**Files affected:** `plugin-skill/plugins/attorneyfw/**`
**Acoes:**
1. `plugin.json` para `0.11.0` — versao nunca publicada antes.
2. Comando `conferir` e skill: o modo arquivo, e a regra de que **meia
   conferencia nao e conferencia** — verde no modo arquivo nao autoriza dizer que
   a peca esta conferida.
3. Publicar e conferir o cache com `diff -r`.

**Aceite:** `claude plugin validate .` passa; `diff -r` do cache sai limpo.

Medido contra `main` em `ffbf9e8` (0.10.0): **402 -> 410 asserts**, 16 -> 17
regras de lint, 30 modulos e nenhum novo.

**Conferido sobre peca real** antes de fechar: rodou sobre o divorcio da pasta do
escritorio, achou os dois pares de R$ 108.084,82 contra o extenso, e declarou as
tres ausentes.

**Duas correcoes que so a execucao mostrou.** `--arquivo <caminho>` deixa o
caminho em `args.arquivo`, e nao em `args._` — a primeira versao recusava todo
caminho com o proprio texto de uso. E um teste meu exigia que a saida nunca
contivesse "seis conferencias", quando o cabecalho certo diz "tres das seis": a
asserção estava errada, e nao o codigo. Passou a proibir a forma de afirmacao.

**Validacao:** `npm run check` · `trackfw validate` · `claude plugin validate .`
