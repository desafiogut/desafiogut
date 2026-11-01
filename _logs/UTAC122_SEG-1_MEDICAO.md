# UTAC122 — SEG-1 · MEDIÇÃO

Tipo `diagnostico` · baseline do spec `7f8200e` · executor Opus 5.5 · 2026-11-01.
Nada foi alterado neste segmento.

## -1.1 Estado do repo
- `git log --oneline -3` → `7f8200e chore(UTAC120): versionCode 6…` · `6a77634` · `30e67e5`.
  **HEAD = baseline. Desvio: 0 commits.**
- `git status --short`: alterações pré-existentes alheias ao UTAC (`.agents/skills/aidesigner-frontend/*`,
  `.gitignore`, `.mcp.json`, `package-lock.json`, `_logs/MC100_*` não rastreados). Não tocadas (HI2).

## -1.2 Caminhos nomeados
| caminho | existe |
|---|---|
| `desafio-gut/frontend/src/components/AvisoRede.jsx` | sim (63 linhas) |
| `desafio-gut/frontend/src/lib/network.js` | sim (34 linhas) |
| `netlify.toml` (raiz do repo, `base = desafio-gut/frontend`) | sim |
| `desafio-gut/frontend/.env` | sim (738 B, gitignored) · `.env.production` **não existe** |
| `desafio-gut/frontend/scripts/validar-dist-rede.mjs` | sim |
| `android/app/build/outputs/bundle/release/app-release.aab` | sim, 32 422 956 B, 2026-10-30 18:05 |
| `C:\Users\Moltbot\Desktop\DesafioGUT-v6\DesafioGUT-v6.aab` | sim, SHA-256 `595b9daaac575bdf9861…` = idem ao do Gradle |

## -1.3 Fontes
- Busca `Sepolia|Ambiente de teste|contrato não configurado|não são os reais` em `src/` → o texto
  do aviso só existe em `src/components/AvisoRede.jsx:60`; montado uma vez em `src/App.jsx:424`.
- Módulo de config de rede único: `src/lib/network.js` (MC59.2).
- Guarda de bundle: `scripts/validar-dist-rede.mjs` (MC88.25), chamado só por `npm run build:apk`.
- Logs de build dos AAB anteriores: `_logs/UTAC110l_AAB_REPORT.md:70-72`, `_logs/UTAC119_CORRECAO_BILLING.md:47-48`.
- `_logs/DEBT.md` lido (último ID `DEBT-080`); DEBT-061 relacionado (build sem `VITE_*` cai no fallback).

## -1.4 Medições específicas
1. **Bundle do AAB v6** = `android/app/src/main/assets/public/` (index.html 2026-10-30 18:04, 1 min antes
   do AAB). `cmp` do chunk `PrivyRoot-CJy97-gi.js` com `dist/` → idêntico.
2. **Objecto `import.meta.env` embutido** (chunk `web3-kb1zal2c.js`, `Dd={…}`):
   `BASE_URL, DEV:false, MODE:production, PROD:true, SSR:false, VITE_NETWORK_STAGE:"mainnet"` — **e mais nada**.
   Nenhuma `VITE_CHAIN_ID`, `VITE_CONTRATO_SEPOLIA`, `VITE_ALCHEMY_URL`, `VITE_SUPABASE_*`, `VITE_SENTRY_DSN`.
3. **Constantes resolvidas no AvisoRede compilado**: `Wn=1` (CHAIN_MAINNET), `Un="mainnet"` (STAGE),
   `Gn="0x59a7…f6d5"` (lista negra); `j` = `Number(Dd.VITE_CHAIN_ID ?? 11155111)` → **11155111**; `M` = `""`.
4. **Guarda contra o bundle v6**: `node scripts/validar-dist-rede.mjs android/app/src/main/assets/public` →
   **exit 1, «BUNDLE REJEITADO»**: (1) `VITE_CONTRATO_SEPOLIA ausente`, (2) `VITE_CHAIN_ID ausente`.
   Controlo positivo do medidor: o mesmo script **detectou** `VITE_NETWORK_STAGE: mainnet` (a única
   variável presente) ⇒ lê correctamente valores embutidos; os «AUSENTE» são reais.
5. **Netlify, contexto `production`** (`netlify env:get … --context production`; segredos não impressos):
   `VITE_CHAIN_ID=1` · `VITE_NETWORK_STAGE=mainnet` · `VITE_EXPLORER_URL=https://etherscan.io` ·
   `VITE_CONTRATO_SEPOLIA=0x0052477A8CA81BCAF4a60e21e635F9e00a5d16cd` · `VITE_ALCHEMY_URL` host `eth-mainnet.g.alchemy.com`
   · `VITE_SUPABASE_URL/ANON_KEY` presentes. Scopes (`netlify api getEnvVars`): todas com `builds`.
6. `.env` local (só chaves de rede, valores não secretos): **apenas** `VITE_NETWORK_STAGE=mainnet`.
7. Scripts: `build` = `vite build` · `build:apk` = `netlify build --context production && npm run validar:dist && npx cap sync android`.

## -1.5 Disco · RAM
- `df -h /c` → **9,6 GB livres** (≥ 5 GB ✓).
- RAM livre: **366 MB / 387 MB** (de 5 877 MB) — **abaixo do portão A14 (1 500 MB)**.
  ⚠️ Desvio declarado: A14 protege builds/suítes; este UTAC é só `grep`/`cat`/`node` de um script de
  leitura (sem build, sem suíte, sem Gradle). Prossegui. **O UTAC123 (que compila) NÃO pode arrancar
  com esta RAM.**

## ⚠️ Conflitos entre o enunciado e o medido (R20 — não resolvidos pelo executor)
1. O enunciado propõe, em alternativa, «remover o aviso quando chainId=1 ou contrato configurado».
   **Essa já é a lógica actual** (`AvisoRede.jsx:28-31`). O aviso não é falso-positivo: o bundle v6
   está mesmo em Sepolia e sem contrato. Alterar a UI esconderia um defeito real. → proposta: **não mexer**.
2. O enunciado sugere «configurar a env var no Netlify (escopo builds)». **Já está configurada e
   correcta** (-1.4 §5). → proposta: **nenhuma alteração de env**.
3. Segmentos: o enunciado chama «SEG3 (Fecho)»; o tipo `diagnostico` exige validador adversarial.
   → SEG3 = validador, SEG6 = fecho (spec, `ressalvas`).

## -1.7 Veredito
**SEGUIR** (só leitura; conflitos 1-2 são conclusões do diagnóstico, não bloqueiam a medição).
