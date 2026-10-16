/* Standalone radiator prototype: preserve the reference SVG as editable source.
 * All controls are visual/read-only; no Home Assistant service calls.
 */
const HASSStudioRadiatorPrototype=(()=>{
 const clamp=(n,lo,hi,def)=>n!==''&&n!=null&&Number.isFinite(Number(n))?Math.max(lo,Math.min(hi,Number(n))):def;
 const state=o=>({temperature:clamp(o?.temperature,20,80,55),valveOpen:clamp(o?.valveOpen,0,100,42),
   glow:clamp(o?.glow,0,100,62),display:o?.display!==false});
 const apply=(svg,opts)=>{
   const o=state(opts);
   if(!svg||svg.localName!=='svg')throw Error('Expected SVG root');
   const $=id=>svg.querySelector('[id="'+id+'"]');
   const setText=(id,text)=>{const el=$(id);if(!el)throw Error('Missing SVG element '+id);el.textContent=text;};
   setText('tempText',Math.round(o.temperature)+'°');
   setText('tempLarge',Math.round(o.temperature)+'°C');
   setText('openText',Math.round(o.valveOpen)+'%');
   setText('openLarge',Math.round(o.valveOpen)+'%');
   // Reference screen is narrow: hide the duplicated right-side numbers and their labels.
   // Ring readings remain legible, and the original editable SVG stays untouched.
   svg.querySelectorAll('text[x="1040"]').forEach(node=>node.setAttribute('visibility','hidden'));
   $('tempLarge').setAttribute('visibility','hidden');
   $('openLarge').setAttribute('visibility','hidden');
   const ring=$('valveRing'),circ=2*Math.PI*44;
   ring.setAttribute('stroke-dasharray',(circ*260/360*o.valveOpen/100).toFixed(2)+' '+circ.toFixed(2));
   for(let i=1;i<=4;i++)$('bar'+i).setAttribute('opacity',o.valveOpen>(i-1)*25?'1':'.18');
   const hue=205-((o.temperature-20)/60)*185;
   for(const id of ['tempText','tempLarge'])$(id).setAttribute('fill','hsl('+Math.max(8,hue)+' 100% 88%)');
   $('displayGroup').setAttribute('visibility',o.display?'visible':'hidden');
   $('displayMountGroup').setAttribute('visibility',o.display?'visible':'hidden');
   // Glow is limited to the screen, not the entire appliance.
   $('displayGroup').style.filter='drop-shadow(0 0 '+(2+o.glow*.05).toFixed(1)+'px rgba(52,185,255,'+(.08+o.glow*.002).toFixed(3)+'))';
   return svg;
 };
 return Object.freeze({apply,state});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioRadiatorPrototype;
