-- =============================================================================
-- UTAC110h.3 · FRENTE G (P6) — VERIFICAÇÃO DA MIGRAÇÃO 20261014 EM PRODUÇÃO
-- =============================================================================
-- PARA QUEM: o OPERADOR corre isto. O Hermes NÃO corre (não toca em Supabase).
-- ONDE: Supabase → SQL Editor (projecto de produção do DesafioGUT).
-- PORQUÊ: o ECOQUILDO da indicação (UTAC110h.2) e do Passe (UTAC110e) grava em
--   `public.eco_quildo` e actualiza a linha ÚNICA de `public.eco_quildo_lastro`
--   (`id = 1`). Se a migração `desafio-gut/frontend/supabase/migrations/
--   20261014_utac110e_eco_quildo.sql` NÃO estiver aplicada, o código FALHA FECHADO:
--   `aplicarLastro` devolve `LASTRO_AUSENTE`, a emissão é REVERTIDA e o crédito
--   fica INERTE (medido pela sonda P6 do validador do SEG5 do UTAC110h.2).
--   Ou seja: nada de errado acontece — o ECOQUILDO simplesmente não existe.
--
-- LEITURA DOS RESULTADOS: cada consulta traz o que se espera entre [ ].
-- =============================================================================

-- 1) As duas tabelas existem?              [ esperado: 2 linhas — eco_quildo, eco_quildo_lastro ]
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('eco_quildo', 'eco_quildo_lastro')
ORDER BY table_name;

-- 2) A linha ÚNICA do lastro existe?       [ esperado: 1 ]
SELECT COUNT(*) AS linhas_lastro FROM public.eco_quildo_lastro;

-- 3) Os três contadores batem com a derivação do código?
--    `reserva_rs_centavos` TEM de ser (total_emitido − total_usado) × 100.
--                                          [ esperado: 0 linhas com divergência ]
SELECT id, total_emitido, total_usado, reserva_rs_centavos,
       (total_emitido - total_usado) * 100 AS reserva_esperada
FROM public.eco_quildo_lastro
WHERE reserva_rs_centavos <> (total_emitido - total_usado) * 100;

-- 4) Há alguma carteira com ECOQUILDO?     [ informativo — 0 é normal num sistema novo ]
SELECT COUNT(*) AS carteiras_com_eco FROM public.eco_quildo;

-- 5) RLS ligado nas duas tabelas?          [ esperado: 2 linhas, rowsecurity = true ]
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('eco_quildo', 'eco_quildo_lastro')
ORDER BY tablename;

-- 6) As policies existem?                  [ esperado: as da migração (service_role + leitura do titular) ]
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('eco_quildo', 'eco_quildo_lastro')
ORDER BY tablename, policyname;

-- 7) As CHECKs da migração estão lá?        [ esperado: saldo >= 0, histórico array, contadores >= 0 ]
SELECT conrelid::regclass AS tabela, conname, pg_get_constraintdef(oid) AS definicao
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND conrelid::regclass::text IN ('eco_quildo', 'eco_quildo_lastro')
  AND contype = 'c'
ORDER BY 1, 2;

-- =============================================================================
-- O QUE FAZER COM O RESULTADO
-- =============================================================================
-- • (1) devolve 2 linhas E (2) devolve 1  ⇒ migração APLICADA. Nada a fazer.
-- • (1) devolve 0 ou 1 linha  ⇒ a migração NÃO está aplicada: aplicar
--   `desafio-gut/frontend/supabase/migrations/20261014_utac110e_eco_quildo.sql`
--   pelo fluxo normal de migrações do projecto, e repetir este guião.
--   Enquanto isso, o ECOQUILDO por indicação e por Passe fica inerte (sem erro
--   visível para o utilizador — o crédito é revertido em silêncio, por desenho).
-- • (3) devolve linhas ⇒ os contadores divergiram: NÃO corrigir à mão com UPDATE.
--   Reportar ao operador: a reserva só é escrita por `aplicarLastro` (derivada).
--
-- ⚠️ Este ficheiro é uma VERIFICAÇÃO de leitura. Nenhuma consulta escreve nada.
-- =============================================================================
