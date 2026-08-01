#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MC-ORGANIZAR-WHATSAPP — normaliza e categoriza os 27.737 numeros.

FORMATOS MEDIDOS na lista (nao assumidos):
    13 digitos  14.005  todos "55" + DD + assinante a comecar por 9  -> movel
    12 digitos   8.243  todos "55" + DD + assinante a comecar por 2-5 -> fixo
     9 digitos   5.489  todos a comecar por 9, sem DD                -> movel sem DDD
     8 digitos       0  nao existe nenhum
A regra de classificacao segue o que esta la, nao um catalogo teorico de formatos.

FORMATO DE APRESENTACAO
    movel completo : +55 (DD) 9 XXXX-XXXX
    fixo completo  : +55 (DD) XXXX-XXXX
    movel sem DDD  : 9XXXX-XXXX          (sem inventar DDD — ver MC anterior)

A coluna com o numero ORIGINAL (so digitos) e mantida ao lado da formatada: e
essa que serve para enviar, a formatada e para ler. Um ficheiro que so tivesse a
versao bonita obrigaria a desfaze-la antes de qualquer uso.
"""

import sys, zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from exportar_contatos import escrever_xlsx          # noqa: E402

S      = Path(r"C:\Users\Moltbot\Desktop\CONTATOS-ORGANIZADOS")
ORIGEM = S / "whatsapp.xlsx"
DESTINO = S / "whatsapp_organizado.xlsx"
NS     = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

# DDD existentes no Brasil (plano de numeracao da Anatel).
DDD_VALIDOS = {11,12,13,14,15,16,17,18,19, 21,22,24,27,28, 31,32,33,34,35,37,38,
               41,42,43,44,45,46,47,48,49, 51,53,54,55, 61,62,63,64,65,66,67,68,69,
               71,73,74,75,77,79, 81,82,83,84,85,86,87,88,89, 91,92,93,94,95,96,97,98,99}


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


def classificar(v: str):
    """Devolve (categoria, formatado, ddd, motivo)."""
    if len(v) == 13 and v.startswith("55") and v[4] == "9":
        dd = int(v[2:4])
        if dd not in DDD_VALIDOS:
            return "inconsistente", v, str(dd), f"DDD {dd:02d} nao existe"
        return "celular_completo", f"+55 ({v[2:4]}) 9 {v[5:9]}-{v[9:]}", v[2:4], ""
    if len(v) == 12 and v.startswith("55") and v[4] in "2345":
        dd = int(v[2:4])
        if dd not in DDD_VALIDOS:
            return "inconsistente", v, str(dd), f"DDD {dd:02d} nao existe"
        return "fixo_completo", f"+55 ({v[2:4]}) {v[4:8]}-{v[8:]}", v[2:4], ""
    if len(v) == 9 and v[0] == "9":
        return "celular_sem_ddd", f"{v[:5]}-{v[5:]}", "", "sem DDD — nao inferido"
    if len(v) == 8 and v[0] in "2345":
        return "fixo_sem_ddd", f"{v[:4]}-{v[4:]}", "", "sem DDD — nao inferido"
    return "inconsistente", v, "", f"formato nao reconhecido ({len(v)} digitos)"


ROTULO = {
    "celular_completo": "Celular (DDD + 9 digitos)",
    "fixo_completo":    "Fixo (DDD + 8 digitos)",
    "celular_sem_ddd":  "Celular sem DDD",
    "fixo_sem_ddd":     "Fixo sem DDD",
    "inconsistente":    "Inconsistente",
}


def main():
    if not ORIGEM.exists():
        print(f"FALHA: {ORIGEM} nao existe")
        return 1

    _, linhas = ler(ORIGEM)
    print(f"lido: {len(linhas):,} numeros")

    regs = []
    for l in linhas:
        cat, fmt, ddd, motivo = classificar(l[1])
        regs.append({"id": int(l[0]), "orig": l[1], "fmt": fmt,
                     "cat": cat, "ddd": ddd, "motivo": motivo})

    cont = Counter(r["cat"] for r in regs)
    print("\ncategorias:")
    for k, q in cont.most_common():
        print(f"  {ROTULO[k]:>28}: {q:>7,}")
    print(f"  {'TOTAL':>28}: {sum(cont.values()):>7,}")
    assert sum(cont.values()) == len(linhas), "a soma das categorias nao fecha"

    def linhas_de(filtro=None, com_motivo=True):
        i = 0
        for r in regs:
            if filtro and r["cat"] != filtro:
                continue
            i += 1
            base = [i, r["id"], r["orig"], r["fmt"], ROTULO[r["cat"]], r["ddd"] or "—"]
            yield base + ([r["motivo"] or "—"] if com_motivo else [])

    CAB_TODOS = ["1 - ID", "2 - ID original", "3 - Numero (so digitos)",
                 "4 - Numero formatado", "5 - Categoria", "6 - DDD", "7 - Observacao"]
    CAB_CAT   = ["1 - ID", "2 - ID original", "3 - Numero (so digitos)",
                 "4 - Numero formatado", "5 - Categoria", "6 - DDD"]

    movel = cont["celular_completo"] + cont["celular_sem_ddd"]
    resumo = [
        ["Total de numeros", len(linhas), ""],
        ["", "", ""],
        ["POR CATEGORIA", "", ""],
        [f"  {ROTULO['celular_completo']}", cont["celular_completo"], "+55 (DD) 9 XXXX-XXXX"],
        [f"  {ROTULO['fixo_completo']}", cont["fixo_completo"], "+55 (DD) XXXX-XXXX"],
        [f"  {ROTULO['celular_sem_ddd']}", cont["celular_sem_ddd"], "DDD nao inferido"],
        [f"  {ROTULO['fixo_sem_ddd']}", cont["fixo_sem_ddd"], ""],
        [f"  {ROTULO['inconsistente']}", cont["inconsistente"], "DDD inexistente"],
        ["  SOMA", sum(cont.values()), "tem de bater com o total"],
        ["", "", ""],
        ["LEITURA PARA ENVIO", "", ""],
        ["  Moveis (podem ter WhatsApp)", movel, ""],
        ["  Fixos (em regra NAO tem WhatsApp)", cont["fixo_completo"], "nao usar para WhatsApp"],
        ["  Prontos a enviar (movel + DDD)", cont["celular_completo"], "so estes estao completos"],
        ["  Verificados no Twilio", 198, "unicos com WhatsApp CONFIRMADO"],
    ]

    folhas = [
        ("Resumo", ["1 - Indicador", "2 - Valor", "3 - Observacao"], iter(resumo), {1}),
        ("Todos os numeros", CAB_TODOS, linhas_de(), {0, 1}),
        ("Celulares completos", CAB_CAT, linhas_de("celular_completo", False), {0, 1}),
        ("Fixos completos", CAB_CAT, linhas_de("fixo_completo", False), {0, 1}),
        ("Sem DDD", CAB_CAT, linhas_de("celular_sem_ddd", False), {0, 1}),
        ("Inconsistentes", CAB_TODOS, linhas_de("inconsistente"), {0, 1}),
    ]

    print("\na escrever...")
    for t, n in escrever_xlsx(DESTINO, folhas):
        print(f"  aba {t:22} {n:>7,} linhas")
    print(f"\n{DESTINO}  ({DESTINO.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
