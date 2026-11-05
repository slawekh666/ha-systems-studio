/* Stage 07A.2-B.2.1 — distinguish missing converter from contradictory DC readings. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={isEnt:id=>typeof id==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(id)};
vm.createContext(ctx);
for(const file of ['ha-state.js','readout-scale.js','device-registry.js','studio-viewport.js',
 'device-parameters.js','inverter-readings.js','inverter.js','building.js','ev-charger.js',
 'energy-storage.js','power-grid.js','distribution-board.js','radiator.js','manifold.js',
 'energy-topology.js','energy-balance.js','energy-flow.js','energy-diagnostics.js',
 'power-flow.js','studio-layout.js'])
 vm.runInContext(fs.readFileSync('src/'+file,'utf8'),ctx,{filename:file});
vm.runInContext('this.layout=HASSStudioLayout;this.diag=HASSStudioEnergyDiagnostics;this.balance=HASSStudioEnergyBalance;',ctx);
const pt=(id,medium='dc',bus='main')=>({id,label:id,medium,bus,x:50,y:50});
const node=(id,type,ports,props={})=>({id,type,x:10,y:10,scale:1,energy_ports:ports,...props});
const wire=(id,a,ap,b,bp)=>({id,type:'electric',points:[{x:10,y:10},{x:40,y:10}],
 energy_start:{node_id:a,port_id:ap},energy_end:{node_id:b,port_id:bp},
 animation:{flow_power_mode:'balance'}});
const inv=node('inverter','inverter',[pt('ac','ac'),pt('battery'),pt('pv1','dc','pv1')],
 {label:'Sofar 5.5',energy_mode:'test',inverter:{count:1,manual:{ac_power:5},
  inputs:[{manual:{voltage:380,current:8,power:null},
   manual_enabled:{voltage:true,current:true,power:false}}],
  hybrid:{schema_version:1,enabled:true,pv_ports:['pv1']}}});
const storage=power=>node('storage','energy_storage',[pt('dc')],{
 label:'Magazyn',energy_mode:'test',energy_storage:{mode:'manual',manual:{soc:80,power}}});
const board=node('board','distribution_board',[pt('a'),pt('b')]);
const layout=(nodes,connections)=>ctx.layout.normalized({studio_layout:{
 nodes,connections,energy_balance:{enabled:true},energy_diagnostics:{enabled:true}}});
// The real installation has an AC-connected inverter and a separate DC battery
// branch. This makes the inverter participate on AC only; DC storage is known.
const grid=node('grid','power_grid',[pt('ac','ac')],{energy_grid_auto:true});
const scenario=layout([inv,storage(1.5),grid],[
 wire('ac_wire','inverter','ac','grid','ac'),
 wire('dc_wire','inverter','battery','storage','dc')]);
const numericalBefore=JSON.stringify(ctx.balance.resolve(scenario,{states:{}}));
const view=ctx.diag.viewModel(scenario,{states:{}});
assert.equal(view.networks.length,2);
const dc=view.networks.find(n=>n.medium==='dc');
assert.equal(dc.state,'unbalanced');
assert.equal(dc.diagnostic_reason,'dc_converter_missing');
assert.equal(dc.residual_kw,-1.5);
const dcWire=view.cables.find(c=>c.id==='dc_wire');
assert.equal(dcWire.reason,'unbalanced');
assert.equal(dcWire.diagnostic_reason,'dc_converter_missing');
assert.equal(view.networks.find(n=>n.medium==='ac').diagnostic_reason,null);
assert(view.warnings.some(w=>w.connection_id==='dc_wire'&&w.diagnostic_reason==='dc_converter_missing'));
const pl=ctx.diag.render(scenario,{states:{}},'pl');
assert(pl.includes('Brak modelu konwersji DC'));
assert(pl.includes('Różnica mocy pozostaje nierozliczona'));
assert(pl.includes('3.040 kW'));
assert(!pl.includes('MPPT NaN'));
assert(!pl.includes('MPPT undefined'));
assert(!pl.includes('Pomiary sprzeczne'),'DC case should explain incomplete model, not assert contradictory measurements');
const en=ctx.diag.render(scenario,{states:{}},'en');
assert(en.includes('DC conversion model missing'));
assert(!en.includes('MPPT NaN'));
assert.equal(JSON.stringify(ctx.balance.resolve(scenario,{states:{}})),numericalBefore,'Rendering must not alter numerical results');
// Known DC participants with an actual nonzero residual remain contradictory,
// not "converter missing", when no inverter is involved.
const discharging=node('discharging','energy_storage',[pt('dc')],{
 label:'Discharging battery',energy_mode:'test',
 energy_storage:{mode:'manual',manual:{soc:75,power:-0.5}}});
const contradictory=layout([storage(1.5),discharging],[
 wire('dc_wire','discharging','dc','storage','dc')]);
const cview=ctx.diag.viewModel(contradictory,{states:{}});
assert.equal(cview.networks[0].diagnostic_reason,null);
assert.equal(cview.networks[0].state,'unbalanced');
assert(ctx.diag.render(contradictory,{states:{}},'pl').includes('Pomiary sprzeczne'));
// Missing HA readings should still show the old missing-data status.
const missingStore=storage(1.5);missingStore.energy_mode='ha';
const missing=layout([inv,missingStore,grid],[
 wire('ac_wire','inverter','ac','grid','ac'),
 wire('dc_wire','inverter','battery','storage','dc')]);
const missingView=ctx.diag.viewModel(missing,{states:{}});
assert.equal(missingView.networks[0].diagnostic_reason,null);
assert.equal(missingView.networks[0].state,'insufficient');
// Correct MPPT ordinal appears only when a real input_index is attached.
const malformed=ctx.diag.viewModel(scenario,{states:{}});
assert(malformed.warnings.some(w=>w.input_index===null&&w.connection_id==='dc_wire'));
const mpptWarning=layout([{
 ...inv,inverter:{...inv.inverter,inputs:[{required:true,manual:{voltage:null,current:null,power:null},
 manual_enabled:{voltage:false,current:false,power:false}}]}
},board],[wire('pv_wire','inverter','pv1','board','a')]);
const mpptView=ctx.diag.viewModel(mpptWarning,{states:{}});
assert(mpptView.warnings.some(w=>w.input_index===0));
const h=ctx.diag.render(mpptWarning,{states:{}},'pl');
assert(h.includes('MPPT 1'));
assert(!h.includes('MPPT NaN'));
console.log('PASS B.2.1: no MPPT NaN, converter-limited DC diagnostics and unchanged numerical solver.');
