/* Read-only SVG animation state resolution.
 * Modes 'on' and 'off' are persisted in studio_layout; 'auto' follows HA.
 * This module never controls or writes to Home Assistant entities.
 */
const HASSStudioAnimation = (() => {
  const clamp = (v, a, b, fallback) =>
    v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v))
      ? Math.max(a, Math.min(b, Number(v))) : fallback;
  const flowActive = (mode, h, entity, extraStates = []) =>
    mode === 'on' || (mode !== 'off' && HASSStudioHA.active(h, entity, extraStates));
  const combustion = (node, h) => {
    // Existing saved manual settings take priority over HA.
    if (['burning', 'embers', 'off'].includes(node.solid_state)) return node.solid_state;
    const state = HASSStudioHA.entity(h, node.burner_entity);
    if (state) {
      const value = String(state.state).toLowerCase();
      if (['on', 'burning', 'active', 'running', 'heating', 'fire'].includes(value)) return 'burning';
      if (['embers', 'smoldering', 'cooling', 'glowing'].includes(value)) return 'embers';
      // Keep historical behavior for explicit off/unknown HA states.
      return 'off';
    }
    const t = HASSStudioHA.temperature(h, node.entity);
    const upper = clamp(node.burner_on_temp, 20, 90, 35);
    const lower = Math.min(upper - .5, clamp(node.burner_off_temp, 10, 89, 32));
    return t === null ? 'off' : t >= upper ? 'burning' : t >= lower ? 'embers' : 'off';
  };
  return Object.freeze({ flowActive, combustion });
})();
