# UTAC138 — verificação do PDF v6.1 (adaptado de UTAC133_verificar.py).
# Referência de palavras = o PRÓPRIO .md (só sem os marcadores '#'/'##'), não o corpo.txt do gerador:
# assim a verificação não partilha um eventual defeito do parser do gerador.
import sys, re, hashlib, pymupdf, cv2
sys.stdout.reconfigure(encoding="utf-8")
S = sys.argv[1]
MD = "C:/Users/Moltbot/Desktop/DESAFIOGUT/docs/REGULAMENTO-v6.1.md"
PDF = "C:/Users/Moltbot/Desktop/REGULAMENTO-DesafioGUT-v6.1.pdf"
QR = "C:/Users/Moltbot/Desktop/QRCODE-Regulamento-v6.1.png"
URL = "https://silly-stardust-ca71bc.netlify.app/regras-oficiais"
CM = 72 / 2.54
raw = open(PDF, 'rb').read()
d = pymupdf.open(PDF)
print("páginas:", d.page_count, "| bytes:", len(raw), "| sha256:", hashlib.sha256(raw).hexdigest())
print("metadata título:", d.metadata.get("title"))
fonts = set(); corpo_pdf = []; problemas = []
for i, p in enumerate(d):
    W, H = p.rect.width, p.rect.height
    for f in p.get_fonts(): fonts.add(f[3])
    linhas = []
    for b in p.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            t = "".join(s["text"] for s in l["spans"]).strip()
            if t: linhas.append((l["bbox"][1], l["bbox"][3], t, l["spans"][0]["size"], l["bbox"][0], l["bbox"][2]))
    linhas.sort()
    cab = [t for y0,y1,t,sz,x,x1 in linhas if y1 < 2.5*CM]
    rod = [t for y0,y1,t,sz,x,x1 in linhas if y0 > H - 2.5*CM]
    corpo = [l for l in linhas if l[1] >= 2.5*CM and l[0] <= H - 2.5*CM]
    corpo_pdf += [l[2] for l in corpo]
    print(f"p{i+1} cabeçalho={cab} rodapé={rod}")
    if rod != [f"Página {i+1} de {d.page_count}"]: problemas.append(f"p{i+1} rodapé {rod}")
    if not any("DesafioGUT — Regulamento Oficial" in c for c in cab): problemas.append(f"p{i+1} sem cabeçalho")
    if not any("Versão 6.1" in c for c in cab): problemas.append(f"p{i+1} cabeçalho sem 'Versão 6.1'")
    ult = corpo[-1][2] if corpo else ""
    if re.match(r"^(CAPÍTULO [IVXL]+ —|REGULAMENTO OFICIAL)", ult): problemas.append(f"p{i+1} TÍTULO ÓRFÃO: {ult}")
    xs = min(l[4] for l in corpo); xd = max(l[5] for l in corpo)
    tam = sorted({round(l[3], 1) for l in corpo})
    print(f"  última linha do corpo = {ult[:70]!r} | margem esq ≈ {xs/CM:.2f} cm | dir ≈ {(W-xd)/CM:.2f} cm"
          f" | topo corpo ≈ {corpo[0][0]/CM:.2f} cm | base ≈ {(H-corpo[-1][1])/CM:.2f} cm | tamanhos {tam}")
print("fontes:", fonts)
norm = lambda s: re.sub(r"\s+", " ", s).strip()
md = open(MD, encoding="utf8").read().replace("\r\n", "\n")
md_sem = re.sub(r"^#{1,2} ", "", md, flags=re.M)
md_words = norm(md_sem).split(" ")
pdf_words = norm(" ".join(corpo_pdf)).split(" ")
print("palavras md:", len(md_words), "| palavras pdf:", len(pdf_words), "| idênticas:", md_words == pdf_words)
if md_words != pdf_words:
    for k in range(max(len(md_words), len(pdf_words))):
        a = md_words[k] if k < len(md_words) else None; b = pdf_words[k] if k < len(pdf_words) else None
        if a != b: print("1ª divergência", k, md_words[k-3:k+4], pdf_words[k-3:k+4]); break
    problemas.append("palavras divergem")
# controlo positivo: o comparador TEM de apanhar uma troca de uma letra (senão «idênticas» não prova nada)
mut = list(pdf_words); j = mut.index("jogo"); mut[j] = "iogo"
print("controlo positivo (jogo→iogo no PDF simulado) detetado:", mut != md_words)
txt = " ".join(pdf_words)
print("'iogo' no PDF:", "iogo" in txt, "| 'jogo de azar' no PDF:", "jogo de azar" in txt,
      "| artigos no PDF:", len(re.findall(r"\bArt\. \d+(?:º|\.)(?= )", txt)),
      "| 'R$ 0,50':", "R$ 0,50" in txt)
for i in range(d.page_count): d[i].get_pixmap(dpi=60).save(f"{S}/p{i+1}.png")
img = cv2.imread(QR); val, pts, _ = cv2.QRCodeDetector().detectAndDecode(img)
print("QR:", img.shape, "| descodificado:", val, "| == URL:", val == URL)
if val != URL: problemas.append("QR divergente")
print("problemas:", problemas or "nenhum")
