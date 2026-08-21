#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""MC92.5 — mapa ASCII + densidade de prata do banner 1 (localizacao de objetos).
Metodo deterministico (pixel analysis) — o modelo de visao auxiliar esta
instavel nesta sessao (skill brand-asset-generation recomenda pixel analysis).
"""
from PIL import Image
import numpy as np

SRC = r'C:\Users\Moltbot\Desktop\GUTO\BANNERES OFICAIS\banner 1.png'
im = Image.open(SRC).convert('RGB')
W, H = im.size
gw, gh = 116, 65
im_s = im.resize((gw, gh), Image.LANCZOS)
a = np.asarray(im_s).astype(int)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
lum = a.mean(axis=2)
sat = a.max(axis=2) - a.min(axis=2)


def cat(ri, gi, bi):
    lum_px = (ri + gi + bi) / 3
    sat_px = max(ri, gi, bi) - min(ri, gi, bi)
    if ri > 195 and gi > 165 and bi < 195 and (ri - bi) > 35:
        return 'B'   # pele GUTO
    if ri > 200 and 60 < gi < 140 and bi < 95:
        return 'O'   # laranja
    if lum_px > 195 and sat_px < 45:
        return 'W'   # branco (texto)
    if lum_px > 140 and sat_px < 70:
        return 'S'   # prata
    if ri > 170 and gi > 110 and bi < 100:
        return 'G'   # dourado
    if lum_px < 45:
        return '#'   # navy profundo
    if lum_px < 90:
        return '+'   # navy medio
    return '.'


lines = []
for y in range(gh):
    lines.append(''.join(cat(r[y, x], g[y, x], b[y, x]) for x in range(gw)))

print('LEGENDA: B=pele GUTO O=laranja W=branco/texto S=prata G=dourado #=navy escuro +=navy medio .=outros')
print('-' * gw)
for ln in lines:
    print(ln)
print('-' * gw)

# densidade de prata por faixa vertical (8 faixas)
a_full = np.asarray(im.resize((W // 8, H // 8), Image.LANCZOS)).astype(int)
rf, gf, bf = a_full[..., 0], a_full[..., 1], a_full[..., 2]
lumf = a_full.mean(axis=2)
satf = a_full.max(axis=2) - a_full.min(axis=2)
silver = np.logical_and(lumf > 140, satf < 70)
h8, w8 = silver.shape
print('\nDensidade de PRATA por faixa vertical (x de 0 a 100%):')
for i in range(8):
    x0 = i * w8 // 8
    x1 = (i + 1) * w8 // 8
    d = silver[:, x0:x1].mean()
    print(f'  x[{i*12.5:4.0f}%-{(i+1)*12.5:4.0f}%] prata={d:.3f}')

# densidade de pele GUTO e laranja (localizar o mascote)
skin = np.logical_and(np.logical_and(rf > 195, gf > 165), np.logical_and(bf < 195, (rf - bf) > 35))
orange = np.logical_and(np.logical_and(rf > 200, gf > 60), np.logical_and(gf < 140, bf < 95))
print('\nDensidade de PELE por faixa vertical:')
for i in range(8):
    x0 = i * w8 // 8
    x1 = (i + 1) * w8 // 8
    print(f'  x[{i*12.5:4.0f}%-{(i+1)*12.5:4.0f}%] pele={skin[:, x0:x1].mean():.3f} laranja={orange[:, x0:x1].mean():.3f}')
