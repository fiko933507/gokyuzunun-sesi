# Gökyüzünün Sesi

Gündüz açık ve gece lacivert-mor atmosferde çalışan Türkçe gökyüzü uygulaması.

## İşlevler
- Gerçek hava verisi ve 5 günlük tahmin: Open-Meteo
- Saatlik sıcaklık, yağış olasılığı ve hava simgesi; yaklaşan yağış saati ve günlük gökyüzü özeti
- Bu gece gökyüzü gözlemi: saatlik bulutluluk, yağış ve görüş verileriyle üç uygun saat (tahmin puanı)
- Bana Uygun Saat: yürüyüş, gökyüzü fotoğrafı veya yıldız gözlemi için önümüzdeki 36 saatin tahmininden üç ayrı zaman önerisi; gerekçe ve yaklaşık uygunluk puanı, sistem paylaşımı ve seçilen saatten 30 dakika önce yerel hatırlatma. Tahmin ve puanlar kesin güvenlik garantisi değildir.
- Gök Olayları Takvimi: Ay evreleri ve listelenen meteor zirvesi geceleri için etkinlik başına yerel bildirim; en fazla 16 takip, isteğe bağlı paylaşım ve saatlik tahmin varsa yağış/bulut ön izlemesi. Uzak tarihler için henüz hava tahmini sunulmaz.
- Hava durumu: saatlik tahminlerden önümüzdeki 36 saatte yağış ihtimalinin %50 eşiğini aştığı zaman pencereleri, en yüksek olasılık ve tek dokunuşla tahmin yenileme. Zamanlar yağışın kesin başlangıcı veya bitişi değildir.
- Astroloji: önümüzdeki 14 gün için astronomik gezegen koordinatlarından hesaplanan tropikal burç geçişleri; sembolik yorumlar kişisel etkileri kanıtlamaz.
- Önümüzdeki 21 günün Ay takvimi ve konuma göre gezegen yönlerini gösteren kamera/pusula görünümü
- Günlüğe kamerayla çekilmiş fotoğraf ekleme; fotoğraf cihazın uygulama klasöründe tutulur
- Hava ve Ay bilgilerini görsel kart olarak telefonun paylaşım menüsüne gönderme
- Sesli yorum için kısa/tam anlatım ve normal/sakin tempo; seçilen dinleme saatinde günlük hatırlatma
- Kart Yorumları: Tarot Büyük Arkana günlük kartı, Katina tarzı özgün semboller ve 52 kartlık iskambil; üç kart açılımı, seçilen kartların temel anlamları ve sunucu üzerinden isteğe bağlı yapay zekâ yorumu
- Bu Gece Nereye Bakayım?: konum, saatlik hava ve pus tahmininden gözlem zamanı; Ay ile ufuk üzerindeki parlak gezegenlerin yönleri, mevcut kadın astroloji sesiyle kısa sesli rehber ve paylaşılabilir `.ics` takvim dosyası (takvim uygulamasına aktarma desteği cihaza bağlıdır)
- Gök Olayları Takvimi: hesaplanan Yeni Ay/Dolunay zamanları ve American Meteor Society'nin 2026–2027 beklenen meteor zirveleri (güncellenen takvim için uygulama verisi yenilenmelidir)
- Kart geçmişi: başarılı yorumlar cihazda saklanır, her kayıt silinebilir; soru ayrı bir alan olarak kaydedilmez
- Gece Havası: Open-Meteo / CAMS kaynaklı Avrupa hava kalitesi endeksi, PM2.5 ve aerosol optik derinliği varsa gösterilir
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

### Kart yorumları için yapay zekâ

Render'daki mevcut backend servisinin ortam değişkenlerine `OPENAI_API_KEY` eklenmelidir. İsteğe bağlı `CARD_READING_MODEL` değişkeniyle model seçilebilir; varsayılan `gpt-4.1-mini`dir. Anahtar mobil uygulamaya yazılmaz. Anahtar tanımlı değilse kart çekme ve kartların temel anlamları çalışır; "Yapay zekâ ile yorumla" düğmesi kurulumu açıklayan bir mesaj gösterir. Yorum üretimi sunucuda IP başına dakikada en fazla 5 istek ve süreç başına günde en fazla 30 istekle sınırlıdır. Bu basit sınırlar halka açık geniş ölçekli kullanım için kullanıcı kimliği veya kalıcı kota yerine geçmez.

## Sınırlar
- Referans seçeneğinin gece ve gündüz gökyüzü illüstrasyonları uygulamaya eklendi. Ön plandaki kartlar cihaz boyutuna ve gerçek veriye göre yeniden düzenlenir; referans görselin sabit ekran görüntüsü değildir.
- Günlük yerel bildirim **önceden belirlenmiş hatırlatmadır**; her sabah arka planda yeni hava verisi çekip seslendirme yapmaz. Bu iş için sunucu tabanlı push gerekir.
- Akıllı hava uyarıları uygulama açıldığında/yenilendiğinde alınan saatlik tahmine göre bir sonraki 36 saat için planlanır; tahmin değiştiğinde uygulama yeniden açılana kadar otomatik güncellenmez. Bildirim telefonda çalabilir ama arka planda ElevenLabs sesi üretmez. Expo Go'nun bildirim modülü eksikse geliştirme derlemesi gerekir.
- İstanbul manzarası seçilen dekoratif tema olarak kalır; başka bir şehir seçildiğinde konum ve hava simgesi değişir, şehir fotoğrafı olduğu iddia edilmez.
- Bulut anlatım Render'da çalışan `backend/` uygulamasından gelir; API anahtarı yalnızca sunucunun ortam değişkenindedir.
- Free plan lisansı ticari olmayan kullanıma bağlı olabilir; mağazaya ticari sürüm yayımlamadan önce uygun ElevenLabs planı/lisansı doğrulanmalıdır.
- Deneme backend'i günlük en fazla 12 üretim isteğiyle ve süreç belleği önbelleğiyle sınırlandırılmıştır; servis yeniden başladığında limit sıfırlanır. Yaygın kullanımdan önce kullanıcı kimliği, kalıcı kota ve maliyet kontrolleri eklenmelidir.
- Ekliptik burç bölümü, takımyıldızı astronomik sınırları ile aynı şey değildir. Astrolojik yorumlar bilimsel öngörü değildir.
- Kart yorumları eğlence ve düşünme amaçlıdır. İsteğe bağlı sorular yorum oluşturulması için sunucu üzerinden yapay zekâ sağlayıcısına gönderilir; uygulamanın günlüğüne eklenmez.
- Gözlem planı tahmini hava ve hesaplanan astronomik yönleri kullanır; ışık kirliliği ve yerel engeller ölçülmez. Meteor günleri beklenen zirvedir; geceler ve görünürlük coğrafyaya göre değişebilir. Meteor tarihleri: [American Meteor Society](https://www.amsmeteors.org/calendar/).
- Gökyüzüne Tut gerçek artırılmış gerçeklik kalibrasyonu yapmaz: pusulaya göre yaklaşık yön verir. Gece gözlem puanı ışık kirliliğini veya gerçek görüşü ölçmez.
