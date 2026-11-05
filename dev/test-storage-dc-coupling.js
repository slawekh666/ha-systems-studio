/* Stage 07A.2-C — DC battery terminal and coupling validation. */
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
vm.runInContext('this.storage=HASSStudioEnergyStorage;this.layout=HASSStudioLayout;'+
 'this.balance=HASSStudioEnergyBalance;this.flow=HASSStudioEnergyFlow;'+
 'this.diag=HASSStudioEnergyDiagnostics;',ctx);
const {storage,layout,balance,flow,diag}=ctx;
const pt=(id,medium='ac',bus='main')=>({id,label:id,medium,bus,x:50,y:50});
const node=(id,type,ports,props={})=>({id,type,x:10,y:10,scale:1,energy_ports:ports,...props});
const cable=(id,a,pa,b,pb)=>({id,type:'electric',points:[{x:0,y:0},{x:100,y:0}],
 energy_start:{node_id:a,port_id:pa},energy_end:{node_id:b,port_id:pb},
 animation:{flow_power_mode:'balance'}});
const settings=(coupling,port,power=1.5,extra={})=>({
 energy_mode:'test',energy_storage:{
 mode:'manual',charge_positive:true,manual:{soc:75,power},
 coupling,coupling_port_id:port,...extra
 }});
const batt=(id,ports,settingsArg)=>node(id,'energy_storage',ports,settingsArg);
const net=(nodes,edges)=>layout.normalized({studio_layout:{
 energy_balance:{enabled:true},energy_diagnostics:{enabled:true},
 nodes,connections:edges}});
const inverter=node('sofar','inverter',[pt('ac'),pt('pv','dc','pv'),pt('bat','dc','battery')],{
 energy_mode:'test',inverter:{manual:{ac_power:5}}});
const grid=node('grid','power_grid',[pt('ac')],{energy_grid_auto:true});
const dc=batt('battery',[pt('dc','dc'),pt('ac')],settings('dc','dc',1.5));
const acCable=cable('ac_wire','sofar','ac','grid','ac'),
 dcCable=cable('dc_wire','sofar','bat','battery','dc');
const acDefault=batt('legacy',[pt('ac')],{energy_mode:'test',energy_storage:{
 mode:'manual',charge_positive:true,manual:{soc:75,power:1.5}
}});
assert.equal(storage.normalize(acDefault).coupling,'legacy');
assert.equal(storage.dcTerminal(acDefault,null).enabled,false);
const acLine=net([grid,acDefault],[cable('line','grid','ac','legacy','ac')]);
const acBalance=balance.resolve(acLine,{states:{}});
const acDevice=acBalance.networks[0].devices.find(d=>d.node_id==='legacy');
assert.equal(acDevice.injection_kw,-1.5);
assert.equal(acDevice.source,'simulated');
assert.equal(acBalance.storage_terminals.length,0);
const rawStorage=storage.dcTerminal(dc,{states:{}});
assert.equal(rawStorage.enabled,true);
assert.equal(rawStorage.terminal.power_kw,1.5);
assert.equal(rawStorage.terminal.injection_kw,-1.5);
assert.equal(rawStorage.terminal.source,'simulated');
assert.equal(rawStorage.terminal.soc,75);
assert.equal(rawStorage.terminal.status,'ok');
assert.equal(rawStorage.terminal.included_in_balance,false);
assert.equal(rawStorage.issues.length,0);
const diagram=net([grid,inverter,dc],[acCable,dcCable]);
const source=JSON.stringify(diagram);
const result=balance.resolve(diagram,{states:{}});
assert.equal(result.networks.length,2);
const dcNetwork=result.networks.find(n=>n.medium==='dc');
const acNetwork=result.networks.find(n=>n.medium==='ac');
assert.equal(dcNetwork.state,'unbalanced');
assert.equal(dcNetwork.residual_kw,-1.5);
assert.equal(dcNetwork.devices.length,1);
assert.equal(dcNetwork.devices[0].node_id,'battery');
assert.equal(dcNetwork.devices[0].injection_kw,-1.5);
assert.equal(acNetwork.devices.find(d=>d.node_id==='sofar').injection_kw,5);
assert.equal(result.storage_terminals.length,1);
assert.equal(result.storage_terminals[0].network_id,dcNetwork.id);
assert.equal(result.storage_terminals[0].connected,true);
assert.equal(result.storage_terminals[0].injection_kw,-1.5);
assert.equal(JSON.stringify(diagram),source,'No mutation during balance');
assert.equal(JSON.stringify(layout.normalized({studio_layout:JSON.parse(source)})),source);
const dcView=diag.viewModel(diagram,{states:{}});
assert.equal(dcView.storageTerminals.length,1);
assert.equal(dcView.networks.find(n=>n.medium==='dc').diagnostic_reason,'dc_converter_missing');
const html=diag.render(diagram,{states:{}},'pl');
assert(html.includes('Magazyny DC'));
assert(html.includes('−')||html.includes('-1.500 kW'));
assert(html.includes('Brak modelu konwersji DC'));
assert(!html.includes('MPPT NaN'));
assert.equal(flow.resolve(diagram,{states:{}}).byConnection.dc_wire.available,false);
for(const [power,expected] of [[-2,2],[0,0],[1.5,-1.5]]){
 const v=storage.dcTerminal(batt('battery',[pt('dc','dc')],settings('dc','dc',power)),null);
 assert.equal(v.terminal.injection_kw,expected);
}
const reversed=storage.dcTerminal(batt('battery',[pt('dc','dc')],
 settings('dc','dc',1.5,{charge_positive:false})),null);
