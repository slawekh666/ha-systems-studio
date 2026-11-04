# Refactor 0.5.0 — Stage 05: unified inverter field definitions

## Scope

First phase B step: a single frozen schema for the inverter's built-in AC power, temperature, status and alarm fields and 1–12 PV inputs (voltage/current/power).

\`src/device-parameters.js\` exports \`HASSStudioDeviceParameters.inverter\`: canonical IDs, displayed labels, value types, logical roles, units, paths to HA entity and manual TEST fields, default TEST values and numeric ranges. \`src/inverter.js\` uses the same definitions for entity sanitization and defaults. The dedicated inverter inspector uses the same display labels; the editor uses field keys and validation.

Existing persisted keys remain unchanged: \`inverter.entities\`, \`inverter.manual\`, \`inverter.inputs[].entities\`, \`inverter.inputs[].manual\` and optional \`panel_rows\`. The current energy-mode, measured HA values, TEST provenance and balance algorithms are deliberately NOT moved or rewritten; resolver extraction is stage 06.

New schema is bundled immediately before \`src/inverter.js\`. Standalone SVG preview and VM test harnesses load it in the same order. No icon SVG changes or upstream Warmwasser changes.

## Tests

\`dev/test-device-parameters.js\` checks immutable field metadata, schema/default consistency, per-PV count and visibility, entity sanitation, legacy layouts, roundtrip idempotence and inspector integration. All prior HA/TEST and energy tests continue running in GitLab CI with deterministic \`dist\` parity.

This is shared-main test release \`0.4.24-dev\`; user tests in Home Assistant after the GitLab main merge and GitHub mirror push. Do not begin stage 06 without explicit instruction.
