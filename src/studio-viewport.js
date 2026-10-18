/* Shared, dependency-free diagram viewport calculations. View state never enters studio_layout. */
const HASSStudioViewport=(()=>{
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const dimension=(v,fallback)=>Number.isFinite(Number(v)) && Number(v)>=300 && Number(v)<=5000?Math.round(Number(v)):fallback;
  const dimensions=config=>{
    const layout=config?.studio_layout||{};
    // Existing saved layouts used 1200x720. Only newly created empty layouts use 1200x700.
    const existing=Array.isArray(layout.nodes)||Array.isArray(layout.connections);
    return {width:dimension(layout.width,1200),height:dimension(layout.height,existing?720:700)};
  };
  const fresh=(w,h)=>({cx:w/2,cy:h/2,zoom:1,autoFit:true});
  const box=(camera,clientW,clientH,w,h,margin=1)=>{
    const usableW=Math.max(1,clientW),usableH=Math.max(1,clientH);
    const fit=Math.min(usableW/w,usableH/h);
    const scale=fit*clamp(camera.zoom,.2,8)/margin;
    const width=usableW/scale,height=usableH/scale;
    return {x:camera.cx-width/2,y:camera.cy-height/2,width,height};
  };
  const worldAt=(camera,px,py,clientW,clientH,w,h,margin=1)=>{
    const b=box(camera,clientW,clientH,w,h,margin);
    return {x:b.x+px/clientW*b.width,y:b.y+py/clientH*b.height};
  };
  const zoomAt=(camera,factor,px,py,clientW,clientH,w,h,margin=1)=>{
    const anchor=worldAt(camera,px,py,clientW,clientH,w,h,margin);
    const nextZoom=clamp(camera.zoom*factor,.2,8);
    const next={...camera,zoom:nextZoom,autoFit:false};
    const after=worldAt(next,px,py,clientW,clientH,w,h,margin);
    next.cx+=anchor.x-after.x;next.cy+=anchor.y-after.y;
    return next;
  };
  const pan=(camera,dx,dy,clientW,clientH,w,h,margin=1)=>{
    const b=box(camera,clientW,clientH,w,h,margin);
    return {...camera,cx:camera.cx-dx*b.width/clientW,cy:camera.cy-dy*b.height/clientH,autoFit:false};
  };
  return Object.freeze({dimensions,dimension,fresh,box,worldAt,zoomAt,pan});
})();
