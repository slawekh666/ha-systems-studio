/* Data-driven electric flow. Numeric HA power only; no guessed network topology. */
const HASSStudioPowerFlow=(()=>{
 const clamp=(n,a,b,d)=>n!==''&&n!==null&&n!==undefined&&Number.isFinite(Number(n))?Math.max(a,Math.min(b,Number(n))):d;
 const defaults=()=>({flow_power_entity:'',flow_power_mode:'off',flow_power_kw:0,flow_max_kw:10,flow_min_width:1.5,flow_max_width:6,flow_pattern:'dots',flow_power_direction:true});
 const normalize=x=>{
   const d=defaults(),c={...d,...x};
   return {...c,flow_power_entity:typeof c.flow_power_entity==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(c.flow_power_entity)?c.flow_power_entity:'',
    flow_power_mode:['off','ha','manual','balance'].includes(c.flow_power_mode)?c.flow_power_mode:'off',
    flow_power_kw:clamp(c.flow_power_kw,-10000,10000,0),flow_max_kw:clamp(c.flow_max_kw,.1,10000,10),
    flow_min_width:clamp(c.flow_min_width,.5,12,1.5),
    flow_max_width:clamp(c.flow_max_width,.5,16,6),
    flow_pattern:['dots','dashes','arrows'].includes(c.flow_pattern)?c.flow_pattern:'dots',
    flow_power_direction:c.flow_power_direction!==false};
 };
 const measure=(p,h)=>{
   const c=normalize(p);
   if(c.flow_power_mode==='off')return null;
   if(c.flow_power_mode==='manual')return c.flow_power_kw;
   const value=HASSStudioHA.reading(h,c.flow_power_entity);
   return value&&(value.unit==='W'||value.unit==='kW')?(value.unit==='W'?value.value/1000:value.value):null;
 };
 const visual=(pipe,hass,derived=null)=>{
   const c=normalize(pipe),byBalance=c.flow_power_mode==='balance';
   const kw=byBalance?(derived?.available===true?derived.kw:null):measure(c,hass);
   if(c.flow_power_mode==='off')return null;
   const nonzero=kw!==null&&Math.abs(kw)>0.0001;
   const factor=nonzero?Math.min(1,Math.abs(kw)/c.flow_max_kw):0;
   const low=Math.min(c.flow_min_width,c.flow_max_width),hi=Math.max(c.flow_min_width,c.flow_max_width);
   const width=+(low+(hi-low)*factor).toFixed(2);
   const size=+(2+factor*7).toFixed(2);
   const interval=+(Math.max(size+6,18-factor*5)).toFixed(2);
   const reverse=c.flow_power_direction&&kw!==null&&kw<0;
   const direction=byBalance?(kw!==null&&kw<0?'reverse':'forward'):
     reverse?(pipe.flow_direction==='reverse'?'forward':'reverse'):
     (pipe.flow_direction==='reverse'?'reverse':'forward');
   return {known:kw!==null,active:nonzero,kw,width,size,interval,direction,
     pattern:c.flow_pattern,source:byBalance?(derived?.source||'unavailable'):
       c.flow_power_mode==='manual'?'simulation':'ha',
     availability:kw===null?'unavailable':'known'};
 };
 // A seamless dash animation advances exactly one dash+gap period per loop.
 // Hydraulic flows deliberately keep the independent legacy 28-unit cycle.
 const style=v=>{
   const dash=v.pattern==='dots'?v.size:v.size*2;
   const cycle=+(dash+v.interval).toFixed(2);
   return '--ss-flow-width:'+v.width+';--ss-flow-size:'+v.size+
     ';--ss-flow-gap:'+v.interval+';--ss-flow-cycle:-'+cycle+
     ';animation-direction:'+v.direction;
 };
 const arrowPath=(d,w)=>'<path class="ss-power-arrow" d="'+d+'" stroke="#fff" stroke-width="'+w+'" stroke-dasharray="1 17" fill="none"/>';
 return Object.freeze({defaults,normalize,measure,visual,style,arrowPath});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioPowerFlow;