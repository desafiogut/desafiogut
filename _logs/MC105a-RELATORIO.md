# MC105a — Passe Desafio: modelo + backend · RELATÓRIO (2026-09-30)

## Veredito: ver `MC105a_SEG5_VERIFICACAO.md` (publicação + verificação em produção)

## O que existe agora
| peça | o quê |
|---|---|
| Supabase `public.passes` (produção, autorizada) | `id, endereco, edicao_id, produto_id, comprado_em, palpite_usado, cupons_ids, status`; UNIQUE `(endereco, edicao_id, produto_id)`; CHECKs; RLS; sem acesso de `anon`/`authenticated` |
| `_lib/passe.mjs` | `criarPasse` (idempotente pelo UNIQUE) · `lerPasse` · `listarPassesDoComprador` · `marcarPalpiteUsado` (CAS; para o MC106) |
| `comprar-passe.mjs` | POST, user-session; só edições **Programadas** abertas com o **produto vinculado** e `ativo`; passe existente → **200** sem debitar; débito R$ 2,00 atómico (`debitarSaldoRs`) → **201**; saldo insuficiente → **402**; qualquer falha depois do débito → **reembolso** (alerta se o reembolso falhar) |
Off-chain; sem UI, cupons, palpite nem flags. `comprar-senhas`, `saldoRs` e `voucher` estão intactos.

## Decisões (R18 — 3 lugares: este relatório, `_logs/MC105a_SEG0.md`, `CLAUDE.md`)
Enunciado: DEC-01 (Passe pago com saldo R$) · DEC-02 (cupons no MC105b) · DEC-03 (1 Passe = 1 palpite = 1 produto) ·
DEC-104.3-3 · DEC-104.3-5.
No SEG-1:
- **R18-1** aceitar idempotência por UNIQUE + compensação (não existe `debitarSaldoRsIdempotente`);
- **R18-2** só Programadas + produto vinculado;
- **R18-3** aplicar a migração.

## Provas
| gate | resultado |
|---|---|
| HG1 medir | baseline real `b31dbd8` 530/842; o débito medido não era idempotente → PARAR/AJUSTAR → decisão R18-1 |
| HG2 A/B | tabelas existentes iguais (22→23 tabelas; saldo 2375 → 2375); `comprar-senhas`/`saldoRs`/`voucher` sem diff; testes do `comprar-senhas` 14/14 |
| HG7/8 | 32 testes (handler real + saldoRs real); mutação **30/30** |
| HG9 | validador APROVADO COM RESSALVAS; 2 ⚠️ corrigidas (cobrança sem reembolso numa corrida; 402 falso) + 6 lacunas de teste |
| HG13 | 10 cliques simultâneos → 1 passe, 1 débito líquido, nenhum 402 |
| HG14 | nunca negativo: saldo exacto, legado, concorrência (validador + E5/E6) |
| HG15 | SQL em `_logs/MC105a_MIGRACAO.sql`, aplicado com autorização |
| HG16 | nenhuma chamada on-chain |
| suíte | frontend **530/530** · backend **874/880** |

## Pendências (não executadas)
1. O **`service_role` tem DELETE/TRUNCATE em `passes`** (default privileges do Supabase). Revogar é uma DDL nova e fica
   para decisão do operador.
2. **LGPD:** `passes` não está no `exportar-dados` nem no `conta-delete` (ambos proibidos neste MC). Tem de entrar
   antes de haver passes reais.
3. O ficheiro de migração não está em `desafio-gut/frontend/supabase/migrations/` (só o `_logs/` estava autorizado).
4. Um 402 numa **outra** edição durante a janela de reembolso de uma corrida, e `conflito_concorrencia` com saldo
   suficiente (limite do `saldoRs.mjs`): custo da compensação, registado.
5. `marcarPalpiteUsado` não mexe no `status`: a relação `palpite_usado` ↔ `status:"usado"` é do MC106.
