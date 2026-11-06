# UTAC132 — SEG-1 · Medição (PIX/Saldo build-time, Splash, AAB v9)

Opus 5.5 · 2026-11-06 · tipo `publicacao` + `produto` · baseline medida `3f00660` (o enunciado diz `eae7654`).

## Estado medido
| # | Premissa do enunciado | Medido |
|---|---|---|
| 1 | HEAD `eae7654` | **`3f00660`**: depois vieram o UTAC130 (`f3a86a3`, `cdea860`, `94dc50d`) e o UTAC131 (assetlinks com a chave da Play, `ebad6dc`…`3f00660`) |
| 2 | Frente B: o Início precisa de «Carteira» e «Passe Desafio» | **Já está feito pelo UTAC130** (`Dashboard.jsx`: «Carteira» com pontos de lance, «Passe Desafio» com o total do inventário, tiles 3 e 4 iguais, sem «Saldo (R$)» em plataforma nenhuma). Nada a fazer além de verificar |
| 3 | A detecção em runtime falha no APK | O código **esconde** Saldo/PIX no APK (`pixPermitido(detectarPlataformaNativa())`, com 3 sinais: Capacitor, `window.Capacitor`/`androidBridge` e origem `https://localhost`). Mas as **strings estão no bundle**: `android/app/src/main/assets/public/assets/MinhaCarteira-CiLXhgIa.js` tem «Depositar PIX» ×2 e «Saldo Disponível» ×1. O grep do SEG3 falharia hoje |
| 4 | `.env.production` | **Não existe** (CLAUDE.md: removido; produção vem do dashboard do Netlify). ⚠️ Criar `.env.production` com `VITE_IS_ANDROID_APP=true` afecta **também o site**: o `netlify deploy --prod --build` corre o Vite em modo production e lê esse ficheiro, o que tira o PIX do PWA |
| 5 | Frente C: mudar o `parent` remove o ícone | `styles.xml` tem `android:background=@drawable/splash` (logo azul por omissão do Capacitor, fundo branco). Só mudar o `parent` mantém esse fundo. Com `targetSdk 36`, no **Android 12+ o sistema mostra sempre um splash com o ícone do launcher**, seja qual for o tema; para o esconder é preciso um `values-v31/styles.xml` com `windowSplashScreenAnimatedIcon` transparente. O plugin `@capacitor/splash-screen` **não está instalado**, por isso as opções `plugins.SplashScreen` do `capacitor.config` não fazem nada (e o config é `.ts`, não `.json`) |
| 6 | `ComprarFichasModal` | É importado estaticamente e renderizado sempre (`aberto={depositoPix && …}`), por isso o seu «💰 Depositar PIX» fica no bundle mesmo com a flag. Tem de passar a ser montado só fora do APK |
| 7 | A14 RAM ≥ 1 500 MB | **761 MB livres** de 5 877 MB. A excepção R18-130-4 era do UTAC130 |

## Proposta para a Frente A (não aplicada)
- Injectar `VITE_IS_ANDROID_APP=true` **só no `build:apk`** (variável de processo antes do `netlify build`), nunca num `.env*`.
- `depositoPix = import.meta.env.VITE_IS_ANDROID_APP !== "true" && pixPermitido(plataforma)` em `MinhaCarteira` e `BalaoComprarPasse`, mantendo a detecção em runtime como 2.ª camada. `ComprarFichasModal` montado só com `depositoPix`.
- O guarda `validar-dist-rede.mjs` (já ligado ao `preReleaseBuild` do Gradle) passa a recusar um bundle Android que contenha «Depositar PIX» ou «Saldo Disponível». Assim nenhum release sai com as strings, mesmo que alguém compile por outro caminho.
- Provar no artefacto: `vite build` com e sem a flag → as strings só desaparecem na versão com a flag.

## Veredicto: **AJUSTAR** — decisões do operador antes do SEG0 (itens 4, 5, 7 e o deploy web).

## Decisões do operador (R18, 2026-11-06)
- **R18-132-1** flag `VITE_IS_ANDROID_APP=true` **só no `build:apk`** (variável de processo); nunca num `.env*`. Runtime fica como 2.ª camada + guarda do Gradle recusa as strings.
- **R18-132-2** splash **completo**: `parent` → `AppTheme.NoActionBar`, sem fundo `@drawable/splash`, e `values-v31` com o ícone do splash transparente.
- **R18-132-3** RAM: fechar programas e compilar mesmo abaixo de 1 500 MB (excepção à A14, como no UTAC130).
- **R18-132-4** fecho: commits do UTAC132 + `netlify deploy --prod --build` (draft validado antes) + push para `main` com bypass.
