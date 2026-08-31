# Changelog

## 0.4.0 — 2026-08-31

Cinco evolucoes tiradas da leitura de **oito pecas reais** de areas diferentes.
A ampliacao anterior nasceu de pedidos; esta nasce de evidencia — cada item tem
pelo menos um defeito encontrado e conferido no corpus.

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
