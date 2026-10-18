/* Modern pellet stove: equipment artwork from the user's piec_pellet_svg_js_v1.
 * Combustion states, flames and CSS animations reuse Warmwasser via SolidFuel.
 * Read-only SVG rendering: no Home Assistant service calls.
 */
const HASSStudioPellet = (() => {
  // Source artwork: src/icons/pellet-stove.svg
  const clamp=(v,min,max,def)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):def;
  const escapeHtml=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const baseBounds={x:8,y:-87,width:211,height:230,labelY:161,centerX:113,centerY:46};
  const geometry=n=>{
    const sx=clamp(n?.width_scale,.5,2.4,1),sy=clamp(n?.height_scale,.5,2.4,1);
    return {x:97+(baseBounds.x-97)*sx,y:46+(baseBounds.y-46)*sy,
      width:baseBounds.width*sx,height:baseBounds.height*sy,
      labelY:46+(baseBounds.labelY-46)*sy,centerX:97+(baseBounds.centerX-97)*sx,
      centerY:46,sx,sy};
  };
  const pellets=(live,glow)=>'<g class="ss-pellet-fuel">'+
    Array.from({length:22},(_,i)=>{
      const x=268+(i%11)*12,y=743+Math.floor(i/11)*8+(i%3)*1.5;
      return '<rect x="'+x+'" y="'+y+'" width="9" height="5" rx="2.1" transform="rotate('+(i%3===0?-17:i%3===1?12:3)+' '+(x+4)+' '+(y+2)+')" fill="'+
        (live?(i%4===0?'#ed8e45':'#b67d4e'):'#74614a')+'" stroke="'+(live?'#7f3b20':'#433a31')+'" stroke-width=".7"/>';
    }).join('')+'</g>';
  const combustion=(mode,glow)=>{
    const active=mode!=='off',burning=mode==='burning';
    const f=HASSStudioSolidFuel.flame;
    // The original Warmwasser flame layers and flicker are scaled for a pellet burner.
    const fire=burning?f(294,750,13,67,.9)+f(335,751,16,92,1.13)+f(378,749,13,75,.83):'';
    const embers=active?'<g class="ss-embers" style="animation-duration:2s">'+
      '<ellipse cx="336" cy="752" rx="75" ry="14" fill="#e9481f" opacity="'+(.27+.39*glow).toFixed(2)+'"/>'+
      '<path d="M267 750Q294 746 326 753Q370 747 404 750" fill="none" stroke="#ffaf49" stroke-width="2.8" opacity=".85"/></g>':
      '<ellipse cx="336" cy="756" rx="69" ry="8" fill="#7d7e82" opacity=".17"/>';
    return '<g class="ss-pellet-combustion" data-state="'+mode+'" clip-path="url(#pelletBurnerClip)">'+
      (active?'<rect x="244" y="562" width="184" height="236" fill="#a53a18" opacity="'+(.08+glow*.16).toFixed(2)+'"/>':'')+
      fire+embers+pellets(active,glow)+'</g>';
  };
  const powerReading=(h,id)=>{
    const r=HASSStudioHA.reading(h,id);
    if(!r||r.value<0)return null;
    if(['%','percent'].includes(r.unit)||(!r.unit&&r.value<=100))
      return r.value<=100?{value:r.value,unit:'%'}:null;
    if(r.unit==='W'&&r.value<=500000)return {value:r.value/1000,unit:'kW'};
    if(r.unit==='kW'&&r.value<=500)return {value:r.value,unit:'kW'};
    return null;
  };
  const stateReading=(h,id)=>{
    if(!id)return null;
    const value=String(HASSStudioHA.entity(h,id)?.state??'').trim().toLowerCase();
    if(['on','burning','active','running','heating','fire','true','1'].includes(value))return 'burning';
    if(['ignition','starting','igniting','lighting'].includes(value))return 'ignition';
    if(['embers','smoldering','cooling','glowing','stopping'].includes(value))return 'embers';
    if(['off','idle','standby','stopped','false','0'].includes(value))return 'off';
    return null;
  };
  const booleanReading=(h,id)=>{
    if(!id)return null;
    const value=String(HASSStudioHA.entity(h,id)?.state??'').trim().toLowerCase();
    if(['on','true','1','active','running','open','alarm','fault','error','critical'].includes(value))return true;
    if(['off','false','0','inactive','closed','idle','normal','ok','clear'].includes(value))return false;
    return null;
  };
  const readings=(node,hass)=>{
    const test=node.pellet_test_mode===true;
    const temp=test?clamp(node.pellet_manual_temperature,-40,150,65):
      HASSStudioSolidFuel.temperature(hass,node.entity);
    const unit=node.pellet_manual_power_unit==='kW'?'kW':'%';
    const power=test?{value:clamp(node.pellet_manual_power,0,unit==='%'?100:500,65),unit}:
      powerReading(hass,node.pellet_burner_power_entity);
    const measured=test?null:stateReading(hass,node.burner_entity);
    const forced=!test&&['burning','embers','off'].includes(node.solid_state)?node.solid_state:null;
    let state;
    if(test)state=['off','ignition','burning','embers'].includes(node.pellet_manual_state)?
      node.pellet_manual_state:'burning';
    else if(forced)state=forced;
    else if(measured)state=measured;
    else if(power)state=power.value>0?'burning':'off';
    else if(node.burner_entity||node.pellet_burner_power_entity)state='off';
    else state=HASSStudioSolidFuel.resolveState(node,hass); // Legacy visual fallback only.
    const known=test||!!forced||!!measured||power!==null;
    const alarm=test?node.pellet_manual_alarm===true:booleanReading(hass,node.pellet_alarm_entity)===true;
    const feeder=test?node.pellet_manual_feeder===true:booleanReading(hass,node.pellet_feeder_entity);
    const manualLevel=test||node.pellet_level_manual===true;
    const level=manualLevel?clamp(node.pellet_level_test,0,100,80):
      HASSStudioHA.percentage(hass,node.pellet_level_entity);
    const unassigned=!manualLevel&&!node.pellet_level_entity;
    return {test,temp,power,state,known,alarm,feeder,level,unassigned};
  };
  const burnerLabel=r=>{
    if(r.alarm)return 'ALARM';
    if(!r.known)return 'PALNIK —';
    if(r.state==='ignition')return 'ROZPALANIE';
    if(r.state==='embers')return 'WYGASZANIE';
    if(r.state==='off')return r.power?'STOP  0'+r.power.unit:'STOP';
    if(!r.power)return 'PRACA';
    const n=r.power.unit==='%'?String(Math.round(r.power.value)):
      r.power.value>=10?r.power.value.toFixed(1):r.power.value.toFixed(2);
    return 'PRACA '+n+r.power.unit;
  };
  const render=(node,hass)=>{
    const r=readings(node,hass),actual=r.temp;
    const t=actual===null?null:clamp(actual,20,90,20),amount=t===null?0:(t-20)/70;
    const arc=t===null?0:46+amount*118,hue=118-amount*95;
    const glow=clamp(node.solid_glow,0,100,76)/100;
    const prefix='sspellet'+String(node.id||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,24);
    const known=r.level!==null&&Number.isFinite(r.level);
    const low=known&&r.level<=clamp(node.pellet_alarm_pct,0,100,20);
    const bindings={'pellet-level-warning':{visibility:low?'visible':'hidden'}};
    for(let i=1;i<=5;i++){
      const on=known&&r.level>=[18,38,58,78,98][i-1];
      bindings['pellet-level-'+i]={opacity:r.unassigned?'.85':known?'1':'.35',
        fill:r.unassigned?'#4a86a8':!known?'#65727c':
          on?(low?'#ed4d47':r.level<=40?'#efa647':r.level<=60?'#e8cf50':'#42db8a'):'#46535d'};
    }
    const color=r.alarm?'#ff9a58':!r.known?'#9edbff':r.state==='burning'?'#7ce2aa':r.state==='off'?'#a4c3d8':'#e9c476';
    const led=r.alarm?'#ff8e41':!r.known?'#4a93bb':r.state==='burning'?'#44da94':r.state==='off'?'#678598':'#e6b751';
    const feed=r.feeder===true?'#5ae6ab':r.feeder===false?'#516477':'#4c82a5';
    const image=HASSStudioSvg.namespaceIds(
      HASSStudioSvg.inject(
        HASSStudioSvg.apply(HASSStudioIconTemplates.pellet,{
          tempValue:{text:actual===null?'—':actual.toFixed(1)+'°'},
          pelletTestIndicator:{visibility:r.test?'visible':'hidden'},
          burnerStatusText:{text:burnerLabel(r),fill:color,
            'data-more':!r.test&&node.burner_entity?node.burner_entity:''},
          burnerStatusLed:{fill:led},pelletFeedLed:{fill:feed},
          ...bindings,
          statusArc:{stroke:t===null?'#60b5da':'hsl('+hue.toFixed(1)+' 88% 48%)',
            'stroke-dasharray':arc.toFixed(1)+' 176'}
        }),{combustionSlot:combustion(r.state,glow)}
      ),prefix
    );
    const {sx,sy}=geometry(node);
    return '<g class="ss-modern-pellet" data-combustion="'+r.state+'" data-source="'+(r.test?'test':'ha')+'">'+
      '<g class="ss-pellet-dimensions" transform="translate(97 46) scale('+sx+' '+sy+') translate(-97 -46)">'+
      '<g transform="translate(12 -84) scale(.2 .2) translate(-84 -82)">'+image+'</g></g></g>';
  };
  const styles='<style>@media(prefers-reduced-motion:reduce){.ss-modern-pellet .ss-fire,.ss-modern-pellet .ss-embers{animation:none!important}}</style>';
  return {render,styles,geometry,combustion,readings,powerReading,stateReading,booleanReading,burnerLabel};
})();
