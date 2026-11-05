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
      v=HASSStudioInverterReadings.power(n,h,c);
      return {kw:v.kw===null?null:(c.positive_power?v.kw:-v.kw),source:v.source};
    }
    if(n.type==='building'){
      const c=HASSStudioBuilding.normalize(n);
      const backup=c.measurement==='individual'&&c.remaining_enabled?c.remaining_kw:c.power_kw;
      v=read(c.power_entity,backup,c.mode,c.measurement==='net');
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
      if(scenario==='live'&&source==='simulated'&&n.energy_mode==null&&n.energy_fallback_enabled!==true){
        kw=null;source='missing';
      }
    }
    if(kw!==null&&p.reverse_sign)kw=-kw;
    if(kw!==null&&(!Number.isFinite(kw)||Math.abs(kw)>10000))
      return {mode:p.mode,source:'invalid',injection_kw:null,reason:'invalid_power'};
    if(kw!==null&&!(n.type==='building'&&HASSStudioBuilding.normalize(n).measurement==='net')&&!validDirection(kw,role))
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

  // Port-driven building hierarchy. The raw meter and every attached device are
  // read once, then the pure building power contract determines OWN consumption.
  // Descendant sources are NOT extra loads. A signed net meter is a boundary
  // reading; only the derived own load enters the shared AC network injection sum.
  const adjustBuildings=(group,layout,topology,nodes,warnings,tolerance)=>{
    const items=new Map(group.devices.map(d=>[d.node_id,d]));
    // Reuse one node index and the validated graph across all networks.
    const hierarchy=HASSStudioEnergyTopology.meterHierarchy(layout,group,topology);
    const children=new Map(),invalid=new Map();
    const fault=(id,reason)=>{
      if(invalid.has(id))return;
      invalid.set(id,reason);warnings.push({node_id:id,reason});
    };
    for(const entry of group.devices)if(entry.node_type==='building')
      children.set(entry.node_id,[]);
    for(const [id,owner] of hierarchy.owners){
      if(children.has(owner))children.get(owner).push(id);
    }
    for(const [id,parents] of hierarchy.ambiguous)
      for(const parent of parents)if(children.has(parent))
        fault(parent,'building_ambiguous_meter_path');
    if(hierarchy.unresolvedRoots)
      for(const entry of group.devices)if(entry.node_type==='building'&&
        entry.measurement!=='individual')
        fault(entry.node_id,'building_unknown_meter_root');
    const resolved=new Map(),visiting=new Set();
    const known=(kw,kind)=>({
      consumption_kw:kw===null?kind==='source'?0:null:round(Math.max(0,-kw)),
      generation_kw:kw===null?kind==='load'?0:null:round(Math.max(0,kw))
    });
    const compute=id=>{
      if(resolved.has(id))return resolved.get(id);
      const e=items.get(id),n=nodes.get(id);
      if(!e||!n)return null;
      if(visiting.has(id)){fault(id,'building_branch_cycle');return null;}
      if(e.node_type!=='building')return known(e.injection_kw,e.role);
      visiting.add(id);
      let totalLoad=0,totalGeneration=0;
      for(const child of children.get(id)||[]){
        const result=compute(child);
        if(!result){
          totalLoad=null;totalGeneration=null;continue;
        }
        totalLoad=totalLoad===null||result.consumption_kw===null?null:
          round(totalLoad+result.consumption_kw);
        totalGeneration=totalGeneration===null||result.generation_kw===null?null:
          round(totalGeneration+result.generation_kw);
      }
      // The selected building reading is a power measurement, not a second
      // physical load. Preserve raw data in model.measured_kw for diagnostics.
      const originalInjection=e.injection_kw,originalSource=e.source;
      const snapshot=HASSStudioBuilding.powerSnapshot({
        measurement:e.measurement,measured_kw:originalInjection===null?null:-originalInjection,
        source:originalSource,children_consumption_kw:totalLoad,
        children_generation_kw:totalGeneration,tolerance_kw:tolerance
      });
      e.power_model=snapshot;
      e.measured_kw=snapshot.measured_kw;
      e.measurement_scope=snapshot.measurement_scope;
      if(e.measurement==='aggregate'&&totalLoad!==null)
        e.aggregate_children_kw=totalLoad;
      if(e.measurement==='aggregate'&&snapshot.measured_kw!==null)
        e.aggregate_total_kw=snapshot.measured_kw;
      if(invalid.has(id)||originalSource==='invalid'||snapshot.status==='invalid'){
        const reason=invalid.get(id)||(
          snapshot.reasons.includes('children_exceed_gross')?
            'building_child_exceeds_total':
          snapshot.reasons.includes('net_exceeds_known_generation')?
            'building_net_generation_insufficient':'building_invalid_measurement');
        fault(id,reason);
        e.injection_kw=null;e.source='invalid';e.reason=reason;
      }else if(snapshot.own_consumption_kw!==null){
        e.injection_kw=-snapshot.own_consumption_kw;
        e.source=e.measurement==='individual'?originalSource:'calculated';
      }else{
        if((children.get(id)||[]).length&&e.measurement!=='individual')
          warnings.push({node_id:id,reason:'building_child_reading_missing'});
        e.injection_kw=null;e.source='missing';
      }
      const result={
        consumption_kw:snapshot.gross_consumption_kw,
        generation_kw:snapshot.children_generation_kw
      };
      visiting.delete(id);resolved.set(id,result);return result;
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
    const nodesById=new Map(allNodes.map(n=>[n.id,n]));
    // MPPT observations describe DC power entering the inverter, not the
    // battery bus. Report them separately from participants and totals.
    const dc_terminals=[];
    for(const n of allNodes){
      if(n.type!=='inverter')continue;
      const mapping=HASSStudioInverter.dcTerminals(n,hass);
      if(!mapping.enabled)continue;
      for(const issue of mapping.errors)
        warnings.push({reason:issue.reason,node_id:n.id,
          input_index:issue.input_index,port_id:issue.port_id});
      const portsById=new Map(HASSStudioEnergyTopology.ports(n).map(p=>[p.id,p]));
      for(const terminal of mapping.terminals){
        const port=portsById.get(terminal.port_id);
        const network=port?keyGroup.get(HASSStudioEnergyTopology.busKey(n.id,port)):null;
        if(!network)
          warnings.push({reason:'pv_dc_unconnected_port',node_id:n.id,
            port_id:terminal.port_id,input_index:terminal.input_index});
        dc_terminals.push({...terminal,network_id:network?.id||null,connected:!!network});
      }
    }
    const storage_terminals=[];
    for(const n of allNodes){
      if(n.type!=='energy_storage')continue;
      const battery=HASSStudioEnergyStorage.dcTerminal(n,hass);
      if(!battery.enabled)continue;
      const c=HASSStudioEnergyStorage.normalize(n);
      const port=HASSStudioEnergyTopology.ports(n).find(q=>q.id===c.coupling_port_id);
      const network=port?.medium==='dc'?
        keyGroup.get(HASSStudioEnergyTopology.busKey(n.id,port)):null;
      const terminal={...battery.terminal,network_id:network?.id||null,connected:!!network};
      storage_terminals.push(terminal);
      for(const reason of battery.issues)
        warnings.push({reason,node_id:n.id,port_id:c.coupling_port_id});
      if(!c.coupling_port_id)
        warnings.push({reason:'dc_storage_port_required',node_id:n.id});
      else if(!port)
        warnings.push({reason:'dc_storage_port_missing',node_id:n.id,port_id:c.coupling_port_id});
      else if(port.medium!=='dc')
        warnings.push({reason:'dc_storage_port_wrong_medium',node_id:n.id,port_id:c.coupling_port_id});
      else if(!network)
        warnings.push({reason:'dc_storage_port_unconnected',node_id:n.id,port_id:c.coupling_port_id});
    }
    for(const n of allNodes){
      const descriptor=HASSStudioEnergyTopology.node(n);
      const role=descriptor.role;
      if(!roles.includes(role))continue;
      const p=n.type==='power_grid'?
        participant({node_id:n.id,mode:'calculate'}):
        n.energy_mode!=null?participant({node_id:n.id}):
        overrides.get(n.id)||participant({node_id:n.id});
      if(p.mode==='off')continue;
      const ports=descriptor.ports;
      let matches=ports.filter(port=>keyGroup.has(HASSStudioEnergyTopology.busKey(n.id,port)));
      const coupling=n.type==='energy_storage'?
        HASSStudioEnergyStorage.normalize(n):null;
      // Explicit battery coupling is authoritative. Do not silently select
      // another attached AC/DC port if the selected port is unavailable.
      if(coupling&&coupling.coupling!=='legacy'){
        if(p.port_id&&p.port_id!==coupling.coupling_port_id)
          warnings.push({reason:'storage_coupling_override_conflict',node_id:n.id,
            port_id:p.port_id});
        const selected=ports.find(q=>q.id===coupling.coupling_port_id);
        const valid=!!selected&&selected.medium===coupling.coupling&&
          matches.some(q=>q.id===selected.id)&&
          (!p.port_id||p.port_id===selected.id);
        if(!valid){
          const attached=[...new Set(matches.map(port=>
            keyGroup.get(HASSStudioEnergyTopology.busKey(n.id,port))))];
          // A wrong or unconnected selection must not accidentally result
          // in an apparently balanced network through some other port.
          for(const group of attached)group.devices.push({
            node_id:n.id,node_type:n.type,port_id:coupling.coupling_port_id,
            role,measurement:null,mode:'device',source:'invalid',
            injection_kw:null,reason:'invalid_storage_coupling'});
          warnings.push({reason:'invalid_storage_coupling',node_id:n.id,
            port_id:coupling.coupling_port_id});
          continue;
        }
        matches=[selected];
      }else if(p.port_id){
        matches=matches.filter(port=>port.id===p.port_id);
        if(!matches.length){warnings.push({reason:'invalid_or_unconnected_port',node_id:n.id});continue;}
      }else if(n.type==='inverter'&&matches.some(port=>port.medium==='ac'))
        matches=matches.filter(port=>port.medium==='ac');
      const unique=new Map(matches.map(port=>[keyGroup.get(HASSStudioEnergyTopology.busKey(n.id,port)),port]));
      if(!unique.size){warnings.push({reason:'unconnected_device',node_id:n.id});continue;}
      if(unique.size!==1){warnings.push({reason:'ambiguous_device_network',node_id:n.id});continue;}
      const [group,port]=[...unique][0];
      // Legacy inverter AC power must not be assigned to a DC-only network.
      // An explicit participant override cannot bypass this safety guard.
      if(n.type==='inverter'&&port.medium==='dc'){
        warnings.push({reason:'inverter_ac_reading_on_dc_network',node_id:n.id,port_id:port.id});
        group.devices.push({node_id:n.id,node_type:n.type,port_id:port.id,
          role,measurement:null,mode:'device',source:'missing',injection_kw:null,
          reason:'inverter_ac_reading_on_dc_network'});
        continue;
      }
      const reading=measure(n,role,p,hass,config.scenario);
      const measurement=n.type==='building'?HASSStudioBuilding.normalize(n).measurement:null;
      group.devices.push({node_id:n.id,node_type:n.type,port_id:port.id,role,measurement,
        mode:reading.mode,source:reading.source,injection_kw:reading.injection_kw,
        ...(reading.reason?{reason:reading.reason}:{})});
    }
    const networks=[...grouped.values()].map(g=>{
      const entries=g.devices;
      adjustBuildings(g,src,topology,nodesById,warnings,config.tolerance_kw);
      // Stage 07A: isolate the visual grid boundary, never actuate hardware.
      const boards=allNodes.filter(n=>n.type==='distribution_board'&&
        n.energy_grid_connected===false&&[...g.ports].some(k=>k.startsWith(n.id+':')));
      const grids=entries.filter(e=>e.role==='grid');
      if(boards.length)for(const e of grids){
        e.injection_kw=0;e.source='calculated';e.mode='device';
      }
      // Only one unmetered building can absorb the nonnegative known surplus.
      // This is an estimate, not an HA reading. Never invent a split.
      const unknown=entries.filter(e=>e.mode!=='off'&&e.injection_kw===null);
      const homes=unknown.filter(e=>e.node_type==='building');
      if(homes.length===1&&unknown.every(e=>e.role==='grid'||e.node_type==='building')&&grids.length<=1){
        const known=entries.filter(e=>e.role!=='grid'&&e.injection_kw!==null);
        const surplus=round(known.reduce((s,e)=>s+e.injection_kw,0));
        if(surplus>=0){
          homes[0].injection_kw=-surplus;homes[0].source='estimated';
          homes[0].estimated_total_kw=surplus;
          for(const e of grids)if(e.injection_kw===null){
            e.injection_kw=0;e.source='estimated';e.mode='device';
          }
        }
      }
      // Source-specific export is an accounting policy, never a mutation of HA.
      const inverters=entries.filter(e=>e.node_type==='inverter');
      const restricted=inverters.filter(e=>
        HASSStudioInverter.normalize(allNodes.find(n=>n.id===e.node_id)).export_allowed===false);
      const eligible=inverters.filter(e=>!restricted.includes(e));
      const known=entries.filter(e=>e.mode!=='off'&&e.role!=='grid')
        .every(e=>e.injection_kw!==null);
      let unaccounted_kw=null,export_cap_kw=null;
      if(known&&grids.length<=1&&(restricted.length||boards.length)){
        const net=round(entries.filter(e=>e.mode!=='off'&&e.role!=='grid')
          .reduce((sum,e)=>sum+e.injection_kw,0));
        // Do not infer grid-export permission from battery discharge.
        export_cap_kw=boards.length?0:round(eligible.reduce((sum,e)=>
          sum+Math.max(0,e.injection_kw),0));
        const exportKw=Math.min(Math.max(0,net),export_cap_kw);
        unaccounted_kw=round(Math.max(0,net-exportKw));
        if(grids.length===1&&grids[0].source!=='measured'){
          grids[0].injection_kw=net<0?-net:-exportKw;
          grids[0].source='calculated';grids[0].mode='device';
        }
      }
      const result=solve(entries,config.tolerance_kw);
      if(result.state==='unbalanced'&&unaccounted_kw!==null&&
          Math.abs(result.residual_kw-unaccounted_kw)<=config.tolerance_kw&&
          result.residual_kw>=-config.tolerance_kw){
        result.state='unaccounted';result.reasons=['unaccounted_generation'];
      }
      if(unaccounted_kw!==null&&unaccounted_kw>config.tolerance_kw)
        warnings.push({reason:'unaccounted_generation',network_id:g.id});
      if(boards.length&&result.state==='unbalanced')
        warnings.push({reason:'grid_disconnected_imbalance',network_id:g.id});
      return {id:g.id,medium:g.medium,connection_ids:g.connection_ids,
        port_keys:[...g.ports],devices:entries,state:result.state,
        residual_kw:result.residual_kw,totals:result.totals,reasons:result.reasons,
        unaccounted_kw,export_cap_kw};
    });
    return {enabled:true,config,networks,warnings,topology,dc_terminals,storage_terminals};
  };
  return Object.freeze({MAX_ASSIGNMENTS,defaults,normalize,participant,haPower,injection,deviceReading,measure,totals,solve,resolve});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioEnergyBalance;
