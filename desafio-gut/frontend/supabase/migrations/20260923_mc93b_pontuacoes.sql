-- 20260923_mc93b_pontuacoes.sql — MC93-B
--
-- Persistência do torneio de habilidade. O motor de cálculo é puro e vive em
-- `netlify/functions/_lib/pontuacao-utils.mjs` (MC93-A); estas tabelas dão-lhe
-- memória.
--
-- DECISÕES DO OPERADOR (2026-09-23) que o esquema materializa:
--   • CICLO = 1 EDIÇÃO  → `ciclo_id` é **TEXT**, não UUID. Os ids de edição são
--     strings ("R-1") e `lances.edicao_id` é VARCHAR(66); um UUID tornaria o
--     join impossível.
--   • DESEMPATE = mais acertos → daí `acertos_totais` em `rankings_ciclo`.
--   • LIMITE = 1 bónus por ciclo por participante → `bonus_emitido`.
--   • BÓNUS = **DIREITO, não saldo** → `senhas_a_creditar` + `liquidado_em`.
--
-- ⚠️ `senhas_a_creditar` NÃO é um saldo de senhas e NUNCA pode ser somado ao
-- saldo do utilizador. O contrato é a única autoridade: `darLance` exige
-- `saldoSenhas[msg.sender] > 0` ON-CHAIN (`Leilao.sol:88`) e decrementa-o
-- (`:107`). E `saldo-senhas.mjs` calcula `saldoEfetivo = saldoOnChain −
-- senhasConsumidas`; somar um termo off-chain quebraria a invariante
-- `saldoEfetivo ≤ saldoOnChain` e o utilizador veria senhas que o lance
-- recusaria. Esta coluna é uma DÍVIDA registada, liquidável pelo caminho já
-- existente (`fila_tarefas` → `creditarSenhas` → `adicionarSenhas`).
--
-- LIÇÕES DAS MIGRAÇÕES ANTERIORES, aplicadas aqui (MC87 / MC88.29):
--   • Sem DROP TABLE. Idempotente por `IF NOT EXISTS`.
--   • Índices e constraints vivem no SCHEMA — os nomes são qualificados.
--   • O PostgreSQL concede EXECUTE a PUBLIC por omissão: onde houvesse função,
--     seria preciso `REVOKE ... FROM PUBLIC` (aqui não há funções novas).
--   • RLS activa nas duas tabelas, com política SÓ para `service_role`.
--     A chave `anon` não lê estas tabelas — o placar é servido pelo endpoint
--     `GET /ranking`, do lado do servidor. É a brecha A-04 que o MC87 fechou.
--
-- Execução pelo OPERADOR (R12/R5).

BEGIN;

-- ─── 1. pontuacoes — o evento de uma rodada ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pontuacoes (
  id           UUID        NOT NULL DEFAULT gen_random_uuid(),
  ciclo_id     TEXT        NOT NULL,
  endereco     TEXT        NOT NULL,
  pontos       INT         NOT NULL,
  acertos      INT         NOT NULL,
  menor_unico  BOOLEAN     NOT NULL DEFAULT false,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pontuacoes_pkey PRIMARY KEY (id),
  -- Idempotência do fecho de rodada: repetir a consolidação repõe, não soma.
  CONSTRAINT pontuacoes_ciclo_endereco_key UNIQUE (ciclo_id, endereco),
  -- Mesmo formato de `atividade_utilizadores` (20260802_mc8943): minúsculas.
  CONSTRAINT pontuacoes_endereco_check CHECK (endereco ~ '^0x[0-9a-f]{40}$'),
  CONSTRAINT pontuacoes_pontos_check   CHECK (pontos  >= 0),
  CONSTRAINT pontuacoes_acertos_check  CHECK (acertos >= 0)
);

CREATE INDEX IF NOT EXISTS idx_pontuacoes_ciclo ON public.pontuacoes (ciclo_id);
-- Serve o histórico de sequências, que atravessa ciclos (5 acertos seguidos).
CREATE INDEX IF NOT EXISTS idx_pontuacoes_endereco_criado
  ON public.pontuacoes (endereco, criado_em);

