# UTAC153 — SEG0..SEG2 (frentes)

**Decisão do operador R18-153-A (2026-11-28):** Opção 1. A origem é capturada em `respostaPreflight(req)` com `AsyncLocalStorage`. A lista fechada tem `https://localhost`, `capacitor://localhost` e `ionic://localhost`; qualquer outra origem fica com o comportamento actual.

## Frente A — CORS (`44a90b4`)
`netlify/functions/_lib/cors.mjs`:
- **`ORIGENS_NATIVAS_PERMITIDAS`** (congelada) e **`origemCorsPermitida(o)`**: comparação EXACTA. Qualquer outra coisa (caixa, porta, espaço, `null`, `*`, sufixo `.evil.com`) dá `https://localhost`.
- **`registarOrigemDoPedido(req)`**: `AsyncLocalStorage.enterWith({ origem })`, um contexto por pedido. Chamado por `respostaPreflight(req)` em TODOS os métodos, porque o pedido real também precisa da origem.
- **`cabecalhosCors(origem?)`**:
  - troca só `access-control-allow-origin` e `timing-allow-origin`;
  - para `https://localhost` devolve o próprio `CABECALHOS_CORS` (o mesmo objecto de antes);
  - `CABECALHOS_CORS` continua exportado com o valor de sempre.
- **Os 4 sítios**:
  - `validate.mjs` (`jsonResponse`/`jsonError`): `cabecalhosCors()`;
  - `http-cache.mjs` (`jsonCacheavel`): `cabecalhosCors(req.headers.get("origin"))`, com a origem do próprio pedido;
  - `rate-limiter.mjs` (429): `cabecalhosCors()`;
  - `admin-financeiro-relatorio.mjs`: `cabecalhosCors()`.
- **CDN:** o `vary: Origin` já existente entra na chave de cache da Netlify. A documentação diz: «values for header names sent with the standard `Vary` HTTP response header are factored into cache keys for all response types» (docs.netlify.com/platform/caching, lido a 2026-11-28). ⇒ o `jsonCacheavel` (público, `max-age=60`) não serve ao iOS a resposta do Android.
- **HI (pré-existente, corrigido na linha que este UTAC já tocava):** `admin-financeiro-relatorio.mjs:76` usava `require(...)` num módulo ESM. Prova: `node --input-type=module -e "require('x')"` → `ReferenceError: require is not defined`. ~~O export CSV do ADM rebentava sempre.~~ **REFUTADO pelo validador (SEG4 ℹ️3):** em produção o esbuild (`netlify.toml:23`) resolve o `require` e funciona. Só no Node cru dá `ReferenceError`. Passou a `import { respostaPreflight, cabecalhosCors }` (inócuo).

## Frente B — Testes
- Novo `_tests/utac153-cors-ios.test.mjs`, com 12 testes:
  - lista fechada;
  - comparação exacta (14 origens hostis);
  - só as 2 linhas mudam;
  - **preflight OPTIONS de `capacitor://localhost` e de `ionic://localhost` ⇒ 204 + `Access-Control-Allow-Origin` certo**;
  - Android sem regressão;
  - origem estranha ⇒ `https://localhost`;
  - o pedido real (depois de `await`) leva a origem;
  - `jsonCacheavel` 200/304;
  - **5 pedidos concorrentes de origens diferentes não se misturam**;
  - **as 85 functions REAIS do app** respondem ao preflight do iOS com 204 + a origem certa, e não reflectem uma origem estranha.
- 8 testes com mock de `cors.mjs` (`mc9112`, `mc941`, `utac110f`, `utac129`, `utac142`, `utac145`, `utac146`, `utac147-val`): o mock ganhou `cabecalhosCors`, a devolver um objecto com o MESMO conteúdo do `CABECALHOS_CORS` desse mock (não o mesmo objecto — SEG4 ℹ️4). Sem isto, 43 testes caíam com «does not provide an export named 'cabecalhosCors'» (1.ª corrida, medida).

## Provas
- Suíte backend: **1552/1641, 0 falhas** e 89 skipped. É o 1539/1628 do UTAC151 mais os 13 testes novos (`_logs/UTAC153_suite-backend_saida.txt`).
- Mutação **8/8 RED** com md5 idêntico (`_logs/UTAC153_mutacao_saida.txt`). Mutantes:
  - reflectir qualquer origem;
  - comparação sem caixa;
  - o preflight não regista;
  - ignorar o contexto;
  - `jsonCacheavel` e `jsonResponse` voltam à constante;
  - **contexto global em vez de por pedido**;
  - tirar o iOS da lista.
- Lógica de negócio: zero linhas (diff só em `cors`/`validate`/`http-cache`/`rate-limiter`, na linha de cabeçalhos do relatório e em testes).
- **Sem deploy:** a correcção só chega ao iOS depois de `netlify deploy --prod --build` autorizado.
