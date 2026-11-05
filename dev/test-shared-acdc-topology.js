/* 07A.2-D.1-A: one topology engine for electrically isolated AC and DC graphs.
 * The direct-device index does NOT infer converter power or rewrite wires. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={isEnt:x=>typeof x==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(x)};
vm.createContext(ctx);
for(const file of ['ha-state.js','readout-scale.js','device-registry.js',
 'studio-viewport.js','device-parameters.js','inverter-readings.js',
 'inverter.js','building.js','ev-charger.js','energy-storage.js',
 'power-grid.js','distribution-board.js','radiator.js','manifold.js',
 'energy-topology.js','energy-converter.js','energy-balance.js',
 'energy-flow.js','energy-diagnostics.js','power-flow.js','studio-layout.js'])
 vm.runInContext(fs.readFileSync('src/'+file,'utf8'),ctx,{filename:file});
vm.runInContext('this.topo=HASSStudioEnergyTopology;this.balance=HASSStudioEnergyBalance;'+
 'this.flow=HASSStudioEnergyFlow;this.layout=HASSStudioLayout;',ctx);
const {topo,balance,flow,layout}=ctx;
const port=(id,medium='ac',bus='main')=>({id,label:id,medium,bus,x:50,y:50});
const device=(id,type,ports,rest={})=>({id,type,x:10,y:20,scale:1,
 energy_ports:ports,...rest});
const cable=(id,a,pa,b,pb)=>({id,type:'electric',
 points:[{x:11,y:22},{x:31,y:44},{x:71,y:99}],
 energy_start:{node_id:a,port_id:pa},energy_end:{node_id:b,port_id:pb},
 animation:{flow_power_mode:'balance'}});
const inv=device('sofar','inverter',[port('ac'),port('battery','dc','battery'),
 port('pv','dc','pv')],{energy_mode:'test',inverter:{
 manual:{ac_power:2},count:1,inputs:[{name:'PV1'}]}});
const grid=device('grid','power_grid',[port('ac')],{energy_grid_auto:true});
const storage=device('battery','energy_storage',[port('dc','dc')],
 {energy_mode:'test',energy_storage:{
 mode:'manual',manual:{power:1.5,soc:75},coupling:'dc',
 coupling_port_id:'dc'}});
const panel=device('panel','distribution_board',[port('dc','dc')]);
const home=device('home','building',[port('ac')],
 {energy_mode:'test',building:{power_kw:2,measurement:'individual'}});
const ac=cable('ac_grid','sofar','ac','grid','ac');
const dc=cable('dc_battery','sofar','battery','battery','dc');
const pv=cable('dc_pv','panel','dc','sofar','pv');
const extra=cable('ac_house','grid','ac','home','ac');
const wrong=cable('acdc_wrong','grid','ac','battery','dc');
const diagram={nodes:[inv,grid,storage,panel,home],
 connections:[ac,dc,pv,extra,wrong]};
const before=JSON.stringify(diagram);
const g=topo.graph(diagram),idx=topo.index(diagram,g);
assert.strictEqual(idx.graph,g,'index must reuse existing validated graph');
assert.equal(idx.grouped.size,3);
assert.equal(idx.byMedium.ac.length,1);
assert.equal(idx.byMedium.dc.length,2);
assert.equal(idx.edgesByMedium.ac.length,2);
assert.equal(idx.edgesByMedium.dc.length,2);
assert(g.errors.some(x=>x.reason==='medium_mismatch'&&x.connection==='acdc_wrong'));
assert(idx.grouped.values().next().value.medium==='ac');
const get=(id,medium)=>idx.byMedium[medium].find(group=>
 [...group.ports].some(key=>key.startsWith(id+':'+medium+':')));
const acGroup=get('sofar','ac'),batGroup=get('battery','dc'),pvGroup=get('panel','dc');
assert(acGroup&&batGroup&&pvGroup);
assert.notEqual(acGroup.id,batGroup.id);
assert.notEqual(pvGroup.id,batGroup.id);
assert(![...acGroup.ports].some(key=>key.includes(':dc:')));
assert(![...batGroup.ports].some(key=>key.includes(':ac:')));
assert.equal(idx.keyGroup.get('sofar:dc:battery'),batGroup);
assert.equal(idx.keyGroup.get('sofar:dc:pv'),pvGroup);
assert(!idx.keyGroup.has('sofar:dc:no_port'));
const links=idx.linksByNode.get('sofar');
assert.equal(links.length,3);
assert.equal(JSON.stringify(links.map(x=>x.connection_id)),JSON.stringify(['ac_grid','dc_battery','dc_pv']),
 'Cross-realm VM array contents must match');
const toBattery=links.find(x=>x.connection_id==='dc_battery');
assert.equal(toBattery.medium,'dc');
assert.equal(toBattery.port_id,'battery');
assert.equal(toBattery.peer_node_id,'battery');
assert.equal(toBattery.peer_type,'energy_storage');
assert.equal(toBattery.peer_port_id,'dc');
assert.equal(toBattery.network_id,batGroup.id);
const toPV=links.find(x=>x.connection_id==='dc_pv');
assert.equal(toPV.peer_node_id,'panel');
assert.equal(toPV.peer_type,'distribution_board');
assert.equal(toPV.network_id,pvGroup.id);
const reverse=idx.linksByNode.get('battery').find(x=>x.connection_id==='dc_battery');
assert.equal(reverse.peer_node_id,'sofar');
assert.equal(reverse.peer_port_id,'battery');
assert(!idx.linksByNode.get('battery').some(x=>x.connection_id==='acdc_wrong'),
 'Invalid AC/DC edge must not be discoverable as a connection');
assert.equal(JSON.stringify(diagram),before,'Topology indexing must not mutate configuration');

// Identical bus names on the same node remain electrically separated by medium.
const sameNames=device('same','distribution_board',[port('a','ac','shared'),
 port('d','dc','shared')]);
const names=[device('ga','power_grid',[port('ac')]),
 device('sd','energy_storage',[port('dc','dc')]),sameNames];
const named=topo.index({nodes:names,connections:[
 cable('ca','ga','ac','same','a'),cable('cd','sd','dc','same','d')
]});
assert.equal(named.grouped.size,2);
assert.equal(named.byMedium.ac.length,1);
assert.equal(named.byMedium.dc.length,1);
assert.notEqual(named.keyGroup.get('same:ac:shared'),named.keyGroup.get('same:dc:shared'));
// Isolated/unwired terminals yield no invented inferred link or component.
assert.equal(topo.index({nodes:[inv],connections:[]}).grouped.size,0);
assert(!topo.index({nodes:[inv],connections:[]}).linksByNode.has('sofar'));
// Duplicate cable IDs are not safe for direct relationship discovery.
const duplicate=topo.index({nodes:[inv,storage],connections:[
 cable('dup','sofar','battery','battery','dc'),
 cable('dup','sofar','battery','battery','dc')
]});
assert.equal(duplicate.grouped.size,1);
assert(!duplicate.linksByNode.has('sofar'),
 'Duplicate IDs are ambiguous: fail closed for semantic relationships');

// Compare the public AC/DC solver against the same scenario on two domains.
// The new index must not alter raw AC/DC allocation or cable animation.
const normalized=layout.normalized({studio_layout:{
 energy_balance:{enabled:true},
 nodes:[inv,grid,storage],connections:[ac,dc]
}});
const solved=balance.resolve(normalized,{states:{}});
assert.equal(solved.networks.length,2);
assert(solved.networks.some(n=>n.medium==='ac'));
assert(solved.networks.some(n=>n.medium==='dc'));
assert.equal(solved.networks.find(n=>n.medium==='dc').residual_kw,-1.5);
assert.equal(solved.networks.find(n=>n.medium==='ac').state,'balanced');
const flows=flow.resolve(normalized,{states:{}}).byConnection;
assert.equal(flows.dc_battery.available,false);
assert.equal(flows.ac_grid.available,true);
assert.equal(JSON.stringify(diagram),before);
console.log('PASS D.1-A: one AC/DC graph index, validated endpoint links, isolated media, duplicates, legacy balance and flow parity.');
