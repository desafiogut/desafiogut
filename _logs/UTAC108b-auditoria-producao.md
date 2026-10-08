# UTAC108b — Auditoria de discrepâncias contra PRODUÇÃO

**Tipo:** READ-ONLY (auditoria) · **Owner:** Hermes (deepseek-v4-flash) · **Data:** 2026-10-07
**Arranque:** 21:01 · **HI5:** 2 h
**Produção:** `https://silly-stardust-ca71bc.netlify.app/` **200** ✓
**Depende de:** UTAC108a (`docs/aprovacoes-operador.md` — o manifesto)

**O que este UTAC NÃO faz:** não altera código, não corrige, não remove o lojista, não faz deploy,
não edita `.bak-*`, não toca nos bytes de controlo do `CLAUDE.md`, não altera `package*.json`,
não desliga `EM_BREVE_MODE`.

---

## 0. Baseline (SEG-1)

| Item | Medido | Como |
|---|---|---|
| `HEAD` / `origin/main` | **`08f78b3`** / `08f78b3` (iguais) | `git log --oneline -1`, `git rev-parse --short origin/main` |
| **Desvio do enunciado** | o enunciado esperava **`740eb7e`** | **ver §0.1** — não é alteração de código |
| Suíte canónica | **frontend VERDE 849/849 · backend VERDE 1095/1101 → `VEREDITO: VERDE`** | `node scripts/mc966-suite-harness.mjs ambos < /dev/null` (**foreground**; em background dá `stdin is not a tty` + exit 1 = **não medido**) |
| Tracked modificados | **0** | `git status --porcelain \| grep -v '^??'` |
| `.bak-*` versionados | **5** | `git ls-files \| grep -c '\.bak-'` |
| `EM_BREVE_MODE` | **`true`** (`src/lib/leilaoLock.js:10`) | `grep -n "EM_BREVE_MODE = "` |
| `CLAUDE.md` bytes de controlo | **2×`0x00` · 2×`0x1F` · 2×`0x7F`** (tamanho 424 710 B) | `python` (bytes) |
| Produção | **200** | `curl` |
| **Bundle servido** | **`assets/index-Ci4XuUO-.js`** (58,4 KB) + 6 chunks de vendor | BFS a partir do `index.html` |
| **Bundle local** (`npx vite build`) | **`dist/assets/index-ZjjVL1DO.js`** (59 677 B, sha256 `728be0bb…`) | build local |
| Chunks baixados de produção | **137** ficheiros (~6,0 MB) | BFS recursivo (§SEG1) |

### 0.1 Desvio declarado: o `HEAD` não é o do enunciado

O enunciado do 108b diz «Confirmar HEAD e origin/main (esperado: `740eb7e`)». O medido é **`08f78b3`**.
Causa medida: **o UTAC108a fechou em `740eb7e` e a série 109a correu depois** (`44b92cc`, `25359fb`,
`08f78b3`). **É documentação, não código:**

```
$ git diff --name-only 86ffe2c..HEAD | sed 's|/.*||' | sort | uniq -c
      2 _logs
      1 CLAUDE.md
      1 docs
$ git diff --name-only 86ffe2c..HEAD | grep -E "^(desafio-gut/frontend/(src|netlify))"
>>> ZERO alteracoes em src/ ou netlify/ desde o baseline do manifesto
```

**Zero alterações em `src/` e `netlify/` desde o baseline do manifesto (`86ffe2c`).** O último commit
que tocou `src/` é **`7d4c5de`** (2026-10-06, UTAC107g.4). ⇒ Para efeitos desta auditoria, o
**código** local é o mesmo que o manifesto auditou; o `HEAD` avançou só em documentos.

---

## 1. SEG0 — Diagnóstico dos 4 erros reportados pelo operador

### 1.1 Erros 1 e 2 (Privy CORS + 422 em `api.privy.io/api/v1/analytics_events`) → **COSMÉTICO**

