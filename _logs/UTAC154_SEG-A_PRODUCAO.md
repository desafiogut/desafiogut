# UTAC154 — Frente A: push + deploy + prova de CORS em produção (2026-11-28)

## Push
`git push origin main` → `100159b..23db996`: os 7 commits do UTAC152/153. Todos têm `[skip netlify]`, por isso não houve auto-deploy.

## Deploy (fluxo seguro do CLAUDE.md §3)
1. **Draft** `netlify deploy --build` → `6b0a5bc7`. Rede do `dist` publicado:
   - contrato `0x0052477A…16cd`;
   - RPC `eth-mainnet`, `VITE_CHAIN_ID=1`, `VITE_NETWORK_STAGE=mainnet`, Supabase presente;
   - sem chave Sepolia;
   - **sem** `VITE_IS_IOS_APP` e sem `VITE_IS_ANDROID_APP`;
   - PIX presente, como deve ser na web.
2. Sonda de CORS no draft: **8/8 ✓** + cache por origem ✓ (`_logs/UTAC154_cors-draft.txt`).
3. **Produção** `netlify deploy --prod --build` → `6b0a5d6a`, «**CDN requesting 0 files** and 95 functions»: os ficheiros estáticos são byte a byte os do draft validado. Saída em `_logs/UTAC154_deploy-prod_saida.txt`.

## Prova em produção (`_logs/UTAC154_cors-producao.txt`; sondas em `_logs/UTAC154_sonda-*.mjs`)
| Origem | `recursos-app` OPTIONS/GET | `edicoes` OPTIONS/GET |
|---|---|---|
| `capacitor://localhost` | 204/200, ACAO = `capacitor://localhost` | 204/200, idem |
| `ionic://localhost` | 204/200, ACAO = `ionic://localhost` | 204/200, idem |
| `https://localhost` (Android) | 204/200, ACAO = `https://localhost` | 204/200, idem |
| `https://evil.example` | 204/200, ACAO = `https://localhost` (o browser recusa) | idem |

- O pedido do enunciado, `OPTIONS /lance-relampago` com `Origin: capacitor://localhost`, dá **204** e `Access-Control-Allow-Origin: capacitor://localhost`, com `Authorization` nos allow-headers e `Vary: Origin`.
- **CDN** (`produtos?categoria=bronze`, `public, max-age=60`): Android, Android, iOS, iOS e depois Android. O último Android foi um **HIT** do Edge (`ttl=59`) e veio com ACAO `https://localhost`. A cache está separada por origem; o `Vary: Origin` é respeitado em produção.
- Site: `GET /` → 200.
