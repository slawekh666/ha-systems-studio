#!/usr/bin/env python3
"""Build HACS-compatible Home Assistant Systems Studio from the REAL upstream card.

This is a narrow, auditable rename/guard transform, not a rewrite.
Keep warmwasser-schema-card.js untouched so upstream changes can be merged.
"""
from pathlib import Path
import re

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

    transformed, n = re.subn(
        r"const VERSION = '[^']+';",
        "const VERSION = '0.4.0-dev';",
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
    library = ROOT / 'src' / 'warmwasser-shapes.js'
    extra = ROOT / 'src' / 'studio-custom.js'
    for f in (library, extra):
        if not f.is_file():
            raise SystemExit(f'Missing {f.relative_to(ROOT)}')
    DEST.write_text(header + transformed + '\n\n' + library.read_text(encoding='utf-8') + '\n\n' + extra.read_text(encoding='utf-8'), encoding='utf-8')
    print(f'Generated {DEST.relative_to(ROOT)} ({DEST.stat().st_size} bytes)')


if __name__ == '__main__':
    build()
