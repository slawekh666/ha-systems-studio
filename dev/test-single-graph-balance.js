/* Stage 07A.1-D.2-A — a single topology.graph() per balance resolve. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={isEnt:id=>typeof id==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(id),__graphBuilds:0};
vm.createContext(context);
for(const file of ['ha-state.js','readout-scale.js','device-registry.js','studio-viewport.js',
 'device-parameters.js','inverter-readings.js','inverter.js','building.js','ev-charger.js',
 'energy-storage.js','power-grid.js','distribution-board.js','radiator.js','manifold.js',
 'energy-topology.js','energy-balance.js','energy-flow.js','energy-diagnostics.js',
 'power-flow.js','studio-layout.js']){
 let source=fs.readFileSync('src/'+file,'utf8');
 if(file==='energy-topology.js'){
  const needle='const graph=layout=>{';
  assert.equal(source.split(needle).length,2,'Topology graph instrumentation target changed');
  source=source.replace(needle,needle+'globalThis.__graphBuilds++;');
 }
 vm.runInContext(source,context,{filename:file});
}
vm.runInContext('this.layout=HASSStudioLayout;this.balance=HASSStudioEnergyBalance;this.flow=HASSStudioEnergyFlow;',context);
const pt=id=>({id,label:id,medium:'ac',bus:'main',x:50,y:50});
const node=(id,type,ports,extra={})=>({id,type,x:0,y:0,scale:1,energy_ports:ports,...extra});
const wire=(id,a,pa,b,pb)=>({id,type:'electric',
 points:[{x:0,y:0},{x:100,y:0}],
 energy_start:{node_id:a,port_id:pa},energy_end:{node_id:b,port_id:pb},
 animation:{flow_power_mode:'balance'}});
function circuit(prefix,houseKw){
 return {
  nodes:[
   node(prefix+'grid','power_grid',[pt('ac')],{energy_grid_auto:true}),
   node(prefix+'board','distribution_board',[pt('grid'),pt('home')]),
   node(prefix+'home','building',[pt('supply'),pt('outlet')],{
    energy_mode:'test',building:{measurement:'aggregate',power_kw:houseKw}}),
   node(prefix+'ev','ev_charger',[pt('ac')],{
    energy_mode:'test',ev_charger:{manual:{power:7.2}}})
  ],
  wires:[
   wire(prefix+'gridline',prefix+'grid','ac',prefix+'board','grid'),
   wire(prefix+'homeline',prefix+'board','home',prefix+'home','supply'),
   wire(prefix+'evline',prefix+'home','outlet',prefix+'ev','ac')
  ]
 };
}
const a=circuit('a_',10),b=circuit('b_',3);
const layout=context.layout.normalized({studio_layout:{
 nodes:[...a.nodes,...b.nodes],connections:[...a.wires,...b.wires],
 energy_balance:{enabled:true,tolerance_kw:0.05}
}});
const layoutBefore=JSON.stringify(layout);
context.__graphBuilds=0;
let result=context.balance.resolve(layout,{states:{}});
assert.equal(context.__graphBuilds,1,'Balance must construct topology once, not once per network');
assert.equal(result.networks.length,2);
const find=(x,id)=>x.networks.find(n=>n.devices.some(d=>d.node_id===id));
const ok=find(result,'a_home'),bad=find(result,'b_home');
assert.equal(ok.state,'balanced');
assert.equal(ok.totals.consumption_kw,10);
assert.equal(ok.devices.find(d=>d.node_id==='a_home').power_model.own_consumption_kw,2.8);
assert.equal(bad.state,'invalid');
assert(result.warnings.some(w=>w.node_id==='b_home'&&w.reason==='building_child_exceeds_total'));
assert.equal(result.topology.edges.length,6);
assert.equal(JSON.stringify(layout),layoutBefore,'Read-only resolution must not mutate the layout');
context.__graphBuilds=0;
const flow=context.flow.resolve(layout,{states:{}});
assert.equal(context.__graphBuilds,1,'Flow must reuse one graph for all building hierarchies');
assert.equal(flow.balance.networks.length,2);
assert.equal(flow.byConnection.a_evline.kw,7.2);
assert.equal(flow.byConnection.b_evline.available,false);
context.__graphBuilds=0;
const disabled=context.balance.resolve({...layout,energy_balance:{enabled:false}}, {states:{}});
assert.equal(disabled.enabled,false);
assert.equal(context.__graphBuilds,0,'Disabled balance should not build topology');
console.log('PASS 07A.1-D.2-A: one graph per resolve with two independent AC networks; valid/invalid building cases and unchanged layout.');
