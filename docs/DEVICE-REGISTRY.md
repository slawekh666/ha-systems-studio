# Device registry — Phase 1

`src/device-registry.js` is the central catalog of existing device types, graphical variants, localized labels, family metadata and supported animation channels.

Existing `studio_layout` node `type` and `variant` identifiers remain unchanged. The registry maps them to device families without rewriting saved layouts. `pipe` is not a node variant, and stays in `studio_layout.pipes`.

The registry is bundled before `studio-custom.js`. No new HACS resources or device controls are introduced.

Next phases: grouped equipment library, capability-driven inspector, shared HA and animation helpers, selection of individual tank parts. Circuit groups, additional device SVGs and HVAC/electrical features are deferred.
