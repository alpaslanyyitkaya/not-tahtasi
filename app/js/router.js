// İki ekran (liste, not) arasında geçiş. Her ekran {mount(root, arg), unmount()} sağlar.
const screens = new Map();
let current = null;

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
  await next.mount(root, arg);
}

export function currentScreen() {
  return root()?.dataset.screen ?? null;
}

function root() {
  return document.getElementById('app');
}
