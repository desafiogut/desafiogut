# UTAC152 — SEG4 VALIDADOR ADVERSARIAL (independente)

**Âmbito:** `f3d60d3` (plataforma iOS) + `3b65151` (PIX/recarga/site fora do iOS) sobre `100159b`.
**Método:** leitura do diff (`git diff 100159b..3b65151`, worktree em `3b65151` destacado), do bundle empacotado `ios/App/App/public/assets/*.js` (só leitura), dos logs do executor. Na árvore principal corri apenas o que é de leitura: `node --test` dirigido e o guarda.
**Corridas:**
- `utac152 + utac116 + utac111 + utac132`: 64/65. A falha é a pré-existente `versionCode 15` (DEBT-120d).
- `utac110i1-front-billing`: 16/16.
- Guarda `--ios` sobre `ios/App/App/public`: ✓.
- Guarda sem `--ios` sobre os assets do APK: ✓.
- Guarda `--ios` sobre os assets do APK: recusado (controlo positivo) ✓.

## VEREDITO: **APROVADO COM RESSALVAS**

O núcleo aguenta:
- **Android e PWA não mudam.** Cada expressão alterada só acrescenta `IOS_BUILD`/`iosNativo()`, que são falsos fora do iOS.
- **O guarda sem `--ios` decide da mesma forma.**
- **O backend ficou intocado.**
- **O bundle iOS não leva PIX de compra nem link para o site.**

Há três achados ⚠️ a tratar antes do dia do Mac. Dois partem a afirmação «o Xcode resolve os pacotes sozinho» e a ordem de trabalho escrita para o Mac. O terceiro é uma regressão visível no iOS que o próprio corte introduziu.

---

## ⚠️ Graves (tratar)

### ⚠️1 — `Package.swift` versionado com barras invertidas do Windows: o manifest SPM não compila
`ios/App/CapApp-SPM/Package.swift:15-16` (no commit `3b65151`, confirmado com `od -c`):
```
.package(name: "CapacitorApp", path: "..\..\..\node_modules\@capacitor\app"),
.package(name: "CapacitorPluginCdvPurchase", path: "..\..\..\node_modules\capacitor-plugin-cdv-purchase")
```
Isto é um literal de string Swift:
- `\.`, `\@`, `\c` e `\a` são sequências de escape inválidas, e o Swift dá erro de compilação;
- `\n` (em `\node_modules`) vira uma quebra de linha.

O Xcode/SPM não consegue avaliar o manifest. A resolução de pacotes falha antes de qualquer build. Tudo o que vem depois falha com ela: simulador, TestFlight e o próprio `CapacitorApp`.

- **Origem:** o `npx cap sync ios` escreve o ficheiro com o separador do SO anfitrião. O log mostra `[info] Writing Package.swift` (`_logs/UTAC152_build-ios_saida.txt:1405`). Cada `build:ios` em Windows volta a escrevê-lo assim.
- **Afirmação refutada:** «o Xcode resolve os pacotes sozinho no Mac» (`UTAC152_SEG0-3_FRENTES.md`, RELATÓRIO, Frente B §5).
- **Mitigação provável** (não executada, não há Mac): correr `npx cap sync ios` no Mac antes de abrir o Xcode. O sync reescreve o ficheiro com `/`. Mas ver ⚠️2: o caminho previsto para lá chegar (`npm run build:ios`) parte no Mac.

### ⚠️2 — `build:ios` só funciona em `cmd.exe`; no Mac pára no guarda antes do `cap sync`
`package.json` → `"build:ios": "cd ../.. && set VITE_IS_IOS_APP=true&& netlify build …"`.

No macOS o npm corre os scripts em `sh`. Aí, `set VITE_IS_IOS_APP=true` muda os parâmetros posicionais e **não exporta nenhuma variável**. O `netlify build` corre sem a flag e o guarda `--ios` recusa («VITE_IS_IOS_APP ausente»). O processo termina com exit 1 e o `npx cap sync ios` **nunca corre**.

