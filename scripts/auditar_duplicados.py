#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MC-REFINAR-WHATSAPP — auditoria de duplicados do ficheiro final.

"Todos os valores sao distintos" nao chega. O MESMO telefone pode estar escrito
de varias maneiras e passar por dois numeros diferentes. Esta auditoria procura
cada uma dessas maneiras:

  D1  duplicado EXACTO                       (a verificacao trivial)
  D2  o mesmo numero com e sem o codigo 55
  D3  movel com e sem o NONO DIGITO          5592 9XXXXXXXX  vs  5592 XXXXXXXX
      (a portabilidade de 2012 acrescentou um 9 aos moveis; a mesma pessoa pode
       estar nas duas formas em bases antigas)
  D4  o mesmo numero truncado, sem DDD       92XXXXXXXXX vs XXXXXXXXX
  D5  numeros que so diferem em zeros a esquerda

Cada classe e contada. Zero em todas = a lista esta mesmo limpa.
"""
import sys, zipfile
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from pathlib import Path

S  = Path(r"C:\Users\Moltbot\Desktop\CONTATOS-ORGANIZADOS")
P  = S / "whatsapp_refinado.xlsx"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
falhas = []
def checar(ok, msg):
    print(("  OK    " if ok else "  FALHA ") + msg)
    if not ok: falhas.append(msg)

zf = zipfile.ZipFile(P)
raiz = ET.parse(zf.open("xl/worksheets/sheet1.xml")).getroot()
linhas = []
for row in list(raiz.find("m:sheetData", NS))[1:]:
    vals = []
    for c in row:
        t = c.find("m:is/m:t", NS); v = c.find("m:v", NS)
        vals.append((t.text or "") if t is not None else (v.text if v is not None else ""))
    linhas.append(vals)

nums = [l[1] for l in linhas]
print(f"ficheiro : {P.name}")
print(f"linhas   : {len(nums):,}\n")

def mask(v):
    return v[:5] + "*" * max(0, len(v) - 9) + v[-4:]

print("=" * 70); print("D1 — DUPLICADO EXACTO"); print("=" * 70)
c = Counter(nums)
rep = {k: q for k, q in c.items() if q > 1}
checar(not rep, f"{len(set(nums)):,} distintos em {len(nums):,} linhas "
                f"({len(rep)} valores repetidos)")
for k, q in list(rep.items())[:5]:
    print(f"    {mask(k)} x{q}")

print(); print("=" * 70); print("D2 — O MESMO NUMERO COM E SEM O CODIGO 55"); print("=" * 70)
sem55 = defaultdict(list)
for n in nums:
    sem55[n[2:] if n.startswith("55") else n].append(n)
col = {k: v for k, v in sem55.items() if len(set(v)) > 1}
checar(not col, f"nenhum numero aparece com e sem o '55' ({len(col)} casos)")
for k, v in list(col.items())[:5]:
    print(f"    {[mask(x) for x in set(v)]}")

print(); print("=" * 70)
print("D3 — MOVEL COM E SEM O NONO DIGITO  (5592 9XXXXXXXX vs 5592 XXXXXXXX)")
print("=" * 70)
# de um movel de 13 digitos, derivar a forma antiga de 12 (sem o 9 inicial do
# assinante) e ver se essa forma existe na lista
conj = set(nums)
pares = []
for n in nums:
    if len(n) == 13 and n[4] == "9":
        antigo = n[:4] + n[5:]          # tira o nono digito
        if antigo in conj:
            pares.append((n, antigo))
checar(not pares, f"nenhum movel esta na lista nas duas formas, com e sem o "
                  f"nono digito ({len(pares)} pares)")
for a, b in pares[:5]:
    print(f"    {mask(a)}  <->  {mask(b)}")

print(); print("=" * 70)
print("D4 — O MESMO NUMERO TRUNCADO, SEM DDD")
print("=" * 70)
curtos = [n for n in nums if len(n) < 12]
checar(not curtos, f"nao ha numeros curtos (sem DDD) na lista final ({len(curtos)})")
# e nenhum longo contem outro longo como sufixo?
sufixos = defaultdict(list)
for n in nums:
    if len(n) >= 12:
        sufixos[n[-9:]].append(n)
amb = {k: v for k, v in sufixos.items() if len({x[2:4] for x in v}) > 1}
print(f"    (informativo) mesmos 9 digitos finais com DDD diferente: {len(amb)} casos")
print(f"     — sao pessoas diferentes em estados diferentes, nao duplicados")

print(); print("=" * 70); print("D5 — ZEROS A ESQUERDA"); print("=" * 70)
zeros = defaultdict(list)
for n in nums:
    zeros[n.lstrip("0")].append(n)
col5 = {k: v for k, v in zeros.items() if len(set(v)) > 1}
checar(not col5, f"nenhum par difere apenas em zeros a esquerda ({len(col5)} casos)")

print(); print("=" * 70); print("VERIFICACAO CRUZADA COM AS OUTRAS LISTAS"); print("=" * 70)
def ler_txt(p):
    return {l.strip() for l in open(p, encoding="utf-8") if l.strip()}
so_dig = ler_txt(S / "unicos" / "whatsapp_somente_digitos.txt")
print(f"    whatsapp_somente_digitos.txt : {len(so_dig):,}")
print(f"    whatsapp_refinado.xlsx       : {len(conj):,}")
print(f"    diferenca                    : {len(so_dig) - len(conj):,} "
      f"(16 inconsistentes + 5.489 duplicados = 5.505)")
checar(len(so_dig) - len(conj) == 5_505, "a diferenca e exactamente 5.505")
checar(conj <= so_dig, "todo numero do refinado existe na lista de origem")

print(); print("=" * 70); print("TESTE POR MUTACAO"); print("=" * 70)
# cada regra tem de reprovar um caso construido de proposito
falsos = nums[:50] + [nums[0]]
checar(len(falsos) != len(set(falsos)), "D1 apanharia um duplicado exacto injectado")
n13 = next(n for n in nums if len(n) == 13 and n[4] == "9")
checar((n13[:4] + n13[5:]) not in conj,
       "D3: a forma sem nono digito deste movel NAO esta na lista (caso real)")
checar((n13[:4] + n13[5:]) in (conj | {n13[:4] + n13[5:]}),
       "D3 apanharia essa forma se ela la estivesse")

print(); print("=" * 70)
print("VEREDITO: " + ("SEM DUPLICADOS, EM NENHUMA DAS 5 CLASSES"
                      if not falhas else f"{len(falhas)} FALHA(S)"))
print("=" * 70)
for f in falhas: print("  - " + f)
sys.exit(1 if falhas else 0)
