-- UTAC106g — public.resgates (pedido de resgate do cartão colecionável) — ADITIVA.
--
-- PORQUE EXISTE: fecha o ciclo do programa de fidelidade Via B. O titular acumula PONTOS de compra
-- (1 Passe = 1 ponto) e, aos 50 pontos de CARTÃO (`pontosDeCompra`, que IGNORA o bónus de palpite),
-- troca-os pelo cartão colecionável físico. O pedido (com a morada de entrega) vive aqui; o débito
-- dos 50 pontos vive em `public.pontos` (histórico, tipo "resgate").
--
-- ⚠️ NÃO toca em public.pontos (UTAC106d-v2), public.palpites (UTAC106f) nem public.passes (Via A).
-- Só CRIA. O `endereco` referencia public.pontos(endereco): sem pontos não há resgate possível.
--
-- Padrão de RLS/GRANT herdado do UTAC106d-v2/UTAC106f (`20261004_mc106dv2_pontos.sql`,
-- `20261005_mc106f_palpites.sql`): RLS autoriza a LINHA, o GRANT autoriza a TABELA — sem GRANT o
-- service_role leva 42501 em silêncio. Nenhuma policy para anon/authenticated: os resgates SÓ se
-- leem/escrevem pelo backend. A morada é dado pessoal (LGPD): nunca é exposta ao cliente anónimo.

CREATE TABLE IF NOT EXISTS public.resgates (
  id               BIGSERIAL PRIMARY KEY,
  endereco         TEXT NOT NULL REFERENCES public.pontos(endereco) ON DELETE CASCADE,
  cartao_id        TEXT NOT NULL,
  morada           JSONB NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pendente'
                     CHECK (status IN ('pendente', 'enviado', 'entregue', 'cancelado')),
  -- Idempotência do endpoint: a MESMA chave (UUID v4 gerado no cliente) não cria 2 pedidos.
  idempotency_key  TEXT NOT NULL UNIQUE,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A listagem por titular (e o histórico futuro) consultam por endereço.
CREATE INDEX IF NOT EXISTS idx_resgates_endereco ON public.resgates (endereco);
-- A operação filtra por estado (fila de pedidos por atender).
CREATE INDEX IF NOT EXISTS idx_resgates_status ON public.resgates (status);

ALTER TABLE public.resgates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role total resgates" ON public.resgates;
CREATE POLICY "service_role total resgates" ON public.resgates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.resgates TO service_role;
-- BIGSERIAL: sem USAGE na sequência o INSERT do service_role falha.
GRANT USAGE, SELECT ON SEQUENCE public.resgates_id_seq TO service_role;

COMMENT ON TABLE public.resgates IS
  'Pedidos de resgate do cartão colecionável. 50 pontos → 1 cartão.';
