/* Stage 07A.1-B.1 — automatic hierarchy from actual saved editor port/bus data. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={isEnt:id=>typeof id==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(id)};
vm.createContext(context);
for(const f of ['ha-state.js','readout-scale.js','device-registry.js','studio-viewport.js',
 'device-parameters.js','inverter-readings.js','inverter.js','building.js','ev-charger.js',
 'energy-storage.js','power-grid.js','distribution-board.js','radiator.js','manifold.js',
 'energy-topology.js','energy-balance.js','energy-flow.js','energy-diagnostics.js',
 'power-flow.js','studio-layout.js'])
 vm.runInContext(fs.readFileSync('src/'+f,'utf8'),context,{filename:f});
vm.runInContext('this.layout=HASSStudioLayout;this.flow=HASSStudioEnergyFlow;this.topo=HASSStudioEnergyTopology;',context);
const pt=(id,medium='ac',bus='main')=>({id,label:id,medium,bus,x:50,y:50});
const node=(id,type,ports=[],extra={})=>({id,type,x:0,y:0,scale:1,energy_ports:ports,...extra});
const grid=node('grid','power_grid',[pt('ac')],{energy_grid_auto:true});
const pv=node('pv','inverter',[pt('ac')],{energy_mode:'test',inverter:{manual:{ac_power:5}}});
const board=node('board','distribution_board',[pt('network'),pt('solar'),pt('home'),pt('ev'),pt('h2'),pt('aux')]);
const house=(id,kw,mode='aggregate',ports=[pt('entrance'),pt('outlet')])=>
 node(id,'building',ports,{energy_mode:'test',building:{measurement:mode,power_kw:kw}});
const ev=node('ev','ev_charger',[pt('ladowarka')],{energy_mode:'test',ev_charger:{manual:{power:7.2}}});
const battery=node('battery','energy_storage',[pt('ac')],{energy_mode:'test',energy_storage:{manual:{power:1.5}}});
const wire=(id,a,pa,b,pb)=>({id,type:'electric',points:[{x:0,y:0},{x:100,y:0}],
 energy_start:{node_id:a,port_id:pa},energy_end:{node_id:b,port_id:pb},
 animation:{flow_power_mode:'balance'}});
const standard=[
 wire('gridline','grid','ac','board','network'),
 wire('pvline','pv','ac','board','solar'),
 wire('homeline','board','home','home','entrance'),
 wire('evline','home','outlet','ev','ladowarka')
];
const solve=(nodes,connections)=>context.flow.resolve(context.layout.normalized({studio_layout:{
 nodes,connections,energy_balance:{enabled:true}}}),{states:{}});
const approx=(a,b)=>assert(Math.abs(a-b)<1e-6,String(a)+' != '+b);
const device=(net,id)=>net.devices.find(d=>d.node_id===id);
const basic=[grid,pv,board,house('home',50),ev];
let x=solve(basic,standard),net=x.balance.networks[0];
assert.equal(net.state,'balanced');
approx(net.totals.consumption_kw,50);approx(net.totals.grid_import_kw,45);
approx(device(net,'home').power_model.own_consumption_kw,42.8);
approx(x.byConnection.homeline.kw,50);approx(x.byConnection.evline.kw,7.2);
console.log('A: arbitrary labels/ids, main bus => gross 50, not 57.2 PASS');
const renamed=house('home',50,'aggregate',[{...pt('custom_supply'),label:'Wejście budynku'}, {...pt('abc'),label:'Gniazdo ładowarki'}]);
const relabeled=[standard[0],standard[1],wire('homeline','board','home','home','custom_supply'),
 wire('evline','home','abc','ev','ladowarka')];
x=solve([grid,pv,board,renamed,ev],relabeled);net=x.balance.networks[0];
assert.equal(net.state,'balanced');approx(net.totals.consumption_kw,50);
console.log('B: hierarchy independent of supply/child textual port ids PASS');
const separate=[standard[0],standard[1],standard[2],wire('evline','board','ev','ev','ladowarka')];
x=solve(basic,separate);net=x.balance.networks[0];
assert.equal(net.state,'balanced');
approx(net.totals.consumption_kw,57.2);approx(net.totals.grid_import_kw,52.2);
console.log('C: EV connected directly to board must be counted independently PASS');
x=solve([grid,pv,board,house('home',3),ev],standard);net=x.balance.networks[0];
assert.equal(net.state,'invalid');assert(x.balance.warnings.some(w=>w.reason==='building_child_exceeds_total'));
console.log('D: 3 kW gross cannot cover 7.2 kW EV PASS');
const two=[...standard.slice(0,3),wire('h2','board','h2','home2','entrance'),
 wire('evline','home2','outlet','ev','ladowarka')];
x=solve([grid,pv,board,house('home',3),house('home2',10),ev],two);net=x.balance.networks[0];
assert.equal(net.state,'balanced');approx(net.totals.consumption_kw,13);
approx(device(net,'home2').power_model.own_consumption_kw,2.8);
console.log('E: EV belongs to building 2 only PASS');
const nested=[wire('gridline','grid','ac','home','entrance'),
 wire('home2','home','outlet','home2','entrance'),
 wire('evline','home2','outlet','ev','ladowarka')];
x=solve([grid,house('home',12),house('home2',9),ev],nested);net=x.balance.networks[0];
assert.equal(net.state,'balanced');approx(net.totals.consumption_kw,12);
approx(device(net,'home').power_model.own_consumption_kw,3);
approx(device(net,'home2').power_model.own_consumption_kw,1.8);
console.log('F: nested buildings cascade through nearest dominator PASS');
const acStorage=[...standard,wire('battery','board','aux','battery','ac')];
x=solve([...basic,battery],acStorage);net=x.balance.networks[0];
assert.equal(net.state,'balanced');approx(net.totals.consumption_kw,50);
approx(net.totals.storage_charge_kw,1.5);approx(net.totals.grid_import_kw,46.5);
console.log('G: 5 PV + 50 gross house incl EV + 1.5 battery AC => 46.5 import PASS');
const ring=[...standard,wire('bypass','board','ev','ev','ladowarka')];
x=solve(basic,ring);net=x.balance.networks[0];
assert.equal(net.state,'invalid');
assert(x.balance.warnings.some(w=>w.reason==='building_ambiguous_meter_path'));
assert.equal(x.byConnection.evline.available,false);
console.log('H: bypass/ring does not silently choose a parent PASS');
const customSeparateBus=house('home',50,'aggregate',[pt('entrance','ac','input'),pt('outlet','ac','output')]);
x=solve([grid,pv,board,customSeparateBus,ev],standard);
assert(x.balance.networks.length>1);
assert(x.balance.warnings.some(w=>w.reason==='unconnected_device')||x.balance.networks.some(n=>n.state!=='balanced'));
console.log('I: separate internal buses do not become fictitious shared main PASS');
const upstreamOnly=[wire('pvline','pv','ac','home','entrance'),wire('evline','home','outlet','ev','ladowarka')];
x=solve([pv,house('home',10),ev],upstreamOnly);net=x.balance.networks[0];
assert.equal(net.state,'balanced');approx(net.totals.consumption_kw,10);
console.log('J: single inverter supply without grid or board can root a tree PASS');
console.log('PASS: stage 07A.1-B.1 automatic building measurement hierarchy.');
