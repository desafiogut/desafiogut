# UTAC105b — SEG0 Frente A: modelo de cupons (2026-09-30)

**Migração** (R18-A, autorizada): `_logs/UTAC105b_MIGRACAO.sql` aplicada em produção como `utac105b_cupons`.
Sonda como `service_role` (bloco DO revertido, 0 linhas ficam): INSERT ok · duplicado `5` vs `5.00` **23505** · UPDATE ok · SELECT ok ·
DELETE **42501** · TRUNCATE **42501** · `anon` SELECT **42501**.

**`_lib/cupom.mjs`** (novo): `VALORES_CUPOM = [5,10,20]` (frozen) · `VALIDADE_CUPOM_DIAS = 30` · `valorValido` (número exacto, sem coerção) ·
`lojistaValido` (`0x…40` ou `cnpj:14 dígitos`, as 2 formas medidas em produção) · `lerCupom` · `criarCupom` (23505 → existente) ·
`listarCuponsDoLojista` · `listarCuponsAtivosDoLojista` · `actualizarCupom` (cria se não existe; idempotente).
⚠️ Desvio declarado: o enunciado nomeia `listarCuponsAtivosDaEdicao(edicaoId)`. Uma edição vende 1 produto → 1 lojista (`produto.lojista`)
e o `comprar-passe` já lê o produto; uma função por edição teria de reler edição + produto (Blobs) dentro do repositório → implementado
como `listarCuponsAtivosDoLojista(lojistaId)`. `voucher.mjs` intocado (R18 Q7).

**Testes** `_tests/utac105b-cupom.test.mjs` (9): literais 5/10/20/30 · grava · 2× → 1 (+ 10 concorrentes) · valores fora → `valor_invalido`
(0,1,7,15,25,5.5,-5,"5",null,NaN,∞) · lojista inválido · listar só do lojista · actualizar (cria/activa/desactiva, 8 concorrentes) ·
activos sem inactivos · erro visível. Duplo: tabela `cupons` acrescentada ao `_supabase-duplo-mc105a.mjs`.
**Mutação** (`scripts/utac105b-prova-mutacao.mjs A`): **7/7 mortos** (1.ª ronda 6/7 — A-M6 «actualizar ignora o estado» sobreviveu;
acrescentado o caso «existente activo → desactiva»).
**A/B:** só CREATE; `passes`/`saldo_rs` não tocados (suíte no SEG2). Veredito: **SEGUIR**.
