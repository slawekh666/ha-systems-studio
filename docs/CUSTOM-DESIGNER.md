# Custom Designer — development status (0.4.7-dev)

The custom designer is on `main` and remains experimental. It is built on the original Warmwasser Schema Card; automatic Warmwasser rendering remains available.

## Three-panel editing

- **Left:** equipment library: boiler, tank, solar collector, pump, valve, sensor and pipe
- **Centre:** SVG canvas with device dragging and proportional scaling; draggable pipe points; double-click a pipe to add a bend
- **Right:** selected object's visual variant, entity, position, scale and component-specific options
- Languages: Polish, English and automatic Home Assistant locale selection
- Internal tank/collector sensors: entity, editable label, vertical position, side and independent reading size
- Tank heaters/coils: optional entity plus placement and visual variant
- Pipes: standalone polylines, flow animation options and attached pump/valve symbols with editable labels and entity assignment
- Warmwasser-style boiler animations: optional burner entity, or configurable temperature thresholds
- Solar icon: collector-to-tank temperature differential with configurable hysteresis, independent of pump state
- Clicking a bound device/sensor in the **dashboard view** opens Home Assistant's native entity details and history; in the designer, drag/edit interactions take priority

## Modular tank (Custom only)

Use **Tank → Modular**. Add independent sensors, heaters, coils, horizontal/vertical baffles and one inner tank from the properties panel. Sensor heights use 0–100% from the bottom; additional horizontal position and an optional inner-tank compartment are configurable. Sensor readings determine gradient color. Heaters only create visual halos when on; no temperature values are fabricated. Full baffles create separately interpolated temperature areas; perforated baffles attenuate decorative halos. Coil gradients have no blur and optional dashed flow. The original Warmwasser tank variations remain for existing layouts. Accessory add buttons wrap within the properties panel. Modular tank scaling has proportional and independent width/height modes; the panel keeps badge text unwarped while scaling the tank body. The hygiene coil path combines a straight vertical inlet, rounded helical turns and a top return bend without blur. Colour runs blue-to-hot by distance along the tube (top end from the highest valid tank temperature sensor), not vertically across its bounds. The width/height scale sliders are always visible and automatically enable free scaling when changed. All accessories—including sensor badges—render in insertion order, from layer 0 at the back to later additions in front; up/down buttons change the order.

## Limitations and test requirements

- CI checks packaging, JS syntax and selected SVG/state regressions; live Home Assistant visual/browser testing is still necessary
- SVG geometry and element overlap may vary by viewport and zoom; inspect the tall boiler, sensor badges and pipe accessories after updating
- Pipes are not automatically routed or physically attached to device ports; editing node positions does not reroute existing pipes
- Entity selection uses searchable entries from HA; it is not a complete native entity picker
- No routing collision detection or electrical/hydraulic interlock logic
- The dashboard remains read-only by default (`studio_readonly: true`); never enable real control actions during visual testing
- Prototype edges can migrate to free-form pipe polylines

See [README](../README.md) and [release workflow](RELEASING.md).
