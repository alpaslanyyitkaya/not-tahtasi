// Açılış: veritabanı, kalıcı depolama izni, service worker kaydı, ilk ekran.
import { registerScreen, showScreen } from './router.js';
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
    try { await navigator.serviceWorker.register('sw.js'); } catch (e) { console.warn('SW kaydı başarısız', e); }
  }
  try {
    await openDb();
  } catch (e) {
    document.getElementById('app').textContent = 'Notlar açılamadı: ' + e.message;
    return;
  }
  await showScreen('list');
}

window.addEventListener('unhandledrejection', (e) => {
  console.error(e.reason);
  toast('Bir hata oluştu: ' + (e.reason?.message || e.reason), 6000);
});

boot();
