# Stage 07A.1-D.2-B — safe per-resolution topology indexing

This step optimizes lookups only. The prior AC measurement, grid/root selection, ambiguity, invalid data, port and bus contracts remain intact.

- `HASSStudioEnergyTopology.graph()` normalizes/indexes the referenced node's electrical ports once per graph build rather than searching repeated port lists for every cable endpoint. Existing first-valid-duplicate-port precedence is retained.
- `meterHierarchy()` constructs an index of connected bus keys by node ID once per AC network, replaces repeated full-graph `keysFor` scans, memoizes device depth and admissible downstream reach per prospective building owner. It still uses the original BFS, root and distance filters to reject ambiguous feeds.
- `HASSStudioEnergyBalance.resolve()` shares the node ID index across networks within one solve, reuses each device's normalized topology descriptor, and does not change any arithmetic or status.
- All caches are local to a single invocation: moving a cable, renaming a port, changing the connected bus or HA telemetry cannot reuse stale state.
- DC/AC conversion, hybrid inverters, EPS, global caching and UI rendering are out of scope.

Verification: `node dev/test-topology-indexes.js` counts port-normalization calls during graph construction, checks duplicate ID precedence and AC/DC mismatches, and verifies balanced, invalid and bypass cases. Full CI regression including nested buildings, disconnected networks and deterministic bundle remains required. Final HA browser acceptance is manual. Do not continue beyond D.2-B without agreement.
