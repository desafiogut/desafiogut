# UTAC132.1 — RELATÓRIO · DEBT-088 (frase de recarga do CardLance) + AAB v9 final

Opus 5.5 · 2026-11-06 · baseline `50598a6` · commit `c5cfb74` (+ fecho).
**Pedido do operador:** tirar «Saldo R$ insuficiente. Recarregue via PIX.» do `CardLance` com a flag de build do UTAC132, pô-la na lista de recusas do guarda do Gradle e regerar o AAB v9.

## Feito
- `CardLance.jsx`: `const APK_BUILD = import.meta.env.VITE_IS_ANDROID_APP === "true"`; `saldo_insuficiente: APK_BUILD ? "Saldo insuficiente para este lance." : "Saldo R$ insuficiente. Recarregue via PIX."`.
  ⚠️ **Escolha minha, declarada:** o texto do APK. Tirar a chave não chegava: o servidor ainda emite `saldo_insuficiente` no ramo Flash (`lance-relampago.mjs:278`) e o fallback mostraria o `message` dele («saldo R$ X < valor R$ Y», `saldoRs.mjs:178`).
- `validar-dist-rede.mjs`: a frase entra em `STRINGS_PROIBIDAS_APK` (o guarda corre no `build:apk` e no `preReleaseBuild` do Gradle).
- Testes `utac132` +2. Mutação **3/3 RED** com md5 restaurado (M10 CardLance sem corte · M11 guarda sem a frase · M12 R$ na mensagem do APK).
- Controlo positivo com o artefacto real: o guarda novo **recusa** o AAB v9 anterior (`f258d0c7`, frase em `CardLance-pPJbCnsO.js`), exit 1.
- Suíte **frontend 1320/1320 · backend 1456/1462 VERDE**.

## AAB v9 final (substitui `f258d0c7…`)
`C:\Users\Moltbot\Desktop\DesafioGUT-v9\DesafioGUT-v9.aab` · 32 438 270 B · SHA-256 `e79866dede7ac8cbe6e11add0c9692799a0bf161ed2a02709c64cb5ee34cde95`
versionCode **9** (bundletool) · certificado `85:44:BC:E8…17:29` = v8 · `jar verified.` · `validarAmbienteProducao` no Gradle · guarda exit 0 sobre o `.aab` extraído.
grep no AAB inteiro: «Depositar PIX» 0 · «Saldo Disponível» 0 · «Saldo R$ insuficiente. Recarregue via PIX.» 0 · «Recarregue via PIX» 0. Controlo positivo: «Saldo insuficiente para este lance.» em `CardLance-BUZQ-jtc.js`.

## DEBT-088 — NÃO está toda fechada
Ainda vão no AAB final (medido):
- «⚠️ Não foi possível ler o saldo R$ agora.»: `MinhaCarteira` (fora do `depositoPix`);
- «Saldo insuficiente. Carregar agora?»: toast da `MinhaCarteira:249`;
- «Confirmação de depósito PIX»: `i18n/pt.js:53` (`config.notifPix`, Configurações).
«Carregar PIX →» (`SemSaldoBanner`) **já não está** no bundle.

## Correcção ao relatório do UTAC132
Escrevi «frontend 1318/1318 (eram 1303, mais 15 novos)». **Está errado:** a baseline era **1306** (o UTAC131 juntou `utac131-assetlinks`) e o UTAC132 acrescentou **12** testes. 1318 está certo.

Web: sem deploy. No site a flag não existe e o texto fica igual.
