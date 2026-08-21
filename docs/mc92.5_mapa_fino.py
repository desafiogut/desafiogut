#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""MC92.5 — mapa ASCII FINO das 2 regioes suspeitas (lavadora e fogao/prata)."""
from PIL import Image
import numpy as np

SRC = r'C:\Users\Moltbot\Desktop\GUTO\BANNERES OFICAIS\banner 1.png'
im = Image.open(SRC).convert('RGB')
W, H = im.size

# regioes (x0,y0,x1,y1) em coords originais — do mapa grosso:
#  A) esquerda-inferior do GUTO (candidato lavadora): x 42-58%, y 55-65%
#  B) direita-inferior do GUTO (candidato fogao):     x 62-86%, y 42-62%
regioes = {
    'A_esq_inf': (int(W*0.40), int(H*0.52), int(W*0.62), int(H*0.70)),
    'B_dir_inf': (int(W*0.60), int(H*0.38), int(W*0.88), int(H*0.66)),
}


def mapa_fino(box, gw=72, gh=36):
    crop = im.crop(box)
    a = np.asarray(crop.resize((gw, gh), Image.LANCZOS)).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    out = []
    for y in range(gh):
        line = []
        for x in range(gw):
            ri, gi, bi = r[y, x], g[y, x], b[y, x]
            lum = (ri + gi + bi) / 3
            sat = max(ri, gi, bi) - min(ri, gi, bi)
            if ri > 195 and gi > 165 and bi < 195 and (ri - bi) > 35:
                ch = 'B'
            elif ri > 200 and 60 < gi < 140 and bi < 95:
                ch = 'O'
            elif lum > 190 and sat < 50:
                ch = 'W'
            elif lum > 135 and sat < 75:
                ch = 'S'
            elif ri > 170 and gi > 110 and bi < 100:
                ch = 'G'
            elif lum < 40:
                ch = '#'
            elif lum < 85:
                ch = '+'
            else:
                ch = '.'
            line.append(ch)
        out.append(''.join(line))
    return out


for nome, box in regioes.items():
    print(f'\n===== {nome} box={box} =====')
    for ln in mapa_fino(box):
        print(ln)
    # salvar crop p/ eventual checagem visual
    im.crop(box).save(f'/tmp/mc925_{nome}.png')
