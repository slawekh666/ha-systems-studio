# Custom Designer — development status (0.4.16-dev)

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

## Modern solid-fuel boiler

In the Custom designer choose **Wood / coal boiler** directly from the equipment library (or `solid_fuel` as a boiler variant). The shell, display, grate and furnace are adapted from the uploaded `piec_czysty_svg_js_v3` SVG. Distinct wood logs and coal pieces have three states: burning, embers and extinguished, with animation reusing the Warmwasser `ss-fire` / `ss-embers` keyframes. Fuel, mode and visual intensity are independent per boiler. In automatic mode an explicit combustion-state entity takes precedence; otherwise configurable temperature thresholds provide an approximate illustration, **not a measured fire state**. Invalid HA readings never fabricate temperature or fire. There are no HA service calls. Reduced-motion clients disable animations. Existing Warmwasser boiler variants are untouched.

The modern solid-fuel boiler offers three independent controls: **Scale** (uniform whole-node size), **Boiler width** and **Boiler height** (50–240%, independent of Scale). Values default to 100% each for saved configurations. Width and height are local shape transforms, and the selection rectangle, outside caption and properties preview use matching geometry. This affects neither Warmwasser's other boiler variants nor the modular tank.

## Modern pellet boiler

Choose **Piec na pellet (nowoczesny)** from the Custom designer library or the `pellet_modern` boiler variant. The graphic uses the uploaded `piec_pellet_svg_js_v1` body, burner, right-hand pellet hopper and feeder. Warmwasser animated flame / ember classes and the shared solid-fuel state resolver supply the three combustion stages. The firebox contains pellets, not wood or coal. Modes: auto (explicit burner state first, otherwise temperature thresholds), burning, embers, off. Temperature comes from an HA sensor; invalid readings show a dash. Global proportional Scale and independent Width/Height remain available (50–240%). Geometry is isolated per node with scoped SVG IDs, including shared gradient definitions. The original `pellet` graphics and all other boiler/tank models remain unchanged. This is a visualization only, never HA control. Browser validation is required.

## Modern heat pump

The `heatpump_modern` variant uses the uploaded heat pump SVG. Power supports W or kW; fan speed supports % or RPM with configured maximum RPM. Missing data shows a dash, and the fan stops when value is zero or unavailable. CSS rotation respects reduced-motion preference. Same scale / width / height controls as modern boilers; read-only visualization.

## Modern gas boiler

`gas_modern` variant uses the uploaded gas boiler SVG, including the decorative blue flame and four modulation bars. HA temperature is from the main entity; the optional modulation entity accepts % or numeric percentages and drives the blue display flame height and indicator bars. An optional burner state entity disables the flame when off. Missing/unavailable modulation is not fabricated. `gas_draw_entity` is **burner modulation, not measured gas volume flow**. The shared Scale and independent Width/Height controls remain available; no HA services are called. Browser visual acceptance remains required.

## Modern electric boiler

`electric_modern` is a separate variant from Warmwasser `electric`. The attached SVG is rendered with live HA power (W / kW), boiler water temperature, and a 260° circular load gauge around the knob. Percentage is optional from an HA `%` entity or computed from real power / configurable rated power (default 8 kW). Invalid and unavailable readings remain unknown. No control actions occur. Global Scale, independent Width and Height are available. Browser validation is required.

## Modern fireplace

`fireplace_modern` uses the supplied `kominek_svg_js.html` shell, glazing, chimney and display. Warmwasser-style flame/ember animations appear inside the firebox with separate burning, embers and off stages. Auto mode uses combustion entity or boiler temperature thresholds; unknown temperatures display a dash. Independent width/height and overall scale are supported. No HA control actions. Browser visual acceptance is pending.

## Limitations and test requirements

