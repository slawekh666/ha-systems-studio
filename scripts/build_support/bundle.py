"""Deterministic HACS bundle assembly from the historical source manifest."""
from pathlib import Path

from .icons import embed_icon_templates
from .manifest import ICON_INSERT_BEFORE, JS_MODULES
from .upstream import transform_upstream

ROOT = Path(__file__).resolve().parents[2]
SOURCE_NAME = 'warmwasser-schema-card.js'
DEST_NAME = 'ha-systems-studio.js'

# Preserve the original MIT/upstream attribution in the generated JS.
HEADER = (
    '/* Home Assistant Systems Studio — adapted from Warmwasser Schema Card by mariofritzer.\n'
    ' * Original source: https://github.com/mariofritzer/warmwasser-schema-card\n'
    ' * MIT license: see LICENSE.\n'
    ' */\n'
)


def build(root: Path = ROOT) -> Path:
    """Build with the established CLI output and stop on incomplete source."""
    source_file = root / SOURCE_NAME
    if not source_file.is_file():
        raise SystemExit('Missing source. Run setup.sh so the original project is cloned first.')
    source = source_file.read_text(encoding='utf-8')
    version = (root / 'VERSION').read_text(encoding='utf-8').strip()
    transformed = transform_upstream(source, version)

    # Validate assets and source files before writing any output.
    embedded = embed_icon_templates(root)
    source_paths = [root / 'src' / name for name in JS_MODULES]
    for path in source_paths:
        if not path.is_file():
            raise SystemExit(f'Missing source: {path.relative_to(root)}')

    parts = [HEADER + transformed]
    for path in source_paths:
        if path.name == ICON_INSERT_BEFORE:
            parts.append(embedded)
        parts.append(path.read_text(encoding='utf-8'))

    dest = root / 'dist' / DEST_NAME
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text('\n\n'.join(parts), encoding='utf-8')
    print(f'Generated {dest.relative_to(root)} ({dest.stat().st_size} bytes)')
    return dest
