#!/usr/bin/env bash
# UTAC110i.2 — wrapper da suíte completa. Imprime a RAM livre ANTES (portão A14) e corre os dois
# lados da suíte a partir da raiz do repo. O número do portão é o que ESTE script imprime.
set -u
cd "$(dirname "$0")/.." || exit 2
RAM1=$(powershell -NoProfile -Command "[int]((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1024)")
RAM2=$(powershell -NoProfile -Command "[int]((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1024)")
echo "RAM_LIVRE_MB antes da suite: ${RAM1} / ${RAM2}"
echo "HEAD: $(git rev-parse --short HEAD)"
echo "--- suite (frontend + backend) ---"
node scripts/mc966-suite-harness.mjs ambos
RC=$?
echo "--- fim ---"
echo "EXIT=${RC}"
exit "$RC"
