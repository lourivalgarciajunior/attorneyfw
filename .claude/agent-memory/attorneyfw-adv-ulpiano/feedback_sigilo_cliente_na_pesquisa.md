---
name: feedback-sigilo-cliente-na-pesquisa
description: Em conferência de fundamento, pesquisar apenas o identificador do julgado ou da súmula — nunca nome de cliente, CNPJ ou número do processo da causa
metadata:
  type: feedback
---

Ao conferir fundamento de peça, pesquise **só** o identificador do julgado
invocado, da súmula ou do dispositivo. Nome do cliente, CNPJ e número do
processo da própria causa não entram em busca, não aparecem na resposta e não
são mencionados.

**Why:** é matéria de cliente, e busca externa deixa rastro fora do controle do
escritório. O usuário declarou o limite de forma expressa em 2026-08-31, antes
do primeiro trabalho de conferência.

**How to apply:** vale para `WebSearch`, `WebFetch` e qualquer `curl` a portal
de tribunal ou API pública. Consultar o processo do **precedente** é legítimo
(ele é público e é o objeto da conferência); consultar o processo da **causa**
não é. Se a conferência parecer exigir o número da causa, ela não exige — o que
falta está nos autos, e a pendência se declara ao advogado.

Rotas de consulta em [[reference-fontes-jurisprudencia]].
