#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""MC92.4-S3 — Geracao das 3 novas versoes do banner via ComfyUI Cloud
(GeminiImage2Node / Nano Banana Pro, img2img a partir de banner 1.png).

Chave lida de ~/.claude.json SEM impressao (R4/R5). Logs em
docs/MC92.4-EXECUCAO.log. Saidas em novas_versoes/.
"""
import json, os, sys, time, urllib.request, urllib.error, urllib.parse, uuid, io

BASE = 'https://cloud.comfy.org'
OUT_DIR = r'C:\Users\Moltbot\Desktop\GUTO\BANNERES OFICAIS\novas_versoes'
SRC = r'C:\Users\Moltbot\Desktop\GUTO\BANNERES OFICAIS\banner 1.png'
LOG = r'C:\Users\Moltbot\Desktop\DESAFIOGUT\docs\MC92.4-EXECUCAO.log'

def log(msg):
    line = f'[{time.strftime("%H:%M:%S")}] {msg}'
    print(line)
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write(line + '\n')

def get_key():
    with open(os.path.expanduser('~/.claude.json'), 'r', encoding='utf-8') as f:
        cfg = json.load(f)
    return cfg['mcpServers']['comfyui-cloud']['headers']['X-API-Key']

KEY = get_key()
log(f'chave ok (comfyui-****, {len(KEY)} chars) — valor nunca exibido')

def api_json(path, payload=None, method=None, timeout=300):
    url = BASE + path
    data = None
    headers = {'X-API-Key': KEY}
    if payload is not None:
        data = json.dumps(payload).encode()
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())

def upload_image(path):
    """Upload multipart (image bytes, type=input). Retorna o nome (hash)."""
    boundary = '----mc924' + uuid.uuid4().hex
    with open(path, 'rb') as f:
        img = f.read()
    body = io.BytesIO()
    body.write(f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{os.path.basename(path)}"\r\nContent-Type: image/png\r\n\r\n'.encode())
    body.write(img)
    body.write(f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\ninput\r\n--{boundary}--\r\n'.encode())
    req = urllib.request.Request(
        BASE + '/api/upload/image',
        data=body.getvalue(),
        headers={'X-API-Key': KEY, 'Content-Type': f'multipart/form-data; boundary={boundary}'},
        method='POST')
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read().decode())

def download(filename, dest):
    """GET /api/view?filename=...&type=output com chave; segue 302 SEM chave."""
    req = urllib.request.Request(
        BASE + f'/api/view?filename={urllib.parse.quote(filename)}&type=output',
        headers={'X-API-Key': KEY})
    opener = urllib.request.build_opener(NoKeyRedirectHandler())
    with opener.open(req, timeout=300) as r:
        data = r.read()
    with open(dest, 'wb') as f:
        f.write(data)
    return len(data)

class NoKeyRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        new = urllib.request.Request(newurl, headers={})  # SEM X-API-Key
        return new

# ----------------------------------------------------------------------
VARIACOES = [
    {
        'prefix': 'mc924_v1_premios',
        'seed': 20260821,
        'premios': ('electronic prizes: stacks of cash money, gold coins, '
                    'smartphone, headphones and tech gadget icons, a balanced '
                    'mix of money and gadgets'),
    },
    {
        'prefix': 'mc924_v2_dinheiro',
        'seed': 20260822,
        'premios': ('prizes focused on MONEY: stacks of Brazilian-style cash '
                    'bills, gold coins, a money bag, treasure chest with gold, '
                    'no household appliances'),
    },
    {
        'prefix': 'mc924_v3_tecnologia',
        'seed': 20260823,
        'premios': ('prizes focused on TECH GADGETS: smartphone, wireless '
                    'headphones, smartwatch, tablet, bluetooth speaker, drone, '
                    'no household appliances'),
    },
]

PROMPT_BASE = (
    "Edit this banner image. Keep the EXACT same composition, background, "
    "colors, lighting, the character, and ALL text and lettering unchanged. "
    "Make ONLY these three changes: "
    "(1) Replace the WASHING MACHINE with a modern sporty MOTORCYCLE in the "
    "same position, same size and same lighting as the washing machine. "
    "(2) Replace the STOVE/COOKER with a modern premium SMARTPHONE (iPhone "
    "style, titanium frame, silver) in the same position, same size and same "
    "lighting as the stove. "
    "(3) Replace the household appliance prizes with {premios}. "
    "Style: glossy 3D cartoon render, dark navy blue background, golden "
    "confetti, silver and gold accents, consistent with the rest of the "
    "image. Do NOT modify the character, his medallion, or any text. "
    "NO new text, no watermark."
)

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    open(LOG, 'a', encoding='utf-8').close()

    # 1) preparar imagem base RGB (remover alpha p/ Gemini)
    from PIL import Image
    im = Image.open(SRC).convert('RGB')
    tmp = os.path.join(os.path.dirname(OUT_DIR), '_mc924_base_rgb.png')
    im.save(tmp)
    log(f'imagem base RGB pronta: {im.size}')

    # 2) upload
    up = upload_image(tmp)
    fname = up['name']
    log(f'upload ok -> {fname}')

    # 3) workflow: LoadImage(1) -> 3x Gemini(2,3,4) -> SaveImage(5,6,7)
    wf = {
        '1': {'class_type': 'LoadImage', 'inputs': {'image': fname}},
    }
    node_id = 2
    save_id = 5
    for v in VARIACOES:
        wf[str(node_id)] = {
            'class_type': 'GeminiImage2Node',
            'inputs': {
                'prompt': PROMPT_BASE.format(premios=v['premios']),
                'model': 'gemini-3-pro-image-preview',
                'seed': v['seed'],
                'aspect_ratio': '16:9',
                'resolution': '2K',
                'response_modalities': 'IMAGE',
                'images': ['1', 0],
            },
            '_meta': {'title': v['prefix']},
        }
        wf[str(save_id)] = {
            'class_type': 'SaveImage',
            'inputs': {'filename_prefix': v['prefix'], 'images': [str(node_id), 0]},
            '_meta': {'title': 'Save ' + v['prefix']},
        }
        node_id += 1
        save_id += 1

    # 4) submit (com retry/backoff p/ HTTP 429)
    payload = {
        'prompt': wf,
        'extra_data': {'api_key_comfy_org': KEY},
        'client_id': 'mc92.4-hermes',
    }
    resp = None
    for attempt in range(1, 9):
        try:
            resp = api_json('/api/prompt', payload=payload)
            break
        except urllib.error.HTTPError as e:
            log(f'submit tentativa {attempt} -> HTTP {e.code}')
            if e.code == 429:
                time.sleep(20 * attempt)
                continue
            raise
    if resp is None:
        log('ERRO: submit falhou apos retries (429 persistente)')
        sys.exit(1)
    pid = resp.get('prompt_id')
    log(f'submit ok -> prompt_id={pid}; node_errors={resp.get("node_errors")}')
    if not pid or resp.get('node_errors'):
        log('ERRO: prompt rejeitado. Abortando.')
        sys.exit(1)

    # 5) poll
    while True:
        st = api_json(f'/api/job/{pid}/status')
        status = st.get('status')
        log(f'status={status}')
        if status == 'completed':
            break
        if status in ('failed', 'cancelled', 'error'):
            det = api_json(f'/api/jobs/{pid}')
            log('FALHA: ' + json.dumps(det.get('execution_error', det))[:1500])
            sys.exit(2)
        time.sleep(20)

    # 6) outputs
    det = api_json(f'/api/jobs/{pid}')
    log('outputs keys: ' + ','.join(det.get('outputs', {}).keys()))
    saved = []
    for v in VARIACOES:
        # descobrir id do SaveImage pelo filename_prefix
        found = None
        for nid, out in det.get('outputs', {}).items():
            for img in out.get('images', []):
                if v['prefix'] in img.get('filename', ''):
                    found = img
        if not found:
            # fallback: primeiro output de cada node na ordem
            log(f'AVISO: filename {v["prefix"]} nao achado nos outputs')
            continue
        dest = os.path.join(OUT_DIR, {
            20260821: 'banner_1_v1_moto_iphone_premios.png',
            20260822: 'banner_1_v2_moto_iphone_dinheiro.png',
            20260823: 'banner_1_v3_moto_iphone_tecnologia.png',
        }[v['seed']])
        n = download(found['filename'], dest)
        from PIL import Image as I2
        sz = I2.open(dest).size
        log(f'baixado {dest} ({n} bytes, {sz})')
        saved.append(dest)

    log(f'FIM: {len(saved)} arquivos em {OUT_DIR}')
    print('RESULTADO:', json.dumps(saved))

if __name__ == '__main__':
    main()
