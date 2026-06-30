# Plan 002: Empacotar o DESAFIOGUT como app Android (Capacitor/AAB) e submeter à Google Play Store

> **Executor instructions**: Siga passo a passo, confirmando cada verificação. Passos
> `[OPERADOR]` exigem contas/segredos/console externos (Google Play Console, keystore,
> conta Privy) — um agente prepara/valida mas não executa. Se uma "STOP condition"
> ocorrer, pare e reporte. Ao terminar, atualize a linha em `plans/README.md`.
>
> **Drift check (rode primeiro)**: `git diff --stat e842d4b..HEAD -- desafio-gut/frontend/package.json desafio-gut/frontend/vite.config.js desafio-gut/frontend/src/hooks/useRecursosApp.js`
> Se mudou, reconcilie os excertos de "Current state" antes de prosseguir.

## Status
- **Priority**: P2 (canal de distribuição; pode correr em paralelo ao MC40, mas o app só deve apontar para mainnet DEPOIS do Plan 001)
- **Effort**: L (greenfield Android + closed testing de 14 dias imposto pelo Google)
- **Risk**: MED (rejeição na revisão é comum; sem risco on-chain)
- **Depends on**: Plan 001 para o **build de produção apontar para mainnet** (o closed testing pode começar apontando para Sepolia/staging)
- **Category**: dx / direction (novo canal)
- **Planned at**: commit `e842d4b`, 2026-06-30

## Why this matters
O DESAFIOGUT é hoje uma PWA (Vite/React) servida no Netlify. Para distribuição Android
na Play Store é preciso um pacote nativo (AAB). Não existe projeto Android no repo. O
código já antecipa um wrapper nativo: `useRecursosApp.js` lê `window.GUT_NATIVE.platform`
para o "modo loja" (entrega híbrida). Este plano cria o wrapper (Capacitor — embrulha a
build web existente, permite injetar o marcador `GUT_NATIVE` e gerar AAB) e leva à submissão.

## Current state
- **Não há** diretório `android/` nem `capacitor.config.*` no repo (confirmado na recon). É greenfield.
- A web app vive em `desafio-gut/frontend/` (Vite + React 18). Build: `npm run build` → `desafio-gut/frontend/dist/` (raiz: `desafio-gut/frontend/package.json` script `"build": "vite build"`).
- `desafio-gut/frontend/src/hooks/useRecursosApp.js` — `detectarPlataforma()` classifica a plataforma; usa `window.GUT_NATIVE?.platform` (marcador do wrapper nativo) e `?plataforma=` override. No "modo loja" (nativo) o leilão pode ficar oculto (entrega híbrida — ver `cloud.md` MC29.1). O wrapper Android DEVE injetar `window.GUT_NATIVE = { platform: "android" }` antes do bundle.
- Auth/wallet via Privy (embedded wallet) — exige `VITE_PRIVY_APP_ID` e domínios/origem permitidos no painel Privy (incluir o esquema do WebView/app).

## Commands you will need
| Purpose | Command | Expected |
|---|---|---|
| Build web | `cd desafio-gut/frontend && npm run build` | `dist/` gerado, exit 0 |
| Add Capacitor | `npm i -D @capacitor/cli && npm i @capacitor/core @capacitor/android` | instalado |
| Init Capacitor | `npx cap init DESAFIOGUT com.grupouniaoetrabalho.desafiogut --web-dir dist` | cria `capacitor.config.ts` |
| Add Android | `npx cap add android` | cria `android/` |
| Sync | `npx cap sync android` | copia `dist/` p/ o WebView |
| Build AAB | `cd android && ./gradlew bundleRelease` | `android/app/build/outputs/bundle/release/app-release.aab` |
| Keystore | `keytool -genkey -v -keystore desafiogut-release.jks -alias desafiogut -keyalg RSA -keysize 2048 -validity 10000` | gera `.jks` |

