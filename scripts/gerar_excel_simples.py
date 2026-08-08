#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MC-EXPORTAR-CONTATOS-SIMPLES — dois .xlsx de duas colunas.

  emails.xlsx    ID 1..250.360  +  e-mail
  whatsapp.xlsx  ID 1..27.759   +  numero

Le os .txt ja deduplicados que o MC-EMAILS/WHATSAPP produziu. Reaproveita o
escritor de .xlsx desse MC (`exportar_contatos.escrever_xlsx`) em vez de o
duplicar: um segundo escritor seria um segundo sitio para o mesmo defeito.

Sem dependencias externas — o .xlsx e um ZIP de XML, escrito com a biblioteca
padrao (o operador optou por nao instalar o openpyxl).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from exportar_contatos import escrever_xlsx          # noqa: E402

SAIDA = Path(r"C:\Users\Moltbot\Desktop\CONTATOS-ORGANIZADOS")

TRABALHOS = [
    ("emails.xlsx",   SAIDA / "unicos" / "emails.txt",   "E-mails",  "2 - E-mail"),
    ("whatsapp.xlsx", SAIDA / "unicos" / "whatsapp.txt", "WhatsApp", "2 - Numero"),
]


def linhas_de(caminho: Path):
    """Gerador: (id, valor). Streaming — 250 mil linhas nao vao todas para memoria."""
    with open(caminho, encoding="utf-8") as f:
        i = 0
        for linha in f:
            v = linha.strip()
            if not v:
                continue          # linha vazia nunca vira uma linha do Excel
            i += 1
            yield [i, v]


def main():
    for nome_ficheiro, origem, titulo_aba, rotulo_col in TRABALHOS:
        if not origem.exists():
            print(f"FALHA: origem ausente — {origem}")
            return 1
        destino = SAIDA / nome_ficheiro
        contagens = escrever_xlsx(
            destino,
            [(titulo_aba, ["1 - ID", rotulo_col], linhas_de(origem), {0})],
        )
        n = contagens[0][1]
        print(f"{nome_ficheiro:16} aba '{titulo_aba}'  {n:>7,} linhas de dados  "
              f"({destino.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
