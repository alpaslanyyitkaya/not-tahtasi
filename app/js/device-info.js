// Cihaz bilgisi: kalıcı depolama, paylaşım desteği, çevrimdışı durum. Ayarlar menüsünden açılır.
export async function readDeviceInfo() {
  const info = {
    persisted: null,
    canShareFiles: false,
    standalone: matchMedia('(display-mode: standalone)').matches,
    online: navigator.onLine,
    swActive: !!navigator.serviceWorker?.controller,
    quota: null,
  };
  try { info.persisted = await navigator.storage?.persisted?.() ?? null; } catch { /* yok */ }
  try {
    const est = await navigator.storage?.estimate?.();
    if (est) info.quota = { usage: est.usage, quota: est.quota };
  } catch { /* yok */ }
  try {
    const f = new File([new Uint8Array([0])], 'test.png', { type: 'image/png' });
    info.canShareFiles = !!(navigator.canShare && navigator.canShare({ files: [f] }));
  } catch { /* yok */ }
  return info;
}

function mb(n) {
  return (n / 1024 / 1024).toFixed(n > 1024 * 1024 * 100 ? 0 : 1) + ' MB';
}

export function renderDeviceInfo(info) {
  const yes = (b) => (b ? 'evet' : 'hayır');
  const rows = [
    ['Kalıcı depolama', info.persisted === null ? 'bilinmiyor' : yes(info.persisted)],
    ['Dosya paylaşımı (Discord)', yes(info.canShareFiles)],
    ['Uygulama olarak açık', yes(info.standalone)],
    ['İnternetsiz çalışma hazır', yes(info.swActive)],
    ['İnternet', info.online ? 'bağlı' : 'yok'],
  ];
  if (info.quota) rows.push(['Kullanılan alan', `${mb(info.quota.usage)} / ${mb(info.quota.quota)}`]);
  const dl = document.createElement('dl');
  dl.className = 'device-info';
  for (const [k, v] of rows) {
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    dl.append(dt, dd);
  }
  return dl;
}

// Test PNG'si üretip paylaşım menüsünü açar (Deneme noktası 1).
export async function shareTestPng() {
  const c = document.createElement('canvas');
  c.width = c.height = 200;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 200, 200);
  g.strokeStyle = '#2b62c9'; g.lineWidth = 8; g.lineCap = 'round';
  g.beginPath(); g.moveTo(30, 150); g.quadraticCurveTo(100, 20, 170, 150); g.stroke();
  g.fillStyle = '#1b2430'; g.font = '600 20px system-ui, sans-serif'; g.fillText('Not Tahtası testi', 22, 185);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  const file = new File([blob], 'not-tahtasi-test.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Not Tahtası testi' });
    return 'shared';
  }
  return 'unsupported';
}
