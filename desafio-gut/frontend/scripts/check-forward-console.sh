#!/usr/bin/env bash
# Valida que server.forwardConsole está desativado no client servido pelo Vite.
# Pré-req: dev server rodando em http://localhost:3000 (npm run dev).
# Falha (exit 1) se o Vite voltar a injetar forwardConsole={enabled:true}.
# Contexto: ver CLAUDE_DEBUG.md → MARCO 2026-05-02 (TypeError 'send' undefined).

set -eu

URL="${VITE_DEV_URL:-http://localhost:3000}/@vite/client"

if ! body=$(curl -sS --max-time 5 "$URL"); then
  echo "FAIL: dev server inacessível em $URL — rode 'npm run dev' primeiro." >&2
  exit 2
fi

line=$(printf '%s\n' "$body" | grep -E 'const forwardConsole = ' || true)

if [ -z "$line" ]; then
  echo "FAIL: linha 'const forwardConsole = ...' não encontrada no client servido." >&2
  echo "      Pode indicar mudança de API no Vite. Reabra o caderno de debug." >&2
  exit 1
fi

if printf '%s\n' "$line" | grep -q '"enabled":false'; then
  echo "OK: forwardConsole desativado — $line"
  exit 0
fi

echo "FAIL: forwardConsole está ativo — $line" >&2
echo "      Verifique 'server.forwardConsole: false' em vite.config.js." >&2
exit 1
