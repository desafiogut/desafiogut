# UTAC111 — SEG-1 (medição) — veredicto: AJUSTAR (4 conflitos escalados ao operador)

Data: 2026-10-24 · Skill: `desafio-gut/frontend/skills/utac/` (SKILL.md, comandos.md, seg-1.md, types/produto.md lidos)
Zero código alterado.

## -1.0 Portão A14 (RAM)
- Arranque: 440 · 564 · 620 · 614 MB (< 1 500) → PARADO e escalado.
- Operador: «Fecho o necessário». Fechados os 5 servidores MCP **desta sessão** sem uso (tapsite, sportscore,
  binance, validkit, jetbrains-proxy) + trim de working sets. Edge/Chrome com janela, Hermes e WhatsApp intactos.
- Depois: 1 708 · 1 595 · 1 384 MB (oscila; trim decai). Suítes só correm com ≥ 1 500 MB re-medidos.
- `scripts/liberar-ram-min.ps1` (citado no UTAC110m.2) não existe (DEBT-035).

## -1.1 Estado do repo
HEAD `f45408e` = baseline do enunciado. `origin/main..HEAD` vazio. `src/`/`netlify/` sem alterações. Disco 6,9 GB.

## -1.2 Frente A — PIX genérico
- Botão «💰 Depositar PIX» em `MinhaCarteira.jsx:334`; abre `ComprarFichasModal.jsx` (`:649`), único importador.
- ⚠️ **O saldo R$ é o meio de pagamento do Passe no PWA:** `_lib/comprar-passe-tipado.mjs:243`
  `debitarSaldoRs({ valorCentavos: VALOR_PASSE_CENTAVOS })`. No APK o Passe já vai por Google Play Billing (UTAC110i/110i.2).
  ⇒ remover o depósito **no PWA** deixa o PWA **sem nenhuma forma de comprar o Passe** (o Billing não existe no browser).
- DEBT-058 já registava «o APK ainda vende saldo R$ por PIX no ComprarFichasModal».

## -1.3 Frente B — checkout do produto
- O pedido **já existe**: `registrarVendaDaEdicao` (`_lib/pedidos.mjs:232`), chamado na consolidação
  (`_lib/consolidacao.mjs:188`), cria `pedido:<produtoId>` com `comprador`, `valorPagoCentavos = menorUnicoCentavos`,
  `txHash`. Valor dinâmico disponível: `valorPagoCentavos / 100` (14 → R$ 0,14). Sem tabela nova.
- Estados actuais (`src/lib/pedidos.js:41-57`): sem_endereco → aguarda_envio → enviado → entregue → recebido.
  **Nenhum estado de pagamento**; o cartão já escreve «valor pago» (`MeusPedidos.jsx:99`) sem pagamento existir.
- `iniciar-pagamento.mjs` só aceita `{endereco, qtd 1..100}` → valor = qtd × R$ 2 (`calcularValorBRL`); `external_reference`
  = UUID novo. Para o produto é preciso um ramo novo (valor do pedido lido no SERVIDOR, nunca do corpo; referência = pedido).
- ⚠️ **O webhook do MP nunca processou um pagamento em produção** (MC101: 24/24 aprovações vieram do
  `confirmar-pagamento`, 0 do webhook; o `POST /v1/payments` não envia `notification_url`). Mudar o status «só pelo webhook»
  deixaria o pedido parado em «aguardando pagamento». Tem de haver também o caminho de confirmação por consulta (como o saldo).
- ⚠️ **Valor mínimo do PIX no MP: NÃO CONFIRMADO.** A documentação oficial pesquisada não fixa mínimo para `/v1/payments`
  (exemplos usam 100). Nenhum depósito histórico foi abaixo de R$ 2 (qtd × 2). Medir exige criar uma cobrança real em
  produção ou credencial de sandbox (R5) — nenhum dos dois autorizado. A ressalva do enunciado manda PARAR se houver mínimo.

## -1.4 Frente C — «prêmio»
- Em `src/` (sem testes): **0 textos visíveis**. Só 2 **nomes de chave** i18n (`edicao.especial.premio`,
  `edicao.especial.premioEmDisputa` em `pt.js:119,125`, usados em `CardEdicaoEspecial.jsx:118,183`), cujo VALOR já é
  «Produto especial» / «Produto em disputa». `docs/REGULAMENTO-v5.md`: 0 ocorrências. Frente quase sem objecto.

## ⚠️ Conflitos entre o enunciado e o medido (R20 — não resolvidos pelo executor)
1. **PWA:** esconder o depósito PIX também no PWA corta a única compra do Passe no browser. Esconder só no APK, ou no PWA também?
2. **Mínimo do PIX:** não confirmável sem cobrança real. Autoriza um teste de R$ 0,14 em produção (o operador paga), ou outra via?
3. **Confirmação:** o webhook nunca disparou em produção. Autoriza o caminho de confirmação por consulta (como o saldo), além do webhook?
4. **Âmbito do PWA para o checkout** e o comportamento do cartão «valor pago» dos pedidos já existentes (sem pagamento): legado?

## Veredicto: **AJUSTAR** — aguardar respostas antes do SEG0.

## Respostas do operador (R18, 2026-10-24)
- **R18-111-A** — esconder o «Depositar PIX» **só no APK** (o PWA mantém-no: no browser o Passe só se compra com saldo R$).
- **R18-111-B** — implementar e **testar depois com um PIX real de R$ 0,14** (o operador paga); se o MP recusar, o erro aparece ao comprador e PARA.
- **R18-111-C** — confirmação por **webhook + consulta** (o webhook nunca disparou em produção — MC101).
- Conflito 4 (pedidos legados) resolvido pela regra: pedido **já enviado** (com rastreio) nunca pede pagamento.
