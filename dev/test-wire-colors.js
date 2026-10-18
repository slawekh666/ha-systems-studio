/* Regression: independent electrical wire and animation colors; no hydraulic change. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={isEnt:x=>typeof x==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(x)};
vm.createContext(ctx);
for(const file of ['ha-state.js','readout-scale.js','power-flow.js','device-registry.js','studio-viewport.js','energy-topology.js','energy-balance.js','energy-flow.js','energy-diagnostics.js','studio-layout.js','animation-state.js','studio-canvas.js','studio-inspector.js']){
 vm.runInContext(fs.readFileSync('src/'+file,'utf8'),ctx,{filename:file});
}
vm.runInContext('this.layout=HASSStudioLayout;this.canvas=HASSStudioCanvas;this.pflow=HASSStudioPowerFlow;',ctx);
const {layout,pflow}=ctx;
const conn=(id,type='electric',c='#FACC15',a='#38BDF8',pattern='dots')=>({id,type,
 points:[{x:0,y:0},{x:110,y:0}],style:{color:type==='electric'?c:'hot',width:6},
 animation:{flow_power_mode:'manual',flow_power_kw:3,flow_pattern:pattern,flow_color:a,flow_speed:1}});
const input={studio_layout:{width:1200,height:700,nodes:[],connections:[conn('one'),conn('two','electric','#FF1234','#45DCAB','arrows'),conn('water','hydraulic')]}};
const config=layout.normalized(input);
assert.equal(config.connections[0].style.color,'#FACC15');
assert.equal(config.connections[0].animation.flow_color,'#38BDF8');
assert.equal(config.connections[1].style.color,'#FF1234');
assert.equal(config.connections[1].animation.flow_color,'#45DCAB');
assert.equal(config.connections[2].style.color,'hot');
const again=layout.normalized({studio_layout:config});
assert.equal(JSON.stringify(again.connections),JSON.stringify(config.connections));
const legacy=layout.normalized({studio_layout:{nodes:[],connections:[conn('legacy','electric','electric','invalid')]}});
assert.equal(legacy.connections[0].style.color,'#E3BC63');
assert.equal(legacy.connections[0].animation.flow_color,'#38BDF8');
const invalid=layout.normalized({studio_layout:{nodes:[],connections:[conn('bad','electric','#abc;stroke:red','#fff"/><script>')]}});
assert.equal(invalid.connections[0].style.color,'#E3BC63');
assert.equal(invalid.connections[0].animation.flow_color,'#38BDF8');
const clamp=(x,a,b,d)=>Number.isFinite(Number(x))?Math.max(a,Math.min(b,Number(x))):d;
for(const name of ['Graphics','Tank','SolidFuel','Pellet','HeatPump','GasBoiler','Fireplace'])
 ctx['HASSStudio'+name]={styles:'',on:()=>false};
const canvas=ctx.canvas.create({W:1200,H:700,colors:{hot:'#ed835a',cold:'#57a6db',solar:'#e5b35e',return:'#778cbe'},
 normalized:layout.normalized,pickLang:()=> 'pl',words:{pl:{}},clamp,validEntity:()=>true,esc:String});
const svg=canvas.canvasSvg(input,{states:{}},true,{type:'connection',id:'two'});
assert(svg.includes('stroke="#FACC15"'));
assert(svg.includes('stroke:#38BDF8'));
assert(svg.includes('stroke="#FF1234"'));
assert(svg.includes('stroke="#45DCAB"'));
const props=fs.readFileSync('src/studio-inspector.js','utf8');
const designer=fs.readFileSync('src/studio-custom.js','utf8');
assert(props.includes('data-color-pick'));
assert(props.includes('style_wire_color'));
assert(props.includes('anim_flow_color'));
assert(designer.includes('data-color-pick'));
console.log('OK: independent wire/flow colors, custom HEX, arrows, save/load and legacy palette defaults.');
