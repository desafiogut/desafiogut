#!/usr/bin/env bash
# UTAC000.8 — recolha de evidência (HI10/GATE 6). Só medição, zero alterações de código.
set -u
ROOT="C:/Users/Moltbot/Desktop/DESAFIOGUT"
FE="$ROOT/desafio-gut/frontend"
OUT="$ROOT/_logs/UTAC000.8_SEG-1_EVIDENCIA.txt"

mkdir -p "$ROOT/_logs"
{
  echo "UTAC000.8 — EVIDENCIA BRUTA (SEG-1, 2.ª sessão)"
  echo "data: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "HEAD: $(git -C "$ROOT" rev-parse HEAD)"
  echo "origin/main: $(git -C "$ROOT" rev-parse origin/main)"
  echo
  echo "=== git status --short ==="
  git -C "$ROOT" status --short | head -20
  echo
  echo "=== HARNESS (ambos) ==="
  node "$ROOT/scripts/mc966-suite-harness.mjs" ambos
  echo
  echo "=== FRONTEND: resumo TAP ==="
  ( cd "$FE" && node --test --test-concurrency=1 --test-reporter=tap $(find src -name '*.test.mjs' -not -path '*/node_modules/*' -not -path '*/dist/*' | sort) 2>&1 | grep -E "^# (tests|pass|fail|skipped|cancelled) " )
  echo
  echo "=== BACKEND: resumo TAP ==="
  ( cd "$FE/netlify/functions" && node --test --experimental-test-module-mocks --test-reporter=tap _tests/*.test.mjs 2>&1 | grep -E "^# (tests|pass|fail|skipped|cancelled) " )
  echo
  echo "=== PRODUCAO (leitura publica, sem auth) ==="
  echo "--- GET /edicoes ---"
  curl -s "https://silly-stardust-ca71bc.netlify.app/.netlify/functions/edicoes" | head -c 3000
  echo
  echo "--- GET /lances-flash?edicaoId=R-1 ---"
  curl -s -w "\nHTTP=%{http_code}\n" "https://silly-stardust-ca71bc.netlify.app/.netlify/functions/lances-flash?edicaoId=R-1"
  echo "--- GET /lances-flash?edicaoId=RELAMP-1 ---"
  curl -s -w "\nHTTP=%{http_code}\n" "https://silly-stardust-ca71bc.netlify.app/.netlify/functions/lances-flash?edicaoId=RELAMP-1"
  echo "--- GET /ranking?cicloId=R-1 ---"
  curl -s -w "\nHTTP=%{http_code}\n" "https://silly-stardust-ca71bc.netlify.app/.netlify/functions/ranking?cicloId=R-1"
  echo
  echo "=== md5 dos ficheiros que a DEBT-007 envolve (estado ANTES de qualquer correcção) ==="
  md5sum "$FE/netlify/functions/lances-flash.mjs" \
         "$FE/netlify/functions/lance-relampago.mjs" \
         "$FE/netlify/functions/_lib/data-store.mjs" \
         "$FE/netlify/functions/_lib/data-store-blobs.mjs" \
         "$FE/netlify/functions/_lib/bids-store.mjs" \
         "$FE/netlify/functions/_lib/contrato" 2>/dev/null || true
  md5sum "$FE/src/context/AppContext.jsx" "$FE/src/pages/MeusAtivos.jsx" "$FE/src/components/CardLance.jsx" 2>/dev/null || true
} > "$OUT" 2>&1
echo "escrito: $OUT"
wc -c "$OUT"
