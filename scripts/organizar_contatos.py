#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MC-EMAILS/WHATSAPP — organiza a base de contactos.

Le tudo o que esta em Desktop\\BASE-CONTATOS, extrai e-mails e telefones,
normaliza, deduplica, classifica por ESTADO e escreve:

  Desktop\\CONTATOS-ORGANIZADOS\\
     contatos_organizados.xlsx
     unicos\\emails.txt · unicos\\whatsapp.txt
     duplicatas\\emails_duplicados.txt · duplicatas\\whatsapp_duplicados.txt
     relatorios\\

DECISOES (justificadas em docs/MC-EMAILS-WHATSAPP-DIAGNOSTICO.txt):

 1. Extraccao por REGEX sobre o texto bruto. Quatro dos CSV nao tem cabecalho
    (a 1a linha ja e um contacto) e dois ficheiros dentro de EMAILS\\ contem
    TELEFONES. Ler por coluna perderia registos e classificaria mal; o formato
    do valor e que decide o tipo, nao a pasta nem o nome do ficheiro.

 2. ESTADO por precedencia: rejeitado > validado > bruto. Um e-mail que apareca
    em REJEITADOS fica rejeitado mesmo que tambem exista numa lista bruta —
    caso contrario a fusao devolveria ao circuito 7.701 enderecos que ja
    reprovaram, com custo real de reputacao de envio.

 3. NAO se escreve dentro de BASE-CONTATOS: e uma exportacao byte-a-byte com
    manifesto SHA-256. A saida vai para uma pasta irma.

 4. Numeros de 9 digitos SEM DDD ficam num grupo proprio. Assumir um DDD seria
    inventar dados e podia produzir numeros reais de outras pessoas.

