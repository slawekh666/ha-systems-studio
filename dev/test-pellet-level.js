const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={};vm.createContext(ctx);
for(const f of ['src/ha-state.js','src/svg-template.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const xml=fs.readFileSync('src/icons/pellet-stove.svg','utf8');
ctx.fragment=xml.replace(/^\s*<svg\b[^>]*>/,'').replace(/<\/svg>\s*$/,'');
vm.runInContext('this.HASSStudioIconTemplates={pellet:this.fragment};this.HASSStudioSolidFuel={resolveState:()=>"off",temperature:()=>null,flame:()=>""};',ctx);
vm.runInContext(fs.readFileSync('src/pellet-stove.js','utf8')+';this.pellet=HASSStudioPellet;',ctx);
const render=(level,alarm=20)=>ctx.pellet.render({id:'p1',variant:'pellet_modern',pellet_level_manual:true,pellet_level_test:level,pellet_alarm_pct:alarm},null);
for(const level of [0,17,18,20,37,38,39,57,58,77,78,97,98,100]){
 const html=render(level);
 for(let n=1;n<=5;n++){
  const m=html.match(new RegExp('id="sspelletp1pellet-level-'+n+'"[^>]*'));
  assert(m,'missing segment '+n);
  const on=level>=[18,38,58,78,98][n-1];
  const color=on?(level<=20?'#ed4d47':level<=40?'#efa647':level<=60?'#e8cf50':'#42db8a'):'#46535d';
  assert(m[0].includes('fill="'+color+'"'),level+' segment '+n);
 }
}
assert.match(render(10),/id="sspelletp1pellet-level-warning"[^>]*visibility="visible"/);
assert.match(render(60),/id="sspelletp1pellet-level-warning"[^>]*visibility="hidden"/);
assert.match(render(40,45),/id="sspelletp1pellet-level-warning"[^>]*visibility="visible"/);
const missing=ctx.pellet.render({id:'p1',pellet_level_entity:'sensor.pellet'}, {states:{}});
assert.match(missing,/id="sspelletp1pellet-level-1"[^>]*fill="#65727c"/);
assert.match(missing,/id="sspelletp1pellet-level-warning"[^>]*visibility="hidden"/);
const fallback=ctx.pellet.render({id:'p1',pellet_level_test:10},null);
assert.match(fallback,/id="sspelletp1pellet-level-warning"[^>]*visibility="hidden"/);
assert.match(fallback,/id="sspelletp1pellet-level-1"[^>]*fill="#4a86a8"/);
const ha=ctx.pellet.render({id:'p1',pellet_level_entity:'sensor.pellet'}, {states:{'sensor.pellet':{state:'87',attributes:{unit_of_measurement:'%'}}}});
assert.match(ha,/id="sspelletp1pellet-level-4"[^>]*fill="#42db8a"/);
const editor=fs.readFileSync('src/studio-custom.js','utf8'),inspector=fs.readFileSync('src/studio-inspector.js','utf8');
for(const k of ['pelletLevelEntity','pelletLevelMode','pelletLevelHA','pelletLevelManual','pelletLevelTest','pelletAlarm'])assert(editor.includes(k));
assert(inspector.includes('L.pelletLevelEntity')&&inspector.includes('L.pelletAlarm'));
console.log('OK pellet gauge: steps, missing data, HA, manual fallback, alarm, bilingual fields');
