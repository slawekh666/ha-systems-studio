/* Uniform SVG readout scaling used by all device renderers with separate data panels.
 * Geometry and typography share the exact same transform: no nonuniform scaling.
 */
const HASSStudioReadoutScale=(()=>{
  const factor=(value,fallback=1)=>{
    const n=Number(value);
    return value!==''&&value!=null&&Number.isFinite(n)?Math.max(.4,Math.min(1.5,n)):fallback;
  };
  // Move to anchor, scale all children (including glyphs), then restore origin.
  const around=(x,y,s)=>'translate('+x+' '+y+') scale('+s+') translate('+(-x)+' '+(-y)+')';
  const box=(x,y,width,height,scale,anchorX=x,anchorY=y)=>{
    const s=factor(scale);
    return {x:anchorX+(x-anchorX)*s,y:anchorY+(y-anchorY)*s,width:width*s,height:height*s};
  };
  const union=(a,b)=>{
    if(!b)return {...a};
    const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);
    return {x,y,width:Math.max(a.x+a.width,b.x+b.width)-x,height:Math.max(a.y+a.height,b.y+b.height)-y};
  };
  // Namespaced SVG assets retain their group suffixes; keep any existing transform.
  const namedGroup=(markup,id,centerX,centerY,value)=>{
    const scale=factor(value);
    if(scale===1)return markup;
    const re=/<g\b[^>]*\bid="([^"]+)"[^>]*>/g;
    let count=0;
    const result=markup.replace(re,(tag,found)=>{
      if(found!==id&&!found.endsWith(id))return tag;
      count++;
      const t=around(centerX,centerY,scale);
      return /\btransform="[^"]*"/.test(tag)
        ?tag.replace(/\btransform="([^"]*)"/,(_,existing)=>'transform="'+t+' '+existing+'"')
        :tag.slice(0,-1)+' transform="'+t+'">';
    });
    return count===1?result:markup;
  };
  return Object.freeze({factor,around,box,union,namedGroup});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioReadoutScale;
