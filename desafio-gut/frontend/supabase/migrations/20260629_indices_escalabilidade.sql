-- 20260629_indices_escalabilidade.sql — MC39.19 Onda 1 (escalabilidade 10k)
--
-- Índices compostos/parciais para as consultas quentes de apuração e listagem.
-- SCHEMA-VÁLIDO (verificado): lances(id, edicao_id, endereco, hash_lance,
-- valor_centavos, created_at); cotas(... categoria, vendida ...). NÃO há coluna
-- `consolidado` em lances (apuração é on-chain) → o índice parcial vai em cotas.vendida.
--
-- Idempotente (IF NOT EXISTS). Execução pelo OPERADOR (R12): `supabase db query --linked`.
-- NOTA: para zero-downtime em tabelas grandes, trocar por CREATE INDEX CONCURRENTLY
-- e rodar FORA de transação (CONCURRENTLY não roda em bloco transacional). No go-live
-- as tabelas são pequenas → CREATE INDEX simples (lock breve) é seguro.

-- Item 25 — composto para listagem cronológica de lances por edição (ORDER BY created_at).
CREATE INDEX IF NOT EXISTS idx_lances_edicao_created
  ON lances (edicao_id, created_at DESC);

-- Item 25b — composto para apuração "menor lance único" por edição (Art. VIII).
CREATE INDEX IF NOT EXISTS idx_lances_edicao_valor
  ON lances (edicao_id, valor_centavos);

-- Item 26 — índice PARCIAL para "cotas disponíveis por categoria" (vendida=false),
-- menor e mais quente que o índice total de categoria (vitrine/listagens).
CREATE INDEX IF NOT EXISTS idx_cotas_categoria_disponivel
  ON cotas (categoria) WHERE vendida = false;
