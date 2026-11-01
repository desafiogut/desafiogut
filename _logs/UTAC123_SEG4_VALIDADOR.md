# UTAC123 — SEG4 · Validador adversarial independente

Opus 5.5 · 2026-11-01 · só leitura (excepto este ficheiro). HEAD `7f8200e`, alterações por commitar.
Extracção do AAB em `scratchpad/val123/aab` (fora do repo). Nenhum segredo impresso: só host/comprimento/hash.

## Veredicto: **APROVADO COM RESSALVAS** — 0 bloqueantes para o AAB v7 · 2 ⚠️ · 7 ℹ️

O AAB v7 é o que o executor diz. As duas ⚠️ são sobre **o que se afirma à volta** dele (a chave «Sepolia vazada» e
o «os consumidores já tratam a falha»), não sobre o artefacto.

## O que confirmei (medido por mim)
| Afirmação | Evidência |
|---|---|
| SHA-256 do v7 | `sha256sum DesafioGUT-v7.aab` → `619bf824…a462` ✓ (= `android/app/build/outputs/bundle/release/app-release.aab`, 16:31:10) |
| Guarda no .aab extraído | `node scripts/validar-dist-rede.mjs <aab>/base/assets/public` → 129 .js, contrato `0x0052477A…16cd`, RPC mainnet, chainId 1, stage mainnet, Supabase URL/anon presentes, «chave RPC Sepolia embutida: não», **EXIT=0** |
| Assets do AAB = `src/main/assets/public` | `diff -rq` → idênticos, excepto `.well-known/` (o aapt ignora pastas com ponto; irrelevante) |
| versionCode 7 | manifesto protobuf: `versionCode "7"` / int `0x07` |
| Mesmo certificado do v6 | `keytool -printcert -jarfile` v6 e v7: SHA256 `85:44:BC:…:17:29` nos dois; `jarsigner -verify` → `jar verified` |
| Gancho Gradle dispara | `%TEMP%\utac123-gradle2.txt` l.12 `> Task :app:validarAmbienteProducao` → l.22 «✓ coerente» → l.24 `> Task :app:preReleaseBuild` → l.251 `bundleRelease` · `BUILD SUCCESSFUL`. AGP 8.13.0 cria `preReleaseBuild`; `assembleRelease` e `bundleRelease` dependem dele (o caminho de «Generate Signed Bundle» também). Caminho `file("src/main/assets/public")` resolvido no módulo `app` ✓ |
| Ícone | `res/mipmap-anydpi-v26/ic_launcher{,_round}.xml` no AAB; XML válido (adaptive-icon, inset 8%); `ic_launcher_background` `#0C1A3D`. Li o `mipmap-xxxhdpi/ic_launcher_foreground.png` (432×432) e o `logo-do-app-512x512.png`: **mesma arte, GUTO de MÃO ABERTA**, sem martelo. `ic_launcher_round` no AAB = recorte circular ✓. 15 PNG RGBA nos tamanhos certos (48…192 / 108…432). O hash do PNG no AAB difere do da árvore — esperado (o aapt2 recomprime PNG em release); confirmado visualmente |
| minSdk | `variables.gradle`: min 24 / target 36. Adaptive só em `-anydpi-v26` (API 26+); API 24-25 usam os PNG legados ✓ |
| Testes | `node --test utac123-build-blindado.test.mjs` → **23/23**, exit 0 |
| Mutação | `utac123-prova-mutacao.mjs` → **10/10 mortos**, pós-restauro 0 falhas; `md5sum -c` meu (antes/depois) em `web3.js`, `build.gradle`, `validar-dist-rede.mjs` → **OK** |
| Âmbito | `git status`: só os ficheiros declarados (web3.js, build.gradle, validar-dist-rede.mjs [desvio declarado], MinhaCarteira.jsx, 15 PNG, ic_launcher_background.xml, 2 XML novos, teste + script de mutação novos, DEBT.md). Resto = alheio pré-existente |

## ⚠️ Achados

**⚠️1 — A «chave Sepolia vazada» é a MESMA chave do RPC de produção (mainnet).** A chave que estava em
`web3.js` no HEAD (`eth-sepolia…/v2/<21 chars>`) e a chave do `VITE_ALCHEMY_URL` embutido no v7
(`eth-mainnet…/v2/<21 chars>`) têm o **mesmo sha256 (`28cd3803288c…`)**. Uma chave Alchemy é por app e serve
várias redes. Consequências: (a) o v7 continua a publicar essa chave (sob o host mainnet) — o que é inevitável
para um RPC do lado do cliente, mas «segredo removido do bundle» só vale para o **URL de testnet**, não para a chave;
(b) **rodar a chave (acção da DEBT-082) parte o RPC mainnet da web E de todos os AAB v3–v7** até se actualizar
`VITE_ALCHEMY_URL` no Netlify, voltar a publicar a web e compilar um v8. Recomendação ao operador: primeiro a
**allowlist de origens/apps no painel Alchemy** (mitiga sem partir nada); a rotação só com v8 planeado. A DEBT-082
deve dizê-lo.

