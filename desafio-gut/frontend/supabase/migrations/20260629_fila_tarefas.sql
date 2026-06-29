-- 20260629_fila_tarefas.sql — MC39.20 Onda 7 (async/filas, item 13/14)
--
-- Fila de tarefas durável em Postgres (alternativa ao BullMQ sem worker externo nem
-- Redis — postgres-patterns). O claim é ATÔMICO via FOR UPDATE SKIP LOCKED dentro de
-- uma função, então múltiplos processadores concorrentes não pegam a mesma tarefa.
-- Retry com backoff + DLQ (tarefa com tentativas>=max fica em 'failed', sem ser
-- re-reservada). Idempotente. Execução pelo OPERADOR (R12). NÃO aplicada por código.

CREATE TABLE IF NOT EXISTS fila_tarefas (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo           TEXT NOT NULL,                       -- ex.: "notificacao-email", "consolidar-edicao"
  payload        JSONB NOT NULL DEFAULT '{}'::jsonb,
  status         TEXT NOT NULL DEFAULT 'pending',     -- pending | processing | done | failed
  tentativas     INT  NOT NULL DEFAULT 0,
  max_tentativas INT  NOT NULL DEFAULT 5,
  agendado_para  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultimo_erro    TEXT,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice das tarefas elegíveis (pending/failed prontas para rodar).
CREATE INDEX IF NOT EXISTS idx_fila_elegiveis
  ON fila_tarefas (agendado_para)
  WHERE status IN ('pending', 'failed');

ALTER TABLE fila_tarefas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role total fila" ON fila_tarefas;
CREATE POLICY "service_role total fila" ON fila_tarefas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Reserva atômica de até p_limite tarefas elegíveis: marca 'processing', incrementa
-- tentativas, e devolve as linhas. SKIP LOCKED garante que processadores concorrentes
-- não disputem a mesma tarefa (sem double-processing).
CREATE OR REPLACE FUNCTION reservar_tarefas(p_limite INT DEFAULT 10)
RETURNS SETOF fila_tarefas
LANGUAGE sql
AS $$
  UPDATE fila_tarefas
  SET status = 'processing', tentativas = tentativas + 1, atualizado_em = NOW()
  WHERE id IN (
    SELECT id FROM fila_tarefas
    WHERE status IN ('pending', 'failed')
      AND agendado_para <= NOW()
      AND tentativas < max_tentativas
    ORDER BY agendado_para
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, p_limite)
  )
  RETURNING *;
$$;

REVOKE ALL ON FUNCTION reservar_tarefas(INT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION reservar_tarefas(INT) TO service_role;