- **Falha fechado:** não sai bundle errado. Mas perde tempo de Mac, que é precisamente o que o UTAC queria poupar (spec `motivo`).
- **Combinação com ⚠️1:** `ios/App/App/public` está no `.gitignore` (`ios/.gitignore:4`), logo o Mac **tem** de gerar o bundle. Com o script tal como está, o Package.swift partido também não se regenera.
- **Afirmação refutada:** «`npm run build:ios` (no Windows ou no Mac)» (RELATÓRIO, secção «No Mac»).
- **No Mac, à mão:**
  ```
  VITE_IS_IOS_APP=true netlify build --context production
  npm run validar:dist:ios
  npx cap sync ios
  ```
- **Alternativa:** um script `build:ios:mac`. Não mexer no `build:apk`.

### ⚠️3 — O balão de compra do Passe no iOS passa a citar a **Google Play**
- `BalaoComprarPasse.jsx:62` usa `quantidadeNaLoja={!depositoPix}`. A `MinhaCarteira` passa o mesmo valor ao balão dela.
- Com o corte, `depositoPix` é `false` no iOS. Logo `quantidadeNaLoja` fica `true` e o balão mostra:

> «Quer mais de um? Se a Google Play oferecer a opção, escolha a quantidade na tela de pagamento dela.»

**Medido no bundle empacotado:**
- `useComprarPasse-g7vPS2oi.js` contém a frase;
- `BalaoComprarPasse-DeyvvbSW.js` e `MinhaCarteira-CyZo1zAb.js` têm `quantidadeNaLoja:!0`, constante dobrada pelo minificador.

**Onde se chega a ele no iOS:** pelo Início (`Dashboard.jsx:633`), pelas Ofertas Programadas (`OfertasProgramadas.jsx:396`) e pela Carteira. Nenhum destes ecrãs é condicionado por `isLeilaoAtivo`.

**Antes do UTAC152**, o iOS tinha `depositoPix = true` e mostrava o seletor 1/3/5. A frase da Google Play é portanto uma **regressão iOS introduzida por este corte**.

**Risco:** App Review 2.3.10 (referências a outra plataforma móvel). O guarda `--ios` não a apanha, porque «Google Play» não está na lista.

**Correcção mínima:** no iOS, `quantidadeNaLoja` deve continuar `false`, ou o texto deve ser neutro. Por exemplo `quantidadeNaLoja={!depositoPix && !ehIOS}`. Não toca no Android.

---

## ℹ️ Notas

**ℹ️1 — Detecção de plataforma (pergunta 1) correcta.**
- O WKWebView serve de `capacitor://localhost`, logo `protocol === "capacitor:"`. O passo 3 de `detectarPlataformaNativa` (`google-play-billing.js:129`) exige `https:` e **não** classifica o iOS como `android`.
- O PWA nunca dá `ios`, porque não tem ponte Capacitor nativa. O `?plataforma=ios` não entra, já que `iosNativo` lê a ponte e não o `useRecursosApp`.
- Ressalva: se a ponte não estiver visível no 1.º render, o iOS cai em `"web"` e a camada runtime falha **aberta** (PIX visível). Só a camada de build cobre esse caso.
- O Capacitor iOS injecta `window.Capacitor` no início do documento, por isso o caso é improvável. Mas o `build:ios` é a camada que conta, e a docstring de `iosNativo` («fail-closed») só é verdade no sentido de «não esconde o PIX por engano».

**ℹ️2 — Android/PWA (pergunta 1/5) sem mudança de decisão.**
- `pixPermitido("android"|"web")` fica igual.
- `pt.js`, `Configuracoes`, `CardLance`, `BalaoComprarPasse` e `MinhaCarteira` só ganham termos falsos fora do iOS.
- No `useComprarPasse`, o ramo Android (`androidNativo()`) continua antes do ramo iOS.
- **Guarda:** sem `--ios`, `ARGS.find(a => !a.startsWith("--"))` devolve o 1.º argumento, e é isso que o Gradle passa (`android/app/build.gradle:77`, só o caminho absoluto). As duas verificações do APK estão agora sob `!ALVO_IOS`, e sem `--ios` dão os mesmos erros. Medido sobre os assets actuais do APK: ✓.

**ℹ️3 — Hooks (pergunta 4) sem violação.**
- `SemSaldoBanner`: o `useNavigate()` vem **antes** do `return null`.
- `PagarProduto` virou despachante sem hooks, e o `usePagarProduto` ficou só em `PagarProdutoPix`.
- `MercadoConformidade(IOS)` não tem hooks.
- `MSG_COMPRA_IOS` é uma constante de módulo, definida antes de qualquer chamada.

