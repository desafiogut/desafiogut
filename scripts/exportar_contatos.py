#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MC-EMAILS/WHATSAPP — exporta o resultado da deduplicacao para .xlsx e para as
pastas unicos/ e duplicatas/.

Escreve o .xlsx com zipfile + XML da biblioteca padrao. Um .xlsx e um ZIP de
XML; nao e preciso o openpyxl (que o operador optou por nao instalar). As
folhas sao escritas em STREAMING para o ZIP, por isso 250 mil linhas nao
obrigam a ter o XML todo em memoria.

Colunas numeradas no cabecalho ("1 - ID", "2 - Tipo", ...) e uma coluna ID que
numera cada contacto de 1 a N. Um contacto = uma linha. Sem repeticoes.
"""

import json, zipfile
from datetime import datetime
from pathlib import Path

SAIDA = Path(r"C:\Users\Moltbot\Desktop\CONTATOS-ORGANIZADOS")
XLSX  = SAIDA / "contatos_organizados.xlsx"

# ── XML helpers ──────────────────────────────────────────────────────────────
def esc(v) -> str:
    s = str(v)
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # Excel rejeita caracteres de controlo
    return "".join(c for c in s if c >= " " or c in "\t")

def col_letra(i: int) -> str:
    s = ""
    while i >= 0:
        s = chr(ord("A") + i % 26) + s
        i = i // 26 - 1
    return s

def celula(lin: int, col: int, valor, numerico=False) -> str:
    ref = f"{col_letra(col)}{lin}"
    if numerico:
        return f'<c r="{ref}"><v>{valor}</v></c>'
    return f'<c r="{ref}" t="inlineStr"><is><t xml:space="preserve">{esc(valor)}</t></is></c>'

def escrever_folha(zf, nome_interno, cabecalho, linhas_iter, cols_numericas=()):
    """linhas_iter: iteravel de listas. Streaming — nao materializa tudo."""
    with zf.open(nome_interno, "w") as fh:
        w = lambda s: fh.write(s.encode("utf-8"))
        w('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">')
        w(f'<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" '
          f'activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>')
        w("<sheetData>")
        w("<row r=\"1\">" + "".join(celula(1, i, c) for i, c in enumerate(cabecalho)) + "</row>")
        n = 1
        for linha in linhas_iter:
            n += 1
            w(f'<row r="{n}">' + "".join(
                celula(n, i, v, numerico=(i in cols_numericas)) for i, v in enumerate(linha)
            ) + "</row>")
        w("</sheetData></worksheet>")
    return n - 1

def escrever_xlsx(caminho, folhas):
    """folhas: lista de (titulo, cabecalho, iteravel_de_linhas, cols_numericas)."""
    with zipfile.ZipFile(caminho, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        n = len(folhas)
        tipos = "".join(
            f'<Override PartName="/xl/worksheets/sheet{i+1}.xml" '
            f'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            for i in range(n))
        zf.writestr("[Content_Types].xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/xl/workbook.xml" '
            'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            f'{tipos}</Types>')
        zf.writestr("_rels/.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
            'Target="xl/workbook.xml"/></Relationships>')
        abas = "".join(
            f'<sheet name="{esc(t)}" sheetId="{i+1}" r:id="rId{i+1}"/>'
            for i, (t, _, _, _) in enumerate(folhas))
        zf.writestr("xl/workbook.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            f'<sheets>{abas}</sheets></workbook>')
        rels = "".join(
            f'<Relationship Id="rId{i+1}" '
            f'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
            f'Target="worksheets/sheet{i+1}.xml"/>' for i in range(n))
        zf.writestr("xl/_rels/workbook.xml.rels",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            f'{rels}</Relationships>')
        contagens = []
        for i, (t, cab, it, numcols) in enumerate(folhas):
            contagens.append((t, escrever_folha(zf, f"xl/worksheets/sheet{i+1}.xml", cab, it, numcols)))
        return contagens


def main():
    with open(SAIDA / "_intermedio.json", encoding="utf-8") as f:
        d = json.load(f)

    emails = sorted(d["emails"].items())
    tels   = sorted(d["telefones"].items())

    def linhas_email(apenas_dup=False):
        i = 0
        for v, r in emails:
            if apenas_dup and r["ocorrencias"] < 2:
                continue
            i += 1
            yield [i, "email", v, r["estado"], r["ocorrencias"], "; ".join(r["fontes"])]

    def linhas_tel(apenas_dup=False):
        i = 0
        for v, r in tels:
            if apenas_dup and r["ocorrencias"] < 2:
                continue
            i += 1
            yield [i, "whatsapp", v, r.get("grupo", ""), r["estado"], r["ocorrencias"],
                   "; ".join(r["fontes"])]

    # ── contagens para o resumo ──
    est_e = {}
    for _, r in emails: est_e[r["estado"]] = est_e.get(r["estado"], 0) + 1
    est_t, grp_t = {}, {}
    for _, r in tels:
        est_t[r["estado"]] = est_t.get(r["estado"], 0) + 1
        grp_t[r.get("grupo", "")] = grp_t.get(r.get("grupo", ""), 0) + 1
    dup_e = sum(1 for _, r in emails if r["ocorrencias"] > 1)
    dup_t = sum(1 for _, r in tels if r["ocorrencias"] > 1)
    ocor_e = sum(r["ocorrencias"] for _, r in emails)
    ocor_t = sum(r["ocorrencias"] for _, r in tels)

    resumo = [
        ["Gerado em", datetime.now().strftime("%Y-%m-%d %H:%M"), ""],
        ["Pasta de origem", d["origem"], ""],
        ["", "", ""],
        ["E-MAILS", "", ""],
        ["  Ocorrencias lidas (com repeticoes)", ocor_e, ""],
        ["  Contactos UNICOS (uma linha cada)", len(emails), "aba 'E-mails'"],
        ["  Repeticoes eliminadas", ocor_e - len(emails), ""],
        ["  Que apareciam em mais de um sitio", dup_e, "aba 'Duplicados E-mail'"],
        ["  - estado validado", est_e.get("validado", 0), "passaram na validacao"],
        ["  - estado bruto", est_e.get("bruto", 0), "nunca validados"],
        ["  - estado rejeitado", est_e.get("rejeitado", 0), "NAO usar em envios"],
        ["", "", ""],
        ["WHATSAPP / TELEFONES", "", ""],
        ["  Ocorrencias lidas (com repeticoes)", ocor_t, ""],
        ["  Contactos UNICOS (uma linha cada)", len(tels), "aba 'WhatsApp'"],
        ["  Repeticoes eliminadas", ocor_t - len(tels), ""],
        ["  Que apareciam em mais de um sitio", dup_t, "aba 'Duplicados WhatsApp'"],
        ["  - formato +55 completo", grp_t.get("e164", 0), ""],
        ["  - sem DDD (9 digitos)", grp_t.get("sem_ddd", 0), "DDD nao inferido: seria inventar"],
        ["  - estado VERIFICADO", est_t.get("verificado", 0), "unicos com WhatsApp confirmado"],
        ["  - estado padronizado", est_t.get("padronizado", 0), "so normalizados (tipo=suspeito)"],
        ["  - estado bruto", est_t.get("bruto", 0), ""],
        ["  - estado rejeitado", est_t.get("rejeitado", 0), ""],
        ["", "", ""],
        ["ATENCAO", "", ""],
        ["  A pasta 'OS NUMEROS VALIDADOS' contem SUSPEITOS", "", "nome enganador"],
        ["  Os verificados estao em 'OS NUMEROS EM USO AGORA'", est_t.get("verificado", 0), "sao estes que servem"],
    ]

    folhas = [
        ("Resumo", ["1 - Indicador", "2 - Valor", "3 - Observacao"], iter(resumo), {1}),
        ("E-mails",
         ["1 - ID", "2 - Tipo", "3 - E-mail", "4 - Estado", "5 - Ocorrencias", "6 - Ficheiros de origem"],
         linhas_email(), {0, 4}),
        ("WhatsApp",
         ["1 - ID", "2 - Tipo", "3 - Numero", "4 - Grupo", "5 - Estado", "6 - Ocorrencias", "7 - Ficheiros de origem"],
         linhas_tel(), {0, 5}),
        ("Duplicados E-mail",
         ["1 - ID", "2 - Tipo", "3 - E-mail", "4 - Estado", "5 - Ocorrencias", "6 - Ficheiros de origem"],
         linhas_email(True), {0, 4}),
        ("Duplicados WhatsApp",
         ["1 - ID", "2 - Tipo", "3 - Numero", "4 - Grupo", "5 - Estado", "6 - Ocorrencias", "7 - Ficheiros de origem"],
         linhas_tel(True), {0, 5}),
    ]

    print("a escrever o .xlsx ...", flush=True)
    contagens = escrever_xlsx(XLSX, folhas)
    for t, n in contagens:
        print(f"  aba {t:22} {n:>7,} linhas de dados")
    print(f"\n{XLSX}  ({XLSX.stat().st_size:,} bytes)")

    # ── pastas unicos/ e duplicatas/ ──
    (SAIDA / "unicos").mkdir(exist_ok=True)
    (SAIDA / "duplicatas").mkdir(exist_ok=True)
    (SAIDA / "relatorios").mkdir(exist_ok=True)

    def escrever_txt(p, linhas):
        with open(p, "w", encoding="utf-8", newline="\r\n") as f:
            n = 0
            for l in linhas:
                f.write(l + "\n"); n += 1
        print(f"  {p.relative_to(SAIDA)}  ({n:,} linhas)")
        return n

    print("\npastas:")
    escrever_txt(SAIDA / "unicos" / "emails.txt", (v for v, _ in emails))
    escrever_txt(SAIDA / "unicos" / "whatsapp.txt", (v for v, _ in tels))
    escrever_txt(SAIDA / "unicos" / "emails_validados.txt",
                 (v for v, r in emails if r["estado"] == "validado"))
    escrever_txt(SAIDA / "unicos" / "emails_rejeitados_NAO_ENVIAR.txt",
                 (v for v, r in emails if r["estado"] == "rejeitado"))
    # Os unicos numeros com WhatsApp confirmado. Sao 198 — nao 27 mil.
    escrever_txt(SAIDA / "unicos" / "whatsapp_VERIFICADOS.txt",
                 (v for v, r in tels if r["estado"] == "verificado"))
    escrever_txt(SAIDA / "duplicatas" / "emails_duplicados.txt",
                 (f"{v}\t{r['ocorrencias']}" for v, r in emails if r["ocorrencias"] > 1))
    escrever_txt(SAIDA / "duplicatas" / "whatsapp_duplicados.txt",
                 (f"{v}\t{r['ocorrencias']}" for v, r in tels if r["ocorrencias"] > 1))


if __name__ == "__main__":
    main()
