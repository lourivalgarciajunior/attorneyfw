# Working context — attorneyfw

> Atualizado em 2026-08-31.

## Onde o projeto esta

Versao **0.1.0**, primeira. `npm run check` verde; CI em Linux e Windows.
`trackfw validate` sem violacao de projeto (as 12 que aparecem sao do harness
global em `~/.trackfw`, e aparecem igual no bookfw).

Cadeia do repositorio fechada: ADR aceita, REQ em Done, ROADMAP em
`docs/roadmaps/done/`.

## O que existe

12 modulos em `src/`, 12 templates, 21 comandos no bin. Carteira com dois tipos
de materia — contencioso e consultivo — sobre um nucleo so. Agenda de prazos
com contagem pelo CPC. Gate com regra de tempestividade e o mecanismo de
Chekhov adaptado (fato provado com documento, risco mitigado com fundamento).

## O que ficou de fora, de proposito

Consulta a tribunal, download de intimacao, peticionamento, controle de horas,
financeiro, CRM, terceiro tipo de materia, banco de dados. Esta no escopo
negativo da REQ — nao invente por conta.

## Ultimo trabalho fechado — 0.8.0, a sexta conferencia

Continuidade de fato entre topicos. O template da cronologia prometia desde a
0.1.0 que "e contra isto que se confere se a data citada no topico 4 bate com a
do topico 9" — e nada conferia.

**A regra que nao pode ser desfeita:** a ferramenta **nunca infere que dois fatos
sao o mesmo fato**. Toda comparacao tem ancora declarada — a cronologia, o
documento do contrato, o nome do canon — e fora delas ela cala. Casar a data do
texto com o marco mais proximo e o achado que o advogado mais quer, e e leitura.
Regra 15 do lint reprova o build se a frase sumir de `README`, `conferir.mjs` ou
`templates/cronologia.md`.

Tres consequencias com teste: topico que declara dois documentos fica de fora;
duas datas no mesmo topico nao sao divergencia; diferenca so de caixa nao conta.

## Trabalho anterior — 0.7.0, a voz e a lista no briefing

O style card (0.5.0) e o checklist por tipo de acao (0.4.0) existiam e nao eram
lidos na hora de escrever. O `brief` passou a costurar os dois.

**A decisao que da forma a tudo, e que nao pode ser desfeita:** as duas secoes
ficam **acima** de `## Instrucoes`, e nunca dentro. Traco lido como instrucao
vira norma, e o texto passa a imitar tique. Ha teste comparando os indices, e a
regra 14 do lint reprova o build se a frase sumir de `README`, `brief.mjs` ou
`estilo.mjs`.

Piso do traco: `n >= 3` e presenca em mais da metade. Caixa alta **nao** vai ao
briefing, por decisao — ha teste negativo. O checklist entra como **diferenca**,
nunca repetido inteiro.

## Trabalho anterior — 0.6.0, a quinta conferencia

O gate cobrava que o contrato de topico **existisse**; nao cobrava que o texto o
**honrasse**. `fundamento:` era uma lista branca de citacoes escrita, parseada e
nunca comparada com nada. `src/citacao.mjs` normaliza citacao a chave canonica
(`cpc#373`), e `conferirTopicos` compara texto e contrato em cinco frentes.

Quatro saem como aviso — a excecao legitima e diaria. So topico com contrato e
prosa vazia reprova, e so em `revisao` e `entregue`.

**O que continua fora, por decisao, e protegido pela regra 13 do lint:**
existencia, vigencia, superacao e pertinencia do dispositivo. Sao leitura, e
ficam com o agente de fundamento. Nao implemente "confere se o artigo existe"
achando que faltava.

## Proximos passos plausiveis

- **`--json` no `attorneyfw prazo`**, para o hook do plugin parar de depender do
  texto da saida (acoplamento aceito e declarado em ADR).
- **`attorneyfw publish` no npm** — nunca foi publicado; o `package.json` ja
  esta com `files` correto e o lint cobra.
- **Feriados por tribunal** — hoje `docs/feriados.md` e um arquivo so por
  escritorio. Um escritorio que atua em duas comarcas precisa de um por foro.
- **Segundo tipo de saida no consultivo** — parecer e minuta de contrato usam o
  mesmo `build`; a formatacao de contrato (clausulas numeradas, paragrafo unico)
  ainda nao existe.

## Armadilhas ja pagas

Estao listadas em `CLAUDE.md`, secao "Regras do dominio que ja custaram
correcao", e no roadmap em `done/`, secao "Defeitos encontrados e corrigidos".
Leia as duas antes de mexer em `core.mjs`.
