#!/usr/bin/env bash
# UTAC000.11 — SEG-1: captura AUTENTICA da reproducao do defeito (HI10/GATE 5).
# Repoe o defeito por mutacao, corre o teste, guarda o output BRUTO, e restaura com md5 conferido.
set -u
R="C:/Users/Moltbot/Desktop/DESAFIOGUT"; FE="$R/desafio-gut/frontend"
OUT="$R/_logs/UTAC000.11_SEG-1_EVIDENCIA.txt"
ART="$FE/src/pages/MercadoLances.jsx"
TESTE="src/pages/__tests__/utac0010-mercado-vencedor.test.mjs"

MD5_BOM="$2"   # md5 do ficheiro com a GUARDA (estado entregue)
BAK="C:/Users/Moltbot/tmp-utac0008/mercado-lances.bak"   # cópia de segurança FORA do repo (o restauro é SEMPRE daqui)

{
echo "UTAC000.11 — SEG-1 · EVIDENCIA BRUTA (DEBT-011) · $(date -u '+%Y-%m-%d %H:%M UTC')"
echo "======================================================================"
echo "⚠️ O restauro usa CÓPIA DE SEGURANÇA (nunca \`git checkout --\`), porque o ficheiro tem"
echo "   trabalho NÃO COMMITADO — lição do incidente do UTAC000.11 (ver §4)."
echo
cp "$ART" "$BAK"; echo "  copia de seguranca: $BAK (md5 $(md5sum "$BAK" | cut -d' ' -f1))"
echo
echo "## 1. BASELINE (antes de tocar)"
echo '$ git rev-parse HEAD origin/main'; cd "$R" && git rev-parse HEAD origin/main
echo '$ git status --short   (só o package-lock pré-existente)'; git status --short | grep -v "^??"
echo
echo "## 2. A LINHA DO DEFEITO (antes da correcção) — MercadoLances.jsx l. 69-73"
cd "$FE"
sed -n '69,73p' "$ART"
echo
echo "## 3. REPRODUCAO — defeito REPOSTO por mutacao (o mutante foi provado entrar: md5 muda)"
echo "   mutacao: 'const enderecoAbrev = vencedor?.endereco' -> '= vencedor'"
echo "           'const valorFmt = Number.isFinite(vencedor?.valor)' -> '= vencedor'"
echo
python - "$ART" <<'PY'
import sys
p = sys.argv[1]
b = open(p, 'rb').read()
for de, para in [
    (b"  const enderecoAbrev = vencedor?.endereco\r\n", b"  const enderecoAbrev = vencedor // MUTANTE\r\n"),
    (b"  const valorFmt = Number.isFinite(vencedor?.valor)\r\n", b"  const valorFmt = vencedor // MUTANTE\r\n"),
]:
    assert b.count(de) == 1, 'ancora nao unica'
    b = b.replace(de, para)
open(p, 'wb').write(b)
print("  mutante aplicado")
PY
echo
echo '$ node --test --test-concurrency=1 --test-reporter=tap '"$TESTE"
timeout 300 node --test --test-concurrency=1 --test-reporter=tap "$TESTE" 2>&1 \
  | grep -E "not ok|error:|Cannot read|R\\$ NaN|# (tests|pass|fail)" | head -30
echo
echo "## 4. RESTAURO + CONFERENCIA"
# ⚠️ INCIDENTE (UTAC000.11): a 1.ª versão deste script restaurava com `git checkout -- <ficheiro>`.
# Como a guarda AINDA NÃO ESTAVA COMMITADA, o checkout repôs o ficheiro do HEAD (= SEM guarda) e
# APAGOU a correcção. Regra que fica: **nunca restaurar com `git checkout --` um ficheiro que tem
# trabalho NÃO COMMITADO** — restaurar sempre de uma CÓPIA de segurança.
cp "$BAK" "$ART"
m=$(md5sum "$ART" | cut -d' ' -f1)
echo "  md5 restaurado: $m"
echo "  md5 entregue  : $MD5_BOM"
[ "$m" = "$MD5_BOM" ] && echo "  IDENTICO: SIM" || echo "  IDENTICO: NAO  <-- PARAR"
echo
echo "## 5. DEPOIS DA GUARDA — o mesmo teste com o codigo entregue"
timeout 300 node --test --test-concurrency=1 --test-reporter=tap "$TESTE" 2>&1 | grep -E "^# (tests|pass|fail)"
echo
echo "## 6. ESCOPO (vs 6282d8d)"
echo '$ git diff --name-only'; git -C "$R" diff --name-only
echo
echo "## 7. md5 DOS ENTREGAVEIS"
md5sum "$ART" "$FE/$TESTE"
} > "$OUT" 2>&1

echo "escrito: $OUT ($(wc -c < "$OUT") bytes)"
tail -22 "$OUT"
