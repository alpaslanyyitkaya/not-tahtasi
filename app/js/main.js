// Açılış: veritabanı, kalıcı depolama izni, service worker kaydı, ilk ekran.
import { registerScreen, showScreen, currentScreen, onScreenChange } from './router.js';
import { openDb } from './db.js';
import { listScreen } from './list/list-screen.js';
import { boardScreen } from './board/board-screen.js';
import './board/image-tools.js';
import './board/persistence.js';
import './board/share-tools.js';
import './backup-tools.js';
import { toast } from './ui.js';

registerScreen('list', listScreen);
registerScreen('board', boardScreen);

async function boot() {
  try { await navigator.storage?.persist?.(); } catch { /* desteklenmiyor */ }
  // Yerel geliştirmede önbellek eski dosyaları göstermesin: SW yalnızca yayında ya da ?sw=1 ile.
  const devHost = ['localhost', '127.0.0.1'].includes(location.hostname) && !location.search.includes('sw=1');
  if (devHost) {
    for (const r of (await navigator.serviceWorker?.getRegistrations?.()) ?? []) await r.unregister();
  } else if ('serviceWorker' in navigator) {
    try { watchForUpdate(await navigator.serviceWorker.register('sw.js')); } catch (e) { console.warn('SW kaydı başarısız', e); }
  }
  try {
    await openDb();
  } catch (e) {
    document.getElementById('app').textContent = 'Notlar açılamadı: ' + e.message;
    return;
  }
  await showScreen('list');
}

// Yeni sürüm indiğinde liste ekranında "Yeniden başlat" bandı (not ekranında çizim yarıda kalmasın diye gösterilmez).
function watchForUpdate(reg) {
  let waiting = reg.waiting;
  const banner = document.createElement('div');
  banner.className = 'update-banner';
  banner.hidden = true;
  const btn = document.createElement('button');
  btn.className = 'primary';
  btn.textContent = 'Yeniden başlat';
  let restartRequested = false;
  btn.addEventListener('click', () => { restartRequested = true; waiting?.postMessage('skipWaiting'); });
  const text = document.createElement('span');
  text.textContent = 'Yeni sürüm hazır.';
  banner.append(text, btn);
  document.body.append(banner);
  const sync = () => { banner.hidden = !(waiting && currentScreen() === 'list'); };
  reg.addEventListener('updatefound', () => {
    const nw = reg.installing;
    nw?.addEventListener('statechange', () => {
      if (nw.state === 'installed' && navigator.serviceWorker.controller) { waiting = nw; sync(); }
    });
  });
  // İlk kurulumda clients.claim() de controllerchange tetikler; yalnızca kullanıcı istediyse yeniden yükle.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!restartRequested) return;
    restartRequested = false;
    location.reload();
  });
  onScreenChange(sync);
  sync();
  // Uygulama uzun süre açık kalırsa ara sıra güncelleme ara.
  setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
}

window.addEventListener('unhandledrejection', (e) => {
  console.error(e.reason);
  toast('Bir hata oluştu: ' + (e.reason?.message || e.reason), 6000);
});

boot();
