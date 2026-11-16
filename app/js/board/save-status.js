// Otomatik kayıt: son değişiklikten `delay` ms sonra kaydeder; flush() hemen kaydeder.
// Hata sessizce yutulmaz: durum 'error' olur, bir sonraki değişiklik yeniden dener.
export function createSaver({ save, delay = 1000, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let timer = null;
  let dirty = false;
  let running = null;
  let st = 'saved';
  const listeners = [];
  const set = (v) => { if (v !== st) { st = v; for (const f of listeners) f(v); } };

  async function flush() {
    if (timer) { clearTimer(timer); timer = null; }
    while (running) await running;
    if (!dirty) return;
    dirty = false;
    running = (async () => {
      try {
        await save();
        if (!dirty) set('saved');
      } catch (e) {
        dirty = true;
        console.error('Kayıt hatası', e);
        set('error');
      }
    })();
    try { await running; } finally { running = null; }
  }

  return {
    schedule() {
      dirty = true;
      if (st !== 'error') set('pending');
      if (timer) clearTimer(timer);
      timer = setTimer(() => { timer = null; flush(); }, delay);
    },
    flush,
    state: () => st,
    onChange(cb) { listeners.push(cb); },
  };
}
