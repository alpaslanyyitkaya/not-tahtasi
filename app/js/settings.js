// Kişisel ayarlar (yalnızca bu tarayıcıda): "Sadece kalem çizsin".
const KEY = 'not-tahtasi:penOnly';

export function getPenOnly() {
  try { return localStorage.getItem(KEY) !== '0'; } catch { return true; }
}

export function setPenOnly(v) {
  try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* depolama kapalı */ }
}
