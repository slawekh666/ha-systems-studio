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
assert.match(partRender,/<g class="ss-temperature-badge" data-more="sensor.tank_top">/);
assert.match(partRender,/<g class="ss-heater" data-more="switch.heater">/);
assert.match(partRender,/<g class="ss-coil" data-more="binary_sensor.coil">/);
assert.match(src,/class="ss-accessory" data-pipe="[^\n]*data-more/);
assert.match(src,/\.ss-svg:not\(\.ss-svg-editor\) \.ss-pipe\{pointer-events:none\}/);
assert.match(src,/\(editable\?' ss-svg-editor':''\)/);
assert.match(src,/const ent=node.entity\?' data-more="/);
console.log('OK: history click targets for individual sensors, heaters, coils and pipe accessories.');
