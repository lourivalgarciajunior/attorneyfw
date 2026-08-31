---
nome: {{nome}}
id: {{id}}
apelidos: {{apelidos}}
data:
fls:
prova:
# Os valores que este documento contem, conferidos uma vez na fonte. A peca que
# transcrever um trecho dele declara um bloco `transcricao {{id}}`, e o gate compara
# os numeros da transcricao com estes — porque numero errado DENTRO das aspas e a
# pior posicao possivel para um erro de digitacao.
#
# Um por linha, com hifen. Nao em lista entre colchetes: valor em portugues tem
# virgula, e a lista inline quebraria "344.568,25" em dois.
valores:
#  - 344.568,25
criado: {{data}}
---

# {{id}} — {{nome}}

**Prova:** o fato que este documento demonstra, em uma frase. Se nao der para
escrever, o documento nao prova nada e nao deve ser juntado.

**Nos autos:** fls. / id do peticionamento / ainda nao juntado.

## O que ele diz

O trecho que interessa, transcrito. E o que se cita no topico, sem reabrir o
arquivo digitalizado.

Na peca, transcreva declarando a origem:

    ```transcricao {{id}}
    o trecho, como esta no documento
    ```

Assim o `attorneyfw conferir` compara os numeros da transcricao com os de
`valores:` acima. A peca inteira pode sustentar que a outra parte errou, e a
resposta ser que a transcricao e que esta errada.

## Limites

O que este documento **nao** prova. Serve para nao ampliar a prova alem do que
ela alcanca — que e o que a outra parte impugna primeiro.

## Autenticidade

Original, copia, digitalizado, assinado. Impugnavel por que.
