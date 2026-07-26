-- 20260726_mc8829_fila_tarefas_corrigida.sql — MC88.29
--
-- PORQUE EXISTE: o MC88.28 provou, com uma compra real, que o caminho assíncrono
-- devolve 502 porque `enfileirar()` rebenta no INSERT — a `fila_tarefas` em
-- produção foi criada à mão com um esquema diferente do repo (ver a nota de drift
-- em 20260722_mc87_hardening_reservar_tarefas.sql). Esta migração põe em produção
-- o esquema que `_lib/fila.mjs` realmente espera.
--
-- ⚠️ NÃO aplicar `20260629_fila_tarefas.sql` diretamente. Falha e/ou regride:
--
--   1. `CREATE OR REPLACE FUNCTION reservar_tarefas(p_limite INT)` → ERRO 42P13.
--      A função em produção é `reservar_tarefas(p_limit integer)`: o nome do
--      parâmetro difere, mas a ASSINATURA é a mesma `(integer)`, e o PostgreSQL
--      não deixa renomear parâmetros num REPLACE. Tem de ser DROP + CREATE.
--
--   2. `CREATE TABLE fila_tarefas (... PRIMARY KEY)` → ERRO "relation
--      fila_tarefas_pkey already exists". Índices e constraints vivem no SCHEMA,
--      não na tabela: renomear a tabela NÃO liberta os nomes. O mesmo vale para
--      `idx_fila_elegiveis`, que com `IF NOT EXISTS` seria silenciosamente
--      ignorado e deixaria a tabela nova SEM índice.
--
--   3. O repo só faz `REVOKE ... FROM anon, authenticated`. O PostgreSQL concede
--      EXECUTE a PUBLIC por omissão em funções novas, e os GRANTs a anon/
--      authenticated eram HERDADOS de PUBLIC — logo, sem `REVOKE ... FROM PUBLIC`
--      reabriríamos a brecha A-04 que o MC87 fechou (chave anon a ler a fila).
--
--   4. O repo não fixa `search_path` na função (achado A-15 do MC87).
--
-- Estado de partida verificado em 2026-07-26: `fila_tarefas` tinha 0 linhas, logo
-- não há dados de utilizador em risco. Ainda assim ARQUIVAMOS em vez de destruir.
-- Execução pelo OPERADOR (R12/R5). Idempotente até ao ponto do RENAME.

BEGIN;

-- ─── 1. Arquiva o esquema hand-made e LIBERTA os nomes dos objetos ────────────
ALTER TABLE IF EXISTS public.fila_tarefas RENAME TO fila_tarefas_legado;
ALTER TABLE IF EXISTS public.fila_tarefas_legado
  RENAME CONSTRAINT fila_tarefas_pkey TO fila_tarefas_legado_pkey;
ALTER INDEX IF EXISTS public.idx_fila_elegiveis RENAME TO idx_fila_elegiveis_legado;

-- A RPC antiga tem a mesma assinatura (integer) — REPLACE falharia (ver nota 1).
DROP FUNCTION IF EXISTS public.reservar_tarefas(integer);

-- ─── 2. Esquema do repo (20260629_fila_tarefas.sql) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.fila_tarefas (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo           TEXT NOT NULL,
  payload        JSONB NOT NULL DEFAULT '{}'::jsonb,
  status         TEXT NOT NULL DEFAULT 'pending',   -- pending|processing|done|failed
  tentativas     INT  NOT NULL DEFAULT 0,
  max_tentativas INT  NOT NULL DEFAULT 5,
  agendado_para  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultimo_erro    TEXT,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fila_elegiveis
  ON public.fila_tarefas (agendado_para)
  WHERE status IN ('pending', 'failed');

ALTER TABLE public.fila_tarefas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role total fila" ON public.fila_tarefas;
CREATE POLICY "service_role total fila" ON public.fila_tarefas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 3. Reserva atómica (SKIP LOCKED) + postura de segurança do MC87 ─────────
-- Diferente da versão que estava em produção, esta faz UPDATE de facto: marca
-- 'processing' e incrementa `tentativas`. A anterior era só um SELECT, portanto
-- nem sequer reservava — dois processadores podiam pegar a mesma tarefa.
-- `SET search_path = ''` (A-15) obriga a qualificar tudo com `public.`.
CREATE FUNCTION public.reservar_tarefas(p_limite INT DEFAULT 10)
RETURNS SETOF public.fila_tarefas
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  UPDATE public.fila_tarefas
  SET status = 'processing', tentativas = tentativas + 1, atualizado_em = NOW()
  WHERE id IN (
    SELECT id FROM public.fila_tarefas
    WHERE status IN ('pending', 'failed')
      AND agendado_para <= NOW()
      AND tentativas < max_tentativas
    ORDER BY agendado_para
    LIMIT GREATEST(1, p_limite)
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$;

-- FROM PUBLIC é o que realmente importa (MC87): anon/authenticated herdam de lá.
REVOKE ALL ON FUNCTION public.reservar_tarefas(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reservar_tarefas(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reservar_tarefas(integer) TO service_role;

COMMIT;
