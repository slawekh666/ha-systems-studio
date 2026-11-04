"""Stage 03: build contract tests, including failures that must not write dist."""
import tempfile
import unittest
from pathlib import Path

from scripts.build_support.bundle import HEADER, build
from scripts.build_support.icons import embed_icon_templates
from scripts.build_support.manifest import ICON_ASSETS, ICON_INSERT_BEFORE, JS_MODULES
from scripts.build_support.upstream import transform_upstream


# A minimal synthetic upstream matching the real transform's public markers.
# The real 635883-byte bundle is separately checked against tracked dist by CI.
UPSTREAM = """const VERSION = '0.4.1-dev';
customElements.define('warmwasser-schema-card', class {});
customElements.define('warmwasser-schema-card-editor', class {});
document.createElement('warmwasser-schema-card-editor');
type: 'warmwasser-schema-card'
cfg.type = this._config.type || 'custom:warmwasser-schema-card'
_click(ev) {
ev.stopPropagation();
}
class WarmwasserSchemaCardEditor {}
// Warmwasser Schema Card
"""


class UpstreamTransformTests(unittest.TestCase):
    def test_component_names_version_readonly_and_upstream_attribution(self):
        output = transform_upstream(UPSTREAM, '0.4.22-dev')
        self.assertIn("const VERSION = '0.4.22-dev';", output)
        self.assertIn("customElements.define('ha-systems-studio'", output)
        self.assertIn("customElements.define('ha-systems-studio-editor'", output)
        self.assertNotIn('warmwasser-schema-card', output)
        self.assertIn('Home Assistant Systems Studio', output)
        self.assertIn(
            'ev.stopPropagation();\n'
            'if (this._cfg?.studio_readonly !== false && el.dataset.act) return;',
            output
        )
        self.assertEqual(output.count('studio_readonly !== false && el.dataset.act'), 1)

    def test_fail_closed_when_upstream_marker_changes(self):
        with self.assertRaisesRegex(SystemExit, 'expected upstream marker missing'):
            transform_upstream(UPSTREAM.replace('ev.stopPropagation();', ''), '0.4.22-dev')

    def test_fail_closed_when_click_handler_disappears(self):
        with self.assertRaisesRegex(SystemExit, '_click handler missing'):
            transform_upstream(UPSTREAM.replace('_click(ev) {', '_click(event) {'), '0.4.22-dev')

    def test_fail_closed_when_version_format_or_marker_changes(self):
        with self.assertRaisesRegex(SystemExit, 'Invalid VERSION'):
            transform_upstream(UPSTREAM, '0.5.0-preview')
        with self.assertRaisesRegex(SystemExit, 'version marker missing'):
            transform_upstream(UPSTREAM.replace("const VERSION = '0.4.1-dev';", ''), '0.4.22-dev')


class SVGEmbeddingTests(unittest.TestCase):
    def test_order_and_byte_compatible_inner_svg(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            path = root / 'src' / 'icons' / 'demo.svg'
            path.parent.mkdir(parents=True)
            path.write_text('<svg xmlns="http://www.w3.org/2000/svg"><g id="demo"/></svg>',
                            encoding='utf-8')
            output = embed_icon_templates(root, {'demo': 'demo'})
            self.assertEqual(output,
                             'const HASSStudioIconTemplates = Object.freeze({\n'
                             '  demo: "<g id=\\"demo\\"/>"\n});\n')

    def test_rejects_missing_invalid_and_unresolved_icons(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with self.assertRaisesRegex(SystemExit, 'Missing SVG asset'):
                embed_icon_templates(root, {'demo': 'demo'})
            path = root / 'src' / 'icons' / 'demo.svg'
            path.parent.mkdir(parents=True)
            path.write_text('<svg', encoding='utf-8')
            with self.assertRaisesRegex(SystemExit, 'Invalid SVG'):
                embed_icon_templates(root, {'demo': 'demo'})
            path.write_text('<svg xmlns="http://www.w3.org/2000/svg">__MISSING__</svg>',
                            encoding='utf-8')
            with self.assertRaisesRegex(SystemExit, 'Unresolved SVG markers'):
                embed_icon_templates(root, {'demo': 'demo'})


class BundleAssemblyTests(unittest.TestCase):
    def make_source_tree(self, root):
        (root / 'VERSION').write_text('0.4.22-dev\n', encoding='utf-8')
        (root / 'warmwasser-schema-card.js').write_text(UPSTREAM, encoding='utf-8')
        for name in JS_MODULES:
            path = root / 'src' / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('// unique module: ' + name + '\n', encoding='utf-8')
        for name in ICON_ASSETS.values():
            path = root / 'src' / 'icons' / (name + '.svg')
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(
                '<svg xmlns="http://www.w3.org/2000/svg"><g id="' + name + '"/></svg>',
                encoding='utf-8'
            )

    def test_original_js_order_insertion_and_determinism(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_source_tree(root)
            output = build(root)
            self.assertEqual(output, root / 'dist' / 'ha-systems-studio.js')
            text = output.read_text(encoding='utf-8')
            expected = [HEADER + transform_upstream(UPSTREAM, '0.4.22-dev')]
            icons = embed_icon_templates(root)
            for name in JS_MODULES:
                if name == ICON_INSERT_BEFORE:
                    expected.append(icons)
                expected.append('// unique module: ' + name + '\n')
            self.assertEqual(text, '\n\n'.join(expected))
            self.assertEqual(text.count('const HASSStudioIconTemplates ='), 1)
            self.assertLess(text.index('// unique module: ha-state.js'),
                            text.index('// unique module: studio-custom.js'))
            self.assertLess(text.index('const HASSStudioIconTemplates ='),
                            text.index('// unique module: solid-fuel-stove.js'))
            self.assertEqual(build(root).read_bytes(), output.read_bytes())
            self.assertIn('Original source: https://github.com/mariofritzer/', text)
            self.assertIn('MIT license: see LICENSE.', text)

    def test_missing_js_does_not_replace_existing_dist(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_source_tree(root)
            output = root / 'dist' / 'ha-systems-studio.js'
            output.parent.mkdir(parents=True)
            output.write_bytes(b'protected old distribution')
            (root / 'src' / JS_MODULES[-1]).unlink()
            with self.assertRaisesRegex(SystemExit, 'Missing source:'):
                build(root)
            self.assertEqual(output.read_bytes(), b'protected old distribution')


if __name__ == '__main__':
    unittest.main()
