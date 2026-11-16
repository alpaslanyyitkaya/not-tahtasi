// Liste menüsündeki "Tümünü dışa aktar" ve "Yedekten geri yükle".
import * as db from './db.js';
import { serializeAll, restoreFromFile, checkBackup, backupFileName } from './backup.js';
import { shareOrDownload } from './board/export.js';
import { addHeadMenuItem, refreshList } from './list/list-screen.js';
import { toast, confirmDialog } from './ui.js';

async function exportAll() {
  try {
    toast('Yedek hazırlanıyor…', 2000);
    const now = Date.now();
    const blob = await serializeAll(now);
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
// Filtre yok: Android dosya seçici .ntyedek uzantısını tanımayabilir; dosya içeriği doğrulanır.
input.hidden = true;
document.body.append(input);
input.addEventListener('change', async () => {
  const file = input.files[0];
  input.value = '';
  if (!file) return;
  toast('Yedek dosyası denetleniyor…', 2000);
  let checked;
  try { checked = await checkBackup(file); } catch { toast('Dosya okunamadı', 6000); return; }
  if (!checked.ok) { toast(checked.reason, 6000); return; }
  const count = checked.noteCount;
  const ok = await confirmDialog({
    title: 'Yedekten geri yükle',
    text: `${count} not yedekten yüklenecek. Aynı notlardan daha yeni olanlar korunur.`,
    ok: 'Geri yükle',
  });
  if (!ok) return;
  try {
    const r = await restoreFromFile(file);
    toast(`${r.added} eklendi, ${r.updated} güncellendi, ${r.skipped} atlandı`, 5000);
    await refreshList();
  } catch (e) {
    toast('Geri yüklenemedi: ' + e.message, 6000);
  }
});

addHeadMenuItem({ id: 'export', label: 'Tümünü dışa aktar (yedek)', onClick: exportAll });
addHeadMenuItem({ id: 'import', label: 'Yedekten geri yükle', onClick: () => input.click() });