| Verificação | Medido |
|---|---|
| Origem do pedido | `api.privy.io` — é o **beacon de analytics do SDK do Privy**, não código nosso |
| Chamamos esse endpoint? | **NÃO.** `grep -rn "privy\.io" src/` → só 4 ocorrências e **todas documentais** (`App.jsx:387` comentário; `Privacidade.jsx:161` texto legal; `PrivyRoot.jsx:198` comentário; `shims/farcaster-mini-app-solana.js:6` ref. de docs). **0 chamadas** |
| O login depende disto? | **Não.** O operador confirma `[GUT] login completo`; a home carrega (saldo R$ 0,00, Passe Desafio 1/50, R-1 em «EM BREVE») |
| Há forma de desactivar? | Não no nosso código — é telemetria do SDK (`@privy-io/react-auth`). Desligar implicaria config/versão do SDK, **fora do escopo** |

**Veredicto:** **ruído cosmético** (1× cada). Não escalar. Registo para o 108h (limpeza geral) apenas
como «ruído conhecido».

### 1.2 Erros 3 e 4 (`/cotas` → 404) → **NÃO é código morto; é 404 POR DESENHO**

A hipótese preliminar do operador («código morto do lojista / endpoints Via A removidos») está
**REFUTADA por medição**:

| Verificação | Medido |
|---|---|
| `cotas.mjs` existe localmente? | **SIM** — `desafio-gut/frontend/netlify/functions/cotas.mjs` |
| Existe em produção? | **SIM** — `GET /.netlify/functions/cotas` → **200 `application/json`** |
| Quem chama? | `src/context/AppContext.jsx:479` (`cotas?cliente_id=…`), **`:488`** (`cotas?email=`), `:498` (email do cadastro); painel `src/pages/admin/Cotas.jsx:50`. **15 ficheiros** com sítio de chamada |
| Com que `BASE`? | `src/lib/api.js:23` → **`const BASE = "/.netlify/functions/"`** (com o ponto) ⇒ chama o caminho **canónico** |
| **Réplica do 404** | `/.netlify/functions/cotas?cliente=test` → **200 JSON** (`{"resumo":{"bronze":{"total_atribuidas":1},…}`) · `?email=…` → **401 JSON** `token_ausente` · **NÃO reproduzi 404** sem sessão (os ramos 404 exigem token válido) |

**Onde nasce o 404 — medido no código:**

| Linha | Código | Significado |
|---|---|---|
| `cotas.mjs:291` | `jsonError(404, "email_nao_encontrado", …)` | não há cadastro para este email |
| `cotas.mjs:316` | `jsonError(404, "cota_nao_encontrada", "cliente não tem cota atribuída")` | utilizador **sem cota** |
| `cotas.mjs:241` | `jsonError(404, "cnpj_nao_encontrado", "CNPJ livre")` | ramo de duplicidade (uso legítimo) |
| `cotas.mjs:214`, `:609`, `:713` | mais 3 ramos 404 por desenho | — |

**E o próprio repo já o documenta** — `src/lib/retornoOAuth.js:12-15`:

> «⚠️ Os 404 de `/.netlify/functions/cotas` que aparecem no mesmo cenário **NÃO são a causa**: são a
> resposta CORRECTA da function para um utilizador sem cota atribuída (`email_nao_encontrado` /
> `cota_nao_encontrada` — `cotas.mjs:291/316`). Medido: GET /cotas sem params devolve 200; com email
> sem token, 401.»

**Conclusão:** o utilizador comum (logado, **sem cota corporativa**) provoca **dois 404 esperados** —
o da consulta por `cliente_id` e o do fallback por `email`. **É por desenho, não é avaria.** Não é o
lojista «a chamar fantasmas».

### 1.3 Achado NOVO de instrumento (armadilha de caminho) — **D-7**

Medido: **`/netlify/functions/cotas` (SEM o ponto) devolve 200 `text/html` = o `index.html` da SPA**
(5134 B) — o catch-all `/* → /index.html`. Um pedido nesse caminho **não dá 404: dá HTML com 200**,
e o consumidor falha ao fazer parse de JSON (erro silencioso, não um 404 visível).

| caminho | resposta real |
|---|---|
| `/.netlify/functions/cotas` (canónico) | **JSON** — a função |
| `/netlify/functions/cotas` (sem ponto) | **HTML** (`index.html`) |
| `/.netlify/functions/nao-existe-xyz` | **HTML** (`index.html`, 200) ← o catch-all engole também paths de função **inexistentes** |

⇒ **Um 200 nunca prova que uma função existe** — a prova é o **`content-type`** (`application/json`
vs `text/html`). O código actual usa a forma correcta (`api.js:23`), mas a armadilha fica registada.

