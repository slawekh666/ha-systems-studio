/* Modern heat pump: read-only SVG model adapted from uploaded pompa_ciepla_svg_js.html.
 * Inputs: electrical power entity (W / kW); fan entity (% / rpm).
 * No polling, external assets, HA service calls, setInterval or requestAnimationFrame.
 */
const HASSStudioHeatPump = (()=>{
  const SVG_TEMPLATE="\n      <defs>\n        <linearGradient id=\"bodyGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#dde5ef\"/>\n          <stop offset=\".14\" stop-color=\"#fbfdff\"/>\n          <stop offset=\".48\" stop-color=\"#c2ccda\"/>\n          <stop offset=\".78\" stop-color=\"#a7b3c4\"/>\n          <stop offset=\"1\" stop-color=\"#8f9cae\"/>\n        </linearGradient>\n        <linearGradient id=\"bodySideGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#eef4fb\"/>\n          <stop offset=\"1\" stop-color=\"#b5c1d1\"/>\n        </linearGradient>\n        <linearGradient id=\"darkPanel\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#0e1c2e\"/>\n          <stop offset=\"1\" stop-color=\"#02070f\"/>\n        </linearGradient>\n        <linearGradient id=\"blueFanGlow\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#23a8ff\"/>\n          <stop offset=\"1\" stop-color=\"#0069ff\"/>\n        </linearGradient>\n        <linearGradient id=\"bladeGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#143962\"/>\n          <stop offset=\".5\" stop-color=\"#07101b\"/>\n          <stop offset=\"1\" stop-color=\"#0f2c4d\"/>\n        </linearGradient>\n        <linearGradient id=\"footGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#1d2837\"/>\n          <stop offset=\".5\" stop-color=\"#5c6f8a\"/>\n          <stop offset=\"1\" stop-color=\"#1b2635\"/>\n        </linearGradient>\n        <radialGradient id=\"fanAura\" cx=\"50%\" cy=\"50%\" r=\"50%\">\n          <stop offset=\"0\" stop-color=\"#1b86ff\" stop-opacity=\".25\"/>\n          <stop offset=\".55\" stop-color=\"#0f6df5\" stop-opacity=\".16\"/>\n          <stop offset=\"1\" stop-color=\"#0f6df5\" stop-opacity=\"0\"/>\n        </radialGradient>\n        <filter id=\"blueGlow\" x=\"-25%\" y=\"-25%\" width=\"150%\" height=\"150%\"><feGaussianBlur stdDeviation=\"10\"/></filter>\n        <filter id=\"softGlow\" x=\"-25%\" y=\"-25%\" width=\"150%\" height=\"150%\"><feGaussianBlur stdDeviation=\"5\"/></filter>\n      </defs>\n\n      <g id=\"aura\">\n        <path d=\"M126 152 H1128 Q1168 152 1168 192 V790 Q1168 828 1128 828 H126 Q86 828 86 790 V192 Q86 152 126 152 Z\" fill=\"none\" stroke=\"#2aa5ff\" stroke-opacity=\"__HP_GLOW_AURA__\" stroke-width=\"16\" filter=\"url(#blueGlow)\"/>\n      </g>\n\n      <g id=\"unitBody\">\n        <path d=\"M126 152 H1128 Q1168 152 1168 192 V790 Q1168 828 1128 828 H126 Q86 828 86 790 V192 Q86 152 126 152 Z\" fill=\"url(#bodyGrad)\" stroke=\"#f8fbff\" stroke-width=\"4\"/>\n        <rect x=\"86\" y=\"172\" width=\"1082\" height=\"22\" rx=\"8\" fill=\"#edf4fb\" opacity=\".82\"/>\n        <line x1=\"86\" y1=\"788\" x2=\"1168\" y2=\"788\" stroke=\"#8193ab\" stroke-opacity=\".56\" stroke-width=\"3\"/>\n        <path d=\"M814 152 V828\" stroke=\"#6a7890\" stroke-opacity=\".72\" stroke-width=\"5\"/>\n        <path d=\"M118 182 V798\" stroke=\"#6c7990\" stroke-opacity=\".40\" stroke-width=\"3\"/>\n        <path d=\"M1136 182 V798\" stroke=\"#6c7990\" stroke-opacity=\".40\" stroke-width=\"3\"/>\n      </g>\n\n      <g id=\"fanSection\">\n        <circle cx=\"458\" cy=\"490\" r=\"272\" fill=\"#d7e0eb\" stroke=\"#8ea2ba\" stroke-width=\"4\"/>\n        <circle cx=\"458\" cy=\"490\" r=\"248\" fill=\"#07111b\" stroke=\"#cad9e8\" stroke-width=\"4\"/>\n        <circle id=\"fanGlowRing\" cx=\"458\" cy=\"490\" r=\"244\" fill=\"none\" stroke=\"#2191ff\" stroke-opacity=\"__HP_GLOW__\" stroke-width=\"10\" filter=\"url(#blueGlow)\"/>\n        <circle cx=\"458\" cy=\"490\" r=\"234\" fill=\"url(#fanAura)\"/>\n\n        <g id=\"bladeRotor\" class=\"__HP_ROTOR_CLASS__\" style=\"__HP_ROTOR_STYLE__\">\n          <g class=\"bladeSet\">\n            <path d=\"M458 490 C470 454 520 394 586 346 C613 362 629 380 640 400 C610 438 548 474 458 490 Z\" fill=\"url(#bladeGrad)\"/>\n            <path d=\"M472 482 C492 450 540 404 591 372\" fill=\"none\" stroke=\"#2191ff\" stroke-opacity=\".34\" stroke-width=\"8\" stroke-linecap=\"round\"/>\n          </g>\n          <g class=\"bladeSet\" transform=\"rotate(90 458 490)\">\n            <path d=\"M458 490 C470 454 520 394 586 346 C613 362 629 380 640 400 C610 438 548 474 458 490 Z\" fill=\"url(#bladeGrad)\"/>\n            <path d=\"M472 482 C492 450 540 404 591 372\" fill=\"none\" stroke=\"#2191ff\" stroke-opacity=\".34\" stroke-width=\"8\" stroke-linecap=\"round\"/>\n          </g>\n          <g class=\"bladeSet\" transform=\"rotate(180 458 490)\">\n            <path d=\"M458 490 C470 454 520 394 586 346 C613 362 629 380 640 400 C610 438 548 474 458 490 Z\" fill=\"url(#bladeGrad)\"/>\n            <path d=\"M472 482 C492 450 540 404 591 372\" fill=\"none\" stroke=\"#2191ff\" stroke-opacity=\".34\" stroke-width=\"8\" stroke-linecap=\"round\"/>\n          </g>\n          <g class=\"bladeSet\" transform=\"rotate(270 458 490)\">\n            <path d=\"M458 490 C470 454 520 394 586 346 C613 362 629 380 640 400 C610 438 548 474 458 490 Z\" fill=\"url(#bladeGrad)\"/>\n            <path d=\"M472 482 C492 450 540 404 591 372\" fill=\"none\" stroke=\"#2191ff\" stroke-opacity=\".34\" stroke-width=\"8\" stroke-linecap=\"round\"/>\n          </g>\n          <circle cx=\"458\" cy=\"490\" r=\"82\" fill=\"url(#bodyGrad)\" stroke=\"#eef6ff\" stroke-width=\"4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"58\" fill=\"url(#bodySideGrad)\" opacity=\".74\"/>\n        </g>\n\n        <g id=\"fanGrille\" stroke=\"#0c1622\" stroke-width=\"5\" fill=\"none\" stroke-linecap=\"round\">\n          <circle cx=\"458\" cy=\"490\" r=\"236\" stroke=\"#111e2d\" stroke-width=\"8\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"218\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"200\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"182\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"164\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"146\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"128\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"110\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"92\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <path d=\"M458 256 V724\" stroke=\"#0f1e30\" stroke-width=\"8\"/>\n          <path d=\"M224 490 H692\" stroke=\"#0f1e30\" stroke-width=\"8\"/>\n          <path d=\"M292 324 L624 656\" stroke=\"#0f1e30\" stroke-width=\"8\"/>\n          <path d=\"M624 324 L292 656\" stroke=\"#0f1e30\" stroke-width=\"8\"/>\n        </g>\n      </g>\n\n      <g id=\"displayBlock\">\n        <rect x=\"842\" y=\"286\" width=\"288\" height=\"170\" rx=\"18\" fill=\"#d8e1ec\" stroke=\"#6f8097\" stroke-width=\"3\"/>\n        <rect x=\"858\" y=\"302\" width=\"256\" height=\"138\" rx=\"14\" fill=\"url(#darkPanel)\" stroke=\"#7ed0ff\" stroke-opacity=\".46\" stroke-width=\"2.5\"/>\n        <path d=\"M866 310 H988 L956 432 H866 Z\" fill=\"#ffffff\" opacity=\".09\"/>\n        <text x=\"884\" y=\"334\" font-size=\"14\" fill=\"#7dbdff\" font-family=\"monospace\">POWER</text>\n        <text id=\"powerValueDisplay\" x=\"884\" y=\"378\" font-size=\"42\" fill=\"#eaf8ff\" font-family=\"monospace\" font-weight=\"700\">__HP_POWER__</text>\n        <text x=\"884\" y=\"404\" font-size=\"13\" fill=\"#7dbdff\" font-family=\"monospace\">FAN SPEED</text>\n        <text id=\"fanSpeedDisplay\" x=\"1090\" y=\"404\" font-size=\"13\" fill=\"#cfefff\" font-family=\"monospace\" text-anchor=\"end\">__HP_SPEED__</text>\n        <rect x=\"884\" y=\"414\" width=\"206\" height=\"12\" rx=\"6\" fill=\"#203244\"/>\n        <rect id=\"fanSpeedBar\" x=\"884\" y=\"414\" width=\"__HP_BAR__\" height=\"12\" rx=\"6\" fill=\"#36a4ff\"/>\n        <rect x=\"884\" y=\"414\" width=\"206\" height=\"12\" rx=\"6\" fill=\"none\" stroke=\"#5caeff\" stroke-opacity=\".22\" stroke-width=\"1.5\"/>\n      </g>\n\n      <g id=\"ventSlots\" fill=\"#0a1118\" stroke=\"#7d8c9f\" stroke-width=\"2.5\">\n        <rect x=\"884\" y=\"552\" width=\"228\" height=\"32\" rx=\"16\"/>\n        <rect x=\"884\" y=\"620\" width=\"228\" height=\"32\" rx=\"16\"/>\n        <rect x=\"884\" y=\"688\" width=\"228\" height=\"32\" rx=\"16\"/>\n      </g>\n      <g id=\"ventMeshes\" fill=\"#141f2c\" opacity=\".82\">\n        <rect x=\"896\" y=\"560\" width=\"204\" height=\"16\" rx=\"8\"/>\n        <rect x=\"896\" y=\"628\" width=\"204\" height=\"16\" rx=\"8\"/>\n        <rect x=\"896\" y=\"696\" width=\"204\" height=\"16\" rx=\"8\"/>\n      </g>\n\n      <g id=\"screws\">\n        <circle cx=\"126\" cy=\"806\" r=\"10\" fill=\"#39495f\" stroke=\"#dce9f9\" stroke-width=\"2.2\"/>\n        <circle cx=\"126\" cy=\"806\" r=\"4\" fill=\"#08111a\"/>\n        <circle cx=\"850\" cy=\"806\" r=\"10\" fill=\"#39495f\" stroke=\"#dce9f9\" stroke-width=\"2.2\"/>\n        <circle cx=\"850\" cy=\"806\" r=\"4\" fill=\"#08111a\"/>\n        <circle cx=\"1124\" cy=\"806\" r=\"10\" fill=\"#39495f\" stroke=\"#dce9f9\" stroke-width=\"2.2\"/>\n        <circle cx=\"1124\" cy=\"806\" r=\"4\" fill=\"#08111a\"/>\n      </g>\n\n      <g id=\"feet\">\n        <path d=\"M200 826 H320 L296 892 H176 Z\" fill=\"url(#footGrad)\" stroke=\"#bde0ff\" stroke-width=\"3\"/>\n        <path d=\"M904 826 H1024 L1000 892 H880 Z\" fill=\"url(#footGrad)\" stroke=\"#bde0ff\" stroke-width=\"3\"/>\n        <rect x=\"174\" y=\"892\" width=\"126\" height=\"18\" rx=\"6\" fill=\"#2296ff\" opacity=\".82\" filter=\"url(#softGlow)\"/>\n        <rect x=\"878\" y=\"892\" width=\"126\" height=\"18\" rx=\"6\" fill=\"#2296ff\" opacity=\".82\" filter=\"url(#softGlow)\"/>\n      </g>\n    ";
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
    const image=SVG_TEMPLATE.replace('__HP_POWER__',kwLabel)
      .replace('__HP_SPEED__',percentLabel)
      .replace('__HP_BAR__',(206*pct/100).toFixed(1))
      .replace('__HP_GLOW__',glow)
      .replace('__HP_GLOW_AURA__',aura)
      .replace('__HP_ROTOR_CLASS__',powered?'ss-hp-rotating':'ss-hp-still')
      .replace('__HP_ROTOR_STYLE__',rotorStyle)
      .replace(/(\bid=")([^"]+)(")/g,(_,a,id,c)=>a+prefix+id+c)
      .replace(/url\(#([^)]+)\)/g,(_,id)=>'url(#'+prefix+id+')');
    return '<g class="ss-modern-heat-pump" data-fan="'+(speed===null?'unknown':pct.toFixed(1))+'" data-power="'+(kw===null?'unknown':kw.toFixed(2))+'">'+
      '<g class="ss-hp-dimensions" transform="translate(108.32 9.96) scale('+sx+' '+sy+') translate(-108.32 -9.96)">'+
      '<g transform="translate(8 -75) scale(.16 .16)">'+image+'</g></g></g>';
  };
  const styles='<style>'+
    '@keyframes ssHPSpin{to{transform:rotate(360deg)}}'+
    '.ss-hp-rotating{animation-name:ssHPSpin;animation-timing-function:linear;animation-iteration-count:infinite;transform-box:fill-box;transform-origin:center}'+
    '@media(prefers-reduced-motion:reduce){.ss-modern-heat-pump .ss-hp-rotating{animation:none!important}}'+
    '</style>';
  return {render,styles,geometry,power,fan};
})();
