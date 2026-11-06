# Stage 07A.2-D.1-B — validated automatic hybrid attachments

## Scope
- Reuse the D.1-A **single** AC/DC topology index, not an additional engine.
- Opt-in hybrid inverter: a uniquely wired AC port and a uniquely wired DC battery port are resolved at solve time. Existing explicit port overrides remain authoritative; a wrong override is **not** silently replaced.
- DC battery inference works only from validated inverter-to-storage links, with exactly one physical DC port, one inverter, no AC dual feed and no user-selected incompatible coupling. This is ephemeral, not a saved configuration migration.
- New storage icons expose both AC and DC physical ports; old saved `energy_ports` are unchanged. No automatic cable creation or rerouting.
- PV1–PV12 readings may exist as *logical* MPPT observations even without a physical PV icon or port assignment. A physical DC source may identify an MPPT only when the source–input match is unique; otherwise report ambiguity instead of guessing. PV is not a second battery-bus generator or duplicated participant.
- Preserve measured HA and enabled TEST readings exactly as before. AC fallback calculations, missing AC TEST inputs and converter assumption semantics belong to D.1-C. No EPS, ATS or export-limit work.

## Safety
- AC/DC remain electrically isolated graphs. Converter links are constraints only.
- Invalid, cross-medium and duplicate-ID cables never authorize an automatic binding.
- Multiple battery DC ports, multiple inverters on one storage or multiple unmatched physical PV sources are unresolved. An explicit `none` battery override that conflicts with a battery wire is an error.
- Losses, reported AC power and saved wiring are not overwritten by discovery.
- Preserve explicit legacy port/coupling mappings and unmodified AC-only inverters.

## Verification
`dev/test-hybrid-auto-discovery.js` checks real cable classification, physical/virtual PV, storage inference, direct no-guess rules, duplicate cable IDs, medium mismatches, AC/DC separation, no mutation, legacy balance and explicit overrides.

After CI, test in Home Assistant with inverter→AC grid, inverter→DC battery, PV readings without icon, disconnected battery, dual-feed and ambiguous DC branches. Stop before D.1-C.
