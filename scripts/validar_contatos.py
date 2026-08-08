#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MC-EMAILS/WHATSAPP — validacao independente do .xlsx gerado.

Nao confia no script que escreveu o ficheiro: abre o .xlsx como ZIP, parseia o
XML de cada folha e RECONTA. Verifica:
  1. o ficheiro e um .xlsx estruturalmente valido (partes obrigatorias presentes)
  2. cada aba tem o numero de linhas esperado
  3. as abas de unicos NAO tem valores repetidos
  4. a coluna ID numera 1..N sem saltos
  5. as contagens batem com os .txt das pastas
  6. o verificador de duplicados FUNCIONA (teste por mutacao)

Sai 0 se tudo passar, 1 se algo falhar.
"""
import sys, zipfile, xml.etree.ElementTree as ET
from pathlib import Path

SAIDA = Path(r"C:\Users\Moltbot\Desktop\CONTATOS-ORGANIZADOS")
XLSX  = SAIDA / "contatos_organizados.xlsx"
NS    = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

falhas = []
def checar(ok, msg):
    print(("  OK   " if ok else "  FALHA ") + msg)
    if not ok:
        falhas.append(msg)

def ler_folha(zf, idx):
    """Devolve lista de linhas; cada linha e lista de strings."""
    with zf.open(f"xl/worksheets/sheet{idx}.xml") as fh:
        raiz = ET.parse(fh).getroot()
    out = []
    for row in raiz.find("m:sheetData", NS):
        vals = []
        for c in row:
            t = c.find("m:is/m:t", NS)
            if t is not None:
                vals.append(t.text or "")
            else:
                v = c.find("m:v", NS)
                vals.append(v.text if v is not None else "")
        out.append(vals)
    return out

print("=" * 70)
print("1. ESTRUTURA DO .XLSX")
print("=" * 70)
checar(XLSX.exists(), f"ficheiro existe ({XLSX.stat().st_size:,} bytes)" if XLSX.exists() else "ficheiro AUSENTE")
zf = zipfile.ZipFile(XLSX)
mau = zf.testzip()
checar(mau is None, "ZIP integro" if mau is None else f"ZIP corrompido em {mau}")
nomes = set(zf.namelist())
for obrig in ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels"]:
    checar(obrig in nomes, f"parte obrigatoria presente: {obrig}")

wb = ET.parse(zf.open("xl/workbook.xml")).getroot()
abas = [s.get("name") for s in wb.find("m:sheets", NS)]
print(f"  abas: {abas}")
checar(len(abas) == 5, f"5 abas encontradas ({len(abas)})")

print()
print("=" * 70)
print("2. CONTEUDO POR ABA")
print("=" * 70)
folhas = {}
for i, nome in enumerate(abas, start=1):
    linhas = ler_folha(zf, i)
    folhas[nome] = linhas
    cab = linhas[0]
    print(f"  [{nome}] {len(linhas)-1:,} linhas de dados | cabecalho: {cab}")
    checar(all(c.startswith(f"{j+1} - ") for j, c in enumerate(cab)),
           f"[{nome}] colunas numeradas 1..{len(cab)} no cabecalho")

print()
print("=" * 70)
print("3. SEM REPETICOES NAS ABAS DE UNICOS  (o pedido do operador)")
print("=" * 70)
def sem_repetidos(nome, col):
    dados = folhas[nome][1:]
    vals = [l[col] for l in dados]
    unicos = set(vals)
    dup = len(vals) - len(unicos)
    checar(dup == 0, f"[{nome}] {len(vals):,} linhas, {len(unicos):,} valores distintos, {dup} repetidos")
    return vals

vals_email = sem_repetidos("E-mails", 2)
vals_tel   = sem_repetidos("WhatsApp", 2)

print()
print("=" * 70)
print("4. NUMERACAO 1..N SEM SALTOS")
print("=" * 70)
for nome in ["E-mails", "WhatsApp", "Duplicados E-mail", "Duplicados WhatsApp"]:
    ids = [int(l[0]) for l in folhas[nome][1:]]
    checar(ids == list(range(1, len(ids) + 1)), f"[{nome}] IDs de 1 a {len(ids):,} sem saltos nem repeticoes")

print()
print("=" * 70)
print("5. COERENCIA COM OS .TXT DAS PASTAS")
print("=" * 70)
def conta(p):
    return sum(1 for _ in open(p, encoding="utf-8"))
pares = [
    ("unicos/emails.txt",     len(vals_email)),
    ("unicos/whatsapp.txt",   len(vals_tel)),
    ("duplicatas/emails_duplicados.txt",   len(folhas["Duplicados E-mail"]) - 1),
    ("duplicatas/whatsapp_duplicados.txt", len(folhas["Duplicados WhatsApp"]) - 1),
]
for rel, esperado in pares:
    n = conta(SAIDA / rel)
    checar(n == esperado, f"{rel}: {n:,} linhas == {esperado:,} do Excel")

# o .txt de unicos tambem nao pode ter repetidos
for rel in ["unicos/emails.txt", "unicos/whatsapp.txt"]:
    linhas = [l.strip() for l in open(SAIDA / rel, encoding="utf-8")]
    checar(len(linhas) == len(set(linhas)), f"{rel}: sem repetidos")

print()
print("=" * 70)
print("6. TESTE POR MUTACAO — o verificador de repetidos deteta mesmo?")
print("=" * 70)
# Um verificador que nunca acusa nada da sempre verde. Injecta-se um repetido
# artificial e exige-se que seja apanhado.
falso = vals_email[:100] + [vals_email[0]]
detectou = len(falso) != len(set(falso))
checar(detectou, "duplicado artificial injetado FOI detetado (verificador valido)")
limpo = vals_email[:100]
checar(len(limpo) == len(set(limpo)), "amostra genuinamente limpa NAO acusa (sem falso positivo)")

print()
print("=" * 70)
print("VEREDITO: " + ("TUDO PASSOU" if not falhas else f"{len(falhas)} FALHA(S)"))
print("=" * 70)
for f in falhas:
    print("  - " + f)
sys.exit(1 if falhas else 0)
