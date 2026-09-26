#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""MC92.5-S2 — refina bboxes dos eletrodomesticos por segmentacao (diff do navy).
Metodo: amostra a cor do fundo (navy) num canto limpo; para cada regiao
candidata, pixels != navy (dist>limiar) formam mascara; componente conexo
dominante -> bbox. Imprime bboxes em coords originais (2752x1536).
"""
import numpy as np
from PIL import Image

SRC = r'C:\Users\Moltbot\Desktop\GUTO\BANNERES OFICAIS\banner 1.png'
im = Image.open(SRC).convert('RGB')
W, H = im.size
a = np.asarray(im).astype(int)
r, g, b = a[..., 0], a[..., 1], a[..., 2]

# cor media do fundo: amostra canto sup. esq. (x<260, y<260)
sx, sy = slice(0, 260), slice(0, 260)
fundo = np.array([r[sy, sx].mean(), g[sy, sx].mean(), b[sy, sx].mean()])
print('fundo navy medio:', fundo.round(1))

dist = np.sqrt((r - fundo[0]) ** 2 + (g - fundo[1]) ** 2 + (b - fundo[2]) ** 2)
mask = dist > 55

# regioes candidatas (x0, y0, x1, y1) do diagnostico (folga generosa)
regioes = {
    'lavadora': (1050, 780, 1800, 1100),
    'fogao': (1850, 760, 2460, 1100),
    'tv': (1000, 0, 1500, 650),
    'geladeira': (1550, 0, 2350, 650),
    'ar_condicionado': (1450, 450, 2100, 880),
    'texto_dir': (1900, 280, 2752, 800),   # referencia (NAO vai virar mascara)
    'guto': (1200, 100, 2000, 900),        # referencia (NAO vai virar mascara)
}

from collections import deque


def componente_dominante(binmask):
    """Maior componente 4-conexo da mascara booleana; retorna bbox (x0,y0,x1,y1)."""
    h, w = binmask.shape
    vis = np.zeros_like(binmask)
    melhor = None
    for y in range(h):
        for x in range(w):
            if binmask[y, x] and not vis[y, x]:
                q = deque([(x, y)])
                vis[y, x] = True
                pts = []
                while q:
                    cx, cy = q.popleft()
                    pts.append((cx, cy))
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and binmask[ny, nx] and not vis[ny, nx]:
                            vis[ny, nx] = True
                            q.append((nx, ny))
                if len(pts) > 300 and (melhor is None or len(pts) > melhor[0]):
                    melhor = (len(pts), pts)
    if not melhor:
        return None, 0
    pts = melhor[1]
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return (min(xs), min(ys), max(xs), max(ys)), len(pts)


for nome, (x0, y0, x1, y1) in regioes.items():
    m = mask[y0:y1, x0:x1]
    bbox, npts = componente_dominante(m)
    if bbox:
        bx0, by0, bx1, by1 = bbox
        print(f'{nome}: bbox_orig=({x0+bx0},{y0+by0})-({x0+bx1},{y0+by1}) '
              f'w={bx1-bx0} h={by1-by0} px={npts}')
    else:
        print(f'{nome}: sem componente (regiao vazia?)')
