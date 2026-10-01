# TIPO: `saneamento` — UTAC que resolve PENDÊNCIAS de outro UTAC

**Auto-contido.** UTACs correctivos: fecham itens que ficaram declarados como pendentes num UTAC
anterior (`.1`, `.2`…). Não abrem escopo novo — resolvem o que ficou por fazer.

## HARD GATES extra
- **A/B pareado obrigatório** — medir o item antes e depois; prova que **deixou de estar pendente**.
- **Preservação do funcional** — o que já funcionava continua a funcionar (A/B dos consumidores).
- **Lista fechada de pendências** — cada pendência tem um resultado medido: **fechada** ou
  **declarada de novo** (com o motivo). Nada fica «meio-feito».
- **Não alargar o escopo** — só o que o UTAC original deixou pendente; achados novos escalam-se.

## Segmentos típicos
`SEG-1` (medir as pendências e o estado actual) → `SEG0-2` (frentes: uma pendência por frente) →
`SEG3` (validador) → `SEG5` (verificar em produção, com controlo positivo) → `SEG6` (fecho).

## Autorizações típicas
- AUTORIZA alterar exactamente os ficheiros indicados na pendência do UTAC original.
- NÃO AUTORIZA tocar noutros ficheiros nem abrir frentes novas.

## Ficheiros típicos afectados
- Os indicados no UTAC original (ex.: `_lib/conta-delete.mjs`, `_lib/passe.mjs`,
  `supabase/migrations/`).

## Exemplo
**UTAC105a.1** — pendências do MC105a: revogar DELETE/TRUNCATE do `service_role`; pôr `passes` na
exportação e na exclusão (`anon:<sha256>`); mover a migração para `supabase/migrations/`.

## Prompt de arranque (para o executor)
> Resolva as pendências [LISTA] do UTAC [ORIGEM]. A/B pareado por pendência; o que funcionava
> continua; cada pendência sai **fechada** ou **declarada de novo**.
