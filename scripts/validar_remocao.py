#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MC-REMOVER-PREFIXOS — validacao independente.

Compara o ficheiro LIMPO com o BACKUP do original, linha a linha, e exige que a
unica diferenca seja a remocao do prefixo. Um "ficou tudo bem" que so olhe para
o resultado nao distingue "removeu o prefixo" de "reescreveu outra coisa".
"""
import sys, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

S  = Path(r"C:\Users\Moltbot\Desktop\CONTATOS-ORGANIZADOS")
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
falhas = []

def checar(ok, msg):
    print(("  OK    " if ok else "  FALHA ") + msg)
    if not ok:
        falhas.append(msg)

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

novo_cab, novo = ler(S / "whatsapp.xlsx")
velho_cab, velho = ler(S / "whatsapp.ORIGINAL-com-mais.xlsx")

print("=" * 66)
print("1. NADA SE PERDEU")
print("=" * 66)
checar(len(novo) == len(velho), f"{len(novo):,} linhas == {len(velho):,} do original")
checar(novo_cab == velho_cab, f"cabecalho inalterado: {novo_cab}")
checar([l[0] for l in novo] == [l[0] for l in velho], "coluna ID identica ao original")
ids = [int(l[0]) for l in novo]
checar(ids == list(range(1, len(ids) + 1)), f"IDs de 1 a {len(ids):,} sem saltos")

print()
print("=" * 66)
print("2. OS PREFIXOS SAIRAM")
print("=" * 66)
com_mais = [l for l in novo if "+" in l[1]]
com_pct  = [l for l in novo if "%" in l[1]]
checar(not com_mais, f"nenhum valor contem '+' ({len(com_mais)} encontrados)")
checar(not com_pct,  f"nenhum valor contem '%' ({len(com_pct)} encontrados)")
nao_digito = [l for l in novo if not l[1].isdigit()]
checar(not nao_digito, f"todos os {len(novo):,} valores sao SO digitos "
                       f"({len(nao_digito)} excepcoes)")

print()
print("=" * 66)
print("3. A UNICA MUDANCA FOI O PREFIXO  (comparacao linha a linha)")
print("=" * 66)
divergentes = []
alterados = 0
for a, b in zip(velho, novo):
    esperado = a[1].lstrip("+%")
    if b[1] != esperado:
        divergentes.append((a[0], a[1], b[1]))
    if a[1] != b[1]:
        alterados += 1
checar(not divergentes,
       f"as {len(novo):,} linhas correspondem exactamente a 'original sem prefixo' "
       f"({len(divergentes)} divergencias)")
print(f"    alterados: {alterados:,} | inalterados: {len(novo)-alterados:,}")
checar(alterados == 22_270, f"{alterados:,} alterados == 22.270 que tinham '+'")

print()
print("=" * 66)
print("4. NAO SE CRIARAM DUPLICADOS")
print("=" * 66)
vals = [l[1] for l in novo]
checar(len(vals) == len(set(vals)),
       f"{len(set(vals)):,} distintos em {len(vals):,} linhas")

print()
print("=" * 66)
print("5. TESTE POR MUTACAO — o comparador deteta uma alteracao a mais?")
print("=" * 66)
# Um comparador que aceite tudo da sempre verde. Fabrica-se uma linha
# adulterada e exige-se que a regra da seccao 3 a reprove.
falso = list(novo)
i = min(500, len(falso) - 1)
adulterado = [falso[i][0], falso[i][1][:-1] + ("7" if falso[i][1][-1] != "7" else "8")]
detectou = adulterado[1] != velho[i][1].lstrip("+%")
checar(detectou, "digito trocado numa linha FOI detetado pela regra da seccao 3")
checar(novo[i][1] == velho[i][1].lstrip("+%"), "a mesma linha, intacta, passa")

print()
print("=" * 66)
print("VEREDITO: " + ("TUDO PASSOU" if not falhas else f"{len(falhas)} FALHA(S)"))
print("=" * 66)
for f in falhas:
    print("  - " + f)
sys.exit(1 if falhas else 0)
