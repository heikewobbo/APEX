/* APEX — mappa comune: stessi dati vettoriali (OpenFreeMap / OpenStreetMap) per tutti gli stili,
   ogni stile cambia solo i colori. Qui ci sono anche la camera che segue il veicolo e il marker del veicolo. */
(function () {
  'use strict';
  const A = window.APEX;
  const BASE_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
  const SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const fc = feats => ({ type: 'FeatureCollection', features: feats });
  const lineF = (latlon, props = {}) => ({ type: 'Feature', properties: props, geometry: { type: 'LineString', coordinates: latlon.map(p => [p[1], p[0]]) } });
  A.fc = fc; A.lineF = lineF;

  const view0 = A.store.get('view', [45.0, 7.68]);
  const map = A.map = new maplibregl.Map({
    container: 'map', style: BASE_STYLE,
    center: [view0[1], view0[0]], zoom: A.store.get('zoom', 12), maxPitch: 70,
    dragRotate: false, pitchWithRotate: false, attributionControl: false, fadeDuration: 0
  });
  // pezzi di mappa non scaricati (senza campo): niente messaggi d'errore, si riprova da soli
  map.on('error', e => { const m = String((e && e.error && (e.error.message || e.error)) || ''); if (!/fetch|AJAX|Network|abort|load/i.test(m)) console.warn('mappa', m); });
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
  map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: 'OSRM · Valhalla · Photon' }), 'bottom-right');

  let ready = false; const q = [];
  A.mapReady = fn => ready ? fn() : q.push(fn);
  const overlayData = { alts: fc([]), route: fc([]), done: fc([]), cams: fc([]), blocks: fc([]) };

  // immagini (icone) per i layer simbolo: SVG → immagine
  function addSvg(name, svg, ratio = 2) {
    return new Promise(res => {
      if (map.hasImage(name)) map.removeImage(name);
      const im = new Image(); im.onload = () => { try { map.addImage(name, im, { pixelRatio: ratio }); } catch { /* niente */ } res(); }; im.onerror = () => res();
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }
  A.addMapImage = addSvg;
  const DEF_ICONS = {
    cam: '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="#fff" stroke="#d32020" stroke-width="3"/><rect x="6.5" y="10" width="11" height="8" rx="1.5" fill="#222"/><path d="M17.5 12.5l4-2v7l-4-2z" fill="#222"/></svg>',
    tutor: '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="#fff" stroke="#ff9f1a" stroke-width="3"/><text x="14" y="18.5" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="10" fill="#222">T</text></svg>',
    block: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 32 32"><path d="M8 18v10M24 18v10" stroke="#111" stroke-width="5" stroke-linecap="round"/><path d="M8 18v10M24 18v10" stroke="#ddd" stroke-width="2.2" stroke-linecap="round"/><rect x="3" y="7" width="26" height="11" rx="1.5" fill="#fff" stroke="#111" stroke-width="2.4"/><path d="M8 8l-4 9M14 8l-4 9M20 8l-4 9M26 8l-4 9" stroke="#e23b3b" stroke-width="3"/></svg>'
  };

  // dopo ogni (ri)caricamento dello stile: colori dello stile + layer del navigatore
  async function onStyleLoad() {
    const st = A.style;
    const firstSymbol = (map.getStyle().layers.find(l => l.type === 'symbol') || {}).id;
    try { st && st.restyle && st.restyle(map); } catch (e) { console.error(e); }
    if (A.settings.satellite) {
      map.addSource('sat', { type: 'raster', tiles: [SAT], tileSize: 256, maxzoom: 19, attribution: 'Immagini © Esri' });
      const firstLine = (map.getStyle().layers.find(l => l.type === 'line') || {}).id;
      map.addLayer({ id: 'sat', type: 'raster', source: 'sat' }, firstLine);
    }
    const icons = Object.assign({}, DEF_ICONS, (st && st.icons) || {});
    await Promise.all(Object.entries(icons).map(([k, v]) => addSvg('apex-' + k, v)));
    const th = Object.assign({ route: '#e8e8e8', casing: '#000000', casingOpacity: 0.55, width: 6, alt: '#6b7280', done: '#777777' }, (st && st.routeTheme) || {});
    for (const id of Object.keys(overlayData)) if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: overlayData[id] });
    const lay = { 'line-cap': 'round', 'line-join': 'round' };
    const w = (k) => ['interpolate', ['linear'], ['zoom'], 10, th.width * 0.55 * k, 16, th.width * 1.35 * k];
    map.addLayer({ id: 'apex-alts', type: 'line', source: 'alts', layout: lay, paint: { 'line-color': th.alt, 'line-width': w(1), 'line-opacity': .75 } }, firstSymbol);
    map.addLayer({ id: 'apex-route-casing', type: 'line', source: 'route', layout: lay, paint: { 'line-color': th.casing, 'line-width': w(1.7), 'line-opacity': th.casingOpacity } }, firstSymbol);
    map.addLayer({ id: 'apex-route', type: 'line', source: 'route', layout: lay, paint: { 'line-color': th.route, 'line-width': w(1) } }, firstSymbol);
    try { st && st.addLayers && st.addLayers(map, firstSymbol); } catch (e) { console.error(e); }
    map.addLayer({ id: 'apex-blocks', type: 'symbol', source: 'blocks', layout: { 'icon-image': 'apex-block', 'icon-size': 0.9, 'icon-allow-overlap': true, 'icon-pitch-alignment': 'viewport' } });
    map.addLayer({ id: 'apex-cams', type: 'symbol', source: 'cams', minzoom: 11, layout: { 'icon-image': ['concat', 'apex-', ['get', 'k']], 'icon-size': 0.8, 'icon-allow-overlap': true, 'icon-pitch-alignment': 'viewport' } });
    ready = true; q.splice(0).forEach(f => f());
    A.emit('mapStyled');
  }
  map.on('style.load', () => { ready = false; onStyleLoad(); });
  // cambio di stile: si ricarica la mappa base e si riapplicano i colori
  A.reloadMapStyle = () => { ready = false; map.setStyle(BASE_STYLE, { diff: false }); };
  A.setOverlay = (id, data) => { overlayData[id] = data; const s = ready && map.getSource(id); if (s) s.setData(data); };
  A.lineF = lineF;

  map.on('moveend', () => { if (A.drive && A.drive.on) return; const c = map.getCenter(); A.store.set('view', [c.lat, c.lng]); A.store.set('zoom', map.getZoom()); });

  // marker HTML generico
  A.marker = (html, cls, lnglat, opts = {}) => {
    const el = document.createElement('div'); el.className = cls; el.innerHTML = html;
    return new maplibregl.Marker(Object.assign({ element: el, anchor: 'center' }, opts)).setLngLat(lnglat).addTo(map);
  };
  let popup = null;
  A.openPopup = (lnglat, html) => {
    if (popup) popup.remove();
    popup = new maplibregl.Popup({ closeButton: false, maxWidth: '290px', offset: 12 }).setLngLat(lnglat).setHTML(html).addTo(map);
    return popup.getElement();
  };
  A.closePopup = () => { if (popup) { popup.remove(); popup = null; } };

  // ---------- veicolo ----------
  // lo stile fornisce: vehicle(mode) → { html, align: 'map' | 'viewport', cls }
  const veh = { m: null, key: null };
  A.vehicle = {
    set(mode) {
      const st = A.style; if (!st || !st.vehicle) return null;
      const v = st.vehicle(mode); const key = mode + '|' + v.html.length + '|' + (v.cls || '') + '|' + v.align;
      if (!veh.m) { const el = document.createElement('div'); veh.m = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([0, 0]); }
      if (veh.key !== key) {
        veh.key = key; veh.align = v.align;
        const el = veh.m.getElement(); el.className = 'vehicle ' + (v.cls || ''); el.innerHTML = v.html;
        veh.m.setRotationAlignment(v.align); veh.m.setPitchAlignment(v.align);
      }
      if (!veh.m._map) veh.m.addTo(map);
      return veh.m;
    },
    redraw() { veh.key = null; },
    hide() { if (veh.m) veh.m.remove(); },
    // bearing = direzione del veicolo; in "viewport" il disegno è dritto e ruota solo di quanto la mappa non lo segue
    place(ll, bearing, mode) {
      const m = this.set(mode); if (!m) return;
      m.setLngLat([ll[1], ll[0]]);
      m.setRotation(veh.align === 'viewport' ? A.angDiff(bearing, map.getBearing()) : bearing);
    }
  };

  // ---------- camera: ferma o al seguito del veicolo (come Google Maps) ----------
  const cam = A.cam = { following: false, bearing: 0, zoom: 16, t: 0, raf: 0 };
  cam.follow = (on = true) => {
    cam.following = on;
    if (on) cam.userZoom = false;
    document.body.classList.toggle('following', on);
    A.emit('camMode', on);
    if (on) cam.zoom = Math.max(map.getZoom(), 15.5);
  };
  map.on('dragstart', e => { if (e.originalEvent && cam.following) cam.follow(false); });
  map.on('zoomstart', e => { if (e.originalEvent && cam.following) cam.userZoom = true; });
  function frame(now) {
    cam.raf = requestAnimationFrame(frame);
    const dt = Math.min(0.2, (now - (cam.t || now)) / 1000); cam.t = now;
    const p = A.pose && A.pose(); // { ll, bearing, speed, drive }
    if (!p) return;
    const st = A.style || {};
    const mode = p.drive ? (st.driveVehicleMode ? st.driveVehicleMode() : 'top') : 'top';
    const moving = p.speed > 1.5;
    if (moving || p.drive) cam.bearing = (cam.bearing + A.angDiff(p.bearing, cam.bearing) * Math.min(1, dt * 4) + 360) % 360;
    A.vehicle.place(p.ll, p.bearing, mode);
    if (!cam.following) return;
    const c = (st.camera ? st.camera(p) : null) || {};
    const kmh = p.speed * 3.6;
    const zt = cam.userZoom ? map.getZoom() : (c.zoom != null ? c.zoom : 17.6 - Math.max(0, Math.min(1, (kmh - 30) / 90)) * 1.6);
    cam.zoom += (zt - cam.zoom) * Math.min(1, dt * 1.5);
    const H = map.getContainer().clientHeight;
    const headingUp = p.drive || moving || cam.headingUp;
    map.jumpTo({
      center: [p.ll[1], p.ll[0]], zoom: cam.zoom,
      bearing: headingUp ? cam.bearing : map.getBearing(),
      pitch: c.pitch != null ? c.pitch : (p.drive ? 55 : 0),
      padding: { top: H * (c.padTop != null ? c.padTop : (p.drive ? 0.45 : 0.2)), bottom: c.padBottom || 0, left: 0, right: 0 }
    });
  }
  cam.raf = requestAnimationFrame(frame);
  // torna "piatta" a nord quando si smette di seguire fuori dalla guida
  cam.flat = (opts = {}) => { cam.userZoom = false; map.easeTo(Object.assign({ pitch: 0, bearing: 0, padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: 500 }, opts)); };
  cam.fitRoute = (latlon, pad) => map.fitBounds(A.boundsOf(latlon), { padding: pad || { top: 170, bottom: Math.min(innerHeight * 0.5, 380), left: 30, right: 30 }, bearing: 0, pitch: 0, duration: 700 });
})();
