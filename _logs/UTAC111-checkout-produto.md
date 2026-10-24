# UTAC111 — Checkout PIX do produto físico + depósito PIX fora do APK + «prêmio»→«produto»

Baseline `f45408e` · Skill UTAC (tipo `produto`) · SEG-1: `_logs/UTAC111_SEG-1_MEDICAO.md` (AJUSTAR → R18-111-A/B/C).
**Sem commit nem push** (o enunciado proíbe sem autorização).

## SEG0 — Frente A (R18-111-A)
`src/pages/MinhaCarteira.jsx`: `const depositoPix = !androidNativo();` (a PONTE nativa, como o `useComprarPasse`
do UTAC110i.2 — nunca `?plataforma=`). As 3 portas do depósito passam por ela: o botão «💰 Depositar PIX», o atalho
«Carregar agora (PIX)» do aviso 402 e o `aberto` do `ComprarFichasModal`. O PWA não muda (o render de
`utac106c-carteira-render` continua a ver o botão). O saldo R$ continua visível nos dois.

## SEG1 — Frente B (checkout) e Frente C (terminologia)
**Backend** (o valor sai SEMPRE do pedido no servidor; o comprador sai do token):
- `iniciar-pagamento.mjs` — ramo isolado `body.tipo === "produto"` (`iniciarPagamentoProduto`): Bearer user-session,
  `lerPedido(produtoId)`, dono (outro → 404), já pago → 409, `valorPagoCentavos` inteiro > 0 → PIX de
  `valorPagoCentavos/100` (14 → R$ 0,14), `external_reference` = pedidoId novo, meta `tipo:"produto"` + `produtoId`,
  JWT com `tipo/produtoId/paymentId`. O depósito de saldo (sem `tipo`) ficou igual. Grafo do esbuild sem `ethers` (MC88.16).
- `_lib/pedidos.mjs` — `marcarPedidoPago(produtoId, {endereco, valorCentavos, paymentId, fonte})` por `atualizarPedido`
  (CAS): dono, idempotente (não reescreve `pago_em`), valor tem de ser IGUAL a `valorPagoCentavos`; grava `pago_em` +
  `pagamento`, evento `pagamento_aprovado`.
- `webhook-mercadopago.mjs` — `meta.tipo === "produto"` → `marcarPedidoPago` com o `transaction_amount` APROVADO;
  nunca credita saldo; falha → alerta Sentry `webhook_mp_produto_falhou`.
- `confirmar-pagamento.mjs` — mesmo ramo (fallback do webhook, R18-111-C); token de produto sem `paymentId` → 400
  (o caminho do mock, que confia no JWT, nunca marca um produto como pago).
- `_lib/meta.mjs` — campo aditivo `produtoId` (**extensão de escopo declarada**: não estava na lista AUTORIZA, mas o
  webhook só recebe o `external_reference` e precisa de saber que pedido marcar).
- `confirmar-pagamento.mjs` também **fora da lista AUTORIZA** — coberto pela decisão R18-111-C (declarado).

**Frontend:**
- `src/lib/pedidos.js` — `precisaPagarProduto` (dono, sem `pago_em`, ANTES do envio, valor válido) e `rotuloDoPedido`
  («Aguardando pagamento» → «Pago — aguardando envio»). `estadoDoPedido`/`ROTULO_ESTADO` intactos (admin intacto).
- `src/hooks/usePagarProduto.js` — POST `iniciar-pagamento` com Bearer e só `{tipo, produtoId}`; sonda
  `confirmar-pagamento` a cada 3 s (402/429/502 continuam; 401 → «O PIX expirou»); guarda de corrida por `useRef`.
- `MeusPedidos.jsx` — `PagarProduto` dentro do cartão: texto do enunciado, «Valor a pagar: R$ 0,14», botão tingido
  amarelo 48 px «Pagar Produto via PIX», QR + copia-e-cola, «✓ Produto adquirido com sucesso.»; a linha passa a
  «valor do lance» enquanto por pagar.
