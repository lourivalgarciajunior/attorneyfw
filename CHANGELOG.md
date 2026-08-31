# Changelog

## 0.9.0 — 2026-08-31

### Acrescentado

- **`attorneyfw prazo --json`** — a agenda tambem sai como contrato tipado, com
  `versao`, `hoje`, `ressalva`, `janela`, `materias`, `vencidos` e `prazos[]`.

  O motivo nao e simetria com os outros `--json`. O hook `SessionStart` do plugin
  decidia se havia prazo vencido lendo `linha.includes('VENCIDO')` — o unico
  acoplamento deste repositorio cuja quebra e **silenciosa e cara**. Reescrever
  aquele rotulo desligaria o unico alarme do plugin e **manteria a agenda
  impressa**: nada falharia, nada avisaria, e o unico erro desta ferramenta que
  custa o caso do cliente ficaria sem sinal.

  Agora o sinal e campo: `vencido: true`, `restam: -6`, `vencidos: 1`.

### As tres decisoes que dao forma ao payload

- **A ressalva e campo, e nao rodape.** Payload tipado e feito para programa
  consumir, e programa nao le rodape. Se a ressalva ficasse so na renderizacao de
  texto, o numero viajaria sozinho — e um prazo de conferencia chega ao consumidor
  com cara de contagem oficial. **Regra 16 do lint** reprova o build se
  `src/prazo.mjs` deixar de atribuir `ressalva: AVISO` ao payload.

- **Cada entrada carrega a `linha` que o terminal imprimiria, sem ANSI.**
  Decide-se pelos campos, exibe-se pela linha: nenhum lado reimplementa o outro, e
  nao ha segunda renderizacao para envelhecer. O `c.*` do core sempre colore — nao
  ha teste de TTY —, e sem a linha limpa cada consumidor escreveria o proprio
  removedor de cor, cada um com um regex diferente.

- **`versao: 1`**, para que um consumidor possa recusar o que nao entende. Sem
  numero de versao, renomear um campo troca um acoplamento de texto por um
  acoplamento de forma, que quebra igual e sem aviso.

### Mudado

- **O hook do plugin parou de ler texto.** Decide por `vencidos`, por
  `prazos.length` e por `erro`; exibe pela `linha`; imprime a `ressalva` **do
  payload**, e nao uma copia literal. O removedor de cor do script sumiu.

- **Ganho de comportamento, e nao so de forma:** o hook passou a gritar tambem
  quando ha **prazo mal declarado**. Antes a linha `???` se perdia no meio da
  lista; agora ela e contada e anunciada, porque a entrega tem prazo e ninguem
  sabe qual e.

- Payload ilegivel — inclusive CLI antigo, sem `--json` — faz o hook **calar**, e
  nao falhar. A regra de nunca derrubar a sessao vale acima de tudo.

### Nao mudou, e ha teste provando

- **A saida de terminal, byte a byte.** Conferida contra a captura de antes da
  mudanca, numa fixture com prazo mal declarado, vencido com FATAL, material com a
  divergencia do art. 210 e duas materias.
- **Nenhuma linha de contagem, termo inicial ou feriado.**
- **O codigo de saida:** `--json` continua saindo com 1 quando ha vencido.
- `prazo set` continua sem `--json` — nao ha consumidor, e formato sem consumidor
  nasce desatualizado.

## 0.8.0 — 2026-08-31

### Acrescentado

- **A sexta conferencia: continuidade de fato entre topicos.**

  O template da cronologia, escrito em toda materia nova desde a 0.1.0, promete
  literalmente que *"e contra isto que se confere se a data citada no topico 4
  bate com a do topico 9"*. **Nada conferia.** Quatro modulos liam a cronologia —
  o diagrama, o briefing, a busca e o status — e nenhum comparava.

  Tres comparacoes, cada uma com **ancora declarada**:

  | Comparacao | Ancora |
  |---|---|
  | data no texto que a cronologia nao registra | a tabela da cronologia |
  | datas sem interseccao em topicos que declaram o mesmo documento | o `documentos:` do contrato |
  | grafia que nao e a declarada no canon | o nome canonico e seus apelidos |

- `tabela()` subiu de `src/diagrama.mjs` para `src/core.mjs` — agora tem dois
  leitores.

### A regra que da forma a tudo

**A ferramenta nunca infere que dois fatos sao o mesmo fato.** Casar a data do
texto com o marco mais proximo da cronologia seria o achado que o advogado mais
quer — e exige decidir que os dois falam do mesmo evento, que e leitura. Sem
ancora declarada, ela cala. Regra 15 do lint reprova o build se essa recusa sumir
de `README.md`, `src/conferir.mjs` ou `templates/cronologia.md`.

Tres consequencias, todas deliberadas:

- **Topico que declara dois documentos fica de fora** — atribuir a data a um
  deles seria inferencia.
- **Duas datas no mesmo topico nao sao divergencia** — contrato e aditivo
  convivem. A comparacao exige topicos diferentes com **interseccao vazia**.
- **Diferenca so de caixa em nome nao conta** — qualificacao em caixa alta e
  forma normal de peca; o que se aponta e acento perdido.

### Decidido, e nao esquecido

- **Nada dentro de bloco de transcricao e conferido.** O que esta entre aspas e do
  documento, e apontar seria pedir que se falsificasse a citacao para ela bater
  com a cronologia.
- **Ano solto nao e data.** `Lei 8.078, de 1990` nao vira marco.
- **Data processual nao entra** — intimacao e prazo sao do `attorneyfw prazo`, que
  tem ressalva propria.
- **As tres sao aviso, e nenhuma reprova.** Ao contrario da quinta conferencia,
  aqui nenhuma comparacao e sem excecao legitima: data de lei citada de passagem,
  nome social de parte, documento com data de emissao e de vencimento.
- **Cronologia vazia desliga a comparacao, e isso sai dito** — com a contagem de
  datas que a peca cita. Nao e cobranca: relatorio calado sobre o que nao olhou e
  lido como se tivesse olhado tudo.

### Corrigido antes de sair

A primeira versao da comparacao por documento agrupava datas soltas, e num topico
que citava contrato e aditivo o par saia como `topico 1.1, 1.1` — uma divergencia
"entre topicos" dentro de um topico so. Achado **rodando**, e nao lendo.

## 0.7.0 — 2026-08-31

### Acrescentado

- **O briefing passou a carregar a voz do escritorio e o que falta do checklist
  do tipo de acao.**

  As duas coisas foram construidas nas versoes anteriores — o style card na
  0.5.0, o modelo por tipo de acao na 0.4.0 — e **nenhuma das duas era lida no
  unico momento em que serviria**. O `brief` montava contrato, canon,
  cronologia e estrategia, e nao abria `estilo.yaml` nem
  `docs/checklist-<tipo>.md`.

  O ADR do style card tinha aberto dizendo qual era o problema: *"o `adv-gaio`
  redigia com a voz que o modelo tem"*. A ferramenta media a voz do escritorio e
  guardava o resultado num arquivo que ninguem abria na hora de escrever.

