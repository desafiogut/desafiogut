---
name: utac-edicoes
description: "Use when touching any edition UI (Relâmpago, Programada, Especial) in DesafioGUT — canonical card, action form, live table, states and language."
---

# Edições DesafioGUT — padrão canónico de UI/UX

Esta skill existe por um erro concreto e caro: no UTAC140 o executor inventou um **«sub-cartão»** próprio
para a Edição Especial (o `CardLance` inteiro dentro do cartão da edição: cabeçalho «🎯 Dar Lance», barra de
carteira, rodapé, botão de largura toda) e a tabela ao vivo ficou a dizer «🕒 Em breve» com a edição aberta.
O operador viu-o em produção. A regra, a partir de agora: **nenhuma edição desenha o seu próprio layout**.
Usa-se o que já existe. Se algo falta, **estende-se o componente existente com uma variante** — não se cria
um cartão novo.

Vale para: Edição Relâmpago (MLC), Ofertas Programadas (palpite) e Edição Especial (`ESPECIAL-*`).

---

## 1. Onde vive o cartão da edição

| Ecrã | Onde | Componente |
|---|---|---|
| Início (`pages/Dashboard.jsx`) | vidro «⚡ Relâmpago» / «🎫 Programada» | `CartaoEdicao` + acção |
| Menor Lance Único (`pages/MercadoLances.jsx`) | o cartão da edição, logo abaixo do cabeçalho | `CartaoEdicao` + `CardLance` |
| Ofertas Programadas (`pages/OfertasProgramadas.jsx`) | carrossel de cartões (1 por edição) | `CartaoEdicao` + `FormularioAcao` |
| Edição Especial | ocupa o lugar da Relâmpago, no Início e no MLC | `CartaoEdicao` via `CardEdicaoEspecial` |

**Um só invólucro: `components/CartaoEdicao.jsx`.** Estrutura fixa, por esta ordem:

1. **topo** — cápsula com o id da edição (`ESPECIAL-RELAMPAGO1`, `R-1`, `PROG-7`) + **selo de estado**;
2. **arte** — a arte da edição na largura toda (1:1 no telemóvel, 16:9 no desktop), com
   **faixa** por baixo: nome do produto + tempo/contagem;
3. **acção** — o formulário (lance ou palpite), como `children`.

Proibido: `<section>` própria, caixa amarela própria, um segundo cartão dentro do cartão, um cabeçalho
próprio («🎯 Dar Lance») **dentro** da edição.

---

## 2. O formulário de participação (a ACÇÃO)

**Componente único: `components/_formAcaoEdicao.jsx` (`FormularioAcao`).** Os estilos vivem em
`ESTILO_ACAO` (objecto congelado, partilhado — não copiar valores para o JSX).

Forma canónica, sempre a mesma:

```
rótulo («Seu lance (em pontos)» · «Seu palpite (nº de lances)»)
LINHA:  [ input  (flex: 1 1 120px, minHeight 48px) ] [ botão (auto, dourado COR.gold, minHeight 48px) ]
nota opcional por baixo (custo do lance, saldo, motivo de bloqueio)
```

Regras:
- **Sem botão de largura toda / centrado** — vale para TODOS os botões da acção, incluindo o CTA de ligação
  («⚡ Aceito o DesafioGUT»). O botão fica **na linha do campo**, à direita dele (`flex` com `gap: 0.5rem` e
  `flexWrap: wrap`; a 375 px o botão desce de linha em vez de espremer o campo).
- **Sem segundo cartão**: nada de fundo, borda ou padding próprio dentro do `CartaoEdicao`.
- `minHeight: 48px` no campo e no botão (alvo tátil, MC109).
- O campo **não** fica desligado só porque o botão está (botão desligado com valor vazio é normal; o campo
  tem de continuar escrevível). Por omissão `disabled` do campo segue o do botão (`campoBloqueado =
  desabilitadoCampo ?? bloqueado`), por isso quem NÃO quer o campo fechado durante o envio tem de passar
  `desabilitadoCampo={false}` — é o que a Oferta Programada faz (o palpite sempre foi assim).
- Estados do botão: `Dar lance` → `⏳ Processando...` / `🔐 Autenticando…`; palpite → `Enviando…`.
- O `CardLance` tem duas variantes e SÓ duas: `variante="cartao"` (omissão — o Relâmpago do MLC) e
  `variante="embutida"` (dentro do cartão da edição — é a que a **Edição Especial** usa). A embutida não
  desenha cabeçalho, barra de carteira, pipeline nem rodapé.

---

## 3. A tabela de lances

**Componente único: `components/TabelaLances.jsx`.** Nunca uma tabela/lista própria por edição.

- 3 colunas: `#` · `Participante` · `Valor` (no telemóvel, cartões com a posição num círculo).
- Durante a edição o valor é **🔒** (regra anti-bot); o aviso «🔒 valores ocultos até o fim» só aparece
  enquanto `encerrado` for falso. O valor só se revela depois do fecho/apuração.
