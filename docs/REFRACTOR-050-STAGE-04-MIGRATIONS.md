# Refactor 0.5.0 — Stage 04: legacy configuration migrations

## Explicitly approved source precedence

If a saved layout has its own \`connections\` field (including \`[]\`), its content is the authoritative set. Ignore old \`pipes[]\` and \`edges[]\`. Never append or revive earlier deleted connections. Even a malformed \`connections\` property blocks legacy fallback, rather than guessing intent.

Only when \`connections\` is absent:
- \`pipes[]\`: convert to hydraulic (or historical \`connection_type:'electric'\`) connections, preserving IDs, points, style, entity bindings, animation, and pipe accessories.
- \`edges[]\`: only if \`pipes\` is absent, reproduce the old connection geometry based on port locations. Invalid endpoints are omitted. Empty \`pipes[]\` is authoritative over older \`edges[]\`.
- On new-editor save, \`studio_layout\` stores normalized \`connections[]\` only; read-only conversion does not mutate the original user configuration object.

A persisted modern \`connections[]\` removes ambiguity on subsequent load. Migrated input data is not overwritten automatically on read: editing/saving produces the new schema. As with the historical normalizer, a maximum of 80 connections and 30 points per connection applies. For legacy duplicate IDs, stable numbered suffixes are assigned.

## Invariants and testing

- No change to Warmwasser automatic layouts and their original settings.
- No change to built-in device IDs, PV/HA/TEST policy, editor behaviors, SVG assets or license.
- Existing 720px legacy canvas dimensions remain intact even for \`pipes[]\`- or \`edges[]\`-only layouts.
- \`dev/test-config-migrations.js\` verifies precedence (including explicit empty array), idempotence, deterministic duplicates, port geometry, malformed/invalid input, accessory binding and mixed hydraulic/electric formats.
- Stage 02 baseline test now expects migration. Existing typed-connection test updated accordingly.
- Run the full GitLab CI, regenerate and commit \`dist/ha-systems-studio.js\`. By explicit maintainer decision, merge after successful automated CI and perform browser acceptance on the shared GitHub main channel before any stable release.

## HA visual acceptance (after main merge, before a stable release)

1. Back up the current dashboard YAML / Home Assistant configuration and test on a copy of the dashboard.
2. Load a historical \`pipes[]\`-only diagram: verify pipe geometry, colors, sensor labels, pump accessories and flow animations.
3. Load a historical \`edges[]\`-only diagram: verify routes and preserved 1200×720 canvas dimensions.
4. Load a mixed diagram with \`connections: []\` plus old \`pipes[]\`: confirm that **no** old connections reappear on refresh or save.
5. Load an existing current \`connections[]\` electrical diagram: verify port linkage, bends, HA telemetry and manual TEST settings unchanged.
6. Edit and save a migrated diagram. Reopen it and confirm no duplicate connections or unexpected changes.

If any visual regression occurs in the test/dev release: stop the rollout, capture the failing config, and revert the MR via a reviewed rollback commit; do not publish a stable release. Stage 05 starts only by explicit instruction.
