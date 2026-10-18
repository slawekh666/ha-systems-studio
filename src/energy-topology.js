/* Logical electrical network model. Geometry and connection topology are separate.
 * Existing hand-drawn points remain authoritative; never autoroute a cable.
 */
const HASSStudioEnergyTopology=(()=>{
 const MAX_PORTS=32,MAX_BUSES=40;
 const ident=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,32}$/.test(v)?v:'';
 const num=(v,lo,hi,d)=>v!==''&&v!=null&&Number.isFinite(Number(v))?Math.max(lo,Math.min(hi,Number(v))):d;
 const role=v=>['grid','source','load','storage','junction','meter','neutral'].includes(v)?v:'neutral';
 const medium=v=>['ac','dc'].includes(v)?v:'ac';
 const port=p=>({id:ident(p?.id),label:String(p?.label||'').slice(0,40),
   medium:medium(p?.medium),x:num(p?.x,0,100,50),y:num(p?.y,0,100,50),
   bus:ident(p?.bus)});
 const electricalType=n=>['power_grid','inverter','building','energy_storage','ev_charger','distribution_board','pump'].includes(n?.type)||
   n?.type==='boiler'&&['electric','electric_modern','heatpump','heatpump_modern'].includes(n?.variant);
 const defaultPorts=n=>{
   if(!electricalType(n))return [];
   const ac=(id,x,y,bus='main')=>({id,label:id,medium:'ac',bus,x,y});
   if(n.type==='building')return [ac('supply',0,50),ac('child',100,50)];
   if(n.type==='distribution_board')return [ac('left1',0,32),ac('left2',0,68),ac('right1',100,32),ac('right2',100,68)];
   if(n.type==='inverter')return [ac('ac',100,55),{id:'pv1',label:'PV1',medium:'dc',bus:'pv1',x:0,y:30},{id:'pv2',label:'PV2',medium:'dc',bus:'pv2',x:0,y:70}];
   if(n.type==='power_grid')return [ac('ac',100,50)];
   return [ac('ac',n.type==='pump'?50:0,50)];
 };
 const ports=n=>(Array.isArray(n?.energy_ports)?n.energy_ports:defaultPorts(n)).slice(0,MAX_PORTS)
   .map(port).filter((p,i,a)=>p.id&&a.findIndex(x=>x.id===p.id)===i);
 const defaults=n=>{
   const type=n?.type;
   return type==='power_grid'?'grid':type==='inverter'?'source':
     type==='energy_storage'?'storage':type==='building'||type==='ev_charger'?'load':
     type==='distribution_board'?'junction':type==='pump'?'load':type==='boiler'&&['electric','electric_modern','heatpump','heatpump_modern'].includes(n?.variant)?'load':'neutral';
 };
 const node=n=>({role:role(n?.energy_role||defaults(n)),ports:ports(n),
   buses:(Array.isArray(n?.energy_buses)?n.energy_buses:[]).slice(0,MAX_BUSES).map(b=>({
     id:ident(b?.id),label:String(b?.label||'').slice(0,40),medium:medium(b?.medium)
   })).filter((b,i,a)=>b.id&&a.findIndex(x=>x.id===b.id)===i)});
 // AC and DC never share an electrical bus, even if an older diagram
 // assigned the same text identifier (for example "main") to both.
 const busKey=(nodeId,p)=>nodeId+':'+p.medium+':'+(p.bus||p.id);
 const end=e=>({node_id:ident(e?.node_id),port_id:ident(e?.port_id)});
 const connection=c=>({start:end(c?.energy_start),end:end(c?.energy_end)});
 const graph=layout=>{
   const nodes=new Map((layout?.nodes||[]).map(n=>[n.id,n]));
   const errors=[],edges=[],junctions=new Map();
   const check=(ref,cid,side)=>{
     if(!ref.node_id&&!ref.port_id)return null;
     const n=nodes.get(ref.node_id);
     if(!n){errors.push({connection:cid,side,reason:'missing_node'});return null;}
     const p=ports(n).find(x=>x.id===ref.port_id);
     if(!p){errors.push({connection:cid,side,reason:'missing_port'});return null;}
     const key=busKey(ref.node_id,p);
     if(!junctions.has(key))junctions.set(key,{node_id:ref.node_id,port_id:p.id,medium:p.medium});
     return {key,medium:p.medium};
   };
   for(const c of layout?.connections||[]){
     if(c.type!=='electric')continue;
     const start=end(c.energy_start),finish=end(c.energy_end);
     if(!start.node_id||!start.port_id||!finish.node_id||!finish.port_id){
       errors.push({connection:c.id,reason:'unconnected_or_missing_endpoints'});
       continue;
     }
     const a=check(start,c.id,'start'),b=check(finish,c.id,'end');
     if(a&&b){
       if(a.medium!==b.medium){errors.push({connection:c.id,reason:'medium_mismatch'});continue;}
       edges.push({id:c.id,from:a.key,to:b.key,medium:a.medium});
     }
   }
   return {edges,errors,junctions:[...junctions.keys()]};
 };

 // Attachments move only the referenced endpoint; manual bends stay untouched.
 const geometry=n=>{
   const renderers={
     power_grid:typeof HASSStudioPowerGrid==='undefined'?null:HASSStudioPowerGrid,
     inverter:typeof HASSStudioInverter==='undefined'?null:HASSStudioInverter,
     energy_storage:typeof HASSStudioEnergyStorage==='undefined'?null:HASSStudioEnergyStorage,
     building:typeof HASSStudioBuilding==='undefined'?null:HASSStudioBuilding,
     ev_charger:typeof HASSStudioEVCharger==='undefined'?null:HASSStudioEVCharger,
     distribution_board:typeof HASSStudioDistributionBoard==='undefined'?null:HASSStudioDistributionBoard
   };
   const renderer=renderers[n.type];
   return renderer?.geometry?.(n)||{x:4,y:3,width:112,height:113};
 };
 const anchor=(n,portId)=>{
   const p=ports(n).find(x=>x.id===portId);if(!p)return null;
   const g=geometry(n),scale=Number(n.scale)||1;
   return {x:Math.round((n.x+(g.x+g.width*p.x/100)*scale)*100)/100,
     y:Math.round((n.y+(g.y+g.height*p.y/100)*scale)*100)/100};
 };
 const locate=(layout,ref)=>{
   const n=(layout.nodes||[]).find(x=>x.id===ref?.node_id);
   return n?anchor(n,ref.port_id):null;
 };
 const moveAttached=(layout,nodeId)=>{
   for(const c of layout.connections||[]){
     if(c.type!=='electric'||c.points?.length<2)continue;
     for(const side of ['start','end']){
       const ref=c['energy_'+side];
       if(ref?.node_id!==nodeId)continue;
       const at=locate(layout,ref);
       if(at)c.points[side==='start'?0:c.points.length-1]=at;
     }
   }
 };
 const attach=(layout,c,side,ref)=>{
   if(c.type!=='electric'||!['start','end'].includes(side)||c.points?.length<2)return false;
   if(!ref?.node_id&&!ref?.port_id){c['energy_'+side]={node_id:'',port_id:''};return true;}
   const n=(layout.nodes||[]).find(x=>x.id===ref.node_id),a=ports(n).find(x=>x.id===ref.port_id);
   if(!n||!a)return false;
   const other=c['energy_'+(side==='start'?'end':'start')];
   if(other?.node_id&&other?.port_id){
     const peer=(layout.nodes||[]).find(x=>x.id===other.node_id);
     const b=ports(peer).find(x=>x.id===other.port_id);
     if(b&&b.medium!==a.medium)return false;
   }
   c['energy_'+side]={node_id:n.id,port_id:a.id};
   c.points[side==='start'?0:c.points.length-1]=anchor(n,a.id);
   return true;
 };
 const nearest=(layout,point,maxDistance=25,mediumFilter=null)=>{
   let best=null,distance=maxDistance;
   for(const n of layout.nodes||[])for(const p of ports(n)){
     if(mediumFilter&&p.medium!==mediumFilter)continue;
     const at=anchor(n,p.id),d=Math.hypot(at.x-point.x,at.y-point.y);
     if(d<distance){distance=d;best={node_id:n.id,port_id:p.id};}
   }
   return best;
 };
 return Object.freeze({MAX_PORTS,MAX_BUSES,ident,role,medium,port,ports,busKey,defaultPorts,electricalType,node,end,connection,graph,
   geometry,anchor,locate,moveAttached,attach,nearest});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioEnergyTopology;
