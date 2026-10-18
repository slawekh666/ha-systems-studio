/* Home Assistant Systems Studio - Custom Designer v0.3 (opt-in).
 * Based on Warmwasser Schema Card. The original automatic renderer stays intact.
 * No external dependencies or service calls in the designer.
 */
(() => {
  const W=1200,H=720,MAX_NODES=60,MAX_CONNECTIONS=80;
  const viewport=HASSStudioViewport;
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
      pump:'Pompa',valve:'Zawór',connection:'Rura',pipeColor:'Rodzaj rury',pipeWidth:'Grubość',
      hot:'Ciepła woda',cold:'Zimna woda',solarFlow:'Obieg solarny',returnFlow:'Powrót',
      newBend:'Dodaj punkt załamania',removeBend:'Usuń ostatni punkt',
      pipeHelp:'Przeciągnij linię, aby przesunąć całą rurę. Przeciągnij punkt, aby zmienić jej kształt. Dwuklik dodaje załamanie.',
      accessoryPos:'Położenie na rurze (%)',editHelp:'Wybierz element po lewej i ustaw jego właściwości po prawej.',
      boiler:'Kotły',tank:'Zbiorniki',solar:'Solary',pumps:'Pompy',valves:'Zawory',sensorsMenu:'Czujniki',connections:'Rury',
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
      heater:'Heating element',coil:'Coil',accessories:'On-connection equipment',
      pump:'Pump',valve:'Valve',connection:'Pipe',pipeColor:'Pipe type',pipeWidth:'Width',
      hot:'Hot water',cold:'Cold water',solarFlow:'Solar circuit',returnFlow:'Return',
      newBend:'Add bend point',removeBend:'Remove last point',
      pipeHelp:'Drag the connection line to move the whole connection. Drag a handle to change its shape. Double-click to add a bend.',
      accessoryPos:'Position on connection (%)',editHelp:'Pick a component on the left; configure it on the right.',
      boiler:'Boilers',tank:'Tanks',solar:'Solar',pumps:'Pumps',valves:'Valves',sensorsMenu:'Sensors',connections:'Pipes',
      link:'Assign entity',addEntity:'Add entity',label:'Description',default:'Default',
      zoom:'Zoom',noValues:'No data',editor:'System diagram designer'}
  };
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{canvasSettings:'Ustawienia schematu',schemeName:'Nazwa schematu (opcjonalna)',canvasWidth:'Szerokość',canvasHeight:'Wysokość',apply:'Zastosuj',fit:'Dopasuj schemat',all:'Pokaż wszystkie',help:'Skróty klawiaturowe',undo:'Cofnij',redo:'Ponów',shortcutTitle:'Sterowanie edytorem',shortcutHint:'Skróty nie działają podczas pisania w polach formularzy.',outside:'Zmniejszenie obszaru nie usuwa urządzeń ani rur.'}:{canvasSettings:'Diagram settings',schemeName:'Diagram name (optional)',canvasWidth:'Width',canvasHeight:'Height',apply:'Apply',fit:'Fit diagram',all:'Show all',help:'Keyboard shortcuts',undo:'Undo',redo:'Redo',shortcutTitle:'Editor controls',shortcutHint:'Shortcuts are disabled while editing form fields.',outside:'Shrinking the canvas does not remove devices or connections.'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{tankGlow:'Efekt cieplny grzałek (%)',heaterMode:'Stan grzałki',heaterPower:'Intensywność (%)',heaterWatts:'Encja mocy (W/kW)',partX:'Pozycja pozioma (%)',partLength:'Wysokość / długość (%)',partWidth:'Szerokość (%)',partTurns:'Liczba zwojów',permeability:'Przepuszczalność 0–1',partContainer:'Strefa czujnika',partFlowMode:'Przepływ wężownicy',baffle_horizontal:'Przegroda pozioma',baffle_vertical:'Przegroda pionowa',inner_tank:'Zbiornik wewnętrzny'}:{tankGlow:'Heater visual glow (%)',heaterMode:'Heater status',heaterPower:'Glow intensity (%)',heaterWatts:'Power entity (W/kW)',partX:'Horizontal position (%)',partLength:'Height / length (%)',partWidth:'Width (%)',partTurns:'Coil turns',permeability:'Permeability 0–1',partContainer:'Sensor compartment',partFlowMode:'Coil flow',baffle_horizontal:'Horizontal baffle',baffle_vertical:'Vertical baffle',inner_tank:'Inner tank'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{tankScaleMode:'Skalowanie zbiornika',tankScaleProportional:'Proporcjonalne',tankScaleFree:'Osobna szerokość i wysokość',tankWidthScale:'Szerokość zbiornika',tankHeightScale:'Wysokość zbiornika'}:{tankScaleMode:'Tank scaling',tankScaleProportional:'Proportional',tankScaleFree:'Independent width and height',tankWidthScale:'Tank width',tankHeightScale:'Tank height'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{partLayer:'Warstwa',partLayerUp:'Przenieś wyżej',partLayerDown:'Przenieś niżej'}:{partLayer:'Layer',partLayerUp:'Move up',partLayerDown:'Move down'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{solidModel:'Piec węgiel / drewno',solidFuel:'Rodzaj opału',solidWood:'Drewno',solidCoal:'Węgiel',solidState:'Stan paleniska (wizualizacja)',solidAuto:'Automatycznie wg encji / temperatury',solidBurning:'Palenie',solidEmbers:'Żarzenie',solidOff:'Wygaszenie',solidGlow:'Intensywność efektu (%)',solidHelp:'Animacja jest wizualna, bez sterowania urządzeniem. Encja stanu spalania ma pierwszeństwo nad progami temperatury.'}:{solidModel:'Wood / coal boiler',solidFuel:'Fuel type',solidWood:'Wood',solidCoal:'Coal',solidState:'Combustion state (visual only)',solidAuto:'Auto from entity / temperature',solidBurning:'Burning',solidEmbers:'Embers',solidOff:'Extinguished',solidGlow:'Effect intensity (%)',solidHelp:'Animation only, no device control. Combustion entity takes precedence over temperature thresholds.'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{solidWidth:'Szerokość pieca',solidHeight:'Wysokość pieca'}:{solidWidth:'Boiler width',solidHeight:'Boiler height'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{pelletModel:'Piec na pellet (nowoczesny)'}:{pelletModel:'Modern pellet boiler'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{
    pelletLevelEntity:'Encja poziomu pelletu (%)',pelletLevelMode:'Źródło poziomu pelletu',
    pelletLevelHA:'Home Assistant',pelletLevelManual:'Ręczny / testowy',
    pelletLevelTest:'Poziom ręczny (%)',pelletAlarm:'Alarm przy poziomie ≤ (%)'
  }:{
    pelletLevelEntity:'Pellet level entity (%)',pelletLevelMode:'Pellet level source',
    pelletLevelHA:'Home Assistant',pelletLevelManual:'Manual / test',
    pelletLevelTest:'Manual level (%)',pelletAlarm:'Alarm at or below (%)'
  });
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
  const {canvasSvg,connectionPath,onConnection,variantShape,translateConnectionPoints}=HASSStudioCanvas.create({
    W,H,colors,normalized,pickLang,words,clamp,validEntity,esc
  });
  // Card viewer: fit entire scheme at every responsive width, only zoom after explicit interaction.
  const nativeRender=WarmwasserSchemaCard.prototype._render;
  const nativeUpdate=WarmwasserSchemaCard.prototype._update;
  WarmwasserSchemaCard.prototype._render=function(){
    if(this._cfg?.layout_mode!=='custom')return nativeRender.call(this);
    const {width,height}=viewport.dimensions(this._cfg);
    const L=words[pickLang(this._cfg,this._hass)];
    const schemeName=String(this._cfg.studio_layout?.name||'').trim().slice(0,64);
    const label=esc('Home Assistant System Studio')+(schemeName?' - '+esc(schemeName):'');
    const viewerCss='<style>'+
      '.ss-card-viewport{position:relative;display:flex;flex-direction:column;width:100%;aspect-ratio:'+width+'/'+height+';min-height:0;overflow:hidden;background:var(--secondary-background-color,#17222d);touch-action:pan-y;user-select:none}'+
      '.ss-card-viewport svg{display:block;flex:1 1 auto;min-height:0;width:100%;height:100%;max-width:none;max-height:none;touch-action:none}'+
      '.ss-card-viewport:fullscreen{width:100vw;height:100vh;aspect-ratio:auto;background:#17222d;touch-action:none}'+
      '.ss-card-viewport:fullscreen svg{touch-action:none}'+
      HASSStudioEnergyDiagnostics.styles+
      '.ss-card-header{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:nowrap;padding:8px 12px;background:var(--card-background-color,#1c1c1c)}'+
      '.ss-card-header .ss-card-title{font-size:16px;font-weight:600;color:var(--primary-text-color);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
      '.ss-card-header .ss-view-tools{display:flex;align-items:center;gap:4px;flex-shrink:0}'+
      '.ss-view-tools button{appearance:none;background:var(--secondary-background-color,#293949);border:1px solid var(--divider-color,#53677c);border-radius:5px;color:var(--primary-text-color,#fff);min-width:28px;min-height:28px;padding:3px;cursor:pointer;font:600 14px sans-serif}'+
      '.ss-view-tools button:focus-visible{outline:2px solid #52bfff}'+
      '.ss-card-viewport:fullscreen{display:flex;flex-direction:column}'+
      '.ss-card-viewport:fullscreen .ss-card-header{flex:0 0 auto}'+
      '.ss-card-viewport:fullscreen svg{flex:1 1 auto;min-height:0}'+
      '@media(max-width:600px){.ss-card-header{gap:4px;padding:6px}.ss-card-header .ss-card-title{font-size:12px}.ss-view-tools{gap:2px}.ss-view-tools button{min-width:27px;min-height:27px}}'+
      '</style>';
    return viewerCss+'<div class="ss-card-viewport" id="ss-card-viewport" tabindex="0" aria-label="'+esc(L.editor)+'">'+
      '<div class="ss-card-header"><div class="ss-card-title">'+label+'</div><div class="ss-view-tools">'+
      '<button type="button" data-view-action="out" title="Zoom −" aria-label="Zoom out">−</button>'+
      '<button type="button" data-view-action="in" title="Zoom +" aria-label="Zoom in">+</button>'+
      '<button type="button" data-view-action="fit" title="Dopasuj cały schemat" aria-label="Fit diagram">⤢</button>'+
      '<button type="button" data-view-action="full" title="Pełny ekran" aria-label="Fullscreen">⛶</button></div></div>'+
      canvasSvg(this._cfg,this._hass)+
      HASSStudioEnergyDiagnostics.render(this._cfg,this._hass,pickLang(this._cfg,this._hass),'viewer')+'</div>';
  };
  const updateCardCamera=function(){
    const view=this._box?.querySelector('#ss-card-viewport'),svg=view?.querySelector('svg');
    if(!svg)return;
    const {width,height}=viewport.dimensions(this._cfg);
    const rect=svg.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height);
    if(!this._studioCardCamera || this._studioCardShape!==width+'x'+height){
      this._studioCardCamera=viewport.fresh(width,height);
      this._studioCardShape=width+'x'+height;
    }
    const box=viewport.box(this._studioCardCamera,w,h,width,height);
    svg.setAttribute('viewBox',[box.x,box.y,box.width,box.height].join(' '));
    svg.setAttribute('preserveAspectRatio','none');
    // The diagram must own touch input before the first pinch, at ALL zooms.
    // Only the header/non-drawing area retains dashboard vertical scrolling.
    const fullscreen=typeof document!=='undefined'&&document.fullscreenElement===view;
    const viewTouchMode=fullscreen?'none':'pan-y';
    if(view.style.touchAction!==viewTouchMode)view.style.touchAction=viewTouchMode;
    if(svg.style.touchAction!=='none')svg.style.touchAction='none';
    if(this._studioCardResizeTarget!==view){
      this._studioCardObserver?.disconnect();
      if(typeof ResizeObserver!=='undefined'){
        this._studioCardObserver=new ResizeObserver(()=>updateCardCamera.call(this));
        this._studioCardObserver.observe(view);
      }
      this._studioCardResizeTarget=view;
    }
  };
  WarmwasserSchemaCard.prototype._update=function(){
    nativeUpdate.call(this);
    if(this._cfg?.layout_mode!=='custom')return;
    const root=this.shadowRoot;
    if(root&&!this._studioViewerDispose){
      this._studioViewerDispose=HASSStudioViewerGestures.install({
        root,host:this,viewport,
        getView:()=>root.getElementById('ss-card-viewport'),
        getDimensions:()=>viewport.dimensions(this._cfg),
        getCamera:()=>this._studioCardCamera,
        setCamera:camera=>{this._studioCardCamera=camera;updateCardCamera.call(this);}
      });
    }
    updateCardCamera.call(this);
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
      '.ss-grid{display:grid;grid-template-columns:var(--ss-left,220px) 7px minmax(0,1fr) 7px var(--ss-right,310px);flex:1;min-height:0;height:100%}'+
      '.ss-splitter{width:7px;cursor:col-resize;background:var(--divider-color,#44505b);opacity:.6;flex-shrink:0}'+
      '.ss-library,.ss-props{padding:12px;overflow-y:auto;border-right:1px solid var(--divider-color,#555)}'+
      '.ss-props{border-right:none;border-left:1px solid var(--divider-color,#555);min-width:0;overflow-x:hidden}'+
      '.ss-library h3,.ss-props h3{font-size:12px;letter-spacing:.06em;color:var(--secondary-text-color);margin:0 0 12px}'+
      '.ss-library button{display:flex;align-items:center;gap:12px;width:100%;margin-bottom:8px;text-align:left;font-size:13px}'+
      '.ss-library ha-icon{display:inline-flex;align-items:center;justify-content:center;flex:0 0 20px;width:20px;height:20px;--mdc-icon-size:20px;color:var(--secondary-text-color,#9eacbb)}'+
       '.ss-library .ss-lib-chevron{flex:0 0 16px;width:16px;height:16px;--mdc-icon-size:16px;transition:transform .15s}'+
       '.ss-lib-group:not([open])>summary .ss-lib-chevron,.ss-lib-subgroup:not([open])>summary .ss-lib-chevron{transform:rotate(-90deg)}'+
       '.ss-library summary::-webkit-details-marker{display:none}.ss-library summary{list-style:none}'+
      '.ss-library .ss-lib-group{border:1px solid var(--divider-color,#555);border-radius:8px;margin:0 0 8px;overflow:hidden}'+
      '.ss-library .ss-lib-group>summary,.ss-library .ss-lib-subgroup>summary{cursor:pointer;display:flex;align-items:center;gap:8px;padding:10px 8px;font-size:12px;font-weight:600;min-width:0}'+
      '.ss-library .ss-lib-group>summary{background:var(--secondary-background-color,#18222e)}'+
      '.ss-library .ss-lib-subgroup{margin:4px 0 8px;border-left:1px solid var(--divider-color,#555);padding-left:3px}'+
       '.ss-library .ss-lib-title{flex:1;min-width:0;overflow-wrap:anywhere}'+
      '.ss-library .ss-lib-subgroup>summary{font-size:11px;padding:8px}'+
      '.ss-library .ss-lib-contents{padding:6px}'+
      '.ss-library .ss-lib-count{color:var(--secondary-text-color);font-weight:400}'+
      '.ss-library button.ss-lib-item{gap:8px;padding:8px 6px;margin:0 0 4px;border-color:transparent;background:transparent;white-space:normal}'+
      '.ss-library button.ss-lib-item:hover,.ss-library button.ss-lib-item:focus-visible{background:var(--secondary-background-color,#18222e);border-color:var(--primary-color,#168bce)}'+
      '.ss-library .ss-lib-label{font-size:12px;line-height:1.3;display:block;min-width:0;flex:1;overflow-wrap:anywhere}'+
      '.ss-library .ss-lib-icon{flex:0 0 20px}'+
      '.ss-library-search{width:100%;box-sizing:border-box;border:1px solid var(--divider-color,#555);border-radius:7px;padding:9px;margin-bottom:9px;background:var(--card-background-color,#29323c);color:var(--primary-text-color)}'+
      '.ss-lib-results[hidden],.ss-lib-catalog[hidden],.ss-lib-recent[hidden]{display:none}.ss-lib-recent{padding:7px;border:1px solid var(--divider-color,#555);border-radius:8px;margin-bottom:9px}.ss-lib-recent strong,.ss-lib-results strong{display:block;font-size:12px;margin-bottom:7px}'+
      '.ss-canvas{position:relative;min-width:0;min-height:0;overflow:hidden;background:#101820;padding:0;outline:0;touch-action:none}'+
      '.ss-stage{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:default}'+
      '.ss-svg{display:block;width:100%;height:100%;max-width:none;max-height:none;padding:0;touch-action:none;background:#101820}'+
      '.ss-settings,.ss-help{position:absolute;top:60px;right:15px;z-index:15;background:var(--card-background-color,#263340);border:1px solid var(--divider-color,#64768c);box-shadow:0 12px 35px #0009;border-radius:9px;padding:16px;width:min(340px,calc(100vw - 35px));max-height:calc(100vh - 90px);overflow:auto}'+
      '.ss-settings[hidden],.ss-help[hidden]{display:none}'+
      '.ss-settings label{display:grid;gap:5px;font-size:12px;margin-bottom:10px}'+
      '.ss-settings input{width:100%;box-sizing:border-box;padding:8px;border-radius:7px;background:var(--secondary-background-color,#18222e);color:var(--primary-text-color);border:1px solid var(--divider-color,#555)}'+
      '.ss-help table{width:100%;border-collapse:collapse;font-size:12px}.ss-help td{padding:7px 5px;border-bottom:1px solid var(--divider-color,#555)}'+
      '.ss-help kbd{font:inherit;background:var(--secondary-background-color,#18222e);border:1px solid #53667a;padding:2px 5px;border-radius:4px}'+
      '.ss-bar .ss-viewport-buttons{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.ss-bar .ss-viewport-buttons button{padding:7px 10px}'+
      '.ss-svg-editor .ss-node,.ss-svg-editor .ss-connection-hit,.ss-handle{cursor:default}.ss-svg-editor .ss-connection-hit{pointer-events:stroke}.ss-stage.ss-dragging,.ss-stage.ss-dragging *{cursor:grabbing!important}'+
      '.ss-svg-editor .ss-accessory{pointer-events:none}.ss-svg:not(.ss-svg-editor) .ss-connection{pointer-events:none}'+
      '.ss-svg:not(.ss-svg-editor) [data-more]{cursor:pointer}'+
      '.ss-props section{border-top:1px solid var(--divider-color,#555);padding:12px 0;display:grid;grid-template-columns:minmax(0,1fr);min-width:0;gap:10px}'+
      '.ss-props section:first-of-type{border-top:0}.ss-props h4{margin:0;font-size:13px}'+
      '.ss-props p,.ss-note{font-size:12px;color:var(--secondary-text-color)}'+
      '.ss-props .ss-row{display:flex;align-items:center;gap:6px}.ss-props .ss-row>*{flex:1;min-width:0}'+
      '.ss-props .ss-row button{flex:0 0 auto}.ss-props input[type=range]{padding:0}'+
      '.ss-props label,.ss-props .ss-row{min-width:0}.ss-props .ss-row strong{overflow-wrap:anywhere}'+
      '.ss-props .ss-add-parts{display:flex;flex-wrap:wrap;gap:6px;min-width:0;width:100%}'+
      '.ss-props .ss-add-parts button{flex:0 1 auto;max-width:100%;white-space:normal;overflow-wrap:anywhere}'+
      '.ss-part-list{display:flex;flex-direction:column;gap:4px;max-height:210px;overflow-y:auto}'+
      '.ss-props button.ss-part-pick{text-align:left;padding:8px;white-space:normal;overflow-wrap:anywhere;font-size:12px}'+
      '.ss-inspector-heading{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:600;margin-bottom:12px;overflow-wrap:anywhere}'+
       '.ss-inspector-heading ha-icon{--mdc-icon-size:22px;color:var(--primary-color,#168bce)}'+
       '.ss-section-details{border:1px solid var(--divider-color,#555);border-radius:9px;margin-bottom:10px;overflow:hidden}'+
       '.ss-section-details>summary{display:flex;align-items:center;gap:8px;list-style:none;padding:11px;cursor:pointer;background:var(--secondary-background-color,#18222e);font-weight:600;font-size:12px}'+
       '.ss-section-details>summary::-webkit-details-marker{display:none}'+
       '.ss-section-details>summary span:first-of-type{flex:1}'+
       '.ss-section-details>summary ha-icon{--mdc-icon-size:18px;width:18px;height:18px;color:var(--secondary-text-color)}'+
       '.ss-section-details:not([open])>summary ha-icon:last-child{transform:rotate(-90deg)}'+
       '.ss-section-details>section{border:0;padding:10px;gap:10px}'+
       '.ss-part-count{color:var(--secondary-text-color);font-weight:400}'+
       '.ss-part-cards{display:grid;gap:6px}'+
       '.ss-part-card{border:1px solid var(--divider-color,#555);border-radius:8px;overflow:hidden;min-width:0}'+
       '.ss-part-card.ss-part-active{border-color:var(--primary-color,#168bce)}'+
       '.ss-props button.ss-part-pick{display:flex;align-items:center;gap:8px;text-align:left;width:100%;border:0;border-radius:0;background:var(--card-background-color,#29323c)}'+
       '.ss-part-pick ha-icon{--mdc-icon-size:18px;flex:0 0 18px;color:var(--secondary-text-color)}'+
       '.ss-part-caption{display:flex;flex-direction:column;flex:1;min-width:0;gap:3px;overflow-wrap:anywhere}'+
       '.ss-part-caption small{font-size:10px;color:var(--secondary-text-color)}'+
       '.ss-part-fields{display:grid;gap:10px;padding:10px;border-top:1px solid var(--divider-color,#555)}'+
       '.ss-part-actions strong{font-size:11px}'+
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
      '<label>'+esc(L.zoom)+' <select id="ss-zoom">'+opts([['0.25','25%'],['0.5','50%'],['0.65','65%'],['0.8','80%'],['1','100%'],['1.25','125%'],['1.5','150%'],['2','200%'],['4','400%']],'1')+'</select></label>'+
       '<div class="ss-viewport-buttons">'+
       '<button id="ss-fit" type="button" title="'+esc(L.fit)+'">⤢ '+esc(L.fit)+'</button>'+
       '<button id="ss-all" type="button" title="'+esc(L.all)+'">▣</button>'+
       '<button id="ss-undo" type="button" title="'+esc(L.undo)+'">↶</button>'+
       '<button id="ss-redo" type="button" title="'+esc(L.redo)+'">↷</button>'+
       '<button id="ss-size" type="button" title="'+esc(L.canvasSettings)+'">⚙</button>'+
       '<button id="ss-shortcuts" type="button" title="'+esc(L.help)+'" aria-expanded="false" aria-controls="ss-help">?</button></div>'+
      '<button id="ss-duplicate" type="button">⧉ '+(pickLang(this._config,this._hass)==='en'?'Duplicate':'Duplikuj')+'</button>'+ 
       '<button id="ss-delete" type="button">'+esc(L.remove)+'</button>'+
      '<button id="ss-close" type="button">'+esc(L.close)+'</button></div>'+
      '<div class="ss-settings" id="ss-settings" hidden><strong>'+esc(L.canvasSettings)+'</strong>'+
       '<label>'+esc(L.schemeName)+'<input type="text" maxlength="64" id="ss-scheme-name" placeholder="Kotłownia"></label>'+
       '<label>'+esc(L.canvasWidth)+' (300–5000)<input type="number" min="300" max="5000" step="1" id="ss-width"></label>'+
       '<label>'+esc(L.canvasHeight)+' (300–5000)<input type="number" min="300" max="5000" step="1" id="ss-height"></label>'+
       '<p class="ss-note">'+esc(L.outside)+'</p>'+
       '<button type="button" id="ss-apply-size">'+esc(L.apply)+'</button></div>'+
       '<div class="ss-help" id="ss-help" hidden><strong>'+esc(L.shortcutTitle)+'</strong>'+
       '<table><tbody>'+
       [['Delete / Backspace','Usuń / Delete'],['← ↑ → ↓','Przesuń o 5 / Move 5'],['Shift + ← ↑ → ↓','Przesuń o 1 / Move 1'],
        ['Rolka / Wheel','Zoom'],['Spacja + przeciągnij / Drag','Przesuń widok / Pan'],
        ['Środkowy przycisk / Middle drag','Przesuń widok / Pan'],
        ['Ctrl + C / V','Kopiuj / Wklej'],['Ctrl + D','Duplikuj / Duplicate'],['Ctrl + Z','Cofnij / Undo'],['Ctrl + Y / Ctrl + Shift + Z','Ponów / Redo'],
        ['F','Dopasuj / Fit'],['Esc','Odznacz / Deselect'],['?','Pokaż pomoc / Help']].map(row=>
         '<tr><td><kbd>'+esc(row[0])+'</kbd></td><td>'+esc(row[1])+'</td></tr>').join('')+'</tbody></table>'+
       '<p class="ss-note">'+esc(L.shortcutHint)+'</p></div>'+
       '<div class="ss-grid" id="ss-grid"><aside class="ss-library"><h3>'+esc(L.library)+'</h3>'+ 
       '<input id="ss-library-search" class="ss-library-search" type="search" autocomplete="off" placeholder="'+(pickLang(this._config,this._hass)==='en'?'Search devices...':'Szukaj urządzenia...')+'">'+
       '<div id="ss-lib-results" class="ss-lib-results" hidden></div><div id="ss-lib-recent" class="ss-lib-recent" hidden></div><div id="ss-lib-catalog" class="ss-lib-catalog">'+
      HASSStudioEditorLibrary.render({registry,language:pickLang(this._config,this._hass),esc})+
      '</div></aside><div class="ss-splitter" data-split="left" role="separator" aria-label="Resize left panel"></div><main class="ss-canvas"><div id="ss-stage" class="ss-stage"></div>'+
      '</main>'+
      '<div class="ss-splitter" data-split="right" role="separator" aria-label="Resize right panel"></div><aside class="ss-props" id="ss-props"><h3>'+esc(L.properties)+'</h3><div id="ss-energy-controls"></div></aside></div></dialog>';
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
    let selection=null,drag=null,selectedPartId=null,expandedPartId=null,lastConnectionPointer=null,clipboard=null;
    const dimensions=()=>viewport.dimensions(this._config);
    let {width:sceneW,height:sceneH}=dimensions();
    let camera=viewport.fresh(sceneW,sceneH),spaceHeld=false;
    const canvasHost=root.querySelector('.ss-canvas');
    const undo=[],redo=[];
    const pushHistory=()=>{undo.push(JSON.stringify(this._config.studio_layout||{}));if(undo.length>60)undo.shift();redo.length=0;};
    const historyStep=(from,to)=>{
      if(!from.length)return;
      to.push(JSON.stringify(this._config.studio_layout||{}));
      this._config={...this._config,studio_layout:JSON.parse(from.pop())};
      this._fire();render();
    };
    const get=()=>normalized(this._config);
    const commit=(model,skipHistory=false)=>{
      if(!skipHistory)pushHistory();
      this._config={...this._config,studio_layout:model};
      this._fire();
    };
    const selectedObject=(model)=>{
      if(!selection)return null;
      return selection.type==='node'?model.nodes.find(x=>x.id===selection.id):
        model.connections.find(x=>x.id===selection.id);
    };
    const renderBalance=()=>{
      const e=get().energy_balance,host=root.getElementById('ss-energy-controls');if(!host)return;
      const modes=[['device','Urządzenie'],['ha','HA'],['manual','Test'],['calculate','Oblicz'],['off','Wyłącz']];
      const select=(list,value)=>list.map(([id,name])=>'<option value="'+id+'"'+(id===value?' selected':'')+'>'+name+'</option>').join('');
      host.innerHTML='<h4>Bilans energii</h4><p class="ss-note">Automatyczny bilans chwilowej mocy podłączonych urządzeń.</p>'+
        '<p>'+HASSStudioEnergyFlow.resolve(get(),this._hass).balance.networks.map(n=>n.state+' '+(n.residual_kw??'—')+' kW').join(' / ')+'</p>'+
        '<h4>Diagnostyka</h4><label><input type="checkbox" data-diagnostics-enable'+(get().energy_diagnostics.enabled?' checked':'')+'> Pokaż panel w schemacie</label>'+
        '<label><input type="checkbox" data-diagnostics-devices'+(get().energy_diagnostics.show_devices?' checked':'')+'> Lista urządzeń</label>'+
        '<label><input type="checkbox" data-diagnostics-cables'+(get().energy_diagnostics.show_cables?' checked':'')+'> Przepływy przewodów</label>'+
        '<label><input type="checkbox" data-diagnostics-warnings'+(get().energy_diagnostics.show_warnings?' checked':'')+'> Ostrzeżenia</label>'+
        HASSStudioEnergyDiagnostics.render(get(),this._hass,pickLang(this._config,this._hass),'editor');
    };
    properties.addEventListener('change',event=>{
      if(!event.target.matches('[data-diagnostics-enable],[data-diagnostics-devices],[data-diagnostics-cables],[data-diagnostics-warnings]'))return;
      const el=event.target,model=get(),e=model.energy_balance;
      if(el.matches('[data-diagnostics-enable]'))model.energy_diagnostics.enabled=el.checked;
      else if(el.matches('[data-diagnostics-devices]'))model.energy_diagnostics.show_devices=el.checked;
      else if(el.matches('[data-diagnostics-cables]'))model.energy_diagnostics.show_cables=el.checked;
      else if(el.matches('[data-diagnostics-warnings]'))model.energy_diagnostics.show_warnings=el.checked;
      else if(el.matches('[data-balance-enable]'))e.enabled=el.checked;
      else if(el.matches('[data-balance-scenario]'))e.scenario=el.value;
      else {
        const id=el.closest('[data-participant]')?.dataset.participant;if(!id)return;
        let o=e.participants.find(p=>p.node_id===id);
        if(!o){o=HASSStudioEnergyBalance.participant({node_id:id});e.participants.push(o);}
        if(el.matches('[data-balance-mode]'))o.mode=el.value;
        if(el.matches('[data-balance-kw]'))o.manual_kw=clamp(el.value,-10000,10000,0);
        if(el.matches('[data-balance-entity]'))o.entity=validEntity(el.value)?el.value:'';
      }
      commit(model);render();
    });
    const renderProps=HASSStudioEditorInspector.create({
      editor:this,L,properties,esc,opts,registry,pickLang,get,selectedObject,
      getSelection:()=>selection,getSelectedPartId:()=>selectedPartId,getExpandedPartId:()=>expandedPartId,variantShape
    });
    const applyCamera=()=>{
      const svg=stage.querySelector('svg');if(!svg)return;
      const rect=stage.getBoundingClientRect();
      const b=viewport.box(camera,Math.max(1,rect.width),Math.max(1,rect.height),sceneW,sceneH,1.06);
      svg.setAttribute('viewBox',[b.x,b.y,b.width,b.height].join(' '));
      svg.setAttribute('preserveAspectRatio','none');
      const select=root.getElementById('ss-zoom');
      if(select && [...select.options].some(o=>Number(o.value)===camera.zoom))select.value=String(camera.zoom);
    };
    const fit=()=>{
      ({width:sceneW,height:sceneH}=dimensions());
      camera=viewport.fresh(sceneW,sceneH);
      applyCamera();
    };
    const zoomAt=(factor,event)=>{
      const rect=stage.getBoundingClientRect();
      camera=viewport.zoomAt(camera,factor,event?event.clientX-rect.left:rect.width/2,
        event?event.clientY-rect.top:rect.height/2,Math.max(1,rect.width),Math.max(1,rect.height),sceneW,sceneH,1.06);
      applyCamera();
    };
    const render=()=>{
      ({width:sceneW,height:sceneH}=dimensions());
      stage.innerHTML=canvasSvg(this._config,this._hass,true,selection);
      applyCamera();renderProps();
      properties.insertAdjacentHTML('beforeend','<div id="ss-energy-controls"></div>');
      renderBalance();
    };
    if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>applyCamera()).observe(stage);
    const setSelected=(type,id)=>{
      selection={type,id};selectedPartId=type==='node'?get().nodes.find(n=>n.id===id)?.parts?.[0]?.id||null:null;expandedPartId=selectedPartId;render();
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
      for(const connection of model.connections){
        const group=[...svg.querySelectorAll('.ss-connection')].find(el=>el.dataset.id===connection.id);
        if(!group)continue;
        const d=connectionPath(connection.points);
        group.querySelectorAll('path.ss-line,path.ss-connection-hit').forEach(el=>el.setAttribute('d',d));
        group.querySelectorAll('.ss-cap').forEach(el=>{
          const first=el.dataset.cap==='start',pt=first?connection.points[0]:connection.points[connection.points.length-1],
          near=first?connection.points[1]:connection.points[connection.points.length-2];
          el.setAttribute('transform','translate('+pt.x+' '+pt.y+') rotate('+(Math.atan2(pt.y-near.y,pt.x-near.x)*180/Math.PI)+')');
        });
        svg.querySelectorAll('.ss-handle').forEach(el=>{
          if(el.dataset.id!==connection.id)return;
          const p=connection.points[Number(el.dataset.point)];
          if(p){el.setAttribute('cx',p.x);el.setAttribute('cy',p.y);}
        });
        svg.querySelectorAll('.ss-accessory[data-connection="'+connection.id+'"]').forEach((el,i)=>{
          const accessory=connection.accessories[i];
          if(accessory){const p=onConnection(connection,accessory.position);
            el.setAttribute('transform','translate('+p.x+' '+p.y+')');}
        });
      }
    };
    const create=(kind,preset='',position=null)=>{
      const model=get();
      if(kind==='connection'){
        if(model.connections.length>=MAX_CONNECTIONS)return;
        const n=model.connections.length;
        const hydraulic=preset==='hydraulic';
        if(!hydraulic&&preset!=='electric')return;
        const connection={id:freshId('c'),type:preset,label:'',
          points:position?[{x:position.x-80,y:position.y},{x:position.x+80,y:position.y}]:[{x:180+n*10,y:120+n*12},{x:470+n*10,y:120+n*12}],
          style:{color:hydraulic?'hot':'electric',width:hydraulic?7:5,cap_start:hydraulic,cap_end:hydraulic},
          animation:{flow_mode:hydraulic?'auto':'off',flow_entity:'',flow_direction:'forward',flow_speed:1,...HASSStudioPowerFlow.defaults(),flow_power_mode:hydraulic?'off':'balance'},
          accessories:[]};
        if(!hydraulic)model.energy_balance.enabled=true;
         model.connections.push(connection);selection={type:'connection',id:connection.id};
      }else{
        if(model.nodes.length>=MAX_NODES)return;
        const n=model.nodes.length;
        const node={id:freshId('n'),type:kind,x:position?position.x:80+(n%6)*170,y:position?position.y:100+Math.floor(n/6)*170,
          energy_ports:HASSStudioEnergyTopology.defaultPorts({type:kind,variant:preset}),energy_mode:'auto',energy_fallback_enabled:false,energy_test_configured:false,energy_grid_auto:kind==='power_grid',energy_power_entity:'',energy_manual_kw:null,
           scale:1,readout_scale:1,visual:'warmwasser',variant:registry.isVariant(kind,preset)?preset:registry.defaultVariant(kind),label:'',entity:'',burner_entity:'',burner_mode:'auto',solid_fuel:'wood',pellet_level_entity:'',pellet_level_manual:false,pellet_level_test:80,pellet_alarm_pct:20,pellet_test_mode:false,pellet_manual_state:'burning',pellet_manual_temperature:65,pellet_manual_power_unit:'%',pellet_manual_power:65,pellet_manual_feeder:false,pellet_manual_alarm:false,pellet_burner_power_entity:'',pellet_feeder_entity:'',pellet_alarm_entity:'',solid_state:'auto',solid_glow:78,hp_power_entity:'',hp_fan_entity:'',hp_max_rpm:1800,hp_glow:65,hp_test_mode:false,hp_manual_kw:0,hp_manual_fan:0,gas_draw_entity:'',gas_glow:62,electric_power_entity:'',electric_load_entity:'',electric_max_kw:8,electric_glow:60,equipment_mode:'live',equipment_test_running:false,equipment_test_speed:1,equipment_test_position:0,pump_entity:'',tank_entity:'',solar_on_delta:6,solar_off_delta:3,burner_on_temp:35,burner_off_temp:32,power_grid:kind==='power_grid'?HASSStudioPowerGrid.defaults():undefined,radiator:kind==='radiator'?HASSStudioRadiator.defaults():undefined,manifold:kind==='manifold'?HASSStudioManifold.defaults():undefined,energy_storage:kind==='energy_storage'?HASSStudioEnergyStorage.defaults():undefined,inverter:kind==='inverter'?HASSStudioInverter.defaults():undefined,ev_charger:kind==='ev_charger'?HASSStudioEVCharger.defaults():undefined,building:kind==='building'?{...HASSStudioBuilding.defaults(),measurement:'aggregate',remaining_kw:0}:undefined,entities:[],parts:[]};
        if(HASSStudioEnergyTopology.electricalType(node))model.energy_balance.enabled=true;
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
      camera={...camera,zoom:Number(event.target.value)||1,autoFit:false};applyCamera();
    });
    root.getElementById('ss-fit').addEventListener('click',fit);
    root.getElementById('ss-all').addEventListener('click',()=>{
      const model=get(),bounds=[{x:0,y:0},{x:sceneW,y:sceneH}];
      model.nodes.forEach(n=>{bounds.push({x:n.x-60*n.scale,y:n.y-110*n.scale},{x:n.x+220*n.scale,y:n.y+350*n.scale});});
      model.connections.forEach(connection=>bounds.push(...connection.points));
      const minX=Math.min(...bounds.map(x=>x.x)),maxX=Math.max(...bounds.map(x=>x.x));
      const minY=Math.min(...bounds.map(x=>x.y)),maxY=Math.max(...bounds.map(x=>x.y));
      const rect=stage.getBoundingClientRect(),scale=Math.min(rect.width/(maxX-minX+40),rect.height/(maxY-minY+40));
      camera={cx:(maxX+minX)/2,cy:(maxY+minY)/2,zoom:Math.max(.2,Math.min(8,scale/Math.min(rect.width/sceneW,rect.height/sceneH))),autoFit:false};
      applyCamera();
    });
    root.getElementById('ss-undo').addEventListener('click',()=>historyStep(undo,redo));
    root.getElementById('ss-redo').addEventListener('click',()=>historyStep(redo,undo));
    const settings=root.getElementById('ss-settings'),help=root.getElementById('ss-help');
    root.getElementById('ss-size').addEventListener('click',()=>{
      settings.hidden=!settings.hidden;help.hidden=true;
      root.getElementById('ss-width').value=String(dimensions().width);
      root.getElementById('ss-height').value=String(dimensions().height);
      root.getElementById('ss-scheme-name').value=get().name;
    });
    root.getElementById('ss-shortcuts').addEventListener('click',()=>{
      help.hidden=!help.hidden;settings.hidden=true;
      root.getElementById('ss-shortcuts').setAttribute('aria-expanded',String(!help.hidden));
    });
    root.getElementById('ss-apply-size').addEventListener('click',()=>{
      const width=Number(root.getElementById('ss-width').value),height=Number(root.getElementById('ss-height').value);
      if(!Number.isInteger(width)||!Number.isInteger(height)||width<300||height<300||width>5000||height>5000)return;
      const model=get();model.width=width;model.height=height;
      model.name=root.getElementById('ss-scheme-name').value.trim().slice(0,64);
      commit(model);settings.hidden=true;fit();render();
    });
    const deleteSelection=()=>{
      if(!selection)return;
      const model=get();
      if(selection.type==='node')model.nodes=model.nodes.filter(n=>n.id!==selection.id);
      else model.connections=model.connections.filter(n=>n.id!==selection.id);
      commit(model);selection=null;selectedPartId=null;expandedPartId=null;render();
    };
    root.getElementById('ss-delete').addEventListener('click',deleteSelection);
    stage.addEventListener('wheel',event=>{event.preventDefault();zoomAt(event.deltaY<0?1.12:1/1.12,event);},{passive:false});
    modal.addEventListener('keydown',event=>{
      const tag=event.target?.tagName?.toLowerCase();
      if(['input','textarea','select'].includes(tag)||event.target?.isContentEditable)return;
      if(event.key===' '){spaceHeld=true;event.preventDefault();return;}
      if((event.ctrlKey||event.metaKey)&&['c','v','d'].includes(event.key.toLowerCase())){event.preventDefault();const k=event.key.toLowerCase();if(k==='c')copySelection();else if(k==='v')pasteSelection(clipboard);else duplicateSelection();return;}
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){
        event.preventDefault();historyStep(event.shiftKey?redo:undo,event.shiftKey?undo:redo);return;
      }
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='y'){event.preventDefault();historyStep(redo,undo);return;}
      if(['Delete','Backspace'].includes(event.key)){event.preventDefault();deleteSelection();return;}
      if(event.key.toLowerCase()==='f'&&!event.ctrlKey){event.preventDefault();fit();return;}
      if(event.key==='Escape'){
        if(!help.hidden||!settings.hidden){help.hidden=true;settings.hidden=true;event.preventDefault();event.stopPropagation();return;}
        event.preventDefault();event.stopPropagation();
        selection=null;selectedPartId=null;expandedPartId=null;render();return;
      }
      const arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
      if(arrows[event.key]&&selection){
        event.preventDefault();const delta=event.shiftKey?1:5,v=arrows[event.key],model=get(),obj=selectedObject(model);
        if(!obj)return;
        if(selection.type==='node'){obj.x+=v[0]*delta;obj.y+=v[1]*delta;}
        else obj.points.forEach(q=>{q.x+=v[0]*delta;q.y+=v[1]*delta;});
        commit(model);render();
      }
    });
    modal.addEventListener('keyup',event=>{if(event.key===' ')spaceHeld=false;});
    window.addEventListener('blur',()=>{spaceHeld=false;});
    const library=root.querySelector('.ss-library'),search=root.getElementById('ss-library-search'),results=root.getElementById('ss-lib-results'),recent=root.getElementById('ss-lib-recent'),catalog=root.getElementById('ss-lib-catalog');
    const lang=pickLang(this._config,this._hass),entries=registry.libraryEntries(lang);
    const makeButton=item=>'<button type="button" class="ss-lib-item" draggable="true" data-lib-type="'+esc(item.type)+'" data-lib-variant="'+esc(item.variant)+'"><ha-icon class="ss-lib-icon" icon="'+esc(item.icon)+'"></ha-icon><span class="ss-lib-label">'+esc(item.label)+'</span></button>';
    const refreshLibrary=()=>{
      const q=search.value.trim();catalog.hidden=!!q;recent.hidden=!!q;results.hidden=!q;
      if(q){const matches=HASSStudioEditorLibrary.filter(registry,lang,q);results.innerHTML='<strong>'+(lang==='en'?'Results':'Wyniki')+' ('+matches.length+')</strong>'+matches.map(makeButton).join('');}
      else{const items=HASSStudioEditorLibrary.readRecent(window.localStorage).map(x=>entries.find(e=>e.type===x.type&&e.variant===x.variant)).filter(Boolean);recent.hidden=!items.length;recent.innerHTML=items.length?'<strong>'+(lang==='en'?'Recently added':'Ostatnio dodawane')+'</strong>'+items.map(makeButton).join(''):'';}
    };
    const addLibrary=(kind,preset,pos)=>{
      if(!entries.some(x=>x.type===kind&&x.variant===preset))return;
      const before=get(),size=before.nodes.length+before.connections.length;create(kind,preset,pos);
      const after=get();if(after.nodes.length+after.connections.length===size)return;
      HASSStudioEditorLibrary.recordRecent(window.localStorage,kind,preset);
      search.value='';catalog.querySelectorAll('details[open]').forEach(x=>{x.open=false;});refreshLibrary();
    };
    const choice=button=>({kind:button.dataset.libType||(button.dataset.addPreset?'boiler':button.dataset.add),preset:button.dataset.libVariant||button.dataset.addPreset||button.dataset.variant||''});
    search.addEventListener('input',refreshLibrary);
    library.addEventListener('click',event=>{const btn=event.target.closest('button[data-lib-type],button[data-add],button[data-add-preset]');if(btn){const x=choice(btn);addLibrary(x.kind,x.preset);}});
    const desktop=()=>!window.matchMedia?.('(pointer: coarse)').matches;
    library.addEventListener('dragstart',event=>{
      const btn=event.target.closest('button[data-lib-type],button[data-add],button[data-add-preset]');
      if(!btn||!desktop()){event.preventDefault();return;}
      const x=choice(btn);if(!entries.some(e=>e.type===x.kind&&e.variant===x.preset)){event.preventDefault();return;}
      event.dataTransfer.setData('application/x-ha-studio-device',JSON.stringify(x));event.dataTransfer.effectAllowed='copy';
    });
    stage.addEventListener('dragover',event=>{if(desktop()&&Array.from(event.dataTransfer.types).includes('application/x-ha-studio-device')){event.preventDefault();event.dataTransfer.dropEffect='copy';}});
    stage.addEventListener('drop',event=>{
      if(!desktop())return;const data=event.dataTransfer.getData('application/x-ha-studio-device');if(!data)return;
      event.preventDefault();try{const x=JSON.parse(data),rect=stage.getBoundingClientRect();
        const pos=viewport.worldAt(camera,event.clientX-rect.left,event.clientY-rect.top,Math.max(1,rect.width),Math.max(1,rect.height),sceneW,sceneH,1.06);
        addLibrary(x.kind,x.preset,{x:Math.round(pos.x),y:Math.round(pos.y)});
      }catch{}
    });
    library.querySelectorAll('button[data-add],button[data-add-preset]').forEach(btn=>btn.setAttribute('draggable','true'));
    refreshLibrary();
    const copySelection=()=>{const obj=selectedObject(get());if(obj&&selection)clipboard={type:selection.type,value:JSON.parse(JSON.stringify(obj))};};
    const pasteSelection=source=>{
      if(!source)return;const model=get(),node=source.type==='node';
      if(node?model.nodes.length>=MAX_NODES:model.connections.length>=MAX_CONNECTIONS)return;
      const obj=JSON.parse(JSON.stringify(source.value));
      const renew=x=>{if(!x||typeof x!=='object')return;if(Array.isArray(x)){x.forEach(renew);return;}
        if(typeof x.id==='string')x.id=freshId(node?'n':'c');Object.values(x).forEach(renew);};
      renew(obj);
      if(node){obj.x+=25;obj.y+=25;model.nodes.push(obj);}
      else{obj.points.forEach(p=>{p.x+=25;p.y+=25;});model.connections.push(obj);}
      commit(model);selection={type:source.type,id:obj.id};selectedPartId=null;expandedPartId=null;render();
    };
    const duplicateSelection=()=>{if(!selection||!selectedObject(get()))return;copySelection();pasteSelection(clipboard);};
    root.getElementById('ss-duplicate').addEventListener('click',duplicateSelection);
    properties.addEventListener('change',event=>{
      const el=event.target,key=el.dataset.field;
      if(!key||!selection)return;
      const model=get(),obj=selectedObject(model);if(!obj)return;
      const index=Number(el.dataset.index);
      const val=el.value;
      if(selection.type==='connection'&&key.startsWith('style_')){
        const attr=key.slice(6),s=obj.style;
        if(attr==='width')s.width=clamp(val,2,14,s.width);
        else if(attr==='color'&&obj.type==='hydraulic')s.color=colors[val]?val:s.color;
        else if(['cap_start','cap_end'].includes(attr)&&obj.type==='hydraulic')s[attr]=val==='true';
       }else if(selection.type==='connection'&&key.startsWith('energy_attach_')){
        const side=key.slice('energy_attach_'.length),parts=val.split(':');
        if(['start','end'].includes(side))HASSStudioEnergyTopology.attach(model,obj,side,
          val?{node_id:parts[0],port_id:parts[1]}:null);
      }else if(selection.type==='node'&&key==='energy_mode'){
         obj.energy_mode=['auto','ha','test'].includes(val)?val:'ha';
         obj.energy_test_configured=true;
       }else if(selection.type==='node'&&key==='energy_manual_w'){
         obj.energy_manual_kw=val===''?null:clamp(val,0,10000000,0)/1000;
         obj.energy_test_configured=true;
       }else if(selection.type==='node'&&key==='energy_fallback_enabled'){
         obj.energy_fallback_enabled=val==='true';obj.energy_test_configured=true;
       }else if(selection.type==='node'&&key==='energy_grid_auto'){
         obj.energy_grid_auto=val==='true';
       }else if(selection.type==='node'&&key==='energy_power_entity'){
         obj.energy_power_entity=validEntity(val)?val:'';
       }else if(selection.type==='node'&&key==='energy_manual_kw'){
         obj.energy_manual_kw=val===''?null:clamp(val,0,10000,0);obj.energy_test_configured=true;
       }else if(selection.type==='node'&&key==='energy_role'){
        obj.energy_role=HASSStudioEnergyTopology.role(val);
      }else if(selection.type==='node'&&key.startsWith('energy_port_')){
        const port=obj.energy_ports?.[index];if(!port)return;
        const prop=key.slice('energy_port_'.length);
        if(prop==='label')port.label=val.slice(0,40);
        if(prop==='bus')port.bus=HASSStudioEnergyTopology.ident(val);
        if(prop==='medium')port.medium=HASSStudioEnergyTopology.medium(val);
        if(['x','y'].includes(prop))port[prop]=clamp(val,0,100,50);
        HASSStudioEnergyTopology.moveAttached(model,obj.id);
      }else if(selection.type==='connection'&&key.startsWith('anim_')){
        const attr=key.slice(5),a=obj.animation;
        if(attr==='flow_mode'&&obj.type==='hydraulic')a.flow_mode=['on','off','auto'].includes(val)?val:'auto';
        else if(attr==='flow_entity'&&obj.type==='hydraulic')a.flow_entity=validEntity(val)?val:'';
        else if(attr==='flow_direction')a.flow_direction=val==='reverse'?'reverse':'forward';
        else if(attr==='flow_speed')a.flow_speed=clamp(val,.35,5,a.flow_speed);
        else if(obj.type==='electric'){
          if(attr==='flow_power_mode')a.flow_power_mode=['off','ha','manual','balance'].includes(val)?val:'off';
          else if(attr==='flow_power_entity')a.flow_power_entity=validEntity(val)?val:'';
          else if(attr==='flow_pattern')a.flow_pattern=['dots','dashes','arrows'].includes(val)?val:'dots';
          else if(attr==='flow_power_direction')a.flow_power_direction=val==='true';
          else if(['flow_power_kw','flow_max_kw','flow_min_width','flow_max_width'].includes(attr)){
            const range={flow_power_kw:[-10000,10000],flow_max_kw:[.1,10000],
              flow_min_width:[.5,12],flow_max_width:[.5,16]}[attr];
            a[attr]=clamp(val,range[0],range[1],a[attr]);
          }
        }
      }else if(key==='readout_scale')obj.readout_scale=clamp(val,40,150,100)/100;
      else if(obj.type==='building'&&key.startsWith('building_')){
        const c=obj.building=obj.building||HASSStudioBuilding.defaults(),k=key.slice(9);
        if(k==='mode')c.mode=val==='manual'?'manual':'live';
        else if(k==='measurement')c.measurement=val==='aggregate'?'aggregate':'individual';
        else if(k==='remaining_enabled')c.remaining_enabled=val==='true';
        else if(k==='remaining_kw')c.remaining_kw=clamp(val,0,10000,0);
        else if(['power_entity','daily_entity'].includes(k))c[k]=validEntity(val)?val:'';
        else if(['show_readout','window_glow'].includes(k))c[k]=val==='true';
        else if(k==='readout_scale')c[k]=clamp(val,40,150,100)/100;
        else if(k==='power_kw'){c[k]=clamp(val,0,10000,0);obj.energy_test_configured=true;}
        else if(k==='daily_kwh')c[k]=clamp(val,0,1000000,0);
      }else if(obj.type==='ev_charger'&&key.startsWith('ev_')){
        const e=obj.ev_charger=obj.ev_charger||HASSStudioEVCharger.defaults(),k=key.slice(3);
        if(k.startsWith('entity_')){
          const name=k.slice(7);if(HASSStudioEVCharger.keys.includes(name)){
            e.entities=e.entities||{};e.entities[name]=validEntity(val)?val:'';
          }
        }else if(k.startsWith('manual_')){
          const name=k.slice(7);e.manual=e.manual||{};
          if(name==='status')e.manual.status=['charging','ready','disconnected','fault'].includes(val)?val:'ready';
          else if(name==='alarm')e.manual.alarm=val==='true';
          else if(name==='power'){e.manual.power=clamp(val,-500,500,0);obj.energy_test_configured=true;}
          else if(name==='session_energy')e.manual.session_energy=clamp(val,0,100000,0);
        }else if(k==='mode')e.mode=val==='manual'?'manual':'live';
        else if(k==='phases')e.phases=val==='1'?1:3;
        else if(k==='power_threshold_w')e.power_threshold_w=clamp(val,0,1000,30);
        else if(k==='display_scale'||k==='extra_scale')e[k]=clamp(val,40,150,100)/100;
        else if(k==='extra_position')e.extra_position=val==='left'?'left':'right';
        else if(['charging_positive','animate','show_extra'].includes(k))e[k]=val==='true';
      }else if(obj.type==='inverter'&&key.startsWith('inv_')){
        const c=obj.inverter=obj.inverter||HASSStudioInverter.defaults(),k=key.slice(4);
        if(k.startsWith('entity_')){
          const f=k.slice(7);
          if(['ac_power','temperature','status','alarm'].includes(f)){
            c.entities=c.entities||{};c.entities[f]=validEntity(val)?val:'';
          }
        }else if(k.startsWith('manual_')){
          const f=k.slice(7);c.manual=c.manual||{};
          if(f==='ac_power'){c.manual[f]=clamp(val,-500,500,0);obj.energy_test_configured=true;}
          if(f==='temperature')c.manual[f]=clamp(val,-40,150,25);
        }else if(k.startsWith('pv_')){
          const match=/^pv_(\d+)_(name|visible|entity_(?:voltage|current|power)|manual_(?:voltage|current|power))$/.exec(k);
          if(match&&Number(match[1])<12){
            const i=Number(match[1]);
            c.inputs=c.inputs||[];
            if(!c.inputs[i])c.inputs[i]=HASSStudioInverter.defaultInput(i);
            const q=c.inputs[i],fieldName=match[2];
            if(fieldName==='name')q.name=val.slice(0,12);
            else if(fieldName==='visible')q.visible=val==='true';
            else if(fieldName.startsWith('entity_')){q.entities=q.entities||{};q.entities[fieldName.slice(7)]=validEntity(val)?val:'';}
            else if(fieldName.startsWith('manual_')){
              q.manual=q.manual||{};
              q.manual[fieldName.slice(7)]=val===''?null:clamp(val,0,50000,0);
            }
          }
        }else if(k.startsWith('row_')){
          const match=/^row_(\d+)_(key|label|input|entity|unit|decimals|manual_value)$/.exec(k);
          if(match){
            const i=Number(match[1]),field=match[2],rows=c.panel_rows=c.panel_rows||HASSStudioInverter.normalize(obj).panel_rows;
            if(i>=0&&i<rows.length){
              const row=rows[i];
              if(field==='key')row.key=HASSStudioInverter.DEFAULT_KEYS.includes(val)?val:'custom';
              else if(field==='label')row.label=val.slice(0,42);
              else if(field==='entity')row.entity=validEntity(val)?val:'';
              else if(field==='unit')row.unit=['auto','W','kW','Wh','kWh','MWh','V','A','°C','%','Hz'].includes(val)?val:'auto';
              else if(field==='input')row.input=clamp(val,0,11,0);
              else if(field==='decimals')row.decimals=clamp(val,0,3,1);
              else if(field==='manual_value')row.manual_value=val.slice(0,60);
            }
          }
        }else if(k==='panel_title')c.panel_title=val.slice(0,46);
        else if(k==='mode')c.mode=val==='manual'?'manual':'live';
        else if(k==='count')c.count=clamp(val,1,12,2);
        else if(k==='display_scale'||k==='extra_scale')c[k]=clamp(val,40,150,100)/100;
        else if(k==='extra_position')c.extra_position=val==='left'?'left':'right';
        else if(k==='rated_kw')c.rated_kw=clamp(val,.1,500,10);
        else if(k==='production_threshold_w')c.production_threshold_w=clamp(val,0,1000,10);
        else if(['positive_power','show_extra'].includes(k))c[k]=val==='true';
      }else if(obj.type==='energy_storage'&&key.startsWith('storage_')){
        const c=obj.energy_storage=obj.energy_storage||HASSStudioEnergyStorage.defaults();
        const k=key.slice(8);
        if(k.startsWith('entity_')){
          const name=k.slice(7);
          if(HASSStudioEnergyStorage.FIELDS.includes(name)){
            c.entities=c.entities||{};c.entities[name]=validEntity(val)?val:'';
          }
        }else if(k.startsWith('manual_')){
          const name=k.slice(7);c.manual=c.manual||{};
          if(name==='soc')c.manual.soc=clamp(val,0,100,75);
          if(name==='power')c.manual.power=clamp(val,-500,500,1.5);
        }else if(k==='display_scale')c.display_scale=clamp(val,40,150,100)/100;
        else if(k==='mode')c.mode=val==='manual'?'manual':'live';
        else if(['show_screen','animate_charge','charge_positive','custom_alarm','show_alarm',
          'show_warning','temp_low_enabled','temp_high_enabled','cell_low_enabled',
          'cell_high_enabled','delta_enabled','offline_alarm'].includes(k))c[k]=val==='true';
        else if(['min_soc','alarm_soc'].includes(k))c[k]=clamp(val,0,100,20);
        else if(k==='warning_margin')c[k]=clamp(val,0,30,5);
        else if(['temp_low','temp_high','cell_low','cell_high','delta_max'].includes(k))
          c[k]=clamp(val,k==='temp_low'?-50:0,k==='temp_high'?150:k==='temp_low'?100:k==='delta_max'?1000:k.startsWith('cell')?5:100,c[k]);
      }else if(['pump','valve'].includes(obj.type)&&key.startsWith('eq_')){
        const field=key.slice(3);
        if(field==='mode')obj.equipment_mode=val==='manual'?'manual':'live';
        else if(field==='test_running')obj.equipment_test_running=val==='true';
        else if(field==='test_speed')obj.equipment_test_speed=clamp(val,.35,5,1);
        else if(field==='test_position')obj.equipment_test_position=clamp(val,0,100,0);
      }else if(obj.type==='radiator'&&key.startsWith('rad_')){
        const c=obj.radiator=obj.radiator||HASSStudioRadiator.defaults();
        const k=key.slice(4);
        if(k==='display_scale')c.display_scale=clamp(val,40,150,100)/100;
        else if(k==='display')c.display=val==='true';
         else if(k==='mirror_horizontal')c.mirror_horizontal=val==='true';
        else if(k==='mode')c.mode=val==='manual'?'manual':'live';
        else if(['temperature_entity','valve_entity'].includes(k))c[k]=validEntity(val)?val:'';
        else if(k==='manual_temperature')c[k]=clamp(val,-40,150,55);
        else if(k==='manual_open')c[k]=clamp(val,0,100,42);
      }else if(obj.type==='manifold'&&key.startsWith('mf_')){
        const c=obj.manifold=obj.manifold||HASSStudioManifold.defaults();
        const k=key.slice(3);
        if(k==='count')c.count=clamp(val,1,40,5);
        else if(k==='pitch')c.pitch=clamp(val,165,400,260);
        else if(k==='display_scale')c.display_scale=clamp(val,40,150,100)/100;
        else if(k==='actuatorMode')c.actuatorMode=val==='common'?'common':'individual';
        else if(k==='mode')c.mode=val==='manual'?'manual':'live';
        else if(k.startsWith('c_')){
          const hit=/^c_(\d+)_(display|actuator|display_scale|entity_(?:tempOut|tempReturn|flow|open)|manual_(?:tempOut|tempReturn|flow|open))$/.exec(k);
          if(hit){
            const index=Number(hit[1]);
            if(index<40){
              c.circuits=c.circuits||[];
              if(!c.circuits[index])c.circuits[index]=HASSStudioManifold.defaultCircuit(index);
              const item=c.circuits[index],name=hit[2];
              if(name==='display'||name==='actuator')item[name]=val==='true';
              else if(name==='display_scale')item.display_scale=clamp(val,40,150,100)/100;
              else if(name.startsWith('entity_')){item.entities=item.entities||{};item.entities[name.slice(7)]=validEntity(val)?val:'';}
              else if(name.startsWith('manual_'))item[name.slice(7)]=clamp(val,-40,150,0);
            }
          }
        }
      }else if(obj.type==='power_grid'&&key.startsWith('grid_')){
        obj.power_grid=obj.power_grid||HASSStudioPowerGrid.defaults();
        const g=obj.power_grid,k=key.slice(5);
        if(k.startsWith('entity_')){
          const name=k.slice(7);
          if([...HASSStudioPowerGrid.FIELDS,'grid_status','voltage_alarm','phase_loss'].includes(name)){
            g.entities=g.entities||{};g.entities[name]=validEntity(val)?val:'';
          }
        }else if(k.startsWith('manual_')){
          const name=k.slice(7);
          if([...HASSStudioPowerGrid.FIELDS,'grid_status','voltage_alarm','phase_loss'].includes(name)){
            g.manual=g.manual||{};g.manual[name]=clamp(val,-10000,10000,0);
          }
        }else if(k.startsWith('extra_')){
          const name=k.slice(6);
          g.show_extras=HASSStudioPowerGrid.EXTRAS.filter(x=>x===name
             ?val==='true':(g.show_extras||[]).includes(x));
        }else if(['show_panel','show_v','show_a','show_l1','show_l2','show_l3'].includes(k))g[k]=val==='true';
        else if(k==='mode')g.mode=val==='manual'?'manual':'live';
        else if(k==='panel_scale')g.panel_scale=clamp(val,40,150,70)/100;
        else if(k==='theme')g.theme=['auto','light','dark'].includes(val)?val:'auto';
        else if(k==='panel_position')g.panel_position=['right','left','bottom'].includes(val)?val:'right';
        else if(['panel_x','panel_y'].includes(k))g[k]=clamp(val,-250,250,0);
        else if(k==='min_voltage')g.min_voltage=clamp(val,0,350,207);
        else if(k==='max_voltage')g.max_voltage=clamp(val,0,400,253);
      }else if(key==='aspect_locked'&&obj.type==='tank'&&obj.variant==='modular'){
        obj.aspect_locked=val==='true';
      }else if(['width_scale','height_scale'].includes(key)&&obj.type==='tank'&&obj.variant==='modular'){
        const previous=obj[key];
        const next=clamp(val,.5,2.4,previous);
        if(obj.aspect_locked){
          const other=key==='width_scale'?'height_scale':'width_scale';
          const ratio=previous>0?next/previous:1;
          const companion=obj[other]*ratio;
          if(companion>=.5&&companion<=2.4)obj[other]=companion;
          else {obj.aspect_locked=false;}
        }
        obj[key]=next;
        obj.scale_mode='free';
      }else if(['width_scale','height_scale'].includes(key)&&obj.type==='boiler'&&['solid_fuel','pellet_modern','heatpump_modern','gas_modern','electric_modern','fireplace_modern'].includes(obj.variant)){
        // Independent from the proportional whole-node scale.
        obj[key]=clamp(val,.5,2.4,obj[key]);
      }else if(['flow_power_kw','flow_max_kw','flow_min_width','flow_max_width'].includes(key)){
        const ranges={flow_power_kw:[-10000,10000],flow_max_kw:[.1,10000],flow_min_width:[.5,12],flow_max_width:[.5,16]};
        obj[key]=clamp(val,ranges[key][0],ranges[key][1],HASSStudioPowerFlow.defaults()[key]);
      }else if(['x','y','scale','width','solid_glow','gas_glow','electric_glow','electric_max_kw','hp_glow','hp_max_rpm','hp_manual_kw','hp_manual_fan','pellet_level_test','pellet_alarm_pct','pellet_manual_temperature','pellet_manual_power','flow_speed','burner_on_temp','burner_off_temp','solar_on_delta','solar_off_delta'].includes(key)){
        const min={scale:0.5,width_scale:0.5,height_scale:0.5,width:3,solid_glow:0,gas_glow:0,electric_glow:0,electric_max_kw:0.1,hp_glow:0,hp_max_rpm:100,hp_manual_kw:0,hp_manual_fan:0,pellet_level_test:0,pellet_alarm_pct:0,pellet_manual_temperature:-40,pellet_manual_power:0,flow_speed:0.35,burner_on_temp:20,burner_off_temp:10,solar_on_delta:1,solar_off_delta:0};
        const max={scale:2.4,width_scale:2.4,height_scale:2.4,width:14,solid_glow:100,gas_glow:100,electric_glow:100,electric_max_kw:100,hp_glow:100,hp_max_rpm:20000,hp_manual_kw:500,hp_manual_fan:100,pellet_level_test:100,pellet_alarm_pct:100,pellet_manual_temperature:150,pellet_manual_power:obj.pellet_manual_power_unit==='kW'?500:100,flow_speed:5,burner_on_temp:90,burner_off_temp:89,solar_on_delta:40,solar_off_delta:39,x:W,y:H};
        obj[key]=clamp(val,min[key]??0,max[key],obj[key]);if(key==='hp_manual_kw')obj.energy_test_configured=true;
      }else if(['label','variant','color','entity','visual','flow_mode','flow_direction','flow_entity','pellet_level_entity','pellet_level_manual','pellet_test_mode','pellet_manual_state','pellet_manual_power_unit','pellet_manual_feeder','pellet_manual_alarm','pellet_burner_power_entity','pellet_feeder_entity','pellet_alarm_entity','burner_entity','gas_draw_entity','electric_power_entity','electric_load_entity','hp_power_entity','hp_fan_entity','hp_test_mode','burner_mode','solid_fuel','solid_state','pump_entity','tank_entity','cap_start','cap_end','flow_power_mode','flow_pattern','flow_power_direction','flow_power_entity'].includes(key)){
        if(['entity','flow_entity','pellet_level_entity','pellet_burner_power_entity','pellet_feeder_entity','pellet_alarm_entity','burner_entity','gas_draw_entity','electric_power_entity','electric_load_entity','hp_power_entity','hp_fan_entity','pump_entity','tank_entity'].includes(key))obj[key]=validEntity(val)?val:'';
        else if(key==='pellet_level_manual')obj.pellet_level_manual=val==='true';
        else if(['pellet_test_mode','pellet_manual_feeder','pellet_manual_alarm'].includes(key))obj[key]=val==='true';
        else if(key==='pellet_manual_state')obj.pellet_manual_state=['off','ignition','burning','embers'].includes(val)?val:'burning';
        else if(key==='pellet_manual_power_unit'){obj.pellet_manual_power_unit=val==='kW'?'kW':'%';obj.pellet_manual_power=Math.min(obj.pellet_manual_power,obj.pellet_manual_power_unit==='%'?100:500);}
        else if(key==='hp_test_mode')obj.hp_test_mode=val==='true';
        else if(key==='burner_mode')obj.burner_mode=['auto','on','off'].includes(val)?val:'auto';
        else if(key==='solid_fuel')obj.solid_fuel=val==='coal'?'coal':'wood';
        else if(key==='solid_state')obj.solid_state=['auto','burning','embers','off'].includes(val)?val:'auto';
        else if(key==='cap_start'||key==='cap_end')obj[key]=val==='true';
        else if(key==='visual')obj.visual=val==='studio'?'studio':'warmwasser';
        else if(key==='flow_power_mode')obj.flow_power_mode=['off','ha','manual'].includes(val)?val:'off';
        else if(key==='flow_pattern')obj.flow_pattern=['dots','dashes','arrows'].includes(val)?val:'dots';
        else if(key==='flow_power_direction')obj.flow_power_direction=val==='true';
        else if(key==='flow_power_entity')obj.flow_power_entity=validEntity(val)?val:'';
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
      }else if(key==='accessoryMode'&&obj.accessories[index])
        obj.accessories[index].mode=val==='manual'?'manual':'live';
      else if(key==='accessoryRunning'&&obj.accessories[index])
        obj.accessories[index].test_running=val==='true';
      else if(key==='accessorySpeed'&&obj.accessories[index])
        obj.accessories[index].test_speed=clamp(val,.35,5,1);
      else if(key==='accessoryPosition'&&obj.accessories[index])
        obj.accessories[index].test_position=clamp(val,0,100,0);
      else if(key==='accessoryPos'&&obj.accessories[index])
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
      if(button.dataset.action==='reset-tank-aspect' && obj.type==='tank'&&obj.variant==='modular'){
        obj.width_scale=1;obj.height_scale=1;obj.scale_mode='free';obj.aspect_locked=true;
        commit(model);render();return;
      }
      if(button.hasAttribute('data-select-part')){
        if(obj.parts?.some(part=>part.id===button.dataset.selectPart)){
          selectedPartId=button.dataset.selectPart;
          expandedPartId=expandedPartId===selectedPartId?null:selectedPartId;renderProps();
        }
        return;
      }
      if(obj.type==='inverter'&&
        (button.hasAttribute('data-inv-row-add')||button.hasAttribute('data-inv-row-delete')||
         button.hasAttribute('data-inv-row-up')||button.hasAttribute('data-inv-row-down'))){
        const c=obj.inverter=obj.inverter||HASSStudioInverter.defaults();
        const rows=c.panel_rows=c.panel_rows||HASSStudioInverter.normalize(obj).panel_rows;
        if(button.hasAttribute('data-inv-row-add')){
          if(rows.length>=HASSStudioInverter.MAX_ROWS)return;
          rows.push(HASSStudioInverter.defaultRow());
        }else{
          const key=button.hasAttribute('data-inv-row-delete')?'invRowDelete':
            button.hasAttribute('data-inv-row-up')?'invRowUp':'invRowDown';
          const i=Number(button.dataset[key]);
          if(!Number.isInteger(i)||i<0||i>=rows.length)return;
          if(key==='invRowDelete')rows.splice(i,1);
          else{const j=i+(key==='invRowUp'?-1:1);if(j<0||j>=rows.length)return;
            [rows[i],rows[j]]=[rows[j],rows[i]];}
        }
        commit(model);render();return;
      }
      if(selection.type==='node'&&button.hasAttribute('data-add-energy-port')){
        if(obj.energy_ports.length>=HASSStudioEnergyTopology.MAX_PORTS)return;
        let i=1;while(obj.energy_ports.some(p=>p.id==='port'+i))i++;
        obj.energy_ports.push({id:'port'+i,label:'',medium:'ac',bus:'main',x:50,y:50});
        commit(model);render();return;
      }
      if(selection.type==='node'&&button.hasAttribute('data-remove-energy-port')){
        const index=Number(button.dataset.removeEnergyPort);
        if(!Number.isInteger(index)||index<0||index>=obj.energy_ports.length)return;
        const removed=obj.energy_ports.splice(index,1)[0];
        for(const c of model.connections)for(const side of ['start','end']){
          if(c['energy_'+side]?.node_id===obj.id&&c['energy_'+side]?.port_id===removed.id)
            c['energy_'+side]={node_id:'',port_id:''};
        }
        commit(model);render();return;
      }
      const index=Number(button.dataset.deletePart||button.dataset.deleteAccessory||button.dataset.deleteEntity);
      if(button.hasAttribute('data-layer-up')&&obj.parts){
        const i=Number(button.dataset.layerUp);
        if(i>=0&&i<obj.parts.length-1)[obj.parts[i],obj.parts[i+1]]=[obj.parts[i+1],obj.parts[i]];
        else return;
      }else if(button.hasAttribute('data-layer-down')&&obj.parts){
        const i=Number(button.dataset.layerDown);
        if(i>0&&i<obj.parts.length)[obj.parts[i],obj.parts[i-1]]=[obj.parts[i-1],obj.parts[i]];
        else return;
      }else if(button.hasAttribute('data-delete-part')){
        const removed=obj.parts.splice(index,1)[0];
        if(removed?.id===selectedPartId){selectedPartId=obj.parts[Math.min(index,obj.parts.length-1)]?.id||null;expandedPartId=selectedPartId;}
      }
      else if(button.hasAttribute('data-delete-accessory'))obj.accessories.splice(index,1);
      else if(button.hasAttribute('data-delete-entity'))obj.entities.splice(index,1);
      else if(button.dataset.addPart){
        if(obj.parts.length>=40)return;
        const kind=obj.type==='solar'?'sensor':button.dataset.addPart;
        const sensorCount=obj.parts.filter(part=>part.kind==='sensor').length+1;
        const newPart={id:freshId('i'),kind,label:obj.type==='solar'?'Kolektor':kind==='sensor'?'T'+sensorCount:'',
          side:obj.type==='solar'?'right':'left',height:obj.type==='solar'?80:50,
          display_scale:1,variant:'warmwasser',entity:'',x:50,length:58,width:60,turns:12,power:75,mode:'auto',flow_mode:'auto',flow_direction:'forward',flow_speed:1,permeability:kind==='baffle_horizontal'?.35:0,container:'main',power_entity:''};
        obj.parts.push(newPart);selectedPartId=newPart.id;expandedPartId=newPart.id;
      }else if(button.dataset.addAccessory){
        if(selection.type!=='connection'||obj.type!=='hydraulic'||obj.accessories.length>=20)return;
        obj.accessories.push({id:freshId('a'),type:button.dataset.addAccessory,label:'',position:50,entity:'',mode:'live',test_running:false,test_speed:1,test_position:0});
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
      lastConnectionPointer=null;
      if((event.button===0||event.button===1)&&(event.button===1||spaceHeld||event.target===stage||event.target.tagName?.toLowerCase()==='svg'||event.target.classList?.contains('ss-project-boundary'))){
        const rect=stage.getBoundingClientRect();
        drag={type:'pan',pointer:event.pointerId,lastX:event.clientX,lastY:event.clientY};
        stage.classList.add('ss-dragging');
        stage.setPointerCapture(event.pointerId);event.preventDefault();return;
      }
      if(event.button!==0)return;
      const hit=event.target.closest?.('.ss-handle');
      if(hit){
        selection={type:'connection',id:hit.dataset.id};selectedPartId=null;expandedPartId=null;
        const obj=get().connections.find(item=>item.id===hit.dataset.id),initial=obj?.points[Number(hit.dataset.point)];
        if(!initial)return;
        drag={type:'point',id:hit.dataset.id,index:Number(hit.dataset.point),pointer:event.pointerId,
          initialX:initial.x,initialY:initial.y,moved:false,previous:JSON.stringify(this._config.studio_layout||{})};
        stage.classList.add('ss-dragging');
      }else{
        const node=event.target.closest?.('.ss-node');
        if(node){
          selection={type:'node',id:node.dataset.id};
          const partHit=event.target.closest?.('[data-part-id]');
          selectedPartId=partHit?.dataset.partId||get().nodes.find(n=>n.id===node.dataset.id)?.parts?.[0]?.id||null;
           expandedPartId=selectedPartId;
          if(partHit){renderProps();return;}
          const model=get(),obj=selectedObject(model),svg=stage.querySelector('svg'),p=point(event,svg);
          if(!obj)return;
          drag={type:'node',id:obj.id,offsetX:p.x-obj.x,offsetY:p.y-obj.y,pointer:event.pointerId,
            initialX:obj.x,initialY:obj.y,moved:false,previous:JSON.stringify(this._config.studio_layout||{})};
          stage.classList.add('ss-dragging');
        }else{
          const connection=event.target.closest?.('.ss-connection');
          if(connection){
            const model=get(),obj=model.connections.find(item=>item.id===connection.dataset.id);
            if(!obj)return;
            const p=point(event,stage.querySelector('svg'));
            selection={type:'connection',id:obj.id};selectedPartId=null;expandedPartId=null;
            drag={type:'connection',id:obj.id,pointer:event.pointerId,startX:p.x,startY:p.y,
              points:obj.points.map(q=>({x:q.x,y:q.y})),moved:false,captured:false,
              previous:JSON.stringify(this._config.studio_layout||{})};
            lastConnectionPointer={id:obj.id,x:event.clientX,y:event.clientY,time:event.timeStamp};
            stage.classList.add('ss-dragging');
            renderProps();return; // Keep selection and allow pointerup/dblclick on the original connection.
          }
          selection=null;selectedPartId=null;expandedPartId=null;render();return;
        }
      }
      stage.querySelector('svg')?.setPointerCapture(event.pointerId);
      renderProps();
    });
    stage.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.pointer)return;
      const svg=stage.querySelector('svg');
      if(drag.type==='pan'){
        const rect=stage.getBoundingClientRect();
        camera=viewport.pan(camera,event.clientX-drag.lastX,event.clientY-drag.lastY,
          Math.max(1,rect.width),Math.max(1,rect.height),sceneW,sceneH,1.06);
        drag.lastX=event.clientX;drag.lastY=event.clientY;applyCamera();return;
      }
      const model=get(),p=point(event,svg);
      if(drag.type==='node'){
        const n=model.nodes.find(item=>item.id===drag.id);if(!n)return;
        const x=clamp(Math.round((p.x-drag.offsetX)/5)*5,-5000,10000,n.x);
        const y=clamp(Math.round((p.y-drag.offsetY)/5)*5,-5000,10000,n.y);
        if(x===n.x&&y===n.y)return;
        n.x=x;n.y=y;HASSStudioEnergyTopology.moveAttached(model,n.id);drag.moved=x!==drag.initialX||y!==drag.initialY;
      }else if(drag.type==='connection'){
        const connection=model.connections.find(item=>item.id===drag.id);
        if(!connection)return;
        const translated=translateConnectionPoints(drag.points,p.x-drag.startX,p.y-drag.startY);
        if(!translated.some((pt,index)=>pt.x!==connection.points[index]?.x||pt.y!==connection.points[index]?.y))return;
        if(!drag.captured){stage.setPointerCapture(event.pointerId);drag.captured=true;}
        connection.points=translated;
        if(connection.type==='electric')for(const side of ['start','end']){
          const at=HASSStudioEnergyTopology.locate(model,connection['energy_'+side]);
          if(at)connection.points[side==='start'?0:connection.points.length-1]=at;
        }
        drag.moved=translated.some((pt,index)=>pt.x!==drag.points[index].x||pt.y!==drag.points[index].y);
      }else{
        const connection=model.connections.find(item=>item.id===drag.id);
        if(!connection||!connection.points[drag.index])return;
        const x=clamp(Math.round(p.x/5)*5,-5000,10000,0);
        const y=clamp(Math.round(p.y/5)*5,-5000,10000,0);
        if(x===connection.points[drag.index].x&&y===connection.points[drag.index].y)return;
        connection.points[drag.index]={x,y};
        if(connection.type==='electric'&&[0,connection.points.length-1].includes(drag.index)){
          const side=drag.index===0?'start':'end';
          const other=connection['energy_'+(side==='start'?'end':'start')];
          const peer=model.nodes.find(n=>n.id===other?.node_id);
          const peerPort=HASSStudioEnergyTopology.ports(peer).find(p=>p.id===other?.port_id);
          HASSStudioEnergyTopology.attach(model,connection,side,
            HASSStudioEnergyTopology.nearest(model,{x,y},25,peerPort?.medium||null));
        }
        drag.moved=x!==drag.initialX||y!==drag.initialY;
      }
      this._config={...this._config,studio_layout:model};repaint(model);
    });
    const end=event=>{
      if(!drag||event.pointerId!==drag.pointer)return;
      const moved=drag.type!=='pan'&&drag.moved,previous=drag.previous;
      stage.classList.remove('ss-dragging');drag=null;
      if(event.type==='pointercancel'){
        if(previous)this._config={...this._config,studio_layout:JSON.parse(previous)};
        render();return;
      }
      if(moved){
        if(previous){undo.push(previous);if(undo.length>60)undo.shift();redo.length=0;}
        this._fire();
      }
      render();
    };
    stage.addEventListener('pointerup',end);
    stage.addEventListener('pointercancel',end);
    stage.addEventListener('dblclick',event=>{
      const el=event.target.closest?.('.ss-connection');
      const fallback=lastConnectionPointer&&Math.hypot(event.clientX-lastConnectionPointer.x,event.clientY-lastConnectionPointer.y)<10&&event.timeStamp-lastConnectionPointer.time<800
        ?lastConnectionPointer.id:null;
      const connectionId=el?.dataset.id||fallback;if(!connectionId)return;
      const model=get(),connection=model.connections.find(item=>item.id===connectionId);
      if(!connection||connection.points.length>=30)return;
      const p=point(event,stage.querySelector('svg'));
      let index=1,best=Infinity;
      for(let i=1;i<connection.points.length;i++){
        const a=connection.points[i-1],b=connection.points[i];
        const vx=b.x-a.x,vy=b.y-a.y,length=vx*vx+vy*vy;
        const t=length?clamp(((p.x-a.x)*vx+(p.y-a.y)*vy)/length,0,1,0):0;
        const distance=Math.hypot(p.x-(a.x+vx*t),p.y-(a.y+vy*t));
        if(distance<best){best=distance;index=i;}
      }
      connection.points.splice(index,0,{x:clamp(p.x,0,W,p.x),y:clamp(p.y,0,H,p.y)});
      selection={type:'connection',id:connection.id};commit(model);render();
    });
    renderProps();
  };
})();