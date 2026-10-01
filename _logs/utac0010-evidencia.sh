#!/usr/bin/env bash
# UTAC000.10 — SEG-1: evidencia ANTES/DEPOIS (HI10/GATE 5). Só medição, nada alterado.
set -u
R="C:/Users/Moltbot/Desktop/DESAFIOGUT"; FE="$R/desafio-gut/frontend"
OUT="$R/_logs/UTAC000.10_SEG-1_EVIDENCIA.txt"
{
echo "UTAC000.10 — EVIDENCIA BRUTA (SEG-1) · $(date -u '+%Y-%m-%d %H:%M UTC')"
echo "==============================================================================="
echo
echo "## 1. BASELINE (estado antes de tocar)"; echo
echo '$ git rev-parse HEAD origin/main'; cd "$R" && git rev-parse HEAD origin/main
echo; echo '$ git status --short   (só o package-lock pré-existente)'; git status --short | grep -v "^??"
echo
echo "## 2. SUITE (comando canónico do repo)"; echo
echo '$ node scripts/mc966-suite-harness.mjs ambos'
node scripts/mc966-suite-harness.mjs ambos 2>&1 | tail -3
echo
echo "## 3. INVENTARIO — vencedor derivado dos lances locais (src/, sem testes)"; echo
cd "$FE"
echo '$ grep -rn "menorUnico|vencedor|OverlayVencedor|apurarMenor" src/ | grep -v __tests__'
grep -rn --exclude-dir=node_modules --exclude-dir=dist "menorUnico\|vencedor\|OverlayVencedor\|apurarMenor" src/ \
  | grep -v "__tests__\|_stubs" | grep -E "\.jsx|\.js" | grep -E "const vencedor|idxVencedor|vencedor=|vencedor,|OverlayVencedor\(" | head -20
echo
echo "## 4. TESTES NOVOS — TAP"; echo
for f in src/context/__tests__/utac0010-vencedor-contexto.test.mjs src/pages/__tests__/utac0010-mercado-vencedor.test.mjs; do
  echo "\$ node --test --test-concurrency=1 --test-reporter=tap $f"
  timeout 300 node --test --test-concurrency=1 --test-reporter=tap "$f" 2>&1 | grep -E "^(ok|not ok|# (tests|pass|fail))"
  echo
done
echo "## 5. ESCOPO (vs a122b18)"; echo
cd "$R"; echo '$ git diff --name-only'; git diff --name-only
echo; echo "## 6. md5 DOS ENTREGAVEIS"; echo
md5sum desafio-gut/frontend/src/context/AppContext.jsx \
       desafio-gut/frontend/src/context/__tests__/utac0010-vencedor-contexto.test.mjs \
       desafio-gut/frontend/src/pages/__tests__/utac0010-mercado-vencedor.test.mjs \
       desafio-gut/frontend/src/pages/__tests__/_stubs/useRecursosApp.js \
       desafio-gut/frontend/src/pages/MercadoLances.jsx
echo
echo "## 7. SAUDE GLOBAL (HI1)"; echo
echo "- disco:"; df -h "$R" 2>/dev/null | tail -1
echo "- worktrees orfaos do Claude Code:"; git worktree list | grep -c "\.claude/worktrees" || true
echo "- junction do node_modules no worktree de validacao: (nenhuma montada neste UTAC)"
} > "$OUT" 2>&1
echo "escrito: $OUT ($(wc -c < "$OUT") bytes)"
