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
   // New storage offers both physical media. Existing saved energy_ports
   // remain unchanged and retain their original AC wiring.
   if(n.type==='energy_storage')return [ac('ac',0,50),
     {id:'dc',label:'DC',medium:'dc',bus:'battery',x:100,y:50}];
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
   // Per-graph, lazy index: repeated electrical endpoints share normalized ports.
   const portsByNode=new Map();
   const indexedPort=(n,id)=>{
     let byId=portsByNode.get(n.id);
     if(!byId){
       byId=new Map(ports(n).map(p=>[p.id,p]));
       portsByNode.set(n.id,byId);
     }
     return byId.get(id);
   };
   const check=(ref,cid,side)=>{
     if(!ref.node_id&&!ref.port_id)return null;
     const n=nodes.get(ref.node_id);
     if(!n){errors.push({connection:cid,side,reason:'missing_node'});return null;}
     const p=indexedPort(n,ref.port_id);
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


 // Single connectivity index for BOTH AC and DC, sharing one validated
 // graph and one union-find implementation. No cross-medium electrical edge,
 // geometry inference, persistent cache, or mutation of the user's wiring.
 const index=(layout,existingGraph=null)=>{
   const topology=existingGraph||graph(layout),parent=new Map();
   const find=key=>{
     if(!parent.has(key))parent.set(key,key);
     const p=parent.get(key);
     if(p!==key)parent.set(key,find(p));
     return parent.get(key);
   };
   for(const edge of topology.edges){
     const a=find(edge.from),b=find(edge.to);
     if(a!==b)parent.set(b,a);
   }
   // Keep the original resolver's network IDs and ordering.
   const grouped=new Map();
   for(const edge of topology.edges){
     const root=find(edge.from);
     if(!grouped.has(root))grouped.set(root,{
       id:root,medium:edge.medium,connection_ids:[],ports:new Set(),devices:[]
     });
     const group=grouped.get(root);
     group.connection_ids.push(edge.id);
     group.ports.add(edge.from);group.ports.add(edge.to);
   }
   const keyGroup=new Map(),byMedium={ac:[],dc:[]},edgesByMedium={ac:[],dc:[]};
   for(const edge of topology.edges)edgesByMedium[edge.medium].push(edge);
   for(const group of grouped.values()){
     byMedium[group.medium].push(group);
     for(const key of group.ports)keyGroup.set(key,group);
   }
   // Direct device relationships are read-only graph observations.
   // They are available for later PV/battery auto-discovery, but do not
   // imply a converter or infer energy transfer across AC and DC.
   const nodesById=new Map((layout?.nodes||[]).map(n=>[n.id,n])),
     portsByNode=new Map(),linksByNode=new Map(),edgesById=new Map();
   for(const edge of topology.edges){
     if(!edgesById.has(edge.id))edgesById.set(edge.id,[]);
     edgesById.get(edge.id).push(edge);
   }
   const getPort=(id,portId)=>{
     const n=nodesById.get(id);
     if(!n)return null;
     if(!portsByNode.has(id))
       portsByNode.set(id,new Map(ports(n).map(p=>[p.id,p])));
     return portsByNode.get(id).get(portId)||null;
   };
   const add=(nodeId,link)=>{
     if(!linksByNode.has(nodeId))linksByNode.set(nodeId,[]);
     linksByNode.get(nodeId).push(link);
   };
   for(const cable of layout?.connections||[]){
     if(cable.type!=='electric')continue;
     const edges=edgesById.get(cable.id)||[];
     // Duplicate IDs are inherently ambiguous: fail closed for discovery.
     if(edges.length!==1)continue;
     const start=end(cable.energy_start),finish=end(cable.energy_end),
       a=getPort(start.node_id,start.port_id),
       b=getPort(finish.node_id,finish.port_id);
     if(!a||!b||a.medium!==b.medium)continue;
     const from=busKey(start.node_id,a),to=busKey(finish.node_id,b),
       edge=edges[0],group=keyGroup.get(from);
     if(edge.from!==from||edge.to!==to||edge.medium!==a.medium||
       !group||keyGroup.get(to)!==group)continue;
     add(start.node_id,{connection_id:cable.id,medium:a.medium,
       node_id:start.node_id,port_id:a.id,port_bus_key:from,
       peer_node_id:finish.node_id,peer_type:nodesById.get(finish.node_id)?.type||'',
       peer_port_id:b.id,peer_bus_key:to,network_id:group.id});
     add(finish.node_id,{connection_id:cable.id,medium:b.medium,
       node_id:finish.node_id,port_id:b.id,port_bus_key:to,
       peer_node_id:start.node_id,peer_type:nodesById.get(start.node_id)?.type||'',
       peer_port_id:a.id,peer_bus_key:from,network_id:group.id});
   }
   const result={graph:topology,grouped,keyGroup,byMedium,edgesByMedium,
     linksByNode,nodesById};
   // Ephemeral bindings from validated AC/DC endpoints, never serialized.
   result.attachments=discoverAttachments(result);
   return result;
 };

 // Resolve connected electrical media and terminal ports from one indexed
 // graph. Neither node names nor port IDs (including "ac") determine medium.
 // Multiple DC feeds or mixed AC/DC storage attachments fail closed.
 const discoverAttachments=idx=>{
   const storages=new Map(),inverters=new Map(),
     linksOf=id=>idx.linksByNode.get(id)||[];
   const unique=(links,key)=>{
     const values=[...new Set(links.map(key))];
     return values.length===1?values[0]:null;
   };
   // Storage first: cross-check the physical opposite end of inverter links.
   for(const n of idx.nodesById.values()){
     if(n.type!=='energy_storage')continue;
     const links=linksOf(n.id),ac=links.filter(x=>x.medium==='ac'),
       dc=links.filter(x=>x.medium==='dc');
     let status='unconnected',port_id='',network_id=null,inverter_id='';
     if(ac.length&&dc.length)status='ambiguous';
     else if(dc.length){
       // A parallel feed is not automatically a single metering boundary.
       if(dc.length===1&&dc[0].peer_type==='inverter'){
         status='dc';port_id=dc[0].port_id;
         network_id=dc[0].network_id;inverter_id=dc[0].peer_node_id;
       }else status='ambiguous';
     }else if(ac.length){
       const port=unique(ac,x=>x.port_id),network=unique(ac,x=>x.network_id);
       if(port&&network){status='ac';port_id=port;network_id=network;}
       else status='ambiguous';
     }
     storages.set(n.id,{status,port_id,network_id,inverter_id});
   }
   for(const n of idx.nodesById.values()){
     if(n.type!=='inverter')continue;
     const links=linksOf(n.id),ac=links.filter(x=>x.medium==='ac'),
       batteries=links.filter(x=>x.medium==='dc'&&x.peer_type==='energy_storage'),
       pv=links.filter(x=>{
         if(x.medium!=='dc')return false;
         const peer=idx.nodesById.get(x.peer_node_id);
         return peer?.type==='pv_source'||peer?.energy_role==='source'&&
           peer.type!=='inverter';
       });
     const acPort=unique(ac,x=>x.port_id),
       acAmbiguous=ac.length>0&&!acPort;
     const linked=batteries.length===1?batteries[0]:null,
       counterpart=linked?storages.get(linked.peer_node_id):null,
       batteryValid=!!linked&&counterpart?.status==='dc'&&
         counterpart.inverter_id===n.id&&
         counterpart.port_id===linked.peer_port_id&&
         counterpart.network_id===linked.network_id;
     const batteryAmbiguous=batteries.length>1||
       batteries.length===1&&!batteryValid;
     const pvPorts=[...new Set(pv.map(x=>x.port_id))];
     inverters.set(n.id,{
       ac_port_id:acPort||'',
       battery_port_id:batteryValid?linked.port_id:'',
       pv_port_ids:pvPorts,storage_links:batteries,
       ac_ambiguous:acAmbiguous,battery_ambiguous:batteryAmbiguous,
       pv_ambiguous:pvPorts.length>1,
       ac_status:acPort?'connected':acAmbiguous?'ambiguous':'unconnected',
       battery_status:batteryValid?'connected':
         batteryAmbiguous?'ambiguous':'unconnected',
       storage_node_id:batteryValid?linked.peer_node_id:'',
       storage_port_id:batteryValid?linked.peer_port_id:''
     });
   }
   return {inverters,storages};
 };
 // Public compatibility for existing hybrid/inspector code; no second
 // per-device graph traversal or independent port matching algorithm.
 const hybridAttachments=(idx,nodeId)=>{
   const bound=(idx.attachments||discoverAttachments(idx)).inverters.get(nodeId);
   return bound||{ac_port_id:'',battery_port_id:'',pv_port_ids:[],
     storage_links:[],ac_ambiguous:false,battery_ambiguous:false,
     pv_ambiguous:false,ac_status:'unconnected',
     battery_status:'unconnected',storage_node_id:'',storage_port_id:''};
 };
 const storageAttachment=(idx,nodeId)=>
   (idx.attachments||discoverAttachments(idx)).storages.get(nodeId)||
     {status:'unconnected',port_id:'',network_id:null,inverter_id:''};

 // Automatically derive a building meter's downstream devices from the AC
 // cable graph. A building owns a device only if EVERY path from the selected
 // upstream boundary to that device passes through the building. This is a
 // topology dominator, not a property of a port id, display name or wire arrow.
 //
 // Keep internal buses: different ports on the same node/bus are the same
 // electrical vertex, while unrelated buses remain separate. We intentionally
 // refuse to guess active paths for loops, multiple boards or transfer switches.
 const meterHierarchy=(layout,group,topology)=>{
   const cables=new Set(group.connection_ids);
   const adjacency=new Map();
   const add=(a,b)=>{
     if(!adjacency.has(a))adjacency.set(a,new Set());
     adjacency.get(a).add(b);
   };
   for(const edge of topology.edges){
     if(!cables.has(edge.id)||edge.medium!=='ac')continue;
     add(edge.from,edge.to);add(edge.to,edge.from);
   }
   // The validated endpoint IDs cannot contain ':'. Index bus keys once per group,
   // retaining the adjacency insertion order used by root selection.
   const keysByNode=new Map();
   for(const key of adjacency.keys()){
     const id=key.slice(0,key.indexOf(':'));
     if(!keysByNode.has(id))keysByNode.set(id,[]);
     keysByNode.get(id).push(key);
   }
   const keysFor=id=>keysByNode.get(id)||[];
   const connectedIds=type=>(layout.nodes||[])
     .filter(n=>n.type===type&&keysFor(n.id).length).map(n=>n.id);
   const grids=connectedIds('power_grid'),boards=connectedIds('distribution_board');
   const sources=group.devices.filter(d=>d.role==='source'&&keysFor(d.node_id).length)
     .map(d=>d.node_id);
   const buildings=group.devices.filter(d=>d.node_type==='building'&&keysFor(d.node_id).length)
     .map(d=>d.node_id);
   let rootIds=[];
   if(grids.length)rootIds=grids;
   else if(boards.length===1)rootIds=boards;
   else if(boards.length===0&&sources.length===1)rootIds=sources;
   else if(boards.length===0&&sources.length===0&&buildings.length===1)rootIds=buildings;
   const roots=rootIds.flatMap(keysFor);
   const reach=(blockedId=null)=>{
     const banned=blockedId?new Set(keysFor(blockedId)):new Set();
     const seen=new Set(),queue=[];
     for(const r of roots)if(!banned.has(r)&&!seen.has(r)){seen.add(r);queue.push(r);}
     for(let i=0;i<queue.length;i++)for(const dest of adjacency.get(queue[i])||[])
       if(!banned.has(dest)&&!seen.has(dest)){seen.add(dest);queue.push(dest);}
     return seen;
   };
   const seen=reach(),reachable=(set,id)=>keysFor(id).some(k=>set.has(k));
   // Distances provide the most deeply nested parent when several buildings
   // dominate a descendant. No priority is derived from cable drawing order.
   const distance=new Map(),queue=[];
   for(const key of roots)if(!distance.has(key)){distance.set(key,0);queue.push(key);}
   for(let i=0;i<queue.length;i++)for(const key of adjacency.get(queue[i])||[]){
     if(!distance.has(key)){distance.set(key,distance.get(queue[i])+1);queue.push(key);}
   }
   const depthCache=new Map();
   const depth=id=>{
     if(depthCache.has(id))return depthCache.get(id);
     const value=Math.min(...keysFor(id).map(k=>distance.get(k)??Infinity));
     depthCache.set(id,value);return value;
   };
   // The admissible forward reach depends on the candidate building, not
   // the target. Reuse it for all descendants during this hierarchy solve.
   const downstreamByParent=new Map();
   const possibleDownstream=(parent,target)=>{
     let reached=downstreamByParent.get(parent);
     if(!reached){
       const floor=depth(parent),queue=[...keysFor(parent)];
       reached=new Set(queue);
       for(let i=0;i<queue.length;i++)for(const next of adjacency.get(queue[i])||[]){
         if(reached.has(next)||(distance.get(next)??-1)<floor)continue;
         reached.add(next);queue.push(next);
       }
       downstreamByParent.set(parent,reached);
     }
     return keysFor(target).some(key=>reached.has(key));
   };
   const owners=new Map(),ambiguous=new Map();
   if(roots.length){
     const removed=new Map(buildings.map(id=>[id,reach(id)]));
     for(const entry of group.devices){
       const target=entry.node_id;
       if(entry.role==='grid'||!reachable(seen,target)||rootIds.includes(target))continue;
       const candidates=buildings.filter(parent=>parent!==target&&
         reachable(seen,parent)&&!reachable(removed.get(parent),target));
       if(candidates.length){
         const sorted=candidates.sort((a,b)=>depth(b)-depth(a));
         if(sorted.length>1&&depth(sorted[0])===depth(sorted[1])){
           ambiguous.set(target,sorted);continue;
         }
         owners.set(target,sorted[0]);continue;
       }
       // A direct building-child edge that is bypassed by another power path
       // must NOT be silently treated as an independent metered branch.
       // Detect a non-dominating building on an alternate downstream path,
       // even when a junction sits between the house and the child.
       // Do not count a sibling route that would travel backwards through
       // the upstream board: it has a strictly smaller root distance.
       const bypassed=buildings.filter(parent=>parent!==target&&
         reachable(seen,parent)&&depth(parent)<=depth(target)&&
         possibleDownstream(parent,target));
       if(bypassed.length)ambiguous.set(target,bypassed);
     }
   }
   return {owners,ambiguous,roots:rootIds,
     unresolvedRoots:roots.length===0&&buildings.length>0,
     medium:'ac'};
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
 const nearest=(layout,point,maxDistance=25,mediumFilter=null,excludeNode=null)=>{
   let best=null,distance=maxDistance;
   for(const n of layout.nodes||[])for(const p of ports(n)){
     if(n.id===excludeNode)continue;
     if(mediumFilter&&p.medium!==mediumFilter)continue;
     const at=anchor(n,p.id),d=Math.hypot(at.x-point.x,at.y-point.y);
     if(d<distance){distance=d;best={node_id:n.id,port_id:p.id};}
   }
   return best;
 };
 return Object.freeze({MAX_PORTS,MAX_BUSES,ident,role,medium,port,ports,busKey,defaultPorts,electricalType,node,end,connection,graph,index,hybridAttachments,storageAttachment,
   geometry,anchor,locate,moveAttached,attach,nearest,meterHierarchy});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioEnergyTopology;
