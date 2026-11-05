/* Regression: rendering the actual inverter inspector must never throw.
 * A string variable named "fields" in the PV loop shadowed the parameter
 * schema and prevented clicking the inverter from opening its properties.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={
  document:{createElement:()=>({hidden:true,className:''})}
};
vm.createContext(ctx);
for(const file of ['ha-state.js','readout-scale.js','device-parameters.js','inverter-readings.js','inverter.js',
 'studio-inspector.js']){
  vm.runInContext(fs.readFileSync('src/'+file,'utf8'),ctx,{filename:file});
}
vm.runInContext('this.inspector=HASSStudioEditorInspector;this.inverter=HASSStudioInverter;',ctx);
const escape=s=>String(s??'').replace(/[&<>"']/g,ch=>
 ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const opts=(list,selected)=>list.map(([v,label])=>
 '<option value="'+escape(v)+'"'+(v===selected?' selected':'')+'>'+escape(label)+'</option>').join('');
const registry={
 resolve:()=>({device:{pl:'Falownik',en:'Inverter'}}),
 variantOptionsForNode:()=>[['modern','Nowoczesny']],
 categoryIcons:{}
};
const run=(count,manual,customRows=[],required=false,converter=false)=>{
 const node={id:'inverter1',type:'inverter',variant:'modern',visual:'studio',
  label:'Falownik',x:0,y:0,scale:1,energy_mode:manual?'test':'ha',
  energy_fallback_enabled:false,inverter:{
   count,show_extra:true,panel_rows:customRows,
   ...(converter?{hybrid:{schema_version:1,enabled:true,
     pv_ports:['pv1'],converter:{schema_version:1,enabled:true,
     ac_port_id:'ac',battery_port_id:'bat',pv_mode:'mapped',ac_mode:'calculate',
     efficiency_percent:96,battery_efficiency_percent:100}}}:{}),
   entities:{ac_power:'sensor.ac',temperature:'sensor.temp'},
   inputs:Array.from({length:count},(_,i)=>({
    name:'PV'+(i+1),required,entities:{voltage:'sensor.v'+(i+1),
     current:'sensor.a'+(i+1),power:'sensor.p'+(i+1)}
   }))
  }};
 const properties={
  scrollTop:0,innerHTML:'',
  querySelectorAll:()=>[],
  appendChild:()=>{}
 };
 const editor={_hass:{states:{}},_config:{}};
 ctx.HASSStudioEnergyTopology={ports:()=>[
  {id:'ac',label:'AC',medium:'ac',bus:'main',x:50,y:0}
 ]};
 const make=ctx.inspector.create({
  editor,L:{properties:'Właściwości',choose:'Wybierz',inverter:'Falownik'},
  properties,esc:escape,opts,registry,pickLang:()=>'pl',
  get:()=>({nodes:[node],connections:[]}),
  selectedObject:()=>node,
  getSelection:()=>({type:'node',id:node.id}),
  getSelectedPartId:()=>null,getExpandedPartId:()=>null,variantShape:()=>null
 });
 assert.doesNotThrow(()=>make(),'Selecting an inverter must render its properties panel');
 const html=properties.innerHTML;
 assert(html.includes('1. Podstawowe ustawienia i wygląd'));
 assert(html.includes('2. Dane urządzenia'));
 assert(html.includes('3. Porty i połączenia'));
 assert(html.includes('4. Dodatkowe encje'));
 assert(html.includes('data-field="inv_entity_ac_power"'));
 assert(html.includes('data-field="inv_entity_temperature"'));
 assert(html.includes('data-field="inv_pv_0_entity_voltage"'));
 assert(html.includes('data-field="inv_pv_'+(count-1)+'_entity_power"'));
 assert(html.includes('Napięcie PV1 (V)'));
 if(converter){
   for(const field of ['inv_converter_enabled','inv_converter_ac_port_id',
     'inv_converter_battery_port_id','inv_converter_ac_mode',
     'inv_converter_efficiency_percent','inv_converter_battery_efficiency_percent'])
     assert(html.includes('data-field="'+field+'"'),field);
   assert(html.includes('Przekształtnik AC/DC'));
 }
  assert(html.includes('data-field="inv_pv_0_required"'));
  if(required){assert(html.includes('ss-pv-reading-error'));assert(html.includes('role="alert"'));assert(html.includes('⚠ Brak danych'));}
  else assert(!html.includes('ss-pv-reading-error'));
  assert(html.includes('data-field="inv_pv_0_manual_power"')===manual);
 assert(html.includes('Prąd PV1 (A)'));
 assert(html.includes('Moc PV1 (W)'));
 assert(html.includes('sensor.ac'));
 assert(!html.includes('undefined PV'));
 if(manual)assert(html.includes('data-field="inv_manual_ac_power"'));
 if(customRows.length)assert(html.includes('data-field="inv_row_0_entity"'));
 // Re-rendering on subsequent selection should remain safe.
 assert.doesNotThrow(()=>make());
 return html;
};
run(1,false);
run(2,true,[{key:'custom',label:'Dziś',entity:'sensor.daily',unit:'kWh'}]);
run(12,false);
run(1,true,[],true);
run(1,false,[],true);
run(1,true,[],false,true);
console.log('PASS: inverter inspector renders on selection with 1/2/12 PV inputs and HA/TEST configurations');
