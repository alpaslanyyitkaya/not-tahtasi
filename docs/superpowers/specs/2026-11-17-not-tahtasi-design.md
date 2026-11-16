# Not Tahtası — Tasarım Belgesi

Tarih: 2026-11-17 · Durum: taslak, onay bekliyor

## 1. Amaç ve neden

Kullanıcı, Huawei tabletinde kalemle not alıyor; çoğu zaman bir resmin üstüne yazıp çiziyor. Notları şu an dağınık. İstediği: notları tek yerde, **isimle** toplamak ve **çizim olarak** saklamak.

Bir not = **sınırsız bir beyaz tahta**. Kullanıcı tahtaya birden fazla resim koyar, resimlerin üstüne ve aralarına kalemle yazar, resimleri **kalemle elle çizdiği oklarla/çizgilerle** birbirine bağlar.

Uygulamayı **yalnızca kullanıcı** kullanacak, **yalnızca tabletinde**. Paylaşım/çok kullanıcı yok.

## 2. Hedefler

- Açılışta **not listesi**: her satırda küçük resim (tahtanın önizlemesi), not adı, son düzenleme zamanı. En son düzenlenen en üstte. Ada göre **arama**.
- Not oluşturma (ad vererek), yeniden adlandırma, silme.
- Not ekranı: sınırsız tahta.
  - Kalemle çizim: basınca duyarlı kalem, fosforlu kalem, silgi, renk ve kalınlık seçimi, geri al / ileri al.
  - Resim ekleme (galeri veya kamera), resmi taşıma, boyutlandırma, silme.
  - Parmakla gezinme (tek parmak kaydır, iki parmak yakınlaştır). Varsayılan: **sadece kalem çizer**, avuç/parmak çizmez.
- **İnternetsiz çalışma**: ilk kurulumdan sonra uygulama ve notlar internet olmadan açılır.
- **Ana ekrana eklenebilir** uygulama (PWA), kendi simgesi ile tam ekran açılır.
- **Paylaş**: bir notu PNG olarak tabletin paylaşım menüsüne gönderme (kullanıcı ara sıra Discord ile bilgisayarına atacak).
- **Yedek**: tüm notları tek dosyaya dışa aktarma ve o dosyadan geri yükleme.
- Arayüz dili **Türkçe**.

## 3. Hedef olmayanlar (bu sürümde yok)

- Cihazlar arası eşitleme, bulut, hesap/giriş.
- Başka kişilerle paylaşım, birlikte düzenleme.
- Otomatik bağlantı okları (resme yapışan, onunla hareket eden ok). Bağlantılar elle çizilir.
- Klavyeyle metin kutusu, hazır şekiller (dikdörtgen, daire), el yazısı tanıma, klasör/etiket.
- Bilgisayar veya telefon için özel tasarım (çalışabilir ama hedef tablet).

## 4. Başarısızlık sayılacak durumlar (anti-hedefler)

- Kalem hissinin test sayfasındakinden kötü olması (gecikme, titreme, basıncın kaybolması).
- Avucun iz bırakması.
- **Not kaybı**: kaydedilmemiş çizimin uygulama kapanınca gitmesi, ya da tarayıcının depolamayı sessizce silmesi.
- Notların herhangi bir sunucuya gönderilmesi.
- Kalabalık, kullanıcının ihtiyacı olmayan düğmelerle dolu arayüz.

## 5. Kısıtlar

- **Cihaz**: Huawei tablet + kalem. **Hedef tarayıcı: Chrome** (tablette kurulu, kullanıcı onayladı). Huawei Browser desteklenmek zorunda değil. Kesin model bilinmiyor.
- **Tablette deneme**: Kullanıcı inşa sırasında ara sürümleri tablette deneyip geri bildirim verebilir (kullanıcı onayladı).
- **Kanıt**: Kalem test sayfası (`kalem-deneme.html`, claude.ai artifact) tablette "düzgün çalışıyor gibi" sonuç verdi. O sayfadaki teknikler korunacak: Pointer Events, `getCoalescedEvents`, `getPredictedEvents` ile uç tahmini, `desynchronized` canvas, kalem/parmak ayrımı, basınca göre kalınlık, ikinci dereceden eğrilerle yumuşatma.
- **Barındırma**: PWA'nın ilk kez indirilebilmesi için HTTPS bir adreste durması gerekir. Yalnızca statik kod orada durur; notlar asla gitmez.
- **Depolama**: Tarayıcı içi depolama (IndexedDB). Tarayıcının veriyi silmemesi için kalıcı depolama izni istenir; buna rağmen tek güvence yedek dosyasıdır.

