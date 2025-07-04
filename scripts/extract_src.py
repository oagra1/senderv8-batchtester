import json, os, sys, re

MAPS = [
    'js/popup.js.map',
    'js/background.js.map',
    'js/load.js.map',
    'js/inject/content-script.js.map',
    'js/inject/inject.js.map',
    'js/inject/obfuscate.js.map'
]

out_root = 'src'

def sanitize_path(p):
    if p.startswith('webpack:///'):  # remove prefix
        p = p[len('webpack:///'):]
    if p.startswith('./'):
        p = p[2:]
    # remove query parameters
    p = p.split('?', 1)[0]
    return p

seen = set()
for m in MAPS:
    if not os.path.exists(m):
        continue
    with open(m, 'r', encoding='utf-8') as f:
        data = json.load(f)
    for src, content in zip(data.get('sources', []), data.get('sourcesContent', [])):
        path = sanitize_path(src)
        if not path.startswith('src/'):
            continue
        if path in seen:
            continue
        seen.add(path)
        dest = os.path.join(out_root, path[len('src/'):])
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, 'w', encoding='utf-8') as fw:
            fw.write(content)
print(f"Extracted {len(seen)} files to {out_root}")
