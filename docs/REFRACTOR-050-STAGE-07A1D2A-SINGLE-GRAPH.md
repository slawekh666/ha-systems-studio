# Stage 07A.1-D.2-A — single topology graph per resolution

## Context
Before this change, `HASSStudioEnergyBalance.resolve()` built a graph once and `adjustBuildings()` rebuilt the same graph for each connected network. With N networks, one balance solve performed N+1 graph constructions, despite all networks sharing the same layout.

## Change
- Pass the *existing graph object* from `resolve()` into `adjustBuildings()`, and use it for `meterHierarchy()`.
- Build only once per enabled balance resolve, even for several independent AC networks.
- Preserve all calculations, bus identity, measured/simulated values, missing/invalid semantics, direction, branch flow availability, diagnostics, and saved formats.
- No global cache, cross-render memoization, asynchronous work, stateful singleton, AC/DC bridging, SVG changes, or user-facing UI changes.

## Verification
- `dev/test-single-graph-balance.js` instruments `HASSStudioEnergyTopology.graph` in an isolated test VM, then asserts exactly one graph build for two separate AC networks. It checks a valid 10 kW aggregate building with EV 7.2 kW and an invalid 3 kW aggregate building with EV 7.2 kW, unchanged layouts, consistent flow status, and zero graph builds when the balance is disabled.
- Existing topology, power-flow, energy-balance, and HA state regression suites remain mandatory in GitLab CI; `scripts/build.py`, `scripts/check.py` and the deterministic dist check are unchanged.

## Constraints and follow-up
This is a narrow per-call graph reuse. It does **not** eliminate repeated full calls when SVG, inspector or diagnostics compute energy separately. That is a distinct, higher-risk task for a later approved stage. The current change makes no claim about measured wall-clock speedup: it guarantees reduced graph-build count. The future AC/DC hybrid conversion model is unaffected.

Acceptance: CI passing, merge to main, Home Assistant browser check on existing test diagram. Stop after this stage.
