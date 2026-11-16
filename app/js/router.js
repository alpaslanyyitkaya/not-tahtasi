// İki ekran (liste, not) arasında geçiş. Her ekran {mount(root, arg), unmount()} sağlar.
const screens = new Map();
const listeners = [];
let current = null;
let currentName = null;

export function registerScreen(name, screen) {
  screens.set(name, screen);
}

export async function showScreen(name, arg) {
  const next = screens.get(name);
  if (!next) throw new Error(`Bilinmeyen ekran: ${name}`);
  if (current) await current.unmount?.();
  const root = document.getElementById('app');
  root.replaceChildren();
  root.dataset.screen = name;
  current = next;
  currentName = name;
  await next.mount(root, arg);
  for (const f of listeners) f(name);
}

export function currentScreen() {
  return currentName;
}

export function onScreenChange(cb) {
  listeners.push(cb);
}