- CI checks packaging, JS syntax and selected SVG/state regressions; live Home Assistant visual/browser testing is still necessary
- SVG geometry and element overlap may vary by viewport and zoom; inspect the tall boiler, sensor badges and pipe accessories after updating
- Pipes are not automatically routed or physically attached to device ports; editing node positions does not reroute existing pipes
- Entity selection uses searchable entries from HA; it is not a complete native entity picker
- No routing collision detection or electrical/hydraulic interlock logic
- The dashboard remains read-only by default (`studio_readonly: true`); never enable real control actions during visual testing
- Prototype edges can migrate to free-form pipe polylines

See [README](../README.md) and [release workflow](RELEASING.md).

## 0.4.16-dev interface and scaling

Library categories and groups use native Home Assistant MDI `ha-icon` elements; custom device SVG+JS rendering is unchanged. The right-hand inspector uses collapsible sections and individual active-part cards, selected by stable part IDs. Section expansion state is not stored in `studio_layout`.

Modular tanks preserve `scale`, `width_scale`, `height_scale`, and legacy `scale_mode`. Free width/height adjustment does not reset global scaling. Optional `aspect_locked` governs ratio-locked editing and defaults according to legacy mode. Reset 1:1 restores local width and height to 1 without changing overall scale. Browser testing of expanded panels, device selection bounds, labels, and HA icon support is required.

## v0.4.17-dev — navigation, scene dimensions, keyboard help

- New empty projects default to 1200×700; existing layouts without dimensions retain 1200×720 for compatibility. Saved `studio_layout.width`/`height` may be changed in the editor (300–5000 units). Resizing the scene never deletes or scales devices.
- The HA viewer initially fits the entire SVG and keeps fitting on browser resize; +/−, Fit and Fullscreen allow explicit close-ups. Mouse wheel zoom is limited to fullscreen so normal dashboard scrolling works. Fullscreen supports touch gestures. Default HA controls remain read-only.
- The editor has a clearly defined scene boundary, independent camera zoom and pan, Fit/Show all buttons, configurable scene size, keyboard shortcuts and a toggleable `?` help overlay. Delete/Backspace removes selection; arrow keys move by 5, Shift+arrow by 1, Ctrl+Z/Y undo/redo, Space+drag and middle-drag pan, F fits and Escape deselects. Inputs keep native keyboard behavior.
- Camera state is transient and never stored in `studio_layout`.
- Browser acceptance, including Firefox, touch gestures and old projects, is required before a numbered GitHub release.

## 0.4.20-dev — diagram title and whole-pipe dragging

- Card title is always `Home Assistant System Studio`, optionally followed by ` - <scheme name>`. Edit the scheme name (up to 64 characters) in the editor's diagram settings. Name is stored in `studio_layout.name`, independently from device labels; old diagrams with no name display just the fixed title.
- In the editor, dragging the pipe line translates every vertex by the same snapped delta (5 scene units), retaining bends, caps, flow animation and relative accessory positions. Dragging a point handle still moves only that point. Single click selects the pipe; double-click still adds a bend. Whole-pipe dragging is undoable.

## 0.4.21-dev — pointer selection and cursor regression fix

- The pointer stays an arrow at rest, switching to a closed-hand cursor while a left-button drag is held. Clicking a pipe now retains the selection and shows its editable vertex handles and right-hand inspector. Whole-pipe drag starts on movement, with pointer capture activated only then to preserve normal clicks and double-click insertion. Actual moves create one undo entry; canceled pointer gestures restore the prior layout. Existing `studio_layout` objects and Warmwasser automatic mode stay compatible.

## 0.4.22-dev — mobile diagram navigation

- The dashboard diagram accepts two-finger pinch and one-finger pan at any allowed zoom (20–800%), including initial Fit (100%) and zoom below 100% after the minus button. The SVG uses `touch-action: none` from initial render, avoiding browser cancellation of the first pinch. The card header remains scrollable in the regular dashboard; scrolling from within the SVG uses diagram pan instead. Plain taps still open HA entity more-info/history and toolbar controls keep their prior behavior. This is viewer-only and does not alter stored layouts or the automatic Warmwasser renderer. Live HA app testing is required.
