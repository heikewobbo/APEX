/* APEX — motore del navigatore, uguale per tutti gli stili.
   Dati: ricerca, percorsi (OSRM; Valhalla per evitare le chiusure), tappe, GPS e aggancio alla strada,
   ricalcolo, indicazioni, limiti, autovelox e tutor, luoghi salvati, chiusure, ostacoli, prove salvate,
   statistiche, simulazione. Gli stili ascoltano gli eventi (A.on) e disegnano. */
(function () {
  'use strict';
  const A = window.APEX, P = window.Pacenotes;
  const OSRM = 'https://router.project-osrm.org/route/v1/driving/';
  const VALHALLA = 'https://valhalla1.openstreetmap.de/route';
  const PHOTON = 'https://photon.komoot.io/';
  const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
  const OVERPASS = 'https://overpass-api.de/api/interpreter';
  const PIEMONTE = { s: 44.06, n: 46.47, w: 6.62, e: 9.22 };

  // ---------- impostazioni comuni + quelle di ogni stile ----------
  A.settings = Object.assign({ style: 'rally', muted: false, audioMode: 'continuo', noMotorway: true, cams: true, satellite: false, sim: 80, compass: false, instrVoice: 'auto' }, A.store.get('settings', {}));
  A.saveSettings = () => A.store.set('settings', A.settings);
  A.styles = {}; A.styleOrder = [];
  A.registerStyle = def => { A.styles[def.id] = def; A.styleOrder.push(def.id); };
  A.ss = id => { // impostazioni dello stile
    const def = A.styles[id] || {};
    const k = 'style.' + id;
    if (!A.ss.cache) A.ss.cache = {};
    if (!A.ss.cache[id]) A.ss.cache[id] = Object.assign({}, def.defaults || {}, A.store.get(k, {}));
    return A.ss.cache[id];
  };
  A.saveSS = id => A.store.set('style.' + id, A.ss(id));
  A.setStyle = id => {
    if (!A.styles[id]) id = A.styleOrder[0];
    const old = A.style;
    if (old && old.unmount) try { old.unmount(); } catch (e) { console.error(e); }
    document.body.classList.remove('style-' + (old ? old.id : ''));
    A.style = A.styles[id]; A.settings.style = id; A.saveSettings();
    document.body.classList.add('style-' + id);
    A.voice.setAliases(A.style.aliases || {});
    if (A.style.mount) A.style.mount();
    A.vehicle.redraw();
    if (old) A.reloadMapStyle();
    A.emit('styleChanged', id);
    if (A.cur) A.emit('route', A.cur);
    if (A.drive && A.drive.on) { document.body.classList.add('driving'); A.emit('driveStart', { sim: A.drive.sim, resume: true }); }
  };

  // ---------- ostacoli (segnati a mano), luoghi salvati, chiusure ----------
  A.OBS = {
    autovelox: { label: 'Autovelox', ch: 'V', tokens: ['autovelox'] },
    tutor: { label: 'Tutor', ch: 'TU', tokens: ['tutor'] },
    buca: { label: 'Buca', ch: 'B', tokens: ['buca'] },
    acqua: { label: 'Acqua / scivola', ch: 'A', tokens: ['scivola'] },
    dosso: { label: 'Dosso', ch: 'D', tokens: ['dosso'] },
    ponte: { label: 'Ponte stretto', ch: 'P', tokens: ['ponte'] },
    lavori: { label: 'Lavori', ch: 'L', tokens: ['lavori'] },
    pericolo: { label: 'Pericolo', ch: '!', tokens: ['attento_attento'] }
  };
  A.obstacles = A.store.get('obstacles', []);
  A.saveObstacles = () => { A.store.set('obstacles', A.obstacles); A.emit('obstacles'); if (A.cur) A.emit('route', A.cur); };
  A.places = A.store.get('places', []); // { id, name, letter, color, ll:[lat,lon] }
  A.savePlaces = () => { A.store.set('places', A.places); A.emit('places'); };
  A.blocks = A.store.get('blocks', []); // chiusure { id, ll, t, until }
  A.activeBlocks = () => { const n = Date.now(); A.blocks = A.blocks.filter(b => b.until > n); return A.blocks; };
  A.saveBlocks = () => { A.store.set('blocks', A.blocks); renderBlocks(); A.emit('blocks'); };
  A.addBlock = ll => { A.blocks.push({ id: Date.now().toString(36), ll, t: Date.now(), until: Date.now() + 7 * 864e5 }); A.stats.blocks++; A.saveStats(); A.saveBlocks(); };
  function renderBlocks() { A.setOverlay('blocks', A.fc(A.activeBlocks().map(b => ({ type: 'Feature', properties: { id: b.id }, geometry: { type: 'Point', coordinates: [b.ll[1], b.ll[0]] } })))); }

  // ---------- statistiche ----------
  const STAT0 = { km: 0, sec: 0, maxKmh: 0, trips: 0, missions: 0, stops: 0, cams: 0, blocks: 0, extra: {} };
  A.stats = Object.assign({}, STAT0, A.store.get('stats', {}));
  let statsT = 0;
  A.saveStats = (force) => { if (force || Date.now() - statsT > 15000) { statsT = Date.now(); A.store.set('stats', A.stats); } };
  A.resetStats = () => { A.stats = JSON.parse(JSON.stringify(STAT0)); A.store.set('stats', A.stats); };

  // ---------- GPS e direzione ----------
  const gps = A.gps = { fix: null, heading: null, compass: null, watch: null, where: { street: '', zone: '' } };
  A.startGeo = () => {
    if (!navigator.geolocation || gps.watch != null) return;
    gps.watch = navigator.geolocation.watchPosition(onGeo, () => {}, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
  };
  function onGeo(p) {
    const c = p.coords, t = Date.now(), ll = [c.latitude, c.longitude];
    const sp = c.speed != null && c.speed >= 0 ? c.speed : (gps.fix ? A.distLL(gps.fix.ll, ll) / Math.max(0.5, (t - gps.fix.t) / 1000) : 0);
    let hd = c.heading != null && !isNaN(c.heading) && sp > 1.2 ? c.heading : null;
    if (hd == null && gps.fix && A.distLL(gps.fix.ll, ll) > 6 && sp > 1.2) hd = A.bearingLL(gps.fix.ll, ll);
    if (hd != null) gps.heading = hd;
    // statistiche (solo guida vera)
    if (gps.fix && c.accuracy < 50) { const d = A.distLL(gps.fix.ll, ll); if (d < 300 && sp > 1.5) { A.stats.km += d / 1000; A.stats.sec += Math.min(10, (t - gps.fix.t) / 1000); A.stats.maxKmh = Math.max(A.stats.maxKmh, Math.round(sp * 3.6)); A.saveStats(); } }
    gps.fix = { ll, speed: sp, acc: c.accuracy, t, heading: hd, alt: c.altitude };
    if (drive.on && !drive.sim) drive.onFix(ll[0], ll[1], sp, c.accuracy, t, hd);
    A.emit('gps', gps.fix);
    if (!gps.firstFix) { gps.firstFix = true; A.emit('firstFix', gps.fix); }
    refreshWhere();
  }
  A.startCompass = async () => {
    if (!A.settings.compass || A.startCompass.asked) return;
    A.startCompass.asked = true;
    try { if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function' && await DeviceOrientationEvent.requestPermission() !== 'granted') return; } catch { return; }
    const h = e => {
      let v = e.webkitCompassHeading != null ? e.webkitCompassHeading : (e.absolute && e.alpha != null ? 360 - e.alpha : null);
      if (v == null) return;
      gps.compass = gps.compass == null ? v : (gps.compass + A.angDiff(v, gps.compass) * 0.3 + 360) % 360;
    };
    window.addEventListener('deviceorientationabsolute', h); window.addEventListener('deviceorientation', h);
  };
  A.myPosition = async () => {
    if (gps.fix && Date.now() - gps.fix.t < 20000) return gps.fix.ll;
    const p = await new Promise((res, rej) => { if (!navigator.geolocation) return rej(); navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 }); });
    return [p.coords.latitude, p.coords.longitude];
  };
  // via e zona attuali (per gli stili che li mostrano), al massimo ogni 30 s
  let whereT = 0;
  async function refreshWhere(force) {
    if (!gps.fix || (!force && Date.now() - whereT < 30000)) return;
    whereT = Date.now();
    try {
      const [la, lo] = gps.fix.ll;
      const j = await (await fetch(`${PHOTON}reverse?lat=${la}&lon=${lo}&limit=1`)).json();
      const p = (j.features && j.features[0] && j.features[0].properties) || {};
      gps.where = { street: p.street || p.name || '', zone: p.district && p.city && p.district !== p.city ? p.district : (p.city || p.town || p.village || p.county || '') };
      A.emit('where', gps.where);
    } catch { /* senza rete */ }
  }

  // posizione e direzione da disegnare: in guida agganciata alla strada, altrimenti GPS con un po' di previsione
  A.pose = () => {
    if (drive.on) return drive.pose();
    const f = gps.fix; if (!f) return null;
    const moving = f.speed > 1.5;
    const dt = Math.min(2, (Date.now() - f.t) / 1000);
    const b = moving && gps.heading != null ? gps.heading : (gps.compass != null ? gps.compass : (gps.heading || 0));
    const ll = moving && gps.heading != null ? A.offsetLL(f.ll, gps.heading, f.speed * dt) : f.ll;
    return { ll, bearing: b, speed: f.speed, drive: false };
  };

  // ---------- ricerca ----------
  A.search = async (q, signal) => {
    const c = A.map.getCenter();
    const r = await fetch(`${PHOTON}api/?q=${encodeURIComponent(q)}&limit=7&lat=${c.lat.toFixed(4)}&lon=${c.lng.toFixed(4)}`, { signal });
    const j = await r.json();
    return (j.features || []).map(f => {
      const p = f.properties, [lon, lat] = f.geometry.coordinates;
      const street = p.street ? p.street + (p.housenumber ? ' ' + p.housenumber : '') : '';
      const name = p.name || street || p.city || 'Luogo';
      const sub = [p.name && street ? street : '', p.city || p.town || p.village || p.district, p.county || p.state, p.country !== 'Italia' && p.country !== 'Italy' ? p.country : ''].filter(Boolean).join(', ');
      return { lat, lon, name, sub };
    });
  };
  A.searchWide = async q => {
    const j = await (await fetch(`${NOMINATIM}?format=jsonv2&limit=6&accept-language=it&q=${encodeURIComponent(q)}`)).json();
    return j.map(x => { const parts = x.display_name.split(', '); return { lat: +x.lat, lon: +x.lon, name: parts[0], sub: parts.slice(1, 4).join(', ') }; });
  };
  A.reverseName = async (lat, lon) => {
    try { const j = await (await fetch(`${PHOTON}reverse?lat=${lat}&lon=${lon}&limit=1`)).json(); const p = (j.features && j.features[0] && j.features[0].properties) || {}; return p.name || (p.street ? p.street + (p.housenumber ? ' ' + p.housenumber : '') : '') || p.city || 'Punto sulla mappa'; }
    catch { return 'Punto sulla mappa'; }
  };

  // ---------- pianificazione: partenza, tappe, arrivo ----------
  A.plan = { from: null, to: null, vias: [] }; // luoghi { lat, lon, name, me? }

  // ---------- geometria lungo il percorso ----------
  A.projectOnRoute = function projectOnRoute(lat, lon, route, i0 = 0, i1 = route.pts.length - 1, heading = null) {
    const [x, y] = route.proj.fwd(lon, lat);
    let best = { d: Infinity, s: 0, i: 0 };
    const a = Math.max(0, i0), b = Math.min(route.pts.length - 1, i1);
    for (let i = a; i < b; i++) {
      const p = route.pts[i], q = route.pts[i + 1];
      const dx = q[0] - p[0], dy = q[1] - p[1], L2 = dx * dx + dy * dy || 1e-9;
      // nel verso opposto di marcia non ci si aggancia (tornanti)
      if (heading != null && Math.abs(A.angDiff(A.toDeg(Math.atan2(dx, dy)), heading)) > 75) continue;
      let t = ((x - p[0]) * dx + (y - p[1]) * dy) / L2; t = Math.max(0, Math.min(1, t));
      const px = p[0] + dx * t, py = p[1] + dy * t, d = Math.hypot(x - px, y - py);
      if (d < best.d) best = { d, s: route.s[i] + (route.s[i + 1] - route.s[i]) * t, i };
    }
    if (heading != null && best.d === Infinity) return projectOnRoute(lat, lon, route, i0, i1, null);
    return best;
  };
  A.pointAtS = (route, s) => {
    const S = route.s; let lo = 0, hi = S.length - 1;
    if (s <= 0) return { ll: route.latlon[0], i: 0 };
    if (s >= S[hi]) return { ll: route.latlon[hi], i: hi };
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] <= s) lo = m; else hi = m; }
    const t = (s - S[lo]) / ((S[hi] - S[lo]) || 1), a = route.latlon[lo], b = route.latlon[hi];
    return { ll: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], i: lo };
  };
  A.routeBearing = (route, s) => A.bearingLL(A.pointAtS(route, s - 4).ll, A.pointAtS(route, Math.min(route.length, s + 22)).ll);

  // ---------- percorso ----------
  A.routes = []; A.routeIdx = 0; A.cur = null;
  let osrmNoExclude = false, routeReq = 0;
  const fmtLL = p => `${(+p.lon).toFixed(6)},${(+p.lat).toFixed(6)}`;
  async function osrm(points, heading, alts) {
    const base = `${OSRM}${points.map(fmtLL).join(';')}?overview=full&geometries=geojson&steps=true&alternatives=${alts ? 'true' : 'false'}`;
    const bear = heading != null ? '&bearings=' + [Math.round((heading % 360 + 360) % 360) + ',60', ...Array(points.length - 1).fill('')].join(';') : '';
    const ask = async (useB, useEx) => {
      const u = base + (useB ? bear : '') + (useEx ? '&exclude=motorway' : '');
      try { const r = await fetch(u + '&annotations=maxspeed'); if (r.ok) { const j = await r.json(); if (j.code === 'Ok') return j; } } catch { /* riprova senza */ }
      return (await fetch(u)).json();
    };
    const wantEx = A.settings.noMotorway && !osrmNoExclude;
    let j = await ask(true, wantEx);
    if (wantEx && j.code !== 'Ok' && /exclude|invalid/i.test(`${j.code} ${j.message}`)) { osrmNoExclude = true; j = await ask(true, false); }
    else if (wantEx && j.code === 'Ok' && j.waypoints && j.waypoints[0].distance > 40) j = await ask(true, false); // sei in autostrada
    if (j.code !== 'Ok' && heading != null) j = await ask(false, A.settings.noMotorway && !osrmNoExclude);
    if (j.code !== 'Ok' || !j.routes || !j.routes.length) throw new Error(j.message || 'nessun percorso');
    return j.routes;
  }
  // Valhalla sa evitare punti precisi (le chiusure segnalate)
  async function valhalla(points, heading, blocks) {
    const body = {
      locations: points.map((p, i) => { const o = { lat: +p.lat, lon: +p.lon }; if (i === 0 && heading != null) { o.heading = Math.round(heading); o.heading_tolerance = 60; } return o; }),
      costing: 'auto', costing_options: { auto: { use_highways: A.settings.noMotorway ? 0 : 1 } },
      exclude_locations: blocks.map(b => ({ lat: b.ll[0], lon: b.ll[1] })), format: 'osrm', shape_format: 'geojson',
      directions_options: { units: 'kilometers', language: 'it-IT' }
    };
    const j = await (await fetch(VALHALLA + '?json=' + encodeURIComponent(JSON.stringify(body)))).json();
    if (!j.routes || !j.routes.length) throw new Error(j.error || 'nessun percorso');
    const rt = j.routes[0];
    if (typeof rt.geometry === 'string') rt.geometry = { type: 'LineString', coordinates: decodePoly(rt.geometry, 6) };
    rt.engine = 'valhalla';
    return [rt];
  }
  function decodePoly(str, prec) { const f = Math.pow(10, prec); let i = 0, lat = 0, lon = 0; const out = []; while (i < str.length) { for (const which of [0, 1]) { let b, sh = 0, res = 0; do { b = str.charCodeAt(i++) - 63; res |= (b & 31) << sh; sh += 5; } while (b >= 32); const d = (res & 1) ? ~(res >> 1) : (res >> 1); if (which === 0) lat += d; else lon += d; } out.push([lon / f, lat / f]); } return out; }
  function hitsBlocks(rt, blocks) {
    const c = rt.geometry.coordinates;
    for (const b of blocks) for (let i = 0; i < c.length; i++) if (A.distLL(b.ll, [c[i][1], c[i][0]]) < 30) return true;
    return false;
  }
  // percorso con tappe; evita le chiusure vicine
  async function findRoutes(points, heading, alts) {
    const lats = points.map(p => +p.lat), lons = points.map(p => +p.lon);
    const bb = { s: Math.min(...lats) - 0.06, n: Math.max(...lats) + 0.06, w: Math.min(...lons) - 0.06, e: Math.max(...lons) + 0.06 };
    const near = A.activeBlocks().filter(b => b.ll[0] > bb.s && b.ll[0] < bb.n && b.ll[1] > bb.w && b.ll[1] < bb.e);
    if (!near.length) return { routes: await osrm(points, heading, alts) };
    try { const rs = await osrm(points, heading, true); const clean = rs.filter(r => !hitsBlocks(r, near)); if (clean.length) return { routes: clean, avoided: near.length }; } catch { /* prova Valhalla */ }
    try { return { routes: await valhalla(points, heading, near), avoided: near.length }; }
    catch { const rs = await osrm(points, heading, false); return { routes: rs, blockedWarn: rs.some(r => hitsBlocks(r, near)) }; }
  }

  // opts: { from (luogo), heading, quiet }
  A.computeRoute = async (opts = {}) => {
    const from = opts.from || A.plan.from, to = A.plan.to;
    if (!from || !to) return;
    const my = ++routeReq;
    const vias = A.plan.vias.filter(v => !v.done);
    let heading = opts.heading;
    if (heading == null && !opts.from && from.me && gps.fix && gps.fix.speed > 3 && gps.heading != null) heading = gps.heading;
    if (!opts.quiet) A.toast('Calcolo il percorso…', 0, true);
    try {
      const res = await findRoutes([from, ...vias, to], heading, !drive.on && !vias.length);
      if (my !== routeReq) return;
      A.routes = res.routes; A.routeIdx = 0; A.routeInfo = { avoided: res.avoided || 0, blockedWarn: !!res.blockedWarn };
      A.toastHide();
      A.selectRoute(0, !drive.on);
    } catch (e) {
      A.toast(drive.on ? 'Ricalcolo non riuscito, riprovo…' : !navigator.onLine ? 'Senza connessione: apri una prova salvata' : 'Percorso non trovato o servizio non raggiungibile', 4000);
      throw e;
    }
  };
  A.selectRoute = (i, fit) => {
    A.routeIdx = i;
    const osrmRt = A.routes[i], coords = osrmRt.geometry.coordinates;
    const gen = P.generate(coords, A.style && A.style.genOptions ? A.style.genOptions() : {});
    const cur = A.cur = { osrm: osrmRt, coords, gen, route: gen.route, stage: null, stageName: '', extra: {} };
    buildRouteData(cur);
    A.setOverlay('route', A.lineF(cur.route.latlon));
    A.setOverlay('alts', A.fc(A.routes.map((r, k) => k === i ? null : Object.assign(A.lineF(r.geometry.coordinates.map(c => [c[1], c[0]]), { idx: k }))).filter(Boolean)));
    A.emit('route', cur);
    if (fit) A.cam.fitRoute(cur.route.latlon);
  };
  A.clearRoute = () => {
    if (drive.on) drive.stop();
    A.cur = null; A.routes = [];
    A.setOverlay('route', A.fc([])); A.setOverlay('alts', A.fc([]));
    A.emit('routeCleared');
  };
  // indicazioni, nomi delle vie, limiti, tappe e autovelox lungo il percorso
  function buildRouteData(cur) {
    const route = cur.route, o = cur.osrm;
    if (!cur.man) { const r = buildManeuvers(o, route); cur.man = r.man; cur.names = r.names; cur.viaS = r.viaS; }
    if (cur.limits === undefined) cur.limits = buildLimits(o);
    cur.camsOn = camsOnRoute(route);
    fetchOsmLimits(cur);
  }
  const DIRW = { left: 'a sinistra', right: 'a destra', 'slight left': 'leggermente a sinistra', 'slight right': 'leggermente a destra', 'sharp left': 'tutto a sinistra', 'sharp right': 'tutto a destra', straight: 'dritto' };
  const ORD = ['', 'prima', 'seconda', 'terza', 'quarta', 'quinta', 'sesta', 'settima', 'ottava'];
  const sideW = m => (m || '').includes('left') ? 'sinistra' : 'destra';
  A.instrText = (m, final) => {
    const mod = m.modifier || 'straight', d = DIRW[mod] || '';
    switch (m.type) {
      case 'arrive': return final ? 'arrivo a destinazione' : 'arrivo alla tappa';
      case 'merge': return 'immettiti a ' + sideW(mod);
      case 'on ramp': return 'prendi la rampa' + (mod !== 'straight' && d ? ' ' + d : '');
      case 'off ramp': return "prendi l'uscita a " + sideW(mod);
      case 'fork': return 'al bivio tieni la ' + sideW(mod);
      case 'roundabout': case 'rotary': return m.exit ? `alla rotonda prendi la ${ORD[m.exit] || m.exit + 'ª'} uscita` : 'entra nella rotonda';
      case 'roundabout turn': return 'alla rotonda svolta ' + d;
      case 'end of road': return mod === 'uturn' ? 'fai inversione a U' : 'alla fine della strada svolta a ' + sideW(mod);
      default:
        if (mod === 'uturn') return 'fai inversione a U';
        if (mod === 'straight') return 'prosegui dritto';
        if ((m.type === 'continue' || m.type === 'new name') && mod.startsWith('slight')) return 'tieni la ' + sideW(mod);
        return 'svolta ' + d;
    }
  };
  function buildManeuvers(o, route) {
    const man = [], names = [], viaS = [];
    if (!o.legs) return { man, names, viaS };
    let lastI = 0, legStart = 0;
    const scale = route.length / (o.distance || route.length || 1);
    o.legs.forEach((leg, li) => {
      (leg.steps || []).forEach(st => {
        const m = st.maneuver, t = m.type, mod = m.modifier || 'straight';
        const pr = A.projectOnRoute(m.location[1], m.location[0], route, lastI - 5, lastI + 4000);
        if (pr.d > 60) return;
        lastI = pr.i;
        names.push({ s: pr.s, name: st.name || st.ref || '' });
        if (t === 'depart' || t === 'exit roundabout' || t === 'exit rotary') return;
        if (['new name', 'continue', 'notification', 'use lane'].includes(t) && (!m.modifier || mod === 'straight')) return;
        const final = li === o.legs.length - 1;
        if (t === 'arrive' && !final) viaS.push(pr.s);
        man.push({ s: pr.s, type: t, mod, exit: m.exit || 0, len: st.distance || 0, text: A.instrText(m, final), name: t === 'arrive' ? '' : (st.name || st.ref || ''), final, leg: li });
      });
      legStart += (leg.distance || 0) * scale;
    });
    return { man, names, viaS };
  }
  function buildLimits(o) {
    const ms = []; let ok = true;
    (o.legs || []).forEach(l => { const a = l.annotation && l.annotation.maxspeed; if (a) ms.push(...a); else ok = false; });
    if (!ok || !ms.length) return null;
    const c = o.geometry.coordinates, cum = [0];
    for (let i = 1; i < c.length; i++) cum.push(cum[i - 1] + A.distLL([c[i - 1][1], c[i - 1][0]], [c[i][1], c[i][0]]));
    return { cum, v: ms.map(x => !x || x.unknown || x.none || !x.speed ? 0 : (x.unit === 'mph' ? Math.round(x.speed * 1.609) : x.speed)) };
  }
  // OSRM spesso non ha i limiti (e Valhalla mai): li leggo dalle strade di OpenStreetMap lungo il percorso
  const IMPLICIT = { 'IT:urban': 50, 'IT:rural': 90, 'IT:trunk': 110, 'IT:motorway': 130, 'IT:living_street': 10, 'IT:bicycle_road': 30 };
  function wayLimit(t) {
    const ms = t['maxspeed:forward'] || t.maxspeed || t['maxspeed:backward'] || '';
    let v = parseInt(ms);
    if (!v && IMPLICIT[ms]) v = IMPLICIT[ms];
    if (!v) { const ty = t['maxspeed:type'] || t['source:maxspeed'] || t['zone:maxspeed'] || ''; v = IMPLICIT[ty] || 0; }
    if (v && /mph/.test(ms)) v = Math.round(v * 1.609);
    if (!v) v = { motorway: 130, motorway_link: 80, living_street: 10, residential: 50 }[t.highway] || 0;
    return v > 4 && v < 200 ? v : 0;
  }
  const osmWays = new Map(); // id -> { v, pts: [[lat, lon]...] }
  function simplify(pts, tol) { // Douglas-Peucker in metri (approssimato)
    if (pts.length < 3) return pts;
    const k = Math.cos(pts[0][0] * Math.PI / 180) * 111320, P = p => [p[1] * k, p[0] * 110540];
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    const st = [[0, pts.length - 1]];
    while (st.length) {
      const [a, b] = st.pop(), A0 = P(pts[a]), B0 = P(pts[b]); let md = 0, mi = -1;
      const dx = B0[0] - A0[0], dy = B0[1] - A0[1], L2 = dx * dx + dy * dy || 1;
      for (let i = a + 1; i < b; i++) { const C = P(pts[i]); let t = ((C[0] - A0[0]) * dx + (C[1] - A0[1]) * dy) / L2; t = Math.max(0, Math.min(1, t)); const d = Math.hypot(C[0] - A0[0] - t * dx, C[1] - A0[1] - t * dy); if (d > md) { md = d; mi = i; } }
      if (md > tol) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  }
  function matchLimits(route) {
    // griglia per cercare in fretta i tratti di strada vicini
    const G = new Map(), cell = 0.002, key = (a, b) => Math.floor(a / cell) + ':' + Math.floor(b / cell);
    for (const w of osmWays.values()) for (let i = 1; i < w.pts.length; i++) {
      const a = w.pts[i - 1], b = w.pts[i], k = key((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      if (!G.has(k)) G.set(k, []); G.get(k).push([a, b, w.v]);
    }
    const step = 20, n = Math.max(2, Math.ceil(route.length / step) + 1), cum = [], v = []; let hit = 0;
    for (let i = 0; i < n; i++) {
      const s = Math.min(route.length, i * step), p = A.pointAtS(route, s).ll, hd = A.routeBearing(route, s);
      let best = null, bd = 22;
      const ci = Math.floor(p[0] / cell), cj = Math.floor(p[1] / cell);
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const [a, b, lim] of G.get((ci + di) + ':' + (cj + dj)) || []) {
        const ang = Math.abs(A.angDiff(A.bearingLL(a, b), hd)); if (ang > 35 && ang < 145) continue;
        const k = Math.cos(p[0] * Math.PI / 180) * 111320, ax = (a[1] - p[1]) * k, ay = (a[0] - p[0]) * 110540, bx = (b[1] - p[1]) * k, by = (b[0] - p[0]) * 110540;
        const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1; let t = -(ax * dx + ay * dy) / L2; t = Math.max(0, Math.min(1, t));
        const d = Math.hypot(ax + t * dx, ay + t * dy); if (d < bd) { bd = d; best = lim; }
      }
      if (best !== null) hit++;
      cum.push(s); v.push(best || 0);
    }
    // un buco breve (incrocio, rotonda) prende il limite di prima
    for (let i = 1; i < v.length; i++) if (!v[i] && v[i - 1]) { let j = i; while (j < v.length && !v[j]) j++; if (j - i <= 5) for (let q = i; q < j; q++) v[q] = v[i - 1]; i = j; }
    return { L: { cum, v }, cover: hit / n };
  }
  let limReq = 0;
  async function fetchOsmLimits(cur) {
    if (!cur || cur.limitsOSM) return;
    const my = ++limReq, route = cur.route;
    let m = osmWays.size ? matchLimits(route) : { cover: 0 };
    if (m.cover < 0.85 && navigator.onLine !== false) {
      let tol = 10, pts = simplify(route.latlon, tol);
      while (pts.length > 900) { tol *= 1.6; pts = simplify(route.latlon, tol); }
      const line = pts.map(p => p[0].toFixed(5) + ',' + p[1].toFixed(5)).join(',');
      const q = `[out:json][timeout:30];way["highway"]["highway"!~"^(footway|path|cycleway|steps|pedestrian|track|bridleway|corridor|platform|proposed|construction)$"](around:25,${line});out tags geom;`;
      try {
        const r = await fetch(OVERPASS, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        const j = await r.json();
        for (const e of j.elements || []) if (e.type === 'way' && e.geometry) osmWays.set(e.id, { v: wayLimit(e.tags || {}), pts: e.geometry.map(g => [g.lat, g.lon]) });
        if (osmWays.size > 60000) { const ks = [...osmWays.keys()].slice(0, osmWays.size - 40000); ks.forEach(k => osmWays.delete(k)); }
      } catch { return; }
      if (my !== limReq || A.cur !== cur) return;
      m = matchLimits(route);
    }
    if (A.cur !== cur || !m.L) return;
    const old = cur.limits;
    // dove OSRM conosce il limite tengo il suo, altrimenti quello di OpenStreetMap
    if (old && old.v.length) { const sc = old.cum[old.cum.length - 1] / (route.length || 1); m.L.v = m.L.v.map((x, i) => limFrom(old, m.L.cum[i] * sc) || x); }
    cur.limits = m.L; cur.limitsOSM = true;
    if (cur.stage) A.db.get('stages', cur.stage).then(st => { if (st) { st.limits = cur.limits; st.limitsOSM = true; A.db.put('stages', cur.stage, st); } }).catch(() => {});
    A.emit('limits', cur.limits);
  }
  A.fetchOsmLimits = fetchOsmLimits;
  function limFrom(L, t) {
    let lo = 0, hi = L.cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L.cum[m] <= t) lo = m; else hi = m; }
    return L.v[Math.min(lo, L.v.length - 1)] || 0;
  }
  A.limitAtS = s => {
    const cur = A.cur, L = cur && cur.limits; if (!L || !L.v.length) return null;
    const t = s * (L.cum[L.cum.length - 1] / (cur.route.length || 1));
    let lo = 0, hi = L.cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L.cum[m] <= t) lo = m; else hi = m; }
    return L.v[Math.min(lo, L.v.length - 1)] || null;
  };
  A.streetAtS = s => { const n = A.cur && A.cur.names; if (!n || !n.length) return ''; let r = n[0].name; for (const x of n) { if (x.s <= s + 1) { if (x.name) r = x.name; } else break; } return r; };

  // ---------- autovelox e tutor: tutto il Piemonte (7 giorni, anche senza campo) ----------
  A.cams = [];
  function parseEnforcement(j) {
    const nodes = {}, list = [], seen = new Set();
    for (const e of j.elements || []) if (e.type === 'node') nodes[e.id] = e;
    for (const e of j.elements || []) if (e.type === 'node' && e.tags && e.tags.highway === 'speed_camera') { seen.add(e.id); list.push({ ll: [e.lat, e.lon], type: 'autovelox', max: parseInt(e.tags.maxspeed) || null }); }
    for (const e of j.elements || []) {
      if (e.type !== 'relation' || !e.tags) continue;
      const avg = e.tags.enforcement === 'average_speed';
      if (!avg && e.tags.enforcement !== 'maxspeed') continue;
      for (const m of e.members || []) {
        const nd = nodes[m.ref];
        if (m.type !== 'node' || !nd || seen.has(m.ref)) continue;
        if (m.role === 'device' || (avg && m.role === 'from')) { seen.add(m.ref); list.push({ ll: [nd.lat, nd.lon], type: avg ? 'tutor' : 'autovelox', max: parseInt(e.tags.maxspeed) || null }); }
      }
    }
    return list;
  }
  async function overpass(q) { return parseEnforcement(await (await fetch(OVERPASS, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })).json()); }
  function renderCams() { A.setOverlay('cams', A.fc(A.settings.cams ? A.cams.map(c => ({ type: 'Feature', properties: { k: c.type === 'tutor' ? 'tutor' : 'cam' }, geometry: { type: 'Point', coordinates: [c.ll[1], c.ll[0]] } })) : [])); }
  A.loadCameras = async () => {
    if (!A.settings.cams) { renderCams(); return; }
    let reg = A.store.get('camsPiemonte', null);
    if (reg) { A.cams = reg.list; renderCams(); }
    if (!reg || Date.now() - reg.t > 7 * 864e5) {
      try {
        const list = await overpass('[out:json][timeout:90];area["ISO3166-2"="IT-21"]->.a;node["highway"="speed_camera"](area.a)->.c;rel["type"="enforcement"](area.a)->.e;node(r.e)->.m;(.c;.e;.m;);out body;');
        if (list.length) { reg = { t: Date.now(), list }; A.store.set('camsPiemonte', reg); A.cams = list; renderCams(); }
      } catch { /* si usa quello che c'è */ }
    }
    if (A.cur) { A.cur.camsOn = camsOnRoute(A.cur.route); A.emit('route', A.cur); }
  };
  // fuori dal Piemonte: quelli intorno al percorso
  A.on('route', async cur => {
    if (!A.settings.cams || cur.outsideChecked) return;
    cur.outsideChecked = true;
    const [[w, s], [e, n]] = A.boundsOf(cur.route.latlon), pad = 0.01;
    if (!(s < PIEMONTE.s || n > PIEMONTE.n || w < PIEMONTE.w || e > PIEMONTE.e) || cur.route.length > 400000) return;
    try {
      const bb = `${s - pad},${w - pad},${n + pad},${e + pad}`;
      const extra = await overpass(`[out:json][timeout:25];(node["highway"="speed_camera"](${bb});rel["type"="enforcement"](${bb});)->.x;node(r.x)->.m;(.x;.m;);out body;`);
      const key = c => c.ll[0].toFixed(5) + ',' + c.ll[1].toFixed(5), have = new Set(A.cams.map(key));
      A.cams = A.cams.concat(extra.filter(c => !have.has(key(c)))); renderCams();
      if (A.cur === cur) { cur.camsOn = camsOnRoute(cur.route); A.emit('route', cur); }
    } catch { /* niente */ }
  });
  function camsOnRoute(route) {
    if (!A.settings.cams || !A.cams.length) return [];
    const [[w, s], [e, n]] = A.boundsOf(route.latlon), pad = 0.003, out = [];
    for (const c of A.cams) {
      if (c.ll[0] < s - pad || c.ll[0] > n + pad || c.ll[1] < w - pad || c.ll[1] > e + pad) continue;
      const pr = A.projectOnRoute(c.ll[0], c.ll[1], route);
      if (pr.d < 30) out.push({ s: pr.s, type: c.type, max: c.max, ll: c.ll });
    }
    return out.sort((a, b) => a.s - b.s);
  }

  // ---------- guida ----------
  const nosleep = (() => {
    let v = null;
    return {
      on() { try { if (!v) { v = document.createElement('video'); v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.muted = true; v.loop = true; v.src = 'nosleep.mp4'; } const p = v.play(); if (p && p.catch) p.catch(() => {}); } catch { /* niente */ } },
      off() { try { v && v.pause(); } catch { /* niente */ } }
    };
  })();
  const drive = A.drive = {
    on: false, sim: false, fix: null, lock: null, lastHeading: 0, off: 0, rerouting: false, nextReroute: 0, lastRecalcVoice: 0,
    announced: {}, camAlerted: {}, arrived: false, viaDone: {},
    start(sim) {
      const cur = A.cur; if (!cur) return;
      A.voice.unlock(); A.closePopup();
      Object.assign(this, { on: true, sim, fix: null, off: 0, offWarned: false, announced: {}, camAlerted: {}, arrived: false, viaDone: {}, startT: Date.now(), startLen: cur.route.length });
      if (!sim) { A.stats.trips++; A.saveStats(true); }
      this.wake();
      const r = cur.route;
      if (sim) this.startSim();
      else if (gps.fix) this.onFix(gps.fix.ll[0], gps.fix.ll[1], gps.fix.speed, gps.fix.acc, Date.now(), gps.heading);
      else this.onFix(r.latlon[0][0], r.latlon[0][1], 0, 99, Date.now(), null);
      A.cam.bearing = A.routeBearing(r, this.fix ? this.fix.s : 0);
      A.cam.follow(true);
      document.body.classList.add('driving');
      this.timer = setInterval(() => this.tick(), 200);
      A.emit('driveStart', { sim });
    },
    stop() {
      if (!this.on) return;
      this.on = false;
      clearInterval(this.timer); clearInterval(this.simTimer); clearTimeout(this.arriveT);
      A.voice.stop();
      if (this.lock) { this.lock.release().catch(() => {}); this.lock = null; }
      nosleep.off();
      document.body.classList.remove('driving');
      A.saveStats(true);
      A.emit('driveStop');
      A.cam.follow(false); A.cam.flat();
      setTimeout(() => { if (A.cur && !this.on) A.cam.fitRoute(A.cur.route.latlon); }, 450);
    },
    async wake() { try { if ('wakeLock' in navigator) this.lock = await navigator.wakeLock.request('screen'); } catch { /* non supportato */ } nosleep.on(); },
    startSim() {
      let s = 0, v = 0, last = Date.now();
      const vmax = { piena: 130, 6: 115, 5: 100, 4: 85, 3: 70, 2: 55, 1: 42, 90: 30, tornante: 25 };
      const gk = n => n.mods && n.mods.includes('secca') ? 90 : n.grade;
      const step = () => {
        const now = Date.now(), dt = Math.min(3, (now - last) / 1000); last = now;
        const cur = A.cur, route = cur.route;
        if (s > route.length) s = 0;
        let target = A.settings.sim / 3.6;
        const lim = A.limitAtS(s); if (lim) target = Math.min(target, lim * 1.05 / 3.6);
        for (const n of cur.gen.notes) {
          if (n.startS - 60 <= s && n.endS >= s) target = Math.min(target, vmax[gk(n)] / 3.6);
          if (n.startS > s + 80) break;
        }
        const nm = cur.man.find(m => m.s > s); if (nm && nm.s - s < 120 && nm.type !== 'arrive' && nm.mod !== 'straight') target = Math.min(target, (22 + (nm.s - s) * 0.35) / 3.6);
        v += Math.max(-6 * dt, Math.min(3 * dt, target - v));
        s = Math.min(route.length, s + v * dt);
        const p = A.pointAtS(route, s).ll;
        this.onFix(p[0], p[1], s >= route.length ? 0 : v, 5, now, null);
        if (s >= route.length) clearInterval(this.simTimer);
      };
      this.simTimer = setInterval(step, 1000);
      step();
    },
    onFix(lat, lon, speed, acc, t, heading) {
      const cur = A.cur, route = cur.route, prev = this.fix, n = route.pts.length;
      if (heading != null) this.lastHeading = heading;
      else if (prev && A.distLL(prev.ll, [lat, lon]) > 5) this.lastHeading = A.bearingLL(prev.ll, [lat, lon]);
      const hd = (speed == null || speed > 3) && (heading != null || (prev && A.distLL(prev.ll, [lat, lon]) > 5)) ? this.lastHeading : null;
      // aggancio solo vicino all'ultima posizione (in montagna il percorso ripassa vicino a sé stesso)
      let pr;
      if (!prev) pr = A.projectOnRoute(lat, lon, route, 0, n - 1, hd);
      else {
        pr = A.projectOnRoute(lat, lon, route, prev.i - 40, prev.i + 800, hd);
        if (pr.d > 60) { const w = A.projectOnRoute(lat, lon, route, prev.i - 200, prev.i + 1600, hd); if (w.d < pr.d) pr = w; }
        if (pr.d > 60 && (acc || 99) > 40) pr = { d: pr.d, s: prev.s, i: prev.i }; // GPS impreciso: resta dov'eri
      }
      const v = speed != null && speed >= 0 ? speed : (prev ? Math.max(0, (pr.s - prev.s) / Math.max(0.5, (t - prev.t) / 1000)) : 0);
      this.fix = { s: pr.s, i: pr.i, t, v, d: pr.d, ll: [lat, lon], acc };
      // fuori percorso: GPS buono, in movimento, lontano per 5 posizioni di fila
      if (!this.sim && pr.d > 50 && (acc || 99) <= 40 && v > 2) this.off++;
      else if (pr.d < 30) { this.off = 0; this.offWarned = false; }
      if (this.off >= 5 && !this.rerouting && Date.now() > this.nextReroute) {
        if (cur.stage) { if (!this.offWarned) { this.offWarned = true; A.toast('Sei fuori dal percorso della prova', 4000); A.emit('offRoute', { stage: true }); } }
        else this.reroute(lat, lon, hd);
      }
      A.emit('driveFix', { s: pr.s, v, d: pr.d, sim: this.sim, ll: [lat, lon] });
    },
    async reroute(lat, lon, hd) {
      this.rerouting = true; this.off = 0;
      const sayIt = Date.now() - this.lastRecalcVoice > 60000;
      if (sayIt) this.lastRecalcVoice = Date.now();
      A.emit('reroute', { speak: sayIt });
      try { await A.computeRoute({ from: { lat, lon, name: 'Posizione' }, heading: hd, quiet: true }); this.resync(); } catch { /* riprova più tardi */ }
      this.rerouting = false; this.nextReroute = Date.now() + 25000;
    },
    // dopo un ricalcolo / una modifica: riaggancia la posizione al percorso nuovo
    resync() {
      if (!this.fix || !A.cur) return;
      const pr = A.projectOnRoute(this.fix.ll[0], this.fix.ll[1], A.cur.route, 0, A.cur.route.pts.length - 1, this.fix.v > 3 ? this.lastHeading : null);
      Object.assign(this.fix, { s: pr.s, i: pr.i, d: pr.d });
      this.announced = {}; this.camAlerted = {};
      A.emit('resync', pr.s);
    },
    estS() { const f = this.fix; if (!f || !A.cur) return 0; return Math.min(A.cur.route.length, f.s + f.v * Math.min(2.5, (Date.now() - f.t) / 1000)); },
    pose() {
      const route = A.cur.route, f = this.fix;
      if (f && f.d < 35) { const s = this.estS(); return { ll: A.pointAtS(route, s).ll, bearing: A.routeBearing(route, s), speed: f.v, drive: true, s }; }
      return { ll: f ? f.ll : route.latlon[0], bearing: this.lastHeading, speed: f ? f.v : 0, drive: true, s: f ? f.s : 0 };
    },
    nextMan(s) { return A.cur.man.find(m => m.s > s - 5) || null; },
    // ogni 200 ms: indicazioni, autovelox, tappe, arrivo; poi gli stili disegnano
    tick() {
      if (!this.on || !this.fix) return;
      const cur = A.cur, s = this.estS(), v = this.fix.v, kmh = v * 3.6;
      // tappe intermedie raggiunte
      (cur.viaS || []).forEach((vs, i) => {
        if (!this.viaDone[i] && s >= vs - 30) {
          this.viaDone[i] = true;
          const live = A.plan.vias.filter(x => !x.done); if (live[0]) live[0].done = true;
          if (!this.sim) { A.stats.stops++; A.saveStats(); }
          A.emit('via', { name: live[0] ? live[0].name : 'Tappa' });
        }
      });
      // arrivo
      const rem = Math.max(0, cur.route.length - s);
      if (!this.arrived && rem < 30) {
        this.arrived = true;
        if (!this.sim) { A.stats.missions++; A.saveStats(true); }
        A.emit('arrive', { dist: this.startLen, sec: (Date.now() - this.startT) / 1000 });
        this.arriveT = setTimeout(() => this.stop(), 8000);
      }
      // indicazioni: lontano, vicino, adesso
      const k = cur.man.findIndex(m => m.s > s + 3);
      if (k >= 0) {
        const m = cur.man[k], dn = m.s - s, a = this.announced[k] || (this.announced[k] = {});
        const far = kmh > 90 ? 1500 : kmh > 55 ? 800 : 400, near = Math.max(120, v * 9), now = Math.max(35, v * 3.5);
        const isArr = m.type === 'arrive';
        const withName = m.name && !isArr ? (/rotonda|uscita/.test(m.text) ? ' verso ' : ' in ') + m.name : '';
        const m2 = cur.man[k + 1], then = m2 && m2.s - m.s < 120 && !isArr ? ', poi ' + m2.text : '';
        let phase = null;
        if (!a.far && dn <= far && dn > near + 80) { a.far = 1; phase = 'far'; }
        else if (!a.near && dn <= near && dn > now + 10) { a.near = a.far = 1; phase = 'near'; }
        else if (!a.now && dn <= now) { a.now = a.near = a.far = 1; phase = isArr ? null : 'now'; }
        if (phase) A.emit('instr', { phase, man: m, dist: dn, text: phase === 'now' ? A.cap(m.text) + then + '.' : `Tra ${A.spokenDist(dn)}, ${m.text}${withName}${phase === 'near' ? then : ''}.` });
      }
      // autovelox e tutor davanti
      (cur.camsOn || []).forEach((c, i) => {
        const dn = c.s - s;
        if (this.camAlerted[i] || dn < 0 || dn > Math.max(450, v * 20)) return;
        this.camAlerted[i] = true;
        if (!this.sim) { A.stats.cams++; A.saveStats(); }
        A.emit('cam', { type: c.type, max: c.max, dist: dn });
      });
      const lim = A.limitAtS(s);
      A.emit('tick', {
        s, v, kmh: Math.round(kmh), rem, limit: lim, over: !!lim && kmh > lim + 3,
        eta: Date.now() + (cur.osrm.duration || 0) * rem / (cur.route.length || 1) * 1000,
        remSec: (cur.osrm.duration || 0) * rem / (cur.route.length || 1),
        next: this.nextMan(s), street: A.streetAtS(s), progress: 1 - rem / (cur.route.length || 1)
      });
    }
  };
  document.addEventListener('visibilitychange', () => { if (drive.on && document.visibilityState === 'visible') drive.wake(); });

  // ---------- prove salvate (percorso + dati degli stili, usabili senza rete) ----------
  A.stages = {
    async save(name, quiet) {
      const cur = A.cur; if (!cur) return;
      const id = cur.stage || ('s' + Date.now());
      const old = cur.stage ? await A.db.get('stages', id).catch(() => null) : null;
      const extra = Object.assign({}, old ? old.extra : {});
      for (const sid of A.styleOrder) { const st = A.styles[sid]; if (st.stageData) { const d = st.stageData(cur); if (d) extra[sid] = d; } }
      const rec = {
        id, name, created: old ? old.created : Date.now(), updated: Date.now(),
        plan: { from: A.plan.from, to: A.plan.to, vias: A.plan.vias },
        osrm: { distance: cur.osrm.distance, duration: cur.osrm.duration, geometry: cur.osrm.geometry },
        man: cur.man, names: cur.names, viaS: cur.viaS, limits: cur.limits, limitsOSM: !!cur.limitsOSM, extra
      };
      try { await A.db.put('stages', id, rec); } catch { A.toast('Non sono riuscito a salvare la prova'); return; }
      cur.stage = id; cur.stageName = name; cur.stageExtra = extra; A.keepData();
      A.emit('stageSaved', cur);
      if (!quiet) A.toast('Prova salvata: funziona anche senza connessione');
    },
    async open(id) {
      const st = await A.db.get('stages', id); if (!st) return;
      if (drive.on) drive.stop();
      A.routes = [st.osrm]; A.routeIdx = 0; A.routeInfo = {};
      const coords = st.osrm.geometry.coordinates;
      const gen = P.generate(coords, A.style && A.style.genOptions ? A.style.genOptions() : {});
      const cur = A.cur = { osrm: st.osrm, coords, gen, route: gen.route, stage: id, stageName: st.name, stageExtra: st.extra || {}, man: st.man || [], names: st.names || [], viaS: st.viaS || [], limits: st.limits || null, limitsOSM: !!st.limitsOSM, extra: {} };
      buildRouteData(cur);
      Object.assign(A.plan, st.plan || {});
      A.setOverlay('route', A.lineF(cur.route.latlon)); A.setOverlay('alts', A.fc([]));
      A.emit('planChanged'); A.emit('route', cur);
      A.cam.fitRoute(cur.route.latlon);
    },
    async list() { return [...(await A.db.getAll('stages').catch(() => new Map())).values()].sort((a, b) => b.updated - a.updated); },
    async del(id) { await A.db.del('stages', [id]); if (A.cur && A.cur.stage === id) { A.cur.stage = null; A.emit('stageSaved', A.cur); } }
  };

  // ---------- dati dalle app di prima (stesso indirizzo: funziona se aperte nello stesso Safari) ----------
  A.migrate = async () => {
    if (A.store.get('migrated', false)) return;
    A.store.set('migrated', true);
    try {
      const ls = k => { try { const v = localStorage.getItem(k); return v == null ? null : JSON.parse(v); } catch { return null; } };
      const places = ls('wp_places'); if (places && places.length && !A.places.length) { A.places = places.map(p => ({ id: p.id, name: p.name, letter: p.letter, color: p.color, ll: [p.ll[1], p.ll[0]] })); A.savePlaces(); }
      const blocks = ls('wp_blocks'); if (blocks && blocks.length && !A.blocks.length) { A.blocks = blocks.map(b => ({ id: b.id, ll: [b.ll[1], b.ll[0]], t: b.t, until: b.until })); A.saveBlocks(); }
      const st = ls('wp_stats'); if (st) { for (const k of ['km', 'sec', 'trips', 'missions', 'stops', 'cams', 'blocks']) A.stats[k] += st[k] || 0; A.stats.maxKmh = Math.max(A.stats.maxKmh, st.maxKmh || 0); A.stats.extra.wanted = (A.stats.extra.wanted || 0) + (st.wanted || 0); A.stats.extra.maxStars = Math.max(A.stats.extra.maxStars || 0, st.maxStars || 0); A.saveStats(true); }
      const obs = ls('cr.obstacles'); if (obs && obs.length && !A.obstacles.length) { A.obstacles = obs; A.store.set('obstacles', obs); }
      const rs = ls('cr.settings'); if (rs) { const r = A.ss('rally'); for (const k of ['lead', 'scale', 'flat', 'dist', 'nav', 'car', 'livery', 'view', 'car3d', 'learn']) if (rs[k] !== undefined) r[k] = rs[k]; A.saveSS('rally'); }
      // database del navigatore rally (voci, auto, prove, taratura)
      const old = await new Promise(res => { const r = indexedDB.open('copilota'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); r.onupgradeneeded = () => { r.transaction.abort(); res(null); }; });
      if (old) {
        const getAll = st => new Promise(res => { try { const out = new Map(); const req = old.transaction(st).objectStore(st).openCursor(); req.onsuccess = () => { const c = req.result; if (c) { out.set(c.key, c.value); c.continue(); } else res(out); }; req.onerror = () => res(out); } catch { res(new Map()); } });
        for (const st of ['clips', 'cars', 'calib']) { const m = await getAll(st); if (m.size) for (const [k, v] of m) await A.db.put(st, k, v); }
        const stages = await getAll('stages');
        for (const [k, v] of stages) await A.db.put('stages', k, { id: v.id, name: v.name, created: v.created, updated: v.updated, plan: { from: v.from, to: v.to, vias: [] }, osrm: v.osrm, man: (v.man || []).map(m => Object.assign({ final: true }, m)), names: [], viaS: [], limits: v.limits || null, extra: { rally: { base: v.base } } });
        old.close();
        A.emit('migrated');
      }
    } catch (e) { console.warn('migrazione', e); }
  };

  // file esportato dal navigatore rally di prima
  A.importOld = async (data) => {
    let n = 0;
    for (const v of data.stages || []) {
      await A.db.put('stages', v.id, { id: v.id, name: v.name, created: v.created, updated: v.updated, plan: { from: v.from, to: v.to, vias: [] }, osrm: v.osrm, man: (v.man || []).map(m => Object.assign({ final: true }, m)), names: [], viaS: [], limits: v.limits || null, extra: { rally: { base: v.base } } });
      n++;
    }
    if (data.obstacles && data.obstacles.length) { const key = o => o.lat.toFixed(5) + o.lon.toFixed(5); const have = new Set(A.obstacles.map(key)); A.obstacles = A.obstacles.concat(data.obstacles.filter(o => !have.has(key(o)))); A.saveObstacles(); }
    if (data.calib && data.calib.length) { const old = (await A.db.get('calib', 'samples').catch(() => null)) || []; await A.db.put('calib', 'samples', old.concat(data.calib)); }
    if (data.settings) { const r = A.ss('rally'); for (const k of ['lead', 'scale', 'flat', 'dist', 'nav', 'car', 'livery', 'view', 'car3d', 'learn']) if (data.settings[k] !== undefined) r[k] = data.settings[k]; A.saveSS('rally'); }
    A.keepData(); A.emit('migrated');
    return n;
  };
  A.on('mapStyled', () => { renderBlocks(); renderCams(); });
})();
