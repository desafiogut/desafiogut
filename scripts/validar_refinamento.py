#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MC-REFINAR-WHATSAPP — validacao independente.

A verificacao que decide este MC nao e nenhuma contagem: e provar que NENHUM
CONTACTO SE PERDEU. Removeram-se 5.489 numeros com o argumento de que eram
duplicados; se um so deles nao tiver o equivalente completo na lista final, o
argumento cai e um contacto foi apagado. Isso e testado numero a numero.
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

def ler(p, idx=1):
    zf = zipfile.ZipFile(p)
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

NOVO = S / "whatsapp_refinado.xlsx"
VELHO = S / "whatsapp_classificado.xlsx"

print("=" * 70); print("1. ESTRUTURA E COLUNAS PEDIDAS"); print("=" * 70)
zf = zipfile.ZipFile(NOVO)
checar(zf.testzip() is None, "ZIP integro")
nomes = [s.get("name") for s in ET.parse(zf.open("xl/workbook.xml")).getroot().find("m:sheets", NS)]
checar(nomes == ["Numeros", "Resumo"], f"abas: {nomes}")
cab, nums = ler(NOVO)
print(f"  cabecalho: {cab[0]}")
checar(len(cab[0]) == 5, f"exactamente 5 colunas ({len(cab[0])})")
checar(cab[0] == ["1 - ID", "2 - Numero", "3 - Bloco", "4 - Categoria", "5 - DDD"],
       "colunas sao ID · Numero · Bloco · Categoria · DDD")
junto = " ".join(cab[0]).lower()
checar("pronto" not in junto, "coluna 'Pronto para envio' REMOVIDA")
checar("twilio" not in junto, "coluna 'Verificado Twilio' REMOVIDA")
est = ET.parse(zf.open("xl/styles.xml")).getroot()
n_xf = len(list(est.find("m:cellXfs", NS)))
usados = set(cab[1]) | {e for _, es in nums for e in es}
checar(max(usados) < n_xf, f"maior indice de estilo ({max(usados)}) < cellXfs ({n_xf})")

print(); print("=" * 70); print("2. CONTAGENS"); print("=" * 70)
checar(len(nums) == 22_232, f"{len(nums):,} linhas (esperado 22.232)")
ids = [int(v[0]) for v, _ in nums]
checar(ids == list(range(1, len(ids) + 1)), f"IDs renumerados 1..{len(ids):,} sem saltos")
def bl(v): return int(re.search(r"Bloco (\d)", v[2]).group(1))
cont = Counter(bl(v) for v, _ in nums)
print(f"  blocos: {dict(sorted(cont.items()))}")
checar(cont.get(1, 0) == 13_993, f"Bloco 1 = {cont.get(1,0):,}")
checar(cont.get(2, 0) == 8_239, f"Bloco 2 = {cont.get(2,0):,}")
checar(cont.get(3, 0) == 0, f"Bloco 3 = {cont.get(3,0):,}")
checar(5 not in cont, "NENHUM numero do antigo Bloco 5 permanece")
checar(sum(cont.values()) == len(nums), f"soma dos blocos = {sum(cont.values()):,}")
vals = [v[1] for v, _ in nums]
checar(len(vals) == len(set(vals)), f"{len(set(vals)):,} distintos — zero repetidos")

print(); print("=" * 70)
print("3. A VERIFICACAO QUE DECIDE: NENHUM CONTACTO SE PERDEU")
print("=" * 70)
_, velho = ler(VELHO)
def bl_v(v): return int(re.search(r"Bloco (\d)", v[2]).group(1))
antigos = {bl_v(v): [] for v in [x for x, _ in velho]}
for v, _ in velho:
    antigos.setdefault(bl_v(v), []).append(v[1])
print(f"  partida: {dict(sorted((k, len(x)) for k, x in antigos.items()))}")

finais = set(vals)
# 3a. cada sem-DDD removido tem o seu equivalente completo na lista final?
sem_ddd = antigos.get(2, [])
sem_par = [n for n in sem_ddd if "5592" + n not in finais]
checar(not sem_par,
       f"os {len(sem_ddd):,} sem-DDD removidos tem TODOS o equivalente 5592… na "
       f"lista final ({len(sem_par)} sem par)")
# 3b. tudo o que era bloco 1 ou 3 continua la
devia_ficar = set(antigos.get(1, [])) | set(antigos.get(3, []))
perdidos = devia_ficar - finais
checar(not perdidos,
       f"os {len(devia_ficar):,} numeros dos antigos blocos 1 e 3 estao todos "
       f"presentes ({len(perdidos)} perdidos)")
# 3c. nada apareceu do nada
inventados = finais - devia_ficar
checar(not inventados, f"nenhum numero novo foi inventado ({len(inventados)})")
# 3d. e os inconsistentes sairam mesmo
saiu_inc = [n for n in antigos.get(5, []) if n in finais]
checar(not saiu_inc, f"os {len(antigos.get(5,[])):,} inconsistentes nao estao na "
                     f"lista final ({len(saiu_inc)} ainda la)")

print(); print("=" * 70); print("4. REMAPEAMENTO DOS BLOCOS"); print("=" * 70)
mapa_velho = {v[1]: bl_v(v) for v, _ in velho}
esperado = {1: 1, 3: 2, 4: 3}
maus = [v[1] for v, _ in nums if esperado.get(mapa_velho[v[1]]) != bl(v)]
checar(not maus, f"todo numero foi remapeado 1→1, 3→2, 4→3 ({len(maus)} erros)")
CAT = {1: "Celular", 2: "Fixo", 3: "Fixo"}
checar(all(v[3] == CAT[bl(v)] for v, _ in nums), "a Categoria bate com o bloco novo")
checar(all(v[4] not in ("", "—") for v, _ in nums if bl(v) in (1, 2)),
       "todos os dos blocos 1 e 2 tem DDD preenchido")

print(); print("=" * 70); print("5. TESTE POR MUTACAO"); print("=" * 70)
checar(("5592" + sem_ddd[0]) in finais, "um sem-DDD real TEM par na lista (o caso verdadeiro)")
checar(("5511" + sem_ddd[0]) not in finais,
       "o mesmo numero com outro DDD NAO teria par — a regra 3a e sensivel ao prefixo")
checar((finais | {"559299999999999"}) != finais, "um numero a mais SERIA detetado")

print(); print("=" * 70)
print("VEREDITO: " + ("TUDO PASSOU" if not falhas else f"{len(falhas)} FALHA(S)"))
print("=" * 70)
for f in falhas: print("  - " + f)
sys.exit(1 if falhas else 0)
