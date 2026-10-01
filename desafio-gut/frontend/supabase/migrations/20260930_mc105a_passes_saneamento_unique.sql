-- MC105a.1 (achado ⚠️1 do validador) — o UNIQUE (endereco, edicao_id, produto_id) passa a valer SÓ para endereços reais.
-- Projecto de produção: vjslwowwrpcawijdiksm. Autorizado pelo operador («UNIQUE parcial»). Não apaga dados (P2); 0 linhas.
--
-- Porquê: a exclusão de conta troca `endereco` por `anon:<sha256>` (determinístico, HARD GATE 16). Se a mesma carteira volta,
-- compra o mesmo passe e exclui outra vez, o 2.º UPDATE colidia com o passe já anonimizado (23505, reproduzido em produção) e os
-- passes desse titular nunca mais seriam anonimizados. A unicidade serve a idempotência da COMPRA (só endereços 0x compram);
-- entre pseudónimos não protege nada. Mesmo nome → o 23505 da compra fica igual (_lib/passe.mjs só lê o SQLSTATE).
ALTER TABLE public.passes DROP CONSTRAINT IF EXISTS passes_endereco_edicao_produto_key;
CREATE UNIQUE INDEX IF NOT EXISTS passes_endereco_edicao_produto_key
  ON public.passes (endereco, edicao_id, produto_id)
  WHERE endereco LIKE '0x%';
