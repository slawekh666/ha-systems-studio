/* Power Grid: read-only three-phase SVG device renderer.
 * Source art: src/icons/power-grid-*.svg; editable icons embedded by build.py.
 */
const HASSStudioPowerGrid=(()=>{
 const num=(x,a,b,d)=>x!==''&&x!=null&&Number.isFinite(Number(x))?Math.max(a,Math.min(b,Number(x))):d;
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&apos;'}[c]));
 const FIELDS=['l1_v','l1_a','l2_v','l2_a','l3_v','l3_a','total_kw','import_kw','export_kw','frequency','power_factor'];
 const EXTRAS=['total_kw','import_kw','export_kw','frequency','power_factor','grid_status','voltage_alarm','phase_loss'];
 const defaults=()=>({variant:'classic',theme:'auto',panel_position:'right',panel_x:0,panel_y:0,
  show_panel:true,show_v:true,show_a:true,show_l1:true,show_l2:true,show_l3:true,
  show_extras:[],mode:'live',entities:{},manual:{l1_v:231.8,l1_a:4.2,l2_v:229.7,l2_a:3.8,l3_v:233.5,l3_a:5.1,
  total_kw:2.5,import_kw:2.5,export_kw:0,frequency:49.98,power_factor:0.98,grid_status:1,voltage_alarm:0,phase_loss:0},
  min_voltage:207,max_voltage:253});
 const normalize=(node)=>{
  const d=defaults(),raw=node?.power_grid||{},entities=raw.entities||{},manual=raw.manual||{};
  return {...d,...raw,variant:node?.variant==='modern'||raw.variant==='modern'?'modern':'classic',
   theme:['auto','light','dark'].includes(raw.theme)?raw.theme:'auto',
   panel_position:['left','right','bottom'].includes(raw.panel_position)?raw.panel_position:'right',
   panel_x:num(raw.panel_x,-250,250,0),panel_y:num(raw.panel_y,-250,250,0),
   min_voltage:num(raw.min_voltage,0,350,207),max_voltage:num(raw.max_voltage,0,400,253),
   mode:raw.mode==='manual'?'manual':'live',
   entities:Object.fromEntries([...FIELDS,'grid_status','voltage_alarm','phase_loss'].map(k=>[k,typeof entities[k]==='string'?entities[k]:''])),
   manual:Object.fromEntries([...FIELDS,'grid_status','voltage_alarm','phase_loss'].map(k=>[k,num(manual[k],-10000,10000,d.manual[k])])),
   show_extras:EXTRAS.filter(k=>Array.isArray(raw.show_extras)&&raw.show_extras.includes(k))};
 };
 const reading=(key,conf,hass)=>{
  if(conf.mode==='manual')return conf.manual[key];
  const id=conf.entities[key];
  if(!id||!/^[-\w]+\.[-\w]+$/.test(id))return null;
  const state=hass?.states?.[id];
  if(!state||['unknown','unavailable','none',''].includes(String(state.state).toLowerCase()))return null;
  const n=Number(state.state);
  if(!Number.isFinite(n))return null;
  const unit=String(state.attributes?.unit_of_measurement||'').trim();
  if(key==='total_kw'||key==='import_kw'||key==='export_kw'){
   if(unit==='W')return n/1000;
   if(unit===''||unit==='kW')return n;
   return null;
  }
  if(key.endsWith('_v')&&unit!==''&&unit!=='V')return null;
  if(key.endsWith('_a')&&unit!==''&&unit!=='A')return null;
  if(key==='frequency'&&unit!==''&&unit!=='Hz')return null;
  if(key==='power_factor'&&unit!==''&&unit!=='%'&&unit!=='1')return null;
  return n;
 };
 const status=(key,c,h)=>{
  if(c.mode==='manual')return Boolean(c.manual[key]);
  const id=c.entities[key],s=h?.states?.[id]?.state;
  if(!id||s==null||['unknown','unavailable'].includes(String(s).toLowerCase()))return null;
  const v=String(s).toLowerCase();
  if(['on','true','1','active','alarm','problem'].includes(v))return true;
  if(['off','false','0','inactive','normal','ok'].includes(v))return false;
  return null;
 };
 const resolve=(node,hass)=>{
  const c=normalize(node);const phase={};let alarm=false;
  for(const n of [1,2,3]){
   const v=reading('l'+n+'_v',c,hass),a=reading('l'+n+'_a',c,hass);
   const voltageAlert=v!==null&&(v<c.min_voltage||v>c.max_voltage);
   phase['l'+n]={v,a,voltageAlert};alarm ||=voltageAlert;
  }
  const voltageAlarm=status('voltage_alarm',c,hass),phaseLoss=status('phase_loss',c,hass);
  alarm ||=voltageAlarm===true||phaseLoss===true;
  return {config:c,phase,alarm,voltageAlarm,phaseLoss,gridStatus:status('grid_status',c,hass)};
 };
 const geometry=node=>{
  const c=normalize(node);const visible=c.show_panel&&(c.show_v||c.show_a||c.show_extras.length>0);
  const gap=14,body={x:0,y:0,width:118,height:164},panelW=164,panelH=156+Math.min(c.show_extras.length,8)*20;
  let panel={x:body.width+gap+c.panel_x,y:10+c.panel_y,width:panelW,height:panelH};
  if(c.panel_position==='left')panel={...panel,x:-panelW-gap+c.panel_x};
  if(c.panel_position==='bottom')panel={...panel,x:(body.width-panelW)/2+c.panel_x,y:body.height+gap+c.panel_y};
  const x=visible?Math.min(body.x,panel.x):body.x,y=visible?Math.min(body.y,panel.y):body.y;
  const right=visible?Math.max(body.width,panel.x+panel.width):body.width;
  const bottom=visible?Math.max(body.height,panel.y+panel.height):body.height;
  return {x,y,width:right-x,height:bottom-y,body,panel,centerX:59,labelY:bottom+14,readingY:bottom+28};
 };
 const fmt=(v,d=1)=>v===null?'—':num(v,-100000,100000,0).toFixed(d);
 const cell=(x,y,text,alert=false,anchor='end')=>'<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-size="10.5" font-family="Arial,sans-serif" font-weight="600" fill="'+(alert?'#ff6c69':'#dce8f2')+'">'+esc(text)+'</text>';
 const render=(node,hass)=>{
  const data=resolve(node,hass),c=data.config,g=geometry(node);
  const pref=node?.id?'ssgrid'+String(node.id).replace(/[^a-zA-Z0-9_-]/g,''):'ssgridstandalone';
  const dark=c.theme==='dark'||(c.theme==='auto'&&hass?.themes?.darkMode===true);
  const key=c.variant==='modern'?(dark?'powerGridModernDark':'powerGridModernLight'):'powerGridClassic';
  const source=typeof HASSStudioIconTemplates!=='undefined'?HASSStudioIconTemplates[key]:null;
  // Equal physical footprint: Classic square and Modern portrait occupy 118 x 164.
  const art=source?'<svg x="0" y="0" width="118" height="164" viewBox="'+(c.variant==='modern'?'49 63 245 395':'0 0 300 300')+'" preserveAspectRatio="xMidYMid meet">'+
    HASSStudioSvg.namespaceIds(source,pref+'-')+'</svg>':
    '<path d="M59 8L16 159H102L59 8ZM43 66H76M28 117H90M59 8V159M22 145L85 96M96 145L33 96" fill="none" stroke="#a7c9da" stroke-width="2.5"/>';
  const rows=[];let yy=29;
  for(const n of [1,2,3]){
   if(c['show_l'+n]===false)continue;
   const p=data.phase['l'+n],rowY=yy;
   rows.push('<g'+(p.voltageAlert?'':'')+'>'+
     cell(13,rowY,'L'+n,false,'start')+
     (c.show_v?cell(c.show_a?101:148,rowY,fmt(p.v)+' V',p.voltageAlert):'')+
     (c.show_a?cell(149,rowY,fmt(p.a)+' A'):'')+
     (p.voltageAlert?'<path d="M150 '+(rowY-12)+' l6 11 h-12Z" fill="#ff6c69"/>':'')+'</g>');
   yy+=27;
  }
  const extraNames={total_kw:'Moc',import_kw:'Pobór',export_kw:'Oddawanie',frequency:'Hz',power_factor:'cos φ',
    grid_status:'Sieć',voltage_alarm:'Alarm U',phase_loss:'Brak fazy'};
  const extraUnits={total_kw:'kW',import_kw:'kW',export_kw:'kW',frequency:'Hz',power_factor:''};
  const extraRows=[];
  for(const k of c.show_extras){
   const flags=['grid_status','voltage_alarm','phase_loss'];
   const v=flags.includes(k)?(k==='grid_status'?data.gridStatus:k==='voltage_alarm'?data.voltageAlarm:data.phaseLoss):reading(k,c,hass);
   const flagAlert=(k==='grid_status'&&v===false)||((k==='phase_loss'||k==='voltage_alarm')&&v===true);
   const desc=flags.includes(k)?(v===null?'—':k==='grid_status'?(v?'Dostępna':'Brak'):v?'TAK':'NIE'):
     fmt(v,k==='frequency'?2:k==='power_factor'?2:2)+' '+(extraUnits[k]||'');
   extraRows.push(cell(13,yy,extraNames[k],false,'start')+cell(149,yy,desc,flagAlert)+(flagAlert?'<path d="M151 '+(yy-12)+' l5 9 h-10Z" fill="#ff6c69"/>':''));
   yy+=20;
  }
  const panelSvg=c.show_panel?'<g transform="translate('+g.panel.x+' '+g.panel.y+')">'+
   '<rect x="0" y="0" width="'+g.panel.width+'" height="'+Math.max(42,yy+12)+'" rx="9" fill="#112332" stroke="#4b6678" stroke-width="1.5"/>'+
   '<rect x="6" y="6" width="'+(g.panel.width-12)+'" height="'+Math.max(30,yy)+'" rx="5" fill="#101c29"/>'+
   (rows.length||extraRows.length?'<path d="M11 39 H153" stroke="#354b5a" stroke-width=".65"/>':'')+
   rows.join('')+(extraRows.length?'<path d="M11 '+(yy-extraRows.length*20-12)+' H153" stroke="#405563" stroke-width=".8"/>':'')+
   extraRows.join('')+'</g>':'';
  return '<g class="ss-power-grid">'+art+panelSvg+'</g>';
 };
 return Object.freeze({defaults,normalize,reading,resolve,geometry,render,FIELDS,EXTRAS});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioPowerGrid;
