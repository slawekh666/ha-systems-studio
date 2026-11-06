/* E.4: actual storage inspector must show read-only graph media, not manual coupling. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={document:{createElement:()=>({hidden:true,className:''})}};
vm.createContext(ctx);
for(const file of ['ha-state.js','readout-scale.js','energy-storage.js',
  'energy-topology.js','studio-inspector.js'])
 vm.runInContext(fs.readFileSync('src/'+file,'utf8'),ctx,{filename:file});
vm.runInContext('this.storage=HASSStudioEnergyStorage;this.inspector=HASSStudioEditorInspector;',ctx);
for(const name of ['Graphics','Tank','SolidFuel','Pellet','HeatPump','GasBoiler','Fireplace'])
 ctx['HASSStudio'+name]={styles:'',defs:()=>''};
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const opts=(items,selected)=>items.map(([v,t])=>
 '<option value="'+esc(v)+'"'+(String(v)===selected?' selected':'')+'>'+esc(t)+'</option>').join('');
const registry={resolve:()=>({device:{pl:'Magazyn energii'}}),
  variantOptionsForNode:()=>[['modern','Nowoczesny']],categoryIcons:{}};
const port=(id,medium='ac',bus=id)=>({id,medium,bus,label:id,x:50,y:50});
const wire=(id,a,ap,b,bp)=>({id,type:'electric',points:[{x:0,y:0},{x:60,y:50}],
 energy_start:{node_id:a,port_id:ap},energy_end:{node_id:b,port_id:bp}});
function inspect(storage,other,connections){
 const layout={nodes:[storage,...other],connections};
 const before=JSON.stringify(layout);
 const properties={scrollTop:0,innerHTML:'',querySelectorAll:()=>[],appendChild:()=>{}};
 const render=ctx.inspector.create({
  editor:{_hass:{states:{}},_config:{}},
  L:{properties:'Właściwości',choose:'Wybierz',name:'Nazwa',graphic:'Grafika',
    visual:'Styl',scale:'Skala',entities:'Encje',label:'Etykieta',addEntity:'Dodaj'},
  properties,esc,opts,registry,pickLang:()=>'pl',
  get:()=>layout,selectedObject:()=>storage,
  getSelection:()=>({type:'node',id:storage.id}),
  getSelectedPartId:()=>null,getExpandedPartId:()=>null,variantShape:()=>null
 });
 assert.doesNotThrow(()=>render());
 assert.equal(JSON.stringify(layout),before,'Inspector is read-only');
 const html=properties.innerHTML;
 for(const obsolete of ['storage_coupling','storage_coupling_port_id','energy_port_medium',
  'data-add-energy-port','data-remove-energy-port'])
   assert(!html.includes(obsolete),'Removed control reappeared: '+obsolete);
 for(const required of ['storage_charge_positive','storage_entity_soc','storage_max_charge_kw',
  'storage_max_discharge_kw','storage_min_soc','storage_entity_bms_alarm'])
   assert(html.includes('data-field="'+required+'"'),'Required feature missing: '+required);
 return html;
}
const dc={id:'bat',type:'energy_storage',variant:'modern',label:'Battery',x:20,y:20,
 scale:1,visual:'studio',energy_mode:'test',energy_ports:[port('ac'),port('dc','dc','battery')],
 energy_storage:{coupling:'dc',coupling_port_id:'dc',manual:{soc:70,power:1.5},
 charge_positive:true,max_charge_kw:5}};
const inverter={id:'inv',type:'inverter',energy_ports:[port('ac'),port('battery','dc','battery')]};
let html=inspect(dc,[inverter],[wire('wire1','inv','battery','bat','dc')]);
assert(html.includes('DC — połączenie z falownikiem rozpoznane'));
assert(html.includes('historyczne ustawienie przyłącza'));
const ac={...dc,id:'batac',energy_storage:{coupling:'legacy',manual:{power:1,soc:75}}};
const grid={id:'grid',type:'power_grid',energy_ports:[port('ac')]};
html=inspect(ac,[grid],[wire('wire2','grid','ac','batac','ac')]);
assert(html.includes('AC — połączenie rozpoznane'));
assert(!html.includes('historyczne ustawienie przyłącza'));
html=inspect(dc,[inverter,grid],[wire('wire3','inv','battery','bat','dc'),
 wire('wire4','grid','ac','bat','ac')]);
assert(html.includes('Niejednoznaczne przyłącze'));
console.log('PASS E.4: real storage inspector automatic AC/DC status, legacy safety, preserved SOC/BMS');
