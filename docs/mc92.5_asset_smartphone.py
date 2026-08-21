#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""MC92.5 — baixa + recorta smartphone/desktop do OpenMoji (1F4F1, 1F5A5)."""
import os
import urllib.request

import numpy as np
from PIL import Image
from reportlab.graphics import renderPM
from svglib.svglib import svg2rlg

os.chdir(r'C:\Users\Moltbot\Desktop\temp_assets')

for nome, cod in (('iphone_smartphone', '1F4F1'), ('desktop_pc', '1F5A5')):
    url = f'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/svg/{cod}.svg'
    urllib.request.urlretrieve(url, f'{nome}.svg')
    d = svg2rlg(f'{nome}.svg')
    renderPM.drawToFile(d, f'{nome}.png', fmt='PNG', dpi=400)
    im = Image.open(f'{nome}.png').convert('RGBA')
    a = np.asarray(im).astype(int)
    lum = a[..., :3].mean(axis=2)
    sat = a.max(axis=2) - a.min(axis=2)
    alpha = np.where(np.logical_and(lum > 238, sat < 40), 0, 255).astype(np.uint8)
    out = Image.fromarray(np.dstack([a[..., 0].astype(np.uint8),
                                     a[..., 1].astype(np.uint8),
                                     a[..., 2].astype(np.uint8), alpha]))
    bbox = out.getchannel('A').getbbox()
    if bbox:
        x0, y0, x1, y1 = bbox
        out = out.crop((max(0, x0 - 8), max(0, y0 - 8),
                        min(out.width, x1 + 8), min(out.height, y1 + 8)))
    out.save(f'{nome}_cut.png')
    print(nome, '->', out.size)
