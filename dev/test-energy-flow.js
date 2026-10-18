/* MR4 — verified cable bridges, scenario provenance and geometry regression. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={isEnt:id=>typeof id==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(id)};
vm.createContext(ctx);
for(const f of ['ha-state.js','readout-scale.js','device-registry.js','studio-viewport.js',
 'inverter.js','building.js','ev-charger.js','energy-storage.js','power-grid.js',
 'distribution-board.js','radiator.js','manifold.js','energy-topology.js',
 'energy-balance.js','energy-flow.js','energy-diagnostics.js','power-flow.js','studio-layout.js'])
 vm.runInContext(fs.readFileSync('src/'+f,'utf8'),ctx,{filename:f});
vm.runInContext('this.layout=HASSStudioLayout;this.balance=HASSStudioEnergyBalance;this.flow=HASSStudioEnergyFlow;this.topology=HASSStudioEnergyTopology;this.power=HASSStudioPowerFlow;',ctx);
const {layout,balance,flow,topology,power}=ctx;
const port=(id,bus='main',medium='ac',x=50,y=50)=>({id,bus,medium,x,y});
const node=(id,type,extra={})=>({id,type,x:100,y:100,scale:1,energy_ports:[port('ac')],...extra});
const inverter=(id,k)=>node(id,'inverter',{inverter:{mode:'manual',manual:{ac_power:k,temperature:25}}});
const building=(id,k)=>node(id,'building',{building:{mode:'manual',power_kw:k,measurement:'individual'}});
const panel=node('panel','distribution_board',{energy_ports:[port('a'),port('b'),port('c'),port('d'),port('e'),port('f'),port('g')]});
const cable=(id,a,ap,b,bp,points=[{x:0,y:0},{x:20,y:0},{x:20,y:20}])=>({
 id,type:'electric',points,energy_start:{node_id:a,port_id:ap},energy_end:{node_id:b,port_id:bp},
 animation:{flow_power_mode:'balance',flow_pattern:'dashes',flow_direction:'forward',flow_speed:1}
});
const cfg=(nodes,connections,participants=[],scenario='hybrid')=>layout.normalized({studio_layout:{
 nodes,connections,energy_balance:{enabled:true,scenario,participants}
}});
const grid=node('grid','power_grid'),pv=inverter('pv',1.73),home=building('home',2.5);
const cs=[cable('pvlink','pv','ac','panel','a'),cable('homelink','home','ac','panel','b'),
 cable('gridlink','grid','ac','panel','c')];
let x=cfg([pv,home,grid,panel],cs,[{node_id:'grid',mode:'calculate'}]);
let result=flow.resolve(x,{states:{}});
assert.equal(result.balance.networks[0].state,'balanced');
assert.equal(result.balance.networks[0].totals.grid_import_kw,.77);
assert.equal(result.byConnection.pvlink.kw,1.73);
assert.equal(result.byConnection.homelink.kw,-2.5);
assert.equal(result.byConnection.gridlink.kw,.77);
assert.equal(result.byConnection.homelink.direction,'reverse');
assert(result.byConnection.pvlink.sources.includes('simulated'));
let visual=power.visual(x.connections[0].animation,{states:{}},result.byConnection.pvlink);
assert.equal(visual.active,true);
assert.equal(visual.source,'mixed');
assert.equal(power.visual({...x.connections[0].animation,flow_power_mode:'balance'},{states:{}},result.byConnection.homelink).direction,'reverse');
x=cfg([pv,building('home',1),grid,panel],cs,[{node_id:'grid',mode:'calculate'}]);
result=flow.resolve(x,{states:{}});
assert.equal(result.balance.networks[0].totals.grid_export_kw,.73);
assert.equal(result.byConnection.gridlink.kw,-.73);
x=cfg([pv,building('home',1.73),grid,panel],cs,[{node_id:'grid',mode:'calculate'}]);
result=flow.resolve(x,{states:{}});
assert.equal(result.byConnection.gridlink.kw,0);
assert.equal(power.visual(x.connections[2].animation,{states:{}},result.byConnection.gridlink).active,false);
const extra=[inverter('pv2',2),building('garage',1),node('store','energy_storage',{energy_storage:{mode:'manual',manual:{soc:80,power:-1}}})];
const plus=[...cs,cable('pv2','pv2','ac','panel','d'),cable('garage','garage','ac','panel','e'),cable('store','store','ac','panel','f')];
x=cfg([pv,home,grid,panel,...extra],plus,[{node_id:'grid',mode:'calculate'}]);
result=flow.resolve(x,{states:{}});
assert.equal(result.balance.networks[0].state,'balanced');
assert.equal(result.balance.networks[0].totals.storage_discharge_kw,1);
assert.equal(result.balance.networks[0].totals.generation_kw,3.73);
assert.equal(result.balance.networks[0].totals.consumption_kw,3.5);
assert.equal(result.balance.networks[0].totals.grid_export_kw,1.23);
assert.equal(result.byConnection.store.kw,1);
const charge=node('store','energy_storage',{energy_storage:{mode:'manual',manual:{soc:80,power:1}}});
x=cfg([pv,home,grid,panel,...extra.slice(0,2),charge],plus,[{node_id:'grid',mode:'calculate'}]);
result=flow.resolve(x,{states:{}});
assert.equal(result.balance.networks[0].totals.storage_charge_kw,1);
const twoGrid=node('grid2','power_grid');
const twoGridCable=cable('grid2','grid2','ac','panel','g');
x=cfg([pv,home,grid,twoGrid,panel],[...cs,twoGridCable],[{node_id:'grid',mode:'calculate'},{node_id:'grid2',mode:'calculate'}]);
result=flow.resolve(x,{states:{}});
assert.equal(result.balance.networks[0].state,'insufficient');
assert.equal(result.byConnection.gridlink.available,false);
assert.equal(power.visual(x.connections[2].animation,{states:{}},result.byConnection.gridlink).active,false);
x=cfg([pv,home,grid,panel],cs,[{node_id:'grid',mode:'manual',manual_kw:4}]);
result=flow.resolve(x,{states:{}});
assert.equal(result.balance.networks[0].state,'unbalanced');
assert.equal(result.byConnection.pvlink.available,false);
const loop=cable('loop','panel','d','panel','a');
x=cfg([pv,home,grid,panel],[...cs,loop],[{node_id:'grid',mode:'calculate'}]);
result=flow.resolve(x,{states:{}});
assert.equal(result.byConnection.loop.available,false);
assert.equal(result.byConnection.loop.reason,'ambiguous_cycle');
const crossing=cable('cross','pv','ac','home','ac',[{x:0,y:0},{x:20,y:20}]);
const separate=cfg([pv,home,grid,panel],[cs[2],crossing],[{node_id:'grid',mode:'calculate'}]);
assert.equal(flow.resolve(separate,{states:{}}).balance.networks.length,2);
const broken=cable('broken','pv','ac','grid','ac');
broken.energy_end={node_id:'missing',port_id:'ac'};
x=cfg([pv,home,grid,panel],[...cs,broken],[{node_id:'grid',mode:'calculate'}]);
assert.equal(flow.resolve(x,{states:{}}).byConnection.broken.reason,'missing_node');
const dc=node('battery','energy_storage',{energy_ports:[port('dc','dcbus','dc')]});
const mismatch=cable('mismatch','battery','dc','grid','ac');
x=cfg([dc,grid],[mismatch],[]);
assert.equal(flow.resolve(x,{states:{}}).byConnection.mismatch.reason,'medium_mismatch');
let old=layout.normalized({studio_layout:{nodes:[],connections:[
 {id:'old',type:'electric',points:[{x:12,y:13},{x:21,y:26}],animation:{flow_power_mode:'manual',flow_power_kw:2}}]}});
assert.equal(old.connections[0].animation.flow_power_mode,'manual');
assert.equal(old.connections[0].energy_start.node_id,'');
assert.equal(flow.resolve(old,{states:{}}).balance.enabled,true); // Existing electric cables now activate the balance.
const moved=cfg([pv,home,grid,panel],cs,[{node_id:'grid',mode:'calculate'}]);
const manualBends=JSON.stringify(moved.connections[0].points.slice(1));
topology.moveAttached(moved,'pv');
const original=JSON.stringify(moved.connections[0].points.slice(1));
assert.equal(original,manualBends);
const previous=moved.connections[0].points[0].x;
moved.nodes.find(n=>n.id==='pv').x+=50;
topology.moveAttached(moved,'pv');
assert.equal(moved.connections[0].points[0].x,previous+50);
assert.equal(JSON.stringify(moved.connections[0].points.slice(1)),manualBends);
assert.equal(topology.attach(moved,moved.connections[0],'start',null),true);
assert.equal(moved.connections[0].energy_start.node_id,'');
const restored=layout.normalized({studio_layout:moved});
assert.equal(JSON.stringify(restored.connections[0].points),JSON.stringify(moved.connections[0].points));
assert.equal(restored.energy_balance.scenario,'hybrid');
const testLive=cfg([pv,home,grid,panel],cs,[{node_id:'grid',mode:'calculate'}],'live');
assert.equal(balance.resolve(testLive,{states:{}}).networks[0].state,'insufficient');
const testSim=cfg([pv,home,grid,panel],cs,[{node_id:'pv',mode:'manual',manual_kw:1.73},
 {node_id:'home',mode:'manual',manual_kw:2.5},{node_id:'grid',mode:'calculate'}],'simulation');
assert.equal(flow.resolve(testSim,{states:{}}).balance.networks[0].state,'balanced');
const invalidHA=cfg([pv,home,grid,panel],cs,[{node_id:'pv',mode:'ha',entity:'sensor.pv'},
 {node_id:'grid',mode:'calculate'}]);
assert.equal(balance.resolve(invalidHA,{states:{}}).networks[0].state,'insufficient');
const content=fs.readFileSync('src/studio-custom.js','utf8');
assert(content.includes('HASSStudioEnergyTopology.moveAttached(model,n.id)'));
assert(content.includes('data-balance-scenario'));
console.log('MR4 energy flow: bridges, direction, zero, PV/grid/storage, AC/DC, missing/ambiguous and simulation PASS');
