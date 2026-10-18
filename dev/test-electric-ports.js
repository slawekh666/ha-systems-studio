/* Electrical topology and diagnostics regression for mixed AC/DC buses, auto-attachment. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={isEnt:id=>typeof id==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(id)};
vm.createContext(ctx);
for(const f of ['ha-state.js','readout-scale.js','device-registry.js','studio-viewport.js',
 'inverter.js','building.js','ev-charger.js','energy-storage.js','power-grid.js',
 'distribution-board.js','radiator.js','manifold.js','energy-topology.js',
 'energy-balance.js','energy-flow.js','energy-diagnostics.js','power-flow.js','studio-layout.js'])
 vm.runInContext(fs.readFileSync('src/'+f,'utf8'),ctx,{filename:f});
vm.runInContext('this.layout=HASSStudioLayout;this.flow=HASSStudioEnergyFlow;this.topo=HASSStudioEnergyTopology;this.diag=HASSStudioEnergyDiagnostics;',ctx);
const {layout,flow,topo,diag}=ctx;
const pt=(id,medium='ac',bus='main',x=50,y=50)=>({id,medium,bus,x,y});
const node=(id,type,energy_ports,extras={})=>({id,type,variant:'modern',x:0,y:0,scale:1,energy_ports,...extras});
const pv=node('pv','inverter',[pt('ac'),pt('pv1','dc','main')],{inverter:{mode:'manual',manual:{ac_power:6.4}}});
const board=node('board','distribution_board',[pt('left'),pt('right')]);
const house=node('home','building',[pt('supply')],{building:{mode:'manual',power_kw:2}});
const grid=node('grid','power_grid',[pt('ac')],{energy_grid_auto:true,power_grid:{mode:'manual',manual:{total_kw:50}}});
const cable=(id,a,ap,b,bp,mode='balance')=>({
 id,type:'electric',points:[{x:1,y:2},{x:12,y:2},{x:30,y:3}],
 energy_start:{node_id:a,port_id:ap},energy_end:{node_id:b,port_id:bp},
 animation:{flow_power_mode:mode}
});
const wires=[cable('pvboard','pv','ac','board','left'),
 cable('houseboard','home','supply','board','right'),
 cable('gridboard','grid','ac','board','left','off')];
const model=layout.normalized({studio_layout:{
 nodes:[pv,board,house,grid],connections:wires,
 energy_balance:{enabled:true,scenario:'hybrid',participants:[]},
 energy_diagnostics:{enabled:true}
}});
const current=flow.resolve(model,{states:{}});
assert.equal(current.balance.networks[0].state,'balanced');
assert.equal(current.balance.warnings.filter(w=>w.reason==='bus_medium_mismatch').length,0);
assert.equal(current.byConnection.pvboard.available,true);
assert.equal(current.byConnection.pvboard.kw,6.4);
assert.equal(current.byConnection.gridboard.available,true);
const display=diag.viewModel(model,{states:{}});
assert.equal(display.cables.length,3);
assert(display.cables.some(c=>c.id==='gridboard'&&c.mode==='off'));
assert(display.cables.some(c=>c.id==='pvboard'&&c.name.includes('Falownik')));
const broken=cable('broken','pv','ac','missing','ac');
const model2=layout.normalized({studio_layout:{
 nodes:[pv,board],connections:[broken],
 energy_balance:{enabled:true},energy_diagnostics:{enabled:true}
}});
assert.equal(flow.resolve(model2,{states:{}}).byConnection.broken.reason,'missing_node');
assert(diag.viewModel(model2,{states:{}}).cables.some(c=>c.id==='broken'));
const partial=cable('partial','pv','ac','','');
const model3=layout.normalized({studio_layout:{
 nodes:[pv],connections:[partial],energy_balance:{enabled:true},energy_diagnostics:{enabled:true}
}});
assert.equal(flow.resolve(model3,{states:{}}).byConnection.partial.reason,'unconnected_or_missing_endpoints');
const before=JSON.stringify(model.connections[0].points.slice(1));
topo.moveAttached(model,'pv');
assert.equal(JSON.stringify(model.connections[0].points.slice(1)),before);
assert.equal(topo.nearest(model,{x:0,y:0},0),null);
const legacyNode=node('legacy','inverter',[pt('ac','ac','main'),pt('pv1','dc','main')]);
const graph=topo.graph({nodes:[legacyNode,board],connections:[
 cable('ac','legacy','ac','board','left'),
 cable('dc','legacy','pv1','board','left')
]});
assert(graph.errors.some(e=>e.connection==='dc'&&e.reason==='medium_mismatch'));
assert(!graph.errors.some(e=>e.reason==='bus_medium_mismatch'));
console.log('Electric ports: shared bus names isolated by medium, diagnostics complete, manual bends preserved PASS');
