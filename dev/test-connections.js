/* Typed connections v2: no legacy migration, distinct controls and artwork.
 * Uses the production normalization, SVG renderer and inspector in a read-only VM.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={isEnt:x=>typeof x==='string'&&/^[a-z_]+\\.[a-z0-9_]+$/.test(x),
  document:{createElement:()=>({hidden:true,appendChild(){},replaceChildren(){}})}};
vm.createContext(ctx);
for(const name of ['ha-state.js','power-flow.js','device-registry.js','studio-viewport.js',
  'studio-layout.js','animation-state.js','studio-canvas.js','studio-inspector.js']){
  const code=fs.readFileSync('src/'+name,'utf8');
  vm.runInContext(code,ctx,{filename:name});
}
vm.runInContext(`this.registry=HASSStudioDeviceRegistry;
 this.layout=HASSStudioLayout;this.viewport=HASSStudioViewport;
 this.animation=HASSStudioAnimation;this.canvas=HASSStudioCanvas;
 this.inspector=HASSStudioEditorInspector;`,ctx);
const registry=ctx.registry;
const lib=registry.libraryEntries('pl').filter(item=>item.type==='connection');
assert.equal(lib.length,2);
assert.equal(lib[0].variant,'hydraulic');
assert.equal(lib[1].variant,'electric');
assert.equal(lib[0].subgroup,'hydraulic_connections');
assert.equal(lib[1].subgroup,'electric_connections');
assert.equal(registry.isNodeType('connection'),false);
const library=vm.runInContext(fs.readFileSync('src/studio-library.js','utf8')+';HASSStudioEditorLibrary;',ctx);
const libraryMarkup=library.render({registry,language:'pl',esc:String});
assert(libraryMarkup.includes('data-add="connection" data-variant="hydraulic"'));
assert(libraryMarkup.includes('data-add="connection" data-variant="electric"'));
assert(libraryMarkup.includes('Rury hydrauliczne')&&libraryMarkup.includes('Przewody elektryczne'));

const points=[{x:30,y:60},{x:150,y:60},{x:150,y:100}];
const hydraulic={id:'hydro',type:'hydraulic',label:'Zasilanie',points,
 style:{color:'hot',width:7,cap_start:true,cap_end:true},
 animation:{flow_mode:'on',flow_direction:'reverse',flow_speed:1},
 accessories:[{id:'pump',type:'pump',entity:'binary_sensor.active',label:'Pompa',position:50}]};
const electric={id:'electric',type:'electric',label:'Zasilanie EV',points,
 style:{color:'electric',width:5},
 animation:{flow_power_mode:'manual',flow_power_kw:-5,flow_max_kw:10,flow_pattern:'dots',flow_power_direction:true,
  flow_direction:'forward',flow_speed:1},
 accessories:[{id:'legacy-extra',type:'pump',position:50}]};
const cfg={studio_layout:{width:1200,height:700,nodes:[],connections:[hydraulic,electric]}};
const normalized=ctx.layout.normalized(cfg);
assert.equal(normalized.connections.length,2);
assert.equal(normalized.connections[0].type,'hydraulic');
assert.equal(normalized.connections[0].accessories.length,1);
assert.equal(normalized.connections[0].animation.flow_direction,'reverse');
assert.equal(normalized.connections[0].animation.flow_power_mode,'off');
assert.equal(normalized.connections[1].type,'electric');
assert.equal(normalized.connections[1].accessories.length,0);
assert.equal(normalized.connections[1].animation.flow_power_kw,-5);
assert.equal(normalized.connections[1].style.cap_start,false);
const again=ctx.layout.normalized({studio_layout:{...cfg.studio_layout,connections:normalized.connections}});
assert.equal(JSON.stringify(again.connections),JSON.stringify(normalized.connections),'save/load must be stable');
const old=ctx.layout.normalized({studio_layout:{nodes:[],pipes:[hydraulic]}});
assert.equal(old.connections.length,0,'legacy pipes must not be silently interpreted as new connections');
const rogue=ctx.layout.normalized({studio_layout:{nodes:[],connections:[{...hydraulic,type:'invalid'}]}});
assert.equal(rogue.connections.length,0,'unsupported future types cannot silently render as hydraulic');

vm.runInContext(`
 const empty={styles:'',on:()=>false};
 this.HASSStudioGraphics={...empty};
 this.HASSStudioTank=empty;
 this.HASSStudioSolidFuel=empty;this.HASSStudioPellet=empty;this.HASSStudioHeatPump=empty;
 this.HASSStudioGasBoiler=empty;this.HASSStudioFireplace=empty;
`,ctx);
const clamp=(n,lo,hi,fallback)=>Number.isFinite(Number(n))?Math.max(lo,Math.min(hi,Number(n))):fallback;
const canvas=ctx.canvas.create({W:1200,H:700,colors:{hot:'#ed835a',cold:'#57a6db',solar:'#e5b35e',return:'#778cbe'},
 normalized:ctx.layout.normalized,pickLang:()=> 'pl',words:{pl:{pump:'Pompa'}},clamp,validEntity:()=>true,esc:String});
const svg=canvas.canvasSvg(cfg,{states:{}},true,{type:'connection',id:'electric'});
assert(svg.includes('ss-connection-hydraulic')&&svg.includes('ss-connection-electric'));
assert(svg.includes('data-connection="hydro"'), 'hydraulic accessory should be rendered');
assert(!svg.includes('data-connection="electric"'), 'electric accessories must be hidden');
assert(svg.includes('ss-flow-power'), 'electric power animation must be distinguishable');
assert.equal((svg.match(/class="ss-cap"/g)||[]).length,2,'only hydraulic connections receive pipe end caps');
assert(svg.includes('stroke="#e3bc63"'),'cable must have a distinct electrical color');
assert.equal((svg.match(/class="ss-handle"/g)||[]).length,3);
const moved=canvas.translateConnectionPoints(points,23,-12);
assert.equal(JSON.stringify(moved),JSON.stringify([{x:55,y:50},{x:175,y:50},{x:175,y:90}]));
assert.equal(points[0].x,30,'drag must not mutate original points');

const mockInspector=obj=>{
 const props={innerHTML:'',scrollTop:0,querySelectorAll:()=>[],appendChild(){}};
 const L=new Proxy({properties:'Właściwości',pipeWidth:'Grubość',pipeColor:'Rodzaj rury',accessories:'Akcesoria',
  yes:'Tak',no:'Nie',flowDirection:'Kierunek',flowSpeed:'Prędkość',newBend:'Dodaj punkt',removeBend:'Usuń punkt'},
  {get:(target,key)=>target[key]||String(key)});
 const render=ctx.inspector.create({editor:{_config:{},_hass:{states:{}}},L,properties:props,esc:String,
  opts:(rows,selected)=>rows.map(([v,name])=>'<option value="'+v+'"'+(v===selected?' selected':'')+'>'+name+'</option>').join(''),
  registry,pickLang:()=> 'pl',get:()=>normalized,selectedObject:()=>obj,getSelection:()=>({type:'connection',id:obj.id}),
  getSelectedPartId:()=>null,getExpandedPartId:()=>null,variantShape:()=>''});
 render();return props.innerHTML;
};
const hi=mockInspector(normalized.connections[0]),ei=mockInspector(normalized.connections[1]);
assert(hi.includes('data-field="style_color"'));
assert(hi.includes('data-field="anim_flow_entity"'));
assert(hi.includes('data-add-accessory="pump"'));
assert(!hi.includes('data-field="anim_flow_power_kw"'));
assert(ei.includes('data-field="anim_flow_power_kw"'));
assert(!ei.includes('data-field="style_color"'));
assert(!ei.includes('data-add-accessory="pump"'));
assert(!ei.includes('data-field="anim_flow_entity"'));
assert(!hi.includes('data-field="connection_type"')&&!ei.includes('data-field="connection_type"'),
  'connection type is selected from library, not switched in inspector');
const studio=fs.readFileSync('src/studio-custom.js','utf8');
assert(studio.includes("if(kind==='connection')"));
assert(studio.includes("selection.type==='connection'&&key.startsWith('style_')"));
assert(studio.includes("selection.type==='connection'&&key.startsWith('anim_')"));
assert(studio.includes("obj.type!=='hydraulic'||obj.accessories.length>=20"));
console.log('OK: connections[] v2, library categories, separate inspector, SVG, animation, HA safety and no migration.');