Sem dependencias externas: o .xlsx e escrito com zipfile + XML da biblioteca
padrao (o operador recusou instalar openpyxl).
"""

import csv, io, json, re, sys, unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ORIGEM = Path(r"C:\Users\Moltbot\Desktop\BASE-CONTATOS")
SAIDA  = Path(r"C:\Users\Moltbot\Desktop\CONTATOS-ORGANIZADOS")

# ── Classificacao de estado ──────────────────────────────────────────────────
#
# ⚠️ O NOME DA PASTA MENTE SOBRE OS NUMEROS. Medido:
#      WHATSAPP\OS NUMEROS VALIDADOS\   -> 27.704 numeros com tipo="suspeito",
#                                          apenas PADRONIZADOS, nunca verificados
#      WHATSAPP\OS NUMEROS EM USO AGORA\ ->    200 numeros passados pelo Twilio,
#                                          198 com whatsapp_candidate=sim
# Classificar pelo nome da pasta marcaria 27.704 suspeitos como "validado" e os
# 198 realmente verificados como "bruto" — exactamente ao contrario do que serve
# para decidir um envio. Por isso os telefones sao classificados pelo CONTEUDO
# (coluna whatsapp_candidate), nao pelo caminho.

def estado_email(rel: str) -> str:
    r = rel.upper()
    if "REJEITADOS" in r:
        return "rejeitado"
    if "VALIDADOS" in r and "LISTAGEM BRUTA" not in r:
        return "validado"
    return "bruto"

def estado_telefone_do_caminho(rel: str) -> str:
    r = rel.upper()
    if "EM USO AGORA" in r:
        return "verificado"          # refinado linha-a-linha em processar_ficheiro
    if "OS NUMEROS VALIDADOS" in r:
        return "padronizado"         # tipo="suspeito": normalizado, NAO verificado
    return "bruto"

# "verificado" ganha a "rejeitado": o lote twilio falhado (40 linhas, todas
# valid=nao, numero_formatado vazio) foi corrigido pelo ficheiro `corrigido`.
PREC_EMAIL = {"rejeitado": 3, "validado": 2, "bruto": 1}
PREC_TEL   = {"verificado": 4, "rejeitado": 3, "padronizado": 2, "bruto": 1}

# ── Extraccao ────────────────────────────────────────────────────────────────
# E-mail: deliberadamente conservador. Exige TLD alfabetico de 2+ e nao aceita
# ponto no inicio/fim da parte local.
RE_EMAIL = re.compile(
    r"[A-Za-z0-9%_+\-][A-Za-z0-9._%+\-]*@[A-Za-z0-9][A-Za-z0-9.\-]*\.[A-Za-z]{2,}"
)

# Telefone BR. Cobre +55DD9XXXXXXXX, DD9XXXXXXXX, DD XXXXXXXX e 9XXXXXXXX solto.
#
# ⚠️ TODOS os quantificadores sao LIMITADOS, de proposito. A primeira versao usava
# `\s*` logo a seguir a um grupo opcional. Como os e-mails sao substituidos por
# espacos antes desta passagem, o ficheiro transforma-se num bloco enorme de
# espaco em branco, e o motor passava a testar todos os comprimentos possiveis
# desse bloco em cada posicao — backtracking quadratico. Medido:
# `lista-master-alta-confianca.csv` levava 262,63 s para devolver ZERO resultados.
# Com os limites em baixo: 0,03 s. Um bloco sintetico de 2 MB de espacos: 0,19 s.
RE_TEL = re.compile(r"(?:\+?55[ ]?)?\(?\d{2}\)?[ .\-]?9?\d{4}[ .\-]?\d{4}\b|\b9\d{8}\b")

def so_digitos(s: str) -> str:
    return "".join(c for c in s if c.isdigit())

def normalizar_email(v: str):
    v = unicodedata.normalize("NFKC", v).strip().strip(".,;:<>()[]'\"").lower()
    if not RE_EMAIL.fullmatch(v):
        return None
    if ".." in v or v.split("@")[0].endswith("."):
        return None
    return v

def normalizar_telefone(v: str):
    """Devolve (valor_normalizado, grupo). grupo ∈ {e164, sem_ddd, invalido}."""
    d = so_digitos(v)
    if d.startswith("55") and len(d) in (12, 13):
        d = d[2:]
    if len(d) == 11 and d[2] == "9":          # DD + 9 + 8 digitos
        return "+55" + d, "e164"
    if len(d) == 10 and d[2] in "2345":       # DD + fixo 8 digitos
        return "+55" + d, "e164"
    if len(d) == 9 and d[0] == "9":           # movel sem DDD — nao inventar
        return d, "sem_ddd"
    if len(d) == 8:
        return d, "sem_ddd"
    return None, "invalido"

# ── Registo acumulado ────────────────────────────────────────────────────────
class Base:
    def __init__(self):
        # valor -> {"ocorrencias": n, "fontes": set, "estado": str, "grupo": str}
        self.emails = {}
        self.tels   = {}
        self.stats  = defaultdict(int)

    def add(self, alvo, valor, estado, fonte, grupo=""):
        prec = PREC_TEL if alvo is self.tels else PREC_EMAIL
        r = alvo.get(valor)
        if r is None:
            alvo[valor] = {"ocorrencias": 1, "fontes": {fonte}, "estado": estado, "grupo": grupo}
        else:
            r["ocorrencias"] += 1
            r["fontes"].add(fonte)
            if prec[estado] > prec[r["estado"]]:
                r["estado"] = estado

BASE = Base()

def texto(p: Path) -> str:
    with open(p, "r", encoding="utf-8-sig", errors="replace") as f:
        return f.read()

def processar_ficheiro(p: Path):
    rel = str(p.relative_to(ORIGEM))
    est = estado_email(rel)
    est_tel_base = estado_telefone_do_caminho(rel)
    conteudo = texto(p)

    # Se o ficheiro traz numeros JA padronizados, sao esses que valem (achado 2.4).
    # Guarda-se (valor, estado) porque em "EM USO AGORA" o estado e por LINHA:
    # whatsapp_candidate=sim -> verificado; caso contrario -> rejeitado.
    padronizados = []
    if p.suffix.lower() == ".csv":
        try:
            leitor = csv.DictReader(io.StringIO(conteudo))
            campos = [c for c in (leitor.fieldnames or []) if c]
            alvo = next((c for c in campos if c.strip().lower() in
                         ("numero_padronizado", "numero_formatado")), None)
            tem_cand = any(c.strip().lower() == "whatsapp_candidate" for c in campos)
            if alvo:
                for linha in leitor:
                    v = (linha.get(alvo) or "").strip()
                    if not v:
                        continue
                    if tem_cand:
                        cand = (linha.get("whatsapp_candidate") or "").strip().lower()
                        e = "verificado" if cand in ("sim", "yes", "true") else "rejeitado"
                    else:
                        e = est_tel_base
                    padronizados.append((v, e))
        except Exception:
            pass

    if padronizados:
        for v, e in padronizados:
            n, g = normalizar_telefone(v)
            if n:
                BASE.add(BASE.tels, n, e, rel, g)
                BASE.stats[f"tel_{g}"] += 1
                BASE.stats[f"estado_{e}"] += 1
        BASE.stats["ficheiros_por_coluna_padronizada"] += 1
        return

    # Caso geral: regex sobre o texto bruto — imune a cabecalho ausente.
    achou_email = 0
    for m in RE_EMAIL.finditer(conteudo):
        n = normalizar_email(m.group(0))
        if n:
            BASE.add(BASE.emails, n, est, rel)
            achou_email += 1

    # So procura telefones se o ficheiro nao for claramente de e-mails: um e-mail
    # como "joao1992@x.com" tem digitos que o regex de telefone apanharia.
    if achou_email == 0:
        sem_emails = conteudo
    else:
        sem_emails = RE_EMAIL.sub(" ", conteudo)
    for m in RE_TEL.finditer(sem_emails):
        n, g = normalizar_telefone(m.group(0))
        if n:
            BASE.add(BASE.tels, n, est_tel_base, rel, g)
            BASE.stats[f"tel_{g}"] += 1

    BASE.stats["emails_brutos_encontrados"] += achou_email


def main():
    import time
    ficheiros = sorted(p for p in ORIGEM.rglob("*") if p.is_file())
    print(f"ficheiros a processar: {len(ficheiros)}", flush=True)
    for p in ficheiros:
        t = time.perf_counter()
        processar_ficheiro(p)
        print(f"  ok  {time.perf_counter()-t:6.2f}s  {p.relative_to(ORIGEM)}", flush=True)

    print(f"\ne-mails distintos : {len(BASE.emails):,}")
    print(f"telefones distintos: {len(BASE.tels):,}")
    for k in sorted(BASE.stats):
        print(f"  {k}: {BASE.stats[k]:,}")

    # Guarda o estado intermedio para o passo de exportacao.
    SAIDA.mkdir(parents=True, exist_ok=True)
    inter = {
        "gerado_em": datetime.now(timezone.utc).isoformat(),
        "origem": str(ORIGEM),
        "emails": {k: {"ocorrencias": v["ocorrencias"], "estado": v["estado"],
                       "fontes": sorted(v["fontes"])} for k, v in BASE.emails.items()},
        "telefones": {k: {"ocorrencias": v["ocorrencias"], "estado": v["estado"],
                          "grupo": v["grupo"], "fontes": sorted(v["fontes"])}
                      for k, v in BASE.tels.items()},
    }
    destino = SAIDA / "_intermedio.json"
    with open(destino, "w", encoding="utf-8") as f:
        json.dump(inter, f, ensure_ascii=False)
    print(f"\nintermedio -> {destino}  ({destino.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
