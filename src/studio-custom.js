
/* Home Assistant Systems Studio: opt-in custom hydraulic canvas.
 * Legacy Warmwasser renderer remains untouched and remains the default.
 */
(() => {
  const WIDTH = 900, HEIGHT = 540;
  const kinds = ['tank','boiler','solar','pump','valve','sensor'];
  const labels = {
    pl: {mode:'Tryb układu', auto:'Automatyczny (Warmwasser)', custom:'Własny schemat', title:'Edytor schematu',
      add:'Dodaj', remove:'Usuń', hint:'Przeciągaj elementy. Kliknij dwa porty, aby połączyć je rurą.',
      tank:'Zbiornik',boiler:'Kocioł',solar:'Solary',pump:'Pompa',valve:'Zawór',sensor:'Czujnik',
      hot:'Ciepła',cold:'Zimna', source:'Solarna', entity:'Encja HA', name:'Nazwa'},
    en: {mode:'Layout mode',auto:'Automatic (Warmwasser)',custom:'Custom layout',title:'Layout editor',
      add:'Add',remove:'Delete',hint:'Drag elements. Click two ports to connect them with a pipe.',
      tank:'Tank',boiler:'Boiler',solar:'Solar',pump:'Pump',valve:'Valve',sensor:'Sensor',
      hot:'Hot',cold:'Cold',source:'Solar',entity:'HA entity',name:'Name'}
  };
  const tr = (h) => String(h?.language||'').startsWith('pl') ? labels.pl : labels.en;
  const num = (v, max, fallback) => Number.isFinite(Number(v)) ? Math.max(0,Math.min(max,Number(v))) : fallback;
  const norm = (cfg) => {
    const v = cfg?.studio_layout || {};
    const nodes = (Array.isArray(v.nodes)?v.nodes:[]).filter(n=>n && kinds.includes(n.type) && typeof n.id==='string')
      .slice(0,50).map(n=>({id:n.id.slice(0,32), type:n.type, x:num(n.x,WIDTH-112,50),
        y:num(n.y,HEIGHT-100,50),label:String(n.label||'').slice(0,64),
        entity:isEnt(n.entity)?n.entity:''}));
    const ids = new Set(nodes.map(n=>n.id));
    const ports = ['left','right','top','bottom'];
    const edges = (Array.isArray(v.edges)?v.edges:[]).filter(e=>e && e.from && e.to &&
      ids.has(e.from.node) && ids.has(e.to.node) && e.from.node!==e.to.node &&
      ports.includes(e.from.port) && ports.includes(e.to.port)).slice(0,100).map(e=>({
        from:{node:e.from.node,port:e.from.port},to:{node:e.to.node,port:e.to.port},
        color:['hot','cold','source'].includes(e.color)?e.color:'hot'
      }));
    return {nodes,edges};
  };
  const anchors = {left:[0,42],right:[112,42],top:[56,0],bottom:[56,84]};
  const xy = (n,p) => [n.x+anchors[p][0],n.y+anchors[p][1]];
  const route = (a,b,p) => (p==='left'||p==='right') ?
    'M'+a[0]+' '+a[1]+'H'+((a[0]+b[0])/2)+'V'+b[1]+'H'+b[0] :
    'M'+a[0]+' '+a[1]+'V'+((a[1]+b[1])/2)+'H'+b[0]+'V'+b[1];
  const palette = {hot:'#e77b53',cold:'#519dc9',source:'#e4b145'};
  const symbol = (t) => {
    if(t==='tank')return '<rect x="38" y="6" width="36" height="70" rx="13" fill="url(#studioTank)" stroke="#b7c5ce" stroke-width="2"/>';
    if(t==='boiler')return '<rect x="27" y="14" width="58" height="55" rx="7" fill="#485665" stroke="#b0bdc9"/><path d="M54 61Q39 49 56 30Q51 47 64 44Q75 57 54 61Z" fill="#ee8750"/>';
    if(t==='solar')return '<path d="M20 25H90L80 66H11Z" fill="#327ea9" stroke="#b8d9ee" stroke-width="2"/><path d="M36 25L28 66M57 25L49 66M76 25L68 66" stroke="#b8d9ee" stroke-width="2"/>';
    if(t==='pump')return '<circle cx="56" cy="42" r="25" fill="#485d70" stroke="#bdd0dc" stroke-width="2"/><path d="M47 27L72 42L47 57Z" fill="#e6f0f4"/>';
    if(t==='valve')return '<path d="M18 27L56 42L18 57ZM94 27L56 42L94 57Z" fill="#52677b" stroke="#b4c4d2" stroke-width="2"/><circle cx="56" cy="42" r="8" fill="#ebad5c"/>';
    return '<circle cx="56" cy="42" r="25" fill="#465c71" stroke="#c6d4df" stroke-width="2"/><path d="M56 24V48" stroke="white" stroke-width="4"/><circle cx="56" cy="56" r="7" fill="#f0a85a"/>';
  };
  function draw(cfg,hass,edit=false,selected='',pending=null) {
    const layout = norm(cfg), L=tr(hass), byId=new Map(layout.nodes.map(n=>[n.id,n]));
    const pipes=layout.edges.map((e,i)=>{
      const a=byId.get(e.from.node),b=byId.get(e.to.node);
      const d=route(xy(a,e.from.port),xy(b,e.to.port),e.from.port);
      return '<g class="studio-edge" data-edge="'+i+'"><path d="'+d+'" stroke="#142635" stroke-width="10"/>'+
        '<path d="'+d+'" stroke="'+palette[e.color]+'" stroke-width="7"/></g>';
    }).join('');
    const items=layout.nodes.map(n=>{
      const reading=n.entity ? (hass?.states?.[n.entity]?.state ?? '—') : '';
      const ports=edit?Object.keys(anchors).map(p=>'<circle class="studio-port" data-id="'+esc(n.id)+
        '" data-port="'+p+'" cx="'+anchors[p][0]+'" cy="'+anchors[p][1]+
        '" r="7" fill="'+(pending?.node===n.id&&pending?.port===p?'#efb341':'#f8fafc')+
        '" stroke="#2874a3" stroke-width="2"/>').join(''):'';
      return '<g class="studio-node" data-id="'+esc(n.id)+'" transform="translate('+n.x+' '+n.y+')">'+
        '<rect width="112" height="84" rx="10" fill="var(--card-background-color,#2a3645)" stroke="'+
        (selected===n.id?'#41b8fd':'#8497a7')+'" stroke-width="'+(selected===n.id?3:1.5)+'"/>'+
        symbol(n.type)+
        '<text x="56" y="-6" font-size="11" text-anchor="middle" fill="var(--primary-text-color,#eee)">'+esc(n.label||L[n.type])+'</text>'+
        (reading?'<text x="56" y="97" text-anchor="middle" font-size="11" fill="var(--primary-text-color,#eee)">'+esc(reading)+'</text>':'')+
        ports+'</g>';
    }).join('');
    return '<svg class="studio-svg" viewBox="0 0 '+WIDTH+' '+HEIGHT+'" xmlns="http://www.w3.org/2000/svg">'+
      '<defs><linearGradient id="studioTank" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#dc7651"/><stop offset="1" stop-color="#4e96c7"/></linearGradient></defs>'+
      '<rect width="'+WIDTH+'" height="'+HEIGHT+'" rx="8" fill="var(--secondary-background-color,#15212c)"/>'+
      '<g fill="none" stroke-linecap="round" stroke-linejoin="round">'+pipes+'</g>'+items+'</svg>';
  }
  const oldRender=WarmwasserSchemaCard.prototype._render;
  WarmwasserSchemaCard.prototype._render=function(){
    if(this._cfg?.layout_mode!=='custom')return oldRender.call(this);
    return '<div class="kopf"><div class="l"><div class="t1">'+esc(this._cfg.titel||'Home Assistant Systems Studio')+
      '</div></div></div>'+draw(this._cfg,this._hass);
  };
  const oldSchema=WarmwasserSchemaCardEditor.prototype._mainSchema;
  WarmwasserSchemaCardEditor.prototype._mainSchema=function(){
    const L=tr(this._hass);
    return [F_('layout_mode',sel.opt([['automatic',L.auto],['custom',L.custom]])),...oldSchema.call(this)];
  };
  const oldSet=WarmwasserSchemaCardEditor.prototype.setConfig;
  WarmwasserSchemaCardEditor.prototype.setConfig=function(cfg){
    const old=this._config?.layout_mode||'automatic';
    oldSet.call(this,cfg);
    if(old!==(this._config?.layout_mode||'automatic')&&this._forms)this._build();
  };
  const oldBuild=WarmwasserSchemaCardEditor.prototype._build;
  WarmwasserSchemaCardEditor.prototype._build=function(){
    oldBuild.call(this);
    if(this._config?.layout_mode!=='custom')return;
    this._studioPanel();
  };
  WarmwasserSchemaCardEditor.prototype._studioPanel=function(){
    const L=tr(this._hass), host=this.shadowRoot.getElementById('w');
    if(!host)return;
    const section=document.createElement('section');
    section.innerHTML='<style>.studio-wrap{padding:12px;margin:12px 0;border:1px solid var(--divider-color);border-radius:10px}'+
      '.studio-tools{display:flex;gap:7px;flex-wrap:wrap;margin:9px 0}.studio-tools input,.studio-tools button,.studio-tools select{font:inherit;min-width:60px;padding:6px;border:1px solid var(--divider-color);border-radius:6px;background:var(--card-background-color);color:var(--primary-text-color)}'+
      '.studio-svg{width:100%;height:auto;touch-action:none}.studio-node{cursor:grab}.studio-port{cursor:crosshair}'+
      '.studio-wrap p{color:var(--secondary-text-color);font-size:12px}</style>'+
      '<div class="studio-wrap"><strong>'+esc(L.title)+'</strong><p>'+esc(L.hint)+'</p>'+
      '<div class="studio-tools"><select id="studio-kind">'+kinds.map(t=>'<option value="'+t+'">'+esc(L[t])+'</option>').join('')+
      '</select><button type="button" id="studio-add">'+esc(L.add)+'</button><select id="studio-pipe">'+
      ['hot','cold','source'].map(c=>'<option value="'+c+'">'+esc(L[c])+'</option>').join('')+
      '</select><button type="button" id="studio-remove">'+esc(L.remove)+'</button></div>'+
      '<div class="studio-tools"><label>'+esc(L.name)+' <input id="studio-label" maxlength="64" /></label>'+
      '<label>'+esc(L.entity)+' <input id="studio-entity" placeholder="sensor..." /></label></div>'+
      '<div id="studio-stage"></div></div>';
    host.insertBefore(section,host.firstChild);
    const stage=section.querySelector('#studio-stage'), label=section.querySelector('#studio-label'), entity=section.querySelector('#studio-entity');
    let selected='',pending=null,drag=null;
    const layout=()=>norm(this._config);
    const change=(v)=>{this._config={...this._config,studio_layout:v};this._fire();};
    const render=()=>{stage.innerHTML=draw(this._config,this._hass,true,selected,pending);};
    const refreshFields=()=>{
      const n=layout().nodes.find(n=>n.id===selected);
      label.value=n?.label||'';entity.value=n?.entity||'';
      label.disabled=entity.disabled=!n;
    };
    const pos=(event,svg)=>{
      const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;
      const m=svg.getScreenCTM();return m?p.matrixTransform(m.inverse()):{x:0,y:0};
    };
    const paint=(value)=>{
      const s=stage.querySelector('svg');if(!s)return;
      for(const n of value.nodes){
        const g=[...s.querySelectorAll('.studio-node')].find(el=>el.dataset.id===n.id);
        if(g)g.setAttribute('transform','translate('+n.x+' '+n.y+')');
      }
      for(const g of s.querySelectorAll('.studio-edge')){
        const e=value.edges[Number(g.dataset.edge)];
        const a=value.nodes.find(n=>n.id===e?.from.node),b=value.nodes.find(n=>n.id===e?.to.node);
        if(!a||!b)continue;
        const d=route(xy(a,e.from.port),xy(b,e.to.port),e.from.port);
        g.querySelectorAll('path').forEach(p=>p.setAttribute('d',d));
      }
    };
    section.querySelector('#studio-add').addEventListener('click',()=>{
      const v=layout();if(v.nodes.length>=50)return;
      let i=1;while(v.nodes.some(n=>n.id==='n'+i))i++;
      const id='n'+i;
      v.nodes.push({id,type:section.querySelector('#studio-kind').value,
        x:60+(v.nodes.length%5)*150,y:80+Math.floor(v.nodes.length/5)*110,label:'',entity:''});
      selected=id;pending=null;change(v);render();refreshFields();
    });
    section.querySelector('#studio-remove').addEventListener('click',()=>{
      if(!selected)return;const v=layout();
      v.nodes=v.nodes.filter(n=>n.id!==selected);
      v.edges=v.edges.filter(e=>e.from.node!==selected&&e.to.node!==selected);
      selected='';pending=null;change(v);render();refreshFields();
    });
    for(const [input,key] of [[label,'label'],[entity,'entity']]){
      input.addEventListener('change',()=>{
        const v=layout(),n=v.nodes.find(n=>n.id===selected);if(!n)return;
        n[key]=key==='entity' ? (isEnt(input.value.trim())?input.value.trim():'') : input.value.slice(0,64);
        change(v);render();refreshFields();
      });
    }
    stage.addEventListener('pointerdown',(event)=>{
      const port=event.target.closest?.('.studio-port');
      if(port){
        const endpoint={node:port.dataset.id,port:port.dataset.port};
        if(pending && pending.node!==endpoint.node){
          const v=layout();if(v.edges.length<100)v.edges.push({from:pending,to:endpoint,color:section.querySelector('#studio-pipe').value});
          pending=null;change(v);
        }else pending=pending?null:endpoint;
        render();return;
      }
      const nEl=event.target.closest?.('.studio-node');if(!nEl)return;
      selected=nEl.dataset.id;refreshFields();
      const n=layout().nodes.find(n=>n.id===selected);if(!n)return;
      const s=stage.querySelector('svg'),p=pos(event,s);
      drag={id:selected,dx:p.x-n.x,dy:p.y-n.y,pointer:event.pointerId};
      s.setPointerCapture(event.pointerId);
    });
    stage.addEventListener('pointermove',(event)=>{
      if(!drag||event.pointerId!==drag.pointer)return;
      const v=layout(),n=v.nodes.find(n=>n.id===drag.id),s=stage.querySelector('svg');
      if(!n||!s)return;
      const p=pos(event,s);
      n.x=num(Math.round((p.x-drag.dx)/5)*5,WIDTH-112,0);
      n.y=num(Math.round((p.y-drag.dy)/5)*5,HEIGHT-100,0);
      this._config={...this._config,studio_layout:v};paint(v);
    });
    const end=(event)=>{
      if(!drag||event.pointerId!==drag.pointer)return;
      drag=null;change(layout());render();refreshFields();
    };
    stage.addEventListener('pointerup',end);
    stage.addEventListener('pointercancel',end);
    render();refreshFields();
  };
})();
