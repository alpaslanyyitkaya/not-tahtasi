// Açılış: kalıcı depolama izni, service worker kaydı, ilk ekran.
import { registerScreen, showScreen } from './router.js';
import { readDeviceInfo, renderDeviceInfo, shareTestPng } from './device-info.js';

// Geçici cihaz testi ekranı (Deneme noktası 1). Task 5'te liste ekranı bunun yerini alır.
registerScreen('device', {
  async mount(root) {
    const wrap = document.createElement('div');
    wrap.className = 'list-screen';
    wrap.innerHTML = `
      <div class="list-wrap">
        <div class="list-head"><h1>Not Tahtası — cihaz testi</h1></div>
        <div id="info"></div>
        <div><button class="primary" id="share">Test PNG'sini paylaş</button></div>
        <p class="footnote" id="msg"></p>
      </div>`;
    root.append(wrap);
    const info = await readDeviceInfo();
    wrap.querySelector('#info').append(renderDeviceInfo(info));
    wrap.querySelector('#share').onclick = async () => {
      const msg = wrap.querySelector('#msg');
      try {
        const r = await shareTestPng();
        msg.textContent = r === 'shared' ? 'Paylaşım menüsü açıldı.' : 'Bu tarayıcı dosya paylaşımını desteklemiyor.';
      } catch (e) {
        msg.textContent = e.name === 'AbortError' ? 'Paylaşım iptal edildi.' : 'Paylaşılamadı: ' + e.message;
      }
    };
  },
  unmount() {},
});

async function boot() {
  try { await navigator.storage?.persist?.(); } catch { /* desteklenmiyor */ }
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('sw.js'); } catch (e) { console.warn('SW kaydı başarısız', e); }
  }
  await showScreen('device');
}

boot();
