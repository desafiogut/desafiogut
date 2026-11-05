# UTAC130 — SEG2 · AAB v8 corrigido (sobrescreve o v8 do UTAC129, autorizado pelo operador)

| Passo | Resultado |
|---|---|
| RAM | 1.ª tentativa: ~1 150 MB estável, mesmo depois de fechar Edge, WhatsApp e M365 Copilot (as WebView2 dele estavam com ~1 GB) ⇒ build **não** feito, escalado ao operador («Eu liberto mais RAM»). Retoma: o Edge tinha voltado (675 MB); fechado ⇒ **1 718 MB** |
| `npm run build:apk` (commit `f3a86a3`) | exit 0 · Netlify Build Complete · «✓ bundle coerente com PRODUÇÃO (mainnet)» · `cap sync` OK |
| `gradlew bundleRelease` (JDK 21 jbr; RAM 1 569 MB) | `> Task :app:validarAmbienteProducao` ✓ · **BUILD SUCCESSFUL in 46s** |
| Verificação ANTES de sobrescrever | guarda sobre o `.aab` extraído: exit 0 · tile «Carteira» presente · «Saldo (R$)» no Início: **0** · trava do lance: 0 · `desafiogut.com`: 0 · versionCode **8** · certificado SHA-256 `85:44:BC:E8…17:29` (= v7/v8 anteriores) · `jar verified` |
| Artefacto | `C:\Users\Moltbot\Desktop\DesafioGUT-v8\DesafioGUT-v8.aab` · 32 441 472 B · SHA-256 **`348d1398873a085e60e50797af9bf4e57e406ad4359bed9037af3f2f536fb32b`** |
| v8 anterior (UTAC129, `40934701…`) | movido para fora da pasta de entrega (scratchpad), para não haver dois AAB com versionCode 8 ao lado um do outro |

## 2.º build — depois das correcções do SEG4 (commit `cdea860`), substitui o anterior
| Passo | Resultado |
|---|---|
| Suíte em `cdea860` | **frontend 1303/1303 · backend 1456/1462 VERDE** |
| RAM | 1 082 → 1 213 MB depois de fechar o OneDrive (o operador fechou o resto). **Excepção à ressalva A14 dada pelo operador** («pode compilar» / «libere ram»); o Gradle correu com 1 422 MB |
| `npm run build:apk` | exit 0 · «✓ bundle coerente com PRODUÇÃO (mainnet)» · `cap sync` OK |
| `gradlew bundleRelease` | `validarAmbienteProducao` ✓ · **BUILD SUCCESSFUL in 46s** |
| Verificação antes de sobrescrever | guarda sobre o `.aab` extraído exit 0 · «Saldo (R$)» no Início 0 · «X / 50» de cartão 0 · trava do lance 0 · `desafiogut.com` 0 · versionCode 8 · certificado `85:44:BC:E8…17:29` · `jar verified` |
| **Artefacto final** | `C:\Users\Moltbot\Desktop\DesafioGUT-v8\DesafioGUT-v8.aab` · 32 441 438 B · SHA-256 **`222e30650b2fe09d166eb85060600682e357618099d3cf11d77f7b0a02f2fb24`** |
| Substituídos (fora da pasta de entrega, no scratchpad) | `40934701…` (UTAC129) e `348d1398…` (1.º build do UTAC130, ainda com o «0» falso) |