**ℹ️4 — CTA de compra digital continua visível no iOS** (declarado na DEBT-119, não é PIX).
- No bundle iOS: «Comprar Passe Desafio R$ 2,00» (`MinhaCarteira-*.js`) e «Escolha o seu Passe Desafio … × R$ 2,00 = …» (balão).
- O botão só devolve `compra_indisponivel_no_ios`. Não há chamada ao endpoint: o ramo PIX fica morto no bundle (`if(true) return`).
- Um revisor vê preço + «Comprar» para conteúdo digital sem IAP. Risco 2.1/3.1.1, aceite pelo operador para o TestFlight.
- Recomendação: esconder o botão no iOS em vez de o deixar dar erro.

**ℹ️5 — Resíduos no bundle iOS (pergunta 3), coerentes com a DEBT-120.**
- «PIX» aparece só em texto legal/privacidade (`Privacidade`, `ExcluirConta*`), no ADM (`GestaoFinanceira`/`VisaoGeral` «Receita PIX», `PerfilUsuario` «Saldo R$», «Carregar no futuro (D2)») e no SDK do Privy.
- Os Termos citam «Google Play (Google Billing)» (`index-*.js`, texto legal), o que reforça o ⚠️3 quanto à 2.3.10. Mexer nisso é um UTAC de Regulamento.
- Não encontrei «versão Web», «navegador», «Recarregue», «Depositar», «copia e cola» nem `desafiogut.com` no bundle iOS.
- Os links `?ref=` são convite, não compra (DEBT-120b).

**ℹ️6 — Texto da vista iOS inconsistente.** «Esta versão do app ainda não inclui as edições» (`MercadoLances.jsx`, `MercadoConformidadeIOS`) é falso: as Ofertas Programadas e o Início continuam a mostrar edições no iOS, porque não dependem de `isLeilaoAtivo`. O texto foi escolhido pelo executor.

**ℹ️7 — Testes (pergunta 6).**
- **Bons:**
  - os testes do guarda executam o script real, com controlo positivo e negativo;
  - o (b) do `utac110i1` exerce o hook real e assere zero chamadas a `comprar-passe` e zero à loja;
  - os dois contratos antigos foram invertidos **à vista**, com o nome e a asserção antigos em comentário (`utac116:63-66`, `utac110i1:129-133`).
- **Fracos:**
  - os 6 testes «duas camadas» (`utac152:146-158`) e o da vista iOS são regex de fonte: passam com o texto certo, mesmo que o ramo nunca seja alcançado;
  - nenhum teste de render prova «iOS ⇒ sem PIX» na `MinhaCarteira`, no `BalaoComprarPasse` ou no `SemSaldoBanner`;
  - nenhum teste apanha o ⚠️3. A lista de frases do guarda é uma lista negra: «Google Play», «Comprar Passe» e «R$ 2,00» não estão lá.
- A mutação 8/8 não foi re-corrida por mim, porque o worktree não tem `node_modules` e não criei junctions. Fica só a evidência do log.

**ℹ️8 — Frente B (pergunta 7) exacta no que é verificável.**
- `@privy-io/react-auth` 3.22.1: `'apple'` presente em `@privy-io/api-types/resources/client-auth.d.ts` ✓.
- CORS: `desafio-gut/frontend/netlify/functions/_lib/cors.mjs:22` `ORIGEM_APK = "https://localhost"`, constante única em `access-control-allow-origin` ✓. O log omite o prefixo `desafio-gut/frontend/`, mas o caminho é relativo ao frontend.
- `capacitor://localhost` em `allowed_domains`: é medição **histórica** do MC88.9 (comentário em `PrivyRoot.jsx:198-202`), não re-medida neste UTAC.
- A citação da 4.8 vem de um resumo, e o executor declara-o.

**ℹ️9 — Projecto iOS (pergunta 8).**
- Certo: bundle id `com.desafiogut.app` (Debug e Release), `CFBundleDisplayName` DesafioGUT, iOS 15, SPM sem Podfile.
- **Placeholders:** o `AppIcon-512@2x.png` e os 3 `splash-2732x2732*.png` são o **logótipo padrão do Capacitor**, vistos à mão. Servem para o TestFlight interno; para submissão é preciso o ícone GUTO e o splash.
- **Em falta:** `PrivacyInfo.xcprivacy` da app, `ITSAppUsesNonExemptEncryption` (pergunta de exportação a cada upload), `CFBundleDevelopmentRegion = en` numa app só PT-BR.
- **Versões:** `MARKETING_VERSION 1.0` / `CURRENT_PROJECT_VERSION 1`.
- **Outros:** o `capacitor-plugin-cdv-purchase` entra no binário iOS (StoreKit) sem uso; o `OTHER_SWIFT_FLAGS` do Debug traz `-D COCOAPODS` (vem do template).

