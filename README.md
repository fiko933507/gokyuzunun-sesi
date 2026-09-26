# Gökyüzünün Sesi

Expo / React Native ile geliştirilmiş Türkçe sesli hava durumu ve gökyüzü uygulaması.

## Özellikler
- Open-Meteo üzerinden canlı hava durumu ve 5 günlük tahmin
- Konum izni veya şehir adıyla arama
- Konuma göre güneş doğuş/batış saatleri; otomatik gündüz/gece tema
- Gökyüzü kartları: UV endeksi, yağış, nem, rüzgâr
- Telefonun Türkçe konuşma motoruyla hava özeti (başlat/durdur)
- 12 burç için eğlence amaçlı genel notlar
- Güvenli alan uyumlu, alt menüsüz ekran düzeni

## Çalıştırma

```powershell
cd "C:\Users\fiko9\gokyuzunun-sesi"
git pull origin main
npm install
npx expo start --clear
```

Node.js 22 ve projenin Expo SDK sürümüyle uyumlu Expo Go kullanın. Bu depoda Expo 58 önizleme sürümü bulunuyor.

**Sınırlar:** Otomatik arka plan bildirimleri henüz yoktur; seçilen saat yalnızca saklanır. Seslendirme bulut tabanlı insan sesi değildir ve kalite cihazın Türkçe TTS paketine bağlıdır. Burç notları canlı gezegen hesaplaması değil, eğlence amaçlı sabit metinlerdir. İnternet bağlantısı gerekir.
