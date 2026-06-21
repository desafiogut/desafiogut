-- 20260621_cotas_schema.sql — MC36 (fase 1: dados corporativos / cotas)
--
-- Migração do subsistema de cotas: Netlify Blobs → Supabase. Modelo FIEL ao real
-- (cota-ativacao.mjs + cotas.mjs), que usa 5 stores e chave dual cliente_id
-- (endereco logado | "cnpj:{cnpj}" cadastro direto). Mapeamento:
--   cotas:{cliente_id}        → tabela cotas (cliente_id PK, payload jsonb completo)
--   cotas-cnpj:{cnpj}         → coluna cotas.cnpj UNIQUE (anti-duplicidade no DB)
--   cotas-indice:{categoria}  → query SQL WHERE categoria= (índice deixa de ser store)
--   cotas-fingerprint:{vid}   → tabela cota_fingerprints (anti-Sybil)
--   cotas-pagas:{pedidoId}    → tabela cotas_pagas (idempotência de ativação)
-- payload jsonb preserva o registo completo (campos corporativos variáveis).
-- saldo-rs/troco (fluxo dinheiro/lance) ficam para MC36.1.
-- RLS role-based (service_role): dados corporativos não públicos; frontend lê via
-- funções. Idempotente. Execução via `supabase db query --linked`.

DROP TABLE IF EXISTS cotas CASCADE;
DROP TABLE IF EXISTS cotas_pagas CASCADE;
DROP TABLE IF EXISTS cota_fingerprints CASCADE;

CREATE TABLE cotas (
  cliente_id    TEXT PRIMARY KEY,          -- = chave Blob (endereco.toLowerCase() | "cnpj:{cnpj}")
  endereco      TEXT,                       -- nullable (cadastro direto sem carteira)
  cnpj          TEXT,                       -- nullable; NÃO UNIQUE (dados reais têm o mesmo
                                            -- CNPJ em registo direto "cnpj:" + autenticado).
                                            -- Anti-duplicidade é aplicacional (como nos Blobs).
  email         TEXT,                       -- para lookup por email
  categoria     TEXT,                       -- bronze|prata|ouro|diamante | null
  vendida       BOOLEAN DEFAULT FALSE,
  pedido_id     TEXT,
  payload       JSONB NOT NULL,             -- registo completo (fidelidade)
  criado_em     TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cotas_pagas (                  -- idempotência por pedidoId
  pedido_id  TEXT PRIMARY KEY,
  payload    JSONB NOT NULL,
  criado_em  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cota_fingerprints (            -- anti-Sybil (visitorId → CNPJs 24h)
  visitor_id    TEXT PRIMARY KEY,
  payload       JSONB NOT NULL,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cotas_categoria ON cotas(categoria);
CREATE INDEX idx_cotas_endereco ON cotas(endereco);
CREATE INDEX idx_cotas_email ON cotas(email);
CREATE INDEX idx_cotas_cnpj ON cotas(cnpj); -- lookup anti-duplicidade (não-único)

ALTER TABLE cotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotas_pagas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cota_fingerprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role total cotas" ON cotas
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role total cotas_pagas" ON cotas_pagas
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role total cota_fingerprints" ON cota_fingerprints
  FOR ALL TO service_role USING (true) WITH CHECK (true);
