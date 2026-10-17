const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const files=['src/ha-state.js','src/svg-template.js','src/solid-fuel-stove.js','src/heat-pump-stove.js'];
const ctx={};vm.createContext(ctx);
for(const f of ['src/ha-state.js','src/svg-template.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
vm.runInContext('this.HASSStudioIconTemplates={heatPump:requireHeatPump};',Object.assign(ctx,{requireHeatPump:fs.readFileSync('src/icons/heat-pump-stove.svg','utf8').replace(/^\s*<svg\b[^>]*>/,'').replace(/<\/svg>\s*$/,'')})); 
vm.runInContext(fs.readFileSync('src/heat-pump-stove.js','utf8')+'\nthis.hp=HASSStudioHeatPump;',ctx);
const node={id:'hp',type:'boiler',variant:'heatpump_modern',hp_test_mode:true,hp_manual_kw:4.5,hp_manual_fan:70,hp_glow:65,width_scale:1,height_scale:1};
assert.match(ctx.hp.render(node,{states:{}}),/4\.50 kW/);
assert.match(ctx.hp.render(node,{states:{}}),/>70%</);
const inspector=fs.readFileSync('src/studio-inspector.js','utf8');
assert(inspector.includes('hp_manual_kw'));assert(inspector.includes('hp_manual_fan'));

const hpLegacy=fs.readFileSync('src/studio-inspector.js','utf8');
assert(hpLegacy.includes("obj.variant==='heatpump'"));
assert(hpLegacy.includes('Encja pracy pompy ciepła'));
assert(hpLegacy.includes("obj.variant!=='heatpump_modern'"));
const liveNode={...node,hp_test_mode:false,hp_power_entity:'sensor.hp_power',hp_fan_entity:'sensor.hp_fan'};
const states={states:{'sensor.hp_power':{state:'2800',attributes:{unit_of_measurement:'W'}},'sensor.hp_fan':{state:'900',attributes:{unit_of_measurement:'rpm'}}}};
assert.match(ctx.hp.render(liveNode,states),/2\.80 kW/);
assert.match(ctx.hp.render(liveNode,states),/>900 RPM/);
assert.match(ctx.hp.render(node,{states:{}}),/ss-hp-test-label/);
assert.doesNotMatch(ctx.hp.render(liveNode,states),/ss-hp-test-label/);
assert.match(ctx.hp.render(liveNode,{states:{}}),/data-power="unknown"/);
assert.match(ctx.hp.render(liveNode,{states:{}}),/data-fan="unknown"/);

console.log('OK: heat pump manual/live/unknown preview and device-specific controls');
