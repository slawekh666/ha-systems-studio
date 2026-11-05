/* Stage 07A.2-B.1 — source priority, zero, missing, calculated and legacy PV data. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={};vm.createContext(ctx);
for(const file of ['ha-state.js','readout-scale.js','device-parameters.js','inverter-readings.js','inverter.js'])
 vm.runInContext(fs.readFileSync('src/'+file,'utf8'),ctx,{filename:file});
vm.runInContext('this.inv=HASSStudioInverter;this.readings=HASSStudioInverterReadings;',ctx);
const {inv,readings}=ctx;
const state=(v,u)=>({state:String(v),attributes:{unit_of_measurement:u}});
const h=(entries={})=>({states:entries});
const base=(mode,enabled=true,input={})=>({id:'sofar',type:'inverter',energy_mode:mode,
 energy_fallback_enabled:enabled,inverter:{count:1,entities:{ac_power:'sensor.ac'},
 manual:{ac_power:5},inputs:[{name:'PV2',entities:{
  voltage:'sensor.voltage',current:'sensor.current',power:'sensor.power'},...input}]}});
const data=(n,ha=h())=>readings.resolve(n,ha,inv.normalize(n));
const measured=h({'sensor.voltage':state(380,'V'),'sensor.current':state(8,'A'),
 'sensor.power':state(3000,'W'),'sensor.ac':state(4500,'W')});
const raw={
 manual:{voltage:380,current:8,power:100},
 manual_enabled:{voltage:true,current:true,power:true}
};
let n=base('auto',true,raw);
let q=data(n,measured);
assert.equal(q.inputs[0].watts,3000);
assert.equal(q.inputs[0].power_source,'measured');
assert.equal(q.inputs[0].status,'ok');
assert.equal(q.power,4.5,'AC remains independent of PV');
assert.equal(q.sources.power,'measured');
assert.equal(q.inputs[0].provenance.power,'measured');
let empty=h({'sensor.ac':state('unavailable','W')});
q=data(n,empty);
assert.equal(q.inputs[0].watts,100,'Direct TEST before V × A');
assert.equal(q.inputs[0].power_source,'simulated');
assert.equal(q.power,5,'Legacy AC fallback is unchanged');
let cleared=base('auto',true,{manual:{voltage:380,current:8,power:null},
 manual_enabled:{voltage:true,current:true,power:false}});
q=data(cleared,empty);
assert.equal(q.inputs[0].watts,3040);
assert.equal(q.inputs[0].calculated,true);
assert.equal(q.inputs[0].power_source,'calculated_test');
assert.equal(q.inputs[0].provenance.voltage,'simulated');
let input=inv.normalize(cleared).inputs[0];
assert.equal(input.manual_enabled.power,false);
assert.equal(input.manual.power,null);
assert.equal(inv.normalize({inverter:{inputs:[input]}}).inputs[0].manual_enabled.power,false);
let haOnly=base('ha',true,raw);
q=data(haOnly,measured);
assert.equal(q.inputs[0].watts,3000);
q=data(haOnly,h({'sensor.voltage':state(380,'V'),'sensor.current':state(8,'A')}));
assert.equal(q.inputs[0].watts,3040);
assert.equal(q.inputs[0].power_source,'calculated_ha');
assert.equal(data(haOnly,empty).inputs[0].watts,null);
assert.equal(data(base('auto',false,raw),empty).inputs[0].watts,null);
q=data(base('test',true,raw),measured);
assert.equal(q.inputs[0].watts,100);
assert.equal(q.inputs[0].voltage,380);
assert.equal(q.inputs[0].current,8);
q=data(base('test',true,{manual:{voltage:380,current:8,power:null},
 manual_enabled:{voltage:true,current:true,power:false}}),measured);
assert.equal(q.inputs[0].watts,3040);
assert.equal(q.inputs[0].power_source,'calculated_test');
q=data(base('test',true,{manual:{voltage:380,current:8,power:0},
 manual_enabled:{voltage:true,current:true,power:true}}),empty);
assert.equal(q.inputs[0].watts,0);
assert.equal(q.inputs[0].calculated,false);
assert.equal(q.inputs[0].status,'warning','Contradictory direct and V × A should warn');
assert(q.inputs[0].warning.includes('V × A'));
const silent=inv.normalize(base('test',true,{required:true,inverter:{}}));
assert.equal(silent.inputs[0].required,true);
const newDefault=inv.normalize(base('test',true)).inputs[0];
assert.equal(newDefault.manual_enabled.voltage,false);
assert.equal(newDefault.manual_enabled.current,false);
assert.equal(newDefault.manual_enabled.power,false);
q=data(base('test',true,{required:true}),empty);
assert.equal(q.inputs[0].watts,null);
assert.equal(q.inputs[0].status,'invalid');
assert.match(q.inputs[0].error,/TEST V/);
assert.match(q.inputs[0].error,/TEST A/);
q=data(base('test',true),empty);
assert.equal(q.inputs[0].watts,null);
assert.equal(q.inputs[0].error,null,'Optional missing PV is not invalid');
const mixed=base('auto',true,{required:true,manual:{voltage:380,current:null,power:null},
 manual_enabled:{voltage:true,current:false,power:false}});
q=data(mixed,h({'sensor.current':state(8,'A')}));
assert.equal(q.inputs[0].watts,null,'Do not infer 380 TEST V × 8 HA A');
assert.equal(q.inputs[0].status,'invalid');
assert.equal(q.inputs[0].voltage,380);
assert.equal(q.inputs[0].current,8);
q=data(base('ha',true,{required:true}),h({
 'sensor.voltage':state(380,'kWh'),'sensor.current':state(8,'V'),
 'sensor.power':state(5,'kWh')}));
assert.equal(q.inputs[0].watts,null);
assert(q.inputs[0].error);
let legacy=base('test',true,{manual:{voltage:380,current:8,power:null}});
let normalized=inv.normalize(legacy);
assert.equal(normalized.inputs[0].manual_enabled.voltage,true);
assert.equal(normalized.inputs[0].manual_enabled.current,true);
assert.equal(normalized.inputs[0].manual_enabled.power,false);
assert.equal(data(legacy).inputs[0].watts,3040);
let all=inv.normalize({inverter:{count:12}});
assert.equal(all.inputs.length,12);
assert(all.inputs.every(x=>x.manual_enabled.power===false&&x.required===false));
assert.equal(data({type:'inverter',energy_mode:'test',inverter:all}).inputs.length,12);
const roundTrip=JSON.stringify(inv.normalize({inverter:{...normalized,inputs:normalized.inputs}}));
assert.equal(JSON.stringify(inv.normalize({inverter:JSON.parse(roundTrip)})),roundTrip);
console.log('PASS 07A.2-B.1: PV HA/TEST priority, same-source V×A, zero, legacy, 12 inputs, required errors and AC parity.');
