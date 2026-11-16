// Not ekranı: sınırsız tahta, araç çubuğu, kalem çizimi, geri al.
import * as db from '../db.js';
import { newId } from '../ids.js';
import { showScreen } from '../router.js';
import { el, toast, promptDialog } from '../ui.js';
import { getPenOnly } from '../settings.js';
import { attachInput } from './input.js';
import { createHistory } from './history.js';
import { toWorld, zoomAt, findAttachTarget, strokesHitByEraser } from './geometry.js';
import { penSeg, hlSeg, penW, renderScene, applyView, clearCtx } from './render.js';

const COLORS = [
  ['#1b2430', 'Siyah'], ['#2b62c9', 'Mavi'], ['#d23c3c', 'Kırmızı'], ['#1d7f47', 'Yeşil'], ['#f2c200', 'Sarı'],
];
const SIZE_RANGE = { pen: [1, 12, 0.5], hl: [2, 12, 0.5], er: [6, 48, 1] };

let S = null;   // ekran durumu

export const boardScreen = {
  async mount(root, noteId) {
    const note = await db.getNote(noteId);
    if (!note) { toast('Not bulunamadı'); showScreen('list'); return; }
    const board = (await db.getBoard(noteId)) ?? { noteId, items: [] };
    S = {
      note, items: board.items, view: { s: 1, tx: 0, ty: 0 },
      tool: 'pen', color: COLORS[0][0], sizes: { pen: 3, hl: 4, er: 14 },
      selectedId: null, history: createHistory(100), bitmaps: new Map(),
      live: null, erasing: null, W: 0, H: 0, dpr: 1, raf: 0, cleanup: [],
    };
    buildDom(root);
    if (history.state?.screen !== 'board') history.pushState({ screen: 'board' }, '');
    S.input = attachInput(S.dom.stage, handlers, () => ({ tool: S.tool, penOnly: getPenOnly() }));
    resize();   // hemen ölç: ResizeObserver ilk kareyi beklemesin
    await boardHooks.afterLoad?.(S);
    if (!S) return;
    const ro = new ResizeObserver(() => resize());
    ro.observe(S.dom.stage);
    S.cleanup.push(() => ro.disconnect());
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.target.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (k === 'y') { e.preventDefault(); redo(); }
    };
    document.addEventListener('keydown', onKey);
    S.cleanup.push(() => document.removeEventListener('keydown', onKey));
    syncToolbar();
  },
  async unmount() {
    if (!S) return;
    const s = S;
    s.input?.finishActive();
    await boardHooks.beforeLeave?.(s);
    s.input?.detach();
    cancelAnimationFrame(s.raf);
    for (const f of s.cleanup) f();
    S = null;
  },
};

// Sonraki görevlerin (resim, kayıt, paylaş) bağlandığı noktalar.
export const boardHooks = {
  afterLoad: null,     // async (S) — not açıldıktan sonra
  initialView: null,   // (S) — ilk boyutlandırmada görünümü ayarlar
  afterCommit: null,   // (S) — her değişiklikten sonra
  beforeLeave: null,   // async (S) — ekrandan çıkmadan önce
  canLeave: null,      // async (S) → bool — geri düğmesi
  selectDown: null,    // (S, world, e) → bool
  selectMove: null,
  selectUp: null,
  toolbarExtras: [],   // (S) → HTMLElement
};

export function getState() { return S; }

let leaving = false;
async function leaveBoard() {
  if (!S || leaving) return;
  leaving = true;
  try {
    if ((await boardHooks.canLeave?.(S)) === false) {
      history.pushState({ screen: 'board' }, '');   // notta kal: geri adımını geri koy
      return;
    }
    await showScreen('list');
  } finally {
    leaving = false;
  }
}

window.addEventListener('popstate', () => { if (S) leaveBoard(); });

