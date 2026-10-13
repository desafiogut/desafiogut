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
