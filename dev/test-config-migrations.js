/* Stage 04: legacy migration, modern authority, deterministic save/reload. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ctx={isEnt:id=>typeof id==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(id)};
vm.createContext(ctx);
for(const f of ['ha-state.js','readout-scale.js','device-registry.js','studio-viewport.js',
 'device-parameters.js','inverter-readings.js','inverter.js','building.js','ev-charger.js','energy-storage.js','power-grid.js',
 'distribution-board.js','radiator.js','manifold.js','energy-topology.js',
 'energy-balance.js','energy-flow.js','energy-diagnostics.js','power-flow.js','studio-layout.js']){
 vm.runInContext(fs.readFileSync('src/'+f,'utf8'),ctx,{filename:f});
}
vm.runInContext('this.layout=HASSStudioLayout;this.viewport=HASSStudioViewport;',ctx);
const norm=config=>ctx.layout.normalized({studio_layout:config});
const snapshot=x=>JSON.stringify(x);
const p=(id='old',extra={})=>({id,label:'Dopływ',color:'solar',width:9,
 flow_mode:'on',flow_direction:'reverse',flow_speed:1.8,
 flow_entity:'binary_sensor.pump',cap_start:false,cap_end:true,
 points:[{x:10,y:10},{x:50,y:10},{x:50,y:90}],
 accessories:[{id:'pump_1',type:'pump',entity:'binary_sensor.pump',position:45,
  mode:'manual',test_running:true}],...extra});
const legacy={name:'Historical',nodes:[],pipes:[p()]};
const before=snapshot(legacy);
let migrated=norm(legacy);
assert.equal(snapshot(legacy),before,'migration must not mutate original config');
assert.equal(migrated.width,1200);
assert.equal(migrated.height,720,'old saved pipes must retain original 720 canvas height');
assert.equal(migrated.connections.length,1);
const hydraulic=migrated.connections[0];
assert.equal(hydraulic.id,'old');
assert.equal(hydraulic.type,'hydraulic');
assert.equal(hydraulic.label,'Dopływ');
assert.equal(hydraulic.style.color,'solar');
assert.equal(hydraulic.style.width,9);
assert.equal(hydraulic.style.cap_start,false);
assert.equal(hydraulic.animation.flow_mode,'on');
assert.equal(hydraulic.animation.flow_direction,'reverse');
assert.equal(hydraulic.animation.flow_speed,1.8);
assert.equal(hydraulic.animation.flow_entity,'binary_sensor.pump');
assert.equal(hydraulic.accessories[0].id,'pump_1');
assert.equal(hydraulic.accessories[0].test_running,true);
assert.equal(snapshot(hydraulic.points),snapshot(legacy.pipes[0].points));
assert.equal(snapshot(norm(migrated).connections),snapshot(migrated.connections),
 'first and second normalization must be identical');
console.log('MIGRATION A: pipes geometry, accessories, modes, idempotence PASS');

// Presence, not nonempty length, decides which source is authoritative.
const modern={id:'new',type:'electric',points:[{x:1,y:1},{x:2,y:2}],
 animation:{flow_power_mode:'manual',flow_power_kw:-7}};
for(const connections of [[],[modern]]){
 const combined={nodes:[],connections,pipes:[p()],edges:[{from:{node:'a',port:'right'},
 to:{node:'b',port:'left'}}]};
 const copy=snapshot(combined);
 const result=norm(combined);
 assert.equal(result.connections.length,connections.length);
 if(connections.length)assert.equal(result.connections[0].id,'new');
 assert.equal(snapshot(combined),copy);
 assert.equal(snapshot(norm(result).connections),snapshot(result.connections));
}
assert.equal(norm({connections:null,pipes:[p()]}).connections.length,0,
 'malformed modern connections must not revive older deleted elements');
assert.equal(norm({pipes:[],edges:[{from:{node:'a',port:'right'},to:{node:'b',port:'left'}}]}).connections.length,0,
 'explicit empty pipes prevents restoring older edges');
console.log('MIGRATION B: newer schema wins over stale legacy arrays PASS');

// Historical edges used device ports and four orthogonal points. Preserve
// exact historic geometry, including the older viewBox height.
const nodes=[
 {id:'a',type:'pump',variant:'circulation',x:100,y:200,scale:1},
 {id:'b',type:'pump',variant:'circulation',x:500,y:400,scale:1.5}
];
const edges=[{from:{node:'a',port:'right'},to:{node:'b',port:'left'},color:'cold'}];
const edgeInput={nodes,edges};
const edgeCopy=snapshot(edgeInput);
const edgesResult=norm(edgeInput);
assert.equal(snapshot(edgeInput),edgeCopy);
assert.equal(edgesResult.height,720);
assert.equal(edgesResult.connections.length,1);
assert.equal(edgesResult.connections[0].id,'migrated-0');
assert.equal(edgesResult.connections[0].type,'hydraulic');
assert.equal(edgesResult.connections[0].style.color,'cold');
assert.equal(snapshot(edgesResult.connections[0].points),
 snapshot([{x:212,y:242},{x:356,y:242},{x:356,y:463},{x:500,y:463}]));
assert.equal(snapshot(norm(edgesResult).connections),snapshot(edgesResult.connections));
assert.equal(norm({nodes,edges:[{from:{node:'not-found',port:'left'},to:{node:'b',port:'right'}}]}).connections.length,0);
console.log('MIGRATION C: historical edges port geometry and bad edges PASS');

// Duplicate saved IDs are made deterministic, limits enforced, no random IDs.
const many={nodes:[],pipes:Array.from({length:84},(_,i)=>
 p(i%3===0?'same':i%3===1?'same':'same-2'))};
const first=norm(many),second=norm(many);
assert.equal(first.connections.length,80);
assert.equal(new Set(first.connections.map(x=>x.id)).size,80);
assert.equal(snapshot(first.connections),snapshot(second.connections));
assert.equal(snapshot(norm(first).connections),snapshot(first.connections));
const electricPipe=p('electric-old',{connection_type:'electric',color:'#123456',
 flow_power_mode:'manual',flow_power_kw:-3,accessories:[{id:'ignored',type:'pump'}]});
const electric=norm({nodes:[],pipes:[electricPipe]}).connections[0];
assert.equal(electric.type,'electric');
assert.equal(electric.style.color,'#123456');
assert.equal(electric.animation.flow_power_kw,-3);
assert.equal(electric.accessories.length,0);
assert.equal(norm({nodes:[],pipes:[p('bad',{points:[{x:1,y:2}]})]}).connections.length,0);
console.log('MIGRATION D: deterministic IDs, limits, electric compatibility and invalid geometry PASS');
console.log('PASS: Stage 04 configuration migration regression.');
