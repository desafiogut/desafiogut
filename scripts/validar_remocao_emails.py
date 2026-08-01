#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MC-REMOVER-PREFIXOS — validacao independente do emails.xlsx limpo.
Compara com o backup e exige que a unica mudanca seja a remocao dos prefixos
mais a eliminacao dos duplicados que isso revelou.
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

def limpar(v):
    v = v.strip()
    while True:
        if v[:3].lower() == "%20": v = v[3:]
        elif v[:1] in ("%", "+"):  v = v[1:]
        else: return v

cab_n, novo   = ler(S / "emails.xlsx")
cab_v, velho  = ler(S / "emails.ORIGINAL-com-prefixos.xlsx")

print("=" * 66); print("1. OS PREFIXOS SAIRAM"); print("=" * 66)
checar(not [l for l in novo if l[1][:1] in ("%", "+")],
       "nenhum valor comeca por '%' ou '+'")
checar(not [l for l in novo if l[1][:3].lower() == "%20"], "nenhum '%20' residual")
checar(all("@" in l[1] and l[1].split("@")[0] for l in novo),
       f"todos os {len(novo):,} enderecos continuam com parte local e '@'")

print(); print("=" * 66); print("2. NADA A MAIS FOI ALTERADO"); print("=" * 66)
esperado = sorted({limpar(l[1]) for l in velho})
obtido   = [l[1] for l in novo]
checar(obtido == esperado,
       f"conteudo == 'original limpo e deduplicado' ({len(obtido):,} vs {len(esperado):,})")
checar(cab_n == cab_v, f"cabecalho inalterado: {cab_n}")

print(); print("=" * 66); print("3. CONTAGENS"); print("=" * 66)
print(f"    antes {len(velho):,}  ->  depois {len(novo):,}  (removidos {len(velho)-len(novo):,})")
checar(len(novo) == 250_104, f"{len(novo):,} linhas")
ids = [int(l[0]) for l in novo]
checar(ids == list(range(1, len(ids) + 1)), f"IDs renumerados 1..{len(ids):,} sem saltos")
checar(len(obtido) == len(set(obtido)), f"{len(set(obtido)):,} distintos — zero repetidos")

print(); print("=" * 66)
print("4. NENHUM CONTACTO REAL SE PERDEU")
print("=" * 66)
# Todo endereco do original tem de continuar representado (na forma limpa).
orig_limpos = {limpar(l[1]) for l in velho}
faltam = orig_limpos - set(obtido)
checar(not faltam, f"os {len(orig_limpos):,} enderecos distintos do original estao todos presentes "
                   f"({len(faltam)} em falta)")
# E as linhas removidas eram TODAS duplicados, nao contactos unicos.
checar(len(velho) - len(novo) == len(velho) - len(orig_limpos),
       "as linhas removidas eram exclusivamente duplicados revelados pela limpeza")

print(); print("=" * 66)
print("5. TESTE POR MUTACAO")
print("=" * 66)
i = min(1000, len(novo) - 1)
adulterado = novo[i][1] + "x"
checar(adulterado not in esperado, "endereco adulterado seria REPROVADO pela regra da seccao 2")
checar(novo[i][1] in esperado, "o mesmo endereco, intacto, passa")

print(); print("=" * 66)
print("VEREDITO: " + ("TUDO PASSOU" if not falhas else f"{len(falhas)} FALHA(S)"))
print("=" * 66)
for f in falhas: print("  - " + f)
sys.exit(1 if falhas else 0)
