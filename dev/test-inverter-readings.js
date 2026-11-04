/* Stage 06: runtime HA/TEST resolver regression (not text-only assertions). */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={};vm.createContext(ctx);
for(const file of ['ha-state.js','readout-scale.js','device-parameters.js','inverter-readings.js','inverter.js'])
 vm.runInContext(fs.readFileSync('src/'+file,'utf8'),ctx,{filename:file});
vm.runInContext('this.readings=HASSStudioInverterReadings;this.inv=HASSStudioInverter;',ctx);
const {readings,inv}=ctx;
const reading=(state,unit='')=>({state:String(state),attributes:{unit_of_measurement:unit}});
const h=states=>({states});
const base={type:'inverter',id:'pv1',inverter:{
 entities:{ac_power:'sensor.ac',temperature:'sensor.temp',
  status:'sensor.status',alarm:'binary_sensor.alarm'},
 inputs:[{name:'PV1',entities:{voltage:'sensor.v',current:'sensor.a',power:'sensor.p'},
  manual:{voltage:410,current:4,power:null}}]
}};
const make=(changes={})=>({...base,...changes,
 inverter:{...base.inverter,...(changes.inverter||{})}});
const resolve=(node,ha)=>readings.resolve(node,ha,inv.normalize(node));
const observed=h({'sensor.ac':reading(0,'W'),'sensor.temp':reading(0,'°C'),
 'sensor.v':reading(0,'V'),'sensor.a':reading(8,'A'),'sensor.p':reading(0,'W'),
 'binary_sensor.alarm':reading('off'),'sensor.status':reading('normal')});
const auto=make({energy_mode:'auto',energy_fallback_enabled:true});
const zero=resolve(auto,observed);
assert.equal(zero.power,0);
assert.equal(zero.temperature,0);
assert.equal(zero.inputs[0].watts,0);
assert.equal(zero.inputs[0].calculated,false);
assert.equal(zero.sources.power,'measured');
assert.equal(zero.sources.temperature,'measured');
assert.equal(zero.sources.inputs[0].power,'measured');
assert.equal(zero.alarm,'ok');
assert.equal(inv.data(auto,observed).state,'standby');
assert.equal(inv.data(auto,observed).power,zero.power);
console.log('RESOLVER A: HA zero is a real measured value PASS');
const empty=h({'sensor.ac':reading('unavailable','W'),'sensor.temp':reading('unknown','°C'),
 'sensor.v':reading('unavailable','V'),'sensor.a':reading('unavailable','A'),
 'sensor.p':reading('unavailable','W')});
const onlyHA=make({energy_mode:'ha'});
const missing=resolve(onlyHA,empty);
assert.equal(missing.power,null);
assert.equal(missing.temperature,null);
assert.equal(missing.inputs[0].watts,null);
assert.equal(missing.sources.power,'missing');
assert.equal(inv.data(onlyHA,empty).state,'unknown');
const wrong=h({'sensor.ac':reading(700,'kWh'),'sensor.temp':reading(30,'kW'),
 'sensor.v':reading(120,'kWh'),'sensor.a':reading(8,'V'),'sensor.p':reading(500,'kWh')});
assert.equal(resolve(onlyHA,wrong).power,null);
assert.equal(resolve(onlyHA,wrong).temperature,null);
assert.equal(resolve(onlyHA,wrong).inputs[0].watts,null);
console.log('RESOLVER B: unknown and invalid units never fabricate readings PASS');
const forced=make({energy_mode:'test',inverter:{
 manual:{ac_power:-1.2,temperature:42,alarm:true,status:'auto'}}});
const manual=resolve(forced,observed);
assert.equal(manual.power,-1.2);
assert.equal(manual.temperature,42);
assert.equal(manual.alarm,'alarm');
assert.equal(manual.inputs[0].voltage,410);
assert.equal(manual.inputs[0].current,4);
assert.equal(manual.inputs[0].watts,1640);
assert.equal(manual.inputs[0].calculated,true);
assert.equal(manual.sources.power,'simulated');
assert.equal(inv.data(forced,observed).fault,true);
console.log('RESOLVER C: explicit TEST and V×A calculation PASS');
const backup=resolve(auto,empty);
assert.equal(backup.power,6.4);
assert.equal(backup.temperature,32);
assert.equal(backup.inputs[0].watts,1640);
assert.equal(backup.sources.power,'simulated');
const disabled=make({energy_mode:'auto',energy_fallback_enabled:false});
assert.equal(resolve(disabled,empty).power,null);
assert.equal(resolve(disabled,empty).temperature,null);
assert.equal(resolve(disabled,empty).inputs[0].watts,null);
console.log('RESOLVER D: automatic fallback needs explicit permission PASS');
const legacy=make({inverter:{mode:'manual',manual:{ac_power:2.7,temperature:55,alarm:false}}});
assert.equal(resolve(legacy,observed).power,2.7);
assert.equal(resolve(legacy,observed).temperature,55);
const signed=make({energy_mode:'ha',inverter:{positive_power:false}});
const signedHA=h({'sensor.ac':reading(-1700,'W')});
assert.equal(resolve(signed,signedHA).power,-1.7);
assert.equal(inv.data(signed,signedHA).state,'generating');
console.log('RESOLVER E: legacy/manual and signed power contract PASS');
assert(Object.isFrozen(readings));
console.log('PASS: Stage 06 inverter readout resolver.');
