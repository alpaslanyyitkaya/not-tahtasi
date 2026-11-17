// Pointer durum makinesi: kalem, parmak, fare. Kalem ekrandayken parmak dokunuşları yok sayılır (avuç).
// handlers: strokeStart(e) strokeMove(e) strokeEnd(commit)
//           eraseStart() eraseAt(e) eraseEnd()
//           selectDown(e) → bool (resme/tutamaca isabet ettiyse true) selectMove(e) selectUp(commit)
//           pan(dx, dy) pinch(cx, cy, k) local(e) → {x, y}
// getOpts() → { tool: 'select'|'pen'|'hl'|'er', penOnly: boolean }
export function attachInput(stage, h, getOpts) {
  let penDown = false;
  const capture = (e) => { try { stage.setPointerCapture(e.pointerId); } catch { /* geçersiz işaretçi */ } };
  let mode = null;          // { kind: 'draw'|'erase'|'select'|'pan', id, by: pointerType, last? }
  const touches = new Map();
  let gesture = null;       // { c, d, n }

  function endMode(commit) {
    if (!mode) return;
    if (mode.kind === 'draw') h.strokeEnd(commit);
    else if (mode.kind === 'erase') h.eraseEnd();
    else if (mode.kind === 'select') h.selectUp(commit);
    mode = null;
  }

  function beginPrimary(e) {
    const { tool } = getOpts();
    if (tool === 'pen' || tool === 'hl') {
      mode = { kind: 'draw', id: e.pointerId, by: e.pointerType };
      h.strokeStart(e);
    } else if (tool === 'er') {
      mode = { kind: 'erase', id: e.pointerId, by: e.pointerType };
      h.eraseStart();
      h.eraseAt(e);
    } else if (h.selectDown(e)) {
      mode = { kind: 'select', id: e.pointerId, by: e.pointerType };
    } else {
      mode = { kind: 'pan', id: e.pointerId, by: e.pointerType, last: h.local(e) };
    }
  }

  function gestureState() {
    const pts = [...touches.values()];
    const c = { x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length };
    const d = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
    return { c, d, n: pts.length };
  }

  function onDown(e) {
    if (e.target !== stage && !stage.contains(e.target)) return;
    if (e.pointerType === 'pen') {
      penDown = true;
      touches.clear(); gesture = null;
      if (mode && mode.id !== e.pointerId) endMode(mode.kind === 'select' ? false : mode.kind !== 'draw');
      capture(e);
      beginPrimary(e);
      return;
    }
    if (e.pointerType === 'touch') {
      if (penDown) return;                      // avuç koruması
      touches.set(e.pointerId, h.local(e));
      capture(e);
      const { penOnly, tool } = getOpts();
      if (touches.size === 1 && (tool === 'select' || !penOnly)) { beginPrimary(e); return; }
      if (mode && mode.by === 'touch') endMode(false);  // ikinci parmak: yarım çizgi iptal
      gesture = gestureState();
      return;
    }
    // fare
    capture(e);
    if (e.button === 0) beginPrimary(e);
    else mode = { kind: 'pan', id: e.pointerId, by: 'mouse', last: h.local(e) };
  }

  function onMove(e) {
    if (mode && e.pointerId === mode.id) {
      if (mode.kind === 'draw') h.strokeMove(e);
      else if (mode.kind === 'erase') {
        for (const ce of e.getCoalescedEvents?.() ?? [e]) h.eraseAt(ce);
      } else if (mode.kind === 'select') h.selectMove(e);
      else if (mode.kind === 'pan') {
        const p = h.local(e);
        h.pan(p.x - mode.last.x, p.y - mode.last.y);
        mode.last = p;
      }
      return;
    }
    if (gesture && touches.has(e.pointerId)) {
      touches.set(e.pointerId, h.local(e));
      const g = gestureState();
      if (g.n !== gesture.n) { gesture = g; return; }
      h.pan(g.c.x - gesture.c.x, g.c.y - gesture.c.y);
      if (g.n > 1 && gesture.d > 0) h.pinch(g.c.x, g.c.y, g.d / gesture.d);
      gesture = g;
    }
  }

  function onUp(e, cancel) {
    if (e.pointerType === 'pen') penDown = false;
    // Sistem iptali (ana ekran hareketi, bildirim perdesi; bazı Huawei kalemleri kaldırırken de
    // iptal gönderiyor): kalem çizgisi ve resim taşıma/boyut/döndürme korunur.
    // Yalnızca parmak çizgisi iptalde atılır (ör. ikinci parmak gelince).
    if (mode && e.pointerId === mode.id) {
      endMode(!cancel || mode.kind === 'select' || (mode.kind === 'draw' && mode.by !== 'touch'));
    }
    if (touches.delete(e.pointerId)) gesture = touches.size ? gestureState() : null;
  }

  const up = (e) => onUp(e, false);
  const cancel = (e) => onUp(e, true);
  const wheel = (e) => {
    e.preventDefault();
    const p = h.local(e);
    h.pinch(p.x, p.y, Math.exp(-e.deltaY * 0.0015));
  };
  const ctx = (e) => e.preventDefault();

  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', cancel);
  stage.addEventListener('wheel', wheel, { passive: false });
  stage.addEventListener('contextmenu', ctx);

  return {
    // Uygulama arka plana geçerken yarım çizgiyi bitirmek için.
    finishActive() { if (mode?.kind === 'draw') endMode(true); else endMode(false); },
    detach() {
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerup', up);
      stage.removeEventListener('pointercancel', cancel);
      stage.removeEventListener('wheel', wheel);
      stage.removeEventListener('contextmenu', ctx);
    },
  };
}
