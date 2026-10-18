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
 const ports=n=>(Array.isArray(n?.energy_ports)?n.energy_ports:[]).slice(0,MAX_PORTS)
   .map(port).filter((p,i,a)=>p.id&&a.findIndex(x=>x.id===p.id)===i);
 const defaults=n=>{
   const type=n?.type;
   return type==='power_grid'?'grid':type==='inverter'?'source':
     type==='energy_storage'?'storage':type==='building'||type==='ev_charger'?'load':
     type==='distribution_board'?'junction':'neutral';
 };
 const node=n=>({role:role(n?.energy_role||defaults(n)),ports:ports(n),
   buses:(Array.isArray(n?.energy_buses)?n.energy_buses:[]).slice(0,MAX_BUSES).map(b=>({
     id:ident(b?.id),label:String(b?.label||'').slice(0,40),medium:medium(b?.medium)
   })).filter((b,i,a)=>b.id&&a.findIndex(x=>x.id===b.id)===i)});
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
     const key=ref.node_id+':'+(p.bus||p.id);
     if(!junctions.has(key))junctions.set(key,{node_id:ref.node_id,port_id:p.id,medium:p.medium});
     return {key,medium:p.medium};
   };
   for(const c of layout?.connections||[]){
     if(c.type!=='electric')continue;
     const a=check(end(c.energy_start),c.id,'start'),b=check(end(c.energy_end),c.id,'end');
     if(a&&b){
       if(a.medium!==b.medium){errors.push({connection:c.id,reason:'medium_mismatch'});continue;}
       edges.push({id:c.id,from:a.key,to:b.key,medium:a.medium});
     }
   }
   return {edges,errors,junctions:[...junctions.keys()]};
 };
 return Object.freeze({MAX_PORTS,MAX_BUSES,ident,role,medium,port,ports,node,end,connection,graph});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioEnergyTopology;
