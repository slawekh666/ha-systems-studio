/* Stage 07A.1-D.2-B: indexed per-graph port and hierarchy lookups. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={isEnt:id=>typeof id==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(id),portCalls:0};
vm.createContext(ctx);
for(const name of ['ha-state.js','readout-scale.js','device-registry.js','studio-viewport.js',
 'device-parameters.js','inverter-readings.js','inverter.js','building.js','ev-charger.js',
 'energy-storage.js','power-grid.js','distribution-board.js','radiator.js','manifold.js',
 'energy-topology.js','energy-balance.js','energy-flow.js','energy-diagnostics.js','power-flow.js','studio-layout.js']){
 let code=fs.readFileSync('src/'+name,'utf8');
 if(name==='energy-topology.js'){
  const from='const ports=n=>(Array.isArray(n?.energy_ports)?n.energy_ports:defaultPorts(n)).slice(0,MAX_PORTS)';
  const to='const ports=n=>(globalThis.portCalls++,(Array.isArray(n?.energy_ports)?n.energy_ports:defaultPorts(n))).slice(0,MAX_PORTS)';
  assert.equal(code.split(from).length,2,'Instrumented ports() signature changed');
  code=code.replace(from,to);
 }
 vm.runInContext(code,ctx,{filename:name});
}
vm.runInContext('this.topology=HASSStudioEnergyTopology;this.layout=HASSStudioLayout;this.flow=HASSStudioEnergyFlow;',ctx);
const pt=(id,medium='ac',bus='main')=>({id,label:id,medium,bus,x:50,y:50});
const n=(id,type,ports,extra={})=>({id,type,x:0,y:0,scale:1,energy_ports:ports,...extra});
const edge=(id,a,pa,b,pb)=>({id,type:'electric',points:[{x:0,y:0},{x:100,y:0}],
 energy_start:{node_id:a,port_id:pa},energy_end:{node_id:b,port_id:pb},animation:{flow_power_mode:'balance'}});
const grid=n('grid','power_grid',[pt('ac'),pt('dc','dc','dc')],{energy_grid_auto:true});
const board=n('board','distribution_board',[pt('grid'),pt('source'),pt('home'),pt('direct')]);
const home=kw=>n('home','building',[pt('supply'),pt('child')],{energy_mode:'test',building:{measurement:'aggregate',power_kw:kw}});
const pv=n('pv','inverter',[pt('ac')],{energy_mode:'test',inverter:{manual:{ac_power:5}}});
const ev=n('ev','ev_charger',[pt('ac')],{energy_mode:'test',ev_charger:{manual:{power:7.2}}});
const standard=[edge('gridline','grid','ac','board','grid'),edge('pvline','pv','ac','board','source'),
 edge('homeline','board','home','home','supply'),edge('evline','home','child','ev','ac')];
const all=[grid,board,home(50),pv,ev];
ctx.portCalls=0;
const graph=ctx.topology.graph({nodes:all,connections:[...standard,
 edge('parallel','grid','ac','board','grid'),edge('badport','board','missing','home','supply'),
 edge('crossmedium','grid','dc','board','grid')]});
assert.equal(ctx.portCalls,5,'Normalize each referenced device ports once per graph');
assert.equal(graph.edges.length,5);
assert.deepEqual(Array.from(graph.errors,e=>e.reason),['missing_port','medium_mismatch']);
const dup=n('duplicate','distribution_board',[pt('x','ac','a'),pt('x','dc','b'),pt('z','ac','a')]);
ctx.portCalls=0;
const duplicateGraph=ctx.topology.graph({nodes:[dup,grid],connections:[
 edge('d1','duplicate','x','grid','ac'),edge('d2','duplicate','x','grid','ac')]});
assert.equal(ctx.portCalls,2);
assert.equal(duplicateGraph.errors.length,0);
assert.equal(duplicateGraph.edges[0].from,'duplicate:ac:a','Preserve first duplicate port');
const solve=(nodes,connections)=>ctx.flow.resolve(ctx.layout.normalized({studio_layout:{
 nodes,connections,energy_balance:{enabled:true}}}),{states:{}});
const approx=(x,y)=>assert(Math.abs(x-y)<1e-6,String(x)+' != '+y);
let result=solve(all,standard),network=result.balance.networks[0];
assert.equal(network.state,'balanced');
approx(network.totals.consumption_kw,50);approx(network.totals.grid_import_kw,45);
approx(result.byConnection.evline.kw,7.2);
result=solve([grid,board,home(3),pv,ev],standard);
assert.equal(result.balance.networks[0].state,'invalid');
assert(result.balance.warnings.some(w=>w.reason==='building_child_exceeds_total'));
result=solve(all,[...standard,edge('bypass','board','direct','ev','ac')]);
assert.equal(result.balance.networks[0].state,'invalid');
assert(result.balance.warnings.some(w=>w.reason==='building_ambiguous_meter_path'));
const junction=n('junction','distribution_board',[pt('in'),pt('out'),pt('alternate')]);
result=solve([...all,junction],[...standard.slice(0,3),
 edge('housejunction','home','child','junction','in'),
 edge('junctionev','junction','out','ev','ac'),
 edge('junctionbypass','board','direct','junction','alternate')]);
assert.equal(result.balance.networks[0].state,'invalid');
assert(result.balance.warnings.some(w=>w.reason==='building_ambiguous_meter_path'));
result=solve(all,[...standard.slice(0,3),edge('evline','board','direct','ev','ac')]);
assert.equal(result.balance.networks[0].state,'balanced');
approx(result.balance.networks[0].totals.consumption_kw,57.2);
console.log('PASS 07A.1-D.2-B: port indexing, duplicate IDs, AC/DC isolation, meter ownership and bypass diagnostics.');
