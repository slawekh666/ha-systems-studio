/* Stage 05: schema, legacy persisted fields and inspector/normalizer contract. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={};vm.createContext(ctx);
for(const f of ['ha-state.js','readout-scale.js','device-parameters.js','inverter.js'])
 vm.runInContext(fs.readFileSync('src/'+f,'utf8'),ctx,{filename:f});
vm.runInContext('this.schema=HASSStudioDeviceParameters.inverter;this.inv=HASSStudioInverter;',ctx);
const {schema,inv}=ctx;
assert.equal(schema.coreKeys.join(','),'ac_power,temperature,status,alarm');
assert.equal(schema.pvKeys.join(','),'voltage,current,power');
for(const group of [schema.core,schema.pv]){
 assert(Object.isFrozen(group));
 for(const key of Object.keys(group)){
  const f=group[key];
  assert.equal(f.id,key);
  assert(f.label&&f.role&&f.entityPath&&f.manualPath);
  assert(['number','enum','boolean'].includes(f.kind));
  assert(Object.isFrozen(f));
 }
}
assert(Object.isFrozen(schema));
assert.equal(schema.core.ac_power.unit,'kW');
assert.equal(schema.core.ac_power.role,'energy_source');
assert.equal(schema.pv.power.unit,'W');
assert.equal(schema.entity('sensor.pv1'),'sensor.pv1');
assert.equal(schema.entity('invalid'),'');
assert.equal(JSON.stringify(inv.defaults().entities),JSON.stringify(schema.entities(schema.core)));
assert.equal(JSON.stringify(inv.defaults().manual),JSON.stringify(schema.manualDefaults(schema.core)));
assert.equal(JSON.stringify(inv.defaultInput(0)),JSON.stringify(schema.inputDefaults(0)));
assert.equal(inv.defaultInput(3).visible,false);
assert.equal(inv.defaultInput(11).name,'PV12');
const old={type:'inverter',id:'pv',inverter:{
 entities:{ac_power:'sensor.ac',temperature:'sensor.temp',status:'sensor.status',alarm:'binary_sensor.alarm'},
 manual:{ac_power:6.4,temperature:32,status:'auto',alarm:false},count:2,
 inputs:[{name:'PV1',entities:{voltage:'sensor.v',current:'sensor.a',power:'sensor.p'},
 manual:{voltage:380,current:8,power:null}}],
 panel_rows:[{key:'custom',entity:'sensor.daily',label:'Daily'}]
}};
const saved=JSON.stringify(old);
const normalized=inv.normalize(old);
assert.equal(JSON.stringify(old),saved);
assert.equal(normalized.entities.ac_power,'sensor.ac');
assert.equal(normalized.inputs[0].entities.voltage,'sensor.v');
assert.equal(normalized.inputs[0].manual.power,null);
assert.equal(normalized.panel_rows[0].entity,'sensor.daily');
assert.equal(JSON.stringify(inv.normalize({inverter:normalized})),JSON.stringify(normalized));
const invalid=inv.normalize({inverter:{entities:{ac_power:'invalid'},inputs:[{entities:{power:'bad'}}]}});
assert.equal(invalid.entities.ac_power,'');
assert.equal(invalid.inputs[0].entities.power,'');
assert.equal(Object.keys(invalid.entities).join(','),schema.coreKeys.join(','));
assert.equal(Object.keys(invalid.inputs[0].entities).join(','),schema.pvKeys.join(','));
const inspector=fs.readFileSync('src/studio-inspector.js','utf8');
const editor=fs.readFileSync('src/studio-custom.js','utf8');
assert(inspector.includes('inverterFields.core.ac_power.label'));
assert(inspector.includes('inverterFields.pv.voltage.label'));
assert(editor.includes('HASSStudioDeviceParameters.inverter.coreKeys.includes(f)'));
assert.equal(inv.parameters,schema);
console.log('Stage 05: immutable inverter field schema, legacy config, editor metadata PASS');
