/* Regression checks for compact inverter display, HA values and MPPT inputs. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={};vm.createContext(context);
for(const file of ['src/ha-state.js','src/readout-scale.js','src/svg-template.js','src/inverter.js'])
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const svg=fs.readFileSync('src/icons/inverter.svg','utf8');
context.svg=svg.replace(/^\s*<svg\b[^>]*>/,'').replace(/<\/svg>\s*$/,'');
vm.runInContext('this.HASSStudioIconTemplates={inverter:this.svg};this.api=HASSStudioInverter;',context);
const api=context.api;
const value=(n,u='')=>({state:String(n),attributes:{unit_of_measurement:u}});
const node=(options={})=>({type:'inverter',id:'pv1',inverter:options});
assert.equal(api.normalize(node({count:15})).count,12);
assert.equal(api.normalize(node({count:0})).count,1);
assert.equal(api.data(node(),{states:{}}).state,'unknown');
const known=node({entities:{ac_power:'sensor.ac'},count:3,inputs:[
 {name:'A',entities:{voltage:'sensor.v1',current:'sensor.a1'}},
 {name:'B',entities:{power:'sensor.p2'}},
 {name:'C',entities:{voltage:'sensor.v3'}}
]});
const h={states:{'sensor.ac':value(6500,'W'),'sensor.v1':value(400,'V'),'sensor.a1':value(8,'A'),'sensor.p2':value(3.5,'kW'),'sensor.v3':value(350,'V')}};
const d=api.data(known,h);
assert.equal(d.power,6.5);assert.equal(d.state,'generating');
assert.equal(d.inputs[0].watts,3200);
assert.equal(d.inputs[0].calculated,true);
assert.equal(d.inputs[1].watts,3500);
assert.equal(d.inputs[1].calculated,false);
assert.equal(d.inputs[2].watts,null);
const render=api.render(known,h);
assert.match(render,/6\.50kW/);
assert.match(render,/3200W/);
assert.match(render,/3500W/);
assert.match(render,/fill="#4cd6ff"/);
assert(!render.includes('NaN'));
const stopped=api.render(known,{states:{...h.states,'sensor.ac':value(0,'W')}});
assert.match(stopped,/id="ssinvpv1-inv-led"[^>]+fill="#ff9b32"/);
const absent=api.render(known,{states:{...h.states,'sensor.ac':value('unavailable','W')}});
assert.match(absent,/id="ssinvpv1-inv-led"[^>]+fill="#7e929f"/);
assert.match(absent,/id="ssinvpv1-inv-power"[^>]*>—<\/text>/);
const threshold=api.data(node({entities:{ac_power:'sensor.ac'},production_threshold_w:15}),{states:{'sensor.ac':value(10,'W')}});
assert.equal(threshold.state,'standby');
const diagnostic=node({count:6,show_extra:true,extra_position:'left',extra_scale:.8,mode:'manual'});
const diagSvg=api.render(diagnostic,{states:{}});
assert.match(diagSvg,/WEJŚCIA PV \/ MPPT/);
assert.match(diagSvg,/PV6/);
assert.match(diagSvg,/viewBox="-/);
assert.equal(api.normalize(diagnostic).count,6);
console.log('OK: inverter AC status, PV string values, unknown HA sensors and optional diagnostics.');
