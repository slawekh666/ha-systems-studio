# Refactor 0.5.0 — Stage 07: parameter → SVG value binding

## Scope and architectural decision

The canonical inverter \`ac_power\` parameter now declares \`svg:{id:'inv-power',attribute:'text'}\`. A pure \`HASSStudioSvg.parameterBindings()\` helper converts parameter declarations and resolved values into bindings accepted by the existing \`HASSStudioSvg.apply()\` method.

The inverter renderer no longer hardcodes the \`inv-power\` binding ID. It retains the same \`kw()\` formatter and its LED/fault rendering. The existing \`HASSStudioInverterReadings\` remains the single HA/TEST source of AC power for rendering and \`HASSStudioEnergyBalance.deviceReading()\`, without altering live readings, fallback, sign conventions or saved config.

## Safety

- Unknown → \`—\`, actual HA zero → \`0.00kW\`, signed negative reading → negative text, fallback only when previously authorized.
- Binder checks target ID and supported attribute, rejects missing values and duplicate targets; \`apply()\` checks that targets actually exist and escapes XML text.
- SVG graphic, coordinates, gradients, animation paths and existing electrical balance untouched. One inverter text field is migrated. Future device fields must be reviewed separately.
- No schema migration, no Home Assistant service calls, and no changes to built-in device IDs.

## Tests

\`dev/test-inverter-svg-binding.js\` runs real inverter normalizer/resolver, SVG renderer (from the actual icon source) and energy-balance device adapter against HA zero, unavailable, fallback, forced TEST, signed negative and invalid-unit readings. It also verifies XML escaping and fail-closed missing/duplicate/unsupported SVG bindings.

Other JS/Python suites, inverter inspector hotfix tests, and deterministic \`dist\` comparison remain mandatory. Shared-GitHub-main development version \`0.4.27-dev\`; real HA testing after merge/push. Do not start Stage 08 without explicit approval.
