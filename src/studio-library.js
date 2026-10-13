/* Left equipment library. Preserves existing add-button behavior. */
const HASSStudioEditorLibrary = (() => {
  const render = ({types,registry,L,esc}) =>
      types.map(type=>'<button type="button" data-add="'+type+'"><span aria-hidden="true">'+registry.iconFor(type)+'</span>'+
        esc(L[type==='pump'?'pumps':type==='valve'?'valves':type==='sensor'?'sensorsMenu':type==='pipe'?'pipes':type])+'</button>').join('')+
      '<button type="button" data-add-preset="solid_fuel"><span aria-hidden="true">♨</span>'+esc(L.solidModel)+'</button>'+
      '<button type="button" data-add-preset="pellet_modern"><span aria-hidden="true">♨</span>'+esc(L.pelletModel)+'</button>'+
      '<button type="button" data-add-preset="heatpump_modern"><span aria-hidden="true">◉</span>'+esc(L.hpModel)+'</button>'+
      '<button type="button" data-add-preset="gas_modern"><span aria-hidden="true">♨</span>'+esc(L.gasModel)+'</button>'+
      '<button type="button" data-add-preset="electric_modern"><span aria-hidden="true">⚡</span>'+esc(L.electricModel)+'</button>'+
      '<button type="button" data-add-preset="fireplace_modern"><span aria-hidden="true">♨</span>'+esc(L.fireplaceModel)+'</button>';
  return Object.freeze({render});
})();
