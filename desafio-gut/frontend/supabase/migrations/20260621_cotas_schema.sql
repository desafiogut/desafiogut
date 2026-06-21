-- 20260621_cotas_schema.sql — MC36 (fase 1: dados corporativos / cotas)
--
-- Migração de cotas: Netlify Blobs → Supabase. Modelo FIEL ao registo real
-- (cota-ativacao.mjs): o "lojista" e a "cota" vivem no MESMO registo
-- (denormalizado), keyed por endereço (lowercase). NÃO existe store `lojistas`
-- separado nos Blobs — por isso não se cria tabela lojistas normalizada (seria
-- cargo-cult e perderia os campos corporativos variáveis: empresa, cnpj, tipo,
-- produto_nome, ...). `payload jsonb` preserva o registo COMPLETO — mesma
-- estratégia provada no MC32 (lances.payload).
--
-- ESCOPO FASE 1: só `cotas` (+ idempotência cotas_pagas). saldo-rs / troco-senhas
-- (fluxo de dinheiro/lance, adjacente MC28) ficam para MC36.1.
-- RLS role-based (service_role): dados corporativos NÃO são públicos; o frontend
-- lê via funções (service_role), não diretamente com a anon (Privy, não Supabase Auth).
-- Aditiva/idempotente. Execução via `supabase db query --linked` (CLI autenticada).

CREATE TABLE IF NOT EXISTS cotas (
  endereco      TEXT PRIMARY KEY,            -- = chave Blob (endereco.toLowerCase())
  categoria     TEXT,                        -- bronze|prata|ouro|diamante
  vendida       BOOLEAN DEFAULT FALSE,
  pedido_id     TEXT,
  payload       JSONB NOT NULL,              -- registo imutável completo (fidelidade)
  criado_em     TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cotas_pagas (     -- idempotência por pedidoId (cotas-pagas:{pedidoId})
  pedido_id  TEXT PRIMARY KEY,
  payload    JSONB NOT NULL,
  criado_em  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cotas_categoria ON cotas(categoria);
CREATE INDEX IF NOT EXISTS idx_cotas_vendida ON cotas(vendida);

ALTER TABLE cotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotas_pagas ENABLE ROW LEVEL SECURITY;

-- Escrita/leitura exclusiva do service_role (backend). Sem SELECT público.
CREATE POLICY "service_role total cotas" ON cotas
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role total cotas_pagas" ON cotas_pagas
  FOR ALL TO service_role USING (true) WITH CHECK (true);
