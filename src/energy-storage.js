/* Energy storage — HA read-only SVG visualization and configurable BMS alerts. */
const HASSStudioEnergyStorage=(()=>{
  const FIELDS=['soc','power','soh','voltage','current','temperature','cell_min','cell_max','cell_delta','cycles','bms_alarm'];
  const DEFAULTS={mode:'live',display_scale:1,show_screen:true,min_soc:20,warning_margin:5,
    custom_alarm:false,alarm_soc:20,show_warning:true,show_alarm:true,charge_positive:true,
    animate_charge:true,temp_low_enabled:false,temp_low:0,temp_high_enabled:false,temp_high:50,
    cell_low_enabled:false,cell_low:2.8,cell_high_enabled:false,cell_high:3.65,
    delta_enabled:false,delta_max:100,offline_alarm:true};
  const clamp=(x,lo,hi,d)=>x!==''&&x!=null&&Number.isFinite(Number(x))?Math.max(lo,Math.min(hi,Number(x))):d;
  const cleanEntity=x=>typeof x==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(x)?x:'';
  const defaults=()=>({...DEFAULTS,entities:Object.fromEntries(FIELDS.map(k=>[k,''])),manual:{soc:75,power:1.5}});
  const normalize=node=>{
    const src=node?.energy_storage||node||{},d=defaults();
    const c={...d,...src,mode:src.mode==='manual'?'manual':'live',
      display_scale:HASSStudioReadoutScale.factor(src.display_scale),
      entities:Object.fromEntries(FIELDS.map(k=>[k,cleanEntity(src.entities?.[k])])),
      manual:{soc:clamp(src.manual?.soc,0,100,75),power:clamp(src.manual?.power,-500,500,1.5)}};
    for(const k of ['min_soc','alarm_soc'])c[k]=clamp(src[k],0,100,d[k]);
    c.warning_margin=clamp(src.warning_margin,0,30,d.warning_margin);
    for(const [k,lo,hi] of [['temp_low',-50,100],['temp_high',-50,150],
      ['cell_low',0,5],['cell_high',0,5],['delta_max',0,1000]])c[k]=clamp(src[k],lo,hi,d[k]);
    for(const k of ['custom_alarm','show_warning','show_alarm','charge_positive','animate_charge',
      'temp_low_enabled','temp_high_enabled','cell_low_enabled','cell_high_enabled',
      'delta_enabled','offline_alarm','show_screen'])c[k]=typeof src[k]==='boolean'?src[k]:d[k];
    return c;
  };
  const reading=(h,id,units,min,max)=>{
    const r=HASSStudioHA.reading(h,id);
    return r&&units.includes(r.unit)&&r.value>=min&&r.value<=max?r.value:null;
  };
  const binaryAlarm=(h,id)=>{
    if(!id)return null;
    const e=HASSStudioHA.entity(h,id),state=String(e?.state??'').toLowerCase();
    if(!state||['unknown','unavailable','none'].includes(state))return null;
    if(['on','true','1','alarm','fault','warning','error','critical','active'].includes(state))return true;
    if(['off','false','0','ok','normal','clear','inactive'].includes(state))return false;
    return null;
  };
  const data=(node,h)=>{
    const c=normalize(node),e=c.entities;
    let soc=c.mode==='manual'?c.manual.soc:reading(h,e.soc,['%','percent',''],0,100);
    let power=c.mode==='manual'?c.manual.power:null;
    if(c.mode==='live'){
      const r=HASSStudioHA.reading(h,e.power);
      if(r&&['W','kW'].includes(r.unit))power=r.value/(r.unit==='W'?1000:1);
    }
    const optional={};
    if(c.mode==='live'){
      const defs={
        soh:[['%','percent',''],0,100],voltage:[['V',''],0,1500],
        current:[['A',''],-2000,2000],temperature:[['°C','C',''], -50,150],
        cell_min:[['V',''],0,5],cell_max:[['V',''],0,5],
        cell_delta:[['mV',''],0,1000],cycles:[['','cycles'],0,1000000]
      };
      for(const [key,[units,low,high]] of Object.entries(defs))optional[key]=reading(h,e[key],units,low,high);
      optional.bms_alarm=binaryAlarm(h,e.bms_alarm);
    }else optional.bms_alarm=null;
    if(optional.cell_delta===null&&optional.cell_min!==null&&optional.cell_max!==null)
      optional.cell_delta=Math.max(0,(optional.cell_max-optional.cell_min)*1000);
    const warningThreshold=Math.min(100,c.min_soc+c.warning_margin);
    const criticalThreshold=c.custom_alarm?c.alarm_soc:c.min_soc;
    const missing=c.mode==='live'&&!!e.soc&&soc===null;
    const warnings=[],alarms=[];
    if(soc!==null){
      if(soc<=warningThreshold)warnings.push('Niski SOC');
      if(soc<=criticalThreshold)alarms.push('Alarm SOC');
    }
    if(c.mode==='live'){
      if(c.offline_alarm&&missing)alarms.push('Brak odczytu SOC');
      if(optional.bms_alarm===true)alarms.push('Alarm BMS');
      if(c.temp_low_enabled&&optional.temperature!==null&&optional.temperature<c.temp_low)alarms.push('Niska temperatura');
      if(c.temp_high_enabled&&optional.temperature!==null&&optional.temperature>c.temp_high)alarms.push('Wysoka temperatura');
      if(c.cell_low_enabled&&optional.cell_min!==null&&optional.cell_min<c.cell_low)alarms.push('Niskie napięcie celi');
      if(c.cell_high_enabled&&optional.cell_max!==null&&optional.cell_max>c.cell_high)alarms.push('Wysokie napięcie celi');
      if(c.delta_enabled&&optional.cell_delta!==null&&optional.cell_delta>c.delta_max)warnings.push('Nierówne cele');
    }
    return {c,soc,power,optional,warnings,alarms,warningThreshold,criticalThreshold,
      level:soc===null?0:soc<=0?0:Math.ceil(soc/25),
      state:alarms.length?'alarm':warnings.length?'warning':soc===null?'unknown':'normal'};
  };
  const geometry=()=>({x:0,y:0,width:150,height:150,centerX:75,labelY:164,readingY:177});
  const formatPower=power=>power===null?'—':(power>0?'+':'')+(Math.abs(power)<10?power.toFixed(1):power.toFixed(0))+' kW';
  const render=(node,h)=>{
    const d=data(node,h);
    const source=typeof HASSStudioIconTemplates!=='undefined'?HASSStudioIconTemplates.energyStorage:null;
    if(!source)return '<rect x="20" y="20" width="110" height="120" fill="#7185a4"/>';
    const bindings={
      'battery-soc-text':{text:d.soc===null?'SOC —':'SOC '+Math.round(d.soc)+'%'},
      'battery-power-text':{text:formatPower(d.power)},
      'battery-led':{fill:d.state==='alarm'?'#ff4444':d.state==='warning'?'#ffba42':d.state==='unknown'?'#7e8f9d':'#6cffad'},
      'battery-warning':{visibility:d.c.show_alarm&&d.alarms.length?'visible':'hidden'}
    };
    for(let n=1;n<=4;n++){
      const on=n<=d.level;
      const red=on&&n===1&&d.state!=='normal'&&d.state!=='unknown';
      bindings['battery-segment-'+n]={opacity:on?1:.16};
      bindings['battery-level-fill-'+n]={fill:red?'#e84747':'url(#bat-green)',stroke:red?'#ffb3a3':'#9bffd3'};
      bindings['battery-level-glow-'+n]={fill:red?'#f34a4a':'url(#bat-green)'};
    }
    let svg=HASSStudioSvg.apply(source,bindings);
    if(!d.c.show_screen)svg=svg.replace('<g id="battery-screen">','<g id="battery-screen" visibility="hidden">');
    if(d.c.display_scale!==1)svg=HASSStudioReadoutScale.namedGroup(svg,'battery-screen',150,61,d.c.display_scale);
    if(d.c.animate_charge&&d.power!==null&&(d.c.charge_positive?d.power>0:d.power<0)&&d.level>0&&d.state!=='alarm')
      svg=svg.replace('<g id="battery-charge-cells">','<g id="battery-charge-cells" class="battery-charging">');
    const prefix='ssbattery'+String(node?.id||'preview').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,24)+'-';
    return '<svg x="0" y="0" width="150" height="150" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">'+
      HASSStudioSvg.namespaceIds(svg,prefix)+'</svg>';
  };
  return Object.freeze({FIELDS,defaults,normalize,data,geometry,render,formatPower});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioEnergyStorage;
