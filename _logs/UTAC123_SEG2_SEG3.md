# UTAC123 — SEG2 (build) · SEG3 (verificação do AAB)

## R18 adicional — ícone com o GUTO de MÃO ABERTA (pedido do operador)
O operador pediu: «a imagem do app é o GUTO de mão aberta e não com um martelo». Medido: a arte do ícone
(MC91.6) tinha o martelo e **não existia** versão de mão aberta no repo nem nas pastas do Desktop. O operador
indicou `Desktop/logo-do-app-512x512.png` (512², opaca, mesma cena, mão aberta; SHA-256 `3cbabf6f…`).
Gerados os 15 PNG (`ic_launcher`/`_round` 48 dp, `ic_launcher_foreground` 108 dp × mdpi…xxxhdpi), Lanczos puro
(sem nitidez — escolha do MC91.6); `_round` com máscara circular. Originais em backup no scratchpad.
Pré-visualização do recorte (círculo/squircle, inset 8%): mão aberta visível, forma 100% preenchida.

## SEG2 · Build
1. `npm run build:apk` (1.ª vez) → guarda ✓ (chainId 1, contrato mainnet, RPC mainnet, Supabase presente).
   `package-lock.json`: diff igual ao de antes do build (84 linhas, pré-existente) — não reescrito.
2. **Gate A14** — trims repetidos: 1 590 MB (após o operador fechar o Chrome), depois estável 1 172-1 396 MB em
   21 medições. **R18: o operador autorizou o Gradle com ~1 340 MB** (pagefile 15,9 GB). Desvio declarado.
3. `gradlew bundleRelease` (JDK 21 = Android Studio jbr) → `> Task :app:validarAmbienteProducao` ✓ →
   **BUILD SUCCESSFUL in 54s**.

## SEG3 · Verificação — ACHADO e correcção
Extracção integral do `.aab` (a 1.ª extracção parcial com `unzip 'base/assets/public/*'` trouxe só 2 `.js` e deu
«AUSENTE» em tudo — **erro do meu instrumento**, refeito com extracção completa: 127/127 `.js`).
- ✓ env de produção, contrato mainnet, Supabase, versionCode 7, ícone = mão aberta (dif. média 0,000 vs arte nova;
  3,560 vs martelo — o PNG difere em bytes porque o aapt2 recomprime, por isso compara-se por píxeis).
- ⚠️ **A chave Alchemy de Sepolia continuava no bundle** (1 ficheiro, `web3-*.js`), agora pela var **MORTA**
  `VITE_RPC_URL_SEPOLIA` do Netlify `production` (0 leitores no código; documentada como morta desde o MC59.15).
  Hash da chave no bundle = hash da chave removida do `web3.js` (`059f3f56ae29`). Causa: `src/lib/network.js:16`
  faz `const env = import.meta.env ?? {}` ⇒ o Vite embute o objecto `import.meta.env` INTEIRO (todas as `VITE_*`).
- **Exceção autorizada pelo operador (R18: «abra uma exceção e corrija»)** à proibição de mexer no env do Netlify:
  `netlify env:unset VITE_RPC_URL_SEPOLIA --context production` (só existia nesse contexto, scope builds).
  `VITE_CHAIN_ID`/`VITE_CONTRATO_SEPOLIA`/`VITE_NETWORK_STAGE` reconfirmados intactos.
- Guarda endurecido: URL `eth-sepolia.g.alchemy.com/v2/<chave 16+>` embutido ⇒ erro (sem imprimir a chave);
  URLs de Sepolia **sem** chave (definições do viem/Privy) não contam. Prova no caso real: o guarda novo **rejeita o
  1.º v7** («chave RPC Sepolia embutida: SIM (1 ficheiro)»). +2 testes, mutante M10 → **10/10 mortos**.
- Rebuild: `build:apk` ✓ («chave RPC Sepolia embutida: não») → Gradle ✓ (trava corre, **45 s**).

### AAB v7 final — provas (sobre o `.aab` extraído)
| prova | resultado |
|---|---|
| guarda `validar-dist-rede.mjs` | **exit 0**, «coerente com PRODUÇÃO» |
| `VITE_CHAIN_ID` embutido | `` `1` `` |
| contrato | `0x0052477A8CA81BCAF4a60e21e635F9e00a5d16cd` |
| Supabase | `https://vjslwowwrpcawijdiksm.supabase.co` + anon presente |
| Sentry | DSN presente (95 chars, `…ingest.us.sentry.io`, igual ao Netlify) |
| URLs Sepolia Alchemy com chave | **0**; `VITE_RPC_URL_SEPOLIA` no bundle: **0** |
| versionCode | 7 |
| ícone | `mipmap-anydpi-v26/ic_launcher(.round).xml` presentes; foreground = mão aberta |
| assinatura | `jar verified.`; certificado SHA-256 `85:44:BC:…:17:29` **= v6** |
| ficheiro | `Desktop\DesafioGUT-v7\DesafioGUT-v7.aab` · 32 441 504 B · SHA-256 `3744e6bb76bfeeb6133a95769f26d8e5db374bc5642ca86713eb8efda3a23366` (= artefacto do Gradle; 3.ª compilação, depois da correcção ⚠️2 do validador) |

Suíte final: **frontend 1296/1296 · backend 1442/1448 · VERDE** (1296 = 1270 + 26).

## SEG4 · Validador adversarial — APROVADO COM RESSALVAS (`UTAC123_SEG4_VALIDADOR.md`)
- ⚠️1 **confirmado por mim** (hash `28cd3803288c` nas duas): a chave «de Sepolia» é a MESMA do RPC de mainnet de produção.
  Rodá-la parte a web e os AAB v3-v7 ⇒ a recomendação «rodar a chave» do UTAC122 estava **errada**; corrigida na DEBT-082
  (allowlist de origens na Alchemy primeiro; rotação só coordenada com deploy web + v8).
- ⚠️2 **confirmado e corrigido**: `subscribeLanceDado`/`subscribeSaldoSenhas` (síncronos, chamados no useEffect do
  AppContext:732/827) deixavam o fail-fast subir ao ErrorBoundary ⇒ ecrã de erro em `npm run dev` sem env. Agora
  `contratoLeituraOuNull()` (try/catch → null + aviso) e unsubscribe vazio. +3 testes, mutantes M11/M12 ⇒ **12/12**.
  Por mudar o bundle, o v7 foi **recompilado** (3.ª vez): guarda ✓, Gradle ✓ 44 s, verificação refeita (acima).
- ℹ️ registados: chave em 10 ficheiros rastreados fora do bundle; env inteiro embutido (risco estrutural — toda a VITE_*
  nova no Netlify entra no APK); regex só cobre Alchemy-Sepolia; o gancho contorna-se com `-x`/`GUT_PERMITIR_TESTNET=1`;
  `package-lock.json` reescrito pelo `netlify build` (não commitado); ícone 512 da ficha = Play Console; inset não testado em aparelho.

### Link de download — NÃO gerado
O envio para `litterbox.catbox.moe` (método do UTAC119) foi **bloqueado pelo classificador de permissões** do
Claude Code (categoria «Data Exfiltration»). Não contornado. O operador pode gerá-lo no terminal (comando no relatório).
