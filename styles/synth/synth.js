/* APEX — stile SYNTHWAVE: anni '80, strade al neon, pavimento a griglia, sole a strisce all'orizzonte */
(function () {
  'use strict';
  const A = window.APEX, $ = A.$, esc = A.esc, D = A.draw;
  const ID = 'synth';
  const S = () => A.ss(ID);
  const save = () => A.saveSS(ID);
  const snd = (n, type = 'sawtooth', v = .07) => { if (S().sounds) A.voice.tone(n, type, v); };
  const arp = () => snd([[440, .08, 0], [554, .08, .08], [659, .08, .16], [880, .2, .24]]);
  const blip = () => snd([[1320, .06, 0], [1760, .08, .05]], 'square', .06);
  const speak = t => { if (A.wantsInstrVoice()) A.voice.speak(t); };

  function grid() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    x.fillStyle = '#12051f'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#7a1fa2'; x.fillRect(0, 0, 64, 2); x.fillRect(0, 0, 2, 64);
    x.fillStyle = 'rgba(255,43,214,.55)'; x.fillRect(0, 0, 64, 1); x.fillRect(0, 0, 1, 64);
    return x.getImageData(0, 0, 64, 64);
  }
  function restyle(map) {
    if (map.hasImage('synth-grid')) map.removeImage('synth-grid');
    map.addImage('synth-grid', grid(), { pixelRatio: 2 });
    for (const l of map.getStyle().layers) {
      const id = l.id, sl = l['source-layer'] || '', key = id + ' ' + sl;
      try {
        if (l.type === 'background') { map.setPaintProperty(id, 'background-color', '#12051f'); if (S().grid) map.setPaintProperty(id, 'background-pattern', 'synth-grid'); }
        else if (l.type === 'fill') {
          if (l.paint && l.paint['fill-pattern'] !== undefined) map.setPaintProperty(id, 'fill-pattern', undefined);
          if (/water|ocean|lake/.test(key)) { map.setPaintProperty(id, 'fill-color', '#0a0630'); map.setPaintProperty(id, 'fill-outline-color', '#26e8ff'); map.setPaintProperty(id, 'fill-opacity', 1); }
          else if (/building/.test(key)) { map.setPaintProperty(id, 'fill-color', '#2a0f45'); map.setPaintProperty(id, 'fill-outline-color', '#ff2bd6'); map.setPaintProperty(id, 'fill-opacity', .85); }
          else { map.setPaintProperty(id, 'fill-color', /wood|forest|park|grass/.test(key) ? '#1a0b38' : '#160830'); map.setPaintProperty(id, 'fill-outline-color', 'rgba(0,0,0,0)'); map.setPaintProperty(id, 'fill-opacity', S().grid ? .45 : 1); }
        }
        else if (l.type === 'fill-extrusion') { map.setPaintProperty(id, 'fill-extrusion-color', '#3b1263'); map.setPaintProperty(id, 'fill-extrusion-opacity', .8); }
        else if (l.type === 'line') {
          const c = v => map.setPaintProperty(id, 'line-color', v), blur = v => { try { map.setPaintProperty(id, 'line-blur', v); } catch { /* niente */ } };
          if (/boundary|admin/.test(key)) map.setLayoutProperty(id, 'visibility', 'none');
          else if (/water|river|stream|canal/.test(key)) c('#26e8ff');
          else if (/casing/.test(id)) { c(/motorway|trunk|primary|secondary/.test(id) ? 'rgba(255,43,214,.45)' : 'rgba(38,232,255,.18)'); blur(3); }
          else if (/rail|transit/.test(key)) c('#7a5cff');
          else if (/path|track|pedestrian|footway|cycle|steps/.test(id)) c('rgba(38,232,255,.35)');
          else if (/motorway|trunk/.test(id)) { c('#ff2bd6'); blur(.5); }
          else if (/primary|secondary/.test(id)) { c('#ff6ad5'); blur(.4); }
          else c('#26c6ff');
        }
        else if (l.type === 'symbol') {
          if (sl === 'poi' || /poi|shield|housenum/.test(id)) { map.setLayoutProperty(id, 'visibility', 'none'); continue; }
          if (l.layout && l.layout['text-field'] !== undefined) { map.setPaintProperty(id, 'text-color', '#ffd1ff'); map.setPaintProperty(id, 'text-halo-color', '#3a0a5c'); map.setPaintProperty(id, 'text-halo-width', 1.5); }
        }
        else if (l.type === 'hillshade') map.setLayoutProperty(id, 'visibility', 'none');
      } catch { /* niente */ }
    }
  }

  const HUD = `
    <div class="sycard"><div id="syArrow" class="syarrow"></div><div><div id="syDist" class="sydist"></div><div id="syText" class="sytext"></div></div></div>
    <div class="syright"><div id="syRem" class="syrem"></div><div id="syEta" class="syeta"></div></div>
    <div class="sybottom"><div class="syspd"><b id="sySpd">0</b><span>KM/H</span></div><div id="syLim" class="sylim" hidden></div></div>
    <div id="syMsg" class="symsg"></div>
    <div class="syctrls"><button id="syMute" aria-label="Voce">♪</button><button id="syEnd" aria-label="Termina">✕</button></div>`;
  const OVER = `<div id="sySky" class="sysky"><div class="sun"></div></div>`;
  let curMan = null, msgT, endArm = 0;
  function msg(t, ms = 3500) { const el = $('syMsg'); if (!el) return; el.innerHTML = t; el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); clearTimeout(msgT); msgT = setTimeout(() => el.classList.remove('on'), ms); }
  function onTick(t) {
    const m = t.next;
    if (m !== curMan) { curMan = m; $('syArrow').innerHTML = D.arrow(m, '#ffe600', 5); $('syText').innerHTML = m ? esc(D.short(m)) + (m.name ? `<i>${esc(m.name)}</i>` : '') : ''; if (m) blip(); }
    $('syDist').textContent = m ? A.fmtDist(m.s - t.s) : '';
    $('sySpd').textContent = t.kmh;
    document.body.classList.toggle('sy-over', !!(t.limit && t.kmh > t.limit + 5));
    $('syLim').hidden = !t.limit; if (t.limit) $('syLim').textContent = t.limit;
    $('syRem').textContent = A.fmtDist(t.rem); $('syEta').textContent = A.fmtMin(t.remSec) + ' · ' + A.clock(t.eta);
  }
  function settingsHTML() {
    const s = S();
    return `<h3>Synthwave</h3>
      <label class="toggle"><input id="syGrid" type="checkbox" ${s.grid ? 'checked' : ''}><span>Pavimento a griglia al neon</span></label>
      <label class="toggle"><input id="sySun" type="checkbox" ${s.sun ? 'checked' : ''}><span>Sole a strisce all'orizzonte (in guida)</span></label>
      <label class="toggle"><input id="sySnd" type="checkbox" ${s.sounds ? 'checked' : ''}><span>Suoni synth</span></label>`;
  }
  function bindSettings() {
    const s = S();
    $('syGrid').onchange = () => { s.grid = $('syGrid').checked; save(); A.reloadMapStyle(); };
    $('sySun').onchange = () => { s.sun = $('sySun').checked; save(); document.body.classList.toggle('sy-nosun', !s.sun); };
    $('sySnd').onchange = () => { s.sounds = $('sySnd').checked; save(); };
  }
  let off = [];
  A.registerStyle({
    id: ID, name: 'Synthwave', tagline: 'neon anni \'80',
    defaults: { grid: true, sun: true, sounds: true },
    instrDefault: true,
    routeTheme: { route: '#ffe600', casing: '#ff2bd6', casingOpacity: .8, width: 5, alt: '#7a5cff', done: '#5a2a7a' },
    restyle,
    addLayers(map) { try { map.setPaintProperty('apex-route-casing', 'line-blur', 6); map.setPaintProperty('apex-route', 'line-blur', .6); } catch { /* niente */ } },
    vehicle() { return { html: '<svg viewBox="0 0 36 40"><path d="M18 2 L32 36 L18 28 L4 36 Z" fill="#12051f" stroke="#ffe600" stroke-width="3" stroke-linejoin="round"/><path d="M18 10 L25 30 L18 26 L11 30 Z" fill="#ff2bd6"/></svg>', align: 'map', cls: 'syveh' }; },
    driveVehicleMode: () => 'top',
    camera(p) {
      if (!p.drive) return { pitch: 40, padTop: 0.2 };
      const v = p.speed * 3.6;
      return { pitch: 72, padTop: 0.55, zoom: v > 90 ? 15.6 : v > 60 ? 16.1 : 16.6 };
    },
    settingsHTML, bindSettings,
    mount() {
      $('hud').innerHTML = HUD; document.body.insertAdjacentHTML('beforeend', OVER);
      document.body.classList.toggle('sy-nosun', !S().sun);
      const mute = () => { $('syMute').classList.toggle('off', !!A.settings.muted); };
      $('syMute').onclick = () => { A.settings.muted = !A.settings.muted; A.saveSettings(); mute(); if (A.settings.muted) A.voice.stop(); }; mute();
      $('syEnd').onclick = () => { if (Date.now() - endArm < 3000) { endArm = 0; A.drive.stop(); } else { endArm = Date.now(); msg('Tocca di nuovo ✕ per finire', 2500); } };
      off = [
        A.on('driveStart', d => { $('hud').hidden = false; curMan = undefined; if (d && d.resume) return; arp(); msg(`<b>${esc((A.plan.to || {}).name || 'Destinazione')}</b><br>${A.fmtDist(A.cur.route.length)}`, 3500); speak(`Percorso impostato. ${A.spokenDist(A.cur.route.length)}.`); }),
        A.on('driveStop', () => { $('hud').hidden = true; document.body.classList.remove('sy-over'); }),
        A.on('tick', onTick),
        A.on('instr', i => speak(i.text)),
        A.on('cam', c => { snd([[880, .12, 0], [660, .12, .14]], 'square', .08); msg(`<span class="r">${c.type === 'tutor' ? 'TUTOR' : 'AUTOVELOX'}</span> ${A.fmtDist(c.dist)}${c.max ? ' · ' + c.max : ''}`, 4500); speak(`${c.type === 'tutor' ? 'Tutor' : 'Autovelox'} tra ${A.spokenDist(c.dist)}${c.max ? ', limite ' + c.max : ''}.`); }),
        A.on('via', v => { arp(); msg('TAPPA · ' + esc(v.name), 3000); speak('Tappa raggiunta.'); }),
        A.on('arrive', () => { arp(); setTimeout(arp, 380); msg('<b>ARRIVATO</b><br>GAME OVER · INSERT COIN', 6000); speak('Sei arrivato a destinazione.'); }),
        A.on('reroute', r => { msg('RICALCOLO…', 2500); if (r.speak) speak('Ricalcolo del percorso.'); })
      ];
    },
    unmount() {
      off.forEach(f => f()); off = [];
      const k = $('sySky'); if (k) k.remove();
      document.body.classList.remove('sy-nosun', 'sy-over');
      $('hud').innerHTML = '';
    }
  });
})();
