# UTAC105b — Relatório final: cupons do Passe Desafio (2026-09-30)

**Skill:** UTAC01 (tipo `produto`), spec `_logs/UTAC105b.spec.yml` (41 linhas). **Commits:** `b6e8488` (frentes A/B/C) · `0811c2b` (validador) + docs.
**Validador:** REFUTADO (parcial) → ⛔-1 e lacunas corrigidos → ver SEG3b.

## Entregue
| Frente | O quê |
|---|---|
| A | tabela `public.cupons` em produção (`utac105b_cupons`, sem DELETE/TRUNCATE, RLS, anon sem acesso) + `_lib/cupom.mjs` (valores R$ 5/10/20, validade 30 dias, idempotente) |
| B | `cupons.mjs` (GET/PUT, só valores da plataforma, posse MC89.38 com admin real) + `CorporativoCupons.jsx` + rota `/corporativo/cupons` + card «Meus cupons» no painel |
| C | `comprar-passe` grava no INSERT os ids dos cupons ACTIVOS do lojista do produto; sem cupons → 409 antes de debitar; débito R$ 2,00 inalterado |

## Decisões do operador (R18) — também em `_logs/UTAC105b_SEG-1_MEDICAO.md` e no CLAUDE.md
R18-A migração + rota em `App.jsx` + `cuponsIds` em `criarPasse` · R18-B posse = regra MC89.38 · R18-C 0 cupons activos → 409 · R18-D cupons no INSERT ·
R18-E **usar sempre a skill UTAC01**.

## Desvios medidos face ao enunciado
- `_lib/voucher.mjs` **não existe** (é o handler `voucher.mjs`, outro produto) → `_lib/cupom.mjs` novo; `voucher.mjs` intocado.
- `listarCuponsAtivosDaEdicao(edicaoId)` → `listarCuponsAtivosDoLojista(lojistaId)` (1 edição → 1 produto → 1 lojista; o comprar-passe já tem o produto).
- 5.º card no painel (no mobile fica sozinho na última linha).

## Prova
Testes novos: `utac105b-cupom` (11) · `utac105b-cupons-endpoint` (9) · `utac105b-ligacao` (8) · `utac105b-painel` (5); `mc105a-e2e` adaptado (R18-C).
Mutação **27/27** (`scripts/utac105b-prova-mutacao.mjs todos`). Concorrência: 10 criações/actualizações/PUTs/compras em paralelo.
Suíte: frontend **535/535** · backend **913/919**.

## Pendentes / riscos
- ⚠️ **0 cupons em produção → toda a compra de Passe dá 409 `sem_cupons_ativos` até os lojistas configurarem** (consequência directa da R18-C).
- As 2 cotas `cnpj:` sem carteira só têm cupons via admin.
- Sem CHECK de valor/formato na BD (regra só no código) · PUT grava item a item (falha de infra a meio deixa parte gravada).
- Pré-existente, fora do âmbito: `cotas.mjs` `update-corporativo` **não autentica** (comentário diz que sim) — candidato a UTAC próprio.
- Candidatos à skill (não alterada aqui, fora do `autoriza`): lição «duplo de auth permissivo esconde ramo morto» e armadilha «`\n` em template JS dentro de heredoc vira quebra real — `node --check` antes de correr».

## UTAC105c pode arrancar
Modelo, painel e ligação prontos; o comprador recebe `cupons_ids` (ids → valor/validade via `cupons`). Validade = `comprado_em` + `validade_dias`.
