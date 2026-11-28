# UTAC154 — SEG4 VALIDADOR ADVERSARIAL INDEPENDENTE (2026-11-28)

**Veredicto: APROVADO COM RESSALVAS** — 0 bloqueantes, 2 ⚠️ (de evidência/documentação, não de código), 6 ℹ️.

Método: worktree próprio (`agent-a1b4c4a7…`, checkout destacado em `3b9bc34`). Zero escritas na árvore
principal, zero operações git lá, zero push/deploy/escritas em Supabase/Netlify. Produção medida só com
GET/OPTIONS sem auth (curl). Na árvore principal correram só testes dirigidos com `node --test … < /dev/null`.

---

## 1. Frente A — CORS em produção (re-medido por mim, 2026-11-28 ~02:3x BRT)

| Pedido | Resultado |
|---|---|
| `GET recursos-app`: `capacitor://localhost` / `ionic://localhost` / `https://localhost` | ACAO **reflecte** cada uma · `Vary: Origin, Accept-Encoding` · `application/json` ✓ |
| idem com `https://evil.example`, `capacitor://evil`, `null`, a origem do próprio site, sem Origin | ACAO = `https://localhost` (nunca reflectida) ✓ |
| Variantes: `Capacitor://localhost`, `capacitor://LOCALHOST`, `capacitor://localhost:8080`, `capacitor://localhost.evil.com`, `capacitor://localhost/`, duas cabeças Origin, lista separada por vírgula | todas → `https://localhost` (comparação EXACTA, lista fechada) ✓ |
| `OPTIONS lance-relampago` (4 origens, com `Access-Control-Request-Headers: authorization,…`) | 204; ACAO correcta por origem; `authorization` nos allow-headers; `Vary: Origin` ✓ |
| `edicoes` (`no-store`) | igual a recursos-app ✓ |
| `produtos?categoria=prata` (`public,max-age=60`), sequência sem-Origin → cap → sem-Origin → cap → ionic → android → ionic → evil → cap | os dois **HIT** do Edge (`hit; ttl=59/58`) vieram ambos para `capacitor://localhost` com ACAO `capacitor://localhost`; cada origem tem entrada própria (`stored`) ✓ |
| `GET /` | 200 `text/html` 5196 B ✓ |
| Prova de vida das functions | `recursos-app`, `edicoes`, `produtos` respondem **`application/json`** com corpo JSON válido. Controlo negativo: uma function inexistente dá **200 `text/html`** (fallback SPA) — logo o 200 sozinho não provaria nada; o content-type e o corpo provam ✓ |

Não consegui fazer reflectir uma origem errada nem servir uma resposta cacheada à origem errada.

Código (`_lib/cors.mjs`): lista fechada de 3 origens, `includes` exacto, contexto por pedido com
`AsyncLocalStorage.enterWith` em `respostaPreflight(req)`. As 11 functions que não chamam `respostaPreflight`
(8 scheduled, `mc302-aceitar`, `mc302-diagnostico`, `webhook-frenet`) nunca chamam `enterWith`. Cada function
é um Lambda próprio, por isso não herdam a origem de outro pedido: caem sempre em `https://localhost`.

Push: `git ls-remote origin` → `refs/heads/main = 23db996`; `100159b..23db996` = **7 commits**, os 7 com `[skip netlify]`.

## 2. Bundle de produção (descarreguei os 131 chunks JS de `index-BM776rWt.js`)

- O hash do índice e o `imagem-CK4KufZn.js` coincidem com `_logs/UTAC154_deploy-prod_saida.txt` (l. 107/190). O draft
  `6b0a5bc7` serve o mesmo `index-BM776rWt.js` ⇒ a produção é o artefacto do draft («CDN requesting 0 files», l. 1390).
- **Mainnet**: `VITE_CONTRATO_SEPOLIA = 0x0052477A8CA81BCAF4a60e21e635F9e00a5d16cd`, `VITE_CHAIN_ID = 1`,
  `VITE_NETWORK_STAGE = mainnet`, `VITE_EXPLORER_URL = https://etherscan.io`, Alchemy `eth-mainnet`. O endereço Sepolia
  abandonado `0x59a7…f6d5` aparece **só** como valor de comparação do detector de regressão (`…===xn&&e.push("contrato abandonado")`
  no `PrivyRoot`). Isso está certo.
- **Flags nativas**: o objecto `import.meta.env` inlinado tem as chaves BASE_URL, DEV, MODE, PROD, SSR, VITE_ALCHEMY_URL,
  VITE_CHAIN_ID, VITE_CONTRACT_ADDRESS, VITE_CONTRATO_SEPOLIA, VITE_EXPLORER_URL, VITE_MOCK_MODE, VITE_NETWORK_STAGE,
  VITE_PRIVY_APP_ID, VITE_SENTRY_DSN, VITE_SUPABASE_*, VITE_WC_PROJECT_ID — **sem `VITE_IS_ANDROID_APP` nem `VITE_IS_IOS_APP`**.
  «Depositar PIX», «Confirmação de depósito PIX» e «Saldo Disponível» estão presentes, como deve ser na web ✓.
