-- UTAC110n — índice do PLACAR de pontos de lance (`GET /ranking-pontos-lance`).
--
-- PORQUE É UMA MIGRAÇÃO PRÓPRIA (achado ⚠️3 do validador SEG8): o endpoint público faz
-- `order by pontos_lance desc limit N` em `public.pontos`. Sem este índice é um **seq scan + sort de
-- toda a tabela** a 30 pedidos/min por IP. O índice estava dentro da migração da CONVERSÃO
-- (`20261018_utac110n_conversao_creditos_lance.sql`), que NÃO está aplicada — o que deixava o ranking
-- no ar sem o índice que ele usa. Separar permite aplicar o índice já, e a conversão quando o
-- operador autorizar.
--
-- ADITIVA e IDEMPOTENTE: só cria um índice que não existe (`IF NOT EXISTS`), não toca em dados nem em
-- colunas. Pode correr antes, depois ou sem a conversão.
--
-- Projecto de produção: vjslwowwrpcawijdiksm. REQUER autorização do operador para ser APLICADA.
-- Verificação depois de correr (tem de devolver o índice):
--   SELECT indexname FROM pg_indexes
--    WHERE schemaname = 'public' AND tablename = 'pontos'
--      AND indexname = 'pontos_pontos_lance_idx';
--
-- Rollback:
--   DROP INDEX IF EXISTS public.pontos_pontos_lance_idx;

CREATE INDEX IF NOT EXISTS pontos_pontos_lance_idx
  ON public.pontos (pontos_lance DESC);
