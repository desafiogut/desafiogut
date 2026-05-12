# Auditoria — Frontend Atual vs Especificação Refatorada

**Data:** 2026-05-12
**Spec fonte:** [`especificacao-extraida.md`](./especificacao-extraida.md) (29 requisitos)
**Branch auditado:** `main` @ `9dfda49` (último commit antes desta auditoria)
**Decisão arquitetural acordada:** **Coexistir em rota nova** (preservar `/mercado` atual; criar nova rota com sistema de 4 slots) e **executar apenas FASE 0 + FASE 1** nesta sessão. Implementação fica para próxima sessão.

---

## Sumário executivo

| Status | Total | % |
|---|---|---|
| ✅ IMPLEMENTADO | 1 | 3% |
| ⚠️ PARCIAL | 5 | 17% |
| ❌ AUSENTE | 22 | 76% |
| n/a (objetivo, não-implementação) | 1 | 3% |

**Único REQ ✅ IMPLEMENTADO:** REQ-21 (pipeline MP/Fichas).
**REQs ⚠️ PARCIAL:** REQ-01, REQ-03, REQ-09, REQ-11, REQ-20.
**REQ n/a:** REQ-27 (descreve objetivo de negócio, não exige código).

**Gap dominante:** o frontend atual implementa um **único leilão R-1** (`/mercado`) com toggle `flash`/`programado`, enquanto a spec descreve uma plataforma de **4 slots simultâneos paralelos** (Diamante/Ouro/Prata/Bronze) com regras de cota, calendário programático, Wallet Digital com vale-crédito e sistema de vouchers. As fundações de auth (Privy), persistência (Netlify Blobs) e pipeline de lance on-chain estão sólidas e podem ser reaproveitadas como tijolos pelo novo modelo.

---

## Tabela de auditoria

> Evidência usa o formato `arquivo:linha` ou `(ausente)`. Quando uma feature existe mas com semântica divergente da spec, é marcada ⚠️ PARCIAL e a divergência é descrita.

### §1 — Visão Geral

| ID | Status | Evidência | Notas |
|---|---|---|---|
| REQ-01 (publicidade + leilões) | ⚠️ PARCIAL | `pages/MercadoLances.jsx` (só leilões) | Lado leilão existe; **camada de publicidade (banners) ausente**. |
| REQ-02 (grade sem ambiguidade) | ❌ AUSENTE | (ausente) | Não há grade de horários nem calendário no código. |
| REQ-03 (automação financeira) | ⚠️ PARCIAL | `netlify/functions/webhook-mercadopago.mjs`, `iniciar-pagamento.mjs`, `confirmar-pagamento.mjs` | Pipeline Mercado Pago automatizado para Fichas existe (B.3–B.6 já validados). Falta automação para Adesão/Wallet/renovação. |

### §2 — Categorias e Hierarquia de Cotas

| ID | Status | Evidência | Notas |
|---|---|---|---|
| REQ-04 (Bronze) | ❌ AUSENTE | (ausente) | Nenhum modelo de cotas/categorias. Menção textual em `pages/Dashboard.jsx:185` é placeholder. |
| REQ-05 (Prata) | ❌ AUSENTE | (ausente) | idem. |
| REQ-06 (Ouro) | ❌ AUSENTE | (ausente) | idem. |
| REQ-07 (Diamante) | ❌ AUSENTE | (ausente) | idem. |
| REQ-08 (visibilidade por cota) | ❌ AUSENTE | (ausente) | Não há ordenação/prioridade baseada em categoria. |

### §3.1 — Tipos de Leilão

| ID | Status | Evidência | Notas |
|---|---|---|---|
| REQ-09 (Programado 24h fixado) | ⚠️ PARCIAL | `context/AppContext.jsx:15-18` (`programado: 86400`) | Duração 24h OK; **comportamento "fixado no topo" ausente** (atual é toggle, não fixação). |
| REQ-10 (reset 00:00) | ❌ AUSENTE | (ausente) | Reset hoje é manual via botão "Nova Rodada" (`MercadoLances.jsx:444` → `handleNovaRodada`). Não há cron/timer 00:00. |
| REQ-11 (Relâmpago 30min–1h) | ⚠️ PARCIAL | `context/AppContext.jsx:16` (`flash: 1800`) | Duração fixa em 30min. **Intervalo 30min–60min não suportado** (deveria ser configurável). |
| REQ-12 (seção "Oportunidade Agora") | ❌ AUSENTE | (ausente) | Atual exibe sob aba "⚡ Relâmpago" no toggle, não como seção rotulada "Oportunidade Agora". |

### §3.2 — Responsividade (4 slots)

