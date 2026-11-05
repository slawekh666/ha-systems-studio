/* Stage 07A.2-D — opt-in, read-only hybrid inverter energy conservation.
 * Converter links are constraints, NEVER electrical graph edges or HA controls.
 */
const HASSStudioEnergyConverter=(()=>{
  const round=v=>Math.round(v*1e6)/1e6;
  const finite=v=>typeof v==='number'&&Number.isFinite(v);
  const active=(c)=>c?.enabled===true&&c.schema_version===1;
  // Signed inverter boundary: PV<0 (absorption), DC battery>0 when charging,
  // AC>0 when exporting. Sum of injections + nonnegative loss = 0.
  const evaluate=({pv_kw,battery_kw,ac_kw,ac_source='missing',
    ac_mode='auto',efficiency_percent=null,tolerance_kw=.05,rated_kw=null})=>{
    const eta=finite(efficiency_percent)&&efficiency_percent>0&&
      efficiency_percent<=100?efficiency_percent/100:null;
    const valid=kw=>finite(kw)&&Math.abs(kw)<=10000;
    const inputValid=valid(pv_kw)&&pv_kw>=0&&valid(battery_kw);
    const direct=valid(ac_kw)?ac_kw:null;
    if(!inputValid)return {status:'missing',reason:'converter_missing_dc_observation',
      pv_kw:valid(pv_kw)?pv_kw:null,battery_kw:valid(battery_kw)?battery_kw:null,
      ac_kw:ac_mode==='calculate'?null:direct,ac_source,loss_kw:null,efficiency_observed:null};
    let ac=ac_mode==='calculate'?null:direct;
    let source=ac===null?'missing':ac_source;
    if(ac===null){
      if(eta===null)return {status:'missing',reason:'converter_efficiency_or_ac_missing',
        pv_kw,battery_kw,ac_kw:null,ac_source:'missing',loss_kw:null,efficiency_observed:null};
      // One aggregate, explicitly assumed efficiency for every incoming kW.
      // If PV + battery discharge cannot cover battery charging, the AC
      // terminal imports the shortfall. No implicit lossless DC/DC leg.
      const incoming=pv_kw+Math.max(0,-battery_kw),charging=Math.max(0,battery_kw);
      const candidate=round(eta*incoming-charging);
      ac=candidate>=0?candidate:round(incoming-charging/eta);
      source='estimated';
    }
    if(!valid(ac))return {status:'invalid',reason:'converter_invalid_ac_power',
      pv_kw,battery_kw,ac_kw:null,ac_source:'invalid',loss_kw:null,efficiency_observed:null};
    if(finite(rated_kw)&&rated_kw>0&&Math.abs(ac)>rated_kw+tolerance_kw)
      return {status:'invalid',reason:'converter_ac_over_rating',
        pv_kw,battery_kw,ac_kw:ac,ac_source:source,loss_kw:null,efficiency_observed:null};
    const loss=round(pv_kw-ac-battery_kw);
    const input=round(pv_kw+Math.max(0,-ac)+Math.max(0,-battery_kw));
    const output=round(Math.max(0,ac)+Math.max(0,battery_kw));
    if(loss< -tolerance_kw)
      return {status:'invalid',reason:'converter_negative_losses',pv_kw,battery_kw,
        ac_kw:ac,ac_source:source,loss_kw:loss,efficiency_observed:
        input>0?round(100*output/input):null};
    const eff=input>0?round(100*output/input):input===0&&output===0?null:0;
    return {status:source==='estimated'?'estimated':'valid',reason:null,
      pv_kw,battery_kw,ac_kw:ac===0?0:ac,ac_source:source,
      loss_kw:Math.max(0,loss),efficiency_observed:eff,
      efficiency_assumed:source==='estimated'?efficiency_percent:null,
      pv_injection_kw:pv_kw===0?0:-pv_kw,
      battery_injection_kw:battery_kw===0?0:battery_kw,
      ac_injection_kw:ac===0?0:ac,
      provenance:{pv:'observed',battery:'calculated',ac:source,
        losses:source==='estimated'?'estimated':'calculated'}};
  };
  const integrate=({nodes,keyGroup,topology,dc_terminals,warnings,tolerance_kw})=>{
    const transfers=[],portCache=new Map(),getPorts=n=>{
      if(!portCache.has(n.id))portCache.set(n.id,new Map(
        HASSStudioEnergyTopology.ports(n).map(p=>[p.id,p])));
      return portCache.get(n.id);
    };
    const netFor=(n,p)=>p?keyGroup.get(HASSStudioEnergyTopology.busKey(n.id,p)):null;
    const candidates=nodes.filter(n=>n.type==='inverter').map(n=>({
      node:n,c:HASSStudioInverter.normalize(n)
    })).filter(x=>x.c.hybrid?.enabled===true&&active(x.c.hybrid.converter));
    const groupsByBattery=new Map();
    for(const x of candidates){
      const conf=x.c.hybrid.converter,port=getPorts(x.node).get(conf.battery_port_id);
      const group=conf.battery_port_id==='none'?null:netFor(x.node,port);
      if(group){
        if(!groupsByBattery.has(group.id))groupsByBattery.set(group.id,[]);
        groupsByBattery.get(group.id).push(x.node.id);
      }
    }
    for(const {node,c} of candidates){
      const conf=c.hybrid.converter;
      const base={converter_id:node.id,device_name:node.label||node.id,
        ac_port_id:conf.ac_port_id,battery_port_id:conf.battery_port_id,
        enabled:true,medium:'ac/dc',status:'missing',reason:null,
        pv_kw:null,battery_kw:null,ac_kw:null,loss_kw:null,
        ac_source:'missing',pv_source:'missing',battery_source:'missing',
        ac_network_id:null,battery_network_id:null};
      const fail=reason=>{
        transfers.push({...base,status:'missing',reason});
        warnings.push({reason,node_id:node.id});
      };
      const ports=getPorts(node),acPort=ports.get(conf.ac_port_id),
        acGroup=acPort?.medium==='ac'?netFor(node,acPort):null,
        batteryNone=conf.battery_port_id==='none',
        batteryPort=ports.get(conf.battery_port_id),
        batteryGroup=batteryNone?null:
          batteryPort?.medium==='dc'?netFor(node,batteryPort):null;
      if(!acPort||acPort.medium!=='ac'||!acGroup){
        fail('converter_ac_port_missing');continue;
      }
      if(!batteryNone&&(!batteryPort||batteryPort.medium!=='dc'||!batteryGroup)){
        fail('converter_battery_port_missing');continue;
      }
      if(batteryGroup&&groupsByBattery.get(batteryGroup.id).length>1){
        fail('converter_ambiguous_battery_network');continue;
      }
      const acEntries=acGroup.devices.filter(d=>d.node_id===node.id&&
        d.port_id===acPort.id&&d.node_type==='inverter');
      if(acEntries.length!==1){
        fail('converter_ac_meter_missing');continue;
      }
      const acEntry=acEntries[0];
      const mapped=dc_terminals.filter(t=>t.node_id===node.id);
      if(conf.pv_mode!=='none'&&!mapped.length){
        fail('converter_pv_mapping_missing');continue;
      }
      if(conf.pv_mode!=='none'&&mapped.some(t=>!Number.isFinite(t.power_kw)||
        t.source==='missing'||t.status==='invalid')){
        fail('converter_pv_reading_missing');continue;
      }
      const pv=conf.pv_mode==='none'?0:
        round(mapped.reduce((s,t)=>s+t.power_kw,0));
      // Battery boundary inferred from *independent* storage meter(s).
      // Allow only a fully observed, storage-only DC circuit. Any other
      // participant or unknown branch needs a richer converter network model.
      let battery=0,batterySource='explicit_absence';
      if(!batteryNone){
        const participants=batteryGroup.devices.filter(d=>d.node_id!==node.id);
        const onlyStorage=participants.length>0&&participants.every(d=>{
          if(d.node_type!=='energy_storage'||d.role!=='storage'||d.mode==='off'||
            d.injection_kw===null||d.source==='invalid')return false;
          const storage=nodes.find(n=>n.id===d.node_id);
          const cc=storage?HASSStudioEnergyStorage.normalize(storage):null;
          return cc?.coupling==='dc'&&cc.coupling_port_id===d.port_id;
        });
        if(!onlyStorage){
          fail('converter_battery_reading_ambiguous');continue;
        }
        battery=round(-participants.reduce((s,d)=>s+d.injection_kw,0));
        batterySource=[...new Set(participants.map(d=>d.source))].join('+');
      }
      const chosen=conf.ac_mode==='calculate'?null:acEntry.injection_kw;
      const evaluation=evaluate({pv_kw:pv,battery_kw:battery,ac_kw:chosen,
        ac_source:acEntry.source,ac_mode:conf.ac_mode,
        efficiency_percent:conf.efficiency_percent,tolerance_kw,
        rated_kw:c.rated_kw});
      const transfer={...base,...evaluation,ac_port_id:acPort.id,
        battery_port_id:batteryNone?'none':batteryPort.id,
        ac_network_id:acGroup.id,battery_network_id:batteryGroup?.id||null,
        pv_source:conf.pv_mode==='none'?'explicit_absence':
          [...new Set(mapped.map(t=>t.source))].join('+'),
        battery_source:batterySource};
      transfers.push(transfer);
      if(evaluation.status==='invalid'){
        warnings.push({reason:evaluation.reason,node_id:node.id});continue;
      }
      if(evaluation.status==='missing'){
        warnings.push({reason:evaluation.reason,node_id:node.id});
        if(conf.ac_mode==='calculate'){
          acEntry.injection_kw=null;acEntry.source='missing';
        }
        continue;
      }
      // Only a uniquely determined and loss-consistent conversion may provide
      // a calculated DC boundary injection; no virtual graph edge is created.
      if(conf.ac_mode==='calculate'||chosen===null){
        acEntry.injection_kw=evaluation.ac_injection_kw;
        acEntry.source=evaluation.ac_source;
        acEntry.mode='device';
      }
      if(batteryGroup){
        batteryGroup.devices.push({
          node_id:node.id,node_type:'inverter_converter',
          port_id:batteryPort.id,role:'converter',mode:'device',
          source:'calculated',injection_kw:evaluation.battery_injection_kw,
          measurement:'inverter_dc_battery_boundary'
        });
      }
    }
    return transfers;
  };
  return Object.freeze({evaluate,integrate});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioEnergyConverter;
