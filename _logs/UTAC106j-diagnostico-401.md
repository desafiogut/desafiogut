# UTAC106j — Diagnóstico do 401 na compra do Passe em produção

**Tipo:** DIAGNÓSTICO PURO (não corrige, não deploya) · **Skill:** `mc-driven-projects` ·
**Data:** 2026-10-05 · **Modelo:** deepseek-v4-flash (Hermes Agent) ·
**HEAD/baseline:** `b7dad75` (= `origin/main`) · **Frentes:** 1 (diagnóstico).

> **Objectivo:** reproduzir o `401` do `POST /comprar-passe-pontos` em produção, mapear o hook
> (`useComprarPasse`) e o endpoint (`comprar-passe-pontos.mjs`), comparar com os que funcionam
> (`usePontos`/`ler-pontos`, `useTrocarPorSenhas`/`comprar-senhas`), identificar a causa raiz com
> evidência `ficheiro:linha` e **PARAR** — a correcção é decisão do operador.

---

## §SEG-1 — Baseline

| Item | Medido | Comando |
|---|---|---|
| `HEAD` / `origin/main` | `b7dad75` (idênticos) | `git rev-parse` |
| Suíte (baseline) | **VERDE** — frontend 774/774 · backend 1054/1060 | `node scripts/mc966-suite-harness.mjs ambos` |
| **POST `/comprar-passe-pontos` sem Bearer** | **401** ✅ (controlo reproduzido) | `curl -X POST` |
| GET `/comprar-passe-pontos` | **405** ✅ (o endpoint existe e responde) | `curl` |
| GET `/ler-pontos` | **401** | `curl` |
| POST `/resgatar-cartao` | **401** | `curl` |
| `EM_BREVE_MODE` | `true` (`src/lib/leilaoLock.js:10`) — intacto | leitura |

O 401 é **reproduzível e determinístico** sem Bearer. O que este UTAC tem de explicar é porque é que
ele também acontece **com** um token obtido pela cadeia que a app usa.

---

## §SEG0 — Hook da compra: `src/hooks/useComprarPasse.js`

| Pergunta | Medido (`ficheiro:linha`) |
|---|---|
| Como faz o POST? | `apiPost("comprar-passe-pontos", { idempotencyKey }, { token })` — `useComprarPasse.js:54` |
| Onde vai o Bearer? | **Header** `Authorization` — montado no cliente central `src/lib/api.js:28` |
| Que formato? | `Bearer ${token}` — `src/lib/api.js:28` (prefixo **correcto**) |
| Onde obtém o token? | `useTrocarPorSenhas().getAuthToken()` — `useComprarPasse.js:32` → `POST /auth-lance` |
| Como trata o 401? | `MSG_POR_STATUS[401] = "Sessão expirada"` — `useComprarPasse.js:25` (é a mensagem que o operador viu) |

**O que `usePontos` faz diferente?** **NADA de essencial** — usa **o mesmo** provedor:
`usePontos.js:12` importa `useTrocarPorSenhas` e `:22` chama `getAuthToken()`, enviando-o em
`apiGet("ler-pontos", { token })` (`:36`).

⇒ **A premissa do enunciado («o utilizador consegue usar `ler-pontos`») é FALSA.** Os dois hooks
consomem o **mesmo** token; se o `comprar-passe-pontos` o recusa, o `ler-pontos` recusa-o igualmente.
O que o utilizador **vê** é o **saldo R$ 2,00**, e esse vem de outro sítio (ver §SEG3).

`useResgatarCartao.js:31` — o hook que **eu** escrevi no UTAC106g — usa o mesmo provedor.

---

## §SEG1 — Endpoint da compra: `netlify/functions/comprar-passe-pontos.mjs`

| Pergunta | Medido (`ficheiro:linha`) |
|---|---|
| Como valida o Bearer? | `titular(req)`: lê `req.headers.get("authorization")`, exige prefixo `"Bearer "` → `:31-33` |
| Que `_lib` usa? | `verificarUserSession` de `_lib/jwt.mjs` — import em `:20`, uso em `:35` |
| Chave do header | `authorization` (minúsculas — **correcto** para `Headers` do Fetch) |
| 401 | `:61` — `jsonError(401, t.erro, …)` |

