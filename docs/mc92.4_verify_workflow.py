#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""MC92.4 — verificacao ad-hoc dos scripts de geracao (sem rede, sem creditos).

Checa: sintaxe, estrutura do workflow (7 nos), mapeamento seed->nome,
conteudo dos prompts, retry 429 e nao-exposicao da chave (R4/R5).
Uso: python docs/mc92.4_verify_workflow.py  (exit 0 = ok)
"""
import py_compile
import re
import sys
import textwrap
from pathlib import Path

BASE = Path(__file__).resolve().parent
FAILS = []


def check(name, cond, detail=''):
    if not cond:
        FAILS.append(f'{name}: {detail}')


def main():
    # 1) sintaxe
    for f in ('mc92.4_check_schema.py', 'mc92.4_gerar_banners.py'):
        try:
            py_compile.compile(str(BASE / f), doraise=True)
            print(f'[OK] py_compile {f}')
        except Exception as e:  # noqa: BLE001
            FAILS.append(f'py_compile {f}: {e}')

    # 2) carrega o modulo SEM executar main() (__name__ != __main__)
    src = (BASE / 'mc92.4_gerar_banners.py').read_text(encoding='utf-8')
    ns = {}
    exec(compile(src, 'mc92.4_gerar_banners.py', 'exec'), ns)
    variacoes, prompt_base = ns['VARIACOES'], ns['PROMPT_BASE']

    # 3) bloco real de construcao do workflow (linhas do arquivo, dedentado)
    i0, i1 = src.index('    wf = {'), src.index('    # 4) submit')
    ns2 = {
        'VARIACOES': variacoes,
        'PROMPT_BASE': prompt_base,
        'fname': '912cf1874894ab1f0e757b9aa33b5513566aa7146e150f51217b9e1f6b506519.png',
    }
    exec(compile(textwrap.dedent(src[i0:i1]), '<wf-block>', 'exec'), ns2)
    wf = ns2['wf']

    check('total nos', len(wf) == 7, f'{len(wf)} nos')
    check('LoadImage id 1', wf['1']['class_type'] == 'LoadImage'
          and wf['1']['inputs']['image'] == ns2['fname'])
    for i, g in ((2, wf['2']), (3, wf['3']), (4, wf['4'])):
        inp = g['inputs']
        check(f'gemini {i} class', g['class_type'] == 'GeminiImage2Node')
        for req in ('prompt', 'model', 'seed', 'aspect_ratio', 'resolution',
                    'response_modalities'):
            check(f'gemini {i} req {req}', req in inp)
        check(f'gemini {i} model', inp['model'] == 'gemini-3-pro-image-preview')
        check(f'gemini {i} ratio', inp['aspect_ratio'] == '16:9')
        check(f'gemini {i} res', inp['resolution'] == '2K')
        check(f'gemini {i} modality', inp['response_modalities'] == 'IMAGE')
        check(f'gemini {i} ref', inp['images'] == ['1', 0])
    seeds = [wf[str(i)]['inputs']['seed'] for i in (2, 3, 4)]
    check('seeds distintos', len(set(seeds)) == 3, str(seeds))
    for i, s in ((5, wf['5']), (6, wf['6']), (7, wf['7'])):
        inp = s['inputs']
        check(f'save {i} class', s['class_type'] == 'SaveImage')
        check(f'save {i} prefix', isinstance(inp['filename_prefix'], str)
              and inp['filename_prefix'].startswith('mc924_v'))
        check(f'save {i} fonte', inp['images'] == [str(i - 3), 0])

    # 4) mapeamento seed -> nome final (consistente com o dict de download)
    esperado = {20260821: 'banner_1_v1_moto_iphone_premios.png',
                20260822: 'banner_1_v2_moto_iphone_dinheiro.png',
                20260823: 'banner_1_v3_moto_iphone_tecnologia.png'}
    for v in variacoes:
        check(f'mapeamento seed {v["seed"]}', v['seed'] in esperado)
    check('3 variacoes', len(variacoes) == 3)

    # 5) prompt: 3 substituicoes + clausulas de preservacao; placeholder ok
    pb = prompt_base.lower()
    for kw in ('washing machine', 'motorcycle', 'stove', 'smartphone',
               'same position', 'all text and lettering unchanged',
               'medallion'):
        check(f'prompt contem "{kw}"', kw in pb)
    for v in variacoes:
        p = prompt_base.format(premios=v['premios']).lower()
        check(f'premios variados {v["prefix"]}', 'premios' not in p,
              'placeholder nao substituido')

    # 6) seguranca: chave nunca impressa crua
    for f in ('mc92.4_check_schema.py', 'mc92.4_gerar_banners.py'):
        s = (BASE / f).read_text(encoding='utf-8')
        for m in re.finditer(r'(?:print|log)\(([^)]*KEY[^)]*)\)', s):
            expr = m.group(1)
            if '[' not in expr and 'len(' not in expr:
                FAILS.append(f'{f}: possivel exposicao da chave: {expr.strip()}')
        print(f'[OK] scan seguranca {f}')

    # 7) retry 429 + extra_data partner node presentes
    check('retry 429', '429' in src)
    check('extra_data', 'extra_data' in src and 'api_key_comfy_org' in src)

    print()
    if FAILS:
        print('FALHAS:')
        for f in FAILS:
            print(' -', f)
        return 1
    print('VERIFICACAO AD-HOC OK')
    return 0


if __name__ == '__main__':
    sys.exit(main())
