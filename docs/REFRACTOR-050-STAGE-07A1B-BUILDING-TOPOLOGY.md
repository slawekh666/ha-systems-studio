# Stage 07A.1-B — building AC hierarchy and power balance

This stage integrates the immutable `HASSStudioBuilding.powerSnapshot()` contract from A with the topology-aware energy solver. It does not change the building SVG, inspector, default saved modes, or manually routed wire geometry.

## Measurement semantics

- `individual`: the building reading is its own consumption; known attached loads are added by the topology.
- `aggregate`: the building reading covers total gross consumption including attached loads; known children are subtracted **only when deriving the building's own load**, then each attached device is counted once in network totals.
- `net`: the building reading is signed import (+) / export (−) at the boundary; known AC child loads and discharges are separated before deriving own consumption. Both positive and negative HA readings are allowed only for this scope.

All original HA/TEST values are preserved as `power_model.measured_kw` and never overwritten. A building participant contributes only its own consumption to the electrical network, avoiding double counting. Its snapshot provides `own_consumption_kw`, `gross_consumption_kw`, `net_supply_kw`, child load/generation, provenance, status and reasons. If children exceed a gross measurement, the network reports an invalid measurement rather than a phantom negative house load. A child source/magazine is not classified as a consumer by its node role; its **signed AC power** determines the direction.

A descendant building is recursively resolved and counted once. Unknown child power remains unknown; it is not silently zero. Values from distinct buildings are not mixed. Existing branch animations still use `HASSStudioEnergyFlow`, and icon readouts deliberately remain unchanged pending stage C.

## Important limits

This stage covers **AC only**. A battery physically wired to a PV DC input is intentionally a separate network and will not be falsely connected through the inverter AC output. Real hybrid conversion, EPS and off-grid behavior require explicit converter/port models in a later stage. In particular, a 1.5 kW DC charge cannot simply be subtracted again from an inverter's already-net AC reading.

The existing `aggregate` and `individual` saved modes remain distinct as approved in A; the inspector is not simplified before C. Stage C will clarify the form, readouts and remove the daily-kWh label from the main scheme without destroying data.

## Tests and release

`dev/test-building-topology.js` validates gross and own scopes, mixed PV/grid/EV, impossible child loading, nested buildings, AC battery charging/discharging, net-meter signed readings, zero input, and provenance. Existing regressions and deterministic dist checks must pass. Release remains development-only: `0.4.30-dev`. Stop before C.