**Comparação com os que «funcionam»:**

| Endpoint | Verificador | Linha |
|---|---|---|
| `ler-pontos.mjs` | `verificarUserSession` | `:16` (import), `:26` (uso) |
| `resgatar-cartao.mjs` | `verificarUserSession` | `:25`, `:40` |
| **`comprar-senhas.mjs`** (Via A — o fluxo «Trocar R$ 2,00 → 1 Senha», que o operador **usa com sucesso**) | **`verificarLanceAuth`** | `:24`, `:135` |

⇒ **Não há diferença entre os endpoints Via B**: todos exigem `verificarUserSession`. A diferença está
**entre universos de autenticação**: o Via A valida `lance-auth`; o Via B exige `user-session`.

---

## §SEG2 — Padrão do repo (medido por grep)

| Padrão | Nº de ficheiros | Quem emite o token desse tipo |
|---|---|---|
| `verificarUserSession` | **25** | `assinarUserSession` → **só** `auth-user.mjs` |
| `verificarLanceAuth` | 5 | `assinarLanceAuth` → `auth-lance.mjs` |

**O padrão DOMINANTE do repo (25 ficheiros) exige `tipo: "user-session"`, emitido apenas por
`POST /auth-user`.** O desvio está no **hook**: `useComprarPasse` (e os vizinhos Via B) vão buscar o
token ao `auth-lance`, que emite `tipo: "lance-auth"` — o tipo que serve o Via A.

Contexto de desenho (registado nos logs anteriores, o que explica como se chegou aqui):
`_logs/UTAC106d-v2-pontos.md:12` — o **endpoint** «reutiliza os padrões do **Via A** (Bearer, débito
atómico, idempotência)» mas para auth escolheu o padrão dos **GET sensíveis** (`verificarUserSession`);
`_logs/UTAC106e-compra-ui.md:39-40` — o **hook** «reutiliza a cadeia de auth do ecrã»
(`useTrocarPorSenhas` → `auth-lance`). **Cada decisão, isolada, é uma reutilização legítima de um
padrão existente. Juntas, não fecham** — e nenhum dos dois UTACs validou o **par**.

---

## §SEG3 — Diagnóstico

### Causa raiz (uma frase)

**Os hooks da Via B pedem o `Bearer` ao `POST /auth-lance` — que emite um JWT com
`tipo: "lance-auth"` — mas os endpoints da Via B validam com `verificarUserSession`, que **rejeita por
desenho** tudo o que não seja `tipo: "user-session"` ou `"admin-access"` ⇒ 401. O token é **válido**,
mas de **propósito errado**.**

### Evidência (`ficheiro:linha`)

| Elo | Ficheiro:linha | O que prova |
|---|---|---|
| O hook pede o token ao `auth-lance` | `src/hooks/useTrocarPorSenhas.js:45-48` (`apiPost("auth-lance", …)` → devolve `data.token`) | a origem do token é o endpoint do Via A |
| O `auth-lance` emite `lance-auth` | `netlify/functions/auth-lance.mjs:98` → `assinarLanceAuth`; `_lib/jwt.mjs:44` (`claims = { endereco, tipo: "lance-auth" }`) | o **tipo** do token emitido |
| O endpoint Via B exige `user-session` | `netlify/functions/_lib/jwt.mjs:81` (`if (payload.tipo !== "user-session" && payload.tipo !== "admin-access") throw`) | a **rejeição por desenho** |
| O endpoint usa esse verificador | `comprar-passe-pontos.mjs:20` (import) e `:35` (uso) → `:61` (401) | onde o 401 nasce |
| O prefixo está **correcto** | `src/lib/api.js:28` (`headers.Authorization = \`Bearer ${token}\``) | exclui a hipótese (e) |
| O frontend TEM o provedor certo | `src/context/AppContext.jsx:921` (`fetch("/.netlify/functions/auth-user", …)`) → `_lib/jwt.mjs:69` (`assinarUserSession`, `tipo: "user-session"`), guardado em `authToken` (`AppContext.jsx:432`) | existe o caminho correcto, já em uso |
| …e é ele que serve o saldo que o utilizador vê | `AppContext.jsx:1017` (`apiGet("saldo-rs?endereco=…", { token: authToken })`) | **explica** porque ver o saldo não prova nada sobre o token dos hooks |

