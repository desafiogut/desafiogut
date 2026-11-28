# UTAC153 — SEG-1 MEDIÇÃO (2026-11-28)

Nada foi alterado neste segmento.

## -1.1 Estado
- HEAD `a80a4b0` = baseline.
- `origin/main..HEAD` = os 4 commits locais do UTAC152, sem push.
- Ficheiros alheios na árvore: `package-lock.json`, `scripts/utac112-prova-mutacao.mjs`. Não se tocam.

## -1.2/-1.3 Onde vive o CORS (medido; o enunciado supunha `netlify.toml`)
- **Não está no `netlify.toml`.** Está em `netlify/functions/_lib/cors.mjs`:
  - `ORIGEM_APK = "https://localhost"` (l.22);
  - `CABECALHOS_CORS`, um `Object.freeze` **constante** (l.45), com `access-control-allow-origin` e `timing-allow-origin` = `ORIGEM_APK` e `vary: Origin`;
  - `respostaPreflight(req)` devolve 204 com essa constante (l.81).
- A constante entra nas respostas em **4 sítios**:
  - `_lib/validate.mjs:115` (`jsonResponse`, com **211 chamadas**);
  - `_lib/http-cache.mjs:35` (`jsonCacheavel`, 6 chamadas);
  - `_lib/rate-limiter.mjs:87` (429);
  - `admin-financeiro-relatorio.mjs:76`.
- O comentário do próprio `cors.mjs` explica porque é constante: «`jsonResponse()` não recebe a `Request`, e mudar a assinatura obrigaria a tocar nos 41 call-sites» (hoje são 211).
- 96 functions. **85 chamam `respostaPreflight(req)`.** As 11 que não chamam são scheduled (7), `webhook-frenet`, `mc302-aceitar` e `mc302-diagnostico`: nenhuma é chamada pelo app.
- `new Response(...)` sem CORS: `banners.mjs` (imagem/SVG), `img-proxy.mjs`, `exportar-dados.mjs` (CSV). As imagens servem `<img>`, que não precisa de CORS. O CSV por `fetch` já não passaria no APK hoje. Fica fora do âmbito e é registado.

## -1.4 O facto que muda a frente A
**`Access-Control-Allow-Origin` aceita UMA só origem (ou `*`).** Não existe «lista» para acrescentar. Para servir o Android (`https://localhost`) e o iOS (`capacitor://localhost`, `ionic://localhost`) ao mesmo tempo, o servidor tem de **reflectir a origem do pedido** quando ela pertence a uma lista fechada. Isso obriga a saber a origem **no momento em que a resposta é montada**, e as 211 chamadas a `jsonResponse` não recebem a `Request`.
- `*` está proibido: o próprio `cors.mjs` o proíbe (dinheiro e senhas) e é a decisão do MC88.12.
- O Supabase chamado directamente pelo frontend tem CORS próprio. O bloqueio é só nas Netlify Functions.

## -1.5 Disco / runtime
12 GB livres. Node local v24; as funções são v2 (`export default async (req)`).

## ⚠️ Conflito (AU3: arquitectura, decide o operador)
Como pôr a origem do pedido nos cabeçalhos sem tocar nas 211 chamadas?
- **Opção 1 (recomendada):** capturar a origem em `respostaPreflight(req)`, que já é a 1.ª linha de todas as 85 functions do app, num `AsyncLocalStorage` (contexto por pedido, não variável global). `CABECALHOS_CORS` passa a função `cabecalhosCors()` nos 4 sítios. Origem fora da lista, ou sem contexto (scheduled, testes antigos) ⇒ `https://localhost`, exactamente o valor de hoje. Cerca de 5 ficheiros; nenhuma assinatura muda.
- **Opção 2:** passar a `req` explicitamente (`jsonResponse(..., req)`) nas 211 chamadas e nas 85 functions. Explícito, mas um diff enorme de lógica não relacionada.
- **Opção 3:** sem backend: activar o `CapacitorHttp` no iOS, que manda o fetch pelo nativo e dispensa o CORS. Muda toda a rede do app iOS (Sentry, uploads, streaming), não é o que o enunciado pede, e deixa a DEBT-117 aberta para o WKWebView.

## Veredito: **AJUSTAR** — escolha do operador antes do SEG0.
