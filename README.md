# Not Tahtası

Huawei tablette (Chrome) kalemle resimlerin üstüne not almak için kişisel bir beyaz tahta.
İnternetsiz çalışır; notlar yalnızca tablette saklanır, hiçbir sunucuya gitmez.

## Geliştirme

```bash
npm install
npm test          # tüm testler
npm run serve     # http://localhost:8080
```

Yerelde service worker kapalıdır (değişiklikler hemen görünsün diye). Çevrimdışı davranışı denemek için
`http://localhost:8080/?sw=1` adresini aç.

Her yayında `app/sw.js` içindeki `VERSION` değerini artır (ör. `v3` → `v4`); yoksa tablet eski sürümü göstermeye devam eder.
Yeni bir dosya eklediğinde `ASSETS` listesine de ekle — `npm test` eksik dosyayı yakalar.

## Yayınlama (GitHub Pages)

1. GitHub'da yeni bir depo oluştur. Ücretsiz hesapta Pages için depo **herkese açık** olmalı:
   yalnızca uygulamanın kodu görünür, notların görünmez.
2. Bu klasörü o depoya gönder (`main` dalı).
3. Depoda **Settings → Pages → Source: GitHub Actions** seç.
4. Birkaç dakika sonra adres `https://<kullanıcı-adı>.github.io/<depo-adı>/` olur.

## Tablete kurulum

1. Tablette **Chrome** ile yayın adresini aç.
2. Menü (⋮) → **Ana ekrana ekle** / **Uygulamayı yükle**.
3. Bundan sonra simgeden aç; internet gerekmez.
4. Liste ekranındaki ⋮ → **Cihaz bilgisi**: "Kalıcı depolama: evet" ve "Dosya paylaşımı: evet" görmelisin.

## Yedek

Notlar yalnızca tablette durur. Liste ekranı ⋮ → **Tümünü dışa aktar** ile ara sıra yedek al ve dosyayı
bilgisayarına gönder (ör. Discord). 14 günden eski yedekte liste ekranında hatırlatma çıkar.
