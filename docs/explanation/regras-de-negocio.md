# Explicação — Regras de Negócio do DesafioGUT

> **Tipo**: Explanation — entendimento orientado a conceitos  
> **Público**: Desenvolvedores, coordenadores, auditores  
> **Referência regulatória**: Artigos I–XXVII do contrato GUT

---

## O que é o DesafioGUT?

O DesafioGUT é uma **plataforma híbrida** com dois objetivos simultâneos:

1. **Publicidade segmentada**: Empresas contratam cotas para exibir seus produtos/serviços em banners dentro do app, com frequência proporcional ao tier contratado.
2. **Vendas por leilão de menor lance único**: Usuários competem para ser o primeiro a colocar o menor valor que aparece **exatamente uma vez** no total de lances.

A receita é gerada pela venda de cotas (Adesão) e pela compra de fichas/senhas pelos participantes.

---

## A Regra Central — Menor Lance Único (Artigo VIII)

> "Vence o menor valor em centavos que apareça exatamente 1 (uma) vez no universo de lances registrados na edição."

**Exemplo concreto:**

| Lance (centavos) | Quantas vezes aparece | Status |
|---|---|---|
| 1 | 3x | Eliminado (repetido) |
| 5 | 1x | **VENCEDOR** |
| 7 | 2x | Eliminado (repetido) |
| 10 | 1x | Único, mas 5 é menor |

O lance de **5 centavos (R$ 0,05)** vence pois é o menor que aparece exatamente uma vez.

Isso significa que a estratégia não é lançar o menor valor absoluto, mas o menor valor que ninguém mais escolheu.

---

## Hierarquia de Cotas

| Tier | Cotas | Exclusividade | Preço Contrato | Produto Mínimo |
|---|---|---|---|---|
| **Bronze** | 27 | Não exclusiva — concorrência simultânea | R$ 2.640 | R$ 660 |
| **Prata** | 81 | Exclusiva por horário | R$ 5.600 | R$ 1.350 |
| **Ouro** | 1 | Exclusiva (único no tier) | R$ 11.000 | R$ 2.250 |
| **Diamante** | 1 | Exclusiva (único no tier) | R$ 18.000 | R$ 4.500 |

**Bronze não exclusiva**: múltiplos clientes Bronze podem ter lances em andamento no mesmo horário — cada um em sua própria edição.

**Vale-Crédito**: se o produto entregue pelo contratante tiver valor abaixo do mínimo do tier, a diferença é convertida em crédito na Wallet Digital do cliente.

---

## Tipos de Leilão

### Leilão Programado (Ouro / Diamante)
- Duração: **ciclos de 24 horas**, reset automático às 00:00
- Comportamento na tela: **fixo no topo** da página principal — sempre visível
- Operação on-chain: uma única edição por ciclo; ao resetar às 00:00, nova edição é aberta

### Leilão Relâmpago (Bronze / Prata)
- Duração: **30 minutos a 1 hora** por rodada
- Localização na tela: seção "Oportunidade Agora" — aparece e desaparece conforme a grade
- Cada horário (07:00, 11:00, etc.) pode ter múltiplos Relâmpagos simultâneos

---

## Grade e Calendário

A programação é organizada em uma **grade semanal (Seg–Sáb)** replicada por 4 semanas, alterando apenas os ponteiros de clientes Bronze e Prata a cada ciclo. Ouro e Diamante ficam fixos.

**Domingos são exclusivos**: filtro automático exibe apenas repetições de Prata e o slot fixo de Diamante. Bronze não aparece aos domingos.

Slots marcados com `XXXXX` na grade representam posições não atribuídas aguardando confirmação de cliente.

---

## Hierarquia de Exibição na UI

A interface exibe os 4 tiers em 2 camadas de prioridade:

| Dispositivo | Exibição |
|---|---|
| **Desktop** | Grid com os 4 slots visíveis simultaneamente |
| **Mobile (<768px)** | Slot 1 (Diamante) + Slot 2 (Ouro) = "Sticky Highlights" fixados no topo; Slot 3 (Prata) + Slot 4 (Bronze) = Carrossel horizontal deslizante abaixo |

---

## Senhas e Fichas

**Senha** = unidade de participação. Cada lance consome 1 senha.  
Preço padrão: **R$ 2,00/senha**.

- Crédito de senhas é feito **on-chain** pela coordenação via `adicionarSenhas()` após confirmação do pagamento (Artigos XVII e XXI).
- O frontend lê `saldoSenhas(address)` direto no contrato para exibir o saldo atual.
- O evento `SenhasCreditadas` é escutado para atualizar o badge de saldo em tempo real.

---

## Fluxo de Pagamento

### Taxa de Adesão (contratação de cota)
1. Cliente paga via **PIX direto** para `familiaquildo@gmail.com` (Banco do Brasil).
2. Coordenação verifica manualmente e ativa o perfil no painel Admin.
3. Sem aprovação manual → perfil não ativo → não aparece na grade.

### Compra de Fichas (participação em leilões)
1. Usuário gera QR Code PIX no app.
2. Pagamento vai para `desafiogut@gmail.com` (Mercado Pago).
3. Webhook do Mercado Pago notifica a Netlify Function `webhook-mercadopago`.
4. Function chama `adicionarSenhas()` no contrato → crédito automático.
5. Sem intervenção manual para crédito de fichas.

---

## Sistema de Bônus (Vouchers de Networking)

O cliente **Diamante** gera até **10 Vouchers de Networking** — códigos únicos de convite.

Quando um novo usuário se cadastra usando um código Voucher:
- Recebe **isenção total da taxa de compra de fichas** na **primeira participação** em leilões Bronze ou Prata.
- Objetivo: estimular a entrada de usuários qualificados via indicação VIP.

Os 10 clientes "Bônus" na grade de domingo representam os destinatários desses vouchers.

---

## Wallet Digital

Cada cliente possui uma **Wallet Digital** persistida em Netlify Blob com a chave `wallet:{cliente_id}`.

Usos:
- Acumula **Vale-Crédito** quando o produto entregue tem valor inferior ao mínimo do tier.
- Permite **solicitar arte profissional** de banner diretamente no app (débito da Wallet).
- Pode **abater custos de renovação** de fichas.

---

## Banners e Publicidade

Cada tier tem uma cota de exposição em banners por semana:

| Tier | Banners App/semana | Exposição Site |
|---|---|---|
| Bronze | 8 | 1 Vitrine permanente |
| Prata | 12 | 1 Fixo Inicial permanente |
| Ouro | 20 | 2 Rotativos + 1 Destaque |
| Diamante | 28 | 2 Rotativos + 1 Destaque + Redes Sociais |

Se o cliente não enviar arte, o **Auto-Gerador de Banner** cria um banner dinâmico usando o título do produto + logo do perfil.

---

## Segurança e Imutabilidade

Toda a lógica de lances e apuração do vencedor está no contrato `LeilaoGUT` na blockchain Sepolia. Isso significa:

- Os lances são **imutáveis** após registro on-chain.
- O resultado é **verificável por qualquer endereço** chamando `apurarVencedor()`.
- A coordenação **não pode alterar lances** — só pode abrir edições e creditar senhas.
- O hash Argon2id gerado off-chain antes de cada lance serve como prova de intenção imutável, complementando a transparência on-chain.
