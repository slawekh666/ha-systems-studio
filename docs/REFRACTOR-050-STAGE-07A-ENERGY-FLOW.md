# Stage 07A — topology-aware partial electrical flows

This is a read-only visual model. Per-inverter `export_allowed` (default true) is a diagnostic policy, not a hardware command. Per-distribution-board `energy_grid_connected` (default true) simulates a common AC grid disconnect, not an actual breaker. Existing pylon remains informational.

Known bridge branches can continue to animate when other branches lack HA measurements. Missing branches remain unknown. A single missing building can receive a nonnegative residual AC load marked `estimated` (not HA/TEST); with multiple unknown buildings, no split is invented. The visual estimate assumes zero grid exchange where the grid is otherwise unknown; it does not assert a measured zero. Disconnected-grid mismatches remain unbalanced and do not animate.

Existing aggregate-meter child hierarchy is preserved. Existing electric pumps and boilers can already provide power; other device families need their own power fields during migration. Hybrid EPS/backup/DC battery flows and source-specific export allocation on a shared bus require a future dedicated topology design; no false claim of support is made.

Runtime regression: `dev/test-energy-07a.js`. Version `0.4.28-dev`. Stage 08 remains blocked until explicit instruction.

## Accounting of non-exportable production

The inverter retains its HA/TEST production readout. The balance separately reports `unaccounted_kw` for surplus without a known load, export route or storage. This is an accounting discrepancy, **not** an energy loss or an invented device. For two inverters, local demand is allocated to the non-exporting inverter first; grid export is capped by the permitted inverter's production. The rule does not identify physical electron paths. In an islanded network, surplus is unaccounted; on-grid anti-islanding and hybrid backup/EPS require real status and topology data.
