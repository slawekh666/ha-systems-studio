/* Regression checks for proportional readout scale and hydraulic icon renderers. */
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const source=f=>fs.readFileSync(f,'utf8');
const ctx={};vm.createContext(ctx);
for(const file of ['src/readout-scale.js','src/ha-state.js','src/svg-template.js','src/manifold.js','src/radiator.js'])
 vm.runInContext(source(file),ctx);
vm.runInContext('this.scale=HASSStudioReadoutScale;this.radiator=HASSStudioRadiator;this.manifold=HASSStudioManifold;',ctx);
const box=ctx.scale.box(10,20,100,50,.5,10,20);
assert.equal(box.width,50);assert.equal(box.height,25);
assert.equal(ctx.scale.factor(100),1.5);
assert.match(ctx.scale.namedGroup('<g id="p-tempGroup"><text>55</text></g>','tempGroup',10,20,.6),/transform="translate\(10 20\) scale\(0.6\)/);
assert.equal(ctx.scale.factor(.1),.4);
assert.equal(ctx.scale.around(80,90,.6),'translate(80 90) scale(0.6) translate(-80 -90)');
const radiator=ctx.radiator;
const radConfig=radiator.normalize({radiator:{display_scale:.55}});
assert.equal(radConfig.display_scale,.55);
assert.equal(radiator.data({radiator:{mode:'live'}},{states:{}}).temp,null);
assert.equal(radiator.data({radiator:{mode:'manual',manual_temperature:63,manual_open:20}},{states:{}}).temp,63);
const tpl=source('src/icons/radiator.svg');
vm.runInContext('this.HASSStudioIconTemplates={radiator:globalThis.__radTemplate};',Object.assign(ctx,{__radTemplate:tpl.replace(/^\s*<svg\b[^>]*>/,'').replace(/<\/svg>\s*$/,'')}));
const radMarkup=radiator.render({id:'rad1',radiator:{display_scale:.65,mode:'manual',manual_temperature:63,manual_open:20}},null);
assert.match(radMarkup,/scale\(0.65\)/);assert.match(radMarkup,/63°/);assert.match(radMarkup,/20%/);
assert.doesNotMatch(radMarkup,/valveRing/);
assert.match(radMarkup,/font-size="48"/);
assert.match(radMarkup,/OPEN/);
assert.equal(radiator.valveStatus(4.99).label,'CLOSE');
assert.equal(radiator.valveStatus(5).label,'OPEN');
assert.equal(radiator.valveStatus(null).label,'—');
const closed=radiator.render({id:'rad3',radiator:{mode:'manual',manual_temperature:31,manual_open:4}},null);
assert.match(closed,/CLOSE/);assert.match(closed,/#ff5d59/);
assert.match(closed,/id="ssradiatorrad3-bar1"[^>]*opacity=".16"/);
const full=radiator.render({id:'rad4',radiator:{mode:'manual',manual_open:100}},null);
assert.match(full,/id="ssradiatorrad4-bar4"[^>]*opacity="1"/);
assert(!radMarkup.includes('x="1040"'));
assert.match(radiator.render({id:'rad2',radiator:{mode:'live'}},{states:{}}),/—/);
const manifold=ctx.manifold;
for(const count of [1,5,20,40]){
 const c=manifold.normalize({count,mode:'manual',display_scale:.6});
 assert.equal(c.circuits.length,count);
 const xml=manifold.renderStandalone(c);
 assert(xml.includes('viewBox="0 0 '));
 assert(xml.includes('scale(0.6)'));
 assert(xml.includes('mf-outlets'));
 assert(xml.includes('V119'));
 assert.equal(manifold.geometry(c).height,215);
}
assert.equal(manifold.resolve({manifold:{count:1,mode:'live'}},{states:{}}).circuits[0].tempOut,null);
console.log('OK: scalable data panels, radiator HA/manual separation, manifold 1/5/20/40 loops.');
