# UTAC154 — SEG-1 MEDIÇÃO (2026-11-28)

## -1.1 Repo
- HEAD `23db996`; `origin/main` = `100159b` (depois do `git fetch`).
- `origin/main..HEAD` = **exactamente os 7 commits** do UTAC152/153. O remoto não tem nada à frente.
- Os 7 commits têm `[skip netlify]` ⇒ o push **não** dispara o auto-deploy.
- Alheios na árvore: `package-lock.json` (o diff `--legacy-peer-deps`), `.agents/…`, `.gitignore`, `.mcp.json` e `scripts/utac112-prova-mutacao.mjs`. Não se tocam nem vão no push.

## -1.2 Produção (drift)
`netlify api listSiteDeploys`: o último deploy de produção é `6b088e2f` (2026-11-26 19:57), o do UTAC151, sobre `100159b`. **Sem drift.**

## -1.3 Imagens (Frente B)
- O **único** `<img>` montado para uma function é `src/lib/imagem.js:22`, o `img-proxy` relativo. Consumidores: `Vitrine.jsx` e `DetalheProduto.jsx`.
- Os restantes literais `/.netlify/functions/...` são `fetch`, já reescritos no nativo por `instalarReescritaApi()` (`apiOrigin.js`).
- Já existe a base: **`apiUrl(caminho)`** (`src/lib/apiOrigin.js`) absolutiza `/.netlify/functions/*` só no nativo (`ORIGEM_PRODUCAO`) e devolve o caminho intacto na web. Tudo o resto (assets) passa intocado.
- `index.html` **não** tem CSP por meta. O CSP vem só do cabeçalho HTTP do Netlify, que não se aplica ao WebView nativo ⇒ uma URL absoluta no `<img>` não é bloqueada no app.
  - Na web o caminho continua relativo. ~~«porque o CSP `img-src 'self'` exige same-origin»~~ — **impreciso (SEG4 ⚠️2):** o CSP de produção também permite a origem da produção e o Supabase. A razão certa é que o relativo serve a produção, os deploy previews e o `vite dev` por igual.
- As artes das edições (`EdicaoBanner`, `CardEdicaoEspecial`) usam URLs absolutas do Supabase e já funcionam no nativo.

## -1.4 Deploy — método
O `CLAUDE.md` (Instruções §3) manda o fluxo seguro: `netlify deploy --build` (draft) → validar o bundle → `--prod --build`. Segue-se esse fluxo, que também permite **provar o CORS no draft antes da produção**.

## -1.5 Disco/RAM
12 GB livres. A RAM está baixa (~600 MB): um `build:ios` em background já foi morto. O build corre em foreground.

## Veredito: **SEGUIR** (sem conflitos com o enunciado).
