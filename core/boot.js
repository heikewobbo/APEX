/* APEX — avvio */
(function () {
  'use strict';
  const A = window.APEX;
  A.setStyle(A.settings.style);
  A.uiInit();
  A.voice.load();
  A.startGeo();
  A.keepData();
  A.migrate().then(() => { A.voice.load(); A.emit('dataReady'); });
  A.mapReady(() => A.loadCameras());
  const offline = () => { if (!navigator.onLine) A.toast('Sei senza connessione: puoi usare le prove salvate', 5000); };
  window.addEventListener('offline', offline); offline();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  window.__apex = A; // diagnostica
})();
