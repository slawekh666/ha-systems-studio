/* Shared, read-only Home Assistant state adapters.
 * Unknown/unavailable values are never replaced by demo measurements.
 * No HA service calls, timers or subscriptions.
 */
const HASSStudioHA = (() => {
  const entity = (h, id) => id && typeof id === 'string' ? h?.states?.[id] || null : null;
  const reading = (h, id) => {
    const item = entity(h, id);
    const value = item?.state;
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const text = String(value).trim();
    if (!text || !Number.isFinite(Number(text))) return null;
    return { value: Number(text), unit: String(item.attributes?.unit_of_measurement ?? '').trim() };
  };
  const temperature = (h, id) => {
    const r = reading(h, id);
    if (!r || !['', '°C', 'C', '°F', 'F'].includes(r.unit)) return null;
    const c = r.unit === '°F' || r.unit === 'F' ? (r.value - 32) * 5 / 9 : r.value;
    return c >= -40 && c <= 150 ? c : null;
  };
  const powerKw = (h, id) => {
    const r = reading(h, id);
    if (!r || r.value < 0) return null;
    if (r.unit === 'W') return r.value / 1000;
    if (r.unit === 'kW') return r.value;
    return null;
  };
  const percentage = (h, id, allowUnitless = true) => {
    const r = reading(h, id);
    if (!r || !(r.unit === '%' || r.unit === 'percent' || (allowUnitless && r.unit === ''))) return null;
    return r.value >= 0 && r.value <= 100 ? r.value : null;
  };
  const active = (h, id, extraStates = []) => {
    const value = String(entity(h, id)?.state ?? '').trim().toLowerCase();
    return ['on', 'open', 'active', 'running', 'heating', ...extraStates].includes(value);
  };
  // A single effective active-power reading is shared by device SVGs and the
  // network balance. Explicit manual mode wins even over a valid HA zero.
  const powerInput=(node,h,id,test,legacy='live',signed=false)=>{
    const mode=['auto','ha','test'].includes(node?.energy_mode)?node.energy_mode:
      legacy==='manual'?'test':'ha';
    const r=reading(h,id);
    const measured=r&&['W','kW'].includes(r.unit)&&Number.isFinite(r.value)&&
      (signed||r.value>=0)?r.value/(r.unit==='W'?1000:1):null;
    const manual=typeof test==='number'&&Number.isFinite(test)&&(signed||test>=0)?test:null;
    if(mode==='test')return {kw:manual,source:manual===null?'missing':'simulated'};
    if(measured!==null)return {kw:measured,source:'measured'};
    const fallback=(mode==='auto'||node?.energy_mode==null)&&
      node?.energy_fallback_enabled===true;
    return {kw:fallback?manual:null,source:fallback&&manual!==null?'simulated':'missing'};
  };
  return Object.freeze({ entity, reading, temperature, powerKw, percentage, active, powerInput });
})();
