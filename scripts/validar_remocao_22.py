#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MC-REMOVER-PRIMEIROS-22 — validacao independente.
Compara o ficheiro novo com o backup e exige que a unica diferenca seja a
remocao das 22 primeiras linhas, com os restantes valores intactos e na mesma
ordem. Contar linhas nao chega: 27.737 linhas erradas contam na mesma 27.737.
"""
import sys, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

S  = Path(r"C:\Users\Moltbot\Desktop\CONTATOS-ORGANIZADOS")
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
falhas = []
def checar(ok, msg):
    print(("  OK    " if ok else "  FALHA ") + msg)
    if not ok: falhas.append(msg)

def ler(p):
    zf = zipfile.ZipFile(p)
    raiz = ET.parse(zf.open("xl/worksheets/sheet1.xml")).getroot()
    out = []
    for row in raiz.find("m:sheetData", NS):
        vals = []
        for c in row:
            t = c.find("m:is/m:t", NS); v = c.find("m:v", NS)
            vals.append((t.text or "") if t is not None else (v.text if v is not None else ""))
        out.append(vals)
    return out[0], out[1:]

cab_n, novo  = ler(S / "whatsapp.xlsx")
cab_v, velho = ler(S / "whatsapp.ANTES-DE-REMOVER-22.xlsx")

print("=" * 66); print("1. CONTAGEM"); print("=" * 66)
checar(len(velho) == 27_759, f"backup tem {len(velho):,} linhas (esperado 27.759)")
checar(len(novo) == 27_737, f"novo tem {len(novo):,} linhas (esperado 27.737)")
checar(len(velho) - len(novo) == 22, f"removidas exactamente {len(velho)-len(novo)} linhas")
checar(cab_n == cab_v, f"cabecalho inalterado: {cab_n}")

print(); print("=" * 66); print("2. FORAM AS 22 PRIMEIRAS, E SO ESSAS"); print("=" * 66)
esperado = [l[1] for l in velho[22:]]
obtido   = [l[1] for l in novo]
checar(obtido == esperado,
       "os valores sao exactamente velho[22:], na mesma ordem")
checar(novo[0][1] == velho[22][1], "o novo ID 1 e o antigo ID 23")
checar(novo[-1][1] == velho[-1][1], "a ultima linha e a mesma do original")
antigos_removidos = {l[1] for l in velho[:22]}
checar(not (antigos_removidos & set(obtido)),
       f"nenhum dos 22 removidos reaparece na lista")

print(); print("=" * 66); print("3. NUMERACAO"); print("=" * 66)
ids = [int(l[0]) for l in novo]
checar(ids == list(range(1, len(ids) + 1)), f"IDs renumerados 1..{len(ids):,} sem saltos")
checar(ids[-1] == 27_737, f"ultima linha tem ID = {ids[-1]:,}")

print(); print("=" * 66); print("4. INTEGRIDADE DOS DADOS"); print("=" * 66)
checar(all(v.isdigit() for v in obtido), "todos os valores continuam so com digitos")
checar(len(obtido) == len(set(obtido)), f"{len(set(obtido)):,} distintos — zero repetidos")
checar(all(v for v in obtido), "nenhuma celula vazia")

print(); print("=" * 66)
print("5. TESTE POR MUTACAO — a regra da seccao 2 deteta um corte errado?")
print("=" * 66)
# Se tivessem sido removidas 21 ou 23 linhas, ou as ultimas em vez das
# primeiras, a comparacao teria de reprovar. Verifica-se isso explicitamente.
checar([l[1] for l in velho[21:]] != obtido, "cortar 21 seria REPROVADO")
checar([l[1] for l in velho[23:]] != obtido, "cortar 23 seria REPROVADO")
checar([l[1] for l in velho[:-22]] != obtido, "cortar as ULTIMAS 22 seria REPROVADO")
checar([l[1] for l in velho[22:]] == obtido, "cortar as primeiras 22 passa (o caso real)")

print(); print("=" * 66)
print("VEREDITO: " + ("TUDO PASSOU" if not falhas else f"{len(falhas)} FALHA(S)"))
print("=" * 66)
for f in falhas: print("  - " + f)
sys.exit(1 if falhas else 0)
