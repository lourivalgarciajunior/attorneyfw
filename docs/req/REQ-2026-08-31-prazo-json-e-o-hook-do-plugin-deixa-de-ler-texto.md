---
status: In Progress
date: 2026-08-31
author: "Lourival Garcia"
adr: "ADR-2026-08-31-a-agenda-de-prazos-sai-tambem-como-contrato-tipado-com-a-ressalva-dentro-do-payload"
roadmap: "ROADMAP-2026-08-31-prazo-json-e-o-hook-tipado-em-duas-ondas"
---

# REQ: prazo --json, e o hook do plugin deixa de ler texto

> Date: 2026-08-31 | Status: In Progress

## Decisoes que amarram esta REQ

ADR: `docs/adr/ADR-2026-08-31-a-agenda-de-prazos-sai-tambem-como-contrato-tipado-com-a-ressalva-dentro-do-payload.md`
— a decisao inteira: a ressalva dentro do payload, a `versao`, a `linha` sem cor,
e por que o rotulo `VENCIDO` nao pode ser sinal.

ADR: `docs/adr/ADR-2026-08-31-prazo-material-conta-pelo-ctn-e-a-divergencia-do-termo-inicial-sai-declarada.md`
— a divergencia do art. 210 que passa a sair como objeto.

Roadmap: `docs/roadmaps/wip/ROADMAP-2026-08-31-prazo-json-e-o-hook-tipado-em-duas-ondas.md`

## Motivation

O hook `SessionStart` do plugin le a **saida de texto** de `attorneyfw prazo`.
Medido em `plugins/attorneyfw/scripts/carteira-em-foco.mjs`:

| O hook decide | Lendo |
|---|---|
| agenda vazia | `linha.startsWith('nenhum prazo')` / `'nenhuma materia'` |
| **prazo vencido** | `linha.includes('VENCIDO')` |
| exibicao | as linhas do CLI, com a cor removida por regex proprio |

O do meio e o unico acoplamento desta ferramenta cuja quebra e **silenciosa e
cara**. `VENCIDO` dispara o unico alarme do plugin — *"HA PRAZO VENCIDO COM
ENTREGA EM ABERTO"*. Reescrever aquele rotulo desliga o alarme e mantem a agenda
impressa: nada falha, nada avisa, e o unico erro que custa o caso do cliente fica
sem sinal.

Quando o hook nasceu, nao havia saida tipada e o acoplamento foi declarado como
aceito. Hoje `validate`, `conferir` e `dinheiro` ja tem `--json`; o padrao existe
e o consumidor tambem.

## Scope

1. **`attorneyfw prazo --json`**: payload com `versao`, `hoje`, `ressalva`,
   `janela`, `materias`, `vencidos` e `prazos[]`.
2. Cada entrada de `prazos[]`: `materia`, `entrega`, `titulo`, `estado`,
   `intimacao`, `dias`, `contagem`, `regime`, `inicio`, `fim`, `restam`,
   `vencido`, `fatal`, `divergencia` (objeto ou `null`), `erro` (ou `null`) e
   **`linha`** — a linha que o terminal imprimiria, **sem ANSI**.
3. **Uma so funcao** monta a linha, usada pelo terminal e pelo JSON, para nao
   existir segunda renderizacao.
4. **O hook do plugin** passa a decidir por `vencidos`, por `prazos.length` e por
   `erro`, e a exibir pela `linha`. O `semCor()` e as buscas por texto saem.
5. **Doutrina**: README, `AJUDA`, CHANGELOG, skill, `adv-modestino`, comando
   `prazo`, e regra de lint que reprova o build se a ressalva sair do payload.

## Negative scope — o que esta REQ NAO faz

- **Nao muda a contagem**, nem o termo inicial, nem o tratamento do art. 210, nem
  os feriados. Nenhuma linha de calculo e tocada.
- **Nao muda a saida de terminal.** O texto que sai hoje sai igual amanha.
- **Nao muda o codigo de saida.** `--json` continua saindo com 1 quando ha
  vencido.
- **Nao acrescenta `--json` a `prazo set`.** Nao ha consumidor.
- **Nao faz o hook recalcular nada.** Ele le o que o CLI diz, e so.
- **Nao emite ANSI dentro do JSON.** A `linha` sai limpa por construcao.
- **Nao remove a ressalva da saida de terminal.** Ela passa a existir nos dois.
- **Nao cria modulo, campo de frontmatter nem dependencia de runtime.**
- **Nao muda o `--json` de `validate`, `conferir` ou `dinheiro`.**

## Acceptance criteria

- [ ] `attorneyfw prazo --json` produz JSON valido, e nada mais no stdout.
- [ ] O payload traz `ressalva` com o mesmo texto que o terminal imprime.
- [ ] O payload traz `versao`.
- [ ] Nenhuma `linha` do payload contem sequencia ANSI (``).
- [ ] Entrada vencida traz `vencido: true` e `restam` negativo — e a palavra `VENCIDO` **nao** e o sinal.
- [ ] Prazo mal declarado sai como entrada com `erro` preenchido, e nao some.
- [ ] Divergencia do art. 210 sai como objeto com as duas datas.
- [ ] `--json` sai com codigo 1 quando ha vencido, e 0 quando nao ha.
- [ ] Agenda vazia produz `prazos: []`, e nao um texto.
- [ ] A saida de terminal continua **byte a byte** a mesma de antes.
- [ ] O hook nao contem mais `VENCIDO`, `nenhum prazo` nem `semCor`.
- [ ] `npm run check` verde: 16 regras de lint e o smoke nos dois tipos de materia.
- [ ] `trackfw validate` sem violacoes.
