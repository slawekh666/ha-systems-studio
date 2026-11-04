# Stage 07A.1-B.1 — automatic AC measurement hierarchy

## Purpose and invariant

A building is a meter boundary, not a mandatory `supply`/`child` port-name convention. The editor keeps its current four-section device properties, port labels and technical `bus` values. The default `main` bus is retained, and labels/IDs do **not** determine ownership.

The new pure `HASSStudioEnergyTopology.meterHierarchy(layout,group,topology)` derives downstream ownership from the AC bus graph. A building owns a downstream device only when **every route from the upstream reference to the device crosses that building** (dominator). Nested building owners are the nearest dominant building. All physical cable endpoints, AC/DC medium and internal bus IDs remain authoritative. No visual crossings, line directions, SVG positions or guessed energy flows establish metering ownership. The existing building snapshot contract remains unchanged.

## Root selection

- Prefer an attached grid boundary. Multiple grid boundaries are all considered; a building must dominate from all of them.
- Without a grid, one distribution board can anchor a tree; do not arbitrarily select one of several boards.
- Without grid/board, one source can anchor the tree.
- Without grid/board/source, a single building can be the root of its local tree.
- Multiple possible roots without a safe discriminator do not trigger an invented owner. For aggregate or net building readings, fail closed with a root warning.

## Ambiguous paths

A direct building–child connection bypassed by a parallel feed is ambiguous. Such a route gets a `building_ambiguous_meter_path` warning and invalidates the relevant aggregate building balance rather than silently double-counting, choosing a feed or reporting `balanced`. Complex transfer switches/ATS, dynamically active paths, or unequal feeder power-sharing are excluded, for a later explicit switching model.

## Regression matrix

A: custom building ports and `main`, 50 kW gross + EV 7.2 => 50 gross, 45 grid import with 5 PV.
B: rename both building port IDs.
C: EV attached directly to board => independent 7.2 kW.
D: gross 3 kW < EV 7.2 => invalid.
E: two independent buildings; EV belongs only to building 2.
F: nested building, single charge per descendant.
G: 5 PV + 50 gross house + AC storage charging 1.5 => 46.5 grid import.
H: bypass loop => ambiguous, not balanced.
I: distinct internal buses cannot be merged by `main` labels.
J: single on-grid inverter without grid node anchors a simple tree.

Legacy electrical modes and saved port/bus labels are not migrated or renamed. This is stage B.1 only: no SVG/UI changes and no hybrid DC/AC conversion. A production HA browser acceptance test is required after GitHub synchronization. Next stage C needs explicit permission.

The ambiguous-path check also detects bypasses through downstream junctions, not only direct duplicate house/child cables. It excludes false sibling paths by refusing to walk back through shallower upstream buses.
