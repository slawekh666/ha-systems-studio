/* Home Assistant Systems Studio — central device registry.
 * Saved configurations keep the existing node.type and node.variant fields.
 * Device families and catalog categories are metadata, not a migration.
 */
const HASSStudioDeviceRegistry = (() => {
  const categories = Object.freeze({
    heat_sources: {pl:'Źródła ciepła',en:'Heat sources'},
    tanks: {pl:'Zbiorniki',en:'Tanks'},
    solar: {pl:'Solary',en:'Solar thermal'},
    hydraulics: {pl:'Pompy i zawory',en:'Pumps and valves'},
    measurements: {pl:'Czujniki',en:'Sensors'},
    connections: {pl:'Rury i połączenia',en:'Pipes and connections'}
  });
  // Common logical identity, independent from the selected drawing.
  const families = Object.freeze({
    solid_fuel_boiler:{category:'heat_sources',pl:'Kocioł na drewno / węgiel',en:'Wood / coal boiler',fuels:['wood','coal'],entities:['entity','burner_entity'],animations:['combustion']},
    pellet_boiler:{category:'heat_sources',pl:'Kocioł na pellet',en:'Pellet boiler',entities:['entity','burner_entity'],animations:['combustion']},
    gas_boiler:{category:'heat_sources',pl:'Kocioł gazowy',en:'Gas boiler',entities:['entity','burner_entity','gas_draw_entity'],animations:['burner']},
    electric_boiler:{category:'heat_sources',pl:'Kocioł elektryczny',en:'Electric boiler',entities:['entity','electric_power_entity','electric_load_entity'],animations:['heating']},
    oil_boiler:{category:'heat_sources',pl:'Kocioł olejowy',en:'Oil boiler',entities:['entity','burner_entity'],animations:['burner']},
    heat_pump:{category:'heat_sources',pl:'Pompa ciepła',en:'Heat pump',entities:['entity','hp_power_entity','hp_fan_entity'],animations:['fan']},
    fireplace:{category:'heat_sources',pl:'Kominek',en:'Fireplace',entities:['entity','burner_entity'],animations:['combustion']},
    tank:{category:'tanks',pl:'Zbiornik',en:'Tank',entities:['entity'],animations:['coil_flow','heater_glow'],parts:['sensor','heater','coil','baffle_horizontal','baffle_vertical','inner_tank']},
    solar_collector:{category:'solar',pl:'Kolektor solarny',en:'Solar collector',entities:['entity','pump_entity','tank_entity'],animations:['solar_activity']},
    pump:{category:'hydraulics',pl:'Pompa',en:'Pump',entities:['entity'],animations:['running']},
    valve:{category:'hydraulics',pl:'Zawór',en:'Valve',entities:['entity'],animations:[]},
    sensor:{category:'measurements',pl:'Czujnik',en:'Sensor',entities:['entity'],animations:[]},
    pipe:{category:'connections',pl:'Rura',en:'Pipe',entities:['flow_entity'],animations:['flow']}
  });

  // Do not change order, names or ids: these are stored in existing HA layouts.
  // Each entry: [legacy variant, logical family, Polish, English, renderer, SVG].
  const legacy = Object.freeze({
    boiler:{icon:'♨',variants:[
      ['wood','solid_fuel_boiler','Drewno','Wood','warmwasser'],
      ['solid_fuel','solid_fuel_boiler','Węgiel / drewno (nowoczesny)','Modern solid-fuel boiler','solidFuel','solid-fuel-stove.svg'],
      ['pellet','pellet_boiler','Pellet','Pellet','warmwasser'],
      ['pellet_modern','pellet_boiler','Pellet (nowoczesny)','Modern pellet boiler','pellet','pellet-stove.svg'],
      ['heatpump_modern','heat_pump','Pompa ciepła (nowoczesna)','Modern heat pump','heatPump','heat-pump-stove.svg'],
      ['gas','gas_boiler','Gaz','Gas','warmwasser'],
      ['gas_modern','gas_boiler','Gazowy (nowoczesny)','Modern gas boiler','gasBoiler','gas-boiler.svg'],
      ['oil','oil_boiler','Olej','Oil','warmwasser'],
      ['electric','electric_boiler','Elektryczny','Electric','warmwasser'],
      ['electric_modern','electric_boiler','Elektryczny (nowoczesny)','Modern electric boiler','electricBoiler','electric-boiler.svg'],
      ['heatpump','heat_pump','Pompa ciepła','Heat pump','warmwasser'],
      ['fireplace_modern','fireplace','Kominek (nowoczesny)','Modern fireplace','fireplace','fireplace.svg']
    ]},
    tank:{icon:'▤',variants:[
      ['modular','tank','Modułowy','Modular','modularTank'],
      ['stratified','tank','Warstwowy','Stratified','warmwasser'],
      ['buffer','tank','Bufor','Buffer','warmwasser'],
      ['coil','tank','Jedna wężownica','Single coil','warmwasser'],
      ['dual_coil','tank','Dwie wężownice','Dual coil','warmwasser'],
      ['hygiene','tank','Higieniczny','Hygienic','warmwasser'],
      ['combi','tank','Kombi','Combi','warmwasser']
    ]},
    solar:{icon:'☼',variants:[
      ['flat','solar_collector','Płaskie','Flat plate','warmwasser'],
      ['tube','solar_collector','Próżniowe','Vacuum tubes','warmwasser']
    ]},
    pump:{icon:'◉',variants:[['circulation','pump','Obiegowa','Circulation','warmwasser'],['inline','pump','Przelotowa','Inline','warmwasser']]},
    valve:{icon:'◇',variants:[['two_way','valve','Dwudrogowy','Two-way','warmwasser'],['three_way','valve','Trójdrogowy','Three-way','warmwasser']]},
    sensor:{icon:'♧',variants:[['temperature','sensor','Temperatura','Temperature','warmwasser'],['pressure','sensor','Ciśnienie','Pressure','warmwasser']]},
    pipe:{icon:'〰',variants:[]}
  });
  const types = Object.freeze(Object.keys(legacy));
  const variantMap = new Map();
  for (const type of types) {
    const entries = legacy[type].variants.map(([id,family,pl,en,renderer,svg]) =>
      Object.freeze({id,family,label:Object.freeze({pl,en}),renderer,svg:svg||null}));
    for (const variant of entries) {
      if (!families[variant.family] || variantMap.has(type+':'+variant.id))
        throw new Error('Invalid device variant: '+type+':'+variant.id);
      variantMap.set(type+':'+variant.id,variant);
    }
  }
  const listTypes = () => types;
  const variantsFor = type => legacy[type]
    ? legacy[type].variants.map(entry => variantMap.get(type+':'+entry[0])) : [];
  const isNodeType = type => variantsFor(type).length>0;
  const isVariant = (type,id) => variantMap.has(type+':'+id);
  const defaultVariant = type => variantsFor(type)[0]?.id || null;
  const normalizeVariant = (type,id) => isVariant(type,id)?id:defaultVariant(type);
  const iconFor = type => legacy[type]?.icon || '';
  const variantOptions = (type,lang='pl') => variantsFor(type)
    .map(item => [item.id,item.label[lang==='en'?'en':'pl']]);
  const resolve = (type,variant) => {
    const graphic=variantMap.get(type+':'+variant);
    return graphic ? Object.freeze({...graphic,type,category:families[graphic.family].category,device:families[graphic.family]}):null;
  };
  // Curated choices for the left library. Each entry creates a supported
  // legacy node/pipe variant; no new device data format is introduced.
  // A family appears once when its alternatives are only graphic styles.
  const libraryPresets = Object.freeze([
    ['boiler','solid_fuel','solid_fuels'],
    ['boiler','pellet_modern','solid_fuels'],
    ['boiler','gas_modern'],
    ['boiler','electric_modern'],
    ['boiler','oil'],
    ['boiler','heatpump_modern'],
    ['boiler','fireplace_modern'],
    ['tank','modular'],
    ['solar','flat'],
    ['pump','circulation'],
    ['pump','inline'],
    ['valve','two_way'],
    ['valve','three_way'],
    ['sensor','temperature'],
    ['sensor','pressure'],
    ['pipe',null]
  ]);
  const subgroups = Object.freeze({
    solid_fuels: Object.freeze({pl:'Kotły na paliwo stałe',en:'Solid-fuel boilers'})
  });
  const presetNames = Object.freeze({
    'pump:circulation':{pl:'Pompa obiegowa',en:'Circulation pump'},
    'pump:inline':{pl:'Pompa przelotowa',en:'Inline pump'},
    'valve:two_way':{pl:'Zawór dwudrogowy',en:'Two-way valve'},
    'valve:three_way':{pl:'Zawór trójdrogowy',en:'Three-way valve'},
    'sensor:temperature':{pl:'Czujnik temperatury',en:'Temperature sensor'},
    'sensor:pressure':{pl:'Czujnik ciśnienia',en:'Pressure sensor'}
  });
  const libraryEntries = (lang='pl') => libraryPresets.map(([type,variant,subgroup]) => {
    const choice=variant===null
      ? {type,family:'pipe',category:'connections',device:families.pipe}
      : resolve(type,variant);
    if(!choice) throw new Error('Missing library device: '+type+':'+variant);
    const language=lang==='en'?'en':'pl';
    const label=presetNames[type+':'+variant]?.[language] || families[choice.family]?.[language]
      || choice.device[language];
    return Object.freeze({
      type,variant,category:choice.category,family:choice.family||'pipe',
      subgroup:subgroup||null,label,icon:iconFor(type)
    });
  });
  const variantOptionsForNode = (node, lang='pl') => {
    const device=resolve(node?.type,node?.variant);
    return device
      ? variantsFor(node.type).filter(entry=>entry.family===device.family)
          .map(entry=>[entry.id,entry.label[lang==='en'?'en':'pl']])
      : variantOptions(node?.type,lang);
  };
  const catalog = (lang='pl') => Object.keys(families).map(id => Object.freeze({
    id,category:families[id].category,label:families[id][lang==='en'?'en':'pl'],
    variants:types.flatMap(type => variantsFor(type).filter(item=>item.family===id).map(item=>item.id))
  }));
  return Object.freeze({categories,families,listTypes,variantsFor,isNodeType,
    isVariant,defaultVariant,normalizeVariant,iconFor,variantOptions,variantOptionsForNode,
    resolve,catalog,subgroups,libraryEntries});
})();
