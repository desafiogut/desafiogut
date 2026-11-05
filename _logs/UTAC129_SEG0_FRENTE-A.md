# UTAC129 — SEG0 · Frente A (lance sem Passe; R18-129-3: palpite intacto)

| Passo | Resultado medido |
|---|---|
| PoC (teste novo contra o código ANTES) | `utac129-lance-sem-passe` **2/5 · 3 RED**, todos `400 sem_passes_disponiveis` |
| Correcção | `lance-relampago.mjs`: bloco `consumirPasse` + 400/502 removido (era l. 247-259); import `consumirPasse` retirado; `passeConsumido` fica `false` e os ramos de devolução ficam inertes (GATE 4) |
| Teste do UTAC120 que codificava a trava | `utac120-inventario.test.mjs` (o teste do LANCE): invertido para «NÃO consome»; o do PALPITE fica igual |
| Bidirecional | A1 positivo (5 pontos grátis → lance de 1 → 201 + missão +10, saldo 14) · A3 negativo (pontos insuficientes → 400 `saldo_pontos_insuficiente`) · A4 inválido (0 → 400, sem débito) · A2 inventário nunca chamado · A5 palpite continua a consumir Passe |
| A/B (mesmos dados) | ANTES: 400 `sem_passes_disponiveis` · DEPOIS: 201 `missaoLance {creditado:true}` |
| Mutação M1 (repor a trava) | `utac129` **3 RED** · `utac120` **1 RED** · restaurado **md5 idêntico** `69cfce54…` |
| Regressão (ficheiros do lance) | utac129 5/5 · utac120 8/8 · utac110f-lance-missao 6/6 · utac110n-pontos-lance 39/39 · mc9112 10/10 · mc941 7/7 · utac107e2 23/23 |
