---
nome: {{nome}}
id: {{id}}
apelidos: {{apelidos}}
papel: {{papel}}
# Ficha da carteira, em partes/<slug>.md. Com ela, a qualificacao vem de la e
# nao se redigita aqui — redigitar foi a origem da divergencia que motivou isto.
# O PAPEL continua sendo desta materia: a mesma empresa e autora num processo e
# re noutro, e o documento nao muda com isso.
ref:
documento:
# Data de nascimento, AAAA-MM-DD. Com ela a idade e derivada, e nao digitada —
# idade escrita a mao envelhece no dia seguinte e nao se confere contra nada.
#
# Habilita o aviso de prioridade de tramitacao. Sem ela, a regra simplesmente
# nao roda: campo que a materia nao precisa nao vira cobranca.
nascimento:
criado: {{data}}
---

# {{nome}}

**Papel:** {{papel}}

## Qualificacao

Com `ref:` preenchido, a qualificacao vem da ficha da carteira e **nao se
repete aqui**. Sem `ref:`, escreva-a: nome inteiro, CPF/CNPJ, endereco e estado
civil quando a peca exigir.

Grafia divergente entre duas pecas e o erro mais barato de evitar e o mais
constrangedor de explicar — e o gate reprova quando o que esta aqui contradiz
a ficha da carteira.

## O que esta parte afirma

## O que ja disse e nos favorece

Declaracao, e-mail, deposito. Com o documento em que consta.

## Contato e representacao

Advogado, OAB, procuracao nos autos.
