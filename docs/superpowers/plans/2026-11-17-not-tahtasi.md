# Not Tahtası Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Huawei tablette Chrome'da çalışan, internetsiz açılan, isimli notlardan oluşan ve her notun resim + kalem çizimi içeren sınırsız bir beyaz tahta olduğu kişisel bir PWA.

**Architecture:** Derleme adımı olmayan saf HTML/CSS/JS (ES modülleri) uygulaması, `app/` klasöründen statik olarak sunulur. Tarayıcıdan bağımsız saf mantık (geometri, geçmiş, liste sıralama/arama, yedek birleştirme, tarih biçimi) ayrı modüllerdedir ve Node'un yerleşik test koşucusuyla test edilir. Canvas çizimi ve kalem girdisi `kalem-deneme.html` test sayfasından taşınır ve tablette deneme noktalarında doğrulanır.

**Tech Stack:** Vanilla JS (ES2022 modülleri), Canvas 2D, Pointer Events, IndexedDB, Service Worker, Web App Manifest, Web Share API. Testler: `node --test` (Node 20+); yalnızca geliştirme bağımlılığı `fake-indexeddb`. Barındırma: GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-17-not-tahtasi-design.md`
**Kalem referansı:** `kalem-deneme.html` (proje kökü) — çizgi çizimi, desynchronized canvas, coalesced/predicted events, avuç koruması buradan taşınır.

## Global Constraints

- Arayüz dili **Türkçe**; tüm görünen metinler Türkçe.
- Hedef tarayıcı: **Android Chrome** (Huawei tablet). Huawei Browser desteklenmek zorunda değil.
- Notlar ve resimler **hiçbir sunucuya gönderilmez**; `fetch` yalnızca uygulamanın kendi statik dosyaları için.
- Çalışma zamanında **CDN veya dış bağımlılık yok**; her şey `app/` içinde, çevrimdışı çalışır.
- Varsayılan: **"Sadece kalem çizsin" açık** — parmak/avuç çizmez; kalem değerken tüm parmak dokunuşları yok sayılır.
- Yakınlaştırma aralığı **0.1 – 8** (×).
- Resimler en uzun kenar **2600 px**'e küçültülür; **JPEG kalite 0.85**, şeffaf PNG ise PNG kalır. Orijinal saklanmaz.
- Resme bağlama eşiği: çizgi noktalarının **≥ %80**'i tek resmin içindeyse `attachedTo` o resim.
- Katman sırası: **tüm resimler (eklenme sırasıyla), sonra tüm çizgiler**.
- Otomatik kayıt: son değişiklikten **1000 ms** sonra ve `visibilitychange` → `hidden` olduğunda.
- Liste önizlemesi: en uzun kenar **320 px**.
- Paylaşım PNG'si: beyaz arka plan, içerik çevresinde **48 px** (dünya birimi) boşluk, en uzun kenar en fazla **4000 px**.
- Yedek hatırlatması: son yedek **14 günden** eskiyse (veya hiç yoksa ve en az 1 not varsa).
- Geri al geçmişi: not başına, yalnızca bellekte, en fazla **100** adım.
- Kalıcı depolama: açılışta `navigator.storage.persist()`.

## Review Focus

1. **Türkçe büyük/küçük harf araması** — "ılık" araması "ILIK" adlı notu, "istanbul" araması "İstanbul"u bulmalı (`toLocaleLowerCase('tr')`). → Task 4 testi.
2. **Çizimden hemen sonra uygulamadan çıkma** — kalemi kaldırıp 1 sn dolmadan ana ekrana dönmek çizgiyi kaybettirmemeli (`visibilitychange` anında kayıt; çizim sırasında arka plana geçilirse yarım çizgi bitirilip kaydedilir). → Task 11 adımı.
3. **Depolama dolu / kayıt hatası** — `QuotaExceededError` ya da IndexedDB hatası sessizce yutulmamalı; not ekranında kalıcı "Kaydedilemedi — yedek al" uyarısı görünmeli ve sonraki değişiklikte yeniden denenmeli. → Task 11 testi.
4. **Bozuk veya yanlış yedek dosyası** — rastgele bir JSON/PNG seçilirse hiçbir not değişmemeli, anlaşılır hata gösterilmeli. → Task 13 testi.
5. **Açılamayan resim dosyası** (ör. HEIC, bozuk dosya) — tahta çökmemeli, diğer seçilen resimler eklenmeli, "Bu resim açılamadı: <ad>" gösterilmeli. → Task 10 testi.

---

## Dosya yapısı

```
package.json                 # "type":"module", scripts: test, serve; devDeps: fake-indexeddb
scripts/serve.mjs            # yerel statik sunucu (node:http), app/ klasörü, port 8080
scripts/make-icons.mjs       # node:zlib ile PNG simgeleri üretir
app/
  index.html                 # tek sayfa; iki ekran kökü: #list-screen, #board-screen
  manifest.webmanifest
  sw.js                      # önbellek-öncelikli service worker, sürüm sabiti
  icons/icon-192.png, icon-512.png, icon-maskable-512.png
  css/app.css                # tema token'ları (açık/koyu), iki ekranın stilleri
  js/
    main.js                  # açılış: persist(), SW kaydı, ekranlar arası geçiş
    ids.js                   # newId(): string
    time.js                  # saf: formatWhen(ts, now)
    db.js                    # IndexedDB erişimi
    list/list-model.js       # saf: sortNotes, filterNotes, needsBackupReminder
    list/list-screen.js      # liste arayüzü
    board/geometry.js        # saf: görünüm dönüşümleri, sınır kutuları, isabet, bağlama, taşıma
    board/history.js         # saf: geri al / ileri al
    board/render.js          # canvas çizimi (test sayfasından taşınan çizgi kodu)
    board/input.js           # pointer durum makinesi (kalem/parmak/fare)
    board/board-screen.js    # araç çubuğu, katmanlar, otomatik kayıt
    board/images.js          # dosya → küçültülmüş blob; yerleşim
    board/export.js          # tahta → PNG, paylaş/indir
    backup.js                # saf+IO: serileştir, doğrula, birleştir