---

## 2. SEG1 — Bundle local vs produção

| | Valor |
|---|---|
| Produção | `assets/index-Ci4XuUO-.js` |
| Local (`npx vite build`) | `dist/assets/index-ZjjVL1DO.js` |
| Nomes iguais? | **NÃO** — e **isso não é desvio**: o build **remoto** (Netlify) e o local emitem nomes de chunk diferentes (regra já medida na série, §15.f do protocolo) |
| **Prova por CONTEÚDO** | **137 chunks de produção descarregados** e comparados literal a literal contra o `dist/` local: **16 dos 17 literais com resultado IDÊNTICO nos dois lados** (mesma contagem de chunks por literal) |
| Alterações de `src/` desde o baseline | **ZERO** (`86ffe2c..HEAD` só toca `_logs/`, `CLAUDE.md`, `docs/`) |

**Veredicto: produção SINCRONIZADA com o código local.** A prova é o literal dentro dos chunks
servidos, não o nome do ficheiro — como manda a regra da série.

---

## 3. SEG2 — Amostragem dos 52 itens do manifesto EM PRODUÇÃO

17 itens verificados (mínimo exigido: 17 = 3 por UTAC da série). Método: descarregar os chunks de
produção e procurar o **literal** de cada item (com tratamento de escapes `\uXXXX` da minificação).

| Item | Literal | Esperado | Produção | Local `dist` | Veredicto |
|---|---|---|---|---|---|
| 107b#1 | `Trocar R$` | AUSENTE | 0 chunks | 0 chunks | ✅ |
| 107b#1 | `useTrocarPorSenhas` | AUSENTE (dito «órfão removido») | **4 chunks** | **4 chunks** | ⛔ **DIVERGE → D-6** |
| 107b#3 | `Ofertas Programadas` | PRESENTE | 4 chunks | 4 chunks | ✅ |
| 107b#4 | `Comprar Passe` | PRESENTE | 1 (`MinhaCarteira-DO0FGWPP.js`) | 1 | ✅ |
| 107c#1 | `Passe Desafio` | PRESENTE | 4 chunks | 4 chunks | ✅ |
| 107c#3 | `Total de Lances` | PRESENTE | 3 chunks | 3 chunks | ✅ |
| 107c#3 | `Lances Únicos` | PRESENTE | 3 chunks | 3 chunks | ✅ |
| 107d#2 | `Quanto você oferta` | AUSENTE | 0 chunks | 0 chunks | ✅ |
| 107d#3 | `ninguém repetir` | PRESENTE | 1 (`MercadoLances-BId1FnLq.js`) | 1 | ✅ |
| 107d#4 | `Seu lance (em centavos)` | PRESENTE | 1 (`CardLance-Dwp_Dn57.js`) | 1 | ✅ |
| 107e.1#3 | `Palpites` | PRESENTE | 1 (`OfertasProgramadas-B-1SN5sn.js`) | 1 | ✅ |
| 107e.1#6 | `NÃO FOI DESSA VEZ` | PRESENTE | 1 (`OfertasProgramadas-…`) | 1 | ✅ |
| 107g#1 | `Seja Nosso Parceiro` | PRESENTE | 2 chunks | 2 chunks | ✅ |
| 107g#5 | `/edicao/` | AUSENTE | 0 chunks | 0 chunks | ✅ |
| 107g#6 | `"/corp"` | AUSENTE | 0 chunks | 0 chunks | ✅ |
| 107g#7 | `/redirect` | PRESENTE | 1 (`PrivyRoot-DM_4E-fP.js`) | 1 | ✅ |
| 107g.1#1 | `Você tem` | PRESENTE | 2 chunks | 2 chunks | ✅ |

**16/17 conformes.** O único desvio (D-6) **não é da produção** — ver §5.1.

**Não amostrados (declarado):** os restantes 35 itens ficaram por verificar em produção (regra da
RESSALVA 3: mínimo de 17). Os itens **de código** dos mesmos UTACs foram verificados por
`ficheiro:linha` no manifesto do 108a, e a totalidade de `src/` está provada sincronizada pelo §2.

---

## 4. SEG3 — Inventário de endpoints em produção

