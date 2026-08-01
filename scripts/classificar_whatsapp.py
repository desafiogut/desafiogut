#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MC-CLASSIFICAR-WHATSAPP — uma aba unica, ordem e numeracao ORIGINAIS,
com o bloco marcado em cada linha.

Diferenca face ao MC anterior (whatsapp_organizado.xlsx): la os numeros foram
AGRUPADOS por bloco; aqui ficam na ordem original, com o bloco como atributo.
Sao usos diferentes — agrupado serve para trabalhar um bloco de cada vez,
ordenado serve para cruzar com qualquer outra lista que use o mesmo ID. Os dois
ficheiros coexistem de proposito.

A cor de fundo por bloco mantem-se, para que a classificacao continue visivel
mesmo sem os numeros estarem juntos.

COLUNA "Verificado Twilio": marcada a partir de unicos/whatsapp_VERIFICADOS.txt.
Esse ficheiro foi escrito ANTES de se remover o "+" e ANTES do corte dos 22, por
isso os valores foram normalizados (so digitos) antes de comparar. Verificado:
os 198 casam todos, nenhum estava entre os 22 removidos.
"""

import sys, zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from xlsx_estilo import (escrever_xlsx_estilizado, EST_CAT, EST_TITULO,   # noqa: E402
                         EST_NORMAL)

S       = Path(r"C:\Users\Moltbot\Desktop\CONTATOS-ORGANIZADOS")
ORIGEM  = S / "whatsapp.xlsx"
VERIF   = S / "unicos" / "whatsapp_VERIFICADOS.txt"
DESTINO = S / "whatsapp_classificado.xlsx"
NS      = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

DDD_VALIDOS = {11,12,13,14,15,16,17,18,19, 21,22,24,27,28, 31,32,33,34,35,37,38,
               41,42,43,44,45,46,47,48,49, 51,53,54,55, 61,62,63,64,65,66,67,68,69,
               71,73,74,75,77,79, 81,82,83,84,85,86,87,88,89, 91,92,93,94,95,96,97,98,99}

BLOCOS = {
    1: ("celular_completo", "Bloco 1 — CELULARES COM DDD",  "Celular"),
    2: ("celular_sem_ddd",  "Bloco 2 — CELULARES SEM DDD",  "Celular"),
    3: ("fixo_completo",    "Bloco 3 — FIXOS COM DDD",      "Fixo"),
    4: ("fixo_sem_ddd",     "Bloco 4 — FIXOS SEM DDD",      "Fixo"),
    5: ("inconsistente",    "Bloco 5 — INCONSISTENTES",     "Inconsistente"),
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


def classificar(v: str):
    """Devolve (bloco, ddd)."""
    if len(v) == 13 and v.startswith("55") and v[4] == "9":
        dd = int(v[2:4])
        return (1, v[2:4]) if dd in DDD_VALIDOS else (5, v[2:4])
    if len(v) == 12 and v.startswith("55") and v[4] in "2345":
        dd = int(v[2:4])
        return (3, v[2:4]) if dd in DDD_VALIDOS else (5, v[2:4])
    if len(v) == 9 and v[0] == "9":
        return 2, "—"
    if len(v) == 8 and v[0] in "2345":
        return 4, "—"
    return 5, "—"


def main():
    _, linhas = ler(ORIGEM)
    total = len(linhas)
    print(f"lido: {total:,} numeros (ordem e IDs originais preservados)")

    # Os verificados vem com "+"; normalizar antes de comparar.
    verificados = {"".join(c for c in l.strip() if c.isdigit())
                   for l in open(VERIF, encoding="utf-8") if l.strip()}
    print(f"verificados no Twilio: {len(verificados)}")

    regs = []
    for l in linhas:
        num = l[1]
        bloco, ddd = classificar(num)
        regs.append({
            "id": int(l[0]), "num": num, "bloco": bloco, "ddd": ddd,
            "pronto": "Sim" if bloco == 1 else "Nao",
            "twilio": "Sim" if num in verificados else "Nao",
        })

    cont = Counter(r["bloco"] for r in regs)
    n_twilio = sum(1 for r in regs if r["twilio"] == "Sim")
    assert sum(cont.values()) == total, "a soma dos blocos nao fecha"
    assert n_twilio == len(verificados), (
        f"marcados {n_twilio} mas ha {len(verificados)} verificados")

    print("\nblocos:")
    for b in sorted(BLOCOS):
        q = cont.get(b, 0)
        print(f"  {BLOCOS[b][1]:<32} {q:>7,}  {q/total*100:6.2f}%")
    print(f"  {'TOTAL':<32} {total:>7,}  100.00%")
    print(f"\nprontos a enviar (bloco 1): {cont.get(1,0):,}")
    print(f"verificados no Twilio     : {n_twilio:,}")

    CAB = ["1 - ID", "2 - Numero", "3 - Bloco", "4 - Categoria", "5 - DDD",
           "6 - Pronto para envio", "7 - Verificado Twilio"]
    LARG = [10, 18, 30, 15, 8, 20, 20]

    def linhas_numeros():
        for r in regs:                      # ORDEM ORIGINAL — nao reordenar
            cat_key = BLOCOS[r["bloco"]][0]
            yield ([r["id"], r["num"], BLOCOS[r["bloco"]][1], BLOCOS[r["bloco"]][2],
                    r["ddd"], r["pronto"], r["twilio"]], EST_CAT[cat_key])

    def pct(n):
        return f"{n/total*100:.2f}%"

    resumo = [(["TOTAL DE NUMEROS", total, "100.00%", ""], EST_TITULO)]
    for b in sorted(BLOCOS):
        q = cont.get(b, 0)
        nota = {1: "prontos a enviar", 2: "moveis, sem DDD para enderecar",
                3: "em regra NAO tem WhatsApp", 4: "sem casos nesta base",
                5: "DDD inexistente — nao usar"}[b]
        resumo.append(([BLOCOS[b][1], q, pct(q), nota], EST_CAT[BLOCOS[b][0]]))
    resumo += [
        (["SOMA DOS BLOCOS", sum(cont.values()), pct(sum(cont.values())),
          "tem de bater com o total"], EST_TITULO),
        (["", "", "", ""], EST_NORMAL),
        (["LEITURA PARA ENVIO", "", "", ""], EST_TITULO),
        (["Prontos a enviar (bloco 1)", cont.get(1, 0), pct(cont.get(1, 0)),
          "celular com DDD"], EST_NORMAL),
        (["Moveis sem DDD (bloco 2)", cont.get(2, 0), pct(cont.get(2, 0)),
          "DDD nao inferido"], EST_NORMAL),
        (["Fixos (blocos 3 + 4)", cont.get(3, 0) + cont.get(4, 0),
          pct(cont.get(3, 0) + cont.get(4, 0)), "em regra sem WhatsApp"], EST_NORMAL),
        (["Verificados no Twilio", n_twilio, pct(n_twilio),
          "os unicos com WhatsApp CONFIRMADO"], EST_NORMAL),
    ]

    folhas = [
        {"titulo": "Numeros", "cabecalho": CAB, "linhas": linhas_numeros(),
         "numericas": {0}, "larguras": LARG, "filtro": True},
        {"titulo": "Resumo",
         "cabecalho": ["1 - Bloco", "2 - Quantidade", "3 - Percentual", "4 - Observacao"],
         "linhas": iter(resumo), "numericas": {1}, "larguras": [34, 16, 14, 36]},
    ]

    print("\na escrever...")
    for t, n in escrever_xlsx_estilizado(DESTINO, folhas):
        print(f"  aba {t:12} {n:>7,} linhas")
    print(f"\n{DESTINO}  ({DESTINO.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
