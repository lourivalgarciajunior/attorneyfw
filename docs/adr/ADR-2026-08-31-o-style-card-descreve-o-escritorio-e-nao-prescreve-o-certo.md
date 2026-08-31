---
status: Accepted
date: 2026-08-31
author: "Lourival Garcia"
---

# ADR: O style card descreve o escritorio, e nao prescreve o certo

> Date: 2026-08-31 | Status: Accepted

## Context

O `bookfw` ja provou o mecanismo: a Euterpe deriva a voz do autor de amostras de
texto dele, e a prosa passa a soar como ele em vez de soar como um modelo. O
`attorneyfw` nao tem equivalente — o `adv-gaio` redige com a voz que o modelo
tem, e nao com a do escritorio.

A leitura de oito pecas reais mostrou que a voz e mensuravel, e mais consistente
do que se esperaria:

| | medido |
|---|---|
| "Excelência" | 14 ocorrencias, em 5 das 8 |
| "conforme … anexo" | 15 ocorrencias, em 6 das 8 |
| "Vejamos" | 10 ocorrencias, em 4 das 8 |
| mediana do paragrafo | 39 palavras |
| trechos em CAIXA ALTA usados como enfase | 82 |
| formas distintas de enderecamento | 6, em 8 pecas |

E mostrou tambem uma inconsistencia que ninguem percebe lendo: **tres das oito
pecas alternam "Requerente/Requerida" e "Autor/Ré" dentro de si**, para a mesma
pessoa. No plano de saude sao 13 contra 8; na telefonia, 9 contra 19.

Isso nao e erro de direito. E o mesmo defeito do CNPJ divergente entre materias,
agora dentro de uma peca so — e ninguem o encontra lendo, porque o leitor sabe de
quem se fala e completa sozinho.

Ha um risco de desenho, e ele decide a forma do artefato. Um card de estilo pode
ser lido de dois jeitos:

- **descritivo** — "este escritorio chama a parte de Requerente em 7 pecas e de
  Autor em 4, e alterna dentro da mesma peca em 3 delas";
- **prescritivo** — "chame a parte de Requerente".

O segundo e mais util e mais perigoso. Ele transforma uma medicao de oito pecas
numa regra de redacao, e oito pecas nao sustentam regra nenhuma. Pior: passaria a
corrigir o advogado com base na frequencia, que e o mesmo defeito da porcentagem
de exito recusada na 0.3.0 — numero pequeno com cara de norma.

## Decision

**1. O card descreve, e a descricao vem sempre com o `n`.**

Cada tracco registra em quantas pecas apareceu e quantas foram lidas. Nenhuma
linha diz "escreva assim"; todas dizem "assim aparece em N de M".

**2. O card e derivado de amostras declaradas, e nunca embutido.**

`estilo.yaml` na carteira, produzido por `attorneyfw estilo` a partir de arquivos
que o escritorio indica — as pecas dele. Nao ha card de partida no CLI, pela
mesma razao que nao ha modelo de acao de partida.

**3. O gate usa o card para cobrar consistencia interna, e nao aderencia.**

A unica regra que ele habilita e: **peca que usa dois rotulos para a mesma parte
recebe aviso**. Isso e verificavel dentro da peca e nao depende de o card estar
certo. Nao ha regra do tipo "esta peca nao soa como o escritorio" — isso seria
julgar estilo, e estilo nao se reprova em gate.

**4. Aviso, e nunca violacao.**

Alternar rotulo nao invalida peca nenhuma, e ha caso legitimo: peca que trata de
dois processos com polos diferentes. Reprovar seria transformar preferencia em
impedimento.

**5. O card informa quem redige, e nao substitui o briefing.**

O `adv-gaio` o le junto com o `brief`. Ele diz como o escritorio escreve; o que
escrever continua vindo do contrato de topico.

**6. Amostra pequena e declarada na propria saida.**

Oito pecas nao sustentam afirmacao sobre voz. O card diz isso, do mesmo jeito
que a amostra jurisprudencial diz o `n`.

## Consequences

**A favor.**

- A peca gerada passa a parecer do escritorio, que e a diferenca entre um
  rascunho aproveitavel e um rascunho reescrito.
- A alternancia de rotulo dentro da peca deixa de ser invisivel — e ela e real
  em tres das oito do corpus.

  Vale registrar como este numero se firmou: a contagem que eu tinha feito a mao
  dizia quatro, e a do comando diz tres. A do comando e a que vale, porque e a
  que roda — e a diferenca esta no que cada uma aceita como "Ré". Numero de
  documento que a ferramenta contradiz nao fica no documento.
- O card melhora com o arquivo: cada peca importada e uma amostra a mais.
- Descrever em vez de prescrever mantem a ferramenta fora de uma discussao que
  nao e dela.

**Contra, e aceito.**

- Card descritivo e menos acionavel que um manual de redacao. Correto: manual de
  redacao seria a ferramenta opinando sobre estilo juridico com base em oito
  amostras.
- Traço medido pode ser vicio, e nao virtude. Por isso vem com o `n` e sem
  recomendacao — quem decide se o vicio fica e quem assina.
- O card reflete o arquivo, inclusive o que nele esta desatualizado.

## Alternatives considered

**Regra de redacao embutida no CLI.** "Use Requerente", "evite caixa alta". Seria
opiniao sobre estilo juridico vinda de quem nao advoga. Rejeitada.

**Gate que reprova peca fora do card.** Transformaria frequencia em norma, sobre
amostra pequena. Rejeitada — mesma familia da porcentagem de exito.

## Related

- `ADR-2026-08-31-modelo-por-tipo-de-acao-sai-do-arquivo-do-escritorio-nunca-de-conhecimento-generico.md`
  — a mesma disciplina: sai do arquivo, com o `n` a vista.
- `ADR-2026-08-31-prognostico-e-semaforo-com-premissas-a-vista-e-jurisprudencia-e-amostra-conferida.md`
  — a recusa de transformar contagem pequena em afirmacao.
