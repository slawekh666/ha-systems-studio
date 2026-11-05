# Stage 07A.2-B.2 — MPPT input readings ↔ physical DC ports

## Scope and physical meaning

PV1–PV12 readings are now optionally mapped to explicit, stable DC port IDs on a hybrid inverter. A mapped MPPT reading is **power flowing into the inverter**, not power supplied to the battery circuit. This step adds read-only observation, validation and a safety guard. It does **not** yet implement the DC/DC converter, battery coupling, efficiency/loss accounting, AC/DC transfer or EPS/islanding.

An observed PV2 reading of 380 V × 8 A is 3.04 kW at that input. If a DC battery separately consumes 1.5 kW, **do not** deduct one from the other or claim the remaining 1.54 kW on AC until the internal conversion path and its loss model are available. The existing DC imbalance or insufficient-data state must remain visible.

## Configuration contract

- Inverter normalization optionally retains `inverter.hybrid` with `schema_version: 1`, explicit `enabled: true`, and `pv_ports` slots indexed by PV input number (0–11).
- Legacy inverters without `inverter.hybrid` retain their original data shape and AC balance logic. Merely opening/saving them does not enable DC mappings or migrate measurement semantics.
- Each PV input can be bound to one existing physical port whose normalized medium is `dc`. New custom DC ports remain created through the existing manual ports editor; physical port IDs, labels, bus IDs, endpoint references and manual bends are not rewritten.
- The editor exposes an opt-in selector and a dropdown of available DC ports per PV input. Explicit invalid mappings remain visible for correction rather than silently moved to a different port.
- The read-only `HASSStudioInverter.dcTerminals()` returns observed terminals with `node_id,port_id,input_index,medium,measurement_point,power_kw,injection_kw,source,status,included_in_balance:false`. A positive PV measurement means **negative injection** at the inverter DC input (power enters the inverter). These observations are presented in the diagnostics but **never** added to AC or DC energy-balance participant totals.
- Port mapping validation diagnoses missing required mappings, duplicate input-to-port assignments, absent ports, non-DC ports, required missing readings, and mapped but electrically disconnected PV ports.
- If the legacy single inverter AC reading would be attached to a DC-only network, the engine emits `inverter_ac_reading_on_dc_network` and marks that contribution as missing. It cannot be used as a source or inferred to make the DC balance look correct, even through the old manual participant override. When an AC port is also attached the legacy AC contribution remains in the AC network unchanged.

## Regression / acceptance

The new `dev/test-pv-dc-port-bindings.js` validates mapping of PV2 380 V × 8 A to 3.04 kW, signed DC input direction, round-trip preservation, two separate terminal media, duplicate/missing/wrong-medium mappings, required-data validation, fail-closed DC-only legacy AC readout, override protection, unchanged AC production and no fabricated DC generation or flow, plus diagnostics rendering.

All existing energy balance, flow, inverter and topology suites and deterministic bundling must continue to pass CI. Browser acceptance in HA is still required: choose PV2 → DC `pv2`, verify the observation in diagnostics, and check that the 1.5 kW battery remains unresolved until a genuine conversion model is installed.

## Future work and stop gate

07A.2-C will model DC-coupled battery terminal/charge-discharge semantics; 07A.2-D will model AC/DC conversion and loss-constrained transfer. There must be a separate approved model before PV input power can be credited to an inverter's battery bus. Stage 07A.2-B.2 ends here. No HACS stable release before HA browser verification.
