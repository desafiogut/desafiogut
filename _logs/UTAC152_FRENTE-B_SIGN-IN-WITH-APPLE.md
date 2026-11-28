# UTAC152 — Frente B: Sign in with Apple (relatório, sem código)

## 1. Porque é obrigatório
App Review **4.8 (Login Services)**: uma app que usa login social (Google) para a conta principal **tem de oferecer** também um login equivalente que:
- limite os dados a nome + e-mail;
- deixe o utilizador esconder o e-mail;
- não recolha interacções para publicidade sem consentimento.

O «Sign in with Apple» é a forma habitual de cumprir. O DesafioGUT usa só Google no login público ⇒ **sem Apple, a revisão recusa** (as excepções da 4.8 não se aplicam).

*Fonte: developer.apple.com/app-store/review/guidelines, lido a 2026-11-28. O texto veio de um resumo da página, porque a leitura foi truncada: confirmar a redacção literal antes de a citar fora daqui.*

## 2. O que o projecto já tem (medido)
| Item | Estado |
|---|---|
| SDK `@privy-io/react-auth` | **3.22.1**. `OAuthProviderID` inclui **`'apple'`** (`@privy-io/api-types/resources/client-auth.d.ts`). **Não é preciso subir de versão.** |
| `loginMethods` | `["google"]` (público, `AppContext.jsx`); `["google","email"]` (corporativo) |
| Painel Privy | Apple **desligado** (CLAUDE.md: «Apple está morto»). Nunca foi activado: activá-lo agora não migra ninguém. |
| Origem iOS no Privy | `capacitor://localhost` já em `allowed_domains` (medido no MC88.9) |
| Retorno do OAuth | `customOAuthRedirectUrl: https://silly-stardust-ca71bc.netlify.app/redirect` + `allowOAuthInEmbeddedBrowsers: true` (`PrivyRoot.jsx:218`) |
| App Link Android | `public/.well-known/assetlinks.json` ✓ |
| Universal Link iOS | **`apple-app-site-association` NÃO existe** ✗ |

## 3. O que falta — painel do Privy (operador)
1. **User management → Authentication → Socials → Apple: ligar.**
   - Em desenvolvimento pode usar as credenciais padrão do Privy.
   - ⚠️ Privy: com credenciais próprias e utilizadores já criados **não se volta às padrão** (não há migração). **Recomendação: pôr as credenciais próprias ANTES do primeiro utilizador Apple em produção.**
2. **Credenciais próprias** (no Privy: Team ID, Client ID, Key ID, Signing key):
   - **Team ID** (Apple Developer → Membership).
   - **Client ID**: para app iOS, o Privy indica o **App ID / bundle ID `com.desafiogut.app`** com a capability «Sign in with Apple». Para a web/PWA, um **Services ID**.
   - **Key ID** + chave **.p8** (Keys → «Sign in with Apple»). Colar com o cabeçalho e o rodapé.
   - ⚠️ A .p8 é segredo: o operador cola-a no painel; nunca entra no repo nem no chat.
3. **No portal da Apple**, no Services ID / Sign in with Apple:
   - Return URL: **`https://auth.privy.io/api/v1/oauth/callback`**;
   - domínio: `auth.privy.io`.
4. **App Settings → Domains**: confirmar `capacitor://localhost` (iOS) e `https://localhost` (Android).
5. **App Settings → Advanced → redirect URLs**: confirmar `https://silly-stardust-ca71bc.netlify.app/redirect`.

*Fonte: docs.privy.io/basics/get-started/dashboard/configure-login-methods e docs.privy.io/recipes/capacitor-oauth, lidos a 2026-11-28.*

## 4. O que falta — código (UTAC futuro, NÃO feito aqui)
1. `loginMethods: ["google", "apple"]` em `AppContext.jsx` (login público).
   - Decidir com o operador se o botão Apple aparece só no iOS ou em todas as plataformas. A 4.8 só o exige no iOS.
   - O corporativo continua com e-mail.
2. **Universal Link iOS**:
   - `public/.well-known/apple-app-site-association`, servido como JSON sem extensão, com `appID = <TEAM_ID>.com.desafiogut.app` e o caminho `/redirect`;
   - no Xcode, entitlement **Associated Domains** `applinks:silly-stardust-ca71bc.netlify.app` (precisa do Mac);
   - ⚠️ o `netlify.toml` tem de servir o ficheiro com `Content-Type: application/json`. É deploy web e precisa de autorização.
3. **Capability «Sign in with Apple»** no target iOS (Xcode, no Mac). Só é obrigatória para o login **nativo**. O fluxo OAuth web do Privy não a exige, mas a Apple pede-a quando a app oferece Sign in with Apple.
4. **Nome do utilizador**: a Apple só envia o nome no **primeiro** login, e o e-mail pode ser um relay `@privaterelay.appleid.com`.
   - O `registar-palpite` usa o nome do identity token (UTAC151). Para quem entrar por Apple pode vir vazio ⇒ «PrimeiroNome I.» em falta. Testar.
   - O e-mail de relay também afecta o fluxo corporativo (DEBT-027).
5. **⛔ Pré-requisito que bloqueia tudo no iOS (backend, fora deste UTAC): CORS.**
   - `netlify/functions/_lib/cors.mjs:22` aceita só `https://localhost`. O iOS chama de `capacitor://localhost`, e o `iosScheme` não pode ser `https` (o WKWebView reserva-o).
   - **Sem mudar o CORS, nenhuma chamada à API funciona no iOS**: login, saldo, edições, nada.
   - Correcção: aceitar as duas origens, reflectindo a origem do pedido quando pertence a uma lista fechada, sem nunca usar `*`.
   - Deve ser o primeiro UTAC do Mac.

## 5. Ordem sugerida para o dia do Mac
CORS (backend + deploy) → `build:ios` → abrir `ios/App/App.xcodeproj` (SPM resolve sozinho, **sem CocoaPods**) → Signing (Team) → correr no simulador → Apple no Privy + AASA + Associated Domains → TestFlight.
