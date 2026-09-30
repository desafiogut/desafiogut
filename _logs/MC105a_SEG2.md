# MC105a — SEG2 · Frente C: testes end-to-end do backend (2026-09-30)

## 2.1/2.2 `_tests/mc105a-e2e.test.mjs` (15)
Corre o **handler real**, com o **`_lib/saldoRs.mjs` real** (CAS do débito e reembolso), o `_lib/passe.mjs` real, o JWT
real (jose) e o rate-limit, o kill switch, as edições e o catálogo reais.
Só o I/O é duplo:
- `@netlify/blobs` → `_blobs-cas-duplo.mjs`;
- o cliente Supabase → `_supabase-duplo-mc105a.mjs` (`saldo_rs*` + `passes`);
- o Sentry é espiado.

| # | cenário | prova |
|---|---|---|
| E1 | compra válida | 201, passe do titular, saldo 500 → 300 |
| E2 | compra 2× | 200 idempotente, 1 passe, 1 débito, e **a 2.ª compra nem toca no saldo** |
| E3 | corrida (outro pedido cria o passe entre a verificação e o INSERT) | reembolso, 200 com o existente, saldo final = um só débito |
| E4 | saldo R$ 1,99 | 402, nada criado, saldo intacto |
| E5 | sem saldo · saldo exacto R$ 2,00 | 402 · 201 e fica 0 (nunca negativo) |
| E6 | o saldo cai entre a leitura e o débito | o CAS recusa: 402, nada criado, saldo ≥ 0 |
| E7 | sem token · forjado · `lance-auth` | 401 × 3; nada debitado |
| E8 | corpo inválido | 400 × 3 |
| E9 | edição inexistente/Relâmpago/encerrada/terminada/por abrir | 404/409; nada debitado |
| E10 | produto não vinculado/inexistente/não activo | 409/404/409 |
| E11 | o INSERT falha | 502 `reembolsado:true`, saldo reposto, sem alerta |
| E12 | o INSERT falha **e** o reembolso falha | 502 `reembolsado:false`, 1 alerta **sem endereço**, débito por reconciliar |
| E13 | `endereco` de terceiro no body | ignorado; o passe é do titular do token |
| E14 | OPTIONS, GET, kill switch (`state={status:"paused"}`), rate-limit por IP | preflight, 405, 503, 429 |
| E15 | P10 | nenhum log (handler + saldoRs + passe) tem o endereço completo; há controlo de que houve logs |

## 2.3 Mutação: `scripts/mc105a-prova-mutacao.mjs` → **21/21 PROVADOS**
Controlo 23/23 VERDE; cada mutante confirmado a entrar; md5 restaurado nos 2 ficheiros.
- **Frente A:** A1–A6.
- **Frente B:** B1 sem verificação de idempotência · B2 corrida sem reembolso · B3 402→502 · B4 aceita não-Programada ·
  B5 sem janela · B6 produto não vinculado · B7 produto não activo · B8 preço 100 · B9 201→200 · B10 sem rate-limit ·
  B11 sem kill switch · B12 endereço no log · B13 endereço no alerta · B14 `reembolsado` mentiroso · B15 aceita qualquer token.

## Erros dos meus instrumentos (declarados)
1. O E14 aceitava «503 **ou** 201» no kill switch, por isso não provava nada; e a chave estava errada (`estado` em vez
   da real `state` com `{status:"paused"}`). Passou a exigir 503.
2. O E11/E12 liam `corpo.reembolsado`, mas o `jsonError` põe os extras dentro de `error`.
3. O E12 injectava a falha do reembolso contando chamadas ao `saldo_rs` pela ordem errada: o reembolso passava.
   Passou a ligá-la na 2.ª chamada a `passes` (o INSERT, depois do débito).
4. Sem a asserção «a 2.ª compra nem toca no saldo», o B1 seria mascarado pela compensação (o saldo final é igual).

## Suíte
frontend **530/530** · backend **865/871** (842 + 23) · VERDE.
