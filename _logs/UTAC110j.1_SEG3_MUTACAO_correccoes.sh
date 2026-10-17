#!/usr/bin/env bash
# UTAC110j.1 - 3a ronda de mutacao: correccoes B1/B2/B3/B6 (achados do validador). R16.
set -u
FE="/c/Users/Moltbot/Desktop/DESAFIOGUT/desafio-gut/frontend"
LIB="$FE/netlify/functions/_lib/conta-delete.mjs"
LIB_N="C:/Users/Moltbot/Desktop/DESAFIOGUT/desafio-gut/frontend/netlify/functions/_lib/conta-delete.mjs"
TMP="C:/Users/Moltbot/AppData/Local/Temp/utac110j1b"
BAK="$TMP/lib.bak3"
cp "$LIB" "$BAK"
MD5_0=$(md5sum "$LIB" | awk '{print $1}')
echo "md5 inicial: $MD5_0"
run() {
  cd "$FE/netlify/functions" || return 1
  node --test --experimental-test-module-mocks _tests/utac110j1-exclusao-lgpd.test.mjs > "$TMP/m3-$1.log" 2>&1
  local rc=$?; local f; f=$(grep -c "^✖ " "$TMP/m3-$1.log" || true)
  if [ "$rc" -ne 0 ] && [ "$f" -gt 0 ]; then echo "MUTANTE $1: MORTO ($f falha(s)): $(grep -m1 '^✖ ' "$TMP/m3-$1.log" | cut -c1-78)"; else echo "MUTANTE $1: SOBREVIVEU <<< PROBLEMA"; fi
  cp "$BAK" "$LIB"
}
aplicar() { python - "$LIB_N" <<PY
import sys
p=sys.argv[1]
s=open(p,encoding="utf-8").read()
$1
open(p,"w",encoding="utf-8",newline="").write(s)
PY
}
# D9 - tira a criacao da ancora (a FK volta a morder)
aplicar 's = s.replace("  if (linhas.length > 0) await garantirAncoraPontos(supabase, anon);", "  // ancora removida pelo mutante")'
run D9
# D10 - abrirStoreSeguro volta a devolver null (falha silenciosa)
aplicar 's = s.replace("    throw new Error(`store ${nome} indisponível: ${err?.message ?? err}`);", "    console.warn(`[conta-delete] Blobs ${nome} indisponivel`); return null;")'
run D10
# D11 - cotas_pagas sai dos alvos de anonimizacao
aplicar 's = s.replace("  { tabela: \"cotas_pagas\", pk: \"pedido_id\" },", "")'
run D11
# D12 - payerName/nomeCompleto saem da lista de PII
aplicar 's = s.replace(", \"payerName\", \"nomeCompleto\", \"payer\"]", "]")'
run D12
MD5_1=$(md5sum "$LIB" | awk '{print $1}')
if [ "$MD5_0" = "$MD5_1" ]; then echo "RESTAURO OK (md5 $MD5_1)"; else echo "RESTAURO FALHOU"; exit 3; fi
