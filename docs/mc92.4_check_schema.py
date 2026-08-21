#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""MC92.4 - checagem de schema do GeminiImage2Node no ComfyUI Cloud.
Le a chave de ~/.claude.json SEM imprimi-la. Imprime apenas o schema do node.
"""
import json, os, sys, urllib.request

def get_key():
    with open(os.path.expanduser('~/.claude.json'), 'r', encoding='utf-8') as f:
        cfg = json.load(f)
    key = cfg['mcpServers']['comfyui-cloud']['headers']['X-API-Key']
    return key

KEY = get_key()
BASE = 'https://cloud.comfy.org'
print('chave:', KEY[:8] + '**** (' + str(len(KEY)) + ' chars)')

def api(path, timeout=120):
    req = urllib.request.Request(BASE + path, headers={'X-API-Key': KEY})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())

# 1) liveness
try:
    u = api('/api/user')
    print('liveness /api/user ->', json.dumps(u)[:120])
except Exception as e:
    print('ERRO liveness:', e)

# 2) object_info -> schema do GeminiImage2Node (e ImageBatch, LoadImage, SaveImage)
try:
    oi = api('/api/object_info')
    with open('/tmp/comfy_object_info.json', 'w', encoding='utf-8') as f:
        json.dump(oi, f)
    print('object_info salvo:', os.path.getsize('/tmp/comfy_object_info.json'), 'bytes; nodes:', len(oi))
    for node in ('GeminiImage2Node', 'ImageBatch', 'LoadImage', 'SaveImage'):
        if node in oi:
            info = oi[node]
            req = info.get('input', {}).get('required', {})
            opt = info.get('input', {}).get('optional', {})
            print(f'\n== {node} ==')
            print('  required:', list(req.keys()))
            print('  optional:', list(opt.keys()))
            for k, v in req.items():
                if isinstance(v, list) and v and isinstance(v[0], list):
                    print(f'    {k} options: {v[0][:12]}')
    # campos de LoadImage
    li = oi.get('LoadImage', {}).get('input', {}).get('required', {})
    print('\nLoadImage inputs:', li)
except Exception as e:
    print('ERRO object_info:', e)
