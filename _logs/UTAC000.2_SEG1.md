# UTAC000.2 — SEG1 Frente B: prompt do /utac-review (2026-09-30)

Padrão medido em `comandos.md`: cada comando diz o que Lê / Faz / Escreve / quando PARAR. O `prompt.md` segue-o em passos:
**Passo 0 pré-condições** (sem logs → PARA «ERRO: <UTAC> sem logs…»; sem relatório → PARA; review já existe → PARA, não sobrescreve) ·
**Passo 1 ler** (todos os `_logs/<UTAC>_*` + spec, relatório, `git diff --stat <baseline>..<último commit do UTAC>` com commits filtrados por
`git log --grep="<UTAC>"` — commits de outros UTACs no intervalo não contam —, skill actual incl. `VERSAO.md`, reviews anteriores) ·
**Passo 2 analisar** (cada padrão mau: já havia regra/lição? → «reforçar», não regra nova; sem evidência não se escreve) ·
**Passo 3 escrever** só 2 ficheiros (report pelo template + 1 linha no INDEX com decisão `pendente`) · **PROIBIDO** (código, skill, aplicar
sugestões, UTACs fechados/CLAUDE.md, commit/push/deploy/Supabase/Netlify, dados pessoais L1, inventar) · **Passo 4** `git status` + devolver resumo.

Verificador `utac0002-verifica-review.mjs B` → **VERDE 13/13** (7 proibições verificadas DENTRO da secção PROIBIDO). Mutação em cópias **6/6**
(remover proibição da skill / do código, sem-logs não pára, sem diff, proibição fora da secção, sobrescrever). Veredito: **SEGUIR**.
