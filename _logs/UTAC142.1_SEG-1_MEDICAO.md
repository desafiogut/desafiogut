# UTAC142.1 · SEG-1 — MEDIÇÃO

Executor: Claude Code (Opus 5.5) · 2026-11-20 · baseline `42ebf6e` = origin/main = produção `6affcbf4`.

## Decisões do operador (R18-142.1)
- **R18-142.1-A** «deixar o usuário dar lances descontando apenas dos pontos … passes consumidos a cada 3 lances».
  Pergunta: e quem não tem Passe? Resposta: **licita na mesma**. O Passe é opcional e gasta-se no 3.º, 6.º, 9.º lance, se houver.
- **R18-142.1-B** bónus de 100 pontos: **na compra, como hoje** (Regulamento v6.1, Art. 7º; `bonus-passe-relampago`).
- **R18-142.1-C** «libere a RAM necessária».

## Medições
- Em produção (UTAC142), cada lance na especial consumia 1 Passe antes do lance, e quem não tinha Passe levava 400. É isso que se reverte.
- Contagem dos lances: não há contador por utilizador e edição sem ler valores (`getLances` traz payloads). Solução: um Blob
  `especial-lances-passe` com CAS. `@netlify/blobs` das funções = **10.0.0**, e o `set` suporta `onlyIfNew`/`onlyIfMatch`
  (grep do `dist`). Usa-se `set`, nunca `setJSON` (memória: o setJSON 10.0–10.4 não envia If-Match).
- RAM: livre 1271 MB. Terminei os 34 processos dos servidores MCP desta sessão (sem tocar no Hermes, no WhatsApp nem no Claude
  desktop): 1316 MB. Fechar o Edge (cerca de 290 MB) foi **negado pela permissão** do Claude Code → falta o operador fechá-lo.

## Achado durante a construção
- C9 (6 lances simultâneos do mesmo utilizador): com 5 tentativas de CAS, 2 lances ficavam por contar (fail-soft, mas contagem
  curta = Passe não gasto). Passou a 12 tentativas com recuo aleatório de 0 a 25 ms; 3 corridas, 9/9.

## Veredito
**SEGUIR** (as decisões estão tomadas; sem conflitos por resolver).

## Estado no fim da sessão
- Commit `9646895` (local, **sem push**). Rascunho `6affd18f…` publicado: `CDN requesting 0 files and 4 functions`, o frontend é igual ao da produção.
- `netlify deploy --prod --build` foi **negado pela permissão** do Claude Code (é uma mudança nova; a autorização era do UTAC142). Falta o OK explícito do operador para a produção e para o push.
- Pendentes: suíte completa (RAM 906 MB; fechar o Edge foi negado) e o validador adversarial (SEG4 do UTAC142 e do 142.1).
