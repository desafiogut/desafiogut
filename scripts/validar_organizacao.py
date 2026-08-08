#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MC-ORGANIZAR-WHATSAPP — validacao independente.

Reabre o .xlsx gerado, reconta, e verifica que a formatacao e REVERSIVEL: tirar
a pontuacao do numero formatado tem de devolver exactamente o numero original.
E a unica verificacao que apanha um erro de formatacao — conferir que "parece
bem" nao distingue "+55 (11) 9 8765-4321" de "+55 (11) 9 8756-4321".
"""
import re, sys, zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

S  = Path(r"C:\Users\Moltbot\Desktop\CONTATOS-ORGANIZADOS")
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
falhas = []
def checar(ok, msg):
    print(("  OK    " if ok else "  FALHA ") + msg)
    if not ok: falhas.append(msg)

def ler(p, idx):
    zf = zipfile.ZipFile(p)
    raiz = ET.parse(zf.open(f"xl/worksheets/sheet{idx}.xml")).getroot()
    out = []
    for row in raiz.find("m:sheetData", NS):
        vals = []
        for c in row:
            t = c.find("m:is/m:t", NS); v = c.find("m:v", NS)
            vals.append((t.text or "") if t is not None else (v.text if v is not None else ""))
        out.append(vals)
    return out[0], out[1:]

def abas(p):
    zf = zipfile.ZipFile(p)
    wb = ET.parse(zf.open("xl/workbook.xml")).getroot()
    return [s.get("name") for s in wb.find("m:sheets", NS)]

NOVO = S / "whatsapp_organizado.xlsx"
ORIG = S / "whatsapp.xlsx"

print("=" * 68); print("1. ESTRUTURA"); print("=" * 68)
checar(NOVO.exists(), f"existe ({NOVO.stat().st_size:,} bytes)")
checar(zipfile.ZipFile(NOVO).testzip() is None, "ZIP integro")
nomes = abas(NOVO)
print(f"  abas: {nomes}")
checar(len(nomes) == 6, f"6 abas ({len(nomes)})")

folhas = {n: ler(NOVO, i + 1) for i, n in enumerate(nomes)}
for n, (cab, dados) in folhas.items():
    checar(all(c.startswith(f"{j+1} - ") for j, c in enumerate(cab)),
           f"[{n}] colunas numeradas 1..{len(cab)}")

print(); print("=" * 68); print("2. AS CONTAGENS FECHAM"); print("=" * 68)
_, todos = folhas["Todos os numeros"]
_, cel   = folhas["Celulares completos"]
_, fix   = folhas["Fixos completos"]
_, sdd   = folhas["Sem DDD"]
_, inc   = folhas["Inconsistentes"]
checar(len(todos) == 27_737, f"'Todos os numeros' tem {len(todos):,} linhas")
soma = len(cel) + len(fix) + len(sdd) + len(inc)
checar(soma == len(todos), f"{len(cel):,}+{len(fix):,}+{len(sdd):,}+{len(inc):,} = {soma:,} == {len(todos):,}")

print(); print("=" * 68); print("3. NADA SE PERDEU FACE AO FICHEIRO DE ORIGEM"); print("=" * 68)
_, orig = ler(ORIG, 1)
checar(len(orig) == len(todos), f"origem {len(orig):,} == organizado {len(todos):,}")
checar([o[1] for o in orig] == [t[2] for t in todos],
       "coluna 'so digitos' identica a origem, na mesma ordem")

print(); print("=" * 68)
print("4. A FORMATACAO E REVERSIVEL  (o teste que apanha erro de formato)")
print("=" * 68)
maus = []
for t in todos:
    so_dig = t[2]
    formatado = t[3]
    if re.sub(r"\D", "", formatado) != so_dig:
        maus.append((t[0], so_dig, formatado))
checar(not maus, f"tirar a pontuacao de todos os {len(todos):,} formatados devolve o "
                 f"numero original ({len(maus)} divergencias)")

print(); print("=" * 68); print("5. FORMATO CORRECTO POR CATEGORIA"); print("=" * 68)
RE_CEL = re.compile(r"^\+55 \(\d{2}\) 9 \d{4}-\d{4}$")
RE_FIX = re.compile(r"^\+55 \(\d{2}\) \d{4}-\d{4}$")
RE_SDD = re.compile(r"^9\d{4}-\d{4}$")
checar(all(RE_CEL.match(l[3]) for l in cel),
       f"os {len(cel):,} celulares estao em '+55 (DD) 9 XXXX-XXXX'")
checar(all(RE_FIX.match(l[3]) for l in fix),
       f"os {len(fix):,} fixos estao em '+55 (DD) XXXX-XXXX'")
checar(all(RE_SDD.match(l[3]) for l in sdd),
       f"os {len(sdd):,} sem DDD estao em '9XXXX-XXXX'")
checar(all(l[5] != "—" for l in cel + fix), "celulares e fixos tem DDD preenchido")

print(); print("=" * 68); print("6. AS CATEGORIAS ESTAO CERTAS"); print("=" * 68)
checar(all(len(l[2]) == 13 and l[2][4] == "9" for l in cel),
       "todo 'celular completo' tem 13 digitos com assinante a comecar por 9")
checar(all(len(l[2]) == 12 and l[2][4] in "2345" for l in fix),
       "todo 'fixo completo' tem 12 digitos com assinante a comecar por 2-5")
checar(all(len(l[2]) == 9 and l[2][0] == "9" for l in sdd),
       "todo 'sem DDD' tem 9 digitos a comecar por 9")
DDD_VALIDOS = {11,12,13,14,15,16,17,18,19,21,22,24,27,28,31,32,33,34,35,37,38,
               41,42,43,44,45,46,47,48,49,51,53,54,55,61,62,63,64,65,66,67,68,69,
               71,73,74,75,77,79,81,82,83,84,85,86,87,88,89,91,92,93,94,95,96,97,98,99}
checar(all(int(l[2][2:4]) in DDD_VALIDOS for l in cel + fix),
       "nenhum DDD inexistente escapou para as abas de completos")
checar(all(int(l[2][2:4]) not in DDD_VALIDOS for l in inc if len(l[2]) >= 12),
       f"os {len(inc)} inconsistentes sao mesmo de DDD inexistente")

print(); print("=" * 68)
print("7. TESTE POR MUTACAO — a regra da seccao 4 apanha um formato errado?")
print("=" * 68)
amostra = todos[0]
adulterado = amostra[3].replace("-", "-1", 1)   # acrescenta um digito
checar(re.sub(r"\D", "", adulterado) != amostra[2],
       "formatado com um digito a mais FOI detetado")
checar(re.sub(r"\D", "", amostra[3]) == amostra[2],
       "o mesmo formatado, intacto, passa")

print(); print("=" * 68)
print("VEREDITO: " + ("TUDO PASSOU" if not falhas else f"{len(falhas)} FALHA(S)"))
print("=" * 68)
for f in falhas: print("  - " + f)
sys.exit(1 if falhas else 0)
