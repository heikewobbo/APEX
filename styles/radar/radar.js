/* APEX — stile RADAR: schermo a fosfori verdi, anelli di distanza, scansione rotante,
   autovelox come contatti, comunicazioni via radio */
(function () {
  'use strict';
  const A = window.APEX, $ = A.$, esc = A.esc, D = A.draw;
  const ID = 'radar';
  const S = () => A.ss(ID);
  const save = () => A.saveSS(ID);
  const G = '#3cff6e';
  const snd = (n, type = 'sine', v = .1) => { if (S().sounds) A.voice.tone(n, type, v); };
  const ping = () => snd([[1180, .05, 0], [1180, .25, .07]], 'sine', .12);
  const squelch = () => snd([[2400, .03, 0], [1800, .03, .03]], 'square', .04);
  const speak = t => { if (!A.wantsInstrVoice()) return; squelch(); setTimeout(() => A.voice.speak(S().radio ? t.replace(/\.$/, '') + '. Passo.' : t), 120); };
  const pad = (n, k = 3) => String(Math.max(0, Math.round(n))).padStart(k, '0');

  function restyle(map) {
    for (const l of map.getStyle().layers) {
      const id = l.id, sl = l['source-layer'] || '', key = id + ' ' + sl;
      try {
        if (l.type === 'background') map.setPaintProperty(id, 'background-color', '#020a04');
        else if (l.type === 'fill') {
          if (l.paint && l.paint['fill-pattern'] !== undefined) map.setPaintProperty(id, 'fill-pattern', undefined);
          if (/water|ocean|lake/.test(key)) { map.setPaintProperty(id, 'fill-color', '#03170c'); map.setPaintProperty(id, 'fill-outline-color', '#1d7a3c'); }
          else if (/building/.test(key)) { map.setPaintProperty(id, 'fill-color', '#041208'); map.setPaintProperty(id, 'fill-outline-color', '#145a2a'); }
          else { map.setPaintProperty(id, 'fill-color', '#020a04'); map.setPaintProperty(id, 'fill-outline-color', /wood|forest/.test(key) ? '#0c3a1a' : 'rgba(0,0,0,0)'); }
        }
        else if (l.type === 'fill-extrusion') map.setLayoutProperty(id, 'visibility', 'none');
        else if (l.type === 'line') {
          const c = v => map.setPaintProperty(id, 'line-color', v);
          if (/boundary|admin/.test(key)) c('#145a2a');
          else if (/water|river|stream|canal/.test(key)) c('#1d7a3c');
          else if (/casing/.test(id)) map.setPaintProperty(id, 'line-opacity', 0);
          else if (/rail|transit/.test(key)) { c('#1d7a3c'); try { map.setPaintProperty(id, 'line-dasharray', [2, 2]); } catch { /* niente */ } }
          else if (/path|track|pedestrian|footway|cycle|steps/.test(id)) c('#0f4a22');
          else if (/motorway|trunk|primary/.test(id)) c(G);
          else c('#22a04a');
        }
        else if (l.type === 'symbol') {
          if (sl === 'poi' || /poi|shield|housenum/.test(id)) { map.setLayoutProperty(id, 'visibility', 'none'); continue; }
          if (l.layout && l.layout['text-field'] !== undefined) { map.setPaintProperty(id, 'text-color', '#5cff86'); map.setPaintProperty(id, 'text-halo-color', '#020a04'); map.setPaintProperty(id, 'text-halo-width', 1.5); map.setLayoutProperty(id, 'text-transform', 'uppercase'); }
        }
        else if (l.type === 'hillshade') map.setLayoutProperty(id, 'visibility', 'none');
      } catch { /* niente */ }
    }
  }
  const diamond = (c) => `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path d="M12 3l9 9-9 9-9-9z" fill="none" stroke="${c}" stroke-width="2.2"/><circle cx="12" cy="12" r="2" fill="${c}"/></svg>`;
  const ICONS = { cam: diamond('#ffb020'), tutor: diamond('#ff6a2a'), block: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"><path d="M4 4l16 16M20 4L4 20" stroke="#ff3b30" stroke-width="3"/><rect x="3" y="3" width="18" height="18" fill="none" stroke="#ff3b30" stroke-width="2"/></svg>' };

  const HUD = `
    <div class="rdtop"><span>HDG <b id="rdHdg">000</b></span><span>SPD <b id="rdSpd">000</b></span><span>LIM <b id="rdLim">---</b></span></div>
    <div class="rdwpt"><div id="rdArrow" class="rdarrow"></div><div><div class="rdl">WPT <b id="rdN">1</b> · <b id="rdDist">----</b></div><div id="rdText" class="rdt"></div></div></div>
    <div class="rdbot"><span>DTG <b id="rdRem">--</b></span><span>ETA <b id="rdEta">--:--</b></span><span>RNG <b id="rdRng">--</b></span></div>
    <div id="rdWarn" class="rdwarn" hidden>VELOCITÀ ECCESSIVA</div>
    <div id="rdRadio" class="rdradio"></div>
    <div class="rdctrls"><button id="rdMute" aria-label="Radio">RAD</button><button id="rdRoad" aria-label="Strada chiusa">BLK</button><button id="rdEnd" aria-label="Termina">END</button></div>`;
  let curMan = null, radioT, endArm = 0, roadArm = 0;
  function radio(t, ms = 5000) { const el = $('rdRadio'); if (!el) return; el.textContent = '[RADIO] ' + t; el.classList.add('on'); clearTimeout(radioT); radioT = setTimeout(() => el.classList.remove('on'), ms); }
  function ringMeters() { const z = A.map.getZoom(), lat = A.map.getCenter().lat, mpp = 40075016.686 * Math.cos(lat * Math.PI / 180) / (512 * Math.pow(2, z)); const raw = mpp * 80, steps = [50, 100, 200, 250, 500, 1000, 2000, 5000]; return steps.find(s => s >= raw * .8) || 5000; }
  function onTick(t) {
    const m = t.next;
    if (m !== curMan) { curMan = m; ping(); $('rdArrow').innerHTML = D.arrow(m, G, 4.6); $('rdText').textContent = m ? (D.short(m) + (m.name ? ' · ' + m.name : '')).toUpperCase() : ''; $('rdN').textContent = m ? A.cur.man.indexOf(m) + 1 : '-'; }
    $('rdDist').textContent = m ? A.fmtDist(m.s - t.s).toUpperCase() : '----';
    const hd = A.drive.lastHeading != null ? A.drive.lastHeading : (A.gps.heading || 0);
    $('rdHdg').textContent = pad((hd + 360) % 360); $('rdSpd').textContent = pad(t.kmh); $('rdLim').textContent = t.limit ? pad(t.limit) : '---';
    const over = !!(t.limit && t.kmh > t.limit + 5); $('rdWarn').hidden = !over; document.body.classList.toggle('rd-over', over);
    $('rdRem').textContent = A.fmtDist(t.rem).toUpperCase(); $('rdEta').textContent = A.clock(t.eta);
    const r = ringMeters(); $('rdRng').textContent = r >= 1000 ? r / 1000 + ' KM' : r + ' M';
  }
  function settingsHTML() {
    const s = S();
    return `<h3>Radar</h3>
      <label class="toggle"><input id="rdtSweep" type="checkbox" ${s.sweep ? 'checked' : ''}><span>Scansione rotante e anelli di distanza</span></label>
      <label class="toggle"><input id="rdtRadio" type="checkbox" ${s.radio ? 'checked' : ''}><span>Voce da radio ("… Passo.")</span></label>
      <label class="toggle"><input id="rdtSnd" type="checkbox" ${s.sounds ? 'checked' : ''}><span>Suoni (ping e fruscio radio)</span></label>`;
  }
  function bindSettings() {
    const s = S();
    $('rdtSweep').onchange = () => { s.sweep = $('rdtSweep').checked; save(); A.vehicle.redraw(); };
    $('rdtRadio').onchange = () => { s.radio = $('rdtRadio').checked; save(); };
    $('rdtSnd').onchange = () => { s.sounds = $('rdtSnd').checked; save(); };
  }
  let off = [];
  A.registerStyle({
    id: ID, name: 'Radar', tagline: 'fosfori verdi',
    defaults: { sweep: true, radio: true, sounds: true },
    instrDefault: true,
    icons: ICONS,
    routeTheme: { route: '#c8ffd6', casing: G, casingOpacity: .35, width: 3.5, alt: '#1d7a3c', done: '#145a2a' },
    restyle,
    addLayers(map) { try { map.setPaintProperty('apex-route-casing', 'line-blur', 4); map.setPaintProperty('apex-route', 'line-dasharray', [3, 1.5]); } catch { /* niente */ } },
    vehicle() {
      const rings = S().sweep ? '<div class="rdrings"><i></i><i></i><i></i><i></i><div class="rdsweep"></div></div>' : '';
      return { html: `${rings}<svg class="rdme" viewBox="0 0 36 40"><path d="M18 3 L31 35 L18 27 L5 35 Z" fill="none" stroke="${G}" stroke-width="3" stroke-linejoin="round"/><circle cx="18" cy="21" r="2.5" fill="${G}"/></svg>`, align: 'map', cls: 'rdveh' };
    },
    driveVehicleMode: () => 'top',
    camera(p) { if (!p.drive) return { pitch: 0, padTop: 0.2 }; const v = p.speed * 3.6; return { pitch: 0, padTop: 0.12, zoom: v > 90 ? 14.6 : v > 60 ? 15.2 : 15.8 }; },
    settingsHTML, bindSettings,
    peerHTML: p => `<i class="pa"></i><b class="pn">${esc((p.n || '?').toUpperCase())}</b>`,
    mount() {
      $('hud').innerHTML = HUD;
      const mute = () => { $('rdMute').classList.toggle('off', !!A.settings.muted); };
      $('rdMute').onclick = () => { A.settings.muted = !A.settings.muted; A.saveSettings(); mute(); if (A.settings.muted) A.voice.stop(); }; mute();
      $('rdEnd').onclick = () => { if (Date.now() - endArm < 3000) { endArm = 0; A.drive.stop(); } else { endArm = Date.now(); radio('Conferma fine missione: tocca di nuovo END', 3000); } };
      $('rdRoad').onclick = () => {
        const f = A.drive.fix; if (!f) return;
        if (Date.now() - roadArm < 3000) { roadArm = 0; A.addBlock(A.pointAtS(A.cur.route, A.drive.estS() + 40).ll); radio('Strada bloccata segnata. Calcolo rotta alternativa.'); A.drive.nextReroute = 0; A.drive.reroute(f.ll[0], f.ll[1], A.drive.lastHeading); }
        else { roadArm = Date.now(); radio('Strada bloccata davanti? Tocca di nuovo BLK', 3000); }
      };
      off = [
        A.on('driveStart', d => { $('hud').hidden = false; curMan = undefined; if (d && d.resume) return; const dest = (A.plan.to || {}).name || 'destinazione'; radio(`Missione verso ${dest.toUpperCase()}. ${A.fmtDist(A.cur.route.length)}.`); speak(`Qui navigazione. Rotta impostata, ${A.spokenDist(A.cur.route.length)}.`); }),
        A.on('driveStop', () => { $('hud').hidden = true; document.body.classList.remove('rd-over'); }),
        A.on('tick', onTick),
        A.on('instr', i => { radio(i.text.replace(/\.$/, '').toUpperCase(), 4500); speak(i.text); }),
        A.on('cam', c => { snd([[880, .1, 0], [880, .1, .2], [880, .1, .4]], 'square', .07); const w = c.type === 'tutor' ? 'tutor' : 'autovelox'; radio(`CONTATTO: ${w.toUpperCase()} A ${A.fmtDist(c.dist).toUpperCase()}${c.max ? ', LIMITE ' + c.max : ''}`); speak(`Contatto: ${w} tra ${A.spokenDist(c.dist)}${c.max ? ', limite ' + c.max : ''}.`); }),
        A.on('via', v => { radio(`Tappa raggiunta: ${v.name}`); speak('Tappa raggiunta.'); }),
        A.on('arrive', () => { snd([[660, .2, 0], [880, .4, .2]], 'sine', .14); radio('Missione compiuta. Rientro alla base.', 7000); speak('Obiettivo raggiunto. Missione compiuta.'); }),
        A.on('reroute', r => { radio('Fuori rotta. Ricalcolo.'); if (r.speak) speak('Fuori rotta. Ricalcolo.'); })
      ];
    },
    unmount() { off.forEach(f => f()); off = []; document.body.classList.remove('rd-over'); $('hud').innerHTML = ''; }
  });
})();