| ID | Status | Evidência | Notas |
|---|---|---|---|
| REQ-13 (Desktop grid 4 slots) | ❌ AUSENTE | (ausente) | `MercadoLances.jsx:394-444` tem grid 1fr/1.6fr (CardLance + TabelaLances), **não 4 slots**. |
| REQ-14 (Mobile sticky D+O) | ❌ AUSENTE | (ausente) | Sem componente de sticky highlights por categoria. |
| REQ-15 (Mobile carrossel P+B) | ❌ AUSENTE | (ausente) | Sem componente de carrossel horizontal. |

### §4 — Wallet Digital

| ID | Status | Evidência | Notas |
|---|---|---|---|
| REQ-16 (wallet virtual Vale-Crédito) | ❌ AUSENTE | (ausente) | "Wallet" no código é só Privy Embedded Wallet (auth crypto), **não a wallet de vale-crédito da spec**. |
| REQ-17 (regra do saldo) | ❌ AUSENTE | (ausente) | Sem campo `Valor_Produto`/`Valor_Minimo_Cota`/diff. |
| REQ-18 (Netlify Blob `wallet:{cliente_id}`) | ❌ AUSENTE | (ausente) | Stores existentes: `lances-relampago`, `lance-idem`, `saldo-rs:{address}`, `mp-aprovados`. **Não há `wallet:*`**. |
| REQ-19 (saldo abate renovação/premium) | ❌ AUSENTE | (ausente) | Sem fluxo de débito Wallet → arte premium/renovação. |

### §5 — Fluxo de Pagamento

| ID | Status | Evidência | Notas |
|---|---|---|---|
| REQ-20 (PIX Adesão `familiaquildo@gmail.com` + aprovação manual) | ⚠️ PARCIAL | `pages/MinhaCarteira.jsx:18, 21` | Email correto exibido na UI. **Endpoint dedicado + workflow de aprovação Admin ausentes** — não há separação Adesão vs Fichas no backend. |
| REQ-21 (Fichas MP `desafiogut@gmail.com` webhook) | ✅ IMPLEMENTADO | `netlify/functions/iniciar-pagamento.mjs`, `webhook-mercadopago.mjs`, `confirmar-pagamento.mjs` | Pipeline B.3–B.6 já validado em produção (commit `593ee2b` e seguintes). Webhook MP filtra `status=approved`. |

### §6 — Banners e Artes

| ID | Status | Evidência | Notas |
|---|---|---|---|
| REQ-22 (auto-gerador de banner) | ❌ AUSENTE | (ausente) | Sem componente/endpoint de geração. |
| REQ-23 (solicitação premium via Wallet) | ❌ AUSENTE | (ausente) | Sem fluxo de pedido + débito Wallet. |

### §7 — Bônus Diamante / Vouchers

| ID | Status | Evidência | Notas |
|---|---|---|---|
| REQ-24 (10 bônus = vouchers networking) | ❌ AUSENTE | (ausente) | Sem modelo de voucher. |
| REQ-25 (gerar código único de convite) | ❌ AUSENTE | (ausente) | Sem endpoint de geração. |
| REQ-26 (isenção taxa fichas 1ª participação) | ❌ AUSENTE | (ausente) | Sem flag "primeira participação" nem desconto no `lance-relampago.mjs`. |
| REQ-27 (objetivo de indicação VIP) | n/a | n/a | Requisito de objetivo/motivação, não de implementação direta. |

### §8 — Calendário e Loop

| ID | Status | Evidência | Notas |
|---|---|---|---|
| REQ-28 (grade Seg–Sáb × 4 semanas) | ❌ AUSENTE | (ausente) | Sem grade de programação nem replicação. |
| REQ-29 (Domingos: só Prata+Diamante) | ❌ AUSENTE | (ausente) | Sem filtro de dia da semana. |

---

## Pontos altos do código atual (reaproveitáveis)

Esses não são gaps — são fundações sólidas que o novo modelo de 4 slots deve consumir, não duplicar:

1. **Auth + assinatura on-chain via Privy** (`AppContext.jsx`, `CardLance.jsx`, `utils/web3.js`) — todo o fluxo Privy → switchChain → EIP-191 → `darLance` está validado em produção.
2. **Pipeline PIX → débito → lance** (`netlify/functions/iniciar-pagamento.mjs` + `webhook-mercadopago.mjs` + `lance-relampago.mjs`) — modelo de idempotência via `lance-idem` é reaproveitável para Adesão e Vouchers.
3. **Persistência Blob com consistência forte** — padrão `getStore({ name, consistency: "strong" })` já estabelecido (ex: `lances-flash.mjs:13`) é exatamente o que REQ-18 pede.
4. **Reset versionado de localStorage + Blob purge** (`AppContext.jsx:88-115` + `purge-lances.mjs`) — mecânica criada nas sessões anteriores serve para zerar estado entre ciclos da grade.
5. **Estado tipoLeilao + DURACAO** (`AppContext.jsx:44-49`, `15-18`) — pode generalizar para `tipoSlot ∈ {Bronze, Prata, Ouro, Diamante}` com `DURACAO[tipoSlot]`.

