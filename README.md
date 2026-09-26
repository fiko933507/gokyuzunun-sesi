# Gökyüzünün Sesi

Gündüz açık ve gece lacivert-mor atmosferde çalışan Türkçe gökyüzü uygulaması.

## İşlevler
- Gerçek hava verisi ve 5 günlük tahmin: Open-Meteo
- Konumu kullan / şehir ara: son bilinen konum, izin ve zaman aşımı yönetimi
- Güneş doğuş-batış zamanlarıyla otomatik tema
- Astronomy Engine ile gerçek geosentrik ekliptik konum: Güneş, Ay ve 7 gezegen; Ay fazı ve aydınlanma yüzdesi
- Burç seçimi ve hesaplanan gezegen konumlarına bağlanan, **sembolik** açıklama; kişisel olay tahmini değildir
- Her gün seçilen saatte yerel hatırlatma, açık/kapalı kontrolü
- Cihazda bulunan Türkçe konuşma motoruyla hava anlatımı, dinle/durdur

## Yükleme

```powershell
cd "C:\Users\fiko9\gokyuzunun-sesi"
git pull origin main
npm install
npx expo start --clear
```

Yeni yerel modüller için gerekirse uygulamanın Android geliştirme derlemesi yapılmalıdır. Bildirim izni verilmelidir.

## Sınırlar
- Referans görseldeki foto-gerçekçi 3D Ay, şehir silüeti ve çizilmiş takımyıldız varlıkları henüz bulunmuyor; yeni renkler, gezegen sırası ve burç çarkı ilk görsel uyarlamadır.
- Günlük yerel bildirim **önceden belirlenmiş hatırlatmadır**; her sabah arka planda yeni hava verisi çekip seslendirme yapmaz. Bu iş için sunucu tabanlı push gerekir.
- Ses hâlâ cihazın Türkçe TTS motorundan gelir; stüdyo kalitesinde insansı bulut TTS için sağlayıcı ve anahtar gerekir.
- Ekliptik burç bölümü, takımyıldızı astronomik sınırları ile aynı şey değildir. Astrolojik yorumlar bilimsel öngörü değildir.