-- ─── 2. rankings_ciclo — agregado do ciclo + estado do bónus ─────────────────
CREATE TABLE IF NOT EXISTS public.rankings_ciclo (
  id                 UUID        NOT NULL DEFAULT gen_random_uuid(),
  ciclo_id           TEXT        NOT NULL,
  endereco           TEXT        NOT NULL,
  pontos_totais      INT         NOT NULL DEFAULT 0,
  acertos_totais     INT         NOT NULL DEFAULT 0,
  posicao            INT         NOT NULL DEFAULT 0,
  bonus_emitido      BOOLEAN     NOT NULL DEFAULT false,
  -- DIREITO por liquidar on-chain. NÃO é saldo. Ver o cabeçalho.
  senhas_a_creditar  INT         NOT NULL DEFAULT 0,
  liquidado_em       TIMESTAMPTZ,
  atualizado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rankings_ciclo_pkey PRIMARY KEY (id),
  CONSTRAINT rankings_ciclo_ciclo_endereco_key UNIQUE (ciclo_id, endereco),
  CONSTRAINT rankings_ciclo_endereco_check CHECK (endereco ~ '^0x[0-9a-f]{40}$'),
  CONSTRAINT rankings_ciclo_pontos_check   CHECK (pontos_totais  >= 0),
  CONSTRAINT rankings_ciclo_acertos_check  CHECK (acertos_totais >= 0),
  CONSTRAINT rankings_ciclo_posicao_check  CHECK (posicao >= 0),
  CONSTRAINT rankings_ciclo_senhas_check   CHECK (senhas_a_creditar >= 0),
  -- Só se liquida o que se deve.
  -- ⚠️ A primeira versão era `liquidado_em IS NULL OR senhas_a_creditar > 0`,
  -- e bloqueava a liquidação mais óbvia de todas: pôr `liquidado_em = now()`
  -- e `senhas_a_creditar = 0` no mesmo UPDATE dava 23514. A condição correcta
  -- é sobre o BÓNUS ter existido, não sobre a dívida continuar em aberto.
  CONSTRAINT rankings_ciclo_liquidacao_check
    CHECK (liquidado_em IS NULL OR bonus_emitido = true)
);

CREATE INDEX IF NOT EXISTS idx_rankings_ciclo_ordem
  ON public.rankings_ciclo (ciclo_id, pontos_totais DESC, acertos_totais DESC);
-- Fila de liquidação: quem tem direito por honrar.
CREATE INDEX IF NOT EXISTS idx_rankings_ciclo_por_liquidar
  ON public.rankings_ciclo (liquidado_em)
  WHERE liquidado_em IS NULL AND senhas_a_creditar > 0;

-- ─── 3. RLS — escrita e leitura SÓ por service_role ──────────────────────────
ALTER TABLE public.pontuacoes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rankings_ciclo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role total pontuacoes"     ON public.pontuacoes;
DROP POLICY IF EXISTS "service_role total rankings_ciclo" ON public.rankings_ciclo;

CREATE POLICY "service_role total pontuacoes" ON public.pontuacoes
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role total rankings_ciclo" ON public.rankings_ciclo
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Sem GRANT a anon/authenticated: o placar é servido por `GET /ranking`, do
-- lado do servidor. Revogado explicitamente para não herdar de PUBLIC.
REVOKE ALL ON public.pontuacoes     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.rankings_ciclo FROM PUBLIC, anon, authenticated;

-- ⚠️ GRANT explícito ao service_role. A RLS autoriza a LINHA; o GRANT autoriza
-- a TABELA — e o `REVOKE ... FROM PUBLIC` acima retira o privilégio herdado,
-- inclusive ao service_role se os default privileges não o cobrirem. Sem isto,
-- toda a escrita falharia com 42501 (`permission denied`). A primeira versão
-- desta migração omitia-o, ao contrário do precedente do MC87 e do MC89.43 na
-- mesma pasta. Achado da validação independente do SEG4.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pontuacoes     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rankings_ciclo TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

COMMIT;
