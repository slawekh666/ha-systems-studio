"""Narrow and auditable transform of the untouched upstream Warmwasser card."""
import re

ORIGINAL_TAG = 'warmwasser-schema-card'
NEW_TAG = 'ha-systems-studio'

UPSTREAM_MARKERS = (
    "customElements.define('warmwasser-schema-card'",
    "customElements.define('warmwasser-schema-card-editor'",
    "document.createElement('warmwasser-schema-card-editor')",
    "type: 'warmwasser-schema-card'",
    "cfg.type = this._config.type || 'custom:warmwasser-schema-card'",
    "ev.stopPropagation();",
)


def transform_upstream(source: str, version: str) -> str:
    """Return the exact transformed text formerly produced by scripts/build.py.

    Fail closed if expected upstream markers drift: never silently build a card
    with changed click/actuator semantics.
    """
    for expected in UPSTREAM_MARKERS:
        if expected not in source:
            raise SystemExit(f'Build stopped: expected upstream marker missing: {expected}')

    transformed = source.replace(ORIGINAL_TAG, NEW_TAG)
    transformed = transformed.replace('Warmwasser Schema Card', 'Home Assistant Systems Studio')

    # Preserve the original default read-only guard and exact placement.
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
    return transformed
