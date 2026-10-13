/* Modern wood / coal boiler adapted from the user's stove SVG v3.
 * Animation uses Warmwasser-style ss-fire and ss-embers keyframes (MIT LICENSE).
 * Pure SVG visualization; no Home Assistant control services.
 */
const HASSStudioSolidFuel=(()=>{
  // Editable artwork: src/icons/solid-fuel-stove.svg
  const clamp=(v,a,b,d)=>Number.isFinite(Number(v))?Math.max(a,Math.min(b,Number(v))):d;
  const safe=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const raw=(h,e)=>e?h?.states?.[e]:null;
  const temperature=(h,e)=>{
    const item=raw(h,e),v=item?.state,u=item?.attributes?.unit_of_measurement;
    if(v==null||String(v).trim()===''||!Number.isFinite(Number(v))||(u&&!['°C','C','°F','F'].includes(u)))return null;
    const t=(u==='°F'||u==='F')?(Number(v)-32)*5/9:Number(v);
    return t>=-40&&t<=150?t:null;
  };
  const resolveState=(node,h)=>{
    if(['burning','embers','off'].includes(node.solid_state))return node.solid_state;
    const entity=raw(h,node.burner_entity);
    if(entity){
      const s=String(entity.state).toLowerCase();
      if(['on','burning','active','running','heating','fire'].includes(s))return 'burning';
      if(['embers','smoldering','cooling','glowing'].includes(s))return 'embers';
      // An explicit off/unknown state is not overridden by a hot water reading.
      return 'off';
    }
    const t=temperature(h,node.entity),upper=clamp(node.burner_on_temp,20,90,35);
    const lower=Math.min(upper-.5,clamp(node.burner_off_temp,10,89,32));
    return t===null?'off':t>=upper?'burning':t>=lower?'embers':'off';
  };
  // Geometry and three nested paths follow the original Warmwasser flame renderer.
  const flame=(x,y,w,ht,speed)=>{
    const d=(r,h)=>'M'+(-r)+' 0C'+(-r-2)+' '+(-h*.45)+' '+(-r*.15)+' '+(-h*.6)+' '+(r*.1)+' '+(-h)+
      'C'+(r*.5)+' '+(-h*.6)+' '+(r+2)+' '+(-h*.4)+' '+r+' 0Z';
    return '<g transform="translate('+x+' '+y+')"><g class="ss-fire" style="animation-duration:'+speed+'s">'+
      '<path d="'+d(w,ht)+'" fill="#e4461f"/><path d="'+d(w*.70,ht*.76)+'" fill="#ff9320"/>'+
      '<path d="'+d(w*.36,ht*.46)+'" fill="#ffdb6a"/></g></g>';
  };
  const wood=live=>'<g class="ss-wood-fuel">'+
    '<rect x="448" y="753" width="118" height="22" rx="8" fill="#402a1e" stroke="'+(live?'#ba5828':'#604431')+'" stroke-width="3" transform="rotate(-10 506 764)"/>'+
    '<path d="M458 771Q502 757 556 758" stroke="#b88752" stroke-width="2" opacity=".65" fill="none"/>'+
    '<rect x="463" y="770" width="112" height="21" rx="9" fill="#503225" stroke="'+(live?'#bf5e30':'#624635')+'" stroke-width="2" transform="rotate(9 518 780)"/>'+
    '<path d="M482 774Q509 784 561 777" stroke="#d39b67" opacity=".46" stroke-width="2" fill="none"/>'+
    '<ellipse cx="472" cy="777" rx="8" ry="10" fill="#8d6341" stroke="#2a1a17" stroke-width="2"/>'+
    '<ellipse cx="472" cy="777" rx="3" ry="5" fill="none" stroke="#432b22" stroke-width="2"/></g>';
  const coal=live=>'<g class="ss-coal-fuel">'+[[443,781],[478,766],[512,781],[546,764]].map(([x,y],i)=>
    '<path d="M'+x+' '+y+'l'+(i%2?10:13)+' -19l18 5l12 15l-6 16l-28 -2Z" fill="#222733" stroke="'+(live?'#d77c3a':'#555d69')+'" stroke-width="2"/>'+
    (live?'<path d="M'+(x+9)+' '+(y-10)+'l8 8l12 -1" stroke="#ff7438" stroke-width="2.2" fill="none"/>':'')).join('')+'</g>';
  const combustion=(fuel,mode,intensity)=>{
    const live=mode!=='off',burn=mode==='burning';
    const flamePaths=!burn?'':fuel==='wood'?
      flame(466,764,16,99,.98)+flame(506,761,20,131,1.13)+flame(550,761,17,109,.86):
      flame(471,767,12,59,1.05)+flame(520,769,13,81,1.22)+flame(552,769,10,61,.97);
    return '<g class="ss-solid-combustion" data-fuel="'+fuel+'" data-state="'+mode+'" clip-path="url(#solidFireClip)">'+
      (live?'<rect x="420" y="586" width="180" height="210" fill="#7d2617" opacity="'+(intensity*.16).toFixed(2)+'"/>':'')+
      flamePaths+(live?'<g class="ss-embers" style="animation-duration:2.1s">'+
      '<ellipse cx="511" cy="780" rx="79" ry="18" fill="#e44725" opacity="'+(.28+intensity*.35).toFixed(2)+'"/>'+
      '<path d="M443 781Q484 789 513 780Q553 784 580 777" fill="none" stroke="#ff9e3c" stroke-width="3" opacity=".85"/></g>':
      '<ellipse cx="511" cy="791" rx="79" ry="10" fill="#aaa2a0" opacity=".18"/>')+
      (fuel==='coal'?coal(live):wood(live))+'</g>';
  };
  const render=(node,h)=>{
    const fuel=node.solid_fuel==='coal'?'coal':'wood',mode=resolveState(node,h);
    const reading=temperature(h,node.entity),t=reading===null?null:clamp(reading,20,95,20);
    const level=t===null?0:(t-20)/75,arc=t===null?0:(52+level*172),hue=120-level*92;
    const intensity=clamp(node.solid_glow,0,100,78)/100;
    const prefix='sssolid'+String(node.id||'').replace(/[^a-z0-9]/gi,'').slice(0,24);
    const svg = HASSStudioSvg.namespaceIds(
      HASSStudioSvg.inject(
        HASSStudioSvg.apply(HASSStudioIconTemplates.solidFuel, {
          tempValue: { text: reading === null ? '—' : reading.toFixed(1) + '°' },
          fuelLabel: { text: fuel === 'wood' ? 'DREWNO' : 'WĘGIEL' },
          dialArc: {
            stroke: reading === null ? '#586779' : 'hsl(' + hue.toFixed(1) + ' 90% 48%)',
            'stroke-dasharray': arc.toFixed(1) + ' 240'
          }
        }),
        { combustionSlot: combustion(fuel, mode, intensity) }
      ),
      prefix
    );
    const sx=clamp(node.width_scale,.5,2.4,1),sy=clamp(node.height_scale,.5,2.4,1);
    // Independent width/height are applied only to this SVG. The outer node's
    // proportional scale still multiplies both axes in the Custom canvas.
    return '<g class="ss-solid-boiler" data-combustion="'+mode+'">'+
      '<g class="ss-solid-boiler-dimensions" transform="translate(66 53) scale('+sx+' '+sy+') translate(-60 -43)">'+
      '<g transform="translate(22 -104) scale(.2 .2) translate(-232 -84)">'+svg+'</g></g></g>';
  };
  const styles='<style>@media(prefers-reduced-motion:reduce){.ss-solid-boiler .ss-fire,.ss-solid-boiler .ss-embers{animation:none!important}}</style>';
  return {render,styles,resolveState,combustion,temperature,flame};
})();
