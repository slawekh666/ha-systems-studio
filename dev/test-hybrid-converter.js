/* 07A.2-D — bounded, opt-in hybrid converter constraints and provenance. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={isEnt:id=>typeof id==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(id)};
vm.createContext(ctx);
for(const file of ['ha-state.js','readout-scale.js','device-registry.js','studio-viewport.js',
 'device-parameters.js','inverter-readings.js','inverter.js','building.js','ev-charger.js',
 'energy-storage.js','power-grid.js','distribution-board.js','radiator.js','manifold.js',
 'energy-topology.js','energy-converter.js','energy-balance.js','energy-flow.js',
 'energy-diagnostics.js','power-flow.js','studio-layout.js'])
 vm.runInContext(fs.readFileSync('src/'+file,'utf8'),ctx,{filename:file});
vm.runInContext('this.converter=HASSStudioEnergyConverter;this.inv=HASSStudioInverter;'+
 'this.balance=HASSStudioEnergyBalance;this.layout=HASSStudioLayout;'+
 'this.flow=HASSStudioEnergyFlow;this.diag=HASSStudioEnergyDiagnostics;',ctx);
const {converter,inv,balance,layout,flow,diag}=ctx;
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,String(a)+' ≠ '+String(b));
function evaluate(o){return converter.evaluate({...o,rated_kw:10});}
let x=evaluate({pv_kw:5,battery_kw:0,ac_kw:4.8,ac_source:'measured'});
assert.equal(x.status,'valid');near(x.loss_kw,.2);near(x.efficiency_observed,96);
x=evaluate({pv_kw:0,battery_kw:3,ac_kw:-3.3,ac_source:'measured'});
assert.equal(x.status,'valid');near(x.loss_kw,.3);
x=evaluate({pv_kw:0,battery_kw:-2,ac_kw:1.8,ac_source:'measured'});
assert.equal(x.status,'valid');near(x.loss_kw,.2);
x=evaluate({pv_kw:0,battery_kw:0,ac_kw:0,ac_source:'measured'});
assert.equal(x.status,'valid');assert.equal(x.loss_kw,0);
x=evaluate({pv_kw:3.04,battery_kw:1.5,ac_kw:5,ac_source:'simulated'});
assert.equal(x.status,'unresolved');assert.equal(x.reason,'converter_unresolved_losses');
assert.equal(x.ac_kw,5);assert.equal(x.loss_kw,null);assert.equal(x.efficiency_observed,null);
near(x.measurement_residual_kw,-3.46);
x=evaluate({pv_kw:null,battery_kw:1.5,ac_kw:2});
assert.equal(x.status,'missing');assert.equal(x.reason,'converter_missing_dc_observation');
x=evaluate({pv_kw:3.04,battery_kw:1.5,ac_kw:null});
assert.equal(x.status,'missing');assert.equal(x.reason,'converter_efficiency_or_ac_missing');
x=evaluate({pv_kw:3.04,battery_kw:1.5,ac_kw:null,efficiency_percent:96});
assert.equal(x.status,'missing');assert.equal(x.reason,'converter_battery_efficiency_missing');
x=evaluate({pv_kw:3.04,battery_kw:1.5,ac_kw:null,ac_mode:'calculate',
 efficiency_percent:96,battery_efficiency_percent:100});
assert.equal(x.status,'estimated');near(x.ac_kw,1.4784);near(x.loss_kw,.0616);
x=evaluate({pv_kw:3.04,battery_kw:1.5,ac_kw:null,ac_mode:'calculate',
 efficiency_percent:96,battery_efficiency_percent:96});
assert.equal(x.status,'estimated');near(x.ac_kw,1.4184);near(x.loss_kw,.1216);
x=evaluate({pv_kw:0,battery_kw:-2,ac_kw:null,ac_mode:'calculate',
 efficiency_percent:96,battery_efficiency_percent:96});
assert.equal(x.status,'estimated');near(x.ac_kw,1.8432);
x=evaluate({pv_kw:0,battery_kw:3,ac_kw:null,ac_mode:'calculate',
 efficiency_percent:96,battery_efficiency_percent:100});
assert.equal(x.status,'estimated');near(x.ac_kw,-3.125);
x=evaluate({pv_kw:3.04,battery_kw:1.5,ac_kw:5,ac_mode:'calculate',
 efficiency_percent:96,battery_efficiency_percent:100});
assert.equal(x.status,'unresolved');assert.equal(x.ac_kw,5);assert.equal(x.loss_kw,null);
x=evaluate({pv_kw:3.04,battery_kw:0,ac_kw:20});
assert.equal(x.status,'invalid');assert.equal(x.reason,'converter_ac_over_rating');
const pt=(id,medium='ac',bus='main')=>({id,label:id,medium,bus,x:50,y:50});
const node=(id,type,ports,attrs={})=>({id,type,x:20,y:30,scale:1,energy_ports:ports,...attrs});
const cable=(id,an,ap,bn,bp)=>({id,type:'electric',points:[{x:0,y:0},{x:95,y:0}],
 energy_start:{node_id:an,port_id:ap},energy_end:{node_id:bn,port_id:bp},
 animation:{flow_power_mode:'balance'}});
const makeInverter=(ac=5,opts={})=>{
 const c={schema_version:1,enabled:true,ac_port_id:'ac',
   battery_port_id:'bat',pv_mode:'mapped',ac_mode:'auto',
   efficiency_percent:null,battery_efficiency_percent:null,...opts};
 return node('sofar','inverter',[pt('ac'),pt('pv1','dc','pv1'),pt('bat','dc','battery')],{
  label:'Sofar',energy_mode:'test',energy_test_configured:ac!==null,inverter:{count:1,rated_kw:10,
   manual:{ac_power:ac},inputs:[{name:'PV1',
    manual:{voltage:380,current:8,power:null},
    manual_enabled:{voltage:true,current:true,power:false}}],
   hybrid:{schema_version:1,enabled:true,pv_ports:['pv1'],converter:c}}});
};
const grid=node('grid','power_grid',[pt('ac')],{energy_grid_auto:true});
const battery=(kw)=>node('battery','energy_storage',[pt('dc','dc')],{
 energy_mode:'test',energy_storage:{coupling:'dc',coupling_port_id:'dc',
 charge_positive:true,mode:'manual',manual:{soc:75,power:kw}}});
const acWire=cable('ac_wire','sofar','ac','grid','ac'),
 dcWire=cable('dc_wire','sofar','bat','battery','dc');
const makeLayout=(inverter=makeInverter(),store=battery(1.5),
 edges=[acWire,dcWire])=>layout.normalized({studio_layout:{
  nodes:[grid,inverter,...(store?[store]:[])],connections:edges,
  energy_balance:{enabled:true},energy_diagnostics:{enabled:true}
 }});
let diagram=makeLayout(),res=balance.resolve(diagram,{states:{}});
assert.equal(res.converters.length,1);
assert.equal(res.converters[0].status,'unresolved');
assert.equal(res.converters[0].reason,'converter_unresolved_losses');
assert(res.warnings.some(w=>w.reason==='converter_unresolved_losses'));
assert.equal(res.converters[0].ac_kw,5);
assert.equal(res.converters[0].loss_kw,null);
assert.equal(res.networks.find(n=>n.medium==='dc').state,'unbalanced');
assert.equal(res.networks.find(n=>n.medium==='dc').residual_kw,-1.5);
assert.equal(res.networks.find(n=>n.medium==='dc').devices.length,1);
assert(!res.warnings.some(w=>w.reason==='pv_dc_unconnected_port'),
 'With a measured MPPT on an opt-in converter a separate PV cable is optional');
const badHtml=diag.render(diagram,{states:{}},'pl');
assert(badHtml.includes('Straty nieustalone'));
assert(!badHtml.includes('energia wyjściowa przewyższa wejściową'));
assert(badHtml.includes('straty i sprawność nieustalone'));
assert(!badHtml.includes('MPPT NaN'));
const estimated=makeInverter(null,{ac_mode:'calculate',efficiency_percent:96,
 battery_efficiency_percent:100});
diagram=makeLayout(estimated);res=balance.resolve(diagram,{states:{}});
assert.equal(res.converters[0].status,'estimated');
near(res.converters[0].ac_kw,1.4784);near(res.converters[0].loss_kw,.0616);
const dcn=res.networks.find(n=>n.medium==='dc'),acn=res.networks.find(n=>n.medium==='ac');
assert.equal(dcn.state,'balanced');near(dcn.residual_kw,0);
assert.equal(dcn.devices.length,2);
assert.equal(dcn.devices.find(d=>d.role==='converter').injection_kw,1.5);
assert.equal(dcn.devices.filter(d=>d.node_id==='battery').length,1,'No storage double counting');
assert.equal(dcn.converter_transfer_kw,1.5);
assert.equal(acn.state,'balanced');near(acn.devices.find(d=>d.node_id==='sofar').injection_kw,1.4784);
assert.equal(acn.devices.find(d=>d.node_id==='sofar').source,'estimated');
assert.equal(flow.resolve(diagram,{states:{}}).byConnection.dc_wire.available,true);
assert(diag.render(diagram,{states:{}},'pl').includes('Przekształtniki AC/DC'));
assert(diag.render(diagram,{states:{}},'pl').includes('1.478 kW'));
const roundTrip=JSON.stringify(diagram);
const reloaded=layout.normalized({studio_layout:JSON.parse(roundTrip)});
assert.equal(JSON.stringify(reloaded),roundTrip);
assert.equal(reloaded.nodes.find(n=>n.id==='sofar').inverter.hybrid.converter.battery_efficiency_percent,100);
const missing=makeInverter(null,{ac_mode:'calculate',efficiency_percent:96});
res=balance.resolve(makeLayout(missing),{states:{}});
assert.equal(res.converters[0].reason,'converter_battery_efficiency_missing');
assert.equal(res.networks.find(n=>n.medium==='dc').state,'unbalanced');
assert.equal(res.networks.find(n=>n.medium==='ac').state,'insufficient',
 'Missing TEST AC must not leak a fabricated value');
// Explicit HA power is never overridden by efficiency assumptions.
const priority=makeInverter(5,{ac_mode:'calculate',efficiency_percent:96,battery_efficiency_percent:100});
priority.inverter.entities={ac_power:'sensor.inverter_ac'};
priority.energy_mode='auto';
priority.energy_fallback_enabled=true; // PV TEST fallback; HA AC still has priority.
priority.inverter.manual_enabled={ac_power:true};
res=balance.resolve(makeLayout(priority),{states:{'sensor.inverter_ac':{
 state:'4.5',attributes:{unit_of_measurement:'kW'}}}});
assert.equal(res.converters[0].ac_kw,4.5);
assert.equal(res.converters[0].ac_source,'measured');
assert.equal(res.converters[0].loss_kw,null);
const direct=makeInverter(1.4);
res=balance.resolve(makeLayout(direct),{states:{}});
assert.equal(res.converters[0].status,'valid');near(res.converters[0].loss_kw,.14);
assert.equal(res.networks.find(n=>n.medium==='ac').devices.find(d=>d.node_id==='sofar').source,'simulated');
const charge=makeInverter(-3.3,{pv_mode:'none'});
res=balance.resolve(makeLayout(charge,battery(3)),{states:{}});
assert.equal(res.converters[0].status,'valid');near(res.converters[0].loss_kw,.3);
assert.equal(res.networks.find(n=>n.medium==='ac').state,'balanced');
assert.equal(res.networks.find(n=>n.medium==='dc').state,'balanced');
const discharge=makeInverter(1.8,{pv_mode:'none'});
res=balance.resolve(makeLayout(discharge,battery(-2)),{states:{}});
assert.equal(res.converters[0].status,'valid');near(res.converters[0].loss_kw,.2);
assert.equal(res.networks.find(n=>n.medium==='dc').state,'balanced');
// Physically shared DC buses must be rejected even if the PV input does not
// have a separate drawn cable.
const sameBus=makeInverter(1.4);
sameBus.energy_ports.find(p=>p.id==='pv1').bus='battery';
res=balance.resolve(makeLayout(sameBus),{states:{}});
assert.equal(res.converters[0].reason,'converter_pv_battery_bus_overlap');
assert.equal(res.networks.find(n=>n.medium==='dc').residual_kw,-1.5);
// Direct PV power inconsistent with V×A must not be used to derive flows.
const conflict=makeInverter(1.4);
conflict.inverter.inputs[0].manual.power=100;
conflict.inverter.inputs[0].manual_enabled.power=true;
res=balance.resolve(makeLayout(conflict),{states:{}});
assert.equal(res.converters[0].reason,'converter_pv_reading_conflict');
assert.equal(res.networks.find(n=>n.medium==='dc').state,'unbalanced');
const noBattery=makeInverter(3,{battery_port_id:'none'});
res=balance.resolve(makeLayout(noBattery,null,[acWire]),{states:{}});
assert.equal(res.converters[0].status,'valid');near(res.converters[0].loss_kw,.04);
assert.equal(res.converters[0].battery_kw,0);
const old=makeInverter(5);delete old.inverter.hybrid.converter;
res=balance.resolve(makeLayout(old),{states:{}});
assert.equal(res.converters.length,0);
assert.equal(res.networks.find(n=>n.medium==='dc').residual_kw,-1.5);
assert.equal(res.networks.find(n=>n.medium==='ac').devices.find(d=>d.node_id==='sofar').injection_kw,5);
const oldReverse=makeInverter(-3.3);delete oldReverse.inverter.hybrid.converter;
res=balance.resolve(makeLayout(oldReverse,battery(3)),{states:{}});
assert(res.networks.find(n=>n.medium==='ac').state==='invalid');
assert.equal(inv.normalize({type:'inverter',inverter:{}}).hybrid,undefined);
const code=[fs.readFileSync('src/studio-inspector.js','utf8'),
 fs.readFileSync('src/studio-custom.js','utf8')];
assert(code[0].includes("'inv_converter_enabled'"));
assert(code[0].includes("'inv_converter_battery_efficiency_percent'"));
assert(code[1].includes("k.startsWith('converter_')"));
console.log('PASS 07A.2-D: PV/AC/battery conservation, losses, explicit assumptions, signed flow and legacy isolation.');
