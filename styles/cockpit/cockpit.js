/* APEX — stile CABINA DI PILOTAGGIO: schermo da glass cockpit. Mappa nera, rotta magenta, nastri di
   velocità e quota, bussola HSI, annunciatori, voce da pilota (inglese o italiano). */
(function () {
  'use strict';
  const A = window.APEX, $ = A.$, esc = A.esc, D = A.draw;
  const ID = 'cockpit';
  const S = () => A.ss(ID);
  const save = () => A.saveSS(ID);
  const MAG = '#ff3bff', CY = '#2ee6ff';
  const pad = (n, k = 3) => String(Math.round((n % 360 + 360) % 360)).padStart(k, '0');
  const snd = (n, type = 'sine', v = .14) => { if (S().sounds) A.voice.tone(n, type, v); };
  const caution = () => snd([[880, .14, 0], [660, .2, .16]], 'square', .08);
  const dingdong = () => snd([[784, .35, 0], [622, .6, .32]], 'sine', .16);
  const en = () => S().lang === 'en';
  const say = (it, enText) => { if (!A.wantsInstrVoice()) return; if (en()) A.voice.speak(enText, { lang: 'en-GB', rate: 1.02 }); else A.voice.speak(it); };

  // ---------- frasi da pilota ----------
  const ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
  const DIG = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'niner'];
  const hdgWords = h => pad(h).split('').map(d => DIG[+d]).join(' ');
  function actionEN(m) {
    if (!m) return '';
    if (m.type === 'arrive') return m.final ? 'destination ahead' : 'waypoint ahead';
    if (D.isRound(m)) return m.exit ? `at the roundabout, take the ${ORD[m.exit] || m.exit} exit` : 'enter the roundabout';
    const mod = m.mod || 'straight', side = /right/.test(mod) ? 'right' : 'left';
    if (m.type === 'merge') return 'merge ' + side;
    if (m.type === 'fork') return 'keep ' + side;
    if (m.type === 'off ramp') return 'take the exit on the ' + side;
    return { straight: 'continue straight', 'slight right': 'bear right', right: 'turn right', 'sharp right': 'hard right', 'slight left': 'bear left', left: 'turn left', 'sharp left': 'hard left', uturn: 'make a U-turn' }[mod] || 'continue';
  }
  const distEN = d => d >= 1000 ? `${(Math.round(d / 100) / 10).toString()} kilometers` : `${Math.max(50, Math.round(d / 50) * 50)} meters`;
  const capFirst = s => s.charAt(0).toUpperCase() + s.slice(1);
  const shortEN = m => !m ? '' : m.type === 'arrive' ? (m.final ? 'DEST' : 'WPT') : D.isRound(m) ? `RNDBT EXIT ${m.exit || ''}` : ({ straight: 'STRAIGHT', 'slight right': 'BEAR R', right: 'TURN R', 'sharp right': 'HARD R', 'slight left': 'BEAR L', left: 'TURN L', 'sharp left': 'HARD L', uturn: 'U-TURN' }[m.mod] || 'CONT');

  // ---------- mappa ----------
  function restyle(map) {
    for (const l of map.getStyle().layers) {
      const id = l.id, sl = l['source-layer'] || '', key = id + ' ' + sl;
      try {
        if (l.type === 'background') map.setPaintProperty(id, 'background-color', '#05080c');
        else if (l.type === 'fill') {
          if (l.paint && l.paint['fill-pattern'] !== undefined) map.setPaintProperty(id, 'fill-pattern', undefined);
          let c = '#05080c', o = 'rgba(0,0,0,0)';
          if (/water|ocean|lake/.test(key)) { c = '#0a2440'; o = '#174a7a'; } else if (/wood|forest/.test(key)) c = '#071a10'; else if (/park|grass/.test(key)) c = '#08140e'; else if (/building/.test(key)) { c = '#111827'; o = '#1f2937'; }
          map.setPaintProperty(id, 'fill-color', c); map.setPaintProperty(id, 'fill-outline-color', o);
        }
        else if (l.type === 'fill-extrusion') map.setLayoutProperty(id, 'visibility', 'none');
        else if (l.type === 'line') {
          const c = v => map.setPaintProperty(id, 'line-color', v);
          if (/boundary|admin/.test(key)) c('#3b4252');
          else if (/water|river|stream|canal/.test(key)) c('#174a7a');
          else if (/casing/.test(id)) map.setPaintProperty(id, 'line-opacity', 0);
          else if (/rail|transit/.test(key)) c('#3b4252');
          else if (/path|track|pedestrian|footway|cycle|steps/.test(id)) c('#1f2733');
          else if (/motorway|trunk/.test(id)) c('#8a96a8');
          else if (/primary|secondary/.test(id)) c('#5d6878');
          else c('#353e4c');
        }
        else if (l.type === 'symbol') {
          if (sl === 'poi' || /poi|shield|housenum/.test(id)) { map.setLayoutProperty(id, 'visibility', 'none'); continue; }
          if (l.layout && l.layout['text-field'] !== undefined) { map.setPaintProperty(id, 'text-color', /water/.test(key) ? '#5aa0d8' : '#d6dde8'); map.setPaintProperty(id, 'text-halo-color', '#05080c'); map.setPaintProperty(id, 'text-halo-width', 1.5); map.setLayoutProperty(id, 'text-transform', 'uppercase'); }
        }
        else if (l.type === 'hillshade') map.setLayoutProperty(id, 'visibility', 'none');
      } catch { /* niente */ }
    }
  }
  const wpData = () => A.fc(A.cur && A.cur.man ? A.cur.man.map((m, i) => { const p = A.pointAtS(A.cur.route, m.s).ll; return { type: 'Feature', geometry: { type: 'Point', coordinates: [p[1], p[0]] }, properties: { n: m.type === 'arrive' && m.final ? 'DEST' : 'WP' + (i + 1) } }; }) : []);
  const ICONS = { 'ck-wp': `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z" fill="none" stroke="${MAG}" stroke-width="2"/></svg>`, cam: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path d="M12 2L22 20H2z" fill="none" stroke="#ffb020" stroke-width="2.4"/><path d="M12 8v6M12 16.5v1.5" stroke="#ffb020" stroke-width="2.4"/></svg>', tutor: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path d="M12 2L22 20H2z" fill="none" stroke="#ff7a1a" stroke-width="2.4"/><path d="M12 8v6M12 16.5v1.5" stroke="#ff7a1a" stroke-width="2.4"/></svg>' };

  // ---------- strumenti ----------
  const tickSVG = () => {
    let t = '';
    for (let a = 0; a < 360; a += 5) { const r1 = a % 30 === 0 ? 112 : a % 10 === 0 ? 118 : 123, ra = a * Math.PI / 180; t += `<line x1="${(150 + Math.sin(ra) * r1).toFixed(1)}" y1="${(150 - Math.cos(ra) * r1).toFixed(1)}" x2="${(150 + Math.sin(ra) * 130).toFixed(1)}" y2="${(150 - Math.cos(ra) * 130).toFixed(1)}" stroke="#e5e7eb" stroke-width="${a % 30 === 0 ? 2.4 : 1.4}"/>`; }
    for (let a = 0; a < 360; a += 30) { const lab = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[a] || String(a / 10), ra = a * Math.PI / 180; t += `<text x="${(150 + Math.sin(ra) * 98).toFixed(1)}" y="${(150 - Math.cos(ra) * 98 + 6).toFixed(1)}" transform="rotate(${a} ${(150 + Math.sin(ra) * 98).toFixed(1)} ${(150 - Math.cos(ra) * 98).toFixed(1)})" text-anchor="middle" font-size="${/[NESW]/.test(lab) ? 19 : 16}" fill="${/[NESW]/.test(lab) ? CY : '#e5e7eb'}">${lab}</text>`; }
    return t;
  };
  const HUD = `
    <div class="ckbar"><div><i>GS</i><b id="ckGs">0</b><u>KM/H</u></div><div><i>DTK</i><b id="ckDtk" class="mg">---°</b></div><div><i>TRK</i><b id="ckTrk">---°</b></div><div><i>DIS</i><b id="ckDis" class="mg">--</b></div><div><i>ETE</i><b id="ckEte">--</b></div><div><i>ETA</i><b id="ckEta">--:--</b></div></div>
    <div class="cknext"><div id="ckArrow" class="ckarrow"></div><div><div class="ckn1"><i>NEXT</i> <b id="ckNext"></b></div><div id="ckNext2" class="ckn2"></div></div></div>
    <div class="ckann"><span id="ckOver">OVERSPEED</span><span id="ckCam">CAMERA</span></div>
    <div class="cktape ckspd"><div id="ckSpdScale" class="scale"></div><div class="box"><b id="ckSpd">0</b></div><div class="cap">KM/H</div></div>
    <div class="cktape ckalt"><div id="ckAltScale" class="scale"></div><div class="box"><b id="ckAlt">---</b></div><div class="cap">ALT M</div></div>
    <div class="ckhsi"><svg viewBox="0 0 300 300"><g id="ckRose">${tickSVG()}</g><g id="ckCrs"><path d="M150 40 L158 58 L153 58 L153 260 L147 260 L147 58 L142 58 Z" fill="${MAG}"/></g><path d="M150 14 L141 30 L159 30 Z" fill="#fff"/><path d="M150 150 m-14 6 h28 M150 140 v26 M143 166 h14" stroke="#fff" stroke-width="3" fill="none"/></svg><div class="hdgbox" id="ckHdg">000°</div></div>
    <div class="ckctrls"><button id="ckMute">VOICE</button><button id="ckEnd">END</button></div>
    <div id="ckMsg" class="ckmsg"></div>`;
  let curMan = null, msgT, endArm = 0, overSince = 0, overSaid = 0, camT;
  function msg(t, ms = 4000) { const el = $('ckMsg'); if (!el) return; el.textContent = t; el.classList.add('on'); clearTimeout(msgT); msgT = setTimeout(() => el.classList.remove('on'), ms); }
  function tape(el, v, step, px, fmt, lim) {
    const range = 5; let h = '';
    const base = Math.round(v / step) * step;
    for (let k = -range; k <= range; k++) { const val = base + k * step; if (val < 0) continue; const y = (v - val) * px / step; h += `<span style="transform:translateY(${y.toFixed(1)}px)">${fmt(val)}</span>`; }
    if (lim) { const y = (v - lim) * px / step; h += `<em style="transform:translateY(calc(${y.toFixed(1)}px - 100%))"></em><s style="transform:translateY(${y.toFixed(1)}px)"></s>`; }
    el.innerHTML = h;
  }
  function onTick(t) {
    const m = t.next, hd = A.drive.lastHeading != null ? A.drive.lastHeading : (A.gps.heading || 0);
    if (m !== curMan) {
      curMan = m; $('ckArrow').innerHTML = D.arrow(m, MAG, 4.6);
      $('ckNext').textContent = m ? (en() ? shortEN(m) : D.short(m).toUpperCase()) : '';
      $('ckNext2').textContent = m && m.name ? m.name.toUpperCase() : '';
    }
    const pos = A.drive.fix ? A.drive.fix.ll : (A.gps.fix && A.gps.fix.ll);
    let dtk = null;
    if (m && pos) { const p = A.pointAtS(A.cur.route, m.s).ll; dtk = (A.bearingLL(pos, p) + 360) % 360; }
    $('ckGs').textContent = t.kmh; $('ckTrk').textContent = pad(hd) + '°'; $('ckDtk').textContent = dtk == null ? '---°' : pad(dtk) + '°';
    $('ckDis').textContent = m ? A.fmtDist(m.s - t.s).replace(' ', '') : '--'; $('ckEte').textContent = A.fmtMin(t.remSec).replace(' ', ''); $('ckEta').textContent = A.clock(t.eta);
    $('ckSpd').textContent = t.kmh; tape($('ckSpdScale'), t.kmh, 10, 34, v => v, t.limit);
    const alt = A.gps.fix && A.gps.fix.alt; $('ckAlt').textContent = alt != null ? Math.round(alt) : '---'; tape($('ckAltScale'), alt != null ? alt : 0, 20, 34, v => v, null);
    $('ckRose').setAttribute('transform', `rotate(${(-hd).toFixed(1)} 150 150)`);
    $('ckCrs').setAttribute('transform', `rotate(${dtk == null ? 0 : (dtk - hd).toFixed(1)} 150 150)`); $('ckCrs').style.opacity = dtk == null ? 0 : 1;
    $('ckHdg').textContent = pad(hd) + '°';
    const over = !!(t.limit && t.kmh > t.limit + 5), el = $('ckOver');
    el.classList.toggle('on', over); el.classList.toggle('warn', !!(t.limit && t.kmh > t.limit + 20));
    if (over) { if (!overSince) overSince = Date.now(); if (Date.now() - overSince > 2500 && Date.now() - overSaid > 25000) { overSaid = Date.now(); caution(); say('Velocità eccessiva.', 'Overspeed. Overspeed.'); } } else overSince = 0;
  }
  function settingsHTML() {
    const s = S();
    return `<h3>Cabina di pilotaggio</h3>
      <label class="select"><span>Voce</span><select id="ckLang"><option value="en" ${s.lang === 'en' ? 'selected' : ''}>Da pilota, in inglese ("Turn right, heading zero niner zero")</option><option value="it" ${s.lang === 'it' ? 'selected' : ''}>In italiano</option></select></label>
      <label class="toggle"><input id="ckWp" type="checkbox" ${s.wpts ? 'checked' : ''}><span>Punti di svolta come waypoint sulla mappa</span></label>
      <label class="toggle"><input id="ckSnd" type="checkbox" ${s.sounds ? 'checked' : ''}><span>Suoni di bordo (avvisi, din-don)</span></label>`;
  }
  function bindSettings() {
    const s = S();
    $('ckLang').onchange = () => { s.lang = $('ckLang').value; save(); curMan = undefined; };
    $('ckWp').onchange = () => { s.wpts = $('ckWp').checked; save(); if (A.map.getLayer('ck-wpts')) A.map.setLayoutProperty('ck-wpts', 'visibility', s.wpts ? 'visible' : 'none'); };
    $('ckSnd').onchange = () => { s.sounds = $('ckSnd').checked; save(); };
  }
  let off = [];
  A.registerStyle({
    id: ID, name: 'Cabina di pilotaggio', tagline: 'glass cockpit',
    defaults: { lang: 'en', wpts: true, sounds: true },
    instrDefault: true,
    icons: ICONS,
    routeTheme: { route: MAG, casing: '#000', casingOpacity: .9, width: 4, alt: '#5d6878', done: '#6b2a6b' },
    restyle,
    addLayers(map) {
      if (!map.getSource('ck-wpts')) map.addSource('ck-wpts', { type: 'geojson', data: wpData() });
      map.addLayer({ id: 'ck-wpts', type: 'symbol', source: 'ck-wpts', layout: { 'icon-image': 'apex-ck-wp', 'icon-size': .5, 'icon-allow-overlap': true, 'text-field': ['get', 'n'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-offset': [0, 1.3], 'text-anchor': 'top', visibility: S().wpts ? 'visible' : 'none' }, paint: { 'text-color': MAG, 'text-halo-color': '#05080c', 'text-halo-width': 1.5 } });
    },
    vehicle() { return { html: '<svg viewBox="0 0 40 40"><path d="M20 3 C21.5 3 22 5 22 7 V15 L36 22 V25 L22 21 V31 L27 35 V37 L20 35 L13 37 V35 L18 31 V21 L4 25 V22 L18 15 V7 C18 5 18.5 3 20 3 Z" fill="#fff" stroke="#05080c" stroke-width="1.2"/></svg>', align: 'map', cls: 'ckveh' }; },
    driveVehicleMode: () => 'top',
    camera(p) { if (!p.drive) return { pitch: 0, padTop: 0.2 }; const v = p.speed * 3.6; return { pitch: 0, padTop: 0.22, zoom: v > 90 ? 14.8 : v > 60 ? 15.4 : 16 }; },
    settingsHTML, bindSettings,
    peerHTML: p => `<i class="pa"></i><b class="pn">${esc((p.n || '?').toUpperCase())}${p.v > 1 ? ' ' + Math.round(p.v * 3.6) : ''}</b>`,
    mount() {
      $('hud').innerHTML = HUD;
      const mute = () => { $('ckMute').classList.toggle('off', !!A.settings.muted); };
      $('ckMute').onclick = () => { A.settings.muted = !A.settings.muted; A.saveSettings(); mute(); if (A.settings.muted) A.voice.stop(); }; mute();
      $('ckEnd').onclick = () => { if (Date.now() - endArm < 3000) { endArm = 0; A.drive.stop(); } else { endArm = Date.now(); msg('PRESS END AGAIN TO TERMINATE', 2500); } };
      off = [
        A.on('route', () => { const src = A.map.getSource('ck-wpts'); if (src) src.setData(wpData()); }),
        A.on('routeCleared', () => { const src = A.map.getSource('ck-wpts'); if (src) src.setData(A.fc([])); }),
        A.on('driveStart', d => { $('hud').hidden = false; curMan = undefined; if (d && d.resume) return; dingdong(); msg('FLIGHT PLAN ACTIVE · ' + ((A.plan.to || {}).name || 'DEST').toUpperCase(), 4000); say(`Rotta attiva. ${A.spokenDist(A.cur.route.length)}.`, `Flight plan loaded. ${distEN(A.cur.route.length)}. Have a nice flight.`); }),
        A.on('driveStop', () => { $('hud').hidden = true; }),
        A.on('tick', onTick),
        A.on('instr', i => {
          const m = i.man, act = capFirst(actionEN(m)), h = hdgWords(D.capAfter(A.cur.route, m));
          const enT = i.phase === 'far' ? `In ${distEN(i.dist)}, ${actionEN(m)}.` : i.phase === 'near' ? `${act}${m.type !== 'arrive' ? ', heading ' + h : ''}.` : `${act}, now.`;
          say(i.text, enT);
        }),
        A.on('cam', c => { caution(); const el = $('ckCam'); el.classList.add('on'); clearTimeout(camT); camT = setTimeout(() => el.classList.remove('on'), 9000); say(`${c.type === 'tutor' ? 'Tutor' : 'Autovelox'} tra ${A.spokenDist(c.dist)}${c.max ? ', limite ' + c.max : ''}.`, `Caution. ${c.type === 'tutor' ? 'Average speed check' : 'Speed camera'}, ${distEN(c.dist)}${c.max ? '. Limit ' + c.max : ''}.`); }),
        A.on('via', v => { dingdong(); msg('WAYPOINT ' + (v.name || '').toUpperCase(), 3000); say('Tappa raggiunta.', 'Waypoint reached.'); }),
        A.on('arrive', () => { dingdong(); const n = (A.plan.to || {}).name || ''; msg('ARRIVED · ' + n.toUpperCase(), 7000); say('Sei arrivato a destinazione.', `Destination. Welcome to ${n.split(',')[0]}.`); }),
        A.on('reroute', r => { msg('RECALCULATING', 2500); if (r.speak) say('Ricalcolo del percorso.', 'Recalculating.'); })
      ];
    },
    unmount() { off.forEach(f => f()); off = []; $('hud').innerHTML = ''; }
  });
})();
