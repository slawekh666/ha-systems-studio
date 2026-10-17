/* Regression: Energy storage SOC, BMS, HA readings, charge indicator, SVG binding. */
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const ctx={};vm.createContext(ctx);
for(const f of ['src/ha-state.js','src/readout-scale.js','src/svg-template.js','src/energy-storage.js'])
  vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const tpl=fs.readFileSync('src/icons/energy-storage.svg','utf8')
  .replace(/^\s*<svg\b[^>]*>/,'').replace(/<\/svg>\s*$/,'');
ctx.tpl=tpl;vm.runInContext('this.HASSStudioIconTemplates={energyStorage:this.tpl};this.battery=HASSStudioEnergyStorage;',ctx);
const battery=ctx.battery;
const make=(state,unit='')=>({state:String(state),attributes:{unit_of_measurement:unit}});
const states=x=>({states:x});
const node=(values={},entities={})=>({id:'battery-test',type:'energy_storage',energy_storage:{...values,entities}});
assert.equal(battery.normalize(node()).min_soc,20);
assert.equal(battery.normalize(node()).warning_margin,5);
assert.equal(battery.normalize(node()).display_scale,1);
assert.equal(battery.data(node(),states({})).soc,null);
assert.equal(battery.data(node(),states({})).level,0);
for(const [soc,count] of [[0,0],[1,1],[24,1],[25,1],[26,2],[50,2],[51,3],[75,3],[76,4],[100,4]]){
 const d=battery.data(node({mode:'manual',manual:{soc,power:0}}),null);
 assert.equal(d.level,count,'SOC '+soc);
}
const warn=battery.data(node({mode:'manual',manual:{soc:24,power:-1}}),null);
assert.equal(warn.state,'warning');
const low=battery.data(node({mode:'manual',manual:{soc:20,power:-1}}),null);
assert.equal(low.state,'alarm');
assert.equal(battery.data(node({mode:'manual',manual:{soc:15,power:0},min_soc:10,warning_margin:5}),null).state,'warning');
assert.equal(battery.data(node({mode:'manual',manual:{soc:18,power:0},min_soc:10,warning_margin:5,custom_alarm:true,alarm_soc:19}),null).state,'alarm');
const withHass=node({}, {soc:'sensor.soc',power:'sensor.power',temperature:'sensor.temperature',cell_min:'sensor.cell_min',bms_alarm:'binary_sensor.alarm'});
const live=states({'sensor.soc':make(80,'%'),'sensor.power':make(-2500,'W'),'sensor.temperature':make(54,'°C'),'sensor.cell_min':make(2.9,'V'),'binary_sensor.alarm':make('off')});
assert.equal(battery.data(withHass,live).soc,80);
assert.equal(battery.data(withHass,live).power,-2.5);
assert.equal(battery.data(withHass,live).state,'normal');
assert.equal(battery.data(node({temp_high_enabled:true,temp_high:50},{...withHass.energy_storage.entities}),live).state,'alarm');
assert.equal(battery.data(node({cell_low_enabled:true,cell_low:3},{...withHass.energy_storage.entities}),live).state,'alarm');
const disconnected=states({'sensor.soc':make('unavailable','%')});
assert.equal(battery.data(withHass,disconnected).state,'alarm');
assert.equal(battery.data(node({offline_alarm:false},{soc:'sensor.soc'}),disconnected).state,'unknown');
assert.equal(battery.data(node({}, {soc:'sensor.soc',bms_alarm:'binary_sensor.alarm'}),states({'sensor.soc':make(95,'%'),'binary_sensor.alarm':make('on')})).state,'alarm');
const m=battery.render(node({mode:'manual',manual:{soc:76,power:1.2},display_scale:.7}),null);
assert.match(m,/SOC 76%/);assert.match(m,/\+1\.2 kW/);
assert.match(m,/scale\(0\.7\)/);assert.match(m,/battery-charging/);
for(let n=1;n<=4;n++)assert.match(m,new RegExp('ssbatterybattery-test-battery-segment-'+n+'" opacity="1"'));
const warnSvg=battery.render(node({mode:'manual',manual:{soc:24,power:0}}),null);
assert.match(warnSvg,/battery-level-fill-1"[^>]+fill="#e84747"/);
assert.match(warnSvg,/battery-warning" visibility="hidden"/);
const alarmSvg=battery.render(node({mode:'manual',manual:{soc:19,power:0}}),null);
assert.match(alarmSvg,/battery-warning" visibility="visible"/);
const noData=battery.render(withHass,states({}));
assert.match(noData,/SOC —/);assert.match(noData,/battery-segment-1" opacity=".16"/);
console.log('Energy storage: SOC thresholds, BMS alarms, 4 segments, signed power and HA unknown values PASS');
