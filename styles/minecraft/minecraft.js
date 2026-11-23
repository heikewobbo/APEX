/* APEX — stile MINECRAFT: la mappa diventa a pixel (disegnata a bassa risoluzione e ingrandita),
   texture a blocchi disegnate qui, percorso a binari, barra degli oggetti, cuori (limiti), fame (pause),
   esperienza e livelli, titoli, chat, progressi, giorno e notte.
   Le icone del gioco (cuori, cosce, barra esperienza…) si possono caricare dalle impostazioni:
   restano solo sul telefono. Senza, si usano disegni originali. */
(function () {
  'use strict';
  const A = window.APEX, $ = A.$, esc = A.esc;
  const ID = 'minecraft';
  const S = () => A.ss(ID);
  const save = () => A.saveSS(ID);
  const PX = { grossi: 0.25, medi: 1 / 3, fini: 0.5 };
  const ratio = () => PX[S().pixel] || PX.medi;

  // ---------- disegni a pixel (originali) ----------
  const PAL = { k: '#1d1d1d', d: '#3a3a3a', D: '#555555', w: '#ffffff', W: '#e8e0d0', r: '#e0281e', R: '#ff6b5e', b: '#b3652b', B: '#d08a4c', s: '#8a8a8a', S: '#6f6f6f', o: '#ff9a1f', y: '#ffd54a', Y: '#f2c230', g: '#cfe8ff', p: '#c050e0', P: '#e58cff', c: '#9c6a3a', C: '#6e4824', e: '#2fbf5a', E: '#1d8a3c', n: '#8fd16a', t: '#f4f0e6', T: '#d9cfbd', m: '#7a2a8a', x: '#3a64d0', X: '#6f97ff', u: '#c03a2b', l: '#4a7c2a', a: '#9fd6ff' };
  const SPR = {
    heart: ['.kk...kk.', 'krrk.kRrk', 'krRrkrrrk', 'krrrrrrrk', '.krrrrrk.', '..krrrk..', '...krk...', '....k....'],
    heartE: ['.kk...kk.', 'kddk.kddk', 'kdddkdddk', 'kdddddddk', '.kdddddk.', '..kdddk..', '...kdk...', '....k....'],
    heartH: ['.kk...kk.', 'krrk.kddk', 'krRrkdddk', 'krrrkdddk', '.krrkddk.', '..krkdk..', '...kdk...', '....k....'],
    heartF: ['.ww...ww.', 'wddw.wddw', 'wdddwdddw', 'wdddddddw', '.wdddddw.', '..wdddw..', '...wdw...', '....w....'],
    food: ['....kkk..', '...kBbbk.', '..kBbbbbk', '..kbbbbbk', '..kbbbbk.', '.kWkkkk..', 'kWk......', 'kk.......'],
    foodE: ['....kkk..', '...kdddk.', '..kdddddk', '..kdddddk', '..kddddk.', '.kdkkkk..', 'kdk......', 'kk.......'],
    foodH: ['....kkk..', '...kdddk.', '..kBbddk.', '..kbbddk.', '..kbbdk..', '.kWkkkk..', 'kWk......', 'kk.......'],
    fornace: ['kkkkkkkkkkkk', 'ksssSsssssSk', 'kssssssSsssk', 'kSsssssssssk', 'kskkkkkkkksk', 'kskddddddksk', 'kskdddyddksk', 'kskddyoydksk', 'kskdoyooyksk', 'kskkkkkkkksk', 'ksssSssssssk', 'kkkkkkkkkkkk'],
    pozione: ['....kkkk....', '....kcck....', '....kggk....', '...kggggk...', '..kggggggk..', '.kggggggggk.', '.kPpppppppk.', '.kpPppppppk.', '.kppppppppk.', '..kppppppk..', '...kkkkkk...', '............'],
    farmacia: ['....kkkk....', '....kcck....', '....kggk....', '...kggggk...', '..kggggggk..', '.kggggggggk.', '.kRrrrrrrrk.', '.krRrrrrrrk.', '.krrrrrrrrk.', '..krrrrrrk..', '...kkkkkk...', '............'],
    torta: ['............', '...r....r...', '..kkkkkkkk..', '.kttrttttrk.', '.kttttttttk.', '.kTTTTTTTTk.', '.kbBbbBbbBk.', '.kbbbbbbbbk.', '.kBbbBbbbbk.', '.kkkkkkkkkk.', '............', '............'],
    mela: ['.....kk.....', '.....kCkll..', '....kkCll...', '..kkRrrkk...', '.kRRrrrrrk..', '.kRrrrrrrk..', '.krrrrrrrk..', '.krrrrrrrk..', '.kurrrrrrk..', '..kurrrrk...', '...kkkkk....', '............'],
    baule: ['kkkkkkkkkkkk', 'kBbbbbbbbbBk', 'kbBbbbbbbbbk', 'kbbbbbbbbbbk', 'kkkkkkkkkkkk', 'kCCCCkkCCCCk', 'kbbbbkykbbbk', 'kbBbbkkkbbbk', 'kbbbbbbbbbbk', 'kbbbbbbBbbbk', 'kBbbbbbbbbBk', 'kkkkkkkkkkkk'],
    letto: ['............', '............', 'kkkkkkkkkkkk', 'kttkrrrrrrrk', 'kttkRrrrrrrk', 'kttkrrrrrrrk', 'kkkkkkkkkkkk', 'kbbbbbbbbbbk', 'kbkkkkkkkkbk', 'kbk......kbk', 'kkk......kkk', '............'],
    scudo: ['kkkkkkkkkkkk', 'kxxxxxxxxxxk', 'kxXxxxwxxxxk', 'kxxxxwwwxxxk', 'kxxxxxwxxxxk', 'kxxxxxwxxxxk', '.kxxxxxxxxk.', '.kxxxxxxxxk.', '..kxxxxxxk..', '...kxxxxk...', '....kkkk....', '............'],
    smeraldo: ['....kkkk....', '...keEEek...', '..keneEEEk..', '.kennEEEEEk.', '.keneeEEEEk.', '.keeeeeEEEk.', '.kEeeeeeEEk.', '.kEEeeeeeEk.', '..kEEeeeEk..', '...kEEEEk...', '....kkkk....', '............'],
    tazza: ['....T..T....', '...T..T.....', '............', '.kkkkkkkk...', '.kttttttkkk.', '.kCccccCk.k.', '.kttttttk.k.', '.kttttttkkk.', '.kttttttk...', '..kttttk....', '...kkkk.....', '............'],
    carrello: ['............', '............', 'kkkkkkkkkkkk', 'ksSssssssSsk', 'ksddddddddsk', 'ksddddddddsk', 'ksSssssssSsk', 'kkkkkkkkkkkk', '.kDk....kDk.', '.kkk....kkk.', '............', '............'],
    campana: ['.....kk.....', '....kYYk....', '...kYyyYk...', '...kyYyyk...', '..kyyYyyyk..', '..kyyyyYyk..', '.kyyyyyyyyk.', '.kYYYYYYYYk.', 'kkkkkkkkkkkk', '.....kk.....', '.....kk.....', '............'],
    cartello: ['kkkkkkkkkkkk', 'kBbbbbbbbbBk', 'kbkkbkkkkbbk', 'kbbbbbbbbbbk', 'kbkkkkbkkbbk', 'kBbbbbbbbbBk', 'kkkkkkkkkkkk', '.....kck....', '.....kck....', '.....kck....', '.....kck....', '.....kkk....'],
    occhio: ['kkkkkkkkkkkk', 'ksSsssssSssk', 'kssssssssssk', 'kSskkkkkksSk', 'ksskwwwwkssk', 'ksskwrrwkssk', 'ksskwrrwkssk', 'ksskwwwwkssk', 'kSskkkkkkssk', 'ksssssSssssk', 'kssSssssssSk', 'kkkkkkkkkkkk'],
    occhioT: ['kkkkkkkkkkkk', 'ksSsssssSssk', 'kssssssssssk', 'kSskkkkkksSk', 'ksskwwwwkssk', 'ksskwoowkssk', 'ksskwoowkssk', 'ksskwwwwkssk', 'kSskkkkkkssk', 'ksssssSssssk', 'kssSssssssSk', 'kkkkkkkkkkkk'],
    freccia: ['.....kk.....', '....kwwk....', '....kwwk....', '...kwwwwk...', '...kwwwwk...', '..kwwwwwwk..', '..kwwwwwwk..', '.kwwwkkwwwk.', '.kwwk..kwwk.', 'kwwk....kwwk', 'kkk......kkk', '............'],
    nota: ['kkkkkkkkkkkk', 'kcCccCccccCk', 'kcccckkcCcck', 'kCccckkkcccC', 'kccccckcCcck', 'kccckkkccccC', 'kcckkkkcccck', 'kccckkccCcck', 'kCcccccccccC', 'kccCcccccCck', 'kcccccCccccC', 'kkkkkkkkkkkk'],
    muta: ['kkkkkkkkkkkk', 'kcCccCccccCk', 'krcccckcCcrk', 'kCrcckkkcrcC', 'kccrcckcrcck', 'kccckrkrcccC', 'kcckkrrccccC', 'kccckrrcCcck', 'kCcrcccrcccC', 'kcrCcccccrck', 'krcccccCccrC', 'kkkkkkkkkkkk'],
    barriera: ['............', '.rr......rr.', '.rrr....rrr.', '..rrr..rrr..', '...rrrrrr...', '....rrrr....', '....rrrr....', '...rrrrrr...', '..rrr..rrr..', '.rrr....rrr.', '.rr......rr.', '............'],
    porta: ['.kkkkkkkkkk.', '.kbBbbbbBbk.', '.kbkkkkkkbk.', '.kbkaaaakbk.', '.kbkaaaakbk.', '.kbkkkkkkbk.', '.kbbbbbbbbk.', '.kbbbbbkkbk.', '.kbbbbbkkbk.', '.kbBbbbbbbk.', '.kbbbbbbBbk.', '.kkkkkkkkkk.'],
    mappa: ['kkkkkkkkkkkk', 'kTTTTTTTTTTk', 'kTlllTTxxTTk', 'kTllTTTxxTTk', 'kTTTbbbbTTTk', 'kTTTbTTTTTTk', 'kTxxbTTllTTk', 'kTxxbbbblTTk', 'kTTTTTTblTTk', 'kTTlllTTbTTk', 'kTTTTTTTTTTk', 'kkkkkkkkkkkk'],
    orologio: ['....kkkk....', '..kkYYYYkk..', '.kYyyyyyyYk.', '.kYyxxxxyYk.', 'kYyxxxxxxyYk', 'kYyxXXxxxyYk', 'kYyeeeeeeyYk', 'kYyeeeEeeyYk', '.kYyeeeeyYk.', '.kYyyyyyyYk.', '..kkYYYYkk..', '....kkkk....'],
    bussola: ['....kkkk....', '..kkSSSSkk..', '.kSsssssSSk.', '.kSssrsssSk.', 'kSsssrrsssSk', 'kSssrrrssssk', 'kSssswwsssSk', 'kSsssswsssSk', '.kSssswssSk.', '.kSSsssssSk.', '..kkSSSSkk..', '....kkkk....']
  };
  function sprCanvas(rows, scale = 1) {
    const w = Math.max(...rows.map(r => r.length)), h = rows.length, c = document.createElement('canvas');
    c.width = w * scale; c.height = h * scale; const x = c.getContext('2d');
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (PAL[ch]) { x.fillStyle = PAL[ch]; x.fillRect(i * scale, j * scale, scale, scale); } }));
    return c;
  }
  const sprURL = (k, s = 1) => sprCanvas(SPR[k], s).toDataURL();
  const sprSVG = (k, size = 64) => { const rows = SPR[k], w = Math.max(...rows.map(r => r.length)); let r2 = ''; rows.forEach((r, j) => [...r].forEach((ch, i) => { if (PAL[ch]) r2 += `<rect x="${i}" y="${j}" width="1.04" height="1.04" fill="${PAL[ch]}"/>`; })); return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${w} ${rows.length}" shape-rendering="crispEdges">${r2}</svg>`; };
  const ico = k => `<i class="mci" style="background-image:url(${sprURL(k)})"></i>`;

  // ---------- texture 16×16 delle zone (generate qui, a caso ma sempre uguali) ----------
  function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function tex(seed, f) {
    const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'), r = rnd(seed);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { x.fillStyle = f(i, j, r); x.fillRect(i, j, 1, 1); }
    return x.getImageData(0, 0, 16, 16);
  }
  const pick = (a, r) => a[(r() * a.length) | 0];
  const TEX = {
    erba: () => tex(3, (i, j, r) => pick(['#5b9a37', '#67a940', '#528c31', '#5f9f3a', '#6fb045'], r)),
    prato: () => tex(5, (i, j, r) => r() < .06 ? pick(['#e0e04a', '#e85a8a', '#f4f4f4'], r) : pick(['#6aad43', '#77b84d', '#64a43f'], r)),
    foglie: () => tex(7, (i, j, r) => r() < .12 ? '#1e4413' : pick(['#2f6b1f', '#3a7d26', '#2a5f1c', '#357322'], r)),
    acqua: () => tex(11, (i, j, r) => (j % 5 === 1 && r() < .5) ? '#6f97ff' : pick(['#3f6fe0', '#4a7ce8', '#3a64d0'], r)),
    sabbia: () => tex(13, (i, j, r) => pick(['#dbcf8e', '#e3d89c', '#cfc283', '#d6ca88'], r)),
    grano: () => tex(17, (i, j, r) => (i % 4 === 0) ? '#6b4a2b' : pick(j % 3 ? ['#c9b24a', '#b89f3c'] : ['#a88a3a', '#d6c25a'], r)),
    legno: () => tex(19, (i, j, r) => (j % 4 === 3) ? '#5c4126' : ((i + (j >> 2) * 5) % 8 === 0 ? '#6b4b2c' : pick(['#a37b4a', '#9a7244', '#ad8552'], r))),
    pietra: () => tex(23, (i, j, r) => (j % 8 === 7 || (i + ((j >> 3) % 2) * 8) % 16 === 15) ? '#5e5e5e' : pick(['#8a8a8a', '#7f7f7f', '#959595'], r)),
    terra: () => tex(29, (i, j, r) => pick(['#866043', '#79553a', '#93694a', '#6c4b33'], r)),
    neve: () => tex(31, (i, j, r) => pick(['#f4f8ff', '#e8eef8', '#ffffff'], r)),
    binario: () => { const c = document.createElement('canvas'); c.width = 8; c.height = 10; const x = c.getContext('2d'); x.fillStyle = '#6b4a2b'; x.fillRect(0, 0, 8, 10); x.fillStyle = '#4e351e'; for (let i = 0; i < 8; i += 4) x.fillRect(i, 0, 1, 10); x.fillStyle = '#bdbdbd'; x.fillRect(0, 2, 8, 1); x.fillRect(0, 7, 8, 1); x.fillStyle = '#e8e8e8'; x.fillRect(0, 1, 8, 1); x.fillRect(0, 8, 8, 1); return x.getImageData(0, 0, 8, 10); },
    alimentato: () => { const c = document.createElement('canvas'); c.width = 8; c.height = 10; const x = c.getContext('2d'); x.fillStyle = '#6b4a2b'; x.fillRect(0, 0, 8, 10); x.fillStyle = '#4e351e'; for (let i = 0; i < 8; i += 4) x.fillRect(i, 0, 1, 10); x.fillStyle = '#ff2a1a'; x.fillRect(1, 4, 2, 2); x.fillRect(5, 4, 2, 2); x.fillStyle = '#d4a017'; x.fillRect(0, 2, 8, 1); x.fillRect(0, 7, 8, 1); x.fillStyle = '#ffe27a'; x.fillRect(0, 1, 8, 1); x.fillRect(0, 8, 8, 1); return x.getImageData(0, 0, 8, 10); }
  };

  // ---------- icone del gioco caricate dall'utente (solo sul telefono) ----------
  const SHEET = { heart: [52, 0, 9, 9], heartH: [61, 0, 9, 9], heartE: [16, 0, 9, 9], heartF: [25, 0, 9, 9], food: [52, 27, 9, 9], foodH: [61, 27, 9, 9], foodE: [16, 27, 9, 9], xp0: [0, 64, 182, 5], xp1: [0, 69, 182, 5], sig5: [0, 16, 10, 8], sig4: [0, 24, 10, 8], sig3: [0, 32, 10, 8], sig2: [0, 40, 10, 8], sig1: [0, 48, 10, 8], sig0: [0, 56, 10, 8] };
  let sheetImg = null;
  function loadSheet() {
    const src = A.store.get('mc.icons', null);
    if (!src) { sheetImg = null; applySprites(); return; }
    const im = new Image(); im.onload = () => { sheetImg = im; applySprites(); }; im.onerror = () => { sheetImg = null; applySprites(); }; im.src = src;
  }
  function crop(k) {
    const [x0, y0, w, h] = SHEET[k], s = sheetImg.naturalWidth / 256, c = document.createElement('canvas');
    c.width = Math.round(w * s); c.height = Math.round(h * s);
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(sheetImg, x0 * s, y0 * s, w * s, h * s, 0, 0, c.width, c.height);
    return c.toDataURL();
  }
  function sigDefault(n) {
    const rows = []; for (let j = 0; j < 8; j++) { let r = ''; for (let b = 0; b < 5; b++) { const hgt = 2 + b * 1.5; const on = b < n; r += (8 - j <= hgt) ? (on ? 'e' : 'D') : '.'; r += '.'; } rows.push(r); }
    if (!n) return sprCanvas(['r.....r...', '.r...r....', '..r.r.....', '...r......', '..r.r.....', '.r...r....', 'r.....r...', '..........']).toDataURL();
    return sprCanvas(rows).toDataURL();
  }
  function applySprites() {
    const b = document.body.style, set = (k, url) => b.setProperty('--mc-' + k, `url(${url})`);
    for (const k of ['heart', 'heartH', 'heartE', 'heartF', 'food', 'foodH', 'foodE']) set(k, sheetImg ? crop(k) : sprURL(k));
    for (let n = 0; n <= 5; n++) set('sig' + n, sheetImg ? crop('sig' + n) : sigDefault(n));
    document.body.classList.toggle('mc-sheet', !!sheetImg);
    if (sheetImg) { set('xp0', crop('xp0')); set('xp1', crop('xp1')); } else { b.removeProperty('--mc-xp0'); b.removeProperty('--mc-xp1'); }
  }
  const clearSprites = () => { const b = document.body.style; [...b].filter(p => p.startsWith('--mc-')).forEach(p => b.removeProperty(p)); document.body.classList.remove('mc-sheet'); };

  // ---------- suoni a 8 bit ----------
  const snd = (n, type = 'square', v = .12) => { if (S().sounds) A.voice.tone(n, type, v); };
  const pop = () => snd([[1250, .05, 0], [1650, .05, .04]], 'square', .1);
  const ding = () => snd([[1568, .07, 0], [2093, .14, .06]], 'sine', .2);
  const hurt = () => snd([[240, .12, 0], [170, .18, .09]], 'square', .14);
  const levelUp = () => snd([[523, .12, 0], [659, .12, .1], [784, .12, .2], [1047, .35, .3]], 'square', .1);
  const chime = () => snd([[784, .2, 0], [988, .2, .15], [1175, .4, .3]], 'triangle', .16);
  const speak = t => { if (A.wantsInstrVoice()) A.voice.speak(t); };

  // ---------- chat, titoli, barra azioni, progressi ----------
  function chat(html, ms = 9000) {
    const box = $('mChat'); if (!box) return;
    const el = document.createElement('div'); el.className = 'ln'; el.innerHTML = '<span class="who">&lt;Navigatore&gt;</span> ' + html; box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 900); }, ms);
  }
  let titleT;
  function title(t, s, ms) {
    const el = $('mTitle'); if (!el) return;
    if ($('mTT').textContent !== t) { el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); }
    $('mTT').textContent = t; $('mTS').innerHTML = s || ''; el.hidden = false;
    clearTimeout(titleT); titleT = ms ? setTimeout(() => { el.hidden = true; titleT = 0; }, ms) : 0;
  }
  const untitle = () => { const el = $('mTitle'); if (el && !titleT) el.hidden = true; };
  let toastQ = [], toastBusy = false;
  function toast(head, body, col = '#ffff55') { toastQ.push([head, body, col]); if (!toastBusy) nextToast(); }
  function nextToast() {
    const el = $('mToast'), it = toastQ.shift(); if (!el || !it) { toastBusy = false; return; }
    toastBusy = true; $('mToH').textContent = it[0]; $('mToH').style.color = it[2]; $('mToB').textContent = it[1];
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); chime();
    setTimeout(() => { el.classList.remove('on'); setTimeout(nextToast, 500); }, 4500);
  }

  // ---------- progressi ----------
  const ADV = {
    primo: ['Si parte!', 'Arriva alla prima destinazione'], tappa: ['Fermata intermedia', 'Raggiungi una tappa'],
    km100: ['Viaggiatore', 'Percorri 100 km'], km1000: ['Esploratore', 'Percorri 1000 km'],
    cuori: ['Pilota modello', 'Arriva a più di 10 km di distanza senza perdere cuori'], notte: ['Guidatore notturno', 'Arriva a destinazione di notte'],
    velox: ['Occhio di falco', 'Passa 10 autovelox senza superare il limite'], pausa: ['Spuntino', 'Fermati abbastanza da far tornare piena la fame'],
    liv10: ['Veterano', 'Raggiungi il livello 10'], multa: ['Ops', 'Perdi tutti i cuori']
  };
  function grant(id) {
    const s = S(); s.adv = s.adv || {}; if (s.adv[id] || A.drive.sim) return;
    s.adv[id] = Date.now(); save(); toast('Progresso fatto!', ADV[id][0]);
  }

  // ---------- livelli (km di sempre) ----------
  const kmFor = L => 5 * L * (L + 1); // 10, 30, 60, 100, 150 km…
  function levelOf(km) { let L = 0; while (kmFor(L + 1) <= km) L++; return L; }

  // ---------- cuori, fame, notte ----------
  const G = { hp: 20, food: 20, hurtAt: 0, regenAt: 0, foodAt: 0, stopSince: 0, lostAny: false, level: 0, veloxOk: 0, hungerSaid: false, lastDrive: 0 };
  function renderBars() {
    const h = $('mHearts'), f = $('mFood'); if (!h) return;
    let hs = '', fs = '';
    for (let i = 0; i < 10; i++) { const v = G.hp - i * 2; hs += `<i class="${v >= 2 ? 'h' : v === 1 ? 'hh' : 'he'}"></i>`; }
    for (let i = 0; i < 10; i++) { const v = G.food - i * 2; fs += `<i class="${v >= 2 ? 'f' : v === 1 ? 'fh' : 'fe'}"></i>`; }
    h.innerHTML = hs; f.innerHTML = fs;
    h.classList.toggle('low', G.hp <= 4);
  }
  function lifeTick(t, sim) {
    const now = Date.now(), s = S();
    if (s.hearts && t.limit && t.kmh > t.limit + 5) {
      if (now - G.hurtAt > 3000) {
        G.hurtAt = now; G.hp = Math.max(0, G.hp - 1); G.lostAny = true; hurt();
        const h = $('mHearts'); h.classList.remove('hit'); void h.offsetWidth; h.classList.add('hit');
        if (G.hp === 0) {
          title('Sei stato multato!', `Limite <span class="y">${t.limit}</span> · andavi a ${t.kmh}`, 3500);
          chat(`Hai perso tutti i cuori: rispetta il limite di <span class="y">${t.limit}</span>.`);
          if (!sim) { A.stats.extra.multe = (A.stats.extra.multe || 0) + 1; A.saveStats(true); }
          grant('multa'); G.hp = 20;
        }
      }
      G.regenAt = now;
    } else if (G.hp < 20 && now - G.regenAt > 10000) { G.regenAt = now; G.hp++; }
    // fame: mezza coscia ogni 6 minuti di guida, torna piena se ti fermi
    if (s.food) {
      if (t.kmh > 3) { G.stopSince = 0; if (now - G.foodAt > 360000) { G.foodAt = now; G.food = Math.max(0, G.food - 1); } }
      else { if (!G.stopSince) G.stopSince = now; if (now - G.stopSince > 60000 && G.food < 20 && now - G.foodAt > 15000) { G.foodAt = now; G.food++; if (G.food === 20) { grant('pausa'); G.hungerSaid = false; } } }
      if (G.food <= 10 && !G.hungerSaid) { G.hungerSaid = true; hungerHint(); }
    }
    renderBars();
  }
  function hungerHint() {
    let near = '';
    try {
      const f = A.map.queryRenderedFeatures({ layers: ['mc-blips'] }).filter(x => ['cafe', 'bar', 'fast_food', 'restaurant'].includes((x.properties || {}).class));
      const me = A.drive.fix && A.drive.fix.ll;
      if (me && f.length) { f.sort((a, b) => A.distLL(me, [a.geometry.coordinates[1], a.geometry.coordinates[0]]) - A.distLL(me, [b.geometry.coordinates[1], b.geometry.coordinates[0]])); const p = f[0].properties; near = ` Il più vicino: <span class="y">${esc(p['name:it'] || p.name || 'un bar')}</span>.`; }
    } catch { /* niente */ }
    chat('Guidi da un\'ora: hai fame. Fai una pausa?' + near, 14000); speak('Guidi da un\'ora. Fai una pausa.');
  }
  function sunAlt(lat, lon, d = new Date()) {
    const rad = Math.PI / 180, J = d / 864e5 + 2440587.5 - 2451545, M = (357.5291 + 0.98560028 * J) * rad;
    const L = (280.459 + 0.98564736 * J) * rad + (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M)) * rad;
    const dec = Math.asin(Math.sin(L) * Math.sin(23.44 * rad)), ra = Math.atan2(Math.cos(23.44 * rad) * Math.sin(L), Math.cos(L));
    const H = ((280.16 + 360.9856235 * J) * rad + lon * rad) - ra;
    return Math.asin(Math.sin(lat * rad) * Math.sin(dec) + Math.cos(lat * rad) * Math.cos(dec) * Math.cos(H)) / rad;
  }
  let nightT;
  function applyNight() {
    const el = $('mNight'); if (!el) return;
    const mode = S().night; let k = 0;
    if (mode === 'notte') k = 1; else if (mode === 'auto') { const c = A.map.getCenter(), a = sunAlt(c.lat, c.lng); k = a > 0 ? 0 : a < -8 ? 1 : -a / 8; }
    el.style.opacity = (k * 0.62).toFixed(2); document.body.classList.toggle('mc-dark', k > 0.5);
  }
  const isNight = () => { const c = A.map.getCenter(); return sunAlt(c.lat, c.lng) < -4; };

  // ---------- mappa a blocchi ----------
  function addTextures(map) {
    const r = ratio();
    for (const [k, f] of Object.entries(TEX)) { const id = 'mc-' + k; if (map.hasImage(id)) map.removeImage(id); map.addImage(id, f(), { pixelRatio: r }); }
  }
  let BLD = [];
  function restyle(map) {
    addTextures(map); BLD = [];
    for (const l of map.getStyle().layers) {
      const id = l.id, sl = l['source-layer'] || '', key = id + ' ' + sl;
      try {
        if (l.type === 'background') { map.setPaintProperty(id, 'background-color', '#5f9f3a'); map.setPaintProperty(id, 'background-pattern', 'mc-erba'); }
        else if (l.type === 'fill') {
          let t = null;
          if (/water|ocean|lake/.test(key)) t = 'acqua';
          else if (/wood|forest/.test(key)) t = 'foglie';
          else if (/sand|beach/.test(key)) t = 'sabbia';
          else if (/ice|glacier|snow/.test(key)) t = 'neve';
          else if (/farm|crop|orchard|vineyard/.test(key)) t = 'grano';
          else if (/park|grass|meadow|scrub|wetland|cemetery|landcover|natural/.test(key)) t = 'prato';
          else if (/building/.test(key)) t = 'legno';
          else if (/industrial|commercial|retail|railway|aeroway|airport|quarry|construction/.test(key)) t = 'pietra';
          else if (/residential|landuse/.test(key)) t = 'erba';
          if (t) map.setPaintProperty(id, 'fill-pattern', 'mc-' + t);
          map.setPaintProperty(id, 'fill-outline-color', 'rgba(0,0,0,0)');
          if (/building/.test(key)) { map.setPaintProperty(id, 'fill-pattern', 'mc-legno'); map.setPaintProperty(id, 'fill-opacity', 1); BLD.push(id); }
        }
        else if (l.type === 'fill-extrusion') {
          map.setPaintProperty(id, 'fill-extrusion-pattern', 'mc-legno'); BLD.push(id);
          map.setPaintProperty(id, 'fill-extrusion-opacity', 1);
          map.setLayoutProperty(id, 'visibility', S().world ? 'visible' : 'none');
        }
        else if (l.type === 'line') {
          const c = v => map.setPaintProperty(id, 'line-color', v);
          if (/boundary|admin/.test(key)) map.setLayoutProperty(id, 'visibility', 'none');
          else if (/water|river|stream|canal/.test(key)) c('#3f6fe0');
          else if (/casing/.test(id)) map.setPaintProperty(id, 'line-opacity', 0);
          else if (/rail|transit/.test(key)) { try { map.setPaintProperty(id, 'line-dasharray', undefined); } catch { /* niente */ } map.setPaintProperty(id, 'line-pattern', 'mc-binario'); map.setPaintProperty(id, 'line-width', ['interpolate', ['linear'], ['zoom'], 10, 2, 16, 8]); }
          else if (/path|track|pedestrian|footway|cycle|steps|bridleway/.test(id)) c('#866043');
          else if (/motorway|trunk/.test(id)) c('#6f6f6f');
          else if (sl === 'transportation' || /road|street|bridge|tunnel|highway|minor|primary|secondary|tertiary|service/.test(id)) c('#8c8781');
          else c('#7a7a7a');
        }
        else if (l.type === 'symbol') {
          if (sl === 'poi' || /poi|shield|housenum/.test(id)) { map.setLayoutProperty(id, 'visibility', 'none'); continue; }
          if (l.layout && l.layout['text-field'] !== undefined) {
            map.setPaintProperty(id, 'text-color', /water/.test(key) ? '#cfe0ff' : '#ffffff'); map.setPaintProperty(id, 'text-halo-color', '#3f3f3f'); map.setPaintProperty(id, 'text-halo-width', 1.6);
            map.setLayoutProperty(id, 'text-font', ['Noto Sans Bold']);
          }
        }
        else if (l.type === 'hillshade') map.setLayoutProperty(id, 'visibility', 'none');
      } catch { /* niente */ }
    }
  }
  const CLASS2 = { fuel: 'fornace', bar: 'pozione', beer: 'pozione', pub: 'pozione', pharmacy: 'farmacia', restaurant: 'torta', fast_food: 'torta', hospital: 'mela', shop: 'baule', grocery: 'baule', lodging: 'letto', police: 'scudo', bank: 'smeraldo', cafe: 'tazza', railway: 'carrello', parking: 'cartello', place_of_worship: 'campana' };
  const CATNAME = { fuel: 'Distributore', bar: 'Bar', beer: 'Birreria', pub: 'Pub', pharmacy: 'Farmacia', restaurant: 'Ristorante', fast_food: 'Fast food', hospital: 'Ospedale', shop: 'Negozio', grocery: 'Supermercato', lodging: 'Hotel', police: 'Polizia', bank: 'Banca', cafe: 'Bar', railway: 'Stazione', parking: 'Parcheggio', place_of_worship: 'Chiesa' };
  const ICONS = { cam: sprSVG('occhio'), tutor: sprSVG('occhioT') };
  for (const k of new Set(Object.values(CLASS2))) ICONS['mc-' + k] = sprSVG(k);

  // ---------- frecce dei titoli ----------
  const actionText = m => {
    if (!m) return '';
    if (m.type === 'arrive') return m.final ? 'Sei arrivato' : 'Tappa';
    return A.cap(m.text);
  };

  // ---------- HUD ----------
  const slot = (id, inner, extra = '') => `<button class="slot" id="${id}" ${extra}>${inner}</button>`;
  const HUD = `
    <div id="mChat" class="mchat"></div>
    <div id="mToast" class="mtoast"><b id="mToH"></b><span id="mToB"></span></div>
    <div id="mSig" class="msig"></div>
    <div id="mTitle" class="mtitle" hidden><div id="mTT" class="tt"></div><div id="mTS" class="ts"></div></div>
    <div class="mbottom">
      <div id="mAction" class="maction"></div>
      <div class="mbars"><div id="mHearts" class="mhearts"></div><div id="mFood" class="mfood"></div></div>
      <div class="mxp"><div class="bar"><i id="mXp"></i></div><b id="mLvl">0</b></div>
      <div class="hotbar">
        ${slot('mSpd', '<b id="mSpdV">0</b><small>km/h</small>', 'tabindex="-1"')}
        ${slot('mLim', '<span id="mLimV" class="lim"></span>', 'tabindex="-1"')}
        ${slot('mRem', ico('mappa') + '<em id="mRemV"></em>', 'tabindex="-1"')}
        ${slot('mEta', ico('orologio') + '<em id="mEtaV"></em>', 'tabindex="-1"')}
        ${slot('mE1', '', 'tabindex="-1"')}
        ${slot('mE2', '', 'tabindex="-1"')}
        ${slot('mMute', ico('nota'), 'aria-label="Voce"')}
        ${slot('mRoad', ico('barriera'), 'aria-label="Strada chiusa"')}
        ${slot('mEnd', ico('porta'), 'aria-label="Termina"')}
      </div>
    </div>`;
  const OVER = `<div id="mNight" class="mnight"></div>
    <div id="mFree" class="mfree"><div id="mFreeAct" class="maction"></div><div id="mFreeBar" class="hotbar"></div></div>`;

  function renderFree() {
    const bar = $('mFreeBar'); if (!bar) return;
    const pl = A.places.slice(0, 7);
    let h = '';
    for (let i = 0; i < 7; i++) {
      const p = pl[i];
      h += p ? `<button class="slot" data-p="${p.id}" aria-label="${esc(p.name)}"><span class="pl" style="color:${p.color || '#fff'}">${esc((p.letter || p.name[0] || '?').toUpperCase())}</span><em>${esc(p.name.slice(0, 6))}</em></button>` : '<button class="slot" tabindex="-1"></button>';
    }
    h += `<button class="slot" id="mNorth" aria-label="Nord in alto">${ico('bussola')}</button><button class="slot" id="mClock" tabindex="-1">${ico('orologio')}<em id="mClockV"></em></button>`;
    bar.innerHTML = h;
    bar.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { pop(); const p = A.places.find(x => x.id === b.dataset.p); if (p) A.setDestination({ lat: p.ll[0], lon: p.ll[1], name: p.name, placeId: p.id }); });
    $('mNorth').onclick = () => { pop(); A.cam.headingUp = false; A.map.easeTo({ bearing: 0, duration: 400 }); };
    updClock();
  }
  const updClock = () => { const el = $('mClockV'); if (el) el.textContent = A.clock(new Date()); };
  function freeAction() {
    const el = $('mFreeAct'); if (!el) return;
    const w = A.gps.where || {}, v = A.gps.fix ? Math.round((A.gps.fix.speed || 0) * 3.6) : 0;
    el.innerHTML = [w.street, w.zone].filter(Boolean).map(esc).join(' · ') + (v > 3 ? ` · <span class="y">${v} km/h</span>` : '');
  }

  let curMan = null, endArm = 0, roadArm = 0, lastLvl = -1;
  function onTick(t) {
    const m = t.next, dist = m ? m.s - t.s : 0;
    if (m !== curMan) { curMan = m; if (m) pop(); }
    if (m && dist < 250 && !titleT) title(actionText(m), `tra ${A.fmtDist(dist)}${m.name ? ' · ' + esc(m.name) : ''}`);
    else if (!titleT) untitle();
    $('mAction').innerHTML = m && dist >= 250 ? `${esc(actionText(m))} tra <span class="y">${A.fmtDist(dist)}</span>${m.name ? ' · ' + esc(m.name) : ''}` : esc(t.street || '');
    $('mSpdV').textContent = t.kmh;
    $('mSpd').classList.toggle('over', !!(t.limit && t.kmh > t.limit + 5));
    $('mLimV').textContent = t.limit || ''; $('mLim').classList.toggle('none', !t.limit);
    $('mRemV').textContent = A.fmtDist(t.rem).replace(' ', '');
    $('mEtaV').textContent = A.clock(t.eta);
    const km = (A.stats.km || 0), L = levelOf(km);
    $('mLvl').textContent = L; $('mXp').style.width = (100 * t.progress).toFixed(1) + '%';
    if (lastLvl >= 0 && L > lastLvl && !A.drive.sim) { levelUp(); title('Livello ' + L, `${Math.round(km)} km con APEX`, 3000); if (L >= 10) grant('liv10'); }
    lastLvl = L;
    if (km >= 100) grant('km100'); if (km >= 1000) grant('km1000');
    const acc = (A.drive.fix && A.drive.fix.acc) || 10, n = acc < 8 ? 5 : acc < 15 ? 4 : acc < 25 ? 3 : acc < 40 ? 2 : acc < 80 ? 1 : 0;
    $('mSig').style.backgroundImage = `var(--mc-sig${n})`;
    lifeTick(t, A.drive.sim);
  }

  // ---------- impostazioni ----------
  function settingsHTML() {
    const s = S(), has = !!A.store.get('mc.icons', null);
    const sel = (id, v, opts) => `<select id="${id}">${opts.map(([k, l]) => `<option value="${k}" ${v === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    return `<h3>Minecraft</h3>
      <label class="select"><span>Grandezza dei pixel della mappa</span>${sel('mtPixel', s.pixel, [['grossi', 'Grossi'], ['medi', 'Medi'], ['fini', 'Fini (nomi più leggibili)']])}</label>
      <label class="select"><span>Vista</span>${sel('mtWorld', s.world ? '1' : '0', [['0', 'Mappa piatta, dall\'alto'], ['1', 'Mondo 3D con edifici a blocchi']])}</label>
      <label class="select"><span>Giorno e notte</span>${sel('mtNight', s.night, [['auto', 'Automatico (alba e tramonto veri)'], ['giorno', 'Sempre giorno'], ['notte', 'Sempre notte']])}</label>
      <label class="select"><span>Veicolo</span>${sel('mtVeh', s.vehicle, [['freccia', 'Freccia'], ['carrello', 'Carrello']])}</label>
      <label class="toggle"><input id="mtHearts" type="checkbox" ${s.hearts ? 'checked' : ''}><span>Cuori: li perdi se superi il limite</span></label>
      <label class="toggle"><input id="mtFood" type="checkbox" ${s.food ? 'checked' : ''}><span>Fame: dopo un'ora di guida ti propone una pausa</span></label>
      <label class="toggle"><input id="mtBlips" type="checkbox" ${s.blips ? 'checked' : ''}><span>Luoghi a pixel sulla mappa (fornace = benzinaio, pozione = bar…)</span></label>
      <label class="toggle"><input id="mtSounds" type="checkbox" ${s.sounds ? 'checked' : ''}><span>Suoni</span></label>
      <div class="row"><label class="btn ghost small filebtn">${has ? 'Cambia' : 'Carica'} le icone del gioco<input id="mtSheet" type="file" accept="image/*"></label>${has ? '<button id="mtSheetDel" class="btn ghost small">Usa le mie</button>' : ''}</div>
      <p class="hint">${has ? 'Icone del gioco caricate: restano solo su questo telefono.' : 'L\'immagine con cuori, cosce ed esperienza (icons.png, anche ingrandita): resta solo sul telefono. Senza, uso i miei disegni.'}</p>`;
  }
  function bindSettings() {
    const s = S();
    $('mtPixel').onchange = () => { s.pixel = $('mtPixel').value; save(); A.map.setPixelRatio(ratio()); A.reloadMapStyle(); };
    $('mtWorld').onchange = () => { s.world = $('mtWorld').value === '1'; save(); A.reloadMapStyle(); };
    $('mtNight').onchange = () => { s.night = $('mtNight').value; save(); applyNight(); };
    $('mtVeh').onchange = () => { s.vehicle = $('mtVeh').value; save(); A.vehicle.redraw && A.vehicle.redraw(); };
    for (const [id, k] of [['mtHearts', 'hearts'], ['mtFood', 'food'], ['mtSounds', 'sounds']]) $(id).onchange = () => { s[k] = $(id).checked; save(); };
    $('mtBlips').onchange = () => { s.blips = $('mtBlips').checked; save(); if (A.map.getLayer('mc-blips')) A.map.setLayoutProperty('mc-blips', 'visibility', s.blips ? 'visible' : 'none'); };
    $('mtSheet').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => { const im = new Image(); im.onload = () => { if (Math.abs(im.naturalWidth - im.naturalHeight) > 2 || im.naturalWidth < 256) { A.toast('Non sembra il foglio di icone (deve essere quadrato)', 3500); return; } try { A.store.set('mc.icons', rd.result); } catch { A.toast('Immagine troppo grande', 3000); return; } loadSheet(); A.toast('Icone caricate', 2500); A.emit('styleChanged'); }; im.src = rd.result; };
      rd.readAsDataURL(f);
    };
    if ($('mtSheetDel')) $('mtSheetDel').onclick = () => { A.store.set('mc.icons', null); loadSheet(); A.emit('styleChanged'); };
  }

  let off = [], clockT = 0;
  A.registerStyle({
    id: ID, name: 'Minecraft', tagline: 'mondo a blocchi',
    defaults: { pixel: 'medi', world: false, night: 'auto', vehicle: 'freccia', hearts: true, food: true, blips: true, sounds: true, adv: {} },
    instrDefault: true,
    icons: ICONS,
    routeTheme: { route: '#d4a017', casing: '#3f2a14', casingOpacity: 0.9, width: 7, alt: '#8c8781', done: '#6b4a2b' },
    restyle,
    addLayers(map) {
      // edifici alti in pietra: copia del livello con solo quelli (le texture scelte per elemento non funzionano)
      const layers = map.getStyle().layers;
      for (const id of BLD) {
        const k = layers.findIndex(l => l.id === id); if (k < 0) continue;
        const l = layers[k], copy = { id: id + '-mc-pietra', type: l.type, source: l.source, 'source-layer': l['source-layer'], minzoom: l.minzoom || 0, layout: Object.assign({}, l.layout || {}), paint: Object.assign({}, l.paint || {}), filter: ['>', ['to-number', ['coalesce', ['get', 'render_height'], 0], 0], 14] };
        copy.paint[l.type === 'fill' ? 'fill-pattern' : 'fill-extrusion-pattern'] = 'mc-pietra';
        try { map.addLayer(copy, layers[k + 1] ? layers[k + 1].id : undefined); } catch (e) { console.warn(e); }
      }
      try { map.setPaintProperty('apex-route', 'line-pattern', 'mc-alimentato'); map.setPaintProperty('apex-alts', 'line-pattern', 'mc-binario'); map.setPaintProperty('apex-alts', 'line-opacity', .7); } catch { /* niente */ }
      const st = map.getStyle(), v = Object.keys(st.sources).find(k => st.sources[k].type === 'vector');
      if (!v) return;
      map.addLayer({ id: 'mc-blips', type: 'symbol', source: v, 'source-layer': 'poi', minzoom: 13.5,
        filter: ['in', ['get', 'class'], ['literal', Object.keys(CLASS2)]],
        layout: { 'icon-image': ['match', ['get', 'class'], ...Object.entries(CLASS2).flatMap(([c, g]) => [c, 'apex-mc-' + g]), 'apex-mc-baule'],
          'icon-size': 0.5, 'icon-allow-overlap': false, 'icon-pitch-alignment': 'viewport', 'icon-rotation-alignment': 'viewport', 'symbol-sort-key': ['coalesce', ['get', 'rank'], 99], visibility: S().blips ? 'visible' : 'none' } });
    },
    onMapClick(e) {
      if (!A.map.getLayer('mc-blips')) return false;
      const f = A.map.queryRenderedFeatures([[e.point.x - 12, e.point.y - 12], [e.point.x + 12, e.point.y + 12]], { layers: ['mc-blips'] });
      if (!f.length) return false;
      const p = f[0].properties || {}, nome = p['name:it'] || p.name || '', cat = CATNAME[p.class] || 'Luogo';
      const [lon, lat] = f[0].geometry.coordinates;
      pop();
      A.setDestination({ lat, lon, name: nome ? (nome.toLowerCase().includes(cat.toLowerCase()) ? nome : `${nome} · ${cat}`) : cat });
      return true;
    },
    vehicle() { return { html: sprSVG(S().vehicle === 'carrello' ? 'carrello' : 'freccia', 36), align: 'map', cls: 'mcveh' }; },
    driveVehicleMode: () => 'top',
    camera(p) {
      const w = !!S().world;
      if (!p.drive) return { pitch: w ? 45 : 0, padTop: 0.2 };
      const v = p.speed * 3.6;
      return { pitch: w ? 58 : 0, padTop: w ? 0.42 : 0.3, zoom: v > 90 ? 15.2 : v > 60 ? 15.8 : v > 35 ? 16.3 : 16.8 };
    },
    settingsHTML, bindSettings,
    statsRows(s) {
      const a = S().adv || {}, km = s.km || 0, L = levelOf(km);
      return [['Livello', `${L} · prossimo a ${kmFor(L + 1)} km`], ['Multe (cuori finiti)', s.extra.multe || 0],
        ['Progressi', `${Object.keys(a).length} di ${Object.keys(ADV).length}`],
        ...Object.entries(ADV).map(([k, [n, d]]) => [(a[k] ? '★ ' : '☆ ') + n, d])];
    },
    mount() {
      $('hud').innerHTML = HUD;
      document.body.insertAdjacentHTML('beforeend', OVER);
      A.map.setPixelRatio(ratio());
      loadSheet(); renderFree(); renderBars(); applyNight(); freeAction();
      nightT = setInterval(applyNight, 60000); clockT = setInterval(updClock, 15000);
      const mute = () => { $('mMute').innerHTML = ico(A.settings.muted ? 'muta' : 'nota'); };
      $('mMute').onclick = () => { pop(); A.settings.muted = !A.settings.muted; A.saveSettings(); mute(); if (A.settings.muted) A.voice.stop(); };
      mute();
      $('mEnd').onclick = () => { pop(); if (Date.now() - endArm < 3000) { endArm = 0; A.drive.stop(); } else { endArm = Date.now(); chat('Tocca di nuovo la porta per terminare il viaggio.', 3000); } };
      $('mRoad').onclick = () => {
        pop(); const f = A.drive.fix; if (!f) return;
        if (Date.now() - roadArm < 3000) {
          roadArm = 0;
          const p = A.pointAtS(A.cur.route, A.drive.estS() + 40).ll;
          A.addBlock(p); chat('Strada chiusa segnata per 7 giorni. Cerco un\'altra strada.', 5000); speak('Strada chiusa segnalata. Cerco un percorso alternativo.');
          A.drive.nextReroute = 0; A.drive.reroute(f.ll[0], f.ll[1], A.drive.lastHeading);
        } else { roadArm = Date.now(); chat('Strada bloccata davanti? Tocca di nuovo la barriera.', 3000); }
      };
      off = [
        A.on('places', renderFree),
        A.on('gps', freeAction), A.on('where', freeAction),
        A.on('driveStart', d => {
          $('hud').hidden = false; curMan = undefined; lastLvl = -1;
          if (d && d.resume) { renderBars(); return; }
          const now = Date.now();
          if (now - G.lastDrive > 15 * 60000) G.food = 20;
          Object.assign(G, { hp: 20, hurtAt: 0, regenAt: now, foodAt: now, stopSince: 0, lostAny: false, veloxOk: 0, hungerSaid: G.food <= 10 });
          renderBars();
          const dest = (A.plan.to || {}).name || 'destinazione';
          title(dest, `${A.fmtDist(A.cur.route.length)} · arrivo ${A.clock(new Date(Date.now() + ((A.cur.osrm && A.cur.osrm.duration) || 0) * 1000))}`, 3000);
          chat(`Viaggio verso <span class="y">${esc(dest)}</span> iniziato.`);
          speak(`Percorso impostato. ${A.spokenDist(A.cur.route.length)}.`);
        }),
        A.on('driveStop', () => { $('hud').hidden = true; G.lastDrive = Date.now(); clearTimeout(titleT); titleT = 0; const t = $('mTitle'); if (t) t.hidden = true; }),
        A.on('tick', onTick),
        A.on('instr', i => speak(i.text)),
        A.on('cam', c => {
          const what = c.type === 'tutor' ? 'Tutor' : 'Autovelox'; snd([[988, .1, 0], [988, .1, .18]], 'square', .12);
          speak(`${what} tra ${A.spokenDist(c.dist)}${c.max ? ', limite ' + c.max : ''}.`);
          chat(`<span class="r">${what}</span> tra ${A.fmtDist(c.dist)}${c.max ? `, limite <span class="y">${c.max}</span>` : ''}`);
          const fx = A.drive.fix, kmh = fx ? fx.v * 3.6 : 0;
          if (!c.max || kmh <= c.max + 3) { const s = S(); s.velox = (s.velox || 0) + 1; save(); if (s.velox >= 10) grant('velox'); }
        }),
        A.on('via', v => { ding(); title('Tappa raggiunta', esc(v.name), 3000); chat(`Tappa raggiunta: <span class="y">${esc(v.name)}</span>`); speak('Tappa raggiunta.'); grant('tappa'); }),
        A.on('arrive', a => {
          levelUp(); title('Sei arrivato!', `${A.fmtDist(a.dist)} in ${A.fmtMin(a.sec)}`, 6000);
          speak('Sei arrivato a destinazione.'); grant('primo');
          if (!G.lostAny && a.dist > 10000) grant('cuori'); if (isNight()) grant('notte');
        }),
        A.on('reroute', r => { chat('Ricalcolo del percorso…', 4000); if (r.speak) speak('Ricalcolo del percorso.'); }),
        A.on('offRoute', () => chat('<span class="r">Sei fuori dal percorso della prova</span>', 5000))
      ];
      if (A.cur) A.renderSheet();
    },
    unmount() {
      off.forEach(f => f()); off = [];
      clearInterval(nightT); clearInterval(clockT);
      ['mNight', 'mFree'].forEach(id => { const el = $(id); if (el) el.remove(); });
      document.body.classList.remove('mc-dark');
      clearSprites();
      A.map.setPixelRatio(null);
      $('hud').innerHTML = '';
    }
  });
})();
