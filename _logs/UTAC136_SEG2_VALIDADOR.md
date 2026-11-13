# UTAC136 — SEG2 · Validador adversarial

**Veredicto: APROVADO COM RESSALVAS.** Encontrei um defeito real (⚠️) na conversão automática. Corrigi-o no meu worktree, no commit **`aab3068`** (local, por cima de `9936e9e`, sem push). As restantes tentativas de refutação falharam. Ficam notas ℹ️.

Worktree: `C:/Users/Moltbot/tmp-utac136-val/wt`. Testes: `cd desafio-gut/frontend/netlify/functions && node --test --experimental-test-module-mocks _tests/<f>.test.mjs`.

---

## ⚠️ 1 — `k` da conversão contado com buracos bloqueava o endereço para sempre (CORRIGIDO, `aab3068`)

**Defeito.** O `proximoK` em `_lib/conversao-eco-passe.mjs` era calculado como «nº de entradas `conversao-passe` + 1». Uma conversão desfeita remove a sua entrada do histórico (`reverterEcoQuildo`). Se outra conversão concorrente já tinha usado o `k` seguinte, fica um buraco:
- a conversão A usa k=1, debita e fica presa no passo 4 (inventário);
- a conversão B lê o histórico com k=1 lá dentro e usa k=2, que tem sucesso;
- A falha e desfaz k=1. O histórico fica `[eco-conversao:2]`.

A partir daí `proximoK` = 1 + 1 = 2, e essa ref já existe. O débito devolve `criado:false` e o ciclo faz `continue`. Isto repete-se nas 300 voltas (`MAX_VOLTAS`), com cerca de 600 leituras ao Supabase. O resultado final é `{ok:true, convertidos:0}`, **sem alerta**. Todas as conversões seguintes desse endereço caem no mesmo, para sempre. Viola o Art. 23º («conversão automática e imediata») e multiplica a carga no DB em cada crédito de ECOQUILDO desse utilizador.

**Reprodução.** Adicionei o teste `SEG2 · conversão desfeita ao lado de outra concorrente não bloqueia as conversões seguintes` a `_tests/utac136-conversao-eco-passe.test.mjs`. Um gancho no RPC `passes_creditar` força a ordem descrita. Corrido contra o código de `9936e9e`:
```
✖ SEG2 · conversão desfeita ao lado de outra concorrente não bloqueia as conversões seguintes
  AssertionError [ERR_ASSERTION]: {"ok":true,"convertidos":0,"saldo":50}
    actual: [ true, 0, 50 ],   expected: [ true, 1, 0 ]
ℹ pass 11  ℹ fail 1
```
**Correcção.** `proximoK` passa a ser o **maior** `k` presente + 1. Esse valor nunca colide com uma ref que exista. Depois da correcção: `ℹ pass 12 ℹ fail 0`.

**Mutantes** (aplicados com sed e restaurados; md5 `cad629d3…` igual antes e depois):
- voltar à contagem: `pass 11 / fail 1`, RED;
- `k < max` em vez de `k > max`: `pass 8 / fail 4`, RED.

**Suíte completa** (corrida 1 vez): `tests 1465 · pass 1456 · fail 2 · skipped 7`. As 2 falhas são de ambiente e não têm a ver com o UTAC. `biconomy-handshake` e `mc302-integracao` dão `ERR_MODULE_NOT_FOUND '@aws-sdk/client-kms'`, porque este worktree não tem `desafio-gut/frontend/node_modules` (só existe a junction de `functions/node_modules`). Essas 2 falhas tiram 16 testes da contagem: 1471 − 16 + 1 novo = 1456.

---

## Tentativas que NÃO refutaram

1. **O Passe ainda dá pontos de lance?** Não.
   - `grep -rn "PONTOS_LANCE_POR_PASSE_RELAMPAGO\|creditarPontosLanceDoPasse"` fora de `_tests`: a constante e o helper `creditarPontosLanceDoPasseRelampago` (`ledger-lance.mjs:159`) não têm nenhum chamador de produção.
   - A cadeia PIX e a Google (`creditarBeneficios`, `completarPendentes`, retry a meio, quantidade 5 do recibo) estão cobertas por asserções `lance() ?? 0 === 0` nos testes 110i1 e 110n (B1/B2/B3, G1), e todas passam.
