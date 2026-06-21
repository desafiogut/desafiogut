-- 20260620_amend_jsonb_payload.sql — MC32.1
--
-- Emenda ao schema definitivo para o adaptador data-store-supabase.mjs ser FIEL
-- aos contratos de dados existentes (R1 — zero regressão no flip de backend):
--
--   1. config_remota.valor (JSONB): a config "recursos_app" é um OBJETO aninhado
--      ({ isLeilaoAtivo:{ios,android,pwa}, isPagamentoNativoAtivo:{...} }), lido
--      por recursos-app.mjs e chatbot.mjs. Uma única coluna BOOLEAN não a
--      representa. As colunas valor_booleano/versao_alvo ficam para flags simples.
--
--   2. lances.payload (JSONB): o registro de lance é mais rico que as colunas
--      planas (lanceId, nomeExibicao, saldoAntes/DepoisCentavos, processadoEm,
--      key, commitmentHash). payload guarda o registro imutável COMPLETO,
--      espelhando o Key-Per-Bid dos Blobs (MC28). As colunas planas
--      (edicao_id, endereco, hash_lance, valor_centavos) ficam para índices/queries.
--
--   3. lances.hash_lance deixa de ser NOT NULL: o caminho legado (Sepolia/local)
--      não produz commitment on-chain; só mainnet preenche hash_lance.
--
-- Idempotente: seguro correr mais de uma vez.

ALTER TABLE config_remota ADD COLUMN IF NOT EXISTS valor JSONB;

ALTER TABLE lances ADD COLUMN IF NOT EXISTS payload JSONB;
ALTER TABLE lances ALTER COLUMN hash_lance DROP NOT NULL;
