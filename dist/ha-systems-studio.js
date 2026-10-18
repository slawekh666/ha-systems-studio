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

const VERSION = '0.4.22-dev';

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
    '@keyframes ssElectricFlow{to{stroke-dashoffset:var(--ss-flow-cycle,-28)}}'+
    '.ss-pump-pulse{animation:ssWWPulse 1.6s infinite;transform-box:fill-box;transform-origin:center}'+
    '.ss-fire{animation:ssWWFire .9s infinite;transform-box:fill-box;transform-origin:center}'+
    '.ss-solar-sun{animation:ssWWFire 3s infinite;transform-box:fill-box;transform-origin:center}'+
    '@keyframes ssWWEmbers{50%{opacity:.45}}'+
    '@keyframes ssWWRotate{to{transform:rotate(360deg)}}'+
    '.ss-embers{animation:ssWWEmbers 1.7s infinite}'+
    '.ss-fan{animation:ssWWRotate 1.8s linear infinite;transform-box:fill-box;transform-origin:center}'+
    '.ss-flow{stroke:#fff;stroke-width:2.5;stroke-dasharray:1 13;animation:ssWWFlow var(--ss-speed,1s) linear infinite;fill:none;stroke-linecap:round}'+
    '.ss-flow-power{animation-name:ssElectricFlow}'+
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
    const nonUniform=n.scale_mode==='free'; // Legacy proportional layouts still use the whole-node scale only.
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
  pellet: "\n<defs>\n        <linearGradient id=\"steelFront\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#3c5270\"/>\n          <stop offset=\".16\" stop-color=\"#7c96bb\"/>\n          <stop offset=\".5\" stop-color=\"#121a27\"/>\n          <stop offset=\".84\" stop-color=\"#4e678d\"/>\n          <stop offset=\"1\" stop-color=\"#2c3f5b\"/>\n        </linearGradient>\n        <linearGradient id=\"steelPanel\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#364a61\"/>\n          <stop offset=\"1\" stop-color=\"#111925\"/>\n        </linearGradient>\n        <linearGradient id=\"edgeGlowGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#dbe9ff\"/>\n          <stop offset=\"1\" stop-color=\"#8ecfff\"/>\n        </linearGradient>\n        <linearGradient id=\"darkGlass\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#202a35\"/>\n          <stop offset=\"1\" stop-color=\"#070c13\"/>\n        </linearGradient>\n        <linearGradient id=\"screenGlass\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#0a233a\"/>\n          <stop offset=\"1\" stop-color=\"#02070f\"/>\n        </linearGradient>\n        <linearGradient id=\"screenHighlight\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#ffffff\" stop-opacity=\".18\"/>\n          <stop offset=\"1\" stop-color=\"#ffffff\" stop-opacity=\"0\"/>\n        </linearGradient>\n        <linearGradient id=\"hopperGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#425878\"/>\n          <stop offset=\"1\" stop-color=\"#111926\"/>\n        </linearGradient>\n        <linearGradient id=\"motorGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#25384f\"/>\n          <stop offset=\".5\" stop-color=\"#59739b\"/>\n          <stop offset=\"1\" stop-color=\"#22354a\"/>\n        </linearGradient>\n        <filter id=\"blueGlow\" x=\"-25%\" y=\"-25%\" width=\"150%\" height=\"150%\"><feGaussianBlur stdDeviation=\"10\"/></filter>\n        <filter id=\"softBlueGlow\" x=\"-25%\" y=\"-25%\" width=\"150%\" height=\"150%\"><feGaussianBlur stdDeviation=\"6\"/></filter>\n      <clipPath id=\"pelletBurnerClip\"><rect x=\"242\" y=\"560\" width=\"188\" height=\"240\" rx=\"12\"/></clipPath></defs>\n\n      <g id=\"aura\">\n        <path d=\"M120 210 L560 210 L596 246 L596 1106 L560 1140 L120 1140 L84 1106 L84 246 Z\" fill=\"none\" stroke=\"#2aa5ff\" stroke-opacity=\".22\" stroke-width=\"16\" filter=\"url(#blueGlow)\"/>\n        <path d=\"M672 242 L1084 242 L1120 276 L1120 688 L988 834 L988 1060 L920 1098 L794 1098 L794 864 L672 726 Z\" fill=\"none\" stroke=\"#2aa5ff\" stroke-opacity=\".18\" stroke-width=\"14\" filter=\"url(#blueGlow)\"/>\n      </g>\n\n      <g id=\"chimney\">\n        <rect x=\"280\" y=\"82\" width=\"126\" height=\"132\" rx=\"16\" fill=\"url(#steelFront)\" stroke=\"#dcecff\" stroke-opacity=\".85\" stroke-width=\"4\"/>\n        <line x1=\"280\" y1=\"150\" x2=\"406\" y2=\"150\" stroke=\"#edf5ff\" stroke-opacity=\".66\" stroke-width=\"3\"/>\n      </g>\n\n      <g id=\"stoveBody\">\n        <path d=\"M120 210 L560 210 L596 246 L596 1106 L560 1140 L120 1140 L84 1106 L84 246 Z\" fill=\"url(#steelFront)\" stroke=\"#dcecff\" stroke-opacity=\".88\" stroke-width=\"4\"/>\n        <path d=\"M84 246 L120 210 V1140 L84 1106 Z\" fill=\"#40699f\" opacity=\".48\"/>\n        <path d=\"M560 210 L596 246 V1106 L560 1140 Z\" fill=\"#2a4263\" opacity=\".56\"/>\n        <rect x=\"114\" y=\"220\" width=\"446\" height=\"16\" rx=\"3\" fill=\"#eef6ff\" opacity=\".82\"/>\n        <line x1=\"180\" y1=\"220\" x2=\"180\" y2=\"520\" stroke=\"#0a121b\" stroke-opacity=\".42\" stroke-width=\"3\"/>\n        <line x1=\"534\" y1=\"220\" x2=\"534\" y2=\"1140\" stroke=\"#0a121b\" stroke-opacity=\".28\" stroke-width=\"3\"/>\n        <line x1=\"114\" y1=\"392\" x2=\"560\" y2=\"392\" stroke=\"#d6e8ff\" stroke-opacity=\".18\" stroke-width=\"3\"/>\n      </g>\n\n      <g id=\"displayPanel\">\n        <rect x=\"164\" y=\"262\" width=\"316\" height=\"106\" rx=\"12\" fill=\"#061018\" stroke=\"#8fd1ff\" stroke-width=\"3\"/>\n        <rect x=\"174\" y=\"272\" width=\"296\" height=\"86\" rx=\"10\" fill=\"url(#screenGlass)\"/>\n        <path d=\"M180 278 H318 L286 354 H180 Z\" fill=\"url(#screenHighlight)\"/>\n        <text x=\"200\" y=\"305\" font-size=\"14\" fill=\"#7cc8ff\" font-family=\"monospace\">TEMP</text>\n        <text id=\"pelletTestIndicator\" x=\"312\" y=\"298\" text-anchor=\"end\" font-size=\"15\" font-family=\"monospace\" font-weight=\"700\" fill=\"#f8bf73\" visibility=\"hidden\">TEST</text>\n        <text id=\"tempValue\" x=\"200\" y=\"345\" font-size=\"42\" fill=\"#e3f8ff\" font-family=\"monospace\" font-weight=\"700\">65.0°</text>\n        <text x=\"298\" y=\"343\" font-size=\"18\" fill=\"#72c8ff\" font-family=\"monospace\">C</text>\n        <g opacity=\".84\" fill=\"#5fb9ff\">\n          <rect x=\"354\" y=\"290\" width=\"26\" height=\"6\" rx=\"3\"/>\n          <rect x=\"354\" y=\"306\" width=\"26\" height=\"6\" rx=\"3\"/>\n          <rect x=\"354\" y=\"322\" width=\"26\" height=\"6\" rx=\"3\"/>\n          <rect x=\"354\" y=\"338\" width=\"26\" height=\"6\" rx=\"3\"/>\n        </g>\n        <circle cx=\"422\" cy=\"314\" r=\"28\" fill=\"#07111a\" stroke=\"#88d0ff\" stroke-width=\"4\"/>\n        <circle id=\"statusRingGlow\" cx=\"422\" cy=\"314\" r=\"34\" fill=\"none\" stroke=\"#2ab2ff\" stroke-opacity=\".26\" stroke-width=\"6\" filter=\"url(#softBlueGlow)\"/>\n        <path d=\"M422 286 A 28 28 0 1 1 421.9 286\" fill=\"none\" stroke=\"#263449\" stroke-width=\"9\" stroke-linecap=\"round\"/>\n        <path id=\"statusArc\" d=\"M422 286 A 28 28 0 1 1 421.9 286\" fill=\"none\" stroke=\"#59c84c\" stroke-width=\"9\" stroke-linecap=\"round\" stroke-dasharray=\"120 176\"/>\n      </g>\n\n      <g id=\"doorSection\">\n        <rect x=\"150\" y=\"446\" width=\"366\" height=\"438\" rx=\"20\" fill=\"#0b121b\" opacity=\".46\"/>\n        <rect x=\"186\" y=\"488\" width=\"300\" height=\"382\" rx=\"16\" fill=\"url(#steelPanel)\" stroke=\"#9eb4d6\" stroke-opacity=\".56\" stroke-width=\"2.4\"/>\n        <rect x=\"224\" y=\"542\" width=\"224\" height=\"274\" rx=\"16\" fill=\"url(#darkGlass)\" stroke=\"#92d1ff\" stroke-width=\"3\"/>\n        <rect id=\"doorGlowFrame\" x=\"224\" y=\"542\" width=\"224\" height=\"274\" rx=\"16\" fill=\"none\" stroke=\"#2aa5ff\" stroke-opacity=\".18\" stroke-width=\"10\" filter=\"url(#softBlueGlow)\"/>\n        <path d=\"M240 564 h46 v178 l-32 0 z\" fill=\"#ffffff\" opacity=\".10\"/>\n        <path d=\"M436 556 h-40 l-30 258 h28 z\" fill=\"#a4d8ff\" opacity=\".05\"/>\n        <g id=\"emptyBurner\">\n          <rect x=\"242\" y=\"560\" width=\"188\" height=\"240\" rx=\"12\" fill=\"#0a0f16\"/>\n          <rect x=\"242\" y=\"560\" width=\"188\" height=\"240\" rx=\"12\" fill=\"none\" stroke=\"#8ecfff\" stroke-opacity=\".08\" stroke-width=\"2\"/>\n          <g opacity=\".10\" stroke=\"#ddeaff\" stroke-width=\"1.4\">\n            <line x1=\"290\" y1=\"566\" x2=\"290\" y2=\"798\"/>\n            <line x1=\"336\" y1=\"566\" x2=\"336\" y2=\"798\"/>\n            <line x1=\"382\" y1=\"566\" x2=\"382\" y2=\"798\"/>\n          </g>\n          <rect x=\"260\" y=\"760\" width=\"150\" height=\"12\" rx=\"4\" fill=\"#1e2631\"/>\n          <g fill=\"#202933\">\n            <rect x=\"268\" y=\"742\" width=\"8\" height=\"28\" rx=\"2\"/>\n            <rect x=\"288\" y=\"742\" width=\"8\" height=\"28\" rx=\"2\"/>\n            <rect x=\"308\" y=\"742\" width=\"8\" height=\"28\" rx=\"2\"/>\n            <rect x=\"328\" y=\"742\" width=\"8\" height=\"28\" rx=\"2\"/>\n            <rect x=\"348\" y=\"742\" width=\"8\" height=\"28\" rx=\"2\"/>\n            <rect x=\"368\" y=\"742\" width=\"8\" height=\"28\" rx=\"2\"/>\n            <rect x=\"388\" y=\"742\" width=\"8\" height=\"28\" rx=\"2\"/>\n          </g>\n          <g id=\"combustionSlot\"></g>\n        </g>\n        <g fill=\"url(#steelFront)\" stroke=\"#90d1ff\" stroke-width=\"2.2\">\n          <rect x=\"170\" y=\"588\" width=\"14\" height=\"96\" rx=\"4\"/>\n          <rect x=\"170\" y=\"786\" width=\"14\" height=\"96\" rx=\"4\"/>\n        </g>\n        <g id=\"mainHandle\">\n          <rect x=\"478\" y=\"670\" width=\"30\" height=\"118\" rx=\"10\" fill=\"url(#steelFront)\" stroke=\"#91d0ff\" stroke-width=\"2.5\"/>\n          <rect x=\"468\" y=\"660\" width=\"14\" height=\"46\" rx=\"6\" fill=\"#9bd2ff\" opacity=\".74\"/>\n        </g>\n      </g>\n\n      <g id=\"drawerSection\">\n        <rect x=\"168\" y=\"922\" width=\"318\" height=\"150\" rx=\"12\" fill=\"url(#steelPanel)\" stroke=\"#a4b7d7\" stroke-opacity=\".56\" stroke-width=\"2.2\"/>\n        <rect x=\"250\" y=\"978\" width=\"154\" height=\"42\" rx=\"8\" fill=\"#081018\" stroke=\"#8fcfff\" stroke-opacity=\".55\" stroke-width=\"2.2\"/>\n        <circle id=\"burnerStatusLed\" cx=\"267\" cy=\"992\" r=\"5\" fill=\"#4a93bb\"/>\n        <text id=\"burnerStatusText\" x=\"329\" y=\"1009\" font-size=\"18\" text-anchor=\"middle\" font-family=\"monospace\" font-weight=\"700\" fill=\"#9edbff\">PALNIK —</text>\n        <g fill=\"url(#steelFront)\" stroke=\"#90d1ff\" stroke-width=\"2\">\n          <rect x=\"170\" y=\"976\" width=\"12\" height=\"94\" rx=\"4\"/>\n          <rect x=\"448\" y=\"962\" width=\"22\" height=\"70\" rx=\"7\"/>\n        </g>\n      </g>\n\n      <g id=\"stoveBase\">\n        <path d=\"M82 1088 H598 L598 1156 L566 1184 H114 L82 1156 Z\" fill=\"url(#steelFront)\" stroke=\"#8fd1ff\" stroke-opacity=\".82\" stroke-width=\"4\"/>\n        <rect x=\"130\" y=\"1180\" width=\"26\" height=\"18\" rx=\"4\" fill=\"#223248\"/>\n        <rect x=\"522\" y=\"1180\" width=\"26\" height=\"18\" rx=\"4\" fill=\"#223248\"/>\n      </g>\n\n      <g id=\"hopperGroup\">\n        <path d=\"M672 242 L1084 242 L1120 276 L1120 688 L988 834 L988 1060 L920 1098 L794 1098 L794 864 L672 726 Z\" fill=\"url(#hopperGrad)\" stroke=\"#dcecff\" stroke-opacity=\".84\" stroke-width=\"4\"/>\n        <path d=\"M672 242 L714 212 H1046 L1084 242 Z\" fill=\"url(#steelFront)\" stroke=\"#dcecff\" stroke-opacity=\".76\" stroke-width=\"4\"/>\n        <path d=\"M714 212 H1046 L1088 252 H756 Z\" fill=\"#495f7f\" opacity=\".74\"/>\n        <rect x=\"810\" y=\"202\" width=\"132\" height=\"20\" rx=\"8\" fill=\"#1d2836\" stroke=\"#b8d6ff\" stroke-width=\"2.4\"/>\n        <rect x=\"864\" y=\"244\" width=\"36\" height=\"38\" rx=\"4\" fill=\"#34485f\" stroke=\"#aacfff\" stroke-width=\"2\"/>\n        <rect x=\"894\" y=\"338\" width=\"58\" height=\"286\" rx=\"18\" fill=\"#070d13\" stroke=\"#8ecfff\" stroke-opacity=\".46\" stroke-width=\"2.2\"/>\n        <rect x=\"905\" y=\"352\" width=\"36\" height=\"258\" rx=\"14\" fill=\"#0f1620\"/>\n        <rect x=\"905\" y=\"352\" width=\"36\" height=\"258\" rx=\"14\" fill=\"none\" stroke=\"#9fd7ff\" stroke-opacity=\".10\" stroke-width=\"2\"/>\n        <g id=\"pellet-level-indicator\"><rect id=\"pellet-level-1\" x=\"911\" y=\"569\" width=\"24\" height=\"30\" rx=\"5\" fill=\"#46535d\" opacity=\".2\"/>\n<rect id=\"pellet-level-2\" x=\"911\" y=\"526\" width=\"24\" height=\"30\" rx=\"5\" fill=\"#46535d\" opacity=\".2\"/>\n<rect id=\"pellet-level-3\" x=\"911\" y=\"483\" width=\"24\" height=\"30\" rx=\"5\" fill=\"#46535d\" opacity=\".2\"/>\n<rect id=\"pellet-level-4\" x=\"911\" y=\"440\" width=\"24\" height=\"30\" rx=\"5\" fill=\"#46535d\" opacity=\".2\"/>\n<rect id=\"pellet-level-5\" x=\"911\" y=\"397\" width=\"24\" height=\"30\" rx=\"5\" fill=\"#46535d\" opacity=\".2\"/></g>\n        <text id=\"pellet-level-warning\" x=\"923\" y=\"332\" fill=\"#ff726b\" text-anchor=\"middle\" font-size=\"28\" font-family=\"Arial,sans-serif\" font-weight=\"bold\" visibility=\"hidden\">!</text>\n        <path d=\"M766 706 H1098 L988 834 H794 Z\" fill=\"#162234\" opacity=\".84\"/>\n        <path d=\"M794 864 L988 864 L988 1060 L920 1098 L794 1098 Z\" fill=\"#122030\" opacity=\".86\"/>\n      </g>\n\n\n      <g id=\"connectionPipe\">\n        <rect x=\"596\" y=\"974\" width=\"164\" height=\"64\" rx=\"24\" fill=\"url(#motorGrad)\" stroke=\"#d7ebff\" stroke-opacity=\".62\" stroke-width=\"3\"/>\n        <rect x=\"612\" y=\"986\" width=\"132\" height=\"40\" rx=\"18\" fill=\"#12202e\" opacity=\".62\"/>\n        <rect x=\"580\" y=\"986\" width=\"20\" height=\"40\" rx=\"6\" fill=\"url(#steelFront)\" stroke=\"#9fd5ff\" stroke-opacity=\".46\" stroke-width=\"2\"/>\n        <rect x=\"744\" y=\"986\" width=\"18\" height=\"40\" rx=\"6\" fill=\"url(#steelFront)\" stroke=\"#9fd5ff\" stroke-opacity=\".46\" stroke-width=\"2\"/>\n        <ellipse cx=\"596\" cy=\"1006\" rx=\"16\" ry=\"26\" fill=\"url(#steelFront)\" stroke=\"#b9dcff\" stroke-opacity=\".72\" stroke-width=\"2.6\"/>\n      </g>\n\n      <g id=\"feedSystem\">\n        <rect x=\"760\" y=\"946\" width=\"140\" height=\"122\" rx=\"16\" fill=\"url(#motorGrad)\" stroke=\"#d7ebff\" stroke-opacity=\".64\" stroke-width=\"3\"/>\n        <rect x=\"900\" y=\"972\" width=\"80\" height=\"72\" rx=\"18\" fill=\"#12202e\" stroke=\"#9fd5ff\" stroke-opacity=\".44\" stroke-width=\"2.4\"/>\n        <rect x=\"978\" y=\"966\" width=\"84\" height=\"84\" rx=\"14\" fill=\"#1c2c40\" stroke=\"#cae6ff\" stroke-opacity=\".66\" stroke-width=\"3\"/>\n        <ellipse cx=\"1062\" cy=\"1008\" rx=\"28\" ry=\"42\" fill=\"url(#steelFront)\" stroke=\"#b9dcff\" stroke-width=\"3\"/>\n        <rect x=\"884\" y=\"1060\" width=\"16\" height=\"78\" rx=\"6\" fill=\"url(#steelFront)\"/>\n        <rect x=\"1020\" y=\"1062\" width=\"16\" height=\"76\" rx=\"6\" fill=\"url(#steelFront)\"/>\n        <rect x=\"834\" y=\"1060\" width=\"20\" height=\"56\" rx=\"6\" fill=\"#162331\" stroke=\"#99d1ff\" stroke-opacity=\".45\" stroke-width=\"2\"/>\n        <rect x=\"826\" y=\"1110\" width=\"36\" height=\"12\" rx=\"4\" fill=\"url(#steelFront)\"/>\n        <circle cx=\"786\" cy=\"970\" r=\"4\" fill=\"#e6f3ff\"/>\n        <circle cx=\"874\" cy=\"970\" r=\"4\" fill=\"#e6f3ff\"/>\n        <circle cx=\"786\" cy=\"1044\" r=\"4\" fill=\"#e6f3ff\"/>\n        <circle cx=\"874\" cy=\"1044\" r=\"4\" fill=\"#e6f3ff\"/>\n         <circle id=\"pelletFeedLed\" cx=\"830\" cy=\"1006\" r=\"10\" fill=\"#4c82a5\" stroke=\"#a8d9f4\" stroke-width=\"2\"/>\n      </g>\n",
  heatPump: "\n<defs>\n        <linearGradient id=\"bodyGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#dde5ef\"/>\n          <stop offset=\".14\" stop-color=\"#fbfdff\"/>\n          <stop offset=\".48\" stop-color=\"#c2ccda\"/>\n          <stop offset=\".78\" stop-color=\"#a7b3c4\"/>\n          <stop offset=\"1\" stop-color=\"#8f9cae\"/>\n        </linearGradient>\n        <linearGradient id=\"bodySideGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#eef4fb\"/>\n          <stop offset=\"1\" stop-color=\"#b5c1d1\"/>\n        </linearGradient>\n        <linearGradient id=\"darkPanel\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#0e1c2e\"/>\n          <stop offset=\"1\" stop-color=\"#02070f\"/>\n        </linearGradient>\n        <linearGradient id=\"blueFanGlow\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#23a8ff\"/>\n          <stop offset=\"1\" stop-color=\"#0069ff\"/>\n        </linearGradient>\n        <linearGradient id=\"bladeGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#143962\"/>\n          <stop offset=\".5\" stop-color=\"#07101b\"/>\n          <stop offset=\"1\" stop-color=\"#0f2c4d\"/>\n        </linearGradient>\n        <linearGradient id=\"footGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#1d2837\"/>\n          <stop offset=\".5\" stop-color=\"#5c6f8a\"/>\n          <stop offset=\"1\" stop-color=\"#1b2635\"/>\n        </linearGradient>\n        <radialGradient id=\"fanAura\" cx=\"50%\" cy=\"50%\" r=\"50%\">\n          <stop offset=\"0\" stop-color=\"#1b86ff\" stop-opacity=\".25\"/>\n          <stop offset=\".55\" stop-color=\"#0f6df5\" stop-opacity=\".16\"/>\n          <stop offset=\"1\" stop-color=\"#0f6df5\" stop-opacity=\"0\"/>\n        </radialGradient>\n        <filter id=\"blueGlow\" x=\"-25%\" y=\"-25%\" width=\"150%\" height=\"150%\"><feGaussianBlur stdDeviation=\"10\"/></filter>\n        <filter id=\"softGlow\" x=\"-25%\" y=\"-25%\" width=\"150%\" height=\"150%\"><feGaussianBlur stdDeviation=\"5\"/></filter>\n      </defs>\n\n      <g id=\"aura\">\n        <path id=\"hpAuraOutline\" d=\"M126 152 H1128 Q1168 152 1168 192 V790 Q1168 828 1128 828 H126 Q86 828 86 790 V192 Q86 152 126 152 Z\" fill=\"none\" stroke=\"#2aa5ff\" stroke-opacity=\"0.12\" stroke-width=\"16\" filter=\"url(#blueGlow)\"/>\n      </g>\n\n      <g id=\"unitBody\">\n        <path d=\"M126 152 H1128 Q1168 152 1168 192 V790 Q1168 828 1128 828 H126 Q86 828 86 790 V192 Q86 152 126 152 Z\" fill=\"url(#bodyGrad)\" stroke=\"#f8fbff\" stroke-width=\"4\"/>\n        <rect x=\"86\" y=\"172\" width=\"1082\" height=\"22\" rx=\"8\" fill=\"#edf4fb\" opacity=\".82\"/>\n        <line x1=\"86\" y1=\"788\" x2=\"1168\" y2=\"788\" stroke=\"#8193ab\" stroke-opacity=\".56\" stroke-width=\"3\"/>\n        <path d=\"M814 152 V828\" stroke=\"#6a7890\" stroke-opacity=\".72\" stroke-width=\"5\"/>\n        <path d=\"M118 182 V798\" stroke=\"#6c7990\" stroke-opacity=\".40\" stroke-width=\"3\"/>\n        <path d=\"M1136 182 V798\" stroke=\"#6c7990\" stroke-opacity=\".40\" stroke-width=\"3\"/>\n      </g>\n\n      <g id=\"fanSection\">\n        <circle cx=\"458\" cy=\"490\" r=\"272\" fill=\"#d7e0eb\" stroke=\"#8ea2ba\" stroke-width=\"4\"/>\n        <circle cx=\"458\" cy=\"490\" r=\"248\" fill=\"#07111b\" stroke=\"#cad9e8\" stroke-width=\"4\"/>\n        <circle id=\"fanGlowRing\" cx=\"458\" cy=\"490\" r=\"244\" fill=\"none\" stroke=\"#2191ff\" stroke-opacity=\"0.20\" stroke-width=\"10\" filter=\"url(#blueGlow)\"/>\n        <circle cx=\"458\" cy=\"490\" r=\"234\" fill=\"url(#fanAura)\"/>\n\n        <g id=\"bladeRotor\" class=\"ss-hp-still\" style=\"animation:none;\">\n          <g class=\"bladeSet\">\n            <path d=\"M458 490 C470 454 520 394 586 346 C613 362 629 380 640 400 C610 438 548 474 458 490 Z\" fill=\"url(#bladeGrad)\"/>\n            <path d=\"M472 482 C492 450 540 404 591 372\" fill=\"none\" stroke=\"#2191ff\" stroke-opacity=\".34\" stroke-width=\"8\" stroke-linecap=\"round\"/>\n          </g>\n          <g class=\"bladeSet\" transform=\"rotate(90 458 490)\">\n            <path d=\"M458 490 C470 454 520 394 586 346 C613 362 629 380 640 400 C610 438 548 474 458 490 Z\" fill=\"url(#bladeGrad)\"/>\n            <path d=\"M472 482 C492 450 540 404 591 372\" fill=\"none\" stroke=\"#2191ff\" stroke-opacity=\".34\" stroke-width=\"8\" stroke-linecap=\"round\"/>\n          </g>\n          <g class=\"bladeSet\" transform=\"rotate(180 458 490)\">\n            <path d=\"M458 490 C470 454 520 394 586 346 C613 362 629 380 640 400 C610 438 548 474 458 490 Z\" fill=\"url(#bladeGrad)\"/>\n            <path d=\"M472 482 C492 450 540 404 591 372\" fill=\"none\" stroke=\"#2191ff\" stroke-opacity=\".34\" stroke-width=\"8\" stroke-linecap=\"round\"/>\n          </g>\n          <g class=\"bladeSet\" transform=\"rotate(270 458 490)\">\n            <path d=\"M458 490 C470 454 520 394 586 346 C613 362 629 380 640 400 C610 438 548 474 458 490 Z\" fill=\"url(#bladeGrad)\"/>\n            <path d=\"M472 482 C492 450 540 404 591 372\" fill=\"none\" stroke=\"#2191ff\" stroke-opacity=\".34\" stroke-width=\"8\" stroke-linecap=\"round\"/>\n          </g>\n          <circle cx=\"458\" cy=\"490\" r=\"82\" fill=\"url(#bodyGrad)\" stroke=\"#eef6ff\" stroke-width=\"4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"58\" fill=\"url(#bodySideGrad)\" opacity=\".74\"/>\n        </g>\n\n        <g id=\"fanGrille\" stroke=\"#0c1622\" stroke-width=\"5\" fill=\"none\" stroke-linecap=\"round\">\n          <circle cx=\"458\" cy=\"490\" r=\"236\" stroke=\"#111e2d\" stroke-width=\"8\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"218\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"200\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"182\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"164\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"146\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"128\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"110\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <circle cx=\"458\" cy=\"490\" r=\"92\" stroke=\"#36485e\" stroke-width=\"2.4\"/>\n          <path d=\"M458 256 V724\" stroke=\"#0f1e30\" stroke-width=\"8\"/>\n          <path d=\"M224 490 H692\" stroke=\"#0f1e30\" stroke-width=\"8\"/>\n          <path d=\"M292 324 L624 656\" stroke=\"#0f1e30\" stroke-width=\"8\"/>\n          <path d=\"M624 324 L292 656\" stroke=\"#0f1e30\" stroke-width=\"8\"/>\n        </g>\n      </g>\n\n      <g id=\"displayBlock\">\n        <rect x=\"842\" y=\"286\" width=\"288\" height=\"170\" rx=\"18\" fill=\"#d8e1ec\" stroke=\"#6f8097\" stroke-width=\"3\"/>\n        <rect x=\"858\" y=\"302\" width=\"256\" height=\"138\" rx=\"14\" fill=\"url(#darkPanel)\" stroke=\"#7ed0ff\" stroke-opacity=\".46\" stroke-width=\"2.5\"/>\n        <path d=\"M866 310 H988 L956 432 H866 Z\" fill=\"#ffffff\" opacity=\".09\"/>\n        <text x=\"884\" y=\"334\" font-size=\"14\" fill=\"#7dbdff\" font-family=\"monospace\">POWER</text>\n        <text id=\"powerValueDisplay\" x=\"884\" y=\"378\" font-size=\"42\" fill=\"#eaf8ff\" font-family=\"monospace\" font-weight=\"700\">1.80 kW</text>\n        <text x=\"884\" y=\"404\" font-size=\"13\" fill=\"#7dbdff\" font-family=\"monospace\">FAN SPEED</text>\n        <text id=\"fanSpeedDisplay\" x=\"1090\" y=\"404\" font-size=\"13\" fill=\"#cfefff\" font-family=\"monospace\" text-anchor=\"end\">900 RPM</text>\n        <rect x=\"884\" y=\"414\" width=\"206\" height=\"12\" rx=\"6\" fill=\"#203244\"/>\n        <rect id=\"fanSpeedBar\" x=\"884\" y=\"414\" width=\"103\" height=\"12\" rx=\"6\" fill=\"#36a4ff\"/>\n        <rect x=\"884\" y=\"414\" width=\"206\" height=\"12\" rx=\"6\" fill=\"none\" stroke=\"#5caeff\" stroke-opacity=\".22\" stroke-width=\"1.5\"/>\n      </g>\n\n      <g id=\"ventSlots\" fill=\"#0a1118\" stroke=\"#7d8c9f\" stroke-width=\"2.5\">\n        <rect x=\"884\" y=\"552\" width=\"228\" height=\"32\" rx=\"16\"/>\n        <rect x=\"884\" y=\"620\" width=\"228\" height=\"32\" rx=\"16\"/>\n        <rect x=\"884\" y=\"688\" width=\"228\" height=\"32\" rx=\"16\"/>\n      </g>\n      <g id=\"ventMeshes\" fill=\"#141f2c\" opacity=\".82\">\n        <rect x=\"896\" y=\"560\" width=\"204\" height=\"16\" rx=\"8\"/>\n        <rect x=\"896\" y=\"628\" width=\"204\" height=\"16\" rx=\"8\"/>\n        <rect x=\"896\" y=\"696\" width=\"204\" height=\"16\" rx=\"8\"/>\n      </g>\n\n      <g id=\"screws\">\n        <circle cx=\"126\" cy=\"806\" r=\"10\" fill=\"#39495f\" stroke=\"#dce9f9\" stroke-width=\"2.2\"/>\n        <circle cx=\"126\" cy=\"806\" r=\"4\" fill=\"#08111a\"/>\n        <circle cx=\"850\" cy=\"806\" r=\"10\" fill=\"#39495f\" stroke=\"#dce9f9\" stroke-width=\"2.2\"/>\n        <circle cx=\"850\" cy=\"806\" r=\"4\" fill=\"#08111a\"/>\n        <circle cx=\"1124\" cy=\"806\" r=\"10\" fill=\"#39495f\" stroke=\"#dce9f9\" stroke-width=\"2.2\"/>\n        <circle cx=\"1124\" cy=\"806\" r=\"4\" fill=\"#08111a\"/>\n      </g>\n\n      <g id=\"feet\">\n        <path d=\"M200 826 H320 L296 892 H176 Z\" fill=\"url(#footGrad)\" stroke=\"#bde0ff\" stroke-width=\"3\"/>\n        <path d=\"M904 826 H1024 L1000 892 H880 Z\" fill=\"url(#footGrad)\" stroke=\"#bde0ff\" stroke-width=\"3\"/>\n        <rect x=\"174\" y=\"892\" width=\"126\" height=\"18\" rx=\"6\" fill=\"#2296ff\" opacity=\".82\" filter=\"url(#softGlow)\"/>\n        <rect x=\"878\" y=\"892\" width=\"126\" height=\"18\" rx=\"6\" fill=\"#2296ff\" opacity=\".82\" filter=\"url(#softGlow)\"/>\n      </g>\n",
  gasBoiler: "\n<defs>\n        <linearGradient id=\"bodyGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#f8fbff\"/>\n          <stop offset=\".24\" stop-color=\"#eef2f7\"/>\n          <stop offset=\".58\" stop-color=\"#d7dde7\"/>\n          <stop offset=\"1\" stop-color=\"#c3cbd7\"/>\n        </linearGradient>\n        <linearGradient id=\"bodySide\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#cdd5e0\"/>\n          <stop offset=\".5\" stop-color=\"#eef4fb\"/>\n          <stop offset=\"1\" stop-color=\"#b6c0ce\"/>\n        </linearGradient>\n        <linearGradient id=\"metalGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#2b3748\"/>\n          <stop offset=\".3\" stop-color=\"#7f92ab\"/>\n          <stop offset=\".55\" stop-color=\"#e4edf8\"/>\n          <stop offset=\"1\" stop-color=\"#253344\"/>\n        </linearGradient>\n        <linearGradient id=\"darkScreen\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#07101b\"/>\n          <stop offset=\"1\" stop-color=\"#02070f\"/>\n        </linearGradient>\n        <linearGradient id=\"screenReflect\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#ffffff\" stop-opacity=\".15\"/>\n          <stop offset=\"1\" stop-color=\"#ffffff\" stop-opacity=\"0\"/>\n        </linearGradient>\n        <linearGradient id=\"flameOuter\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#90f5ff\"/>\n          <stop offset=\".45\" stop-color=\"#19b8ff\"/>\n          <stop offset=\"1\" stop-color=\"#0056ff\"/>\n        </linearGradient>\n        <linearGradient id=\"flameInner\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#e9ffff\"/>\n          <stop offset=\"1\" stop-color=\"#3fd7ff\"/>\n        </linearGradient>\n        <filter id=\"blueGlow\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"160%\"><feGaussianBlur stdDeviation=\"10\"/></filter>\n        <filter id=\"softGlow\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"160%\"><feGaussianBlur stdDeviation=\"5\"/></filter>\n      </defs>\n\n      <g id=\"aura\">\n        <path id=\"gasAuraOutline\" d=\"M230 92 H874 Q940 92 940 158 V1138 Q940 1204 874 1204 H230 Q164 1204 164 1138 V158 Q164 92 230 92 Z\" fill=\"none\" stroke=\"#2ca7ff\" stroke-opacity=\"0.12\" stroke-width=\"18\" filter=\"url(#blueGlow)\"/>\n      </g>\n\n      <g id=\"flueTop\">\n        <rect x=\"495\" y=\"52\" width=\"136\" height=\"58\" rx=\"18\" fill=\"url(#metalGrad)\" stroke=\"#d4ebff\" stroke-width=\"4\"/>\n        <rect x=\"516\" y=\"28\" width=\"94\" height=\"36\" rx=\"12\" fill=\"url(#metalGrad)\" stroke=\"#d4ebff\" stroke-width=\"3\"/>\n      </g>\n\n      <g id=\"boilerBody\">\n        <path d=\"M230 92 H874 Q940 92 940 158 V1138 Q940 1204 874 1204 H230 Q164 1204 164 1138 V158 Q164 92 230 92 Z\" fill=\"url(#bodyGrad)\" stroke=\"#f8fbff\" stroke-width=\"4\"/>\n        <path d=\"M180 154 Q180 106 228 106 H252 V1136 H228 Q180 1136 180 1088 Z\" fill=\"#f0f5fa\" opacity=\".72\"/>\n        <path d=\"M884 106 H904 Q924 106 932 122 Q940 138 940 164 V1128 Q940 1182 894 1194 L884 1196 Z\" fill=\"#bfc9d6\" opacity=\".72\"/>\n        <path d=\"M260 116 C352 108 680 104 848 120\" fill=\"none\" stroke=\"#ffffff\" stroke-opacity=\".42\" stroke-width=\"6\" stroke-linecap=\"round\"/>\n        <path d=\"M364 130 L620 858\" stroke=\"#ffffff\" stroke-opacity=\".18\" stroke-width=\"5\"/>\n        <line x1=\"164\" y1=\"988\" x2=\"940\" y2=\"988\" stroke=\"#8093ac\" stroke-opacity=\".5\" stroke-width=\"4\"/>\n      </g>\n\n      <g id=\"frontIcon\" transform=\"translate(-60 0)\" opacity=\"0.90\">\n        <g id=\"frontIconGlow\" opacity=\"0.32\">\n          <path d=\"M584 560 C578 606 566 642 546 674 C522 712 516 746 528 776 C544 816 578 838 620 834 C668 830 706 794 708 746 C710 706 690 674 658 634 C632 602 608 576 584 560 Z\" fill=\"#1fa6ff\" filter=\"url(#blueGlow)\"/>\n        </g>\n        <path d=\"M584 560 C578 606 566 642 546 674 C522 712 516 746 528 776 C544 816 578 838 620 834 C668 830 706 794 708 746 C710 706 690 674 658 634 C632 602 608 576 584 560 Z\" fill=\"url(#flameOuter)\" stroke=\"#88f5ff\" stroke-width=\"4\"/>\n        <path d=\"M592 600 C590 632 580 658 564 684 C546 712 544 738 554 760 C566 788 590 802 620 800 C652 798 678 772 680 744 C682 716 668 692 646 664 C628 642 610 620 592 600 Z\" fill=\"url(#flameInner)\" opacity=\".96\"/>\n        <path d=\"M586 658 C574 684 572 712 578 736 C586 716 598 694 614 678 C604 668 594 662 586 658 Z\" fill=\"#ffffff\" opacity=\".72\"/>\n      </g>\n\n      <g id=\"displayFrame\">\n        <rect x=\"428\" y=\"1040\" width=\"292\" height=\"114\" rx=\"18\" fill=\"#d9e4ef\" stroke=\"#4d627b\" stroke-width=\"3\"/>\n        <rect x=\"440\" y=\"1052\" width=\"268\" height=\"90\" rx=\"14\" fill=\"url(#darkScreen)\" stroke=\"#1eb5ff\" stroke-opacity=\".6\" stroke-width=\"2.6\"/>\n        <path d=\"M448 1060 H570 L548 1140 H448 Z\" fill=\"url(#screenReflect)\"/>\n\n        <line x1=\"528\" y1=\"1062\" x2=\"528\" y2=\"1132\" stroke=\"#13344e\" stroke-opacity=\".85\" stroke-width=\"2\"/>\n        <line x1=\"620\" y1=\"1062\" x2=\"620\" y2=\"1132\" stroke=\"#13344e\" stroke-opacity=\".85\" stroke-width=\"2\"/>\n\n        <g id=\"gasBarsGroup\">\n          <rect id=\"barLevel4\" x=\"456\" y=\"1068\" width=\"58\" height=\"10\" rx=\"5\" fill=\"#ff3434\" opacity=\"0.16\"/>\n          <rect id=\"barLevel3\" x=\"464\" y=\"1086\" width=\"50\" height=\"10\" rx=\"5\" fill=\"#ff982a\" opacity=\"0.16\"/>\n          <rect id=\"barLevel2\" x=\"472\" y=\"1104\" width=\"42\" height=\"10\" rx=\"5\" fill=\"#59d44e\" opacity=\"1\"/>\n          <rect id=\"barLevel1\" x=\"480\" y=\"1122\" width=\"34\" height=\"10\" rx=\"5\" fill=\"#31a8ff\" opacity=\"1\"/>\n        </g>\n\n        <g id=\"displayFlameGroup\" transform=\"translate(575 1132) scale(0.2857) translate(-596 -1154)\" opacity=\"1\">\n          <g id=\"displayFlameGlow\" opacity=\"0.27\">\n            <path d=\"M575 1122 C572 1110 572 1097 575 1082 C579 1062 587 1044 596 1028 C605 1044 613 1062 617 1082 C620 1097 620 1110 617 1122 C613 1138 605 1150 596 1154 C587 1150 579 1138 575 1122 Z\" fill=\"#18a8ff\" filter=\"url(#softGlow)\"/>\n          </g>\n          <path id=\"displayFlameOuter\" d=\"M575 1122 C572 1110 572 1097 575 1082 C579 1062 587 1044 596 1028 C605 1044 613 1062 617 1082 C620 1097 620 1110 617 1122 C613 1138 605 1150 596 1154 C587 1150 579 1138 575 1122 Z\" fill=\"url(#flameOuter)\"/>\n          <path id=\"displayFlameInner\" d=\"M581 1120 C579 1111 579 1100 581 1088 C584 1072 590 1058 596 1046 C602 1058 608 1072 611 1088 C613 1100 613 1111 611 1120 C608 1132 602 1141 596 1144 C590 1141 584 1132 581 1120 Z\" fill=\"url(#flameInner)\" opacity=\".94\"/>\n          <path d=\"M588 1099 C588 1087 591 1076 596 1066 C594 1081 594 1093 595 1104 C592 1102 590 1100 588 1099 Z\" fill=\"#ffffff\" opacity=\".62\"/>\n        </g>\n\n        <g id=\"tempGroup\">\n          <text x=\"640\" y=\"1080\" font-size=\"11\" fill=\"#76caff\" font-family=\"monospace\">TEMP</text>\n          <text id=\"tempValueDisplay\" x=\"640\" y=\"1124\" font-size=\"34\" fill=\"#eff9ff\" font-family=\"monospace\" font-weight=\"700\">65.0°</text>\n          <text x=\"694\" y=\"1122\" font-size=\"16\" fill=\"#7fd2ff\" font-family=\"monospace\">C</text>\n        </g>\n      </g>\n\n      <g id=\"bottomConnectors\">\n        <g transform=\"translate(296 1214)\">\n          <rect x=\"0\" y=\"0\" width=\"64\" height=\"74\" rx=\"10\" fill=\"url(#metalGrad)\" stroke=\"#d4ebff\" stroke-width=\"3\"/>\n          <rect x=\"8\" y=\"60\" width=\"48\" height=\"12\" rx=\"4\" fill=\"#1fb4ff\" opacity=\".7\" filter=\"url(#softGlow)\"/>\n        </g>\n        <g transform=\"translate(680 1214)\">\n          <rect x=\"0\" y=\"0\" width=\"64\" height=\"74\" rx=\"10\" fill=\"url(#metalGrad)\" stroke=\"#d4ebff\" stroke-width=\"3\"/>\n          <rect x=\"8\" y=\"60\" width=\"48\" height=\"12\" rx=\"4\" fill=\"#1fb4ff\" opacity=\".7\" filter=\"url(#softGlow)\"/>\n        </g>\n      </g>\n",
  electricBoiler: "\n<defs>\n        <linearGradient id=\"bodyGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#f8fbff\"/>\n          <stop offset=\".24\" stop-color=\"#eef2f7\"/>\n          <stop offset=\".58\" stop-color=\"#d7dde7\"/>\n          <stop offset=\"1\" stop-color=\"#bcc7d5\"/>\n        </linearGradient>\n        <linearGradient id=\"bodyShade\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#d5dde8\"/>\n          <stop offset=\".5\" stop-color=\"#ffffff\"/>\n          <stop offset=\"1\" stop-color=\"#bac4d4\"/>\n        </linearGradient>\n        <linearGradient id=\"panelDark\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#111b2b\"/>\n          <stop offset=\"1\" stop-color=\"#060d16\"/>\n        </linearGradient>\n        <linearGradient id=\"metalGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#283546\"/>\n          <stop offset=\".25\" stop-color=\"#7c90ab\"/>\n          <stop offset=\".55\" stop-color=\"#f0f6ff\"/>\n          <stop offset=\"1\" stop-color=\"#2a3648\"/>\n        </linearGradient>\n        <linearGradient id=\"waterDropOuter\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#7ff7ff\"/>\n          <stop offset=\".4\" stop-color=\"#19b4ff\"/>\n          <stop offset=\"1\" stop-color=\"#0a4eff\"/>\n        </linearGradient>\n        <linearGradient id=\"waterDropInner\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#eefcff\"/>\n          <stop offset=\"1\" stop-color=\"#57d8ff\"/>\n        </linearGradient>\n        <linearGradient id=\"lightningGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#fff4a9\"/>\n          <stop offset=\".4\" stop-color=\"#ffd233\"/>\n          <stop offset=\"1\" stop-color=\"#ff9f00\"/>\n        </linearGradient>\n        <linearGradient id=\"ringHeat\" gradientUnits=\"userSpaceOnUse\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#ff3b1f\"/>\n          <stop offset=\".55\" stop-color=\"#ffb000\"/>\n          <stop offset=\"1\" stop-color=\"#ffe66a\"/>\n        </linearGradient>\n        <filter id=\"blueGlow\" x=\"-40%\" y=\"-40%\" width=\"180%\" height=\"180%\"><feGaussianBlur stdDeviation=\"12\"/></filter>\n        <filter id=\"softGlow\" x=\"-40%\" y=\"-40%\" width=\"180%\" height=\"180%\"><feGaussianBlur stdDeviation=\"6\"/></filter>\n        <filter id=\"warmGlow\" x=\"-40%\" y=\"-40%\" width=\"180%\" height=\"180%\"><feGaussianBlur stdDeviation=\"10\"/></filter>\n      </defs>\n\n      <g id=\"aura\">\n        <path d=\"M236 132 H848 Q926 132 926 210 V1244 Q926 1322 848 1322 H236 Q158 1322 158 1244 V210 Q158 132 236 132 Z\" fill=\"none\" stroke=\"#28a6ff\" stroke-opacity=\".25\" stroke-width=\"20\" filter=\"url(#blueGlow)\"/>\n      </g>\n\n      <g id=\"bodyGroup\">\n        <path id=\"bodyShape\" d=\"M236 132 H848 Q926 132 926 210 V1244 Q926 1322 848 1322 H236 Q158 1322 158 1244 V210 Q158 132 236 132 Z\" fill=\"url(#bodyGrad)\" stroke=\"#f6fbff\" stroke-width=\"4\"/>\n        <path d=\"M176 220 Q176 160 232 160 H264 V1260 H230 Q176 1260 176 1206 Z\" fill=\"#ffffff\" opacity=\".42\"/>\n        <path d=\"M842 160 H876 Q906 160 918 180 Q930 200 930 232 V1228 Q930 1284 880 1300 L842 1308 Z\" fill=\"#b7c3d4\" opacity=\".55\"/>\n        <path d=\"M250 160 C390 148 670 146 834 162\" stroke=\"#ffffff\" stroke-opacity=\".46\" stroke-width=\"7\" fill=\"none\" stroke-linecap=\"round\"/>\n        <path d=\"M368 162 L626 938\" stroke=\"#ffffff\" stroke-opacity=\".16\" stroke-width=\"6\"/>\n        <line x1=\"158\" y1=\"1018\" x2=\"926\" y2=\"1018\" stroke=\"#6e8098\" stroke-opacity=\".55\" stroke-width=\"4\"/>\n      </g>\n\n      <g id=\"lightningGroup\" transform=\"translate(-5 -30)\">\n        <path id=\"lightningGlow\" d=\"M575 468 L639 468 L607 576 L692 576 L544 786 L582 642 L488 642 Z\" fill=\"#ffcb34\" opacity=\"0.25\" filter=\"url(#warmGlow)\"/>\n        <path id=\"lightningBolt\" d=\"M575 468 L639 468 L607 576 L692 576 L544 786 L582 642 L488 642 Z\" fill=\"url(#lightningGrad)\" stroke=\"#fff3b8\" stroke-width=\"3\"/>\n      </g>\n\n      <g id=\"controlPanelGroup\">\n        <rect id=\"controlPanelFrame\" x=\"372\" y=\"780\" width=\"376\" height=\"332\" rx=\"28\" fill=\"#dce6ef\" stroke=\"#51657e\" stroke-width=\"3\"/>\n        <rect id=\"controlPanelInner\" x=\"388\" y=\"796\" width=\"344\" height=\"300\" rx=\"24\" fill=\"url(#panelDark)\" stroke=\"#6fd4ff\" stroke-opacity=\".55\" stroke-width=\"2.6\"/>\n        <path d=\"M400 806 H560 L520 1090 H400 Z\" fill=\"#ffffff\" opacity=\".10\"/>\n\n        <g id=\"powerDisplayGroup\">\n          <rect id=\"powerDisplayFrame\" x=\"448\" y=\"820\" width=\"224\" height=\"58\" rx=\"12\" fill=\"#0a1321\" stroke=\"#67c9ff\" stroke-opacity=\".45\" stroke-width=\"2\"/>\n          <text x=\"470\" y=\"844\" font-size=\"12\" fill=\"#75c9ff\" font-family=\"monospace\">POWER DRAW</text>\n          <text id=\"powerKwDisplay\" x=\"470\" y=\"868\" font-size=\"30\" fill=\"#eef9ff\" font-family=\"monospace\" font-weight=\"700\">3.20 kW</text>\n        </g>\n\n        <g id=\"ringGroup\">\n          <circle id=\"ringBg\" cx=\"560\" cy=\"960\" r=\"62\" fill=\"none\" stroke=\"#203043\" stroke-width=\"16\" stroke-linecap=\"round\" transform=\"rotate(-218.4 560 960)\" stroke-dasharray=\"281.35 389.56\"/>\n          <g id=\"powerRing\"></g>\n          <g id=\"tickMarks\" opacity=\".55\"></g>\n          <circle id=\"knobOuter\" cx=\"560\" cy=\"960\" r=\"48\" fill=\"#09111b\" stroke=\"#8dc8ff\" stroke-opacity=\".28\" stroke-width=\"3\"/>\n          <circle id=\"knobInner\" cx=\"560\" cy=\"960\" r=\"38\" fill=\"url(#metalGrad)\" stroke=\"#243548\" stroke-width=\"3\"/>\n          <path id=\"knobIndicator\" d=\"M560 960 L560 924\" stroke=\"#eaf8ff\" stroke-width=\"6\" stroke-linecap=\"round\" transform=\"rotate(0 560 960)\"/>\n          <circle id=\"knobHub\" cx=\"560\" cy=\"960\" r=\"9\" fill=\"#20354d\"/>\n          <text id=\"powerPercentText\" x=\"560\" y=\"968\" font-size=\"19\" fill=\"#d6f2ff\" font-family=\"monospace\" font-weight=\"700\" text-anchor=\"middle\">40%</text>\n        </g>\n\n        <g id=\"waterDisplayGroup\">\n          <rect id=\"waterDisplayFrame\" x=\"430\" y=\"1036\" width=\"260\" height=\"46\" rx=\"12\" fill=\"#0a1321\" stroke=\"#67c9ff\" stroke-opacity=\".45\" stroke-width=\"2\"/>\n<text x=\"526\" y=\"1048\" font-size=\"11\" fill=\"#75c9ff\" font-family=\"monospace\">WATER TEMP</text>\n          <text id=\"waterTempDisplay\" x=\"560\" y=\"1074\" font-size=\"28\" fill=\"#eef9ff\" font-family=\"monospace\" font-weight=\"700\" text-anchor=\"middle\">52.0°C</text>\n        </g>\n      </g>\n\n      <g id=\"connectorsGroup\">\n        <g id=\"leftConnector\" transform=\"translate(340 1320)\">\n          <rect x=\"0\" y=\"0\" width=\"70\" height=\"90\" rx=\"12\" fill=\"url(#metalGrad)\" stroke=\"#d4ebff\" stroke-width=\"3\"/>\n          <rect x=\"10\" y=\"74\" width=\"50\" height=\"12\" rx=\"4\" fill=\"#1fb4ff\" opacity=\".7\" filter=\"url(#softGlow)\"/>\n        </g>\n        <g id=\"rightConnector\" transform=\"translate(686 1320)\">\n          <rect x=\"0\" y=\"0\" width=\"76\" height=\"100\" rx=\"12\" fill=\"#b88b33\" stroke=\"#ffe3a4\" stroke-width=\"3\"/>\n          <rect x=\"10\" y=\"82\" width=\"56\" height=\"12\" rx=\"4\" fill=\"#1fb4ff\" opacity=\".7\" filter=\"url(#softGlow)\"/>\n        </g>\n      </g>\n",
  fireplace: "\n<defs>\n        <linearGradient id=\"bodyGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#3a424d\"/>\n          <stop offset=\".18\" stop-color=\"#212933\"/>\n          <stop offset=\".48\" stop-color=\"#0b121a\"/>\n          <stop offset=\".76\" stop-color=\"#111923\"/>\n          <stop offset=\"1\" stop-color=\"#2f3742\"/>\n        </linearGradient>\n        <linearGradient id=\"bodySideGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#2b3440\"/>\n          <stop offset=\".22\" stop-color=\"#0f151d\"/>\n          <stop offset=\".5\" stop-color=\"#0a1017\"/>\n          <stop offset=\".78\" stop-color=\"#151d27\"/>\n          <stop offset=\"1\" stop-color=\"#303946\"/>\n        </linearGradient>\n        <linearGradient id=\"metalGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#5e6872\"/>\n          <stop offset=\".18\" stop-color=\"#9ca4ad\"/>\n          <stop offset=\".5\" stop-color=\"#2e3742\"/>\n          <stop offset=\".82\" stop-color=\"#0b1118\"/>\n          <stop offset=\"1\" stop-color=\"#3d4650\"/>\n        </linearGradient>\n        <linearGradient id=\"glassGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#404654\" stop-opacity=\".76\"/>\n          <stop offset=\".3\" stop-color=\"#1a2028\" stop-opacity=\".60\"/>\n          <stop offset=\".72\" stop-color=\"#090d12\" stop-opacity=\".84\"/>\n          <stop offset=\"1\" stop-color=\"#030507\" stop-opacity=\".95\"/>\n        </linearGradient>\n        <linearGradient id=\"displayGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#08131f\"/>\n          <stop offset=\"1\" stop-color=\"#02070d\"/>\n        </linearGradient>\n        <linearGradient id=\"screenShine\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#ffffff\" stop-opacity=\".10\"/>\n          <stop offset=\".6\" stop-color=\"#ffffff\" stop-opacity=\"0\"/>\n          <stop offset=\"1\" stop-color=\"#ffffff\" stop-opacity=\".04\"/>\n        </linearGradient>\n        <filter id=\"blueGlow\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\"><feGaussianBlur stdDeviation=\"10\"/></filter>\n        <filter id=\"softGlow\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\"><feGaussianBlur stdDeviation=\"6\"/></filter>\n      <clipPath id=\"fireClip\"><rect x=\"400\" y=\"448\" width=\"400\" height=\"420\" rx=\"12\"/></clipPath></defs>\n\n      <g id=\"auraGroup\">\n        <path d=\"M350 162 H850 Q906 162 906 218 V1096 Q906 1154 850 1154 H350 Q294 1154 294 1096 V218 Q294 162 350 162 Z\" fill=\"none\" stroke=\"#2aa6ff\" stroke-opacity=\".28\" stroke-width=\"18\" filter=\"url(#blueGlow)\"/>\n        <ellipse cx=\"600\" cy=\"1172\" rx=\"330\" ry=\"34\" fill=\"#1f6dff\" fill-opacity=\".22\" filter=\"url(#blueGlow)\"/>\n      </g>\n\n      <g id=\"chimneyGroup\">\n        <rect x=\"512\" y=\"52\" width=\"176\" height=\"152\" rx=\"18\" fill=\"url(#bodySideGrad)\" stroke=\"#aeb7c1\" stroke-opacity=\".26\" stroke-width=\"3\"/>\n        <path d=\"M522 58 H678\" stroke=\"#45b9ff\" stroke-width=\"5\" stroke-linecap=\"round\" opacity=\".92\" filter=\"url(#softGlow)\"/>\n        <rect x=\"492\" y=\"202\" width=\"216\" height=\"26\" rx=\"10\" fill=\"#060a0f\" opacity=\".95\"/>\n      </g>\n\n      <g id=\"topCapGroup\">\n        <path d=\"M346 184 H854 L908 210 V286 H292 V210 Z\" fill=\"url(#metalGrad)\" stroke=\"#c2cad3\" stroke-opacity=\".28\" stroke-width=\"3\"/>\n        <path d=\"M354 190 H846\" stroke=\"#48b8ff\" stroke-width=\"4\" stroke-linecap=\"round\" opacity=\".92\" filter=\"url(#softGlow)\"/>\n        <path d=\"M344 282 H856\" stroke=\"#070c12\" stroke-width=\"10\" opacity=\".78\"/>\n      </g>\n\n      <g id=\"bodyGroup\">\n        <path d=\"M354 252 H846 Q900 252 900 306 V1092 Q900 1144 846 1144 H354 Q300 1144 300 1092 V306 Q300 252 354 252 Z\" fill=\"url(#bodyGrad)\" stroke=\"#c1c8d0\" stroke-opacity=\".25\" stroke-width=\"3\"/>\n        <path d=\"M326 304 V1080\" stroke=\"#3d4857\" stroke-opacity=\".26\" stroke-width=\"2\"/>\n        <path d=\"M874 304 V1080\" stroke=\"#0d131c\" stroke-opacity=\".44\" stroke-width=\"2\"/>\n        <path d=\"M318 312 C338 280 356 268 380 266 H820 C858 266 882 284 892 308\" fill=\"none\" stroke=\"#0e151d\" stroke-width=\"10\" opacity=\".64\"/>\n      </g>\n\n      <g id=\"displayGroup\">\n        <rect x=\"528\" y=\"298\" width=\"212\" height=\"68\" rx=\"12\" fill=\"#181d24\" stroke=\"#9ca6b3\" stroke-opacity=\".28\" stroke-width=\"3\"/>\n        <rect x=\"536\" y=\"306\" width=\"196\" height=\"52\" rx=\"10\" fill=\"url(#displayGrad)\" stroke=\"#44b8ff\" stroke-opacity=\".56\" stroke-width=\"2\"/>\n        <text x=\"556\" y=\"326\" font-size=\"11\" font-family=\"monospace\" fill=\"#73ddff\">STOVE TEMP</text>\n        <text id=\"stoveTempDisplay\" x=\"556\" y=\"350\" font-size=\"30\" font-family=\"monospace\" font-weight=\"700\" fill=\"#eef8ff\">65.0°C</text>\n        <g id=\"displayBars\" transform=\"translate(666 316)\">\n          <rect x=\"0\" y=\"18\" width=\"10\" height=\"14\" rx=\"2\" fill=\"#19b8ff\" id=\"displayBar1\" opacity=\".22\"/>\n          <rect x=\"18\" y=\"10\" width=\"10\" height=\"22\" rx=\"2\" fill=\"#28c0ff\" id=\"displayBar2\" opacity=\".22\"/>\n          <rect x=\"36\" y=\"2\" width=\"10\" height=\"30\" rx=\"2\" fill=\"#55d4ff\" id=\"displayBar3\" opacity=\".22\"/>\n          <circle cx=\"70\" cy=\"8\" r=\"3\" fill=\"#44b8ff\"/>\n          <circle cx=\"70\" cy=\"22\" r=\"3\" fill=\"#2875c9\"/>\n        </g>\n      </g>\n\n      <g id=\"windowOuterGroup\">\n        <rect x=\"346\" y=\"394\" width=\"508\" height=\"528\" rx=\"44\" fill=\"#0c1218\" stroke=\"#5d6771\" stroke-width=\"4\"/>\n        <rect x=\"376\" y=\"424\" width=\"448\" height=\"468\" rx=\"30\" fill=\"#060a0d\" stroke=\"#1a222c\" stroke-width=\"4\"/>\n        <rect x=\"400\" y=\"448\" width=\"400\" height=\"420\" rx=\"12\" fill=\"url(#glassGrad)\" stroke=\"#5d1f09\" stroke-opacity=\".20\" stroke-width=\"3\"/>\n        <g id=\"combustionSlot\"></g>\n        <rect x=\"392\" y=\"440\" width=\"416\" height=\"436\" rx=\"16\" fill=\"none\" stroke=\"#1a2129\" stroke-width=\"12\"/>\n        <path d=\"M430 464 H612 L472 860 H430 Z\" fill=\"#ffffff\" opacity=\".10\"/>\n        <path d=\"M676 458 C730 516 754 580 760 652\" fill=\"none\" stroke=\"#ffffff\" stroke-opacity=\".05\" stroke-width=\"18\" stroke-linecap=\"round\"/>\n        <path d=\"M414 460 H786\" stroke=\"#8a2d0d\" stroke-opacity=\".22\" stroke-width=\"4\" stroke-linecap=\"round\"/>\n      </g>\n\n      <g id=\"doorHandleGroup\">\n        <rect x=\"844\" y=\"596\" width=\"14\" height=\"114\" rx=\"7\" fill=\"#090d12\" opacity=\".88\"/>\n        <rect x=\"858\" y=\"584\" width=\"32\" height=\"174\" rx=\"10\" fill=\"url(#metalGrad)\" stroke=\"#d4dce6\" stroke-opacity=\".26\" stroke-width=\"2\"/>\n      </g>\n\n      <g id=\"baseGroup\">\n        <path d=\"M316 1102 H884 L902 1120 V1224 Q902 1238 888 1238 H312 Q298 1238 298 1224 V1120 Z\" fill=\"url(#bodySideGrad)\" stroke=\"#aab3be\" stroke-opacity=\".22\" stroke-width=\"3\"/>\n        <path d=\"M360 1238 H474 L456 1198 H378 Z\" fill=\"#02060a\"/>\n        <path d=\"M726 1238 H840 L824 1198 H744 Z\" fill=\"#02060a\"/>\n      </g>\n",
  radiator: "\n      <defs>\n        <linearGradient id=\"tubeGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#bcc4ce\"/>\n          <stop offset=\".10\" stop-color=\"#f9fbfd\"/>\n          <stop offset=\".32\" stop-color=\"#d5dde6\"/>\n          <stop offset=\".52\" stop-color=\"#f6f7f9\"/>\n          <stop offset=\".76\" stop-color=\"#bcc5d1\"/>\n          <stop offset=\"1\" stop-color=\"#eef2f6\"/>\n        </linearGradient>\n        <linearGradient id=\"headerGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#697481\"/>\n          <stop offset=\".16\" stop-color=\"#e3e8ee\"/>\n          <stop offset=\".46\" stop-color=\"#66717f\"/>\n          <stop offset=\".76\" stop-color=\"#1f2833\"/>\n          <stop offset=\"1\" stop-color=\"#9ca6b1\"/>\n        </linearGradient>\n        <linearGradient id=\"screenGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#08131f\"/>\n          <stop offset=\"1\" stop-color=\"#02070d\"/>\n        </linearGradient>\n        <linearGradient id=\"ringGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n          <stop offset=\"0\" stop-color=\"#21d1ff\"/>\n          <stop offset=\"1\" stop-color=\"#87f0ff\"/>\n        </linearGradient>\n        <linearGradient id=\"redKnobGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#5a0006\"/>\n          <stop offset=\".18\" stop-color=\"#ff6161\"/>\n          <stop offset=\".55\" stop-color=\"#d9141e\"/>\n          <stop offset=\"1\" stop-color=\"#7d0006\"/>\n        </linearGradient>\n        <linearGradient id=\"blueKnobGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\">\n          <stop offset=\"0\" stop-color=\"#03265f\"/>\n          <stop offset=\".18\" stop-color=\"#7edaff\"/>\n          <stop offset=\".55\" stop-color=\"#1374ff\"/>\n          <stop offset=\"1\" stop-color=\"#092f83\"/>\n        </linearGradient>\n        <filter id=\"blueGlow\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\"><feGaussianBlur stdDeviation=\"10\"/></filter>\n        <filter id=\"softGlow\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\"><feGaussianBlur stdDeviation=\"5\"/></filter>\n      </defs>\n\n      <g id=\"auraGroup\"></g>\n\n      <g id=\"radiatorGroup\">\n        <g id=\"hiddenHeaders\" opacity=\".95\">\n          <rect x=\"220\" y=\"290\" width=\"900\" height=\"52\" rx=\"24\" fill=\"url(#headerGrad)\"/>\n          <rect x=\"220\" y=\"748\" width=\"900\" height=\"52\" rx=\"24\" fill=\"url(#headerGrad)\"/>\n        </g>\n        <g id=\"tubesGroup\">\n          <rect x=\"200\" y=\"184\" width=\"102\" height=\"714\" rx=\"50\" fill=\"url(#tubeGrad)\" stroke=\"#ffffff\" stroke-opacity=\".55\" stroke-width=\"3\"/>\n          <rect x=\"334\" y=\"184\" width=\"102\" height=\"714\" rx=\"50\" fill=\"url(#tubeGrad)\" stroke=\"#ffffff\" stroke-opacity=\".55\" stroke-width=\"3\"/>\n          <rect x=\"468\" y=\"184\" width=\"102\" height=\"714\" rx=\"50\" fill=\"url(#tubeGrad)\" stroke=\"#ffffff\" stroke-opacity=\".55\" stroke-width=\"3\"/>\n          <rect x=\"602\" y=\"184\" width=\"102\" height=\"714\" rx=\"50\" fill=\"url(#tubeGrad)\" stroke=\"#ffffff\" stroke-opacity=\".55\" stroke-width=\"3\"/>\n          <rect x=\"736\" y=\"184\" width=\"102\" height=\"714\" rx=\"50\" fill=\"url(#tubeGrad)\" stroke=\"#ffffff\" stroke-opacity=\".55\" stroke-width=\"3\"/>\n          <rect x=\"870\" y=\"184\" width=\"102\" height=\"714\" rx=\"50\" fill=\"url(#tubeGrad)\" stroke=\"#ffffff\" stroke-opacity=\".55\" stroke-width=\"3\"/>\n          <rect x=\"1004\" y=\"184\" width=\"102\" height=\"714\" rx=\"50\" fill=\"url(#tubeGrad)\" stroke=\"#ffffff\" stroke-opacity=\".55\" stroke-width=\"3\"/>\n        </g>\n      </g>\n\n      <g id=\"connectorsGroup\">\n        <g id=\"topValveGroup\">\n          <rect x=\"1100\" y=\"272\" width=\"44\" height=\"88\" rx=\"18\" fill=\"url(#headerGrad)\"/>\n          <polygon points=\"1140,280 1180,280 1192,316 1180,352 1140,352 1128,316\" fill=\"url(#headerGrad)\" stroke=\"#dfe7ef\" stroke-opacity=\".45\" stroke-width=\"2\"/>\n          <rect x=\"1188\" y=\"286\" width=\"36\" height=\"60\" rx=\"12\" fill=\"url(#headerGrad)\"/>\n          <rect x=\"1220\" y=\"260\" width=\"86\" height=\"112\" rx=\"24\" fill=\"url(#redKnobGrad)\" stroke=\"#ffb0b0\" stroke-opacity=\".35\" stroke-width=\"2\"/>\n          <g opacity=\".45\">\n            <path d=\"M1232 266 V366\" stroke=\"#ffedf1\" stroke-width=\"2\"/>\n            <path d=\"M1244 262 V370\" stroke=\"#5a0006\" stroke-width=\"2\"/>\n            <path d=\"M1256 262 V370\" stroke=\"#5a0006\" stroke-width=\"2\"/>\n            <path d=\"M1268 262 V370\" stroke=\"#5a0006\" stroke-width=\"2\"/>\n            <path d=\"M1280 262 V370\" stroke=\"#5a0006\" stroke-width=\"2\"/>\n            <path d=\"M1292 266 V366\" stroke=\"#ffedf1\" stroke-width=\"2\"/>\n          </g>\n        </g>\n        <g id=\"bottomValveGroup\">\n          <rect x=\"1100\" y=\"668\" width=\"44\" height=\"88\" rx=\"18\" fill=\"url(#headerGrad)\"/>\n          <polygon points=\"1140,676 1180,676 1192,712 1180,748 1140,748 1128,712\" fill=\"url(#headerGrad)\" stroke=\"#dfe7ef\" stroke-opacity=\".45\" stroke-width=\"2\"/>\n          <rect x=\"1188\" y=\"682\" width=\"36\" height=\"60\" rx=\"12\" fill=\"url(#headerGrad)\"/>\n          <rect x=\"1220\" y=\"656\" width=\"86\" height=\"112\" rx=\"24\" fill=\"url(#blueKnobGrad)\" stroke=\"#bce8ff\" stroke-opacity=\".35\" stroke-width=\"2\"/>\n          <g opacity=\".42\">\n            <path d=\"M1232 662 V762\" stroke=\"#e4f7ff\" stroke-width=\"2\"/>\n            <path d=\"M1244 658 V766\" stroke=\"#0e2e72\" stroke-width=\"2\"/>\n            <path d=\"M1256 658 V766\" stroke=\"#0e2e72\" stroke-width=\"2\"/>\n            <path d=\"M1268 658 V766\" stroke=\"#0e2e72\" stroke-width=\"2\"/>\n            <path d=\"M1280 658 V766\" stroke=\"#0e2e72\" stroke-width=\"2\"/>\n            <path d=\"M1292 662 V762\" stroke=\"#e4f7ff\" stroke-width=\"2\"/>\n          </g>\n        </g>\n      </g>\n\n      <g id=\"displayMountGroup\">\n        <path d=\"M1096 314 H1038 Q1018 314 1018 334 V366\" fill=\"none\" stroke=\"#394657\" stroke-width=\"14\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n      </g>\n\n      <g id=\"displayGroup\">\n        <rect x=\"820\" y=\"278\" width=\"280\" height=\"154\" rx=\"24\" fill=\"#cad5df\" stroke=\"#f2f7fb\" stroke-width=\"3\"/>\n        <rect x=\"834\" y=\"292\" width=\"252\" height=\"126\" rx=\"18\" fill=\"url(#screenGrad)\" stroke=\"#39b9ff\" stroke-opacity=\".45\" stroke-width=\"2\"/>\n        <text x=\"854\" y=\"314\" font-size=\"12\" font-family=\"monospace\" fill=\"#76ddff\">VALVE CONTROL</text>\n        <text id=\"valveStatus\" x=\"958\" y=\"314\" font-size=\"14\" font-family=\"monospace\" font-weight=\"700\" fill=\"#76ddff\">OPEN</text>\n\n        <g id=\"barsGroup\" transform=\"translate(856 348)\">\n          <rect id=\"bar1\" x=\"0\" y=\"45\" width=\"40\" height=\"12\" rx=\"5\" fill=\"#28c0ff\"/>\n          <rect id=\"bar2\" x=\"0\" y=\"25\" width=\"60\" height=\"12\" rx=\"5\" fill=\"#3de060\"/>\n          <rect id=\"bar3\" x=\"0\" y=\"5\" width=\"80\" height=\"12\" rx=\"5\" fill=\"#ffb12a\"/>\n          <rect id=\"bar4\" x=\"0\" y=\"-15\" width=\"100\" height=\"12\" rx=\"5\" fill=\"#ff5136\"/>\n        </g>\n\n        <text x=\"998\" y=\"330\" font-size=\"11\" font-family=\"monospace\" fill=\"#78dcff\">OPEN LEVEL</text>\n        <text id=\"openText\" x=\"1030\" y=\"355\" text-anchor=\"middle\" font-size=\"31\" font-family=\"monospace\" font-weight=\"700\" fill=\"#edf8ff\">42%</text>\n        <text x=\"1032\" y=\"366\" font-size=\"11\" font-family=\"monospace\" fill=\"#78dcff\">TEMP</text>\n        <text id=\"tempText\" x=\"1023\" y=\"404\" text-anchor=\"middle\" font-size=\"48\" font-family=\"monospace\" font-weight=\"700\" fill=\"#edf8ff\">55°</text>\n\n      </g>\n    ",
  manifold: "\n<!-- Editable master artwork. Edit the grouped shapes below, not generated JS. -->\n<defs>\n  <linearGradient id=\"mf-brass\" x2=\"0\" y2=\"1\">\n    <stop stop-color=\"#fff0a9\"/><stop offset=\".15\" stop-color=\"#c78c30\"/>\n    <stop offset=\".43\" stop-color=\"#f2cd72\"/><stop offset=\".75\" stop-color=\"#ad6e20\"/>\n    <stop offset=\"1\" stop-color=\"#f3cf7d\"/>\n  </linearGradient>\n  <linearGradient id=\"mf-steel\" x2=\"1\" y2=\"0\">\n    <stop stop-color=\"#dceaf4\"/><stop offset=\".17\" stop-color=\"#79889a\"/>\n    <stop offset=\".5\" stop-color=\"#3b4859\"/><stop offset=\".8\" stop-color=\"#a6b7c9\"/>\n    <stop offset=\"1\" stop-color=\"#edf6ff\"/>\n  </linearGradient>\n  <linearGradient id=\"mf-glass\" x2=\"1\" y2=\".1\">\n    <stop stop-color=\"#cfeaff\" stop-opacity=\".7\"/><stop offset=\".22\" stop-color=\"#528cc6\" stop-opacity=\".12\"/>\n    <stop offset=\".7\" stop-color=\"#0c2846\" stop-opacity=\".18\"/>\n    <stop offset=\"1\" stop-color=\"#e7f9ff\" stop-opacity=\".72\"/>\n  </linearGradient>\n  <linearGradient id=\"mf-red\" x2=\"0\" y2=\"1\">\n    <stop stop-color=\"#ff9890\"/><stop offset=\".45\" stop-color=\"#ec3a39\"/><stop offset=\"1\" stop-color=\"#a51723\"/>\n  </linearGradient>\n  <linearGradient id=\"mf-blue\" x2=\"0\" y2=\"1\">\n    <stop stop-color=\"#c3e6ff\"/><stop offset=\".3\" stop-color=\"#4aaeff\"/><stop offset=\"1\" stop-color=\"#1857a9\"/>\n  </linearGradient>\n  <linearGradient id=\"mf-screen\" x2=\"1\" y2=\"1\">\n    <stop stop-color=\"#172e45\"/><stop offset=\".6\" stop-color=\"#06121f\"/><stop offset=\"1\" stop-color=\"#1a3850\"/>\n  </linearGradient>\n  <filter id=\"mf-shadow\" x=\"-20%\" y=\"-35%\" width=\"140%\" height=\"180%\">\n    <feDropShadow dx=\"0\" dy=\"7\" stdDeviation=\"8\" flood-color=\"#01060a\" flood-opacity=\".4\"/>\n  </filter>\n\n  <!-- Rails are made of scalable middle section and two fixed-size caps. -->\n  <g id=\"mf-rail-middle\">\n    <rect x=\"0\" y=\"0\" width=\"1\" height=\"58\" fill=\"url(#mf-brass)\"/>\n    <path d=\"M0 11 H1\" stroke=\"#fffbd1\" stroke-opacity=\".5\" stroke-width=\"7\"/>\n    <path d=\"M0 49 H1\" stroke=\"#6c431a\" stroke-opacity=\".45\" stroke-width=\"4\"/>\n  </g>\n  <g id=\"mf-rail-start\">\n    <rect x=\"-18\" y=\"8\" width=\"20\" height=\"42\" rx=\"5\" fill=\"url(#mf-steel)\" stroke=\"#a9b8cb\"/>\n  </g>\n  <g id=\"mf-rail-end\">\n    <rect x=\"-2\" y=\"8\" width=\"20\" height=\"42\" rx=\"5\" fill=\"url(#mf-steel)\" stroke=\"#a9b8cb\"/>\n  </g>\n  <g id=\"mf-supply-mark\">\n    <rect x=\"12\" y=\"19\" width=\"52\" height=\"19\" rx=\"8\" fill=\"#d93837\" fill-opacity=\".86\"/>\n  </g>\n  <g id=\"mf-return-mark\">\n    <rect x=\"12\" y=\"19\" width=\"52\" height=\"19\" rx=\"8\" fill=\"#277fd7\" fill-opacity=\".86\"/>\n  </g>\n\n  <!-- Each supply/return pair is vertically aligned in its circuit. -->\n  <g id=\"mf-outlet-upper\">\n    <path d=\"M0 0 V25\" stroke=\"#9ca9b6\" stroke-width=\"13\" stroke-linecap=\"round\"/>\n    <circle cx=\"0\" cy=\"0\" r=\"7\" fill=\"#c8dae9\"/>\n  </g>\n  <g id=\"mf-outlet-lower\">\n    <path d=\"M0 -22 V0\" stroke=\"#9ca9b6\" stroke-width=\"13\" stroke-linecap=\"round\"/>\n    <circle cx=\"0\" cy=\"0\" r=\"7\" fill=\"#c8dae9\"/>\n  </g>\n\n  <!-- Dynamic items have stable ids used by manifold.js for numeric binding. -->\n  <g id=\"mf-flowmeter-template\">\n    <rect x=\"-19\" y=\"-15\" width=\"38\" height=\"25\" rx=\"6\" fill=\"url(#mf-steel)\" stroke=\"#c9d1d9\"/>\n    <path d=\"M-23 -15 L-16 -26 H16 L23 -15Z\" fill=\"#d6a75a\" stroke=\"#ffdf91\"/>\n    <rect x=\"-15\" y=\"-104\" width=\"30\" height=\"77\" rx=\"7\" fill=\"#112b3d\" stroke=\"#ebf5ff\"/>\n    <rect id=\"mf-flow-fill\" x=\"-11\" y=\"-27\" width=\"22\" height=\"0\" rx=\"3\" fill=\"#58baff\" fill-opacity=\".68\"/>\n    <rect x=\"-15\" y=\"-104\" width=\"30\" height=\"77\" rx=\"7\" fill=\"url(#mf-glass)\" stroke=\"#c0d7e5\"/>\n    <path d=\"M-8 -98 V-33\" stroke=\"#fff\" stroke-opacity=\".6\" stroke-width=\"3\"/>\n    <path d=\"M7 -36 h6\" stroke=\"#e6f9ff\" stroke-width=\"1\"/><path d=\"M7 -50 h6\" stroke=\"#e6f9ff\" stroke-width=\"1\"/><path d=\"M7 -64 h6\" stroke=\"#e6f9ff\" stroke-width=\"1\"/><path d=\"M7 -78 h6\" stroke=\"#e6f9ff\" stroke-width=\"1\"/><path d=\"M7 -92 h6\" stroke=\"#e6f9ff\" stroke-width=\"1\"/>\n    <text id=\"mf-flow-text\" x=\"0\" y=\"-160\" text-anchor=\"middle\" fill=\"#95dfff\" font-family=\"Arial,sans-serif\" font-size=\"13\" font-weight=\"700\">1.6 l/min</text>\n    <rect x=\"-29\" y=\"-7\" width=\"58\" height=\"17\" rx=\"6\" fill=\"url(#mf-red)\" stroke=\"#f6a7a5\"/>\n    <path d=\"M-19 -3 H19\" stroke=\"#ffcebd\" stroke-opacity=\".65\" stroke-width=\"2\"/>\n  </g>\n\n  <!-- Longer straight stub for the manual valve, whose housing ends higher. -->\n  <g id=\"mf-outlet-lower-manual\">\n    <path d=\"M0 -65 V0\" stroke=\"#9ca9b6\" stroke-width=\"13\" stroke-linecap=\"round\"/>\n    <circle cx=\"0\" cy=\"0\" r=\"7\" fill=\"#c8dae9\"/>\n  </g>\n  <g id=\"mf-valve-manual\">\n    <path d=\"M-21 0 L-16 16 H16 L21 0Z\" fill=\"url(#mf-steel)\" stroke=\"#d4e1e9\"/>\n    <rect x=\"-11\" y=\"15\" width=\"22\" height=\"30\" rx=\"5\" fill=\"url(#mf-steel)\" stroke=\"#bbc9d6\"/>\n    <rect x=\"-25\" y=\"38\" width=\"50\" height=\"29\" rx=\"11\" fill=\"url(#mf-blue)\" stroke=\"#bddfff\"/>\n    <path d=\"M-18 50 H18\" stroke=\"#d3ebff\" stroke-width=\"2\"/>\n  </g>\n  <g id=\"mf-valve-actuator\">\n    <path d=\"M-21 0 L-16 16 H16 L21 0Z\" fill=\"url(#mf-steel)\" stroke=\"#d4e1e9\"/>\n    <rect x=\"-11\" y=\"15\" width=\"22\" height=\"30\" rx=\"5\" fill=\"url(#mf-steel)\" stroke=\"#bbc9d6\"/>\n    <rect x=\"-27\" y=\"39\" width=\"54\" height=\"71\" rx=\"13\" fill=\"url(#mf-steel)\" stroke=\"#dce9f4\"/>\n    <rect x=\"-27\" y=\"75\" width=\"54\" height=\"13\" fill=\"url(#mf-blue)\"/>\n    <rect x=\"-21\" y=\"46\" width=\"42\" height=\"23\" rx=\"7\" fill=\"#daeaf6\"/>\n    <text x=\"0\" y=\"63\" fill=\"#1c496e\" text-anchor=\"middle\" font-size=\"9\" font-weight=\"bold\">24 V</text>\n  </g>\n  <g id=\"mf-common-actuator\">\n    <path d=\"M-50 13 H42\" stroke=\"#d6a85b\" stroke-width=\"14\" stroke-linecap=\"round\"/>\n    <rect x=\"-14\" y=\"-35\" width=\"28\" height=\"52\" rx=\"6\" fill=\"url(#mf-steel)\" stroke=\"#d6e3ee\"/>\n    <rect x=\"-27\" y=\"-91\" width=\"54\" height=\"57\" rx=\"12\" fill=\"url(#mf-steel)\" stroke=\"#c9e4f2\"/>\n    <rect x=\"-27\" y=\"-55\" width=\"54\" height=\"12\" fill=\"url(#mf-blue)\"/>\n    <rect x=\"-17\" y=\"-80\" width=\"34\" height=\"20\" rx=\"5\" fill=\"#d6ebf8\"/>\n    <text x=\"0\" y=\"-66\" text-anchor=\"middle\" font-size=\"9\" fill=\"#1b4663\">24 V</text>\n    <text x=\"0\" y=\"-104\" fill=\"#a2d8ff\" text-anchor=\"middle\" font-size=\"12\">WSPÓLNY</text>\n  </g>\n\n  <g id=\"mf-display-template\">\n    <rect x=\"-75\" y=\"-43\" width=\"150\" height=\"86\" rx=\"13\" fill=\"url(#mf-screen)\" stroke=\"#547a9a\" stroke-width=\"1.7\"/>\n    <rect x=\"-69\" y=\"-37\" width=\"138\" height=\"74\" rx=\"10\" fill=\"#071422\" fill-opacity=\".8\"/>\n    <text id=\"mf-display-title\" x=\"0\" y=\"-25\" fill=\"#a5cee9\" text-anchor=\"middle\" font-family=\"Arial,sans-serif\" font-size=\"10\">OBIEG 1</text>\n    <text x=\"-62\" y=\"-8\" fill=\"#ff8181\" font-family=\"Arial,sans-serif\" font-size=\"10\" font-weight=\"bold\">ZAS.</text>\n    <text id=\"mf-display-supply\" x=\"-19\" y=\"-8\" fill=\"#ffe6e0\" font-family=\"Arial,sans-serif\" font-size=\"14\" font-weight=\"bold\">36.0°C</text>\n    <text x=\"-62\" y=\"9\" fill=\"#74b7ff\" font-family=\"Arial,sans-serif\" font-size=\"10\" font-weight=\"bold\">POW.</text>\n    <text id=\"mf-display-return\" x=\"-19\" y=\"9\" fill=\"#ddeaff\" font-family=\"Arial,sans-serif\" font-size=\"14\" font-weight=\"bold\">28.0°C</text>\n    <text id=\"mf-display-flow\" x=\"-62\" y=\"28\" fill=\"#76ecf2\" font-family=\"Arial,sans-serif\" font-size=\"10\" font-weight=\"bold\">1.6 l/min</text>\n    <text id=\"mf-display-open\" x=\"8\" y=\"28\" fill=\"#8effad\" font-family=\"Arial,sans-serif\" font-size=\"10\" font-weight=\"bold\">65% OTW.</text>\n  </g>\n\n  <g id=\"mf-title-template\">\n    <text id=\"mf-title-text\" x=\"0\" y=\"42\" font-family=\"Arial,sans-serif\" text-anchor=\"middle\" fill=\"#d4e8fc\" font-size=\"26\" font-weight=\"bold\">ROZDZIELACZ CO / PODŁOGÓWKI</text>\n    <text id=\"mf-subtitle-text\" x=\"0\" y=\"66\" font-family=\"Arial,sans-serif\" text-anchor=\"middle\" fill=\"#91b9da\" font-size=\"13\">5 obiegów • zasilanie / powrót</text>\n  </g>\n</defs>\n<!-- Visible 5-circuit editable reference preview. Runtime omits this group and assembles its own instances. -->\n<g id=\"mf-preview\">\n  <use href=\"#mf-title-template\" transform=\"translate(725 0)\"/>\n  <use href=\"#mf-rail-middle\" transform=\"translate(125 288) scale(1200 1)\"/>\n  <use href=\"#mf-rail-middle\" transform=\"translate(125 490) scale(1200 1)\"/>\n  <use href=\"#mf-rail-start\" transform=\"translate(125 288)\"/>\n  <use href=\"#mf-rail-end\" transform=\"translate(1325 288)\"/>\n  <use href=\"#mf-rail-start\" transform=\"translate(125 490)\"/>\n  <use href=\"#mf-rail-end\" transform=\"translate(1325 490)\"/>\n  <use href=\"#mf-supply-mark\" transform=\"translate(125 288)\"/>\n  <use href=\"#mf-return-mark\" transform=\"translate(125 490)\"/>\n  \n  <use href=\"#mf-outlet-upper\" transform=\"translate(205 152)\"/>\n  <use href=\"#mf-outlet-lower\" transform=\"translate(205 680)\"/>\n  <use href=\"#mf-flowmeter-template\" transform=\"translate(205 283)\"/>\n  <use href=\"#mf-valve-actuator\" transform=\"translate(205 548)\"/>\n  <use href=\"#mf-display-template\" transform=\"translate(205 418)\"/>\n\n  <use href=\"#mf-outlet-upper\" transform=\"translate(465 152)\"/>\n  <use href=\"#mf-outlet-lower\" transform=\"translate(465 680)\"/>\n  <use href=\"#mf-flowmeter-template\" transform=\"translate(465 283)\"/>\n  <use href=\"#mf-valve-actuator\" transform=\"translate(465 548)\"/>\n  <use href=\"#mf-display-template\" transform=\"translate(465 418)\"/>\n\n  <use href=\"#mf-outlet-upper\" transform=\"translate(725 152)\"/>\n  <use href=\"#mf-outlet-lower\" transform=\"translate(725 680)\"/>\n  <use href=\"#mf-flowmeter-template\" transform=\"translate(725 283)\"/>\n  <use href=\"#mf-valve-actuator\" transform=\"translate(725 548)\"/>\n  <use href=\"#mf-display-template\" transform=\"translate(725 418)\"/>\n\n  <use href=\"#mf-outlet-upper\" transform=\"translate(985 152)\"/>\n  <use href=\"#mf-outlet-lower\" transform=\"translate(985 680)\"/>\n  <use href=\"#mf-flowmeter-template\" transform=\"translate(985 283)\"/>\n  <use href=\"#mf-valve-actuator\" transform=\"translate(985 548)\"/>\n  <use href=\"#mf-display-template\" transform=\"translate(985 418)\"/>\n\n  <use href=\"#mf-outlet-upper\" transform=\"translate(1245 152)\"/>\n  <use href=\"#mf-outlet-lower\" transform=\"translate(1245 680)\"/>\n  <use href=\"#mf-flowmeter-template\" transform=\"translate(1245 283)\"/>\n  <use href=\"#mf-valve-actuator\" transform=\"translate(1245 548)\"/>\n  <use href=\"#mf-display-template\" transform=\"translate(1245 418)\"/>\n</g>\n",
  energyStorage: "\n<defs>\n    <linearGradient id=\"bat-metal\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\".92\"><stop stop-color=\"#f5faff\"/><stop offset=\".29\" stop-color=\"#c6d6ed\"/><stop offset=\".6\" stop-color=\"#e8f1ff\"/><stop offset=\"1\" stop-color=\"#6f82a5\"/></linearGradient>\n    <linearGradient id=\"bat-metal-dark\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#596985\"/><stop offset=\".35\" stop-color=\"#283854\"/><stop offset=\"1\" stop-color=\"#11192e\"/></linearGradient>\n    <linearGradient id=\"bat-glass\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#213f68\"/><stop offset=\".42\" stop-color=\"#101d37\"/><stop offset=\"1\" stop-color=\"#071324\"/></linearGradient>\n    <linearGradient id=\"bat-blue\" x1=\"0\" y1=\"0\" x2=\".9\" y2=\"1\"><stop stop-color=\"#a1f7ff\"/><stop offset=\".25\" stop-color=\"#39c6ff\"/><stop offset=\".7\" stop-color=\"#145ee0\"/><stop offset=\"1\" stop-color=\"#153883\"/></linearGradient>\n    <linearGradient id=\"bat-green\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#bbffd5\"/><stop offset=\".24\" stop-color=\"#6af7a0\"/><stop offset=\".75\" stop-color=\"#12a96a\"/><stop offset=\"1\" stop-color=\"#075c5c\"/></linearGradient>\n    <linearGradient id=\"bat-orange\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#ffef8d\"/><stop offset=\".28\" stop-color=\"#ffc448\"/><stop offset=\".66\" stop-color=\"#ff7c32\"/><stop offset=\"1\" stop-color=\"#f23a46\"/></linearGradient>\n    <linearGradient id=\"bat-roof\" x1=\"0\" y1=\"0\" x2=\".8\" y2=\"1\"><stop stop-color=\"#5d708e\"/><stop offset=\".5\" stop-color=\"#2c3b57\"/><stop offset=\"1\" stop-color=\"#152039\"/></linearGradient>\n    <filter id=\"bat-glow\" x=\"-65%\" y=\"-65%\" width=\"230%\" height=\"230%\"><feGaussianBlur stdDeviation=\"4\"/></filter>\n    <filter id=\"bat-soft\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\"><feGaussianBlur stdDeviation=\"2\"/></filter>\n    </defs>\n<!-- Static, editable artwork; JS binds SOC, power and BMS alerts by element IDs. -->\n<style>\n  @keyframes ssBatteryChargePulse { 0%,100% { opacity: 1; } 50% { opacity: .73; } }\n  .battery-charging { animation: ssBatteryChargePulse 2.2s ease-in-out infinite; }\n  @media (prefers-reduced-motion: reduce) { .battery-charging { animation: none; } }\n</style>\n\n<g id=\"battery-case\"><rect x=\"94\" y=\"34\" width=\"112\" height=\"215\" rx=\"12\" fill=\"url(#bat-metal-dark)\" stroke=\"#52bcff\" stroke-width=\"2\"/>\n<rect x=\"99\" y=\"34\" width=\"101\" height=\"208\" rx=\"9\" fill=\"url(#bat-metal)\" stroke=\"#eefaff\" stroke-width=\"1.5\"/>\n<rect x=\"108\" y=\"46\" width=\"83\" height=\"31\" rx=\"5\" fill=\"url(#bat-glass)\" stroke=\"#54bbeb\" stroke-width=\"1.2\"/>\n<g id=\"battery-screen\">\n  <text id=\"battery-soc-text\" x=\"119\" y=\"58\" font-family=\"Arial,sans-serif\" font-size=\"9\" font-weight=\"700\" fill=\"#b7f9e2\">SOC —</text>\n  <text id=\"battery-power-text\" x=\"119\" y=\"69\" font-family=\"Arial,sans-serif\" font-size=\"8\" font-weight=\"700\" fill=\"#7cddff\">—</text>\n  <circle cx=\"174\" cy=\"60\" r=\"8\" fill=\"#45ef9c\" opacity=\".35\" filter=\"url(#bat-glow)\"/>\n  <circle id=\"battery-led\" cx=\"174\" cy=\"60\" r=\"4\" fill=\"#6cffad\"/>\n</g></g>\n<g id=\"battery-charge-cells\"><g id=\"battery-segment-4\" opacity=\".16\">\n  <rect x=\"109\" y=\"86\" width=\"82\" height=\"25\" rx=\"5\" fill=\"url(#bat-glass)\" stroke=\"#628eac\" stroke-width=\"1.2\"/>\n  <rect id=\"battery-level-glow-4\" x=\"113\" y=\"90\" width=\"73\" height=\"17\" rx=\"3\" fill=\"url(#bat-green)\" opacity=\".37\" filter=\"url(#bat-glow)\"/>\n  <rect id=\"battery-level-fill-4\" x=\"113\" y=\"90\" width=\"73\" height=\"17\" rx=\"3\" fill=\"url(#bat-green)\" stroke=\"#9bffd3\" stroke-width=\".7\"/>\n  <path d=\"M120 93 H175\" stroke=\"#d4ffeb\" opacity=\".6\" stroke-width=\"2\"/>\n</g>\n<g id=\"battery-segment-3\" opacity=\".16\">\n  <rect x=\"109\" y=\"118\" width=\"82\" height=\"25\" rx=\"5\" fill=\"url(#bat-glass)\" stroke=\"#628eac\" stroke-width=\"1.2\"/>\n  <rect id=\"battery-level-glow-3\" x=\"113\" y=\"122\" width=\"73\" height=\"17\" rx=\"3\" fill=\"url(#bat-green)\" opacity=\".37\" filter=\"url(#bat-glow)\"/>\n  <rect id=\"battery-level-fill-3\" x=\"113\" y=\"122\" width=\"73\" height=\"17\" rx=\"3\" fill=\"url(#bat-green)\" stroke=\"#9bffd3\" stroke-width=\".7\"/>\n  <path d=\"M120 125 H175\" stroke=\"#d4ffeb\" opacity=\".6\" stroke-width=\"2\"/>\n</g>\n<g id=\"battery-segment-2\" opacity=\".16\">\n  <rect x=\"109\" y=\"150\" width=\"82\" height=\"25\" rx=\"5\" fill=\"url(#bat-glass)\" stroke=\"#628eac\" stroke-width=\"1.2\"/>\n  <rect id=\"battery-level-glow-2\" x=\"113\" y=\"154\" width=\"73\" height=\"17\" rx=\"3\" fill=\"url(#bat-green)\" opacity=\".37\" filter=\"url(#bat-glow)\"/>\n  <rect id=\"battery-level-fill-2\" x=\"113\" y=\"154\" width=\"73\" height=\"17\" rx=\"3\" fill=\"url(#bat-green)\" stroke=\"#9bffd3\" stroke-width=\".7\"/>\n  <path d=\"M120 157 H175\" stroke=\"#d4ffeb\" opacity=\".6\" stroke-width=\"2\"/>\n</g>\n<g id=\"battery-segment-1\" opacity=\".16\">\n  <rect x=\"109\" y=\"182\" width=\"82\" height=\"25\" rx=\"5\" fill=\"url(#bat-glass)\" stroke=\"#628eac\" stroke-width=\"1.2\"/>\n  <rect id=\"battery-level-glow-1\" x=\"113\" y=\"186\" width=\"73\" height=\"17\" rx=\"3\" fill=\"url(#bat-green)\" opacity=\".37\" filter=\"url(#bat-glow)\"/>\n  <rect id=\"battery-level-fill-1\" x=\"113\" y=\"186\" width=\"73\" height=\"17\" rx=\"3\" fill=\"url(#bat-green)\" stroke=\"#9bffd3\" stroke-width=\".7\"/>\n  <path d=\"M120 189 H175\" stroke=\"#d4ffeb\" opacity=\".6\" stroke-width=\"2\"/>\n</g></g>\n<g id=\"battery-warning\" visibility=\"hidden\">\n  <path d=\"M184 214 l8 13 h-16 Z\" fill=\"#e24646\" stroke=\"#ffd3d3\" stroke-width=\"1\"/>\n  <text x=\"184\" y=\"224.5\" fill=\"#ffffff\" font-family=\"Arial,sans-serif\" font-size=\"11\" font-weight=\"bold\" text-anchor=\"middle\">!</text>\n</g><g id=\"battery-foot\"><rect x=\"116\" y=\"223\" width=\"67\" height=\"10\" rx=\"4\" fill=\"url(#bat-metal-dark)\"/>\n<rect x=\"108\" y=\"247\" width=\"22\" height=\"7\" rx=\"2\" fill=\"#3a5274\"/><rect x=\"171\" y=\"247\" width=\"22\" height=\"7\" rx=\"2\" fill=\"#3a5274\"/></g>\n",
  inverter: "\n<defs>\n    <linearGradient id=\"inv-metal\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\".92\"><stop stop-color=\"#f5faff\"/><stop offset=\".29\" stop-color=\"#c6d6ed\"/><stop offset=\".6\" stop-color=\"#e8f1ff\"/><stop offset=\"1\" stop-color=\"#6f82a5\"/></linearGradient>\n    <linearGradient id=\"inv-metal-dark\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#596985\"/><stop offset=\".35\" stop-color=\"#283854\"/><stop offset=\"1\" stop-color=\"#11192e\"/></linearGradient>\n    <linearGradient id=\"inv-glass\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#213f68\"/><stop offset=\".42\" stop-color=\"#101d37\"/><stop offset=\"1\" stop-color=\"#071324\"/></linearGradient>\n    <linearGradient id=\"inv-blue\" x1=\"0\" y1=\"0\" x2=\".9\" y2=\"1\"><stop stop-color=\"#a1f7ff\"/><stop offset=\".25\" stop-color=\"#39c6ff\"/><stop offset=\".7\" stop-color=\"#145ee0\"/><stop offset=\"1\" stop-color=\"#153883\"/></linearGradient>\n    <linearGradient id=\"inv-green\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#bbffd5\"/><stop offset=\".24\" stop-color=\"#6af7a0\"/><stop offset=\".75\" stop-color=\"#12a96a\"/><stop offset=\"1\" stop-color=\"#075c5c\"/></linearGradient>\n    <linearGradient id=\"inv-orange\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#ffef8d\"/><stop offset=\".28\" stop-color=\"#ffc448\"/><stop offset=\".66\" stop-color=\"#ff7c32\"/><stop offset=\"1\" stop-color=\"#f23a46\"/></linearGradient>\n    <linearGradient id=\"inv-roof\" x1=\"0\" y1=\"0\" x2=\".8\" y2=\"1\"><stop stop-color=\"#5d708e\"/><stop offset=\".5\" stop-color=\"#2c3b57\"/><stop offset=\"1\" stop-color=\"#152039\"/></linearGradient>\n    <filter id=\"inv-glow\" x=\"-65%\" y=\"-65%\" width=\"230%\" height=\"230%\"><feGaussianBlur stdDeviation=\"4\"/></filter>\n    <filter id=\"inv-soft\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\"><feGaussianBlur stdDeviation=\"2\"/></filter>\n    </defs>\n<!-- Editable inverter artwork. Runtime injects PV values and optional diagnostic panel. -->\n\n<g id=\"inverter-shadow\"><ellipse cx=\"150\" cy=\"255\" rx=\"65\" ry=\"7\" fill=\"#2777d1\" opacity=\".25\" filter=\"url(#inv-glow)\"/></g>\n<g id=\"inverter-case\"><rect x=\"83\" y=\"38\" width=\"134\" height=\"205\" rx=\"16\" fill=\"url(#inv-metal-dark)\" stroke=\"#64bdff\" stroke-width=\"2\"/>\n<rect x=\"90\" y=\"38\" width=\"116\" height=\"198\" rx=\"13\" fill=\"url(#inv-metal)\" stroke=\"#f8fdff\" stroke-opacity=\".8\" stroke-width=\"2\"/>\n<path d=\"M102 47 H185\" stroke=\"#fff\" opacity=\".55\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n<path d=\"M201 50 V218\" stroke=\"#47769e\" opacity=\".65\" stroke-width=\"2\"/></g>\n<g id=\"inverter-display\">\n  <!-- Compact page: AC output, shortened decorative wave, up to three PV inputs. -->\n  <rect x=\"98\" y=\"62\" width=\"104\" height=\"96\" rx=\"9\" fill=\"url(#inv-glass)\" stroke=\"#78d8ff\" stroke-opacity=\".65\" stroke-width=\"2\"/>\n  <text x=\"104\" y=\"77\" fill=\"#83bdf5\" font-family=\"Arial,sans-serif\" font-size=\"9\" font-weight=\"700\">AC</text>\n  <text id=\"inv-power\" x=\"197\" y=\"78\" text-anchor=\"end\" fill=\"#aaffda\" font-family=\"Arial,sans-serif\" font-size=\"14\" font-weight=\"700\">—</text>\n  <g id=\"inv-chart\">\n    <path d=\"M106 106 H194 M106 94 H194\" stroke=\"#2d5178\" stroke-opacity=\".52\" stroke-width=\".6\" stroke-dasharray=\"3 3\"/>\n    <path id=\"inv-graph-glow\" d=\"M108 103 Q116 102 122 91 Q128 84 134 96 T149 96 Q155 85 161 92 T174 98 Q183 89 193 88\"\n      fill=\"none\" stroke=\"#3fe2ff\" opacity=\".62\" stroke-width=\"5\" filter=\"url(#inv-glow)\"/>\n    <path id=\"inv-graph-line\" d=\"M108 103 Q116 102 122 91 Q128 84 134 96 T149 96 Q155 85 161 92 T174 98 Q183 89 193 88\"\n      fill=\"none\" stroke=\"#70e8ff\" stroke-width=\"2.3\" stroke-linecap=\"round\"/>\n  </g>\n  <path d=\"M104 111 H197\" stroke=\"#5f86a5\" stroke-opacity=\".7\" stroke-width=\".8\"/>\n  <g id=\"inv-pv-rows\"></g>\n  <!-- These three short bars remain decorative, not simulated historical data. -->\n  <g id=\"inv-bottom-bars\" fill=\"#64e6ff\" opacity=\".85\">\n    <rect x=\"107\" y=\"150\" width=\"10\" height=\"2.2\" rx=\"1\"/>\n    <rect x=\"121\" y=\"150\" width=\"19\" height=\"2.2\" rx=\"1\"/>\n    <rect x=\"144\" y=\"150\" width=\"34\" height=\"2.2\" rx=\"1\"/>\n  </g>\n</g>\n<g id=\"inverter-status\">\n  <circle id=\"inv-led-glow\" cx=\"150\" cy=\"179\" r=\"9\" fill=\"#4cd6ff\" opacity=\".4\" filter=\"url(#inv-glow)\"/>\n  <circle id=\"inv-led\" cx=\"150\" cy=\"179\" r=\"5\" fill=\"#4cd6ff\"/>\n  <g id=\"inv-alert\" visibility=\"hidden\"><path d=\"M166 170 l8 14 h-16 Z\" fill=\"#ff4242\" stroke=\"#ffe1a8\" stroke-width=\"1\"/><text x=\"166\" y=\"182\" font-size=\"10\" font-family=\"Arial,sans-serif\" font-weight=\"bold\" fill=\"#fff\" text-anchor=\"middle\">!</text></g>\n  <rect x=\"119\" y=\"207\" width=\"63\" height=\"4\" rx=\"2\" fill=\"#c5d9ec\"/>\n  <rect x=\"127\" y=\"218\" width=\"47\" height=\"3\" rx=\"1.5\" fill=\"#9cbad4\"/>\n  <circle cx=\"103\" cy=\"228\" r=\"2\" fill=\"#5a88ae\"/>\n  <circle cx=\"192\" cy=\"228\" r=\"2\" fill=\"#5a88ae\"/>\n</g>\n<g id=\"inverter-connectors\" fill=\"url(#inv-metal-dark)\" stroke=\"#579dd6\" stroke-width=\"1.3\"><rect x=\"108\" y=\"241\" width=\"22\" height=\"13\" rx=\"3\"/><rect x=\"171\" y=\"241\" width=\"22\" height=\"13\" rx=\"3\"/></g>\n<g id=\"inv-extra-panel\"></g>\n",
  distributionBoard: "\n<defs>\n    <linearGradient id=\"dist-metal\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\".92\"><stop stop-color=\"#f5faff\"/><stop offset=\".29\" stop-color=\"#c6d6ed\"/><stop offset=\".6\" stop-color=\"#e8f1ff\"/><stop offset=\"1\" stop-color=\"#6f82a5\"/></linearGradient>\n    <linearGradient id=\"dist-metal-dark\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#596985\"/><stop offset=\".35\" stop-color=\"#283854\"/><stop offset=\"1\" stop-color=\"#11192e\"/></linearGradient>\n    <linearGradient id=\"dist-glass\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#213f68\"/><stop offset=\".42\" stop-color=\"#101d37\"/><stop offset=\"1\" stop-color=\"#071324\"/></linearGradient>\n    <linearGradient id=\"dist-blue\" x1=\"0\" y1=\"0\" x2=\".9\" y2=\"1\"><stop stop-color=\"#a1f7ff\"/><stop offset=\".25\" stop-color=\"#39c6ff\"/><stop offset=\".7\" stop-color=\"#145ee0\"/><stop offset=\"1\" stop-color=\"#153883\"/></linearGradient>\n    <linearGradient id=\"dist-green\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#bbffd5\"/><stop offset=\".24\" stop-color=\"#6af7a0\"/><stop offset=\".75\" stop-color=\"#12a96a\"/><stop offset=\"1\" stop-color=\"#075c5c\"/></linearGradient>\n    <linearGradient id=\"dist-orange\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#ffef8d\"/><stop offset=\".28\" stop-color=\"#ffc448\"/><stop offset=\".66\" stop-color=\"#ff7c32\"/><stop offset=\"1\" stop-color=\"#f23a46\"/></linearGradient>\n    <linearGradient id=\"dist-roof\" x1=\"0\" y1=\"0\" x2=\".8\" y2=\"1\"><stop stop-color=\"#5d708e\"/><stop offset=\".5\" stop-color=\"#2c3b57\"/><stop offset=\"1\" stop-color=\"#152039\"/></linearGradient>\n    <filter id=\"dist-glow\" x=\"-65%\" y=\"-65%\" width=\"230%\" height=\"230%\"><feGaussianBlur stdDeviation=\"4\"/></filter>\n    <filter id=\"dist-soft\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\"><feGaussianBlur stdDeviation=\"2\"/></filter>\n    </defs>\n<!-- Individual visible groups are named for future Home Assistant entity and animation bindings -->\n\n<g id=\"distribution-case\"><rect x=\"83\" y=\"31\" width=\"134\" height=\"221\" rx=\"10\" fill=\"url(#dist-metal-dark)\" stroke=\"#68bdfc\" stroke-width=\"2\"/>\n<rect x=\"88\" y=\"31\" width=\"122\" height=\"215\" rx=\"9\" fill=\"url(#dist-metal)\" stroke=\"#eef8ff\" stroke-width=\"1.5\"/>\n<rect x=\"99\" y=\"45\" width=\"99\" height=\"195\" rx=\"5\" fill=\"#edf5ff\" opacity=\".38\" stroke=\"#7195b6\" stroke-width=\"1.4\"/></g>\n<g id=\"distribution-meter\"><rect x=\"111\" y=\"52\" width=\"78\" height=\"39\" rx=\"5\" fill=\"url(#dist-glass)\" stroke=\"#7fcef7\" stroke-width=\"1.7\"/>\n<path d=\"M122 78 V69 M136 78 V63 M150 78 V69 M164 78 V59 M178 78 V66\" stroke=\"#58d8ff\" stroke-width=\"6\" opacity=\".35\" filter=\"url(#dist-glow)\"/>\n<path d=\"M122 78 V69 M136 78 V63 M150 78 V69 M164 78 V59 M178 78 V66\" stroke=\"#5ae2ff\" stroke-width=\"3\" stroke-linecap=\"round\"/></g>\n<g id=\"distribution-breakers\">\n<rect x=\"104\" y=\"108\" width=\"93\" height=\"29\" rx=\"4\" fill=\"#d0e0f2\" stroke=\"#597ca5\" stroke-width=\"1.5\"/><rect x=\"109\" y=\"112\" width=\"17\" height=\"20\" rx=\"2.5\" fill=\"#f4f9ff\" stroke=\"#809bb7\" stroke-width=\".7\"/><rect x=\"112\" y=\"113\" width=\"11\" height=\"5\" rx=\"1\" fill=\"#f79f35\"/><rect x=\"115\" y=\"120\" width=\"5\" height=\"10\" rx=\"1\" fill=\"#6f859d\"/><rect x=\"131\" y=\"112\" width=\"17\" height=\"20\" rx=\"2.5\" fill=\"#f4f9ff\" stroke=\"#809bb7\" stroke-width=\".7\"/><rect x=\"134\" y=\"113\" width=\"11\" height=\"5\" rx=\"1\" fill=\"#29a8ff\"/><rect x=\"137\" y=\"120\" width=\"5\" height=\"10\" rx=\"1\" fill=\"#6f859d\"/><rect x=\"153\" y=\"112\" width=\"17\" height=\"20\" rx=\"2.5\" fill=\"#f4f9ff\" stroke=\"#809bb7\" stroke-width=\".7\"/><rect x=\"156\" y=\"113\" width=\"11\" height=\"5\" rx=\"1\" fill=\"#39c58e\"/><rect x=\"159\" y=\"120\" width=\"5\" height=\"10\" rx=\"1\" fill=\"#6f859d\"/><rect x=\"175\" y=\"112\" width=\"17\" height=\"20\" rx=\"2.5\" fill=\"#f4f9ff\" stroke=\"#809bb7\" stroke-width=\".7\"/><rect x=\"178\" y=\"113\" width=\"11\" height=\"5\" rx=\"1\" fill=\"#f79f35\"/><rect x=\"181\" y=\"120\" width=\"5\" height=\"10\" rx=\"1\" fill=\"#6f859d\"/><rect x=\"104\" y=\"144\" width=\"93\" height=\"29\" rx=\"4\" fill=\"#d0e0f2\" stroke=\"#597ca5\" stroke-width=\"1.5\"/><rect x=\"109\" y=\"148\" width=\"17\" height=\"20\" rx=\"2.5\" fill=\"#f4f9ff\" stroke=\"#809bb7\" stroke-width=\".7\"/><rect x=\"112\" y=\"149\" width=\"11\" height=\"5\" rx=\"1\" fill=\"#29a8ff\"/><rect x=\"115\" y=\"156\" width=\"5\" height=\"10\" rx=\"1\" fill=\"#6f859d\"/><rect x=\"131\" y=\"148\" width=\"17\" height=\"20\" rx=\"2.5\" fill=\"#f4f9ff\" stroke=\"#809bb7\" stroke-width=\".7\"/><rect x=\"134\" y=\"149\" width=\"11\" height=\"5\" rx=\"1\" fill=\"#39c58e\"/><rect x=\"137\" y=\"156\" width=\"5\" height=\"10\" rx=\"1\" fill=\"#6f859d\"/><rect x=\"153\" y=\"148\" width=\"17\" height=\"20\" rx=\"2.5\" fill=\"#f4f9ff\" stroke=\"#809bb7\" stroke-width=\".7\"/><rect x=\"156\" y=\"149\" width=\"11\" height=\"5\" rx=\"1\" fill=\"#f79f35\"/><rect x=\"159\" y=\"156\" width=\"5\" height=\"10\" rx=\"1\" fill=\"#6f859d\"/><rect x=\"175\" y=\"148\" width=\"17\" height=\"20\" rx=\"2.5\" fill=\"#f4f9ff\" stroke=\"#809bb7\" stroke-width=\".7\"/><rect x=\"178\" y=\"149\" width=\"11\" height=\"5\" rx=\"1\" fill=\"#29a8ff\"/><rect x=\"181\" y=\"156\" width=\"5\" height=\"10\" rx=\"1\" fill=\"#6f859d\"/><rect x=\"104\" y=\"180\" width=\"93\" height=\"29\" rx=\"4\" fill=\"#d0e0f2\" stroke=\"#597ca5\" stroke-width=\"1.5\"/><rect x=\"109\" y=\"184\" width=\"17\" height=\"20\" rx=\"2.5\" fill=\"#f4f9ff\" stroke=\"#809bb7\" stroke-width=\".7\"/><rect x=\"112\" y=\"185\" width=\"11\" height=\"5\" rx=\"1\" fill=\"#39c58e\"/><rect x=\"115\" y=\"192\" width=\"5\" height=\"10\" rx=\"1\" fill=\"#6f859d\"/><rect x=\"131\" y=\"184\" width=\"17\" height=\"20\" rx=\"2.5\" fill=\"#f4f9ff\" stroke=\"#809bb7\" stroke-width=\".7\"/><rect x=\"134\" y=\"185\" width=\"11\" height=\"5\" rx=\"1\" fill=\"#f79f35\"/><rect x=\"137\" y=\"192\" width=\"5\" height=\"10\" rx=\"1\" fill=\"#6f859d\"/><rect x=\"153\" y=\"184\" width=\"17\" height=\"20\" rx=\"2.5\" fill=\"#f4f9ff\" stroke=\"#809bb7\" stroke-width=\".7\"/><rect x=\"156\" y=\"185\" width=\"11\" height=\"5\" rx=\"1\" fill=\"#29a8ff\"/><rect x=\"159\" y=\"192\" width=\"5\" height=\"10\" rx=\"1\" fill=\"#6f859d\"/><rect x=\"175\" y=\"184\" width=\"17\" height=\"20\" rx=\"2.5\" fill=\"#f4f9ff\" stroke=\"#809bb7\" stroke-width=\".7\"/><rect x=\"178\" y=\"185\" width=\"11\" height=\"5\" rx=\"1\" fill=\"#39c58e\"/><rect x=\"181\" y=\"192\" width=\"5\" height=\"10\" rx=\"1\" fill=\"#6f859d\"/></g><g id=\"distribution-markers\"><circle cx=\"120\" cy=\"226\" r=\"3\" fill=\"#4fe7a2\"/><circle cx=\"132\" cy=\"226\" r=\"3\" fill=\"#5fc8ff\"/><circle cx=\"145\" cy=\"226\" r=\"3\" fill=\"#ffaf60\"/>\n<rect x=\"174\" y=\"220\" width=\"17\" height=\"13\" rx=\"2\" fill=\"#344b66\"/></g>\n",
  buildingHouse: "\n<defs>\n    <linearGradient id=\"home-metal\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\".92\"><stop stop-color=\"#f5faff\"/><stop offset=\".29\" stop-color=\"#c6d6ed\"/><stop offset=\".6\" stop-color=\"#e8f1ff\"/><stop offset=\"1\" stop-color=\"#6f82a5\"/></linearGradient>\n    <linearGradient id=\"home-metal-dark\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#596985\"/><stop offset=\".35\" stop-color=\"#283854\"/><stop offset=\"1\" stop-color=\"#11192e\"/></linearGradient>\n    <linearGradient id=\"home-glass\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#213f68\"/><stop offset=\".42\" stop-color=\"#101d37\"/><stop offset=\"1\" stop-color=\"#071324\"/></linearGradient>\n    <linearGradient id=\"home-blue\" x1=\"0\" y1=\"0\" x2=\".9\" y2=\"1\"><stop stop-color=\"#a1f7ff\"/><stop offset=\".25\" stop-color=\"#39c6ff\"/><stop offset=\".7\" stop-color=\"#145ee0\"/><stop offset=\"1\" stop-color=\"#153883\"/></linearGradient>\n    <linearGradient id=\"home-green\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#bbffd5\"/><stop offset=\".24\" stop-color=\"#6af7a0\"/><stop offset=\".75\" stop-color=\"#12a96a\"/><stop offset=\"1\" stop-color=\"#075c5c\"/></linearGradient>\n    <linearGradient id=\"home-orange\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#ffef8d\"/><stop offset=\".28\" stop-color=\"#ffc448\"/><stop offset=\".66\" stop-color=\"#ff7c32\"/><stop offset=\"1\" stop-color=\"#f23a46\"/></linearGradient>\n    <linearGradient id=\"home-roof\" x1=\"0\" y1=\"0\" x2=\".8\" y2=\"1\"><stop stop-color=\"#5d708e\"/><stop offset=\".5\" stop-color=\"#2c3b57\"/><stop offset=\"1\" stop-color=\"#152039\"/></linearGradient>\n    <filter id=\"home-glow\" x=\"-65%\" y=\"-65%\" width=\"230%\" height=\"230%\"><feGaussianBlur stdDeviation=\"4\"/></filter>\n    <filter id=\"home-soft\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\"><feGaussianBlur stdDeviation=\"2\"/></filter>\n    </defs>\n<!-- Individual visible groups are named for future Home Assistant entity and animation bindings -->\n\n<g id=\"home-body\"><path d=\"M67 120 L150 57 L233 120 L233 241 H67 Z\" fill=\"url(#home-metal)\" stroke=\"#94bce1\" stroke-width=\"2.5\"/>\n<path d=\"M58 125 L150 48 L244 125 L230 130 L150 68 L72 132 Z\" fill=\"url(#home-roof)\" stroke=\"#83b7e6\" stroke-width=\"2.5\" stroke-linejoin=\"round\"/>\n<path d=\"M61 124 L149 52 L239 125\" fill=\"none\" stroke=\"#64cdff\" stroke-width=\"8\" opacity=\".3\" filter=\"url(#home-glow)\"/>\n<path d=\"M61 124 L149 52 L239 125\" fill=\"none\" stroke=\"#6fcdff\" stroke-width=\"2\" opacity=\".8\"/>\n<rect x=\"176\" y=\"57\" width=\"20\" height=\"35\" rx=\"2\" fill=\"url(#home-metal-dark)\" stroke=\"#91afd3\" stroke-width=\"2\"/>\n<rect x=\"78\" y=\"230\" width=\"145\" height=\"11\" rx=\"3\" fill=\"#334866\"/></g>\n<g id=\"home-windows\">\n<rect x=\"96\" y=\"129\" width=\"36\" height=\"35\" rx=\"2\" fill=\"url(#home-orange)\" stroke=\"#3c5477\" stroke-width=\"5\"/><path d=\"M114 131 V163 M98 146 H130\" stroke=\"#d7e9ff\" stroke-width=\"2\"/>\n<rect x=\"166\" y=\"129\" width=\"36\" height=\"35\" rx=\"2\" fill=\"url(#home-orange)\" stroke=\"#3c5477\" stroke-width=\"5\"/><path d=\"M184 131 V163 M169 146 H200\" stroke=\"#d7e9ff\" stroke-width=\"2\"/>\n<path d=\"M149 84 L164 104 H134 Z\" fill=\"#ffce80\" stroke=\"#749ec5\" stroke-width=\"3\"/>\n</g>\n<g id=\"home-door\"><rect x=\"130\" y=\"179\" width=\"41\" height=\"62\" rx=\"3\" fill=\"url(#home-metal-dark)\" stroke=\"#709cc6\" stroke-width=\"2.5\"/>\n<path d=\"M135 188 L165 188 L165 237 L135 237\" fill=\"none\" stroke=\"#89b7de\" opacity=\".4\"/><circle cx=\"162\" cy=\"213\" r=\"2.4\" fill=\"#ffc37c\"/></g>\n<g id=\"home-light\"><path d=\"M125 132 H137 V163 H125 Z M196 132 H207 V163 H196 Z\" stroke=\"#ffb84f\" opacity=\".2\" stroke-width=\"8\" filter=\"url(#home-glow)\"/></g>\n\n",
  buildingGarage: "\n<defs>\n    <linearGradient id=\"shed-metal\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\".92\"><stop stop-color=\"#f5faff\"/><stop offset=\".29\" stop-color=\"#c6d6ed\"/><stop offset=\".6\" stop-color=\"#e8f1ff\"/><stop offset=\"1\" stop-color=\"#6f82a5\"/></linearGradient>\n    <linearGradient id=\"shed-metal-dark\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#596985\"/><stop offset=\".35\" stop-color=\"#283854\"/><stop offset=\"1\" stop-color=\"#11192e\"/></linearGradient>\n    <linearGradient id=\"shed-glass\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#213f68\"/><stop offset=\".42\" stop-color=\"#101d37\"/><stop offset=\"1\" stop-color=\"#071324\"/></linearGradient>\n    <linearGradient id=\"shed-blue\" x1=\"0\" y1=\"0\" x2=\".9\" y2=\"1\"><stop stop-color=\"#a1f7ff\"/><stop offset=\".25\" stop-color=\"#39c6ff\"/><stop offset=\".7\" stop-color=\"#145ee0\"/><stop offset=\"1\" stop-color=\"#153883\"/></linearGradient>\n    <linearGradient id=\"shed-green\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#bbffd5\"/><stop offset=\".24\" stop-color=\"#6af7a0\"/><stop offset=\".75\" stop-color=\"#12a96a\"/><stop offset=\"1\" stop-color=\"#075c5c\"/></linearGradient>\n    <linearGradient id=\"shed-orange\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#ffef8d\"/><stop offset=\".28\" stop-color=\"#ffc448\"/><stop offset=\".66\" stop-color=\"#ff7c32\"/><stop offset=\"1\" stop-color=\"#f23a46\"/></linearGradient>\n    <linearGradient id=\"shed-roof\" x1=\"0\" y1=\"0\" x2=\".8\" y2=\"1\"><stop stop-color=\"#5d708e\"/><stop offset=\".5\" stop-color=\"#2c3b57\"/><stop offset=\"1\" stop-color=\"#152039\"/></linearGradient>\n    <filter id=\"shed-glow\" x=\"-65%\" y=\"-65%\" width=\"230%\" height=\"230%\"><feGaussianBlur stdDeviation=\"4\"/></filter>\n    <filter id=\"shed-soft\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\"><feGaussianBlur stdDeviation=\"2\"/></filter>\n    </defs>\n<!-- Individual visible groups are named for future Home Assistant entity and animation bindings -->\n\n<g id=\"outbuilding-body\"><path d=\"M66 115 L150 63 L236 115 L236 239 H66 Z\" fill=\"url(#shed-metal-dark)\" stroke=\"#7093bf\" stroke-width=\"3\"/>\n<path d=\"M51 117 L149 51 L251 117 L235 126 L150 68 L69 128 Z\" fill=\"url(#shed-roof)\" stroke=\"#92aecd\" stroke-width=\"2.3\"/>\n<path d=\"M61 121 L149 59 L240 119\" fill=\"none\" stroke=\"#439ffe\" opacity=\".6\" stroke-width=\"2\"/>\n<rect x=\"72\" y=\"231\" width=\"156\" height=\"11\" rx=\"2\" fill=\"#15213b\"/></g>\n<g id=\"outbuilding-garage\"><rect x=\"91\" y=\"142\" width=\"118\" height=\"95\" rx=\"3\" fill=\"#273954\" stroke=\"#7d9bbb\" stroke-width=\"3\"/>\n<rect x=\"100\" y=\"150\" width=\"100\" height=\"78\" rx=\"1\" fill=\"url(#shed-metal-dark)\" stroke=\"#1a2740\" stroke-width=\"2\"/>\n<path d=\"M101 164 H199\" stroke=\"#7792b8\" opacity=\".56\" stroke-width=\"2\"/><path d=\"M101 178 H199\" stroke=\"#7792b8\" opacity=\".56\" stroke-width=\"2\"/><path d=\"M101 192 H199\" stroke=\"#7792b8\" opacity=\".56\" stroke-width=\"2\"/><path d=\"M101 206 H199\" stroke=\"#7792b8\" opacity=\".56\" stroke-width=\"2\"/><path d=\"M101 220 H199\" stroke=\"#7792b8\" opacity=\".56\" stroke-width=\"2\"/><rect x=\"119\" y=\"148\" width=\"63\" height=\"4\" rx=\"1.5\" fill=\"#a6c2dd\" opacity=\".7\"/></g>\n<g id=\"outbuilding-window\"><rect x=\"139\" y=\"98\" width=\"22\" height=\"20\" rx=\"2\" fill=\"#0b2036\" stroke=\"#97b5d9\" stroke-width=\"3\"/>\n<path d=\"M150 99 V116\" stroke=\"#80b3e4\" stroke-width=\"1.5\"/></g>\n",
  buildingWorkshop: "\n<defs>\n    <linearGradient id=\"shed-metal\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\".92\"><stop stop-color=\"#f5faff\"/><stop offset=\".29\" stop-color=\"#c6d6ed\"/><stop offset=\".6\" stop-color=\"#e8f1ff\"/><stop offset=\"1\" stop-color=\"#6f82a5\"/></linearGradient>\n    <linearGradient id=\"shed-metal-dark\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#596985\"/><stop offset=\".35\" stop-color=\"#283854\"/><stop offset=\"1\" stop-color=\"#11192e\"/></linearGradient>\n    <linearGradient id=\"shed-glass\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#213f68\"/><stop offset=\".42\" stop-color=\"#101d37\"/><stop offset=\"1\" stop-color=\"#071324\"/></linearGradient>\n    <linearGradient id=\"shed-blue\" x1=\"0\" y1=\"0\" x2=\".9\" y2=\"1\"><stop stop-color=\"#a1f7ff\"/><stop offset=\".25\" stop-color=\"#39c6ff\"/><stop offset=\".7\" stop-color=\"#145ee0\"/><stop offset=\"1\" stop-color=\"#153883\"/></linearGradient>\n    <linearGradient id=\"shed-green\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#bbffd5\"/><stop offset=\".24\" stop-color=\"#6af7a0\"/><stop offset=\".75\" stop-color=\"#12a96a\"/><stop offset=\"1\" stop-color=\"#075c5c\"/></linearGradient>\n    <linearGradient id=\"shed-orange\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#ffef8d\"/><stop offset=\".28\" stop-color=\"#ffc448\"/><stop offset=\".66\" stop-color=\"#ff7c32\"/><stop offset=\"1\" stop-color=\"#f23a46\"/></linearGradient>\n    <linearGradient id=\"shed-roof\" x1=\"0\" y1=\"0\" x2=\".8\" y2=\"1\"><stop stop-color=\"#5d708e\"/><stop offset=\".5\" stop-color=\"#2c3b57\"/><stop offset=\"1\" stop-color=\"#152039\"/></linearGradient>\n    <filter id=\"shed-glow\" x=\"-65%\" y=\"-65%\" width=\"230%\" height=\"230%\"><feGaussianBlur stdDeviation=\"4\"/></filter>\n    <filter id=\"shed-soft\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\"><feGaussianBlur stdDeviation=\"2\"/></filter>\n    </defs>\n<!-- Individual visible groups are named for future Home Assistant entity and animation bindings -->\n\n<g id=\"outbuilding-body\"><path d=\"M66 115 L150 63 L236 115 L236 239 H66 Z\" fill=\"url(#shed-metal-dark)\" stroke=\"#7093bf\" stroke-width=\"3\"/>\n<path d=\"M51 117 L149 51 L251 117 L235 126 L150 68 L69 128 Z\" fill=\"url(#shed-roof)\" stroke=\"#92aecd\" stroke-width=\"2.3\"/>\n<path d=\"M61 121 L149 59 L240 119\" fill=\"none\" stroke=\"#439ffe\" opacity=\".6\" stroke-width=\"2\"/>\n<rect x=\"72\" y=\"231\" width=\"156\" height=\"11\" rx=\"2\" fill=\"#15213b\"/></g>\n<g id=\"outbuilding-workshop\">\n<rect x=\"83\" y=\"137\" width=\"67\" height=\"103\" rx=\"3\" fill=\"url(#shed-metal-dark)\" stroke=\"#91b6da\" stroke-width=\"3\"/>\n<path d=\"M91 149 H142 V233 H91Z\" fill=\"#273954\" stroke=\"#7596bd\" stroke-width=\"2\"/>\n<path d=\"M97 157 V226 M108 157 V226 M119 157 V226 M130 157 V226\" stroke=\"#7596bd\" stroke-opacity=\".65\"/>\n<rect x=\"155\" y=\"150\" width=\"62\" height=\"52\" rx=\"3\" fill=\"#152e4a\" stroke=\"#9ac6e8\" stroke-width=\"4\"/>\n<rect x=\"162\" y=\"157\" width=\"48\" height=\"38\" fill=\"url(#shed-blue)\" opacity=\".55\"/>\n<path d=\"M185 155 V198 M161 176 H211\" stroke=\"#cfeaff\" stroke-width=\"2\"/>\n<rect x=\"161\" y=\"207\" width=\"48\" height=\"28\" rx=\"2\" fill=\"#3a526e\" stroke=\"#90accc\"/>\n<circle cx=\"139\" cy=\"192\" r=\"3\" fill=\"#ffcb7a\"/>\n</g>\n<g id=\"outbuilding-window\"><rect x=\"139\" y=\"98\" width=\"22\" height=\"20\" rx=\"2\" fill=\"#0b2036\" stroke=\"#97b5d9\" stroke-width=\"3\"/><path d=\"M150 99 V116\" stroke=\"#80b3e4\" stroke-width=\"1.5\"/></g>\n",
  evCharger: "\n<defs>\n    <linearGradient id=\"ev-metal\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\".92\"><stop stop-color=\"#f5faff\"/><stop offset=\".29\" stop-color=\"#c6d6ed\"/><stop offset=\".6\" stop-color=\"#e8f1ff\"/><stop offset=\"1\" stop-color=\"#6f82a5\"/></linearGradient>\n    <linearGradient id=\"ev-metal-dark\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#596985\"/><stop offset=\".35\" stop-color=\"#283854\"/><stop offset=\"1\" stop-color=\"#11192e\"/></linearGradient>\n    <linearGradient id=\"ev-glass\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#213f68\"/><stop offset=\".42\" stop-color=\"#101d37\"/><stop offset=\"1\" stop-color=\"#071324\"/></linearGradient>\n    <linearGradient id=\"ev-blue\" x1=\"0\" y1=\"0\" x2=\".9\" y2=\"1\"><stop stop-color=\"#a1f7ff\"/><stop offset=\".25\" stop-color=\"#39c6ff\"/><stop offset=\".7\" stop-color=\"#145ee0\"/><stop offset=\"1\" stop-color=\"#153883\"/></linearGradient>\n    <linearGradient id=\"ev-green\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#bbffd5\"/><stop offset=\".24\" stop-color=\"#6af7a0\"/><stop offset=\".75\" stop-color=\"#12a96a\"/><stop offset=\"1\" stop-color=\"#075c5c\"/></linearGradient>\n    <linearGradient id=\"ev-orange\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#ffef8d\"/><stop offset=\".28\" stop-color=\"#ffc448\"/><stop offset=\".66\" stop-color=\"#ff7c32\"/><stop offset=\"1\" stop-color=\"#f23a46\"/></linearGradient>\n    <linearGradient id=\"ev-roof\" x1=\"0\" y1=\"0\" x2=\".8\" y2=\"1\"><stop stop-color=\"#5d708e\"/><stop offset=\".5\" stop-color=\"#2c3b57\"/><stop offset=\"1\" stop-color=\"#152039\"/></linearGradient>\n    <filter id=\"ev-glow\" x=\"-65%\" y=\"-65%\" width=\"230%\" height=\"230%\"><feGaussianBlur stdDeviation=\"4\"/></filter>\n    <filter id=\"ev-soft\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\"><feGaussianBlur stdDeviation=\"2\"/></filter>\n    </defs>\n<!-- Named, editable graphic layers and bound data groups. -->\n<style>@keyframes ss-ev-charge{0%,100%{opacity:1}50%{opacity:.45}}.ss-ev-charging{animation:ss-ev-charge 1.6s ease-in-out infinite}@media(prefers-reduced-motion:reduce){.ss-ev-charging{animation:none}}</style>\n\n<g id=\"ev-charger-case\"><rect x=\"87\" y=\"31\" width=\"114\" height=\"208\" rx=\"22\" fill=\"url(#ev-metal-dark)\" stroke=\"#57e8a6\" stroke-width=\"3\"/>\n<rect x=\"94\" y=\"39\" width=\"100\" height=\"192\" rx=\"17\" fill=\"url(#ev-metal)\" stroke=\"#f0fbff\" stroke-width=\"1.7\"/>\n<rect x=\"104\" y=\"51\" width=\"81\" height=\"109\" rx=\"10\" fill=\"url(#ev-glass)\" stroke=\"#40d2a4\" stroke-width=\"2\"/>\n<path d=\"M98 61 V207\" stroke=\"#43efad\" stroke-width=\"4\" opacity=\".5\" filter=\"url(#ev-glow)\"/>\n<path d=\"M98 61 V207\" stroke=\"#64f6b8\" stroke-width=\"2\"/>\n<path d=\"M189 61 V207\" stroke=\"#43efad\" stroke-width=\"4\" opacity=\".5\" filter=\"url(#ev-glow)\"/>\n<path d=\"M189 61 V207\" stroke=\"#64f6b8\" stroke-width=\"2\"/></g>\n<g id=\"ev-charger-display\"><g id=\"ev-bolt\" transform=\"translate(72 27) scale(.48)\"><path d=\"M148 69 L126 109 H144 L133 140 L164 98 H147 L161 69 Z\" fill=\"url(#ev-green)\" stroke=\"#d9ffe7\" stroke-width=\"1.4\"/>\n<path d=\"M148 69 L126 109 H144 L133 140 L164 98 H147 L161 69 Z\" fill=\"#60f6ad\" opacity=\".4\" filter=\"url(#ev-glow)\"/></g>\n<text id=\"ev-power-text\" x=\"145\" y=\"116\" text-anchor=\"middle\" fill=\"#a9ffdf\" font-family=\"Arial,sans-serif\" font-size=\"16\" font-weight=\"bold\">—</text>\n<text x=\"145\" y=\"128\" text-anchor=\"middle\" fill=\"#9dd4dc\" font-family=\"Arial,sans-serif\" font-size=\"7.6\">SESJA</text>\n<text id=\"ev-session-text\" x=\"145\" y=\"145\" text-anchor=\"middle\" fill=\"#e3fbff\" font-family=\"Arial,sans-serif\" font-size=\"12\" font-weight=\"bold\">—</text>\n<circle id=\"ev-led-glow\" cx=\"145\" cy=\"182\" r=\"10\" fill=\"#102b35\" stroke=\"#41d99b\" stroke-width=\"3\"/><path id=\"ev-status-glyph\" d=\"M145 175 V184\" stroke=\"#caffde\" stroke-width=\"2.3\" stroke-linecap=\"round\"/><path d=\"M139 177 A8 8 0 1 0 152 177\" fill=\"none\" stroke=\"#caffde\" stroke-width=\"2\"/></g>\n<g id=\"ev-status-ring\"><circle id=\"ev-led\" cx=\"145\" cy=\"182\" r=\"6\" fill=\"#54dfa0\" opacity=\".38\"/></g>\n<g id=\"ev-alarm\" visibility=\"hidden\"><path d=\"M177 178 l9 16 h-18Z\" fill=\"#f04444\"/><text x=\"177\" y=\"191\" text-anchor=\"middle\" font-family=\"Arial\" font-size=\"12\" font-weight=\"bold\" fill=\"white\">!</text></g>\n<g id=\"ev-charging-cable\"><path d=\"M201 169 C245 164 260 186 249 219 C241 242 213 235 212 208 V170\" stroke=\"#142039\" stroke-width=\"11\" fill=\"none\" stroke-linecap=\"round\"/>\n<path d=\"M201 169 C245 164 260 186 249 219 C241 242 213 235 212 208 V170\" stroke=\"#5a768b\" stroke-width=\"3\" fill=\"none\" opacity=\".7\"/>\n<rect x=\"204\" y=\"143\" width=\"18\" height=\"38\" rx=\"5\" fill=\"url(#ev-metal-dark)\" stroke=\"#72e3b9\" stroke-width=\"1.5\"/>\n<path d=\"M209 143 V134 M217 143 V134\" stroke=\"#e2edfa\" stroke-width=\"3\" stroke-linecap=\"round\"/></g>\n<g id=\"ev-feet\"><rect x=\"108\" y=\"234\" width=\"74\" height=\"17\" rx=\"4\" fill=\"#283751\" stroke=\"#66a9cf\" stroke-width=\"1.2\"/></g>\n",
  powerGridClassic: "\n<defs>\n    <linearGradient id=\"grid-metal\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\".92\"><stop stop-color=\"#f5faff\"/><stop offset=\".29\" stop-color=\"#c6d6ed\"/><stop offset=\".6\" stop-color=\"#e8f1ff\"/><stop offset=\"1\" stop-color=\"#6f82a5\"/></linearGradient>\n    <linearGradient id=\"grid-metal-dark\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#596985\"/><stop offset=\".35\" stop-color=\"#283854\"/><stop offset=\"1\" stop-color=\"#11192e\"/></linearGradient>\n    <linearGradient id=\"grid-glass\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#213f68\"/><stop offset=\".42\" stop-color=\"#101d37\"/><stop offset=\"1\" stop-color=\"#071324\"/></linearGradient>\n    <linearGradient id=\"grid-blue\" x1=\"0\" y1=\"0\" x2=\".9\" y2=\"1\"><stop stop-color=\"#a1f7ff\"/><stop offset=\".25\" stop-color=\"#39c6ff\"/><stop offset=\".7\" stop-color=\"#145ee0\"/><stop offset=\"1\" stop-color=\"#153883\"/></linearGradient>\n    <linearGradient id=\"grid-green\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#bbffd5\"/><stop offset=\".24\" stop-color=\"#6af7a0\"/><stop offset=\".75\" stop-color=\"#12a96a\"/><stop offset=\"1\" stop-color=\"#075c5c\"/></linearGradient>\n    <linearGradient id=\"grid-orange\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#ffef8d\"/><stop offset=\".28\" stop-color=\"#ffc448\"/><stop offset=\".66\" stop-color=\"#ff7c32\"/><stop offset=\"1\" stop-color=\"#f23a46\"/></linearGradient>\n    <linearGradient id=\"grid-roof\" x1=\"0\" y1=\"0\" x2=\".8\" y2=\"1\"><stop stop-color=\"#5d708e\"/><stop offset=\".5\" stop-color=\"#2c3b57\"/><stop offset=\"1\" stop-color=\"#152039\"/></linearGradient>\n    <filter id=\"grid-glow\" x=\"-65%\" y=\"-65%\" width=\"230%\" height=\"230%\"><feGaussianBlur stdDeviation=\"4\"/></filter>\n    <filter id=\"grid-soft\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\"><feGaussianBlur stdDeviation=\"2\"/></filter>\n    </defs>\n<!-- Individual visible groups are named for future Home Assistant entity and animation bindings -->\n\n<g id=\"grid-tower-frame\" fill=\"none\" stroke-linejoin=\"round\" stroke-linecap=\"round\">\n<path d=\"M150 31 L107 246 H193 Z\" stroke=\"#6abfff\" opacity=\".22\" stroke-width=\"9\" filter=\"url(#grid-glow)\"/>\n<path d=\"M150 31 L107 246 H193 Z\" stroke=\"url(#grid-metal)\" stroke-width=\"7\"/>\n<path d=\"M121 245 H179\" stroke=\"#e1f3ff\" stroke-opacity=\".56\" stroke-width=\"2\"/>\n<path d=\"M111 246 H189\" stroke=\"#5daeff\" stroke-width=\"1.5\"/>\n<path d=\"M129 142 L171 142 M118 198 L182 198 M139 89 L161 89\" stroke=\"#7399c7\" stroke-width=\"6\"/>\n<path d=\"M131 139 L173 195 M169 139 L126 195 M135 89 L170 139 M165 89 L130 139 M123 200 L179 240 M177 200 L117 240\" stroke=\"#90a9cb\" stroke-width=\"3.8\"/>\n<path d=\"M104 246 H196\" stroke=\"#7bb4dc\" stroke-width=\"8\"/>\n</g><g id=\"grid-crossarms\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n<path d=\"M84 94 H216 L150 56 Z\" stroke=\"#bad3eb\" stroke-width=\"6\"/>\n<path d=\"M78 147 H222 L150 115 Z\" stroke=\"#9eb9d4\" stroke-width=\"6\"/>\n<path d=\"M91 113 H209 M88 165 H212\" stroke=\"#607da8\" stroke-width=\"3\"/>\n<path d=\"M149 33 V246\" stroke=\"#acc2d9\" stroke-width=\"4\" opacity=\".9\"/>\n</g><g id=\"grid-insulators\" fill=\"#48ceff\" stroke=\"#aeeeff\" stroke-width=\"1\">\n<rect x=\"90\" y=\"95\" width=\"6\" height=\"20\" rx=\"2\"/><rect x=\"204\" y=\"95\" width=\"6\" height=\"20\" rx=\"2\"/>\n<rect x=\"82\" y=\"148\" width=\"6\" height=\"21\" rx=\"2\"/><rect x=\"212\" y=\"148\" width=\"6\" height=\"21\" rx=\"2\"/>\n</g><g id=\"grid-cap\"><circle cx=\"150\" cy=\"30\" r=\"4\" fill=\"#74d9ff\"/></g>\n",
  powerGridModernLight: "\n<title id=\"ha-pylon-title\">Słup energetyczny wysokiego napięcia</title>\n<desc id=\"ha-pylon-description\">Izometryczna stalowa kratownica z czterema ramionami i czterema porcelanowymi izolatorami; przezroczyste tło.</desc>\n<!-- HA Systems Studio | self-contained, scalable, standalone SVG | no raster content -->\n\n<g id=\"ha-pylon-foundation\" stroke-linejoin=\"round\">\n<path d=\"M91 398 L176 352 L261 398\" stroke=\"#cadee7\" stroke-width=\"4.4\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M91 398 L176 447 L261 398\" stroke=\"#c1dbe5\" stroke-width=\"5.5\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M91 398 L176 352 M176 352 L261 398\" stroke=\"#c6dce5\" stroke-width=\"2.8\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n</g>\n<g id=\"ha-pylon-rear-lattice\">\n<path d=\"M175.7 75.4 L155.9 133 L155.9 302 L90.7 398\" stroke=\"#284651\" stroke-width=\"3.9\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M175.7 75.4 L195.4 133 L195.4 302 L261 398\" stroke=\"#284651\" stroke-width=\"4.0\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M159 130 L159 300 L97 392\" stroke=\"#688a96\" stroke-width=\"1.15\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" opacity=\"0.70\"/>\n<path d=\"M192 132 L192 300 L254 391\" stroke=\"#6d91a0\" stroke-width=\"1.05\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" opacity=\"0.55\"/>\n<line x1=\"156\" y1=\"133\" x2=\"175.5\" y2=\"174\" stroke=\"#345662\" stroke-width=\"1.82\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"175.5\" y1=\"133\" x2=\"156\" y2=\"174\" stroke=\"#24404a\" stroke-width=\"1.78\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"175.5\" y1=\"133\" x2=\"195.5\" y2=\"174\" stroke=\"#345662\" stroke-width=\"1.82\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"195.5\" y1=\"133\" x2=\"175.5\" y2=\"174\" stroke=\"#24404a\" stroke-width=\"1.78\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"174\" x2=\"195\" y2=\"174\" stroke=\"#274650\" stroke-width=\"2.3\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"174\" x2=\"175.5\" y2=\"215\" stroke=\"#345662\" stroke-width=\"1.82\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"175.5\" y1=\"174\" x2=\"156\" y2=\"215\" stroke=\"#24404a\" stroke-width=\"1.78\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"175.5\" y1=\"174\" x2=\"195.5\" y2=\"215\" stroke=\"#345662\" stroke-width=\"1.82\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"195.5\" y1=\"174\" x2=\"175.5\" y2=\"215\" stroke=\"#24404a\" stroke-width=\"1.78\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"215\" x2=\"195\" y2=\"215\" stroke=\"#274650\" stroke-width=\"2.3\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"215\" x2=\"175.5\" y2=\"256\" stroke=\"#345662\" stroke-width=\"1.82\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"175.5\" y1=\"215\" x2=\"156\" y2=\"256\" stroke=\"#24404a\" stroke-width=\"1.78\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"175.5\" y1=\"215\" x2=\"195.5\" y2=\"256\" stroke=\"#345662\" stroke-width=\"1.82\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"195.5\" y1=\"215\" x2=\"175.5\" y2=\"256\" stroke=\"#24404a\" stroke-width=\"1.78\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"256\" x2=\"195\" y2=\"256\" stroke=\"#274650\" stroke-width=\"2.3\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"256\" x2=\"175.5\" y2=\"302\" stroke=\"#345662\" stroke-width=\"1.82\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"175.5\" y1=\"256\" x2=\"156\" y2=\"302\" stroke=\"#24404a\" stroke-width=\"1.78\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"175.5\" y1=\"256\" x2=\"195.5\" y2=\"302\" stroke=\"#345662\" stroke-width=\"1.82\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"195.5\" y1=\"256\" x2=\"175.5\" y2=\"302\" stroke=\"#24404a\" stroke-width=\"1.78\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"302\" x2=\"195\" y2=\"302\" stroke=\"#274650\" stroke-width=\"2.3\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"77\" x2=\"156\" y2=\"133\" stroke=\"#2a4753\" stroke-width=\"2.6\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"77\" x2=\"195\" y2=\"133\" stroke=\"#2a4753\" stroke-width=\"2.5\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"170.5\" y1=\"91\" x2=\"191\" y2=\"120\" stroke=\"#355c68\" stroke-width=\"1.8\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"181\" y1=\"91\" x2=\"159\" y2=\"123\" stroke=\"#294853\" stroke-width=\"1.9\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"133\" x2=\"195\" y2=\"133\" stroke=\"#1b3540\" stroke-width=\"2.3\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"300\" x2=\"176\" y2=\"314\" stroke=\"#27444f\" stroke-width=\"2.4\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"195\" y1=\"300\" x2=\"176\" y2=\"314\" stroke=\"#2f5360\" stroke-width=\"2.4\" opacity=\"1\" stroke-linecap=\"round\" />\n</g>\n<g id=\"ha-pylon-arm-left-upper\">\n<path d=\"M116.4 110.6 L156.8 130.7 L196 132.7\" stroke=\"#203943\" stroke-width=\"4.0\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M116.4 110.6 L156 166.7\" stroke=\"#24444f\" stroke-width=\"4.25\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M116.4 110.6 L176 154.4\" stroke=\"#182f38\" stroke-width=\"3.15\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M116.4 110.6 L195 132.8\" stroke=\"#2c4b56\" stroke-width=\"2.9\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<line x1=\"131.4\" y1=\"120\" x2=\"155.5\" y2=\"167\" stroke=\"#7195a3\" stroke-width=\"0.95\" opacity=\"0.85\" stroke-linecap=\"round\" />\n<line x1=\"157\" y1=\"130.7\" x2=\"176\" y2=\"154.4\" stroke=\"#315965\" stroke-width=\"2.1\" opacity=\"1\" stroke-linecap=\"round\" />\n</g>\n<g id=\"ha-pylon-arm-right-upper\">\n<path d=\"M196.0 132.6 L239.4 180.8\" stroke=\"#213d48\" stroke-width=\"4.45\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M176 129.9 L239.4 180.8\" stroke=\"#203a45\" stroke-width=\"3.75\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M156.3 132.7 L239.4 180.8\" stroke=\"#203842\" stroke-width=\"3.05\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M176 163.4 L239.4 180.8\" stroke=\"#2c515d\" stroke-width=\"3.05\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<line x1=\"198.7\" y1=\"137\" x2=\"238\" y2=\"180\" stroke=\"#7394a1\" stroke-width=\"1\" opacity=\"0.85\" stroke-linecap=\"round\" />\n</g>\n<g id=\"ha-pylon-arm-left-lower\">\n<path d=\"M116.5 163.8 L156 184.8 L195.4 186\" stroke=\"#203a44\" stroke-width=\"4.0\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M116.5 163.8 L156 217.3\" stroke=\"#203e49\" stroke-width=\"4.4\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M116.5 163.8 L176 207.6\" stroke=\"#203b46\" stroke-width=\"3.25\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M116.5 163.8 L196.0 185.7\" stroke=\"#254853\" stroke-width=\"2.8\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<line x1=\"130\" y1=\"173\" x2=\"154\" y2=\"213\" stroke=\"#7495a1\" stroke-width=\"0.9\" opacity=\"0.85\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"186\" x2=\"176\" y2=\"209\" stroke=\"#2e5460\" stroke-width=\"2.2\" opacity=\"1\" stroke-linecap=\"round\" />\n</g>\n<g id=\"ha-pylon-arm-right-lower\">\n<path d=\"M195.8 187.7 L238.8 233.6\" stroke=\"#203a45\" stroke-width=\"4.45\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M176 181.6 L238.8 233.6\" stroke=\"#1d3742\" stroke-width=\"3.85\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M156 186.1 L238.8 233.6\" stroke=\"#1e3843\" stroke-width=\"3.1\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M175 223.6 L238.8 233.6\" stroke=\"#2e5662\" stroke-width=\"3.3\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<line x1=\"196\" y1=\"192\" x2=\"238\" y2=\"233\" stroke=\"#7998a5\" stroke-width=\"0.95\" opacity=\"0.8\" stroke-linecap=\"round\" />\n</g>\n<g id=\"ha-pylon-front-lattice\">\n<path d=\"M176 78 L176 447\" stroke=\"#152e38\" stroke-width=\"4.65\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M156 134 L156 300.3 L91 398\" stroke=\"#1e3a45\" stroke-width=\"3.7\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M195 134 L195 300.3 L261 398\" stroke=\"#223e48\" stroke-width=\"3.55\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<line x1=\"174.65\" y1=\"87\" x2=\"174.65\" y2=\"444\" stroke=\"#6c8d9a\" stroke-width=\"0.92\" opacity=\"0.8\" stroke-linecap=\"round\" />\n<line x1=\"156.4\" y1=\"181\" x2=\"156.4\" y2=\"298\" stroke=\"#7593a0\" stroke-width=\"0.72\" opacity=\"0.65\" stroke-linecap=\"round\" />\n<line x1=\"194\" y1=\"190\" x2=\"194\" y2=\"300\" stroke=\"#698d98\" stroke-width=\"0.72\" opacity=\"0.8\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"171\" x2=\"176\" y2=\"184\" stroke=\"#2c4d59\" stroke-width=\"2.9\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"184\" x2=\"195\" y2=\"171\" stroke=\"#3b6270\" stroke-width=\"2.6\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"222\" x2=\"176\" y2=\"235\" stroke=\"#2c4d59\" stroke-width=\"2.9\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"235\" x2=\"195\" y2=\"222\" stroke=\"#3b6270\" stroke-width=\"2.6\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"266\" x2=\"176\" y2=\"279\" stroke=\"#2c4d59\" stroke-width=\"2.9\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"279\" x2=\"195\" y2=\"266\" stroke=\"#3b6270\" stroke-width=\"2.6\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"301\" x2=\"176\" y2=\"314\" stroke=\"#2c4d59\" stroke-width=\"2.9\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"314\" x2=\"195\" y2=\"301\" stroke=\"#3b6270\" stroke-width=\"2.6\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"221\" x2=\"176\" y2=\"275\" stroke=\"#203d49\" stroke-width=\"1.65\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"232\" x2=\"156\" y2=\"265\" stroke=\"#223e49\" stroke-width=\"1.6\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"195\" y1=\"221\" x2=\"176\" y2=\"275\" stroke=\"#23434f\" stroke-width=\"1.65\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"232\" x2=\"195\" y2=\"265\" stroke=\"#1e3c46\" stroke-width=\"1.6\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"265\" x2=\"176\" y2=\"311\" stroke=\"#203d49\" stroke-width=\"1.65\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"276\" x2=\"156\" y2=\"301\" stroke=\"#223e49\" stroke-width=\"1.6\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"195\" y1=\"265\" x2=\"176\" y2=\"311\" stroke=\"#23434f\" stroke-width=\"1.65\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"276\" x2=\"195\" y2=\"301\" stroke=\"#1e3c46\" stroke-width=\"1.6\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"300\" x2=\"176\" y2=\"315\" stroke=\"#284955\" stroke-width=\"2.8\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"195\" y1=\"300\" x2=\"176\" y2=\"315\" stroke=\"#365b68\" stroke-width=\"2.9\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"315\" x2=\"91\" y2=\"398\" stroke=\"#294752\" stroke-width=\"2.5\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"315\" x2=\"261\" y2=\"398\" stroke=\"#25444f\" stroke-width=\"2.45\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"138.7\" y1=\"330.7\" x2=\"214\" y2=\"332\" stroke=\"#1d3a44\" stroke-width=\"2.2\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"116\" y1=\"362\" x2=\"236\" y2=\"363\" stroke=\"#274852\" stroke-width=\"2.25\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"139\" y1=\"331\" x2=\"176\" y2=\"352\" stroke=\"#193640\" stroke-width=\"2.05\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"213\" y1=\"333\" x2=\"176\" y2=\"352\" stroke=\"#1e414b\" stroke-width=\"2.05\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"116\" y1=\"362\" x2=\"176\" y2=\"416\" stroke=\"#1d3944\" stroke-width=\"2.4\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"236\" y1=\"363\" x2=\"176\" y2=\"416\" stroke=\"#22414d\" stroke-width=\"2.5\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"91\" y1=\"398\" x2=\"176\" y2=\"416\" stroke=\"#1b3a45\" stroke-width=\"2.6\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"261\" y1=\"398\" x2=\"176\" y2=\"416\" stroke=\"#1c3a45\" stroke-width=\"2.7\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"353\" x2=\"176\" y2=\"416\" stroke=\"#233e48\" stroke-width=\"3.45\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"91\" y1=\"398\" x2=\"176\" y2=\"447\" stroke=\"#1c3944\" stroke-width=\"2.5\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"261\" y1=\"398\" x2=\"176\" y2=\"447\" stroke=\"#213e48\" stroke-width=\"2.5\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"417\" x2=\"176\" y2=\"447\" stroke=\"#193640\" stroke-width=\"4.1\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"174.7\" y1=\"418\" x2=\"174.7\" y2=\"443\" stroke=\"#6b8a98\" stroke-width=\"0.85\" opacity=\"0.8\" stroke-linecap=\"round\" />\n</g>\n<g id=\"ha-pylon-feet\">\n<path d=\"M87.4 397.8 L91.2 395.2 L95.2 397.4 L91.2 400.8 Z\" fill=\"#b4d0dc\"/>\n<path d=\"M91.2 400.8 L95.2 397.4 L95.2 400.7 L91.3 403.1 Z\" fill=\"#96b9c8\"/>\n<path d=\"M87.4 397.8 L91.2 400.8 L91.3 403.1 L87.4 400.4 Z\" fill=\"#d0e4ea\"/>\n<path d=\"M257.2 397.8 L261.2 395.2 L265.0 397.6 L261 400.6 Z\" fill=\"#b2cfda\"/>\n<path d=\"M261 400.6 L265 397.6 L265 400.3 L261 403 Z\" fill=\"#94b8c7\"/>\n<path d=\"M257.2 397.8 L261 400.6 L261 403 L257.2 400.3 Z\" fill=\"#c8dfe7\"/>\n<path d=\"M171.2 445.7 L176 442.6 L180.9 445.7 L176 449.1 Z\" fill=\"#bdd7e0\"/>\n<path d=\"M171.2 445.7 L176 449.1 L176 452.1 L171.2 448.7 Z\" fill=\"#c8dee5\"/>\n<path d=\"M176 449.1 L180.9 445.7 L180.9 449 L176 452.1 Z\" fill=\"#88afbf\"/>\n</g>\n<g id=\"ha-pylon-end-plates\">\n<circle cx=\"116.4\" cy=\"110.6\" r=\"4.35\" fill=\"#203b46\" />\n<circle cx=\"115.60000000000001\" cy=\"109.6\" r=\"1.95\" fill=\"#426672\" />\n<circle cx=\"116.5\" cy=\"163.8\" r=\"4.35\" fill=\"#203b46\" />\n<circle cx=\"115.7\" cy=\"162.8\" r=\"1.95\" fill=\"#426672\" />\n<circle cx=\"239.4\" cy=\"180.8\" r=\"4.35\" fill=\"#203b46\" />\n<circle cx=\"238.6\" cy=\"179.8\" r=\"1.95\" fill=\"#426672\" />\n<circle cx=\"238.8\" cy=\"233.6\" r=\"4.35\" fill=\"#203b46\" />\n<circle cx=\"238.0\" cy=\"232.6\" r=\"1.95\" fill=\"#426672\" />\n</g>\n<g id=\"ha-pylon-conductors\" stroke=\"#779aa8\" stroke-width=\"1.25\" stroke-linejoin=\"round\" stroke-linecap=\"round\">\n<path d=\"M83 130.6 L155 88.6\" stroke=\"#779aa8\" stroke-width=\"1.23\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M83 184.6 L155 141.9\" stroke=\"#779aa8\" stroke-width=\"1.23\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M194.9 227.2 L260 172.2\" stroke=\"#779aa8\" stroke-width=\"1.23\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M194.9 281 L260 225.7\" stroke=\"#779aa8\" stroke-width=\"1.23\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n</g>\n<g id=\"ha-pylon-flex-conductor-loops\">\n<path d=\"M98.5 125.8 C101 145 129 138 138.5 103.8\" stroke=\"#83a9b8\" stroke-width=\"1.55\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M98.5 179.4 C100.4 199 129 192 138.5 157.4\" stroke=\"#83a9b8\" stroke-width=\"1.55\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M218.5 193.3 C219.5 220 254.4 220.5 260.5 169\" stroke=\"#83a9b8\" stroke-width=\"1.55\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M218.5 246.6 C219 273 254.4 274 260.5 222.1\" stroke=\"#83a9b8\" stroke-width=\"1.55\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n</g>\n<g id=\"ha-pylon-insulators\">\n<g id=\"ha-pylon-insulator-left-top\" transform=\"translate(116.4 114.6) rotate(-30)\">\n<rect x=\"-22\" y=\"-2\" width=\"44\" height=\"4\" rx=\"1\" fill=\"#8dabb9\"/>\n<rect x=\"-22\" y=\"-2\" width=\"44\" height=\"1.3\" rx=\"0.5\" fill=\"#c7dde7\"/>\n<rect x=\"-21.5\" y=\"-3.15\" width=\"2.1\" height=\"6.3\" rx=\"1\" fill=\"#6e96a8\"/>\n<rect x=\"20.3\" y=\"-3.15\" width=\"2.1\" height=\"6.3\" rx=\"1\" fill=\"#6e96a8\"/>\n<ellipse cx=\"-18.30\" cy=\"0\" rx=\"2.75\" ry=\"5.2\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M-19.70 -4.25 Q-21.00 -2.60 -19.50 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"-13.75\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M-15.15 -5.60 Q-16.45 -3.27 -14.95 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"-9.20\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M-10.60 -5.60 Q-11.90 -3.27 -10.40 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"-4.65\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M-6.05 -5.60 Q-7.35 -3.27 -5.85 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"-0.10\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M-1.50 -5.60 Q-2.80 -3.27 -1.30 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"4.45\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M3.05 -5.60 Q1.75 -3.27 3.25 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"9.00\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M7.60 -5.60 Q6.30 -3.27 7.80 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"13.55\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M12.15 -5.60 Q10.85 -3.27 12.35 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"18.10\" cy=\"0\" rx=\"2.75\" ry=\"5.2\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M16.70 -4.25 Q15.40 -2.60 16.90 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n</g>\n<g id=\"ha-pylon-insulator-left-bottom\" transform=\"translate(116.4 168.2) rotate(-30)\">\n<rect x=\"-22\" y=\"-2\" width=\"44\" height=\"4\" rx=\"1\" fill=\"#8dabb9\"/>\n<rect x=\"-22\" y=\"-2\" width=\"44\" height=\"1.3\" rx=\"0.5\" fill=\"#c7dde7\"/>\n<rect x=\"-21.5\" y=\"-3.15\" width=\"2.1\" height=\"6.3\" rx=\"1\" fill=\"#6e96a8\"/>\n<rect x=\"20.3\" y=\"-3.15\" width=\"2.1\" height=\"6.3\" rx=\"1\" fill=\"#6e96a8\"/>\n<ellipse cx=\"-18.30\" cy=\"0\" rx=\"2.75\" ry=\"5.2\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M-19.70 -4.25 Q-21.00 -2.60 -19.50 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"-13.75\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M-15.15 -5.60 Q-16.45 -3.27 -14.95 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"-9.20\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M-10.60 -5.60 Q-11.90 -3.27 -10.40 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"-4.65\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M-6.05 -5.60 Q-7.35 -3.27 -5.85 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"-0.10\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M-1.50 -5.60 Q-2.80 -3.27 -1.30 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"4.45\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M3.05 -5.60 Q1.75 -3.27 3.25 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"9.00\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M7.60 -5.60 Q6.30 -3.27 7.80 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"13.55\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M12.15 -5.60 Q10.85 -3.27 12.35 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"18.10\" cy=\"0\" rx=\"2.75\" ry=\"5.2\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M16.70 -4.25 Q15.40 -2.60 16.90 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n</g>\n<g id=\"ha-pylon-insulator-right-top\" transform=\"translate(239.5 181.8) rotate(-30)\">\n<rect x=\"-22\" y=\"-2\" width=\"44\" height=\"4\" rx=\"1\" fill=\"#8dabb9\"/>\n<rect x=\"-22\" y=\"-2\" width=\"44\" height=\"1.3\" rx=\"0.5\" fill=\"#c7dde7\"/>\n<rect x=\"-21.5\" y=\"-3.15\" width=\"2.1\" height=\"6.3\" rx=\"1\" fill=\"#6e96a8\"/>\n<rect x=\"20.3\" y=\"-3.15\" width=\"2.1\" height=\"6.3\" rx=\"1\" fill=\"#6e96a8\"/>\n<ellipse cx=\"-18.30\" cy=\"0\" rx=\"2.75\" ry=\"5.2\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M-19.70 -4.25 Q-21.00 -2.60 -19.50 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"-13.75\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M-15.15 -5.60 Q-16.45 -3.27 -14.95 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"-9.20\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M-10.60 -5.60 Q-11.90 -3.27 -10.40 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"-4.65\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M-6.05 -5.60 Q-7.35 -3.27 -5.85 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"-0.10\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M-1.50 -5.60 Q-2.80 -3.27 -1.30 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"4.45\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M3.05 -5.60 Q1.75 -3.27 3.25 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"9.00\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M7.60 -5.60 Q6.30 -3.27 7.80 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"13.55\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M12.15 -5.60 Q10.85 -3.27 12.35 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"18.10\" cy=\"0\" rx=\"2.75\" ry=\"5.2\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M16.70 -4.25 Q15.40 -2.60 16.90 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n</g>\n<g id=\"ha-pylon-insulator-right-bottom\" transform=\"translate(239.5 235.1) rotate(-30)\">\n<rect x=\"-22\" y=\"-2\" width=\"44\" height=\"4\" rx=\"1\" fill=\"#8dabb9\"/>\n<rect x=\"-22\" y=\"-2\" width=\"44\" height=\"1.3\" rx=\"0.5\" fill=\"#c7dde7\"/>\n<rect x=\"-21.5\" y=\"-3.15\" width=\"2.1\" height=\"6.3\" rx=\"1\" fill=\"#6e96a8\"/>\n<rect x=\"20.3\" y=\"-3.15\" width=\"2.1\" height=\"6.3\" rx=\"1\" fill=\"#6e96a8\"/>\n<ellipse cx=\"-18.30\" cy=\"0\" rx=\"2.75\" ry=\"5.2\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M-19.70 -4.25 Q-21.00 -2.60 -19.50 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"-13.75\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M-15.15 -5.60 Q-16.45 -3.27 -14.95 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"-9.20\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M-10.60 -5.60 Q-11.90 -3.27 -10.40 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"-4.65\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M-6.05 -5.60 Q-7.35 -3.27 -5.85 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"-0.10\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M-1.50 -5.60 Q-2.80 -3.27 -1.30 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"4.45\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M3.05 -5.60 Q1.75 -3.27 3.25 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"9.00\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M7.60 -5.60 Q6.30 -3.27 7.80 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"13.55\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M12.15 -5.60 Q10.85 -3.27 12.35 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n<ellipse cx=\"18.10\" cy=\"0\" rx=\"2.75\" ry=\"5.2\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\"/>\n<path d=\"M16.70 -4.25 Q15.40 -2.60 16.90 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\"/>\n</g>\n</g>\n<g id=\"ha-pylon-top-cap\">\n<path d=\"M169.8 74.8 L176.2 70.9 L182.5 74.4 L176 78.8 Z\" fill=\"#6d94a4\"/>\n<path d=\"M169.8 74.8 L176 78.8 L176 82.2 L169.8 78.3 Z\" fill=\"#2e5665\"/>\n<path d=\"M176 78.8 L182.5 74.4 L182.5 78 L176 82.2 Z\" fill=\"#244753\"/>\n</g>\n",
  powerGridModernDark: "\n<title id=\"ha-pylon-title\">Słup energetyczny wysokiego napięcia — wariant ciemny</title>\n<desc id=\"ha-pylon-description\">Izometryczna stalowa kratownica z czterema ramionami i czterema porcelanowymi izolatorami; przezroczyste tło.</desc>\n\n\n<g id=\"ha-pylon-foundation\" stroke-linejoin=\"round\">\n<path d=\"M91 398 L176 352 L261 398\" stroke=\"#cadee7\" stroke-width=\"4.4\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M91 398 L176 447 L261 398\" stroke=\"#c1dbe5\" stroke-width=\"5.5\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M91 398 L176 352 M176 352 L261 398\" stroke=\"#c6dce5\" stroke-width=\"2.8\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n</g>\n<g id=\"ha-pylon-rear-lattice\">\n<path d=\"M175.7 75.4 L155.9 133 L155.9 302 L90.7 398\" stroke=\"#a9bec9\" stroke-width=\"3.9\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M175.7 75.4 L195.4 133 L195.4 302 L261 398\" stroke=\"#a9bec9\" stroke-width=\"4.0\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M159 130 L159 300 L97 392\" stroke=\"#bad1dd\" stroke-width=\"1.15\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" opacity=\"0.70\" />\n<path d=\"M192 132 L192 300 L254 391\" stroke=\"#bad1dd\" stroke-width=\"1.05\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" opacity=\"0.55\" />\n<line x1=\"156\" y1=\"133\" x2=\"175.5\" y2=\"174\" stroke=\"#87a7b8\" stroke-width=\"1.82\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"175.5\" y1=\"133\" x2=\"156\" y2=\"174\" stroke=\"#a9bec9\" stroke-width=\"1.78\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"175.5\" y1=\"133\" x2=\"195.5\" y2=\"174\" stroke=\"#87a7b8\" stroke-width=\"1.82\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"195.5\" y1=\"133\" x2=\"175.5\" y2=\"174\" stroke=\"#a9bec9\" stroke-width=\"1.78\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"174\" x2=\"195\" y2=\"174\" stroke=\"#a9bec9\" stroke-width=\"2.3\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"174\" x2=\"175.5\" y2=\"215\" stroke=\"#87a7b8\" stroke-width=\"1.82\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"175.5\" y1=\"174\" x2=\"156\" y2=\"215\" stroke=\"#a9bec9\" stroke-width=\"1.78\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"175.5\" y1=\"174\" x2=\"195.5\" y2=\"215\" stroke=\"#87a7b8\" stroke-width=\"1.82\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"195.5\" y1=\"174\" x2=\"175.5\" y2=\"215\" stroke=\"#a9bec9\" stroke-width=\"1.78\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"215\" x2=\"195\" y2=\"215\" stroke=\"#a9bec9\" stroke-width=\"2.3\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"215\" x2=\"175.5\" y2=\"256\" stroke=\"#87a7b8\" stroke-width=\"1.82\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"175.5\" y1=\"215\" x2=\"156\" y2=\"256\" stroke=\"#a9bec9\" stroke-width=\"1.78\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"175.5\" y1=\"215\" x2=\"195.5\" y2=\"256\" stroke=\"#87a7b8\" stroke-width=\"1.82\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"195.5\" y1=\"215\" x2=\"175.5\" y2=\"256\" stroke=\"#a9bec9\" stroke-width=\"1.78\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"256\" x2=\"195\" y2=\"256\" stroke=\"#a9bec9\" stroke-width=\"2.3\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"256\" x2=\"175.5\" y2=\"302\" stroke=\"#87a7b8\" stroke-width=\"1.82\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"175.5\" y1=\"256\" x2=\"156\" y2=\"302\" stroke=\"#a9bec9\" stroke-width=\"1.78\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"175.5\" y1=\"256\" x2=\"195.5\" y2=\"302\" stroke=\"#87a7b8\" stroke-width=\"1.82\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"195.5\" y1=\"256\" x2=\"175.5\" y2=\"302\" stroke=\"#a9bec9\" stroke-width=\"1.78\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"302\" x2=\"195\" y2=\"302\" stroke=\"#a9bec9\" stroke-width=\"2.3\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"77\" x2=\"156\" y2=\"133\" stroke=\"#a9bec9\" stroke-width=\"2.6\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"77\" x2=\"195\" y2=\"133\" stroke=\"#a9bec9\" stroke-width=\"2.5\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"170.5\" y1=\"91\" x2=\"191\" y2=\"120\" stroke=\"#87a7b8\" stroke-width=\"1.8\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"181\" y1=\"91\" x2=\"159\" y2=\"123\" stroke=\"#a9bec9\" stroke-width=\"1.9\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"133\" x2=\"195\" y2=\"133\" stroke=\"#a9bec9\" stroke-width=\"2.3\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"300\" x2=\"176\" y2=\"314\" stroke=\"#a9bec9\" stroke-width=\"2.4\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"195\" y1=\"300\" x2=\"176\" y2=\"314\" stroke=\"#87a7b8\" stroke-width=\"2.4\" opacity=\"1\" stroke-linecap=\"round\" />\n</g>\n<g id=\"ha-pylon-arm-left-upper\">\n<path d=\"M116.4 110.6 L156.8 130.7 L196 132.7\" stroke=\"#a9bec9\" stroke-width=\"4.0\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M116.4 110.6 L156 166.7\" stroke=\"#a9bec9\" stroke-width=\"4.25\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M116.4 110.6 L176 154.4\" stroke=\"#a9bec9\" stroke-width=\"3.15\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M116.4 110.6 L195 132.8\" stroke=\"#a9bec9\" stroke-width=\"2.9\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<line x1=\"131.4\" y1=\"120\" x2=\"155.5\" y2=\"167\" stroke=\"#bad1dd\" stroke-width=\"0.95\" opacity=\"0.85\" stroke-linecap=\"round\" />\n<line x1=\"157\" y1=\"130.7\" x2=\"176\" y2=\"154.4\" stroke=\"#87a7b8\" stroke-width=\"2.1\" opacity=\"1\" stroke-linecap=\"round\" />\n</g>\n<g id=\"ha-pylon-arm-right-upper\">\n<path d=\"M196.0 132.6 L239.4 180.8\" stroke=\"#a9bec9\" stroke-width=\"4.45\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M176 129.9 L239.4 180.8\" stroke=\"#a9bec9\" stroke-width=\"3.75\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M156.3 132.7 L239.4 180.8\" stroke=\"#a9bec9\" stroke-width=\"3.05\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M176 163.4 L239.4 180.8\" stroke=\"#a9bec9\" stroke-width=\"3.05\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<line x1=\"198.7\" y1=\"137\" x2=\"238\" y2=\"180\" stroke=\"#bad1dd\" stroke-width=\"1\" opacity=\"0.85\" stroke-linecap=\"round\" />\n</g>\n<g id=\"ha-pylon-arm-left-lower\">\n<path d=\"M116.5 163.8 L156 184.8 L195.4 186\" stroke=\"#a9bec9\" stroke-width=\"4.0\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M116.5 163.8 L156 217.3\" stroke=\"#a9bec9\" stroke-width=\"4.4\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M116.5 163.8 L176 207.6\" stroke=\"#a9bec9\" stroke-width=\"3.25\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M116.5 163.8 L196.0 185.7\" stroke=\"#a9bec9\" stroke-width=\"2.8\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<line x1=\"130\" y1=\"173\" x2=\"154\" y2=\"213\" stroke=\"#bad1dd\" stroke-width=\"0.9\" opacity=\"0.85\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"186\" x2=\"176\" y2=\"209\" stroke=\"#87a7b8\" stroke-width=\"2.2\" opacity=\"1\" stroke-linecap=\"round\" />\n</g>\n<g id=\"ha-pylon-arm-right-lower\">\n<path d=\"M195.8 187.7 L238.8 233.6\" stroke=\"#a9bec9\" stroke-width=\"4.45\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M176 181.6 L238.8 233.6\" stroke=\"#a9bec9\" stroke-width=\"3.85\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M156 186.1 L238.8 233.6\" stroke=\"#a9bec9\" stroke-width=\"3.1\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M175 223.6 L238.8 233.6\" stroke=\"#87a7b8\" stroke-width=\"3.3\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<line x1=\"196\" y1=\"192\" x2=\"238\" y2=\"233\" stroke=\"#bad1dd\" stroke-width=\"0.95\" opacity=\"0.8\" stroke-linecap=\"round\" />\n</g>\n<g id=\"ha-pylon-front-lattice\">\n<path d=\"M176 78 L176 447\" stroke=\"#a9bec9\" stroke-width=\"4.65\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M156 134 L156 300.3 L91 398\" stroke=\"#a9bec9\" stroke-width=\"3.7\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M195 134 L195 300.3 L261 398\" stroke=\"#a9bec9\" stroke-width=\"3.55\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<line x1=\"174.65\" y1=\"87\" x2=\"174.65\" y2=\"444\" stroke=\"#bad1dd\" stroke-width=\"0.92\" opacity=\"0.8\" stroke-linecap=\"round\" />\n<line x1=\"156.4\" y1=\"181\" x2=\"156.4\" y2=\"298\" stroke=\"#bad1dd\" stroke-width=\"0.72\" opacity=\"0.65\" stroke-linecap=\"round\" />\n<line x1=\"194\" y1=\"190\" x2=\"194\" y2=\"300\" stroke=\"#bad1dd\" stroke-width=\"0.72\" opacity=\"0.8\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"171\" x2=\"176\" y2=\"184\" stroke=\"#a9bec9\" stroke-width=\"2.9\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"184\" x2=\"195\" y2=\"171\" stroke=\"#87a7b8\" stroke-width=\"2.6\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"222\" x2=\"176\" y2=\"235\" stroke=\"#a9bec9\" stroke-width=\"2.9\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"235\" x2=\"195\" y2=\"222\" stroke=\"#87a7b8\" stroke-width=\"2.6\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"266\" x2=\"176\" y2=\"279\" stroke=\"#a9bec9\" stroke-width=\"2.9\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"279\" x2=\"195\" y2=\"266\" stroke=\"#87a7b8\" stroke-width=\"2.6\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"301\" x2=\"176\" y2=\"314\" stroke=\"#a9bec9\" stroke-width=\"2.9\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"314\" x2=\"195\" y2=\"301\" stroke=\"#87a7b8\" stroke-width=\"2.6\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"221\" x2=\"176\" y2=\"275\" stroke=\"#a9bec9\" stroke-width=\"1.65\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"232\" x2=\"156\" y2=\"265\" stroke=\"#a9bec9\" stroke-width=\"1.6\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"195\" y1=\"221\" x2=\"176\" y2=\"275\" stroke=\"#a9bec9\" stroke-width=\"1.65\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"232\" x2=\"195\" y2=\"265\" stroke=\"#a9bec9\" stroke-width=\"1.6\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"265\" x2=\"176\" y2=\"311\" stroke=\"#a9bec9\" stroke-width=\"1.65\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"276\" x2=\"156\" y2=\"301\" stroke=\"#a9bec9\" stroke-width=\"1.6\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"195\" y1=\"265\" x2=\"176\" y2=\"311\" stroke=\"#a9bec9\" stroke-width=\"1.65\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"276\" x2=\"195\" y2=\"301\" stroke=\"#a9bec9\" stroke-width=\"1.6\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"156\" y1=\"300\" x2=\"176\" y2=\"315\" stroke=\"#a9bec9\" stroke-width=\"2.8\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"195\" y1=\"300\" x2=\"176\" y2=\"315\" stroke=\"#87a7b8\" stroke-width=\"2.9\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"315\" x2=\"91\" y2=\"398\" stroke=\"#a9bec9\" stroke-width=\"2.5\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"315\" x2=\"261\" y2=\"398\" stroke=\"#a9bec9\" stroke-width=\"2.45\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"138.7\" y1=\"330.7\" x2=\"214\" y2=\"332\" stroke=\"#a9bec9\" stroke-width=\"2.2\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"116\" y1=\"362\" x2=\"236\" y2=\"363\" stroke=\"#a9bec9\" stroke-width=\"2.25\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"139\" y1=\"331\" x2=\"176\" y2=\"352\" stroke=\"#a9bec9\" stroke-width=\"2.05\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"213\" y1=\"333\" x2=\"176\" y2=\"352\" stroke=\"#a9bec9\" stroke-width=\"2.05\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"116\" y1=\"362\" x2=\"176\" y2=\"416\" stroke=\"#a9bec9\" stroke-width=\"2.4\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"236\" y1=\"363\" x2=\"176\" y2=\"416\" stroke=\"#a9bec9\" stroke-width=\"2.5\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"91\" y1=\"398\" x2=\"176\" y2=\"416\" stroke=\"#a9bec9\" stroke-width=\"2.6\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"261\" y1=\"398\" x2=\"176\" y2=\"416\" stroke=\"#a9bec9\" stroke-width=\"2.7\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"353\" x2=\"176\" y2=\"416\" stroke=\"#a9bec9\" stroke-width=\"3.45\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"91\" y1=\"398\" x2=\"176\" y2=\"447\" stroke=\"#a9bec9\" stroke-width=\"2.5\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"261\" y1=\"398\" x2=\"176\" y2=\"447\" stroke=\"#a9bec9\" stroke-width=\"2.5\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"176\" y1=\"417\" x2=\"176\" y2=\"447\" stroke=\"#a9bec9\" stroke-width=\"4.1\" opacity=\"1\" stroke-linecap=\"round\" />\n<line x1=\"174.7\" y1=\"418\" x2=\"174.7\" y2=\"443\" stroke=\"#bad1dd\" stroke-width=\"0.85\" opacity=\"0.8\" stroke-linecap=\"round\" />\n</g>\n<g id=\"ha-pylon-feet\">\n<path d=\"M87.4 397.8 L91.2 395.2 L95.2 397.4 L91.2 400.8 Z\" fill=\"#b4d0dc\" />\n<path d=\"M91.2 400.8 L95.2 397.4 L95.2 400.7 L91.3 403.1 Z\" fill=\"#96b9c8\" />\n<path d=\"M87.4 397.8 L91.2 400.8 L91.3 403.1 L87.4 400.4 Z\" fill=\"#d0e4ea\" />\n<path d=\"M257.2 397.8 L261.2 395.2 L265.0 397.6 L261 400.6 Z\" fill=\"#b2cfda\" />\n<path d=\"M261 400.6 L265 397.6 L265 400.3 L261 403 Z\" fill=\"#94b8c7\" />\n<path d=\"M257.2 397.8 L261 400.6 L261 403 L257.2 400.3 Z\" fill=\"#c8dfe7\" />\n<path d=\"M171.2 445.7 L176 442.6 L180.9 445.7 L176 449.1 Z\" fill=\"#bdd7e0\" />\n<path d=\"M171.2 445.7 L176 449.1 L176 452.1 L171.2 448.7 Z\" fill=\"#c8dee5\" />\n<path d=\"M176 449.1 L180.9 445.7 L180.9 449 L176 452.1 Z\" fill=\"#88afbf\" />\n</g>\n<g id=\"ha-pylon-end-plates\">\n<circle cx=\"116.4\" cy=\"110.6\" r=\"4.35\" fill=\"#a9bec9\" />\n<circle cx=\"115.60000000000001\" cy=\"109.6\" r=\"1.95\" fill=\"#87a7b8\" />\n<circle cx=\"116.5\" cy=\"163.8\" r=\"4.35\" fill=\"#a9bec9\" />\n<circle cx=\"115.7\" cy=\"162.8\" r=\"1.95\" fill=\"#87a7b8\" />\n<circle cx=\"239.4\" cy=\"180.8\" r=\"4.35\" fill=\"#a9bec9\" />\n<circle cx=\"238.6\" cy=\"179.8\" r=\"1.95\" fill=\"#87a7b8\" />\n<circle cx=\"238.8\" cy=\"233.6\" r=\"4.35\" fill=\"#a9bec9\" />\n<circle cx=\"238.0\" cy=\"232.6\" r=\"1.95\" fill=\"#87a7b8\" />\n</g>\n<g id=\"ha-pylon-conductors\" stroke=\"#779aa8\" stroke-width=\"1.25\" stroke-linejoin=\"round\" stroke-linecap=\"round\">\n<path d=\"M83 130.6 L155 88.6\" stroke=\"#779aa8\" stroke-width=\"1.23\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M83 184.6 L155 141.9\" stroke=\"#779aa8\" stroke-width=\"1.23\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M194.9 227.2 L260 172.2\" stroke=\"#779aa8\" stroke-width=\"1.23\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M194.9 281 L260 225.7\" stroke=\"#779aa8\" stroke-width=\"1.23\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n</g>\n<g id=\"ha-pylon-flex-conductor-loops\">\n<path d=\"M98.5 125.8 C101 145 129 138 138.5 103.8\" stroke=\"#83a9b8\" stroke-width=\"1.55\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M98.5 179.4 C100.4 199 129 192 138.5 157.4\" stroke=\"#83a9b8\" stroke-width=\"1.55\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M218.5 193.3 C219.5 220 254.4 220.5 260.5 169\" stroke=\"#83a9b8\" stroke-width=\"1.55\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n<path d=\"M218.5 246.6 C219 273 254.4 274 260.5 222.1\" stroke=\"#83a9b8\" stroke-width=\"1.55\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" />\n</g>\n<g id=\"ha-pylon-insulators\">\n<g id=\"ha-pylon-insulator-left-top\" transform=\"translate(116.4 114.6) rotate(-30)\">\n<rect x=\"-22\" y=\"-2\" width=\"44\" height=\"4\" rx=\"1\" fill=\"#8dabb9\" />\n<rect x=\"-22\" y=\"-2\" width=\"44\" height=\"1.3\" rx=\"0.5\" fill=\"#c7dde7\" />\n<rect x=\"-21.5\" y=\"-3.15\" width=\"2.1\" height=\"6.3\" rx=\"1\" fill=\"#6e96a8\" />\n<rect x=\"20.3\" y=\"-3.15\" width=\"2.1\" height=\"6.3\" rx=\"1\" fill=\"#6e96a8\" />\n<ellipse cx=\"-18.30\" cy=\"0\" rx=\"2.75\" ry=\"5.2\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M-19.70 -4.25 Q-21.00 -2.60 -19.50 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"-13.75\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M-15.15 -5.60 Q-16.45 -3.27 -14.95 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"-9.20\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M-10.60 -5.60 Q-11.90 -3.27 -10.40 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"-4.65\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M-6.05 -5.60 Q-7.35 -3.27 -5.85 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"-0.10\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M-1.50 -5.60 Q-2.80 -3.27 -1.30 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"4.45\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M3.05 -5.60 Q1.75 -3.27 3.25 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"9.00\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M7.60 -5.60 Q6.30 -3.27 7.80 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"13.55\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M12.15 -5.60 Q10.85 -3.27 12.35 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"18.10\" cy=\"0\" rx=\"2.75\" ry=\"5.2\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M16.70 -4.25 Q15.40 -2.60 16.90 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n</g>\n<g id=\"ha-pylon-insulator-left-bottom\" transform=\"translate(116.4 168.2) rotate(-30)\">\n<rect x=\"-22\" y=\"-2\" width=\"44\" height=\"4\" rx=\"1\" fill=\"#8dabb9\" />\n<rect x=\"-22\" y=\"-2\" width=\"44\" height=\"1.3\" rx=\"0.5\" fill=\"#c7dde7\" />\n<rect x=\"-21.5\" y=\"-3.15\" width=\"2.1\" height=\"6.3\" rx=\"1\" fill=\"#6e96a8\" />\n<rect x=\"20.3\" y=\"-3.15\" width=\"2.1\" height=\"6.3\" rx=\"1\" fill=\"#6e96a8\" />\n<ellipse cx=\"-18.30\" cy=\"0\" rx=\"2.75\" ry=\"5.2\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M-19.70 -4.25 Q-21.00 -2.60 -19.50 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"-13.75\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M-15.15 -5.60 Q-16.45 -3.27 -14.95 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"-9.20\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M-10.60 -5.60 Q-11.90 -3.27 -10.40 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"-4.65\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M-6.05 -5.60 Q-7.35 -3.27 -5.85 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"-0.10\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M-1.50 -5.60 Q-2.80 -3.27 -1.30 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"4.45\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M3.05 -5.60 Q1.75 -3.27 3.25 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"9.00\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M7.60 -5.60 Q6.30 -3.27 7.80 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"13.55\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M12.15 -5.60 Q10.85 -3.27 12.35 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"18.10\" cy=\"0\" rx=\"2.75\" ry=\"5.2\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M16.70 -4.25 Q15.40 -2.60 16.90 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n</g>\n<g id=\"ha-pylon-insulator-right-top\" transform=\"translate(239.5 181.8) rotate(-30)\">\n<rect x=\"-22\" y=\"-2\" width=\"44\" height=\"4\" rx=\"1\" fill=\"#8dabb9\" />\n<rect x=\"-22\" y=\"-2\" width=\"44\" height=\"1.3\" rx=\"0.5\" fill=\"#c7dde7\" />\n<rect x=\"-21.5\" y=\"-3.15\" width=\"2.1\" height=\"6.3\" rx=\"1\" fill=\"#6e96a8\" />\n<rect x=\"20.3\" y=\"-3.15\" width=\"2.1\" height=\"6.3\" rx=\"1\" fill=\"#6e96a8\" />\n<ellipse cx=\"-18.30\" cy=\"0\" rx=\"2.75\" ry=\"5.2\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M-19.70 -4.25 Q-21.00 -2.60 -19.50 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"-13.75\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M-15.15 -5.60 Q-16.45 -3.27 -14.95 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"-9.20\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M-10.60 -5.60 Q-11.90 -3.27 -10.40 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"-4.65\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M-6.05 -5.60 Q-7.35 -3.27 -5.85 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"-0.10\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M-1.50 -5.60 Q-2.80 -3.27 -1.30 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"4.45\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M3.05 -5.60 Q1.75 -3.27 3.25 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"9.00\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M7.60 -5.60 Q6.30 -3.27 7.80 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"13.55\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M12.15 -5.60 Q10.85 -3.27 12.35 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"18.10\" cy=\"0\" rx=\"2.75\" ry=\"5.2\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M16.70 -4.25 Q15.40 -2.60 16.90 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n</g>\n<g id=\"ha-pylon-insulator-right-bottom\" transform=\"translate(239.5 235.1) rotate(-30)\">\n<rect x=\"-22\" y=\"-2\" width=\"44\" height=\"4\" rx=\"1\" fill=\"#8dabb9\" />\n<rect x=\"-22\" y=\"-2\" width=\"44\" height=\"1.3\" rx=\"0.5\" fill=\"#c7dde7\" />\n<rect x=\"-21.5\" y=\"-3.15\" width=\"2.1\" height=\"6.3\" rx=\"1\" fill=\"#6e96a8\" />\n<rect x=\"20.3\" y=\"-3.15\" width=\"2.1\" height=\"6.3\" rx=\"1\" fill=\"#6e96a8\" />\n<ellipse cx=\"-18.30\" cy=\"0\" rx=\"2.75\" ry=\"5.2\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M-19.70 -4.25 Q-21.00 -2.60 -19.50 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"-13.75\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M-15.15 -5.60 Q-16.45 -3.27 -14.95 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"-9.20\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M-10.60 -5.60 Q-11.90 -3.27 -10.40 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"-4.65\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M-6.05 -5.60 Q-7.35 -3.27 -5.85 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"-0.10\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M-1.50 -5.60 Q-2.80 -3.27 -1.30 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"4.45\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M3.05 -5.60 Q1.75 -3.27 3.25 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"9.00\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M7.60 -5.60 Q6.30 -3.27 7.80 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"13.55\" cy=\"0\" rx=\"2.75\" ry=\"6.55\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M12.15 -5.60 Q10.85 -3.27 12.35 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n<ellipse cx=\"18.10\" cy=\"0\" rx=\"2.75\" ry=\"5.2\" fill=\"#bdd6e2\" stroke=\"#8dacba\" stroke-width=\".87\" />\n<path d=\"M16.70 -4.25 Q15.40 -2.60 16.90 0\" stroke=\"#edf6f8\" opacity=\".77\" stroke-width=\".78\" />\n</g>\n</g>\n<g id=\"ha-pylon-top-cap\">\n<path d=\"M169.8 74.8 L176.2 70.9 L182.5 74.4 L176 78.8 Z\" fill=\"#bad1dd\" />\n<path d=\"M169.8 74.8 L176 78.8 L176 82.2 L169.8 78.3 Z\" fill=\"#87a7b8\" />\n<path d=\"M176 78.8 L182.5 74.4 L182.5 78 L176 82.2 Z\" fill=\"#a9bec9\" />\n</g>\n"
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
  const baseBounds={x:8,y:-87,width:211,height:230,labelY:161,centerX:113,centerY:46};
  const geometry=n=>{
    const sx=clamp(n?.width_scale,.5,2.4,1),sy=clamp(n?.height_scale,.5,2.4,1);
    return {x:97+(baseBounds.x-97)*sx,y:46+(baseBounds.y-46)*sy,
      width:baseBounds.width*sx,height:baseBounds.height*sy,
      labelY:46+(baseBounds.labelY-46)*sy,centerX:97+(baseBounds.centerX-97)*sx,
      centerY:46,sx,sy};
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
  const powerReading=(h,id)=>{
    const r=HASSStudioHA.reading(h,id);
    if(!r||r.value<0)return null;
    if(['%','percent'].includes(r.unit)||(!r.unit&&r.value<=100))
      return r.value<=100?{value:r.value,unit:'%'}:null;
    if(r.unit==='W'&&r.value<=500000)return {value:r.value/1000,unit:'kW'};
    if(r.unit==='kW'&&r.value<=500)return {value:r.value,unit:'kW'};
    return null;
  };
  const stateReading=(h,id)=>{
    if(!id)return null;
    const value=String(HASSStudioHA.entity(h,id)?.state??'').trim().toLowerCase();
    if(['on','burning','active','running','heating','fire','true','1'].includes(value))return 'burning';
    if(['ignition','starting','igniting','lighting'].includes(value))return 'ignition';
    if(['embers','smoldering','cooling','glowing','stopping'].includes(value))return 'embers';
    if(['off','idle','standby','stopped','false','0'].includes(value))return 'off';
    return null;
  };
  const booleanReading=(h,id)=>{
    if(!id)return null;
    const value=String(HASSStudioHA.entity(h,id)?.state??'').trim().toLowerCase();
    if(['on','true','1','active','running','open','alarm','fault','error','critical'].includes(value))return true;
    if(['off','false','0','inactive','closed','idle','normal','ok','clear'].includes(value))return false;
    return null;
  };
  const readings=(node,hass)=>{
    const test=node.pellet_test_mode===true;
    const temp=test?clamp(node.pellet_manual_temperature,-40,150,65):
      HASSStudioSolidFuel.temperature(hass,node.entity);
    const unit=node.pellet_manual_power_unit==='kW'?'kW':'%';
    const power=test?{value:clamp(node.pellet_manual_power,0,unit==='%'?100:500,65),unit}:
      powerReading(hass,node.pellet_burner_power_entity);
    const measured=test?null:stateReading(hass,node.burner_entity);
    const forced=!test&&['burning','embers','off'].includes(node.solid_state)?node.solid_state:null;
    let state;
    if(test)state=['off','ignition','burning','embers'].includes(node.pellet_manual_state)?
      node.pellet_manual_state:'burning';
    else if(forced)state=forced;
    else if(measured)state=measured;
    else if(power)state=power.value>0?'burning':'off';
    else if(node.burner_entity||node.pellet_burner_power_entity)state='off';
    else state=HASSStudioSolidFuel.resolveState(node,hass); // Legacy visual fallback only.
    const known=test||!!forced||!!measured||power!==null;
    const alarm=test?node.pellet_manual_alarm===true:booleanReading(hass,node.pellet_alarm_entity)===true;
    const feeder=test?node.pellet_manual_feeder===true:booleanReading(hass,node.pellet_feeder_entity);
    const manualLevel=test||node.pellet_level_manual===true;
    const level=manualLevel?clamp(node.pellet_level_test,0,100,80):
      HASSStudioHA.percentage(hass,node.pellet_level_entity);
    const unassigned=!manualLevel&&!node.pellet_level_entity;
    return {test,temp,power,state,known,alarm,feeder,level,unassigned};
  };
  const burnerLabel=r=>{
    if(r.alarm)return 'ALARM';
    if(!r.known)return 'PALNIK —';
    if(r.state==='ignition')return 'ROZPALANIE';
    if(r.state==='embers')return 'WYGASZANIE';
    if(r.state==='off')return r.power?'STOP  0'+r.power.unit:'STOP';
    if(!r.power)return 'PRACA';
    const n=r.power.unit==='%'?String(Math.round(r.power.value)):
      r.power.value>=10?r.power.value.toFixed(1):r.power.value.toFixed(2);
    return 'PRACA '+n+r.power.unit;
  };
  const render=(node,hass)=>{
    const r=readings(node,hass),actual=r.temp;
    const t=actual===null?null:clamp(actual,20,90,20),amount=t===null?0:(t-20)/70;
    const arc=t===null?0:46+amount*118,hue=118-amount*95;
    const glow=clamp(node.solid_glow,0,100,76)/100;
    const prefix='sspellet'+String(node.id||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,24);
    const known=r.level!==null&&Number.isFinite(r.level);
    const low=known&&r.level<=clamp(node.pellet_alarm_pct,0,100,20);
    const bindings={'pellet-level-warning':{visibility:low?'visible':'hidden'}};
    for(let i=1;i<=5;i++){
      const on=known&&r.level>=[18,38,58,78,98][i-1];
      bindings['pellet-level-'+i]={opacity:r.unassigned?'.85':known?'1':'.35',
        fill:r.unassigned?'#4a86a8':!known?'#65727c':
          on?(low?'#ed4d47':r.level<=40?'#efa647':r.level<=60?'#e8cf50':'#42db8a'):'#46535d'};
    }
    const color=r.alarm?'#ff9a58':!r.known?'#9edbff':r.state==='burning'?'#7ce2aa':r.state==='off'?'#a4c3d8':'#e9c476';
    const led=r.alarm?'#ff8e41':!r.known?'#4a93bb':r.state==='burning'?'#44da94':r.state==='off'?'#678598':'#e6b751';
    const feed=r.feeder===true?'#5ae6ab':r.feeder===false?'#516477':'#4c82a5';
    const image=HASSStudioSvg.namespaceIds(
      HASSStudioSvg.inject(
        HASSStudioSvg.apply(HASSStudioIconTemplates.pellet,{
          tempValue:{text:actual===null?'—':actual.toFixed(1)+'°'},
          pelletTestIndicator:{visibility:r.test?'visible':'hidden'},
          burnerStatusText:{text:burnerLabel(r),fill:color,
            'data-more':!r.test&&node.burner_entity?node.burner_entity:''},
          burnerStatusLed:{fill:led},pelletFeedLed:{fill:feed},
          ...bindings,
          statusArc:{stroke:t===null?'#60b5da':'hsl('+hue.toFixed(1)+' 88% 48%)',
            'stroke-dasharray':arc.toFixed(1)+' 176'}
        }),{combustionSlot:combustion(r.state,glow)}
      ),prefix
    );
    const {sx,sy}=geometry(node);
    return '<g class="ss-modern-pellet" data-combustion="'+r.state+'" data-source="'+(r.test?'test':'ha')+'">'+
      '<g class="ss-pellet-dimensions" transform="translate(97 46) scale('+sx+' '+sy+') translate(-97 -46)">'+
      '<g transform="translate(12 -84) scale(.2 .2) translate(-84 -82)">'+image+'</g></g></g>';
  };
  const styles='<style>@media(prefers-reduced-motion:reduce){.ss-modern-pellet .ss-fire,.ss-modern-pellet .ss-embers{animation:none!important}}</style>';
  return {render,styles,geometry,combustion,readings,powerReading,stateReading,booleanReading,burnerLabel};
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
    // The TEST badge sits below the body and must scale with it.
    const hasTestBadge=n?.hp_test_mode===true;
    return {x:cx+(base.x-cx)*sx,y:cy+(base.y-cy)*sy,
      width:base.width*sx,height:(hasTestBadge?92-base.y:base.height)*sy,
      labelY:cy+((hasTestBadge?109.5:base.labelY)-cy)*sy,centerX:cx,centerY:cy,sx,sy};
  };
  const render=(node,hass)=>{
    const manual=node.hp_test_mode===true;
    const kw=manual?clamp(node.hp_manual_kw,0,500,0):power(hass,node.hp_power_entity);
    const fanPct=manual?clamp(node.hp_manual_fan,0,100,0):null;
    const speed=manual?{percent:fanPct,label:Math.round(fanPct)+'%',unit:'%'}:fan(hass,node.hp_fan_entity,node.hp_max_rpm);
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
    return '<g class="ss-modern-heat-pump" data-mode="'+(manual?'manual':'live')+'" data-fan="'+(speed===null?'unknown':pct.toFixed(1))+'" data-power="'+(kw===null?'unknown':kw.toFixed(2))+'">'+
      '<g class="ss-hp-dimensions" transform="translate(108.32 9.96) scale('+sx+' '+sy+') translate(-108.32 -9.96)">'+
      '<g transform="translate(45 -45) scale(.1 .1)">'+image+'</g>'+
      (manual?'<g class="ss-hp-test-label"><rect x="145" y="76" width="44" height="16" rx="6" fill="#3b4e67" stroke="#84bee4" stroke-width=".8"/>'+
        '<text x="167" y="87.6" fill="#d9f1ff" font-family="Arial,sans-serif" font-size="10" font-weight="bold" text-anchor="middle">TEST</text></g>':'')+'</g></g>';
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
      '<g transform="translate(20 -102) scale(.255 .255) translate(-158 -132)">'+body+'</g></g></g>';
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


/* Uniform SVG readout scaling used by all device renderers with separate data panels.
 * Geometry and typography share the exact same transform: no nonuniform scaling.
 */
const HASSStudioReadoutScale=(()=>{
  const factor=(value,fallback=1)=>{
    const n=Number(value);
    return value!==''&&value!=null&&Number.isFinite(n)?Math.max(.4,Math.min(1.5,n)):fallback;
  };
  // Move to anchor, scale all children (including glyphs), then restore origin.
  const around=(x,y,s)=>'translate('+x+' '+y+') scale('+s+') translate('+(-x)+' '+(-y)+')';
  const box=(x,y,width,height,scale,anchorX=x,anchorY=y)=>{
    const s=factor(scale);
    return {x:anchorX+(x-anchorX)*s,y:anchorY+(y-anchorY)*s,width:width*s,height:height*s};
  };
  const union=(a,b)=>{
    if(!b)return {...a};
    const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);
    return {x,y,width:Math.max(a.x+a.width,b.x+b.width)-x,height:Math.max(a.y+a.height,b.y+b.height)-y};
  };
  // Namespaced SVG assets retain their group suffixes; keep any existing transform.
  const namedGroup=(markup,id,centerX,centerY,value)=>{
    const scale=factor(value);
    if(scale===1)return markup;
    const re=/<g\b[^>]*\bid="([^"]+)"[^>]*>/g;
    let count=0;
    const result=markup.replace(re,(tag,found)=>{
      if(found!==id&&!found.endsWith(id))return tag;
      count++;
      const t=around(centerX,centerY,scale);
      return /\btransform="[^"]*"/.test(tag)
        ?tag.replace(/\btransform="([^"]*)"/,(_,existing)=>'transform="'+t+' '+existing+'"')
        :tag.slice(0,-1)+' transform="'+t+'">';
    });
    return count===1?result:markup;
  };
  return Object.freeze({factor,around,box,union,namedGroup});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioReadoutScale;


/* Power Grid: read-only three-phase SVG device renderer.
 * Source art: src/icons/power-grid-*.svg; editable icons embedded by build.py.
 */
const HASSStudioPowerGrid=(()=>{
 const num=(x,a,b,d)=>x!==''&&x!=null&&Number.isFinite(Number(x))?Math.max(a,Math.min(b,Number(x))):d;
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&apos;'}[c]));
 const FIELDS=['l1_v','l1_a','l2_v','l2_a','l3_v','l3_a','total_kw','import_kw','export_kw','frequency','power_factor'];
 const EXTRAS=['total_kw','import_kw','export_kw','frequency','power_factor','grid_status','voltage_alarm','phase_loss'];
 const defaults=()=>({variant:'classic',theme:'auto',panel_position:'right',panel_x:0,panel_y:0,panel_scale:.7,
  show_panel:true,show_v:true,show_a:true,show_l1:true,show_l2:true,show_l3:true,
  show_extras:[],mode:'live',entities:{},manual:{l1_v:231.8,l1_a:4.2,l2_v:229.7,l2_a:3.8,l3_v:233.5,l3_a:5.1,
  total_kw:2.5,import_kw:2.5,export_kw:0,frequency:49.98,power_factor:0.98,grid_status:1,voltage_alarm:0,phase_loss:0},
  min_voltage:207,max_voltage:253});
 const normalize=(node)=>{
  const d=defaults(),raw=node?.power_grid||{},entities=raw.entities||{},manual=raw.manual||{};
  return {...d,...raw,variant:['modern','classic'].includes(node?.variant)?node.variant:(raw.variant==='modern'?'modern':'classic'),
   theme:['auto','light','dark'].includes(raw.theme)?raw.theme:'auto',
   panel_position:['left','right','bottom'].includes(raw.panel_position)?raw.panel_position:'right',
   panel_x:num(raw.panel_x,-250,250,0),panel_y:num(raw.panel_y,-250,250,0),panel_scale:HASSStudioReadoutScale.factor(raw.panel_scale,.7),
   min_voltage:num(raw.min_voltage,0,350,207),max_voltage:num(raw.max_voltage,0,400,253),
   mode:raw.mode==='manual'?'manual':'live',
   entities:Object.fromEntries([...FIELDS,'grid_status','voltage_alarm','phase_loss'].map(k=>[k,typeof entities[k]==='string'?entities[k]:''])),
   manual:Object.fromEntries([...FIELDS,'grid_status','voltage_alarm','phase_loss'].map(k=>[k,num(manual[k],-10000,10000,d.manual[k])])),
   show_extras:EXTRAS.filter(k=>Array.isArray(raw.show_extras)&&raw.show_extras.includes(k))};
 };
 const reading=(key,conf,hass)=>{
  if(conf.mode==='manual')return conf.manual[key];
  const id=conf.entities[key];
  if(!id||!/^[-\w]+\.[-\w]+$/.test(id))return null;
  const state=hass?.states?.[id];
  if(!state||['unknown','unavailable','none',''].includes(String(state.state).toLowerCase()))return null;
  const n=Number(state.state);
  if(!Number.isFinite(n))return null;
  const unit=String(state.attributes?.unit_of_measurement||'').trim();
  if(key==='total_kw'||key==='import_kw'||key==='export_kw'){
   if(unit==='W')return n/1000;
   if(unit===''||unit==='kW')return n;
   return null;
  }
  if(key.endsWith('_v')&&unit!==''&&unit!=='V')return null;
  if(key.endsWith('_a')&&unit!==''&&unit!=='A')return null;
  if(key==='frequency'&&unit!==''&&unit!=='Hz')return null;
  if(key==='power_factor'&&unit!==''&&unit!=='%'&&unit!=='1')return null;
  return n;
 };
 const status=(key,c,h)=>{
  if(c.mode==='manual')return Boolean(c.manual[key]);
  const id=c.entities[key],s=h?.states?.[id]?.state;
  if(!id||s==null||['unknown','unavailable'].includes(String(s).toLowerCase()))return null;
  const v=String(s).toLowerCase();
  if(['on','true','1','active','alarm','problem'].includes(v))return true;
  if(['off','false','0','inactive','normal','ok'].includes(v))return false;
  return null;
 };
 const resolve=(node,hass)=>{
  const c=normalize(node);const phase={};let alarm=false;
  for(const n of [1,2,3]){
   const v=reading('l'+n+'_v',c,hass),a=reading('l'+n+'_a',c,hass);
   const voltageAlert=v!==null&&(v<c.min_voltage||v>c.max_voltage);
   phase['l'+n]={v,a,voltageAlert};alarm ||=voltageAlert;
  }
  const voltageAlarm=status('voltage_alarm',c,hass),phaseLoss=status('phase_loss',c,hass);
  alarm ||=voltageAlarm===true||phaseLoss===true;
  return {config:c,phase,alarm,voltageAlarm,phaseLoss,gridStatus:status('grid_status',c,hass)};
 };
 const geometry=node=>{
  const c=normalize(node);const visible=c.show_panel&&(c.show_v||c.show_a||c.show_extras.length>0);
  const gap=14,body={x:0,y:0,width:164,height:164},panelW=164,panelH=156+Math.min(c.show_extras.length,8)*20;
  let panel={x:body.width+gap+c.panel_x,y:10+c.panel_y,width:panelW,height:panelH};
  if(c.panel_position==='left')panel={...panel,x:-panelW-gap+c.panel_x};
  if(c.panel_position==='bottom')panel={...panel,x:(body.width-panelW)/2+c.panel_x,y:body.height+gap+c.panel_y};
  const panelBounds=HASSStudioReadoutScale.box(panel.x,panel.y,panel.width,panel.height,c.panel_scale,panel.x,panel.y);
  const x=visible?Math.min(body.x,panelBounds.x):body.x,y=visible?Math.min(body.y,panelBounds.y):body.y;
  const right=visible?Math.max(body.width,panelBounds.x+panelBounds.width):body.width;
  const bottom=visible?Math.max(body.height,panelBounds.y+panelBounds.height):body.height;
  return {x,y,width:right-x,height:bottom-y,body,panel,panelBounds,centerX:82,labelY:bottom+14,readingY:bottom+28};
 };
 const fmt=(v,d=1)=>v===null?'—':num(v,-100000,100000,0).toFixed(d);
 const cell=(x,y,text,alert=false,anchor='end')=>'<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-size="10.5" font-family="Arial,sans-serif" font-weight="600" fill="'+(alert?'#ff6c69':'#dce8f2')+'">'+esc(text)+'</text>';
 const render=(node,hass)=>{
  const data=resolve(node,hass),c=data.config,g=geometry(node);
  const pref=node?.id?'ssgrid'+String(node.id).replace(/[^a-zA-Z0-9_-]/g,''):'ssgridstandalone';
  const dark=c.theme==='dark'||(c.theme==='auto'&&hass?.themes?.darkMode===true);
  const key=c.variant==='modern'?(dark?'powerGridModernDark':'powerGridModernLight'):'powerGridClassic';
  const source=typeof HASSStudioIconTemplates!=='undefined'?HASSStudioIconTemplates[key]:null;
  // Equal physical footprint: Classic square and Modern portrait occupy 118 x 164.
  const art=source?'<svg x="0" y="0" width="164" height="164" viewBox="'+(c.variant==='modern'?'49 63 245 395':'0 0 300 300')+'" preserveAspectRatio="xMidYMid meet">'+
    HASSStudioSvg.namespaceIds(source,pref+'-')+'</svg>':
    '<path d="M59 8L16 159H102L59 8ZM43 66H76M28 117H90M59 8V159M22 145L85 96M96 145L33 96" fill="none" stroke="#a7c9da" stroke-width="2.5"/>';
  const rows=[];let yy=29;
  for(const n of [1,2,3]){
   if(c['show_l'+n]===false)continue;
   const p=data.phase['l'+n],rowY=yy;
   rows.push('<g'+(p.voltageAlert?'':'')+'>'+
     cell(13,rowY,'L'+n,false,'start')+
     (c.show_v?cell(c.show_a?101:148,rowY,fmt(p.v)+' V',p.voltageAlert):'')+
     (c.show_a?cell(149,rowY,fmt(p.a)+' A'):'')+
     (p.voltageAlert?'<path d="M150 '+(rowY-12)+' l6 11 h-12Z" fill="#ff6c69"/>':'')+'</g>');
   yy+=27;
  }
  const extraNames={total_kw:'Moc',import_kw:'Pobór',export_kw:'Oddawanie',frequency:'Hz',power_factor:'cos φ',
    grid_status:'Sieć',voltage_alarm:'Alarm U',phase_loss:'Brak fazy'};
  const extraUnits={total_kw:'kW',import_kw:'kW',export_kw:'kW',frequency:'Hz',power_factor:''};
  const extraRows=[];
  for(const k of c.show_extras){
   const flags=['grid_status','voltage_alarm','phase_loss'];
   const v=flags.includes(k)?(k==='grid_status'?data.gridStatus:k==='voltage_alarm'?data.voltageAlarm:data.phaseLoss):reading(k,c,hass);
   const flagAlert=(k==='grid_status'&&v===false)||((k==='phase_loss'||k==='voltage_alarm')&&v===true);
   const desc=flags.includes(k)?(v===null?'—':k==='grid_status'?(v?'Dostępna':'Brak'):v?'TAK':'NIE'):
     fmt(v,k==='frequency'?2:k==='power_factor'?2:2)+' '+(extraUnits[k]||'');
   extraRows.push(cell(13,yy,extraNames[k],false,'start')+cell(149,yy,desc,flagAlert)+(flagAlert?'<path d="M151 '+(yy-12)+' l5 9 h-10Z" fill="#ff6c69"/>':''));
   yy+=20;
  }
  const panelSvg=c.show_panel?'<g transform="translate('+g.panel.x+' '+g.panel.y+') scale('+c.panel_scale+')">'+
   '<rect x="0" y="0" width="'+g.panel.width+'" height="'+Math.max(42,yy+12)+'" rx="9" fill="#112332" stroke="#4b6678" stroke-width="1.5"/>'+
   '<rect x="6" y="6" width="'+(g.panel.width-12)+'" height="'+Math.max(30,yy)+'" rx="5" fill="#101c29"/>'+
   (rows.length||extraRows.length?'<path d="M11 39 H153" stroke="#354b5a" stroke-width=".65"/>':'')+
   rows.join('')+(extraRows.length?'<path d="M11 '+(yy-extraRows.length*20-12)+' H153" stroke="#405563" stroke-width=".8"/>':'')+
   extraRows.join('')+'</g>':'';
  return '<g class="ss-power-grid">'+art+panelSvg+'</g>';
 };
 return Object.freeze({defaults,normalize,reading,resolve,geometry,render,FIELDS,EXTRAS});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioPowerGrid;


/* Radiator renderer: user-supplied SVG, HA sensors, independent proportional screen scale. */
const HASSStudioRadiator=(()=>{
 const clamp=(v,a,z,d)=>v!==''&&v!=null&&Number.isFinite(Number(v))?Math.max(a,Math.min(z,Number(v))):d;
 const defaults=()=>({display:true,display_scale:1,mode:'live',mirror_horizontal:false,temperature_entity:'',valve_entity:'',manual_temperature:55,manual_open:42,glow:62});
 const normalize=node=>{
  const o=node?.radiator||{},d=defaults();
  return {...d,...o,display:o.display!==false,display_scale:HASSStudioReadoutScale.factor(o.display_scale),
   mode:o.mode==='manual'?'manual':'live',mirror_horizontal:o.mirror_horizontal===true,temperature_entity:typeof o.temperature_entity==='string'?o.temperature_entity:'',
   valve_entity:typeof o.valve_entity==='string'?o.valve_entity:'',
   manual_temperature:clamp(o.manual_temperature,-40,150,55),manual_open:clamp(o.manual_open,0,100,42),
   glow:clamp(o.glow,0,100,62)};
 };
 const data=(node,hass)=>{
  const c=normalize(node);
  const temp=c.mode==='manual'?c.manual_temperature:HASSStudioHA.temperature(hass,c.temperature_entity);
  const open=c.mode==='manual'?c.manual_open:HASSStudioHA.percentage(hass,c.valve_entity);
  return {c,temp,open};
 };
 const valveStatus=open=>open===null?{label:'—',color:'#a7bbc8'}:
    open<5?{label:'CLOSE',color:'#ff5d59'}:{label:'OPEN',color:'#76ddff'};
 const geometry=node=>{
  const c=normalize(node),body={x:0,y:0,width:176,height:132};
  return {...body,centerX:88,labelY:146,readingY:162};
 };
 const render=(node,hass)=>{
  const {c,temp,open}=data(node,hass);
  const tpl=typeof HASSStudioIconTemplates!=='undefined'?HASSStudioIconTemplates.radiator:null;
  if(!tpl)return '<rect width="176" height="132" rx="10" fill="#9fb7c7"/>';
  let svg=tpl;
  const replacements={tempText:temp===null?'—':Math.round(temp)+'°',
    openText:open===null?'—':Math.round(open)+'%'};
  svg=svg.replace(/(<text\b[^>]*\bid="(tempText|openText)"[^>]*>)([^<]*)(<\/text>)/g,
    (_,a,id,old,z)=>a+replacements[id]+z);
  const status=valveStatus(open);
  svg=svg.replace(/(<text\b[^>]*\bid="valveStatus"[^>]*>)[^<]*(<\/text>)/,
    (_,head,tail)=>head.replace(/fill="[^"]+"/,'fill="'+status.color+'"')+status.label+tail);
  for(let index=1;index<=4;index++){
    const enabled=open!==null&&open>=[5,25,50,75][index-1];
    const pattern=new RegExp('(<rect\\b[^>]*\\bid="bar'+index+'"[^>]*)(\\/>)');
    svg=svg.replace(pattern,(_,head,tail)=>
      head.replace(/\sopacity="[^"]*"/,'')+' opacity="'+(enabled?'1':'.16')+'"'+tail);
  }
  // Remove duplicated captions, retaining the original design's ring readings.
  svg=svg.replace(/(<text\b[^>]*x="1040"[^>]*>[\s\S]*?<\/text>)/g,'');
  svg=svg.replace(/(<text\b[^>]*\bid="(?:tempLarge|openLarge)"[^>]*>[\s\S]*?<\/text>)/g,'');
  const screenScale=c.display_scale,screenPivotX=960,screenPivotY=355;
  // Counter-reflect only the display assembly, keeping its typography legible.
  const readableMirror=c.mirror_horizontal?'translate(1920 0) scale(-1 1) ':'';
  // Apply to the entire display assembly, not just its border: text/ring/bars scale together.
  svg=svg.replace('<g id="displayGroup">','<g id="displayGroup" transform="'+
    readableMirror+HASSStudioReadoutScale.around(screenPivotX,screenPivotY,screenScale)+'"'+(c.display?'':' visibility="hidden"')+'>');
  svg=svg.replace('<g id="displayMountGroup">','<g id="displayMountGroup" transform="'+readableMirror.trim()+'"'+(c.display?'':' visibility="hidden"')+'>');
  if(c.mirror_horizontal)svg='<g class="ss-radiator-mirror" transform="translate(1470 0) scale(-1 1)">'+svg+'</g>';
  // Hide unknown readings and keep SVG fully read-only.
  const prefix='ssradiator'+String(node?.id||'preview').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,24)+'-';
  return '<svg x="0" y="0" width="176" height="132" viewBox="120 110 1230 840" preserveAspectRatio="xMidYMid meet">'+
    HASSStudioSvg.namespaceIds(svg,prefix)+'</svg>';
 };
 return Object.freeze({defaults,normalize,data,valveStatus,geometry,render});
})();


/* Modular manifold renderer using the editable src/icons/manifold.svg asset.
 * Configuration, HA read-only values and 1–40 circuit placement belong here.
 */
const HASSStudioManifold=(()=>{
  const MAX_CIRCUITS=40;
  const number=(value,min,max,fallback)=>value!==''&&value!=null&&Number.isFinite(Number(value))
    ?Math.max(min,Math.min(max,Number(value))):fallback;
  const f=(v,d=1)=>v===null?'—':Number(v).toFixed(d);
  const defaultCircuit=i=>({
    id:'circuit-'+(i+1),display:true,actuator:true,display_scale:1,
    tempOut:36+(i%3)*.7,tempReturn:28+(i%4)*.4,
    flow:Math.max(.2,1.6+((i%5)-2)*.15),open:65
  });
  const normalize=raw=>{
    const count=Math.round(number(raw?.count,1,MAX_CIRCUITS,5));
    const pitch=number(raw?.pitch,165,400,260);
    const mode=raw?.actuatorMode==='common'?'common':'individual';
    const values=Array.isArray(raw?.circuits)?raw.circuits:[];
    const maximumPanelScale=Math.max(0,...Array.from({length:count},(_,i)=>HASSStudioReadoutScale.factor(values[i]?.display_scale)));
    const sharedScale=HASSStudioReadoutScale.factor(raw?.display_scale);
    const effectivePitch=Math.max(pitch,150*Math.min(1.5,maximumPanelScale*sharedScale)+36);
    return {count,pitch:effectivePitch,requestedPitch:pitch,actuatorMode:mode,display_scale:HASSStudioReadoutScale.factor(raw?.display_scale),mode:raw?.mode==='manual'?'manual':'live',circuits:Array.from({length:count},(_,i)=>{
      const fallback=defaultCircuit(i),v=values[i]||{};
      return {id:fallback.id,display:v.display!==false,actuator:v.actuator!==false,display_scale:HASSStudioReadoutScale.factor(v.display_scale),
        tempOut:v.tempOut===null?null:number(v.tempOut,-30,120,fallback.tempOut),
        tempReturn:v.tempReturn===null?null:number(v.tempReturn,-30,120,fallback.tempReturn),
        flow:v.flow===null?null:number(v.flow,0,8,fallback.flow),open:v.open===null?null:number(v.open,0,100,fallback.open),
        entities:Object.fromEntries(['tempOut','tempReturn','flow','open'].map(k=>[k,typeof v.entities?.[k]==='string'?v.entities[k]:'']))};
    })};
  };
  const geometry=raw=>{
    const c=normalize(raw);
    return {x:0,y:0,width:410+(c.count-1)*c.pitch,height:765,
      centers:Array.from({length:c.count},(_,i)=>205+i*c.pitch)};
  };

  // All visual shapes, gradients, panel labels and editable template text live
  // in src/icons/manifold.svg. This JS only places clones and binds HA values.
  const source=()=>{
    if(typeof HASSStudioIconTemplates==='undefined'||typeof HASSStudioIconTemplates.manifold!=='string')
      throw new Error('Missing manifold.svg in HASSStudioIconTemplates');
    return HASSStudioIconTemplates.manifold.replace(/<g id="mf-preview">[\s\S]*?<\/g>/,'');
  };
  const part=(art,id)=>{
    const opening='<g id="'+id+'">';
    const start=art.indexOf(opening);
    if(start<0||art.indexOf(opening,start+opening.length)!==-1)throw new Error('Missing/duplicate SVG group: '+id);
    const end=art.indexOf('</g>',start+opening.length);
    if(end<0)throw new Error('Unclosed SVG group: '+id);
    return art.slice(start+opening.length,end);
  };
  const instance=(art,id,bindings,circuit)=>{
    let content=part(art,id);
    if(bindings)content=HASSStudioSvg.apply(content,bindings);
    // Duplicated readouts must not share document IDs across circuits.
    return content.replace(/\bid="([^"]+)"/g,(_,name)=>
      'id="mf-c'+circuit+'-'+name+'"');
  };
  const use=(name,x,y,transform='')=>
    '<use href="#'+name+'" transform="translate('+x+' '+y+')'+transform+'"/>';
  const renderStandalone=raw=>{
    const c=normalize(raw),box=geometry(c),xs=box.centers,art=source();
    const railWidth=160+(c.count-1)*c.pitch;
    const plural=c.count===1?'obieg':c.count<5?'obiegi':'obiegów';
    const title=instance(art,'mf-title-template',{
      'mf-title-text':{'font-size':c.count===1?17:c.count===2?21:26},
      'mf-subtitle-text':{text:c.count+' '+plural+' • zasilanie / powrót'}
    },'heading');
    // Supply moves closer to the display; display-to-rail gaps match (29 units).
    const rails=[288,490].map((y,i)=>[
      use('mf-rail-middle',125,y,' scale('+railWidth+' 1)'),
      use('mf-rail-start',125,y),
      use('mf-rail-end',125+railWidth,y),
      use(i===0?'mf-supply-mark':'mf-return-mark',125,y)
    ].join('')).join('');
    const valves=xs.map((x,i)=>{
      const loop=c.circuits[i];
      const active=c.actuatorMode==='individual'&&loop.actuator;
      return use(active?'mf-valve-actuator':'mf-valve-manual',x,548);
    }).join('');
    const out=xs.map((x,i)=>{
      const driven=c.actuatorMode==='individual'&&c.circuits[i].actuator;
      return '<g class="mf-outlets" data-circuit="'+(i+1)+'">'+
        use('mf-outlet-upper',x,152)+
        use(driven?'mf-outlet-lower':'mf-outlet-lower-manual',x,680)+'</g>';
    }).join('');
    const meters=xs.map((x,i)=>{
      const loop=c.circuits[i];
      const water=loop.flow===null?0:number(loop.flow/5*58,0,58,0);
      const meter=instance(art,'mf-flowmeter-template',{
        'mf-flow-fill':{y:-27-water,height:water},
        'mf-flow-text':{text:f(loop.flow)+' l/min'}
      },i+1);
      return '<g class="mf-flowmeter" data-circuit="'+(i+1)+'" transform="translate('+x+' 283)">'+meter+'</g>';
    }).join('');
    const displays=xs.map((x,i)=>{
      const loop=c.circuits[i];
      if(!loop.display)return '';
      const panel=instance(art,'mf-display-template',{
        'mf-display-title':{text:'OBIEG '+(i+1)},
        'mf-display-supply':{text:f(loop.tempOut)+'°C'},
        'mf-display-return':{text:f(loop.tempReturn)+'°C'},
        'mf-display-flow':{text:f(loop.flow)+' l/min'},
        'mf-display-open':{text:(loop.open===null?'—':Math.round(loop.open))+'% OTW.'}
      },i+1);
      const scale=Math.max(.4,Math.min(1.5,c.display_scale*loop.display_scale));
      return '<g class="mf-display" data-circuit="'+(i+1)+'" transform="translate('+x+' 418) scale('+scale+')">'+panel+'</g>';
    }).join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+box.width+' '+box.height+
      '" width="'+box.width+'" height="'+box.height+'" role="img" aria-label="Rozdzielacz CO, '+c.count+' obiegów">'+
      art+'<g filter="url(#mf-shadow)">'+rails+out+meters+valves+displays+
      (c.actuatorMode==='common'?use('mf-common-actuator',75,518):'')+'</g>'+
      '<g transform="translate('+(box.width/2)+' 0)">'+title+'</g></svg>';
  };

  const defaults=()=>({count:5,pitch:260,actuatorMode:'individual',display_scale:1,mode:'live',circuits:[]});
  const resolve=(node,h)=>{
    const config=normalize(node?.manifold||node);
    const read=(entity,key)=>{
      const value=HASSStudioHA.reading(h,entity);
      if(!value)return null;
      if((key==='tempOut'||key==='tempReturn')&&!['','°C','C'].includes(value.unit))return null;
      if(key==='flow'&&!['','l/min','L/min'].includes(value.unit))return null;
      if(key==='open'&&!['','%'].includes(value.unit))return null;
      return value.value;
    };
    return {...config,circuits:config.circuits.map(c=>{
      const out={...c};
      if(config.mode==='live')for(const k of ['tempOut','tempReturn','flow','open'])
        out[k]=read(c.entities[k],k);
      return out;
    })};
  };
  const formatValue=(x,decimals=1)=>x===null?'—':Number(x).toFixed(decimals);
  const renderNode=(node,h)=>{
    const c=resolve(node,h),g=geometry(c);
    let xml=renderStandalone(c);
    // Live values have already been resolved; the SVG remains display-only.
    const fragment=HASSStudioSvg.fragment(xml);
    const unique='ssmanifold'+String(node?.id||'test').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,25)+'-';
    return '<svg width="'+g.width*.3+'" height="215" viewBox="0 0 '+g.width+' '+g.height+'" preserveAspectRatio="xMidYMid meet">'+
      HASSStudioSvg.namespaceIds(fragment,unique)+'</svg>';
  };
  const layoutGeometry=node=>{
    const c=normalize(node?.manifold||node),g=geometry(c);
    const width=g.width*.3;
    return {x:0,y:0,width,height:215,centerX:width/2,labelY:229,readingY:244};
  };
  return Object.freeze({render:renderNode,geometry:layoutGeometry,normalize,defaults,resolve,defaultCircuit,MAX_CIRCUITS,renderStandalone});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioManifold;


/* Energy storage — HA read-only SVG visualization and configurable BMS alerts. */
const HASSStudioEnergyStorage=(()=>{
  const FIELDS=['soc','power','soh','voltage','current','temperature','cell_min','cell_max','cell_delta','cycles','bms_alarm'];
  const DEFAULTS={mode:'live',display_scale:1,show_screen:true,min_soc:20,warning_margin:5,
    custom_alarm:false,alarm_soc:20,show_warning:true,show_alarm:true,charge_positive:true,
    animate_charge:true,temp_low_enabled:false,temp_low:0,temp_high_enabled:false,temp_high:50,
    cell_low_enabled:false,cell_low:2.8,cell_high_enabled:false,cell_high:3.65,
    delta_enabled:false,delta_max:100,offline_alarm:true};
  const clamp=(x,lo,hi,d)=>x!==''&&x!=null&&Number.isFinite(Number(x))?Math.max(lo,Math.min(hi,Number(x))):d;
  const cleanEntity=x=>typeof x==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(x)?x:'';
  const defaults=()=>({...DEFAULTS,entities:Object.fromEntries(FIELDS.map(k=>[k,''])),manual:{soc:75,power:1.5}});
  const normalize=node=>{
    const src=node?.energy_storage||node||{},d=defaults();
    const c={...d,...src,mode:src.mode==='manual'?'manual':'live',
      display_scale:HASSStudioReadoutScale.factor(src.display_scale),
      entities:Object.fromEntries(FIELDS.map(k=>[k,cleanEntity(src.entities?.[k])])),
      manual:{soc:clamp(src.manual?.soc,0,100,75),power:clamp(src.manual?.power,-500,500,1.5)}};
    for(const k of ['min_soc','alarm_soc'])c[k]=clamp(src[k],0,100,d[k]);
    c.warning_margin=clamp(src.warning_margin,0,30,d.warning_margin);
    for(const [k,lo,hi] of [['temp_low',-50,100],['temp_high',-50,150],
      ['cell_low',0,5],['cell_high',0,5],['delta_max',0,1000]])c[k]=clamp(src[k],lo,hi,d[k]);
    for(const k of ['custom_alarm','show_warning','show_alarm','charge_positive','animate_charge',
      'temp_low_enabled','temp_high_enabled','cell_low_enabled','cell_high_enabled',
      'delta_enabled','offline_alarm','show_screen'])c[k]=typeof src[k]==='boolean'?src[k]:d[k];
    return c;
  };
  const reading=(h,id,units,min,max)=>{
    const r=HASSStudioHA.reading(h,id);
    return r&&units.includes(r.unit)&&r.value>=min&&r.value<=max?r.value:null;
  };
  const binaryAlarm=(h,id)=>{
    if(!id)return null;
    const e=HASSStudioHA.entity(h,id),state=String(e?.state??'').toLowerCase();
    if(!state||['unknown','unavailable','none'].includes(state))return null;
    if(['on','true','1','alarm','fault','warning','error','critical','active'].includes(state))return true;
    if(['off','false','0','ok','normal','clear','inactive'].includes(state))return false;
    return null;
  };
  const data=(node,h)=>{
    const c=normalize(node),e=c.entities;
    let soc=c.mode==='manual'?c.manual.soc:reading(h,e.soc,['%','percent',''],0,100);
    let power=c.mode==='manual'?c.manual.power:null;
    if(c.mode==='live'){
      const r=HASSStudioHA.reading(h,e.power);
      if(r&&['W','kW'].includes(r.unit))power=r.value/(r.unit==='W'?1000:1);
    }
    const optional={};
    if(c.mode==='live'){
      const defs={
        soh:[['%','percent',''],0,100],voltage:[['V',''],0,1500],
        current:[['A',''],-2000,2000],temperature:[['°C','C',''], -50,150],
        cell_min:[['V',''],0,5],cell_max:[['V',''],0,5],
        cell_delta:[['mV',''],0,1000],cycles:[['','cycles'],0,1000000]
      };
      for(const [key,[units,low,high]] of Object.entries(defs))optional[key]=reading(h,e[key],units,low,high);
      optional.bms_alarm=binaryAlarm(h,e.bms_alarm);
    }else optional.bms_alarm=null;
    if(optional.cell_delta===null&&optional.cell_min!==null&&optional.cell_max!==null)
      optional.cell_delta=Math.max(0,(optional.cell_max-optional.cell_min)*1000);
    const warningThreshold=Math.min(100,c.min_soc+c.warning_margin);
    const criticalThreshold=c.custom_alarm?c.alarm_soc:c.min_soc;
    const missing=c.mode==='live'&&!!e.soc&&soc===null;
    const warnings=[],alarms=[];
    if(soc!==null){
      if(c.show_warning&&soc<=warningThreshold)warnings.push('Niski SOC');
      if(soc<=criticalThreshold)alarms.push('Alarm SOC');
    }
    if(c.mode==='live'){
      if(c.offline_alarm&&missing)alarms.push('Brak odczytu SOC');
      if(optional.bms_alarm===true)alarms.push('Alarm BMS');
      if(c.temp_low_enabled&&optional.temperature!==null&&optional.temperature<c.temp_low)alarms.push('Niska temperatura');
      if(c.temp_high_enabled&&optional.temperature!==null&&optional.temperature>c.temp_high)alarms.push('Wysoka temperatura');
      if(c.cell_low_enabled&&optional.cell_min!==null&&optional.cell_min<c.cell_low)alarms.push('Niskie napięcie celi');
      if(c.cell_high_enabled&&optional.cell_max!==null&&optional.cell_max>c.cell_high)alarms.push('Wysokie napięcie celi');
      if(c.delta_enabled&&optional.cell_delta!==null&&optional.cell_delta>c.delta_max)warnings.push('Nierówne cele');
    }
    return {c,soc,power,optional,warnings,alarms,warningThreshold,criticalThreshold,
      level:soc===null?0:soc<=0?0:Math.ceil(soc/25),
      state:alarms.length?'alarm':warnings.length?'warning':soc===null?'unknown':'normal'};
  };
  const geometry=()=>({x:0,y:0,width:150,height:150,centerX:75,labelY:164,readingY:177});
  const formatPower=power=>power===null?'—':(power>0?'+':'')+(Math.abs(power)<10?power.toFixed(1):power.toFixed(0))+' kW';
  const render=(node,h)=>{
    const d=data(node,h);
    const source=typeof HASSStudioIconTemplates!=='undefined'?HASSStudioIconTemplates.energyStorage:null;
    if(!source)return '<rect x="20" y="20" width="110" height="120" fill="#7185a4"/>';
    const bindings={
      'battery-soc-text':{text:d.soc===null?'SOC —':'SOC '+Math.round(d.soc)+'%'},
      'battery-power-text':{text:formatPower(d.power)},
      'battery-led':{fill:d.state==='alarm'?'#ff4444':d.state==='warning'?'#ffba42':d.state==='unknown'?'#7e8f9d':'#6cffad'},
      'battery-warning':{visibility:d.c.show_alarm&&d.alarms.length?'visible':'hidden'}
    };
    for(let n=1;n<=4;n++){
      const on=n<=d.level;
      const red=on&&n===1&&d.state!=='normal'&&d.state!=='unknown';
      bindings['battery-segment-'+n]={opacity:on?1:.16};
      bindings['battery-level-fill-'+n]={fill:red?'#e84747':'url(#bat-green)',stroke:red?'#ffb3a3':'#9bffd3'};
      bindings['battery-level-glow-'+n]={fill:red?'#f34a4a':'url(#bat-green)'};
    }
    let svg=HASSStudioSvg.apply(source,bindings);
    if(!d.c.show_screen)svg=svg.replace('<g id="battery-screen">','<g id="battery-screen" visibility="hidden">');
    if(d.c.display_scale!==1)svg=HASSStudioReadoutScale.namedGroup(svg,'battery-screen',150,61,d.c.display_scale);
    if(d.c.animate_charge&&d.power!==null&&(d.c.charge_positive?d.power>0:d.power<0)&&d.level>0&&d.state!=='alarm')
      svg=svg.replace('<g id="battery-charge-cells">','<g id="battery-charge-cells" class="battery-charging">');
    const prefix='ssbattery'+String(node?.id||'preview').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,24)+'-';
    return '<svg x="0" y="0" width="150" height="150" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">'+
      HASSStudioSvg.namespaceIds(svg,prefix)+'</svg>';
  };
  return Object.freeze({FIELDS,defaults,normalize,data,geometry,render,formatPower});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioEnergyStorage;


/* Photovoltaic inverter: read-only HA metrics and compact SVG visualization. */
const HASSStudioInverter=(()=>{
 const MAX_INPUTS=12,MAX_ROWS=40;
 const PANEL_WIDTH=210,ROW_HEIGHT=19;
 const clamp=(v,min,max,d)=>v!==''&&v!=null&&Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):d;
 const entity=x=>typeof x==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(x)?x:'';
 const defaultInput=i=>({name:'PV'+(i+1),visible:i<3,entities:{voltage:'',current:'',power:''},manual:{voltage:380,current:8,power:null}});
 const DEFAULT_KEYS=['ac_power','temperature','status','alarm','pv_summary','pv_voltage','pv_current','pv_power','custom'];
 const defaultRow=(key='custom',input=0)=>({key:DEFAULT_KEYS.includes(key)?key:'custom',
   input,entity:'',label:'',unit:'auto',decimals:1,manual_value:''});
 const panelRows=(raw,node,count)=>{
   // A stored empty array is meaningful. Only older layouts need migration.
   if(Array.isArray(raw.panel_rows))return raw.panel_rows.slice(0,MAX_ROWS).map((row)=>{
     const key=DEFAULT_KEYS.includes(row?.key)?row.key:'custom';
     return {key,input:Math.round(clamp(row?.input,0,count-1,0)),
       entity:entity(row?.entity),
       label:String(row?.label??'').slice(0,42),
       unit:['auto','W','kW','Wh','kWh','MWh','V','A','°C','%','Hz'].includes(row?.unit)?row.unit:'auto',
       decimals:Math.round(clamp(row?.decimals,0,3,1)),
       manual_value:String(row?.manual_value??'').slice(0,60)};
   });
   const legacy=Array.from({length:count},(_,i)=>defaultRow('pv_summary',i));
   const extras=Array.isArray(node?.entities)?node.entities.slice(0,MAX_ROWS-count).map(item=>({
     ...defaultRow('custom'),entity:entity(item?.entity),label:String(item?.label||'').slice(0,42)
   })):[];
   return legacy.concat(extras);
 };
 const panelHeight=c=>Math.max(52,40+c.panel_rows.length*ROW_HEIGHT);
 const defaults=()=>({mode:'live',count:2,display_scale:1,show_extra:false,extra_position:'right',extra_scale:1,
   panel_title:'Parametry falownika',panel_rows:[],
   rated_kw:10,production_threshold_w:10,positive_power:true,entities:{ac_power:'',temperature:'',status:'',alarm:''},
   manual:{ac_power:6.4,temperature:32},inputs:[]});
 const normalize=node=>{
   const raw=node?.inverter||node||{},d=defaults(),count=Math.round(clamp(raw.count,1,MAX_INPUTS,2));
   return {...d,...raw,mode:raw.mode==='manual'?'manual':'live',count,
    display_scale:HASSStudioReadoutScale.factor(raw.display_scale),
    extra_scale:HASSStudioReadoutScale.factor(raw.extra_scale),
    show_extra:raw.show_extra===true,extra_position:raw.extra_position==='left'?'left':'right',
    rated_kw:clamp(raw.rated_kw,.1,500,10),production_threshold_w:clamp(raw.production_threshold_w,0,1000,10),
    positive_power:raw.positive_power!==false,
    panel_title:String(raw.panel_title??'Parametry falownika').slice(0,46),
    panel_rows:panelRows(raw,node,count),
    entities:Object.fromEntries(['ac_power','temperature','status','alarm'].map(k=>[k,entity(raw.entities?.[k])])),
    manual:{ac_power:clamp(raw.manual?.ac_power,-500,500,6.4),temperature:clamp(raw.manual?.temperature,-40,150,32)},
    inputs:Array.from({length:count},(_,i)=>{
      const original=raw.inputs?.[i]||{},d=defaultInput(i);
      return {name:String(original.name??d.name).slice(0,12),visible:original.visible!==false,
        entities:Object.fromEntries(['voltage','current','power'].map(k=>[k,entity(original.entities?.[k])])),
        manual:Object.fromEntries(['voltage','current','power'].map(k=>[k,original.manual?.[k]===null?null:clamp(original.manual?.[k],0,50000,d.manual[k])]))};
    })};
 };
 const read=(h,id,units,lo,hi)=>{
   const r=HASSStudioHA.reading(h,id);
   return r&&units.includes(r.unit)&&r.value>=lo&&r.value<=hi?r.value:null;
 };
 const status=(h,id)=>{
   const value=String(HASSStudioHA.entity(h,id)?.state??'').trim().toLowerCase();
   return ['on','alarm','fault','error','critical','warning'].includes(value)?'alarm':
     ['off','normal','ok','clear'].includes(value)?'ok':null;
 };
 const data=(node,h)=>{
   const c=normalize(node),manual=c.mode==='manual';
   const power=manual?c.manual.ac_power:(()=>{
     const r=HASSStudioHA.reading(h,c.entities.ac_power);
     return r&&['W','kW'].includes(r.unit)&&Number.isFinite(r.value)?r.value/(r.unit==='W'?1000:1):null;
   })();
   const temperature=manual?c.manual.temperature:read(h,c.entities.temperature,['°C','C',''], -40,150);
   const fault=manual?false:status(h,c.entities.alarm)==='alarm'||status(h,c.entities.status)==='alarm';
   const generating=power===null?null:((c.positive_power?power:-power)*1000>c.production_threshold_w);
   const inputs=c.inputs.map(q=>{
     const voltage=manual?q.manual.voltage:read(h,q.entities.voltage,['V',''],0,2000);
     const current=manual?q.manual.current:read(h,q.entities.current,['A',''],0,200);
     const direct=manual?q.manual.power:(()=>{
       const r=HASSStudioHA.reading(h,q.entities.power);
       return r&&['W','kW'].includes(r.unit)&&r.value>=0?r.value*(r.unit==='kW'?1000:1):null;
     })();
     const watts=direct!==null?direct:voltage!==null&&current!==null?voltage*current:null;
     return {...q,voltage,current,watts,calculated:direct===null&&watts!==null};
   });
   return {c,power,temperature,fault,generating,inputs,state:fault?'alarm':generating===null?'unknown':generating?'generating':'standby'};
 };
 const esc=x=>String(x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
 const fmt=(v,d=0)=>v===null?'—':Number(v).toFixed(d);
 const kw=v=>v===null?'—':Math.abs(v)>=10?fmt(v,1)+'kW':fmt(v,2)+'kW';
 const svgRow=(q,index)=>'<g class="inv-pv-row" transform="translate(0 '+(119+index*10)+')">'+
   '<text x="104" y="0" font-size="7.4" fill="#86d6fa" font-family="Arial,sans-serif">'+esc(q.name.slice(0,6))+'</text>'+
   '<text x="197" y="0" text-anchor="end" font-size="7.5" fill="#c9f5ff" font-family="Arial,sans-serif">'+
   esc(fmt(q.voltage)+'V  '+fmt(q.current,1)+'A  '+(q.watts===null?'—':fmt(q.watts))+'W')+'</text></g>';
 const labelFor=(row,c)=>{
   if(row.label)return row.label;
   const names={ac_power:'Moc AC',temperature:'Temperatura',status:'Status',alarm:'Alarm',
     pv_summary:'PV — V / A / W',pv_voltage:'Napięcie PV',pv_current:'Prąd PV',pv_power:'Moc PV',custom:'Encja'};
   const prefix=names[row.key]||'Encja';
   const pv=row.key.startsWith('pv_');
   return pv?(row.key==='pv_summary'?c.inputs[row.input]?.name||'PV':prefix+' '+(c.inputs[row.input]?.name||'PV'+(row.input+1))):prefix;
 };
 const readingFor=(row,d,h)=>{
   const c=d.c,manual=c.mode==='manual';
   const index=c.inputs[row.input];
   let value=null,unit='';
   if(row.key==='ac_power'){value=d.power;unit='kW';}
   else if(row.key==='temperature'){value=d.temperature;unit='°C';}
   else if(row.key==='status'){
     if(manual)value=d.state==='generating'?'Produkcja':d.state==='standby'?'Czuwanie':'Brak danych';
     else value=HASSStudioHA.entity(h,c.entities.status)?.state??null;
   }else if(row.key==='alarm'){
     if(manual)value=d.fault?'Alarm':'Brak';
     else value=HASSStudioHA.entity(h,c.entities.alarm)?.state??null;
   }else if(index&&row.key==='pv_voltage'){value=d.inputs[row.input].voltage;unit='V';}
   else if(index&&row.key==='pv_current'){value=d.inputs[row.input].current;unit='A';}
   else if(index&&row.key==='pv_power'){value=d.inputs[row.input].watts;unit='W';}
   else if(index&&row.key==='pv_summary'){
     const pv=d.inputs[row.input];
     const v=pv.voltage,a=pv.current,w=pv.watts;
     return {text:fmt(v)+' V / '+fmt(a,1)+' A / '+fmt(w)+' W',known:v!==null||a!==null||w!==null};
   }else if(row.key==='custom'){
     if(manual)value=row.manual_value;
     else{
       const state=HASSStudioHA.entity(h,row.entity);
       value=state?.state??null;
       unit=String(state?.attributes?.unit_of_measurement??'').slice(0,12);
     }
   }
   if(value===null||value===undefined||value===''||['unavailable','unknown','none','null'].includes(String(value).trim().toLowerCase()))
     return {text:'—',known:false};
   // Format numeric values and convert compatible power/energy units when requested.
   const text=String(value).trim();
   const numeric=Number(text);
   if(Number.isFinite(numeric)&&text!==''){
     let number=numeric;
     const target=row.unit;
     const conversions={'W:kW':.001,'kW:W':1000,'Wh:kWh':.001,'kWh:Wh':1000,
       'kWh:MWh':.001,'MWh:kWh':1000,'Wh:MWh':.000001,'MWh:Wh':1000000};
     if(target!=='auto'&&target!==unit){
       if(!unit)unit=target;
       const ratio=conversions[unit+':'+target];
       if(ratio!==undefined){number*=ratio;unit=target;}
       // Never mislabel incompatible units: retain the measured unit.
     }
     return {text:number.toFixed(row.decimals)+(unit?' '+unit:''),known:true};
   }
   return {text:text.slice(0,38),known:true};
 };
 const panelData=(node,h)=>{
   const d=data(node,h);
   return d.c.panel_rows.map((row)=>({...row,label:labelFor(row,d.c),reading:readingFor(row,d,h)}));
 };
 const extra=(d,h)=>{
   const c=d.c,all=c.panel_rows,hgt=panelHeight(c),w=PANEL_WIDTH;
   const x=c.extra_position==='left'?-w*c.extra_scale-10:310,y=65;
   const panel=['<g id="inv-diagnostic-panel" transform="translate('+x+' '+y+') scale('+c.extra_scale+')">',
     '<rect x="0" y="0" width="'+w+'" height="'+hgt+'" rx="9" fill="#0c1b2d" stroke="#498baf" stroke-width="1.2"/>',
     '<text x="10" y="20" fill="#a8e4ff" font-family="Arial,sans-serif" font-size="11" font-weight="700">'+esc(c.panel_title)+'</text>'];
   all.forEach((q,i)=>{
     const y=39+i*ROW_HEIGHT,label=labelFor(q,c),v=readingFor(q,d,h);
     panel.push('<g class="inv-metric-row" data-row="'+i+'" data-key="'+esc(q.key)+'">');
     panel.push('<text x="10" y="'+y+'" fill="#79d5fc" font-family="Arial,sans-serif" font-size="10">'+esc(label.slice(0,32))+'</text>');
     panel.push('<text x="'+(w-9)+'" y="'+y+'" text-anchor="end" fill="'+(v.known?'#e4f7ff':'#8ca9b8')+'" font-family="Arial,sans-serif" font-size="10">'+esc(v.text)+'</text></g>');
   });
   if(!all.length)panel.push('<text x="10" y="39" font-size="10" fill="#8ca9b8">Brak wybranych parametrów</text>');
   return panel.join('')+'</g>';
 };
 const geometry=node=>{
   const c=normalize(node),w=150;
   const side= c.show_extra?(PANEL_WIDTH*c.extra_scale+10)/2:0;
   const lower=c.show_extra?Math.max(150,(65+panelHeight(c)*c.extra_scale)/2):150;
   return {x:c.show_extra&&c.extra_position==='left'?-side:0,y:0,
     width:w+side,height:lower,centerX:75,labelY:lower+15,readingY:lower+29};
 };
 const render=(node,h)=>{
   const d=data(node,h),c=d.c;
   let source=typeof HASSStudioIconTemplates!=='undefined'?HASSStudioIconTemplates.inverter:null;
   if(!source)return '<rect width="150" height="150" fill="#99a"/>';
   const shown=d.inputs.filter(x=>x.visible).slice(0,3);
   const rowMarkup=shown.map(svgRow).join('')+
     (d.inputs.filter(x=>x.visible).length>3?'<text x="194" y="147" text-anchor="end" fill="#79d5fc" font-size="7">więcej…</text>':'');
   source=HASSStudioSvg.inject(source,{'inv-pv-rows':rowMarkup,'inv-extra-panel':c.show_extra?extra(d,h):''});
   const led=d.state==='generating'?'#4cd6ff':d.state==='standby'?'#ff9b32':
     d.state==='alarm'?'#f04444':'#7e929f';
   source=HASSStudioSvg.apply(source,{'inv-power':{text:kw(d.power)},
     'inv-led':{fill:led},'inv-led-glow':{fill:led},
     'inv-alert':{visibility:d.fault?'visible':'hidden'}});
   source=HASSStudioReadoutScale.namedGroup(source,'inverter-display',150,110,c.display_scale);
   const prefix='ssinv'+String(node?.id||'preview').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,24)+'-';
   const content=HASSStudioSvg.namespaceIds(source,prefix);
   const extraWidth=c.show_extra?Math.ceil(PANEL_WIDTH*c.extra_scale)+10:0;
   const left=c.show_extra&&c.extra_position==='left'?-extraWidth:0;
   const bottom=c.show_extra?Math.max(300,65+panelHeight(c)*c.extra_scale+10):300;
   return '<svg width="'+(150+extraWidth/2)+'" height="'+(bottom/2)+'" viewBox="'+left+' 0 '+(300+extraWidth)+' '+bottom+'" preserveAspectRatio="xMinYMin meet">'+content+'</svg>';
 };
 return Object.freeze({MAX_INPUTS,MAX_ROWS,DEFAULT_KEYS,defaultInput,defaultRow,defaults,normalize,data,geometry,render,fmt,panelData,readingFor,labelFor,panelHeight});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioInverter;


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


/* Read-only HA EV wallbox renderer. Readings do not control the vehicle or charger. */
const HASSStudioEVCharger=(()=>{
 const keys=['power','session_energy','daily_energy','monthly_energy','total_energy','status','alarm','temperature','vehicle_soc','voltage_l1','voltage_l2','voltage_l3','current_l1','current_l2','current_l3'];
 const numeric=['power','session_energy','daily_energy','monthly_energy','total_energy','temperature','vehicle_soc','voltage_l1','voltage_l2','voltage_l3','current_l1','current_l2','current_l3'];
 const valid=x=>typeof x==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(x)?x:'';
 const clamp=(v,min,max,d)=>v!==''&&v!=null&&Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):d;
 const defaults=()=>({mode:'live',phases:3,power_threshold_w:30,display_scale:1,show_extra:false,extra_scale:1,extra_position:'right',charging_positive:true,animate:true,
   entities:Object.fromEntries(keys.map(k=>[k,''])),manual:{power:7.2,session_energy:18.6,status:'charging',alarm:false}});
 const normalize=node=>{
  const o=node?.ev_charger||node||{},d=defaults();
  return {...d,...o,mode:o.mode==='manual'?'manual':'live',phases:o.phases===1?1:3,
   power_threshold_w:clamp(o.power_threshold_w,0,1000,30),display_scale:HASSStudioReadoutScale.factor(o.display_scale),
   extra_scale:HASSStudioReadoutScale.factor(o.extra_scale),
   extra_position:o.extra_position==='left'?'left':'right',show_extra:o.show_extra===true,
   charging_positive:o.charging_positive!==false,animate:o.animate!==false,
   entities:Object.fromEntries(keys.map(k=>[k,valid(o.entities?.[k])])),
   manual:{power:clamp(o.manual?.power,-500,500,7.2),session_energy:clamp(o.manual?.session_energy,0,100000,18.6),
     status:['charging','ready','disconnected','fault'].includes(o.manual?.status)?o.manual.status:'charging',alarm:o.manual?.alarm===true}};
 };
 const reading=(h,id,unit,kind)=>{
  const r=HASSStudioHA.reading(h,id);
  if(!r)return null;
  if(kind==='power')return r.unit==='W'?r.value/1000:r.unit==='kW'?r.value:null;
  if(kind==='energy')return r.unit==='Wh'?r.value/1000:r.unit==='kWh'?r.value:r.unit==='MWh'?r.value*1000:null;
  if(kind==='temp')return ['','°C','C'].includes(r.unit)&&r.value>=-40&&r.value<=150?r.value:null;
  if(kind==='soc')return ['','%'].includes(r.unit)&&r.value>=0&&r.value<=100?r.value:null;
  if(kind==='v')return ['','V'].includes(r.unit)&&r.value>=0&&r.value<=550?r.value:null;
  if(kind==='a')return ['','A'].includes(r.unit)&&r.value>=0&&r.value<=250?r.value:null;
  return null;
 };
 const state=(h,id)=>{
  const raw=String(HASSStudioHA.entity(h,id)?.state??'').trim().toLowerCase();
  if(['charging','charge','active','running','on'].includes(raw))return 'charging';
  if(['ready','available','idle','connected','waiting','paused','standby','off'].includes(raw))return 'ready';
  if(['disconnected','unplugged','not_connected'].includes(raw))return 'disconnected';
  if(['fault','error','alarm','critical','failure'].includes(raw))return 'fault';
  return null;
 };
 const alarm=(h,id)=>{
  const s=String(HASSStudioHA.entity(h,id)?.state??'').trim().toLowerCase();
  return ['on','true','1','alarm','fault','error','critical'].includes(s);
 };
 const data=(node,h)=>{
  const c=normalize(node),manual=c.mode==='manual';
  const get=(key,kind)=>manual?(key==='power'?c.manual.power:key==='session_energy'?c.manual.session_energy:null):reading(h,c.entities[key],null,kind);
  const power=get('power','power'),session=get('session_energy','energy');
  const diagnostics={};
  for(const k of numeric.filter(k=>!['power','session_energy'].includes(k))){
    const kind=k.endsWith('_energy')?'energy':k==='temperature'?'temp':k==='vehicle_soc'?'soc':k.startsWith('voltage')?'v':'a';
    diagnostics[k]=get(k,kind);
  }
  const explicit=manual?c.manual.status:state(h,c.entities.status);
  const fault=manual?c.manual.alarm||explicit==='fault':alarm(h,c.entities.alarm)||explicit==='fault';
  const positive=power===null?null:(c.charging_positive?power:-power)*1000>c.power_threshold_w;
  const status=fault?'fault':explicit==='disconnected'?'disconnected':positive===true||explicit==='charging'&&positive!==false?'charging':
    explicit==='ready'||positive===false?'ready':'unknown';
  return {c,power,session,diagnostics,status,fault};
 };
 const fmt=(x,d=1)=>x===null?'—':Number(x).toFixed(d);
 const esc=v=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
 const details=d=>{
  const c=d.c,values=d.diagnostics;
  const rows=[['Moc',d.power,'kW'],['Sesja',d.session,'kWh'],['Dzisiaj',values.daily_energy,'kWh'],['Miesiąc',values.monthly_energy,'kWh'],['Razem',values.total_energy,'kWh'],['Temperatura',values.temperature,'°C'],['SOC auta',values.vehicle_soc,'%']];
  for(let i=1;i<=c.phases;i++){rows.push(['L'+i+' napięcie',values['voltage_l'+i],'V']);rows.push(['L'+i+' prąd',values['current_l'+i],'A']);}
  const height=32+rows.length*15;
  const x=c.extra_position==='left'?-190:306;
  return '<g id="ev-extended" transform="translate('+x+' 35) scale('+c.extra_scale+')"><rect width="185" height="'+height+'" rx="9" fill="#0c1c2a" stroke="#458d9c"/>'+
   '<text x="9" y="20" fill="#a5e4e8" font-size="11" font-family="Arial" font-weight="bold">ŁADOWARKA EV · ODCZYTY</text>'+
   rows.map(([name,num,unit],i)=>'<text x="9" y="'+(39+i*15)+'" font-size="10" font-family="Arial" fill="#b7d2de">'+esc(name)+'</text>'+
      '<text x="178" y="'+(39+i*15)+'" font-size="10" font-family="Arial" text-anchor="end" fill="#e6ffff">'+
      esc(num===null?'—':fmt(num,unit==='kWh'?2:1)+' '+unit)+'</text>').join('')+'</g>';
 };
 const geometry=node=>{
  const c=normalize(node),span=c.show_extra?(185*c.extra_scale+6)/2:0;
  return {x:c.show_extra&&c.extra_position==='left'?-span:0,y:0,width:150+span,height:150,centerX:75,labelY:165,readingY:179};
 };
 const render=(node,h)=>{
  const d=data(node,h),c=d.c;
  let source=typeof HASSStudioIconTemplates!=='undefined'?HASSStudioIconTemplates.evCharger:null;
  if(!source)return '<rect x="20" y="20" width="110" height="110" fill="#adc9db"/>';
  const color=d.status==='charging'?'#54dfa0':d.status==='fault'?'#ec4848':d.status==='unknown'?'#8195a0':'#f5a438';
  source=HASSStudioSvg.apply(source,{
    'ev-power-text':{text:d.power===null?'—':fmt(d.power,Math.abs(d.power)<10?1:0)+' kW'},
    'ev-session-text':{text:d.session===null?'—':fmt(d.session,1)+' kWh'},
    'ev-led':{fill:color},'ev-alarm':{visibility:d.fault?'visible':'hidden'}
  });
  if(c.animate&&d.status==='charging')source=source.replace('<g id="ev-bolt"','<g class="ss-ev-charging" id="ev-bolt"');
  source=HASSStudioReadoutScale.namedGroup(source,'ev-charger-display',145,108,c.display_scale);
  const prefix='ssev'+String(node?.id||'preview').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,24)+'-';
  source=HASSStudioSvg.namespaceIds(source,prefix);
  const extended=c.show_extra?details(d):'';
  const extra=c.show_extra?185*c.extra_scale+6:0,left=c.show_extra&&c.extra_position==='left'?-extra:0;
  return '<svg width="'+(150+extra/2)+'" height="150" viewBox="'+left+' 0 '+(300+extra)+' 300" preserveAspectRatio="xMidYMid meet">'+source+extended+'</svg>';
 };
 return Object.freeze({keys,numeric,defaults,normalize,data,geometry,render});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioEVCharger;


/* Building load: original, editable house/garage/workshop SVG and HA electrical load. */
const HASSStudioBuilding=(()=>{
 const defaults=()=>({mode:'live',power_entity:'',daily_entity:'',power_kw:2,daily_kwh:0,show_readout:true,readout_scale:1,measurement:'individual',window_glow:true});
 const clamp=(v,a,b,d)=>v!==''&&v!=null&&Number.isFinite(Number(v))?Math.max(a,Math.min(b,Number(v))):d;
 const entity=v=>typeof v==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(v)?v:'';
 const normalize=n=>{
  const x=n?.building||n||{},d=defaults();
  return {...d,...x,mode:x.mode==='manual'?'manual':'live',power_entity:entity(x.power_entity),
   daily_entity:entity(x.daily_entity),power_kw:clamp(x.power_kw,0,10000,2),
   daily_kwh:clamp(x.daily_kwh,0,1000000,0),
   readout_scale:HASSStudioReadoutScale.factor(x.readout_scale),
   measurement:x.measurement==='aggregate'?'aggregate':'individual',
   show_readout:x.show_readout!==false,window_glow:x.window_glow!==false};
 };
 const numeric=(h,id,kind)=>{
  const x=HASSStudioHA.reading(h,id);
  if(!x||x.value<0)return null;
  if(kind==='power')return x.unit==='W'?x.value/1000:x.unit==='kW'?x.value:null;
  return x.unit==='Wh'?x.value/1000:x.unit==='kWh'?x.value:x.unit==='MWh'?x.value*1000:null;
 };
 const data=(node,h)=>{
  const c=normalize(node);
  const power=c.mode==='manual'?c.power_kw:numeric(h,c.power_entity,'power');
  const daily=c.mode==='manual'?c.daily_kwh:numeric(h,c.daily_entity,'energy');
  return {c,power,daily,measurement:c.measurement};
 };
 const geometry=()=>({x:0,y:0,width:150,height:150,centerX:75,labelY:163,readingY:177});
 const render=(node,h)=>{
  const type=['house','garage','workshop'].includes(node?.variant)?node.variant:'house',d=data(node,h);
  const template=typeof HASSStudioIconTemplates==='undefined'?null:HASSStudioIconTemplates['building'+type[0].toUpperCase()+type.slice(1)];
  if(!template)return '<rect width="150" height="150" fill="#6a86a6"/>';
  let graphic=template;
  if(!d.c.window_glow||d.power===null||d.power===0){
    if(type==='house')graphic=graphic.replace('<g id="home-light">','<g id="home-light" opacity=".10">');
  }
  const text=x=>String(x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
  const label=d.power===null?'—':d.power.toFixed(d.power<10?2:1)+' kW';
  const daily=d.daily===null?'':'<text x="150" y="278" text-anchor="middle" font-size="15" fill="#9ecfe9">'+text(d.daily.toFixed(1)+' kWh / dzień')+'</text>';
  const box=d.c.show_readout?'<g id="building-readout" transform="translate(150 262) scale('+d.c.readout_scale+') translate(-150 -262)">'+
   '<rect x="104" y="248" width="92" height="24" rx="9" fill="#0b2136" stroke="#72b7da" opacity=".92"/>'+
   '<text x="150" y="264" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" fill="#cbf8ff" font-weight="bold">'+text(label)+'</text>'+daily+'</g>':'';
  const prefix='ssbuilding'+String(node?.id||'preview').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,24)+'-';
  graphic=HASSStudioSvg.namespaceIds(graphic+box,prefix);
  return '<svg width="150" height="150" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">'+graphic+'</svg>';
 };
 return Object.freeze({defaults,normalize,data,geometry,render});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioBuilding;

/* Data-driven electric flow. Numeric HA power only; no guessed network topology. */
const HASSStudioPowerFlow=(()=>{
 const clamp=(n,a,b,d)=>n!==''&&n!==null&&n!==undefined&&Number.isFinite(Number(n))?Math.max(a,Math.min(b,Number(n))):d;
 const defaults=()=>({flow_power_entity:'',flow_power_mode:'off',flow_power_kw:0,flow_max_kw:10,flow_min_width:1.5,flow_max_width:6,flow_pattern:'dots',flow_power_direction:true});
 const normalize=x=>{
   const d=defaults(),c={...d,...x};
   return {...c,flow_power_entity:typeof c.flow_power_entity==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(c.flow_power_entity)?c.flow_power_entity:'',
    flow_power_mode:['off','ha','manual'].includes(c.flow_power_mode)?c.flow_power_mode:'off',
    flow_power_kw:clamp(c.flow_power_kw,-10000,10000,0),flow_max_kw:clamp(c.flow_max_kw,.1,10000,10),
    flow_min_width:clamp(c.flow_min_width,.5,12,1.5),
    flow_max_width:clamp(c.flow_max_width,.5,16,6),
    flow_pattern:['dots','dashes','arrows'].includes(c.flow_pattern)?c.flow_pattern:'dots',
    flow_power_direction:c.flow_power_direction!==false};
 };
 const measure=(p,h)=>{
   const c=normalize(p);
   if(c.flow_power_mode==='off')return null;
   if(c.flow_power_mode==='manual')return c.flow_power_kw;
   const value=HASSStudioHA.reading(h,c.flow_power_entity);
   return value&&(value.unit==='W'||value.unit==='kW')?(value.unit==='W'?value.value/1000:value.value):null;
 };
 const visual=(pipe,hass)=>{
   const c=normalize(pipe),kw=measure(c,hass);
   if(c.flow_power_mode==='off')return null;
   const nonzero=kw!==null&&Math.abs(kw)>0.0001;
   const factor=nonzero?Math.min(1,Math.abs(kw)/c.flow_max_kw):0;
   const low=Math.min(c.flow_min_width,c.flow_max_width),hi=Math.max(c.flow_min_width,c.flow_max_width);
   const width=+(low+(hi-low)*factor).toFixed(2);
   const size=+(2+factor*7).toFixed(2);
   const interval=+(Math.max(size+6,18-factor*5)).toFixed(2);
   const reverse=c.flow_power_direction&&kw!==null&&kw<0;
   const direction=reverse?(pipe.flow_direction==='reverse'?'forward':'reverse'):(pipe.flow_direction==='reverse'?'reverse':'forward');
   return {known:kw!==null,active:nonzero,kw,width,size,interval,direction,pattern:c.flow_pattern};
 };
 // A seamless dash animation advances exactly one dash+gap period per loop.
 // Hydraulic flows deliberately keep the independent legacy 28-unit cycle.
 const style=v=>{
   const dash=v.pattern==='dots'?v.size:v.size*2;
   const cycle=+(dash+v.interval).toFixed(2);
   return '--ss-flow-width:'+v.width+';--ss-flow-size:'+v.size+
     ';--ss-flow-gap:'+v.interval+';--ss-flow-cycle:-'+cycle+
     ';animation-direction:'+v.direction;
 };
 const arrowPath=(d,w)=>'<path class="ss-power-arrow" d="'+d+'" stroke="#fff" stroke-width="'+w+'" stroke-dasharray="1 17" fill="none"/>';
 return Object.freeze({defaults,normalize,measure,visual,style,arrowPath});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioPowerFlow;

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
 const ports=n=>(Array.isArray(n?.energy_ports)?n.energy_ports:[]).slice(0,MAX_PORTS)
   .map(port).filter((p,i,a)=>p.id&&a.findIndex(x=>x.id===p.id)===i);
 const defaults=n=>{
   const type=n?.type;
   return type==='power_grid'?'grid':type==='inverter'?'source':
     type==='energy_storage'?'storage':type==='building'||type==='ev_charger'?'load':
     type==='distribution_board'?'junction':'neutral';
 };
 const node=n=>({role:role(n?.energy_role||defaults(n)),ports:ports(n),
   buses:(Array.isArray(n?.energy_buses)?n.energy_buses:[]).slice(0,MAX_BUSES).map(b=>({
     id:ident(b?.id),label:String(b?.label||'').slice(0,40),medium:medium(b?.medium)
   })).filter((b,i,a)=>b.id&&a.findIndex(x=>x.id===b.id)===i)});
 const end=e=>({node_id:ident(e?.node_id),port_id:ident(e?.port_id)});
 const connection=c=>({start:end(c?.energy_start),end:end(c?.energy_end)});
 const graph=layout=>{
   const nodes=new Map((layout?.nodes||[]).map(n=>[n.id,n]));
   const errors=[],edges=[],junctions=new Map();
   const check=(ref,cid,side)=>{
     if(!ref.node_id&&!ref.port_id)return null;
     const n=nodes.get(ref.node_id);
     if(!n){errors.push({connection:cid,side,reason:'missing_node'});return null;}
     const p=ports(n).find(x=>x.id===ref.port_id);
     if(!p){errors.push({connection:cid,side,reason:'missing_port'});return null;}
     const key=ref.node_id+':'+(p.bus||p.id);
     if(!junctions.has(key))junctions.set(key,{node_id:ref.node_id,port_id:p.id,medium:p.medium});
     return {key,medium:p.medium};
   };
   for(const c of layout?.connections||[]){
     if(c.type!=='electric')continue;
     const a=check(end(c.energy_start),c.id,'start'),b=check(end(c.energy_end),c.id,'end');
     if(a&&b){
       if(a.medium!==b.medium){errors.push({connection:c.id,reason:'medium_mismatch'});continue;}
       edges.push({id:c.id,from:a.key,to:b.key,medium:a.medium});
     }
   }
   return {edges,errors,junctions:[...junctions.keys()]};
 };
 return Object.freeze({MAX_PORTS,MAX_BUSES,ident,role,medium,port,ports,node,end,connection,graph});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioEnergyTopology;


/* Read-only, topology-aware instantaneous active-power balance for HA Systems Studio.
 * Measurements (kW) are signed injections: positive supplies a network, negative
 * consumes from it. No power-flow routing, HA service calls or fabricated readings.
 */
const HASSStudioEnergyBalance=(()=>{
  const MAX_ASSIGNMENTS=100,EPS=1e-7;
  const round=n=>Math.round(n*1e6)/1e6;
  const finite=(n,a,b,d)=>n!==''&&n!==null&&n!==undefined&&Number.isFinite(Number(n))
    ?Math.max(a,Math.min(b,Number(n))):d;
  const ident=HASSStudioEnergyTopology.ident;
  const roles=['source','load','grid','storage'];
  const modes=['device','ha','manual','calculate','off'];
  const defaults=()=>({enabled:false,tolerance_kw:.05,participants:[]});
  const participant=p=>({
    node_id:ident(p?.node_id),
    port_id:ident(p?.port_id),
    mode:modes.includes(p?.mode)?p.mode:'device',
    entity:typeof p?.entity==='string'&&/^[a-z_]+\.[a-z0-9_]+$/.test(p.entity)?p.entity:'',
    manual_kw:finite(p?.manual_kw,-10000,10000,0),
    reverse_sign:p?.reverse_sign===true,
    grid_strategy:p?.grid_strategy==='signed_total'?'signed_total':'import_export'
  });
  const normalize=raw=>{
    const c=raw||{},seen=new Set();
    return {enabled:c.enabled===true,tolerance_kw:finite(c.tolerance_kw,.001,100,.05),
      participants:(Array.isArray(c.participants)?c.participants:[]).slice(0,MAX_ASSIGNMENTS)
        .map(participant).filter(p=>{
          if(!p.node_id||seen.has(p.node_id))return false;
          seen.add(p.node_id);return true;
        })};
  };
  // Device-native readouts retain their own sign conventions and manual modes.
  // This adapter intentionally reads POWER only; cumulative kWh is never kW.
  const deviceReading=(n,h,p)=>{
    const type=n.type;
    if(type==='inverter'){
      const d=HASSStudioInverter.data(n,h);
      return {kw:d.power===null?null:(d.c.positive_power?d.power:-d.power),
        source:d.c.mode==='manual'?'simulated':'measured'};
    }
    if(type==='building'){
      const d=HASSStudioBuilding.data(n,h);
      return {kw:d.power===null?null:-d.power,
        source:d.c.mode==='manual'?'simulated':'measured'};
    }
    if(type==='ev_charger'){
      const d=HASSStudioEVCharger.data(n,h);
      return {kw:d.power===null?null:(d.c.charging_positive?-d.power:d.power),
        source:d.c.mode==='manual'?'simulated':'measured'};
    }
    if(type==='energy_storage'){
      const d=HASSStudioEnergyStorage.data(n,h);
      return {kw:d.power===null?null:(d.c.charge_positive?-d.power:d.power),
        source:d.c.mode==='manual'?'simulated':'measured'};
    }
    if(type==='power_grid'){
      const c=HASSStudioPowerGrid.normalize(n);
      let kw=null;
      if(p.grid_strategy==='signed_total'){
        kw=HASSStudioPowerGrid.reading('total_kw',c,h);
      }else{
        const incoming=HASSStudioPowerGrid.reading('import_kw',c,h);
        const outgoing=HASSStudioPowerGrid.reading('export_kw',c,h);
        if(incoming!==null&&outgoing!==null&&incoming>=0&&outgoing>=0)
          kw=incoming-outgoing;
      }
      return {kw,source:c.mode==='manual'?'simulated':'measured'};
    }
    return {kw:null,source:'missing'};
  };
  const haPower=(h,id)=>{
    const v=HASSStudioHA.reading(h,id);
    return v&&['W','kW'].includes(v.unit)?(v.unit==='W'?v.value/1000:v.value):null;
  };
  // For manual/HA overrides, positive means production/import/discharge,
  // except for loads where positive means consumption.
  const injection=(kw,role)=>role==='load'?-kw:kw;
  const validDirection=(kw,role)=>role==='source'?kw>=-EPS:role==='load'?kw<=EPS:true;
  const measure=(n,role,p,h)=>{
    if(p.mode==='off')return {mode:p.mode,source:'excluded',injection_kw:null};
    if(p.mode==='calculate')return {mode:p.mode,source:'pending',injection_kw:null};
    let kw=null,source='missing';
    if(p.mode==='manual'){kw=injection(p.manual_kw,role);source='simulated';}
    else if(p.mode==='ha'){
      const raw=haPower(h,p.entity);
      if(raw!==null){kw=injection(raw,role);source='measured';}
    }else{
      const r=deviceReading(n,h,p);
      kw=r.kw;source=kw===null?'missing':r.source;
    }
    if(kw!==null&&p.reverse_sign)kw=-kw;
    if(kw!==null&&(!Number.isFinite(kw)||Math.abs(kw)>10000))
      return {mode:p.mode,source:'invalid',injection_kw:null,reason:'invalid_power'};
    if(kw!==null&&!validDirection(kw,role))
      return {mode:p.mode,source:'invalid',injection_kw:null,reason:'invalid_direction'};
    return {mode:p.mode,source,injection_kw:kw===null?null:round(kw)};
  };
  const totals=entries=>{
    const sum=(pred)=>round(entries.reduce((v,e)=>v+(pred(e)?Math.abs(e.injection_kw):0),0));
    return {
      generation_kw:sum(e=>e.role==='source'&&e.injection_kw>0),
      consumption_kw:sum(e=>e.role==='load'&&e.injection_kw<0),
      grid_import_kw:sum(e=>e.role==='grid'&&e.injection_kw>0),
      grid_export_kw:sum(e=>e.role==='grid'&&e.injection_kw<0),
      storage_charge_kw:sum(e=>e.role==='storage'&&e.injection_kw<0),
      storage_discharge_kw:sum(e=>e.role==='storage'&&e.injection_kw>0),
      supply_kw:sum(e=>e.injection_kw>0),
      demand_kw:sum(e=>e.injection_kw<0)
    };
  };
  const solve=(entries,tolerance_kw=.05)=>{
    const active=entries.filter(e=>e.mode!=='off');
    if(!active.length)return {state:'no_devices',residual_kw:null,totals:null,reasons:['no_devices']};
    const aggregate=active.filter(e=>e.role==='load'&&e.node_type==='building'&&e.measurement==='aggregate');
    // A building aggregate can already include other loads, so counting both would
    // double-count power. Require a non-overlapping set of measurements.
    if(aggregate.length&&active.filter(e=>e.role==='load').length>1)
      return {state:'invalid',residual_kw:null,totals:null,reasons:['aggregate_overlap']};
    if(active.some(e=>e.source==='invalid'))
      return {state:'invalid',residual_kw:null,totals:null,reasons:['invalid_direction_or_power']};
    const missing=active.filter(e=>e.injection_kw===null);
    const unresolved=missing.filter(e=>e.mode!=='calculate');
    if(unresolved.length||missing.length>1)
      return {state:'insufficient',residual_kw:null,totals:null,
        reasons:[unresolved.length?'missing_measurements':'multiple_unknowns']};
    if(missing.length===1){
      const e=missing[0];
      const inferred=round(-active.reduce((s,n)=>s+(n.injection_kw??0),0));
      if(!validDirection(inferred,e.role))
        return {state:'invalid',residual_kw:null,totals:null,reasons:['invalid_derived_direction']};
      e.injection_kw=inferred;e.source='calculated';
    }
    const residual=round(active.reduce((s,e)=>s+e.injection_kw,0));
    return {state:Math.abs(residual)<=tolerance_kw?'balanced':'unbalanced',
      residual_kw:residual,totals:totals(active),
      reasons:Math.abs(residual)<=tolerance_kw?[]:['imbalance']};
  };
  const resolve=(layout,hass)=>{
    const src=layout?.studio_layout||layout||{},config=normalize(src.energy_balance);
    if(!config.enabled)return {enabled:false,config,networks:[],warnings:[],topology:null};
    const topology=HASSStudioEnergyTopology.graph(src);
    const warnings=topology.errors.map(e=>({reason:e.reason,connection_id:e.connection,side:e.side||null}));
    const parent=new Map();
    const find=x=>{
      if(!parent.has(x))parent.set(x,x);
      const val=parent.get(x);
      if(val!==x)parent.set(x,find(val));
      return parent.get(x);
    };
    for(const e of topology.edges){
      const a=find(e.from),b=find(e.to);
      if(a!==b)parent.set(b,a);
    }
    const grouped=new Map();
    for(const e of topology.edges){
      const root=find(e.from);
      if(!grouped.has(root))grouped.set(root,{id:root,medium:e.medium,connection_ids:[],ports:new Set(),devices:[]});
      const group=grouped.get(root);
      group.connection_ids.push(e.id);group.ports.add(e.from);group.ports.add(e.to);
    }
    const keyGroup=new Map();
    for(const g of grouped.values())for(const k of g.ports)keyGroup.set(k,g);
    const overrides=new Map(config.participants.map(p=>[p.node_id,p]));
    const allNodes=(Array.isArray(src.nodes)?src.nodes:[]);
    for(const n of allNodes){
      const role=HASSStudioEnergyTopology.node(n).role;
      if(!roles.includes(role))continue;
      const p=overrides.get(n.id)||participant({node_id:n.id});
      if(p.mode==='off')continue;
      const ports=HASSStudioEnergyTopology.ports(n);
      let matches=ports.filter(port=>keyGroup.has(n.id+':'+(port.bus||port.id)));
      if(p.port_id){
        matches=matches.filter(port=>port.id===p.port_id);
        if(!matches.length){warnings.push({reason:'invalid_or_unconnected_port',node_id:n.id});continue;}
      }else if(n.type==='inverter'&&matches.some(port=>port.medium==='ac'))
        matches=matches.filter(port=>port.medium==='ac');
      const unique=new Map(matches.map(port=>[keyGroup.get(n.id+':'+(port.bus||port.id)),port]));
      if(!unique.size){warnings.push({reason:'unconnected_device',node_id:n.id});continue;}
      if(unique.size!==1){warnings.push({reason:'ambiguous_device_network',node_id:n.id});continue;}
      const [group,port]=[...unique][0];
      const reading=measure(n,role,p,hass);
      const measurement=n.type==='building'?HASSStudioBuilding.normalize(n).measurement:null;
      group.devices.push({node_id:n.id,node_type:n.type,port_id:port.id,role,measurement,
        mode:reading.mode,source:reading.source,injection_kw:reading.injection_kw,
        ...(reading.reason?{reason:reading.reason}:{})});
    }
    const networks=[...grouped.values()].map(g=>{
      const entries=g.devices;
      const result=solve(entries,config.tolerance_kw);
      return {id:g.id,medium:g.medium,connection_ids:g.connection_ids,
        port_keys:[...g.ports],devices:entries,state:result.state,
        residual_kw:result.residual_kw,totals:result.totals,reasons:result.reasons};
    });
    return {enabled:true,config,networks,warnings,topology};
  };
  return Object.freeze({MAX_ASSIGNMENTS,defaults,normalize,participant,haPower,injection,deviceReading,measure,totals,solve,resolve});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HASSStudioEnergyBalance;


/* Home Assistant Systems Studio — central device registry.
 * Saved configurations keep the existing node.type and node.variant fields.
 * Device families and catalog categories are metadata, not a migration.
 */
const HASSStudioDeviceRegistry = (() => {
  const categories = Object.freeze({
    heat_sources: {pl:'Źródła ciepła',en:'Heat sources'},
    tanks: {pl:'Zbiorniki i wymienniki',en:'Tanks and heat exchangers'},
    solar: {pl:'Solary',en:'Solar thermal'},
    hydraulics: {pl:'Hydraulika',en:'Hydraulics'},
    measurements: {pl:'Czujniki i pomiary',en:'Sensors and measurements'},
    connections: {pl:'Połączenia',en:'Connections'},
    electricity: {pl:'Elektryka',en:'Electricity'},
    buildings: {pl:'Budynki',en:'Buildings'}
  });
  // MDI identifiers refer to native Home Assistant icons, not custom SVG assets.
  const categoryIcons=Object.freeze({heat_sources:'mdi:fire',tanks:'mdi:water-boiler',solar:'mdi:white-balance-sunny',
    hydraulics:'mdi:pump',measurements:'mdi:thermometer',connections:'mdi:connection',electricity:'mdi:flash',buildings:'mdi:home-city'});
  const familyIcons=Object.freeze({solid_fuel_boiler:'mdi:fire',pellet_boiler:'mdi:fire',gas_boiler:'mdi:fire',
    electric_boiler:'mdi:flash',oil_boiler:'mdi:fire',heat_pump:'mdi:heat-pump',fireplace:'mdi:fireplace',
    tank:'mdi:water-boiler',solar_collector:'mdi:white-balance-sunny',pump:'mdi:pump',valve:'mdi:valve',
    sensor:'mdi:thermometer',connection_hydraulic:'mdi:pipe',connection_electric:'mdi:power-plug',building:'mdi:home-city',energy_storage:'mdi:battery-high',inverter:'mdi:solar-power',distribution_board:'mdi:electrical-services',ev_charger:'mdi:ev-station',power_grid:'mdi:transmission-tower',radiator:'mdi:radiator',manifold:'mdi:pipe-manifold'});
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
    radiator:{category:'hydraulics',pl:'Grzejnik',en:'Radiator',entities:['temperature_entity','valve_entity'],animations:[]},
    manifold:{category:'hydraulics',pl:'Rozdzielacz CO',en:'Heating manifold',entities:['circuits'],animations:[]},
    building:{category:'electricity',pl:'Budynek',en:'Building',entities:['power_entity','daily_entity'],animations:['electrical_load']},
    distribution_board:{category:'electricity',pl:'Rozdzielnia elektryczna',en:'Distribution board',entities:[],animations:[]},
    ev_charger:{category:'electricity',pl:'Ładowarka EV',en:'EV charger',entities:['power','session_energy','status','alarm'],animations:['charge']},
    inverter:{category:'electricity',pl:'Falownik fotowoltaiczny',en:'PV inverter',entities:['ac_power','inputs'],animations:[]},
    energy_storage:{category:'electricity',pl:'Magazyn energii',en:'Energy storage',entities:['soc','power','soh','voltage','current','temperature','bms_alarm'],animations:['charge']},
    power_grid:{category:'electricity',pl:'Sieć energetyczna',en:'Power Grid',entities:['L1_V','L1_A','L2_V','L2_A','L3_V','L3_A'],animations:[]},
    connection_hydraulic:{category:'connections',pl:'Rura',en:'Pipe',entities:['flow_entity'],animations:['flow']},
    connection_electric:{category:'connections',pl:'Przewód elektryczny',en:'Electrical cable',entities:['flow_power_entity'],animations:['power_flow']}
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
    radiator:{icon:'▥',variants:[['modern','radiator','Nowoczesny','Modern','radiator','radiator.svg']]},
    manifold:{icon:'≡',variants:[['floor_heating','manifold','Podłogówka','Floor heating','manifold']]},
    building:{icon:'⌂',variants:[['house','building','Dom','House','building','building-house.svg'],['garage','building','Garaż','Garage','building','building-garage.svg'],['workshop','building','Budynek gospodarczy','Workshop','building','building-workshop.svg']]},
    distribution_board:{icon:'▥',variants:[['modern','distribution_board','Rozdzielnia','Distribution board','distributionBoard','distribution-board.svg']]},
    ev_charger:{icon:'⚡',variants:[['modern','ev_charger','Ładowarka EV','EV charger','evCharger','ev-charger.svg']]},
    inverter:{icon:'▣',variants:[['modern','inverter','Falownik PV','PV inverter','inverter','inverter.svg']]},
    energy_storage:{icon:'▤',variants:[['modern','energy_storage','Magazyn energii','Energy storage','energyStorage','energy-storage.svg']]},
    power_grid:{icon:'⚡',variants:[['classic','power_grid','Classic','Classic','powerGrid','power-grid-classic.svg'],['modern','power_grid','Modern','Modern','powerGrid','power-grid-modern-light.svg']]},
    connection:{icon:'〰',variants:[]}
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
  // Device variants and new connection types have separate configuration schemas.
  // A family appears once when its alternatives are only graphic styles.
  const libraryPresets = Object.freeze([
    ['boiler','solid_fuel','solid_fuels'],
    ['boiler','pellet_modern','solid_fuels'],
    ['boiler','gas_modern','gas_heat'],
    ['boiler','electric_modern','electric_heat'],
    ['boiler','oil','other_heat'],
    ['boiler','heatpump_modern','heat_pumps'],
    ['boiler','fireplace_modern','solid_fuels'],
    ['tank','modular','tank_group'],
    ['solar','flat','solar_group'],
    ['pump','circulation','pump_group'],
    ['pump','inline','pump_group'],
    ['valve','two_way','valve_group'],
    ['valve','three_way','valve_group'],
    ['sensor','temperature','sensor_group'],
    ['sensor','pressure','sensor_group'],
    ['radiator','modern','radiator_group'],
    ['manifold','floor_heating','manifold_group'],
    ['building','house','buildings_group'],
    ['building','garage','buildings_group'],
    ['building','workshop','buildings_group'],
    ['distribution_board','modern','distribution_group'],
    ['ev_charger','modern','ev_group'],
    ['inverter','modern','inverter_group'],
    ['energy_storage','modern','storage_group'],
    ['power_grid','classic','electricity_group'],
    ['connection','hydraulic','hydraulic_connections'],
    ['connection','electric','electric_connections']
  ]);
  const subgroups = Object.freeze({
    solid_fuels: Object.freeze({pl:'Paliwo stałe',en:'Solid fuels',icon:'mdi:stove'}),
    gas_heat: Object.freeze({pl:'Gazowe',en:'Gas boilers',icon:'mdi:fire'}),
    electric_heat: Object.freeze({pl:'Elektryczne',en:'Electric heating',icon:'mdi:flash'}),
    heat_pumps: Object.freeze({pl:'Pompy ciepła',en:'Heat pumps',icon:'mdi:heat-pump'}),
    other_heat: Object.freeze({pl:'Pozostałe',en:'Other',icon:'mdi:oil'}),
    tank_group: Object.freeze({pl:'Zbiorniki',en:'Tanks',icon:'mdi:water-boiler'}),
    solar_group: Object.freeze({pl:'Kolektory solarne',en:'Solar collectors',icon:'mdi:white-balance-sunny'}),
    pump_group: Object.freeze({pl:'Pompy',en:'Pumps',icon:'mdi:pump'}),
    valve_group: Object.freeze({pl:'Zawory',en:'Valves',icon:'mdi:valve'}),
    sensor_group: Object.freeze({pl:'Czujniki',en:'Sensors',icon:'mdi:thermometer'}),
    radiator_group: Object.freeze({pl:'Grzejniki',en:'Radiators',icon:'mdi:radiator'}),
    manifold_group: Object.freeze({pl:'Rozdzielacze',en:'Manifolds',icon:'mdi:pipe-manifold'}),
    buildings_group: Object.freeze({pl:'Budynki',en:'Buildings',icon:'mdi:home-city'}),
    distribution_group: Object.freeze({pl:'Rozdzielnice',en:'Distribution boards',icon:'mdi:electrical-services'}),
    ev_group: Object.freeze({pl:'Ładowarki EV',en:'EV chargers',icon:'mdi:ev-station'}),
    inverter_group: Object.freeze({pl:'Falowniki PV',en:'PV inverters',icon:'mdi:solar-power'}),
    storage_group: Object.freeze({pl:'Magazyny energii',en:'Energy storage',icon:'mdi:battery-high'}),
    electricity_group: Object.freeze({pl:'Sieć elektryczna',en:'Electrical grid',icon:'mdi:transmission-tower'}),
    hydraulic_connections: Object.freeze({pl:'Rury hydrauliczne',en:'Hydraulic pipes',icon:'mdi:pipe'}),
    electric_connections: Object.freeze({pl:'Przewody elektryczne',en:'Electrical cables',icon:'mdi:power-plug'})
  });
  const presetNames = Object.freeze({
    'building:house':{pl:'Dom',en:'House'},'building:garage':{pl:'Garaż',en:'Garage'},'building:workshop':{pl:'Budynek gospodarczy',en:'Workshop'},
    'connection:hydraulic':{pl:'Rura',en:'Pipe'},
    'connection:electric':{pl:'Przewód elektryczny',en:'Electrical cable'},
    'pump:circulation':{pl:'Pompa obiegowa',en:'Circulation pump'},
    'pump:inline':{pl:'Pompa przelotowa',en:'Inline pump'},
    'valve:two_way':{pl:'Zawór dwudrogowy',en:'Two-way valve'},
    'valve:three_way':{pl:'Zawór trójdrogowy',en:'Three-way valve'},
    'sensor:temperature':{pl:'Czujnik temperatury',en:'Temperature sensor'},
    'sensor:pressure':{pl:'Czujnik ciśnienia',en:'Pressure sensor'}
  });
  const libraryEntries = (lang='pl') => libraryPresets.map(([type,variant,subgroup]) => {
    const family=type==='connection'?'connection_'+variant:null;
    const choice=family
      ? {type,family,category:'connections',device:families[family]}
      : resolve(type,variant);
    if(!choice) throw new Error('Missing library device: '+type+':'+variant);
    const language=lang==='en'?'en':'pl';
    const label=presetNames[type+':'+variant]?.[language] || families[choice.family]?.[language]
      || choice.device[language];
    return Object.freeze({
      type,variant,category:type==='building'?'buildings':choice.category,family:choice.family,
      subgroup:subgroup||null,label,icon:familyIcons[choice.family]||'mdi:cube-outline'
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
  return Object.freeze({categories,categoryIcons,families,listTypes,variantsFor,isNodeType,
    isVariant,defaultVariant,normalizeVariant,iconFor,variantOptions,variantOptionsForNode,
    resolve,catalog,subgroups,libraryEntries});
})();


/* Shared, dependency-free diagram viewport calculations. View state never enters studio_layout. */
const HASSStudioViewport=(()=>{
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const dimension=(v,fallback)=>Number.isFinite(Number(v)) && Number(v)>=300 && Number(v)<=5000?Math.round(Number(v)):fallback;
  const dimensions=config=>{
    const layout=config?.studio_layout||{};
    // Existing saved layouts used 1200x720. Only newly created empty layouts use 1200x700.
    const existing=Array.isArray(layout.nodes)||Array.isArray(layout.connections);
    return {width:dimension(layout.width,1200),height:dimension(layout.height,existing?720:700)};
  };
  const fresh=(w,h)=>({cx:w/2,cy:h/2,zoom:1,autoFit:true});
  const box=(camera,clientW,clientH,w,h,margin=1)=>{
    const usableW=Math.max(1,clientW),usableH=Math.max(1,clientH);
    const fit=Math.min(usableW/w,usableH/h);
    const scale=fit*clamp(camera.zoom,.2,8)/margin;
    const width=usableW/scale,height=usableH/scale;
    return {x:camera.cx-width/2,y:camera.cy-height/2,width,height};
  };
  const worldAt=(camera,px,py,clientW,clientH,w,h,margin=1)=>{
    const b=box(camera,clientW,clientH,w,h,margin);
    return {x:b.x+px/clientW*b.width,y:b.y+py/clientH*b.height};
  };
  const zoomAt=(camera,factor,px,py,clientW,clientH,w,h,margin=1)=>{
    const anchor=worldAt(camera,px,py,clientW,clientH,w,h,margin);
    const nextZoom=clamp(camera.zoom*factor,.2,8);
    const next={...camera,zoom:nextZoom,autoFit:false};
    const after=worldAt(next,px,py,clientW,clientH,w,h,margin);
    next.cx+=anchor.x-after.x;next.cy+=anchor.y-after.y;
    return next;
  };
  const pan=(camera,dx,dy,clientW,clientH,w,h,margin=1)=>{
    const b=box(camera,clientW,clientH,w,h,margin);
    return {...camera,cx:camera.cx-dx*b.width/clientW,cy:camera.cy-dy*b.height/clientH,autoFit:false};
  };
  return Object.freeze({dimensions,dimension,fresh,box,worldAt,zoomAt,pan});
})();


/* Standalone Home Assistant Systems Studio viewport gestures.
 * Keep ordinary taps/clicks unmodified so HA entity history still opens.
 * Capture pointers only after crossing the drag threshold.
 */
const HASSStudioViewerGestures=(()=>{
  const install=({root,host,viewport,getView,getDimensions,getCamera,setCamera,
    win=window,doc=document})=>{
    const pointers=new Map();
    let dragging=false,center=null,distance=null,capturedId=null,suppressClick=null;
    let tracking=false;
    const viewInPath=event=>event.composedPath().some(el=>el?.id==='ss-card-viewport');
    const fullscreen=()=>doc.fullscreenElement===getView();
    const rectAndSize=()=>{
      const view=getView();
      if(!view)return null;
      const svg=view.querySelector('svg');
      const rect=(svg||view).getBoundingClientRect();
      return {rect,w:Math.max(1,rect.width),h:Math.max(1,rect.height),...getDimensions()};
    };
    const pointOf=(event,rect)=>({x:event.clientX-rect.left,y:event.clientY-rect.top});
    const zoom=(factor,event)=>{
      const v=rectAndSize();
      if(!v)return;
      const at=event?pointOf(event,v.rect):{x:v.w/2,y:v.h/2};
      setCamera(viewport.zoomAt(getCamera(),factor,at.x,at.y,v.w,v.h,v.width,v.height));
    };
    const fit=()=>{
      const {width,height}=getDimensions();
      setCamera(viewport.fresh(width,height));
    };
    const onClick=event=>{
      const action=event.composedPath().find(el=>el?.dataset?.viewAction)?.dataset.viewAction;
      if(action){
        event.preventDefault();event.stopPropagation();
        if(action==='in')zoom(1.25);
        if(action==='out')zoom(.8);
        if(action==='fit')fit();
        if(action==='full'){
          const view=getView();
          if(doc.fullscreenElement===view)doc.exitFullscreen?.();
          else view?.requestFullscreen?.();
        }
        return;
      }
      // A drag may generate a synthetic click. Block that gesture, not the next
      // intentional tap (and never a toolbar action).
      if(suppressClick){
        const s=suppressClick;suppressClick=null;
        if(Date.now()<s.until && Number.isFinite(event.clientX) &&
          Math.hypot(event.clientX-s.x,event.clientY-s.y)<24){
          event.preventDefault();event.stopImmediatePropagation();return;
        }
      }
      // Without a drag, do not interfere with native data-more -> hass-more-info.
    };
    const onWheel=event=>{
      if(!viewInPath(event))return;
      // Keep ordinary HA scrolling; fullscreen retains wheel zoom without Shift.
      if(!fullscreen()&&!event.shiftKey)return;
      // Firefox can turn Shift+wheel into horizontal wheel events (deltaY=0).
      const raw=event.deltaY || (event.shiftKey?event.deltaX:0);
      if(!Number.isFinite(raw)||raw===0)return;
      // Normalize wheel pixels, wheel lines and pages. Small touchpad deltas
      // produce small zoom steps; clamp large jumps from high-resolution devices.
      const unit=event.deltaMode===1?40:event.deltaMode===2?600:1;
      const delta=Math.max(-160,Math.min(160,raw*unit));
      event.preventDefault();
      zoom(Math.exp(-delta*.00125),event);
    };
    const startTracking=()=>{
      if(tracking)return;
      tracking=true;
      win.addEventListener('pointermove',onMove,{passive:false});
      win.addEventListener('pointerup',onEnd);
      win.addEventListener('pointercancel',onCancel);
      win.addEventListener('blur',onCancel);
    };
    const stopTracking=()=>{
      if(!tracking)return;
      tracking=false;
      win.removeEventListener('pointermove',onMove);
      win.removeEventListener('pointerup',onEnd);
      win.removeEventListener('pointercancel',onCancel);
      win.removeEventListener('blur',onCancel);
    };
    const onDown=event=>{
      // The SVG owns touch navigation at every zoom, even at Fit or below 100%.
      // Leave the card header to native dashboard scrolling and toolbar clicks.
      if(!viewInPath(event)||
        !event.composedPath().some(el=>el?.classList?.contains?.('ss-svg'))||
        event.composedPath().some(el=>el?.dataset?.viewAction)||
        (event.pointerType!=='touch'&&event.button!==0))return;
      pointers.set(event.pointerId,{startX:event.clientX,startY:event.clientY,
        x:event.clientX,y:event.clientY,kind:event.pointerType});
      startTracking();
      if(pointers.size===2){
        const [a,b]=[...pointers.values()];
        center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
        distance=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));
      }
    };
    const onMove=event=>{
      const previous=pointers.get(event.pointerId);
      if(!previous)return;
      const next={...previous,x:event.clientX,y:event.clientY};
      pointers.set(event.pointerId,next);
      const v=rectAndSize();
      if(!v)return;
      if(pointers.size===2){
        const [a,b]=[...pointers.values()];
        const nextCenter={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
        const nextDistance=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));
        if(center&&distance){
          const shift=Math.hypot(nextCenter.x-center.x,nextCenter.y-center.y);
          const ratio=nextDistance/distance;
          if(dragging||shift>=3||Math.abs(ratio-1)>.012){
            let cam=viewport.pan(getCamera(),nextCenter.x-center.x,nextCenter.y-center.y,
              v.w,v.h,v.width,v.height);
            const at=pointOf({clientX:nextCenter.x,clientY:nextCenter.y},v.rect);
            cam=viewport.zoomAt(cam,ratio,at.x,at.y,v.w,v.h,v.width,v.height);
            dragging=true;setCamera(cam);
            if(event.cancelable)event.preventDefault();
          }
        }
        center=nextCenter;distance=nextDistance;
        return;
      }
      center=null;distance=null;
      const dx=next.x-previous.x,dy=next.y-previous.y;
      const movement=Math.hypot(next.x-next.startX,next.y-next.startY);
      if(!dragging && movement<(next.kind==='touch'?7:4))return;
      if(!dragging){
        dragging=true;
        // The stable custom card host survives HA state-driven SVG refreshes.
        // Capturing on pointerdown would steal an ordinary data-more click.
        if(next.kind==='mouse'&&host?.setPointerCapture){
          try{host.setPointerCapture(event.pointerId);capturedId=event.pointerId;}
          catch(_error){capturedId=null;}
        }
      }
      const camera=viewport.pan(getCamera(),dx,dy,v.w,v.h,v.width,v.height);
      setCamera(camera);
      if(event.cancelable)event.preventDefault();
    };
    const finish=(event)=>{
      if(!pointers.has(event.pointerId))return;
      pointers.delete(event.pointerId);
      if(capturedId===event.pointerId){
        try{if(host.hasPointerCapture?.(capturedId))host.releasePointerCapture(capturedId);}
        catch(_error){}
        capturedId=null;
      }
      if(!pointers.size){
        if(dragging && event.type!=='pointercancel')
          suppressClick={x:event.clientX,y:event.clientY,until:Date.now()+600};
        dragging=false;center=null;distance=null;
        stopTracking();
      }else{
        const items=[...pointers.values()];
        if(items.length===1){
          // Do not introduce a jump on the first move after a pinch.
          items[0].startX=items[0].x;items[0].startY=items[0].y;
        }
      }
    };
    const onEnd=event=>finish(event);
    const onCancel=event=>{
      if(event.pointerId!=null)finish(event);
      else{
        pointers.clear();dragging=false;center=null;distance=null;
        stopTracking();
      }
    };
    const onFullscreenChange=()=>setCamera(getCamera());
    root.addEventListener('click',onClick,true);
    root.addEventListener('wheel',onWheel,{passive:false});
    root.addEventListener('pointerdown',onDown);
    doc.addEventListener?.('fullscreenchange',onFullscreenChange);
    return ()=>{
      stopTracking();pointers.clear();
      root.removeEventListener('click',onClick,true);
      root.removeEventListener('wheel',onWheel);
      root.removeEventListener('pointerdown',onDown);
      doc.removeEventListener?.('fullscreenchange',onFullscreenChange);
    };
  };
  return Object.freeze({install});
})();


/* Custom layout normalization; connections[] v2 intentionally drops legacy pipes[]. */
const HASSStudioLayout = (() => {
  const W=1200,H=720,MAX_NODES=60,MAX_CONNECTIONS=80;
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
    entity:validEntity(item.entity)?item.entity:'',
    mode:item.mode==='manual'?'manual':'live',
    test_running:item.test_running===true,
    test_speed:clamp(item.test_speed,.35,5,1),
    test_position:clamp(item.test_position,0,100,0)
  });
  const normalized=(config)=>{
    const source=config?.studio_layout||{};
    const {width,height}=HASSStudioViewport.dimensions(config);
    const nodes=(Array.isArray(source.nodes)?source.nodes:[]).filter(v=>v && registry.isNodeType(v.type) &&
      typeof v.id==='string').slice(0,MAX_NODES).map(v=>({
      id:v.id.slice(0,32),type:v.type,
      x:clamp(v.x,-5000,10000,40),y:clamp(v.y,-5000,10000,40),
      scale:clamp(v.scale,0.5,2.4,1),readout_scale:HASSStudioReadoutScale.factor(v.readout_scale),
      scale_mode:v.type==='tank' && v.variant==='modular' && v.scale_mode==='free'?'free':'proportional',
       aspect_locked:typeof v.aspect_locked==='boolean'?v.aspect_locked:v.scale_mode!=='free',
      width_scale:clamp(v.width_scale,0.5,2.4,1),height_scale:clamp(v.height_scale,0.5,2.4,1),
      // Use uniform scale for both full render and interactive drag.
      burner_entity:validEntity(v.burner_entity)?v.burner_entity:'',
      burner_mode:['auto','on','off'].includes(v.burner_mode)?v.burner_mode:'auto',
      solid_fuel:v.solid_fuel==='coal'?'coal':'wood',
      solid_state:['auto','burning','embers','off'].includes(v.solid_state)?v.solid_state:'auto',
      solid_glow:clamp(v.solid_glow,0,100,78),
      pellet_level_entity:validEntity(v.pellet_level_entity)?v.pellet_level_entity:'',
      pellet_level_manual:v.pellet_level_manual===true,pellet_level_test:clamp(v.pellet_level_test,0,100,80),pellet_alarm_pct:clamp(v.pellet_alarm_pct,0,100,20),
      pellet_test_mode:v.pellet_test_mode===true,
      pellet_manual_state:['off','ignition','burning','embers'].includes(v.pellet_manual_state)?v.pellet_manual_state:'burning',
      pellet_manual_temperature:clamp(v.pellet_manual_temperature,-40,150,65),
      pellet_manual_power_unit:v.pellet_manual_power_unit==='kW'?'kW':'%',
      pellet_manual_power:clamp(v.pellet_manual_power,0,v.pellet_manual_power_unit==='kW'?500:100,65),
      pellet_manual_feeder:v.pellet_manual_feeder===true,
      pellet_manual_alarm:v.pellet_manual_alarm===true,
      pellet_burner_power_entity:validEntity(v.pellet_burner_power_entity)?v.pellet_burner_power_entity:'',
      pellet_feeder_entity:validEntity(v.pellet_feeder_entity)?v.pellet_feeder_entity:'',
      pellet_alarm_entity:validEntity(v.pellet_alarm_entity)?v.pellet_alarm_entity:'',
      hp_power_entity:validEntity(v.hp_power_entity)?v.hp_power_entity:'',hp_fan_entity:validEntity(v.hp_fan_entity)?v.hp_fan_entity:'',
      hp_max_rpm:clamp(v.hp_max_rpm,100,20000,1800),hp_glow:clamp(v.hp_glow,0,100,65),hp_test_mode:v.hp_test_mode===true,hp_manual_kw:clamp(v.hp_manual_kw,0,500,0),hp_manual_fan:clamp(v.hp_manual_fan,0,100,0),
      gas_draw_entity:validEntity(v.gas_draw_entity)?v.gas_draw_entity:'',gas_glow:clamp(v.gas_glow,0,100,62),
      electric_power_entity:validEntity(v.electric_power_entity)?v.electric_power_entity:'',
      electric_load_entity:validEntity(v.electric_load_entity)?v.electric_load_entity:'',
      electric_max_kw:clamp(v.electric_max_kw,.1,100,8),electric_glow:clamp(v.electric_glow,0,100,60),
      burner_on_temp:clamp(v.burner_on_temp,20,90,35),
      burner_off_temp:clamp(v.burner_off_temp,10,89,32),
      equipment_mode:v.equipment_mode==='manual'?'manual':'live',
      equipment_test_running:v.equipment_test_running===true,
      equipment_test_speed:clamp(v.equipment_test_speed,.35,5,1),
      equipment_test_position:clamp(v.equipment_test_position,0,100,0),
      pump_entity:validEntity(v.pump_entity)?v.pump_entity:'',
      tank_entity:validEntity(v.tank_entity)?v.tank_entity:'',
      solar_on_delta:clamp(v.solar_on_delta,1,40,6),
      solar_off_delta:clamp(v.solar_off_delta,0,39,3),
      visual:v.visual==='studio'?'studio':'warmwasser',
      variant:registry.normalizeVariant(v.type,v.variant),
      label:String(v.label||'').slice(0,64),
      energy_role:HASSStudioEnergyTopology.node(v).role,
      energy_ports:HASSStudioEnergyTopology.node(v).ports,
      energy_buses:HASSStudioEnergyTopology.node(v).buses,
      entity:validEntity(v.entity)?v.entity:'',
      entities:(Array.isArray(v.entities)?v.entities:[]).slice(0,20).map(e=>({
        entity:validEntity(e.entity)?e.entity:'',label:String(e.label||'').slice(0,64)})),
      radiator:v.type==='radiator'?HASSStudioRadiator.normalize(v):undefined,
      manifold:v.type==='manifold'?HASSStudioManifold.normalize(v.manifold||v):undefined,
      building:v.type==='building'?HASSStudioBuilding.normalize(v):undefined,
      distribution_board:v.type==='distribution_board'?HASSStudioDistributionBoard.normalize(v):undefined,
      ev_charger:v.type==='ev_charger'?HASSStudioEVCharger.normalize(v):undefined,
      inverter:v.type==='inverter'?HASSStudioInverter.normalize(v):undefined,
      energy_storage:v.type==='energy_storage'?HASSStudioEnergyStorage.normalize(v):undefined,
      power_grid:v.type==='power_grid'?HASSStudioPowerGrid.normalize(v):undefined,
      parts:(Array.isArray(v.parts)?v.parts:[]).slice(0,40).map(normalizeItem)
    }));
    // New connections schema is intentionally not migrated from legacy pipes[].
    const connections=(Array.isArray(source.connections)?source.connections:[]).slice(0,MAX_CONNECTIONS).filter(v=>v&&typeof v.id==='string'&&['hydraulic','electric'].includes(v.type)).map(v=>{
      const style=v.style||{},a=v.animation||{},hydraulic=v.type==='hydraulic';
      return {
        id:v.id.slice(0,32),type:v.type,label:String(v.label||'').slice(0,64),
        energy_start:HASSStudioEnergyTopology.connection(v).start,
        energy_end:HASSStudioEnergyTopology.connection(v).end,
        points:(Array.isArray(v.points)?v.points:[]).slice(0,30).map(q=>({
          x:clamp(q.x,-5000,10000,100),y:clamp(q.y,-5000,10000,100)})),
        style:{color:hydraulic&&colors[style.color]?style.color:hydraulic?'hot':'electric',
          width:clamp(style.width,2,14,hydraulic?7:5),
          cap_start:hydraulic&&style.cap_start!==false,cap_end:hydraulic&&style.cap_end!==false},
        animation:{
          flow_mode:['auto','on','off'].includes(a.flow_mode)?a.flow_mode:hydraulic?'auto':'off',
          flow_entity:hydraulic&&validEntity(a.flow_entity)?a.flow_entity:'',
          flow_direction:a.flow_direction==='reverse'?'reverse':'forward',
          flow_speed:clamp(a.flow_speed,.35,5,1),
          ...HASSStudioPowerFlow.normalize(hydraulic?{flow_power_mode:'off'}:a)
        },
        accessories:hydraulic?(Array.isArray(v.accessories)?v.accessories:[]).slice(0,20).map(normalizeAccessory):[]
      };
    }).filter(v=>v.points.length>=2);
    return {width,height,name:String(source.name||'').trim().slice(0,64),
      energy_balance:HASSStudioEnergyBalance.normalize(source.energy_balance),
      nodes,connections};
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
  const connectionPath=(points)=>points.map((point,i)=>(i?'L':'M')+point.x+' '+point.y).join(' ');
  // Translate all vertices by one snapped delta, retaining every bend and angle.
  // Clamp the common offset (not individual points), so geometry never deforms at bounds.
  const translateConnectionPoints=(points,dx,dy)=>{
    if(!Array.isArray(points)||!points.length)return [];
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
    const snap=v=>Math.round(v/5)*5;
    const x=clamp(snap(dx),-5000-Math.min(...xs),10000-Math.max(...xs),0);
    const y=clamp(snap(dy),-5000-Math.min(...ys),10000-Math.max(...ys),0);
    return points.map(p=>({x:p.x+x,y:p.y+y}));
  };
  const onConnection=(connection,t)=>{
    const points=connection.points, segments=[];
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
  // Existing SVG artwork remains unchanged; these read-only overlays expose
  // manual or HA state without inventing measurements for unassigned entities.
  const equipmentReading=(item,hass,isPump)=>{
    const mode=(item.equipment_mode||item.mode)==='manual'?'manual':'live';
    const speed=Math.max(.35,Math.min(5,Number(item.equipment_test_speed??item.test_speed)||1));
    if(mode==='manual'){
      const running=(item.equipment_test_running??item.test_running)===true;
      const position=Math.max(0,Math.min(100,Number(item.equipment_test_position??item.test_position)||0));
      return {mode,known:true,active:isPump?running:position>=5,position:isPump?null:position,speed};
    }
    const entity=HASSStudioHA.entity(hass,item.entity);
    const state=String(entity?.state??'').trim().toLowerCase();
    const reading=HASSStudioHA.percentage(hass,item.entity);
    if(isPump){
      if(['on','open','active','running','heating'].includes(state))return {mode,known:true,active:true,position:null,speed};
      if(['off','closed','idle','stopped','inactive'].includes(state))return {mode,known:true,active:false,position:null,speed};
      return {mode,known:false,active:false,position:null,speed};
    }
    const boolOn=['on','open','active','running'].includes(state),boolOff=['off','closed','inactive'].includes(state);
    const position=reading!==null?reading:boolOn?100:boolOff?0:null;
    return {mode,known:position!==null,active:position!==null&&position>=5,position,speed};
  };
  const equipmentOverlay=(node,hass)=>{
    const pump=node.type==='pump',state=equipmentReading(node,hass,pump);
    const color=!state.known?'#a7bbc8':state.active?'#68c69b':'#98a5b1';
    const status=!state.known?'unknown':state.active?'on':'off';
    return '<g class="ss-equipment-state" data-mode="'+state.mode+'" data-state="'+status+'"'+
      (pump?'':' data-position="'+(state.position===null?'unknown':state.position)+'"')+'>'+
      (pump&&state.active?'<circle class="ss-pump-pulse" cx="60" cy="65" r="29" fill="none" stroke="#68c69b" style="animation-duration:'+state.speed+'s"/>':'')+
      (pump?'<circle cx="60" cy="65" r="32" fill="none" stroke="'+color+'" stroke-width="2" opacity=".85"/>':
        '<circle cx="60" cy="66" r="12" fill="none" stroke="'+color+'" stroke-width="3"/>'+
        '<text x="60" y="113" text-anchor="middle" font-size="12" font-weight="600" fill="'+color+'">'+
        (state.position===null?'—':Math.round(state.position)+'%')+'</text>')+'</g>';
  };
  const symbolOnConnection=(item,connection,hass,language)=>{
    const at=onConnection(connection,item.position),isPump=item.type==='pump';
    const reading=equipmentReading(item,hass,isPump);
    const enabled=reading.active,caption=esc(item.label||words[language][item.type]||item.type);
    const known=reading.known,color=!known?'#a7bbc8':enabled?'#68c69b':'#d7e5ee';
    const status=!known?'unknown':enabled?'on':'off';
    return '<g transform="translate('+at.x+' '+at.y+')" class="ss-accessory" data-connection="'+esc(connection.id)+'"'+
      (item.entity?' data-more="'+esc(item.entity)+'"':'')+'>'+
      '<circle r="17" fill="#405669" stroke="'+color+'" stroke-width="2" data-state="'+status+'" data-mode="'+reading.mode+'"/>'+ 
      (isPump&&enabled?'<circle class="ss-pump-pulse" r="17" fill="none" stroke="#68c69b" style="animation-duration:'+reading.speed+'s"/>':'')+
      (isPump?'<path d="M-7 -10L10 0L-7 10Z" fill="#dceaf3"/>':
        '<path d="M-11 -8L0 0L-11 8ZM11 -8L0 0L11 8Z" fill="#e2c78d"/>')+
      '<text x="0" y="-25" text-anchor="middle" font-size="10.5" font-weight="600" fill="var(--primary-text-color,#e5edf5)" stroke="#252525" stroke-width="2" paint-order="stroke">'+caption+'</text>'+
      (!isPump?'<text x="0" y="31" font-size="11" font-weight="600" text-anchor="middle" fill="'+color+'">'+(reading.position===null?'—':Math.round(reading.position)+'%')+'</text>':'')+
      '</g>';
  };
  const canvasSvg=(config,hass,editable=false,selected=null)=>{
    const data=normalized(config),language=pickLang(config,hass),L=words[language];
    const w=data.width,h=data.height;
    const wwDefs=data.nodes.filter(node=>node.visual==='warmwasser' && !['radiator','manifold','power_grid','energy_storage','inverter','distribution_board','ev_charger','building'].includes(node.type) && !(node.type==='tank'&&node.variant==='modular') && !(node.type==='boiler'&&['solid_fuel','pellet_modern','heatpump_modern','gas_modern','electric_modern','fireplace_modern'].includes(node.variant)))
      .map(node=>HASSStudioGraphics.defs(node,hass)).join('');
    const connections=data.connections.map(connection=>{
      const d=connectionPath(connection.points),s=connection.style,a=connection.animation;
      const electric=connection.type==='electric';
      const settings={...s,...a};
      const powerVisual=electric?HASSStudioPowerFlow.visual(settings,hass):null;
      const enabled=electric?(powerVisual?.active===true):HASSStudioAnimation.flowActive(a.flow_mode,hass,a.flow_entity);
      const motionArrows=()=>{
        if(!electric||!powerVisual||!enabled||powerVisual.pattern!=='arrows')return '';
        const pts=powerVisual.direction==='reverse'?[...connection.points].reverse():connection.points;
        const track=connectionPath(pts),size=powerVisual.size,half=+(size*.52).toFixed(2);
        const arrow='<path d="M'+(-size)+' '+(-half)+' L0 0 L'+(-size)+' '+half+
          '" fill="none" stroke="#fff" stroke-width="'+powerVisual.width+
          '" stroke-linecap="round" stroke-linejoin="round"/>';
        return [0,1,2].map(i=>'<g class="ss-power-arrow">'+arrow+
          '<animateMotion path="'+track+'" dur="'+a.flow_speed+
          's" begin="'+(-i*a.flow_speed/3).toFixed(3)+'s" repeatCount="indefinite" rotate="auto"/></g>').join('');
      };
      const endcap=(first)=>{
        if(electric||(first&&!s.cap_start)||(!first&&!s.cap_end))return '';
        const pts=connection.points,at=first?pts[0]:pts[pts.length-1],near=first?pts[1]:pts[pts.length-2];
        const angle=Math.atan2(at.y-near.y,at.x-near.x)*180/Math.PI;
        return '<g class="ss-cap" data-cap="'+(first?'start':'end')+'" transform="translate('+at.x+' '+at.y+') rotate('+angle+')">'+
          '<rect x="-6" y="-7" width="12" height="14" rx="2" fill="#7c8793" stroke="#b6c1cc"/></g>';
      };
      const color=electric?'#e3bc63':colors[s.color];
      return '<g class="ss-connection ss-connection-'+connection.type+'" data-id="'+esc(connection.id)+'">'+
        '<path class="ss-connection-hit" d="'+d+'" stroke="transparent" stroke-width="24" fill="none"/>'+
        '<path class="ss-line" d="'+d+'" stroke="'+(electric?'#27313a':'#142332')+'" stroke-width="'+(s.width+3)+'" fill="none"/>'+
        '<path class="ss-line" d="'+d+'" stroke="'+color+'" stroke-width="'+s.width+'" fill="none"/>'+
        (enabled&&powerVisual?.pattern==='arrows'?motionArrows():enabled?'<path class="ss-line ss-flow'+(electric?' ss-flow-power ss-flow-'+powerVisual.pattern:'')+'" d="'+d+'"'+
          (electric?' stroke-width="'+powerVisual.width+'" stroke-dasharray="'+(powerVisual.pattern==='dots'?powerVisual.size+' '+powerVisual.interval:powerVisual.size*2+' '+powerVisual.interval)+'"':'')+
          ' style="--ss-speed:'+a.flow_speed+'s;'+(electric?HASSStudioPowerFlow.style(powerVisual)+';stroke-width:'+powerVisual.width+';stroke-dasharray:'+(powerVisual.pattern==='dots'?powerVisual.size+' '+powerVisual.interval:(powerVisual.size*2)+' '+powerVisual.interval):'animation-direction:'+a.flow_direction)+'"/>':'')+
        endcap(true)+endcap(false)+'</g>';
    }).join('');
    const accessories=data.connections.filter(c=>c.type==='hydraulic').map(c=>
      c.accessories.map(item=>symbolOnConnection(item,c,hass,language)).join('')).join('');
    const handles=editable&&selected?.type==='connection'?data.connections.filter(c=>c.id===selected.id).map(c=>c.points.map((pt,index)=>
      '<circle class="ss-handle" data-id="'+esc(c.id)+'" data-point="'+index+'" cx="'+pt.x+'" cy="'+pt.y+
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
      const building=node.type==='building';
      const distributionBoard=node.type==='distribution_board',evCharger=node.type==='ev_charger';
      const inverter=node.type==='inverter';
      const energyStorage=node.type==='energy_storage';
      const powerGrid=node.type==='power_grid';
      const radiator=node.type==='radiator',manifold=node.type==='manifold';
      const tallBoiler=node.type==='boiler'&&(node.visual==='warmwasser'||solidBoiler||modernPellet);
      const freeTank=node.type==='tank'&&node.variant==='modular'&&node.scale_mode==='free';
      const sx=freeTank||solidBoiler?node.width_scale:1,sy=freeTank||solidBoiler?node.height_scale:1;
      // The solid boiler is stretched about (66,53) in its renderer. Keep
      // selection bounds and external label aligned with that transform.
      const outline=building?HASSStudioBuilding.geometry(node):distributionBoard?HASSStudioDistributionBoard.geometry(node):evCharger?HASSStudioEVCharger.geometry(node):inverter?HASSStudioInverter.geometry(node):energyStorage?HASSStudioEnergyStorage.geometry(node):radiator?HASSStudioRadiator.geometry(node):manifold?HASSStudioManifold.geometry(node):powerGrid?HASSStudioPowerGrid.geometry(node):modernFireplace?HASSStudioFireplace.geometry(node):modernElectric?HASSStudioElectricBoiler.geometry(node):modernGas?HASSStudioGasBoiler.geometry(node):modernHP?HASSStudioHeatPump.geometry(node):modernPellet?HASSStudioPellet.geometry(node):
        solidBoiler?{x:66+(12-66)*sx,y:53+(-105-53)*sy,width:110*sx,height:318*sy,
          labelY:53+(230-53)*sy,readingY:53+(245-53)*sy}:
        tallBoiler?{x:12,y:-105,width:110,height:318,labelY:230,readingY:245}:
        freeTank?{x:60+(4-60)*sx,y:61+(3-61)*sy,width:112*sx,height:113*sy,
          labelY:61+(130-61)*sy,readingY:61+(145-61)*sy}:
        {x:4,y:3,width:112,height:113,labelY:130,readingY:145};
      const panels={
        solid_fuel:['displayGroup',549,369],pellet_modern:['displayPanel',322,315],
        heatpump_modern:['displayBlock',986,371],gas_modern:['displayFrame',574,1097],
        electric_modern:['controlPanelGroup',560,946],fireplace_modern:['displayGroup',634,332]
      };
      const visual=(building?HASSStudioBuilding.render(node,hass):distributionBoard?HASSStudioDistributionBoard.render(node,hass):evCharger?HASSStudioEVCharger.render(node,hass):inverter?HASSStudioInverter.render(node,hass):energyStorage?HASSStudioEnergyStorage.render(node,hass):radiator?HASSStudioRadiator.render(node,hass):manifold?HASSStudioManifold.render(node,hass):powerGrid?HASSStudioPowerGrid.render(node,hass):node.type==='tank'&&node.variant==='modular'?HASSStudioTank.render(node,hass):node.type==='boiler'&&node.variant==='solid_fuel'?HASSStudioSolidFuel.render(node,hass):modernPellet?HASSStudioPellet.render(node,hass):modernHP?HASSStudioHeatPump.render(node,hass):modernGas?HASSStudioGasBoiler.render(node,hass):modernElectric?HASSStudioElectricBoiler.render(node,hass):modernFireplace?HASSStudioFireplace.render(node,hass):node.visual==='warmwasser'?HASSStudioGraphics.render(node,hass):variantShape(node));
      const panel=panels[node.variant];
      const displayMarkup=(panel?HASSStudioReadoutScale.namedGroup(visual,panel[0],panel[1],panel[2],node.readout_scale):visual)+
        (['pump','valve'].includes(node.type)?equipmentOverlay(node,hass):'');
      return '<g class="ss-node" data-id="'+esc(node.id)+'"'+ent+' transform="translate('+node.x+' '+node.y+') scale('+node.scale+')">'+
        displayMarkup+
        (editable&&active?'<rect class="ss-selection" x="'+outline.x+'" y="'+outline.y+'" width="'+outline.width+'" height="'+outline.height+'" rx="8" fill="none" stroke="#52bfff" stroke-dasharray="5 4" stroke-width="1.6" pointer-events="none"/>':'')+
        '<g transform="translate('+(building||distributionBoard||evCharger||inverter||energyStorage||powerGrid||radiator||manifold||modernPellet||modernHP||modernGas||modernElectric||modernFireplace?outline.centerX:60)+' '+outline.labelY+') scale('+(1/node.scale)+')"><text text-anchor="middle" fill="var(--primary-text-color,#e5eef5)" font-size="12">'+name+'</text></g>'+
        (reading&&!tallBoiler?'<g transform="translate(60 '+outline.readingY+') scale('+(1/node.scale)+')"><text text-anchor="middle" font-size="11" fill="#7ed3ef">'+esc(reading)+'</text></g>':'')+
        '</g>';
    }).join('');
    return '<svg class="ss-svg'+(editable?' ss-svg-editor':'')+'" viewBox="0 0 '+w+' '+h+'" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="System diagram">'+
      HASSStudioGraphics.styles+HASSStudioTank.styles+HASSStudioSolidFuel.styles+HASSStudioPellet.styles+HASSStudioHeatPump.styles+HASSStudioGasBoiler.styles+HASSStudioFireplace.styles+'<defs>'+wwDefs+'<linearGradient id="ssTank" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e7845c"/><stop offset="1" stop-color="#4a8dbd"/></linearGradient></defs>'+
      '<rect class="ss-project-boundary" width="'+w+'" height="'+h+'" rx="4" fill="var(--secondary-background-color,#17222d)" stroke="'+
      (editable?'#52bfff':'none')+'" stroke-width="2" stroke-dasharray="'+(editable?'12 7':'none')+'"/>'+
      '<g class="ss-devices">'+nodes+'</g><g class="ss-connection-layer" stroke-linecap="round" stroke-linejoin="round">'+connections+'</g><g class="ss-pump-layer">'+accessories+'</g><g class="ss-connection-handles">'+handles+'</g></svg>';
  };

    return Object.freeze({canvasSvg,connectionPath,onConnection,variantShape,translateConnectionPoints});
  };
  return Object.freeze({create});
})();


/* Dedicated right-hand device/pipe inspector, extracted without changing
 * existing properties or saved configuration fields. Event updates stay in
 * studio-custom.js for now; the panel only renders and wires HA suggestions.
 */
const HASSStudioEditorInspector = (() => {
  const create = ({editor, L, properties, esc, opts, registry, pickLang,
    get, selectedObject, getSelection, getSelectedPartId, getExpandedPartId, variantShape}) => {
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
    const openSections=new Map();
    const sectionAttr=id=>openSections.get(id)===false?'':' open';
    const sectionIcon=(name)=>'<ha-icon icon="'+name+'" aria-hidden="true"></ha-icon>';
    const partIcons={sensor:'mdi:thermometer',heater:'mdi:flash',coil:'mdi:heating-coil',
      baffle_horizontal:'mdi:minus',baffle_vertical:'mdi:minus',inner_tank:'mdi:water-boiler'};
    const renderProps=()=>{
      // UI state is deliberately not persisted in studio_layout.
      for(const details of properties.querySelectorAll('details[data-section]'))
        openSections.set(details.dataset.section,details.open);
      const selection=getSelection();
      const model=get(),obj=selectedObject(model);
      let markup='<h3>'+esc(L.properties)+'</h3>';
      if(!obj){properties.innerHTML=markup+'<p>'+esc(L.choose)+'</p>';return;}
      const lang=pickLang(editor._config,editor._hass);
      const deviceName=selection.type==='connection'?(obj.type==='electric'?'Przewód elektryczny':'Rura'):
        (registry.resolve(obj.type,obj.variant)?.device?.[lang]||L[obj.type]||obj.type);
      markup+='<div class="ss-inspector-heading">'+sectionIcon(selection.type==='connection'?(obj.type==='electric'?'mdi:power-plug':'mdi:pipe'):(registry.categoryIcons[registry.resolve(obj.type,obj.variant)?.category]||'mdi:cube-outline'))+
        '<span>'+esc(obj.label||deviceName)+'</span></div>'+
        '<details class="ss-section-details" data-section="device"'+sectionAttr('device')+'><summary>'+
        sectionIcon('mdi:tune-variant')+'<span>'+esc(obj.type==='tank'?(L.tankSettings||'Ustawienia zbiornika'):(L.properties||'Właściwości'))+'</span>'+
        sectionIcon('mdi:chevron-down')+'</summary><section>'+field(L.name,'label',obj.label);
      if(selection.type==='node'){
        markup+=field(L.graphic,'variant',obj.variant,'text',variantOptions(obj));
        if(!(obj.type==='boiler'&&['solid_fuel','pellet_modern','heatpump_modern','gas_modern','electric_modern','fireplace_modern'].includes(obj.variant)))markup+=field(L.visual||'Graphic style','visual',obj.visual,'text',styleOptions);
        const isGrid=obj.type==='power_grid';
        const isRadiator=obj.type==='radiator',isManifold=obj.type==='manifold',isStorage=obj.type==='energy_storage',isInverter=obj.type==='inverter',isDistribution=obj.type==='distribution_board',isEV=obj.type==='ev_charger',isBuilding=obj.type==='building';
        const previewFree=obj.type==='tank'&&obj.variant==='modular'&&obj.scale_mode==='free';
        const previewSolid=obj.type==='boiler'&&obj.variant==='solid_fuel';
        const previewPellet=obj.type==='boiler'&&obj.variant==='pellet_modern';
        const previewHP=obj.type==='boiler'&&obj.variant==='heatpump_modern';
        const previewGas=obj.type==='boiler'&&obj.variant==='gas_modern';
        const previewElectric=obj.type==='boiler'&&obj.variant==='electric_modern';
        const previewFireplace=obj.type==='boiler'&&obj.variant==='fireplace_modern';
        const previewWidth=previewFree?Math.max(112*obj.width_scale+30,145*obj.width_scale):120;
        const previewHeight=previewFree?Math.max(113*obj.height_scale+40,155*obj.height_scale):140;
        const previewBox=isBuilding?'0 0 150 185':(isDistribution||isEV)?'0 0 150 180':isInverter?'0 0 150 180':isStorage?'0 0 150 180':(isRadiator||isManifold)?(()=>{const q=isRadiator?HASSStudioRadiator.geometry(obj):HASSStudioManifold.geometry(obj);return (q.x-8)+' '+(q.y-8)+' '+(q.width+16)+' '+(q.height+38);})():isGrid?(()=>{const q=HASSStudioPowerGrid.geometry(obj);return (q.x-8)+' '+(q.y-8)+' '+(q.width+16)+' '+(q.height+38);})():previewFireplace?(()=>{const q=HASSStudioFireplace.geometry(obj);return (q.x-8)+' '+(q.y-8)+' '+(q.width+16)+' '+(q.labelY-q.y+24);})():previewElectric?(()=>{const q=HASSStudioElectricBoiler.geometry(obj);return (q.x-8)+' '+(q.y-8)+' '+(q.width+16)+' '+(q.labelY-q.y+24);})():previewGas?(()=>{const q=HASSStudioGasBoiler.geometry(obj);return (q.x-8)+' '+(q.y-8)+' '+(q.width+16)+' '+(q.labelY-q.y+24);})():previewHP?(()=>{const q=HASSStudioHeatPump.geometry(obj);return (q.x-8)+' '+(q.y-8)+' '+(q.width+16)+' '+(q.labelY-q.y+24);})():previewPellet?(()=>{const b=HASSStudioPellet.geometry(obj);
            return (b.x-8)+' '+(b.y-8)+' '+(b.width+16)+' '+(b.labelY-b.y+26);})():
          previewSolid?((66+(12-66)*obj.width_scale-8)+' '+(53+(-105-53)*obj.height_scale-8)+' '+
            (110*obj.width_scale+16)+' '+(318*obj.height_scale+16)):
          obj.visual==='warmwasser'&&obj.type==='boiler'?'0 -110 130 350':
          previewFree?((60-previewWidth/2)+' '+(70-previewHeight/2)+' '+previewWidth+' '+previewHeight):'0 0 120 140';
        markup+='<div class="ss-preview"><svg viewBox="'+previewBox+'" width="120" height="120">'+
          HASSStudioGraphics.styles+HASSStudioTank.styles+HASSStudioSolidFuel.styles+HASSStudioPellet.styles+HASSStudioHeatPump.styles+HASSStudioGasBoiler.styles+HASSStudioFireplace.styles+'<defs>'+HASSStudioGraphics.defs(obj,editor._hass)+'</defs>'+
          (isBuilding?HASSStudioBuilding.render(obj,editor._hass):isDistribution?HASSStudioDistributionBoard.render(obj,editor._hass):isEV?HASSStudioEVCharger.render(obj,editor._hass):isInverter?HASSStudioInverter.render(obj,editor._hass):isStorage?HASSStudioEnergyStorage.render(obj,editor._hass):isRadiator?HASSStudioRadiator.render(obj,editor._hass):isManifold?HASSStudioManifold.render(obj,editor._hass):isGrid?HASSStudioPowerGrid.render(obj,editor._hass):obj.type==='tank'&&obj.variant==='modular'?HASSStudioTank.render(obj,editor._hass):obj.type==='boiler'&&obj.variant==='solid_fuel'?HASSStudioSolidFuel.render(obj,editor._hass):previewPellet?HASSStudioPellet.render(obj,editor._hass):previewHP?HASSStudioHeatPump.render(obj,editor._hass):previewGas?HASSStudioGasBoiler.render(obj,editor._hass):previewElectric?HASSStudioElectricBoiler.render(obj,editor._hass):previewFireplace?HASSStudioFireplace.render(obj,editor._hass):obj.visual==='warmwasser'?HASSStudioGraphics.render(obj,editor._hass):variantShape(obj))+'</svg></div>';
        if(obj.type==='boiler'){
          const panelGroups={solid_fuel:['displayGroup',549,369],pellet_modern:['displayPanel',322,315],
            heatpump_modern:['displayBlock',986,371],gas_modern:['displayFrame',574,1097],
            electric_modern:['controlPanelGroup',560,946],fireplace_modern:['displayGroup',634,332]};
          const panel=panelGroups[obj.variant];
          if(panel)markup=HASSStudioReadoutScale.namedGroup(markup,panel[0],panel[1],panel[2],obj.readout_scale);
        }
        const freeScale=obj.type==='tank'&&obj.variant==='modular'&&obj.scale_mode==='free';
        if(obj.type==='tank'&&obj.variant==='modular'){
          markup+=field(L.scale+' ('+Math.round(obj.scale*100)+'%)','scale',obj.scale,'range',null,'min="0.5" max="2.4" step="0.05"')+
            field(L.tankWidthScale+' ('+Math.round(obj.width_scale*100)+'%)','width_scale',obj.width_scale,
              'range',null,'min="0.5" max="2.4" step="0.05"')+
            field(L.tankHeightScale+' ('+Math.round(obj.height_scale*100)+'%)','height_scale',obj.height_scale,
              'range',null,'min="0.5" max="2.4" step="0.05"')+
            field(L.tankScaleMode,'aspect_locked',obj.aspect_locked?'true':'false','text',
              [['true',L.tankScaleProportional],['false',L.tankScaleFree]])+
            '<button type="button" data-action="reset-tank-aspect">'+esc(L.tankScaleProportional)+' 1:1</button>';
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
        if(obj.type==='boiler'&&['solid_fuel','pellet_modern','heatpump_modern','gas_modern','electric_modern','fireplace_modern'].includes(obj.variant))markup+=field('Skala panelu z tekstem (%)','readout_scale',Math.round((obj.readout_scale||1)*100),'range',null,'min="40" max="150" step="5"');


        if(isBuilding){
          const c=HASSStudioBuilding.normalize(obj);
          markup+=field('Źródło danych','building_mode',c.mode,'text',[['live','Home Assistant'],['manual','Symulacja']]);
          markup+=field('Moc odbiornika (W/kW)','building_power_entity',c.power_entity,'search',null,'list="ss-entity-list"');
          markup+=field('Zużycie dzienne (Wh/kWh/MWh)','building_daily_entity',c.daily_entity,'search',null,'list="ss-entity-list"');
          markup+=field('Typ pomiaru','building_measurement',c.measurement,'text',
            [['individual','Tylko ten budynek'],['aggregate','Pomiar zbiorczy, obejmuje inne odbiorniki']]);
          markup+=field('Pokaż odczyt','building_show_readout',c.show_readout?'true':'false','text',[['true','Tak'],['false','Nie']]);
          markup+=field('Skala odczytu (%)','building_readout_scale',Math.round(c.readout_scale*100),'range',null,'min="40" max="150" step="5"');
          markup+=field('Podświetlaj okna przy poborze','building_window_glow',c.window_glow?'true':'false','text',[['true','Tak'],['false','Nie']]);
          if(c.mode==='manual')markup+=field('Test mocy (kW)','building_power_kw',c.power_kw,'number',null,'min="0" step="0.1"')+
             field('Test zużycia dziennego (kWh)','building_daily_kwh',c.daily_kwh,'number',null,'min="0" step="0.1"');
          markup+='<p class="ss-note">Udział energii PV i sieci to osobny bilans. Pomiar zbiorczy nie jest dodawany do jego odbiorników.</p>';
        }
        if(isEV){
          const d=HASSStudioEVCharger.normalize(obj);
          const yes=(k,label)=>field(label,'ev_'+k,d[k]?'true':'false','text',[['true','Tak'],['false','Nie']]);
          markup+=field('Źródło danych','ev_mode',d.mode,'text',[['live','Home Assistant'],['manual','Symulacja']]);
          markup+=field('Liczba faz','ev_phases',d.phases,'text',[['1','Jedna'],['3','Trzy']]);
          markup+=field('Próg ładowania (W)','ev_power_threshold_w',d.power_threshold_w,'number',null,'min="0" max="1000" step="1"');
          markup+=field('Skala ekranu (%)','ev_display_scale',Math.round(d.display_scale*100),'range',null,'min="40" max="150" step="5"');
          markup+=yes('charging_positive','Dodatnia moc oznacza ładowanie')+yes('animate','Animacja błyskawicy');
          markup+=yes('show_extra','Pokaż panel parametrów');
          markup+=field('Położenie panelu','ev_extra_position',d.extra_position,'text',[['right','Prawo'],['left','Lewo']]);
          markup+=field('Skala panelu (%)','ev_extra_scale',Math.round(d.extra_scale*100),'range',null,'min="40" max="150" step="5"');
          markup+='<h4>Encje ładowarki i liczniki energii</h4>';
          const labels={power:'Aktualna moc (W/kW)',session_energy:'Energia sesji (Wh/kWh)',daily_energy:'Energia dzienna',monthly_energy:'Energia miesięczna',total_energy:'Energia całkowita',status:'Status ładowarki',alarm:'Alarm',temperature:'Temperatura',vehicle_soc:'SOC samochodu',voltage_l1:'Napięcie L1',voltage_l2:'Napięcie L2',voltage_l3:'Napięcie L3',current_l1:'Prąd L1',current_l2:'Prąd L2',current_l3:'Prąd L3'};
          for(const key of HASSStudioEVCharger.keys){
            if(d.phases===1&&/_(?:l2|l3)$/.test(key))continue;
            markup+=field(labels[key]||key,'ev_entity_'+key,d.entities[key]||'','search',null,'list="ss-entity-list"');
          }
          if(d.mode==='manual'){
            markup+=field('Test mocy (kW)','ev_manual_power',d.manual.power,'number',null,'step="0.1"');
            markup+=field('Test energii sesji (kWh)','ev_manual_session_energy',d.manual.session_energy,'number',null,'min="0" step="0.1"');
            markup+=field('Test statusu','ev_manual_status',d.manual.status,'text',[['charging','Ładowanie'],['ready','Gotowość'],['disconnected','Niepodłączona'],['fault','Awaria']]);
            markup+=field('Test alarmu','ev_manual_alarm',d.manual.alarm?'true':'false','text',[['false','Brak'],['true','Alarm']]);
          }
          markup+='<p class="ss-note">Historia sesji wymaga liczników/rekordów w HA. Panel tylko odczytuje dane; nie steruje ładowaniem.</p>';
        }
        if(isInverter){
          const c=HASSStudioInverter.normalize(obj);
          const bool=(k,label)=>field(label,'inv_'+k,c[k]?'true':'false','text',[['true','Tak'],['false','Nie']]);
          markup+=field('Źródło danych','inv_mode',c.mode,'text',[['live','Home Assistant'],['manual','Test ręczny']])+
            field('Skala ekranu (%)','inv_display_scale',Math.round(c.display_scale*100),'range',null,'min="40" max="150" step="5"')+
            field('Liczba wejść PV / MPPT','inv_count',c.count,'number',null,'min="1" max="12" step="1"')+
            field('Moc znamionowa (kW)','inv_rated_kw',c.rated_kw,'number',null,'min="0.1" max="500" step="0.1"')+
            field('Próg produkcji (W)','inv_production_threshold_w',c.production_threshold_w,'number',null,'min="0" max="1000" step="1"')+
            bool('positive_power','Moc dodatnia = produkcja AC')+
            bool('show_extra','Pokaż panel parametrów')+
            field('Pozycja panelu','inv_extra_position',c.extra_position,'text',[['right','Prawo'],['left','Lewo']])+
            field('Skala dodatkowego panelu (%)','inv_extra_scale',Math.round(c.extra_scale*100),'range',null,'min="40" max="150" step="5"');
          for(const [k,title] of [['ac_power','Moc wyjściowa AC'],['temperature','Temperatura falownika'],['status','Status falownika'],['alarm','Alarm falownika']])
            markup+=field(title,'inv_entity_'+k,c.entities[k]||'','search',null,'list="ss-entity-list"');
          if(c.mode==='manual')markup+=field('Test mocy AC (kW)','inv_manual_ac_power',c.manual.ac_power,'number',null,'step="0.1"')+
            field('Test temperatury (°C)','inv_manual_temperature',c.manual.temperature,'number',null,'step="0.1"');
          markup+='<h4>Wejścia fotowoltaiczne</h4>';
          c.inputs.forEach((q,i)=>{
            markup+='<details><summary>PV / MPPT '+(i+1)+'</summary>';
            markup+=field('Nazwa (maks. 12 znaków)','inv_pv_'+i+'_name',q.name,'text')+
              field('Na małym ekranie','inv_pv_'+i+'_visible',q.visible?'true':'false','text',[['true','Tak'],['false','Nie']]);
            for(const [key,label] of [['voltage','Napięcie (V)'],['current','Natężenie (A)'],['power','Moc (W/kW)']]){
              markup+=field('Encja '+label,'inv_pv_'+i+'_entity_'+key,q.entities[key]||'','search',null,'list="ss-entity-list"');
              if(c.mode==='manual')markup+=field('Test '+label,'inv_pv_'+i+'_manual_'+key,q.manual[key]??'','number',null,'step="0.1"');
            }
            markup+='</details>';
          });
          markup+='<h4>Panel parametrów</h4>'+field('Nagłówek','inv_panel_title',c.panel_title,'text');
          const rowTypes=HASSStudioInverter.DEFAULT_KEYS.map(k=>[k,({ac_power:'Moc AC',temperature:'Temperatura',status:'Status',alarm:'Alarm',pv_summary:'PV — V/A/W',pv_voltage:'Napięcie PV',pv_current:'Prąd PV',pv_power:'Moc PV',custom:'Dowolna encja'})[k]]);
          c.panel_rows.forEach((row,i)=>{
            markup+='<details><summary>'+esc((i+1)+'. '+HASSStudioInverter.labelFor(row,c))+'</summary>';
            markup+=field('Parametr','inv_row_'+i+'_key',row.key,'text',rowTypes)+field('Opis','inv_row_'+i+'_label',row.label,'text');
            if(row.key.startsWith('pv_'))markup+=field('Numer wejścia (0=PV1)','inv_row_'+i+'_input',row.input,'number',null,'min="0" max="'+(c.count-1)+'"');
            if(row.key==='custom')markup+=field('Encja','inv_row_'+i+'_entity',row.entity,'search',null,'list="ss-entity-list"')+
              (c.mode==='manual'?field('Wartość testowa','inv_row_'+i+'_manual_value',row.manual_value,'text'):'');
            markup+=field('Jednostka','inv_row_'+i+'_unit',row.unit,'text',['auto','W','kW','Wh','kWh','MWh','V','A','°C','%','Hz'].map(v=>[v,v]))+
              field('Miejsca po przecinku','inv_row_'+i+'_decimals',row.decimals,'number',null,'min="0" max="3"')+
              '<div class="ss-actions"><button type="button" data-inv-row-up="'+i+'">↑</button><button type="button" data-inv-row-down="'+i+'">↓</button><button type="button" data-inv-row-delete="'+i+'">Usuń</button></div></details>';
          });
          markup+='<button type="button" data-inv-row-add="true">+ Dodaj parametr</button>'+
            '<p class="ss-note">Brak odczytu: —. Mały ekran pokazuje do trzech wejść PV. Wykres jest ozdobny.</p>';
        }
        if(isStorage){
          const c=HASSStudioEnergyStorage.normalize(obj);
          const bool=(key,title)=>field(title,'storage_'+key,c[key]?'true':'false','text',[['true','Tak'],['false','Nie']]);
          markup+=field('Źródło danych','storage_mode',c.mode,'text',[['live','Home Assistant'],['manual','Test ręczny']]);
          markup+=field('Skala ekranu (%)','storage_display_scale',Math.round(c.display_scale*100),'range',null,'min="40" max="150" step="5"');
          markup+=bool('show_screen','Pokaż ekran')+bool('animate_charge','Animacja podczas ładowania');
          markup+=bool('charge_positive','Dodatnia moc oznacza ładowanie');
          markup+='<h4>Rezerwa i ostrzeżenia (wyłącznie wizualne)</h4>';
          markup+=field('Minimalny poziom SOC (%)','storage_min_soc',c.min_soc,'number',null,'min="0" max="100" step="1"');
          markup+=field('Margines ostrzeżenia (p.p.)','storage_warning_margin',c.warning_margin,'number',null,'min="0" max="30" step="1"');
          markup+=bool('custom_alarm','Oddzielny próg alarmu SOC');
          if(c.custom_alarm)markup+=field('Alarm SOC (%)','storage_alarm_soc',c.alarm_soc,'number',null,'min="0" max="100" step="1"');
          markup+=bool('show_alarm','Wykrzyknik alarmu')+bool('show_warning','Ostrzeżenie niskiego SOC');
          markup+='<h4>Alarmy diagnostyczne — progi opcjonalne</h4>';
          for(const [enabled,key,title,min,max,step] of [
            ['temp_low_enabled','temp_low','Min. temperatura (°C)',-50,100,1],
            ['temp_high_enabled','temp_high','Maks. temperatura (°C)',-50,150,1],
            ['cell_low_enabled','cell_low','Min. napięcie celi (V)',0,5,.01],
            ['cell_high_enabled','cell_high','Maks. napięcie celi (V)',0,5,.01],
            ['delta_enabled','delta_max','Maks. różnica cel (mV)',0,1000,1]]){
              markup+=bool(enabled,'Włącz: '+title);
              if(c[enabled])markup+=field(title,'storage_'+key,c[key],'number',null,'min="'+min+'" max="'+max+'" step="'+step+'"');
          }
          markup+=bool('offline_alarm','Alarm braku komunikacji SOC');
          markup+='<h4>Encje magazynu i BMS</h4>';
          for(const [key,label] of [
            ['soc','SOC (%)'],['power','Moc (W/kW)'],['soh','SOH (%)'],
            ['voltage','Napięcie baterii (V)'],['current','Prąd (A)'],
            ['temperature','Temperatura (°C)'],['cell_min','Minimalne napięcie celi (V)'],
            ['cell_max','Maksymalne napięcie celi (V)'],['cell_delta','Różnica ogniw (mV)'],
            ['cycles','Liczba cykli'],['bms_alarm','Alarm BMS (binary sensor/status)']
          ])markup+=field(label,'storage_entity_'+key,c.entities[key]||'','search',null,'list="ss-entity-list"');
          if(c.mode==='manual')markup+=field('Test SOC (%)','storage_manual_soc',c.manual.soc,'number',null,'min="0" max="100"')+
            field('Test mocy (kW)','storage_manual_power',c.manual.power,'number',null,'min="-500" max="500" step="0.1"');
          markup+='<p class="ss-note">Progi i alarmy służą wyłącznie do prezentacji. Nie zmieniają ustawień falownika ani BMS.</p>';
        }
        if(isRadiator){
          const c=obj.radiator||HASSStudioRadiator.defaults();
          markup+=field('Odbicie lustrzane (lewo/prawo)','rad_mirror_horizontal',c.mirror_horizontal?'true':'false','text',[['false','Normalny'],['true','Odbity']]);
          markup+=field('Skala wyświetlacza (%)','rad_display_scale',Math.round((c.display_scale||1)*100),'range',null,'min="40" max="150" step="5"');
          markup+=field('Wyświetlacz','rad_display',c.display!==false?'true':'false','text',[['true','Widoczny'],['false','Ukryty']]);
          markup+=field('Źródło danych','rad_mode',c.mode||'live','text',[['live','Home Assistant'],['manual','Symulacja']]);
          markup+=field('Czujnik temperatury','rad_temperature_entity',c.temperature_entity||'','search',null,'list="ss-entity-list"');
          markup+=field('Czujnik otwarcia (%)','rad_valve_entity',c.valve_entity||'','search',null,'list="ss-entity-list"');
          if(c.mode==='manual')markup+=field('Test temperatury','rad_manual_temperature',c.manual_temperature,'number')+field('Test otwarcia (%)','rad_manual_open',c.manual_open,'number');
        }
        if(isManifold){
          const c=obj.manifold||HASSStudioManifold.defaults();
          markup+=field('Liczba obiegów (1–40)','mf_count',c.count||5,'number',null,'min="1" max="40" step="1"');
          markup+=field('Rozstaw obiegów','mf_pitch',c.pitch||260,'number',null,'min="165" max="400" step="5"');
          markup+=field('Skala wyświetlaczy (%)','mf_display_scale',Math.round((c.display_scale||1)*100),'range',null,'min="40" max="150" step="5"');
          markup+=field('Sterowanie siłownikami','mf_actuatorMode',c.actuatorMode||'individual','text',[['individual','Indywidualne'],['common','Wspólne']]);
          markup+=field('Źródło danych','mf_mode',c.mode||'live','text',[['live','Home Assistant'],['manual','Symulacja']]);
          const list=HASSStudioManifold.normalize(c).circuits;
          for(let i=0;i<list.length;i++){
            const q=list[i];markup+='<details><summary>Obieg '+(i+1)+'</summary>';
            markup+=field('Wyświetlacz','mf_c_'+i+'_display',q.display?'true':'false','text',[['true','Tak'],['false','Nie']]);
            markup+=field('Siłownik','mf_c_'+i+'_actuator',q.actuator?'true':'false','text',[['true','Tak'],['false','Nie']]);
            markup+=field('Skala tego wyświetlacza (%)','mf_c_'+i+'_display_scale',Math.round(q.display_scale*100),'number',null,'min="40" max="150" step="5"');
            for(const k of ['tempOut','tempReturn','flow','open']){
              markup+=field('Encja '+k,'mf_c_'+i+'_entity_'+k,q.entities?.[k]||'','search',null,'list="ss-entity-list"');
              if(c.mode==='manual')markup+=field('Test '+k,'mf_c_'+i+'_manual_'+k,q[k]??0,'number',null,'step="0.1"');
            }
            markup+='</details>';
          }
        }
        if(isGrid){
          const g=obj.power_grid||HASSStudioPowerGrid.defaults();
          const togg=(key,name)=>field(name,'grid_'+key,g[key]===false?'false':'true','text',[['true','Tak'],['false','Nie']]);
          markup+=field('Skala panelu (%)','grid_panel_scale',Math.round((g.panel_scale??.7)*100),'range',null,'min="40" max="150" step="5"');
          markup+=field('Motyw kontrastu','grid_theme',g.theme||'auto','text',[['auto','Automatyczny'],['light','Jasne tło'],['dark','Ciemne tło']]);
          markup+=field('Panel danych','grid_panel_position',g.panel_position||'right','text',
            [['right','Prawo'],['left','Lewo'],['bottom','Pod słupem']]);
          markup+='<div class="ss-row">'+field('Przesunięcie X','grid_panel_x',g.panel_x||0,'number')+
            field('Przesunięcie Y','grid_panel_y',g.panel_y||0,'number')+'</div>';
          markup+=field('Źródło danych','grid_mode',g.mode||'live','text',
            [['live','Home Assistant'],['manual','Symulacja ręczna']]);
          markup+=togg('show_panel','Pokaż panel')+togg('show_v','Pokaż V')+togg('show_a','Pokaż A');
          for(const n of [1,2,3])markup+=togg('show_l'+n,'Pokaż L'+n);
          const extras=[['total_kw','Moc całkowita'],['import_kw','Pobór z sieci'],['export_kw','Oddawanie do sieci'],
            ['frequency','Częstotliwość'],['power_factor','cos φ'],['grid_status','Dostępność sieci'],
            ['voltage_alarm','Alarm napięcia'],['phase_loss','Brak fazy']];
          markup+='<h4>Dodatkowe dane — opcjonalne</h4>';
          for(const [key,name] of extras)markup+=field(name,'grid_extra_'+key,
            (g.show_extras||[]).includes(key)?'true':'false','text',[['false','Ukryj'],['true','Pokaż']]);
          markup+=field('Napięcie alarmowe min (V)','grid_min_voltage',g.min_voltage,'number')+
                  field('Napięcie alarmowe max (V)','grid_max_voltage',g.max_voltage,'number');
          markup+='<h4>Encje / wartości testowe</h4>';
          for(const key of [...HASSStudioPowerGrid.FIELDS,'grid_status','voltage_alarm','phase_loss']){
            markup+=field('Encja '+key,'grid_entity_'+key,g.entities?.[key]||'','search',null,'list="ss-entity-list"');
            if(g.mode==='manual')markup+=field('Test '+key,'grid_manual_'+key,g.manual?.[key]??0,'number',null,'step="0.01"');
          }
          markup+='<p class="ss-note">Brak encji: —. Symulacja nie wysyła komend do HA.</p>';
        }else markup+=field(L.entity,'entity',obj.entity,'search',null,'list="ss-entity-list"');
        if(['pump','valve'].includes(obj.type)){
          markup+=field('Źródło stanu','eq_mode',obj.equipment_mode||'live','text',
            [['live','Home Assistant'],['manual','Test ręczny']]);
          if(obj.equipment_mode==='manual'){
            if(obj.type==='pump')markup+=field('Test pompy','eq_test_running',obj.equipment_test_running?'true':'false','text',
                [['false','Wyłączona'],['true','Włączona']])+
                field('Czas animacji (s)','eq_test_speed',obj.equipment_test_speed??1,'number',null,'min="0.35" max="5" step="0.1"');
            else markup+=field('Test otwarcia / pozycji (%)','eq_test_position',obj.equipment_test_position??0,'number',null,'min="0" max="100" step="1"')+
                '<p class="ss-note">Zawór 3D: pozycja, nie rzeczywista proporcja mieszania.</p>';
          }
          markup+='<p class="ss-note">Symulacja wizualna bez sterowania HA.</p>';
        }
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
          if(obj.variant==='pellet_modern'){
             const test=obj.pellet_test_mode===true;
             markup+=field('Tryb danych kotła pelletowego','pellet_test_mode',test?'true':'false','text',
                [['false','Home Assistant'],['true','Symulacja ręczna']]);
             if(test){
               markup+=field('Test temperatury (°C)','pellet_manual_temperature',obj.pellet_manual_temperature??65,'number',null,'min="-40" max="150" step="0.5"')+
                 field('Test stanu palnika','pellet_manual_state',obj.pellet_manual_state||'burning','text',
                   [['off','Wyłączony'],['ignition','Rozpalanie'],['burning','Praca'],['embers','Wygaszanie']])+
                 field('Jednostka mocy palnika','pellet_manual_power_unit',obj.pellet_manual_power_unit||'%','text',[['%','%'],['kW','kW']])+
                 field('Test mocy palnika','pellet_manual_power',obj.pellet_manual_power??65,'number',null,'min="0" step="0.1"')+
                 field('Test podajnika','pellet_manual_feeder',obj.pellet_manual_feeder?'true':'false','text',[['false','Wyłączony'],['true','Aktywny']])+
                 field('Test alarmu','pellet_manual_alarm',obj.pellet_manual_alarm?'true':'false','text',[['false','Brak'],['true','Alarm']])+
                 field(L.pelletLevelTest,'pellet_level_test',obj.pellet_level_test??80,'number',null,'min="0" max="100" step="1"');
             }else{
               markup+=field('Encja mocy/modulacji palnika (% / W / kW)','pellet_burner_power_entity',obj.pellet_burner_power_entity||'','search',null,'list="ss-entity-list"')+
                 field('Encja podajnika','pellet_feeder_entity',obj.pellet_feeder_entity||'','search',null,'list="ss-entity-list"')+
                 field('Encja alarmu','pellet_alarm_entity',obj.pellet_alarm_entity||'','search',null,'list="ss-entity-list"')+
                 field(L.pelletLevelEntity,'pellet_level_entity',obj.pellet_level_entity||'','search',null,'list="ss-entity-list"')+
                 field(L.pelletLevelMode,'pellet_level_manual',obj.pellet_level_manual?'true':'false','text',[['false',L.pelletLevelHA],['true',L.pelletLevelManual]])+
                 (obj.pellet_level_manual?field(L.pelletLevelTest,'pellet_level_test',obj.pellet_level_test??80,'number',null,'min="0" max="100" step="1"'):'');
             }
             markup+=field(L.pelletAlarm,'pellet_alarm_pct',obj.pellet_alarm_pct??20,'number',null,'min="0" max="100" step="1"');
           }
          if(obj.variant==='heatpump_modern')markup+=field('Tryb testowy pompy','hp_test_mode',obj.hp_test_mode?'true':'false','text',[['false','Home Assistant'],['true','Symulacja ręczna']])+
             (obj.hp_test_mode?field('Test mocy (kW)','hp_manual_kw',obj.hp_manual_kw??0,'number',null,'min="0" max="500" step="0.1"')+field('Test wentylatora (%)','hp_manual_fan',obj.hp_manual_fan??0,'number',null,'min="0" max="100" step="1"'):'')+
             field(L.hpPower,'hp_power_entity',obj.hp_power_entity,'search',null,'list="ss-entity-list"')+
            field(L.hpFan,'hp_fan_entity',obj.hp_fan_entity,'search',null,'list="ss-entity-list"')+
            field(L.hpMaxRpm,'hp_max_rpm',obj.hp_max_rpm,'number',null,'min="100" max="20000" step="100"')+
            field(L.hpGlow,'hp_glow',obj.hp_glow,'range',null,'min="0" max="100" step="5"');
          if(['solid_fuel','pellet_modern','fireplace_modern'].includes(obj.variant)){
            markup+=(obj.variant==='solid_fuel'?field(L.solidFuel,'solid_fuel',obj.solid_fuel,'text',[['wood',L.solidWood],['coal',L.solidCoal]]):'')+
              (obj.variant==='pellet_modern'&&obj.pellet_test_mode?'':field(L.solidState,'solid_state',obj.solid_state,'text',[['auto',L.solidAuto],['burning',L.solidBurning],['embers',L.solidEmbers],['off',L.solidOff]]))+
              field(L.solidGlow,'solid_glow',obj.solid_glow,'range',null,'min="0" max="100" step="5"')+
              '<p class="ss-note">'+esc(L.solidHelp)+'</p>';
          }else if(obj.variant==='heatpump')markup+=field('Tryb pracy pompy (wizualizacja)','burner_mode',obj.burner_mode,'text',[['auto','Automatyczny'],['on','Pracuje — test'],['off','Wyłączona — test']]);
          else if(obj.variant!=='heatpump_modern')markup+=field(L.boilerState,'burner_mode',obj.burner_mode,'text',[['auto',L.flowAuto],['on',L.flowOn],['off',L.flowOff]]);
          if(obj.variant==='heatpump'){
            markup+=field('Encja pracy pompy ciepła','burner_entity',obj.burner_entity,'search',null,'list="ss-entity-list"');
            markup+=field('Próg startu animacji przy braku encji (°C)','burner_on_temp',obj.burner_on_temp,'number',null,'min="20" max="90" step="1"');
            markup+=field('Próg zakończenia animacji (°C)','burner_off_temp',obj.burner_off_temp,'number',null,'min="10" max="89" step="1"');
            markup+='<p class="ss-note">Progi sterują tylko animacją starszej grafiki, nie uruchamiają pompy.</p>';
          }else if(obj.variant!=='heatpump_modern'&&!(obj.variant==='pellet_modern'&&obj.pellet_test_mode)){
            markup+=field(L.burnerEntity,'burner_entity',obj.burner_entity,'search',null,'list="ss-entity-list"');
            markup+=field(L.burnerOnTemp,'burner_on_temp',obj.burner_on_temp,'number',null,'min="20" max="90" step="1"');
            markup+=field(L.burnerOffTemp,'burner_off_temp',obj.burner_off_temp,'number',null,'min="10" max="89" step="1"');
          }
        }
        if(obj.type==='solar'){
          markup+=field(L.solarPump,'pump_entity',obj.pump_entity,'search',null,'list="ss-entity-list"');
          markup+=field(L.solarTank,'tank_entity',obj.tank_entity,'search',null,'list="ss-entity-list"');
          markup+=field(L.solarOnDelta,'solar_on_delta',obj.solar_on_delta,'number',null,'min="1" max="40" step="0.5"');
          markup+=field(L.solarOffDelta,'solar_off_delta',obj.solar_off_delta,'number',null,'min="0" max="39" step="0.5"');
        }
        markup+='</section></details><details class="ss-section-details" data-section="entities"'+sectionAttr('entities')+'><summary>'+
           sectionIcon('mdi:chart-timeline-variant')+'<span>'+esc(L.entities)+'</span>'+sectionIcon('mdi:chevron-down')+
           '</summary><section>'+
          obj.entities.map((en,index)=>'<div class="ss-row">'+
            entityField(en.entity,'multiEntity',index)+
            '<button type="button" data-delete-entity="'+index+'">×</button></div>'+
            field(L.label,'multiLabel',en.label,'text',null,'data-index="'+index+'"')).join('')+
          '<button type="button" data-action="entity">'+esc(L.addEntity)+'</button></section></details>';
        if(obj.type==='tank'||obj.type==='solar'){
          const isModular=obj.type==='tank'&&obj.variant==='modular';
          markup+='<details class="ss-section-details" data-section="parts"'+sectionAttr('parts')+'><summary>'+
            sectionIcon('mdi:layers-outline')+'<span>'+esc(obj.type==='solar'?L.solarSensors:(L.internalParts||'Elementy wewnętrzne'))+
            '</span><span class="ss-part-count">'+obj.parts.length+'</span>'+sectionIcon('mdi:chevron-down')+'</summary>'+
            '<section><div class="ss-part-cards">'+obj.parts.map((item,index)=>
              '<div class="ss-part-card'+(item.id===getSelectedPartId()?' ss-part-active':'')+'">'+
              '<button type="button" class="ss-part-pick" data-select-part="'+esc(item.id)+'" aria-pressed="'+
                (item.id===getSelectedPartId()?'true':'false')+'" aria-expanded="'+(item.id===getExpandedPartId()?'true':'false')+'">'+
                sectionIcon(partIcons[item.kind]||'mdi:cube-outline')+
                '<span class="ss-part-caption"><strong>'+esc(item.label||((L[item.kind]||item.kind)+' '+(index+1)))+
                '</strong><small>'+esc(item.entity||((L[item.kind]||item.kind)+' · '+(index+1)))+'</small></span>'+
                sectionIcon(item.id===getExpandedPartId()?'mdi:chevron-up':'mdi:chevron-down')+
              '</button>'+
              (item.id!==getExpandedPartId()?'':'<div class="ss-part-fields">'+
                '<div class="ss-row ss-part-actions"><strong>'+esc((L[item.kind]||item.kind)+' '+(index+1))+
                (isModular?' · '+esc(L.partLayer)+' '+index:'')+'</strong>'+
                (isModular?'<button type="button" title="'+esc(L.partLayerDown)+'" aria-label="'+esc(L.partLayerDown)+'" data-layer-down="'+index+'"'+(index===0?' disabled':'')+'>↓</button>'+
                  '<button type="button" title="'+esc(L.partLayerUp)+'" aria-label="'+esc(L.partLayerUp)+'" data-layer-up="'+index+'"'+(index===obj.parts.length-1?' disabled':'')+'>↑</button>':'')+
                '<button type="button" aria-label="'+esc(L.remove)+'" data-delete-part="'+index+'">×</button></div>'+
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
            '<label>'+esc(L.entity)+entityField(item.entity,'partEntity',index)+'</label>'+
              '</div>')+'</div>'
            ).join('')+'</div>'+
          '<div class="ss-add-parts">'+(obj.type==='solar'?[['sensor',L.sensor]]:(isModular?[['sensor',L.sensor],['heater',L.heater],['coil',L.coil],['baffle_horizontal',L.baffle_horizontal],['baffle_vertical',L.baffle_vertical],['inner_tank',L.inner_tank]]:[['sensor',L.sensor],['heater',L.heater],['coil',L.coil]])).map(v=>
            '<button type="button" data-add-part="'+v[0]+'">+ '+esc(v[1])+'</button>').join('')+'</div></section></details>';
        }
      }else{
        const isHydraulic=obj.type==='hydraulic',s=obj.style,a=obj.animation;
        markup+='<p class="ss-note">'+(isHydraulic?'Rura hydrauliczna':'Przewód elektryczny')+
          ' — rodzaj wybiera się w bibliotece połączeń.</p>';
        markup+=field(L.pipeWidth,'style_width',s.width,'range',null,'min="2" max="14" step="1"');
        if(isHydraulic){
          markup+=field(L.pipeColor,'style_color',s.color,'text',colorsList);
          markup+=field(L.pipeStart,'style_cap_start',s.cap_start?'true':'false','text',[['true',L.yes],['false',L.no]]);
          markup+=field(L.pipeEnd,'style_cap_end',s.cap_end?'true':'false','text',[['true',L.yes],['false',L.no]]);
          markup+=field(L.flowMode||'Flow animation','anim_flow_mode',a.flow_mode,'text',
            [['off',L.flowOff||'Off'],['auto',L.flowAuto||'Controlled by entity'],['on',L.flowOn||'On (preview)']]);
          markup+=field(L.flowEntity||'Animation state entity','anim_flow_entity',a.flow_entity,'search',null,'list="ss-entity-list"');
        }else{
          markup+=field('Animacja mocy','anim_flow_power_mode',a.flow_power_mode||'off','text',
            [['off','Wyłączona'],['ha','Pomiar mocy z HA'],['manual','Symulacja ręczna']]);
          if(a.flow_power_mode==='ha')
            markup+=field('Encja mocy (W/kW)','anim_flow_power_entity',a.flow_power_entity,'search',null,'list="ss-entity-list"');
          if(a.flow_power_mode==='manual')
            markup+=field('Moc testowa (kW)','anim_flow_power_kw',a.flow_power_kw,'number',null,'step="0.1"');
          if(a.flow_power_mode!=='off'){
            markup+=field('Moc maksymalna skali (kW)','anim_flow_max_kw',a.flow_max_kw,'number',null,'min="0.1" step="0.1"');
            markup+=field('Grubość animacji min','anim_flow_min_width',a.flow_min_width,'number',null,'min="0.5" max="12" step="0.5"');
            markup+=field('Grubość animacji max','anim_flow_max_width',a.flow_max_width,'number',null,'min="0.5" max="16" step="0.5"');
            markup+=field('Wzór przepływu','anim_flow_pattern',a.flow_pattern,'text',[['dots','Kropki'],['dashes','Kreski'],['arrows','Strzałki']]);
            markup+=field('Odwracanie przy ujemnej mocy','anim_flow_power_direction',a.flow_power_direction?'true':'false','text',[['true','Tak'],['false','Nie']]);
          }
        }
        markup+=field(L.flowDirection||'Flow direction','anim_flow_direction',a.flow_direction,'text',
          [['forward',L.forward||'Start → End'],['reverse',L.reverse||'End → Start']]);
        markup+=field(L.flowSpeed||'Animation duration (s)','anim_flow_speed',a.flow_speed,'number',null,'min="0.35" max="5" step="0.1"');
        markup+='<p>'+esc(L.pipeHelp)+'</p><div class="ss-row">'+
          '<button type="button" data-action="bend">+ '+esc(L.newBend)+'</button>'+
          '<button type="button" data-action="unbend">'+esc(L.removeBend)+'</button></div></section>';
        if(isHydraulic){
          markup+='<section><h4>'+esc(L.accessories)+'</h4>'+
            obj.accessories.map((a,index)=>
              '<div class="ss-row"><strong>'+esc(L[a.type]||a.type)+'</strong>'+
              '<button type="button" data-delete-accessory="'+index+'">×</button></div>'+
              field(L.accessoryPos,'accessoryPos',a.position,'range',null,
                'min="0" max="100" step="1" data-index="'+index+'"')+
              field(L.accessoryLabel,'accessoryLabel',a.label,'text',null,'data-index="'+index+'"')+
              '<label>'+esc(L.entity)+entityField(a.entity,'accessoryEntity',index)+'</label>'+
               field('Źródło stanu','accessoryMode',a.mode||'live','text',
                 [['live','Home Assistant'],['manual','Test ręczny']],'data-index="'+index+'"')+
               (a.mode==='manual'?(a.type==='pump'?
                 field('Pompa testowa','accessoryRunning',a.test_running?'true':'false','text',
                   [['false','Wyłączona'],['true','Włączona']],'data-index="'+index+'"')+
                 field('Czas animacji (s)','accessorySpeed',a.test_speed??1,'number',null,'min="0.35" max="5" step="0.1" data-index="'+index+'"'):
                 field('Pozycja testowa (%)','accessoryPosition',a.test_position??0,'number',null,'min="0" max="100" step="1" data-index="'+index+'"')):'')).join('')+
            '<div class="ss-add-parts"><button type="button" data-add-accessory="pump">+ '+esc(L.pump)+'</button>'+
            '<button type="button" data-add-accessory="valve">+ '+esc(L.valve)+'</button></div></section>';
        }
      }
      const scroll=properties.scrollTop;
      properties.innerHTML=markup+'<datalist id="ss-entity-list">'+entityList()+'</datalist>';
      properties.scrollTop=scroll;
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


/* Native Home Assistant icons and hierarchical equipment library. */
const HASSStudioEditorLibrary=(()=>{
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l');
  const filter=(registry,lang,q)=>{
    const language=lang==='en'?'en':'pl',needle=norm(q).trim();
    if(!needle)return [];
    const aliases={pl:{kaloryfer:'grzejnik',piec:'kocioł',pv:'falownik',bojler:'zbiornik'},en:{pv:'inverter',heater:'radiator'}};
    const term=norm(aliases[language][needle]||needle);
    return registry.libraryEntries(language).filter(x=>[x.label,x.type,x.variant,registry.categories[x.category]?.[language],registry.subgroups[x.subgroup]?.[language]].some(y=>norm(y).includes(term)));
  };
  const key='ha-systems-studio-recent-v1';
  const readRecent=storage=>{try{const v=JSON.parse(storage?.getItem(key)||'[]');return Array.isArray(v)?v.filter(x=>typeof x?.type==='string'&&typeof x?.variant==='string').slice(0,5):[];}catch{return [];}};
  const recordRecent=(storage,type,variant)=>{const v=[{type,variant},...readRecent(storage).filter(x=>x.type!==type||x.variant!==variant)].slice(0,5);try{storage?.setItem(key,JSON.stringify(v));}catch{}return v;};
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
        return subset.length?'<details class="ss-lib-subgroup"'+''+'><summary>'+
          icon(labels.icon)+'<span class="ss-lib-title">'+esc(labels[lang])+'</span>'+
          '<span class="ss-lib-count">'+subset.length+'</span>'+arrow()+'</summary>'+
          '<div class="ss-lib-items">'+subset.map(button).join('')+'</div></details>':'';
      }).join('');
      const direct=items.filter(item=>!item.subgroup).map(button).join('');
      return '<details class="ss-lib-group" data-lib-category="'+esc(category)+'"'+
        ''+'><summary>'+
        icon(registry.categoryIcons[category]||'mdi:cube-outline')+
        '<span class="ss-lib-title">'+esc(names[lang])+'</span>'+
        '<span class="ss-lib-count">'+items.length+'</span>'+arrow()+'</summary>'+
        '<div class="ss-lib-contents">'+nested+direct+'</div></details>';
    }).join('');
  };
  return Object.freeze({render,filter,readRecent,recordRecent});
})();


/* Home Assistant Systems Studio - Custom Designer v0.3 (opt-in).
 * Based on Warmwasser Schema Card. The original automatic renderer stays intact.
 * No external dependencies or service calls in the designer.
 */
(() => {
  const W=1200,H=720,MAX_NODES=60,MAX_CONNECTIONS=80;
  const viewport=HASSStudioViewport;
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
      pump:'Pompa',valve:'Zawór',connection:'Rura',pipeColor:'Rodzaj rury',pipeWidth:'Grubość',
      hot:'Ciepła woda',cold:'Zimna woda',solarFlow:'Obieg solarny',returnFlow:'Powrót',
      newBend:'Dodaj punkt załamania',removeBend:'Usuń ostatni punkt',
      pipeHelp:'Przeciągnij linię, aby przesunąć całą rurę. Przeciągnij punkt, aby zmienić jej kształt. Dwuklik dodaje załamanie.',
      accessoryPos:'Położenie na rurze (%)',editHelp:'Wybierz element po lewej i ustaw jego właściwości po prawej.',
      boiler:'Kotły',tank:'Zbiorniki',solar:'Solary',pumps:'Pompy',valves:'Zawory',sensorsMenu:'Czujniki',connections:'Rury',
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
      heater:'Heating element',coil:'Coil',accessories:'On-connection equipment',
      pump:'Pump',valve:'Valve',connection:'Pipe',pipeColor:'Pipe type',pipeWidth:'Width',
      hot:'Hot water',cold:'Cold water',solarFlow:'Solar circuit',returnFlow:'Return',
      newBend:'Add bend point',removeBend:'Remove last point',
      pipeHelp:'Drag the connection line to move the whole connection. Drag a handle to change its shape. Double-click to add a bend.',
      accessoryPos:'Position on connection (%)',editHelp:'Pick a component on the left; configure it on the right.',
      boiler:'Boilers',tank:'Tanks',solar:'Solar',pumps:'Pumps',valves:'Valves',sensorsMenu:'Sensors',connections:'Pipes',
      link:'Assign entity',addEntity:'Add entity',label:'Description',default:'Default',
      zoom:'Zoom',noValues:'No data',editor:'System diagram designer'}
  };
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{canvasSettings:'Ustawienia schematu',schemeName:'Nazwa schematu (opcjonalna)',canvasWidth:'Szerokość',canvasHeight:'Wysokość',apply:'Zastosuj',fit:'Dopasuj schemat',all:'Pokaż wszystkie',help:'Skróty klawiaturowe',undo:'Cofnij',redo:'Ponów',shortcutTitle:'Sterowanie edytorem',shortcutHint:'Skróty nie działają podczas pisania w polach formularzy.',outside:'Zmniejszenie obszaru nie usuwa urządzeń ani rur.'}:{canvasSettings:'Diagram settings',schemeName:'Diagram name (optional)',canvasWidth:'Width',canvasHeight:'Height',apply:'Apply',fit:'Fit diagram',all:'Show all',help:'Keyboard shortcuts',undo:'Undo',redo:'Redo',shortcutTitle:'Editor controls',shortcutHint:'Shortcuts are disabled while editing form fields.',outside:'Shrinking the canvas does not remove devices or connections.'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{tankGlow:'Efekt cieplny grzałek (%)',heaterMode:'Stan grzałki',heaterPower:'Intensywność (%)',heaterWatts:'Encja mocy (W/kW)',partX:'Pozycja pozioma (%)',partLength:'Wysokość / długość (%)',partWidth:'Szerokość (%)',partTurns:'Liczba zwojów',permeability:'Przepuszczalność 0–1',partContainer:'Strefa czujnika',partFlowMode:'Przepływ wężownicy',baffle_horizontal:'Przegroda pozioma',baffle_vertical:'Przegroda pionowa',inner_tank:'Zbiornik wewnętrzny'}:{tankGlow:'Heater visual glow (%)',heaterMode:'Heater status',heaterPower:'Glow intensity (%)',heaterWatts:'Power entity (W/kW)',partX:'Horizontal position (%)',partLength:'Height / length (%)',partWidth:'Width (%)',partTurns:'Coil turns',permeability:'Permeability 0–1',partContainer:'Sensor compartment',partFlowMode:'Coil flow',baffle_horizontal:'Horizontal baffle',baffle_vertical:'Vertical baffle',inner_tank:'Inner tank'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{tankScaleMode:'Skalowanie zbiornika',tankScaleProportional:'Proporcjonalne',tankScaleFree:'Osobna szerokość i wysokość',tankWidthScale:'Szerokość zbiornika',tankHeightScale:'Wysokość zbiornika'}:{tankScaleMode:'Tank scaling',tankScaleProportional:'Proportional',tankScaleFree:'Independent width and height',tankWidthScale:'Tank width',tankHeightScale:'Tank height'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{partLayer:'Warstwa',partLayerUp:'Przenieś wyżej',partLayerDown:'Przenieś niżej'}:{partLayer:'Layer',partLayerUp:'Move up',partLayerDown:'Move down'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{solidModel:'Piec węgiel / drewno',solidFuel:'Rodzaj opału',solidWood:'Drewno',solidCoal:'Węgiel',solidState:'Stan paleniska (wizualizacja)',solidAuto:'Automatycznie wg encji / temperatury',solidBurning:'Palenie',solidEmbers:'Żarzenie',solidOff:'Wygaszenie',solidGlow:'Intensywność efektu (%)',solidHelp:'Animacja jest wizualna, bez sterowania urządzeniem. Encja stanu spalania ma pierwszeństwo nad progami temperatury.'}:{solidModel:'Wood / coal boiler',solidFuel:'Fuel type',solidWood:'Wood',solidCoal:'Coal',solidState:'Combustion state (visual only)',solidAuto:'Auto from entity / temperature',solidBurning:'Burning',solidEmbers:'Embers',solidOff:'Extinguished',solidGlow:'Effect intensity (%)',solidHelp:'Animation only, no device control. Combustion entity takes precedence over temperature thresholds.'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{solidWidth:'Szerokość pieca',solidHeight:'Wysokość pieca'}:{solidWidth:'Boiler width',solidHeight:'Boiler height'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{pelletModel:'Piec na pellet (nowoczesny)'}:{pelletModel:'Modern pellet boiler'});
  for(const lang of ['pl','en'])Object.assign(words[lang],lang==='pl'?{
    pelletLevelEntity:'Encja poziomu pelletu (%)',pelletLevelMode:'Źródło poziomu pelletu',
    pelletLevelHA:'Home Assistant',pelletLevelManual:'Ręczny / testowy',
    pelletLevelTest:'Poziom ręczny (%)',pelletAlarm:'Alarm przy poziomie ≤ (%)'
  }:{
    pelletLevelEntity:'Pellet level entity (%)',pelletLevelMode:'Pellet level source',
    pelletLevelHA:'Home Assistant',pelletLevelManual:'Manual / test',
    pelletLevelTest:'Manual level (%)',pelletAlarm:'Alarm at or below (%)'
  });
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
  const {canvasSvg,connectionPath,onConnection,variantShape,translateConnectionPoints}=HASSStudioCanvas.create({
    W,H,colors,normalized,pickLang,words,clamp,validEntity,esc
  });
  // Card viewer: fit entire scheme at every responsive width, only zoom after explicit interaction.
  const nativeRender=WarmwasserSchemaCard.prototype._render;
  const nativeUpdate=WarmwasserSchemaCard.prototype._update;
  WarmwasserSchemaCard.prototype._render=function(){
    if(this._cfg?.layout_mode!=='custom')return nativeRender.call(this);
    const {width,height}=viewport.dimensions(this._cfg);
    const L=words[pickLang(this._cfg,this._hass)];
    const schemeName=String(this._cfg.studio_layout?.name||'').trim().slice(0,64);
    const label=esc('Home Assistant System Studio')+(schemeName?' - '+esc(schemeName):'');
    const viewerCss='<style>'+
      '.ss-card-viewport{position:relative;display:flex;flex-direction:column;width:100%;aspect-ratio:'+width+'/'+height+';min-height:0;overflow:hidden;background:var(--secondary-background-color,#17222d);touch-action:pan-y;user-select:none}'+
      '.ss-card-viewport svg{display:block;flex:1 1 auto;min-height:0;width:100%;height:100%;max-width:none;max-height:none;touch-action:none}'+
      '.ss-card-viewport:fullscreen{width:100vw;height:100vh;aspect-ratio:auto;background:#17222d;touch-action:none}'+
      '.ss-card-viewport:fullscreen svg{touch-action:none}'+
      '.ss-card-header{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:nowrap;padding:8px 12px;background:var(--card-background-color,#1c1c1c)}'+
      '.ss-card-header .ss-card-title{font-size:16px;font-weight:600;color:var(--primary-text-color);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
      '.ss-card-header .ss-view-tools{display:flex;align-items:center;gap:4px;flex-shrink:0}'+
      '.ss-view-tools button{appearance:none;background:var(--secondary-background-color,#293949);border:1px solid var(--divider-color,#53677c);border-radius:5px;color:var(--primary-text-color,#fff);min-width:28px;min-height:28px;padding:3px;cursor:pointer;font:600 14px sans-serif}'+
      '.ss-view-tools button:focus-visible{outline:2px solid #52bfff}'+
      '.ss-card-viewport:fullscreen{display:flex;flex-direction:column}'+
      '.ss-card-viewport:fullscreen .ss-card-header{flex:0 0 auto}'+
      '.ss-card-viewport:fullscreen svg{flex:1 1 auto;min-height:0}'+
      '@media(max-width:600px){.ss-card-header{gap:4px;padding:6px}.ss-card-header .ss-card-title{font-size:12px}.ss-view-tools{gap:2px}.ss-view-tools button{min-width:27px;min-height:27px}}'+
      '</style>';
    return viewerCss+'<div class="ss-card-viewport" id="ss-card-viewport" tabindex="0" aria-label="'+esc(L.editor)+'">'+
      '<div class="ss-card-header"><div class="ss-card-title">'+label+'</div><div class="ss-view-tools">'+
      '<button type="button" data-view-action="out" title="Zoom −" aria-label="Zoom out">−</button>'+
      '<button type="button" data-view-action="in" title="Zoom +" aria-label="Zoom in">+</button>'+
      '<button type="button" data-view-action="fit" title="Dopasuj cały schemat" aria-label="Fit diagram">⤢</button>'+
      '<button type="button" data-view-action="full" title="Pełny ekran" aria-label="Fullscreen">⛶</button></div></div>'+
      canvasSvg(this._cfg,this._hass)+'</div>';
  };
  const updateCardCamera=function(){
    const view=this._box?.querySelector('#ss-card-viewport'),svg=view?.querySelector('svg');
    if(!svg)return;
    const {width,height}=viewport.dimensions(this._cfg);
    const rect=svg.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height);
    if(!this._studioCardCamera || this._studioCardShape!==width+'x'+height){
      this._studioCardCamera=viewport.fresh(width,height);
      this._studioCardShape=width+'x'+height;
    }
    const box=viewport.box(this._studioCardCamera,w,h,width,height);
    svg.setAttribute('viewBox',[box.x,box.y,box.width,box.height].join(' '));
    svg.setAttribute('preserveAspectRatio','none');
    // The diagram must own touch input before the first pinch, at ALL zooms.
    // Only the header/non-drawing area retains dashboard vertical scrolling.
    const fullscreen=typeof document!=='undefined'&&document.fullscreenElement===view;
    const viewTouchMode=fullscreen?'none':'pan-y';
    if(view.style.touchAction!==viewTouchMode)view.style.touchAction=viewTouchMode;
    if(svg.style.touchAction!=='none')svg.style.touchAction='none';
    if(this._studioCardResizeTarget!==view){
      this._studioCardObserver?.disconnect();
      if(typeof ResizeObserver!=='undefined'){
        this._studioCardObserver=new ResizeObserver(()=>updateCardCamera.call(this));
        this._studioCardObserver.observe(view);
      }
      this._studioCardResizeTarget=view;
    }
  };
  WarmwasserSchemaCard.prototype._update=function(){
    nativeUpdate.call(this);
    if(this._cfg?.layout_mode!=='custom')return;
    const root=this.shadowRoot;
    if(root&&!this._studioViewerDispose){
      this._studioViewerDispose=HASSStudioViewerGestures.install({
        root,host:this,viewport,
        getView:()=>root.getElementById('ss-card-viewport'),
        getDimensions:()=>viewport.dimensions(this._cfg),
        getCamera:()=>this._studioCardCamera,
        setCamera:camera=>{this._studioCardCamera=camera;updateCardCamera.call(this);}
      });
    }
    updateCardCamera.call(this);
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
      '.ss-grid{display:grid;grid-template-columns:var(--ss-left,220px) 7px minmax(0,1fr) 7px var(--ss-right,310px);flex:1;min-height:0;height:100%}'+
      '.ss-splitter{width:7px;cursor:col-resize;background:var(--divider-color,#44505b);opacity:.6;flex-shrink:0}'+
      '.ss-library,.ss-props{padding:12px;overflow-y:auto;border-right:1px solid var(--divider-color,#555)}'+
      '.ss-props{border-right:none;border-left:1px solid var(--divider-color,#555);min-width:0;overflow-x:hidden}'+
      '.ss-library h3,.ss-props h3{font-size:12px;letter-spacing:.06em;color:var(--secondary-text-color);margin:0 0 12px}'+
      '.ss-library button{display:flex;align-items:center;gap:12px;width:100%;margin-bottom:8px;text-align:left;font-size:13px}'+
      '.ss-library ha-icon{display:inline-flex;align-items:center;justify-content:center;flex:0 0 20px;width:20px;height:20px;--mdc-icon-size:20px;color:var(--secondary-text-color,#9eacbb)}'+
       '.ss-library .ss-lib-chevron{flex:0 0 16px;width:16px;height:16px;--mdc-icon-size:16px;transition:transform .15s}'+
       '.ss-lib-group:not([open])>summary .ss-lib-chevron,.ss-lib-subgroup:not([open])>summary .ss-lib-chevron{transform:rotate(-90deg)}'+
       '.ss-library summary::-webkit-details-marker{display:none}.ss-library summary{list-style:none}'+
      '.ss-library .ss-lib-group{border:1px solid var(--divider-color,#555);border-radius:8px;margin:0 0 8px;overflow:hidden}'+
      '.ss-library .ss-lib-group>summary,.ss-library .ss-lib-subgroup>summary{cursor:pointer;display:flex;align-items:center;gap:8px;padding:10px 8px;font-size:12px;font-weight:600;min-width:0}'+
      '.ss-library .ss-lib-group>summary{background:var(--secondary-background-color,#18222e)}'+
      '.ss-library .ss-lib-subgroup{margin:4px 0 8px;border-left:1px solid var(--divider-color,#555);padding-left:3px}'+
       '.ss-library .ss-lib-title{flex:1;min-width:0;overflow-wrap:anywhere}'+
      '.ss-library .ss-lib-subgroup>summary{font-size:11px;padding:8px}'+
      '.ss-library .ss-lib-contents{padding:6px}'+
      '.ss-library .ss-lib-count{color:var(--secondary-text-color);font-weight:400}'+
      '.ss-library button.ss-lib-item{gap:8px;padding:8px 6px;margin:0 0 4px;border-color:transparent;background:transparent;white-space:normal}'+
      '.ss-library button.ss-lib-item:hover,.ss-library button.ss-lib-item:focus-visible{background:var(--secondary-background-color,#18222e);border-color:var(--primary-color,#168bce)}'+
      '.ss-library .ss-lib-label{font-size:12px;line-height:1.3;display:block;min-width:0;flex:1;overflow-wrap:anywhere}'+
      '.ss-library .ss-lib-icon{flex:0 0 20px}'+
      '.ss-library-search{width:100%;box-sizing:border-box;border:1px solid var(--divider-color,#555);border-radius:7px;padding:9px;margin-bottom:9px;background:var(--card-background-color,#29323c);color:var(--primary-text-color)}'+
      '.ss-lib-results[hidden],.ss-lib-catalog[hidden],.ss-lib-recent[hidden]{display:none}.ss-lib-recent{padding:7px;border:1px solid var(--divider-color,#555);border-radius:8px;margin-bottom:9px}.ss-lib-recent strong,.ss-lib-results strong{display:block;font-size:12px;margin-bottom:7px}'+
      '.ss-canvas{position:relative;min-width:0;min-height:0;overflow:hidden;background:#101820;padding:0;outline:0;touch-action:none}'+
      '.ss-stage{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:default}'+
      '.ss-svg{display:block;width:100%;height:100%;max-width:none;max-height:none;padding:0;touch-action:none;background:#101820}'+
      '.ss-settings,.ss-help{position:absolute;top:60px;right:15px;z-index:15;background:var(--card-background-color,#263340);border:1px solid var(--divider-color,#64768c);box-shadow:0 12px 35px #0009;border-radius:9px;padding:16px;width:min(340px,calc(100vw - 35px));max-height:calc(100vh - 90px);overflow:auto}'+
      '.ss-settings[hidden],.ss-help[hidden]{display:none}'+
      '.ss-settings label{display:grid;gap:5px;font-size:12px;margin-bottom:10px}'+
      '.ss-settings input{width:100%;box-sizing:border-box;padding:8px;border-radius:7px;background:var(--secondary-background-color,#18222e);color:var(--primary-text-color);border:1px solid var(--divider-color,#555)}'+
      '.ss-help table{width:100%;border-collapse:collapse;font-size:12px}.ss-help td{padding:7px 5px;border-bottom:1px solid var(--divider-color,#555)}'+
      '.ss-help kbd{font:inherit;background:var(--secondary-background-color,#18222e);border:1px solid #53667a;padding:2px 5px;border-radius:4px}'+
      '.ss-bar .ss-viewport-buttons{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.ss-bar .ss-viewport-buttons button{padding:7px 10px}'+
      '.ss-svg-editor .ss-node,.ss-svg-editor .ss-connection-hit,.ss-handle{cursor:default}.ss-svg-editor .ss-connection-hit{pointer-events:stroke}.ss-stage.ss-dragging,.ss-stage.ss-dragging *{cursor:grabbing!important}'+
      '.ss-svg-editor .ss-accessory{pointer-events:none}.ss-svg:not(.ss-svg-editor) .ss-connection{pointer-events:none}'+
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
      '.ss-inspector-heading{display:flex;align-items:center;gap:10px;font-size:15px;font-weight:600;margin-bottom:12px;overflow-wrap:anywhere}'+
       '.ss-inspector-heading ha-icon{--mdc-icon-size:22px;color:var(--primary-color,#168bce)}'+
       '.ss-section-details{border:1px solid var(--divider-color,#555);border-radius:9px;margin-bottom:10px;overflow:hidden}'+
       '.ss-section-details>summary{display:flex;align-items:center;gap:8px;list-style:none;padding:11px;cursor:pointer;background:var(--secondary-background-color,#18222e);font-weight:600;font-size:12px}'+
       '.ss-section-details>summary::-webkit-details-marker{display:none}'+
       '.ss-section-details>summary span:first-of-type{flex:1}'+
       '.ss-section-details>summary ha-icon{--mdc-icon-size:18px;width:18px;height:18px;color:var(--secondary-text-color)}'+
       '.ss-section-details:not([open])>summary ha-icon:last-child{transform:rotate(-90deg)}'+
       '.ss-section-details>section{border:0;padding:10px;gap:10px}'+
       '.ss-part-count{color:var(--secondary-text-color);font-weight:400}'+
       '.ss-part-cards{display:grid;gap:6px}'+
       '.ss-part-card{border:1px solid var(--divider-color,#555);border-radius:8px;overflow:hidden;min-width:0}'+
       '.ss-part-card.ss-part-active{border-color:var(--primary-color,#168bce)}'+
       '.ss-props button.ss-part-pick{display:flex;align-items:center;gap:8px;text-align:left;width:100%;border:0;border-radius:0;background:var(--card-background-color,#29323c)}'+
       '.ss-part-pick ha-icon{--mdc-icon-size:18px;flex:0 0 18px;color:var(--secondary-text-color)}'+
       '.ss-part-caption{display:flex;flex-direction:column;flex:1;min-width:0;gap:3px;overflow-wrap:anywhere}'+
       '.ss-part-caption small{font-size:10px;color:var(--secondary-text-color)}'+
       '.ss-part-fields{display:grid;gap:10px;padding:10px;border-top:1px solid var(--divider-color,#555)}'+
       '.ss-part-actions strong{font-size:11px}'+
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
      '<label>'+esc(L.zoom)+' <select id="ss-zoom">'+opts([['0.25','25%'],['0.5','50%'],['0.65','65%'],['0.8','80%'],['1','100%'],['1.25','125%'],['1.5','150%'],['2','200%'],['4','400%']],'1')+'</select></label>'+
       '<div class="ss-viewport-buttons">'+
       '<button id="ss-fit" type="button" title="'+esc(L.fit)+'">⤢ '+esc(L.fit)+'</button>'+
       '<button id="ss-all" type="button" title="'+esc(L.all)+'">▣</button>'+
       '<button id="ss-undo" type="button" title="'+esc(L.undo)+'">↶</button>'+
       '<button id="ss-redo" type="button" title="'+esc(L.redo)+'">↷</button>'+
       '<button id="ss-size" type="button" title="'+esc(L.canvasSettings)+'">⚙</button>'+
       '<button id="ss-shortcuts" type="button" title="'+esc(L.help)+'" aria-expanded="false" aria-controls="ss-help">?</button></div>'+
      '<button id="ss-duplicate" type="button">⧉ '+(pickLang(this._config,this._hass)==='en'?'Duplicate':'Duplikuj')+'</button>'+ 
       '<button id="ss-delete" type="button">'+esc(L.remove)+'</button>'+
      '<button id="ss-close" type="button">'+esc(L.close)+'</button></div>'+
      '<div class="ss-settings" id="ss-settings" hidden><strong>'+esc(L.canvasSettings)+'</strong>'+
       '<label>'+esc(L.schemeName)+'<input type="text" maxlength="64" id="ss-scheme-name" placeholder="Kotłownia"></label>'+
       '<label>'+esc(L.canvasWidth)+' (300–5000)<input type="number" min="300" max="5000" step="1" id="ss-width"></label>'+
       '<label>'+esc(L.canvasHeight)+' (300–5000)<input type="number" min="300" max="5000" step="1" id="ss-height"></label>'+
       '<p class="ss-note">'+esc(L.outside)+'</p>'+
       '<button type="button" id="ss-apply-size">'+esc(L.apply)+'</button></div>'+
       '<div class="ss-help" id="ss-help" hidden><strong>'+esc(L.shortcutTitle)+'</strong>'+
       '<table><tbody>'+
       [['Delete / Backspace','Usuń / Delete'],['← ↑ → ↓','Przesuń o 5 / Move 5'],['Shift + ← ↑ → ↓','Przesuń o 1 / Move 1'],
        ['Rolka / Wheel','Zoom'],['Spacja + przeciągnij / Drag','Przesuń widok / Pan'],
        ['Środkowy przycisk / Middle drag','Przesuń widok / Pan'],
        ['Ctrl + C / V','Kopiuj / Wklej'],['Ctrl + D','Duplikuj / Duplicate'],['Ctrl + Z','Cofnij / Undo'],['Ctrl + Y / Ctrl + Shift + Z','Ponów / Redo'],
        ['F','Dopasuj / Fit'],['Esc','Odznacz / Deselect'],['?','Pokaż pomoc / Help']].map(row=>
         '<tr><td><kbd>'+esc(row[0])+'</kbd></td><td>'+esc(row[1])+'</td></tr>').join('')+'</tbody></table>'+
       '<p class="ss-note">'+esc(L.shortcutHint)+'</p></div>'+
       '<div class="ss-grid" id="ss-grid"><aside class="ss-library"><h3>'+esc(L.library)+'</h3>'+ 
       '<input id="ss-library-search" class="ss-library-search" type="search" autocomplete="off" placeholder="'+(pickLang(this._config,this._hass)==='en'?'Search devices...':'Szukaj urządzenia...')+'">'+
       '<div id="ss-lib-results" class="ss-lib-results" hidden></div><div id="ss-lib-recent" class="ss-lib-recent" hidden></div><div id="ss-lib-catalog" class="ss-lib-catalog">'+
      HASSStudioEditorLibrary.render({registry,language:pickLang(this._config,this._hass),esc})+
      '</div></aside><div class="ss-splitter" data-split="left" role="separator" aria-label="Resize left panel"></div><main class="ss-canvas"><div id="ss-stage" class="ss-stage"></div>'+
      '</main>'+
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
    let selection=null,drag=null,selectedPartId=null,expandedPartId=null,lastConnectionPointer=null,clipboard=null;
    const dimensions=()=>viewport.dimensions(this._config);
    let {width:sceneW,height:sceneH}=dimensions();
    let camera=viewport.fresh(sceneW,sceneH),spaceHeld=false;
    const canvasHost=root.querySelector('.ss-canvas');
    const undo=[],redo=[];
    const pushHistory=()=>{undo.push(JSON.stringify(this._config.studio_layout||{}));if(undo.length>60)undo.shift();redo.length=0;};
    const historyStep=(from,to)=>{
      if(!from.length)return;
      to.push(JSON.stringify(this._config.studio_layout||{}));
      this._config={...this._config,studio_layout:JSON.parse(from.pop())};
      this._fire();render();
    };
    const get=()=>normalized(this._config);
    const commit=(model,skipHistory=false)=>{
      if(!skipHistory)pushHistory();
      this._config={...this._config,studio_layout:model};
      this._fire();
    };
    const selectedObject=(model)=>{
      if(!selection)return null;
      return selection.type==='node'?model.nodes.find(x=>x.id===selection.id):
        model.connections.find(x=>x.id===selection.id);
    };
    const renderProps=HASSStudioEditorInspector.create({
      editor:this,L,properties,esc,opts,registry,pickLang,get,selectedObject,
      getSelection:()=>selection,getSelectedPartId:()=>selectedPartId,getExpandedPartId:()=>expandedPartId,variantShape
    });
    const applyCamera=()=>{
      const svg=stage.querySelector('svg');if(!svg)return;
      const rect=stage.getBoundingClientRect();
      const b=viewport.box(camera,Math.max(1,rect.width),Math.max(1,rect.height),sceneW,sceneH,1.06);
      svg.setAttribute('viewBox',[b.x,b.y,b.width,b.height].join(' '));
      svg.setAttribute('preserveAspectRatio','none');
      const select=root.getElementById('ss-zoom');
      if(select && [...select.options].some(o=>Number(o.value)===camera.zoom))select.value=String(camera.zoom);
    };
    const fit=()=>{
      ({width:sceneW,height:sceneH}=dimensions());
      camera=viewport.fresh(sceneW,sceneH);
      applyCamera();
    };
    const zoomAt=(factor,event)=>{
      const rect=stage.getBoundingClientRect();
      camera=viewport.zoomAt(camera,factor,event?event.clientX-rect.left:rect.width/2,
        event?event.clientY-rect.top:rect.height/2,Math.max(1,rect.width),Math.max(1,rect.height),sceneW,sceneH,1.06);
      applyCamera();
    };
    const render=()=>{
      ({width:sceneW,height:sceneH}=dimensions());
      stage.innerHTML=canvasSvg(this._config,this._hass,true,selection);
      applyCamera();renderProps();
    };
    if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>applyCamera()).observe(stage);
    const setSelected=(type,id)=>{
      selection={type,id};selectedPartId=type==='node'?get().nodes.find(n=>n.id===id)?.parts?.[0]?.id||null:null;expandedPartId=selectedPartId;render();
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
      for(const connection of model.connections){
        const group=[...svg.querySelectorAll('.ss-connection')].find(el=>el.dataset.id===connection.id);
        if(!group)continue;
        const d=connectionPath(connection.points);
        group.querySelectorAll('path.ss-line,path.ss-connection-hit').forEach(el=>el.setAttribute('d',d));
        group.querySelectorAll('.ss-cap').forEach(el=>{
          const first=el.dataset.cap==='start',pt=first?connection.points[0]:connection.points[connection.points.length-1],
          near=first?connection.points[1]:connection.points[connection.points.length-2];
          el.setAttribute('transform','translate('+pt.x+' '+pt.y+') rotate('+(Math.atan2(pt.y-near.y,pt.x-near.x)*180/Math.PI)+')');
        });
        svg.querySelectorAll('.ss-handle').forEach(el=>{
          if(el.dataset.id!==connection.id)return;
          const p=connection.points[Number(el.dataset.point)];
          if(p){el.setAttribute('cx',p.x);el.setAttribute('cy',p.y);}
        });
        svg.querySelectorAll('.ss-accessory[data-connection="'+connection.id+'"]').forEach((el,i)=>{
          const accessory=connection.accessories[i];
          if(accessory){const p=onConnection(connection,accessory.position);
            el.setAttribute('transform','translate('+p.x+' '+p.y+')');}
        });
      }
    };
    const create=(kind,preset='',position=null)=>{
      const model=get();
      if(kind==='connection'){
        if(model.connections.length>=MAX_CONNECTIONS)return;
        const n=model.connections.length;
        const hydraulic=preset==='hydraulic';
        if(!hydraulic&&preset!=='electric')return;
        const connection={id:freshId('c'),type:preset,label:'',
          points:position?[{x:position.x-80,y:position.y},{x:position.x+80,y:position.y}]:[{x:180+n*10,y:120+n*12},{x:470+n*10,y:120+n*12}],
          style:{color:hydraulic?'hot':'electric',width:hydraulic?7:5,cap_start:hydraulic,cap_end:hydraulic},
          animation:{flow_mode:hydraulic?'auto':'off',flow_entity:'',flow_direction:'forward',flow_speed:1,...HASSStudioPowerFlow.defaults()},
          accessories:[]};
        model.connections.push(connection);selection={type:'connection',id:connection.id};
      }else{
        if(model.nodes.length>=MAX_NODES)return;
        const n=model.nodes.length;
        const node={id:freshId('n'),type:kind,x:position?position.x:80+(n%6)*170,y:position?position.y:100+Math.floor(n/6)*170,
          scale:1,readout_scale:1,visual:'warmwasser',variant:registry.isVariant(kind,preset)?preset:registry.defaultVariant(kind),label:'',entity:'',burner_entity:'',burner_mode:'auto',solid_fuel:'wood',pellet_level_entity:'',pellet_level_manual:false,pellet_level_test:80,pellet_alarm_pct:20,pellet_test_mode:false,pellet_manual_state:'burning',pellet_manual_temperature:65,pellet_manual_power_unit:'%',pellet_manual_power:65,pellet_manual_feeder:false,pellet_manual_alarm:false,pellet_burner_power_entity:'',pellet_feeder_entity:'',pellet_alarm_entity:'',solid_state:'auto',solid_glow:78,hp_power_entity:'',hp_fan_entity:'',hp_max_rpm:1800,hp_glow:65,hp_test_mode:false,hp_manual_kw:0,hp_manual_fan:0,gas_draw_entity:'',gas_glow:62,electric_power_entity:'',electric_load_entity:'',electric_max_kw:8,electric_glow:60,equipment_mode:'live',equipment_test_running:false,equipment_test_speed:1,equipment_test_position:0,pump_entity:'',tank_entity:'',solar_on_delta:6,solar_off_delta:3,burner_on_temp:35,burner_off_temp:32,power_grid:kind==='power_grid'?HASSStudioPowerGrid.defaults():undefined,radiator:kind==='radiator'?HASSStudioRadiator.defaults():undefined,manifold:kind==='manifold'?HASSStudioManifold.defaults():undefined,energy_storage:kind==='energy_storage'?HASSStudioEnergyStorage.defaults():undefined,inverter:kind==='inverter'?HASSStudioInverter.defaults():undefined,ev_charger:kind==='ev_charger'?HASSStudioEVCharger.defaults():undefined,building:kind==='building'?HASSStudioBuilding.defaults():undefined,entities:[],parts:[]};
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
      camera={...camera,zoom:Number(event.target.value)||1,autoFit:false};applyCamera();
    });
    root.getElementById('ss-fit').addEventListener('click',fit);
    root.getElementById('ss-all').addEventListener('click',()=>{
      const model=get(),bounds=[{x:0,y:0},{x:sceneW,y:sceneH}];
      model.nodes.forEach(n=>{bounds.push({x:n.x-60*n.scale,y:n.y-110*n.scale},{x:n.x+220*n.scale,y:n.y+350*n.scale});});
      model.connections.forEach(connection=>bounds.push(...connection.points));
      const minX=Math.min(...bounds.map(x=>x.x)),maxX=Math.max(...bounds.map(x=>x.x));
      const minY=Math.min(...bounds.map(x=>x.y)),maxY=Math.max(...bounds.map(x=>x.y));
      const rect=stage.getBoundingClientRect(),scale=Math.min(rect.width/(maxX-minX+40),rect.height/(maxY-minY+40));
      camera={cx:(maxX+minX)/2,cy:(maxY+minY)/2,zoom:Math.max(.2,Math.min(8,scale/Math.min(rect.width/sceneW,rect.height/sceneH))),autoFit:false};
      applyCamera();
    });
    root.getElementById('ss-undo').addEventListener('click',()=>historyStep(undo,redo));
    root.getElementById('ss-redo').addEventListener('click',()=>historyStep(redo,undo));
    const settings=root.getElementById('ss-settings'),help=root.getElementById('ss-help');
    root.getElementById('ss-size').addEventListener('click',()=>{
      settings.hidden=!settings.hidden;help.hidden=true;
      root.getElementById('ss-width').value=String(dimensions().width);
      root.getElementById('ss-height').value=String(dimensions().height);
      root.getElementById('ss-scheme-name').value=get().name;
    });
    root.getElementById('ss-shortcuts').addEventListener('click',()=>{
      help.hidden=!help.hidden;settings.hidden=true;
      root.getElementById('ss-shortcuts').setAttribute('aria-expanded',String(!help.hidden));
    });
    root.getElementById('ss-apply-size').addEventListener('click',()=>{
      const width=Number(root.getElementById('ss-width').value),height=Number(root.getElementById('ss-height').value);
      if(!Number.isInteger(width)||!Number.isInteger(height)||width<300||height<300||width>5000||height>5000)return;
      const model=get();model.width=width;model.height=height;
      model.name=root.getElementById('ss-scheme-name').value.trim().slice(0,64);
      commit(model);settings.hidden=true;fit();render();
    });
    const deleteSelection=()=>{
      if(!selection)return;
      const model=get();
      if(selection.type==='node')model.nodes=model.nodes.filter(n=>n.id!==selection.id);
      else model.connections=model.connections.filter(n=>n.id!==selection.id);
      commit(model);selection=null;selectedPartId=null;expandedPartId=null;render();
    };
    root.getElementById('ss-delete').addEventListener('click',deleteSelection);
    stage.addEventListener('wheel',event=>{event.preventDefault();zoomAt(event.deltaY<0?1.12:1/1.12,event);},{passive:false});
    modal.addEventListener('keydown',event=>{
      const tag=event.target?.tagName?.toLowerCase();
      if(['input','textarea','select'].includes(tag)||event.target?.isContentEditable)return;
      if(event.key===' '){spaceHeld=true;event.preventDefault();return;}
      if((event.ctrlKey||event.metaKey)&&['c','v','d'].includes(event.key.toLowerCase())){event.preventDefault();const k=event.key.toLowerCase();if(k==='c')copySelection();else if(k==='v')pasteSelection(clipboard);else duplicateSelection();return;}
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){
        event.preventDefault();historyStep(event.shiftKey?redo:undo,event.shiftKey?undo:redo);return;
      }
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='y'){event.preventDefault();historyStep(redo,undo);return;}
      if(['Delete','Backspace'].includes(event.key)){event.preventDefault();deleteSelection();return;}
      if(event.key.toLowerCase()==='f'&&!event.ctrlKey){event.preventDefault();fit();return;}
      if(event.key==='Escape'){
        if(!help.hidden||!settings.hidden){help.hidden=true;settings.hidden=true;event.preventDefault();event.stopPropagation();return;}
        event.preventDefault();event.stopPropagation();
        selection=null;selectedPartId=null;expandedPartId=null;render();return;
      }
      const arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
      if(arrows[event.key]&&selection){
        event.preventDefault();const delta=event.shiftKey?1:5,v=arrows[event.key],model=get(),obj=selectedObject(model);
        if(!obj)return;
        if(selection.type==='node'){obj.x+=v[0]*delta;obj.y+=v[1]*delta;}
        else obj.points.forEach(q=>{q.x+=v[0]*delta;q.y+=v[1]*delta;});
        commit(model);render();
      }
    });
    modal.addEventListener('keyup',event=>{if(event.key===' ')spaceHeld=false;});
    window.addEventListener('blur',()=>{spaceHeld=false;});
    const library=root.querySelector('.ss-library'),search=root.getElementById('ss-library-search'),results=root.getElementById('ss-lib-results'),recent=root.getElementById('ss-lib-recent'),catalog=root.getElementById('ss-lib-catalog');
    const lang=pickLang(this._config,this._hass),entries=registry.libraryEntries(lang);
    const makeButton=item=>'<button type="button" class="ss-lib-item" draggable="true" data-lib-type="'+esc(item.type)+'" data-lib-variant="'+esc(item.variant)+'"><ha-icon class="ss-lib-icon" icon="'+esc(item.icon)+'"></ha-icon><span class="ss-lib-label">'+esc(item.label)+'</span></button>';
    const refreshLibrary=()=>{
      const q=search.value.trim();catalog.hidden=!!q;recent.hidden=!!q;results.hidden=!q;
      if(q){const matches=HASSStudioEditorLibrary.filter(registry,lang,q);results.innerHTML='<strong>'+(lang==='en'?'Results':'Wyniki')+' ('+matches.length+')</strong>'+matches.map(makeButton).join('');}
      else{const items=HASSStudioEditorLibrary.readRecent(window.localStorage).map(x=>entries.find(e=>e.type===x.type&&e.variant===x.variant)).filter(Boolean);recent.hidden=!items.length;recent.innerHTML=items.length?'<strong>'+(lang==='en'?'Recently added':'Ostatnio dodawane')+'</strong>'+items.map(makeButton).join(''):'';}
    };
    const addLibrary=(kind,preset,pos)=>{
      if(!entries.some(x=>x.type===kind&&x.variant===preset))return;
      const before=get(),size=before.nodes.length+before.connections.length;create(kind,preset,pos);
      const after=get();if(after.nodes.length+after.connections.length===size)return;
      HASSStudioEditorLibrary.recordRecent(window.localStorage,kind,preset);
      search.value='';catalog.querySelectorAll('details[open]').forEach(x=>{x.open=false;});refreshLibrary();
    };
    const choice=button=>({kind:button.dataset.libType||(button.dataset.addPreset?'boiler':button.dataset.add),preset:button.dataset.libVariant||button.dataset.addPreset||button.dataset.variant||''});
    search.addEventListener('input',refreshLibrary);
    library.addEventListener('click',event=>{const btn=event.target.closest('button[data-lib-type],button[data-add],button[data-add-preset]');if(btn){const x=choice(btn);addLibrary(x.kind,x.preset);}});
    const desktop=()=>!window.matchMedia?.('(pointer: coarse)').matches;
    library.addEventListener('dragstart',event=>{
      const btn=event.target.closest('button[data-lib-type],button[data-add],button[data-add-preset]');
      if(!btn||!desktop()){event.preventDefault();return;}
      const x=choice(btn);if(!entries.some(e=>e.type===x.kind&&e.variant===x.preset)){event.preventDefault();return;}
      event.dataTransfer.setData('application/x-ha-studio-device',JSON.stringify(x));event.dataTransfer.effectAllowed='copy';
    });
    stage.addEventListener('dragover',event=>{if(desktop()&&Array.from(event.dataTransfer.types).includes('application/x-ha-studio-device')){event.preventDefault();event.dataTransfer.dropEffect='copy';}});
    stage.addEventListener('drop',event=>{
      if(!desktop())return;const data=event.dataTransfer.getData('application/x-ha-studio-device');if(!data)return;
      event.preventDefault();try{const x=JSON.parse(data),rect=stage.getBoundingClientRect();
        const pos=viewport.worldAt(camera,event.clientX-rect.left,event.clientY-rect.top,Math.max(1,rect.width),Math.max(1,rect.height),sceneW,sceneH,1.06);
        addLibrary(x.kind,x.preset,{x:Math.round(pos.x),y:Math.round(pos.y)});
      }catch{}
    });
    library.querySelectorAll('button[data-add],button[data-add-preset]').forEach(btn=>btn.setAttribute('draggable','true'));
    refreshLibrary();
    const copySelection=()=>{const obj=selectedObject(get());if(obj&&selection)clipboard={type:selection.type,value:JSON.parse(JSON.stringify(obj))};};
    const pasteSelection=source=>{
      if(!source)return;const model=get(),node=source.type==='node';
      if(node?model.nodes.length>=MAX_NODES:model.connections.length>=MAX_CONNECTIONS)return;
      const obj=JSON.parse(JSON.stringify(source.value));
      const renew=x=>{if(!x||typeof x!=='object')return;if(Array.isArray(x)){x.forEach(renew);return;}
        if(typeof x.id==='string')x.id=freshId(node?'n':'c');Object.values(x).forEach(renew);};
      renew(obj);
      if(node){obj.x+=25;obj.y+=25;model.nodes.push(obj);}
      else{obj.points.forEach(p=>{p.x+=25;p.y+=25;});model.connections.push(obj);}
      commit(model);selection={type:source.type,id:obj.id};selectedPartId=null;expandedPartId=null;render();
    };
    const duplicateSelection=()=>{if(!selection||!selectedObject(get()))return;copySelection();pasteSelection(clipboard);};
    root.getElementById('ss-duplicate').addEventListener('click',duplicateSelection);
    properties.addEventListener('change',event=>{
      const el=event.target,key=el.dataset.field;
      if(!key||!selection)return;
      const model=get(),obj=selectedObject(model);if(!obj)return;
      const index=Number(el.dataset.index);
      const val=el.value;
      if(selection.type==='connection'&&key.startsWith('style_')){
        const attr=key.slice(6),s=obj.style;
        if(attr==='width')s.width=clamp(val,2,14,s.width);
        else if(attr==='color'&&obj.type==='hydraulic')s.color=colors[val]?val:s.color;
        else if(['cap_start','cap_end'].includes(attr)&&obj.type==='hydraulic')s[attr]=val==='true';
      }else if(selection.type==='connection'&&key.startsWith('anim_')){
        const attr=key.slice(5),a=obj.animation;
        if(attr==='flow_mode'&&obj.type==='hydraulic')a.flow_mode=['on','off','auto'].includes(val)?val:'auto';
        else if(attr==='flow_entity'&&obj.type==='hydraulic')a.flow_entity=validEntity(val)?val:'';
        else if(attr==='flow_direction')a.flow_direction=val==='reverse'?'reverse':'forward';
        else if(attr==='flow_speed')a.flow_speed=clamp(val,.35,5,a.flow_speed);
        else if(obj.type==='electric'){
          if(attr==='flow_power_mode')a.flow_power_mode=['off','ha','manual'].includes(val)?val:'off';
          else if(attr==='flow_power_entity')a.flow_power_entity=validEntity(val)?val:'';
          else if(attr==='flow_pattern')a.flow_pattern=['dots','dashes','arrows'].includes(val)?val:'dots';
          else if(attr==='flow_power_direction')a.flow_power_direction=val==='true';
          else if(['flow_power_kw','flow_max_kw','flow_min_width','flow_max_width'].includes(attr)){
            const range={flow_power_kw:[-10000,10000],flow_max_kw:[.1,10000],
              flow_min_width:[.5,12],flow_max_width:[.5,16]}[attr];
            a[attr]=clamp(val,range[0],range[1],a[attr]);
          }
        }
      }else if(key==='readout_scale')obj.readout_scale=clamp(val,40,150,100)/100;
      else if(obj.type==='building'&&key.startsWith('building_')){
        const c=obj.building=obj.building||HASSStudioBuilding.defaults(),k=key.slice(9);
        if(k==='mode')c.mode=val==='manual'?'manual':'live';
        else if(k==='measurement')c.measurement=val==='aggregate'?'aggregate':'individual';
        else if(['power_entity','daily_entity'].includes(k))c[k]=validEntity(val)?val:'';
        else if(['show_readout','window_glow'].includes(k))c[k]=val==='true';
        else if(k==='readout_scale')c[k]=clamp(val,40,150,100)/100;
        else if(k==='power_kw')c[k]=clamp(val,0,10000,0);
        else if(k==='daily_kwh')c[k]=clamp(val,0,1000000,0);
      }else if(obj.type==='ev_charger'&&key.startsWith('ev_')){
        const e=obj.ev_charger=obj.ev_charger||HASSStudioEVCharger.defaults(),k=key.slice(3);
        if(k.startsWith('entity_')){
          const name=k.slice(7);if(HASSStudioEVCharger.keys.includes(name)){
            e.entities=e.entities||{};e.entities[name]=validEntity(val)?val:'';
          }
        }else if(k.startsWith('manual_')){
          const name=k.slice(7);e.manual=e.manual||{};
          if(name==='status')e.manual.status=['charging','ready','disconnected','fault'].includes(val)?val:'ready';
          else if(name==='alarm')e.manual.alarm=val==='true';
          else if(name==='power')e.manual.power=clamp(val,-500,500,0);
          else if(name==='session_energy')e.manual.session_energy=clamp(val,0,100000,0);
        }else if(k==='mode')e.mode=val==='manual'?'manual':'live';
        else if(k==='phases')e.phases=val==='1'?1:3;
        else if(k==='power_threshold_w')e.power_threshold_w=clamp(val,0,1000,30);
        else if(k==='display_scale'||k==='extra_scale')e[k]=clamp(val,40,150,100)/100;
        else if(k==='extra_position')e.extra_position=val==='left'?'left':'right';
        else if(['charging_positive','animate','show_extra'].includes(k))e[k]=val==='true';
      }else if(obj.type==='inverter'&&key.startsWith('inv_')){
        const c=obj.inverter=obj.inverter||HASSStudioInverter.defaults(),k=key.slice(4);
        if(k.startsWith('entity_')){
          const f=k.slice(7);
          if(['ac_power','temperature','status','alarm'].includes(f)){
            c.entities=c.entities||{};c.entities[f]=validEntity(val)?val:'';
          }
        }else if(k.startsWith('manual_')){
          const f=k.slice(7);c.manual=c.manual||{};
          if(f==='ac_power')c.manual[f]=clamp(val,-500,500,0);
          if(f==='temperature')c.manual[f]=clamp(val,-40,150,25);
        }else if(k.startsWith('pv_')){
          const match=/^pv_(\d+)_(name|visible|entity_(?:voltage|current|power)|manual_(?:voltage|current|power))$/.exec(k);
          if(match&&Number(match[1])<12){
            const i=Number(match[1]);
            c.inputs=c.inputs||[];
            if(!c.inputs[i])c.inputs[i]=HASSStudioInverter.defaultInput(i);
            const q=c.inputs[i],fieldName=match[2];
            if(fieldName==='name')q.name=val.slice(0,12);
            else if(fieldName==='visible')q.visible=val==='true';
            else if(fieldName.startsWith('entity_')){q.entities=q.entities||{};q.entities[fieldName.slice(7)]=validEntity(val)?val:'';}
            else if(fieldName.startsWith('manual_')){
              q.manual=q.manual||{};
              q.manual[fieldName.slice(7)]=val===''?null:clamp(val,0,50000,0);
            }
          }
        }else if(k.startsWith('row_')){
          const match=/^row_(\d+)_(key|label|input|entity|unit|decimals|manual_value)$/.exec(k);
          if(match){
            const i=Number(match[1]),field=match[2],rows=c.panel_rows=c.panel_rows||HASSStudioInverter.normalize(obj).panel_rows;
            if(i>=0&&i<rows.length){
              const row=rows[i];
              if(field==='key')row.key=HASSStudioInverter.DEFAULT_KEYS.includes(val)?val:'custom';
              else if(field==='label')row.label=val.slice(0,42);
              else if(field==='entity')row.entity=validEntity(val)?val:'';
              else if(field==='unit')row.unit=['auto','W','kW','Wh','kWh','MWh','V','A','°C','%','Hz'].includes(val)?val:'auto';
              else if(field==='input')row.input=clamp(val,0,11,0);
              else if(field==='decimals')row.decimals=clamp(val,0,3,1);
              else if(field==='manual_value')row.manual_value=val.slice(0,60);
            }
          }
        }else if(k==='panel_title')c.panel_title=val.slice(0,46);
        else if(k==='mode')c.mode=val==='manual'?'manual':'live';
        else if(k==='count')c.count=clamp(val,1,12,2);
        else if(k==='display_scale'||k==='extra_scale')c[k]=clamp(val,40,150,100)/100;
        else if(k==='extra_position')c.extra_position=val==='left'?'left':'right';
        else if(k==='rated_kw')c.rated_kw=clamp(val,.1,500,10);
        else if(k==='production_threshold_w')c.production_threshold_w=clamp(val,0,1000,10);
        else if(['positive_power','show_extra'].includes(k))c[k]=val==='true';
      }else if(obj.type==='energy_storage'&&key.startsWith('storage_')){
        const c=obj.energy_storage=obj.energy_storage||HASSStudioEnergyStorage.defaults();
        const k=key.slice(8);
        if(k.startsWith('entity_')){
          const name=k.slice(7);
          if(HASSStudioEnergyStorage.FIELDS.includes(name)){
            c.entities=c.entities||{};c.entities[name]=validEntity(val)?val:'';
          }
        }else if(k.startsWith('manual_')){
          const name=k.slice(7);c.manual=c.manual||{};
          if(name==='soc')c.manual.soc=clamp(val,0,100,75);
          if(name==='power')c.manual.power=clamp(val,-500,500,1.5);
        }else if(k==='display_scale')c.display_scale=clamp(val,40,150,100)/100;
        else if(k==='mode')c.mode=val==='manual'?'manual':'live';
        else if(['show_screen','animate_charge','charge_positive','custom_alarm','show_alarm',
          'show_warning','temp_low_enabled','temp_high_enabled','cell_low_enabled',
          'cell_high_enabled','delta_enabled','offline_alarm'].includes(k))c[k]=val==='true';
        else if(['min_soc','alarm_soc'].includes(k))c[k]=clamp(val,0,100,20);
        else if(k==='warning_margin')c[k]=clamp(val,0,30,5);
        else if(['temp_low','temp_high','cell_low','cell_high','delta_max'].includes(k))
          c[k]=clamp(val,k==='temp_low'?-50:0,k==='temp_high'?150:k==='temp_low'?100:k==='delta_max'?1000:k.startsWith('cell')?5:100,c[k]);
      }else if(['pump','valve'].includes(obj.type)&&key.startsWith('eq_')){
        const field=key.slice(3);
        if(field==='mode')obj.equipment_mode=val==='manual'?'manual':'live';
        else if(field==='test_running')obj.equipment_test_running=val==='true';
        else if(field==='test_speed')obj.equipment_test_speed=clamp(val,.35,5,1);
        else if(field==='test_position')obj.equipment_test_position=clamp(val,0,100,0);
      }else if(obj.type==='radiator'&&key.startsWith('rad_')){
        const c=obj.radiator=obj.radiator||HASSStudioRadiator.defaults();
        const k=key.slice(4);
        if(k==='display_scale')c.display_scale=clamp(val,40,150,100)/100;
        else if(k==='display')c.display=val==='true';
         else if(k==='mirror_horizontal')c.mirror_horizontal=val==='true';
        else if(k==='mode')c.mode=val==='manual'?'manual':'live';
        else if(['temperature_entity','valve_entity'].includes(k))c[k]=validEntity(val)?val:'';
        else if(k==='manual_temperature')c[k]=clamp(val,-40,150,55);
        else if(k==='manual_open')c[k]=clamp(val,0,100,42);
      }else if(obj.type==='manifold'&&key.startsWith('mf_')){
        const c=obj.manifold=obj.manifold||HASSStudioManifold.defaults();
        const k=key.slice(3);
        if(k==='count')c.count=clamp(val,1,40,5);
        else if(k==='pitch')c.pitch=clamp(val,165,400,260);
        else if(k==='display_scale')c.display_scale=clamp(val,40,150,100)/100;
        else if(k==='actuatorMode')c.actuatorMode=val==='common'?'common':'individual';
        else if(k==='mode')c.mode=val==='manual'?'manual':'live';
        else if(k.startsWith('c_')){
          const hit=/^c_(\d+)_(display|actuator|display_scale|entity_(?:tempOut|tempReturn|flow|open)|manual_(?:tempOut|tempReturn|flow|open))$/.exec(k);
          if(hit){
            const index=Number(hit[1]);
            if(index<40){
              c.circuits=c.circuits||[];
              if(!c.circuits[index])c.circuits[index]=HASSStudioManifold.defaultCircuit(index);
              const item=c.circuits[index],name=hit[2];
              if(name==='display'||name==='actuator')item[name]=val==='true';
              else if(name==='display_scale')item.display_scale=clamp(val,40,150,100)/100;
              else if(name.startsWith('entity_')){item.entities=item.entities||{};item.entities[name.slice(7)]=validEntity(val)?val:'';}
              else if(name.startsWith('manual_'))item[name.slice(7)]=clamp(val,-40,150,0);
            }
          }
        }
      }else if(obj.type==='power_grid'&&key.startsWith('grid_')){
        obj.power_grid=obj.power_grid||HASSStudioPowerGrid.defaults();
        const g=obj.power_grid,k=key.slice(5);
        if(k.startsWith('entity_')){
          const name=k.slice(7);
          if([...HASSStudioPowerGrid.FIELDS,'grid_status','voltage_alarm','phase_loss'].includes(name)){
            g.entities=g.entities||{};g.entities[name]=validEntity(val)?val:'';
          }
        }else if(k.startsWith('manual_')){
          const name=k.slice(7);
          if([...HASSStudioPowerGrid.FIELDS,'grid_status','voltage_alarm','phase_loss'].includes(name)){
            g.manual=g.manual||{};g.manual[name]=clamp(val,-10000,10000,0);
          }
        }else if(k.startsWith('extra_')){
          const name=k.slice(6);
          g.show_extras=HASSStudioPowerGrid.EXTRAS.filter(x=>x===name
             ?val==='true':(g.show_extras||[]).includes(x));
        }else if(['show_panel','show_v','show_a','show_l1','show_l2','show_l3'].includes(k))g[k]=val==='true';
        else if(k==='mode')g.mode=val==='manual'?'manual':'live';
        else if(k==='panel_scale')g.panel_scale=clamp(val,40,150,70)/100;
        else if(k==='theme')g.theme=['auto','light','dark'].includes(val)?val:'auto';
        else if(k==='panel_position')g.panel_position=['right','left','bottom'].includes(val)?val:'right';
        else if(['panel_x','panel_y'].includes(k))g[k]=clamp(val,-250,250,0);
        else if(k==='min_voltage')g.min_voltage=clamp(val,0,350,207);
        else if(k==='max_voltage')g.max_voltage=clamp(val,0,400,253);
      }else if(key==='aspect_locked'&&obj.type==='tank'&&obj.variant==='modular'){
        obj.aspect_locked=val==='true';
      }else if(['width_scale','height_scale'].includes(key)&&obj.type==='tank'&&obj.variant==='modular'){
        const previous=obj[key];
        const next=clamp(val,.5,2.4,previous);
        if(obj.aspect_locked){
          const other=key==='width_scale'?'height_scale':'width_scale';
          const ratio=previous>0?next/previous:1;
          const companion=obj[other]*ratio;
          if(companion>=.5&&companion<=2.4)obj[other]=companion;
          else {obj.aspect_locked=false;}
        }
        obj[key]=next;
        obj.scale_mode='free';
      }else if(['width_scale','height_scale'].includes(key)&&obj.type==='boiler'&&['solid_fuel','pellet_modern','heatpump_modern','gas_modern','electric_modern','fireplace_modern'].includes(obj.variant)){
        // Independent from the proportional whole-node scale.
        obj[key]=clamp(val,.5,2.4,obj[key]);
      }else if(['flow_power_kw','flow_max_kw','flow_min_width','flow_max_width'].includes(key)){
        const ranges={flow_power_kw:[-10000,10000],flow_max_kw:[.1,10000],flow_min_width:[.5,12],flow_max_width:[.5,16]};
        obj[key]=clamp(val,ranges[key][0],ranges[key][1],HASSStudioPowerFlow.defaults()[key]);
      }else if(['x','y','scale','width','solid_glow','gas_glow','electric_glow','electric_max_kw','hp_glow','hp_max_rpm','hp_manual_kw','hp_manual_fan','pellet_level_test','pellet_alarm_pct','pellet_manual_temperature','pellet_manual_power','flow_speed','burner_on_temp','burner_off_temp','solar_on_delta','solar_off_delta'].includes(key)){
        const min={scale:0.5,width_scale:0.5,height_scale:0.5,width:3,solid_glow:0,gas_glow:0,electric_glow:0,electric_max_kw:0.1,hp_glow:0,hp_max_rpm:100,hp_manual_kw:0,hp_manual_fan:0,pellet_level_test:0,pellet_alarm_pct:0,pellet_manual_temperature:-40,pellet_manual_power:0,flow_speed:0.35,burner_on_temp:20,burner_off_temp:10,solar_on_delta:1,solar_off_delta:0};
        const max={scale:2.4,width_scale:2.4,height_scale:2.4,width:14,solid_glow:100,gas_glow:100,electric_glow:100,electric_max_kw:100,hp_glow:100,hp_max_rpm:20000,hp_manual_kw:500,hp_manual_fan:100,pellet_level_test:100,pellet_alarm_pct:100,pellet_manual_temperature:150,pellet_manual_power:obj.pellet_manual_power_unit==='kW'?500:100,flow_speed:5,burner_on_temp:90,burner_off_temp:89,solar_on_delta:40,solar_off_delta:39,x:W,y:H};
        obj[key]=clamp(val,min[key]??0,max[key],obj[key]);
      }else if(['label','variant','color','entity','visual','flow_mode','flow_direction','flow_entity','pellet_level_entity','pellet_level_manual','pellet_test_mode','pellet_manual_state','pellet_manual_power_unit','pellet_manual_feeder','pellet_manual_alarm','pellet_burner_power_entity','pellet_feeder_entity','pellet_alarm_entity','burner_entity','gas_draw_entity','electric_power_entity','electric_load_entity','hp_power_entity','hp_fan_entity','hp_test_mode','burner_mode','solid_fuel','solid_state','pump_entity','tank_entity','cap_start','cap_end','flow_power_mode','flow_pattern','flow_power_direction','flow_power_entity'].includes(key)){
        if(['entity','flow_entity','pellet_level_entity','pellet_burner_power_entity','pellet_feeder_entity','pellet_alarm_entity','burner_entity','gas_draw_entity','electric_power_entity','electric_load_entity','hp_power_entity','hp_fan_entity','pump_entity','tank_entity'].includes(key))obj[key]=validEntity(val)?val:'';
        else if(key==='pellet_level_manual')obj.pellet_level_manual=val==='true';
        else if(['pellet_test_mode','pellet_manual_feeder','pellet_manual_alarm'].includes(key))obj[key]=val==='true';
        else if(key==='pellet_manual_state')obj.pellet_manual_state=['off','ignition','burning','embers'].includes(val)?val:'burning';
        else if(key==='pellet_manual_power_unit'){obj.pellet_manual_power_unit=val==='kW'?'kW':'%';obj.pellet_manual_power=Math.min(obj.pellet_manual_power,obj.pellet_manual_power_unit==='%'?100:500);}
        else if(key==='hp_test_mode')obj.hp_test_mode=val==='true';
        else if(key==='burner_mode')obj.burner_mode=['auto','on','off'].includes(val)?val:'auto';
        else if(key==='solid_fuel')obj.solid_fuel=val==='coal'?'coal':'wood';
        else if(key==='solid_state')obj.solid_state=['auto','burning','embers','off'].includes(val)?val:'auto';
        else if(key==='cap_start'||key==='cap_end')obj[key]=val==='true';
        else if(key==='visual')obj.visual=val==='studio'?'studio':'warmwasser';
        else if(key==='flow_power_mode')obj.flow_power_mode=['off','ha','manual'].includes(val)?val:'off';
        else if(key==='flow_pattern')obj.flow_pattern=['dots','dashes','arrows'].includes(val)?val:'dots';
        else if(key==='flow_power_direction')obj.flow_power_direction=val==='true';
        else if(key==='flow_power_entity')obj.flow_power_entity=validEntity(val)?val:'';
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
      }else if(key==='accessoryMode'&&obj.accessories[index])
        obj.accessories[index].mode=val==='manual'?'manual':'live';
      else if(key==='accessoryRunning'&&obj.accessories[index])
        obj.accessories[index].test_running=val==='true';
      else if(key==='accessorySpeed'&&obj.accessories[index])
        obj.accessories[index].test_speed=clamp(val,.35,5,1);
      else if(key==='accessoryPosition'&&obj.accessories[index])
        obj.accessories[index].test_position=clamp(val,0,100,0);
      else if(key==='accessoryPos'&&obj.accessories[index])
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
      if(button.dataset.action==='reset-tank-aspect' && obj.type==='tank'&&obj.variant==='modular'){
        obj.width_scale=1;obj.height_scale=1;obj.scale_mode='free';obj.aspect_locked=true;
        commit(model);render();return;
      }
      if(button.hasAttribute('data-select-part')){
        if(obj.parts?.some(part=>part.id===button.dataset.selectPart)){
          selectedPartId=button.dataset.selectPart;
          expandedPartId=expandedPartId===selectedPartId?null:selectedPartId;renderProps();
        }
        return;
      }
      if(obj.type==='inverter'&&
        (button.hasAttribute('data-inv-row-add')||button.hasAttribute('data-inv-row-delete')||
         button.hasAttribute('data-inv-row-up')||button.hasAttribute('data-inv-row-down'))){
        const c=obj.inverter=obj.inverter||HASSStudioInverter.defaults();
        const rows=c.panel_rows=c.panel_rows||HASSStudioInverter.normalize(obj).panel_rows;
        if(button.hasAttribute('data-inv-row-add')){
          if(rows.length>=HASSStudioInverter.MAX_ROWS)return;
          rows.push(HASSStudioInverter.defaultRow());
        }else{
          const key=button.hasAttribute('data-inv-row-delete')?'invRowDelete':
            button.hasAttribute('data-inv-row-up')?'invRowUp':'invRowDown';
          const i=Number(button.dataset[key]);
          if(!Number.isInteger(i)||i<0||i>=rows.length)return;
          if(key==='invRowDelete')rows.splice(i,1);
          else{const j=i+(key==='invRowUp'?-1:1);if(j<0||j>=rows.length)return;
            [rows[i],rows[j]]=[rows[j],rows[i]];}
        }
        commit(model);render();return;
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
        if(removed?.id===selectedPartId){selectedPartId=obj.parts[Math.min(index,obj.parts.length-1)]?.id||null;expandedPartId=selectedPartId;}
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
        obj.parts.push(newPart);selectedPartId=newPart.id;expandedPartId=newPart.id;
      }else if(button.dataset.addAccessory){
        if(selection.type!=='connection'||obj.type!=='hydraulic'||obj.accessories.length>=20)return;
        obj.accessories.push({id:freshId('a'),type:button.dataset.addAccessory,label:'',position:50,entity:'',mode:'live',test_running:false,test_speed:1,test_position:0});
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
      lastConnectionPointer=null;
      if((event.button===0||event.button===1)&&(event.button===1||spaceHeld||event.target===stage||event.target.tagName?.toLowerCase()==='svg'||event.target.classList?.contains('ss-project-boundary'))){
        const rect=stage.getBoundingClientRect();
        drag={type:'pan',pointer:event.pointerId,lastX:event.clientX,lastY:event.clientY};
        stage.classList.add('ss-dragging');
        stage.setPointerCapture(event.pointerId);event.preventDefault();return;
      }
      if(event.button!==0)return;
      const hit=event.target.closest?.('.ss-handle');
      if(hit){
        selection={type:'connection',id:hit.dataset.id};selectedPartId=null;expandedPartId=null;
        const obj=get().connections.find(item=>item.id===hit.dataset.id),initial=obj?.points[Number(hit.dataset.point)];
        if(!initial)return;
        drag={type:'point',id:hit.dataset.id,index:Number(hit.dataset.point),pointer:event.pointerId,
          initialX:initial.x,initialY:initial.y,moved:false,previous:JSON.stringify(this._config.studio_layout||{})};
        stage.classList.add('ss-dragging');
      }else{
        const node=event.target.closest?.('.ss-node');
        if(node){
          selection={type:'node',id:node.dataset.id};
          const partHit=event.target.closest?.('[data-part-id]');
          selectedPartId=partHit?.dataset.partId||get().nodes.find(n=>n.id===node.dataset.id)?.parts?.[0]?.id||null;
           expandedPartId=selectedPartId;
          if(partHit){renderProps();return;}
          const model=get(),obj=selectedObject(model),svg=stage.querySelector('svg'),p=point(event,svg);
          if(!obj)return;
          drag={type:'node',id:obj.id,offsetX:p.x-obj.x,offsetY:p.y-obj.y,pointer:event.pointerId,
            initialX:obj.x,initialY:obj.y,moved:false,previous:JSON.stringify(this._config.studio_layout||{})};
          stage.classList.add('ss-dragging');
        }else{
          const connection=event.target.closest?.('.ss-connection');
          if(connection){
            const model=get(),obj=model.connections.find(item=>item.id===connection.dataset.id);
            if(!obj)return;
            const p=point(event,stage.querySelector('svg'));
            selection={type:'connection',id:obj.id};selectedPartId=null;expandedPartId=null;
            drag={type:'connection',id:obj.id,pointer:event.pointerId,startX:p.x,startY:p.y,
              points:obj.points.map(q=>({x:q.x,y:q.y})),moved:false,captured:false,
              previous:JSON.stringify(this._config.studio_layout||{})};
            lastConnectionPointer={id:obj.id,x:event.clientX,y:event.clientY,time:event.timeStamp};
            stage.classList.add('ss-dragging');
            renderProps();return; // Keep selection and allow pointerup/dblclick on the original connection.
          }
          selection=null;selectedPartId=null;expandedPartId=null;render();return;
        }
      }
      stage.querySelector('svg')?.setPointerCapture(event.pointerId);
      renderProps();
    });
    stage.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.pointer)return;
      const svg=stage.querySelector('svg');
      if(drag.type==='pan'){
        const rect=stage.getBoundingClientRect();
        camera=viewport.pan(camera,event.clientX-drag.lastX,event.clientY-drag.lastY,
          Math.max(1,rect.width),Math.max(1,rect.height),sceneW,sceneH,1.06);
        drag.lastX=event.clientX;drag.lastY=event.clientY;applyCamera();return;
      }
      const model=get(),p=point(event,svg);
      if(drag.type==='node'){
        const n=model.nodes.find(item=>item.id===drag.id);if(!n)return;
        const x=clamp(Math.round((p.x-drag.offsetX)/5)*5,-5000,10000,n.x);
        const y=clamp(Math.round((p.y-drag.offsetY)/5)*5,-5000,10000,n.y);
        if(x===n.x&&y===n.y)return;
        n.x=x;n.y=y;drag.moved=x!==drag.initialX||y!==drag.initialY;
      }else if(drag.type==='connection'){
        const connection=model.connections.find(item=>item.id===drag.id);
        if(!connection)return;
        const translated=translateConnectionPoints(drag.points,p.x-drag.startX,p.y-drag.startY);
        if(!translated.some((pt,index)=>pt.x!==connection.points[index]?.x||pt.y!==connection.points[index]?.y))return;
        if(!drag.captured){stage.setPointerCapture(event.pointerId);drag.captured=true;}
        connection.points=translated;
        drag.moved=translated.some((pt,index)=>pt.x!==drag.points[index].x||pt.y!==drag.points[index].y);
      }else{
        const connection=model.connections.find(item=>item.id===drag.id);
        if(!connection||!connection.points[drag.index])return;
        const x=clamp(Math.round(p.x/5)*5,-5000,10000,0);
        const y=clamp(Math.round(p.y/5)*5,-5000,10000,0);
        if(x===connection.points[drag.index].x&&y===connection.points[drag.index].y)return;
        connection.points[drag.index]={x,y};drag.moved=x!==drag.initialX||y!==drag.initialY;
      }
      this._config={...this._config,studio_layout:model};repaint(model);
    });
    const end=event=>{
      if(!drag||event.pointerId!==drag.pointer)return;
      const moved=drag.type!=='pan'&&drag.moved,previous=drag.previous;
      stage.classList.remove('ss-dragging');drag=null;
      if(event.type==='pointercancel'){
        if(previous)this._config={...this._config,studio_layout:JSON.parse(previous)};
        render();return;
      }
      if(moved){
        if(previous){undo.push(previous);if(undo.length>60)undo.shift();redo.length=0;}
        this._fire();
      }
      render();
    };
    stage.addEventListener('pointerup',end);
    stage.addEventListener('pointercancel',end);
    stage.addEventListener('dblclick',event=>{
      const el=event.target.closest?.('.ss-connection');
      const fallback=lastConnectionPointer&&Math.hypot(event.clientX-lastConnectionPointer.x,event.clientY-lastConnectionPointer.y)<10&&event.timeStamp-lastConnectionPointer.time<800
        ?lastConnectionPointer.id:null;
      const connectionId=el?.dataset.id||fallback;if(!connectionId)return;
      const model=get(),connection=model.connections.find(item=>item.id===connectionId);
      if(!connection||connection.points.length>=30)return;
      const p=point(event,stage.querySelector('svg'));
      let index=1,best=Infinity;
      for(let i=1;i<connection.points.length;i++){
        const a=connection.points[i-1],b=connection.points[i];
        const vx=b.x-a.x,vy=b.y-a.y,length=vx*vx+vy*vy;
        const t=length?clamp(((p.x-a.x)*vx+(p.y-a.y)*vy)/length,0,1,0):0;
        const distance=Math.hypot(p.x-(a.x+vx*t),p.y-(a.y+vy*t));
        if(distance<best){best=distance;index=i;}
      }
      connection.points.splice(index,0,{x:clamp(p.x,0,W,p.x),y:clamp(p.y,0,H,p.y)});
      selection={type:'connection',id:connection.id};commit(model);render();
    });
    renderProps();
  };
})();