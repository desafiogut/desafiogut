# UTAC111 — SEG3 validador adversarial (subagente, worktree próprio sobre f45408e + os 16 ficheiros copiados)

**Veredicto: APROVADO COM RESSALVAS — 0 bloqueantes.** Transcrito do relatório do validador (substância inalterada).

Reproduzido por execução: testes novos 10/10 + 22/22; mutação 14/14 (md5 idêntico); suíte 1249/1249 · 1402/1408;
0 `ethers` no grafo esbuild de iniciar/confirmar/webhook; Carteira RENDERIZADA com `@capacitor/core` duplo nos dois
sentidos (nativo: sem «Depositar PIX»; web: presente); comprador do token, valor só do pedido, `produtoId`/`paymentId`
dentro do JWT assinado; produto nunca credita saldo; webhook+consulta seguros pelo CAS; cota/depósito intactos.

Achados:
1. ⚠️ Dois PIX pagos para o mesmo pedido: o 2.º era engolido em silêncio (sem registo nem alerta).
2. ⚠️ Pagamento depois dos 15 min do JWT fica órfão (o MP não tem `date_of_expiration`; o webhook nunca disparou).
3. ⚠️/ℹ️ No APK ainda aparecia texto a falar de depósito PIX (`MinhaCarteira.jsx:592` e a mensagem do 402).
4. ℹ️ 3 mutantes dele sobreviviam: X1 dono em `marcarPedidoPago`, X3 `!produtoId` no `confirmar`, X5 valor 0.
5. ℹ️ Só o webhook confere o `transaction_amount` do MP (o `confirmar` usa o valor do nosso JWT — seguro, inconsistente).
6. ℹ️ O `iniciar` não recusava pedido já enviado (só o cliente o escondia).
7. ℹ️ Mínimo do PIX do MP não verificável offline.

## Tratamento pelo executor (pós-veredicto, NÃO re-validado por 2.ª ronda)
- **1:** `marcarPedidoPago` devolve `pagamentoDuplicado` quando chega outro `paymentId` para um pedido já pago; o webhook
  e o `confirmar` disparam o alerta `pix_produto_pago_em_duplicado` (o dinheiro tem de ser devolvido à mão). Teste V1 + M16.
  **Reutilizar o PIX pendente (evitar o 2.º QR) fica como decisão do operador.**
- **2:** NÃO corrigido — alinhar a expiração mexe no provider partilhado com o depósito de saldo → decisão do operador.
- **3:** o texto do depósito e o convite do 402 passam por `depositoPix`. Guarda + M20.
- **4:** testes V3/V4/V5 + M17/M18/M19 → mortos.
- **6:** `iniciar` responde 409 `pedido_ja_enviado`. Teste V6 + M15.
- **5/7:** declarados.
Mutação final **20/20**; suíte final **frontend 1250/1250 · backend 1407/1413 VERDE** com RAM 1 692 MB (A14 cumprido).
Worktree do validador (`.claude/worktrees/agent-ac2550abe8c92ac81`) fica em disco (tem ficheiros copiados; junctions já removidas) — não forçado.
