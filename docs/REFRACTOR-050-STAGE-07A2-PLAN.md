# 07A.2 — phased hybrid AC/DC implementation plan (draft)

**Status:** PROPOSED. Created during design-only 07A.2-A, based on [ADR 07A.2-A](ADR-07A2A-HYBRID-ACDC-ARCHITECTURE.md). Each stage is a separate MR with regression tests and a stop/review before continuing.

## Entry conditions
- 07A.2-A architecture decisions explicitly accepted.
- Existing `0.4.35-dev` AC baseline and 07A.1 regression suite remain stable.
- Feature flag is opt-in; no automatic migration of old `inverter`, `energy_storage`, `energy_ports`, `inverter.inputs` or `energy_balance`.
- The card remains read-only; no inverter control and no automatic electrical wiring.

## 07A.2-B — safety guard, versioned port model, PV/MPPT DC
**Deliver in small MRs if needed.**
1. Validate that a legacy inverter's AC readout cannot be counted as DC generation (particularly if only `pv1`/`pv2` are cabled). Add regression first, with the narrowest guard.
2. Introduce a separately versioned, disabled-by-default hybrid configuration with strict normalization and HA config round-trip, without changing legacy fields.
3. Bind physical MPPT port IDs to existing PV1–PV12 data **explicitly**; add optional PV source icon only after PV representation decision. No double counting of vendor PV sensors.
4. Produce a DC-only observation view with provenance and missing-data diagnostics; until converter constraints exist, do not claim real AC/DC transfer or animate unknown cables.

**Gate:** AC legacy unchanged, DC-only legacy guard verified, port ID editing/Undo/save compatibility, no false PV generation.

## 07A.2-C — DC-coupled battery and BMS
1. Add explicit AC-vs-DC coupling selection for *new/opted-in* storage nodes.
2. Bind battery terminal power sign, SOC, constraints and BMS status without deriving instantaneous kW from SOC alone.
3. Validate charge, discharge, zero, unavailable, wrong units, negative/positive polarity, and distinct battery/MPPT buses.

**Gate:** existing AC battery cases unchanged; DC battery not added as an AC participant.

## 07A.2-D — AC/DC converter & losses
1. Introduce multi-terminal converter constraints separate from physical bus connectivity.
2. Normalize per-port signed power, estimate losses only with explicitly configured assumptions; no implied efficiency of 100%.
3. Distinguish `measured / simulated / calculated / estimated / missing / invalid` for each terminal and transfer.
4. Verify power conservation for PV→AC, AC→battery, battery→AC, simultaneous PV/battery/load, multiple unknowns and contradictory sensors.

**Gate:** never manufacture transfer or cable flow from an underdetermined system; 07A.1 AC results remain identical for legacy nodes.

## 07A.2-E — Backup/EPS, transfer switches, islanding
1. Model a separate EPS AC output network and explicit known/unknown inverter operating state.
2. Model optional ATS contacts using state-qualified topology; no bus short-cut or inferred energized conductor.
3. Verify grid-connected, islanded, transition, fault, unknown, dual feed ambiguity, battery absent and isolated loads.

**Gate:** no fictitious grid import/export or EPS supply; manual wiring and device-position behavior unchanged.

## 07A.2-F — export-limit semantics and diagnostics
1. Add read-only export restrictions at a defined grid boundary, with clear export basis (total net vs sum of exporting phases).
2. Compare actual measured/inferred power to limit without controlling the inverter or pretending curtailment was produced energy.
3. Validate missing meter, unknown phase basis, multiple inverters, charging storage, no-export rule and measured violations.

**Gate:** no false regulatory compliance claims or hardware control.

## 07A.2-G — integrated AC/DC regression and HA acceptance
1. Combine independent AC and DC networks with converter constraints; legacy AC unchanged.
2. Verify numerical network residuals, source provenance, SVG cables and diagnostics on representative complete and partial diagrams.
3. Regression scenarios: PV-only, PV + battery, AC-charge, EPS island, simultaneous grid/export-limited operations, multi-device, source conflicts, stale/unavailable sensors, zero and loops.
4. Benchmark 60 devices / 80 connections against pre-change baseline; preserve deterministic bundle and HA card safety.
5. Require real browser/HA tests, then freeze acceptance before any release or D.2-C caching redesign.

## Stop rules
- No implementation in 07A.2-A.
- One approved substage at a time; automated tests and CI before merge.
- Stop and ask for an architectural decision if a manufacturer's telemetry contradicts the chosen port model, an EPS mode needs a different topology, or a migration would alter legacy saved data.
- Never silently turn missing observations into zero or estimated values into measured telemetry.