**⚠️2 — Sem env, o fail-fast NÃO falha em silêncio: substitui a app inteira pelo ecrã de erro.** O SEG0 diz que «os
consumidores já tratam a falha». Isso é falso para dois. `subscribeLanceDado` (`web3.js:226-227`) e
`subscribeSaldoSenhas` (`:281-283`) são **síncronas** → `getContratoLeitura()` → `getProvider()` lança. O
`AppContext.jsx:731-732` chama `subscribeLanceDado` num `useEffect` **incondicional ao montar** (e `:827` chama a
outra com sessão). O erro sobe: `PrivyCrashBoundary` volta a lançá-lo (`PrivyRoot.jsx:109`) →
`RaizErrorBoundary` → `<SentryFallback/>` (`main.jsx:105`). Os caminhos async (`getEdicaoPrazo` com try,
`lerResultadoOnchain`/`verificarCreditoOnchain`/`getSaldoSenhasOnChain` → promessa rejeitada) estão bem.
**Produção não é afectada** (env presente + guarda no Vite e no Gradle). Quem é afectado é o **dev local**: o
`frontend/.env` só tem `VITE_NETWORK_STAGE` ⇒ `npm run dev` (validação visual no :3000) passa a abrir o
ecrã de erro, quando antes caía no RPC Sepolia. Correcção barata para um UTAC seguinte: `try/catch` nos dois
`subscribe*` a devolver um unsubscribe vazio (+ teste). Os testes passam porque os arnês fazem duplo da leitura on-chain.

## ℹ️ Achados
- **ℹ️1 A chave antiga ainda está em 10 ficheiros RASTREADOS** (`git grep -lF`): `hardhat.config.js`,
  `desafio-gut/hardhat.config.cjs`, `desafio-gut/frontend/scripts/test-mc11.5.mjs`,
  `desafio-gut/scripts/{deploy-direct.cjs,debug-privy-connection.js,probe-saldo-onchain.js}`, `CLAUDE_DEBUG.md`,
  `cloud.md`, `docs/MC88.29-RELATORIO.txt`, `desafio-gut/docs/MC59.15-relatorio.txt`. Mais `desafio-gut/.env`
  (ignorado) e intermediários de build. **Nada disto entra no bundle**; em `src/` e `public/` não está; em
  `android/app/src/main/assets` só está na forma mainnet (⚠️1). «`grep alchemy.com/v2/` em `src/` → 0» é verdade
  só para `src/`.
- **ℹ️2 Inlining do env inteiro:** o objecto embutido tem **12 chaves VITE_**: ALCHEMY_URL, CHAIN_ID,
  CONTRACT_ADDRESS (`0x000…0`, morta), CONTRATO_SEPOLIA, EXPLORER_URL, MOCK_MODE (`false`, morta no código),
  NETWORK_STAGE, PRIVY_APP_ID, SENTRY_DSN, SUPABASE_ANON_KEY, SUPABASE_URL, WC_PROJECT_ID. **Todas são públicas por
  desenho**; os 2 JWT encontrados (anon) têm `role: anon` (não há service_role); nenhum `sk_`/`PRIVATE_KEY`/
  `MP_ACCESS`/`DEEPSEEK`. Risco estrutural continua: **qualquer VITE_* nova no Netlify entra no APK** (`network.js:16`).
- **ℹ️3 Regex da guarda:** só apanha Alchemy Sepolia com chave de 16+ caracteres. Infura/QuickNode/Ankr com chave
  passariam. Hoje o bundle só tem modelos sem chave (`…/v2`, `…/v3` do viem/Privy) ⇒ sem falso positivo nem falso
  negativo real. Proporcional.
- **ℹ️4 Formas de contornar o gancho (todas deliberadas):** `-x validarAmbienteProducao`; `GUT_PERMITIR_TESTNET=1`
  na shell (o Exec herda-a e o release testnet passa); um flavor futuro renomeia `preReleaseBuild` para
  `pre<Flavor>ReleaseBuild` (o `if (t.name == …)` deixa de casar). Sem `node` no PATH do Android Studio o Exec
  falha ⇒ fail-closed (bom).
- **ℹ️5 `package-lock.json` foi reescrito durante o UTAC** (mtime 16:26:22, 5 min antes do Gradle — o
  `netlify build` do `build:apk`). O diff (84 linhas) é o padrão já conhecido (tira os peers `@tanstack/*`,
  `@types/react`, `typescript` — MC93-G/UTAC000.16). Não consigo provar que o conteúdo é byte a byte o de antes;
  as linhas batem com o que o executor registou. **Não commitar.**
- **ℹ️6 O ícone de 512 px da ficha da Play** é carregado no Play Console, não vive no AAB. Trocar para a arte de mão
  aberta é passo do operador.
- **ℹ️7 Inset fraccionário (`8%`)** no `<inset>` do adaptive-icon: só é carregado em API 26+ (`-anydpi-v26`); o aapt2
  aceitou-o (BUILD SUCCESSFUL). Não testei em aparelho.

## Comandos
`sha256sum`, `unzip`, `validar-dist-rede.mjs` sobre o AAB extraído, `diff -rq`, `keytool -printcert`,
`jarsigner -verify`, `git grep -lF` (chave como variável, nunca impressa), `sha256sum` de chaves (prefixo de 12),
`node --test utac123-build-blindado.test.mjs`, `utac123-prova-mutacao.mjs`, `md5sum -c`.