tests/
  time.test.mjs, list-model.test.mjs, geometry.test.mjs, history.test.mjs,
  db.test.mjs, images.test.mjs, backup.test.mjs, save-status.test.mjs
```

## Ortak veri tipleri (tüm görevler bunları kullanır)

```js
// Note (db 'notes' deposu, keyPath 'id')
{ id: string, name: string, createdAt: number, updatedAt: number, thumb: Blob|null }
// Board (db 'boards' deposu, keyPath 'noteId')
{ noteId: string, items: Item[] }
// Item
{ id, type:'image', blobId: string, x, y, w, h }                       // dünya birimi
{ id, type:'stroke', tool:'pen'|'hl', color: string, size: number,
  pts: {x:number,y:number,p:number}[], attachedTo: string|null }
// Blob kaydı (db 'blobs' deposu, keyPath 'id', index 'noteId')
{ id: string, noteId: string, blob: Blob }
// Meta (db 'meta' deposu, keyPath 'key'): { key:'lastBackupAt', value:number }
// View
{ s: number, tx: number, ty: number }   // ekran = dünya * s + t
```

---

### Task 1: Proje iskeleti ve PWA kabuğu

**Files:**
- Create: `package.json`, `.gitignore` (`node_modules/`), `scripts/serve.mjs`, `scripts/make-icons.mjs`
- Create: `app/index.html`, `app/manifest.webmanifest`, `app/sw.js`, `app/css/app.css`, `app/js/main.js`, `app/icons/*.png`

**Interfaces:**
- Produces: `main.js` → `showScreen(name: 'list'|'board', arg?: string): void` (Task 5 ve 9 ekranları kaydeder: `registerScreen(name, {mount(root, arg), unmount()})`). `sw.js` içinde `const VERSION = 'v1'`; önbelleğe alınacak dosyalar tek bir `ASSETS` dizisinde.
- Produces: deneme noktası 1 için geçici **"Cihaz testi"** bölümü (liste ekranının yerinde, Task 5'te kaldırılır): `persist()` sonucu, `navigator.share`/`canShare({files})` desteği, "Test PNG'sini paylaş" düğmesi (200×200 canvas → PNG → `navigator.share`), çevrimdışı durumu (`navigator.onLine`).

- [ ] **Step 1:** `git init`; `package.json`: `{"type":"module","scripts":{"test":"node --test tests/","serve":"node scripts/serve.mjs"},"devDependencies":{"fake-indexeddb":"^6.0.0"}}`; `npm install`.
- [ ] **Step 2:** `scripts/serve.mjs` — `node:http` ile `app/` klasörünü 8080'de sunar; doğru `Content-Type` (`.js`→`text/javascript`, `.webmanifest`→`application/manifest+json`, `.png`, `.css`, `.html`); `/` → `index.html`.
- [ ] **Step 3:** `scripts/make-icons.mjs` — `node:zlib` ile RGBA PNG yazan küçük kodlayıcı; 192/512 simge: düz arka plan (#2b62c9) üzerinde beyaz kalem çizgisi şekli; maskable sürüm içerik %80 güvenli alanda. Çalıştır, `app/icons/` oluştur.
- [ ] **Step 4:** `manifest.webmanifest`: `name:"Not Tahtası"`, `short_name:"Not Tahtası"`, `lang:"tr"`, `start_url:"./"`, `scope:"./"`, `display:"standalone"`, `background_color`, `theme_color`, üç simge (maskable olan `purpose:"maskable"`). Yollar **göreli** (GitHub Pages alt dizini için).
- [ ] **Step 5:** `sw.js`: `install` → `ASSETS` önbelleğe; `activate` → eski sürüm önbelleklerini sil; `fetch` → önce önbellek, yoksa ağ. `skipWaiting` **çağrılmaz** (güncelleme Task 14'te kullanıcı onayıyla).
- [ ] **Step 6:** `index.html` + `app.css` + `main.js`: tema token'ları (açık/koyu `prefers-color-scheme`), `viewport` meta (`width=device-width, initial-scale=1, viewport-fit=cover`), açılışta `navigator.storage.persist()` ve SW kaydı, geçici "Cihaz testi" bölümü.
- [ ] **Step 7: Doğrula:** `npm run serve` → masaüstü Chrome'da `http://localhost:8080`; DevTools → Application: manifest hatasız, SW "activated", Offline işaretliyken yeniden yükleme sayfayı açar.
- [ ] **Step 8: Commit** — `git add -A && git commit -m "feat: PWA iskeleti ve cihaz testi sayfası"`

### Task 2: GitHub Pages'e yayın — Deneme noktası 1

**Files:**
- Create: `.github/workflows/pages.yml` (yalnızca `app/` klasörünü yayınlar), `README.md` (yayın ve tablete kurulum adımları, Türkçe)

- [ ] **Step 1:** Workflow: `actions/configure-pages`, `actions/upload-pages-artifact` (`path: app`), `actions/deploy-pages`; tetik: `main` dalına push.
- [ ] **Step 2: Kullanıcıyla:** Kullanıcı GitHub hesabını açar/girer. Depo oluşturma (`gh repo create` veya web), push, Settings → Pages → Source: GitHub Actions. Depo **gizli olabilir mi** kontrolü: ücretsiz hesapta Pages için depo herkese açık olmalı — kullanıcıya söylenir (yalnızca kod görünür, notlar görünmez).
- [ ] **Step 3: Doğrula:** Yayın adresi masaüstünde açılıyor, manifest ve SW hatasız.
- [ ] **Step 4: Tablette (kullanıcı):** Chrome'da adresi aç → menü → "Ana ekrana ekle/Yükle". Simgeden aç: tam ekran mı? Uçak modunda simgeden aç: açılıyor mu? "Cihaz testi"nde `persist()` = true mu, "Test PNG'sini paylaş" → Discord'a gidiyor mu? Sonuçlar not edilir; paylaşım çalışmıyorsa Task 12'de indirme yolu birincil olur.
- [ ] **Step 5: Commit** — `git commit -m "chore: GitHub Pages yayını"`

### Task 3: IndexedDB katmanı

**Files:**
- Create: `app/js/db.js`, `app/js/ids.js`
- Test: `tests/db.test.mjs` (`import 'fake-indexeddb/auto'`)

**Interfaces:**
- Produces (`db.js`, hepsi `Promise` döner):
  `openDb(name = 'not-tahtasi'): Promise<void>` (sürüm 1; depolar: notes, boards, blobs[index noteId], meta) ·
  `listNotes(): Note[]` · `getNote(id)` · `putNote(note)` ·
  `deleteNote(id)` (not + board + o notun tüm blob'ları, **tek işlemde**) ·
  `getBoard(noteId): Board|null` · `putBoard(board)` ·
  `putBlob({id, noteId, blob})` · `getBlob(id): Blob|null` ·
  `gcBlobs(noteId, keepIds: Set<string>): number` (silinen sayısı) ·
  `getMeta(key)` · `setMeta(key, value)` · `dumpAll(): {notes, boards, blobs, meta}` ·
  `saveBoardAndNote(board, note)` (ikisini **tek işlemde** yazar)
- Produces (`ids.js`): `newId(): string` (`crypto.randomUUID()`)

- [ ] **Step 1: Failing tests:**
  `deleteNote removes note, board and its blobs but not other notes' blobs`;
  `gcBlobs keeps only ids in keepIds for that note` (3 blob, keep 1 → returns 2);
  `listNotes returns all notes`; `meta roundtrip`;
  `saveBoardAndNote writes both`.
- [ ] **Step 2:** `npm test` → FAIL (modül yok).
- [ ] **Step 3:** `db.js`'i uygula; her fonksiyon tek `transaction`, hata `reject` ile yukarı iletilir (yutulmaz).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** — `feat: IndexedDB katmanı`

### Task 4: Liste modeli ve tarih biçimi (saf)

**Files:**
- Create: `app/js/list/list-model.js`, `app/js/time.js`
- Test: `tests/list-model.test.mjs`, `tests/time.test.mjs`

**Interfaces:**
- Produces: `sortNotes(notes): Note[]` (updatedAt azalan, yeni dizi) ·
  `filterNotes(notes, query: string): Note[]` (boşsa hepsi; `toLocaleLowerCase('tr')` ile içerir araması, baş/son boşluk kırpılır) ·
  `needsBackupReminder(lastBackupAt: number|null, noteCount: number, now: number): boolean` ·
  `defaultNoteName(now: number): string` → `"Adsız not 17 Kas"` ·
  `formatWhen(ts, now): string`.

- [ ] **Step 1: Failing tests:**
  ```js
  filterNotes([{name:'ILIK SU'}], 'ılık').length === 1
  filterNotes([{name:'İstanbul gezisi'}], 'istanbul').length === 1
  filterNotes(notes, '   ') -> tüm notlar
  sortNotes([{updatedAt:1},{updatedAt:3},{updatedAt:2}]).map(n=>n.updatedAt) -> [3,2,1]
  needsBackupReminder(null, 0, now) === false
  needsBackupReminder(null, 1, now) === true
  needsBackupReminder(now - 13*DAY, 5, now) === false
  needsBackupReminder(now - 15*DAY, 5, now) === true
  // now = 2026-11-17T15:00 yerel
  formatWhen(now - 5*60e3, now) === 'az önce'      // < 1 saat
  formatWhen(2026-11-17T09:30, now) === 'bugün, 09:30'
  formatWhen(2026-11-16T14:20, now) === 'dün, 14:20'
  formatWhen(2026-11-12T10:00, now) === '12 Kas'
  formatWhen(2025-03-02T10:00, now) === '2 Mar 2025'   // farklı yıl
  defaultNoteName(2026-11-17) === 'Adsız not 17 Kas'
  ```
  Ay kısaltmaları: `Oca Şub Mar Nis May Haz Tem Ağu Eyl Eki Kas Ara`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Uygula.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** — `feat: liste modeli ve tarih biçimi`

### Task 5: Liste ekranı

**Files:**
- Create: `app/js/list/list-screen.js`
- Modify: `app/index.html`, `app/css/app.css`, `app/js/main.js` (Cihaz testi bölümü kaldırılır; yerine bir **"Ayarlar ⋮"** menüsünde "Cihaz bilgisi" satırı kalır: persist ve paylaşım desteği)

**Interfaces:**
- Consumes: Task 3 `db`, Task 4 model fonksiyonları, Task 1 `registerScreen/showScreen`.
- Produces: `registerScreen('list', …)`; not açma `showScreen('board', noteId)`.

Davranış (spec §8.1):
- Başlık "Notlarım", sağda "+ Yeni" ve "⋮" (Yedek: Tümünü dışa aktar / Yedekten geri yükle — Task 13 bağlar; Ayarlar: Sadece kalem çizsin anahtarı — `localStorage` `penOnly`, varsayılan açık; Cihaz bilgisi).
- Arama kutusu: her tuşta `filterNotes`. Sonuç yoksa "‘<sorgu>’ adında not yok".
- Satır: 64×64 önizleme (`thumb` yoksa nötr kutu), ad (tek satır, taşarsa …), `formatWhen`.
- Satırda "⋮": Yeniden adlandır (satır içi giriş alanı, Enter/odak kaybı kaydeder, boş ad kabul edilmez), Paylaş (Task 12), Sil → uygulama içi onay ("‘<ad>’ silinsin mi? Bu geri alınamaz." Sil/Vazgeç) → `deleteNote`.
- "+ Yeni": uygulama içi ad kutusu (boşsa `defaultNoteName`) → `putNote` → `showScreen('board', id)`.
- Boş durum: "Henüz not yok — + Yeni ile başla".
- Yedek hatırlatması bandı: `needsBackupReminder` true ise "Son yedek: <formatWhen> — yedek al" (Task 13'te düğme bağlanır).

- [ ] **Step 1:** Uygula.
- [ ] **Step 2: Doğrula (masaüstü Chrome, dar pencere ~800px ve dokunmatik emülasyonu):** not oluştur, yeniden adlandır, ara ("ılık"/"ILIK"), sil onayı; sayfayı yenileyince notlar duruyor; sıralama en son düzenlenen üstte.
- [ ] **Step 3: Commit** — `feat: not listesi ekranı`

### Task 6: Tahta geometrisi (saf)

**Files:**
- Create: `app/js/board/geometry.js`
- Test: `tests/geometry.test.mjs`

**Interfaces:**
- Produces:
  `toWorld(view, sx, sy): {x,y}` · `toScreen(view, x, y): {x,y}` ·
  `zoomAt(view, cx, cy, k): View` (yeni nesne; s 0.1–8'e sıkıştırılır, `(cx,cy)` altındaki dünya noktası sabit kalır) ·
  `itemBBox(item): {x,y,w,h}` (çizgi: noktalar ± size·0.85; resim: x,y,w,h) ·
  `contentBBox(items): {x,y,w,h}|null` ·
  `intersects(a, b): boolean` ·
  `findAttachTarget(stroke, images): string|null` (≥0.8 oranı; birden çok resim ≥0.8 ise **en üstteki** = dizide en son) ·
  `hitImage(images, x, y): Image|null` (en üstteki) ·
  `hitHandle(image, x, y, tolWorld): 'nw'|'ne'|'sw'|'se'|null` ·
  `resizeFromHandle(image, handle, x, y, minSize=40): {x,y,w,h}` (en-boy oranı korunur, karşı köşe sabit) ·
  `transformAttached(strokes, oldRect, newRect): Stroke[]` (yalnızca `attachedTo` eşleşenler; nokta `x' = nx + (x-ox)*nw/ow`; `size` da `nw/ow` ile ölçeklenir) ·
  `strokesHitByEraser(strokes, x, y, rWorld): Set<string>` ·
  `fitView(bbox, W, H, pad=24): View` · `placeImages(sizes:{w,h}[], view, W, H): {x,y,w,h}[]` (her resim ekranın %60'ına sığacak ölçek, yan yana 24 boşlukla, grup ekran ortasında).

- [ ] **Step 1: Failing tests:**
  ```js
  // zoomAt sabit nokta
  v = zoomAt({s:1,tx:0,ty:0}, 100, 50, 2); toWorld(v,100,50) ≈ {x:100,y:50}; v.s === 2
  zoomAt({s:7,tx:0,ty:0}, 0,0, 2).s === 8; zoomAt({s:0.12,...},0,0,0.5).s === 0.1
  // bağlama
  img = {id:'a',type:'image',x:0,y:0,w:100,h:100}
  findAttachTarget(stroke(9 nokta içeride, 1 dışarıda), [img]) === 'a'   // 0.9
  findAttachTarget(stroke(7 içeride, 3 dışarıda), [img]) === null        // 0.7
  findAttachTarget(stroke(hepsi iki resmin kesişiminde), [a,b]) === 'b'
  // taşıma/ölçek
  transformAttached([{attachedTo:'a',size:2,pts:[{x:50,y:50,p:.5}]}], {x:0,y:0,w:100,h:100}, {x:200,y:0,w:200,h:200})
    -> pts[0] == {x:300,y:100,p:.5}, size == 4
  bağlı olmayan çizgi aynı nesne olarak döner (değişmez)
  // tutamaç
  resizeFromHandle({x:0,y:0,w:200,h:100}, 'se', 400, 0) -> {x:0,y:0,w:400,h:200}
  resizeFromHandle({x:0,y:0,w:200,h:100}, 'nw', 190, 95) -> w === 80 (minSize'a sıkışır, oran korunur, se köşesi sabit)
  hitImage([a(0..100), b(50..150)], 75, 75).id === 'b'
  contentBBox([]) === null
  ```
- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** Uygula. **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** — `feat: tahta geometrisi`

### Task 7: Geri al / ileri al (saf)

**Files:**
- Create: `app/js/board/history.js`
- Test: `tests/history.test.mjs`

**Interfaces:**
- Produces: `createHistory(limit = 100)` → `{ push(itemsBefore: Item[]), undo(current: Item[]): Item[]|null, redo(current: Item[]): Item[]|null, canUndo(): boolean, canRedo(): boolean }`. Anlık görüntü = öğe dizisinin sığ kopyası; öğeler **değişmez** (her değişiklik yeni nesne üretir — tüm görevler buna uyar).

- [ ] **Step 1: Failing tests:** push→undo eski diziyi döndürür; undo→redo geri getirir; push sonrası redo temizlenir; 101 push → 100 undo mümkün, 101. `null`; boşken `undo` → `null`.
- [ ] **Step 2–4:** FAIL → uygula → PASS.
- [ ] **Step 5: Commit** — `feat: geri al geçmişi`

### Task 8: Tahta çizimi (render)

**Files:**
- Create: `app/js/board/render.js`

**Interfaces:**
- Consumes: Task 6 `itemBBox`, `intersects`.
- Produces:
  `penSeg(ctx, stroke, i)`, `penTail(ctx, stroke)`, `hlSeg(ctx, stroke, i)`, `drawStroke(ctx, stroke)` — **`kalem-deneme.html`'den aynen taşınır** (`penW = size*(0.3+1.4p)`, orta nokta ikinci dereceden eğri, fosforlu = genişlik `size*5`, canlıda canvas opacity .35, sahnede `globalAlpha .35`).
  `applyView(ctx, view, dpr)` · `clearCtx(ctx)` ·
  `renderScene(ctx, {items, view, dpr, W, H, bitmaps: Map<blobId, ImageBitmap>, selectedId})` — görünür alanı (`toWorld` ile ekran dikdörtgeni) kesmeyen öğeleri atlar; önce resimler (bitmap yoksa açık gri yer tutucu), sonra çizgiler; seçili resme çerçeve + 4 köşe tutamacı (ekranda 14 px) + sağ üstte "Sil" düğmesi alanı.
  `renderToCanvas(items, bitmaps, {scale, bbox, background:'#ffffff'}): HTMLCanvasElement` (dışa aktarma ve önizleme için).

- [ ] **Step 1:** Uygula (test sayfasındaki çizgi kodunu modüle taşı; davranış değişmez).
- [ ] **Step 2:** Doğrulama Task 9'da tarayıcıda yapılır.
- [ ] **Step 3: Commit** — `feat: tahta çizim modülü`

### Task 9: Not ekranı — kalem girdisi ve araçlar

**Files:**
- Create: `app/js/board/input.js`, `app/js/board/board-screen.js`
- Modify: `app/index.html`, `app/css/app.css`, `app/js/main.js`

**Interfaces:**
- Consumes: Task 6, 7, 8; Task 3 `getNote/getBoard`.
- Produces: `registerScreen('board', …)`; `board-screen` içinde `commit(newItems)` (geçmişe push + `items` değiştir + yeniden çiz + `scheduleSave()` — Task 11 doldurur) ve `getState(): {noteId, items, view}`.
- `input.js`: `attachInput(stageEl, handlers, getOpts)`; `handlers = { strokeStart(e), strokeMove(e), strokeEnd(commit:boolean), eraseAt(world), pan(dx,dy), pinch(cx,cy,k), selectDown(world, e), selectMove(world), selectUp() }`; `getOpts() → {tool, penOnly}`.

Girdi kuralları (test sayfasıyla aynı, spec §8.3):
- Kalem değerken parmak dokunuşları yok sayılır; kalem inince mevcut parmak hareketleri iptal.
- `penOnly` açık: parmak 1 → kaydır, 2 → kaydır+yakınlaştır. Kapalı: 1 parmak çizer, 2. parmak gelince yarım çizgi iptal (`strokeEnd(false)`) ve hareket başlar.
- Seç aracında: kalem/parmak resme veya tutamaca → `select*`; boş alanda tek parmak/kalem → kaydır.
- Fare: sol tık çizer, orta/sağ tık kaydırır; tekerlek yakınlaştırır; Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z.
- Canlı çizim: `desynchronized` canlı canvas, `getCoalescedEvents`, `getPredictedEvents` tahmin katmanı; kalem bitince çizgi `findAttachTarget` ile bağlanıp `commit`.

Araç çubuğu (spec §8.1): "← Notlarım", not adı (dokununca yeniden adlandır), Seç / Kalem / Fosforlu / Silgi, 5 renk (#1b2430 siyah, #2b62c9 mavi, #d23c3c kırmızı, #1d7f47 yeşil, #f2c200 sarı), kalınlık kaydırıcısı (araç başına hatırlanır: kalem varsayılan 3, fosforlu 4, silgi yarıçapı 14 ekran px), ↶ ↷, "+Resim" (Task 10), "Paylaş" (Task 12). Tablette dikeyde iki satıra sarar.

- [ ] **Step 1:** `input.js` ve `board-screen.js`'i uygula; silgi `strokesHitByEraser` ile bir harekette ilk silmede tek `push`.
- [ ] **Step 2: Doğrula (masaüstü):** fareyle çiz, fosforlu, silgi, geri/ileri, tekerlekle yakınlaştırma; Chrome DevTools dokunmatik emülasyonunda iki parmak yakınlaştırma.
- [ ] **Step 3: Commit** — `feat: not ekranı kalem ve araçlar`

### Task 10: Resimler — ekleme, seçme, taşıma, boyutlandırma, silme

**Files:**
- Create: `app/js/board/images.js`
- Modify: `app/js/board/board-screen.js`
- Test: `tests/images.test.mjs`

**Interfaces:**
- Produces: `targetSize(w, h, max = 2600): {w,h}` (saf) · `chooseOutputType(mime, hasAlpha): 'image/jpeg'|'image/png'` (saf: yalnızca `image/png` + alpha → png) ·
  `importImageFile(file, noteId): Promise<{blobId, w, h, bitmap}>` (decode `createImageBitmap`, küçült, `putBlob`; açılamazsa `Error('decode')` fırlatır) ·
  `loadBitmaps(items): Promise<Map<blobId, ImageBitmap>>` ·
  `importMany(files: File[], importer: (file) => Promise<T>): Promise<{ok: T[], failed: string[]}>` (saf; sırayla çağırır, hata veren dosyanın adını `failed`'a ekler, devam eder).
- Consumes: Task 6 `placeImages`, `hitImage`, `hitHandle`, `resizeFromHandle`, `transformAttached`.

- [ ] **Step 1: Failing tests:** `targetSize(4000,3000)` → `{w:2600,h:1950}`; `targetSize(800,600)` → aynı; `chooseOutputType('image/png', true) === 'image/png'`; `chooseOutputType('image/png', false) === 'image/jpeg'`; `chooseOutputType('image/heic', false) === 'image/jpeg'`; **Review Focus 5:** `importMany(files, importer)` (saf yardımcı, `images.js`) — importer bir dosyada `Error('decode')` fırlatırsa diğerleri yine döner ve `failed: ['bozuk.heic']` listelenir.
- [ ] **Step 2:** FAIL. **Step 3:** Uygula:
  - "+Resim" → gizli `<input type=file accept="image/*" multiple>`; `importMany` → `placeImages` → tek `commit` (yeni resimler resim katmanının sonuna).
  - Başarısızlar için not ekranında 5 sn'lik bilgi: "Bu resim açılamadı: <ad>".
  - Seç aracı: resme dokun → `selectedId`; sürükle → resim + `transformAttached` (bırakınca tek `commit`); tutamaç → `resizeFromHandle` + `transformAttached`; "Sil" → resim **ve `attachedTo` ona eşit çizgiler** tek `commit`'te silinir; boş alana dokun → seçim kalkar.
- [ ] **Step 4:** `npm test` → PASS; masaüstünde 3 resim ekle, birinin üstüne yaz, taşı (yazı gider, aradaki ok kalır), boyutlandır, sil, geri al (resim + yazı birlikte döner).
- [ ] **Step 5: Commit** — `feat: tahtada resimler`

### Task 11: Kaydetme, yükleme, önizleme — Deneme noktası 2

**Files:**
- Create: `app/js/board/save-status.js`
- Modify: `app/js/board/board-screen.js`
- Test: `tests/save-status.test.mjs`

**Interfaces:**
- Produces: `createSaver({ save: () => Promise<void>, delay = 1000, setTimer, clearTimer })` → `{ schedule(), flush(): Promise<void>, state(): 'saved'|'pending'|'error' , onChange(cb) }` (saf, zamanlayıcı enjekte edilir). Hata olursa durum `'error'`, bir sonraki `schedule()` yeniden dener.
- Consumes: Task 3 `saveBoardAndNote`, `gcBlobs`; Task 8 `renderToCanvas`.

- [ ] **Step 1: Failing tests:** `schedule` iki kez 500 ms arayla → `save` 1500. ms'de **bir kez**; `flush()` bekleyen zamanlayıcıyı iptal edip hemen kaydeder; `save` reddederse `state()==='error'` ve `onChange('error')` çağrılır (**Review Focus 3**); hatadan sonra `schedule` + zaman → başarılı `save` → `'saved'`.
- [ ] **Step 2:** FAIL. **Step 3:** Uygula ve bağla:
  - `commit` → `saver.schedule()`. Kayıt: `items` + `updatedAt = Date.now()` → `saveBoardAndNote`.
  - `visibilitychange` → `hidden`: çizim sürüyorsa çizgiyi bitirip `commit` et, sonra `saver.flush()` (**Review Focus 2**).
  - Not ekranından çıkarken: `flush()`, sonra önizleme (`renderToCanvas`, en uzun kenar 320, `image/jpeg` .8) ile `putNote`, sonra `gcBlobs(noteId, kullanılan blobId'ler)`.
  - Durum göstergesi araç çubuğunda küçük: "Kaydedildi" / "Kaydediliyor…" / hata → kırmızı kalıcı bant "Kaydedilemedi — depolama dolu olabilir. Yedek alıp bazı notları silin."
  - Not açılışında: `getBoard` → `loadBitmaps` → `fitView(contentBBox)` (boş tahtada s=1, merkez 0,0).
- [ ] **Step 4:** `npm test` → PASS; masaüstünde çiz, 1 sn içinde sekmeyi gizle/yenile → çizgi duruyor.
- [ ] **Step 5: Commit + push** — `feat: otomatik kayıt ve önizleme`
- [ ] **Step 6: Tablette (kullanıcı):** yeni sürüm (SW `VERSION='v2'`; Task 14'e kadar güncellemek için uygulamayı kapatıp 2 kez aç) — kalem hissi test sayfasıyla aynı mı, avuç iz bırakıyor mu, resim ekleme (galeri + kamera), taşıma, uygulamayı kapatıp açınca her şey duruyor mu. Geri bildirim sonraki görevlerden önce uygulanır.

### Task 12: Paylaş (PNG → Discord)

**Files:**
- Create: `app/js/board/export.js`
- Modify: `board-screen.js`, `list-screen.js`

**Interfaces:**
- Produces: `exportScale(bbox, margin = 48, maxSide = 4000): number` (saf; `min(1, maxSide / (max(w,h) + 2*margin))`) · `boardToPngBlob(items, bitmaps): Promise<Blob|null>` (boş tahta → `null`) · `shareOrDownload(blob, fileName): Promise<'shared'|'downloaded'|'cancelled'>`. Dosya adı: not adı, dosya adında geçersiz karakterler `-` ile, + `.png`.
- Test: `tests/geometry.test.mjs`'e ekle: `exportScale({w:8000,h:2000}) ≈ 4000/8096`; `exportScale({w:500,h:500}) === 1`.

- [ ] **Step 1:** Failing test → FAIL → uygula → PASS.
- [ ] **Step 2:** `navigator.canShare({files:[file]})` true ise `navigator.share({files, title})`; kullanıcı iptal ederse (`AbortError`) `'cancelled'`, sessiz. Değilse `<a download>` ile indir ve "İndirildi — Discord'dan dosya olarak ekleyebilirsin" göster. Boş tahtada Paylaş → "Bu not boş".
- [ ] **Step 3:** Liste satırındaki Paylaş: board + bitmap'leri yükleyip aynı yol.
- [ ] **Step 4: Commit** — `feat: notu PNG olarak paylaş`

### Task 13: Yedek — dışa aktar ve geri yükle

**Files:**
- Create: `app/js/backup.js`
- Modify: `list-screen.js`
- Test: `tests/backup.test.mjs`

**Interfaces:**
- Biçim (benim kararım: zip yerine **tek JSON**, bağımlılık yok):
  `{ app:'not-tahtasi', version:1, exportedAt:number, notes:[{...note, thumb: dataURL|null}], boards:[Board], blobs:[{id, noteId, type, data: base64}] }`
- Produces: `parseBackupText(text: string): {ok:true, data}|{ok:false, reason:string}` (saf; JSON değilse `reason:'Bu dosya bir Not Tahtası yedeği değil'`, sonra `validateBackup`) ·
  `validateBackup(obj): {ok:true}|{ok:false, reason:string}` (saf; `app`, `version===1`, dizi alanları, her board'un notu var, her resim öğesinin blob'u var) ·
  `planMerge(local: Note[], incoming: Note[]): {write: string[], skip: string[]}` (saf; id yerelde yok → yaz; var ve gelen `updatedAt` daha büyük → yaz; değilse atla) ·
  `exportAll(): Promise<Blob>` (`application/json`) · `importBackup(file): Promise<{added:number, updated:number, skipped:number}>` (önce tamamen ayrıştır + doğrula; geçersizse **hiçbir şey yazmadan** `Error(reason)`; yazma tek IndexedDB işleminde).
- Dosya adı: `not-tahtasi-yedek-YYYY-MM-DD.json`.

- [ ] **Step 1: Failing tests:** `planMerge` üç durum; `validateBackup({})` → `ok:false`; `validateBackup(png baytları JSON değil)` — `parseBackupText('‰PNG…')` → `ok:false, reason:'Bu dosya bir Not Tahtası yedeği değil'` (**Review Focus 4**); eksik blob'lu resim → `ok:false`; geçerli küçük yedek → `ok:true`; serileştir → ayrıştır gidiş-dönüş eşit.
- [ ] **Step 2:** FAIL. **Step 3:** Uygula; liste menüsüne bağla: dışa aktarma `shareOrDownload` (Task 12) ile; başarıdan sonra `setMeta('lastBackupAt', now)` ve hatırlatma bandı kalkar. Geri yükleme öncesi uygulama içi onay: "<N> not yedekten yüklenecek. Aynı notlardan daha yeni olanlar korunur." → sonuç: "3 eklendi, 1 güncellendi, 2 atlandı".
- [ ] **Step 4:** `npm test` → PASS; masaüstünde dışa aktar → tüm notları sil → geri yükle → notlar ve resimler aynı.
- [ ] **Step 5: Commit** — `feat: yedek dışa aktar / geri yükle`

### Task 14: Güncelleme bildirimi ve son kontrol — Deneme noktası 3

**Files:**
- Modify: `app/sw.js`, `app/js/main.js`, `list-screen.js`

- [ ] **Step 1:** `main.js`: `registration.waiting` varsa (veya `updatefound` → installed) liste ekranında "Yeni sürüm hazır — Yeniden başlat" bandı; dokununca `waiting.postMessage('skipWaiting')`, `controllerchange` → `location.reload()`. `sw.js` bu mesajda `self.skipWaiting()`. Not ekranındayken bant gösterilmez (çizim yarıda kalmasın).
- [ ] **Step 2:** `ASSETS` listesini tüm dosyalarla karşılaştır (eksik dosya = çevrimdışı kırılır): `node -e` ile `app/` altındaki dosyaları listele, `ASSETS`'te olmayan varsa hata ver — bunu `tests/assets.test.mjs` olarak ekle.
- [ ] **Step 3:** `npm test` → hepsi PASS. `VERSION='v3'`, commit + push.
- [ ] **Step 4: Tablette (kullanıcı):** güncelleme bandı çıkıyor mu; 20+ resim ve çok çizgili bir tahtada kaydırma akıcı mı; Paylaş → Discord; yedek al → bir notu sil → geri yükle; uçak modunda tam kullanım.
- [ ] **Step 5:** Akıcılık sorunu varsa (spec §8.4 builder'a bıraktı): kaydırma/yakınlaştırma süresince sahnenin önbellek bitmap'ini dönüştürüp hareket bitince keskin yeniden çizim — ayrı commit.
