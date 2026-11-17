// Kişisel ayarlar (yalnızca bu tarayıcıda): "Sadece kalem çizsin".
const KEY = 'not-tahtasi:penOnly';

export function getPenOnly() {
  try { return localStorage.getItem(KEY) !== '0'; } catch { return true; }
}

export function setPenOnly(v) {
  try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* depolama kapalı */ }
}

// Son seçilen kalem türü: 'pen' | 'ball' | 'pencil' | 'line' | 'arrow'.
const TYPE_KEY = 'not-tahtasi:penType';
export const PEN_TYPES = ['pen', 'ball', 'pencil', 'line', 'arrow'];
export function getPenType() {
  try { const v = localStorage.getItem(TYPE_KEY); return PEN_TYPES.includes(v) ? v : 'pen'; } catch { return 'pen'; }
}
export function setPenType(v) {
  try { localStorage.setItem(TYPE_KEY, v); } catch { /* depolama kapalı */ }
}