### Cenário concreto (clique → 401)

1. O utilizador abre `/carteira` com sessão válida. O `AppContext` cunha o **user-session** via
   `POST /auth-user` (`:921`) e mostra o saldo R$ 2,00 lido com **esse** token (`saldo-rs`, `:1017`).
2. Clica «Confirmar» no `ComprarPasseModal`. O `useComprarPasse.comprar()` (`:42`) chama
   `getAuthToken()` (`:50`) → **`useTrocarPorSenhas`**: como o cache está vazio, assina
   `DESAFIOGUT-AUTH:<ts>:<address>` com o Privy e faz `POST /auth-lance` (`:45`), recebendo um JWT
   `tipo: "lance-auth"` (`auth-lance.mjs:98`). *Para o Via A este token é exactamente o certo.*
3. `apiPost("comprar-passe-pontos", …, { token })` (`:54`) envia
   `Authorization: Bearer <lance-auth>` (`api.js:28`).
4. No servidor, `titular()` (`comprar-passe-pontos.mjs:31-38`) extrai o Bearer e chama
   `verificarUserSession` (`:35`). Assinatura HS256 **válida**, `endereco` presente — mas
   `payload.tipo === "lance-auth"` → `_lib/jwt.mjs:81` **lança**
   `ERR_JWT_CLAIM_VALIDATION_FAILED`.
5. O `catch` devolve `{ erro: "token_invalido" }` → **`401 token_invalido`** (`:61`).
6. O hook mapeia `401 → "Sessão expirada"` (`:25`) — a mensagem que o operador viu. O saldo continua
   correcto no ecrã (vem por outro caminho), o que faz parecer que «a sessão está boa».

### Classificação (a)-(e) do enunciado

| Hipótese | Veredicto |
|---|---|
| **(a) hook envia o header errado** | **É ESTA** — o token enviado tem o **propósito** errado (o formato do header está correcto) |
| (b) endpoint valida o header errado | **NÃO** — o endpoint está coerente com o padrão dominante (25 ficheiros) |
| (c) token expirado | **NÃO** — o mesmo token **serve** no `comprar-senhas` (Via A); não é expiração, é propósito |
| (d) `_lib` diferente entre endpoints | **NÃO** — Via B usa `verificarUserSession` nos três (compra/pontos/resgate) |
| (e) prefixo `Bearer` em falta | **NÃO** — `api.js:28` monta `Bearer <token>`; o servidor exige o mesmo prefixo (`:32`) |

### Alcance real (maior do que o relatado)

Os **quatro** hooks da Via B usam `useTrocarPorSenhas().getAuthToken()` ⇒ em produção estão
**igualmente a 401**:

| Hook | Linha | Endpoint | Verificador |
|---|---|---|---|
| `useComprarPasse.js` | `:32` | `comprar-passe-pontos` | `verificarUserSession` |
| `usePontos.js` | `:22` | `ler-pontos` | `verificarUserSession` |
| `usePalpite.js` | `:15` | `registar-palpite` | `verificarUserSession` |
| `useResgatarCartao.js` | `:31` | `resgatar-cartao` | `verificarUserSession` |

⇒ O **ecrã das Ofertas Programadas inteiro** (pontos, palpite, cartão) está inoperável por auth — não
só a compra. O operador detectou-o na compra porque foi o que tentou.

### Porque nenhum teste apanhou isto (declarado)

