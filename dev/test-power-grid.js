'use strict';
/* Run: node dev/test-power-grid.js
 * Tests read-only renderer logic without HA, browser, or network.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const power=require('../src/power-grid.js');
const ctx={};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'src/device-registry.js'),'utf8')+
 '\nthis.registry=HASSStudioDeviceRegistry;',ctx);
assert.equal(ctx.registry.isNodeType('power_grid'),true);
assert.deepEqual(Array.from(ctx.registry.variantOptions('power_grid').map(x=>x[0])),['classic','modern']);
for(const name of ['classic','modern-light','modern-dark']){
 const xml=fs.readFileSync(path.join(root,'src/icons','power-grid-'+name+'.svg'),'utf8');
 assert.match(xml,/<svg\b/);assert.match(xml,/<\/svg>/);
}
const manual=power.defaults();manual.mode='manual';
let result=power.resolve({variant:'classic',power_grid:manual},{states:{}});
assert.equal(result.phase.l1.v,231.8);
manual.manual.l2_v=255;
result=power.resolve({variant:'modern',power_grid:manual},{states:{}});
assert.equal(result.phase.l2.voltageAlert,true);
const live={...manual,mode:'live',entities:{l1_v:'sensor.grid_l1'}};
result=power.resolve({variant:'modern',power_grid:live},{states:{
 'sensor.grid_l1':{state:'255',attributes:{unit_of_measurement:'V'}}
}});
assert.equal(result.phase.l1.v,255);
assert.equal(result.phase.l1.voltageAlert,true);
assert.equal(result.phase.l2.v,null);
assert.equal(power.normalize({variant:'classic',power_grid:{variant:'modern'}}).variant,'classic');
for(const position of ['right','left','bottom']){
 const geom=power.geometry({variant:'modern',power_grid:{panel_position:position}});
 assert.ok(geom.width>0&&geom.height>0);
}
const context={HASSStudioSvg:{namespaceIds:(x,p)=>x.replace(/id="([^"]+)"/g,(_,id)=>'id="'+p+id+'"')},
 HASSStudioIconTemplates:{powerGridClassic:'<circle id="test"/>',powerGridModernLight:'<rect id="light"/>',
 powerGridModernDark:'<rect id="dark"/>'}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'src/power-grid.js'),'utf8')+
 '\nthis.renderer=HASSStudioPowerGrid;',context);
const svg=context.renderer.render({id:'test1',variant:'modern',power_grid:{mode:'manual',theme:'dark',manual:{l2_v:255}}},{themes:{darkMode:false}});
assert.match(svg,/ssgridtest1-dark/);
assert.match(svg,/255.0 V/);
assert.match(svg,/#ff6c69/);
console.log('Power Grid tests: PASS');
