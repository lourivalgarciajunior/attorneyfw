---
status: wip
date: 2026-08-31
req: docs/req/REQ-2026-08-31-prazo-json-e-o-hook-do-plugin-deixa-de-ler-texto.md
adr: docs/adr/ADR-2026-08-31-a-agenda-de-prazos-sai-tambem-como-contrato-tipado-com-a-ressalva-dentro-do-payload.md
---

# Roadmap: prazo --json e o hook tipado, em duas ondas

> Created: 2026-08-31 | Status: wip

## Context

O hook `SessionStart` do plugin decide se ha prazo vencido lendo
`linha.includes('VENCIDO')`. Reescrever esse rotulo desliga o unico alarme do
plugin e mantem a agenda impressa — falha silenciosa no unico erro desta
ferramenta que custa o caso do cliente.

REQ: `docs/req/REQ-2026-08-31-prazo-json-e-o-hook-do-plugin-deixa-de-ler-texto.md`

ADR: `docs/adr/ADR-2026-08-31-a-agenda-de-prazos-sai-tambem-como-contrato-tipado-com-a-ressalva-dentro-do-payload.md`

## Por que as ondas sao sequenciais

A **onda 1** entrega o contrato; a **onda 2** o consome e o documenta. Consumir
antes de existir e o unico jeito garantido de o hook ficar quebrado no meio.

Nao ha modulo novo: o payload sai de `src/prazo.mjs`, que o bin ja alcanca. A
armadilha `modulo-orfao` nao se aplica, e isso esta anotado para nao ser
reavaliado.

## Acceptance Criteria

- [ ] As duas ondas concluidas, cada uma com `npm run check` verde
- [ ] A saida de terminal do `prazo` continua **byte a byte** a mesma
- [ ] Nenhuma `linha` do payload carrega ANSI
- [ ] A ressalva viaja dentro do payload, e nao so no rodape
- [ ] Nenhuma linha de contagem, termo inicial ou feriado e tocada
- [ ] O hook nao le mais texto para decidir nada
- [ ] Zero dependencia de runtime nova
- [ ] CI verde em Linux e Windows ao fim de cada onda
- [ ] Plugin `attorneyfw` atualizado, com a versao alinhada ao CLI

---

## Wave 1 — O contrato

> Toca `src/prazo.mjs` e `test/smoke.mjs`.

### ML-1A — Uma funcao so monta a linha

**Status:** ✅ Concluído
**Files affected:** `src/prazo.mjs`
**Acoes:**
1. Extrair de `prazoLista` a montagem de cada linha para uma funcao que devolve
   `{ ...campos, linha }`, com a `linha` **sem ANSI**.
2. O terminal passa a colorir a partir dos campos, e nao a construir texto por
   conta — **uma so origem de renderizacao**.
3. A saida de terminal tem de sair identica a de antes.

**Aceite:** `attorneyfw prazo` produz exatamente o mesmo texto de antes da
mudanca, comparado byte a byte contra a saida capturada antes.
**Validacao:** `npm run check`

### ML-1B — O payload

**Status:** ✅ Concluído
**Files affected:** `src/prazo.mjs`, `bin/attorneyfw.mjs`
**Acoes:**
1. `--json` emite `{ versao, hoje, ressalva, janela, materias, vencidos, prazos[] }`
   e **nada mais** no stdout.
2. `ressalva` recebe a mesma constante `AVISO` que o terminal usa.
3. `vencido`, `restam`, `fatal`, `regime` e `divergencia` como dados; `erro`
   preenchido nas entradas de prazo mal declarado.
4. Codigo de saida inalterado: 1 com vencido, 0 sem.

**Aceite:** JSON valido; `ressalva` presente; nenhuma `linha` com ANSI; agenda
vazia devolve `prazos: []`.
**Validacao:** `npm run check`

### ML-1C — Testes do contrato

**Status:** ✅ Concluído
**Files affected:** `test/smoke.mjs`
**Acoes:**
1. Contrato: campos obrigatorios presentes, `versao` presente, `ressalva` igual a
   do terminal.
2. **Teste negativo de ANSI**: nenhuma `linha` contem ``.
3. Vencido: `vencido: true`, `restam < 0`, e codigo 1.
4. Prazo mal declarado entra com `erro`.
5. Divergencia do art. 210 sai como objeto com as duas datas.
6. Agenda vazia: `prazos: []` e codigo 0.
7. **A saida de terminal nao mudou** — comparacao contra o texto esperado.

**Validacao:** `npm run check`

---

## Wave 2 — O consumidor e a doutrina

> Depende da onda 1. Toca o plugin, `README.md`, `bin`, `CHANGELOG.md` e
> `tools/lint.mjs`.

### ML-2A — O hook para de ler texto

**Status:** ⬜ Pendente
**Files affected:** `plugin-skill/plugins/attorneyfw/scripts/carteira-em-foco.mjs`
**Acoes:**
1. Chamar `prazo --dias N --json` e parsear.
2. Decidir por `vencidos`, por `prazos.length` e por `erro` — nunca por texto.
3. Exibir pela `linha` de cada entrada. Nao reformatar.
4. Apagar `semCor()` e as buscas por `VENCIDO`, `nenhum prazo` e `nenhuma materia`.
5. Manter as tres regras do cabecalho do hook: silencioso fora de carteira, nunca
   recalcula, nunca falha a sessao. JSON invalido cai no silencio, e nao em erro.
6. Imprimir a `ressalva` **do payload**, e nao uma copia literal no script.

**Aceite:** o script nao contem mais `VENCIDO`, `nenhum prazo` nem `semCor`; roda
sobre uma carteira de teste e imprime a agenda e o alarme.
**Validacao:** `npm run lint` no `plugin-skill` · execucao manual sobre fixture

### ML-2B — README, AJUDA, lint e publicacao

**Status:** ⬜ Pendente
**Files affected:** `README.md`, `bin/attorneyfw.mjs`, `tools/lint.mjs`, `CHANGELOG.md`, `package.json`, `plugin-skill/plugins/attorneyfw/**`
**Acoes:**
1. README: o contrato, a `versao`, a `linha` sem cor, e por que a ressalva e
   campo.
2. `AJUDA`: `--json` no verbete do `prazo`.
3. Lint **regra 16**: reprovar o build se `src/prazo.mjs` deixar de atribuir a
   ressalva ao payload (`ressalva: AVISO`).
4. CHANGELOG 0.9.0, `package.json` e `plugin.json` para `0.9.0` — versao nunca
   publicada antes.
5. Skill, `adv-modestino` e comando `prazo` do plugin.
6. Publicar e conferir o cache com `diff -r`.

**Aceite:** trocar `ressalva: AVISO` por outra coisa reprova `npm run lint`,
provado com copia de backup **fora do git**.
**Validacao:** `npm run check` · `trackfw validate` · `claude plugin validate .`