`src/pages/__tests__/_stubs-106e/useTrocarPorSenhas.js` devolve um **token fixo**
(`getAuthToken: async () => "TOKEN-DE-TESTE-106e"`). O duplo substitui **exactamente a peça avariada**
— a cadeia `auth-lance`/`lance-auth`. Os 13 testes do 106e e os 14 do 106g (que eu escrevi, e que
aliasaram o **mesmo** duplo) provam a forma do pedido e a idempotência, nunca a **validade do token
perante o verificador do endpoint**. É um limite de desenho dos testes, não um erro de execução — mas
é a razão pela qual «suíte verde» coexistiu com o 401 em produção.

### Fora de escopo (registado, não investigado)

`eth_getFilterChanges` «filter not found» (dezenas): ruído do modelo Via A (filtros on-chain), sem
relação com este 401. Fica para UTAC de arrumação próprio, conforme a RESSALVA 4.

---


### §SEG4 — Veredicto do validador (verbatim): **APROVADO — 0 bloqueantes**

**Subagente:** `deleg_33f51d32` · worktree `C:/Users/Moltbot/tmp-106j-val/wt` (detached `b7dad75`) ·
veredicto-fonte `VEREDICTO-106j.md` · evidência bruta `EVIDENCIA-local.txt` / `EVIDENCIA-prod.txt`.

--- INÍCIO DO VEREDICTO VERBATIM ---

# VEREDICTO — Validador adversarial do diagnóstico do 401 em `POST /comprar-passe-pontos`

- **Commit medido:** `b7dad75dcff58920321ebe7181f6a36b097f585e` (worktree `C:/Users/Moltbot/tmp-106j-val/wt`, árvore LIMPA: `git status --porcelain` = 0 linhas no início e no fim).
- **Base de produção:** `https://silly-stardust-ca71bc.netlify.app`
- **VEREDICTO: APROVADO**
- **Nº de bloqueantes: 0**
- Reproduzido por execução real: **SIM** (in-process + produção).
- Nenhum ficheiro do repo/worktree foi alterado. Sondas escritas em `C:/Users/Moltbot/tmp-106j-val/` (fora da árvore).

---

## 1. «Reproduzido por execução» — a cadeia confirmou-se ao milímetro

### 1.1 Local (in-process, handlers REAIS, `JWT_SECRET` de sonda)
`probe-local.mjs` importa `_lib/jwt.mjs` e os `export default` reais de cada endpoint e injecta `Request`s.

Claims dos tokens (decodificados): `lance-auth` → `{endereco, tipo:"lance-auth"}`; `user-session` → `{endereco, tipo:"user-session"}`.

Cross-test dos verificadores:
```
verificarUserSession(lance-auth)  -> THROW ERR_JWT_CLAIM_VALIDATION_FAILED
verificarUserSession(user-session)-> OK
verificarLanceAuth(lance-auth)    -> OK
verificarLanceAuth(user-session)  -> THROW ERR_JWT_CLAIM_VALIDATION_FAILED
```

Matriz de endpoints (inversão perfeita):
```
comprar-passe-pontos   [lance-auth] -> 401 token_invalido   [user-session] -> 503 store_indisponivel  [none] -> 401 token_ausente
ler-pontos             [lance-auth] -> 401 token_invalido   [user-session] -> 503 store_indisponivel  [none] -> 401 token_ausente
registar-palpite       [lance-auth] -> 401 token_invalido   [user-session] -> 404 edicao_inexistente [none] -> 401 token_ausente
resgatar-cartao        [lance-auth] -> 401 token_invalido   [user-session] -> 400 morada_invalida     [none] -> 401 token_ausente
comprar-senhas (Via A) [lance-auth] -> 400 saldo_insuficiente  [user-session] -> 401 token_invalido   [none] -> 401 token_ausente
```
Os 401 dos Via B são 100% atribuíveis ao tipo do token: com o MESMO token `user-session` a autenticação passa (503/404/400 = já dentro do handler) e só falha no store local. `comprar-senhas` (Via A) faz a inversão exacta.

