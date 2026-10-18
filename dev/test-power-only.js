/* Power-only UI/engine contract: HA, forced TEST, backup, signed storage, visual-only pylon. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={isEnt:id=>typeof id==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(id)};
vm.createContext(ctx);
for(const file of ['ha-state.js','readout-scale.js','device-registry.js','studio-viewport.js',
  'inverter.js','building.js','ev-charger.js','energy-storage.js','power-grid.js',
  'distribution-board.js','radiator.js','manifold.js','energy-topology.js',
  'energy-balance.js','energy-flow.js','energy-diagnostics.js','power-flow.js','studio-layout.js'])
  vm.runInContext(fs.readFileSync('src/'+file,'utf8'),ctx,{filename:file});
vm.runInContext('this.layout=HASSStudioLayout;this.balance=HASSStudioEnergyBalance;this.inverter=HASSStudioInverter;this.grid=HASSStudioPowerGrid;',ctx);
const {layout,balance,inverter,grid}=ctx;
const port={id:'ac',medium:'ac',bus:'main',x:50,y:50};
const pv={id:'pv',type:'inverter',variant:'modern',energy_ports:[port],
  energy_mode:'test',inverter:{mode:'live',entities:{ac_power:'sensor.pv'},manual:{ac_power:6.4}}};
const house={id:'house',type:'building',variant:'house',energy_ports:[port],
  energy_mode:'test',building:{mode:'live',power_kw:2,measurement:'individual'}};
const utility={id:'grid',type:'power_grid',variant:'classic',energy_ports:[port],
  energy_grid_auto:true,energy_mode:'test',
  power_grid:{mode:'manual',show_extras:['total_kw','import_kw','export_kw','frequency'],
    manual:{total_kw:50,frequency:50,l1_v:231,l1_a:4,l2_v:230,l2_a:3,l3_v:232,l3_a:5}}};
const edge=(id,a,b)=>({id,type:'electric',points:[{x:0,y:0},{x:100,y:0}],
  energy_start:{node_id:a,port_id:'ac'},energy_end:{node_id:b,port_id:'ac'},
  animation:{flow_power_mode:'balance'}});
const links=[edge('a','pv','grid'),edge('b','grid','house')];
const entity=(state,unit)=>({state,attributes:{unit_of_measurement:unit}});
const hass={states:{'sensor.pv':entity('0','W')}};
const resolve=(pvNode=pv,extra=[],state=hass)=>{
  const data=layout.normalized({studio_layout:{
    energy_balance:{enabled:true,scenario:'hybrid',participants:[]},
    nodes:[pvNode,house,utility,...extra],connections:links
  }});
  const network=balance.resolve(data,state).networks[0];
  const get=id=>network.devices.find(n=>n.node_id===id);
  return {data,network,get};
};
const eq=(actual,expected)=>assert(Math.abs(actual-expected)<1e-6,actual+' != '+expected);
let x=resolve();
assert.equal(x.network.state,'balanced');
eq(x.get('pv').injection_kw,6.4);
eq(x.get('house').injection_kw,-2);
eq(x.get('grid').injection_kw,-4.4);
eq(inverter.data(x.data.nodes[0],hass).power,6.4);

// Actual HA zero is a valid reading, even when TEST=6.4.
x=resolve({...pv,energy_mode:'auto',energy_fallback_enabled:true});
eq(x.get('pv').injection_kw,0);eq(x.get('grid').injection_kw,2);
eq(inverter.data(x.data.nodes[0],hass).power,0);

// Explicit HA-only with an unavailable sensor cannot be invented from defaults.
x=resolve({...pv,energy_mode:'ha'},{},{states:{'sensor.pv':entity('unavailable','W')}});
assert.equal(x.network.state,'insufficient');

const noData={states:{'sensor.pv':entity('unavailable','W')}};
x=resolve({...pv,energy_mode:'auto',energy_fallback_enabled:true},[],noData);
eq(x.get('pv').injection_kw,6.4);eq(x.get('grid').injection_kw,-4.4);

// The pylon never exposes legacy configured power as a screen row.
const gc=grid.normalize(x.data.nodes.find(n=>n.id==='grid'));
assert(!gc.show_extras.includes('total_kw'));
assert(!gc.show_extras.includes('import_kw'));
assert(!gc.show_extras.includes('export_kw'));
assert.equal(grid.reading('l1_v',{...gc,energy_mode:'test'},hass),231);
assert.equal(grid.reading('frequency',{...gc,energy_mode:'test'},hass),50);

console.log('Power-only contract: forced TEST, HA zero, fallback, no phantom grid power PASS');
