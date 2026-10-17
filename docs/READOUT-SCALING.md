# Proportional readout scaling — developer notes

Branch: `feature/readout-scale-radiator-manifold-20261017` (not yet published as an HACS release).

## Design rule

The whole SVG readout group is transformed with ONE uniform scale value, preserving text shapes, glyph spacing, border widths and display content. **Never** stretch the panel border alone or apply a nonuniform `scaleX / scaleY` transform to captions.

The shared helper `HASSStudioReadoutScale` defines scales clamped between 0.4 and 1.5, geometric bounding boxes and ID-preserving group transforms.

## Devices

- **Power Grid** — independent panel scale, defaults to 70%; manual/HA phases and optional power metrics unaffected.
- **Radiator** — uses original `src/icons/radiator.svg`, with independent scaled display group, temperature and valve percentages from HA or explicit manual preview. Missing measurements display `—`.
- **Heating Manifold** — 1–40 circuits, adjustable pitch, per-loop screen and actuator visibility, common/individual actuator arrangement, common panel scale and optional per-loop override. Existing prototype artwork remains in `dev/manifold-prototype.js`, with its runtime renderer in `src/manifold.js`. In HA mode, configured circuit entities determine readings; no fake sample fallback.
- **Six modern boilers** — solid-fuel, pellet, heat pump, gas, electric and fireplace: new `readout_scale` property applies proportional scaling to their named SVG display/control-panel group. Their original artwork and existing whole-device scaling remain unchanged.
- **Modular tanks** — keep the existing independent sensor `display_scale` mechanism; it is already proportional.

For every new device, call `HASSStudioReadoutScale.factor` and transform the whole panel container. Determine selection geometry from the transformed panel bounds where the panel is external to the device (Power Grid).

## QA

CI executes `scripts/build.py`, `scripts/check.py`, `scripts/test_studio.js`, `dev/test-power-grid.js`, `dev/test-scaled-icons.js` and ensures the generated `dist/ha-systems-studio.js` matches its committed contents.

Pending acceptance: visual checks in the Home Assistant editor, screen readability at 40%, flowmeter spacing for 20/40 circuits, usability of editing many per-circuit entities, persistence across reloads, and HA hardware data binding.
