#!/usr/bin/env bash
# utac110m2-frontend-detalhe.sh — corre TODOS os testes do frontend e guarda o detalhe das falhas.
# (Em background, comando inline dá "stdin is not a tty" e log de 26 bytes => NAO MEDI.)
set -u
cd "$(dirname "$0")/../desafio-gut/frontend" || exit 2
find src -name "*.test.mjs" -not -path "*/node_modules/*" | sort > /tmp/lista-fe.txt
echo "ficheiros: $(wc -l < /tmp/lista-fe.txt)"
node --test --test-concurrency=1 $(tr '\n' ' ' < /tmp/lista-fe.txt) < /dev/null
echo "EXIT=$?"
