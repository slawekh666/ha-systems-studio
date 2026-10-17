/* Modular manifold renderer using the editable src/icons/manifold.svg asset.
 * Configuration, HA read-only values and 1–40 circuit placement belong here.
 */
const HASSStudioManifold=(()=>{
  const MAX_CIRCUITS=40;
  const number=(value,min,max,fallback)=>value!==''&&value!=null&&Number.isFinite(Number(value))
    ?Math.max(min,Math.min(max,Number(value))):fallback;
  const f=(v,d=1)=>v===null?'—':Number(v).toFixed(d);
  const defaultCircuit=i=>({
    id:'circuit-'+(i+1),display:true,actuator:true,display_scale:1,
    tempOut:36+(i%3)*.7,tempReturn:28+(i%4)*.4,
    flow:Math.max(.2,1.6+((i%5)-2)*.15),open:65
  });
  const normalize=raw=>{
    const count=Math.round(number(raw?.count,1,MAX_CIRCUITS,5));
    const pitch=number(raw?.pitch,165,400,260);
    const mode=raw?.actuatorMode==='common'?'common':'individual';
    const values=Array.isArray(raw?.circuits)?raw.circuits:[];
    const maximumPanelScale=Math.max(0,...Array.from({length:count},(_,i)=>HASSStudioReadoutScale.factor(values[i]?.display_scale)));
    const sharedScale=HASSStudioReadoutScale.factor(raw?.display_scale);
    const effectivePitch=Math.max(pitch,150*Math.min(1.5,maximumPanelScale*sharedScale)+36);
    return {count,pitch:effectivePitch,requestedPitch:pitch,actuatorMode:mode,display_scale:HASSStudioReadoutScale.factor(raw?.display_scale),mode:raw?.mode==='manual'?'manual':'live',circuits:Array.from({length:count},(_,i)=>{
      const fallback=defaultCircuit(i),v=values[i]||{};
      return {id:fallback.id,display:v.display!==false,actuator:v.actuator!==false,display_scale:HASSStudioReadoutScale.factor(v.display_scale),
        tempOut:v.tempOut===null?null:number(v.tempOut,-30,120,fallback.tempOut),
        tempReturn:v.tempReturn===null?null:number(v.tempReturn,-30,120,fallback.tempReturn),
        flow:v.flow===null?null:number(v.flow,0,8,fallback.flow),open:v.open===null?null:number(v.open,0,100,fallback.open),
        entities:Object.fromEntries(['tempOut','tempReturn','flow','open'].map(k=>[k,typeof v.entities?.[k]==='string'?v.entities[k]:'']))};
    })};
  };
  const geometry=raw=>{
    const c=normalize(raw);
    return {x:0,y:0,width:410+(c.count-1)*c.pitch,height:765,
      centers:Array.from({length:c.count},(_,i)=>205+i*c.pitch)};
  };

  // All visual shapes, gradients, panel labels and editable template text live
  // in src/icons/manifold.svg. This JS only places clones and binds HA values.
  const source=()=>{
    if(typeof HASSStudioIconTemplates==='undefined'||typeof HASSStudioIconTemplates.manifold!=='string')
      throw new Error('Missing manifold.svg in HASSStudioIconTemplates');
    return HASSStudioIconTemplates.manifold.replace(/<g id="mf-preview">[\s\S]*?<\/g>/,'');
  };
  const part=(art,id)=>{
    const opening='<g id="'+id+'">';
    const start=art.indexOf(opening);
    if(start<0||art.indexOf(opening,start+opening.length)!==-1)throw new Error('Missing/duplicate SVG group: '+id);
    const end=art.indexOf('</g>',start+opening.length);
    if(end<0)throw new Error('Unclosed SVG group: '+id);
    return art.slice(start+opening.length,end);
  };
  const instance=(art,id,bindings,circuit)=>{
    let content=part(art,id);
    if(bindings)content=HASSStudioSvg.apply(content,bindings);
    // Duplicated readouts must not share document IDs across circuits.
    return content.replace(/\bid="([^"]+)"/g,(_,name)=>
      'id="mf-c'+circuit+'-'+name+'"');
  };
  const use=(name,x,y,transform='')=>
    '<use href="#'+name+'" transform="translate('+x+' '+y+')'+transform+'"/>';
  const renderStandalone=raw=>{
    const c=normalize(raw),box=geometry(c),xs=box.centers,art=source();
    const railWidth=160+(c.count-1)*c.pitch;
    const plural=c.count===1?'obieg':c.count<5?'obiegi':'obiegów';
    const title=instance(art,'mf-title-template',{
      'mf-title-text':{'font-size':c.count===1?17:c.count===2?21:26},
      'mf-subtitle-text':{text:c.count+' '+plural+' • zasilanie / powrót'}
    },'heading');
    const rails=[230,490].map((y,i)=>[
      use('mf-rail-middle',125,y,' scale('+railWidth+' 1)'),
      use('mf-rail-start',125,y),
      use('mf-rail-end',125+railWidth,y),
      use(i===0?'mf-supply-mark':'mf-return-mark',125,y)
    ].join('')).join('');
    const valves=xs.map((x,i)=>{
      const loop=c.circuits[i];
      const active=c.actuatorMode==='individual'&&loop.actuator;
      return use(active?'mf-valve-actuator':'mf-valve-manual',x,548);
    }).join('');
    const out=xs.map((x,i)=>
      '<g class="mf-outlets" data-circuit="'+(i+1)+'">'+
       use('mf-outlet-upper',x,94)+use('mf-outlet-lower',x,710)+'</g>').join('');
    const meters=xs.map((x,i)=>{
      const loop=c.circuits[i];
      const water=loop.flow===null?0:number(loop.flow/5*58,0,58,0);
      const meter=instance(art,'mf-flowmeter-template',{
        'mf-flow-fill':{y:-27-water,height:water},
        'mf-flow-text':{text:f(loop.flow)+' l/min'}
      },i+1);
      return '<g class="mf-flowmeter" data-circuit="'+(i+1)+'" transform="translate('+x+' 225)">'+meter+'</g>';
    }).join('');
    const displays=xs.map((x,i)=>{
      const loop=c.circuits[i];
      if(!loop.display)return '';
      const panel=instance(art,'mf-display-template',{
        'mf-display-title':{text:'OBIEG '+(i+1)},
        'mf-display-supply':{text:f(loop.tempOut)+'°C'},
        'mf-display-return':{text:f(loop.tempReturn)+'°C'},
        'mf-display-flow':{text:f(loop.flow)+' l/min'},
        'mf-display-open':{text:(loop.open===null?'—':Math.round(loop.open))+'% OTW.'}
      },i+1);
      const scale=Math.max(.4,Math.min(1.5,c.display_scale*loop.display_scale));
      return '<g class="mf-display" data-circuit="'+(i+1)+'" transform="translate('+x+' 418) scale('+scale+')">'+panel+'</g>';
    }).join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+box.width+' '+box.height+
      '" width="'+box.width+'" height="'+box.height+'" role="img" aria-label="Rozdzielacz CO, '+c.count+' obiegów">'+
      art+'<g filter="url(#mf-shadow)">'+rails+out+meters+valves+displays+
      (c.actuatorMode==='common'?use('mf-common-actuator',75,518):'')+'</g>'+
      '<g transform="translate('+(box.width/2)+' 0)">'+title+'</g></svg>';
  };

  const defaults=()=>({count:5,pitch:260,actuatorMode:'individual',display_scale:1,mode:'live',circuits:[]});
  const resolve=(node,h)=>{
    const config=normalize(node?.manifold||node);
    const read=(entity,key)=>{
      const value=HASSStudioHA.reading(h,entity);
      if(!value)return null;
      if((key==='tempOut'||key==='tempReturn')&&!['','°C','C'].includes(value.unit))return null;
      if(key==='flow'&&!['','l/min','L/min'].includes(value.unit))return null;
      if(key==='open'&&!['','%'].includes(value.unit))return null;
      return value.value;
    };
    return {...config,circuits:config.circuits.map(c=>{
      const out={...c};
      if(config.mode==='live')for(const k of ['tempOut','tempReturn','flow','open'])
        out[k]=read(c.entities[k],k);
      return out;
    })};
  };
  const formatValue=(x,decimals=1)=>x===null?'—':Number(x).toFixed(decimals);
  const renderNode=(node,h)=>{
    const c=resolve(node,h),g=geometry(c);
    let xml=renderStandalone(c);
    // Live values have already been resolved; the SVG remains display-only.
    const fragment=HASSStudioSvg.fragment(xml);
    const unique='ssmanifold'+String(node?.id||'test').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,25)+'-';
    return '<svg width="'+g.width*.3+'" height="215" viewBox="0 0 '+g.width+' '+g.height+'" preserveAspectRatio="xMidYMid meet">'+
      HASSStudioSvg.namespaceIds(fragment,unique)+'</svg>';
  };
  const layoutGeometry=node=>{
    const c=normalize(node?.manifold||node),g=geometry(c);
    const width=g.width*.3;
    return {x:0,y:0,width,height:215,centerX:width/2,labelY:229,readingY:244};
  };
  return Object.freeze({render:renderNode,geometry:layoutGeometry,normalize,defaults,resolve,defaultCircuit,MAX_CIRCUITS,renderStandalone});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioManifold;
