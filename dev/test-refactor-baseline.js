/* Baseline contracts for the pre-0.5.0 implementation.
 * Synthetic fixtures, no HA installation or real user configuration required.
 * The original 0.4.22-dev baseline did not migrate legacy pipes[].
 * Stage 04 explicitly replaces that known gap with a migration assertion.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const fixtures = JSON.parse(fs.readFileSync('dev/fixtures/refactor-050-baseline.json', 'utf8'));
assert.equal(fixtures.baseline.version, '0.4.22-dev');
assert.equal(fixtures.baseline.source_sha, 'ddf15c7c12e9c3566b5f861a2266ca7a7a6a9c0f');
assert.equal(fs.readFileSync('VERSION', 'utf8').trim(), fixtures.baseline.version);

const sandbox = {
  isEnt: id => typeof id === 'string' && /^[a-z_]+\.[a-z0-9_]+$/.test(id)
};
vm.createContext(sandbox);
const dependencies = [
  'ha-state.js', 'readout-scale.js', 'device-registry.js', 'studio-viewport.js',
  'inverter.js', 'building.js', 'ev-charger.js', 'energy-storage.js',
  'power-grid.js', 'distribution-board.js', 'radiator.js', 'manifold.js',
  'energy-topology.js', 'energy-balance.js', 'energy-flow.js',
  'energy-diagnostics.js', 'power-flow.js', 'studio-layout.js'
];
for (const filename of dependencies) {
  vm.runInContext(fs.readFileSync('src/' + filename, 'utf8'), sandbox, {filename});
}
vm.runInContext(
  'this.baselineAPIs={layout:HASSStudioLayout,ha:HASSStudioHA,' +
  'inverter:HASSStudioInverter,topology:HASSStudioEnergyTopology,' +
  'flow:HASSStudioPowerFlow};',
  sandbox
);
const {layout, ha, inverter, topology, flow} = sandbox.baselineAPIs;
const legacyConfig = fixtures.legacy_pipes_v1;
const typedConfig = fixtures.typed_connections_v2;
const legacyBefore = JSON.stringify(legacyConfig);
const typedBefore = JSON.stringify(typedConfig);

// A: Legacy YAML-like saved layout retains nodes, dimensions and connections.
// Migration is read-only; the original fixture remains unmodified.
const legacy = layout.normalized(legacyConfig);
assert.equal(legacy.name, 'Legacy plumbing example');
assert.equal(legacy.width, 1200);
assert.equal(legacy.height, 720);
assert.equal(legacy.nodes.length, 1);
assert.equal(legacy.nodes[0].id, 'old_tank');
assert.equal(legacy.nodes[0].variant, 'buffer');
assert.equal(legacy.nodes[0].x, 140);
assert.equal(legacy.nodes[0].scale, 1.25);
assert.equal(legacy.nodes[0].parts[0].entity, 'sensor.tank_top');
assert.equal(legacy.connections.length, 1);
assert.equal(legacy.connections[0].id, 'old_pipe_1');
assert.equal(legacy.connections[0].type, 'hydraulic');
assert.equal(legacy.connections[0].style.color, 'hot');
assert.equal(legacy.connections[0].animation.flow_mode, 'on');
assert.equal(legacy.connections[0].points.length, 2);
assert.equal(JSON.stringify(legacyConfig), legacyBefore, 'legacy input must not be mutated');
console.log('BASELINE A: legacy nodes and pipes[] migrated without source mutation');

// B: Typed electrical/hydraulic connections: ordering, endpoints, accessories,
// readout metadata and round-trip normalization are part of the existing contract.
const current = layout.normalized(typedConfig);
assert.equal(current.name, 'Energy and heating demo');
assert.equal(current.width, 1300);
assert.equal(current.height, 760);
assert.equal(current.nodes.length, 3);
assert.equal(current.connections.length, 2);
assert.equal(current.connections.map(c=>c.id).join(','), 'hydraulic_1,electric_1');
assert.equal(current.energy_balance.enabled, true);
const hydraulic = current.connections[0];
assert.equal(hydraulic.type, 'hydraulic');
assert.equal(hydraulic.style.color, 'hot');
assert.equal(hydraulic.animation.flow_direction, 'reverse');
assert.equal(hydraulic.accessories.length, 1);
assert.equal(hydraulic.accessories[0].id, 'pump_a');
assert.equal(hydraulic.accessories[0].test_running, true);
const cable = current.connections[1];
assert.equal(cable.type, 'electric');
assert.equal(cable.style.color, '#A1B2C3');
assert.equal(cable.style.cap_start, false);
assert.equal(cable.style.cap_end, false);
assert.equal(cable.accessories.length, 0, 'electrical cables cannot have hydraulic pumps');
assert.equal(cable.points.length, 3, 'manual bend points must survive');
assert.equal(cable.energy_start.node_id, 'pv');
assert.equal(cable.energy_start.port_id, 'ac');
assert.equal(cable.energy_end.node_id, 'house');
assert.equal(cable.energy_end.port_id, 'supply');
assert.equal(cable.animation.flow_power_kw, -5);
assert.equal(cable.animation.flow_pattern, 'dots');
const network = topology.graph(current);
assert.equal(network.errors.length, 0, 'AC-to-AC link remains valid');
assert.equal(network.edges.length, 1);
const secondPass = layout.normalized({studio_layout: current});
assert.equal(JSON.stringify(secondPass.connections), JSON.stringify(current.connections));
assert.equal(JSON.stringify(typedConfig), typedBefore, 'typed input must not be mutated');
console.log('BASELINE B: typed connections, endpoints, accessories and reload stable');

// C: Existing device identities and HA entity sanitization are preserved.
const pv = current.nodes.find(n=>n.id==='pv');
const tank = current.nodes.find(n=>n.id==='tank');
assert.equal(pv.variant, 'modern');
assert.equal(pv.energy_mode, 'test');
assert.equal(pv.inverter.count, 2);
assert.equal(pv.inverter.entities.ac_power, 'sensor.ac_power');
assert.equal(pv.inverter.panel_rows.length, 1, 'do not duplicate built-in AC metric');
assert.equal(pv.inverter.panel_rows[0].entity, 'sensor.daily');
assert.equal(tank.parts[0].entity, 'sensor.upper');
assert.equal(tank.parts[1].entity, '', 'invalid HA IDs must be rejected');
console.log('BASELINE C: saved device identity, custom rows and entity validation');

// D: HA/TEST source provenance, zero, unit conversion, invalid and unavailable.
const state = (value, unit='W')=>({state:String(value),attributes:{unit_of_measurement:unit}});
const hass = {states:{
  'sensor.ac_power':state(3250),
  'sensor.zero':state(0),
  'sensor.invalid':state('unavailable'),
  'sensor.bad_unit':state(100,'kWh'),
  'sensor.fahrenheit':state(68,'°F')
}};
assert.equal(ha.reading(hass,'sensor.ac_power').value, 3250);
assert.equal(ha.powerKw(hass,'sensor.ac_power'), 3.25);
assert.equal(ha.powerKw(hass,'sensor.zero'), 0);
assert.equal(ha.powerKw(hass,'sensor.invalid'), null);
assert.equal(ha.temperature(hass,'sensor.fahrenheit'), 20);
assert.equal(ha.powerKw(hass,'sensor.bad_unit'), null);
const fromTest = ha.powerInput(pv,hass,'sensor.ac_power',6.4,'live',true);
assert.equal(fromTest.kw, 6.4);
assert.equal(fromTest.source, 'simulated');
const fromLive = ha.powerInput({...pv,energy_mode:'ha'},hass,'sensor.zero',6.4,'live',true);
assert.equal(fromLive.kw, 0);
assert.equal(fromLive.source, 'measured');
const onlyHa = ha.powerInput({...pv,energy_mode:'ha'},hass,'sensor.invalid',6.4,'live',true);
assert.equal(onlyHa.kw, null);
assert.equal(onlyHa.source, 'missing');
const fallback = ha.powerInput({...pv,energy_mode:'auto',energy_fallback_enabled:true},
  hass,'sensor.invalid',6.4,'live',true);
assert.equal(fallback.kw, 6.4);
assert.equal(fallback.source, 'simulated');
assert.equal(inverter.data(pv,hass).power, 6.4);
assert.equal(inverter.data({...pv,energy_mode:'ha'},hass).power, 3.25);
console.log('BASELINE D: HA/TEST precedence, valid zero, unknown and units');

// E: Electrical flow remains view-only and does not synthesize missing readings.
const manualFlow = flow.visual(cable.animation,hass);
assert.equal(manualFlow.known, true);
assert.equal(manualFlow.kw, -5);
assert.equal(manualFlow.direction, 'reverse');
const missingFlow = flow.visual({
  flow_power_mode:'ha',flow_power_entity:'sensor.invalid'
},hass);
assert.equal(missingFlow.known, false);
assert.equal(missingFlow.active, false);
const zeroFlow = flow.visual({
  flow_power_mode:'ha',flow_power_entity:'sensor.zero'
},hass);
assert.equal(zeroFlow.known, true);
assert.equal(zeroFlow.active, false);
console.log('BASELINE E: electrical animation data and missing/zero semantics');
console.log('PASS: Stage 02 baseline contracts, including Stage 04 migration.');
