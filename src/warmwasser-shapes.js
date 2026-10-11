/* Warmwasser-style SVG functions, adapted from mariofritzer's MIT implementation. */
const HASSStudioGraphics = (() => {
  const id = n=>'ww'+String(n.id).replace(/[^a-z0-9]/gi,'').slice(0,24);
  const sensorState=(h,e)=>e&&h?.states?.[e]?h.states[e].state:'unknown';
  const numeric=v=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v));
  const on=(h,e)=>['on','open','active','running','heating'].includes(String(sensorState(h,e)).toLowerCase());
  const burningStates=new Map(),collectorStates=new Map();
  const thresholdActive=(states,id,value,onAt,offAt)=>{
    if(!numeric(value)){states.delete(id);return false;}
    const active=states.get(id)===true;
    const next=active?Number(value)>offAt:Number(value)>=onAt;
    states.set(id,next);return next;
  };
  const color=value=>{
    if(!numeric(value))return 'rgb(138,144,153)';
    const x=Math.max(0,Math.min(1,Number(value)/90));
    if(x<.5){const k=x*2;return 'rgb('+Math.trunc(47+119*k)+','+Math.trunc(107-37*k)+','+Math.trunc(255-15*k)+')';}
    const k=(x-.5)*2;return 'rgb('+Math.trunc(166+89*k)+','+Math.trunc(70-11*k)+','+Math.trunc(240-192*k)+')';
  };
  const defs=(n,h)=>{
    const temps=(n.parts||[]).filter(p=>p.kind==='sensor'&&numeric(sensorState(h,p.entity)))
      .map(p=>({y:100-Number(p.height),t:Number(sensorState(h,p.entity))})).sort((a,b)=>a.y-b.y);
    const stops=temps.length?
      [{y:0,t:temps[0].t},...temps,{y:100,t:temps[temps.length-1].t}]:
      [{y:0,t:null},{y:100,t:null}];
    return '<linearGradient id="'+id(n)+'Temp" x1="0" y1="0" x2="0" y2="1">'+
      stops.map(p=>'<stop offset="'+p.y+'%" stop-color="'+color(p.t)+'"/>').join('')+
      '</linearGradient><linearGradient id="'+id(n)+'Cyl" x1="0" x2="1" y1="0" y2="0">'+
      '<stop stop-color="#fff" stop-opacity=".3"/><stop offset=".18" stop-color="#fff" stop-opacity=".12"/>'+
      '<stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".62" stop-color="#000" stop-opacity="0"/>'+
      '<stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>'+
      '<linearGradient id="'+id(n)+'Steel" x1="0" y1="0" x2="1" y2="0">'+
      '<stop stop-color="#69717d"/><stop offset=".5" stop-color="#39414a"/><stop offset="1" stop-color="#222a32"/></linearGradient>';
  };
  // Fit badges to measured string lengths rather than stretching all to 94px.
  const approxTextWidth=(text,size)=>Array.from(String(text)).reduce((total,ch)=>{
    const fraction=/[ilI1.,:!'|]/.test(ch)?0.34:/[MW@%]/.test(ch)?0.88:/[0-9]/.test(ch)?0.60:0.58;
    return total+size*fraction;
  },0);
  const temperatureBadge=(part,h,x,y,side='left')=>{
    const v=sensorState(h,part.entity),c=color(v);
    const rawLabel=String(part.label||'').slice(0,24),label=esc(rawLabel);
    const reading=numeric(v)?Number(v).toFixed(1)+'°':'—';
    const hasLabel=rawLabel.trim().length>0;
    const width=Math.ceil(Math.max(30,approxTextWidth(reading,13)+18,
      hasLabel?approxTextWidth(rawLabel,8.5)+18:0));
    const height=hasLabel?32:25;
    const left=side==='left',inside=side==='inside';
    const bx=inside?x-width/2:(left?x-width-8:x+8),by=y-height/2;
    return '<g class="ss-temperature-badge"'+(part.entity?' data-more="'+esc(part.entity)+'"':'')+'>'+
      (!inside?'<path d="M'+x+' '+y+'H'+(left?x-8:x+8)+'" stroke="'+c+'" stroke-width="1.6"/>':'')+
      '<rect x="'+bx+'" y="'+by+'" width="'+width+'" height="'+height+'" rx="10" fill="#22272d" fill-opacity=".97" stroke="'+c+'" stroke-width="1.5"/>'+
      (hasLabel?'<text x="'+(bx+width/2)+'" y="'+(y-4)+'" font-size="8.5" text-anchor="middle" font-weight="600" letter-spacing=".45" fill="#c5cbd2">'+label+'</text>':'')+
      '<text x="'+(bx+width/2)+'" y="'+(hasLabel?y+10:y+4.5)+'" font-size="13" font-weight="700" text-anchor="middle" fill="#f0f3f6">'+reading+'</text>'+
      '<circle cx="'+x+'" cy="'+y+'" r="4" fill="'+c+'" stroke="#fff" stroke-width="1.4"/></g>';
  };
  const tank=(n,h)=>{
    let out='<g transform="translate(0 2) scale(.45 .29)">'+
      '<rect x="72" y="14" width="130" height="360" rx="65" ry="22" fill="url(#'+id(n)+'Temp)"/>'+
      '<rect x="72" y="14" width="130" height="360" rx="65" ry="22" fill="url(#'+id(n)+'Cyl)"/>'+
      '<rect x="86" y="44" width="7" height="300" rx="3.5" fill="#fff" opacity=".14"/>'+
      '<path d="M72 40Q137 60 202 40" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.2"/>'+
      '<path d="M72 348Q137 368 202 348" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1.2"/>'+
      '<rect x="72" y="14" width="130" height="360" rx="65" ry="22" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="1.5"/>';
    if(n.variant==='combi')out+='<rect x="105" y="35" width="64" height="138" rx="25" fill="#acc6d0" fill-opacity=".35" stroke="#e2eff5" stroke-width="3"/>';
    if(n.variant==='stratified')out+='<rect x="73" y="188" width="128" height="4" fill="#c3d0dd" fill-opacity=".4"/>';
    const coil=y=>'<path d="M100 '+y+'C100 '+(y-11)+' 176 '+(y-5)+' 176 '+(y-18)+
      'C176 '+(y-31)+' 100 '+(y-22)+' 100 '+(y-36)+'" fill="none" stroke="#d8e0e7" stroke-width="4"/>';
    if(['coil','dual_coil'].includes(n.variant))out+=coil(342);
    if(n.variant==='dual_coil')out+=coil(145);
    if(n.variant==='hygiene'){
      let p='M110 18V348H100';for(let y=348;y>70;y-=24)p+='C100 '+(y-8)+' 176 '+(y-4)+' 176 '+(y-12)+'C176 '+(y-20)+' 100 '+(y-16)+' 100 '+(y-24);
      out+='<path d="'+p+'L164 32V18" fill="none" stroke="#d8e0e7" stroke-width="3.5" opacity=".7"/>';
    }
    out+='</g>';
    for(const part of n.parts||[]){
      const y=107-Number(part.height)*.95,x=part.side==='left'?32:part.side==='right'?91:61;
      if(part.kind==='sensor'){
        out+=temperatureBadge(part,h,x,y,part.side);
      }else if(part.kind==='heater'){
        const active=on(h,part.entity)||(numeric(sensorState(h,part.entity))&&Number(sensorState(h,part.entity))>5);
        out+='<g class="ss-heater"'+(part.entity?' data-more="'+esc(part.entity)+'"':'')+'>';
        const c=active?'#ffc52f':'#b9c0c8',length=part.variant==='extended'?76:part.variant==='compact'?42:60;
        const right=part.side!=='left';
        const connector=right?93:29,sign=right?-1:1;
        const x0=connector+sign*11,pitch=length/8;
        let d='M'+x0+' '+y;
        for(let k=1;k<=8;k++) d+='L'+(x0+sign*k*pitch).toFixed(2)+' '+(y+(k%2?-4:4));
        out+='<g><path d="'+d+'" stroke="'+c+'" stroke-width="3" stroke-linejoin="round" fill="none"/>'+
          '<rect x="'+(connector-(right?0:16))+'" y="'+(y-11)+'" width="16" height="22" rx="3" fill="#343940" stroke="'+c+'" stroke-width="1.6"/>'+
          '<text x="'+(right?connector-4:connector+20)+'" y="'+(y-15)+'" text-anchor="'+(right?'end':'start')+
          '" font-size="9" fill="'+c+'">'+esc(String(part.label||'').slice(0,25))+'</text></g></g>';
      }else if(part.kind==='coil'){
        out+='<g class="ss-coil"'+(part.entity?' data-more="'+esc(part.entity)+'"':'')+'>';
        const reach=part.variant==='extended'?28:part.variant==='compact'?11:19;
        const mid=part.side==='left'?45:part.side==='right'?78:61;
        out+='<path d="M'+(mid-reach)+' '+y+'C'+(mid-reach)+' '+(y-13)+' '+(mid+reach)+' '+(y-7)+' '+(mid+reach)+' '+(y-19)+
          'C'+(mid+reach)+' '+(y-31)+' '+(mid-reach)+' '+(y-23)+' '+(mid-reach)+' '+(y-35)+
          '" fill="none" stroke="#d1d9e0" stroke-width="2.6" stroke-linecap="round"/></g>';
      }
    }
    return out;
  };
  const boiler=(n,h)=>{
    const v=n.variant,temp=sensorState(h,n.entity);
    const fallbackTemp=thresholdActive(burningStates,n.id,temp,
      Number(n.burner_on_temp??35),Math.min(Number(n.burner_off_temp??32),Number(n.burner_on_temp??35)-0.5));
    const burning=n.burner_mode==='on'||(n.burner_mode!=='off'&&
      (n.burner_entity?on(h,n.burner_entity):fallbackTemp));
    const isWood=['wood','pellet'].includes(v),isGas=['gas','oil'].includes(v),electric=v==='electric',heatpump=v==='heatpump';
    const pale=isGas||electric,steel=id(n)+'Steel';
    const flame=(x,y,w,height,duration)=>{
      const path=(width,hh)=>'M'+(-width)+' 0C'+(-width-2)+' '+(-hh*.45)+' '+(-width*.15)+' '+(-hh*.6)+' '+(width*.1)+' '+(-hh)+
        'C'+(width*.5)+' '+(-hh*.6)+' '+(width+2)+' '+(-hh*.4)+' '+width+' 0Z';
      return '<g transform="translate('+x+' '+y+')"><g class="ss-fire" style="animation-duration:'+duration+'s">'+
        '<path d="'+path(w,height)+'" fill="'+(isGas?'#1f6fff':'#ff5a1f')+'"/>'+
        '<path d="'+path(w*.65,height*.7)+'" fill="'+(isGas?'#5fa0ff':'#ffa21c')+'"/>'+
        '<path d="'+path(w*.35,height*.42)+'" fill="'+(isGas?'#cfe3ff':'#ffe27a')+'"/></g></g>';
    };
    let out='<g class="ss-boiler">'+
      '<rect x="19" y="-28" width="15" height="73" rx="2" fill="url(#'+steel+')"/>'+
      '<rect x="16" y="-19" width="21" height="5" rx="1" fill="#252a31"/>'+
      '<rect x="26" y="102" width="12" height="9" rx="1" fill="#414750"/>'+
      '<rect x="94" y="102" width="12" height="9" rx="1" fill="#414750"/>'+
      '<rect x="21" y="5" width="91" height="99" rx="10" fill="url(#'+steel+')" stroke="#9098a1" stroke-width="1.2"/>'+
      (pale?'<rect x="21" y="5" width="91" height="99" rx="10" fill="#c7d0d8" opacity=".18"/>':'')+
      '<rect x="25" y="5" width="84" height="7" rx="2" fill="#31363e"/>'+
      '<text x="30" y="19" fill="#d5dce5" font-size="9" font-weight="600" letter-spacing=".7">'+
      esc(({wood:'DREWNO',pellet:'PELLET',gas:'GAZ',oil:'OLEJ',electric:'ELEKTR.',heatpump:'POMPA C.'})[v]||'KOCIOŁ')+'</text>';
    if(numeric(temp)){
      out+='<rect x="30" y="22" width="72" height="19" rx="5" fill="#0b1117"/>'+
        '<text x="66" y="36" font-size="14" font-weight="700" text-anchor="middle" fill="#ffca36">'+Number(temp).toFixed(1)+'°</text>';
    }
    out+='<rect x="29" y="44" width="76" height="50" rx="7" fill="#0d1014" stroke="#59616d" stroke-width="1.5"/>'+
      '<rect x="35" y="49" width="64" height="40" rx="4" fill="#0a0b0e"/>';
    if(isWood||isGas){
      if(burning){
        out+='<rect x="35" y="49" width="64" height="40" fill="'+(isGas?'#193159':'#522016')+'" opacity=".35" class="ss-embers"/>';
        out+=flame(54,87,9,isGas?20:26,.9)+flame(70,87,11,isGas?31:38,1.15)+flame(87,87,8,isGas?23:29,.8);
        if(isWood)out+='<ellipse cx="68" cy="86" rx="28" ry="5" fill="#ff7625" opacity=".55" class="ss-embers"/>';
      }
      if(v==='wood')out+='<rect x="47" y="84" width="45" height="7" rx="3" fill="#55331e" stroke="'+(burning?'#ff842d':'#785238')+'" transform="rotate(-8 65 86)"/>';
      if(v==='pellet')out+=Array.from({length:9},(_,k)=>'<rect x="'+(42+(k%5)*10)+'" y="'+(83+Math.floor(k/5)*4)+'" width="7" height="3" rx="1" fill="#92623d"/>').join('');
      if(isGas)out+='<path d="M43 87H93" stroke="#536173" stroke-width="3"/>';
    }else if(electric){
      out+='<path d="M41 64H92M41 77H92" stroke="'+(burning?'#ffca38':'#79828b')+'" stroke-width="3" stroke-dasharray="7 4"'+(burning?' class="ss-embers"':'')+'/>';
      out+='<path d="M69 52L55 69H66L58 85L83 63H69Z" fill="'+(burning?'#ffd24b':'#7f8790')+'"/>';
    }else if(heatpump){
      out+='<g'+(burning?' class="ss-fan"':'')+'><circle cx="67" cy="68" r="16" stroke="#77b7d9" stroke-width="2" fill="none"/>'+
        '<path d="M64 53Q83 57 69 68Q83 84 67 71Q50 82 64 67Q52 55 64 53Z" fill="#91c6df"/></g>';
    }
    out+='<path d="M37 94H96" stroke="#79818c" stroke-opacity=".55" stroke-width="1.6"/>'+
      '<rect x="30" y="96" width="73" height="16" rx="4" fill="#313941" stroke="#79818c"/>'+
      '<text x="66" y="107" text-anchor="middle" font-size="9" font-weight="700" fill="'+(burning?'#ffbf35':'#9da7b2')+'">'+
      (burning?(isWood?'Burning':isGas?'Burner on':electric?'Heating':'Running'):'Off')+'</text></g>';
    return out;
  };
  const solar=(n,h)=>{
    const collectorPart=(n.parts||[]).find(p=>p.kind==='sensor'&&p.entity&&/kolektor|collector/i.test(p.label||''))||
      (n.parts||[]).find(p=>p.kind==='sensor'&&p.entity);
    const collectorTemp=sensorState(h,collectorPart?.entity||n.entity);
    const tankTemp=sensorState(h,n.tank_entity);
    const delta=numeric(collectorTemp)&&numeric(tankTemp)?Number(collectorTemp)-Number(tankTemp):null;
    const lit=thresholdActive(collectorStates,n.id,delta,Number(n.solar_on_delta??6),
      Math.min(Number(n.solar_off_delta??3),Number(n.solar_on_delta??6)-0.5));
    const cx=101,cy=27;
    const rays=Array.from({length:8},(_,i)=>{
      const a=i*Math.PI/4,x1=cx+11*Math.cos(a),y1=cy+11*Math.sin(a);
      const x2=cx+16*Math.cos(a),y2=cy+16*Math.sin(a);
      return '<path d="M'+x1.toFixed(1)+' '+y1.toFixed(1)+'L'+x2.toFixed(1)+' '+y2.toFixed(1)+'" stroke="'+(lit?'#ffd23f':'#858e98')+'" stroke-width="1.7" stroke-linecap="round"/>';
    }).join('');
    let out='<path d="M17 93L39 33H84L63 93Z" fill="#233f70" stroke="#a4b1c4" stroke-width="1.7"/>'+
      [1,2,3].map(i=>'<path d="M'+(17+i*12)+' 93L'+(39+i*12)+' 33" stroke="#93a4c2" stroke-width="1.3"/>').join('')+
      '<path d="M27 59H75" stroke="#93a4c2" stroke-opacity=".6"/>'+
      '<g'+(lit?' class="ss-solar-sun"':'')+'>'+rays+
      '<circle cx="'+cx+'" cy="'+cy+'" r="7" fill="'+(lit?'#ffd23f':'#858e98')+'"/></g>';
    // Collector sensor positions belong to the solar node, so moving/scaling
    // the collector preserves both label and data source.
    for(const part of (n.parts||[]).filter(p=>p.kind==='sensor')){
      const yy=93-(Number(part.height)/100)*60;
      const side=part.side==='left'?'left':'right';
      out+=temperatureBadge({...part,label:part.label||'Kolektor'},h,side==='left'?17:85,yy,side);
    }
    return out;
  };

  const pump=(n,h)=>'<circle cx="60" cy="62" r="30" fill="#2b2f35" stroke="'+(on(h,n.entity)?'#66c998':'#8a9099')+'" stroke-width="2"/>'+
    (on(h,n.entity)?'<circle cx="60" cy="62" r="30" fill="none" stroke="#66c998" stroke-width="1.5" class="ss-pump-pulse"/>':'')+
    '<path d="M77 62L47 79L47 45Z" fill="'+(on(h,n.entity)?'#66c998':'#7c8894')+'"/>';
  const valve=(n,h)=>'<path d="M38 46L59 63L38 80ZM80 46L59 63L80 80Z" fill="#222b34" stroke="'+(on(h,n.entity)?'#69cda4':'#9da9b5')+'" stroke-width="2"/>'+
    (n.variant==='three_way'?'<path d="M42 92L59 63L76 92Z" fill="#222b34" stroke="#9da9b5" stroke-width="2"/>':'')+
    '<line x1="59" y1="46" x2="59" y2="35" stroke="#989fa8" stroke-width="3"/>'+
    '<rect x="45" y="25" width="28" height="14" rx="3" fill="#3f4a56" stroke="#9aa7b3"/>'+
    '<text x="59" y="35" text-anchor="middle" font-size="10" fill="#edf2f7">M</text>'+
    '<circle cx="59" cy="63" r="3" fill="'+(on(h,n.entity)?'#69cda4':'#9aa7b3')+'"/>';
  const sensor=(n,h)=>'<rect x="52" y="36" width="14" height="45" rx="7" fill="#29313a" stroke="#bac4cf" stroke-width="2"/>'+
    '<circle cx="59" cy="83" r="13" fill="'+color(sensorState(h,n.entity))+'" stroke="#a8bccb" stroke-width="1.5"/>'+
    '<path d="M59 52V83" stroke="'+color(sensorState(h,n.entity))+'" stroke-width="5" stroke-linecap="round"/>';
  const shapes={tank,boiler,solar,pump,valve,sensor};
  const render=(n,h)=>shapes[n.type]?shapes[n.type](n,h):'';
  const styles='<style>'+
    '@keyframes ssWWPulse{0%{opacity:.8;transform:scale(1)}100%{opacity:0;transform:scale(1.5)}}'+
    '@keyframes ssWWFire{33%{opacity:.8;transform:scale(1.04,.92)}66%{opacity:.95;transform:scale(.96,1.06)}}'+
    '@keyframes ssWWFlow{to{stroke-dashoffset:-28}}'+
    '.ss-pump-pulse{animation:ssWWPulse 1.6s infinite;transform-box:fill-box;transform-origin:center}'+
    '.ss-fire{animation:ssWWFire .9s infinite;transform-box:fill-box;transform-origin:center}'+
    '.ss-solar-sun{animation:ssWWFire 3s infinite;transform-box:fill-box;transform-origin:center}'+
    '@keyframes ssWWEmbers{50%{opacity:.45}}'+
    '@keyframes ssWWRotate{to{transform:rotate(360deg)}}'+
    '.ss-embers{animation:ssWWEmbers 1.7s infinite}'+
    '.ss-fan{animation:ssWWRotate 1.8s linear infinite;transform-box:fill-box;transform-origin:center}'+
    '.ss-flow{stroke:#fff;stroke-width:2.5;stroke-dasharray:1 13;animation:ssWWFlow var(--ss-speed,1s) linear infinite;fill:none;stroke-linecap:round}'+
    '</style>';
  return {defs,render,styles,on};
})();
