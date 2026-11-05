# 07A.2-D.1-A — Shared AC/DC topology index and validated connection discovery

## Objective
Reuse the **same graph and connectivity index** for AC and DC. A single fix to validation, network partition or endpoint indexing should apply to both domains without cloning a second solver. This is a non-behavioral, read-only refactor: numerical accounting, HA/TEST, adapter values, converter assumptions, current editor forms and wiring geometry must not change.

## Implementation
- `HASSStudioEnergyTopology.graph(layout)` retains its existing contract and validation. Invalid cables (including `medium_mismatch`) do not become electric edges.
- New `HASSStudioEnergyTopology.index(layout, existingGraph?)` builds the *same* connected components, grouped network IDs and ordering previously calculated inside `HASSStudioEnergyBalance.resolve()`. Passing an existing graph does not reconstruct it.
- The index includes `graph, grouped, keyGroup, byMedium, edgesByMedium, linksByNode, nodesById`. Domains AC and DC have separate component lists, even if port/bus identifiers are identical. A logical converter boundary does **not** create an AC/DC electrical graph edge.
- `linksByNode` contains directional views of **validated direct cable endpoints**, including stable node/port IDs, medium, partner node type and network ID. Duplicate cable IDs do not produce automatic identification links, so a downstream stage must not guess which device an ambiguous endpoint represents.
- All index maps and groups are ephemeral per solve, never serialized into configuration or shared globally. Existing manually drawn cable points, port identifiers, buses, HA entities and measurement modes are untouched.
- The energy balance now consumes the shared index instead of maintaining a second union-find implementation. Downstream building metering and converter solvers use the unchanged graph and `keyGroup`.
- This stage does **not** automatically classify a DC port as PV or battery, enable an MPPT, link a battery without user action, derive missing AC data, or modify HA/TEST power precedence. Those are D.1-B/C/D.

## Verification
`dev/test-shared-acdc-topology.js` checks separate AC/DC domains, shared bus labels, unchanged network grouping and IDs, correctly indexed direct relationships in both directions, no mixed-medium inference, duplicate connection-ID fail-closed handling, graph reuse without layout mutation, and unchanged public balance/flow results.

Existing `dev/test-single-graph-balance.js` asserts precisely one `graph()` call per balance/flow resolve with multiple networks. Prior AC hierarchy, DC storage, MPPT, converter and editor regressions must remain green. GitLab CI also checks deterministic `dist/ha-systems-studio.js` build.

**Stop after D.1-A.** Await user acceptance before D.1-B auto-discovery. The current converter may still require manual port mappings; this stage only establishes the shared safe foundation.
