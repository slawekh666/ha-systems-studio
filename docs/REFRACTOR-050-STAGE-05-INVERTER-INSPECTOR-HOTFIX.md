# Stage 05 hotfix — inverter inspector (0.4.25-dev)

## Root cause

In \`src/studio-inspector.js\`, stage 05 introduced \`const fields\` as the inverter parameter definition object while an existing \`let fields\` in the PV-input rendering callback held HTML markup. JavaScript lexical shadowing caused the PV callback to dereference \`fields.pv.voltage\` on a string. Selecting the inverter could highlight it but the inspector renderer threw before updating the panel.

## Minimal correction

Use \`inverterFields\` for the immutable parameter definitions, keeping the local HTML accumulator and all persisted configuration keys unchanged. No changes to signal inputs, entity readings, power flow, device SVG, or HA write operations.

## Regression protection

New \`dev/test-inverter-inspector.js\` executes the **real** inspector \`create(...)\` and its returned render function, rather than checking strings in source files only. Tests cover one, two, and twelve PV inputs, HA-only and TEST modes, existing per-PV entity mappings, optional custom panel rows, and a repeated render. The previous implementation fails this regression test.

GitLab CI runs this test and the entire existing suite; \`dist/ha-systems-studio.js\` is regenerated deterministically, and app version is bumped to \`0.4.25-dev\` for shared-main HACS testing.

## Acceptance

After merge and GitHub main sync, re-download the same card through HACS and verify selecting an existing/new inverter opens the right inspector, displaying PV fields and existing HA/TEST bindings. Avoid rewriting dashboard configuration merely to test the UI. Stage 06 remains blocked pending user instruction.
