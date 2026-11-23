/* APEX — interfaccia comune: ricerca, luoghi salvati, tappe, foglio del percorso, menu della mappa,
   impostazioni (comuni + dello stile), prove salvate, statistiche. Gli stili cambiano l'aspetto con il CSS. */
(function () {
  'use strict';
  const A = window.APEX, $ = A.$, esc = A.esc;
  const ICON_PIN = '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
  const ICON_ME = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>';
  const ICON_CLOCK = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';
  const ICON_STAR = '<svg viewBox="0 0 24 24"><path d="M12 3l2.6 6 6.4.5-4.9 4.2 1.5 6.3L12 16.7 6.4 20l1.5-6.3L3 9.5l6.4-.5z"/></svg>';
  let recents = A.store.get('recents', []);

  // lettera colorata dei luoghi salvati (lo stile può disegnarla a modo suo)
  A.placeSVG = (p, size = 36) => (A.style && A.style.placeSVG) ? A.style.placeSVG(p, size) :
    `<svg width="${size}" height="${size}" viewBox="0 0 36 36"><text x="18" y="29.5" font-size="${String(p.letter).length > 1 ? 21 : 30}" font-weight="900" font-family="Arial Black,Arial,sans-serif" text-anchor="middle" fill="${p.color}" stroke="#000" stroke-width="5" stroke-linejoin="round" paint-order="stroke">${esc(p.letter)}</text></svg>`;

  // ---------- campi partenza / tappe / arrivo ----------
  let active = 'to', suggItems = [], suggT, suggAbort, addingVia = false;
  const inputs = { from: $('inFrom'), to: $('inTo') };
  function bindInput(inp, key) {
    inp.addEventListener('focus', () => { active = key; inp.select(); showSugg(inp.value); });
    inp.addEventListener('input', () => { clearTimeout(suggT); suggT = setTimeout(() => showSugg(inp.value), 280); });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); const f = suggItems.find(i => i.place); if (f) pick(f); else wide(inp.value); }
      if (e.key === 'Escape') hideSugg();
    });
  }
  bindInput(inputs.from, 'from'); bindInput(inputs.to, 'to');
  document.addEventListener('pointerdown', e => { if (!$('plan').contains(e.target)) hideSugg(); });
  const hideSugg = () => { $('sugg').hidden = true; };
  function renderSugg(items) {
    suggItems = items;
    $('sugg').innerHTML = items.map((it, i) => `<li data-i="${i}" class="${it.place || it.me ? '' : 'empty'}">${it.icon || ''}<div><div class="t">${esc(it.title)}</div>${it.sub ? `<div class="s">${esc(it.sub)}</div>` : ''}</div></li>`).join('');
    $('sugg').hidden = !items.length;
  }
  $('sugg').addEventListener('click', e => { const li = e.target.closest('li'); if (li) pick(suggItems[+li.dataset.i]); });
  async function showSugg(q) {
    q = q.trim();
    const base = active === 'from' ? [{ me: true, icon: ICON_ME, title: 'La mia posizione' }] : [];
    if (q.length < 3) {
      const pl = A.places.map(p => ({ place: { lat: p.ll[0], lon: p.ll[1], name: p.name, sub: '' }, icon: A.placeSVG(p, 22), title: p.name, sub: 'Luogo salvato' }));
      renderSugg(base.concat(pl, recents.slice(0, 6).map(p => ({ place: p, icon: ICON_CLOCK, title: p.name, sub: p.sub }))));
      return;
    }
    if (suggAbort) suggAbort.abort();
    suggAbort = new AbortController();
    try {
      const items = await A.search(q, suggAbort.signal);
      renderSugg(base.concat(items.length ? items.map(p => ({ place: p, icon: ICON_PIN, title: p.name, sub: p.sub })) : [{ title: 'Nessun risultato', sub: 'Premi Invio per una ricerca più ampia' }]));
    } catch (e) { if (e.name !== 'AbortError') renderSugg(base.concat([{ title: 'Ricerca non raggiungibile', sub: 'Premi Invio per riprovare' }])); }
  }
  async function wide(q) {
    if (!q.trim()) return;
    try { const r = await A.searchWide(q); renderSugg(r.map(p => ({ place: p, icon: ICON_PIN, title: p.name, sub: p.sub }))); }
    catch { A.toast('Ricerca non raggiungibile: controlla la connessione'); }
  }
  async function pick(it) {
    if (!it || (!it.place && !it.me)) return;
    let place = it.place;
    if (it.me) place = { me: true, name: 'La mia posizione' };
    else addRecent(place);
    hideSugg(); inputs.from.blur(); inputs.to.blur();
    if (active === 'via') { A.plan.vias.push(Object.assign({}, place)); addingVia = false; renderPlan(); return planRoute(); }
    A.plan[active] = place;
    renderPlan();
    planRoute();
  }
  function addRecent(p) { recents = [p].concat(recents.filter(r => Math.abs(r.lat - p.lat) > 1e-4 || Math.abs(r.lon - p.lon) > 1e-4)).slice(0, 8); A.store.set('recents', recents); }
  A.setDestination = (place) => { A.plan.to = place; if (!A.plan.from) A.plan.from = { me: true, name: 'La mia posizione' }; renderPlan(); planRoute(); };

  // partenza "la mia posizione" → coordinate attuali
  async function resolveFrom() {
    const f = A.plan.from || { me: true, name: 'La mia posizione' };
    if (!f.me) return f;
    try { const ll = await A.myPosition(); return { lat: ll[0], lon: ll[1], name: 'La mia posizione', me: true }; }
    catch { const c = A.map.getCenter(); A.toast('Senza GPS: parto dal centro della mappa', 3500); return { lat: c.lat, lon: c.lng, name: 'Centro mappa' }; }
  }
  async function planRoute() {
    if (!A.plan.to) return;
    const from = await resolveFrom();
    A.computeRoute({ from }).catch(() => {});
  }
  A.planRoute = planRoute;

  let pins = [];
  function renderPlan() {
    inputs.from.value = A.plan.from && !A.plan.from.me ? A.plan.from.name : '';
    inputs.to.value = A.plan.to ? A.plan.to.name : '';
    const live = A.plan.vias.filter(v => !v.done);
    $('viaList').innerHTML = live.map((v, i) => `<div class="field"><span class="dot via"></span><input value="${esc(v.name)}" readonly><button class="x" data-rm="${i}" aria-label="Togli tappa">✕</button></div>`).join('') +
      (addingVia ? '<div class="field"><span class="dot via"></span><input id="inVia" type="search" placeholder="Cerca la tappa o tocca la mappa" autocomplete="off"></div>' : '');
    if (addingVia) { const iv = $('inVia'); bindInput(iv, 'via'); setTimeout(() => iv.focus(), 30); }
    pins.forEach(m => m.remove()); pins = [];
    A.mapReady(() => {
      const add = (p, cls, html) => { if (p && !p.me && p.lat != null) pins.push(A.marker(html, 'pin ' + cls, [p.lon, p.lat])); };
      add(A.plan.from, 'from', '<span style="background:#f3f2ee"></span>');
      live.forEach((v, i) => add(v, 'via', `<span>${i + 1}</span>`));
      if (A.plan.to && !A.places.some(p => Math.abs(p.ll[0] - A.plan.to.lat) < 1e-5 && Math.abs(p.ll[1] - A.plan.to.lon) < 1e-5)) add(A.plan.to, 'to', '<span style="background:var(--acc)"></span>');
    });
  }
  A.renderPlan = renderPlan;
  A.on('planChanged', renderPlan);
  $('viaList').addEventListener('click', e => {
    const b = e.target.closest('[data-rm]'); if (!b) return;
    const live = A.plan.vias.filter(v => !v.done); const v = live[+b.dataset.rm];
    A.plan.vias = A.plan.vias.filter(x => x !== v); renderPlan(); planRoute();
  });
  $('btnSwap').addEventListener('click', () => {
    const a = A.plan.from, b = A.plan.to;
    A.plan.from = b; A.plan.to = a && !a.me ? a : null;
    if (!A.plan.to) { A.plan.to = b; A.plan.from = { me: true, name: 'La mia posizione' }; }
    A.plan.vias.reverse(); renderPlan(); planRoute();
  });

  // ---------- luoghi salvati (chip e lettere sulla mappa) ----------
  let placeMarkers = [];
  function renderPlaces() {
    $('chips').innerHTML = A.places.map(p => `<button class="pchip" data-p="${p.id}">${A.placeSVG(p, 30)}<span>${esc(p.name)}</span></button>`).join('');
    placeMarkers.forEach(m => m.remove()); placeMarkers = [];
    A.mapReady(() => A.places.forEach(p => {
      const m = A.marker(A.placeSVG(p), 'place', [p.ll[1], p.ll[0]]);
      m.getElement().addEventListener('click', ev => { ev.stopPropagation(); skipClick(); if (!A.drive.on) goPlace(p); });
      placeMarkers.push(m);
    }));
  }
  const goPlace = p => A.setDestination({ lat: p.ll[0], lon: p.ll[1], name: p.name, placeId: p.id });
  $('chips').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) goPlace(A.places.find(p => p.id === b.dataset.p)); });
  A.on('places', renderPlaces);
  A.on('styleChanged', () => { renderPlaces(); renderStyleSettings(); });

  // editor luogo
  const COLORS = ['#f0c850', '#72cc72', '#5fa8ee', '#e05050', '#b84fd6', '#ff9a3c', '#ff7ac8', '#ffffff'];
  const pe = { place: null, color: COLORS[0], ll: null };
  function openPlace(ll, name) {
    const ex = A.places.find(p => Math.abs(p.ll[0] - ll[0]) < 1e-5 && Math.abs(p.ll[1] - ll[1]) < 1e-5);
    pe.place = ex || null; pe.ll = ll; pe.color = ex ? ex.color : COLORS[0];
    $('plName').value = ex ? ex.name : name || ''; $('plLetter').value = ex ? ex.letter : ((name || 'W')[0] || 'W').toUpperCase();
    $('plDel').hidden = !ex; plPreview(); $('placeModal').hidden = false;
  }
  function plPreview() {
    $('plPreview').innerHTML = A.placeSVG({ letter: ($('plLetter').value || '?').toUpperCase(), color: pe.color }, 60);
    $('plColors').innerHTML = COLORS.map(c => `<button class="sw ${c === pe.color ? 'on' : ''}" data-c="${c}" style="--a:${c}" aria-label="Colore"></button>`).join('');
  }
  $('plColors').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) { pe.color = b.dataset.c; plPreview(); } });
  $('plLetter').addEventListener('input', plPreview);
  document.querySelectorAll('.presets [data-n]').forEach(b => b.addEventListener('click', () => { $('plName').value = b.dataset.n; $('plLetter').value = b.dataset.l; pe.color = b.dataset.c; plPreview(); }));
  $('plSave').addEventListener('click', () => {
    const name = $('plName').value.trim() || 'Luogo', letter = ($('plLetter').value.trim() || name[0]).toUpperCase().slice(0, 2);
    if (pe.place) Object.assign(pe.place, { name, letter, color: pe.color });
    else A.places.push({ id: Date.now().toString(36), name, letter, color: pe.color, ll: pe.ll });
    A.savePlaces(); $('placeModal').hidden = true; A.toast('Luogo salvato: ' + name); renderPlan();
  });
  $('plDel').addEventListener('click', () => { A.places = A.places.filter(p => p !== pe.place); A.savePlaces(); $('placeModal').hidden = true; renderPlan(); });

  // ---------- foglio del percorso ----------
  function renderSheet() {
    const cur = A.cur;
    document.body.classList.toggle('has-route', !!cur);
    $('sheet').hidden = !cur;
    if (!cur) return;
    $('sumKm').textContent = A.fmtKm(cur.osrm.distance);
    $('sumTime').textContent = A.fmtMin(cur.osrm.duration);
    $('sumRight').textContent = 'arrivo ' + A.clock(Date.now() + cur.osrm.duration * 1000);
    const inf = A.routeInfo || {};
    $('sumInfo').innerHTML = (inf.avoided ? `<span class="ok">Evita ${inf.avoided} ${inf.avoided > 1 ? 'chiusure' : 'chiusura'}</span> ` : '') + (inf.blockedWarn ? '<span class="bad">Passa da una strada chiusa</span> ' : '') +
      (A.plan.vias.filter(v => !v.done).length ? 'Tappe: ' + A.plan.vias.filter(v => !v.done).map(v => esc(v.name)).join(' → ') : '');
    $('alts').innerHTML = A.routes.length > 1 ? A.routes.map((r, i) => `<button data-i="${i}" class="${i === A.routeIdx ? 'on' : ''}">${A.fmtKm(r.distance)} · ${A.fmtMin(r.duration)}</button>`).join('') : '';
    $('stageBar').innerHTML = cur.stage ? `Prova salvata: <b>${esc(cur.stageName)}</b>` : '';
    $('btnSaveStage').textContent = cur.stage ? 'Rinomina prova' : 'Salva prova';
    const isPlace = A.plan.to && A.places.some(p => Math.abs(p.ll[0] - A.plan.to.lat) < 1e-5 && Math.abs(p.ll[1] - A.plan.to.lon) < 1e-5);
    $('btnPlace').textContent = isPlace ? '✎ Luogo' : '★ Salva luogo';
    if (A.style && A.style.renderSheet) A.style.renderSheet($('sheetExtra'), cur); else $('sheetExtra').innerHTML = '';
  }
  A.renderSheet = renderSheet;
  A.on('route', () => { if (!A.drive.on) $('sheet').classList.remove('min'); renderSheet(); }); A.on('stageSaved', renderSheet);
  A.on('routeCleared', () => { renderSheet(); renderPlan(); });
  $('alts').addEventListener('click', e => { const b = e.target.closest('button'); if (b) A.selectRoute(+b.dataset.i, false); });
  $('sheet').querySelector('.grab').addEventListener('click', () => $('sheet').classList.toggle('min'));
  $('btnGo').addEventListener('click', () => A.drive.start(false));
  $('btnSim').addEventListener('click', () => A.drive.start(true));
  $('btnVia').addEventListener('click', () => { addingVia = !addingVia; active = 'via'; renderPlan(); if (addingVia) A.toast('Cerca la tappa o tocca la mappa', 2500); });
  $('btnPlace').addEventListener('click', () => { if (A.plan.to) openPlace([A.plan.to.lat, A.plan.to.lon], A.plan.to.name); });
  $('btnBlock').addEventListener('click', () => {
    if (!A.plan.to) return;
    A.addBlock([A.plan.to.lat, A.plan.to.lon]); A.plan.to = null; A.clearRoute();
    A.toast('Strada chiusa segnalata per 7 giorni: i percorsi la eviteranno', 3500);
  });
  $('btnClear').addEventListener('click', () => { A.plan = { from: null, to: null, vias: [] }; addingVia = false; A.clearRoute(); });
  $('btnSaveStage').addEventListener('click', () => {
    if (!A.cur) return;
    const def = A.cur.stageName || [A.plan.from && !A.plan.from.me ? A.plan.from.name : '', A.plan.to ? A.plan.to.name : ''].filter(Boolean).join(' → ') || 'Prova';
    $('inStageName').value = def; $('saveModal').hidden = false; setTimeout(() => $('inStageName').select(), 50);
  });
  $('saveForm').addEventListener('submit', e => { e.preventDefault(); $('saveModal').hidden = true; A.stages.save($('inStageName').value.trim() || 'Prova'); });

  // ---------- tocco sulla mappa ----------
  // dopo una pressione lunga il rilascio del dito non deve contare come tocco
  let skip = false, skipT = 0; const skipClick = () => { skip = true; clearTimeout(skipT); skipT = setTimeout(() => skip = false, 8000); };
  A.map.getCanvasContainer().addEventListener('pointerup', () => { if (skip) { clearTimeout(skipT); skipT = setTimeout(() => skip = false, 350); } }, true);
  A.skipClick = skipClick;
  A.map.on('click', e => {
    if (A.drive.on || skip) return;
    hideSugg();
    // un tocco chiude il menu aperto
    if (A.popupOpen()) { A.closePopup(); return; }
    const pt = e.point, box = [[pt.x - 10, pt.y - 10], [pt.x + 10, pt.y + 10]];
    const layers = ['apex-alts', 'apex-blocks'].filter(l => A.map.getLayer(l));
    const f = layers.length ? A.map.queryRenderedFeatures(box, { layers }) : [];
    const alt = f.find(x => x.layer.id === 'apex-alts'); if (alt) { A.selectRoute(alt.properties.idx, false); return; }
    const blk = f.find(x => x.layer.id === 'apex-blocks'); if (blk) return blockPopup(e.lngLat, blk.properties.id);
    if (A.style && A.style.onMapClick && A.style.onMapClick(e)) return;
    if (addingVia) { addingVia = false; A.reverseName(e.lngLat.lat, e.lngLat.lng).then(name => { A.plan.vias.push({ lat: e.lngLat.lat, lon: e.lngLat.lng, name }); renderPlan(); planRoute(); }); }
  });
  // tasto destro sul computer = come tenere premuto
  A.map.on('contextmenu', e => { if (!A.drive.on) mapPopup(e.lngLat); });
  function blockPopup(lngLat, id) {
    const b = A.blocks.find(x => x.id === id); if (!b) return;
    const el = A.openPopup(lngLat, `<div class="pop"><h4>Strada chiusa dal ${new Date(b.t).toLocaleDateString('it-IT')}</h4><button class="pb" data-del="1">Riapri la strada</button></div>`);
    el.addEventListener('click', ev => { if (ev.target.closest('[data-del]')) { A.blocks = A.blocks.filter(x => x !== b); A.saveBlocks(); A.closePopup(); planRoute(); } });
  }
  async function mapPopup(lngLat) {
    const ll = [lngLat.lat, lngLat.lng];
    $('sheet').classList.add('min');
    const onRoute = A.cur && A.projectOnRoute(ll[0], ll[1], A.cur.route);
    const extra = A.style && A.style.popupExtras ? A.style.popupExtras(ll, onRoute) : '';
    const el = A.openPopup(lngLat, `<div class="pop"><h4>${ll[0].toFixed(5)}, ${ll[1].toFixed(5)}</h4>
      ${extra}
      <button class="pb hl" data-a="to">Vai qui</button>
      ${A.cur ? '<button class="pb" data-a="via">Aggiungi come tappa</button>' : ''}
      <button class="pb" data-a="from">Parti da qui</button>
      <button class="pb" data-a="place">★ Salva luogo</button>
      <button class="pb" data-a="block">Strada chiusa qui</button>
      <h4 style="margin-top:12px">Segna un ostacolo</h4><div class="grid">${Object.entries(A.OBS).filter(([k]) => k !== 'tutor').map(([k, o]) => `<button class="pb" data-o="${k}">${o.label}</button>`).join('')}</div></div>`);
    el.addEventListener('click', async ev => {
      const b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.x && A.style.onPopupAction) { A.closePopup(); A.style.onPopupAction(b.dataset.x, ll, onRoute); return; }
      A.closePopup();
      const a = b.dataset.a;
      if (b.dataset.o) { A.obstacles.push({ lat: ll[0], lon: ll[1], type: b.dataset.o }); A.saveObstacles(); A.toast(A.OBS[b.dataset.o].label + ' segnato'); return; }
      if (a === 'block') { A.addBlock(ll); A.toast('Strada chiusa segnalata per 7 giorni', 3000); planRoute(); return; }
      const name = await A.reverseName(ll[0], ll[1]);
      if (a === 'place') return openPlace(ll, name);
      const place = { lat: ll[0], lon: ll[1], name };
      if (a === 'via') { A.plan.vias.push(place); renderPlan(); return planRoute(); }
      if (a === 'from') { A.plan.from = place; renderPlan(); return planRoute(); }
      if (addingVia) { addingVia = false; A.plan.vias.push(place); renderPlan(); return planRoute(); }
      A.setDestination(place);
    });
  }
  // tieni premuto = menu (vai qui, tappa, segnala…)
  let lpT = null, lpP = null;
  const lpBox = A.map.getCanvasContainer();
  const lpCancel = () => { clearTimeout(lpT); lpT = null; };
  lpBox.addEventListener('pointerdown', e => {
    if (A.drive.on || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (lpT) return lpCancel(); // secondo dito: è uno zoom
    lpP = { x: e.clientX, y: e.clientY };
    const r = lpBox.getBoundingClientRect(); const ll = A.map.unproject([e.clientX - r.left, e.clientY - r.top]);
    lpT = setTimeout(() => { lpT = null; skipClick(); if (navigator.vibrate) navigator.vibrate(30); hideSugg(); mapPopup(ll); }, 550);
  }, true);
  lpBox.addEventListener('pointermove', e => { if (lpT && Math.hypot(e.clientX - lpP.x, e.clientY - lpP.y) > 10) lpCancel(); }, true);
  ['pointerup', 'pointercancel'].forEach(t => lpBox.addEventListener(t, lpCancel, true));

  // ostacoli sulla mappa
  let obsMarkers = [];
  function renderObstacles() {
    obsMarkers.forEach(m => m.remove()); obsMarkers = [];
    $('obsCount').textContent = A.obstacles.length; $('blockCount').textContent = A.activeBlocks().length;
    A.mapReady(() => A.obstacles.forEach((o, i) => {
      const m = A.marker(`<span>${A.OBS[o.type] ? A.OBS[o.type].ch : '!'}</span>`, 'obsicon', [o.lon, o.lat]);
      m.getElement().addEventListener('click', ev => {
        ev.stopPropagation(); skipClick();
        const el = A.openPopup([o.lon, o.lat], `<div class="pop"><h4>${(A.OBS[o.type] || {}).label || 'Ostacolo'}</h4><button class="pb" data-del="1">Rimuovi</button></div>`);
        el.addEventListener('click', e2 => { if (e2.target.closest('[data-del]')) { A.obstacles.splice(i, 1); A.saveObstacles(); A.closePopup(); } });
      });
      obsMarkers.push(m);
    }));
  }
  A.on('obstacles', renderObstacles); A.on('blocks', () => { $('blockCount').textContent = A.activeBlocks().length; });

  // ---------- seguimi (come Google Maps) ----------
  $('btnLocate').addEventListener('click', async () => {
    A.startCompass();
    if (A.cam.following && !A.drive.on) { A.cam.headingUp = !A.cam.headingUp; return; }
    if (!A.gps.fix) { try { await A.myPosition(); } catch { A.toast('Posizione non disponibile: consenti la localizzazione'); return; } }
    A.cam.follow(true);
  });
  // senza percorso: velocità e via mentre la mappa ti segue
  function freeHud() {
    const show = A.cam.following && !A.drive.on && !A.cur && !!A.gps.fix;
    $('freehud').hidden = !show;
    if (!show) return;
    $('fSpd').textContent = Math.round((A.gps.fix.speed || 0) * 3.6);
    $('fStreet').textContent = A.gps.where.street || 'In viaggio';
    $('fZone').textContent = A.gps.where.zone || '';
  }
  A.on('gps', freeHud); A.on('where', freeHud); A.on('camMode', freeHud); A.on('route', freeHud); A.on('routeCleared', freeHud);
  // all'apertura: mappa sulla tua posizione e ti segue
  A.on('firstFix', () => { if (!A.cur && !A.drive.on) A.cam.follow(true); });

  // ---------- finestre ----------
  document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) m.hidden = true; }));
  $('btnSettings').addEventListener('click', () => { renderSettings(); $('settings').hidden = false; });
  $('btnStages').addEventListener('click', async () => { await renderStages(); $('stagesModal').hidden = false; });
  $('btnStats').addEventListener('click', () => { renderStats(); $('statsModal').hidden = false; });

  async function renderStages() {
    const all = await A.stages.list();
    $('stageList').innerHTML = all.length ? all.map(st => `<li data-id="${st.id}"><div class="si"><b>${esc(st.name)}</b><span>${A.fmtKm(st.osrm.distance)} · ${new Date(st.updated).toLocaleDateString('it-IT')}</span></div>
      <button class="btn ghost small" data-open="1">Apri</button><button class="btn ghost small" data-del="1">Elimina</button></li>`).join('')
      : '<li class="empty">Nessuna prova salvata. Calcola un percorso e premi "Salva prova".</li>';
  }
  $('stageList').addEventListener('click', async e => {
    const b = e.target.closest('button'), li = e.target.closest('li[data-id]'); if (!b || !li) return;
    if (b.dataset.open) { $('stagesModal').hidden = true; A.stages.open(li.dataset.id); }
    if (b.dataset.del) {
      if (!b.classList.contains('confirm')) { b.classList.add('confirm'); b.textContent = 'Conferma'; return; }
      await A.stages.del(li.dataset.id); renderStages();
    }
  });
  $('inImport').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const n = await A.importOld(JSON.parse(await f.text())); A.toast(n + (n === 1 ? ' prova importata' : ' prove importate'), 3500); renderStages(); }
    catch { A.toast('File non valido', 3500); }
    e.target.value = '';
  });
  function renderStats() {
    const s = A.stats, h = Math.floor(s.sec / 3600), m = Math.round((s.sec % 3600) / 60);
    const rows = [['Chilometri percorsi', s.km.toFixed(1).replace('.', ',') + ' km'], ['Tempo alla guida', `${h} h ${String(m).padStart(2, '0')} min`], ['Velocità massima', s.maxKmh + ' km/h'],
      ['Arrivi a destinazione', `${s.missions} / ${s.trips}`], ['Tappe raggiunte', s.stops], ['Autovelox avvisati', s.cams], ['Strade chiuse segnalate', s.blocks], ['Luoghi salvati', A.places.length]]
      .concat(A.style && A.style.statsRows ? A.style.statsRows(s) : []);
    $('statRows').innerHTML = rows.map(([a, b]) => `<div class="srow"><span>${a}</span><b>${b}</b></div>`).join('');
  }
  $('btnStatsReset').addEventListener('click', e => {
    const b = e.currentTarget;
    if (!b.classList.contains('confirm')) { b.classList.add('confirm'); b.textContent = 'Conferma'; return; }
    b.classList.remove('confirm'); b.textContent = 'Azzera'; A.resetStats(); renderStats();
  });

  // ---------- impostazioni ----------
  function renderSettings() {
    const ready = A.styleOrder.map(id => A.styles[id]);
    $('styleList').innerHTML = ready.map(st => `<button class="stylebtn ${st.id === A.style.id ? 'on' : ''}" data-st="${st.id}"><b>${esc(st.name)}</b><span>${esc(st.tagline || '')}</span></button>`).join('') +
      [['rdr', 'Red Dead'], ['minecraft', 'Minecraft']].filter(([id]) => !A.styles[id]).map(([, n]) => `<button class="stylebtn soon" disabled><b>${n}</b><span>prossimamente</span></button>`).join('');
    const s = A.settings;
    $('tNoMotorway').checked = s.noMotorway; $('tCams').checked = s.cams; $('selInstr').value = s.instrVoice; $('selAudio').value = s.audioMode;
    $('tSat').checked = s.satellite; $('tCompass').checked = s.compass; $('sSim').value = s.sim; $('oSim').textContent = s.sim + ' km/h';
    renderObstacles();
    renderStyleSettings();
  }
  function renderStyleSettings() {
    const box = $('setStyle'); if (!box) return;
    box.innerHTML = A.style && A.style.settingsHTML ? A.style.settingsHTML() : '';
    if (A.style && A.style.bindSettings) A.style.bindSettings(box);
  }
  A.renderStyleSettings = renderStyleSettings;
  $('styleList').addEventListener('click', e => { const b = e.target.closest('[data-st]'); if (!b || b.dataset.st === A.style.id) return; A.setStyle(b.dataset.st); renderSettings(); });
  const bind = (id, key, after, prop = 'checked') => $(id).addEventListener(prop === 'checked' ? 'change' : 'input', () => { A.settings[key] = prop === 'checked' ? $(id).checked : (prop === 'num' ? +$(id).value : $(id).value); A.saveSettings(); after && after(); });
  bind('tNoMotorway', 'noMotorway', () => { if (A.cur && !A.cur.stage && !A.drive.on) planRoute(); });
  bind('tCams', 'cams', () => A.loadCameras());
  $('selInstr').addEventListener('change', () => { A.settings.instrVoice = $('selInstr').value; A.saveSettings(); });
  $('selAudio').addEventListener('change', () => { A.settings.audioMode = $('selAudio').value; A.saveSettings(); A.voice.setSession(); });
  bind('tSat', 'satellite', () => A.reloadMapStyle());
  bind('tCompass', 'compass', () => A.startCompass());
  bind('sSim', 'sim', () => { $('oSim').textContent = A.settings.sim + ' km/h'; }, 'num');
  $('btnClearObs').addEventListener('click', () => { A.obstacles = []; A.saveObstacles(); renderObstacles(); });
  $('btnClearBlocks').addEventListener('click', () => { A.blocks = []; A.saveBlocks(); planRoute(); });

  // le indicazioni a voce: lo stile dice se le vuole (instrDefault), l'utente può forzarle
  A.wantsInstrVoice = () => A.settings.instrVoice === 'on' || (A.settings.instrVoice === 'auto' && !!(A.style && A.style.instrDefault));

  A.uiInit = () => { renderPlan(); renderPlaces(); renderObstacles(); renderSheet(); };
})();