## 6. Yaklaşımlar

| | Yaklaşım | Artı | Eksi |
|---|---|---|---|
| **1 (seçildi)** | Kendi tahta motorumuz, saf JS + Canvas, PWA | Hafif, kalem hissi tamamen bizim kontrolümüzde, test sayfası doğrudan temel olur, ihtiyaca dar biçilmiş arayüz | Seçme/taşıma/boyutlandırma ve sınırsız tahta çizimi elle yazılmalı |
| 2 | Hazır tahta kütüphanesi (Excalidraw/tldraw) | Birçok özellik hazır, ilk sürüm hızlı | Ağır, kalem hissi kütüphanede, gereksiz arayüz, özelleştirme zor |
| 3 | Yerel Android uygulaması (APK) | En düşük gecikme | Çok daha büyük iş, her güncellemede APK kurulumu; test tarayıcının yettiğini gösterdi |

Kullanıcı **1. yaklaşımı** seçti. Neden: ihtiyaçlar dar ve net, kalem hissi kanıtlandı, hazır kütüphane fazlası ile kontrol kaybı getirir.

## 7. Kullanıcının kararları

- Açılış ekranı: **isimli not listesi**, satırlarda **küçük resim**.
- Bir not: **birden fazla resim** içeren **beyaz tahta**.
- Bağlantılar: **kalemle elle çizilir**.
- Sadece tabletten bakılacak; ara sıra **Discord ile bilgisayara gönderme**.
- İnternetsiz çalışmalı.

## 8. Tasarım

### 8.1 Ekranlar

**Liste ekranı**
```
┌─────────────────────────────────────────┐
│  Notlarım            [Yedek ⋮] [+ Yeni] │
│  Ara...                                  │
├─────────────────────────────────────────┤
│ [önizleme]  Makine çizimi soruları       │
│             dün, 14:20                   │
├─────────────────────────────────────────┤
│ [önizleme]  Fizik – dalga konusu         │
│             12 Kas                       │
└─────────────────────────────────────────┘
```
- "+ Yeni": ad sorulur (boş bırakılırsa "Adsız not" + tarih), doğrudan not ekranı açılır.
- Satıra dokun: notu aç. Satırda "⋮" (veya uzun basma): Yeniden adlandır, Paylaş, Sil (uygulama içi onayla).
- "Yedek" menüsü: Tümünü dışa aktar, Yedekten geri yükle.
- Hiç not yokken: "Henüz not yok — + Yeni ile başla" boş durumu.

**Not ekranı**
```
┌──────────────────────────────────────────────────────────┐
│ ← Notlarım  Fizik – dalga │ Seç Kalem Fosforlu Silgi │ ● ● ● ● ━ │ ↶ ↷ │ +Resim  Paylaş │
├──────────────────────────────────────────────────────────┤
│                                                          │
│        sınırsız tahta (resimler + çizimler)              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```
- Başlığa dokununca yeniden adlandırma.
- Araçlar: **Seç**, **Kalem**, **Fosforlu**, **Silgi**. Renkler: 4–6 sabit renk. Kalınlık kaydırıcısı (her araç kendi kalınlığını hatırlar — benim kararım).
- "Sadece kalem çizsin" ayarı varsayılan açık; ayarlar menüsünde kapatılabilir (bu sürümde basit bir anahtar).

### 8.2 Tahta modeli

- Tahta, sınırsız bir **dünya koordinat** düzlemidir; görünüm = ölçek + kaydırma (test sayfasındaki `view {s, tx, ty}`). Yakınlaştırma aralığı ~%10–%800.
- Tahtadaki öğeler, çizim sırasına göre bir listede durur:
  - **Resim**: `{id, type:'image', blobId, x, y, w, h}`. Döndürme yok (benim kararım).
  - **Çizgi**: `{id, type:'stroke', tool:'pen'|'hl', color, size, pts:[{x,y,p}], attachedTo?: imageId}`.