**Método:** os 84 `.mjs` da raiz de `netlify/functions/`; sonda `GET /.netlify/functions/<ep>` em
produção; **classificação pelo `content-type`** (`application/json` = função real; `text/html` =
fallback da SPA); e contagem de **sítios de chamada** no frontend (comentários removidos).

| Medida | Nº |
|---|---|
| Endpoints locais (`.mjs` na raiz) | **84** |
| **Servidos em produção** | **84  (100%)** |
| **Em falta em produção** | **0** |
| Servidos **sem chamador** no frontend (candidatos a órfão) | **23** |
| Manifesto (pendência #4) dizia «25 órfãos de frontend» | **23 medidos** — ver §5.3 |

**Distribuição de status dos 84:** `401`×27 · `405`×26 · `400`×13 · `200`×8 · `403`×7 · `410`×2 · `503`×1.
(Os `401/405` provam que a função está lá e recusa método/token — a resposta é JSON, não HTML.)

**Os 23 servidos sem chamador no frontend:**
`apurar-palpite`, `backup-blobs`, `backup-blobs-scheduled`, `consolidar-lances`,
`cron-reset-programado`, `debug-pedido`, `exportar-dados`, `fila-processor-scheduled`, `health`,
`ia-preditiva-scheduled`, `info-pagamento`, `mc302-aceitar`, `mc302-diagnostico`, `monitor-onchain`,
`monitor-onchain-scheduled`, `pontuacao`, `purge-logs`, `purge-logs-scheduled`, `renovacao-adesao`,
`scheduled-anuncio-especial`, `scheduled-encerrar-especial`, `webhook-frenet`, `webhook-mercadopago`.

> **Nota de leitura:** «sem chamador no frontend» **não** quer dizer inútil — 8 são `*-scheduled`/
> `webhook-*` (invocados por cron/recebidos de terceiros) e `health`/`monitor-onchain` são de operação.
> Órfão **de frontend** ≠ órfão de plataforma. Para o 108f/h isto importa: **não apagar cegamente**.

**Cruzamento com os 404 reportados:**

| Endpoint | Local | Produção | Chamadores |
|---|---|---|---|
| `cotas` | existe | **200 JSON** (resumo público) · **401 JSON** (email sem token) | **15** |
| `debug-pedido` | existe | **503 JSON** | **0** |

**`debug-pedido` (pendência #5):** está servido, mas responde **503** sem o header `x-debug-token` ⇒
**fail-closed**: sem o token não serve nada. O risco é **menor** do que «ligado em produção» sugere;
mantém-se a recomendação de o desligar no 108h por não ter consumidor.

**Observação ℹ️ (superfície pública):** `GET /.netlify/functions/cotas?cliente=test` devolve **200 JSON
com o `resumo` agregado** (contagens por categoria) **sem autenticação**. É agregado, não PII — mas é
uma superfície pública a confirmar com o dono do produto (não é achado de segurança: o manifesto
registra que `?cliente_id`/`?email` exigem Bearer).

---

## 5. Discrepâncias NOVAS (além de D-1 a D-5 do manifesto)

### 5.1 D-6 ⚠️ O manifesto sobre-declara a remoção dos «órfãos» do 107b#1

**O manifesto afirma (107b#1):** «Os órfãos (`useTrocarPorSenhas`, `CreditoStatus`, `creditoTxHash`,
`trocaInfo`, `trocaErro`) foram removidos também».

**Medido (código local + `dist` + produção, concordantes):**

| Nome | Estado medido |
|---|---|
| `creditoTxHash` | **removido** ✓ (0 ocorrências fora de testes) |
| `trocaInfo` | **removido** ✓ |
| `trocaErro` | **removido** ✓ |
| **`useTrocarPorSenhas`** | ⛔ **EXISTE** — `src/hooks/useTrocarPorSenhas.js` + **7 ficheiros que o usam**, incluindo **dois consumidores VIVOS**: `src/components/CardLance.jsx:25` e `src/pages/CorporativoBanners.jsx:12` |
| **`CreditoStatus`** | ⛔ **EXISTE** — `src/components/CreditoStatus.jsx`, `src/hooks/useCreditoStatus.js`, `src/lib/creditoPolling.js` |

⇒ **A remoção foi do IMPORT na `MinhaCarteira`, não dos módulos.** Dois deles **nunca foram órfãos**:
têm consumidores vivos. **A classificação «órfãos» está errada** e a frase «foram removidos também» é
**falsa** para 2 dos 5 nomes.
**Natureza:** ⚠️ erro de **documentação** (o código está correcto e coerente); impacto de produto
**nulo**. **Corrigir no 108h** (ou errata no manifesto, se o operador preferir mantê-lo congelado).
**Prova:** produção e `dist` local concordam (4 chunks com a string em ambos) ⇒ **não** é produção
desatualizada.

### 5.2 D-7 ℹ️ Caminho sem o ponto devolve HTML com 200 (armadilha latente)

`/netlify/functions/<ep>` (sem o ponto) **não devolve 404** — devolve o `index.html` da SPA com **200**
(e o mesmo acontece a um nome de função **inexistente**). Só o `content-type` distingue. O código
actual está correcto (`api.js:23`), mas qualquer chamada nova com o caminho errado **falha em
silêncio**. Registar como técnica no `CLAUDE.md`/guarda, não como bug.

### 5.3 D-8 ℹ️ «25 endpoints órfãos» vs **23 medidos** (a régua, não o alvo)

O manifesto (pendência #4) cita **25** órfãos de frontend, herdados do 107a-back. Medido com contagem
por **sítio de chamada** (comentários removidos, 84 endpoints): **23**. A diferença (2) pode ser
(i) contagem por substring vs por sítio de chamada, (ii) endpoint novo entretanto consumido, ou
(iii) erro de uma das réguas. **Não forcei um número** — fica registado o meu (23) com o método, e o
do manifesto (25) com a sua proveniência. Re-medir no UTAC que for tratar dos órfãos.

---

## 6. SEG5 — Prioridade para o 108c em diante

| Prior. | O quê | Onde | Porquê |
|---|---|---|---|
| **P0 (crítico de produto)** | **D-1** — o botão «Menor Lance Único» da Carteira (**108c**) | `MinhaCarteira.jsx:245` (`disabled={!saldoReais}`) | é **a queixa do operador**; decisão já tomada: **navegar sempre** (A) |
| **P1 (lojista)** | remover o lojista (**108f**) | rotas `/corporativo/*`, `CorporativoDashboard/Cotas/Banners/Carteira`, `BottomNav.CORP_TABS`, `Sidebar.CORPORATIVO_ITEMS` | decisão estrutural nova, não implementada; **é o 108f** |
| **P2 (higiene de código)** | `useTrocarPorSenhas` / `CreditoStatus` — decidir: manter (têm consumidores) **ou** desligar com eles | `CardLance.jsx:25`, `CorporativoBanners.jsx:12` | D-6: nunca foram órfãos; se o lojista sair (108f), `CorporativoBanners` cai e o hook pode ficar órfão **aí** |
| **P3 (documental)** | corrigir a frase do 107b#1 no manifesto / errata | `docs/aprovacoes-operador.md` §3 | D-6: publicação de facto falso |
| **P4 (segurança/higiene)** | desligar `debug-pedido` (503 sem token, 0 consumidores); avaliar `exportar-dados` (LGPD art.18 sem botão) e os 23 sem chamador | `netlify/functions/` | pendências #4/#5 do manifesto |
| **P5 (cosmético)** | nada a fazer: CORS/422 do Privy é ruído do SDK | — | D-0: login funciona |
| **P6 (limpeza)** | comentário obsoleto `TabelaLances.jsx:52-58` (D-5); pt-PT nas legais | — | já registados no manifesto |

**Nota de escopo para o 108f:** o inventário §4 mostra que **`cotas` tem 15 chamadores** e o painel
admin (`admin/Cotas.jsx:50`) o consome ⇒ **remover o lojista não pode ser «apagar o `cotas.mjs`»**:
tem de ser retirar a UI/rotas e decidir o destino de cada endpoint com consumidor. Os 23 sem chamador
são o único lote seguro para desligar **sem** tocar em UI.

---

## 7. Recomendações concretas para o próximo UTAC

1. **108c — fechar a D-1** (o 108b confirma que é **a única** divergência com impacto visível para o
   operador): remover o gate `disabled` do botão MLC na Carteira e validar o saldo **no destino**
   (decisão A do operador). Guarda própria + mutante; e **varrer os testes que fixam `disabled`**
   (`grep -rn "disabled" src/__tests__ | grep -i carteira`) antes de editar — a série já partiu 3
   guardas com um rename (§15.a do protocolo).
2. **108b não encontrou nenhuma divergência produção↔código com impacto de produto.** Os 404 de
   `/cotas` são **esperados**; a auditoria de produção **não** bloqueia o 108c.
3. **108f — antes de remover o lojista**, inventariar consumidores por endpoint (`Cotas.jsx:50` +
   15 chamadores de `cotas`) para não deixar rotas a apontar para endpoints removidos.
4. **Registar a armadilha D-7** (caminho sem ponto = HTML com 200) como técnica de verificação, para
   não voltar a ler um 200 como prova de existência.
5. **Corrigir a frase do D-6** no manifesto (ou errata), para o 108h não herdar um facto falso.

---

## 8. Notas de método — o que esta auditoria NÃO garante

1. **Não verifiquei os 4 erros com sessão autenticada.** Os ramos 404 de `/cotas` exigem token válido;
   foi medido **sem** sessão (200 para o resumo agregado, 401 para email) e o **código** confirma os
   ramos. A réplica do 404 exacto do operador fica **inferida do código + do comentário do repo**, não
   observada em runtime. **Declarado.**
2. **O `content-type` é o discriminador, não o status.** Um 200 `text/html` = fallback da SPA; um
   `application/json` = função. Sem esta distinção, os 84 endpoints «existiriam» todos.
3. **A contagem de chamadores é por sítio de chamada** (literal entre quotes/backticks ou
   `/.netlify/functions/<ep>`), com comentários removidos — a lição do 107a-back (contar por substring
   conta comentários e inventa órfãos).
4. **O bundle de produção tem nomes de chunk diferentes do local** — por desenho; a prova de sincronia
   é o **literal** dentro do chunk servido, nunca o nome nem o sha do `index`.
5. **Erro de instrumento declarado (meu, corrigido):** a 1.ª sonda usou `curl -o /dev/null` e caminho
   MSYS → **`bytes=0`** em todos os pedidos (a armadilha já documentada: `curl` nativo não escreve em
   `-o /dev/null` nem em caminhos `/c/...`). Corrigido com `urllib` + caminhos `C:/`. Se eu tivesse
   aceite os 0 bytes, teria concluído «produção não serve nada» — um achado inventado.
6. **A 1.ª corrida da suíte foi em background** → `stdin is not a tty`, exit 1, **sem números**
   (o falso-verde documentado). Re-corrida em **foreground** com `< /dev/null`: 849/849 + 1095/1101.

---

## 9. Auto-verificação (SEG5)

| Verificação | Resultado |
|---|---|
| Suíte canónica (read-only) | **VERDE 849/849 · 1095/1101** |
| `git diff --name-only` (tracked) | **0 ficheiros** — só serão criados documentos deste UTAC |
| Código alterado | **ZERO** (`src/`, `netlify/`, `scripts/` intocados) |
| `.bak-*` | **5**, intocados |
| Os 4 erros reportados diagnosticados? | **SIM** — 2 cosméticos (Privy), 2 por desenho (`cotas.mjs:291/316`) |
| Discrepâncias listadas? | **SIM** — D-1..D-5 (do manifesto) + **D-6, D-7, D-8 (novas)** |
| Bundle local vs produção | **sincronizado** (prova por conteúdo, 137 chunks) |


---

## 10. ERRATA PÓS-VEREDICTO (validador adversarial, art. no worktree de `644c6ce`)

**Veredicto do validador: APROVADO COM RESSALVAS — 0 bloqueantes.** **0 das 10 alegações-núcleo**
(A1..A10) foram refutadas. Foram assinaladas **4 imprecisões** (F-1..F-4), **re-medidas por mim**
(não copiei os números do validador). As frases erradas **ficam à vista** (§0 e §4) — é esta a errata.

| # | Afirmação do log (fica à vista) | Re-medição minha | Correção |
|---|---|---|---|
| **E-1** | §0: «`HEAD`/`origin/main` = `08f78b3`/`08f78b3` (iguais)» | `origin/main` = **`08f78b3`** no clone principal **e** no worktree; `08f78b3` é o **pai** de `644c6ce` (o commit desta auditoria). No worktree o `HEAD` é `644c6ce` — inerente (o worktree nasce no commit auditado) | **precisão**: o baseline foi medido **antes** do commit do próprio documento; a igualdade HEAD=origin/main é a de `08f78b3` |
| **E-2** | §4: «os `401/405` provam que a função está lá — **a resposta é JSON**, não HTML» | dos 84: **76 `application/json`** + **8 `text/plain`** (7 × `*-scheduled` → 403; `img-proxy` → 400); **0 `text/html`** | ler «a resposta **não é `text/html`**» (JSON **ou** `text/plain`). O discriminador e os **84/84** não mudam |
| **E-3** | §0/§2: «**137** chunks baixados» | re-medido com BFS mais agressivo: **137** (5,75 MB) ⇒ **o meu número reproduz**. O validador reporta **187** num crawl mais largo — **declaro as duas réguas**, não adopto a dele | a conclusão de sincronia **não** muda (a amostra é ≥ a minha) |
| **E-4** | §0: «+ **6 chunks de vendor**» | o `index.html` servido declara **4 `modulepreload`** (rolldown-runtime, react, router, motion) **+ 1 entry = 5** | corrigido para **4+1** |

**Nota:** nenhuma das quatro altera uma conclusão. As correcções **não foram re-validadas** por uma
2.ª ronda (declarado — GATE 11: são erratas de redacção/reprodutibilidade, com a medição apresentada
acima). O veredicto integral, verbatim, está em `_logs/UTAC108b_SEG6_VALIDADOR.md`, com a resposta
do executor ao lado.


---

## 11. Fecho (SEG7) — registo, custo e duração

**Hora do fecho:** 21:17 · **Arranque:** 21:01 ⇒ dentro do HI5 de 2 h.

### Custo (Hermes usa USD) — fonte `state.db`, `cost_status = estimated`

| Sessão | `source` | mensagens | chamadas | custo |
|---|---|---|---|---|
| `20261007_000624_7dfe52` (**sessão CLI PARTILHADA**, iniciada 00:06) | `cli` | 521 | 258 | **0,50838** (acumulado) |
| ↳ menos a leitura no fecho do **UTAC109a** | | | | − 0,20099 |
| ↳ **diferença** | | | | **0,30739** ← **tecto**: cobre também todo o trabalho GUTO/PLANO que correu nesta mesma sessão **entre** os dois UTACs |
| `20261007_210931_a7c9b1` (validador adversarial, sessão própria) | `subagent` | 23 | 13 | **0,01122** |
| **Atribuível a este UTAC, isolável** | | | | **0,01122** (≈ 1,1 centavo) |
| **Atribuível a este UTAC, com a parte CLI (TECTO)** | | | | **≈ 0,3186 ≈ 31,9 centavos** |

⚠️ **Declarado:** a plataforma **não abriu sessão nova** para este UTAC — reutilizou a sessão CLI do
início do dia (a mesma do UTAC109a). A diferença de **0,30739** **não é só deste UTAC**: entre os dois
correu o trabalho de imagens/vídeo do GUTO e a análise do «PLANO». O número **isolável** é o do
validador (**0,01122**); a parte CLI fica como **tecto**, não como medição.

**SALDO DA API: NÃO LIDO** (declarado — a **R5** do `CLAUDE.md` proíbe tocar em credenciais; o `.env`
não é lido). Comando pronto para o operador, com a chave dele:
`curl -s -H "Authorization: Bearer <CHAVE>" https://api.deepseek.com/user/balance`

### Commits e registo (R18 — 3 lugares)

| Commit | Conteúdo |
|---|---|
| `644c6ce` | `_logs/UTAC108b-auditoria-producao.md` (auditoria — base entregue ao validador) |
| (mesmo log) | errata `E-1..E-4` pós-veredicto |
| (commit do veredicto) | `_logs/UTAC108b_SEG6_VALIDADOR.md` (veredicto **verbatim** + resposta do executor) |
| `4e76215` | bloco **R14** do `CLAUDE.md` |

3 lugares: log · bloco R14 · `Desktop/RELATORIO-UTAC108b-AUDITORIA.txt` ✓
`HEAD` = `origin/main` no fecho (o registo final nomeia os commits anteriores; este commit não se cita
a si mesmo).
