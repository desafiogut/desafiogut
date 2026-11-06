# UTAC132.2 — RELATÓRIO · DEBT-088 fechada (os três textos restantes) + AAB v9 limpo

Opus 5.5 · 2026-11-06 · baseline `7b386b6` · commit `926ab6f` (+ fecho).
**Pedido do operador:** «limpa os três e regera o v9».

## Feito (todos com a flag `VITE_IS_ANDROID_APP` do UTAC132)
| Texto | Onde | Corte |
|---|---|---|
| «⚠️ Não foi possível ler o saldo R$ agora.» | `MinhaCarteira.jsx` | `{depositoPix && saldoRsStatus === "error" && …}`: o saldo R$ só existe com `depositoPix` e o erro da sua leitura também |
| «Saldo insuficiente. Carregar agora?» (toast) | `MinhaCarteira.jsx:250` | `depositoPix ? "…Carregar agora?" : "Saldo insuficiente."` (igual ao `setErroPasse` ao lado) |
| «Confirmação de depósito PIX» | `i18n/pt.js` + `Configuracoes.jsx` | a chave entra por spread condicional (o dicionário vai inteiro para o bundle, por isso cortar só o uso não chegava); o interruptor sai da lista no APK |
- O guarda `validar-dist-rede.mjs` tem os três na lista de strings proibidas (6 no total).
- No site nada muda (flag ausente) ⇒ **sem deploy web**.

## Provas
- `vite build` com e sem flag: os 6 textos → **0 no APK**, presentes no site; os textos vizinhos («Resultado do vencedor», «Notificações») continuam nos dois.
- Testes `utac132` +5 (19 no ficheiro); mutação **5/5 RED** com md5 restaurado (M13-M17).
- Suíte **frontend 1325/1325 · backend 1456/1462 VERDE**.
- Controlo positivo do guarda: recusa o v9 anterior `e79866de` (exit 1, os três textos nomeados).

## AAB v9 limpo (substitui `e79866de…`)
`C:\Users\Moltbot\Desktop\DesafioGUT-v9\DesafioGUT-v9.aab` · 32 438 215 B · SHA-256 `90661aae4b1a7ccc4dc8528680729c96a8e624f09e3eb7f2b1fdb19f2c85872a`
versionCode **9** · certificado `85:44:BC:E8…17:29` = v8 · `jar verified.` · `validarAmbienteProducao` ✓ · BUILD SUCCESSFUL in 47s (RAM 1 628 MB).
grep no AAB inteiro: as 6 frases da lista + «Carregar PIX» → **0**. Controlo positivo: «Saldo insuficiente para este lance.», «Resultado do vencedor», «Comprar Passe Desafio» presentes. Guarda exit 0 sobre o `.aab` extraído.

## O que fica com PIX no AAB (não é DEBT-088)
Texto legal (Regulamento/Privacidade), ecrãs de admin («Receita PIX»), pagamento de **produto físico** («Pagar Produto via PIX»), ícones do SDK do Privy. ⚠️ Não observado num aparelho.
