-- 20260629_materialized_views.sql — MC39.20 Onda 6 (escalabilidade 10k)
--
-- Materialized Views para dashboards/relatórios: respostas em ms (lê o snapshot)
-- em vez de agregar ao vivo a cada request. SCHEMA-VÁLIDO (verificado):
--   lances(edicao_id, valor_centavos, created_at, ...); cotas(categoria, vendida, ...).
--
-- SEGURANÇA (MVs não suportam RLS): acesso controlado por GRANT. Mantemos o padrão
-- backend-only (como lances/cotas) — REVOKE de anon/authenticated, GRANT só service_role.
-- Idempotente. Execução pelo OPERADOR (R12): `supabase db query --linked`. NÃO aplicada por código.

-- ── MV 1: lances agregados por edição (apuração/relatório) ──────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_lances_por_edicao;
CREATE MATERIALIZED VIEW mv_lances_por_edicao AS
  SELECT
    edicao_id,
    COUNT(*)                  AS total_lances,
    MIN(valor_centavos)       AS menor_valor_centavos,
    MAX(created_at)           AS ultimo_lance_em
  FROM lances
  GROUP BY edicao_id
  WITH NO DATA;
-- UNIQUE permite REFRESH ... CONCURRENTLY (sem lock de leitura).
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_lances_edicao ON mv_lances_por_edicao (edicao_id);

-- ── MV 2: cotas disponíveis por categoria (vitrine/relatório) ───────────────
DROP MATERIALIZED VIEW IF EXISTS mv_cotas_disponiveis;
CREATE MATERIALIZED VIEW mv_cotas_disponiveis AS
  SELECT
    categoria,
    COUNT(*) AS disponiveis
  FROM cotas
  WHERE vendida = false
  GROUP BY categoria
  WITH NO DATA;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_cotas_categoria ON mv_cotas_disponiveis (categoria);

-- Carga inicial (não-concorrente exige conteúdo; com NO DATA acima, primeiro refresh popula).
REFRESH MATERIALIZED VIEW mv_lances_por_edicao;
REFRESH MATERIALIZED VIEW mv_cotas_disponiveis;

-- ── Grants: backend-only (service_role bypassa RLS; MVs não têm RLS) ────────
REVOKE ALL ON mv_lances_por_edicao FROM anon, authenticated;
REVOKE ALL ON mv_cotas_disponiveis FROM anon, authenticated;
GRANT SELECT ON mv_lances_por_edicao TO service_role;
GRANT SELECT ON mv_cotas_disponiveis TO service_role;

-- ── REFRESH agendado (operador): via pg_cron, ex. a cada 5 min ──────────────
--   SELECT cron.schedule('refresh-mv-lances', '*/5 * * * *',
--     $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_lances_por_edicao$$);
--   SELECT cron.schedule('refresh-mv-cotas', '*/5 * * * *',
--     $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_cotas_disponiveis$$);
-- (CONCURRENTLY exige o UNIQUE INDEX acima e que a MV já tenha dados.)

-- ── Particionamento (itens 23/24) — DEFERIDO/N-A ───────────────────────────
-- `transacoes` NÃO é tabela (é JSONB em wallet.payload.transacoes[]) → N/A.
-- `lances` é o único candidato a particionamento por range(created_at), mas no
-- go-live o volume é baixo → os índices compostos (MC39.19) cobrem as consultas.
-- Reavaliar quando lances ultrapassar ~10M linhas; então recriar como PARTITION BY
-- RANGE (created_at) + pg_partman create_parent/run_maintenance_proc.
