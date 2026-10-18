/* Pure SVG diagram renderer for the Custom designer.
 * Input is normalized layout and read-only HA states; pointer interaction
 * remains in the editor controller. Existing SVG paths/styles are unchanged.
 */
const HASSStudioCanvas = (() => {
  const create = ({W,H,colors,normalized,pickLang,words,clamp,validEntity,esc}) => {
  const formatReading=(v)=>Number.isFinite(Number(v))&&String(v).trim()!==''?Number(v).toFixed(1):String(v);
  const valueOf=(h,entity)=>{
    const state=validEntity(entity)?h?.states?.[entity]:null;
    return state && !['unknown','unavailable'].includes(state.state)
      ?formatReading(state.state)+(state.attributes?.unit_of_measurement?' '+state.attributes.unit_of_measurement:''):'';
  };
  const connectionPath=(points)=>points.map((point,i)=>(i?'L':'M')+point.x+' '+point.y).join(' ');
  // Translate all vertices by one snapped delta, retaining every bend and angle.
  // Clamp the common offset (not individual points), so geometry never deforms at bounds.
  const translateConnectionPoints=(points,dx,dy)=>{
    if(!Array.isArray(points)||!points.length)return [];
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
    const snap=v=>Math.round(v/5)*5;
    const x=clamp(snap(dx),-5000-Math.min(...xs),10000-Math.max(...xs),0);
    const y=clamp(snap(dy),-5000-Math.min(...ys),10000-Math.max(...ys),0);
    return points.map(p=>({x:p.x+x,y:p.y+y}));
  };
  const onConnection=(connection,t)=>{
    const points=connection.points, segments=[];
    let total=0;
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.y-a.y);
      segments.push(length);total+=length;
    }
    let remaining=total*clamp(t,0,100,50)/100;
    for(let i=1;i<points.length;i++){
      const length=segments[i-1];if(remaining<=length||i===points.length-1){
        const a=points[i-1],b=points[i],factor=length?remaining/length:0;
        return {x:a.x+(b.x-a.x)*factor,y:a.y+(b.y-a.y)*factor};
      }
      remaining-=length;
    }
    return points[0];
  };
  const variantShape=(node)=>{
    const v=node.variant;
    if(node.type==='tank'){
      let parts='<rect x="38" y="5" width="44" height="102" rx="17" fill="url(#ssTank)" stroke="#d3dfe6" stroke-width="2"/>';
      if(['coil','dual_coil','hygiene','combi'].includes(v))
        parts+='<path d="M46 60 Q73 49 73 62 Q73 71 46 75 Q41 81 68 86" fill="none" stroke="#f3c17c" stroke-width="3"/>';
      if(v==='dual_coil'||v==='combi')
        parts+='<path d="M46 23 Q73 15 73 29 Q73 39 46 43" fill="none" stroke="#f3c17c" stroke-width="3"/>';
      if(v==='stratified')parts+='<path d="M42 61H78" stroke="#dfebf2" stroke-opacity=".7" stroke-dasharray="4 3"/>';
      node.parts.forEach(part=>{
        const yy=101-(part.height/100)*93;
        const x=part.side==='left'?36:part.side==='right'?84:60;
        if(part.kind==='sensor')parts+='<circle cx="'+x+'" cy="'+yy+'" r="5" fill="#f4c078" stroke="#273b4c" stroke-width="1.6"/>';
        if(part.kind==='heater')parts+='<path d="M'+(x-10)+' '+yy+'h20m-16 -6v12m8 -12v12" stroke="#f8db92" stroke-width="3" fill="none"/>';
        if(part.kind==='coil')parts+='<path d="M'+(x-13)+' '+yy+'q7 -12 14 0t14 0" stroke="#f0cc93" stroke-width="3" fill="none"/>';
      });
      return parts;
    }
    if(node.type==='boiler'){
      let extra='';
      if(v==='wood'||v==='pellet')extra='<path d="M56 88Q39 74 59 49Q51 68 67 66Q84 83 56 88Z" fill="#ef8651"/>';
      if(v==='gas'||v==='oil')extra='<path d="M60 52Q39 77 61 88Q83 77 60 52Z" fill="#70b6ed"/>';
      if(v==='electric')extra='<path d="M64 48L48 74H59L53 92L78 64H64Z" fill="#f4c45f"/>';
      if(v==='heatpump')extra='<circle cx="60" cy="70" r="22" fill="none" stroke="#92c4e8" stroke-width="4"/><path d="M48 61L75 71L48 82Z" fill="#92c4e8"/>';
      return '<rect x="24" y="19" width="72" height="83" rx="8" fill="#465869" stroke="#b5c3ce" stroke-width="2"/>'+extra;
    }
    if(node.type==='solar')
      return v==='tube'
        ?'<g fill="#438eb9" stroke="#c4e4f5" stroke-width="2">'+[23,43,63,83].map(x=>'<rect x="'+x+'" y="30" width="13" height="68" rx="6"/>').join('')+'</g>'
        :'<path d="M25 27H100L85 100H10Z" fill="#337fac" stroke="#c4e4f5" stroke-width="2"/><path d="M44 27L30 100M67 27L54 100M88 27L76 100" stroke="#b7d5eb" stroke-width="2"/>';
    if(node.type==='pump')return '<circle cx="60" cy="65" r="30" fill="#425b71" stroke="#c3d1dc" stroke-width="2"/><path d="M48 44L81 65L48 86Z" fill="#e5edf5"/>';
    if(node.type==='valve')return '<path d="M13 42L60 66L13 90ZM107 42L60 66L107 90Z" fill="#527086" stroke="#b4c7d6" stroke-width="2"/>'+
      (v==='three_way'?'<path d="M39 104L60 66L81 104Z" fill="#527086" stroke="#b4c7d6" stroke-width="2"/>':'')+
      '<circle cx="60" cy="66" r="9" fill="#efc06e"/>';
    return '<circle cx="60" cy="64" r="28" fill="#47647a" stroke="#c0d2de" stroke-width="2"/>'+
      '<path d="M60 38V70" stroke="#ecf2f5" stroke-width="5"/><circle cx="60" cy="79" r="9" fill="#f2bb74"/>';
  };
  // Existing SVG artwork remains unchanged; these read-only overlays expose
  // manual or HA state without inventing measurements for unassigned entities.
  const equipmentReading=(item,hass,isPump)=>{
    const mode=(item.equipment_mode||item.mode)==='manual'?'manual':'live';
    const speed=Math.max(.35,Math.min(5,Number(item.equipment_test_speed??item.test_speed)||1));
    if(mode==='manual'){
      const running=(item.equipment_test_running??item.test_running)===true;
      const position=Math.max(0,Math.min(100,Number(item.equipment_test_position??item.test_position)||0));
      return {mode,known:true,active:isPump?running:position>=5,position:isPump?null:position,speed};
    }
    const entity=HASSStudioHA.entity(hass,item.entity);
    const state=String(entity?.state??'').trim().toLowerCase();
    const reading=HASSStudioHA.percentage(hass,item.entity);
    if(isPump){
      if(['on','open','active','running','heating'].includes(state))return {mode,known:true,active:true,position:null,speed};
      if(['off','closed','idle','stopped','inactive'].includes(state))return {mode,known:true,active:false,position:null,speed};
      return {mode,known:false,active:false,position:null,speed};
    }
    const boolOn=['on','open','active','running'].includes(state),boolOff=['off','closed','inactive'].includes(state);
    const position=reading!==null?reading:boolOn?100:boolOff?0:null;
    return {mode,known:position!==null,active:position!==null&&position>=5,position,speed};
  };
  const equipmentOverlay=(node,hass)=>{
    const pump=node.type==='pump',state=equipmentReading(node,hass,pump);
    const color=!state.known?'#a7bbc8':state.active?'#68c69b':'#98a5b1';
    const status=!state.known?'unknown':state.active?'on':'off';
    return '<g class="ss-equipment-state" data-mode="'+state.mode+'" data-state="'+status+'"'+
      (pump?'':' data-position="'+(state.position===null?'unknown':state.position)+'"')+'>'+
      (pump&&state.active?'<circle class="ss-pump-pulse" cx="60" cy="65" r="29" fill="none" stroke="#68c69b" style="animation-duration:'+state.speed+'s"/>':'')+
      (pump?'<circle cx="60" cy="65" r="32" fill="none" stroke="'+color+'" stroke-width="2" opacity=".85"/>':
        '<circle cx="60" cy="66" r="12" fill="none" stroke="'+color+'" stroke-width="3"/>'+
        '<text x="60" y="113" text-anchor="middle" font-size="12" font-weight="600" fill="'+color+'">'+
        (state.position===null?'—':Math.round(state.position)+'%')+'</text>')+'</g>';
  };
  const symbolOnConnection=(item,connection,hass,language)=>{
    const at=onConnection(connection,item.position),isPump=item.type==='pump';
    const reading=equipmentReading(item,hass,isPump);
    const enabled=reading.active,caption=esc(item.label||words[language][item.type]||item.type);
    const known=reading.known,color=!known?'#a7bbc8':enabled?'#68c69b':'#d7e5ee';
    const status=!known?'unknown':enabled?'on':'off';
    return '<g transform="translate('+at.x+' '+at.y+')" class="ss-accessory" data-connection="'+esc(connection.id)+'"'+
      (item.entity?' data-more="'+esc(item.entity)+'"':'')+'>'+
      '<circle r="17" fill="#405669" stroke="'+color+'" stroke-width="2" data-state="'+status+'" data-mode="'+reading.mode+'"/>'+ 
      (isPump&&enabled?'<circle class="ss-pump-pulse" r="17" fill="none" stroke="#68c69b" style="animation-duration:'+reading.speed+'s"/>':'')+
      (isPump?'<path d="M-7 -10L10 0L-7 10Z" fill="#dceaf3"/>':
        '<path d="M-11 -8L0 0L-11 8ZM11 -8L0 0L11 8Z" fill="#e2c78d"/>')+
      '<text x="0" y="-25" text-anchor="middle" font-size="10.5" font-weight="600" fill="var(--primary-text-color,#e5edf5)" stroke="#252525" stroke-width="2" paint-order="stroke">'+caption+'</text>'+
      (!isPump?'<text x="0" y="31" font-size="11" font-weight="600" text-anchor="middle" fill="'+color+'">'+(reading.position===null?'—':Math.round(reading.position)+'%')+'</text>':'')+
      '</g>';
  };
  const canvasSvg=(config,hass,editable=false,selected=null)=>{
    const data=normalized(config),language=pickLang(config,hass),L=words[language];
    const energyFlow=HASSStudioEnergyFlow.resolve(data,hass);
    const w=data.width,h=data.height;
    const wwDefs=data.nodes.filter(node=>node.visual==='warmwasser' && !['radiator','manifold','power_grid','energy_storage','inverter','distribution_board','ev_charger','building'].includes(node.type) && !(node.type==='tank'&&node.variant==='modular') && !(node.type==='boiler'&&['solid_fuel','pellet_modern','heatpump_modern','gas_modern','electric_modern','fireplace_modern'].includes(node.variant)))
      .map(node=>HASSStudioGraphics.defs(node,hass)).join('');
    const connections=data.connections.map(connection=>{
      const d=connectionPath(connection.points),s=connection.style,a=connection.animation;
      const electric=connection.type==='electric';
      const settings={...s,...a};
      const powerVisual=electric?HASSStudioPowerFlow.visual(settings,hass,energyFlow.byConnection[connection.id]):null;
      const enabled=electric?(powerVisual?.active===true):HASSStudioAnimation.flowActive(a.flow_mode,hass,a.flow_entity);
      const motionArrows=()=>{
        if(!electric||!powerVisual||!enabled||powerVisual.pattern!=='arrows')return '';
        const pts=powerVisual.direction==='reverse'?[...connection.points].reverse():connection.points;
        const track=connectionPath(pts),size=powerVisual.size,half=+(size*.52).toFixed(2);
        const arrow='<path d="M'+(-size)+' '+(-half)+' L0 0 L'+(-size)+' '+half+
          '" fill="none" stroke="#fff" stroke-width="'+powerVisual.width+
          '" stroke-linecap="round" stroke-linejoin="round"/>';
        return [0,1,2].map(i=>'<g class="ss-power-arrow">'+arrow+
          '<animateMotion path="'+track+'" dur="'+a.flow_speed+
          's" begin="'+(-i*a.flow_speed/3).toFixed(3)+'s" repeatCount="indefinite" rotate="auto"/></g>').join('');
      };
      const endcap=(first)=>{
        if(electric||(first&&!s.cap_start)||(!first&&!s.cap_end))return '';
        const pts=connection.points,at=first?pts[0]:pts[pts.length-1],near=first?pts[1]:pts[pts.length-2];
        const angle=Math.atan2(at.y-near.y,at.x-near.x)*180/Math.PI;
        return '<g class="ss-cap" data-cap="'+(first?'start':'end')+'" transform="translate('+at.x+' '+at.y+') rotate('+angle+')">'+
          '<rect x="-6" y="-7" width="12" height="14" rx="2" fill="#7c8793" stroke="#b6c1cc"/></g>';
      };
      const color=electric?'#e3bc63':colors[s.color];
      return '<g class="ss-connection ss-connection-'+connection.type+'" data-id="'+esc(connection.id)+'"'+
         (electric&&settings.flow_power_mode==='balance'?' data-flow-source="'+esc(powerVisual?.source||'unavailable')+'" data-flow-availability="'+esc(powerVisual?.availability||'unavailable')+'"':'')+'>'+
        '<path class="ss-connection-hit" d="'+d+'" stroke="transparent" stroke-width="24" fill="none"/>'+
        '<path class="ss-line" d="'+d+'" stroke="'+(electric?'#27313a':'#142332')+'" stroke-width="'+(s.width+3)+'" fill="none"/>'+
        '<path class="ss-line" d="'+d+'" stroke="'+color+'" stroke-width="'+s.width+'" fill="none"/>'+
        (enabled&&powerVisual?.pattern==='arrows'?motionArrows():enabled?'<path class="ss-line ss-flow'+(electric?' ss-flow-power ss-flow-'+powerVisual.pattern:'')+'" d="'+d+'"'+
          (electric?' stroke-width="'+powerVisual.width+'" stroke-dasharray="'+(powerVisual.pattern==='dots'?powerVisual.size+' '+powerVisual.interval:powerVisual.size*2+' '+powerVisual.interval)+'"':'')+
          ' style="--ss-speed:'+a.flow_speed+'s;'+(electric?HASSStudioPowerFlow.style(powerVisual)+';stroke-width:'+powerVisual.width+';stroke-dasharray:'+(powerVisual.pattern==='dots'?powerVisual.size+' '+powerVisual.interval:(powerVisual.size*2)+' '+powerVisual.interval):'animation-direction:'+a.flow_direction)+'"/>':'')+
        endcap(true)+endcap(false)+'</g>';
    }).join('');
    const accessories=data.connections.filter(c=>c.type==='hydraulic').map(c=>
      c.accessories.map(item=>symbolOnConnection(item,c,hass,language)).join('')).join('');
    const handles=editable&&selected?.type==='connection'?data.connections.filter(c=>c.id===selected.id).map(c=>c.points.map((pt,index)=>
      '<circle class="ss-handle" data-id="'+esc(c.id)+'" data-point="'+index+'" cx="'+pt.x+'" cy="'+pt.y+
      '" r="8" fill="#fff" stroke="#2196f3" stroke-width="2"/>').join('')).join(''):'';
    const ports=editable?data.nodes.map(node=>HASSStudioEnergyTopology.ports(node).map(port=>{
      const at=HASSStudioEnergyTopology.anchor(node,port.id);
      return '<circle class="ss-energy-port" data-node="'+esc(node.id)+'" data-port="'+esc(port.id)+
        '" data-medium="'+port.medium+'" cx="'+at.x+'" cy="'+at.y+'" r="5" fill="'+
        (port.medium==='ac'?'#e3bc63':'#62c8f3')+'" stroke="#18222c" stroke-width="1.5"/>';
    }).join('')).join(''):'';
    const nodes=data.nodes.map(node=>{
      const active=selected?.type==='node'&&selected.id===node.id;
      const reading=valueOf(hass,node.entity);
      const name=esc(node.label||L[node.type]||node.type);
      const ent=node.entity?' data-more="'+esc(node.entity)+'"':'';
      const solidBoiler=node.type==='boiler'&&node.variant==='solid_fuel';
      const modernPellet=node.type==='boiler'&&node.variant==='pellet_modern';
      const modernHP=node.type==='boiler'&&node.variant==='heatpump_modern';
      const modernGas=node.type==='boiler'&&node.variant==='gas_modern';
      const modernElectric=node.type==='boiler'&&node.variant==='electric_modern';
      const modernFireplace=node.type==='boiler'&&node.variant==='fireplace_modern';
      const building=node.type==='building';
      const distributionBoard=node.type==='distribution_board',evCharger=node.type==='ev_charger';
      const inverter=node.type==='inverter';
      const energyStorage=node.type==='energy_storage';
      const powerGrid=node.type==='power_grid';
      const radiator=node.type==='radiator',manifold=node.type==='manifold';
      const tallBoiler=node.type==='boiler'&&(node.visual==='warmwasser'||solidBoiler||modernPellet);
      const freeTank=node.type==='tank'&&node.variant==='modular'&&node.scale_mode==='free';
      const sx=freeTank||solidBoiler?node.width_scale:1,sy=freeTank||solidBoiler?node.height_scale:1;
      // The solid boiler is stretched about (66,53) in its renderer. Keep
      // selection bounds and external label aligned with that transform.
      const outline=building?HASSStudioBuilding.geometry(node):distributionBoard?HASSStudioDistributionBoard.geometry(node):evCharger?HASSStudioEVCharger.geometry(node):inverter?HASSStudioInverter.geometry(node):energyStorage?HASSStudioEnergyStorage.geometry(node):radiator?HASSStudioRadiator.geometry(node):manifold?HASSStudioManifold.geometry(node):powerGrid?HASSStudioPowerGrid.geometry(node):modernFireplace?HASSStudioFireplace.geometry(node):modernElectric?HASSStudioElectricBoiler.geometry(node):modernGas?HASSStudioGasBoiler.geometry(node):modernHP?HASSStudioHeatPump.geometry(node):modernPellet?HASSStudioPellet.geometry(node):
        solidBoiler?{x:66+(12-66)*sx,y:53+(-105-53)*sy,width:110*sx,height:318*sy,
          labelY:53+(230-53)*sy,readingY:53+(245-53)*sy}:
        tallBoiler?{x:12,y:-105,width:110,height:318,labelY:230,readingY:245}:
        freeTank?{x:60+(4-60)*sx,y:61+(3-61)*sy,width:112*sx,height:113*sy,
          labelY:61+(130-61)*sy,readingY:61+(145-61)*sy}:
        {x:4,y:3,width:112,height:113,labelY:130,readingY:145};
      const panels={
        solid_fuel:['displayGroup',549,369],pellet_modern:['displayPanel',322,315],
        heatpump_modern:['displayBlock',986,371],gas_modern:['displayFrame',574,1097],
        electric_modern:['controlPanelGroup',560,946],fireplace_modern:['displayGroup',634,332]
      };
      const visual=(building?HASSStudioBuilding.render(node,hass):distributionBoard?HASSStudioDistributionBoard.render(node,hass):evCharger?HASSStudioEVCharger.render(node,hass):inverter?HASSStudioInverter.render(node,hass):energyStorage?HASSStudioEnergyStorage.render(node,hass):radiator?HASSStudioRadiator.render(node,hass):manifold?HASSStudioManifold.render(node,hass):powerGrid?HASSStudioPowerGrid.render(node,hass):node.type==='tank'&&node.variant==='modular'?HASSStudioTank.render(node,hass):node.type==='boiler'&&node.variant==='solid_fuel'?HASSStudioSolidFuel.render(node,hass):modernPellet?HASSStudioPellet.render(node,hass):modernHP?HASSStudioHeatPump.render(node,hass):modernGas?HASSStudioGasBoiler.render(node,hass):modernElectric?HASSStudioElectricBoiler.render(node,hass):modernFireplace?HASSStudioFireplace.render(node,hass):node.visual==='warmwasser'?HASSStudioGraphics.render(node,hass):variantShape(node));
      const panel=panels[node.variant];
      const displayMarkup=(panel?HASSStudioReadoutScale.namedGroup(visual,panel[0],panel[1],panel[2],node.readout_scale):visual)+
        (['pump','valve'].includes(node.type)?equipmentOverlay(node,hass):'');
      return '<g class="ss-node" data-id="'+esc(node.id)+'"'+ent+' transform="translate('+node.x+' '+node.y+') scale('+node.scale+')">'+
        displayMarkup+
        (editable&&active?'<rect class="ss-selection" x="'+outline.x+'" y="'+outline.y+'" width="'+outline.width+'" height="'+outline.height+'" rx="8" fill="none" stroke="#52bfff" stroke-dasharray="5 4" stroke-width="1.6" pointer-events="none"/>':'')+
        '<g transform="translate('+(building||distributionBoard||evCharger||inverter||energyStorage||powerGrid||radiator||manifold||modernPellet||modernHP||modernGas||modernElectric||modernFireplace?outline.centerX:60)+' '+outline.labelY+') scale('+(1/node.scale)+')"><text text-anchor="middle" fill="var(--primary-text-color,#e5eef5)" font-size="12">'+name+'</text></g>'+
        (reading&&!tallBoiler?'<g transform="translate(60 '+outline.readingY+') scale('+(1/node.scale)+')"><text text-anchor="middle" font-size="11" fill="#7ed3ef">'+esc(reading)+'</text></g>':'')+
        '</g>';
    }).join('');
    return '<svg class="ss-svg'+(editable?' ss-svg-editor':'')+'" viewBox="0 0 '+w+' '+h+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="System diagram">'+
      HASSStudioGraphics.styles+HASSStudioTank.styles+HASSStudioSolidFuel.styles+HASSStudioPellet.styles+HASSStudioHeatPump.styles+HASSStudioGasBoiler.styles+HASSStudioFireplace.styles+'<defs>'+wwDefs+'<linearGradient id="ssTank" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e7845c"/><stop offset="1" stop-color="#4a8dbd"/></linearGradient></defs>'+
      '<rect class="ss-project-boundary" width="'+w+'" height="'+h+'" rx="4" fill="var(--secondary-background-color,#17222d)" stroke="'+
      (editable?'#52bfff':'none')+'" stroke-width="2" stroke-dasharray="'+(editable?'12 7':'none')+'"/>'+
      '<g class="ss-devices">'+nodes+'</g><g class="ss-connection-layer" stroke-linecap="round" stroke-linejoin="round">'+connections+'</g><g class="ss-pump-layer">'+accessories+'</g><g class="ss-port-layer">'+ports+'</g><g class="ss-connection-handles">'+handles+'</g></svg>';
  };

    return Object.freeze({canvasSvg,connectionPath,onConnection,variantShape,translateConnectionPoints});
  };
  return Object.freeze({create});
})();
