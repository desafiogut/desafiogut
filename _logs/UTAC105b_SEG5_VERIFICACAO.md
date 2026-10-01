# UTAC105b — SEG5 verificação ad-hoc + SEG6 fecho (2026-09-30)

Deploy **`6abdbf7a1489720008cb2dec` ready**, `commit_ref 4cbb9f3` (auto-deploy pelo push, acompanhado em foreground).

## Produção (SQL)
`cupons` existe · UNIQUE (lojista_id, valor_rs) · service_role DELETE=false, TRUNCATE=false, INSERT=true · anon SELECT=false · cupons 0 · passes 0.

## Script 1 — `scripts/utac105b-verificacao-adhoc.mjs` (saída `_logs/UTAC105b_SEG5_saida.txt`): **VERMELHO 7/9 — FALHA DO INSTRUMENTO**
OK: `cupons.mjs` 401 JSON · `comprar-passe` JSON · controlo «função inventada → HTML» · página existe · valores [5,10,20]/30 · cuponsIds no INSERT ·
controlo «entrada adulterada ([5,10,15,20]) é detectada».
FALHA ×2 (rota/chunk no bundle): o script só lia o chunk de ENTRADA (`index-*.js`) — **crawl parcial (lição MC95.1)**; as rotas vivem noutros chunks.
## Script 2 — `scripts/utac105b-verificacao-bundle-bfs.mjs` (saída `_SEG5b_saida.txt`): **VERDE 6/6**
BFS de **134 chunks**; controlo + (`/corporativo/cotas` encontrada) e − (string inventada ausente); `/corporativo/cupons` em `CorporativoDashboard-*.js`
e `PrivyRoot-*.js`; chunk `CorporativoCupons-sT6bbWpM.js` servido; «Meus cupons» no bundle.

## Não medido (UTAC105d)
Compra real de um Passe em produção (preencher `cupons_ids`) — provada pelo handler real nos testes; em produção há 0 cupons, logo daria 409.

## R18 em 3 lugares
`_logs/UTAC105b_SEG-1_MEDICAO.md` · `_logs/UTAC105b-RELATORIO.md` · `CLAUDE.md` (secção UTAC105b) — R18-A..E.

## Fecho
3 frentes entregues; validador REFUTADO (parcial) → ⛔-1 e lacunas corrigidos (27/27 mutantes). **UTAC105c pode arrancar** — com o aviso de que,
sem cupons configurados por lojistas, a compra do Passe dá 409.
