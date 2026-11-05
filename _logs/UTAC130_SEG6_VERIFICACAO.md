# UTAC130 — SEG6 · verificação ad-hoc e fecho

- Script `utac130-adhoc-q8m3.mjs` (scratchpad, fora do repo), corrido UMA vez. Saída: `_logs/UTAC130_SEG6_saida.txt`.
- Verifica: sem tile «Saldo (R$)»; tiles Carteira/Passe com memo; ordem dos 4 tiles; `MinhaCarteira.jsx` byte-igual ao baseline (nada mudou onde não devia); AAB v8 com o SHA-256 `222e3065…`; 6 logs presentes.
- **Controlo positivo:** contra `eae7654` (antes do UTAC) falha → OK.
- Suíte 1303/1303 · 1456/1462. R18 em 3 lugares (SEG-1, relatório, CLAUDE.md).
