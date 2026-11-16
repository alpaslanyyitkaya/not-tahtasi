// Liste menüsündeki "Tümünü dışa aktar" ve "Yedekten geri yükle".
import * as db from './db.js';
import { serializeAll, restoreFromText, parseBackupText, backupFileName } from './backup.js';
import { shareOrDownload } from './board/export.js';
import { addHeadMenuItem, refreshList } from './list/list-screen.js';
import { toast, confirmDialog } from './ui.js';

async function exportAll() {
  try {
    toast('Yedek hazırlanıyor…', 2000);
    const now = Date.now();
    const blob = new Blob([await serializeAll(now)], { type: 'application/json' });
    const r = await shareOrDownload(blob, backupFileName(now));
    if (r === 'cancelled') return;
    await db.setMeta('lastBackupAt', now);
    toast(r === 'downloaded' ? 'Yedek indirildi — dosyayı güvenli bir yere taşı' : 'Yedek paylaşıldı', 5000);
    await refreshList();
  } catch (e) {
    toast('Yedek alınamadı: ' + e.message, 6000);
  }
}

const input = document.createElement('input');
input.type = 'file';
input.accept = '.json,application/json';
input.hidden = true;
document.body.append(input);
input.addEventListener('change', async () => {
  const file = input.files[0];
  input.value = '';
  if (!file) return;
  let text;
  try { text = await file.text(); } catch { toast('Dosya okunamadı', 6000); return; }
  const parsed = parseBackupText(text);
  if (!parsed.ok) { toast(parsed.reason, 6000); return; }
  const count = parsed.data.notes.length;
  const ok = await confirmDialog({
    title: 'Yedekten geri yükle',
    text: `${count} not yedekten yüklenecek. Aynı notlardan daha yeni olanlar korunur.`,
    ok: 'Geri yükle',
  });
  if (!ok) return;
  try {
    const r = await restoreFromText(text);
    toast(`${r.added} eklendi, ${r.updated} güncellendi, ${r.skipped} atlandı`, 5000);
    await refreshList();
  } catch (e) {
    toast('Geri yüklenemedi: ' + e.message, 6000);
  }
});

addHeadMenuItem({ id: 'export', label: 'Tümünü dışa aktar (yedek)', onClick: exportAll });
addHeadMenuItem({ id: 'import', label: 'Yedekten geri yükle', onClick: () => input.click() });
