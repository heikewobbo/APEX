/* APEX — stile ACQUERELLO: mappa dipinta a mano, carta, nuvole che passano, tutto calmo.
   Ispirato all'atmosfera dei film d'animazione giapponesi, senza personaggi. */
(function () {
  'use strict';
  const A = window.APEX, $ = A.$, esc = A.esc, D = A.draw;
  const ID = 'acquerello';
  const S = () => A.ss(ID);
  const save = () => A.saveSS(ID);
  const PENTA = [523, 587, 659, 784, 880, 1047];
  const snd = (n, v = .1) => { if (S().sounds) A.voice.tone(n, 'sine', v); };
  const chime = () => snd([[PENTA[2], .5, 0], [PENTA[4], .7, .14]]);
  const melody = () => snd(PENTA.map((f, i) => [f, .8, i * .16]), .09);
  const speak = t => { if (A.wantsInstrVoice()) A.voice.speak(t, { rate: 1 }); };

  function restyle(map) {
    for (const l of map.getStyle().layers) {
      const id = l.id, sl = l['source-layer'] || '', key = id + ' ' + sl;
      try {
        if (l.type === 'background') map.setPaintProperty(id, 'background-color', '#f3ead7');
        else if (l.type === 'fill') {
          let c = '#efe4cc', o = 'rgba(0,0,0,0)';
          if (/water|ocean|lake/.test(key)) { c = '#a9cfd8'; o = '#86b4c2'; }
          else if (/wood|forest/.test(key)) { c = '#a9c99a'; o = '#93b886'; }
          else if (/park|grass|meadow|scrub|wetland|cemetery|landcover|natural/.test(key)) c = '#c8dcb0';
          else if (/farm|crop|orchard|vineyard/.test(key)) c = '#e9dfb4';
          else if (/sand|beach/.test(key)) c = '#f1e2b8';
          else if (/building/.test(key)) { c = '#ecc3a8'; o = '#d4a184'; }
          else if (/residential|landuse/.test(key)) c = '#f0e3cd';
          if (l.paint && l.paint['fill-pattern'] !== undefined) map.setPaintProperty(id, 'fill-pattern', undefined);
          map.setPaintProperty(id, 'fill-color', c); map.setPaintProperty(id, 'fill-outline-color', o);
          if (/building/.test(key)) map.setPaintProperty(id, 'fill-opacity', .8);
        }
        else if (l.type === 'fill-extrusion') { map.setPaintProperty(id, 'fill-extrusion-color', '#ecc3a8'); map.setPaintProperty(id, 'fill-extrusion-opacity', .75); }
        else if (l.type === 'line') {
          const c = v => map.setPaintProperty(id, 'line-color', v);
          if (/boundary|admin/.test(key)) { c('#c9a9c4'); try { map.setPaintProperty(id, 'line-dasharray', [2, 2]); } catch { /* niente */ } }
          else if (/water|river|stream|canal/.test(key)) c('#8fbfcc');
          else if (/casing/.test(id)) c('#d9c6a5');
          else if (/rail|transit/.test(key)) c('#b7a3c8');
          else if (/path|track|pedestrian|footway|cycle|steps/.test(id)) c('#d8c3a0');
          else if (/motorway|trunk/.test(id)) c('#f2c38b');
          else if (/primary|secondary/.test(id)) c('#fbe3b6');
          else c('#fffaf0');
        }
        else if (l.type === 'symbol') {
          if (sl === 'poi' || /poi|shield|housenum/.test(id)) { map.setLayoutProperty(id, 'visibility', 'none'); continue; }
          if (l.layout && l.layout['text-field'] !== undefined) { map.setPaintProperty(id, 'text-color', /water/.test(key) ? '#4f7f8c' : '#5d5a6e'); map.setPaintProperty(id, 'text-halo-color', '#f7f0e2'); map.setPaintProperty(id, 'text-halo-width', 1.6); }
        }
        else if (l.type === 'hillshade') map.setPaintProperty(id, 'hillshade-shadow-color', '#9a8fb0');
      } catch { /* niente */ }
    }
  }
  const sun = '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="13" fill="#f6c561"/>' + [...Array(10)].map((_, i) => { const a = i * 36 * Math.PI / 180; return `<path d="M${(32 + Math.sin(a) * 19).toFixed(1)} ${(32 - Math.cos(a) * 19).toFixed(1)}L${(32 + Math.sin(a) * 27).toFixed(1)} ${(32 - Math.cos(a) * 27).toFixed(1)}" stroke="#f6c561" stroke-width="4" stroke-linecap="round"/>`; }).join('') + '</svg>';
  const HUD = `
    <div class="aqcard"><div id="aqArrow" class="aqarrow"></div><div><div id="aqDist" class="aqdist"></div><div id="aqText" class="aqtext"></div></div></div>
    <div class="aqbar"><div class="aqspd"><b id="aqSpd">0</b><span>km/h</span></div><div id="aqLim" class="aqlim" hidden></div><div class="aqrem"><b id="aqRem"></b><span id="aqEta"></span></div>
      <button id="aqMute" class="aqbtn" aria-label="Voce">♪</button><button id="aqEnd" class="aqbtn" aria-label="Termina">✕</button></div>
    <div id="aqNote" class="aqnote"></div>`;
  const OVER = `<div id="aqSky" class="aqsky"><div class="aqpaper"></div><i class="cl c1"></i><i class="cl c2"></i><i class="cl c3"></i><i class="cl c4"></i></div>`;
  let curMan = null, noteT, endArm = 0;
  function note(html, ms = 4200) { const el = $('aqNote'); if (!el) return; el.innerHTML = html; el.classList.add('on'); clearTimeout(noteT); noteT = setTimeout(() => el.classList.remove('on'), ms); }
  function onTick(t) {
    const m = t.next;
    if (m !== curMan) { curMan = m; $('aqArrow').innerHTML = D.arrow(m, '#3f8f8a', 5); $('aqText').innerHTML = m ? esc(A.cap(m.text)) + (m.name ? ` <i>${esc(m.name)}</i>` : '') : ''; if (m) snd([[PENTA[(Math.random() * 5) | 0], .4, 0]], .07); }
    $('aqDist').textContent = m ? A.fmtDist(m.s - t.s) : '';
    $('aqSpd').textContent = t.kmh;
    document.body.classList.toggle('aq-over', !!(t.limit && t.kmh > t.limit + 5));
    $('aqLim').hidden = !t.limit; if (t.limit) $('aqLim').textContent = t.limit;
    $('aqRem').textContent = A.fmtDist(t.rem); $('aqEta').textContent = 'arrivo ' + A.clock(t.eta);
  }
  function settingsHTML() {
    const s = S();
    return `<h3>Acquerello</h3>
      <label class="toggle"><input id="aqtClouds" type="checkbox" ${s.clouds ? 'checked' : ''}><span>Nuvole che passano sopra la mappa</span></label>
      <label class="toggle"><input id="aqtPaper" type="checkbox" ${s.paper ? 'checked' : ''}><span>Carta da acquerello</span></label>
      <label class="toggle"><input id="aqtSnd" type="checkbox" ${s.sounds ? 'checked' : ''}><span>Suoni (campanelli)</span></label>`;
  }
  const looks = () => { document.body.classList.toggle('aq-noclouds', !S().clouds); document.body.classList.toggle('aq-nopaper', !S().paper); };
  function bindSettings() {
    const s = S();
    $('aqtClouds').onchange = () => { s.clouds = $('aqtClouds').checked; save(); looks(); };
    $('aqtPaper').onchange = () => { s.paper = $('aqtPaper').checked; save(); looks(); };
    $('aqtSnd').onchange = () => { s.sounds = $('aqtSnd').checked; save(); };
  }
  let off = [];
  A.registerStyle({
    id: ID, name: 'Acquerello', tagline: 'mappa dipinta',
    defaults: { clouds: true, paper: true, sounds: true },
    instrDefault: true,
    routeTheme: { route: '#e27d60', casing: '#fffaf0', casingOpacity: 1, width: 6, alt: '#b7a3c8', done: '#d8b8a8' },
    restyle,
    vehicle() { return { html: '<svg viewBox="0 0 40 40"><path d="M20 3 L34 35 L20 26 Z" fill="#fffaf0" stroke="#3f6f7a" stroke-width="2" stroke-linejoin="round"/><path d="M20 3 L6 35 L20 26 Z" fill="#e6efe9" stroke="#3f6f7a" stroke-width="2" stroke-linejoin="round"/><path d="M20 3 V26" stroke="#3f6f7a" stroke-width="1.5"/></svg>', align: 'map', cls: 'aqveh' }; },
    driveVehicleMode: () => 'top',
    camera(p) { if (!p.drive) return { pitch: 0, padTop: 0.2 }; const v = p.speed * 3.6; return { pitch: 35, padTop: 0.35, zoom: v > 90 ? 15.3 : v > 60 ? 15.9 : 16.5 }; },
    settingsHTML, bindSettings,
    mount() {
      $('hud').innerHTML = HUD; document.body.insertAdjacentHTML('beforeend', OVER); looks();
      const mute = () => { $('aqMute').classList.toggle('off', !!A.settings.muted); };
      $('aqMute').onclick = () => { A.settings.muted = !A.settings.muted; A.saveSettings(); mute(); if (A.settings.muted) A.voice.stop(); }; mute();
      $('aqEnd').onclick = () => { if (Date.now() - endArm < 3000) { endArm = 0; A.drive.stop(); } else { endArm = Date.now(); note('Tocca ancora ✕ per finire il viaggio', 2500); } };
      off = [
        A.on('driveStart', d => { $('hud').hidden = false; curMan = undefined; if (d && d.resume) return; chime(); note(`In viaggio verso <i>${esc((A.plan.to || {}).name || 'la destinazione')}</i>`); speak(`Si parte. ${A.spokenDist(A.cur.route.length)}.`); }),
        A.on('driveStop', () => { $('hud').hidden = true; document.body.classList.remove('aq-over'); }),
        A.on('tick', onTick),
        A.on('instr', i => speak(i.text)),
        A.on('cam', c => { chime(); note(`${c.type === 'tutor' ? 'Tutor' : 'Autovelox'} tra ${A.fmtDist(c.dist)}${c.max ? ' · limite ' + c.max : ''}`); speak(`${c.type === 'tutor' ? 'Tutor' : 'Autovelox'} tra ${A.spokenDist(c.dist)}${c.max ? ', limite ' + c.max : ''}.`); }),
        A.on('via', v => { chime(); note(`Tappa raggiunta: <i>${esc(v.name)}</i>`); speak('Tappa raggiunta.'); }),
        A.on('arrive', a => { melody(); note(`<span class="aqsun">${sun}</span>Sei arrivato<br><small>${A.fmtDist(a.dist)} in ${A.fmtMin(a.sec)}</small>`, 7000); speak('Sei arrivato. Bentornato.'); }),
        A.on('reroute', r => { note('Cerco un\'altra strada…', 2500); if (r.speak) speak('Ricalcolo del percorso.'); })
      ];
    },
    unmount() { off.forEach(f => f()); off = []; const k = $('aqSky'); if (k) k.remove(); document.body.classList.remove('aq-noclouds', 'aq-nopaper', 'aq-over'); $('hud').innerHTML = ''; }
  });
})();