- **Frente C:** 0 textos visíveis com «prêmio» em `src/`; renomeadas as 2 chaves `edicao.especial.premio*` →
  `edicao.especial.produto*` (`pt.js` + `CardEdicaoEspecial.jsx`). O teste 5a do UTAC110j fixava o nome antigo —
  actualizado mantendo a invariante e com o texto antigo à vista.

## SEG2 — Verificação
- Testes novos: backend `_tests/utac111-pix-produto.test.mjs` **10/10**; frontend `utac111-pagar-produto` **6/6** e
  `utac111-carteira-sem-pix-apk` **4/4**.
- **Erro meu apanhado pela suíte:** a 1.ª versão da regra pedia pagamento também a pedidos JÁ ENVIADOS (2 testes do
  MC102 caíram). Corrigida a regra, não os testes.
- Mutação `scripts/utac111-prova-mutacao.mjs`: **14/14 PROVADOS**, restauro md5 idêntico.
- Suíte canónica: **frontend VERDE 1249/1249** (era 1239) · **backend VERDE 1402/1408** (era 1392/1398).
  ⚠️ A14: RAM no arranque da corrida **1 249 MB** (< 1 500, desvio declarado); a contagem fecha com os +10/+10 novos.

## Pendências declaradas
- **Mínimo do PIX do MP NÃO medido** (R18-111-B): falta o teste real de R$ 0,14 pelo operador, depois do deploy.
- O webhook continua sem `notification_url` no `POST /v1/payments` e sem registo confirmado no painel (MC101).
- `src/pages/admin/Pedidos.jsx` não mostra o estado de pagamento (fora do escopo).
- O APK só recebe a Frente A com um AAB novo (o frontend vive dentro do .apk).

## SEG3 — Validador adversarial: APROVADO COM RESSALVAS, 0 bloqueantes
Ver `_logs/UTAC111_SEG3_VALIDADOR.md`. Tratados 1 (alerta), 3, 4, 6; abertos para o operador: 1 (reutilizar PIX pendente)
e 2 (expiração MP vs JWT de 15 min). Final: mutação **20/20**, backend 15/15 + frontend 11/11 nos testes novos,
suíte **1250/1250 · 1407/1413 VERDE** (RAM 1 692 MB).

## SEG4 — Decisões do operador no fecho (2026-10-24) e correcções
- **R18-111-D** — reaproveitar o PIX pendente: `pedido.pixPendente` (gravado por CAS em `guardarPixPendente`). O botão
  devolve o MESMO código enquanto o MP o der como pendente (`pending`/`in_process`/`authorized`) ou não responder, e
  faltarem > 2 min; aprovado → marca pago e 409; cancelado/rejeitado/expirado → gera novo. Corrida: se outro pedido
  guardou primeiro um PIX válido, devolve esse. `marcarPedidoPago` limpa o `pixPendente`.
- **R18-111-E** — expiração real: o PIX do produto leva `date_of_expiration` = +24 h (fuso de Manaus, formato do MP) e o
  JWT de confirmação dura até lá; o hook pára de sondar no `validUntil`. **O depósito de saldo não muda**: o parâmetro
  `expiraEmMs` do provider é opcional e o corpo do depósito fica byte-igual (teste E5 + mutante M26).
- **R18-111-F** — mínimo do MP: fica R$ 0,14; se o MP recusar no teste real, fallback a decidir (ex.: R$ 1,00 + troco em saldo).
- **R18-111-G** — `confirmar-pagamento.mjs` e `_lib/meta.mjs` fora da lista: **autorizados** pelo operador.
- **Defeito meu apanhado pelo teste E2:** com o PIX pendente CANCELADO mas ainda dentro do prazo, o `guardarPixPendente`
  recusava substituí-lo e o servidor devolvia o código cancelado. Corrigido com o parâmetro `descartado`.
- `_lib/pix-provider/mercadopago.mjs` alterado (partilhado com o depósito) — só por adição, guardado por E5/M26.
- Testes: backend **21/21**, frontend **7/7 + 5/5**; mutação **27/27**; suíte **frontend 1251/1251 · backend 1413/1419
  VERDE** (RAM 1 912 MB); grafo do `iniciar-pagamento` sem `ethers`.
- As correcções do SEG4 **não passaram por 2.ª ronda do validador** (declarado).
