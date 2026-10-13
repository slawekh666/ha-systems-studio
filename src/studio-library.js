/* Native Home Assistant icons and hierarchical equipment library. */
const HASSStudioEditorLibrary=(()=>{
  const render=({registry,language='pl',esc})=>{
    const lang=language==='en'?'en':'pl',entries=registry.libraryEntries(lang);
    const icon=name=>'<ha-icon class="ss-lib-icon" icon="'+esc(name)+'" aria-hidden="true"></ha-icon>';
    const arrow=()=>'<ha-icon class="ss-lib-chevron" icon="mdi:chevron-down" aria-hidden="true"></ha-icon>';
    const button=item=>{
      const attrs=item.type==='boiler'?' data-add-preset="'+esc(item.variant)+'"':
        ' data-add="'+esc(item.type)+'"'+(item.variant?' data-variant="'+esc(item.variant)+'"':'');
      return '<button type="button" class="ss-lib-item"'+attrs+' aria-label="'+esc(item.label)+'">'+
        icon(item.icon)+'<span class="ss-lib-label">'+esc(item.label)+'</span></button>';
    };
    return Object.entries(registry.categories).map(([category,names])=>{
      const items=entries.filter(item=>item.category===category);
      if(!items.length)return '';
      const nested=Object.entries(registry.subgroups).map(([group,labels])=>{
        const subset=items.filter(item=>item.subgroup===group);
        return subset.length?'<details class="ss-lib-subgroup"'+(category==='heat_sources'?' open':'')+'><summary>'+
          icon(labels.icon)+'<span class="ss-lib-title">'+esc(labels[lang])+'</span>'+
          '<span class="ss-lib-count">'+subset.length+'</span>'+arrow()+'</summary>'+
          '<div class="ss-lib-items">'+subset.map(button).join('')+'</div></details>':'';
      }).join('');
      const direct=items.filter(item=>!item.subgroup).map(button).join('');
      return '<details class="ss-lib-group" data-lib-category="'+esc(category)+'"'+
        (category==='heat_sources'?' open':'')+'><summary>'+
        icon(registry.categoryIcons[category]||'mdi:cube-outline')+
        '<span class="ss-lib-title">'+esc(names[lang])+'</span>'+
        '<span class="ss-lib-count">'+items.length+'</span>'+arrow()+'</summary>'+
        '<div class="ss-lib-contents">'+nested+direct+'</div></details>';
    }).join('');
  };
  return Object.freeze({render});
})();
