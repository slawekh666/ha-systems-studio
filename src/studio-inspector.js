/* Dedicated right-hand device/pipe inspector, extracted without changing
 * existing properties or saved configuration fields. Event updates stay in
 * studio-custom.js for now; the panel only renders and wires HA suggestions.
 */
const HASSStudioEditorInspector = (() => {
  const create = ({editor, L, properties, esc, opts, registry, pickLang,
    get, selectedObject, getSelection, getSelectedPartId, getExpandedPartId, variantShape}) => {
    const entityList=()=>{
      const states=editor._hass?.states||{};
      return Object.keys(states).sort().slice(0,2000).map(id=>
        '<option value="'+esc(id)+'" label="'+esc(states[id]?.attributes?.friendly_name||id)+'"></option>').join('');
    };
    const field=(name,key,val,type='text',optsList=null,extra='')=>{
      const attr=extra?' '+extra:'';
      const input=optsList?
        '<select data-field="'+key+'"'+attr+'>'+opts(optsList,String(val??''))+'</select>':
        '<input data-field="'+key+'" type="'+type+'" value="'+esc(val??'')+'"'+attr+'/>';
      return '<label>'+esc(name)+input+'</label>';
    };
    const entityField=(value,kind,index)=>{
      return '<input type="search" list="ss-entity-list" data-field="'+kind+'"'+
        (index!==undefined?' data-index="'+index+'"':'')+
        ' value="'+esc(value||'')+'" placeholder="sensor..." autocomplete="off"/>';
    };
    const variantOptions=(node)=>registry.variantOptionsForNode(node,pickLang(editor._config,editor._hass));
    const styleOptions=[['warmwasser','Warmwasser (default)'],['studio','Studio (simple)']];
    const sides=[['left',L.left],['right',L.right],['inside',L.inside]];
    const colorsList=[['hot',L.hot],['cold',L.cold],['solar',L.solarFlow],['return',L.returnFlow]];
    const openSections=new Map();
    const sectionAttr=id=>openSections.get(id)===false?'':' open';
    const sectionIcon=(name)=>'<ha-icon icon="'+name+'" aria-hidden="true"></ha-icon>';
    const partIcons={sensor:'mdi:thermometer',heater:'mdi:flash',coil:'mdi:heating-coil',
      baffle_horizontal:'mdi:minus',baffle_vertical:'mdi:minus',inner_tank:'mdi:water-boiler'};
    const renderProps=()=>{
      // UI state is deliberately not persisted in studio_layout.
      for(const details of properties.querySelectorAll('details[data-section]'))
        openSections.set(details.dataset.section,details.open);
      const selection=getSelection();
      const model=get(),obj=selectedObject(model);
      let markup='<h3>'+esc(L.properties)+'</h3>';
      if(!obj){properties.innerHTML=markup+'<p>'+esc(L.choose)+'</p>';return;}
      const lang=pickLang(editor._config,editor._hass);
      const deviceName=selection.type==='connection'?(obj.type==='electric'?'Przewód elektryczny':'Rura'):
        (registry.resolve(obj.type,obj.variant)?.device?.[lang]||L[obj.type]||obj.type);
      markup+='<div class="ss-inspector-heading">'+sectionIcon(selection.type==='connection'?(obj.type==='electric'?'mdi:power-plug':'mdi:pipe'):(registry.categoryIcons[registry.resolve(obj.type,obj.variant)?.category]||'mdi:cube-outline'))+
        '<span>'+esc(obj.label||deviceName)+'</span></div>'+
        '<details class="ss-section-details" data-section="device"'+sectionAttr('device')+'><summary>'+
        sectionIcon('mdi:tune-variant')+'<span>'+esc(obj.type==='tank'?(L.tankSettings||'Ustawienia zbiornika'):(L.properties||'Właściwości'))+'</span>'+
        sectionIcon('mdi:chevron-down')+'</summary><section>'+field(L.name,'label',obj.label);
      if(selection.type==='node'){

        const electrical=typeof HASSStudioEnergyTopology!=='undefined'&&HASSStudioEnergyTopology.electricalType(obj);
        if(electrical&&obj.type!=='distribution_board'){
          const c=obj.type==='inverter'?HASSStudioInverter.normalize(obj):
            obj.type==='building'?HASSStudioBuilding.normalize(obj):
            obj.type==='energy_storage'?HASSStudioEnergyStorage.normalize(obj):
            obj.type==='ev_charger'?HASSStudioEVCharger.normalize(obj):
            obj.type==='power_grid'?HASSStudioPowerGrid.normalize(obj):null;
          const mode=obj.energy_mode||
            ((c?.mode==='manual'||obj.hp_test_mode===true)?'test':'ha');
          const test=mode==='test'||mode==='auto'&&obj.energy_fallback_enabled===true;
          markup+=field('Źródło danych','energy_mode',mode,'text',
            [['auto','Automatycznie: HA → TEST'],['ha','Tylko Home Assistant'],['test','Symulacja ręczna']]);
          if(mode==='auto')markup+=field('Wartość testowa, gdy czujnik HA nie działa',
            'energy_fallback_enabled',obj.energy_fallback_enabled?'true':'false','text',
            [['true','Włączona'],['false','Wyłączona']]);
          const metric=(title,entityKey,entity,testKey,testValue,unit='kW')=>{
            markup+='<div class="ss-metric-group"><strong>'+esc(title)+'</strong>'+
              field('Czujnik Home Assistant',entityKey,entity||'','search',null,'list="ss-entity-list"');
            if(test)markup+='<div class="ss-metric-test">'+
              field(title+' — TEST',testKey,testValue??'','number',null,'step="0.01"')+'</div>';
            markup+='</div>';
          };
          if(obj.type==='power_grid'){
            const grid=HASSStudioPowerGrid.normalize(obj);
            for(const phase of [1,2,3]){
              metric('Napięcie fazy L'+phase+' (V)','grid_entity_l'+phase+'_v',grid.entities['l'+phase+'_v'],
                'grid_manual_l'+phase+'_v',grid.manual['l'+phase+'_v'],'V');
              metric('Prąd fazy L'+phase+' (A)','grid_entity_l'+phase+'_a',grid.entities['l'+phase+'_a'],
                'grid_manual_l'+phase+'_a',grid.manual['l'+phase+'_a'],'A');
            }
            metric('Częstotliwość sieci (Hz)','grid_entity_frequency',grid.entities.frequency,
              'grid_manual_frequency',grid.manual.frequency,'Hz');
            markup+='<p class="ss-note">Słup wyświetla tylko parametry sieci. Bilans automatycznie oblicza import i eksport z mocy falownika, magazynu i odbiorników.</p>';
          }else if(obj.type==='inverter')
            metric('Moc chwilowa falownika (kW)','inv_entity_ac_power',c.entities.ac_power,
              'inv_manual_ac_power',c.manual.ac_power);
          else if(obj.type==='building')
            metric('Moc chwilowa budynku (kW)','building_power_entity',c.power_entity,
              'building_power_kw',c.power_kw);
          else if(obj.type==='energy_storage')
            metric('Moc magazynu (kW): dodatnia — ładowanie','storage_entity_power',c.entities.power,
              'storage_manual_power',c.manual.power);
          else if(obj.type==='ev_charger')
            metric('Moc pobierana przez ładowarkę (kW)','ev_entity_power',c.entities.power,
              'ev_manual_power',c.manual.power);
          else if(obj.type==='pump')
            metric('Moc pobierana przez pompę (W)','energy_power_entity',obj.energy_power_entity,
              'energy_manual_w',obj.energy_manual_kw===null?'':+(obj.energy_manual_kw*1000).toFixed(2),'W');
          else if(obj.type==='boiler'&&['electric','electric_modern'].includes(obj.variant))
            metric('Moc pobierana przez kocioł (kW)','electric_power_entity',obj.electric_power_entity,
              'energy_manual_kw',obj.energy_manual_kw);
          else if(obj.type==='boiler'&&['heatpump','heatpump_modern'].includes(obj.variant))
            metric('Moc elektryczna pompy ciepła (kW)','hp_power_entity',obj.hp_power_entity,
              'hp_manual_kw',obj.hp_manual_kw);
        }
        if(electrical)markup+='<details class="ss-section-details" data-section="electrical-advanced"'+
          (openSections.get('electrical-advanced')===true?' open':'')+
          '><summary>'+sectionIcon('mdi:tune')+'<span>Dodatkowe parametry i wygląd</span></summary><section>';
        if(electrical){
          markup+='<details data-section="energy-ports"'+
            (openSections.get('energy-ports')===true?' open':'')+
            '><summary>Porty — ustawienia zaawansowane</summary>';
          markup+=(obj.energy_ports||[]).map((port,i)=>'<div class="ss-energy-port-edit">'+
            '<strong>'+esc(port.label||port.id)+'</strong>'+
            field('Nazwa','energy_port_label',port.label,'text',null,'data-index="'+i+'"')+
            field('AC / DC','energy_port_medium',port.medium,'text',[['ac','AC'],['dc','DC']],'data-index="'+i+'"')+
            field('Szyna','energy_port_bus',port.bus,'text',null,'data-index="'+i+'"')+
            field('Położenie X (%)','energy_port_x',port.x,'number',null,'data-index="'+i+'"')+
            field('Położenie Y (%)','energy_port_y',port.y,'number',null,'data-index="'+i+'"')+
            '<button type="button" data-remove-energy-port="'+i+'">Usuń port</button></div>').join('');
          markup+='<button type="button" data-add-energy-port>+ Dodaj port AC/DC</button></details>';
        }
         markup+=field(L.graphic,'variant',obj.variant,'text',variantOptions(obj));
        if(!(obj.type==='boiler'&&['solid_fuel','pellet_modern','heatpump_modern','gas_modern','electric_modern','fireplace_modern'].includes(obj.variant)))markup+=field(L.visual||'Graphic style','visual',obj.visual,'text',styleOptions);
        const isGrid=obj.type==='power_grid';
        const isRadiator=obj.type==='radiator',isManifold=obj.type==='manifold',isStorage=obj.type==='energy_storage',isInverter=obj.type==='inverter',isDistribution=obj.type==='distribution_board',isEV=obj.type==='ev_charger',isBuilding=obj.type==='building';
        const previewFree=obj.type==='tank'&&obj.variant==='modular'&&obj.scale_mode==='free';
        const previewSolid=obj.type==='boiler'&&obj.variant==='solid_fuel';
        const previewPellet=obj.type==='boiler'&&obj.variant==='pellet_modern';
        const previewHP=obj.type==='boiler'&&obj.variant==='heatpump_modern';
        const previewGas=obj.type==='boiler'&&obj.variant==='gas_modern';
        const previewElectric=obj.type==='boiler'&&obj.variant==='electric_modern';
        const previewFireplace=obj.type==='boiler'&&obj.variant==='fireplace_modern';
        const previewWidth=previewFree?Math.max(112*obj.width_scale+30,145*obj.width_scale):120;
        const previewHeight=previewFree?Math.max(113*obj.height_scale+40,155*obj.height_scale):140;
        const previewBox=isBuilding?'0 0 150 185':(isDistribution||isEV)?'0 0 150 180':isInverter?'0 0 150 180':isStorage?'0 0 150 180':(isRadiator||isManifold)?(()=>{const q=isRadiator?HASSStudioRadiator.geometry(obj):HASSStudioManifold.geometry(obj);return (q.x-8)+' '+(q.y-8)+' '+(q.width+16)+' '+(q.height+38);})():isGrid?(()=>{const q=HASSStudioPowerGrid.geometry(obj);return (q.x-8)+' '+(q.y-8)+' '+(q.width+16)+' '+(q.height+38);})():previewFireplace?(()=>{const q=HASSStudioFireplace.geometry(obj);return (q.x-8)+' '+(q.y-8)+' '+(q.width+16)+' '+(q.labelY-q.y+24);})():previewElectric?(()=>{const q=HASSStudioElectricBoiler.geometry(obj);return (q.x-8)+' '+(q.y-8)+' '+(q.width+16)+' '+(q.labelY-q.y+24);})():previewGas?(()=>{const q=HASSStudioGasBoiler.geometry(obj);return (q.x-8)+' '+(q.y-8)+' '+(q.width+16)+' '+(q.labelY-q.y+24);})():previewHP?(()=>{const q=HASSStudioHeatPump.geometry(obj);return (q.x-8)+' '+(q.y-8)+' '+(q.width+16)+' '+(q.labelY-q.y+24);})():previewPellet?(()=>{const b=HASSStudioPellet.geometry(obj);
            return (b.x-8)+' '+(b.y-8)+' '+(b.width+16)+' '+(b.labelY-b.y+26);})():
          previewSolid?((66+(12-66)*obj.width_scale-8)+' '+(53+(-105-53)*obj.height_scale-8)+' '+
            (110*obj.width_scale+16)+' '+(318*obj.height_scale+16)):
          obj.visual==='warmwasser'&&obj.type==='boiler'?'0 -110 130 350':
          previewFree?((60-previewWidth/2)+' '+(70-previewHeight/2)+' '+previewWidth+' '+previewHeight):'0 0 120 140';
        markup+='<div class="ss-preview"><svg viewBox="'+previewBox+'" width="120" height="120">'+
          HASSStudioGraphics.styles+HASSStudioTank.styles+HASSStudioSolidFuel.styles+HASSStudioPellet.styles+HASSStudioHeatPump.styles+HASSStudioGasBoiler.styles+HASSStudioFireplace.styles+'<defs>'+HASSStudioGraphics.defs(obj,editor._hass)+'</defs>'+
          (isBuilding?HASSStudioBuilding.render(obj,editor._hass):isDistribution?HASSStudioDistributionBoard.render(obj,editor._hass):isEV?HASSStudioEVCharger.render(obj,editor._hass):isInverter?HASSStudioInverter.render(obj,editor._hass):isStorage?HASSStudioEnergyStorage.render(obj,editor._hass):isRadiator?HASSStudioRadiator.render(obj,editor._hass):isManifold?HASSStudioManifold.render(obj,editor._hass):isGrid?HASSStudioPowerGrid.render(obj,editor._hass):obj.type==='tank'&&obj.variant==='modular'?HASSStudioTank.render(obj,editor._hass):obj.type==='boiler'&&obj.variant==='solid_fuel'?HASSStudioSolidFuel.render(obj,editor._hass):previewPellet?HASSStudioPellet.render(obj,editor._hass):previewHP?HASSStudioHeatPump.render(obj,editor._hass):previewGas?HASSStudioGasBoiler.render(obj,editor._hass):previewElectric?HASSStudioElectricBoiler.render(obj,editor._hass):previewFireplace?HASSStudioFireplace.render(obj,editor._hass):obj.visual==='warmwasser'?HASSStudioGraphics.render(obj,editor._hass):variantShape(obj))+'</svg></div>';
        if(obj.type==='boiler'){
          const panelGroups={solid_fuel:['displayGroup',549,369],pellet_modern:['displayPanel',322,315],
            heatpump_modern:['displayBlock',986,371],gas_modern:['displayFrame',574,1097],
            electric_modern:['controlPanelGroup',560,946],fireplace_modern:['displayGroup',634,332]};
          const panel=panelGroups[obj.variant];
          if(panel)markup=HASSStudioReadoutScale.namedGroup(markup,panel[0],panel[1],panel[2],obj.readout_scale);
        }
        const freeScale=obj.type==='tank'&&obj.variant==='modular'&&obj.scale_mode==='free';
        if(obj.type==='tank'&&obj.variant==='modular'){
          markup+=field(L.scale+' ('+Math.round(obj.scale*100)+'%)','scale',obj.scale,'range',null,'min="0.5" max="2.4" step="0.05"')+
            field(L.tankWidthScale+' ('+Math.round(obj.width_scale*100)+'%)','width_scale',obj.width_scale,
              'range',null,'min="0.5" max="2.4" step="0.05"')+
            field(L.tankHeightScale+' ('+Math.round(obj.height_scale*100)+'%)','height_scale',obj.height_scale,
              'range',null,'min="0.5" max="2.4" step="0.05"')+
            field(L.tankScaleMode,'aspect_locked',obj.aspect_locked?'true':'false','text',
              [['true',L.tankScaleProportional],['false',L.tankScaleFree]])+
            '<button type="button" data-action="reset-tank-aspect">'+esc(L.tankScaleProportional)+' 1:1</button>';
        }else{
          markup+=field(L.scale,'scale',obj.scale,'range',null,'min="0.5" max="2.4" step="0.1"');
          if(obj.type==='boiler'&&['solid_fuel','pellet_modern','heatpump_modern','gas_modern','electric_modern','fireplace_modern'].includes(obj.variant)){
            markup+=field(L.solidWidth+' ('+Math.round(obj.width_scale*100)+'%)','width_scale',obj.width_scale,
              'range',null,'min="0.5" max="2.4" step="0.05"')+
              field(L.solidHeight+' ('+Math.round(obj.height_scale*100)+'%)','height_scale',obj.height_scale,
              'range',null,'min="0.5" max="2.4" step="0.05"');
          }
        }
        markup+='<div class="ss-row">'+field('X','x',obj.x,'number')+field('Y','y',obj.y,'number')+'</div>';
        if(obj.type==='boiler'&&['solid_fuel','pellet_modern','heatpump_modern','gas_modern','electric_modern','fireplace_modern'].includes(obj.variant))markup+=field('Skala panelu z tekstem (%)','readout_scale',Math.round((obj.readout_scale||1)*100),'range',null,'min="40" max="150" step="5"');


        if(isBuilding){
          const c=HASSStudioBuilding.normalize(obj);
          
          
          markup+=field('Zużycie dzienne (Wh/kWh/MWh)','building_daily_entity',c.daily_entity,'search',null,'list="ss-entity-list"');
          markup+=field('Typ pomiaru','building_measurement',c.measurement,'text',
            [['individual','Pozostały pobór (bez głównego licznika)'],['aggregate','Łączny pobór domu wraz z odbiornikami za nim']]);
          if(c.measurement==='individual')markup+=field('Ręczny pozostały pobór','building_remaining_enabled',c.remaining_enabled?'true':'false','text',[['true','Tak'],['false','Nie']])+
            (c.remaining_enabled?field('Pozostały pobór testowy (kW)','building_remaining_kw',c.remaining_kw,'number',null,'min="0" step="0.01"'):'');
          markup+='<p class="ss-note">Urządzenia podłączone do portu child automatycznie wydzielają swój pobór z całkowitego pomiaru budynku.</p>';
          markup+=field('Pokaż odczyt','building_show_readout',c.show_readout?'true':'false','text',[['true','Tak'],['false','Nie']]);
          markup+=field('Skala odczytu (%)','building_readout_scale',Math.round(c.readout_scale*100),'range',null,'min="40" max="150" step="5"');
          markup+=field('Podświetlaj okna przy poborze','building_window_glow',c.window_glow?'true':'false','text',[['true','Tak'],['false','Nie']]);
          if(c.mode==='manual')markup+=
             field('Test zużycia dziennego (kWh)','building_daily_kwh',c.daily_kwh,'number',null,'min="0" step="0.1"');
          markup+='<p class="ss-note">Udział energii PV i sieci to osobny bilans. Pomiar zbiorczy nie jest dodawany do jego odbiorników.</p>';
        }
        if(isEV){
          const d=HASSStudioEVCharger.normalize(obj);
          const yes=(k,label)=>field(label,'ev_'+k,d[k]?'true':'false','text',[['true','Tak'],['false','Nie']]);
          
          markup+=field('Liczba faz','ev_phases',d.phases,'text',[['1','Jedna'],['3','Trzy']]);
          markup+=field('Próg ładowania (W)','ev_power_threshold_w',d.power_threshold_w,'number',null,'min="0" max="1000" step="1"');
          markup+=field('Skala ekranu (%)','ev_display_scale',Math.round(d.display_scale*100),'range',null,'min="40" max="150" step="5"');
          markup+=yes('charging_positive','Dodatnia moc oznacza ładowanie')+yes('animate','Animacja błyskawicy');
          markup+=yes('show_extra','Pokaż panel parametrów');
          markup+=field('Położenie panelu','ev_extra_position',d.extra_position,'text',[['right','Prawo'],['left','Lewo']]);
          markup+=field('Skala panelu (%)','ev_extra_scale',Math.round(d.extra_scale*100),'range',null,'min="40" max="150" step="5"');
          markup+='<h4>Encje ładowarki i liczniki energii</h4>';
          const labels={power:'Aktualna moc (W/kW)',session_energy:'Energia sesji (Wh/kWh)',daily_energy:'Energia dzienna',monthly_energy:'Energia miesięczna',total_energy:'Energia całkowita',status:'Status ładowarki',alarm:'Alarm',temperature:'Temperatura',vehicle_soc:'SOC samochodu',voltage_l1:'Napięcie L1',voltage_l2:'Napięcie L2',voltage_l3:'Napięcie L3',current_l1:'Prąd L1',current_l2:'Prąd L2',current_l3:'Prąd L3'};
          for(const key of HASSStudioEVCharger.keys){
            if(key==='power')continue;
            if(d.phases===1&&/_(?:l2|l3)$/.test(key))continue;
            markup+=field(labels[key]||key,'ev_entity_'+key,d.entities[key]||'','search',null,'list="ss-entity-list"');
          }
          if(d.mode==='manual'){
            
            markup+=field('Test energii sesji (kWh)','ev_manual_session_energy',d.manual.session_energy,'number',null,'min="0" step="0.1"');
            markup+=field('Test statusu','ev_manual_status',d.manual.status,'text',[['charging','Ładowanie'],['ready','Gotowość'],['disconnected','Niepodłączona'],['fault','Awaria']]);
            markup+=field('Test alarmu','ev_manual_alarm',d.manual.alarm?'true':'false','text',[['false','Brak'],['true','Alarm']]);
          }
          markup+='<p class="ss-note">Historia sesji wymaga liczników/rekordów w HA. Panel tylko odczytuje dane; nie steruje ładowaniem.</p>';
        }
        if(isInverter){
          const c=HASSStudioInverter.normalize(obj);
          const bool=(k,label)=>field(label,'inv_'+k,c[k]?'true':'false','text',[['true','Tak'],['false','Nie']]);
          markup+=
            field('Skala ekranu (%)','inv_display_scale',Math.round(c.display_scale*100),'range',null,'min="40" max="150" step="5"')+
            field('Liczba wejść PV / MPPT','inv_count',c.count,'number',null,'min="1" max="12" step="1"')+
            field('Moc znamionowa (kW)','inv_rated_kw',c.rated_kw,'number',null,'min="0.1" max="500" step="0.1"')+
            field('Próg produkcji (W)','inv_production_threshold_w',c.production_threshold_w,'number',null,'min="0" max="1000" step="1"')+
            bool('positive_power','Moc dodatnia = produkcja AC')+
            bool('show_extra','Pokaż panel parametrów')+
            field('Pozycja panelu','inv_extra_position',c.extra_position,'text',[['right','Prawo'],['left','Lewo']])+
            field('Skala dodatkowego panelu (%)','inv_extra_scale',Math.round(c.extra_scale*100),'range',null,'min="40" max="150" step="5"');
          for(const [k,title] of [['temperature','Temperatura falownika'],['status','Status falownika'],['alarm','Alarm falownika']])
            markup+=field(title,'inv_entity_'+k,c.entities[k]||'','search',null,'list="ss-entity-list"');
          if(c.mode==='manual')markup+=field('Test temperatury (°C)','inv_manual_temperature',c.manual.temperature,'number',null,'step="0.1"');
          markup+='<h4>Wejścia fotowoltaiczne</h4>';
          c.inputs.forEach((q,i)=>{
            markup+='<details><summary>PV / MPPT '+(i+1)+'</summary>';
            markup+=field('Nazwa (maks. 12 znaków)','inv_pv_'+i+'_name',q.name,'text')+
              field('Na małym ekranie','inv_pv_'+i+'_visible',q.visible?'true':'false','text',[['true','Tak'],['false','Nie']]);
            for(const [key,label] of [['voltage','Napięcie (V)'],['current','Natężenie (A)'],['power','Moc (W/kW)']]){
              markup+=field('Encja '+label,'inv_pv_'+i+'_entity_'+key,q.entities[key]||'','search',null,'list="ss-entity-list"');
              if(c.mode==='manual')markup+=field('Test '+label,'inv_pv_'+i+'_manual_'+key,q.manual[key]??'','number',null,'step="0.1"');
            }
            markup+='</details>';
          });
          markup+='<h4>Panel parametrów</h4>'+field('Nagłówek','inv_panel_title',c.panel_title,'text');
          const rowTypes=HASSStudioInverter.DEFAULT_KEYS.map(k=>[k,({ac_power:'Moc AC',temperature:'Temperatura',status:'Status',alarm:'Alarm',pv_summary:'PV — V/A/W',pv_voltage:'Napięcie PV',pv_current:'Prąd PV',pv_power:'Moc PV',custom:'Dowolna encja'})[k]]);
          c.panel_rows.forEach((row,i)=>{
            markup+='<details><summary>'+esc((i+1)+'. '+HASSStudioInverter.labelFor(row,c))+'</summary>';
            markup+=field('Parametr','inv_row_'+i+'_key',row.key,'text',rowTypes)+field('Opis','inv_row_'+i+'_label',row.label,'text');
            if(row.key.startsWith('pv_'))markup+=field('Numer wejścia (0=PV1)','inv_row_'+i+'_input',row.input,'number',null,'min="0" max="'+(c.count-1)+'"');
            if(row.key==='custom')markup+=field('Encja','inv_row_'+i+'_entity',row.entity,'search',null,'list="ss-entity-list"')+
              (c.mode==='manual'?field('Wartość testowa','inv_row_'+i+'_manual_value',row.manual_value,'text'):'');
            markup+=field('Jednostka','inv_row_'+i+'_unit',row.unit,'text',['auto','W','kW','Wh','kWh','MWh','V','A','°C','%','Hz'].map(v=>[v,v]))+
              field('Miejsca po przecinku','inv_row_'+i+'_decimals',row.decimals,'number',null,'min="0" max="3"')+
              '<div class="ss-actions"><button type="button" data-inv-row-up="'+i+'">↑</button><button type="button" data-inv-row-down="'+i+'">↓</button><button type="button" data-inv-row-delete="'+i+'">Usuń</button></div></details>';
          });
          markup+='<button type="button" data-inv-row-add="true">+ Dodaj parametr</button>'+
            '<p class="ss-note">Brak odczytu: —. Mały ekran pokazuje do trzech wejść PV. Wykres jest ozdobny.</p>';
        }
        if(isStorage){
          const c=HASSStudioEnergyStorage.normalize(obj);
          const bool=(key,title)=>field(title,'storage_'+key,c[key]?'true':'false','text',[['true','Tak'],['false','Nie']]);
          
          markup+=field('Skala ekranu (%)','storage_display_scale',Math.round(c.display_scale*100),'range',null,'min="40" max="150" step="5"');
          markup+=bool('show_screen','Pokaż ekran')+bool('animate_charge','Animacja podczas ładowania');
          markup+=bool('charge_positive','Dodatnia moc oznacza ładowanie');
          markup+='<h4>Rezerwa i ostrzeżenia (wyłącznie wizualne)</h4>';
          markup+=field('Minimalny poziom SOC (%)','storage_min_soc',c.min_soc,'number',null,'min="0" max="100" step="1"');
          markup+=field('Margines ostrzeżenia (p.p.)','storage_warning_margin',c.warning_margin,'number',null,'min="0" max="30" step="1"');
          markup+=bool('custom_alarm','Oddzielny próg alarmu SOC');
          if(c.custom_alarm)markup+=field('Alarm SOC (%)','storage_alarm_soc',c.alarm_soc,'number',null,'min="0" max="100" step="1"');
          markup+=bool('show_alarm','Wykrzyknik alarmu')+bool('show_warning','Ostrzeżenie niskiego SOC');
          markup+='<h4>Alarmy diagnostyczne — progi opcjonalne</h4>';
          for(const [enabled,key,title,min,max,step] of [
            ['temp_low_enabled','temp_low','Min. temperatura (°C)',-50,100,1],
            ['temp_high_enabled','temp_high','Maks. temperatura (°C)',-50,150,1],
            ['cell_low_enabled','cell_low','Min. napięcie celi (V)',0,5,.01],
            ['cell_high_enabled','cell_high','Maks. napięcie celi (V)',0,5,.01],
            ['delta_enabled','delta_max','Maks. różnica cel (mV)',0,1000,1]]){
              markup+=bool(enabled,'Włącz: '+title);
              if(c[enabled])markup+=field(title,'storage_'+key,c[key],'number',null,'min="'+min+'" max="'+max+'" step="'+step+'"');
          }
          markup+=bool('offline_alarm','Alarm braku komunikacji SOC');
          markup+='<h4>Encje magazynu i BMS</h4>';
          for(const [key,label] of [
            ['soc','SOC (%)'],['soh','SOH (%)'],
            ['voltage','Napięcie baterii (V)'],['current','Prąd (A)'],
            ['temperature','Temperatura (°C)'],['cell_min','Minimalne napięcie celi (V)'],
            ['cell_max','Maksymalne napięcie celi (V)'],['cell_delta','Różnica ogniw (mV)'],
            ['cycles','Liczba cykli'],['bms_alarm','Alarm BMS (binary sensor/status)']
          ])markup+=field(label,'storage_entity_'+key,c.entities[key]||'','search',null,'list="ss-entity-list"');
          if(c.mode==='manual')markup+=field('Test SOC (%)','storage_manual_soc',c.manual.soc,'number',null,'min="0" max="100"');
          markup+='<p class="ss-note">Progi i alarmy służą wyłącznie do prezentacji. Nie zmieniają ustawień falownika ani BMS.</p>';
        }
        if(isRadiator){
          const c=obj.radiator||HASSStudioRadiator.defaults();
          markup+=field('Odbicie lustrzane (lewo/prawo)','rad_mirror_horizontal',c.mirror_horizontal?'true':'false','text',[['false','Normalny'],['true','Odbity']]);
          markup+=field('Skala wyświetlacza (%)','rad_display_scale',Math.round((c.display_scale||1)*100),'range',null,'min="40" max="150" step="5"');
          markup+=field('Wyświetlacz','rad_display',c.display!==false?'true':'false','text',[['true','Widoczny'],['false','Ukryty']]);
          markup+=field('Źródło danych','rad_mode',c.mode||'live','text',[['live','Home Assistant'],['manual','Symulacja']]);
          markup+=field('Czujnik temperatury','rad_temperature_entity',c.temperature_entity||'','search',null,'list="ss-entity-list"');
          markup+=field('Czujnik otwarcia (%)','rad_valve_entity',c.valve_entity||'','search',null,'list="ss-entity-list"');
          if(c.mode==='manual')markup+=field('Test temperatury','rad_manual_temperature',c.manual_temperature,'number')+field('Test otwarcia (%)','rad_manual_open',c.manual_open,'number');
        }
        if(isManifold){
          const c=obj.manifold||HASSStudioManifold.defaults();
          markup+=field('Liczba obiegów (1–40)','mf_count',c.count||5,'number',null,'min="1" max="40" step="1"');
          markup+=field('Rozstaw obiegów','mf_pitch',c.pitch||260,'number',null,'min="165" max="400" step="5"');
          markup+=field('Skala wyświetlaczy (%)','mf_display_scale',Math.round((c.display_scale||1)*100),'range',null,'min="40" max="150" step="5"');
          markup+=field('Sterowanie siłownikami','mf_actuatorMode',c.actuatorMode||'individual','text',[['individual','Indywidualne'],['common','Wspólne']]);
          markup+=field('Źródło danych','mf_mode',c.mode||'live','text',[['live','Home Assistant'],['manual','Symulacja']]);
          const list=HASSStudioManifold.normalize(c).circuits;
          for(let i=0;i<list.length;i++){
            const q=list[i];markup+='<details><summary>Obieg '+(i+1)+'</summary>';
            markup+=field('Wyświetlacz','mf_c_'+i+'_display',q.display?'true':'false','text',[['true','Tak'],['false','Nie']]);
            markup+=field('Siłownik','mf_c_'+i+'_actuator',q.actuator?'true':'false','text',[['true','Tak'],['false','Nie']]);
            markup+=field('Skala tego wyświetlacza (%)','mf_c_'+i+'_display_scale',Math.round(q.display_scale*100),'number',null,'min="40" max="150" step="5"');
            for(const k of ['tempOut','tempReturn','flow','open']){
              markup+=field('Encja '+k,'mf_c_'+i+'_entity_'+k,q.entities?.[k]||'','search',null,'list="ss-entity-list"');
              if(c.mode==='manual')markup+=field('Test '+k,'mf_c_'+i+'_manual_'+k,q[k]??0,'number',null,'step="0.1"');
            }
            markup+='</details>';
          }
        }
        if(isGrid){
          const g=HASSStudioPowerGrid.normalize(obj);
          markup+='<h4>Wygląd panelu słupa</h4>'+
            field('Skala panelu (%)','grid_panel_scale',Math.round(g.panel_scale*100),'range',null,'min="40" max="150" step="5"')+
            field('Pozycja panelu','grid_panel_position',g.panel_position,'text',[['right','Prawo'],['left','Lewo'],['bottom','Pod słupem']])+
            field('Pokaż panel','grid_show_panel',g.show_panel?'true':'false','text',[['true','Tak'],['false','Nie']]);
                }else markup+=field(L.entity,'entity',obj.entity,'search',null,'list="ss-entity-list"');
        if(['pump','valve'].includes(obj.type)){
          markup+=field('Źródło stanu','eq_mode',obj.equipment_mode||'live','text',
            [['live','Home Assistant'],['manual','Test ręczny']]);
          if(obj.equipment_mode==='manual'){
            if(obj.type==='pump')markup+=field('Test pompy','eq_test_running',obj.equipment_test_running?'true':'false','text',
                [['false','Wyłączona'],['true','Włączona']])+
                field('Czas animacji (s)','eq_test_speed',obj.equipment_test_speed??1,'number',null,'min="0.35" max="5" step="0.1"');
            else markup+=field('Test otwarcia / pozycji (%)','eq_test_position',obj.equipment_test_position??0,'number',null,'min="0" max="100" step="1"')+
                '<p class="ss-note">Zawór 3D: pozycja, nie rzeczywista proporcja mieszania.</p>';
          }
          markup+='<p class="ss-note">Symulacja wizualna bez sterowania HA.</p>';
        }
        if(obj.type==='boiler'){
          if(obj.variant==='fireplace_modern')markup+='<p class="ss-note">'+esc(L.fireplaceHelp)+'</p>';
          if(obj.variant==='electric_modern')markup+=field(L.electricLoad,'electric_load_entity',obj.electric_load_entity,'search',null,'list="ss-entity-list"')+
            field(L.electricMax,'electric_max_kw',obj.electric_max_kw,'number',null,'min="0.1" max="100" step="0.1"')+
            field(L.electricGlow,'electric_glow',obj.electric_glow,'range',null,'min="0" max="100" step="5"')+
            '<p class="ss-note">'+esc(L.electricHelp)+'</p>';
          if(obj.variant==='gas_modern')markup+=field(L.gasDraw,'gas_draw_entity',obj.gas_draw_entity,'search',null,'list="ss-entity-list"')+
            field(L.gasGlow,'gas_glow',obj.gas_glow,'range',null,'min="0" max="100" step="5"')+
            '<p class="ss-note">'+esc(L.gasHelp)+'</p>';
          if(obj.variant==='pellet_modern'){
             const test=obj.pellet_test_mode===true;
             markup+=field('Tryb danych kotła pelletowego','pellet_test_mode',test?'true':'false','text',
                [['false','Home Assistant'],['true','Symulacja ręczna']]);
             if(test){
               markup+=field('Test temperatury (°C)','pellet_manual_temperature',obj.pellet_manual_temperature??65,'number',null,'min="-40" max="150" step="0.5"')+
                 field('Test stanu palnika','pellet_manual_state',obj.pellet_manual_state||'burning','text',
                   [['off','Wyłączony'],['ignition','Rozpalanie'],['burning','Praca'],['embers','Wygaszanie']])+
                 field('Jednostka mocy palnika','pellet_manual_power_unit',obj.pellet_manual_power_unit||'%','text',[['%','%'],['kW','kW']])+
                 field('Test mocy palnika','pellet_manual_power',obj.pellet_manual_power??65,'number',null,'min="0" step="0.1"')+
                 field('Test podajnika','pellet_manual_feeder',obj.pellet_manual_feeder?'true':'false','text',[['false','Wyłączony'],['true','Aktywny']])+
                 field('Test alarmu','pellet_manual_alarm',obj.pellet_manual_alarm?'true':'false','text',[['false','Brak'],['true','Alarm']])+
                 field(L.pelletLevelTest,'pellet_level_test',obj.pellet_level_test??80,'number',null,'min="0" max="100" step="1"');
             }else{
               markup+=field('Encja mocy/modulacji palnika (% / W / kW)','pellet_burner_power_entity',obj.pellet_burner_power_entity||'','search',null,'list="ss-entity-list"')+
                 field('Encja podajnika','pellet_feeder_entity',obj.pellet_feeder_entity||'','search',null,'list="ss-entity-list"')+
                 field('Encja alarmu','pellet_alarm_entity',obj.pellet_alarm_entity||'','search',null,'list="ss-entity-list"')+
                 field(L.pelletLevelEntity,'pellet_level_entity',obj.pellet_level_entity||'','search',null,'list="ss-entity-list"')+
                 field(L.pelletLevelMode,'pellet_level_manual',obj.pellet_level_manual?'true':'false','text',[['false',L.pelletLevelHA],['true',L.pelletLevelManual]])+
                 (obj.pellet_level_manual?field(L.pelletLevelTest,'pellet_level_test',obj.pellet_level_test??80,'number',null,'min="0" max="100" step="1"'):'');
             }
             markup+=field(L.pelletAlarm,'pellet_alarm_pct',obj.pellet_alarm_pct??20,'number',null,'min="0" max="100" step="1"');
           }
          if(obj.variant==='heatpump_modern')markup+=
             (obj.hp_test_mode?field('Test wentylatora (%)','hp_manual_fan',obj.hp_manual_fan??0,'number',null,'min="0" max="100" step="1"'):'')+
             
            field(L.hpFan,'hp_fan_entity',obj.hp_fan_entity,'search',null,'list="ss-entity-list"')+
            field(L.hpMaxRpm,'hp_max_rpm',obj.hp_max_rpm,'number',null,'min="100" max="20000" step="100"')+
            field(L.hpGlow,'hp_glow',obj.hp_glow,'range',null,'min="0" max="100" step="5"');
          if(['solid_fuel','pellet_modern','fireplace_modern'].includes(obj.variant)){
            markup+=(obj.variant==='solid_fuel'?field(L.solidFuel,'solid_fuel',obj.solid_fuel,'text',[['wood',L.solidWood],['coal',L.solidCoal]]):'')+
              (obj.variant==='pellet_modern'&&obj.pellet_test_mode?'':field(L.solidState,'solid_state',obj.solid_state,'text',[['auto',L.solidAuto],['burning',L.solidBurning],['embers',L.solidEmbers],['off',L.solidOff]]))+
              field(L.solidGlow,'solid_glow',obj.solid_glow,'range',null,'min="0" max="100" step="5"')+
              '<p class="ss-note">'+esc(L.solidHelp)+'</p>';
          }else if(obj.variant==='heatpump')markup+=field('Tryb pracy pompy (wizualizacja)','burner_mode',obj.burner_mode,'text',[['auto','Automatyczny'],['on','Pracuje — test'],['off','Wyłączona — test']]);
          else if(obj.variant!=='heatpump_modern')markup+=field(L.boilerState,'burner_mode',obj.burner_mode,'text',[['auto',L.flowAuto],['on',L.flowOn],['off',L.flowOff]]);
          if(obj.variant==='heatpump'){
            markup+=field('Encja pracy pompy ciepła','burner_entity',obj.burner_entity,'search',null,'list="ss-entity-list"');
            markup+=field('Próg startu animacji przy braku encji (°C)','burner_on_temp',obj.burner_on_temp,'number',null,'min="20" max="90" step="1"');
            markup+=field('Próg zakończenia animacji (°C)','burner_off_temp',obj.burner_off_temp,'number',null,'min="10" max="89" step="1"');
            markup+='<p class="ss-note">Progi sterują tylko animacją starszej grafiki, nie uruchamiają pompy.</p>';
          }else if(obj.variant!=='heatpump_modern'&&!(obj.variant==='pellet_modern'&&obj.pellet_test_mode)){
            markup+=field(L.burnerEntity,'burner_entity',obj.burner_entity,'search',null,'list="ss-entity-list"');
            markup+=field(L.burnerOnTemp,'burner_on_temp',obj.burner_on_temp,'number',null,'min="20" max="90" step="1"');
            markup+=field(L.burnerOffTemp,'burner_off_temp',obj.burner_off_temp,'number',null,'min="10" max="89" step="1"');
          }
        }
        if(obj.type==='solar'){
          markup+=field(L.solarPump,'pump_entity',obj.pump_entity,'search',null,'list="ss-entity-list"');
          markup+=field(L.solarTank,'tank_entity',obj.tank_entity,'search',null,'list="ss-entity-list"');
          markup+=field(L.solarOnDelta,'solar_on_delta',obj.solar_on_delta,'number',null,'min="1" max="40" step="0.5"');
          markup+=field(L.solarOffDelta,'solar_off_delta',obj.solar_off_delta,'number',null,'min="0" max="39" step="0.5"');
        }
        if(electrical)markup+='</section></details>';
        markup+='</section></details><details class="ss-section-details" data-section="entities"'+sectionAttr('entities')+'><summary>'+
           sectionIcon('mdi:chart-timeline-variant')+'<span>'+esc(L.entities)+'</span>'+sectionIcon('mdi:chevron-down')+
           '</summary><section>'+
          obj.entities.map((en,index)=>'<div class="ss-row">'+
            entityField(en.entity,'multiEntity',index)+
            '<button type="button" data-delete-entity="'+index+'">×</button></div>'+
            field(L.label,'multiLabel',en.label,'text',null,'data-index="'+index+'"')).join('')+
          '<button type="button" data-action="entity">'+esc(L.addEntity)+'</button></section></details>';
        if(obj.type==='tank'||obj.type==='solar'){
          const isModular=obj.type==='tank'&&obj.variant==='modular';
          markup+='<details class="ss-section-details" data-section="parts"'+sectionAttr('parts')+'><summary>'+
            sectionIcon('mdi:layers-outline')+'<span>'+esc(obj.type==='solar'?L.solarSensors:(L.internalParts||'Elementy wewnętrzne'))+
            '</span><span class="ss-part-count">'+obj.parts.length+'</span>'+sectionIcon('mdi:chevron-down')+'</summary>'+
            '<section><div class="ss-part-cards">'+obj.parts.map((item,index)=>
              '<div class="ss-part-card'+(item.id===getSelectedPartId()?' ss-part-active':'')+'">'+
              '<button type="button" class="ss-part-pick" data-select-part="'+esc(item.id)+'" aria-pressed="'+
                (item.id===getSelectedPartId()?'true':'false')+'" aria-expanded="'+(item.id===getExpandedPartId()?'true':'false')+'">'+
                sectionIcon(partIcons[item.kind]||'mdi:cube-outline')+
                '<span class="ss-part-caption"><strong>'+esc(item.label||((L[item.kind]||item.kind)+' '+(index+1)))+
                '</strong><small>'+esc(item.entity||((L[item.kind]||item.kind)+' · '+(index+1)))+'</small></span>'+
                sectionIcon(item.id===getExpandedPartId()?'mdi:chevron-up':'mdi:chevron-down')+
              '</button>'+
              (item.id!==getExpandedPartId()?'':'<div class="ss-part-fields">'+
                '<div class="ss-row ss-part-actions"><strong>'+esc((L[item.kind]||item.kind)+' '+(index+1))+
                (isModular?' · '+esc(L.partLayer)+' '+index:'')+'</strong>'+
                (isModular?'<button type="button" title="'+esc(L.partLayerDown)+'" aria-label="'+esc(L.partLayerDown)+'" data-layer-down="'+index+'"'+(index===0?' disabled':'')+'>↓</button>'+
                  '<button type="button" title="'+esc(L.partLayerUp)+'" aria-label="'+esc(L.partLayerUp)+'" data-layer-up="'+index+'"'+(index===obj.parts.length-1?' disabled':'')+'>↑</button>':'')+
                '<button type="button" aria-label="'+esc(L.remove)+'" data-delete-part="'+index+'">×</button></div>'+
                (obj.type==='solar'?'':field(L.graphic,'partKind',item.kind,'text',
                  (isModular?[['sensor',L.sensor],['heater',L.heater],['coil',L.coil],['baffle_horizontal',L.baffle_horizontal],['baffle_vertical',L.baffle_vertical],['inner_tank',L.inner_tank]]:[['sensor',L.sensor],['heater',L.heater],['coil',L.coil]]),'data-index="'+index+'"'))+
            field(L.visual,'partVariant',item.variant,'text',
              [['warmwasser','Warmwasser'],['compact',L.compact||'Compact'],['extended',L.extended||'Extended']],
              'data-index="'+index+'"')+
            field(L.side,'partSide',item.side,'text',sides,'data-index="'+index+'"')+
            (isModular?field(L.partX,'partX',item.x,'range',null,'min="0" max="100" data-index="'+index+'"'):'')+
            field(L.height,'partHeight',item.height,'number',null,
              'min="0" max="100" data-index="'+index+'"')+
            field(L.label,'partLabel',item.label,'text',null,'data-index="'+index+'"')+
            (isModular && item.kind==='sensor'?field(L.partContainer,'partContainer',item.container,'text', [['main',L.tank],['inner',L.inner_tank]],'data-index="'+index+'"'):'')+
            (isModular && item.kind==='heater'?field(L.heaterMode,'partMode',item.mode,'text',[['auto',L.flowAuto],['on',L.flowOn],['off',L.flowOff]],'data-index="'+index+'"')+field(L.heaterPower,'partPower',item.power,'range',null,'min="0" max="100" data-index="'+index+'"')+field(L.heaterWatts,'partPowerEntity',item.power_entity,'search',null,'list="ss-entity-list" data-index="'+index+'"'):'')+
            (isModular && ['coil','inner_tank'].includes(item.kind)?field(L.partLength,'partLength',item.length,'range',null,'min="15" max="95" data-index="'+index+'"'):'')+
            (isModular && ['heater','coil','inner_tank'].includes(item.kind)?field(L.partWidth,'partWidth',item.width,'range',null,'min="10" max="95" data-index="'+index+'"'):'')+
            (isModular && item.kind==='coil'?field(L.partTurns,'partTurns',item.turns,'number',null,'min="3" max="22" data-index="'+index+'"')+field(L.partFlowMode,'partFlowMode',item.flow_mode,'text',[['auto',L.flowAuto],['on',L.flowOn],['off',L.flowOff]],'data-index="'+index+'"')+field(L.flowDirection,'partFlowDirection',item.flow_direction,'text',[['forward',L.forward],['reverse',L.reverse]],'data-index="'+index+'"')+field(L.flowSpeed,'partFlowSpeed',item.flow_speed,'number',null,'min="0.35" max="5" step="0.1" data-index="'+index+'"'):'')+
            (isModular && item.kind.startsWith('baffle_')?field(L.permeability,'partPermeability',item.permeability,'range',null,'min="0" max="1" step="0.05" data-index="'+index+'"'):'')+
            (item.kind==='sensor'?field(L.sensorScale,'partDisplayScale',item.display_scale,'range',null,
              'min="0.5" max="2" step="0.1" data-index="'+index+'"'):'')+
            '<label>'+esc(L.entity)+entityField(item.entity,'partEntity',index)+'</label>'+
              '</div>')+'</div>'
            ).join('')+'</div>'+
          '<div class="ss-add-parts">'+(obj.type==='solar'?[['sensor',L.sensor]]:(isModular?[['sensor',L.sensor],['heater',L.heater],['coil',L.coil],['baffle_horizontal',L.baffle_horizontal],['baffle_vertical',L.baffle_vertical],['inner_tank',L.inner_tank]]:[['sensor',L.sensor],['heater',L.heater],['coil',L.coil]])).map(v=>
            '<button type="button" data-add-part="'+v[0]+'">+ '+esc(v[1])+'</button>').join('')+'</div></section></details>';
        }
      }else{
        const isHydraulic=obj.type==='hydraulic',s=obj.style,a=obj.animation;
        markup+='<p class="ss-note">'+(isHydraulic?'Rura hydrauliczna':'Przewód elektryczny')+
          ' — rodzaj wybiera się w bibliotece połączeń.</p>';
        markup+=field(L.pipeWidth,'style_width',s.width,'range',null,'min="2" max="14" step="1"');
        if(isHydraulic){
          markup+=field(L.pipeColor,'style_color',s.color,'text',colorsList);
          markup+=field(L.pipeStart,'style_cap_start',s.cap_start?'true':'false','text',[['true',L.yes],['false',L.no]]);
          markup+=field(L.pipeEnd,'style_cap_end',s.cap_end?'true':'false','text',[['true',L.yes],['false',L.no]]);
          markup+=field(L.flowMode||'Flow animation','anim_flow_mode',a.flow_mode,'text',
            [['off',L.flowOff||'Off'],['auto',L.flowAuto||'Controlled by entity'],['on',L.flowOn||'On (preview)']]);
          markup+=field(L.flowEntity||'Animation state entity','anim_flow_entity',a.flow_entity,'search',null,'list="ss-entity-list"');
        }else{
          const attachOptions=[['','Nieprzypięty']].concat(model.nodes.flatMap(n=>
            HASSStudioEnergyTopology.ports(n).map(p=>[n.id+':'+p.id,
              (n.label||n.id)+' / '+(p.label||p.id)+' ('+p.medium.toUpperCase()+')'])));
          markup+=field('Początek → port','energy_attach_start',
            obj.energy_start?.node_id?obj.energy_start.node_id+':'+obj.energy_start.port_id:'',
            'text',attachOptions);
          markup+=field('Koniec → port','energy_attach_end',
            obj.energy_end?.node_id?obj.energy_end.node_id+':'+obj.energy_end.port_id:'',
            'text',attachOptions);
          markup+=field('Animacja mocy','anim_flow_power_mode',a.flow_power_mode||'off','text',
            [['off','Wyłączona'],['ha','Pomiar mocy z HA'],['manual','Symulacja ręczna'],
             ['balance','Automatycznie z bilansu']]);
          if(a.flow_power_mode==='balance'){
            const flow=HASSStudioEnergyFlow.resolve(model,editor._hass).byConnection[obj.id];
            markup+='<p class="ss-note">Bilans: '+(flow?.available?
              esc(flow.kw.toFixed(3)+' kW · '+flow.source+' · '+flow.direction):
              esc(flow?.reason||'brak danych lub portów'))+'</p>';
          }
          if(a.flow_power_mode==='ha')
            markup+=field('Encja mocy (W/kW)','anim_flow_power_entity',a.flow_power_entity,'search',null,'list="ss-entity-list"');
          if(a.flow_power_mode==='manual')
            markup+=field('Moc testowa (kW)','anim_flow_power_kw',a.flow_power_kw,'number',null,'step="0.1"');
          if(a.flow_power_mode!=='off'){
            markup+=field('Moc maksymalna skali (kW)','anim_flow_max_kw',a.flow_max_kw,'number',null,'min="0.1" step="0.1"');
            markup+=field('Grubość animacji min','anim_flow_min_width',a.flow_min_width,'number',null,'min="0.5" max="12" step="0.5"');
            markup+=field('Grubość animacji max','anim_flow_max_width',a.flow_max_width,'number',null,'min="0.5" max="16" step="0.5"');
            markup+=field('Wzór przepływu','anim_flow_pattern',a.flow_pattern,'text',[['dots','Kropki'],['dashes','Kreski'],['arrows','Strzałki']]);
            markup+=field('Odwracanie przy ujemnej mocy','anim_flow_power_direction',a.flow_power_direction?'true':'false','text',[['true','Tak'],['false','Nie']]);
          }
        }
        markup+=field(L.flowDirection||'Flow direction','anim_flow_direction',a.flow_direction,'text',
          [['forward',L.forward||'Start → End'],['reverse',L.reverse||'End → Start']]);
        markup+=field(L.flowSpeed||'Animation duration (s)','anim_flow_speed',a.flow_speed,'number',null,'min="0.35" max="5" step="0.1"');
        markup+='<p>'+esc(L.pipeHelp)+'</p><div class="ss-row">'+
          '<button type="button" data-action="bend">+ '+esc(L.newBend)+'</button>'+
          '<button type="button" data-action="unbend">'+esc(L.removeBend)+'</button></div></section>';
        if(isHydraulic){
          markup+='<section><h4>'+esc(L.accessories)+'</h4>'+
            obj.accessories.map((a,index)=>
              '<div class="ss-row"><strong>'+esc(L[a.type]||a.type)+'</strong>'+
              '<button type="button" data-delete-accessory="'+index+'">×</button></div>'+
              field(L.accessoryPos,'accessoryPos',a.position,'range',null,
                'min="0" max="100" step="1" data-index="'+index+'"')+
              field(L.accessoryLabel,'accessoryLabel',a.label,'text',null,'data-index="'+index+'"')+
              '<label>'+esc(L.entity)+entityField(a.entity,'accessoryEntity',index)+'</label>'+
               field('Źródło stanu','accessoryMode',a.mode||'live','text',
                 [['live','Home Assistant'],['manual','Test ręczny']],'data-index="'+index+'"')+
               (a.mode==='manual'?(a.type==='pump'?
                 field('Pompa testowa','accessoryRunning',a.test_running?'true':'false','text',
                   [['false','Wyłączona'],['true','Włączona']],'data-index="'+index+'"')+
                 field('Czas animacji (s)','accessorySpeed',a.test_speed??1,'number',null,'min="0.35" max="5" step="0.1" data-index="'+index+'"'):
                 field('Pozycja testowa (%)','accessoryPosition',a.test_position??0,'number',null,'min="0" max="100" step="1" data-index="'+index+'"')):'')).join('')+
            '<div class="ss-add-parts"><button type="button" data-add-accessory="pump">+ '+esc(L.pump)+'</button>'+
            '<button type="button" data-add-accessory="valve">+ '+esc(L.valve)+'</button></div></section>';
        }
      }
      const scroll=properties.scrollTop;
      properties.innerHTML=markup+'<datalist id="ss-entity-list">'+entityList()+'</datalist>';
      properties.scrollTop=scroll;
      // Every entity field gets an HA-like search list from the first typed character.
      const popup=document.createElement('div');
      popup.className='ss-entities';popup.hidden=true;
      properties.appendChild(popup);
      const inputs=[...properties.querySelectorAll('input[list="ss-entity-list"]')];
      for(const input of inputs){
        const update=()=>{
          const search=input.value.trim().toLocaleLowerCase();
          if(!search){popup.hidden=true;return;}
          const matches=Object.entries(editor._hass?.states||{}).filter(([entity,state])=>
            entity.toLocaleLowerCase().includes(search)||
            String(state?.attributes?.friendly_name||'').toLocaleLowerCase().includes(search)).slice(0,25);
          popup.replaceChildren();
          for(const [entity,state] of matches){
            const button=document.createElement('button');
            button.type='button';button.className='ss-entity-choice';
            button.textContent=(state.attributes?.friendly_name||entity)+' — '+entity;
            button.addEventListener('click',()=>{input.value=entity;input.dispatchEvent(new Event('change',{bubbles:true}));popup.hidden=true;});
            popup.appendChild(button);
          }
          popup.hidden=!matches.length;
        };
        input.addEventListener('input',update);
        input.addEventListener('focus',update);
      }

    };
    return renderProps;
  };
  return Object.freeze({create});
})();
