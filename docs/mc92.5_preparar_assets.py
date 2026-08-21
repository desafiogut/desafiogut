#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""MC92.5-S1 — recorte por croma (fundo claro -> alpha) dos assets.
Assets OpenMoji (temp_assets/*.png, fundo branco) + assets oficiais GUTO
(smartphone 06, notebook 05 — fundo branco 253,253,253).
"""
from PIL import Image, ImageFilter
import os
import numpy as np

TMP = r'C:\Users\Moltbot\Desktop\temp_assets'
PROJ = r'C:\Users\Moltbot\Desktop\GUTO\GUTO-Eletrodomesticos'


def croma_cut(im, limiar=235, suavizar=1.0):
    """Fundo claro -> alpha. Retorna RGBA com transparencia."""
    im = im.convert('RGBA')
    a = np.asarray(im).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # luminancia alta E baixa saturacao => fundo
    lum = (r + g + b) / 3
    sat = a.max(axis=2) - a.min(axis=2)
    fundo = (lum > limiar) & (sat < 40)
    alpha = np.where(fundo, 0, 255).astype(np.uint8)
    out = np.dstack([r.astype(np.uint8), g.astype(np.uint8),
                     b.astype(np.uint8), alpha])
    return Image.fromarray(out)


def aparar(im, pad=8):
    """Remove bordas transparentes; retorna recorte com pequeno pad."""
    bbox = im.getchannel('A').getbbox()
    if bbox:
        x0, y0, x1, y1 = bbox
        x0 = max(0, x0 - pad); y0 = max(0, y0 - pad)
        x1 = min(im.width, x1 + pad); y1 = min(im.height, y1 + pad)
        return im.crop((x0, y0, x1, y1))
    return im


os.makedirs(TMP, exist_ok=True)

# 1) assets OpenMoji (fundo branco puro)
for f in os.listdir(TMP):
    if f.endswith('.png') and not f.endswith('_cut.png'):
        p = os.path.join(TMP, f)
        im = Image.open(p)
        cut = aparar(croma_cut(im, limiar=238))
        out = os.path.join(TMP, f.replace('.png', '_cut.png'))
        cut.save(out)
        print(f'{f} -> {cut.size} {out}')

# 2) assets oficiais do projeto (fundo 253,253,253; 4096x4096)
for nome, src in (('smartphone_oficial', '06-guto-smartphone.png'),
                  ('notebook_oficial', '05-guto-notebook.png'),
                  ('tv_oficial', '01-guto-tv.png')):
    p = os.path.join(PROJ, src)
    im = Image.open(p).convert('RGB')
    # downscale p/ trabalhar
    im_s = im.resize((1024, 1024), Image.LANCZOS)
    cut = aparar(croma_cut(im_s, limiar=230, ), pad=10)
    out = os.path.join(TMP, nome + '_cut.png')
    cut.save(out)
    print(f'{nome}: {cut.size} -> {out}')

print('OK')
