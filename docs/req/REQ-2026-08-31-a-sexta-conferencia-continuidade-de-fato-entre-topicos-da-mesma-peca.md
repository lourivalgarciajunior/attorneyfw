---
status: In Progress
date: 2026-08-31
author: "Lourival Garcia"
adr: "ADR-2026-08-31-a-continuidade-de-fato-se-confere-contra-o-que-foi-declarado-e-nunca-inferindo-que-dois-fatos-sao-o-mesmo"
roadmap: "ROADMAP-2026-08-31-a-sexta-conferencia-em-tres-ondas"
---

# REQ: A sexta conferencia — continuidade de fato entre topicos da mesma peca

> Date: 2026-08-31 | Status: In Progress

## Decisoes que amarram esta REQ

ADR: `docs/adr/ADR-2026-08-31-a-continuidade-de-fato-se-confere-contra-o-que-foi-declarado-e-nunca-inferindo-que-dois-fatos-sao-o-mesmo.md`
— a decisao inteira: as tres ancoras declaradas, a recusa em inferir que dois
fatos sao o mesmo, e por que as tres sao aviso.

ADR: `docs/adr/ADR-2026-08-31-numero-se-confere-contra-si-mesmo-e-contra-o-documento-de-onde-foi-transcrito.md`
— a familia em que ela entra, e a regra de nao mexer no que esta dentro das aspas.

Roadmap: `docs/roadmaps/wip/ROADMAP-2026-08-31-a-sexta-conferencia-em-tres-ondas.md`

## Motivation

O template `templates/cronologia.md`, escrito em toda materia nova desde a 0.1.0,
promete literalmente:

> *"E daqui que sai a narrativa da peca, e e contra isto que se confere se a data
> citada no topico 4 bate com a do topico 9."*

**Nenhuma linha de codigo cumpre essa frase.** Medido no codigo de hoje:

| Quem le `docs/canon/cronologia.md` | Para que |
|---|---|
| `src/diagrama.mjs` | desenhar a linha do tempo |
| `src/brief.mjs` | despejar no briefing |
| `src/buscar.mjs` | busca textual na carteira |
| `src/status.mjs` | mostrar no painel |
| **conferencia** | **ninguem** |

E o cabecalho de `src/canon.mjs` nomeia o mesmo buraco pelo outro lado: *"a peca 7
esquece o que a peca 2 afirmou — nome grafado de outro jeito, valor que mudou,
data que nao bate com a cronologia. A contraparte le as duas."*

O canon foi construido para isso, guarda tudo declarado e legivel por maquina — o
`diagrama` ja prova que a tabela da cronologia se le. O dado esta pronto, e a
comparacao nao existe.

## Scope

1. **`tabela()` sobe para `src/core.mjs`.** Hoje e privada de `src/diagrama.mjs`,
   e passa a ter dois leitores.
2. **`conferirContinuidade(topicos, canon, cronologia)`** em `src/conferir.mjs` —
   a sexta conferencia, tres comparacoes, cada uma com ancora declarada:
   - **`data-fora-da-cronologia`**: data no texto que a tabela nao registra;
   - **`data-divergente-do-documento`**: datas diferentes em topicos que declaram
     o mesmo documento, e contra o `data:` da ficha quando ela o declara;
   - **`grafia-fora-do-canon`**: grafia de nome que casa com um nome do canon a
     menos de acento ou pontuacao, mas nao e a declarada.
3. **Extrator de data em prosa**: `12/03/2024` e `12 de marco de 2024`,
   normalizados a `AAAA-MM-DD`. Bloco de transcricao **excluido** antes de
   extrair.
4. **`conferir` e o gate mostram a sexta**, com os avisos por topico e a linha do
   que **nao** foi conferido.
5. **Doutrina**: README, `AJUDA`, CHANGELOG, skill, `adv-paulo`, `adv-celso`,
   comando `conferir`, e regra de lint que reprova o build se a recusa sumir.

## Negative scope — o que esta REQ NAO faz

- **Nao infere que dois fatos sao o mesmo fato.** Sem ancora declarada, cala. Nada
  de "o marco mais proximo", nada de casamento por similaridade.
- **Nao aponta a data certa.** Par a vista, e a escolha e de quem assina.
- **Nao corrige a cronologia nem o texto**, e nao acrescenta marco.
- **Nao le dentro de bloco de transcricao.** O que esta entre aspas e do
  documento.
- **Nao confere data processual** — intimacao, prazo e vencimento sao do
  `attorneyfw prazo`, que tem ressalva propria.
- **Nao trata ano solto como data.** `Lei 8.078, de 1990` nao vira marco.
- **Nao reprova nada.** As tres sao aviso; todas tem excecao legitima.
- **Nao confere valores entre topicos** fora de transcricao — nao ha ancora
  declarada.
- **Nao aponta diferenca so de caixa** em nome: qualificacao em caixa alta e forma
  normal de peca.
- **Nao cria modulo, campo de contrato nem dependencia de runtime.**
- **Nao cobra cronologia preenchida.** Vazia, ela desliga a comparacao e isso sai
  dito no relatorio, como informacao e nao como demanda.

## Acceptance criteria

- [ ] `12/03/2024` e `12 de marco de 2024` normalizam para a mesma chave.
- [ ] `Lei 8.078, de 1990` nao produz data.
- [ ] Data dentro de bloco `transcricao` **nao** e extraida.
- [ ] Data no texto ausente da cronologia produz par; presente nao produz nada.
- [ ] Dois topicos que declaram `D3` com datas diferentes produzem um par que **nomeia os dois topicos**.
- [ ] Dois topicos com datas diferentes e **sem** documento comum nao produzem nada.
- [ ] Ficha de `D3` com `data:` divergente da citada produz par.
- [ ] `Construtora Alvares` contra o canon `Construtora Álvares` produz par.
- [ ] `CONSTRUTORA ÁLVARES` **nao** produz par — diferenca so de caixa.
- [ ] Apelido declarado no canon nao produz par.
- [ ] Cronologia vazia: a linha diz quantas datas a peca cita e que nada foi conferido contra ela.
- [ ] Nenhuma das tres vira violacao no gate.
- [ ] `npm run check` verde: 15 regras de lint e o smoke nos dois tipos de materia.
- [ ] `trackfw validate` sem violacoes.
