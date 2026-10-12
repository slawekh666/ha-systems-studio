/* Basic SVG and logic regression tests; browser integration remains for HA. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('src/studio-custom.js','utf8');
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
assert(src.includes('class="ss-accessory" data-pipe=') && src.includes("item.entity?' data-more="), 'accessory history binding missing');
assert.match(src,/\.ss-svg:not\(\.ss-svg-editor\) \.ss-pipe\{pointer-events:none\}/);
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
assert(src.includes('symbolOnPipe(item,pipe,hass,language)'), 'pipe caption renderer missing');
const tallBoiler=api.render(wood,state({'sensor.boiler':65}));
assert.match(tallBoiler,/y="-104" width="18" height="150"/);
assert.match(tallBoiler,/y="30" width="91" height="169"/);
assert(tallBoiler.includes('clip-path="url(#wwboilerwoodFireClip)"'));
assert.match(tallBoiler,/<g data-more="sensor.boiler">/);
console.log('OK: independent sensor scaling, sensor labels, accessory captions, tall boiler geometry.');

// Modular tank invariants: data-driven temperatures and decorative heat only.
const tankSrc=fs.readFileSync('src/studio-tank.js','utf8');
const tankApi=vm.runInNewContext(tankSrc+'\nHASSStudioTank;',{});
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
assert.match(src,/key==='scale_mode'/);
assert.match(src,/field\(L\.tankWidthScale,'width_scale'/);
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
assert.match(src,/field\(L\.tankWidthScale,'width_scale',freeScale\?/);
assert.match(src,/field\(L\.tankHeightScale,'height_scale',freeScale\?/);
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
const solidSrc=fs.readFileSync('src/solid-fuel-stove.js','utf8');
const solid=vm.runInNewContext(solidSrc+'\nHASSStudioSolidFuel;', {});
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
assert.match(src,/data-add-preset="solid_fuel"/);
assert.match(src,/field\(L\.solidFuel,'solid_fuel'/);
assert.match(src,/field\(L\.solidState,'solid_state'/);
console.log('OK: modern wood/coal boiler, burning/embers/off, original SVG, scoped defs.');


// New solid-fuel boiler geometry controls: global scale stays independent.
const stretchedModern=solid.render({...modern,width_scale:1.75,height_scale:.65},haModern);
assert.match(stretchedModern,/class="ss-solid-boiler-dimensions" transform="translate\(66 53\) scale\(1\.75 0\.65\) translate\(-66 -53\)"/);
assert.match(solid.render({...modern},haModern),/scale\(1 1\) translate\(-66 -53\)/);
assert.match(solid.render({...modern,width_scale:100,height_scale:-10},haModern),
  /scale\(2\.4 0\.5\) translate\(-66 -53\)/);
assert.match(src,/field\(L\.scale,'scale',obj\.scale/);
assert.match(src,/field\(L\.solidWidth\+'\s*\('\+Math\.round\(obj\.width_scale\*100\)/);
assert.match(src,/field\(L\.solidHeight\+'\s*\('\+Math\.round\(obj\.height_scale\*100\)/);
assert.match(src,/obj\.type==='boiler'&&\['solid_fuel','pellet_modern'\]\.includes\(obj\.variant\)\)\{\n\s*\/\/ Independent from/);
assert.match(src,/const outline=modernPellet\?HASSStudioPellet\.geometry\(node\):/);
assert.match(src,/solidBoiler\?\{x:66/);
assert.match(src,/const previewBox=previewSolid\?/);
console.log('OK: independent solid-fuel dimensions, proportional scale retained, responsive outline and preview.');


// Modern pellet boiler: source SVG, Warmwasser flames, shared combustion state.
const pelletSource=fs.readFileSync('src/pellet-stove.js','utf8');
const pellet=vm.runInNewContext(solidSrc+'\n'+pelletSource+'\nHASSStudioPellet;', {});
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
assert.match(src,/pellet_modern:'Pellet \(nowoczesny\)'/);
assert.match(src,/HASSStudioPellet\.render\(node,hass\)/);
assert.match(src,/data-add-preset="pellet_modern"/);
assert.match(src,/const outline=modernPellet\?HASSStudioPellet\.geometry\(node\)/);
assert.match(src,/const previewBox=previewPellet\?/);
assert.match(src,/field\(L\.solidState,'solid_state'/);
assert.match(src,/field\(L\.solidGlow,'solid_glow'/);
console.log('OK: modern pellet renderer, Warmwasser flames/embers, shared state, HA readings, geometry.');
