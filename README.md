# Gökyüzünün Sesi

Gündüz açık ve gece lacivert-mor atmosferde çalışan Türkçe gökyüzü uygulaması.

## İşlevler
- Gerçek hava verisi ve 5 günlük tahmin: Open-Meteo
- Saatlik sıcaklık, yağış olasılığı ve hava simgesi; yaklaşan yağış saati ve günlük gökyüzü özeti
- Bu gece gökyüzü gözlemi: saatlik bulutluluk, yağış ve görüş verileriyle üç uygun saat (tahmin puanı)
- Önümüzdeki 21 günün Ay takvimi ve konuma göre gezegen yönlerini gösteren kamera/pusula görünümü
- Günlüğe kamerayla çekilmiş fotoğraf ekleme; fotoğraf cihazın uygulama klasöründe tutulur
- Hava ve Ay bilgilerini görsel kart olarak telefonun paylaşım menüsüne gönderme
- Sesli yorum için kısa/tam anlatım ve normal/sakin tempo; seçilen dinleme saatinde günlük hatırlatma
- Ayarlardan favori şehir kaydı ve tek dokunuşla geçiş (en çok 12 şehir)
- Gökyüzü günlüğü: ruh hâli, not, konum ve Ay evresi yalnızca cihazda saklanır; kayıtlar silinebilir
- Kullanıcının seçtiği yağış ve soğuk eşiklerinde yaklaşan 36 saat için yerel uyarılar
- Konumu kullan / şehir ara: son bilinen konum, izin ve zaman aşımı yönetimi
- Güneş doğuş-batış zamanlarıyla otomatik tema
- Astronomy Engine ile gerçek geosentrik ekliptik konum: Güneş, Ay ve 7 gezegen; Ay fazı ve aydınlanma yüzdesi
- Burç seçimi ve hesaplanan gezegen konumlarına bağlanan, **sembolik** açıklama; kişisel olay tahmini değildir
- Her gün seçilen saatte yerel hatırlatma, açık/kapalı kontrolü
- Render üzerinden ElevenLabs ile hava durumu ve burç için iki ayrı ses profili; oynat/durdur
- Erkek olarak etiketlenmiş ses engellenir. Voice Design seslerinde etiket eksikse hesap sahibinin kadın sesini tanımlayan kayıtlı ses açıklamasıyla oynatma denenebilir; duyulan ses ayrıca kontrol edilmelidir.
- Gece ve gündüz, seçili konumun güneş saatlerine göre değişen ayrı illüstrasyonlu arka planlar

## Yükleme

```powershell
cd "C:\Users\fiko9\gokyuzunun-sesi"
git pull origin main
npm install
npm run typecheck
npx expo start --clear
```

Ekranda `Gökyüzü Takvimi` görünmüyorsa Metro'yu kapatıp yeniden `npx expo start --clear` çalıştırın ve QR kodunu tekrar açın. Konum izni ve telefonun GPS ayarı açık olmalıdır. Bildirim izni verilmelidir.

## Sınırlar
- Referans seçeneğinin gece ve gündüz gökyüzü illüstrasyonları uygulamaya eklendi. Ön plandaki kartlar cihaz boyutuna ve gerçek veriye göre yeniden düzenlenir; referans görselin sabit ekran görüntüsü değildir.
- Günlük yerel bildirim **önceden belirlenmiş hatırlatmadır**; her sabah arka planda yeni hava verisi çekip seslendirme yapmaz. Bu iş için sunucu tabanlı push gerekir.
- Akıllı hava uyarıları uygulama açıldığında/yenilendiğinde alınan saatlik tahmine göre bir sonraki 36 saat için planlanır; tahmin değiştiğinde uygulama yeniden açılana kadar otomatik güncellenmez. Bildirim telefonda çalabilir ama arka planda ElevenLabs sesi üretmez. Expo Go'nun bildirim modülü eksikse geliştirme derlemesi gerekir.
- İstanbul manzarası seçilen dekoratif tema olarak kalır; başka bir şehir seçildiğinde konum ve hava simgesi değişir, şehir fotoğrafı olduğu iddia edilmez.
- Bulut anlatım Render'da çalışan `backend/` uygulamasından gelir; API anahtarı yalnızca sunucunun ortam değişkenindedir.
- Free plan lisansı ticari olmayan kullanıma bağlı olabilir; mağazaya ticari sürüm yayımlamadan önce uygun ElevenLabs planı/lisansı doğrulanmalıdır.
- Deneme backend'i günlük en fazla 12 üretim isteğiyle ve süreç belleği önbelleğiyle sınırlandırılmıştır; servis yeniden başladığında limit sıfırlanır. Yaygın kullanımdan önce kullanıcı kimliği, kalıcı kota ve maliyet kontrolleri eklenmelidir.
- Ekliptik burç bölümü, takımyıldızı astronomik sınırları ile aynı şey değildir. Astrolojik yorumlar bilimsel öngörü değildir.
- Gökyüzüne Tut gerçek artırılmış gerçeklik kalibrasyonu yapmaz: pusulaya göre yaklaşık yön verir. Gece gözlem puanı ışık kirliliğini veya gerçek görüşü ölçmez.
