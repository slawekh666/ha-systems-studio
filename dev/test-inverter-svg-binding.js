/* Stage 07: real SVG parameter binding through HA/TEST and energy balance. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={};vm.createContext(ctx);
for(const name of ['ha-state.js','readout-scale.js','svg-template.js','device-parameters.js',
 'inverter-readings.js','inverter.js','building.js','ev-charger.js','energy-storage.js',
 'power-grid.js','distribution-board.js','radiator.js','manifold.js','energy-topology.js',
 'energy-balance.js']){
 vm.runInContext(fs.readFileSync('src/'+name,'utf8'),ctx,{filename:name});
}
const svg=fs.readFileSync('src/icons/inverter.svg','utf8');
ctx.template=svg.replace(/^\s*<svg\b[^>]*>/,'').replace(/<\/svg>\s*$/,'');
vm.runInContext('this.svg=HASSStudioSvg;this.defs=HASSStudioDeviceParameters.inverter.core;'+
 'this.inv=HASSStudioInverter;this.balance=HASSStudioEnergyBalance;'+
 'this.HASSStudioIconTemplates={inverter:template};',ctx);
const {defs,inv,balance}=ctx;
const reading=(state,unit)=>({state:String(state),attributes:{unit_of_measurement:unit}});
const node=(mode='ha',fallback=false)=>({
 id:'pv',type:'inverter',variant:'modern',energy_mode:mode,
 energy_fallback_enabled:fallback,energy_ports:[{id:'ac',label:'AC',medium:'ac',bus:'main',x:100,y:55}],
 inverter:{entities:{ac_power:'sensor.pv'},manual:{ac_power:6.4},
 positive_power:true,count:2}
});
const testCase=(n,states,expected,source,suffix)=>{
 const h={states},data=inv.data(n,h),reading=balance.deviceReading(n,h,{mode:'device'});
 assert.equal(data.power,expected);
 assert.equal(reading.kw,expected);
 assert.equal(reading.source,source);
 const render=inv.render(n,h);
 const expectedText=expected===null?'—':Math.abs(expected)>=10?expected.toFixed(1)+'kW':expected.toFixed(2)+'kW';
 const id='ssinvpv-inv-power';
 assert(render.includes('id="'+id+'"'),suffix+' missing SVG ID');
 assert(render.includes('id="'+id+'"'),suffix+' missing screen element');
 const match=render.match(new RegExp('<text\\b[^>]*id="'+id+'"[^>]*>([^<]*)<\\/text>'));
 assert(match,suffix+' missing SVG text');
 assert.equal(match[1],expectedText,suffix+' incorrect power on screen');
 assert(!render.includes('NaN'),suffix+' contains NaN');
 return render;
};
const zero=testCase(node('auto',true),{'sensor.pv':reading(0,'W')},0,'measured','zero');
const missing=testCase(node('ha'),{'sensor.pv':reading('unavailable','W')},null,'missing','missing');
testCase(node('auto',true),{'sensor.pv':reading('unavailable','W')},6.4,'simulated','fallback');
testCase(node('test'),{'sensor.pv':reading(0,'W')},6.4,'simulated','forced test');
testCase(node('ha'),{'sensor.pv':reading(-1200,'W')},-1.2,'measured','negative');
testCase(node('ha'),{'sensor.pv':reading(12.345,'kW')},12.345,'measured','large');
testCase(node('ha'),{'sensor.pv':reading(10,'kWh')},null,'missing','wrong units');
assert(zero.includes('ssinvpv-inv-led'));
assert(missing.includes('ssinvpv-inv-power'));
const bindings=ctx.svg.parameterBindings({ac_power:defs.ac_power},{ac_power:'<bad&>'});
assert.equal(bindings['inv-power'].text,'<bad&>');
assert.equal(ctx.svg.apply('<text id="inv-power">old</text>',bindings),
 '<text id="inv-power">&lt;bad&amp;&gt;</text>');
assert.throws(()=>ctx.svg.apply('<text id="wrong">old</text>',bindings),/SVG element not found/);
assert.throws(()=>ctx.svg.parameterBindings({ac_power:defs.ac_power},{foo:1}),/Missing parameter value/);
assert.throws(()=>ctx.svg.parameterBindings({
 a:{svg:{id:'same',attribute:'text'}},b:{svg:{id:'same',attribute:'text'}}},
 {a:1,b:2}),/Duplicate parameter SVG target/);
assert.throws(()=>ctx.svg.parameterBindings({a:{svg:{id:'x',attribute:'onload'}}},{a:1}),
 /Invalid parameter SVG target/);
assert(Object.isFrozen(defs.ac_power.svg));
console.log('PASS: Stage 07 SVG binding, runtime HA/TEST, signed zero and energy balance parity.');