- **A secao de voz fica FORA de `## Instrucoes`**, e ha teste comparando os
  indices no texto de saida.

  Um traco que diz `em 6/8` colocado dentro de um pacote de instrucoes deixa de
  ser descricao no instante em que e lido: quem redige trata a frequencia como
  norma, e a peca passa a imitar tique em vez de escrever com a voz da casa.
  Seria desfazer, numa linha, o ADR que decidiu que o card **descreve, e nao
  prescreve**.

  Em `## Instrucoes` entram so as tres linhas negativas: nao force traco, nao
  afirme item da lista, e escreva a pendencia quando o item importar e nao
  estiver provado.

- **Piso do traco: `n >= 3` e presenca em mais da metade das pecas.** Traco visto
  em 2 de 8 e ruido; carregado para todo briefing, ruido vira estilo da casa em
  duas semanas — e ninguem lembra que era ruido. Metade exata tambem nao passa.

- **O checklist entra como diferenca**, e nao repetido inteiro: fundamento que o
  contrato deste topico nao declara, objecao que o `risco` nao previu, documento
  que o canon nao tem. So itens ainda em `- [ ]`.

  A comparacao de fundamento reusa o extrator da 0.6.0, entao
  `art. 300, II, do CPC` na lista nao reaparece quando o contrato ja declara
  `art. 300 do CPC`.

### Decidido, e nao esquecido

- **Enfase em caixa alta nao chega ao briefing.** E o unico traco medido que se
  imita em excesso sem esforco, e excesso de caixa alta e defeito de peca, nao
  voz de escritorio. Ha teste negativo, para nao ser acrescentado depois como
  "faltava".

- **O rotulo das partes sai da peca antes de sair do card.** Se os topicos ja
  escritos usam um par, o briefing diz esse: o gate cobra consistencia dentro da
  peca, e nao a escolha do par.

- **Nenhuma regra de gate nova, e nenhuma cobranca de aderencia a voz.** O card
  continua habilitando uma so, a de rotulos misturados. Regra 14 do lint reprova
  o build se essa recusa sumir de `README`, `src/brief.mjs` ou `src/estilo.mjs`.

- **O briefing e leitura.** Nao marca item, nao altera o checklist, nao completa
  o contrato. Marcar item por conta seria decidir pelo advogado exatamente onde
  a decisao e dele.

- **Card ausente e checklist ausente nao viram cobranca.** Sem card, uma linha
  diz que a voz nao foi derivada e que o texto vai sair com a voz do modelo. Sem
  checklist, a secao nao aparece.

## 0.6.0 — 2026-08-31

### Acrescentado

- **A quinta conferencia: o texto do topico contra o contrato dele.**

  O contrato de topico declara `fundamento: [...]` desde a 0.1.0 — uma lista
  branca de citacoes. Ate a 0.5.1 ela estava escrita, estava parseada, e
  **nenhuma linha de codigo a comparava com o que a prosa cita**. Um topico
  podia declarar `fundamento: [art. 300 do CPC]`, citar no texto o art. 373, II,
  e a Sumula 7 do STJ, e passar no gate inteiro.

  Nao e estilo. O dispositivo que entra na peca sem passar pelo contrato e
  exatamente o que ninguem conferiu: nao passou pelo agente de fundamento, nao
  foi distinguido, nao teve vigencia checada. Das oito pecas reais lidas neste
  dia, tres tinham erro de fundamento, e os tres entraram no texto sem contrato.

  Quatro comparacoes saem como **aviso**, com os dois lados a vista: citacao no
  texto que o contrato nao declara, fundamento declarado que a prosa nao invoca,
  documento declarado que o texto nao menciona. Aviso porque a excecao legitima
  e diaria — citar o dispositivo da outra parte para refuta-lo e o caso de todo
  dia, e o gate desta ferramenta so reprova o que nao tem excecao.

  A quinta, **topico com contrato e prosa vazia**, reprova em `revisao` e
  `entregue`. Essa nao tem excecao, e ate hoje se escondia: o gate contava
  palavras da entrega inteira, e um topico vazio ficava atras de outro bem
  escrito. Em `backlog` e `pesquisa` nada roda — la o contrato ainda esta sendo
  levantado, de proposito.

- **`src/citacao.mjs`**, o extrator normalizado. Tabela declarada de doze leis,
  em que apelido, nome por extenso e numero apontam para a mesma chave: `art. 38
  da LEF` e `art. 38 da Lei 6.830/80` sao o mesmo fundamento. Reconhece tambem
  sumula, sumula vinculante, tema e precedente por numero de recurso.

  A comparacao e **por artigo**: inciso, paragrafo e alinea sao lidos e
  descartados, por decisao. Distinguir incisos multiplicaria o aviso por cada
  refinamento de escrita, e aviso que dispara sempre e aviso que ninguem le.

  Sigla fora da tabela **nao vira citacao**. Silencio, e nao palpite — a mesma
  disciplina do extenso, que devolve `null` diante de palavra desconhecida.

### Mudado

- `attorneyfw conferir` passou a imprimir, **com achado ou sem achado**, o que
  ele nao conferiu: se o dispositivo existe, se esta em vigor, se foi superado,
  e se sustenta o que o topico afirma. Relatorio que so lista o que achou e lido
  como se tivesse achado tudo, e aqui o que falta e justamente a parte que exige
  advogado.

- A quinta conferencia **nao roda sobre o markdown do `build`**, e as outras
  quatro continuam rodando. O `build` remove o contrato de topico de proposito;
  sem contrato nao ha com o que comparar o texto. Ela le a entrega na origem.

- Regra 13 do lint: reprova o build se a recusa acima sumir de `bin`, `README`,
  `src/citacao.mjs` ou `src/conferir.mjs`.

### O que continua sem ser conferido, e por decisao

Existencia, vigencia, superacao e pertinencia do dispositivo. As quatro sao
leitura, e ficam com o agente de fundamento. Uma ferramenta que dissesse "esse
artigo nao sustenta isso" estaria opinando sobre merito com cara de gate — e
gate em que se pode discordar e gate que se aprende a ignorar.

## 0.5.1 — 2026-08-31

### Mudado

- **O aviso de que as formulas ainda sao a semente passou a sair uma vez por
  materia**, na primeira peca costurada — e nao a cada `build`.

  A informacao nao muda entre uma peca e a seguinte. O que se ganhava repetindo
  era o usuario aprendendo a pular a linha amarela do `build`, e a proxima
  linha amarela — que talvez importasse — sumiria junto.

  A condicao e permanente, entao ela ficou onde condicao permanente pertence:
  **no gate**, que roda por materia. O `build` mantem so o primeiro encontro,
  que e onde a informacao e nova, e aponta para o gate.

- O aviso do gate nao diz mais `<materia>/formulas.yaml`: o arquivo esta na raiz
  da carteira, e o caminho mandava ao lugar errado.

## 0.5.0 — 2026-08-31

