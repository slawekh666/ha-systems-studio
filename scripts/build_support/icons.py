"""Validated SVG artwork embedding; byte-for-byte compatible with the old build."""
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

from .manifest import ICON_ASSETS


def embed_icon_templates(root: Path, assets=ICON_ASSETS) -> str:
    """Embed SVG inner markup in manifest order, preserving original spacing."""
    collected = []
    for key, name in assets.items():
        path = root / 'src' / 'icons' / (name + '.svg')
        if not path.is_file():
            raise SystemExit(f'Missing SVG asset: {path.relative_to(root)}')
        xml = path.read_text(encoding='utf-8')
        try:
            element = ET.fromstring(xml)
        except ET.ParseError as exc:
            raise SystemExit(f'Invalid SVG: {path.relative_to(root)}: {exc}') from exc
        if element.tag != '{http://www.w3.org/2000/svg}svg':
            raise SystemExit(f'Unexpected SVG root: {path.relative_to(root)}')
        matched = re.fullmatch(r'\s*(?:<\?xml[^>]*>\s*)?<svg\b[^>]*>([\s\S]*)</svg>\s*', xml)
        if not matched:
            raise SystemExit(f'Invalid SVG document: {path.relative_to(root)}')
        if re.search(r'__[A-Z0-9_]+__', matched.group(1)):
            raise SystemExit(f'Unresolved SVG markers: {path.relative_to(root)}')
        collected.append('  ' + key + ': ' + json.dumps(matched.group(1), ensure_ascii=False))
    return 'const HASSStudioIconTemplates = Object.freeze({\n' + ',\n'.join(collected) + '\n});\n'
