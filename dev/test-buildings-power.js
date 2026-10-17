/* Building load and power-flow regression: no fake HA data or topology assumptions. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={};vm.createContext(ctx);
for(const f of ['src/ha-state.js','src/readout-scale.js','src/svg-template.js','src/building.js','src/power-flow.js'])
 vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
for(const [id,file] of [['buildingHouse','building-house'],['buildingGarage','building-garage'],['buildingWorkshop','building-workshop']])
 ctx[id]=fs.readFileSync('src/icons/'+file+'.svg','utf8').replace(/^\s*<svg\b[^>]*>/,'').replace(/<\/svg>\s*$/,'');
vm.runInContext('this.HASSStudioIconTemplates={buildingHouse,buildingGarage,buildingWorkshop};this.building=HASSStudioBuilding;this.powerFlow=HASSStudioPowerFlow;',ctx);
const B=ctx.building,P=ctx.powerFlow,m=(state,unit='')=>({state:String(state),attributes:{unit_of_measurement:unit}});
const h={states:{'sensor.house':m(10500,'W'),'sensor.daily':m(25.3,'kWh'),'sensor.pipe':m(-5000,'W')}};
const house={id:'house',type:'building',variant:'house',building:{power_entity:'sensor.house',daily_entity:'sensor.daily',measurement:'aggregate'}};
assert.equal(B.data(house,h).power,10.5);
assert.equal(B.data(house,h).daily,25.3);
assert.equal(B.data(house,h).measurement,'aggregate');
assert.equal(B.data(house,{states:{}}).power,null);
assert.match(B.render(house,h),/10\.5 kW/);
assert.match(B.render(house,{states:{}}),/>—<\/text>/);
assert.match(B.render({...house,variant:'garage'},h),/outbuilding-garage/);
assert.match(B.render({...house,variant:'workshop'},h),/outbuilding-workshop/);
assert.equal(B.data({building:{mode:'manual',power_kw:3.1}},null).power,3.1);
assert.equal(P.visual({flow_power_mode:'off'},h),null);
const pipe={flow_power_mode:'ha',flow_power_entity:'sensor.pipe',flow_max_kw:10,flow_min_width:1.5,flow_max_width:6,flow_pattern:'dots',flow_direction:'forward'};
const five=P.visual(pipe,h);
assert.equal(five.kw,-5);assert.equal(five.active,true);
assert.equal(five.direction,'reverse');assert.equal(five.width,3.75);
assert.equal(P.visual({...pipe,flow_power_direction:false},h).direction,'forward');
assert.equal(P.visual({...pipe,flow_power_mode:'manual',flow_power_kw:10},h).width,6);
assert.equal(P.visual({...pipe,flow_power_mode:'manual',flow_power_kw:0},h).active,false);
assert.equal(P.visual(pipe,{states:{}}).known,false);
assert.equal(P.visual({...pipe,flow_pattern:'arrows'},h).pattern,'arrows');
console.log('OK: building variants, HA load, missing sensors and power-scaled flow.');