Cinco evolucoes tiradas do **arquivo** do escritorio. As duas ampliacoes
anteriores tiraram do corpus os defeitos das pecas; esta tira delas o que elas
tambem sao — o acervo que a ferramenta nao sabia ler.

### Adicionado — o gate cobra o que a peca anuncia sobre si mesma

- **Aviso quando o titulo anuncia `c/c X` e o pedido nao menciona X.** No corpus,
  uma anulatoria fiscal anuncia "c/c pedido de tutela provisoria de urgencia" e
  nao formula o pedido de tutela. E a remissao vazia que o gate ja persegue no
  corpo, agora no lugar mais visivel da peca.

- **`nascimento:` na ficha de parte**, e a idade passou a ser **derivada**. Idade
  escrita a mao envelhece no dia seguinte e nao se confere contra nada.

- **Aviso quando ha parte com 60+ ou menor e a peca nao pede prioridade**, e
  **aviso quando a idade anunciada nao bate com a ficha**, com os dois lados a
  vista. No corpus, um alvara anuncia "autores com 64 anos" e o mais velho dos
  cinco requerentes tem 69.

### Decidido

- **Aviso, e nunca violacao**, nas tres regras: as tres tem caso legitimo, e o
  gate so reprova o que nao tem excecao — e por isso o que ele reprova e levado
  a serio.

- **Sem `nascimento:`, a regra da idade nao roda**, e nao ha aviso de campo
  faltando. Campo que a materia nao precisa nao vira cobranca.

- **A regra vale ate onde a comparacao alcanca**, e a mensagem diz isso: o gate
  afirma que a peca anuncia e nao cumpre, e nao que a tutela era cabivel ou que a
  prioridade e devida. Estender alem disso seria o gate opinando sobre merito.

- O reconhecimento do `c/c` e conservador: quando a regra nao entende o cumulo,
  ela **cala**. Errar para o silencio e a direcao certa num aviso.

### Adicionado — as formulas saem do codigo

- **`formulas.yaml` na carteira**, com enderecamento por foro, qualificacao e
  fecho. O `attorneyfw init` a cria, marcada como **semente**.

- **`foro:` no `materia.yaml`** — `civel`, `fazenda`, `familia`, `juizado` ou
  `trabalho` —, e `--foro` no `materia new`.

### Decidido

- **O `build` emitia um enderecamento que nao aparecia em nenhuma das oito pecas
  reais.** Ele fora escrito para ser neutro — sem acento, com o genero entre
  parenteses —, e as oito usavam a forma cheia, que varia com o foro: seis formas
  distintas em oito pecas. O `build` emitia uma setima, que nao era de ninguem.

- **O que muda por escritorio, por comarca e por ano nao pode estar compilado.**
  Mesmo padrao ja decidido para a serie de indice e para a tabela de custas.

- **O foro e declarado, e nunca inferido** do texto de `juizo:`. Inferir
  acertaria em quase todos os casos do corpus, e o que sobra enderecca a peca ao
  juizo errado — mesma familia da recusa de inferir o polo do cliente.

- **Marcador sem valor sai visivel no papel**, como `{comarca}`, e nao como
  espaco em branco: peca com buraco tem de parecer peca com buraco. O `build`
  ainda os conta, para nao depender de alguem reparar.

- **Sem `formulas.yaml` o `build` nao falha** — peca tem de sair. Usa a semente e
  avisa uma vez que o enderecamento nao e o do escritorio.

### Adicionado — style card

- **`attorneyfw estilo --de <arquivos>`** deriva `estilo.yaml` das pecas do
  proprio escritorio; **`attorneyfw estilo`** mostra o card em vigor.

- Mede tratamento do juizo, formula de lastro documental, rotulo das partes,
  ritmo de paragrafo e uso de caixa alta.

### Decidido

- **O card descreve, e nao prescreve.** Um card prescritivo — "chame a parte de
  Requerente" — e mais acionavel e transforma uma medicao de oito pecas numa
  regra de redacao. Oito pecas nao sustentam regra nenhuma, e corrigir o
  advogado pela frequencia e a mesma familia da porcentagem de exito que esta
  ferramenta recusa: numero pequeno com cara de norma.

- **Cada traco sai com o `n`** — em quantas pecas apareceu, de quantas foram
  lidas — e nenhuma linha diz "escreva assim".

- **O unico gate que o card habilita e de consistencia interna**: peca que usa os
  dois pares de rotulo para a mesma parte recebe aviso. Isso se verifica dentro
  da peca e nao depende de o card estar certo. **Nao ha gate de aderencia a
  voz** — estilo nao se reprova.

- **Nao ha card de partida no CLI**, pela mesma razao que nao ha modelo de acao
  de partida: seria opiniao sobre estilo juridico vinda de quem nao advoga.

### Corrigido — num numero de documento, e nao no codigo

- A leitura manual do corpus dizia que **quatro** das oito pecas alternavam
  "Requerente" e "Autor" para a mesma parte. O comando, rodando sobre as mesmas
  pecas, mede **tres** — a diferenca esta no que cada contagem aceita como "Ré".
  A do comando e a que vale, porque e a que roda. ADR e REQ corrigidos.

### Adicionado — a porta de entrada

- **`attorneyfw importar <arquivo.docx|.txt|.md>`**, com `--criar-materia` e
  `--materia`. Produz `docs/importado-<slug>.md` com **tudo em `- [ ]`**.

- Leitura de `.docx` **sem dependencia nenhuma**: o pacote e um zip e o corpo
  esta em `word/document.xml`, com deflate cru que o `inflateRawSync` do proprio
  node resolve.

### Decidido

- **A importacao assiste, e nao preenche.** A 0.4.0 decidiu que o modelo de acao
  sai das materias ja trabalhadas — e um escritorio com quinhentas pecas no disco
  tem **zero** materias na carteira. Sem porta de entrada, o `destilar` destila
  do vazio.

  Mas **nada entra na tese, no plano nem em contrato de topico**. Peca importada
  e material bruto, e a cadeia continua comecando pela DEC. E a terceira vez que
  esta forma e recusada, depois do modelo de acao e da amostra jurisprudencial —
  e a mais tentadora das tres, porque o resultado pareceria trabalho pronto.

- **O que e mecanico entra classificado por confianca**: documento com digito
  verificador e enderecamento em `alta`; data e valor em `forma` — alta na forma
  e **nenhuma** no significado; nome de parte e trecho de anexo em `media`.

- **Secao fixa "o que esta importacao NAO extraiu"**, sempre presente, listando o
  que so a leitura resolve. Silencio sobre o que faltou seria a importacao se
  apresentando como completa.

- **Documento com digito que nao fecha entra marcado**, e nao em silencio. Foi
  assim que, rodando contra as oito pecas reais, apareceu um CPF de requerente
  que nao existe — importar sem conferir o teria propagado para a ficha da
  carteira, que e a fonte de todas as pecas seguintes.

- **Ficha da carteira e sugerida, e nunca gravada.** O relatorio imprime o
  `attorneyfw parte new` correspondente e diz que nao o executou.

