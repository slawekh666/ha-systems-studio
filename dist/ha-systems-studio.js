/* Home Assistant Systems Studio — adapted from Warmwasser Schema Card by mariofritzer.
 * Original source: https://github.com/mariofritzer/warmwasser-schema-card
 * MIT license: see LICENSE.
 */
/*
 * ha-systems-studio.js
 * Animated hydraulic diagram for Home Assistant: storage tank, heat pump, fresh water module,
 * solar thermal, additional heat source and heating circuits. Rendered entirely in the browser.
 * Every device and every value only appears when an entity is configured.
 *
 * Animiertes Anlagenschema für Home Assistant. Wird komplett im Browser gezeichnet.
 * Jedes Gerät und jeder Wert erscheint nur, wenn dafür eine Entität konfiguriert ist.
 *
 * Install: copy to /config/www/, add resource /local/ha-systems-studio.js (JavaScript module)
 */

const VERSION = '0.4.14-dev';

/* ---------- Texte / Texts ---------- */
const T = {
  de: {
    titel: 'Warmwasser', speicherAvg: 'Speicher Ø', speicher: 'SPEICHER', zirk: 'Zirkulation', kalt: 'Kaltwasser', warm: 'Warmwasser',
    wpAn: 'Verdichter läuft', wpAus: 'Standby', sperre: 'EVU-Sperre', abtauen: 'Abtauen', kuehlen: 'Kühlbetrieb', waerme: 'Wärme',
    brennt: 'Brennt', glut: 'Glut', aus: 'Aus', an: 'An', brennerAn: 'Brenner an', warmK: 'Warm', aktiv: 'Aktiv', laeuft: 'Läuft',
    legLaeuft: 'Legionellenschutz läuft', legHeute: 'Legionellen: heute', legVor: (n) => `Legionellen: vor ${n} ${n === 1 ? 'Tag' : 'Tagen'}`,
    raum: 'Raum', ww: 'WARMWASSER', puffer: 'PUFFER', modusTitle: 'Pumpenmodus umschalten', zirkTitle: 'Zirkulationspumpe ein/aus',
    mischerTitle: (m) => `Mischer ${m} (Anteil Puffer)`, hk: 'HK', solar: 'Solar', abgas: 'Abgas', luft: 'Luft', enth: 'Enthärtung',
    auto: 'AUTO', hand: 'HAND', modusAus: 'AUS', hsO: 'Heizstab oben', hsU: 'Heizstab unten',
    typ: { kamin: 'Kamin', holzvergaser: 'Holzvergaser', pellet: 'Pellets', gas: 'Gastherme', oel: 'Ölkessel', fernwaerme: 'Fernwärme', bhkw: 'BHKW' },
  },
  en: {
    titel: 'Hot water', speicherAvg: 'Tank Ø', speicher: 'TANK', zirk: 'Circulation', kalt: 'Cold water', warm: 'Hot water',
    wpAn: 'Compressor on', wpAus: 'Standby', sperre: 'Grid lock', abtauen: 'Defrosting', kuehlen: 'Cooling', waerme: 'Heat',
    brennt: 'Burning', glut: 'Embers', aus: 'Off', an: 'On', brennerAn: 'Burner on', warmK: 'Warm', aktiv: 'Active', laeuft: 'Running',
    legLaeuft: 'Legionella protection', legHeute: 'Legionella: today', legVor: (n) => `Legionella: ${n} ${n === 1 ? 'day' : 'days'} ago`,
    raum: 'Room', ww: 'HOT WATER', puffer: 'BUFFER', modusTitle: 'Toggle pump mode', zirkTitle: 'Toggle circulation pump',
    mischerTitle: (m) => `Mixer ${m} (buffer share)`, hk: 'HC', solar: 'Solar', abgas: 'Flue', luft: 'Air', enth: 'Softener',
    auto: 'AUTO', hand: 'MANUAL', modusAus: 'OFF', hsO: 'Heater top', hsU: 'Heater bottom',
    typ: { kamin: 'Stove', holzvergaser: 'Wood boiler', pellet: 'Pellets', gas: 'Gas boiler', oel: 'Oil boiler', fernwaerme: 'District heat', bhkw: 'CHP' },
  },
};
const sprache = (cfg, hass) => {
  const l = cfg && cfg.sprache && cfg.sprache !== 'auto' ? cfg.sprache : (hass && (hass.locale?.language || hass.language)) || 'de';
  return String(l).toLowerCase().startsWith('de') ? 'de' : 'en';
};

const DEFAULTS = {
  hersteller: 'HOVAL',
  name_wp: 'WP',
  name_fm: 'FM',
  fuehler: [],
  hs_stufen: 7,
  t_min: 40,
  t_max: 55,
  farben: {
    aktiv: '#ffb300', warm: '#ff4b3e', kalt: '#3d8bff', led: '#4cd964', solar: '#ff9f1c', quelle: '#2dd4bf',
    tw_kalt: '#34c759', tw_warm: '#ff4b3e', geraet_hell: '#ef4438', geraet_dunkel: '#a3151a',
  },
};
const ZUSATZ_ICON = {
  kamin: 'mdi:fireplace', holzvergaser: 'mdi:fire', pellet: 'mdi:fire', gas: 'mdi:gas-burner', oel: 'mdi:oil',
  fernwaerme: 'mdi:pipe', bhkw: 'mdi:engine',
};
const TYPEN = ['trennblech', 'schicht', 'kombi', 'hygiene', 'getrennt'];
const HK_X = [170, 255, 85, 0, -85, -170];

const CSS = `
:host{display:block}
ha-card{overflow:hidden}
.kopf{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 16px 6px}
.kopf .l{display:flex;align-items:center;gap:12px}
.kopf .ic{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--secondary-background-color)}
.kopf .t1{font-size:16px;font-weight:600;color:var(--primary-text-color)}
.kopf .t2{font-size:12px;color:var(--secondary-text-color)}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chip{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:999px;font-size:12px;font-weight:600;background:var(--secondary-background-color);color:var(--secondary-text-color)}
svg{display:block;width:100%;height:auto;max-height:860px;padding:4px 8px 8px;box-sizing:border-box}
.en{padding:2px 16px 14px;display:grid;gap:6px}
.er{display:grid;grid-template-columns:20px 110px 1fr 76px;align-items:center;gap:8px;font-size:12px;color:var(--secondary-text-color);cursor:pointer}
.er .b{height:8px;border-radius:4px;background:var(--secondary-background-color);overflow:hidden}
.er .b i{display:block;height:100%;border-radius:4px}
.er .v{text-align:right;font-weight:600;color:var(--primary-text-color);font-variant-numeric:tabular-nums}
.w0,.w1,.w2,.w3,.wa{fill:none;stroke-linecap:round;stroke-linejoin:round}
.w0{stroke:#000;stroke-opacity:.35;stroke-width:10px}.w1{stroke-width:7px}.w2{stroke:#fff;stroke-opacity:.22;stroke-width:2px}
.w3{stroke:#fff;stroke-width:2.6px;stroke-dasharray:1 13;animation:wf 1s linear infinite}.wa{stroke:#fff;stroke-width:1.6px}
.wk,.wn{fill:url(#wwNut);stroke:#1e2126;stroke-width:.8px}.wm{fill:#2b2f35;stroke:#8a9099;stroke-width:1.2px}
.ws{fill:var(--secondary-text-color,#9aa0a6)}.wv{fill:var(--primary-text-color,#e0e3e7)}
.wt{font-weight:700}.wc{text-anchor:middle}.we{text-anchor:end}
.wo{stroke:rgba(0,0,0,.45);stroke-width:2.5px;paint-order:stroke;stroke-linejoin:round}
.wb{animation:wb 1.6s infinite}.wp{animation:wp 1.6s infinite;transform-box:fill-box;transform-origin:center}
.wr{animation:wr 1.2s linear infinite;transform-origin:390px 226px}.wg{animation:wr 2.4s linear infinite;transform-box:fill-box;transform-origin:center}
.wl{animation:wl .9s infinite;transform-box:fill-box;transform-origin:50% 100%}
.wx{cursor:pointer}
@keyframes wf{to{stroke-dashoffset:-28}}@keyframes wb{50%{opacity:.45}}
@keyframes wp{from{opacity:.8}to{opacity:0;transform:scale(1.8)}}@keyframes wr{to{transform:rotate(360deg)}}
@keyframes wl{33%{transform:scale(1.08,.86)}66%{transform:scale(.94,1.1)}}
`;

/* ---------- Hilfsfunktionen ---------- */
const ENT = /^[a-z_]+\.[a-z0-9_]+$/i;
const isEnt = (v) => typeof v === 'string' && ENT.test(v);
const hasEnt = (o) => !!o && typeof o === 'object' && Object.values(o).some(isEnt);
const zeigen = (o) => o === true || (!!o && typeof o === 'object' && (o.anzeigen === true || hasEnt(o)));
const isNum = (v) => v !== null && v !== undefined && v !== '' && typeof v !== 'boolean' && Number.isFinite(Number(v));
const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (t) => (isNum(t) ? Number(t).toFixed(1) + '°' : '–');
const watt = (w) => (w >= 1000 ? (w / 1000).toFixed(2) + ' kW' : Math.round(w) + ' W');
const collect = (o, out) => {
  if (isEnt(o)) out.push(o);
  else if (Array.isArray(o)) o.forEach((x) => collect(x, out));
  else if (o && typeof o === 'object') Object.values(o).forEach((x) => collect(x, out));
  return out;
};

/* Gleiche DOM-Struktur? Dann nur Attribute/Texte angleichen, damit Animationen weiterlaufen. */
function sameShape(a, b) {
  if (a.childNodes.length !== b.childNodes.length) return false;
  for (let i = 0; i < a.childNodes.length; i++) {
    const x = a.childNodes[i], y = b.childNodes[i];
    if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName) return false;
    if (x.nodeType === 1 && !sameShape(x, y)) return false;
  }
  return true;
}
function patch(a, b) {
  for (let i = 0; i < a.childNodes.length; i++) {
    const x = a.childNodes[i], y = b.childNodes[i];
    if (x.nodeType === 3) { if (x.data !== y.data) x.data = y.data; continue; }
    if (x.nodeType !== 1) continue;
    for (const at of y.attributes) if (x.getAttribute(at.name) !== at.value) x.setAttribute(at.name, at.value);
    for (const at of [...x.attributes]) if (!y.hasAttribute(at.name)) x.removeAttribute(at.name);
    patch(x, y);
  }
}

/* ======================================================================== */
class WarmwasserSchemaCard extends HTMLElement {
  static getConfigElement() { return document.createElement('ha-systems-studio-editor'); }
  static getStubConfig() { return { speicher: { typ: 'trennblech' }, fuehler: [] }; }
  getCardSize() { return 10; }
  getGridOptions() { return { columns: 'full', min_columns: 6 }; }

  setConfig(config) {
    if (!config) throw new Error('Keine Konfiguration / no configuration');
    const c = { ...DEFAULTS, ...config, farben: { ...DEFAULTS.farben, ...(config.farben || {}) } };
    c.fuehler = (config.fuehler || [])
      .map((f) => (Array.isArray(f) ? { name: f[0], entity: f[1], hoehe: f[2] } : { name: f.name, entity: f.entity, hoehe: f.hoehe }))
      .filter((f) => isEnt(f.entity));
    const sp = config.speicher || {};
    const tr = sp.trennung ?? config.trennung;
    c.typ = TYPEN.includes(sp.typ) ? sp.typ : tr === false || tr === null ? 'schicht' : 'trennblech';
    c.trennung = isNum(tr) ? Number(tr) : 50;
    c.volumen = sp.volumen ?? config.volumen ?? null;
    c.volumen_ww = sp.volumen_ww ?? null;
    c.heizstab_oben = hasEnt(config.heizstab_oben) ? { ...config.heizstab_oben } : null;
    c.heizstab_unten = hasEnt(config.heizstab_unten) ? { ...config.heizstab_unten } : null;
    const wpc = config.wp || (config.wp_leistung ? { leistung: config.wp_leistung, schwelle: config.wp_schwelle } : null);
    c.wp = hasEnt(wpc) ? { schwelle: 100, typ: 'luft', ...wpc } : null;
    const kz = config.zusatzwaerme || config.kamin;
    c.kamin = hasEnt(kz) ? { warm: 30, feuer: 35, ...kz, typ: ZUSATZ_ICON[kz.typ] ? kz.typ : 'kamin' } : null;
    c.solar = hasEnt(config.solar) ? { ...config.solar } : null;
    c.fm = zeigen(config.fm) ? (typeof config.fm === 'object' ? { ...config.fm } : {}) : null;
    c.weiche = zeigen(config.weiche) ? (typeof config.weiche === 'object' ? { ...config.weiche } : {}) : null;
    c.trinkwasser = hasEnt(config.trinkwasser) ? { ...config.trinkwasser } : null;
    c.zirkulationspumpe = isEnt(config.zirkulationspumpe) ? config.zirkulationspumpe : '';
    c.pv = isEnt(config.pv) ? config.pv : config.pv && isEnt(config.pv.leistung) ? config.pv.leistung : '';
    c.aussen = isEnt(config.aussen) ? config.aussen : '';
    c.legionellen = hasEnt(config.legionellen) ? { tage: 7, ...config.legionellen } : null;
    c.heizkreise = (config.heizkreise || []).filter(hasEnt).slice(0, 6);
    c.energie = (config.energie || []).filter((e) => e && isEnt(e.entity));
    this._cfg = c;
    this._ents = [...new Set(collect(c, []))];
    this._key = null;
    if (this._hass) this._update();
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  _init() {
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${CSS}</style><ha-card><div id="c"></div></ha-card>`;
    this._box = root.getElementById('c');
    root.addEventListener('click', (ev) => this._click(ev));
  }

  _update() {
    if (!this._cfg || !this._hass) return;
    const key = sprache(this._cfg, this._hass) + '|' + this._ents.map((e) => this._hass.states[e]?.state).join('|');
    if (key === this._key) return;
    this._key = key;
    if (!this._box) this._init();
    const tpl = document.createElement('template');
    tpl.innerHTML = this._render();
    if (this._box.firstChild && sameShape(this._box, tpl.content)) patch(this._box, tpl.content);
    else this._box.replaceChildren(tpl.content);
  }

  _click(ev) {
    const el = ev.composedPath().find((n) => n.dataset && (n.dataset.act || n.dataset.more));
    if (!el || !this._hass) return;
    ev.stopPropagation();
if (this._cfg?.studio_readonly !== false && el.dataset.act) return;
    if (el.dataset.act === 'modus') {
      this._hass.callService('input_select', 'select_next', { entity_id: this._cfg.kamin.modus, cycle: true });
    } else if (el.dataset.act === 'zirk') {
      this._hass.callService('homeassistant', 'toggle', { entity_id: this._cfg.zirkulationspumpe });
    } else if (el.dataset.more) {
      const e = new Event('hass-more-info', { bubbles: true, composed: true });
      e.detail = { entityId: el.dataset.more };
      this.dispatchEvent(e);
    }
  }

  _render() {
    const c = this._cfg, h = this._hass, F = c.farben, L = T[sprache(c, h)];
    const S = (e) => (e && h.states[e] ? h.states[e].state : 'unknown');
    const U = (e, d) => (e && h.states[e]?.attributes?.unit_of_measurement) || d;
    const ON = (e) => { const s = S(e); return s === 'on' || (isNum(s) && Number(s) > 0); };
    const NUM = (e) => (e && isNum(S(e)) ? Number(S(e)) : 0);
    const more = (e) => (e ? ` data-more="${esc(e)}" class="wx"` : '');
    const titel = c.titel ?? L.titel;

    /* ---------- Speicher ---------- */
    const fl = c.fuehler.map((f, i) => {
      const pos = isNum(f.hoehe) ? Number(f.hoehe) : ((i + 0.5) * 100) / c.fuehler.length;
      return { name: f.name, entity: f.entity, wert: S(f.entity), y: 40 + (310 * clamp(pos, 0, 100)) / 100 };
    }).sort((a, b) => a.y - b.y);
    const TYP = c.typ, TG = TYP === 'trennblech', SPLIT = TYP === 'getrennt', TT = TYP === 'kombi' || TYP === 'hygiene';
    const y_t = 40 + (310 * clamp(c.trennung, 35, 70)) / 100, gap = SPLIT ? 32 : 18;
    const y_ro = 70, y_bo = y_t - gap, y_ru = y_t + gap, y_bu = 340, y_m = (y_ru + 338) / 2;
    const ueber = fl.filter((f) => f.y < y_t), unter = fl.filter((f) => f.y > y_t);
    const w_ueber = ueber.length ? ueber[ueber.length - 1].wert : unter.length ? unter[0].wert : 'x';
    const w_unter = unter.length ? unter[0].wert : w_ueber;
    const stops = (TG || SPLIT || !fl.length ? [...fl, { y: y_t - 2, wert: w_ueber }, { y: y_t + 2, wert: w_unter }] : [...fl]).sort((a, b) => a.y - b.y);
    const temps = fl.map((f) => f.wert).filter(isNum).map(Number);
    const avg = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
    const col = (t) => {
      if (!isNum(t)) return 'rgb(138,144,153)';
      const x = clamp((Number(t) - c.t_min) / (c.t_max - c.t_min), 0, 1);
      if (x < 0.5) { const k = x * 2; return `rgb(${Math.trunc(47 + 119 * k)},${Math.trunc(107 - 37 * k)},${Math.trunc(255 - 15 * k)})`; }
      const k = (x - 0.5) * 2; return `rgb(${Math.trunc(166 + 89 * k)},${Math.trunc(70 - 11 * k)},${Math.trunc(240 - 192 * k)})`;
    };

    /* ---------- Heizstäbe ---------- */
    const heiz = (x, n) => {
      if (!x) return null;
      const step = x.stufe && isNum(S(x.stufe)) ? Math.trunc(Number(S(x.stufe))) : 0;
      const p = NUM(x.leistung);
      return { ...x, name: x.name || n, step, p, on: x.stufe ? step > 0 : p > 5 };
    };
    const hso = heiz(c.heizstab_oben, L.hsO), hsu = heiz(c.heizstab_unten, L.hsU);
    const HS = !!(hso || hsu), hs_on = (hso && hso.on) || (hsu && hsu.on);
    const hs_p = (hso ? hso.p : 0) + (hsu ? hsu.p : 0), hs_hatP = (hso && hso.leistung) || (hsu && hsu.leistung);

    /* ---------- Wärmepumpe ---------- */
    const W = c.wp, WP = !!W;
    const wp = W ? NUM(W.leistung) : 0;
    const wp_sperre = W && W.sperre ? ON(W.sperre) : false;
    const wp_abtau = W && W.abtauen ? ON(W.abtauen) : false;
    const kuehl = W && W.kuehlen ? ON(W.kuehlen) : false;
    const wp_on = WP && !wp_sperre && (W.betrieb ? ON(W.betrieb) : wp > W.schwelle);
    const CW = kuehl ? F.kalt : F.warm, CK = kuehl ? F.warm : F.kalt;
    const QT = W ? (['sole', 'wasser'].includes(W.typ) ? W.typ : 'luft') : null;
    /* Umschaltventil: vb = Anteil obere Zone (Warmwasser), null = unbekannt */
    let vb = null;
    if (W && W.ventil) {
      const s = S(W.ventil), sl = String(s).toLowerCase();
      if (isNum(s)) vb = clamp(Number(s) > 1 ? Number(s) / 100 : Number(s), 0, 1);
      else if (sl === 'on' || /warm|ww|dhw|trink|oben|upper|hot/.test(sl)) vb = 1;
      else if (sl === 'off' || /heiz|puffer|unten|lower|heat|buffer|hz/.test(sl)) vb = 0;
    }
    const wpO = wp_on && (vb === null || vb > 0.04), wpU = wp_on && (vb === null || vb < 0.96);
    const tO = vb === null ? 1 : 1 / Math.max(vb, 0.04), tU = vb === null ? 1 : 1 / Math.max(1 - vb, 0.04);

    /* ---------- Frischwassermodul / Trinkwasser ---------- */
    const ZK = !!c.zirkulationspumpe, FMx = c.fm, FM = !TT && !!(FMx || ZK);
    const TW = FM || TT, tk = FM ? 362 : 110, tw = FM ? 428 : 164, tyb = FM ? 12 : 18, tm = (tk + tw) / 2;
    const zirk_on = ZK && ON(c.zirkulationspumpe);
    const zapf = FMx && FMx.durchfluss ? NUM(FMx.durchfluss) > 0.1 : false;
    const fm_on = FMx && FMx.pumpe ? ON(FMx.pumpe) : zapf || zirk_on;

    /* ---------- Zusatzwärme ---------- */
    const K = c.kamin;
    const kTyp = K ? K.typ : null, kName = K ? K.name || L.typ[kTyp] : '';
    const kFeuerTyp = !!K && ['kamin', 'holzvergaser', 'pellet', 'gas', 'oel'].includes(kTyp);
    let t_k = 'x', k_tr = 'flat', k_warm = false, k_feuer = false, k_glut = false, k_pumpe = false, k_mod = ['', '#8a9099'];
    if (K) {
      t_k = K.temp ? S(K.temp) : 'x';
      const tkf = isNum(t_k) ? Number(t_k) : 0;
      if (K.trend) {
        const tr = S(K.trend).toLowerCase();
        k_tr = /steig|ris|up/.test(tr) ? 'up' : /fall|sink|down/.test(tr) ? 'down' : 'flat';
      }
      k_pumpe = K.pumpe ? ON(K.pumpe) : false;
      k_warm = isNum(t_k) && tkf >= K.warm;
      k_feuer = K.brenner ? ON(K.brenner) : !kFeuerTyp && K.pumpe ? k_pumpe : isNum(t_k) && tkf >= K.feuer;
      k_glut = kFeuerTyp && !k_feuer && k_warm;
      if (K.modus) {
        const km = S(K.modus).toLowerCase();
        k_mod = km.includes('auto') ? [L.auto, F.led] : km.includes('hand') || km.includes('manu') ? [L.hand, F.aktiv]
          : [['0', 'aus', 'off'].includes(km) ? L.modusAus : km.slice(0, 6).toUpperCase(), '#8a9099'];
      }
    }
    const kHell = !!K && ['pellet', 'gas', 'oel', 'fernwaerme', 'bhkw'].includes(kTyp);

    /* ---------- Solar ---------- */
    const SO = c.solar;
    const so_on = SO && SO.pumpe ? ON(SO.pumpe) : SO && SO.leistung ? NUM(SO.leistung) > 10 : false;
    const x0 = K ? -240 : -85;

    /* ---------- Heizkreise ---------- */
    const W8 = !!c.weiche, dyw = W8 ? 70 : 0;
    const hkPos = HK_X.slice(0, c.heizkreise.length).sort((a, b) => a - b);
    const hks = c.heizkreise.map((hk, i) => {
      const MIX = !!hk.mischer, m = MIX ? S(hk.mischer) : 'x';
      const a = MIX && isNum(m) ? (clamp(Number(m), -100, 100) + 100) / 200 : 1;
      const zeilen = [];
      if (hk.vorlauf || hk.vorlauf_soll)
        zeilen.push({ t: 'VL ' + [hk.vorlauf ? fmt(S(hk.vorlauf)) : '', hk.vorlauf_soll ? '→ ' + fmt(S(hk.vorlauf_soll)) : ''].filter(Boolean).join(' '), e: hk.vorlauf || hk.vorlauf_soll });
      if (hk.raum) zeilen.push({ t: L.raum + ' ' + fmt(S(hk.raum)), e: hk.raum });
      if (hk.wmz) zeilen.push({ t: r1(NUM(hk.wmz)) + ' ' + U(hk.wmz, 'kWh'), e: hk.wmz });
      return {
        ...hk, name: hk.name || `${L.hk} ${i + 1}`, MIX, m, a, x: hkPos[i], zeilen,
        on: !!hk.pumpe && ON(hk.pumpe),
        c: MIX ? `color-mix(in srgb,${CW} ${Math.round(a * 100)}%,${CK})` : CW,
      };
    });
    const HK = hks.length > 0;
    const hk_fl = hks.filter((x) => x.on).reduce((s, x) => s + x.a, 0);
    const akt = hks.filter((x) => x.on && x.a > 0.04).map((x) => x.x);
    const td = `animation-duration:${r2(1 / Math.max(hk_fl, 0.04))}s`;
    const hkExtra = HK ? Math.max(0, ...hks.map((x) => x.zeilen.length * 12 + (x.typ ? 26 : 0))) : 0;
    const bx1 = HK ? Math.min(...hks.map((x) => x.x)) - 40 : 130;

    /* ---------- Bausteine ---------- */
    const rohr = (d, cl, f = false, t = 1) =>
      `<path d="${d}" class="w0"/><path d="${d}" class="w1" style="stroke:${cl}"/><path d="${d}" class="w2"/>` +
      (f ? `<path d="${d}" class="w3"${t !== 1 ? ` style="animation-duration:${r2(t)}s"` : ''}/>` : '');
    const pumpe = (x, y, d, on) => {
      const dx = { l: -1, r: 1 }[d] || 0, dy = { u: -1, d: 1 }[d] || 0, cl = on ? F.aktiv : '#8a9099';
      return (on ? `<circle cx="${x}" cy="${y}" r="10" fill="none" stroke="${cl}" stroke-width="1.5" class="wp"/>` : '') +
        `<circle cx="${x}" cy="${y}" r="10" fill="#2b2f35" stroke="${cl}" stroke-width="1.6"/>` +
        `<path d="M${r2(x + 10 * dx)} ${r2(y + 10 * dy)}L${r2(x - 5 * dx + 8.66 * dy)} ${r2(y - 5 * dy + 8.66 * dx)}L${r2(x - 5 * dx - 8.66 * dy)} ${r2(y - 5 * dy - 8.66 * dx)}Z" fill="${on ? F.aktiv : '#6b7280'}"/>`;
    };
    const mischer = (x, y, cl, a = null, cw = CW, ck = CK) =>
      `<line x1="${x}" y1="${y}" x2="${x - 18}" y2="${y}" stroke="#8a9099" stroke-width="2"/>` +
      `<rect x="${x - 34}" y="${y - 9}" width="16" height="18" rx="3" class="wm"/>` +
      `<text x="${x - 26}" y="${y + 3}" font-size="8" class="wc wt" fill="#cfd4da">M</text>` +
      `<path d="M${x - 9} ${y - 14}H${x + 9}L${x} ${y}ZM${x - 9} ${y + 14}H${x + 9}L${x} ${y}ZM${x + 15} ${y - 9}V${y + 9}L${x} ${y}Z" fill="#1f2329" stroke="${cl}" stroke-width="1.6" stroke-linejoin="round"/>` +
      (a !== null ? `<path d="M${x - 9} ${y - 14}H${x + 9}L${x} ${y}Z" fill="${cw}" fill-opacity="${r2(0.1 + 0.8 * a)}"/><path d="M${x + 15} ${y - 9}V${y + 9}L${x} ${y}Z" fill="${ck}" fill-opacity="${r2(0.9 - 0.8 * a)}"/>` : '') +
      `<circle cx="${x}" cy="${y}" r="2.5" fill="${cl}"/>`;
    const verteiler = (x1, x2, y, cl) =>
      `<path d="M${x1} ${y}H${x2}" stroke="#000" stroke-opacity=".35" stroke-width="18"/><path d="M${x1} ${y}H${x2}" stroke="${cl}" stroke-width="14"/>` +
      `<path d="M${x1} ${y - 3}H${x2}" stroke="#fff" stroke-opacity=".25" stroke-width="3"/>` +
      `<rect x="${x1 - 5}" y="${y - 10}" width="5" height="20" rx="1.5" class="wk"/><rect x="${x2}" y="${y - 10}" width="5" height="20" rx="1.5" class="wk"/>`;
    const tee = (x, y) => `<circle cx="${x}" cy="${y}" r="5.5" class="wn"/><circle cx="${x - 1.5}" cy="${y - 1.5}" r="1.6" fill="#fff" opacity=".45"/>`;
    const stub = (x, y, w, hh) => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="2" class="wk"/>`;
    const zaehlerSym = (x, y) => `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" rx="2" fill="#2b2f35" stroke="#cfd4da"/><circle cx="${x}" cy="${y}" r="2.6" fill="none" stroke="#cfd4da"/>`;
    const flamme = (w, hh) =>
      `M${-w} 0C${-w - 2} ${r1(-hh * 0.45)} ${r1(-w * 0.15)} ${r1(-hh * 0.6)} ${r1(w * 0.1)} ${-hh}C${r1(w * 0.5)} ${r1(-hh * 0.6)} ${r1(w + 2)} ${r1(-hh * 0.4)} ${w} 0Z`;
    const pille = (f) => {
      const y = r1(f.y), cl = col(f.wert);
      return `<g${more(f.entity)}><line x1="60" y1="${y}" x2="72" y2="${y}" stroke="${cl}" stroke-width="1.5"/>` +
        `<rect x="2" y="${r1(y - 15)}" width="58" height="30" rx="10" style="fill:var(--secondary-background-color,#2a2d33)" stroke="${cl}" stroke-width="1.5"/>` +
        `<text x="31" y="${r1(y - 3)}" font-size="8" class="wc ws" font-weight="600" letter-spacing=".8">${esc(f.name)}</text>` +
        `<text x="31" y="${r1(y + 10)}" font-size="12" class="wc wt wv">${fmt(f.wert)}</text>` +
        `<circle cx="72" cy="${y}" r="4" fill="${cl}" stroke="#fff" stroke-width="1.5"/></g>`;
    };
    const stab = (y, hs) => {
      const cl = hs.on ? F.aktiv : '#b0b6bd', pitch = 70 / c.hs_stufen;
      let s = hs.on ? `<ellipse cx="156" cy="${y}" rx="50" ry="13" fill="url(#wwHeat)" class="wb" style="animation-duration:2.4s"/>` : '';
      s += `<g${more(hs.stufe || hs.leistung || hs.temp)}><path d="M202 ${y}h-10l-3-4${'l-6 8l-6-8'.repeat(6)}l-3 4" fill="none" stroke="${cl}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
      s += `<rect x="198" y="${y - 11}" width="16" height="22" rx="3" fill="#2b2f35" stroke="${cl}" stroke-width="1.5"/>`;
      s += `<text x="192" y="${y - 13}" font-size="9.5" class="we wo wt" fill="${hs.on ? F.aktiv : '#fff'}">${esc(hs.name)}</text>`;
      if (hs.stufe) for (let i = 0; i < c.hs_stufen; i++)
        s += `<rect x="${r2(124 + i * pitch)}" y="${y + 11}" width="${r2(pitch - 2)}" height="4" rx="1.5" fill="${i < hs.step ? F.aktiv : 'rgba(255,255,255,.3)'}"/>`;
      const info = [hs.leistung ? watt(hs.p) : '', hs.temp ? fmt(S(hs.temp)) : ''].filter(Boolean).join(' · ');
      if (info) s += `<text x="192" y="${y + (hs.stufe ? 28 : 22)}" font-size="9" class="we wo" fill="#fff">${info}</text>`;
      return s + '</g>';
    };
    const chip = (icon, text, on, e) =>
      `<span class="chip${e ? ' wx' : ''}"${e ? ` data-more="${esc(e)}"` : ''}${on ? ` style="background:color-mix(in srgb,${F.aktiv} 16%,transparent);color:${F.aktiv}"` : ''}><ha-icon icon="${icon}" style="--mdc-icon-size:15px"></ha-icon>${text}</span>`;

    /* ---------- Kopfzeile ---------- */
    let o = `<div class="kopf"><div class="l"><div class="ic"><ha-icon icon="mdi:water-boiler" style="--mdc-icon-size:22px;color:${avg !== null ? col(avg) : 'var(--secondary-text-color)'}"></ha-icon></div>`;
    o += `<div><div class="t1">${esc(titel)}</div>${avg !== null ? `<div class="t2">${L.speicherAvg} ${r1(avg)} °C</div>` : ''}</div></div><div class="chips">`;
    if (c.aussen) o += chip('mdi:thermometer', fmt(S(c.aussen)), false, c.aussen);
    if (c.pv) o += chip('mdi:solar-power', watt(NUM(c.pv)), NUM(c.pv) > 10, c.pv);
    if (SO && SO.kollektor) o += chip('mdi:solar-panel', fmt(S(SO.kollektor)), so_on, SO.kollektor);
    if (K && (K.temp || K.brenner || K.pumpe)) o += chip(ZUSATZ_ICON[kTyp], K.temp ? fmt(t_k) : k_feuer ? L.an : L.aus, k_feuer, K.temp || K.brenner || K.pumpe);
    if (WP && W.leistung) o += chip(kuehl ? 'mdi:snowflake' : 'mdi:heat-pump', watt(wp), wp_on, W.leistung);
    if (HS && hs_hatP) o += chip('mdi:heating-coil', watt(hs_p), hs_on);
    o += '</div></div>';

    /* ---------- Abmessungen ---------- */
    const QS = WP && QT !== 'luft';
    const minX = Math.min(0, K ? -160 : 0, SO ? x0 - 10 : 0, HK ? bx1 - 30 : 0);
    let unten = HK ? 574 + dyw + hkExtra : SO ? 412 : 400;
    if (QS) unten = Math.max(unten, 566);
    o += `<svg viewBox="${minX} -30 ${486 - minX} ${unten + 30}"><defs>`;
    o += `<linearGradient id="wwTemp" gradientUnits="userSpaceOnUse" x1="0" y1="14" x2="0" y2="374"><stop offset="0" stop-color="${col(stops[0].wert)}"/>` +
      stops.map((st) => `<stop offset="${Math.round(((st.y - 14) / 360) * 1000) / 1000}" stop-color="${col(st.wert)}"/>`).join('') +
      `<stop offset="1" stop-color="${col(stops[stops.length - 1].wert)}"/></linearGradient>`;
    o += `<linearGradient id="wwCyl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".18" stop-color="#fff" stop-opacity=".12"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>`;
    o += `<linearGradient id="wwRed" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${F.geraet_hell}"/><stop offset="1" stop-color="${F.geraet_dunkel}"/></linearGradient>`;
    o += `<linearGradient id="wwBox" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".25" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>`;
    o += `<linearGradient id="wwLegend"><stop offset="0" stop-color="rgb(47,107,255)"/><stop offset=".5" stop-color="rgb(166,70,240)"/><stop offset="1" stop-color="rgb(255,59,48)"/></linearGradient>`;
    o += `<radialGradient id="wwHeat"><stop offset="0" stop-color="${F.aktiv}" stop-opacity=".75"/><stop offset="1" stop-color="${F.aktiv}" stop-opacity="0"/></radialGradient>`;
    o += `<linearGradient id="wwNut" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d7dbe0"/><stop offset=".35" stop-color="#9aa1aa"/><stop offset=".55" stop-color="#6b727c"/><stop offset="1" stop-color="#3a3f46"/></linearGradient>`;
    if (K) {
      o += kHell
        ? `<linearGradient id="wwSteel"><stop offset="0" stop-color="#f1f3f5"/><stop offset=".5" stop-color="#d4d8dd"/><stop offset="1" stop-color="#9aa1aa"/></linearGradient>`
        : `<linearGradient id="wwSteel"><stop offset="0" stop-color="#5c626b"/><stop offset=".45" stop-color="#3d4249"/><stop offset="1" stop-color="#1c1f23"/></linearGradient>`;
      o += `<linearGradient id="wwFlue"><stop offset="0" stop-color="#7a818b"/><stop offset=".5" stop-color="#4a4f57"/><stop offset="1" stop-color="#2a2d33"/></linearGradient>`;
      o += `<radialGradient id="wwFire" cx=".5" cy="1" r=".95"><stop offset="0" stop-color="${kTyp === 'gas' ? '#7fb2ff' : '#ffb347'}" stop-opacity=".95"/><stop offset=".45" stop-color="${kTyp === 'gas' ? '#3d8bff' : '#ff5a1f'}" stop-opacity=".45"/><stop offset="1" stop-color="#ff3b1f" stop-opacity="0"/></radialGradient>`;
      o += `<radialGradient id="wwGlut"><stop offset="0" stop-color="#ff8c2a" stop-opacity=".95"/><stop offset="1" stop-color="#ff3b1f" stop-opacity="0"/></radialGradient>`;
      o += `<clipPath id="wwWin"><rect x="-136" y="218" width="62" height="76" rx="4"/></clipPath>`;
    }
    if (SO) o += `<linearGradient id="wwSol" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2b4a8a"/><stop offset="1" stop-color="#0f1a33"/></linearGradient>`;
    if (W8) o += `<linearGradient id="wwW8" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${CW}"/><stop offset="1" stop-color="${CK}"/></linearGradient>`;
    o += `<pattern id="wwGrid" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 4L4 0M-1 1L1-1M3 5L5 3M0 0L4 4M-1 3L1 5M3-1L5 1" stroke="#fff" stroke-opacity=".55" stroke-width=".5"/></pattern>`;
    o += `<filter id="wwShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity=".35"/></filter></defs>`;

    /* ---------- Rohre ---------- */
    if (FM) {
      o += rohr('M206 46H336', F.warm, fm_on);
      o += rohr('M452 90H458Q466 90 466 98V382Q466 390 458 390H145Q137 390 137 382V376', F.kalt, fm_on);
    }
    if (WP) {
      o += rohr(`M206 ${y_bo}H252Q262 ${y_bo} 262 ${y_bo + 10}V${y_m - 14}`, CK, wpO, tO);
      o += rohr(`M206 ${y_bu}H252Q262 ${y_bu} 262 ${y_bu - 10}V${y_m + 14}`, CK, wpU, tU);
      o += rohr(`M277 ${y_m}H326`, CK, wp_on);
      o += rohr(`M350 146V136Q350 128 342 128H308Q300 128 300 120V${y_ro + 8}Q300 ${y_ro} 292 ${y_ro}H206`, CW, wpO, tO);
      o += rohr(`M326 ${y_ru}H270A8 8 0 0 0 254 ${y_ru}H206`, CW, wpU, tU);
      if (QS) {
        const qon = wp_on || (W.quelle_pumpe ? ON(W.quelle_pumpe) : false);
        if (QT === 'sole') o += rohr('M400 372V381A9 9 0 0 1 400 399V540Q400 552 415 552Q430 552 430 540V399A9 9 0 0 1 430 381V372', F.quelle, qon);
        else o += rohr('M400 535V399A9 9 0 0 0 400 381V372', F.quelle, qon) + rohr('M430 372V381A9 9 0 0 1 430 399V535', F.quelle, qon);
      }
    }
    const TWc = c.trinkwasser;
    if (TW) {
      if (ZK) o += rohr(`M${tw} -6H${tk}`, F.tw_warm, zirk_on);
      o += rohr(`M${tk} -26V${tyb}`, F.tw_kalt) + rohr(`M${tw} ${tyb}V-26`, F.tw_warm);
      if (zapf) o += `<path d="M${tk} -26V${tyb}M${tw} ${tyb}V-26" class="w3"/>`;
      else if (zirk_on) o += `<path d="M${tk} -6V${tyb}M${tw} ${tyb}V-6" class="w3"/>`;
      o += TWc && TWc.zaehler ? `<g${more(TWc.zaehler)}>${zaehlerSym(tk, -18)}</g>` : `<path d="M${tk - 4}-23l4 4 4-4" class="wa"/>`;
      o += `<path d="M${tw - 4}-19l4-4 4 4" class="wa"/>`;
      if (ZK) {
        o += `<g data-act="zirk" class="wx"><title>${L.zirkTitle}</title><circle cx="${tm}" cy="-6" r="14" fill="transparent"/>${pumpe(tm, -6, 'l', zirk_on)}</g>`;
        o += `<text x="${tm}" y="-20" font-size="7" class="wc ws" font-weight="600">${L.zirk}</text>`;
      }
      o += `<text x="${tk - 8}" y="-14" font-size="7.5" class="we" font-weight="600" fill="${F.tw_kalt}">${esc(c.text_tw_kalt ?? L.kalt)}</text><text x="${tw + 8}" y="-14" font-size="7.5" font-weight="600" fill="${F.tw_warm}">${esc(c.text_tw_warm ?? L.warm)}</text>`;
      if (TT && FMx && (FMx.temp || FMx.durchfluss))
        o += `<text x="${tw + 8}" y="-3" font-size="8" class="wt"${more(FMx.temp || FMx.durchfluss)} fill="${zapf ? F.aktiv : '#9aa0a6'}">${[FMx.temp ? fmt(S(FMx.temp)) : '', FMx.durchfluss ? r1(NUM(FMx.durchfluss)) + ' l/min' : ''].filter(Boolean).join(' · ')}</text>`;
      if (TWc) {
        const z1 = [TWc.temp ? fmt(S(TWc.temp)) : '', TWc.zaehler ? `${r1(NUM(TWc.zaehler))} ${U(TWc.zaehler, 'm³')}` : ''].filter(Boolean).join(' · ');
        if (z1) o += `<text x="${tk - 8}" y="-3" font-size="8" class="we wv wx" data-more="${esc(TWc.temp || TWc.zaehler)}">${esc(z1)}</text>`;
        if (TWc.enthaertung) {
          const ev = S(TWc.enthaertung);
          o += `<text x="${tk - 8}" y="8" font-size="8" class="we ws wx" data-more="${esc(TWc.enthaertung)}">${L.enth} ${isNum(ev) ? r1(Number(ev)) + ' ' + esc(U(TWc.enthaertung, '%')) : ON(TWc.enthaertung) ? L.an : L.aus}</text>`;
        }
      }
    }
    if (K) o += rohr(`M70 ${y_bu}H-58`, F.kalt, k_pumpe) + rohr(`M-58 ${y_ru}H70`, F.warm, k_pumpe);
    if (SO) {
      o += rohr(`M${x0 + 52} 36V387Q${x0 + 52} 395 ${x0 + 60} 395H102Q110 395 110 387V374`, F.warm, so_on);
      o += rohr(`M122 374V397Q122 405 114 405H${x0 + 16}Q${x0 + 8} 405 ${x0 + 8} 397V36`, F.kalt, so_on);
    }

    /* ---------- Heizkreisverteiler ---------- */
    const y_vv = 420 + dyw, y_rv = 448 + dyw, y_hm = 482 + dyw, y_he = 548 + dyw;
    const bxV = W8 ? 356 : 300, bxR = W8 ? 372 : 317, srcV = W8 ? 356 : 295, srcR = W8 ? 372 : 312;
    if (HK) {
      if (WP && akt.length && !wp_on) o += `<path d="M206 ${y_ru}H254A8 8 0 0 1 270 ${y_ru}H295M240 ${y_bu}H206" class="w3" style="${td}"/>`;
      const tf = 1 / Math.max(hk_fl, 0.04), fl1 = hk_fl > 0.04;
      const jmp = (x) => (FM ? `399A9 9 0 0 0 ${x} 381` : '381');
      const rl1 = W8 ? `M322 462H320Q312 462 312 454V${jmp(312)}` : `M312 ${y_rv}V${jmp(312)}`;
      o += rohr(WP ? `${rl1}V368Q312 360 304 360H248Q240 360 240 352V${y_bu}` : `${rl1}V${y_bu + 8}Q312 ${y_bu} 304 ${y_bu}H206`, CK, fl1, tf);
      o += rohr((WP ? `M295 ${y_ru}V${y_m - 9}A9 9 0 0 0 295 ${y_m + 9}V351A9 9 0 0 0 295 369`
        : `M206 ${y_ru}H287Q295 ${y_ru} 295 ${y_ru + 8}V${y_bu - 9}A9 9 0 0 0 295 ${y_bu + 9}`) +
        `V${FM ? '381A9 9 0 0 0 295 399' : '399'}` + (W8 ? 'V402Q295 410 303 410H304A8 8 0 0 1 320 410H322' : `V${y_vv}`), CW, fl1, tf);
      if (W8) {
        o += rohr(`M342 410H348Q356 410 356 418V${y_vv}`, CW, fl1, tf);
        o += rohr(`M372 ${y_rv}V470Q372 462 364 462A8 8 0 0 0 348 462H342`, CK, fl1, tf);
      }
      for (const x of hks) {
        const rx = x.x + 16;
        if (x.MIX) {
          o += rohr(`M${rx} ${y_he}V${y_hm}`, CK, x.on);
          o += rohr(`M${rx} ${y_hm}V${y_rv}`, CK, x.on && x.a > 0.04, 1 / Math.max(x.a, 0.04));
          o += rohr(`M${rx} ${y_hm}H${x.x - 1}`, CK, x.on && x.a < 0.96, 1 / Math.max(1 - x.a, 0.04));
        } else o += rohr(`M${rx} ${y_he}V${y_rv}`, CK, x.on);
      }
      o += verteiler(bx1, bxR, y_rv, CK);
      if (akt.length) o += `<path d="M${Math.min(...akt) + 16} ${y_rv}H${srcR}" class="w3" style="${td}"/>`;
      for (const x of hks) {
        const sx = x.x - 16, jump = `M${sx} ${y_vv}V${y_rv - 11}A11 11 0 0 1 ${sx} ${y_rv + 11}`;
        if (x.MIX) {
          o += rohr(`${jump}V${y_hm - 14}`, CW, x.on && x.a > 0.04, 1 / Math.max(x.a, 0.04));
          o += rohr(`M${sx} ${y_hm + 14}V${y_he}`, x.c, x.on);
        } else o += rohr(`${jump}V${y_he}`, CW, x.on);
      }
      o += verteiler(bx1, bxV, y_vv, CW);
      if (akt.length) o += `<path d="M${srcV} ${y_vv}H${Math.min(...akt) - 16}" class="w3" style="${td}"/>`;
      o += `<text x="${bx1 - 8}" y="${y_vv + 3}" font-size="7.5" class="we ws" font-weight="600">VL</text><text x="${bx1 - 8}" y="${y_rv + 3}" font-size="7.5" class="we ws" font-weight="600">RL</text>`;
      if (W8) {
        const WX = c.weiche;
        o += `<g${more(WX.temp)}><rect x="322" y="400" width="20" height="72" rx="10" fill="url(#wwW8)" stroke="#fff" stroke-opacity=".5" stroke-width="1.2"/>`;
        o += `<rect x="326" y="406" width="4" height="60" rx="2" fill="#fff" opacity=".25"/>`;
        if (WX.temp) o += `<text x="332" y="436" font-size="7.5" class="wc wt wo" fill="#fff" transform="rotate(-90 332 436)">${fmt(S(WX.temp))}</text>`;
        o += '</g>';
      }
      for (const x of hks) {
        const sx = x.x - 16;
        if (x.MIX) {
          o += mischer(sx, y_hm, CW, isNum(x.m) ? x.a : null) + tee(x.x + 16, y_hm);
          if (isNum(x.m)) o += `<text x="${sx - 26}" y="${y_hm + 19}" font-size="7.5" class="wc wt wx" data-more="${esc(x.mischer)}" style="fill:${x.c}"><title>${L.mischerTitle(esc(x.m))}</title>${Math.round(x.a * 100)}%</text>`;
        }
        if (x.pumpe) o += `<g${more(x.pumpe)}>${pumpe(sx, 514 + dyw, 'd', x.on)}</g>`;
        o += `<path d="M${sx - 4} ${y_he - 9}l4 4 4-4M${x.x + 12} ${y_he - 5}l4-4 4 4" class="wa"/>`;
        o += `<text x="${x.x}" y="${y_he + 16}" font-size="10" class="wc wt${x.on ? '' : ' wv'}"${x.on ? ` fill="${F.aktiv}"` : ''}>${esc(x.name)}</text>`;
        let y = y_he + 28;
        for (const z of x.zeilen) { o += `<text x="${x.x}" y="${y}" font-size="8.5" class="wc ws wx" data-more="${esc(z.e)}">${esc(z.t)}</text>`; y += 12; }
        const hc = x.on ? x.c : '#8a9099';
        if (x.typ === 'fussboden' || x.typ === 'fussbodenheizung' || x.typ === 'floor')
          o += `<path d="M${x.x - 22} ${y}h40a3 3 0 0 1 0 6h-40a3 3 0 0 0 0 6h40a3 3 0 0 1 0 6h-40" fill="none" stroke="${hc}" stroke-width="2" stroke-linecap="round"/>`;
        else if (x.typ === 'heizkoerper' || x.typ === 'radiator')
          o += `<rect x="${x.x - 20}" y="${y - 2}" width="40" height="20" rx="3" fill="#2b2f35" stroke="${hc}" stroke-width="1.5"/>` +
            [0, 1, 2, 3, 4].map((k) => `<path d="M${x.x - 14 + k * 7} ${y + 2}v12" stroke="${hc}" stroke-width="2" stroke-linecap="round"/>`).join('');
      }
    }

    /* Umschaltventil WP + T-Stücke */
    if (WP) o += W.ventil ? `<g${more(W.ventil)}>${mischer(262, y_m, CK, vb, CW, CK)}</g>` : mischer(262, y_m, CK);
    if (HK && WP) o += tee(295, y_ru) + tee(240, y_bu);
    if (TW && ZK) o += tee(tk, -6) + tee(tw, -6);

    /* Wärmemengenzähler */
    if (WP && W.wmz) o += `<g${more(W.wmz)}>${zaehlerSym(300, 100)}<text x="292" y="103" font-size="8" class="we wt wv">${r1(NUM(W.wmz))} ${esc(U(W.wmz, 'kWh'))}</text></g>`;
    if (K && K.wmz) o += `<g${more(K.wmz)}>${zaehlerSym(-30, y_ru)}<text x="-30" y="${y_ru - 11}" font-size="8" class="wc wt wv">${r1(NUM(K.wmz))} ${esc(U(K.wmz, 'kWh'))}</text></g>`;

    /* Legende */
    if (fl.length) {
      const lx = FM || WP ? 405 : 280, ly = FM || WP ? 122 : 30;
      o += `<text x="${lx}" y="${ly}" font-size="8" class="wc ws" font-weight="600" letter-spacing=".8">${L.speicher}</text><rect x="${lx - 19}" y="${ly + 6}" width="38" height="5" rx="2.5" fill="url(#wwLegend)"/><text x="${lx - 23}" y="${ly + 11}" font-size="8" class="we ws">${c.t_min}°</text><text x="${lx + 23}" y="${ly + 11}" font-size="8" class="ws">${c.t_max}°</text>`;
    }

    /* ---------- Solar ---------- */
    if (SO) {
      o += `<g${more(SO.kollektor || SO.leistung || SO.pumpe)}>`;
      o += `<path d="M${x0} 36L${x0 + 14} -22H${x0 + 70}L${x0 + 56} 36Z" fill="url(#wwSol)" stroke="#9aa0a6" stroke-width="1.2" stroke-linejoin="round"/>`;
      o += [1, 2, 3].map((k) => `<path d="M${x0 + k * 14} 36L${x0 + 14 + k * 14} -22" stroke="#9aa0a6" stroke-opacity=".6" stroke-width=".8"/>`).join('');
      o += `<path d="M${x0 + 7} 7H${x0 + 63}" stroke="#9aa0a6" stroke-opacity=".6" stroke-width=".8"/>`;
      const sc = so_on ? '#ffd23f' : '#6b7280';
      o += `<circle cx="${x0 + 80}" cy="-16" r="5" fill="${sc}"${so_on ? ' class="wb" style="animation-duration:3s"' : ''}/>` +
        [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M${x0 + 80} -24v-3" stroke="${sc}" stroke-width="1.5" stroke-linecap="round" transform="rotate(${a} ${x0 + 80} -16)"/>`).join('');
      if (SO.kollektor) o += `<text x="${x0 + 30}" y="54" font-size="11" class="wc wt${so_on ? '' : ' wv'}"${so_on ? ` fill="${F.solar}"` : ''}>${fmt(S(SO.kollektor))}</text>`;
      o += `<text x="${x0 + 30}" y="${SO.kollektor ? 66 : 54}" font-size="7.5" class="wc ws" font-weight="600" letter-spacing="1">${esc(String(SO.name || L.solar).toUpperCase())}</text></g>`;
      if (SO.pumpe) o += `<g${more(SO.pumpe)}>${pumpe(x0 + 8, 200, 'u', so_on)}</g>`;
      if (SO.leistung) o += `<text x="${x0 + 30}" y="250" font-size="8.5" class="wc wt wx${so_on ? '' : ' ws'}" data-more="${esc(SO.leistung)}"${so_on ? ` fill="${F.solar}"` : ''}>${watt(NUM(SO.leistung))}</text>`;
      if (SO.wmz) o += `<text x="${x0 + 30}" y="264" font-size="8" class="wc ws wx" data-more="${esc(SO.wmz)}">${r1(NUM(SO.wmz))} ${esc(U(SO.wmz, 'kWh'))}</text>`;
    }

    /* ---------- Zusatzwärme ---------- */
    if (K) {
      const txt = kHell ? '#1f2329' : '#fff';
      if (kTyp !== 'fernwaerme') o += `<rect x="-114" y="-30" width="18" height="180" fill="url(#wwFlue)"/><rect x="-118" y="2" width="26" height="8" rx="2" fill="#2b2f35"/><rect x="-117" y="128" width="24" height="5" rx="1.5" fill="#2b2f35"/>`;
      else o += rohr('M-120 -26V150', F.warm, k_feuer) + rohr('M-90 150V-26', F.kalt, k_feuer) + `<text x="-105" y="-18" font-size="7.5" class="wc ws" font-weight="600">${esc(L.typ.fernwaerme.toUpperCase())}</text>`;
      if (K.abgas && kTyp !== 'fernwaerme') o += `<text x="-90" y="60" font-size="8" class="wv wx" data-more="${esc(K.abgas)}">${L.abgas} ${fmt(S(K.abgas))}</text>`;
      o += `<rect x="-146" y="362" width="12" height="22" rx="2" fill="#3a3f46"/><rect x="-76" y="362" width="12" height="22" rx="2" fill="#3a3f46"/>`;
      o += `<rect x="-150" y="150" width="90" height="214" rx="10" fill="url(#wwSteel)" filter="url(#wwShadow)"/><rect x="-150" y="150" width="90" height="214" rx="10" fill="url(#wwBox)"/>`;
      o += `<rect x="-154" y="146" width="98" height="10" rx="3" fill="#2b2f35" stroke="#555b63" stroke-width=".8"/><text x="-142" y="170" font-size="8" class="wt" letter-spacing="1.5" fill="${txt}" opacity=".85">${esc(String(kName).toUpperCase())}</text>`;
      if (K.temp) {
        o += `<g${more(K.temp)}><rect x="-142" y="176" width="74" height="28" rx="5" fill="#0f1114" fill-opacity=".9" stroke="#fff" stroke-opacity=".08"/>`;
        o += `<text x="${K.trend ? -112 : -105}" y="195" font-size="14" class="wc wt" fill="${k_warm || k_feuer ? F.aktiv : '#e0e3e7'}">${fmt(t_k)}</text>`;
        if (K.trend) o += `<text x="-80" y="195" font-size="13" class="wc wt" fill="${k_tr === 'up' ? F.warm : k_tr === 'down' ? F.kalt : '#8a9099'}">${k_tr === 'up' ? '↑' : k_tr === 'down' ? '↓' : '→'}</text>`;
        o += '</g>';
      }
      o += `<rect x="-142" y="212" width="74" height="88" rx="${kHell ? 30 : 6}" fill="#15171b" stroke="#555b63" stroke-width="1.2"/>`;
      o += `<g clip-path="url(#wwWin)"><rect x="-136" y="218" width="62" height="76" fill="#0c0d0f"/>`;
      if (kFeuerTyp) {
        if (k_feuer) {
          const fc = kTyp === 'gas' ? ['#1f6fff', '#5fa0ff', '#cfe3ff'] : ['#ff5a1f', '#ffa21c', '#ffe27a'];
          const sk = kTyp === 'gas' || kTyp === 'oel' ? 0.7 : 1;
          o += `<rect x="-136" y="218" width="62" height="76" fill="url(#wwFire)" class="wb" style="animation-duration:1.7s"/>`;
          for (const [fx, w, hh, d] of [[-118, 9, 32, 0.9], [-105, 12, 50, 1.1], [-92, 9, 38, 0.8]])
            o += `<g transform="translate(${fx} 284)"><g class="wl" style="animation-duration:${d}s" opacity=".95"><path d="${flamme(w, r1(hh * sk))}" fill="${fc[0]}"/><path d="${flamme(r1(w * 0.65), r1(hh * 0.7 * sk))}" fill="${fc[1]}"/><path d="${flamme(r1(w * 0.35), r1(hh * 0.42 * sk))}" fill="${fc[2]}"/></g></g>`;
        }
        if (k_warm && ['kamin', 'holzvergaser', 'pellet'].includes(kTyp))
          o += `<ellipse cx="-105" cy="287" rx="30" ry="9" fill="url(#wwGlut)" class="wb" style="animation-duration:${k_feuer ? '1.2s' : '3s'}"/>`;
        if (kTyp === 'kamin' || kTyp === 'holzvergaser') {
          const ls = k_warm ? '#ff7a1f' : '#2a1a10';
          o += `<rect x="-128" y="280" width="46" height="9" rx="4.5" fill="#4a2e1c" stroke="${ls}" transform="rotate(6 -105 284)"/><rect x="-126" y="279" width="44" height="9" rx="4.5" fill="#5b3a24" stroke="${ls}" transform="rotate(-7 -105 284)"/>`;
        } else if (kTyp === 'pellet') {
          o += Array.from({ length: 14 }, (_, k) => `<rect x="${-126 + (k % 7) * 6}" y="${282 + Math.floor(k / 7) * 4}" width="5" height="3" rx="1.5" fill="${k_warm ? '#c46a2a' : '#6b4a2b'}"/>`).join('');
        } else o += `<rect x="-122" y="286" width="34" height="5" rx="2" fill="#3a3f46"/>`;
      } else if (kTyp === 'fernwaerme') {
        for (let k = 0; k < 7; k++) o += `<path d="M-128 ${230 + k * 9}h46" stroke="${k % 2 ? F.kalt : F.warm}" stroke-width="4" stroke-linecap="round" opacity="${k_feuer ? 1 : 0.35}"/>`;
      } else {
        const gc = k_feuer ? F.aktiv : '#6b7280';
        o += `<g${k_feuer ? ' class="wg"' : ''}><circle cx="-105" cy="252" r="16" fill="none" stroke="${gc}" stroke-width="5" stroke-dasharray="5 4"/><circle cx="-105" cy="252" r="9" fill="${gc}"/></g>`;
        o += `<path d="M-100 272l-9 12h7l-4 10 10-13h-7z" fill="${k_feuer ? '#ffd23f' : '#6b7280'}"/>`;
      }
      o += `<path d="M-136 292H-74" stroke="#2b2f35" stroke-width="3"/><path d="M-132 222H-118L-134 262Z" fill="#fff" opacity=".06"/></g>`;
      o += `<rect x="-142" y="308" width="74" height="20" rx="3" fill="#2b2f35" stroke="#555b63"/>`;
      const lade = K.zuluft ? `${L.luft} ${isNum(S(K.zuluft)) ? Math.round(Number(S(K.zuluft))) + ' %' : S(K.zuluft)}`
        : kTyp === 'bhkw' && K.leistung_el ? `${watt(NUM(K.leistung_el))} el` : K.leistung ? watt(NUM(K.leistung)) : '';
      o += lade ? `<text x="-105" y="321" font-size="8" class="wc wt wx" data-more="${esc(K.zuluft || K.leistung_el || K.leistung)}" fill="#cfd4da">${esc(lade)}</text>` : `<path d="M-118 318H-92" stroke="#15171b" stroke-width="3" stroke-linecap="round"/>`;
      if (K.temp || K.brenner || K.pumpe) {
        const st = kTyp === 'kamin' ? (k_feuer ? L.brennt : k_glut ? L.glut : L.aus)
          : kFeuerTyp ? (k_feuer ? L.brennerAn : k_glut ? L.warmK : L.aus)
          : k_feuer ? (kTyp === 'bhkw' ? L.laeuft : L.aktiv) : L.aus;
        o += `<text x="-105" y="349" font-size="9" class="wc" font-weight="600" fill="${k_feuer ? (kHell ? '#c2410c' : F.aktiv) : k_glut ? '#ff8c2a' : kHell ? '#4b5058' : '#9aa0a6'}">${st}</text>`;
      }
      o += stub(-64, y_ru - 6, 10, 12) + stub(-64, y_bu - 6, 10, 12);
      if (K.pumpe) o += `<g${more(K.pumpe)}>${pumpe(-24, y_bu, 'l', k_pumpe)}</g>`;
      if (K.modus) {
        o += `<g data-act="modus" class="wx"><title>${L.modusTitle}</title><rect x="-52" y="${y_bu + 12}" width="56" height="19" fill="transparent"/>`;
        o += `<rect x="-48" y="${y_bu + 15}" width="48" height="13" rx="6.5" fill="${k_mod[1]}" fill-opacity=".18" stroke="${k_mod[1]}"/>`;
        o += `<text x="-27" y="${y_bu + 24.5}" font-size="7.5" class="wc wt" letter-spacing=".6" fill="${k_mod[1]}">${esc(k_mod[0])}</text>`;
        o += `<path d="M-9 ${y_bu + 19.5}l3 2-3 2" fill="none" stroke="${k_mod[1]}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></g>`;
      }
    }

    /* ---------- Speicher ---------- */
    o += `<rect x="93" y="362" width="11" height="22" rx="2" fill="#3a3f46"/><rect x="170" y="362" width="11" height="22" rx="2" fill="#3a3f46"/>`;
    const cap = (a, b) =>
      `<rect x="72" y="${a}" width="130" height="${b - a}" rx="65" ry="22" fill="url(#wwTemp)" filter="url(#wwShadow)"/><rect x="72" y="${a}" width="130" height="${b - a}" rx="65" ry="22" fill="url(#wwCyl)"/>` +
      `<rect x="86" y="${a + 30}" width="7" height="${b - a - 60}" rx="3.5" fill="#fff" opacity=".14"/><path d="M72 ${a + 26}Q137 ${a + 46} 202 ${a + 26}" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.2"/><path d="M72 ${b - 26}Q137 ${b - 6} 202 ${b - 26}" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1.2"/>` +
      `<rect x="72" y="${a}" width="130" height="${b - a}" rx="65" ry="22" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="1.5"/>`;
    const etikett = (y, t) => `<text x="137" y="${y}" font-size="8.5" class="wc wt wo" letter-spacing="1" fill="#fff" opacity=".8">${esc(t)}</text>`;
    const liter = (v) => (v !== null && v !== undefined && v !== '' ? `${v} l` : '');
    if (SPLIT) {
      o += cap(14, y_t - 8) + cap(y_t + 8, 374);
      o += etikett(38, [L.ww, liter(c.volumen_ww)].filter(Boolean).join(' · '));
      o += etikett(338, [L.puffer, liter(c.volumen)].filter(Boolean).join(' · '));
    } else {
      o += cap(14, 374);
      if (liter(c.volumen)) o += etikett(338, liter(c.volumen));
    }
    if (TYP === 'kombi') {
      const ib = y_t - 14;
      o += `<rect x="102" y="30" width="70" height="${ib - 30}" rx="35" ry="14" fill="${col(fl.length ? fl[0].wert : 'x')}" fill-opacity=".9" stroke="#fff" stroke-opacity=".7" stroke-width="1.5"/>`;
      o += `<rect x="110" y="44" width="5" height="${Math.max(0, ib - 74)}" rx="2.5" fill="#fff" opacity=".2"/>`;
      o += `<path d="M110 18V${ib - 10}" stroke="#cfd4da" stroke-width="2" opacity=".8"/><path d="M164 18V34" stroke="#cfd4da" stroke-width="2" opacity=".8"/>`;
      o += `<text x="146" y="${ib - 12}" font-size="8" class="wc wt wo" fill="#fff" opacity=".85">WW</text>`;
      if (zapf || zirk_on) o += `<path d="M110 18V${ib - 10}" class="w3" style="stroke-width:1.4px"/>`;
    }
    if (TYP === 'hygiene') {
      let hp = `M110 18V352H100`;
      for (let y = 352; y > 48; y -= 24) hp += `C100 ${y - 8} 176 ${y - 4} 176 ${y - 12}C176 ${y - 20} 100 ${y - 16} 100 ${y - 24}`;
      hp += `L164 32V18`;
      o += `<path d="${hp}" fill="none" stroke="#cfd4da" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>`;
      if (zapf || zirk_on) o += `<path d="${hp}" class="w3" style="stroke-width:1.4px"/>`;
    }
    if (TT) o += stub(104, 12, 12, 8) + stub(158, 12, 12, 8);
    if (TG) o += `<rect x="73" y="${y_t - 2}" width="128" height="4" fill="url(#wwGrid)"/><path d="M73 ${y_t - 2}H201M73 ${y_t + 2}H201" stroke="#fff" stroke-opacity=".6" stroke-width=".7"/>`;
    if (SO) {
      const sp = `M110 374V348H180Q186 348 186 354Q186 360 180 360H128Q122 360 122 366V374`;
      o += `<path d="${sp}" fill="none" stroke="${F.solar}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>`;
      if (so_on) o += `<path d="${sp}" class="w3" style="stroke-width:1.6px"/>`;
      o += stub(104, 368, 12, 8) + stub(116, 368, 12, 8);
    }
    for (const y of [...(FM ? [46] : []), ...(WP ? [y_ro, y_bo] : []), ...(WP || HK ? [y_ru, y_bu] : [])]) o += stub(198, y - 6, 14, 12);
    if (K) o += stub(62, y_ru - 6, 14, 12) + stub(62, y_bu - 6, 14, 12);
    if (FM) o += stub(131, 370, 12, 12);
    if (hso) o += stab((y_ro + y_bo) / 2, hso);
    if (hsu) o += stab((y_ru + y_bu) / 2, hsu);
    o += fl.map(pille).join('');

    /* Legionellenschutz */
    const LG = c.legionellen;
    if (LG) {
      const lAkt = LG.aktiv ? ON(LG.aktiv) : false;
      let t = '', lc = '#8a9099';
      if (lAkt) { t = L.legLaeuft; lc = F.aktiv; }
      else if (LG.letzte) {
        const s = S(LG.letzte);
        const tage = isNum(s) ? Number(s) : Number.isFinite(Date.parse(s)) ? Math.floor((Date.now() - Date.parse(s)) / 86400000) : null;
        if (tage !== null) {
          t = tage <= 0 ? L.legHeute : L.legVor(Math.round(tage));
          lc = tage <= LG.tage ? F.led : F.warm;
        }
      }
      const bx = TT ? 226 : 80;
      if (t) o += `<g data-more="${esc(LG.letzte || LG.aktiv)}" class="wx${lAkt ? ' wb' : ''}"><rect x="${bx}" y="-26" width="120" height="16" rx="8" fill="${lc}" fill-opacity=".16" stroke="${lc}"/><text x="${bx + 60}" y="-15" font-size="8" class="wc wt" fill="${lc}">${t}</text></g>`;
    }

    /* ---------- Frischwassermodul ---------- */
    if (FM) {
      o += `<rect x="340" y="14" width="110" height="90" rx="12" fill="url(#wwRed)" filter="url(#wwShadow)"/><rect x="340" y="14" width="110" height="90" rx="12" fill="url(#wwBox)"/>`;
      o += stub(332, 40, 10, 12) + stub(448, 84, 10, 12) + stub(356, 8, 12, 10) + stub(422, 8, 12, 10);
      o += `<text x="352" y="32" font-size="8" class="wt" letter-spacing="2" fill="#fff" opacity=".85">${esc(c.hersteller)}</text><text x="352" y="92" font-size="22" font-weight="800" fill="#fff">${esc(c.name_fm)}</text>`;
      if (FMx && (FMx.temp || FMx.durchfluss)) {
        o += `<g${more(FMx.temp || FMx.durchfluss)}><rect x="392" y="62" width="52" height="34" rx="5" fill="#0f1114" fill-opacity=".85" stroke="#fff" stroke-opacity=".08"/>`;
        if (FMx.temp) o += `<text x="418" y="${FMx.durchfluss ? 77 : 84}" font-size="11" class="wc wt" fill="${zapf ? F.aktiv : '#e0e3e7'}">${fmt(S(FMx.temp))}</text>`;
        if (FMx.durchfluss) o += `<text x="418" y="${FMx.temp ? 90 : 84}" font-size="8.5" class="wc" fill="${zapf ? F.aktiv : '#9aa0a6'}">${r1(NUM(FMx.durchfluss))} l/min</text>`;
        o += '</g>';
        o += `<path d="M430 22C426 29 424 32 424 35A6 6 0 0 0 436 35C436 32 434 29 430 22Z" fill="#fff" opacity=".85"/>`;
      } else o += `<path d="M430 30C424 40 421 45 421 49A9 9 0 0 0 439 49C439 45 436 40 430 30Z" fill="#fff" opacity=".85"/>`;
    }

    /* ---------- Wärmequelle Sole / Wasser ---------- */
    if (QS) {
      o += `<rect x="382" y="404" width="100" height="156" rx="4" fill="#6b4f3a" fill-opacity=".35"/><path d="M382 404H482" stroke="#4cb050" stroke-width="3"/>`;
      if (QT === 'wasser') {
        o += `<rect x="382" y="478" width="100" height="82" rx="4" fill="#3d8bff" fill-opacity=".25"/><path d="M382 478q6-4 12 0t12 0 12 0 12 0 12 0 12 0 12 0 12 0 4 0" fill="none" stroke="#3d8bff" stroke-opacity=".7" stroke-width="1.2"/>`;
        o += `<rect x="391" y="408" width="18" height="140" rx="3" fill="none" stroke="#9aa0a6" stroke-opacity=".7"/><rect x="421" y="408" width="18" height="140" rx="3" fill="none" stroke="#9aa0a6" stroke-opacity=".7"/>`;
      }
      o += stub(394, 368, 12, 8) + stub(424, 368, 12, 8);
      if (W.quelle_ein) o += `<text x="444" y="426" font-size="8.5" class="wt wv wx" data-more="${esc(W.quelle_ein)}">↑ ${fmt(S(W.quelle_ein))}</text>`;
      if (W.quelle_aus) o += `<text x="444" y="440" font-size="8.5" class="wt wv wx" data-more="${esc(W.quelle_aus)}">↓ ${fmt(S(W.quelle_aus))}</text>`;
    }

    /* ---------- Wärmepumpe ---------- */
    if (WP) {
      o += `<rect x="330" y="150" width="120" height="222" rx="14" fill="url(#wwRed)" filter="url(#wwShadow)"/><rect x="330" y="150" width="120" height="222" rx="14" fill="url(#wwBox)"/>`;
      o += stub(344, 142, 12, 10) + stub(322, y_ru - 6, 10, 12) + stub(322, y_m - 6, 10, 12);
      o += `<text x="342" y="168" font-size="9" class="wt" letter-spacing="2" fill="#fff" opacity=".9">${esc(c.hersteller)}</text>`;
      if (W.cop) o += `<text x="438" y="168" font-size="9" class="we wt wx" data-more="${esc(W.cop)}" fill="#fff">COP ${isNum(S(W.cop)) ? Number(S(W.cop)).toFixed(1) : '–'}</text>`;
      o += `<circle cx="390" cy="226" r="42" fill="#15171b" stroke="#0c0d0f" stroke-width="3"/><circle cx="390" cy="226" r="36" fill="#1d2025"/>`;
      const fan = wp_abtau ? F.kalt : wp_on ? (kuehl ? F.kalt : F.aktiv) : '#6b7280';
      const dreht = wp_on || wp_abtau;
      if (QT === 'luft') {
        o += `<g fill="${fan}"${dreht ? ' class="wr"' : ''}${wp_abtau ? ' style="animation-duration:4s"' : ''}>` +
          [0, 72, 144, 216, 288].map((a) => `<path d="M390 226Q405 213 397 192Q383 203 390 226Z" transform="rotate(${a} 390 226)"/>`).join('') + '</g>';
        o += `<circle cx="390" cy="226" r="14" fill="none" stroke="#fff" stroke-opacity=".07"/><circle cx="390" cy="226" r="25" fill="none" stroke="#fff" stroke-opacity=".07"/>`;
      } else {
        o += `<g${dreht ? ' class="wr" style="animation-duration:3s"' : ''}><path d="M390 222a4 4 0 1 1-4 4a9 9 0 1 0 9-9a15 15 0 1 1-15 15a22 22 0 1 0 22-22" fill="none" stroke="${fan}" stroke-width="3.5" stroke-linecap="round"/></g>`;
      }
      o += `<circle cx="390" cy="226" r="7" fill="#2b2f35" stroke="#555b63" stroke-width="1.5"/>`;
      const st = wp_sperre ? [L.sperre, F.warm] : wp_abtau ? [L.abtauen, F.kalt] : kuehl && wp_on ? [L.kuehlen, F.kalt]
        : wp_on ? [W.waerme ? L.waerme + ' ' + watt(NUM(W.waerme)) : c.text_wp_an ?? L.wpAn, '#9aa0a6'] : [c.text_wp_aus ?? L.wpAus, '#9aa0a6'];
      o += `<g${more(W.leistung || W.betrieb || W.waerme)}><rect x="342" y="282" width="96" height="46" rx="8" fill="#0f1114" fill-opacity=".85" stroke="#fff" stroke-opacity=".08"/>`;
      if (W.leistung) o += `<text x="390" y="305" font-size="17" class="wc wt" fill="${wp_on ? (kuehl ? F.kalt : F.aktiv) : '#e0e3e7'}">${watt(wp)}</text>`;
      o += `<text x="390" y="${W.leistung ? 320 : 309}" font-size="${W.leistung ? 8.5 : 10}" class="wc" fill="${st[1]}">${esc(st[0])}</text></g>`;
      const vr = [W.vorlauf ? 'VL ' + fmt(S(W.vorlauf)) : '', W.ruecklauf ? 'RL ' + fmt(S(W.ruecklauf)) : ''].filter(Boolean).join(' · ');
      if (vr) o += `<text x="390" y="341" font-size="8.5" class="wc wx" data-more="${esc(W.vorlauf || W.ruecklauf)}" fill="#fff" opacity=".9">${vr}</text>`;
      o += `<text x="342" y="364" font-size="20" font-weight="800" fill="#fff">${esc(c.name_wp)}</text>`;
      if (W.sg_ready) o += `<text x="424" y="356" font-size="8" class="we wt wx" data-more="${esc(W.sg_ready)}" fill="#fff" opacity=".85">SG ${esc(S(W.sg_ready))}</text>`;
      o += `<circle cx="434" cy="353" r="5" fill="${wp_sperre ? F.warm : wp_on ? F.led : '#4b5058'}" stroke="#fff" stroke-opacity=".35"${wp_on ? ' class="wb"' : ''}/>`;
      if (QT === 'luft' && (W.quelle_ein || W.quelle_aus))
        o += `<text x="390" y="382" font-size="8" class="wc wv wx" data-more="${esc(W.quelle_ein || W.quelle_aus)}">${L.luft} ${[W.quelle_ein ? fmt(S(W.quelle_ein)) : '', W.quelle_aus ? fmt(S(W.quelle_aus)) : ''].filter(Boolean).join(' → ')}</text>`;
    }
    o += '</svg>';

    /* ---------- Tagesenergie ---------- */
    if (c.energie.length) {
      const pal = [F.aktiv, F.warm, F.kalt, F.solar, F.led, '#a855f7'];
      const vals = c.energie.map((e) => NUM(e.entity));
      const max = Math.max(...vals, 0.001);
      o += '<div class="en">' + c.energie.map((e, i) =>
        `<div class="er" data-more="${esc(e.entity)}"><ha-icon icon="${esc(e.icon || 'mdi:lightning-bolt')}" style="--mdc-icon-size:16px"></ha-icon><span>${esc(e.name || e.entity)}</span>` +
        `<div class="b"><i style="width:${r1((vals[i] / max) * 100)}%;background:${e.farbe || pal[i % pal.length]}"></i></div><span class="v">${r1(vals[i])} ${esc(U(e.entity, 'kWh'))}</span></div>`).join('') + '</div>';
    }
    return o;
  }
}

/* ======================================================================== */
/* Grafischer Editor / Visual editor                                        */
/* ======================================================================== */
const LBL = {
  de: {
    titel: 'Titel', hersteller: 'Hersteller-Schriftzug', name_wp: 'Name WP', name_fm: 'Name FM', sprache: 'Sprache',
    t_min: 'Farbskala min (°C)', t_max: 'Farbskala max (°C)', hs_stufen: 'Heizstab-Stufen', aussen: 'Außentemperatur', pv: 'PV-Leistung',
    zirkulationspumpe: 'Zirkulationspumpe', speicher: 'Speicher', typ: 'Typ', volumen: 'Volumen (l)', volumen_ww: 'Volumen Warmwasser (l)',
    trennung: 'Trennung / Boilerhöhe (%)', wp: 'Wärmepumpe', leistung: 'Leistung', schwelle: 'Schwelle (W)', betrieb: 'Betrieb',
    vorlauf: 'Vorlauf', ruecklauf: 'Rücklauf', waerme: 'Wärmeleistung', cop: 'COP', sperre: 'EVU-Sperre', abtauen: 'Abtauen',
    kuehlen: 'Kühlbetrieb', sg_ready: 'SG-Ready', ventil: 'Umschaltventil', quelle_ein: 'Quelle ein', quelle_aus: 'Quelle aus',
    quelle_pumpe: 'Quellenpumpe', wmz: 'Wärmemengenzähler (kWh)', heizstab_oben: 'Heizstab oben', heizstab_unten: 'Heizstab unten',
    name: 'Name', stufe: 'Stufe', temp: 'Temperatur', kamin: 'Zusatzwärme', pumpe: 'Pumpe', modus: 'Pumpenmodus (input_select)',
    brenner: 'Brenner / Betrieb', warm: 'Glut ab (°C)', feuer: 'Feuer ab (°C)', trend: 'Trend', abgas: 'Abgastemperatur',
    zuluft: 'Zuluftklappe', leistung_el: 'Elektrische Leistung', solar: 'Solarthermie', kollektor: 'Kollektortemperatur',
    fm: 'Frischwassermodul', anzeigen: 'Anzeigen (auch ohne Sensoren)', durchfluss: 'Durchfluss (l/min)', weiche: 'Hydraulische Weiche',
    trinkwasser: 'Trinkwasser', zaehler: 'Wasserzähler', enthaertung: 'Enthärtung', legionellen: 'Legionellenschutz',
    letzte: 'Letzte Aufheizung', aktiv: 'Läuft gerade', tage: 'Warnung nach Tagen', fuehler: 'Speicherfühler', entity: 'Entität',
    hoehe: 'Höhe (%)', heizkreise: 'Heizkreise', mischer: 'Mischer (-100…100)', vorlauf_soll: 'Vorlauf Soll', raum: 'Raumtemperatur',
    energie: 'Tagesenergie', icon: 'Symbol', farbe: 'Farbe', add: 'Hinzufügen', remove: 'Entfernen',
  },
  en: {
    titel: 'Title', hersteller: 'Manufacturer label', name_wp: 'Heat pump name', name_fm: 'FWM name', sprache: 'Language',
    t_min: 'Colour scale min (°C)', t_max: 'Colour scale max (°C)', hs_stufen: 'Heater steps', aussen: 'Outdoor temperature', pv: 'PV power',
    zirkulationspumpe: 'Circulation pump', speicher: 'Storage tank', typ: 'Type', volumen: 'Volume (l)', volumen_ww: 'Hot water volume (l)',
    trennung: 'Separation / boiler height (%)', wp: 'Heat pump', leistung: 'Power', schwelle: 'Threshold (W)', betrieb: 'Running',
    vorlauf: 'Flow', ruecklauf: 'Return', waerme: 'Heat output', cop: 'COP', sperre: 'Grid lock', abtauen: 'Defrost',
    kuehlen: 'Cooling', sg_ready: 'SG Ready', ventil: 'Diverter valve', quelle_ein: 'Source in', quelle_aus: 'Source out',
    quelle_pumpe: 'Source pump', wmz: 'Heat meter (kWh)', heizstab_oben: 'Heater top', heizstab_unten: 'Heater bottom',
    name: 'Name', stufe: 'Step', temp: 'Temperature', kamin: 'Additional heat source', pumpe: 'Pump', modus: 'Pump mode (input_select)',
    brenner: 'Burner / running', warm: 'Embers from (°C)', feuer: 'Fire from (°C)', trend: 'Trend', abgas: 'Flue gas temperature',
    zuluft: 'Air damper', leistung_el: 'Electrical power', solar: 'Solar thermal', kollektor: 'Collector temperature',
    fm: 'Fresh water module', anzeigen: 'Show (even without sensors)', durchfluss: 'Flow rate (l/min)', weiche: 'Hydraulic separator',
    trinkwasser: 'Drinking water', zaehler: 'Water meter', enthaertung: 'Softener', legionellen: 'Legionella protection',
    letzte: 'Last heat-up', aktiv: 'Running now', tage: 'Warn after days', fuehler: 'Tank sensors', entity: 'Entity',
    hoehe: 'Height (%)', heizkreise: 'Heating circuits', mischer: 'Mixer (-100…100)', vorlauf_soll: 'Flow target', raum: 'Room temperature',
    energie: 'Daily energy', icon: 'Icon', farbe: 'Colour', add: 'Add', remove: 'Remove',
  },
};
const OPT = {
  de: {
    sprache: [['auto', 'Automatisch'], ['de', 'Deutsch'], ['en', 'English']],
    speicher: [['trennblech', 'Trennblech (2 Kammern)'], ['schicht', 'Schichtspeicher'], ['kombi', 'Kombispeicher (Tank-in-Tank)'], ['hygiene', 'Hygienespeicher (Wellrohr)'], ['getrennt', 'Warmwasser + Puffer getrennt']],
    wp: [['luft', 'Luft'], ['sole', 'Sole / Erdsonde'], ['wasser', 'Wasser / Brunnen']],
    kamin: [['kamin', 'Kaminofen'], ['holzvergaser', 'Holzvergaser'], ['pellet', 'Pellets'], ['gas', 'Gas'], ['oel', 'Öl'], ['fernwaerme', 'Fernwärme'], ['bhkw', 'BHKW']],
    hk: [['', '–'], ['fussboden', 'Fußbodenheizung'], ['heizkoerper', 'Heizkörper']],
  },
  en: {
    sprache: [['auto', 'Automatic'], ['de', 'Deutsch'], ['en', 'English']],
    speicher: [['trennblech', 'Baffle plate (2 zones)'], ['schicht', 'Stratified tank'], ['kombi', 'Combi tank (tank-in-tank)'], ['hygiene', 'Hygienic tank (coil)'], ['getrennt', 'Separate hot water + buffer']],
    wp: [['luft', 'Air'], ['sole', 'Brine / ground probe'], ['wasser', 'Water / well']],
    kamin: [['kamin', 'Stove'], ['holzvergaser', 'Wood boiler'], ['pellet', 'Pellets'], ['gas', 'Gas'], ['oel', 'Oil'], ['fernwaerme', 'District heating'], ['bhkw', 'CHP']],
    hk: [['', '–'], ['fussboden', 'Floor heating'], ['heizkoerper', 'Radiators']],
  },
};
const sel = {
  ent: { entity: {} }, txt: { text: {} }, bool: { boolean: {} }, icon: { icon: {} },
  num: (min, max) => ({ number: { min, max, mode: 'box' } }),
  opt: (list) => ({ select: { mode: 'dropdown', options: list.map(([value, label]) => ({ value, label })) } }),
};
const F_ = (name, selector) => ({ name, selector });
const E_ = (...names) => names.map((n) => F_(n, sel.ent));
const leer = (v) => v === '' || v === null || v === undefined || v === false || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);
const aufraeumen = (o) => {
  if (Array.isArray(o)) return o.map(aufraeumen);
  if (o && typeof o === 'object') {
    const r = {};
    for (const [k, v] of Object.entries(o)) { const x = aufraeumen(v); if (!leer(x)) r[k] = x; }
    return r;
  }
  return o;
};

class WarmwasserSchemaCardEditor extends HTMLElement {
  setConfig(config) {
    const c = { ...config };
    if (Array.isArray(c.fuehler)) c.fuehler = c.fuehler.map((f) => (Array.isArray(f) ? aufraeumen({ name: f[0], entity: f[1], hoehe: f[2] }) : { ...f }));
    if (c.weiche === true) c.weiche = { anzeigen: true };
    if (c.fm === true) c.fm = { anzeigen: true };
    if (!c.wp && c.wp_leistung) { c.wp = aufraeumen({ leistung: c.wp_leistung, schwelle: c.wp_schwelle }); delete c.wp_leistung; delete c.wp_schwelle; }
    if (!c.kamin && c.zusatzwaerme) { c.kamin = c.zusatzwaerme; delete c.zusatzwaerme; }
    if (c.trennung !== undefined && !(c.speicher && c.speicher.trennung !== undefined)) {
      c.speicher = { ...(c.speicher || {}), ...(c.trennung === false ? { typ: 'schicht' } : { trennung: c.trennung }) };
      delete c.trennung;
    }
    const struktur = ['fuehler', 'heizkreise', 'energie'].map((k) => (Array.isArray(c[k]) ? c[k].length : 0)).join(',');
    this._config = c;
    if (this._forms && struktur === this._struktur) this._sync();
    else { this._struktur = struktur; this._build(); }
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (this._forms) this._forms.forEach((f) => { f.hass = hass; });
    if (first && this._config) this._build();
  }

  _L() { return LBL[sprache(this._config, this._hass)]; }
  _O() { return OPT[sprache(this._config, this._hass)]; }

  _mainSchema() {
    const L = this._L(), O = this._O();
    return [
      { type: 'grid', name: '', schema: [F_('titel', sel.txt), F_('hersteller', sel.txt), F_('name_wp', sel.txt), F_('name_fm', sel.txt), F_('sprache', sel.opt(O.sprache)), F_('hs_stufen', sel.num(1, 12)), F_('t_min', sel.num(0, 90)), F_('t_max', sel.num(0, 95))] },
      ...E_('aussen', 'pv', 'zirkulationspumpe'),
      { type: 'expandable', name: 'speicher', title: L.speicher, icon: 'mdi:water-boiler', schema: [F_('typ', sel.opt(O.speicher)), { type: 'grid', name: '', schema: [F_('volumen', sel.num(0, 100000)), F_('volumen_ww', sel.num(0, 100000)), F_('trennung', sel.num(35, 70))] }] },
      { type: 'expandable', name: 'wp', title: L.wp, icon: 'mdi:heat-pump', schema: [F_('typ', sel.opt(O.wp)), ...E_('leistung'), F_('schwelle', sel.num(0, 10000)), ...E_('betrieb', 'vorlauf', 'ruecklauf', 'waerme', 'wmz', 'cop', 'ventil', 'kuehlen', 'sperre', 'abtauen', 'sg_ready', 'quelle_ein', 'quelle_aus', 'quelle_pumpe')] },
      { type: 'expandable', name: 'heizstab_oben', title: L.heizstab_oben, icon: 'mdi:heating-coil', schema: [F_('name', sel.txt), ...E_('stufe', 'leistung', 'temp')] },
      { type: 'expandable', name: 'heizstab_unten', title: L.heizstab_unten, icon: 'mdi:heating-coil', schema: [F_('name', sel.txt), ...E_('stufe', 'leistung', 'temp')] },
      { type: 'expandable', name: 'kamin', title: L.kamin, icon: 'mdi:fireplace', schema: [F_('typ', sel.opt(O.kamin)), F_('name', sel.txt), ...E_('temp', 'trend', 'pumpe', 'modus', 'brenner', 'leistung', 'leistung_el', 'wmz', 'abgas', 'zuluft'), { type: 'grid', name: '', schema: [F_('warm', sel.num(0, 100)), F_('feuer', sel.num(0, 100))] }] },
      { type: 'expandable', name: 'solar', title: L.solar, icon: 'mdi:solar-panel', schema: [F_('name', sel.txt), ...E_('kollektor', 'pumpe', 'leistung', 'wmz')] },
      { type: 'expandable', name: 'fm', title: L.fm, icon: 'mdi:water-pump', schema: [F_('anzeigen', sel.bool), ...E_('temp', 'durchfluss', 'pumpe')] },
      { type: 'expandable', name: 'trinkwasser', title: L.trinkwasser, icon: 'mdi:water', schema: E_('temp', 'zaehler', 'enthaertung') },
      { type: 'expandable', name: 'weiche', title: L.weiche, icon: 'mdi:pipe', schema: [F_('anzeigen', sel.bool), ...E_('temp')] },
      { type: 'expandable', name: 'legionellen', title: L.legionellen, icon: 'mdi:bacteria-outline', schema: [...E_('letzte', 'aktiv'), F_('tage', sel.num(1, 60))] },
    ];
  }

  _listen() {
    const O = this._O();
    return [
      { key: 'fuehler', icon: 'mdi:thermometer', schema: [{ type: 'grid', name: '', schema: [F_('name', sel.txt), F_('hoehe', sel.num(0, 100))] }, F_('entity', sel.ent)] },
      { key: 'heizkreise', icon: 'mdi:radiator', schema: [{ type: 'grid', name: '', schema: [F_('name', sel.txt), F_('typ', sel.opt(O.hk))] }, ...E_('pumpe', 'mischer', 'vorlauf', 'vorlauf_soll', 'raum', 'wmz')] },
      { key: 'energie', icon: 'mdi:lightning-bolt', schema: [{ type: 'grid', name: '', schema: [F_('name', sel.txt), F_('icon', sel.icon)] }, F_('entity', sel.ent), F_('farbe', sel.txt)] },
    ];
  }

  _form(schema, getData, onChange) {
    const f = document.createElement('ha-form');
    f.hass = this._hass;
    f.schema = schema;
    f.data = getData();
    f._getData = getData;
    f.computeLabel = (s) => this._L()[s.name] || s.name;
    f.addEventListener('value-changed', (ev) => { ev.stopPropagation(); onChange(ev.detail.value); });
    this._forms.push(f);
    return f;
  }

  _sync() { this._forms.forEach((f) => { f.data = f._getData(); }); }

  _fire() {
    const cfg = aufraeumen({ ...this._config });
    if (cfg.weiche && cfg.weiche.anzeigen && Object.keys(cfg.weiche).length === 1) cfg.weiche = true;
    if (cfg.fm && cfg.fm.anzeigen && Object.keys(cfg.fm).length === 1) cfg.fm = true;
    for (const k of ['fuehler', 'heizkreise', 'energie']) if (Array.isArray(this._config[k])) cfg[k] = this._config[k].map((x) => aufraeumen(x));
    cfg.type = this._config.type || 'custom:ha-systems-studio';
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: cfg }, bubbles: true, composed: true }));
  }

  _setList(key, arr) {
    this._config = { ...this._config, [key]: arr };
    this._struktur = ['fuehler', 'heizkreise', 'energie'].map((k) => (Array.isArray(this._config[k]) ? this._config[k].length : 0)).join(',');
  }

  _build() {
    if (!this._config) return;
    const L = this._L();
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    const root = this.shadowRoot;
    root.innerHTML = `<style>
      .sec{margin-top:18px}.kopf{display:flex;align-items:center;gap:8px;font-weight:500;margin-bottom:6px;color:var(--primary-text-color)}
      .item{border:1px solid var(--divider-color,#ddd);border-radius:10px;padding:8px 10px 4px;margin-bottom:8px}
      .row{display:flex;justify-content:flex-end}
      button{font:inherit;cursor:pointer;border:1px solid var(--divider-color,#ccc);background:var(--card-background-color,#fff);color:var(--primary-text-color);border-radius:8px;padding:6px 12px}
      button.rm{border:none;background:none;color:var(--error-color,#db4437);padding:2px 6px}
      button.add{color:var(--primary-color)}
    </style><div id="w"></div>`;
    const w = root.getElementById('w');
    this._forms = [];
    w.appendChild(this._form(this._mainSchema(), () => this._config, (v) => { this._config = { ...this._config, ...v }; this._fire(); }));
    for (const li of this._listen()) {
      const sec = document.createElement('div');
      sec.className = 'sec';
      sec.innerHTML = `<div class="kopf"><ha-icon icon="${li.icon}"></ha-icon>${L[li.key]}</div>`;
      const arr = Array.isArray(this._config[li.key]) ? this._config[li.key] : [];
      arr.forEach((_, i) => {
        const box = document.createElement('div');
        box.className = 'item';
        box.appendChild(this._form(li.schema, () => (this._config[li.key] || [])[i] || {}, (v) => {
          const n = [...(this._config[li.key] || [])]; n[i] = v; this._config = { ...this._config, [li.key]: n }; this._fire();
        }));
        const row = document.createElement('div');
        row.className = 'row';
        const rm = document.createElement('button');
        rm.className = 'rm'; rm.textContent = L.remove;
        rm.addEventListener('click', () => {
          const n = [...(this._config[li.key] || [])]; n.splice(i, 1); this._setList(li.key, n); this._build(); this._fire();
        });
        row.appendChild(rm); box.appendChild(row); sec.appendChild(box);
      });
      const add = document.createElement('button');
      add.className = 'add'; add.textContent = '+ ' + L.add;
      add.addEventListener('click', () => {
        this._setList(li.key, [...(this._config[li.key] || []), { name: '' }]); this._build(); this._fire();
      });
      sec.appendChild(add);
      w.appendChild(sec);
    }
  }
}

if (!customElements.get('ha-systems-studio')) customElements.define('ha-systems-studio', WarmwasserSchemaCard);
if (!customElements.get('ha-systems-studio-editor')) customElements.define('ha-systems-studio-editor', WarmwasserSchemaCardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.some((x) => x.type === 'ha-systems-studio'))
  window.customCards.push({
    type: 'ha-systems-studio',
    name: 'Home Assistant Systems Studio',
    description: 'Animated hydraulic diagram: tank, heat pump, fresh water module, solar, additional heat source, heating circuits',
    preview: true,
  });
console.info(`%c WARMWASSER-SCHEMA-CARD %c ${VERSION} `, 'background:#ff4b3e;color:#fff;font-weight:700', 'background:#333;color:#fff');


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
  return Object.freeze({ entity, reading, temperature, powerKw, percentage, active });
})();


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


/* Warmwasser-style SVG functions, adapted from mariofritzer's MIT implementation. */
const HASSStudioGraphics = (() => {
  const id = n=>'ww'+String(n.id).replace(/[^a-z0-9]/gi,'').slice(0,24);
  const sensorState=(h,e)=>e&&h?.states?.[e]?h.states[e].state:'unknown';
  const numeric=v=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v));
  const on=(h,e)=>['on','open','active','running','heating'].includes(String(sensorState(h,e)).toLowerCase());
  const burningStates=new Map(),collectorStates=new Map();
  const thresholdActive=(states,id,value,onAt,offAt)=>{
    if(!numeric(value)){states.delete(id);return false;}
    const active=states.get(id)===true;
    const next=active?Number(value)>offAt:Number(value)>=onAt;
    states.set(id,next);return next;
  };
  const color=value=>{
    if(!numeric(value))return 'rgb(138,144,153)';
    const x=Math.max(0,Math.min(1,Number(value)/90));
    if(x<.5){const k=x*2;return 'rgb('+Math.trunc(47+119*k)+','+Math.trunc(107-37*k)+','+Math.trunc(255-15*k)+')';}
    const k=(x-.5)*2;return 'rgb('+Math.trunc(166+89*k)+','+Math.trunc(70-11*k)+','+Math.trunc(240-192*k)+')';
  };
  const defs=(n,h)=>{
    const temps=(n.parts||[]).filter(p=>p.kind==='sensor'&&numeric(sensorState(h,p.entity)))
      .map(p=>({y:100-Number(p.height),t:Number(sensorState(h,p.entity))})).sort((a,b)=>a.y-b.y);
    const stops=temps.length?
      [{y:0,t:temps[0].t},...temps,{y:100,t:temps[temps.length-1].t}]:
      [{y:0,t:null},{y:100,t:null}];
    return (n.type==='boiler'?'<clipPath id="'+id(n)+'FireClip"><rect x="35" y="99" width="64" height="56" rx="4"/></clipPath>':'')+
      '<linearGradient id="'+id(n)+'Temp" x1="0" y1="0" x2="0" y2="1">'+
      stops.map(p=>'<stop offset="'+p.y+'%" stop-color="'+color(p.t)+'"/>').join('')+
      '</linearGradient><linearGradient id="'+id(n)+'Cyl" x1="0" x2="1" y1="0" y2="0">'+
      '<stop stop-color="#fff" stop-opacity=".3"/><stop offset=".18" stop-color="#fff" stop-opacity=".12"/>'+
      '<stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".62" stop-color="#000" stop-opacity="0"/>'+
      '<stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>'+
      '<linearGradient id="'+id(n)+'Steel" x1="0" y1="0" x2="1" y2="0">'+
      '<stop stop-color="#69717d"/><stop offset=".5" stop-color="#39414a"/><stop offset="1" stop-color="#222a32"/></linearGradient>';
  };
  // Fit badges to measured string lengths rather than stretching all to 94px.
  const approxTextWidth=(text,size)=>Array.from(String(text)).reduce((total,ch)=>{
    const fraction=/[ilI1.,:!'|]/.test(ch)?0.34:/[MW@%]/.test(ch)?0.88:/[0-9]/.test(ch)?0.60:0.58;
    return total+size*fraction;
  },0);
  const clampBadge=(v,lo=0.5,hi=2)=>Number.isFinite(Number(v))&&Number(v)>0?
    Math.max(lo,Math.min(hi,Number(v))):1;
  const temperatureBadge=(part,h,x,y,side='left',parentScale=1)=>{
    const v=sensorState(h,part.entity),c=color(v);
    const rawLabel=String(part.label||'').slice(0,24),label=esc(rawLabel);
    const reading=numeric(v)?Number(v).toFixed(1)+'°':'—';
    const hasLabel=rawLabel.trim().length>0;
    const width=Math.ceil(Math.max(30,approxTextWidth(reading,13)+18,
      hasLabel?approxTextWidth(rawLabel,8.5)+18:0));
    const height=hasLabel?32:25;
    const left=side==='left',inside=side==='inside';
    const bx=inside?x-width/2:(left?x-width-8:x+8),by=y-height/2;
    const badgeScale=clampBadge(part.display_scale)/clampBadge(parentScale,0.5,2.4);
    return '<g class="ss-temperature-badge" transform="translate('+x+' '+y+') scale('+badgeScale+') translate('+(-x)+' '+(-y)+')"'+(part.entity?' data-more="'+esc(part.entity)+'"':'')+'>'+
      (!inside?'<path d="M'+x+' '+y+'H'+(left?x-8:x+8)+'" stroke="'+c+'" stroke-width="1.6"/>':'')+
      '<rect x="'+bx+'" y="'+by+'" width="'+width+'" height="'+height+'" rx="10" fill="#22272d" fill-opacity=".97" stroke="'+c+'" stroke-width="1.5"/>'+
      (hasLabel?'<text x="'+(bx+width/2)+'" y="'+(y-4)+'" font-size="8.5" text-anchor="middle" font-weight="600" letter-spacing=".45" fill="#c5cbd2">'+label+'</text>':'')+
      '<text x="'+(bx+width/2)+'" y="'+(hasLabel?y+10:y+4.5)+'" font-size="13" font-weight="700" text-anchor="middle" fill="#f0f3f6">'+reading+'</text>'+
      '<circle cx="'+x+'" cy="'+y+'" r="4" fill="'+c+'" stroke="#fff" stroke-width="1.4"/></g>';
  };
  const tank=(n,h)=>{
    let out='<g transform="translate(0 2) scale(.45 .29)">'+
      '<rect x="72" y="14" width="130" height="360" rx="65" ry="22" fill="url(#'+id(n)+'Temp)"/>'+
      '<rect x="72" y="14" width="130" height="360" rx="65" ry="22" fill="url(#'+id(n)+'Cyl)"/>'+
      '<rect x="86" y="44" width="7" height="300" rx="3.5" fill="#fff" opacity=".14"/>'+
      '<path d="M72 40Q137 60 202 40" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.2"/>'+
      '<path d="M72 348Q137 368 202 348" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1.2"/>'+
      '<rect x="72" y="14" width="130" height="360" rx="65" ry="22" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="1.5"/>';
    if(n.variant==='combi')out+='<rect x="105" y="35" width="64" height="138" rx="25" fill="#acc6d0" fill-opacity=".35" stroke="#e2eff5" stroke-width="3"/>';
    if(n.variant==='stratified')out+='<rect x="73" y="188" width="128" height="4" fill="#c3d0dd" fill-opacity=".4"/>';
    const coil=y=>'<path d="M100 '+y+'C100 '+(y-11)+' 176 '+(y-5)+' 176 '+(y-18)+
      'C176 '+(y-31)+' 100 '+(y-22)+' 100 '+(y-36)+'" fill="none" stroke="#d8e0e7" stroke-width="4"/>';
    if(['coil','dual_coil'].includes(n.variant))out+=coil(342);
    if(n.variant==='dual_coil')out+=coil(145);
    if(n.variant==='hygiene'){
      let p='M110 18V348H100';for(let y=348;y>70;y-=24)p+='C100 '+(y-8)+' 176 '+(y-4)+' 176 '+(y-12)+'C176 '+(y-20)+' 100 '+(y-16)+' 100 '+(y-24);
      out+='<path d="'+p+'L164 32V18" fill="none" stroke="#d8e0e7" stroke-width="3.5" opacity=".7"/>';
    }
    out+='</g>';
    let sensorIndex=0;
    for(const part of n.parts||[]){
      const y=107-Number(part.height)*.95,x=part.side==='left'?32:part.side==='right'?91:61;
      if(part.kind==='sensor'){
        out+=temperatureBadge({...part,label:part.label||'T'+(++sensorIndex)},h,x,y,part.side,n.scale);
      }else if(part.kind==='heater'){
        const active=on(h,part.entity)||(numeric(sensorState(h,part.entity))&&Number(sensorState(h,part.entity))>5);
        out+='<g class="ss-heater"'+(part.entity?' data-more="'+esc(part.entity)+'"':'')+'>';
        const c=active?'#ffc52f':'#b9c0c8',length=part.variant==='extended'?76:part.variant==='compact'?42:60;
        const right=part.side!=='left';
        const connector=right?93:29,sign=right?-1:1;
        const x0=connector+sign*11,pitch=length/8;
        let d='M'+x0+' '+y;
        for(let k=1;k<=8;k++) d+='L'+(x0+sign*k*pitch).toFixed(2)+' '+(y+(k%2?-4:4));
        out+='<g><path d="'+d+'" stroke="'+c+'" stroke-width="3" stroke-linejoin="round" fill="none"/>'+
          '<rect x="'+(connector-(right?0:16))+'" y="'+(y-11)+'" width="16" height="22" rx="3" fill="#343940" stroke="'+c+'" stroke-width="1.6"/>'+
          '<text x="'+(right?connector-4:connector+20)+'" y="'+(y-15)+'" text-anchor="'+(right?'end':'start')+
          '" font-size="9" fill="'+c+'">'+esc(String(part.label||'').slice(0,25))+'</text></g></g>';
      }else if(part.kind==='coil'){
        out+='<g class="ss-coil"'+(part.entity?' data-more="'+esc(part.entity)+'"':'')+'>';
        const reach=part.variant==='extended'?28:part.variant==='compact'?11:19;
        const mid=part.side==='left'?45:part.side==='right'?78:61;
        out+='<path d="M'+(mid-reach)+' '+y+'C'+(mid-reach)+' '+(y-13)+' '+(mid+reach)+' '+(y-7)+' '+(mid+reach)+' '+(y-19)+
          'C'+(mid+reach)+' '+(y-31)+' '+(mid-reach)+' '+(y-23)+' '+(mid-reach)+' '+(y-35)+
          '" fill="none" stroke="#d1d9e0" stroke-width="2.6" stroke-linecap="round"/></g>';
      }
    }
    return out;
  };
  // Warmwasser-inspired tall boiler with full chimney and an enclosed firebox.
  const boiler=(n,h)=>{
    const v=n.variant,temp=sensorState(h,n.entity);
    const fallbackTemp=thresholdActive(burningStates,n.id,temp,
      Number(n.burner_on_temp??35),Math.min(Number(n.burner_off_temp??32),Number(n.burner_on_temp??35)-0.5));
    const burning=n.burner_mode==='on'||(n.burner_mode!=='off'&&
      (n.burner_entity?on(h,n.burner_entity):fallbackTemp));
    const isWood=['wood','pellet'].includes(v),isGas=['gas','oil'].includes(v),electric=v==='electric',heatpump=v==='heatpump';
    const pale=isGas||electric,steel=id(n)+'Steel',clip=id(n)+'FireClip';
    const flame=(x,y,w,height,duration)=>{
      const path=(width,hh)=>'M'+(-width)+' 0C'+(-width-2)+' '+(-hh*.45)+' '+(-width*.15)+' '+(-hh*.6)+' '+(width*.1)+' '+(-hh)+
        'C'+(width*.5)+' '+(-hh*.6)+' '+(width+2)+' '+(-hh*.4)+' '+width+' 0Z';
      return '<g transform="translate('+x+' '+y+')"><g class="ss-fire" style="animation-duration:'+duration+'s">'+
        '<path d="'+path(w,height)+'" fill="'+(isGas?'#1f6fff':'#ff5a1f')+'"/>'+
        '<path d="'+path(w*.65,height*.7)+'" fill="'+(isGas?'#5fa0ff':'#ffa21c')+'"/>'+
        '<path d="'+path(w*.35,height*.42)+'" fill="'+(isGas?'#cfe3ff':'#ffe27a')+'"/></g></g>';
    };
    let out='<g class="ss-boiler">'+
      // Original tall flue was mostly hidden by the old squat cabinet.
      '<rect x="53" y="-104" width="18" height="150" rx="2" fill="url(#'+steel+')"/>'+
      '<rect x="50" y="-97" width="24" height="8" rx="2" fill="#252a31"/>'+
      '<rect x="51" y="22" width="22" height="6" rx="2" fill="#252a31"/>'+
      '<rect x="30" y="193" width="12" height="20" rx="2" fill="#414750"/>'+
      '<rect x="91" y="193" width="12" height="20" rx="2" fill="#414750"/>'+
      // Tall cabinet, not an independently stretched part.
      '<rect x="21" y="30" width="91" height="169" rx="10" fill="url(#'+steel+')" stroke="#9098a1" stroke-width="1.2"/>'+
      (pale?'<rect x="21" y="30" width="91" height="169" rx="10" fill="#c7d0d8" opacity=".18"/>':'')+
      '<path d="M28 43V183" stroke="#fff" stroke-opacity=".09" stroke-width="3"/>'+
      '<rect x="18" y="27" width="97" height="9" rx="3" fill="#31363e" stroke="#7f8790" stroke-width=".7"/>'+
      '<text x="30" y="51" fill="#d5dce5" font-size="9" font-weight="600" letter-spacing=".7">'+
      esc(({wood:'DREWNO',pellet:'PELLET',gas:'GAZ',oil:'OLEJ',electric:'ELEKTR.',heatpump:'POMPA C.'})[v]||'KOCIOŁ')+'</text>';
    if(numeric(temp)){
      out+='<g'+(n.entity?' data-more="'+esc(n.entity)+'"':'')+'>'+
        '<rect x="30" y="60" width="73" height="26" rx="5" fill="#0b1117"/>'+
        '<text x="66" y="79" font-size="14" font-weight="700" text-anchor="middle" fill="#ffca36">'+Number(temp).toFixed(1)+'°</text></g>';
    }
    out+='<rect x="29" y="92" width="76" height="73" rx="7" fill="#0d1014" stroke="#59616d" stroke-width="1.5"/>'+
      '<rect x="35" y="99" width="64" height="56" rx="4" fill="#0a0b0e"/>'+
      '<g clip-path="url(#'+clip+')">';
    if(isWood||isGas){
      if(burning){
        out+='<rect x="35" y="99" width="64" height="56" fill="'+(isGas?'#193159':'#522016')+'" opacity=".35" class="ss-embers"/>';
        out+=flame(53,147,9,isGas?29:38,.9)+flame(69,147,11,isGas?38:49,1.15)+flame(87,147,8,isGas?32:42,.8);
        if(isWood)out+='<ellipse cx="68" cy="149" rx="28" ry="6" fill="#ff7625" opacity=".55" class="ss-embers"/>';
      }
      if(v==='wood'){
        out+='<rect x="45" y="146" width="47" height="7" rx="3" fill="#55331e" stroke="'+(burning?'#ff842d':'#785238')+'" transform="rotate(-7 66 149)"/>';
      }
      if(v==='pellet')out+=Array.from({length:12},(_,k)=>'<rect x="'+(42+(k%6)*9)+'" y="'+(147+Math.floor(k/6)*3)+'" width="6" height="3" rx="1" fill="#92623d"/>').join('');
      if(isGas)out+='<path d="M43 149H93" stroke="#536173" stroke-width="3"/>';
    }else if(electric){
      out+='<path d="M41 122H92M41 140H92" stroke="'+(burning?'#ffca38':'#79828b')+'" stroke-width="3" stroke-dasharray="7 4"'+(burning?' class="ss-embers"':'')+'/>';
      out+='<path d="M69 108L55 130H66L58 151L83 123H69Z" fill="'+(burning?'#ffd24b':'#7f8790')+'"/>';
    }else if(heatpump){
      out+='<g'+(burning?' class="ss-fan"':'')+'><circle cx="67" cy="126" r="18" stroke="#77b7d9" stroke-width="2" fill="none"/>'+
        '<path d="M64 109Q83 115 69 126Q83 144 67 129Q50 141 64 125Q52 111 64 109Z" fill="#91c6df"/></g>';
    }
    out+='</g><path d="M37 161H97" stroke="#79818c" stroke-opacity=".55" stroke-width="1.6"/>'+
      '<rect x="30" y="175" width="73" height="20" rx="4" fill="#313941" stroke="#79818c"/>'+
      '<text x="66" y="188.5" text-anchor="middle" font-size="9" font-weight="700" fill="'+(burning?'#ffbf35':'#9da7b2')+'">'+
      (burning?(isWood?'Burning':isGas?'Burner on':electric?'Heating':'Running'):'Off')+'</text></g>';
    return out;
  };
  const solar=(n,h)=>{
    const collectorPart=(n.parts||[]).find(p=>p.kind==='sensor'&&p.entity&&/kolektor|collector/i.test(p.label||''))||
      (n.parts||[]).find(p=>p.kind==='sensor'&&p.entity);
    const collectorTemp=sensorState(h,collectorPart?.entity||n.entity);
    const tankTemp=sensorState(h,n.tank_entity);
    const delta=numeric(collectorTemp)&&numeric(tankTemp)?Number(collectorTemp)-Number(tankTemp):null;
    const lit=thresholdActive(collectorStates,n.id,delta,Number(n.solar_on_delta??6),
      Math.min(Number(n.solar_off_delta??3),Number(n.solar_on_delta??6)-0.5));
    const cx=101,cy=27;
    const rays=Array.from({length:8},(_,i)=>{
      const a=i*Math.PI/4,x1=cx+11*Math.cos(a),y1=cy+11*Math.sin(a);
      const x2=cx+16*Math.cos(a),y2=cy+16*Math.sin(a);
      return '<path d="M'+x1.toFixed(1)+' '+y1.toFixed(1)+'L'+x2.toFixed(1)+' '+y2.toFixed(1)+'" stroke="'+(lit?'#ffd23f':'#858e98')+'" stroke-width="1.7" stroke-linecap="round"/>';
    }).join('');
    let out='<path d="M17 93L39 33H84L63 93Z" fill="#233f70" stroke="#a4b1c4" stroke-width="1.7"/>'+
      [1,2,3].map(i=>'<path d="M'+(17+i*12)+' 93L'+(39+i*12)+' 33" stroke="#93a4c2" stroke-width="1.3"/>').join('')+
      '<path d="M27 59H75" stroke="#93a4c2" stroke-opacity=".6"/>'+
      '<g'+(lit?' class="ss-solar-sun"':'')+'>'+rays+
      '<circle cx="'+cx+'" cy="'+cy+'" r="7" fill="'+(lit?'#ffd23f':'#858e98')+'"/></g>';
    // Collector sensor positions belong to the solar node, so moving/scaling
    // the collector preserves both label and data source.
    for(const part of (n.parts||[]).filter(p=>p.kind==='sensor')){
      const yy=93-(Number(part.height)/100)*60;
      const side=part.side==='left'?'left':'right';
      out+=temperatureBadge({...part,label:part.label||'Kolektor'},h,side==='left'?17:85,yy,side,n.scale);
    }
    return out;
  };

  const pump=(n,h)=>'<circle cx="60" cy="62" r="30" fill="#2b2f35" stroke="'+(on(h,n.entity)?'#66c998':'#8a9099')+'" stroke-width="2"/>'+
    (on(h,n.entity)?'<circle cx="60" cy="62" r="30" fill="none" stroke="#66c998" stroke-width="1.5" class="ss-pump-pulse"/>':'')+
    '<path d="M77 62L47 79L47 45Z" fill="'+(on(h,n.entity)?'#66c998':'#7c8894')+'"/>';
  const valve=(n,h)=>'<path d="M38 46L59 63L38 80ZM80 46L59 63L80 80Z" fill="#222b34" stroke="'+(on(h,n.entity)?'#69cda4':'#9da9b5')+'" stroke-width="2"/>'+
    (n.variant==='three_way'?'<path d="M42 92L59 63L76 92Z" fill="#222b34" stroke="#9da9b5" stroke-width="2"/>':'')+
    '<line x1="59" y1="46" x2="59" y2="35" stroke="#989fa8" stroke-width="3"/>'+
    '<rect x="45" y="25" width="28" height="14" rx="3" fill="#3f4a56" stroke="#9aa7b3"/>'+
    '<text x="59" y="35" text-anchor="middle" font-size="10" fill="#edf2f7">M</text>'+
    '<circle cx="59" cy="63" r="3" fill="'+(on(h,n.entity)?'#69cda4':'#9aa7b3')+'"/>';
  const sensor=(n,h)=>'<rect x="52" y="36" width="14" height="45" rx="7" fill="#29313a" stroke="#bac4cf" stroke-width="2"/>'+
    '<circle cx="59" cy="83" r="13" fill="'+color(sensorState(h,n.entity))+'" stroke="#a8bccb" stroke-width="1.5"/>'+
    '<path d="M59 52V83" stroke="'+color(sensorState(h,n.entity))+'" stroke-width="5" stroke-linecap="round"/>';
  const shapes={tank,boiler,solar,pump,valve,sensor};
  const render=(n,h)=>shapes[n.type]?shapes[n.type](n,h):'';
  const styles='<style>'+
    '@keyframes ssWWPulse{0%{opacity:.8;transform:scale(1)}100%{opacity:0;transform:scale(1.5)}}'+
    '@keyframes ssWWFire{33%{opacity:.8;transform:scale(1.04,.92)}66%{opacity:.95;transform:scale(.96,1.06)}}'+
    '@keyframes ssWWFlow{to{stroke-dashoffset:-28}}'+
    '.ss-pump-pulse{animation:ssWWPulse 1.6s infinite;transform-box:fill-box;transform-origin:center}'+
    '.ss-fire{animation:ssWWFire .9s infinite;transform-box:fill-box;transform-origin:center}'+
    '.ss-solar-sun{animation:ssWWFire 3s infinite;transform-box:fill-box;transform-origin:center}'+
    '@keyframes ssWWEmbers{50%{opacity:.45}}'+
    '@keyframes ssWWRotate{to{transform:rotate(360deg)}}'+
    '.ss-embers{animation:ssWWEmbers 1.7s infinite}'+
    '.ss-fan{animation:ssWWRotate 1.8s linear infinite;transform-box:fill-box;transform-origin:center}'+
    '.ss-flow{stroke:#fff;stroke-width:2.5;stroke-dasharray:1 13;animation:ssWWFlow var(--ss-speed,1s) linear infinite;fill:none;stroke-linecap:round}'+
    '</style>';
  return {defs,render,styles,on};
})();


/* Modular SVG hot-water tank for the Custom designer. No HA service calls.
 * Adapted visually from the six user-supplied SVG demonstrations.
 * The temperature field is measured/interpolated; heater halos are visual only.
 */
const HASSStudioTank = (() => {
  const num = v => v !== '' && v != null && Number.isFinite(Number(v));
  const clamp = (v,lo,hi,fallback=lo) => num(v) ? Math.max(lo,Math.min(hi,Number(v))) : fallback;
  const safe = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const ident = v => String(v).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,42);
  const state = HASSStudioHA.entity;
  const active = (h,e) => HASSStudioHA.active(h,e,['heat']);
  const temperature = HASSStudioHA.temperature;
  const color = t => {
    if (!num(t)) return '#506780';
    const palette=[[0,[28,88,218]],[20,[25,162,228]],[40,[132,87,217]],[60,[224,65,136]],[80,[239,49,63]],[100,[255,108,44]]];
    const v=clamp(t,0,100,0);
    for(let i=1;i<palette.length;i++) if(v<=palette[i][0]){
      const a=palette[i-1],b=palette[i],k=(v-a[0])/(b[0]-a[0]);
      return '#'+a[1].map((n,j)=>Math.round(n+(b[1][j]-n)*k).toString(16).padStart(2,'0')).join('');
    }
    return '#ff6c2c';
  };
  // Location values are percentages of the main water compartment.
  const X=35,Y=15,IW=50,IH=92;
  const point = p => ({x:X+IW*clamp(p.x,0,100,50)/100,
    y:Y+IH*(100-clamp(p.height,0,100,50))/100});
  const boundaries = parts => {
    const horizontal=parts.filter(p=>p.kind==='baffle_horizontal').map(p=>({at:point(p).y,leak:clamp(p.permeability,0,1,.35)})).sort((a,b)=>a.at-b.at);
    const vertical=parts.filter(p=>p.kind==='baffle_vertical').map(p=>({at:point(p).x,leak:clamp(p.permeability,0,1,0)})).sort((a,b)=>a.at-b.at);
    return {horizontal,vertical};
  };
  const regions = barriers => {
    const x=[X,...barriers.vertical.map(v=>v.at),X+IW];
    const y=[Y,...barriers.horizontal.map(v=>v.at),Y+IH];
    const out=[];
    for(let row=1;row<y.length;row++)for(let col=1;col<x.length;col++)
      if(y[row]>y[row-1]+.01 && x[col]>x[col-1]+.01)
        out.push({x:x[col-1],y:y[row-1],w:x[col]-x[col-1],h:y[row]-y[row-1]});
    return out;
  };
  const permeability = (a,b,barriers) => {
    let pass=1;
    for(const cut of barriers.horizontal) if((a.y<cut.at && b.y>cut.at)||(b.y<cut.at && a.y>cut.at))pass*=cut.leak;
    for(const cut of barriers.vertical) if((a.x<cut.at && b.x>cut.at)||(b.x<cut.at && a.x>cut.at))pass*=cut.leak;
    return pass;
  };
  const stops = (sensors,h) => {
    const measurements=sensors.map(p=>({height:clamp(p.height,0,100,50),t:temperature(h,p.entity)}))
      .filter(p=>p.t!==null).sort((a,b)=>b.height-a.height);
    if(!measurements.length) return '<stop stop-color="#506780"/><stop offset="1" stop-color="#506780"/>';
    const points=[{height:100,t:measurements[0].t},...measurements,{height:0,t:measurements[measurements.length-1].t}];
    return points.map(p=>'<stop offset="'+(100-p.height)+'%" stop-color="'+color(p.t)+'"/>').join('');
  };
  const badge = (p,h,at,kind,parentScale=1,edges=null) => {
    const isSensor=kind==='sensor';
    const reading=isSensor?temperature(h,p.entity):null;
    const enabled=p.mode==='on'||(p.mode!=='off'&&active(h,p.entity));
    const powerState=state(h,p.power_entity),watts=powerState&&num(powerState.state)?Number(powerState.state):null;
    const powerUnit=powerState?.attributes?.unit_of_measurement;
    const powerText=watts!==null && ['W','kW'].includes(powerUnit)?(watts/(powerUnit==='W'?1000:1)).toFixed(1)+' kW':(enabled?'ON':'OFF');
    const value=isSensor?(reading===null?'—':reading.toFixed(1)+'°'):powerText;
    const caption=String(p.label||'').slice(0,28),wide=Math.max(38,22+value.length*5.4,caption.length*4.5+12);
    const side=p.side==='right'?'right':p.side==='inside'?'inside':'left';
    const x=side==='left'?(edges?.left??19):side==='right'?(edges?.right??101):at.x;
    const bx=side==='left'?x-wide-3:side==='right'?x+3:x-wide/2;
    const by=at.y-(caption?15:10);
    const bg=isSensor?(reading===null?'#4d5865':color(reading)):(enabled?'#ec4a30':'#464c57');
    const scale=clamp(p.display_scale,.5,2,1)/clamp(parentScale,.5,2.4,1);
    const icon=isSensor?'<path d="M0 -6v9a4 4 0 1 0 4 0v-9a2 2 0 0 0-4 0ZM2 -2v7" fill="none" stroke="white" stroke-width="1.2" stroke-linecap="round"/>':
      '<path d="M3 -7L-2 1H2L0 8L7 -2H3Z" fill="white"/>';
    const marker=side==='left'?(edges?.markerLeft??30):side==='right'?(edges?.markerRight??90):at.x;
    return '<g class="ss-tank-badge ss-temperature-badge"'+(p.entity?' data-more="'+safe(p.entity)+'"':'')+
      ' transform="translate('+at.x+' '+at.y+') scale('+scale+') translate('+(-at.x)+' '+(-at.y)+')">'+
      (side==='inside'?'':'<path d="M'+marker+' '+at.y+'H'+(side==='left'?x:x)+'" stroke="'+bg+'" stroke-width="1.3"/>')+
      '<circle cx="'+marker+'" cy="'+at.y+'" r="2.5" fill="'+bg+'" stroke="#ebf3ff" stroke-width=".9"/>'+
      '<rect x="'+bx+'" y="'+by+'" width="'+wide+'" height="'+(caption?29:21)+'" rx="10.5" fill="'+bg+
      '" stroke="#f7e7e7" stroke-opacity=".8" stroke-width=".8"/>'+
      '<g transform="translate('+(bx+9)+' '+(by+(caption?16:11))+') scale(.82)">'+icon+'</g>'+
      (caption?'<text x="'+(bx+wide/2+6)+'" y="'+(by+10)+'" text-anchor="middle" font-size="6.2" fill="#fff" opacity=".9">'+safe(caption)+'</text>':'')+
      '<text x="'+(bx+wide/2+6)+'" y="'+(by+(caption?23:14.5))+'" text-anchor="middle" font-size="9.7" fill="#fff" font-weight="700">'+safe(value)+'</text></g>';
  };
  const heater = (p,h,at,n,base,regionsList,barriers,defs) => {
    const enabled=p.mode==='on'||(p.mode!=='off'&&active(h,p.entity));
    const level=clamp(p.power,0,100,75)/100,atRight=p.side==='right';
    const length=clamp(p.width,10,90,58)*.45;
    const edge=atRight?X+IW-2:X+2,dx=atRight?-length:length;
    const y=at.y,rod=atRight?edge-2:edge+2;
    const d='M'+rod+' '+(y-5)+'h'+dx+'q'+(atRight?-4:4)+' 0 '+(atRight?-4:4)+' 5q0 5 '+(atRight?4:-4)+' 5h'+(-dx)+
      'M'+rod+' '+y+'h'+(dx*.9);
    const token=base+'Heat'+ident(p.id),glow=base+'Halo'+ident(p.id);
    defs.push('<radialGradient id="'+glow+'"><stop stop-color="#fff2a9" stop-opacity=".82"/><stop offset=".22" stop-color="#ff772a" stop-opacity=".72"/><stop offset=".65" stop-color="#ed3b28" stop-opacity=".25"/><stop offset="1" stop-color="#e23f2c" stop-opacity="0"/></radialGradient>');
    const halos=enabled?regionsList.map((r,i)=>{
      const centre={x:r.x+r.w/2,y:r.y+r.h/2},permeable=permeability(at,centre,barriers);
      if(permeable<.001)return '';
      const clip=token+'Clip'+i;
      defs.push('<clipPath id="'+clip+'"><rect x="'+r.x+'" y="'+r.y+'" width="'+r.w+'" height="'+r.h+'"/></clipPath>');
      return '<g clip-path="url(#'+clip+')"><ellipse cx="'+(at.x+(atRight?-8:8))+'" cy="'+y+
        '" rx="'+(12+length)+'" ry="'+(12+level*12)+'" fill="url(#'+glow+')" opacity="'+(level*permeable).toFixed(3)+'"/></g>';
    }).join(''):'';
    return '<g class="ss-tank-heater"'+(p.entity?' data-more="'+safe(p.entity)+'"':'')+'>'+
      halos+'<g clip-path="url(#'+base+'WaterClip)">'+
      '<path d="'+d+'" fill="none" stroke="#2f3c51" stroke-width="3.9" stroke-linecap="round"/>'+
      '<path d="'+d+'" fill="none" stroke="'+(enabled?'#ff662d':'#b1beca')+'" stroke-width="2.6" stroke-linecap="round"/>'+
      (enabled?'<path d="'+d+'" fill="none" stroke="#fff1b1" opacity="'+(.25+level*.7)+'" stroke-width=".8" stroke-linecap="round"/>':'')+
      '</g><ellipse cx="'+edge+'" cy="'+y+'" rx="2.2" ry="7.5" fill="url(#'+base+'Steel)" stroke="#e6f1ff" stroke-width=".6"/></g>';
  };
  // One continuous tube: cool straight inlet at left, elliptical turns rising to the
  // top, and a final curved return loop. Both geometry and gradient use travel distance.
  const coilPath = (p,at) => {
    const height=clamp(p.length,15,95,58)*IH/100,turns=Math.round(clamp(p.turns,3,22,12));
    const radius=clamp(p.width,10,95,65)*IW/200;
    const top=Math.max(Y+2,Math.min(Y+IH-height-2,at.y-height/2));
    const bottom=top+height,pitch=height/(turns+.4);
    const left=at.x-radius,right=at.x+radius,fmt=v=>v.toFixed(3);
    const samples=[{x:left,y:top}],commands=[];
    const line=(x,y)=>{
      commands.push('L'+fmt(x)+' '+fmt(y));
      const from=samples[samples.length-1];
      for(let k=1;k<=14;k++)samples.push({x:from.x+(x-from.x)*k/14,y:from.y+(y-from.y)*k/14});
    };
    const cubic=(x1,y1,x2,y2,x3,y3)=>{
      const start=samples[samples.length-1];
      commands.push('C'+[x1,y1,x2,y2,x3,y3].map(fmt).join(' '));
      for(let k=1;k<=14;k++){
        const t=k/14,u=1-t;
        samples.push({x:u*u*u*start.x+3*u*u*t*x1+3*u*t*t*x2+t*t*t*x3,
          y:u*u*u*start.y+3*u*u*t*y1+3*u*t*t*y2+t*t*t*y3});
      }
    };
    line(left,bottom);
    for(let i=0;i<turns;i++){
      const y=bottom-i*pitch,next=y-pitch;
      cubic(left+radius*.35,y+pitch*.58,right,y+pitch*.58,right,y+pitch*.03);
      cubic(right,y-pitch*.58,left+radius*.28,next-pitch*.25,left,next);
    }
    // The upper elliptical return is a real continuation, not a detached arc.
    // It fills the missing arc indicated in the user's annotated reference.
    const shoulder=bottom-turns*pitch;
    cubic(left+radius*.12,shoulder-pitch*.8,right+radius*.1,shoulder-pitch*.8,right,shoulder-pitch*.25);
    cubic(right,shoulder+pitch*.45,left+radius*.75,top+pitch*.4,left+radius*.3,top+pitch*.08);
    const d='M'+fmt(left)+' '+fmt(top)+commands.join('');
    const distances=[0];let total=0;
    for(let i=1;i<samples.length;i++){
      total+=Math.hypot(samples[i].x-samples[i-1].x,samples[i].y-samples[i-1].y);
      distances.push(total);
    }
    const count=Math.max(100,Math.min(190,turns*10));
    const route=[];
    let ix=1;
    for(let step=0;step<=count;step++){
      const target=total*step/count;
      while(ix<distances.length-1&&distances[ix]<target)ix++;
      const a=samples[ix-1],b=samples[ix];
      const span=distances[ix]-distances[ix-1];
      const k=span?(target-distances[ix-1])/span:0;
      route.push({x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k});
    }
    return {d,route,total,top,bottom,turns,stemX:left,upperReturn:true};
  };
  const blendColor=(a,b,t)=>{
    const value=k=>parseInt(k,16);
    const ch=i=>Math.round(value(a.slice(i,i+2))*(1-t)+value(b.slice(i,i+2))*t).toString(16).padStart(2,'0');
    return '#'+ch(1)+ch(3)+ch(5);
  };
  const coilColor=(progress,endColor)=>{
    const stops=[[0,'#1a9df9'],[.26,'#2d89fd'],[.55,'#7858e4'],[.77,'#d15ca7'],[1,endColor]];
    const t=clamp(progress,0,1,0);
    for(let i=1;i<stops.length;i++)if(t<=stops[i][0]){
      const a=stops[i-1],b=stops[i],k=(t-a[0])/(b[0]-a[0]);
      return blendColor(a[1],b[1],k);
    }
    return endColor;
  };
  const coil = (p,h,at,base,defs,topTemp=null) => {
    const geometry=coilPath(p,at),d=geometry.d,route=geometry.route;
    const endColor=topTemp===null?'#ef4b4a':color(topTemp);
    // Per-distance sections make colour follow the hydraulic route, not the SVG y coordinate.
    const colorful=route.slice(1).map((pt,i)=>{
      const a=route[i],c=coilColor((i+.5)/(route.length-1),endColor);
      return '<path d="M'+a.x.toFixed(3)+' '+a.y.toFixed(3)+'L'+pt.x.toFixed(3)+' '+pt.y.toFixed(3)+
        '" stroke="'+c+'" stroke-width="3" stroke-linecap="round" fill="none"/>';
    }).join('');
    const running=HASSStudioAnimation.flowActive(p.flow_mode,h,p.entity,['heat']);
    return '<g class="ss-tank-coil"'+(p.entity?' data-more="'+safe(p.entity)+'"':'')+' clip-path="url(#'+base+'WaterClip)">'+
      '<path d="'+d+'" fill="none" stroke="#17243c" stroke-width="4.6" stroke-linejoin="round" stroke-linecap="round"/>'+
      '<g class="ss-tank-coil-gradient" data-start="#1a9df9" data-end="'+endColor+'">'+colorful+'</g>'+
      '<path d="'+d+'" fill="none" stroke="#f3f5ff" opacity=".25" stroke-width=".55" stroke-linejoin="round" stroke-linecap="round"/>'+
      (running?'<path class="ss-tank-coil-flow" d="'+d+'" fill="none" stroke="#fff" stroke-width="1.1" stroke-dasharray="2 7" style="--ss-coil-speed:'+clamp(p.flow_speed,.35,5,1)+'s;animation-direction:'+(p.flow_direction==='reverse'?'reverse':'normal')+'"/>':'')+'</g>';
  };
  const plate = (p,at,base) => {
    if(p.kind==='baffle_horizontal'){
      const leak=clamp(p.permeability,0,1,.35),holes=leak>0 ? Array.from({length:7},(_,i)=>{
        const cx=X+5+i*(IW-10)/6;
        return '<ellipse cx="'+cx+'" cy="'+at.y+'" rx="'+(.65+leak*1.5)+'" ry="'+(.4+leak*.65)+'" fill="#122c4e" stroke="#b6cced" stroke-width=".32"/>';
      }).join(''):'';
      return '<g class="ss-tank-baffle" clip-path="url(#'+base+'WaterClip)"><ellipse cx="60" cy="'+at.y+'" rx="25" ry="4.1" fill="#476c9d" stroke="#bfd7f0" stroke-width=".9"/>'+
        '<ellipse cx="60" cy="'+(at.y-1)+'" rx="24" ry="2.8" fill="#83a8d0" opacity=".55"/>'+holes+'</g>';
    }
    const x=at.x;
    return '<g class="ss-tank-baffle" clip-path="url(#'+base+'WaterClip)"><path d="M'+x+' 15Q'+(x+3)+' 59 '+x+' 107L'+(x+3)+' 107Q'+(x+6)+' 58 '+(x+3)+' 15Z" fill="#536f99" stroke="#d4e8ff" stroke-width=".9"/>'+
      '<path d="M'+(x+.9)+' 18Q'+(x+3.8)+' 59 '+(x+.9)+' 104" fill="none" stroke="#c9ddfa" opacity=".6" stroke-width="1"/></g>';
  };
  const innerTank = (p,n,h,base,defs) => {
    const cx=point(p).x;
    const w=clamp(p.width,20,72,45)*IW/100,ht=clamp(p.length,20,85,58)*IH/100;
    const top=Math.max(Y+2,Math.min(Y+IH-ht-2,point(p).y-ht/2));
    const x=Math.max(X+1,Math.min(X+IW-w-1,cx-w/2));
    const own=(n.parts||[]).filter(q=>q.kind==='sensor'&&q.container==='inner');
    const grad=base+'InnerTemp',clip=base+'InnerClip';
    defs.push('<linearGradient id="'+grad+'" x1="0" y1="0" x2="0" y2="1">'+stops(own,h)+'</linearGradient>'+
      '<clipPath id="'+clip+'"><rect x="'+x+'" y="'+top+'" width="'+w+'" height="'+ht+'" rx="'+(w*.38)+'"/></clipPath>');
    return '<g class="ss-tank-inner" clip-path="url(#'+base+'WaterClip)"><rect x="'+x+'" y="'+top+'" width="'+w+'" height="'+ht+'" rx="'+(w*.38)+'" fill="url(#'+grad+')" stroke="#d8e7fa" stroke-width="1.15"/>'+
      '<rect x="'+x+'" y="'+top+'" width="'+w+'" height="'+ht+'" rx="'+(w*.38)+'" fill="#e6f1ff" fill-opacity=".12"/>'+
      '<path d="M'+(x+2.5)+' '+(top+7)+'v'+(ht-14)+'" stroke="#fff" stroke-width="2.2" stroke-opacity=".3"/>'+
      '<path d="M'+(x+w-2.5)+' '+(top+7)+'v'+(ht-14)+'" stroke="#fff" stroke-width="1.3" stroke-opacity=".3"/></g>';
  };
  const render=(n,h) => {
    const parts=Array.isArray(n.parts)?n.parts:[];
    const base='sst'+ident(n.id),defs=[],barriers=boundaries(parts),zones=regions(barriers);
    defs.push('<linearGradient id="'+base+'Steel" x1="0" y1="0" x2="1" y2="0">'+
      '<stop stop-color="#607d9e"/><stop offset=".08" stop-color="#edf6ff"/><stop offset=".21" stop-color="#829cbe"/><stop offset=".47" stop-color="#d5e5f9"/><stop offset=".66" stop-color="#596f91"/><stop offset=".85" stop-color="#e4f0ff"/><stop offset="1" stop-color="#577190"/></linearGradient>'+
      '<linearGradient id="'+base+'Gloss" x1="0" y1="0" x2="1" y2="0">'+
      '<stop stop-color="#fff" stop-opacity=".3"/><stop offset=".18" stop-color="#fff" stop-opacity=".05"/><stop offset=".62" stop-color="#fff" stop-opacity=".02"/><stop offset="1" stop-color="#fff" stop-opacity=".25"/></linearGradient>'+
      '<clipPath id="'+base+'WaterClip"><rect x="'+X+'" y="'+Y+'" width="'+IW+'" height="'+IH+'" rx="8"/></clipPath>');
    const sensors=parts.filter(p=>p.kind==='sensor'&&p.container!=='inner');
    const sealedH=barriers.horizontal.filter(b=>b.leak===0),sealedV=barriers.vertical.filter(b=>b.leak===0);
    const xEdges=[X,...sealedV.map(v=>v.at),X+IW],yEdges=[Y,...sealedH.map(v=>v.at),Y+IH];
    let water='';
    for(let iy=1;iy<yEdges.length;iy++)for(let ix=1;ix<xEdges.length;ix++){
      const x0=xEdges[ix-1],y0=yEdges[iy-1],x1=xEdges[ix],y1=yEdges[iy],id=base+'Field'+ix+'x'+iy;
      const selected=sensors.filter(s=>{const p=point(s);return p.x>=x0-.01&&p.x<=x1+.01&&p.y>=y0-.01&&p.y<=y1+.01;});
      // The gradient coordinates are global, keeping each temperature sensor anchored at its real height.
      const values=selected.map(p=>({y:point(p).y,t:temperature(h,p.entity)})).filter(p=>p.t!==null).sort((a,b)=>a.y-b.y);
      let points=values.length?[{y:Y,t:values[0].t},...values,{y:Y+IH,t:values[values.length-1].t}]:[];
      defs.push('<linearGradient id="'+id+'" x1="0" y1="'+Y+'" x2="0" y2="'+(Y+IH)+'" gradientUnits="userSpaceOnUse">'+
        (points.length?points.map(q=>'<stop offset="'+(100*(q.y-Y)/IH).toFixed(3)+'%" stop-color="'+color(q.t)+'"/>').join(''):
          '<stop stop-color="#506780"/><stop offset="1" stop-color="#506780"/>')+'</linearGradient>');
      if(x1>x0 && y1>y0)water+='<rect x="'+x0+'" y="'+y0+'" width="'+(x1-x0)+'" height="'+(y1-y0)+'" fill="url(#'+id+')"/>';
    }
    const nonUniform=n.scale_mode==='free';
    const sx=nonUniform?clamp(n.width_scale,.5,2.4,1):1;
    const sy=nonUniform?clamp(n.height_scale,.5,2.4,1):1;
    const remap=at=>({x:60+(at.x-60)*sx,y:61+(at.y-61)*sy});
    const edges={left:60+(19-60)*sx,right:60+(101-60)*sx,
      markerLeft:60+(30-60)*sx,markerRight:60+(90-60)*sx};
    const transform='translate(60 61) scale('+sx+' '+sy+') translate(-60 -61)';
    // Only actual HA measurements can set a temperature colour; the coil keeps
    // a decorative warm end when the tank has no valid upper sensor.
    const topMeasurements=sensors.map(p=>({height:clamp(p.height,0,100,50),
      t:temperature(h,p.entity)})).filter(p=>p.t!==null).sort((a,b)=>b.height-a.height);
    const topTemp=topMeasurements.length?topMeasurements[0].t:null;
    // Array order is the painter's order: first added part is layer 0 (back),
    // later additions are drawn above earlier ones. Includes badges and heaters.
    const accessoryLayers=parts.map((p,index)=>{
      const at=point(p);
      let geometry='';
      if(p.kind==='heater')geometry=heater(p,h,at,n,base,zones,barriers,defs);
      else if(p.kind==='coil')geometry=coil(p,h,at,base,defs,topTemp);
      else if(p.kind==='inner_tank')geometry=innerTank(p,n,h,base,defs);
      else if(p.kind==='baffle_horizontal'||p.kind==='baffle_vertical')geometry=plate(p,at,base);
      const overlay=(p.kind==='sensor'||p.kind==='heater')?
        badge(p,h,remap(at),p.kind,n.scale,edges):'';
      return '<g class="ss-tank-part-layer" data-layer="'+index+'" data-part-id="'+safe(p.id||'')+'">'+
        (geometry?'<g class="ss-tank-part-geometry" transform="'+transform+'">'+geometry+'</g>':'')+
        overlay+'</g>';
    }).join('');
    return '<g class="ss-modular-tank"><defs>'+defs.join('')+'</defs>'+
      '<g class="ss-tank-body" transform="'+transform+'">'+
      '<rect x="32" y="111" width="5" height="7" rx="1.3" fill="#839bb9"/>'+
      '<rect x="83" y="111" width="5" height="7" rx="1.3" fill="#839bb9"/>'+
      '<rect x="26" y="4" width="68" height="110" rx="12" fill="url(#'+base+'Steel)" stroke="#e6f2ff" stroke-width=".65"/>'+
      '<rect x="31.5" y="10" width="57" height="100" rx="10" fill="#2b405c" stroke="#b2c8df" stroke-width=".45"/>'+
      '<rect x="34" y="13.5" width="52" height="94" rx="9" fill="#091e38"/>'+
      '<g clip-path="url(#'+base+'WaterClip)">'+water+
      '<rect x="'+X+'" y="'+Y+'" width="'+IW+'" height="'+IH+'" fill="url(#'+base+'Gloss)" opacity=".52"/></g></g>'+
      accessoryLayers+
      '<g class="ss-tank-foreground" transform="'+transform+'">'+
      '<rect x="34" y="13.5" width="52" height="94" rx="9" fill="none" stroke="#d0eaff" stroke-width=".9" stroke-opacity=".57" pointer-events="none"/>'+
      '<path d="M29 15Q26 40 29 100" stroke="#fff" opacity=".3" stroke-width="2.5" fill="none" pointer-events="none"/>'+
      '<path d="M91 15Q94 40 91 100" stroke="#fff" opacity=".15" stroke-width="2.5" fill="none" pointer-events="none"/></g></g>';
  };
  const styles='<style>@keyframes ssTankFlow{to{stroke-dashoffset:-36}}'+
    '.ss-tank-coil-flow{animation:ssTankFlow var(--ss-coil-speed,1s) linear infinite}'+
    '.ss-modular-tank [data-more]{cursor:pointer}</style>';
  return {render,styles,temperature,color,regions,boundaries,permeability,coilPath,coilColor};
})();

/* SVG template helpers shared by device renderers. Keep artwork in src/icons/*.svg. */
const HASSStudioSvg = (() => {
  const escapeXml = value => String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
  }[ch]));

  /** Extract editable standalone SVG contents for insertion into the HA diagram. */
  const fragment = xml => {
    const match = /^\s*(?:<\?xml[^>]*>\s*)?<svg\b[^>]*>([\s\S]*)<\/svg>\s*$/i.exec(xml);
    if (!match) throw new Error('Expected one complete standalone SVG document');
    return match[1];
  };

  /** Replace attributes/text of explicitly named SVG elements, never hand-edit paths. */
  const apply = (template, bindings) => {
    const found = new Set();
    const attributed = template.replace(/<([A-Za-z][\w:.-]*)([^<>]*?)>/g, (opening, tag, attributes) => {
      const id = /(?:^|\s)id="([^"]+)"/.exec(attributes)?.[1];
      if (!id || !Object.prototype.hasOwnProperty.call(bindings, id)) return opening;
      found.add(id);
      const updates = bindings[id];
      for (const [name, value] of Object.entries(updates)) {
        if (name === 'text') continue;
        if (!/^[a-z][a-z-]*$/.test(name)) throw new Error('Invalid SVG attribute: ' + name);
        const attr = new RegExp('(\\s)' + name + '="[^"]*"');
        const replacement = ' ' + name + '="' + escapeXml(value) + '"';
        if (attr.test(attributes)) attributes = attributes.replace(attr, replacement);
        else attributes += replacement;
      }
      return '<' + tag + attributes + '>';
    });
    const rendered = attributed.replace(/(<text\b[^>]*\bid="([^"]+)"[^>]*>)([^<]*)(<\/text>)/g,
      (whole, start, id, previous, end) =>
        Object.prototype.hasOwnProperty.call(bindings[id] || {}, 'text')
          ? start + escapeXml(bindings[id].text) + end : whole);
    for (const id of Object.keys(bindings)) {
      if (!found.has(id)) throw new Error('SVG element not found: ' + id);
    }
    return rendered;
  };

  /** Fill a named empty SVG group with renderer-generated animation SVG. */
  const inject = (template, slots) => {
    let result = template;
    for (const [id, content] of Object.entries(slots)) {
      if (!/^[a-z][a-zA-Z0-9_-]*$/.test(id)) throw new Error('Invalid SVG slot name');
      const marker = '<g id="' + id + '"';
      const start = result.indexOf(marker);
      if (start < 0 || result.indexOf(marker, start + marker.length) >= 0) {
        throw new Error('Expected exactly one SVG slot: ' + id);
      }
      const openEnd = result.indexOf('>', start);
      const close = result.indexOf('</g>', openEnd + 1);
      if (openEnd < 0 || close < 0 || result.slice(openEnd + 1, close).trim()) {
        throw new Error('Expected one empty SVG slot: ' + id);
      }
      result = result.slice(0, openEnd + 1) + content + result.slice(close);
    }
    return result;
  };

  /** Namespace every SVG id/reference so repeated cards cannot collide. */
  const namespaceIds = (svg, prefix) => svg
    .replace(/(\bid=")([^"]+)(")/g, (_, a, id, z) => a + prefix + id + z)
    .replace(/url\(#([^)]+)\)/g, (_, id) => 'url(#' + prefix + id + ')')
    .replace(/(\b(?:href|xlink:href)="#)([^"]+)(")/g, (_, a, id, z) => a + prefix + id + z);

  return Object.freeze({ fragment, apply, inject, namespaceIds });
})();


const HASSStudioIconTemplates = Object.freeze({
  solidFuel: "\n<defs>\n        <linearGradient id=\"bodyFront\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#344864\"/>\n          <stop offset=\".14\" stop-color=\"#60759a\"/>\n          <stop offset=\".50\" stop-color=\"#101926\"/>\n          <stop offset=\".86\" stop-color=\"#4f668a\"/>\n          <stop offset=\"1\" stop-color=\"#2b3d57\"/>\n        </linearGradient>\n        <linearGradient id=\"bodyPanel\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#364960\"/>\n          <stop offset=\"1\" stop-color=\"#121b27\"/>\n        </linearGradient>\n        <linearGradient id=\"metalDark\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#0f1723\"/>\n          <stop offset=\"1\" stop-color=\"#05090f\"/>\n        </linearGradient>\n        <linearGradient id=\"sideBevel\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#152338\"/>\n          <stop offset=\".5\" stop-color=\"#4f6790\"/>\n          <stop offset=\"1\" stop-color=\"#19283e\"/>\n        </linearGradient>\n        <linearGradient id=\"screenGlass\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#0d223a\"/>\n          <stop offset=\"1\" stop-color=\"#030811\"/>\n        </linearGradient>\n        <linearGradient id=\"screenHighlight\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#d5eeff\" stop-opacity=\".15\"/>\n          <stop offset=\"1\" stop-color=\"#ffffff\" stop-opacity=\"0\"/>\n        </linearGradient>\n        <linearGradient id=\"doorGlass\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#202834\"/>\n          <stop offset=\".55\" stop-color=\"#0f1620\"/>\n          <stop offset=\"1\" stop-color=\"#070c13\"/>\n        </linearGradient>\n        <linearGradient id=\"doorInnerFrame\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#202a39\"/>\n          <stop offset=\".5\" stop-color=\"#556882\"/>\n          <stop offset=\"1\" stop-color=\"#1b2531\"/>\n        </linearGradient>\n        <linearGradient id=\"grateGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#2a313b\"/>\n          <stop offset=\"1\" stop-color=\"#11161d\"/>\n        </linearGradient>\n        <linearGradient id=\"displayAccent\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#74c7ff\"/>\n          <stop offset=\"1\" stop-color=\"#35f0db\"/>\n        </linearGradient>\n        <filter id=\"blueGlow\" x=\"-25%\" y=\"-25%\" width=\"150%\" height=\"150%\"><feGaussianBlur stdDeviation=\"10\"/></filter>\n        <filter id=\"softBlueGlow\" x=\"-25%\" y=\"-25%\" width=\"150%\" height=\"150%\"><feGaussianBlur stdDeviation=\"6\"/></filter>\n      <clipPath id=\"solidFireClip\"><rect x=\"420\" y=\"586\" width=\"180\" height=\"210\" rx=\"12\"/></clipPath></defs>\n\n      <g id=\"outerAura\"><path d=\"M270 210 L754 210 L792 248 L792 1146 L754 1180 L270 1180 L232 1146 L232 248 Z\" fill=\"none\" stroke=\"#1a95ff\" stroke-opacity=\".26\" stroke-width=\"16\" filter=\"url(#blueGlow)\"/></g>\n\n      <g id=\"chimney\">\n        <rect x=\"446\" y=\"84\" width=\"132\" height=\"140\" rx=\"16\" fill=\"url(#bodyFront)\" stroke=\"#90d1ff\" stroke-opacity=\".95\" stroke-width=\"4\"/>\n        <rect x=\"438\" y=\"216\" width=\"148\" height=\"18\" rx=\"3\" fill=\"#dcecff\" opacity=\".80\"/>\n      </g>\n\n      <g id=\"stoveBody\">\n        <path d=\"M270 210 L754 210 L792 248 L792 1146 L754 1180 L270 1180 L232 1146 L232 248 Z\" fill=\"url(#bodyFront)\" stroke=\"#dcecff\" stroke-opacity=\".86\" stroke-width=\"4\"/>\n        <path d=\"M232 248 L270 210 V1180 L232 1146 Z\" fill=\"url(#sideBevel)\" opacity=\".70\"/>\n        <path d=\"M754 210 L792 248 V1146 L754 1180 Z\" fill=\"url(#sideBevel)\" opacity=\".50\"/>\n        <rect x=\"262\" y=\"220\" width=\"500\" height=\"15\" rx=\"2\" fill=\"#f1f6ff\" opacity=\".86\"/>\n        <line x1=\"364\" y1=\"220\" x2=\"364\" y2=\"646\" stroke=\"#0a111a\" stroke-opacity=\".50\" stroke-width=\"3\"/>\n        <line x1=\"660\" y1=\"220\" x2=\"660\" y2=\"646\" stroke=\"#0a111a\" stroke-opacity=\".50\" stroke-width=\"3\"/>\n        <line x1=\"262\" y1=\"646\" x2=\"762\" y2=\"646\" stroke=\"#d8e8ff\" stroke-opacity=\".24\" stroke-width=\"3\"/>\n      </g>\n\n      <g id=\"displayGroup\">\n        <rect x=\"416\" y=\"294\" width=\"266\" height=\"150\" rx=\"16\" fill=\"#070f18\" stroke=\"#8fd1ff\" stroke-width=\"3\"/>\n        <rect x=\"424\" y=\"302\" width=\"250\" height=\"134\" rx=\"14\" fill=\"url(#screenGlass)\"/>\n        <path d=\"M430 308 H560 L525 430 H430 Z\" fill=\"url(#screenHighlight)\"/>\n        <text x=\"446\" y=\"340\" font-size=\"18\" fill=\"#89cfff\" font-family=\"monospace\">TEMP</text>\n        <text id=\"tempValue\" x=\"446\" y=\"396\" font-size=\"56\" font-weight=\"700\" fill=\"#e0f8ff\" font-family=\"monospace\">65.0°</text>\n        <text x=\"560\" y=\"394\" font-size=\"20\" fill=\"#7bd1ff\" font-family=\"monospace\">C</text>\n        <text id=\"fuelLabel\" x=\"446\" y=\"424\" font-size=\"18\" fill=\"#58bcff\" font-family=\"monospace\">DREWNO</text>\n        <circle cx=\"596\" cy=\"370\" r=\"38\" fill=\"#08111a\" stroke=\"#9ed9ff\" stroke-width=\"5\"/>\n        <path d=\"M596 332 A 38 38 0 1 1 595.9 332\" fill=\"none\" stroke=\"#233043\" stroke-width=\"11\" stroke-linecap=\"round\"/>\n        <path id=\"dialArc\" d=\"M596 332 A 38 38 0 1 1 595.9 332\" fill=\"none\" stroke=\"#59c84c\" stroke-width=\"11\" stroke-linecap=\"round\" stroke-dasharray=\"120 240\"/>\n        <circle cx=\"596\" cy=\"370\" r=\"11\" fill=\"#08111a\"/>\n        <circle cx=\"702\" cy=\"332\" r=\"14\" fill=\"#07111a\" stroke=\"#7fc6ff\" stroke-width=\"3\"/>\n        <circle cx=\"702\" cy=\"370\" r=\"14\" fill=\"#07111a\" stroke=\"#7fc6ff\" stroke-width=\"3\"/>\n        <circle cx=\"702\" cy=\"408\" r=\"14\" fill=\"#07111a\" stroke=\"#7fc6ff\" stroke-width=\"3\"/>\n        <circle cx=\"702\" cy=\"332\" r=\"4\" fill=\"#7fc6ff\"/>\n        <path d=\"M696 371 h12 M702 365 v12\" stroke=\"#7fc6ff\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n        <rect x=\"696\" y=\"402\" width=\"12\" height=\"12\" rx=\"2\" fill=\"none\" stroke=\"#7fc6ff\" stroke-width=\"2\"/>\n      </g>\n\n      <g id=\"fireSection\">\n        <rect x=\"322\" y=\"500\" width=\"380\" height=\"470\" rx=\"18\" fill=\"#0a1119\" opacity=\".52\"/>\n        <rect x=\"296\" y=\"468\" width=\"432\" height=\"500\" rx=\"6\" fill=\"#081019\" opacity=\".26\"/>\n        <rect x=\"350\" y=\"520\" width=\"320\" height=\"420\" rx=\"16\" fill=\"url(#bodyPanel)\" stroke=\"#9bb1d3\" stroke-opacity=\".58\" stroke-width=\"2.2\"/>\n        <rect x=\"390\" y=\"556\" width=\"240\" height=\"338\" rx=\"22\" fill=\"url(#doorGlass)\" stroke=\"#8fcfff\" stroke-width=\"3.2\"/>\n        <rect id=\"doorGlowFrame\" x=\"390\" y=\"556\" width=\"240\" height=\"338\" rx=\"22\" fill=\"none\" stroke=\"#23a4ff\" stroke-opacity=\".22\" stroke-width=\"10\" filter=\"url(#softBlueGlow)\"/>\n        <path d=\"M408 582 h56 v224 l-42 0 z\" fill=\"#ffffff\" opacity=\".11\"/>\n        <path d=\"M612 570 h-48 l-34 320 h34 z\" fill=\"#9dd5ff\" opacity=\".05\"/>\n\n        <!-- empty combustion chamber -->\n        <g id=\"emptyChamber\">\n          <rect x=\"408\" y=\"575\" width=\"204\" height=\"300\" rx=\"18\" fill=\"#0d131b\" stroke=\"url(#doorInnerFrame)\" stroke-width=\"2\"/>\n          <rect x=\"420\" y=\"586\" width=\"180\" height=\"210\" rx=\"12\" fill=\"#0a0f16\"/>\n          <rect x=\"420\" y=\"586\" width=\"180\" height=\"210\" rx=\"12\" fill=\"none\" stroke=\"#8ecfff\" stroke-opacity=\".08\" stroke-width=\"2\"/>\n          <g opacity=\".12\" stroke=\"#dbeaff\" stroke-width=\"1.5\">\n            <line x1=\"452\" y1=\"590\" x2=\"452\" y2=\"792\"/>\n            <line x1=\"512\" y1=\"590\" x2=\"512\" y2=\"792\"/>\n            <line x1=\"572\" y1=\"590\" x2=\"572\" y2=\"792\"/>\n          </g>\n          <g id=\"grate\">\n            <rect x=\"432\" y=\"804\" width=\"156\" height=\"14\" rx=\"4\" fill=\"url(#grateGrad)\"/>\n            <g fill=\"url(#grateGrad)\">\n              <rect x=\"438\" y=\"784\" width=\"8\" height=\"30\" rx=\"2\"/>\n              <rect x=\"458\" y=\"784\" width=\"8\" height=\"30\" rx=\"2\"/>\n              <rect x=\"478\" y=\"784\" width=\"8\" height=\"30\" rx=\"2\"/>\n              <rect x=\"498\" y=\"784\" width=\"8\" height=\"30\" rx=\"2\"/>\n              <rect x=\"518\" y=\"784\" width=\"8\" height=\"30\" rx=\"2\"/>\n              <rect x=\"538\" y=\"784\" width=\"8\" height=\"30\" rx=\"2\"/>\n              <rect x=\"558\" y=\"784\" width=\"8\" height=\"30\" rx=\"2\"/>\n              <rect x=\"578\" y=\"784\" width=\"8\" height=\"30\" rx=\"2\"/>\n            </g>\n          </g>\n          <path d=\"M430 835 C468 825 554 825 590 835\" fill=\"none\" stroke=\"#9ccfff\" stroke-opacity=\".07\" stroke-width=\"10\" stroke-linecap=\"round\"/>\n        </g>\n\n        <g id=\"combustionSlot\"></g>\n        <g id=\"hinges\" fill=\"url(#bodyFront)\" stroke=\"#8fcfff\" stroke-width=\"2.2\">\n          <rect x=\"372\" y=\"606\" width=\"16\" height=\"98\" rx=\"4\"/>\n          <rect x=\"372\" y=\"804\" width=\"16\" height=\"98\" rx=\"4\"/>\n        </g>\n        <g id=\"handle\">\n          <rect x=\"650\" y=\"756\" width=\"32\" height=\"104\" rx=\"10\" fill=\"url(#bodyFront)\" stroke=\"#91d0ff\" stroke-width=\"2.5\"/>\n          <rect x=\"642\" y=\"746\" width=\"14\" height=\"44\" rx=\"6\" fill=\"#7ec9ff\" opacity=\".72\"/>\n        </g>\n      </g>\n\n      <g id=\"drawer\">\n        <rect x=\"366\" y=\"1010\" width=\"292\" height=\"130\" rx=\"10\" fill=\"url(#bodyPanel)\" stroke=\"#a4b7d7\" stroke-opacity=\".60\" stroke-width=\"2.2\"/>\n        <rect x=\"472\" y=\"1064\" width=\"80\" height=\"26\" rx=\"4\" fill=\"#0b1118\" stroke=\"#91cfff\" stroke-width=\"2\"/>\n      </g>\n\n      <g id=\"base\">\n        <path d=\"M238 1162 H786 L788 1236 L754 1266 H270 L236 1236 Z\" fill=\"url(#bodyFront)\" stroke=\"#8fd2ff\" stroke-opacity=\".88\" stroke-width=\"4\"/>\n        <path d=\"M236 1236 L270 1266 V1162 H238 Z\" fill=\"#40699f\" opacity=\".62\"/>\n        <path d=\"M786 1162 L788 1236 L754 1266 V1162 Z\" fill=\"#2f4a72\" opacity=\".58\"/>\n        <ellipse cx=\"284\" cy=\"1298\" rx=\"28\" ry=\"14\" fill=\"url(#bodyFront)\"/>\n        <rect x=\"256\" y=\"1248\" width=\"56\" height=\"54\" rx=\"8\" fill=\"url(#bodyFront)\"/>\n        <ellipse cx=\"740\" cy=\"1298\" rx=\"28\" ry=\"14\" fill=\"url(#bodyFront)\"/>\n        <rect x=\"712\" y=\"1248\" width=\"56\" height=\"54\" rx=\"8\" fill=\"url(#bodyFront)\"/>\n      </g>\n",
  pellet: "\n<defs>\n        <linearGradient id=\"steelFront\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#3c5270\"/>\n          <stop offset=\".16\" stop-color=\"#7c96bb\"/>\n          <stop offset=\".5\" stop-color=\"#121a27\"/>\n          <stop offset=\".84\" stop-color=\"#4e678d\"/>\n          <stop offset=\"1\" stop-color=\"#2c3f5b\"/>\n        </linearGradient>\n        <linearGradient id=\"steelPanel\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#364a61\"/>\n          <stop offset=\"1\" stop-color=\"#111925\"/>\n        </linearGradient>\n        <linearGradient id=\"edgeGlowGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#dbe9ff\"/>\n          <stop offset=\"1\" stop-color=\"#8ecfff\"/>\n        </linearGradient>\n        <linearGradient id=\"darkGlass\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#202a35\"/>\n          <stop offset=\"1\" stop-color=\"#070c13\"/>\n        </linearGradient>\n        <linearGradient id=\"screenGlass\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#0a233a\"/>\n          <stop offset=\"1\" stop-color=\"#02070f\"/>\n        </linearGradient>\n        <linearGradient id=\"screenHighlight\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#ffffff\" stop-opacity=\".18\"/>\n          <stop offset=\"1\" stop-color=\"#ffffff\" stop-opacity=\"0\"/>\n        </linearGradient>\n        <linearGradient id=\"hopperGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#425878\"/>\n          <stop offset=\"1\" stop-color=\"#111926\"/>\n        </linearGradient>\n        <linearGradient id=\"motorGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#25384f\"/>\n          <stop offset=\".5\" stop-color=\"#59739b\"/>\n          <stop offset=\"1\" stop-color=\"#22354a\"/>\n        </linearGradient>\n        <filter id=\"blueGlow\" x=\"-25%\" y=\"-25%\" width=\"150%\" height=\"150%\"><feGaussianBlur stdDeviation=\"10\"/></filter>\n        <filter id=\"softBlueGlow\" x=\"-25%\" y=\"-25%\" width=\"150%\" height=\"150%\"><feGaussianBlur stdDeviation=\"6\"/></filter>\n      <clipPath id=\"pelletBurnerClip\"><rect x=\"242\" y=\"560\" width=\"188\" height=\"240\" rx=\"12\"/></clipPath></defs>\n\n      <g id=\"aura\">\n        <path d=\"M120 210 L560 210 L596 246 L596 1106 L560 1140 L120 1140 L84 1106 L84 246 Z\" fill=\"none\" stroke=\"#2aa5ff\" stroke-opacity=\".22\" stroke-width=\"16\" filter=\"url(#blueGlow)\"/>\n        <path d=\"M672 242 L1084 242 L1120 276 L1120 688 L988 834 L988 1060 L920 1098 L794 1098 L794 864 L672 726 Z\" fill=\"none\" stroke=\"#2aa5ff\" stroke-opacity=\".18\" stroke-width=\"14\" filter=\"url(#blueGlow)\"/>\n      </g>\n\n      <g id=\"chimney\">\n        <rect x=\"280\" y=\"82\" width=\"126\" height=\"132\" rx=\"16\" fill=\"url(#steelFront)\" stroke=\"#dcecff\" stroke-opacity=\".85\" stroke-width=\"4\"/>\n        <line x1=\"280\" y1=\"150\" x2=\"406\" y2=\"150\" stroke=\"#edf5ff\" stroke-opacity=\".66\" stroke-width=\"3\"/>\n      </g>\n\n      <g id=\"stoveBody\">\n        <path d=\"M120 210 L560 210 L596 246 L596 1106 L560 1140 L120 1140 L84 1106 L84 246 Z\" fill=\"url(#steelFront)\" stroke=\"#dcecff\" stroke-opacity=\".88\" stroke-width=\"4\"/>\n        <path d=\"M84 246 L120 210 V1140 L84 1106 Z\" fill=\"#40699f\" opacity=\".48\"/>\n        <path d=\"M560 210 L596 246 V1106 L560 1140 Z\" fill=\"#2a4263\" opacity=\".56\"/>\n        <rect x=\"114\" y=\"220\" width=\"446\" height=\"16\" rx=\"3\" fill=\"#eef6ff\" opacity=\".82\"/>\n        <line x1=\"180\" y1=\"220\" x2=\"180\" y2=\"520\" stroke=\"#0a121b\" stroke-opacity=\".42\" stroke-width=\"3\"/>\n        <line x1=\"534\" y1=\"220\" x2=\"534\" y2=\"1140\" stroke=\"#0a121b\" stroke-opacity=\".28\" stroke-width=\"3\"/>\n        <line x1=\"114\" y1=\"392\" x2=\"560\" y2=\"392\" stroke=\"#d6e8ff\" stroke-opacity=\".18\" stroke-width=\"3\"/>\n      </g>\n\n      <g id=\"displayPanel\">\n        <rect x=\"164\" y=\"262\" width=\"316\" height=\"106\" rx=\"12\" fill=\"#061018\" stroke=\"#8fd1ff\" stroke-width=\"3\"/>\n        <rect x=\"174\" y=\"272\" width=\"296\" height=\"86\" rx=\"10\" fill=\"url(#screenGlass)\"/>\n        <path d=\"M180 278 H318 L286 354 H180 Z\" fill=\"url(#screenHighlight)\"/>\n        <text x=\"200\" y=\"305\" font-size=\"14\" fill=\"#7cc8ff\" font-family=\"monospace\">TEMP</text>\n        <text id=\"tempValue\" x=\"200\" y=\"345\" font-size=\"42\" fill=\"#e3f8ff\" font-family=\"monospace\" font-weight=\"700\">65.0°</text>\n        <text x=\"298\" y=\"343\" font-size=\"18\" fill=\"#72c8ff\" font-family=\"monospace\">C</text>\n        <g opacity=\".84\" fill=\"#5fb9ff\">\n          <rect x=\"354\" y=\"290\" width=\"26\" height=\"6\" rx=\"3\"/>\n          <rect x=\"354\" y=\"306\" width=\"26\" height=\"6\" rx=\"3\"/>\n          <rect x=\"354\" y=\"322\" width=\"26\" height=\"6\" rx=\"3\"/>\n          <rect x=\"354\" y=\"338\" width=\"26\" height=\"6\" rx=\"3\"/>\n        </g>\n        <circle cx=\"422\" cy=\"314\" r=\"28\" fill=\"#07111a\" stroke=\"#88d0ff\" stroke-width=\"4\"/>\n        <circle id=\"statusRingGlow\" cx=\"422\" cy=\"314\" r=\"34\" fill=\"none\" stroke=\"#2ab2ff\" stroke-opacity=\".26\" stroke-width=\"6\" filter=\"url(#softBlueGlow)\"/>\n        <path d=\"M422 286 A 28 28 0 1 1 421.9 286\" fill=\"none\" stroke=\"#263449\" stroke-width=\"9\" stroke-linecap=\"round\"/>\n        <path id=\"statusArc\" d=\"M422 286 A 28 28 0 1 1 421.9 286\" fill=\"none\" stroke=\"#59c84c\" stroke-width=\"9\" stroke-linecap=\"round\" stroke-dasharray=\"120 176\"/>\n      </g>\n\n      <g id=\"doorSection\">\n        <rect x=\"150\" y=\"446\" width=\"366\" height=\"438\" rx=\"20\" fill=\"#0b121b\" opacity=\".46\"/>\n        <rect x=\"186\" y=\"488\" width=\"300\" height=\"382\" rx=\"16\" fill=\"url(#steelPanel)\" stroke=\"#9eb4d6\" stroke-opacity=\".56\" stroke-width=\"2.4\"/>\n        <rect x=\"224\" y=\"542\" width=\"224\" height=\"274\" rx=\"16\" fill=\"url(#darkGlass)\" stroke=\"#92d1ff\" stroke-width=\"3\"/>\n        <rect id=\"doorGlowFrame\" x=\"224\" y=\"542\" width=\"224\" height=\"274\" rx=\"16\" fill=\"none\" stroke=\"#2aa5ff\" stroke-opacity=\".18\" stroke-width=\"10\" filter=\"url(#softBlueGlow)\"/>\n        <path d=\"M240 564 h46 v178 l-32 0 z\" fill=\"#ffffff\" opacity=\".10\"/>\n        <path d=\"M436 556 h-40 l-30 258 h28 z\" fill=\"#a4d8ff\" opacity=\".05\"/>\n        <g id=\"emptyBurner\">\n          <rect x=\"242\" y=\"560\" width=\"188\" height=\"240\" rx=\"12\" fill=\"#0a0f16\"/>\n          <rect x=\"242\" y=\"560\" width=\"188\" height=\"240\" rx=\"12\" fill=\"none\" stroke=\"#8ecfff\" stroke-opacity=\".08\" stroke-width=\"2\"/>\n          <g opacity=\".10\" stroke=\"#ddeaff\" stroke-width=\"1.4\">\n            <line x1=\"290\" y1=\"566\" x2=\"290\" y2=\"798\"/>\n            <line x1=\"336\" y1=\"566\" x2=\"336\" y2=\"798\"/>\n            <line x1=\"382\" y1=\"566\" x2=\"382\" y2=\"798\"/>\n          </g>\n          <rect x=\"260\" y=\"760\" width=\"150\" height=\"12\" rx=\"4\" fill=\"#1e2631\"/>\n          <g fill=\"#202933\">\n            <rect x=\"268\" y=\"742\" width=\"8\" height=\"28\" rx=\"2\"/>\n            <rect x=\"288\" y=\"742\" width=\"8\" height=\"28\" rx=\"2\"/>\n            <rect x=\"308\" y=\"742\" width=\"8\" height=\"28\" rx=\"2\"/>\n            <rect x=\"328\" y=\"742\" width=\"8\" height=\"28\" rx=\"2\"/>\n            <rect x=\"348\" y=\"742\" width=\"8\" height=\"28\" rx=\"2\"/>\n            <rect x=\"368\" y=\"742\" width=\"8\" height=\"28\" rx=\"2\"/>\n            <rect x=\"388\" y=\"742\" width=\"8\" height=\"28\" rx=\"2\"/>\n          </g>\n          <g id=\"combustionSlot\"></g>\n        </g>\n        <g fill=\"url(#steelFront)\" stroke=\"#90d1ff\" stroke-width=\"2.2\">\n          <rect x=\"170\" y=\"588\" width=\"14\" height=\"96\" rx=\"4\"/>\n          <rect x=\"170\" y=\"786\" width=\"14\" height=\"96\" rx=\"4\"/>\n        </g>\n        <g id=\"mainHandle\">\n          <rect x=\"478\" y=\"670\" width=\"30\" height=\"118\" rx=\"10\" fill=\"url(#steelFront)\" stroke=\"#91d0ff\" stroke-width=\"2.5\"/>\n          <rect x=\"468\" y=\"660\" width=\"14\" height=\"46\" rx=\"6\" fill=\"#9bd2ff\" opacity=\".74\"/>\n        </g>\n      </g>\n\n      <g id=\"drawerSection\">\n        <rect x=\"168\" y=\"922\" width=\"318\" height=\"150\" rx=\"12\" fill=\"url(#steelPanel)\" stroke=\"#a4b7d7\" stroke-opacity=\".56\" stroke-width=\"2.2\"/>\n        <rect x=\"250\" y=\"978\" width=\"154\" height=\"42\" rx=\"8\" fill=\"#081018\" stroke=\"#8fcfff\" stroke-opacity=\".55\" stroke-width=\"2.2\"/>\n        <g fill=\"url(#steelFront)\" stroke=\"#90d1ff\" stroke-width=\"2\">\n          <rect x=\"170\" y=\"976\" width=\"12\" height=\"94\" rx=\"4\"/>\n          <rect x=\"448\" y=\"962\" width=\"22\" height=\"70\" rx=\"7\"/>\n        </g>\n      </g>\n\n      <g id=\"stoveBase\">\n        <path d=\"M82 1088 H598 L598 1156 L566 1184 H114 L82 1156 Z\" fill=\"url(#steelFront)\" stroke=\"#8fd1ff\" stroke-opacity=\".82\" stroke-width=\"4\"/>\n        <rect x=\"130\" y=\"1180\" width=\"26\" height=\"18\" rx=\"4\" fill=\"#223248\"/>\n        <rect x=\"522\" y=\"1180\" width=\"26\" height=\"18\" rx=\"4\" fill=\"#223248\"/>\n      </g>\n\n      <g id=\"hopperGroup\">\n        <path d=\"M672 242 L1084 242 L1120 276 L1120 688 L988 834 L988 1060 L920 1098 L794 1098 L794 864 L672 726 Z\" fill=\"url(#hopperGrad)\" stroke=\"#dcecff\" stroke-opacity=\".84\" stroke-width=\"4\"/>\n        <path d=\"M672 242 L714 212 H1046 L1084 242 Z\" fill=\"url(#steelFront)\" stroke=\"#dcecff\" stroke-opacity=\".76\" stroke-width=\"4\"/>\n        <path d=\"M714 212 H1046 L1088 252 H756 Z\" fill=\"#495f7f\" opacity=\".74\"/>\n        <rect x=\"810\" y=\"202\" width=\"132\" height=\"20\" rx=\"8\" fill=\"#1d2836\" stroke=\"#b8d6ff\" stroke-width=\"2.4\"/>\n        <rect x=\"864\" y=\"244\" width=\"36\" height=\"38\" rx=\"4\" fill=\"#34485f\" stroke=\"#aacfff\" stroke-width=\"2\"/>\n        <rect x=\"894\" y=\"338\" width=\"58\" height=\"286\" rx=\"18\" fill=\"#070d13\" stroke=\"#8ecfff\" stroke-opacity=\".46\" stroke-width=\"2.2\"/>\n        <rect x=\"905\" y=\"352\" width=\"36\" height=\"258\" rx=\"14\" fill=\"#0f1620\"/>\n        <rect x=\"905\" y=\"352\" width=\"36\" height=\"258\" rx=\"14\" fill=\"none\" stroke=\"#9fd7ff\" stroke-opacity=\".10\" stroke-width=\"2\"/>\n        <path d=\"M766 706 H1098 L988 834 H794 Z\" fill=\"#162234\" opacity=\".84\"/>\n        <path d=\"M794 864 L988 864 L988 1060 L920 1098 L794 1098 Z\" fill=\"#122030\" opacity=\".86\"/>\n      </g>\n\n\n      <g id=\"connectionPipe\">\n        <rect x=\"596\" y=\"974\" width=\"164\" height=\"64\" rx=\"24\" fill=\"url(#motorGrad)\" stroke=\"#d7ebff\" stroke-opacity=\".62\" stroke-width=\"3\"/>\n        <rect x=\"612\" y=\"986\" width=\"132\" height=\"40\" rx=\"18\" fill=\"#12202e\" opacity=\".62\"/>\n        <rect x=\"580\" y=\"986\" width=\"20\" height=\"40\" rx=\"6\" fill=\"url(#steelFront)\" stroke=\"#9fd5ff\" stroke-opacity=\".46\" stroke-width=\"2\"/>\n        <rect x=\"744\" y=\"986\" width=\"18\" height=\"40\" rx=\"6\" fill=\"url(#steelFront)\" stroke=\"#9fd5ff\" stroke-opacity=\".46\" stroke-width=\"2\"/>\n        <ellipse cx=\"596\" cy=\"1006\" rx=\"16\" ry=\"26\" fill=\"url(#steelFront)\" stroke=\"#b9dcff\" stroke-opacity=\".72\" stroke-width=\"2.6\"/>\n      </g>\n\n      <g id=\"feedSystem\">\n        <rect x=\"760\" y=\"946\" width=\"140\" height=\"122\" rx=\"16\" fill=\"url(#motorGrad)\" stroke=\"#d7ebff\" stroke-opacity=\".64\" stroke-width=\"3\"/>\n        <rect x=\"900\" y=\"972\" width=\"80\" height=\"72\" rx=\"18\" fill=\"#12202e\" stroke=\"#9fd5ff\" stroke-opacity=\".44\" stroke-width=\"2.4\"/>\n        <rect x=\"978\" y=\"966\" width=\"84\" height=\"84\" rx=\"14\" fill=\"#1c2c40\" stroke=\"#cae6ff\" stroke-opacity=\".66\" stroke-width=\"3\"/>\n        <ellipse cx=\"1062\" cy=\"1008\" rx=\"28\" ry=\"42\" fill=\"url(#steelFront)\" stroke=\"#b9dcff\" stroke-width=\"3\"/>\n        <rect x=\"884\" y=\"1060\" width=\"16\" height=\"78\" rx=\"6\" fill=\"url(#steelFront)\"/>\n        <rect x=\"1020\" y=\"1062\" width=\"16\" height=\"76\" rx=\"6\" fill=\"url(#steelFront)\"/>\n        <rect x=\"834\" y=\"1060\" width=\"20\" height=\"56\" rx=\"6\" fill=\"#162331\" stroke=\"#99d1ff\" stroke-opacity=\".45\" stroke-width=\"2\"/>\n        <rect x=\"826\" y=\"1110\" width=\"36\" height=\"12\" rx=\"4\" fill=\"url(#steelFront)\"/>\n        <circle cx=\"786\" cy=\"970\" r=\"4\" fill=\"#e6f3ff\"/>\n        <circle cx=\"874\" cy=\"970\" r=\"4\" fill=\"#e6f3ff\"/>\n        <circle cx=\"786\" cy=\"1044\" r=\"4\" fill=\"#e6f3ff\"/>\n        <circle cx=\"874\" cy=\"1044\" r=\"4\" fill=\"#e6f3ff\"/>\n      </g>\n",
  heatPump: "\n<defs>\n        <linearGradient id=\"bodyGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#dde5ef\"/>\n          <stop offset=\".14\" stop-color=\"#fbfdff\"/>\n          <stop offset=\".48\" stop-color=\"#c2ccda\"/>\n          <stop offset=\".78\" stop-color=\"#a7b3c4\"/>\n          <stop offset=\"1\" stop-color=\"#8f9cae\"/>\n        </linearGradient>\n        <linearGradient id=\"bodySideGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#eef4fb\"/>\n          <stop offset=\"1\" stop-color=\"#b5c1d1\"/>\n        </linearGradient>\n        <linearGradient id=\"darkPanel\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#0e1c2e\"/>\n          <stop offset=\"1\" stop-color=\"#02070f\"/>\n        </linearGradient>\n        <linearGradient id=\"blueFanGlow\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#23a8ff\"/>\n          <stop offset=\"1\" stop-color=\"#0069ff\"/>\n        </linearGradient>\n        <linearGradient id=\"bladeGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#143962\"/>\n          <stop offset=\".5\" stop-color=\"#07101b\"/>\n          <stop offset=\"1\" stop-color=\"#0f2c4d\"/>\n        </linearGradient>\n        <linearGradient id=\"footGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#1d2837\"/>\n          <stop offset=\".5\" stop-color=\"#5c6f8a\"/>\n          <stop offset=\"1\" stop-color=\"#1b2635\"/>\n        </linearGradient>\n        <radialGradient id=\"fanAura\" cx=\"50%\" cy=\"50%\" r=\"50%\">\n          <stop offset=\"0\" stop-color=\"#1b86ff\" stop-opacity=\".25\"/>\n          <stop offset=\".55\" stop-color=\"#0f6df5\" stop-opacity=\".16\"/>\n          <stop offset=\"1\" stop-color=\"#0f6df5\" stop-opacity=\"0\"/>\n        </radialGradient>\n        <filter id=\"blueGlow\" x=\"-25%\" y=\"-25%\" width=\"150%\" height=\"150%\"><feGaussianBlur stdDeviation=\"10\"/></filter>\n        <filter id=\"softGlow\" x=\"-25%\" y=\"-25%\" width=\"150%\" height=\"150%\"><feGaussianBlur stdDeviation=\"5\"/></filter>\n      </defs>\n\n      <g id=\"aura\">\n        <path id=\"hpAuraOutline\" d=\"M126 152 H1128 Q1168 152 1168 192 V790 Q1168 828 1128 828 H126 Q86 828 86 790 V192 Q86 152 126 152 Z\" fill=\"none\" stroke=\"#2aa5ff\" stroke-opacity=\"0.12\" stroke-width=\"16\" filter=\"url(#blueGlow)\"/>\n      </g>\n\n      <g id=\"unitBody\">\n        <path d=\"M126 152 H1128 Q1168 152 1168 192 V790 Q1168 828 1128 828 H126 Q86 828 86 790 V192 Q86 152 126 152 Z\" fill=\"url(#bodyGrad)\" stroke=\"#f8fbff\" stroke-width=\"4\"/>\n        <rect x=\"86\" y=\"172\" width=\"1082\" height=\"22\" rx=\"8\" fill=\"#edf4fb\" opacity=\".82\"/>\n        <line x1=\"86\" y1=\"788\" x2=\"1168\" y2=\"788\" stroke=\"#8193ab\" stroke-opacity=\".56\" stroke-width=\"3\"/>\n        <path d=\"M814 152 V828\" stroke=\"#6a7890\" stroke-opacity=\".72\" stroke-width=\"5\"/>\n        <path d=\"M118 182 V798\" stroke=\"#6c7990\" stroke-opacity=\".40\" stroke-width=\"3\"/>\n        <path d=\"M1136 182 V798\" stroke=\"#6c7990\" stroke-opacity=\".40\" stroke-width=\"3\"/>\n      </g>\n\n      <g id=\"fanSection\">\n        <circle cx=\"458\" cy=\"490\" r=\"272\" fill=\"#d7e0eb\" stroke=\"#8ea2ba\" stroke-width=\"4\"/>\n        <circle cx=\"458\" cy=\"490\" r=\"248\" fill=\"#07111b\" stroke=\"#cad9e8\" stroke-width=\"4\"/>\n        <circle id=\"fanGlowRing\" cx=\"458\" cy=\"490\" r=\"244\" fill=\"none\" stroke=\"#2191ff\" stroke-opacity=\"0.20\" stroke-width=\"10\" filter=\"url(#blueGlow)\"/>\n        <circle cx=\"458\" cy=\"490\" r=\"234\" fill=\"url(#fanAura)\"/>\n\n        <g id=\"bladeRotor\" class=\"ss-hp-still\" style=\"animation:none;\">\n          <g class=\"bladeSet\">\n            <path d=\"M458 490 C470 454 520 394 586 346 C613 362 629 380 640 400 C610 438 548 474 458 490 Z\" fill=\"url(#bladeGrad)\"/>\n            <path d=\"M472 482 C492 450 540 404 591 372\" fill=\"none\" stroke=\"#2191ff\" stroke-opacity=\".34\" stroke-width=\"8\" stroke-linecap=\"round\"/>\n          </g>\n          <g class=\"bladeSet\" transform=\"rotate(90 458 490)\">\n            <path d=\"M458 490 C470 454 520 394 586 346 C613 362 629 380 640 400 C610 438 548 474 458 490 Z\" fill=\"url(#bladeGrad)\"/>\n            <path d=\"M472 482 C492 450 540 404 591 372\" fill=\"none\" stroke=\"#2191ff\" stroke-opacity=\".34\" stroke-width=\"8\" stroke-linecap=\"round\"/>\n          </g>\n          <g class=\"bladeSet\" transform=\"rotate(180 458 490)\">\n            <path d=\"M458 490 C470 454 520 394 586 346 C613 362 629 380 640 400 C610 438 548 474 458 490 Z\" fill=\"url(#bladeGrad)\"/>\n            <path d=\"M472 482 C492 450 540 404 591 372\" fill=\"none\" stroke=\"#2191ff\" stroke-opacity=\".34\" stroke-width=\"8\" stroke-linecap=\"round\"/>\n          </g>\n          <g class=\"bladeSet\" transform=\"rotate(270 458 490)\">\n            <path d=\"M458 490 C470 454 520 394 586 346 C613 362 629 380 640 400 C610 438 548 474 458 490 Z\" fill=\"url(#bladeGrad)\"/>\n            <path d=\"M472 482 C492 450 540 404 591 372\" fill=\"none\" stroke=\"#2191ff\" stroke-opacity=\".34\" stroke-width=\"8\" stroke-linecap=\"round\"/>\n          </g>\n          <circle cx=\"458\" cy=\"490\" r=\"82\" fill=\"url(#bodyGrad)\" stroke=\"#eef6ff\" stroke-width=\"4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"58\" fill=\"url(#bodySideGrad)\" opacity=\".74\"/>\n        </g>\n\n        <g id=\"fanGrille\" stroke=\"#0c1622\" stroke-width=\"5\" fill=\"none\" stroke-linecap=\"round\">\n          <circle cx=\"458\" cy=\"490\" r=\"236\" stroke=\"#111e2d\" stroke-width=\"8\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"218\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"200\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"182\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"164\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"146\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"128\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"110\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"92\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <path d=\"M458 256 V724\" stroke=\"#0f1e30\" stroke-width=\"8\"/>\n          <path d=\"M224 490 H692\" stroke=\"#0f1e30\" stroke-width=\"8\"/>\n          <path d=\"M292 324 L624 656\" stroke=\"#0f1e30\" stroke-width=\"8\"/>\n          <path d=\"M624 324 L292 656\" stroke=\"#0f1e30\" stroke-width=\"8\"/>\n        </g>\n      </g>\n\n      <g id=\"displayBlock\">\n        <rect x=\"842\" y=\"286\" width=\"288\" height=\"170\" rx=\"18\" fill=\"#d8e1ec\" stroke=\"#6f8097\" stroke-width=\"3\"/>\n        <rect x=\"858\" y=\"302\" width=\"256\" height=\"138\" rx=\"14\" fill=\"url(#darkPanel)\" stroke=\"#7ed0ff\" stroke-opacity=\".46\" stroke-width=\"2.5\"/>\n        <path d=\"M866 310 H988 L956 432 H866 Z\" fill=\"#ffffff\" opacity=\".09\"/>\n        <text x=\"884\" y=\"334\" font-size=\"14\" fill=\"#7dbdff\" font-family=\"monospace\">POWER</text>\n        <text id=\"powerValueDisplay\" x=\"884\" y=\"378\" font-size=\"42\" fill=\"#eaf8ff\" font-family=\"monospace\" font-weight=\"700\">1.80 kW</text>\n        <text x=\"884\" y=\"404\" font-size=\"13\" fill=\"#7dbdff\" font-family=\"monospace\">FAN SPEED</text>\n        <text id=\"fanSpeedDisplay\" x=\"1090\" y=\"404\" font-size=\"13\" fill=\"#cfefff\" font-family=\"monospace\" text-anchor=\"end\">900 RPM</text>\n        <rect x=\"884\" y=\"414\" width=\"206\" height=\"12\" rx=\"6\" fill=\"#203244\"/>\n        <rect id=\"fanSpeedBar\" x=\"884\" y=\"414\" width=\"103\" height=\"12\" rx=\"6\" fill=\"#36a4ff\"/>\n        <rect x=\"884\" y=\"414\" width=\"206\" height=\"12\" rx=\"6\" fill=\"none\" stroke=\"#5caeff\" stroke-opacity=\".22\" stroke-width=\"1.5\"/>\n      </g>\n\n      <g id=\"ventSlots\" fill=\"#0a1118\" stroke=\"#7d8c9f\" stroke-width=\"2.5\">\n        <rect x=\"884\" y=\"552\" width=\"228\" height=\"32\" rx=\"16\"/>\n        <rect x=\"884\" y=\"620\" width=\"228\" height=\"32\" rx=\"16\"/>\n        <rect x=\"884\" y=\"688\" width=\"228\" height=\"32\" rx=\"16\"/>\n      </g>\n      <g id=\"ventMeshes\" fill=\"#141f2c\" opacity=\".82\">\n        <rect x=\"896\" y=\"560\" width=\"204\" height=\"16\" rx=\"8\"/>\n        <rect x=\"896\" y=\"628\" width=\"204\" height=\"16\" rx=\"8\"/>\n        <rect x=\"896\" y=\"696\" width=\"204\" height=\"16\" rx=\"8\"/>\n      </g>\n\n      <g id=\"screws\">\n        <circle cx=\"126\" cy=\"806\" r=\"10\" fill=\"#39495f\" stroke=\"#dce9f9\" stroke-width=\"2.2\"/>\n        <circle cx=\"126\" cy=\"806\" r=\"4\" fill=\"#08111a\"/>\n        <circle cx=\"850\" cy=\"806\" r=\"10\" fill=\"#39495f\" stroke=\"#dce9f9\" stroke-width=\"2.2\"/>\n        <circle cx=\"850\" cy=\"806\" r=\"4\" fill=\"#08111a\"/>\n        <circle cx=\"1124\" cy=\"806\" r=\"10\" fill=\"#39495f\" stroke=\"#dce9f9\" stroke-width=\"2.2\"/>\n        <circle cx=\"1124\" cy=\"806\" r=\"4\" fill=\"#08111a\"/>\n      </g>\n\n      <g id=\"feet\">\n        <path d=\"M200 826 H320 L296 892 H176 Z\" fill=\"url(#footGrad)\" stroke=\"#bde0ff\" stroke-width=\"3\"/>\n        <path d=\"M904 826 H1024 L1000 892 H880 Z\" fill=\"url(#footGrad)\" stroke=\"#bde0ff\" stroke-width=\"3\"/>\n        <rect x=\"174\" y=\"892\" width=\"126\" height=\"18\" rx=\"6\" fill=\"#2296ff\" opacity=\".82\" filter=\"url(#softGlow)\"/>\n        <rect x=\"878\" y=\"892\" width=\"126\" height=\"18\" rx=\"6\" fill=\"#2296ff\" opacity=\".82\" filter=\"url(#softGlow)\"/>\n      </g>\n",
  gasBoiler: "\n<defs>\n        <linearGradient id=\"bodyGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#f8fbff\"/>\n          <stop offset=\".24\" stop-color=\"#eef2f7\"/>\n          <stop offset=\".58\" stop-color=\"#d7dde7\"/>\n          <stop offset=\"1\" stop-color=\"#c3cbd7\"/>\n        </linearGradient>\n        <linearGradient id=\"bodySide\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#cdd5e0\"/>\n          <stop offset=\".5\" stop-color=\"#eef4fb\"/>\n          <stop offset=\"1\" stop-color=\"#b6c0ce\"/>\n        </linearGradient>\n        <linearGradient id=\"metalGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#2b3748\"/>\n          <stop offset=\".3\" stop-color=\"#7f92ab\"/>\n          <stop offset=\".55\" stop-color=\"#e4edf8\"/>\n          <stop offset=\"1\" stop-color=\"#253344\"/>\n        </linearGradient>\n        <linearGradient id=\"darkScreen\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#07101b\"/>\n          <stop offset=\"1\" stop-color=\"#02070f\"/>\n        </linearGradient>\n        <linearGradient id=\"screenReflect\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#ffffff\" stop-opacity=\".15\"/>\n          <stop offset=\"1\" stop-color=\"#ffffff\" stop-opacity=\"0\"/>\n        </linearGradient>\n        <linearGradient id=\"flameOuter\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#90f5ff\"/>\n          <stop offset=\".45\" stop-color=\"#19b8ff\"/>\n          <stop offset=\"1\" stop-color=\"#0056ff\"/>\n        </linearGradient>\n        <linearGradient id=\"flameInner\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#e9ffff\"/>\n          <stop offset=\"1\" stop-color=\"#3fd7ff\"/>\n        </linearGradient>\n        <filter id=\"blueGlow\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"160%\"><feGaussianBlur stdDeviation=\"10\"/></filter>\n        <filter id=\"softGlow\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"160%\"><feGaussianBlur stdDeviation=\"5\"/></filter>\n      </defs>\n\n      <g id=\"aura\">\n        <path id=\"gasAuraOutline\" d=\"M230 92 H874 Q940 92 940 158 V1138 Q940 1204 874 1204 H230 Q164 1204 164 1138 V158 Q164 92 230 92 Z\" fill=\"none\" stroke=\"#2ca7ff\" stroke-opacity=\"0.12\" stroke-width=\"18\" filter=\"url(#blueGlow)\"/>\n      </g>\n\n      <g id=\"flueTop\">\n        <rect x=\"495\" y=\"52\" width=\"136\" height=\"58\" rx=\"18\" fill=\"url(#metalGrad)\" stroke=\"#d4ebff\" stroke-width=\"4\"/>\n        <rect x=\"516\" y=\"28\" width=\"94\" height=\"36\" rx=\"12\" fill=\"url(#metalGrad)\" stroke=\"#d4ebff\" stroke-width=\"3\"/>\n      </g>\n\n      <g id=\"boilerBody\">\n        <path d=\"M230 92 H874 Q940 92 940 158 V1138 Q940 1204 874 1204 H230 Q164 1204 164 1138 V158 Q164 92 230 92 Z\" fill=\"url(#bodyGrad)\" stroke=\"#f8fbff\" stroke-width=\"4\"/>\n        <path d=\"M180 154 Q180 106 228 106 H252 V1136 H228 Q180 1136 180 1088 Z\" fill=\"#f0f5fa\" opacity=\".72\"/>\n        <path d=\"M884 106 H904 Q924 106 932 122 Q940 138 940 164 V1128 Q940 1182 894 1194 L884 1196 Z\" fill=\"#bfc9d6\" opacity=\".72\"/>\n        <path d=\"M260 116 C352 108 680 104 848 120\" fill=\"none\" stroke=\"#ffffff\" stroke-opacity=\".42\" stroke-width=\"6\" stroke-linecap=\"round\"/>\n        <path d=\"M364 130 L620 858\" stroke=\"#ffffff\" stroke-opacity=\".18\" stroke-width=\"5\"/>\n        <line x1=\"164\" y1=\"988\" x2=\"940\" y2=\"988\" stroke=\"#8093ac\" stroke-opacity=\".5\" stroke-width=\"4\"/>\n      </g>\n\n      <g id=\"frontIcon\" transform=\"translate(-60 0)\" opacity=\"0.90\">\n        <g id=\"frontIconGlow\" opacity=\"0.32\">\n          <path d=\"M584 560 C578 606 566 642 546 674 C522 712 516 746 528 776 C544 816 578 838 620 834 C668 830 706 794 708 746 C710 706 690 674 658 634 C632 602 608 576 584 560 Z\" fill=\"#1fa6ff\" filter=\"url(#blueGlow)\"/>\n        </g>\n        <path d=\"M584 560 C578 606 566 642 546 674 C522 712 516 746 528 776 C544 816 578 838 620 834 C668 830 706 794 708 746 C710 706 690 674 658 634 C632 602 608 576 584 560 Z\" fill=\"url(#flameOuter)\" stroke=\"#88f5ff\" stroke-width=\"4\"/>\n        <path d=\"M592 600 C590 632 580 658 564 684 C546 712 544 738 554 760 C566 788 590 802 620 800 C652 798 678 772 680 744 C682 716 668 692 646 664 C628 642 610 620 592 600 Z\" fill=\"url(#flameInner)\" opacity=\".96\"/>\n        <path d=\"M586 658 C574 684 572 712 578 736 C586 716 598 694 614 678 C604 668 594 662 586 658 Z\" fill=\"#ffffff\" opacity=\".72\"/>\n      </g>\n\n      <g id=\"displayFrame\">\n        <rect x=\"428\" y=\"1040\" width=\"292\" height=\"114\" rx=\"18\" fill=\"#d9e4ef\" stroke=\"#4d627b\" stroke-width=\"3\"/>\n        <rect x=\"440\" y=\"1052\" width=\"268\" height=\"90\" rx=\"14\" fill=\"url(#darkScreen)\" stroke=\"#1eb5ff\" stroke-opacity=\".6\" stroke-width=\"2.6\"/>\n        <path d=\"M448 1060 H570 L548 1140 H448 Z\" fill=\"url(#screenReflect)\"/>\n\n        <line x1=\"528\" y1=\"1062\" x2=\"528\" y2=\"1132\" stroke=\"#13344e\" stroke-opacity=\".85\" stroke-width=\"2\"/>\n        <line x1=\"620\" y1=\"1062\" x2=\"620\" y2=\"1132\" stroke=\"#13344e\" stroke-opacity=\".85\" stroke-width=\"2\"/>\n\n        <g id=\"gasBarsGroup\">\n          <rect id=\"barLevel4\" x=\"456\" y=\"1068\" width=\"58\" height=\"10\" rx=\"5\" fill=\"#ff3434\" opacity=\"0.16\"/>\n          <rect id=\"barLevel3\" x=\"464\" y=\"1086\" width=\"50\" height=\"10\" rx=\"5\" fill=\"#ff982a\" opacity=\"0.16\"/>\n          <rect id=\"barLevel2\" x=\"472\" y=\"1104\" width=\"42\" height=\"10\" rx=\"5\" fill=\"#59d44e\" opacity=\"1\"/>\n          <rect id=\"barLevel1\" x=\"480\" y=\"1122\" width=\"34\" height=\"10\" rx=\"5\" fill=\"#31a8ff\" opacity=\"1\"/>\n        </g>\n\n        <g id=\"displayFlameGroup\" transform=\"translate(575 1132) scale(0.2857) translate(-596 -1154)\" opacity=\"1\">\n          <g id=\"displayFlameGlow\" opacity=\"0.27\">\n            <path d=\"M575 1122 C572 1110 572 1097 575 1082 C579 1062 587 1044 596 1028 C605 1044 613 1062 617 1082 C620 1097 620 1110 617 1122 C613 1138 605 1150 596 1154 C587 1150 579 1138 575 1122 Z\" fill=\"#18a8ff\" filter=\"url(#softGlow)\"/>\n          </g>\n          <path id=\"displayFlameOuter\" d=\"M575 1122 C572 1110 572 1097 575 1082 C579 1062 587 1044 596 1028 C605 1044 613 1062 617 1082 C620 1097 620 1110 617 1122 C613 1138 605 1150 596 1154 C587 1150 579 1138 575 1122 Z\" fill=\"url(#flameOuter)\"/>\n          <path id=\"displayFlameInner\" d=\"M581 1120 C579 1111 579 1100 581 1088 C584 1072 590 1058 596 1046 C602 1058 608 1072 611 1088 C613 1100 613 1111 611 1120 C608 1132 602 1141 596 1144 C590 1141 584 1132 581 1120 Z\" fill=\"url(#flameInner)\" opacity=\".94\"/>\n          <path d=\"M588 1099 C588 1087 591 1076 596 1066 C594 1081 594 1093 595 1104 C592 1102 590 1100 588 1099 Z\" fill=\"#ffffff\" opacity=\".62\"/>\n        </g>\n\n        <g id=\"tempGroup\">\n          <text x=\"640\" y=\"1080\" font-size=\"11\" fill=\"#76caff\" font-family=\"monospace\">TEMP</text>\n          <text id=\"tempValueDisplay\" x=\"640\" y=\"1124\" font-size=\"34\" fill=\"#eff9ff\" font-family=\"monospace\" font-weight=\"700\">65.0°</text>\n          <text x=\"694\" y=\"1122\" font-size=\"16\" fill=\"#7fd2ff\" font-family=\"monospace\">C</text>\n        </g>\n      </g>\n\n      <g id=\"bottomConnectors\">\n        <g transform=\"translate(296 1214)\">\n          <rect x=\"0\" y=\"0\" width=\"64\" height=\"74\" rx=\"10\" fill=\"url(#metalGrad)\" stroke=\"#d4ebff\" stroke-width=\"3\"/>\n          <rect x=\"8\" y=\"60\" width=\"48\" height=\"12\" rx=\"4\" fill=\"#1fb4ff\" opacity=\".7\" filter=\"url(#softGlow)\"/>\n        </g>\n        <g transform=\"translate(680 1214)\">\n          <rect x=\"0\" y=\"0\" width=\"64\" height=\"74\" rx=\"10\" fill=\"url(#metalGrad)\" stroke=\"#d4ebff\" stroke-width=\"3\"/>\n          <rect x=\"8\" y=\"60\" width=\"48\" height=\"12\" rx=\"4\" fill=\"#1fb4ff\" opacity=\".7\" filter=\"url(#softGlow)\"/>\n        </g>\n      </g>\n",
  electricBoiler: "\n<defs>\n        <linearGradient id=\"bodyGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#f8fbff\"/>\n          <stop offset=\".24\" stop-color=\"#eef2f7\"/>\n          <stop offset=\".58\" stop-color=\"#d7dde7\"/>\n          <stop offset=\"1\" stop-color=\"#bcc7d5\"/>\n        </linearGradient>\n        <linearGradient id=\"bodyShade\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#d5dde8\"/>\n          <stop offset=\".5\" stop-color=\"#ffffff\"/>\n          <stop offset=\"1\" stop-color=\"#bac4d4\"/>\n        </linearGradient>\n        <linearGradient id=\"panelDark\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#111b2b\"/>\n          <stop offset=\"1\" stop-color=\"#060d16\"/>\n        </linearGradient>\n        <linearGradient id=\"metalGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#283546\"/>\n          <stop offset=\".25\" stop-color=\"#7c90ab\"/>\n          <stop offset=\".55\" stop-color=\"#f0f6ff\"/>\n          <stop offset=\"1\" stop-color=\"#2a3648\"/>\n        </linearGradient>\n        <linearGradient id=\"waterDropOuter\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#7ff7ff\"/>\n          <stop offset=\".4\" stop-color=\"#19b4ff\"/>\n          <stop offset=\"1\" stop-color=\"#0a4eff\"/>\n        </linearGradient>\n        <linearGradient id=\"waterDropInner\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#eefcff\"/>\n          <stop offset=\"1\" stop-color=\"#57d8ff\"/>\n        </linearGradient>\n        <linearGradient id=\"lightningGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#fff4a9\"/>\n          <stop offset=\".4\" stop-color=\"#ffd233\"/>\n          <stop offset=\"1\" stop-color=\"#ff9f00\"/>\n        </linearGradient>\n        <linearGradient id=\"ringHeat\" gradientUnits=\"userSpaceOnUse\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#ff3b1f\"/>\n          <stop offset=\".55\" stop-color=\"#ffb000\"/>\n          <stop offset=\"1\" stop-color=\"#ffe66a\"/>\n        </linearGradient>\n        <filter id=\"blueGlow\" x=\"-40%\" y=\"-40%\" width=\"180%\" height=\"180%\"><feGaussianBlur stdDeviation=\"12\"/></filter>\n        <filter id=\"softGlow\" x=\"-40%\" y=\"-40%\" width=\"180%\" height=\"180%\"><feGaussianBlur stdDeviation=\"6\"/></filter>\n        <filter id=\"warmGlow\" x=\"-40%\" y=\"-40%\" width=\"180%\" height=\"180%\"><feGaussianBlur stdDeviation=\"10\"/></filter>\n      </defs>\n\n      <g id=\"aura\">\n        <path d=\"M236 132 H848 Q926 132 926 210 V1244 Q926 1322 848 1322 H236 Q158 1322 158 1244 V210 Q158 132 236 132 Z\" fill=\"none\" stroke=\"#28a6ff\" stroke-opacity=\".25\" stroke-width=\"20\" filter=\"url(#blueGlow)\"/>\n      </g>\n\n      <g id=\"bodyGroup\">\n        <path id=\"bodyShape\" d=\"M236 132 H848 Q926 132 926 210 V1244 Q926 1322 848 1322 H236 Q158 1322 158 1244 V210 Q158 132 236 132 Z\" fill=\"url(#bodyGrad)\" stroke=\"#f6fbff\" stroke-width=\"4\"/>\n        <path d=\"M176 220 Q176 160 232 160 H264 V1260 H230 Q176 1260 176 1206 Z\" fill=\"#ffffff\" opacity=\".42\"/>\n        <path d=\"M842 160 H876 Q906 160 918 180 Q930 200 930 232 V1228 Q930 1284 880 1300 L842 1308 Z\" fill=\"#b7c3d4\" opacity=\".55\"/>\n        <path d=\"M250 160 C390 148 670 146 834 162\" stroke=\"#ffffff\" stroke-opacity=\".46\" stroke-width=\"7\" fill=\"none\" stroke-linecap=\"round\"/>\n        <path d=\"M368 162 L626 938\" stroke=\"#ffffff\" stroke-opacity=\".16\" stroke-width=\"6\"/>\n        <line x1=\"158\" y1=\"1018\" x2=\"926\" y2=\"1018\" stroke=\"#6e8098\" stroke-opacity=\".55\" stroke-width=\"4\"/>\n      </g>\n\n      <g id=\"lightningGroup\" transform=\"translate(-5 -30)\">\n        <path id=\"lightningGlow\" d=\"M575 468 L639 468 L607 576 L692 576 L544 786 L582 642 L488 642 Z\" fill=\"#ffcb34\" opacity=\"0.25\" filter=\"url(#warmGlow)\"/>\n        <path id=\"lightningBolt\" d=\"M575 468 L639 468 L607 576 L692 576 L544 786 L582 642 L488 642 Z\" fill=\"url(#lightningGrad)\" stroke=\"#fff3b8\" stroke-width=\"3\"/>\n      </g>\n\n      <g id=\"controlPanelGroup\">\n        <rect id=\"controlPanelFrame\" x=\"372\" y=\"780\" width=\"376\" height=\"332\" rx=\"28\" fill=\"#dce6ef\" stroke=\"#51657e\" stroke-width=\"3\"/>\n        <rect id=\"controlPanelInner\" x=\"388\" y=\"796\" width=\"344\" height=\"300\" rx=\"24\" fill=\"url(#panelDark)\" stroke=\"#6fd4ff\" stroke-opacity=\".55\" stroke-width=\"2.6\"/>\n        <path d=\"M400 806 H560 L520 1090 H400 Z\" fill=\"#ffffff\" opacity=\".10\"/>\n\n        <g id=\"powerDisplayGroup\">\n          <rect id=\"powerDisplayFrame\" x=\"448\" y=\"820\" width=\"224\" height=\"58\" rx=\"12\" fill=\"#0a1321\" stroke=\"#67c9ff\" stroke-opacity=\".45\" stroke-width=\"2\"/>\n          <text x=\"470\" y=\"844\" font-size=\"12\" fill=\"#75c9ff\" font-family=\"monospace\">POWER DRAW</text>\n          <text id=\"powerKwDisplay\" x=\"470\" y=\"868\" font-size=\"30\" fill=\"#eef9ff\" font-family=\"monospace\" font-weight=\"700\">3.20 kW</text>\n        </g>\n\n        <g id=\"ringGroup\">\n          <circle id=\"ringBg\" cx=\"560\" cy=\"960\" r=\"62\" fill=\"none\" stroke=\"#203043\" stroke-width=\"16\" stroke-linecap=\"round\" transform=\"rotate(-218.4 560 960)\" stroke-dasharray=\"281.35 389.56\"/>\n          <g id=\"powerRing\"></g>\n          <g id=\"tickMarks\" opacity=\".55\"></g>\n          <circle id=\"knobOuter\" cx=\"560\" cy=\"960\" r=\"48\" fill=\"#09111b\" stroke=\"#8dc8ff\" stroke-opacity=\".28\" stroke-width=\"3\"/>\n          <circle id=\"knobInner\" cx=\"560\" cy=\"960\" r=\"38\" fill=\"url(#metalGrad)\" stroke=\"#243548\" stroke-width=\"3\"/>\n          <path id=\"knobIndicator\" d=\"M560 960 L560 924\" stroke=\"#eaf8ff\" stroke-width=\"6\" stroke-linecap=\"round\" transform=\"rotate(0 560 960)\"/>\n          <circle id=\"knobHub\" cx=\"560\" cy=\"960\" r=\"9\" fill=\"#20354d\"/>\n          <text id=\"powerPercentText\" x=\"560\" y=\"968\" font-size=\"19\" fill=\"#d6f2ff\" font-family=\"monospace\" font-weight=\"700\" text-anchor=\"middle\">40%</text>\n        </g>\n\n        <g id=\"waterDisplayGroup\">\n          <rect id=\"waterDisplayFrame\" x=\"430\" y=\"1036\" width=\"260\" height=\"46\" rx=\"12\" fill=\"#0a1321\" stroke=\"#67c9ff\" stroke-opacity=\".45\" stroke-width=\"2\"/>\n<text x=\"526\" y=\"1048\" font-size=\"11\" fill=\"#75c9ff\" font-family=\"monospace\">WATER TEMP</text>\n          <text id=\"waterTempDisplay\" x=\"560\" y=\"1074\" font-size=\"28\" fill=\"#eef9ff\" font-family=\"monospace\" font-weight=\"700\" text-anchor=\"middle\">52.0°C</text>\n        </g>\n      </g>\n\n      <g id=\"connectorsGroup\">\n        <g id=\"leftConnector\" transform=\"translate(340 1320)\">\n          <rect x=\"0\" y=\"0\" width=\"70\" height=\"90\" rx=\"12\" fill=\"url(#metalGrad)\" stroke=\"#d4ebff\" stroke-width=\"3\"/>\n          <rect x=\"10\" y=\"74\" width=\"50\" height=\"12\" rx=\"4\" fill=\"#1fb4ff\" opacity=\".7\" filter=\"url(#softGlow)\"/>\n        </g>\n        <g id=\"rightConnector\" transform=\"translate(686 1320)\">\n          <rect x=\"0\" y=\"0\" width=\"76\" height=\"100\" rx=\"12\" fill=\"#b88b33\" stroke=\"#ffe3a4\" stroke-width=\"3\"/>\n          <rect x=\"10\" y=\"82\" width=\"56\" height=\"12\" rx=\"4\" fill=\"#1fb4ff\" opacity=\".7\" filter=\"url(#softGlow)\"/>\n        </g>\n      </g>\n",
  fireplace: "\n<defs>\n        <linearGradient id=\"bodyGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#3a424d\"/>\n          <stop offset=\".18\" stop-color=\"#212933\"/>\n          <stop offset=\".48\" stop-color=\"#0b121a\"/>\n          <stop offset=\".76\" stop-color=\"#111923\"/>\n          <stop offset=\"1\" stop-color=\"#2f3742\"/>\n        </linearGradient>\n        <linearGradient id=\"bodySideGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#2b3440\"/>\n          <stop offset=\".22\" stop-color=\"#0f151d\"/>\n          <stop offset=\".5\" stop-color=\"#0a1017\"/>\n          <stop offset=\".78\" stop-color=\"#151d27\"/>\n          <stop offset=\"1\" stop-color=\"#303946\"/>\n        </linearGradient>\n        <linearGradient id=\"metalGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#5e6872\"/>\n          <stop offset=\".18\" stop-color=\"#9ca4ad\"/>\n          <stop offset=\".5\" stop-color=\"#2e3742\"/>\n          <stop offset=\".82\" stop-color=\"#0b1118\"/>\n          <stop offset=\"1\" stop-color=\"#3d4650\"/>\n        </linearGradient>\n        <linearGradient id=\"glassGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#404654\" stop-opacity=\".76\"/>\n          <stop offset=\".3\" stop-color=\"#1a2028\" stop-opacity=\".60\"/>\n          <stop offset=\".72\" stop-color=\"#090d12\" stop-opacity=\".84\"/>\n          <stop offset=\"1\" stop-color=\"#030507\" stop-opacity=\".95\"/>\n        </linearGradient>\n        <linearGradient id=\"displayGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#08131f\"/>\n          <stop offset=\"1\" stop-color=\"#02070d\"/>\n        </linearGradient>\n        <linearGradient id=\"screenShine\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#ffffff\" stop-opacity=\".10\"/>\n          <stop offset=\".6\" stop-color=\"#ffffff\" stop-opacity=\"0\"/>\n          <stop offset=\"1\" stop-color=\"#ffffff\" stop-opacity=\".04\"/>\n        </linearGradient>\n        <filter id=\"blueGlow\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\"><feGaussianBlur stdDeviation=\"10\"/></filter>\n        <filter id=\"softGlow\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\"><feGaussianBlur stdDeviation=\"6\"/></filter>\n      <clipPath id=\"fireClip\"><rect x=\"400\" y=\"448\" width=\"400\" height=\"420\" rx=\"12\"/></clipPath></defs>\n\n      <g id=\"auraGroup\">\n        <path d=\"M350 162 H850 Q906 162 906 218 V1096 Q906 1154 850 1154 H350 Q294 1154 294 1096 V218 Q294 162 350 162 Z\" fill=\"none\" stroke=\"#2aa6ff\" stroke-opacity=\".28\" stroke-width=\"18\" filter=\"url(#blueGlow)\"/>\n        <ellipse cx=\"600\" cy=\"1172\" rx=\"330\" ry=\"34\" fill=\"#1f6dff\" fill-opacity=\".22\" filter=\"url(#blueGlow)\"/>\n      </g>\n\n      <g id=\"chimneyGroup\">\n        <rect x=\"512\" y=\"52\" width=\"176\" height=\"152\" rx=\"18\" fill=\"url(#bodySideGrad)\" stroke=\"#aeb7c1\" stroke-opacity=\".26\" stroke-width=\"3\"/>\n        <path d=\"M522 58 H678\" stroke=\"#45b9ff\" stroke-width=\"5\" stroke-linecap=\"round\" opacity=\".92\" filter=\"url(#softGlow)\"/>\n        <rect x=\"492\" y=\"202\" width=\"216\" height=\"26\" rx=\"10\" fill=\"#060a0f\" opacity=\".95\"/>\n      </g>\n\n      <g id=\"topCapGroup\">\n        <path d=\"M346 184 H854 L908 210 V286 H292 V210 Z\" fill=\"url(#metalGrad)\" stroke=\"#c2cad3\" stroke-opacity=\".28\" stroke-width=\"3\"/>\n        <path d=\"M354 190 H846\" stroke=\"#48b8ff\" stroke-width=\"4\" stroke-linecap=\"round\" opacity=\".92\" filter=\"url(#softGlow)\"/>\n        <path d=\"M344 282 H856\" stroke=\"#070c12\" stroke-width=\"10\" opacity=\".78\"/>\n      </g>\n\n      <g id=\"bodyGroup\">\n        <path d=\"M354 252 H846 Q900 252 900 306 V1092 Q900 1144 846 1144 H354 Q300 1144 300 1092 V306 Q300 252 354 252 Z\" fill=\"url(#bodyGrad)\" stroke=\"#c1c8d0\" stroke-opacity=\".25\" stroke-width=\"3\"/>\n        <path d=\"M326 304 V1080\" stroke=\"#3d4857\" stroke-opacity=\".26\" stroke-width=\"2\"/>\n        <path d=\"M874 304 V1080\" stroke=\"#0d131c\" stroke-opacity=\".44\" stroke-width=\"2\"/>\n        <path d=\"M318 312 C338 280 356 268 380 266 H820 C858 266 882 284 892 308\" fill=\"none\" stroke=\"#0e151d\" stroke-width=\"10\" opacity=\".64\"/>\n      </g>\n\n      <g id=\"displayGroup\">\n        <rect x=\"528\" y=\"298\" width=\"212\" height=\"68\" rx=\"12\" fill=\"#181d24\" stroke=\"#9ca6b3\" stroke-opacity=\".28\" stroke-width=\"3\"/>\n        <rect x=\"536\" y=\"306\" width=\"196\" height=\"52\" rx=\"10\" fill=\"url(#displayGrad)\" stroke=\"#44b8ff\" stroke-opacity=\".56\" stroke-width=\"2\"/>\n        <text x=\"556\" y=\"326\" font-size=\"11\" font-family=\"monospace\" fill=\"#73ddff\">STOVE TEMP</text>\n        <text id=\"stoveTempDisplay\" x=\"556\" y=\"350\" font-size=\"30\" font-family=\"monospace\" font-weight=\"700\" fill=\"#eef8ff\">65.0°C</text>\n        <g id=\"displayBars\" transform=\"translate(666 316)\">\n          <rect x=\"0\" y=\"18\" width=\"10\" height=\"14\" rx=\"2\" fill=\"#19b8ff\" id=\"displayBar1\" opacity=\".22\"/>\n          <rect x=\"18\" y=\"10\" width=\"10\" height=\"22\" rx=\"2\" fill=\"#28c0ff\" id=\"displayBar2\" opacity=\".22\"/>\n          <rect x=\"36\" y=\"2\" width=\"10\" height=\"30\" rx=\"2\" fill=\"#55d4ff\" id=\"displayBar3\" opacity=\".22\"/>\n          <circle cx=\"70\" cy=\"8\" r=\"3\" fill=\"#44b8ff\"/>\n          <circle cx=\"70\" cy=\"22\" r=\"3\" fill=\"#2875c9\"/>\n        </g>\n      </g>\n\n      <g id=\"windowOuterGroup\">\n        <rect x=\"346\" y=\"394\" width=\"508\" height=\"528\" rx=\"44\" fill=\"#0c1218\" stroke=\"#5d6771\" stroke-width=\"4\"/>\n        <rect x=\"376\" y=\"424\" width=\"448\" height=\"468\" rx=\"30\" fill=\"#060a0d\" stroke=\"#1a222c\" stroke-width=\"4\"/>\n        <rect x=\"400\" y=\"448\" width=\"400\" height=\"420\" rx=\"12\" fill=\"url(#glassGrad)\" stroke=\"#5d1f09\" stroke-opacity=\".20\" stroke-width=\"3\"/>\n        <g id=\"combustionSlot\"></g>\n        <rect x=\"392\" y=\"440\" width=\"416\" height=\"436\" rx=\"16\" fill=\"none\" stroke=\"#1a2129\" stroke-width=\"12\"/>\n        <path d=\"M430 464 H612 L472 860 H430 Z\" fill=\"#ffffff\" opacity=\".10\"/>\n        <path d=\"M676 458 C730 516 754 580 760 652\" fill=\"none\" stroke=\"#ffffff\" stroke-opacity=\".05\" stroke-width=\"18\" stroke-linecap=\"round\"/>\n        <path d=\"M414 460 H786\" stroke=\"#8a2d0d\" stroke-opacity=\".22\" stroke-width=\"4\" stroke-linecap=\"round\"/>\n      </g>\n\n      <g id=\"doorHandleGroup\">\n        <rect x=\"844\" y=\"596\" width=\"14\" height=\"114\" rx=\"7\" fill=\"#090d12\" opacity=\".88\"/>\n        <rect x=\"858\" y=\"584\" width=\"32\" height=\"174\" rx=\"10\" fill=\"url(#metalGrad)\" stroke=\"#d4dce6\" stroke-opacity=\".26\" stroke-width=\"2\"/>\n      </g>\n\n      <g id=\"baseGroup\">\n        <path d=\"M316 1102 H884 L902 1120 V1224 Q902 1238 888 1238 H312 Q298 1238 298 1224 V1120 Z\" fill=\"url(#bodySideGrad)\" stroke=\"#aab3be\" stroke-opacity=\".22\" stroke-width=\"3\"/>\n        <path d=\"M360 1238 H474 L456 1198 H378 Z\" fill=\"#02060a\"/>\n        <path d=\"M726 1238 H840 L824 1198 H744 Z\" fill=\"#02060a\"/>\n      </g>\n"
});


/* Modern wood / coal boiler adapted from the user's stove SVG v3.
 * Animation uses Warmwasser-style ss-fire and ss-embers keyframes (MIT LICENSE).
 * Pure SVG visualization; no Home Assistant control services.
 */
const HASSStudioSolidFuel=(()=>{
  // Editable artwork: src/icons/solid-fuel-stove.svg
  const clamp=(v,a,b,d)=>Number.isFinite(Number(v))?Math.max(a,Math.min(b,Number(v))):d;
  const safe=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const temperature=HASSStudioHA.temperature;
  const resolveState=HASSStudioAnimation.combustion;
  // Geometry and three nested paths follow the original Warmwasser flame renderer.
  const flame=(x,y,w,ht,speed)=>{
    const d=(r,h)=>'M'+(-r)+' 0C'+(-r-2)+' '+(-h*.45)+' '+(-r*.15)+' '+(-h*.6)+' '+(r*.1)+' '+(-h)+
      'C'+(r*.5)+' '+(-h*.6)+' '+(r+2)+' '+(-h*.4)+' '+r+' 0Z';
    return '<g transform="translate('+x+' '+y+')"><g class="ss-fire" style="animation-duration:'+speed+'s">'+
      '<path d="'+d(w,ht)+'" fill="#e4461f"/><path d="'+d(w*.70,ht*.76)+'" fill="#ff9320"/>'+
      '<path d="'+d(w*.36,ht*.46)+'" fill="#ffdb6a"/></g></g>';
  };
  const wood=live=>'<g class="ss-wood-fuel">'+
    '<rect x="448" y="753" width="118" height="22" rx="8" fill="#402a1e" stroke="'+(live?'#ba5828':'#604431')+'" stroke-width="3" transform="rotate(-10 506 764)"/>'+
    '<path d="M458 771Q502 757 556 758" stroke="#b88752" stroke-width="2" opacity=".65" fill="none"/>'+
    '<rect x="463" y="770" width="112" height="21" rx="9" fill="#503225" stroke="'+(live?'#bf5e30':'#624635')+'" stroke-width="2" transform="rotate(9 518 780)"/>'+
    '<path d="M482 774Q509 784 561 777" stroke="#d39b67" opacity=".46" stroke-width="2" fill="none"/>'+
    '<ellipse cx="472" cy="777" rx="8" ry="10" fill="#8d6341" stroke="#2a1a17" stroke-width="2"/>'+
    '<ellipse cx="472" cy="777" rx="3" ry="5" fill="none" stroke="#432b22" stroke-width="2"/></g>';
  const coal=live=>'<g class="ss-coal-fuel">'+[[443,781],[478,766],[512,781],[546,764]].map(([x,y],i)=>
    '<path d="M'+x+' '+y+'l'+(i%2?10:13)+' -19l18 5l12 15l-6 16l-28 -2Z" fill="#222733" stroke="'+(live?'#d77c3a':'#555d69')+'" stroke-width="2"/>'+
    (live?'<path d="M'+(x+9)+' '+(y-10)+'l8 8l12 -1" stroke="#ff7438" stroke-width="2.2" fill="none"/>':'')).join('')+'</g>';
  const combustion=(fuel,mode,intensity)=>{
    const live=mode!=='off',burn=mode==='burning';
    const flamePaths=!burn?'':fuel==='wood'?
      flame(466,764,16,99,.98)+flame(506,761,20,131,1.13)+flame(550,761,17,109,.86):
      flame(471,767,12,59,1.05)+flame(520,769,13,81,1.22)+flame(552,769,10,61,.97);
    return '<g class="ss-solid-combustion" data-fuel="'+fuel+'" data-state="'+mode+'" clip-path="url(#solidFireClip)">'+
      (live?'<rect x="420" y="586" width="180" height="210" fill="#7d2617" opacity="'+(intensity*.16).toFixed(2)+'"/>':'')+
      flamePaths+(live?'<g class="ss-embers" style="animation-duration:2.1s">'+
      '<ellipse cx="511" cy="780" rx="79" ry="18" fill="#e44725" opacity="'+(.28+intensity*.35).toFixed(2)+'"/>'+
      '<path d="M443 781Q484 789 513 780Q553 784 580 777" fill="none" stroke="#ff9e3c" stroke-width="3" opacity=".85"/></g>':
      '<ellipse cx="511" cy="791" rx="79" ry="10" fill="#aaa2a0" opacity=".18"/>')+
      (fuel==='coal'?coal(live):wood(live))+'</g>';
  };
  const render=(node,h)=>{
    const fuel=node.solid_fuel==='coal'?'coal':'wood',mode=resolveState(node,h);
    const reading=temperature(h,node.entity),t=reading===null?null:clamp(reading,20,95,20);
    const level=t===null?0:(t-20)/75,arc=t===null?0:(52+level*172),hue=120-level*92;
    const intensity=clamp(node.solid_glow,0,100,78)/100;
    const prefix='sssolid'+String(node.id||'').replace(/[^a-z0-9]/gi,'').slice(0,24);
    const svg = HASSStudioSvg.namespaceIds(
      HASSStudioSvg.inject(
        HASSStudioSvg.apply(HASSStudioIconTemplates.solidFuel, {
          tempValue: { text: reading === null ? '—' : reading.toFixed(1) + '°' },
          fuelLabel: { text: fuel === 'wood' ? 'DREWNO' : 'WĘGIEL' },
          dialArc: {
            stroke: reading === null ? '#586779' : 'hsl(' + hue.toFixed(1) + ' 90% 48%)',
            'stroke-dasharray': arc.toFixed(1) + ' 240'
          }
        }),
        { combustionSlot: combustion(fuel, mode, intensity) }
      ),
      prefix
    );
    const sx=clamp(node.width_scale,.5,2.4,1),sy=clamp(node.height_scale,.5,2.4,1);
    // Independent width/height are applied only to this SVG. The outer node's
    // proportional scale still multiplies both axes in the Custom canvas.
    return '<g class="ss-solid-boiler" data-combustion="'+mode+'">'+
      '<g class="ss-solid-boiler-dimensions" transform="translate(66 53) scale('+sx+' '+sy+') translate(-60 -43)">'+
      '<g transform="translate(22 -104) scale(.2 .2) translate(-232 -84)">'+svg+'</g></g></g>';
  };
  const styles='<style>@media(prefers-reduced-motion:reduce){.ss-solid-boiler .ss-fire,.ss-solid-boiler .ss-embers{animation:none!important}}</style>';
  return {render,styles,resolveState,combustion,temperature,flame};
})();


/* Modern pellet stove: equipment artwork from the user's piec_pellet_svg_js_v1.
 * Combustion states, flames and CSS animations reuse Warmwasser via SolidFuel.
 * Read-only SVG rendering: no Home Assistant service calls.
 */
const HASSStudioPellet = (() => {
  // Source artwork: src/icons/pellet-stove.svg
  const clamp=(v,min,max,def)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):def;
  const escapeHtml=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const baseBounds={x:4,y:-110,width:186,height:312,labelY:220,centerX:97,centerY:46};
  const geometry=n=>{
    const sx=clamp(n?.width_scale,.5,2.4,1),sy=clamp(n?.height_scale,.5,2.4,1);
    return {x:baseBounds.centerX+(baseBounds.x-baseBounds.centerX)*sx,
      y:baseBounds.centerY+(baseBounds.y-baseBounds.centerY)*sy,
      width:baseBounds.width*sx,height:baseBounds.height*sy,
      labelY:baseBounds.centerY+(baseBounds.labelY-baseBounds.centerY)*sy,
      centerX:baseBounds.centerX,centerY:baseBounds.centerY,
      sx,sy};
  };
  const pellets=(live,glow)=>'<g class="ss-pellet-fuel">'+
    Array.from({length:22},(_,i)=>{
      const x=268+(i%11)*12,y=743+Math.floor(i/11)*8+(i%3)*1.5;
      return '<rect x="'+x+'" y="'+y+'" width="9" height="5" rx="2.1" transform="rotate('+(i%3===0?-17:i%3===1?12:3)+' '+(x+4)+' '+(y+2)+')" fill="'+
        (live?(i%4===0?'#ed8e45':'#b67d4e'):'#74614a')+'" stroke="'+(live?'#7f3b20':'#433a31')+'" stroke-width=".7"/>';
    }).join('')+'</g>';
  const combustion=(mode,glow)=>{
    const active=mode!=='off',burning=mode==='burning';
    const f=HASSStudioSolidFuel.flame;
    // The original Warmwasser flame layers and flicker are scaled for a pellet burner.
    const fire=burning?f(294,750,13,67,.9)+f(335,751,16,92,1.13)+f(378,749,13,75,.83):'';
    const embers=active?'<g class="ss-embers" style="animation-duration:2s">'+
      '<ellipse cx="336" cy="752" rx="75" ry="14" fill="#e9481f" opacity="'+(.27+.39*glow).toFixed(2)+'"/>'+
      '<path d="M267 750Q294 746 326 753Q370 747 404 750" fill="none" stroke="#ffaf49" stroke-width="2.8" opacity=".85"/></g>':
      '<ellipse cx="336" cy="756" rx="69" ry="8" fill="#7d7e82" opacity=".17"/>';
    return '<g class="ss-pellet-combustion" data-state="'+mode+'" clip-path="url(#pelletBurnerClip)">'+
      (active?'<rect x="244" y="562" width="184" height="236" fill="#a53a18" opacity="'+(.08+glow*.16).toFixed(2)+'"/>':'')+
      fire+embers+pellets(active,glow)+'</g>';
  };
  const render=(node,hass)=>{
    const mode=HASSStudioSolidFuel.resolveState(node,hass);
    const actual=HASSStudioSolidFuel.temperature(hass,node.entity);
    const t=actual===null?null:clamp(actual,20,90,20),amount=t===null?0:(t-20)/70;
    const arc=t===null?0:(46+amount*118),hue=118-amount*95;
    const glow=clamp(node.solid_glow,0,100,76)/100;
    const prefix='sspellet'+String(node.id||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,24);
    const image = HASSStudioSvg.namespaceIds(
      HASSStudioSvg.inject(
        HASSStudioSvg.apply(HASSStudioIconTemplates.pellet, {
          tempValue: { text: actual === null ? '—' : actual.toFixed(1) + '°' },
          statusArc: {
            stroke: actual === null ? '#586779' : 'hsl(' + hue.toFixed(1) + ' 88% 48%)',
            'stroke-dasharray': arc.toFixed(1) + ' 176'
          }
        }), { combustionSlot: combustion(mode, glow) }
      ), prefix
    );
    const {sx,sy}=geometry(node);
    return '<g class="ss-modern-pellet" data-combustion="'+mode+'">'+
      '<g class="ss-pellet-dimensions" transform="translate(97 46) scale('+sx+' '+sy+') translate(-97 -46)">'+
      '<g transform="translate(12 -84) scale(.2 .2) translate(-84 -82)">'+image+'</g></g></g>';
  };
  const styles='<style>@media(prefers-reduced-motion:reduce){.ss-modern-pellet .ss-fire,.ss-modern-pellet .ss-embers{animation:none!important}}</style>';
  return {render,styles,geometry,combustion};
})();


/* Modern heat pump: read-only SVG model adapted from uploaded pompa_ciepla_svg_js.html.
 * Inputs: electrical power entity (W / kW); fan entity (% / rpm).
 * No polling, external assets, HA service calls, setInterval or requestAnimationFrame.
 */
const HASSStudioHeatPump = (()=>{
  // Source artwork: src/icons/heat-pump-stove.svg
  const clamp=(v,lo,hi,fallback)=>Number.isFinite(Number(v))?Math.max(lo,Math.min(hi,Number(v))):fallback;
  const finiteReading=HASSStudioHA.reading;
  const power=HASSStudioHA.powerKw;
  const fan=(h,id,maxRpm=1800)=>{
    const reading=finiteReading(h,id);
    if(!reading||reading.value<0)return null;
    if(reading.unit==='%'||reading.unit==='percent'){
      const pct=clamp(reading.value,0,100,0);
      return {percent:pct,label:Math.round(pct)+'%',unit:'%'};
    }
    if(reading.unit.toLowerCase()==='rpm'||reading.unit==='obr/min'){
      const max=clamp(maxRpm,100,20000,1800);
      return {percent:clamp(reading.value/max*100,0,100,0),label:Math.round(reading.value)+' RPM',unit:'rpm'};
    }
    return null;
  };
  const geometry=(n)=>{
    const sx=clamp(n?.width_scale,.5,2.4,1),sy=clamp(n?.height_scale,.5,2.4,1);
    // Body (not invisible SVG canvas) from input source: x=86..1168, y=152..910.
    const base={x:21.76,y:-50.68,width:173.12,height:121.28,labelY:91.5};
    const cx=108.32,cy=9.96;
    return {x:cx+(base.x-cx)*sx,y:cy+(base.y-cy)*sy,
      width:base.width*sx,height:base.height*sy,
      labelY:cy+(base.labelY-cy)*sy,centerX:cx,centerY:cy,sx,sy};
  };
  const render=(node,hass)=>{
    const kw=power(hass,node.hp_power_entity);
    const speed=fan(hass,node.hp_fan_entity,node.hp_max_rpm);
    const pct=speed?.percent??0, powered=pct>0;
    const kwLabel=kw===null?'—':(kw>=10?kw.toFixed(1):kw.toFixed(2))+' kW';
    const percentLabel=speed===null?'—':speed.label;
    // CSS is driven only by the current sensor state; no hidden perpetual animation loop.
    const duration=(18-16.7*Math.sqrt(pct/100)).toFixed(2)+'s';
    const rotorStyle=powered?'animation-duration:'+duration+';':'animation:none;';
    const intensity=clamp(node.hp_glow,0,100,65)/100;
    const glow=(powered?.08+intensity*.26:.06).toFixed(2);
    const aura=(powered?.08+intensity*.18:.05).toFixed(2);
    const sx=geometry(node).sx,sy=geometry(node).sy;
    // The prefix prevents collisions between multiple SVG instances on a single HA dashboard.
    const prefix='sshp'+String(node.id||'heatpump').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,28);
    const image = HASSStudioSvg.namespaceIds(
      HASSStudioSvg.apply(HASSStudioIconTemplates.heatPump, {
        hpAuraOutline: { 'stroke-opacity': aura },
        fanGlowRing: { 'stroke-opacity': glow },
        bladeRotor: { class: powered ? 'ss-hp-rotating' : 'ss-hp-still', style: rotorStyle },
        powerValueDisplay: { text: kwLabel },
        fanSpeedDisplay: { text: percentLabel },
        fanSpeedBar: { width: (206 * pct / 100).toFixed(1) }
      }), prefix
    );
    return '<g class="ss-modern-heat-pump" data-fan="'+(speed===null?'unknown':pct.toFixed(1))+'" data-power="'+(kw===null?'unknown':kw.toFixed(2))+'">'+
      '<g class="ss-hp-dimensions" transform="translate(108.32 9.96) scale('+sx+' '+sy+') translate(-108.32 -9.96)">'+
      '<g transform="translate(45 -45) scale(.1 .1)">'+image+'</g></g></g>';
  };
  const styles='<style>'+
    '@keyframes ssHPSpin{to{transform:rotate(360deg)}}'+
    '.ss-hp-rotating{animation-name:ssHPSpin;animation-timing-function:linear;animation-iteration-count:infinite;transform-box:fill-box;transform-origin:center}'+
    '@media(prefers-reduced-motion:reduce){.ss-modern-heat-pump .ss-hp-rotating{animation:none!important}}'+
    '</style>';
  return {render,styles,geometry,power,fan};
})();


/* Modern gas boiler using the SVG supplied in piec_gazowy_svg_js(1).html.
 * Read-only HA view: measured temperature and gas burner modulation (%).
 * No background timer, HA service action or speculative gas consumption values.
 */
const HASSStudioGasBoiler=(()=>{
  // Geometry is edited in src/icons/gas-boiler.svg; values are supplied by HA.

  const clamp=(v,min,max,def)=>typeof v!=='boolean'&&v!=null&&v!==''&&Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):def;
  const reading=HASSStudioHA.reading;
  const temperature=HASSStudioHA.temperature;
  const modulation=(h,e)=>HASSStudioHA.percentage(h,e,true);
  const burnerEnabled=(h,e)=>!e||HASSStudioHA.active(h,e,['burning']);
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
    const bindings = {
      gasAuraOutline: { 'stroke-opacity': aura },
      frontIcon: { opacity: frontOpacity },
      frontIconGlow: { opacity: frontGlow },
      displayFlameGroup: {
        transform: flameTransform,
        opacity: active ? '1' : '0'
      },
      displayFlameGlow: { opacity: gasGlow },
      tempValueDisplay: { text: t === null ? '—' : t.toFixed(1) + '°' }
    };
    for (let level = 1; level <= 4; level++) {
      bindings['barLevel' + level] = {
        opacity: active && percent > (level - 1) * 25 ? '1' : '0.16'
      };
    }
    const image = HASSStudioSvg.namespaceIds(
      HASSStudioSvg.apply(HASSStudioIconTemplates.gasBoiler, bindings),
      namespace
    );
    const {sx,sy}=geometry(node);
    return '<g class="ss-modern-gas-boiler" data-modulation="'+(measured===null?'unknown':measured.toFixed(1))+
      '" data-burning="'+(active?'on':'off')+'">'+
      '<g class="ss-gas-dimensions" transform="translate(66 56) scale('+sx+' '+sy+') translate(-66 -56)">'+
      '<g transform="translate(14 -104) scale(.2 .2) translate(-164 -28)">'+image+'</g></g></g>';
  };
  const styles='';
  return {render,styles,temperature,modulation,burnerEnabled,geometry};
})();


/* Modern electric boiler based on supplied piec_elektryczny_svg_js.html.
 * Three HA measurements: power (W / kW), water temperature (°C / °F),
 * optional electrical load percent. No control actions, no polling.
 */
const HASSStudioElectricBoiler=(()=>{
  // Source artwork: src/icons/electric-boiler.svg
  const clamp=(v,min,max,otherwise)=>v!==''&&v!=null&&typeof v!=='boolean'&&Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):otherwise;
  const read=HASSStudioHA.reading;
  const power=HASSStudioHA.powerKw;
  const temperature=HASSStudioHA.temperature;
  const load=(h,node)=>{
    if(node.electric_load_entity){
      const r=read(h,node.electric_load_entity);
      return r&&['','%','percent'].includes(r.unit)&&r.value>=0&&r.value<=100?r.value:null;
    }
    const kw=power(h,node.electric_power_entity);
    const rated=clamp(node.electric_max_kw,.1,100,8);
    return kw===null?null:clamp(kw/rated*100,0,100,0);
  };
  const geometry=node=>{
    const sx=clamp(node?.width_scale,.5,2.4,1),sy=clamp(node?.height_scale,.5,2.4,1);
    // Actual rendered steel shell bounds, not the demo SVG's generous viewBox.
    const centerX=70,centerY=55,baseX=20,baseY=-102;
    const baseWidth=100,baseHeight=330;
    return {x:centerX+(baseX-centerX)*sx,y:centerY+(baseY-centerY)*sy,
      width:baseWidth*sx,height:baseHeight*sy,
      labelY:centerY+(244-centerY)*sy,readingY:centerY+(255-centerY)*sy,
      centerX,centerY,sx,sy};
  };
  const palette=p=>{
    const values=[[0,[255,59,31]],[.55,[255,176,0]],[1,[255,230,106]]];
    const t=clamp(p,0,1,0),k=t<=.55?1:2,a=values[k-1],b=values[k];
    const alpha=(t-a[0])/(b[0]-a[0]);
    return '#'+a[1].map((v,i)=>Math.round(v+(b[1][i]-v)*alpha).toString(16).padStart(2,'0')).join('');
  };
  const ringSegments=value=>{
    if(value===null||value<=0)return '';
    // Segment by arc length, so the gradient follows the circular ring itself.
    // Preserve source ring-only -34% rotation; do not rotate the knob or ticks.
    const start=-218.4*Math.PI/180,sweep=260*Math.PI/180,r=62,cx=560,cy=960;
    const steps=Math.ceil(100*value/100);
    let markup='';
    for(let i=0;i<steps;i++){
      const a=start+sweep*i/100,b=start+sweep*Math.min(i+1,value)/100;
      if(b<=a)break;
      const point=q=>(cx+r*Math.cos(q)).toFixed(3)+' '+(cy+r*Math.sin(q)).toFixed(3);
      markup+='<path d="M'+point(a)+' A62 62 0 0 1 '+point(b)+'" stroke="'+palette((i+.5)/100)+
        '" stroke-width="16" stroke-linecap="butt" fill="none"/>';
    }
    return markup;
  };
  const ticks=()=>{
    let markup='';
    for(let i=0;i<20;i++){
      const angle=(-130+260*i/19)*Math.PI/180;
      const c=Math.cos(angle),s=Math.sin(angle);
      const x1=(560+72*c).toFixed(2),y1=(960+72*s).toFixed(2);
      const x2=(560+82*c).toFixed(2),y2=(960+82*s).toFixed(2);
      markup+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+
        '" stroke="#7acfff" stroke-opacity="'+(i%5===0?'.62':'.26')+
        '" stroke-width="'+(i%5===0?'3':'2')+'" stroke-linecap="round"/>';
    }
    return markup;
  };
  const TICKS=ticks();
  const render=(node,h)=>{
    const kw=power(h,node.electric_power_entity);
    const t=temperature(h,node.entity);
    const percent=load(h,node);
    const glow=clamp(node.electric_glow,0,100,60)/100;
    const active=percent!==null&&percent>0;
    const scale=geometry(node),knob=-130+260*(percent??0)/100;
    const namespace='sselectric'+String(node.id||'electric').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,25);
    const body = HASSStudioSvg.namespaceIds(
      HASSStudioSvg.inject(
        HASSStudioSvg.apply(HASSStudioIconTemplates.electricBoiler, {
          lightningGlow: { opacity: active ? (.10 + glow * .34).toFixed(2) : '0.03' },
          powerKwDisplay: { text: kw === null ? '—' : kw.toFixed(2) + ' kW' },
          knobIndicator: { transform: 'rotate(' + knob.toFixed(2) + ' 560 960)' },
          powerPercentText: { text: percent === null ? '—' : Math.round(percent) + '%' },
          waterTempDisplay: { text: t === null ? '—' : t.toFixed(1) + '°C' }
        }), { powerRing: ringSegments(percent), tickMarks: TICKS }
      ), namespace
    );
    return '<g class="ss-modern-electric-boiler" data-load="'+(percent===null?'unknown':percent.toFixed(1))+
      '" data-power="'+(kw===null?'unknown':kw.toFixed(2))+'">'+
      '<g class="ss-electric-dimensions" transform="translate(70 55) scale('+scale.sx+' '+scale.sy+') translate(-70 -55)">'+
      '<g transform="translate(20 -102) scale(.13 .255) translate(-158 -132)">'+body+'</g></g></g>';
  };
  return {render,geometry,power,temperature,load,ringSegments,palette};
})();


/* Modern fireplace: SVG from uploaded kominek_svg_js.html.
 * Fire and ember motion use original Warmwasser animation classes.
 * Read-only HA temperature and combustion-state visualization.
 */
const HASSStudioFireplace=(()=>{
  // Editable artwork: src/icons/fireplace.svg
  const clamp=(v,min,max,d)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):d;
  const geometry=n=>{
    const sx=clamp(n?.width_scale,.5,2.4,1),sy=clamp(n?.height_scale,.5,2.4,1);
    const cx=80,cy=57;
    return {x:cx+(39-cx)*sx,y:cy+(-105-cy)*sy,width:82*sx,height:315*sy,
      centerX:cx,centerY:cy,labelY:cy+(230-cy)*sy,readingY:cy+(244-cy)*sy,sx,sy};
  };
  const logs=(active)=>'<g class="ss-fireplace-wood">'+
    '<rect x="447" y="790" width="282" height="33" rx="13" fill="#38261e" stroke="'+(active?'#d67e3b':'#7b4e31')+'" stroke-width="7" transform="rotate(-11 588 806)"/>'+
    '<rect x="476" y="810" width="263" height="28" rx="12" fill="#463022" stroke="#a56e46" stroke-width="5" transform="rotate(10 610 824)"/>'+
    '<path d="M464 815Q544 789 703 801" fill="none" stroke="#c48d5e" opacity=".48" stroke-width="4"/></g>';
  const combustion=(mode,glow)=>{
    const live=mode!=='off',burning=mode==='burning';
    const f=HASSStudioSolidFuel.flame;
    const fire=burning?f(484,806,43,175,.98)+f(593,814,56,259,1.12)+f(716,814,44,198,.85):'';
    const embers=live?'<g class="ss-embers" style="animation-duration:2s">'+
      '<ellipse cx="600" cy="823" rx="164" ry="22" fill="#ed4d22" opacity="'+(.3+.35*glow).toFixed(2)+'"/>'+
      '<path d="M447 821Q516 835 592 822Q673 814 753 823" stroke="#ffbc55" stroke-width="7" fill="none"/></g>':
      '<ellipse cx="600" cy="831" rx="150" ry="13" fill="#aaa" opacity=".09"/>';
    return '<g class="ss-fireplace-combustion" data-state="'+mode+'" clip-path="url(#fireClip)">'+
      (live?'<rect x="400" y="448" width="400" height="420" fill="#ad3014" opacity="'+(.05+.13*glow).toFixed(2)+'"/>':'')+
      fire+embers+logs(live)+'</g>';
  };
  const render=(node,h)=>{
    const mode=HASSStudioSolidFuel.resolveState(node,h);
    const temp=HASSStudioSolidFuel.temperature(h,node.entity);
    const glow=clamp(node.solid_glow,0,100,62)/100;
    const bars=temp===null?0:Math.min(3,Math.max(0,Math.ceil((temp-20)/30)));
    const glowOpacity=(.10+.35*glow).toFixed(2);
    const id='ssfireplace'+String(node.id||'').replace(/[^a-z0-9_-]/gi,'').slice(0,24);
    const barBindings = {};
    for (let level = 1; level <= 3; level++) {
      barBindings['displayBar' + level] = { opacity: level <= bars ? '1' : '.22' };
    }
    const svg = HASSStudioSvg.namespaceIds(
      HASSStudioSvg.inject(
        HASSStudioSvg.apply(HASSStudioIconTemplates.fireplace, {
          stoveTempDisplay: { text: temp === null ? '—' : temp.toFixed(1) + '°C' },
          ...barBindings
        }), { combustionSlot: combustion(mode, glow) }
      ), id
    );
    const bounds=geometry(node);
    return '<g class="ss-modern-fireplace" data-combustion="'+mode+'">'+
      '<g class="ss-fireplace-dimensions" transform="translate(80 57) scale('+bounds.sx+' '+bounds.sy+') translate(-120 -30)">'+
      '<g transform="translate(0 -115) scale(.2 .2)">'+svg+'</g></g></g>';
  };
  const styles='<style>@media(prefers-reduced-motion:reduce){.ss-modern-fireplace .ss-fire,.ss-modern-fireplace .ss-embers{animation:none!important}}</style>';
  return {render,styles,combustion,geometry};
})();


/* Home Assistant Systems Studio — central device registry.
 * Saved configurations keep the existing node.type and node.variant fields.
 * Device families and catalog categories are metadata, not a migration.
 */
const HASSStudioDeviceRegistry = (() => {
  const categories = Object.freeze({
    heat_sources: {pl:'Źródła ciepła',en:'Heat sources'},
    tanks: {pl:'Zbiorniki',en:'Tanks'},
    solar: {pl:'Solary',en:'Solar thermal'},
    hydraulics: {pl:'Pompy i zawory',en:'Pumps and valves'},
    measurements: {pl:'Czujniki',en:'Sensors'},
    connections: {pl:'Rury i połączenia',en:'Pipes and connections'}
  });
  // Common logical identity, independent from the selected drawing.
  const families = Object.freeze({
    solid_fuel_boiler:{category:'heat_sources',pl:'Kocioł na drewno / węgiel',en:'Wood / coal boiler',fuels:['wood','coal'],entities:['entity','burner_entity'],animations:['combustion']},
    pellet_boiler:{category:'heat_sources',pl:'Kocioł na pellet',en:'Pellet boiler',entities:['entity','burner_entity'],animations:['combustion']},
    gas_boiler:{category:'heat_sources',pl:'Kocioł gazowy',en:'Gas boiler',entities:['entity','burner_entity','gas_draw_entity'],animations:['burner']},
    electric_boiler:{category:'heat_sources',pl:'Kocioł elektryczny',en:'Electric boiler',entities:['entity','electric_power_entity','electric_load_entity'],animations:['heating']},
    oil_boiler:{category:'heat_sources',pl:'Kocioł olejowy',en:'Oil boiler',entities:['entity','burner_entity'],animations:['burner']},
    heat_pump:{category:'heat_sources',pl:'Pompa ciepła',en:'Heat pump',entities:['entity','hp_power_entity','hp_fan_entity'],animations:['fan']},
    fireplace:{category:'heat_sources',pl:'Kominek',en:'Fireplace',entities:['entity','burner_entity'],animations:['combustion']},
    tank:{category:'tanks',pl:'Zbiornik',en:'Tank',entities:['entity'],animations:['coil_flow','heater_glow'],parts:['sensor','heater','coil','baffle_horizontal','baffle_vertical','inner_tank']},
    solar_collector:{category:'solar',pl:'Kolektor solarny',en:'Solar collector',entities:['entity','pump_entity','tank_entity'],animations:['solar_activity']},
    pump:{category:'hydraulics',pl:'Pompa',en:'Pump',entities:['entity'],animations:['running']},
    valve:{category:'hydraulics',pl:'Zawór',en:'Valve',entities:['entity'],animations:[]},
    sensor:{category:'measurements',pl:'Czujnik',en:'Sensor',entities:['entity'],animations:[]},
    pipe:{category:'connections',pl:'Rura',en:'Pipe',entities:['flow_entity'],animations:['flow']}
  });

  // Do not change order, names or ids: these are stored in existing HA layouts.
  // Each entry: [legacy variant, logical family, Polish, English, renderer, SVG].
  const legacy = Object.freeze({
    boiler:{icon:'♨',variants:[
      ['wood','solid_fuel_boiler','Drewno','Wood','warmwasser'],
      ['solid_fuel','solid_fuel_boiler','Węgiel / drewno (nowoczesny)','Modern solid-fuel boiler','solidFuel','solid-fuel-stove.svg'],
      ['pellet','pellet_boiler','Pellet','Pellet','warmwasser'],
      ['pellet_modern','pellet_boiler','Pellet (nowoczesny)','Modern pellet boiler','pellet','pellet-stove.svg'],
      ['heatpump_modern','heat_pump','Pompa ciepła (nowoczesna)','Modern heat pump','heatPump','heat-pump-stove.svg'],
      ['gas','gas_boiler','Gaz','Gas','warmwasser'],
      ['gas_modern','gas_boiler','Gazowy (nowoczesny)','Modern gas boiler','gasBoiler','gas-boiler.svg'],
      ['oil','oil_boiler','Olej','Oil','warmwasser'],
      ['electric','electric_boiler','Elektryczny','Electric','warmwasser'],
      ['electric_modern','electric_boiler','Elektryczny (nowoczesny)','Modern electric boiler','electricBoiler','electric-boiler.svg'],
      ['heatpump','heat_pump','Pompa ciepła','Heat pump','warmwasser'],
      ['fireplace_modern','fireplace','Kominek (nowoczesny)','Modern fireplace','fireplace','fireplace.svg']
    ]},
    tank:{icon:'▤',variants:[
      ['modular','tank','Modułowy','Modular','modularTank'],
      ['stratified','tank','Warstwowy','Stratified','warmwasser'],
      ['buffer','tank','Bufor','Buffer','warmwasser'],
      ['coil','tank','Jedna wężownica','Single coil','warmwasser'],
      ['dual_coil','tank','Dwie wężownice','Dual coil','warmwasser'],
      ['hygiene','tank','Higieniczny','Hygienic','warmwasser'],
      ['combi','tank','Kombi','Combi','warmwasser']
    ]},
    solar:{icon:'☼',variants:[
      ['flat','solar_collector','Płaskie','Flat plate','warmwasser'],
      ['tube','solar_collector','Próżniowe','Vacuum tubes','warmwasser']
    ]},
    pump:{icon:'◉',variants:[['circulation','pump','Obiegowa','Circulation','warmwasser'],['inline','pump','Przelotowa','Inline','warmwasser']]},
    valve:{icon:'◇',variants:[['two_way','valve','Dwudrogowy','Two-way','warmwasser'],['three_way','valve','Trójdrogowy','Three-way','warmwasser']]},
    sensor:{icon:'♧',variants:[['temperature','sensor','Temperatura','Temperature','warmwasser'],['pressure','sensor','Ciśnienie','Pressure','warmwasser']]},
    pipe:{icon:'〰',variants:[]}
  });
  const types = Object.freeze(Object.keys(legacy));
  const variantMap = new Map();
  for (const type of types) {
    const entries = legacy[type].variants.map(([id,family,pl,en,renderer,svg]) =>
      Object.freeze({id,family,label:Object.freeze({pl,en}),renderer,svg:svg||null}));
    for (const variant of entries) {
      if (!families[variant.family] || variantMap.has(type+':'+variant.id))
        throw new Error('Invalid device variant: '+type+':'+variant.id);
      variantMap.set(type+':'+variant.id,variant);
    }
  }
  const listTypes = () => types;
  const variantsFor = type => legacy[type]
    ? legacy[type].variants.map(entry => variantMap.get(type+':'+entry[0])) : [];
  const isNodeType = type => variantsFor(type).length>0;
  const isVariant = (type,id) => variantMap.has(type+':'+id);
  const defaultVariant = type => variantsFor(type)[0]?.id || null;
  const normalizeVariant = (type,id) => isVariant(type,id)?id:defaultVariant(type);
  const iconFor = type => legacy[type]?.icon || '';
  const variantOptions = (type,lang='pl') => variantsFor(type)
    .map(item => [item.id,item.label[lang==='en'?'en':'pl']]);
  const resolve = (type,variant) => {
    const graphic=variantMap.get(type+':'+variant);
    return graphic ? Object.freeze({...graphic,type,category:families[graphic.family].category,device:families[graphic.family]}):null;
  };
  // Curated choices for the left library. Each entry creates a supported
  // legacy node/pipe variant; no new device data format is introduced.
  // A family appears once when its alternatives are only graphic styles.
  const libraryPresets = Object.freeze([
    ['boiler','solid_fuel','solid_fuels'],
    ['boiler','pellet_modern','solid_fuels'],
    ['boiler','gas_modern'],
    ['boiler','electric_modern'],
    ['boiler','oil'],
    ['boiler','heatpump_modern'],
    ['boiler','fireplace_modern'],
    ['tank','modular'],
    ['solar','flat'],
    ['pump','circulation'],
    ['pump','inline'],
    ['valve','two_way'],
    ['valve','three_way'],
    ['sensor','temperature'],
    ['sensor','pressure'],
    ['pipe',null]
  ]);
  const subgroups = Object.freeze({
    solid_fuels: Object.freeze({pl:'Kotły na paliwo stałe',en:'Solid-fuel boilers'})
  });
  const presetNames = Object.freeze({
    'pump:circulation':{pl:'Pompa obiegowa',en:'Circulation pump'},
    'pump:inline':{pl:'Pompa przelotowa',en:'Inline pump'},
    'valve:two_way':{pl:'Zawór dwudrogowy',en:'Two-way valve'},
    'valve:three_way':{pl:'Zawór trójdrogowy',en:'Three-way valve'},
    'sensor:temperature':{pl:'Czujnik temperatury',en:'Temperature sensor'},
    'sensor:pressure':{pl:'Czujnik ciśnienia',en:'Pressure sensor'}
  });
  const libraryEntries = (lang='pl') => libraryPresets.map(([type,variant,subgroup]) => {
    const choice=variant===null
      ? {type,family:'pipe',category:'connections',device:families.pipe}
      : resolve(type,variant);
    if(!choice) throw new Error('Missing library device: '+type+':'+variant);
    const language=lang==='en'?'en':'pl';
    const label=presetNames[type+':'+variant]?.[language] || families[choice.family]?.[language]
      || choice.device[language];
    return Object.freeze({
      type,variant,category:choice.category,family:choice.family||'pipe',
      subgroup:subgroup||null,label,icon:iconFor(type)
    });
  });
  const variantOptionsForNode = (node, lang='pl') => {
    const device=resolve(node?.type,node?.variant);
    return device
      ? variantsFor(node.type).filter(entry=>entry.family===device.family)
          .map(entry=>[entry.id,entry.label[lang==='en'?'en':'pl']])
      : variantOptions(node?.type,lang);
  };
  const catalog = (lang='pl') => Object.keys(families).map(id => Object.freeze({
    id,category:families[id].category,label:families[id][lang==='en'?'en':'pl'],
    variants:types.flatMap(type => variantsFor(type).filter(item=>item.family===id).map(item=>item.id))
  }));
  return Object.freeze({categories,families,listTypes,variantsFor,isNodeType,
    isVariant,defaultVariant,normalizeVariant,iconFor,variantOptions,variantOptionsForNode,
    resolve,catalog,subgroups,libraryEntries});
})();


/* Schema normalization for existing custom layouts. Keeps saved IDs and fields. */
const HASSStudioLayout = (() => {
  const W=1200,H=720,MAX_NODES=60,MAX_PIPES=80;
  const registry=HASSStudioDeviceRegistry;
  const colors={hot:'#ed835a',cold:'#57a6db',solar:'#e5b35e',return:'#778cbe'};
  const clamp=(n,lo,hi,fallback)=>Number.isFinite(Number(n))?Math.max(lo,Math.min(hi,Number(n))):fallback;
  const validEntity=(value)=>typeof value==='string' && isEnt(value);
  const freshId=(prefix)=>prefix+Math.random().toString(36).slice(2,10);
  const normalizeItem=(item)=>({
    id:String(item.id||freshId('i')).slice(0,32),
    kind:['sensor','heater','coil','baffle_horizontal','baffle_vertical','inner_tank'].includes(item.kind)?item.kind:'sensor',
    variant:['warmwasser','compact','extended'].includes(item.variant)?item.variant:'warmwasser',
    label:String(item.label||'').slice(0,64),
    side:['left','right','inside'].includes(item.side)?item.side:'left',
    height:clamp(item.height,0,100,50),
    display_scale:clamp(item.display_scale,0.5,2,1),
    entity:validEntity(item.entity)?item.entity:'',
    power_entity:validEntity(item.power_entity)?item.power_entity:'',
    x:clamp(item.x,0,100,50),length:clamp(item.length,15,95,58),
    width:clamp(item.width,10,95,60),turns:clamp(item.turns,3,22,12),
    power:clamp(item.power,0,100,75),mode:['auto','on','off'].includes(item.mode)?item.mode:'auto',
    flow_mode:['auto','on','off'].includes(item.flow_mode)?item.flow_mode:'auto',
    flow_direction:item.flow_direction==='reverse'?'reverse':'forward',
    flow_speed:clamp(item.flow_speed,.35,5,1),
    container:item.container==='inner'?'inner':'main',
    permeability:clamp(item.permeability,0,1,.35)
  });
  const normalizeAccessory=(item)=>({
    id:String(item.id||freshId('a')).slice(0,32),
    type:item.type==='valve'?'valve':'pump',
    label:String(item.label||'').slice(0,64),
    position:clamp(item.position,0,100,50),
    entity:validEntity(item.entity)?item.entity:''
  });
  const normalized=(config)=>{
    const source=config?.studio_layout||{};
    const nodes=(Array.isArray(source.nodes)?source.nodes:[]).filter(v=>v && registry.isNodeType(v.type) &&
      typeof v.id==='string').slice(0,MAX_NODES).map(v=>({
      id:v.id.slice(0,32),type:v.type,
      x:clamp(v.x,0,W-120,40),y:clamp(v.y,0,H-140,40),
      scale:clamp(v.scale,0.5,2.4,1),
      scale_mode:v.type==='tank' && v.variant==='modular' && v.scale_mode==='free'?'free':'proportional',
      width_scale:clamp(v.width_scale,0.5,2.4,1),height_scale:clamp(v.height_scale,0.5,2.4,1),
      // Use uniform scale for both full render and interactive drag.
      burner_entity:validEntity(v.burner_entity)?v.burner_entity:'',
      burner_mode:['auto','on','off'].includes(v.burner_mode)?v.burner_mode:'auto',
      solid_fuel:v.solid_fuel==='coal'?'coal':'wood',
      solid_state:['auto','burning','embers','off'].includes(v.solid_state)?v.solid_state:'auto',
      solid_glow:clamp(v.solid_glow,0,100,78),
      hp_power_entity:validEntity(v.hp_power_entity)?v.hp_power_entity:'',hp_fan_entity:validEntity(v.hp_fan_entity)?v.hp_fan_entity:'',
      hp_max_rpm:clamp(v.hp_max_rpm,100,20000,1800),hp_glow:clamp(v.hp_glow,0,100,65),
      gas_draw_entity:validEntity(v.gas_draw_entity)?v.gas_draw_entity:'',gas_glow:clamp(v.gas_glow,0,100,62),
      electric_power_entity:validEntity(v.electric_power_entity)?v.electric_power_entity:'',
      electric_load_entity:validEntity(v.electric_load_entity)?v.electric_load_entity:'',
      electric_max_kw:clamp(v.electric_max_kw,.1,100,8),electric_glow:clamp(v.electric_glow,0,100,60),
      burner_on_temp:clamp(v.burner_on_temp,20,90,35),
      burner_off_temp:clamp(v.burner_off_temp,10,89,32),
      pump_entity:validEntity(v.pump_entity)?v.pump_entity:'',
      tank_entity:validEntity(v.tank_entity)?v.tank_entity:'',
      solar_on_delta:clamp(v.solar_on_delta,1,40,6),
      solar_off_delta:clamp(v.solar_off_delta,0,39,3),
      visual:v.visual==='studio'?'studio':'warmwasser',
      variant:registry.normalizeVariant(v.type,v.variant),
      label:String(v.label||'').slice(0,64),
      entity:validEntity(v.entity)?v.entity:'',
      entities:(Array.isArray(v.entities)?v.entities:[]).slice(0,20).map(e=>({
        entity:validEntity(e.entity)?e.entity:'',label:String(e.label||'').slice(0,64)})),
      parts:(Array.isArray(v.parts)?v.parts:[]).slice(0,40).map(normalizeItem)
    }));
    const pipes=(Array.isArray(source.pipes)?source.pipes:[]).slice(0,MAX_PIPES).map(v=>({
      id:String(v.id||freshId('p')).slice(0,32),
      label:String(v.label||'').slice(0,64),
      color:colors[v.color]?v.color:'hot',width:clamp(v.width,3,14,7),
      flow_mode:['auto','on','off'].includes(v.flow_mode)?v.flow_mode:'auto',
      flow_entity:validEntity(v.flow_entity)?v.flow_entity:'',
      flow_direction:v.flow_direction==='reverse'?'reverse':'forward',
      flow_speed:clamp(v.flow_speed,.35,5,1),cap_start:v.cap_start!==false,cap_end:v.cap_end!==false,
      cap_start:v.cap_start!==false,cap_end:v.cap_end!==false,
      points:(Array.isArray(v.points)?v.points:[]).slice(0,30).map(q=>({
        x:clamp(q.x,0,W,100),y:clamp(q.y,0,H,100)})),
      accessories:(Array.isArray(v.accessories)?v.accessories:[]).slice(0,20).map(normalizeAccessory)
    })).filter(v=>v.points.length>=2);
    // Preserve pipes created in the previous prototype when opening their layout.
    if(!Array.isArray(source.pipes) && Array.isArray(source.edges)){
      const byId=new Map(nodes.map(n=>[n.id,n]));
      const ports={left:[0,42],right:[112,42],top:[56,0],bottom:[56,84]};
      source.edges.slice(0,MAX_PIPES).forEach((edge,index)=>{
        const from=byId.get(edge?.from?.node),to=byId.get(edge?.to?.node);
        const a=ports[edge?.from?.port],b=ports[edge?.to?.port];
        if(!from||!to||!a||!b)return;
        const ax=from.x+a[0]*from.scale,ay=from.y+a[1]*from.scale;
        const bx=to.x+b[0]*to.scale,by=to.y+b[1]*to.scale;
        const mx=(ax+bx)/2;
        pipes.push({id:'migrated-'+index,label:'',color:colors[edge.color]?edge.color:'hot',
          width:7,flow_mode:'auto',flow_entity:'',flow_direction:'forward',flow_speed:1,cap_start:true,cap_end:true,
          points:[{x:ax,y:ay},{x:mx,y:ay},{x:mx,y:by},{x:bx,y:by}],accessories:[]});
      });
    }
    return {nodes,pipes};
  };

  return Object.freeze({normalized,normalizeItem,normalizeAccessory});
})();


/* Pure SVG diagram renderer for the Custom designer.
 * Input is normalized layout and read-only HA states; pointer interaction
 * remains in the editor controller. Existing SVG paths/styles are unchanged.
 */
const HASSStudioCanvas = (() => {
  const create = ({W,H,colors,normalized,pickLang,words,clamp,validEntity,esc}) => {
  const formatReading=(v)=>Number.isFinite(Number(v))&&String(v).trim()!==''?Number(v).toFixed(1):String(v);
  const valueOf=(h,entity)=>{
    const state=validEntity(entity)?h?.states?.[entity]:null;
    return state && !['unknown','unavailable'].includes(state.state)
      ?formatReading(state.state)+(state.attributes?.unit_of_measurement?' '+state.attributes.unit_of_measurement:''):'';
  };
  const pipePath=(points)=>points.map((point,i)=>(i?'L':'M')+point.x+' '+point.y).join(' ');
  const onPipe=(pipe,t)=>{
    const points=pipe.points, segments=[];
    let total=0;
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.y-a.y);
      segments.push(length);total+=length;
    }
    let remaining=total*clamp(t,0,100,50)/100;
    for(let i=1;i<points.length;i++){
      const length=segments[i-1];if(remaining<=length||i===points.length-1){
        const a=points[i-1],b=points[i],factor=length?remaining/length:0;
        return {x:a.x+(b.x-a.x)*factor,y:a.y+(b.y-a.y)*factor};
      }
      remaining-=length;
    }
    return points[0];
  };
  const variantShape=(node)=>{
    const v=node.variant;
    if(node.type==='tank'){
      let parts='<rect x="38" y="5" width="44" height="102" rx="17" fill="url(#ssTank)" stroke="#d3dfe6" stroke-width="2"/>';
      if(['coil','dual_coil','hygiene','combi'].includes(v))
        parts+='<path d="M46 60 Q73 49 73 62 Q73 71 46 75 Q41 81 68 86" fill="none" stroke="#f3c17c" stroke-width="3"/>';
      if(v==='dual_coil'||v==='combi')
        parts+='<path d="M46 23 Q73 15 73 29 Q73 39 46 43" fill="none" stroke="#f3c17c" stroke-width="3"/>';
      if(v==='stratified')parts+='<path d="M42 61H78" stroke="#dfebf2" stroke-opacity=".7" stroke-dasharray="4 3"/>';
      node.parts.forEach(part=>{
        const yy=101-(part.height/100)*93;
        const x=part.side==='left'?36:part.side==='right'?84:60;
        if(part.kind==='sensor')parts+='<circle cx="'+x+'" cy="'+yy+'" r="5" fill="#f4c078" stroke="#273b4c" stroke-width="1.6"/>';
        if(part.kind==='heater')parts+='<path d="M'+(x-10)+' '+yy+'h20m-16 -6v12m8 -12v12" stroke="#f8db92" stroke-width="3" fill="none"/>';
        if(part.kind==='coil')parts+='<path d="M'+(x-13)+' '+yy+'q7 -12 14 0t14 0" stroke="#f0cc93" stroke-width="3" fill="none"/>';
      });
      return parts;
    }
    if(node.type==='boiler'){
      let extra='';
      if(v==='wood'||v==='pellet')extra='<path d="M56 88Q39 74 59 49Q51 68 67 66Q84 83 56 88Z" fill="#ef8651"/>';
      if(v==='gas'||v==='oil')extra='<path d="M60 52Q39 77 61 88Q83 77 60 52Z" fill="#70b6ed"/>';
      if(v==='electric')extra='<path d="M64 48L48 74H59L53 92L78 64H64Z" fill="#f4c45f"/>';
      if(v==='heatpump')extra='<circle cx="60" cy="70" r="22" fill="none" stroke="#92c4e8" stroke-width="4"/><path d="M48 61L75 71L48 82Z" fill="#92c4e8"/>';
      return '<rect x="24" y="19" width="72" height="83" rx="8" fill="#465869" stroke="#b5c3ce" stroke-width="2"/>'+extra;
    }
    if(node.type==='solar')
      return v==='tube'
        ?'<g fill="#438eb9" stroke="#c4e4f5" stroke-width="2">'+[23,43,63,83].map(x=>'<rect x="'+x+'" y="30" width="13" height="68" rx="6"/>').join('')+'</g>'
        :'<path d="M25 27H100L85 100H10Z" fill="#337fac" stroke="#c4e4f5" stroke-width="2"/><path d="M44 27L30 100M67 27L54 100M88 27L76 100" stroke="#b7d5eb" stroke-width="2"/>';
    if(node.type==='pump')return '<circle cx="60" cy="65" r="30" fill="#425b71" stroke="#c3d1dc" stroke-width="2"/><path d="M48 44L81 65L48 86Z" fill="#e5edf5"/>';
    if(node.type==='valve')return '<path d="M13 42L60 66L13 90ZM107 42L60 66L107 90Z" fill="#527086" stroke="#b4c7d6" stroke-width="2"/>'+
      (v==='three_way'?'<path d="M39 104L60 66L81 104Z" fill="#527086" stroke="#b4c7d6" stroke-width="2"/>':'')+
      '<circle cx="60" cy="66" r="9" fill="#efc06e"/>';
    return '<circle cx="60" cy="64" r="28" fill="#47647a" stroke="#c0d2de" stroke-width="2"/>'+
      '<path d="M60 38V70" stroke="#ecf2f5" stroke-width="5"/><circle cx="60" cy="79" r="9" fill="#f2bb74"/>';
  };
  const symbolOnPipe=(item,pipe,hass,language)=>{
    const at=onPipe(pipe,item.position),isPump=item.type==='pump';
    const enabled=HASSStudioGraphics.on(hass,item.entity);
    const caption=esc(item.label||words[language][item.type]||item.type);
    return '<g transform="translate('+at.x+' '+at.y+')" class="ss-accessory" data-pipe="'+esc(pipe.id)+'"'+
      (item.entity?' data-more="'+esc(item.entity)+'"':'')+'>'+
      '<circle r="17" fill="#405669" stroke="'+(enabled?'#68c69b':'#d7e5ee')+'" stroke-width="2"/>'+ 
      (isPump&&enabled?'<circle class="ss-pump-pulse" r="17" fill="none" stroke="#68c69b"/>':'')+
      (isPump?'<path d="M-7 -10L10 0L-7 10Z" fill="#dceaf3"/>':
        '<path d="M-11 -8L0 0L-11 8ZM11 -8L0 0L11 8Z" fill="#e2c78d"/>')+
      '<text x="0" y="-25" text-anchor="middle" font-size="10.5" font-weight="600" fill="var(--primary-text-color,#e5edf5)" stroke="#252525" stroke-width="2" paint-order="stroke">'+caption+'</text>'+
      '</g>';
  };
  const canvasSvg=(config,hass,editable=false,selected=null)=>{
    const data=normalized(config),language=pickLang(config,hass),L=words[language];
    const wwDefs=data.nodes.filter(node=>node.visual==='warmwasser' && !(node.type==='tank'&&node.variant==='modular') && !(node.type==='boiler'&&['solid_fuel','pellet_modern','heatpump_modern','gas_modern','electric_modern','fireplace_modern'].includes(node.variant)))
      .map(node=>HASSStudioGraphics.defs(node,hass)).join('');
    const pipes=data.pipes.map(pipe=>{
      const d=pipePath(pipe.points),enabled=HASSStudioAnimation.flowActive(pipe.flow_mode,hass,pipe.flow_entity);
      const endcap=(first)=>{
        if(first&&pipe.cap_start===false||!first&&pipe.cap_end===false)return '';
        const pts=pipe.points,at=first?pts[0]:pts[pts.length-1],near=first?pts[1]:pts[pts.length-2];
        const angle=Math.atan2(at.y-near.y,at.x-near.x)*180/Math.PI;
        return '<g class="ss-cap" data-cap="'+(first?'start':'end')+'" transform="translate('+at.x+' '+at.y+') rotate('+angle+')">'+
          '<rect x="-6" y="-7" width="12" height="14" rx="2" fill="#7c8793" stroke="#b6c1cc"/></g>';
      };
      return '<g class="ss-pipe" data-id="'+esc(pipe.id)+'"><path class="ss-pipe-hit" d="'+d+'" stroke="transparent" stroke-width="24" fill="none"/>'+
        '<path class="ss-line" d="'+d+'" stroke="#142332" stroke-width="'+(pipe.width+3)+'" fill="none"/>'+
        '<path class="ss-line" d="'+d+'" stroke="'+colors[pipe.color]+'" stroke-width="'+pipe.width+'" fill="none"/>'+
        (enabled?'<path class="ss-line ss-flow" d="'+d+'" style="--ss-speed:'+pipe.flow_speed+'s;animation-direction:'+pipe.flow_direction+'"/>':'')+
        endcap(true)+endcap(false)+'</g>';
    }).join('');
    const accessories=data.pipes.map(pipe=>pipe.accessories.map(item=>symbolOnPipe(item,pipe,hass,language)).join('')).join('');
    const handles=editable&&selected?.type==='pipe'?data.pipes.filter(p=>p.id===selected.id).map(pipe=>pipe.points.map((pt,index)=>
      '<circle class="ss-handle" data-id="'+esc(pipe.id)+'" data-point="'+index+'" cx="'+pt.x+'" cy="'+pt.y+
      '" r="8" fill="#fff" stroke="#2196f3" stroke-width="2"/>').join('')).join(''):'';
    const nodes=data.nodes.map(node=>{
      const active=selected?.type==='node'&&selected.id===node.id;
      const reading=valueOf(hass,node.entity);
      const name=esc(node.label||L[node.type]||node.type);
      const ent=node.entity?' data-more="'+esc(node.entity)+'"':'';
      const solidBoiler=node.type==='boiler'&&node.variant==='solid_fuel';
      const modernPellet=node.type==='boiler'&&node.variant==='pellet_modern';
      const modernHP=node.type==='boiler'&&node.variant==='heatpump_modern';
      const modernGas=node.type==='boiler'&&node.variant==='gas_modern';
      const modernElectric=node.type==='boiler'&&node.variant==='electric_modern';
      const modernFireplace=node.type==='boiler'&&node.variant==='fireplace_modern';
      const tallBoiler=node.type==='boiler'&&(node.visual==='warmwasser'||solidBoiler||modernPellet);
      const freeTank=node.type==='tank'&&node.variant==='modular'&&node.scale_mode==='free';
      const sx=freeTank||solidBoiler?node.width_scale:1,sy=freeTank||solidBoiler?node.height_scale:1;
      // The solid boiler is stretched about (66,53) in its renderer. Keep
      // selection bounds and external label aligned with that transform.
      const outline=modernFireplace?HASSStudioFireplace.geometry(node):modernElectric?HASSStudioElectricBoiler.geometry(node):modernGas?HASSStudioGasBoiler.geometry(node):modernHP?HASSStudioHeatPump.geometry(node):modernPellet?HASSStudioPellet.geometry(node):
        solidBoiler?{x:66+(12-66)*sx,y:53+(-105-53)*sy,width:110*sx,height:318*sy,
          labelY:53+(230-53)*sy,readingY:53+(245-53)*sy}:
        tallBoiler?{x:12,y:-105,width:110,height:318,labelY:230,readingY:245}:
        freeTank?{x:60+(4-60)*sx,y:61+(3-61)*sy,width:112*sx,height:113*sy,
          labelY:61+(130-61)*sy,readingY:61+(145-61)*sy}:
        {x:4,y:3,width:112,height:113,labelY:130,readingY:145};
      return '<g class="ss-node" data-id="'+esc(node.id)+'"'+ent+' transform="translate('+node.x+' '+node.y+') scale('+node.scale+')">'+
        (node.type==='tank'&&node.variant==='modular'?HASSStudioTank.render(node,hass):node.type==='boiler'&&node.variant==='solid_fuel'?HASSStudioSolidFuel.render(node,hass):modernPellet?HASSStudioPellet.render(node,hass):modernHP?HASSStudioHeatPump.render(node,hass):modernGas?HASSStudioGasBoiler.render(node,hass):modernElectric?HASSStudioElectricBoiler.render(node,hass):modernFireplace?HASSStudioFireplace.render(node,hass):node.visual==='warmwasser'?HASSStudioGraphics.render(node,hass):variantShape(node))+
        (editable&&active?'<rect class="ss-selection" x="'+outline.x+'" y="'+outline.y+'" width="'+outline.width+'" height="'+outline.height+'" rx="8" fill="none" stroke="#52bfff" stroke-dasharray="5 4" stroke-width="1.6" pointer-events="none"/>':'')+
        '<text x="'+(modernPellet||modernHP||modernGas||modernElectric||modernFireplace?outline.centerX:60)+'" y="'+outline.labelY+'" text-anchor="middle" fill="var(--primary-text-color,#e5eef5)" font-size="12">'+name+'</text>'+
        (reading&&!tallBoiler?'<text x="60" y="'+outline.readingY+'" text-anchor="middle" font-size="11" fill="#7ed3ef">'+esc(reading)+'</text>':'')+
        '</g>';
    }).join('');
    return '<svg class="ss-svg'+(editable?' ss-svg-editor':'')+'" viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="System diagram">'+
      HASSStudioGraphics.styles+HASSStudioTank.styles+HASSStudioSolidFuel.styles+HASSStudioPellet.styles+HASSStudioHeatPump.styles+HASSStudioGasBoiler.styles+HASSStudioFireplace.styles+'<defs>'+wwDefs+'<linearGradient id="ssTank" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e7845c"/><stop offset="1" stop-color="#4a8dbd"/></linearGradient></defs>'+
      '<rect width="'+W+'" height="'+H+'" rx="10" fill="var(--secondary-background-color,#17222d)"/>'+
      '<g class="ss-devices">'+nodes+'</g><g class="ss-pipe-layer" stroke-linecap="round" stroke-linejoin="round">'+pipes+'</g><g class="ss-pump-layer">'+accessories+'</g><g class="ss-pipe-handles">'+handles+'</g></svg>';
  };

    return Object.freeze({canvasSvg,pipePath,onPipe,variantShape});
  };
  return Object.freeze({create});
})();


/* Dedicated right-hand device/pipe inspector, extracted without changing
 * existing properties or saved configuration fields. Event updates stay in
 * studio-custom.js for now; the panel only renders and wires HA suggestions.
 */
const HASSStudioEditorInspector = (() => {
  const create = ({editor, L, properties, esc, opts, registry, pickLang,
    get, selectedObject, getSelection, getSelectedPartId, variantShape}) => {
    const entityList=()=>{
      const states=editor._hass?.states||{};
      return Object.keys(states).sort().slice(0,2000).map(id=>
        '<option value="'+esc(id)+'" label="'+esc(states[id]?.attributes?.friendly_name||id)+'"></option>').join('');
    };
    const field=(name,key,val,type='text',optsList=null,extra='')=>{
      const attr=extra?' '+extra:'';
      const input=optsList?
        '<select data-field="'+key+'"'+attr+'>'+opts(optsList,String(val??''))+'</select>':
        '<input data-field="'+key+'" type="'+type+'" value="'+esc(val??'')+'"'+attr+'/>';
      return '<label>'+esc(name)+input+'</label>';
    };
    const entityField=(value,kind,index)=>{
      return '<input type="search" list="ss-entity-list" data-field="'+kind+'"'+
        (index!==undefined?' data-index="'+index+'"':'')+
        ' value="'+esc(value||'')+'" placeholder="sensor..." autocomplete="off"/>';
    };
    const variantOptions=(node)=>registry.variantOptionsForNode(node,pickLang(editor._config,editor._hass));
    const styleOptions=[['warmwasser','Warmwasser (default)'],['studio','Studio (simple)']];
    const sides=[['left',L.left],['right',L.right],['inside',L.inside]];
    const colorsList=[['hot',L.hot],['cold',L.cold],['solar',L.solarFlow],['return',L.returnFlow]];
    const renderProps=()=>{
      const selection=getSelection();
      const model=get(),obj=selectedObject(model);
      let markup='<h3>'+esc(L.properties)+'</h3>';
      if(!obj){properties.innerHTML=markup+'<p>'+esc(L.choose)+'</p>';return;}
      markup+='<section>'+field(L.name,'label',obj.label);
      if(selection.type==='node'){
        markup+=field(L.graphic,'variant',obj.variant,'text',variantOptions(obj));
        if(!(obj.type==='boiler'&&['solid_fuel','pellet_modern','heatpump_modern','gas_modern','electric_modern','fireplace_modern'].includes(obj.variant)))markup+=field(L.visual||'Graphic style','visual',obj.visual,'text',styleOptions);
        const previewFree=obj.type==='tank'&&obj.variant==='modular'&&obj.scale_mode==='free';
        const previewSolid=obj.type==='boiler'&&obj.variant==='solid_fuel';
        const previewPellet=obj.type==='boiler'&&obj.variant==='pellet_modern';
        const previewHP=obj.type==='boiler'&&obj.variant==='heatpump_modern';
        const previewGas=obj.type==='boiler'&&obj.variant==='gas_modern';
        const previewElectric=obj.type==='boiler'&&obj.variant==='electric_modern';
        const previewFireplace=obj.type==='boiler'&&obj.variant==='fireplace_modern';
        const previewWidth=previewFree?Math.max(170,145*obj.width_scale):120;
        const previewHeight=previewFree?Math.max(160,155*obj.height_scale):140;
        const previewBox=previewFireplace?(()=>{const q=HASSStudioFireplace.geometry(obj);return (q.x-8)+' '+(q.y-8)+' '+(q.width+16)+' '+(q.labelY-q.y+24);})():previewElectric?(()=>{const q=HASSStudioElectricBoiler.geometry(obj);return (q.x-8)+' '+(q.y-8)+' '+(q.width+16)+' '+(q.labelY-q.y+24);})():previewGas?(()=>{const q=HASSStudioGasBoiler.geometry(obj);return (q.x-8)+' '+(q.y-8)+' '+(q.width+16)+' '+(q.labelY-q.y+24);})():previewHP?(()=>{const q=HASSStudioHeatPump.geometry(obj);return (q.x-8)+' '+(q.y-8)+' '+(q.width+16)+' '+(q.labelY-q.y+24);})():previewPellet?(()=>{const b=HASSStudioPellet.geometry(obj);
            return (b.x-8)+' '+(b.y-8)+' '+(b.width+16)+' '+(b.labelY-b.y+26);})():
          previewSolid?((66+(12-66)*obj.width_scale-8)+' '+(53+(-105-53)*obj.height_scale-8)+' '+
            (110*obj.width_scale+16)+' '+(318*obj.height_scale+16)):
          obj.visual==='warmwasser'&&obj.type==='boiler'?'0 -110 130 350':
          previewFree?((60-previewWidth/2)+' '+(70-previewHeight/2)+' '+previewWidth+' '+previewHeight):'0 0 120 140';
        markup+='<div class="ss-preview"><svg viewBox="'+previewBox+'" width="120" height="120">'+
          HASSStudioGraphics.styles+HASSStudioTank.styles+HASSStudioSolidFuel.styles+HASSStudioPellet.styles+HASSStudioHeatPump.styles+HASSStudioGasBoiler.styles+HASSStudioFireplace.styles+'<defs>'+HASSStudioGraphics.defs(obj,editor._hass)+'</defs>'+
          (obj.type==='tank'&&obj.variant==='modular'?HASSStudioTank.render(obj,editor._hass):obj.type==='boiler'&&obj.variant==='solid_fuel'?HASSStudioSolidFuel.render(obj,editor._hass):previewPellet?HASSStudioPellet.render(obj,editor._hass):previewHP?HASSStudioHeatPump.render(obj,editor._hass):previewGas?HASSStudioGasBoiler.render(obj,editor._hass):previewElectric?HASSStudioElectricBoiler.render(obj,editor._hass):previewFireplace?HASSStudioFireplace.render(obj,editor._hass):obj.visual==='warmwasser'?HASSStudioGraphics.render(obj,editor._hass):variantShape(obj))+'</svg></div>';
        const freeScale=obj.type==='tank'&&obj.variant==='modular'&&obj.scale_mode==='free';
        if(obj.type==='tank'&&obj.variant==='modular')
          markup+=field(L.tankScaleMode,'scale_mode',obj.scale_mode,'text',
            [['proportional',L.tankScaleProportional],['free',L.tankScaleFree]]);
        if(obj.type==='tank'&&obj.variant==='modular'){
          // Axis sliders are never hidden. Editing either one automatically unlocks proportions.
          if(!freeScale)markup+=field(L.scale,'scale',obj.scale,'range',null,'min="0.5" max="2.4" step="0.1"');
          markup+=field(L.tankWidthScale,'width_scale',freeScale?obj.width_scale:obj.scale,
            'range',null,'min="0.5" max="2.4" step="0.05"')+
            field(L.tankHeightScale,'height_scale',freeScale?obj.height_scale:obj.scale,
            'range',null,'min="0.5" max="2.4" step="0.05"');
        }else{
          markup+=field(L.scale,'scale',obj.scale,'range',null,'min="0.5" max="2.4" step="0.1"');
          if(obj.type==='boiler'&&['solid_fuel','pellet_modern','heatpump_modern','gas_modern','electric_modern','fireplace_modern'].includes(obj.variant)){
            markup+=field(L.solidWidth+' ('+Math.round(obj.width_scale*100)+'%)','width_scale',obj.width_scale,
              'range',null,'min="0.5" max="2.4" step="0.05"')+
              field(L.solidHeight+' ('+Math.round(obj.height_scale*100)+'%)','height_scale',obj.height_scale,
              'range',null,'min="0.5" max="2.4" step="0.05"');
          }
        }
        markup+='<div class="ss-row">'+field('X','x',obj.x,'number')+field('Y','y',obj.y,'number')+'</div>';
        markup+=field(L.entity,'entity',obj.entity,'search',null,'list="ss-entity-list"');
        if(obj.type==='boiler'){
          if(obj.variant==='fireplace_modern')markup+='<p class="ss-note">'+esc(L.fireplaceHelp)+'</p>';
          if(obj.variant==='electric_modern')markup+=field(L.electricPower,'electric_power_entity',obj.electric_power_entity,'search',null,'list="ss-entity-list"')+
            field(L.electricLoad,'electric_load_entity',obj.electric_load_entity,'search',null,'list="ss-entity-list"')+
            field(L.electricMax,'electric_max_kw',obj.electric_max_kw,'number',null,'min="0.1" max="100" step="0.1"')+
            field(L.electricGlow,'electric_glow',obj.electric_glow,'range',null,'min="0" max="100" step="5"')+
            '<p class="ss-note">'+esc(L.electricHelp)+'</p>';
          if(obj.variant==='gas_modern')markup+=field(L.gasDraw,'gas_draw_entity',obj.gas_draw_entity,'search',null,'list="ss-entity-list"')+
            field(L.gasGlow,'gas_glow',obj.gas_glow,'range',null,'min="0" max="100" step="5"')+
            '<p class="ss-note">'+esc(L.gasHelp)+'</p>';
          if(obj.variant==='heatpump_modern')markup+=field(L.hpPower,'hp_power_entity',obj.hp_power_entity,'search',null,'list="ss-entity-list"')+
            field(L.hpFan,'hp_fan_entity',obj.hp_fan_entity,'search',null,'list="ss-entity-list"')+
            field(L.hpMaxRpm,'hp_max_rpm',obj.hp_max_rpm,'number',null,'min="100" max="20000" step="100"')+
            field(L.hpGlow,'hp_glow',obj.hp_glow,'range',null,'min="0" max="100" step="5"');
          if(['solid_fuel','pellet_modern','fireplace_modern'].includes(obj.variant)){
            markup+=(obj.variant==='solid_fuel'?field(L.solidFuel,'solid_fuel',obj.solid_fuel,'text',[['wood',L.solidWood],['coal',L.solidCoal]]):'')+
              field(L.solidState,'solid_state',obj.solid_state,'text',[['auto',L.solidAuto],['burning',L.solidBurning],['embers',L.solidEmbers],['off',L.solidOff]])+
              field(L.solidGlow,'solid_glow',obj.solid_glow,'range',null,'min="0" max="100" step="5"')+
              '<p class="ss-note">'+esc(L.solidHelp)+'</p>';
          }else markup+=field(L.boilerState,'burner_mode',obj.burner_mode,'text',[['auto',L.flowAuto],['on',L.flowOn],['off',L.flowOff]]);
          markup+=field(L.burnerEntity,'burner_entity',obj.burner_entity,'search',null,'list="ss-entity-list"');
          markup+=field(L.burnerOnTemp,'burner_on_temp',obj.burner_on_temp,'number',null,'min="20" max="90" step="1"');
          markup+=field(L.burnerOffTemp,'burner_off_temp',obj.burner_off_temp,'number',null,'min="10" max="89" step="1"');
        }
        if(obj.type==='solar'){
          markup+=field(L.solarPump,'pump_entity',obj.pump_entity,'search',null,'list="ss-entity-list"');
          markup+=field(L.solarTank,'tank_entity',obj.tank_entity,'search',null,'list="ss-entity-list"');
          markup+=field(L.solarOnDelta,'solar_on_delta',obj.solar_on_delta,'number',null,'min="1" max="40" step="0.5"');
          markup+=field(L.solarOffDelta,'solar_off_delta',obj.solar_off_delta,'number',null,'min="0" max="39" step="0.5"');
        }
        markup+='</section><section><h4>'+esc(L.entities)+'</h4>'+
          obj.entities.map((en,index)=>'<div class="ss-row">'+
            entityField(en.entity,'multiEntity',index)+
            '<button type="button" data-delete-entity="'+index+'">×</button></div>'+
            field(L.label,'multiLabel',en.label,'text',null,'data-index="'+index+'"')).join('')+
          '<button type="button" data-action="entity">'+esc(L.addEntity)+'</button></section>';
        if(obj.type==='tank'||obj.type==='solar'){
          const isModular=obj.type==='tank'&&obj.variant==='modular';
          markup+='<section><h4>'+esc(obj.type==='solar'?L.solarSensors:L.sensors)+'</h4>'+
            '<div class="ss-part-list" role="group" aria-label="'+esc(obj.type==='solar'?L.solarSensors:L.sensors)+'">'+
            obj.parts.map((part,i)=>'<button type="button" class="ss-part-pick'+
              (part.id===getSelectedPartId()?' ss-part-active':'')+'" data-select-part="'+esc(part.id)+'" aria-pressed="'+
              (part.id===getSelectedPartId()?'true':'false')+'">'+
              esc(part.label||((L[part.kind]||part.kind)+' '+(i+1)))+
              (part.entity?' · '+esc(part.entity):'')+'</button>').join('')+'</div>'+
            (obj.parts.some(part=>part.id===getSelectedPartId())?'<h4>'+esc(L.properties)+'</h4>':'')+
          obj.parts.map((item,index)=>item.id!==getSelectedPartId()?'':'<div class="ss-row"><strong>'+esc((L[item.kind]||item.kind)+' '+(index+1))+(isModular?' · '+esc(L.partLayer)+' '+index:'')+'</strong>'+
            (isModular?'<button type="button" title="'+esc(L.partLayerDown)+'" aria-label="'+esc(L.partLayerDown)+'" data-layer-down="'+index+'"'+(index===0?' disabled':'')+'>↓</button>'+
              '<button type="button" title="'+esc(L.partLayerUp)+'" aria-label="'+esc(L.partLayerUp)+'" data-layer-up="'+index+'"'+(index===obj.parts.length-1?' disabled':'')+'>↑</button>':'')+
            '<button type="button" data-delete-part="'+index+'">×</button></div>'+
            (obj.type==='solar'?'':field(L.graphic,'partKind',item.kind,'text',
              (isModular?[['sensor',L.sensor],['heater',L.heater],['coil',L.coil],['baffle_horizontal',L.baffle_horizontal],['baffle_vertical',L.baffle_vertical],['inner_tank',L.inner_tank]]:[['sensor',L.sensor],['heater',L.heater],['coil',L.coil]]),'data-index="'+index+'"'))+
            field(L.visual,'partVariant',item.variant,'text',
              [['warmwasser','Warmwasser'],['compact',L.compact||'Compact'],['extended',L.extended||'Extended']],
              'data-index="'+index+'"')+
            field(L.side,'partSide',item.side,'text',sides,'data-index="'+index+'"')+
            (isModular?field(L.partX,'partX',item.x,'range',null,'min="0" max="100" data-index="'+index+'"'):'')+
            field(L.height,'partHeight',item.height,'number',null,
              'min="0" max="100" data-index="'+index+'"')+
            field(L.label,'partLabel',item.label,'text',null,'data-index="'+index+'"')+
            (isModular && item.kind==='sensor'?field(L.partContainer,'partContainer',item.container,'text', [['main',L.tank],['inner',L.inner_tank]],'data-index="'+index+'"'):'')+
            (isModular && item.kind==='heater'?field(L.heaterMode,'partMode',item.mode,'text',[['auto',L.flowAuto],['on',L.flowOn],['off',L.flowOff]],'data-index="'+index+'"')+field(L.heaterPower,'partPower',item.power,'range',null,'min="0" max="100" data-index="'+index+'"')+field(L.heaterWatts,'partPowerEntity',item.power_entity,'search',null,'list="ss-entity-list" data-index="'+index+'"'):'')+
            (isModular && ['coil','inner_tank'].includes(item.kind)?field(L.partLength,'partLength',item.length,'range',null,'min="15" max="95" data-index="'+index+'"'):'')+
            (isModular && ['heater','coil','inner_tank'].includes(item.kind)?field(L.partWidth,'partWidth',item.width,'range',null,'min="10" max="95" data-index="'+index+'"'):'')+
            (isModular && item.kind==='coil'?field(L.partTurns,'partTurns',item.turns,'number',null,'min="3" max="22" data-index="'+index+'"')+field(L.partFlowMode,'partFlowMode',item.flow_mode,'text',[['auto',L.flowAuto],['on',L.flowOn],['off',L.flowOff]],'data-index="'+index+'"')+field(L.flowDirection,'partFlowDirection',item.flow_direction,'text',[['forward',L.forward],['reverse',L.reverse]],'data-index="'+index+'"')+field(L.flowSpeed,'partFlowSpeed',item.flow_speed,'number',null,'min="0.35" max="5" step="0.1" data-index="'+index+'"'):'')+
            (isModular && item.kind.startsWith('baffle_')?field(L.permeability,'partPermeability',item.permeability,'range',null,'min="0" max="1" step="0.05" data-index="'+index+'"'):'')+
            (item.kind==='sensor'?field(L.sensorScale,'partDisplayScale',item.display_scale,'range',null,
              'min="0.5" max="2" step="0.1" data-index="'+index+'"'):'')+
            '<label>'+esc(L.entity)+entityField(item.entity,'partEntity',index)+'</label>'
          ).join('')+
          '<div class="ss-add-parts">'+(obj.type==='solar'?[['sensor',L.sensor]]:(isModular?[['sensor',L.sensor],['heater',L.heater],['coil',L.coil],['baffle_horizontal',L.baffle_horizontal],['baffle_vertical',L.baffle_vertical],['inner_tank',L.inner_tank]]:[['sensor',L.sensor],['heater',L.heater],['coil',L.coil]])).map(v=>
            '<button type="button" data-add-part="'+v[0]+'">+ '+esc(v[1])+'</button>').join('')+'</div></section>';
        }
      }else{
        markup+=field(L.pipeColor,'color',obj.color,'text',colorsList);
        markup+=field(L.pipeWidth,'width',obj.width,'range',null,'min="3" max="14" step="1"');
        markup+=field(L.pipeStart,'cap_start',obj.cap_start?'true':'false','text',[['true',L.yes],['false',L.no]]);
        markup+=field(L.pipeEnd,'cap_end',obj.cap_end?'true':'false','text',[['true',L.yes],['false',L.no]]);
        markup+=field(L.flowMode||'Flow animation','flow_mode',obj.flow_mode,'text',
          [['off',L.flowOff||'Off'],['auto',L.flowAuto||'Entity-controlled'],['on',L.flowOn||'On (preview)']]);
        markup+=field(L.flowDirection||'Flow direction','flow_direction',obj.flow_direction,'text',
          [['forward',L.forward||'Start → End'],['reverse',L.reverse||'End → Start']]);
        markup+=field(L.flowSpeed||'Animation duration (s)','flow_speed',obj.flow_speed,'number',null,'min="0.35" max="5" step="0.1"');
        markup+=field(L.flowEntity||'Animation state entity','flow_entity',obj.flow_entity,'search',null,'list="ss-entity-list"');
        markup+='<p>'+esc(L.pipeHelp)+'</p><div class="ss-row">'+
          '<button type="button" data-action="bend">+ '+esc(L.newBend)+'</button>'+
          '<button type="button" data-action="unbend">'+esc(L.removeBend)+'</button></div></section>'+
          '<section><h4>'+esc(L.accessories)+'</h4>'+
          obj.accessories.map((a,index)=>
            '<div class="ss-row"><strong>'+esc(L[a.type]||a.type)+'</strong>'+
            '<button type="button" data-delete-accessory="'+index+'">×</button></div>'+
            field(L.accessoryPos,'accessoryPos',a.position,'range',null,
              'min="0" max="100" step="1" data-index="'+index+'"')+
            field(L.accessoryLabel,'accessoryLabel',a.label,'text',null,'data-index="'+index+'"')+
            '<label>'+esc(L.entity)+entityField(a.entity,'accessoryEntity',index)+'</label>').join('')+
          '<div class="ss-add-parts"><button type="button" data-add-accessory="pump">+ '+esc(L.pump)+'</button>'+
          '<button type="button" data-add-accessory="valve">+ '+esc(L.valve)+'</button></div></section>';
      }
      properties.innerHTML=markup+'<datalist id="ss-entity-list">'+entityList()+'</datalist>';
      // Every entity field gets an HA-like search list from the first typed character.
      const popup=document.createElement('div');
      popup.className='ss-entities';popup.hidden=true;
      properties.appendChild(popup);
      const inputs=[...properties.querySelectorAll('input[list="ss-entity-list"]')];
      for(const input of inputs){
        const update=()=>{
          const search=input.value.trim().toLocaleLowerCase();
          if(!search){popup.hidden=true;return;}
          const matches=Object.entries(editor._hass?.states||{}).filter(([entity,state])=>
            entity.toLocaleLowerCase().includes(search)||
            String(state?.attributes?.friendly_name||'').toLocaleLowerCase().includes(search)).slice(0,25);
          popup.replaceChildren();
          for(const [entity,state] of matches){
            const button=document.createElement('button');
            button.type='button';button.className='ss-entity-choice';
            button.textContent=(state.attributes?.friendly_name||entity)+' — '+entity;
            button.addEventListener('click',()=>{input.value=entity;input.dispatchEvent(new Event('change',{bubbles:true}));popup.hidden=true;});
            popup.appendChild(button);
          }
          popup.hidden=!matches.length;
        };
        input.addEventListener('input',update);
        input.addEventListener('focus',update);
      }

    };
    return renderProps;
  };
  return Object.freeze({create});
})();


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


/* Home Assistant Systems Studio - Custom Designer v0.3 (opt-in).
 * Based on Warmwasser Schema Card. The original automatic renderer stays intact.
 * No external dependencies or service calls in the designer.
 */
(() => {
  const W=1200,H=720,MAX_NODES=60,MAX_PIPES=80;
  const registry=HASSStudioDeviceRegistry;
  const types=registry.listTypes();
  const words={
    pl:{sensorScale:'Skala odczytu',accessoryLabel:'Podpis przy ikonie',boilerState:'Praca palnika / grzania',burnerEntity:'Encja palnika (opcjonalna; inaczej temperatura)',burnerOnTemp:'Kocioł aktywny powyżej (°C)',burnerOffTemp:'Kocioł nieaktywny poniżej (°C)',solarTank:'Temperatura zbiornika (do porównania)',solarOnDelta:'Kolektor aktywny – różnica (°C)',solarOffDelta:'Kolektor nieaktywny – różnica (°C)',solarSensors:'Czujniki kolektora',solarPump:'Encja pompy solarnej',pipeStart:'Króciec na początku',pipeEnd:'Króciec na końcu',yes:'Tak',no:'Nie',compact:'Kompaktowy',extended:'Rozbudowany',widthScale:'Szerokość',heightScale:'Wysokość',visual:'Wygląd grafiki',flowMode:'Animacja przepływu',flowOff:'Wyłączona',
      flowOn:'Włączona (podgląd)',flowAuto:'Według encji',flowDirection:'Kierunek przepływu',
      flowSpeed:'Czas animacji (s)',flowEntity:'Encja sterująca przepływem',
      forward:'Początek → koniec',reverse:'Koniec → początek',mode:'Tryb układu',auto:'Automatyczny (Warmwasser)',custom:'Własny układ',language:'Język',
      automatic:'Automatyczny',open:'Otwórz projektant',close:'Zamknij',add:'Dodaj',remove:'Usuń',
      library:'BIBLIOTEKA SVG',properties:'WŁAŚCIWOŚCI',canvas:'SCHEMAT',choose:'Zaznacz element na schemacie',
      name:'Nazwa',graphic:'Rodzaj / grafika',scale:'Skala',position:'Pozycja',entity:'Encja HA',
      entities:'Dodatkowe encje',sensors:'Elementy wewnętrzne',height:'Wysokość od dołu (%)',
      side:'Strona',left:'Lewa',right:'Prawa',inside:'Wewnątrz',sensor:'Czujnik',
      heater:'Grzałka',coil:'Wężownica',accessories:'Elementy na rurze',
      pump:'Pompa',valve:'Zawór',pipe:'Rura',pipeColor:'Rodzaj rury',pipeWidth:'Grubość',
      hot:'Ciepła woda',cold:'Zimna woda',solarFlow:'Obieg solarny',returnFlow:'Powrót',
      newBend:'Dodaj punkt załamania',removeBend:'Usuń ostatni punkt',
      pipeHelp:'Przeciągaj punkty rury. Dwuklik na rurze dodaje nowe załamanie.',
      accessoryPos:'Położenie na rurze (%)',editHelp:'Wybierz element po lewej i ustaw jego właściwości po prawej.',
      boiler:'Kotły',tank:'Zbiorniki',solar:'Solary',pumps:'Pompy',valves:'Zawory',sensorsMenu:'Czujniki',pipes:'Rury',
      link:'Przypisz encję',addEntity:'Dodaj encję',label:'Opis',default:'Domyślna',
      zoom:'Powiększenie',noValues:'Bez pomiaru',editor:'Projektant instalacji'},
    en:{sensorScale:'Reading scale',accessoryLabel:'Icon caption',boilerState:'Burner / heating state',burnerEntity:'Burner entity (optional; otherwise temperature)',burnerOnTemp:'Boiler on above (°C)',burnerOffTemp:'Boiler off below (°C)',solarTank:'Tank temperature (reference)',solarOnDelta:'Collector active – delta (°C)',solarOffDelta:'Collector inactive – delta (°C)',solarSensors:'Collector sensors',solarPump:'Solar pump entity',pipeStart:'Start connector',pipeEnd:'End connector',yes:'Yes',no:'No',compact:'Compact',extended:'Extended',widthScale:'Width',heightScale:'Height',visual:'Graphic style',flowMode:'Flow animation',flowOff:'Off',
      flowOn:'On (preview)',flowAuto:'Controlled by entity',flowDirection:'Flow direction',
      flowSpeed:'Animation duration (s)',flowEntity:'Flow control entity',
      forward:'Start → end',reverse:'End → start',mode:'Layout mode',auto:'Automatic (Warmwasser)',custom:'Custom layout',language:'Language',
      automatic:'Automatic',open:'Open designer',close:'Close',add:'Add',remove:'Delete',
      library:'SVG LIBRARY',properties:'PROPERTIES',canvas:'DIAGRAM',choose:'Select an element in the diagram',
      name:'Name',graphic:'Type / graphic',scale:'Scale',position:'Position',entity:'HA entity',
      entities:'Additional entities',sensors:'Internal components',height:'Height from bottom (%)',
      side:'Side',left:'Left',right:'Right',inside:'Inside',sensor:'Sensor',
      heater:'Heating element',coil:'Coil',accessories:'On-pipe equipment',
      pump:'Pump',valve:'Valve',pipe:'Pipe',pipeColor:'Pipe type',pipeWidth:'Width',
      hot:'Hot water',cold:'Cold water',solarFlow:'Solar circuit',returnFlow:'Return',
      newBend:'Add bend point',removeBend:'Remove last point',
      pipeHelp:'Drag pipe handles. Double-click the pipe to add a bend.',
      accessoryPos:'Position on pipe (%)',editHelp:'Pick a component on the left; configure it on the right.',
      boiler:'Boilers',tank:'Tanks',solar:'Solar',pumps:'Pumps',valves:'Valves',sensorsMenu:'Sensors',pipes:'Pipes',
      link:'Assign entity',addEntity:'Add entity',label:'Description',default:'Default',
      zoom:'Zoom',noValues:'No data',editor:'System diagram designer'}
  };
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{tankGlow:'Efekt cieplny grzałek (%)',heaterMode:'Stan grzałki',heaterPower:'Intensywność (%)',heaterWatts:'Encja mocy (W/kW)',partX:'Pozycja pozioma (%)',partLength:'Wysokość / długość (%)',partWidth:'Szerokość (%)',partTurns:'Liczba zwojów',permeability:'Przepuszczalność 0–1',partContainer:'Strefa czujnika',partFlowMode:'Przepływ wężownicy',baffle_horizontal:'Przegroda pozioma',baffle_vertical:'Przegroda pionowa',inner_tank:'Zbiornik wewnętrzny'}:{tankGlow:'Heater visual glow (%)',heaterMode:'Heater status',heaterPower:'Glow intensity (%)',heaterWatts:'Power entity (W/kW)',partX:'Horizontal position (%)',partLength:'Height / length (%)',partWidth:'Width (%)',partTurns:'Coil turns',permeability:'Permeability 0–1',partContainer:'Sensor compartment',partFlowMode:'Coil flow',baffle_horizontal:'Horizontal baffle',baffle_vertical:'Vertical baffle',inner_tank:'Inner tank'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{tankScaleMode:'Skalowanie zbiornika',tankScaleProportional:'Proporcjonalne',tankScaleFree:'Osobna szerokość i wysokość',tankWidthScale:'Szerokość zbiornika',tankHeightScale:'Wysokość zbiornika'}:{tankScaleMode:'Tank scaling',tankScaleProportional:'Proportional',tankScaleFree:'Independent width and height',tankWidthScale:'Tank width',tankHeightScale:'Tank height'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{partLayer:'Warstwa',partLayerUp:'Przenieś wyżej',partLayerDown:'Przenieś niżej'}:{partLayer:'Layer',partLayerUp:'Move up',partLayerDown:'Move down'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{solidModel:'Piec węgiel / drewno',solidFuel:'Rodzaj opału',solidWood:'Drewno',solidCoal:'Węgiel',solidState:'Stan paleniska (wizualizacja)',solidAuto:'Automatycznie wg encji / temperatury',solidBurning:'Palenie',solidEmbers:'Żarzenie',solidOff:'Wygaszenie',solidGlow:'Intensywność efektu (%)',solidHelp:'Animacja jest wizualna, bez sterowania urządzeniem. Encja stanu spalania ma pierwszeństwo nad progami temperatury.'}:{solidModel:'Wood / coal boiler',solidFuel:'Fuel type',solidWood:'Wood',solidCoal:'Coal',solidState:'Combustion state (visual only)',solidAuto:'Auto from entity / temperature',solidBurning:'Burning',solidEmbers:'Embers',solidOff:'Extinguished',solidGlow:'Effect intensity (%)',solidHelp:'Animation only, no device control. Combustion entity takes precedence over temperature thresholds.'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{solidWidth:'Szerokość pieca',solidHeight:'Wysokość pieca'}:{solidWidth:'Boiler width',solidHeight:'Boiler height'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{pelletModel:'Piec na pellet (nowoczesny)'}:{pelletModel:'Modern pellet boiler'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{hpModel:'Pompa ciepła (nowoczesna)',hpPower:'Encja poboru mocy (W/kW)',hpFan:'Encja prędkości wentylatora (%/RPM)',hpMaxRpm:'Maksymalne obroty (RPM)',hpGlow:'Podświetlenie (%)'}:{hpModel:'Modern heat pump',hpPower:'Electrical power entity (W/kW)',hpFan:'Fan speed entity (%/RPM)',hpMaxRpm:'Max fan speed (RPM)',hpGlow:'Glow (%)'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{gasModel:'Piec gazowy (nowoczesny)',gasDraw:'Encja modulacji palnika (%)',gasGlow:'Intensywność podświetlenia (%)',gasHelp:'Modulacja to procent mocy palnika, nie zmierzony przepływ gazu. Brak danych wyłącza płomień.'}:{gasModel:'Modern gas boiler',gasDraw:'Burner modulation entity (%)',gasGlow:'Lighting intensity (%)',gasHelp:'Modulation is burner load, not measured gas flow. Missing data disables the flame.'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{electricModel:'Piec elektryczny (nowoczesny)',electricPower:'Encja poboru mocy (W/kW)',electricLoad:'Encja obciążenia (%) — opcjonalna',electricMax:'Moc znamionowa pieca (kW)',electricGlow:'Podświetlenie (%)',electricHelp:'Bez osobnej encji % obciążenie wynika z poboru mocy / mocy znamionowej. Brak odczytu nie jest zastępowany wartością demo.'}:{electricModel:'Modern electric boiler',electricPower:'Electrical power entity (W/kW)',electricLoad:'Load entity (%) — optional',electricMax:'Rated boiler power (kW)',electricGlow:'Lighting (%)',electricHelp:'If no % entity is set, load derives from measured power divided by rated power. Missing data never uses demo values.'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{fireplaceModel:'Kominek (nowoczesny)',fireplaceHelp:'Ogień i żar są wizualizacją, automatyka zależy od encji lub temperatury.'}:{fireplaceModel:'Modern fireplace',fireplaceHelp:'Fire and embers are visual only; auto stage uses HA status or temperature.'});
  const colors={hot:'#ed835a',cold:'#57a6db',solar:'#e5b35e',return:'#778cbe'};
  const pickLang=(config,hass)=>{
    const setting=config?.studio_language;
    return setting==='pl'||setting==='en'?setting:
      (String(hass?.language||'').toLowerCase().startsWith('pl')?'pl':'en');
  };
  const clamp=(n,lo,hi,fallback)=>Number.isFinite(Number(n))?Math.max(lo,Math.min(hi,Number(n))):fallback;
  const validEntity=(value)=>typeof value==='string' && isEnt(value);
  const freshId=(prefix)=>prefix+Math.random().toString(36).slice(2,10);
  const normalized=HASSStudioLayout.normalized;
  const {canvasSvg,pipePath,onPipe,variantShape}=HASSStudioCanvas.create({
    W,H,colors,normalized,pickLang,words,clamp,validEntity,esc
  });
  const nativeRender=WarmwasserSchemaCard.prototype._render;
  WarmwasserSchemaCard.prototype._render=function(){
    if(this._cfg?.layout_mode!=='custom')return nativeRender.call(this);
    return '<div class="kopf"><div class="l"><div class="t1">'+esc(this._cfg.titel||'Home Assistant Systems Studio')+
      '</div></div></div>'+canvasSvg(this._cfg,this._hass);
  };
  // In automatic mode, retain the complete original Warmwasser settings.
  const nativeSchema=WarmwasserSchemaCardEditor.prototype._mainSchema;
  WarmwasserSchemaCardEditor.prototype._mainSchema=function(){
    const L=words[pickLang(this._config,this._hass)];
    return [F_('layout_mode',sel.opt([['automatic',L.auto],['custom',L.custom]])),...nativeSchema.call(this)];
  };
  const nativeSet=WarmwasserSchemaCardEditor.prototype.setConfig;
  WarmwasserSchemaCardEditor.prototype.setConfig=function(config){
    nativeSet.call(this,config);
    const mode=this._config?.layout_mode||'automatic';
    if(this._studioMode && mode!==this._studioMode)this._build();
  };
  const nativeFire=WarmwasserSchemaCardEditor.prototype._fire;
  WarmwasserSchemaCardEditor.prototype._fire=function(){
    const changed=this._studioMode && this._studioMode!==(this._config?.layout_mode||'automatic');
    nativeFire.call(this);
    if(changed)this._build();
  };
  const nativeBuild=WarmwasserSchemaCardEditor.prototype._build;
  WarmwasserSchemaCardEditor.prototype._build=function(){
    this._studioMode=this._config?.layout_mode||'automatic';
    if(this._studioMode!=='custom')return nativeBuild.call(this);
    this._forms=[]; // Keeps inherited setConfig from recreating the designer on every edit.
    this._renderStudioEditor();
  };
  WarmwasserSchemaCardEditor.prototype._renderStudioEditor=function(){
    if(!this.shadowRoot)this.attachShadow({mode:'open'});
    const root=this.shadowRoot;
    const L=words[pickLang(this._config,this._hass)];
    const langs=[['auto',L.automatic],['pl','Polski'],['en','English']];
    const opts=(options,selected)=>options.map(row=>
      '<option value="'+esc(row[0])+'"'+(row[0]===selected?' selected':'')+'>'+esc(row[1])+'</option>').join('');
    const style='<style>'+
      ':host{display:block;color:var(--primary-text-color)}'+
      '.ss-launch{display:flex;gap:10px;align-items:end;flex-wrap:wrap;padding:12px}'+
      '.ss-launch label,.ss-props label{display:flex;flex-direction:column;gap:5px;font-size:12px}'+
      '.ss-launch select,.ss-props input,.ss-props select,.ss-bar select{border:1px solid var(--divider-color,#555);background:var(--card-background-color,#29323c);color:var(--primary-text-color);border-radius:7px;padding:8px;min-width:0;box-sizing:border-box;width:100%}'+
      '.ss-launch button,.ss-bar button,.ss-library button,.ss-props button{color:var(--primary-text-color);background:var(--card-background-color,#29323c);border:1px solid var(--divider-color,#555);border-radius:8px;padding:9px;cursor:pointer;font:inherit}'+
      '.ss-launch button{background:var(--primary-color,#168bce);color:var(--text-primary-color,#fff)}'+
      '.ss-modal{position:fixed;inset:0;z-index:100000;background:var(--primary-background-color,#11191f);display:flex;flex-direction:column;padding:0;color:var(--primary-text-color)}'+
      '.ss-modal:not([open]){display:none}.ss-modal.ss-fullscreen{position:fixed;inset:0;width:100vw;height:100vh;max-width:none;max-height:none;border:0;margin:0;padding:0;box-sizing:border-box}'+
      '.ss-modal.ss-fullscreen::backdrop{background:#071018dd}.ss-modal.ss-fullscreen[open]{display:flex} .ss-bar{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--divider-color,#555);flex-wrap:wrap}'+
      '.ss-bar strong{margin-right:auto}.ss-bar button{white-space:nowrap}'+
      '.ss-grid{display:grid;grid-template-columns:var(--ss-left,180px) 7px minmax(0,1fr) 7px var(--ss-right,310px);flex:1;min-height:0;height:100%}'+
      '.ss-splitter{width:7px;cursor:col-resize;background:var(--divider-color,#44505b);opacity:.6;flex-shrink:0}'+
      '.ss-library,.ss-props{padding:12px;overflow-y:auto;border-right:1px solid var(--divider-color,#555)}'+
      '.ss-props{border-right:none;border-left:1px solid var(--divider-color,#555);min-width:0;overflow-x:hidden}'+
      '.ss-library h3,.ss-props h3{font-size:12px;letter-spacing:.06em;color:var(--secondary-text-color);margin:0 0 12px}'+
      '.ss-library button{display:flex;align-items:center;gap:12px;width:100%;margin-bottom:8px;text-align:left;font-size:13px}'+
      '.ss-library button span{font-size:19px;display:inline-block;width:24px;text-align:center}'+
      '.ss-library .ss-lib-group{border:1px solid var(--divider-color,#555);border-radius:8px;margin:0 0 8px;overflow:hidden}'+
      '.ss-library .ss-lib-group>summary,.ss-library .ss-lib-subgroup>summary{cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:6px;padding:10px 8px;font-size:12px;font-weight:600;list-style-position:inside}'+
      '.ss-library .ss-lib-group>summary{background:var(--secondary-background-color,#18222e)}'+
      '.ss-library .ss-lib-subgroup{margin:4px 0 8px;border-left:2px solid var(--divider-color,#555)}'+
      '.ss-library .ss-lib-subgroup>summary{font-size:11px;padding:8px}'+
      '.ss-library .ss-lib-contents{padding:6px}'+
      '.ss-library .ss-lib-count{color:var(--secondary-text-color);font-weight:400}'+
      '.ss-library button.ss-lib-item{gap:8px;padding:8px 6px;margin:0 0 4px;border-color:transparent;background:transparent;white-space:normal}'+
      '.ss-library button.ss-lib-item:hover,.ss-library button.ss-lib-item:focus-visible{background:var(--secondary-background-color,#18222e);border-color:var(--primary-color,#168bce)}'+
      '.ss-library .ss-lib-label{font-size:12px;line-height:1.3;display:block;min-width:0;flex:1;overflow-wrap:anywhere}'+
      '.ss-library .ss-lib-icon{flex:0 0 22px}'+
      '.ss-canvas{min-width:0;min-height:0;overflow:auto;background:var(--secondary-background-color,#18222e);padding:16px}'+
      '.ss-stage{width:max-content;max-width:none}.ss-svg{display:block;width:1200px;height:720px;max-height:none;padding:0;touch-action:none}'+
      '.ss-svg-editor .ss-node{cursor:grab}.ss-svg-editor .ss-pipe-hit{cursor:pointer;pointer-events:stroke}.ss-handle{cursor:move}'+
      '.ss-svg-editor .ss-accessory{pointer-events:none}.ss-svg:not(.ss-svg-editor) .ss-pipe{pointer-events:none}'+
      '.ss-svg:not(.ss-svg-editor) [data-more]{cursor:pointer}'+
      '.ss-props section{border-top:1px solid var(--divider-color,#555);padding:12px 0;display:grid;grid-template-columns:minmax(0,1fr);min-width:0;gap:10px}'+
      '.ss-props section:first-of-type{border-top:0}.ss-props h4{margin:0;font-size:13px}'+
      '.ss-props p,.ss-note{font-size:12px;color:var(--secondary-text-color)}'+
      '.ss-props .ss-row{display:flex;align-items:center;gap:6px}.ss-props .ss-row>*{flex:1;min-width:0}'+
      '.ss-props .ss-row button{flex:0 0 auto}.ss-props input[type=range]{padding:0}'+
      '.ss-props label,.ss-props .ss-row{min-width:0}.ss-props .ss-row strong{overflow-wrap:anywhere}'+
      '.ss-props .ss-add-parts{display:flex;flex-wrap:wrap;gap:6px;min-width:0;width:100%}'+
      '.ss-props .ss-add-parts button{flex:0 1 auto;max-width:100%;white-space:normal;overflow-wrap:anywhere}'+
      '.ss-part-list{display:flex;flex-direction:column;gap:4px;max-height:210px;overflow-y:auto}'+
      '.ss-props button.ss-part-pick{text-align:left;padding:8px;white-space:normal;overflow-wrap:anywhere;font-size:12px}'+
      '.ss-part-pick.ss-part-active{outline:2px solid var(--primary-color,#168bce)}'+
      '.ss-selected{outline:1px solid var(--primary-color)}'+
      '.ss-preview{border:1px solid var(--divider-color,#555);border-radius:8px;display:grid;place-items:center;padding:8px}'+
      '.ss-entities{max-height:210px;overflow-y:auto;border:1px solid var(--divider-color,#555);border-radius:8px}'+
      '.ss-entity-choice{width:100%;text-align:left;border:0;background:transparent;padding:8px;cursor:pointer;display:block;font-size:12px}'+
      '.ss-entity-choice:hover{background:var(--secondary-background-color)}'+
      '@media(max-width:900px){.ss-grid{grid-template-columns:110px minmax(230px,1fr) 220px}.ss-library button{font-size:11px;gap:4px}.ss-library button span{font-size:15px}}'+
      '</style>';
    root.innerHTML=style+
      '<div class="ss-launch"><label>'+esc(L.mode)+'<select id="ss-mode">'+opts([['automatic',L.auto],['custom',L.custom]],'custom')+'</select></label>'+
      '<label>'+esc(L.language)+'<select id="ss-lang">'+opts(langs,this._config.studio_language||'auto')+'</select></label>'+
      '<button type="button" id="ss-open">'+esc(L.open)+'</button></div>'+
      '<dialog class="ss-modal ss-fullscreen" id="ss-modal"><div class="ss-bar"><strong>'+esc(L.editor)+' · v'+esc(VERSION)+'</strong>'+
      '<label>'+esc(L.zoom)+' <select id="ss-zoom">'+opts([['0.65','65%'],['0.8','80%'],['1','100%'],['1.25','125%'],['1.5','150%']],'1')+'</select></label>'+
      '<button id="ss-delete" type="button">'+esc(L.remove)+'</button>'+
      '<button id="ss-close" type="button">'+esc(L.close)+'</button></div>'+
      '<div class="ss-grid" id="ss-grid"><aside class="ss-library"><h3>'+esc(L.library)+'</h3>'+
      HASSStudioEditorLibrary.render({registry,language:pickLang(this._config,this._hass),esc})+
      '</aside><div class="ss-splitter" data-split="left" role="separator" aria-label="Resize left panel"></div><main class="ss-canvas"><div id="ss-stage" class="ss-stage"></div>'+
      '<p class="ss-note">'+esc(L.editHelp)+'</p></main>'+
      '<div class="ss-splitter" data-split="right" role="separator" aria-label="Resize right panel"></div><aside class="ss-props" id="ss-props"><h3>'+esc(L.properties)+'</h3></aside></div></dialog>';
    const modal=root.getElementById('ss-modal'),stage=root.getElementById('ss-stage'),properties=root.getElementById('ss-props');
    const splitterGrid=root.getElementById('ss-grid');
    for(const grip of root.querySelectorAll('.ss-splitter')){
      grip.addEventListener('pointerdown',event=>{
        if(event.button!==0)return;
        grip.setPointerCapture(event.pointerId);
        const move=e=>{
          if(e.pointerId!==event.pointerId)return;
          const r=splitterGrid.getBoundingClientRect();
          const span=grip.dataset.split==='left'?e.clientX-r.left:r.right-e.clientX;
          splitterGrid.style.setProperty(grip.dataset.split==='left'?'--ss-left':'--ss-right',
            clamp(Math.round(span),110,500,200)+'px');
        };
        const end=()=>{grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',end);grip.removeEventListener('pointercancel',end);};
        grip.addEventListener('pointermove',move);
        grip.addEventListener('pointerup',end);
        grip.addEventListener('pointercancel',end);
      });
    }
    let selection=null,drag=null,zoom=1,selectedPartId=null;
    const get=()=>normalized(this._config);
    const commit=(model)=>{
      this._config={...this._config,studio_layout:model};
      this._fire();
    };
    const selectedObject=(model)=>{
      if(!selection)return null;
      return selection.type==='node'?model.nodes.find(x=>x.id===selection.id):
        model.pipes.find(x=>x.id===selection.id);
    };
    const renderProps=HASSStudioEditorInspector.create({
      editor:this,L,properties,esc,opts,registry,pickLang,get,selectedObject,
      getSelection:()=>selection,getSelectedPartId:()=>selectedPartId,variantShape
    });
    const render=()=>{
      stage.innerHTML=canvasSvg(this._config,this._hass,true,selection);
      stage.firstElementChild.style.width=(W*zoom)+'px';
      stage.firstElementChild.style.height=(H*zoom)+'px';
      renderProps();
    };
    const setSelected=(type,id)=>{
      selection={type,id};selectedPartId=type==='node'?get().nodes.find(n=>n.id===id)?.parts?.[0]?.id||null:null;render();
    };
    const point=(ev,svg)=>{
      const p=svg.createSVGPoint();p.x=ev.clientX;p.y=ev.clientY;
      const transform=svg.getScreenCTM();
      return transform?p.matrixTransform(transform.inverse()):{x:0,y:0};
    };
    const repaint=(model)=>{
      const svg=stage.querySelector('svg');if(!svg)return;
      for(const node of model.nodes){
        const g=[...svg.querySelectorAll('.ss-node')].find(el=>el.dataset.id===node.id);
        if(g)g.setAttribute('transform','translate('+node.x+' '+node.y+') scale('+node.scale+')');
      }
      for(const pipe of model.pipes){
        const group=[...svg.querySelectorAll('.ss-pipe')].find(el=>el.dataset.id===pipe.id);
        if(!group)continue;
        const d=pipePath(pipe.points);
        group.querySelectorAll('path.ss-line,path.ss-pipe-hit').forEach(el=>el.setAttribute('d',d));
        group.querySelectorAll('.ss-cap').forEach(el=>{
          const first=el.dataset.cap==='start',pt=first?pipe.points[0]:pipe.points[pipe.points.length-1],
          near=first?pipe.points[1]:pipe.points[pipe.points.length-2];
          el.setAttribute('transform','translate('+pt.x+' '+pt.y+') rotate('+(Math.atan2(pt.y-near.y,pt.x-near.x)*180/Math.PI)+')');
        });
        svg.querySelectorAll('.ss-handle').forEach(el=>{
          if(el.dataset.id!==pipe.id)return;
          const p=pipe.points[Number(el.dataset.point)];
          if(p){el.setAttribute('cx',p.x);el.setAttribute('cy',p.y);}
        });
        svg.querySelectorAll('.ss-accessory[data-pipe="'+pipe.id+'"]').forEach((el,i)=>{
          const accessory=pipe.accessories[i];
          if(accessory){const p=onPipe(pipe,accessory.position);
            el.setAttribute('transform','translate('+p.x+' '+p.y+')');}
        });
      }
    };
    const create=(kind,preset='')=>{
      const model=get();
      if(kind==='pipe'){
        if(model.pipes.length>=MAX_PIPES)return;
        const n=model.pipes.length;
        const pipe={id:freshId('p'),label:'',color:'hot',width:7,
          flow_mode:'auto',flow_entity:'',flow_direction:'forward',flow_speed:1,cap_start:true,cap_end:true,
          points:[{x:180+n*10,y:120+n*12},{x:470+n*10,y:120+n*12}],accessories:[]};
        model.pipes.push(pipe);selection={type:'pipe',id:pipe.id};
      }else{
        if(model.nodes.length>=MAX_NODES)return;
        const n=model.nodes.length;
        const node={id:freshId('n'),type:kind,x:80+(n%6)*170,y:100+Math.floor(n/6)*170,
          scale:1,visual:'warmwasser',variant:registry.isVariant(kind,preset)?preset:registry.defaultVariant(kind),label:'',entity:'',burner_entity:'',burner_mode:'auto',solid_fuel:'wood',solid_state:'auto',solid_glow:78,hp_power_entity:'',hp_fan_entity:'',hp_max_rpm:1800,hp_glow:65,gas_draw_entity:'',gas_glow:62,electric_power_entity:'',electric_load_entity:'',electric_max_kw:8,electric_glow:60,pump_entity:'',tank_entity:'',solar_on_delta:6,solar_off_delta:3,burner_on_temp:35,burner_off_temp:32,entities:[],parts:[]};
        model.nodes.push(node);selection={type:'node',id:node.id};
      }
      commit(model);render();
    };
    root.getElementById('ss-open').addEventListener('click',()=>{
      if(typeof modal.showModal==='function')modal.showModal();
      else modal.setAttribute('open','');
      render();
    });
    const closeDesigner=()=>{
      if(typeof modal.close==='function'&&modal.open)modal.close();
      else modal.removeAttribute('open');
      drag=null;
    };
    root.getElementById('ss-close').addEventListener('click',closeDesigner);
    modal.addEventListener('cancel',()=>{drag=null;});

    root.getElementById('ss-mode').addEventListener('change',event=>{
      this._config={...this._config,layout_mode:event.target.value};this._fire();
    });
    root.getElementById('ss-lang').addEventListener('change',event=>{
      const open=modal.open;
      this._config={...this._config,studio_language:event.target.value};this._fire();this._build();
      if(open)this.shadowRoot.getElementById('ss-open')?.click();
    });
    root.getElementById('ss-zoom').addEventListener('change',event=>{
      zoom=Number(event.target.value)||1;render();
    });
    root.getElementById('ss-delete').addEventListener('click',()=>{
      if(!selection)return;
      const model=get();
      if(selection.type==='node')model.nodes=model.nodes.filter(n=>n.id!==selection.id);
      else model.pipes=model.pipes.filter(n=>n.id!==selection.id);
      selection=null;selectedPartId=null;commit(model);render();
    });
    root.querySelectorAll('[data-add]').forEach(button=>button.addEventListener('click',()=>create(button.dataset.add,button.dataset.variant||'')));
    root.querySelectorAll('[data-add-preset]').forEach(button=>button.addEventListener('click',()=>create('boiler',button.dataset.addPreset)));
    properties.addEventListener('change',event=>{
      const el=event.target,key=el.dataset.field;
      if(!key||!selection)return;
      const model=get(),obj=selectedObject(model);if(!obj)return;
      const index=Number(el.dataset.index);
      const val=el.value;
      if(key==='scale_mode'&&obj.type==='tank'&&obj.variant==='modular'){
        if(val==='free'&&obj.scale_mode!=='free'){
          obj.width_scale=clamp(obj.scale,0.5,2.4,1);
          obj.height_scale=clamp(obj.scale,0.5,2.4,1);
          obj.scale=1;
        }else if(val!=='free'&&obj.scale_mode==='free'){
          obj.scale=clamp(Math.sqrt(obj.width_scale*obj.height_scale),0.5,2.4,1);
          obj.width_scale=1;obj.height_scale=1;
        }
        obj.scale_mode=val==='free'?'free':'proportional';
      }else if(['width_scale','height_scale'].includes(key)&&obj.type==='tank'&&obj.variant==='modular'){
        if(obj.scale_mode!=='free'){
          obj.width_scale=obj.scale;
          obj.height_scale=obj.scale;
          obj.scale=1;
          obj.scale_mode='free';
        }
        obj[key]=clamp(val,.5,2.4,obj[key]);
      }else if(['width_scale','height_scale'].includes(key)&&obj.type==='boiler'&&['solid_fuel','pellet_modern','heatpump_modern','gas_modern','electric_modern','fireplace_modern'].includes(obj.variant)){
        // Independent from the proportional whole-node scale.
        obj[key]=clamp(val,.5,2.4,obj[key]);
      }else if(['x','y','scale','width','solid_glow','gas_glow','electric_glow','electric_max_kw','hp_glow','hp_max_rpm','flow_speed','burner_on_temp','burner_off_temp','solar_on_delta','solar_off_delta'].includes(key)){
        const min={scale:0.5,width_scale:0.5,height_scale:0.5,width:3,solid_glow:0,gas_glow:0,electric_glow:0,electric_max_kw:0.1,hp_glow:0,hp_max_rpm:100,flow_speed:0.35,burner_on_temp:20,burner_off_temp:10,solar_on_delta:1,solar_off_delta:0};
        const max={scale:2.4,width_scale:2.4,height_scale:2.4,width:14,solid_glow:100,gas_glow:100,electric_glow:100,electric_max_kw:100,hp_glow:100,hp_max_rpm:20000,flow_speed:5,burner_on_temp:90,burner_off_temp:89,solar_on_delta:40,solar_off_delta:39,x:W,y:H};
        obj[key]=clamp(val,min[key]??0,max[key],obj[key]);
      }else if(['label','variant','color','entity','visual','flow_mode','flow_direction','flow_entity','burner_entity','gas_draw_entity','electric_power_entity','electric_load_entity','hp_power_entity','hp_fan_entity','burner_mode','solid_fuel','solid_state','pump_entity','tank_entity','cap_start','cap_end'].includes(key)){
        if(['entity','flow_entity','burner_entity','gas_draw_entity','electric_power_entity','electric_load_entity','hp_power_entity','hp_fan_entity','pump_entity','tank_entity'].includes(key))obj[key]=validEntity(val)?val:'';
        else if(key==='burner_mode')obj.burner_mode=['auto','on','off'].includes(val)?val:'auto';
        else if(key==='solid_fuel')obj.solid_fuel=val==='coal'?'coal':'wood';
        else if(key==='solid_state')obj.solid_state=['auto','burning','embers','off'].includes(val)?val:'auto';
        else if(key==='cap_start'||key==='cap_end')obj[key]=val==='true';
        else if(key==='visual')obj.visual=val==='studio'?'studio':'warmwasser';
        else if(key==='flow_mode')obj.flow_mode=['on','off','auto'].includes(val)?val:'auto';
        else if(key==='flow_direction')obj.flow_direction=val==='reverse'?'reverse':'forward';
        else if(key==='variant')obj.variant=registry.isVariant(obj.type,val)?val:obj.variant;
        else if(key==='color')obj.color=colors[val]?val:obj.color;
        else obj.label=val.slice(0,64);
      }else if(key==='multiEntity'&&obj.entities[index])obj.entities[index].entity=validEntity(val)?val:'';
      else if(key==='multiLabel'&&obj.entities[index])obj.entities[index].label=val.slice(0,64);
      else if(key.startsWith('part')&&obj.parts?.[index]){
        const part=obj.parts[index];
        if(key==='partKind')part.kind=['sensor','heater','coil','baffle_horizontal','baffle_vertical','inner_tank'].includes(val)?val:part.kind;
        if(key==='partVariant')part.variant=['warmwasser','compact','extended'].includes(val)?val:part.variant;
        if(key==='partSide')part.side=['left','right','inside'].includes(val)?val:part.side;
        if(key==='partHeight')part.height=clamp(val,0,100,part.height);
        if(key==='partLabel')part.label=val.slice(0,64);
        if(key==='partDisplayScale')part.display_scale=clamp(val,0.5,2,part.display_scale);
        if(key==='partEntity')part.entity=validEntity(val)?val:'';
        if(key==='partPowerEntity')part.power_entity=validEntity(val)?val:'';
        if(key==='partContainer')part.container=val==='inner'?'inner':'main';
        if(key==='partMode')part.mode=['auto','on','off'].includes(val)?val:'auto';
        if(key==='partFlowMode')part.flow_mode=['auto','on','off'].includes(val)?val:'auto';
        if(key==='partFlowDirection')part.flow_direction=val==='reverse'?'reverse':'forward';
        for(const [fieldName,min,max] of [['X',0,100],['Length',15,95],['Width',10,95],['Turns',3,22],['Power',0,100],['Permeability',0,1],['FlowSpeed',.35,5]])if(key==='part'+fieldName){const property=fieldName==='FlowSpeed'?'flow_speed':fieldName==='Permeability'?'permeability':fieldName.toLowerCase();part[property]=clamp(val,min,max,part[property]);}
      }else if(key==='accessoryPos'&&obj.accessories[index])
        obj.accessories[index].position=clamp(val,0,100,50);
      else if(key==='accessoryEntity'&&obj.accessories[index])
        obj.accessories[index].entity=validEntity(val)?val:'';
      else if(key==='accessoryLabel'&&obj.accessories[index])
        obj.accessories[index].label=val.slice(0,64);
      commit(model);render();
    });
    properties.addEventListener('click',event=>{
      const button=event.target.closest('button');
      if(!button||!selection)return;
      const model=get(),obj=selectedObject(model);if(!obj)return;
      if(button.hasAttribute('data-select-part')){
        if(obj.parts?.some(part=>part.id===button.dataset.selectPart)){
          selectedPartId=button.dataset.selectPart;renderProps();
        }
        return;
      }
      const index=Number(button.dataset.deletePart||button.dataset.deleteAccessory||button.dataset.deleteEntity);
      if(button.hasAttribute('data-layer-up')&&obj.parts){
        const i=Number(button.dataset.layerUp);
        if(i>=0&&i<obj.parts.length-1)[obj.parts[i],obj.parts[i+1]]=[obj.parts[i+1],obj.parts[i]];
        else return;
      }else if(button.hasAttribute('data-layer-down')&&obj.parts){
        const i=Number(button.dataset.layerDown);
        if(i>0&&i<obj.parts.length)[obj.parts[i],obj.parts[i-1]]=[obj.parts[i-1],obj.parts[i]];
        else return;
      }else if(button.hasAttribute('data-delete-part')){
        const removed=obj.parts.splice(index,1)[0];
        if(removed?.id===selectedPartId)selectedPartId=obj.parts[Math.min(index,obj.parts.length-1)]?.id||null;
      }
      else if(button.hasAttribute('data-delete-accessory'))obj.accessories.splice(index,1);
      else if(button.hasAttribute('data-delete-entity'))obj.entities.splice(index,1);
      else if(button.dataset.addPart){
        if(obj.parts.length>=40)return;
        const kind=obj.type==='solar'?'sensor':button.dataset.addPart;
        const sensorCount=obj.parts.filter(part=>part.kind==='sensor').length+1;
        const newPart={id:freshId('i'),kind,label:obj.type==='solar'?'Kolektor':kind==='sensor'?'T'+sensorCount:'',
          side:obj.type==='solar'?'right':'left',height:obj.type==='solar'?80:50,
          display_scale:1,variant:'warmwasser',entity:'',x:50,length:58,width:60,turns:12,power:75,mode:'auto',flow_mode:'auto',flow_direction:'forward',flow_speed:1,permeability:kind==='baffle_horizontal'?.35:0,container:'main',power_entity:''};
        obj.parts.push(newPart);selectedPartId=newPart.id;
      }else if(button.dataset.addAccessory){
        if(obj.accessories.length>=20)return;
        obj.accessories.push({id:freshId('a'),type:button.dataset.addAccessory,label:'',position:50,entity:''});
      }else if(button.dataset.action==='entity'){
        if(obj.entities.length>=20)return;
        obj.entities.push({label:'',entity:''});
      }else if(button.dataset.action==='bend'){
        if(obj.points.length>=30)return;
        const a=obj.points[obj.points.length-2],b=obj.points[obj.points.length-1];
        obj.points.splice(obj.points.length-1,0,{x:(a.x+b.x)/2,y:(a.y+b.y)/2+40});
      }else if(button.dataset.action==='unbend'){
        if(obj.points.length<=2)return;
        obj.points.splice(obj.points.length-2,1);
      }else return;
      commit(model);render();
    });
    stage.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;
      const hit=event.target.closest?.('.ss-handle');
      if(hit){
        selection={type:'pipe',id:hit.dataset.id};selectedPartId=null;
        drag={type:'point',id:hit.dataset.id,index:Number(hit.dataset.point),pointer:event.pointerId};
      }else{
        const node=event.target.closest?.('.ss-node');
        if(node){
          selection={type:'node',id:node.dataset.id};
          const partHit=event.target.closest?.('[data-part-id]');
          selectedPartId=partHit?.dataset.partId||get().nodes.find(n=>n.id===node.dataset.id)?.parts?.[0]?.id||null;
          if(partHit){renderProps();return;}
          const model=get(),obj=selectedObject(model),svg=stage.querySelector('svg'),p=point(event,svg);
          if(!obj)return;
          drag={type:'node',id:obj.id,offsetX:p.x-obj.x,offsetY:p.y-obj.y,pointer:event.pointerId};
        }else{
          const pipe=event.target.closest?.('.ss-pipe');
          if(pipe){setSelected('pipe',pipe.dataset.id);return;}
          selection=null;selectedPartId=null;render();return;
        }
      }
      stage.querySelector('svg')?.setPointerCapture(event.pointerId);
      renderProps();
    });
    stage.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.pointer)return;
      const svg=stage.querySelector('svg'),model=get(),p=point(event,svg);
      if(drag.type==='node'){
        const n=model.nodes.find(item=>item.id===drag.id);if(!n)return;
        n.x=clamp(Math.round((p.x-drag.offsetX)/5)*5,0,W-120,n.x);
        n.y=clamp(Math.round((p.y-drag.offsetY)/5)*5,0,H-140,n.y);
      }else{
        const pipe=model.pipes.find(item=>item.id===drag.id);
        if(!pipe||!pipe.points[drag.index])return;
        pipe.points[drag.index]={x:clamp(Math.round(p.x/5)*5,0,W,0),
          y:clamp(Math.round(p.y/5)*5,0,H,0)};
      }
      this._config={...this._config,studio_layout:model};repaint(model);
    });
    const end=event=>{
      if(!drag||event.pointerId!==drag.pointer)return;
      drag=null;commit(get());render();
    };
    stage.addEventListener('pointerup',end);
    stage.addEventListener('pointercancel',end);
    stage.addEventListener('dblclick',event=>{
      const el=event.target.closest?.('.ss-pipe');if(!el)return;
      const model=get(),pipe=model.pipes.find(item=>item.id===el.dataset.id);
      if(!pipe||pipe.points.length>=30)return;
      const p=point(event,stage.querySelector('svg'));
      let index=1,best=Infinity;
      for(let i=1;i<pipe.points.length;i++){
        const a=pipe.points[i-1],b=pipe.points[i];
        const vx=b.x-a.x,vy=b.y-a.y,length=vx*vx+vy*vy;
        const t=length?clamp(((p.x-a.x)*vx+(p.y-a.y)*vy)/length,0,1,0):0;
        const distance=Math.hypot(p.x-(a.x+vx*t),p.y-(a.y+vy*t));
        if(distance<best){best=distance;index=i;}
      }
      pipe.points.splice(index,0,{x:clamp(p.x,0,W,p.x),y:clamp(p.y,0,H,p.y)});
      selection={type:'pipe',id:pipe.id};commit(model);render();
    });
    renderProps();
  };
})();