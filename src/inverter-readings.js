/* Stage 06: shared inverter HA/TEST readings, without service calls.
 * AC uses the existing signed HASSStudioHA.powerInput contract. Auxiliary
 * fields preserve the historical (different) fallback rules.
 */
const HASSStudioInverterReadings=(()=>{
 const measured=(h,id,units,lo,hi)=>{
   const r=HASSStudioHA.reading(h,id);
   return r&&units.includes(r.unit)&&r.value>=lo&&r.value<=hi?r.value:null;
 };
 const alarmState=(h,id)=>{
   const value=String(HASSStudioHA.entity(h,id)?.state??'').trim().toLowerCase();
   return ['on','alarm','fault','error','critical','warning'].includes(value)?'alarm':
     ['off','normal','ok','clear'].includes(value)?'ok':null;
 };
 const choose=(node,live,backup)=>{
   const forceTest=node?.energy_mode==='test'||
     (node?.energy_mode==null&&node?.inverter?.mode==='manual');
   if(forceTest)return {value:backup,source:backup===null||backup===undefined?'missing':'simulated'};
   if(live!==null&&live!==undefined)return {value:live,source:'measured'};
   if(node?.energy_mode==='auto'&&node?.energy_fallback_enabled===true)
     return {value:backup,source:backup===null||backup===undefined?'missing':'simulated'};
   return {value:null,source:'missing'};
 };
 const power=(node,h,c)=>HASSStudioHA.powerInput(
   node,h,c.entities.ac_power,c.manual.ac_power,c.mode,true);
 const resolve=(node,h,c)=>{
   const manual=node?.energy_mode==='test'||(node?.energy_mode==null&&c.mode==='manual');
   const ac=power(node,h,c);
   const temperature=choose(node,measured(h,c.entities.temperature,['°C','C',''],-40,150),c.manual.temperature);
   const alarm=choose(node,alarmState(h,c.entities.alarm),c.manual.alarm?'alarm':'ok');
   const status=alarmState(h,c.entities.status);
   const provenance=[];
   const inputs=c.inputs.map(q=>{
     const voltage=choose(node,measured(h,q.entities.voltage,['V',''],0,2000),q.manual.voltage);
     const current=choose(node,measured(h,q.entities.current,['A',''],0,200),q.manual.current);
     const reading=HASSStudioHA.reading(h,q.entities.power);
     const directLive=reading&&['W','kW'].includes(reading.unit)&&reading.value>=0?
       reading.value*(reading.unit==='kW'?1000:1):null;
     const direct=choose(node,directLive,q.manual.power);
     const watts=direct.value!==null?direct.value:
       voltage.value!==null&&current.value!==null?voltage.value*current.value:null;
     const calculated=direct.value===null&&watts!==null;
     provenance.push({voltage:voltage.source,current:current.source,
       power:direct.source,derived:calculated});
     return {...q,voltage:voltage.value,current:current.value,watts,calculated};
   });
   return {power:ac.kw,temperature:temperature.value,alarm:alarm.value,
     statusAlarm:status,inputs,manual,
     sources:{power:ac.source,temperature:temperature.source,
       alarm:alarm.source,inputs:provenance}};
 };
 return Object.freeze({measured,alarmState,choose,power,resolve});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioInverterReadings;
