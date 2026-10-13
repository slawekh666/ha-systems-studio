/* Modern fireplace: SVG from uploaded kominek_svg_js.html.
 * Fire and ember motion use original Warmwasser animation classes.
 * Read-only HA temperature and combustion-state visualization.
 */
const HASSStudioFireplace=(()=>{
  // Editable artwork: src/icons/fireplace.svg
  const clamp=(v,min,max,d)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):d;
  const geometry=n=>{
    const sx=clamp(n?.width_scale,.5,2.4,1),sy=clamp(n?.height_scale,.5,2.4,1);
    const cx=80,cy=57;
    return {x:cx+(39-cx)*sx,y:cy+(-105-cy)*sy,width:82*sx,height:315*sy,
      centerX:cx,centerY:cy,labelY:cy+(230-cy)*sy,readingY:cy+(244-cy)*sy,sx,sy};
  };
  const logs=(active)=>'<g class="ss-fireplace-wood">'+
    '<rect x="447" y="790" width="282" height="33" rx="13" fill="#38261e" stroke="'+(active?'#d67e3b':'#7b4e31')+'" stroke-width="7" transform="rotate(-11 588 806)"/>'+
    '<rect x="476" y="810" width="263" height="28" rx="12" fill="#463022" stroke="#a56e46" stroke-width="5" transform="rotate(10 610 824)"/>'+
    '<path d="M464 815Q544 789 703 801" fill="none" stroke="#c48d5e" opacity=".48" stroke-width="4"/></g>';
  const combustion=(mode,glow)=>{
    const live=mode!=='off',burning=mode==='burning';
    const f=HASSStudioSolidFuel.flame;
    const fire=burning?f(484,806,43,175,.98)+f(593,814,56,259,1.12)+f(716,814,44,198,.85):'';
    const embers=live?'<g class="ss-embers" style="animation-duration:2s">'+
      '<ellipse cx="600" cy="823" rx="164" ry="22" fill="#ed4d22" opacity="'+(.3+.35*glow).toFixed(2)+'"/>'+
      '<path d="M447 821Q516 835 592 822Q673 814 753 823" stroke="#ffbc55" stroke-width="7" fill="none"/></g>':
      '<ellipse cx="600" cy="831" rx="150" ry="13" fill="#aaa" opacity=".09"/>';
    return '<g class="ss-fireplace-combustion" data-state="'+mode+'" clip-path="url(#fireClip)">'+
      (live?'<rect x="400" y="448" width="400" height="420" fill="#ad3014" opacity="'+(.05+.13*glow).toFixed(2)+'"/>':'')+
      fire+embers+logs(live)+'</g>';
  };
  const render=(node,h)=>{
    const mode=HASSStudioSolidFuel.resolveState(node,h);
    const temp=HASSStudioSolidFuel.temperature(h,node.entity);
    const glow=clamp(node.solid_glow,0,100,62)/100;
    const bars=temp===null?0:Math.min(3,Math.max(0,Math.ceil((temp-20)/30)));
    const glowOpacity=(.10+.35*glow).toFixed(2);
    const id='ssfireplace'+String(node.id||'').replace(/[^a-z0-9_-]/gi,'').slice(0,24);
    const barBindings = {};
    for (let level = 1; level <= 3; level++) {
      barBindings['displayBar' + level] = { opacity: level <= bars ? '1' : '.22' };
    }
    const svg = HASSStudioSvg.namespaceIds(
      HASSStudioSvg.inject(
        HASSStudioSvg.apply(HASSStudioIconTemplates.fireplace, {
          stoveTempDisplay: { text: temp === null ? '—' : temp.toFixed(1) + '°C' },
          ...barBindings
        }), { combustionSlot: combustion(mode, glow) }
      ), id
    );
    const bounds=geometry(node);
    return '<g class="ss-modern-fireplace" data-combustion="'+mode+'">'+
      '<g class="ss-fireplace-dimensions" transform="translate(80 57) scale('+bounds.sx+' '+bounds.sy+') translate(-120 -30)">'+
      '<g transform="translate(0 -115) scale(.2 .2)">'+svg+'</g></g></g>';
  };
  const styles='<style>@media(prefers-reduced-motion:reduce){.ss-modern-fireplace .ss-fire,.ss-modern-fireplace .ss-embers{animation:none!important}}</style>';
  return {render,styles,combustion,geometry};
})();