**ℹ️10 — `MSG_PIX_NO_APK = ""` no `build:ios`** (`useComprarPasse.js:75`). Se o iOS fosse alguma vez classificado como `android`, o erro sairia **vazio** (`setErro("")`), em silêncio. Hoje é inalcançável (ver ℹ️1), mas é uma armadilha latente.

**ℹ️11 — Âmbito/R20.**
- Respeitado: backend 0 linhas; Android/PWA sem mudança; lock só `+@capacitor/ios`; sem CocoaPods; Arts. 11/20 intactos; sem push.
- Esconder o PIX do **produto físico** (`PagarProduto`) vai além do que a Apple exige (3.1.3(e) permite-o). Cabe no R18-152-B («corte do PIX no iOS») e está declarado na DEBT-119.

---

## O que NÃO consegui verificar
- Compilar ou abrir o projecto no Xcode, resolver o SPM, correr no simulador: não há Mac. O ⚠️1 assenta na sintaxe de literais Swift, não numa execução.
- Que o `npx cap sync ios` no Mac reescreve o `Package.swift` com `/`: é inferido do log «Writing Package.swift» e de o caminho ser relativo ao SO anfitrião.
- Comportamento real no WKWebView: tempo de chegada da ponte, OAuth, CORS.
- Mutação 8/8 e suíte completa (RAM ~650 MB livre; sem `node_modules` no worktree).
- O valor vivo de `isLeilaoAtivo.ios` em produção. Assumi `false`, como dizem o default e a medição do executor.

---
## Tratamento pelo executor (2026-11-28) — correcções NÃO re-validadas por 2.ª ronda
- **⚠️1 Package.swift com «\»** — CONFIRMADO (`sed -n 15,16p`). Novo `scripts/normalizar-package-swift.mjs` (função pura `normalizarCaminhosSwift`, idempotente, só dentro de `path: "…"`), chamado pelo `build:ios` depois do `cap sync ios`. O ficheiro versionado foi normalizado. Testes: a função (com o comentário intacto + idempotência) e «o Package.swift versionado não tem «\» em nenhum path».
- **⚠️2 build:ios só em cmd.exe** — CONFIRMADO. `build:ios` = `node scripts/build-ios.mjs`: flag no `env` do processo, `delete env.VITE_IS_ANDROID_APP`, passos build → guarda `--ios` → `cap sync ios` → normalizar, e pára no primeiro erro. Teste de fonte da ordem + «sem `set VITE_`». ⚠️ Não corrido num Mac (só no Windows).
- **⚠️3 balão do Passe cita a Google Play no iOS** — CONFIRMADO. Novo prop `compraIndisponivel` no `ComprarPasseModal`: aviso neutro, sem «Google Play», sem «debitados do seu saldo», sem seletor, e os 2 «Comprar» desactivados (cobre também o ℹ️4). `BalaoComprarPasse` e `MinhaCarteira` passam `compraIndisponivel` = build iOS OU ponte iOS, e `quantidadeNaLoja` exige não-iOS (no Android o valor é o mesmo). 2 testes de RENDER (iOS e controlo PWA/APK). ℹ️ A frase da Google Play continua no bundle iOS (o modal é partilhado), mas não se desenha.
- **ℹ️6** — o texto passou a «Menor Lance Único em breve no app» / «…ainda não inclui as edições do Menor Lance Único…».
- **ℹ️9** (ícone/splash placeholder, `PrivacyInfo.xcprivacy`, `ITSAppUsesNonExemptEncryption`, versão 1.0(1), região `en`) → DEBT-120(e), para o dia do Mac.
- **ℹ️10** (`MSG_PIX_NO_APK` vazia no build iOS) → DEBT-120(f): armadilha latente, hoje inalcançável.
- **ℹ️1, 2, 3, 5, 7, 8, 11** — notas aceites, sem acção.
