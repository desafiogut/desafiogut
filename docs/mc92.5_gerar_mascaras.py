#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""MC92.5-S2 — gera mascaras binarias das 5 regioes de eletrodomesticos.
Metodo: diff do navy (dist>60; TV usa tela escura lum<22), subtrai cores do
GUTO (pele/laranja) e texto (branco), mantem componentes >=200px (exclui
confete). Salva mascaras individuais + combinada + recorte de teste.
"""
import os
from collections import deque

import numpy as np
from PIL import Image

SRC = r'C:\Users\Moltbot\Desktop\GUTO\BANNERES OFICAIS\banner 1.png'
OUTM = r'C:\Users\Moltbot\Desktop\temp_assets'
im = Image.open(SRC).convert('RGB')
W, H = im.size
a = np.asarray(im).astype(int)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
lum = a.mean(axis=2)
sat = a.max(axis=2) - a.min(axis=2)

fundo = np.array([r[:260, :260].mean(), g[:260, :260].mean(), b[:260, :260].mean()])
dist = np.sqrt((r - fundo[0]) ** 2 + (g - fundo[1]) ** 2 + (b - fundo[2]) ** 2)

guto_skin = np.logical_and(np.logical_and(r > 195, g > 165),
                           np.logical_and(b < 195, (r - b) > 35))
guto_laranja = np.logical_and(np.logical_and(r > 200, g > 60),
                              np.logical_and(g < 140, b < 95))
texto_branco = np.logical_and(lum > 195, sat < 45)
nao_mascarar = np.logical_or(np.logical_or(guto_skin, guto_laranja), texto_branco)


def maior_componente(binmask, min_px=200):
    h, w = binmask.shape
    vis = np.zeros_like(binmask)
    out = np.zeros_like(binmask)
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
                if len(pts) >= min_px:
                    for px, py in pts:
                        out[py, px] = True
    return out


# regioes finais (folga moderada, ja considerando sobreposicoes)
regioes = {
    'lavadora': (1120, 740, 1700, 1130),
    'fogao': (2150, 700, 2520, 1130),
    'tv': (1040, 0, 1520, 640),
    'geladeira': (1500, 0, 2360, 660),
    'ar_condicionado': (1650, 400, 2160, 900),
}

mascaras = {}
for nome, (x0, y0, x1, y1) in regioes.items():
    m = dist[y0:y1, x0:x1] > 60
    if nome == 'tv':
        # tela preta (mais escura que navy) + moldura clara
        m = np.logical_or(m, lum[y0:y1, x0:x1] < 22)
    m = np.logical_and(m, np.logical_not(nao_mascarar[y0:y1, x0:x1]))
    m = maior_componente(m, min_px=200)
    mascaras[nome] = (m, (x0, y0, x1, y1))
    img = Image.fromarray((m * 255).astype(np.uint8))
    img.save(os.path.join(OUTM, f'mascara_{nome}.png'))
    n = int(m.sum())
    print(f'{nome}: bbox_orig=({x0},{y0})-({x1},{y1}) px_mascarados={n}')

# combinada
comb = np.zeros((H, W), dtype=bool)
for nome, (m, (x0, y0, x1, y1)) in mascaras.items():
    comb[y0:y1, x0:x1] = np.logical_or(comb[y0:y1, x0:x1], m)
Image.fromarray((comb * 255).astype(np.uint8)).save(os.path.join(OUTM, 'mascara_todas.png'))
print(f'combinada: px={int(comb.sum())} ({comb.sum()/(W*H)*100:.2f}% da imagem)')

# recorte de teste (lavadora) p/ validar iopaint antes do banner completo
bx0, by0, bx1, by1 = 1120, 740, 1700, 1130
im.crop((bx0, by0, bx1, by1)).save(os.path.join(OUTM, 'teste_lavadora.png'))
Image.fromarray((comb[by0:by1, bx0:bx1] * 255).astype(np.uint8)).save(
    os.path.join(OUTM, 'teste_lavadora_mask.png'))
print('teste salvo: teste_lavadora.png + teste_lavadora_mask.png')
