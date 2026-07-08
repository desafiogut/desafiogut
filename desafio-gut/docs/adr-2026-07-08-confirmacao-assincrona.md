# ADR 2026-07-08 — Confirmação assíncrona do crédito de senhas (fix definitivo do TX_PENDENTE)

- **Status:** Proposto (MC59.4) — recomendado para pré-mainnet.
- **Contexto:** MC59.3 (atribuição por tx-hash), MC59.4 (retry de nonce).

## Contexto e diagnóstico honesto

O plano do MC59.4 pedia "serialização de nonce por endereço". A análise do modelo
real revelou uma imprecisão importante:

1. **O nonce colide na EOA da coordenação (o signer único), não por endereço-alvo.**
   Todas as escritas privilegiadas (`adicionarSenhas`, `comprometerLance`,
   `consolidarResultado`, `abrirEdicao`) saem da MESMA conta.
2. **Um mutex em memória é inútil no Netlify/AWS Lambda.** Cada instância processa
   1 request por vez; dois requests simultâneos vão para **instâncias diferentes**,
   que não compartilham memória. Requests na mesma instância já são sequenciais.
3. **Colisões de nonce em geral falham no BROADCAST** (o `send` lança "nonce too
   low" antes do `txHash`). No fluxo atual (MC59.3), isso propaga antes do txHash →
   o `comprar-senhas` **reembolsa com segurança**. Ou seja: colisão de nonce ≈
   reembolso + o usuário tenta de novo — incômodo, mas **não** "dinheiro preso".
   O **MC59.4** melhora isso: o perdedor **reenvia** com nonce fresco (menos
   reembolsos/retries).
4. **O "dinheiro preso" (`TX_PENDENTE`) vem majoritariamente do WAIT SÍNCRONO**
   estourar o timeout da função na mainnet (~12 s de bloco vs. ~10 s de timeout),
   independente de nonce.

Conclusão: um lock (in-process ou distribuído) trata um sintoma menor e/ou
introduz fragilidade (lock longo sobre um wait de ~12 s vs. timeout). A causa
estrutural é **confirmar on-chain de forma síncrona dentro de uma função com
timeout curto**.

## Decisão proposta

Mover o crédito de senhas para **confirmação assíncrona**, reutilizando a fila
durável **MC39.20** (`_lib/fila.mjs`, Postgres `SKIP LOCKED`), hoje INERTE
(migração pendente):

1. `POST /comprar-senhas`:
   - Debita R$ (atómico, CAS — já existe).
   - **Submete** `adicionarSenhas` (com o retry de nonce do MC59.4) e captura o
     `txHash` — **sem** aguardar `wait`.
   - Enfileira uma tarefa `confirmar-credito-senhas { pedidoId, endereco, qtd,
     txHash, valorCentavos }`.
   - Responde **202 Accepted** com `txHash` (o frontend passa a fazer polling do
     estado, em vez de esperar o recibo inline).
2. Worker (`fila-processor-scheduled.mjs`, single-consumer por tarefa via
   `SKIP LOCKED`):
   - Aguarda/consulta o receipt do `txHash`.
   - status 1 → marca crédito concluído (idempotente por `pedidoId`).
   - status 0 / dropped → **reembolsa** R$ (atómico) e marca falha.
   - Como o worker processa serialmente por tarefa, o nonce da coordenação também
     fica naturalmente ordenado.

## Consequências

- **Elimina por design** o estado "preso": não há mais wait síncrono sob timeout.
- Exige: aplicar a migração da fila (operador), um endpoint/estado de polling no
  frontend (contrato de resposta muda de 200-com-recibo para 202-com-txHash), e
  ajuste do `fila-processor` para o novo tipo de tarefa.
- É uma mudança de **arquitetura do fluxo de compra** — deve ter seu próprio MC,
  com TDD e validação viva, **antes** do flip de mainnet.

## Alternativas consideradas (e por que não)

- **Mutex em memória:** inútil entre instâncias Lambda (ver contexto #2).
- **Lock distribuído (Redis/Upstash) sobre o wait:** o lock precisaria durar todo
  o wait (~12 s), esbarrando no timeout da função e criando risco de lock preso;
  ganho pequeno vs. o retry de nonce que já cobre a corrida de broadcast.
- **Lock distribuído só no broadcast (nonce+send):** reduz a corrida de nonce sem
  o problema do lock longo, mas o `MC59.4` (retry) já resolve a corrida de nonce
  de forma mais simples e sem dependência de infra. Não elimina o `TX_PENDENTE`
  do wait — só a confirmação assíncrona elimina.

## Recomendação

Priorizar este ADR (confirmação assíncrona) como pré-requisito de mainnet, acima
de qualquer lock. Até lá, o `TX_PENDENTE` residual é coberto pelo
`docs/runbook-credito-pendente.md` (reconciliação manual guiada por `txHash`).
