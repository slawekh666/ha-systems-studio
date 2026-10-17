/* Static electrical distribution board: source of artwork is src/icons/distribution-board.svg. */
const HASSStudioDistributionBoard=(()=>{
 const defaults=()=>({});
 const normalize=()=>({});
 const geometry=()=>({x:0,y:0,width:150,height:150,centerX:75,labelY:165,readingY:179});
 const render=node=>{
  const xml=typeof HASSStudioIconTemplates!=='undefined'?HASSStudioIconTemplates.distributionBoard:null;
  if(!xml)return '<rect x="15" y="15" width="120" height="120" fill="#9fb5cb"/>';
  const prefix='ssdistribution'+String(node?.id||'preview').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,23)+'-';
  return '<svg width="150" height="150" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">'+HASSStudioSvg.namespaceIds(xml,prefix)+'</svg>';
 };
 return Object.freeze({defaults,normalize,geometry,render});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioDistributionBoard;
