/* Schema normalization for existing custom layouts. Keeps saved IDs and fields. */
const HASSStudioLayout = (() => {
  const W=1200,H=720,MAX_NODES=60,MAX_PIPES=80;
  const registry=HASSStudioDeviceRegistry;
  const colors={hot:'#ed835a',cold:'#57a6db',solar:'#e5b35e',return:'#778cbe'};
  const clamp=(n,lo,hi,fallback)=>Number.isFinite(Number(n))?Math.max(lo,Math.min(hi,Number(n))):fallback;
  const validEntity=(value)=>typeof value==='string' && isEnt(value);
  const freshId=(prefix)=>prefix+Math.random().toString(36).slice(2,10);
  const normalizeItem=(item)=>({
    id:String(item.id||freshId('i')).slice(0,32),
    kind:['sensor','heater','coil','baffle_horizontal','baffle_vertical','inner_tank'].includes(item.kind)?item.kind:'sensor',
    variant:['warmwasser','compact','extended'].includes(item.variant)?item.variant:'warmwasser',
    label:String(item.label||'').slice(0,64),
    side:['left','right','inside'].includes(item.side)?item.side:'left',
    height:clamp(item.height,0,100,50),
    display_scale:clamp(item.display_scale,0.5,2,1),
    entity:validEntity(item.entity)?item.entity:'',
    power_entity:validEntity(item.power_entity)?item.power_entity:'',
    x:clamp(item.x,0,100,50),length:clamp(item.length,15,95,58),
    width:clamp(item.width,10,95,60),turns:clamp(item.turns,3,22,12),
    power:clamp(item.power,0,100,75),mode:['auto','on','off'].includes(item.mode)?item.mode:'auto',
    flow_mode:['auto','on','off'].includes(item.flow_mode)?item.flow_mode:'auto',
    flow_direction:item.flow_direction==='reverse'?'reverse':'forward',
    flow_speed:clamp(item.flow_speed,.35,5,1),
    container:item.container==='inner'?'inner':'main',
    permeability:clamp(item.permeability,0,1,.35)
  });
  const normalizeAccessory=(item)=>({
    id:String(item.id||freshId('a')).slice(0,32),
    type:item.type==='valve'?'valve':'pump',
    label:String(item.label||'').slice(0,64),
    position:clamp(item.position,0,100,50),
    entity:validEntity(item.entity)?item.entity:''
  });
  const normalized=(config)=>{
    const source=config?.studio_layout||{};
    const {width,height}=HASSStudioViewport.dimensions(config);
    const nodes=(Array.isArray(source.nodes)?source.nodes:[]).filter(v=>v && registry.isNodeType(v.type) &&
      typeof v.id==='string').slice(0,MAX_NODES).map(v=>({
      id:v.id.slice(0,32),type:v.type,
      x:clamp(v.x,-5000,10000,40),y:clamp(v.y,-5000,10000,40),
      scale:clamp(v.scale,0.5,2.4,1),readout_scale:HASSStudioReadoutScale.factor(v.readout_scale),
      scale_mode:v.type==='tank' && v.variant==='modular' && v.scale_mode==='free'?'free':'proportional',
       aspect_locked:typeof v.aspect_locked==='boolean'?v.aspect_locked:v.scale_mode!=='free',
      width_scale:clamp(v.width_scale,0.5,2.4,1),height_scale:clamp(v.height_scale,0.5,2.4,1),
      // Use uniform scale for both full render and interactive drag.
      burner_entity:validEntity(v.burner_entity)?v.burner_entity:'',
      burner_mode:['auto','on','off'].includes(v.burner_mode)?v.burner_mode:'auto',
      solid_fuel:v.solid_fuel==='coal'?'coal':'wood',
      solid_state:['auto','burning','embers','off'].includes(v.solid_state)?v.solid_state:'auto',
      solid_glow:clamp(v.solid_glow,0,100,78),
      hp_power_entity:validEntity(v.hp_power_entity)?v.hp_power_entity:'',hp_fan_entity:validEntity(v.hp_fan_entity)?v.hp_fan_entity:'',
      hp_max_rpm:clamp(v.hp_max_rpm,100,20000,1800),hp_glow:clamp(v.hp_glow,0,100,65),
      gas_draw_entity:validEntity(v.gas_draw_entity)?v.gas_draw_entity:'',gas_glow:clamp(v.gas_glow,0,100,62),
      electric_power_entity:validEntity(v.electric_power_entity)?v.electric_power_entity:'',
      electric_load_entity:validEntity(v.electric_load_entity)?v.electric_load_entity:'',
      electric_max_kw:clamp(v.electric_max_kw,.1,100,8),electric_glow:clamp(v.electric_glow,0,100,60),
      burner_on_temp:clamp(v.burner_on_temp,20,90,35),
      burner_off_temp:clamp(v.burner_off_temp,10,89,32),
      pump_entity:validEntity(v.pump_entity)?v.pump_entity:'',
      tank_entity:validEntity(v.tank_entity)?v.tank_entity:'',
      solar_on_delta:clamp(v.solar_on_delta,1,40,6),
      solar_off_delta:clamp(v.solar_off_delta,0,39,3),
      visual:v.visual==='studio'?'studio':'warmwasser',
      variant:registry.normalizeVariant(v.type,v.variant),
      label:String(v.label||'').slice(0,64),
      entity:validEntity(v.entity)?v.entity:'',
      entities:(Array.isArray(v.entities)?v.entities:[]).slice(0,20).map(e=>({
        entity:validEntity(e.entity)?e.entity:'',label:String(e.label||'').slice(0,64)})),
      radiator:v.type==='radiator'?HASSStudioRadiator.normalize(v):undefined,
      manifold:v.type==='manifold'?HASSStudioManifold.normalize(v.manifold||v):undefined,
      distribution_board:v.type==='distribution_board'?HASSStudioDistributionBoard.normalize(v):undefined,
      ev_charger:v.type==='ev_charger'?HASSStudioEVCharger.normalize(v):undefined,
      inverter:v.type==='inverter'?HASSStudioInverter.normalize(v):undefined,
      energy_storage:v.type==='energy_storage'?HASSStudioEnergyStorage.normalize(v):undefined,
      power_grid:v.type==='power_grid'?HASSStudioPowerGrid.normalize(v):undefined,
      parts:(Array.isArray(v.parts)?v.parts:[]).slice(0,40).map(normalizeItem)
    }));
    const pipes=(Array.isArray(source.pipes)?source.pipes:[]).slice(0,MAX_PIPES).map(v=>({
      id:String(v.id||freshId('p')).slice(0,32),
      label:String(v.label||'').slice(0,64),
      color:colors[v.color]?v.color:'hot',width:clamp(v.width,3,14,7),
      flow_mode:['auto','on','off'].includes(v.flow_mode)?v.flow_mode:'auto',
      flow_entity:validEntity(v.flow_entity)?v.flow_entity:'',
      flow_direction:v.flow_direction==='reverse'?'reverse':'forward',
      flow_speed:clamp(v.flow_speed,.35,5,1),cap_start:v.cap_start!==false,cap_end:v.cap_end!==false,
      cap_start:v.cap_start!==false,cap_end:v.cap_end!==false,
      points:(Array.isArray(v.points)?v.points:[]).slice(0,30).map(q=>({
        x:clamp(q.x,-5000,10000,100),y:clamp(q.y,-5000,10000,100)})),
      accessories:(Array.isArray(v.accessories)?v.accessories:[]).slice(0,20).map(normalizeAccessory)
    })).filter(v=>v.points.length>=2);
    // Preserve pipes created in the previous prototype when opening their layout.
    if(!Array.isArray(source.pipes) && Array.isArray(source.edges)){
      const byId=new Map(nodes.map(n=>[n.id,n]));
      const ports={left:[0,42],right:[112,42],top:[56,0],bottom:[56,84]};
      source.edges.slice(0,MAX_PIPES).forEach((edge,index)=>{
        const from=byId.get(edge?.from?.node),to=byId.get(edge?.to?.node);
        const a=ports[edge?.from?.port],b=ports[edge?.to?.port];
        if(!from||!to||!a||!b)return;
        const ax=from.x+a[0]*from.scale,ay=from.y+a[1]*from.scale;
        const bx=to.x+b[0]*to.scale,by=to.y+b[1]*to.scale;
        const mx=(ax+bx)/2;
        pipes.push({id:'migrated-'+index,label:'',color:colors[edge.color]?edge.color:'hot',
          width:7,flow_mode:'auto',flow_entity:'',flow_direction:'forward',flow_speed:1,cap_start:true,cap_end:true,
          points:[{x:ax,y:ay},{x:mx,y:ay},{x:mx,y:by},{x:bx,y:by}],accessories:[]});
      });
    }
    return {width,height,name:String(source.name||'').trim().slice(0,64),nodes,pipes};
  };

  return Object.freeze({normalized,normalizeItem,normalizeAccessory});
})();
