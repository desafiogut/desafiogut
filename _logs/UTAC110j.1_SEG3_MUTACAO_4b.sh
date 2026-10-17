#!/usr/bin/env bash
# UTAC110j.1 - 2a ronda de mutacao: as decisoes R18-110j.1-4b (resgates/pontos). R16.
set -u
FE="/c/Users/Moltbot/Desktop/DESAFIOGUT/desafio-gut/frontend"
LIB="$FE/netlify/functions/_lib/conta-delete.mjs"
LIB_N="C:/Users/Moltbot/Desktop/DESAFIOGUT/desafio-gut/frontend/netlify/functions/_lib/conta-delete.mjs"
TMP="C:/Users/Moltbot/AppData/Local/Temp/utac110j1b"
BAK="$TMP/conta-delete.mjs.bak2"
cp "$LIB" "$BAK"
MD5_0=$(md5sum "$LIB" | awk '{print $1}')
echo "md5 inicial: $MD5_0"

run() {
  cd "$FE/netlify/functions" || return 1
  node --test --experimental-test-module-mocks _tests/utac110j1-exclusao-lgpd.test.mjs > "$TMP/mut-$1.log" 2>&1
  local rc=$?
  local falhas; falhas=$(grep -c "^✖ " "$TMP/mut-$1.log" || true)
  if [ "$rc" -ne 0 ] && [ "$falhas" -gt 0 ]; then
    echo "MUTANTE $1: MORTO (RED, exit=$rc, $falhas falha(s)): $(grep -m1 '^✖ ' "$TMP/mut-$1.log" | cut -c1-80)"
  else
    echo "MUTANTE $1: SOBREVIVEU (exit=$rc) <<<<<< PROBLEMA"
  fi
  cp "$BAK" "$LIB"
}

aplicar() { python - "$LIB_N" <<PY
import sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
$1
open(p, "w", encoding="utf-8", newline="").write(s)
PY
}

# D6 - a morada do resgate deixa de ser substituida (fica o dado pessoal)
aplicar 's = s.replace(".update({ endereco: anon, morada, atualizado_em: new Date().toISOString() })", ".update({ endereco: anon, atualizado_em: new Date().toISOString() })")'
run D6

# D7 - apaga `pontos` mesmo havendo resgate (o CASCADE levaria o registo retido)
aplicar 's = s.replace("  if (nResgates === 0) {", "  if (true) {")'
run D7

# D8 - desliga a guarda fail-closed (com o resgate por anonimizar, `pontos` seria apagado)
aplicar 's = s.replace("  if (nResgates < 0) {", "  if (false) {")'
run D8

MD5_1=$(md5sum "$LIB" | awk '{print $1}')
if [ "$MD5_0" = "$MD5_1" ]; then echo "RESTAURO OK (md5 $MD5_1)"; else echo "RESTAURO FALHOU"; exit 3; fi
