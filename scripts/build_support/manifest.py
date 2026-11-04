"""Single ordered manifest for the unchanged 0.4.22-dev bundle.

Ordering is part of the output contract. Do not sort or infer modules from
the filesystem: later JavaScript files depend on earlier declarations.
"""
ICON_ASSETS = {
    'solidFuel': 'solid-fuel-stove',
    'pellet': 'pellet-stove',
    'heatPump': 'heat-pump-stove',
    'gasBoiler': 'gas-boiler',
    'electricBoiler': 'electric-boiler',
    'fireplace': 'fireplace',
    'radiator': 'radiator',
    'manifold': 'manifold',
    'energyStorage': 'energy-storage',
    'inverter': 'inverter',
    'distributionBoard': 'distribution-board',
    'buildingHouse': 'building-house',
    'buildingGarage': 'building-garage',
    'buildingWorkshop': 'building-workshop',
    'evCharger': 'ev-charger',
    'powerGridClassic': 'power-grid-classic',
    'powerGridModernLight': 'power-grid-modern-light',
    'powerGridModernDark': 'power-grid-modern-dark',
}

JS_MODULES = (
    'ha-state.js', 'animation-state.js',
    'warmwasser-shapes.js', 'studio-tank.js', 'svg-template.js',
    'solid-fuel-stove.js', 'pellet-stove.js', 'heat-pump-stove.js',
    'gas-boiler.js', 'electric-boiler.js', 'fireplace.js', 'readout-scale.js',
    'power-grid.js', 'radiator.js', 'manifold.js', 'energy-storage.js',
    'device-parameters.js', 'inverter-readings.js', 'inverter.js', 'distribution-board.js', 'ev-charger.js', 'building.js',
    'power-flow.js', 'energy-topology.js', 'energy-balance.js',
    'energy-flow.js', 'energy-diagnostics.js',
    'device-registry.js', 'studio-viewport.js', 'studio-viewer-gestures.js',
    'studio-layout.js', 'studio-canvas.js',
    'studio-inspector.js', 'studio-library.js', 'studio-custom.js',
)

# Same insertion location as the previous single-file builder.
ICON_INSERT_BEFORE = 'solid-fuel-stove.js'
