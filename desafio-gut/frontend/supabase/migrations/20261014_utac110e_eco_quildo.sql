-- UTAC110e — ECOQUILDO: moeda social interna com lastro em R$ (Regulamento 5.0, Art. 47º-51º).
--
-- ADITIVA e RE-EXECUTÁVEL: cria DUAS tabelas novas. NÃO altera `public.pontos`, `public.palpites`,
-- `public.passes` nem nenhuma outra tabela existente. Nenhuma linha existente é tocada.
--
--   eco_quildo         — saldo + histórico por ENDEREÇO (1 linha por endereço, como `public.pontos`).
--                        `saldo` é INTEGER e NUNCA pode ser negativo (CHECK): o ECOQUILDO não é
--                        convertível em dinheiro nem transferível (Art. 49º) — só entra por emissão
--                        (Passe, boas-vindas, indicação) e sai por uso no site oficial.
--   eco_quildo_lastro  — registo contabilístico de LINHA ÚNICA (id = 1, CHECK `id = 1`): quanto foi
--                        emitido, quanto foi usado e a RESERVA em reais que garante o lastro integral
--                        (Art. 50º). 1 ECOQUILDO = R$ 1,00 (Art. 47º) ⇒ a reserva é guardada em
--                        CENTAVOS: `reserva_rs_centavos = (total_emitido - total_usado) * 100`.
--
-- ⚠️ Unidades: `total_emitido`/`total_usado` contam ECOQUILDO (inteiros); `reserva_rs_centavos` conta
--    CENTAVOS de R$. Converter SEMPRE com `* 100` — nunca somar 1 ECOQUILDO como 1 centavo.
--
-- Projeto de produção: vjslwowwrpcawijdiksm. ⚠️ A migração NÃO é aplicada em produção por este UTAC:
-- aplicar é decisão do operador (o push dispara o auto-deploy; o código novo responde 502 sem as tabelas).
--
-- Rollback (testado no SEG4 numa transacção REVERTIDA — bloco `DO` terminado em `RAISE EXCEPTION`):
--   DROP TABLE IF EXISTS public.eco_quildo;
--   DROP TABLE IF EXISTS public.eco_quildo_lastro;
--   (sem dados pré-existentes a preservar: as duas tabelas nascem neste UTAC)

CREATE TABLE IF NOT EXISTS public.eco_quildo (
  endereco      TEXT PRIMARY KEY,
  saldo         INTEGER NOT NULL DEFAULT 0 CHECK (saldo >= 0),
  historico     JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(historico) = 'array'),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.eco_quildo_lastro (
  id                   INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total_emitido        INTEGER NOT NULL DEFAULT 0 CHECK (total_emitido >= 0),
  total_usado          INTEGER NOT NULL DEFAULT 0 CHECK (total_usado >= 0),
  reserva_rs_centavos  INTEGER NOT NULL DEFAULT 0 CHECK (reserva_rs_centavos >= 0),
  atualizado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A linha única do lastro tem de existir ANTES do 1.º movimento (o CAS da lib lê-a e falha em `null`).
INSERT INTO public.eco_quildo_lastro (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ── SEGURANÇA: RLS + GRANT (padrão herdado do UTAC106d-v2/UTAC106f/UTAC106g/UTAC105a) ────────────
-- ⚠️ UTAC110e: esta secção NÃO existia na 1.ª versão desta migração. O validador adversarial (SEG5,
--    achado A1, BLOQUEANTE) mediu em PRODUÇÃO, numa transacção revertida, que com `SET LOCAL ROLE anon`
--    se conseguia `INSERT` de saldo do nada, `UPDATE` do saldo de OUTRA pessoa, `UPDATE` do LASTRO e
--    `SELECT` do ledger de todos — a chave `anon` (VITE_SUPABASE_ANON_KEY) vai no bundle público do
--    frontend. Sem isto, as garantias do Art. 49º (não transferível) e do Art. 50º (lastro) ficavam
--    anuladas ao nível da BASE DE DADOS, por muito correcta que a lib estivesse. Todas as tabelas irmãs
--    (`pontos`, `passes`, `palpites`, `resgates`, `cupons`) já tinham `relrowsecurity = true`.
-- RLS autoriza a LINHA; o GRANT autoriza a TABELA (sem GRANT explícito o `service_role` leva 42501 em
-- SILÊNCIO — lição do MC93-B). Nenhuma policy para `anon`/`authenticated`: o ECOQUILDO só se lê e
-- escreve pelas functions, com o Bearer do titular (ou admin para emitir).
ALTER TABLE public.eco_quildo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role total eco_quildo" ON public.eco_quildo;
CREATE POLICY "service_role total eco_quildo" ON public.eco_quildo
  FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.eco_quildo FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.eco_quildo TO service_role;

ALTER TABLE public.eco_quildo_lastro ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role total eco_quildo_lastro" ON public.eco_quildo_lastro;
CREATE POLICY "service_role total eco_quildo_lastro" ON public.eco_quildo_lastro
  FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.eco_quildo_lastro FROM PUBLIC, anon, authenticated;
-- O lastro é lido pela lib e pelos endpoints de admin; o UPDATE é do CAS da lib.
GRANT SELECT, INSERT, UPDATE ON public.eco_quildo_lastro TO service_role;
-- Sem DELETE para ninguém além do `service_role` (que tem ALL por omissão): nenhum dado deste UTAC é
-- eliminado; a anonimização LGPD de saldos de ECOQUILDO fica para UTAC próprio, como nos `pontos`.

COMMENT ON TABLE public.eco_quildo IS
  'UTAC110e: moeda social ECOQUILDO — saldo e histórico por endereço. Não convertível em dinheiro, não transferível (Art. 49º).';
COMMENT ON COLUMN public.eco_quildo.saldo IS
  'UTAC110e: ECOQUILDO disponível (inteiro, >= 0). Nunca negativo — o débito é recusado antes de escrever.';
COMMENT ON COLUMN public.eco_quildo.historico IS
  'UTAC110e: array JSONB de {data, motivo, delta, ref, saldo} — ledger do ECOQUILDO (idempotência por `ref`).';

COMMENT ON TABLE public.eco_quildo_lastro IS
  'UTAC110e: registo contabilístico de linha única do lastro em R$ do ECOQUILDO (Art. 47º/50º).';
COMMENT ON COLUMN public.eco_quildo_lastro.total_emitido IS
  'UTAC110e: total de ECOQUILDO emitido (inteiro, >= 0).';
COMMENT ON COLUMN public.eco_quildo_lastro.total_usado IS
  'UTAC110e: total de ECOQUILDO usado no site oficial (inteiro, >= 0).';
COMMENT ON COLUMN public.eco_quildo_lastro.reserva_rs_centavos IS
  'UTAC110e: reserva em CENTAVOS de R$ que garante o lastro integral — 1 ECOQUILDO = R$ 1,00 = 100 centavos (Art. 47º/50º).';
