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
