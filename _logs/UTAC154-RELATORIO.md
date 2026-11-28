# UTAC154: Deploy do CORS do iOS + imagens nativas (DEBT-121) — RELATÓRIO FINAL

**Data:** 2026-11-28 · **Baseline:** `23db996` · **Tipo:** publicação + produto · **Executor:** Opus 5.5

## Checklist de aceite (enunciado)
| | Item | Estado |
|---|---|---|
| ✅ | Push dos 7 commits | `100159b..23db996` (UTAC152 + UTAC153). Todos com `[skip netlify]`, sem auto-deploy |
| ✅ | Deploy de produção | Draft `6b0a5bc7` validado → **produção `6b0a5d6a`**, «CDN requesting 0 files» (o artefacto do draft) |
| ✅ | CORS em produção aprovado | `OPTIONS /lance-relampago` com `Origin: capacitor://localhost` → **204 + `Access-Control-Allow-Origin: capacitor://localhost`**. `ionic://` também é reflectido; Android (`https://localhost`) intacto; origem estranha → `https://localhost`; CDN separado por origem |
| ✅ | Imagem absoluta no nativo | `imagemProdutoSrc` usa `apiUrl()` (a base que já existia): absoluta na produção só no Android/iOS, relativa na web |
| ✅ | Assets estáticos preservados | `/assets/…`, `/icons/…`, `/artes/…`, `data:`, `blob:` e base64 ficam iguais nas 3 plataformas (teste) |
| ✅ | Suíte frontend a passar | **1421/1473, 0 falhas** (52 skipped) em `aa7917e` (`_logs/UTAC154_suite-frontend-final_saida.txt`) |
| ✅ | Commit local do DEBT-121 | `3b9bc34` + `aa7917e` (comentário) + docs. **⛔ Sem push** |
| ✅ | Relatório final | este ficheiro |

## Frente A — produção
- Rede do bundle publicado:
  - contrato `0x0052477A…16cd`;
  - `eth-mainnet`, chainId 1;
  - **sem** flags `VITE_IS_IOS_APP`/`VITE_IS_ANDROID_APP`;
  - PIX presente (é a web).
- Sondas guardadas em `_logs/UTAC154_sonda-*.mjs`; saídas em `_logs/UTAC154_cors-{draft,producao}.txt`. Detalhe em `_logs/UTAC154_SEG-A_PRODUCAO.md`.
- O validador **re-mediu a produção de forma independente**:
  - 17 origens hostis (caixa, porta, sufixo, `null`, duas cabeças Origin, lista separada por vírgula): nenhuma foi reflectida;
  - nenhuma resposta em cache foi servida à origem errada;
  - functions vivas, provadas pelo `content-type: application/json` com controlo negativo (uma function inexistente dá `text/html`).

## Frente B — DEBT-121
- No nativo, o `<img src="/.netlify/functions/img-proxy?…">` relativo resolvia-se no próprio telemóvel: recebia o index.html do fallback da SPA e a imagem ficava em branco. O `fetch` já era reescrito, mas um `<img>` não passa pelo `fetch`.
- `apiUrl()` decide como o shim do `fetch`, que já está provado no aparelho: absolutiza só `/.netlify/functions/*` e só no nativo.
- **Backend intacto.**
- O `img-proxy` serve um `<img>` cross-origin sem CORS nem cookies (medido pelo validador).
- Testes:
  - `utac154-imagem-nativo` (web + Android + iOS em processo filho);
  - mutação: executor 2/2 RED, validador 6/6 não-equivalentes mortos.
- **HI (DEBT-120d):** os 2 testes `versionCode 15` estavam vermelhos desde o UTAC151 (o Gradle está em 16/1.5.1). Foram actualizados com o histórico à vista. **A suíte frontend fica 100% verde** pela 1.ª vez desde o UTAC151.
- ⚠️ O efeito só aparece **no próximo build nativo** (AAB/iOS). Na web não muda nada. Hoje o catálogo `produtos` de produção está vazio, logo não há imagens externas para observar (validador ℹ️3).

## SEG4 — validador adversarial: **APROVADO COM RESSALVAS**, 0 bloqueantes
Relatório em `_logs/UTAC154_SEG4_VALIDADOR.md`.
- ⚠️1, faltava a suíte completa no estado commitado: corrida em `aa7917e`, 1421/1473 com 0 falhas.
- ⚠️2, a justificação «CSP exige same-origin» estava imprecisa: o comentário e o SEG-1 foram corrigidos (`aa7917e`).
- ℹ️1–6 são notas. Destaque: o CDN ignora a caixa no `Vary: Origin`, o que não é explorável, porque um browser manda sempre a origem em minúsculas.

## Estado do git
- `origin/main` = `23db996` (publicado e deployado).
- Locais **sem push**: `3b9bc34`, `aa7917e` e o commit de docs. Ficam para validares; o push não dispara deploy (`[skip netlify]`), o próximo deploy manual leva-os.

## Pendências
DEBT-118 (Sign in with Apple), DEBT-119 (sem compra no iOS), DEBT-120 (a)(b)(c)(e)(f). Os worktrees dos 3 validadores ficaram em `.claude/worktrees/`.
