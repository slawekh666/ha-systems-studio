/* Photovoltaic inverter: read-only HA metrics and compact SVG visualization. */
const HASSStudioInverter=(()=>{
 const MAX_INPUTS=12;
 const clamp=(v,min,max,d)=>v!==''&&v!=null&&Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):d;
 const entity=x=>typeof x==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(x)?x:'';
 const defaultInput=i=>({name:'PV'+(i+1),visible:i<3,entities:{voltage:'',current:'',power:''},manual:{voltage:380,current:8,power:null}});
 const defaults=()=>({mode:'live',count:2,display_scale:1,show_extra:false,extra_position:'right',extra_scale:1,
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
 const extra=(d)=>{
   const c=d.c,all=d.inputs;
   const w=186,h=Math.max(57,33+all.length*17);
   const x=c.extra_position==='left'?-w-5:305,y=65;
   const panel=['<g id="inv-diagnostic-panel" transform="translate('+x+' '+y+') scale('+c.extra_scale+')">',
     '<rect x="0" y="0" width="'+w+'" height="'+h+'" rx="9" fill="#0c1b2d" stroke="#498baf" stroke-width="1.2"/>',
     '<text x="9" y="17" fill="#a8e4ff" font-family="Arial,sans-serif" font-size="11" font-weight="700">WEJŚCIA PV / MPPT</text>',
     '<text x="177" y="17" text-anchor="end" fill="#a8e4ff" font-family="Arial,sans-serif" font-size="8">V / A / W</text>'];
   all.forEach((q,i)=>{
     panel.push('<text x="9" y="'+(35+i*17)+'" fill="#79d5fc" font-family="Arial,sans-serif" font-size="10">'+esc(q.name)+'</text>');
     panel.push('<text x="177" y="'+(35+i*17)+'" text-anchor="end" fill="#e4f7ff" font-family="Arial,sans-serif" font-size="10">'+
       esc(fmt(q.voltage)+' / '+fmt(q.current,1)+' / '+fmt(q.watts))+'</text>');
   });
   return panel.join('')+'</g>';
 };
 const geometry=node=>{
   const c=normalize(node),w=150;
   const panelWidth=186*c.extra_scale+5;
   return {x:c.show_extra&&c.extra_position==='left'?-panelWidth/2:0,y:0,
     width:w+(c.show_extra?panelWidth/2:0),height:150,centerX:75,labelY:165,readingY:179};
 };
 const render=(node,h)=>{
   const d=data(node,h),c=d.c;
   let source=typeof HASSStudioIconTemplates!=='undefined'?HASSStudioIconTemplates.inverter:null;
   if(!source)return '<rect width="150" height="150" fill="#99a"/>';
   const shown=d.inputs.filter(x=>x.visible).slice(0,3);
   const rowMarkup=shown.map(svgRow).join('')+
     (d.inputs.filter(x=>x.visible).length>3?'<text x="194" y="147" text-anchor="end" fill="#79d5fc" font-size="7">więcej…</text>':'');
   source=HASSStudioSvg.inject(source,{'inv-pv-rows':rowMarkup,'inv-extra-panel':c.show_extra?extra(d):''});
   const led=d.state==='generating'?'#4cd6ff':d.state==='standby'?'#ff9b32':
     d.state==='alarm'?'#f04444':'#7e929f';
   source=HASSStudioSvg.apply(source,{'inv-power':{text:kw(d.power)},
     'inv-led':{fill:led},'inv-led-glow':{fill:led},
     'inv-alert':{visibility:d.fault?'visible':'hidden'}});
   source=HASSStudioReadoutScale.namedGroup(source,'inverter-display',150,110,c.display_scale);
   const prefix='ssinv'+String(node?.id||'preview').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,24)+'-';
   const content=HASSStudioSvg.namespaceIds(source,prefix);
   const extraWidth=c.show_extra?Math.ceil(186*c.extra_scale)+5:0;
   const left=c.show_extra&&c.extra_position==='left'?-extraWidth:0;
   return '<svg width="'+(150+extraWidth/2)+'" height="150" viewBox="'+left+' 0 '+(300+extraWidth)+' 300" preserveAspectRatio="xMidYMid meet">'+content+'</svg>';
 };
 return Object.freeze({MAX_INPUTS,defaultInput,defaults,normalize,data,geometry,render,fmt});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioInverter;