- **A peca importada nao e alterada nem movida.** PDF fica fora, declarado.

### Corrigido — tudo encontrado rodando contra as oito pecas

- O reconhecedor de CPF e CNPJ era uma **segunda implementacao**, com regex
  proprio que nao casava CPF nenhum. Passou a ser o mesmo do `attorneyfw dados`.
  Duas implementacoes do mesmo reconhecimento divergem sempre.

- O padrao de nome usava `\s`, e com isso **atravessava a quebra de linha**:
  comecava no enderecamento em caixa alta da linha de cima e ia ate a
  qualificacao da primeira parte, que era entao descartada inteira pelo filtro
  de cabecalho. O efeito era perder **a primeira parte de cada peca**, em
  silencio. Agora e `[ \t]`.

- O padrao de nome tambem nao previa o parentese com nome fantasia entre o nome
  e a virgula, nem a barra em razao social — perdia todas as partes de uma peca
  e a re de outra.

- O trecho de anexo capturava so o que vinha **antes** de "conforme" — e e
  depois dela que o documento e nomeado.

- Um `\b` escrito por heredoc virou **caractere backspace** dentro de um regex,
  e o padrao deixou de casar qualquer coisa em silencio. Encontrado comparando a
  saida com o mesmo regex rodado a parte.

## 0.4.0 — 2026-08-31

Cinco evolucoes tiradas da leitura de **oito pecas reais** de areas diferentes.
A ampliacao anterior nasceu de pedidos; esta nasce de evidencia — cada item tem
pelo menos um defeito encontrado e conferido no corpus.

### Corrigido

- **O `.gitignore` do mapa de anonimizacao engolia o template do proprio CLI.**
  O padrao `anonimizacao.yaml`, sem ancora, casava tambem
  `templates/anonimizacao.yaml`, que deixou de ser versionado sem que nada
  avisasse. O smoke local passava porque o arquivo estava no disco; a CI, que
  clona limpo, reprovou — **depois do merge**.

  O padrao passou a ser `/materias/**/anonimizacao.yaml`, e ha uma **regra de
  lint nova**: arquivo em `bin/`, `src/`, `templates/`, `tools/` ou `test/` que o
  git nao versiona reprova o build. Ela pega a classe inteira, e nao so este
  caso.

### Adicionado — transcricao com lastro

- Bloco `transcricao <id>` no corpo do topico declara de qual documento do canon
  veio o trecho. O `build` o converte em citacao recuada **assinada com o id** —
  visivel, e nao em comentario, porque comentario e removido antes de a peca
  sair e o `conferir` roda sobre o markdown gerado.

- A ficha do documento ganhou `valores:`, com os numeros que ele contem,
  conferidos uma vez na fonte. O `conferir` compara os dois.

- O `docx` passou a renderizar citacao em bloco recuada e em corpo menor, em vez
  de deixar o `>` do markdown a vista no papel.

### Decidido

- **Numero errado dentro das aspas e a pior posicao possivel para um erro de
  digitacao.** No corpus, a transcricao de um auto de infracao dizia `,21` e o
  paragrafo seguinte usava `,25` — e a soma da propria peca fecha com o `,25`. A
  peca inteira sustenta que o Fisco errou; a Fazenda responde exibindo que a
  autora transcreveu errado o documento que ela mesma juntou.

- **Mesma parte inteira e centavos diferentes vira par**; e digitacao, e nao
  outro valor. Valor que a ficha simplesmente nao registra tambem sai, dizendo
  que ela nao registra — a ficha pode ainda nao conhece-lo.

- **Transcricao sem origem declarada reprova o gate**, e origem fora do canon
  tambem. Uma citacao sem procedencia e o contrario do que uma transcricao e.

- `valores:` e lista com hifen, **nunca entre colchetes**: valor em portugues tem
  virgula, e a lista inline quebraria `344.568,25` em dois numeros. Descoberto no
  smoke, e agora esta escrito no proprio template.

### Adicionado — modelo por tipo de acao

- **`attorneyfw modelo destilar <tipo> --de <slug,slug>`** produz
  `modelos/<tipo>.yaml` a partir de materias que o escritorio ja trabalhou:
  o que cada documento do canon prova, os `fundamento` declarados nos contratos
  de topico, e os `risco` que a outra parte levantou.

- **`attorneyfw modelo aplicar <tipo>`** cria `docs/checklist-<tipo>.md` na
  materia, com itens **pendentes**. **`attorneyfw modelo`** lista o que a
  carteira tem.

### Decidido

- **O modelo sai do arquivo do escritorio, nunca de conhecimento generico.** A
  diferenca nao e de qualidade, e de responsabilidade: modelo generico e uma
  afirmacao sobre o direito, feita pela ferramenta, que ninguem conferiu; modelo
  destilado do proprio arquivo e uma afirmacao sobre o que aquele escritorio ja
  fez, que o advogado reconhece ou corrige.

- **Sem materia de origem, nao ha modelo.** Tipo que o escritorio nunca
  trabalhou nao ganha checklist — o comando diz isso e manda usar o agente de
  fundamento, que e onde essa pergunta pertence.

- **Cada linha carrega de quantas materias veio e de quais**, e item visto uma
  vez so sai marcado: nao e regra do escritorio, e uma vez.

- **Aplicar cria pendencia, e nao verdade.** Nada e dado por provado ou por
  fundamentado porque o modelo disse; a tese e o gate continuam cobrando o que
  cobram. Ha teste que fixa isso — aplicar o modelo nao muda a contagem de
  violacoes.

- Checklist generico erra por **excesso**, manda juntar o que o caso nao pede, e
  o advogado aprende a ignorar a lista. Lista ignorada e pior que lista ausente,
  porque ocupa o lugar da que seria lida.

### Adicionado — o canon sobe para a carteira

- **`attorneyfw parte new "Nome" --documento <CPF|CNPJ> [--matriz <slug>]`** e
  **`attorneyfw parte list`**: uma qualificacao por parte, em `partes/<slug>.md`
  na raiz da carteira. Documento obrigatorio e validado por digito verificador.

- **`attorneyfw canon new parte ... --ref <slug>`**: a materia referencia em vez
  de redigitar. Redigitar era a origem mecanica da divergencia.

- `attorneyfw buscar` acha materia pelo **nome ou pelo documento** da parte, com
  ou sem pontuacao — "que processos essa empresa tem conosco?" era pergunta que a
  carteira ja poderia responder e nao respondia.

- `attorneyfw diagrama partes` passa a grafar a parte como a carteira a grafa, e
  a mostrar o documento: a figura nao pode escrever a parte de um jeito e a peca
  de outro.

### Decidido

- **A divergencia que motivou isto nao estava dentro de peca nenhuma.** Estava
  entre duas materias do mesmo cliente: um CNPJ era filial de um estado numa
  acao e a autora — com sede e inscricao estadual de outro — na acao vizinha. O
  gate nao veria isso nem em cem execucoes, porque o canon era por materia.
  Cliente recorrente era quatro de oito no corpus.

