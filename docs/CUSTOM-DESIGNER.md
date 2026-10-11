# Custom Designer v0.3 (draft)

This experimental version is on `feature/custom-hydraulic-layout`; `main` is unchanged.

## Editor layout
- Left: hydraulic equipment library (boiler, tank, solar, pump, valve, sensor, pipe)
- Center: SVG canvas, drag nodes and pipe handles; double-click pipes to insert bends
- Right: selected item's graphic variant, scaling, position, entities, tank internals, and pipe equipment
- Languages: Auto (HA language), Polish, English; legacy Warmwasser automatic mode unchanged
- Pipes are **free-standing geometry** and are not automatically snapped or physically connected to devices
- Tank sensors/heaters/coils have entity, side, and vertical-position settings
- Pipes can carry pump/valve icons with an adjustable percentage along the polyline

## Limitations
- UI not yet browser-tested on Home Assistant; CI validates source and syntax only
- Rendered graphics are new SVG interpretations; a full upstream Warmwasser SVG library extraction remains future work
- Entity selection uses browser searchable datalist; HA entity picker integration can follow
- No routing collision detection or electrical semantics
- Read-only action guard stays enabled by default; no service calls in designer
- Legacy prototype edges migrate to freely editable polylines when you first save
