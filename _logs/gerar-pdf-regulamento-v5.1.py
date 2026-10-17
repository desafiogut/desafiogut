#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Renderiza docs/REGULAMENTO-v5.md -> docs/REGULAMENTO-v5.1.pdf
NAO altera o .md. Nao commita. Script de trabalho (untracked em _logs/).

Uso:  python _logs/gerar-pdf-regulamento-v5.1.py
"""
import os
import re
import sys

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, Frame, PageTemplate,
                                Paragraph, Spacer, KeepTogether)

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FONTE = os.path.join(RAIZ, "docs", "REGULAMENTO-v5.md")
SAIDA = os.path.join(RAIZ, "docs", "REGULAMENTO-v5.1.pdf")

# ---------- fontes (TTF do Windows: acentos e travessão correctos) ----------
FONTS = {
    "Corpo":      r"C:\Windows\Fonts\arial.ttf",
    "Corpo-Bold": r"C:\Windows\Fonts\arialbd.ttf",
    "Corpo-It":   r"C:\Windows\Fonts\ariali.ttf",
    "Corpo-BIt":  r"C:\Windows\Fonts\arialbi.ttf",
}
for nome, caminho in FONTS.items():
    if not os.path.exists(caminho):
        sys.exit("FONTE EM FALTA: " + caminho)
    pdfmetrics.registerFont(TTFont(nome, caminho))
pdfmetrics.registerFontFamily("Corpo", normal="Corpo", bold="Corpo-Bold",
                              italic="Corpo-It", boldItalic="Corpo-BIt")

# ---------- estilos ----------
TITULO = ParagraphStyle("TITULO", fontName="Corpo-Bold", fontSize=17, leading=21,
                        alignment=TA_CENTER, spaceAfter=6, textColor=colors.HexColor("#111111"))
SUB = ParagraphStyle("SUB", fontName="Corpo", fontSize=11.5, leading=15,
                     alignment=TA_CENTER, spaceAfter=2)
VERSAO = ParagraphStyle("VERSAO", fontName="Corpo-Bold", fontSize=10.5, leading=14,
                        alignment=TA_CENTER, spaceBefore=4, spaceAfter=14)
FRENTE = ParagraphStyle("FRENTE", fontName="Corpo-It", fontSize=8.3, leading=11,
                        alignment=TA_JUSTIFY, textColor=colors.HexColor("#444444"),
                        spaceAfter=2)
CAP = ParagraphStyle("CAP", fontName="Corpo-Bold", fontSize=12.5, leading=16,
                     spaceBefore=16, spaceAfter=7, textColor=colors.HexColor("#111111"))
SEC = ParagraphStyle("SEC", fontName="Corpo-Bold", fontSize=10.8, leading=14,
                     spaceBefore=10, spaceAfter=5, textColor=colors.HexColor("#222222"))
CORPO = ParagraphStyle("CORPO", fontName="Corpo", fontSize=10.2, leading=15.2,
                       alignment=TA_JUSTIFY, spaceAfter=7.5)
BULLET = ParagraphStyle("BULLET", parent=CORPO, leftIndent=16, bulletIndent=4,
                        spaceAfter=4)
ASSIN = ParagraphStyle("ASSIN", fontName="Corpo-It", fontSize=9.5, leading=13,
                       alignment=TA_CENTER, spaceBefore=18, textColor=colors.HexColor("#333333"))


def esc(t):
    return (t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def fmt_frente(t):
    """Nota de cabeçalho do .md: **negrito** -> <b>, e remove crases de código (nunca
    imprimir marcação markdown no documento oficial)."""
    t = re.sub(r"`([^`]+)`", r"\1", t)
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", esc(t))


def com_lead_bold(txt):
    """‘Art. 17º — ...’ -> ‘<b>Art. 17º</b> — ...’ (só o rótulo a negrito)."""
    m = re.match(r"^(Art\.\s*\d+º)\s*—\s*(.*)$", txt)
    if m:
        return "<b>%s</b> — %s" % (esc(m.group(1)), esc(m.group(2)))
    return esc(txt)


def ler_blocos():
    with open(FONTE, encoding="utf-8") as f:
        linhas = f.read().replace("\r\n", "\n").split("\n")

    blocos, i = [], 0
    # --- front matter (linhas '> ') ---
    frente = []
    while i < len(linhas) and (linhas[i].startswith(">") or linhas[i].strip() == ""):
        if linhas[i].startswith(">"):
            frente.append(linhas[i].lstrip("> ").rstrip())
        i += 1
    # avança o separador '---' que fecha o cabeçalho
    while i < len(linhas) and linhas[i].strip() in ("", "---"):
        i += 1
    blocos.append(("frente", frente))

    for bruta in linhas[i:]:
        t = bruta.rstrip()
        if not t.strip():
            continue
        if t.strip() == "---":
            continue
        blocos.append(("linha", t))
    return blocos


def construir(blocos):
    flow = []
    titulo_feito = False
    for tipo, dado in blocos:
        if tipo == "frente":
            for l in dado:
                if l.strip():
                    flow.append(Paragraph(fmt_frente(l), FRENTE))
            flow.append(Spacer(1, 10))
            continue

        t = dado
        if t.startswith("CAPÍTULO"):
            flow.append(Paragraph(esc(t), CAP))
        elif t.startswith("Secção"):
            flow.append(Paragraph(esc(t), SEC))
        elif re.match(r"^Art\.\s*\d+", t):
            flow.append(Paragraph(com_lead_bold(t), CORPO))
        elif t.startswith("- "):
            flow.append(Paragraph(esc(t[2:]), BULLET, bulletText="•"))
        elif not titulo_feito and t.startswith("REGULAMENTO OFICIAL"):
            flow.append(Paragraph(esc(t), TITULO))
            titulo_feito = True
        elif t.startswith("Programa de Fidelidade"):
            flow.append(Paragraph(esc(t), SUB))
        elif t.startswith("Versão "):
            flow.append(Paragraph(esc(t), VERSAO))
        elif t.startswith("Documento oficial") or t.startswith("23.040.066"):
            flow.append(Paragraph(esc(t), ASSIN))
        else:
            flow.append(Paragraph(esc(t), CORPO))
    return flow


def rodape(canvas, doc):
    canvas.saveState()
    canvas.setFont("Corpo", 7.8)
    canvas.setFillColor(colors.HexColor("#666666"))
    canvas.drawString(2.5 * cm, 1.45 * cm,
                      "Regulamento Oficial do DesafioGUT — versão 5.1")
    canvas.drawRightString(A4[0] - 2.5 * cm, 1.45 * cm, "página %d" % doc.page)
    canvas.setStrokeColor(colors.HexColor("#cccccc"))
    canvas.setLineWidth(0.4)
    canvas.line(2.5 * cm, 1.75 * cm, A4[0] - 2.5 * cm, 1.75 * cm)
    canvas.restoreState()


def main():
    blocos = ler_blocos()
    flow = construir(blocos)

    doc = BaseDocTemplate(SAIDA, pagesize=A4,
                          leftMargin=2.5 * cm, rightMargin=2.5 * cm,
                          topMargin=2.2 * cm, bottomMargin=2.3 * cm,
                          title="Regulamento Oficial do DesafioGUT — v5.1",
                          author="Associação Recreativa dos Nordestinos no Amazonas",
                          subject="Regulamento Oficial — versão 5.1")
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="corpo")
    doc.addPageTemplates([PageTemplate(id="pagina", frames=[frame], onPage=rodape)])
    doc.build(flow)
    print("PDF escrito: %s (%d bytes)" % (SAIDA, os.path.getsize(SAIDA)))


if __name__ == "__main__":
    main()
