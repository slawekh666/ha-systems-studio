# Refactor 0.5.0 — Stage 06: inverter HA/TEST data resolver

## Architectural choice

Extract **inverter-only** readout resolution to \`src/inverter-readings.js\`. The existing \`HASSStudioHA.powerInput\` remains the authority for signed AC power, W/kW conversion, and \`{kw,source}\` provenance. The inverter graphical data path and energy balance now share \`HASSStudioInverterReadings.power()\`. Avoid a premature global resolver for all device families.

Temperature, alarm and PV values are resolved in the same module with the exact previous rules for forced TEST, legacy manual, measured values, and opt-in fallback. HA zero is valid; unavailable or unknown never silently become simulated. PV direct power (W/kW) retains precedence over calculated V×A, including its legacy fallback behavior. Sign convention \`positive_power\` stays in each caller, unchanged.

**Observed legacy asymmetry:** AC power's fallback via \`HASSStudioHA.powerInput\` is not identical to auxiliary telemetry selection. The difference is documented and deliberately preserved. Changing that policy requires a separate decision; not part of this refactor.

## Changes and tests

New module loaded after \`device-parameters.js\` and before \`inverter.js\` in the deterministic builder, preview, and all Node VM tests. \`inverter.js\` is reduced to presentation and state derivation; \`energy-balance.js\` uses the common AC power adapter. Existing saved fields, UI controls, rendering SVG assets, and HA service safety remain untouched.

\`dev/test-inverter-readings.js\` executes actual readouts for HA zeros, unknown, invalid units, forced TEST, legacy manual, opt-in fallback, signed AC power, and PV calculation, plus sources. Previous regression suite (including the actual inverter inspector rendering hotfix) and deterministic dist comparison remain required.

Shared-main development version \`0.4.26-dev\`. After merge/user GitHub push, validate in real HA: existing inverter selection, AC/PV values, HA/TEST switching, extra panel rows, save/reopen and electricity balance. Do not start Stage 07 without instruction.
