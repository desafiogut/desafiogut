# UTAC000.17 — Relatório: prazo real do relâmpago + overlay agregado (DEBT-016)

**Data:** 2026-10-02 · **Executor:** Claude Code (Opus 5.5) · **Base:** `85837bf` = `origin/main` = HEAD
**VEREDICTO: PARADO NO SEG-1 (GATE 10/HI5) e PARTIDO EM 3 UTACs** (decisão do operador, R18). **Zero código alterado.** DEBT-016 **continua aberta**.

---

## 1. Porque parou (medido — `_logs/UTAC000.17_SEG-1_MEDICAO.md` + `_EVIDENCIA.txt`)
1. **Não existe prazo real da R-1 em lado nenhum.** O servidor **sintetiza** a R-1 a cada pedido (`edicoes-core.mjs` l. 18-19/117/193): o `termino_em` é agora+24 h e anda com o relógio (validador: +7,97 s entre 2 GETs com 8 s; 6 campos em vez dos 11 de uma edição persistida). On-chain, `prazo = 0`.
2. **«O utilizador deu lance nesta edição» não é observável no cliente em mainnet:** `lances-flash` vazio em produção (R-1, RELAMP-3, ESPECIAL-AIRFRYER), as notificações de lance só correm no ramo legado, `feedback` só depois de consolidar, a tabela `lances` é só `service_role`. ⇒ o filtro do GATE 21 exige um **endpoint novo** (o spec só autorizava `src/**`).
3. **O overlay** é montado no `Dashboard` e no `MercadoLances`, ambos proibidos. *(Refutado na letra pelo validador: há um sítio único autorizado — `AppLayout` + neutralizar o `showOverlay` no `AppContext` — mas isso não salva o UTAC: 1 e 2 bloqueiam de qualquer forma.)*
4. O spec tinha o caminho do `FimEdicaoOverlay` errado e autorizava-o e proibia-o ao mesmo tempo. A dimensão (backend + frontend + decisão operacional) não cabia em 2 h (HI5).

## 2. Decisão do operador (R18) — partir em 3
| spec | o quê | depende de |
|---|---|---|
| `_logs/UTAC000.17b.spec.yml` | prazo do relâmpago lido do `termino_em` do servidor (só com `edicoesStatus==="ok"`, offset do relógio num sítio só) — fecha a **origem local** do prazo | — |
| `_logs/UTAC000.17a.spec.yml` | endpoint autenticado «as minhas participações por edição» (sem valores em edições abertas; anti-IDOR) | — |
| `_logs/UTAC000.17c.spec.yml` | overlay agregado + FECHAR + «visto» persistente, num sítio único | 17a + 17b |
Ordem recomendada: 17b ∥ 17a → 17c. **Activação: 17b + 17c juntos antes de desligar o EM BREVE.**

## 3. Validador adversarial (`_logs/UTAC000.17_SEG-1_VALIDADOR.md`) — APROVADO COM RESSALVAS
Confirmou o PARAR e a partição. Achados aplicados aos specs (documentação):
- ⚠️ **R-B1 (grave):** o 17b sozinho **não fecha a DEBT-016** — o «NOVA RODADA» rearma o prazo local; com o servidor a prevalecer o overlay reabre ~1,2 s depois, para sempre (modal que não se fecha). Título do 17b corrigido.
- ⚠️ **R-B2:** o fallback do `useEdicoes` constrói o `termino_em` da R-1 a partir do **próprio prazo local** (`gut_prazo_flash`) ⇒ só aceitar dados reais do servidor.
- ⚠️ **R-B3:** a «edição activa» não está definida — com `EDICAO_ATIVA="R-1"` fixo e a R-1 sintetizada, o overlay nunca abre (→ **DEBT-017**).
- ⚠️ **R-B4:** o `prazoProgramado` também é local (24 h).
- 17a: já existe `idx_lances_endereco`; o `exportar-dados` lê participações mas não serve (finalidade LGPD, rate-limit 6, devolve valores).
- Nova dívida candidata: **DEBT-018** (Blob `bids` fora do `exportar-dados`, não medido).

## 4. Dívida
- **DEBT-016:** aberta, anotada com a partição e o aviso do R-B1.
- **DEBT-017 (nova):** a R-1 não tem caminho de código para um prazo real (`criarEdicao` só gera `RELAMP-N`/`PROG-N`).
- **DEBT-018 (nova, candidata):** Blob `bids` fora do `exportar-dados` — medir antes de classificar.

## 5. Decisões pendentes do operador
1. Qual é a «edição activa» e como nasce o seu prazo (DEBT-017) — sem isto o 17b fica sem fim de leilão real.
2. «Visto» no aparelho (`localStorage`) ou no servidor (multi-aparelho) — 17c.
3. Montar o agregado tocando Dashboard/MercadoLances (limpo) ou no `AppLayout` (sem os tocar, deixa código morto) — 17c.

## 6. Custo
**USD não medido** (Claude Code, sem `state.db`; mesma conversa dos UTAC000.14/15/16 — não é sessão dedicada). Medido: validador **157 242 tokens** (36 chamadas, 407 s).

## 7. Deploy
Nenhum (só `_logs/`). Push pendente de autorização.
