/* Building load: original, editable house/garage/workshop SVG and HA electrical load. */
const HASSStudioBuilding=(()=>{
 const defaults=()=>({mode:'live',power_entity:'',daily_entity:'',power_kw:2,daily_kwh:0,show_readout:true,readout_scale:1,measurement:'individual',remaining_enabled:false,remaining_kw:0,window_glow:true});
 const clamp=(v,a,b,d)=>v!==''&&v!=null&&Number.isFinite(Number(v))?Math.max(a,Math.min(b,Number(v))):d;
 const entity=v=>typeof v==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(v)?v:'';
 const normalize=n=>{
  const x=n?.building||n||{},d=defaults();
  return {...d,...x,mode:x.mode==='manual'?'manual':'live',power_entity:entity(x.power_entity),
   daily_entity:entity(x.daily_entity),power_kw:clamp(x.power_kw,x.measurement==='net'?-10000:0,10000,2),
   daily_kwh:clamp(x.daily_kwh,0,1000000,0),remaining_enabled:x.remaining_enabled===true,remaining_kw:clamp(x.remaining_kw,0,10000,0),
   readout_scale:HASSStudioReadoutScale.factor(x.readout_scale),
   measurement:['aggregate','net'].includes(x.measurement)?x.measurement:'individual',
   show_readout:x.show_readout!==false,window_glow:x.window_glow!==false};
 };
 // Stage 07A.1-A: pure, read-only power model. No topology or SVG decisions.
 // Inputs are instantaneous AC kW, not kWh. Missing values MUST be null.
 // Existing measurement codes remain stable:
 //   individual = own consumers only; aggregate = gross consumer load;
 //   net = signed power crossing the building boundary (+import / -export).
 // Child aggregates are separate magnitudes: loads (+) and AC sources (+).
 // A caller must pass explicit zeros only when it knows there are no such
 // devices; absence of a sensor or incomplete topology is not zero power.
 const powerSnapshot=(input={})=>{
  const mode=['individual','aggregate','net'].includes(input.measurement)?input.measurement:'individual';
  const scope=mode==='individual'?'own':mode==='aggregate'?'gross':'net';
  const tolerance=typeof input.tolerance_kw==='number'&&Number.isFinite(input.tolerance_kw)&&
    input.tolerance_kw>=0?input.tolerance_kw:0.05;
  const number=x=>x===null||x===undefined?null:
    typeof x==='number'&&Number.isFinite(x)?x:NaN;
  const round=x=>Math.round(x*1e6)/1e6;
  const measured=number(input.measured_kw);
  const childLoad=number(input.children_consumption_kw);
  const childSource=number(input.children_generation_kw);
  const acceptedSources=['measured','simulated','calculated','estimated','mixed'];
  const origin=(value,name,fallback)=>value===null?'missing':
    acceptedSources.includes(input[name])?input[name]:fallback;
  const source=origin(measured,'source','missing');
  const field_sources={
    measured_kw:source,
    children_consumption_kw:origin(childLoad,'children_consumption_source','calculated'),
    children_generation_kw:origin(childSource,'children_generation_source','calculated'),
    own_consumption_kw:'missing',gross_consumption_kw:'missing',net_supply_kw:'missing'
  };
  let own=null,gross=null,net=null;
  const reasons=[];
  if(Number.isNaN(measured)||measured!==null&&mode!=='net'&&measured<0)
    reasons.push('invalid_measurement');
  if(Number.isNaN(childLoad)||childLoad!==null&&childLoad<0)
    reasons.push('invalid_children_consumption');
  if(Number.isNaN(childSource)||childSource!==null&&childSource<0)
    reasons.push('invalid_children_generation');
  // Preserve a valid original readout even if the remaining data contradict it.
  if(!reasons.length&&measured!==null){
    if(mode==='individual'){
      own=measured;field_sources.own_consumption_kw=source;
      if(childLoad!==null){
        gross=round(own+childLoad);field_sources.gross_consumption_kw='calculated';
      }
      if(gross!==null&&childSource!==null){
        net=round(gross-childSource);field_sources.net_supply_kw='calculated';
      }
    }else if(mode==='aggregate'){
      gross=measured;field_sources.gross_consumption_kw=source;
      if(childLoad!==null){
        const remainder=round(gross-childLoad);
        if(remainder< -tolerance)reasons.push('children_exceed_gross');
        else {
          own=Math.max(0,remainder);field_sources.own_consumption_kw='calculated';
        }
      }
      if(childSource!==null){
        net=round(gross-childSource);field_sources.net_supply_kw='calculated';
      }
    }else {
      net=measured;field_sources.net_supply_kw=source;
      if(childSource!==null){
        const consumed=round(net+childSource);
        if(consumed< -tolerance)reasons.push('net_exceeds_known_generation');
        else{
          gross=Math.max(0,consumed);field_sources.gross_consumption_kw='calculated';
        }
      }
      if(gross!==null&&childLoad!==null){
        const remainder=round(gross-childLoad);
        if(remainder< -tolerance)reasons.push('children_exceed_gross');
        else{
          own=Math.max(0,remainder);field_sources.own_consumption_kw='calculated';
        }
      }
    }
  }
  if(reasons.length){
    // Invalid arithmetic must not leak apparently correct derived values.
    own=mode==='individual'&&!Number.isNaN(measured)&&measured!==null&&measured>=0?measured:null;
    gross=mode==='aggregate'&&!Number.isNaN(measured)&&measured!==null&&measured>=0?measured:null;
    net=mode==='net'&&!Number.isNaN(measured)?measured:null;
    for(const k of ['own_consumption_kw','gross_consumption_kw','net_supply_kw'])
      field_sources[k]=k==='own_consumption_kw'&&mode==='individual'&&own!==null?source:
        k==='gross_consumption_kw'&&mode==='aggregate'&&gross!==null?source:
        k==='net_supply_kw'&&mode==='net'&&net!==null?source:'missing';
  }
  const complete=own!==null&&gross!==null&&net!==null&&
    childLoad!==null&&childSource!==null;
  const anyKnown=measured!==null&&!Number.isNaN(measured)||
    childLoad!==null&&!Number.isNaN(childLoad)||
    childSource!==null&&!Number.isNaN(childSource);
  const status=reasons.length?'invalid':complete?'complete':anyKnown?'partial':'missing';
  return Object.freeze({
    measurement:mode,measurement_scope:scope,
    measured_kw:Number.isNaN(measured)?null:measured,
    own_consumption_kw:own,
    children_consumption_kw:Number.isNaN(childLoad)?null:childLoad,
    children_generation_kw:Number.isNaN(childSource)?null:childSource,
    gross_consumption_kw:gross,net_supply_kw:net,
    source,status,reasons:Object.freeze(reasons),
    field_sources:Object.freeze(field_sources)
  });
 };
 // Preserve the effective manual value of legacy individual/remaining meters.
 const manualPower=c=>c.measurement==='individual'&&c.remaining_enabled?c.remaining_kw:c.power_kw;
 const setManualPower=(node,value)=>{
  const c=node.building||(node.building=defaults()),old=normalize(node);
  const key=old.measurement==='individual'&&old.remaining_enabled?'remaining_kw':'power_kw';
  c[key]=clamp(value,old.measurement==='net'?-10000:0,10000,0);
  return c[key];
 };
 // Per-building, explicit migration only; never rewrite older meters on load.
 const convertToAggregate=node=>{
  if(node?.type!=='building')return false;
  const current=normalize(node);
  if(current.measurement!=='individual')return false;
  const previous=node.building&&typeof node.building==='object'?node.building:{};
  node.building={...previous,measurement:'aggregate',
   power_kw:manualPower(current),remaining_enabled:false};
  return true;
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
    manualPower(c),c.mode).kw;
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
 return Object.freeze({defaults,normalize,powerSnapshot,manualPower,setManualPower,convertToAggregate,data,geometry,render});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioBuilding;