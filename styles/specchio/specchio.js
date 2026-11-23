/* APEX — stile PARABREZZA: telefono appoggiato sul cruscotto, di notte il vetro riflette l'indicazione.
   In guida: nero assoluto, solo freccia, distanza, velocità e limite, grandi e luminosi, specchiati. */
(function () {
  'use strict';
  const A = window.APEX, $ = A.$, esc = A.esc, D = A.draw;
  const ID = 'specchio';
  const S = () => A.ss(ID);
  const save = () => A.saveSS(ID);
  const COL = { verde: '#3dff7a', ciano: '#36e6ff', bianco: '#ffffff', ambra: '#ffb020' };
  const col = () => COL[S().color] || COL.verde;
  const speak = t => { if (A.wantsInstrVoice()) A.voice.speak(t); };

  const HUD = `<div id="hsBox" class="hsbox">
      <div class="hsmain"><div id="hsArrow" class="hsarrow"></div><div class="hsdist"><b id="hsDist"></b><span id="hsStreet"></span></div></div>
      <div class="hsrow"><div class="hsspd"><b id="hsSpd">0</b><span>km/h</span></div><div id="hsLim" class="hslim" hidden></div><div class="hsrem"><b id="hsRem"></b><span id="hsEta"></span></div></div>
      <div id="hsAlert" class="hsalert" hidden></div>
    </div>
    <button id="hsExit" class="hsexit" aria-label="Termina">✕</button>`;
  let curMan = null, alertT, exitArm = 0;
  function alert(t, ms = 4000) { const el = $('hsAlert'); if (!el) return; el.textContent = t; el.hidden = false; clearTimeout(alertT); alertT = setTimeout(() => el.hidden = true, ms); }
  function onTick(t) {
    const m = t.next;
    if (m !== curMan) { curMan = m; $('hsArrow').innerHTML = D.arrow(m, 'currentColor', 5.2); $('hsStreet').textContent = m ? (m.type === 'arrive' ? D.short(m) : (m.name || D.short(m))) : ''; }
    $('hsDist').textContent = m ? A.fmtDist(m.s - t.s) : '';
    $('hsSpd').textContent = t.kmh;
    const over = !!(t.limit && t.kmh > t.limit + 5);
    document.body.classList.toggle('hs-over', over);
    $('hsLim').hidden = !t.limit; if (t.limit) $('hsLim').textContent = t.limit;
    $('hsRem').textContent = A.fmtDist(t.rem); $('hsEta').textContent = A.clock(t.eta);
  }
  function applyLook() {
    const b = document.body.style; b.setProperty('--hs', col());
    document.body.classList.remove('hs-mx', 'hs-my'); const m = S().mirror;
    if (m === 'orizz') document.body.classList.add('hs-mx'); if (m === 'vert') document.body.classList.add('hs-my');
    document.body.classList.toggle('hs-big', !!S().big);
  }

  function restyle(map) {
    for (const l of map.getStyle().layers) {
      const id = l.id, key = id + ' ' + (l['source-layer'] || '');
      try {
        if (l.type === 'background') map.setPaintProperty(id, 'background-color', '#000');
        else if (l.type === 'fill') { map.setPaintProperty(id, 'fill-color', /water/.test(key) ? '#06121c' : /building/.test(key) ? '#0c0c0c' : '#030303'); map.setPaintProperty(id, 'fill-outline-color', 'rgba(0,0,0,0)'); if (l.paint && l.paint['fill-pattern'] !== undefined) map.setPaintProperty(id, 'fill-pattern', undefined); }
        else if (l.type === 'fill-extrusion') map.setLayoutProperty(id, 'visibility', 'none');
        else if (l.type === 'line') { if (/boundary|admin/.test(key)) map.setLayoutProperty(id, 'visibility', 'none'); else map.setPaintProperty(id, 'line-color', /casing/.test(id) ? '#000' : /water/.test(key) ? '#0c2533' : /motorway|trunk|primary/.test(id) ? '#5a5a5a' : '#333'); }
        else if (l.type === 'symbol') { if (/poi|shield|housenum/.test(key)) map.setLayoutProperty(id, 'visibility', 'none'); else if (l.layout && l.layout['text-field'] !== undefined) { map.setPaintProperty(id, 'text-color', '#9a9a9a'); map.setPaintProperty(id, 'text-halo-color', '#000'); } }
        else if (l.type === 'hillshade') map.setLayoutProperty(id, 'visibility', 'none');
      } catch { /* niente */ }
    }
  }
  function settingsHTML() {
    const s = S(), sel = (id, v, o) => `<select id="${id}">${o.map(([k, l]) => `<option value="${k}" ${v === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    return `<h3>Parabrezza</h3>
      <label class="select"><span>Specchio (per il riflesso sul vetro)</span>${sel('hsMirror', s.mirror, [['orizz', 'Orizzontale (telefono in verticale, parte alta verso il vetro)'], ['vert', 'Verticale (parte bassa verso il vetro)'], ['no', 'Nessuno (lo guardi direttamente)']])}</label>
      <label class="select"><span>Colore</span>${sel('hsColor', s.color, [['verde', 'Verde'], ['ciano', 'Ciano'], ['bianco', 'Bianco'], ['ambra', 'Ambra']])}</label>
      <label class="toggle"><input id="hsBig" type="checkbox" ${s.big ? 'checked' : ''}><span>Solo freccia e distanza, enormi</span></label>
      <p class="hint">Di notte: luminosità del telefono al massimo, telefono appoggiato sul cruscotto sotto il vetro. In guida la mappa sparisce e resta tutto nero, così il vetro riflette solo l'indicazione. Per uscire tocca due volte la ✕ in un angolo.</p>`;
  }
  function bindSettings() {
    const s = S();
    $('hsMirror').onchange = () => { s.mirror = $('hsMirror').value; save(); applyLook(); };
    $('hsColor').onchange = () => { s.color = $('hsColor').value; save(); applyLook(); A.reloadMapStyle(); };
    $('hsBig').onchange = () => { s.big = $('hsBig').checked; save(); applyLook(); };
  }
  let off = [];
  A.registerStyle({
    id: ID, name: 'Parabrezza', tagline: 'riflesso sul vetro',
    defaults: { mirror: 'orizz', color: 'verde', big: false },
    instrDefault: true,
    routeTheme: { route: '#3dff7a', casing: '#000', casingOpacity: 1, width: 5, alt: '#2a2a2a', done: '#1d1d1d' },
    restyle,
    addLayers(map) { try { map.setPaintProperty('apex-route', 'line-color', col()); } catch { /* niente */ } },
    vehicle() { return { html: `<svg viewBox="0 0 36 40"><path d="M18 2 L32 36 L18 28 L4 36 Z" fill="${col()}" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/></svg>`, align: 'map', cls: 'hsveh' }; },
    driveVehicleMode: () => 'top',
    camera(p) { return p.drive ? { pitch: 0, padTop: 0.3, zoom: 16 } : { pitch: 0, padTop: 0.2 }; },
    settingsHTML, bindSettings,
    peerHTML: p => `<i class="pa"></i><b class="pn">${esc(p.n || '?')}</b>`,
    mount() {
      $('hud').innerHTML = HUD; applyLook();
      $('hsExit').onclick = () => { if (Date.now() - exitArm < 2500) { exitArm = 0; A.drive.stop(); } else { exitArm = Date.now(); alert('Tocca di nuovo ✕ per terminare', 2500); } };
      off = [
        A.on('driveStart', () => { $('hud').hidden = false; curMan = undefined; }),
        A.on('driveStop', () => { $('hud').hidden = true; document.body.classList.remove('hs-over'); }),
        A.on('tick', onTick),
        A.on('instr', i => speak(i.text)),
        A.on('cam', c => { const w = c.type === 'tutor' ? 'TUTOR' : 'AUTOVELOX'; alert(`${w} ${A.fmtDist(c.dist)}${c.max ? ' · ' + c.max : ''}`, 5000); speak(`${c.type === 'tutor' ? 'Tutor' : 'Autovelox'} tra ${A.spokenDist(c.dist)}${c.max ? ', limite ' + c.max : ''}.`); }),
        A.on('via', () => { alert('TAPPA RAGGIUNTA', 3000); speak('Tappa raggiunta.'); }),
        A.on('arrive', () => { alert('ARRIVATO', 6000); speak('Sei arrivato a destinazione.'); }),
        A.on('reroute', r => { alert('RICALCOLO', 2500); if (r.speak) speak('Ricalcolo del percorso.'); })
      ];
    },
    unmount() {
      off.forEach(f => f()); off = [];
      document.body.classList.remove('hs-mx', 'hs-my', 'hs-big', 'hs-over'); document.body.style.removeProperty('--hs');
      $('hud').innerHTML = '';
    }
  });
})();