- **Nada da Frente B entrou na produção**: o `imagemProdutoSrc` publicado ainda devolve
  `` `/.netlify/functions/img-proxy?url=${…}` `` sem `apiUrl`. É o código de `23db996` ✓.
- **Árvore de trabalho no deploy**: comparei ficheiro a ficheiro (`diff -rq --strip-trailing-cr`, sem git), entre a árvore
  principal e `3b9bc34`, as pastas `src/`, `netlify/functions/`, `public/`, `index.html`, `vite.config.js`, `package.json` e
  `netlify.toml`. Só há uma diferença: `netlify/functions/graphify-out/cache/` (não rastreado, sem `.mjs` ⇒ não é function;
  o deploy contou 95 functions). Lockfiles: os da raiz e de `desafio-gut/` são iguais ao commit (ignorando CRLF). O
  `desafio-gut/frontend/package-lock.json` difere em 118 linhas: tira os peers opcionais `@tanstack/react-query`,
  `@tanstack/query-core`, `@types/react` e `typescript`, e marca ~40 pacotes como `"dev": true`. É exactamente o que o
  comando de build do `netlify.toml` (`npm install --legacy-peer-deps`) produz, logo é consistente com a ressalva da spec.

## 3. Frente B — `imagem.js` + `apiUrl()` (`3b9bc34`)

- **Avaliação no carregamento do módulo**: `API_ORIGIN = ehNativo() ? ORIGEM_PRODUCAO : ""` é calculado uma vez. É a
  **mesma** decisão (`window.Capacitor?.isNativePlatform?.() === true`, no mesmo instante) que o `instalarReescritaApi()`
  usa. Esse shim é importado em 1.º lugar no `main.jsx` e está provado no aparelho desde o MC88.11. O `imagem.js` vive num
  chunk preguiçoso, importado depois de `apiOrigin.js` já ter sido avaliado (instância ESM única). O Capacitor injecta a
  ponte antes dos scripts da página. Se o `window.Capacitor` faltasse no import, o `fetch` de toda a app também partiria,
  e não parte. Consistente ✓.
- **CSP / mixed content / ATS**: o `index.html` não tem CSP por meta. O CSP de produção é cabeçalho HTTP e não se aplica
  ao WebView. Android `https://localhost` → `https://` não é mixed content. No iOS (`capacitor://localhost`), o `Info.plist`
  não tem excepção ATS, mas o destino é HTTPS, o que o ATS aceita. Os `<img>` de `Vitrine`/`DetalheProduto` não têm
  `crossorigin` ✓.
- **`img-proxy` cross-origin**: medido com `Origin` + `Sec-Fetch-Dest: image` / `Sec-Fetch-Site: cross-site`. Dá 200
  `image/jpeg`, `public,max-age=86400`, **sem `Cross-Origin-Resource-Policy`**, sem cookies e sem exigir Origin/Referer
  (o código só usa `respostaPreflight`) ✓. ⚠️ ver ℹ️2: os ficheiros **estáticos** do site levam `CORP: same-origin`.
- **Outros `<img>` para `/.netlify/functions/`**: grep em `src/` (sem testes) — todos os outros literais são `fetch`
  (cobertos pelo shim). As artes das edições (`CartaoEdicao`/`EdicaoBanner`) usam `edicao.imagem_url` cru. Em produção
  são `/artes/edicao-especial-airfryer.jpg` (está em `public/artes/`, empacotado no APK) ou URLs absolutas do Supabase
  Storage. Nenhum aponta para uma function ⇒ nada ficou esquecido ✓.
- **Assets locais**: `apiUrl` só toca em `/.netlify/functions/*`. `/assets/…`, `/icons/…`, `data:`, `blob:` e base64
  ficam intactos — o teste prova-o em web, Android e iOS ✓.

## 4. Qualidade dos testes e versionCode

- `utac154-imagem-nativo`: 3/3 no meu worktree e na árvore principal.
- **Mutação do validador** (`UTAC154_SEG4_mutantes.mjs`, restauro md5 idêntico):

| Mutante | Resultado |
|---|---|
| V1 código antigo (proxy sem `apiUrl`) | MORTO (2 falhas) |
| V2 relativo sem `apiUrl` | MORTO (2) |
| V3 `API_ORIGIN` sempre produção (a web fica absoluta) | MORTO (1) |
| V4 `apiUrl` absolutiza qualquer `/…` (os assets iriam à produção) | MORTO (2) |
| V5 nativo = só Android | MORTO (1) |
| V6 proxy com `window.location.origin` | MORTO (3) |
| V7 `ehNativo()` avaliado tarde | sobrevive, mas é **equivalente** (não é defeito) |

  ⇒ 6/6 mutantes não-equivalentes mortos.
