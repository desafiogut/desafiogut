#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Escritor de .xlsx COM ESTILOS, sem dependencias externas.

Porque e um modulo novo e nao uma extensao do `exportar_contatos.escrever_xlsx`:
esse e usado por quatro MCs cujos validadores comparam a saida byte a byte com
o ficheiro de origem. Acrescentar-lhe estilos mudaria o que eles verificam.
Aqui o objectivo e outro — leitura humana — por isso vive a parte.

Suporta: cabecalho fixo, largura de coluna, filtro automatico, cor de fundo por
linha, negrito, e linhas de titulo de bloco.
"""

import zipfile
from pathlib import Path

# ── paleta ───────────────────────────────────────────────────────────────────
# Fundos claros o suficiente para o texto preto continuar legivel; o cabecalho
# usa o navy do projecto com texto branco.
NAVY = "0D1235"
CORES = {
    "celular_completo": "E3F6E8",   # verde claro
    "fixo_completo":    "FFF1DF",   # laranja claro
    "celular_sem_ddd":  "E4EEFB",   # azul claro
    "fixo_sem_ddd":     "F0E9FA",   # roxo claro
    "inconsistente":    "FCE4E4",   # vermelho claro
}
ORDEM_ESTILO = ["celular_completo", "fixo_completo", "celular_sem_ddd",
                "fixo_sem_ddd", "inconsistente"]

# indices em cellXfs:
#   0 normal · 1 cabecalho · 2 titulo de bloco · 3.. fundos por categoria
EST_NORMAL, EST_CAB, EST_TITULO = 0, 1, 2
EST_CAT = {c: 3 + i for i, c in enumerate(ORDEM_ESTILO)}


def _styles_xml() -> str:
    fills = "".join(
        f'<fill><patternFill patternType="solid"><fgColor rgb="FF{CORES[c]}"/>'
        f'<bgColor indexed="64"/></patternFill></fill>' for c in ORDEM_ESTILO)
    xfs = "".join(f'<xf numFmtId="0" fontId="0" fillId="{4+i}" borderId="0" '
                  f'applyFill="1"/>' for i in range(len(ORDEM_ESTILO)))
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        '<fonts count="3">'
        '<font><sz val="11"/><name val="Calibri"/></font>'
        f'<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>'
        f'<font><b/><sz val="12"/><color rgb="FF{NAVY}"/><name val="Calibri"/></font>'
        '</fonts>'
        f'<fills count="{4+len(ORDEM_ESTILO)}">'
        '<fill><patternFill patternType="none"/></fill>'
        '<fill><patternFill patternType="gray125"/></fill>'
        f'<fill><patternFill patternType="solid"><fgColor rgb="FF{NAVY}"/>'
        '<bgColor indexed="64"/></patternFill></fill>'
        '<fill><patternFill patternType="solid"><fgColor rgb="FFEFEFEF"/>'
        '<bgColor indexed="64"/></patternFill></fill>'
        f'{fills}</fills>'
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
        f'<cellXfs count="{3+len(ORDEM_ESTILO)}">'
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
        '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" '
        'applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>'
        '<xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'
        f'{xfs}</cellXfs>'
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
        '</styleSheet>')


def _esc(v) -> str:
    s = str(v).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return "".join(c for c in s if c >= " " or c == "\t")


def _col(i: int) -> str:
    s = ""
    while i >= 0:
        s = chr(ord("A") + i % 26) + s
        i = i // 26 - 1
    return s


def _cel(lin, col, valor, estilo=0, numerico=False) -> str:
    ref = f"{_col(col)}{lin}"
    s = f' s="{estilo}"' if estilo else ""
    if numerico:
        return f'<c r="{ref}"{s}><v>{valor}</v></c>'
    return f'<c r="{ref}"{s} t="inlineStr"><is><t xml:space="preserve">{_esc(valor)}</t></is></c>'


def escrever_xlsx_estilizado(caminho, folhas):
    """
    folhas: lista de dicionarios
        titulo    : str
        cabecalho : list[str]
        linhas    : iteravel de (valores, estilo)  -- estilo aplicado a linha toda
        numericas : set[int] indices de coluna numerica
        larguras  : list[int] largura por coluna
        filtro    : bool  (autofilter no cabecalho)
    """
    with zipfile.ZipFile(caminho, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        n = len(folhas)
        zf.writestr("[Content_Types].xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            + "".join(f'<Override PartName="/xl/worksheets/sheet{i+1}.xml" '
                      f'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
                      for i in range(n)) + '</Types>')
        zf.writestr("_rels/.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            '</Relationships>')
        zf.writestr("xl/workbook.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
            + "".join(f'<sheet name="{_esc(f["titulo"])}" sheetId="{i+1}" r:id="rId{i+1}"/>'
                      for i, f in enumerate(folhas)) + '</sheets></workbook>')
        zf.writestr("xl/_rels/workbook.xml.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            + "".join(f'<Relationship Id="rId{i+1}" '
                      f'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
                      f'Target="worksheets/sheet{i+1}.xml"/>' for i in range(n))
            + f'<Relationship Id="rId{n+1}" '
              f'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" '
              f'Target="styles.xml"/></Relationships>')
        zf.writestr("xl/styles.xml", _styles_xml())

        contagens = []
        for i, f in enumerate(folhas):
            contagens.append((f["titulo"], _folha(zf, i + 1, f)))
        return contagens


def _folha(zf, idx, f):
    cab = f["cabecalho"]
    numericas = f.get("numericas", set())
    with zf.open(f"xl/worksheets/sheet{idx}.xml", "w") as fh:
        w = lambda s: fh.write(s.encode("utf-8"))
        w('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">')
        w('<sheetViews><sheetView workbookViewId="0">'
          '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
          '</sheetView></sheetViews>')
        larg = f.get("larguras")
        if larg:
            w("<cols>" + "".join(
                f'<col min="{j+1}" max="{j+1}" width="{l}" customWidth="1"/>'
                for j, l in enumerate(larg)) + "</cols>")
        w('<sheetData>')
        w('<row r="1" ht="28" customHeight="1">'
          + "".join(_cel(1, j, c, EST_CAB) for j, c in enumerate(cab)) + "</row>")
        n = 1
        for valores, estilo in f["linhas"]:
            n += 1
            w(f'<row r="{n}">' + "".join(
                _cel(n, j, v, estilo, numerico=(j in numericas))
                for j, v in enumerate(valores)) + "</row>")
        w("</sheetData>")
        if f.get("filtro") and n > 1:
            w(f'<autoFilter ref="A1:{_col(len(cab)-1)}{n}"/>')
        w("</worksheet>")
    return n - 1
