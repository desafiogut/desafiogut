-- UTAC106f — public.palpites (palpite do Passe Desafio Via B) — ADITIVA.
--
-- PORQUE EXISTE: o palpite é um BÓNUS do programa de fidelidade Via B — NÃO decide o cartão
-- (o cartão é só por PONTOS de compra: 50 pontos = 1 cartão). Regra do operador (UTAC106f):
-- 1 palpite por edição Programada por endereço; apuração quando a edição fecha; o mais próximo
-- do número REAL de lances recebe +2 pontos; se ninguém acertar, ninguém recebe.
--
-- ⚠️ NÃO toca em public.pontos (UTAC106d-v2), public.passes (Via A) nem em qualquer índice
-- existente. Só CRIA. O `endereco` referencia public.pontos(endereco): um palpite exige ter
-- comprado pelo menos 1 Passe (é o gate de negócio, aplicado também no endpoint).
--
-- Padrão de RLS/GRANT herdado do UTAC106d-v2 (`20261004_mc106dv2_pontos.sql`): RLS autoriza a
-- LINHA, o GRANT autoriza a TABELA — sem GRANT o service_role leva 42501 em silêncio. Nenhuma
-- policy para anon/authenticated: os pontos/palpites SÓ se leem pelo backend (Bearer do titular).

CREATE TABLE IF NOT EXISTS public.palpites (
  id         BIGSERIAL PRIMARY KEY,
  endereco   TEXT NOT NULL REFERENCES public.pontos(endereco) ON DELETE CASCADE,
  edicao_id  TEXT NOT NULL,
  valor      INTEGER NOT NULL CHECK (valor >= 0),
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  apurado    BOOLEAN NOT NULL DEFAULT FALSE,
  resultado  TEXT CHECK (resultado IN ('mais_proximo', 'perdeu')),
  -- 1 palpite por endereço e edição (é a chave natural da idempotência do endpoint).
  CONSTRAINT palpites_endereco_edicao_unico UNIQUE (endereco, edicao_id)
);

-- A apuração lê TODOS os palpites de uma edição → índice pela chave de consulta.
CREATE INDEX IF NOT EXISTS palpites_edicao_idx ON public.palpites (edicao_id);

ALTER TABLE public.palpites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role total palpites" ON public.palpites;
CREATE POLICY "service_role total palpites" ON public.palpites
  FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.palpites TO service_role;
-- BIGSERIAL: sem USAGE na sequência o INSERT do service_role falha.
GRANT USAGE, SELECT ON SEQUENCE public.palpites_id_seq TO service_role;
