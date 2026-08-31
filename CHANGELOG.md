# Changelog

## 0.1.0 — 2026-08-31

Primeira versao. Nasce com o que o trackfw e o bookfw levaram tres anos para
descobrir, e com o que so o trabalho juridico tem: o prazo.

### O que veio do trackfw

- **Cadeia de governanca com gate.** `DEC -> tese/mapa -> plano -> kanban`, e
  `attorneyfw validate` reprovando com codigo 1. A cadeia do trackfw e
  `ADR -> REQ -> ROADMAP`; a diferenca de nome e so de dominio.
- **Escopo negativo obrigatorio** em todo artefato de estrategia e de plano.
  Sem ele, quem redige inventa trabalho — foi a regra que mais economizou
  retrabalho nos dois antecessores.
- **Estado declarado tem de bater com a pasta.** Frontmatter que diz uma coisa
  e diretorio que diz outra e a forma mais comum de kanban mentir.

### O que veio do bookfw

- **Contrato antes do texto.** No bookfw e o contrato de cena; aqui e o
  contrato de topico, com `sustenta`, `fundamento` e `risco` obrigatorios.
  Topico sem contra-argumento previsto e topico que a parte contraria responde
  primeiro.
- **Mecanismo de Chekhov.** No bookfw, promessa plantada tem de ser paga. Aqui,
  fato alegado tem de ser provado com documento, e risco mapeado tem de ser
  mitigado com fundamento. Enquanto a materia esta em curso e aviso; quando
  tudo saiu do escritorio, e erro.
- **Canon.** Partes e documentos com ficha propria, id e apelidos. Documento
  citado num topico que nao existe no canon reprova o gate: peca que menciona
  prova que nao esta nos autos e o que a contraparte usa para desqualificar o
  resto.
- **Briefing.** `attorneyfw brief` monta o pacote minimo e suficiente para
  redigir um topico sem reler os autos — contrato, fatos citados, documentos,
  cronologia, andamento e a cauda do que ja foi escrito.
- **Materializacao idempotente do plano** (`plano --materializar`), com linha de
  vao declarada e ignorada em voz alta, nao em silencio.
- **Titulo com `:` recusado** — no Windows o NTFS abre alternate data stream e o
  arquivo fica com 0 byte.
- **Renumerar e retitular mexendo em arquivo e frontmatter juntos**, casando
  CRLF: no bookfw, procurar `---\n` cru fez o comando recusar todo capitulo do
  disco do autor.
- **Lint do proprio CLI**, com as sete regras do bookfw mais duas novas.

### O que e so daqui

- **Agenda de prazos.** `attorneyfw prazo` dentro da materia; na raiz, a
  carteira inteira ordenada por vencimento — que e o unico jeito de ver dois
  prazos fatais no mesmo dia. Contagem pelo CPC: art. 224 (exclui o dia do
  comeco, comeca no primeiro dia util seguinte a publicacao), art. 219 (dias
  uteis) e art. 220 (suspensao de 20/12 a 20/01). Feriados nacionais fixos e os
  que dependem da Pascoa saem calculados; feriado do foro entra a mao em
  `docs/feriados.md`.
- **A ressalva tem regra de lint.** Se a frase que diz que a contagem e
  conferencia, e nao a oficial, sumir do README, do help ou do modulo de prazo,
  o build quebra. E a unica coisa nesta ferramenta que, entendida errado, custa
  o caso do cliente.
- **Gate de tempestividade.** Prazo vencido com entrega aberta, entrega fechada
  sem data, e entrega registrada depois do vencimento — cada um com sua
  mensagem.
- **Dois tipos de materia no mesmo codigo.** Contencioso e consultivo
  compartilham nucleo, kanban, canon e gate; o vocabulario e a tabela
  `VOCABULARIO` em `src/core.mjs`, e o lint reprova se um tipo tiver uma chave
  que o outro nao tem.
- **Carteira.** `escritorio.yaml` na raiz, uma pasta por materia, e
  `--materia <slug>` para operar sem trocar de diretorio.
- **`build` monta o enderecamento a partir do `materia.yaml`.** Numero de
  processo digitado a mao em cada peca e o campo que protocola no processo do
  outro cliente.
- **`docx` le o markdown que o `build` gerou**, em vez de reconstruir a
  selecao. No bookfw, o gerador copiado divergiu do build e capitulo saiu do
  papel sem o carimbo de ressalva.

### Escopo negativo desta versao

Nao consulta processo, nao baixa intimacao, nao protocola, nao controla horas
nem financeiro. Nao substitui o sistema de prazos do tribunal.
