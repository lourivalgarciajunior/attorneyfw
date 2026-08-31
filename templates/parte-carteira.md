---
nome: {{nome}}
documento: {{documento}}
apelidos: {{apelidos}}
matriz: {{matriz}}
# Data de nascimento, AAAA-MM-DD. Com ela a idade e derivada, e nao digitada —
# idade escrita a mao envelhece no dia seguinte e nao se confere contra nada.
#
# Habilita o aviso de prioridade de tramitacao. Sem ela, a regra simplesmente
# nao roda: campo que a materia nao precisa nao vira cobranca.
nascimento:
criado: {{data}}
---

# {{nome}}

**Documento:** {{documento}}

## Qualificacao

Como o nome tem de sair grafado em **toda peca da carteira** — inteiro, com
CPF/CNPJ, endereco, estado civil e profissao quando a peca exigir.

Esta ficha e a fonte unica. A materia a referencia com `ref: {{slug}}` na ficha
de parte dela, e declara ali apenas o **papel** naquele processo — autor, reu,
requerente, executado. A mesma empresa e autora num processo e re noutro; o
documento e o endereco nao mudam com isso.

## Endereco

Sede, se pessoa juridica. Residencia, se pessoa fisica.

## Estabelecimento

Se pessoa juridica com mais de um estabelecimento: **cada CNPJ e uma ficha
propria**, e a filial aponta a matriz em `matriz:`.

Tratar filial como campo de endereco da matriz foi exatamente o que produziu a
divergencia que originou esta ficha: numa peca um CNPJ era filial de um estado,
noutra o mesmo CNPJ era a autora com sede e inscricao estadual de outro. Em
materia tributaria, trabalhista e previdenciaria quem responde e o
estabelecimento — nao e detalhe cadastral.

## Inscricoes

Estadual, municipal, CEI, CNAE. O que a peca precisar citar.

## Representacao

Quem assina pela parte, e com que instrumento.
