/* MR5: read-only, opt-in energy dashboard built only from MR3/MR4 results.
 * Diagnostics never invent power, merge independent networks or call HA services.
 */
const HASSStudioEnergyDiagnostics=(()=>{
  const defaults=()=>({enabled:false,show_devices:true,show_cables:true,show_warnings:true});
  const normalize=value=>{
    const c=value&&typeof value==='object'?value:{};
    return {enabled:c.enabled===true,show_devices:c.show_devices!==false,
      show_cables:c.show_cables!==false,show_warnings:c.show_warnings!==false};
  };
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
  const fmt=value=>typeof value==='number'&&Number.isFinite(value)
    ?(Math.abs(value)<.0005?'0.000':value.toFixed(3))+' kW':'—';
  const viewModel=(layout,hass)=>{
    const src=layout?.studio_layout||layout||{},options=normalize(src.energy_diagnostics);
    const result=HASSStudioEnergyFlow.resolve(src,hass);
    const balance=result.balance,devices=new Map((src.nodes||[]).map(n=>[n.id,n]));
    const deviceName=id=>{
      const n=devices.get(id);
      return n?(n.label||({
        inverter:'Falownik',power_grid:'Sieć',distribution_board:'Rozdzielnia',
        building:'Budynek',energy_storage:'Magazyn',ev_charger:'Ładowarka EV',
        pump:'Pompa',boiler:'Kocioł'
      })[n.type]||n.type):'Usunięte urządzenie';
    };
    const cableName=c=>c.label||(
      deviceName(c.energy_start?.node_id)+' → '+deviceName(c.energy_end?.node_id));
    // A DC battery charging behind an inverter without an internal converter
    // model has an unresolved transfer, not evidence of contradictory meters.
    // This is presentation-only: preserve the numerical engine's raw state.
    const inverterIds=new Set([...devices.values()].filter(n=>n.type==='inverter')
      .map(n=>n.id));
    const topologyEdges=new Map((balance.topology?.edges||[]).map(e=>[e.id,e]));
    const needsConverter=n=>n.medium==='dc'&&n.state==='unbalanced'&&!!n.totals&&
      n.totals.storage_charge_kw>balance.config.tolerance_kw&&
      n.totals.supply_kw<=balance.config.tolerance_kw&&
      n.connection_ids.some(id=>{
        const edge=topologyEdges.get(id);
        return edge?.medium==='dc'&&[edge.from,edge.to].some(key=>
          inverterIds.has(key.slice(0,key.indexOf(':'))));
      });
    const networkOf=new Map();
    const networks=(balance.networks||[]).map((n,i)=>{
      for(const id of n.connection_ids)networkOf.set(id,i);
      return {id:n.id,index:i+1,medium:n.medium,state:n.state,
        diagnostic_reason:needsConverter(n)?'dc_converter_missing':null,
        reasons:[...n.reasons],residual_kw:n.residual_kw,totals:n.totals,
        unaccounted_kw:n.unaccounted_kw,export_cap_kw:n.export_cap_kw,
        devices:n.devices.map(d=>({ ...d,name:devices.get(d.node_id)?.label||
          devices.get(d.node_id)?.id||d.node_id })),
        cables:[]};
    });
    const cables=[];
    for(const c of src.connections||[]){
      if(c.type!=='electric')continue;
      const state=result.byConnection[c.id]||HASSStudioEnergyFlow.unavailable('unconnected_or_missing_endpoints');
      const mode=c.animation?.flow_power_mode||'off';
      const owner=networks[networkOf.get(c.id)];
      const diagnosticReason=state.reason==='unbalanced'&&owner?.diagnostic_reason||
        null;
      const item={id:c.id,name:cableName(c),network:state.network,available:state.available,
        kw:state.kw,direction:state.direction,source:state.source,mode,
        sources:state.sources||[],reason:state.reason,diagnostic_reason:diagnosticReason};
      cables.push(item);
      const idx=networkOf.get(c.id);
      if(idx!==undefined)networks[idx].cables.push(item);
    }
    const warnings=(balance.warnings||[]).map(w=>({
      reason:w.reason,node_id:w.node_id||null,connection_id:w.connection_id||null,
      side:w.side||null,
      input_index:Number.isInteger(w.input_index)&&w.input_index>=0&&
        w.input_index<12?w.input_index:null,
      port_id:w.port_id||null
    }));
    const dcTerminals=(balance.dc_terminals||[]).map(t=>({
      ...t,device_name:deviceName(t.node_id)
    }));
    for(const c of cables)if(!c.available&&!warnings.some(w=>w.connection_id===c.id&&w.reason===c.reason))
      warnings.push({reason:c.reason||'unresolved_flow',
        diagnostic_reason:c.diagnostic_reason||null,
        connection_id:c.id,node_id:null,side:null,input_index:null});
    return {options,enabled:balance.enabled===true,scenario:balance.config.scenario,
      networks,cables,warnings,dcTerminals,balanced:networks.filter(n=>n.state==='balanced').length,
      unresolved:networks.filter(n=>n.state!=='balanced').length};
  };
  const messages={
    pl:{
      title:'Bilans energii',off:'Bilans wyłączony',noNetwork:'Brak podłączonych sieci elektrycznych',
      network:'Sieć',status:'Stan',balanced:'Bilans prawidłowy',unbalanced:'Pomiary sprzeczne',
      dc_converter_missing:'Brak modelu konwersji DC',
      dc_converter_explanation:'Magazyn ładuje się z obwodu falownika, ale przepływ przez jego wewnętrzny przekształtnik nie jest jeszcze modelowany. Różnica mocy pozostaje nierozliczona; nie jest dowodem sprzecznych pomiarów.',
      insufficient:'Brak danych',invalid:'Nieprawidłowe dane',no_devices:'Brak odbiorników / źródeł',
      role:'Urządzenie',power:'Moc netto',source:'Źródło',cables:'Przewody',
      warnings:'Ostrzeżenia',direction:'Kierunek',residual:'Różnica bilansu',
      uncertain:'Nie rozstrzygnięto przepływu. Brak animacji automatycznej.',
      ambiguous_cycle:'Niejednoznaczny przepływ w pętli',unconnected_or_missing_endpoints:'Nieprzypisane końcówki',
      medium_mismatch:'Niezgodne porty AC/DC',bus_medium_mismatch:'Sprzeczne typy portów szyny',
      missing_node:'Brak urządzenia',missing_port:'Brak portu',unconnected_device:'Urządzenie niepodłączone',
      ambiguous_device_network:'Urządzenie należy do wielu sieci',
      invalid_or_unconnected_port:'Nieprawidłowy lub niepodłączony port',
      inverter_ac_reading_on_dc_network:'Nie wolno zaliczyć mocy AC falownika do sieci DC',
      pv_dc_required_mapping_missing:'Wymagane wejście MPPT bez przypisanego portu DC',
      pv_dc_duplicate_mapping:'Dwa wejścia MPPT przypisane do jednego portu DC',
      pv_dc_missing_port:'Wskazany port PV nie istnieje',
      pv_dc_wrong_medium:'Port MPPT musi mieć typ DC',
      pv_dc_missing_measurement:'Brak odczytu mocy wejścia PV',
      pv_dc_unconnected_port:'Przypisany port PV DC nie jest podłączony',
      pv_dc_observations:'Obserwacje wejść PV DC — poza bilansem magazynu',
      pv_dc_not_source:'PV wpływa do falownika. Bez modelu konwersji brak przepływu do magazynu DC',
      missing_measurements:'Brak wymaganych pomiarów',multiple_unknowns:'Wiele niewiadomych',
      aggregate_overlap:'Nakładające się pomiary zużycia',invalid_direction_or_power:'Błędna moc lub znak',
      building_child_exceeds_total:'Odbiorniki za budynkiem przekraczają jego pomiar całkowity',
      building_net_generation_insufficient:'Moc netto budynku wymaga dodatkowego źródła energii',
      building_child_reading_missing:'Brak pomiaru urządzenia za budynkiem',
      building_invalid_measurement:'Nieprawidłowy pomiar budynku',
      building_ambiguous_meter_path:'Niejednoznaczna droga pomiarowa — wiele dróg zasilania',
      building_unknown_meter_root:'Nie ustalono zasilania nadrzędnego dla budynku',
      invalid_derived_direction:'Niedozwolony kierunek obliczonej mocy',
      imbalance:'Niezgodny bilans',unresolved_flow:'Nieznany przepływ',
      unaccounted:'Moc nierozliczona',unaccounted_generation:'Brak zidentyfikowanego odbiornika lub przepływu',
      unaccounted_branch:'Nieustalony przepływ — moc nierozliczona',unaccounted_power:'Moc nierozliczona (nie strata)',
      calculated:'Wyliczone',calculated_ha:'Obliczono z HA V × A',
      calculated_test:'Obliczono z TEST V × A',
      measured:'Pomiar HA',simulated:'Symulacja',missing:'Brak pomiaru',
      invalid_source:'Niepoprawny odczyt',pending:'Do obliczenia',excluded:'Wyłączone',
      ha:'HA',simulation:'Symulacja',mixed:'Mieszane',unknown:'Nieznane',unavailable:'Niedostępne',
      generation:'Produkcja PV / źródeł',consumption:'Zużycie',grid_import:'Import',
      grid_export:'Eksport',storage_charge:'Ładowanie magazynu',
      storage_discharge:'Rozładowanie magazynu',
      zero:'Brak przepływu',forward:'Początek → koniec',reverse:'Koniec → początek',
      live:'Odczyty HA',hybrid:'Tryb hybrydowy',simulation_mode:'Symulacja',
      unknownSource:'Nieznane źródło',notMeasured:'Symulacja i obliczenia nie są pomiarami HA.',
      activeNetworks:'sieci prawidłowych',issueNetworks:'sieci nierozstrzygniętych',
      animation_disabled:'Animacja wyłączona',noCables:'Brak przewodów elektrycznych',noWarnings:'Brak ostrzeżeń',
      noData:'Brak rozstrzygnięcia'
    },
    en:{
      title:'Energy balance',off:'Balance disabled',noNetwork:'No connected electrical networks',
      network:'Network',status:'Status',balanced:'Balanced',unbalanced:'Conflicting readings',
      dc_converter_missing:'DC conversion model missing',
      dc_converter_explanation:'The battery is charging on an inverter-connected circuit, but its internal converter transfer is not modeled yet. The residual is unaccounted power, not proof of conflicting measurements.',
      insufficient:'Missing data',invalid:'Invalid readings',no_devices:'No sources / loads',
      role:'Device',power:'Net power',source:'Source',cables:'Cables',
      warnings:'Warnings',direction:'Direction',residual:'Balance residual',
      uncertain:'Flow cannot be resolved; automatic animation is stopped.',
      ambiguous_cycle:'Ambiguous flow in a loop',unconnected_or_missing_endpoints:'Unassigned cable endpoints',
      medium_mismatch:'AC/DC mismatch',bus_medium_mismatch:'Conflicting media on a bus',
      missing_node:'Missing device',missing_port:'Missing port',unconnected_device:'Disconnected device',
      ambiguous_device_network:'Device in multiple networks',
      invalid_or_unconnected_port:'Invalid or disconnected port',
      inverter_ac_reading_on_dc_network:'Inverter AC power cannot supply a DC network',
      pv_dc_required_mapping_missing:'Required MPPT input has no mapped DC port',
      pv_dc_duplicate_mapping:'Two MPPT inputs are mapped to the same DC port',
      pv_dc_missing_port:'Mapped PV port does not exist',
      pv_dc_wrong_medium:'MPPT port must be DC',
      pv_dc_missing_measurement:'PV input power reading is missing',
      pv_dc_unconnected_port:'Mapped PV DC port is not connected',
      pv_dc_observations:'PV DC input observations — excluded from battery balance',
      pv_dc_not_source:'PV power enters the inverter; battery DC transfer requires a converter model',
      missing_measurements:'Missing measurements',multiple_unknowns:'Multiple unknowns',
      aggregate_overlap:'Overlapping load measurements',invalid_direction_or_power:'Invalid sign or power',
      building_child_exceeds_total:'Child loads exceed the building gross meter',
      building_net_generation_insufficient:'Net meter requires additional generation',
      building_child_reading_missing:'Missing reading for building child',
      building_invalid_measurement:'Invalid building power reading',
      building_ambiguous_meter_path:'Ambiguous metering path — multiple supply routes',
      building_unknown_meter_root:'Unable to establish the upstream building supply',
      invalid_derived_direction:'Impossible derived power direction',
      imbalance:'Balance mismatch',unresolved_flow:'Unresolved flow',
      unaccounted:'Unaccounted power',unaccounted_generation:'Unidentified load or energy path',
      unaccounted_branch:'Unresolved flow — unaccounted power',unaccounted_power:'Unaccounted power (not a loss)',
      calculated:'Calculated',calculated_ha:'Calculated from HA V × A',
      calculated_test:'Calculated from TEST V × A',
      measured:'HA measured',simulated:'Simulation',missing:'Missing',
      invalid_source:'Invalid',pending:'Calculation pending',excluded:'Excluded',
      ha:'HA',simulation:'Simulation',mixed:'Mixed',unknown:'Unknown',unavailable:'Unavailable',
      generation:'PV / source generation',consumption:'Consumption',grid_import:'Grid import',
      grid_export:'Grid export',storage_charge:'Battery charging',
      storage_discharge:'Battery discharging',
      zero:'No flow',forward:'Start → end',reverse:'End → start',
      live:'HA readings',hybrid:'Hybrid',simulation_mode:'Simulation',
      unknownSource:'Unknown origin',notMeasured:'Simulation and calculated values are not HA measurements.',
      activeNetworks:'balanced networks',issueNetworks:'unresolved networks',
      animation_disabled:'Animation disabled',noCables:'No electrical cables',noWarnings:'No warnings',
      noData:'Unresolved'
    }
  };
  const styles=[
    '.ss-energy-diagnostics{color:var(--primary-text-color,#e4edf4);font:12px/1.5 sans-serif;box-sizing:border-box}',
    '.ss-energy-diagnostics--viewer{position:absolute;z-index:5;top:46px;right:8px;width:min(390px,calc(100% - 16px));max-height:calc(100% - 54px);overflow:auto;background:var(--card-background-color,#1e2935);border:1px solid var(--divider-color,#607083);border-radius:8px;box-shadow:0 5px 20px #0006}',
    '.ss-energy-diagnostics--editor{position:relative;margin-top:14px;border-top:1px solid var(--divider-color,#607083);padding-top:8px}',
    '.ss-energy-diagnostics summary{padding:8px 10px;cursor:pointer;font-weight:600}',
    '.ss-energy-diagnostics article{padding:9px 10px;margin:6px;border:1px solid var(--divider-color,#5b6874);border-radius:6px}',
    '.ss-energy-diagnostics h5{margin:0 0 5px;font-size:12px}',
    '.ss-energy-diagnostics p{margin:5px 7px;overflow-wrap:anywhere}',
    '.ss-energy-diagnostics table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:11px}',
    '.ss-energy-diagnostics td,.ss-energy-diagnostics th{border-bottom:1px solid var(--divider-color,#52606b);padding:4px;text-align:left;overflow-wrap:anywhere}',
    '.ss-energy-diagnostics td:last-child{text-align:right}',
    '.ss-energy-diagnostics ul{margin:5px 8px 8px 16px;padding:0;overflow-wrap:anywhere}',
    '.ss-energy-diagnostics [data-state="balanced"]{color:#65bd92}',
    '.ss-energy-diagnostics [data-state="invalid"],.ss-energy-diagnostics [data-state="unbalanced"]{color:#f0a06c}',
    '.ss-energy-diagnostics [data-state="insufficient"],.ss-energy-diagnostics [data-state="unaccounted"]{color:#f0c56e}',
    '.ss-energy-diagnostics .ss-diag-caption{font-size:10.5px;opacity:.82}',
    '.ss-energy-diagnostics .ss-diag-scroller{max-height:min(66vh,620px);overflow:auto}',
    '@media(max-width:600px){.ss-energy-diagnostics--viewer{top:40px;right:4px;width:calc(100% - 8px);max-height:calc(100% - 44px)}}'
  ].join('');
  const render=(layout,hass,language='pl',mode='viewer')=>{
    const view=viewModel(layout,hass),o=view.options;if(!o.enabled)return '';
    const L=messages[language==='en'?'en':'pl'],label=k=>L[k]||k;
    const text=(key,extra='')=>escape(label(key)+(extra?' · '+extra:''));
    const table=(pairs)=>'<table><tbody>'+pairs.map(([name,value])=>
      '<tr><th scope="row">'+escape(name)+'</th><td>'+escape(value)+'</td></tr>').join('')+'</tbody></table>';
    const networks=view.networks.map(n=>{
      const numbers=n.totals?table([
        [label('generation'),fmt(n.totals.generation_kw)],
        [label('consumption'),fmt(n.totals.consumption_kw)],
        [label('grid_import'),fmt(n.totals.grid_import_kw)],
        [label('grid_export'),fmt(n.totals.grid_export_kw)],
        [label('storage_charge'),fmt(n.totals.storage_charge_kw)],
        [label('storage_discharge'),fmt(n.totals.storage_discharge_kw)],
        ...(n.unaccounted_kw!==null?[[label('unaccounted_power'),fmt(n.unaccounted_kw)]]:[]),
         [label('residual'),fmt(n.residual_kw)]
      ]):'<p>'+escape(label('noData'))+'</p>';
      const rows=o.show_devices?'<h5>'+escape(label('role'))+'</h5>'+
        table(n.devices.map(d=>[
          d.name+' ['+d.node_type+']',
          fmt(d.injection_kw)+' · '+label(d.source==='invalid'?'invalid_source':d.source)
        ])):'';
      const cables=o.show_cables?'<h5>'+escape(label('cables'))+'</h5>'+
        table(n.cables.map(c=>[c.name,
          c.available?(c.mode==='off'?label('animation_disabled')+' · ':'')+
            fmt(c.kw)+' · '+label(c.direction==='none'?'zero':c.direction):
            label(c.diagnostic_reason||c.reason||'unresolved_flow')])):'';
      const reason=n.diagnostic_reason?
        '<p class="ss-diag-caption">'+escape(label('dc_converter_explanation'))+'</p>':
        n.reasons.length?'<p class="ss-diag-caption">'+
          n.reasons.map(r=>escape(label(r))).join(' · ')+'</p>':'';
      return '<article data-network-index="'+n.index+'" data-state="'+escape(n.state)+'">'+
        '<h5>'+escape(label('network')+' '+n.index+' ('+String(n.medium||'?').toUpperCase()+')')+'</h5>'+
        '<p '+ 'data-state="'+escape(n.state)+'">'+
          escape(label(n.diagnostic_reason||n.state))+'</p>'+
        reason+numbers+rows+cables+'</article>';
    }).join('');
    const loose=view.cables.filter(c=>!view.networks.some(n=>n.cables.includes(c)));
    const detached=o.show_cables&&loose.length?'<article><h5>'+escape(label('cables'))+'</h5>'+
      table(loose.map(c=>[c.name,label(c.reason||'unresolved_flow')]))+'</article>':'';
    const warningList=o.show_warnings?'<article><h5>'+escape(label('warnings'))+
      ' ('+view.warnings.length+')</h5>'+
      (view.warnings.length?'<ul>'+view.warnings.map(w=>{
        const cable=view.cables.find(c=>c.id===w.connection_id);
        const name=cable?.name||view.networks.flatMap(n=>n.devices)
          .find(d=>d.node_id===w.node_id)?.name||
          view.dcTerminals.find(t=>t.node_id===w.node_id)?.device_name||'';
        const link=mode==='editor'&&(w.connection_id||w.node_id)?
          '<button type="button" data-energy-jump="'+escape(w.connection_id||w.node_id)+
          '" data-energy-jump-kind="'+(w.connection_id?'connection':'node')+'">'+
          escape(name||'Pokaż na schemacie')+'</button>':escape(name);
        const input=Number.isInteger(w.input_index)&&w.input_index>=0&&
          w.input_index<12?' · MPPT '+(w.input_index+1):'';
        const port=w.port_id?' · '+w.port_id:'';
        return '<li>'+escape(label(w.diagnostic_reason||w.reason)+input+port)+
          (link?' · '+link:'')+'</li>';
      }).join('')+'</ul>':
        '<p>'+escape(label('noWarnings'))+'</p>')+'</article>':'';
    const pvReadouts=view.dcTerminals.length?
      '<article><h5>'+escape(label('pv_dc_observations'))+'</h5>'+
      table(view.dcTerminals.map(t=>[
        t.device_name+' · '+t.input_name+' → '+t.port_id+
          (t.connected?'':' (niepodłączony / disconnected)'),
        fmt(t.power_kw)+' · '+label(t.source)]))+
      '<p class="ss-diag-caption">'+escape(label('pv_dc_not_source'))+'</p></article>':'';
    const title=label('title')+' · '+view.balanced+'/'+view.networks.length;
    return '<details class="ss-energy-diagnostics ss-energy-diagnostics--'+
      (mode==='editor'?'editor':'viewer')+'" data-energy-status="'+
      (view.enabled?(view.unresolved||view.warnings.length?'attention':'ok'):'off')+'">'+
      '<summary>'+escape(title)+'</summary><div class="ss-diag-scroller">'+
      '<p class="ss-diag-caption">'+escape(label(view.scenario==='simulation'?'simulation_mode':view.scenario))+
      ' · '+view.balanced+' '+escape(label('activeNetworks'))+
      ' · '+view.unresolved+' '+escape(label('issueNetworks'))+'</p>'+
      '<p class="ss-diag-caption">'+escape(label('notMeasured'))+'</p>'+
      (!view.enabled?'<p>'+escape(label('off'))+'</p>':
      (view.networks.length?networks:'<p>'+escape(label('noNetwork'))+'</p>')+pvReadouts+detached+warningList)+
      '</div></details>';
  };
  return Object.freeze({defaults,normalize,viewModel,render,styles,escape,fmt});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioEnergyDiagnostics;
