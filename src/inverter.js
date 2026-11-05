/* Photovoltaic inverter: read-only HA metrics and compact SVG visualization. */
const HASSStudioInverter=(()=>{
 const MAX_INPUTS=12,MAX_ROWS=40;
 const PANEL_WIDTH=210,ROW_HEIGHT=19;
 const clamp=(v,min,max,d)=>v!==''&&v!=null&&Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):d;
 const entity=x=>typeof x==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(x)?x:'';
 const parameters=HASSStudioDeviceParameters.inverter;
 const defaultInput=i=>parameters.inputDefaults(i);
 const DEFAULT_KEYS=['ac_power','temperature','status','alarm','pv_summary','pv_voltage','pv_current','pv_power','custom'];
 const defaultRow=(key='custom',input=0)=>({key:DEFAULT_KEYS.includes(key)?key:'custom',
   input,entity:'',label:'',unit:'auto',decimals:1,manual_value:''});
 const panelRows=(raw,node,count)=>{
   // Built-in inverter metrics (including PV1/PV2) are configured under
   // "Device data", not duplicated as independently editable panel rows.
   // Keep only user-defined HA entities, including those from legacy layouts.
   const source=Array.isArray(raw.panel_rows)?raw.panel_rows:
     Array.isArray(node?.entities)?node.entities.map(item=>({
       key:'custom',entity:item?.entity,label:item?.label
     })):[];
   return source.filter(row=>row&&(row.key==null||row.key==='custom'))
     .slice(0,MAX_ROWS).map(row=>({
       key:'custom',input:0,entity:entity(row.entity),
       label:String(row.label??'').slice(0,42),
       unit:['auto','W','kW','Wh','kWh','MWh','V','A','°C','%','Hz'].includes(row.unit)?row.unit:'auto',
       decimals:Math.round(clamp(row.decimals,0,3,1)),
       manual_value:String(row.manual_value??'').slice(0,60)
     }));
 };
 const panelHeight=c=>Math.max(52,40+c.panel_rows.length*ROW_HEIGHT);
 // Explicit, opt-in port bindings. Legacy inverter nodes without hybrid
 // metadata retain their old AC-only accounting on normalization and saving.
 const hybridDefaults=()=>({schema_version:1,enabled:false,pv_ports:Array(MAX_INPUTS).fill('')});
 const converterDefaults=()=>({schema_version:1,enabled:false,
   ac_port_id:'',battery_port_id:'',pv_mode:'mapped',ac_mode:'auto',
   efficiency_percent:null});
 const normalizeConverter=raw=>{
   const x=raw&&typeof raw==='object'?raw:{};
   const validPort=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,32}$/.test(id)?id:'';
   const ef=x.efficiency_percent;
   const eta=ef!==null&&ef!==undefined&&ef!==''&&
     Number.isFinite(Number(ef))&&Number(ef)>0&&Number(ef)<=100?
     Number(ef):null;
   return {schema_version:1,enabled:x.schema_version===1&&x.enabled===true,
     ac_port_id:validPort(x.ac_port_id),
     battery_port_id:validPort(x.battery_port_id),
     pv_mode:x.pv_mode==='none'?'none':'mapped',
     ac_mode:x.ac_mode==='calculate'?'calculate':'auto',
     efficiency_percent:eta};
 };
 const normalizeHybrid=raw=>{
   const c=raw&&typeof raw==='object'?raw:{};
   return {schema_version:1,enabled:c.schema_version===1&&c.enabled===true,
     pv_ports:Array.from({length:MAX_INPUTS},(_,i)=>{
       const id=c.pv_ports?.[i];
       return typeof id==='string'&&/^[A-Za-z0-9_-]{1,32}$/.test(id)?id:'';
     }),
     ...(c.converter&&typeof c.converter==='object'?
       {converter:normalizeConverter(c.converter)}:{})};
 };
 const defaults=()=>({mode:'live',count:2,display_scale:1,show_extra:false,extra_position:'right',extra_scale:1,
   panel_title:'Parametry falownika',panel_rows:[],
   rated_kw:10,production_threshold_w:10,positive_power:true,export_allowed:true,entities:parameters.entities(parameters.core),
   manual:parameters.manualDefaults(parameters.core),inputs:[]});
 const normalize=node=>{
   const raw=node?.inverter||node||{},d=defaults(),count=Math.round(clamp(raw.count,1,MAX_INPUTS,2));
   return {...d,...raw,mode:raw.mode==='manual'?'manual':'live',count,
    display_scale:HASSStudioReadoutScale.factor(raw.display_scale),
    extra_scale:HASSStudioReadoutScale.factor(raw.extra_scale),
    show_extra:raw.show_extra===true,extra_position:raw.extra_position==='left'?'left':'right',
    rated_kw:clamp(raw.rated_kw,.1,500,10),production_threshold_w:clamp(raw.production_threshold_w,0,1000,10),
    positive_power:raw.positive_power!==false,export_allowed:raw.export_allowed!==false,
    panel_title:String(raw.panel_title??'Parametry falownika').slice(0,46),
    panel_rows:panelRows(raw,node,count),
    entities:parameters.entities(parameters.core,raw.entities),
    manual:{ac_power:clamp(raw.manual?.ac_power,-500,500,6.4),
       temperature:clamp(raw.manual?.temperature,-40,150,32),
       status:['auto','generating','standby','off','fault'].includes(raw.manual?.status)?raw.manual.status:'auto',
       alarm:raw.manual?.alarm===true},
    inputs:Array.from({length:count},(_,i)=>{
      const original=raw.inputs?.[i]||{},d=defaultInput(i);
      // Legacy saved numbers without flags remain active; new defaults are not.
      const keys=['voltage','current','power'];
      const manualEnabled=Object.fromEntries(keys.map(k=>[k,
        typeof original.manual_enabled?.[k]==='boolean'?original.manual_enabled[k]:
          Object.prototype.hasOwnProperty.call(original.manual||{},k)&&
          original.manual[k]!==null&&original.manual[k]!==''&&
          Number.isFinite(Number(original.manual[k]))]));
      return {name:String(original.name??d.name).slice(0,12),
        visible:original.visible!==false,required:original.required===true,
        entities:parameters.entities(parameters.pv,original.entities),
        manual:Object.fromEntries(keys.map(k=>[k,original.manual?.[k]===null?null:
          clamp(original.manual?.[k],0,50000,d.manual[k])])),
        manual_enabled:manualEnabled};
    }),...(raw.hybrid&&typeof raw.hybrid==='object'?{hybrid:normalizeHybrid(raw.hybrid)}:{})};
 };
 // An MPPT reading measures power entering the inverter on a separate PV
 // circuit. It is NOT a battery-bus generator or an AC/DC converter transfer.
 const dcTerminals=(node,h)=>{
   const c=normalize(node);
   if(node?.type!=='inverter'||c.hybrid?.enabled!==true)
     return {enabled:false,terminals:[],errors:[]};
   const terminals=[],errors=[],seen=new Set(),
     byId=new Map(HASSStudioEnergyTopology.ports(node).map(p=>[p.id,p])),
     inputs=HASSStudioInverterReadings.resolve(node,h,c).inputs;
   for(let i=0;i<c.count;i++){
     const portId=c.hybrid.pv_ports[i],input=c.inputs[i];
     if(!portId){
       if(input.required)errors.push({reason:'pv_dc_required_mapping_missing',input_index:i,port_id:''});
       continue;
     }
     const report=reason=>errors.push({reason,input_index:i,port_id:portId});
     if(seen.has(portId)){report('pv_dc_duplicate_mapping');continue;}
     seen.add(portId);
     const port=byId.get(portId);
     if(!port){report('pv_dc_missing_port');continue;}
     if(port.medium!=='dc'){report('pv_dc_wrong_medium');continue;}
     const value=inputs[i],powerKw=value.watts===null?null:value.watts/1000;
     terminals.push({node_id:node.id,port_id:portId,input_index:i,
       input_name:input.name,medium:'dc',measurement_point:'inverter_mppt_input',
       power_kw:powerKw,injection_kw:powerKw===null?null:-powerKw,
       source:value.power_source,status:value.status,included_in_balance:false});
     if(powerKw===null&&input.required)report('pv_dc_missing_measurement');
   }
   return {enabled:true,terminals,errors};
 };
 const data=(node,h)=>{
   const c=normalize(node),resolved=HASSStudioInverterReadings.resolve(node,h,c);
   const {power,temperature,alarm,inputs,manual}=resolved;
   const fault=alarm==='alarm'||(manual&&c.manual.status==='fault')||
     (!manual&&resolved.statusAlarm==='alarm');
   const generating=power===null?null:((c.positive_power?power:-power)*1000>c.production_threshold_w);
   return {c,power,temperature,fault,generating,inputs,manual,
      state:fault?'alarm':manual&&c.manual.status!=='auto'?c.manual.status:generating===null?'unknown':generating?'generating':'standby'};
 };
 const esc=x=>String(x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
 const fmt=(v,d=0)=>v===null?'—':Number(v).toFixed(d);
 const kw=v=>v===null?'—':Math.abs(v)>=10?fmt(v,1)+'kW':fmt(v,2)+'kW';
 const svgRow=(q,index)=>'<g class="inv-pv-row" transform="translate(0 '+(119+index*10)+')">'+
   '<text x="104" y="0" font-size="7.4" fill="#86d6fa" font-family="Arial,sans-serif">'+esc(q.name.slice(0,6))+'</text>'+
   '<text x="197" y="0" text-anchor="end" font-size="7.5" fill="#c9f5ff" font-family="Arial,sans-serif">'+
   esc(fmt(q.voltage)+'V  '+fmt(q.current,1)+'A  '+(q.watts===null?'—':fmt(q.watts))+'W')+'</text></g>';
 const labelFor=(row,c)=>{
   if(row.label)return row.label;
   const names={ac_power:'Moc AC',temperature:'Temperatura',status:'Status',alarm:'Alarm',
     pv_summary:'PV — V / A / W',pv_voltage:'Napięcie PV',pv_current:'Prąd PV',pv_power:'Moc PV',custom:'Encja'};
   const prefix=names[row.key]||'Encja';
   const pv=row.key.startsWith('pv_');
   return pv?(row.key==='pv_summary'?c.inputs[row.input]?.name||'PV':prefix+' '+(c.inputs[row.input]?.name||'PV'+(row.input+1))):prefix;
 };
 const readingFor=(row,d,h)=>{
   const c=d.c,manual=d.manual;
   const index=c.inputs[row.input];
   let value=null,unit='';
   if(row.key==='ac_power'){value=d.power;unit='kW';}
   else if(row.key==='temperature'){value=d.temperature;unit='°C';}
   else if(row.key==='status'){
     if(manual)value=({generating:'Produkcja',standby:'Czuwanie',off:'Wyłączony',fault:'Awaria'})[d.state]||'Brak danych';
     else value=HASSStudioHA.entity(h,c.entities.status)?.state??null;
   }else if(row.key==='alarm'){
     if(manual)value=d.c.manual.alarm?'Alarm':'Brak';
     else value=HASSStudioHA.entity(h,c.entities.alarm)?.state??null;
   }else if(index&&row.key==='pv_voltage'){value=d.inputs[row.input].voltage;unit='V';}
   else if(index&&row.key==='pv_current'){value=d.inputs[row.input].current;unit='A';}
   else if(index&&row.key==='pv_power'){value=d.inputs[row.input].watts;unit='W';}
   else if(index&&row.key==='pv_summary'){
     const pv=d.inputs[row.input];
     const v=pv.voltage,a=pv.current,w=pv.watts;
     return {text:fmt(v)+' V / '+fmt(a,1)+' A / '+fmt(w)+' W',known:v!==null||a!==null||w!==null};
   }else if(row.key==='custom'){
     if(manual)value=row.manual_value;
     else{
       const state=HASSStudioHA.entity(h,row.entity);
       value=state?.state??null;
       unit=String(state?.attributes?.unit_of_measurement??'').slice(0,12);
     }
   }
   if(value===null||value===undefined||value===''||['unavailable','unknown','none','null'].includes(String(value).trim().toLowerCase()))
     return {text:'—',known:false};
   // Format numeric values and convert compatible power/energy units when requested.
   const text=String(value).trim();
   const numeric=Number(text);
   if(Number.isFinite(numeric)&&text!==''){
     let number=numeric;
     const target=row.unit;
     const conversions={'W:kW':.001,'kW:W':1000,'Wh:kWh':.001,'kWh:Wh':1000,
       'kWh:MWh':.001,'MWh:kWh':1000,'Wh:MWh':.000001,'MWh:Wh':1000000};
     if(target!=='auto'&&target!==unit){
       if(!unit)unit=target;
       const ratio=conversions[unit+':'+target];
       if(ratio!==undefined){number*=ratio;unit=target;}
       // Never mislabel incompatible units: retain the measured unit.
     }
     return {text:number.toFixed(row.decimals)+(unit?' '+unit:''),known:true};
   }
   return {text:text.slice(0,38),known:true};
 };
 const panelData=(node,h)=>{
   const d=data(node,h);
   return d.c.panel_rows.map((row)=>({...row,label:labelFor(row,d.c),reading:readingFor(row,d,h)}));
 };
 const extra=(d,h)=>{
   const c=d.c,all=c.panel_rows,hgt=panelHeight(c),w=PANEL_WIDTH;
   const x=c.extra_position==='left'?-w*c.extra_scale-10:310,y=65;
   const panel=['<g id="inv-diagnostic-panel" transform="translate('+x+' '+y+') scale('+c.extra_scale+')">',
     '<rect x="0" y="0" width="'+w+'" height="'+hgt+'" rx="9" fill="#0c1b2d" stroke="#498baf" stroke-width="1.2"/>',
     '<text x="10" y="20" fill="#a8e4ff" font-family="Arial,sans-serif" font-size="11" font-weight="700">'+esc(c.panel_title)+'</text>'];
   all.forEach((q,i)=>{
     const y=39+i*ROW_HEIGHT,label=labelFor(q,c),v=readingFor(q,d,h);
     panel.push('<g class="inv-metric-row" data-row="'+i+'" data-key="'+esc(q.key)+'">');
     panel.push('<text x="10" y="'+y+'" fill="#79d5fc" font-family="Arial,sans-serif" font-size="10">'+esc(label.slice(0,32))+'</text>');
     panel.push('<text x="'+(w-9)+'" y="'+y+'" text-anchor="end" fill="'+(v.known?'#e4f7ff':'#8ca9b8')+'" font-family="Arial,sans-serif" font-size="10">'+esc(v.text)+'</text></g>');
   });
   if(!all.length)panel.push('<text x="10" y="39" font-size="10" fill="#8ca9b8">Brak wybranych parametrów</text>');
   return panel.join('')+'</g>';
 };
 const geometry=node=>{
   const c=normalize(node),w=150;
   const side= c.show_extra?(PANEL_WIDTH*c.extra_scale+10)/2:0;
   const lower=c.show_extra?Math.max(150,(65+panelHeight(c)*c.extra_scale)/2):150;
   return {x:c.show_extra&&c.extra_position==='left'?-side:0,y:0,
     width:w+side,height:lower,centerX:75,labelY:lower+15,readingY:lower+29};
 };
 const render=(node,h)=>{
   const d=data(node,h),c=d.c;
   let source=typeof HASSStudioIconTemplates!=='undefined'?HASSStudioIconTemplates.inverter:null;
   if(!source)return '<rect width="150" height="150" fill="#99a"/>';
   const shown=d.inputs.filter(x=>x.visible).slice(0,3);
   const rowMarkup=shown.map(svgRow).join('')+
     (d.inputs.filter(x=>x.visible).length>3?'<text x="194" y="147" text-anchor="end" fill="#79d5fc" font-size="7">więcej…</text>':'');
   source=HASSStudioSvg.inject(source,{'inv-pv-rows':rowMarkup,'inv-extra-panel':c.show_extra?extra(d,h):''});
   const led=d.state==='generating'?'#4cd6ff':d.state==='standby'?'#ff9b32':
     d.state==='alarm'?'#f04444':'#7e929f';
   const screen=HASSStudioSvg.parameterBindings(parameters.core,{ac_power:d.power},{ac_power:kw});
   source=HASSStudioSvg.apply(source,{...screen,
     'inv-led':{fill:led},'inv-led-glow':{fill:led},
     'inv-alert':{visibility:d.fault?'visible':'hidden'}});
   source=HASSStudioReadoutScale.namedGroup(source,'inverter-display',150,110,c.display_scale);
   const prefix='ssinv'+String(node?.id||'preview').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,24)+'-';
   const content=HASSStudioSvg.namespaceIds(source,prefix);
   const extraWidth=c.show_extra?Math.ceil(PANEL_WIDTH*c.extra_scale)+10:0;
   const left=c.show_extra&&c.extra_position==='left'?-extraWidth:0;
   const bottom=c.show_extra?Math.max(300,65+panelHeight(c)*c.extra_scale+10):300;
   return '<svg width="'+(150+extraWidth/2)+'" height="'+(bottom/2)+'" viewBox="'+left+' 0 '+(300+extraWidth)+' '+bottom+'" preserveAspectRatio="xMinYMin meet">'+content+'</svg>';
 };
 return Object.freeze({MAX_INPUTS,MAX_ROWS,DEFAULT_KEYS,parameters,defaultInput,defaultRow,hybridDefaults,converterDefaults,normalizeConverter,normalizeHybrid,defaults,normalize,dcTerminals,data,geometry,render,fmt,panelData,readingFor,labelFor,panelHeight});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioInverter;
