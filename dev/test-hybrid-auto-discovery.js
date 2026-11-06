/* 07A.2-D.1-B: graph-driven AC/battery binding and logical MPPT sources. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={isEnt:x=>typeof x==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(x)};
vm.createContext(ctx);
for(const name of ['ha-state.js','readout-scale.js','device-registry.js',
 'studio-viewport.js','device-parameters.js','inverter-readings.js',
 'inverter.js','building.js','ev-charger.js','energy-storage.js',
 'power-grid.js','distribution-board.js','radiator.js','manifold.js',
 'energy-topology.js','energy-converter.js','energy-balance.js',
 'energy-flow.js','energy-diagnostics.js','power-flow.js','studio-layout.js'])
 vm.runInContext(fs.readFileSync('src/'+name,'utf8'),ctx,{filename:name});
vm.runInContext('this.inv=HASSStudioInverter;this.topo=HASSStudioEnergyTopology;'+
 'this.balance=HASSStudioEnergyBalance;this.layout=HASSStudioLayout;',ctx);
const {inv,topo,balance,layout}=ctx;
const port=(id,medium='ac',bus=id)=>({id,medium,bus,label:id,x:50,y:50});
const node=(id,type,energy_ports,rest={})=>({id,type,energy_ports,
 x:20,y:20,scale:1,...rest});
const wire=(id,a,ap,b,bp)=>({id,type:'electric',
 points:[{x:0,y:0},{x:30,y:25},{x:60,y:30}],
 energy_start:{node_id:a,port_id:ap},energy_end:{node_id:b,port_id:bp}});
const inverter=(opts={})=>node('inv','inverter',[port('ac'),port('pv1','dc'),
 port('battery','dc')],{energy_mode:'test',inverter:{count:1,rated_kw:10,
 manual:{ac_power:1.4},manual_enabled:{ac_power:true},inputs:[{name:'PV1',required:true,
 manual:{voltage:380,current:8,power:null},
 manual_enabled:{voltage:true,current:true,power:false}}],
 hybrid:{schema_version:1,enabled:true,pv_ports:[''],
 converter:{schema_version:1,enabled:true,pv_mode:'mapped',ac_mode:'auto',
 ac_port_id:'',battery_port_id:'',efficiency_percent:96,
 battery_efficiency_percent:100,...opts}}}});
const storage=(opts={})=>node('bat','energy_storage',topo.defaultPorts({type:'energy_storage'}),
 {energy_mode:'test',energy_storage:{coupling:'legacy',mode:'manual',
 manual:{power:1.5,soc:70},charge_positive:true,...opts}});
const grid=node('grid','power_grid',[port('ac')],{energy_grid_auto:true});
const ac=wire('ac','inv','ac','grid','ac');
const dc=wire('dc','inv','battery','bat','dc');
const check=(invNode=inverter(),battery=storage(),connections=[ac,dc])=>
 layout.normalized({studio_layout:{nodes:[grid,invNode,...(battery?[battery]:[])],
 connections,energy_balance:{enabled:true}}});
const near=(a,b)=>assert(Math.abs(a-b)<.000001,a+' != '+b);
let d=check(),before=JSON.stringify(d),idx=topo.index(d);
let discovered=topo.hybridAttachments(idx,'inv');
assert.equal(discovered.ac_port_id,'ac');
assert.equal(discovered.battery_port_id,'battery');
assert.equal(discovered.storage_links.length,1);
assert.equal(discovered.pv_port_ids.length,0);
const logical=inv.dcTerminals(d.nodes.find(n=>n.id==='inv'),{states:{}},idx);
assert.equal(logical.terminals.length,1);
assert.equal(logical.terminals[0].logical,true);
assert.equal(logical.terminals[0].port_id,'');
near(logical.terminals[0].power_kw,3.04);
let result=balance.resolve(d,{states:{}});
assert.equal(result.converters[0].status,'valid');
near(result.converters[0].pv_kw,3.04);
near(result.converters[0].battery_kw,1.5);
near(result.converters[0].ac_kw,1.4);
near(result.converters[0].loss_kw,.14);
assert.equal(result.converters[0].ac_port_id,'ac');
assert.equal(result.converters[0].battery_port_id,'battery');
assert.equal(result.networks.find(n=>n.medium==='dc').state,'balanced');
assert.equal(result.storage_terminals.length,1);
assert.equal(result.storage_terminals[0].port_id,'dc');
assert.equal(result.dc_terminals.length,1);
assert(!result.dc_terminals[0].connected);
assert.equal(JSON.stringify(d),before,'No wiring/config migration');
assert.equal(JSON.stringify(layout.normalized({studio_layout:d})),before,
 'Autodiscovery does not serialize inferred port binding');
// Missing physical battery terminal does not become zero or a fictional DC network.
result=balance.resolve(check(inverter(),null,[ac]),{states:{}});
assert.equal(result.converters[0].reason,'converter_battery_port_missing');
// Existing explicit manual assignment is preserved.
result=balance.resolve(check(inverter({ac_port_id:'ac',battery_port_id:'battery'})),{states:{}});
assert.equal(result.converters[0].status,'valid');
// Explicit absent battery never conceals physically wired storage.
result=balance.resolve(check(inverter({battery_port_id:'none'})),{states:{}});
assert.equal(result.converters[0].reason,'converter_battery_absence_conflicts_with_wire');
// Incompatible explicit AC storage cannot be silently converted into DC.
result=balance.resolve(check(inverter(),storage({coupling:'ac'})),{states:{}});
assert.equal(result.converters[0].reason,'converter_battery_reading_ambiguous');
// A duplicate wire ID must not authorize any hybrid attachment.
const duplicate=check(inverter(),storage(),[ac,dc,wire('dc','inv','battery','bat','dc')]);
assert.equal(topo.hybridAttachments(topo.index(duplicate),'inv').battery_port_id,'');
result=balance.resolve(duplicate,{states:{}});
assert.equal(result.converters[0].reason,'converter_battery_port_missing');
// If two different DC inverter ports are cabled to storage, fail closed.
const other=node('bat2','energy_storage',[port('dc','dc')],
 {energy_mode:'test',energy_storage:{coupling:'dc',coupling_port_id:'dc',
 mode:'manual',manual:{power:1,soc:70}}});
const twin=inverter();
twin.energy_ports.push(port('battery2','dc'));
const ambiguous=layout.normalized({studio_layout:{
 nodes:[grid,twin,storage(),other],
 connections:[ac,dc,wire('other','inv','battery2','bat2','dc')],
 energy_balance:{enabled:true}}});
result=balance.resolve(ambiguous,{states:{}});
assert.equal(result.converters[0].reason,'converter_ambiguous_battery_ports');
// Wrong-medium cables must never authorize a binding.
const mismatch=check(inverter(),storage(),[ac,
 wire('wrong','inv','ac','bat','dc')]);
assert.equal(topo.hybridAttachments(topo.index(mismatch),'inv').battery_port_id,'');
assert(topo.index(mismatch).graph.errors.some(e=>e.reason==='medium_mismatch'));
// Physical PV inference uses explicit DC source semantics and unique wiring.
const physical=node('array','pv_source',[port('dc','dc')],{energy_role:'source'});
const physicalLayout={nodes:[grid,inverter(),storage(),physical],
 connections:[ac,dc,wire('pv','inv','pv1','array','dc')]};
const physicalIndex=topo.index(physicalLayout);
const found=topo.hybridAttachments(physicalIndex,'inv');
assert.equal(found.pv_port_ids.length,1);
assert.equal(found.pv_port_ids[0],'pv1');
const physTerm=inv.dcTerminals(physicalLayout.nodes[1],{states:{}},physicalIndex);
assert.equal(physTerm.terminals.length,1);
assert.equal(physTerm.terminals[0].port_id,'pv1');
assert.equal(physTerm.terminals[0].logical,false);
// More than one physical PV branch cannot be paired to one input arbitrarily.
const multi=inverter();multi.energy_ports.push(port('pv2','dc'));
const pv2=node('array2','pv_source',[port('dc','dc')],{energy_role:'source'});
const multiLayout={nodes:[grid,multi,storage(),physical,pv2],
 connections:[ac,dc,wire('pv','inv','pv1','array','dc'),
 wire('pv2','inv','pv2','array2','dc')]};
const terminals=inv.dcTerminals(multi,{states:{}},topo.index(multiLayout));
assert.equal(terminals.terminals.length,0);
assert(terminals.errors.some(e=>e.reason==='pv_dc_ambiguous_physical_source'));
const old=inverter();delete old.inverter.hybrid.converter;
result=balance.resolve(check(old),{states:{}});
assert.equal(result.converters.length,0);
assert.equal(result.networks.find(n=>n.medium==='dc').residual_kw,-1.5);
console.log('PASS D.1-B: hybrid discovery, implicit PV, DC storage, ambiguous links, no legacy migration.');
