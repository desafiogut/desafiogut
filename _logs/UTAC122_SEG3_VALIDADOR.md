# UTAC122 — SEG3 · VALIDADOR ADVERSARIAL (independente, só leitura)

Validador Opus 5.5 · 2026-11-01 · baseline `7f8200e`. Objectivo: refutar o diagnóstico do executor.
Nenhum ficheiro alterado além deste. Sem build, sem cap sync, sem gradle, sem escrita no Netlify.
Extracção de leitura do AAB para o scratchpad da sessão (fora do repo).

## Veredicto: **APROVADO COM RESSALVAS**

A causa raiz resiste a todos os ataques. A origem, os valores embutidos e o caminho de correcção
confirmam-se no **próprio AAB**, e não só na pasta. As ressalvas são de âmbito e de endurecimento:
nenhuma inverte a conclusão.

## Ataques e resultado

| # | alegação do executor | ataque | resultado |
|---|---|---|---|
| 1 | Pílula só vem de `AvisoRede.jsx` (montado em `App.jsx:424`), condição `:26-33` | `grep -rnE 'Ambiente de teste\|não são os reais\|saldos aqui' src public index.html` | **confirmado**: único texto em `AvisoRede.jsx:60`; único `<AvisoRede />` em `App.jsx:424`. A outra ocorrência de «não configurado» (`utils/web3.js:202`) é um `throw`, não UI. No bundle só aparece em `PrivyRoot-CJy97-gi.js`. Linhas 28/30 ↔ «rede Sepolia · contrato não configurado»: casa |
| 2 | Bundle v6 só tem `VITE_NETWORK_STAGE` | AAB ≠ pasta? `sha256sum` Desktop v6 vs `bundle/release/app-release.aab` → ambos `595b9daa…1be67`. `unzip` de `base/assets/public/assets/*` do **AAB** → 129 `.js`, `diff -rq` com `android/app/src/main/assets/public/assets` sem ficheiros diferentes | **confirmado no AAB**: objecto embutido `{BASE_URL,DEV:!1,MODE:\`production\`,PROD:!0,SSR:!1,VITE_NETWORK_STAGE:\`mainnet\`}`; `validar-dist-rede.mjs <AAB extraído>` → exit 1 (CONTRATO, CHAIN_ID ausentes) |
| 3 | Causa = `npm run build` (Vite + `.env` do disco) e não `build:apk` | `.env` (só nomes de chaves): só `VITE_NETWORK_STAGE=`; não existe `.env.production`. Netlify `production`: `VITE_CHAIN_ID=1`, `VITE_NETWORK_STAGE=mainnet`, `VITE_CONTRATO_SEPOLIA=0x0052477A…16cd` (re-medido por mim) | **confirmado**. Controlo positivo histórico: `_logs/UTAC110i.2_SEG2_build.txt:1373-1395`: um `build:apk` real → `Netlify Build completed in 4m 11s` → validador `CHAIN_ID 1`, contrato `0x0052…`, RPC mainnet, `✓` → `cap sync` «Copying web assets from dist to android\app\src\main\assets\public». Sem passo de deploy no log |
| 4 | Lógica do aviso correcta; sem mudança de código nem de env | ler `AvisoRede.jsx`, `network.js` | **confirmado**: o aviso detecta um defeito real. Escondê-lo seria errado |
| 5 | Consequências além do cosmético | `CardLance.jsx:39,168,327` (`SEPOLIA_CHAIN_ID = CHAIN_ID_DEC` → switchChain 11155111); `useResultadoEspecial.js:20` `new Contract(CONTRATO_SEPOLIA, …)`; `sentryLazy.js:81` `enabled: Boolean(SENTRY_DSN)`; `useRecursosApp.js:127` `supabaseConfigurado()` | **confirmado**, mas incompleto (ver ⚠️2, ℹ️1) |

`build:apk` (`package.json:13`) = `cd ../.. && netlify build --context production && … validar:dist && npx cap sync android`.
`netlify build` corre na raiz (onde estão `netlify.toml` e o link `.netlify/state.json` com `siteId`) e
executa o `command` do `[build]` com o env do contexto. Não publica nada: `netlify.toml` não tem `[[plugins]]`,
e publicar é `netlify deploy`. `capacitor.config.ts:6` `webDir: 'dist'`. `build.gradle:27` = `versionCode 6`: a linha bate certo.

## Achados

⚠️ **1. O defeito não é do v6: v3, v4 e v5 tinham o mesmo bundle.** `unzip -p DesafioGUT-v{3,4,5}.aab
'base/assets/public/assets/web3-*.js'` → os três trazem o mesmo objecto, só com `VITE_NETWORK_STAGE`.
O diagnóstico fala do «AAB v6» como se o defeito fosse dele. Na verdade, **todos os AAB do teste fechado que
estão no Desktop** correram em Sepolia, sem contrato, sem Supabase e sem Sentry. Consequências:
(a) qualquer feedback de testadores sobre saldo, lance ou resultado on-chain dessas versões não vale como
prova de produção; (b) o UTAC123 será o **primeiro** AAB com o env de produção, logo não é «só reconstruir»:
é a primeira vez que o APK corre os caminhos de produção (ver ⚠️2). O relatório tem de dizer isto ao operador.

