import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Weather = {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    weather_code: number[];
    wind_speed_10m_max: number[];
  };
  current: { temperature_2m: number; weather_code: number };
};
const SETTINGS_KEY = 'gokyuzu.settings.v1';
const IDS_KEY = 'gokyuzu.notificationIds.v1';
const color = '#233F65';
const sky = '#EAF5FF';

function description(code: number) {
  if (code >= 95) return 'gök gürültülü yağış';
  if (code >= 71 && code <= 86) return 'kar yağışı';
  if (code >= 51 && code <= 67 || code >= 80 && code <= 82) return 'yağmur';
  if (code >= 45 && code <= 48) return 'sis';
  if (code >= 1 && code <= 3) return 'parçalı bulutlu';
  return 'açık';
}
function briefing(w: Weather, index: number) {
  const d = w.daily;
  const rain = d.precipitation_probability_max[index] ?? 0;
  const wind = d.wind_speed_10m_max[index] ?? 0;
  const max = Math.round(d.temperature_2m_max[index]);
  const min = Math.round(d.temperature_2m_min[index]);
  const advice = rain >= 50 ? 'Yağmur ihtimali yüksek; şemsiyeni yanına al.' :
    wind >= 45 ? 'Rüzgâr kuvvetli olabilir; dışarıda dikkatli ol.' :
    min <= 5 ? 'Sabah soğuk olacak; kalın giyin.' :
    max >= 32 ? 'Hava sıcak olacak; su içmeyi unutma.' :
    'Bugün için özel bir hazırlık uyarısı yok.';
  return `${index === 0 ? 'Bugün' : 'Bu gün'} hava ${description(d.weather_code[index])}. En düşük ${min}, en yüksek ${max} derece. Yağış olasılığı yüzde ${rain}. ${advice}`;
}
function dayLabel(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function App() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [place, setPlace] = useState('');
  const [hour, setHour] = useState('08');
  const [minute, setMinute] = useState('00');
  const [astro, setAstro] = useState(false);
  const [tab, setTab] = useState<'weather' | 'sky' | 'settings'>('weather');
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then(raw => {
      if (raw) {
        const saved = JSON.parse(raw);
        setHour(saved.hour ?? '08');
        setMinute(saved.minute ?? '00');
        setAstro(Boolean(saved.astro));
      }
    }).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const body = response.notification.request.content.body;
      if (body) Speech.speak(body, { language: 'tr-TR', rate: 0.92 });
    });
    return () => sub.remove();
  }, []);

  const refresh = useCallback(async (): Promise<Weather | null> => {
    setLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Konum izni gerekli', 'Bulunduğun yerin tahmini için konum izni ver.');
        return null;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;
      setPlace(`${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`);
      const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: 'temperature_2m,weather_code',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max',
        timezone: 'auto',
        forecast_days: '4',
      });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!response.ok) throw new Error('Hava verisi alınamadı.');
      const result = await response.json() as Weather;
      if (!result.daily?.time?.length) throw new Error('Tahmin bulunamadı.');
      setWeather(result);
      setLastUpdated(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
      return result;
    } catch (error) {
      Alert.alert('Bağlantı sorunu', error instanceof Error ? error.message : 'Tahmin alınamadı.');
      return null;
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function schedule() {
    const h = Number(hour), m = Number(minute);
    if (!/^\d{1,2}$/.test(hour) || !/^\d{1,2}$/.test(minute) || h > 23 || m > 59) {
      Alert.alert('Geçersiz saat', 'Saati 00:00 ile 23:59 arasında gir.');
      return;
    }
    const w = await refresh();
    if (!w) return;
    try {
      const permission = await Notifications.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Bildirim izni gerekli', 'Sesli özeti açmak için bildirim izni ver.');
        return;
      }
      const previous = JSON.parse(await AsyncStorage.getItem(IDS_KEY) || '[]') as string[];
      for (const id of previous) await Notifications.cancelScheduledNotificationAsync(id);
      const ids: string[] = [];
      for (let index = 0; index < Math.min(3, w.daily.time.length); index++) {
        const date = new Date(w.daily.time[index] + 'T00:00:00');
        date.setHours(h, m, 0, 0);
        if (date <= new Date()) continue;
        const id = await Notifications.scheduleNotificationAsync({
          content: { title: 'Gökyüzünün Sesi', body: briefing(w, index), data: { day: w.daily.time[index] } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
        });
        ids.push(id);
      }
      await AsyncStorage.multiSet([[IDS_KEY, JSON.stringify(ids)], [SETTINGS_KEY, JSON.stringify({ hour, minute, astro })]]);
      Alert.alert('Uyarılar hazır', ids.length ? `Önümüzdeki ${ids.length} gün için ${hour.padStart(2, '0')}:${minute.padStart(2, '0')} uyarısı ayarlandı. Bildirime dokununca sesli okunur.` : 'Bugünkü saat geçti. Yarın için uygulamayı tekrar açıp uyarıları yenile.');
    } catch {
      Alert.alert('Uyarı kurulamadı', 'Bildirim ayarlarını kontrol edip tekrar dene.');
    }
  }

  function speak() {
    if (!weather) return;
    Speech.stop();
    Speech.speak(briefing(weather, 0), { language: 'tr-TR', rate: 0.92 });
  }
  return <View style={styles.root}>
    <StatusBar style="dark" />
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>GÜNÜN SESLİ REHBERİ</Text>
      <Text style={styles.title}>Gökyüzünün{String.fromCharCode(10)}Sesi</Text>
      <Text style={styles.subtitle}>Günün havasını, göğün hikâyesini dinle.</Text>
      <View style={styles.tabs}>
        {([['weather', 'Hava'], ['sky', 'Gökyüzü'], ['settings', 'Saatim']] as const).map(([key, label]) =>
          <Pressable key={key} onPress={() => setTab(key)} style={[styles.tab, tab === key && styles.activeTab]}><Text style={[styles.tabText, tab === key && styles.activeText]}>{label}</Text></Press>)}
      </View>
      {tab === 'weather' && <>
        <View style={styles.hero}>
          <Text style={styles.small}>KONUMUN · {place || 'Alınıyor...'}</Text>
          {loading && !weather ? <ActivityIndicator color={color} /> : weather ? <>
            <Text style={styles.temperature}>{Math.round(weather.current.temperature_2m)}°</Text>
            <Text style={styles.condition}>{description(weather.current.weather_code)}</Text>
            <Text style={styles.small}>Bugün {Math.round(weather.daily.temperature_2m_min[0])}° / {Math.round(weather.daily.temperature_2m_max[0])}° · Yağış %{weather.daily.precipitation_probability_max[0]}</Text>
            <Text style={styles.updated}>Son güncelleme {lastUpdated}</Text>
          </> : <Text style={styles.body}>Tahmini görmek için konum izni verip yeniden dene.</Text>}
        </View>
        {weather && <View style={styles.card}><Text style={styles.cardTitle}>Bugün ne yapmalı?</Text><Text style={styles.body}>{briefing(weather, 0)}</Text><Pressable style={styles.button} onPress={speak}><Text style={styles.buttonText}>Sesli dinle</Text></Press></View>}
        <Pressable style={styles.outline} onPress={() => void refresh()}><Text style={styles.outlineText}>Tahmini yenile</Text></Pressable>
        {weather?.daily.time.slice(1, 4).map((day, i) => <View style={styles.forecast} key={day}><Text style={styles.forecastDay}>{dayLabel(day)}</Text><Text style={styles.body}>{Math.round(weather.daily.temperature_2m_min[i + 1])}° / {Math.round(weather.daily.temperature_2m_max[i + 1])}° · Yağış %{weather.daily.precipitation_probability_max[i + 1]}</Text></View>)}
      </>}
      {tab === 'sky' && <View style={styles.card}><Text style={styles.cardTitle}>Göğün hikâyesi</Text><Text style={styles.body}>Bu bölümde astronomik olaylar ve isteğe bağlı astroloji yorumları yer alacak. İlk prototipte doğrulanmamış gezegen konumu veya kişisel yorum gösterilmiyor.</Text><View style={styles.row}><Text style={styles.rowLabel}>Astroloji yorumlarını aç</Text><Switch value={astro} onValueChange={setAstro} /></View>{astro && <Text style={styles.note}>Tercihin kaydedilmesi için Saatim bölümündeki “Uyarıları yenile” düğmesine bas. Yorum içeriği henüz hazır değil.</Text>}</View>}
      {tab === 'settings' && <View style={styles.card}><Text style={styles.cardTitle}>Uyarı saatim</Text><Text style={styles.body}>Günlük hava özetinin geleceği saati seç.</Text><View style={styles.timeRow}><TextInput style={styles.input} value={hour} onChangeText={setHour} keyboardType="number-pad" maxLength={2} accessibilityLabel="Saat" /><Text style={styles.colon}>:</Text><TextInput style={styles.input} value={minute} onChangeText={setMinute} keyboardType="number-pad" maxLength={2} accessibilityLabel="Dakika" /></View><Pressable style={styles.button} onPress={() => void schedule()}><Text style={styles.buttonText}>Uyarıları yenile</Text></Pressable><Text style={styles.note}>Uyarı bildirim olarak gelir; dokunduğunda Türkçe sesli okunur. Yeni konuma veya tahmine göre güncellemek için uygulamayı açıp bu düğmeye tekrar bas.</Text></View>}
      <Text style={styles.footer}>Hava tahmini: Open-Meteo · Astroloji yorumu hava tahmini değildir.</Text>
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7FAFF' }, container: { paddingTop: 62, paddingHorizontal: 22, paddingBottom: 48 },
  eyebrow: { color: '#4F85B4', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  title: { color, fontSize: 39, fontWeight: '800', lineHeight: 45, marginTop: 10 },
  subtitle: { color: '#607792', fontSize: 15, marginTop: 10, marginBottom: 27 },
  tabs: { flexDirection: 'row', padding: 5, borderRadius: 20, backgroundColor: '#E8F1FA', marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center', borderRadius: 16 },
  activeTab: { backgroundColor: 'white' }, tabText: { color: '#637B96', fontWeight: '700' }, activeText: { color },
  hero: { backgroundColor: '#DDEFFC', borderRadius: 28, padding: 25, minHeight: 185, justifyContent: 'center' },
  small: { color: '#466786', fontSize: 13, fontWeight: '600' }, temperature: { color, fontSize: 72, fontWeight: '700', marginTop: 8 },
  condition: { color, fontSize: 19, fontWeight: '700', marginBottom: 9, textTransform: 'capitalize' },
  updated: { color: '#7190A8', fontSize: 11, marginTop: 14 },
  card: { backgroundColor: 'white', borderRadius: 24, padding: 22, marginTop: 18 },
  cardTitle: { color, fontSize: 21, fontWeight: '800', marginBottom: 12 },
  body: { color: '#485F7A', fontSize: 15, lineHeight: 23 },
  button: { backgroundColor: color, borderRadius: 15, alignItems: 'center', padding: 16, marginTop: 20 },
  buttonText: { color: 'white', fontWeight: '800', fontSize: 15 },
  outline: { borderColor: '#A9C6E1', borderWidth: 1, borderRadius: 15, alignItems: 'center', padding: 14, marginTop: 16 },
  outlineText: { color, fontWeight: '700' },
  forecast: { borderBottomWidth: 1, borderBottomColor: '#DFE8F1', paddingVertical: 17 },
  forecastDay: { color, fontWeight: '700', marginBottom: 5, textTransform: 'capitalize' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  rowLabel: { color, flex: 1, fontWeight: '600' },
  note: { color: '#6F8198', fontSize: 12, lineHeight: 19, marginTop: 18 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  input: { color, backgroundColor: sky, fontSize: 30, fontWeight: '800', textAlign: 'center', width: 75, borderRadius: 14, padding: 10 },
  colon: { fontSize: 30, marginHorizontal: 10, color }, footer: { color: '#8595AA', fontSize: 11, marginTop: 30, textAlign: 'center' },
});