- **Resimler her zaman çizimlerin altında** çizilir (benim kararım). Böylece sonradan eklenen bir resim, önceden çizilmiş okları örtmez. Katman sırası: önce tüm resimler (eklenme sırasıyla), sonra tüm çizgiler.
- **Resme bağlı çizgiler**: Bir çizgi bittiğinde, noktalarının çoğunluğu (%80+) tek bir resmin sınırları içindeyse o resme bağlanır (`attachedTo`). Resim taşınınca/boyutlandırılınca bağlı çizgiler aynı dönüşümle birlikte hareket eder/ölçeklenir. Resimler arası oklar bağlanmaz, yerinde kalır. (Kullanıcıya önerildi, itiraz etmedi.)

### 8.3 Girdi

Test sayfasının kuralları aynen:
- **Kalem**: seçili aracı kullanır. Kalem ekrana değdiği sürece tüm parmak dokunuşları yok sayılır (avuç koruması).
- **Parmak** ("sadece kalem çizsin" açıkken): tek parmak kaydırır, iki parmak yakınlaştırır/kaydırır.
- **Seç aracı**: kalemle veya parmakla bir resme dokun → seçilir (çerçeve + köşe tutamaçları + küçük "Sil" düğmesi). Sürükle → taşı; köşe tutamacı → en-boy oranı korunarak boyutlandır. Boş yere dokun → seçim kalkar. Seç aracında tek parmak boş alanda tahtayı kaydırır.
- **Resim silme** (benim kararım): resme bağlı çizgiler (`attachedTo`) resimle birlikte silinir; tek adımda geri alınır (resim + çizgileri birlikte döner). Resimler arası, bağlı olmayan çizgiler kalır.
- **"Sadece kalem çizsin" kapalıyken** (benim kararım): tek parmak çizer, iki parmak kaydırır/yakınlaştırır (test sayfasındaki davranış). İkinci parmak gelince yarım kalan tek parmak çizgisi iptal edilir.
- **Silgi**: dokunduğu çizgiyi tamamen siler (çizgi silgisi). Resimleri silmez; resim Seç aracıyla silinir.
- Fare ve klavye (Ctrl+Z / Ctrl+Y) bilgisayarda deneme için desteklenir, öncelik değildir.

### 8.4 Çizim performansı

