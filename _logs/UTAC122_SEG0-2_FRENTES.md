# UTAC122 — SEG0 / SEG1 / SEG2 · Frentes A, B, C

Só leitura. Zero alterações em fontes (A/B de ficheiros: `git status` igual ao do SEG-1 nas fontes).

---

## SEG0 · FRENTE A — Origem do aviso

**Componente:** `desafio-gut/frontend/src/components/AvisoRede.jsx` (MC88.25), montado globalmente em
`src/App.jsx:424` (`<AvisoRede />`, pílula fixa no fundo — por isso aparece na Carteira e em todo o lado).

**Texto:** `AvisoRede.jsx:60` — `⚠️ Ambiente de teste — {problemas.join(" · ")}. Os saldos aqui não são os reais.`

**Condição** (`AvisoRede.jsx:26-33`, função `diagnosticar()`), mostra-se se QUALQUER um falhar:
| linha | teste | no AAB v6 |
|---|---|---|
| 28 | `CHAIN_ID_DEC !== 1` → «rede Sepolia» | **falha**: 11155111 |
| 29 | `VITE_NETWORK_STAGE` presente e ≠ `mainnet` | ok (`mainnet`) |
| 30 | `!CONTRATO` → «contrato não configurado» | **falha**: `""` |
| 31 | `CONTRATO == 0x59a7…f6d5` → «contrato abandonado» | n/a |

**De onde vêm os valores:** `src/lib/network.js`
- `:19` `CONTRATO = VITE_CONTRATO_SEPOLIA ?? VITE_CONTRATO ?? ""` — **sem fallback** (desenho MC59.2).
- `:22-25` `CHAIN_ID_DEC = Number(VITE_CHAIN_ID ?? 11155111)` — **default Sepolia**.

**Tipo de causa (das 4 que o enunciado lista):** é variável de ambiente `VITE_*` embutida no build —
não é `chainId` lido da carteira, não é `import.meta.env.PROD` (o bundle tem `PROD:true`), não é fallback
por contrato não encontrado on-chain. O texto reproduz exactamente o que o utilizador vê
(«rede Sepolia · contrato não configurado»), o que confirma linhas 28 + 30 e exclui 29/31.

**O aviso está CERTO.** É um guarda deliberado («em produção não aparece nada; a ausência é o sinal de
que está tudo bem», `:11-14`). Não há defeito de lógica de UI para corrigir.

---

## SEG1 · FRENTE B — Variáveis de ambiente e build do AAB v6

### Variáveis de rede usadas pelo frontend (`grep -rhoE "VITE_[A-Z0-9_]+" src`)
`VITE_CHAIN_ID` (3) · `VITE_CONTRATO_SEPOLIA` (3) · `VITE_CONTRATO` (1) · `VITE_EXPLORER_URL` (3) ·
`VITE_NETWORK_STAGE` (2) · `VITE_ALCHEMY_URL` (1). Outras `VITE_*` relevantes: `VITE_SUPABASE_URL/ANON_KEY`,
`VITE_SENTRY_DSN`, `VITE_TIMEZONE`, `VITE_DURACAO_FLASH_SECONDS`, `VITE_PRIVY_APP_ID` (ignorada — o App ID
está hardcoded em `PrivyRoot.jsx`). `VITE_CONTRACT_ADDRESS`/`VITE_NETWORK` do enunciado **não são lidas** por `src/`.

### Três fontes, três estados
| fonte | `VITE_CHAIN_ID` | `VITE_CONTRATO_SEPOLIA` | `VITE_NETWORK_STAGE` | `VITE_ALCHEMY_URL` |
|---|---|---|---|---|
| Netlify `production` (scope `builds`) | `1` | `0x0052477A…16cd` | `mainnet` | eth-mainnet |
| `.env` local (disco) | — | — | `mainnet` | — |
| **bundle do AAB v6** (`Dd={…}` embutido) | **ausente → 11155111** | **ausente → ""** | `mainnet` | **ausente** |

O bundle do v6 é **exactamente** o `.env` do disco ⇒ foi compilado por **Vite puro** (`npm run build`),
que lê só os ficheiros `.env`. O `netlify build --context production` (dentro de `npm run build:apk`) é que
injecta o env do contexto — e esse está correcto.

### Prova de método
- Guarda do próprio repo contra o bundle v6: `node scripts/validar-dist-rede.mjs android/app/src/main/assets/public`
  → **exit 1 «BUNDLE REJEITADO»** (CONTRATO e CHAIN_ID ausentes). Se o AAB tivesse passado por `build:apk`,
  o build teria parado aqui e o AAB nunca existiria.
- Histórico escrito: `_logs/UTAC110l_AAB_REPORT.md:70-72` — o enunciado mandava `npm run build; npx cap sync;
  gradlew` e o `build:apk` «**não** foi usado, para não misturar deploy de produção». `_logs/UTAC119_CORRECAO_BILLING.md:47-48`:
  «correu `npm run build` … e não usou `build:apk` — o desvio histórico das v3/v4 **evitado**».
  **A lição está invertida.** `netlify build` compila localmente e **não publica** (publicar é `netlify deploy`).
  A memória do executor «APK: nunca `npm run build`» (MC89.27) diz o contrário do que o UTAC119 celebrou.
