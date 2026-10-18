/* Photovoltaic inverter: read-only HA metrics and compact SVG visualization. */
const HASSStudioInverter=(()=>{
 const MAX_INPUTS=12,MAX_ROWS=40;
 const PANEL_WIDTH=210,ROW_HEIGHT=19;
 const clamp=(v,min,max,d)=>v!==''&&v!=null&&Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):d;
 const entity=x=>typeof x==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(x)?x:'';
 const defaultInput=i=>({name:'PV'+(i+1),visible:i<3,entities:{voltage:'',current:'',power:''},manual:{voltage:380,current:8,power:null}});
 const DEFAULT_KEYS=['ac_power','temperature','status','alarm','pv_summary','pv_voltage','pv_current','pv_power','custom'];
 const defaultRow=(key='custom',input=0)=>({key:DEFAULT_KEYS.includes(key)?key:'custom',
   input,entity:'',label:'',unit:'auto',decimals:1,manual_value:''});
 const panelRows=(raw,node,count)=>{
   // A stored empty array is meaningful. Only older layouts need migration.
   if(Array.isArray(raw.panel_rows))return raw.panel_rows.slice(0,MAX_ROWS).map((row)=>{
     const key=DEFAULT_KEYS.includes(row?.key)?row.key:'custom';
     return {key,input:Math.round(clamp(row?.input,0,count-1,0)),
       entity:entity(row?.entity),
       label:String(row?.label??'').slice(0,42),
       unit:['auto','W','kW','Wh','kWh','MWh','V','A','°C','%','Hz'].includes(row?.unit)?row.unit:'auto',
       decimals:Math.round(clamp(row?.decimals,0,3,1)),
       manual_value:String(row?.manual_value??'').slice(0,60)};
   });
   const legacy=Array.from({length:count},(_,i)=>defaultRow('pv_summary',i));
   const extras=Array.isArray(node?.entities)?node.entities.slice(0,MAX_ROWS-count).map(item=>({
     ...defaultRow('custom'),entity:entity(item?.entity),label:String(item?.label||'').slice(0,42)
   })):[];
   return legacy.concat(extras);
 };
 const panelHeight=c=>Math.max(52,40+c.panel_rows.length*ROW_HEIGHT);
 const defaults=()=>({mode:'live',count:2,display_scale:1,show_extra:false,extra_position:'right',extra_scale:1,
   panel_title:'Parametry falownika',panel_rows:[],
   rated_kw:10,production_threshold_w:10,positive_power:true,entities:{ac_power:'',temperature:'',status:'',alarm:''},
   manual:{ac_power:6.4,temperature:32},inputs:[]});
 const normalize=node=>{
   const raw=node?.inverter||node||{},d=defaults(),count=Math.round(clamp(raw.count,1,MAX_INPUTS,2));
   return {...d,...raw,mode:raw.mode==='manual'?'manual':'live',count,
    display_scale:HASSStudioReadoutScale.factor(raw.display_scale),
    extra_scale:HASSStudioReadoutScale.factor(raw.extra_scale),
    show_extra:raw.show_extra===true,extra_position:raw.extra_position==='left'?'left':'right',
    rated_kw:clamp(raw.rated_kw,.1,500,10),production_threshold_w:clamp(raw.production_threshold_w,0,1000,10),
    positive_power:raw.positive_power!==false,
    panel_title:String(raw.panel_title??'Parametry falownika').slice(0,46),
    panel_rows:panelRows(raw,node,count),
    entities:Object.fromEntries(['ac_power','temperature','status','alarm'].map(k=>[k,entity(raw.entities?.[k])])),
    manual:{ac_power:clamp(raw.manual?.ac_power,-500,500,6.4),temperature:clamp(raw.manual?.temperature,-40,150,32)},
    inputs:Array.from({length:count},(_,i)=>{
      const original=raw.inputs?.[i]||{},d=defaultInput(i);
      return {name:String(original.name??d.name).slice(0,12),visible:original.visible!==false,
        entities:Object.fromEntries(['voltage','current','power'].map(k=>[k,entity(original.entities?.[k])])),
        manual:Object.fromEntries(['voltage','current','power'].map(k=>[k,original.manual?.[k]===null?null:clamp(original.manual?.[k],0,50000,d.manual[k])]))};
    })};
 };
 const read=(h,id,units,lo,hi)=>{
   const r=HASSStudioHA.reading(h,id);
   return r&&units.includes(r.unit)&&r.value>=lo&&r.value<=hi?r.value:null;
 };
 const status=(h,id)=>{
   const value=String(HASSStudioHA.entity(h,id)?.state??'').trim().toLowerCase();
   return ['on','alarm','fault','error','critical','warning'].includes(value)?'alarm':
     ['off','normal','ok','clear'].includes(value)?'ok':null;
 };
 const data=(node,h)=>{
   const c=normalize(node),manual=c.mode==='manual';
   const power=manual?c.manual.ac_power:(()=>{
     const r=HASSStudioHA.reading(h,c.entities.ac_power);
     return r&&['W','kW'].includes(r.unit)&&Number.isFinite(r.value)?r.value/(r.unit==='W'?1000:1):null;
   })();
   const temperature=manual?c.manual.temperature:read(h,c.entities.temperature,['°C','C',''], -40,150);
   const fault=manual?false:status(h,c.entities.alarm)==='alarm'||status(h,c.entities.status)==='alarm';
   const generating=power===null?null:((c.positive_power?power:-power)*1000>c.production_threshold_w);
   const inputs=c.inputs.map(q=>{
     const voltage=manual?q.manual.voltage:read(h,q.entities.voltage,['V',''],0,2000);
     const current=manual?q.manual.current:read(h,q.entities.current,['A',''],0,200);
     const direct=manual?q.manual.power:(()=>{
       const r=HASSStudioHA.reading(h,q.entities.power);
       return r&&['W','kW'].includes(r.unit)&&r.value>=0?r.value*(r.unit==='kW'?1000:1):null;
     })();
     const watts=direct!==null?direct:voltage!==null&&current!==null?voltage*current:null;
     return {...q,voltage,current,watts,calculated:direct===null&&watts!==null};
   });
   return {c,power,temperature,fault,generating,inputs,state:fault?'alarm':generating===null?'unknown':generating?'generating':'standby'};
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
   const c=d.c,manual=c.mode==='manual';
   const index=c.inputs[row.input];
   let value=null,unit='';
   if(row.key==='ac_power'){value=d.power;unit='kW';}
   else if(row.key==='temperature'){value=d.temperature;unit='°C';}
   else if(row.key==='status'){
     if(manual)value=d.state==='generating'?'Produkcja':d.state==='standby'?'Czuwanie':'Brak danych';
     else value=HASSStudioHA.entity(h,c.entities.status)?.state??null;
   }else if(row.key==='alarm'){
     if(manual)value=d.fault?'Alarm':'Brak';
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
   source=HASSStudioSvg.apply(source,{'inv-power':{text:kw(d.power)},
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
 return Object.freeze({MAX_INPUTS,MAX_ROWS,DEFAULT_KEYS,defaultInput,defaultRow,defaults,normalize,data,geometry,render,fmt,panelData,readingFor,labelFor,panelHeight});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioInverter;
