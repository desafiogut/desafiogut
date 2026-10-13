-- UTAC110d — ledger de LANCE na tabela `public.pontos` (Via B, dois Passes). ADITIVA.
-- Decisão do operador R18-110d-1 (opção b): colunas novas NA MESMA LINHA — sem alterar a PK
-- (`endereco`) nem a FK de `public.palpites`.
--
--   creditos_lance  — créditos de lance DIRECTOS (1 por Passe Relâmpago; 1 lance no MLC consome 1).
--   pontos_lance    — pontos de lance ganhos por ENGAJAMENTO (Art. 16º/17º; nunca comprados).
--   historico_lance — histórico SEPARADO dos movimentos de lance. Coluna própria (extensão declarada
--                     no UTAC110d): partilhar o `historico` de fidelidade deixaria duas escritas CAS
--                     sobre colunas diferentes a reescrever o MESMO array — uma perderia a entrada da
--                     outra (lost update). Cada ledger tem o seu array e o seu CAS.
--
-- Projeto de produção: vjslwowwrpcawijdiksm. Só ADD COLUMN com DEFAULT: as linhas existentes ficam
-- com 0 / 0 / '[]' e as colunas antigas (`pontos`, `historico`) não são tocadas.

ALTER TABLE public.pontos
  ADD COLUMN IF NOT EXISTS creditos_lance  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pontos_lance    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS historico_lance jsonb   NOT NULL DEFAULT '[]'::jsonb;

-- Re-executável (SEG4 W6): os CHECK saem antes de entrar (ADD CONSTRAINT não tem IF NOT EXISTS).
ALTER TABLE public.pontos
  DROP CONSTRAINT IF EXISTS pontos_creditos_lance_nao_negativos_check,
  DROP CONSTRAINT IF EXISTS pontos_pontos_lance_nao_negativos_check,
  DROP CONSTRAINT IF EXISTS pontos_historico_lance_array_check;
ALTER TABLE public.pontos
  ADD CONSTRAINT pontos_creditos_lance_nao_negativos_check CHECK (creditos_lance >= 0),
  ADD CONSTRAINT pontos_pontos_lance_nao_negativos_check   CHECK (pontos_lance >= 0),
  ADD CONSTRAINT pontos_historico_lance_array_check        CHECK (jsonb_typeof(historico_lance) = 'array');

COMMENT ON COLUMN public.pontos.creditos_lance IS
  'UTAC110d: créditos de lance directos (Passe Relâmpago = +1; lance no MLC = -1).';
COMMENT ON COLUMN public.pontos.pontos_lance IS
  'UTAC110d: pontos de lance por engajamento (Art. 16º). NUNCA creditados por compra de Passe.';
COMMENT ON COLUMN public.pontos.historico_lance IS
  'UTAC110d: array JSONB de {data, campo, motivo, delta, ref} — ledger de lance, separado do de fidelidade.';

-- Rollback (testado no SEG3, dentro de transacção revertida):
--   ALTER TABLE public.pontos DROP CONSTRAINT pontos_creditos_lance_nao_negativos_check,
--     DROP CONSTRAINT pontos_pontos_lance_nao_negativos_check, DROP CONSTRAINT pontos_historico_lance_array_check;
--   ALTER TABLE public.pontos DROP COLUMN creditos_lance, DROP COLUMN pontos_lance, DROP COLUMN historico_lance;