- AAB v6: `Desktop\DesafioGUT-v6\DesafioGUT-v6.aab` SHA-256 `595b9daa…` = artefacto do Gradle (2026-10-30 18:05),
  assets `public/` de 18:04 — o bundle inspeccionado é o do AAB entregue.

### `netlify.toml`
`[build] command = "npm install … && npm run build"`, `base = desafio-gut/frontend`. Não injecta `VITE_*` por
si — `[build.environment]` só tem `SECRETS_SCAN_OMIT_KEYS`. Para o site, o Netlify injecta o env do dashboard
no build remoto/`netlify build`; o `netlify.toml` **não precisa de alteração**.

### Não é só cosmético (consequências do mesmo bundle — «não assumir que é só ambiente»)
| sinal ausente | efeito no APK v6 |
|---|---|
| `VITE_CONTRATO_SEPOLIA` | `CONTRATO=""`: leituras on-chain (`useResultadoEspecial`, `useResultadoOficial`, saldo on-chain) e `enviarLance` falham |
| `VITE_CHAIN_ID` | `switchChain` vai para **Sepolia** (`CardLance.jsx:168/327` usa `CHAIN_ID_DEC`) |
| `VITE_SUPABASE_*` | `supabaseConfigurado()=false` ⇒ `recursos_app` cai no fallback do Blob (DEBT-061) |
| `VITE_SENTRY_DSN` | sem relatório de erros do APK (0 DSN `ingest…sentry.io/<id>` nos assets) |
O Billing/passes funcionam porque não dependem destas variáveis: Privy App ID e origem da API
(`src/lib/apiOrigin.js:33`) estão hardcoded.

---

## SEG2 · FRENTE C — Plano de correcção (para o UTAC123)

### Decisão: correcção de BUILD, não de código nem de env
- **Código do aviso: NÃO alterar.** A opção do enunciado «remover o aviso quando chainId=1 ou contrato
  configurado» já é a lógica actual; mexer esconderia um APK realmente partido.
- **Env Netlify: NÃO alterar.** Já está certa, contexto `production`, scope `builds`.
- **Correcção:** regenerar o AAB **pelo `npm run build:apk`**.

### UTAC123 — passos (tipo `publicacao`)
0. Pré-condições: RAM livre **≥ 1 500 MB** (hoje 366-387 MB → fechar processos/reiniciar antes);
   JDK 21 (memória do executor); `netlify status` ligado ao site; árvore sem alterações em `src/`.
1. `android/app/build.gradle:27` → `versionCode 7` (único ficheiro de código alterado; commit
   `chore(UTAC123): versionCode 7 …`).
2. `cd desafio-gut/frontend && npm run build:apk` (= `netlify build --context production` →
   `validar:dist` → `npx cap sync android`). **Não** usar `npm run build`. Se o `validar:dist` falhar, PARAR.
3. Verificar o bundle copiado (não só o `dist/`):
   `node scripts/validar-dist-rede.mjs android/app/src/main/assets/public` → exit 0, com
   `VITE_CONTRATO_SEPOLIA: 0x0052477A…16cd`, `VITE_ALCHEMY_URL: mainnet`, `VITE_CHAIN_ID: 1`, `VITE_NETWORK_STAGE: mainnet`.
4. `cd android && ./gradlew bundleRelease` (JAVA_HOME em caminho Windows).
5. Copiar para `Desktop\DesafioGUT-v7\DesafioGUT-v7.aab`; registar SHA-256, versionCode 7, `jarsigner -verify`.
6. Aceitação no aparelho (teste fechado): Carteira **sem** a pílula vermelha; passes continuam a creditar;
   pílula ausente em qualquer ecrã.

### Endurecimento recomendado (decisão do operador — opcional, pode ir no UTAC123 ou num próprio)
- **H1 (recomendado):** tornar o guarda inescapável no Gradle — tarefa `preBuild`/antes de `bundleRelease`
  em `android/app/build.gradle` que corre `node ../../scripts/validar-dist-rede.mjs src/main/assets/public`
  e falha o build. Assim, mesmo que um enunciado futuro mande `npm run build`, o AAB não sai.
- **H2:** corrigir os textos dos UTAC de AAB/skill (`types/publicacao.md`) para mandarem `npm run build:apk`
  e nunca `npm run build`.
- **H3 (baixa):** `PrivyRoot.jsx:249` fixa `defaultChain: sepoliaChain` independentemente do env — derivar de
  `CHAIN_ID_DEC`. Não causa o aviso (o `switchChain` usa o env), mas é o mesmo tipo de literal de rede.

### Ficheiros e variáveis — resumo
| o quê | acção |
|---|---|
| `src/components/AvisoRede.jsx` | nenhuma |
| `src/lib/network.js` | nenhuma |
| `netlify.toml` | nenhuma |
| env Netlify `production` | nenhuma (verificada) |
| `android/app/build.gradle` | `versionCode 7` (+ H1 se aprovado) |
| comando de build | `npm run build:apk` em vez de `npm run build` |
