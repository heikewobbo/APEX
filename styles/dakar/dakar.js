/* APEX — stile ROADBOOK DAKAR: la navigazione dei rally raid. Rotolo di caselle con il disegno
   a tulipano della svolta, km totali e parziali, CAP; contachilometri parziale (TRIP) correggibile. */
(function () {
  'use strict';
  const A = window.APEX, $ = A.$, esc = A.esc, D = A.draw;
  const ID = 'dakar';
  const S = () => A.ss(ID);
  const save = () => A.saveSS(ID);
  const INK = '#1d1a16', ORANGE = '#d64510';
  const pad3 = n => String(Math.round((n % 360 + 360) % 360)).padStart(3, '0');
  const km = m => (m / 1000).toFixed(2);
  const snd = (n, type = 'square', v = .08) => { if (S().sounds) A.voice.tone(n, type, v); };
  const click = () => snd([[1900, .03, 0]], 'square', .06);
  const speak = t => { if (A.wantsInstrVoice()) A.voice.speak(t); };

  // ---------- tulipano ----------
  function turnDelta(route, m) {
    const before = A.routeBearing(route, Math.max(0, m.s - 30)), after = A.routeBearing(route, Math.min(route.length - 1, m.s + 35));
    let d = ((after - before + 540) % 360) - 180;
    if (Math.abs(d) < 12 && m.mod && m.mod !== 'straight') d = D.angle(m) * .6;
    return d;
  }
  function tulip(m, route) {
    const thin = `stroke="#8a8072" stroke-width="3" fill="none" stroke-linecap="round"`, thick = `stroke="${INK}" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
    const head = (x, y, a) => { const p = k => `${(x + Math.sin(a + k) * 9).toFixed(1)},${(y - Math.cos(a + k) * 9).toFixed(1)}`; return `<path d="M${(x + Math.sin(a) * 4).toFixed(1)},${(y - Math.cos(a) * 4).toFixed(1)} L${p(2.6)} L${p(-2.6)} Z" fill="${INK}"/>`; };
    if (m.type === 'arrive') return `<svg viewBox="0 0 80 80"><circle cx="40" cy="72" r="4" fill="${INK}"/><path d="M40 68 V22" ${thick}/><path d="M40 10 h26 v16 h-26 z" fill="#fff" stroke="${INK}" stroke-width="2"/><path d="M40 10h6.5v4h-6.5zM53 10h6.5v4H53zM46.5 14H53v4h-6.5zM59.5 14H66v4h-6.5zM40 18h6.5v4H40zM53 18h6.5v4H53zM46.5 22H53v4h-6.5zM59.5 22H66v4h-6.5z" fill="${INK}"/><path d="M40 10v58" stroke="${INK}" stroke-width="2"/></svg>`;
    const d = turnDelta(route, m), a = d * Math.PI / 180;
    if (D.isRound(m)) {
      const r = 13, cx = 40, cy = 38;
      const exitA = (d + 360) % 360; // 0 = dritto, 90 = destra (senso antiorario visto dall'alto: entri da sotto e giri a destra)
      const sweep = (180 - exitA + 360) % 360 || 360;
      const pt = ang => [cx + Math.sin(ang * Math.PI / 180) * r, cy - Math.cos(ang * Math.PI / 180) * r];
      const [sx, sy] = pt(180), [ex, ey] = pt(exitA), large = sweep > 180 ? 1 : 0;
      const ox = cx + Math.sin(exitA * Math.PI / 180) * 34, oy = cy - Math.cos(exitA * Math.PI / 180) * 34;
      let others = '';
      for (const g of [90, 0, 270]) if (Math.abs(((g - exitA + 540) % 360) - 180) > 25) { const [gx, gy] = pt(g); others += `<path d="M${gx.toFixed(1)},${gy.toFixed(1)} L${(cx + Math.sin(g * Math.PI / 180) * 30).toFixed(1)},${(cy - Math.cos(g * Math.PI / 180) * 30).toFixed(1)}" ${thin}/>`; }
      return `<svg viewBox="0 0 80 80"><circle cx="${cx}" cy="${cy}" r="${r}" ${thin}/>${others}<circle cx="40" cy="74" r="4" fill="${INK}"/><path d="M40 72 V${sy.toFixed(1)} A${r} ${r} 0 ${large} 0 ${ex.toFixed(1)} ${ey.toFixed(1)} L${ox.toFixed(1)},${oy.toFixed(1)}" ${thick}/>${head(ox, oy, exitA * Math.PI / 180)}</svg>`;
    }
    const cx = 40, cy = 40, ox = cx + Math.sin(a) * 30, oy = cy - Math.cos(a) * 30;
    const straightThin = Math.abs(d) > 20 ? `<path d="M40 40 V8" ${thin}/>` : '';
    const opp = Math.abs(d) > 45 && Math.abs(d) < 135 ? `<path d="M40 40 L${(40 - Math.sin(a) * 26).toFixed(1)},${(40 + Math.cos(a) * 26).toFixed(1)}" ${thin}/>` : '';
    return `<svg viewBox="0 0 80 80">${straightThin}${opp}<circle cx="40" cy="72" r="4" fill="${INK}"/><path d="M40 70 V40 L${ox.toFixed(1)},${oy.toFixed(1)}" ${thick}/>${head(ox, oy, a)}</svg>`;
  }
  function caseHTML(m, i, cur, prevS) {
    const cap = m.type === 'arrive' ? '' : pad3(D.capAfter(cur.route, m)) + '°';
    const cam = (cur.camsOn || []).find(c => c.s > (prevS ? prevS + 120 : -1) && c.s <= m.s + 120);
    const lim = A.limitAtS(m.s + 40);
    const notes = [m.name ? `<b>${esc(m.name)}</b>` : '', D.isRound(m) ? `rotonda ${m.exit ? m.exit + 'ª' : ''}` : '', cam ? `<span class="dkdanger">!! ${cam.type === 'tutor' ? 'TUTOR' : 'AUTOVELOX'}${cam.max ? ' ' + cam.max : ''}</span>` : ''].filter(Boolean).join('<br>');
    return `<li class="dkcase" data-i="${i}"><div class="dkc1"><i>${i + 1}</i><b>${km(m.s)}</b><span>${km(m.s - (prevS || 0))}</span></div><div class="dkc2">${tulip(m, cur.route)}</div><div class="dkc3">${cap ? `<div class="dkcap">CAP ${cap}</div>` : '<div class="dkcap">ARRIVO</div>'}<div class="dknote">${notes}</div>${lim && m.type !== 'arrive' ? `<div class="dklim">${lim}</div>` : ''}</div></li>`;
  }
  const allCases = cur => cur.man.map((m, i) => caseHTML(m, i, cur, i ? cur.man[i - 1].s : 0)).join('');

  // ---------- mappa del deserto ----------
  function restyle(map) {
    for (const l of map.getStyle().layers) {
      const id = l.id, sl = l['source-layer'] || '', key = id + ' ' + sl;
      try {
        if (l.type === 'background') map.setPaintProperty(id, 'background-color', '#e8d3a8');
        else if (l.type === 'fill') {
          if (l.paint && l.paint['fill-pattern'] !== undefined) map.setPaintProperty(id, 'fill-pattern', undefined);
          let c = '#e8d3a8', o = 'rgba(0,0,0,0)';
          if (/water|ocean|lake/.test(key)) { c = '#7fb6b0'; o = '#5f948e'; } else if (/wood|forest/.test(key)) c = '#c9b37a'; else if (/park|grass|scrub|meadow/.test(key)) c = '#dcc796'; else if (/sand|beach/.test(key)) c = '#efd9a8'; else if (/building/.test(key)) { c = '#cfae7c'; o = '#a98652'; } else if (/residential|landuse/.test(key)) c = '#e2caa0';
          map.setPaintProperty(id, 'fill-color', c); map.setPaintProperty(id, 'fill-outline-color', o);
        }
        else if (l.type === 'fill-extrusion') map.setLayoutProperty(id, 'visibility', 'none');
        else if (l.type === 'line') {
          const c = v => map.setPaintProperty(id, 'line-color', v);
          if (/boundary|admin/.test(key)) c('#a98652');
          else if (/water|river|stream|canal/.test(key)) c('#5f948e');
          else if (/casing/.test(id)) map.setPaintProperty(id, 'line-opacity', 0);
          else if (/rail|transit/.test(key)) c('#6b5a44');
          else if (/path|track|pedestrian|footway|cycle|steps/.test(id)) { c('#a07a4a'); try { map.setPaintProperty(id, 'line-dasharray', [2, 1.5]); } catch { /* niente */ } }
          else if (/motorway|trunk/.test(id)) c('#5a3a1e');
          else if (/primary|secondary/.test(id)) c('#6e4a28');
          else c('#8a6238');
        }
        else if (l.type === 'symbol') {
          if (sl === 'poi' || /poi|shield|housenum/.test(id)) { map.setLayoutProperty(id, 'visibility', 'none'); continue; }
          if (l.layout && l.layout['text-field'] !== undefined) { map.setPaintProperty(id, 'text-color', '#4a3218'); map.setPaintProperty(id, 'text-halo-color', '#efe0bf'); map.setPaintProperty(id, 'text-halo-width', 1.4); }
        }
        else if (l.type === 'hillshade') map.setPaintProperty(id, 'hillshade-shadow-color', '#8a6a40');
      } catch { /* niente */ }
    }
  }

  // ---------- HUD: strumento (TRIP, CAP) + rotolo ----------
  const HUD = `
    <div class="dkico"><div class="dktrip"><i>TRIP</i><b id="dkTrip">0.00</b></div><div class="dkcapnow"><i>CAP</i><b id="dkCap">000</b></div><div class="dkspd"><b id="dkSpd">0</b><i>km/h</i></div>
      <div class="dkbtns"><button id="dkMinus" aria-label="Meno">−</button><button id="dkPlus" aria-label="Più">+</button><button id="dkReset" aria-label="Azzera">0</button></div></div>
    <div class="dkroll"><ul id="dkRoll"></ul></div>
    <div class="dkctrls"><button id="dkMute" aria-label="Voce">VOCE</button><button id="dkEnd" aria-label="Termina">STOP</button></div>
    <div id="dkMsg" class="dkmsg"></div>`;
  let curIdx = -1, msgT, endArm = 0, trip0 = 0, corr = 0, lastS = 0;
  function msg(t, ms = 3000) { const el = $('dkMsg'); if (!el) return; el.textContent = t; el.classList.add('on'); clearTimeout(msgT); msgT = setTimeout(() => el.classList.remove('on'), ms); }
  function renderRoll() { const cur = A.cur; if (!cur || !$('dkRoll')) return; $('dkRoll').innerHTML = allCases(cur); curIdx = -1; }
  function onTick(t) {
    lastS = t.s;
    const m = t.next, idx = m ? A.cur.man.indexOf(m) : -1;
    if (idx !== curIdx && idx >= 0) {
      curIdx = idx; click();
      const ul = $('dkRoll'); [...ul.children].forEach((li, i) => { li.classList.toggle('done', i < idx); li.classList.toggle('now', i === idx); });
      const li = ul.children[idx]; if (li) ul.style.transform = `translateY(${-li.offsetTop}px)`;
    }
    const hd = A.drive.lastHeading != null ? A.drive.lastHeading : (A.gps.heading || 0);
    $('dkTrip').textContent = Math.max(0, (t.s - trip0) / 1000 + corr).toFixed(2);
    $('dkCap').textContent = pad3(hd); $('dkSpd').textContent = t.kmh;
    document.body.classList.toggle('dk-over', !!(t.limit && t.kmh > t.limit + 5));
    const now = $('dkRoll').children[idx]; if (now) { const sp = now.querySelector('.dkc1 span'); if (sp) sp.textContent = 'tra ' + A.fmtDist(m.s - t.s); }
  }
  function renderSheet(box, cur) {
    if (!cur || !cur.man || !cur.man.length) { box.innerHTML = ''; return; }
    box.innerHTML = `<div class="dkbook"><div class="dkbh">Roadbook · ${cur.man.length} caselle · ${km(cur.route.length)} km</div><ul>${allCases(cur)}</ul></div>`;
  }
  function settingsHTML() {
    const s = S();
    return `<h3>Roadbook Dakar</h3>
      <label class="toggle"><input id="dkNum" type="checkbox" ${s.readNum ? 'checked' : ''}><span>La voce dice il numero della casella</span></label>
      <label class="toggle"><input id="dkCapV" type="checkbox" ${s.readCap ? 'checked' : ''}><span>La voce dice il CAP dopo la svolta</span></label>
      <label class="toggle"><input id="dkSnd" type="checkbox" ${s.sounds ? 'checked' : ''}><span>Clic quando cambia casella</span></label>
      <p class="hint">Il TRIP si corregge con − e + (10 metri a tocco) e si azzera con 0, come sullo strumento vero.</p>`;
  }
  function bindSettings() {
    const s = S();
    $('dkNum').onchange = () => { s.readNum = $('dkNum').checked; save(); };
    $('dkCapV').onchange = () => { s.readCap = $('dkCapV').checked; save(); };
    $('dkSnd').onchange = () => { s.sounds = $('dkSnd').checked; save(); };
  }
  let off = [];
  A.registerStyle({
    id: ID, name: 'Roadbook Dakar', tagline: 'caselle e tulipani',
    defaults: { readNum: true, readCap: true, sounds: true },
    instrDefault: true,
    routeTheme: { route: ORANGE, casing: '#fff3dc', casingOpacity: .9, width: 5, alt: '#8a6238', done: '#b89a74' },
    restyle,
    vehicle() { return { html: `<svg viewBox="0 0 36 40"><path d="M18 2 L32 36 L18 28 L4 36 Z" fill="${ORANGE}" stroke="#fff3dc" stroke-width="2.5" stroke-linejoin="round"/></svg>`, align: 'map', cls: 'dkveh' }; },
    driveVehicleMode: () => 'top',
    camera(p) { if (!p.drive) return { pitch: 0, padTop: 0.2 }; const v = p.speed * 3.6; return { pitch: 30, padTop: 0.66, zoom: v > 90 ? 15.2 : v > 60 ? 15.8 : 16.4 }; },
    renderSheet,
    settingsHTML, bindSettings,
    mount() {
      $('hud').innerHTML = HUD;
      const mute = () => { $('dkMute').classList.toggle('off', !!A.settings.muted); };
      $('dkMute').onclick = () => { A.settings.muted = !A.settings.muted; A.saveSettings(); mute(); if (A.settings.muted) A.voice.stop(); }; mute();
      $('dkEnd').onclick = () => { if (Date.now() - endArm < 3000) { endArm = 0; A.drive.stop(); } else { endArm = Date.now(); msg('Tocca di nuovo STOP per finire', 2500); } };
      $('dkMinus').onclick = () => { click(); corr -= 0.01; }; $('dkPlus').onclick = () => { click(); corr += 0.01; };
      $('dkReset').onclick = () => { click(); trip0 = lastS; corr = 0; };
      off = [
        A.on('route', () => { if (A.drive.on) renderRoll(); }),
        A.on('driveStart', d => { $('hud').hidden = false; renderRoll(); if (d && d.resume) return; trip0 = 0; corr = 0; msg(`Partenza · ${A.cur.man.length} caselle · ${km(A.cur.route.length)} km`, 3500); speak(`Roadbook pronto. ${A.cur.man.length} caselle, ${A.spokenDist(A.cur.route.length)}.`); }),
        A.on('driveStop', () => { $('hud').hidden = true; document.body.classList.remove('dk-over'); }),
        A.on('tick', onTick),
        A.on('instr', i => {
          const s = S(), n = A.cur.man.indexOf(i.man) + 1, cap = i.man.type !== 'arrive' && s.readCap && i.phase !== 'now' ? ` Cap ${pad3(D.capAfter(A.cur.route, i.man)).split('').join(' ')}.` : '';
          speak((i.phase === 'far' && s.readNum ? `Casella ${n}. ` : '') + i.text + (i.phase === 'far' ? cap : ''));
        }),
        A.on('cam', c => { msg(`!! ${c.type === 'tutor' ? 'TUTOR' : 'AUTOVELOX'} ${A.fmtDist(c.dist)}${c.max ? ' · ' + c.max : ''}`, 4500); snd([[1400, .08, 0], [1400, .08, .14]], 'square', .08); speak(`Pericolo, ${c.type === 'tutor' ? 'tutor' : 'autovelox'} tra ${A.spokenDist(c.dist)}${c.max ? ', limite ' + c.max : ''}.`); }),
        A.on('via', v => { msg('Tappa: ' + v.name, 3000); speak('Tappa raggiunta.'); }),
        A.on('arrive', a => { msg(`ARRIVO · ${km(a.dist)} km · ${A.fmtMin(a.sec)}`, 7000); speak('Arrivo. Speciale finita.'); }),
        A.on('reroute', r => { msg('Ricalcolo del roadbook…', 2500); if (r.speak) speak('Fuori rotta. Ricalcolo.'); })
      ];
      if (A.cur) A.renderSheet();
    },
    unmount() { off.forEach(f => f()); off = []; document.body.classList.remove('dk-over'); $('hud').innerHTML = ''; }
  });
})();