- Katmanlar: (1) **sahne** canvas'ı — resimler + bitmiş çizgiler; (2) **canlı** canvas — çizilmekte olan çizgi (desynchronized); (3) **tahmin** canvas'ı.
- Kaydırma/yakınlaştırma sırasında sahne yeniden çizilir; yalnızca görünür alandaki öğeler çizilir (sınır kutusu kontrolü). Çizgiler için sınır kutusu saklanır.
- Hedef: 20+ resim ve birkaç bin çizgili bir tahtada kaydırma akıcı kalmalı. Gerekirse yakınlaştırma sırasında önbellekli bir bitmap ölçeklenip hareket bittikten sonra keskin yeniden çizim yapılır (builder'a kalmış).

### 8.5 Resimler

- Ekleme: "+Resim" → dosya seçici (`accept="image/*"`, birden fazla seçim). Android'de bu galeri ve kamera seçeneklerini sunar.
- Yapıştırma (klavye/pano) desteklenirse ekstra; zorunlu değil.
- Eklenen resim en uzun kenarı **2600 px**'e küçültülür, JPEG %85 olarak saklanır (PNG ise ve şeffaflık varsa PNG kalır). Orijinal saklanmaz (benim kararım; yer tasarrufu).
- Yeni resim ekranın ortasına, ekranın ~%60'ını kaplayacak boyutta yerleşir; birden çok resim seçilirse yan yana dizilir.

### 8.6 Kaydetme ve depolama

- **IndexedDB** veritabanı; mağazalar: `notes` (id, ad, oluşturma/düzenleme zamanı, önizleme blob'u), `boards` (noteId → öğe listesi), `blobs` (resim verileri).
- **Otomatik kayıt**: her değişiklikten ~1 sn sonra ve uygulama arka plana geçerken (`visibilitychange`) kaydedilir. "Kaydet" düğmesi yok.
- Açılışta `navigator.storage.persist()` istenir.
- **Önizleme**: not kapatılırken/kaydedilirken tüm tahtanın küçük bir PNG/JPEG görüntüsü (~320 px) üretilir.
- Geri al/ileri al geçmişi yalnızca bellekte, not başına; not kapanınca sıfırlanır.

### 8.7 Paylaş (Discord'a gönderme)

- Not ekranında ve listede "Paylaş": tahtadaki tüm içeriği kapsayan bir PNG üretilir (beyaz arka plan, kenarda boşluk, en uzun kenar en fazla ~4000 px).
- Web Share API (`navigator.share` + dosya) destekleniyorsa tabletin paylaşım menüsü açılır → Discord.
- Desteklenmiyorsa (Huawei Browser'da olabilir) PNG indirilir; kullanıcı Discord'dan galeri/dosyalar ile ekler.

### 8.8 Yedek

- "Tümünü dışa aktar": tüm notlar, tahtalar ve resimler tek bir `.zip` (veya tek `.json` içine base64 — builder seçer) dosyası olarak indirilir: `not-tahtasi-yedek-2026-11-17.zip`.
- "Yedekten geri yükle": dosya seçilir; mevcut notlarla **birleştirilir** (aynı id varsa yedekteki daha yeniyse üzerine yazılır). Uygulama içi onay.
- Son yedek tarihi liste ekranında küçük yazıyla gösterilir; 14 günden eskiyse hatırlatma görünür (benim kararım).

### 8.9 Çevrimdışı ve kurulum

- `manifest.webmanifest` (ad: "Not Tahtası", simge, `display: standalone`, yatay/dikey serbest) + **service worker** (tüm statik dosyaları önbelleğe alır, önce önbellek).
- Güncelleme: yeni sürüm arka planda iner; bir sonraki açılışta etkin olur. Liste ekranında "Yeni sürüm hazır — yeniden başlat" küçük bildirimi.
- Barındırma: **GitHub Pages** (ücretsiz, HTTPS). Alternatif Cloudflare Pages. Kullanıcının bir hesap açması gerekebilir.

### 8.10 Teknoloji

- Derleme aracı yok veya minimal: saf HTML/CSS/JS (ES modülleri). Dış bağımlılık yalnızca gerekirse (örn. zip için küçük bir kütüphane, yerel kopya olarak paketlenir — CDN'e bağlı kalmaz, çevrimdışı çalışmalı).
- Saf mantık (dönüşümler, çizgi-resim bağlama, yedek birleştirme, seçim isabet testi) tarayıcıdan bağımsız modüllerde, birim testleriyle.

### 8.11 Tablette deneme noktaları

İnşa, kullanıcının tablette denediği ara duraklarla ilerler:
1. **İskelet**: boş liste ekranı yayında. Chrome'da ana ekrana ekleme, uçak modunda açılma, `persist()` sonucu, dosyalı Web Share (test PNG'si Discord'a) denenir. Tahta motoruna geçmeden önce bunlar doğrulanır.
2. **Tahta**: kalem, resim ekleme/taşıma, kaydetme. Kalem hissi test sayfasıyla karşılaştırılır.
3. **Tamamı**: paylaş, yedek/geri yükleme, çok resimli büyük bir tahtada akıcılık.

## 9. Builder'a bırakılanlar

- Dosya/modül yapısı, test aracı.
- Yumuşatma ve kalınlık formülünün ince ayarı (test sayfası başlangıç noktası).
- Kaydırma sırasındaki önbellekleme stratejisi.
- Yedek dosya biçimi (zip vs json).
- Simge ve renk paleti (sade, kalem notuna uygun; açık ve koyu tema).

## 10. Açık noktalar

- Web Share ve kalıcı depolama desteği tablette (Chrome) 1. deneme noktasında doğrulanacak.
- Barındırma: GitHub hesabı var mı / kim açacak — kullanıcıdan bekleniyor. Hesabı kullanıcı açar; depo oluşturma ve yayına alma adım adım birlikte yapılır.
