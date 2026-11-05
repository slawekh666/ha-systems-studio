# Stage 07A.1-C.2 — explicit conversion of legacy building meters

Older buildings with no saved `measurement` normalize as `individual`: their 3 kW is own-only, and 7.2 kW behind the building yields 10.2 kW. An actual gross meter of 3 kW must be marked invalid if downstream loads exceed it.

- A button "Zmień na pomiar całkowity budynku" appears only when the selected building currently has individual mode. It is an explicit user action, not an automatic save-time migration.
- One editor commit updates the selected node to `measurement: aggregate`, copies the *effective* TEST value (remaining_kw if enabled; otherwise power_kw) into power_kw, and disables remaining_enabled. The old inactive remaining_kw, HA entity, daily readings, port IDs, saved connections and all other settings are retained. The existing editor Undo/Redo can restore the previous layout.
- Signed-net, aggregate and nonbuilding devices are not converted.
- No changes to the balance engine, AC topology, SVG rendering, animations or other device inspectors.

Regression: expanded `dev/test-auto-meter-hierarchy.js` validates the legacy 3 kW+7.2 kW EV case, explicit transition from balanced/10.2 kW to invalid, persistence after JSON save/reload and no unintended changes to other modes. Extended `dev/test-building-inspector-simplify.js` checks button display only on individual. GitLab CI retains the deterministic bundle verification.

Manual HA acceptance still required after synchronization to GitHub: click the opt-in button only for a physically gross reading; confirm warning and 3 kW value, Undo/Redo, save/reload, and preserved cable attachments. Stage 08 is excluded.
