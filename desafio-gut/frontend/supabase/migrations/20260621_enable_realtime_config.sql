-- 20260621_enable_realtime_config.sql — MC34
--
-- Habilita o Supabase Realtime APENAS para config_remota (decisão MC34: realtime
-- seguro, sem risco anti-sniping/MC28). NÃO inclui `lances` — a RLS oculta lances
-- do anon de propósito (blindagem MC28); expô-los ao realtime público quebraria
-- o "menor lance único". `edicoes`/`notificacoes` não existem como tabelas Supabase.
--
-- Aditiva e idempotente: não faz DROP PUBLICATION (isso partiria o realtime default).
-- Requer execução manual no painel (produção e staging) — sem MCP/CLI nesta sessão.

-- Realtime precisa da imagem completa da linha nos eventos UPDATE.
ALTER TABLE config_remota REPLICA IDENTITY FULL;

DO $$
BEGIN
  -- cria a publicação supabase_realtime se ainda não existir
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  -- adiciona config_remota à publicação (só se ainda não estiver)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'config_remota'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE config_remota;
  END IF;
END $$;
