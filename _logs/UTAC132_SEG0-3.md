# UTAC132 — SEG0..SEG3 · corte de build, splash, AAB v9, validação

Opus 5.5 · 2026-11-06 · baseline `3f00660`.

## SEG0 — Frente A (R18-132-1)
| Ficheiro | Mudança |
|---|---|
| `src/pages/MinhaCarteira.jsx` | `const APK_BUILD = import.meta.env.VITE_IS_ANDROID_APP === "true"`; `depositoPix = !APK_BUILD && pixPermitido(plataformaNativa)`; `ComprarFichasModal` montado só com `{depositoPix && …}` |
| `src/components/BalaoComprarPasse.jsx` | `depositoPix` também corta pela flag |
| `package.json` | `build:apk`: `set VITE_IS_ANDROID_APP=true&& netlify build …` (variável de processo; nenhum `.env*`) |
| `scripts/validar-dist-rede.mjs` | verificação 5: exige `VITE_IS_ANDROID_APP=true` embutida E nenhuma ocorrência de «Depositar PIX»/«Saldo Disponível» no bundle. Corre no `build:apk` e no `preReleaseBuild` do Gradle (UTAC123) |
| Frente B | **sem alteração**: já feita pelo UTAC130 (`f3a86a3`/`cdea860`) |

**Prova no artefacto (`vite build` para pastas temporárias):**
| Build | «Depositar PIX» | «Saldo Disponível» | «Deposite via PIX» |
|---|---|---|---|
| com `VITE_IS_ANDROID_APP=true` | 0 | 0 | 0 |
| sem a flag (= site; controlo positivo) | 2 (`MinhaCarteira`) | 1 | 2 (`MinhaCarteira`, `palpite`) |
| com a flag + mutante M2 (modal montado sempre) | **1** (título do modal) | 0 | — |
⇒ o embrulho do `ComprarFichasModal` é necessário: sem ele o módulo fica no bundle do APK.

## SEG1 — Frente C (R18-132-2)
- `values/styles.xml`: `AppTheme.NoActionBarLaunch` com `parent="AppTheme.NoActionBar"` e `windowBackground #050818` (saiu o `@drawable/splash`).
- **novo** `values-v31/styles.xml`: igual + `windowSplashScreenBackground #050818` + `windowSplashScreenAnimatedIcon @android:color/transparent` (no Android 12+ o splash do sistema não mostra ícone).
- `capacitor.config`: sem alteração (o plugin `@capacitor/splash-screen` não está instalado; o ficheiro é `.ts`).
- `core-splashscreen` continua nas dependências (inerte, já não é referenciado pelo tema). Fica assim por escopo.

## SEG2 — Frente D
- `android/app/build.gradle`: `versionCode 9`.
- Testes: `utac123-build-blindado` (fixture com a flag; versionCode 9) e `utac111-carteira-sem-pix-apk` (contrato do `depositoPix`) actualizados; **novo** `utac132-apk-sem-pix-build.test.mjs` (15 testes).
- **Mutação 9/9 RED**, md5 restaurado em todos: M1 sem corte na Carteira (2) · M2 modal sempre montado (1) · M3 balão sem corte (1) · M4 guarda sem strings (2) · M5 guarda sem flag (2) · M6 build:apk sem flag (1) · M7 parent antigo (1) · M8 ícone no v31 (1) · M9 versionCode 8 (2).
- **Suíte: frontend 1318/1318 · backend 1456/1462 VERDE** (eram 1303 · 1456/1462).
- RAM: 761 MB → 1 089 MB livres depois de fechar o Edge e as WebView2 (excepção à A14, R18-132-3).
- `npm run build:apk` exit 0: «VITE_IS_ANDROID_APP : true», «strings PIX/Saldo no APK : nenhuma», «✓ bundle coerente com PRODUÇÃO (mainnet)», `cap sync` OK.
- `gradlew bundleRelease` (JDK 21 jbr): `validarAmbienteProducao` com as linhas novas · **BUILD SUCCESSFUL in 50s**.

## SEG3 — validação do `.aab` (extraído)
`C:\Users\Moltbot\Desktop\DesafioGUT-v9\DesafioGUT-v9.aab` · 32 438 269 B · SHA-256 `f258d0c7b0d3693d8c24e312c2dd8c9d9ba5c231770d9543307fbfb7e1c1ad42`
| Verificação | Resultado |
|---|---|
| `grep -rl "Depositar PIX\|Saldo Disponível"` no AAB inteiro | **nenhum ficheiro** (controlo positivo: «Comprar Passe Desafio» está em `MinhaCarteira-B34ZEVdf.js`) |
| guarda sobre `base/assets/public` extraído | exit 0 (mainnet, contrato `0x0052477A…16cd`, Supabase, flag `true`, sem strings) |
| `bundletool dump manifest` versionCode | **9** |
| `bundletool dump resources` `AppTheme.NoActionBarLaunch` | default `[#050818]` · sdk 31 `[#050818, #050818, @android:color/transparent]` |
| certificado | SHA-256 `85:44:BC:E8…17:29` = **igual ao do v8** · `jar verified.` |

**Ainda há PIX no AAB, mas é legítimo ou está fora do escopo:** texto legal (Regulamento/Privacidade), ecrãs de admin («Receita PIX»), pagamento do **produto físico** («Pagar Produto via PIX», «O código PIX expirou»), ícones do SDK do Privy. E também «Saldo R$ insuficiente. Recarregue via PIX.» (`CardLance`), que é da **DEBT-088** e não está nas duas strings do enunciado.

⚠️ **Não observado no aparelho:** o splash sem ícone e a Carteira sem Saldo/PIX foram provados pelos recursos e pelo bundle do AAB, não num telemóvel.
