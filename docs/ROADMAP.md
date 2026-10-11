# Home Assistant Systems Studio — implementation roadmap

## Phase 0 — HACS-compatible Warmwasser fork (this bootstrap)
- [x] Preserve upstream history and original MIT license
- [x] Distinct card/editor names (`ha-systems-studio`)
- [x] HACS-compatible distribution file under `dist/`
- [x] Default read-only actuator actions during testing
- [ ] Publish to **public** GitHub mirror and install from HACS
- [ ] Verify with actual HA dashboard; no live actuators attached

## Phase 1 — component extraction, no visual changes
- [ ] Catalogue SVG routines and state dependencies in upstream `_render()`
- [ ] Snapshot test existing schemes and light/dark themes
- [ ] Extract reusable SVG shapes while preserving legacy layout mode
- [ ] Add PL translations without modifying legacy YAML keys

## Phase 2 — custom hydraulic editor
- [ ] Add opt-in `layout_mode: custom` (default stays existing automatic layout)
- [ ] Drag, snap, resize, rotate elements
- [ ] Define typed ports and orthogonal pipe routing
- [ ] Bind entities and preserve working gradients / flow animations
- [ ] Persist positions and connections in card configuration
- [ ] Save/edit a schema using visual editor, and validate connections

## Phase 3 — SVG library
- [ ] Boiler, tank, coil, pump, valve, manifold, solar, sensor variants
- [ ] Property panel, colors, labels, custom SVG import with sanitization
- [ ] Template library for common installations

## Later — energy/PV
- [ ] Power flow blocks: PV generation, home use, import, export, meters

## Safety / quality
- Testing on production HA is allowed on a dedicated test dashboard, without
  real control entities. `studio_readonly` stays true until intentionally disabled.
- Never claim pipe-flow telemetry if inferred only from a temperature reading.
- Unknown sensors render unknown, no fictitious real-time values.
- Check licenses of third-party SVG assets before import.
