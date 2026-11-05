# Stage 07A.1-C.1 — one building power field

- New buildings already use `measurement: aggregate`; AC child ownership remains based on the 07A.1-B.1 graph topology, not port labels.
- Display one HA entity input labeled `Encja mocy (W/kW)` and one TEST number when applicable, plus unrelated existing controls.
- Remove obsolete measurement/remaining inputs from the inspector only. Keep saved `individual`, `aggregate`, `net`, `remaining_enabled`, `remaining_kw` and legacy configuration semantics.
- Older individual/remaining TEST models now expose and update the effective `remaining_kw` through the single TEST field, not the unused `power_kw`. No automatic migration of saved meter scopes. Older modes display a read-only explanation.
- No energy-balance equations, SVG graphics, animations, connection topology, or other device inspectors have been changed.

Regression: `node dev/test-building-inspector-simplify.js` tests actual rendered inspector HTML, HA/TEST mode, old TEST edits, immutable reads, gross/individual/net model, zero, missing and invalid values. Existing `dev/test-auto-meter-hierarchy.js` validates EV ownership, nested buildings, AC storage, bad totals and ambiguous wiring. GitLab CI includes deterministic dist rebuild and old regression suites.

Manual Home Assistant acceptance still needed after GitHub synchronization: select new building and old individual/remaining building, change TEST and reload, verify no double count for attached EV, verify no reading vs zero and invalid network diagnostics. Stage 08 is explicitly out of scope.
