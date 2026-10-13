/* Modern gas boiler using the SVG supplied in piec_gazowy_svg_js(1).html.
 * Read-only HA view: measured temperature and gas burner modulation (%).
 * No background timer, HA service action or speculative gas consumption values.
 */
const HASSStudioGasBoiler=(()=>{
  // Geometry is edited in src/icons/gas-boiler.svg; values are supplied by HA.

  const clamp=(v,min,max,def)=>typeof v!=='boolean'&&v!=null&&v!==''&&Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):def;
  const reading=HASSStudioHA.reading;
  const temperature=HASSStudioHA.temperature;
  const modulation=(h,e)=>HASSStudioHA.percentage(h,e,true);
  const burnerEnabled=(h,e)=>!e||HASSStudioHA.active(h,e,['burning']);
  const geometry=n=>{
    const sx=clamp(n?.width_scale,.5,2.4,1),sy=clamp(n?.height_scale,.5,2.4,1);
    const cx=66,cy=56;
    return {x:cx+(12-cx)*sx,y:cy+(-106-cy)*sy,
      width:110*sx,height:326*sy,
      labelY:cy+(238-cy)*sy,readingY:cy+(250-cy)*sy,centerX:cx,centerY:cy,sx,sy};
  };
  const render=(node,hass)=>{
    const t=temperature(hass,node.entity);
    const measured=modulation(hass,node.gas_draw_entity);
    const percent=burnerEnabled(hass,node.burner_entity)?measured===null?0:measured:0;
    const active=percent>0;
    const fraction=Math.sqrt(percent/100);
    const scale=(60/126*fraction);
    // Original flame bounds are approximately x=575..620, y=1028..1154.
    // Anchor its lower centre to x575,y1132, as in the uploaded HTML.
    const flameTransform='translate(575 1132) scale('+scale.toFixed(4)+') translate(-596 -1154)';
    const intensity=clamp(node.gas_glow,0,100,62)/100;
    const visualStrength=active?.2+.8*fraction:0;
    const frontGlow=(.08+.5*intensity*visualStrength).toFixed(2);
    const frontOpacity=(active?.55+.45*fraction:.20).toFixed(2);
    const gasGlow=(active?.06+.3*fraction+.10*intensity:0).toFixed(2);
    const aura=(active?.04+.22*intensity*visualStrength:.015).toFixed(3);
    const namespace='ssgas'+String(node.id||'gas').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,28);
    const bindings = {
      gasAuraOutline: { 'stroke-opacity': aura },
      frontIcon: { opacity: frontOpacity },
      frontIconGlow: { opacity: frontGlow },
      displayFlameGroup: {
        transform: flameTransform,
        opacity: active ? '1' : '0'
      },
      displayFlameGlow: { opacity: gasGlow },
      tempValueDisplay: { text: t === null ? '—' : t.toFixed(1) + '°' }
    };
    for (let level = 1; level <= 4; level++) {
      bindings['barLevel' + level] = {
        opacity: active && percent > (level - 1) * 25 ? '1' : '0.16'
      };
    }
    const image = HASSStudioSvg.namespaceIds(
      HASSStudioSvg.apply(HASSStudioIconTemplates.gasBoiler, bindings),
      namespace
    );
    const {sx,sy}=geometry(node);
    return '<g class="ss-modern-gas-boiler" data-modulation="'+(measured===null?'unknown':measured.toFixed(1))+
      '" data-burning="'+(active?'on':'off')+'">'+
      '<g class="ss-gas-dimensions" transform="translate(66 56) scale('+sx+' '+sy+') translate(-66 -56)">'+
      '<g transform="translate(14 -104) scale(.2 .2) translate(-164 -28)">'+image+'</g></g></g>';
  };
  const styles='';
  return {render,styles,temperature,modulation,burnerEnabled,geometry};
})();
