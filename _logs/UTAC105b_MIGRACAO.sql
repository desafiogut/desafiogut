-- UTAC105b — tabela `cupons` (PoC/rascunho do SEG0 0.1). HARD GATE 15: NÃO aplicado — aguarda autorização explícita do operador.
-- Projecto de produção: vjslwowwrpcawijdiksm. Só CREATE; não apaga nem altera nada que exista (P2). SQL = o do enunciado.
-- `lojista_id` = o `cliente_id` da cota corporativa (o mesmo valor gravado em `produto.lojista`): `0x…` ou `cnpj:…` (medido no SEG-1).
CREATE TABLE IF NOT EXISTS public.cupons (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lojista_id    text NOT NULL,
  valor_rs      numeric(10,2) NOT NULL,
  descricao     text NOT NULL DEFAULT '',
  validade_dias integer NOT NULL DEFAULT 30,
  ativo         boolean NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cupons_lojista_valor_key UNIQUE (lojista_id, valor_rs)   -- idempotência (P8)
);
CREATE INDEX IF NOT EXISTS cupons_lojista_idx ON public.cupons (lojista_id);
ALTER TABLE public.cupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role total cupons" ON public.cupons;
CREATE POLICY "service_role total cupons" ON public.cupons FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.cupons FROM PUBLIC, anon, authenticated;
REVOKE DELETE, TRUNCATE ON public.cupons FROM service_role;
GRANT SELECT, INSERT, UPDATE ON public.cupons TO service_role;   -- sem GRANT → 42501 em silêncio (lição MC93-B)
-- Diferenças face ao SQL do enunciado (para decisão): `IF NOT EXISTS` no índice e a POLICY do service_role
-- (padrão de `passes`; com RLS ligada e sem policy o service_role contorna a RLS de qualquer forma — inócua, explícita).
