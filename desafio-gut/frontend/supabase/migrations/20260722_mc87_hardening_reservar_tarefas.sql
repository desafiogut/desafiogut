-- MC87 (P1-3 + P3-4) — Endurecimento da RPC `reservar_tarefas` e do trigger da fila.
--
-- ACHADO (MC86 / A-04): em produção, `public.reservar_tarefas(p_limit integer)`
-- estava declarada SECURITY DEFINER com EXECUTE concedido a PUBLIC. Como
-- SECURITY DEFINER corre com os privilégios do owner, a função IGNORAVA o RLS de
-- `fila_tarefas`: qualquer pessoa na internet, com a chave anon (que é pública
-- por desenho e viaja no bundle), lia a fila via /rest/v1/rpc/reservar_tarefas.
-- Prova recolhida em 2026-07-22: a chamada anónima devolveu HTTP 200.
--
-- ⚠️ NOTA DE DRIFT — LER ANTES DE MEXER NA FILA
-- A definição em produção NÃO é a de `20260629_fila_tarefas.sql`. Aquela migração
-- nunca foi aplicada; foi aplicado à mão um schema diferente:
--
--                        repo (20260629)              produção (real)
--   assinatura           reservar_tarefas(p_limite)   reservar_tarefas(p_limit)
--   corpo                UPDATE ... SET 'processing'  SELECT ... FOR UPDATE
--   segurança            INVOKER + REVOKE             DEFINER + EXECUTE p/ PUBLIC
--   status               pending/processing/done/…    pendente/processando/…
--   colunas extra        agendado_para, max_tentativas, ultimo_erro   (não existem)
--
-- Consequência funcional: `_lib/fila.mjs` chama a RPC com `p_limite`, que não
-- corresponde a nenhuma função em produção. O erro cai no ramo
-- `pareceTabelaAusente` e é reportado como `inerte: true` — ou seja, a fila não
-- está dormente como o código sugere, está SILENCIOSAMENTE PARTIDA. Isso é uma
-- pendência funcional (não de segurança) e fica FORA do âmbito do MC87.
--
-- Esta migração é deliberadamente CIRÚRGICA: preserva o corpo e a assinatura que
-- estão de facto em produção (substituí-los pelos do repo falharia, porque as
-- colunas não existem) e corrige apenas a postura de segurança.

-- 1) SECURITY INVOKER + search_path fixo (A-15).
--    Como o backend chama esta RPC com a service_role — que ignora RLS por
--    natureza — passar a INVOKER não altera o comportamento do servidor; apenas
--    deixa de ser um túnel para quem chama com a chave anon.
CREATE OR REPLACE FUNCTION public.reservar_tarefas(p_limit integer DEFAULT 10)
RETURNS SETOF public.fila_tarefas
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT *
    FROM public.fila_tarefas
    WHERE status = 'pendente'
    ORDER BY created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED;
$$;

-- 2) Fecha o EXECUTE. `FROM PUBLIC` é o que realmente importa: os GRANTs a anon e
--    authenticated eram herdados de PUBLIC, não concedidos diretamente.
REVOKE ALL ON FUNCTION public.reservar_tarefas(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reservar_tarefas(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reservar_tarefas(integer) TO service_role;

-- 3) A-15 — o trigger também tinha search_path mutável.
ALTER FUNCTION public.update_fila_tarefas_updated_at() SET search_path = '';

-- 4) Limpeza: `fila_tarefas` tinha DUAS políticas idênticas para service_role
--    ("service_role total fila" e "service_role_all"). Redundância, não brecha.
DROP POLICY IF EXISTS "service_role_all" ON public.fila_tarefas;
