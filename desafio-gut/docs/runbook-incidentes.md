# Runbook de Resposta a Incidentes — DESAFIOGUT (Mainnet Readiness)

> Versão 1.0 · 2026-06-21 (MC39.1). Procedimentos de emergência para o cutover e operação
> em mainnet. Mantém-se válido em Sepolia (a maioria dos passos aplica-se a ambos).
> Princípio geral: **conter → diagnosticar → reverter/corrigir → comunicar → post-mortem.**

## 0. Contactos e escalonamento
> Preencher com os contactos reais antes do cutover (MC40).

| Papel | Responsável | Contacto | Quando acionar |
|---|---|---|---|
| Coordenação técnica | <preencher> | <preencher> | Qualquer incidente P0/P1 |
| Security Lead | <preencher> | <preencher> | Chave/Smart Account/RLS |
| DevOps/Infra | <preencher> | <preencher> | Bundler/RPC/deploy |
| Operador on-chain (KMS) | <preencher> | <preencher> | Rotação de chave, pausa |

Severidade: **P0** (fundos/dados em risco, leilão parado) → resposta imediata.
**P1** (degradação grave) → < 1h. **P2** (degradação parcial) → mesmo dia.

## 1. Contrato com bug crítico (P0)
**Sintomas:** apuração/consolidação incorreta, lances aceites fora de regra, estado inconsistente.
1. **Conter:** parar de abrir novas edições; comunicar "manutenção" no frontend (flag
   `config_remota` → `modoManutencao`/desligar leilão por plataforma via Supabase).
2. **Reverter rede:** `netlify env:unset NETWORK_STAGE` (ou `=sepolia`) + `netlify deploy --build --prod`
   → volta ao comportamento Sepolia (legado, sem blindagem). Dados Supabase NÃO são afetados (rede ≠ dados).
3. **Diagnosticar:** Etherscan (tx do contrato), logs das funções, Sentry.
4. **Corrigir:** o contrato é imutável → exige NOVO deploy (novo `CONTRATO_MAINNET`) + nova
   transferência two-step de coordenação. Re-auditar antes.
5. **Comunicar** aos utilizadores; **post-mortem**.
> ⚠️ O contrato não custodia Ether → não há fundos on-chain a drenar; o risco é de integridade do leilão.

## 2. Smart Account (coordenação) drenada / comprometida (P0)
**Sintomas:** UserOps não autorizadas, saldo de gas a cair, txs inesperadas da coordenação.
1. **Conter:** suspender `consolidar-lances`/`comprometer` (parar o scheduler/admin); se possível,
   esvaziar o gas da Smart Account para um cofre.
2. **Rotacionar a chave KMS** (owner): criar nova chave KMS, transferir a coordenação por two-step
   (`iniciarTransferenciaCoordenacao` → `aceitarTransferenciaCoordenacao`) para uma nova Smart Account
   com o novo owner. Revogar a policy IAM `kms:Sign` da chave comprometida.
3. **Auditar** logs AWS CloudTrail (uso de `kms:Sign`) + logs do bundler.
4. **Notificar** e **post-mortem**. Acelerar o hardening Gnosis Safe multisig (MC42).

## 3. Bundler/Paymaster (Biconomy) fora do ar (P1)
**Sintomas:** UserOps não são incluídas; consolidação/commit falham por timeout.
1. **Fallback de bundler:** apontar `BICONOMY_BUNDLER_URL` para um bundler ERC-4337 alternativo
   (ex.: Alchemy/Pimlico) compatível com o EntryPoint em uso — precedente MC30.2.1 (usou-se RPC
   Alchemy quando o Biconomy v2 não suportava a rede).
2. Se o **Paymaster** esgotar, financiar a Smart Account diretamente (gas próprio) temporariamente.
3. Reprocessar as operações pendentes após restabelecer; validar idempotência (nonce on-chain).

## 4. RLS quebrada / fuga de dados (P0)
**Sintomas:** leitura anónima retorna dados que deviam ser privados; erro de policy.
1. **Conter:** desativar a chave anon afetada se necessário; ou reforçar `service_role`-only
   removendo qualquer policy `public/anon` indevida (via `supabase db query --linked`).
2. **Verificar:** `select tablename,rowsecurity from pg_tables` (RLS on) e `pg_policies`
   (só `service_role`, exceto `config_remota`/`produtos` = `public SELECT` legítimo).
3. **Corrigir** a policy e **redeploy** se necessário; confirmar com teste anónimo (ANON_KEY → 0 linhas
   em `lances`/financeiro).
4. Backups Supabase + Blobs (MC36/36.1) disponíveis se for preciso restaurar.

## 5. Vazamento de chave/segredo (P0)
**Sintomas:** segredo (JWT_SECRET, MP_ACCESS_TOKEN, APP_AWS_SECRET_ACCESS_KEY, KMS_KEY_ID, etc.) exposto.
1. **Rotacionar imediatamente** o segredo na origem (AWS/Mercado Pago/Supabase/Netlify) e `netlify env:set` o novo.
2. **Invalidar sessões** se for JWT_SECRET (todos os tokens user/admin deixam de valer).
3. **Auditar logs** (acesso indevido) e **redeploy**.
4. Secret scanning (smart detection reativado no MC39.1) deve travar futuras fugas no build.

## 6. Falha de deploy / regressão pós-merge (P1)
1. **Rollback de deploy:** no painel Netlify, "Publish deploy" do último deploy `ready` conhecido;
   OU `git revert` do commit + `netlify deploy --build --prod`.
2. Confirmar HTTP 200, smoke dos endpoints, visual MCP (CLS=0).
3. Lembrar: deploys docs-only são cancelados por dedup (OPS-1) — não é falha.

## 7. Pós-incidente (todos)
- Registar timeline, causa-raiz, correção e prevenção em `security_audit.md`.
- Atualizar este runbook se o procedimento mudou.
- Validar suite/build verdes antes de reabrir o leilão.

## Referências
- Reversão de rede: `cloud.md §9.8` (runbook flip/rollback MC33) e `§9.12` (Mainnet Readiness).
- Checklist de cutover: `Desktop\MC40-checklist.md`.
- Auditoria de prontidão: `Desktop\SEGURANCA-MAINNET-READINESS.md`.
