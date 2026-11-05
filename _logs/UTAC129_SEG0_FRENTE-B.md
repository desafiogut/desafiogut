# UTAC129 — SEG0 · Frente B (bónus de boas-vindas, R18-129-1: 50 pontos)

| Passo | Resultado medido |
|---|---|
| Correcção | `_lib/fontes-lance.mjs`: `PONTOS_BOAS_VINDAS = 50`, `REF_BOAS_VINDAS = "boas-vindas"`, `creditarBoasVindas()` (ledger real, idempotente por ref + CAS). `auth-user.mjs`: chamada depois do registo de presença, fail-soft (`.then`/`.catch`), sem bloquear o login |
| ⚠️ Ordem PoC (declarado) | o teste foi escrito logo **depois** da correcção, não antes. O RED do estado original fica provado pela mutação M2 (= sem chamada, igual ao código de antes) |
| Bidirecional | B1 positivo (conta nova → 200 + 50) · B5 negativo (assinatura de outra carteira → 401, 0 pontos) · B6 fail-soft (DB em baixo → login 200, bónus no próximo login) |
| Idempotência / concorrência (gate do tipo produto) | B2 3 logins → 1 entrada · B3 **10 logins em `Promise.all`** → 1 entrada, 50 pontos · B4 soma a saldo existente uma só vez |
| Mutação | M2 sem chamada → **5 RED** · M3 ref variável → **4 RED** · M4 sem `.catch` → **1 RED** · restauro **md5 idêntico** |
| Regressão (todos os testes que tocam fontes-lance/auth) | 16 ficheiros, 0 falhas |
| Declarado | contas que já existiam recebem os 50 no próximo login (uma vez), porque a regra é «uma vez por conta». O ECOQUILDO de boas-vindas (Art. 51º) continua manual (fora do escopo) |
