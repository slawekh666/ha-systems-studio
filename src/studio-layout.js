/* Custom layout normalization; connections[] v2 intentionally drops legacy pipes[]. */
const HASSStudioLayout = (() => {
  const W=1200,H=720,MAX_NODES=60,MAX_CONNECTIONS=80;
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
    entity:validEntity(item.entity)?item.entity:'',
    mode:item.mode==='manual'?'manual':'live',
    test_running:item.test_running===true,
    test_speed:clamp(item.test_speed,.35,5,1),
    test_position:clamp(item.test_position,0,100,0)
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
      pellet_level_entity:validEntity(v.pellet_level_entity)?v.pellet_level_entity:'',
      pellet_level_manual:v.pellet_level_manual===true,pellet_level_test:clamp(v.pellet_level_test,0,100,80),pellet_alarm_pct:clamp(v.pellet_alarm_pct,0,100,20),
      pellet_test_mode:v.pellet_test_mode===true,
      pellet_manual_state:['off','ignition','burning','embers'].includes(v.pellet_manual_state)?v.pellet_manual_state:'burning',
      pellet_manual_temperature:clamp(v.pellet_manual_temperature,-40,150,65),
      pellet_manual_power_unit:v.pellet_manual_power_unit==='kW'?'kW':'%',
      pellet_manual_power:clamp(v.pellet_manual_power,0,v.pellet_manual_power_unit==='kW'?500:100,65),
      pellet_manual_feeder:v.pellet_manual_feeder===true,
      pellet_manual_alarm:v.pellet_manual_alarm===true,
      pellet_burner_power_entity:validEntity(v.pellet_burner_power_entity)?v.pellet_burner_power_entity:'',
      pellet_feeder_entity:validEntity(v.pellet_feeder_entity)?v.pellet_feeder_entity:'',
      pellet_alarm_entity:validEntity(v.pellet_alarm_entity)?v.pellet_alarm_entity:'',
      hp_power_entity:validEntity(v.hp_power_entity)?v.hp_power_entity:'',hp_fan_entity:validEntity(v.hp_fan_entity)?v.hp_fan_entity:'',
      hp_max_rpm:clamp(v.hp_max_rpm,100,20000,1800),hp_glow:clamp(v.hp_glow,0,100,65),hp_test_mode:v.hp_test_mode===true,hp_manual_kw:clamp(v.hp_manual_kw,0,500,0),hp_manual_fan:clamp(v.hp_manual_fan,0,100,0),
      gas_draw_entity:validEntity(v.gas_draw_entity)?v.gas_draw_entity:'',gas_glow:clamp(v.gas_glow,0,100,62),
      electric_power_entity:validEntity(v.electric_power_entity)?v.electric_power_entity:'',
      electric_load_entity:validEntity(v.electric_load_entity)?v.electric_load_entity:'',
      electric_max_kw:clamp(v.electric_max_kw,.1,100,8),electric_glow:clamp(v.electric_glow,0,100,60),
      burner_on_temp:clamp(v.burner_on_temp,20,90,35),
      burner_off_temp:clamp(v.burner_off_temp,10,89,32),
      equipment_mode:v.equipment_mode==='manual'?'manual':'live',
      equipment_test_running:v.equipment_test_running===true,
      equipment_test_speed:clamp(v.equipment_test_speed,.35,5,1),
      equipment_test_position:clamp(v.equipment_test_position,0,100,0),
      pump_entity:validEntity(v.pump_entity)?v.pump_entity:'',
      tank_entity:validEntity(v.tank_entity)?v.tank_entity:'',
      solar_on_delta:clamp(v.solar_on_delta,1,40,6),
      solar_off_delta:clamp(v.solar_off_delta,0,39,3),
      visual:v.visual==='studio'?'studio':'warmwasser',
      variant:registry.normalizeVariant(v.type,v.variant),
      label:String(v.label||'').slice(0,64),
      energy_role:HASSStudioEnergyTopology.node(v).role,
      energy_ports:HASSStudioEnergyTopology.node(v).ports,
      energy_buses:HASSStudioEnergyTopology.node(v).buses,
      entity:validEntity(v.entity)?v.entity:'',
      entities:(Array.isArray(v.entities)?v.entities:[]).slice(0,20).map(e=>({
        entity:validEntity(e.entity)?e.entity:'',label:String(e.label||'').slice(0,64)})),
      radiator:v.type==='radiator'?HASSStudioRadiator.normalize(v):undefined,
      manifold:v.type==='manifold'?HASSStudioManifold.normalize(v.manifold||v):undefined,
      building:v.type==='building'?HASSStudioBuilding.normalize(v):undefined,
      distribution_board:v.type==='distribution_board'?HASSStudioDistributionBoard.normalize(v):undefined,
      ev_charger:v.type==='ev_charger'?HASSStudioEVCharger.normalize(v):undefined,
      inverter:v.type==='inverter'?HASSStudioInverter.normalize(v):undefined,
      energy_storage:v.type==='energy_storage'?HASSStudioEnergyStorage.normalize(v):undefined,
      power_grid:v.type==='power_grid'?HASSStudioPowerGrid.normalize(v):undefined,
      parts:(Array.isArray(v.parts)?v.parts:[]).slice(0,40).map(normalizeItem)
    }));
    // New connections schema is intentionally not migrated from legacy pipes[].
    const connections=(Array.isArray(source.connections)?source.connections:[]).slice(0,MAX_CONNECTIONS).filter(v=>v&&typeof v.id==='string'&&['hydraulic','electric'].includes(v.type)).map(v=>{
      const style=v.style||{},a=v.animation||{},hydraulic=v.type==='hydraulic';
      return {
        id:v.id.slice(0,32),type:v.type,label:String(v.label||'').slice(0,64),
        energy_start:HASSStudioEnergyTopology.connection(v).start,
        energy_end:HASSStudioEnergyTopology.connection(v).end,
        points:(Array.isArray(v.points)?v.points:[]).slice(0,30).map(q=>({
          x:clamp(q.x,-5000,10000,100),y:clamp(q.y,-5000,10000,100)})),
        style:{color:hydraulic&&colors[style.color]?style.color:hydraulic?'hot':'electric',
          width:clamp(style.width,2,14,hydraulic?7:5),
          cap_start:hydraulic&&style.cap_start!==false,cap_end:hydraulic&&style.cap_end!==false},
        animation:{
          flow_mode:['auto','on','off'].includes(a.flow_mode)?a.flow_mode:hydraulic?'auto':'off',
          flow_entity:hydraulic&&validEntity(a.flow_entity)?a.flow_entity:'',
          flow_direction:a.flow_direction==='reverse'?'reverse':'forward',
          flow_speed:clamp(a.flow_speed,.35,5,1),
          ...HASSStudioPowerFlow.normalize(hydraulic?{flow_power_mode:'off'}:a)
        },
        accessories:hydraulic?(Array.isArray(v.accessories)?v.accessories:[]).slice(0,20).map(normalizeAccessory):[]
      };
    }).filter(v=>v.points.length>=2);
    return {width,height,name:String(source.name||'').trim().slice(0,64),
      energy_balance:HASSStudioEnergyBalance.normalize(source.energy_balance),
      energy_diagnostics:HASSStudioEnergyDiagnostics.normalize(source.energy_diagnostics),
      nodes,connections};
  };

  return Object.freeze({normalized,normalizeItem,normalizeAccessory});
})();