2. **Conversão.**
   - Emissores de ECOQUILDO (grep a `creditarEcoQuildo(`): só a compra de Passe, a indicação (2 chamadas) e o admin, e os três convertem.
   - Concorrência com 10× `Promise.all`: exactamente 2 Passes (teste T4).
   - Lastro: `aplicarLastro` recusa `emitido < usado` e deriva sempre a reserva.
   - Sem ciclo: `creditarPasse` não emite ECOQUILDO.
   - Saldo nunca negativo: `aplicarMovimento` e `reverterEcoQuildo` recusam.
   - Reversões dos passos 2, 3 e 4 testadas, com alerta.
   - Defeito restante: a colisão de `ref` descrita em ⚠️1.
3. **Palpite.** Não consome Passe (teste `utac136-palpite-gratis`: inventário a 0 dá 201). Não há palpites ilimitados: `palpites` tem UNIQUE (endereço, edição), o repetido dá 200 idempotente e há rate-limit de 10.
4. **Testes enfraquecidos / âmbito.**
   - As inversões em 110d, 110i1, 110n, 120 e 129 trocam valores pelos do v6 e mantêm asserções concretas (`=== 0`, `doesNotMatch` sobre o código sem comentários). Não encontrei nenhuma asserção vácua.
   - O diff toca só `netlify/functions` e `_logs`: nada em `src/`, sem migração e sem AAB.
   - O executor não concebeu nada fora do pedido, para além do campo opcional `passesConvertidos` na resposta.
5. **Cliente v9.**
   - `grep -rn pontosLance src/` não encontra nenhuma leitura de `pontosLance` da resposta da compra. `useComprarPasse.js` lê `creditosLance`, que continua a 0.
   - `sem_passes_disponiveis` não é lido em `src/`.
   - O import dinâmico em `fontes-lance.mjs` mantém o grafo do lance. O teste `utac110h4-grafo` está verde.

---

## ℹ️ Notas (não corrigidas: fora do âmbito, decisão do operador, ou risco já declarado)

- **ℹ️ A — Compras antigas a meio.** O `quantidadeJaCreditada` divide por 1. Uma compra pré-v6 que tenha ficado a meio (10 ou 50 pontos, sem ECOQUILDO) seria completada com 10× ou 50× ECOQUILDO. O executor mediu 0 compras a meio em produção, por isso o risco é só de transição. Nas compras antigas completas só muda o campo `quantidade` da resposta idempotente (cosmético).
- **ℹ️ B — Crédito de admin idempotente não converte.** O caminho `criado:false` de `creditar-eco-quildo` responde sem chamar a conversão. Se a conversão do 1.º pedido tiver falhado, o retry não a refaz; fica para o próximo crédito de ECOQUILDO desse endereço.
- **ℹ️ C — Corrida teórica, não reproduzida.** O cenário: a compra A converte ECOQUILDO enquanto a compra B, concorrente, tem o lastro a falhar e reverte a sua emissão. A reversão de B pode dar `REVERSAO_INVALIDA` (saldo já convertido), o que deixa 1 ECOQUILDO sem emissão no lastro. É a mesma classe de corrida que já existia com `usar-eco-quildo`. Há alerta (`*_reversao_falhou`). Exige uma falha do DB a meio, em concorrência.
- **ℹ️ D — Crash a meio da conversão.** Um crash entre os passos 1 e 4 deixa a conversão a meio, porque o inventário não tem `ref`. Este limite está declarado no ficheiro (mesmo limite do UTAC120).
- **ℹ️ E — Consequências do Regulamento, não do código.**
  - O palpite gratuito só exige uma linha em `pontos`, que qualquer login cria. Várias carteiras podem palpitar a custo zero (multi-conta).
  - Os 18 ECOQUILDO existentes passam a valer R$ 0,50 cada.
  - A reserva de produção tem de ser recalculada (R18-136-3, operador).
- **ℹ️ F — Teste vermelho de propósito.** O teste de guarda `utac110j5 «P»` do frontend fica vermelho de propósito (o v9 mostra 10 pontos). Isto está declarado no commit; resolve-se no UTAC do AAB v10.

**Commits do validador:** `aab3068`, só local, ficheiros nomeados: `_lib/conversao-eco-passe.mjs`, `_tests/utac136-conversao-eco-passe.test.mjs`.