- **Papel e da materia; qualificacao e da carteira.** A mesma empresa e autora
  num processo e re noutro, e o CNPJ nao muda com isso.

- **Matriz e filial sao fichas distintas**, cada uma com seu CNPJ, ligadas por
  `matriz:`. Tratar filial como campo de endereco da matriz e exatamente o que
  produziu o erro — e em materia tributaria, trabalhista e previdenciaria quem
  responde e o estabelecimento.

- **Divergencia entre a ficha da materia e a da carteira e violacao**, e nao
  aviso. Aqui reprovar e o certo: nao ha caso legitimo em que o mesmo documento
  tenha duas qualificacoes. A mensagem mostra os dois lados e nao escolhe.

- **Ficha antiga sem `ref` carrega sem migracao.** A subida e oportunidade, nao
  ruptura.

### Adicionado — conferencia numerica

- **`attorneyfw conferir <entrega>`**, com `--json`. Tres comparacoes mecanicas
  sobre o markdown que o `build` gerou — conferir uma versao e protocolar outra
  e pior que nao conferir:

  | Verificacao | O que compara |
  |---|---|
  | extenso | os dois lados de `R$ 7.182,86 (sete mil ... e oitenta centavos)` |
  | soma | as parcelas contra o total, quando a peca escreve "totalizando" |
  | item | a lista enumerada nos fatos contra a lista no pedido |

- Parser de valor por extenso em portugues, ate bilhoes, com centavos. Devolve
  **nada** diante de palavra que nao conhece: numero "conferido" errado e pior
  que numero nao conferido.

### Decidido

- **Divergencia sai sempre como par, com os dois lados a vista.** Nunca "valor
  incorreto": a ferramenta nao sabe qual dos dois esta certo, e fingir que sabe
  faria o advogado corrigir o lado errado. **Nada e corrigido automaticamente** —
  nas tres pecas do corpus o lado certo foi diferente.

- **A verificacao de item e extensao do que o gate ja faz.** Ele cobra
  `fato → prova` e `pedido → topico`; passa a cobrar `item alegado → item
  pedido`. Vale para linha telefonica, nota fiscal, parcela, matricula, lote.

- **O valor do item e capturado inteiro e classificado depois.** Capturar so o
  que ja tem a forma esperada faz o item malformado sumir da lista e virar
  "indice faltante" — que e outro defeito, com outra correcao.

- A janela da soma recua ate dois paragrafos, porque no alvara do corpus uma das
  parcelas estava dois atras. Assim que alguma combinacao final fecha, para: erra
  para o silencio, e nao para o alarme.

### Corrigido — na analise, e nao no codigo

- **A primeira leitura do corpus, feita a mao, estava errada num ponto.** Ela
  dizia que a lista de uma declaratoria tinha 75 de 76 itens, faltando o de
  numero 35, e que o pedido trazia um numero ausente dos fatos.

  Nenhum indice falta. O regex da conferencia manual era estrito demais e
  derrubava dois itens: o malformado (`98841;1749`, com ponto-e-virgula no meio
  dos digitos) e um terminado por virgula em vez de ponto-e-virgula. **Foi o
  comparador recem-implementado que corrigiu a analise humana**, rodando sobre as
  pecas de verdade. O defeito real — e ele continua real — e o item malformado,
  que aparece assim tambem dentro do pedido.

### Adicionado — anonimizacao por mapa

- **`attorneyfw anonimizar --init`** cria `anonimizacao.yaml` na materia, com
  pares `real: ficticio`, e **`attorneyfw anonimizar <entrega>`** aplica todos
  eles sobre todo o texto **numa passada so**. `--reverter` desfaz.

- **`attorneyfw dados <entrega>`** reconhece CPF, CNPJ, e-mail, telefone, RG e
  cartao — CPF e CNPJ com digito verificador — e **nao substitui nada**.

### Decidido

- **A anonimizacao e um mapa declarado, e nao uma deteccao.** Tres pecas do
  corpus tinham sido anonimizadas a mao e as tres sairam pela metade: numa ficou
  o CPF de uma crianca ao lado do diagnostico; noutra, quem foi anonimizado foi a
  falecida, e cinco pessoas vivas sairam com nome, CPF, RG e endereco; na
  terceira — um modelo, que vai ser reaproveitado — a substituicao escapou num
  paragrafo do meio.

  **Meia anonimizacao e pior que nenhuma**, e nao pelo que deixa passar: pelo que
  faz acreditar. Arquivo marcado como anonimizado circula; nao anonimizado,
  ninguem manda.

- **Aplicar pela metade e impossivel.** Quatro recusas acontecem antes de
  qualquer escrita: lado real curto demais, lado ficticio que ja existe no texto,
  termo que e saida de um par e entrada de outro, e caixa nao declarada. Qualquer
  impedimento falha **sem gravar nada**.

- **So a forma declarada e a MAIUSCULA sao aceitas**, porque sao as duas que
  voltam iguais. Outra variacao de caixa faz falhar dizendo qual par acrescentar.
  A ida e volta devolve o original byte a byte, e isso e testado.

- **A deteccao acusa, e nunca substitui.** Substituicao automatica por asterisco
  produziria o mesmo falso "acabou" que o corpus mostrou — quem le "3 ocorrencias
  tratadas" conclui que terminou.

- **Reconhece formato, e nao pessoa.** Nome proprio foi o que escapou nas tres
  pecas, e nenhum regex o acharia. A saida diz isso, porque ver "nada
  encontrado" nao pode ser lido como "pode circular".

- **O gate avisa, e nunca reprova.** Peca de verdade tem de conter o CPF da
  parte, e o CPF que qualifica o autor no processo dele nao e vazamento.
  Reprovar transformaria a regra em ruido no primeiro dia.

- `anonimizacao.yaml` entrou no `.gitignore`: e a chave que desfaz a
  anonimizacao de todas as pecas de uma vez.

## 0.3.0 — 2026-08-31

Ampliacao pedida por um escritorio usuario. Dez pedidos triados; tres ja
existiam como estrutura obrigatoria, um foi recusado na forma pedida, e seis
viraram trabalho.

### Adicionado — correcao monetaria com memoria de calculo

- **`attorneyfw atualizar <valor> --de DATA [--ate DATA]`**, com `--serie`,
  `--juros N`, `--juros-de DATA`, `--selic` e `--json`. Corrige e, quando
  pedido, acrescenta mora.

  O ganho nao esta no numero final: esta na memoria. Valor corrigido sem memoria
  a outra parte impugna e o juiz nao homologa, e o tempo economizado na minuta
  volta a ser gasto na fase em que custa mais. Por isso a memoria e a
  procedencia saem **sempre**, inclusive no modo resumido — que e justamente o
  que acaba copiado para a peca.

- **`attorneyfw indice atualizar [serie]`** busca INPC, IPCA, IGP-M e Selic no
  SGS do Banco Central e grava em `tabelas/indices/<serie>.csv` na carteira.
  **E o unico ponto do subsistema que toca a rede.** Calculo nunca busca nada:
  funciona offline, e os mesmos arquivos devolvem o mesmo numero daqui a um ano.

