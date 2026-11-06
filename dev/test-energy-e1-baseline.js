/* 07A.2-D.1-E.1: frozen AC contract + documented DC pre-refactor baseline.
 * This test intentionally captures current behavior; E.3 must update the
 * marked unresolved-DC expectations when its fix is introduced.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={isEnt:x=>typeof x==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(x)};
vm.createContext(ctx);
for(const f of ['ha-state.js','readout-scale.js','device-registry.js',
  'studio-viewport.js','device-parameters.js','inverter-readings.js',
  'inverter.js','building.js','ev-charger.js','energy-storage.js',
  'power-grid.js','distribution-board.js','radiator.js','manifold.js',
  'energy-topology.js','energy-converter.js','energy-balance.js',
  'energy-flow.js','energy-diagnostics.js','power-flow.js','studio-layout.js'])
 vm.runInContext(fs.readFileSync('src/'+f,'utf8'),ctx,{filename:f});
vm.runInContext('this.layout=HASSStudioLayout;this.balance=HASSStudioEnergyBalance;'+
 'this.flow=HASSStudioEnergyFlow;this.topology=HASSStudioEnergyTopology;'+
 'this.diagnostics=HASSStudioEnergyDiagnostics;',ctx);
const {layout,balance,flow,topology,diagnostics}=ctx;
const eq=(actual,expected)=>assert(Math.abs(actual-expected)<1e-6,actual+' != '+expected);
const pt=(id,medium='ac',bus=id)=>({id,medium,bus,label:id,x:50,y:50});
const node=(id,type,ports,rest={})=>({id,type,variant:'modern',x:25,y:25,
  scale:1,energy_ports:ports,...rest});
const wire=(id,a,ap,b,bp)=>({id,type:'electric',
  points:[{x:0,y:0},{x:40,y:0},{x:80,y:0}],
  energy_start:{node_id:a,port_id:ap},
  energy_end:{node_id:b,port_id:bp},
  animation:{flow_power_mode:'balance'}});
const grid=node('grid','power_grid',[pt('ac')],{energy_grid_auto:true});
const home=node('home','building',[pt('supply')],{
  energy_mode:'ha',building:{measurement:'aggregate',power_entity:'sensor.home'}});
const inverter=(hybrid=false)=>node('inv','inverter',[
  pt('ac'),pt('pv1','dc'),pt('pv2','dc'),pt('bat','dc','battery')],{
  energy_mode:'ha',
  inverter:{count:2,rated_kw:10,entities:{ac_power:'sensor.ac'},
    inputs:[
      {name:'PV1',required:true,entities:{power:'sensor.pv1'}},
      {name:'PV2',required:true,entities:{power:'sensor.pv2'}}],
    ...(hybrid?{hybrid:{schema_version:1,enabled:true,pv_ports:['',''],
      converter:{schema_version:1,enabled:true,pv_mode:'mapped',ac_mode:'auto',
        ac_port_id:'',battery_port_id:'',efficiency_percent:null,
        battery_efficiency_percent:null}}}:{})}});
const battery=(medium='dc')=>node('battery','energy_storage',
  [pt(medium,medium)],{energy_mode:'test',energy_storage:{
  coupling:'legacy',mode:'manual',charge_positive:true,
  manual:{power:1.5,soc:70}}});
const ac=[wire('inverter_ac','inv','ac','grid','ac'),
  wire('house_ac','grid','ac','home','supply')];
const hass={states:{
  'sensor.ac':{state:'3680',attributes:{unit_of_measurement:'W'}},
  'sensor.home':{state:'3680',attributes:{unit_of_measurement:'W'}},
  'sensor.pv1':{state:'0',attributes:{unit_of_measurement:'W'}},
  'sensor.pv2':{state:'3820',attributes:{unit_of_measurement:'W'}}
}};
const normalized=(nodes,connections)=>layout.normalized({studio_layout:{
  nodes,connections,energy_balance:{enabled:true},
  energy_diagnostics:{enabled:true}
}});
const participant=(network,id)=>network.devices.find(d=>d.node_id===id);
const acOnly=normalized([grid,home,inverter()],[...ac]);
const cleanBefore=JSON.stringify(acOnly);
let r=balance.resolve(acOnly,hass),n=r.networks.find(g=>g.medium==='ac');
assert.equal(n.state,'balanced');eq(n.residual_kw,0);
eq(participant(n,'inv').injection_kw,3.68);
eq(participant(n,'home').injection_kw,-3.68);
eq(participant(n,'grid').injection_kw,0);
assert.equal(participant(n,'inv').source,'measured');
assert.equal(participant(n,'home').source,'calculated');
assert.equal(participant(n,'home').power_model.source,'measured',
  'Aggregate building retains HA provenance but contributes calculated own load');
assert.equal(participant(n,'grid').source,'calculated');
assert.equal(r.converters.length,0);
assert.equal(r.networks.length,1);
assert.equal(JSON.stringify(acOnly),cleanBefore,'AC solve must be read-only');
assert.equal(JSON.stringify(layout.normalized({studio_layout:acOnly})),cleanBefore,
  'AC saved model round-trips without mutation');
const acFlows=flow.resolve(acOnly,hass).byConnection;
assert.equal(acFlows.inverter_ac.available,true);
assert.equal(acFlows.house_ac.available,true);
eq(Math.abs(acFlows.inverter_ac.kw),3.68);
eq(Math.abs(acFlows.house_ac.kw),3.68);
console.log('E.1 AC: measured inverter and house, zero grid and AC branch flows PASS');

// AC storage must remain AC and must not be silently reclassified DC.
const acStorage=battery('ac');
const houseForStorage=node('home','building',[pt('supply')],{
  energy_mode:'test',building:{measurement:'aggregate',power_kw:2.18}});
const layoutACStorage=normalized([grid,houseForStorage,inverter(),acStorage],
  [...ac,wire('battery_ac','grid','ac','battery','ac')]);
const oldAC=balance.resolve(layoutACStorage,hass);
const storageAC=oldAC.networks.find(g=>g.medium==='ac');
assert.equal(storageAC.state,'balanced');eq(storageAC.residual_kw,0);
eq(participant(storageAC,'battery').injection_kw,-1.5);
assert.equal(oldAC.networks.some(g=>g.medium==='dc'),false);
assert.equal(oldAC.storage_terminals.length,0);
assert.equal(oldAC.converters.length,0);
console.log('E.1 AC: legacy storage remains on AC with unchanged sign PASS');

// Reproduce the user's actual HA + TEST hybrid scenario before the E.3 fix.
const dcDiagram=normalized([grid,home,inverter(true),battery()],
  [...ac,wire('battery_dc','inv','bat','battery','dc')]);
const snapshot=JSON.stringify(dcDiagram);
const idx=topology.index(dcDiagram),discovered=topology.hybridAttachments(idx,'inv');
assert.equal(discovered.ac_port_id,'ac');
assert.equal(discovered.battery_port_id,'bat');
assert.equal(discovered.storage_links.length,1);
const dcResolved=balance.resolve(dcDiagram,hass);
assert.equal(dcResolved.converters.length,1);
const converter=dcResolved.converters[0];
assert.equal(converter.status,'unresolved');
assert.equal(converter.reason,'converter_unresolved_losses');
eq(converter.pv_kw,3.82);eq(converter.ac_kw,3.68);
eq(converter.battery_kw,1.5);
eq(converter.measurement_residual_kw,-1.36);
assert.equal(converter.loss_kw,null);
assert.equal(converter.efficiency_observed,null);
assert.equal(converter.ac_source,'measured');
const dcNetwork=dcResolved.networks.find(g=>g.medium==='dc');
const acNetwork=dcResolved.networks.find(g=>g.medium==='ac');
eq(participant(acNetwork,'inv').injection_kw,3.68);
assert.equal(participant(acNetwork,'inv').source,'measured');
assert.equal(acNetwork.state,'balanced');eq(acNetwork.residual_kw,0);
assert.equal(dcResolved.storage_terminals.length,1);
assert.equal(dcResolved.storage_terminals[0].connected,true);
assert.equal(dcResolved.storage_terminals[0].port_id,'dc');
eq(dcResolved.storage_terminals[0].injection_kw,-1.5);
// E.3: the battery-only DC bus is balanced independently of inverter losses.
// The measured AC and unresolved internal converter residual remain unchanged.
assert.equal(dcNetwork.state,'balanced');
eq(dcNetwork.residual_kw,0);
assert.equal(dcNetwork.devices.filter(d=>d.role==='converter').length,1);
const dcBoundary=dcNetwork.devices.find(d=>d.role==='converter');
eq(dcBoundary.injection_kw,1.5);
assert.equal(dcBoundary.source,'calculated');
assert.equal(dcBoundary.boundary_basis,'independent_storage_meter');
assert.equal(converter.battery_boundary_kw,1.5);
assert.equal(converter.battery_boundary_source,'calculated');
const dcFlow=flow.resolve(dcDiagram,hass).byConnection.battery_dc;
assert.equal(dcFlow.available,true);
eq(Math.abs(dcFlow.kw),1.5);
const diagnostic=diagnostics.viewModel(dcDiagram,hass);
assert.equal(diagnostic.converters[0].status,'unresolved');
assert.equal(diagnostic.converters[0].loss_kw,null);
assert.equal(diagnostic.networks.find(n=>n.medium==='dc').diagnostic_reason,null,
  'An enabled converter with a solved DC boundary must not be labelled missing');
const dcHtml=diagnostics.render(dcDiagram,hass,'pl');
assert(!dcHtml.includes('Brak modelu konwersji DC'));
assert(dcHtml.includes('straty i sprawność nieustalone'));
assert.equal(JSON.stringify(dcDiagram),snapshot,'Hybrid solve must not mutate graph');
assert.equal(JSON.stringify(layout.normalized({studio_layout:dcDiagram})),snapshot,
  'Hybrid config must round-trip exactly');
console.log('E.3 DC: corrected +1.500 kW boundary, measured AC and unresolved losses preserved PASS');

// Invalid AC/DC cable cannot join dissimilar media or inject inverter AC into DC.
const invalid=normalized([grid,inverter(),battery()],
  [wire('bad','inv','ac','battery','dc')]);
const invalidResult=balance.resolve(invalid,hass);
assert(invalidResult.warnings.some(w=>w.reason==='medium_mismatch'));
assert.equal(invalidResult.topology.edges.length,0);
console.log('PASS 07A.2-D.1-E.1: immutable AC guardrail and explicit DC migration baseline');
