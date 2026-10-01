# G — Git e deploy

Regras sobre commits, push, deploy.

## G1 — NUNCA `git add -A`
8× na série. Ficheiros individuais SEMPRE. Confirmar o que entra
antes de `git add`.
Origem: disciplina base (8× na série).

## G2 — Ficheiros individuais no commit
Cada commit tem de saber exactamente o que entrou. Nada de globs,
nada de wildcards.
Origem: G1.

## G3 — Deploy em FOREGROUND
Background sem TTY quebra o harness. Netlify CLI, npm, node — em
foreground. Esperar.
Origem: disciplina base.

## G4 — Nunca `netlify deploy --dir`
Só `--build`. O `--dir` bypassa o processo de build.
Origem: disciplina base.

## G5 — Nunca `npm run build` para o APK
É `build:apk`. O `npm run build` faz build do frontend, não do APK.
Origem: disciplina base.

## G6 — Auto-deploy publica com `commit_ref`
Confirmar que a produção serve o commit certo. Não assumir — medir.
Origem: UTAC101.
