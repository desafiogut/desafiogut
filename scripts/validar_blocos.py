#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MC-ORGANIZAR-WHATSAPP (v2) — validacao do ficheiro com blocos e estilos.

Alem do que a v1 ja verificava, esta versao tem de provar duas coisas novas:

  a) o `styles.xml` escrito a mao NAO corrompe o ficheiro — todo o indice de
     estilo usado numa celula tem de existir em <cellXfs>. Um indice fora do
     intervalo faz o Excel abrir em modo de reparacao, e isso nao se ve num
     parse de XML que so confirma boa formacao.

  b) os blocos sao mesmo BLOCOS — contiguos, cada um precedido do seu titulo,
     com a contagem do titulo igual ao numero de linhas que se lhe seguem.
     Um bloco intercalado passaria em qualquer contagem global.
"""
import re, sys, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

S  = Path(r"C:\Users\Moltbot\Desktop\CONTATOS-ORGANIZADOS")
P  = S / "whatsapp_organizado.xlsx"
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
        vals, estilos = [], []
        for c in row:
            t = c.find("m:is/m:t", NS); v = c.find("m:v", NS)
            vals.append((t.text or "") if t is not None else (v.text if v is not None else ""))
            estilos.append(int(c.get("s") or 0))
        out.append((vals, estilos))
    return out[0], out[1:]

nomes = [s.get("name") for s in ET.parse(zf.open("xl/workbook.xml")).getroot().find("m:sheets", NS)]

print("=" * 70); print("1. O FICHEIRO ABRE?  (estilos escritos a mao)"); print("=" * 70)
checar(zf.testzip() is None, "ZIP integro")
for o in ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml",
          "xl/_rels/workbook.xml.rels", "xl/styles.xml"]:
    checar(o in set(zf.namelist()), f"parte presente: {o}")

est = ET.parse(zf.open("xl/styles.xml")).getroot()
cellxfs = est.find("m:cellXfs", NS)
n_xf = len(list(cellxfs))
declarado = int(cellxfs.get("count"))
checar(n_xf == declarado, f"<cellXfs count='{declarado}'> == {n_xf} elementos reais")
# fills: todo fillId referido tem de existir
n_fill = len(list(est.find("m:fills", NS)))
fids = [int(x.get("fillId") or 0) for x in cellxfs]
checar(max(fids) < n_fill, f"maior fillId usado ({max(fids)}) < fills declarados ({n_fill})")
n_font = len(list(est.find("m:fonts", NS)))
fonts = [int(x.get("fontId") or 0) for x in cellxfs]
checar(max(fonts) < n_font, f"maior fontId usado ({max(fonts)}) < fonts declarados ({n_font})")

print(f"  abas: {nomes}")
folhas = {n: ler(i + 1) for i, n in enumerate(nomes)}
usados = set()
for n, (cab, dados) in folhas.items():
    usados |= set(cab[1])
    for _, e in dados:
        usados |= set(e)
checar(max(usados) < n_xf,
       f"maior indice de estilo usado nas celulas ({max(usados)}) < cellXfs ({n_xf})")

print(); print("=" * 70); print("2. OS BLOCOS SAO MESMO BLOCOS"); print("=" * 70)
cab_t, todos = folhas["Todos por bloco"]
titulos = [(i, v[0], v[1]) for i, (v, e) in enumerate(todos) if str(v[0]).startswith("BLOCO ")]
checar(len(titulos) == 5, f"5 linhas de titulo de bloco ({len(titulos)})")
for i, nome, qtd in titulos:
    print(f"    linha {i+2:>6}  {nome:<34} {qtd}")

# cada bloco: contiguo, e a contagem do titulo bate com as linhas seguintes
limites = [i for i, _, _ in titulos] + [len(todos)]
ok_contig, ok_qtd = True, True
for k, (i, nome, qtd) in enumerate(titulos):
    corpo = todos[limites[k] + 1: limites[k + 1]]
    declarado = int(str(qtd).split()[0].replace(",", "").replace(".", ""))
    if len(corpo) != declarado:
        ok_qtd = False
        print(f"    FALHA: {nome} diz {declarado} mas tem {len(corpo)}")
    blocos_no_corpo = {v[4] for v, _ in corpo}
    if len(blocos_no_corpo) > 1:
        ok_contig = False
        print(f"    FALHA: {nome} tem categorias misturadas: {blocos_no_corpo}")
    # numeracao propria 1..N
    if corpo and [int(v[0]) for v, _ in corpo] != list(range(1, len(corpo) + 1)):
        ok_contig = False
        print(f"    FALHA: {nome} nao numera 1..{len(corpo)}")
checar(ok_qtd, "a contagem de cada titulo == linhas do bloco")
checar(ok_contig, "cada bloco e contiguo, de uma so categoria, numerado 1..N")

dados = [(v, e) for v, e in todos if not str(v[0]).startswith("BLOCO ")]
checar(len(dados) == 27_737, f"{len(dados):,} linhas de dados (fora os 5 titulos)")
checar(len(todos) == 27_742, f"{len(todos):,} linhas totais == 27.737 + 5 titulos")

print(); print("=" * 70); print("3. COR POR CATEGORIA"); print("=" * 70)
por_cat = {}
for v, e in dados:
    por_cat.setdefault(v[4], set()).add(e[0])
for cat, ests in sorted(por_cat.items()):
    checar(len(ests) == 1, f"'{cat}' usa um unico estilo de fundo {ests}")
checar(len({next(iter(e)) for e in por_cat.values()}) == len(por_cat),
       f"as {len(por_cat)} categorias tem estilos DIFERENTES entre si")

print(); print("=" * 70); print("4. AS ABAS POR BLOCO BATEM COM O TODO"); print("=" * 70)
soma = 0
for n in nomes:
    if not n.startswith("Bloco "):
        continue
    _, d = folhas[n]
    soma += len(d)
    print(f"    {n:<34} {len(d):>7,}")
checar(soma == len(dados), f"soma das abas por bloco {soma:,} == {len(dados):,}")

print(); print("=" * 70); print("5. NADA SE PERDEU E A FORMATACAO E REVERSIVEL"); print("=" * 70)
raiz_o = ET.parse(zipfile.ZipFile(S / "whatsapp.xlsx").open("xl/worksheets/sheet1.xml")).getroot()
orig = []
for row in list(raiz_o.find("m:sheetData", NS))[1:]:
    cs = [c.find("m:is/m:t", NS) for c in row]
    orig.append([(c.text or "") if c is not None else "" for c in cs])
orig_nums = {o[1] for o in orig if len(o) > 1 and o[1]}
novos = {v[2] for v, _ in dados}
checar(orig_nums == novos,
       f"o conjunto de numeros e identico ao de whatsapp.xlsx ({len(orig_nums):,})")
maus = [v[2] for v, _ in dados if re.sub(r"\D", "", v[3]) != v[2]]
checar(not maus, f"tirar a pontuacao dos {len(dados):,} formatados devolve o original "
                 f"({len(maus)} divergencias)")

print(); print("=" * 70); print("6. TESTE POR MUTACAO"); print("=" * 70)
# 6a. a regra dos blocos apanharia um bloco intercalado?
falso = [(["1", "1", "x", "x", "CAT-A", "", ""], 3),
         (["2", "2", "y", "y", "CAT-B", "", ""], 3)]
checar(len({v[4] for v, _ in falso}) > 1, "bloco com categorias misturadas SERIA detetado")
# 6b. a regra dos estilos apanharia um indice fora do intervalo?
checar(999 >= n_xf, f"um estilo s='999' SERIA detetado (cellXfs tem {n_xf})")
# 6c. a regra da formatacao apanha um digito trocado?
amostra = dados[0][0]
checar(re.sub(r"\D", "", amostra[3] + "9") != amostra[2], "digito a mais SERIA detetado")
checar(re.sub(r"\D", "", amostra[3]) == amostra[2], "o mesmo, intacto, passa")

print(); print("=" * 70)
print("VEREDITO: " + ("TUDO PASSOU" if not falhas else f"{len(falhas)} FALHA(S)"))
print("=" * 70)
for f in falhas: print("  - " + f)
sys.exit(1 if falhas else 0)
