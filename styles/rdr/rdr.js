/* APEX — stile RED DEAD: mappa su pergamena con strade a inchiostro, animali disegnati nei boschi,
   luoghi del West (stalla, saloon, emporio, dottore…), "core" circolari, taglia quando corri,
   onore, medaglie all'arrivo, frasi da cowboy. Icone e disegni originali. */
(function () {
  'use strict';
  const A = window.APEX, $ = A.$, esc = A.esc;
  const ID = 'rdr';
  const S = () => A.ss(ID);
  const save = () => A.saveSS(ID);
  const INK = '#2b2118', PAPER = '#dcc8a0', RED = '#9b1c16';

  // ---------- luoghi: cerchio a inchiostro con disegno bianco (originali) ----------
  const W2 = 'fill="none" stroke="#f4ead2" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
  const WF = 'fill="#f4ead2"';
  const GLYPH = {
    stalla: `<path ${W2} d="M10.5 9v6.5a5.5 5.5 0 0 0 11 0V9"/><circle ${WF} cx="10.5" cy="12" r=".9"/><circle ${WF} cx="21.5" cy="12" r=".9"/><circle ${WF} cx="11.6" cy="17" r=".9"/><circle ${WF} cx="20.4" cy="17" r=".9"/>`,
    saloon: `<path ${W2} d="M9.5 10h10v12a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 9.5 22zM19.5 13h2.5a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2.5"/><path ${WF} d="M9 10c0-2 2-3 3.5-2.2C13.5 6.5 16 6.5 17 7.8c1.5-.8 3 .2 3 2.2z"/>`,
    emporio: `<path ${W2} d="M12 9.5h8M13 9.5c-4 3-5 7-4 11 .5 2 2.5 3 7 3s6.5-1 7-3c1-4 0-8-4-11M14 7l2 2.5 2-2.5"/>`,
    dottore: `<path ${WF} d="M13.5 7.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z"/>`,
    albergo: `<path ${W2} d="M7 22V10M7 18h18v4M7 15h5M14 15h9a2 2 0 0 1 2 2"/><circle ${WF} cx="10" cy="13.5" r="1.6"/>`,
    banca: `<text x="16" y="23.5" font-size="19" font-family="Georgia,'Times New Roman',serif" font-weight="700" text-anchor="middle" fill="#f4ead2">$</text>`,
    sceriffo: `<path ${WF} d="M16 6.5l2.6 5.8 6.3.7-4.7 4.3 1.3 6.2L16 20.3l-5.5 3.2 1.3-6.2-4.7-4.3 6.3-.7z"/><circle fill="#1b1611" cx="16" cy="15.6" r="2"/>`,
    locanda: `<path ${W2} d="M11 7v7a2.5 2.5 0 0 0 5 0V7M13.5 7v18M21 7c-2.5 2-3.5 5-3.5 9h3v9"/>`,
    caffe: `<path ${W2} d="M9 12h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM20 13.5h1.5a2.5 2.5 0 0 1 0 5H20M12 6c-1 1.5 1 2 0 3.5M16 6c-1 1.5 1 2 0 3.5"/>`,
    sosta: `<path ${W2} d="M8 24V11M24 24V11M6 11h20M8 15h16"/>`,
    stazione: `<path ${W2} d="M8 21V12h9v9M17 15h6l1.5 6H8M10 12V8h3v4M20 15V11"/><circle ${WF} cx="11" cy="22.5" r="2"/><circle ${WF} cx="20" cy="22.5" r="2"/>`,
    chiesa: `<path ${W2} d="M16 6v20M10.5 11.5h11"/>`,
    posta: `<path ${W2} d="M7.5 10.5h17v11h-17zM7.5 10.5l8.5 6.5 8.5-6.5"/>`,
    occhio: `<path ${W2} d="M5.5 16s4-6 10.5-6 10.5 6 10.5 6-4 6-10.5 6S5.5 16 5.5 16z"/><circle ${WF} cx="16" cy="16" r="3"/>`
  };
  const disc = (inner, ring = '#f4ead2', fill = '#1b1611') => `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14.2" fill="${fill}" stroke="${ring}" stroke-width="1.5"/><circle cx="16" cy="16" r="15.4" fill="none" stroke="${fill}" stroke-width="1"/>${inner}</svg>`;
  const CLASS2 = { fuel: 'stalla', car: 'stalla', bar: 'saloon', beer: 'saloon', pub: 'saloon', grocery: 'emporio', shop: 'emporio', hospital: 'dottore', pharmacy: 'dottore', lodging: 'albergo', bank: 'banca', police: 'sceriffo', restaurant: 'locanda', fast_food: 'locanda', cafe: 'caffe', parking: 'sosta', railway: 'stazione', place_of_worship: 'chiesa', post: 'posta' };
  const CATNAME = { stalla: 'Stalla', saloon: 'Saloon', emporio: 'Emporio', dottore: 'Dottore', albergo: 'Albergo', banca: 'Banca', sceriffo: 'Ufficio dello sceriffo', locanda: 'Locanda', caffe: 'Caffè', sosta: 'Sosta', stazione: 'Stazione', chiesa: 'Chiesa', posta: 'Ufficio postale' };
  const REALNAME = { fuel: 'Distributore', car: 'Officina', bar: 'Bar', beer: 'Birreria', pub: 'Pub', grocery: 'Supermercato', shop: 'Negozio', hospital: 'Ospedale', pharmacy: 'Farmacia', lodging: 'Hotel', bank: 'Banca', police: 'Polizia', restaurant: 'Ristorante', fast_food: 'Fast food', cafe: 'Bar', parking: 'Parcheggio', railway: 'Stazione', place_of_worship: 'Chiesa', post: 'Posta' };

  // ---------- animali disegnati a inchiostro (originali) ----------
  const ink = 'fill="#3b2f24"', st = w => `fill="none" stroke="#3b2f24" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
  const ANIMAL = {
    cervo: `<ellipse ${ink} cx="14" cy="18" rx="8" ry="4.3"/><path ${st(3)} d="M20 16.5L24 9.5"/><ellipse ${ink} cx="25.5" cy="8.6" rx="2.6" ry="1.7"/><path ${st(1.6)} d="M9 21v8M12 21.5l.4 7.5M17.5 21.5v7.5M20.5 20.5l.5 8.5"/><path ${st(1.1)} d="M24.5 7.3L22.5 2.5M23.4 4.6l-2.6-.9M26.2 7.2l1.6-4.8M27 4.8l2.4-.4M6.3 16.5l-1.5-1"/>`,
    coniglio: `<ellipse ${ink} cx="15" cy="21" rx="7.2" ry="5"/><circle ${ink} cx="22" cy="15.5" r="3.4"/><path ${st(2.1)} d="M21.2 12.6L20 4.6M23.4 12.5l2.2-7.4"/><circle ${ink} cx="7.6" cy="19.6" r="2"/><path ${st(1.6)} d="M11 25.5h-3M20 25.5h3.5"/>`,
    uccello: `<ellipse ${ink} cx="15" cy="17" rx="6.5" ry="4.6" transform="rotate(-20 15 17)"/><circle ${ink} cx="21.5" cy="11.5" r="3.1"/><path ${ink} d="M24.3 11l3.6.6-3.4 1.3z"/><path ${ink} d="M10 19.5L3.5 24l7.8-1.5z"/><path ${st(1.2)} d="M14.5 21.5l-.5 5M17.5 21l.3 5.5M11.5 27h9"/>`,
    volpe: `<ellipse ${ink} cx="15" cy="18.5" rx="7.5" ry="3.8"/><path ${ink} d="M21 16.5l4.6-4.4.8-3 1.4 2.6 2.6 1.6-3.8 1.9-2.6 3z"/><path ${ink} d="M7.8 17.5C4 16 2 19 2.5 22.5c2.5-1.2 4.5-1.6 6.5-2.8z"/><path ${st(1.5)} d="M10 21v7M13 21.5v6.5M18 21.5v6.5M21 20.5l.5 7.5"/>`
  };
  const animalSVG = k => `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 32 32">${ANIMAL[k]}</svg>`;

  const ICONS = { cam: disc(GLYPH.occhio, '#f4ead2', '#8e1a14'), tutor: disc(GLYPH.occhio, '#f4ead2', '#a5631a') };
  for (const [k, g] of Object.entries(GLYPH)) if (k !== 'occhio') ICONS['rdr-' + k] = disc(g);
  for (const k of Object.keys(ANIMAL)) ICONS['rdr-a-' + k] = animalSVG(k);

  // ---------- suoni (legno e corde, sintetizzati) ----------
  const snd = (n, type = 'triangle', v = .16) => { if (S().sounds) A.voice.tone(n, type, v); };
  const tock = () => snd([[392, .09, 0], [294, .16, .06]], 'triangle', .2);
  const pluck = () => snd([[220, .5, 0], [330, .5, .09], [440, .6, .18]], 'triangle', .14);
  const bell = () => snd([[880, .25, 0], [660, .4, .16]], 'sine', .18);
  const wantedSnd = () => snd([[196, .22, 0], [185, .5, .2]], 'sawtooth', .07);
  const fanfare = () => snd([[220, .5, 0], [277, .5, .14], [330, .5, .28], [440, 1.2, .46], [330, 1.2, .46], [277, 1.2, .46]], 'triangle', .13);
  const speak = t => { if (A.wantsInstrVoice()) A.voice.speak(t); };
  const west = () => !!S().west;

  // ---------- sottotitoli, banner, città ----------
  let subT, bT, rvT, lastReveal = '', lastRevealAt = 0;
  function sub(html, ms = 4000) { const el = $('wSub'); if (!el) return; el.innerHTML = html; el.classList.add('on'); clearTimeout(subT); subT = setTimeout(() => el.classList.remove('on'), ms); }
  function banner(t, s, ms = 4500, medal) {
    const b = $('wBanner'); if (!b) return;
    $('wBTitle').textContent = t; $('wBSub').innerHTML = s || ''; $('wBMedal').innerHTML = medal ? medalSVG(medal) : '';
    b.hidden = false; b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    clearTimeout(bT); bT = setTimeout(() => b.hidden = true, ms);
  }
  function reveal(zone, street) {
    const el = $('wReveal'); if (!el || !zone || !S().reveal) return;
    if (zone === lastReveal || Date.now() - lastRevealAt < 45000 || document.querySelector('.modal:not([hidden])')) return;
    lastReveal = zone; lastRevealAt = Date.now();
    $('wRvT').textContent = zone; $('wRvS').textContent = street || '';
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(rvT); rvT = setTimeout(() => el.classList.remove('on'), 5200);
  }
  const MEDAL = { oro: ['#d9a521', '#8a6410', 'ORO'], argento: ['#c9c9c9', '#6f6f6f', 'ARGENTO'], bronzo: ['#b8743a', '#6b3f17', 'BRONZO'] };
  const medalSVG = k => { const [c, d] = MEDAL[k]; return `<svg viewBox="0 0 64 80"><path d="M22 2h20l-6 22h-8z" fill="${RED}"/><circle cx="32" cy="50" r="24" fill="${c}" stroke="${d}" stroke-width="4"/><circle cx="32" cy="50" r="17" fill="none" stroke="${d}" stroke-width="1.5" stroke-dasharray="2 2.5"/><path d="M32 37l3.8 8.4 9 .9-6.8 6 2 8.9L32 56.6l-8 4.6 2-8.9-6.8-6 9-.9z" fill="${d}"/></svg>`; };

  // ---------- taglia (quando superi il limite) e onore ----------
  const B = { on: false, since: 0, under: 0, trip: 0, lastAdd: 0, km0: 0, lastS: 0 };
  function honorShow() { const h = Math.max(-100, Math.min(100, A.stats.extra.honor || 0)), el = $('wHonor'); if (el) el.style.left = (50 + h / 2) + '%'; }
  function updateBounty(t, sim) {
    const ex = A.stats.extra, now = Date.now(), over = S().bounty && t.limit && t.kmh > t.limit + 10;
    if (over) {
      B.under = 0;
      if (!B.since) B.since = now;
      if (!B.on && now - B.since > 3000) {
        B.on = true; B.lastAdd = now; wantedSnd();
        B.trip += 5; if (!sim) { ex.bounty = (ex.bounty || 0) + 5; ex.wanted = (ex.wanted || 0) + 1; ex.honor = Math.max(-100, (ex.honor || 0) - 5); }
        sub(west() ? '<span class="r">Ricercato!</span> Rallenta, lo sceriffo ti tiene d\'occhio.' : '<span class="r">Ricercato</span> · stai superando il limite', 4000);
      } else if (B.on && now - B.lastAdd > 2000) {
        const add = t.kmh > t.limit + 30 ? 3 : 1; B.lastAdd = now; B.trip += add; if (!sim) ex.bounty = (ex.bounty || 0) + add;
      }
    } else {
      B.since = 0;
      if (B.on) { if (!B.under) B.under = now; else if (now - B.under > 8000) { B.on = false; B.under = 0; sub(west() ? 'Hai seminato la legge.' : 'Non sei più ricercato', 3000); } }
    }
    // onore: un punto ogni km fatto senza taglia
    if (!sim && !B.on && t.s - B.lastS > 1000) { ex.honor = Math.min(100, (ex.honor || 0) + 1); B.lastS = t.s; }
    if (B.on) B.lastS = t.s;
    const w = $('wWanted'); w.hidden = !B.on && !B.trip; w.classList.toggle('on', B.on);
    $('wBounty').textContent = '$' + B.trip; honorShow();
  }

  // ---------- frecce a inchiostro ----------
  function arrowSVG(m, col = INK) {
    const s = `fill="none" stroke="${col}" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"`;
    if (!m) return '';
    if (m.type === 'arrive') return `<svg viewBox="0 0 48 48"><path d="M13 13l22 22M35 13L13 35" fill="none" stroke="${RED}" stroke-width="6" stroke-linecap="round"/></svg>`;
    if (m.type === 'roundabout' || m.type === 'rotary') return `<svg viewBox="0 0 48 48"><circle cx="24" cy="18" r="9" ${s}/><path d="M24 44V27" ${s}/><text x="24" y="23" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="12" fill="${col}">${m.exit || ''}</text></svg>`;
    const ang = { straight: 0, 'slight right': 40, right: 90, 'sharp right': 130, 'slight left': -40, left: -90, 'sharp left': -130, uturn: -180 }[m.mod] || 0;
    const a = ang * Math.PI / 180, ex = 24 + Math.sin(a) * 15, ey = 22 - Math.cos(a) * 15;
    if (ang === -180) return `<svg viewBox="0 0 48 48"><path d="M30 44V18a8 8 0 0 0-16 0v14" ${s}/><path d="M8 26l6 8 6-8" ${s}/></svg>`;
    const p = k => [ex + Math.sin(a + k) * 8, ey - Math.cos(a + k) * 8].map(v => v.toFixed(1)).join(' ');
    return `<svg viewBox="0 0 48 48"><path d="M24 44V22L${ex.toFixed(1)} ${ey.toFixed(1)}" ${s}/><path d="M${p(0)}L${p(2.4)}L${p(-2.4)}Z" fill="${col}" stroke="${col}" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  }
  const helpHTML = m => {
    if (!m) return '';
    if (m.type === 'arrive') return (m.final ? 'Arrivo a ' : 'Tappa a ') + `<i>${esc(m.final ? (A.plan.to || {}).name || '' : (m.name || 'tappa'))}</i>`;
    return esc(A.cap(m.text)) + (m.name ? (/rotonda|uscita/.test(m.text) ? ' verso ' : ' in ') + `<i>${esc(m.name)}</i>` : '');
  };

  // ---------- HUD ----------
  const ICO = {
    mute: on => `<svg viewBox="0 0 32 32"><path d="M6 13h5l7-6v18l-7-6H6z" fill="currentColor"/>${on ? '<path d="M22 12l6 8M28 12l-6 8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>' : '<path d="M22 11c2.5 2.8 2.5 7.2 0 10M25.5 8c4.5 4.5 4.5 11.5 0 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'}</svg>`,
    road: '<svg viewBox="0 0 32 32"><path d="M8 18v9M24 18v9" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><rect x="4" y="9" width="24" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M9 10l-3 7M15 10l-3 7M21 10l-3 7M27 10l-3 7" stroke="currentColor" stroke-width="2.2"/></svg>',
    end: '<svg viewBox="0 0 32 32"><path d="M9 9l14 14M23 9L9 23" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>',
    shoe: '<svg viewBox="0 0 32 32"><path d="M9.5 6.5l1 9a5.5 5.5 0 0 0 11 0l1-9" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="butt"/><path d="M7.5 6h5M19.5 6h5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><g fill="#1b1611"><circle cx="10.6" cy="10" r=".9"/><circle cx="21.4" cy="10" r=".9"/><circle cx="11.6" cy="15.5" r=".9"/><circle cx="20.4" cy="15.5" r=".9"/><circle cx="16" cy="21" r=".9"/></g></svg>'
  };
  const RING = 2 * Math.PI * 27;
  const core = (id, inner, cls = '') => `<div class="wcore ${cls}"><svg viewBox="0 0 64 64"><circle class="trk" cx="32" cy="32" r="27"/><circle id="${id}" class="ring" cx="32" cy="32" r="27" stroke-dasharray="${RING.toFixed(1)}" stroke-dashoffset="${RING.toFixed(1)}"/></svg><div class="cin">${inner}</div></div>`;
  const HUD = `
    <div id="wCard" class="wcard"><div id="wArrow" class="warrow"></div><div class="wct"><div id="wDist" class="wdist"></div><div id="wText" class="wtext"></div></div></div>
    <div class="wtr"><div id="wRem" class="wrem"></div><div id="wEta" class="weta"></div>
      <div id="wWanted" class="wwanted" hidden><b>RICERCATO</b><span>taglia <em id="wBounty">$0</em></span></div></div>
    <div class="wbl">
      <div class="wcores">${core('wSpdRing', '<b id="wSpd">0</b><span>km/h</span>', 'big')}<div id="wLimit" class="wlimit" hidden></div>${core('wTripRing', ICO.shoe)}</div>
      <div class="whonor" title="Onore"><span>Onore</span><div class="bar"><i id="wHonor"></i></div></div>
    </div>
    <div class="wbr"><div id="wStreet" class="wstreet"></div></div>
    <div class="wctrls"><button id="wMute" aria-label="Voce">${ICO.mute(false)}</button><button id="wRoad" aria-label="Strada chiusa">${ICO.road}</button><button id="wEnd" aria-label="Termina">${ICO.end}</button></div>`;
  const OVER = `
    <div id="wSub" class="wsub"></div>
    <div id="wReveal" class="wreveal"><div id="wRvT" class="t"></div><div class="rule"></div><div id="wRvS" class="s"></div></div>
    <div id="wBanner" class="wbanner" hidden><div class="band"><div id="wBTitle"></div><div id="wBMedal" class="medal"></div><div id="wBSub"></div></div></div>
    <div id="wPaper" class="wpaper"></div>`;

  let curMan = null, endArm = 0, roadArm = 0, lastStreet = '';
  function setRing(id, f) { const el = $(id); if (el) el.style.strokeDashoffset = (RING * (1 - Math.max(0, Math.min(1, f)))).toFixed(1); }
  function onTick(t) {
    const m = t.next;
    if (m !== curMan) {
      curMan = m; $('wArrow').innerHTML = arrowSVG(m); $('wText').innerHTML = helpHTML(m);
      const c = $('wCard'); c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
      if (m) tock();
    }
    $('wDist').textContent = m ? A.fmtDist(m.s - t.s) : '';
    $('wRem').textContent = A.fmtDist(t.rem);
    $('wEta').textContent = A.fmtMin(t.remSec) + ' · arrivo ' + A.clock(t.eta);
    $('wSpd').textContent = t.kmh;
    const lim = t.limit || 0;
    setRing('wSpdRing', lim ? t.kmh / lim : t.kmh / 130);
    $('wSpdRing').classList.toggle('over', !!(lim && t.kmh > lim + 5));
    setRing('wTripRing', t.progress);
    const L = $('wLimit'); L.hidden = !lim; if (lim) L.textContent = lim;
    updateBounty(t, A.drive.sim);
    if (t.street !== lastStreet) { lastStreet = t.street; $('wStreet').textContent = t.street || ''; }
  }

  // ---------- mappa su pergamena ----------
  function restyle(map) {
    const W = (a, b) => ['interpolate', ['exponential', 1.5], ['zoom'], 8, a, 18, b];
    for (const l of map.getStyle().layers) {
      const id = l.id, sl = l['source-layer'] || '', key = id + ' ' + sl;
      try {
        if (l.type === 'background') map.setPaintProperty(id, 'background-color', PAPER);
        else if (l.type === 'fill') {
          let c = PAPER, o = '#c9b083';
          if (/water|ocean|lake/.test(key)) { c = '#9ea8a0'; o = '#5f6963'; }
          else if (/wood|forest/.test(key)) { c = '#d2ba8d'; o = '#c3a878'; }
          else if (/park|grass|meadow|scrub|wetland|cemetery|landcover|natural/.test(key)) { c = '#d8c396'; o = '#d8c396'; }
          else if (/building/.test(key)) { c = '#cdb385'; o = '#9b8058'; }
          else if (/residential|landuse/.test(key)) { c = '#d7c296'; o = '#d7c296'; }
          else if (/aeroway|airport/.test(key)) { c = '#d1b98c'; o = '#a78c62'; }
          if (l.paint && l.paint['fill-pattern'] !== undefined) map.setPaintProperty(id, 'fill-pattern', undefined);
          map.setPaintProperty(id, 'fill-color', c); map.setPaintProperty(id, 'fill-outline-color', o);
          if (/building/.test(key)) map.setPaintProperty(id, 'fill-opacity', 0.55);
        }
        else if (l.type === 'fill-extrusion') map.setLayoutProperty(id, 'visibility', 'none');
        else if (l.type === 'line') {
          const dash = v => { try { map.setPaintProperty(id, 'line-dasharray', v); } catch { /* niente */ } };
          if (/boundary|admin/.test(key)) { map.setPaintProperty(id, 'line-color', '#7d6448'); dash([3, 2, 1, 2]); }
          else if (/water|river|stream|canal/.test(key)) map.setPaintProperty(id, 'line-color', '#7f8c86');
          else if (/casing/.test(id)) map.setPaintProperty(id, 'line-opacity', 0);
          else if (/rail|transit/.test(key)) { map.setPaintProperty(id, 'line-color', '#3b3026'); map.setPaintProperty(id, 'line-width', W(1.2, 5)); dash([4, 1.2, 1, 1.2]); }
          else if (/ferry/.test(key)) { map.setPaintProperty(id, 'line-color', '#6c7a74'); dash([2, 2]); }
          else if (/path|track|pedestrian|footway|cycle|steps|bridleway/.test(id)) { map.setPaintProperty(id, 'line-color', '#6b5a44'); map.setPaintProperty(id, 'line-width', W(.6, 2.2)); dash([2, 1.6]); }
          else if (/motorway|trunk/.test(id)) { map.setPaintProperty(id, 'line-color', '#2b2219'); map.setPaintProperty(id, 'line-width', W(1.6, 11)); }
          else if (/primary|secondary/.test(id)) { map.setPaintProperty(id, 'line-color', '#33281d'); map.setPaintProperty(id, 'line-width', W(1.1, 8)); }
          else if (sl === 'transportation' || /road|street|bridge|tunnel|highway|minor|tertiary|service/.test(id)) { map.setPaintProperty(id, 'line-color', '#45372a'); map.setPaintProperty(id, 'line-width', W(.6, 5)); }
          else map.setPaintProperty(id, 'line-color', '#8c7656');
        }
        else if (l.type === 'symbol') {
          if (sl === 'poi' || /poi|shield|housenum/.test(id)) { map.setLayoutProperty(id, 'visibility', 'none'); continue; }
          if (!l.layout || l.layout['text-field'] === undefined) continue;
          map.setPaintProperty(id, 'text-halo-color', 'rgba(226,208,170,.85)'); map.setPaintProperty(id, 'text-halo-width', 1.4);
          if (/water/.test(key)) { map.setPaintProperty(id, 'text-color', '#4f5e5a'); map.setLayoutProperty(id, 'text-font', ['Noto Sans Italic']); }
          else if (/city|town|state|country/.test(id)) {
            map.setPaintProperty(id, 'text-color', '#241a12');
            map.setLayoutProperty(id, 'text-font', ['Noto Sans Bold']); map.setLayoutProperty(id, 'text-transform', 'uppercase'); map.setLayoutProperty(id, 'text-letter-spacing', 0.45);
          }
          else if (/place|village|suburb|hamlet|neighbourhood|locality/.test(key)) { map.setPaintProperty(id, 'text-color', '#33261a'); map.setLayoutProperty(id, 'text-font', ['Noto Sans Italic']); }
          else { map.setPaintProperty(id, 'text-color', '#4a3a2a'); map.setLayoutProperty(id, 'text-font', ['Noto Sans Italic']); }
        }
        else if (l.type === 'hillshade') map.setPaintProperty(id, 'hillshade-shadow-color', '#8a7150');
      } catch { /* niente */ }
    }
  }

  // ---------- diario di viaggio nel foglio del percorso ----------
  function renderSheet(box, cur) {
    if (!cur || !cur.man || !cur.man.length) { box.innerHTML = ''; return; }
    const rows = cur.man.slice(0, 60).map((m, i) => `<li data-i="${i}"><span class="ja">${arrowSVG(m)}</span><span class="jt">${helpHTML(m)}</span><span class="jd">${A.fmtKm(m.s)}</span></li>`).join('');
    box.innerHTML = `<div class="journal"><div class="jh">Diario di viaggio</div><ol>${rows}</ol></div>`;
    box.querySelectorAll('li').forEach(li => li.onclick = () => {
      const m = cur.man[+li.dataset.i], p = A.pointAtS(cur.route, m.s).ll;
      A.cam.follow(false); A.map.flyTo({ center: [p[1], p[0]], zoom: 16.5, padding: { top: 0, bottom: Math.round(innerHeight * .45), left: 0, right: 0 }, duration: 800 });
    });
  }

  // ---------- impostazioni ----------
  function settingsHTML() {
    const s = S();
    return `<h3>Red Dead</h3>
      <label class="toggle"><input id="wtBounty" type="checkbox" ${s.bounty ? 'checked' : ''}><span>Taglia quando superi il limite (e onore che sale se lo rispetti)</span></label>
      <label class="toggle"><input id="wtWest" type="checkbox" ${s.west ? 'checked' : ''}><span>Frasi da cowboy nella voce ("in sella, partner")</span></label>
      <label class="toggle"><input id="wtBlips" type="checkbox" ${s.blips ? 'checked' : ''}><span>Luoghi del West sulla mappa (stalla = benzinaio, saloon = bar, dottore…)</span></label>
      <label class="toggle"><input id="wtAnimals" type="checkbox" ${s.animals ? 'checked' : ''}><span>Animali disegnati nei boschi e nei prati</span></label>
      <label class="toggle"><input id="wtPaper" type="checkbox" ${s.paper ? 'checked' : ''}><span>Effetto carta invecchiata</span></label>
      <label class="toggle"><input id="wtReveal" type="checkbox" ${s.reveal ? 'checked' : ''}><span>Nome della città in grande quando ci entri</span></label>
      <label class="toggle"><input id="wtSounds" type="checkbox" ${s.sounds ? 'checked' : ''}><span>Suoni</span></label>`;
  }
  const vis = (id, on) => { if (A.map.getLayer(id)) A.map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'); };
  function bindSettings() {
    const s = S(), b = (id, k, fn) => { $(id).onchange = () => { s[k] = $(id).checked; save(); if (fn) fn(); }; };
    b('wtBounty', 'bounty'); b('wtWest', 'west'); b('wtSounds', 'sounds'); b('wtReveal', 'reveal');
    b('wtBlips', 'blips', () => vis('rdr-blips', s.blips));
    b('wtAnimals', 'animals', () => vis('rdr-animals', s.animals));
    b('wtPaper', 'paper', () => document.body.classList.toggle('rdr-nopaper', !s.paper));
  }

  let off = [];
  A.registerStyle({
    id: ID, name: 'Red Dead', tagline: 'mappa del West',
    defaults: { bounty: true, west: true, blips: true, animals: true, paper: true, reveal: true, sounds: true },
    instrDefault: true,
    icons: ICONS,
    routeTheme: { route: RED, casing: '#f1e4c6', casingOpacity: 0.9, width: 5, alt: '#8a7656', done: '#a8916c' },
    restyle,
    addLayers(map, before) {
      const s = map.getStyle(), v = Object.keys(s.sources).find(k => s.sources[k].type === 'vector');
      if (!v) return;
      map.addLayer({ id: 'rdr-animals', type: 'symbol', source: v, 'source-layer': 'landcover', minzoom: 11.5,
        filter: ['in', ['get', 'class'], ['literal', ['wood', 'grass', 'forest']]],
        layout: { 'icon-image': ['match', ['coalesce', ['get', 'subclass'], ['get', 'class']], 'forest', 'apex-rdr-a-cervo', 'wood', 'apex-rdr-a-volpe', ['scrub', 'heath'], 'apex-rdr-a-coniglio', 'apex-rdr-a-uccello'],
          'icon-size': ['interpolate', ['linear'], ['zoom'], 12, .6, 16, .95], 'icon-padding': 60, 'icon-allow-overlap': false, 'icon-ignore-placement': true, 'icon-pitch-alignment': 'map', visibility: S().animals ? 'visible' : 'none' },
        paint: { 'icon-opacity': 0.62 } }, before);
      map.addLayer({ id: 'rdr-blips', type: 'symbol', source: v, 'source-layer': 'poi', minzoom: 13.5,
        filter: ['in', ['get', 'class'], ['literal', Object.keys(CLASS2)]],
        layout: { 'icon-image': ['match', ['get', 'class'], ...Object.entries(CLASS2).flatMap(([c, g]) => [c, 'apex-rdr-' + g]), 'apex-rdr-emporio'],
          'icon-size': 0.72, 'icon-allow-overlap': false, 'icon-pitch-alignment': 'viewport', 'icon-rotation-alignment': 'viewport', 'symbol-sort-key': ['coalesce', ['get', 'rank'], 99], visibility: S().blips ? 'visible' : 'none' } });
    },
    onMapClick(e) {
      if (!A.map.getLayer('rdr-blips')) return false;
      const f = A.map.queryRenderedFeatures([[e.point.x - 12, e.point.y - 12], [e.point.x + 12, e.point.y + 12]], { layers: ['rdr-blips'] });
      if (!f.length) return false;
      const p = f[0].properties || {}, nome = p['name:it'] || p.name || '', cat = REALNAME[p.class] || CATNAME[CLASS2[p.class]] || 'Luogo';
      const [lon, lat] = f[0].geometry.coordinates;
      tock();
      A.setDestination({ lat, lon, name: nome ? (nome.toLowerCase().includes(cat.toLowerCase()) ? nome : `${nome} · ${cat}`) : cat });
      return true;
    },
    vehicle() { return { html: `<svg viewBox="0 0 36 40"><path d="M18 2 L31 34 L18 27 L5 34 Z" fill="#f4ead2" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M18 9 L25 28 L18 24 Z" fill="${INK}"/></svg>`, align: 'map', cls: 'warrowmk' }; },
    driveVehicleMode: () => 'top',
    camera(p) {
      if (!p.drive) return { pitch: 0, padTop: 0.2 };
      const v = p.speed * 3.6;
      return { pitch: 48, padTop: 0.4, zoom: v > 90 ? 15.2 : v > 60 ? 15.8 : v > 35 ? 16.4 : 17 };
    },
    renderSheet,
    settingsHTML, bindSettings,
    statsRows(s) {
      const e = s.extra, h = e.honor || 0;
      return [['Onore', (h > 0 ? '+' : '') + h + (h >= 50 ? ' · gentiluomo' : h <= -50 ? ' · fuorilegge' : '')], ['Taglia totale', '$' + (e.bounty || 0)], ['Volte ricercato', e.wanted || 0],
        ['Medaglie', `${e.oro || 0} oro · ${e.argento || 0} argento · ${e.bronzo || 0} bronzo`]];
    },
    mount() {
      $('hud').innerHTML = HUD;
      document.body.insertAdjacentHTML('beforeend', OVER);
      document.body.classList.toggle('rdr-nopaper', !S().paper);
      lastReveal = ''; lastRevealAt = 0; honorShow();
      const mute = () => { $('wMute').innerHTML = ICO.mute(A.settings.muted); };
      $('wMute').onclick = () => { A.settings.muted = !A.settings.muted; A.saveSettings(); mute(); if (A.settings.muted) A.voice.stop(); };
      mute();
      $('wEnd').onclick = () => { if (Date.now() - endArm < 3000) { endArm = 0; sub('Viaggio interrotto', 2000); A.drive.stop(); } else { endArm = Date.now(); sub('Tocca di nuovo <b>✕</b> per fermarti', 3000); } };
      $('wRoad').onclick = () => {
        const f = A.drive.fix; if (!f) return;
        if (Date.now() - roadArm < 3000) {
          roadArm = 0;
          const p = A.pointAtS(A.cur.route, A.drive.estS() + 40).ll;
          A.addBlock(p); sub('Strada sbarrata segnata per 7 giorni · cerco un\'altra pista', 3500); speak(west() ? 'Strada sbarrata. Troviamo un\'altra pista.' : 'Strada chiusa segnalata. Cerco un percorso alternativo.');
          A.drive.nextReroute = 0; A.drive.reroute(f.ll[0], f.ll[1], A.drive.lastHeading);
        } else { roadArm = Date.now(); sub('Strada sbarrata davanti? Tocca di nuovo', 3000); }
      };
      off = [
        A.on('driveStart', d => {
          $('hud').hidden = false; curMan = undefined; lastStreet = '';
          if (d && d.resume) return;
          Object.assign(B, { on: false, since: 0, under: 0, trip: 0, lastAdd: 0, lastS: 0 });
          $('wWanted').hidden = true;
          const dest = (A.plan.to || {}).name || 'destinazione';
          banner(dest, west() ? 'In sella' : 'Si parte', 3000); pluck();
          setTimeout(() => sub(`Raggiungi <i>${esc(dest)}</i>`, 5000), 900);
          speak(west() ? `In sella, partner. ${A.spokenDist(A.cur.route.length)} fino a destinazione.` : `Percorso impostato. ${A.spokenDist(A.cur.route.length)}.`);
        }),
        A.on('driveStop', () => { $('hud').hidden = true; }),
        A.on('tick', onTick),
        A.on('instr', i => speak(i.text)),
        A.on('cam', c => {
          const what = c.type === 'tutor' ? 'Tutor' : 'Autovelox'; bell();
          speak(west() ? `Occhio, ${c.type === 'tutor' ? 'pattuglia dello sceriffo' : 'lo sceriffo con l\'autovelox'} tra ${A.spokenDist(c.dist)}${c.max ? ', limite ' + c.max : ''}.` : `${what} tra ${A.spokenDist(c.dist)}${c.max ? ', limite ' + c.max : ''}.`);
          sub(`<span class="r">${west() ? (c.type === 'tutor' ? 'Pattuglia' : 'Sceriffo') + ' · ' + what.toLowerCase() : what}</span> tra ${A.fmtDist(c.dist)}${c.max ? ` · limite <b>${c.max}</b>` : ''}`, 5000);
        }),
        A.on('via', v => { pluck(); banner('Tappa raggiunta', `<i>${esc(v.name)}</i>`, 3000); speak(west() ? 'Tappa raggiunta, partner.' : 'Tappa raggiunta.'); }),
        A.on('arrive', a => {
          const medal = B.trip === 0 ? 'oro' : B.trip <= 10 ? 'argento' : 'bronzo';
          if (!A.drive.sim) { A.stats.extra[medal] = (A.stats.extra[medal] || 0) + 1; A.saveStats(true); }
          fanfare();
          banner('Missione completata', `${A.fmtDist(a.dist)} in ${A.fmtMin(a.sec)} · medaglia d'${medal === 'oro' ? 'oro' : medal}${B.trip ? ` · taglia $${B.trip}` : ''}`, 7000, medal);
          speak(west() ? 'Siamo arrivati, partner.' : 'Sei arrivato a destinazione.');
        }),
        A.on('reroute', r => { sub(west() ? 'Cerco un\'altra pista…' : 'Ricalcolo del percorso…', 3000); if (r.speak) speak(west() ? 'Hai perso la pista. Ricalcolo.' : 'Ricalcolo del percorso.'); }),
        A.on('offRoute', () => sub('<span class="r">Sei fuori dalla pista della prova</span>', 4000)),
        A.on('where', w => reveal(w.zone, w.street))
      ];
      if (A.gps.where && A.gps.where.zone) setTimeout(() => reveal(A.gps.where.zone, A.gps.where.street), 600);
      if (A.cur) A.renderSheet();
    },
    unmount() {
      off.forEach(f => f()); off = [];
      ['wSub', 'wBanner', 'wReveal', 'wPaper'].forEach(id => { const el = $(id); if (el) el.remove(); });
      document.body.classList.remove('rdr-nopaper');
      $('hud').innerHTML = '';
    }
  });
})();
