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
  const powerEntity=(h,id)=>{
    const r=HASSStudioHA.reading(h,id);
    return r&&['W','kW'].includes(r.unit)?r.value/(r.unit==='W'?1000:1):null;
  };
  const fallbackAllowed=(n,legacy)=>n.energy_fallback_enabled===true||
    n.energy_fallback_enabled==null&&legacy==='manual';
  const preferred=(live,manual,enabled)=>live!==null?{kw:live,source:'measured'}:
    enabled&&manual!==null?{kw:manual,source:'simulated'}:{kw:null,source:'missing'};
  const deviceReading=(n,h,p)=>{
    const read=(id,test,legacy='live',signed=false)=>
      HASSStudioHA.powerInput(n,h,id,test,legacy,signed);
    let v;
    if(n.type==='inverter'){
      const c=HASSStudioInverter.normalize(n);
      v=read(c.entities.ac_power,c.manual.ac_power,c.mode,true);
      return {kw:v.kw===null?null:(c.positive_power?v.kw:-v.kw),source:v.source};
    }
    if(n.type==='building'){
      const c=HASSStudioBuilding.normalize(n);
      const backup=c.measurement==='individual'&&c.remaining_enabled?c.remaining_kw:c.power_kw;
      v=read(c.power_entity,backup,c.mode);
      return {kw:v.kw===null?null:-v.kw,source:v.source};
    }
    if(n.type==='ev_charger'){
      const c=HASSStudioEVCharger.normalize(n);
      v=read(c.entities.power,c.manual.power,c.mode,true);
      return {kw:v.kw===null?null:(c.charging_positive?-v.kw:v.kw),source:v.source};
    }
    if(n.type==='energy_storage'){
      const c=HASSStudioEnergyStorage.normalize(n);
      v=read(c.entities.power,c.manual.power,c.mode,true);
      return {kw:v.kw===null?null:(c.charge_positive?-v.kw:v.kw),source:v.source};
    }
    if(n.type==='power_grid'){
      // The pylon is a visual boundary, never an independent power source.
      // Legacy explicit grid-meter setups remain readable until edited.
      if(n.energy_grid_auto===true){
        return {kw:null,source:'missing'};
      }
      const c=HASSStudioPowerGrid.normalize(n);
      const i=powerEntity(h,c.entities.import_kw),e=powerEntity(h,c.entities.export_kw);
      const total=powerEntity(h,c.entities.total_kw);
      const measured=p.grid_strategy==='signed_total'?total:
        i!==null&&e!==null?i-e:null;
      const manual=p.grid_strategy==='signed_total'?c.manual.total_kw:
        c.manual.import_kw-c.manual.export_kw;
      return HASSStudioHA.powerInput(n,h,
        p.grid_strategy==='signed_total'?c.entities.total_kw:'',
        manual,c.mode,true).source==='simulated'?
        {kw:manual,source:'simulated'}:{kw:measured,source:measured===null?'missing':'measured'};
    }
    if(n.type==='pump'){
      v=read(n.energy_power_entity,n.energy_manual_kw,'live');
      return {kw:v.kw===null?null:-v.kw,source:v.source};
    }
    if(n.type==='boiler'){
      if(['electric','electric_modern'].includes(n.variant)){
        v=read(n.electric_power_entity,n.energy_manual_kw,'live');
        return {kw:v.kw===null?null:-v.kw,source:v.source};
      }
      if(['heatpump','heatpump_modern'].includes(n.variant)){
        v=read(n.hp_power_entity,n.hp_manual_kw,n.hp_test_mode?'manual':'live');
        return {kw:v.kw===null?null:-v.kw,source:v.source};
      }
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
    if(p.mode==='calculate')
      return {mode:'calculate',source:'pending',injection_kw:null};
    // Never present a manual or native simulated value as a live measurement.
    if((scenario==='live'&&p.mode==='manual')||
      (scenario==='simulation'&&p.mode==='ha'))
      return {mode:p.mode,source:'missing',injection_kw:null,reason:'scenario_requires_other_source'};
    let kw=null,source='missing';
    if(p.mode==='manual'){kw=injection(p.manual_kw,role);source='simulated';}
    else if(p.mode==='ha'){
      const raw=haPower(h,p.entity);
      if(raw!==null){kw=injection(raw,role);source='measured';}
    }else{
      const r=deviceReading(n,h,p);
      kw=r.kw;source=kw===null?'missing':r.source;
      if(n.type==='power_grid'&&n.energy_grid_auto===true&&p.mode==='device')
        return {mode:'calculate',source:'pending',injection_kw:null};
      if(scenario==='live'&&source==='simulated'&&n.energy_mode!=='test'){
        kw=null;source='missing';
      }
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

  // Building child ports express the scope of an aggregate meter. The enclosing
  // building injects only the *remaining* load. A junction between house and
  // child is transparent; crossing SVG paths never creates a relationship.
  const adjustBuildings=(group,layout,warnings,tolerance)=>{
    const items=new Map(group.devices.map(d=>[d.node_id,d]));
    const nodes=new Map((layout.nodes||[]).map(n=>[n.id,n]));
    const links=new Map(),append=(id,item)=>{
      if(!links.has(id))links.set(id,[]);
      links.get(id).push(item);
    };
    const included=new Set(group.connection_ids);
    for(const c of layout.connections||[]){
      if(c.type!=='electric'||!included.has(c.id))continue;
      const a=c.energy_start,b=c.energy_end;
      if(!a?.node_id||!b?.node_id)continue;
      append(a.node_id,{peer:b.node_id,port:a.port_id,otherPort:b.port_id,id:c.id});
      append(b.node_id,{peer:a.node_id,port:b.port_id,otherPort:a.port_id,id:c.id});
    }
    const children=new Map(),owner=new Map(),invalid=new Map();
    const fault=(id,reason)=>{invalid.set(id,reason);warnings.push({node_id:id,reason});};
    for(const entry of group.devices){
      if(entry.node_type!=='building')continue;
      const direct=new Set(),traversed=new Set([entry.node_id]),stack=[];
      const visit=(id,via,from)=>{
        if(traversed.has(id)){fault(entry.node_id,'building_branch_cycle');return;}
        traversed.add(id);
        const obj=nodes.get(id),target=items.get(id);
        if(!obj){fault(entry.node_id,'building_invalid_child');return;}
        if(obj.type==='building'){
          if(via!=='supply'){fault(entry.node_id,'building_child_wrong_side');return;}
          if(!target){fault(entry.node_id,'building_invalid_child');return;}
          direct.add(id);return;
        }
        const role=HASSStudioEnergyTopology.node(obj).role;
        if(role==='load'){
          if(!target){fault(entry.node_id,'building_invalid_child');return;}
          direct.add(id);return;
        }
        if(role!=='junction'&&role!=='neutral'){
          fault(entry.node_id,'building_invalid_child');return;
        }
        for(const edge of links.get(id)||[]){
          if(edge.id===from)continue;
          visit(edge.peer,edge.otherPort,edge.id);
        }
      };
      for(const edge of links.get(entry.node_id)||[]){
        if(edge.port==='child')visit(edge.peer,edge.otherPort,edge.id);
      }
      for(const id of direct){
        const old=owner.get(id);
        if(old&&old!==entry.node_id){
          fault(entry.node_id,'building_multiple_parents');
          fault(old,'building_multiple_parents');
        }
        owner.set(id,entry.node_id);
      }
      children.set(entry.node_id,[...direct]);
    }
    const results=new Map(),visiting=new Set();
    const compute=id=>{
      if(results.has(id))return results.get(id);
      const e=items.get(id),n=nodes.get(id);
      if(!e||!n)return null;
      if(visiting.has(id)){fault(id,'building_branch_cycle');return null;}
      visiting.add(id);
      let total=0,ok=true;
      for(const child of children.get(id)||[]){
        const qty=compute(child);
        if(qty===null){ok=false;break;}
        total+=qty;
      }
      if(invalid.has(id))ok=false;
      if(e.node_type==='building'&&e.measurement==='aggregate'&&(children.get(id)||[]).length){
        const raw=e.injection_kw===null?null:-e.injection_kw;
        if(!ok||raw===null){
          if(!invalid.has(id))fault(id,'building_child_reading_missing');
          e.injection_kw=null;e.source='missing';
        }else if(total>raw+tolerance){
          fault(id,'building_child_exceeds_total');
          e.injection_kw=null;e.source='invalid';
        }else{
          e.aggregate_total_kw=round(raw);
          e.aggregate_children_kw=round(total);
          e.injection_kw=-round(Math.max(0,raw-total));
          e.source=e.source==='measured'?'calculated':e.source;
        }
      }
      // For a building without a main meter, the device's own entry is
      // its remaining consumption, added to the explicitly wired children.
      let result=null;
      if(ok&&e.injection_kw!==null&&e.injection_kw<=0&&
          (e.role==='load'||e.node_type==='building')){
        result=-e.injection_kw+total;
      }else if(e.node_type!=='building'&&e.role==='load'&&e.injection_kw!==null&&e.injection_kw<=0){
        result=-e.injection_kw;
      }
      visiting.delete(id);
      results.set(id,result===null?null:round(result));
      return results.get(id);
    };
    for(const e of group.devices)if(e.node_type==='building')compute(e.node_id);
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
      adjustBuildings(g,src,warnings,config.tolerance_kw);
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
