/* Stage 07A.1-C.1: actual inspector UI and legacy TEST persistence. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={document:{createElement:()=>({hidden:true,className:''})}};
vm.createContext(ctx);
for(const file of ['ha-state.js','readout-scale.js','building.js','studio-inspector.js'])
 vm.runInContext(fs.readFileSync('src/'+file,'utf8'),ctx,{filename:file});
vm.runInContext('this.B=HASSStudioBuilding;this.inspector=HASSStudioEditorInspector;',ctx);
for(const name of ['Graphics','Tank','SolidFuel','Pellet','HeatPump','GasBoiler','Fireplace'])
 ctx['HASSStudio'+name]={styles:'',defs:()=>''};
ctx.HASSStudioEnergyTopology={electricalType:n=>n.type==='building',ports:()=>[]};
const escape=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const opts=(items,selected)=>items.map(([v,t])=>'<option value="'+escape(v)+'"'+(String(v)===selected?' selected':'')+'>'+escape(t)+'</option>').join('');
const registry={resolve:()=>({device:{pl:'Budynek'}}),variantOptionsForNode:()=>[['house','Dom']],categoryIcons:{}};
const base={id:'home',type:'building',variant:'house',visual:'studio',label:'Budynek',x:40,y:50,scale:1,entities:[],parts:[],energy_ports:[]};
function render(building,mode='test'){
 const node={...base,energy_mode:mode,building};
 const props={scrollTop:0,innerHTML:'',querySelectorAll:()=>[],appendChild:()=>{}};
 const renderProps=ctx.inspector.create({
  editor:{_hass:{states:{}},_config:{}},
  L:{properties:'Właściwości',choose:'Wybierz',name:'Nazwa',graphic:'Grafika',
    visual:'Styl',scale:'Skala',entities:'Encje',label:'Etykieta',addEntity:'Dodaj'},
  properties:props,esc:escape,opts,registry,pickLang:()=>'pl',
  get:()=>({nodes:[node],connections:[]}),selectedObject:()=>node,
  getSelection:()=>({type:'node',id:'home'}),getSelectedPartId:()=>null,
  getExpandedPartId:()=>null,variantShape:()=>''
 });
 assert.doesNotThrow(()=>renderProps());
 return props.innerHTML;
}
const fresh={...ctx.B.defaults(),measurement:'aggregate',power_kw:50,power_entity:'sensor.home'};
let html=render(fresh);
assert(html.includes('Pobór budynku (kW)')&&html.includes('Encja mocy (W/kW)'));
assert.match(html,/data-field="building_power_entity"/);
assert.match(html,/data-field="building_power_kw"[^>]*value="50"/);
for(const oldField of ['building_measurement','building_remaining_enabled','building_remaining_kw','Typ pomiaru','Pozostały pobór','Łączny pobór','portu child'])
 assert(!html.includes(oldField),'Old UI leaked: '+oldField);
assert(!render(fresh,'ha').includes('data-field="building_power_kw"'));
const gross=ctx.B.powerSnapshot({measurement:'aggregate',measured_kw:50,children_consumption_kw:7.2,children_generation_kw:0});
assert.equal(gross.own_consumption_kw,42.8);
assert.equal(gross.gross_consumption_kw,50);
const invalid=ctx.B.powerSnapshot({measurement:'aggregate',measured_kw:3,children_consumption_kw:7.2,children_generation_kw:0});
assert.equal(invalid.status,'invalid');
const old={...base,energy_mode:'test',building:{measurement:'individual',remaining_enabled:true,power_kw:99,remaining_kw:2.5}};
const before=JSON.stringify(old);
html=render(old.building);
assert(html.includes('Starsza konfiguracja'));
assert(html.includes('data-convert-building-meter'));
assert(!render(fresh).includes('data-convert-building-meter'));
assert.match(html,/data-field="building_power_kw"[^>]*value="2.5"/);
assert.equal(ctx.B.data(old,{states:{}}).power,2.5);
assert.equal(JSON.stringify(old),before);
ctx.B.setManualPower(old,'3.75');
assert.equal(old.building.remaining_kw,3.75);
assert.equal(old.building.power_kw,99);
assert.equal(old.building.measurement,'individual');
assert.equal(ctx.B.data(old,{states:{}}).power,3.75);
const own=ctx.B.powerSnapshot({measurement:'individual',measured_kw:3.75,children_consumption_kw:7.2,children_generation_kw:0});
assert.equal(own.gross_consumption_kw,10.95);
const oldPlain={building:{measurement:'individual',power_kw:4}};
ctx.B.setManualPower(oldPlain,'5');
assert.equal(oldPlain.building.power_kw,5);
const oldNet={building:{measurement:'net',power_kw:-2}};
assert(render(oldNet.building).includes('Wartość ujemna oznacza eksport'));
assert(!render(oldNet.building).includes('data-convert-building-meter'));
ctx.B.setManualPower(oldNet,'-3');
assert.equal(oldNet.building.power_kw,-3);
assert.equal(oldNet.building.measurement,'net');
const net=ctx.B.powerSnapshot({measurement:'net',measured_kw:-3,children_consumption_kw:0,children_generation_kw:5});
assert.equal(net.gross_consumption_kw,2);
assert.equal(ctx.B.powerSnapshot({measurement:'aggregate',measured_kw:null,children_consumption_kw:0,children_generation_kw:0}).status,'partial');
assert.equal(ctx.B.powerSnapshot({measurement:'aggregate',measured_kw:0,children_consumption_kw:0,children_generation_kw:0}).status,'complete');
console.log('PASS stage C.1 building inspector, legacy meter semantics and TEST source.');
