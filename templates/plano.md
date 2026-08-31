---
titulo: {{titulo}}
data: {{data}}
tipo: {{tipo}}
artefato: {{artefato}}
---

# Plano de entregas — {{titulo}}

Derivado de `{{artefato}}`. Cada linha vira um arquivo no kanban quando se roda
`attorneyfw plano --materializar`. A coluna `#` tem de ser um numero so: um vao
como "3–5" fica declarado no plano e nao vira entrega.

`Prazo` e a data da intimacao (AAAA-MM-DD), nao a do vencimento — o vencimento
o CLI calcula. `Dias` e o prazo legal.

| # | Titulo | Tipo | Prazo | Dias |
|---|---|---|---|---|
| 01 |  |  |  |  |
| 02 |  |  |  |  |

## Ordem e dependencia

O que nao pode ser redigido antes de que. Onde ha diligencia de terceiro
(documento a obter, certidao, pericia), diga aqui — e o que trava entrega no
dia do prazo.

## O que nao entra neste plano

Escopo negativo. Sem isso, quem redige inventa peca.
