/* Isolated manifold SVG+JS prototype. Not registered in Home Assistant.
 * User-reference geometry: two brass rails, flowmeters, return valves and optional displays.
 * Configurable circuits, pitch and actuator layout; no pipe automation or HA sensor fallback.
 */
const HASSStudioManifoldPrototype=(()=>{
  const MAX_CIRCUITS=40;
  const number=(value,min,max,fallback)=>value!==''&&value!=null&&Number.isFinite(Number(value))
    ?Math.max(min,Math.min(max,Number(value))):fallback;
  const f=(v,d=1)=>Number(v).toFixed(d);
  const defaultCircuit=i=>({
    id:'circuit-'+(i+1),display:true,actuator:true,
    tempOut:36+(i%3)*.7,tempReturn:28+(i%4)*.4,
    flow:Math.max(.2,1.6+((i%5)-2)*.15),open:65
  });
  const normalize=raw=>{
    const count=Math.round(number(raw?.count,1,MAX_CIRCUITS,5));
    const pitch=number(raw?.pitch,165,300,205);
    const mode=raw?.actuatorMode==='common'?'common':'individual';
    const values=Array.isArray(raw?.circuits)?raw.circuits:[];
    return {count,pitch,actuatorMode:mode,circuits:Array.from({length:count},(_,i)=>{
      const fallback=defaultCircuit(i),v=values[i]||{};
      return {id:fallback.id,display:v.display!==false,actuator:v.actuator!==false,
        tempOut:number(v.tempOut,-30,120,fallback.tempOut),
        tempReturn:number(v.tempReturn,-30,120,fallback.tempReturn),
        flow:number(v.flow,0,8,fallback.flow),open:number(v.open,0,100,fallback.open)};
    })};
  };
  const geometry=raw=>{
    const c=normalize(raw);
    return {x:0,y:0,width:410+(c.count-1)*c.pitch,height:765,
      centers:Array.from({length:c.count},(_,i)=>205+i*c.pitch)};
  };
  const defs=[
    '<defs>',
    '<linearGradient id="mf-brass" x2="0" y2="1"><stop stop-color="#fff0a9"/>',
    '<stop offset=".15" stop-color="#c78c30"/><stop offset=".43" stop-color="#f2cd72"/>',
    '<stop offset=".75" stop-color="#ad6e20"/><stop offset="1" stop-color="#f3cf7d"/></linearGradient>',
    '<linearGradient id="mf-steel" x2="1" y2="0"><stop stop-color="#dceaf4"/>',
    '<stop offset=".17" stop-color="#79889a"/><stop offset=".5" stop-color="#3b4859"/>',
    '<stop offset=".8" stop-color="#a6b7c9"/><stop offset="1" stop-color="#edf6ff"/></linearGradient>',
    '<linearGradient id="mf-glass" x2="1" y2=".1"><stop stop-color="#cfeaff" stop-opacity=".7"/>',
    '<stop offset=".22" stop-color="#528cc6" stop-opacity=".12"/>',
    '<stop offset=".7" stop-color="#0c2846" stop-opacity=".18"/>',
    '<stop offset="1" stop-color="#e7f9ff" stop-opacity=".72"/></linearGradient>',
    '<linearGradient id="mf-red" x2="0" y2="1"><stop stop-color="#ff9890"/>',
    '<stop offset=".45" stop-color="#ec3a39"/><stop offset="1" stop-color="#a51723"/></linearGradient>',
    '<linearGradient id="mf-blue" x2="0" y2="1"><stop stop-color="#c3e6ff"/>',
    '<stop offset=".3" stop-color="#4aaeff"/><stop offset="1" stop-color="#1857a9"/></linearGradient>',
    '<linearGradient id="mf-screen" x2="1" y2="1"><stop stop-color="#172e45"/>',
    '<stop offset=".6" stop-color="#06121f"/><stop offset="1" stop-color="#1a3850"/></linearGradient>',
    '<filter id="mf-shadow" x="-20%" y="-35%" width="140%" height="180%">',
    '<feDropShadow dx="0" dy="7" stdDeviation="8" flood-color="#01060a" flood-opacity=".4"/></filter>',
    '</defs>'
  ].join('');
  const beam=(x,y,w,tone)=>[
    '<g class="mf-beam"><rect x="',x,'" y="',y,'" width="',w,
    '" height="58" rx="19" fill="url(#mf-brass)" stroke="#fff1bf" stroke-width="1.3"/>',
    '<path d="M',x+18,' ',y+11,' H',x+w-18,
    '" stroke="#fffbd1" stroke-opacity=".5" stroke-width="7" stroke-linecap="round"/>',
    '<rect x="',x-18,'" y="',y+8,
    '" width="20" height="42" rx="5" fill="url(#mf-steel)" stroke="#a9b8cb"/>',
    '<rect x="',x+w-2,'" y="',y+8,
    '" width="20" height="42" rx="5" fill="url(#mf-steel)" stroke="#a9b8cb"/>',
    '<path d="M',x+9,' ',y+49,' H',x+w-9,
    '" stroke="#6c431a" stroke-opacity=".45" stroke-width="4"/>',
    '<rect x="',x+12,'" y="',y+19,
    '" width="52" height="19" rx="8" fill="',tone,'" fill-opacity=".86"/></g>'
  ].join('');
  const flowmeter=(x,i,c)=>{
    const waterH=number(c.flow/5*58,0,58,0);
    const ticks=Array.from({length:5},(_,j)=>
      '<path d="M7 '+(-36-j*14)+' h6" stroke="#e6f9ff" stroke-width="1"/>').join('');
    return [
      '<g class="mf-flowmeter" data-circuit="',i+1,'" transform="translate(',x,' 225)">',
      '<rect x="-19" y="-15" width="38" height="25" rx="6" fill="url(#mf-steel)" stroke="#c9d1d9"/>',
      '<path d="M-23 -15 L-16 -26 H16 L23 -15Z" fill="#d6a75a" stroke="#ffdf91"/>',
      '<rect x="-15" y="-104" width="30" height="77" rx="7" fill="#112b3d" stroke="#ebf5ff"/>',
      '<rect x="-11" y="',-27-waterH,'" width="22" height="',waterH,
      '" rx="3" fill="#58baff" fill-opacity=".68"/>',
      '<rect x="-15" y="-104" width="30" height="77" rx="7" fill="url(#mf-glass)" stroke="#c0d7e5"/>',
      '<path d="M-8 -98 V-33" stroke="#fff" stroke-opacity=".6" stroke-width="3"/>',ticks,
      '<text x="0" y="-119" text-anchor="middle" fill="#95dfff" font-size="13" font-weight="700">',
      f(c.flow),' l/min</text>',
      '<rect x="-29" y="-7" width="58" height="17" rx="6" fill="url(#mf-red)" stroke="#f6a7a5"/>',
      '<path d="M-19 -3 H19" stroke="#ffcebd" stroke-opacity=".65" stroke-width="2"/></g>'
    ].join('');
  };
  const actuator=(x,i,shown)=>[
    '<g class="mf-valve" data-circuit="',i+1,'" transform="translate(',x,' 548)">',
    '<path d="M-21 0 L-16 16 H16 L21 0Z" fill="url(#mf-steel)" stroke="#d4e1e9"/>',
    '<rect x="-11" y="15" width="22" height="30" rx="5" fill="url(#mf-steel)" stroke="#bbc9d6"/>',
    shown?[
      '<rect x="-27" y="39" width="54" height="71" rx="13" fill="url(#mf-steel)" stroke="#dce9f4"/>',
      '<rect x="-27" y="75" width="54" height="13" fill="url(#mf-blue)"/>',
      '<rect x="-21" y="46" width="42" height="23" rx="7" fill="#daeaf6"/>',
      '<text x="0" y="63" fill="#1c496e" text-anchor="middle" font-size="9" font-weight="bold">24 V</text>',
      '<path d="M0 110 v14 q0 7 10 7" fill="none" stroke="#3b536a" stroke-width="5"/>'
    ].join(''):[
      '<rect x="-25" y="38" width="50" height="29" rx="11" fill="url(#mf-blue)" stroke="#bddfff"/>',
      '<path d="M-18 50 H18" stroke="#d3ebff" stroke-width="2"/>'
    ].join(''),'</g>'
  ].join('');
  const display=(x,i,c)=>[
    '<g class="mf-display" data-circuit="',i+1,'" transform="translate(',x,' 418)">',
    '<rect x="-75" y="-43" width="150" height="86" rx="13" fill="url(#mf-screen)" stroke="#547a9a" stroke-width="1.7"/>',
    '<rect x="-69" y="-37" width="138" height="74" rx="10" fill="#071422" fill-opacity=".8"/>',
    '<text x="0" y="-25" fill="#a5cee9" text-anchor="middle" font-size="10">OBIEG ',i+1,'</text>',
    '<text x="-62" y="-8" fill="#ff8181" font-size="10" font-weight="bold">ZAS.</text>',
    '<text x="-19" y="-8" fill="#ffe6e0" font-size="14" font-weight="bold">',f(c.tempOut),'°C</text>',
    '<text x="-62" y="9" fill="#74b7ff" font-size="10" font-weight="bold">POW.</text>',
    '<text x="-19" y="9" fill="#ddeaff" font-size="14" font-weight="bold">',f(c.tempReturn),'°C</text>',
    '<text x="-62" y="28" fill="#76ecf2" font-size="10" font-weight="bold">',f(c.flow),' l/min</text>',
    '<text x="8" y="28" fill="#8effad" font-size="10" font-weight="bold">',Math.round(c.open),'% OTW.</text>',
    '</g>'
  ].join('');
  const commonActuator=x=>[
    '<g class="mf-common-actuator" transform="translate(',x,' 518)">',
    '<path d="M-50 13 H42" stroke="#d6a85b" stroke-width="14" stroke-linecap="round"/>',
    '<rect x="-14" y="-35" width="28" height="52" rx="6" fill="url(#mf-steel)" stroke="#d6e3ee"/>',
    '<rect x="-27" y="-91" width="54" height="57" rx="12" fill="url(#mf-steel)" stroke="#c9e4f2"/>',
    '<rect x="-27" y="-55" width="54" height="12" fill="url(#mf-blue)"/>',
    '<rect x="-17" y="-80" width="34" height="20" rx="5" fill="#d6ebf8"/>',
    '<text x="0" y="-66" text-anchor="middle" font-size="9" fill="#1b4663">24 V</text>',
    '<text x="0" y="-104" fill="#a2d8ff" text-anchor="middle" font-size="12">WSPÓLNY</text>',
    '</g>'
  ].join('');
  const render=raw=>{
    const c=normalize(raw),box=geometry(c),centers=box.centers;
    const railWidth=160+(c.count-1)*c.pitch;
    const plural=c.count===1?'obieg':c.count<5?'obiegi':'obiegów';
    return [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ',box.width,' ',box.height,
      '" width="',box.width,'" height="',box.height,
      '" role="img" aria-label="Rozdzielacz CO, ',c.count,' obiegów">',
      defs,'<g filter="url(#mf-shadow)">',beam(125,230,railWidth,'#d93837'),
      beam(125,490,railWidth,'#277fd7'),
      '<g class="mf-circuits">',
      centers.map((x,i)=>flowmeter(x,i,c.circuits[i])).join(''),
      centers.map((x,i)=>actuator(x,i,c.actuatorMode==='individual'&&c.circuits[i].actuator)).join(''),
      centers.map((x,i)=>c.circuits[i].display?display(x,i,c.circuits[i]):'').join(''),
      '</g>',c.actuatorMode==='common'?commonActuator(75):'','</g>',
      '<g fill="#d4e8fc" font-family="Arial,sans-serif" text-anchor="middle">',
      '<text x="',box.width/2,'" y="42" font-size="',c.count===1?17:c.count===2?21:26,'" font-weight="bold">ROZDZIELACZ CO / PODŁOGÓWKI</text>',
      '<text x="',box.width/2,'" y="66" fill="#91b9da" font-size="13">',
      c.count,' ',plural,' • zasilanie / powrót • podgląd demonstracyjny</text></g></svg>'
    ].join('');
  };
  return Object.freeze({render,geometry,normalize,defaultCircuit,MAX_CIRCUITS});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioManifoldPrototype;
