#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MC-REMOVER-PRIMEIROS-22 — remove as 22 primeiras linhas de whatsapp.xlsx.

O QUE SAO ESSAS 22 (medido antes de apagar): sao exactamente os numeros cujo
DDD nao existe — prefixos 5500, 5501, 5502, 5503 e 5510. Os DDD brasileiros
comecam em 11, e o ID 23 e o primeiro 5511 (Sao Paulo). A ordenacao numerica
juntou-os todos no inicio, por isso "as primeiras 22" e "as de DDD invalido
00-10" sao o mesmo conjunto. O corte esta no sitio certo.

Alem de remover, este script CONTA quantos outros DDD invalidos ficam na lista,
para o relatorio — os DDD validos nao sao contiguos (nao existe 20, 25, 26, 30,
40, 50, ...), por isso cortar os 22 primeiros nao limpa todos.

Backup antes de sobrescrever. IDs renumerados 1..N.
"""

import shutil, sys, zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from exportar_contatos import escrever_xlsx          # noqa: E402

S    = Path(r"C:\Users\Moltbot\Desktop\CONTATOS-ORGANIZADOS")
ALVO = S / "whatsapp.xlsx"
NS   = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
QUANTOS = 22

# DDD que existem no Brasil. Fonte: plano de numeracao da Anatel.
DDD_VALIDOS = {
    11, 12, 13, 14, 15, 16, 17, 18, 19,
    21, 22, 24, 27, 28,
    31, 32, 33, 34, 35, 37, 38,
    41, 42, 43, 44, 45, 46, 47, 48, 49,
    51, 53, 54, 55,
    61, 62, 63, 64, 65, 66, 67, 68, 69,
    71, 73, 74, 75, 77, 79,
    81, 82, 83, 84, 85, 86, 87, 88, 89,
    91, 92, 93, 94, 95, 96, 97, 98, 99,
}


def ler(p):
    zf = zipfile.ZipFile(p)
    raiz = ET.parse(zf.open("xl/worksheets/sheet1.xml")).getroot()
    out = []
    for row in raiz.find("m:sheetData", NS):
        vals = []
        for c in row:
            t = c.find("m:is/m:t", NS)
            v = c.find("m:v", NS)
            vals.append((t.text or "") if t is not None else (v.text if v is not None else ""))
        out.append(vals)
    return out[0], out[1:]


def ddd_de(v: str):
    """DDD de um numero com codigo de pais 55. None se nao tiver DDD."""
    if v.startswith("55") and len(v) in (12, 13):
        return int(v[2:4])
    return None


def main():
    if not ALVO.exists():
        print(f"FALHA: {ALVO} nao existe")
        return 1

    cab, linhas = ler(ALVO)
    print(f"lido: {len(linhas):,} linhas | cabecalho {cab}")
    if len(linhas) <= QUANTOS:
        print(f"FALHA: so ha {len(linhas)} linhas; remover {QUANTOS} esvaziaria o ficheiro.")
        return 1

    removidas = linhas[:QUANTOS]
    ficam     = linhas[QUANTOS:]

    print(f"\nDDD das {QUANTOS} a remover: "
          f"{sorted({ddd_de(l[1]) for l in removidas if ddd_de(l[1]) is not None})}")
    print(f"DDD da primeira que fica  : {ddd_de(ficam[0][1])}")

    backup = S / "whatsapp.ANTES-DE-REMOVER-22.xlsx"
    if not backup.exists():
        shutil.copy2(ALVO, backup)
        print(f"backup -> {backup.name}")
    else:
        print(f"backup ja existia -> {backup.name} (nao sobrescrito)")

    novos = [[i, l[1]] for i, l in enumerate(ficam, 1)]
    assert len(novos) == len(linhas) - QUANTOS
    assert len({v for _, v in novos}) == len(novos), "duplicados no resultado"

    escrever_xlsx(ALVO, [("WhatsApp", cab, iter(novos), {0})])
    print(f"reescrito: {ALVO.name} ({ALVO.stat().st_size:,} bytes)")

    txt = S / "unicos" / "whatsapp_somente_digitos.txt"
    with open(txt, "w", encoding="utf-8", newline="\r\n") as f:
        for _, v in novos:
            f.write(v + "\n")
    print(f"texto    : {txt.relative_to(S)} ({len(novos):,} linhas)")

    print(f"\nantes  : {len(linhas):,}")
    print(f"depois : {len(novos):,}")

    # ── o que fica por limpar, para o relatorio ──
    invalidos = Counter()
    sem_ddd = 0
    for _, v in novos:
        d = ddd_de(v)
        if d is None:
            sem_ddd += 1
        elif d not in DDD_VALIDOS:
            invalidos[d] += 1
    print(f"\n--- diagnostico do que FICA ---")
    print(f"numeros sem DDD (9 digitos)     : {sem_ddd:,}")
    print(f"numeros com DDD INEXISTENTE     : {sum(invalidos.values()):,}")
    if invalidos:
        print(f"  DDD em causa: {sorted(invalidos)}")
        print(f"  detalhe     : {dict(sorted(invalidos.items()))}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
