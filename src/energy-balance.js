/* Read-only, topology-aware instantaneous active-power balance for HA Systems Studio.
 * Measurements (kW) are signed injections: positive supplies a network, negative
 * consumes from it. No power-flow routing, HA service calls or fabricated readings.
 */
const HASSStudioEnergyBalance=(()=>{
  const MAX_ASSIGNMENTS=100,EPS=1e-7;
  const round=n=>Math.round(n*1e6)/1e6;
  const finite=(n,a,b,d)=>n!==''&&n!==null&&n!==undefined&&Number.isFinite(Number(n))
    ?Math.max(a,Math.min(b,Number(n))):d;
  const ident=HASSStudioEnergyTopology.ident;
  const roles=['source','load','grid','storage'];
  const modes=['device','ha','manual','calculate','off'];
  const defaults=()=>({enabled:false,scenario:'hybrid',tolerance_kw:.05,participants:[]});
  const participant=p=>({
    node_id:ident(p?.node_id),
    port_id:ident(p?.port_id),
    mode:modes.includes(p?.mode)?p.mode:'device',
    entity:typeof p?.entity==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(p.entity)?p.entity:'',
    manual_kw:finite(p?.manual_kw,-10000,10000,0),
    reverse_sign:p?.reverse_sign===true,
    grid_strategy:p?.grid_strategy==='signed_total'?'signed_total':'import_export'
  });
  const normalize=raw=>{
    const c=raw||{},seen=new Set();
    return {enabled:c.enabled===true,scenario:['live','hybrid','simulation'].includes(c.scenario)?c.scenario:'hybrid',
      tolerance_kw:finite(c.tolerance_kw,.001,100,.05),
      participants:(Array.isArray(c.participants)?c.participants:[]).slice(0,MAX_ASSIGNMENTS)
        .map(participant).filter(p=>{
          if(!p.node_id||seen.has(p.node_id))return false;
          seen.add(p.node_id);return true;
        })};
  };
  // Device-native readouts retain their own sign conventions and manual modes.
  // This adapter intentionally reads POWER only; cumulative kWh is never kW.
  const deviceReading=(n,h,p)=>{
    const type=n.type;
    if(type==='inverter'){
      const d=HASSStudioInverter.data(n,h);
      return {kw:d.power===null?null:(d.c.positive_power?d.power:-d.power),
        source:d.c.mode==='manual'?'simulated':'measured'};
    }
    if(type==='building'){
      const d=HASSStudioBuilding.data(n,h);
      return {kw:d.power===null?null:-d.power,
        source:d.c.mode==='manual'?'simulated':'measured'};
    }
    if(type==='ev_charger'){
      const d=HASSStudioEVCharger.data(n,h);
      return {kw:d.power===null?null:(d.c.charging_positive?-d.power:d.power),
        source:d.c.mode==='manual'?'simulated':'measured'};
    }
    if(type==='energy_storage'){
      const d=HASSStudioEnergyStorage.data(n,h);
      return {kw:d.power===null?null:(d.c.charge_positive?-d.power:d.power),
        source:d.c.mode==='manual'?'simulated':'measured'};
    }
    if(type==='power_grid'){
      const c=HASSStudioPowerGrid.normalize(n);
      let kw=null;
      if(p.grid_strategy==='signed_total'){
        kw=HASSStudioPowerGrid.reading('total_kw',c,h);
      }else{
        const incoming=HASSStudioPowerGrid.reading('import_kw',c,h);
        const outgoing=HASSStudioPowerGrid.reading('export_kw',c,h);
        if(incoming!==null&&outgoing!==null&&incoming>=0&&outgoing>=0)
          kw=incoming-outgoing;
      }
      return {kw,source:c.mode==='manual'?'simulated':'measured'};
    }
    return {kw:null,source:'missing'};
  };
  const haPower=(h,id)=>{
    const v=HASSStudioHA.reading(h,id);
    return v&&['W','kW'].includes(v.unit)?(v.unit==='W'?v.value/1000:v.value):null;
  };
  // For manual/HA overrides, positive means production/import/discharge,
  // except for loads where positive means consumption.
  const injection=(kw,role)=>role==='load'?-kw:kw;
  const validDirection=(kw,role)=>role==='source'?kw>=-EPS:role==='load'?kw<=EPS:true;
  const measure=(n,role,p,h,scenario='hybrid')=>{
    if(p.mode==='off')return {mode:p.mode,source:'excluded',injection_kw:null};
    if(p.mode==='calculate')return {mode:p.mode,source:'pending',injection_kw:null};
    // Never present a manual or native simulated value as a live measurement.
    if((scenario==='live'&&p.mode==='manual')||
      (scenario==='simulation'&&p.mode!=='manual'))
      return {mode:p.mode,source:'missing',injection_kw:null,reason:'scenario_requires_other_source'};
    let kw=null,source='missing';
    if(p.mode==='manual'){kw=injection(p.manual_kw,role);source='simulated';}
    else if(p.mode==='ha'){
      const raw=haPower(h,p.entity);
      if(raw!==null){kw=injection(raw,role);source='measured';}
    }else{
      const r=deviceReading(n,h,p);
      kw=r.kw;source=kw===null?'missing':r.source;
      if(scenario==='live'&&source==='simulated'){kw=null;source='missing';}
    }
    if(kw!==null&&p.reverse_sign)kw=-kw;
    if(kw!==null&&(!Number.isFinite(kw)||Math.abs(kw)>10000))
      return {mode:p.mode,source:'invalid',injection_kw:null,reason:'invalid_power'};
    if(kw!==null&&!validDirection(kw,role))
      return {mode:p.mode,source:'invalid',injection_kw:null,reason:'invalid_direction'};
    return {mode:p.mode,source,injection_kw:kw===null?null:round(kw)};
  };
  const totals=entries=>{
    const sum=(pred)=>round(entries.reduce((v,e)=>v+(pred(e)?Math.abs(e.injection_kw):0),0));
    return {
      generation_kw:sum(e=>e.role==='source'&&e.injection_kw>0),
      consumption_kw:sum(e=>e.role==='load'&&e.injection_kw<0),
      grid_import_kw:sum(e=>e.role==='grid'&&e.injection_kw>0),
      grid_export_kw:sum(e=>e.role==='grid'&&e.injection_kw<0),
      storage_charge_kw:sum(e=>e.role==='storage'&&e.injection_kw<0),
      storage_discharge_kw:sum(e=>e.role==='storage'&&e.injection_kw>0),
      supply_kw:sum(e=>e.injection_kw>0),
      demand_kw:sum(e=>e.injection_kw<0)
    };
  };
  const solve=(entries,tolerance_kw=.05)=>{
    const active=entries.filter(e=>e.mode!=='off');
    if(!active.length)return {state:'no_devices',residual_kw:null,totals:null,reasons:['no_devices']};
    const aggregate=active.filter(e=>e.role==='load'&&e.node_type==='building'&&e.measurement==='aggregate');
    // A building aggregate can already include other loads, so counting both would
    // double-count power. Require a non-overlapping set of measurements.
    if(aggregate.length&&active.filter(e=>e.role==='load').length>1)
      return {state:'invalid',residual_kw:null,totals:null,reasons:['aggregate_overlap']};
    if(active.some(e=>e.source==='invalid'))
      return {state:'invalid',residual_kw:null,totals:null,reasons:['invalid_direction_or_power']};
    const missing=active.filter(e=>e.injection_kw===null);
    const unresolved=missing.filter(e=>e.mode!=='calculate');
    if(unresolved.length||missing.length>1)
      return {state:'insufficient',residual_kw:null,totals:null,
        reasons:[unresolved.length?'missing_measurements':'multiple_unknowns']};
    if(missing.length===1){
      const e=missing[0];
      const inferred=round(-active.reduce((s,n)=>s+(n.injection_kw??0),0));
      if(!validDirection(inferred,e.role))
        return {state:'invalid',residual_kw:null,totals:null,reasons:['invalid_derived_direction']};
      e.injection_kw=inferred;e.source='calculated';
    }
    const residual=round(active.reduce((s,e)=>s+e.injection_kw,0));
    return {state:Math.abs(residual)<=tolerance_kw?'balanced':'unbalanced',
      residual_kw:residual,totals:totals(active),
      reasons:Math.abs(residual)<=tolerance_kw?[]:['imbalance']};
  };
  const resolve=(layout,hass)=>{
    const src=layout?.studio_layout||layout||{},config=normalize(src.energy_balance);
    if(!config.enabled)return {enabled:false,config,networks:[],warnings:[],topology:null};
    const topology=HASSStudioEnergyTopology.graph(src);
    const warnings=topology.errors.map(e=>({reason:e.reason,connection_id:e.connection,side:e.side||null}));
    const parent=new Map();
    const find=x=>{
      if(!parent.has(x))parent.set(x,x);
      const val=parent.get(x);
      if(val!==x)parent.set(x,find(val));
      return parent.get(x);
    };
    for(const e of topology.edges){
      const a=find(e.from),b=find(e.to);
      if(a!==b)parent.set(b,a);
    }
    const grouped=new Map();
    for(const e of topology.edges){
      const root=find(e.from);
      if(!grouped.has(root))grouped.set(root,{id:root,medium:e.medium,connection_ids:[],ports:new Set(),devices:[]});
      const group=grouped.get(root);
      group.connection_ids.push(e.id);group.ports.add(e.from);group.ports.add(e.to);
    }
    const keyGroup=new Map();
    for(const g of grouped.values())for(const k of g.ports)keyGroup.set(k,g);
    const overrides=new Map(config.participants.map(p=>[p.node_id,p]));
    const allNodes=(Array.isArray(src.nodes)?src.nodes:[]);
    for(const n of allNodes){
      const role=HASSStudioEnergyTopology.node(n).role;
      if(!roles.includes(role))continue;
      const p=overrides.get(n.id)||participant({node_id:n.id});
      if(p.mode==='off')continue;
      const ports=HASSStudioEnergyTopology.ports(n);
      let matches=ports.filter(port=>keyGroup.has(n.id+':'+(port.bus||port.id)));
      if(p.port_id){
        matches=matches.filter(port=>port.id===p.port_id);
        if(!matches.length){warnings.push({reason:'invalid_or_unconnected_port',node_id:n.id});continue;}
      }else if(n.type==='inverter'&&matches.some(port=>port.medium==='ac'))
        matches=matches.filter(port=>port.medium==='ac');
      const unique=new Map(matches.map(port=>[keyGroup.get(n.id+':'+(port.bus||port.id)),port]));
      if(!unique.size){warnings.push({reason:'unconnected_device',node_id:n.id});continue;}
      if(unique.size!==1){warnings.push({reason:'ambiguous_device_network',node_id:n.id});continue;}
      const [group,port]=[...unique][0];
      const reading=measure(n,role,p,hass,config.scenario);
      const measurement=n.type==='building'?HASSStudioBuilding.normalize(n).measurement:null;
      group.devices.push({node_id:n.id,node_type:n.type,port_id:port.id,role,measurement,
        mode:reading.mode,source:reading.source,injection_kw:reading.injection_kw,
        ...(reading.reason?{reason:reading.reason}:{})});
    }
    const networks=[...grouped.values()].map(g=>{
      const entries=g.devices;
      const result=solve(entries,config.tolerance_kw);
      return {id:g.id,medium:g.medium,connection_ids:g.connection_ids,
        port_keys:[...g.ports],devices:entries,state:result.state,
        residual_kw:result.residual_kw,totals:result.totals,reasons:result.reasons};
    });
    return {enabled:true,config,networks,warnings,topology};
  };
  return Object.freeze({MAX_ASSIGNMENTS,defaults,normalize,participant,haPower,injection,deviceReading,measure,totals,solve,resolve});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioEnergyBalance;
