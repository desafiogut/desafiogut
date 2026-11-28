# UTAC152: Preparação iOS (Capacitor) — RELATÓRIO FINAL

**Data:** 2026-11-27/28 · **Baseline:** `100159b` · **Tipo:** produto · **Executor:** Opus 5.5

**Commits (locais, ⛔ SEM push — R18-152-D):**
| Hash | Conteúdo |
|---|---|
| `f3d60d3` | feat: plataforma iOS (`npx cap add ios`, projecto Xcode com SPM) + `@capacitor/ios` 8.4.2 |
| `3b65151` | feat: PIX, recarga e site externo fora do iOS (runtime + build) |
| `ba90c1c` | fix: achados do validador SEG4 (Package.swift, `build:ios` multiplataforma, balão do Passe no iOS) |
| docs | este relatório + logs + DEBT-117..120 (hash em `git log -1 -- _logs/UTAC152-RELATORIO.md`) |

## Checklist de aceite (enunciado)
| | Item | Estado |
|---|---|---|
| ✅ | Pasta `ios` criada e sincronizada | `npx cap add ios` → projecto **SPM** (sem CocoaPods). `build:ios` → produção mainnet → guarda `--ios` ✓ → `cap sync ios` ✓ (1.ª corrida, EXIT 0) |
| ✅ | Relatório do Sign in with Apple | `_logs/UTAC152_FRENTE-B_SIGN-IN-WITH-APPLE.md` |
| ✅ | PIX escondido no iOS | Runtime + build (R18-152-B). O artefacto empacotado tem 0 frases proibidas |
| ✅ | Textos revistos | Varredura feita; só negações em texto legal (Art. 11/20), mantidas (R18-152-C). A UI já está guardada por `glossario.test.mjs` |
| ✅ | Log de alterações | Este ficheiro + `_logs/UTAC152_*` |

## SEG4 — validador adversarial: **APROVADO COM RESSALVAS**
Relatório completo em `_logs/UTAC152_SEG4_VALIDADOR.md`. Os 3 achados ⚠️ estavam certos e foram corrigidos em `ba90c1c`:
1. **`Package.swift` com «\»** (o `cap sync` no Windows) não compilava no SPM. Normalizador automático no fim do `build:ios`.
2. **`build:ios` só corria em cmd.exe.** Agora é um script Node, que funciona no Mac.
3. **O balão do Passe citava a Google Play no iOS.** Passou a mostrar um aviso neutro, com os botões desactivados.

⚠️ Estas correcções **não passaram por 2.ª validação**.

## Provas
- Suíte frontend completa (1466 testes, antes do SEG4): 3 falhas.
  - 1 era minha (regex do `utac111`) e está corrigida.
  - 2 são **pré-existentes** desde o `c74672b` (UTAC151, `versionCode 15` vs 16, DEBT-120d).
- Ficheiros afectados depois do SEG4: **125/126**. A única falha é a pré-existente.
- Mutação: **8/8** (corte do iOS) + **3/3** (correcções do SEG4), restauro md5 idêntico.
- Guarda `--ios` sobre `ios/App/App/public`: ✓. Controlo positivo (assets do APK): recusado. Guarda do APK: ✓ (Android intacto).
- ⚠️ **A 2.ª corrida do `build:ios` (já com o script novo) foi interrompida pelo Claude Code por falta de memória** no primeiro passo (`netlify build`). Não mexeu em nada.
  - O `ios/App/App/public` continua o da 1.ª corrida, validado, mas **ainda sem a correcção ⚠️3**.
  - Está no `.gitignore` e o Mac vai regerá-lo com `npm run build:ios`.
  - O script novo **nunca correu de ponta a ponta**.

## ⛔ Bloqueia o dia do Mac (por ordem)
1. **DEBT-117 — CORS** (backend): o iOS chama de `capacitor://localhost`. Sem esta correcção, nada da API funciona.
2. **DEBT-118 — Sign in with Apple** (painel com credenciais próprias, `loginMethods`, AASA, Associated Domains).
3. **DEBT-119 — sem compra no iOS** (não há IAP). A Apple permite PIX para o **produto físico** (3.1.3(e)), se o operador o quiser repor.
4. **DEBT-120 — resíduos**: PIX em texto legal e no ADM; links de convite; testes de `versionCode`; `PrivacyInfo.xcprivacy`; ícone e splash placeholder.

## No Mac
1. `npm install`
2. `npm run build:ios`
3. abrir `desafio-gut/frontend/ios/App/App.xcodeproj`
4. Signing (Team)
5. o Xcode resolve os pacotes SPM
6. simulador
7. TestFlight

**Nunca** `npm run build` + `cap sync`: o bundle sai em Sepolia.
