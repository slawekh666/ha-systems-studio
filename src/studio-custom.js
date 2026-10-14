/* Home Assistant Systems Studio - Custom Designer v0.3 (opt-in).
 * Based on Warmwasser Schema Card. The original automatic renderer stays intact.
 * No external dependencies or service calls in the designer.
 */
(() => {
  const W=1200,H=720,MAX_NODES=60,MAX_PIPES=80;
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
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{canvasSettings:'Rozmiar schematu',canvasWidth:'Szerokość',canvasHeight:'Wysokość',apply:'Zastosuj',fit:'Dopasuj schemat',all:'Pokaż wszystkie',help:'Skróty klawiaturowe',undo:'Cofnij',redo:'Ponów',shortcutTitle:'Sterowanie edytorem',shortcutHint:'Skróty nie działają podczas pisania w polach formularzy.',outside:'Zmniejszenie obszaru nie usuwa urządzeń ani rur.'}:{canvasSettings:'Canvas size',canvasWidth:'Width',canvasHeight:'Height',apply:'Apply',fit:'Fit diagram',all:'Show all',help:'Keyboard shortcuts',undo:'Undo',redo:'Redo',shortcutTitle:'Editor controls',shortcutHint:'Shortcuts are disabled while editing form fields.',outside:'Shrinking the canvas does not remove devices or pipes.'});
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
  // Card viewer: fit entire scheme at every responsive width, only zoom after explicit interaction.
  const nativeRender=WarmwasserSchemaCard.prototype._render;
  const nativeUpdate=WarmwasserSchemaCard.prototype._update;
  WarmwasserSchemaCard.prototype._render=function(){
    if(this._cfg?.layout_mode!=='custom')return nativeRender.call(this);
    const {width,height}=viewport.dimensions(this._cfg);
    const L=words[pickLang(this._cfg,this._hass)];
    const label=esc(this._cfg.titel||'Home Assistant Systems Studio');
    const viewerCss='<style>'+
      '.ss-card-viewport{position:relative;display:block;width:100%;aspect-ratio:'+width+'/'+height+';min-height:0;overflow:hidden;background:var(--secondary-background-color,#17222d);touch-action:pan-y;user-select:none}'+
      '.ss-card-viewport svg{display:block;width:100%;height:100%;max-width:none;max-height:none;touch-action:inherit}'+
      '.ss-card-viewport:fullscreen{width:100vw;height:100vh;aspect-ratio:auto;background:#17222d;touch-action:none}'+
      '.ss-card-viewport:fullscreen svg{touch-action:none}'+
      '.ss-view-tools{position:absolute;top:9px;right:9px;display:flex;align-items:center;gap:4px;z-index:2;background:#101925d9;padding:5px;border-radius:9px;opacity:.72;transition:opacity .15s}'+
      '.ss-card-viewport:is(:hover,:focus-within) .ss-view-tools{opacity:1}'+
      '.ss-view-tools button{appearance:none;background:#293949;border:1px solid #53677c;border-radius:5px;color:#fff;min-width:32px;min-height:32px;cursor:pointer;font:600 14px sans-serif}'+
      '.ss-view-tools button:focus-visible{outline:2px solid #52bfff}'+
      '@media(max-width:600px){.ss-view-tools{top:4px;right:4px;padding:2px;gap:2px}.ss-view-tools button{min-width:28px;min-height:28px}}'+
      '</style>';
    return '<div class="kopf"><div class="l"><div class="t1">'+label+'</div></div></div>'+
      viewerCss+'<div class="ss-card-viewport" id="ss-card-viewport" tabindex="0" aria-label="'+esc(L.editor)+'">'+
      '<div class="ss-view-tools">'+
      '<button type="button" data-view-action="out" title="Zoom −" aria-label="Zoom out">−</button>'+
      '<button type="button" data-view-action="in" title="Zoom +" aria-label="Zoom in">+</button>'+
      '<button type="button" data-view-action="fit" title="Dopasuj cały schemat" aria-label="Fit diagram">⤢</button>'+
      '<button type="button" data-view-action="full" title="Pełny ekran" aria-label="Fullscreen">⛶</button></div>'+
      canvasSvg(this._cfg,this._hass)+'</div>';
  };
  const updateCardCamera=function(){
    const view=this._box?.querySelector('#ss-card-viewport'),svg=view?.querySelector('svg');
    if(!svg)return;
    const {width,height}=viewport.dimensions(this._cfg);
    const rect=view.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height);
    if(!this._studioCardCamera || this._studioCardShape!==width+'x'+height){
      this._studioCardCamera=viewport.fresh(width,height);
      this._studioCardShape=width+'x'+height;
    }
    const box=viewport.box(this._studioCardCamera,w,h,width,height);
    svg.setAttribute('viewBox',[box.x,box.y,box.width,box.height].join(' '));
    svg.setAttribute('preserveAspectRatio','none');
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
    if(root&&!this._studioViewerEvents){
      this._studioViewerEvents=true;
      const pointers=new Map();
      let last=null,pinch=null,dragged=false;
      const viewOf=ev=>ev.composedPath().find(el=>el?.id==='ss-card-viewport');
      const currentView=()=>root.getElementById('ss-card-viewport');
      const dimensions=()=>viewport.dimensions(this._cfg);
      const zoom=(factor,ev)=>{
        const view=currentView();if(!view)return;
        const rect=view.getBoundingClientRect(),{width,height}=dimensions();
        const x=ev?.clientX!=null?ev.clientX-rect.left:rect.width/2;
        const y=ev?.clientY!=null?ev.clientY-rect.top:rect.height/2;
        this._studioCardCamera=viewport.zoomAt(this._studioCardCamera,factor,x,y,rect.width,rect.height,width,height);
        updateCardCamera.call(this);
      };
      root.addEventListener('click',ev=>{
        if(dragged){dragged=false;ev.stopImmediatePropagation();ev.preventDefault();return;}
        const action=ev.composedPath().find(el=>el?.dataset?.viewAction)?.dataset.viewAction;
        if(!action)return;
        ev.preventDefault();ev.stopPropagation();
        if(action==='fit'){const {width,height}=dimensions();this._studioCardCamera=viewport.fresh(width,height);updateCardCamera.call(this);}
        else if(action==='in'||action==='out')zoom(action==='in'?1.25:.8);
        else if(action==='full'){const view=currentView();
          if(document.fullscreenElement===view)document.exitFullscreen?.();
          else view?.requestFullscreen?.();
        }
      },true);
      root.addEventListener('wheel',ev=>{
        const view=viewOf(ev);
        if(!view || document.fullscreenElement!==view)return; // Preserve normal dashboard scrolling.
        ev.preventDefault();zoom(ev.deltaY<0?1.15:1/1.15,ev);
      },{passive:false});
      root.addEventListener('pointerdown',ev=>{
        const view=viewOf(ev);
        if(!view||ev.composedPath().some(el=>el?.dataset?.viewAction))return;
        if(ev.pointerType==='touch'&&document.fullscreenElement!==view)return;
        if(ev.button!==0)return;
        pointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
        if(pointers.size===2){
          const pts=[...pointers.values()];pinch={distance:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)};
          last=null;return;
        }
        if(this._studioCardCamera?.zoom<=1 && document.fullscreenElement!==view)return;
        last={x:ev.clientX,y:ev.clientY,id:ev.pointerId};
        view.setPointerCapture?.(ev.pointerId);
      });
      root.addEventListener('pointermove',ev=>{
        const view=currentView();
        if(!view||!pointers.has(ev.pointerId))return;
        const old=pointers.get(ev.pointerId);
        pointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
        if(pointers.size===2 && document.fullscreenElement===view){
          const pts=[...pointers.values()],distance=Math.max(1,Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y));
          if(pinch){const center={clientX:(pts[0].x+pts[1].x)/2,clientY:(pts[0].y+pts[1].y)/2};zoom(distance/pinch.distance,center);}
          pinch={distance};dragged=true;return;
        }
        if(last?.id!==ev.pointerId)return;
        const dx=ev.clientX-last.x,dy=ev.clientY-last.y;
        if(Math.abs(dx)+Math.abs(dy)>1){const rect=view.getBoundingClientRect(),{width,height}=dimensions();
          this._studioCardCamera=viewport.pan(this._studioCardCamera,dx,dy,rect.width,rect.height,width,height);
          dragged=true;updateCardCamera.call(this);}
        last={x:ev.clientX,y:ev.clientY};
      });
      const end=ev=>{pointers.delete(ev.pointerId);if(!pointers.size){last=null;pinch=null;}};
      root.addEventListener('pointerup',end);root.addEventListener('pointercancel',end);
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
      '.ss-grid{display:grid;grid-template-columns:var(--ss-left,180px) 7px minmax(0,1fr) 7px var(--ss-right,310px);flex:1;min-height:0;height:100%}'+
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
      '.ss-canvas{position:relative;min-width:0;min-height:0;overflow:hidden;background:#101820;padding:0;outline:0;touch-action:none}'+
      '.ss-stage{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab}'+
      '.ss-svg{display:block;width:100%;height:100%;max-width:none;max-height:none;padding:0;touch-action:none;background:#101820}'+
      '.ss-settings,.ss-help{position:absolute;top:60px;right:15px;z-index:15;background:var(--card-background-color,#263340);border:1px solid var(--divider-color,#64768c);box-shadow:0 12px 35px #0009;border-radius:9px;padding:16px;width:min(340px,calc(100vw - 35px));max-height:calc(100vh - 90px);overflow:auto}'+
      '.ss-settings[hidden],.ss-help[hidden]{display:none}'+
      '.ss-settings label{display:grid;gap:5px;font-size:12px;margin-bottom:10px}'+
      '.ss-settings input{width:100%;box-sizing:border-box;padding:8px;border-radius:7px;background:var(--secondary-background-color,#18222e);color:var(--primary-text-color);border:1px solid var(--divider-color,#555)}'+
      '.ss-help table{width:100%;border-collapse:collapse;font-size:12px}.ss-help td{padding:7px 5px;border-bottom:1px solid var(--divider-color,#555)}'+
      '.ss-help kbd{font:inherit;background:var(--secondary-background-color,#18222e);border:1px solid #53667a;padding:2px 5px;border-radius:4px}'+
      '.ss-bar .ss-viewport-buttons{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.ss-bar .ss-viewport-buttons button{padding:7px 10px}'+
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
      '<button id="ss-delete" type="button">'+esc(L.remove)+'</button>'+
      '<button id="ss-close" type="button">'+esc(L.close)+'</button></div>'+
      '<div class="ss-settings" id="ss-settings" hidden><strong>'+esc(L.canvasSettings)+'</strong>'+
       '<label>'+esc(L.canvasWidth)+' (300–5000)<input type="number" min="300" max="5000" step="1" id="ss-width"></label>'+
       '<label>'+esc(L.canvasHeight)+' (300–5000)<input type="number" min="300" max="5000" step="1" id="ss-height"></label>'+
       '<p class="ss-note">'+esc(L.outside)+'</p>'+
       '<button type="button" id="ss-apply-size">'+esc(L.apply)+'</button></div>'+
       '<div class="ss-help" id="ss-help" hidden><strong>'+esc(L.shortcutTitle)+'</strong>'+
       '<table><tbody>'+
       [['Delete / Backspace','Usuń / Delete'],['← ↑ → ↓','Przesuń o 5 / Move 5'],['Shift + ← ↑ → ↓','Przesuń o 1 / Move 1'],
        ['Rolka / Wheel','Zoom'],['Spacja + przeciągnij / Drag','Przesuń widok / Pan'],
        ['Środkowy przycisk / Middle drag','Przesuń widok / Pan'],
        ['Ctrl + Z','Cofnij / Undo'],['Ctrl + Y / Ctrl + Shift + Z','Ponów / Redo'],
        ['F','Dopasuj / Fit'],['Esc','Odznacz / Deselect'],['?','Pokaż pomoc / Help']].map(row=>
         '<tr><td><kbd>'+esc(row[0])+'</kbd></td><td>'+esc(row[1])+'</td></tr>').join('')+'</tbody></table>'+
       '<p class="ss-note">'+esc(L.shortcutHint)+'</p></div>'+
       '<div class="ss-grid" id="ss-grid"><aside class="ss-library"><h3>'+esc(L.library)+'</h3>'+
      HASSStudioEditorLibrary.render({registry,language:pickLang(this._config,this._hass),esc})+
      '</aside><div class="ss-splitter" data-split="left" role="separator" aria-label="Resize left panel"></div><main class="ss-canvas"><div id="ss-stage" class="ss-stage"></div>'+
      '</main>'+
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
    let selection=null,drag=null,zoom=1,selectedPartId=null,expandedPartId=null;
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
      getSelection:()=>selection,getSelectedPartId:()=>selectedPartId,getExpandedPartId:()=>expandedPartId,variantShape
    });
    const render=()=>{
      stage.innerHTML=canvasSvg(this._config,this._hass,true,selection);
      stage.firstElementChild.style.width=(W*zoom)+'px';
      stage.firstElementChild.style.height=(H*zoom)+'px';
      renderProps();
    };
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
          scale:1,visual:'warmwasser',variant:registry.isVariant(kind,preset)?preset:registry.defaultVariant(kind),label:'',entity:'',burner_entity:'',burner_mode:'auto',solid_fuel:'wood',solid_state:'auto',solid_glow:78,hp_power_entity:'',hp_fan_entity:'',hp_max_rpm:1800,hp_glow:65,gas_draw_entity:'',gas_glow:62,electric_power_entity:'',electric_load_entity:'',electric_max_kw:8,electric_glow:60,pump_entity:'',tank_entity:'',solar_on_delta:6,solar_off_delta:3,burner_on_temp:35,burner_off_temp:32,entities:[],parts:[]};
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
      selection=null;selectedPartId=null;expandedPartId=null;commit(model);render();
    });
    root.querySelectorAll('[data-add]').forEach(button=>button.addEventListener('click',()=>create(button.dataset.add,button.dataset.variant||'')));
    root.querySelectorAll('[data-add-preset]').forEach(button=>button.addEventListener('click',()=>create('boiler',button.dataset.addPreset)));
    properties.addEventListener('change',event=>{
      const el=event.target,key=el.dataset.field;
      if(!key||!selection)return;
      const model=get(),obj=selectedObject(model);if(!obj)return;
      const index=Number(el.dataset.index);
      const val=el.value;
      if(key==='aspect_locked'&&obj.type==='tank'&&obj.variant==='modular'){
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
        selection={type:'pipe',id:hit.dataset.id};selectedPartId=null;
        drag={type:'point',id:hit.dataset.id,index:Number(hit.dataset.point),pointer:event.pointerId};
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
          drag={type:'node',id:obj.id,offsetX:p.x-obj.x,offsetY:p.y-obj.y,pointer:event.pointerId};
        }else{
          const pipe=event.target.closest?.('.ss-pipe');
          if(pipe){setSelected('pipe',pipe.dataset.id);return;}
          selection=null;selectedPartId=null;expandedPartId=null;render();return;
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