/* Stage 07A.2-D.1-E.2: shared indexed AC/DC terminal classification. */
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
vm.runInContext('this.topology=HASSStudioEnergyTopology;this.balance=HASSStudioEnergyBalance;'+
 'this.layout=HASSStudioLayout;this.flow=HASSStudioEnergyFlow;',ctx);
const {topology,balance,layout,flow}=ctx;
const port=(id,medium='ac',bus=id)=>({id,medium,bus,label:id,x:50,y:50});
const node=(id,type,ports,more={})=>({id,type,x:10,y:20,scale:1,energy_ports:ports,...more});
const wire=(id,a,ap,b,bp)=>({id,type:'electric',points:[{x:10,y:10},{x:20,y:20}],
 energy_start:{node_id:a,port_id:ap},energy_end:{node_id:b,port_id:bp},
 animation:{flow_power_mode:'balance'}});
const inv=node('inv','inverter',[port('ac'),port('dc_battery','dc'),port('pv1','dc')],
 {energy_mode:'test',inverter:{count:1,rated_kw:10,
 manual:{ac_power:1.4},manual_enabled:{ac_power:true},
 inputs:[{name:'PV1',required:true,manual:{voltage:380,current:8,power:null},
 manual_enabled:{voltage:true,current:true,power:false}}],
 hybrid:{schema_version:1,enabled:true,pv_ports:[''],
 converter:{schema_version:1,enabled:true,pv_mode:'mapped',ac_mode:'auto',
 ac_port_id:'',battery_port_id:'',efficiency_percent:96,
 battery_efficiency_percent:100}}}});
const grid=node('grid','power_grid',[port('ac')],{energy_grid_auto:true});
const bat=node('bat','energy_storage',[port('ac','dc','battery')],
 {energy_mode:'test',energy_storage:{coupling:'legacy',mode:'manual',
 charge_positive:true,manual:{power:1.5,soc:70}}});
const aw=wire('ac_link','inv','ac','grid','ac');
const bw=wire('dc_link','inv','dc_battery','bat','ac');
const config=([a,b,c]=[inv,grid,bat],wires=[aw,bw])=>layout.normalized({studio_layout:{
 nodes:[a,b,c].filter(Boolean),connections:wires,energy_balance:{enabled:true}}});
let d=config(),snapshot=JSON.stringify(d),index=topology.index(d);
const i=topology.hybridAttachments(index,'inv');
const battery=topology.storageAttachment(index,'bat');
assert.equal(i.ac_port_id,'ac');
assert.equal(i.battery_port_id,'dc_battery');
assert.equal(i.battery_status,'connected');
assert.equal(i.storage_port_id,'ac');
assert.equal(battery.status,'dc');
assert.equal(battery.port_id,'ac');
assert.equal(battery.inverter_id,'inv');
assert.equal(battery.network_id,i.storage_node_id?index.keyGroup.get('bat:dc:battery').id:null);
assert.strictEqual(index.attachments.inverters.get('inv'),i);
assert.strictEqual(index.attachments.storages.get('bat'),battery);
let result=balance.resolve(d,{states:{}});
assert.equal(result.converters.length,1);
assert.equal(result.converters[0].status,'valid');
assert.equal(result.storage_terminals[0].port_id,'ac');
assert.equal(result.networks.find(n=>n.medium==='dc').state,'balanced');
assert.equal(JSON.stringify(d),snapshot,'Graph recognition must never mutate saved ports/wires');
assert.equal(JSON.stringify(layout.normalized({studio_layout:d})),snapshot);

// A storage port *named* "ac" but declared DC is DC (not an AC meter).
const ports=topology.ports(d.nodes.find(n=>n.id==='bat'));
assert.equal(ports[0].id,'ac');
assert.equal(ports[0].medium,'dc');
assert.equal(topology.hybridAttachments(index,'inv').battery_status,'connected');

// Explicit legacy AC storage is never reclassified as DC.
const old=node('old','energy_storage',[port('ac')],{energy_mode:'test',
 energy_storage:{coupling:'legacy',mode:'manual',manual:{power:1.5,soc:75}}});
const acOnly=config([inv,grid,old],[aw,wire('storage_ac','grid','ac','old','ac')]);
const oldBinding=topology.storageAttachment(topology.index(acOnly),'old');
assert.equal(oldBinding.status,'ac');
assert.equal(oldBinding.port_id,'ac');
assert.equal(balance.resolve(acOnly,{states:{}}).storage_terminals.length,0);