- Edição Especial: as linhas vêm de `hooks/useRankingEspecial.js` → `lancesOcultosDoRanking()`, no formato
  blindado (`oculto: true`, `valor: null`, `enderecoCurto` **já encurtado pelo servidor**). Ordem de
  chegada. O endereço inteiro nunca chega ao browser.
- O título é «📋 Lances — Edição <id>» com o id da edição que está no ecrã.
- **O selo da tabela vem da EDIÇÃO**, pela mesma tabela do cartão (`SELO_ESPECIAL` em
  `components/edicao-especial/_estilo-especial.js`), passado em `selo={{texto, cor}}`. **Nunca** do
  `EM_BREVE_MODE`/`getEstadoEdicao` global — foi assim que a tabela disse «Em breve» com o cartão «Aberta».
- Ao vivo a sério: leitura inicial + Realtime + `nonce` (relê quando o próprio utilizador lança) +
  recarga de 20 s com a aba visível + releitura ao voltar à aba. Um lance aceite tem de aparecer **na
  hora**, sem esperar por um evento que pode perder-se.

---

## 4. Estados permitidos

| Estado | Selo | O que a acção mostra |
|---|---|---|
| Agendada | `🕒 Em breve` | sem formulário activo (contagem até abrir) |
| A abrir (< 60 s) | `⏳ Abrindo` | sem formulário activo |
| **Aberta/Activa** | `🟢 Aberta` | formulário activo + tabela ao vivo |
| Encerrada | `🔴 Encerrada` | painel do resultado; lances bloqueados |

- A Edição Especial tem os **seus** estados, calculados da edição e da hora do **servidor**
  (`estadoEspecial(edicao, agora)`, `_estilo-especial.js`) — é a excepção declarada ao `EM_BREVE_MODE`
  (MC94.2). O resto do app segue a fonte única `utils/edicao.js`.
- Qualquer ecrã que mostre o estado de uma edição lê o estado **da edição**. Uma flag global nunca
  desmente o cartão.

---

## 5. Linguagem (não negociável)

- ❌ **«leilão»** — a palavra está proibida em UI e nos textos do GUTO. Diz-se **edição**, **oferta**,
  **rodada**.
- ✅ **pontos** — no Menor Lance Único o lance gasta **pontos de lance** pelo seu valor
  (1 ponto = R$ 0,01, Art. 18º). Rótulo: **«Seu lance (em pontos)»** — nunca «(em centavos)» nem
  «· R$ 0,05» **no Relâmpago**. A única excepção é o ramo Programado LEGADO do `CardLance` (inalcançável
  pela UI), que mantém centavos porque ali o valor ainda é lido em R$ pelo contrato.
- O aviso do limite («Mín 1 ponto · Máx 5 lances/min · Cooldown 3s») faz parte da acção: não desaparece
  numa variante só porque ela é mais compacta.
- ❌ «sorte» nos textos do GUTO (regra própria do GUTO).
- O palpite é **um número de lances** («Seu palpite (nº de lances)»), não R$.

---

## 6. Checklist antes de dar uma alteração de edição por concluída

1. O cartão é o `CartaoEdicao`? Não há `<section>`/`<div>` de cartão novo?
2. O formulário é o `FormularioAcao` (ou `CardLance variante="embutida"`)? Campo e botão na **mesma linha**?
3. A tabela é a `TabelaLances`? O selo vem da edição?
4. Unidades em **pontos** e a palavra **leilão** ausente do diff?
5. Teste que falha se o layout regredir (sub-card, botão de largura toda, «em centavos») e teste
   bidireccional do selo (com/sem override).
6. Suíte canónica: `node scripts/mc966-suite-harness.mjs ambos` (de `desafio-gut/frontend`), com o
   portão A14 medido no arranque.

---

## 7. Ficheiros-fonte da verdade (mexer aqui, não duplicar)

- `components/CartaoEdicao.jsx` — o cartão único; `ACOES` (verbo + rótulo por família).
- `components/_formAcaoEdicao.jsx` — o formulário único (`ESTILO_ACAO`).
- `components/CardLance.jsx` — a lógica de pagamento do lance (flash = pontos, programado = senha) e as
  duas variantes de apresentação.
- `components/TabelaLances.jsx` — a tabela única (3 colunas, linhas blindadas, `selo`).
- `components/edicao-especial/_estilo-especial.js` — estados da especial (`estadoEspecial`) e
  `SELO_ESPECIAL`.
- `hooks/useRankingEspecial.js` — leitura ao vivo do `ranking_especial`.
- `context/AppContext.jsx` — `refetchPontosAgora` (nonce que manda todos os `usePontos` reler).
- `netlify/functions/lance-relampago.mjs` — o débito (pontos pelo valor do lance).
- `docs/EDICAO-ESPECIAL-CONFIG.md` — configuração dinâmica da especial.
