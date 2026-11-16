// Uygulama içi küçük arayüz parçaları: bildirim, onay/ad kutusu, açılır menü.
let toastTimer = null;

export function toast(msg, ms = 3500) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  e.append(...children);
  return e;
}
export { el };

function openDialog(build) {
  return new Promise((resolve) => {
    const back = el('div', { class: 'dialog-backdrop' });
    const box = el('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true' });
    back.append(box);
    const close = (v) => { back.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') close(null); };
    document.addEventListener('keydown', onKey);
    back.addEventListener('pointerdown', (e) => { if (e.target === back) close(null); });
    build(box, close);
    document.body.append(back);
    (box.querySelector('input') || box.querySelector('button.primary, button.danger'))?.focus();
  });
}

export function confirmDialog({ title, text = '', ok = 'Tamam', danger = false, cancel = 'Vazgeç' }) {
  return openDialog((box, close) => {
    box.append(
      el('h2', {}, title),
      ...(text ? [el('p', {}, text)] : []),
      el('div', { class: 'actions' },
        el('button', { onclick: () => close(false) }, cancel),
        el('button', { class: danger ? 'danger' : 'primary', onclick: () => close(true) }, ok)),
    );
  }).then((v) => v === true);
}

export function promptDialog({ title, value = '', placeholder = '', ok = 'Kaydet', allowEmpty = false }) {
  return openDialog((box, close) => {
    const input = el('input', { type: 'text', value, placeholder, maxlength: '120', enterkeyhint: 'done' });
    const submit = () => {
      const v = input.value.trim();
      if (!v && !allowEmpty) { input.focus(); return; }
      close(v);
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    box.append(
      el('h2', {}, title), input,
      el('div', { class: 'actions' },
        el('button', { onclick: () => close(null) }, 'Vazgeç'),
        el('button', { class: 'primary', onclick: submit }, ok)),
    );
    setTimeout(() => { input.select(); }, 0);
  });
}

export function infoDialog(title, node) {
  return openDialog((box, close) => {
    box.append(el('h2', {}, title), node, el('div', { class: 'actions' }, el('button', { class: 'primary', onclick: () => close(true) }, 'Kapat')));
  });
}

// items: [{label, onClick, danger?}] veya '-' (ayraç)
export function openMenu(anchor, items) {
  document.querySelector('.menu')?.remove();
  const menu = el('div', { class: 'menu', role: 'menu' });
  for (const it of items) {
    if (it === '-') { menu.append(el('hr')); continue; }
    menu.append(el('button', {
      role: 'menuitem', class: it.danger ? 'danger-text' : '',
      onclick: () => { close(); it.onClick(); },
    }, it.label));
  }
  document.body.append(menu);
  const r = anchor.getBoundingClientRect();
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  let left = Math.min(r.right - mw, innerWidth - mw - 8);
  left = Math.max(8, left);
  let top = r.bottom + 6;
  if (top + mh > innerHeight - 8) top = Math.max(8, r.top - mh - 6);
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
  const onDown = (e) => { if (!menu.contains(e.target)) close(); };
  function close() { menu.remove(); document.removeEventListener('pointerdown', onDown, true); }
  setTimeout(() => document.addEventListener('pointerdown', onDown, true), 0);
  menu.querySelector('button')?.focus();
}