- **`attorneyfw indice`** lista o que a carteira ja tem, com cobertura e data de
  coleta de cada serie.

### Decidido

- **O arquivo guarda a variacao mensal como a fonte publica**, e nao um
  numero-indice ja calculado. O numero-indice e derivado na leitura. O motivo e
  auditoria: cada linha do CSV continua conferivel contra a serie do Banco
  Central, e quem duvidar do valor final refaz a conta a partir do dado bruto.

- **Fora da cobertura da serie, o comando falha.** Nao extrapola, nao repete o
  ultimo indice, nao interpola — a mensagem diz ate onde a serie vai e o que
  rodar. Buraco no meio da serie tambem reprova: a razao entre dois pontos
  passaria por cima do mes faltante e devolveria fator **menor**, sem nenhum
  sinal de que algo faltou.

- **Serie sem `# fonte:` e `# coletada_em:` e recusada.** Numero sem procedencia
  nao vai para peca.

- **O IPCA-E nao tem coleta automatica.** O codigo da serie no SGS nao foi
  confirmado, e serie sem codigo confirmado nao e adivinhada: codigo errado
  produz numero plausivel e errado, que e o pior resultado possivel aqui. O
  comando manda preencher a mao e diz de onde.

- Convencoes declaradas na saida porque nao sao as unicas defensaveis: correcao
  por **mes cheio** com base no mes do termo inicial; juros simples **pro rata
  die** sobre trinta dias; Selic **somada**, nao composta, exclusos o mes inicial
  e o do pagamento, mais 1% no mes do pagamento.

- Aritmetica em **centavos inteiros**, com um unico arredondamento no fim.
  Ponto flutuante em dinheiro acumula residuo, e residuo em peca vira
  impugnacao.

### Adicionado — a carteira como memoria institucional

- **`attorneyfw materia fechar <resultado>`**, com `--valor`, `--nota` e `--em`.
  A carteira ja guardava tudo menos o que aconteceu no fim: a ultima entrega em
  `entregue` diz que a peca saiu, e nao que se ganhou. Sem o desfecho, a base
  responde "ja fizemos" e nao responde "ja perdemos" — que e a pergunta que
  evita repetir uma causa perdida em vez de propor acordo.

- **`attorneyfw buscar <termo>`**, com `--tipo`, `--resultado` e `--json`. Ha
  grep, e grep acha uma palavra; nao responde *"que materias enfrentaram esta
  tese, e como terminaram?"*. Devolve **materia**, nao linha solta — com tipo,
  desfecho, nota e onde bateu.

- Materias ja encerradas entram no `attorneyfw context` **sem ninguem pedir**.
  Quem redige precisa saber que uma materia irma com a mesma tese terminou em
  perda, e isso so aparece se for empurrado.

- `materia list` e `status` na raiz mostram o desfecho, e o `status` fecha com o
  placar da carteira. `materia list` tambem passou a mostrar pasta sem
  `materia.yaml`, que some do gate e do prazo e precisava aparecer em algum lugar.

### Decidido

- **Vocabulario de resultado fechado** — `ganho`, `ganho_parcial`, `perda`,
  `acordo`, `extinto`. O valor da base esta em conseguir contar, e campo livre
  nao responde "quantas vezes ja perdemos esta tese?". O que nao couber vai em
  `resultado_nota`, que existe ao lado justamente para isso.

- **A busca nao le corpo de minuta.** Minuta contem citacao e transcricao, e
  busca por termo juridico casaria com o que foi *citado* em vez do que foi
  *sustentado*. Ruido treina a ignorar o resultado, e resultado ignorado e pior
  que nenhum. O que ela varre — tese ou mapa, DEC, cronologia, titulo de entrega
  — sai declarado na propria saida.

- **Nao se modela processo judicial.** Sem instancias, recursos, sucumbencia ou
  transito em julgado: a materia tem desfecho, data e valor. Acompanhamento
  processual e do sistema do tribunal, que e a fonte.

- **O gate avisa, e nao reprova**, em materia toda entregue ha mais de noventa
  dias sem resultado. Nem todo desfecho chega nesse prazo, e reprovar por causa
  de um processo que so demora transformaria a regra em ruido.

- Materia criada por versao anterior **nao precisa de migracao**: o gravador de
  campo YAML acrescenta a chave que faltar, e campo ausente le como "em curso".

### Adicionado — visual law

- **`attorneyfw diagrama <linha-do-tempo|partes|fato-prova>`**, com `--salvar`.
  Tres geradores, e so tres. A linha do tempo sai da cronologia cruzada com o
  canon de documentos; o organograma, do canon de partes; o mapa fato→prova
  liga cada pendencia numerada ao lastro que o contrato de topico declarou.

