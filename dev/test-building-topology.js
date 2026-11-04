/* Stage 07A.1-B: building scopes and AC descendant power. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={isEnt:x=>typeof x==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(x)};
vm.createContext(context);
for(const f of ['ha-state.js','readout-scale.js','device-registry.js','studio-viewport.js',
 'device-parameters.js','inverter-readings.js','inverter.js','building.js','ev-charger.js',
 'energy-storage.js','power-grid.js','distribution-board.js','radiator.js','manifold.js',
 'energy-topology.js','energy-balance.js','energy-flow.js','energy-diagnostics.js',
 'power-flow.js','studio-layout.js'])
 vm.runInContext(fs.readFileSync('src/'+f,'utf8'),context,{filename:f});
vm.runInContext('this.layout=HASSStudioLayout;this.flow=HASSStudioEnergyFlow;',context);
const port=(id,medium='ac',bus='main')=>({id,medium,bus,x:50,y:50});
const node=(id,type,props={})=>({id,type,x:0,y:0,scale:1,energy_ports:[port('ac')],...props});
const grid=node('grid','power_grid',{energy_grid_auto:true});
const panel=node('panel','distribution_board',{energy_ports:['a','b','c','d','e','f'].map(k=>port(k))});
const inverter=(id,kw)=>node(id,'inverter',{energy_mode:'test',inverter:{manual:{ac_power:kw}}});
const house=(id,kw,measurement='aggregate')=>node(id,'building',{energy_mode:'test',
 energy_ports:[port('supply'),port('child')],
 building:{measurement,power_kw:kw}});
const ev=(kw)=>node('ev','ev_charger',{energy_mode:'test',ev_charger:{manual:{power:kw}}});
const battery=(kw)=>node('battery','energy_storage',{energy_mode:'test',
 energy_storage:{manual:{power:kw},charge_positive:true}});
const edge=(id,a,ap,b,bp)=>({id,type:'electric',points:[{x:0,y:0},{x:20,y:0}],
 energy_start:{node_id:a,port_id:ap},energy_end:{node_id:b,port_id:bp},
 animation:{flow_power_mode:'balance'}});
const basic=[edge('gridlink','grid','ac','panel','a'),
 edge('pvlink','pv','ac','panel','b'),
 edge('homelink','panel','c','home','supply'),
 edge('evlink','home','child','ev','ac')];
const solve=(nodes,connections)=>context.flow.resolve(context.layout.normalized({studio_layout:{
 nodes,connections,energy_balance:{enabled:true}}}),{states:{}});
const approx=(a,b)=>assert(Math.abs(a-b)<1e-6,String(a)+' != '+b);
const device=(net,id)=>net.devices.find(d=>d.node_id===id);
let x=solve([grid,panel,inverter('pv',5),house('home',50),ev(7.2)],basic);
let n=x.balance.networks[0];assert.equal(n.state,'balanced');
approx(n.totals.consumption_kw,50);approx(n.totals.grid_import_kw,45);
approx(device(n,'home').injection_kw,-42.8);
approx(device(n,'home').power_model.measured_kw,50);
approx(device(n,'home').power_model.children_consumption_kw,7.2);
approx(device(n,'home').power_model.net_supply_kw,50);
approx(x.byConnection.homelink.kw,50);approx(x.byConnection.evlink.kw,7.2);
console.log('A: gross 50 + child 7.2 => total 50, incoming 50, grid 45 PASS');
x=solve([grid,panel,inverter('pv',5),house('home',2,'individual'),ev(7.2)],basic);
n=x.balance.networks[0];assert.equal(n.state,'balanced');
approx(n.totals.consumption_kw,9.2);
approx(n.totals.grid_import_kw,4.2);
approx(x.byConnection.homelink.kw,9.2);
console.log('B: own 2 + child 7.2 => branch 9.2, grid 4.2 PASS');
x=solve([grid,panel,inverter('pv',5),house('home',3),ev(7.2)],basic);
n=x.balance.networks[0];assert.equal(n.state,'invalid');
assert(x.balance.warnings.some(w=>w.reason==='building_child_exceeds_total'));
assert.equal(device(n,'home').power_model.status,'invalid');
assert.equal(x.byConnection.homelink.available,false);
console.log('C: gross 3 < child 7.2 is a diagnostic error, not phantom load PASS');
const withStorage=[...basic,edge('battery','home','child','battery','ac')];
x=solve([grid,panel,inverter('pv',0),house('home',10),ev(7),battery(4)],withStorage);
n=x.balance.networks[0];assert.equal(n.state,'balanced');
approx(device(n,'home').power_model.own_consumption_kw,3);
approx(device(n,'home').power_model.gross_consumption_kw,10);
approx(device(n,'home').power_model.net_supply_kw,6);
approx(n.totals.grid_import_kw,14); // charging adds to gross 10 kW
console.log('D: AC storage charge + EV share gross meter without double-count PASS');
x=solve([grid,panel,inverter('pv',0),house('home',10),ev(7),battery(-4)],withStorage);
n=x.balance.networks[0];assert.equal(n.state,'balanced');
approx(device(n,'home').power_model.net_supply_kw,6);
approx(n.totals.grid_import_kw,6);
console.log('E: discharging AC storage supplies 4 kW inside a 10 kW gross house PASS');
x=solve([grid,panel,inverter('pv',0),house('home',6,'net'),ev(7),battery(-4)],withStorage);
n=x.balance.networks[0];assert.equal(n.state,'balanced');
approx(device(n,'home').power_model.own_consumption_kw,3);
approx(device(n,'home').injection_kw,-3);
approx(n.totals.grid_import_kw,6);
console.log('F: net supply meter +6 kW yields 3 kW own demand PASS');
const sourceInside=[...basic,edge('pvchild','home','child','childpv','ac')];
x=solve([grid,panel,inverter('pv',0),house('home',3,'net'),ev(7),inverter('childpv',5)],sourceInside);
n=x.balance.networks[0];assert.equal(n.state,'balanced');
approx(device(n,'home').power_model.own_consumption_kw,1);
approx(n.totals.grid_import_kw,3);
console.log('G: source behind child can offset demand at a net boundary PASS');
const withNested=[edge('main','grid','ac','home','supply'),
 edge('nested','home','child','nested','supply'),
 edge('nv','nested','child','ev','ac')];
x=solve([grid,house('home',12),house('nested',9),ev(7)],withNested);
n=x.balance.networks[0];assert.equal(n.state,'balanced');
approx(device(n,'nested').power_model.own_consumption_kw,2);
approx(device(n,'home').power_model.own_consumption_kw,3);
approx(x.byConnection.main.kw,12);
console.log('H: nested measured buildings contribute gross consumption once PASS');
const empty=solve([grid,panel,inverter('pv',0),house('home',0,'net'),ev(0)],basic);
assert.equal(empty.balance.networks[0].state,'balanced');
assert.equal(device(empty.balance.networks[0],'home').power_model.status,'complete');
console.log('I: measured zero stays zero PASS');
console.log('PASS: Stage 07A.1-B building-topology regression.');
