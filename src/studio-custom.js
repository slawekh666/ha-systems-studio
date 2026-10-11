/* Home Assistant Systems Studio - Custom Designer v0.3 (opt-in).
 * Based on Warmwasser Schema Card. The original automatic renderer stays intact.
 * No external dependencies or service calls in the designer.
 */
(() => {
  const W=1200,H=720,MAX_NODES=60,MAX_PIPES=80;
  const types=['boiler','tank','solar','pump','valve','sensor','pipe'];
  const graphics={
    boiler:['wood','pellet','gas','oil','electric','heatpump'],
    tank:['stratified','buffer','coil','dual_coil','hygiene','combi'],
    solar:['flat','tube'],pump:['circulation','inline'],
    valve:['two_way','three_way'],sensor:['temperature','pressure']
  };
  const variants={
    pl:{wood:'Drewno',pellet:'Pellet',gas:'Gaz',oil:'Olej',electric:'Elektryczny',heatpump:'Pompa ciepła',
      stratified:'Warstwowy',buffer:'Bufor',coil:'Jedna wężownica',dual_coil:'Dwie wężownice',
      hygiene:'Higieniczny',combi:'Kombi',flat:'Płaskie',tube:'Próżniowe',
      circulation:'Obiegowa',inline:'Przelotowa',two_way:'Dwudrogowy',three_way:'Trójdrogowy',
      temperature:'Temperatura',pressure:'Ciśnienie'},
    en:{wood:'Wood',pellet:'Pellet',gas:'Gas',oil:'Oil',electric:'Electric',heatpump:'Heat pump',
      stratified:'Stratified',buffer:'Buffer',coil:'Single coil',dual_coil:'Dual coil',
      hygiene:'Hygienic',combi:'Combi',flat:'Flat plate',tube:'Vacuum tubes',
      circulation:'Circulation',inline:'Inline',two_way:'Two-way',three_way:'Three-way',
      temperature:'Temperature',pressure:'Pressure'}
  };
  const words={
    pl:{visual:'Wygląd grafiki',flowMode:'Animacja przepływu',flowOff:'Wyłączona',
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
    en:{visual:'Graphic style',flowMode:'Flow animation',flowOff:'Off',
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
  const colors={hot:'#ed835a',cold:'#57a6db',solar:'#e5b35e',return:'#778cbe'};
  const icons={boiler:'♨',tank:'▤',solar:'☼',pump:'◉',valve:'◇',sensor:'♧',pipe:'〰'};
  const pickLang=(config,hass)=>{
    const setting=config?.studio_language;
    return setting==='pl'||setting==='en'?setting:
      (String(hass?.language||'').toLowerCase().startsWith('pl')?'pl':'en');
  };
  const clamp=(n,lo,hi,fallback)=>Number.isFinite(Number(n))?Math.max(lo,Math.min(hi,Number(n))):fallback;
  const validEntity=(value)=>typeof value==='string' && isEnt(value);
  const freshId=(prefix)=>prefix+Math.random().toString(36).slice(2,10);
  const normalizeItem=(item)=>({
    id:String(item.id||freshId('i')).slice(0,32),
    kind:['sensor','heater','coil'].includes(item.kind)?item.kind:'sensor',
    label:String(item.label||'').slice(0,64),
    side:['left','right','inside'].includes(item.side)?item.side:'left',
    height:clamp(item.height,0,100,50),
    entity:validEntity(item.entity)?item.entity:''
  });
  const normalizeAccessory=(item)=>({
    id:String(item.id||freshId('a')).slice(0,32),
    type:item.type==='valve'?'valve':'pump',
    position:clamp(item.position,0,100,50),
    entity:validEntity(item.entity)?item.entity:''
  });
  const normalized=(config)=>{
    const source=config?.studio_layout||{};
    const nodes=(Array.isArray(source.nodes)?source.nodes:[]).filter(v=>v && graphics[v.type] &&
      typeof v.id==='string').slice(0,MAX_NODES).map(v=>({
      id:v.id.slice(0,32),type:v.type,
      x:clamp(v.x,0,W-120,40),y:clamp(v.y,0,H-140,40),
      scale:clamp(v.scale,0.5,2.4,1),
      visual:v.visual==='studio'?'studio':'warmwasser',
      variant:graphics[v.type].includes(v.variant)?v.variant:graphics[v.type][0],
      label:String(v.label||'').slice(0,64),
      entity:validEntity(v.entity)?v.entity:'',
      entities:(Array.isArray(v.entities)?v.entities:[]).slice(0,20).map(e=>({
        entity:validEntity(e.entity)?e.entity:'',label:String(e.label||'').slice(0,64)})),
      parts:(Array.isArray(v.parts)?v.parts:[]).slice(0,20).map(normalizeItem)
    }));
    const pipes=(Array.isArray(source.pipes)?source.pipes:[]).slice(0,MAX_PIPES).map(v=>({
      id:String(v.id||freshId('p')).slice(0,32),
      label:String(v.label||'').slice(0,64),
      color:colors[v.color]?v.color:'hot',width:clamp(v.width,3,14,7),
      flow_mode:['auto','on','off'].includes(v.flow_mode)?v.flow_mode:'auto',
      flow_entity:validEntity(v.flow_entity)?v.flow_entity:'',
      flow_direction:v.flow_direction==='reverse'?'reverse':'forward',
      flow_speed:clamp(v.flow_speed,.35,5,1),
      points:(Array.isArray(v.points)?v.points:[]).slice(0,30).map(q=>({
        x:clamp(q.x,0,W,100),y:clamp(q.y,0,H,100)})),
      accessories:(Array.isArray(v.accessories)?v.accessories:[]).slice(0,20).map(normalizeAccessory)
    })).filter(v=>v.points.length>=2);
    // Preserve pipes created in the previous prototype when opening their layout.
    if(!Array.isArray(source.pipes) && Array.isArray(source.edges)){
      const byId=new Map(nodes.map(n=>[n.id,n]));
      const ports={left:[0,42],right:[112,42],top:[56,0],bottom:[56,84]};
      source.edges.slice(0,MAX_PIPES).forEach((edge,index)=>{
        const from=byId.get(edge?.from?.node),to=byId.get(edge?.to?.node);
        const a=ports[edge?.from?.port],b=ports[edge?.to?.port];
        if(!from||!to||!a||!b)return;
        const ax=from.x+a[0]*from.scale,ay=from.y+a[1]*from.scale;
        const bx=to.x+b[0]*to.scale,by=to.y+b[1]*to.scale;
        const mx=(ax+bx)/2;
        pipes.push({id:'migrated-'+index,label:'',color:colors[edge.color]?edge.color:'hot',
          width:7,flow_mode:'auto',flow_entity:'',flow_direction:'forward',flow_speed:1,
          points:[{x:ax,y:ay},{x:mx,y:ay},{x:mx,y:by},{x:bx,y:by}],accessories:[]});
      });
    }
    return {nodes,pipes};
  };
  const valueOf=(h,entity)=>{
    const state=validEntity(entity)?h?.states?.[entity]:null;
    return state && !['unknown','unavailable'].includes(state.state)
      ?String(state.state)+(state.attributes?.unit_of_measurement?' '+state.attributes.unit_of_measurement:''):'';
  };
  const pipePath=(points)=>points.map((point,i)=>(i?'L':'M')+point.x+' '+point.y).join(' ');
  const onPipe=(pipe,t)=>{
    const points=pipe.points, segments=[];
    let total=0;
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.y-a.y);
      segments.push(length);total+=length;
    }
    let remaining=total*clamp(t,0,100,50)/100;
    for(let i=1;i<points.length;i++){
      const length=segments[i-1];if(remaining<=length||i===points.length-1){
        const a=points[i-1],b=points[i],factor=length?remaining/length:0;
        return {x:a.x+(b.x-a.x)*factor,y:a.y+(b.y-a.y)*factor};
      }
      remaining-=length;
    }
    return points[0];
  };
  const variantShape=(node)=>{
    const v=node.variant;
    if(node.type==='tank'){
      let parts='<rect x="38" y="5" width="44" height="102" rx="17" fill="url(#ssTank)" stroke="#d3dfe6" stroke-width="2"/>';
      if(['coil','dual_coil','hygiene','combi'].includes(v))
        parts+='<path d="M46 60 Q73 49 73 62 Q73 71 46 75 Q41 81 68 86" fill="none" stroke="#f3c17c" stroke-width="3"/>';
      if(v==='dual_coil'||v==='combi')
        parts+='<path d="M46 23 Q73 15 73 29 Q73 39 46 43" fill="none" stroke="#f3c17c" stroke-width="3"/>';
      if(v==='stratified')parts+='<path d="M42 61H78" stroke="#dfebf2" stroke-opacity=".7" stroke-dasharray="4 3"/>';
      node.parts.forEach(part=>{
        const yy=101-(part.height/100)*93;
        const x=part.side==='left'?36:part.side==='right'?84:60;
        if(part.kind==='sensor')parts+='<circle cx="'+x+'" cy="'+yy+'" r="5" fill="#f4c078" stroke="#273b4c" stroke-width="1.6"/>';
        if(part.kind==='heater')parts+='<path d="M'+(x-10)+' '+yy+'h20m-16 -6v12m8 -12v12" stroke="#f8db92" stroke-width="3" fill="none"/>';
        if(part.kind==='coil')parts+='<path d="M'+(x-13)+' '+yy+'q7 -12 14 0t14 0" stroke="#f0cc93" stroke-width="3" fill="none"/>';
      });
      return parts;
    }
    if(node.type==='boiler'){
      let extra='';
      if(v==='wood'||v==='pellet')extra='<path d="M56 88Q39 74 59 49Q51 68 67 66Q84 83 56 88Z" fill="#ef8651"/>';
      if(v==='gas'||v==='oil')extra='<path d="M60 52Q39 77 61 88Q83 77 60 52Z" fill="#70b6ed"/>';
      if(v==='electric')extra='<path d="M64 48L48 74H59L53 92L78 64H64Z" fill="#f4c45f"/>';
      if(v==='heatpump')extra='<circle cx="60" cy="70" r="22" fill="none" stroke="#92c4e8" stroke-width="4"/><path d="M48 61L75 71L48 82Z" fill="#92c4e8"/>';
      return '<rect x="24" y="19" width="72" height="83" rx="8" fill="#465869" stroke="#b5c3ce" stroke-width="2"/>'+extra;
    }
    if(node.type==='solar')
      return v==='tube'
        ?'<g fill="#438eb9" stroke="#c4e4f5" stroke-width="2">'+[23,43,63,83].map(x=>'<rect x="'+x+'" y="30" width="13" height="68" rx="6"/>').join('')+'</g>'
        :'<path d="M25 27H100L85 100H10Z" fill="#337fac" stroke="#c4e4f5" stroke-width="2"/><path d="M44 27L30 100M67 27L54 100M88 27L76 100" stroke="#b7d5eb" stroke-width="2"/>';
    if(node.type==='pump')return '<circle cx="60" cy="65" r="30" fill="#425b71" stroke="#c3d1dc" stroke-width="2"/><path d="M48 44L81 65L48 86Z" fill="#e5edf5"/>';
    if(node.type==='valve')return '<path d="M13 42L60 66L13 90ZM107 42L60 66L107 90Z" fill="#527086" stroke="#b4c7d6" stroke-width="2"/>'+
      (v==='three_way'?'<path d="M39 104L60 66L81 104Z" fill="#527086" stroke="#b4c7d6" stroke-width="2"/>':'')+
      '<circle cx="60" cy="66" r="9" fill="#efc06e"/>';
    return '<circle cx="60" cy="64" r="28" fill="#47647a" stroke="#c0d2de" stroke-width="2"/>'+
      '<path d="M60 38V70" stroke="#ecf2f5" stroke-width="5"/><circle cx="60" cy="79" r="9" fill="#f2bb74"/>';
  };
  const symbolOnPipe=(item,pipe,hass)=>{
    const at=onPipe(pipe,item.position),isPump=item.type==='pump';
    const enabled=HASSStudioGraphics.on(hass,item.entity);
    return '<g transform="translate('+at.x+' '+at.y+')" class="ss-accessory" data-pipe="'+esc(pipe.id)+'">'+
      '<circle r="17" fill="#405669" stroke="'+(enabled?'#68c69b':'#d7e5ee')+'" stroke-width="2"/>'+ 
      (isPump&&enabled?'<circle class="ss-pump-pulse" r="17" fill="none" stroke="#68c69b"/>':'')+
      (isPump?'<path d="M-7 -10L10 0L-7 10Z" fill="#dceaf3"/>':
        '<path d="M-11 -8L0 0L-11 8ZM11 -8L0 0L11 8Z" fill="#e2c78d"/>')+
      '</g>';
  };
  const canvasSvg=(config,hass,editable=false,selected=null)=>{
    const data=normalized(config),language=pickLang(config,hass),L=words[language];
    const wwDefs=data.nodes.filter(node=>node.visual==='warmwasser')
      .map(node=>HASSStudioGraphics.defs(node,hass)).join('');
    const pipes=data.pipes.map(pipe=>{
      const active=selected?.type==='pipe' && selected.id===pipe.id;
      const d=pipePath(pipe.points);
      const flowing=pipe.flow_mode==='on'||(pipe.flow_mode==='auto' &&
        HASSStudioGraphics.on(hass,pipe.flow_entity));
      const flow=flowing?'<path class="ss-line ss-flow" d="'+d+'" style="--ss-speed:'+pipe.flow_speed+
        's;animation-direction:'+pipe.flow_direction+'"/>':'';
      const handles=editable&&active?pipe.points.map((pt,index)=>
        '<circle class="ss-handle" data-id="'+esc(pipe.id)+'" data-point="'+index+
        '" cx="'+pt.x+'" cy="'+pt.y+'" r="8" fill="#fff" stroke="#2196f3" stroke-width="2"/>').join(''):'';
      return '<g class="ss-pipe" data-id="'+esc(pipe.id)+'">'+
        '<path class="ss-pipe-hit" d="'+d+'" stroke="transparent" stroke-width="24" fill="none"/>'+
        '<path class="ss-line" d="'+d+'" stroke="#142332" stroke-width="'+(pipe.width+3)+'" fill="none"/>'+
        '<path class="ss-line" d="'+d+'" stroke="'+colors[pipe.color]+'" stroke-width="'+pipe.width+'" fill="none"/>'+
        flow+pipe.accessories.map(item=>symbolOnPipe(item,pipe,hass)).join('')+handles+'</g>';
    }).join('');
    const nodes=data.nodes.map(node=>{
      const active=selected?.type==='node'&&selected.id===node.id;
      const reading=valueOf(hass,node.entity);
      const name=esc(node.label||L[node.type]||node.type);
      const ent=node.entity?' data-more="'+esc(node.entity)+'"':'';
      return '<g class="ss-node" data-id="'+esc(node.id)+'"'+ent+' transform="translate('+node.x+' '+node.y+') scale('+node.scale+')">'+
        '<rect x="4" y="6" width="112" height="107" rx="12" fill="var(--card-background-color,#293947)" stroke="'+
        (active?'#52bfff':'#718da3')+'" stroke-width="'+(active?'3':'1.2')+'"/>'+(node.visual==='warmwasser'?HASSStudioGraphics.render(node,hass):variantShape(node))+
        '<text x="60" y="130" text-anchor="middle" fill="var(--primary-text-color,#e5eef5)" font-size="12">'+name+'</text>'+
        (reading?'<text x="60" y="145" text-anchor="middle" font-size="11" fill="#7ed3ef">'+esc(reading)+'</text>':'')+
        '</g>';
    }).join('');
    return '<svg class="ss-svg" viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="System diagram">'+
      HASSStudioGraphics.styles+'<defs>'+wwDefs+'<linearGradient id="ssTank" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e7845c"/><stop offset="1" stop-color="#4a8dbd"/></linearGradient></defs>'+
      '<rect width="'+W+'" height="'+H+'" rx="10" fill="var(--secondary-background-color,#17222d)"/>'+
      '<g stroke-linecap="round" stroke-linejoin="round">'+pipes+'</g>'+nodes+'</svg>';
  };
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
      '.ss-props{border-right:none;border-left:1px solid var(--divider-color,#555)}'+
      '.ss-library h3,.ss-props h3{font-size:12px;letter-spacing:.06em;color:var(--secondary-text-color);margin:0 0 12px}'+
      '.ss-library button{display:flex;align-items:center;gap:12px;width:100%;margin-bottom:8px;text-align:left;font-size:13px}'+
      '.ss-library button span{font-size:19px;display:inline-block;width:24px;text-align:center}'+
      '.ss-canvas{min-width:0;min-height:0;overflow:auto;background:var(--secondary-background-color,#18222e);padding:16px}'+
      '.ss-stage{width:max-content;max-width:none}.ss-svg{display:block;width:1200px;height:720px;max-height:none;padding:0;touch-action:none}'+
      '.ss-node{cursor:grab}.ss-pipe-hit{cursor:pointer;pointer-events:stroke}.ss-handle{cursor:move}.ss-accessory{pointer-events:none}'+
      '.ss-props section{border-top:1px solid var(--divider-color,#555);padding:12px 0;display:grid;gap:10px}'+
      '.ss-props section:first-of-type{border-top:0}.ss-props h4{margin:0;font-size:13px}'+
      '.ss-props p,.ss-note{font-size:12px;color:var(--secondary-text-color)}'+
      '.ss-props .ss-row{display:flex;align-items:center;gap:6px}.ss-props .ss-row>*{flex:1;min-width:0}'+
      '.ss-props .ss-row button{flex:0 0 auto}.ss-props input[type=range]{padding:0}'+
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
      types.map(type=>'<button type="button" data-add="'+type+'"><span aria-hidden="true">'+icons[type]+'</span>'+
        esc(L[type==='pump'?'pumps':type==='valve'?'valves':type==='sensor'?'sensorsMenu':type==='pipe'?'pipes':type])+'</button>').join('')+
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
    const entityList=()=>{
      const states=this._hass?.states||{};
      return Object.keys(states).sort().slice(0,2000).map(id=>
        '<option value="'+esc(id)+'" label="'+esc(states[id]?.attributes?.friendly_name||id)+'"></option>').join('');
    };
    const field=(name,key,val,type='text',optsList=null,extra='')=>{
      const attr=extra?' '+extra:'';
      const input=optsList?
        '<select data-field="'+key+'">'+opts(optsList,String(val??''))+'</select>':
        '<input data-field="'+key+'" type="'+type+'" value="'+esc(val??'')+'"'+attr+'/>';
      return '<label>'+esc(name)+input+'</label>';
    };
    const entityField=(value,kind,index)=>{
      return '<input type="search" list="ss-entity-list" data-field="'+kind+'"'+
        (index!==undefined?' data-index="'+index+'"':'')+
        ' value="'+esc(value||'')+'" placeholder="sensor..." autocomplete="off"/>';
    };
    const variantOptions=(node)=>graphics[node.type].map(key=>[key,variants[pickLang(this._config,this._hass)][key]]);
    const styleOptions=[['warmwasser','Warmwasser (default)'],['studio','Studio (simple)']];
    const sides=[['left',L.left],['right',L.right],['inside',L.inside]];
    const colorsList=[['hot',L.hot],['cold',L.cold],['solar',L.solarFlow],['return',L.returnFlow]];
    const renderProps=()=>{
      const model=get(),obj=selectedObject(model);
      let markup='<h3>'+esc(L.properties)+'</h3>';
      if(!obj){properties.innerHTML=markup+'<p>'+esc(L.choose)+'</p>';return;}
      markup+='<section>'+field(L.name,'label',obj.label);
      if(selection.type==='node'){
        markup+=field(L.graphic,'variant',obj.variant,'text',variantOptions(obj));
        markup+=field(L.visual||'Graphic style','visual',obj.visual,'text',styleOptions);
        markup+='<div class="ss-preview"><svg viewBox="0 0 120 120" width="120" height="120">'+
          HASSStudioGraphics.styles+'<defs>'+HASSStudioGraphics.defs(obj,this._hass)+'</defs>'+
          (obj.visual==='warmwasser'?HASSStudioGraphics.render(obj,this._hass):variantShape(obj))+'</svg></div>';
        markup+=field(L.scale,'scale',obj.scale,'range',null,'min="0.5" max="2.4" step="0.1"');
        markup+='<div class="ss-row">'+field('X','x',obj.x,'number')+field('Y','y',obj.y,'number')+'</div>';
        markup+=field(L.entity,'entity',obj.entity,'search',null,'list="ss-entity-list"');
        markup+='</section><section><h4>'+esc(L.entities)+'</h4>'+
          obj.entities.map((en,index)=>'<div class="ss-row">'+
            entityField(en.entity,'multiEntity',index)+
            '<button type="button" data-delete-entity="'+index+'">×</button></div>'+
            field(L.label,'multiLabel',en.label,'text',null,'data-index="'+index+'"')).join('')+
          '<button type="button" data-action="entity">'+esc(L.addEntity)+'</button></section>';
        if(obj.type==='tank'){
          markup+='<section><h4>'+esc(L.sensors)+'</h4>'+
          obj.parts.map((item,index)=>'<div class="ss-row"><strong>'+esc((L[item.kind]||item.kind)+' '+(index+1))+'</strong>'+
            '<button type="button" data-delete-part="'+index+'">×</button></div>'+
            field(L.graphic,'partKind',item.kind,'text',
              [['sensor',L.sensor],['heater',L.heater],['coil',L.coil]],'data-index="'+index+'"')+
            field(L.side,'partSide',item.side,'text',sides,'data-index="'+index+'"')+
            field(L.height,'partHeight',item.height,'number',null,
              'min="0" max="100" data-index="'+index+'"')+
            '<label>'+esc(L.entity)+entityField(item.entity,'partEntity',index)+'</label>'
          ).join('')+
          '<div class="ss-row">'+[['sensor',L.sensor],['heater',L.heater],['coil',L.coil]].map(v=>
            '<button type="button" data-add-part="'+v[0]+'">+ '+esc(v[1])+'</button>').join('')+'</div></section>';
        }
      }else{
        markup+=field(L.pipeColor,'color',obj.color,'text',colorsList);
        markup+=field(L.pipeWidth,'width',obj.width,'range',null,'min="3" max="14" step="1"');
        markup+=field(L.flowMode||'Flow animation','flow_mode',obj.flow_mode,'text',
          [['off',L.flowOff||'Off'],['auto',L.flowAuto||'Entity-controlled'],['on',L.flowOn||'On (preview)']]);
        markup+=field(L.flowDirection||'Flow direction','flow_direction',obj.flow_direction,'text',
          [['forward',L.forward||'Start → End'],['reverse',L.reverse||'End → Start']]);
        markup+=field(L.flowSpeed||'Animation duration (s)','flow_speed',obj.flow_speed,'number',null,'min="0.35" max="5" step="0.1"');
        markup+=field(L.flowEntity||'Animation state entity','flow_entity',obj.flow_entity,'search',null,'list="ss-entity-list"');
        markup+='<p>'+esc(L.pipeHelp)+'</p><div class="ss-row">'+
          '<button type="button" data-action="bend">+ '+esc(L.newBend)+'</button>'+
          '<button type="button" data-action="unbend">'+esc(L.removeBend)+'</button></div></section>'+
          '<section><h4>'+esc(L.accessories)+'</h4>'+
          obj.accessories.map((a,index)=>
            '<div class="ss-row"><strong>'+esc(L[a.type]||a.type)+'</strong>'+
            '<button type="button" data-delete-accessory="'+index+'">×</button></div>'+
            field(L.accessoryPos,'accessoryPos',a.position,'range',null,
              'min="0" max="100" step="1" data-index="'+index+'"')+
            '<label>'+esc(L.entity)+entityField(a.entity,'accessoryEntity',index)+'</label>').join('')+
          '<div class="ss-row"><button type="button" data-add-accessory="pump">+ '+esc(L.pump)+'</button>'+
          '<button type="button" data-add-accessory="valve">+ '+esc(L.valve)+'</button></div></section>';
      }
      properties.innerHTML=markup+'<datalist id="ss-entity-list">'+entityList()+'</datalist>';
      // Every entity field gets an HA-like search list from the first typed character.
      const popup=document.createElement('div');
      popup.className='ss-entities';popup.hidden=true;
      properties.appendChild(popup);
      const inputs=[...properties.querySelectorAll('input[list="ss-entity-list"]')];
      for(const input of inputs){
        const update=()=>{
          const search=input.value.trim().toLocaleLowerCase();
          if(!search){popup.hidden=true;return;}
          const matches=Object.entries(this._hass?.states||{}).filter(([entity,state])=>
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
        group.querySelectorAll('path').forEach(el=>el.setAttribute('d',d));
        group.querySelectorAll('.ss-handle').forEach(el=>{
          const p=pipe.points[Number(el.dataset.point)];
          if(p){el.setAttribute('cx',p.x);el.setAttribute('cy',p.y);}
        });
        group.querySelectorAll('.ss-accessory').forEach((el,i)=>{
          const accessory=pipe.accessories[i];
          if(accessory){const p=onPipe(pipe,accessory.position);
            el.setAttribute('transform','translate('+p.x+' '+p.y+')');}
        });
      }
    };
    const create=(kind)=>{
      const model=get();
      if(kind==='pipe'){
        if(model.pipes.length>=MAX_PIPES)return;
        const n=model.pipes.length;
        const pipe={id:freshId('p'),label:'',color:'hot',width:7,
          flow_mode:'auto',flow_entity:'',flow_direction:'forward',flow_speed:1,
          points:[{x:180+n*10,y:120+n*12},{x:470+n*10,y:120+n*12}],accessories:[]};
        model.pipes.push(pipe);selection={type:'pipe',id:pipe.id};
      }else{
        if(model.nodes.length>=MAX_NODES)return;
        const n=model.nodes.length;
        const node={id:freshId('n'),type:kind,x:80+(n%6)*170,y:100+Math.floor(n/6)*170,
          scale:1,visual:'warmwasser',variant:graphics[kind][0],label:'',entity:'',entities:[],parts:[]};
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
    properties.addEventListener('change',event=>{
      const el=event.target,key=el.dataset.field;
      if(!key||!selection)return;
      const model=get(),obj=selectedObject(model);if(!obj)return;
      const index=Number(el.dataset.index);
      const val=el.value;
      if(['x','y','scale','width','flow_speed'].includes(key)){
        obj[key]=clamp(val,key==='scale'?0.5:key==='width'?3:key==='flow_speed'?0.35:0,
          key==='scale'?2.4:key==='width'?14:key==='flow_speed'?5:key==='x'?W:H,obj[key]);
      }else if(['label','variant','color','entity','visual','flow_mode','flow_direction','flow_entity'].includes(key)){
        if(key==='entity'||key==='flow_entity')obj[key]=validEntity(val)?val:'';
        else if(key==='visual')obj.visual=val==='studio'?'studio':'warmwasser';
        else if(key==='flow_mode')obj.flow_mode=['on','off','auto'].includes(val)?val:'auto';
        else if(key==='flow_direction')obj.flow_direction=val==='reverse'?'reverse':'forward';
        else if(key==='variant')obj.variant=graphics[obj.type]?.includes(val)?val:obj.variant;
        else if(key==='color')obj.color=colors[val]?val:obj.color;
        else obj.label=val.slice(0,64);
      }else if(key==='multiEntity'&&obj.entities[index])obj.entities[index].entity=validEntity(val)?val:'';
      else if(key==='multiLabel'&&obj.entities[index])obj.entities[index].label=val.slice(0,64);
      else if(key.startsWith('part')&&obj.parts?.[index]){
        const part=obj.parts[index];
        if(key==='partKind')part.kind=['sensor','heater','coil'].includes(val)?val:part.kind;
        if(key==='partSide')part.side=['left','right','inside'].includes(val)?val:part.side;
        if(key==='partHeight')part.height=clamp(val,0,100,part.height);
        if(key==='partEntity')part.entity=validEntity(val)?val:'';
      }else if(key==='accessoryPos'&&obj.accessories[index])
        obj.accessories[index].position=clamp(val,0,100,50);
      else if(key==='accessoryEntity'&&obj.accessories[index])
        obj.accessories[index].entity=validEntity(val)?val:'';
      commit(model);render();
    });
    properties.addEventListener('click',event=>{
      const button=event.target.closest('button');
      if(!button||!selection)return;
      const model=get(),obj=selectedObject(model);if(!obj)return;
      const index=Number(button.dataset.deletePart||button.dataset.deleteAccessory||button.dataset.deleteEntity);
      if(button.hasAttribute('data-delete-part'))obj.parts.splice(index,1);
      else if(button.hasAttribute('data-delete-accessory'))obj.accessories.splice(index,1);
      else if(button.hasAttribute('data-delete-entity'))obj.entities.splice(index,1);
      else if(button.dataset.addPart){
        if(obj.parts.length>=20)return;
        obj.parts.push({id:freshId('i'),kind:button.dataset.addPart,label:'',
          side:'left',height:50,entity:''});
      }else if(button.dataset.addAccessory){
        if(obj.accessories.length>=20)return;
        obj.accessories.push({id:freshId('a'),type:button.dataset.addAccessory,position:50,entity:''});
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