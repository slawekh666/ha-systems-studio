#!/usr/bin/env python3
"""Basic HACS packaging and safety invariants; no HA server required."""
from pathlib import Path
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
js = ROOT / 'dist' / 'ha-systems-studio.js'
manifest = json.loads((ROOT / 'hacs.json').read_text(encoding='utf-8'))
assert manifest['name'] == 'Home Assistant Systems Studio'
assert manifest['filename'] == 'ha-systems-studio.js'
assert (ROOT / 'LICENSE').is_file(), 'Keep upstream MIT license!'
assert js.is_file(), 'Run python3 scripts/build.py'
s = js.read_text(encoding='utf-8')
for tag in ["customElements.define('ha-systems-studio'", "customElements.define('ha-systems-studio-editor'", "document.createElement('ha-systems-studio-editor')", "type: 'ha-systems-studio'"]:
    assert tag in s, f'Missing registered component: {tag}'
assert 'studio_readonly !== false && el.dataset.act' in s, 'Missing action safety guard'
assert 'custom:warmwasser-schema-card' not in s, 'Original card tag leaked into release'
try:
    subprocess.run(['node','--check',str(js)],check=True)
except FileNotFoundError:
    print('Node.js not installed: skipped syntax check (install Node.js 20+).')
print('OK: component names, HACS package, read-only default and JS syntax (if Node.js exists).')