### 1.2 Produção (carteira descartável gerada localmente; endereço sem fundos/sem registo)
`probe-prod.mjs` gerou `0xdc241cab…1773d`, assinou `DESAFIOGUT-AUTH:<ts>:<addr>` e obteve AMBOS os tokens do site vivo:
```
POST /auth-lance -> 200 (lance-auth  {tipo:"lance-auth"})
POST /auth-user  -> 200 (user-session {tipo:"user-session"})
```

Controlos (sem Bearer): `GET/POST` dos Via B → `401 token_ausente` (4/4); `GET /comprar-passe-pontos` → `405 metodo_invalido`.

Com `Bearer = lance-auth` (o token que os 4 hooks REALMENTE enviam):
```
GET  /ler-pontos              -> 401 token_invalido
POST /comprar-passe-pontos    -> 401 token_invalido
POST /registar-palpite        -> 401 token_invalido
POST /resgatar-cartao         -> 401 token_invalido
POST /comprar-senhas          -> 400 saldo_insuficiente   (Via A ACEITA o mesmo token)
```
Com `Bearer = user-session` (o token que o `saldo-rs` usa):
```
GET  /ler-pontos              -> 200
POST /comprar-passe-pontos    -> 402 saldo_insuficiente
POST /registar-palpite        -> 404 edicao_inexistente
POST /resgatar-cartao         -> 400 morada_invalida
POST /comprar-senhas          -> 401 token_invalido       (Via A REJEITA)
```

⇒ O `POST /comprar-passe-pontos` devolve 401 **apenas e precisamente** por o Bearer ser `lance-auth` em vez de `user-session`. Mesmo endereço, mesmos endpoints, dois tokens → a variável isolada é o `tipo`.

Evidência bruta: `EVIDENCIA-local.txt`, `EVIDENCIA-prod.txt`.

---

## 2. Alegações REFUTADAS por cenário + medida

**Nenhuma.** Todas as tentativas de refutação (secção 3) FALHARAM — i.e., nenhuma hipótese alternativa produziu o 401. As hipóteses alternativas foram afastadas assim:

| Hipótese alternativa | Cenário testado | Medida que a mata |
|---|---|---|
| (e) prefixo do header errado | ver `src/lib/api.js` `montarHeaders` → `Authorization = \`Bearer ${token}\``; sonda real | respostas vêm `token_invalido`, **não** `token_ausente` ⇒ o prefixo `Bearer ` foi aceite e o token extraído |
| JWT_SECRET errado/ausente | assinar tokens nos dois emissores + endpoint | `auth-lance` e `auth-user` devolvem 200 com tokens válidos; endpoints verificam tokens do tipo certo (200/402/404/400) ⇒ segredo presente e CONSISTENTE entre funções |
| rate-limit a devolver 401 | ler `_lib/rate-limiter.mjs` + sonda | o rate-limiter devolve **429** (`rate_limit_excedido`), nunca 401; sondas devolveram 401 `token_invalido` |
| `sistemaPausado` | ler `_lib/system-state.mjs` + sonda | devolve **503** (`sistema_pausado`); sondas deram 401 |
| CORS | ler `_lib/cors.mjs` + sonda | CORS falha como `TypeError` no browser (APK cross-origin); no web é same-origin; não produz 401 |
| body / `idempotencyKey` | ler handlers | validados **depois** do auth → dariam 400; sondas deram 401 antes de chegar ao body |

Nenhuma das causas (b)/(c)/(d) do enunciado se sustenta: o endpoint é coerente com o padrão dominante; o token serve o Via A porque este usa outro verificador; o `ficheiro:linha` está correcto.

---

## 3. O que NÃO consegui refutar (a favor do diagnóstico)

Todos os pontos do diagnóstico resistiram às 7 tentativas de refutação sugeridas — e vários foram confirmados por execução:

