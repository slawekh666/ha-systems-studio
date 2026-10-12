/* Modular SVG hot-water tank for the Custom designer. No HA service calls.
 * Adapted visually from the six user-supplied SVG demonstrations.
 * The temperature field is measured/interpolated; heater halos are visual only.
 */
const HASSStudioTank = (() => {
  const num = v => v !== '' && v != null && Number.isFinite(Number(v));
  const clamp = (v,lo,hi,fallback=lo) => num(v) ? Math.max(lo,Math.min(hi,Number(v))) : fallback;
  const safe = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const ident = v => String(v).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,42);
  const state = (h,e) => e && h?.states?.[e] ? h.states[e] : null;
  const active = (h,e) => ['on','active','heat','heating','running','open'].includes(String(state(h,e)?.state||'').toLowerCase());
  const temperature = (h,e) => {
    const s=state(h,e),v=s?.state;
    if (!num(v) || ['unknown','unavailable'].includes(String(v))) return null;
    const unit=s?.attributes?.unit_of_measurement;
    if (unit && !['°C','C','°F','F'].includes(unit)) return null;
    const c=unit==='°F'||unit==='F' ? (Number(v)-32)*5/9 : Number(v);
    return c>=-40 && c<=150 ? c : null;
  };
  const color = t => {
    if (!num(t)) return '#506780';
    const palette=[[0,[28,88,218]],[20,[25,162,228]],[40,[132,87,217]],[60,[224,65,136]],[80,[239,49,63]],[100,[255,108,44]]];
    const v=clamp(t,0,100,0);
    for(let i=1;i<palette.length;i++) if(v<=palette[i][0]){
      const a=palette[i-1],b=palette[i],k=(v-a[0])/(b[0]-a[0]);
      return '#'+a[1].map((n,j)=>Math.round(n+(b[1][j]-n)*k).toString(16).padStart(2,'0')).join('');
    }
    return '#ff6c2c';
  };
  // Location values are percentages of the main water compartment.
  const X=35,Y=15,IW=50,IH=92;
  const point = p => ({x:X+IW*clamp(p.x,0,100,50)/100,
    y:Y+IH*(100-clamp(p.height,0,100,50))/100});
  const boundaries = parts => {
    const horizontal=parts.filter(p=>p.kind==='baffle_horizontal').map(p=>({at:point(p).y,leak:clamp(p.permeability,0,1,.35)})).sort((a,b)=>a.at-b.at);
    const vertical=parts.filter(p=>p.kind==='baffle_vertical').map(p=>({at:point(p).x,leak:clamp(p.permeability,0,1,0)})).sort((a,b)=>a.at-b.at);
    return {horizontal,vertical};
  };
  const regions = barriers => {
    const x=[X,...barriers.vertical.map(v=>v.at),X+IW];
    const y=[Y,...barriers.horizontal.map(v=>v.at),Y+IH];
    const out=[];
    for(let row=1;row<y.length;row++)for(let col=1;col<x.length;col++)
      if(y[row]>y[row-1]+.01 && x[col]>x[col-1]+.01)
        out.push({x:x[col-1],y:y[row-1],w:x[col]-x[col-1],h:y[row]-y[row-1]});
    return out;
  };
  const permeability = (a,b,barriers) => {
    let pass=1;
    for(const cut of barriers.horizontal) if((a.y<cut.at && b.y>cut.at)||(b.y<cut.at && a.y>cut.at))pass*=cut.leak;
    for(const cut of barriers.vertical) if((a.x<cut.at && b.x>cut.at)||(b.x<cut.at && a.x>cut.at))pass*=cut.leak;
    return pass;
  };
  const stops = (sensors,h) => {
    const measurements=sensors.map(p=>({height:clamp(p.height,0,100,50),t:temperature(h,p.entity)}))
      .filter(p=>p.t!==null).sort((a,b)=>b.height-a.height);
    if(!measurements.length) return '<stop stop-color="#506780"/><stop offset="1" stop-color="#506780"/>';
    const points=[{height:100,t:measurements[0].t},...measurements,{height:0,t:measurements[measurements.length-1].t}];
    return points.map(p=>'<stop offset="'+(100-p.height)+'%" stop-color="'+color(p.t)+'"/>').join('');
  };
  const badge = (p,h,at,kind,parentScale=1,edges=null) => {
    const isSensor=kind==='sensor';
    const reading=isSensor?temperature(h,p.entity):null;
    const enabled=p.mode==='on'||(p.mode!=='off'&&active(h,p.entity));
    const powerState=state(h,p.power_entity),watts=powerState&&num(powerState.state)?Number(powerState.state):null;
    const powerUnit=powerState?.attributes?.unit_of_measurement;
    const powerText=watts!==null && ['W','kW'].includes(powerUnit)?(watts/(powerUnit==='W'?1000:1)).toFixed(1)+' kW':(enabled?'ON':'OFF');
    const value=isSensor?(reading===null?'—':reading.toFixed(1)+'°'):powerText;
    const caption=String(p.label||'').slice(0,28),wide=Math.max(38,22+value.length*5.4,caption.length*4.5+12);
    const side=p.side==='right'?'right':p.side==='inside'?'inside':'left';
    const x=side==='left'?(edges?.left??19):side==='right'?(edges?.right??101):at.x;
    const bx=side==='left'?x-wide-3:side==='right'?x+3:x-wide/2;
    const by=at.y-(caption?15:10);
    const bg=isSensor?(reading===null?'#4d5865':color(reading)):(enabled?'#ec4a30':'#464c57');
    const scale=clamp(p.display_scale,.5,2,1)/clamp(parentScale,.5,2.4,1);
    const icon=isSensor?'<path d="M0 -6v9a4 4 0 1 0 4 0v-9a2 2 0 0 0-4 0ZM2 -2v7" fill="none" stroke="white" stroke-width="1.2" stroke-linecap="round"/>':
      '<path d="M3 -7L-2 1H2L0 8L7 -2H3Z" fill="white"/>';
    const marker=side==='left'?(edges?.markerLeft??30):side==='right'?(edges?.markerRight??90):at.x;
    return '<g class="ss-tank-badge ss-temperature-badge"'+(p.entity?' data-more="'+safe(p.entity)+'"':'')+
      ' transform="translate('+at.x+' '+at.y+') scale('+scale+') translate('+(-at.x)+' '+(-at.y)+')">'+
      (side==='inside'?'':'<path d="M'+marker+' '+at.y+'H'+(side==='left'?x:x)+'" stroke="'+bg+'" stroke-width="1.3"/>')+
      '<circle cx="'+marker+'" cy="'+at.y+'" r="2.5" fill="'+bg+'" stroke="#ebf3ff" stroke-width=".9"/>'+
      '<rect x="'+bx+'" y="'+by+'" width="'+wide+'" height="'+(caption?29:21)+'" rx="10.5" fill="'+bg+
      '" stroke="#f7e7e7" stroke-opacity=".8" stroke-width=".8"/>'+
      '<g transform="translate('+(bx+9)+' '+(by+(caption?16:11))+') scale(.82)">'+icon+'</g>'+
      (caption?'<text x="'+(bx+wide/2+6)+'" y="'+(by+10)+'" text-anchor="middle" font-size="6.2" fill="#fff" opacity=".9">'+safe(caption)+'</text>':'')+
      '<text x="'+(bx+wide/2+6)+'" y="'+(by+(caption?23:14.5))+'" text-anchor="middle" font-size="9.7" fill="#fff" font-weight="700">'+safe(value)+'</text></g>';
  };
  const heater = (p,h,at,n,base,regionsList,barriers,defs) => {
    const enabled=p.mode==='on'||(p.mode!=='off'&&active(h,p.entity));
    const level=clamp(p.power,0,100,75)/100,atRight=p.side==='right';
    const length=clamp(p.width,10,90,58)*.45;
    const edge=atRight?X+IW-2:X+2,dx=atRight?-length:length;
    const y=at.y,rod=atRight?edge-2:edge+2;
    const d='M'+rod+' '+(y-5)+'h'+dx+'q'+(atRight?-4:4)+' 0 '+(atRight?-4:4)+' 5q0 5 '+(atRight?4:-4)+' 5h'+(-dx)+
      'M'+rod+' '+y+'h'+(dx*.9);
    const token=base+'Heat'+ident(p.id),glow=base+'Halo'+ident(p.id);
    defs.push('<radialGradient id="'+glow+'"><stop stop-color="#fff2a9" stop-opacity=".82"/><stop offset=".22" stop-color="#ff772a" stop-opacity=".72"/><stop offset=".65" stop-color="#ed3b28" stop-opacity=".25"/><stop offset="1" stop-color="#e23f2c" stop-opacity="0"/></radialGradient>');
    const halos=enabled?regionsList.map((r,i)=>{
      const centre={x:r.x+r.w/2,y:r.y+r.h/2},permeable=permeability(at,centre,barriers);
      if(permeable<.001)return '';
      const clip=token+'Clip'+i;
      defs.push('<clipPath id="'+clip+'"><rect x="'+r.x+'" y="'+r.y+'" width="'+r.w+'" height="'+r.h+'"/></clipPath>');
      return '<g clip-path="url(#'+clip+')"><ellipse cx="'+(at.x+(atRight?-8:8))+'" cy="'+y+
        '" rx="'+(12+length)+'" ry="'+(12+level*12)+'" fill="url(#'+glow+')" opacity="'+(level*permeable).toFixed(3)+'"/></g>';
    }).join(''):'';
    return '<g class="ss-tank-heater"'+(p.entity?' data-more="'+safe(p.entity)+'"':'')+'>'+
      halos+'<g clip-path="url(#'+base+'WaterClip)">'+
      '<path d="'+d+'" fill="none" stroke="#2f3c51" stroke-width="3.9" stroke-linecap="round"/>'+
      '<path d="'+d+'" fill="none" stroke="'+(enabled?'#ff662d':'#b1beca')+'" stroke-width="2.6" stroke-linecap="round"/>'+
      (enabled?'<path d="'+d+'" fill="none" stroke="#fff1b1" opacity="'+(.25+level*.7)+'" stroke-width=".8" stroke-linecap="round"/>':'')+
      '</g><ellipse cx="'+edge+'" cy="'+y+'" rx="2.2" ry="7.5" fill="url(#'+base+'Steel)" stroke="#e6f1ff" stroke-width=".6"/></g>';
  };
  // One continuous hydraulic route: straight vertical inlet and rising elliptical spiral.
  // Repeated SVG strokes share EXACTLY the same d path; there are no glow/blur filters.
  const coilPath = (p,at) => {
    const height=clamp(p.length,15,95,58)*IH/100,turns=Math.round(clamp(p.turns,3,22,12));
    const radius=clamp(p.width,10,95,65)*IW/200;
    const top=Math.max(Y+2,Math.min(Y+IH-height-2,at.y-height/2));
    const bottom=top+height,pitch=height/(turns+.4);
    const left=at.x-radius,right=at.x+radius;
    const fmt=v=>v.toFixed(3);
    let d='M'+fmt(left)+' '+fmt(top)+'L'+fmt(left)+' '+fmt(bottom);
    for(let i=0;i<turns;i++){
      const y=bottom-i*pitch,next=y-pitch;
      // Front and rear half-curves produce an oval loop, not a sinusoidal zigzag.
      d+='C'+fmt(left+radius*.35)+' '+fmt(y+pitch*.58)+' '+fmt(right)+' '+fmt(y+pitch*.58)+
        ' '+fmt(right)+' '+fmt(y+pitch*.03);
      d+='C'+fmt(right)+' '+fmt(y-pitch*.58)+' '+fmt(left+radius*.28)+' '+fmt(next-pitch*.25)+
        ' '+fmt(left)+' '+fmt(next);
    }
    d+='L'+fmt(left)+' '+fmt(top);
    return {d,top,bottom,turns,stemX:left};
  };
  const coil = (p,h,at,base,defs) => {
    const geometry=coilPath(p,at),d=geometry.d;
    const grad=base+'Coil'+ident(p.id);
    defs.push('<linearGradient id="'+grad+'" x1="0" y1="'+geometry.top+'" x2="0" y2="'+geometry.bottom+'" gradientUnits="userSpaceOnUse">'+
      '<stop stop-color="#ff5c27"/><stop offset=".27" stop-color="#f45aa0"/><stop offset=".58" stop-color="#9557e4"/><stop offset="1" stop-color="#25baff"/></linearGradient>');
    const running=p.flow_mode==='on'||(p.flow_mode!=='off'&&active(h,p.entity));
    return '<g class="ss-tank-coil"'+(p.entity?' data-more="'+safe(p.entity)+'"':'')+' clip-path="url(#'+base+'WaterClip)">'+
      '<path d="'+d+'" fill="none" stroke="#17243c" stroke-width="4.6" stroke-linejoin="round" stroke-linecap="round"/>'+
      '<path d="'+d+'" fill="none" stroke="url(#'+grad+')" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>'+
      '<path d="'+d+'" fill="none" stroke="#f3f5ff" opacity=".35" stroke-width=".75" stroke-linejoin="round" stroke-linecap="round"/>'+
      (running?'<path class="ss-tank-coil-flow" d="'+d+'" fill="none" stroke="#fff" stroke-width="1.3" stroke-dasharray="2 7" style="--ss-coil-speed:'+clamp(p.flow_speed,.35,5,1)+'s;animation-direction:'+(p.flow_direction==='reverse'?'reverse':'normal')+'"/>':'')+'</g>';
  };
  const plate = (p,at,base) => {
    if(p.kind==='baffle_horizontal'){
      const leak=clamp(p.permeability,0,1,.35),holes=leak>0 ? Array.from({length:7},(_,i)=>{
        const cx=X+5+i*(IW-10)/6;
        return '<ellipse cx="'+cx+'" cy="'+at.y+'" rx="'+(.65+leak*1.5)+'" ry="'+(.4+leak*.65)+'" fill="#122c4e" stroke="#b6cced" stroke-width=".32"/>';
      }).join(''):'';
      return '<g class="ss-tank-baffle" clip-path="url(#'+base+'WaterClip)"><ellipse cx="60" cy="'+at.y+'" rx="25" ry="4.1" fill="#476c9d" stroke="#bfd7f0" stroke-width=".9"/>'+
        '<ellipse cx="60" cy="'+(at.y-1)+'" rx="24" ry="2.8" fill="#83a8d0" opacity=".55"/>'+holes+'</g>';
    }
    const x=at.x;
    return '<g class="ss-tank-baffle" clip-path="url(#'+base+'WaterClip)"><path d="M'+x+' 15Q'+(x+3)+' 59 '+x+' 107L'+(x+3)+' 107Q'+(x+6)+' 58 '+(x+3)+' 15Z" fill="#536f99" stroke="#d4e8ff" stroke-width=".9"/>'+
      '<path d="M'+(x+.9)+' 18Q'+(x+3.8)+' 59 '+(x+.9)+' 104" fill="none" stroke="#c9ddfa" opacity=".6" stroke-width="1"/></g>';
  };
  const innerTank = (p,n,h,base,defs) => {
    const cx=point(p).x;
    const w=clamp(p.width,20,72,45)*IW/100,ht=clamp(p.length,20,85,58)*IH/100;
    const top=Math.max(Y+2,Math.min(Y+IH-ht-2,point(p).y-ht/2));
    const x=Math.max(X+1,Math.min(X+IW-w-1,cx-w/2));
    const own=(n.parts||[]).filter(q=>q.kind==='sensor'&&q.container==='inner');
    const grad=base+'InnerTemp',clip=base+'InnerClip';
    defs.push('<linearGradient id="'+grad+'" x1="0" y1="0" x2="0" y2="1">'+stops(own,h)+'</linearGradient>'+
      '<clipPath id="'+clip+'"><rect x="'+x+'" y="'+top+'" width="'+w+'" height="'+ht+'" rx="'+(w*.38)+'"/></clipPath>');
    return '<g class="ss-tank-inner" clip-path="url(#'+base+'WaterClip)"><rect x="'+x+'" y="'+top+'" width="'+w+'" height="'+ht+'" rx="'+(w*.38)+'" fill="url(#'+grad+')" stroke="#d8e7fa" stroke-width="1.15"/>'+
      '<rect x="'+x+'" y="'+top+'" width="'+w+'" height="'+ht+'" rx="'+(w*.38)+'" fill="#e6f1ff" fill-opacity=".12"/>'+
      '<path d="M'+(x+2.5)+' '+(top+7)+'v'+(ht-14)+'" stroke="#fff" stroke-width="2.2" stroke-opacity=".3"/>'+
      '<path d="M'+(x+w-2.5)+' '+(top+7)+'v'+(ht-14)+'" stroke="#fff" stroke-width="1.3" stroke-opacity=".3"/></g>';
  };
  const render=(n,h) => {
    const parts=Array.isArray(n.parts)?n.parts:[];
    const base='sst'+ident(n.id),defs=[],barriers=boundaries(parts),zones=regions(barriers);
    defs.push('<linearGradient id="'+base+'Steel" x1="0" y1="0" x2="1" y2="0">'+
      '<stop stop-color="#607d9e"/><stop offset=".08" stop-color="#edf6ff"/><stop offset=".21" stop-color="#829cbe"/><stop offset=".47" stop-color="#d5e5f9"/><stop offset=".66" stop-color="#596f91"/><stop offset=".85" stop-color="#e4f0ff"/><stop offset="1" stop-color="#577190"/></linearGradient>'+
      '<linearGradient id="'+base+'Gloss" x1="0" y1="0" x2="1" y2="0">'+
      '<stop stop-color="#fff" stop-opacity=".3"/><stop offset=".18" stop-color="#fff" stop-opacity=".05"/><stop offset=".62" stop-color="#fff" stop-opacity=".02"/><stop offset="1" stop-color="#fff" stop-opacity=".25"/></linearGradient>'+
      '<clipPath id="'+base+'WaterClip"><rect x="'+X+'" y="'+Y+'" width="'+IW+'" height="'+IH+'" rx="8"/></clipPath>');
    const sensors=parts.filter(p=>p.kind==='sensor'&&p.container!=='inner');
    const sealedH=barriers.horizontal.filter(b=>b.leak===0),sealedV=barriers.vertical.filter(b=>b.leak===0);
    const xEdges=[X,...sealedV.map(v=>v.at),X+IW],yEdges=[Y,...sealedH.map(v=>v.at),Y+IH];
    let water='';
    for(let iy=1;iy<yEdges.length;iy++)for(let ix=1;ix<xEdges.length;ix++){
      const x0=xEdges[ix-1],y0=yEdges[iy-1],x1=xEdges[ix],y1=yEdges[iy],id=base+'Field'+ix+'x'+iy;
      const selected=sensors.filter(s=>{const p=point(s);return p.x>=x0-.01&&p.x<=x1+.01&&p.y>=y0-.01&&p.y<=y1+.01;});
      // The gradient coordinates are global, keeping each temperature sensor anchored at its real height.
      const values=selected.map(p=>({y:point(p).y,t:temperature(h,p.entity)})).filter(p=>p.t!==null).sort((a,b)=>a.y-b.y);
      let points=values.length?[{y:Y,t:values[0].t},...values,{y:Y+IH,t:values[values.length-1].t}]:[];
      defs.push('<linearGradient id="'+id+'" x1="0" y1="'+Y+'" x2="0" y2="'+(Y+IH)+'" gradientUnits="userSpaceOnUse">'+
        (points.length?points.map(q=>'<stop offset="'+(100*(q.y-Y)/IH).toFixed(3)+'%" stop-color="'+color(q.t)+'"/>').join(''):
          '<stop stop-color="#506780"/><stop offset="1" stop-color="#506780"/>')+'</linearGradient>');
      if(x1>x0 && y1>y0)water+='<rect x="'+x0+'" y="'+y0+'" width="'+(x1-x0)+'" height="'+(y1-y0)+'" fill="url(#'+id+')"/>';
    }
    const inside=[];
    // Perforated baffles transmit a configurable fraction of decorative heat halos.
    const heaters=parts.filter(p=>p.kind==='heater');
    for(const part of heaters)inside.push(heater(part,h,point(part),n,base,zones,barriers,defs));
    for(const p of parts.filter(p=>p.kind==='coil'))inside.push(coil(p,h,point(p),base,defs));
    const inner=parts.find(p=>p.kind==='inner_tank');
    if(inner)inside.push(innerTank(inner,n,h,base,defs));
    for(const part of parts.filter(p=>p.kind==='baffle_horizontal'||p.kind==='baffle_vertical'))inside.push(plate(part,point(part),base));
    const nonUniform=n.scale_mode==='free';
    const sx=nonUniform?clamp(n.width_scale,.5,2.4,1):1;
    const sy=nonUniform?clamp(n.height_scale,.5,2.4,1):1;
    const remap=at=>({x:60+(at.x-60)*sx,y:61+(at.y-61)*sy});
    const edges={left:60+(19-60)*sx,right:60+(101-60)*sx,
      markerLeft:60+(30-60)*sx,markerRight:60+(90-60)*sx};
    // Draw annotations outside the non-uniform transform so text and icons remain undistorted.
    const badges=parts.filter(p=>p.kind==='sensor'||p.kind==='heater')
      .map(p=>badge(p,h,remap(point(p)),p.kind,n.scale,edges)).join('');
    return '<g class="ss-modular-tank"><defs>'+defs.join('')+'</defs>'+ 
      '<g class="ss-tank-body" transform="translate(60 61) scale('+sx+' '+sy+') translate(-60 -61)">'+
      '<rect x="32" y="111" width="5" height="7" rx="1.3" fill="#839bb9"/>'+
      '<rect x="83" y="111" width="5" height="7" rx="1.3" fill="#839bb9"/>'+
      '<rect x="26" y="4" width="68" height="110" rx="12" fill="url(#'+base+'Steel)" stroke="#e6f2ff" stroke-width=".65"/>'+
      '<rect x="31.5" y="10" width="57" height="100" rx="10" fill="#2b405c" stroke="#b2c8df" stroke-width=".45"/>'+
      '<rect x="34" y="13.5" width="52" height="94" rx="9" fill="#091e38"/>'+
      '<g clip-path="url(#'+base+'WaterClip)">'+water+
      '<rect x="'+X+'" y="'+Y+'" width="'+IW+'" height="'+IH+'" fill="url(#'+base+'Gloss)" opacity=".52"/></g>'+
      inside.join('')+
      '<rect x="34" y="13.5" width="52" height="94" rx="9" fill="none" stroke="#d0eaff" stroke-width=".9" stroke-opacity=".57"/>'+
      '<path d="M29 15Q26 40 29 100" stroke="#fff" opacity=".3" stroke-width="2.5" fill="none"/>'+
      '<path d="M91 15Q94 40 91 100" stroke="#fff" opacity=".15" stroke-width="2.5" fill="none"/>'+
      '</g>'+badges+'</g>';
  };
  const styles='<style>@keyframes ssTankFlow{to{stroke-dashoffset:-36}}'+
    '.ss-tank-coil-flow{animation:ssTankFlow var(--ss-coil-speed,1s) linear infinite}'+
    '.ss-modular-tank [data-more]{cursor:pointer}</style>';
  return {render,styles,temperature,color,regions,boundaries,permeability,coilPath};
})();