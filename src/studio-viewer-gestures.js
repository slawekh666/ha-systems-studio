/* Standalone Home Assistant Systems Studio viewport gestures.
 * Keep ordinary taps/clicks unmodified so HA entity history still opens.
 * Capture pointers only after crossing the drag threshold.
 */
const HASSStudioViewerGestures=(()=>{
  const install=({root,host,viewport,getView,getDimensions,getCamera,setCamera,
    win=window,doc=document})=>{
    const pointers=new Map();
    let dragging=false,center=null,distance=null,capturedId=null,suppressClick=null;
    let tracking=false;
    const viewInPath=event=>event.composedPath().some(el=>el?.id==='ss-card-viewport');
    const fullscreen=()=>doc.fullscreenElement===getView();
    const interactive=()=>fullscreen()||(getCamera()?.zoom||1)>1.0001;
    const rectAndSize=()=>{
      const view=getView();
      if(!view)return null;
      const svg=view.querySelector('svg');
      const rect=(svg||view).getBoundingClientRect();
      return {rect,w:Math.max(1,rect.width),h:Math.max(1,rect.height),...getDimensions()};
    };
    const pointOf=(event,rect)=>({x:event.clientX-rect.left,y:event.clientY-rect.top});
    const zoom=(factor,event)=>{
      const v=rectAndSize();
      if(!v)return;
      const at=event?pointOf(event,v.rect):{x:v.w/2,y:v.h/2};
      setCamera(viewport.zoomAt(getCamera(),factor,at.x,at.y,v.w,v.h,v.width,v.height));
    };
    const fit=()=>{
      const {width,height}=getDimensions();
      setCamera(viewport.fresh(width,height));
    };
    const onClick=event=>{
      const action=event.composedPath().find(el=>el?.dataset?.viewAction)?.dataset.viewAction;
      if(action){
        event.preventDefault();event.stopPropagation();
        if(action==='in')zoom(1.25);
        if(action==='out')zoom(.8);
        if(action==='fit')fit();
        if(action==='full'){
          const view=getView();
          if(doc.fullscreenElement===view)doc.exitFullscreen?.();
          else view?.requestFullscreen?.();
        }
        return;
      }
      // A drag may generate a synthetic click. Block that gesture, not the next
      // intentional tap (and never a toolbar action).
      if(suppressClick){
        const s=suppressClick;suppressClick=null;
        if(Date.now()<s.until && Number.isFinite(event.clientX) &&
          Math.hypot(event.clientX-s.x,event.clientY-s.y)<24){
          event.preventDefault();event.stopImmediatePropagation();return;
        }
      }
      // Without a drag, do not interfere with native data-more -> hass-more-info.
    };
    const onWheel=event=>{
      if(!viewInPath(event)||!fullscreen())return;
      event.preventDefault();zoom(event.deltaY<0?1.15:1/1.15,event);
    };
    const startTracking=()=>{
      if(tracking)return;
      tracking=true;
      win.addEventListener('pointermove',onMove,{passive:false});
      win.addEventListener('pointerup',onEnd);
      win.addEventListener('pointercancel',onCancel);
      win.addEventListener('blur',onCancel);
    };
    const stopTracking=()=>{
      if(!tracking)return;
      tracking=false;
      win.removeEventListener('pointermove',onMove);
      win.removeEventListener('pointerup',onEnd);
      win.removeEventListener('pointercancel',onCancel);
      win.removeEventListener('blur',onCancel);
    };
    const onDown=event=>{
      if(!viewInPath(event)||
        event.composedPath().some(el=>el?.dataset?.viewAction)||
        (event.pointerType!=='touch'&&event.button!==0)||
        !interactive())return;
      pointers.set(event.pointerId,{startX:event.clientX,startY:event.clientY,
        x:event.clientX,y:event.clientY,kind:event.pointerType});
      startTracking();
      if(pointers.size===2){
        const [a,b]=[...pointers.values()];
        center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
        distance=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));
      }
    };
    const onMove=event=>{
      const previous=pointers.get(event.pointerId);
      if(!previous)return;
      const next={...previous,x:event.clientX,y:event.clientY};
      pointers.set(event.pointerId,next);
      const v=rectAndSize();
      if(!v)return;
      if(pointers.size===2){
        const [a,b]=[...pointers.values()];
        const nextCenter={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
        const nextDistance=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));
        if(center&&distance){
          const shift=Math.hypot(nextCenter.x-center.x,nextCenter.y-center.y);
          const ratio=nextDistance/distance;
          if(dragging||shift>=3||Math.abs(ratio-1)>.012){
            let cam=viewport.pan(getCamera(),nextCenter.x-center.x,nextCenter.y-center.y,
              v.w,v.h,v.width,v.height);
            const at=pointOf({clientX:nextCenter.x,clientY:nextCenter.y},v.rect);
            cam=viewport.zoomAt(cam,ratio,at.x,at.y,v.w,v.h,v.width,v.height);
            dragging=true;setCamera(cam);
            if(event.cancelable)event.preventDefault();
          }
        }
        center=nextCenter;distance=nextDistance;
        return;
      }
      center=null;distance=null;
      const dx=next.x-previous.x,dy=next.y-previous.y;
      const movement=Math.hypot(next.x-next.startX,next.y-next.startY);
      if(!dragging && movement<(next.kind==='touch'?7:4))return;
      if(!dragging){
        dragging=true;
        // The stable custom card host survives HA state-driven SVG refreshes.
        // Capturing on pointerdown would steal an ordinary data-more click.
        if(next.kind==='mouse'&&host?.setPointerCapture){
          try{host.setPointerCapture(event.pointerId);capturedId=event.pointerId;}
          catch(_error){capturedId=null;}
        }
      }
      const camera=viewport.pan(getCamera(),dx,dy,v.w,v.h,v.width,v.height);
      setCamera(camera);
      if(event.cancelable)event.preventDefault();
    };
    const finish=(event)=>{
      if(!pointers.has(event.pointerId))return;
      pointers.delete(event.pointerId);
      if(capturedId===event.pointerId){
        try{if(host.hasPointerCapture?.(capturedId))host.releasePointerCapture(capturedId);}
        catch(_error){}
        capturedId=null;
      }
      if(!pointers.size){
        if(dragging && event.type!=='pointercancel')
          suppressClick={x:event.clientX,y:event.clientY,until:Date.now()+600};
        dragging=false;center=null;distance=null;
        stopTracking();
      }else{
        const items=[...pointers.values()];
        if(items.length===1){
          // Do not introduce a jump on the first move after a pinch.
          items[0].startX=items[0].x;items[0].startY=items[0].y;
        }
      }
    };
    const onEnd=event=>finish(event);
    const onCancel=event=>{
      if(event.pointerId!=null)finish(event);
      else{
        pointers.clear();dragging=false;center=null;distance=null;
        stopTracking();
      }
    };
    const onFullscreenChange=()=>setCamera(getCamera());
    root.addEventListener('click',onClick,true);
    root.addEventListener('wheel',onWheel,{passive:false});
    root.addEventListener('pointerdown',onDown);
    doc.addEventListener?.('fullscreenchange',onFullscreenChange);
    return ()=>{
      stopTracking();pointers.clear();
      root.removeEventListener('click',onClick,true);
      root.removeEventListener('wheel',onWheel);
      root.removeEventListener('pointerdown',onDown);
      doc.removeEventListener?.('fullscreenchange',onFullscreenChange);
    };
  };
  return Object.freeze({install});
})();
