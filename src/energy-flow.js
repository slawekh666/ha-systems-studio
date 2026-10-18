/* Conservative read-only MR4 branch-flow solver. Never infer from line crossing. */
const HASSStudioEnergyFlow=(()=>{
 const round=n=>Math.round(n*1e6)/1e6;
 const unavailable=(reason,network=null)=>({
   available:false,kw:null,direction:'none',source:'unavailable',sources:[],reason,network
 });
 const resolve=(layout,hass)=>{
   const balance=HASSStudioEnergyBalance.resolve(layout,hass),byConnection={};
   if(!balance.enabled||!balance.topology)return {balance,byConnection};
   for(const network of balance.networks){
     const edges=balance.topology.edges.filter(e=>network.connection_ids.includes(e.id));
     const adj=new Map();
     for(const e of edges){
       if(!adj.has(e.from))adj.set(e.from,[]);
       if(!adj.has(e.to))adj.set(e.to,[]);
       adj.get(e.from).push({to:e.to,id:e.id});
       adj.get(e.to).push({to:e.from,id:e.id});
     }
     for(const edge of edges){
       if(network.state!=='balanced'){
         byConnection[edge.id]=unavailable(network.state,network.id);continue;
       }
       // Only a bridge has a uniquely determined signed flow.
       const seen=new Set([edge.from]),queue=[edge.from];
       for(let i=0;i<queue.length;i++)for(const next of adj.get(queue[i])||[]){
         if(next.id===edge.id||seen.has(next.to))continue;
         seen.add(next.to);queue.push(next.to);
       }
       if(seen.has(edge.to)){
         byConnection[edge.id]=unavailable('ambiguous_cycle',network.id);continue;
       }
       const participants=network.devices.filter(d=>{
         const n=(layout.nodes||[]).find(n=>n.id===d.node_id);
         const port=n?.energy_ports?.find(p=>p.id===d.port_id);
         return seen.has(d.node_id+':'+(port?.bus||d.port_id));
       });
       const kw=round(participants.reduce((sum,d)=>sum+d.injection_kw,0));
       const sources=[...new Set(network.devices.map(d=>d.source))].sort();
       const source=sources.length===1?(sources[0]==='measured'?'ha':
         sources[0]==='simulated'?'simulation':sources[0]):'mixed';
       byConnection[edge.id]={available:true,kw,
         direction:Math.abs(kw)<1e-6?'none':kw>0?'forward':'reverse',
         source,sources,reason:null,network:network.id};
     }
   }
   for(const e of balance.topology.errors)if(e.connection)
     byConnection[e.connection]=unavailable(e.reason);
   return {balance,byConnection};
 };
 return Object.freeze({resolve,unavailable});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioEnergyFlow;
