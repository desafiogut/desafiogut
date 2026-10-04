-- UTAC106d-v2 — tabela `public.pontos` (Pontos de fidelidade Via B). ADITIVA.
-- HARD GATE 15: registada aqui; aplicada SÓ com autorização do operador (enunciado UTAC106d-v2).
-- Projeto de produção: vjslwowwrpcawijdiksm (DesafioGUT).
--
-- ⚠️ NÃO TOCA em nada do Via A: `public.passes`, `_lib/passe.mjs`, `comprar-passe.mjs`
--    e os seus testes ficam intactos. Esta migração só faz CREATE (nada de ALTER/DROP/DELETE).
--
-- Regra (Via B): 1 Passe = 1 ponto · 50 pontos = 1 cartão colecionável físico.
-- Diferença de esquema vs Via A: `passes` = 1 linha por COMPRA (edição, produto, cupons);
--   `pontos` = 1 linha por ENDEREÇO (acumulado + histórico em JSONB).
--
-- Convenções do repo (seguidas do MC105a, 20260930_mc105a_passes.sql): RLS ligada, só o
-- service_role acede (as functions usam getSupabase() com a service_role), REVOKE de
-- anon/authenticated, GRANT explícito (sem GRANT o service_role leva 42501 em silêncio —
-- lição do MC93-B).

CREATE TABLE IF NOT EXISTS public.pontos (
  endereco      text        PRIMARY KEY,
  pontos        integer     NOT NULL DEFAULT 0,
  historico     jsonb       NOT NULL DEFAULT '[]'::jsonb,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  -- Invariante de negócio no nível da BD: os pontos nunca ficam negativos (debitaPontos
  -- não pode deixar o saldo abaixo de 0, mesmo que o código falhe).
  CONSTRAINT pontos_nao_negativos_check CHECK (pontos >= 0),
  CONSTRAINT pontos_historico_array_check CHECK (jsonb_typeof(historico) = 'array')
);

-- Índice para consulta por recência (a PK já cobre o acesso por endereço).
CREATE INDEX IF NOT EXISTS idx_pontos_atualizado
  ON public.pontos (atualizado_em DESC);

COMMENT ON TABLE public.pontos IS
  'Pontos de fidelidade Via B. 1 Passe = 1 ponto. 50 pontos = 1 cartão.';
COMMENT ON COLUMN public.pontos.endereco IS
  'Endereço EVM normalizado (0x + 40 hex minúsculos). Chave natural do titular.';
COMMENT ON COLUMN public.pontos.historico IS
  'Array JSONB de {data, tipo, pontos, ref}. tipo ∈ compra|palpite|resgate.';

ALTER TABLE public.pontos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role total pontos" ON public.pontos;
CREATE POLICY "service_role total pontos" ON public.pontos
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Sem acesso a anon/authenticated: os pontos são servidos pelas functions (JWT do titular).
REVOKE ALL ON public.pontos FROM PUBLIC, anon, authenticated;
-- A RLS autoriza a LINHA; o GRANT autoriza a TABELA.
GRANT SELECT, INSERT, UPDATE ON public.pontos TO service_role;
-- Sem DELETE (nenhum dado é eliminado por este UTAC; a anonimização LGPD fica para UTAC próprio).