## Scope
**In scope** (novos arquivos — wrapper):
- `desafio-gut/frontend/capacitor.config.ts` (criar)
- `desafio-gut/frontend/android/**` (gerado por `cap add android`)
- `desafio-gut/frontend/index.html` — injetar o marcador `GUT_NATIVE` SOMENTE quando empacotado (ver Step 3; preferir injeção via Capacitor para não afetar a PWA web).
- `plans/README.md` — status.

**Out of scope** (NÃO tocar):
- Lógica de negócio React (`src/**`) — o wrapper só embrulha a build existente.
- `netlify.toml` / deploy web — a PWA continua no Netlify, inalterada.
- O contrato / backend — Android é só apresentação.

## Git workflow
- Branch: `feat/playstore`. Commits conventional. NÃO commitar o keystore nem senhas (R9) —
  adicionar `*.jks`, `keystore.properties` ao `.gitignore`. Push/PR só com instrução do operador.

## Steps

### Step 1 — Gerar a build web e adicionar Capacitor
`cd desafio-gut/frontend && npm run build` (gera `dist/`). Depois adicionar Capacitor (comandos acima) e `npx cap init` com appId `com.grupouniaoetrabalho.desafiogut` e `--web-dir dist`.

**Verify**: existe `capacitor.config.ts` com `webDir: 'dist'` e `appId` correto; `ls dist/index.html` ok.

### Step 2 — Adicionar a plataforma Android e sincronizar
`npx cap add android` → `npx cap sync android`.

**Verify**: existe `android/app/build.gradle`; `android/app/src/main/assets/public/index.html` (cópia da build) presente.

### Step 3 — Injetar o marcador `GUT_NATIVE` (modo loja)
Garantir que, no app, `window.GUT_NATIVE = { platform: "android" }` exista ANTES do bundle React
(o `useRecursosApp.js` lê isso). Opção robusta: um pequeno script no `index.html` condicionado ao
Capacitor (ex.: `if (window.Capacitor) window.GUT_NATIVE = { platform: 'android' }`) — assim a PWA
web NÃO é afetada. Confirmar com o consumidor em `src/hooks/useRecursosApp.js`.

**Verify**: rodar o app no emulador (`npx cap run android`) e no console do WebView `window.GUT_NATIVE.platform` === `"android"`; a UI entra no modo loja esperado (leilão conforme `recursos_app`).

### Step 4 — `[OPERADOR]` Keystore de assinatura (upload key)
Gerar o keystore (comando `keytool` acima), guardar `desafiogut-release.jks` + senhas em local seguro
(NÃO no repo — R9). Configurar `android/keystore.properties` (gitignored) e o `signingConfig` no
`android/app/build.gradle`. **Perder o keystore = perder a capacidade de atualizar o app** → backup seguro.

**Verify**: `./gradlew bundleRelease` produz um AAB assinado; `jarsigner -verify` ok. (Recomendado: ativar **Play App Signing** no Console — o Google guarda a chave de assinatura final; este `.jks` vira a upload key.)

### Step 5 — Build do AAB de release (targetSdk ≥ 36)
No `android/app/build.gradle`, garantir `targetSdkVersion 36` (exigência Google 2025) e um
`versionCode`/`versionName` iniciais. `cd android && ./gradlew bundleRelease`.

**Verify**: existe `android/app/build/outputs/bundle/release/app-release.aab`; `bundletool` ou o Console aceitam o pacote; `targetSdkVersion 36` confirmado no gradle.

