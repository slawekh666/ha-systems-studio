# Stage 07A.1-A — Building power snapshot contract

## Scope

Pure power arithmetic only: **no change** to the existing solver, energy-flow animations, SVG building readout, editor widgets, or topology. New API: `HASSStudioBuilding.powerSnapshot(input)`, an immutable, read-only result. Stage 07A.1-B will connect this contract to the topology-aware energy balance; 07A.1-C will connect it to user-facing display and inspector.

## Measurement types and compatibility

| Saved `building.measurement` | Measurement meaning | Accepted sign |
| --- | --- | --- |
| `individual` | Own building consumers, excluding attached descendants | >= 0 |
| `aggregate` | Gross building consumption, including attached consumers but **before** local generation | >= 0 |
| `net` (new) | Net signed active power at the building supply boundary | +import, −export |

The default remains `individual`. The existing `individual` and `aggregate` identifiers and their meanings are unchanged. The new `net` value survives normalization, **but is not yet offered in the inspector or consumed by the legacy energy solver**. Do not configure it manually in production until B/C complete.

## Contract fields

Input: `measurement`, `measured_kw`, `source`, `children_consumption_kw`, `children_generation_kw`, optional per-child aggregate sources and tolerance. The `measured_kw` field preserves the selected HA/TEST input (not necessarily HA); `source` distinguishes `measured` and `simulated`. Child aggregates are **known nonnegative AC magnitudes**. A charging storage is a consumer; a discharging storage is a source. Do not include PV DC generation again when the inverter's AC power is already net of DC charging.

Output fields: `measurement_scope`, `measured_kw`, `own_consumption_kw`, `children_consumption_kw`, `children_generation_kw`, `gross_consumption_kw`, `net_supply_kw`, `source`, `status`, `reasons`, and `field_sources`.

Equations:

- Individual: `gross = own + child_consumption`, `net = gross - child_generation`.
- Aggregate: `own = gross - child_consumption`, `net = gross - child_generation`.
- Net: `gross = net + child_generation`, `own = gross - child_consumption`.

All quantities are kW. `net_supply_kw` uses **+import / −export**, unlike the internal network injection convention. A `null` means unknown; callers must pass explicit numeric `0` only for a known zero/no-child case. Fields have individual provenance: a measured gross consumption can coexist with a calculated own load. `status` is `complete`, `partial`, `missing`, or `invalid`; physically contradictory negative own consumption generates an invalid result rather than an invented negative load. Small discrepancies within tolerance are clamped only in derived nonnegative values; original raw input remains unchanged.

## Architectural boundary

An upstream child inverter, storage, nested building, or shared AC branch **cannot automatically be classified** from its SVG location or a single device reading. Stage B must build correct child-side aggregates based on the topology and measurement boundary and must not double-count nested consumption or DC/AC transfers. A net meter is a signed *boundary* measurement; it cannot be substituted into the current unsigned building adapter or the existing `role=load` calculation without changes. Those are deliberately postponed.

## Verification

Run `node dev/test-building-power-contract.js` and the existing Python/Node CI. The tests cover the user's 10/7.2, 3/7.2, and 3+7−4 examples, export to grid, missing/zero readings, impossible meter scopes, idempotent legacy normalization, and immutable field-specific provenance. Version `0.4.29-dev`. No stage B/C changes until explicitly requested.
