/* Basic SVG and logic regression tests; browser integration remains for HA. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('src/studio-custom.js','utf8')+'\n'+fs.readFileSync('src/studio-layout.js','utf8')+'\n'+fs.readFileSync('src/studio-inspector.js','utf8')+'\n'+fs.readFileSync('src/studio-canvas.js','utf8')+'\n'+fs.readFileSync('src/studio-library.js','utf8');
const haCore=fs.readFileSync('src/ha-state.js','utf8')+'\n'+fs.readFileSync('src/animation-state.js','utf8')+'\n';
// Device registry: saved layout identifiers and ordering are stable.
const registrySrc=fs.readFileSync('src/device-registry.js','utf8');
const registry=vm.runInNewContext(registrySrc+'\nHASSStudioDeviceRegistry;',{});
const legacy={
  boiler:'wood solid_fuel pellet pellet_modern heatpump_modern gas gas_modern oil electric electric_modern heatpump fireplace_modern',
  tank:'modular stratified buffer coil dual_coil hygiene combi',
  solar:'flat tube',pump:'circulation inline',valve:'two_way three_way',sensor:'temperature pressure'
};
assert.equal(Array.from(registry.listTypes()).join(' '),'boiler tank solar pump valve sensor radiator manifold building distribution_board ev_charger inverter energy_storage power_grid connection');
for(const [type,variants] of Object.entries(legacy)){
  assert.equal(registry.variantsFor(type).map(item=>item.id).join(' '),variants);
  for(const variant of variants.split(' ')){
    assert.equal(registry.normalizeVariant(type,variant),variant);
    assert(registry.resolve(type,variant)?.category);
  }
}
assert.equal(registry.isNodeType('connection'),false);
assert.equal(registry.resolve('boiler','solid_fuel').family,'solid_fuel_boiler');
assert.equal(registry.resolve('boiler','pellet_modern').family,'pellet_boiler');
assert.equal(registry.resolve('boiler','heatpump_modern').family,'heat_pump');
assert(src.includes('registry.normalizeVariant(v.type,v.variant)'));
assert(src.includes('registry.variantOptionsForNode(node,pickLang('));
console.log('OK: device catalog and existing layout variants.');

const inspectSrc=fs.readFileSync('src/studio-inspector.js','utf8');
assert(inspectSrc.includes('const renderProps=()=>{') && src.includes('HASSStudioEditorInspector.create({'));
assert(src.includes('HASSStudioCanvas.create({') && src.includes('const canvasSvg=(config,hass,editable=false,selected=null)=>'));
const library=vm.runInNewContext(fs.readFileSync('src/studio-library.js','utf8')+'\nHASSStudioEditorLibrary;',{});
const libHtml=library.render({registry,language:'pl',esc:String});
assert(libHtml.includes('data-lib-category="heat_sources"') && libHtml.includes('data-lib-category="hydraulics"'));
assert(libHtml.includes('ss-lib-subgroup') && libHtml.includes('Paliwo stałe'));
assert(!libHtml.includes('data-lib-category="heat_sources" open'));
assert(libHtml.includes('data-lib-category="buildings"'));
assert(library.filter(registry,'pl','kaloryfer').some(x=>x.type==='radiator'));
assert(library.filter(registry,'pl','pv').some(x=>x.type==='inverter'));
const memory={data:{},getItem(k){return this.data[k]||null;},setItem(k,v){this.data[k]=v;}};
for(const item of registry.libraryEntries('pl').slice(0,7))library.recordRecent(memory,item.type,item.variant);
assert.equal(library.readRecent(memory).length,5);
assert(src.includes('ss-library-search')&&src.includes('application/x-ha-studio-device')&&src.includes('pasteSelection(clipboard)'));
assert(src.includes('viewport.worldAt(camera'));
assert(registry.libraryEntries('pl').filter(x=>x.category==='buildings').length===3);
assert(libHtml.includes('data-add-preset="solid_fuel"') && libHtml.includes('data-add-preset="pellet_modern"'));
assert(libHtml.includes('data-add="tank" data-variant="modular"'));
assert(libHtml.includes('data-add="pump" data-variant="inline"'));
assert(libHtml.includes('data-add="valve" data-variant="three_way"'));
assert(libHtml.includes('data-add="sensor" data-variant="pressure"'));
assert(libHtml.includes('data-add="connection" data-variant="hydraulic"'));
assert(libHtml.includes('data-add="connection" data-variant="electric"'));
const libEn=library.render({registry,language:'en',esc:String});
assert(libEn.includes('Solid fuels') && libEn.includes('Heat sources'));
assert(!libEn.includes('Kocioł na drewno'));
const selectedFuelVariants=registry.variantOptionsForNode({type:'boiler',variant:'solid_fuel'},'pl');
assert.equal(selectedFuelVariants.map(row=>row[0]).join(','),'wood,solid_fuel');
assert.equal(registry.variantOptionsForNode({type:'boiler',variant:'pellet_modern'},'pl').map(row=>row[0]).join(','),'pellet,pellet_modern');
assert.equal(registry.variantOptionsForNode({type:'boiler',variant:'gas_modern'},'pl').map(row=>row[0]).join(','),'gas,gas_modern');
assert(src.includes("create(button.dataset.add,button.dataset.variant||'')"));
assert(src.includes('registry.isVariant(kind,preset)?preset:registry.defaultVariant(kind)'));
console.log('OK: nested equipment catalog and family-scoped graphic selection.');
// Part selection: only active part fields are rendered, even after layer reordering.
const mockProperties={innerHTML:'',querySelectorAll:()=>[],appendChild(){}};
const mockRenderer={styles:'',render:()=>'<g></g>',defs:()=>''};
const mockContext={document:{createElement:()=>({hidden:true})},
  HASSStudioGraphics:mockRenderer,HASSStudioTank:mockRenderer,
  HASSStudioSolidFuel:mockRenderer,HASSStudioPellet:mockRenderer,
  HASSStudioHeatPump:mockRenderer,HASSStudioGasBoiler:mockRenderer,
  HASSStudioFireplace:mockRenderer,HASSStudioElectricBoiler:mockRenderer};
const inspector=vm.runInNewContext(inspectSrc+'\nHASSStudioEditorInspector;',mockContext);
const samplePart=(id,kind,label,entity)=>({id,kind,label,entity,variant:'warmwasser',
  side:'left',height:50,display_scale:1,x:50,length:58,width:60,turns:12,mode:'auto',
  power:75,power_entity:'',flow_mode:'on',flow_direction:'forward',flow_speed:1});
const sampleTank={type:'tank',variant:'modular',scale_mode:'proportional',width_scale:1,
  height_scale:1,scale:1,x:50,y:60,label:'',visual:'warmwasser',entity:'',entities:[],
  parts:[samplePart('sensor-one','sensor','Góra','sensor.top'),
         samplePart('coil-two','coil','Wężownica','binary_sensor.coil')]};
let selectedPart='sensor-one';
const fakeLabels=new Proxy({properties:'Właściwości',sensors:'Elementy',tank:'Zbiornik'},
  {get:(target,key)=>target[key]||String(key)});
const drawInspector=inspector.create({editor:{_config:{},_hass:{states:{}}},
  L:fakeLabels,properties:mockProperties,esc:String,
  opts:(rows,selected)=>rows.map(row=>'<option value="'+row[0]+'"'+
    (row[0]===selected?' selected':'')+'>'+row[1]+'</option>').join(''),
  registry,pickLang:()=> 'pl',get:()=>({nodes:[sampleTank],connections:[]}),
  selectedObject:()=>sampleTank,getSelection:()=>({type:'node'}),
  getSelectedPartId:()=>selectedPart,getExpandedPartId:()=>selectedPart,variantShape:()=>''});
drawInspector();
assert(mockProperties.innerHTML.includes('data-select-part="sensor-one"'));
assert(mockProperties.innerHTML.includes('data-select-part="coil-two"'));
assert(mockProperties.innerHTML.includes('data-field="partLabel"') &&
  mockProperties.innerHTML.includes('data-index="0"'));
assert(!mockProperties.innerHTML.includes('data-field="partTurns"'));
selectedPart='coil-two';drawInspector();
assert(mockProperties.innerHTML.includes('data-field="partTurns"'));
assert(!mockProperties.innerHTML.includes('data-field="partDisplayScale"'));
sampleTank.parts.reverse();drawInspector();
assert(mockProperties.innerHTML.includes('data-field="partTurns"'));
assert(mockProperties.innerHTML.includes('data-index="0"'));
assert(inspectSrc.includes('getSelectedPartId'));
assert(src.includes("event.target.closest?.('[data-part-id]')"));
console.log('OK: selected part inspector and stable selection across layer reordering.');

const graphics=fs.readFileSync('src/warmwasser-shapes.js','utf8');
const api=vm.runInNewContext(graphics+'\nHASSStudioGraphics;', {esc:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')});
const state=map=>({states:Object.fromEntries(Object.entries(map).map(([id,v])=>[id,{state:String(v)}]))});
const boxWidth=svg=>Number(svg.match(/<rect x="[^"]+" y="[^"]+" width="([^"]+)" height="[^"]+" rx="10"/)?.[1]);
assert.equal(src.includes("scale('+node.scale_x+")||src.includes("scale('+node.scale_y"),false,'drag must not use width/height scale');
assert.equal((src.match(/scale\('\+node\.scale\+'\)/g)||[]).length,2,'drag and static rendering must share one scale');
assert(!src.includes('scale_x')&&!src.includes('scale_y'),'deprecated nonuniform scaling should be absent');
const temp=(label,id)=>({id,type:'tank',variant:'buffer',parts:[{kind:'sensor',side:'right',height:50,label,entity:'sensor.temp'}]});
const short=api.render(temp('A','temp1'),state({'sensor.temp':63.1}));
const long=api.render(temp('Kolektor dachowy','temp2'),state({'sensor.temp':63.1}));
assert(boxWidth(short)>0 && boxWidth(short)<94,'short badge should shrink');
assert(boxWidth(long)>boxWidth(short),'badge should grow with text');
const wood={id:'boiler_wood',type:'boiler',variant:'wood',entity:'sensor.boiler',burner_mode:'auto'};
assert.match(api.render(wood,state({'sensor.boiler':36})),/Burning/);
assert.match(api.render(wood,state({'sensor.boiler':33})),/Burning/);
assert.match(api.render(wood,state({'sensor.boiler':31})),/>Off<\/text>/);
assert.match(api.render({...wood,id:'boiler_external',burner_entity:'binary_sensor.burner'},state({'sensor.boiler':70,'binary_sensor.burner':'off'})),/>Off<\/text>/);
const solar={id:'solar_test',type:'solar',variant:'flat',tank_entity:'sensor.tank',parts:[{kind:'sensor',label:'Kolektor',entity:'sensor.collector',height:80,side:'right'}]};
assert.match(api.render(solar,state({'sensor.collector':48,'sensor.tank':40})),/class="ss-solar-sun"/);
assert.match(api.render(solar,state({'sensor.collector':45,'sensor.tank':40})),/class="ss-solar-sun"/);
assert.doesNotMatch(api.render(solar,state({'sensor.collector':42,'sensor.tank':40})),/class="ss-solar-sun"/);
assert.doesNotMatch(api.render({...solar,id:'solar_missing',tank_entity:''},state({'sensor.collector':48,'sensor.tank':40})),/class="ss-solar-sun"/);
console.log('OK: stable scaling, compact badges, boiler and collector states');

/* Native HA more-info uses the innermost data-more target. */
const partRender=api.render({
  id:'tank_history',type:'tank',variant:'dual_coil',
  parts:[
    {kind:'sensor',side:'left',height:80,label:'Góra',entity:'sensor.tank_top'},
    {kind:'heater',side:'right',height:40,label:'Grzałka',entity:'switch.heater'},
    {kind:'coil',side:'inside',height:20,entity:'binary_sensor.coil'}]
},state({'sensor.tank_top':63.5,'switch.heater':'on','binary_sensor.coil':'off'}));
assert.match(partRender,/<g class="ss-temperature-badge" transform="[^"]+" data-more="sensor.tank_top">/);
assert.match(partRender,/<g class="ss-heater" data-more="switch.heater">/);
assert.match(partRender,/<g class="ss-coil" data-more="binary_sensor.coil">/);
assert(src.includes('class="ss-accessory" data-connection=') && src.includes("item.entity?' data-more="), 'accessory history binding missing');
assert.match(src,/\.ss-svg:not\(\.ss-svg-editor\) \.ss-connection\{pointer-events:none\}/);
assert.match(src,/\(editable\?' ss-svg-editor':''\)/);
assert.match(src,/const ent=node.entity\?' data-more="/);
console.log('OK: history click targets for individual sensors, heaters, coils and pipe accessories.');

/* Sensor labels remain readable at any device scale. */
const scaledTemp={kind:'sensor',side:'left',height:50,label:'CWU góra',display_scale:0.7,entity:'sensor.temp'};
const scaledTank=(scale,id)=>api.render({id,type:'tank',variant:'buffer',scale,
  parts:[scaledTemp]},state({'sensor.temp':63.1}));
const tSmall=scaledTank(1,'tempBadgeNormal');
const tLarge=scaledTank(2,'tempBadgeBig');
const getBadgeScale=svg=>Number(svg.split('class="ss-temperature-badge" transform="')[1]?.split(' scale(')[1]?.split(')')[0]);
assert.equal(getBadgeScale(tSmall),0.7);
assert.equal(getBadgeScale(tLarge),0.35);
assert(tSmall.includes('>CWU góra</text>'));
const bareTank=api.render({id:'tankUnlabeled',type:'tank',variant:'buffer',scale:2,
  parts:[{kind:'sensor',side:'left',height:80,entity:'sensor.temp'}]},state({'sensor.temp':63.1}));
assert(bareTank.includes('>T1</text>'));
assert(src.includes('data-field=') && src.includes("key"),'missing dynamic field template');
assert(src.includes("'partDisplayScale'")&&src.includes("'partLabel'"),'sensor editor fields missing');
assert(src.includes("'accessoryLabel'"),'accessory label editor missing');
assert(src.includes('symbolOnConnection(item,c,hass,language)'), 'connection accessory caption renderer missing');
const tallBoiler=api.render(wood,state({'sensor.boiler':65}));
assert.match(tallBoiler,/y="-104" width="18" height="150"/);
assert.match(tallBoiler,/y="30" width="91" height="169"/);
assert(tallBoiler.includes('clip-path="url(#wwboilerwoodFireClip)"'));
assert.match(tallBoiler,/<g data-more="sensor.boiler">/);
console.log('OK: independent sensor scaling, sensor labels, accessory captions, tall boiler geometry.');

// Modular tank invariants: data-driven temperatures and decorative heat only.
const tankSrc=fs.readFileSync('src/studio-tank.js','utf8');
const tankApi=vm.runInNewContext(haCore+tankSrc+'\nHASSStudioTank;',{});
const tankNode={id:'tank_unique',type:'tank',variant:'modular',scale:1,parts:[
  {id:'t1',kind:'sensor',height:85,x:20,side:'left',entity:'sensor.top'},
  {id:'t2',kind:'sensor',height:15,x:20,side:'left',entity:'sensor.bottom'},
  {id:'heater1',kind:'heater',height:30,x:80,side:'right',entity:'switch.heater',power:80},
  {id:'coil1',kind:'coil',height:50,x:50,turns:12,length:58,width:60,flow_mode:'on'},
  {id:'plate1',kind:'baffle_horizontal',height:50,x:50,permeability:.3},
  {id:'inner1',kind:'inner_tank',height:75,x:50,length:30,width:48}
]};
const tankState={states:{'sensor.top':{state:'68',attributes:{unit_of_measurement:'°C'}},
  'sensor.bottom':{state:'24',attributes:{unit_of_measurement:'°C'}},'switch.heater':{state:'on'}}};
const tankSvg=tankApi.render(tankNode,tankState);
assert.match(tankSvg,/ss-modular-tank/);
assert.match(tankSvg,/ss-tank-heater/);
assert.match(tankSvg,/ss-tank-baffle/);
assert.match(tankSvg,/ss-tank-inner/);
assert.match(tankSvg,/ss-tank-coil-flow/);
assert.match(tankSvg,/data-more="sensor.top"/);
assert.match(tankSvg,/data-more="switch.heater"/);
assert(!tankSvg.includes('GaussianBlur')&&!tankSvg.includes('feGaussianBlur'));
assert.equal(tankApi.temperature(tankState,'sensor.top'),68);
assert.equal(tankApi.temperature({states:{'sensor.top':{state:'unknown'}}},'sensor.top'),null);
assert.match(tankApi.render({...tankNode,parts:tankNode.parts.filter(p=>p.kind!=='sensor')},tankState),/506780/);
assert(!tankApi.render({...tankNode,parts:tankNode.parts.filter(p=>p.kind!=='heater')},tankState).includes('ss-tank-heater'));
assert.match(src,/HASSStudioTank.render\(node,hass\)/);
console.log('OK: modular tank, hybrid visual effects, independent accessories.');

// Modular tank editor regression: wrapping, valid headings and independent scale.
assert.match(src,/\.ss-add-parts\{display:flex;flex-wrap:wrap;/);
assert.match(src,/\.ss-props\{[^}]*overflow-x:hidden/);
assert.match(src,/<\/h4>'\+/); // The title must close before rendering part fields.
assert.match(src,/scale_mode:v\.type==='tank'/);
assert.match(src,/width_scale:clamp\(v\.width_scale/);
assert.match(src,/key==='aspect_locked'/);
assert.match(src,/field\(L\.tankWidthScale/);
const stretchNode={...tankNode,scale_mode:'free',width_scale:1.7,height_scale:.75};
const stretched=tankApi.render(stretchNode,tankState);
assert.match(stretched,/class="ss-tank-body" transform="translate\(60 61\) scale\(1\.7 0\.75\)/);
assert.match(stretched,/class="ss-tank-badge ss-temperature-badge"/);
assert(!stretched.includes('scale(1.7 0.75) translate(-60 -61)"><g class="ss-tank-badge'), 'labels must be outside nonuniform body group');
const shape=tankApi.coilPath({length:70,width:60,turns:12},{x:60,y:61});
assert.equal(shape.turns,12);
assert.equal((shape.d.match(/C/g)||[]).length,26);
assert(shape.d.startsWith('M')&&shape.d.includes('L')&&!shape.d.includes('NaN'));
assert.match(tankApi.render(tankNode,tankState),/<path d="M[^"]+L[^"]+C[^"]+C[^"]+"/);
console.log('OK: wrapped accessory UI, independent modular tank scaling and connected elliptical coil.');

// Three bugfixes reported from live HA screenshots: direct nonuniform scaling,
// missing upper return, along-path thermal colouring, and insertion-order layers.
assert.match(src,/field\(L\.tankWidthScale/);
assert.match(src,/field\(L\.tankHeightScale/);
assert.match(src,/obj\.scale_mode='free';/);
assert.match(src,/data-layer-up=/);
assert.match(src,/data-layer-down=/);
const pathData=tankApi.coilPath({length:75,width:65,turns:12},{x:60,y:60});
assert.equal(pathData.upperReturn,true);
assert.equal((pathData.d.match(/C/g)||[]).length,26); // 24 turns + 2 upper return arcs
assert(pathData.route.length>90 && pathData.total>0);
assert.equal(tankApi.coilColor(0,'#e14b45'),'#1a9df9');
assert.equal(tankApi.coilColor(1,'#e14b45'),'#e14b45');
const coldTop={...tankState,states:{...tankState.states,'sensor.top':{state:'12',attributes:{unit_of_measurement:'°C'}}}};
const hotRender=tankApi.render(tankNode,tankState);
const coldRender=tankApi.render(tankNode,coldTop);
assert.match(hotRender,/class="ss-tank-coil-gradient" data-start="#1a9df9" data-end="#[0-9a-f]{6}"/);
assert.notEqual(hotRender.match(/ss-tank-coil-gradient" data-start="#1a9df9" data-end="([^"]+)"/)[1],
  coldRender.match(/ss-tank-coil-gradient" data-start="#1a9df9" data-end="([^"]+)"/)[1]);
assert(!hotRender.includes('id="ssttank_uniqueCoilcoil1"'), 'coil no longer uses a vertical SVG gradient');
const noTemp={...tankNode,parts:tankNode.parts.filter(p=>p.kind!=='sensor')};
assert.match(tankApi.render(noTemp,tankState),/class="ss-tank-coil-gradient" data-start="#1a9df9" data-end="#ef4b4a"/);
const orderNode={...tankNode,parts:[tankNode.parts[2],tankNode.parts[0],tankNode.parts[3],tankNode.parts[1],tankNode.parts[4]]};
const orderRender=tankApi.render(orderNode,tankState);
const ordered=[...orderRender.matchAll(/class="ss-tank-part-layer" data-layer="(\d+)" data-part-id="([^"]+)"/g)]
  .map(m=>[Number(m[1]),m[2]]);
assert.deepEqual(ordered,[[0,'heater1'],[1,'t1'],[2,'coil1'],[3,'t2'],[4,'plate1']]);
console.log('OK: independent visible scaling, complete spiral, arc-length gradient and layering.');


// Modern solid-fuel boiler: uploaded stove body + Warmwasser fire classes.
const svgLib = fs.readFileSync('src/svg-template.js', 'utf8');
const assetNames = {
  solidFuel: 'solid-fuel-stove', pellet: 'pellet-stove',
  heatPump: 'heat-pump-stove', gasBoiler: 'gas-boiler',
  electricBoiler: 'electric-boiler', fireplace: 'fireplace'
};
const assets = Object.fromEntries(
  Object.entries(assetNames).map(([key, name]) => {
    const xml = fs.readFileSync('src/icons/' + name + '.svg', 'utf8');
    assert.doesNotMatch(xml, /__[A-Z0-9_]+__/);
    return [key, xml.replace(/^\s*<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '')];
  })
);
const assetJs = 'const HASSStudioIconTemplates = ' + JSON.stringify(assets) + ';';
const iconPrelude = haCore + svgLib + '\n' + assetJs + '\n';
const solidSrc=fs.readFileSync('src/solid-fuel-stove.js','utf8');
const solid=vm.runInNewContext(iconPrelude+solidSrc+'\nHASSStudioSolidFuel;', {});
const modern={id:'smodern1',type:'boiler',variant:'solid_fuel',entity:'sensor.boiler',
  solid_fuel:'wood',solid_state:'auto',solid_glow:78,burner_on_temp:50,burner_off_temp:35};
const haModern={states:{'sensor.boiler':{state:'65',attributes:{unit_of_measurement:'°C'}},
  'sensor.low':{state:'38',attributes:{unit_of_measurement:'°C'}},
  'binary_sensor.fuel':{state:'off'}}};
assert.equal(solid.resolveState(modern,haModern),'burning');
assert.equal(solid.resolveState({...modern,entity:'sensor.low'},haModern),'embers');
assert.equal(solid.resolveState({...modern,solid_state:'off'},haModern),'off');
assert.equal(solid.resolveState({...modern,burner_entity:'binary_sensor.fuel'},haModern),'off');
assert.equal(solid.resolveState({...modern,burner_entity:'binary_sensor.fuel',solid_state:'burning'},haModern),'burning');
const burningWood=solid.render(modern,haModern);
assert.match(burningWood,/class="ss-solid-boiler" data-combustion="burning"/);
assert.match(burningWood,/class="ss-wood-fuel"/);
assert.match(burningWood,/class="ss-fire"/);
assert.match(burningWood,/65\.0°/);
assert.match(burningWood,/clip-path="url\(#sssolidsmodern1solidFireClip\)"/);
assert.doesNotMatch(burningWood,/<script\b|onload=|onclick=|<foreignObject/i);
const burningCoal=solid.render({...modern,solid_fuel:'coal'},haModern);
assert.match(burningCoal,/class="ss-coal-fuel"/);
assert.doesNotMatch(burningCoal,/class="ss-wood-fuel"/);
const embers=solid.render({...modern,solid_state:'embers'},haModern);
assert.match(embers,/class="ss-embers"/);
assert.doesNotMatch(embers,/class="ss-fire"/);
const extinguished=solid.render({...modern,solid_state:'off'},haModern);
assert.doesNotMatch(extinguished,/class="ss-fire"|class="ss-embers"/);
const other=solid.render({...modern,id:'smodern2'},haModern);
assert.match(other,/sssolidsmodern2bodyFront/);
assert.doesNotMatch(burningWood,/sssolidsmodern2bodyFront/);
assert.match(solid.render({...modern,entity:'sensor.missing'},haModern),/>—<\/text>/);
assert.match(src,/HASSStudioSolidFuel\.render\(node,hass\)/);
assert(libHtml.includes('data-add-preset="solid_fuel"'));
assert.match(src,/field\(L\.solidFuel,'solid_fuel'/);
assert.match(src,/field\(L\.solidState,'solid_state'/);
console.log('OK: modern wood/coal boiler, burning/embers/off, original SVG, scoped defs.');


// New solid-fuel boiler geometry controls: global scale stays independent.
const stretchedModern=solid.render({...modern,width_scale:1.75,height_scale:.65},haModern);
assert.match(stretchedModern,/class="ss-solid-boiler-dimensions" transform="translate\(66 53\) scale\(1\.75 0\.65\) translate\(-60 -43\)"/);
assert.match(solid.render({...modern},haModern),/scale\(1 1\) translate\(-60 -43\)/);
assert.match(solid.render({...modern,width_scale:100,height_scale:-10},haModern),
  /scale\(2\.4 0\.5\) translate\(-60 -43\)/);
assert.match(src,/field\(L\.scale,'scale',obj\.scale/);
assert.match(src,/field\(L\.solidWidth\+'\s*\('\+Math\.round\(obj\.width_scale\*100\)/);
assert.match(src,/field\(L\.solidHeight\+'\s*\('\+Math\.round\(obj\.height_scale\*100\)/);
assert.match(src,/obj\.type==='boiler'&&\['solid_fuel','pellet_modern','heatpump_modern','gas_modern','electric_modern','fireplace_modern'\]\.includes\(obj\.variant\)\)\{\n\s*\/\/ Independent from/);
assert(src.includes('const outline=building?HASSStudioBuilding.geometry(node):distributionBoard?HASSStudioDistributionBoard.geometry(node):evCharger?HASSStudioEVCharger.geometry(node):inverter?HASSStudioInverter.geometry(node):energyStorage?HASSStudioEnergyStorage.geometry(node):radiator?HASSStudioRadiator.geometry(node):manifold?HASSStudioManifold.geometry(node):powerGrid?HASSStudioPowerGrid.geometry(node)'));
assert.match(src,/solidBoiler\?\{x:66/);
assert(src.includes("const previewBox=isBuilding?'0 0 150 185':(isDistribution||isEV)?'0 0 150 180':isInverter?'0 0 150 180':isStorage?'0 0 150 180':(isRadiator||isManifold)?"));
assert.match(src,/previewSolid\?\(\(66/);
console.log('OK: independent solid-fuel dimensions, proportional scale retained, responsive outline and preview.');


// Modern pellet boiler: source SVG, Warmwasser flames, shared combustion state.
const pelletSource=fs.readFileSync('src/pellet-stove.js','utf8');
const pellet=vm.runInNewContext(iconPrelude+solidSrc+'\n'+pelletSource+'\nHASSStudioPellet;', {});
const pelletNode={id:'pelletA',type:'boiler',variant:'pellet_modern',entity:'sensor.boiler',
  solid_state:'auto',solid_glow:76,burner_on_temp:50,burner_off_temp:35,
  width_scale:1,height_scale:1};
const pelletBurn=pellet.render(pelletNode,haModern);
assert.match(pelletBurn,/class="ss-modern-pellet" data-combustion="burning"/);
assert.match(pelletBurn,/id="sspelletpelletAhopperGroup"/);
assert.match(pelletBurn,/id="sspelletpelletAfeedSystem"/);
assert.match(pelletBurn,/class="ss-pellet-fuel"/);
assert.match(pelletBurn,/class="ss-fire"/);
assert.match(pelletBurn,/65\.0°/);
assert.match(pelletBurn,/clip-path="url\(#sspelletpelletApelletBurnerClip\)"/);
assert.doesNotMatch(pelletBurn,/<script\b|onload=|onclick=|<foreignObject/i);
const pelletEmbers=pellet.render({...pelletNode,entity:'sensor.low'},haModern);
assert.match(pelletEmbers,/class="ss-modern-pellet" data-combustion="embers"/);
assert.match(pelletEmbers,/class="ss-embers"/);
assert.doesNotMatch(pelletEmbers,/class="ss-fire"/);
const pelletOff=pellet.render({...pelletNode,solid_state:'off'},haModern);
assert.match(pelletOff,/data-combustion="off"/);
assert.doesNotMatch(pelletOff,/class="ss-fire"|class="ss-embers"/);
const pelletEntityOff=pellet.render({...pelletNode,burner_entity:'binary_sensor.fuel'},haModern);
assert.match(pelletEntityOff,/data-combustion="off"/);
const pelletUnknown=pellet.render({...pelletNode,entity:'sensor.missing'},haModern);
assert.match(pelletUnknown,/>—<\/text>/);
assert.match(pelletUnknown,/data-combustion="off"/);
const pelletInstance2=pellet.render({...pelletNode,id:'pelletB'},haModern);
assert.match(pelletInstance2,/sspelletpelletBsteelFront/);
assert.doesNotMatch(pelletBurn,/sspelletpelletBsteelFront/);
const pelletScaled=pellet.render({...pelletNode,width_scale:1.8,height_scale:.65},haModern);
assert.match(pelletScaled,/class="ss-pellet-dimensions" transform="translate\(97 46\) scale\(1\.8 0\.65\)/);
const gb=pellet.geometry({...pelletNode,width_scale:1.8,height_scale:.65});
assert.equal(gb.width,186*1.8);
assert.equal(gb.height,312*.65);
assert.equal(pellet.geometry(pelletNode).centerX,97);
assert.equal(registry.variantOptions('boiler','pl').find(([id])=>id==='pellet_modern')?.[1],'Pellet (nowoczesny)');
assert.match(src,/HASSStudioPellet\.render\(node,hass\)/);
assert(libHtml.includes('data-add-preset="pellet_modern"'));
assert.match(src,/modernPellet\?HASSStudioPellet\.geometry\(node\)/);
assert.match(src,/previewPellet\?/);
assert.match(src,/field\(L\.solidState,'solid_state'/);
assert.match(src,/field\(L\.solidGlow,'solid_glow'/);
console.log('OK: modern pellet renderer, Warmwasser flames/embers, shared state, HA readings, geometry.');

// Heat pump: HA watts/kilowatts, fan RPM or %, missing values and stop.
const heatPumpSource=fs.readFileSync('src/heat-pump-stove.js','utf8');
const hp=vm.runInNewContext(iconPrelude+heatPumpSource+'\nHASSStudioHeatPump;',{});
const hpNode={id:'hp1',type:'boiler',variant:'heatpump_modern',hp_power_entity:'sensor.power',hp_fan_entity:'sensor.fan',hp_max_rpm:1800,hp_glow:65,width_scale:1,height_scale:1};
const hpState={states:{'sensor.power':{state:'1800',attributes:{unit_of_measurement:'W'}},'sensor.fan':{state:'900',attributes:{unit_of_measurement:'rpm'}}}};
assert.equal(hp.power(hpState,'sensor.power'),1.8);
assert.equal(hp.fan(hpState,'sensor.fan',1800).percent,50);
assert.equal(hp.power({states:{'sensor.power':{state:'3',attributes:{unit_of_measurement:'kWh'}}}},'sensor.power'),null);
assert.equal(hp.power({states:{'sensor.power':{state:'1.8',attributes:{unit_of_measurement:'kW'}}}},'sensor.power'),1.8);
assert.equal(hp.fan({states:{'sensor.fan':{state:'0',attributes:{unit_of_measurement:'%'}}}},'sensor.fan').percent,0);
const hpSvg=hp.render(hpNode,hpState);
assert.match(hpSvg,/1\.80 kW/);assert.match(hpSvg,/900 RPM/);assert.match(hpSvg,/class="ss-hp-rotating"/);
assert.match(hpSvg,/class="ss-modern-heat-pump"/);assert.match(hpSvg,/sshphp1bodyGrad/);
assert.match(hp.render({...hpNode,hp_fan_entity:'sensor.absent'},hpState),/class="ss-hp-still"/);
assert.match(src,/HASSStudioHeatPump\.render\(node,hass\)/);
console.log('OK: modern heat pump power and fan state.');

// Modern gas boiler: measured modulation %, temperature and no invented values.
const gasSrc=fs.readFileSync('src/gas-boiler.js','utf8');
const gas=vm.runInNewContext(iconPrelude+gasSrc+'\nHASSStudioGasBoiler;',{});
const gasNode={id:'gas1',type:'boiler',variant:'gas_modern',entity:'sensor.boiler',gas_draw_entity:'sensor.mod',gas_glow:62,width_scale:1,height_scale:1};
const gasState={states:{'sensor.boiler':{state:'65',attributes:{unit_of_measurement:'°C'}},'sensor.mod':{state:'42',attributes:{unit_of_measurement:'%'}},'binary_sensor.burner':{state:'off'}}};
assert.equal(gas.temperature(gasState,'sensor.boiler'),65);
assert.equal(gas.modulation(gasState,'sensor.mod'),42);
assert.equal(gas.modulation({states:{'sensor.mod':{state:'101',attributes:{unit_of_measurement:'%'}}}},'sensor.mod'),null);
assert.equal(gas.modulation({states:{'sensor.mod':{state:'3',attributes:{unit_of_measurement:'m³/h'}}}},'sensor.mod'),null);
assert.equal(gas.modulation({states:{'sensor.mod':{state:'0'}}},'sensor.mod'),0);
const gasSvg=gas.render(gasNode,gasState);
assert.match(gasSvg,/65\.0°/);
assert.match(gasSvg,/data-modulation="42\.0" data-burning="on"/);
assert.match(gasSvg,/id="ssgasgas1bodyGrad"/);
assert.match(gasSvg,/id="ssgasgas1gasAuraOutline"/);
assert.match(gasSvg,/id="ssgasgas1frontIcon" transform="translate\(-60 0\)"/);
assert.match(gasSvg,/id="ssgasgas1barLevel1"[^>]*opacity="1"/);
assert.match(gasSvg,/id="ssgasgas1barLevel2"[^>]*opacity="1"/);
assert.match(gasSvg,/id="ssgasgas1barLevel3"[^>]*opacity="0\.16"/);
assert.match(gas.render({...gasNode,gas_draw_entity:'sensor.missing'},gasState),/data-modulation="unknown" data-burning="off"/);
assert.match(gas.render({...gasNode,burner_entity:'binary_sensor.burner'},gasState),/data-burning="off"/);
assert.match(gas.render({...gasNode,width_scale:1.4,height_scale:.8},gasState),/scale\(1\.4 0\.8\)/);
assert.doesNotMatch(gasSvg,/<script\b|onload=|onclick=|<foreignObject/i);
assert.match(src,/HASSStudioGasBoiler\.render\(node,hass\)/);
assert(libHtml.includes('data-add-preset="gas_modern"'));
console.log('OK: gas boiler modulation, temperature, SVG isolation and resizing.');

// Modern electric: actual power, water temperature and 260-degree load ring.
const electricSrc=fs.readFileSync('src/electric-boiler.js','utf8');
const electric=vm.runInNewContext(iconPrelude+electricSrc+'\nHASSStudioElectricBoiler;',{});
const electricNode={id:'electric1',type:'boiler',variant:'electric_modern',
  electric_power_entity:'sensor.watts',entity:'sensor.water',
  electric_max_kw:8,electric_glow:60,width_scale:1,height_scale:1};
const electricHass={states:{
  'sensor.watts':{state:'3200',attributes:{unit_of_measurement:'W'}},
  'sensor.water':{state:'52',attributes:{unit_of_measurement:'°C'}},
  'sensor.percent':{state:'25',attributes:{unit_of_measurement:'%'}}}};
assert.equal(electric.power(electricHass,'sensor.watts'),3.2);
assert.equal(electric.load(electricHass,electricNode),40);
assert.equal(electric.load(electricHass,{...electricNode,electric_load_entity:'sensor.percent'}),25);
assert.equal(electric.temperature(electricHass,'sensor.water'),52);
assert.equal(electric.power({states:{'sensor.watts':{state:'12',attributes:{unit_of_measurement:'kWh'}}}},'sensor.watts'),null);
assert.equal(electric.load(electricHass,{...electricNode,electric_power_entity:'sensor.unknown'}),null);
const elSvg=electric.render(electricNode,electricHass);
assert.match(elSvg,/3\.20 kW/);
assert.match(elSvg,/52\.0°C/);
assert.match(elSvg,/data-load="40\.0"/);
assert.match(elSvg,/id="sselectricelectric1powerRing"/);
assert.match(elSvg,/stroke-dasharray="281\.35 389\.56"/);
assert.match(electric.render({...electricNode,electric_power_entity:'sensor.missing'},electricHass),/data-load="unknown" data-power="unknown"/);
assert.match(electric.render({...electricNode,width_scale:1.7,height_scale:.8},electricHass),/scale\(1\.7 0\.8\)/);
assert.match(src,/HASSStudioElectricBoiler\.render\(node,hass\)/);
assert(libHtml.includes('data-add-preset="electric_modern"'));
console.log('OK: modern electric boiler, HA power/load/temp, ring and resizing.');

// Modern fireplace: uploaded SVG with Warmwasser flames.
const fireplaceSrc=fs.readFileSync('src/fireplace.js','utf8');
const fireplace=vm.runInNewContext(iconPrelude+solidSrc+'\n'+fireplaceSrc+'\nHASSStudioFireplace;',{});
const hearth={id:'hearth1',type:'boiler',variant:'fireplace_modern',entity:'sensor.boiler',solid_state:'burning',solid_glow:65,width_scale:1,height_scale:1};
const flameSvg=fireplace.render(hearth,haModern);
assert.match(flameSvg,/class="ss-modern-fireplace" data-combustion="burning"/);
assert.match(flameSvg,/class="ss-fire"/);
assert.match(flameSvg,/class="ss-fireplace-wood"/);
assert.match(flameSvg,/65\.0°C/);
assert.match(flameSvg,/id="ssfireplacehearth1fireClip"/);
assert.match(flameSvg,/clip-path="url\(#ssfireplacehearth1fireClip\)"/);
const emberSvg=fireplace.render({...hearth,solid_state:'embers'},haModern);
assert.match(emberSvg,/class="ss-embers"/);
assert.doesNotMatch(emberSvg,/class="ss-fire"/);
assert.doesNotMatch(fireplace.render({...hearth,solid_state:'off'},haModern),/class="ss-fire"|class="ss-embers"/);
assert.match(fireplace.render({...hearth,entity:'sensor.missing'},haModern),/>—<\/text>/);
assert.match(fireplace.render({...hearth,width_scale:1.4,height_scale:.75},haModern),/scale\(1\.4 0\.75\)/);
assert.match(src,/HASSStudioFireplace\.render\(node,hass\)/);
assert(libHtml.includes('data-add-preset="fireplace_modern"'));
console.log('OK: modern fireplace flames, embers, temperature and sizing.');

// v0.4.16 compatibility and hierarchical-library regression assertions.
assert(libHtml.includes('ha-icon') && libHtml.includes('mdi:'));
assert(libHtml.includes('Kolektory solarne') && libHtml.includes('ss-lib-subgroup'));
assert(inspectSrc.includes('ss-part-card') && inspectSrc.includes('getExpandedPartId'));
assert(inspectSrc.includes("'aspect_locked'"));
assert(src.includes("obj.scale_mode='free';") && !src.includes("obj.scale=1;\n          obj.scale_mode='free';"));

// Local icon preview must track the split source modules and every registered renderer.
const preview=fs.readFileSync('dev/icon-preview.html','utf8');
for(const dependency of ['ha-state.js','animation-state.js','device-registry.js',
  'warmwasser-shapes.js','studio-tank.js','svg-template.js','solid-fuel-stove.js',
  'pellet-stove.js','heat-pump-stove.js','gas-boiler.js','electric-boiler.js','fireplace.js']){
  assert(preview.includes('src="'+ '../src/'+dependency+'"'), 'Missing preview module '+dependency);
}
assert(preview.indexOf('src="../src/ha-state.js"')<preview.indexOf('src="../src/studio-tank.js"'));
assert(preview.indexOf('src="../src/svg-template.js"')<preview.indexOf('src="../src/solid-fuel-stove.js"'));
assert.match(preview,/registry\.variantsFor\(type\)/);
assert.match(preview,/await ensureAsset\(def\)/);
assert.match(preview,/if\(request!==drawSerial\)return/);
const renderers=registry.listTypes().flatMap(type=>registry.variantsFor(type)).map(x=>x.renderer);
for(const name of new Set(renderers)){
  assert(preview.includes(name+':{api:'),'Preview renderer not wired: '+name);
}
console.log('OK: standalone icon preview dependencies, registry-backed variants and SVG asset loading.');

// Viewport geometry and backwards-compatible canvas size.
const viewport=vm.runInNewContext(fs.readFileSync('src/studio-viewport.js','utf8')+'\nHASSStudioViewport;');
assert.equal(viewport.dimensions({}).height,700);
assert.equal(viewport.dimensions({studio_layout:{nodes:[],connections:[]}}).height,720);
assert.equal(viewport.dimensions({studio_layout:{width:1800,height:950,nodes:[]}}).width,1800);
const cam=viewport.fresh(1200,700);
const frame=viewport.box(cam,600,350,1200,700);
assert.equal(frame.width,1200);assert.equal(frame.height,700);
const enlarged=viewport.zoomAt(cam,2,300,175,600,350,1200,700);
assert.equal(enlarged.zoom,2);
assert.equal(viewport.box(enlarged,600,350,1200,700).width,600);
assert(src.includes('ss-shortcuts')&&src.includes('ss-help'));
assert(src.includes('ss-apply-size')&&src.includes('ss-card-viewport'));
assert(src.includes("event.key==='Delete'")||src.includes("['Delete','Backspace']"));
console.log('OK: configurable viewport, legacy dimensions, shortcuts and help overlay.');

// Viewer gestures keep native HA entity history clicks intact and allow drag beyond initial target.
const gestureSource=fs.readFileSync('src/studio-viewer-gestures.js','utf8');
assert(gestureSource.includes('const install=')&&gestureSource.includes('suppressClick'));
assert(gestureSource.includes("win.addEventListener('pointermove',onMove"));
assert(gestureSource.includes('root.addEventListener(\'click\',onClick,true)'));
assert(gestureSource.includes('if(!dragging && movement<'));
assert(src.includes('HASSStudioViewerGestures.install('));
assert(src.includes("view.style.touchAction"));
console.log('OK: viewer gestures preserve ordinary entity clicks, sustained pan and touch zoom.');

// Mobile navigation regression: touch gestures work immediately at Fit, below 100%
// and after tapping minus, without converting an ordinary entity tap into pan.
assert(!gestureSource.includes('const interactive=()=>'));
assert(gestureSource.includes("classList?.contains?.('ss-svg')"));
const touchGestureApi=vm.runInNewContext(gestureSource+'\nHASSStudioViewerGestures;',{});
const makeEventSource=()=>{
  const events=new Map();
  return {events,source:{addEventListener:(type,handler)=>events.set(type,handler),
    removeEventListener:(type,handler)=>{if(events.get(type)===handler)events.delete(type);}}};
};
const tr=makeEventSource(),tw=makeEventSource(),td=makeEventSource();
const touchSvg={classList:{contains:name=>name==='ss-svg'},
  getBoundingClientRect:()=>({left:0,top:0,width:600,height:350})};
const touchView={id:'ss-card-viewport',querySelector:()=>touchSvg};
let touchCamera=viewport.fresh(1200,700);
const disconnectTouch=touchGestureApi.install({root:tr.source,win:tw.source,doc:{...td.source,fullscreenElement:null},
  host:{},viewport,getView:()=>touchView,getDimensions:()=>({width:1200,height:700}),
  getCamera:()=>touchCamera,setCamera:c=>{touchCamera=c;}});
const touchEvent=(pointerId,clientX,clientY)=>({pointerId,clientX,clientY,button:0,pointerType:'touch',
  cancelable:true,composedPath:()=>[touchSvg,touchView],preventDefault(){this.prevented=true;}});
const tDown=(...args)=>tr.events.get('pointerdown')(touchEvent(...args));
const tMove=(...args)=>tw.events.get('pointermove')(touchEvent(...args));
const tUp=(...args)=>tw.events.get('pointerup')(touchEvent(...args));
const tFit=()=>{tr.events.get('click')({composedPath:()=>[{dataset:{viewAction:'fit'}},touchView],
  preventDefault(){},stopPropagation(){}});};
const tMinus=()=>{tr.events.get('click')({composedPath:()=>[{dataset:{viewAction:'out'}},touchView],
  preventDefault(){},stopPropagation(){}});};
const tap={clientX:100,clientY:100,composedPath:()=>[touchSvg,touchView],
  preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.blocked=true;}};
tDown(1,100,100);tUp(1,100,100);tr.events.get('click')(tap);
assert.equal(tap.prevented,undefined,'tap for HA entity history must not be swallowed');
tDown(1,100,100);tMove(1,140,125);
assert.notEqual(touchCamera.cx,600,'one-finger pan must work at Fit');tUp(1,140,125);
tFit();assert.equal(touchCamera.zoom,1);
tDown(1,100,100);tDown(2,200,100);tMove(2,250,100);
assert(touchCamera.zoom>1,'pinch to zoom must work from Fit without tapping +');
tUp(1,100,100);tUp(2,250,100);
tFit();tMinus();assert.equal(touchCamera.zoom,.8);
const belowFitCenter=touchCamera.cx;
tDown(3,100,100);tMove(3,140,100);
assert.notEqual(touchCamera.cx,belowFitCenter,'pan must work after zooming out with minus');tUp(3,140,100);
tDown(4,100,100);tDown(5,200,100);tMove(5,180,100);
assert(touchCamera.zoom<.8,'pinch zoom-out must work below 100%');
tUp(4,100,100);tUp(5,180,100);
assert(src.includes(".ss-card-viewport svg{")&&src.includes("max-height:none;touch-action:none}"));
assert(src.includes("if(svg.style.touchAction!=='none')svg.style.touchAction='none'"));
assert(src.includes("const viewTouchMode=fullscreen?'none':'pan-y'"));
disconnectTouch();
console.log('OK: mobile Fit / minus pinch and pan, HA tap history, touch-action lifecycle.');

// Wheel gestures: preserve native HA scroll, use cursor anchor and respond to
// Firefox Shift-horizontal wheel, high-resolution touchpads, and wheel units.
const wr=makeEventSource(),ww=makeEventSource(),wd=makeEventSource();
const wheelDoc={...wd.source,fullscreenElement:null};
let wheelCamera=viewport.fresh(1200,700);
const wheelView={id:'ss-card-viewport',querySelector:()=>touchSvg};
const disconnectWheel=touchGestureApi.install({
  root:wr.source,win:ww.source,doc:wheelDoc,host:{},viewport,
  getView:()=>wheelView,getDimensions:()=>({width:1200,height:700}),
  getCamera:()=>wheelCamera,setCamera:c=>{wheelCamera=c;}
});
const spin=(deltaY,options={})=>{
  const e={clientX:150,clientY:100,deltaY,deltaX:0,deltaMode:0,shiftKey:false,
    composedPath:()=>[touchSvg,wheelView],preventDefault(){this.prevented=true;},...options};
  wr.events.get('wheel')(e);
  return e;
};
assert.equal(wr.events.has('wheel'),true);
const normalSpin=spin(-120);
assert.equal(normalSpin.prevented,undefined,'plain wheel must scroll HA');
assert.equal(wheelCamera.zoom,1,'plain wheel must not zoom dashboard card');
const offCard=spin(-120,{shiftKey:true,composedPath:()=>[{}]});
assert.equal(offCard.prevented,undefined,'Shift+wheel outside viewport must be ignored');
const cursorBefore=viewport.worldAt(wheelCamera,150,100,600,350,1200,700);
const zoomIn=spin(-120,{shiftKey:true});
assert.equal(zoomIn.prevented,true,'Shift+wheel should cancel page scroll');
assert(wheelCamera.zoom>1&&wheelCamera.zoom<1.2,'wheel notch must zoom smoothly');
const cursorAfter=viewport.worldAt(wheelCamera,150,100,600,350,1200,700);
assert(Math.abs(cursorBefore.x-cursorAfter.x)<1e-8&&Math.abs(cursorBefore.y-cursorAfter.y)<1e-8,
  'wheel zoom must preserve location beneath cursor');
const zoomAfterNotch=wheelCamera.zoom;
spin(-1,{shiftKey:true});
assert(wheelCamera.zoom>zoomAfterNotch&&wheelCamera.zoom<zoomAfterNotch*1.01,
  'small touchpad motion should create a small zoom step');
const beforeHorizontal=wheelCamera.zoom;
spin(0,{deltaX:-3,deltaMode:1,shiftKey:true});
assert(wheelCamera.zoom>beforeHorizontal,'Firefox Shift+horizontal wheel must zoom in');
spin(0,{deltaX:3,deltaMode:1,shiftKey:true});
assert(Math.abs(wheelCamera.zoom-beforeHorizontal)<1e-10,'opposite horizontal wheel deltas should cancel');
const beforeZero=wheelCamera.zoom;
assert.equal(spin(0,{shiftKey:true}).prevented,undefined,'zero wheel movement should not be swallowed');
assert.equal(wheelCamera.zoom,beforeZero);
spin(-10000,{shiftKey:true});
assert(wheelCamera.zoom<=8,'very large deltas must respect maximum zoom');
spin(10000,{shiftKey:true});
assert(wheelCamera.zoom>=.2,'very large deltas must respect minimum zoom');
wheelDoc.fullscreenElement=wheelView;
const beforeFull=wheelCamera.zoom;
assert.equal(spin(-120).prevented,true,'fullscreen wheel must zoom without Shift');
assert(wheelCamera.zoom>beforeFull);
disconnectWheel();
assert.equal(wr.events.has('wheel'),false,'wheel event must be removed on cleanup');
console.log('OK: Shift+wheel anchored zoom, HA scroll, Firefox horizontal delta, touchpad and fullscreen.');

// Header toolbar must be outside SVG drawing but within full-screen viewer.
const toolbarSrc=fs.readFileSync('src/studio-custom.js','utf8');
assert(toolbarSrc.includes('ss-card-header')&&toolbarSrc.includes('ss-card-title'));
assert(toolbarSrc.includes('data-view-action="fit"'));
assert(toolbarSrc.includes('data-view-action="full"'));
assert(toolbarSrc.indexOf('class="ss-card-header"')<toolbarSrc.indexOf('canvasSvg(this._cfg,this._hass)'));
console.log('OK: viewer zoom tools live in the card header, outside drawing.');

// Scheme labels and complete pipe translation regression checks.
const connectionLib=vm.runInNewContext(fs.readFileSync('src/studio-canvas.js','utf8')+'\nHASSStudioCanvas;');
const connectionShift=connectionLib.create({W:1200,H:720,colors:{},normalized:()=>({nodes:[],connections:[]}),pickLang:()=> 'pl',words:{pl:{}},clamp:(n,lo,hi,fb)=>Number.isFinite(Number(n))?Math.min(hi,Math.max(lo,Number(n))):fb,validEntity:()=>false,esc:String}).translateConnectionPoints;
const points=[{x:40,y:50},{x:90,y:50},{x:90,y:150}];
const shifted=connectionShift(points,23,-12);
assert.equal(JSON.stringify(shifted),JSON.stringify([{x:65,y:40},{x:115,y:40},{x:115,y:140}]));
assert.equal(points[0].x,40); // original vertices remain unchanged
const boundary=connectionShift([{x:9998,y:70},{x:9999,y:70}],20,10);
assert.equal(boundary[1].x,10000);
const studio=fs.readFileSync('src/studio-custom.js','utf8');
assert(studio.includes('id="ss-scheme-name"')&&studio.includes("const label=esc('Home Assistant System Studio')"));
assert(studio.includes("drag={type:'connection'")&&studio.includes("drag.type==='connection'"));
assert(studio.includes("drag.type!=='pan'&&drag.moved"));
assert(studio.includes("lastConnectionPointer={id:obj.id")&&studio.includes("const connectionId=el?.dataset.id||fallback"));
assert(studio.includes("renderProps();return; // Keep selection"));
assert(studio.includes("stage.classList.add('ss-dragging')")&&studio.includes("stage.classList.remove('ss-dragging')"));
assert(studio.includes("cursor:default")&&studio.includes("cursor:grabbing!important"));
assert(!studio.includes("cursor:grab}"));
assert(studio.includes("drag.captured=true")&&studio.includes("if(event.type==='pointercancel')"));
console.log('OK: scheme title, pipe selection, drag cursor and non-deforming translation.');