- **versionCode**: `android/app/build.gradle` tem `versionCode 16` / `versionName "1.5.1"` (`c74672b`, UTAC151, AAB v16
  documentado no CLAUDE.md). Os testes ficaram certos, sem esconder nada. Não há mais asserções de versão desactualizadas.
  `utac123`, `utac132`, `utac129` e `utac154` juntos na árvore principal: **53 testes, 52 ✓, 0 ✗, 1 skip pré-existente**
  (C4 do UTAC147).

## 5. Âmbito

`git diff --name-only 23db996 3b9bc34` = `src/lib/imagem.js` + 3 testes. Backend, contratos e lógica de negócio não
foram tocados. `3b9bc34` **não está no remoto** (`ls-remote` não o tem; `branch -r --contains` vazio) ✓.

---

## Achados

**⚠️1 — Não há suíte completa no estado commitado.** `_logs/UTAC154_suite-frontend_saida.txt` (02:04:48) foi gravado
**antes** da correcção do versionCode: 1473 testes, **1419 ✓ · 2 ✗** (os dois `versionCode 15`) · 52 skip. O commit
(02:05:21) diz que o HI está fechado, mas nenhum log mostra a suíte inteira verde depois. A minha re-corrida dirigida
mostra-os verdes; o esperado é **1421/1473 (52 skip)**. Correcção: re-correr a suíte e gravar o log antes do relatório.
O `_logs/UTAC154-RELATORIO.md` (Frente C) também ainda não existe.

**⚠️2 — Uma premissa do SEG-1 está imprecisa (sem efeito no código).** O SEG-1 e o comentário do `imagem.js` dizem que
na web «o CSP `img-src 'self'` exige same-origin». O CSP **de produção** medido tem
`img-src 'self' data: blob: https://vjslwowwrpcawijdiksm.supabase.co … https://silly-stardust-ca71bc.netlify.app …`, logo
um URL absoluto da produção também passaria. Manter o relativo na web continua certo, porque protege os deploy previews
e o `vite.config.js` de dev (`img-src 'self'`). Só a justificação escrita está errada. Basta reformular o comentário.

**ℹ️1 — O CDN da Netlify compara o `Vary: Origin` sem distinguir maiúsculas.** Um pedido com
`Origin: Capacitor://localhost` recebeu o **HIT** da entrada de `capacitor://localhost` (ACAO `capacitor://localhost`).
Na `edicoes`, sem cache, a mesma origem dá `https://localhost`. Não é explorável: um browser serializa sempre a origem em
minúsculas e não há duas origens legítimas que difiram só na caixa. Fica registado.

**ℹ️2 — O `CORP: same-origin` do `netlify.toml` (`/*`) vale para os ficheiros estáticos, não para as functions.** Medido:
`/artes/edicao-especial-airfryer.jpg` leva `Cross-Origin-Resource-Policy: same-origin`, e `img-proxy` não leva nenhum.
A correcção funciona **porque** o `<img>` vai a uma function. Se alguém usar `apiUrl`/`ORIGEM_PRODUCAO` para um asset
estático no nativo, o WebView bloqueia (`ERR_BLOCKED_BY_RESPONSE`). O teste já impede que os assets ganhem a origem;
convém deixar esta razão escrita.

**ℹ️3 — Sem dados vivos para observar a correcção.** `produtos` está vazio nas 4 categorias em produção. Nenhum
`<img>` de produto passa hoje pelo `img-proxy`, nem na web nem no app. A correcção só se verá num aparelho quando houver
produto com imagem externa **e** num APK/IPA novo, porque o frontend vai empacotado.

**ℹ️4 — O teste nativo assume o `window.Capacitor` antes do import.** Isso modela a mesma premissa do shim do fetch (que
está provada no aparelho), mas o próprio teste não a prova. É aceitável pela consistência com o MC88.11.

**ℹ️5 — `Deploying functions from cache`** no deploy de produção. Não houve efeito: o CORS do UTAC153 está activo em
produção, medido.

**ℹ️6 — Caso-limite no nativo.** Uma `imagem_url` absoluta `https://localhost/...` no Android seria «same-origin» e
devolvida directa (carregaria do pacote local). Hoje não acontece, e no iOS é impossível.

## O que NÃO consegui verificar

- O comportamento num **aparelho real** (APK/IPA com `3b9bc34`): não há build nativo novo, e o MCP do android-studio
  falhou a carregar.
- A suíte **completa** (frontend/backend) no estado `3b9bc34`: RAM baixa, só testes dirigidos.
- Que a ordem de injecção do `window.Capacitor` vs. avaliação do chunk se mantém no WKWebView do iOS (é inferida do
  Android e do desenho do Capacitor).
- O estado exacto da árvore de trabalho **no instante** do build (01:42–01:55). Inferi-o pelo bundle publicado (sem a
  Frente B) e pela comparação de agora.
- A lista de deploys da Netlify (não usei o CLI autenticado). A identidade draft→produção foi provada pelo hash do bundle.

Artefactos: este ficheiro + `UTAC154_SEG4_mutantes.mjs` (worktree do validador).
