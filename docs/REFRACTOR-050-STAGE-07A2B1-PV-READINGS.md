# Stage 07A.2-B.1 — PV1–PV12 telemetry and source priority

Scope: PV readings and status only. No AC/DC power transfer, DC branch source or AC calculation from PV.

## Source contract
Per PV input the additive keys `required` (false by default) and `manual_enabled.{voltage,current,power}` persist through normalize and save. New factory example values are **inactive**. Typing a TEST value, including 0, activates it; clearing deactivates it. Existing layouts with actual numeric `manual` entries but missing enable flags retain the entries as active. This migration cannot infer whether historical saved numbers were once samples.

- Auto with fallback enabled: valid HA direct power → explicitly active TEST direct power → complete HA V × A → complete TEST V × A.
- Auto without fallback: HA direct power → HA V × A.
- HA only: HA direct power → HA V × A.
- TEST only: active TEST direct power → TEST V × A.
- Never derive power by mixing HA voltage and TEST current.
- Direct power overrides derived V × A; disagreement beyond max(100 W, 15%) is a nonblocking warning.
- 0 is valid. Unknown/bad units or impossible derived magnitudes are missing, not zero.
- `required:true` on an input with no usable power shows a red inspector explanation with missing parts. Optional disconnected MPPT input is not an error. Each result retains provenance.

## Acceptance
New regression tests cover the 3 modes, mixed-source exclusion, priority and contradictory power, new/legacy TEST flags, zero, units, 12 inputs, save/reload, required-only error and unchanged AC behavior. CI must pass, then browser acceptance in HA. PV2 380 V × 8 A with TEST power left empty should show 3040 W; entering TEST 100 W switches it to 100 W. DC power integration starts in B.2, not this step.
