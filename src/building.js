/* Building load: original, editable house/garage/workshop SVG and HA electrical load. */
const HASSStudioBuilding=(()=>{
 const defaults=()=>({mode:'live',power_entity:'',daily_entity:'',power_kw:2,daily_kwh:0,show_readout:true,readout_scale:1,measurement:'individual',remaining_enabled:false,remaining_kw:0,window_glow:true});
 const clamp=(v,a,b,d)=>v!==''&&v!=null&&Number.isFinite(Number(v))?Math.max(a,Math.min(b,Number(v))):d;
 const entity=v=>typeof v==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(v)?v:'';
 const normalize=n=>{
  const x=n?.building||n||{},d=defaults();
  return {...d,...x,mode:x.mode==='manual'?'manual':'live',power_entity:entity(x.power_entity),
   daily_entity:entity(x.daily_entity),power_kw:clamp(x.power_kw,0,10000,2),
   daily_kwh:clamp(x.daily_kwh,0,1000000,0),remaining_enabled:x.remaining_enabled===true,remaining_kw:clamp(x.remaining_kw,0,10000,0),
   readout_scale:HASSStudioReadoutScale.factor(x.readout_scale),
   measurement:x.measurement==='aggregate'?'aggregate':'individual',
   show_readout:x.show_readout!==false,window_glow:x.window_glow!==false};
 };
 const numeric=(h,id,kind)=>{
  const x=HASSStudioHA.reading(h,id);
  if(!x||x.value<0)return null;
  if(kind==='power')return x.unit==='W'?x.value/1000:x.unit==='kW'?x.value:null;
  return x.unit==='Wh'?x.value/1000:x.unit==='kWh'?x.value:x.unit==='MWh'?x.value*1000:null;
 };
 const data=(node,h)=>{
  const c=normalize(node);
  const power=HASSStudioHA.powerInput(node,h,c.power_entity,
    c.measurement==='individual'&&c.remaining_enabled?c.remaining_kw:c.power_kw,c.mode).kw;
  const daily=c.mode==='manual'?c.daily_kwh:numeric(h,c.daily_entity,'energy');
  return {c,power,daily,measurement:c.measurement};
 };
 const geometry=()=>({x:0,y:0,width:150,height:150,centerX:75,labelY:163,readingY:177});
 const render=(node,h)=>{
  const type=['house','garage','workshop'].includes(node?.variant)?node.variant:'house',d=data(node,h);
  const template=typeof HASSStudioIconTemplates==='undefined'?null:HASSStudioIconTemplates['building'+type[0].toUpperCase()+type.slice(1)];
  if(!template)return '<rect width="150" height="150" fill="#6a86a6"/>';
  let graphic=template;
  if(!d.c.window_glow||d.power===null||d.power===0){
    if(type==='house')graphic=graphic.replace('<g id="home-light">','<g id="home-light" opacity=".10">');
  }
  const text=x=>String(x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
  const label=d.power===null?'—':d.power.toFixed(d.power<10?2:1)+' kW';
  const daily=d.daily===null?'':'<text x="150" y="278" text-anchor="middle" font-size="15" fill="#9ecfe9">'+text(d.daily.toFixed(1)+' kWh / dzień')+'</text>';
  const box=d.c.show_readout?'<g id="building-readout" transform="translate(150 262) scale('+d.c.readout_scale+') translate(-150 -262)">'+
   '<rect x="104" y="248" width="92" height="24" rx="9" fill="#0b2136" stroke="#72b7da" opacity=".92"/>'+
   '<text x="150" y="264" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" fill="#cbf8ff" font-weight="bold">'+text(label)+'</text>'+daily+'</g>':'';
  const prefix='ssbuilding'+String(node?.id||'preview').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,24)+'-';
  graphic=HASSStudioSvg.namespaceIds(graphic+box,prefix);
  return '<svg width="150" height="150" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">'+graphic+'</svg>';
 };
 return Object.freeze({defaults,normalize,data,geometry,render});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioBuilding;