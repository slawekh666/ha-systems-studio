/* MR 5 diagnostics: model source, isolation, no invented values, escaping, config roundtrip. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={isEnt:x=>typeof x==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(x)};
vm.createContext(ctx);
for(const f of ['ha-state.js','readout-scale.js','device-registry.js','studio-viewport.js',
'inverter.js','building.js','ev-charger.js','energy-storage.js','power-grid.js',
'distribution-board.js','radiator.js','manifold.js','energy-topology.js','energy-balance.js',
'energy-flow.js','energy-diagnostics.js','power-flow.js','studio-layout.js'])
 vm.runInContext(fs.readFileSync('src/'+f,'utf8'),ctx,{filename:f});
vm.runInContext('this.diag=HASSStudioEnergyDiagnostics;this.layout=HASSStudioLayout;',ctx);
const {diag,layout}=ctx;
const port=(id='ac')=>({id,medium:'ac',bus:'main'});
const node=(id,type,extra={})=>({id,type,x:1,y:1,scale:1,energy_ports:[port()],...extra});
const pv=node('pv','inverter',{label:'PV <unsafe>',inverter:{mode:'manual',manual:{ac_power:1.73,temperature:30}}});
const home=node('home','building',{building:{mode:'manual',power_kw:2.5,measurement:'individual'}});
const grid=node('grid','power_grid');
const panel=node('panel','distribution_board',{energy_ports:['a','b','c'].map(port)});
const wire=(id,a,b)=>({id,type:'electric',points:[{x:0,y:0},{x:20,y:0}],
energy_start:{node_id:a,port_id:'ac'},energy_end:{node_id:'panel',port_id:b},
animation:{flow_power_mode:'balance',flow_pattern:'dots'}});
const config={studio_layout:{energy_balance:{enabled:true,scenario:'hybrid',participants:[{node_id:'grid',mode:'calculate'}]},
energy_diagnostics:{enabled:true},nodes:[pv,home,grid,panel],
connections:[wire('c1','pv','a'),wire('c2','home','b'),wire('c3','grid','c')]}};
let x=layout.normalized(config),v=diag.viewModel(x,{states:{}});
assert.equal(v.networks.length,1);
assert.equal(v.networks[0].state,'balanced');
assert.equal(v.networks[0].totals.grid_import_kw,.77);
assert.equal(v.cables.length,3);
assert.equal(v.cables[0].kw,1.73);
assert(v.networks[0].devices.some(d=>d.source==='simulated'));
assert(v.networks[0].devices.some(d=>d.source==='calculated'));
assert.equal(v.warnings.length,0);
const html=diag.render(x,{states:{}},'pl');
assert(html.includes('0.770 kW'));
assert(html.includes('Wyliczone'));
assert(!html.includes('PV <unsafe>'));
assert(html.includes('PV &lt;unsafe&gt;'));
assert(html.includes('data-energy-status="ok"'));
assert(diag.render(x,{states:{}},'en').includes('Energy balance'));
const round=layout.normalized({studio_layout:x});
assert.equal(JSON.stringify(round.energy_diagnostics),JSON.stringify(x.energy_diagnostics));
assert.equal(diag.normalize({enabled:1,show_cables:false}).enabled,false);
assert.equal(diag.render({...x,energy_diagnostics:{enabled:false}},{states:{}}),'');
let missing=layout.normalized({studio_layout:{...config.studio_layout,
energy_balance:{enabled:true,participants:[{node_id:'grid',mode:'calculate'},{node_id:'pv',mode:'ha',entity:'sensor.unknown'}]}}});
v=diag.viewModel(missing,{states:{}});
assert.equal(v.networks[0].state,'insufficient');
assert.equal(v.networks[0].totals,null);
assert(diag.render(missing,{states:{}},'en').includes('Unresolved'));
const disconnected=layout.normalized({studio_layout:{energy_balance:{enabled:true},energy_diagnostics:{enabled:true},
nodes:[],connections:[{id:'broken',type:'electric',points:[{x:0,y:0},{x:2,y:2}],animation:{flow_power_mode:'balance'}}]}});
v=diag.viewModel(disconnected,{states:{}});
assert.equal(v.networks.length,0);assert.equal(v.cables.length,1);
assert(v.warnings.some(w=>w.connection_id==='broken'));
const isolated=layout.normalized({studio_layout:{energy_balance:{enabled:true},energy_diagnostics:{enabled:true},
nodes:[pv,home,grid,panel],connections:[wire('c1','pv','a'),wire('c2','home','b'),wire('c3','grid','c'),
{id:'invalid',type:'electric',points:[{x:0,y:0},{x:2,y:2}],energy_start:{node_id:'missing',port_id:'ac'},energy_end:{node_id:'pv',port_id:'ac'},animation:{flow_power_mode:'balance'}}]}});
v=diag.viewModel(isolated,{states:{}});
assert(v.warnings.some(w=>w.reason==='missing_node'));
const src=fs.readFileSync('src/studio-custom.js','utf8');
assert(src.includes('data-diagnostics-enable'));
assert(src.includes("HASSStudioEnergyDiagnostics.render(this._cfg,this._hass"));
assert(!fs.readFileSync('src/energy-diagnostics.js','utf8').includes('callService'));
console.log('MR5 diagnostics: provenance, network isolation, missing readings, UI flags, escaping, roundtrip PASS');
