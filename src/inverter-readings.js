/* Stage 07A.2-B.1: HA/TEST PV values, provenance and safe V×A fallback.
 * No changes to existing inverter AC measurements or energy balance.
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
 const power=(node,h,c)=>{
   if(c.hybrid?.enabled!==true||c.hybrid.converter?.enabled!==true)
     return HASSStudioHA.powerInput(node,h,c.entities.ac_power,c.manual.ac_power,c.mode,true);
   const mode=['auto','ha','test'].includes(node?.energy_mode)?node.energy_mode:
     c.mode==='manual'?'test':'auto';
   const raw=HASSStudioHA.reading(h,c.entities.ac_power);
   const unit=c.ac_input_unit==='auto'||!c.ac_input_unit?raw?.unit:c.ac_input_unit;
   const scale={W:.001,kW:1,MW:1000};
   const live=raw&&Object.prototype.hasOwnProperty.call(scale,unit)&&
     Number.isFinite(raw.value)&&Math.abs(raw.value*scale[unit])<=500?
     raw.value*scale[unit]:null;
   const manual=c.manual?.ac_power;
   const test=typeof manual==='number'&&Number.isFinite(manual)&&
     (c.manual_enabled?.ac_power===true||
       c.manual_enabled?.ac_power==null&&node?.energy_test_configured===true)?
     manual:null;
   if(mode==='test')return {kw:test,source:test===null?'missing':'simulated'};
   if(live!==null)return {kw:live,source:'measured'};
   if(mode==='auto'&&test!==null)return {kw:test,source:'simulated'};
   return {kw:null,source:'missing'};
 };
 const pvMode=(node,c)=>{
   if(['auto','ha','test'].includes(node?.energy_mode))return node.energy_mode;
   if(node?.energy_fallback_enabled===true)return 'auto';
   if(node?.energy_fallback_enabled===false)return 'ha';
   return c.mode==='manual'?'test':'ha';
 };
 const pvInput=(node,h,c,q)=>{
   const mode=pvMode(node,c),allowHA=mode!=='test',
     allowTEST=mode==='test'||mode==='auto'&&node?.energy_fallback_enabled===true;
   const live={
     voltage:allowHA?measured(h,q.entities.voltage,['V',''],0,2000):null,
     current:allowHA?measured(h,q.entities.current,['A',''],0,200):null
   };
   const raw=HASSStudioHA.reading(h,q.entities.power);
   live.power=allowHA&&raw&&['W','kW'].includes(raw.unit)&&
     raw.value>=0&&raw.value*(raw.unit==='kW'?1000:1)<=50000?
       raw.value*(raw.unit==='kW'?1000:1):null;
   const test={};
   for(const key of ['voltage','current','power'])
     test[key]=allowTEST&&q.manual_enabled?.[key]===true&&
       typeof q.manual?.[key]==='number'&&Number.isFinite(q.manual[key])&&q.manual[key]>=0?
       q.manual[key]:null;
   const selected=key=>mode==='test'?{value:test[key],source:test[key]===null?'missing':'simulated'}:
     live[key]!==null?{value:live[key],source:'measured'}:
     allowTEST&&test[key]!==null?{value:test[key],source:'simulated'}:
       {value:null,source:'missing'};
   const voltage=selected('voltage'),current=selected('current');
   const haComputed=live.voltage!==null&&live.current!==null?live.voltage*live.current:null;
   const testComputed=test.voltage!==null&&test.current!==null?test.voltage*test.current:null;
   const valid=v=>v!==null&&Number.isFinite(v)&&v>=0&&v<=50000;
   // Direct P wins. Calculated P requires a complete pair with one provenance.
   const candidates=mode==='test'?
     [[test.power,'simulated',false],[testComputed,'calculated_test',true]]:
     mode==='ha'?
       [[live.power,'measured',false],[haComputed,'calculated_ha',true]]:
       [[live.power,'measured',false],[test.power,'simulated',false],
        [haComputed,'calculated_ha',true],[testComputed,'calculated_test',true]];
   let watts=null,source='missing',calculated=false;
   for(const [value,origin,derived] of candidates)
     if(valid(value)){watts=value;source=origin;calculated=derived;break;}
   // Sensor sampling can differ; this is a warning, not an automatic replacement.
   let warning=null;
   if(watts!==null&&!calculated){
     const pair=source==='measured'?haComputed:testComputed;
     if(valid(pair)&&Math.abs(watts-pair)>Math.max(100,Math.max(watts,pair)*.15))
       warning='Moc bezpośrednia różni się od V × A ('+
         Math.round(watts)+' W / '+Math.round(pair)+' W).';
   }
   let error=null;
   if(watts===null&&q.required===true){
     const missingHA=mode!=='test'?['voltage','current'].filter(k=>live[k]===null)
       .map(k=>'HA '+(k==='voltage'?'V':'A')):[],
       missingTest=allowTEST?['voltage','current'].filter(k=>test[k]===null)
         .map(k=>'TEST '+(k==='voltage'?'V':'A')):[];
     error='Brak wymaganej mocy PV. Nie można obliczyć V × A.'+
       (missingHA.length||missingTest.length?' Brak poprawnych danych: '+
         [...missingHA,...missingTest].join(', ')+'.':'');
   }
   return {...q,voltage:voltage.value,current:current.value,watts,calculated,
     power_source:source,status:error?'invalid':watts===null?'missing':warning?'warning':'ok',
     error,warning,
     provenance:{voltage:voltage.source,current:current.source,
       power:source,derived:calculated}};
 };
 const resolve=(node,h,c)=>{
   const manual=node?.energy_mode==='test'||(node?.energy_mode==null&&c.mode==='manual');
   const ac=power(node,h,c);
   const temperature=choose(node,measured(h,c.entities.temperature,['°C','C',''],-40,150),c.manual.temperature);
   const alarm=choose(node,alarmState(h,c.entities.alarm),c.manual.alarm?'alarm':'ok');
   const status=alarmState(h,c.entities.status);
   const inputs=c.inputs.map(q=>pvInput(node,h,c,q));
   return {power:ac.kw,temperature:temperature.value,alarm:alarm.value,
     statusAlarm:status,inputs,manual,
     sources:{power:ac.source,temperature:temperature.source,
       alarm:alarm.source,inputs:inputs.map(q=>q.provenance)}};
 };
 return Object.freeze({measured,alarmState,choose,power,pvMode,pvInput,resolve});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioInverterReadings;
