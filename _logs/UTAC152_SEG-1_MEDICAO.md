# UTAC152 — SEG-1 MEDIÇÃO (2026-11-27)

Nada foi alterado neste segmento.

## -1.1 Estado do repo
- `git rev-parse --short HEAD` → `100159b` = baseline do spec (sem desvio).
- `git log origin/main..HEAD` → vazio (nada por publicar).
- `git status --short`: ficheiros alheios modificados (`.agents/skills/aidesigner-frontend/*`, `.gitignore`, `.mcp.json`, `desafio-gut/frontend/package-lock.json`) e `_logs/MC10x_*` por versionar. **Não são deste UTAC: não se tocam (árvore partilhada).** ⚠️ O `package-lock.json` já vem modificado: um `npm install` deste UTAC mistura-se com essa alteração.

## -1.2 Caminhos
- `desafio-gut/frontend/ios` → **não existe**.
- `capacitor.config.ts`: `appId com.desafiogut.app`, `appName DesafioGUT`, `webDir dist`. Sem `server`, sem `ios`.
- `node_modules/@capacitor/` → `android app cli core`. **`@capacitor/ios` não está instalado**; `npx cap add ios` exige-o.
- Versões: core/cli/android **8.4.2**. `npm view @capacitor/ios@8.4.2` existe (o mais recente é o 8.6.3).

## -1.3 Fontes: Frente B (login)
- `@privy-io/react-auth` **3.22.1**. `OAuthProviderID` (`@privy-io/api-types/resources/client-auth.d.ts`) inclui **`'apple'`**: o SDK instalado suporta o login Apple.
- Login público = `loginMethods: ["google"]` (`AppContext.jsx`); corporativo = `["google","email"]`.
- `CLAUDE.md`: «Apple está morto — não está activo no painel Privy nem no código».
- OAuth no Capacitor: `PrivyRoot.jsx:218` `customOAuthRedirectUrl: https://silly-stardust-ca71bc.netlify.app/redirect` + `allowOAuthInEmbeddedBrowsers: true` (MC88.5). O Android usa App Link (`public/.well-known/assetlinks.json`). **Não existe `apple-app-site-association`** em `public/.well-known/` ⇒ o retorno do OAuth no iOS (Universal Link) não está montado.
- O Privy já lista `capacitor://localhost` em `allowed_domains` (comentário do MC88.9 em `PrivyRoot.jsx`).

## -1.4 Medições específicas
### Frente C (pagamentos)
- `src/lib/google-play-billing.js:142` `pixPermitido(p)` = `p !== "android"`: **o iOS mantém o PIX de propósito** (UTAC110i.2, DEBT-060 «decisão do operador (iOS/IAP)»). O enunciado inverte essa decisão para o iOS.
- O PIX é cortado no Android por duas camadas:
  - **build** `VITE_IS_ANDROID_APP` (`MinhaCarteira`, `CardLance`, `Configuracoes`, `BalaoComprarPasse`, `i18n/pt.js`);
  - **runtime** `pixPermitido(detectarPlataformaNativa())` (`MinhaCarteira`, `BalaoComprarPasse`).

  `CardLance`, `Configuracoes` e `pt.js` só têm a camada de build ⇒ um corte só em runtime não os apanha no iOS.
- 25 ficheiros de `src/` mencionam PIX (lista no comando `grep -rliE pix src`). **Boleto: 0 ocorrências.**
- Site externo:
  - `MercadoLances.jsx:524-566` «Edições na versão Web» / «Abrir versão Web» (vista de conformidade; `isLeilaoAtivo.ios=false` por default ⇒ o iOS cai aqui);
  - `useComprarPasse.js:72` `PWA_PASSE`;
  - links de convite `PainelIndicacao.jsx:87` e `ChatbotWidget.jsx:153` (`ORIGEM_PRODUCAO/?ref=`).
- Não há IAP iOS. Esconder o PIX no iOS ⇒ **o iOS fica sem forma nenhuma de comprar Passes** (DEBT-060).

### ⛔ Bloqueio fora do âmbito: CORS
`netlify/functions/_lib/cors.mjs:22` `ORIGEM_APK = "https://localhost"` é uma origem única e constante. O WKWebView do Capacitor serve de **`capacitor://localhost`**, e o `iosScheme` não pode ser `https`. ⇒ **Todas as chamadas à API a partir do iOS vão ser recusadas pelo browser** até o backend aceitar essa origem. O backend está proibido neste UTAC: fica como pendência obrigatória antes de testar no Mac.

### Frente D (vocabulário)
- Varredura `sorte|azar|apost|sortei|loteri` em `src/`, `public/` e `index.html` (fora de testes e comentários): **1 ocorrência visível**, `TermosConsentimento.jsx:129` = **Art. 11 do Regulamento v8.0**: «…não configurando sorte, loteria ou jogo de azar.» É uma negação e é texto legal.
- `docs/REGULAMENTO-v8.0.md` (publicado em `/regras-oficiais`): Art. 11 (a mesma frase) e Art. 20 («afasta qualquer caracterização … como aposta financeira»). Ambos são negações.
- A UI já está limpa por guarda executável: `src/i18n/__tests__/glossario.test.mjs` e `pt-only.test.mjs` (NORTE §1.2). Mudar o Art. 11/20 parte a igualdade byte a byte com o GUTO (backend, proibido) e o texto registado no RTD.

## -1.5 Disco
`df -h /c` → 12 GB livres (> 5 GB).

## ⚠️ Conflitos (R20, não resolvidos pelo executor)
1. **`@capacitor/ios`**: `cap add ios` precisa do pacote npm (`@capacitor/ios@8.4.2`, a mesma versão do core). O enunciado proíbe «dependências nativas». Interpretação proposta: o pacote npm é JS + fontes Swift; o passo nativo proibido é CocoaPods/SPM no Mac.
2. **Mecanismo do corte no iOS**: só em runtime (`getPlatform()==='ios'`, como o enunciado sugere) ou também em tempo de build (`VITE_IS_IOS_APP`, o padrão provado no Android)?
3. **Art. 11/20 do Regulamento**: as únicas ocorrências são negações em texto legal.
4. **Commit**: o enunciado não autoriza commits.

## Veredito: **AJUSTAR** — perguntas ao operador antes do SEG0.

## Decisões do operador (R18, 2026-11-27)
- **R18-152-A** instalar `@capacitor/ios@8.4.2` (npm). «Dependências nativas» = CocoaPods/SPM/Xcode. Protocolo do lock: mostrar o diff alheio, `git stash` se não for Capacitor, instalar, `cap add ios`, `git stash pop`.
- **R18-152-B** corte no iOS em DUAS camadas: runtime + build `VITE_IS_IOS_APP` (script `build:ios` + guarda). Aceite: o iOS fica sem compra de Passe até haver IAP (DEBT-060).
- **R18-152-C** Art. 11/20 intactos; a varredura e a guarda do glossário ficam registadas no relatório.
- **R18-152-D** commits locais `feat(UTAC152)`/`docs(UTAC152)` com `ios/`. ⛔ **Sem push.**

## Diff alheio do package-lock (mostrado ao operador)
`git diff --stat`: 31+/53−. Sem relação com o Capacitor (0 ocorrências). São +`"dev": true` em ~30 entradas opcionais e −4 peers (`@tanstack/query-core`, `@tanstack/react-query`, `@types/react`, `typescript`). É o padrão de `npm install --legacy-peer-deps` que parte o `npm ci` (memória «dois modos de npm install», MC93-G). ⇒ `git stash`.
