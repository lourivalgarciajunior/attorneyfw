# attorneyfw

Governança para trabalho jurídico. Mesmo princípio do [trackfw](https://github.com/lourivalgarciajunior/trackfw) e do [bookfw](https://github.com/lourivalgarciajunior/bookfw), aplicado ao escritório: nada de peça sem tese, nada de tópico sem contra-argumento, nada de fato alegado sem prova que o pague.

```
DEC  →  tese / mapa de risco  →  plano  →  backlog → pesquisa → minuta → revisao → entregue  →  protocolo
```

> **A contagem de prazo daqui é conferência, não é a contagem oficial.** O prazo que vale é o dos autos e o do sistema do tribunal. Feriado do foro e suspensão de expediente entram à mão em `docs/feriados.md` — o CLI não tem como saber e não finge que tem. Esta ferramenta serve para o prazo não passar despercebido, não para substituir a conferência de quem assina.

## O problema que ele resolve

Trabalho jurídico quebra por quatro motivos, sempre os mesmos:

1. **O prazo passa** — ninguém viu, ou viu tarde demais para redigir.
2. **O fato alegado não tem prova** — a peça afirma, a outra parte impugna, e o documento nunca foi juntado.
3. **A peça 7 esquece o que a peça 2 afirmou** — nome grafado de outro jeito, valor que mudou, data que não bate.
4. **O tópico não previu a resposta óbvia** — a contraparte escreve primeiro o que devia estar respondido.

O attorneyfw ataca os quatro com artefatos, não com força de vontade: **agenda de prazos** calculada a partir da intimação, **tese com fatos numerados** que a prova precisa pagar, **canon** de partes e documentos, e **contrato de tópico** que só fecha com o risco declarado e respondido.

Ninguém escreve uma petição. Escreve-se um tópico por vez, com contrato declarado e contexto fechado.

## Os dois tipos de matéria

Uma carteira reúne matérias de dois tipos, sob a mesma cadeia e o mesmo gate:

| | contencioso | consultivo |
|---|---|---|
| artefato de estratégia | **tese** — fatos `F1..Fn`, pedidos `P1..Pn` | **mapa de risco** — riscos `R1..Rn` |
| entrega | peça | minuta / parecer |
| unidade do texto | tópico | cláusula |
| o que o gate cobra | fato **provado** com **documento** | risco **mitigado** com **fundamento** |
| fechamento | protocolada | entregue ao cliente |

O código é um só. O que muda é o vocabulário e o que a cadeia numera.

## Instalação

Requer Node 22 ou superior. Sem dependências.

```bash
npm install -g attorneyfw
```

Ou, do repositório:

```bash
npm link
```

## Uso

```bash
attorneyfw init "Escritorio" --advogado "Fulana de Tal" --oab "SP 000000"
attorneyfw materia new "Acme — Cobranca indevida" --tipo contencioso \
  --cliente "Acme Ltda" --adverso "Banco Reu" --processo 1000-00.2026.8.26.0100
cd materias/acme-cobranca-indevida

attorneyfw dec "Defesa por ilegitimidade passiva"
attorneyfw tese                       # fatos F1..Fn e pedidos P1..Pn
attorneyfw plano                      # o que sera entregue, em que ordem
attorneyfw plano --materializar       # a tabela do plano vira kanban

attorneyfw canon new parte "Acme Ltda" --papel autor
attorneyfw canon new documento "Fatura contestada"
attorneyfw topico add 1 --tipo merito
attorneyfw prazo set 1 --intimacao 2026-09-01 --dias 15 --fatal

attorneyfw brief 1 --topico 1.1       # o pacote de quem redige
attorneyfw entrega move 1 minuta
attorneyfw validate                   # gate — zero violacoes antes de protocolar
attorneyfw entrega move 1 revisao
attorneyfw build 1                    # costura a peca em markdown
attorneyfw docx 1                     # a versao de protocolo
attorneyfw entrega move 1 entregue
```

Ao encerrar, e depois:

```bash
attorneyfw materia fechar perda --em 2027-03-11 --nota "improcedencia mantida em 2o grau"
attorneyfw buscar "art. 31 simples nacional"
```

Dinheiro, na raiz da carteira:

```bash
attorneyfw indice atualizar           # busca INPC, IPCA, IGP-M e Selic
attorneyfw indice                     # o que a carteira ja tem
attorneyfw atualizar 8500,00 --de 2019-03-14 --juros 1
```

Consulta: `attorneyfw status` (na raiz, a carteira; dentro da matéria, o kanban dela), `attorneyfw prazo` (agenda; na raiz, de todas as matérias), `attorneyfw context` (dump da governança formatado para LLM), `attorneyfw materia list`.

Todo comando de matéria aceita `--materia <slug>` para rodar da raiz sem entrar na pasta.

Consultivo troca dois comandos: `attorneyfw mapa` no lugar de `attorneyfw tese`, e o resto é idêntico.

Ainda dá para criar uma entrega fora do plano com `attorneyfw entrega new "Titulo"` — o gate avisa que ela não está no plano, e a decisão de qual dos dois corrigir é de quem assina. Para renumerar ou retitular sem desencontrar arquivo e frontmatter: `attorneyfw entrega renumber 5 9` e `attorneyfw entrega retitle 9 "Titulo novo"`.

## Anatomia de uma carteira

```
escritorio.yaml              advogado, OAB, comarca, politica de prazo
docs/feriados.md             feriado do foro e suspensao de expediente
materias/
  acme-cobranca-indevida/
    materia.yaml             tipo, cliente, adverso, processo, juizo, sigilo
    docs/dec/                DEC-<data>-<slug>.md
    docs/tese/               TESE-<data>-<slug>.md    (consultivo: docs/mapa-risco/)
    docs/plano/              PLANO-<data>-<slug>.md
    docs/canon/partes/       uma ficha por parte
    docs/canon/documentos/   uma ficha por documento — D1, D2, o que cada um prova
    docs/canon/cronologia.md linha do tempo dos fatos
    docs/canon/autos.md      andamento processual e preclusoes
    entregas/<estado>/       o kanban
    saida/                   markdown e DOCX prontos
```

Vale sempre o **último** artefato de cada diretório: `TESE-2026-09-10` substitui `TESE-2026-08-30`. O gate avisa quando há mais de um, porque só um é lido.

## O contrato de tópico

O que separa argumento de parágrafo. Fica em um bloco ` ```topico ` dentro da entrega, e o texto vem logo abaixo dele:

````
```topico
id: 1.1
tipo: merito
sustenta: a cobranca e inexigivel por falta de contrato escrito
fatos: [F1, F2]
provado: [F1]
documentos: [D1, D3]
fundamento: [art. 373, I, CPC]
pedidos: [P1]
risco: o banco vai alegar contratacao verbal
resposta: contrato bancario de credito exige forma escrita
```
````

`sustenta`, `fundamento` e `risco` são obrigatórios fora de `backlog`/`pesquisa`. `risco` sem `resposta` reprova: apontar o próprio ponto fraco sem respondê-lo é escrever a peça da outra parte.

No consultivo o bloco é o mesmo, com `riscos:` e `mitigado:` no lugar de `fatos:` e `provado:`.

## O que o gate cobra

`attorneyfw validate` — dentro de uma matéria, aquela matéria; na raiz, a carteira inteira. Reprova com código 1.

**Prazo** (o mais caro): prazo vencido com a entrega ainda aberta; prazo declarado pela metade; entrega fechada sem `entregue_em`; entrega registrada depois do vencimento (intempestiva); prazo **fatal** vencendo em ≤ 2 dias úteis, ou em ≤ 5 dias com a entrega ainda em `backlog`/`pesquisa`.

**Prova e fundamento**: fato da tese que nenhum tópico narra; fato dado por provado sem documento; documento citado que não existe no canon; pedido que nenhum tópico sustenta; risco mapeado que nenhuma cláusula mitiga.

**Cadeia**: matéria sem tese ou mapa; tese sem plano; entrega fora do plano; entrega planejada e não materializada; número duplicado; frontmatter que discorda da pasta; mais de uma versão do artefato de estratégia.

**Higiene**: limite de WIP em `minuta`; entrega em revisão sem redação; documento do canon sem id ou com id duplicado; matéria em segredo de justiça antes de gerar saída.

Enquanto a matéria está em curso, fato não pago é **aviso**. Quando toda entrega saiu do escritório, vira **erro**: não há mais peça em que pagar o que ficou em aberto.

## Contagem de prazo

Dois regimes, declarados — nunca inferidos. Adivinhar prazo é o único erro desta ferramenta que custa o caso.

| | `processual` (padrão) | `material` (`--material`) |
|---|---|---|
| base legal | CPC, arts. 219, 220 e 224 | CTN, art. 210 |
| termo inicial | primeiro dia **útil** seguinte | dia seguinte, **útil ou não** |
| unidade | dias úteis (ou `--corridos`) | dias corridos, sempre |
| recesso de 20/12 a 20/01 | suspende | **não suspende** — é processual |
| vencimento sem expediente | prorroga | prorroga |

```bash
attorneyfw prazo set 1 --intimacao 2026-09-01 --dias 15 --fatal
attorneyfw prazo set 2 --intimacao 2025-12-26 --dias 30 --material
```

Já conhece os feriados nacionais, inclusive os que dependem da Páscoa — carnaval, cinzas, sexta-feira da paixão, corpus christi.

Não conhece, e nunca vai conhecer sozinho: feriado estadual e municipal, portaria de suspensão de expediente, ponto facultativo do foro. Isso entra em `docs/feriados.md`, uma linha por dia. Sem isso a contagem sai errada **para menos** — e errar para menos é o único erro desta ferramenta que perde prazo.

### A divergência do art. 210, parágrafo único

O dispositivo diz que os prazos "só se **iniciam** ou vencem em dia de expediente normal". Se esse deslocamento alcança apenas o vencimento, ou também o termo inicial, é questão em aberto — e as duas leituras dão datas diferentes.

Quando divergem, o CLI devolve as duas e **adota a mais curta**:

```
intimacao 2025-12-26 | 30 dias corridos (material) | inicio 2025-12-27 | vence 2026-01-26
  duas leituras do art. 210, par. unico, do CTN — adotada a mais curta
    caput: contagem de 2025-12-27, vence 2026-01-26  <- adotada
    se "iniciam" tambem deslocar: de 2025-12-29, vence 2026-01-27
```

Entre duas leituras defensáveis, a ferramenta nunca pode ser a que concede folga. Quando o dia seguinte à intimação já é dia útil, as leituras coincidem e a saída é uma data só. Ver `docs/adr/ADR-2026-08-31-prazo-material-*`.

## O que a peça anuncia sobre si mesma

Duas coisas apareceram nas oito peças que não são erro de direito nem erro de conta: **promessas que a peça faz sobre si e não cumpre.** As duas passam despercebidas porque quem lê sabe do que se trata e completa sozinho.

**O título promete um pedido que a peça não formula.** Numa anulatória fiscal, o título diz *"c/c pedido de tutela provisória de urgência"*, o art. 300 aparece na qualificação — e o pedido de tutela não é feito. É a mesma remissão vazia que o gate já persegue no corpo, agora no lugar mais visível da peça.

**A prioridade anunciada não bate com a idade declarada.** Num alvará, o cabeçalho diz *"prioridade de tramitação, autores com 64 anos"*; entre os cinco requerentes, o mais velho tem 69 e três passam de 60. O número escolhido não é o do mais velho nem o do limite legal.

Por isso a ficha de parte ganhou `nascimento:`, e **a idade passou a ser derivada, nunca digitada** — idade escrita à mão envelhece no dia seguinte e não se confere contra nada.

O gate **avisa**, e não reprova, em três situações:

- o título anuncia `c/c X` e o pedido não menciona X;
- há parte com 60+ ou menor, e a peça não pede prioridade;
- a peça fala numa idade que nenhuma parte da ficha tem — mostrando os dois lados.

As três têm caso legítimo, e por isso nenhuma reprova. **Sem `nascimento:` na ficha, a regra da idade simplesmente não roda** — e não há aviso de campo faltando: campo que a matéria não precisa não vira cobrança.

O limite é claro e a mensagem o respeita: o gate diz que a peça **anuncia e não cumpre**. Não diz que a tutela era cabível nem que a prioridade é devida — isso é leitura, e fica com o agente de fundamento.

## As fórmulas da peça

O `build` montava o endereçamento com uma linha escrita no código, feita para ser neutra: sem acento e com o gênero entre parênteses. Medida contra oito peças reais de um escritório, **ela não aparecia em nenhuma.** As oito usavam a forma cheia, com acento e gênero resolvido, e ela variava com o foro — seis formas distintas em oito peças. O `build` emitia uma sétima, que não era de ninguém.

Endereçamento é a primeira coisa que o juízo lê. Sair numa forma que o escritório não usa denuncia a peça antes do primeiro argumento.

Agora as fórmulas moram em `formulas.yaml`, na carteira — o mesmo padrão já decidido para a série de índice e para a tabela de custas: **o que muda por escritório, por comarca e por ano não pode estar compilado.**

```yaml
enderecamento_civel: EXCELENTISSIMO SENHOR DOUTOR JUIZ DE DIREITO DA {juizo} DA COMARCA DE {comarca}
enderecamento_juizado: AO JUIZO DE DIREITO DO {juizo} DA COMARCA DE {comarca}
```

O foro vem de `foro:` no `materia.yaml` — `civel`, `fazenda`, `familia`, `juizado` ou `trabalho` —, e é **declarado, nunca inferido** do texto de `juizo:`. Inferir acertaria em quase todos os casos do corpus, e o que sobra endereça a peça ao juízo errado.

**Marcador sem valor sai visível no papel**, como `{comarca}`, e não como espaço em branco: peça com buraco tem de parecer peça com buraco, e espaço em branco ninguém nota na revisão. O `build` também conta quantos ficaram.

Sem `formulas.yaml`, o `build` **não falha** — peça tem de sair. Usa a semente do CLI e avisa **na primeira peça costurada da matéria**, não a cada build: a informação não muda entre uma peça e a seguinte, e repetir ensina a pular a linha amarela — levando junto a próxima, que talvez importe.

A condição é permanente, então ela vive no **gate**, que roda por matéria. O `build` guarda só o primeiro encontro, que é onde a informação é nova.

## Style card — como este escritório escreve

```bash
attorneyfw estilo --de "peca1.docx,peca2.docx,peca3.docx"
attorneyfw estilo
```

O `bookfw` já provou o mecanismo: a voz do autor sai das amostras dele, e a prosa passa a soar como ele em vez de soar como um modelo. Aqui o `adv-gaio` redigia com a voz que o modelo tem.

**O card descreve, e não prescreve.** Um card prescritivo — "chame a parte de Requerente" — é mais acionável e transforma uma medição de oito peças numa regra de redação. Oito peças não sustentam regra nenhuma, e corrigir o advogado pela frequência é a mesma família da porcentagem de êxito que esta ferramenta recusa: número pequeno com cara de norma.

Por isso **cada traço sai com o `n`** — em quantas peças apareceu, de quantas foram lidas — e nenhuma linha diz "escreva assim".

Derivado das oito peças de um escritório real:

| traço | |
|---|---|
| trata o juízo por "Excelência" | 5/8 |
| aponta prova com "conforme … anexo" | 6/8 |
| convida com "vejamos" | 4/8 |
| rótulo Requerente/Requerida | 7/8 |
| rótulo Autor/Ré | 4/8 |
| mediana do parágrafo | 40 palavras |

**O único gate que o card habilita é de consistência interna:** peça que usa os dois pares de rótulo para a mesma parte recebe aviso. Isso se verifica dentro da peça e não depende de o card estar certo — e é real em três das oito, onde a mesma pessoa é "Requerente" num parágrafo e "Autor" no seguinte.

Aviso, e nunca violação: há caso legítimo, como peça que trata de dois processos com polos diferentes. E **não há gate de aderência à voz** — estilo não se reprova.

Não existe card de partida no CLI, pela mesma razão que não existe modelo de ação de partida: seria opinião sobre estilo jurídico vinda de quem não advoga.

### O card chega em quem escreve

Até a 0.6.0 ele não chegava. O card era medido, gravado e nunca aberto na hora de redigir — o `brief` montava contrato, canon e cronologia e não lia `estilo.yaml`. A 0.7.0 fechou esse laço, e a forma como ela fecha é a decisão inteira:

**A seção de voz não entra em `## Instrucoes`.** Um traço que diz `em 6/8` colocado dentro de um pacote de instruções deixa de ser descrição no instante em que é lido: quem redige trata a frequência como norma, e o resultado é uma peça que imita tique. Em `## Instrucoes` entra apenas o oposto — `Nao force traco de estilo`.

**Piso: `n ≥ 3` e presença em mais da metade.** Traço visto em 2 de 8 é ruído, e ruído repetido em todo briefing vira estilo da casa em duas semanas — sem que ninguém lembre que era ruído. Metade exata também não passa: 4 de 8 não descreve nada.

**Ênfase em caixa alta fica de fora, por decisão.** É o único traço medido que se imita em excesso sem esforço, e excesso de caixa alta é defeito de peça, não voz de escritório. Está escrito aqui para não ser acrescentado depois como "faltava".

**O rótulo das partes sai da peça antes de sair do card.** Se os tópicos já escritos usam um par, o briefing diz esse — o gate cobra consistência dentro da peça, e não a escolha do par. O card só entra quando não há texto anterior.

E **continua sem existir gate de aderência à voz**. O card habilita uma regra, a de consistência interna, e nenhuma outra.

### O checklist chega como diferença

O `docs/checklist-<tipo>.md` do `modelo aplicar` também não era lido por ninguém. Ele entra no briefing filtrado ao que **falta**:

| bloco | o que aparece |
|---|---|
| fundamentos | os que o contrato deste tópico não declara |
| objeções | as que o `risco` declarado não previu |
| documentos | os que o canon da matéria não tem |

Só itens ainda em `- [ ]`: item marcado já foi confirmado ou descartado por quem assina, e relembrá-lo ensina a pular a lista inteira. A comparação de fundamento reusa o extrator da 0.6.0, então `art. 300, II, do CPC` na lista não reaparece quando o contrato já declara `art. 300 do CPC`.

Repetir o que já está no contrato duas seções acima é ruído, e lista repetida é lista pulada — o defeito que o modelo por tipo de ação já tinha nomeado: checklist que erra por excesso ensina a ignorar a lista, e lista ignorada é pior que lista ausente.

**O briefing é leitura.** Ele não marca item, não altera o checklist e não completa o contrato. E matéria sem checklist não ganha cobrança por não ter um: a seção simplesmente não aparece.

## A porta de entrada — importar peca arquivada

```bash
attorneyfw importar "peticao.docx"
attorneyfw importar "peticao.docx" --criar-materia "Cliente — Assunto"
```

A 0.4.0 decidiu que o modelo de ação sai das matérias que o escritório já trabalhou. Encostando isso na realidade aparece o problema: **um escritório com quinhentas peças no disco tem zero matérias na carteira.** Ninguém redigita. Sem porta de entrada, o `modelo destilar` destila do vazio e a memória institucional acumula em anos.

**A importação assiste, e não preenche.** Ela produz `docs/importado-<slug>.md` com tudo em `- [ ]`, para confirmar ou descartar item a item. **Nada entra na tese, no plano ou em contrato de tópico** — peça importada é material bruto, e a cadeia continua começando pela DEC.

O que sai por regra, classificado por confiança:

| | confiança | |
|---|---|---|
| CPF e CNPJ | **alta** | conferidos por dígito verificador |
| endereçamento | **alta** | a primeira linha |
| datas e valores | **forma** | alta na forma, **nenhuma** no significado |
| trechos que apontam anexo | média | dizem que há prova, não qual |
| nomes de parte | média | pegam cabeçalho, e **podem faltar** |

**Documento com dígito que não fecha entra marcado**, e não em silêncio. Rodando contra oito peças reais, foi assim que apareceu um CPF de requerente que não existe — e importar sem conferir teria propagado o erro para a ficha da carteira, que é a fonte de todas as peças seguintes.

Partes viram **sugestão** de `attorneyfw parte new`, e nunca ficha gravada. `.docx` é lido sem dependência nenhuma — o pacote é um zip e o corpo está em `word/document.xml`. PDF está fora do escopo, e o comando diz isso.

O relatório termina sempre com uma seção fixa — **"o que esta importação NÃO extraiu"** — listando o que só a leitura resolve: qual fato é controvertido, qual documento prova o quê, qual fundamento sustenta qual pedido, e a tese. Silêncio sobre o que faltou seria a importação se apresentando como completa.

## O canon da carteira

```bash
attorneyfw parte new "Industria Alfa Ltda" --documento 11.222.333/0001-81
attorneyfw parte new "Industria Alfa — filial PE" --documento <cnpj-da-filial> --matriz industria-alfa-ltda
attorneyfw parte list

# na materia, a ficha referencia em vez de redigitar:
attorneyfw canon new parte "Industria Alfa Ltda" --papel autor --ref industria-alfa-ltda
```

**Uma qualificação por parte, na carteira inteira.** Esta é a mudança que nasceu do achado mais consequente da leitura de oito peças reais: em quatro delas o cliente era o mesmo, e um CNPJ aparecia como filial de um estado numa ação e como a autora — com sede e inscrição estadual de outro — na ação vizinha.

O gate não veria isso nem em cem execuções, e o motivo é estrutural: **o canon era por matéria, e a contradição estava entre duas**. Cliente recorrente é a regra num escritório, não a exceção.

| | fica na carteira | fica na matéria |
|---|---|---|
| nome, documento, endereço, inscrições | ✓ | |
| papel no processo, o que a parte afirma nos autos, procuração | | ✓ |

A mesma empresa é autora num processo e ré noutro; o CNPJ não muda com isso. Misturar os dois níveis foi o que permitiu a divergência — cada matéria redigitava a qualificação inteira, e a segunda digitação discordava da primeira.

**Matriz e filial são fichas distintas**, cada uma com seu CNPJ, ligadas por `matriz:`. Tratar filial como campo de endereço da matriz é exatamente o que produziu o erro observado, e em matéria tributária, trabalhista e previdenciária quem responde é o estabelecimento.

O documento é obrigatório e validado por dígito verificador: é ele que distingue homônimo e é ele que o gate compara.

Divergência entre a ficha da matéria e a da carteira é **violação**, não aviso — aqui reprovar é o certo, porque não há caso legítimo em que o mesmo documento tenha duas qualificações. Se a carteira estiver errada, corrige-se a carteira, num lugar só, e todas as matérias acompanham.

Ficha antiga sem `ref` continua carregando, sem migração. A subida é oportunidade, não ruptura.

## A memória do escritório

A carteira sempre foi a base de casos — uma pasta por matéria, com decisão, tese, fatos, provas e cronologia, em texto e versionada. Faltavam duas coisas para que ela respondesse perguntas.

**O desfecho.** A última entrega em `entregue` registra que a peça saiu, não o que aconteceu depois. Sem isso a base responde "já fizemos" e não responde "já perdemos" — que é a pergunta que evita repetir uma causa perdida em vez de propor acordo.

```bash
attorneyfw materia fechar ganho_parcial --valor 20000 --nota "danos morais reduzidos de 50k"
```

O vocabulário é fechado — `ganho`, `ganho_parcial`, `perda`, `acordo`, `extinto` — porque o valor da base está em conseguir **contar**, e campo livre não responde "quantas vezes já perdemos esta tese?". O que não couber vai em `--nota`, que fica ao lado. Matéria sem resultado está em curso; desfecho não se infere de kanban cheio.

**A busca.** `grep` acha uma palavra. Não responde *"que matérias enfrentaram esta tese, e como terminaram?"* — pergunta que cruza tese, fundamento e desfecho, e que ninguém faz com três greps encadeados no meio de um dia de trabalho.

```bash
attorneyfw buscar "indeferimento da opcao" --resultado perda
```

Devolve **matéria**, não linha solta: com o tipo, o desfecho, a nota e onde bateu. Varre tese ou mapa de risco, DEC, cronologia, título de entrega e as partes — por nome **e por documento**, com ou sem pontuação — e **não varre corpo de minuta**, de propósito: minuta contém citação e transcrição, e busca por termo jurídico casaria com o que foi *citado* em vez do que foi *sustentado*.

Matérias já encerradas na carteira entram no `attorneyfw context` sem ninguém pedir. Quem redige precisa saber que uma matéria irmã com a mesma tese terminou em perda, e essa é informação que só aparece se for empurrada.

O gate **avisa** — não reprova — quando uma matéria está toda entregue há mais de noventa dias e sem resultado. Nem todo desfecho chega nesse prazo, e reprovar por causa de um processo que só demora transformaria a regra em ruído.

## Amostra jurisprudencial e prognóstico

```bash
attorneyfw jurisprudencia add "0002079-26.2017.8.16.0004" --tribunal TJPR   --data 2018-08-16 --resultado contrario --lido --razao "a sentenca confirmada afastou o art. 31 §2"
attorneyfw jurisprudencia
attorneyfw prognostico
```

Estes dois entregam menos do que o escritório pediu, de propósito, e o [ADR](docs/adr/) diz por quê.

**A amostra é conferida, não um censo.** O pedido era "80% dos últimos 50 casos no TJPR". Há um obstáculo de acesso — os tribunais estaduais não oferecem consulta programável de inteiro teor — e um de método, que não se resolve com dinheiro: **classificar cinquenta acórdãos exige lê-los**. Um deles pode ter sido favorável por fundamento que não serve ao caso em mãos, e entra na conta como vitória. Dez a quinze lidos valem mais que cinquenta classificados por ementa.

Julgado sem `--lido` entra como `pendente` e **assim aparece** — a mesma disciplina do `[CONFERIR NA FONTE]`. A saída declara sempre o `n`, e nunca apresenta a amostra como universo. Não há coleta automática: registro é manual, fonte que exige contrato entra por chave do escritório, e captcha não se contorna.

**A ferramenta não produz probabilidade de êxito em porcentagem, e não vai produzir.** Não é limitação a ser removida quando houver dados melhores: é recusa, na mesma família de não assinar, não aprovar e não protocolar. Há uma regra de lint que reprova o build se essa recusa sumir de qualquer superfície.

O motivo tem três camadas. **Unidade:** força de argumento, risco processual e frequência histórica não estão na mesma escala e não se somam; a média delas tem precisão aparente e nenhum referente. **Uso:** aquele número não fica na tela — sai dela e vai para conversa com cliente, onde ninguém pergunta como foi calculado. **Responsabilidade:** número de probabilidade dado a cliente opera como promessa de resultado.

O que sai é semáforo, e **cada razão aponta o artefato de onde saiu** — quem discorda ataca a razão, e a razão tem endereço:

| Luz | Quando | Exemplo de razão |
|---|---|---|
| 🔴 vermelho | há impeditivo | `F2` sem provado; pedido sem tópico; prazo vencido; julgado contrário não distinguido |
| 🟡 amarelo | há reserva | citação não conferida; julgado da amostra não lido; teto e piso em branco |
| 🟢 verde | nenhum dos dois | ausência de defeito conhecido — **não** prognóstico de vitória |

Os critérios não são novos: são os que o gate já cobra, lidos em conjunto. Não há peso arbitrário a calibrar porque não há nota a compor.

E o que responde à pergunta do cliente sem fingir precisão já estava na tese desde a 0.1.0 — **teto e piso**, a **matriz de risco**, e o **escopo negativo**.

## Relatório ao cliente

```bash
attorneyfw relatorio --docx
```

Pós-venda: explicar a vitória e, sobretudo, explicar a derrota parcial. Compara `valor_pedido` com `resultado_valor`, corrigindo o primeiro quando há `valor_pedido_em`.

**O sinal do ganho vem do papel do cliente.** Consumidor pede R$ 50.000 de danos morais e o juiz condena a R$ 20.000: para o réu isso é um ganho de R$ 30.000; para o autor, os mesmos dois números são perda parcial de R$ 30.000. O sinal não está nos números — está em de que lado o cliente estava.

Por isso **o polo não se infere**. Sem papel declarado no canon de partes (ou, na falta dele, no `materia.yaml`), o comando falha. Relatório com o sinal trocado não é um relatório ruim: é um documento que diz ao cliente que ele ganhou quando perdeu.

Falta de `resultado` ou de `valor_pedido` também para o comando. Deduzir o pedido da peça seria adivinhar.

O `--docx` passa pelo mesmo gerador do `attorneyfw docx`, que lê o markdown já gerado — nada reconstrói a seleção do texto.

## Custas processuais

```bash
attorneyfw custas init --tribunal tjpr --ano 2026
attorneyfw custas 85000,00 --tribunal tjpr
```

Também **conferência, não o cálculo oficial**: o valor que vale é o da guia emitida pelo tribunal. Serve para responder ao cliente sem abrir cinco tabelas — não para substituir a emissão da guia.

**A tabela mora em arquivo versionado, nunca em raspagem ao vivo.** Custas mudam por ato normativo datado, e um número raspado de uma página não sabe dizer de onde veio. A saída diz sempre qual norma aplicou e de quando. Cada justiça tem a sua — `tabelas/custas/<tribunal>-<ano>.yaml` —, e crescer é acrescentar arquivo, não código.

Três tipos de componente cobrem o que as tabelas fazem: `percentual` (com piso e teto opcionais), `fixo`, e `faixas`.

Duas recusas, ambas deliberadas:

1. **Tabela sem `norma` e `norma_data` não carrega.** Procedência não é campo opcional num número que vai para orçamento a cliente.
2. **Tabela sem `conferido_em` não produz orçamento** sem `--provisorio` — e com ele, a saída sai marcada em vermelho como provisória. O `custas init` gera valores de exemplo; se ela pudesse orçar em silêncio, o exemplo viraria o orçamento de alguém.

O CLI **não vem com tabela de tribunal nenhum**. O `init` gera o formato; os números são do escritório, conferidos por uma pessoa contra a norma publicada. É trabalho de conferência, que é exatamente onde ele deve estar.

## Modelo por tipo de ação

```bash
attorneyfw modelo destilar plano-de-saude --de beta,gama,delta
attorneyfw modelo aplicar plano-de-saude
attorneyfw modelo
```

Este é o **checklist proativo de provas** — o que perguntar antes de existir tese —, entregue de um jeito que a ferramenta pode sustentar: **destilado do arquivo do próprio escritório, nunca gerado do nada.**

A diferença não é de qualidade, é de responsabilidade. Um modelo genérico é uma afirmação sobre o direito, feita pela ferramenta, que ninguém conferiu. Um modelo destilado das próprias matérias é uma afirmação sobre **o que aquele escritório já fez** — que o advogado reconhece ou corrige.

E há um risco prático que decide a questão: checklist genérico erra por **excesso**, manda juntar o que o caso não pede, e o advogado aprende a ignorar a lista. Lista ignorada é pior que lista ausente, porque ocupa o lugar da que seria lida.

O `destilar` lê, das matérias indicadas, o que cada documento do canon prova, os `fundamento` declarados nos contratos de tópico, e os `risco` que a outra parte levantou. **Cada linha carrega de quantas matérias veio e de quais** — item visto uma vez só sai marcado, porque não é regra do escritório.

**Sem matéria de origem, não há modelo.** Tipo que o escritório nunca trabalhou não ganha checklist: o comando diz isso e manda usar o agente de fundamento, que é onde essa pergunta pertence.

O `aplicar` cria `docs/checklist-<tipo>.md` com itens **pendentes**, para confirmar ou descartar um a um. Nada é dado por provado nem por fundamentado porque o modelo disse — a tese e o gate continuam cobrando exatamente o que cobram hoje.

## Conferência

```bash
attorneyfw conferir 1
```

Seis comparações mecânicas. As quatro primeiras rodam sobre o markdown que o `build` gerou — conferir uma versão e protocolar outra é pior que não conferir:

| Verificação | O que compara |
|---|---|
| **extenso** | os dois lados de `R$ 7.182,86 (sete mil cento e oitenta e dois reais e oitenta centavos)` |
| **soma** | as parcelas contra o total, quando a peça escreve "totalizando" |
| **item** | a lista enumerada nos fatos contra a lista no pedido |

Nenhuma interpreta. Todas apontam o par que diverge e param ali.

**A divergência sai sempre como par, com os dois lados à vista** — nunca "valor incorreto". A ferramenta não sabe qual dos dois está certo, e fingir que sabe faria o advogado corrigir o lado errado. Pela mesma razão, **nada é corrigido automaticamente**.

A verificação de item é extensão do que o gate já faz. Ele cobra `fato → prova` e `pedido → tópico`; agora cobra também `item alegado → item pedido`. Vale para linha telefônica, nota fiscal, parcela, matrícula, lote — qualquer conjunto que a peça enumera e depois pede. O pedido é o que vira dispositivo da sentença: item malformado ali não casa com nenhuma linha da cobrança, e a declaração de inexistência não o alcança.

O valor do item é capturado **inteiro** e classificado depois. Capturar só o que já tem a forma esperada faria item malformado desaparecer da lista e virar "índice faltante" — que é outro defeito, com outra correção. Foi exatamente esse o erro da primeira conferência feita à mão sobre o corpus, e foi o comparador que o corrigiu.

### Transcrição com lastro

O pior achado do corpus estava **dentro das aspas**: numa anulatória fiscal, a transcrição do auto de infração dizia `R$ 344.568,21` e o parágrafo seguinte usava `R$ 344.568,25` — e a soma da própria peça fecha com o `,25`. A peça inteira sustenta que o Fisco errou; a Fazenda responde exibindo que a autora transcreveu errado o documento que ela mesma juntou.

Por isso a transcrição declara de onde veio:

````markdown
```transcricao D3
Beneficiou-se com a utilizacao de credito de ICMS no valor total de R$ 344.568,21...
```
````

A ficha do documento registra, em `valores:`, os números que ele contém — conferidos uma vez na fonte. O `conferir` compara os dois. Valor transcrito com **a mesma parte inteira e centavos diferentes** sai como par: é digitação, não outro valor. Valor que a ficha simplesmente não registra sai como aviso, porque a ficha pode ainda não conhecê-lo.

O `build` transforma o bloco em citação recuada, assinada com o id — a assinatura fica **visível**, e não em comentário, porque comentário é removido antes de a peça sair. O gate reprova transcrição sem origem declarada, ou com origem que o canon não conhece.

### Texto do tópico contra o contrato dele

A quinta é de outra natureza, e é a única que **não roda sobre o papel**: o `build` remove o contrato de tópico de propósito, e sem contrato não há com o que comparar o texto. Ela lê a entrega na origem, onde contrato e prosa ainda estão lado a lado.

O contrato declara `fundamento: [...]` desde a 0.1.0 — uma **lista branca de citações**. Até a 0.5.1 ela estava escrita, estava parseada, e nenhuma linha de código a comparava com o que a prosa cita. Um tópico podia declarar `fundamento: [art. 300 do CPC]`, citar no texto o art. 373, II, e a Súmula 7 do STJ, e passar no gate inteiro.

Isso não é estilo. O dispositivo que entra na peça sem passar pelo contrato é exatamente o que ninguém conferiu: não passou pelo agente de fundamento, não foi distinguido, não teve vigência checada. Das oito peças reais lidas em 2026-08-31, **três** tinham erro de fundamento — e os três eram dispositivos que entraram no texto sem contrato.

| Comparação | Sai como |
|---|---|
| citação no texto que o contrato não declara | aviso, com os dois lados |
| fundamento declarado que a prosa não invoca | aviso, com os dois lados |
| documento declarado que o texto não menciona | aviso, com os dois lados |
| contrato preenchido e prosa vazia | **erro** em `revisao` e `entregue` |

Quatro são aviso porque a exceção legítima é diária: citar o dispositivo da outra parte para refutá-lo, invocar o artigo do próprio ato processual. O gate desta ferramenta só reprova o que não tem exceção — e é por isso que o que ele reprova é levado a sério.

O tópico vazio reprova porque não tem exceção. O gate contava palavras da **entrega inteira**, e um tópico vazio se escondia atrás de outro bem escrito. Em `backlog` e `pesquisa` nada roda: lá o contrato ainda está sendo levantado, de propósito.

**A comparação é por artigo.** `art. 373, II` e `art. 373` são o mesmo fundamento — por decisão, não por limitação. Distinguir incisos multiplicaria o aviso por cada refinamento de escrita, e aviso que dispara sempre é aviso que ninguém lê. `art. 38 da LEF` e `art. 38 da Lei 6.830/80` também são o mesmo, pela tabela declarada de leis.

**Sigla fora da tabela não vira citação.** Silêncio, e não palpite — a mesma disciplina do extenso, que devolve `null` diante de palavra desconhecida. Um fundamento "conferido" errado é pior que um fundamento não conferido.

### Continuidade de fato entre tópicos

O template da cronologia, escrito em toda matéria nova desde a 0.1.0, promete literalmente:

> *"É daqui que sai a narrativa da peça, e é contra isto que se confere se a data citada no tópico 4 bate com a do tópico 9."*

Até a 0.7.0 **nada conferia**. Quatro módulos liam a cronologia — o diagrama, o briefing, a busca e o status — e nenhum comparava. O canon guardava a grafia de cada nome, os documentos com ficha e a cronologia com uma linha por fato, tudo declarado e legível por máquina, e a comparação não existia.

A pergunta que dá forma a esta conferência não é *"como conferir continuidade"*. É: **o que em continuidade é comparação?** Dizer que o tópico 4 fala do mesmo evento do tópico 9 é leitura, e leitura não mora aqui.

Só é comparável o que tem **âncora declarada**:

| Comparação | Âncora |
|---|---|
| data no texto que a cronologia não registra | a tabela da cronologia |
| datas sem intersecção em tópicos que declaram o mesmo documento | o `documentos:` do contrato |
| grafia que não é a declarada no canon | o nome canônico e seus apelidos |

**A ferramenta nunca infere que dois fatos são o mesmo fato.** Casar a data do texto com o marco mais próximo da cronologia seria o achado que o advogado mais quer — e exige decidir que os dois falam do mesmo evento. Sem âncora declarada, ela cala.

Três consequências dessa regra, todas deliberadas:

- **Tópico que declara dois documentos fica de fora.** Atribuir a data a um deles seria inferência.
- **Duas datas no mesmo tópico não são divergência.** Contrato e aditivo convivem, e dizer qual é a do documento seria inferência. A comparação exige tópicos diferentes com **intersecção vazia**.
- **Diferença só de caixa em nome não conta.** Qualificação em caixa alta é forma normal de peça; o que se aponta é acento perdido.

Nada dentro de bloco de transcrição é conferido: o que está entre aspas é do documento, e apontar seria pedir que se falsificasse a citação para ela bater com a cronologia. Ano solto também não é data — `Lei 8.078, de 1990` não vira marco.

**As três são aviso, e nenhuma reprova.** Ao contrário da quinta conferência, aqui nenhuma comparação é sem exceção legítima: data de lei citada de passagem, nome social de parte, documento com data de emissão e de vencimento.

Cronologia vazia desliga a comparação, e isso **sai dito**: uma linha informa quantas datas a peça cita e que nenhuma foi conferida contra ela. Não é cobrança — é a mesma disciplina do `importar`, que sempre termina dizendo o que não extraiu.

### O que a conferência não confere

Fora do alcance, e declarado: número dentro de imagem anexada. E, no fundamento:

- **não verifica se o dispositivo existe**;
- **não verifica se está em vigor**;
- **não verifica se foi superado**, revogado ou distinguido;
- **não julga se ele sustenta** o que o tópico afirma.

As quatro são leitura, e ficam com o agente de fundamento. Uma ferramenta que dissesse "esse artigo não sustenta isso" estaria opinando sobre mérito com cara de gate — e gate em que se pode discordar é gate que se aprende a ignorar.

E, na continuidade: ela **não infere que dois fatos são o mesmo fato**, e **não diz qual das duas datas está certa**.

A recusa sai impressa em toda conferência, **com achado ou sem achado**: relatório que só lista o que achou é lido como se tivesse achado tudo.

## Dado pessoal na peça

```bash
attorneyfw dados 1                    # so acusa — nada e alterado
attorneyfw anonimizar --init          # cria o mapa real -> ficticio
attorneyfw anonimizar 1               # aplica o mapa inteiro numa passada
attorneyfw anonimizar 1 --reverter
```

**A anonimização é um mapa, não uma varredura.** A diferença nasceu de três peças reais que tinham sido anonimizadas à mão antes de circular, e que saíram pela metade: numa ficou o CPF de uma criança ao lado do diagnóstico; noutra, quem foi anonimizado foi a falecida, e cinco pessoas vivas saíram com nome, CPF, RG e endereço; na terceira — um modelo, que vai ser reaproveitado — a substituição escapou num parágrafo do meio.

O diagnóstico não é "faltou cuidado". É que **meia anonimização é pior que nenhuma**, e não pelo que deixa passar: pelo que faz acreditar. Arquivo marcado como anonimizado circula por e-mail, entra em pasta compartilhada e vira modelo — porque parece seguro. Arquivo não anonimizado ninguém manda.

O escritório declara `real: ficticio` uma vez em `anonimizacao.yaml`, e a substituição é aplicada **numa passada só** sobre o texto inteiro. Não existe o caso "escapou um parágrafo". Quatro recusas acontecem antes de qualquer escrita:

1. lado real com menos de quatro caracteres — acertaria dentro de outra palavra;
2. lado fictício que já existe no texto — a volta trocaria ocorrência legítima pelo nome de outra pessoa;
3. o mesmo termo sendo saída de um par e entrada de outro;
4. o texto escrevendo o nome com outra caixa — só a forma declarada e a MAIÚSCULA voltam iguais, e o comando diz qual variação acrescentar.

Qualquer impedimento **falha sem gravar nada**. A ida e volta devolve o original byte a byte.

O `attorneyfw dados` reconhece CPF, CNPJ, e-mail, telefone, RG e cartão — CPF e CNPJ com dígito verificador, para não alarmar em cima de número de processo. Ele **não substitui**: serve para escrever o mapa. E reconhece **formato, não pessoa** — nome próprio, apelido, razão social e endereço não são detectados por forma nenhuma, e foi nome próprio que escapou nas três peças. A saída diz isso, porque ver "nada encontrado" não pode ser lido como "pode circular".

O gate **avisa**, e nunca reprova: peça de verdade tem de conter o CPF da parte, e o CPF que qualifica o autor no processo dele não é vazamento.

`anonimizacao.yaml` está no `.gitignore` — é a chave que desfaz a anonimização de todas as peças de uma vez.

## Visual law

Três diagramas, e só três:

```bash
attorneyfw diagrama linha-do-tempo --salvar
attorneyfw diagrama partes
attorneyfw diagrama fato-prova
```

| Diagrama | Fonte | O que mostra |
|---|---|---|
| `linha-do-tempo` | cronologia × canon de documentos | fato, data, e o documento que o prova |
| `partes` | canon de partes | quem é quem, e o papel de cada um |
| `fato-prova` | tese × contratos de tópico | cada `F` ligado ao `D` que o paga |

**Diagrama é projeção de dado estruturado, nunca de texto livre.** O caminho óbvio — pedir ao modelo que desenhe lendo a minuta — funciona na demonstração e falha na terceira versão da peça: corrige-se uma data no corpo e a figura fica com a antiga. Divergência é pior que ausência, porque a figura tem autoridade visual e é a contraparte quem acha a contradição. Aqui a figura não pode divergir da peça, porque as duas leem o mesmo lugar.

Se o dado não está no canon, não entra na figura. Quem quiser um marco na linha do tempo acrescenta o fato à cronologia — que é onde ele deveria estar de qualquer modo, e onde o gate já o cobra.

**Marco sem documento sai visivelmente marcado como não provado**, em vermelho tracejado. Não é enfeite: é a mesma exigência que o gate faz ao texto, aplicada à figura. Sair igual aos outros seria a figura mentindo com mais autoridade que o parágrafo.

Na peça, a figura entra onde o tópico pedir — num bloco cercado, o mesmo idioma do contrato de tópico:

````markdown
```diagrama
linha-do-tempo
```
````

Bloco, e não comentário HTML: comentário nesta ferramenta já quer dizer nota de trabalho, e é removido justamente para não vazar para a peça. Marcar diagrama assim pediria uma figura que desaparece antes do `build` ver.

O `build` troca a marca pelo bloco Mermaid. A fonte é texto — entra no diff, na revisão e no versionamento como qualquer outra parte da peça. Se o diagrama não puder ser gerado, o `build` **não para**: deixa um aviso no lugar da figura e segue, porque falta de figura não pode impedir um protocolo.

O `docx` renderiza com o [mermaid-cli](https://github.com/mermaid-js/mermaid-cli) quando ele está no PATH (`npm i -g @mermaid-js/mermaid-cli`); sem ele, insere um aviso e **a peça sai assim mesmo**. E continua lendo o markdown que o `build` gerou — não consulta canon nem cronologia.

## Correção monetária

```bash
attorneyfw indice atualizar           # so este comando toca a rede
attorneyfw atualizar 8500,00 --de 2019-03-14 --ate 2026-08-31 --serie inpc --juros 1
attorneyfw atualizar 8500,00 --de 2019-03-14 --selic --json
```

O que sai daqui é **conferência, não o cálculo oficial**: o valor que vale é o da memória homologada nos autos, e a contadoria do juízo nem sempre adota a mesma convenção. A ferramenta serve para o valor chegar à minuta **com a memória junto** — nunca sozinho.

Quatro regras de desenho, e cada uma responde a uma forma conhecida de produzir número indefensável:

1. **A série mora na carteira, em `tabelas/indices/`, versionada.** O arquivo guarda a variação mensal *como a fonte publica* — não um número-índice já calculado —, para que cada linha continue conferível contra a série do Banco Central. O número-índice é derivado na leitura.
2. **Só o `indice atualizar` faz requisição de rede.** O cálculo lê arquivo e nada mais. Ele funciona offline, e os mesmos arquivos devolvem o mesmo número daqui a um ano.
3. **Fora da cobertura da série, o comando falha.** Não extrapola, não repete o último índice, não interpola. A mensagem diz até onde a série vai e o que rodar. Buraco no meio da série também é erro, e não silêncio: a razão entre dois pontos passaria por cima do mês faltante e devolveria fator menor sem avisar.
4. **A saída traz sempre memória e procedência**, inclusive no modo resumido — que é justamente o que acaba copiado para a peça.

Convenções adotadas, declaradas porque não são as únicas defensáveis: correção por **mês cheio**, com base no mês do termo inicial; juros simples **pro rata die** sobre trinta dias; e a Selic **somada**, não composta, excluídos o mês inicial e o do pagamento, mais 1% no mês do pagamento — que é como ela se aplica no art. 406 do Código Civil.

O IPCA-E não tem coleta automática nesta versão: preenche-se à mão, e o comando diz isso em vez de buscar um código de série não confirmado. Código errado produz número plausível e errado, que é o pior resultado possível aqui.

## Desenvolvimento

```bash
npm run check     # lint + smoke
```

O lint tem doze regras, cada uma nascida de coisa que já quebrou no trackfw ou no bookfw — inclusive uma que reprova o build se qualquer ressalva de conferência sumir do README, do help ou do módulo que a produz. Hoje ela cobre três: a contagem de prazo, a correção monetária e o orçamento de custas.

## Escopo negativo

O attorneyfw **não** é: sistema de peticionamento, controle de horas, financeiro, CRM, nem substituto do sistema de prazos do tribunal. Não consulta processo, não baixa intimação e não protocola. Ele governa o trabalho que acontece entre a intimação e o protocolo — e só isso.
