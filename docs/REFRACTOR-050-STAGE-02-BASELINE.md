# Refactor 0.5.0 — Stage 02: baseline contracts

**Scope:** test-only reference point for 0.4.22-dev, approved approach B. No runtime changes, schema conversion, build refactor or release change.

## Reference

- Frozen pre-refactor application SHA: `ddf15c7c12e9c3566b5f861a2266ca7a7a6a9c0f` (see stage 01 recovery plan).
- Stage 02 starts from merged stage 01 SHA: `a68d2656d49467d1fe7c78c9a09ed451ef307080`.
- Test data: `dev/fixtures/refactor-050-baseline.json` — **synthetic configurations**, not a backup of real Home Assistant dashboards.
- Runnable test: `dev/test-refactor-baseline.js`.
- Existing regressions in `scripts/test_studio.js` and `dev/test-*.js` remain unchanged. Only one new invocation is added to CI.

## Expected behavior locked for reference

| ID | Scenario | Expected in 0.4.22-dev |
| --- | --- | --- |
| A | Legacy `studio_layout.nodes[]` with `studio_layout.pipes[]` | Tank, parts, sensor entity, dimensions and geometry preserved; legacy **pipes are ignored** (known incompatibility) |
| B | Typed `studio_layout.connections[]` | Hydraulic/electrical identity, endpoint IDs, bend geometry, accessory rules, power mode and re-normalization preserved |
| C | Device configuration | Inverter variant and PV input count, custom HA row and invalid entity sanitation preserved |
| D | HA and TEST power | Explicit TEST wins; HA zero stays a valid measurement; unavailable/invalid units are not invented; fallback is explicit |
| E | Electrical animation | Signed power direction, unavailable vs measured zero, manual/HA provenance |

### Important: legacy pipes migration gap

The assertion `legacy.connections.length === 0` describes **existing behavior**, not desired final functionality. It deliberately prevents an accidental undocumented behavior change in stages 02–03. During **stage 04 (configuration migration)**, replace it with tests for a specified, non-destructive `pipes[]` to `connections[]` migration, including idempotence, duplicate avoidance, and preservation of user edits. Do not interpret a passing stage 02 test as proof that legacy pipes still display.

The earlier typed-connections MR !41 approved a schema-breaking change. The new 0.5.0 compatibility objective reopens that question only for the **migration design stage 04**, not here.

## How to run

```bash
python3 scripts/build.py
python3 scripts/check.py
node scripts/test_studio.js
node dev/test-refactor-baseline.js
git diff --exit-code -- dist/ha-systems-studio.js
```

The normal GitLab CI job executes this new test **in addition to all existing checks**. GitLab CI passing demonstrates only these automated contracts; it does **not** certify visual interactions, DOM/SVG rendering under Home Assistant, touchscreen behavior or safety of service calls in a live installation. Those require user acceptance tests when runtime changes occur.

## Acceptance criteria

- New regression test passes in CI on the feature branch and after merge.
- Existing test commands still pass, including the generated `dist` parity check.
- Diff is limited to this document, synthetic fixture, regression test, and CI invocation.
- Do not change `VERSION`, `dist`, `src/`, `warmwasser-schema-card.js`, graphics or HA behavior.
- Stage 03 must **not** begin without explicit user instruction.