### Step 6 — `[OPERADOR]` Ficha da Play Store + políticas
No Google Play Console (conta de desenvolvedor): criar o app; preencher:
- Ícone 512×512, feature graphic, screenshots (telefone), descrição curta/longa.
- **Política de privacidade** (URL pública — já existe iubenda em `cloud.md`/footer: `https://www.iubenda.com/privacy-policy/DESAFIOGUT`).
- **Data safety form**: declarar coleta (email via Privy, endereço de carteira, dados de pagamento PIX via Mercado Pago) e finalidade; marcar criptografia em trânsito.
- **Funcionalidades financeiras/Web3**: declarar que o app envolve leilão pago (senhas R$2) e wallet — atender às políticas de "real-money/financial" e crypto wallet do Google (a carteira é embedded/custodial-light via Privy; descrever claramente).
- **Credenciais de demonstração** para a revisão: um login de teste (email Privy de demo) com saldo de senhas, para o revisor conseguir entrar (a app é auth-gated — ver memória MC39.3.1).

**Verify**: cada secção do Console marcada "completa"; a ficha não tem avisos pendentes.

### Step 7 — `[OPERADOR]` Closed testing (12 testadores, 14 dias)
Contas de desenvolvedor pessoais novas exigem **closed testing com ≥12 testadores por ≥14 dias**
antes de poder pedir produção. Criar uma faixa de closed testing, subir o AAB, convidar ≥12 testadores,
manter por 14 dias. (O closed testing pode apontar para staging/Sepolia; o build de PRODUÇÃO deve
apontar mainnet — depende do **Plan 001**.)

**Verify**: Console mostra ≥12 testadores opt-in e o relógio de 14 dias correndo; feedback coletado.

### Step 8 — Submissão para produção
Após os 14 dias + correções de feedback: solicitar acesso a produção, subir o AAB final (apontando
mainnet, pós-Plan 001), responder ao questionário de conteúdo, e enviar para revisão.

**Verify**: status "Em revisão" → "Publicado". Registrar a data e a versão.

## Test plan
- Emulador + ≥1 dispositivo físico: login Privy, ver saldo, fluxo de compra de senha (staging), navegação (Sidebar/BottomNav), chatbot.
- Verificar deep-links/origem permitidos no painel Privy para o esquema do app.
- Smoke de pagamento PIX em staging (Mercado Pago test) antes do build de produção.

## Done criteria (ALL must hold)
- [ ] AAB assinado gerado (`app-release.aab`) com `targetSdkVersion 36`.
- [ ] `window.GUT_NATIVE.platform === "android"` confirmado no WebView do app.
- [ ] Keystore guardado com backup seguro e FORA do repo (`git status` limpo de `.jks`).
- [ ] Ficha Play Console completa (privacidade, data safety, financeiro/Web3, screenshots, ícone 512).
- [ ] Credenciais de demo fornecidas ao revisor.
- [ ] Closed testing: ≥12 testadores por ≥14 dias concluído.
- [ ] Build de produção aponta mainnet (após Plan 001) antes do envio final.
- [ ] `plans/README.md` status row atualizado.

## STOP conditions
- Política do Google bloqueia o app por categoria financeira/crypto → reavaliar enquadramento antes de reenviar.
- O build de produção apontaria mainnet mas o Plan 001 não está concluído → NÃO submeter produção (submeter só closed testing/staging).
- Keystore perdido/comprometido antes da publicação → gerar novo e reconfigurar (antes de qualquer release público).
- A injeção do `GUT_NATIVE` quebra a PWA web → reverter a abordagem (condicionar a `window.Capacitor`).

## Maintenance notes
- Cada release exige bump de `versionCode`. Com **Play App Signing**, a upload key (`.jks`) é só para upload; a chave final fica no Google.
- Se o modelo de entrega híbrida mudar (leilão visível no app), revisar `useRecursosApp.js` + as políticas declaradas (passa a "real-money gaming").
- Revisor do PR: garantir que nenhum segredo/keystore foi commitado e que o appId/targetSdk batem com o Console.
- Alternativa a Capacitor: TWA (Trusted Web Activity / Bubblewrap) se preferirem servir direto a PWA — mais simples, mas perde a injeção fácil do `GUT_NATIVE` e o controlo do WebView; decisão de arquitetura do operador.
