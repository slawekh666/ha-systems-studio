# Icon sources and runtime architecture

## Single source of truth

The editable gas-boiler artwork is `src/icons/gas-boiler.svg`. It is a complete SVG
document, with named groups (e.g. `frontIcon`, `displayFrame`, `tempGroup`) and
editable gradients, paths and transforms. Do not paste SVG into `src/gas-boiler.js`.

- `src/gas-boiler.js`: measured HA temperature, burner modulation, state validation,
  geometry and binding values. It must not duplicate paths, paint, or geometry markup.
- `src/svg-template.js`: shared SVG text/attribute binding and instance ID isolation.
  Reuse this module for future icons rather than duplicating regular expressions.
- `scripts/build.py`: validates XML, embeds SVG within the HACS JS bundle; the
  installed HA card does **not** fetch any SVG asset at runtime.
- `dev/icon-preview.html`: loads the same SVG file locally using Live Preview.
  SVG changes require refreshing the preview if Live Preview does not reload automatically.
- `dist/ha-systems-studio.js`: generated bundle, never hand-edit.

## Editing the graphic

Open `src/icons/gas-boiler.svg` in VS Code / Inkscape / Illustrator.
Groups are named by stable IDs. Move the large front flame with the
`frontIcon` transform; move the complete display with `displayFrame`.
Inside the display, edit `gasBarsGroup`, `displayFlameGroup` and
`tempGroup` independently. Individual elements can also have their own IDs.
Preserve IDs used by the renderer; they are the interface between artwork and
sensor data. The standalone SVG contains **sample visual values**; live values
are always provided by HA's entities, never computed from sample data.

Keep all SVG references (`url(#...)`, gradients, filters, etc.) internally
consistent. `HASSStudioSvg.namespaceIds` isolates them for multiple devices.

## Build and validation

From the project root:

```bash
python3 scripts/build.py
python3 scripts/check.py
node scripts/test_studio.js
git diff --check
```

Commit both edited sources and the generated `dist/ha-systems-studio.js`.
CI verifies a fresh build is byte-identical to the committed dist file.

## Further refactors

Migrate one device at a time without changing its sensor state behavior.
The next candidates are fireplace, pellet, heat pump and electric boiler.
Only extract reusable logic after confirming it is actually identical across
devices; do not couple distinct burner and electrical state semantics.

The complete Studio UI in `studio-custom.js` should eventually be split into
separate designer, state, canvas and controls modules, with one small entrypoint.
Do that as a separate change with regression and HA browser tests.
