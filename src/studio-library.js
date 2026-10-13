/* Grouped equipment library; variants are resolved by the device registry. */
const HASSStudioEditorLibrary=(()=>{
  const render=({registry,language='pl',esc})=>{
    const lang=language==='en'?'en':'pl',entries=registry.libraryEntries(lang);
    const button=item=>{
      const attrs=item.type==='boiler'?' data-add-preset="'+esc(item.variant)+'"':
        ' data-add="'+esc(item.type)+'"'+(item.variant?' data-variant="'+esc(item.variant)+'"':'');
      return '<button type="button" class="ss-lib-item"'+attrs+' aria-label="'+esc(item.label)+'">'+
        '<span class="ss-lib-icon" aria-hidden="true">'+esc(item.icon)+'</span>'+
        '<span class="ss-lib-label">'+esc(item.label)+'</span></button>';
    };
    return Object.entries(registry.categories).map(([category,names])=>{
      const items=entries.filter(item=>item.category===category);
      if(!items.length)return '';
      const nested=Object.entries(registry.subgroups).map(([group,labels])=>{
        const subset=items.filter(item=>item.subgroup===group);
        return subset.length?'<details class="ss-lib-subgroup" open><summary>'+esc(labels[lang])+
          '<span class="ss-lib-count">'+subset.length+'</span></summary><div class="ss-lib-items">'+
          subset.map(button).join('')+'</div></details>':'';
      }).join('');
      const direct=items.filter(item=>!item.subgroup).map(button).join('');
      return '<details class="ss-lib-group" data-lib-category="'+esc(category)+'"'+
        (category==='heat_sources'?' open':'')+'><summary>'+esc(names[lang])+
        '<span class="ss-lib-count">'+items.length+'</span></summary>'+
        '<div class="ss-lib-contents">'+nested+direct+'</div></details>';
    }).join('');
  };
  return Object.freeze({render});
})();
