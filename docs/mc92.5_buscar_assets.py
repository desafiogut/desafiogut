#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""MC92.5-S1 — busca de assets no Wikimedia Commons (API publica, sem chave).
Termos: moto, dinheiro, gadgets. Imprime candidatos com dimensoes, licenca e URL.
"""
import json
import urllib.parse
import urllib.request

API = 'https://commons.wikimedia.org/w/api.php'

TERMOS = [
    'motorcycle illustration png',
    'sport motorcycle transparent png',
    'money stack bills png',
    'gold coins pile png',
    'banknotes money png',
    'wireless headphones png',
    'smartwatch png',
    'tablet computer png',
]


def buscar(termo, limite=6):
    params = {
        'action': 'query', 'format': 'json',
        'generator': 'search', 'gsrsearch': termo,
        'gsrnamespace': '6', 'gsrlimit': str(limite),
        'prop': 'imageinfo',
        'iiprop': 'url|size|mime|extmetadata',
    }
    url = API + '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'User-Agent': 'MC92.5-DesafioGUT/1.0 (asset search)'})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode())
    pages = data.get('query', {}).get('pages', {})
    out = []
    for p in pages.values():
        ii = p.get('imageinfo', [{}])[0]
        meta = ii.get('extmetadata', {})
        lic = meta.get('LicenseShortName', {}).get('value', '?')
        out.append({
            'titulo': p.get('title', ''),
            'w': ii.get('width', 0), 'h': ii.get('height', 0),
            'mime': ii.get('mime', ''),
            'lic': lic, 'url': ii.get('url', ''),
        })
    return out


for t in TERMOS:
    print(f'\n===== "{t}" =====')
    try:
        for it in buscar(t):
            print(f"  {it['titulo'][:70]} | {it['w']}x{it['h']} | {it['mime']} | lic={it['lic'][:30]}")
    except Exception as e:
        print('  ERRO:', e)