assert.equal(reversed.terminal.injection_kw,1.5);
const hass={states:{
 'sensor.battery_power':{state:'-2500',attributes:{unit_of_measurement:'W'}},
 'sensor.soc':{state:'65',attributes:{unit_of_measurement:'%'}},
 'binary_sensor.bms':{state:'on',attributes:{}}
}};
const live=storage.dcTerminal(batt('battery',[pt('dc','dc')],{
 energy_mode:'ha',energy_storage:{coupling:'dc',coupling_port_id:'dc',
 entities:{power:'sensor.battery_power',soc:'sensor.soc',bms_alarm:'binary_sensor.bms'}}}),hass);
assert.equal(live.terminal.injection_kw,2.5);
assert.equal(live.terminal.soc,65);
assert.equal(live.terminal.bms_alarm,true);
assert(live.issues.includes('dc_storage_bms_alarm'));
const missing=storage.dcTerminal(batt('battery',[pt('dc','dc')],{
 energy_mode:'ha',energy_storage:{coupling:'dc',coupling_port_id:'dc',
 entities:{power:'sensor.missing'}}}),{states:{}});
assert.equal(missing.terminal.injection_kw,null);
assert.equal(missing.terminal.status,'missing');
const badUnits=storage.dcTerminal(batt('battery',[pt('dc','dc')],{
 energy_mode:'ha',energy_storage:{coupling:'dc',coupling_port_id:'dc',
 entities:{power:'sensor.bad'}}}),{states:{'sensor.bad':{
 state:'1500',attributes:{unit_of_measurement:'kWh'}}}});
assert.equal(badUnits.terminal.injection_kw,null,'Stored energy kWh is not kW');
const limits=batt('battery',[pt('dc','dc')],settings('dc','dc',1.5,{
 max_charge_kw:1,max_discharge_kw:2}));
const over=net([grid,inverter,limits],[acCable,dcCable]);
const overSolved=balance.resolve(over,{states:{}});
assert(overSolved.warnings.some(w=>w.reason==='dc_storage_charge_limit_exceeded'));
assert.equal(overSolved.networks.find(n=>n.medium==='dc').residual_kw,-1.5,
 'Limit warnings do not modify power');
const discharge=storage.dcTerminal(batt('battery',[pt('dc','dc')],settings('dc','dc',-3,{
 max_discharge_kw:2,min_soc:80})),null);
assert(discharge.issues.includes('dc_storage_discharge_limit_exceeded'));
assert(discharge.issues.includes('dc_storage_low_soc_discharge'));
// Wrong medium, missing selection, missing physical port and disconnected
// battery must never be silently assigned to an unrelated attached AC network.
for(const [port,ports,reason] of [
 ['', [pt('ac'),pt('dc','dc')],'dc_storage_port_required'],
 ['nonexistent',[pt('ac'),pt('dc','dc')],'dc_storage_port_missing'],
 ['ac',[pt('ac'),pt('dc','dc')],'dc_storage_port_wrong_medium'],
 ['dc',[pt('ac'),pt('dc','dc')],'dc_storage_port_unconnected']
]){
 const bad=batt('battery',ports,settings('dc',port));
 const wires=[acCable,cable('battery_ac','battery','ac','grid','ac')];
 const result=balance.resolve(net([grid,inverter,bad],wires),{states:{}});
 assert(result.warnings.some(w=>w.reason===reason),reason);
 assert(result.warnings.some(w=>w.reason==='invalid_storage_coupling'));
 assert.equal(result.networks.find(n=>n.medium==='ac').state,'invalid',
   'Wrong DC selection must not silently add battery into AC');
 assert(!result.networks.some(n=>n.devices.some(d=>
   d.node_id==='battery'&&d.injection_kw===-1.5)));
}
const oldDc=batt('battery',[pt('dc','dc')],{energy_mode:'test',
 energy_storage:{mode:'manual',manual:{soc:75,power:1.5}}});
assert.equal(storage.normalize(oldDc).coupling,'legacy');
const oldDcFlow=balance.resolve(net([grid,inverter,oldDc],[acCable,dcCable]),{states:{}});
assert.equal(oldDcFlow.networks.find(n=>n.medium==='dc').residual_kw,-1.5,
 'Existing DC diagrams retain their old meter behavior until opted in');
const code=[fs.readFileSync('src/studio-inspector.js','utf8'),
 fs.readFileSync('src/studio-custom.js','utf8')];
assert(code[0].includes("'storage_coupling'"));
assert(code[0].includes("'storage_coupling_port_id'"));
assert(code[1].includes("k==='coupling'"));
assert(code[1].includes("k==='coupling_port_id'"));
console.log('PASS 07A.2-C: legacy AC/DC unchanged, explicit DC battery port, sign, SOC/BMS, limits, no artificial converter flows.');
