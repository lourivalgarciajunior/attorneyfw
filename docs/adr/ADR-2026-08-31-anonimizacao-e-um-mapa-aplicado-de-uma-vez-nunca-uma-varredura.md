---
status: Accepted
date: 2026-08-31
author: "Lourival Garcia"
---

# ADR: Anonimizacao e um mapa aplicado de uma vez, nunca uma varredura

> Date: 2026-08-31 | Status: Accepted

## Context

Um escritorio mandou oito pecas de areas diferentes para servirem de corpus. Tres
delas tinham sido anonimizadas a mao antes de sair, e **as tres sairam pela
metade**:

| Peca | O que foi trocado | O que ficou |
|---|---|---|
| plano de saude | o nome da crianca | o CPF real, o numero da carteirinha e a data de nascimento — ao lado do diagnostico |
| sucessoes | o nome da falecida | cinco pessoas vivas com nome completo, CPF, RG e endereco |
| seguros | quase todo o texto | o nome real do falecido num paragrafo do meio, o nome da medica que atestou o obito, e a razao social original ao lado da ficticia |

O caso do plano de saude e o mais grave: crianca identificavel por CPF e data de
nascimento, ao lado de dado de saude — a categoria que a LGPD trata como
sensivel. O de sucessoes mostra o criterio invertido: protegeu-se quem nao tinha
mais o que proteger.

O de seguros e o que preocupa a longo prazo, porque e um **modelo**. Ele vai ser
reaproveitado, e o nome que sobrou sera protocolado no processo de outra pessoa.

O diagnostico que interessa nao e "faltou cuidado". E que **meia anonimizacao e
pior que nenhuma**, e nao pelo que deixa passar: pelo que faz acreditar. Arquivo
marcado como anonimizado circula por e-mail, entra em pasta compartilhada e vira
modelo — porque parece seguro. Arquivo nao anonimizado ninguem manda.

Havia dois desenhos possiveis.

**Varredura.** O comando procura padroes — CPF, CNPJ, RG, e-mail, telefone — e
avisa, ou substitui por asterisco. E o desenho obvio, e reproduz exatamente o
defeito observado: cobertura parcial com cara de completa. Regex nao acha nome
proprio, e nome proprio foi o que escapou nas tres pecas. Pior: quem roda a
varredura e ve "3 ocorrencias tratadas" conclui que acabou.

**Mapa.** O escritorio declara `real → ficticio` uma vez, e a substituicao e
aplicada sobre o texto inteiro de uma vez so. Completa por construcao, porque
nao ha como aplicar em um paragrafo e esquecer o outro — e reversivel, que e o
que o modelo de seguros precisava e nao teve.

## Decision

**1. A anonimizacao e um mapa declarado, e nao uma deteccao.**

`anonimizacao.yaml` na materia, com pares `real: ficticio`. O comando
`attorneyfw anonimizar` aplica **todos** os pares sobre **todo** o texto, numa
passada. Nao ha modo "trate so este trecho".

**2. Aplicar parcialmente e impossivel, e essa e a propriedade central.**

Se um par nao pode ser aplicado, o comando falha e nao grava nada. Meia
substituicao gravada seria exatamente o defeito que este ADR existe para
impedir.

**3. A deteccao existe, mas nunca substitui — so acusa.**

Reconhecedor de CPF, CNPJ, RG, e-mail, telefone e cartao aponta o que o mapa
**nao** cobre, e o texto sai intacto. A deteccao serve para escrever o mapa, e
nao para produzir o arquivo. Substituicao automatica por asterisco daria o
mesmo falso "acabou".

**4. Nome proprio nao se detecta, e o comando diz isso.**

A saida declara que reconhece formato, e nao pessoa. Foi nome proprio que
escapou nas tres pecas, e nenhum regex o acharia. Prometer o contrario e o
unico modo de piorar o que ja existe.

**5. O gate avisa quando ha dado com formato reconhecivel fora do mapa.**

Aviso, nao violacao: peca de verdade **tem** de conter o CPF da parte — e o CPF
que qualifica o autor no processo dele nao e vazamento. Quem decide o que sai e
quem assina. Reprovar o gate por causa disso transformaria a regra em ruido no
primeiro dia.

**6. O mapa nao entra no repositorio da ferramenta.**

`anonimizacao.yaml` e material de cliente, e vale para ele a mesma regra que ja
mantem `materias/` fora daqui. E ele e o pior arquivo possivel para vazar: e a
chave que desfaz a anonimizacao de todas as pecas de uma vez.

## Consequences

**A favor.**

- Cobertura total por construcao. Nao existe o caso "escapou um paragrafo".
- Reversivel: o modelo circula anonimizado e o original continua recuperavel.
- Consistente: a mesma pessoa recebe o mesmo nome ficticio em toda peca da
  materia, o que a substituicao a mao nao garante.
- A deteccao continua util onde ela realmente e boa — encontrar o que falta no
  mapa.

**Contra, e aceito.**

- Da trabalho escrever o mapa. E trabalho de uma vez por materia, e e o unico
  ponto do processo em que uma pessoa decide o que e sensivel — que e onde essa
  decisao deve estar.
- Substituicao literal pode acertar texto que nao devia, se o nome ficticio
  colidir com palavra comum. Mitigado: o comando recusa par cujo lado real seja
  curto demais ou puramente numerico sem contexto.
- Nome nao coberto pelo mapa continua saindo. Correto, e declarado — a
  alternativa nao e detectar melhor, e sim fingir que se detecta.

## Alternatives considered

**Substituicao automatica por asterisco.** Rapida e destrutiva: perde-se o
original e ganha-se cobertura parcial com cara de completa. Rejeitada pelos dois
motivos.

**Reconhecimento de entidade nomeada por modelo.** Acharia nome proprio, com
falso negativo silencioso — e falso negativo silencioso e precisamente o defeito
observado. Rejeitada: aqui a garantia importa mais que o alcance.

## Related

- `ADR-2026-08-31-carteira-de-materias-com-dois-tipos-sob-a-mesma-cadeia-e-um-so-nucleo.md`
  — a regra de material de cliente fora do repositorio, que o mapa herda.
