# MC104 — SEG4 (verificação ad-hoc) + SEG5 (fecho)

## SEG4 — `scripts/mc104-verificacao-adhoc.mjs` (produção, sem credenciais)
Deploy **`6abca491af7e520008a25d40`**, `commit_ref 6b7e680`, `ready` (auto-deploy do push).

| Verificação | Resultado |
|---|---|
| V1 `/consentimento` existe (JSON, não o index.html) · GET sem token 401 · POST sem token 401 (nada gravado) | OK ×3 |
| V2 `/exportar-dados` sem token → 401 JSON (não há acesso a dados de terceiros sem sessão) | OK |
| V3 exportação com pedidos (`comprador`), lances, pontos, ranking, consentimento, Supabase | OK |
| V4 SPA/gate responde · o bundle publicado contém o envio do aceite (`titularLocal`) — 12 chunks lidos | OK ×2 |
| V5 relatórios `_logs/MC104_*` sem endereços nem e-mails | OK ×4 |
| **Total** | **11/11 OK** |

**Controlo positivo (`--adulterar`): 7/7 adulterações detectadas.** Suíte: 516/516 · 817/823.

⚠️ **NÃO medido em produção (L-4):** o fluxo com sessão real (aceitar → login → registo gravado; exportação de uma conta real).
Exige login numa conta verdadeira (acção do operador; R5). Coberto por testes do handler real + cablagem.
⚠️ **Instrumento:** o 1.º acompanhamento do deploy (node + `spawnSync` com `shell:true`) partia o JSON do `--data` e respondia
«listados: 0» durante 9 min — **2.ª sonda cega em dois MCs**. Denunciada por imprimir a contagem de listados.

## SEG5 — fecho
- **R18 (4 decisões):** consent-log · envio pós-login no AppContext · 5 tipos + Supabase · 1.ª conta do aparelho.
  Registadas em `_logs/MC104_SEG-1_MEDICAO.md`, `CLAUDE.md` (secção MC104) e `Desktop/MC104-RELATORIO.md`.
- **Áreas proibidas não tocadas:** `saldoRs.mjs`, `mp-client.mjs`, `_lib/pedidos.mjs`, `_lib/conta-delete.mjs`,
  `delete-account.mjs`, política de privacidade, retenção. **Zero dados apagados, zero dependências, zero tabelas novas.**
  `AppContext.jsx` tocado com autorização R18. `package-lock.json` (modificado antes do MC) não commitado.
- **O MC115 pode arrancar**, sabendo que:
  1. quem aceitou antes do MC104 não tem prova no servidor — subir `VERSAO_CONSENTIMENTO` força novo aceite (decisão);
  2. contas que não são a 1.ª do aparelho entram **sem** aceite próprio — o gate por aparelho é anterior ao MC104;
  3. ficam fora da exportação: `referral-*`, `fingerprint`, `notificacoes`, `pedidos-pagos`/`-meta`, `admin_logs`,
     `usuarios_bloqueio`, `notifications`;
  4. `comprar-senhas.mjs` grava `termoVersao:"v2026-05"`, dessincronizado do gate `2.0`.
