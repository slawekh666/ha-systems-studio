/* Modern electric boiler based on supplied piec_elektryczny_svg_js.html.
 * Three HA measurements: power (W / kW), water temperature (°C / °F),
 * optional electrical load percent. No control actions, no polling.
 */
const HASSStudioElectricBoiler=(()=>{
  const SVG_TEMPLATE="\n      <defs>\n        <linearGradient id=\"bodyGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#f8fbff\"/>\n          <stop offset=\".24\" stop-color=\"#eef2f7\"/>\n          <stop offset=\".58\" stop-color=\"#d7dde7\"/>\n          <stop offset=\"1\" stop-color=\"#bcc7d5\"/>\n        </linearGradient>\n        <linearGradient id=\"bodyShade\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#d5dde8\"/>\n          <stop offset=\".5\" stop-color=\"#ffffff\"/>\n          <stop offset=\"1\" stop-color=\"#bac4d4\"/>\n        </linearGradient>\n        <linearGradient id=\"panelDark\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#111b2b\"/>\n          <stop offset=\"1\" stop-color=\"#060d16\"/>\n        </linearGradient>\n        <linearGradient id=\"metalGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#283546\"/>\n          <stop offset=\".25\" stop-color=\"#7c90ab\"/>\n          <stop offset=\".55\" stop-color=\"#f0f6ff\"/>\n          <stop offset=\"1\" stop-color=\"#2a3648\"/>\n        </linearGradient>\n        <linearGradient id=\"waterDropOuter\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#7ff7ff\"/>\n          <stop offset=\".4\" stop-color=\"#19b4ff\"/>\n          <stop offset=\"1\" stop-color=\"#0a4eff\"/>\n        </linearGradient>\n        <linearGradient id=\"waterDropInner\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#eefcff\"/>\n          <stop offset=\"1\" stop-color=\"#57d8ff\"/>\n        </linearGradient>\n        <linearGradient id=\"lightningGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#fff4a9\"/>\n          <stop offset=\".4\" stop-color=\"#ffd233\"/>\n          <stop offset=\"1\" stop-color=\"#ff9f00\"/>\n        </linearGradient>\n        <linearGradient id=\"ringHeat\" gradientUnits=\"userSpaceOnUse\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#ff3b1f\"/>\n          <stop offset=\".55\" stop-color=\"#ffb000\"/>\n          <stop offset=\"1\" stop-color=\"#ffe66a\"/>\n        </linearGradient>\n        <filter id=\"blueGlow\" x=\"-40%\" y=\"-40%\" width=\"180%\" height=\"180%\"><feGaussianBlur stdDeviation=\"12\"/></filter>\n        <filter id=\"softGlow\" x=\"-40%\" y=\"-40%\" width=\"180%\" height=\"180%\"><feGaussianBlur stdDeviation=\"6\"/></filter>\n        <filter id=\"warmGlow\" x=\"-40%\" y=\"-40%\" width=\"180%\" height=\"180%\"><feGaussianBlur stdDeviation=\"10\"/></filter>\n      </defs>\n\n      <g id=\"aura\">\n        <path d=\"M236 132 H848 Q926 132 926 210 V1244 Q926 1322 848 1322 H236 Q158 1322 158 1244 V210 Q158 132 236 132 Z\" fill=\"none\" stroke=\"#28a6ff\" stroke-opacity=\".25\" stroke-width=\"20\" filter=\"url(#blueGlow)\"/>\n      </g>\n\n      <g id=\"bodyGroup\">\n        <path id=\"bodyShape\" d=\"M236 132 H848 Q926 132 926 210 V1244 Q926 1322 848 1322 H236 Q158 1322 158 1244 V210 Q158 132 236 132 Z\" fill=\"url(#bodyGrad)\" stroke=\"#f6fbff\" stroke-width=\"4\"/>\n        <path d=\"M176 220 Q176 160 232 160 H264 V1260 H230 Q176 1260 176 1206 Z\" fill=\"#ffffff\" opacity=\".42\"/>\n        <path d=\"M842 160 H876 Q906 160 918 180 Q930 200 930 232 V1228 Q930 1284 880 1300 L842 1308 Z\" fill=\"#b7c3d4\" opacity=\".55\"/>\n        <path d=\"M250 160 C390 148 670 146 834 162\" stroke=\"#ffffff\" stroke-opacity=\".46\" stroke-width=\"7\" fill=\"none\" stroke-linecap=\"round\"/>\n        <path d=\"M368 162 L626 938\" stroke=\"#ffffff\" stroke-opacity=\".16\" stroke-width=\"6\"/>\n        <line x1=\"158\" y1=\"1018\" x2=\"926\" y2=\"1018\" stroke=\"#6e8098\" stroke-opacity=\".55\" stroke-width=\"4\"/>\n      </g>\n\n      <g id=\"lightningGroup\" transform=\"translate(-5 -30)\">\n        <path id=\"lightningGlow\" d=\"M575 468 L639 468 L607 576 L692 576 L544 786 L582 642 L488 642 Z\" fill=\"#ffcb34\" opacity=\"__ELECTRIC_GLOW__\" filter=\"url(#warmGlow)\"/>\n        <path id=\"lightningBolt\" d=\"M575 468 L639 468 L607 576 L692 576 L544 786 L582 642 L488 642 Z\" fill=\"url(#lightningGrad)\" stroke=\"#fff3b8\" stroke-width=\"3\"/>\n      </g>\n\n      <g id=\"controlPanelGroup\">\n        <rect id=\"controlPanelFrame\" x=\"372\" y=\"780\" width=\"376\" height=\"332\" rx=\"28\" fill=\"#dce6ef\" stroke=\"#51657e\" stroke-width=\"3\"/>\n        <rect id=\"controlPanelInner\" x=\"388\" y=\"796\" width=\"344\" height=\"300\" rx=\"24\" fill=\"url(#panelDark)\" stroke=\"#6fd4ff\" stroke-opacity=\".55\" stroke-width=\"2.6\"/>\n        <path d=\"M400 806 H560 L520 1090 H400 Z\" fill=\"#ffffff\" opacity=\".10\"/>\n\n        <g id=\"powerDisplayGroup\">\n          <rect id=\"powerDisplayFrame\" x=\"448\" y=\"820\" width=\"224\" height=\"58\" rx=\"12\" fill=\"#0a1321\" stroke=\"#67c9ff\" stroke-opacity=\".45\" stroke-width=\"2\"/>\n          <text x=\"470\" y=\"844\" font-size=\"12\" fill=\"#75c9ff\" font-family=\"monospace\">POWER DRAW</text>\n          <text id=\"powerKwDisplay\" x=\"470\" y=\"868\" font-size=\"30\" fill=\"#eef9ff\" font-family=\"monospace\" font-weight=\"700\">__ELECTRIC_POWER__</text>\n        </g>\n\n        <g id=\"ringGroup\">\n          <circle id=\"ringBg\" cx=\"560\" cy=\"960\" r=\"62\" fill=\"none\" stroke=\"#203043\" stroke-width=\"16\" stroke-linecap=\"round\" transform=\"rotate(-218.4 560 960)\" stroke-dasharray=\"281.35 389.56\"/>\n          <g id=\"powerRing\">__ELECTRIC_SEGMENTS__</g>\n          <g id=\"tickMarks\" opacity=\".55\">__ELECTRIC_TICKS__</g>\n          <circle id=\"knobOuter\" cx=\"560\" cy=\"960\" r=\"48\" fill=\"#09111b\" stroke=\"#8dc8ff\" stroke-opacity=\".28\" stroke-width=\"3\"/>\n          <circle id=\"knobInner\" cx=\"560\" cy=\"960\" r=\"38\" fill=\"url(#metalGrad)\" stroke=\"#243548\" stroke-width=\"3\"/>\n          <path id=\"knobIndicator\" d=\"M560 960 L560 924\" stroke=\"#eaf8ff\" stroke-width=\"6\" stroke-linecap=\"round\" transform=\"rotate(__ELECTRIC_KNOB__ 560 960)\"/>\n          <circle id=\"knobHub\" cx=\"560\" cy=\"960\" r=\"9\" fill=\"#20354d\"/>\n          <text id=\"powerPercentText\" x=\"560\" y=\"968\" font-size=\"19\" fill=\"#d6f2ff\" font-family=\"monospace\" font-weight=\"700\" text-anchor=\"middle\">__ELECTRIC_PERCENT__</text>\n        </g>\n\n        <g id=\"waterDisplayGroup\">\n          <rect id=\"waterDisplayFrame\" x=\"430\" y=\"1036\" width=\"260\" height=\"46\" rx=\"12\" fill=\"#0a1321\" stroke=\"#67c9ff\" stroke-opacity=\".45\" stroke-width=\"2\"/>\n<text x=\"526\" y=\"1048\" font-size=\"11\" fill=\"#75c9ff\" font-family=\"monospace\">WATER TEMP</text>\n          <text id=\"waterTempDisplay\" x=\"560\" y=\"1074\" font-size=\"28\" fill=\"#eef9ff\" font-family=\"monospace\" font-weight=\"700\" text-anchor=\"middle\">__ELECTRIC_TEMP__</text>\n        </g>\n      </g>\n\n      <g id=\"connectorsGroup\">\n        <g id=\"leftConnector\" transform=\"translate(340 1320)\">\n          <rect x=\"0\" y=\"0\" width=\"70\" height=\"90\" rx=\"12\" fill=\"url(#metalGrad)\" stroke=\"#d4ebff\" stroke-width=\"3\"/>\n          <rect x=\"10\" y=\"74\" width=\"50\" height=\"12\" rx=\"4\" fill=\"#1fb4ff\" opacity=\".7\" filter=\"url(#softGlow)\"/>\n        </g>\n        <g id=\"rightConnector\" transform=\"translate(686 1320)\">\n          <rect x=\"0\" y=\"0\" width=\"76\" height=\"100\" rx=\"12\" fill=\"#b88b33\" stroke=\"#ffe3a4\" stroke-width=\"3\"/>\n          <rect x=\"10\" y=\"82\" width=\"56\" height=\"12\" rx=\"4\" fill=\"#1fb4ff\" opacity=\".7\" filter=\"url(#softGlow)\"/>\n        </g>\n      </g>\n    ";
  const clamp=(v,min,max,otherwise)=>v!==''&&v!=null&&typeof v!=='boolean'&&Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):otherwise;
  const read=(h,e)=>{
    const item=e&&h?.states?.[e],value=item?.state;
    if(value===undefined||value===null||typeof value==='boolean'||String(value).trim()===''||!Number.isFinite(Number(value)))return null;
    return {value:Number(value),unit:String(item.attributes?.unit_of_measurement??'').trim()};
  };
  const power=(h,e)=>{
    const r=read(h,e);if(!r||r.value<0)return null;
    if(r.unit==='W')return r.value/1000;
    if(r.unit==='kW')return r.value;
    return null;
  };
  const temperature=(h,e)=>{
    const r=read(h,e);
    if(!r||!['','°C','C','°F','F'].includes(r.unit))return null;
    const t=r.unit==='°F'||r.unit==='F'?(r.value-32)*5/9:r.value;
    return t>=-40&&t<=150?t:null;
  };
  const load=(h,node)=>{
    if(node.electric_load_entity){
      const r=read(h,node.electric_load_entity);
      return r&&['','%','percent'].includes(r.unit)&&r.value>=0&&r.value<=100?r.value:null;
    }
    const kw=power(h,node.electric_power_entity);
    const rated=clamp(node.electric_max_kw,.1,100,8);
    return kw===null?null:clamp(kw/rated*100,0,100,0);
  };
  const geometry=node=>{
    const sx=clamp(node?.width_scale,.5,2.4,1),sy=clamp(node?.height_scale,.5,2.4,1);
    // Actual rendered steel shell bounds, not the demo SVG's generous viewBox.
    const centerX=70,centerY=55,baseX=20,baseY=-102;
    const baseWidth=100,baseHeight=330;
    return {x:centerX+(baseX-centerX)*sx,y:centerY+(baseY-centerY)*sy,
      width:baseWidth*sx,height:baseHeight*sy,
      labelY:centerY+(244-centerY)*sy,readingY:centerY+(255-centerY)*sy,
      centerX,centerY,sx,sy};
  };
  const palette=p=>{
    const values=[[0,[255,59,31]],[.55,[255,176,0]],[1,[255,230,106]]];
    const t=clamp(p,0,1,0),k=t<=.55?1:2,a=values[k-1],b=values[k];
    const alpha=(t-a[0])/(b[0]-a[0]);
    return '#'+a[1].map((v,i)=>Math.round(v+(b[1][i]-v)*alpha).toString(16).padStart(2,'0')).join('');
  };
  const ringSegments=value=>{
    if(value===null||value<=0)return '';
    // Segment by arc length, so the gradient follows the circular ring itself.
    // Preserve source ring-only -34% rotation; do not rotate the knob or ticks.
    const start=-218.4*Math.PI/180,sweep=260*Math.PI/180,r=62,cx=560,cy=960;
    const steps=Math.ceil(100*value/100);
    let markup='';
    for(let i=0;i<steps;i++){
      const a=start+sweep*i/100,b=start+sweep*Math.min(i+1,value)/100;
      if(b<=a)break;
      const point=q=>(cx+r*Math.cos(q)).toFixed(3)+' '+(cy+r*Math.sin(q)).toFixed(3);
      markup+='<path d="M'+point(a)+' A62 62 0 0 1 '+point(b)+'" stroke="'+palette((i+.5)/100)+
        '" stroke-width="16" stroke-linecap="butt" fill="none"/>';
    }
    return markup;
  };
  const ticks=()=>{
    let markup='';
    for(let i=0;i<20;i++){
      const angle=(-130+260*i/19)*Math.PI/180;
      const c=Math.cos(angle),s=Math.sin(angle);
      const x1=(560+72*c).toFixed(2),y1=(960+72*s).toFixed(2);
      const x2=(560+82*c).toFixed(2),y2=(960+82*s).toFixed(2);
      markup+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+
        '" stroke="#7acfff" stroke-opacity="'+(i%5===0?'.62':'.26')+
        '" stroke-width="'+(i%5===0?'3':'2')+'" stroke-linecap="round"/>';
    }
    return markup;
  };
  const TICKS=ticks();
  const render=(node,h)=>{
    const kw=power(h,node.electric_power_entity);
    const t=temperature(h,node.entity);
    const percent=load(h,node);
    const glow=clamp(node.electric_glow,0,100,60)/100;
    const active=percent!==null&&percent>0;
    const scale=geometry(node),knob=-130+260*(percent??0)/100;
    const namespace='sselectric'+String(node.id||'electric').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,25);
    let body=SVG_TEMPLATE
      .replace('__ELECTRIC_POWER__',kw===null?'—':kw.toFixed(2)+' kW')
      .replace('__ELECTRIC_PERCENT__',percent===null?'—':Math.round(percent)+'%')
      .replace('__ELECTRIC_TEMP__',t===null?'—':t.toFixed(1)+'°C')
      .replace('__ELECTRIC_SEGMENTS__',ringSegments(percent))
      .replace('__ELECTRIC_TICKS__',TICKS)
      .replace('__ELECTRIC_KNOB__',knob.toFixed(2))
      .replace('__ELECTRIC_GLOW__',active?(.10+glow*.34).toFixed(2):'0.03');
    body=body.replace(/(\bid=")([^"]+)(")/g,(_,a,name,c)=>a+namespace+name+c)
      .replace(/url\(#([^)]+)\)/g,(_,name)=>'url(#'+namespace+name+')');
    return '<g class="ss-modern-electric-boiler" data-load="'+(percent===null?'unknown':percent.toFixed(1))+
      '" data-power="'+(kw===null?'unknown':kw.toFixed(2))+'">'+
      '<g class="ss-electric-dimensions" transform="translate(70 55) scale('+scale.sx+' '+scale.sy+') translate(-70 -55)">'+
      '<g transform="translate(20 -102) scale(.13 .255) translate(-158 -132)">'+body+'</g></g></g>';
  };
  return {render,geometry,power,temperature,load,ringSegments,palette};
})();
