-- 20260621_saldo_troco_wallet_schema.sql — MC36.1 (fluxo de dinheiro/senhas off-chain)
--
-- Migração dos subsistemas financeiros off-chain: Netlify Blobs → Supabase, modelo
-- FIEL aos stores reais (payload jsonb preserva o registo byte-a-byte; o *-store.mjs
-- devolve o payload exatamente como os handlers já esperavam → zero mudança de
-- semântica, incl. o fluxo de lance via saldoRs). Mapeamento Blob → tabela:
--   saldo-rs:{endereco}          → saldo_rs (cliente_id PK = endereco.toLowerCase())
--   saldo-rs-creditos:{pedidoId} → saldo_rs_creditos (idempotência de crédito PIX)
--   saldo-rs-debitos:{operacaoId}→ saldo_rs_debitos (idempotência opcional de débito)
--   troco-senhas:{endereco}      → troco_senhas (lotes FIFO 30d)
--   wallet:{endereco}            → wallet (Vale-Crédito: saldoCentavos + transacoes[])
--   wallet-idem:{key}            → wallet_idem (idempotência de operação)
--
-- RLS role-based (só service_role): dados financeiros não públicos; o frontend lê
-- via Netlify Functions, que aplicam guard owner/admin por JWT (ex.: wallet GET,
-- saldo-rs). Idempotente e SEM DROP (CREATE IF NOT EXISTS) — re-execução não
-- apaga dados (lição MC37). Execução via `supabase db query --linked`.

CREATE TABLE IF NOT EXISTS saldo_rs (
  cliente_id    TEXT PRIMARY KEY,           -- endereco.toLowerCase()
  payload       JSONB NOT NULL,             -- { centavos, atualizadoEm }
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saldo_rs_creditos (  -- idempotência de crédito por pedidoId
  pedido_id  TEXT PRIMARY KEY,
  payload    JSONB NOT NULL,
  criado_em  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saldo_rs_debitos (   -- idempotência opcional por operacaoId
  operacao_id TEXT PRIMARY KEY,
  payload     JSONB NOT NULL,
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS troco_senhas (
  cliente_id    TEXT PRIMARY KEY,           -- endereco.toLowerCase()
  payload       JSONB NOT NULL,             -- { lotes[], expiradosAcum, senhasExpiradasAcum, atualizadoEm }
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet (
  cliente_id    TEXT PRIMARY KEY,           -- endereco.toLowerCase()
  payload       JSONB NOT NULL,             -- { saldoCentavos, atualizadoEm, transacoes[] }
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_idem (        -- idempotência de operação de wallet
  idem_key   TEXT PRIMARY KEY,
  payload    JSONB NOT NULL,
  criado_em  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: só service_role (consistente com cotas/MC32.1). Idempotente.
ALTER TABLE saldo_rs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE saldo_rs_creditos ENABLE ROW LEVEL SECURITY;
ALTER TABLE saldo_rs_debitos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE troco_senhas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet            ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_idem       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role total saldo_rs" ON saldo_rs;
CREATE POLICY "service_role total saldo_rs" ON saldo_rs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role total saldo_rs_creditos" ON saldo_rs_creditos;
CREATE POLICY "service_role total saldo_rs_creditos" ON saldo_rs_creditos
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role total saldo_rs_debitos" ON saldo_rs_debitos;
CREATE POLICY "service_role total saldo_rs_debitos" ON saldo_rs_debitos
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role total troco_senhas" ON troco_senhas;
CREATE POLICY "service_role total troco_senhas" ON troco_senhas
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role total wallet" ON wallet;
CREATE POLICY "service_role total wallet" ON wallet
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role total wallet_idem" ON wallet_idem;
CREATE POLICY "service_role total wallet_idem" ON wallet_idem
  FOR ALL TO service_role USING (true) WITH CHECK (true);