1. **`auth-lance` emite mesmo `tipo:"lance-auth"`** — ficheiro lido INTEIRO (106 linhas, sem ramos `?action=`, caminho único `linha 98 → assinarLanceAuth`). Produção: claim do token = `{"tipo":"lance-auth"}`. NÃO refutado.
2. **`jwt.mjs:44`/`:81`/`:69`** — cadeia exacta: `assinarLanceAuth` grava `tipo:"lance-auth"`; `verificarUserSession` lança se `tipo !== "user-session" && !== "admin-access"`. Medido in-process: `ERR_JWT_CLAIM_VALIDATION_FAILED`. NÃO refutado.
3. **Os 4 hooks usam mesmo o provedor errado** — `useComprarPasse.js:32/50`, `usePontos.js:22/35-36`, `usePalpite.js:15/37-38`, `useResgatarCartao.js:31/48` todos fazem `getAuthToken/obterToken` de `useTrocarPorSenhas` → `apiPost("auth-lance")` (`useTrocarPorSenhas.js:45`). Nenhum passa por outro caminho. NÃO refutado.
4. **Alcance = 4 endpoints** — os 4 Via B (`comprar-passe-pontos:20/35`, `ler-pontos:16/26`, `registar-palpite:18/30`, `resgatar-cartao:25/40`) usam `verificarUserSession`; produção: os 4 devolvem 401 com `lance-auth`. `resgatar-cartao.mjs` é UTAC106g (cabeçalho do ficheiro). NÃO refutado.
5. **«O utilizador usa `ler-pontos` com sucesso» é FALSO** — não existe caminho alternativo em `ler-pontos.mjs` (um único `titular()`); produção: `lance-auth` → 401. O `saldo-rs` que o utilizador VÊ vem do `AppContext` com `authToken` (`AppContext.jsx:432` estado, `:921` `POST /auth-user`, `:1017` `apiGet("saldo-rs", {token: authToken})`) — token `user-session` correcto. Ver o saldo NÃO prova nada sobre o token dos hooks. NÃO refutado.
6. **Contraste Via A** — `comprar-senhas.mjs:24/135` usa `verificarLanceAuth`; produção: aceita `lance-auth` (400 saldo) e rejeita `user-session` (401). Contagem de ficheiros confirmada: **25** endpoints com `verificarUserSession` (27 incl. `_lib/jwt.mjs`+`require-mfa.mjs`) e **5** com `verificarLanceAuth` (`banners`, `comprar-senhas`, `lance-relampago`, `troco`, `voucher`). `assinarUserSession` só em `auth-user.mjs`. NÃO refutado.
7. **Tipo de causa = (a)** — o hook envia header com token de propósito errado; prefixo correcto; endpoint coerente. NÃO refutado.

**Nuance (não refutação, complemento):** o diagnóstico atribui a cegueira dos testes só ao duplo frontend. É verdade — os testes fazem alias de `./useTrocarPorSenhas.js` para `_stubs-106e/useTrocarPorSenhas.js` (token fixo `"TOKEN-DE-TESTE-106e"`; `utac106e` linha 87 e `utac106f` linha 242 assertam `Bearer TOKEN-DE-TESTE-106e`), substituindo exactamente a peça avariada. MAS também os testes de backend NÃO pegam: `_tests/ler-pontos.test.mjs:71` faz `namedExports: { verificarUserSession: async () => ({endereco, tipo:"user-session"}) }` — isto é, **mocka o próprio verificador**, logo nunca exercita a lógica de `tipo`. Duas camadas de cegueira, mesma causa de fundo. Isto REFORÇA o diagnóstico, não o enfraquece.

---

## 4. O que NÃO mediste (limitações declaradas)

- Não li/imprimi `.env` nem chaves; não verify o valor de `JWT_SECRET` (só inferi, por comportamento, que está presente e consistente entre funções).
- Não corri a suíte de testes (não era o objectivo); a análise dos duplos/mocks foi por leitura de ficheiro.
- Não confirmei que o deploy de produção corresponde EXACTAMENTE ao commit `b7dad75` (sem mapa deploy↔commit); confirmei que o comportamento observado é o que o código de `b7dad75` prediz (quer para os 401 dos Via B, quer para o aceite do Via A).
- Não executei o clique real na UI (Privy/popup no browser); o passo-a-passo foi reconstruído por leitura dos 4 hooks + `api.js` + `AppContext` e validado nos endpoints vivos com tokens reais equivalentes. Nenhum passo é impossível.
- Não testei o fluxo no APK (origem `https://localhost`) — só a face HTTP, que é independente da origem.

