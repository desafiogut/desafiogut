#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MC-REMOVER-PREFIXOS — deixa os numeros do whatsapp.xlsx so com digitos.

O enunciado pedia: remover "%" dos IDs 1-230 e "+" dos IDs 231-257. Medido no
ficheiro real (ver docs/MC-REMOVER-PREFIXOS-DIAGNOSTICO.txt):

  · "%" NAO EXISTE neste ficheiro — 0 ocorrencias. O "%" que o operador viu
    esta nos E-MAILS ("%2...@hotmail.com"), noutro ficheiro.
  · "+" nao esta nos IDs 231-257: esta em 22.270 numeros, IDs 1 a 22.270 em
    bloco contiguo. Sao todos os que ficaram em E.164 no MC anterior; a lista
    foi ordenada alfabeticamente e "+" ordena antes dos digitos.

Executar a letra tiraria o "+" de 27 numeros e deixaria 22.243 com ele — uma
coluna com o mesmo tipo de dado em dois formatos, sem criterio. Como o objetivo
declarado e "ficarem apenas com os digitos", remove-se o "+" de TODOS.

Faz backup antes de sobrescrever. Nao toca no .txt de origem do MC anterior
(cuja validacao exige que seja identico ao xlsx desse MC); a versao limpa em
texto vai para um ficheiro NOVO.
"""

import shutil, sys, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from exportar_contatos import escrever_xlsx          # noqa: E402

SAIDA = Path(r"C:\Users\Moltbot\Desktop\CONTATOS-ORGANIZADOS")
ALVO  = SAIDA / "whatsapp.xlsx"
NS    = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

# Caracteres a remover do INICIO do valor. "%" fica na lista de proposito:
# hoje nao existe no ficheiro, mas se um dia entrar, e para sair.
PREFIXOS = ("+", "%")


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
    while v[:1] in PREFIXOS:
        v = v[1:]
    return v


def main():
    if not ALVO.exists():
        print(f"FALHA: {ALVO} nao existe")
        return 1

    cab, linhas = ler(ALVO)
    print(f"lido: {len(linhas):,} linhas | cabecalho {cab}")

    antes_com_prefixo = sum(1 for l in linhas if l[1][:1] in PREFIXOS)
    limpas = [[l[0], limpar(l[1])] for l in linhas]
    alterados = sum(1 for a, b in zip(linhas, limpas) if a[1] != b[1])

    # Guardas: nada se perde, nada se funde.
    assert len(limpas) == len(linhas), "contagem de linhas mudou"
    assert all(b[1] for b in limpas), "algum valor ficou vazio"
    if len(set(b[1] for b in limpas)) != len(limpas):
        print("FALHA: remover o prefixo criou valores DUPLICADOS. Abortado, "
              "ficheiro nao foi tocado.")
        return 1

    backup = SAIDA / "whatsapp.ORIGINAL-com-mais.xlsx"
    if not backup.exists():
        shutil.copy2(ALVO, backup)
        print(f"backup -> {backup.name}")
    else:
        print(f"backup ja existia -> {backup.name} (nao sobrescrito)")

    escrever_xlsx(ALVO, [("WhatsApp", cab, iter(limpas), {0})])
    print(f"reescrito: {ALVO.name} ({ALVO.stat().st_size:,} bytes)")

    txt = SAIDA / "unicos" / "whatsapp_somente_digitos.txt"
    with open(txt, "w", encoding="utf-8", newline="\r\n") as f:
        for _, v in limpas:
            f.write(v + "\n")
    print(f"texto    : {txt.relative_to(SAIDA)} ({len(limpas):,} linhas)")

    print(f"\ntinham prefixo : {antes_com_prefixo:,}")
    print(f"alterados      : {alterados:,}")
    print(f"inalterados    : {len(linhas) - alterados:,}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
