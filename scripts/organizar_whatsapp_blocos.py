#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MC-ORGANIZAR-WHATSAPP (v2) — os blocos passam a LER-SE como blocos.

O que mudou face a v1, e porque:

 1. A aba "Todos os numeros" estava ORDENADA POR ID, com as categorias
    intercaladas. Passa a estar agrupada por BLOCO, cada bloco contiguo. Um
    bloco intercalado nao e um bloco — e uma lista com uma coluna a dizer a
    que bloco pertence.

 2. Cada linha ganha COR DE FUNDO da sua categoria, e cada bloco e precedido
    de uma linha de TITULO com o nome do bloco e a sua contagem. Assim a
    fronteira entre blocos ve-se sem ler nenhuma celula.

 3. Cada bloco tem numeracao PROPRIA ("N no bloco", 1..N) alem do ID global,
    porque "o numero 4.212 do bloco dos fixos" e uma pergunta que se faz e que
    a numeracao global nao responde.

 4. Cabecalho fixo, larguras por coluna e filtro automatico.

A linha de titulo de bloco fica FORA das abas por categoria (essas sao dados
puros, para copiar sem limpar nada) e so aparece na aba "Todos os numeros",
que e a de leitura.
"""

import sys, zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from xlsx_estilo import (escrever_xlsx_estilizado, EST_CAT, EST_TITULO,  # noqa: E402
                         EST_NORMAL)

S       = Path(r"C:\Users\Moltbot\Desktop\CONTATOS-ORGANIZADOS")
ORIGEM  = S / "whatsapp.xlsx"
DESTINO = S / "whatsapp_organizado.xlsx"
NS      = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

DDD_VALIDOS = {11,12,13,14,15,16,17,18,19, 21,22,24,27,28, 31,32,33,34,35,37,38,
               41,42,43,44,45,46,47,48,49, 51,53,54,55, 61,62,63,64,65,66,67,68,69,
               71,73,74,75,77,79, 81,82,83,84,85,86,87,88,89, 91,92,93,94,95,96,97,98,99}

# Ordem dos blocos = utilidade decrescente para envio. O que serve primeiro.
BLOCOS = [
    ("celular_completo", "BLOCO 1 — CELULARES COM DDD",
     "prontos a enviar · +55 (DD) 9 XXXX-XXXX"),
    ("celular_sem_ddd",  "BLOCO 2 — CELULARES SEM DDD",
     "moveis, mas NAO enderecaveis sem o DDD · 9XXXX-XXXX"),
    ("fixo_completo",    "BLOCO 3 — FIXOS COM DDD",
     "em regra NAO tem WhatsApp · +55 (DD) XXXX-XXXX"),
    ("fixo_sem_ddd",     "BLOCO 4 — FIXOS SEM DDD", "sem casos nesta base"),
    ("inconsistente",    "BLOCO 5 — INCONSISTENTES", "DDD inexistente · nao usar"),
]
ROTULO = {c: t.split("— ")[1] for c, t, _ in BLOCOS}


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
    if len(v) == 13 and v.startswith("55") and v[4] == "9":
        dd = int(v[2:4])
        if dd not in DDD_VALIDOS:
            return "inconsistente", v, f"{dd:02d}", f"DDD {dd:02d} nao existe"
        return "celular_completo", f"+55 ({v[2:4]}) 9 {v[5:9]}-{v[9:]}", v[2:4], ""
    if len(v) == 12 and v.startswith("55") and v[4] in "2345":
        dd = int(v[2:4])
        if dd not in DDD_VALIDOS:
            return "inconsistente", v, f"{dd:02d}", f"DDD {dd:02d} nao existe"
        return "fixo_completo", f"+55 ({v[2:4]}) {v[4:8]}-{v[8:]}", v[2:4], ""
    if len(v) == 9 and v[0] == "9":
        return "celular_sem_ddd", f"{v[:5]}-{v[5:]}", "—", "sem DDD — nao inferido"
    if len(v) == 8 and v[0] in "2345":
        return "fixo_sem_ddd", f"{v[:4]}-{v[4:]}", "—", "sem DDD — nao inferido"
    return "inconsistente", v, "—", f"formato nao reconhecido ({len(v)} digitos)"


def main():
    _, linhas = ler(ORIGEM)
    print(f"lido: {len(linhas):,} numeros")

    regs = []
    for l in linhas:
        cat, fmt, ddd, obs = classificar(l[1])
        regs.append({"id": int(l[0]), "orig": l[1], "fmt": fmt,
                     "cat": cat, "ddd": ddd, "obs": obs})
    cont = Counter(r["cat"] for r in regs)
    assert sum(cont.values()) == len(linhas)

    por_bloco = {c: [r for r in regs if r["cat"] == c] for c, _, _ in BLOCOS}

    CAB = ["1 - N no bloco", "2 - ID global", "3 - Numero (so digitos)",
           "4 - Numero formatado", "5 - Bloco", "6 - DDD", "7 - Observacao"]
    LARG = [14, 12, 22, 24, 26, 8, 30]

    # ── aba de leitura: blocos contiguos, com titulo e cor ──
    def linhas_todos():
        for cat, titulo, nota in BLOCOS:
            grupo = por_bloco[cat]
            yield ([f"{titulo}", f"{len(grupo):,} numeros", nota, "", "", "", ""],
                   EST_TITULO)
            for i, r in enumerate(grupo, 1):
                yield ([i, r["id"], r["orig"], r["fmt"], ROTULO[cat],
                        r["ddd"], r["obs"] or "—"], EST_CAT[cat])

    # ── abas por categoria: dados puros, sem linha de titulo ──
    def linhas_cat(cat):
        for i, r in enumerate(por_bloco[cat], 1):
            yield ([i, r["id"], r["orig"], r["fmt"], ROTULO[cat],
                    r["ddd"], r["obs"] or "—"], EST_CAT[cat])

    movel = cont["celular_completo"] + cont["celular_sem_ddd"]
    resumo = [
        (["TOTAL DE NUMEROS", len(linhas), ""], EST_TITULO),
        ([f"Bloco 1 — {ROTULO['celular_completo']}", cont["celular_completo"],
          "prontos a enviar"], EST_CAT["celular_completo"]),
        ([f"Bloco 2 — {ROTULO['celular_sem_ddd']}", cont["celular_sem_ddd"],
          "moveis, sem DDD para endereçar"], EST_CAT["celular_sem_ddd"]),
        ([f"Bloco 3 — {ROTULO['fixo_completo']}", cont["fixo_completo"],
          "em regra NAO tem WhatsApp"], EST_CAT["fixo_completo"]),
        ([f"Bloco 4 — {ROTULO['fixo_sem_ddd']}", cont["fixo_sem_ddd"],
          "sem casos nesta base"], EST_CAT["fixo_sem_ddd"]),
        ([f"Bloco 5 — {ROTULO['inconsistente']}", cont["inconsistente"],
          "DDD inexistente"], EST_CAT["inconsistente"]),
        (["SOMA DOS BLOCOS", sum(cont.values()), "tem de bater com o total"], EST_TITULO),
        (["", "", ""], EST_NORMAL),
        (["LEITURA PARA ENVIO", "", ""], EST_TITULO),
        (["Moveis (podem ter WhatsApp)", movel, "blocos 1 + 2"], EST_NORMAL),
        (["Fixos (em regra nao tem)", cont["fixo_completo"], "bloco 3"], EST_NORMAL),
        (["Prontos a enviar", cont["celular_completo"], "so o bloco 1 esta completo"], EST_NORMAL),
        (["Verificados no Twilio", 198, "os unicos com WhatsApp CONFIRMADO"], EST_NORMAL),
    ]

    folhas = [
        {"titulo": "Resumo", "cabecalho": ["1 - Bloco", "2 - Quantidade", "3 - Observacao"],
         "linhas": iter(resumo), "numericas": {1}, "larguras": [40, 16, 38]},
        {"titulo": "Todos por bloco", "cabecalho": CAB, "linhas": linhas_todos(),
         "numericas": {0, 1}, "larguras": LARG, "filtro": True},
    ]
    for cat, titulo, _ in BLOCOS:
        folhas.append({"titulo": titulo.split(" — ")[0].replace("BLOCO ", "Bloco ")
                                 + " " + ROTULO[cat][:18],
                       "cabecalho": CAB, "linhas": linhas_cat(cat),
                       "numericas": {0, 1}, "larguras": LARG, "filtro": True})

    print("\na escrever...")
    for t, n in escrever_xlsx_estilizado(DESTINO, folhas):
        print(f"  aba {t:34} {n:>7,} linhas")
    print(f"\n{DESTINO}  ({DESTINO.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
