# Runbook — Reconciliação de `credito_pendente` (compra de senhas)

> MC59.4 · Aplica-se ao fluxo `POST /comprar-senhas` (crédito de senhas on-chain).
> Objetivo: resolver, com segurança, os casos em que a compra ficou em estado
> **indeterminado** (`TX_PENDENTE`) — o R$ foi debitado mas as senhas podem ou não
> ter sido creditadas on-chain.

## 1. Quando este runbook dispara

Um alerta **`comprar_senhas_tx_pendente`** (Sentry, `level=error`) é emitido por
`comprar-senhas.mjs` quando `creditarSenhas` submeteu a transação (existe `txHash`)
mas **não conseguiu confirmar o receipt** dentro do tempo da função (timeout/RPC).
A resposta ao cliente foi **HTTP 502 `credito_pendente`** com `reembolsado: false`.

Payload do alerta: `{ endereco, qtd, txHash }`.

> Pré-requisito operacional: `SENTRY_DSN` DEVE estar configurado em produção. Sem
> ele, `captureSecurityAlert` degrada para `console.warn` (Netlify function logs) —
> nesse caso, buscar `comprar_senhas_tx_pendente` nos logs do Netlify.

## 2. Por que NÃO reembolsamos automaticamente

Se reembolsássemos e a tx minerasse depois, o usuário ficaria com **senhas + R$
de volta** (double-benefit / prejuízo à casa). Como o estado é desconhecido, a
decisão é **humana**, guiada pelo `txHash`.

## 3. Fluxo de investigação (passo a passo)

1. **Localizar a tx** pelo `txHash` do alerta no explorer da rede ativa
   (`EXPLORER_URL`, ex.: Etherscan). Estados possíveis:
   - **Confirmada, status 1 (success)** → as senhas FORAM creditadas.
   - **Confirmada, status 0 (reverted)** → as senhas NÃO foram creditadas.
   - **Não encontrada / dropped / ainda pending** → aguardar; ver passo 4.
2. **Conferir o saldo on-chain** de `endereco`:
   `saldoSenhas(endereco)` no contrato ativo (`CONTRATO_ADDRESS`). Comparar com o
   esperado (o `qtd` do alerta).
3. **Conferir o débito R$** em `saldo_rs`/`saldo_rs_debitos` (Supabase) para o
   `endereco` — confirmar que o débito de `qtd × R$2,00` de fato ocorreu.

## 4. Decisão

| Estado da tx (`txHash`) | Senhas creditadas? | Ação |
|---|---|---|
| status 1 (success) | Sim | **Nada a fazer** — a compra concluiu. Fechar o alerta. |
| status 0 (reverted) | Não | **Reembolsar R$** ao `endereco` (o débito ficou sem contrapartida). |
| dropped / substituída / não minerou após ~30 min | Não | **Reembolsar R$**. |
| ainda pending (< ~30 min em mainnet) | Indeterminado | **Aguardar** e reavaliar; não agir. |

> Reembolso manual: usar `reembolsarSaldoRs({ endereco, valorCentavos, motivo:
> "reconciliacao-credito-pendente" })` (é **atómico via CAS** desde o MC59.2/59.3 —
> seguro sob concorrência). Registrar o `txHash` no motivo/nota para auditoria.

## 5. Prevenção (contexto de engenharia)

- **MC59.4** reduz a FREQUÊNCIA de falhas de submissão por **colisão de nonce**
  (retry no broadcast: o perdedor da corrida reenvia com nonce fresco em vez de
  falhar). Colisões de nonce que ainda falham no send propagam **antes** do
  `txHash` → o caminho normal **reembolsa** (não caem aqui).
- `TX_PENDENTE` restante vem majoritariamente do **wait síncrono estourar o
  timeout da função** na mainnet (~12s de bloco vs. timeout da função). O **fix
  definitivo** é a **confirmação assíncrona** (ver `docs/adr-2026-07-08-confirmacao-assincrona.md`):
  submeter a tx, responder 202, e um worker durável (fila MC39.20) confirma e
  finaliza (crédito ou reembolso) — eliminando o estado "preso" por design.

## 6. Métrica de saúde

Acompanhar o volume de `comprar_senhas_tx_pendente` por dia. Um aumento sustentado
indica pressão de timeout/nonce → priorizar a migração para confirmação assíncrona.