⚠️ **2. O v7 muda de caminho de config (DEBT-061), um risco de regressão que o plano não cobre.** Com
`VITE_SUPABASE_*` injectadas, o APK passa a ler `recursos_app` do Supabase (`config_remota`) em vez do
Blob/função (`useRecursosApp.js:125-127`; `_logs/DEBT.md:240` DEBT-061: «DUAS cópias vivas… sem mecanismo
que propague»). O v4-v6 (Billing/Passes) foi validado **só** pelo caminho do Blob. O passo 6 do plano
(«passes continuam a creditar») só apanha o problema depois de compilar. **Pedido:** acrescentar ao UTAC123,
**antes** do Gradle, uma comparação de leitura entre `config_remota.recursos_app` e o Blob `config-experiencia`
(flags/chaves Android), parando se divergirem. O Realtime (`useRealtimeConfig.js:110`) também passa a ligar-se.

⚠️ **3. O guarda tem um buraco: aceita um bundle sem `VITE_ALCHEMY_URL`.** `validar-dist-rede.mjs:75-77,111-124`:
um RPC ausente (`redeRpc=null`) nunca dá erro. Mas `utils/web3.js:122-124` faz fallback para um URL
**Alchemy Sepolia hardcoded**. Um bundle com `CHAIN_ID=1` e contrato mainnet mas sem RPC **passa** o guarda e lê
o contrato mainnet num nó Sepolia. Também não verifica `VITE_SUPABASE_*` nem `VITE_SENTRY_DSN`. Se o H1 for
aprovado, deve vir com «RPC ausente = erro» (e Supabase/Sentry ausentes = erro); senão, o H1 torna obrigatório
um guarda incompleto.

ℹ️ 1. Consequência por declarar no v6: sem `VITE_ALCHEMY_URL`, o `getProvider()` usa o nó Alchemy **Sepolia**
(`web3.js:122-124`). As leituras não «falham» apenas: vão para a rede errada (com `CONTRATO=""`, `new Contract("")`
rebenta). Nota lateral pré-existente: há uma chave Alchemy literal no código-fonte (`web3.js:124`). Não a
reproduzo aqui. Fora do âmbito, mas convém rodá-la ou retirá-la.

ℹ️ 2. O passo 3 do plano verifica a pasta `assets/public`, não o artefacto. Acrescentar ao passo 5:
`unzip -oq DesafioGUT-v7.aab 'base/assets/public/assets/*' -d <tmp>` + `node scripts/validar-dist-rede.mjs <tmp>/base/assets/public`
→ exit 0. Foi isto que usei aqui, e prova o que vai mesmo para a Play.

ℹ️ 3. Efeitos colaterais do `build:apk` a declarar no UTAC123: o `command` do `netlify.toml` corre
`npm install --legacy-peer-deps` (×2, frontend e functions). Pode reescrever `package-lock.json`, **já modificado**
na árvore (pré-existente, alheio). Também empacota todas as functions (~4 min). Com RAM < 1,5 GB, o risco é real
(o executor já o declarou). Pedido: registar o `git diff --stat` antes e depois, e não commitar o lockfile no UTAC123.

ℹ️ 4. Os caminhos do plano são relativos a `desafio-gut/frontend` (`android/…`, `scripts/…`), mas `netlify.toml` está
na raiz. A estrutura real é `desafio-gut/frontend/android/` (não existe `android/` na raiz). Para não haver
ambiguidade, escrever os caminhos absolutos ou a partir da raiz do repo no UTAC123. O H1
(`node ../../scripts/validar-dist-rede.mjs src/main/assets/public` com `workingDir` = `android/app`) resolve
correctamente para `desafio-gut/frontend/scripts`.

ℹ️ 5. A «lição invertida» (UTAC110l:70-72, UTAC119:47-48) confirma-se: `validar-dist-rede.mjs:6-12` já documenta
este mesmo incidente (MC88.22-24). H2 é necessário, não opcional, porque é a terceira recorrência.

ℹ️ 6. H3 confirmado: `PrivyRoot.jsx:249` `defaultChain: sepoliaChain` (literal). Não causa a pílula.

## Integridade do executor
`git status --short`: só alterações pré-existentes (`.agents/skills/aidesigner-frontend/*`, `.gitignore`, `.mcp.json`,
`package-lock.json`) e ficheiros não rastreados. Entre os novos, só os `_logs/UTAC122*` (2026-11-01 15:24-15:25).
Os outros não rastreados (`closed-testing/*`, `_logs/MC10x_*`, `scripts/utac112-prova-mutacao.mjs` de 2026-10-24)
são anteriores ao UTAC122. `git log -1` = `7f8200e`. **Nada tocado fora de `_logs`.**
