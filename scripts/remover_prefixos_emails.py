#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MC-REMOVER-PREFIXOS — tira os "%" e "+" do inicio dos e-mails.

MEDIDO em emails.xlsx (250.360 linhas):
  IDs 1-230    comecam com "%"   (bloco contiguo)
  IDs 231-257  comecam com "+"   (bloco contiguo)
  Nenhum outro valor tem prefixo.
A descricao do enunciado bate exactamente — ao contrario do whatsapp.xlsx, onde
nao havia "%" nenhum.

DOIS CUIDADOS QUE O ENUNCIADO NAO PREVIA:

 1. 254 dos 257 prefixados sao DUPLICADOS CORROMPIDOS de enderecos que ja
    existem limpos na lista ("%airi...@x.com" e "airi...@x.com" sao o mesmo
    contacto). Tirar o prefixo sem mais nada criaria 254 repetidos — justamente
    o que estas listas existem para nao ter. Sao eliminados, ficando uma linha
    por endereco.

 2. Os 3 restantes comecam por "%20", que e um ESPACO codificado em URL. Tirar
    so o "%" deixaria "20xxx@..." — um endereco que nao existe. O "%20" e
    tratado como unidade.

Backup antes de sobrescrever. Os IDs sao renumerados 1..N no fim, porque
eliminar linhas abriria buracos na numeracao.
"""

import shutil, sys, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from exportar_contatos import escrever_xlsx          # noqa: E402

S    = Path(r"C:\Users\Moltbot\Desktop\CONTATOS-ORGANIZADOS")
ALVO = S / "emails.xlsx"
NS   = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


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


def limpar(v: str) -> str:
    v = v.strip()
    while True:
        if v[:3].lower() == "%20":       # espaco codificado — sai inteiro
            v = v[3:]
        elif v[:1] in ("%", "+"):
            v = v[1:]
        else:
            return v


def main():
    if not ALVO.exists():
        print(f"FALHA: {ALVO} nao existe")
        return 1

    cab, linhas = ler(ALVO)
    print(f"lido: {len(linhas):,} linhas | cabecalho {cab}")

    tinham_prefixo = sum(1 for l in linhas if l[1][:1] in ("%", "+"))
    limpos = [limpar(l[1]) for l in linhas]
    alterados = sum(1 for a, b in zip(linhas, limpos) if a[1] != b)

    # Guarda: nenhum endereco pode ficar invalido pela limpeza.
    maus = [v for v in limpos if "@" not in v or v.startswith("@") or not v.split("@")[0]]
    if maus:
        print(f"FALHA: {len(maus)} enderecos ficariam invalidos. Abortado, "
              f"ficheiro nao foi tocado.")
        return 1

    # Deduplicar preservando a ordem alfabetica final.
    vistos = set()
    finais = []
    for v in sorted(limpos):
        if v not in vistos:
            vistos.add(v)
            finais.append(v)
    removidos = len(limpos) - len(finais)

    assert len(finais) == len(set(finais)), "sobraram repetidos"

    backup = S / "emails.ORIGINAL-com-prefixos.xlsx"
    if not backup.exists():
        shutil.copy2(ALVO, backup)
        print(f"backup -> {backup.name}")
    else:
        print(f"backup ja existia -> {backup.name} (nao sobrescrito)")

    escrever_xlsx(ALVO, [("E-mails", cab,
                          ([i, v] for i, v in enumerate(finais, 1)), {0})])
    print(f"reescrito: {ALVO.name} ({ALVO.stat().st_size:,} bytes)")

    txt = S / "unicos" / "emails_sem_prefixos.txt"
    with open(txt, "w", encoding="utf-8", newline="\r\n") as f:
        for v in finais:
            f.write(v + "\n")
    print(f"texto    : {txt.relative_to(S)} ({len(finais):,} linhas)")

    print(f"\ntinham prefixo ('%' ou '+') : {tinham_prefixo:,}")
    print(f"valores alterados           : {alterados:,}")
    print(f"duplicados removidos        : {removidos:,}")
    print(f"linhas antes                : {len(linhas):,}")
    print(f"linhas depois               : {len(finais):,}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
