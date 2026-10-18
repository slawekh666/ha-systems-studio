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
assert.match(diagSvg,/Parametry falownika/);
assert(!diagSvg.includes('inv-row'), 'PV inputs are not duplicated in extra panel');
assert.match(diagSvg,/viewBox="-/);
assert.equal(api.normalize(diagnostic).count,6);
const rows=[
 {key:'ac_power',label:'AC',unit:'W',decimals:0},
 {key:'temperature',label:'Temperatura',decimals:1},
 {key:'status',label:'Stan'},
 {key:'custom',label:'Produkcja dzisiaj',entity:'sensor.daily',unit:'kWh',decimals:2},
 {key:'custom',label:'Dodatkowa informacja',entity:'sensor.message'}
];
const configured=node({show_extra:true,panel_title:'Bilans & pomiary',panel_rows:rows,
 entities:{ac_power:'sensor.ac',temperature:'sensor.temp',status:'sensor.state'}});
const readings=api.panelData(configured,{states:{...h.states,
 'sensor.temp':value(42.5,'°C'),'sensor.state':value('Producing'),
 'sensor.daily':value(1200,'Wh'),'sensor.message':value('Online')}});
assert.equal(readings.length,5);
assert.equal(readings[0].reading.text,'6500 W');
assert.equal(readings[1].reading.text,'42.5 °C');
assert.equal(readings[2].reading.text,'Producing');
assert.equal(readings[3].reading.text,'1.20 kWh');
assert.equal(readings[4].reading.text,'Online');
const html=api.render(configured,{states:{...h.states,
 'sensor.temp':value(42.5,'°C'),'sensor.state':value('Producing'),
 'sensor.daily':value(1200,'Wh'),'sensor.message':value('Online')}});
assert.match(html,/Bilans &amp; pomiary/);
assert.match(html,/1.20 kWh/);
assert.match(html,/Producing/);
assert(!html.includes('NaN'));
const missing=api.panelData(configured,{states:{}});
assert.equal(missing[3].reading.text,'—');
assert.equal(api.normalize(node({panel_rows:[]})).panel_rows.length,0);
assert.equal(api.normalize(node({count:4})).panel_rows.length,0); // PV readouts do not create duplicate extra fields.
assert.equal(api.normalize(node({count:2,panel_rows:[{key:'custom',entity:'bad-entity'}]})).panel_rows[0].entity,'');
const many=api.normalize(node({show_extra:true,panel_rows:Array.from({length:80},(_,i)=>({key:'custom',label:'Meter '+i}))}));
assert.equal(many.panel_rows.length,40);
assert(api.geometry({inverter:many}).height>api.geometry(diagnostic).height);
assert.equal(api.normalize(node({count:2,panel_rows:[{key:'pv_summary',input:0},{key:'custom',label:'Extra',entity:'sensor.extra'}]})).panel_rows.length,1);
const testManual=api.panelData(node({mode:'manual',panel_rows:[{key:'custom',label:'Manual',manual_value:'75',unit:'%',decimals:0}]}),{states:{}});
assert.equal(testManual[0].reading.text,'75 %');
const original=JSON.stringify(api.normalize(configured));
assert.equal(JSON.stringify(api.normalize({inverter:JSON.parse(original)})),original);
assert(fs.readFileSync('src/studio-inspector.js','utf8').includes('data-inv-row-add'));
assert(fs.readFileSync('src/studio-custom.js','utf8').includes("data-inv-row-delete"));

console.log('OK: inverter AC status, PV string values, unknown HA sensors and optional diagnostics.');
