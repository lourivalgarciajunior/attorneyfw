---
name: reference-fontes-jurisprudencia
description: Onde e como abrir inteiro teor de acórdão do TJPR, decisão de TRF em eproc, súmula do STF e lei federal — rotas que funcionam quando WebSearch/WebFetch falham
metadata:
  type: reference
---

Rotas de fonte primária que funcionaram para conferência de citação. `WebSearch`
não indexa base de tribunal brasileiro, e `WebFetch` quebra em `.jus.br` por
cadeia ICP-Brasil ("unable to verify the first certificate"). `curl` pelo Bash
com User-Agent de navegador passa nos dois casos.

**TJPR — jurisprudência de 2º grau (inteiro teor completo, oficial).**
Busca por número de processo: POST em
`https://portal.tjpr.jus.br/jurisprudencia/publico/pesquisa.do?actionType=pesquisar`
com o campo `processo=<numero>` (cookie de sessão obtido antes em
`/jurisprudencia/`). O resultado traz um permalink no formato
`/jurisprudencia/j/<id>/Acórdão-<numero>`, e essa página entrega ementa, dados
do julgamento e a **íntegra do acórdão** — inclusive as ementas dos precedentes
que o acórdão transcreve, o que costuma render julgados melhores que os
pesquisados. Traz também a string de citação oficial do tribunal
(`(TJPR - Nª Câmara Cível - ... - Rel.: ... - J. dd.mm.aaaa)`); use essa string,
não a redação de memória — os títulos de relator divergem com frequência.
Processo antigo aceita o número velho (ex.: `1514292-8`).

**TRF em eproc (2ª Região) — texto da decisão.** A consulta pública
(`eproc.trf2.jus.br/eproc/externo_controlador.php?acao=processo_seleciona_publica&num_processo=<20 dígitos>`)
dá autuação, órgão, relator, partes e a lista de eventos, mas o download do
documento falha e o host limita requisições (429). O texto integral sai pelo
**DJEN**: `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=<numero CNJ>`
devolve JSON com o inteiro teor da decisão publicada no campo `texto` (HTML).

**STF — súmula.** `portal.stf.jus.br/jurisprudencia/sumariosumulas.asp?base=30&sumula=<seq>`
(Súmula 473 = seq. 1602). A página traz o enunciado, a data de publicação e —
importante — a tese de repercussão geral que eventualmente qualifica o verbete.

**Lei federal.** Planalto, texto compilado e texto da lei alteradora, para
confrontar redação vigente à data dos fatos: `planalto.gov.br/ccivil_03/leis/...`.

Ver [[feedback-sigilo-cliente-na-pesquisa]].
