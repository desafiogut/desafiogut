#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MC-EXPORTAR-CONTATOS-SIMPLES — validacao independente dos dois .xlsx.

Nao confia no script que os escreveu: abre cada ficheiro como ZIP, parseia o
XML e reconta. Verifica estrutura, contagem, numeracao 1..N, ausencia de
celulas vazias, ausencia de repetidos, e coerencia com o .txt de origem.

O verificador e ele proprio testado por MUTACAO: um .xlsx defeituoso e
fabricado em memoria e tem de ser REPROVADO. Um validador que nunca reprova
nada da sempre verde e nao prova coisa nenhuma.
"""
import io, sys, zipfile, xml.etree.ElementTree as ET
from pathlib import Path

SAIDA = Path(r"C:\Users\Moltbot\Desktop\CONTATOS-ORGANIZADOS")
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

falhas = []
def checar(ok, msg):
    print(("  OK    " if ok else "  FALHA ") + msg)
    if not ok:
        falhas.append(msg)

def ler_linhas(fonte):
    """fonte: caminho ou bytes. Devolve (cabecalho, lista_de_linhas)."""
    zf = zipfile.ZipFile(fonte if isinstance(fonte, (str, Path)) else io.BytesIO(fonte))
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

def validar(nome, origem_txt, esperado):
    print("=" * 66)
    print(f"{nome}")
    print("=" * 66)
    p = SAIDA / nome
    checar(p.exists(), f"existe ({p.stat().st_size:,} bytes)" if p.exists() else "AUSENTE")
    if not p.exists():
        return
    checar(zipfile.ZipFile(p).testzip() is None, "ZIP integro")
    nomes = set(zipfile.ZipFile(p).namelist())
    for o in ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml",
              "xl/_rels/workbook.xml.rels", "xl/worksheets/sheet1.xml"]:
        checar(o in nomes, f"parte presente: {o}")

    cab, linhas = ler_linhas(p)
    print(f"  cabecalho: {cab}")
    checar(len(cab) == 2, f"2 colunas ({len(cab)})")
    checar(cab[0] == "1 - ID", "coluna 1 rotulada '1 - ID'")
    checar(cab[1].startswith("2 - "), f"coluna 2 rotulada '{cab[1]}'")
    checar(len(linhas) == esperado, f"{len(linhas):,} linhas de dados == {esperado:,} esperadas")

    ids = [int(l[0]) for l in linhas]
    checar(ids == list(range(1, len(ids) + 1)), f"IDs de 1 a {len(ids):,} sem saltos")
    checar(ids[-1] == esperado, f"ultima linha tem ID = {ids[-1]:,}")

    vals = [l[1] for l in linhas]
    checar(all(v.strip() for v in vals), "nenhuma celula de valor vazia")
    checar(len(vals) == len(set(vals)), f"{len(set(vals)):,} valores distintos — sem repetidos")

    origem = [l.strip() for l in open(origem_txt, encoding="utf-8") if l.strip()]
    checar(vals == origem, "conteudo identico ao .txt de origem, na mesma ordem")
    print()

validar("emails.xlsx",   SAIDA / "unicos" / "emails.txt",   250_360)
validar("whatsapp.xlsx", SAIDA / "unicos" / "whatsapp.txt",  27_759)

print("=" * 66)
print("TESTE POR MUTACAO — o validador reprova um ficheiro defeituoso?")
print("=" * 66)
from exportar_contatos import escrever_xlsx  # noqa: E402
buf = SAIDA / "_mutante_temp.xlsx"
# Defeito deliberado: um ID saltado e um valor repetido.
escrever_xlsx(buf, [("X", ["1 - ID", "2 - Valor"],
                     iter([[1, "a@a.com"], [3, "a@a.com"]]), {0})])
_, mut = ler_linhas(buf)
ids_mut = [int(l[0]) for l in mut]
vals_mut = [l[1] for l in mut]
checar(ids_mut != list(range(1, len(ids_mut) + 1)),
       "salto de ID no ficheiro mutante FOI detetado")
checar(len(vals_mut) != len(set(vals_mut)),
       "valor repetido no ficheiro mutante FOI detetado")
buf.unlink()

print()
print("=" * 66)
print("VEREDITO: " + ("TUDO PASSOU" if not falhas else f"{len(falhas)} FALHA(S)"))
print("=" * 66)
for f in falhas:
    print("  - " + f)
sys.exit(1 if falhas else 0)
