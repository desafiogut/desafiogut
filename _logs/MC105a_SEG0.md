# MC105a — SEG0 · Frente A: modelo + repositório (2026-09-30)

## Decisões do operador no SEG-1 (R18 — registadas aqui, no CLAUDE.md e no relatório)
| # | pergunta | resposta |
|---|---|---|
| R18-1 | `debitarSaldoRsIdempotente` não existe; aceitar a idempotência por UNIQUE + compensação? | **Aceitar a compensação** |
| R18-2 | que edições aceitam o Passe | **só Programadas, abertas, com o produto vinculado à edição e `ativo`** |
| R18-3 | aplicar `_logs/MC105a_MIGRACAO.sql` em produção | **Sim, aplicar** |

Mais as decisões do enunciado: DEC-01 (PIX/saldo R$), DEC-02 (cupons: MC105b), DEC-03 (1 Passe = 1 palpite = 1 produto),
DEC-104.3-3 e DEC-104.3-5.

## 0.1/0.2 Migração (HG15), aplicada com autorização
- `mcp__supabase__apply_migration` com o nome `mc105a_passes`, no projecto **`vjslwowwrpcawijdiksm`**
  (confirmado por `get_project_url` antes de escrever). SQL em `_logs/MC105a_MIGRACAO.sql`.
- Medido depois:
  - `passes`: 8 colunas; RLS `true`; constraints `passes_pkey`, `…_endereco_edicao_produto_key` (UNIQUE),
    `…_endereco_check`, `…_status_check` e `…_cupons_ids_check`; 0 linhas;
  - **nenhum grant a `anon`/`authenticated`**.
- ⚠️ **O `service_role` tem DELETE e TRUNCATE.** São os default privileges do Supabase para tabelas novas. O
  comentário «sem DELETE» do meu SQL não se cumpriu. Revogar é uma DDL nova e fica para decisão do operador.
- O ficheiro de migração não foi copiado para `desafio-gut/frontend/supabase/migrations/`: só está autorizado o `_logs/`.

## 0.4 A/B das tabelas existentes (antes → depois da migração)
| métrica | antes | depois |
|---|---|---|
| tabelas em `public` | 22 | 23 |
| `saldo_rs` / `_creditos` / `_debitos` | 8 / 21 / 0 | 8 / 21 / 0 |
| soma do saldo (centavos) | 2375 | 2375 |
As colunas das tabelas `saldo_rs*` não mudaram.

## 0.2 `_lib/passe.mjs`
| função | contrato |
|---|---|
| `lerPasse({endereco, edicaoId, produtoId})` | a linha ou `null`; com chave inválida devolve `null` sem consultar; **lança** em erro do Supabase |
| `criarPasse(...)` | `{ok:true, criado:true, passe}` · se já existe ou perdeu a corrida (`23505`): `{ok:true, criado:false, passe:<existente>}` · `{ok:false, code:"params_invalidos"\|"gravar_passe_falhou"}` |
| `listarPassesDoComprador(e)` | os passes do comprador, por `comprado_em` ascendente; lança em erro |
| `marcarPalpiteUsado(id)` | CAS (`palpite_usado=false` → `true`) · `palpite_ja_usado` · `passe_nao_encontrado` (inclui id não-UUID, evitando o `22P02`) · não mexe no `status` |

O endereço é normalizado para minúsculas. Não há logs com dados pessoais.

## 0.3 Testes (`_tests/mc105a-passe.test.mjs`, 8) sobre `_tests/_supabase-duplo-mc105a.mjs`
O duplo copia o comportamento real do PostgREST: UNIQUE `23505`, os CHECKs e DEFAULTs da migração, `22P02` em
uuid, `eq(null)` recusado, `insert`/`update` sem `.select()` a devolver `null`, `PGRST116`, e lança em métodos não modelados.
Testes A1–A8: grava com os defaults · 2× dá 1 só · corrida (um INSERT concorrente ganha) · chaves diferentes ·
ler existente/inexistente/inválida · listar só os dele · marcar 1× e depois `ja_usado`/`nao_encontrado` · erros não passam
por sucesso.
Mutantes A1–A6 (23505 não idempotente · ler sem produto · sem normalizar · marcar sem CAS · listar sem comprador ·
chave inválida chega ao Supabase): todos **RED**. O A2 sobreviveu à primeira ronda: faltava o caso
«mesmo comprador, mesma edição, outro produto». Foi acrescentado e o A2 passou a RED.