// Parallel DC feeds (even with the same port) remain ambiguous.
const two=config([inv,grid,bat],[aw,bw,wire('parallel','inv','dc_battery','bat','ac')]);
const a=topology.index(two);
assert.equal(topology.storageAttachment(a,'bat').status,'ambiguous');
assert.equal(topology.hybridAttachments(a,'inv').battery_port_id,'');
assert.equal(topology.hybridAttachments(a,'inv').battery_ambiguous,true);

// Invalid mismatched medium cannot authorize any attachment.
const bad=config([inv,grid,old],[aw,wire('wrong','inv','dc_battery','old','ac')]);
const wrong=topology.index(bad);
assert(wrong.graph.errors.some(e=>e.reason==='medium_mismatch'));
assert.equal(topology.storageAttachment(wrong,'old').status,'unconnected');
assert.equal(topology.hybridAttachments(wrong,'inv').battery_status,'unconnected');

// Duplicate cable IDs are excluded from validated discovery.
const duplicate=config([inv,grid,bat],[aw,bw,{...bw}]);
const dup=topology.index(duplicate);
assert.equal(topology.storageAttachment(dup,'bat').status,'unconnected');
assert.equal(topology.hybridAttachments(dup,'inv').battery_port_id,'');

// AC and DC may share textual bus names, but not a graph component.
const shared=node('multi','distribution_board',[port('left','ac','same'),port('right','dc','same')]);
const sharedIndex=topology.index({nodes:[grid,bat,shared],connections:[
 wire('a','grid','ac','multi','left'),wire('b','bat','ac','multi','right')]});
assert.equal(sharedIndex.byMedium.ac.length,1);
assert.equal(sharedIndex.byMedium.dc.length,1);
assert.notEqual(sharedIndex.keyGroup.get('multi:ac:same'),
 sharedIndex.keyGroup.get('multi:dc:same'));

// A storage with both AC and DC links needs an explicit topology decision;
 // neither the AC nor the DC inverter-side inference may take precedence.
const dual=node('dual','energy_storage',[port('line','ac'),port('cell','dc')],
 {energy_mode:'test',energy_storage:{coupling:'legacy',mode:'manual',
 manual:{soc:70,power:1.5}}});
const mixed=topology.index({nodes:[inv,grid,dual],connections:[
 aw,wire('dual_ac','grid','ac','dual','line'),
 wire('dual_dc','inv','dc_battery','dual','cell')]});
assert.equal(topology.storageAttachment(mixed,'dual').status,'ambiguous');
assert.equal(topology.hybridAttachments(mixed,'inv').battery_ambiguous,true);
assert.equal(topology.hybridAttachments(mixed,'inv').battery_port_id,'');

// Two independent inverter DC terminals attached to one storage must
// not be collapsed into a fictional one-to-one converter boundary.
const second=node('inv2','inverter',[port('store','dc')]);
const battery2=node('battery2','energy_storage',[port('cell','dc')],{
 energy_mode:'test',energy_storage:{coupling:'legacy',manual:{power:1,soc:70}}});
const sharedBattery=topology.index({nodes:[inv,second,battery2],connections:[
 wire('b1','inv','dc_battery','battery2','cell'),
 wire('b2','inv2','store','battery2','cell')]});
assert.equal(topology.storageAttachment(sharedBattery,'battery2').status,'ambiguous');
assert.equal(topology.hybridAttachments(sharedBattery,'inv').battery_port_id,'');
assert.equal(topology.hybridAttachments(sharedBattery,'inv2').battery_port_id,'');

// No physical wire is not a zero-power link or an inferred connection.
const disconnected=topology.index({nodes:[inv,bat],connections:[]});
assert.equal(topology.storageAttachment(disconnected,'bat').status,'unconnected');
assert.equal(topology.hybridAttachments(disconnected,'inv').ac_port_id,'');
assert.equal(topology.hybridAttachments(disconnected,'inv').battery_port_id,'');

assert.equal(JSON.stringify(d),snapshot);
console.log('PASS E.2 shared AC/DC recognition, legacy parity, ambiguous feeds, wrong medium, duplicate IDs');
