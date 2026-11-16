# SDD ledger — plan: /c/Users/alpas/AppData/Local/Claude-Data/claude_pzs8sxrjxfjjc/scratch-workspaces/d8653fc7-7874-47d3-b779-6bd32843c30a/20d88b0e-226d-469c-baee-da3b10327a89/scratch-2026-11-16-680786/docs/superpowers/plans/2026-11-17-not-tahtasi.md
Spec: docs/superpowers/specs/2026-11-17-not-tahtasi-design.md
Pre-flight:
- T5 consumes T1 registerScreen/showScreen — consistent.
- T9/T11 consume T3 getNote/getBoard/saveBoardAndNote/gcBlobs — consistent.
- T10 consumes T6 placeImages/hitImage/hitHandle/resizeFromHandle/transformAttached — consistent.
- T11/T12 consume T8 renderToCanvas — consistent.
- T13 consumes T12 shareOrDownload — consistent.
Ruling: Task 2 (GitHub Pages deploy + tablet checkpoint 1) deferred until the user is present — needs the user's GitHub account and a public push (outside-worktree side effect) — cost if wrong: checkpoint-1 device issues (share/persist) found later; workflow file is still written in Task 2 when done.
Task 1: Ruling: single #app root + js/router.js (registerScreen/showScreen) instead of two roots in index.html, and device-test code in js/device-info.js (reused by settings in Task 5) — avoids main.js import cycles — cost if wrong: none functional.
Task 1: verified in browser: SW activated, cache not-tahtasi-v1 holds 10 assets, manifest 3 icons.
Task 1: complete (commits c5ecea1..6277c60, tests: bash -c 'for f in app/js/*.js app/sw.js scripts/*.mjs; do node --check "$f" || exit 1; done; echo syntax-ok' → syntax-ok)
Task 3: Ruling: npm test script is `node --test "tests/*.test.mjs"` — Node 24 rejects a bare directory arg — cost if wrong: none.
Task 3: Ruling: added db.writeMany({notes,boards,blobs}) for Task 13's single-transaction restore; its test was written after the code (TDD deviation, passes) — cost if wrong: restore not atomic would be caught in Task 13.
Task 3: complete (commits 6277c60..6d71be7, tests: npm test → ℹ duration_ms 126.1195)
Task 4: complete (commits 6d71be7..c448d10, tests: npm test → ℹ duration_ms 133.7752)
Task 5: Ruling: rename uses an in-app dialog (ui.js promptDialog) instead of an inline row field — larger touch targets on the tablet, one code path for new/rename — cost if wrong: one extra tap.
Task 5: Ruling: SW is not registered on localhost (unless ?sw=1) and existing registrations are removed there — cache-first SW would hide code changes during development — cost if wrong: offline must be tested on the deployed site or with ?sw=1.
Task 5: Ruling: list-screen exposes addHeadMenuItem/addRowMenuItem/refreshList so Tasks 12/13 plug in share/backup without editing list rendering — cost if wrong: none.
Task 5: verified in browser: create x3, sort newest first, search ılık→ILIK and istanbul→İstanbul, empty-search message, backup banner, rename, delete confirm.
Task 5: complete (commits c448d10..f211537, tests: npm test → ℹ duration_ms 127.1266)
Task 6: Ruling: transformAttached takes a 4th arg imageId (plan signature omitted which image's strokes to move) — cost if wrong: none.
Task 6: Ruling: exportScale lives in geometry.js (export.js imports it) since its test is in geometry.test.mjs — cost if wrong: none.
Task 6: Ruling: eraser tests point-to-segment distance (not only points) so a fast stroke with sparse points is still erasable; added test — cost if wrong: none.
Task 6: Ruling: placeImages never upscales small images (k ≤ 1) — "fit to 60%" read as an upper bound — cost if wrong: tiny images stay small; user can resize.
Task 6: Ruling: resize minSize applies to the image's shorter side — cost if wrong: minor.
Task 6: complete (commits f211537..cceef84, tests: npm test → ℹ duration_ms 117.5903)
Task 7: complete (commits cceef84..bf076d9, tests: npm test → ℹ duration_ms 145.1961)
Task 8: Ruling: replaced the it._bbox hack in geometry.js with a WeakMap cache bboxOf(item) (items are immutable) — cost if wrong: none. Render is verified in the browser during Task 9 (plan says so).
Task 8: complete (commits bf076d9..2c90ca4, tests: npm test → ℹ duration_ms 122.6071)
Task 9: Ruling: board-screen exposes boardHooks (afterLoad, initialView, afterCommit, beforeLeave, selectDown/Move/Up, toolbarExtras) so Tasks 10–12 plug in without rewriting it — cost if wrong: none.
Task 9: Ruling: the board background stays light in dark theme (--board #e6e9ee) — ink colours are chosen for a light surface; a dark board hid black ink — cost if wrong: brighter board at night.
Task 9: Ruling: input handler shapes differ from the plan's listing (eraseStart/eraseEnd added, eraseAt/select* receive events, local(e) supplied) — needed to group one erase drag into one undo step — cost if wrong: none.
Task 9: verified in browser: pen strokes, highlighter, eraser removes stroke, undo restores it, no console errors.
Task 9: complete (commits 2c90ca4..353d6f2, tests: npm test → ℹ duration_ms 145.2988)
Task 10: Ruling: board wiring for images lives in board/image-tools.js (registers boardHooks) rather than inside board-screen.js — keeps board-screen focused — cost if wrong: none.
Task 10: Ruling: board-screen measures the stage synchronously on mount (plus ResizeObserver) and input wraps setPointerCapture in try/catch — found while testing: with no rendered frame yet the size was 0 and new images got w=h=0 — cost if wrong: none.
Task 10: verified in browser (synthetic pen events): 2 images placed side by side, broken .heic reported by name and skipped, note on image attaches, arrow between images does not, move by +150 moves image and its note, arrow stays, red delete button removes image + attached note, undo restores both.
Task 10: complete (commits 353d6f2..6eadfdb, tests: npm test → ℹ duration_ms 127.2456)
Task 11: Ruling: saving is wired in board/persistence.js via boardHooks; added boardHooks.canLeave so the back button asks before leaving when the last save failed (Review Focus 3) — cost if wrong: one extra dialog in a failure case only.
Task 11: Ruling: a note's opening view never zooms above 100% (small content is centred at 100%) — fitView alone would blow up a single small sketch — cost if wrong: none.
Task 11: Ruling: preview + blob GC only run when the board changed this visit and the last save succeeded — cost if wrong: an untouched note keeps an old preview (it's unchanged anyway).
Task 11: Ruling: fixed a deadlock in my own saver test (awaited the 2nd save before releasing it) before implementing — test intent unchanged.
Task 11: verified in browser: mid-stroke + visibilitychange→hidden saves image+stroke immediately; back → JPEG preview (3.3 KB) shown in list; orphan blobs GC'd (1 left); reload + reopen restores 2 items and the bitmap. Checkpoint 2 (tablet) waits on the deferred deploy (Task 2).
Task 11: complete (commits 6eadfdb..e99c65b, tests: npm test → ℹ duration_ms 159.5545)
Task 12: Ruling: the plan's RED test (exportScale) already existed and passed from Task 6, so the RED step used new fileNameFor tests instead — cost if wrong: none.
Task 12: Ruling: if navigator.share throws something other than AbortError, fall back to download instead of failing — cost if wrong: an unexpected download.
Task 12: verified in browser: PNG 625×493 for a 529×397 board (+48 margin), empty board → null + "Bu not boş". Real share sheet / Discord not testable here — checkpoint on the tablet.
Task 12: complete (commits e99c65b..352ede1, tests: npm test → ℹ duration_ms 135.4034)
Task 13: Ruling: backup API is serializeAll/restoreFromText (text in, text out) instead of exportAll()/importBackup(file) — keeps it testable in Node; the File/Blob handling sits in backup-tools.js — cost if wrong: none.
Task 13: Ruling: thumbnails are stored in the backup as {type, data:base64} like image blobs, not as data URLs — cost if wrong: none.
Task 13: Ruling: after restoring an updated note, blobs its restored board no longer references are GC'd — cost if wrong: none.
Task 13: verified in browser: serialize 2 notes (15 KB) → delete all → restore through menu file input + confirm → 2 notes, 1 image blob, 1 preview back, toast "2 eklendi, 0 güncellendi, 0 atlandı"; a PNG chosen as backup → "Bu dosya bir Not Tahtası yedeği değil", nothing changed.
Task 13: complete (commits 352ede1..9fd6850, tests: npm test → ℹ duration_ms 154.0498)
Task 14: Ruling: reload on controllerchange only after the user tapped "Yeniden başlat" — found in testing: clients.claim() on first install also fires controllerchange and reloaded the page unasked — cost if wrong: none.
Task 14: Ruling: router gained onScreenChange so the update banner hides on the note screen — cost if wrong: none.
Task 14: verified in browser: ?sw=1 → SW v3 activated, 30 files cached, no unwanted reload; preview server stopped → reload still opens list, note, and image bitmap from cache. Tablet checkpoint 3 waits on the deferred deploy. Step 5 (scroll-performance bitmap cache) not done: only needed if the tablet shows lag.
Task 14: complete (commits 9fd6850..f729c63, tests: npm test → ℹ duration_ms 163.2252)
Task 2: Ruling: workflow (.github/workflows/pages.yml, runs npm test before deploying app/) and README written; repo creation, push and tablet checkpoint 1 still wait on the user's GitHub account — cost if wrong: none until deploy.
Final: fixed pen stroke discarded on pointercancel — input.test "a pen stroke cancelled by the system…" RED→GREEN, suite 79/79
Final: fixed backup memory at scale (line-by-line .ntyedek, blob-by-blob write, two-pass streaming restore, item-shape + truncation checks) — backup.test readLines/checkBackup/round-trip RED→GREEN, suite 79/79
Final: fixed Android back gesture exiting the app (history entry + popstate → canLeave) — verified in browser (no Node test: DOM history), suite 79/79
Final: fixed full-resolution display bitmaps (≤1600 px on screen) — images.test displaySize RED→GREEN
Final: fixed SW install reading stale HTTP cache (cache:'reload') — assets.test RED→GREEN
Final: fixed storage-full image add reported as "couldn't open" (re-graded Minor→Important: Focus 3) — images.test importMany storageFull RED→GREEN; also skips commit if the note was left mid-import
Final: Ruling: stroke rendering cost at thousands of strokes (Path2D cache / gesture snapshot) not done — needs a tablet measurement first; spec §8.4 leaves it to the builder after checkpoint — cost if wrong: laggy panning on very dense notes until fixed.
Final: Ruling: shared PNGs now use the ≤1600 px display bitmaps — keeps one bitmap per image in memory — cost if wrong: photos in a shared PNG are slightly less sharp.
Final: Ruling: backup format changed to version 2 (line-delimited) and extension .ntyedek before any backup existed; file picker has no type filter — cost if wrong: none (no v1 files exist).
Final: minor (deferred): one-frame flicker at stroke end (live canvas cleared before main redraw)
Final: minor (deferred): no IndexedDB onversionchange handler; onblocked rejects early — fix before first schema change
Final: minor (deferred): eraser ignores an event if getCoalescedEvents() returns []
Final: minor (deferred): thumbnail stays stale if the OS kills the app after edits
Final: minor (deferred): toBlob null on huge canvas not guarded in PNG share
Final: minor (deferred): palm landing before the pen pans the board slightly (same as test page)
Final: Ruling (declined-to-judge items): rename from list not bumping updatedAt, two-tab editing, dev tooling — accepted as is; single user, single device.
