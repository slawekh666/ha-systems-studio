# Stage 07A.2-C — explicit DC battery coupling and read-only BMS constraints

**Status:** implementation candidate; automated regression and HA browser acceptance required before release.

## Contract
- An energy-storage node without explicit coupling remains `coupling:'legacy'`. On load, its previous AC or DC cable connections and meter sign retain their meaning. No automatic rewiring or conversion.
- Opting in by choosing `AC` or `DC` saves `energy_storage.coupling` and an explicit `energy_storage.coupling_port_id`. The editor offers existing ports matching the medium and keeps any invalid old port reference visible for correction. It never changes cable points or physical port types. Selecting a new coupling clears the previous port selection instead of silently reusing a mismatched port.
- In `HASSStudioEnergyBalance.resolve()`, opt-in batteries may contribute only via their selected **connected** physical port of the declared medium. Missing, wrong-medium or disconnected selected ports generate diagnostic warnings. If the node is physically attached to another network instead, that network receives an invalid participant to avoid false "balanced" claims. Existing `legacy` attachments remain unaffected.
- The independent battery DC observation (`storage_terminals[]`) is exposed with port ID, connection status, SOC, BMS alarm, HA/TEST provenance, power and signed injection. `injection_kw = -power_kw` when positive means charging, or `+power_kw` when positive means discharging. This observation is NOT inserted as a second network participant.
- BMS, minimum SOC, charge and discharge limits generate read-only warnings. Limits are optional; absent is `null`, not zero. No clamping of measured power, no physical HA service calls or battery control.
- Actual DC battery power is already counted **once** in the selected battery circuit; no PV or AC energy transfer across the inverter is inferred. Model 07A.2-D will introduce converter constraints and losses.

## Verification
`dev/test-storage-dc-coupling.js` covers AC legacy and old DC diagrams, valid and invalid physical port binding, persistence through layout normalization, sign polarity, HA W readings, missing and invalid kWh units, valid zero, charge/discharge limits, low SOC, BMS alarms, unchanged AC inverter production and unresolved DC converter transfer. Existing inverter/flow/balance/diagnostics tests and deterministic distribution build must remain green.

## HA acceptance
Load an existing 0.4.38-dev project and confirm the existing battery still shows `Dotychczasowy` coupling and its values are unchanged. Opt into DC and manually choose the **real battery DC port** (not the PV MPPT port), leaving manually drawn cable endpoints intact. Test charging 1.5 kW and discharge -1.5 kW (for charge-positive mode), verify sign and warning thresholds. Confirm the PV observation stays separate. If the model converter is not present, the DC network still shows an unresolved -1.5 kW charging deficit, not fabricated power.

**Stop after C.** Do not implement 07A.2-D, EPS, PV-to-battery transfer or UI caching in this MR.
