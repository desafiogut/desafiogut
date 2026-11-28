# UTAC152 — SEG0..SEG3 (frentes)

## Frente A — Capacitor iOS (`f3d60d3`)
- Lock alheio: mostrado ao operador (+`dev:true`, −4 peers: padrão do `--legacy-peer-deps`, sem Capacitor) → `git stash` → instalação → `git stash pop` limpo (o lock alheio voltou à árvore, sem commit nosso).
- `npm install @capacitor/ios@8.4.2`: o lock só ganha `@capacitor/ios` (+10 linhas). `npm ci --dry-run --ignore-scripts` OK.
- `npx cap add ios` → **projecto Xcode com Swift Package Manager** (`ios/App/CapApp-SPM/Package.swift`). **Sem Podfile, sem CocoaPods**: o Xcode resolve os pacotes sozinho no Mac.
  - Plugins iOS: `@capacitor/app@8.1.1`, `capacitor-plugin-cdv-purchase@13.19.1`.
  - 19 ficheiros versionados; `App/App/public` e `capacitor.config.json` ficam no `.gitignore` do Capacitor.
- `npm run build:ios` (novo) → `netlify build --context production` com `VITE_IS_IOS_APP=true` → guarda `--ios` ✓ → `npx cap sync ios` ✓ (`_logs/UTAC152_build-ios_saida.txt`, EXIT=0). Sem deploy.

## Frente B — Sign in with Apple
Relatório em `_logs/UTAC152_FRENTE-B_SIGN-IN-WITH-APPLE.md`. Sem código. O SDK já suporta `'apple'`. DEBT-117 (CORS) e DEBT-118.

## Frente C — PIX, recarga e site fora do iOS (R18-152-B: runtime + build)
| Sítio | Antes | Depois (iOS) |
|---|---|---|
| `google-play-billing.js` `pixPermitido` | iOS true | iOS **false**; novo `iosNativo()` (fail-closed) |
| `MinhaCarteira` `depositoPix` | `!APK_BUILD && pixPermitido` | `+ !IOS_BUILD` |
| `BalaoComprarPasse` `depositoPix` | flag Android + runtime | `+ VITE_IS_IOS_APP` |
| `CardLance` `saldo_insuficiente` | APK neutro | APK **ou iOS** neutro |
| `Configuracoes` interruptor PIX | sem ele no APK | sem ele no APK **e no iOS** |
| `i18n/pt.js` `config.notifPix` | fora do APK | fora do APK **e do iOS** |
| `useComprarPasse` | iOS ia ao PIX | `compra_indisponivel_no_ios` (sem endpoint, sem citar PIX/site); `MSG_PIX_NO_APK` vazia no `build:ios` |
| `SemSaldoBanner` «Carregar PIX →» | visível | não se desenha |
| `MercadoLances` vista de conformidade | «Edições na versão Web» + link | `MercadoConformidadeIOS`: «Edições em breve no app», sem link |
| `MeusPedidos` `PagarProduto` (PIX do produto) | QR/copia e cola | `PagarProdutoIndisponivelIOS` (valor + aviso neutro); `PagarProdutoPix` intacto |
| `scripts/validar-dist-rede.mjs` | só APK | `--ios`: exige `VITE_IS_IOS_APP`, recusa a flag Android e 14 frases. Sem `--ios`: igual ao de antes |
| `package.json` | — | `build:ios`, `validar:dist:ios` |

Textos novos (escolhidos pelo executor, neutros):
- «A compra do Passe Desafio ainda não está disponível no app para iOS.»
- «Edições em breve no app» / «Esta versão do app ainda não inclui as edições. Por aqui, continue explorando a loja e os produtos.»
- «O pagamento deste pedido ainda não está disponível no app para iOS.»

**Android e PWA:** as expressões do Android ficam com o mesmo valor (só se acrescenta `|| IOS_BUILD || iosNativo()`, que é falso fora do iOS). O guarda sem `--ios` aceita os assets actuais do APK ✓.

### Provas
- Artefacto que o Xcode empacota: `node scripts/validar-dist-rede.mjs --ios ios/App/App/public` → mainnet, `VITE_IS_IOS_APP=true`, **«strings PIX/site no iOS: nenhuma»** ✓.
- Controlo positivo: os mesmos comandos sobre `android/app/src/main/assets/public` → **RECUSADO** (flag ausente, dist do APK, 6 frases). O guarda do APK sobre os mesmos assets → ✓.
- Testes:
  - novo `src/__tests__/utac152-ios-sem-pix.test.mjs`;
  - 2 contratos antigos **invertidos à vista** (`utac116` «iOS mantém o PIX» e `utac110i1-front-billing` «(b) iOS ⇒ PIX»);
  - 5 regex do `utac132` actualizadas.
  - Nos 4 ficheiros: 59/60. A 1 falha é pré-existente (`versionCode 15`, DEBT-120d).
- Mutação **8/8 RED**, restauro md5 idêntico (`_logs/UTAC152_mutacao_saida.txt`).
- Resíduos de PIX no bundle iOS: texto legal/privacidade, ADM e SDK do Privy (DEBT-120a).

## Frente D — Vocabulário (R18-152-C)
- Varredura `sorte|azar|apost|sortei|loteri` em `src/`, `public/` e `index.html`, sem testes nem comentários: **só o Art. 11** (negação, texto legal). No Regulamento v8.0: Art. 11 e Art. 20, ambos negações.
- **Mantidos intactos** (texto registado no RTD + igualdade byte a byte com o GUTO). A UI já está protegida pelas guardas `src/i18n/__tests__/glossario.test.mjs` e `pt-only.test.mjs`.
