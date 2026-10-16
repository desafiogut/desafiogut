#!/usr/bin/env bash
# UTAC110i.1 — corre a prova de mutação da FRENTE D em FOREGROUND de um processo com TTY próprio.
# ⚠️ Necessário por medição: um `node --test` lançado a partir de um comando inline em background
# devolve «stdin is not a tty» e um log de 26 bytes — que se lê como «0 falhas» (falso verde).
# Corre da raiz do repo.
#
# ⚠️ UTAC110i.1b — GUARDA DE BACKUP (adicionada por MEDIÇÃO, não por precaução teórica).
# O instrumento (`scripts/mc110i1d-prova-mutacao.mjs`) restaura o alvo depois de CADA mutante, mas
# esse restauro vive DENTRO do processo: se o processo for morto a meio de um mutante (timeout do
# wrapper, Ctrl-C, OOM), o restauro **nunca acontece** e o ficheiro fica MUTADO. Foi exactamente
# assim que o UTAC110i.1 fechou: `src/hooks/useComprarPasse.js` ficou, byte a byte, no estado do
# mutante D3 (gate sem a flag) — e o teste (c) do 110i.1 pendurou 300 s, a prova de mutação abortou
# no baseline e o UTAC parou (relatado e corrigido no UTAC110i.1b).
# Por isso: cópia .bak FORA do repo ANTES de arrancar + conferência de md5 no fim (restaura o .bak
# se divergir). O `.bak` vive fora do repo por regra do operador (ficheiro mutado não commitado
# nunca leva `git checkout --`).
set -u
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
HOOK="$RAIZ/desafio-gut/frontend/src/hooks/useComprarPasse.js"
BAK="${TMPDIR:-/tmp}/run-mut110i1d-useComprarPasse.bak"

md5de() { md5sum "$1" | cut -d' ' -f1; }

cp "$HOOK" "$BAK"
antes="$(md5de "$BAK")"
echo "md5 antes: $antes  (bak: $BAK)"

cd "$RAIZ" || exit 2
node scripts/mc110i1d-prova-mutacao.mjs
rc=$?

atual="$(md5de "$HOOK")"
if [ "$atual" != "$antes" ]; then
  echo "⚠️ o alvo ficou DIVERGENTE do .bak (corrida morta a meio de um mutante) — a restaurar do backup"
  cp "$BAK" "$HOOK"
  echo "md5 depois do restauro: $(md5de "$HOOK")"
else
  echo "md5 depois: $atual (== .bak, intacto)"
fi
echo "EXIT=$rc"
exit "$rc"