// ---------- DOM ----------
function buildDom(root) {
  const stage = el('div', { class: 'stage' });
  const main = el('canvas'), live = el('canvas'), pred = el('canvas');
  stage.append(main, live, pred);
  const zoom = el('div', { class: 'zoom-label' }, '100%');
  stage.append(zoom);

  const toolBtn = (id, label, title) => {
    const b = el('button', { 'aria-pressed': 'false', title }, label);
    b.addEventListener('click', () => setTool(id));
    return b;
  };
  const tools = { select: toolBtn('select', 'Seç', 'Seç: resimleri taşı ve boyutlandır'),
    pen: toolBtn('pen', 'Kalem', 'Kalem'), hl: toolBtn('hl', 'Fosforlu', 'Fosforlu kalem'),
    er: toolBtn('er', 'Silgi', 'Silgi: dokunduğun çizgiyi siler') };
  const swatches = COLORS.map(([c, name]) => {
    const b = el('button', { class: 'swatch', style: `--c:${c}`, 'aria-label': name, 'aria-pressed': 'false' });
    b.addEventListener('click', () => { S.color = c; if (S.tool !== 'pen' && S.tool !== 'hl') setTool('pen'); syncToolbar(); });
    b.dataset.c = c;
    return b;
  });
  const size = el('input', { type: 'range', class: 'size', 'aria-label': 'Kalınlık', id: 'tool-size' });
  size.addEventListener('input', () => { S.sizes[sizeKey()] = Number(size.value); });
  const undoBtn = el('button', { 'aria-label': 'Geri al', title: 'Geri al' }, '↶');
  const redoBtn = el('button', { 'aria-label': 'İleri al', title: 'İleri al' }, '↷');
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);
  const back = el('button', { class: 'ghost' }, '← Notlarım');
  // Geri düğmesi ve Android geri hareketi aynı yoldan geçer (history.back → popstate → leaveBoard).
  back.addEventListener('click', () => {
    if (history.state?.screen === 'board') history.back();
    else leaveBoard();
  });
  const title = el('button', { class: 'title-btn', title: 'Yeniden adlandır' }, el('span', {}, S.note.name));
  title.addEventListener('click', rename);
  const saveState = el('span', { class: 'save-state', 'aria-live': 'polite' });

  const toolbar = el('div', { class: 'toolbar', role: 'toolbar', 'aria-label': 'Araçlar' },
    el('div', { class: 'tgroup' }, back, title),
    el('div', { class: 'tsep' }),
    el('div', { class: 'tgroup' }, ...Object.values(tools)),
    el('div', { class: 'tsep' }),
    el('div', { class: 'tgroup' }, ...swatches, size),
    el('div', { class: 'tsep' }),
    el('div', { class: 'tgroup' }, undoBtn, redoBtn),
    el('div', { class: 'spacer' }),
    el('div', { class: 'tgroup' }, ...boardHooks.toolbarExtras.map((f) => f(S)), saveState));
  const errorBar = el('div', { class: 'save-error', hidden: '' });
  root.append(el('div', { class: 'board-screen' }, toolbar, errorBar, stage));

  S.dom = { stage, main, live, pred, zoom, tools, swatches, size, undoBtn, redoBtn, title, saveState, errorBar };
  S.ctx = {
    main: main.getContext('2d'),
    live: live.getContext('2d', { desynchronized: true }),
    pred: pred.getContext('2d', { desynchronized: true }),
  };
}

const sizeKey = () => (S.tool === 'select' ? 'pen' : S.tool);

function setTool(t) {
  S.tool = t;
  if (t !== 'select') S.selectedId = null;
  syncToolbar();
  redraw();
}

export function syncToolbar() {
  const d = S.dom;
  for (const [k, b] of Object.entries(d.tools)) b.setAttribute('aria-pressed', String(k === S.tool));
  for (const b of d.swatches) b.setAttribute('aria-pressed', String(b.dataset.c === S.color && (S.tool === 'pen' || S.tool === 'hl')));
  const [min, max, step] = SIZE_RANGE[sizeKey()];
  d.size.min = min; d.size.max = max; d.size.step = step; d.size.value = S.sizes[sizeKey()];
  d.size.disabled = S.tool === 'select';
  d.undoBtn.disabled = !S.history.canUndo();
  d.redoBtn.disabled = !S.history.canRedo();
  d.title.firstChild.textContent = S.note.name;
}

async function rename() {
  const name = await promptDialog({ title: 'Yeniden adlandır', value: S.note.name });
  if (!S || !name || name === S.note.name) return;
  S.note = { ...S.note, name };
  syncToolbar();
  boardHooks.afterCommit?.(S);
}

// ---------- görünüm ----------
function resize() {
  const r = S.dom.stage.getBoundingClientRect();
  S.W = r.width; S.H = r.height; S.dpr = window.devicePixelRatio || 1;
  for (const c of [S.dom.main, S.dom.live, S.dom.pred]) {
    c.width = Math.round(S.W * S.dpr); c.height = Math.round(S.H * S.dpr);
    c.style.width = S.W + 'px'; c.style.height = S.H + 'px';
  }
  if (!S.viewReady) { boardHooks.initialView?.(S); S.viewReady = true; }
  redrawNow();
}

export function redraw() {
  if (!S || S.raf) return;
  S.raf = requestAnimationFrame(() => { if (S) { S.raf = 0; redrawNow(); } });
}

function redrawNow() {
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#2b62c9';
  renderScene(S.ctx.main, { items: S.items, view: S.view, dpr: S.dpr, W: S.W, H: S.H, bitmaps: S.bitmaps, selectedId: S.selectedId, accent });
  S.dom.zoom.textContent = Math.round(S.view.s * 100) + '%';
}

