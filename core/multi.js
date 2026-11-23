/* APEX — multiplayer: chi accende lo switch compare sulla mappa degli altri, come i giocatori online.
   Sessione pubblica (tutti) o privata con codice (posizioni cifrate: le legge solo chi ha il codice).
   Passa da un server MQTT pubblico e gratuito; nulla viene salvato. Vicino a Casa non si condivide. */
(function () {
  'use strict';
  const A = window.APEX, $ = A.$, esc = A.esc;
  const BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
  const ROOT = 'apex-nav/v1/';
  const COLORS = ['#ff7a1a', '#3fa9f5', '#5bd65b', '#ff4d6d', '#b36bff', '#ffd23f', '#21d4c4', '#ffffff'];
  const cfg = Object.assign({ on: false, nick: '', color: COLORS[0], room: '', home: true }, A.store.get('mp', {}));
  const saveCfg = () => A.store.set('mp', cfg);
  let myId = A.store.get('mp.id', null);
  if (!myId) { myId = Math.random().toString(36).slice(2, 10); A.store.set('mp.id', myId); }
  if (!cfg.nick) cfg.nick = 'Pilota' + Math.floor(100 + Math.random() * 900);

  const M = A.mp = { peers: new Map(), connected: false, cfg, myId, COLORS };
  let client = null, topic = '', key = null, lastSend = 0, lastHd = 0, hidden = false, gen = 0, replyT = 0;

  // ---------- cifratura per le sessioni private ----------
  const enc = new TextEncoder(), dec = new TextDecoder();
  const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  const b64 = u => btoa(String.fromCharCode(...u)), unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const normCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  async function roomSetup() {
    const code = normCode(cfg.room);
    if (!code) { topic = ROOT + 'pubblica/'; key = null; return; }
    topic = ROOT + 's' + hex(await crypto.subtle.digest('SHA-256', enc.encode('apex-stanza:' + code))).slice(0, 24) + '/';
    const base = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveKey']);
    key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: enc.encode('apex-mp-v1'), iterations: 60000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function pack(o) {
    const txt = JSON.stringify(o); if (!key) return txt;
    const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(txt)));
    const all = new Uint8Array(12 + ct.length); all.set(iv); all.set(ct, 12); return b64(all);
  }
  async function unpack(buf) {
    const s = typeof buf === 'string' ? buf : dec.decode(buf);
    if (!key) return JSON.parse(s);
    const all = unb64(s); return JSON.parse(dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12) }, key, all.slice(12))));
  }

  // ---------- zona di casa: lì la posizione non parte ----------
  function nearHome(ll) {
    if (!cfg.home) return false;
    const casa = A.places.find(p => /casa|home/i.test(p.name) || p.letter === 'C');
    return !!(casa && A.distLL(ll, casa.ll) < 400);
  }

  // ---------- connessione ----------
  async function connect() {
    disconnect(true);
    if (!cfg.on || !window.mqtt) { status(); return; }
    const my = ++gen;
    try { await roomSetup(); } catch { M.err = 'Cifratura non disponibile'; status(); return; }
    if (my !== gen) return;
    const will = await pack({ i: myId, bye: 1 });
    let bi = 0;
    const open = () => {
      if (my !== gen) return;
      const c = client = mqtt.connect(BROKERS[bi], { clientId: 'apex_' + myId + '_' + Math.random().toString(36).slice(2, 6), clean: true, keepalive: 30, reconnectPeriod: 4000, connectTimeout: 8000, will: { topic: topic + myId, payload: will, qos: 0, retain: false } });
      let ok = false;
      c.on('connect', () => { ok = true; M.connected = true; M.err = ''; c.subscribe(topic + '+', { qos: 0 }); status(); sendNow(); });
      c.on('message', async (t, payload) => {
        let o; try { o = await unpack(payload); } catch { return; }
        if (!o || !o.i || o.i === myId) return;
        if (o.bye) { drop(o.i); return; }
        if (typeof o.a !== 'number' || typeof o.o !== 'number' || Math.abs(Date.now() - (o.t || 0)) > 90000) return;
        upsert(o);
      });
      c.on('close', () => { M.connected = false; status(); });
      c.on('error', () => { if (!ok && bi < BROKERS.length - 1 && my === gen) { bi++; try { c.end(true); } catch { /* niente */ } open(); } });
      setTimeout(() => { if (!ok && my === gen && client === c && bi < BROKERS.length - 1) { bi++; try { c.end(true); } catch { /* niente */ } open(); } }, 9000);
    };
    open();
  }
  async function disconnect(quiet) {
    gen++;
    const c = client; client = null; M.connected = false;
    if (c) { try { if (c.connected) c.publish(topic + myId, await pack({ i: myId, bye: 1 })); } catch { /* niente */ } setTimeout(() => { try { c.end(true); } catch { /* niente */ } }, 300); }
    [...M.peers.keys()].forEach(id => drop(id, true));
    if (!quiet) status();
  }
  async function sendNow(force) {
    const f = A.gps.fix; if (!client || !client.connected || !f) return;
    if (nearHome(f.ll)) { if (!hidden) { hidden = true; client.publish(topic + myId, await pack({ i: myId, bye: 1 })); status(); } return; }
    if (hidden) { hidden = false; status(); }
    const now = Date.now(), v = f.speed || 0, hd = A.drive.on && A.drive.lastHeading != null ? A.drive.lastHeading : (f.heading != null ? f.heading : A.gps.heading || 0);
    const gap = v > 1.5 ? 2000 : 10000;
    if (!force && now - lastSend < gap && !(Math.abs(A.angDiff(hd, lastHd)) > 25 && now - lastSend > 900)) return;
    lastSend = now; lastHd = hd;
    const msg = { i: myId, n: cfg.nick.slice(0, 16), c: cfg.color, s: A.style ? A.style.id : '', a: +f.ll[0].toFixed(5), o: +f.ll[1].toFixed(5), h: Math.round(hd || 0), v: Math.round(v * 10) / 10, d: A.drive.on ? 1 : 0, t: now };
    client.publish(topic + myId, await pack(msg), { qos: 0 });
  }
  A.on('gps', () => sendNow());
  A.on('styleChanged', () => { sendNow(true); redrawAll(); });
  setInterval(() => sendNow(), 5000);
  window.addEventListener('pagehide', () => { if (client && client.connected && !key) try { client.publish(topic + myId, JSON.stringify({ i: myId, bye: 1 })); } catch { /* niente */ } });

  // ---------- giocatori sulla mappa ----------
  function peerHTML(p) {
    if (A.style && A.style.peerHTML) return A.style.peerHTML(p);
    return `<i class="pa"></i><b class="pn">${esc(p.n || '?')}</b>`;
  }
  function upsert(o) {
    let p = M.peers.get(o.i); const now = performance.now();
    if (!p) {
      const el = document.createElement('div'); el.className = 'peer';
      const mk = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([o.o, o.a]).addTo(A.map);
      p = { id: o.i, el, mk, from: [o.a, o.o], to: [o.a, o.o], t0: now, shown: [o.a, o.o] };
      M.peers.set(o.i, p);
      el.addEventListener('click', ev => { ev.stopPropagation(); peerPopup(p); });
      Object.assign(p, o); draw(p);
      A.emit('peerJoin', p);
      if (!replyT) replyT = setTimeout(() => { replyT = 0; sendNow(true); }, 300 + Math.random() * 600); // chi arriva ci vede subito
      if (!A.drive.on) A.toast(`${o.n || 'Un giocatore'} è online`, 2500);
    } else {
      const changed = p.n !== o.n || p.c !== o.c || p.s !== o.s;
      p.from = p.shown.slice(); p.to = [o.a, o.o]; p.t0 = now;
      Object.assign(p, o); if (changed) draw(p);
    }
    p.seen = Date.now(); A.emit('peers', M.peers);
  }
  function draw(p) { p.el.style.setProperty('--c', p.c || '#fff'); p.el.classList.toggle('drv', !!p.d); p.el.innerHTML = peerHTML(p); }
  function redrawAll() { for (const p of M.peers.values()) draw(p); }
  function drop(id, quiet) {
    const p = M.peers.get(id); if (!p) return;
    p.mk.remove(); M.peers.delete(id);
    if (!quiet) { A.emit('peerLeave', p); A.emit('peers', M.peers); }
  }
  setInterval(() => { const now = Date.now(); for (const p of [...M.peers.values()]) if (now - p.seen > 45000) drop(p.id); status(); }, 5000);
  (function anim() {
    const now = performance.now(), b = A.map.getBearing();
    for (const p of M.peers.values()) {
      const k = Math.min(1, (now - p.t0) / 1900), la = p.from[0] + (p.to[0] - p.from[0]) * k, lo = p.from[1] + (p.to[1] - p.from[1]) * k;
      p.shown = [la, lo]; p.mk.setLngLat([lo, la]);
      const a = p.el.firstElementChild; if (a && a.classList.contains('pa')) a.style.transform = `rotate(${(p.h || 0) - b}deg)`;
    }
    requestAnimationFrame(anim);
  })();
  function peerPopup(p) {
    const st = A.styles[p.s], kmh = Math.round((p.v || 0) * 3.6);
    const el = A.openPopup([p.shown[1], p.shown[0]], `<div class="pop"><b>${esc(p.n || '?')}</b><div class="muted">${kmh > 3 ? kmh + ' km/h · ' : 'fermo · '}${p.d ? 'in viaggio' : 'in giro'}${st ? ' · stile ' + esc(st.name) : ''}</div><div class="pbs"><button class="pb" data-x="go">Raggiungilo</button><button class="pb" data-x="x">Chiudi</button></div></div>`);
    el.querySelector('[data-x="go"]').onclick = () => { A.closePopup(); A.setDestination({ lat: p.shown[0], lon: p.shown[1], name: p.n || 'Giocatore' }); };
    el.querySelector('[data-x="x"]').onclick = () => A.closePopup();
  }

  // ---------- pulsante giocatori e impostazioni ----------
  function status() {
    const n = M.peers.size, b = $('btnMP');
    if (b) { b.hidden = !cfg.on; b.querySelector('b').textContent = n; b.classList.toggle('off', !M.connected); }
    const s = $('mpStatus'); if (!s) return;
    s.textContent = !cfg.on ? 'Spento: non condividi e non vedi nessuno.'
      : !M.connected ? (M.err || 'Connessione in corso…')
        : hidden ? 'Sei vicino a Casa: per ora non condividi la posizione (gli altri li vedi).'
          : `Online nella sessione ${normCode(cfg.room) ? 'privata ' + normCode(cfg.room) : 'pubblica'} · ${n ? n + (n === 1 ? ' giocatore: ' : ' giocatori: ') + [...M.peers.values()].map(p => p.n).slice(0, 6).join(', ') : 'nessun altro per ora'}`;
  }
  M.status = status;
  function listPopup() {
    const ps = [...M.peers.values()];
    const c = A.map.getCenter();
    const el = A.openPopup(c, `<div class="pop"><b>Giocatori online (${ps.length})</b>${ps.length ? '<ul class="mplist">' + ps.map(p => `<li data-id="${p.id}"><i style="background:${esc(p.c || '#fff')}"></i>${esc(p.n || '?')}<span>${p.d ? 'in viaggio' : ''}</span></li>`).join('') + '</ul>' : '<div class="muted">Nessun altro per ora.</div>'}<div class="pbs"><button class="pb" data-x="x">Chiudi</button></div></div>`);
    el.querySelectorAll('[data-id]').forEach(li => li.onclick = () => { const p = M.peers.get(li.dataset.id); A.closePopup(); if (p) { A.cam.follow(false); A.map.flyTo({ center: [p.shown[1], p.shown[0]], zoom: 15.5 }); setTimeout(() => peerPopup(p), 900); } });
    el.querySelector('[data-x="x"]').onclick = () => A.closePopup();
  }
  A.renderMP = () => {
    const box = $('mpBox'); if (!box) return;
    const code = normCode(cfg.room);
    box.innerHTML = `
      <label class="toggle"><input id="mpOn" type="checkbox" ${cfg.on ? 'checked' : ''}><span>Online: mi vedono gli altri e io vedo loro</span></label>
      <label class="select">Nickname<input id="mpNick" maxlength="16" value="${esc(cfg.nick)}" autocomplete="off"></label>
      <div class="mpcolors">${COLORS.map(c => `<button data-c="${c}" class="${c === cfg.color ? 'on' : ''}" style="background:${c}" aria-label="Colore"></button>`).join('')}</div>
      <label class="select">Sessione<select id="mpRoom"><option value="pub" ${code ? '' : 'selected'}>Pubblica: tutti quelli online</option><option value="priv" ${code ? 'selected' : ''}>Privata con codice</option></select></label>
      <div id="mpCodeRow" class="row" ${code ? '' : 'hidden'}><input id="mpCode" maxlength="12" placeholder="CODICE" value="${esc(code)}" autocomplete="off" style="text-transform:uppercase"><button id="mpGen" class="btn ghost small">Nuovo codice</button></div>
      <label class="toggle"><input id="mpHome" type="checkbox" ${cfg.home ? 'checked' : ''}><span>Non condividere a meno di 400 m da Casa</span></label>
      <p id="mpStatus" class="hint"></p>
      <p class="hint">Mentre è acceso, chi è nella stessa sessione vede in diretta dove sei, con il tuo nickname. Nella privata la posizione viaggia cifrata e la legge solo chi ha il codice. Nella pubblica può vederti chiunque usi APEX. Non viene salvato niente.</p>`;
    const re = () => { saveCfg(); connect(); };
    $('mpOn').onchange = () => { cfg.on = $('mpOn').checked; re(); };
    $('mpNick').onchange = () => { cfg.nick = $('mpNick').value.trim().slice(0, 16) || cfg.nick; saveCfg(); sendNow(true); };
    box.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { cfg.color = b.dataset.c; saveCfg(); box.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x === b)); sendNow(true); });
    $('mpRoom').onchange = () => { const priv = $('mpRoom').value === 'priv'; $('mpCodeRow').hidden = !priv; if (!priv) { cfg.room = ''; re(); } else if (!normCode($('mpCode').value)) $('mpGen').click(); };
    $('mpCode').onchange = () => { cfg.room = normCode($('mpCode').value); $('mpCode').value = cfg.room; re(); };
    $('mpGen').onclick = () => { const w = ['SUSA', 'COLLE', 'TURBO', 'APEX', 'DERBY', 'CURVA', 'GHIAIA', 'SALITA']; cfg.room = w[Math.floor(Math.random() * w.length)] + Math.floor(1000 + Math.random() * 9000); $('mpCode').value = cfg.room; re(); };
    $('mpHome').onchange = () => { cfg.home = $('mpHome').checked; saveCfg(); sendNow(true); };
    status();
  };
  A.mpInit = () => {
    const b = $('btnMP'); if (b) b.onclick = listPopup;
    status(); if (cfg.on) connect();
  };
})();
