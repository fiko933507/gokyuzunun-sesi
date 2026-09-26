# Gökyüzünün Sesi

Konuma göre hava tahmini ve Türkçe sesli günlük özet sunan Android odaklı ilk prototip. Astroloji sekmesi isteğe bağlı bir yorum alanıdır; ilk sürümde kişiye özel gezegen konumu hesaplanmaz.

## Çalıştırma (Expo Go SDK 58)

SDK 58 şu anda önizleme sürümündedir. Proje, Expo Go SDK 58 ile uyumlu olması için doğrulanan `expo@58.0.0-preview.7` paketini kullanır. Node.js 22 önerilir.

```bash
npm install
npx expo start --clear
```

Daha önce SDK 57 bağımlılıklarını yüklediyseniz önce `node_modules` klasörünü silip `npm install` komutunu yeniden çalıştırın.

Expo Go ile QR kodunu açın. Konum ve bildirim izinlerini verin. Saatim ekranında tercih ettiğiniz saati kaydedebilirsiniz; Expo Go sürümünde otomatik bildirim gönderilmez. Hava verisi [Open-Meteo](https://open-meteo.com/) üzerinden alınır; veri bağlantısı gerekir. Saatler cihazın yerel saatine göre değerlendirilir. Hava tahmini açıldığında yenilenir ve ana ekrandaki **Sesli dinle** düğmesiyle okunur. Expo Go SDK 58 önizlemesinde bildirimler için gerekli yerel modül bulunmadığından otomatik uyarı özelliği geliştirme derlemesine ertelenmiştir.

Astroloji yorumları bilimsel hava tahmininden ayrı gösterilir. Şu an yorum alanı örnek içeriktir; gerçek gezegen geçişi iddiası içermez.
