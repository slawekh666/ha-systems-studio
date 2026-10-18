/* Unified electric energy: HA priority, building hierarchy, unknowns and branch flows. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={isEnt:id=>typeof id==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(id)};
vm.createContext(ctx);
for(const file of ['ha-state.js','readout-scale.js','device-registry.js','studio-viewport.js',
  'inverter.js','building.js','ev-charger.js','energy-storage.js','power-grid.js',
  'distribution-board.js','radiator.js','manifold.js','energy-topology.js',
  'energy-balance.js','energy-flow.js','energy-diagnostics.js','power-flow.js','studio-layout.js']){
  vm.runInContext(fs.readFileSync('src/'+file,'utf8'),ctx,{filename:file});
}
vm.runInContext('this.layout=HASSStudioLayout;this.balance=HASSStudioEnergyBalance;this.flow=HASSStudioEnergyFlow;',ctx);
const {layout,balance,flow}=ctx;
const p=(id,x,bus='main')=>({id,medium:'ac',bus,x,y:50});
const node=(id,type,opts={})=>({id,type,variant:'modern',x:30,y:20,scale:1,energy_ports:[p('ac',50)],...opts});
const home=(id,total,more={})=>node(id,'building',{
  energy_ports:[p('supply',0),p('child',100)],energy_fallback_enabled:true,
  building:{mode:'manual',power_kw:total,measurement:'aggregate',...more}});
const grid=node('grid','power_grid',{energy_grid_auto:true,power_grid:{mode:'manual'}});
const boiler=node('boiler','boiler',{variant:'electric_modern',energy_fallback_enabled:true,energy_manual_kw:2});
const pump=node('pump','pump',{energy_fallback_enabled:true,energy_manual_kw:0.05});
const edge=(id,a,aport,b,bport)=>({id,type:'electric',points:[{x:5,y:3},{x:12,y:3}],
  energy_start:{node_id:a,port_id:aport},energy_end:{node_id:b,port_id:bport},
  animation:{flow_power_mode:'balance'}});
const standard=[edge('supply','grid','ac','home','supply'),edge('boiler','home','child','boiler','ac'),edge('pump','home','child','pump','ac')];
const cfg=(nodes,cs,scenario='hybrid')=>layout.normalized({studio_layout:{
  nodes,connections:cs,energy_balance:{enabled:true,scenario,participants:[]}
}});
const solve=(nodes,cs=standard,h={states:{}})=>flow.resolve(cfg(nodes,cs),h);
const entry=(net,id)=>net.devices.find(e=>e.node_id===id);
const almost=(a,b)=>assert(Math.abs(a-b)<1e-6,String(a)+' != '+b);

const hn=home('home',3.5);
let outcome=solve([grid,hn,boiler,pump]),net=outcome.balance.networks[0];
assert.equal(net.state,'balanced');
almost(entry(net,'home').injection_kw,-1.45);
almost(entry(net,'boiler').injection_kw,-2);
almost(entry(net,'pump').injection_kw,-0.05);
almost(entry(net,'grid').injection_kw,3.5);
almost(net.totals.consumption_kw,3.5);
almost(outcome.byConnection.supply.kw,3.5);
almost(Math.abs(outcome.byConnection.boiler.kw),2);
assert.equal(outcome.balance.warnings.length,0);

// Without an aggregate meter, the home contributes only its remaining household load.
const noMeter=home('home',100,{measurement:'individual',remaining_enabled:true,remaining_kw:.5});
net=solve([grid,noMeter,boiler,pump]).balance.networks[0];
assert.equal(net.state,'balanced');almost(entry(net,'home').injection_kw,-.5);
almost(entry(net,'grid').injection_kw,2.55);

// A child building can itself have a nested measured load; descendants count once.
const nested=home('nested',2);
const nestedPump=node('nested_pump','pump',{energy_fallback_enabled:true,energy_manual_kw:1});
const second=[edge('ng','grid','ac','home','supply'),
  edge('nh','home','child','nested','supply'),edge('nb','home','child','boiler','ac'),
  edge('np','nested','child','nested_pump','ac')];
net=solve([grid,home('home',5),nested,boiler,nestedPump],second).balance.networks[0];
assert.equal(net.state,'balanced');
almost(entry(net,'home').injection_kw,-1);
almost(entry(net,'nested').injection_kw,-1);
almost(net.totals.consumption_kw,5);
almost(entry(net,'grid').injection_kw,5);

// HA takes priority over manual backup, including zero as an actual reading.
const measured=home('home',9,{power_entity:'sensor.house'});
let hass={states:{'sensor.house':{state:'3500',attributes:{unit_of_measurement:'W'}}}};
net=solve([grid,measured,boiler,pump],standard,hass).balance.networks[0];
assert.equal(net.state,'balanced');almost(entry(net,'home').aggregate_total_kw,3.5);
assert.equal(entry(net,'home').source,'calculated');
hass={states:{'sensor.house':{state:'unavailable',attributes:{unit_of_measurement:'W'}}}};
net=solve([grid,measured,boiler,pump],standard,hass).balance.networks[0];
assert.equal(net.state,'balanced');almost(entry(net,'home').aggregate_total_kw,9);
const disabled={...measured,energy_fallback_enabled:false};
net=solve([grid,disabled,boiler,pump],standard,hass).balance.networks[0];
assert.equal(net.state,'insufficient');
const zero=home('home',0);
net=solve([grid,zero,boiler,pump]).balance.networks[0];
assert.equal(net.state,'invalid');
assert(net.reasons.includes('invalid_direction_or_power'));
assert(solve([grid,zero,boiler,pump]).balance.warnings.some(x=>x.reason==='building_child_exceeds_total'));

// Grid HA import/export readings win against the calculated value, even when inconsistent.
const liveGrid={...grid,power_grid:{mode:'live',entities:{import_kw:'sensor.import',export_kw:'sensor.export'}}};
hass={states:{
  'sensor.import':{state:'3.5',attributes:{unit_of_measurement:'kW'}},
  'sensor.export':{state:'0',attributes:{unit_of_measurement:'kW'}}
}};
net=solve([liveGrid,hn,boiler,pump],standard,hass).balance.networks[0];
assert.equal(net.state,'balanced');assert.equal(entry(net,'grid').source,'measured');
hass.states['sensor.import'].state='2';
net=solve([liveGrid,hn,boiler,pump],standard,hass).balance.networks[0];
assert.equal(net.state,'unbalanced');

console.log('Unified energy: building subtree, nested loads, HA priority, missing/zero sensors, grid import and flow PASS');
