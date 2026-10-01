-- MC105a.1 — saneamento da tabela `passes` (MC105a). Projecto de produção: vjslwowwrpcawijdiksm.
-- Autorizado pelo operador (HARD GATE 15). Não apaga dados (P2); a tabela tinha 0 linhas na medição.
--
-- Frente A — o Supabase dá DELETE/TRUNCATE ao service_role por default privileges; o GRANT explícito
-- do MC105a (SELECT, INSERT, UPDATE) não os retirava. Revogam-se SÓ estes dois (HARD GATE 13).
REVOKE DELETE, TRUNCATE ON TABLE public.passes FROM service_role;

-- Frente B (pré-requisito) — a exclusão de conta substitui `endereco` por `anon:<sha256>` (MC104.3,
-- chaveAnonima). O CHECK do MC105a só aceitava '^0x[0-9a-f]{40}$', o que fazia o UPDATE da
-- anonimização falhar com 23514. Alarga-se para aceitar também o pseudónimo; nada mais muda.
ALTER TABLE public.passes DROP CONSTRAINT IF EXISTS passes_endereco_check;
ALTER TABLE public.passes ADD CONSTRAINT passes_endereco_check
  CHECK (endereco ~ '^0x[0-9a-f]{40}$' OR endereco ~ '^anon:[0-9a-f]{64}$');
