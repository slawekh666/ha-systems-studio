/* Modern electric boiler based on supplied piec_elektryczny_svg_js.html.
 * Three HA measurements: power (W / kW), water temperature (°C / °F),
 * optional electrical load percent. No control actions, no polling.
 */
const HASSStudioElectricBoiler=(()=>{
  // Source artwork: src/icons/electric-boiler.svg
  const clamp=(v,min,max,otherwise)=>v!==''&&v!=null&&typeof v!=='boolean'&&Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):otherwise;
  const read=HASSStudioHA.reading;
  const power=HASSStudioHA.powerKw;
  const temperature=HASSStudioHA.temperature;
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
    const body = HASSStudioSvg.namespaceIds(
      HASSStudioSvg.inject(
        HASSStudioSvg.apply(HASSStudioIconTemplates.electricBoiler, {
          lightningGlow: { opacity: active ? (.10 + glow * .34).toFixed(2) : '0.03' },
          powerKwDisplay: { text: kw === null ? '—' : kw.toFixed(2) + ' kW' },
          knobIndicator: { transform: 'rotate(' + knob.toFixed(2) + ' 560 960)' },
          powerPercentText: { text: percent === null ? '—' : Math.round(percent) + '%' },
          waterTempDisplay: { text: t === null ? '—' : t.toFixed(1) + '°C' }
        }), { powerRing: ringSegments(percent), tickMarks: TICKS }
      ), namespace
    );
    return '<g class="ss-modern-electric-boiler" data-load="'+(percent===null?'unknown':percent.toFixed(1))+
      '" data-power="'+(kw===null?'unknown':kw.toFixed(2))+'">'+
      '<g class="ss-electric-dimensions" transform="translate(70 55) scale('+scale.sx+' '+scale.sy+') translate(-70 -55)">'+
      '<g transform="translate(20 -102) scale(.13 .255) translate(-158 -132)">'+body+'</g></g></g>';
  };
  return {render,geometry,power,temperature,load,ringSegments,palette};
})();