export function setView(v) { S.view = v; redraw(); }

// ---------- değişiklikler ----------
export function commit(newItems) {
  S.history.push(S.items);
  S.items = newItems;
  redraw();
  syncToolbar();
  boardHooks.afterCommit?.(S);
}

function undo() {
  const prev = S.history.undo(S.items);
  if (!prev) return;
  S.items = prev;
  if (S.selectedId && !S.items.some((i) => i.id === S.selectedId)) S.selectedId = null;
  redraw(); syncToolbar(); boardHooks.afterCommit?.(S);
}

function redo() {
  const next = S.history.redo(S.items);
  if (!next) return;
  S.items = next;
  if (S.selectedId && !S.items.some((i) => i.id === S.selectedId)) S.selectedId = null;
  redraw(); syncToolbar(); boardHooks.afterCommit?.(S);
}

// ---------- girdi ----------
const local = (e) => {
  const r = S.dom.stage.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
};
const world = (e) => { const p = local(e); return toWorld(S.view, p.x, p.y); };
const pressureOf = (e) => (e.pointerType === 'pen' ? (e.pressure > 0 ? e.pressure : 0.5) : 0.5);

const handlers = {
  local,
  strokeStart(e) {
    const w = world(e);
    const st = { id: newId(), type: 'stroke', tool: S.tool, color: S.color, size: S.sizes[S.tool],
      pts: [{ x: w.x, y: w.y, p: pressureOf(e) }], attachedTo: null };
    S.live = st;
    S.dom.live.classList.toggle('hl', st.tool === 'hl');
    clearCtx(S.ctx.live); applyView(S.ctx.live, S.view, S.dpr);
    (st.tool === 'hl' ? hlSeg : penSeg)(S.ctx.live, st, 0);
  },
  strokeMove(e) {
    const st = S.live;
    if (!st) return;
    const evs = e.getCoalescedEvents?.() ?? [];
    const seg = st.tool === 'hl' ? hlSeg : penSeg;
    for (const ce of evs.length ? evs : [e]) {
      const w = world(ce);
      const last = st.pts[st.pts.length - 1];
      if (Math.abs(w.x - last.x) + Math.abs(w.y - last.y) < 0.3 / S.view.s) continue;
      st.pts.push({ x: w.x, y: w.y, p: pressureOf(ce) });
      seg(S.ctx.live, st, st.pts.length - 1);
    }
    const px = S.ctx.pred;
    clearCtx(px);
    if (st.tool === 'pen' && e.getPredictedEvents) {
      const pe = e.getPredictedEvents();
      if (pe.length) {
        applyView(px, S.view, S.dpr);
        const last = st.pts[st.pts.length - 1];
        px.strokeStyle = st.color; px.lineCap = 'round'; px.lineJoin = 'round'; px.lineWidth = penW(st, last.p);
        px.beginPath(); px.moveTo(last.x, last.y);
        for (const p of pe) { const w = world(p); px.lineTo(w.x, w.y); }
        px.stroke();
      }
    }
  },
  strokeEnd(ok) {
    const st = S.live;
    S.live = null;
    clearCtx(S.ctx.live); clearCtx(S.ctx.pred);
    if (!ok || !st) return;
    const images = S.items.filter((i) => i.type === 'image');
    commit([...S.items, { ...st, attachedTo: findAttachTarget(st, images) }]);
  },
  eraseStart() { S.erasing = { before: S.items, changed: false }; },
  eraseAt(e) {
    if (!S.erasing) return;
    const w = world(e);
    const strokes = S.items.filter((i) => i.type === 'stroke');
    const hit = strokesHitByEraser(strokes, w.x, w.y, S.sizes.er / S.view.s);
    if (!hit.size) return;
    S.items = S.items.filter((i) => !hit.has(i.id));
    S.erasing.changed = true;
    redraw();
  },
  eraseEnd() {
    const er = S.erasing;
    S.erasing = null;
    if (!er?.changed) return;
    const after = S.items;
    S.items = er.before;
    commit(after);
  },
  selectDown(e) { return boardHooks.selectDown ? boardHooks.selectDown(S, world(e), e) : false; },
  selectMove(e) { boardHooks.selectMove?.(S, world(e), e); },
  selectUp(ok) { boardHooks.selectUp?.(S, ok); },
  pan(dx, dy) { S.view = { ...S.view, tx: S.view.tx + dx, ty: S.view.ty + dy }; redraw(); },
  pinch(cx, cy, k) { S.view = zoomAt(S.view, cx, cy, k); redraw(); },
};
