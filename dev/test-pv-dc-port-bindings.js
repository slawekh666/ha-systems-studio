/* 07A.2-B.2 — MPPT input-to-DC port mapping is observational, never fictitious energy. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={isEnt:x=>typeof x==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(x)};
vm.createContext(ctx);
for(const file of ['ha-state.js','readout-scale.js','device-registry.js','studio-viewport.js',
 'device-parameters.js','inverter-readings.js','inverter.js','building.js','ev-charger.js',
 'energy-storage.js','power-grid.js','distribution-board.js','radiator.js','manifold.js',
 'energy-topology.js','energy-balance.js','energy-flow.js','energy-diagnostics.js',
 'power-flow.js','studio-layout.js'])
 vm.runInContext(fs.readFileSync('src/'+file,'utf8'),ctx,{filename:file});
vm.runInContext('this.inv=HASSStudioInverter;this.balance=HASSStudioEnergyBalance;'+
 'this.layout=HASSStudioLayout;this.diag=HASSStudioEnergyDiagnostics;this.flow=HASSStudioEnergyFlow;',ctx);
const pt=(id,medium='ac',bus='main')=>({id,label:id,medium,bus,x:50,y:50});
const node=(id,type,ports,attrs={})=>({id,type,x:20,y:30,scale:1,energy_ports:ports,...attrs});
const cable=(id,an,ap,bn,bp)=>({id,type:'electric',points:[{x:0,y:0},{x:90,y:0}],
 energy_start:{node_id:an,port_id:ap},energy_end:{node_id:bn,port_id:bp},
 animation:{flow_power_mode:'balance'}});
const pv2={name:'PV2',manual:{voltage:380,current:8,power:null},
 manual_enabled:{voltage:true,current:true,power:false}};
const makeInv=(mapped=true)=>node('sofar','inverter',
 [pt('ac'),pt('pv1','dc','pv1'),pt('pv2','dc','pv2'),pt('bat','dc','battery')],
 {energy_mode:'test',inverter:{count:2,mode:'manual',
  manual:{ac_power:5},inputs:[{},pv2],
  ...(mapped?{hybrid:{schema_version:1,enabled:true,pv_ports:['','pv2']}}:{})}});
const inv=makeInv(),battery=node('battery','energy_storage',[pt('dc','dc')],
 {energy_mode:'test',energy_storage:{mode:'manual',manual:{soc:75,power:1.5}}});
const dummy=node('pv_terminal','distribution_board',[pt('dc','dc')]);
const diagram=(nodes,connections,participants=[])=>ctx.layout.normalized({studio_layout:{
 energy_balance:{enabled:true,participants},energy_diagnostics:{enabled:true},
 nodes,connections}});
const mapped=ctx.inv.dcTerminals(inv,{states:{}});
assert.equal(mapped.enabled,true);
assert.equal(mapped.errors.length,0);
assert.equal(mapped.terminals.length,1);
const pv=mapped.terminals[0];
assert.equal(pv.node_id,'sofar');assert.equal(pv.port_id,'pv2');
assert.equal(pv.input_index,1);assert.equal(pv.power_kw,3.04);
assert.equal(pv.injection_kw,-3.04);
assert.equal(pv.source,'calculated_test');
assert.equal(pv.measurement_point,'inverter_mppt_input');
assert.equal(pv.included_in_balance,false);
const legacy=makeInv(false);
assert.equal(ctx.inv.dcTerminals(legacy,{states:{}}).enabled,false);
assert.equal(ctx.inv.normalize(legacy).hybrid,undefined);
const rt=ctx.layout.normalized({studio_layout:{nodes:[inv],connections:[]}});
const saved=JSON.stringify(rt);
const reload=ctx.layout.normalized({studio_layout:JSON.parse(saved)});
assert.equal(ctx.inv.dcTerminals(reload.nodes[0],{states:{}}).terminals[0].power_kw,3.04);
assert.equal(JSON.stringify(ctx.layout.normalized({studio_layout:rt})),saved);
// A single cable does not create a PV source from an inverter AC reading.
const dcOnly=diagram([inv,battery],[cable('battery_cable','sofar','bat','battery','dc')]);
const solved=ctx.balance.resolve(dcOnly,{states:{}});
assert.equal(solved.networks.length,1);
assert.equal(solved.networks[0].medium,'dc');
assert.equal(solved.networks[0].state,'insufficient');
assert.equal(solved.networks[0].totals,null);
assert(solved.warnings.some(x=>x.reason==='inverter_ac_reading_on_dc_network'));
assert(solved.warnings.some(x=>x.reason==='pv_dc_unconnected_port'));
assert.equal(solved.dc_terminals.length,1);
assert.equal(solved.dc_terminals[0].connected,false);
assert(!solved.networks[0].devices.some(x=>x.node_type==='inverter'&&x.injection_kw===5));
const noFake=ctx.flow.resolve(dcOnly,{states:{}});
assert.equal(noFake.byConnection.battery_cable.available,false);
// Explicit participant override must never turn AC measurements into DC production.
const old=makeInv(false);
delete old.energy_mode;
const over=diagram([old,battery],[cable('dc_wire','sofar','bat','battery','dc')],
 [{node_id:'sofar',port_id:'bat',mode:'manual',manual_kw:5}]);
const guarded=ctx.balance.resolve(over,{states:{}});
assert(guarded.warnings.some(x=>x.reason==='inverter_ac_reading_on_dc_network'));
assert.equal(guarded.networks[0].state,'insufficient');
assert.equal(guarded.networks[0].devices.find(x=>x.node_id==='sofar').injection_kw,null);
// A mapped MPPT port is an observed inverter input, not a standalone generator.
const dcPV=diagram([inv,dummy],[cable('pv_wire','sofar','pv2','pv_terminal','dc')]);
const pvNetwork=ctx.balance.resolve(dcPV,{states:{}});
assert.equal(pvNetwork.dc_terminals[0].connected,true);
assert.equal(pvNetwork.dc_terminals[0].power_kw,3.04);
assert.equal(pvNetwork.dc_terminals[0].injection_kw,-3.04);
assert.equal(pvNetwork.networks[0].totals,null);
assert.equal(pvNetwork.networks[0].state,'insufficient');
assert(!pvNetwork.networks[0].devices.some(x=>x.injection_kw===3.04));
const vm=ctx.diag.viewModel(dcPV,{states:{}});
assert.equal(vm.dcTerminals[0].power_kw,3.04);
const html=ctx.diag.render(dcPV,{states:{}},'pl');
assert(html.includes('3.040 kW'));
assert(html.includes('Obserwacje wejść PV DC'));
assert(html.includes('poza bilansem magazynu'));
// Existing AC selection and power remain unchanged even with a DC MPPT wire.
const grid=node('grid','power_grid',[pt('ac')],{energy_grid_auto:true});
const acLine=diagram([inv,grid,dummy],[cable('ac_wire','sofar','ac','grid','ac'),
 cable('pv_wire','sofar','pv2','pv_terminal','dc')]);
const res=ctx.balance.resolve(acLine,{states:{}});
const ac=res.networks.find(n=>n.medium==='ac'),dc=res.networks.find(n=>n.medium==='dc');
assert(ac&&dc);
assert.equal(ac.devices.find(x=>x.node_id==='sofar').injection_kw,5);
assert(!dc.devices.some(x=>x.node_id==='sofar'));
assert.equal(res.dc_terminals[0].power_kw,3.04);
// Invalid mappings must fail closed without changing port IDs or cables.
const invalid=(ports,bindings,extra={})=>ctx.inv.dcTerminals(
 node('sofar','inverter',ports,{energy_mode:'test',inverter:{
  count:2,inputs:[{required:true},pv2],
  hybrid:{schema_version:1,enabled:true,pv_ports:bindings},...extra}}),{states:{}});
assert(invalid([pt('pv2','dc')],['','pv2']).errors.some(x=>x.reason==='pv_dc_required_mapping_missing'));
assert(invalid([pt('pv2','dc')],['pv2','pv2']).errors.some(x=>x.reason==='pv_dc_duplicate_mapping'));
assert(invalid([pt('pv2','dc')],['','wrong']).errors.some(x=>x.reason==='pv_dc_missing_port'));
assert(invalid([pt('pv2')],['','pv2']).errors.some(x=>x.reason==='pv_dc_wrong_medium'));
const absent=invalid([pt('pv2','dc')],['','pv2'],{inputs:[{required:true},{...pv2,required:true,
 manual:{voltage:null,current:null,power:null},manual_enabled:{voltage:false,current:false,power:false}}]});
assert(absent.errors.some(x=>x.reason==='pv_dc_missing_measurement'));
const files=['src/studio-inspector.js','src/studio-custom.js'].map(x=>fs.readFileSync(x,'utf8'));
assert(files[0].includes('inv_pv_'+String('') )===false || files[0].includes("'_port'")); // structure stays dynamic
assert(files[0].includes('inv_hybrid_enabled'));
assert(files[1].includes("k==='hybrid_enabled'"));
assert(files[1].includes("fieldName==='port'"));
console.log('PASS B.2: explicit MPPT bindings, saved config, DC safety, no double count, AC parity and diagnostics.');
