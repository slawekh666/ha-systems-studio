# Stage 07A.2-B.2.1 — DC diagnostic clarity

## Scope
Presentation-only correction. No power-model, AC balance, storage, inverter, port, wiring or flow-engine changes.

- The diagnostics warning model normalizes `input_index` to a valid integer in 0…11 or `null`. Only an actual MPPT-indexed warning displays `MPPT N`. Generic cable warnings display no fake ordinal or `NaN`.
- A DC network is labeled `Brak modelu konwersji DC` / `DC conversion model missing` in diagnostics **only if** the unchanged solver reports `unbalanced`, there is known battery charging, no known source injection (within tolerance), and a validated DC cable in that same network terminates at an inverter. This indicates that the required conversion model has not yet been delivered; it is not proof of contradictory measured inputs.
- The numerical `state`, `reasons`, `residual_kw`, `totals`, per-device readings, flow reasons and connection animation remain exactly those of the original solver. A purely diagnostic `diagnostic_reason` is added to the view-model network/cable/warning.
- Genuine contradictory values with existing known sources retain `Pomiary sprzeczne`. Incomplete measurements without a computed residual remain `Brak danych`. Unconnected DC wires or errors on other network types are not reclassified.
- Source provenance (HA/TEST) and MPPT observations remain as in B.2.

## Verification
`dev/test-dc-diagnostic-clarity.js` uses the real graph and diagnostic renderer to check a 1.5 kW charging battery on a DC cable from an inverter, absence of `MPPT NaN`, a genuine MPPT-numbered warning, no reclassification of unrelated DC contradictions or missing input, and unchanged power solver JSON before/after rendering. All current CI suites, deterministic bundle and existing B.2 tests remain mandatory.

Home Assistant browser acceptance remains required after updating HACS: the battery cable should say `Brak modelu konwersji DC` with a read-only explanation; MPPT input observation should still show its configured 3.04 kW separately. The charging power is not magically supplied and numerical residual stays −1.5 kW.

Stop after 07A.2-B.2.1. No converter implementation, no feature activation for 07A.2-C/D.
