/* Energy MR3 — real normalized topology and read-only active-power solver tests. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={isEnt:id=>typeof id==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(id)};
vm.createContext(ctx);
for(const file of ['ha-state.js','readout-scale.js','device-registry.js','studio-viewport.js',
  'inverter.js','building.js','ev-charger.js','energy-storage.js','power-grid.js',
  'distribution-board.js','radiator.js','manifold.js',
  'energy-topology.js','energy-balance.js','energy-flow.js','energy-diagnostics.js','power-flow.js','studio-layout.js']){
  vm.runInContext(fs.readFileSync('src/'+file,'utf8'),ctx,{filename:file});
}
vm.runInContext('this.layout=HASSStudioLayout;this.balance=HASSStudioEnergyBalance;',ctx);
const {layout,balance}=ctx;
const port=(id,medium='ac',bus='main')=>({id,medium,bus,x:50,y:50});
const node=(id,type,extra={})=>({id,type,variant:'modern',energy_ports:[port('ac')],...extra});
const connect=(id,a,aPort,b,bPort,medium='electric')=>({
  id,type:medium,points:[{x:10,y:10},{x:30,y:10},{x:30,y:30}],
  energy_start:{node_id:a,port_id:aPort},energy_end:{node_id:b,port_id:bPort}
});
const nodes=[
  node('grid','power_grid'),
  node('pv','inverter',{inverter:{mode:'manual',manual:{ac_power:2.5,temperature:30}}}),
  node('home','building',{building:{mode:'manual',power_kw:3,measurement:'individual'}}),
  node('panel','distribution_board',{energy_ports:[port('a'),port('b'),port('c'),port('d')]}),
];
const connections=[
 connect('c1','pv','ac','panel','a'),
 connect('c2','grid','ac','panel','b'),
 connect('c3','home','ac','panel','c')
];
const cfg=(ns=nodes,cs=connections,entries=[],enabled=true)=>({studio_layout:{
  width:1200,height:720,nodes:ns,connections:cs,
  energy_balance:{enabled,tolerance_kw:.05,participants:entries}
}});
const readings={states:{}};
let solved=balance.resolve(layout.normalized(cfg(nodes,connections,[
  {node_id:'grid',mode:'calculate'}])),readings);
assert.equal(solved.networks.length,1);
let net=solved.networks[0];
assert.equal(net.state,'balanced');
assert.equal(net.devices.find(x=>x.node_id==='grid').source,'calculated');
assert.equal(net.devices.find(x=>x.node_id==='grid').injection_kw,.5);
assert.equal(net.totals.generation_kw,2.5);
assert.equal(net.totals.consumption_kw,3);
assert.equal(net.totals.grid_import_kw,.5);
assert.equal(net.connection_ids.length,3);
assert.equal(net.port_keys.length,4);
assert.equal(solved.warnings.length,0);
assert.deepEqual(JSON.parse(JSON.stringify(balance.normalize({enabled:true,participants:[{node_id:'pv',mode:'ha',entity:'sensor.pv',manual_kw:8}]}))).participants,
 [{node_id:'pv',port_id:'',mode:'ha',entity:'sensor.pv',manual_kw:8,reverse_sign:false,grid_strategy:'import_export'}]);
const roundtrip=layout.normalized({studio_layout:layout.normalized(cfg(nodes,connections,[
  {node_id:'grid',mode:'calculate'}]))});
assert.equal(JSON.stringify(roundtrip.energy_balance),
  JSON.stringify(layout.normalized(cfg(nodes,connections,[{node_id:'grid',mode:'calculate'}])).energy_balance));
const battery=node('storage','energy_storage',{energy_storage:{mode:'manual',manual:{soc:80,power:-1}}});
const batteryConnection=connect('c4','storage','ac','panel','d');
solved=balance.resolve(layout.normalized(cfg([...nodes,battery],[...connections,batteryConnection],
 [{node_id:'grid',mode:'calculate'}])),readings);
net=solved.networks[0];
assert.equal(net.state,'balanced');
assert.equal(net.devices.find(x=>x.node_id==='grid').injection_kw,-.5);
assert.equal(net.totals.grid_export_kw,.5);
assert.equal(net.totals.storage_discharge_kw,1);
// Device adapters preserve per-device sign and correct W -> kW normalization.
const liveNodes=[
  node('grid','power_grid'),
  node('pv','inverter',{inverter:{entities:{ac_power:'sensor.pv'}}}),
  node('home','building',{building:{power_entity:'sensor.house'}}),
  node('panel','distribution_board',{energy_ports:[port('a'),port('b'),port('c'),port('d')]})
];
const liveStates={states:{
 'sensor.pv':{state:'1200',attributes:{unit_of_measurement:'W'}},
 'sensor.house':{state:'2.0',attributes:{unit_of_measurement:'kW'}},
 'sensor.grid':{state:'0.8',attributes:{unit_of_measurement:'kW'}}
}};
solved=balance.resolve(layout.normalized(cfg(liveNodes,connections,[
  {node_id:'grid',mode:'ha',entity:'sensor.grid'}])),liveStates);
net=solved.networks[0];
assert.equal(net.state,'balanced');
assert.equal(net.totals.grid_import_kw,.8);
assert.equal(net.totals.generation_kw,1.2);
assert.equal(net.totals.consumption_kw,2);
const unknown=balance.resolve(layout.normalized(cfg(liveNodes,connections,[
  {node_id:'grid',mode:'calculate'}])),{states:{}});
assert.equal(unknown.networks[0].state,'insufficient');
assert.equal(unknown.networks[0].residual_kw,null);
assert.equal(unknown.networks[0].totals,null);
const excessive=balance.resolve(layout.normalized(cfg(nodes,connections,[
  {node_id:'grid',mode:'calculate'},{node_id:'pv',mode:'calculate'}])),readings);
assert.equal(excessive.networks[0].state,'insufficient');
assert(excessive.networks[0].reasons.includes('multiple_unknowns'));
const impossible=balance.resolve(layout.normalized(cfg(nodes,connections,[
  {node_id:'grid',mode:'manual',manual_kw:2}])),readings);
assert.equal(impossible.networks[0].state,'balanced');
assert.equal(impossible.networks[0].residual_kw,0);
assert.equal(impossible.networks[0].devices.find(d=>d.node_id==='grid').source,'calculated');
const invalid=balance.resolve(layout.normalized(cfg(nodes,connections,[
  {node_id:'pv',mode:'manual',manual_kw:-1},{node_id:'grid',mode:'calculate'}])),readings);
assert.equal(invalid.networks[0].state,'invalid');
assert(invalid.networks[0].reasons.includes('invalid_direction_or_power'));
const aggregate=balance.resolve(layout.normalized(cfg([
  ...nodes,node('garage','building',{building:{mode:'manual',power_kw:1,measurement:'individual'}})
], [...connections,connect('garage-link','garage','ac','panel','d')],[
  {node_id:'grid',mode:'calculate'},{node_id:'home',mode:'manual',manual_kw:3}
])),readings);
assert.equal(aggregate.networks[0].state,'balanced');
const aggregateConflict=balance.resolve(layout.normalized(cfg([
  ...nodes.map(n=>n.id==='home'?{...n,building:{mode:'manual',power_kw:3,measurement:'aggregate'}}:n),
  node('garage','building',{building:{mode:'manual',power_kw:1,measurement:'individual'}})
], [...connections,connect('garage-link','garage','ac','panel','d')],[
  {node_id:'grid',mode:'calculate'}
])),readings);
assert.equal(aggregateConflict.networks[0].state,'balanced'); // Independent board branch is not a child of the aggregate building.
assert(!aggregateConflict.networks[0].reasons.includes('aggregate_overlap'));

// No phantom connections through coordinates that happen to overlap.
const isolated=balance.resolve(layout.normalized(cfg([
 ...nodes,node('pv2','inverter',{inverter:{mode:'manual',manual:{ac_power:2,temperature:30}}}),
 node('home2','building',{building:{mode:'manual',power_kw:2}})
],[...connections,connect('separate','pv2','ac','home2','ac')],[{node_id:'grid',mode:'calculate'}])),readings);
assert.equal(isolated.networks.length,2);
assert(isolated.networks.every(x=>x.state==='balanced'));
const detached=balance.resolve(layout.normalized(cfg(nodes,[
 ...connections,connect('broken','grid','ac','missing','bad')
],[{node_id:'grid',mode:'calculate'}])),readings);
assert(detached.warnings.some(x=>x.reason==='missing_node'));
assert.equal(detached.networks[0].state,'balanced');
// Multiple PV sources connected to a single AC bus, with an explicitly solved grid.
const pv2=node('pv2','inverter',{inverter:{mode:'manual',manual:{ac_power:1.1,temperature:29}}});
const expandedPanel={...nodes.find(n=>n.id==='panel'),energy_ports:[
  port('a'),port('b'),port('c'),port('d'),port('e')]};
const extraResult=balance.resolve(layout.normalized(cfg([
  ...nodes.filter(n=>n.id!=='panel'),expandedPanel,pv2],
  [...connections,connect('extra-pv','pv2','ac','panel','e')],
  [{node_id:'grid',mode:'calculate'}])),readings);
assert.equal(extraResult.networks.length,1);
assert.equal(extraResult.networks[0].state,'balanced');
assert.equal(extraResult.networks[0].totals.generation_kw,3.6);
assert.equal(extraResult.networks[0].totals.grid_export_kw,.6);
// Distinguish direct signed grid import from import/export meter strategies.
const gridNative=balance.resolve(layout.normalized(cfg(liveNodes,connections,[
 {node_id:'grid',mode:'device',grid_strategy:'import_export'}])),{states:{
 ...liveStates.states,
 'sensor.grid_import':{state:'800',attributes:{unit_of_measurement:'W'}},
 'sensor.grid_export':{state:'0',attributes:{unit_of_measurement:'W'}}
}});
assert.equal(gridNative.networks[0].state,'balanced'); // Grid is the inferred residual without meter entities.
const acdc=balance.resolve(layout.normalized(cfg([
 node('battery','energy_storage',{energy_ports:[port('dc','dc')]}),
 node('grid','power_grid',{energy_ports:[port('ac','ac')]})
],[connect('bad-media','battery','dc','grid','ac')],[],true)),readings);
assert(acdc.warnings.some(w=>w.reason==='medium_mismatch'));
assert.equal(acdc.networks.length,0);
// A disconnected device must be reported, not silently added to a balance.
const detachedMeter=balance.resolve(layout.normalized(cfg([
  ...nodes,node('orphan','inverter',{inverter:{mode:'manual',manual:{ac_power:5,temperature:30}}})
],connections,[{node_id:'grid',mode:'calculate'}])),readings);
assert(detachedMeter.warnings.some(w=>w.reason==='unconnected_device'&&w.node_id==='orphan'));
assert.equal(detachedMeter.networks[0].totals.generation_kw,2.5);

const off=balance.resolve(layout.normalized(cfg(nodes,connections,[],false)),readings);
assert.equal(off.enabled,true); // Electrical cables now activate the display balance automatically.
assert(off.networks.length>0);
assert.equal(balance.haPower({states:{'sensor.invalid':{state:'99',attributes:{unit_of_measurement:'kWh'}}}},'sensor.invalid'),null);
assert.equal(balance.haPower({states:{'sensor.unknown':{state:'unavailable',attributes:{unit_of_measurement:'kW'}}}},'sensor.unknown'),null);
console.log('Energy balance: multi-node AC network, PV/grid/building/storage, HA/manual, unknown, contradictions and isolation PASS');
