/* Warmwasser-style SVG functions, adapted from mariofritzer's MIT implementation. */
const HASSStudioGraphics = (() => {
  const id = n=>'ww'+String(n.id).replace(/[^a-z0-9]/gi,'').slice(0,24);
  const sensorState=(h,e)=>e&&h?.states?.[e]?h.states[e].state:'unknown';
  const numeric=v=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v));
  const on=(h,e)=>['on','open','active','running','heating'].includes(String(sensorState(h,e)).toLowerCase());
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
      const y=107-Number(part.height)*.95,x=part.side==='left'?31:part.side==='right'?92:61;
      if(part.kind==='sensor'){
        const v=sensorState(h,part.entity);
        const radius=part.variant==='extended'?6:part.variant==='compact'?3:4.5;
        out+='<circle cx="'+x+'" cy="'+y+'" r="'+radius+'" fill="'+color(v)+'" stroke="#27313c" stroke-width="1.3"/>';
        if(part.variant==='extended')out+='<path d="M'+x+' '+(y-8)+'v16" stroke="#f1d19b" stroke-width="2"/>';
        if(numeric(v))out+='<text x="'+(part.side==='left'?x-8:x+8)+'" y="'+(y+3)+'" text-anchor="'+(part.side==='left'?'end':'start')+
          '" font-size="10" fill="var(--primary-text-color,#eee)">'+esc(Number(v).toFixed(1))+'°</text>';
      }else if(part.kind==='heater'){
        const reach=part.variant==='extended'?22:part.variant==='compact'?7:12;
        out+='<path d="M'+(x-reach)+' '+y+'h'+(reach*2)+'m-'+(reach*1.5)+'-5v10m'+reach+'-10v10" stroke="#f3bf73" stroke-width="2.6" fill="none"/>';
      }else if(part.kind==='coil'){
        const reach=part.variant==='extended'?22:part.variant==='compact'?8:13;
        out+='<path d="M'+(x-reach)+' '+y+'q'+(reach/2)+'-13 '+reach+' 0t'+reach+' 0" stroke="#ccd4dd" stroke-width="2.6" fill="none"/>';
      }
    }
    return out;
  };
  const boiler=(n,h)=>{
    const running=on(h,n.entity),bright=['pellet','gas','oil','electric'].includes(n.variant),gas=['gas','oil'].includes(n.variant);
    return '<rect x="19" y="20" width="15" height="76" fill="#4b535f"/><rect x="16" y="27" width="21" height="5" rx="1" fill="#222830"/>'+
      '<rect x="27" y="16" width="78" height="96" rx="9" fill="url(#'+id(n)+'Steel)" stroke="#89919b" stroke-width="1.2"/>'+
      (bright?'<rect x="27" y="16" width="78" height="96" rx="9" fill="#d5dae1" opacity=".29"/>':'')+
      '<rect x="33" y="43" width="66" height="52" rx="5" fill="#101419" stroke="#8a949e" stroke-width="1.2"/>'+
      (numeric(sensorState(h,n.entity))?'<rect x="35" y="24" width="61" height="17" rx="4" fill="#080c10"/>'+
      '<text x="65" y="36" font-size="13" font-weight="700" text-anchor="middle" fill="#ffc43d">'+
      Number(sensorState(h,n.entity)).toFixed(1)+'°</text>':'')+
      (n.variant==='electric'?'<path d="M69 49L53 71H65L58 89L82 62H69Z" fill="#f5cb67"/>':
      n.variant==='heatpump'?'<circle cx="66" cy="69" r="20" stroke="#74bddd" stroke-width="3" fill="none"/><path d="M57 56L80 69L57 82Z" fill="#a5cee7"/>':
      running?'<g class="ss-fire"><path d="M65 88Q39 70 66 49Q58 70 78 66Q93 84 65 88Z" fill="'+(gas?'#70baff':'#ff7a22')+'"/><path d="M66 88Q51 77 67 62Q64 74 75 73Q81 83 66 88Z" fill="'+(gas?'#d5e8ff':'#ffd444')+'"/></g>':
      '<path d="M47 90H85" stroke="#596069" stroke-width="2"/>')+
      '<path d="M38 101H93" stroke="#bfc4ce" stroke-width="2" stroke-opacity=".4"/>';
  };
  const solar=(n,h)=>{
    const lit=on(h,n.entity),cx=101,cy=27;
    const rays=Array.from({length:8},(_,i)=>{
      const a=i*Math.PI/4,x1=cx+11*Math.cos(a),y1=cy+11*Math.sin(a);
      const x2=cx+16*Math.cos(a),y2=cy+16*Math.sin(a);
      return '<path d="M'+x1.toFixed(1)+' '+y1.toFixed(1)+'L'+x2.toFixed(1)+' '+y2.toFixed(1)+'" stroke="'+(lit?'#ffd23f':'#858e98')+'" stroke-width="1.7" stroke-linecap="round"/>';
    }).join('');
    return '<path d="M17 93L39 33H84L63 93Z" fill="#233f70" stroke="#a4b1c4" stroke-width="1.7"/>'+
      [1,2,3].map(i=>'<path d="M'+(17+i*12)+' 93L'+(39+i*12)+' 33" stroke="#93a4c2" stroke-width="1.3"/>').join('')+
      '<path d="M27 59H75" stroke="#93a4c2" stroke-opacity=".6"/>'+
      '<g'+(lit?' class="ss-solar-sun"':'')+'>'+rays+
      '<circle cx="'+cx+'" cy="'+cy+'" r="7" fill="'+(lit?'#ffd23f':'#858e98')+'"/></g>';
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
    '.ss-flow{stroke:#fff;stroke-width:2.5;stroke-dasharray:1 13;animation:ssWWFlow var(--ss-speed,1s) linear infinite;fill:none;stroke-linecap:round}'+
    '</style>';
  return {defs,render,styles,on};
})();
