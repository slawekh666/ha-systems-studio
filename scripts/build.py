#!/usr/bin/env python3
"""Build HACS-compatible Home Assistant Systems Studio from the REAL upstream card.

This is a narrow, auditable rename/guard transform, not a rewrite.
Keep warmwasser-schema-card.js untouched so upstream changes can be merged.
"""
from pathlib import Path
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'warmwasser-schema-card.js'
DEST = ROOT / 'dist' / 'ha-systems-studio.js'
ORIGINAL_TAG = 'warmwasser-schema-card'
NEW_TAG = 'ha-systems-studio'


def once(content: str, original: str, replacement: str, description: str) -> str:
    count = content.count(original)
    if count != 1:
        raise SystemExit(f'Build stopped: expected 1 {description}, found {count}. Inspect upstream changes.')
    return content.replace(original, replacement, 1)


def build() -> None:
    if not SOURCE.is_file():
        raise SystemExit('Missing source. Run setup.sh so the original project is cloned first.')
    source = SOURCE.read_text(encoding='utf-8')
    # Fail closed if an upstream change invalidates the assumptions used here.
    for expected in [
        "customElements.define('warmwasser-schema-card'",
        "customElements.define('warmwasser-schema-card-editor'",
        "document.createElement('warmwasser-schema-card-editor')",
        "type: 'warmwasser-schema-card'",
        "cfg.type = this._config.type || 'custom:warmwasser-schema-card'",
        "ev.stopPropagation();",
    ]:
        if expected not in source:
            raise SystemExit(f'Build stopped: expected upstream marker missing: {expected}')

    transformed = source.replace(ORIGINAL_TAG, NEW_TAG)
    transformed = transformed.replace('Warmwasser Schema Card', 'Home Assistant Systems Studio')

    # Prevent accidental pump/valve control on a real HA installation.
    # More-info dialogs are still available. An explicit false opts into actions.
    click_start = transformed.find('_click(ev) {')
    if click_start < 0:
        raise SystemExit('Build stopped: _click handler missing.')
    stop_at = transformed.find('ev.stopPropagation();', click_start)
    editor_at = transformed.find('class WarmwasserSchemaCardEditor', click_start)
    if stop_at < 0 or (editor_at >= 0 and stop_at > editor_at):
        raise SystemExit('Build stopped: _click action marker moved.')
    marker = 'ev.stopPropagation();'
    transformed = (
        transformed[:stop_at]
        + marker
        + "\nif (this._cfg?.studio_readonly !== false && el.dataset.act) return;"
        + transformed[stop_at + len(marker):]
    )

    # One authoritative version for the code and release process.
    version = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
    if not re.fullmatch(r'[0-9]+\.[0-9]+\.[0-9]+(?:-dev|-rc\.[0-9]+)?', version):
        raise SystemExit(f'Invalid VERSION: {version}')
    transformed, n = re.subn(
        r"const VERSION = '[^']+';",
        lambda match: f"const VERSION = '{version}';",
        transformed,
        count=1,
    )
    if n != 1:
        raise SystemExit('Build stopped: version marker missing.')

    if ORIGINAL_TAG in transformed:
        raise SystemExit('Build stopped: old component name is still present.')
    header = (
        '/* Home Assistant Systems Studio — adapted from Warmwasser Schema Card by mariofritzer.\n'
        ' * Original source: https://github.com/mariofritzer/warmwasser-schema-card\n'
        ' * MIT license: see LICENSE.\n'
        ' */\n'
    )
    DEST.parent.mkdir(parents=True, exist_ok=True)
    # Editable SVG files are the single artwork source for all modern icons.
    names = {
        'solidFuel': 'solid-fuel-stove',
        'pellet': 'pellet-stove',
        'heatPump': 'heat-pump-stove',
        'gasBoiler': 'gas-boiler',
        'electricBoiler': 'electric-boiler',
        'fireplace': 'fireplace',
    }
    assets = []
    for key, name in names.items():
        path = ROOT / 'src' / 'icons' / (name + '.svg')
        if not path.is_file():
            raise SystemExit(f'Missing SVG asset: {path.relative_to(ROOT)}')
        xml = path.read_text(encoding='utf-8')
        try:
            root = ET.fromstring(xml)
        except ET.ParseError as exc:
            raise SystemExit(f'Invalid SVG: {path.relative_to(ROOT)}: {exc}') from exc
        if root.tag != '{http://www.w3.org/2000/svg}svg':
            raise SystemExit(f'Unexpected SVG root: {path.relative_to(ROOT)}')
        matched = re.fullmatch(r'\s*(?:<\?xml[^>]*>\s*)?<svg\b[^>]*>([\s\S]*)</svg>\s*', xml)
        if not matched:
            raise SystemExit(f'Invalid SVG document: {path.relative_to(ROOT)}')
        if re.search(r'__[A-Z0-9_]+__', matched.group(1)):
            raise SystemExit(f'Unresolved SVG markers: {path.relative_to(ROOT)}')
        assets.append('  ' + key + ': ' + json.dumps(matched.group(1), ensure_ascii=False))
    embedded = 'const HASSStudioIconTemplates = Object.freeze({\n' + ',\n'.join(assets) + '\n});\n'

    source_names = (
        'ha-state.js', 'animation-state.js',
        'warmwasser-shapes.js', 'studio-tank.js', 'svg-template.js',
        'solid-fuel-stove.js', 'pellet-stove.js', 'heat-pump-stove.js',
        'gas-boiler.js', 'electric-boiler.js', 'fireplace.js',
        'device-registry.js', 'studio-custom.js',
    )
    paths = [ROOT / 'src' / name for name in source_names]
    for path in paths:
        if not path.is_file():
            raise SystemExit(f'Missing source: {path.relative_to(ROOT)}')
    parts = [header + transformed]
    for path in paths:
        if path.name == 'solid-fuel-stove.js':
            parts.append(embedded)
        parts.append(path.read_text(encoding='utf-8'))
    DEST.write_text('\n\n'.join(parts), encoding='utf-8')
    print(f'Generated {DEST.relative_to(ROOT)} ({DEST.stat().st_size} bytes)')


if __name__ == '__main__':
    build()