---

## Recomendação de implementação (próxima sessão)

Dado o gap de 22 ❌ AUSENTE + 5 ⚠️ PARCIAL, sugiro a seguinte ordem para a próxima sessão, alinhada com a decisão **"coexistir em rota nova"**:

### Ondas

**Onda 1 — Wins rápidos sem mudar arquitetura** (~1–2h)
- REQ-11 (Relâmpago 30–60min): permitir `DURACAO.flash` ser número entre 1800–3600 via env/config; UI continua a mesma.
- REQ-10 (reset 00:00 programado): adicionar effect em `AppContext` que detecta virada de dia UTC-3 e dispara `handleNovaRodada` quando `tipoLeilao === "programado"`.

**Onda 2 — Fundação dos 4 slots** (~3–4h)
- Criar `pages/Vitrine.jsx` com grid responsivo Desktop=4-up / Mobile=sticky+carrossel (REQ-13/14/15).
- Componente `<SlotCard categoria="bronze|prata|ouro|diamante">` consumindo dados do AppContext.
- Adicionar rota `/vitrine` em `App.jsx:53` (mantendo `/mercado` intocado).
- Backend: nova função `netlify/functions/slots-vitrine.mjs` que retorna estado dos 4 slots a partir de Blob `vitrine-slots:{edicaoId}`.

**Onda 3 — Wallet Digital** (~2–3h)
- Endpoint `netlify/functions/wallet-saldo.mjs` (GET/POST) com Blob `wallet:{cliente_id}` consistência forte (REQ-18).
- Componente `<WalletDigital />` em `MinhaCarteira.jsx` ou rota nova `/wallet`.
- Hook de débito `usarSaldoWallet({ valor, motivo })` reutilizando padrão de `debitarSaldoRs` (`lance-relampago.mjs:114`).

**Onda 4 — Vouchers Diamante** (~2h)
- Endpoint `netlify/functions/voucher-gerar.mjs` (Diamante-only) + `voucher-resgatar.mjs` (Bronze/Prata 1ª compra).
- Blob `vouchers:{codigo}` com `{ emissor, resgatadoPor, expira }`.
- Integração em `comprar-senhas.mjs`: aceitar `voucherCodigo` no body, zerar valor se válido.

**Onda 5 — Banners + Auto-gerador** (~3–4h)
- Endpoint `banner-gerar.mjs` (renderiza SVG/Canvas server-side com título + logo).
- Endpoint `banner-premium-pedido.mjs` (cria pedido no Blob `arte-pedidos:*`, debita Wallet).
- Componente `<PainelBanners />` em rota nova `/banners`.

**Onda 6 — Calendário + Loop** (~3h)
- Endpoint `grade-semanal.mjs` GET com replicação 4× e filtro de domingo.
- Componente `<CalendarioProgramacao />` em rota nova `/calendario`.
- Blob `grade:{semana}` mantém os ponteiros de ID Bronze/Prata.

### Riscos a vigiar

- **REQ-20 aprovação manual Admin**: spec exige workflow Admin que **não existe no projeto**. Próxima sessão precisa decidir se: (a) criar página `/admin` protegida; (b) usar Netlify Identity / Privy com role-based access; (c) aprovar via console/Blob direto inicialmente (MVP).
- **REQ-28 "ponteiros de ID"**: a spec não define o que é "ID de cliente" no modelo de dados. Provável que seja o `endereco` da carteira Privy, mas precisa ser confirmado antes de codar.
- **REQ-04…07 (cotas exclusivas)**: 81 Prata é grande; 1 Diamante/Ouro é escassez extrema. UI tem que tratar slot vencido/vendido vs disponível — não está claro na spec.

---

## Itens para confirmação do stakeholder antes de codar

1. **"cliente_id" (REQ-18)** = `endereco` da Privy Embedded Wallet (Sepolia)? Ou um ID interno emitido na Adesão?
2. **Admin de aprovação (REQ-20)** — qual o canal/role? Existe usuário admin definido?
3. **Domingo (REQ-29) — qual fuso?** America/Sao_Paulo (UTC-3) ou UTC?
4. **Taxa de fichas atual** (alvo da isenção REQ-26) — é a `CUSTO_FICHA_BRL = 2.00` em `netlify/functions/_lib/validate.mjs:5`? Confirmar.
5. **Cotas em REQ-04…07** — onde fica o estado de "vendido/disponível"? Blob, contrato on-chain, ou planilha externa?
