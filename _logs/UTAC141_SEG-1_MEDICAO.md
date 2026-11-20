# UTAC141 · SEG-1 — MEDIÇÃO (antes de tocar em código)

Executor: Hermes · 2026-11-19/20 · baseline `3bbdebe` (main, produção `index-CsT4Ki9x.js`)
Enunciado: 3 falhas na Edição Especial (layout, débito de pontos, tabela vazia) + skill oficial das edições.

## 1. O que estava publicado (medido)

- `curl https://silly-stardust-ca71bc.netlify.app/` devolve `assets/index-CsT4Ki9x.js` — o **mesmo** hash do
  `dist/` local ⇒ a produção web JÁ tinha os commits do UTAC140 (`5b4168d`). Não era deploy atrasado.
- DOM real da produção (`/mercado`, browser headless, consentimento aceite), texto extraído:
  `ESPECIAL-RELAMPAGO1 · 🟢 Aberta · … · 🎯 Dar Lance · ⚡ Flash · Edição: ESPECIAL-RELAMPAGO1 ·
   ⚡ Aceito o DesafioGUT · Cada lance gasta o seu valor em pontos de lance … · Seu lance (em centavos) ·
   Mín R$ 0,01 · … · 📋 Lances — Edição ESPECIAL-RELAMPAGO1 · 🕒 Em breve · 🔒 valores ocultos até o fim ·
   # PARTICIPANTE VALOR 🔒 · 1 | 0x5baf…32b8 | 🔒`

  ⇒ **Confirmados 3 dos 4 sintomas**: sub-cartão («🎯 Dar Lance» + barra de carteira dentro do cartão da
  edição), rótulo «(em centavos)», e o selo da tabela «🕒 Em breve» com o cartão «🟢 Aberta».

## 2. Débito de pontos — o servidor está CERTO (medido na BD de produção)

`lance-relampago.mjs:244` — `DEBITO_SALDO_LANCE_ATIVO = false` ⇒ o ramo do flash é
`consumirPontosLance(endereco, valorCentavos, ref)` (pontos pelo valor do lance), não o saldo R$.

Medido em produção (`supabase db query --linked`, projecto `vjslwowwrpcawijdiksm`):

```
pontos (0x5baf…32b8): pontos_lance 1139 · 23 movimentos · atualizado_em 2026-11-20 00:53:41.975Z
  último −3: {campo: pontos_lance, delta: -1, motivo: "lance",
              ref: "lance:0x4063cd…ba1ec", data: 2026-11-20T00:53:29.071Z}
  último −2: {campo: pontos_lance, delta: +10, motivo: "missao", ref: "missao-lance:2026-11-19"}
```

⇒ o lance de 1 ponto **foi debitado** (Δ −1) e a missão creditou +10. **O bug não é do backend.**

O defeito está no ECRÃ: `CardLance` chamava `refetchPontosLance()` — o `refetch` da **sua própria**
instância de `usePontos`. A Carteira e o Início têm outras instâncias, que só releem em
`[address, authToken, pontosNonce]`. O `AppContext` já tinha o contador (`refetchPontosAgora`) mas **não o
expunha no `value`** (medido: `grep -n refetchPontosAgora src/context/AppContext.jsx` → só a definição,
nenhum consumidor). Resultado: o saldo global ficava «parado».

## 3. Tabela ao vivo — escrita e leitura CERTAS; o gatilho de releitura é que era frágil

- Escrita: `ranking_especial` tem **1 linha** (`posicao 1`, `0x5baf…32b8`, `criado_em 00:53:41.921Z`), gravada
  por `registarNoRankingEspecial()` (`lance-relampago.mjs:382`) no mesmo instante do débito.
- Leitura anon: `POST /rest/v1/rpc/get_ranking_especial` com a chave anon do bundle → **200**
  `[{"posicao":1,"endereco":"0x5baf…32b8","valor_oculto":null}]`. `SELECT *` na tabela → **401**
  (grant por coluna: o desenho do R18-140-C).
- Realtime: sonda do UTAC140 (`_logs/UTAC140_SEG1_SONDA-REALTIME-ANON.txt`) mostra `SUBSCRIBED` e 4 eventos.
- DOM de produção: a linha **aparece** (`1 · 0x5baf…32b8 · 🔒`).

⇒ não se reproduziu «Nenhum lance registado» **com** linha na BD. O que se reproduziu foi a fragilidade:
a tabela só relia por evento de Realtime — se o canal ainda não estava subscrito (ou o evento se perdeu)
e o utilizador lançava, a tabela ficava vazia até se recarregar a página. Não há gatilho pelo **próprio**
lance. Correcção: `nonce` (relê no sucesso do lance) + recarga de 20 s com a aba visível + releitura ao
voltar à aba.

## 4. Layout — o «sub-cartão» é o `CardLance` inteiro, e o padrão aprovado já existia

- `CardEdicaoEspecial` monta `renderLance` → `CardLance` (682 linhas) **dentro** do `CartaoEdicao`. O
  `CardLance` desenha o seu próprio `Card` (fundo/borda/padding), o cabeçalho «🎯 Dar Lance», a barra da
  carteira, o pipeline e um botão `width: 100%` (texto centrado por omissão). Daí o «sub-card» e o
  «botão centralizado» que o operador descreveu.
- O padrão canónico já existia na Programada (`OfertasProgramadas.jsx:134-153`): `<label>` + linha
  `display:flex; gap:.5rem; flex-wrap:wrap` com `input flex:1 1 120px` e `button` dourado de altura 48 px.
  Estava **inline na página** (copiado à mão, não partilhado) — nada impedia o próximo agente de inventar
  outro. É essa lacuna que a Frente D fecha.

## 5. Selo divergente — causa medida

`CardEdicaoEspecial` tinha uma tabela `BADGE` local (selo correcto, pela edição). A `TabelaLances` recebia
apenas `idEdicao` e perguntava a `getEstadoEdicao({id}, {encerrado})`, que segue o `EM_BREVE_MODE` global.
Duas fontes para o mesmo facto ⇒ dois textos no mesmo ecrã.

## 6. Ambiente

- Suite canónica: `node scripts/mc966-suite-harness.mjs ambos` (de `desafio-gut/frontend`).
- Portão A14 (RAM ≥ 1500 MB) medido **no wrapper**, imediatamente antes do arranque:
  primeira leitura da sessão **782/810 MB** (abaixo) → depois de libertar carga, **1644 MB** e **1640 MB**
  nas duas corridas registadas abaixo.
- 1.ª corrida da suite: `frontend VERMELHO 4` / `backend VERDE 1519/1525` — 2 dos vermelhos eram de **DNS**
  (`exemplo.com` não resolvia: `dns.lookup` → `ENOTFOUND`; teste de outra frente, `img-proxy.mjs`, ficheiro
  não tocado), 2 eram asserções de forma que o próprio UTAC141 mudou de propósito (selo e botão do palpite).
  Ficheiros de DNS: `src/__tests__/mc9952-seguranca-gate.test.mjs` — sem relação com este diff.
