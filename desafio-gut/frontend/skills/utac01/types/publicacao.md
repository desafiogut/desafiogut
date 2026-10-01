# TIPO: `publicacao` — UTAC que PUBLICA algo já feito

**Auto-contido.** UTACs de entrega/deploy: põem em produção algo que já existe no repo
(não constroem feature). O risco é publicar o estado errado.

## HARD GATES extra
- **HG10 (commit/deploy em FOREGROUND)** — reforçado: nunca background.
- **A/B pareado obrigatório** — medir o que estava servido **antes** e o que passa a ser servido
  **depois** (ex.: `curl` ao endpoint real com o conteúdo esperado).
- **Deploy com `--build`** quando o alvo for funções/Netlify.
- **Auto-deploy:** confirmar que o `push` publicou; deploys «error» podem ser «no content change» —
  medir antes de concluir *(lição MC101)*.

## Segmentos típicos
`SEG-1` (medir o que está em produção) → `SEG0` (publicar) → `SEG5` (verificar em produção) →
`SEG6` (fecho).

## Autorizações típicas
- AUTORIZA commit + push + deploy.
- NÃO AUTORIZA alterar código de produção (só publicar o que já está commitado), nem `git add -A`.

## Ficheiros típicos afectados
- `.git` (commits), `netlify.toml`, ficheiros de função/`dist/` a publicar.

## Exemplo
**UTAC101** — publicar os 4 commits pendentes; deploy `--build`; explicar os 2 deploys «error»;
ler o Blob vivo das flags; medir se o webhook MP dispara.

## Prompt de arranque (para o executor)
> Publique [ARTEFACTO] em [ALVO]. Meça o que está servido antes e depois (A/B pareado). Deploy em
> foreground. Se um deploy «error» aparecer, explique a causa antes de repetir.
