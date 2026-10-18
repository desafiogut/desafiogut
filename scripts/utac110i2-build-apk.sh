#!/usr/bin/env bash
# UTAC110i.2 — build do artefacto do APK (netlify build production + validar:dist + cap sync).
# Só constrói; NÃO faz deploy.
set -u
cd "$(dirname "$0")/../desafio-gut/frontend" || exit 2
echo "=== npm run build:apk ==="
npm run build:apk
RC=$?
echo "EXIT_BUILD=${RC}"
exit "$RC"
