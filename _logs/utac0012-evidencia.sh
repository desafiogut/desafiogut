#!/usr/bin/env bash
# UTAC000.12 — SEG-1: evidencia BRUTA da DEBT-012 (reproducao) + estado dos 3 residuos.
# Restaura SEMPRE de copia de seguranca fora do repo (nunca `git checkout --`) — licao do UTAC000.11.
set -u
R="C:/Users/Moltbot/Desktop/DESAFIOGUT"; FE="$R/desafio-gut/frontend"
TMPM="C:/Users/Moltbot/tmp-utac0008"
OUT="$R/_logs/UTAC000.12_SEG-1_EVIDENCIA.txt"
ART="$FE/src/pages/Dashboard.jsx"

{
echo "UTAC000.12 — SEG-1 · EVIDENCIA BRUTA · $(date -u '+%Y-%m-%d %H:%M UTC')"
echo "======================================================================"
echo
echo "## 0. BASELINE"
cd "$R"
echo '$ git rev-parse HEAD origin/main'; git rev-parse HEAD origin/main
echo '$ git status --short  (só o package-lock pré-existente)'; git status --short | grep -v "^??"
echo
echo "## 1. FRENTE A — a linha do defeito (Dashboard.jsx l. 416, ANTES) e a guarda (DEPOIS)"
echo "--- ANTES (o defeito, recuperado do git):"
git show 8e19ed0:desafio-gut/frontend/src/pages/Dashboard.jsx | sed -n '413,417p'
echo "--- DEPOIS (o codigo entregue):"
sed -n '/UTAC000.12 (DEBT-012) — GUARDA DO VALOR/,/^  const { tempoRestante }/p' "$ART"
echo
echo "## 2. REPRODUCAO — o defeito REPOSTO por mutacao (byte-exacta, 3 linhas), o mutante PROVADO entrar"
python "$TMPM/mutar-m14.py" aplicar 2>&1 | sed 's/^/  /'
echo
echo '$ node --test --test-concurrency=1 --test-reporter=tap src/pages/__tests__/Dashboard.test.mjs'
cd "$FE"
timeout 400 node --test --test-concurrency=1 --test-reporter=tap src/pages/__tests__/Dashboard.test.mjs 2>&1 \
  | grep -E "not ok|error: 'o card|error: .esperava|# (tests|pass|fail)" | head -20 | sed 's/^/  /'
echo
echo "## 3. RESTAURO por COPIA DE SEGURANCA + conferencia md5"
python "$TMPM/mutar-m14.py" reverter 2>&1 | sed 's/^/  /'
echo
echo "## 4. DEPOIS — o mesmo ficheiro de teste com o codigo entregue"
timeout 400 node --test --test-concurrency=1 --test-reporter=tap src/pages/__tests__/Dashboard.test.mjs 2>&1 \
  | grep -E "^# (tests|pass|fail)" | sed 's/^/  /'
echo
echo "## 5. FRENTE B — o script no package.json + o comando canonico"
cd "$R"
echo '$ grep -A1 \"\\\"lint\\\"\" (a vizinhanca do script novo)'; grep -n '"lint"\|"test"' desafio-gut/frontend/package.json | sed 's/^/  /'
echo '$ npm test   (corrido no dir do frontend)'
cd "$FE"; timeout 500 npm test 2>&1 | tail -4 | sed 's/^/  /'
echo
echo "## 6. FRENTE C — os 3 worktrees, ANTES e DEPOIS"
cd "$R"
echo "-- medicao (antes da limpeza):"
echo "   edicoes locais: agent-ab397f6377251548e=nenhuma · angry-faraday-46bb51=3 ficheiros · ecstatic-almeida-869832=2 ficheiros"
echo "   commits fora do main: 0 em cada (git log main..<HEAD>)"
echo "   CSP que eles adicionavam ja no main: vite.config.js ($(grep -c 127.0.0.1:8545 desafio-gut/frontend/vite.config.js)) · netlify.toml X-Frame-Options ($(grep -c X-Frame-Options netlify.toml))"
echo "   patches arquivados em: _logs/UTAC000.12_worktrees-preservados.patch ($(grep -c '^diff --git' _logs/UTAC000.12_worktrees-preservados.patch) diffs)"
echo "-- depois da limpeza:"
echo "   dirs em .claude/worktrees: $(ls .claude/worktrees/ 2>/dev/null | wc -l)"
echo "   node_modules real: frontend=$(ls desafio-gut/frontend/node_modules | wc -l) · backend=$(ls desafio-gut/frontend/netlify/functions/node_modules | wc -l)"
echo '$ git worktree list'; git worktree list | sed 's/^/   /'
echo
echo "## 7. ESCOPO (git diff --name-only) e md5"
git diff --name-only | sed 's/^/  /'
md5sum desafio-gut/frontend/src/pages/Dashboard.jsx desafio-gut/frontend/package.json desafio-gut/frontend/src/pages/__tests__/Dashboard.test.mjs | sed 's/^/  /'
} > "$OUT" 2>&1
echo "escrito: $OUT ($(wc -c < "$OUT") bytes)"
grep -E "IDENTICO|# (tests|pass|fail)|VEREDITO|node_modules real" "$OUT" | tail -12
