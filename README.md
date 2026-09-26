# Gökyüzünün Sesi

Gündüz açık ve gece lacivert-mor atmosferde çalışan Türkçe gökyüzü uygulaması.

## İşlevler
- Gerçek hava verisi ve 5 günlük tahmin: Open-Meteo
- Konumu kullan / şehir ara: son bilinen konum, izin ve zaman aşımı yönetimi
- Güneş doğuş-batış zamanlarıyla otomatik tema
- Astronomy Engine ile gerçek geosentrik ekliptik konum: Güneş, Ay ve 7 gezegen; Ay fazı ve aydınlanma yüzdesi
- Burç seçimi ve hesaplanan gezegen konumlarına bağlanan, **sembolik** açıklama; kişisel olay tahmini değildir
- Her gün seçilen saatte yerel hatırlatma, açık/kapalı kontrolü
- Render üzerinden ElevenLabs ile hava durumu ve burç için iki ayrı ses profili; oynat/durdur
- Erkek sese geçiş yapılmaz. Sunucu, ElevenLabs ses profilinin `gender=female` bilgisini doğrulamadan MP3 göndermez; eksik veya erkek profilde açıklayıcı hata gösterilir.
- Gece ve gündüz, seçili konumun güneş saatlerine göre değişen ayrı illüstrasyonlu arka planlar

## Yükleme

```powershell
cd "C:\Users\fiko9\gokyuzunun-sesi"
git pull origin main
npm install
npm run typecheck
npx expo start --clear
```

Ekranın üstünde `AY IŞIĞI · TASARIM 2.2` yazmıyorsa cihaz eski uygulama kodunu göstermektedir; Metro'yu kapatıp yeniden `npx expo start --clear` çalıştırın ve QR kodunu tekrar açın. Konum izni ve telefonun GPS ayarı açık olmalıdır. Yeni yerel modüller için gerekirse Android geliştirme derlemesi yapılmalıdır. Bildirim izni verilmelidir.

## Sınırlar
- Referans seçeneğinin gece ve gündüz gökyüzü illüstrasyonları uygulamaya eklendi. Ön plandaki kartlar cihaz boyutuna ve gerçek veriye göre yeniden düzenlenir; referans görselin sabit ekran görüntüsü değildir.
- Günlük yerel bildirim **önceden belirlenmiş hatırlatmadır**; her sabah arka planda yeni hava verisi çekip seslendirme yapmaz. Bu iş için sunucu tabanlı push gerekir.
- Bulut anlatım Render'da çalışan `backend/` uygulamasından gelir; API anahtarı yalnızca sunucunun ortam değişkenindedir. Sunucuya kadın sesi etiketli kayıtlı ses kimlikleri girilmelidir. Sunucu yeniden yayımlanana kadar önceki erkek ses devam edebilir; önbellek kontrolü güncel istemcide kaldırılmıştır.
- Free plan lisansı ticari olmayan kullanıma bağlı olabilir; mağazaya ticari sürüm yayımlamadan önce uygun ElevenLabs planı/lisansı doğrulanmalıdır.
- Deneme backend'i günlük en fazla 12 üretim isteğiyle ve süreç belleği önbelleğiyle sınırlandırılmıştır; servis yeniden başladığında limit sıfırlanır. Yaygın kullanımdan önce kullanıcı kimliği, kalıcı kota ve maliyet kontrolleri eklenmelidir.
- Ekliptik burç bölümü, takımyıldızı astronomik sınırları ile aynı şey değildir. Astrolojik yorumlar bilimsel öngörü değildir.
