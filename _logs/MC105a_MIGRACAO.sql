-- MC105a — tabela `passes` (Passe Desafio, off-chain). HARD GATE 15: registado aqui, aplicado SÓ com autorização
-- explícita do operador. Projecto de produção: vjslwowwrpcawijdiksm (confirmado por get_project_url).
--
-- Colunas = as do enunciado. O resto segue o padrão das tabelas recentes (20260923_mc93b_pontuacoes.sql):
--   CHECKs de domínio (endereço normalizado, status fechado), RLS ligada, só o service_role acede
--   (as funções usam getSupabase() com a service_role; o cliente nunca lê a tabela directamente).
-- Não apaga nem altera nada que exista (P2): só CREATE.

CREATE TABLE IF NOT EXISTS public.passes (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  endereco      text        NOT NULL,
  edicao_id     text        NOT NULL,
  produto_id    text        NOT NULL,
  comprado_em   timestamptz NOT NULL DEFAULT now(),
  palpite_usado boolean     NOT NULL DEFAULT false,
  cupons_ids    jsonb       NOT NULL DEFAULT '[]'::jsonb,   -- preenchido no MC105b
  status        text        NOT NULL DEFAULT 'activo',
  CONSTRAINT passes_endereco_edicao_produto_key UNIQUE (endereco, edicao_id, produto_id),   -- idempotência (P8/HG13)
  CONSTRAINT passes_endereco_check   CHECK (endereco ~ '^0x[0-9a-f]{40}$'),
  CONSTRAINT passes_status_check     CHECK (status IN ('activo', 'expirado', 'usado')),
  CONSTRAINT passes_cupons_ids_check CHECK (jsonb_typeof(cupons_ids) = 'array')
);

CREATE INDEX IF NOT EXISTS passes_endereco_idx ON public.passes (endereco);
CREATE INDEX IF NOT EXISTS passes_edicao_idx   ON public.passes (edicao_id);

ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role total passes" ON public.passes;
CREATE POLICY "service_role total passes" ON public.passes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Sem acesso a anon/authenticated: o passe é servido pelas funções (JWT do titular).
REVOKE ALL ON public.passes FROM PUBLIC, anon, authenticated;
-- A RLS autoriza a LINHA; o GRANT autoriza a TABELA (sem ele: 42501 em silêncio — lição do MC93-B).
GRANT SELECT, INSERT, UPDATE ON public.passes TO service_role;
-- Sem DELETE (P2: nenhum dado é eliminado por este MC).
