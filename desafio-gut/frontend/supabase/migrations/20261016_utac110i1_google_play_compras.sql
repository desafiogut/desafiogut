-- UTAC110i.1 — GOOGLE PLAY BILLING: registo de compras do Passe Desafio (FRENTE C).
--
-- ADITIVA e RE-EXECUTÁVEL: cria UMA tabela nova. NÃO altera `public.pontos`, `public.passes`,
-- `public.eco_quildo`, `public.eco_quildo_lastro`, `public.saldo_rs` nem nenhuma outra tabela.
-- Nenhuma linha existente é tocada.
--
--   google_play_compras — um registo por COMPRA da Google Play (PK = `purchase_token`, cuja
--                         unicidade é garantida pelo próprio Google Play). É a trava de
--                         IDEMPOTÊNCIA do endpoint `validar-compra-google.mjs`: o mesmo recibo
--                         entregue 2× (retry do cliente, app morta entre o pagamento e a entrega,
--                         dois cliques, dois dispositivos) credita os benefícios UMA vez.
--                         Guarda os números ENTREGUES para que um 200 idempotente os possa
--                         devolver sem voltar a tocar nos ledgers.
--
-- ⚠️ `estado`: 'recebida' (linha criada, validação/crédito em curso) · 'creditada' (benefícios
--    entregues) · 'falhada' (a Google recusou o recibo ou a cadeia de crédito caiu). Só
--    'creditada' responde 200 idempotente; 'recebida'/'falhada' admitem nova tentativa (é o que
--    permite fechar uma compra a MEIO sem cobrar outra vez).
--
-- ⚠️ Porque é que existe uma tabela e não bastava a `ref` do ledger de pontos: a `ref` prova que a
--    linha de pontos foi escrita; a tabela prova o que a GOOGLE respondeu sobre aquele recibo
--    (estado da validação, orderId) e permite responder a um retry depois de o ledger já ter sido
--    tocado — as duas travas são complementares (defesa em profundidade).
--
-- Projeto de produção: vjslwowwrpcawijdiksm. ⚠️ Como no UTAC110e, esta migração NÃO é aplicada em
-- produção por este UTAC: aplicar é decisão do operador (o push dispara o auto-deploy; sem a tabela
-- o endpoint responde 502/503 e nada é creditado — e, com a flag `isPagamentoNativoAtivo` desligada,
-- o endpoint nem é alcançável pela UI). Estado declarado no relatório do UTAC.
--
-- ⚠️ LGPD (pendência DECLARADA, não executada): esta tabela guarda `endereco` (dado pessoal no
--    tratamento do repo). Os fluxos `conta-delete` (anonimização) e `exportar-dados` (portabilidade)
--    têm de passar a cobri-la — fica como pendência no relatório e no `_logs/DEBT.md`. Sem isso, um
--    pedido de eliminação deixaria o endereço nesta tabela.
--
-- Rollback (seguro: a tabela nasce neste UTAC, não há dados pré-existentes a preservar):
--   DROP TABLE IF EXISTS public.google_play_compras;

CREATE TABLE IF NOT EXISTS public.google_play_compras (
  purchase_token  TEXT PRIMARY KEY,
  order_id        TEXT,
  produto_id      TEXT NOT NULL,
  tipo_passe      TEXT NOT NULL CHECK (tipo_passe IN ('relampago', 'programado')),
  endereco        TEXT NOT NULL,
  estado          TEXT NOT NULL DEFAULT 'recebida'
                  CHECK (estado IN ('recebida', 'creditada', 'falhada')),
  pontos          INTEGER CHECK (pontos IS NULL OR pontos >= 0),
  creditos_lance  INTEGER CHECK (creditos_lance IS NULL OR creditos_lance >= 0),
  eco_quildo      INTEGER CHECK (eco_quildo IS NULL OR eco_quildo >= 0),
  motivo          TEXT,
  payload         JSONB,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leitura por conta (auditoria/suporte: «que compras tem este endereço?»).
CREATE INDEX IF NOT EXISTS google_play_compras_endereco_idx
  ON public.google_play_compras (endereco, criado_em DESC);

-- RLS ligada SEM políticas: o `service_role` (as funções Netlify) passa por cima; `anon` e
-- `authenticated` não vêem nada. A tabela não é lida pelo cliente.
ALTER TABLE public.google_play_compras ENABLE ROW LEVEL SECURITY;

-- Saneamento herdado do UTAC105a.1: um registo de compra é prova contabilística — DELETE/TRUNCATE
-- não são operações de runtime. O `service_role` mantém INSERT/SELECT/UPDATE (o endpoint precisa).
REVOKE DELETE, TRUNCATE ON public.google_play_compras FROM service_role;

COMMENT ON TABLE public.google_play_compras IS
  'UTAC110i.1 — registo/IDEMPOTÊNCIA das compras do Passe Desafio feitas no Google Play Billing (PK = purchase_token).';
