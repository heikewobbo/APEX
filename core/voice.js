/* APEX — voce comune a tutti gli stili.
   - clip registrate (es. copilota rally): decodificate offline, ogni frase diventa un WAV suonato da <audio>
     (iOS/CarPlay lo gestiscono come un vocale; Web Audio su CarPlay va a scatti)
   - sintesi vocale del telefono per le frasi libere
   - piccoli suoni (avvisi) generati come WAV */
(function () {
  'use strict';
  const A = window.APEX;
  const RATE = 44100;
  let clips = new Map(), buffers = new Map(), decoding = null, speaking = false, itVoice = null;
  let dec = null, player = null, fx = null, curUrl = null, unlocked = false, aliases = {};
  const S = () => A.settings || {};

  function pickVoice() { try { const vs = speechSynthesis.getVoices().filter(v => /^it/i.test(v.lang)); itVoice = vs.find(v => /Alice|Luca|Federica|Paola/i.test(v.name)) || vs[0] || null; } catch { /* niente */ } }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

  function decoder() { if (!dec) { const O = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (O) dec = new O(1, 1, RATE); } return dec; }
  function decodeData(buf) { return new Promise((res, rej) => { const d = decoder(); if (!d) return rej(new Error('no audio')); const p = d.decodeAudioData(buf.slice(0), res, rej); if (p && p.then) p.then(res, rej); }); }
  function setSession() { try { if (navigator.audioSession) navigator.audioSession.type = S().audioMode === 'navigatore' ? 'transient' : 'playback'; } catch { /* vecchio iOS */ } }
  function wavURL(f32) {
    const n = f32.length, b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
    const w = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) { const x = Math.max(-1, Math.min(1, f32[i])); v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true); }
    return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
  }
  // va chiamata da un tocco: sblocca audio e sintesi (poi iOS li lascia suonare da soli)
  function unlock() {
    setSession();
    if (!player) { player = new Audio(); player.setAttribute('playsinline', ''); fx = new Audio(); fx.setAttribute('playsinline', ''); }
    if (!unlocked) {
      const u = wavURL(new Float32Array(Math.round(RATE * 0.05)));
      player.src = u; fx.src = u;
      const p = player.play(); fx.play().catch(() => {});
      if (p && p.then) p.then(() => { unlocked = true; }, () => {}); else unlocked = true;
    }
    if ('speechSynthesis' in window && !unlock.tts) { unlock.tts = true; try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch { /* niente */ } }
    if (clips.size && !decoding) decoding = decodeAll();
  }
  async function decodeAll() {
    const names = [...clips.keys()];
    for (let i = 0; i < names.length; i += 8) await Promise.all(names.slice(i, i + 8).map(async n => { try { buffers.set(n, trim(await decodeData(clips.get(n)))); } catch { /* userà la sintesi */ } }));
  }
  function trim(buf) {
    const d = buf.getChannelData(0), th = 0.02, pad = Math.floor(RATE * 0.015);
    let a = 0, b = d.length - 1;
    while (a < b && Math.abs(d[a]) < th) a++;
    while (b > a && Math.abs(d[b]) < th) b--;
    a = Math.max(0, a - pad); b = Math.min(d.length - 1, b + pad);
    return b - a < 100 ? d.slice() : d.slice(a, b + 1);
  }
  const variants = t => [t, t + '1', t + '2', t + '_1', t + '_2'];
  const has = t => variants(t.toLowerCase()).some(c => clips.has(c));
  const aliasOf = t => { const a = aliases[t]; return !has(t) && a && a.every(has) ? a : null; };
  const expand = tokens => tokens.flatMap(t => aliasOf(t) || [t]);
  function resolve(tok) { const c = variants(tok.toLowerCase()).filter(x => buffers.has(x)); return c.length ? buffers.get(c[Math.floor(Math.random() * c.length)]) : null; }
  function join(list) {
    const gap = Math.round(RATE * 0.03), out = new Float32Array(list.reduce((a, b) => a + b.length, 0) + gap * (list.length - 1));
    let o = 0; for (const b of list) { out.set(b, o); o += b.length + gap; }
    return out;
  }
  function playOn(el, f32) {
    return new Promise(res => {
      let done = false; const fin = () => { if (!done) { done = true; res(); } };
      const url = wavURL(f32);
      if (el === player) { if (curUrl) URL.revokeObjectURL(curUrl); curUrl = url; }
      el.onended = fin; el.onerror = fin; el.src = url;
      const p = el.play(); if (p && p.catch) p.catch(fin);
      setTimeout(fin, f32.length / RATE * 1000 + 1500);
    });
  }
  function tts(text, rate = 1.1) {
    return new Promise(res => {
      if (!text || !('speechSynthesis' in window)) return res();
      const u = new SpeechSynthesisUtterance(text); u.lang = 'it-IT'; if (itVoice) u.voice = itVoice; u.rate = rate;
      const end = () => { A.emit('speechEnd'); res(); };
      u.onstart = () => A.emit('speechStart'); u.onend = end; u.onerror = end;
      speechSynthesis.speak(u); setTimeout(end, 800 + text.length * 110);
    });
  }
  const tokenText = t => (window.Pacenotes ? Pacenotes.tokenText(t) : t.replace(/_/g, ' '));

  // frase fatta di "comandi": usa le clip registrate, il resto lo legge la sintesi
  async function say(tokens) {
    if (S().muted) return;
    if (speaking && 'speechSynthesis' in window) speechSynthesis.cancel();
    speaking = true;
    try {
      if (decoding) await decoding;
      if (!(player && buffers.size)) { await tts(tokens.map(tokenText).join(' '), 1.15); return; }
      setSession(); A.emit('speechStart');
      tokens = expand(tokens);
      let pend = [], run = [];
      const flushTts = async () => { if (pend.length) { await tts(pend.join(' '), 1.15); pend = []; } };
      const flushRun = async () => { if (run.length) { await playOn(player, join(run)); run = []; } };
      for (const t of tokens) { const b = resolve(t); if (b) { await flushTts(); run.push(b); } else { await flushRun(); pend.push(tokenText(t)); } }
      await flushRun(); await flushTts();
    } finally { speaking = false; A.emit('speechEnd'); }
  }
  // frase libera (indicazioni): sintesi vocale
  async function speak(text) {
    if (S().muted) return;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    speaking = true; setSession();
    try { await tts(text, 1.05); } finally { speaking = false; }
  }
  // suoni brevi: note [frequenza, durata s, inizio s], onda 'sine' | 'square' | 'triangle'
  function tone(notes, type = 'sine', vol = 0.25) {
    if (S().muted || !fx) return;
    const len = Math.ceil(Math.max(...notes.map(n => n[2] + n[1])) * RATE) + 200, out = new Float32Array(len);
    for (const [f, d, t0] of notes) {
      const a = Math.floor(t0 * RATE), n = Math.floor(d * RATE);
      for (let i = 0; i < n; i++) {
        const ph = (i / RATE) * f, env = Math.min(1, i / 200) * Math.min(1, (n - i) / (n * 0.6));
        const w = type === 'square' ? (ph % 1 < 0.5 ? 1 : -1) * 0.6 : type === 'triangle' ? 1 - 4 * Math.abs((ph % 1) - 0.5) : Math.sin(2 * Math.PI * ph);
        out[a + i] += w * env * vol;
      }
    }
    setSession(); playOn(fx, out);
  }

  // ---------- gestione delle clip ----------
  const keyOf = name => name.split('/').pop().replace(/\.[^.]+$/, '').replace(/~/g, '').toLowerCase();
  async function load() { try { clips = await A.db.getAll('clips'); } catch { clips = new Map(); } A.emit('clipsChanged'); }
  // .zip = sostituisce tutto; file singoli = aggiungono o sostituiscono quei comandi
  async function importFiles(files) {
    const found = new Map(); let zip = false;
    for (const f of files) {
      if (/\.zip$/i.test(f.name)) {
        zip = true;
        const z = await JSZip.loadAsync(f);
        for (const e of Object.values(z.files).filter(e => !e.dir && /\.(mp3|m4a|aac|ogg|wav|mp4|caf)$/i.test(e.name) && !/__MACOSX/.test(e.name))) found.set(keyOf(e.name), await e.async('arraybuffer'));
      } else if (/\.(mp3|m4a|aac|ogg|wav|mp4|caf)$/i.test(f.name)) found.set(keyOf(f.name), await f.arrayBuffer());
    }
    if (!found.size) throw new Error('nessun file audio trovato');
    if (zip) { await A.db.replaceAll('clips', found); clips = found; buffers = new Map(); decoding = null; }
    else for (const [k, v] of found) await setClip(k, v, false);
    A.keepData(); A.emit('clipsChanged');
    return found.size;
  }
  async function setClip(token, buf, notify = true) {
    const vs = [token + '1', token + '2', token + '_1', token + '_2'];
    await A.db.del('clips', vs); await A.db.put('clips', token, buf);
    vs.forEach(v => { clips.delete(v); buffers.delete(v); });
    clips.set(token, buf);
    try { buffers.set(token, trim(await decodeData(buf))); } catch { buffers.delete(token); }
    if (notify) A.emit('clipsChanged');
  }

  A.voice = {
    unlock, say, speak, tone, load, importFiles, setClip, has, aliasOf, setSession,
    setAliases(a) { aliases = a || {}; },
    get speaking() { return speaking; }, get count() { return clips.size; }, get decoded() { return buffers.size; },
    stop() { try { speechSynthesis.cancel(); } catch { /* niente */ } }
  };
})();
