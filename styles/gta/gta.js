/* APEX — stile GTA (da BLIP): mappa grigia, blip dei luoghi, HUD da missione, stelle "ricercato",
   ruota della radio, minimappa, indicazioni a voce */
(function () {
  'use strict';
  const A = window.APEX, $ = A.$, esc = A.esc;
  const ID = 'gta';
  const S = () => A.ss(ID);
  const save = () => A.saveSS(ID);
  const RADIOAPI = 'https://de1.api.radio-browser.info/json/stations/search';

  // ---------- blip originali ----------
  const BLIP = {
    fuel: '<rect x="7" y="6" width="11" height="21" rx="1"/><path fill="none" d="M18 11h3l3 3v9a2 2 0 0 1-4 0v-5h-2"/>',
    hospital: '<text x="16" y="26" font-size="25" font-weight="900" text-anchor="middle" font-family="Arial Black,Arial,sans-serif">H</text>',
    police: '<path d="M16 4l10 4v7c0 7-5 11-10 13C11 26 6 22 6 15V8z"/>',
    food: '<path fill="none" d="M7 5v6a3 3 0 0 0 6 0V5M10 5v22"/><path d="M23 5c-3 2-5 6-5 11h3v11h2z"/>',
    cafe: '<path d="M6 11h15v7a6 6 0 0 1-6 6h-3a6 6 0 0 1-6-6z"/><path fill="none" d="M21 13h2a3 3 0 0 1 0 6h-2"/>',
    bank: '<text x="16" y="25" font-size="23" font-weight="900" text-anchor="middle" font-family="Arial Black,Arial,sans-serif">€</text>',
    parking: '<text x="16" y="25.5" font-size="24" font-weight="900" text-anchor="middle" font-family="Arial Black,Arial,sans-serif">P</text>',
    pharmacy: '<path d="M13 5h6v8h8v6h-8v8h-6v-8H5v-6h8z"/>',
    shop: '<path d="M5 13h22l-3 13H8z"/><path fill="none" d="M10 13l4-7M22 13l-4-7"/>',
    car: '<path d="M4 21v-5l4-6h16l4 6v5z"/><circle cx="10" cy="22" r="3"/><circle cx="22" cy="22" r="3"/>',
    hotel: '<path d="M16 5l11 10h-3v12H8V15H5z"/>',
    camera: '<rect x="3" y="10" width="18" height="12" rx="2"/><path d="M21 14l8-4v12l-8-4z"/>'
  };
  const CLASS2BLIP = { fuel: 'fuel', hospital: 'hospital', police: 'police', fast_food: 'food', restaurant: 'food', cafe: 'cafe', bar: 'cafe', beer: 'cafe', bank: 'bank', parking: 'parking', pharmacy: 'pharmacy', grocery: 'shop', shop: 'shop', car: 'car', lodging: 'hotel' };
  const CATNAME = { fuel: 'Distributore', hospital: 'Ospedale', police: 'Polizia', fast_food: 'Fast food', restaurant: 'Ristorante', cafe: 'Bar', bar: 'Bar', beer: 'Birreria', bank: 'Banca', parking: 'Parcheggio', pharmacy: 'Farmacia', grocery: 'Supermercato', shop: 'Negozio', car: 'Auto', lodging: 'Hotel' };
  const BLIPCOL = { fuel: '#f2a83b', hospital: '#4aa3ff', police: '#4f7fe0', food: '#f5d05a', cafe: '#d69a66', bank: '#6fd36f', parking: '#9ad0ff', pharmacy: '#3fcf6a', shop: '#9be36a', car: '#e6e6e6', hotel: '#b48cff' };
  const blipSVG = (inner, col) => `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 32 32"><g fill="#111" stroke="#111" stroke-width="5.5" stroke-linejoin="round" stroke-linecap="round">${inner}</g><g fill="${col}" stroke="${col}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">${inner}</g></svg>`;
  const ICONS = { cam: blipSVG(BLIP.camera, '#ff5a5a'), tutor: blipSVG(BLIP.camera, '#ffb03c') };
  for (const [cls, ic] of Object.entries(CLASS2BLIP)) ICONS['blip-' + cls] = blipSVG(BLIP[ic], BLIPCOL[ic]);

  // ---------- suoni ----------
  const helpBlip = () => { if (S().sounds) A.voice.tone([[1175, .07, 0], [1568, .1, .07]], 'sine', .2); };
  const starSound = () => { if (S().sounds) A.voice.tone([[660, .12, 0], [990, .18, .12]], 'square', .15); };
  const camSound = () => { if (S().sounds) A.voice.tone([[880, .12, 0], [880, .12, .2]], 'square', .18); };
  const jingle = () => { if (S().sounds) A.voice.tone([[523, .45, 0], [659, .45, .13], [784, .45, .26], [1047, .45, .39], [523, 1.4, .6], [659, 1.4, .6], [784, 1.4, .6], [1047, 1.4, .6]], 'triangle', .12); };
  const speak = t => { if (A.wantsInstrVoice()) A.voice.speak(t); };

  // ---------- sottotitoli e banner ----------
  let subT, bT;
  function sub(html, ms = 4000) { const el = $('gSub'); if (!el) return; el.innerHTML = html; el.classList.add('on'); clearTimeout(subT); subT = setTimeout(() => el.classList.remove('on'), ms); }
  function banner(t, s, ms = 4000, color) {
    const b = $('gBanner'); if (!b) return;
    $('gBTitle').textContent = t; $('gBTitle').style.color = color || 'var(--y)'; $('gBSub').innerHTML = s || '';
    b.hidden = false; b.style.animation = 'none'; void b.offsetWidth; b.style.animation = 'gBannerIn .45s ease-out';
    clearTimeout(bT); bT = setTimeout(() => b.hidden = true, ms);
  }

  // ---------- radio ----------
  const radio = new Audio(); radio.preload = 'none';
  const STATIONS = [
    { n: 'Radio Deejay', q: 'Radio Deejay', lg: '<span class="lg" style="font:900 22px Arial Black,Arial;letter-spacing:-1px">DJ</span>' },
    { n: 'Virgin Radio', q: 'Virgin Radio', lg: '<span class="lg" style="font:italic 700 15px Georgia,serif">Virgin</span>' },
    { n: 'RTL 102.5', q: 'RTL 102.5', lg: '<span class="lg" style="font:900 16px Arial Black,Arial">RTL</span><span class="lg" style="font:700 11px Arial">102.5</span>' },
    { n: 'Radio 105', q: 'Radio 105', lg: '<span class="lg" style="font:400 28px Anton,Impact">105</span>' },
    { n: 'Radio Capital', q: 'Radio Capital', lg: '<span class="lg" style="font:700 11px Georgia,serif">CAPITAL</span>' },
    { n: 'm2o', q: 'm2o', lg: '<span class="lg" style="font:900 24px Arial Black,Arial;letter-spacing:-2px">m2o</span>' },
    { n: 'Radio Italia', q: 'Radio Italia', lg: '<span class="lg" style="font:700 9px Arial;letter-spacing:1px">RADIO</span><span class="lg" style="font:italic 700 15px Georgia,serif">Italia</span>' },
    { n: 'Rai Radio 2', q: 'Rai Radio 2', lg: '<span class="lg" style="font:900 15px Arial Black,Arial">RAI</span><span class="lg" style="font:400 22px Anton,Impact">2</span>' },
    { n: 'R101', q: 'R101', lg: '<span class="lg" style="font:400 24px Anton,Impact;letter-spacing:1px">R101</span>' },
    { n: 'Radio GRP', q: 'Radio GRP', lg: '<span class="lg" style="font:700 8px Arial;letter-spacing:2px">RADIO</span><span class="lg" style="font:900 17px Arial Black,Arial">GRP</span>' }
  ];
  const OFF_SVG = '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" stroke-width="3.5"/><path d="M9.5 30.5L30.5 9.5" stroke="currentColor" stroke-width="3.5"/></svg>';
  let radioIdx = -1, stT, wheelT;
  async function resolveStation(st) {
    const cache = A.store.get('radio', {}), c = cache[st.n];
    if (c && Date.now() - c.t < 864e5 && c.u.length) return c.u;
    const arr = await (await fetch(`${RADIOAPI}?name=${encodeURIComponent(st.q)}&countrycode=IT&hidebroken=true&order=clickcount&reverse=true&limit=8`)).json();
    const raw = arr.map(s => s.url_resolved || s.url).filter(Boolean);
    const urls = [...new Set([...raw.filter(u => u.startsWith('https://')), ...raw.filter(u => u.startsWith('http://')).map(u => u.replace('http://', 'https://'))])].slice(0, 6);
    const tags = ((arr[0] && arr[0].tags) || '').split(',').map(s => s.trim()).filter(t => t && t.length < 16).slice(0, 3).join(' · ');
    cache[st.n] = { t: Date.now(), u: urls, tags }; A.store.set('radio', cache);
    return urls;
  }
  function showStation(t) { const el = $('gStation'); if (!el) return; el.textContent = t; el.classList.add('on'); clearTimeout(stT); stT = setTimeout(() => el.classList.remove('on'), 3500); }
  function playUrls(urls, k, idx) {
    if (radioIdx !== idx) return;
    if (k >= urls.length) { sub('<span class="r">Stazione non disponibile</span>', 3000); return; }
    radio.onerror = () => playUrls(urls, k + 1, idx);
    radio.src = urls[k]; const p = radio.play(); if (p) p.catch(() => {});
  }
  function tune(i) {
    radioIdx = i; S().radio = i; save();
    if (i < 0) { radio.pause(); radio.onerror = null; radio.removeAttribute('src'); try { radio.load(); } catch { /* niente */ } showStation('RADIO SPENTA'); renderWheel(); return; }
    const st = STATIONS[i]; showStation(st.n.toUpperCase()); renderWheel();
    const cache = A.store.get('radio', {})[st.n];
    if (cache && cache.u && cache.u.length) playUrls(cache.u, 0, i);
    else resolveStation(st).then(u => { playUrls(u, 0, i); renderWheel(); }).catch(() => sub('<span class="r">Radio non raggiungibile</span>', 3000));
  }
  function renderWheel() {
    const ring = $('gRing'); if (!ring) return;
    ring.querySelectorAll('.st').forEach(e => e.remove());
    const items = [...STATIONS.map((st, i) => ({ i, html: st.lg })), { i: -1, html: OFF_SVG }], n = items.length;
    items.forEach((it, k) => {
      const a = Math.PI / 2 + ((k + 1) / n) * Math.PI * 2, el = document.createElement('div');
      el.className = 'st' + (it.i === -1 ? ' off' : '') + (it.i === radioIdx ? ' sel' : '');
      el.style.left = (50 + 40 * Math.cos(a)) + '%'; el.style.top = (50 + 40 * Math.sin(a)) + '%'; el.innerHTML = it.html;
      el.onclick = e => { e.stopPropagation(); tune(it.i); clearTimeout(wheelT); wheelT = setTimeout(() => $('gWheel').hidden = true, 1400); };
      ring.appendChild(el);
    });
    const st = STATIONS[radioIdx];
    $('gRingName').textContent = st ? st.n : 'Radio spenta';
    $('gRingTags').textContent = st ? ((A.store.get('radio', {})[st.n] || {}).tags || '') : '';
    $('gRingState').textContent = st ? (radio.paused ? 'SINTONIZZAZIONE…' : 'IN ONDA') : '';
  }
  radio.addEventListener('playing', () => { if ($('gRingState') && radioIdx >= 0) $('gRingState').textContent = 'IN ONDA'; });
  // la voce abbassa la radio
  let duckT;
  A.on('speechStart', () => { if (!radio.paused) { radio.muted = true; clearTimeout(duckT); duckT = setTimeout(() => radio.muted = false, 9000); } });
  A.on('speechEnd', () => { radio.muted = false; clearTimeout(duckT); });

  // ---------- stelle "ricercato" quando superi il limite ----------
  const STAR = '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.7 7-6.3-3.9-6.3 3.9 1.7-7L2 9.5l7.1-.6z" fill="#fff" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  const W = { stars: 0, downAt: 0, flashUntil: 0 };
  function updateStars(kmh, limit, sim) {
    let n = 0;
    if (S().stars && limit) { const o = kmh - limit; n = o > 50 ? 5 : o > 35 ? 4 : o > 22 ? 3 : o > 12 ? 2 : o > 5 ? 1 : 0; }
    const now = Date.now(), ex = A.stats.extra;
    if (n > W.stars) {
      if (W.stars === 0 && !sim) ex.wanted = (ex.wanted || 0) + 1;
      W.stars = n; W.downAt = 0; W.flashUntil = now + 3000; starSound();
      if (!sim) ex.maxStars = Math.max(ex.maxStars || 0, n);
    } else if (n < W.stars) { if (!W.downAt) W.downAt = now + 4000; else if (now > W.downAt) { W.stars = n; W.downAt = 0; } }
    else W.downAt = 0;
    const el = $('gStars'); el.innerHTML = STAR.repeat(W.stars);
    el.classList.toggle('flash', now < W.flashUntil || W.downAt > 0);
    $('gSiren').classList.toggle('on', W.stars >= 3);
  }

  // ---------- frecce delle indicazioni ----------
  function arrowSVG(m) {
    const st = 'fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"';
    if (!m) return '';
    if (m.type === 'arrive') return `<svg viewBox="0 0 48 48"><path d="M14 42V8M14 8h20l-4 7 4 7H14" ${st}/></svg>`;
    if (m.type === 'roundabout' || m.type === 'rotary') return `<svg viewBox="0 0 48 48"><circle cx="24" cy="18" r="9" ${st}/><path d="M24 44V27" ${st}/><text x="24" y="23" text-anchor="middle" font-family="Anton,Impact" font-size="12" fill="#fff">${m.exit || ''}</text></svg>`;
    const ang = { straight: 0, 'slight right': 40, right: 90, 'sharp right': 130, 'slight left': -40, left: -90, 'sharp left': -130, uturn: -180 }[m.mod] || 0;
    const a = ang * Math.PI / 180, ex = 24 + Math.sin(a) * 15, ey = 22 - Math.cos(a) * 15;
    if (ang === -180) return `<svg viewBox="0 0 48 48"><path d="M30 44V18a8 8 0 0 0-16 0v14" ${st}/><path d="M8 26l6 8 6-8" ${st}/></svg>`;
    const p = k => [ex + Math.sin(a + k) * 8, ey - Math.cos(a + k) * 8].map(v => v.toFixed(1)).join(' ');
    return `<svg viewBox="0 0 48 48"><path d="M24 44V22L${ex.toFixed(1)} ${ey.toFixed(1)}" ${st}/><path d="M${p(0)}L${p(2.4)}L${p(-2.4)}Z" fill="#fff"/></svg>`;
  }
  const helpHTML = m => {
    if (!m) return '';
    if (m.type === 'arrive') return (m.final ? 'Arrivo a ' : 'Tappa: ') + `<span class="y">${esc(m.final ? (A.plan.to || {}).name || '' : 'tappa')}</span>`;
    const hl = esc(A.cap(m.text)).replace(/(a sinistra|a destra|leggermente a \w+|tutto a \w+|la sinistra|la destra|\S+ uscita|dritto|inversione a U)/, '<span class="b">$1</span>');
    return m.name ? hl + (/rotonda|uscita/.test(m.text) ? ' verso ' : ' in ') + `<span class="y">${esc(m.name)}</span>` : hl;
  };

  // ---------- HUD ----------
  const HUD = `
    <div id="gHelp" class="ghelp"><div id="gHelpArrow" class="garrow"></div><div><div id="gHelpDist" class="gdist"></div><div id="gHelpText" class="gtext"></div></div></div>
    <div id="gBig" class="gbig"><div id="gBigArrow" class="garrow big"></div><div id="gBigDist" class="gbigdist"></div><div id="gBigText" class="gbigtext"></div>
      <div class="gbigspeed"><div><span class="n" id="gBigKmh">0</span> <small>km/h</small></div><div id="gBigLimit" class="glimit" hidden></div></div></div>
    <div class="gtr"><div id="gRem" class="grem"></div><div id="gEta" class="geta"></div><div id="gStars" class="gstars"></div></div>
    <div class="gbl"><div class="gspeedrow"><div id="gSpeed" class="gspeed">0<small> km/h</small></div><div id="gLimit" class="glimit" hidden></div></div>
      <div class="gbars"><div class="gbar hp"><i id="gHp" style="width:0"></i></div><div class="gbar ar"><i id="gAr" style="width:0"></i></div></div></div>
    <div class="gbr"><div id="gZone" class="gzone"></div><div id="gStreet" class="gstreet"></div></div>
    <div class="gctrls"><button id="gMute">🔊</button><button id="gRadio">📻</button><button id="gMini">▣</button><button id="gRoad">🚧</button><button id="gEnd">✕</button></div>
    <div id="gStation" class="gstation"></div>
    <div id="gSiren" class="gsiren"></div>`;
  const OVER = `
    <div id="gWheel" class="gwheel" hidden><div id="gRing" class="gring"><div class="gringcenter"><div id="gRingName" class="gringname">Radio</div><div id="gRingTags" class="gringtags"></div><div id="gRingState" class="gringstate"></div></div></div></div>
    <div id="gSub" class="gsub"></div>
    <div id="gBanner" class="gbanner" hidden><div class="band"><div id="gBTitle"></div><div id="gBSub"></div></div></div>`;

  let curMan = null, endArm = 0, roadArm = 0, lastStreet = '', lastZone = '';
  function setText(id, t) { const el = $(id); if (!el || el.textContent === t) return; el.textContent = t; el.classList.remove('fadein'); void el.offsetWidth; el.classList.add('fadein'); }
  function applyMini() {
    document.body.classList.toggle('gta-mini', !!S().mini && A.drive.on);
    const b = $('gMini'); if (b) b.textContent = S().mini ? '⛶' : '▣';
    setTimeout(() => A.map.resize(), 60);
  }
  function onTick(t) {
    const m = t.next;
    if (m !== curMan) {
      curMan = m;
      const arr = arrowSVG(m), html = helpHTML(m);
      $('gHelpArrow').innerHTML = arr; $('gHelpText').innerHTML = html; $('gBigArrow').innerHTML = arr; $('gBigText').innerHTML = html;
      const h = S().mini ? $('gBig') : $('gHelp'); h.classList.remove('pop'); void h.offsetWidth; h.classList.add('pop');
      if (m) helpBlip();
    }
    const dn = m ? A.fmtDist(m.s - t.s) : '';
    $('gHelpDist').textContent = dn; $('gBigDist').textContent = dn;
    $('gRem').textContent = A.fmtDist(t.rem);
    $('gEta').innerHTML = A.fmtMin(t.remSec) + '<br>arrivo ' + A.clock(t.eta);
    $('gHp').style.width = Math.min(100, 100 * t.progress).toFixed(1) + '%';
    const acc = (A.drive.fix && A.drive.fix.acc) || 10;
    $('gAr').style.width = Math.max(5, Math.min(100, 100 * (1 - (acc - 5) / 45))).toFixed(0) + '%';
    $('gSpeed').innerHTML = t.kmh + '<small> km/h</small>'; $('gBigKmh').textContent = t.kmh;
    for (const L of [$('gLimit'), $('gBigLimit')]) { L.hidden = !t.limit; if (t.limit) L.textContent = t.limit; }
    updateStars(t.kmh, t.limit, A.drive.sim);
    if (t.street !== lastStreet) { lastStreet = t.street; setText('gStreet', t.street); }
    const z = A.gps.where.zone; if (z && z !== lastZone) { lastZone = z; setText('gZone', z); }
  }

  // ---------- mappa grigia (da BLIP) ----------
  function restyle(map) {
    for (const l of map.getStyle().layers) {
      const id = l.id, sl = l['source-layer'] || '', key = id + ' ' + sl;
      try {
        if (l.type === 'background') map.setPaintProperty(id, 'background-color', '#2b2f33');
        else if (l.type === 'fill') {
          let c = '#30343a';
          if (/water|ocean|lake/.test(key)) c = '#2d4962';
          else if (/park|wood|grass|forest|landcover|natural|meadow|scrub|wetland|farm|cemetery/.test(key)) c = '#33413a';
          else if (/building/.test(key)) c = '#3b4046';
          else if (/aeroway|airport/.test(key)) c = '#393d43';
          if (l.paint && l.paint['fill-pattern'] !== undefined) map.setPaintProperty(id, 'fill-pattern', undefined);
          map.setPaintProperty(id, 'fill-color', c); map.setPaintProperty(id, 'fill-outline-color', c);
        }
        else if (l.type === 'fill-extrusion') { map.setPaintProperty(id, 'fill-extrusion-color', '#41464c'); map.setPaintProperty(id, 'fill-extrusion-opacity', 0.75); }
        else if (l.type === 'line') {
          if (/boundary|admin/.test(key)) map.setLayoutProperty(id, 'visibility', 'none');
          else if (/water|river|stream|canal/.test(key)) map.setPaintProperty(id, 'line-color', '#2d4962');
          else if (/casing/.test(id)) map.setPaintProperty(id, 'line-color', '#1b1d20');
          else if (/motorway|trunk/.test(id)) map.setPaintProperty(id, 'line-color', '#e2e2e2');
          else if (/rail|transit|ferry/.test(key)) map.setPaintProperty(id, 'line-color', '#575b61');
          else if (/path|track|pedestrian|footway|cycle|steps/.test(id)) map.setPaintProperty(id, 'line-color', '#4f5359');
          else if (sl === 'transportation' || /road|street|bridge|tunnel|highway/.test(id)) map.setPaintProperty(id, 'line-color', '#a7abb0');
          else map.setPaintProperty(id, 'line-color', '#474b51');
          if (l.paint && l.paint['line-dasharray'] !== undefined && /rail/.test(id)) map.setLayoutProperty(id, 'visibility', 'none');
        }
        else if (l.type === 'symbol') {
          if (sl === 'poi' || /poi|shield/.test(id)) { map.setLayoutProperty(id, 'visibility', 'none'); continue; }
          if (l.layout && l.layout['text-field'] !== undefined) { map.setPaintProperty(id, 'text-color', /water/.test(key) ? '#9cb6cc' : '#e9e9e9'); map.setPaintProperty(id, 'text-halo-color', '#000000'); map.setPaintProperty(id, 'text-halo-width', 1.3); }
        }
        else if (l.type === 'hillshade') map.setLayoutProperty(id, 'visibility', 'none');
      } catch { /* niente */ }
    }
  }

  // ---------- impostazioni dello stile ----------
  function settingsHTML() {
    const s = S();
    return `<h3>GTA</h3>
      <label class="toggle"><input id="gtStars" type="checkbox" ${s.stars ? 'checked' : ''}><span>Stelle "ricercato" quando superi il limite</span></label>
      <label class="toggle"><input id="gtMini" type="checkbox" ${s.mini ? 'checked' : ''}><span>Minimappa in guida (indicazioni grandi)</span></label>
      <label class="toggle"><input id="gtBlips" type="checkbox" ${s.blips ? 'checked' : ''}><span>Blip dei luoghi sulla mappa (benzinai, ospedali, bar…)</span></label>
      <label class="toggle"><input id="gtSounds" type="checkbox" ${s.sounds ? 'checked' : ''}><span>Suoni del gioco</span></label>`;
  }
  function bindSettings() {
    const s = S();
    $('gtStars').onchange = () => { s.stars = $('gtStars').checked; save(); };
    $('gtMini').onchange = () => { s.mini = $('gtMini').checked; save(); applyMini(); };
    $('gtBlips').onchange = () => { s.blips = $('gtBlips').checked; save(); if (A.map.getLayer('gta-blips')) A.map.setLayoutProperty('gta-blips', 'visibility', s.blips ? 'visible' : 'none'); };
    $('gtSounds').onchange = () => { s.sounds = $('gtSounds').checked; save(); };
  }

  let off = [];
  A.registerStyle({
    id: ID, name: 'GTA', tagline: 'missioni e blip',
    defaults: { stars: true, mini: false, blips: true, sounds: true, radio: -1 },
    instrDefault: true,
    icons: ICONS,
    routeTheme: { route: '#b84fd6', casing: '#2a0b33', casingOpacity: 0.9, width: 6, alt: '#6a5a72' },
    restyle,
    addLayers(map) {
      const st = map.getStyle(), vsrc = Object.keys(st.sources).find(k => st.sources[k].type === 'vector');
      if (!vsrc) return;
      map.addLayer({ id: 'gta-blips', type: 'symbol', source: vsrc, 'source-layer': 'poi', minzoom: 13.5,
        filter: ['in', ['get', 'class'], ['literal', Object.keys(CLASS2BLIP)]],
        layout: { 'icon-image': ['concat', 'apex-blip-', ['get', 'class']], 'icon-size': 0.9, 'icon-allow-overlap': false, 'icon-pitch-alignment': 'viewport', 'icon-rotation-alignment': 'viewport', 'symbol-sort-key': ['coalesce', ['get', 'rank'], 99], visibility: S().blips ? 'visible' : 'none' } });
    },
    onMapClick(e) {
      if (!A.map.getLayer('gta-blips')) return false;
      const f = A.map.queryRenderedFeatures([[e.point.x - 12, e.point.y - 12], [e.point.x + 12, e.point.y + 12]], { layers: ['gta-blips'] });
      if (!f.length) return false;
      const p = f[0].properties || {}, nome = p['name:it'] || p.name || '', cat = CATNAME[p.class] || 'Luogo';
      const [lon, lat] = f[0].geometry.coordinates;
      helpBlip();
      A.setDestination({ lat, lon, name: nome ? (nome.toLowerCase().includes(cat.toLowerCase()) ? nome : `${nome} · ${cat}`) : cat });
      return true;
    },
    vehicle() { return { html: '<svg viewBox="0 0 36 36"><path d="M18 3 L30 31 L18 24 L6 31 Z" fill="#fff" stroke="#000" stroke-width="2.6" stroke-linejoin="round"/></svg>', align: 'map', cls: 'garrowmk' }; },
    driveVehicleMode: () => 'top',
    camera(p) {
      if (!p.drive) return { pitch: 0, padTop: 0.2 };
      const v = p.speed * 3.6, mini = !!S().mini;
      return { pitch: mini ? 40 : 55, padTop: mini ? 0.38 : 0.42, zoom: (v > 90 ? 15.2 : v > 60 ? 15.8 : v > 35 ? 16.4 : 17) - (mini ? 0.6 : 0) };
    },
    settingsHTML, bindSettings,
    statsRows(s) { return [['Livello ricercato massimo', '★'.repeat(s.extra.maxStars || 0) || '—'], ['Volte ricercato', s.extra.wanted || 0]]; },
    mount() {
      $('hud').innerHTML = HUD;
      document.body.insertAdjacentHTML('beforeend', OVER);
      radioIdx = -1;
      $('gRadio').onclick = () => { A.voice.unlock(); clearTimeout(wheelT); renderWheel(); $('gWheel').hidden = false; };
      $('gWheel').onclick = () => { $('gWheel').hidden = true; };
      $('gMini').onclick = () => { S().mini = !S().mini; save(); curMan = undefined; applyMini(); };
      $('gMute').onclick = () => { A.settings.muted = !A.settings.muted; A.saveSettings(); $('gMute').textContent = A.settings.muted ? '🔇' : '🔊'; if (A.settings.muted) A.voice.stop(); };
      $('gMute').textContent = A.settings.muted ? '🔇' : '🔊';
      $('gEnd').onclick = () => { if (Date.now() - endArm < 3000) { endArm = 0; sub('Navigazione terminata', 2000); A.drive.stop(); } else { endArm = Date.now(); sub('Tocca di nuovo <span class="r">✕</span> per terminare', 3000); } };
      $('gRoad').onclick = () => {
        const f = A.drive.fix; if (!f) return;
        if (Date.now() - roadArm < 3000) {
          roadArm = 0;
          const p = A.pointAtS(A.cur.route, A.drive.estS() + 40).ll;
          A.addBlock(p); sub('🚧 Strada chiusa segnalata per 7 giorni · cerco un\'altra strada', 3500); speak('Strada chiusa segnalata. Cerco un percorso alternativo.');
          A.drive.nextReroute = 0; A.drive.reroute(f.ll[0], f.ll[1], A.drive.lastHeading);
        } else { roadArm = Date.now(); sub('Strada bloccata davanti? Tocca di nuovo <span class="r">🚧</span>', 3000); }
      };
      off = [
        A.on('driveStart', d => {
          $('hud').hidden = false; curMan = undefined; W.stars = 0; lastStreet = ''; lastZone = '';
          $('gStars').innerHTML = ''; $('gSiren').classList.remove('on'); applyMini();
          if (d && d.resume) return;
          const dest = (A.plan.to || {}).name || 'Destinazione';
          banner(dest.toUpperCase(), '', 3200, '#fff');
          const vias = A.plan.vias.filter(v => !v.done);
          setTimeout(() => sub(vias.length ? `Passa da <span class="p">${esc(vias[0].name)}</span>, poi vai a <span class="y">${esc(dest)}</span>.` : `Vai a <span class="y">${esc(dest)}</span>.`, 6000), 900);
          speak(`Percorso impostato. ${A.spokenDist(A.cur.route.length)}.`);
        }),
        A.on('driveStop', () => { $('hud').hidden = true; document.body.classList.remove('gta-mini'); A.map.resize(); if (radioIdx >= 0) tune(-1); $('gWheel').hidden = true; }),
        A.on('tick', onTick),
        A.on('instr', i => speak(i.text)),
        A.on('cam', c => { const what = c.type === 'tutor' ? 'Tutor' : 'Autovelox'; camSound(); speak(`${what} tra ${A.spokenDist(c.dist)}${c.max ? ', limite ' + c.max : ''}.`); sub(`<span class="r">${what}</span> tra ${A.fmtDist(c.dist)}${c.max ? ` · limite <span class="y">${c.max}</span>` : ''}`, 5000); }),
        A.on('via', v => { helpBlip(); banner('TAPPA RAGGIUNTA', `<span class="p">${esc(v.name)}</span>`, 3000, '#fff'); speak('Tappa raggiunta.'); }),
        A.on('arrive', a => { jingle(); banner('MISSIONE COMPIUTA', `${A.fmtDist(a.dist)} percorsi in <span class="y">${A.fmtMin(a.sec)}</span>`, 6500); speak('Sei arrivato a destinazione.'); }),
        A.on('reroute', r => { sub('Ricalcolo del percorso…', 3000); if (r.speak) speak('Ricalcolo del percorso.'); }),
        A.on('offRoute', () => sub('<span class="r">Sei fuori dal percorso della prova</span>', 4000)),
        A.on('where', w => { if (A.drive.on && w.zone && w.zone !== lastZone) { lastZone = w.zone; setText('gZone', w.zone); } })
      ];
      if (A.cur) A.renderSheet();
    },
    unmount() {
      off.forEach(f => f()); off = [];
      if (radioIdx >= 0) tune(-1);
      ['gWheel', 'gSub', 'gBanner'].forEach(id => { const el = $(id); if (el) el.remove(); });
      document.body.classList.remove('gta-mini');
      $('hud').innerHTML = '';
    }
  });
})();
