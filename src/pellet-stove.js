/* Modern pellet stove: equipment artwork from the user's piec_pellet_svg_js_v1.
 * Combustion states, flames and CSS animations reuse Warmwasser via SolidFuel.
 * Read-only SVG rendering: no Home Assistant service calls.
 */
const HASSStudioPellet = (() => {
  // Source artwork: src/icons/pellet-stove.svg
  const clamp=(v,min,max,def)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):def;
  const escapeHtml=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const baseBounds={x:4,y:-110,width:186,height:312,labelY:220,centerX:97,centerY:46};
  const geometry=n=>{
    const sx=clamp(n?.width_scale,.5,2.4,1),sy=clamp(n?.height_scale,.5,2.4,1);
    return {x:baseBounds.centerX+(baseBounds.x-baseBounds.centerX)*sx,
      y:baseBounds.centerY+(baseBounds.y-baseBounds.centerY)*sy,
      width:baseBounds.width*sx,height:baseBounds.height*sy,
      labelY:baseBounds.centerY+(baseBounds.labelY-baseBounds.centerY)*sy,
      centerX:baseBounds.centerX,centerY:baseBounds.centerY,
      sx,sy};
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
  const render=(node,hass)=>{
    const mode=HASSStudioSolidFuel.resolveState(node,hass);
    const actual=HASSStudioSolidFuel.temperature(hass,node.entity);
    const t=actual===null?null:clamp(actual,20,90,20),amount=t===null?0:(t-20)/70;
    const arc=t===null?0:(46+amount*118),hue=118-amount*95;
    const glow=clamp(node.solid_glow,0,100,76)/100;
    const prefix='sspellet'+String(node.id||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,24);
    const image = HASSStudioSvg.namespaceIds(
      HASSStudioSvg.inject(
        HASSStudioSvg.apply(HASSStudioIconTemplates.pellet, {
          tempValue: { text: actual === null ? '—' : actual.toFixed(1) + '°' },
          statusArc: {
            stroke: actual === null ? '#586779' : 'hsl(' + hue.toFixed(1) + ' 88% 48%)',
            'stroke-dasharray': arc.toFixed(1) + ' 176'
          }
        }), { combustionSlot: combustion(mode, glow) }
      ), prefix
    );
    const {sx,sy}=geometry(node);
    return '<g class="ss-modern-pellet" data-combustion="'+mode+'">'+
      '<g class="ss-pellet-dimensions" transform="translate(97 46) scale('+sx+' '+sy+') translate(-97 -46)">'+
      '<g transform="translate(12 -84) scale(.2 .2) translate(-84 -82)">'+image+'</g></g></g>';
  };
  const styles='<style>@media(prefers-reduced-motion:reduce){.ss-modern-pellet .ss-fire,.ss-modern-pellet .ss-embers{animation:none!important}}</style>';
  return {render,styles,geometry,combustion};
})();
