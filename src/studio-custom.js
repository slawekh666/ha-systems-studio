/* Home Assistant Systems Studio - Custom Designer v0.3 (opt-in).
 * Based on Warmwasser Schema Card. The original automatic renderer stays intact.
 * No external dependencies or service calls in the designer.
 */
(() => {
  const W=1200,H=720,MAX_NODES=60,MAX_PIPES=80;
  const registry=HASSStudioDeviceRegistry;
  const types=registry.listTypes();
  const words={
    pl:{sensorScale:'Skala odczytu',accessoryLabel:'Podpis przy ikonie',boilerState:'Praca palnika / grzania',burnerEntity:'Encja palnika (opcjonalna; inaczej temperatura)',burnerOnTemp:'Kocioł aktywny powyżej (°C)',burnerOffTemp:'Kocioł nieaktywny poniżej (°C)',solarTank:'Temperatura zbiornika (do porównania)',solarOnDelta:'Kolektor aktywny – różnica (°C)',solarOffDelta:'Kolektor nieaktywny – różnica (°C)',solarSensors:'Czujniki kolektora',solarPump:'Encja pompy solarnej',pipeStart:'Króciec na początku',pipeEnd:'Króciec na końcu',yes:'Tak',no:'Nie',compact:'Kompaktowy',extended:'Rozbudowany',widthScale:'Szerokość',heightScale:'Wysokość',visual:'Wygląd grafiki',flowMode:'Animacja przepływu',flowOff:'Wyłączona',
      flowOn:'Włączona (podgląd)',flowAuto:'Według encji',flowDirection:'Kierunek przepływu',
      flowSpeed:'Czas animacji (s)',flowEntity:'Encja sterująca przepływem',
      forward:'Początek → koniec',reverse:'Koniec → początek',mode:'Tryb układu',auto:'Automatyczny (Warmwasser)',custom:'Własny układ',language:'Język',
      automatic:'Automatyczny',open:'Otwórz projektant',close:'Zamknij',add:'Dodaj',remove:'Usuń',
      library:'BIBLIOTEKA SVG',properties:'WŁAŚCIWOŚCI',canvas:'SCHEMAT',choose:'Zaznacz element na schemacie',
      name:'Nazwa',graphic:'Rodzaj / grafika',scale:'Skala',position:'Pozycja',entity:'Encja HA',
      entities:'Dodatkowe encje',sensors:'Elementy wewnętrzne',height:'Wysokość od dołu (%)',
      side:'Strona',left:'Lewa',right:'Prawa',inside:'Wewnątrz',sensor:'Czujnik',
      heater:'Grzałka',coil:'Wężownica',accessories:'Elementy na rurze',
      pump:'Pompa',valve:'Zawór',pipe:'Rura',pipeColor:'Rodzaj rury',pipeWidth:'Grubość',
      hot:'Ciepła woda',cold:'Zimna woda',solarFlow:'Obieg solarny',returnFlow:'Powrót',
      newBend:'Dodaj punkt załamania',removeBend:'Usuń ostatni punkt',
      pipeHelp:'Przeciągaj punkty rury. Dwuklik na rurze dodaje nowe załamanie.',
      accessoryPos:'Położenie na rurze (%)',editHelp:'Wybierz element po lewej i ustaw jego właściwości po prawej.',
      boiler:'Kotły',tank:'Zbiorniki',solar:'Solary',pumps:'Pompy',valves:'Zawory',sensorsMenu:'Czujniki',pipes:'Rury',
      link:'Przypisz encję',addEntity:'Dodaj encję',label:'Opis',default:'Domyślna',
      zoom:'Powiększenie',noValues:'Bez pomiaru',editor:'Projektant instalacji'},
    en:{sensorScale:'Reading scale',accessoryLabel:'Icon caption',boilerState:'Burner / heating state',burnerEntity:'Burner entity (optional; otherwise temperature)',burnerOnTemp:'Boiler on above (°C)',burnerOffTemp:'Boiler off below (°C)',solarTank:'Tank temperature (reference)',solarOnDelta:'Collector active – delta (°C)',solarOffDelta:'Collector inactive – delta (°C)',solarSensors:'Collector sensors',solarPump:'Solar pump entity',pipeStart:'Start connector',pipeEnd:'End connector',yes:'Yes',no:'No',compact:'Compact',extended:'Extended',widthScale:'Width',heightScale:'Height',visual:'Graphic style',flowMode:'Flow animation',flowOff:'Off',
      flowOn:'On (preview)',flowAuto:'Controlled by entity',flowDirection:'Flow direction',
      flowSpeed:'Animation duration (s)',flowEntity:'Flow control entity',
      forward:'Start → end',reverse:'End → start',mode:'Layout mode',auto:'Automatic (Warmwasser)',custom:'Custom layout',language:'Language',
      automatic:'Automatic',open:'Open designer',close:'Close',add:'Add',remove:'Delete',
      library:'SVG LIBRARY',properties:'PROPERTIES',canvas:'DIAGRAM',choose:'Select an element in the diagram',
      name:'Name',graphic:'Type / graphic',scale:'Scale',position:'Position',entity:'HA entity',
      entities:'Additional entities',sensors:'Internal components',height:'Height from bottom (%)',
      side:'Side',left:'Left',right:'Right',inside:'Inside',sensor:'Sensor',
      heater:'Heating element',coil:'Coil',accessories:'On-pipe equipment',
      pump:'Pump',valve:'Valve',pipe:'Pipe',pipeColor:'Pipe type',pipeWidth:'Width',
      hot:'Hot water',cold:'Cold water',solarFlow:'Solar circuit',returnFlow:'Return',
      newBend:'Add bend point',removeBend:'Remove last point',
      pipeHelp:'Drag pipe handles. Double-click the pipe to add a bend.',
      accessoryPos:'Position on pipe (%)',editHelp:'Pick a component on the left; configure it on the right.',
      boiler:'Boilers',tank:'Tanks',solar:'Solar',pumps:'Pumps',valves:'Valves',sensorsMenu:'Sensors',pipes:'Pipes',
      link:'Assign entity',addEntity:'Add entity',label:'Description',default:'Default',
      zoom:'Zoom',noValues:'No data',editor:'System diagram designer'}
  };
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{tankGlow:'Efekt cieplny grzałek (%)',heaterMode:'Stan grzałki',heaterPower:'Intensywność (%)',heaterWatts:'Encja mocy (W/kW)',partX:'Pozycja pozioma (%)',partLength:'Wysokość / długość (%)',partWidth:'Szerokość (%)',partTurns:'Liczba zwojów',permeability:'Przepuszczalność 0–1',partContainer:'Strefa czujnika',partFlowMode:'Przepływ wężownicy',baffle_horizontal:'Przegroda pozioma',baffle_vertical:'Przegroda pionowa',inner_tank:'Zbiornik wewnętrzny'}:{tankGlow:'Heater visual glow (%)',heaterMode:'Heater status',heaterPower:'Glow intensity (%)',heaterWatts:'Power entity (W/kW)',partX:'Horizontal position (%)',partLength:'Height / length (%)',partWidth:'Width (%)',partTurns:'Coil turns',permeability:'Permeability 0–1',partContainer:'Sensor compartment',partFlowMode:'Coil flow',baffle_horizontal:'Horizontal baffle',baffle_vertical:'Vertical baffle',inner_tank:'Inner tank'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{tankScaleMode:'Skalowanie zbiornika',tankScaleProportional:'Proporcjonalne',tankScaleFree:'Osobna szerokość i wysokość',tankWidthScale:'Szerokość zbiornika',tankHeightScale:'Wysokość zbiornika'}:{tankScaleMode:'Tank scaling',tankScaleProportional:'Proportional',tankScaleFree:'Independent width and height',tankWidthScale:'Tank width',tankHeightScale:'Tank height'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{partLayer:'Warstwa',partLayerUp:'Przenieś wyżej',partLayerDown:'Przenieś niżej'}:{partLayer:'Layer',partLayerUp:'Move up',partLayerDown:'Move down'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{solidModel:'Piec węgiel / drewno',solidFuel:'Rodzaj opału',solidWood:'Drewno',solidCoal:'Węgiel',solidState:'Stan paleniska (wizualizacja)',solidAuto:'Automatycznie wg encji / temperatury',solidBurning:'Palenie',solidEmbers:'Żarzenie',solidOff:'Wygaszenie',solidGlow:'Intensywność efektu (%)',solidHelp:'Animacja jest wizualna, bez sterowania urządzeniem. Encja stanu spalania ma pierwszeństwo nad progami temperatury.'}:{solidModel:'Wood / coal boiler',solidFuel:'Fuel type',solidWood:'Wood',solidCoal:'Coal',solidState:'Combustion state (visual only)',solidAuto:'Auto from entity / temperature',solidBurning:'Burning',solidEmbers:'Embers',solidOff:'Extinguished',solidGlow:'Effect intensity (%)',solidHelp:'Animation only, no device control. Combustion entity takes precedence over temperature thresholds.'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{solidWidth:'Szerokość pieca',solidHeight:'Wysokość pieca'}:{solidWidth:'Boiler width',solidHeight:'Boiler height'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{pelletModel:'Piec na pellet (nowoczesny)'}:{pelletModel:'Modern pellet boiler'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{hpModel:'Pompa ciepła (nowoczesna)',hpPower:'Encja poboru mocy (W/kW)',hpFan:'Encja prędkości wentylatora (%/RPM)',hpMaxRpm:'Maksymalne obroty (RPM)',hpGlow:'Podświetlenie (%)'}:{hpModel:'Modern heat pump',hpPower:'Electrical power entity (W/kW)',hpFan:'Fan speed entity (%/RPM)',hpMaxRpm:'Max fan speed (RPM)',hpGlow:'Glow (%)'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{gasModel:'Piec gazowy (nowoczesny)',gasDraw:'Encja modulacji palnika (%)',gasGlow:'Intensywność podświetlenia (%)',gasHelp:'Modulacja to procent mocy palnika, nie zmierzony przepływ gazu. Brak danych wyłącza płomień.'}:{gasModel:'Modern gas boiler',gasDraw:'Burner modulation entity (%)',gasGlow:'Lighting intensity (%)',gasHelp:'Modulation is burner load, not measured gas flow. Missing data disables the flame.'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{electricModel:'Piec elektryczny (nowoczesny)',electricPower:'Encja poboru mocy (W/kW)',electricLoad:'Encja obciążenia (%) — opcjonalna',electricMax:'Moc znamionowa pieca (kW)',electricGlow:'Podświetlenie (%)',electricHelp:'Bez osobnej encji % obciążenie wynika z poboru mocy / mocy znamionowej. Brak odczytu nie jest zastępowany wartością demo.'}:{electricModel:'Modern electric boiler',electricPower:'Electrical power entity (W/kW)',electricLoad:'Load entity (%) — optional',electricMax:'Rated boiler power (kW)',electricGlow:'Lighting (%)',electricHelp:'If no % entity is set, load derives from measured power divided by rated power. Missing data never uses demo values.'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{fireplaceModel:'Kominek (nowoczesny)',fireplaceHelp:'Ogień i żar są wizualizacją, automatyka zależy od encji lub temperatury.'}:{fireplaceModel:'Modern fireplace',fireplaceHelp:'Fire and embers are visual only; auto stage uses HA status or temperature.'});
  const colors={hot:'#ed835a',cold:'#57a6db',solar:'#e5b35e',return:'#778cbe'};
  const pickLang=(config,hass)=>{
    const setting=config?.studio_language;
    return setting==='pl'||setting==='en'?setting:
      (String(hass?.language||'').toLowerCase().startsWith('pl')?'pl':'en');
  };
  const clamp=(n,lo,hi,fallback)=>Number.isFinite(Number(n))?Math.max(lo,Math.min(hi,Number(n))):fallback;
  const validEntity=(value)=>typeof value==='string' && isEnt(value);
  const freshId=(prefix)=>prefix+Math.random().toString(36).slice(2,10);
  const normalized=HASSStudioLayout.normalized;
  const {canvasSvg,pipePath,onPipe,variantShape}=HASSStudioCanvas.create({
    W,H,colors,normalized,pickLang,words,clamp,validEntity,esc
  });
  const nativeRender=WarmwasserSchemaCard.prototype._render;
  WarmwasserSchemaCard.prototype._render=function(){
    if(this._cfg?.layout_mode!=='custom')return nativeRender.call(this);
    return '<div class="kopf"><div class="l"><div class="t1">'+esc(this._cfg.titel||'Home Assistant Systems Studio')+
      '</div></div></div>'+canvasSvg(this._cfg,this._hass);
  };
  // In automatic mode, retain the complete original Warmwasser settings.
  const nativeSchema=WarmwasserSchemaCardEditor.prototype._mainSchema;
  WarmwasserSchemaCardEditor.prototype._mainSchema=function(){
    const L=words[pickLang(this._config,this._hass)];
    return [F_('layout_mode',sel.opt([['automatic',L.auto],['custom',L.custom]])),...nativeSchema.call(this)];
  };
  const nativeSet=WarmwasserSchemaCardEditor.prototype.setConfig;
  WarmwasserSchemaCardEditor.prototype.setConfig=function(config){
    nativeSet.call(this,config);
    const mode=this._config?.layout_mode||'automatic';
    if(this._studioMode && mode!==this._studioMode)this._build();
  };
  const nativeFire=WarmwasserSchemaCardEditor.prototype._fire;
  WarmwasserSchemaCardEditor.prototype._fire=function(){
    const changed=this._studioMode && this._studioMode!==(this._config?.layout_mode||'automatic');
    nativeFire.call(this);
    if(changed)this._build();
  };
  const nativeBuild=WarmwasserSchemaCardEditor.prototype._build;
  WarmwasserSchemaCardEditor.prototype._build=function(){
    this._studioMode=this._config?.layout_mode||'automatic';
    if(this._studioMode!=='custom')return nativeBuild.call(this);
    this._forms=[]; // Keeps inherited setConfig from recreating the designer on every edit.
    this._renderStudioEditor();
  };
  WarmwasserSchemaCardEditor.prototype._renderStudioEditor=function(){
    if(!this.shadowRoot)this.attachShadow({mode:'open'});
    const root=this.shadowRoot;
    const L=words[pickLang(this._config,this._hass)];
    const langs=[['auto',L.automatic],['pl','Polski'],['en','English']];
    const opts=(options,selected)=>options.map(row=>
      '<option value="'+esc(row[0])+'"'+(row[0]===selected?' selected':'')+'>'+esc(row[1])+'</option>').join('');
    const style='<style>'+
      ':host{display:block;color:var(--primary-text-color)}'+
      '.ss-launch{display:flex;gap:10px;align-items:end;flex-wrap:wrap;padding:12px}'+
      '.ss-launch label,.ss-props label{display:flex;flex-direction:column;gap:5px;font-size:12px}'+
      '.ss-launch select,.ss-props input,.ss-props select,.ss-bar select{border:1px solid var(--divider-color,#555);background:var(--card-background-color,#29323c);color:var(--primary-text-color);border-radius:7px;padding:8px;min-width:0;box-sizing:border-box;width:100%}'+
      '.ss-launch button,.ss-bar button,.ss-library button,.ss-props button{color:var(--primary-text-color);background:var(--card-background-color,#29323c);border:1px solid var(--divider-color,#555);border-radius:8px;padding:9px;cursor:pointer;font:inherit}'+
      '.ss-launch button{background:var(--primary-color,#168bce);color:var(--text-primary-color,#fff)}'+
      '.ss-modal{position:fixed;inset:0;z-index:100000;background:var(--primary-background-color,#11191f);display:flex;flex-direction:column;padding:0;color:var(--primary-text-color)}'+
      '.ss-modal:not([open]){display:none}.ss-modal.ss-fullscreen{position:fixed;inset:0;width:100vw;height:100vh;max-width:none;max-height:none;border:0;margin:0;padding:0;box-sizing:border-box}'+
      '.ss-modal.ss-fullscreen::backdrop{background:#071018dd}.ss-modal.ss-fullscreen[open]{display:flex} .ss-bar{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--divider-color,#555);flex-wrap:wrap}'+
      '.ss-bar strong{margin-right:auto}.ss-bar button{white-space:nowrap}'+
      '.ss-grid{display:grid;grid-template-columns:var(--ss-left,180px) 7px minmax(0,1fr) 7px var(--ss-right,310px);flex:1;min-height:0;height:100%}'+
      '.ss-splitter{width:7px;cursor:col-resize;background:var(--divider-color,#44505b);opacity:.6;flex-shrink:0}'+
      '.ss-library,.ss-props{padding:12px;overflow-y:auto;border-right:1px solid var(--divider-color,#555)}'+
      '.ss-props{border-right:none;border-left:1px solid var(--divider-color,#555);min-width:0;overflow-x:hidden}'+
      '.ss-library h3,.ss-props h3{font-size:12px;letter-spacing:.06em;color:var(--secondary-text-color);margin:0 0 12px}'+
      '.ss-library button{display:flex;align-items:center;gap:12px;width:100%;margin-bottom:8px;text-align:left;font-size:13px}'+
      '.ss-library button span{font-size:19px;display:inline-block;width:24px;text-align:center}'+
      '.ss-canvas{min-width:0;min-height:0;overflow:auto;background:var(--secondary-background-color,#18222e);padding:16px}'+
      '.ss-stage{width:max-content;max-width:none}.ss-svg{display:block;width:1200px;height:720px;max-height:none;padding:0;touch-action:none}'+
      '.ss-svg-editor .ss-node{cursor:grab}.ss-svg-editor .ss-pipe-hit{cursor:pointer;pointer-events:stroke}.ss-handle{cursor:move}'+
      '.ss-svg-editor .ss-accessory{pointer-events:none}.ss-svg:not(.ss-svg-editor) .ss-pipe{pointer-events:none}'+
      '.ss-svg:not(.ss-svg-editor) [data-more]{cursor:pointer}'+
      '.ss-props section{border-top:1px solid var(--divider-color,#555);padding:12px 0;display:grid;grid-template-columns:minmax(0,1fr);min-width:0;gap:10px}'+
      '.ss-props section:first-of-type{border-top:0}.ss-props h4{margin:0;font-size:13px}'+
      '.ss-props p,.ss-note{font-size:12px;color:var(--secondary-text-color)}'+
      '.ss-props .ss-row{display:flex;align-items:center;gap:6px}.ss-props .ss-row>*{flex:1;min-width:0}'+
      '.ss-props .ss-row button{flex:0 0 auto}.ss-props input[type=range]{padding:0}'+
      '.ss-props label,.ss-props .ss-row{min-width:0}.ss-props .ss-row strong{overflow-wrap:anywhere}'+
      '.ss-props .ss-add-parts{display:flex;flex-wrap:wrap;gap:6px;min-width:0;width:100%}'+
      '.ss-props .ss-add-parts button{flex:0 1 auto;max-width:100%;white-space:normal;overflow-wrap:anywhere}'+
      '.ss-selected{outline:1px solid var(--primary-color)}'+
      '.ss-preview{border:1px solid var(--divider-color,#555);border-radius:8px;display:grid;place-items:center;padding:8px}'+
      '.ss-entities{max-height:210px;overflow-y:auto;border:1px solid var(--divider-color,#555);border-radius:8px}'+
      '.ss-entity-choice{width:100%;text-align:left;border:0;background:transparent;padding:8px;cursor:pointer;display:block;font-size:12px}'+
      '.ss-entity-choice:hover{background:var(--secondary-background-color)}'+
      '@media(max-width:900px){.ss-grid{grid-template-columns:110px minmax(230px,1fr) 220px}.ss-library button{font-size:11px;gap:4px}.ss-library button span{font-size:15px}}'+
      '</style>';
    root.innerHTML=style+
      '<div class="ss-launch"><label>'+esc(L.mode)+'<select id="ss-mode">'+opts([['automatic',L.auto],['custom',L.custom]],'custom')+'</select></label>'+
      '<label>'+esc(L.language)+'<select id="ss-lang">'+opts(langs,this._config.studio_language||'auto')+'</select></label>'+
      '<button type="button" id="ss-open">'+esc(L.open)+'</button></div>'+
      '<dialog class="ss-modal ss-fullscreen" id="ss-modal"><div class="ss-bar"><strong>'+esc(L.editor)+' · v'+esc(VERSION)+'</strong>'+
      '<label>'+esc(L.zoom)+' <select id="ss-zoom">'+opts([['0.65','65%'],['0.8','80%'],['1','100%'],['1.25','125%'],['1.5','150%']],'1')+'</select></label>'+
      '<button id="ss-delete" type="button">'+esc(L.remove)+'</button>'+
      '<button id="ss-close" type="button">'+esc(L.close)+'</button></div>'+
      '<div class="ss-grid" id="ss-grid"><aside class="ss-library"><h3>'+esc(L.library)+'</h3>'+
      types.map(type=>'<button type="button" data-add="'+type+'"><span aria-hidden="true">'+registry.iconFor(type)+'</span>'+
        esc(L[type==='pump'?'pumps':type==='valve'?'valves':type==='sensor'?'sensorsMenu':type==='pipe'?'pipes':type])+'</button>').join('')+
      '<button type="button" data-add-preset="solid_fuel"><span aria-hidden="true">♨</span>'+esc(L.solidModel)+'</button>'+
      '<button type="button" data-add-preset="pellet_modern"><span aria-hidden="true">♨</span>'+esc(L.pelletModel)+'</button>'+
      '<button type="button" data-add-preset="heatpump_modern"><span aria-hidden="true">◉</span>'+esc(L.hpModel)+'</button>'+
      '<button type="button" data-add-preset="gas_modern"><span aria-hidden="true">♨</span>'+esc(L.gasModel)+'</button>'+
      '<button type="button" data-add-preset="electric_modern"><span aria-hidden="true">⚡</span>'+esc(L.electricModel)+'</button>'+
      '<button type="button" data-add-preset="fireplace_modern"><span aria-hidden="true">♨</span>'+esc(L.fireplaceModel)+'</button>'+
      '</aside><div class="ss-splitter" data-split="left" role="separator" aria-label="Resize left panel"></div><main class="ss-canvas"><div id="ss-stage" class="ss-stage"></div>'+
      '<p class="ss-note">'+esc(L.editHelp)+'</p></main>'+
      '<div class="ss-splitter" data-split="right" role="separator" aria-label="Resize right panel"></div><aside class="ss-props" id="ss-props"><h3>'+esc(L.properties)+'</h3></aside></div></dialog>';
    const modal=root.getElementById('ss-modal'),stage=root.getElementById('ss-stage'),properties=root.getElementById('ss-props');
    const splitterGrid=root.getElementById('ss-grid');
    for(const grip of root.querySelectorAll('.ss-splitter')){
      grip.addEventListener('pointerdown',event=>{
        if(event.button!==0)return;
        grip.setPointerCapture(event.pointerId);
        const move=e=>{
          if(e.pointerId!==event.pointerId)return;
          const r=splitterGrid.getBoundingClientRect();
          const span=grip.dataset.split==='left'?e.clientX-r.left:r.right-e.clientX;
          splitterGrid.style.setProperty(grip.dataset.split==='left'?'--ss-left':'--ss-right',
            clamp(Math.round(span),110,500,200)+'px');
        };
        const end=()=>{grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',end);grip.removeEventListener('pointercancel',end);};
        grip.addEventListener('pointermove',move);
        grip.addEventListener('pointerup',end);
        grip.addEventListener('pointercancel',end);
      });
    }
    let selection=null,drag=null,zoom=1;
    const get=()=>normalized(this._config);
    const commit=(model)=>{
      this._config={...this._config,studio_layout:model};
      this._fire();
    };
    const selectedObject=(model)=>{
      if(!selection)return null;
      return selection.type==='node'?model.nodes.find(x=>x.id===selection.id):
        model.pipes.find(x=>x.id===selection.id);
    };
    const renderProps=HASSStudioEditorInspector.create({
      editor:this,L,properties,esc,opts,registry,pickLang,get,selectedObject,
      getSelection:()=>selection,variantShape
    });
    const render=()=>{
      stage.innerHTML=canvasSvg(this._config,this._hass,true,selection);
      stage.firstElementChild.style.width=(W*zoom)+'px';
      stage.firstElementChild.style.height=(H*zoom)+'px';
      renderProps();
    };
    const setSelected=(type,id)=>{
      selection={type,id};render();
    };
    const point=(ev,svg)=>{
      const p=svg.createSVGPoint();p.x=ev.clientX;p.y=ev.clientY;
      const transform=svg.getScreenCTM();
      return transform?p.matrixTransform(transform.inverse()):{x:0,y:0};
    };
    const repaint=(model)=>{
      const svg=stage.querySelector('svg');if(!svg)return;
      for(const node of model.nodes){
        const g=[...svg.querySelectorAll('.ss-node')].find(el=>el.dataset.id===node.id);
        if(g)g.setAttribute('transform','translate('+node.x+' '+node.y+') scale('+node.scale+')');
      }
      for(const pipe of model.pipes){
        const group=[...svg.querySelectorAll('.ss-pipe')].find(el=>el.dataset.id===pipe.id);
        if(!group)continue;
        const d=pipePath(pipe.points);
        group.querySelectorAll('path.ss-line,path.ss-pipe-hit').forEach(el=>el.setAttribute('d',d));
        group.querySelectorAll('.ss-cap').forEach(el=>{
          const first=el.dataset.cap==='start',pt=first?pipe.points[0]:pipe.points[pipe.points.length-1],
          near=first?pipe.points[1]:pipe.points[pipe.points.length-2];
          el.setAttribute('transform','translate('+pt.x+' '+pt.y+') rotate('+(Math.atan2(pt.y-near.y,pt.x-near.x)*180/Math.PI)+')');
        });
        svg.querySelectorAll('.ss-handle').forEach(el=>{
          if(el.dataset.id!==pipe.id)return;
          const p=pipe.points[Number(el.dataset.point)];
          if(p){el.setAttribute('cx',p.x);el.setAttribute('cy',p.y);}
        });
        svg.querySelectorAll('.ss-accessory[data-pipe="'+pipe.id+'"]').forEach((el,i)=>{
          const accessory=pipe.accessories[i];
          if(accessory){const p=onPipe(pipe,accessory.position);
            el.setAttribute('transform','translate('+p.x+' '+p.y+')');}
        });
      }
    };
    const create=(kind,preset='')=>{
      const model=get();
      if(kind==='pipe'){
        if(model.pipes.length>=MAX_PIPES)return;
        const n=model.pipes.length;
        const pipe={id:freshId('p'),label:'',color:'hot',width:7,
          flow_mode:'auto',flow_entity:'',flow_direction:'forward',flow_speed:1,cap_start:true,cap_end:true,
          points:[{x:180+n*10,y:120+n*12},{x:470+n*10,y:120+n*12}],accessories:[]};
        model.pipes.push(pipe);selection={type:'pipe',id:pipe.id};
      }else{
        if(model.nodes.length>=MAX_NODES)return;
        const n=model.nodes.length;
        const node={id:freshId('n'),type:kind,x:80+(n%6)*170,y:100+Math.floor(n/6)*170,
          scale:1,visual:'warmwasser',variant:kind==='boiler'&&registry.isVariant(kind,preset)?preset:registry.defaultVariant(kind),label:'',entity:'',burner_entity:'',burner_mode:'auto',solid_fuel:'wood',solid_state:'auto',solid_glow:78,hp_power_entity:'',hp_fan_entity:'',hp_max_rpm:1800,hp_glow:65,gas_draw_entity:'',gas_glow:62,electric_power_entity:'',electric_load_entity:'',electric_max_kw:8,electric_glow:60,pump_entity:'',tank_entity:'',solar_on_delta:6,solar_off_delta:3,burner_on_temp:35,burner_off_temp:32,entities:[],parts:[]};
        model.nodes.push(node);selection={type:'node',id:node.id};
      }
      commit(model);render();
    };
    root.getElementById('ss-open').addEventListener('click',()=>{
      if(typeof modal.showModal==='function')modal.showModal();
      else modal.setAttribute('open','');
      render();
    });
    const closeDesigner=()=>{
      if(typeof modal.close==='function'&&modal.open)modal.close();
      else modal.removeAttribute('open');
      drag=null;
    };
    root.getElementById('ss-close').addEventListener('click',closeDesigner);
    modal.addEventListener('cancel',()=>{drag=null;});

    root.getElementById('ss-mode').addEventListener('change',event=>{
      this._config={...this._config,layout_mode:event.target.value};this._fire();
    });
    root.getElementById('ss-lang').addEventListener('change',event=>{
      const open=modal.open;
      this._config={...this._config,studio_language:event.target.value};this._fire();this._build();
      if(open)this.shadowRoot.getElementById('ss-open')?.click();
    });
    root.getElementById('ss-zoom').addEventListener('change',event=>{
      zoom=Number(event.target.value)||1;render();
    });
    root.getElementById('ss-delete').addEventListener('click',()=>{
      if(!selection)return;
      const model=get();
      if(selection.type==='node')model.nodes=model.nodes.filter(n=>n.id!==selection.id);
      else model.pipes=model.pipes.filter(n=>n.id!==selection.id);
      selection=null;commit(model);render();
    });
    root.querySelectorAll('[data-add]').forEach(button=>button.addEventListener('click',()=>create(button.dataset.add)));
    root.querySelectorAll('[data-add-preset]').forEach(button=>button.addEventListener('click',()=>create('boiler',button.dataset.addPreset)));
    properties.addEventListener('change',event=>{
      const el=event.target,key=el.dataset.field;
      if(!key||!selection)return;
      const model=get(),obj=selectedObject(model);if(!obj)return;
      const index=Number(el.dataset.index);
      const val=el.value;
      if(key==='scale_mode'&&obj.type==='tank'&&obj.variant==='modular'){
        if(val==='free'&&obj.scale_mode!=='free'){
          obj.width_scale=clamp(obj.scale,0.5,2.4,1);
          obj.height_scale=clamp(obj.scale,0.5,2.4,1);
          obj.scale=1;
        }else if(val!=='free'&&obj.scale_mode==='free'){
          obj.scale=clamp(Math.sqrt(obj.width_scale*obj.height_scale),0.5,2.4,1);
          obj.width_scale=1;obj.height_scale=1;
        }
        obj.scale_mode=val==='free'?'free':'proportional';
      }else if(['width_scale','height_scale'].includes(key)&&obj.type==='tank'&&obj.variant==='modular'){
        if(obj.scale_mode!=='free'){
          obj.width_scale=obj.scale;
          obj.height_scale=obj.scale;
          obj.scale=1;
          obj.scale_mode='free';
        }
        obj[key]=clamp(val,.5,2.4,obj[key]);
      }else if(['width_scale','height_scale'].includes(key)&&obj.type==='boiler'&&['solid_fuel','pellet_modern','heatpump_modern','gas_modern','electric_modern','fireplace_modern'].includes(obj.variant)){
        // Independent from the proportional whole-node scale.
        obj[key]=clamp(val,.5,2.4,obj[key]);
      }else if(['x','y','scale','width','solid_glow','gas_glow','electric_glow','electric_max_kw','hp_glow','hp_max_rpm','flow_speed','burner_on_temp','burner_off_temp','solar_on_delta','solar_off_delta'].includes(key)){
        const min={scale:0.5,width_scale:0.5,height_scale:0.5,width:3,solid_glow:0,gas_glow:0,electric_glow:0,electric_max_kw:0.1,hp_glow:0,hp_max_rpm:100,flow_speed:0.35,burner_on_temp:20,burner_off_temp:10,solar_on_delta:1,solar_off_delta:0};
        const max={scale:2.4,width_scale:2.4,height_scale:2.4,width:14,solid_glow:100,gas_glow:100,electric_glow:100,electric_max_kw:100,hp_glow:100,hp_max_rpm:20000,flow_speed:5,burner_on_temp:90,burner_off_temp:89,solar_on_delta:40,solar_off_delta:39,x:W,y:H};
        obj[key]=clamp(val,min[key]??0,max[key],obj[key]);
      }else if(['label','variant','color','entity','visual','flow_mode','flow_direction','flow_entity','burner_entity','gas_draw_entity','electric_power_entity','electric_load_entity','hp_power_entity','hp_fan_entity','burner_mode','solid_fuel','solid_state','pump_entity','tank_entity','cap_start','cap_end'].includes(key)){
        if(['entity','flow_entity','burner_entity','gas_draw_entity','electric_power_entity','electric_load_entity','hp_power_entity','hp_fan_entity','pump_entity','tank_entity'].includes(key))obj[key]=validEntity(val)?val:'';
        else if(key==='burner_mode')obj.burner_mode=['auto','on','off'].includes(val)?val:'auto';
        else if(key==='solid_fuel')obj.solid_fuel=val==='coal'?'coal':'wood';
        else if(key==='solid_state')obj.solid_state=['auto','burning','embers','off'].includes(val)?val:'auto';
        else if(key==='cap_start'||key==='cap_end')obj[key]=val==='true';
        else if(key==='visual')obj.visual=val==='studio'?'studio':'warmwasser';
        else if(key==='flow_mode')obj.flow_mode=['on','off','auto'].includes(val)?val:'auto';
        else if(key==='flow_direction')obj.flow_direction=val==='reverse'?'reverse':'forward';
        else if(key==='variant')obj.variant=registry.isVariant(obj.type,val)?val:obj.variant;
        else if(key==='color')obj.color=colors[val]?val:obj.color;
        else obj.label=val.slice(0,64);
      }else if(key==='multiEntity'&&obj.entities[index])obj.entities[index].entity=validEntity(val)?val:'';
      else if(key==='multiLabel'&&obj.entities[index])obj.entities[index].label=val.slice(0,64);
      else if(key.startsWith('part')&&obj.parts?.[index]){
        const part=obj.parts[index];
        if(key==='partKind')part.kind=['sensor','heater','coil','baffle_horizontal','baffle_vertical','inner_tank'].includes(val)?val:part.kind;
        if(key==='partVariant')part.variant=['warmwasser','compact','extended'].includes(val)?val:part.variant;
        if(key==='partSide')part.side=['left','right','inside'].includes(val)?val:part.side;
        if(key==='partHeight')part.height=clamp(val,0,100,part.height);
        if(key==='partLabel')part.label=val.slice(0,64);
        if(key==='partDisplayScale')part.display_scale=clamp(val,0.5,2,part.display_scale);
        if(key==='partEntity')part.entity=validEntity(val)?val:'';
        if(key==='partPowerEntity')part.power_entity=validEntity(val)?val:'';
        if(key==='partContainer')part.container=val==='inner'?'inner':'main';
        if(key==='partMode')part.mode=['auto','on','off'].includes(val)?val:'auto';
        if(key==='partFlowMode')part.flow_mode=['auto','on','off'].includes(val)?val:'auto';
        if(key==='partFlowDirection')part.flow_direction=val==='reverse'?'reverse':'forward';
        for(const [fieldName,min,max] of [['X',0,100],['Length',15,95],['Width',10,95],['Turns',3,22],['Power',0,100],['Permeability',0,1],['FlowSpeed',.35,5]])if(key==='part'+fieldName){const property=fieldName==='FlowSpeed'?'flow_speed':fieldName==='Permeability'?'permeability':fieldName.toLowerCase();part[property]=clamp(val,min,max,part[property]);}
      }else if(key==='accessoryPos'&&obj.accessories[index])
        obj.accessories[index].position=clamp(val,0,100,50);
      else if(key==='accessoryEntity'&&obj.accessories[index])
        obj.accessories[index].entity=validEntity(val)?val:'';
      else if(key==='accessoryLabel'&&obj.accessories[index])
        obj.accessories[index].label=val.slice(0,64);
      commit(model);render();
    });
    properties.addEventListener('click',event=>{
      const button=event.target.closest('button');
      if(!button||!selection)return;
      const model=get(),obj=selectedObject(model);if(!obj)return;
      const index=Number(button.dataset.deletePart||button.dataset.deleteAccessory||button.dataset.deleteEntity);
      if(button.hasAttribute('data-layer-up')&&obj.parts){
        const i=Number(button.dataset.layerUp);
        if(i>=0&&i<obj.parts.length-1)[obj.parts[i],obj.parts[i+1]]=[obj.parts[i+1],obj.parts[i]];
        else return;
      }else if(button.hasAttribute('data-layer-down')&&obj.parts){
        const i=Number(button.dataset.layerDown);
        if(i>0&&i<obj.parts.length)[obj.parts[i],obj.parts[i-1]]=[obj.parts[i-1],obj.parts[i]];
        else return;
      }else if(button.hasAttribute('data-delete-part'))obj.parts.splice(index,1);
      else if(button.hasAttribute('data-delete-accessory'))obj.accessories.splice(index,1);
      else if(button.hasAttribute('data-delete-entity'))obj.entities.splice(index,1);
      else if(button.dataset.addPart){
        if(obj.parts.length>=40)return;
        const kind=obj.type==='solar'?'sensor':button.dataset.addPart;
        const sensorCount=obj.parts.filter(part=>part.kind==='sensor').length+1;
        obj.parts.push({id:freshId('i'),kind,label:obj.type==='solar'?'Kolektor':kind==='sensor'?'T'+sensorCount:'',
          side:obj.type==='solar'?'right':'left',height:obj.type==='solar'?80:50,
          display_scale:1,variant:'warmwasser',entity:'',x:50,length:58,width:60,turns:12,power:75,mode:'auto',flow_mode:'auto',flow_direction:'forward',flow_speed:1,permeability:kind==='baffle_horizontal'?.35:0,container:'main',power_entity:''});
      }else if(button.dataset.addAccessory){
        if(obj.accessories.length>=20)return;
        obj.accessories.push({id:freshId('a'),type:button.dataset.addAccessory,label:'',position:50,entity:''});
      }else if(button.dataset.action==='entity'){
        if(obj.entities.length>=20)return;
        obj.entities.push({label:'',entity:''});
      }else if(button.dataset.action==='bend'){
        if(obj.points.length>=30)return;
        const a=obj.points[obj.points.length-2],b=obj.points[obj.points.length-1];
        obj.points.splice(obj.points.length-1,0,{x:(a.x+b.x)/2,y:(a.y+b.y)/2+40});
      }else if(button.dataset.action==='unbend'){
        if(obj.points.length<=2)return;
        obj.points.splice(obj.points.length-2,1);
      }else return;
      commit(model);render();
    });
    stage.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;
      const hit=event.target.closest?.('.ss-handle');
      if(hit){
        selection={type:'pipe',id:hit.dataset.id};
        drag={type:'point',id:hit.dataset.id,index:Number(hit.dataset.point),pointer:event.pointerId};
      }else{
        const node=event.target.closest?.('.ss-node');
        if(node){
          selection={type:'node',id:node.dataset.id};
          const model=get(),obj=selectedObject(model),svg=stage.querySelector('svg'),p=point(event,svg);
          if(!obj)return;
          drag={type:'node',id:obj.id,offsetX:p.x-obj.x,offsetY:p.y-obj.y,pointer:event.pointerId};
        }else{
          const pipe=event.target.closest?.('.ss-pipe');
          if(pipe){setSelected('pipe',pipe.dataset.id);return;}
          selection=null;render();return;
        }
      }
      stage.querySelector('svg')?.setPointerCapture(event.pointerId);
      renderProps();
    });
    stage.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.pointer)return;
      const svg=stage.querySelector('svg'),model=get(),p=point(event,svg);
      if(drag.type==='node'){
        const n=model.nodes.find(item=>item.id===drag.id);if(!n)return;
        n.x=clamp(Math.round((p.x-drag.offsetX)/5)*5,0,W-120,n.x);
        n.y=clamp(Math.round((p.y-drag.offsetY)/5)*5,0,H-140,n.y);
      }else{
        const pipe=model.pipes.find(item=>item.id===drag.id);
        if(!pipe||!pipe.points[drag.index])return;
        pipe.points[drag.index]={x:clamp(Math.round(p.x/5)*5,0,W,0),
          y:clamp(Math.round(p.y/5)*5,0,H,0)};
      }
      this._config={...this._config,studio_layout:model};repaint(model);
    });
    const end=event=>{
      if(!drag||event.pointerId!==drag.pointer)return;
      drag=null;commit(get());render();
    };
    stage.addEventListener('pointerup',end);
    stage.addEventListener('pointercancel',end);
    stage.addEventListener('dblclick',event=>{
      const el=event.target.closest?.('.ss-pipe');if(!el)return;
      const model=get(),pipe=model.pipes.find(item=>item.id===el.dataset.id);
      if(!pipe||pipe.points.length>=30)return;
      const p=point(event,stage.querySelector('svg'));
      let index=1,best=Infinity;
      for(let i=1;i<pipe.points.length;i++){
        const a=pipe.points[i-1],b=pipe.points[i];
        const vx=b.x-a.x,vy=b.y-a.y,length=vx*vx+vy*vy;
        const t=length?clamp(((p.x-a.x)*vx+(p.y-a.y)*vy)/length,0,1,0):0;
        const distance=Math.hypot(p.x-(a.x+vx*t),p.y-(a.y+vy*t));
        if(distance<best){best=distance;index=i;}
      }
      pipe.points.splice(index,0,{x:clamp(p.x,0,W,p.x),y:clamp(p.y,0,H,p.y)});
      selection={type:'pipe',id:pipe.id};commit(model);render();
    });
    renderProps();
  };
})();