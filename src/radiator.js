/* Radiator renderer: user-supplied SVG, HA sensors, independent proportional screen scale. */
const HASSStudioRadiator=(()=>{
 const clamp=(v,a,z,d)=>v!==''&&v!=null&&Number.isFinite(Number(v))?Math.max(a,Math.min(z,Number(v))):d;
 const defaults=()=>({display:true,display_scale:1,mode:'live',temperature_entity:'',valve_entity:'',manual_temperature:55,manual_open:42,glow:62});
 const normalize=node=>{
  const o=node?.radiator||{},d=defaults();
  return {...d,...o,display:o.display!==false,display_scale:HASSStudioReadoutScale.factor(o.display_scale),
   mode:o.mode==='manual'?'manual':'live',temperature_entity:typeof o.temperature_entity==='string'?o.temperature_entity:'',
   valve_entity:typeof o.valve_entity==='string'?o.valve_entity:'',
   manual_temperature:clamp(o.manual_temperature,-40,150,55),manual_open:clamp(o.manual_open,0,100,42),
   glow:clamp(o.glow,0,100,62)};
 };
 const data=(node,hass)=>{
  const c=normalize(node);
  const temp=c.mode==='manual'?c.manual_temperature:HASSStudioHA.temperature(hass,c.temperature_entity);
  const open=c.mode==='manual'?c.manual_open:HASSStudioHA.percentage(hass,c.valve_entity);
  return {c,temp,open};
 };
 const valveStatus=open=>open===null?{label:'—',color:'#a7bbc8'}:
    open<5?{label:'CLOSE',color:'#ff5d59'}:{label:'OPEN',color:'#76ddff'};
 const geometry=node=>{
  const c=normalize(node),body={x:0,y:0,width:176,height:132};
  return {...body,centerX:88,labelY:146,readingY:162};
 };
 const render=(node,hass)=>{
  const {c,temp,open}=data(node,hass);
  const tpl=typeof HASSStudioIconTemplates!=='undefined'?HASSStudioIconTemplates.radiator:null;
  if(!tpl)return '<rect width="176" height="132" rx="10" fill="#9fb7c7"/>';
  let svg=tpl;
  const replacements={tempText:temp===null?'—':Math.round(temp)+'°',
    openText:open===null?'—':Math.round(open)+'%'};
  svg=svg.replace(/(<text\b[^>]*\bid="(tempText|openText)"[^>]*>)([^<]*)(<\/text>)/g,
    (_,a,id,old,z)=>a+replacements[id]+z);
  const status=valveStatus(open);
  svg=svg.replace(/(<text\b[^>]*\bid="valveStatus"[^>]*>)[^<]*(<\/text>)/,
    (_,head,tail)=>head.replace(/fill="[^"]+"/,'fill="'+status.color+'"')+status.label+tail);
  for(let index=1;index<=4;index++){
    const enabled=open!==null&&open>=[5,25,50,75][index-1];
    const pattern=new RegExp('(<rect\\b[^>]*\\bid="bar'+index+'"[^>]*)(\\/>)');
    svg=svg.replace(pattern,(_,head,tail)=>
      head.replace(/\sopacity="[^"]*"/,'')+' opacity="'+(enabled?'1':'.16')+'"'+tail);
  }
  // Remove duplicated captions, retaining the original design's ring readings.
  svg=svg.replace(/(<text\b[^>]*x="1040"[^>]*>[\s\S]*?<\/text>)/g,'');
  svg=svg.replace(/(<text\b[^>]*\bid="(?:tempLarge|openLarge)"[^>]*>[\s\S]*?<\/text>)/g,'');
  const screenScale=c.display_scale,screenPivotX=960,screenPivotY=355;
  // Apply to the entire display assembly, not just its border: text/ring/bars scale together.
  svg=svg.replace('<g id="displayGroup">','<g id="displayGroup" transform="'+
    HASSStudioReadoutScale.around(screenPivotX,screenPivotY,screenScale)+'"'+(c.display?'':' visibility="hidden"')+'>');
  svg=svg.replace('<g id="displayMountGroup">','<g id="displayMountGroup"'+(c.display?'':' visibility="hidden"')+'>');
  // Hide unknown readings and keep SVG fully read-only.
  const prefix='ssradiator'+String(node?.id||'preview').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,24)+'-';
  return '<svg x="0" y="0" width="176" height="132" viewBox="120 110 1230 840" preserveAspectRatio="xMidYMid meet">'+
    HASSStudioSvg.namespaceIds(svg,prefix)+'</svg>';
 };
 return Object.freeze({defaults,normalize,data,valveStatus,geometry,render});
})();
