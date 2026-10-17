# Power Grid / Sieć energetyczna — icon module

Status: implemented on `feature/svg-icon-library-20261016`; NOT merged into `main`, no release, no HACS version bump.

## Artwork and source

- `src/icons/power-grid-classic.svg` — former `08_siec_energetyczna.svg`.
- `src/icons/power-grid-modern-light.svg` — user-supplied modern tower for a light background.
- `src/icons/power-grid-modern-dark.svg` — the SAME modern graphic adapted to a dark background.
- `src/power-grid.js` — SVG device renderer, read-only HA readings and manually provided test values.
- `dev/power-grid-preview.html` — independent interactive preview; run from a local HTTP server.
- `dev/test-power-grid.js` — source-level Node smoke/regression checks.

The registry exposes **one** logical device `power_grid` with `classic` and `modern` variants; modern light/dark is the `theme` property (`auto`, `light`, `dark`). Switching the variant does not replace assigned HA entities. Artwork is embedded by `scripts/build.py`. All renderings use the same 118 x 164 proportional tower area regardless of variant. There are only short symbolic source wires; general diagram connections belong to the shared pipe/path editor.

## User-facing properties

- Panel placement: right by default, left or bottom with optional X/Y offsets.
- Neutral three-line table: L1, L2, L3. Voltage V and current A visible by default, independently toggleable.
- Individual phase rows may be hidden. No headline inside the panel.
- Optional sections, hidden initially: total active power (kW), import (kW), export (kW), grid frequency (Hz), power factor (cos φ), supply/grid status, voltage-alarm entity, phase-loss entity.
- Missing entity/unavailable reading yields **—**; never falls back to simulated data in HA mode.
- Explicit `manual` mode provides numeric preview/simulation of every measurement, including grid status and alarms; this is visual only and does **not** command electrical hardware.
- Voltage limits default to 207 V and 253 V, configurable for **display warnings only**. This is not a regulatory power-quality assessment or safety relay.
- Alarms change affected values to red with a small warning triangle, never change the complete panel's glow.
- Real total power is read from a separate HA entity; it is **not inferred** from voltage and current alone.
- Imported/exported power must come from correct HA entities and are not interchangeable with inverter or battery power.
- HA entity names must be configured in the inspector. Real readings should carry the appropriate unit (V, A, kW/W, Hz).

## Acceptance tests and remaining work

Source-level smoke tests have checked JS syntax, variant registration, HA vs manual isolation, alarm threshold logic, and geometry generation. A Node regression test is committed, but browser acceptance on a real HA dashboard remains pending.

Do not merge or release until visual acceptance and tests in the actual Home Assistant designer. No changes to existing hydraulic shapes were intended. The common connection editor's styling can be revisited later; **no dedicated electrical cable primitive was created**.
