/* Modern gas boiler using the SVG supplied in piec_gazowy_svg_js(1).html.
 * Read-only HA view: measured temperature and gas burner modulation (%).
 * No background timer, HA service action or speculative gas consumption values.
 */
const HASSStudioGasBoiler=(()=>{
  const SVG_TEMPLATE="\n      <defs>\n        <linearGradient id=\"bodyGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#f8fbff\"/>\n          <stop offset=\".24\" stop-color=\"#eef2f7\"/>\n          <stop offset=\".58\" stop-color=\"#d7dde7\"/>\n          <stop offset=\"1\" stop-color=\"#c3cbd7\"/>\n        </linearGradient>\n        <linearGradient id=\"bodySide\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#cdd5e0\"/>\n          <stop offset=\".5\" stop-color=\"#eef4fb\"/>\n          <stop offset=\"1\" stop-color=\"#b6c0ce\"/>\n        </linearGradient>\n        <linearGradient id=\"metalGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#2b3748\"/>\n          <stop offset=\".3\" stop-color=\"#7f92ab\"/>\n          <stop offset=\".55\" stop-color=\"#e4edf8\"/>\n          <stop offset=\"1\" stop-color=\"#253344\"/>\n        </linearGradient>\n        <linearGradient id=\"darkScreen\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#07101b\"/>\n          <stop offset=\"1\" stop-color=\"#02070f\"/>\n        </linearGradient>\n        <linearGradient id=\"screenReflect\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#ffffff\" stop-opacity=\".15\"/>\n          <stop offset=\"1\" stop-color=\"#ffffff\" stop-opacity=\"0\"/>\n        </linearGradient>\n        <linearGradient id=\"flameOuter\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#90f5ff\"/>\n          <stop offset=\".45\" stop-color=\"#19b8ff\"/>\n          <stop offset=\"1\" stop-color=\"#0056ff\"/>\n        </linearGradient>\n        <linearGradient id=\"flameInner\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#e9ffff\"/>\n          <stop offset=\"1\" stop-color=\"#3fd7ff\"/>\n        </linearGradient>\n        <filter id=\"blueGlow\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"160%\"><feGaussianBlur stdDeviation=\"10\"/></filter>\n        <filter id=\"softGlow\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"160%\"><feGaussianBlur stdDeviation=\"5\"/></filter>\n      </defs>\n\n      <g id=\"aura\">\n        <path d=\"M230 92 H874 Q940 92 940 158 V1138 Q940 1204 874 1204 H230 Q164 1204 164 1138 V158 Q164 92 230 92 Z\" fill=\"none\" stroke=\"#2ca7ff\" stroke-opacity=\"__GAS_AURA__\" stroke-width=\"18\" filter=\"url(#blueGlow)\"/>\n      </g>\n\n      <g id=\"flueTop\">\n        <rect x=\"495\" y=\"52\" width=\"136\" height=\"58\" rx=\"18\" fill=\"url(#metalGrad)\" stroke=\"#d4ebff\" stroke-width=\"4\"/>\n        <rect x=\"516\" y=\"28\" width=\"94\" height=\"36\" rx=\"12\" fill=\"url(#metalGrad)\" stroke=\"#d4ebff\" stroke-width=\"3\"/>\n      </g>\n\n      <g id=\"boilerBody\">\n        <path d=\"M230 92 H874 Q940 92 940 158 V1138 Q940 1204 874 1204 H230 Q164 1204 164 1138 V158 Q164 92 230 92 Z\" fill=\"url(#bodyGrad)\" stroke=\"#f8fbff\" stroke-width=\"4\"/>\n        <path d=\"M180 154 Q180 106 228 106 H252 V1136 H228 Q180 1136 180 1088 Z\" fill=\"#f0f5fa\" opacity=\".72\"/>\n        <path d=\"M884 106 H904 Q924 106 932 122 Q940 138 940 164 V1128 Q940 1182 894 1194 L884 1196 Z\" fill=\"#bfc9d6\" opacity=\".72\"/>\n        <path d=\"M260 116 C352 108 680 104 848 120\" fill=\"none\" stroke=\"#ffffff\" stroke-opacity=\".42\" stroke-width=\"6\" stroke-linecap=\"round\"/>\n        <path d=\"M364 130 L620 858\" stroke=\"#ffffff\" stroke-opacity=\".18\" stroke-width=\"5\"/>\n        <line x1=\"164\" y1=\"988\" x2=\"940\" y2=\"988\" stroke=\"#8093ac\" stroke-opacity=\".5\" stroke-width=\"4\"/>\n      </g>\n\n      <g id=\"frontIcon\" transform=\"translate(-60 0)\" opacity=\"__GAS_FRONT_OPACITY__\">\n        <g id=\"frontIconGlow\" opacity=\"__GAS_FRONT_GLOW__\">\n          <path d=\"M584 560 C578 606 566 642 546 674 C522 712 516 746 528 776 C544 816 578 838 620 834 C668 830 706 794 708 746 C710 706 690 674 658 634 C632 602 608 576 584 560 Z\" fill=\"#1fa6ff\" filter=\"url(#blueGlow)\"/>\n        </g>\n        <path d=\"M584 560 C578 606 566 642 546 674 C522 712 516 746 528 776 C544 816 578 838 620 834 C668 830 706 794 708 746 C710 706 690 674 658 634 C632 602 608 576 584 560 Z\" fill=\"url(#flameOuter)\" stroke=\"#88f5ff\" stroke-width=\"4\"/>\n        <path d=\"M592 600 C590 632 580 658 564 684 C546 712 544 738 554 760 C566 788 590 802 620 800 C652 798 678 772 680 744 C682 716 668 692 646 664 C628 642 610 620 592 600 Z\" fill=\"url(#flameInner)\" opacity=\".96\"/>\n        <path d=\"M586 658 C574 684 572 712 578 736 C586 716 598 694 614 678 C604 668 594 662 586 658 Z\" fill=\"#ffffff\" opacity=\".72\"/>\n      </g>\n\n      <g id=\"displayFrame\">\n        <rect x=\"428\" y=\"1040\" width=\"292\" height=\"114\" rx=\"18\" fill=\"#d9e4ef\" stroke=\"#4d627b\" stroke-width=\"3\"/>\n        <rect x=\"440\" y=\"1052\" width=\"268\" height=\"90\" rx=\"14\" fill=\"url(#darkScreen)\" stroke=\"#1eb5ff\" stroke-opacity=\".6\" stroke-width=\"2.6\"/>\n        <path d=\"M448 1060 H570 L548 1140 H448 Z\" fill=\"url(#screenReflect)\"/>\n\n        <line x1=\"528\" y1=\"1062\" x2=\"528\" y2=\"1132\" stroke=\"#13344e\" stroke-opacity=\".85\" stroke-width=\"2\"/>\n        <line x1=\"620\" y1=\"1062\" x2=\"620\" y2=\"1132\" stroke=\"#13344e\" stroke-opacity=\".85\" stroke-width=\"2\"/>\n\n        <g id=\"gasBarsGroup\">\n          <rect id=\"barLevel4\" x=\"456\" y=\"1068\" width=\"58\" height=\"10\" rx=\"5\" fill=\"#ff3434\" opacity=\"__GAS_BAR_4__\"/>\n          <rect id=\"barLevel3\" x=\"464\" y=\"1086\" width=\"50\" height=\"10\" rx=\"5\" fill=\"#ff982a\" opacity=\"__GAS_BAR_3__\"/>\n          <rect id=\"barLevel2\" x=\"472\" y=\"1104\" width=\"42\" height=\"10\" rx=\"5\" fill=\"#59d44e\" opacity=\"__GAS_BAR_2__\"/>\n          <rect id=\"barLevel1\" x=\"480\" y=\"1122\" width=\"34\" height=\"10\" rx=\"5\" fill=\"#31a8ff\" opacity=\"__GAS_BAR_1__\"/>\n        </g>\n\n        <g id=\"displayFlameGroup\" transform=\"__GAS_FLAME_TRANSFORM__\" opacity=\"__GAS_FLAME_OPACITY__\">\n          <g id=\"displayFlameGlow\" opacity=\"__GAS_FLAME_GLOW__\">\n            <path d=\"M575 1122 C572 1110 572 1097 575 1082 C579 1062 587 1044 596 1028 C605 1044 613 1062 617 1082 C620 1097 620 1110 617 1122 C613 1138 605 1150 596 1154 C587 1150 579 1138 575 1122 Z\" fill=\"#18a8ff\" filter=\"url(#softGlow)\"/>\n          </g>\n          <path id=\"displayFlameOuter\" d=\"M575 1122 C572 1110 572 1097 575 1082 C579 1062 587 1044 596 1028 C605 1044 613 1062 617 1082 C620 1097 620 1110 617 1122 C613 1138 605 1150 596 1154 C587 1150 579 1138 575 1122 Z\" fill=\"url(#flameOuter)\"/>\n          <path id=\"displayFlameInner\" d=\"M581 1120 C579 1111 579 1100 581 1088 C584 1072 590 1058 596 1046 C602 1058 608 1072 611 1088 C613 1100 613 1111 611 1120 C608 1132 602 1141 596 1144 C590 1141 584 1132 581 1120 Z\" fill=\"url(#flameInner)\" opacity=\".94\"/>\n          <path d=\"M588 1099 C588 1087 591 1076 596 1066 C594 1081 594 1093 595 1104 C592 1102 590 1100 588 1099 Z\" fill=\"#ffffff\" opacity=\".62\"/>\n        </g>\n\n        <g id=\"tempGroup\">\n          <text x=\"640\" y=\"1080\" font-size=\"11\" fill=\"#76caff\" font-family=\"monospace\">TEMP</text>\n          <text id=\"tempValueDisplay\" x=\"640\" y=\"1124\" font-size=\"34\" fill=\"#eff9ff\" font-family=\"monospace\" font-weight=\"700\">__GAS_TEMP__</text>\n          <text x=\"694\" y=\"1122\" font-size=\"16\" fill=\"#7fd2ff\" font-family=\"monospace\">C</text>\n        </g>\n      </g>\n\n      <g id=\"bottomConnectors\">\n        <g transform=\"translate(296 1214)\">\n          <rect x=\"0\" y=\"0\" width=\"64\" height=\"74\" rx=\"10\" fill=\"url(#metalGrad)\" stroke=\"#d4ebff\" stroke-width=\"3\"/>\n          <rect x=\"8\" y=\"60\" width=\"48\" height=\"12\" rx=\"4\" fill=\"#1fb4ff\" opacity=\".7\" filter=\"url(#softGlow)\"/>\n        </g>\n        <g transform=\"translate(680 1214)\">\n          <rect x=\"0\" y=\"0\" width=\"64\" height=\"74\" rx=\"10\" fill=\"url(#metalGrad)\" stroke=\"#d4ebff\" stroke-width=\"3\"/>\n          <rect x=\"8\" y=\"60\" width=\"48\" height=\"12\" rx=\"4\" fill=\"#1fb4ff\" opacity=\".7\" filter=\"url(#softGlow)\"/>\n        </g>\n      </g>\n    ";
  const clamp=(v,min,max,def)=>typeof v!=='boolean'&&v!=null&&v!==''&&Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):def;
  const reading=(h,e)=>{
    const o=e&&h?.states?.[e];
    if(!o||typeof o.state!=='string'&&typeof o.state!=='number')return null;
    const v=String(o.state).trim();
    if(!v||!Number.isFinite(Number(v)))return null;
    return {value:Number(v),unit:String(o.attributes?.unit_of_measurement||'').trim()};
  };
  const temperature=(h,e)=>{
    const r=reading(h,e);if(!r||!['','°C','C','°F','F'].includes(r.unit))return null;
    const value=r.unit==='°F'||r.unit==='F'?(r.value-32)*5/9:r.value;
    return value>=-40&&value<=150?value:null;
  };
  const modulation=(h,e)=>{
    const r=reading(h,e);
    // This percentage is burner MODULATION, not actual gas flow in m3/h.
    // HA integrations may represent percentages as a bare number.
    if(!r||!['','%','percent'].includes(r.unit)||r.value<0||r.value>100)return null;
    return r.value;
  };
  const burnerEnabled=(h,e)=>{
    if(!e)return true;
    const o=h?.states?.[e];if(!o)return false;
    return ['on','burning','heating','active','running','open'].includes(String(o.state).toLowerCase());
  };
  const geometry=n=>{
    const sx=clamp(n?.width_scale,.5,2.4,1),sy=clamp(n?.height_scale,.5,2.4,1);
    const cx=66,cy=56;
    return {x:cx+(12-cx)*sx,y:cy+(-106-cy)*sy,
      width:110*sx,height:326*sy,
      labelY:cy+(238-cy)*sy,readingY:cy+(250-cy)*sy,centerX:cx,centerY:cy,sx,sy};
  };
  const render=(node,hass)=>{
    const t=temperature(hass,node.entity);
    const measured=modulation(hass,node.gas_draw_entity);
    const percent=burnerEnabled(hass,node.burner_entity)?measured===null?0:measured:0;
    const active=percent>0;
    const fraction=Math.sqrt(percent/100);
    const scale=(60/126*fraction);
    // Original flame bounds are approximately x=575..620, y=1028..1154.
    // Anchor its lower centre to x575,y1132, as in the uploaded HTML.
    const flameTransform='translate(575 1132) scale('+scale.toFixed(4)+') translate(-596 -1154)';
    const intensity=clamp(node.gas_glow,0,100,62)/100;
    const visualStrength=active?.2+.8*fraction:0;
    const frontGlow=(.08+.5*intensity*visualStrength).toFixed(2);
    const frontOpacity=(active?.55+.45*fraction:.20).toFixed(2);
    const gasGlow=(active?.06+.3*fraction+.10*intensity:0).toFixed(2);
    const aura=(active?.04+.22*intensity*visualStrength:.015).toFixed(3);
    const namespace='ssgas'+String(node.id||'gas').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,28);
    let image=SVG_TEMPLATE
      .replace('__GAS_TEMP__',t===null?'—':t.toFixed(1)+'°')
      .replace('__GAS_FLAME_TRANSFORM__',flameTransform)
      .replace('__GAS_FLAME_OPACITY__',active?'1':'0')
      .replace('__GAS_FLAME_GLOW__',gasGlow)
      .replace('__GAS_FRONT_GLOW__',frontGlow)
      .replace('__GAS_FRONT_OPACITY__',frontOpacity)
      .replace('__GAS_AURA__',aura);
    for(let level=1;level<=4;level++)image=image.replace('__GAS_BAR_'+level+'__',
      active&&percent>(level-1)*25?'1':'0.16');
    image=image.replace(/(\bid=")([^"]+)(")/g,(_,prefix,id,end)=>prefix+namespace+id+end)
      .replace(/url\(#([^)]+)\)/g,(_,id)=>'url(#'+namespace+id+')');
    const {sx,sy}=geometry(node);
    return '<g class="ss-modern-gas-boiler" data-modulation="'+(measured===null?'unknown':measured.toFixed(1))+
      '" data-burning="'+(active?'on':'off')+'">'+
      '<g class="ss-gas-dimensions" transform="translate(66 56) scale('+sx+' '+sy+') translate(-66 -56)">'+
      '<g transform="translate(14 -104) scale(.2 .2) translate(-164 -28)">'+image+'</g></g></g>';
  };
  const styles='';
  return {render,styles,temperature,modulation,burnerEnabled,geometry};
})();
