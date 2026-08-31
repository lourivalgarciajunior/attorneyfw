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

## Desenvolvimento

```bash
npm run check     # lint + smoke
```

O lint tem nove regras, cada uma nascida de coisa que já quebrou no trackfw ou no bookfw — inclusive uma que reprova o build se a ressalva de que a contagem não é a oficial sumir do README, do help ou do módulo de prazo.

## Escopo negativo

O attorneyfw **não** é: sistema de peticionamento, controle de horas, financeiro, CRM, nem substituto do sistema de prazos do tribunal. Não consulta processo, não baixa intimação e não protocola. Ele governa o trabalho que acontece entre a intimação e o protocolo — e só isso.
