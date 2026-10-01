#!/usr/bin/env bash
# UTAC000.9 — SEG-1: evidência ANTES de tocar (HI10/GATE 5). Só medição.
set -u
ROOT="C:/Users/Moltbot/Desktop/DESAFIOGUT"
FE="$ROOT/desafio-gut/frontend"
OUT="$ROOT/_logs/UTAC000.9_SEG-1_EVIDENCIA.txt"

{
  echo "UTAC000.9 — EVIDENCIA BRUTA (SEG-1, antes de qualquer alteracao)"
  echo "data: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "HEAD: $(git -C "$ROOT" rev-parse HEAD)"
  echo "origin/main: $(git -C "$ROOT" rev-parse origin/main)"
  echo
  echo "=== git status --short (por commitar) ==="
  git -C "$ROOT" status --short | grep -v "^??"
  echo
  echo "=== SUITE (harness canonico do repo) ==="
  node "$ROOT/scripts/mc966-suite-harness.mjs" ambos
  echo
  echo "=== FRONTEND: resumo TAP ==="
  ( cd "$FE" && node --test --test-concurrency=1 --test-reporter=tap $(find src -name '*.test.mjs' -not -path '*/node_modules/*' | sort) 2>&1 | grep -E "^# (tests|pass|fail|skipped|cancelled) " )
  echo
  echo "=== BACKEND: resumo TAP ==="
  ( cd "$FE/netlify/functions" && node --test --experimental-test-module-mocks --test-reporter=tap _tests/*.test.mjs 2>&1 | grep -E "^# (tests|pass|fail|skipped|cancelled) " )
  echo
  echo "=== INVENTARIO: sitios onde o vencedor e calculado localmente ==="
  echo "--- contexto (derivacao local, exposta a todos) ---"
  grep -n "Vencedor — Menor Lance Único" -A 4 "$FE/src/context/AppContext.jsx"
  echo "--- consumidores do vencedor do contexto ---"
  grep -rn --exclude-dir=node_modules --exclude-dir=dist "vencedor" "$FE/src/pages/Dashboard.jsx" "$FE/src/pages/MercadoLances.jsx" "$FE/src/pages/DetalheProduto.jsx" | grep -v "produto.vencedor" | grep -v "^\S*:[0-9]*: *//"
  echo "--- TabelaLances: apuracao local do 🏆 ---"
  grep -n "idxVencedor\s*=" -A 1 "$FE/src/components/TabelaLances.jsx"
  echo "--- PainelVencedorEspecial (ja usa o oficial) ---"
  grep -n "props.resultado\|resultado\." "$FE/src/components/edicao-especial/PainelVencedorEspecial.jsx" | head -5
  echo
  echo "=== md5 dos ficheiros em jogo (ANTES) ==="
  md5sum "$FE/src/pages/Dashboard.jsx" "$FE/src/components/TabelaLances.jsx" \
         "$FE/src/context/AppContext.jsx" "$FE/src/pages/MercadoLances.jsx" \
         "$FE/src/hooks/useResultadoOficial.js" 2>/dev/null
} > "$OUT" 2>&1
echo "escrito: $OUT"
wc -c "$OUT"
