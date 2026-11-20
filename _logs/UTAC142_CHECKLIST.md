# UTAC142 — CHECKLIST (actualizado no UTAC144, 2026-11-20)

Itens 1–5 em produção: commit `b6365e7`, deploy `6affdd88`. Números medidos no UTAC144 (`_logs/UTAC144_SUITE-DIRIGIDA.txt`), um ficheiro de cada vez.

- [x] **Débito de 1 e 2 pontos a funcionar e testado** — `utac142-debito-1-2` 7/7. A sonda S3 do validador corre o fluxo real do lance.
- [x] **Layout do Início igual ao «Dar Palpite»** — `utac142-inicio-especial` 3/3 · `Dashboard` 54/54. Ressalva: a ausência de CLS não foi medida em browser (ℹ️8 do SEG4).
- [x] **Consumo de Passe — regra REAL = 1 a cada 3 lances** (UTAC142.1, R18-142.1-A). Substitui o «1 por participação» do spec original;
  a substituição está registada em `docs/EDICAO-ESPECIAL-CONFIG.md` («Regra do Passe na Edição Especial»). `utac142-especial-passe` 10/10.
- [x] **Nome formatado na tabela (Primeiro Nome + Inicial)**, idempotente («Ana S.» → «Ana S.») — `utac142-nome-exibicao` 7/7
  (o enunciado do UTAC143/144 dizia «34/34»: essa era a contagem de 3 ficheiros juntos, não deste ficheiro) · frontend `utac140` 12/12.
- [x] **Notificações do GUTO (3 eventos)** — `utac142-lider-especial` 14/14 (eram 11; + E12 do executor + E13/E14 do validador).
- [x] **Suíte verde, com ressalva** — as 2 falhas de DNS do `mc9952` foram isoladas no UTAC144. A amostra `exemplo.com` (domínio de
  terceiros instável) só é saltada quando não resolve, com diagnóstico no output; as provas contra SSRF e os outros CDNs correm sempre.
  Neste ambiente: `mc9952` 9/9, 0 skipped (amostra saltada por diagnóstico, não por skip). A última suíte canónica completa (UTAC142.2,
  antes deste ajuste) deu backend VERDE 1557/1563 e frontend 2 falhas = estas duas. **A suíte completa não foi re-corrida depois do
  UTAC144** (RAM 713 MB): o «verde» do frontend vem da soma «suíte anterior − as 2 falhas agora isoladas», não de uma corrida nova.

**Actualização (mesmo dia):** a suíte canónica completa foi re-corrida depois do UTAC144, com 1732 MB livres:
**frontend VERDE 1383/1383 · backend VERDE 1557/1563 · VEREDITO VERDE** (`_logs/UTAC144_SUITE.txt`). O item 6 deixa de
depender da soma e passa a ter corrida própria.
