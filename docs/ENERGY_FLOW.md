# Electrical branch flow & whole-balance simulation — MR 4

All power computations are read-only. Manual/simulated readings never masquerade as HA sensor data.

## Setup and editing

1. Add supported equipment (inverters, buildings, energy storage, grid connections, distribution boards).
2. In each device's inspector, define named `energy_ports` (AC or DC), normalized 0–100% port position, and logical bus.
3. Draw an electric cable manually; add or delete bends as before. In the cable inspector assign **start and end** to compatible ports. Dragging an endpoint close to a compatible port can snap to it; no nearby port leaves it detached.
4. Select **Automatycznie z bilansu** in the cable power animation selector. A cable without valid logical endpoints remains in its old independent animation mode unless this opt-in setting is selected.
5. In the editor's **Bilans energii** section, enable balance and choose `HA`, `Hybrydowy` or `Symulacja`. Assign a source for each participant: native device, HA entity, manual kW, calculate one unknown, or exclude.

The system uses the signed MR3 power-balance engine and typed AC/DC graph. **W/kW only**, never cumulative kWh; `calculate` succeeds only for one unknown that can be solved. In HA-only scenario manual device readings are rejected; in full simulation mode only explicit manual overrides or one calculated participant are accepted. Hybrid mode permits both and labels provenance. A missing or inconsistent reading does not generate fake power.

## Animation

A cable receives a signed kW value only if its cut is a **bridge** in a balanced graph. The sign is oriented with the stored polyline start → end. Positive = forward; negative = reverse; zero = stopped. Mesh/cycle branch flows are underdetermined and **not animated**. Conflicting/insufficient/invalid/AC–DC-disconnected networks also remain stationary.

Existing dots, dashes and arrows, manual power animation and independent hydraulic flows remain supported. The SVG exposes `data-flow-source` and `data-flow-availability` for diagnostics. The cable inspector shows its resolved kW or reason for unavailability.

## Geometry and compatibility

No automatic routing. On moving a device, only its explicitly attached cable endpoints follow; intermediate bends stay at the saved coordinates. Crossings do not imply connectivity. Removing a port clears references rather than guessing a replacement. Existing unassigned electrical connections and prior hydraulic connections keep their original geometry and animation.

## Regression tests

`node dev/test-energy-flow.js` covers PV export/import, grid direction, zero power, multiple PV sources, two loads, charging/discharging storage, two unknown grids, contradictory/missing readings, bus cycles, AC/DC mismatch, crossing isolation, attached-node translation, endpoint detachment and save/reload. All prior test scripts are also run in GitLab CI.

Visual acceptance in Home Assistant still requires checking drag gestures, endpoint snapping, device/port inspector, SVG arrow direction when reversing, simulation labels and persisted configuration across page reload.
