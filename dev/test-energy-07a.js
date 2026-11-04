/* Stage 07A: runtime partial flows and visual grid/export controls. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={isEnt:id=>typeof id==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(id)};
vm.createContext(ctx);
for(const f of ['ha-state.js','readout-scale.js','device-registry.js','studio-viewport.js',
 'device-parameters.js','inverter-readings.js','inverter.js','building.js','ev-charger.js',
 'energy-storage.js','power-grid.js','distribution-board.js','radiator.js','manifold.js',
 'energy-topology.js','energy-balance.js','energy-flow.js','energy-diagnostics.js',
 'power-flow.js','studio-layout.js'])
 vm.runInContext(fs.readFileSync('src/'+f,'utf8'),ctx,{filename:f});
vm.runInContext('this.layout=HASSStudioLayout;this.flow=HASSStudioEnergyFlow;',ctx);
const port=id=>({id,medium:'ac',bus:'main',x:50,y:50});
const node=(id,type,other={})=>({id,type,x:0,y:0,scale:1,energy_ports:[port('ac')],...other});
const pv=(kw,allowed=true)=>node('pv','inverter',{energy_mode:'test',inverter:{
 export_allowed:allowed,manual:{ac_power:kw}}});
const home=(id,kw=null)=>node(id,'building',{energy_mode:kw===null?'ha':'test',
 building:{power_kw:kw??2,measurement:'individual'}});
const store=kw=>node('store','energy_storage',{energy_mode:'test',energy_storage:{manual:{power:kw}}});
const ev=kw=>node('ev','ev_charger',{energy_mode:'test',ev_charger:{manual:{power:kw}}});
const board=(connected=true)=>node('panel','distribution_board',{
 energy_grid_connected:connected,energy_ports:['a','b','c','d','e','f'].map(port)});
const grid=node('grid','power_grid');
const wire=(id,a,ap,b,bp)=>({id,type:'electric',points:[{x:0,y:0},{x:50,y:0}],
 energy_start:{node_id:a,port_id:ap},energy_end:{node_id:b,port_id:bp},
 animation:{flow_power_mode:'balance'}});
const base=[wire('pv','pv','ac','panel','a'),wire('store','store','ac','panel','b'),
 wire('home','home','ac','panel','c'),wire('grid','grid','ac','panel','d')];
const run=(nodes,cs=base)=>ctx.flow.resolve(ctx.layout.normalized({studio_layout:{
 nodes,connections:cs,energy_balance:{enabled:true}}}),{states:{}});
const get=(n,id)=>n.devices.find(e=>e.node_id===id);
const eq=(a,b)=>assert(Math.abs(a-b)<1e-6,String(a)+' != '+b);
let x=run([pv(10),store(5),home('home'),grid,board()]);
let n=x.balance.networks[0];assert.equal(n.state,'balanced');
eq(get(n,'home').injection_kw,-5);assert.equal(get(n,'home').source,'estimated');
eq(x.byConnection.home.kw,-5);eq(x.byConnection.grid.kw,0);
console.log('A: single unmetered home estimated from 10kW PV minus 5kW storage PASS');
x=run([pv(10),store(5),home('home'),grid,board(false)]);
assert.equal(x.balance.networks[0].state,'balanced');eq(x.byConnection.grid.kw,0);
console.log('B: disconnected grid is 0kW PASS');
const extra=[...base,wire('ev','ev','ac','panel','e'),wire('home2','home2','ac','panel','f')];
x=run([pv(10),store(5),home('home'),home('home2'),ev(2),grid,board()],extra);
assert.equal(x.balance.networks[0].state,'insufficient');
assert.equal(x.byConnection.home.available,false);
assert.equal(x.byConnection.home2.available,false);
assert.equal(x.byConnection.ev.available,true);
eq(Math.abs(x.byConnection.ev.kw),2);
eq(Math.abs(x.byConnection.store.kw),5);
console.log('C: known branches continue despite two unknown houses PASS');
x=run([pv(10),store(5),home('home'),ev(2),grid,board()],extra.slice(0,5));
assert.equal(x.balance.networks[0].state,'balanced');eq(get(x.balance.networks[0],'home').injection_kw,-3);
console.log('D: known EV load subtracted before estimated home PASS');
x=run([pv(10,false),store(5),home('home',1),grid,board()]);
assert.equal(x.balance.networks[0].state,'unaccounted');
eq(x.balance.networks[0].unaccounted_kw,4);
eq(x.balance.networks[0].totals.generation_kw,10);
eq(x.balance.networks[0].totals.grid_export_kw,0);
console.log('E: restricted inverter preserves 10kW generation and flags 4kW unaccounted PASS');
x=run([pv(10),store(5),home('home',1),grid,board(false)]);
assert.equal(x.balance.networks[0].state,'unaccounted');
eq(x.balance.networks[0].unaccounted_kw,4);
eq(x.balance.networks[0].totals.grid_export_kw,0);
console.log('F: isolated surplus is unaccounted, not exported PASS');
const twoPV=[...base,wire('pv2','pv2','ac','panel','e')];
const pv2=kw=>node('pv2','inverter',{energy_mode:'test',inverter:{manual:{ac_power:kw},export_allowed:true}});
x=run([pv(5,false),pv2(5),home('home',3),grid,board()],twoPV);
assert.equal(x.balance.networks[0].state,'unaccounted');
eq(x.balance.networks[0].unaccounted_kw,2);
eq(x.balance.networks[0].totals.generation_kw,10);
eq(x.balance.networks[0].totals.grid_export_kw,5);
console.log('G: restricted 5 + exportable 5 - house 3 => export 5, unaccounted 2 PASS');
x=run([pv(5,false),pv2(5),home('home',8),grid,board()],twoPV);
assert.equal(x.balance.networks[0].state,'balanced');
eq(x.balance.networks[0].unaccounted_kw,0);
eq(x.balance.networks[0].totals.grid_export_kw,2);
console.log('H: full local use of restricted inverter => zero unaccounted PASS');
console.log('PASS: Stage 07A');
