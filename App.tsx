import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, BackHandler, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { getVoiceAudio, getVoiceProfileStatus, getObservationAudio } from './cloudVoice';
import { File, Paths } from 'expo-file-system';
import type { CameraView } from 'expo-camera';
import type { VoiceProfile } from './voiceConfig';
import { skyAt, symbolicReading } from './astronomy';
import { skyViewingWindows, moonCalendar } from './skyDiscovery';
import {observationPlan,skyEvents,type AirForecast} from './observationPlan';
import { CardReadings } from './CardReadings';
import { Compass } from './Compass';
import { MoonDisc, SkyAtmosphere, SunDisc, ZodiacWheel } from './CelestialVisuals';
import { dailyNotificationEnabled, setDailyNotification, stopDailyNotification, scheduleWeatherAlerts, stopWeatherAlerts } from './notifications';

type Place = { name: string; latitude: number; longitude: number };
type CityResult={name:string;country?:string;admin1?:string;latitude:number;longitude:number};
type Screen='weather'|'sky'|'zodiac'|'journal'|'settings'|'moon'|'lens'|'cards'|'observation'|'events'|'compass';
type JournalEntry={id:string;date:string;place:string;mood:string;note:string;sky:string;photoUri?:string};
type Weather = {
 utc_offset_seconds?: number;
 current: { temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; wind_speed_10m: number; weather_code: number; is_day: number };
 daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[]; sunrise: string[]; sunset: string[]; uv_index_max: number[] };
 hourly:{time:string[];precipitation_probability:number[];temperature_2m:number[];weather_code:number[];cloud_cover:number[];visibility:number[]};
};
const SIGNS = ['Koç','Boğa','İkizler','Yengeç','Aslan','Başak','Terazi','Akrep','Yay','Oğlak','Kova','Balık'];
const ICONS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const NOTES = ['Bugün önceliklerini sakinlikle seç.','Küçük bir adım için kendine alan aç.','Merak ettiğin bir konuya zaman ayır.','Sevdiklerinle bağ kur.','Yaratıcı fikrini paylaş.','Detaylarla uğraşırken dinlenmeyi unutma.','Kararlarında dengeyi gözet.','Düşüncelerini yazıya dök.','Yeni bir şey öğren.','Hedeflerin için küçük bir plan yap.','Farklı bir fikre kulak ver.','Hayal gücünü somut bir adımla birleştir.'];
const PALETTE = {
 day: { bg:'#F3D8D8',panel:'rgba(255,250,246,0.83)',hero:'rgba(255,244,237,0.08)',text:'#382849',sub:'#695674',accent:'#795185',line:'rgba(146,104,150,0.40)',input:'rgba(255,255,255,0.76)',button:'#FFF9ED' },
 night: { bg:'#100F2B',panel:'rgba(21,17,55,0.82)',hero:'rgba(22,15,49,0.03)',text:'#FFF2E8',sub:'#E0D1EF',accent:'#F5D8A7',line:'rgba(211,171,227,0.54)',input:'rgba(65,48,88,0.82)',button:'#281C44' }
};
function label(code:number) { if(code>=95)return 'Gök gürültülü yağış'; if(code>=71&&code<=77||code>=85&&code<=86)return 'Karlı'; if(code>=51&&code<=67||code>=80&&code<=82)return 'Yağmurlu'; if(code>=45&&code<=48)return 'Sisli'; if(code>=3)return 'Bulutlu'; if(code>=1)return 'Parçalı bulutlu'; return 'Açık'; }
function symbol(code:number,dark:boolean){ if(code>=95)return '⛈️'; if(code>=71&&code<=77||code>=85&&code<=86)return '❄️'; if(code>=51&&code<=67||code>=80&&code<=82)return '🌧️'; if(code>=45&&code<=48)return '🌫️'; if(code>=1&&code<=3)return '☁️'; return dark?'🌙':'☀️'; }
const time=(s?:string)=>s?.split('T')[1]?.slice(0,5)||'—';
const num=(n?:number)=>Number.isFinite(n)?String(Math.round(n!)):'—';
function currentIsNight(w:Weather){return w.current.is_day!==1;}
function Root(){
 const [screen,setActiveScreen]=useState<Screen>('weather');
 const screenHistory=useRef<Screen[]>([]);
 function setScreen(next:Screen){
  if(next===screen)return;
  if(next==='weather')screenHistory.current=[];
  else screenHistory.current.push(screen);
  setActiveScreen(next);
 }
 function goBack(){
  const previous=screenHistory.current.pop()??'weather';
  setActiveScreen(previous);
 }
 useEffect(()=>{
  const handler=BackHandler.addEventListener('hardwareBackPress',()=>{
   if(screen==='weather')return false;
   goBack();return true;
  });
  return()=>handler.remove();
 },[screen]);
 const [weather,setWeather]=useState<Weather|null>(null);
 const [air,setAir]=useState<AirForecast|null>(null);
 const [airError,setAirError]=useState(false);
 const [place,setPlace]=useState<Place|null>(null);
 const [locationMode,setLocationMode]=useState<'gps'|'city'>('gps');
 const [hydrated,setHydrated]=useState(false);
 const bootPlaceRef=useRef<Place|null>(null);
 const lastFetchRef=useRef(0);
 const loadIdRef=useRef(0);
 const locationActionRef=useRef(0);
 const [query,setQuery]=useState('');
 const [cityResults,setCityResults]=useState<CityResult[]>([]);
 const [locationStatus,setLocationStatus]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [speaking,setSpeaking]=useState(false);
 const [voiceLoading,setVoiceLoading]=useState<VoiceProfile|'observation'|null>(null);
 const [activeVoice,setActiveVoice]=useState<VoiceProfile|'observation'|null>(null);
 const voiceRequestId=useRef(0);
 const player=useAudioPlayer(null);
 const playback=useAudioPlayerStatus(player);
 const [voiceEnabled,setVoiceEnabled]=useState(true);
 const [voiceProfiles,setVoiceProfiles]=useState<Record<VoiceProfile,string>|null>(null);
 const [sign,setSign]=useState('Koç');
 const [theme,setTheme]=useState<'auto'|'day'|'night'>('auto');
 const [now,setNow]=useState(Date.now());
 const [updated,setUpdated]=useState('');
 const [hour,setHour]=useState('08');
 const [minute,setMinute]=useState('00');
 const [notificationActive,setNotificationActive]=useState(false);
 const [showSkyDetail,setShowSkyDetail]=useState(false);
 const [selectedPlanet,setSelectedPlanet]=useState<string|null>(null);
 const [favorites,setFavorites]=useState<Place[]>([]);
 const [journal,setJournal]=useState<JournalEntry[]>([]);
 const [mood,setMood]=useState('Sakin');
 const [journalText,setJournalText]=useState('');
 const [journalPhoto,setJournalPhoto]=useState<string|null>(null);
 const [photoCameraOpen,setPhotoCameraOpen]=useState(false);
 const [CameraComponent,setCameraComponent]=useState<typeof CameraView|null>(null);
 const [LensComponent,setLensComponent]=useState<typeof import('./SkyLens').SkyLens|null>(null);
 const [lensError,setLensError]=useState('');
 const cameraRef=useRef<CameraView>(null);
 const shareCardRef=useRef<any>(null);
 const [voiceDuration,setVoiceDuration]=useState<'brief'|'full'>('full');
 const [voicePace,setVoicePace]=useState<'calm'|'normal'>('normal');
 const [rainThreshold,setRainThreshold]=useState('60');
 const [coldThreshold,setColdThreshold]=useState('5');
 const [alertEnabled,setAlertEnabled]=useState(false);
 const [alertStatus,setAlertStatus]=useState('');
 const astronomy=useMemo(()=>skyAt(new Date(now)),[now]);
 useEffect(()=>{dailyNotificationEnabled().then(setNotificationActive).catch(()=>{});},[]);
 useEffect(()=>{getVoiceProfileStatus().then(setVoiceProfiles).catch(()=>{});},[]);
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(id);},[]);
 useEffect(()=>{
  if(screen!=='lens'||LensComponent)return;
  let active=true;
  import('./SkyLens').then(mod=>{if(active)setLensComponent(()=>mod.SkyLens);}).catch(()=>{if(active)setLensError('Kamera görünümü bu Expo Go sürümünde açılamadı. SDK 58 uyumlu Expo Go veya geliştirme derlemesini kullan.');});
  return()=>{active=false;};
 },[screen,LensComponent]);
 useEffect(()=>{AsyncStorage.multiGet(['sky.place','sky.settings','sky.locationMode','sky.favorites','sky.journal']).then(values=>{
  const savedPlace=values[0][1],saved=values[1][1];
  if(savedPlace){const p=JSON.parse(savedPlace) as Place;if(Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)){bootPlaceRef.current=p;setPlace(p);}}
  setLocationMode(values[2][1]==='city'?'city':'gps');
  if(saved){const s=JSON.parse(saved);setVoiceEnabled(s.voiceEnabled??true);setSign(s.sign??'Koç');setHour(s.hour??'08');setMinute(s.minute??'00');setTheme(s.theme??'auto');setRainThreshold(s.rainThreshold??'60');setColdThreshold(s.coldThreshold??'5');setAlertEnabled(s.alertEnabled??false);setVoiceDuration(s.voiceDuration==='brief'?'brief':'full');setVoicePace(s.voicePace==='calm'?'calm':'normal');}
  if(values[3][1])setFavorites(JSON.parse(values[3][1]));
  if(values[4][1])setJournal(JSON.parse(values[4][1]));
 }).catch(()=>{}).finally(()=>setHydrated(true));},[]);
 useEffect(()=>{if(hydrated)AsyncStorage.setItem('sky.settings',JSON.stringify({voiceEnabled,sign,hour,minute,theme,rainThreshold,coldThreshold,alertEnabled,voiceDuration,voicePace})).catch(()=>{});},[hydrated,voiceEnabled,sign,hour,minute,theme,rainThreshold,coldThreshold,alertEnabled,voiceDuration,voicePace]);
 useEffect(()=>{if(hydrated)AsyncStorage.setItem('sky.favorites',JSON.stringify(favorites)).catch(()=>{});},[hydrated,favorites]);
 useEffect(()=>{if(hydrated)AsyncStorage.setItem('sky.journal',JSON.stringify(journal)).catch(()=>{});},[hydrated,journal]);
 const load=useCallback(async(p:Place,source:'gps'|'city'='city'):Promise<boolean>=>{
  const loadId=++loadIdRef.current;
  setBusy(true);setError('');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
  try{
   const args=new URLSearchParams({latitude:String(p.latitude),longitude:String(p.longitude),current:'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day',hourly:'temperature_2m,precipitation_probability,weather_code,cloud_cover,visibility',daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max',timezone:'auto',forecast_days:'5'});
   const response=await fetch('https://api.open-meteo.com/v1/forecast?'+args,{signal:controller.signal});
   if(!response.ok)throw new Error('Hava servisine bağlanılamadı.');
   const data=await response.json() as Weather;
   if(!data.current||!data.daily?.sunrise?.length||!data.hourly?.time?.length)throw new Error('Bu yer için tahmin bulunamadı.');
   if(loadId!==loadIdRef.current)return false;
   setWeather(data);setPlace(p);setLocationMode(source);lastFetchRef.current=Date.now();setUpdated(new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}));await AsyncStorage.multiSet([['sky.place',JSON.stringify(p)],['sky.locationMode',source]]);return true;
  }catch(e){if(loadId===loadIdRef.current)setError(controller.signal.aborted?'Hava tahmini sunucusu zaman aşımına uğradı. Tekrar dene.':e instanceof Error?e.message:'Hava bilgisi alınamadı.');return false;}
  finally{clearTimeout(timer);if(loadId===loadIdRef.current)setBusy(false);}
 },[]);
 const locate=useCallback(async()=>{
  const action=++locationActionRef.current;
  setBusy(true);setError('');
  try{
   const permission=await Location.requestForegroundPermissionsAsync();
   if(!permission.granted){setError('Konum izni verilmedi. Telefon ayarlarından izin ver veya aşağıdan şehir ara.');return;}
   if(!await Location.hasServicesEnabledAsync()){setError('Telefonun konum servisi kapalı. GPS’i aç veya aşağıdan şehir ara.');return;}
   setLocationStatus('GPS konumu aranıyor…');
   const cached=await Location.getLastKnownPositionAsync({maxAge:15*60_000,requiredAccuracy:20_000}).catch(()=>null);
   let pos=cached;
   if(!pos){
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{pos=await Promise.race([Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('GPS konumu zaman aşımına uğradı.')),15000);})]);}
    finally{if(timer)clearTimeout(timer);}
   }
   const {latitude,longitude}=pos.coords;
   let name='Konumum';
   // A failing geocoder must never prevent an otherwise valid GPS fix from loading weather.
   let nameTimer:ReturnType<typeof setTimeout>|undefined;
   try{
    const addresses=await Promise.race([Location.reverseGeocodeAsync({latitude,longitude}),new Promise<never>((_,reject)=>{nameTimer=setTimeout(()=>reject(new Error('Yer adı zaman aşımı')),4000);})]);
    const a=addresses[0];name=(a?.city?.includes('Köyü')?a?.region:a?.city)||a?.region||a?.subregion||name;
   }catch{}finally{if(nameTimer)clearTimeout(nameTimer);}
   if(action!==locationActionRef.current)return;
   const ok=await load({name,latitude,longitude},'gps');
   if(ok&&action===locationActionRef.current){setLocationStatus((cached?'Son bilinen yakın konum kullanıldı.':'GPS konumu alındı.')+(typeof pos.coords.accuracy==='number'?' Yaklaşık doğruluk: '+Math.round(pos.coords.accuracy)+' m.':''));setCityResults([]);}
  }catch(e){if(action===locationActionRef.current)setError((e instanceof Error?e.message:'Konum belirlenemedi.')+' GPS ve konum iznini kontrol et veya şehir adıyla ara.');}
  finally{if(action===locationActionRef.current)setBusy(false);}
 },[load]);
 useEffect(()=>{if(!hydrated)return;if(locationMode==='city'&&bootPlaceRef.current)void load(bootPlaceRef.current,'city');else void locate();},[hydrated]);
 useEffect(()=>{
  if(!place)return;
  const controller=new AbortController();setAir(null);setAirError(false);
  const params=new URLSearchParams({latitude:String(place.latitude),longitude:String(place.longitude),hourly:'european_aqi,pm2_5,aerosol_optical_depth',timezone:'auto',forecast_days:'3'});
  fetch('https://air-quality-api.open-meteo.com/v1/air-quality?'+params,{signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error('air');return response.json();}).then(data=>{if(!controller.signal.aborted)setAir(data as AirForecast);}).catch(()=>{if(!controller.signal.aborted)setAirError(true);});
  return()=>controller.abort();
 },[place?.latitude,place?.longitude]);
 useEffect(()=>{const tick=setInterval(()=>{if(place&&!busy&&Date.now()-lastFetchRef.current>=30*60_000){if(locationMode==='gps')void locate();else void load(place,'city');}},5*60_000);return()=>clearInterval(tick);},[place,busy,locationMode,load,locate]);
 useEffect(()=>{const sub=AppState.addEventListener('change',next=>{if(next==='active'){setNow(Date.now());if(place&&Date.now()-lastFetchRef.current>=15*60_000){if(locationMode==='gps')void locate();else void load(place,'city');}}});return()=>sub.remove();},[place,locationMode,load,locate]);
 useEffect(()=>{
  if(!hydrated||!alertEnabled||!place||!weather?.hourly)return;
  const rain=Number(rainThreshold),cold=Number(coldThreshold);
  if(!Number.isInteger(rain)||rain<1||rain>100||!Number.isInteger(cold)||cold< -30||cold>30)return;
  void scheduleWeatherAlerts(weather.hourly,weather.utc_offset_seconds??0,place.name,rain,cold)
    .then(count=>setAlertStatus(count?count+' yaklaşan uyarı planlandı.':'Önümüzdeki 36 saatte eşik aşımı beklenmiyor.'))
    .catch(e=>setAlertStatus(e instanceof Error?e.message:'Uyarılar yenilenemedi.'));
 },[hydrated,alertEnabled,weather,place,rainThreshold,coldThreshold]);
 async function enableAlerts(){
  const rain=Number(rainThreshold),cold=Number(coldThreshold);
  if(!Number.isInteger(rain)||rain<1||rain>100||!Number.isInteger(cold)||cold< -30||cold>30){Alert.alert('Geçersiz eşik','Yağış için 1–100, sıcaklık için -30–30 arasında sayı gir.');return;}
  if(!weather?.hourly||!place){Alert.alert('Hava verisi bekleniyor','Önce konumu ve hava tahminini yükle.');return;}
  try{const count=await scheduleWeatherAlerts(weather.hourly,weather.utc_offset_seconds??0,place.name,rain,cold);setAlertEnabled(true);setAlertStatus(count?count+' yaklaşan uyarı planlandı.':'Önümüzdeki 36 saatte eşik aşımı beklenmiyor.');}catch(e){Alert.alert('Uyarı açılamadı',e instanceof Error?e.message:'Bildirim iznini kontrol et.');}
 }
 function saveEntry(){
  const note=journalText.trim();
  if(!note){Alert.alert('Bir not yaz','Gökyüzü günlüğüne kısa bir düşünce ekle.');return;}
  const entry:JournalEntry={id:String(Date.now()),date:new Date().toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'}),place:place?.name||'Konum yok',mood,note:note.slice(0,500),sky:astronomy.phaseName,photoUri:journalPhoto??undefined};
  setJournal(prev=>[entry,...prev].slice(0,100));setJournalText('');setJournalPhoto(null);
 }
 async function openJournalCamera(){
  try{
   const camera=await import('expo-camera');
   const current=await camera.Camera.getCameraPermissionsAsync();
   const permission=current.granted?current:await camera.Camera.requestCameraPermissionsAsync();
   if(!permission.granted){Alert.alert('Kamera izni gerekli','Fotoğraf eklemek için ayarlardan kamera izni ver.');return;}
   setCameraComponent(()=>camera.CameraView);setPhotoCameraOpen(true);
  }catch{Alert.alert('Kamera açılamadı','Bu Expo Go sürümünde kamera modülü bulunamadı. SDK 58 uyumlu Expo Go veya geliştirme derlemesini kullan.');}
 }
 async function takeJournalPhoto(){
  try{
   const photo=await cameraRef.current?.takePictureAsync({quality:.8});
   if(!photo?.uri)return;
   const saved=new File(Paths.document,'gokyuzu-gunluk-'+Date.now()+'.jpg');
   new File(photo.uri).copy(saved);
   setJournalPhoto(saved.uri);setPhotoCameraOpen(false);
  }catch(e){Alert.alert('Fotoğraf kaydedilemedi',e instanceof Error?e.message:'Kamera hatası.');}
 }
 async function shareDayCard(){
  if(!shareCardRef.current||!weather){Alert.alert('Hava verisi bekleniyor','Kart için hava durumunu yükle.');return;}
  try{
   const Sharing=await import('expo-sharing');
   const {captureRef}=require('react-native-view-shot') as {captureRef:(target:unknown,options:object)=>Promise<string>};
   if(!await Sharing.isAvailableAsync())throw new Error('Bu cihazda paylaşım kullanılamıyor.');
   const uri=await captureRef(shareCardRef.current,{format:'png',result:'tmpfile'});
   await Sharing.shareAsync(uri,{mimeType:'image/png',dialogTitle:'Gökyüzü kartını paylaş'});
  }catch(e){Alert.alert('Kart paylaşılamadı',e instanceof Error?e.message:'Paylaşım hatası.');}
 }
 function toggleFavorite(){
  if(!place)return;
  const isSaved=favorites.some(x=>Math.abs(x.latitude-place.latitude)<.001&&Math.abs(x.longitude-place.longitude)<.001);
  setFavorites(prev=>isSaved?prev.filter(x=>Math.abs(x.latitude-place.latitude)>=.001||Math.abs(x.longitude-place.longitude)>=.001):[...prev,place].slice(0,12));
 }
 async function searchCity(){
  if(query.trim().length<2){setError('Şehir adından en az iki harf yaz.');return;}
  const action=++locationActionRef.current;
  setBusy(true);setError('');setCityResults([]);setLocationStatus('Şehir aranıyor…');
  try{
   const r=await fetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(query.trim())+'&count=5&language=tr&format=json');
   if(!r.ok)throw new Error('Şehir araması yapılamadı.');
   const data=await r.json();
   const results=(data.results||[]) as CityResult[];
   if(!results.length)throw new Error('Şehir bulunamadı; farklı bir ad dene.');
   if(action===locationActionRef.current){setCityResults(results.filter(x=>Number.isFinite(x.latitude)&&Number.isFinite(x.longitude)));setLocationStatus('Listeden kullanmak istediğin şehre dokun.');}
  }catch(e){if(action===locationActionRef.current)setError(e instanceof Error?e.message:'Şehir bulunamadı.');}
  finally{if(action===locationActionRef.current)setBusy(false);}
 }
 async function selectCity(result:CityResult){
  const action=++locationActionRef.current;
  const selected={name:result.name+(result.admin1&&result.admin1!==result.name?', '+result.admin1:'')+(result.country?', '+result.country:''),latitude:result.latitude,longitude:result.longitude};
  setLocationStatus(selected.name+' için hava tahmini yükleniyor…');
  if(await load(selected,'city')&&action===locationActionRef.current){setCityResults([]);setQuery('');setLocationStatus(selected.name+' seçildi.');setScreen('weather');}
 }
 const rise=weather?.daily.sunrise[0],set=weather?.daily.sunset[0];
 const localClock=new Date(now+(weather?.utc_offset_seconds??(-new Date().getTimezoneOffset()*60))*1000);
 const locationMinute=localClock.getUTCHours()*60+localClock.getUTCMinutes();
 const toMinute=(value?:string)=>{const valueTime=time(value).split(':').map(Number);return valueTime.length===2&&valueTime.every(Number.isFinite)?valueTime[0]*60+valueTime[1]:null;};
 const sunriseMinute=toMinute(rise),sunsetMinute=toMinute(set);
 const nightBySun=sunriseMinute!==null&&sunsetMinute!==null?(locationMinute<sunriseMinute||locationMinute>=sunsetMinute):weather?currentIsNight(weather):locationMinute<360||locationMinute>=1140;
 const dark=theme==='night'||theme==='auto'&&nightBySun;
 const p=dark?PALETTE.night:PALETTE.day;
 const current=weather?.current,daily=weather?.daily;
 const forecastHours=weather?.hourly?.time.map((date,i)=>({date,instant:Date.parse(date+'Z')-(weather.utc_offset_seconds??0)*1000,rain:weather.hourly.precipitation_probability[i],temp:weather.hourly.temperature_2m[i],code:weather.hourly.weather_code[i]})).filter(h=>Number.isFinite(h.instant)&&h.instant>=now-60*60_000).slice(0,12)??[];
 const viewing=weather?.hourly?skyViewingWindows(weather.hourly,weather.utc_offset_seconds??0,now,set,rise):[];
 const plan=place&&weather?.hourly?observationPlan(weather.hourly,weather.utc_offset_seconds??0,place.latitude,place.longitude,now,set,rise,air??undefined):null;
 const events=useMemo(()=>skyEvents(now),[new Date(now).toDateString()]);
 const moonDays=useMemo(()=>moonCalendar(new Date(now),21),[new Date(now).toDateString()]);
 const nextRain=forecastHours.find(h=>h.rain>=50);
 const rainChance=daily?.precipitation_probability_max[0]??0;
 const weatherAdvice=rainChance>=50||current&&[51,53,55,61,63,65,80,81,82,95,96,99].includes(current.weather_code)?'☂  Şemsiyeni al':current&&current.wind_speed_10m>=45?'🍃  Rüzgâra dikkat':daily&&daily.temperature_2m_min[0]<=5?'🧥  Kalın giyin':'✦  Gökyüzünü keşfet';
 const serif={fontFamily:'serif' as const};
 const narration=useMemo(()=>{
  if(!current||!daily)return '';
  const rain=daily.precipitation_probability_max[0]||0;
  const advice=rain>=50?'Şemsiyeni yanına almayı unutma.':current.wind_speed_10m>=45?'Rüzgâr güçlü, dışarıda dikkatli ol.':daily.temperature_2m_min[0]<=5?'Sabah serinliği için kalın giyin.':daily.temperature_2m_max[0]>=32?'Sıcak havada bol su iç.':'Günün tadını çıkar.';
  return 'Merhaba. '+(place?.name||'Bulunduğun yer')+' için gökyüzünün sesine hoş geldin. Şu anda hava '+label(current.weather_code).toLocaleLowerCase('tr-TR')+'. Sıcaklık '+num(current.temperature_2m)+', hissedilen '+num(current.apparent_temperature)+' derece. Günün en düşük sıcaklığı '+num(daily.temperature_2m_min[0])+', en yükseği '+num(daily.temperature_2m_max[0])+' derece. Yağış olasılığı yüzde '+num(rain)+'. Güneş '+time(rise)+' saatinde doğuyor, '+time(set)+' saatinde batıyor. '+advice;
 },[current,daily,place,rise,set]);
 async function playVoice(profile:VoiceProfile){
  if(!voiceEnabled){Alert.alert('Ses kapalı','Ayarlar bölümünden sesli rehberi aç.');return;}
  if(activeVoice===profile || voiceLoading===profile){
   voiceRequestId.current++;player.pause();setActiveVoice(null);setVoiceLoading(null);
   return;
  }
  if(profile==='weather' && (!place || !weather)){Alert.alert('Hava durumu bekleniyor','Önce konum ya da şehir seçip hava durumunu yükle.');return;}
  const token=++voiceRequestId.current;
  player.pause();await Speech.stop();setSpeaking(false);setActiveVoice(null);setVoiceLoading(profile);
  try{
   const request=profile==='weather'
     ? {profile:'weather' as const,duration:voiceDuration,pace:voicePace,latitude:place!.latitude,longitude:place!.longitude,place:place!.name,
        weatherSnapshot:{temp:current!.temperature_2m,feels:current!.apparent_temperature,wind:current!.wind_speed_10m,code:current!.weather_code,observedAt:lastFetchRef.current,
          min:daily!.temperature_2m_min[0],max:daily!.temperature_2m_max[0],rain:daily!.precipitation_probability_max[0],sunrise:rise!,sunset:set!}}
     : {profile:'astrology' as const,sign,duration:voiceDuration,pace:voicePace};
   const uri=await getVoiceAudio(request);
   if(token!==voiceRequestId.current)return;
   await setAudioModeAsync({playsInSilentMode:true});
   player.replace({uri});
   player.play();
   setActiveVoice(profile);
  }catch(e){
   if(token!==voiceRequestId.current)return;
   const reason=e instanceof Error?e.message:'Ses alınamadı.';
   Alert.alert('Ses çalınamadı',reason+' Cihazın erkek sesine otomatik geçilmeyecek.');
  }finally{
   if(token===voiceRequestId.current)setVoiceLoading(null);
  }
 }
 async function playObservation(){
  if(!voiceEnabled){Alert.alert('Ses kapalı','Ayarlar bölümünden sesli rehberi aç.');return;}
  if(activeVoice==='observation'||voiceLoading==='observation'){voiceRequestId.current++;player.pause();setActiveVoice(null);setVoiceLoading(null);return;}
  if(!plan||!place||!weather){Alert.alert('Gözlem planı bulunamadı','Önce konumun hava tahminini yükle.');return;}
  const token=++voiceRequestId.current;player.pause();setActiveVoice(null);setVoiceLoading('observation');
  try{
   const uri=await getObservationAudio({place:place.name,latitude:place.latitude,longitude:place.longitude,instant:plan.instant,offsetSeconds:weather.utc_offset_seconds??0,score:plan.score,cloud:Math.round(plan.cloud),rain:Math.round(plan.rain),targets:plan.targets.slice(0,3).map(x=>({name:x.name,azimuth:x.azimuth,altitude:x.altitude}))});
   if(token!==voiceRequestId.current)return;
   await setAudioModeAsync({playsInSilentMode:true});player.replace({uri});player.play();setActiveVoice('observation');
  }catch(e){if(token===voiceRequestId.current)Alert.alert('Rehber sesi açılamadı',e instanceof Error?e.message:'Ses servisi kullanılamıyor.');}
  finally{if(token===voiceRequestId.current)setVoiceLoading(null);}
 }
 async function shareObservationCalendar(){
  if(!plan||!place)return;
  try{
   const Sharing=await import('expo-sharing');
   if(!await Sharing.isAvailableAsync())throw new Error('Paylaşım bu cihazda kullanılamıyor.');
   const stamp=(ms:number)=>new Date(ms).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
   const safePlace=place.name.replace(/[\\;,\n\r]/g,' ').slice(0,40);
   const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Gokyuzunun Sesi//Gozlem Plani//TR','BEGIN:VEVENT',
    'UID:gokyuzu-'+plan.instant+'-'+Math.round(place.latitude*1000)+'@gokyuzunun-sesi',
    'DTSTAMP:'+stamp(Date.now()),'DTSTART:'+stamp(plan.instant),'DTEND:'+stamp(plan.instant+3600000),
    'SUMMARY:Gece gokyuzu gozlemi','DESCRIPTION:'+safePlace+' icin tahmini gozlem plani. Hava durumunu yeniden kontrol et.',
    'END:VEVENT','END:VCALENDAR',''].join('\r\n');
   const file=new File(Paths.cache,'gokyuzu-gozlem-'+Date.now()+'.ics');file.create();await file.write(ics);
   await Sharing.shareAsync(file.uri,{mimeType:'text/calendar',dialogTitle:'Gözlem saatini takvime aktar'});
  }catch(e){Alert.alert('Takvim dosyası paylaşılamadı',e instanceof Error?e.message:'Paylaşım hatası.');}
 }
 useEffect(()=>{if(playback.didJustFinish){setActiveVoice(null);}},[playback.didJustFinish]);
 useEffect(()=>()=>{voiceRequestId.current++;player.pause();void Speech.stop();},[player]);
 const txt=(s:string,size=15,bold=false,muted=false)=> <Text style={{color:muted?p.sub:p.text,fontSize:size,fontWeight:bold?'800':'400',lineHeight:size+7}}>{s}</Text>;
 const panel=(content:React.ReactNode,style:object={})=><View style={[styles.panel,{backgroundColor:p.panel,borderColor:p.line},style]}>{content}</View>;
 const button=(text:string,action:()=>void,secondary=false)=><Pressable accessibilityRole="button" onPress={action} style={[styles.button,{backgroundColor:secondary?p.input:p.accent}]}><Text style={{color:secondary?p.text:p.button,fontWeight:'800'}}>{text}</Text></Pressable>;
 const fact=(icon:string,k:string,v:string)=><View style={[styles.fact,{backgroundColor:p.panel,borderColor:p.line}]}><Text style={{fontSize:25}}>{icon}</Text>{txt(k,12,false,true)}{txt(v,16,true)}</View>;
 return <SafeAreaView style={{flex:1,backgroundColor:p.bg}} edges={['top','bottom']}>
  <SkyAtmosphere night={dark}/>
  <StatusBar style={dark?'light':'dark'}/>
  <ScrollView key={screen} keyboardShouldPersistTaps="handled"
    refreshControl={<RefreshControl refreshing={busy} onRefresh={()=>locationMode==='gps'?void locate():place?void load(place,'city'):void locate()} tintColor={p.accent}/>}
    contentContainerStyle={styles.page}>
  <View style={styles.header}>
    <Text style={{fontSize:43,color:p.accent,marginRight:8}}>☾</Text>
    <View style={{flex:1,minWidth:0}}>
      <Text style={[{color:p.text,fontSize:25},serif]}>Gökyüzünün Sesi</Text>
      <Text style={{color:p.sub,fontSize:11,fontStyle:'italic'}}>Evren hep seninle konuşuyor…</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Gökyüzü günlüğünü aç" onPress={()=>setScreen('journal')} style={{padding:6}}><Text style={{fontSize:23,color:p.accent}}>✎</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Kart yorumlarını aç" onPress={()=>setScreen('cards')} style={{padding:6}}><Text style={{fontSize:23,color:p.accent}}>✧</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Bildirim ayarları" onPress={()=>setScreen('settings')} style={{padding:6}}><Text style={{fontSize:26,color:p.accent}}>♧</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Ayarları aç" onPress={()=>setScreen('settings')} style={[styles.headerAction,{backgroundColor:p.panel,borderColor:p.line}]}><Text style={{color:p.accent,fontSize:22}}>⚙</Text></Pressable>
  </View>
  {screen!=='weather'&&<Pressable accessibilityRole="button" accessibilityLabel="Önceki ekrana dön" onPress={goBack} style={{alignSelf:'flex-start',paddingVertical:10,paddingHorizontal:15,borderRadius:16,borderWidth:1,borderColor:p.line,backgroundColor:p.panel,marginTop:9}}><Text style={{color:p.text,fontSize:14,fontWeight:'700'}}>‹ Geri</Text></Pressable>}
  <View style={[styles.nav,{borderColor:p.line,backgroundColor:p.panel}]}>
    {([['weather','☀  Bugün'],['sky','♄  Gezegenler'],['zodiac','♑  Burcum']] as const).map(([id,title])=>
      <Pressable accessibilityRole="button" key={id} onPress={()=>setScreen(id)} style={[styles.navItem,{backgroundColor:screen===id?p.accent:'transparent'}]}>
       <Text numberOfLines={1} style={[{color:screen===id?p.button:p.text,fontSize:13},serif]}>{title}</Text>
      </Pressable>)}
  </View>
  {!!error&&panel(<>{txt('⚠️ '+error,14)}{button('Konumumu tekrar dene',()=>void locate(),true)}</>,{marginBottom:15})}
  {screen==='weather'&&<>
   {panel(<>
     <View style={styles.sectionHeading}><Text style={[{color:p.text,fontSize:19},serif]}>✦ Keşfet</Text><Text style={{color:p.sub,fontSize:11}}>Gökyüzü ve kartlar</Text></View>
     <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:12}}>
      {([['observation','☾','Gözlem planı'],['events','✧','Gök olayları'],['cards','✦','Kart yorumları'],['compass','⊕','Pusula']] as const).map(([destination,icon,title])=><Pressable key={title} accessibilityRole="button" accessibilityLabel={title+' ekranını aç'} onPress={()=>setScreen(destination)} style={{width:'48%',flexGrow:1,flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderColor:p.line,backgroundColor:p.input,borderRadius:14,paddingVertical:11,paddingHorizontal:9}}><Text style={{color:p.accent,fontSize:23}}>{icon}</Text><Text numberOfLines={1} style={{color:p.text,fontSize:12,fontWeight:'700',flexShrink:1}}>{title}</Text></Pressable>)}
     </View>
   </>,{marginBottom:12})}
   <View style={[styles.hero,{backgroundColor:p.hero}]}>
    <View style={styles.heroLeft}>
     <Text style={[{color:p.text,fontSize:22},serif]}>{new Date(now).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})}</Text>
     <Text style={[{color:p.text,fontSize:16},serif]}>{new Date(now).toLocaleDateString('tr-TR',{weekday:'long'})}</Text>
     <Pressable accessibilityRole="button" accessibilityLabel="Konumu değiştir" onPress={()=>setScreen('settings')} style={{marginTop:12}}><Text numberOfLines={2} style={{color:p.text,fontSize:13}}>⌖  {place?.name||'Konum aranıyor'}  {current?symbol(current.weather_code,dark):''}</Text></Pressable>
    </View>
    <View style={styles.heroRight}>
      <Text style={[{color:p.text,fontSize:14},serif]}>Ay Fazı</Text>
      <Text style={[{color:p.text,fontSize:20},serif]}>{astronomy.phaseName}</Text>
      <Text style={{color:p.sub,fontSize:13}}>%{astronomy.illuminated} aydınlık</Text>
      <Text style={{color:p.accent,marginVertical:5}}>━━━━ ✦ ━━━━</Text>
      <Text style={[{color:p.text,fontSize:13},serif]}>Niyetlerini büyüt, evren seninle.</Text>
    </View>
   </View>
   {panel(<>
     <View style={styles.sectionHeading}><Text style={[{color:p.text,fontSize:19},serif]}>☾ Gökyüzü Takvimi</Text><Pressable onPress={()=>setScreen('events')} accessibilityRole="button"><Text style={{color:p.sub,fontSize:11}}>Tüm olaylar  ›</Text></Pressable></View>
     <View style={styles.planetStrip}><View pointerEvents="none" style={[styles.planetLine,{backgroundColor:p.accent,opacity:.55}]}/>{astronomy.bodies.slice(1,6).map(body=><Pressable key={body.name} accessibilityRole="button" onPress={()=>{setSelectedPlanet(body.name);setScreen('sky');}} style={styles.miniPlanet}><View style={[styles.planetOrb,{backgroundColor:p.input,borderColor:p.line}]}><Text style={{fontSize:23,color:p.accent}}>{body.icon}</Text></View><Text numberOfLines={1} style={[{color:p.text,fontSize:12},serif]}>{body.name}</Text><Text numberOfLines={1} style={{color:p.sub,fontSize:10}}>{body.sign}</Text></Pressable>)}</View>
   </>,{marginTop:8})}
   <View style={styles.zodiacRow}>
     <View style={[styles.wheelPanel,{backgroundColor:p.panel,borderColor:p.line}]}><ZodiacWheel night={dark} compact active={Math.max(0,SIGNS.indexOf(sign))} onSelect={i=>setSign(SIGNS[i])}/></View>
     <Pressable accessibilityRole="button" onPress={()=>setScreen('zodiac')} style={[styles.zodiacPanel,{backgroundColor:p.panel,borderColor:p.line}]}>
       <Text style={{color:p.accent,fontSize:12}}>Senin Burcun</Text>
       <Text numberOfLines={1} style={[{color:p.text,fontSize:21},serif]}>{ICONS[SIGNS.indexOf(sign)]}  {sign}</Text>
       <Text style={{color:p.line}}>─────────</Text>
       <Text style={{color:p.accent,fontSize:12,marginTop:3}}>Günün Yorumu</Text>
       <Text numberOfLines={5} style={{color:p.text,fontSize:12,lineHeight:17,marginTop:4}}>{symbolicReading(sign,astronomy)}</Text>
       <Text style={{color:p.sub,fontSize:11,marginTop:5}}>Tüm yorumu gör  ›</Text>
     </Pressable>
   </View>
   <Pressable accessibilityRole="button" onPress={()=>void playVoice('astrology')} style={[styles.voiceBanner,{borderColor:p.line,backgroundColor:dark?'rgba(78,51,103,0.87)':'rgba(255,237,225,0.87)'}]}>
     <Text style={{fontSize:28,color:p.accent}}>◖♫◗</Text>
     <View style={{flex:1}}><Text style={[{color:p.text,fontSize:17},serif]}>Sesli yorumumu dinle</Text><Text numberOfLines={1} style={{color:p.sub,fontSize:11}}>Bugünün senin için ne söylediğini keşfet…</Text></View>
     <View style={[styles.playIcon,{backgroundColor:p.accent}]}><Text style={{color:p.button,fontSize:22}}>{activeVoice==='astrology'?'■':voiceLoading==='astrology'?'…':'▶'}</Text></View>
   </Pressable>
   {voiceLoading==='astrology'&&<ActivityIndicator color={p.accent}/>}
   <Pressable accessibilityRole="button" onPress={()=>setScreen('cards')} style={[styles.voiceBanner,{borderColor:p.line,backgroundColor:p.panel}]}><Text style={{color:p.accent,fontSize:32}}>✧</Text><View style={{flex:1}}><Text style={[{color:p.text,fontSize:17},serif]}>Kart Yorumları</Text><Text style={{color:p.sub,fontSize:12}}>Tarot · Katina tarzı · İskambil</Text></View><Text style={{color:p.accent,fontSize:20}}>›</Text></Pressable>
   {current&&daily&&<>
    {panel(<>
     <Text style={[{color:p.text,fontSize:19},serif]}>✦ Günlük Gökyüzü Rotası</Text>
     {txt((place?.name||'Bulunduğun yer')+' · '+label(current.weather_code)+' · '+num(current.temperature_2m)+'°',13)}
     {txt(nextRain?'☂ Yağış olasılığı '+time(nextRain.date)+' civarında %'+num(nextRain.rain)+' düzeyine çıkıyor.':'Önümüzdeki saatlerde belirgin yağış görünmüyor.',12,false,true)}
     {txt('Ay: '+astronomy.phaseName+' · '+sign+' için sembolik yorum hazır.',12,false,true)}
     <View style={{flexDirection:'row',gap:8}}><View style={{flex:1}}>{button(voiceLoading==='weather'?'Hazırlanıyor…':activeVoice==='weather'?'■ Durdur':'▶ Hava özetini dinle',()=>void playVoice('weather'),true)}</View><View style={{flex:1}}>{button('✎ Günlüğü aç',()=>setScreen('journal'),true)}</View></View>
    </>,{marginTop:12})}
    <View style={styles.bottomRow}>
     <View style={[styles.weatherTile,{backgroundColor:p.panel,borderColor:p.line}]}>
      <Text numberOfLines={1} style={[{color:p.text,fontSize:13},serif]}>☾  Hava Durumu · {place?.name||'Konumum'}</Text>
      <View style={{flexDirection:'row',alignItems:'center',gap:6,marginVertical:7}}><Text style={{fontSize:32}}>{symbol(current.weather_code,dark)}</Text><View><Text style={[{color:p.text,fontSize:29},serif]}>{num(current.temperature_2m)}°</Text><Text style={{color:p.sub,fontSize:11}}>{label(current.weather_code)}</Text></View></View>
      <Pressable accessibilityRole="button" onPress={()=>void playVoice('weather')} style={[styles.adviceButton,{backgroundColor:dark?'#E8E7FC':'#735084'}]}><Text numberOfLines={1} style={{color:dark?'#24204F':'#FFFFFF',fontSize:11,fontWeight:'600'}}>{weatherAdvice}  {activeVoice==='weather'?'■':'▶'}</Text></Pressable>
     </View>
     <View style={[styles.weatherTile,{backgroundColor:p.panel,borderColor:p.line}]}><Text style={[{color:p.text,fontSize:13},serif]}>✦  Günün Gökyüzü</Text><Text style={{color:p.sub,fontSize:11,marginTop:10}}>Ay: {astronomy.phaseName}</Text><Text style={{color:p.sub,fontSize:11,marginTop:8}}>Yağış: %{num(rainChance)}</Text><Text style={{color:p.sub,fontSize:11,marginTop:8}}>Rüzgâr: {num(current.wind_speed_10m)} km/sa</Text><Text style={{color:p.sub,fontSize:10,marginTop:12}}>Son güncelleme {updated}</Text></View>
    </View>
    {panel(<>
      <Text style={[{color:p.text,fontSize:19},serif]}>☂ Saatlik Hava ve Yağış</Text>
      {txt(nextRain?'Yağış ihtimali '+time(nextRain.date)+' civarında %'+num(nextRain.rain)+'.':'Önümüzdeki 12 saatte yüksek yağış olasılığı görünmüyor.',12,false,true)}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:12}} contentContainerStyle={{gap:8}}>{forecastHours.map((h,i)=><View key={h.date} style={[styles.hourTile,{backgroundColor:p.input,borderColor:p.line}]}><Text style={{color:p.text,fontWeight:'700'}}>{i===0?'Şimdi':time(h.date)}</Text><Text style={{fontSize:22,marginVertical:5}}>{symbol(h.code,dark)}</Text><Text style={{color:p.text}}>{num(h.temp)}°</Text><Text style={{color:p.sub,fontSize:11}}>☂ %{num(h.rain)}</Text></View>)}</ScrollView>
    </>,{marginTop:14})}
    {panel(<>{txt('Önümüzdeki günler',19,true)}{daily.time.slice(1,5).map((d,i)=><View key={d} style={[styles.forecast,{borderColor:p.line}]}><Text style={{fontSize:23}}>{symbol(daily.weather_code[i+1],dark)}</Text><View style={{flex:1}}>{txt(new Date(d+'T12:00:00').toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'}),13,true)}{txt(label(daily.weather_code[i+1])+' · Yağış %'+num(daily.precipitation_probability_max[i+1]),11,false,true)}</View>{txt(num(daily.temperature_2m_min[i+1])+'° / '+num(daily.temperature_2m_max[i+1])+'°',12,true)}</View>)}</>,{marginTop:15})}
   </>}
   {panel(<>
     {txt('✦ Bu Gece Gökyüzü Görülür mü?',19,true)}
     {viewing.length?viewing.map(window=><View key={window.time} style={[styles.forecast,{borderColor:p.line}]}><View style={{flex:1}}>{txt(new Date(window.time+'Z').toLocaleDateString('tr-TR',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'})+' · '+time(window.time),14,true)}{txt('Bulut %'+num(window.cloud)+' · Yağış %'+num(window.rain)+' · Görüş '+(window.visibility/1000).toFixed(1)+' km',11,false,true)}</View>{txt('%'+window.score,20,true)}</View>):txt(weather?'Bulut, görüş veya gece saatleri için yeterli tahmin bulunamadı.':'Hava tahmini yükleniyor.',13,false,true)}
     {txt('Puan tahmini bulut, yağış ve görüşe dayanır; gerçek gözlemi veya ışık kirliliğini ölçmez.',11,false,true)}
     {plan&&txt('En uygun saat: '+time(plan.time)+' · Ay ışığı %'+plan.moonlight+(plan.optical!==null?' · Pus göstergesi '+plan.optical.toFixed(2):''),12,true)}
     {button('✦ Bu gece nereye bakayım?',()=>setScreen('observation'))}
     {button('☽ Gökyüzüne tut',()=>setScreen('lens'),true)}
   </>,{marginTop:15})}
   {current&&daily&&panel(<>
     <View ref={shareCardRef} collapsable={false} style={{padding:20,borderRadius:20,backgroundColor:dark?'#211A45':'#F6E5DF',minHeight:190}}>
       <Text style={{color:p.accent,fontSize:25,fontFamily:'serif'}}>☾ Gökyüzünün Sesi ✦</Text>
       <Text style={{color:p.text,fontSize:17,marginTop:10}}>{place?.name||'Gökyüzü'} · {new Date(now).toLocaleDateString('tr-TR')}</Text>
       <Text style={{color:p.text,fontSize:30,marginTop:10}}>{symbol(current.weather_code,dark)} {num(current.temperature_2m)}°  ·  {label(current.weather_code)}</Text>
       <Text style={{color:p.sub,fontSize:14,marginTop:10}}>☾ {astronomy.phaseName} · %{astronomy.illuminated} aydınlık    ☂ Yağış %{num(rainChance)}</Text>
     </View>
     {button('↗ Günün görsel kartını paylaş',()=>void shareDayCard())}
   </>,{marginTop:15})}
  </>}
  {screen==='sky'&&<>
    {panel(<>
      <View style={{alignItems:'center'}}>
        {txt('✦  Ayın Bugünkü Hâli',22,true)}
        <MoonDisc night={dark} phaseName={astronomy.phaseName} illuminated={astronomy.illuminated} size={135}/>
        {txt(astronomy.phaseName,23,true)}
        {txt('%'+astronomy.illuminated+' aydınlık',14,false,true)}
        {txt('Hesaplanan an: '+new Date(astronomy.date).toLocaleString('tr-TR'),11,false,true)}
      </View>
      {daily?<View style={styles.facts}>{fact('🌅','Gün doğumu',time(rise))}{fact('🌇','Gün batımı',time(set))}{fact('☀️','UV endeksi',num(daily.uv_index_max[0]))}{fact(symbol(daily.weather_code[0],dark),'Hava',label(daily.weather_code[0]))}</View>:null}
    </>)}
    {panel(<>
      {txt('🪐 Gezegen Takvimi',22,true)}
      {txt('Dünya merkezli ekliptik boylam, tropikal zodyak. Bir gezegene dokunarak hesaplanan ayrıntıları aç.',12,false,true)}
      {astronomy.bodies.map(body=><Pressable key={body.name} accessibilityRole="button" onPress={()=>setSelectedPlanet(selectedPlanet===body.name?null:body.name)}
        style={[styles.forecast,{borderColor:p.line}]}>
        <View style={[styles.planetOrb,{backgroundColor:p.hero,borderColor:p.line}]}><Text style={{fontSize:25,color:p.accent}}>{body.icon}</Text></View>
        <View style={{flex:1}}>
          {txt(body.name,16,true)}{txt(body.sign+' · '+body.degree.toFixed(1)+'°',13,false,true)}
          {selectedPlanet===body.name&&txt('Ekliptik boylam: '+body.longitude.toFixed(2)+'°. Bu astronomik koordinattır; görünürlük hava koşullarına bağlıdır.',12)}
        </View>{txt(selectedPlanet===body.name?'⌄':'›',22,true)}
      </Pressable>)}
      {button('🔄 Konumları güncelle',()=>setNow(Date.now()),true)}
      {button('☾ Ay takvimini aç',()=>setScreen('moon'),true)}
      {button('✧ Gök olayları takvimi',()=>setScreen('events'),true)}
      {button('✦ Gözlem planımı gör',()=>setScreen('observation'),true)}
      {button('✦ Gökyüzüne tut',()=>setScreen('lens'),true)}
    </>,{marginTop:15})}
  </>}
  {screen==='moon'&&panel(<>
    {txt('☾ Ay Takvimi',23,true)}{txt('Önümüzdeki 21 gün · astronomik Ay evreleri',12,false,true)}
    {moonDays.map(day=><View key={day.key} style={[styles.forecast,{borderColor:p.line}]}><Text style={{color:p.accent,fontSize:24}}>☾</Text><View style={{flex:1,marginLeft:10}}>{txt(day.date,15,true)}{txt(day.name,12,false,true)}</View>{txt('%'+day.lit,15,true)}</View>)}
  </>)}
  {screen==='lens'&&panel(<>
    {txt('✦ Gökyüzüne Tut',22,true)}
    {place&&LensComponent?<LensComponent latitude={place.latitude} longitude={place.longitude} place={place.name} dark={dark}/>:txt(lensError||'Konum ve kamera görünümü hazırlanıyor.',14)}
  </>)}
  {screen==='cards'&&panel(<CardReadings p={p}/>)}
  {screen==='compass'&&panel(<Compass p={p} targets={plan?.targets}/>)}
  {screen==='observation'&&<>{panel(<>
    {txt('✦ Bu Gece Nereye Bakayım?',22,true)}
    {!plan?txt('Konum ve gece hava tahmini bekleniyor. Tahmin gelince gözlem planı burada görünecek.',13,false,true):<>
     {txt(place?.name+' · '+new Date(plan.instant).toLocaleString('tr-TR',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}),15,true)}
     {txt('Gözlem puanı %'+plan.score+' · Bulut %'+num(plan.cloud)+' · Yağış %'+num(plan.rain)+' · Ay ışığı %'+plan.moonlight,13,false,true)}
     {plan.optical!==null&&txt('Pus göstergesi '+plan.optical.toFixed(2)+'; yüksek değer görüşü azaltabilir.',12,false,true)}
     {plan.targets.length?plan.targets.map(target=><View key={target.name} style={[styles.forecast,{borderColor:p.line}]}><Text style={{color:p.accent,fontSize:27}}>{target.icon}</Text><View style={{flex:1}}>{txt(target.name,16,true)}{txt(target.direction+' · '+target.azimuth+'° yön · ufuktan '+target.altitude+'° yukarı',12,false,true)}</View></View>):txt('Bu saatte Ay ve listelenen parlak gezegenler ufkun yeterince üzerinde değil.',13,false,true)}
     {button(voiceLoading==='observation'?'Ses hazırlanıyor…':activeVoice==='observation'?'■ Rehberi durdur':'▶ Sesli gözlem rehberini dinle',()=>void playObservation())}
     {button('☷ Gözlem saatini takvim dosyası olarak paylaş',()=>void shareObservationCalendar(),true)}
     {button('✦ Gökyüzüne tut',()=>setScreen('lens'),true)}
     {button('⊕ Pusulayı aç',()=>setScreen('compass'),true)}
     {txt('Pusula yönü yaklaşık değerdir. Hava tahmini ve ışık kirliliği gerçek gözlemi değiştirebilir.',11,false,true)}
    </>}
  </>)}{panel(<>
    {txt('☾ Gece Havası',20,true)}
    {plan?.aqi!==null&&plan?.aqi!==undefined?txt('Avrupa hava kalitesi endeksi: '+num(plan.aqi),13,true):txt(airError?'Hava kalitesi servisine ulaşılamadı.':'Bu saat için hava kalitesi verisi bekleniyor veya bulunamadı.',12,false,true)}
    {plan?.pm25!==null&&plan?.pm25!==undefined&&txt('PM2.5: '+plan.pm25.toFixed(1)+' µg/m³',12)}
    {txt('Hava kalitesi ölçüsü ve pus tahmini farklı verilerdir. Kaynak: Open-Meteo / CAMS.',11,false,true)}
  </>,{marginTop:15})}</>}
  {screen==='events'&&panel(<>
    {txt('✧ Gök Olayları Takvimi',22,true)}
    {txt('Ay evreleri hesaplanır; meteor geceleri 2026–2027 American Meteor Society takvimindeki beklenen zirvelerdir. Görünürlük bulunduğun yere ve havaya bağlıdır.',12,false,true)}
    {events.slice(0,18).map(event=><View key={event.id} style={[styles.forecast,{borderColor:p.line}]}><Text style={{fontSize:26,color:p.accent}}>{event.title.includes('Ay')?'☾':'✦'}</Text><View style={{flex:1}}>{txt(event.title,15,true)}{txt(new Date(event.instant).toLocaleString('tr-TR',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}),12,false,true)}{txt(event.detail+' Kaynak: '+event.source,11,false,true)}</View></View>)}
  </>)}
  {screen==='zodiac'&&<>
    {panel(<>
      {txt('✧ Burç Çarkı',24,true)}
      {txt('Burcunu seçmek için sembolüne dokun.',13,false,true)}
      <ZodiacWheel night={dark} active={Math.max(0,SIGNS.indexOf(sign))} onSelect={i=>setSign(SIGNS[i])}/>
      <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
        <Text style={{color:p.accent,fontSize:42}}>{ICONS[SIGNS.indexOf(sign)]}</Text>
        <View style={{flex:1}}>{txt(sign,26,true)}{txt('Günlük sembolik yorum',12,false,true)}</View>
      </View>
    </>)}
    {panel(<>
      {txt(sign+' · Günün Gökyüzü',20,true)}
      <View style={{marginTop:12}}>{txt(symbolicReading(sign,astronomy),15)}</View>
      {button(voiceLoading==='astrology'?'⏳ Ses hazırlanıyor…':activeVoice==='astrology'?'■ Durdur':'▶ Astroloji yorumunu dinle',()=>void playVoice('astrology'))}
      {voiceLoading==='astrology'&&<ActivityIndicator color={p.accent}/>}
      {button('🪐 Gezegen konumlarını gör',()=>setScreen('sky'),true)}
      <View style={{marginTop:10}}>{txt('Astrolojik semboller bilimsel kişisel öngörü değildir.',11,false,true)}</View>
    </>,{marginTop:15})}
  </>}
  {screen==='journal'&&<>
    {panel(<>
      {txt('✎ Gökyüzü Günlüğüm',23,true)}
      {txt('Bugün nasıl hissediyorsun? Notlar yalnızca bu cihazda saklanır.',12,false,true)}
      <View style={styles.moodRow}>{['Sakin','Neşeli','Düşünceli','Yorgun'].map(m=><Pressable accessibilityRole="button" key={m} onPress={()=>setMood(m)} style={[styles.moodChip,{backgroundColor:mood===m?p.accent:p.input}]}><Text style={{color:mood===m?p.button:p.text,fontSize:12}}>{m}</Text></Pressable>)}</View>
      <TextInput multiline maxLength={500} value={journalText} onChangeText={setJournalText} placeholder="Gökyüzüne bakınca bugün neler düşündün?" placeholderTextColor={p.sub} style={[styles.journalInput,{backgroundColor:p.input,color:p.text,borderColor:p.line}]}/>
      {photoCameraOpen&&CameraComponent?<View style={{height:350,marginTop:12,overflow:'hidden',borderRadius:18}}><CameraComponent ref={cameraRef} style={{flex:1}} facing="back"/>{button('📷 Fotoğrafı çek',()=>void takeJournalPhoto())}{button('Vazgeç',()=>setPhotoCameraOpen(false),true)}</View>:button('📷 Gökyüzünün fotoğrafını ekle',()=>void openJournalCamera(),true)}
      {journalPhoto&&<View><Image source={{uri:journalPhoto}} style={{width:'100%',height:180,borderRadius:16,marginTop:12}}/>{button('Fotoğrafı kaldır',()=>{try{new File(journalPhoto).delete();}catch{}setJournalPhoto(null);},true)}</View>}
      {button('✦ Günlüğüme kaydet',saveEntry)}
    </>)}
    {journal.map(entry=><View key={entry.id}>{panel(<>
      <View style={styles.sectionHeading}>{txt(entry.date+' · '+entry.mood,15,true)}<Pressable accessibilityRole="button" accessibilityLabel="Günlük kaydını sil" onPress={()=>Alert.alert('Kaydı sil','Bu günlük notunu silmek istiyor musun?', [{text:'Vazgeç',style:'cancel'},{text:'Sil',style:'destructive',onPress:()=>{if(entry.photoUri)try{new File(entry.photoUri).delete();}catch{}setJournal(prev=>prev.filter(e=>e.id!==entry.id));}}])}><Text style={{color:p.accent,fontSize:16}}>✕</Text></Pressable></View>
      {txt(entry.place+' · '+entry.sky,12,false,true)}
      {entry.photoUri&&<Image source={{uri:entry.photoUri}} style={{width:'100%',height:210,borderRadius:16,marginTop:10}}/>}
      <View style={{marginTop:8}}>{txt(entry.note,14)}</View>
    </>,{marginTop:12})}</View>)}
  </>}
  {screen==='settings'&&<>{panel(<>{txt('⌖ Konum ve şehir',22,true)}{txt(place?(locationMode==='gps'?'GPS konumu · ':'Seçilen şehir · ')+place.name+' · '+place.latitude.toFixed(3)+', '+place.longitude.toFixed(3):'Konum bekleniyor',12,false,true)}<View style={styles.search}><TextInput value={query} onChangeText={value=>{setQuery(value);setCityResults([]);}} onSubmitEditing={()=>void searchCity()} returnKeyType="search" placeholder="İstanbul, Ankara, İzmir..." placeholderTextColor={p.sub} style={[styles.input,{backgroundColor:p.input,color:p.text,borderColor:p.line}]}/><Pressable accessibilityRole="button" style={[styles.go,{backgroundColor:p.accent,opacity:busy?.6:1}]} onPress={()=>void searchCity()} disabled={busy}><Text style={{color:p.button,fontWeight:'800'}}>Ara</Text></Pressable></View>{button('⌖ GPS konumumu kullan',()=>void locate(),true)}{!!locationStatus&&txt(locationStatus,12,false,true)}{cityResults.map((result,index)=><Pressable key={result.name+'-'+result.latitude+'-'+index} accessibilityRole="button" onPress={()=>void selectCity(result)} style={[styles.forecast,{borderColor:p.line,paddingHorizontal:8,backgroundColor:p.input,borderRadius:12}]}><Text style={{color:p.text,flex:1,fontWeight:'700'}}>{result.name}{result.admin1&&result.admin1!==result.name?', '+result.admin1:''}{result.country?', '+result.country:''}</Text><Text style={{color:p.accent}}>Seç ›</Text></Pressable>)}</>,{marginBottom:15})}{panel(<>
   {txt('☆ Favori Şehirler',20,true)}
   {txt('Seçili şehrin hava durumuna tek dokunuşla dön.',12,false,true)}
   {place&&button(favorites.some(x=>Math.abs(x.latitude-place.latitude)<.001&&Math.abs(x.longitude-place.longitude)<.001)?'★ Favorilerden çıkar':'☆ '+place.name+' şehrini ekle',toggleFavorite,true)}
   {favorites.map(city=><View key={city.latitude+':'+city.longitude} style={[styles.forecast,{borderColor:p.line}]}><Pressable accessibilityRole="button" style={{flex:1}} onPress={()=>{locationActionRef.current++;void load(city,'city').then(ok=>{if(ok){setLocationStatus(city.name+' seçildi.');setScreen('weather');}});}}>{txt('⌖ '+city.name,14,true)}{txt('Hava durumunu aç  ›',11,false,true)}</Pressable><Pressable accessibilityRole="button" accessibilityLabel={city.name+' favorisini kaldır'} onPress={()=>setFavorites(prev=>prev.filter(x=>x.latitude!==city.latitude||x.longitude!==city.longitude))}><Text style={{color:p.accent,fontSize:18}}>✕</Text></Pressable></View>)}
  </>,{marginBottom:15})}{panel(<>{txt('⚙️ Görünüm',22,true)}{txt('Otomatik tema, seçili konumun güneş doğuş ve batış saatlerini izler.',13,false,true)}<View style={styles.nav}>{(['auto','day','night'] as const).map((v)=><Pressable key={v} onPress={()=>setTheme(v)} style={[styles.navItem,{backgroundColor:theme===v?p.accent:p.input}]}><Text style={{color:theme===v?p.button:p.text,fontWeight:'800'}}>{v==='auto'?'Otomatik':v==='day'?'☀️ Gündüz':'🌙 Gece'}</Text></Pressable>)}</View></>)}{panel(<>{txt('🎙️ Seslendirme',22,true)}<View style={styles.switchRow}>{txt('Sesli rehber',15)}<Switch value={voiceEnabled} onValueChange={setVoiceEnabled}/></View>{txt('Hava durumu ve astroloji için ayrı Türkçe ses profilleri kullanılır. Kadın ses profili doğrulanamazsa oynatma durur; cihazın erkek sesine geçilmez.',12,false,true)}{voiceProfiles&&txt('Hava sesi: '+(voiceProfiles.weather==='female'?'kadın etiketi doğrulandı':voiceProfiles.weather==='female-description-unverified'?'kadın ses açıklaması; dinleyerek kontrol et':'ses doğrulanamadı')+' · Astroloji sesi: '+(voiceProfiles.astrology==='female'?'kadın etiketi doğrulandı':voiceProfiles.astrology==='female-description-unverified'?'kadın ses açıklaması; dinleyerek kontrol et':'ses doğrulanamadı'),12,false,true)}{txt('Anlatım uzunluğu',14,true)}<View style={styles.moodRow}>{(['brief','full'] as const).map(v=><Pressable key={v} accessibilityRole="button" onPress={()=>setVoiceDuration(v)} style={[styles.moodChip,{backgroundColor:voiceDuration===v?p.accent:p.input}]}><Text style={{color:voiceDuration===v?p.button:p.text}}>{v==='brief'?'Kısa özet':'Tam anlatım'}</Text></Pressable>)}</View>{txt('Ses temposu',14,true)}<View style={styles.moodRow}>{(['normal','calm'] as const).map(v=><Pressable key={v} accessibilityRole="button" onPress={()=>setVoicePace(v)} style={[styles.moodChip,{backgroundColor:voicePace===v?p.accent:p.input}]}><Text style={{color:voicePace===v?p.button:p.text}}>{v==='calm'?'Sakin, yavaş':'Normal'}</Text></Pressable>)}</View>{txt('Dinleme saatini aşağıdaki günlük hatırlatma bölümünden seçebilirsin. Ses yalnızca dinle düğmesine bastığında çalar.',12,false,true)}{button(voiceLoading==='weather'?'⏳ Ses hazırlanıyor…':activeVoice==='weather'?'■ Hava sesini durdur':'▶ Hava sesini dene',()=>void playVoice('weather'))}{button(voiceLoading==='astrology'?'⏳ Ses hazırlanıyor…':activeVoice==='astrology'?'■ Astroloji sesini durdur':'▶ Astroloji sesini dene',()=>void playVoice('astrology'),true)}</>,{marginTop:15})}{panel(<>{txt('⏰ Hatırlatma tercihi',22,true)}{txt('Seçtiğin saatte günlük yerel hatırlatma gönderilir. Bildirim yeni hava verisi değil, uygulamayı açma hatırlatmasıdır.',13,false,true)}<View style={styles.search}><TextInput keyboardType="number-pad" maxLength={2} accessibilityLabel="Saat" value={hour} onChangeText={setHour} style={[styles.timeInput,{backgroundColor:p.input,color:p.text}]}/>{txt(':',24,true)}<TextInput keyboardType="number-pad" maxLength={2} accessibilityLabel="Dakika" value={minute} onChangeText={setMinute} style={[styles.timeInput,{backgroundColor:p.input,color:p.text}]}/></View>{button(notificationActive?'Hatırlatma saatini güncelle':'Günlük bildirimi aç',()=>{void (async()=>{if(!/^\d{1,2}$/.test(hour)||!/^\d{1,2}$/.test(minute)||Number(hour)>23||Number(minute)>59){Alert.alert('Geçersiz saat','00:00–23:59 arasında bir saat gir.');return;}try{await setDailyNotification(Number(hour),Number(minute));setHour(hour.padStart(2,'0'));setMinute(minute.padStart(2,'0'));setNotificationActive(true);Alert.alert('Bildirim kuruldu', 'Her gün '+hour.padStart(2,'0')+':'+minute.padStart(2,'0')+' saatinde hatırlatma planlandı.');}catch(e){Alert.alert('Bildirim açılamadı',e instanceof Error?e.message:'Bildirim iznini kontrol et.');}})();})}
  {notificationActive&&button('Bildirimleri kapat',()=>{void stopDailyNotification().then(()=>{setNotificationActive(false);Alert.alert('Kapatıldı','Günlük hatırlatma iptal edildi.');}).catch(()=>Alert.alert('Hata','Bildirim kaldırılamadı.'));},true)}</>,{marginTop:15})}{panel(<>
   {txt('☂ Akıllı Hava Uyarıları',21,true)}
   {txt('Uygulama açıldığında güncel tahmine bakıp önümüzdeki 36 saat için yerel uyarı planlar. Hava değişirse uygulamayı yeniden açman gerekir; sesli bildirim değildir.',12,false,true)}
   <View style={styles.search}><View style={{flex:1}}>{txt('Yağış ≥ %',12,false,true)}<TextInput keyboardType="number-pad" maxLength={3} value={rainThreshold} onChangeText={setRainThreshold} style={[styles.timeInput,{width:'100%',backgroundColor:p.input,color:p.text}]}/></View><View style={{flex:1}}>{txt('Sıcaklık ≤ °C',12,false,true)}<TextInput keyboardType="numbers-and-punctuation" maxLength={3} value={coldThreshold} onChangeText={setColdThreshold} style={[styles.timeInput,{width:'100%',backgroundColor:p.input,color:p.text}]}/></View></View>
   {button(alertEnabled?'Uyarıları yeniden planla':'Hava uyarılarını aç',()=>void enableAlerts())}
   {alertEnabled&&button('Hava uyarılarını kapat',()=>{void stopWeatherAlerts().then(()=>{setAlertEnabled(false);setAlertStatus('Uyarılar kapatıldı.');}).catch(e=>Alert.alert('Uyarı kapatılamadı',String(e)));},true)}
   {!!alertStatus&&txt(alertStatus,12,false,true)}
  </>,{marginTop:15})}</>}
  {busy&&<ActivityIndicator color={p.accent} style={{marginTop:16}}/>}
  <Text style={{color:p.sub,textAlign:'center',fontSize:11,marginTop:25}}>Hava verileri: Open-Meteo · Astroloji notları eğlence amaçlıdır.</Text>
 </ScrollView></SafeAreaView>;
}
export default function App(){return <SafeAreaProvider><Root/></SafeAreaProvider>;}
const styles=StyleSheet.create({
 page:{paddingHorizontal:14,paddingTop:8,paddingBottom:44},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,paddingBottom:5},headerAction:{width:38,height:38,borderRadius:24,borderWidth:1,alignItems:'center',justifyContent:'center'},planetStrip:{flexDirection:'row',justifyContent:'space-around',marginTop:12,gap:5,position:'relative'},planetLine:{position:'absolute',top:23,left:25,right:25,height:1},miniPlanet:{flex:1,alignItems:'center',gap:4},planetOrb:{width:47,height:47,borderWidth:1,borderRadius:25,alignItems:'center',justifyContent:'center'},zodiacWheel:{marginTop:15,alignSelf:'center',width:'100%',maxWidth:290,aspectRatio:1,borderWidth:2,borderColor:'#CDA77D',borderRadius:150,padding:18,justifyContent:'center'},wheelGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:7},wheelSign:{width:'29%',height:48,borderRadius:13,alignItems:'center',justifyContent:'center'},nav:{flexDirection:'row',gap:4,marginTop:16,marginBottom:10,borderWidth:1,borderRadius:35,padding:5},navItem:{flex:1,paddingVertical:12,paddingHorizontal:2,borderRadius:28,alignItems:'center'},hero:{borderRadius:20,minHeight:185,flexDirection:'row',justifyContent:'space-between',paddingTop:12,paddingBottom:8},panel:{borderWidth:1,borderRadius:24,padding:15},button:{paddingVertical:15,borderRadius:15,alignItems:'center',marginTop:15},search:{flexDirection:'row',alignItems:'center',gap:9,marginTop:13},input:{flex:1,minWidth:0,borderWidth:1,borderRadius:14,padding:12,fontSize:14},go:{paddingVertical:14,paddingHorizontal:17,borderRadius:14},facts:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:15},fact:{width:'48%',flexGrow:1,borderWidth:1,borderRadius:18,padding:14,gap:3},forecast:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:14,borderBottomWidth:1},signs:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:17},sign:{width:'31%',flexGrow:1,alignItems:'center',borderRadius:15,paddingVertical:14,gap:4},switchRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginVertical:12},sectionHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},heroLeft:{flex:1,alignItems:'flex-start'},heroRight:{width:'37%',alignItems:'flex-start',gap:2},zodiacRow:{flexDirection:'row',gap:9,marginTop:12},wheelPanel:{width:'48%',borderWidth:1,borderRadius:23,alignItems:'center',justifyContent:'center',overflow:'hidden'},zodiacPanel:{flex:1,borderWidth:1,borderRadius:23,padding:12,minHeight:185},voiceBanner:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:24,borderWidth:1,marginTop:12},playIcon:{height:43,width:43,borderRadius:24,alignItems:'center',justifyContent:'center'},bottomRow:{flexDirection:'row',gap:9,marginTop:12},weatherTile:{flex:1,minWidth:0,borderWidth:1,borderRadius:22,padding:12},adviceButton:{borderRadius:16,paddingVertical:9,paddingHorizontal:7,alignItems:'center'},hourTile:{width:76,borderWidth:1,borderRadius:15,padding:9,alignItems:'center'},moodRow:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:15},moodChip:{borderRadius:16,paddingVertical:10,paddingHorizontal:12},journalInput:{borderWidth:1,borderRadius:14,minHeight:100,textAlignVertical:'top',padding:12,marginTop:14,fontSize:14},timeInput:{width:66,textAlign:'center',fontSize:23,fontWeight:'800',borderRadius:12,padding:10}
});
