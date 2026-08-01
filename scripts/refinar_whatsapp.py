#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MC-REFINAR-WHATSAPP — lista final: 4 blocos, sem inconsistentes, sem duplicados.

⚠️ DESVIO DELIBERADO AO ENUNCIADO, com a medicao que o justifica.

O enunciado manda "adicionar DDD 92 aos do Bloco 2 e passa-los ao Bloco 1".
Antes de alterar 5.489 numeros, testou-se a premissa (ver
docs/MC-REFINAR-WHATSAPP-DIAGNOSTICO.txt):

    92 + <sem-DDD>  ja existe na lista:  5.489 de 5.489   = 100,00%
    11 + <sem-DDD>  ja existe na lista:      0 de 5.489   =   0,00%
    21, 31, 85      ja existe na lista:      0 de 5.489   =   0,00%

O operador esta CERTO — sao mesmo do DDD 92 (que domina 70% da base). Mas se
todos coincidem com numeros ja presentes, entao nao sao numeros orfaos a
recuperar: sao DUPLICADOS. O mesmo contacto foi apanhado pela extracao duas
vezes, uma completo e outra truncado.

Acrescentar-lhes o 92 e mante-los criaria 5.489 REPETIDOS no Bloco 1 — o oposto
da regra que o operador fixou no inicio desta serie. Por isso sao REMOVIDOS como
duplicados, e nao promovidos. Nenhum contacto se perde: cada um continua na
lista na sua forma completa 5592XXXXXXXXX.

REMAPEAMENTO DOS BLOCOS (o resto segue o enunciado):
    1 (celular c/ DDD) -> 1        2 (celular s/ DDD) -> removido (duplicado)
    3 (fixo c/ DDD)    -> 2        4 (fixo s/ DDD)    -> 3
    5 (inconsistente)  -> removido
Colunas "Pronto para envio" e "Verificado Twilio" removidas, como pedido.
"""

import re, sys, zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from xlsx_estilo import escrever_xlsx_estilizado, EST_CAT, EST_TITULO, EST_NORMAL  # noqa: E402

S       = Path(r"C:\Users\Moltbot\Desktop\CONTATOS-ORGANIZADOS")
ORIGEM  = S / "whatsapp_classificado.xlsx"
DESTINO = S / "whatsapp_refinado.xlsx"
NS      = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

# bloco antigo -> (bloco novo, rotulo, categoria, chave de cor)
REMAP = {
    1: (1, "Bloco 1 — CELULARES COM DDD", "Celular", "celular_completo"),
    3: (2, "Bloco 2 — FIXOS COM DDD",     "Fixo",    "fixo_completo"),
    4: (3, "Bloco 3 — FIXOS SEM DDD",     "Fixo",    "fixo_sem_ddd"),
}


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


def main():
    _, linhas = ler(ORIGEM)
    def bloco(l): return int(re.search(r"Bloco (\d)", l[2]).group(1))
    print(f"lido: {len(linhas):,} numeros")
    print("blocos de partida:", dict(sorted(Counter(bloco(l) for l in linhas).items())))

    completos = {l[1] for l in linhas if bloco(l) in (1, 3)}
    sem_ddd   = [l for l in linhas if bloco(l) == 2]

    # GUARDA: so se removem os sem-DDD que TÊM mesmo o equivalente completo.
    # Se algum nao tivesse, remove-lo seria perder um contacto.
    orfaos = [l for l in sem_ddd if "5592" + l[1] not in completos]
    print(f"\nsem-DDD: {len(sem_ddd):,} | sem equivalente completo (orfaos): {len(orfaos)}")
    if orfaos:
        print("  ⚠ ha orfaos: seriam PERDIDOS se removidos. Abortado.")
        print("    Rever a decisao antes de continuar.")
        return 1

    finais, removidos = [], Counter()
    for l in linhas:
        b = bloco(l)
        if b == 5:
            removidos["inconsistente"] += 1
            continue
        if b == 2:
            removidos["duplicado_sem_ddd"] += 1
            continue
        novo, rotulo, cat, cor = REMAP[b]
        finais.append({"num": l[1], "bloco": novo, "rotulo": rotulo,
                       "cat": cat, "ddd": l[4], "cor": cor})

    total = len(finais)
    print(f"\nremovidos: {dict(removidos)}  (total {sum(removidos.values()):,})")
    print(f"final    : {total:,}")
    assert total + sum(removidos.values()) == len(linhas), "as contas nao fecham"
    assert len({f['num'] for f in finais}) == total, "sobraram duplicados"

    cont = Counter(f["bloco"] for f in finais)
    print("\nblocos finais:")
    for b in sorted(REMAP.values(), key=lambda x: x[0]):
        q = cont.get(b[0], 0)
        print(f"  {b[1]:<32} {q:>7,}  {q/total*100:6.2f}%")

    CAB  = ["1 - ID", "2 - Numero", "3 - Bloco", "4 - Categoria", "5 - DDD"]
    LARG = [10, 18, 32, 15, 8]

    def linhas_numeros():
        for i, f in enumerate(finais, 1):          # ordem original preservada
            yield ([i, f["num"], f["rotulo"], f["cat"], f["ddd"]], EST_CAT[f["cor"]])

    resumo = [(["TOTAL DE NUMEROS", total, "100.00%", ""], EST_TITULO)]
    for b, rotulo, cat, cor in sorted(REMAP.values(), key=lambda x: x[0]):
        q = cont.get(b, 0)
        nota = {1: "prontos a enviar", 2: "em regra NAO tem WhatsApp",
                3: "sem casos nesta base"}[b]
        resumo.append(([rotulo, q, f"{q/total*100:.2f}%", nota], EST_CAT[cor]))
    resumo += [
        (["Bloco 4", 0, "0.00%", "sem casos"], EST_NORMAL),
        (["SOMA DOS BLOCOS", sum(cont.values()),
          f"{sum(cont.values())/total*100:.2f}%", "bate com o total"], EST_TITULO),
        (["", "", "", ""], EST_NORMAL),
        (["REMOVIDOS NESTE REFINAMENTO", sum(removidos.values()), "", ""], EST_TITULO),
        (["Inconsistentes (DDD inexistente)", removidos["inconsistente"], "", "antigo bloco 5"], EST_NORMAL),
        (["Duplicados sem DDD", removidos["duplicado_sem_ddd"], "",
          "ja presentes como 5592XXXXXXXXX"], EST_NORMAL),
        (["Partida", len(linhas), "", "27.737 - 5.505 = 22.232"], EST_NORMAL),
    ]

    folhas = [
        {"titulo": "Numeros", "cabecalho": CAB, "linhas": linhas_numeros(),
         "numericas": {0}, "larguras": LARG, "filtro": True},
        {"titulo": "Resumo",
         "cabecalho": ["1 - Bloco", "2 - Quantidade", "3 - Percentual", "4 - Observacao"],
         "linhas": iter(resumo), "numericas": {1}, "larguras": [36, 16, 14, 36]},
    ]

    print("\na escrever...")
    for t, n in escrever_xlsx_estilizado(DESTINO, folhas):
        print(f"  aba {t:12} {n:>7,} linhas")
    print(f"\n{DESTINO}  ({DESTINO.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
