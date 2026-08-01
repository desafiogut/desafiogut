#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MC-CLASSIFICAR-WHATSAPP — validacao independente.

Reabre o .xlsx e reconta. Duas verificacoes valem mais que as contagens:

  · a REGRA de classificacao e reaplicada aqui, de forma independente, e tem de
    dar o mesmo bloco em todas as 27.737 linhas. Conferir so os totais nao
    distingue "13.993 certos" de "13.993 com dois trocados entre si".
  · a coluna "Verificado Twilio" e comparada CONJUNTO A CONJUNTO com o ficheiro
    dos 198, nao pela contagem. 198 marcas nos numeros errados contam na mesma 198.
"""
import re, sys, zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

S  = Path(r"C:\Users\Moltbot\Desktop\CONTATOS-ORGANIZADOS")
P  = S / "whatsapp_classificado.xlsx"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
falhas = []
def checar(ok, msg):
    print(("  OK    " if ok else "  FALHA ") + msg)
    if not ok: falhas.append(msg)

zf = zipfile.ZipFile(P)
def ler(idx):
    raiz = ET.parse(zf.open(f"xl/worksheets/sheet{idx}.xml")).getroot()
    out = []
    for row in raiz.find("m:sheetData", NS):
        vals, est = [], []
        for c in row:
            t = c.find("m:is/m:t", NS); v = c.find("m:v", NS)
            vals.append((t.text or "") if t is not None else (v.text if v is not None else ""))
            est.append(int(c.get("s") or 0))
        out.append((vals, est))
    return out[0], out[1:]

nomes = [s.get("name") for s in ET.parse(zf.open("xl/workbook.xml")).getroot().find("m:sheets", NS)]

print("=" * 70); print("1. ESTRUTURA E ESTILOS"); print("=" * 70)
checar(zf.testzip() is None, "ZIP integro")
checar(nomes == ["Numeros", "Resumo"], f"abas: {nomes}")
est = ET.parse(zf.open("xl/styles.xml")).getroot()
n_xf = len(list(est.find("m:cellXfs", NS)))
cab_n, nums = ler(1)
cab_r, res = ler(2)
usados = set(cab_n[1]) | {e for _, es in nums for e in es} | {e for _, es in res for e in es}
checar(max(usados) < n_xf, f"maior indice de estilo ({max(usados)}) < cellXfs ({n_xf})")
checar(all(c.startswith(f"{j+1} - ") for j, c in enumerate(cab_n[0])),
       f"colunas numeradas: {cab_n[0]}")

print(); print("=" * 70); print("2. ORDEM E NUMERACAO ORIGINAIS PRESERVADAS"); print("=" * 70)
checar(len(nums) == 27_737, f"{len(nums):,} linhas")
ids = [int(v[0]) for v, _ in nums]
checar(ids == list(range(1, 27_738)), f"IDs continuos de 1 a {ids[-1]:,}")

raiz_o = ET.parse(zipfile.ZipFile(S / "whatsapp.xlsx").open("xl/worksheets/sheet1.xml")).getroot()
orig = []
for row in list(raiz_o.find("m:sheetData", NS))[1:]:
    vals = []
    for c in row:
        # A coluna ID e celula NUMERICA (<v>), a do numero e texto inline (<is><t>).
        # Ler so o texto inline devolvia "" para o ID e a comparacao nunca podia
        # bater — era defeito do validador, nao dos dados.
        t = c.find("m:is/m:t", NS)
        v = c.find("m:v", NS)
        vals.append((t.text or "") if t is not None else (v.text if v is not None else ""))
    orig.append(vals)
checar([o[1] for o in orig] == [v[1] for v, _ in nums],
       "a coluna Numero e identica a whatsapp.xlsx, NA MESMA ORDEM")
checar([o[0] for o in orig] == [v[0] for v, _ in nums], "os IDs sao os mesmos do original")

print(); print("=" * 70)
print("3. A REGRA DE CLASSIFICACAO, REAPLICADA DE FORMA INDEPENDENTE")
print("=" * 70)
DDD_VALIDOS = {11,12,13,14,15,16,17,18,19,21,22,24,27,28,31,32,33,34,35,37,38,
               41,42,43,44,45,46,47,48,49,51,53,54,55,61,62,63,64,65,66,67,68,69,
               71,73,74,75,77,79,81,82,83,84,85,86,87,88,89,91,92,93,94,95,96,97,98,99}
def bloco_esperado(v):
    if len(v) == 13 and v.startswith("55") and v[4] == "9":
        return 1 if int(v[2:4]) in DDD_VALIDOS else 5
    if len(v) == 12 and v.startswith("55") and v[4] in "2345":
        return 3 if int(v[2:4]) in DDD_VALIDOS else 5
    if len(v) == 9 and v[0] == "9":  return 2
    if len(v) == 8 and v[0] in "2345": return 4
    return 5
divergem = [v[0] for v, _ in nums
            if int(re.search(r"Bloco (\d)", v[2]).group(1)) != bloco_esperado(v[1])]
checar(not divergem,
       f"o bloco de cada uma das {len(nums):,} linhas bate com a regra ({len(divergem)} divergencias)")

cont = Counter(int(re.search(r"Bloco (\d)", v[2]).group(1)) for v, _ in nums)
esperado = {1: 13_993, 2: 5_489, 3: 8_239, 4: 0, 5: 16}
for b in sorted(esperado):
    checar(cont.get(b, 0) == esperado[b],
           f"Bloco {b}: {cont.get(b,0):,} == {esperado[b]:,} esperado")
checar(sum(cont.values()) == 27_737, f"soma dos blocos = {sum(cont.values()):,}")

print(); print("=" * 70); print("4. CATEGORIA, PRONTO PARA ENVIO E DDD"); print("=" * 70)
CAT = {1: "Celular", 2: "Celular", 3: "Fixo", 4: "Fixo", 5: "Inconsistente"}
mau_cat = [v[0] for v, _ in nums if v[3] != CAT[int(re.search(r"Bloco (\d)", v[2]).group(1))]]
checar(not mau_cat, f"a categoria bate com o bloco em todas as linhas ({len(mau_cat)} erros)")
pronto_sim = {v[0] for v, _ in nums if v[5] == "Sim"}
bloco1 = {v[0] for v, _ in nums if v[2].startswith("Bloco 1")}
checar(pronto_sim == bloco1,
       f"'Pronto para envio = Sim' e EXACTAMENTE o bloco 1 ({len(pronto_sim):,})")
sem_ddd = [v[0] for v, _ in nums if v[4] == "—"]
checar(all(v[2].startswith(("Bloco 2", "Bloco 4", "Bloco 5")) for v, _ in nums if v[4] == "—"),
       f"DDD vazio so nos blocos sem DDD ({len(sem_ddd):,} linhas)")

print(); print("=" * 70)
print("5. VERIFICADO TWILIO — comparado CONJUNTO a CONJUNTO, nao por contagem")
print("=" * 70)
ver = {"".join(c for c in l.strip() if c.isdigit())
       for l in open(S / "unicos" / "whatsapp_VERIFICADOS.txt", encoding="utf-8") if l.strip()}
marcados = {v[1] for v, _ in nums if v[6] == "Sim"}
checar(len(ver) == 198, f"o ficheiro tem {len(ver)} verificados")
checar(marcados == ver,
       f"os marcados sao EXACTAMENTE os do ficheiro ({len(marcados)} marcados, "
       f"{len(marcados ^ ver)} de diferenca simetrica)")
checar(all(v[2].startswith("Bloco 1") for v, _ in nums if v[6] == "Sim"),
       "todos os verificados estao no bloco 1 (celular com DDD)")

print(); print("=" * 70); print("6. RESUMO COERENTE COM OS DADOS"); print("=" * 70)
linha_total = next(v for v, _ in res if v[0] == "TOTAL DE NUMEROS")
checar(int(linha_total[1]) == 27_737, f"resumo diz total {linha_total[1]}")
soma_res = next(v for v, _ in res if v[0] == "SOMA DOS BLOCOS")
checar(int(soma_res[1]) == 27_737, f"resumo diz soma {soma_res[1]}")
pcts = [float(v[2].rstrip("%")) for v, _ in res if v[0].startswith("Bloco ")]
checar(abs(sum(pcts) - 100.0) < 0.05, f"os percentuais por bloco somam {sum(pcts):.2f}%")

print(); print("=" * 70); print("7. TESTE POR MUTACAO"); print("=" * 70)
amostra = nums[0][0]
checar(bloco_esperado(amostra[1] + "0") != bloco_esperado(amostra[1]),
       "um numero com um digito a mais mudaria de bloco — a regra e sensivel")
checar((marcados | {"55119999999999"}) != ver, "uma marca Twilio a mais SERIA detetada")
checar(marcados == ver, "o conjunto real, intacto, passa")

print(); print("=" * 70)
print("VEREDITO: " + ("TUDO PASSOU" if not falhas else f"{len(falhas)} FALHA(S)"))
print("=" * 70)
for f in falhas: print("  - " + f)
sys.exit(1 if falhas else 0)
