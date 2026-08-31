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

## Ultimo trabalho fechado — 0.10.0, o extrator medido contra o arquivo real

Varredura contra as nove pecas reais de um escritorio achou tres defeitos no
extrator de citacao e uma guarda fora de ordem no comparador de itens. **Tudo
veio de rodar, e nada de ler.**

**A licao que fica:** `src/citacao.mjs` declarava desde a 0.6.0 que forma nao
reconhecida nao vira citacao — e violava isso em dois lugares, os dois
inventando. A causa era uma so: o extrator tinha sido medido contra as formas
curtas que eu tinha em mente, e as pecas usam as longas. Por isso o teste hoje
carrega uma tabela das **formas reais do arquivo**. Quando aparecer forma nova,
ela vira teste antes de virar defeito — e so numero de lei e de artigo entram,
que sao direito publico.

O comparador `item x pedido` continua rodando sobre texto nao declarado, por
decisao do ADR: exigir bloco declarado mataria o unico dos seis que funciona
sobre peca importada. O que mudou foi a direcao do erro — ele cala diante do que
nao tem forma de inventario.

## Trabalho anterior — 0.9.0, o contrato tipado da agenda

`attorneyfw prazo --json`. O hook do plugin decidia "ha prazo vencido?" lendo
`linha.includes('VENCIDO')` — o unico acoplamento do repositorio cuja quebra era
silenciosa e cara.

**A regra que nao pode ser desfeita:** a **ressalva e campo do payload**, e nao
rodape. Programa nao le rodape; se ela sair do JSON, o numero de conferencia
viaja sozinho com cara de contagem oficial. Regra 16 do lint reprova o build se
`src/prazo.mjs` deixar de atribuir `ressalva: AVISO`.

Cada entrada carrega a `linha` sem ANSI: decide-se pelos campos, exibe-se pela
linha. O `c.*` do core sempre colore — nao ha teste de TTY.

## Trabalho anterior — 0.8.0, a sexta conferencia

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