---

## 5. Decisão

**APROVADO, com 0 bloqueantes.** O diagnóstico está correcto e verificado por execução (in-process + produção), incluindo as partes não-óbvias:

- (a) causa = proveniência do Bearer (tipo `lance-auth` vs `user-session`), NÃO prefixo/JWT_SECRET/rate-limit/pausa/CORS/body;
- (b) alcance = 4 hooks/endpoints Via B (compra, pontos, palpite, resgate), todos medidos a 401 em produção;
- (c) a premissa «o utilizador usa `ler-pontos` com sucesso» é FALSA — `ler-pontos` devolve 401 ao token que os hooks enviam; ver o saldo vem de outro token (`saldo-rs`/`AppContext`);
- (d) evidência `ficheiro:linha` toda confirmada (`jwt.mjs:44/69/81`, `auth-lance.mjs:98`, `auth-user.mjs:94`, `api.js` `Bearer`, `AppContext.jsx:432/921/1017`, os 4 hooks).

A recomendação (trocar o provedor nos 4 hooks para o token `user-session` do `AppContext`, ou aceitar `lance-auth` nos Via B por decisão do operador) é coerente com a causa medida. O executor NÃO corrigiu — correcto: o âmbito era diagnosticar.

**Nota de risco:** enquanto não corrigido, os 4 fluxos Via B estão quebrados em produção, e os testes continuam verdes porque mockam o verificador/duplo. Qualquer correção deve acrescentar um teste que exercite a assinatura do token REAL (sem duplo de `getAuthToken` nem mock de `verificarUserSession`) para que o defeito não volte invisível.
--- FIM DO VEREDICTO VERBATIM ---

**Leitura do executor.** O diagnóstico **resistiu a todas as tentativas de refutação**, e o validador
foi **além** do que eu tinha medido: gerou uma carteira descartável, assinou ao vivo e obteve **os dois
tokens do site de produção** (`auth-lance` → `lance-auth`; `auth-user` → `user-session`), mostrando a
**inversão perfeita** — com `lance-auth` os 4 endpoints Via B dão `401 token_invalido` e o
`comprar-senhas` (Via A) **aceita**; com `user-session` é o contrário (os Via B passam para dentro do
handler: 402/404/400, e o Via A dá 401). Isso isola a variável ao **tipo do token**, não ao endereço
nem ao endpoint. Confirmou também as hipóteses alternativas como mortas (rate-limit devolve **429**,
`sistemaPausado` **503**, CORS não produz 401, body é validado **depois** do auth, e o prefixo é
aceite — as respostas são `token_invalido`, não `token_ausente`).

**Duas contribuições que eu NÃO tinha medido (aceites e incorporadas):**

1. **Segunda camada de cegueira nos testes:** não é só o duplo do frontend
   (`_stubs-106e/useTrocarPorSenhas.js`, token fixo). Os testes de **backend** também mockam o
   verificador: `_tests/ler-pontos.test.mjs:71` faz
   `namedExports: { verificarUserSession: async () => ({endereco, tipo:"user-session"}) }` — isto é,
   **substituem a própria lógica de `tipo`**. Duas camadas independentes a esconder o mesmo defeito.
   **Reforça** o diagnóstico; não o enfraquece.
2. **Linha exacta do emissor do token correcto:** `auth-user.mjs:94`. Enumeração completa dos 5
   endpoints que aceitam `lance-auth` (`banners`, `comprar-senhas`, `lance-relampago`, `troco`,
   `voucher`) — o Via A todo.

## §SEG5 — Registo, recomendação e PARAGEM

### Diagnóstico final (uma frase)

