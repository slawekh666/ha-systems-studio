/* Read-only HA EV wallbox renderer. Readings do not control the vehicle or charger. */
const HASSStudioEVCharger=(()=>{
 const keys=['power','session_energy','daily_energy','monthly_energy','total_energy','status','alarm','temperature','vehicle_soc','voltage_l1','voltage_l2','voltage_l3','current_l1','current_l2','current_l3'];
 const numeric=['power','session_energy','daily_energy','monthly_energy','total_energy','temperature','vehicle_soc','voltage_l1','voltage_l2','voltage_l3','current_l1','current_l2','current_l3'];
 const valid=x=>typeof x==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(x)?x:'';
 const clamp=(v,min,max,d)=>v!==''&&v!=null&&Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):d;
 const defaults=()=>({mode:'live',phases:3,power_threshold_w:30,display_scale:1,show_extra:false,extra_scale:1,extra_position:'right',charging_positive:true,animate:true,
   entities:Object.fromEntries(keys.map(k=>[k,''])),manual:{power:7.2,session_energy:18.6,status:'charging',alarm:false}});
 const normalize=node=>{
  const o=node?.ev_charger||node||{},d=defaults();
  return {...d,...o,mode:o.mode==='manual'?'manual':'live',phases:o.phases===1?1:3,
   power_threshold_w:clamp(o.power_threshold_w,0,1000,30),display_scale:HASSStudioReadoutScale.factor(o.display_scale),
   extra_scale:HASSStudioReadoutScale.factor(o.extra_scale),
   extra_position:o.extra_position==='left'?'left':'right',show_extra:o.show_extra===true,
   charging_positive:o.charging_positive!==false,animate:o.animate!==false,
   entities:Object.fromEntries(keys.map(k=>[k,valid(o.entities?.[k])])),
   manual:{power:clamp(o.manual?.power,-500,500,7.2),session_energy:clamp(o.manual?.session_energy,0,100000,18.6),
     status:['charging','ready','disconnected','fault'].includes(o.manual?.status)?o.manual.status:'charging',alarm:o.manual?.alarm===true}};
 };
 const reading=(h,id,unit,kind)=>{
  const r=HASSStudioHA.reading(h,id);
  if(!r)return null;
  if(kind==='power')return r.unit==='W'?r.value/1000:r.unit==='kW'?r.value:null;
  if(kind==='energy')return r.unit==='Wh'?r.value/1000:r.unit==='kWh'?r.value:r.unit==='MWh'?r.value*1000:null;
  if(kind==='temp')return ['','°C','C'].includes(r.unit)&&r.value>=-40&&r.value<=150?r.value:null;
  if(kind==='soc')return ['','%'].includes(r.unit)&&r.value>=0&&r.value<=100?r.value:null;
  if(kind==='v')return ['','V'].includes(r.unit)&&r.value>=0&&r.value<=550?r.value:null;
  if(kind==='a')return ['','A'].includes(r.unit)&&r.value>=0&&r.value<=250?r.value:null;
  return null;
 };
 const state=(h,id)=>{
  const raw=String(HASSStudioHA.entity(h,id)?.state??'').trim().toLowerCase();
  if(['charging','charge','active','running','on'].includes(raw))return 'charging';
  if(['ready','available','idle','connected','waiting','paused','standby','off'].includes(raw))return 'ready';
  if(['disconnected','unplugged','not_connected'].includes(raw))return 'disconnected';
  if(['fault','error','alarm','critical','failure'].includes(raw))return 'fault';
  return null;
 };
 const alarm=(h,id)=>{
  const s=String(HASSStudioHA.entity(h,id)?.state??'').trim().toLowerCase();
  return ['on','true','1','alarm','fault','error','critical'].includes(s);
 };
 const data=(node,h)=>{
  const c=normalize(node),manual=node?.energy_mode==='test'||(node?.energy_mode==null&&c.mode==='manual');
  const get=(key,kind)=>manual?(key==='power'?c.manual.power:key==='session_energy'?c.manual.session_energy:null):reading(h,c.entities[key],null,kind);
  const power=HASSStudioHA.powerInput(node,h,c.entities.power,c.manual.power,c.mode,true).kw,
    session=get('session_energy','energy');
  const diagnostics={};
  for(const k of numeric.filter(k=>!['power','session_energy'].includes(k))){
    const kind=k.endsWith('_energy')?'energy':k==='temperature'?'temp':k==='vehicle_soc'?'soc':k.startsWith('voltage')?'v':'a';
    diagnostics[k]=get(k,kind);
  }
  const explicit=manual?c.manual.status:state(h,c.entities.status);
  const fault=manual?c.manual.alarm||explicit==='fault':alarm(h,c.entities.alarm)||explicit==='fault';
  const positive=power===null?null:(c.charging_positive?power:-power)*1000>c.power_threshold_w;
  const status=fault?'fault':explicit==='disconnected'?'disconnected':positive===true||explicit==='charging'&&positive!==false?'charging':
    explicit==='ready'||positive===false?'ready':'unknown';
  return {c,power,session,diagnostics,status,fault};
 };
 const fmt=(x,d=1)=>x===null?'—':Number(x).toFixed(d);
 const esc=v=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
 const details=d=>{
  const c=d.c,values=d.diagnostics;
  const rows=[['Moc',d.power,'kW'],['Sesja',d.session,'kWh'],['Dzisiaj',values.daily_energy,'kWh'],['Miesiąc',values.monthly_energy,'kWh'],['Razem',values.total_energy,'kWh'],['Temperatura',values.temperature,'°C'],['SOC auta',values.vehicle_soc,'%']];
  for(let i=1;i<=c.phases;i++){rows.push(['L'+i+' napięcie',values['voltage_l'+i],'V']);rows.push(['L'+i+' prąd',values['current_l'+i],'A']);}
  const height=32+rows.length*15;
  const x=c.extra_position==='left'?-190:306;
  return '<g id="ev-extended" transform="translate('+x+' 35) scale('+c.extra_scale+')"><rect width="185" height="'+height+'" rx="9" fill="#0c1c2a" stroke="#458d9c"/>'+
   '<text x="9" y="20" fill="#a5e4e8" font-size="11" font-family="Arial" font-weight="bold">ŁADOWARKA EV · ODCZYTY</text>'+
   rows.map(([name,num,unit],i)=>'<text x="9" y="'+(39+i*15)+'" font-size="10" font-family="Arial" fill="#b7d2de">'+esc(name)+'</text>'+
      '<text x="178" y="'+(39+i*15)+'" font-size="10" font-family="Arial" text-anchor="end" fill="#e6ffff">'+
      esc(num===null?'—':fmt(num,unit==='kWh'?2:1)+' '+unit)+'</text>').join('')+'</g>';
 };
 const geometry=node=>{
  const c=normalize(node),span=c.show_extra?(185*c.extra_scale+6)/2:0;
  return {x:c.show_extra&&c.extra_position==='left'?-span:0,y:0,width:150+span,height:150,centerX:75,labelY:165,readingY:179};
 };
 const render=(node,h)=>{
  const d=data(node,h),c=d.c;
  let source=typeof HASSStudioIconTemplates!=='undefined'?HASSStudioIconTemplates.evCharger:null;
  if(!source)return '<rect x="20" y="20" width="110" height="110" fill="#adc9db"/>';
  const color=d.status==='charging'?'#54dfa0':d.status==='fault'?'#ec4848':d.status==='unknown'?'#8195a0':'#f5a438';
  source=HASSStudioSvg.apply(source,{
    'ev-power-text':{text:d.power===null?'—':fmt(d.power,Math.abs(d.power)<10?1:0)+' kW'},
    'ev-session-text':{text:d.session===null?'—':fmt(d.session,1)+' kWh'},
    'ev-led':{fill:color},'ev-alarm':{visibility:d.fault?'visible':'hidden'}
  });
  if(c.animate&&d.status==='charging')source=source.replace('<g id="ev-bolt"','<g class="ss-ev-charging" id="ev-bolt"');
  source=HASSStudioReadoutScale.namedGroup(source,'ev-charger-display',145,108,c.display_scale);
  const prefix='ssev'+String(node?.id||'preview').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,24)+'-';
  source=HASSStudioSvg.namespaceIds(source,prefix);
  const extended=c.show_extra?details(d):'';
  const extra=c.show_extra?185*c.extra_scale+6:0,left=c.show_extra&&c.extra_position==='left'?-extra:0;
  return '<svg width="'+(150+extra/2)+'" height="150" viewBox="'+left+' 0 '+(300+extra)+' 300" preserveAspectRatio="xMidYMid meet">'+source+extended+'</svg>';
 };
 return Object.freeze({keys,numeric,defaults,normalize,data,geometry,render});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioEVCharger;
