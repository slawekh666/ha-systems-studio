/* Stage 07A.1-A: pure model, backwards compatibility and no fabricated readings. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={};vm.createContext(context);
for(const f of ['src/ha-state.js','src/readout-scale.js','src/building.js'])
 vm.runInContext(fs.readFileSync(f,'utf8'),context,{filename:f});
vm.runInContext('this.building=HASSStudioBuilding;',context);
const B=context.building,eq=(a,b)=>assert(Math.abs(a-b)<1e-6,a+' != '+b);
const snapshot=args=>B.powerSnapshot(args);
const raw={measured_kw:10,source:'measured',children_consumption_kw:7.2,children_generation_kw:0};
const total=snapshot({measurement:'aggregate',...raw});
assert.equal(total.status,'complete');assert.equal(total.measurement_scope,'gross');
eq(total.measured_kw,10);eq(total.gross_consumption_kw,10);
eq(total.own_consumption_kw,2.8);eq(total.net_supply_kw,10);
assert.equal(total.field_sources.measured_kw,'measured');
assert.equal(total.field_sources.gross_consumption_kw,'measured');
assert.equal(total.field_sources.own_consumption_kw,'calculated');
assert.equal(total.field_sources.net_supply_kw,'calculated');
console.log('A: aggregate 10 kW house incl. EV 7.2 kW => 2.8 kW own, 10 kW boundary PASS');
const own=snapshot({measurement:'individual',measured_kw:3,source:'simulated',
 children_consumption_kw:7.2,children_generation_kw:0});
assert.equal(own.status,'complete');eq(own.own_consumption_kw,3);
eq(own.gross_consumption_kw,10.2);eq(own.net_supply_kw,10.2);
assert.equal(own.field_sources.own_consumption_kw,'simulated');
console.log('B: own 3 kW plus EV 7.2 kW => 10.2 kW total PASS');
for(const measurement of ['individual','aggregate','net']){
 const r=snapshot({measurement,measured_kw:measurement==='net'?6:10,
  source:'simulated',children_consumption_kw:7,children_generation_kw:4});
 assert.equal(r.status,'complete');assert.equal(r.measurement,measurement);
 if(measurement==='net'){eq(r.own_consumption_kw,3);eq(r.gross_consumption_kw,10);eq(r.net_supply_kw,6);}
 if(measurement==='aggregate'){eq(r.own_consumption_kw,3);eq(r.gross_consumption_kw,10);eq(r.net_supply_kw,6);}
}
const ownWithBattery=snapshot({measurement:'individual',measured_kw:3,source:'measured',
 children_consumption_kw:7,children_generation_kw:4});
eq(ownWithBattery.own_consumption_kw,3);eq(ownWithBattery.gross_consumption_kw,10);
eq(ownWithBattery.net_supply_kw,6);
console.log('C: source/storage discharge behind building counted once, net import 6 kW PASS');
const exportNet=snapshot({measurement:'net',measured_kw:-2,source:'measured',
 children_consumption_kw:0,children_generation_kw:5});
assert.equal(exportNet.status,'complete');eq(exportNet.own_consumption_kw,3);
eq(exportNet.gross_consumption_kw,3);eq(exportNet.net_supply_kw,-2);
assert.equal(exportNet.field_sources.net_supply_kw,'measured');
console.log('D: signed net export -2 kW with 5 kW generation and own load 3 kW PASS');
const contradictory=snapshot({measurement:'aggregate',measured_kw:3,source:'simulated',
 children_consumption_kw:7.2,children_generation_kw:0});
assert.equal(contradictory.status,'invalid');assert(contradictory.reasons.includes('children_exceed_gross'));
eq(contradictory.measured_kw,3);eq(contradictory.gross_consumption_kw,3);
assert.equal(contradictory.own_consumption_kw,null);
assert.equal(contradictory.net_supply_kw,null);
assert.equal(contradictory.field_sources.net_supply_kw,'missing');
console.log('E: 3 kW gross cannot contain a 7.2 kW EV; no negative own consumption PASS');
const zero=snapshot({measurement:'net',measured_kw:0,source:'measured',
 children_consumption_kw:0,children_generation_kw:0});
assert.equal(zero.status,'complete');eq(zero.own_consumption_kw,0);
eq(zero.gross_consumption_kw,0);eq(zero.net_supply_kw,0);
const partial=snapshot({measurement:'aggregate',measured_kw:10,source:'measured',
 children_consumption_kw:null,children_generation_kw:0});
assert.equal(partial.status,'partial');eq(partial.gross_consumption_kw,10);
eq(partial.net_supply_kw,10);assert.equal(partial.own_consumption_kw,null);
const missing=snapshot({measurement:'individual',measured_kw:null,
 children_consumption_kw:7.2,children_generation_kw:0});
assert.equal(missing.status,'partial');assert.equal(missing.own_consumption_kw,null);
assert.equal(missing.net_supply_kw,null);
const empty=snapshot({measurement:'aggregate'});
assert.equal(empty.status,'missing');assert.equal(empty.gross_consumption_kw,null);
const partialNet=snapshot({measurement:'net',measured_kw:-2,source:'measured',
 children_consumption_kw:null,children_generation_kw:5});
assert.equal(partialNet.status,'partial');eq(partialNet.gross_consumption_kw,3);
assert.equal(partialNet.own_consumption_kw,null);
console.log('F: unavailable is not zero, valid zero and partial derivations preserved PASS');
for(const bad of [
 {measurement:'aggregate',measured_kw:-1,children_consumption_kw:0,children_generation_kw:0},
 {measurement:'net',measured_kw:-6,children_consumption_kw:7,children_generation_kw:4},
 {measurement:'aggregate',measured_kw:5,children_consumption_kw:NaN,children_generation_kw:0},
 {measurement:'individual',measured_kw:3,children_consumption_kw:-1,children_generation_kw:0},
 {measurement:'individual',measured_kw:'3',children_consumption_kw:0,children_generation_kw:0}
])assert.equal(snapshot(bad).status,'invalid');
console.log('G: invalid data and impossible negative own load fail closed PASS');
assert.equal(B.normalize({building:{measurement:'aggregate'}}).measurement,'aggregate');
assert.equal(B.normalize({building:{measurement:'individual'}}).measurement,'individual');
assert.equal(B.normalize({building:{measurement:'net'}}).measurement,'net');
assert.equal(B.normalize({building:{measurement:'typo'}}).measurement,'individual');
const saved={building:{measurement:'aggregate',power_kw:10,daily_kwh:42}};
const before=JSON.stringify(saved);B.normalize(saved);assert.equal(JSON.stringify(saved),before);
assert.equal(B.defaults().measurement,'individual');
const imm=snapshot({...raw,measurement:'aggregate'});
assert(Object.isFrozen(imm));assert(Object.isFrozen(imm.field_sources));assert(Object.isFrozen(imm.reasons));
console.log('H: legacy saved modes unchanged; third mode normalized; pure immutable output PASS');
console.log('PASS: Stage 07A.1-A building power contract.');
