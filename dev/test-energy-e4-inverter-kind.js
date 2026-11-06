/* 07A.2-D.1-E.4: inverter type selection cannot rewrite AC or saved wiring. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={};vm.createContext(ctx);
for(const file of ['ha-state.js','readout-scale.js','device-parameters.js',
  'inverter-readings.js','inverter.js','energy-topology.js'])
  vm.runInContext(fs.readFileSync('src/'+file,'utf8'),ctx,{filename:file});
vm.runInContext('this.inv=HASSStudioInverter;this.topology=HASSStudioEnergyTopology;',ctx);
const {inv,topology}=ctx;
const pt=(id,medium='ac',bus=id)=>({id,medium,bus,label:id,x:50,y:50});
const wire=(id,a,ap,b,bp)=>({id,type:'electric',
 points:[{x:0,y:0},{x:20,y:40},{x:60,y:80}],
 energy_start:{node_id:a,port_id:ap},energy_end:{node_id:b,port_id:bp}});
const fresh={type:'inverter',id:'inv',energy_ports:topology.defaultPorts({type:'inverter'}),
 inverter:{entities:{ac_power:'sensor.ac'},manual:{ac_power:0},count:2,
 inputs:[{name:'PV1'},{name:'PV2'}]}};
const acNode={type:'power_grid',id:'grid',energy_ports:[pt('ac')]};
const acWire=wire('ac','inv','ac','grid','ac');
const layout={nodes:[fresh,acNode],connections:[acWire]};
const original=JSON.stringify(layout.connections);
assert.equal(inv.kind(fresh),'grid_tied');
assert.equal(inv.selectKind(fresh,'hybrid',topology.index(layout)),true);
assert.equal(inv.kind(fresh),'hybrid');
assert.equal(fresh.inverter.hybrid.enabled,true);
assert.equal(fresh.inverter.hybrid.converter.enabled,true);
assert.equal(fresh.energy_ports.filter(p=>p.id==='battery'&&p.medium==='dc').length,1);
assert.equal(fresh.inverter.entities.ac_power,'sensor.ac');
assert.equal(fresh.inverter.manual.ac_power,0);
assert.equal(JSON.stringify(layout.connections),original);
assert.equal(inv.selectKind(fresh,'hybrid',topology.index(layout)),true);
assert.equal(fresh.energy_ports.filter(p=>p.id==='battery').length,1,'No duplicate port');
assert.equal(inv.selectKind(fresh,'grid_tied',topology.index(layout)),true);
assert.equal(inv.kind(fresh),'grid_tied');
assert.equal(fresh.inverter.hybrid.enabled,false);
assert.equal(fresh.inverter.hybrid.converter.enabled,false);
assert.equal(JSON.stringify(layout.connections),original);
assert.equal(fresh.energy_ports.filter(p=>p.id==='battery').length,1,
 'Switching to grid-tied must not remove wired-port identifiers');
const saved=JSON.stringify(fresh);
assert.equal(inv.selectKind(fresh,'not-a-kind'),false);
assert.equal(JSON.stringify(fresh),saved,'Invalid type is not a mutation');
// Existing custom battery port/wire is retained rather than creating a
// default duplicate, even if the physical name is not "battery".
const custom={type:'inverter',id:'custom',energy_ports:[
 pt('ac'),pt('pv1','dc'),pt('port1','dc','port1')],inverter:{count:1}};
const storage={type:'energy_storage',id:'storage',energy_ports:[pt('ac','dc','battery')]};
const batteryWire=wire('dc','custom','port1','storage','ac');
const installed={nodes:[custom,storage,acNode],connections:[
 wire('ac2','custom','ac','grid','ac'),batteryWire]};
const installedSaved=JSON.stringify(installed);
assert.equal(topology.hybridAttachments(topology.index(installed),'custom').battery_port_id,'port1');
assert.equal(inv.selectKind(custom,'hybrid',topology.index(installed)),true);
assert.equal(custom.energy_ports.length,3,'Existing custom DC port remains authoritative');
assert.equal(JSON.stringify(installed.connections),JSON.stringify(JSON.parse(installedSaved).connections));
assert.equal(inv.kind(custom),'hybrid');
const legacy={type:'inverter',id:'legacy',inverter:{
 hybrid:{schema_version:1,enabled:true,
 converter:{schema_version:1,enabled:false}}}};
assert.equal(inv.kind(legacy),'grid_tied','Partial legacy model is not silently converted');
const previous=JSON.stringify(legacy);
assert.equal(inv.kind(legacy),'grid_tied');
assert.equal(JSON.stringify(legacy),previous,'Displaying inferred type cannot write migration');
console.log('PASS E.4: explicit kind, safe DC battery port, AC/TEST untouched, legacy read-only');
