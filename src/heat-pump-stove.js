/* Modern heat pump: read-only SVG model adapted from uploaded pompa_ciepla_svg_js.html.
 * Inputs: electrical power entity (W / kW); fan entity (% / rpm).
 * No polling, external assets, HA service calls, setInterval or requestAnimationFrame.
 */
const HASSStudioHeatPump = (()=>{
  // Source artwork: src/icons/heat-pump-stove.svg
  const clamp=(v,lo,hi,fallback)=>Number.isFinite(Number(v))?Math.max(lo,Math.min(hi,Number(v))):fallback;
  const finiteReading=(h,id)=>{
    const item=id&&h?.states?.[id];
    if(!item || typeof item.state!=='string'&&typeof item.state!=='number')return null;
    const value=String(item.state).trim();
    if(!value||!Number.isFinite(Number(value)))return null;
    return {value:Number(value),unit:String(item.attributes?.unit_of_measurement||'').trim()};
  };
  const power=(h,id)=>{
    const reading=finiteReading(h,id);
    if(!reading||reading.value<0)return null;
    let kw;
    if(reading.unit==='W')kw=reading.value/1000;
    else if(reading.unit==='kW')kw=reading.value;
    else return null; // Do not silently interpret energy (kWh), current (A) or unlabeled values.
    return Number.isFinite(kw)?kw:null;
  };
  const fan=(h,id,maxRpm=1800)=>{
    const reading=finiteReading(h,id);
    if(!reading||reading.value<0)return null;
    if(reading.unit==='%'||reading.unit==='percent'){
      const pct=clamp(reading.value,0,100,0);
      return {percent:pct,label:Math.round(pct)+'%',unit:'%'};
    }
    if(reading.unit.toLowerCase()==='rpm'||reading.unit==='obr/min'){
      const max=clamp(maxRpm,100,20000,1800);
      return {percent:clamp(reading.value/max*100,0,100,0),label:Math.round(reading.value)+' RPM',unit:'rpm'};
    }
    return null;
  };
  const geometry=(n)=>{
    const sx=clamp(n?.width_scale,.5,2.4,1),sy=clamp(n?.height_scale,.5,2.4,1);
    // Body (not invisible SVG canvas) from input source: x=86..1168, y=152..910.
    const base={x:21.76,y:-50.68,width:173.12,height:121.28,labelY:91.5};
    const cx=108.32,cy=9.96;
    return {x:cx+(base.x-cx)*sx,y:cy+(base.y-cy)*sy,
      width:base.width*sx,height:base.height*sy,
      labelY:cy+(base.labelY-cy)*sy,centerX:cx,centerY:cy,sx,sy};
  };
  const render=(node,hass)=>{
    const kw=power(hass,node.hp_power_entity);
    const speed=fan(hass,node.hp_fan_entity,node.hp_max_rpm);
    const pct=speed?.percent??0, powered=pct>0;
    const kwLabel=kw===null?'—':(kw>=10?kw.toFixed(1):kw.toFixed(2))+' kW';
    const percentLabel=speed===null?'—':speed.label;
    // CSS is driven only by the current sensor state; no hidden perpetual animation loop.
    const duration=(18-16.7*Math.sqrt(pct/100)).toFixed(2)+'s';
    const rotorStyle=powered?'animation-duration:'+duration+';':'animation:none;';
    const intensity=clamp(node.hp_glow,0,100,65)/100;
    const glow=(powered?.08+intensity*.26:.06).toFixed(2);
    const aura=(powered?.08+intensity*.18:.05).toFixed(2);
    const sx=geometry(node).sx,sy=geometry(node).sy;
    // The prefix prevents collisions between multiple SVG instances on a single HA dashboard.
    const prefix='sshp'+String(node.id||'heatpump').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,28);
    const image = HASSStudioSvg.namespaceIds(
      HASSStudioSvg.apply(HASSStudioIconTemplates.heatPump, {
        hpAuraOutline: { 'stroke-opacity': aura },
        fanGlowRing: { 'stroke-opacity': glow },
        bladeRotor: { class: powered ? 'ss-hp-rotating' : 'ss-hp-still', style: rotorStyle },
        powerValueDisplay: { text: kwLabel },
        fanSpeedDisplay: { text: percentLabel },
        fanSpeedBar: { width: (206 * pct / 100).toFixed(1) }
      }), prefix
    );
    return '<g class="ss-modern-heat-pump" data-fan="'+(speed===null?'unknown':pct.toFixed(1))+'" data-power="'+(kw===null?'unknown':kw.toFixed(2))+'">'+
      '<g class="ss-hp-dimensions" transform="translate(108.32 9.96) scale('+sx+' '+sy+') translate(-108.32 -9.96)">'+
      '<g transform="translate(45 -45) scale(.1 .1)">'+image+'</g></g></g>';
  };
  const styles='<style>'+
    '@keyframes ssHPSpin{to{transform:rotate(360deg)}}'+
    '.ss-hp-rotating{animation-name:ssHPSpin;animation-timing-function:linear;animation-iteration-count:infinite;transform-box:fill-box;transform-origin:center}'+
    '@media(prefers-reduced-motion:reduce){.ss-modern-heat-pump .ss-hp-rotating{animation:none!important}}'+
    '</style>';
  return {render,styles,geometry,power,fan};
})();
