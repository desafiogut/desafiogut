#!/usr/bin/env bash
# UTAC110j.1 — prova de mutação dos testes NOVOS (R16). Cada mutante TEM de deixar o teste RED.
# Restauro por cópia de segurança FORA do repo + md5 no fim (memória: o restauro in-process deixa
# o ficheiro mutado quando a corrida morre).
set -u
FE="/c/Users/Moltbot/Desktop/DESAFIOGUT/desafio-gut/frontend"
LIB="/c/Users/Moltbot/Desktop/DESAFIOGUT/desafio-gut/frontend/netlify/functions/_lib/conta-delete.mjs"
LIB_N="C:/Users/Moltbot/Desktop/DESAFIOGUT/desafio-gut/frontend/netlify/functions/_lib/conta-delete.mjs"
TESTE="utac110j1-exclusao-lgpd.test.mjs"
TMP="/c/Users/Moltbot/AppData/Local/Temp/utac110j1"
mkdir -p "$TMP"
BAK="$TMP/conta-delete.mjs.bak"
cp "$LIB" "$BAK"
MD5_0=$(md5sum "$LIB" | awk '{print $1}')
echo "md5 inicial: $MD5_0"

run() { # $1 = nome do mutante
  cd "$FE/netlify/functions" || return 1
  node --test --experimental-test-module-mocks "_tests/$TESTE" > "$TMP/mut-$1.log" 2>&1
  local rc=$?
  local falhas
  falhas=$(grep -c "^✖ " "$TMP/mut-$1.log" || true)
  if [ "$rc" -ne 0 ] && [ "$falhas" -gt 0 ]; then
    echo "MUTANTE $1: MORTO (RED, exit=$rc, $falhas falha(s))"
  else
    echo "MUTANTE $1: SOBREVIVEU (exit=$rc) <<<<<< PROBLEMA"
  fi
  cp "$BAK" "$LIB"   # restauro imediato
}

aplicar() { # $1 = python-code que edita LIB
  python - "$LIB_N" <<PY
import sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
$1
open(p, "w", encoding="utf-8", newline="").write(s)
PY
}

# D1 — deixa de apagar `pontos` (a tabela-mãe da lacuna LGPD).
aplicar 's = s.replace("  \"palpites\", \"resgates\", \"pontuacoes\", \"rankings_ciclo\", \"pontos\",\n", "  \"palpites\", \"resgates\", \"pontuacoes\", \"rankings_ciclo\",\n")'
run D1

# D2 — a anonimização do ECOQUILDO passa a ser um no-op (grava o endereço outra vez).
aplicar 's = s.replace("supabase.from(\"eco_quildo\").update({ endereco: anon }).eq(\"endereco\", endereco)", "supabase.from(\"eco_quildo\").update({ endereco: endereco }).eq(\"endereco\", endereco)")'
run D2

# D3 — o vínculo de um TERCEIRO passa a ser apagado em vez de anonimizado (destrói dado alheio).
aplicar 's = s.replace("if (normalizar(reg?.indicador) !== endereco) continue;", "if (normalizar(reg?.indicador) === endereco) { if (!dryRun) { try { await store.delete(key); } catch {} } continue; }")'
run D3

# D4 — o registo de auditoria guarda o ENDEREÇO em vez do pseudónimo.
aplicar 's = s.replace("      anon: manifesto.anon,", "      anon: manifesto.endereco,")'
run D4

# D5 — o log de indicações deixa de ser anonimizado.
aplicar 's = s.replace("    if (!mudou) continue;\n    n += 1;", "    if (!mudou) continue;\n    n += 0;")'
run D5

MD5_1=$(md5sum "$LIB" | awk '{print $1}')
if [ "$MD5_0" = "$MD5_1" ]; then echo "RESTAURO OK (md5 $MD5_1)"; else echo "RESTAURO FALHOU: $MD5_0 != $MD5_1"; exit 3; fi
