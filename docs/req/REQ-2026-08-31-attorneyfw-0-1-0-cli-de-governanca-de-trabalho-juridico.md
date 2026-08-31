---
status: Done
date: 2026-08-31
author: "Lourival Garcia"
adr: "ADR-2026-08-31-carteira-de-materias-com-dois-tipos-sob-a-mesma-cadeia-e-um-so-nucleo"
roadmap: "ROADMAP-2026-08-31-attorneyfw-0-1-0-cli-de-governanca-de-trabalho-juridico"
---

# REQ: attorneyfw 0.1.0 — CLI de governanca de trabalho juridico

> Date: 2026-08-31 | Status: Done

## Motivation

Trabalho juridico quebra por quatro motivos, sempre os mesmos: o prazo passa; o
fato alegado nao tem prova nos autos; a peca 7 esquece o que a peca 2 afirmou;
e o topico nao previu a resposta obvia da outra parte.

O trackfw e o bookfw ja resolveram a forma geral do problema — cadeia de
artefatos, gate que reprova, contrato antes do texto, cobranca do que foi
levantado e nao foi pago. Falta a versao juridica, com a unica coisa que os
dois antecessores nao tinham: **o prazo**.

## Acceptance Criteria

- [x] Carteira com `escritorio.yaml` na raiz e uma pasta por materia
- [x] Dois tipos de materia — contencioso e consultivo — sobre um so nucleo
- [x] Cadeia `DEC -> tese|mapa -> plano -> kanban de entregas`
- [x] Kanban `backlog · pesquisa · minuta · revisao · entregue · bloqueado · abandonado`
- [x] Contrato de topico com `sustenta`, `fundamento` e `risco` obrigatorios, e `risco` sem `resposta` reprovando
- [x] Canon de partes e documentos; documento citado fora do canon reprova
- [x] Fato provado sem documento reprova; risco mitigado sem fundamento reprova
- [x] Pedido sem topico que o sustente e cobrado
- [x] Contagem de prazo pelo CPC — arts. 219, 220 e 224 — com feriados nacionais calculados e feriado do foro em `docs/feriados.md`
- [x] Agenda de prazos por materia e consolidada na carteira
- [x] Gate de tempestividade: vencido em aberto, fechado sem data, registrado depois do vencimento
- [x] Ressalva de que a contagem e conferencia, e nao a oficial, com regra de lint que reprova o build se ela sumir
- [x] `build` e `docx` com enderecamento vindo do `materia.yaml`
- [x] `brief` monta o pacote de quem redige
- [x] `npm run check` verde no Linux e no Windows

## Escopo negativo

Nao implementar nesta versao, e nao inventar por conta:

- consulta a tribunal, download de intimacao, peticionamento eletronico;
- controle de horas, financeiro, honorarios, CRM;
- terceiro tipo de materia (trabalhista, tributario, criminal entram como contencioso);
- banco de dados — o formato e markdown versionado, como nos outros dois CLIs;
- geracao de texto juridico pelo proprio CLI: o `brief` monta o pacote, quem redige e quem assina.

## Linked ADR

ADR: `docs/adr/ADR-2026-08-31-carteira-de-materias-com-dois-tipos-sob-a-mesma-cadeia-e-um-so-nucleo.md`

## Blocked by ADRs
<!-- none -->

## Linked Roadmap

Roadmap: ROADMAP-2026-08-31-attorneyfw-0-1-0-cli-de-governanca-de-trabalho-juridico
