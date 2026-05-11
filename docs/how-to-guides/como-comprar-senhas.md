# Como Comprar Senhas (Fichas)

> **Tipo**: How-to Guide — tarefas orientadas a objetivo  
> **Público**: Usuário já cadastrado que quer participar de leilões  
> **Pré-requisito**: Conta criada e login feito no app

---

## Visão Geral

Cada lance consome **1 senha** (ficha). Senhas custam **R$ 2,00** cada via PIX pelo Mercado Pago. O crédito é automático após confirmação do pagamento.

---

## Comprar via app (caminho normal)

**1. Acesse Carteira**  
Na barra inferior do app, toque em **Carteira**.

**2. Toque em "Comprar Senhas"**  
Escolha a quantidade desejada. O valor em R$ é exibido antes de confirmar.

**3. Gere o QR Code PIX**  
Toque em **Confirmar** → o app gera um QR Code PIX + código copia-e-cola.  
Você tem **30 minutos** para pagar antes do pedido expirar.

**4. Pague via banco ou carteira digital**  
Abra seu banco → PIX → leia o QR Code ou cole o código.  
Destino: `desafiogut@gmail.com` (Mercado Pago).

**5. Aguarde a confirmação**  
Após o pagamento aprovado, o Webhook do Mercado Pago credita as senhas automaticamente em sua carteira on-chain (contrato `LeilaoGUT` na rede Sepolia).  
O saldo aparece atualizado no app em poucos segundos.

---

## Verificar saldo

Seu saldo de senhas aparece em:
- **Tela principal** — badge laranja no canto superior direito
- **Carteira** — aba "Saldo"
- **Antes de lançar** — o formulário de lance mostra o saldo e desabilita o botão se saldo = 0

---

## Perguntas frequentes

**O pagamento foi aprovado mas o saldo não apareceu?**  
Aguarde até 2 minutos — o Webhook pode ter um atraso. Se persistir, use **Verificar pagamento** na tela de Carteira e informe o ID do pedido ao suporte.

**Posso usar o saldo em qualquer leilão?**  
Senhas são válidas para **leilões Programados** (Ouro e Diamante, ciclos de 24h). Leilões Relâmpago (Bronze e Prata) usam um saldo separado de crédito flash.

**O QR Code expirou antes de eu pagar?**  
Gere um novo pedido. Pedidos expirados não são cobrados.

**Tenho Vale-Crédito na Wallet Digital — posso usá-lo para senhas?**  
Sim. O Vale-Crédito pode abater o custo de renovação de senhas. Consulte **Carteira → Wallet Digital** para ver seu saldo disponível.

---

## Próximos passos

→ [Entendendo as regras de negócio](../explanation/regras-de-negocio.md)  
→ [Referência do contrato: função `saldoSenhas`](../reference/contrato-leilao-abi.md#saldosenhas)