- **Na peca, a figura entra onde o topico pedir**, por bloco cercado
  ```` ```diagrama ```` — o mesmo idioma do contrato de topico. O `build` troca
  a marca pelo bloco Mermaid; o `docx` renderiza com o mermaid-cli quando ele
  esta no PATH e, sem ele, insere um aviso.

### Decidido

- **Diagrama e projecao de dado estruturado, nunca de texto livre.** Pedir ao
  modelo que desenhe lendo a minuta funciona na demonstracao e falha na terceira
  versao da peca: corrige-se uma data no corpo e a figura fica com a antiga.
  Divergencia e pior que ausencia, porque a figura tem autoridade visual e e a
  contraparte quem acha a contradicao. Aqui as duas leem o mesmo lugar.

- **Marco sem documento sai visivelmente marcado como nao provado**, tracejado e
  em vermelho, com aviso no terminal e no corpo da peca. E a mesma exigencia que
  o gate faz ao texto, aplicada a figura: sair igual aos outros seria a figura
  mentindo com mais autoridade que o paragrafo.

- **A marca do diagrama e bloco cercado, e nao comentario HTML.** Comentario
  nesta ferramenta ja quer dizer nota de trabalho, e o `textoDe` o remove
  justamente para nao vazar para a peca — a marca em comentario pediria uma
  figura que desaparece antes do `build` ver, em silencio. Descoberto no smoke,
  e agora ha um teste que fixa o comportamento.

- **Falta de figura nao impede protocolo.** Diagrama que nao pode ser gerado
  deixa aviso no lugar e o `build` segue. Exportador de imagem ausente nao pode
  travar uma peca.

- O `docx` continua lendo o markdown que o `build` gerou, com figura ou sem —
  a regra que existe desde a 0.1.0 vale sem excecao para os diagramas.

### Adicionado — custas processuais

- **`attorneyfw custas <valor> --tribunal <t> [--ano N]`**, com `--provisorio` e
  `--json`, e **`attorneyfw custas init --tribunal <t>`** para criar a tabela.
  Tres tipos de componente cobrem o que as tabelas fazem: `percentual` com piso
  e teto, `fixo`, e `faixas`.

### Decidido

- **A tabela mora em arquivo versionado, nunca em raspagem ao vivo.** Custas
  mudam por ato normativo datado, e numero raspado de uma pagina nao sabe dizer
  de onde veio. A saida diz sempre qual norma aplicou e de quando.

- **Tabela sem `norma` e `norma_data` nao carrega.** Procedencia nao e campo
  opcional num numero que vai para orcamento a cliente.

- **Tabela sem `conferido_em` nao orca** sem `--provisorio`, e com ele a saida
  sai marcada em vermelho. O `custas init` gera valores de exemplo; se ela
  pudesse orcar em silencio, o exemplo viraria o orcamento de alguem.

- **O CLI nao vem com tabela de tribunal nenhum.** O `init` gera o formato; os
  numeros sao do escritorio, conferidos por uma pessoa contra a norma publicada.

- O parser da tabela e estrito: o que nao for reconhecido vira erro, e nao campo
  silenciosamente ignorado. Custas ignoradas em silencio sao a metade do
  orcamento que falta.

### Corrigido

- **`percentual: 1.0` era lido como 10%.** O leitor de numero tratava o ponto
  como separador de milhar sempre, e o orcamento saia com um zero a mais sem que
  nada avisasse. Agora ha uma regra so, `numeroBR`, usada pelo dinheiro inteiro:
  havendo virgula, ela e o decimal e todo ponto e milhar; so com pontos, um
  unico ponto seguido de uma ou duas casas e decimal. Encontrado rodando a
  primeira conta de custas, nao lendo o codigo.

### Adicionado — relatorio de resultado ao cliente

- **`attorneyfw relatorio [--docx] [--serie]`**. Compara `valor_pedido` com
  `resultado_valor`, corrigindo o primeiro quando ha `valor_pedido_em`.

- **`valor_pedido_em`** no `materia.yaml`, ao lado do `valor_pedido`. Com ele o
  relatorio corrige; sem ele, sai nominal e **diz que saiu**.

- `markdownParaDocx` extraido do `docx.mjs`: o unico gerador de OOXML da
  ferramenta, usado por todo comando que produz papel. Nada reconstroi a selecao
  do texto — foi um gerador copiado que divergiu do build, no bookfw, e o preco
  foram quatro livros com a mesma correcao aplicada quatro vezes.

### Decidido

- **O sinal do ganho vem do papel do cliente, e o polo nao se infere.**
  Consumidor pede R$ 50.000 e o juiz condena a R$ 20.000: para o reu e ganho de
  R$ 30.000; para o autor, os mesmos dois numeros sao perda parcial de
  R$ 30.000. Sem papel declarado no canon — ou, na falta dele, no
  `materia.yaml` —, o comando **falha**. Relatorio com o sinal trocado nao e um
  relatorio ruim: e um documento que diz ao cliente que ele ganhou quando perdeu.

- **Falta de `resultado` ou de `valor_pedido` para o comando.** Deduzir o pedido
  da peca seria adivinhar.

- **Consultivo nao gera relatorio de resultado**, e a recusa vem antes de tudo:
  em consultivo nao ha pedido nem condenacao para comparar, e mandar registrar
  desfecho para so entao dizer que o comando nao serve seria trabalho a toa.

### Adicionado — amostra jurisprudencial e prognostico

- **`attorneyfw jurisprudencia [add "<id>"]`**, com `--tribunal`, `--data`,
  `--resultado`, `--razao`, `--fonte`, `--lido` e `--json`. A secao entra na
  tese e no mapa de risco.

- **`attorneyfw prognostico [--json]`** — semaforo verde, amarelo ou vermelho,
  com as razoes, **cada uma apontando o artefato de onde saiu**. Sai com codigo
  1 quando ha impeditivo.

### Decidido — o item entregue diferente do que foi pedido

- **A ferramenta nao produz probabilidade de exito em porcentagem, e nao vai
  produzir.** Nao e limitacao a ser removida quando houver dados melhores: e
  recusa, na mesma familia de nao assinar, nao aprovar e nao protocolar.

  Tres camadas de motivo. *Unidade*: forca de argumento, risco processual e
  frequencia historica nao estao na mesma escala e nao se somam; a media delas
  tem precisao aparente e nenhum referente. *Uso*: aquele numero nao fica na
  tela — vai para conversa com cliente, onde ninguem pergunta como foi
  calculado. *Responsabilidade*: numero de probabilidade dado a cliente opera
  como promessa de resultado.

  **Duas regras de lint protegem a decisao.** Uma positiva, que reprova o build
  se a recusa sumir do README, do help ou do modulo — decisao sem a razao
  escrita ao lado e reimplementada pela proxima pessoa, que acha que faltava. E
  uma negativa, que reprova se alguma linha de codigo passar a emitir percentual
  ao lado de "exito". A guarda foi verificada quebrando-a de proposito.

- **A amostra e conferida, nao um censo.** O pedido era "80% dos ultimos 50 no
  TJPR". Ha um obstaculo de acesso — os tribunais estaduais nao oferecem
  consulta programavel de inteiro teor — e um de metodo que nao se resolve com
  dinheiro: classificar cinquenta acordaos exige le-los, e um deles pode ter
  sido favoravel por fundamento que nao serve ao caso em maos.

- **Julgado sem `--lido` entra como pendente**, mesmo que se declare o
  resultado, e o comando avisa. Mesma disciplina do `[CONFERIR NA FONTE]`.

- **A saida declara sempre o `n`** e nunca apresenta a amostra como universo. O
  `--json` traz `universo: null` de proposito.

- **Nao ha coleta automatica.** Registro e manual; fonte que exige contrato
  entra por chave do escritorio, e captcha nao se contorna.

- Os criterios do semaforo sao os que o gate ja cobra, lidos em conjunto. Nao ha
  peso arbitrario a calibrar porque nao ha nota a compor.

### Mudado

- A regra de lint da ressalva deixou de ser especifica do prazo e passou a ser
  uma tabela de ressalvas. Hoje cobre duas — contagem de prazo e correcao
  monetaria —, e o build reprova se qualquer uma sumir do README, do help ou do
  modulo que a produz.

## 0.2.0 — 2026-08-31

Contagem de prazo material, separada da processual. Nasceu de um defeito medido
conferindo um Recurso Ordinario Constitucional real, e nao de leitura de codigo.

### Corrigido

- **O CLI contava todo prazo com a regua do CPC.** O `contarPrazo` punha o termo
  inicial no primeiro dia UTIL seguinte (art. 224, par. 3), inclusive com
  `--corridos`, que so trocava a unidade. Prazo de direito material tem regra
  propria: o art. 210, caput, do CTN exclui o dia do inicio e conta continuo a
  partir do dia seguinte, util ou nao.

  Medido: fato em sexta, 26.12.2025, prazo de 30 dias. A conta correta vence em
  **26.01.2026**; a 0.1.0 devolvia **27.01.2026**. Errar prazo para MAIS e a
  pior direcao — o advogado acredita ter folga que nao tem.

- **O recesso do art. 220 nao suspende prazo material.** Ele e processual, e
  prazo tributario corre entre 20/12 e 20/01 como em qualquer outro dia.
  Encontrado rodando o CLI de ponta a ponta depois de implementar o regime: o
  teste unitario passava `recesso: false` a mao e nunca exercitou o caminho. O
  vencimento da leitura alternativa saltava de 29.12 para 21.01 — quase um mes
  para frente. O teste agora passa `recesso: true` de proposito.

### Adicionado

- **`prazo_regime: processual | material`** no frontmatter da entrega, e
  `--material` no `attorneyfw prazo set`. O regime e declarado, nunca inferido
  do tipo da entrega ou da materia: adivinhar prazo e o unico erro desta
  ferramenta que custa o caso. Entrega criada pela 0.1.0 recebe o campo na
  primeira vez que o comando roda, em vez de ser recusada.

- **A divergencia do art. 210, paragrafo unico, sai declarada.** O dispositivo
  diz que os prazos "so se INICIAM ou vencem em dia de expediente normal", e ha
  duas leituras: o deslocamento alcanca so o vencimento, ou tambem o termo
  inicial. No caso medido elas dao 26.01 e 27.01, e nenhuma e obviamente errada.

  O CLI devolve as duas e adota a mais curta — entre leituras defensaveis, a
  ferramenta nunca pode ser a que concede folga. Quando o dia seguinte a
  intimacao ja e util, as leituras coincidem e a saida volta a ser uma data so.
  Ver ADR-2026-08-31.

- **`--material` implica dias corridos**, e combina-lo com `--uteis` e recusado:
  prazo material e continuo por definicao.

- **Dois avisos novos no gate**: `prazo_regime` fora do vocabulario reprova; e
  `prazo_contagem: corridos` com `prazo_regime: processual` avisa, porque essa
  combinacao e quase sempre prazo material que ninguem marcou — que e
  exatamente o defeito desta versao.

- **A agenda, o `status` e o `context` mostram o regime** e, havendo, a data da
  outra leitura. O regime so aparece quando nao e o padrao: coluna que repete
  "processual" em toda linha vira ruido e para de ser lida.

### Escopo negativo desta versao

Nenhum outro regime. Prazo prescricional, decadencial, trabalhista e contratual
tem regras que nao sao a do art. 210, e ficam de fora — quem precisar declara
`material` e confere a mao. A ferramenta tambem nao escolhe entre as duas
leituras do paragrafo unico: devolve as duas, e a decisao juridica e de quem
assina.

## 0.1.0 — 2026-08-31

Primeira versao. Nasce com o que o trackfw e o bookfw levaram tres anos para
descobrir, e com o que so o trabalho juridico tem: o prazo.

### O que veio do trackfw

- **Cadeia de governanca com gate.** `DEC -> tese/mapa -> plano -> kanban`, e
  `attorneyfw validate` reprovando com codigo 1. A cadeia do trackfw e
  `ADR -> REQ -> ROADMAP`; a diferenca de nome e so de dominio.
- **Escopo negativo obrigatorio** em todo artefato de estrategia e de plano.
  Sem ele, quem redige inventa trabalho — foi a regra que mais economizou
  retrabalho nos dois antecessores.
- **Estado declarado tem de bater com a pasta.** Frontmatter que diz uma coisa
  e diretorio que diz outra e a forma mais comum de kanban mentir.

### O que veio do bookfw

- **Contrato antes do texto.** No bookfw e o contrato de cena; aqui e o
  contrato de topico, com `sustenta`, `fundamento` e `risco` obrigatorios.
  Topico sem contra-argumento previsto e topico que a parte contraria responde
  primeiro.
- **Mecanismo de Chekhov.** No bookfw, promessa plantada tem de ser paga. Aqui,
  fato alegado tem de ser provado com documento, e risco mapeado tem de ser
  mitigado com fundamento. Enquanto a materia esta em curso e aviso; quando
  tudo saiu do escritorio, e erro.
- **Canon.** Partes e documentos com ficha propria, id e apelidos. Documento
  citado num topico que nao existe no canon reprova o gate: peca que menciona
  prova que nao esta nos autos e o que a contraparte usa para desqualificar o
  resto.
- **Briefing.** `attorneyfw brief` monta o pacote minimo e suficiente para
  redigir um topico sem reler os autos — contrato, fatos citados, documentos,
  cronologia, andamento e a cauda do que ja foi escrito.
- **Materializacao idempotente do plano** (`plano --materializar`), com linha de
  vao declarada e ignorada em voz alta, nao em silencio.
- **Titulo com `:` recusado** — no Windows o NTFS abre alternate data stream e o
  arquivo fica com 0 byte.
- **Renumerar e retitular mexendo em arquivo e frontmatter juntos**, casando
  CRLF: no bookfw, procurar `---\n` cru fez o comando recusar todo capitulo do
  disco do autor.
- **Lint do proprio CLI**, com as sete regras do bookfw mais duas novas.

### O que e so daqui

- **Agenda de prazos.** `attorneyfw prazo` dentro da materia; na raiz, a
  carteira inteira ordenada por vencimento — que e o unico jeito de ver dois
  prazos fatais no mesmo dia. Contagem pelo CPC: art. 224 (exclui o dia do
  comeco, comeca no primeiro dia util seguinte a publicacao), art. 219 (dias
  uteis) e art. 220 (suspensao de 20/12 a 20/01). Feriados nacionais fixos e os
  que dependem da Pascoa saem calculados; feriado do foro entra a mao em
  `docs/feriados.md`.
- **A ressalva tem regra de lint.** Se a frase que diz que a contagem e
  conferencia, e nao a oficial, sumir do README, do help ou do modulo de prazo,
  o build quebra. E a unica coisa nesta ferramenta que, entendida errado, custa
  o caso do cliente.
- **Gate de tempestividade.** Prazo vencido com entrega aberta, entrega fechada
  sem data, e entrega registrada depois do vencimento — cada um com sua
  mensagem.
- **Dois tipos de materia no mesmo codigo.** Contencioso e consultivo
  compartilham nucleo, kanban, canon e gate; o vocabulario e a tabela
  `VOCABULARIO` em `src/core.mjs`, e o lint reprova se um tipo tiver uma chave
  que o outro nao tem.
- **Carteira.** `escritorio.yaml` na raiz, uma pasta por materia, e
  `--materia <slug>` para operar sem trocar de diretorio.
- **`build` monta o enderecamento a partir do `materia.yaml`.** Numero de
  processo digitado a mao em cada peca e o campo que protocola no processo do
  outro cliente.
- **`docx` le o markdown que o `build` gerou**, em vez de reconstruir a
  selecao. No bookfw, o gerador copiado divergiu do build e capitulo saiu do
  papel sem o carimbo de ressalva.

### Escopo negativo desta versao

Nao consulta processo, nao baixa intimacao, nao protocola, nao controla horas
nem financeiro. Nao substitui o sistema de prazos do tribunal.