> **O `401` não é uma sessão expirada: é um token de PROPÓSITO ERRADO — os 4 hooks da Via B pedem o
> Bearer ao `POST /auth-lance` (JWT `tipo:"lance-auth"`) enquanto os 4 endpoints da Via B validam com
> `verificarUserSession`, que rejeita por desenho tudo o que não seja `tipo:"user-session"` ou
> `"admin-access"` (`_lib/jwt.mjs:81`).**

### Recomendação (o UTAC **não** corrige — decisão do operador)

**O que alterar (escolha do operador):**

| Opção | Onde | Efeito | Risco |
|---|---|---|---|
| **A. Trocar o provedor de token nos 4 hooks** | `useComprarPasse.js:32` · `usePontos.js:22` · `usePalpite.js:15` · `useResgatarCartao.js:31` → passar a usar o `authToken` **user-session** do `AppContext` (`:432`, cunhado em `:921` via `POST /auth-user`) — o **mesmo** que o `saldo-rs` já usa (`:1017`) | alinha o frontend com o padrão dominante (25 endpoints) e com o verificador que os endpoints já usam | nenhum teste novo a exercer o token **real** deixa o defeito invisível outra vez; o `authToken` pode estar `null` no arranque (precisa de guarda/espera) |
| **B. Aceitar `lance-auth` nos endpoints Via B** | `_lib/jwt.mjs` ou os 4 endpoints | não mexe no frontend | **rebaixa a fronteira de auth**: o `lance-auth` tem TTL 10 min e é o token do fluxo de lances; alargar o aceite a 25 endpoints é decisão de segurança, não de código |

**Recomendação técnica (sem executar):** **Opção A** — é a que segue o padrão dominante medido e não
alarga a superfície de aceitação de tokens. **Em qualquer caso, a correcção tem de trazer um teste que
exercite a assinatura REAL** (sem duplo de `getAuthToken` e sem mock de `verificarUserSession`) —
senão o defeito volta a ficar invisível com a suíte verde. Isto vale também para o **UTAC106g**: o
`resgatar-cartao` que eu entreguei está no mesmo estado.

### Recomendação de sequência

1. **UTAC106j-fix** (pequeno): trocar o provedor nos 4 hooks + teste com token real (o teste actual
   usa duplo em duas camadas).
2. **UTAC106i** (AAB) **só depois** — de contrário o AAB submetido à Google inclui os 4 fluxos Via B
   quebrados.
3. **UTAC próprio** para o ruído `eth_getFilterChanges` (fora do escopo, conforme a RESSALVA 4).

### Impacto actual em produção (declarado, sem corrigir)

**Os 4 fluxos da Via B estão inoperáveis por autenticação em produção**: comprar o Passe (1 ponto),
ver os pontos, registar o palpite e resgatar o cartão. O operador detectou-o na compra. A Via A
(«Trocar R$ 2,00 → 1 Senha», lances) **não é afectada** — usa o verificador certo.

### Registo em 3 lugares (R18)

| Lugar | Ficheiro |
|---|---|
| Detalhado | `_logs/UTAC106j-diagnostico-401.md` (este) |
| Doc de estado (bloco R14) | `CLAUDE.md` (apêndice no EOF; 4 bytes de controlo intactos) |
| Relatório do operador | `Desktop/RELATORIO-UTAC106j-DIAGNOSTICO-401.txt` |

### ⛔ PARAGEM

Conforme o enunciado (OBJECTIVO 5 e RESSALVA 1): **PARADO e escalado. Nada foi corrigido.**
Nenhum ficheiro de `src/` ou `netlify/` foi alterado; `useComprarPasse.js`,
`comprar-passe-pontos.mjs`, `_lib/passe-pontos.mjs`, `ler-pontos.mjs`, `_lib/jwt.mjs`,
`MinhaCarteira.jsx` e `ComprarPasseModal.jsx` ficaram **intocados** (só leitura). **Sem deploy.**
O ruído `eth_getFilterChanges` **não** foi tocado. A decisão da correcção é do operador.
