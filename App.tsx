import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, BackHandler, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { getVoiceAudio, getVoiceProfileStatus, getObservationAudio, getCardAudio, getDailyBriefAudio } from './cloudVoice';
import { File, Paths } from 'expo-file-system';
import type { CameraView } from 'expo-camera';
import type { VoiceProfile } from './voiceConfig';
import { skyAt, symbolicReading } from './astronomy';
import { skyViewingWindows, moonCalendar } from './skyDiscovery';
import {observationPlan,skyEvents,type AirForecast} from './observationPlan';
import { CardReadings } from './CardReadings';
import { ActivityPlanner } from './ActivityPlannerScreen';
import { SkyEvents } from './SkyEvents';
import { BirthChart } from './BirthChartScreen';
import { FortuneCookie } from './FortuneCookie';
import { RabbitFortune } from './RabbitFortune';
import {rainWindows,upcomingSignTransitions,localForecastTime} from './skyInsights';
import {snapshotForecast,forecastChanges,fetchEnsembleSpread,type EnsembleSpread,type ForecastSnapshot} from './forecastIntelligence';
import { Compass } from './Compass';
import { MoonDisc, SkyAtmosphere, SunDisc, ZodiacWheel } from './CelestialVisuals';
import { dailyNotificationEnabled, setDailyNotification, stopDailyNotification, scheduleWeatherAlerts, stopWeatherAlerts, notifyGpsUpdated, enableForecastChangeAlerts, notifyForecastChange } from './notifications';

type Place = { name: string; latitude: number; longitude: number };
type CityResult={name:string;country?:string;admin1?:string;latitude:number;longitude:number};
type Screen='weather'|'sky'|'zodiac'|'journal'|'settings'|'moon'|'lens'|'cards'|'observation'|'events'|'compass'|'planner'|'birth'|'cookie'|'rabbit';
type JournalEntry={id:string;date:string;place:string;mood:string;note:string;sky:string;photoUri?:string;target?:string;observedAt?:number;latitude?:number;longitude?:number};
type Weather = {
 utc_offset_seconds?: number;
 current: { temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; wind_speed_10m: number; weather_code: number; is_day: number };
 daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[]; sunrise: string[]; sunset: string[]; uv_index_max: number[] };
 hourly:{time:string[];precipitation_probability:number[];temperature_2m:number[];weather_code:number[];cloud_cover:number[];visibility:number[];wind_speed_10m:number[]};
};
const SIGNS = ['KoÃ§','BoÄŸa','Ä°kizler','YengeÃ§','Aslan','BaÅŸak','Terazi','Akrep','Yay','OÄŸlak','Kova','BalÄ±k'];
const ICONS = ['â™ˆ','â™‰','â™Š','â™‹','â™Œ','â™','â™','â™','â™','â™‘','â™’','â™“'];
const NOTES = ['BugÃ¼n Ã¶nceliklerini sakinlikle seÃ§.','KÃ¼Ã§Ã¼k bir adÄ±m iÃ§in kendine alan aÃ§.','Merak ettiÄŸin bir konuya zaman ayÄ±r.','Sevdiklerinle baÄŸ kur.','YaratÄ±cÄ± fikrini paylaÅŸ.','Detaylarla uÄŸraÅŸÄ±rken dinlenmeyi unutma.','KararlarÄ±nda dengeyi gÃ¶zet.','DÃ¼ÅŸÃ¼ncelerini yazÄ±ya dÃ¶k.','Yeni bir ÅŸey Ã¶ÄŸren.','Hedeflerin iÃ§in kÃ¼Ã§Ã¼k bir plan yap.','FarklÄ± bir fikre kulak ver.','Hayal gÃ¼cÃ¼nÃ¼ somut bir adÄ±mla birleÅŸtir.'];
const PALETTE = {
 day: { bg:'#F3D8D8',panel:'rgba(255,250,246,0.83)',hero:'rgba(255,244,237,0.08)',text:'#382849',sub:'#695674',accent:'#795185',line:'rgba(146,104,150,0.40)',input:'rgba(255,255,255,0.76)',button:'#FFF9ED' },
 night: { bg:'#100F2B',panel:'rgba(21,17,55,0.82)',hero:'rgba(22,15,49,0.03)',text:'#FFF2E8',sub:'#E0D1EF',accent:'#F5D8A7',line:'rgba(211,171,227,0.54)',input:'rgba(65,48,88,0.82)',button:'#281C44' }
};
function label(code:number) { if(code>=95)return 'GÃ¶k gÃ¼rÃ¼ltÃ¼lÃ¼ yaÄŸÄ±ÅŸ'; if(code>=71&&code<=77||code>=85&&code<=86)return 'KarlÄ±'; if(code>=51&&code<=67||code>=80&&code<=82)return 'YaÄŸmurlu'; if(code>=45&&code<=48)return 'Sisli'; if(code>=3)return 'Bulutlu'; if(code>=1)return 'ParÃ§alÄ± bulutlu'; return 'AÃ§Ä±k'; }
function symbol(code:number,dark:boolean){ if(code>=95)return 'â›ˆï¸'; if(code>=71&&code<=77||code>=85&&code<=86)return 'â„ï¸'; if(code>=51&&code<=67||code>=80&&code<=82)return 'ğŸŒ§ï¸'; if(code>=45&&code<=48)return 'ğŸŒ«ï¸'; if(code>=1&&code<=3)return 'â˜ï¸'; return dark?'ğŸŒ™':'â˜€ï¸'; }
const time=(s?:string)=>s?.split('T')[1]?.slice(0,5)||'â€”';
const num=(n?:number)=>Number.isFinite(n)?String(Math.round(n!)):'â€”';
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
 const lastGpsRef=useRef<Place|null>(null);
 const lastGpsNoticeRef=useRef(0);
 const [query,setQuery]=useState('');
 const [cityResults,setCityResults]=useState<CityResult[]>([]);
 const [locationStatus,setLocationStatus]=useState('');
 const [locationNotice,setLocationNotice]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [speaking,setSpeaking]=useState(false);
 const [voiceLoading,setVoiceLoading]=useState<VoiceProfile|'observation'|'brief'|null>(null);
 const [changeAlertsEnabled,setChangeAlertsEnabled]=useState(false);
 const changeAlertsRef=useRef(false);
 const [forecastChangeMessage,setForecastChangeMessage]=useState('');
 const [ensemble,setEnsemble]=useState<EnsembleSpread|null>(null);
 const [ensembleStatus,setEnsembleStatus]=useState('');
 const [activeVoice,setActiveVoice]=useState<VoiceProfile|'observation'|'brief'|null>(null);
 const voiceRequestId=useRef(0);
 const player=useAudioPlayer(null);
 const playback=useAudioPlayerStatus(player);
 const [voiceEnabled,setVoiceEnabled]=useState(true);
 const [voiceProfiles,setVoiceProfiles]=useState<Record<VoiceProfile,string>|null>(null);
 const [sign,setSign]=useState('KoÃ§');
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
 const [journalTarget,setJournalTarget]=useState('');
 const [journalPhoto,setJournalPhoto]=useState<string|null>(null);
 const [photoCameraOpen,setPhotoCameraOpen]=useState(false);
 const [photoCameraReady,setPhotoCameraReady]=useState(false);
 const [photoCapturing,setPhotoCapturing]=useState(false);
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
  import('./SkyLens').then(mod=>{if(active)setLensComponent(()=>mod.SkyLens);}).catch(()=>{if(active)setLensError('Kamera gÃ¶rÃ¼nÃ¼mÃ¼ bu Expo Go sÃ¼rÃ¼mÃ¼nde aÃ§Ä±lamadÄ±. SDK 58 uyumlu Expo Go veya geliÅŸtirme derlemesini kullan.');});
  return()=>{active=false;};
 },[screen,LensComponent]);
 useEffect(()=>{AsyncStorage.multiGet(['sky.place','sky.settings','sky.locationMode','sky.favorites','sky.journal']).then(values=>{
  const savedPlace=values[0][1],saved=values[1][1];
  if(savedPlace){const p=JSON.parse(savedPlace) as Place;if(Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)){bootPlaceRef.current=p;setPlace(p);}}
  setLocationMode(values[2][1]==='city'?'city':'gps');
  if(saved){const s=JSON.parse(saved);setVoiceEnabled(s.voiceEnabled??true);setSign(s.sign??'KoÃ§');setHour(s.hour??'08');setMinute(s.minute??'00');setTheme(s.theme??'auto');setRainThreshold(s.rainThreshold??'60');setColdThreshold(s.coldThreshold??'5');setAlertEnabled(s.alertEnabled??false);changeAlertsRef.current=!!s.changeAlertsEnabled;setChangeAlertsEnabled(!!s.changeAlertsEnabled);setVoiceDuration(s.voiceDuration==='brief'?'brief':'full');setVoicePace(s.voicePace==='calm'?'calm':'normal');}
  if(values[3][1])setFavorites(JSON.parse(values[3][1]));
  if(values[4][1])setJournal(JSON.parse(values[4][1]));
 }).catch(()=>{}).finally(()=>setHydrated(true));},[]);
 useEffect(()=>{if(hydrated)AsyncStorage.setItem('sky.settings',JSON.stringify({voiceEnabled,sign,hour,minute,theme,rainThreshold,coldThreshold,alertEnabled,changeAlertsEnabled,voiceDuration,voicePace})).catch(()=>{});},[hydrated,voiceEnabled,sign,hour,minute,theme,rainThreshold,coldThreshold,alertEnabled,changeAlertsEnabled,voiceDuration,voicePace]);
 useEffect(()=>{if(hydrated)AsyncStorage.setItem('sky.favorites',JSON.stringify(favorites)).catch(()=>{});},[hydrated,favorites]);
 useEffect(()=>{if(hydrated)AsyncStorage.setItem('sky.journal',JSON.stringify(journal)).catch(()=>{});},[hydrated,journal]);
 const load=useCallback(async(p:Place,source:'gps'|'city'='city'):Promise<boolean>=>{
  const loadId=++loadIdRef.current;
  setBusy(true);setError('');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
  try{
   const args=new URLSearchParams({latitude:String(p.latitude),longitude:String(p.longitude),current:'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day',hourly:'temperature_2m,precipitation_probability,weather_code,cloud_cover,visibility,wind_speed_10m',daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max',timezone:'auto',forecast_days:'5'});
   const response=await fetch('https://api.open-meteo.com/v1/forecast?'+args,{signal:controller.signal});
   if(!response.ok)throw new Error('Hava servisine baÄŸlanÄ±lamadÄ±.');
   const data=await response.json() as Weather;
   if(!data.current||!data.daily?.sunrise?.length||!data.hourly?.time?.length)throw new Error('Bu yer iÃ§in tahmin bulunamadÄ±.');
   if(loadId!==loadIdRef.current)return false;
   const fetchedAt=Date.now();
   const fresh=snapshotForecast(data,p.latitude,p.longitude,fetchedAt);
   const raw=await AsyncStorage.getItem('sky.forecast.snapshot').catch(()=>null);
   let previous:ForecastSnapshot|null=null;
   try{if(raw)previous=JSON.parse(raw) as ForecastSnapshot;}catch{}
   if(loadId!==loadIdRef.current)return false;
   const changes=forecastChanges(previous,fresh);
   setWeather(data);setPlace(p);setLocationMode(source);lastFetchRef.current=fetchedAt;setUpdated(new Date(fetchedAt).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}));
   setEnsemble(null);setEnsembleStatus('');
   await AsyncStorage.multiSet([['sky.place',JSON.stringify(p)],['sky.locationMode',source],['sky.forecast.snapshot',JSON.stringify(fresh)]]);
   if(changes.length){setForecastChangeMessage(changes.join(' '));if(changeAlertsRef.current)void notifyForecastChange(p.name,changes[0]).catch(()=>{});}
   return true;
  }catch(e){if(loadId===loadIdRef.current)setError(controller.signal.aborted?'Hava tahmini sunucusu zaman aÅŸÄ±mÄ±na uÄŸradÄ±. Tekrar dene.':e instanceof Error?e.message:'Hava bilgisi alÄ±namadÄ±.');return false;}
  finally{clearTimeout(timer);if(loadId===loadIdRef.current)setBusy(false);}
 },[]);
 const locate=useCallback(async(manual=false)=>{
  const action=++locationActionRef.current;
  setBusy(true);setError('');
  try{
   const permission=await Location.requestForegroundPermissionsAsync();
   if(!permission.granted){setError('Konum izni verilmedi. Telefon ayarlarÄ±ndan izin ver veya aÅŸaÄŸÄ±dan ÅŸehir ara.');return;}
   if(!await Location.hasServicesEnabledAsync()){setError('Telefonun konum servisi kapalÄ±. GPSâ€™i aÃ§ veya aÅŸaÄŸÄ±dan ÅŸehir ara.');return;}
   setLocationStatus('GPS konumu aranÄ±yorâ€¦');
   const cached=await Location.getLastKnownPositionAsync({maxAge:15*60_000,requiredAccuracy:20_000}).catch(()=>null);
   let pos=cached;
   if(!pos){
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{pos=await Promise.race([Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('GPS konumu zaman aÅŸÄ±mÄ±na uÄŸradÄ±.')),15000);})]);}
    finally{if(timer)clearTimeout(timer);}
   }
   const {latitude,longitude}=pos.coords;
   let name='Konumum';
   // A failing geocoder must never prevent an otherwise valid GPS fix from loading weather.
   let nameTimer:ReturnType<typeof setTimeout>|undefined;
   try{
    const addresses=await Promise.race([Location.reverseGeocodeAsync({latitude,longitude}),new Promise<never>((_,reject)=>{nameTimer=setTimeout(()=>reject(new Error('Yer adÄ± zaman aÅŸÄ±mÄ±')),4000);})]);
    const a=addresses[0];name=(a?.city?.includes('KÃ¶yÃ¼')?a?.region:a?.city)||a?.region||a?.subregion||name;
   }catch{}finally{if(nameTimer)clearTimeout(nameTimer);}
   if(action!==locationActionRef.current)return;
   const ok=await load({name,latitude,longitude},'gps');
   if(ok&&action===locationActionRef.current){
    const previous=lastGpsRef.current;
    const moved=previous?Math.hypot((latitude-previous.latitude)*111_000,(longitude-previous.longitude)*111_000*Math.cos(latitude*Math.PI/180))>1000:false;
    lastGpsRef.current={name,latitude,longitude};
    setLocationStatus((cached?'Son bilinen yakÄ±n konum kullanÄ±ldÄ±.':'GPS konumu alÄ±ndÄ±.')+(typeof pos.coords.accuracy==='number'?' YaklaÅŸÄ±k doÄŸruluk: '+Math.round(pos.coords.accuracy)+' m.':''));
    setLocationNotice('âŒ– Konumun gÃ¼ncellendi Â· '+name+(cached?' (son bilinen konum)':''));
    setCityResults([]);
    if(manual||(moved&&Date.now()-lastGpsNoticeRef.current>30*60_000)){
     lastGpsNoticeRef.current=Date.now();
     void notifyGpsUpdated(name,manual).catch(()=>{});
    }
   }
  }catch(e){if(action===locationActionRef.current)setError((e instanceof Error?e.message:'Konum belirlenemedi.')+' GPS ve konum iznini kontrol et veya ÅŸehir adÄ±yla ara.');}
  finally{if(action===locationActionRef.current)setBusy(false);}
 },[load]);
 useEffect(()=>{if(!locationNotice)return;const timer=setTimeout(()=>setLocationNotice(''),8000);return()=>clearTimeout(timer);},[locationNotice]);
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
    .then(count=>setAlertStatus(count?count+' yaklaÅŸan uyarÄ± planlandÄ±.':'Ã–nÃ¼mÃ¼zdeki 36 saatte eÅŸik aÅŸÄ±mÄ± beklenmiyor.'))
    .catch(e=>setAlertStatus(e instanceof Error?e.message:'UyarÄ±lar yenilenemedi.'));
 },[hydrated,alertEnabled,weather,place,rainThreshold,coldThreshold]);
 async function enableAlerts(){
  const rain=Number(rainThreshold),cold=Number(coldThreshold);
  if(!Number.isInteger(rain)||rain<1||rain>100||!Number.isInteger(cold)||cold< -30||cold>30){Alert.alert('GeÃ§ersiz eÅŸik','YaÄŸÄ±ÅŸ iÃ§in 1â€“100, sÄ±caklÄ±k iÃ§in -30â€“30 arasÄ±nda sayÄ± gir.');return;}
  if(!weather?.hourly||!place){Alert.alert('Hava verisi bekleniyor','Ã–nce konumu ve hava tahminini yÃ¼kle.');return;}
  try{const count=await scheduleWeatherAlerts(weather.hourly,weather.utc_offset_seconds??0,place.name,rain,cold);setAlertEnabled(true);setAlertStatus(count?count+' yaklaÅŸan uyarÄ± planlandÄ±.':'Ã–nÃ¼mÃ¼zdeki 36 saatte eÅŸik aÅŸÄ±mÄ± beklenmiyor.');}catch(e){Alert.alert('UyarÄ± aÃ§Ä±lamadÄ±',e instanceof Error?e.message:'Bildirim iznini kontrol et.');}
 }
 function saveEntry(){
  const note=journalText.trim();
  if(!note&&!journalPhoto){Alert.alert('Not veya fotoÄŸraf ekle','GÃ¶zlemini bir notla veya fotoÄŸrafla kaydet.');return;}
  const observedAt=Date.now();
  const entry:JournalEntry={id:String(observedAt),date:new Date(observedAt).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'}),place:place?.name||'Konum yok',mood,note:note.slice(0,500),sky:astronomy.phaseName,photoUri:journalPhoto??undefined,target:journalTarget||undefined,observedAt,latitude:place?.latitude,longitude:place?.longitude};
  setJournal(prev=>{const next=[entry,...prev].slice(0,100);const dropped=prev.slice(99);for(const old of dropped)if(old.photoUri)try{new File(old.photoUri).delete();}catch{}return next;});setJournalText('');setJournalPhoto(null);setJournalTarget('');
 }
 async function openJournalCamera(){
  try{
   const camera=await import('expo-camera');
   const current=await camera.Camera.getCameraPermissionsAsync();
   const permission=current.granted?current:await camera.Camera.requestCameraPermissionsAsync();
   if(!permission.granted){Alert.alert('Kamera izni gerekli','FotoÄŸraf eklemek iÃ§in ayarlardan kamera izni ver.');return;}
   setPhotoCameraReady(false);setCameraComponent(()=>camera.CameraView);setPhotoCameraOpen(true);
  }catch{Alert.alert('Kamera aÃ§Ä±lamadÄ±','Bu Expo Go sÃ¼rÃ¼mÃ¼nde kamera modÃ¼lÃ¼ bulunamadÄ±. SDK 58 uyumlu Expo Go veya geliÅŸtirme derlemesini kullan.');}
 }
 async function takeJournalPhoto(){
  if(!photoCameraReady||photoCapturing)return;
  setPhotoCapturing(true);
  try{
   const photo=await cameraRef.current?.takePictureAsync({quality:.55});
   if(!photo?.uri)return;
   setPhotoCameraOpen(false);
   const saved=new File(Paths.document,'gokyuzu-gunluk-'+Date.now()+'.jpg');
   new File(photo.uri).copy(saved);
   setJournalPhoto(saved.uri);
  }catch(e){Alert.alert('FotoÄŸraf kaydedilemedi',e instanceof Error?e.message:'Kamera hatasÄ±.');}
  finally{setPhotoCapturing(false);}
 }
 async function shareDayCard(){
  if(!shareCardRef.current||!weather){Alert.alert('Hava verisi bekleniyor','Kart iÃ§in hava durumunu yÃ¼kle.');return;}
  try{
   const Sharing=await import('expo-sharing');
   const {captureRef}=require('react-native-view-shot') as {captureRef:(target:unknown,options:object)=>Promise<string>};
   if(!await Sharing.isAvailableAsync())throw new Error('Bu cihazda paylaÅŸÄ±m kullanÄ±lamÄ±yor.');
   const uri=await captureRef(shareCardRef.current,{format:'png',result:'tmpfile'});
   await Sharing.shareAsync(uri,{mimeType:'image/png',dialogTitle:'GÃ¶kyÃ¼zÃ¼ kartÄ±nÄ± paylaÅŸ'});
  }catch(e){Alert.alert('Kart paylaÅŸÄ±lamadÄ±',e instanceof Error?e.message:'PaylaÅŸÄ±m hatasÄ±.');}
 }
 function toggleFavorite(){
  if(!place)return;
  const isSaved=favorites.some(x=>Math.abs(x.latitude-place.latitude)<.001&&Math.abs(x.longitude-place.longitude)<.001);
  setFavorites(prev=>isSaved?prev.filter(x=>Math.abs(x.latitude-place.latitude)>=.001||Math.abs(x.longitude-place.longitude)>=.001):[...prev,place].slice(0,12));
 }
 async function searchCity(){
  if(query.trim().length<2){setError('Åehir adÄ±ndan en az iki harf yaz.');return;}
  const action=++locationActionRef.current;
  setBusy(true);setError('');setCityResults([]);setLocationStatus('Åehir aranÄ±yorâ€¦');
  try{
   const r=await fetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(query.trim())+'&count=5&language=tr&format=json');
   if(!r.ok)throw new Error('Åehir aramasÄ± yapÄ±lamadÄ±.');
   const data=await r.json();
   const results=(data.results||[]) as CityResult[];
   if(!results.length)throw new Error('Åehir bulunamadÄ±; farklÄ± bir ad dene.');
   if(action===locationActionRef.current){setCityResults(results.filter(x=>Number.isFinite(x.latitude)&&Number.isFinite(x.longitude)));setLocationStatus('Listeden kullanmak istediÄŸin ÅŸehre dokun.');}
  }catch(e){if(action===locationActionRef.current)setError(e instanceof Error?e.message:'Åehir bulunamadÄ±.');}
  finally{if(action===locationActionRef.current)setBusy(false);}
 }
 async function selectCity(result:CityResult){
  const action=++locationActionRef.current;
  const selected={name:result.name+(result.admin1&&result.admin1!==result.name?', '+result.admin1:'')+(result.country?', '+result.country:''),latitude:result.latitude,longitude:result.longitude};
  setLocationStatus(selected.name+' iÃ§in hava tahmini yÃ¼kleniyorâ€¦');
  if(await load(selected,'city')&&action===locationActionRef.current){setCityResults([]);setQuery('');setLocationStatus(selected.name+' seÃ§ildi.');setScreen('weather');}
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
 const rainPeriods=weather?.hourly?rainWindows(weather.hourly.time,weather.hourly.precipitation_probability,weather.utc_offset_seconds??0,now):[];
 const transitions=useMemo(()=>upcomingSignTransitions(now),[new Date(now).toDateString()]);
 const viewing=weather?.hourly?skyViewingWindows(weather.hourly,weather.utc_offset_seconds??0,now,set,rise):[];
 const plan=place&&weather?.hourly?observationPlan(weather.hourly,weather.utc_offset_seconds??0,place.latitude,place.longitude,now,set,rise,air??undefined):null;
 const events=useMemo(()=>skyEvents(now),[new Date(now).toDateString()]);
 const moonDays=useMemo(()=>moonCalendar(new Date(now),21),[new Date(now).toDateString()]);
 const nextRain=forecastHours.find(h=>h.rain>=50);
 const rainChance=daily?.precipitation_probability_max[0]??0;
 const weatherAdvice=rainChance>=50||current&&[51,53,55,61,63,65,80,81,82,95,96,99].includes(current.weather_code)?'â˜‚  Åemsiyeni al':current&&current.wind_speed_10m>=45?'ğŸƒ  RÃ¼zgÃ¢ra dikkat':daily&&daily.temperature_2m_min[0]<=5?'ğŸ§¥  KalÄ±n giyin':'âœ¦  GÃ¶kyÃ¼zÃ¼nÃ¼ keÅŸfet';
 const serif={fontFamily:'serif' as const};
 const narration=useMemo(()=>{
  if(!current||!daily)return '';
  const rain=daily.precipitation_probability_max[0]||0;
  const advice=rain>=50?'Åemsiyeni yanÄ±na almayÄ± unutma.':current.wind_speed_10m>=45?'RÃ¼zgÃ¢r gÃ¼Ã§lÃ¼, dÄ±ÅŸarÄ±da dikkatli ol.':daily.temperature_2m_min[0]<=5?'Sabah serinliÄŸi iÃ§in kalÄ±n giyin.':daily.temperature_2m_max[0]>=32?'SÄ±cak havada bol su iÃ§.':'GÃ¼nÃ¼n tadÄ±nÄ± Ã§Ä±kar.';
  return 'Merhaba. '+(place?.name||'BulunduÄŸun yer')+' iÃ§in gÃ¶kyÃ¼zÃ¼nÃ¼n sesine hoÅŸ geldin. Åu anda hava '+label(current.weather_code).toLocaleLowerCase('tr-TR')+'. SÄ±caklÄ±k '+num(current.temperature_2m)+', hissedilen '+num(current.apparent_temperature)+' derece. GÃ¼nÃ¼n en dÃ¼ÅŸÃ¼k sÄ±caklÄ±ÄŸÄ± '+num(daily.temperature_2m_min[0])+', en yÃ¼kseÄŸi '+num(daily.temperature_2m_max[0])+' derece. YaÄŸÄ±ÅŸ olasÄ±lÄ±ÄŸÄ± yÃ¼zde '+num(rain)+'. GÃ¼neÅŸ '+time(rise)+' saatinde doÄŸuyor, '+time(set)+' saatinde batÄ±yor. '+advice;
 },[current,daily,place,rise,set]);
 async function playVoice(profile:VoiceProfile){
  if(!voiceEnabled){Alert.alert('Ses kapalÄ±','Ayarlar bÃ¶lÃ¼mÃ¼nden sesli rehberi aÃ§.');return;}
  if(activeVoice===profile || voiceLoading===profile){
   voiceRequestId.current++;player.pause();setActiveVoice(null);setVoiceLoading(null);
   return;
  }
  if(profile==='weather' && (!place || !weather)){Alert.alert('Hava durumu bekleniyor','Ã–nce konum ya da ÅŸehir seÃ§ip hava durumunu yÃ¼kle.');return;}
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
   const reason=e instanceof Error?e.message:'Ses alÄ±namadÄ±.';
   Alert.alert('Ses Ã§alÄ±namadÄ±',reason+' CihazÄ±n erkek sesine otomatik geÃ§ilmeyecek.');
  }finally{
   if(token===voiceRequestId.current)setVoiceLoading(null);
  }
 }
 async function playDailyBrief(){
  if(!voiceEnabled){Alert.alert('Ses kapalÄ±','Ayarlar bÃ¶lÃ¼mÃ¼nden sesli rehberi aÃ§.');return;}
  if(!place||!current||!daily){Alert.alert('Hava verisi bekleniyor','Ã–nce konumu ve hava tahminini yÃ¼kle.');return;}
  if(activeVoice==='brief'||voiceLoading==='brief'){voiceRequestId.current++;player.pause();setActiveVoice(null);setVoiceLoading(null);return;}
  const token=++voiceRequestId.current;player.pause();await Speech.stop();setActiveVoice(null);setVoiceLoading('brief');
  try{
   const uri=await getDailyBriefAudio({latitude:place.latitude,longitude:place.longitude,place:place.name,sign,duration:voiceDuration,pace:voicePace,
    weatherSnapshot:{temp:current.temperature_2m,feels:current.apparent_temperature,wind:current.wind_speed_10m,code:current.weather_code,observedAt:lastFetchRef.current,min:daily.temperature_2m_min[0],max:daily.temperature_2m_max[0],rain:daily.precipitation_probability_max[0],sunrise:rise!,sunset:set!}});
   if(token!==voiceRequestId.current)return;
   await setAudioModeAsync({playsInSilentMode:true});player.replace({uri});player.play();setActiveVoice('brief');
  }catch(e){if(token===voiceRequestId.current)Alert.alert('GÃ¼nlÃ¼k Ã¶zet sesi aÃ§Ä±lamadÄ±',e instanceof Error?e.message:'Ses alÄ±namadÄ±.');}
  finally{if(token===voiceRequestId.current)setVoiceLoading(null);}
 }
 async function loadEnsemble(){
  if(!place)return;
  const loadToken=loadIdRef.current;
  setEnsembleStatus('Model yayÄ±lÄ±mÄ± yÃ¼kleniyorâ€¦');setEnsemble(null);
  try{const result=await fetchEnsembleSpread(place.latitude,place.longitude);if(loadToken===loadIdRef.current){setEnsemble(result);setEnsembleStatus('');}}
  catch(e){if(loadToken===loadIdRef.current)setEnsembleStatus(e instanceof Error?e.message:'Model yayÄ±lÄ±mÄ± alÄ±namadÄ±.');}
 }
 async function playObservation(){
  if(!voiceEnabled){Alert.alert('Ses kapalÄ±','Ayarlar bÃ¶lÃ¼mÃ¼nden sesli rehberi aÃ§.');return;}
  if(activeVoice==='observation'||voiceLoading==='observation'){voiceRequestId.current++;player.pause();setActiveVoice(null);setVoiceLoading(null);return;}
  if(!plan||!place||!weather){Alert.alert('GÃ¶zlem planÄ± bulunamadÄ±','Ã–nce konumun hava tahminini yÃ¼kle.');return;}
  const token=++voiceRequestId.current;player.pause();setActiveVoice(null);setVoiceLoading('observation');
  try{
   const uri=await getObservationAudio({place:place.name,latitude:place.latitude,longitude:place.longitude,instant:plan.instant,offsetSeconds:weather.utc_offset_seconds??0,score:plan.score,cloud:Math.round(plan.cloud),rain:Math.round(plan.rain),targets:plan.targets.slice(0,3).map(x=>({name:x.name,azimuth:x.azimuth,altitude:x.altitude}))});
   if(token!==voiceRequestId.current)return;
   await setAudioModeAsync({playsInSilentMode:true});player.replace({uri});player.play();setActiveVoice('observation');
  }catch(e){if(token===voiceRequestId.current)Alert.alert('Rehber sesi aÃ§Ä±lamadÄ±',e instanceof Error?e.message:'Ses servisi kullanÄ±lamÄ±yor.');}
  finally{if(token===voiceRequestId.current)setVoiceLoading(null);}
 }
 async function shareObservationCalendar(){
  if(!plan||!place)return;
  try{
   const Sharing=await import('expo-sharing');
   if(!await Sharing.isAvailableAsync())throw new Error('PaylaÅŸÄ±m bu cihazda kullanÄ±lamÄ±yor.');
   const stamp=(ms:number)=>new Date(ms).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
   const safePlace=place.name.replace(/[\\;,\n\r]/g,' ').slice(0,40);
   const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Gokyuzunun Sesi//Gozlem Plani//TR','BEGIN:VEVENT',
    'UID:gokyuzu-'+plan.instant+'-'+Math.round(place.latitude*1000)+'@gokyuzunun-sesi',
    'DTSTAMP:'+stamp(Date.now()),'DTSTART:'+stamp(plan.instant),'DTEND:'+stamp(plan.instant+3600000),
    'SUMMARY:Gece gokyuzu gozlemi','DESCRIPTION:'+safePlace+' icin tahmini gozlem plani. Hava durumunu yeniden kontrol et.',
    'END:VEVENT','END:VCALENDAR',''].join('\r\n');
   const file=new File(Paths.cache,'gokyuzu-gozlem-'+Date.now()+'.ics');file.create();await file.write(ics);
   await Sharing.shareAsync(file.uri,{mimeType:'text/calendar',dialogTitle:'GÃ¶zlem saatini takvime aktar'});
  }catch(e){Alert.alert('Takvim dosyasÄ± paylaÅŸÄ±lamadÄ±',e instanceof Error?e.message:'PaylaÅŸÄ±m hatasÄ±.');}
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
    refreshControl={<RefreshControl refreshing={busy} onRefresh={()=>locationMode==='gps'?void locate(true):place?void load(place,'city'):void locate(true)} tintColor={p.accent}/>}
    contentContainerStyle={styles.page}>
  <View style={styles.header}>
    <Text style={{fontSize:43,color:p.accent,marginRight:8}}>â˜¾</Text>
    <View style={{flex:1,minWidth:0}}>
      <Text style={[{color:p.text,fontSize:25},serif]}>GÃ¶kyÃ¼zÃ¼nÃ¼n Sesi</Text>
      <Text style={{color:p.sub,fontSize:11,fontStyle:'italic'}}>Evren hep seninle konuÅŸuyorâ€¦</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="GÃ¶kyÃ¼zÃ¼ gÃ¼nlÃ¼ÄŸÃ¼nÃ¼ aÃ§" onPress={()=>setScreen('journal')} style={{padding:6}}><Text style={{fontSize:23,color:p.accent}}>âœ</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Kart yorumlarÄ±nÄ± aÃ§" onPress={()=>setScreen('cards')} style={{padding:6}}><Text style={{fontSize:23,color:p.accent}}>âœ§</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Bildirim ayarlarÄ±" onPress={()=>setScreen('settings')} style={{padding:6}}><Text style={{fontSize:26,color:p.accent}}>â™§</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="AyarlarÄ± aÃ§" onPress={()=>setScreen('settings')} style={[styles.headerAction,{backgroundColor:p.panel,borderColor:p.line}]}><Text style={{color:p.accent,fontSize:22}}>âš™</Text></Pressable>
  </View>
  {!!locationNotice&&<View accessibilityRole="alert" style={{backgroundColor:p.panel,borderColor:p.line,borderWidth:1,borderRadius:14,padding:12,marginTop:9}}><Text style={{color:p.text,fontWeight:'700'}}>{locationNotice}</Text></View>}
  {screen!=='weather'&&<Pressable accessibilityRole="button" accessibilityLabel="Ã–nceki ekrana dÃ¶n" onPress={goBack} style={{alignSelf:'flex-start',paddingVertical:10,paddingHorizontal:15,borderRadius:16,borderWidth:1,borderColor:p.line,backgroundColor:p.panel,marginTop:9}}><Text style={{color:p.text,fontSize:14,fontWeight:'700'}}>â€¹ Geri</Text></Pressable>}
  <View style={[styles.nav,{borderColor:p.line,backgroundColor:p.panel}]}>
    {([['weather','â˜€  BugÃ¼n'],['sky','â™„  Gezegenler'],['zodiac','â™‘  Burcum']] as const).map(([id,title])=>
      <Pressable accessibilityRole="button" key={id} onPress={()=>setScreen(id)} style={[styles.navItem,{backgroundColor:screen===id?p.accent:'transparent'}]}>
       <Text numberOfLines={1} style={[{color:screen===id?p.button:p.text,fontSize:13},serif]}>{title}</Text>
      </Pressable>)}
  </View>
  {!!error&&panel(<>{txt('âš ï¸ '+error,14)}{button('Konumumu tekrar dene',()=>void locate(true),true)}</>,{marginBottom:15})}
  {screen==='weather'&&<>
   {panel(<>
    {txt('â˜€ KiÅŸisel GÃ¶kyÃ¼zÃ¼ Ã–zeti',21,true)}
    {place&&current&&daily? <>
     {txt(place.name+' Â· '+label(current.weather_code)+' Â· '+num(current.temperature_2m)+'Â° (hissedilen '+num(current.apparent_temperature)+'Â°)',14,true)}
     {txt(nextRain?'â˜‚ '+time(nextRain.date)+' civarÄ±nda yaÄŸÄ±ÅŸ olasÄ±lÄ±ÄŸÄ± %'+num(nextRain.rain)+'.':'Ã–nÃ¼mÃ¼zdeki 12 saatte %50 Ã¼stÃ¼ yaÄŸÄ±ÅŸ ihtimali gÃ¶rÃ¼nmÃ¼yor.',13)}
     {txt('Ay: '+astronomy.phaseName+' (%'+astronomy.illuminated+' aydÄ±nlÄ±k). '+(events[0]?'SÄ±radaki takvim olayÄ±: '+events[0].title+'.':''),13)}
     {txt(sign+' burcu iÃ§in gezegen konumlarÄ±nÄ±n sembolik yorumunu Burcum bÃ¶lÃ¼mÃ¼nde okuyabilirsin.',12,false,true)}
     {button(voiceLoading==='brief'?'Ses hazÄ±rlanÄ±yorâ€¦':activeVoice==='brief'?'â–  Ã–zeti durdur':'â–¶ Hava ve gÃ¶kyÃ¼zÃ¼ Ã¶zetini dinle',()=>void playDailyBrief())}
    </>:txt('Konum ve hava tahmini yÃ¼kleniyor.',13)}
   </>,{marginBottom:12})}
   {!!forecastChangeMessage&&panel(<>{txt('â˜‚ Tahmin deÄŸiÅŸti',17,true)}{txt(forecastChangeMessage,13)}{button('MesajÄ± kapat',()=>setForecastChangeMessage(''),true)}</>,{marginBottom:12})}

   {panel(<>
     <View style={styles.sectionHeading}><Text style={[{color:p.text,fontSize:19},serif]}>âœ¦ KeÅŸfet</Text><Text style={{color:p.sub,fontSize:11}}>GÃ¶kyÃ¼zÃ¼ ve kartlar</Text></View>
     <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:12}}>
      {([['planner','âœ§','Bana uygun saat'],['observation','â˜¾','GÃ¶zlem planÄ±'],['events','âœ§','GÃ¶k olaylarÄ±'],['cards','âœ¦','Kart yorumlarÄ±'],['compass','âŠ•','Pusula'],['cookie','ğŸ¥ ','Åans kurabiyesi'],['rabbit','ğŸ‡','TavÅŸan FalcÄ±sÄ±']] as const).map(([destination,icon,title])=><Pressable key={title} accessibilityRole="button" accessibilityLabel={title+' ekranÄ±nÄ± aÃ§'} onPress={()=>setScreen(destination)} style={{width:'48%',flexGrow:1,flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderColor:p.line,backgroundColor:p.input,borderRadius:14,paddingVertical:11,paddingHorizontal:9}}><Text style={{color:p.accent,fontSize:23}}>{icon}</Text><Text numberOfLines={1} style={{color:p.text,fontSize:12,fontWeight:'700',flexShrink:1}}>{title}</Text></Pressable>)}
     </View>
   </>,{marginBottom:12})}
   <View style={[styles.hero,{backgroundColor:p.hero}]}>
    <View style={styles.heroLeft}>
     <Text style={[{color:p.text,fontSize:22},serif]}>{new Date(now).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})}</Text>
     <Text style={[{color:p.text,fontSize:16},serif]}>{new Date(now).toLocaleDateString('tr-TR',{weekday:'long'})}</Text>
     <Pressable accessibilityRole="button" accessibilityLabel="Konumu deÄŸiÅŸtir" onPress={()=>setScreen('settings')} style={{marginTop:12}}><Text numberOfLines={2} style={{color:p.text,fontSize:13}}>âŒ–  {place?.name||'Konum aranÄ±yor'}  {current?symbol(current.weather_code,dark):''}</Text></Pressable>
    </View>
    <View style={styles.heroRight}>
      <Text style={[{color:p.text,fontSize:14},serif]}>Ay FazÄ±</Text>
      <Text style={[{color:p.text,fontSize:20},serif]}>{astronomy.phaseName}</Text>
      <Text style={{color:p.sub,fontSize:13}}>%{astronomy.illuminated} aydÄ±nlÄ±k</Text>
      <Text style={{color:p.accent,marginVertical:5}}>â”â”â”â” âœ¦ â”â”â”â”</Text>
      <Text style={[{color:p.text,fontSize:13},serif]}>Niyetlerini bÃ¼yÃ¼t, evren seninle.</Text>
    </View>
   </View>
   {panel(<>
     <View style={styles.sectionHeading}><Text style={[{color:p.text,fontSize:19},serif]}>â˜¾ GÃ¶kyÃ¼zÃ¼ Takvimi</Text><Pressable onPress={()=>setScreen('events')} accessibilityRole="button"><Text style={{color:p.sub,fontSize:11}}>TÃ¼m olaylar  â€º</Text></Pressable></View>
     <View style={styles.planetStrip}><View pointerEvents="none" style={[styles.planetLine,{backgroundColor:p.accent,opacity:.55}]}/>{astronomy.bodies.slice(1,6).map(body=><Pressable key={body.name} accessibilityRole="button" onPress={()=>{setSelectedPlanet(body.name);setScreen('sky');}} style={styles.miniPlanet}><View style={[styles.planetOrb,{backgroundColor:p.input,borderColor:p.line}]}><Text style={{fontSize:23,color:p.accent}}>{body.icon}</Text></View><Text numberOfLines={1} style={[{color:p.text,fontSize:12},serif]}>{body.name}</Text><Text numberOfLines={1} style={{color:p.sub,fontSize:10}}>{body.sign}</Text></Pressable>)}</View>
   </>,{marginTop:8})}
   <View style={styles.zodiacRow}>
     <View style={[styles.wheelPanel,{backgroundColor:p.panel,borderColor:p.line}]}><ZodiacWheel night={dark} compact active={Math.max(0,SIGNS.indexOf(sign))} onSelect={i=>setSign(SIGNS[i])}/></View>
     <Pressable accessibilityRole="button" onPress={()=>setScreen('zodiac')} style={[styles.zodiacPanel,{backgroundColor:p.panel,borderColor:p.line}]}>
       <Text style={{color:p.accent,fontSize:12}}>Senin Burcun</Text>
       <Text numberOfLines={1} style={[{color:p.text,fontSize:21},serif]}>{ICONS[SIGNS.indexOf(sign)]}  {sign}</Text>
       <Text style={{color:p.line}}>â”€â”€â”€â”€â”€â”€â”€â”€â”€</Text>
       <Text style={{color:p.accent,fontSize:12,marginTop:3}}>GÃ¼nÃ¼n Yorumu</Text>
       <Text numberOfLines={5} style={{color:p.text,fontSize:12,lineHeight:17,marginTop:4}}>{symbolicReading(sign,astronomy)}</Text>
       <Text style={{color:p.sub,fontSize:11,marginTop:5}}>TÃ¼m yorumu gÃ¶r  â€º</Text>
     </Pressable>
   </View>
   <Pressable accessibilityRole="button" onPress={()=>void playVoice('astrology')} style={[styles.voiceBanner,{borderColor:p.line,backgroundColor:dark?'rgba(78,51,103,0.87)':'rgba(255,237,225,0.87)'}]}>
     <Text style={{fontSize:28,color:p.accent}}>â—–â™«â——</Text>
     <View style={{flex:1}}><Text style={[{color:p.text,fontSize:17},serif]}>Sesli yorumumu dinle</Text><Text numberOfLines={1} style={{color:p.sub,fontSize:11}}>BugÃ¼nÃ¼n senin iÃ§in ne sÃ¶ylediÄŸini keÅŸfetâ€¦</Text></View>
     <View style={[styles.playIcon,{backgroundColor:p.accent}]}><Text style={{color:p.button,fontSize:22}}>{activeVoice==='astrology'?'â– ':voiceLoading==='astrology'?'â€¦':'â–¶'}</Text></View>
   </Pressable>
   {voiceLoading==='astrology'&&<ActivityIndicator color={p.accent}/>}
   <Pressable accessibilityRole="button" onPress={()=>setScreen('cards')} style={[styles.voiceBanner,{borderColor:p.line,backgroundColor:p.panel}]}><Text style={{color:p.accent,fontSize:32}}>âœ§</Text><View style={{flex:1}}><Text style={[{color:p.text,fontSize:17},serif]}>Kart YorumlarÄ±</Text><Text style={{color:p.sub,fontSize:12}}>Tarot Â· Katina tarzÄ± Â· Ä°skambil</Text></View><Text style={{color:p.accent,fontSize:20}}>â€º</Text></Pressable>
   {current&&daily&&<>
    {panel(<>
     <Text style={[{color:p.text,fontSize:19},serif]}>âœ¦ GÃ¼nlÃ¼k GÃ¶kyÃ¼zÃ¼ RotasÄ±</Text>
     {txt((place?.name||'BulunduÄŸun yer')+' Â· '+label(current.weather_code)+' Â· '+num(current.temperature_2m)+'Â°',13)}
     {txt(nextRain?'â˜‚ YaÄŸÄ±ÅŸ olasÄ±lÄ±ÄŸÄ± '+time(nextRain.date)+' civarÄ±nda %'+num(nextRain.rain)+' dÃ¼zeyine Ã§Ä±kÄ±yor.':'Ã–nÃ¼mÃ¼zdeki saatlerde belirgin yaÄŸÄ±ÅŸ gÃ¶rÃ¼nmÃ¼yor.',12,false,true)}
     {txt('Ay: '+astronomy.phaseName+' Â· '+sign+' iÃ§in sembolik yorum hazÄ±r.',12,false,true)}
     <View style={{flexDirection:'row',gap:8}}><View style={{flex:1}}>{button(voiceLoading==='weather'?'HazÄ±rlanÄ±yorâ€¦':activeVoice==='weather'?'â–  Durdur':'â–¶ Hava Ã¶zetini dinle',()=>void playVoice('weather'),true)}</View><View style={{flex:1}}>{button('âœ GÃ¼nlÃ¼ÄŸÃ¼ aÃ§',()=>setScreen('journal'),true)}</View></View>
    </>,{marginTop:12})}
    <View style={styles.bottomRow}>
     <View style={[styles.weatherTile,{backgroundColor:p.panel,borderColor:p.line}]}>
      <Text numberOfLines={1} style={[{color:p.text,fontSize:13},serif]}>â˜¾  Hava Durumu Â· {place?.name||'Konumum'}</Text>
      <View style={{flexDirection:'row',alignItems:'center',gap:6,marginVertical:7}}><Text style={{fontSize:32}}>{symbol(current.weather_code,dark)}</Text><View><Text style={[{color:p.text,fontSize:29},serif]}>{num(current.temperature_2m)}Â°</Text><Text style={{color:p.sub,fontSize:11}}>{label(current.weather_code)}</Text></View></View>
      <Pressable accessibilityRole="button" onPress={()=>void playVoice('weather')} style={[styles.adviceButton,{backgroundColor:dark?'#E8E7FC':'#735084'}]}><Text numberOfLines={1} style={{color:dark?'#24204F':'#FFFFFF',fontSize:11,fontWeight:'600'}}>{weatherAdvice}  {activeVoice==='weather'?'â– ':'â–¶'}</Text></Pressable>
     </View>
     <View style={[styles.weatherTile,{backgroundColor:p.panel,borderColor:p.line}]}><Text style={[{color:p.text,fontSize:13},serif]}>âœ¦  GÃ¼nÃ¼n GÃ¶kyÃ¼zÃ¼</Text><Text style={{color:p.sub,fontSize:11,marginTop:10}}>Ay: {astronomy.phaseName}</Text><Text style={{color:p.sub,fontSize:11,marginTop:8}}>YaÄŸÄ±ÅŸ: %{num(rainChance)}</Text><Text style={{color:p.sub,fontSize:11,marginTop:8}}>RÃ¼zgÃ¢r: {num(current.wind_speed_10m)} km/sa</Text><Text style={{color:p.sub,fontSize:10,marginTop:12}}>Son gÃ¼ncelleme {updated}</Text></View>
    </View>
    {panel(<>
      <Text style={[{color:p.text,fontSize:19},serif]}>â˜‚ Saatlik Hava ve YaÄŸÄ±ÅŸ</Text>
      {txt(nextRain?'YaÄŸÄ±ÅŸ ihtimali '+time(nextRain.date)+' civarÄ±nda %'+num(nextRain.rain)+'.':'Ã–nÃ¼mÃ¼zdeki 12 saatte yÃ¼ksek yaÄŸÄ±ÅŸ olasÄ±lÄ±ÄŸÄ± gÃ¶rÃ¼nmÃ¼yor.',12,false,true)}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:12}} contentContainerStyle={{gap:8}}>{forecastHours.map((h,i)=><View key={h.date} style={[styles.hourTile,{backgroundColor:p.input,borderColor:p.line}]}><Text style={{color:p.text,fontWeight:'700'}}>{i===0?'Åimdi':time(h.date)}</Text><Text style={{fontSize:22,marginVertical:5}}>{symbol(h.code,dark)}</Text><Text style={{color:p.text}}>{num(h.temp)}Â°</Text><Text style={{color:p.sub,fontSize:11}}>â˜‚ %{num(h.rain)}</Text></View>)}</ScrollView>
    </>,{marginTop:14})}
    {panel(<>
      {txt('â˜‚ YaÄŸÄ±ÅŸ Pencereleri',19,true)}
      {txt('Ã–nÃ¼mÃ¼zdeki 36 saatte saatlik yaÄŸÄ±ÅŸ ihtimalinin %50 ve Ã¼stÃ¼ne Ã§Ä±ktÄ±ÄŸÄ± aralÄ±klar. YaÄŸÄ±ÅŸÄ±n kesin baÅŸlayÄ±p biteceÄŸi saatler deÄŸildir.',12,false,true)}
      {rainPeriods.length?rainPeriods.map(period=><View key={period.start} style={[styles.forecast,{borderColor:p.line}]}><Text style={{fontSize:24}}>â˜‚</Text><View style={{flex:1}}>{txt(localForecastTime(period.start,weather?.utc_offset_seconds??0)+' â€“ '+localForecastTime(period.end,weather?.utc_offset_seconds??0),12,true)}{txt('En yÃ¼ksek yaÄŸÄ±ÅŸ ihtimali %'+num(period.peak)+' Â· tahmin aralÄ±ÄŸÄ±',11,false,true)}</View></View>):txt(weather?'Ã–nÃ¼mÃ¼zdeki 36 saatte %50 eÅŸiÄŸini aÅŸan saat gÃ¶rÃ¼nmÃ¼yor. DÃ¼ÅŸÃ¼k olasÄ±lÄ±k sÄ±fÄ±r yaÄŸÄ±ÅŸ demek deÄŸildir.':'Saatlik tahmin yÃ¼kleniyor.',13,false,true)}
      {button('Saatlik tahmini yenile',()=>locationMode==='gps'?void locate(true):place?void load(place,'city'):void locate(true),true)}
    </>,{marginTop:15})}
    {panel(<>
     {txt('â— Tahmin BelirsizliÄŸi',19,true)}
     {txt('Ensemble modelinin sÄ±caklÄ±k ve yaÄŸÄ±ÅŸ miktarÄ± yayÄ±lÄ±mÄ±. KÃ¼Ã§Ã¼k yayÄ±lÄ±m model Ã¼yelerinin yakÄ±n olduÄŸunu gÃ¶sterir; tahminin doÄŸru Ã§Ä±kacaÄŸÄ±nÄ± garanti etmez.',12,false,true)}
     {button('Model yayÄ±lÄ±mÄ±nÄ± yÃ¼kle',()=>void loadEnsemble(),true)}
     {!!ensembleStatus&&txt(ensembleStatus,12,false,true)}
     {ensemble&&<>{txt('Kaynak: '+ensemble.model,11,false,true)}{ensemble.time.map((hour,i)=>({hour,at:Date.parse(hour+'Z'),t:ensemble.temperature[i],r:ensemble.precipitation[i]})).filter(item=>item.at>Date.now()&&Number.isFinite(item.t)&&Number.isFinite(item.r)).slice(0,5).map(item=><View key={item.hour} style={[styles.forecast,{borderColor:p.line}]}><View style={{flex:1}}>{txt(new Date(item.at).toLocaleString('tr-TR',{weekday:'short',hour:'2-digit',minute:'2-digit'}),13,true)}{txt('SÄ±caklÄ±k yayÄ±lÄ±mÄ± Â±'+item.t.toFixed(1)+'Â°C Â· yaÄŸÄ±ÅŸ miktarÄ± yayÄ±lÄ±mÄ± '+item.r.toFixed(1)+' mm',11,false,true)}</View></View>)}</>}
    </>,{marginTop:15})}
    {panel(<>{txt('Ã–nÃ¼mÃ¼zdeki gÃ¼nler',19,true)}{daily.time.slice(1,5).map((d,i)=><View key={d} style={[styles.forecast,{borderColor:p.line}]}><Text style={{fontSize:23}}>{symbol(daily.weather_code[i+1],dark)}</Text><View style={{flex:1}}>{txt(new Date(d+'T12:00:00').toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'}),13,true)}{txt(label(daily.weather_code[i+1])+' Â· YaÄŸÄ±ÅŸ %'+num(daily.precipitation_probability_max[i+1]),11,false,true)}</View>{txt(num(daily.temperature_2m_min[i+1])+'Â° / '+num(daily.temperature_2m_max[i+1])+'Â°',12,true)}</View>)}</>,{marginTop:15})}
   </>}
   {panel(<>
     {txt('âœ¦ Bu Gece GÃ¶kyÃ¼zÃ¼ GÃ¶rÃ¼lÃ¼r mÃ¼?',19,true)}
     {viewing.length?viewing.map(window=><View key={window.time} style={[styles.forecast,{borderColor:p.line}]}><View style={{flex:1}}>{txt(new Date(window.time+'Z').toLocaleDateString('tr-TR',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'})+' Â· '+time(window.time),14,true)}{txt('Bulut %'+num(window.cloud)+' Â· YaÄŸÄ±ÅŸ %'+num(window.rain)+' Â· GÃ¶rÃ¼ÅŸ '+(window.visibility/1000).toFixed(1)+' km',11,false,true)}</View>{txt('%'+window.score,20,true)}</View>):txt(weather?'Bulut, gÃ¶rÃ¼ÅŸ veya gece saatleri iÃ§in yeterli tahmin bulunamadÄ±.':'Hava tahmini yÃ¼kleniyor.',13,false,true)}
     {txt('Puan tahmini bulut, yaÄŸÄ±ÅŸ ve gÃ¶rÃ¼ÅŸe dayanÄ±r; gerÃ§ek gÃ¶zlemi veya Ä±ÅŸÄ±k kirliliÄŸini Ã¶lÃ§mez.',11,false,true)}
     {plan&&txt('En uygun saat: '+time(plan.time)+' Â· Ay Ä±ÅŸÄ±ÄŸÄ± %'+plan.moonlight+(plan.optical!==null?' Â· Pus gÃ¶stergesi '+plan.optical.toFixed(2):''),12,true)}
     {button('âœ¦ Bu gece nereye bakayÄ±m?',()=>setScreen('observation'))}
     {button('â˜½ GÃ¶kyÃ¼zÃ¼ne tut',()=>setScreen('lens'),true)}
   </>,{marginTop:15})}
   {current&&daily&&panel(<>
     <View ref={shareCardRef} collapsable={false} style={{padding:20,borderRadius:20,backgroundColor:dark?'#211A45':'#F6E5DF',minHeight:190}}>
       <Text style={{color:p.accent,fontSize:25,fontFamily:'serif'}}>â˜¾ GÃ¶kyÃ¼zÃ¼nÃ¼n Sesi âœ¦</Text>
       <Text style={{color:p.text,fontSize:17,marginTop:10}}>{place?.name||'GÃ¶kyÃ¼zÃ¼'} Â· {new Date(now).toLocaleDateString('tr-TR')}</Text>
       <Text style={{color:p.text,fontSize:30,marginTop:10}}>{symbol(current.weather_code,dark)} {num(current.temperature_2m)}Â°  Â·  {label(current.weather_code)}</Text>
       <Text style={{color:p.sub,fontSize:14,marginTop:10}}>â˜¾ {astronomy.phaseName} Â· %{astronomy.illuminated} aydÄ±nlÄ±k    â˜‚ YaÄŸÄ±ÅŸ %{num(rainChance)}</Text>
     </View>
     {button('â†— GÃ¼nÃ¼n gÃ¶rsel kartÄ±nÄ± paylaÅŸ',()=>void shareDayCard())}
   </>,{marginTop:15})}
  </>}
  {screen==='sky'&&<>
    {panel(<>
      <View style={{alignItems:'center'}}>
        {txt('âœ¦  AyÄ±n BugÃ¼nkÃ¼ HÃ¢li',22,true)}
        <MoonDisc night={dark} phaseName={astronomy.phaseName} illuminated={astronomy.illuminated} size={135}/>
        {txt(astronomy.phaseName,23,true)}
        {txt('%'+astronomy.illuminated+' aydÄ±nlÄ±k',14,false,true)}
        {txt('Hesaplanan an: '+new Date(astronomy.date).toLocaleString('tr-TR'),11,false,true)}
      </View>
      {daily?<View style={styles.facts}>{fact('ğŸŒ…','GÃ¼n doÄŸumu',time(rise))}{fact('ğŸŒ‡','GÃ¼n batÄ±mÄ±',time(set))}{fact('â˜€ï¸','UV endeksi',num(daily.uv_index_max[0]))}{fact(symbol(daily.weather_code[0],dark),'Hava',label(daily.weather_code[0]))}</View>:null}
    </>)}
    {panel(<>
      {txt('ğŸª Gezegen Takvimi',22,true)}
      {txt('DÃ¼nya merkezli ekliptik boylam, tropikal zodyak. Bir gezegene dokunarak hesaplanan ayrÄ±ntÄ±larÄ± aÃ§.',12,false,true)}
      {astronomy.bodies.map(body=><Pressable key={body.name} accessibilityRole="button" onPress={()=>setSelectedPlanet(selectedPlanet===body.name?null:body.name)}
        style={[styles.forecast,{borderColor:p.line}]}>
        <View style={[styles.planetOrb,{backgroundColor:p.hero,borderColor:p.line}]}><Text style={{fontSize:25,color:p.accent}}>{body.icon}</Text></View>
        <View style={{flex:1}}>
          {txt(body.name,16,true)}{txt(body.sign+' Â· '+body.degree.toFixed(1)+'Â°',13,false,true)}
          {selectedPlanet===body.name&&txt('Ekliptik boylam: '+body.longitude.toFixed(2)+'Â°. Bu astronomik koordinattÄ±r; gÃ¶rÃ¼nÃ¼rlÃ¼k hava koÅŸullarÄ±na baÄŸlÄ±dÄ±r.',12)}
        </View>{txt(selectedPlanet===body.name?'âŒ„':'â€º',22,true)}
      </Pressable>)}
      {txt('âœ¦ Ã–nÃ¼mÃ¼zdeki BurÃ§ GeÃ§iÅŸleri',19,true)}
      {txt('Gezegenlerin tropikal zodyakta bÃ¶lÃ¼m deÄŸiÅŸtirdiÄŸi hesaplanan zamanlar. KiÅŸisel etkileri Ã¶lÃ§Ã¼lmez veya Ã¶ngÃ¶rÃ¼lmez.',12,false,true)}
      {transitions.length?transitions.map(item=><View key={item.name+item.instant} style={[styles.forecast,{borderColor:p.line}]}><Text style={{fontSize:24,color:p.accent}}>{item.icon}</Text><View style={{flex:1}}>{txt(item.name+' Â· '+item.from+' â†’ '+item.to,15,true)}{txt(new Date(item.instant).toLocaleString('tr-TR',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}),12,false,true)}</View></View>):txt('Ã–nÃ¼mÃ¼zdeki 14 gÃ¼nde listelenen gezegenler iÃ§in geÃ§iÅŸ bulunmadÄ±.',12,false,true)}
      {button('ğŸ”„ KonumlarÄ± gÃ¼ncelle',()=>setNow(Date.now()),true)}
      {button('â˜¾ Ay takvimini aÃ§',()=>setScreen('moon'),true)}
      {button('âœ§ GÃ¶k olaylarÄ± takvimi',()=>setScreen('events'),true)}
      {button('âœ¦ GÃ¶zlem planÄ±mÄ± gÃ¶r',()=>setScreen('observation'),true)}
      {button('âœ¦ GÃ¶kyÃ¼zÃ¼ne tut',()=>setScreen('lens'),true)}
    </>,{marginTop:15})}
  </>}
  {screen==='moon'&&panel(<>
    {txt('â˜¾ Ay Takvimi',23,true)}{txt('Ã–nÃ¼mÃ¼zdeki 21 gÃ¼n Â· astronomik Ay evreleri',12,false,true)}
    {moonDays.map(day=><View key={day.key} style={[styles.forecast,{borderColor:p.line}]}><Text style={{color:p.accent,fontSize:24}}>â˜¾</Text><View style={{flex:1,marginLeft:10}}>{txt(day.date,15,true)}{txt(day.name,12,false,true)}</View>{txt('%'+day.lit,15,true)}</View>)}
  </>)}
  {screen==='lens'&&panel(<>
    {txt('âœ¦ GÃ¶kyÃ¼zÃ¼ne Tut',22,true)}
    {place&&LensComponent?<LensComponent latitude={place.latitude} longitude={place.longitude} place={place.name} dark={dark}/>:txt(lensError||'Konum ve kamera gÃ¶rÃ¼nÃ¼mÃ¼ hazÄ±rlanÄ±yor.',14)}
  </>)}
  {screen==='cards'&&panel(<CardReadings p={p} playAudio={async(deck,spread,cards)=>{if(!voiceEnabled)throw new Error('Sesli rehber ayarlarda kapalÄ±.');const token=++voiceRequestId.current;player.pause();const uri=await getCardAudio(deck,spread,cards);if(token!==voiceRequestId.current)return;await setAudioModeAsync({playsInSilentMode:true});player.replace({uri});player.play();}}/>)}
  {screen==='cookie'&&panel(<FortuneCookie p={p} onJournal={message=>{setJournalText(message);setScreen('journal');}}/>)}
  {screen==='rabbit'&&panel(<RabbitFortune p={p} onJournal={message=>{setJournalText(message);setScreen('journal');}}/>)}
  {screen==='compass'&&panel(<Compass p={p} targets={plan?.targets}/>)}
  {screen==='planner'&&panel(<ActivityPlanner p={p} place={place?.name||''} hourly={weather?.hourly} daily={weather?.daily} offsetSeconds={weather?.utc_offset_seconds??0} updated={updated}/>)}
  {screen==='observation'&&<>{panel(<>
    {txt('âœ¦ Bu Gece Nereye BakayÄ±m?',22,true)}
    {!plan?txt('Konum ve gece hava tahmini bekleniyor. Tahmin gelince gÃ¶zlem planÄ± burada gÃ¶rÃ¼necek.',13,false,true):<>
     {txt(place?.name+' Â· '+new Date(plan.instant).toLocaleString('tr-TR',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}),15,true)}
     {txt('GÃ¶zlem puanÄ± %'+plan.score+' Â· Bulut %'+num(plan.cloud)+' Â· YaÄŸÄ±ÅŸ %'+num(plan.rain)+' Â· Ay Ä±ÅŸÄ±ÄŸÄ± %'+plan.moonlight,13,false,true)}
     {plan.optical!==null&&txt('Pus gÃ¶stergesi '+plan.optical.toFixed(2)+'; yÃ¼ksek deÄŸer gÃ¶rÃ¼ÅŸÃ¼ azaltabilir.',12,false,true)}
     {plan.targets.length?plan.targets.map(target=><View key={target.name} style={[styles.forecast,{borderColor:p.line}]}><Text style={{color:p.accent,fontSize:27}}>{target.icon}</Text><View style={{flex:1}}>{txt(target.name,16,true)}{txt(target.direction+' Â· '+target.azimuth+'Â° yÃ¶n Â· ufuktan '+target.altitude+'Â° yukarÄ±',12,false,true)}</View></View>):txt('Bu saatte Ay ve listelenen parlak gezegenler ufkun yeterince Ã¼zerinde deÄŸil.',13,false,true)}
     {button(voiceLoading==='observation'?'Ses hazÄ±rlanÄ±yorâ€¦':activeVoice==='observation'?'â–  Rehberi durdur':'â–¶ Sesli gÃ¶zlem rehberini dinle',()=>void playObservation())}
     {button('â˜· GÃ¶zlem saatini takvim dosyasÄ± olarak paylaÅŸ',()=>void shareObservationCalendar(),true)}
     {button('âœ¦ GÃ¶kyÃ¼zÃ¼ne tut',()=>setScreen('lens'),true)}
     {button('âŠ• PusulayÄ± aÃ§',()=>setScreen('compass'),true)}
     {txt('Pusula yÃ¶nÃ¼ yaklaÅŸÄ±k deÄŸerdir. Hava tahmini ve Ä±ÅŸÄ±k kirliliÄŸi gerÃ§ek gÃ¶zlemi deÄŸiÅŸtirebilir.',11,false,true)}
    </>}
  </>)}{panel(<>
    {txt('â˜¾ Gece HavasÄ±',20,true)}
    {plan?.aqi!==null&&plan?.aqi!==undefined?txt('Avrupa hava kalitesi endeksi: '+num(plan.aqi),13,true):txt(airError?'Hava kalitesi servisine ulaÅŸÄ±lamadÄ±.':'Bu saat iÃ§in hava kalitesi verisi bekleniyor veya bulunamadÄ±.',12,false,true)}
    {plan?.pm25!==null&&plan?.pm25!==undefined&&txt('PM2.5: '+plan.pm25.toFixed(1)+' Âµg/mÂ³',12)}
    {txt('Hava kalitesi Ã¶lÃ§Ã¼sÃ¼ ve pus tahmini farklÄ± verilerdir. Kaynak: Open-Meteo / CAMS.',11,false,true)}
  </>,{marginTop:15})}</>}
  {screen==='events'&&panel(<SkyEvents p={p} events={events} hourly={weather?.hourly} offsetSeconds={weather?.utc_offset_seconds??0}/>)}
  {screen==='birth'&&panel(<BirthChart p={p} night={dark}/>)}
  {screen==='zodiac'&&<>
    {panel(<>
      {txt('âœ§ BurÃ§ Ã‡arkÄ±',24,true)}
      {txt('Burcunu seÃ§mek iÃ§in sembolÃ¼ne dokun.',13,false,true)}
      <ZodiacWheel night={dark} active={Math.max(0,SIGNS.indexOf(sign))} onSelect={i=>setSign(SIGNS[i])}/>
      <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
        <Text style={{color:p.accent,fontSize:42}}>{ICONS[SIGNS.indexOf(sign)]}</Text>
        <View style={{flex:1}}>{txt(sign,26,true)}{txt('GÃ¼nlÃ¼k sembolik yorum',12,false,true)}</View>
      </View>
    </>)}
    {panel(<>
      {txt(sign+' Â· GÃ¼nÃ¼n GÃ¶kyÃ¼zÃ¼',20,true)}
      <View style={{marginTop:12}}>{txt(symbolicReading(sign,astronomy),15)}</View>
      {button(voiceLoading==='astrology'?'â³ Ses hazÄ±rlanÄ±yorâ€¦':activeVoice==='astrology'?'â–  Durdur':'â–¶ Astroloji yorumunu dinle',()=>void playVoice('astrology'))}
      {voiceLoading==='astrology'&&<ActivityIndicator color={p.accent}/>}
      {button('ğŸª Gezegen konumlarÄ±nÄ± ve burÃ§ geÃ§iÅŸlerini gÃ¶r',()=>setScreen('sky'),true)}
      {button('âœ¦ DoÄŸum anÄ± haritamÄ± aÃ§',()=>setScreen('birth'),true)}
      <View style={{marginTop:10}}>{txt('Astrolojik semboller bilimsel kiÅŸisel Ã¶ngÃ¶rÃ¼ deÄŸildir.',11,false,true)}</View>
    </>,{marginTop:15})}
  </>}
  {screen==='journal'&&<>
    {panel(<>
      {txt('âœ GÃ¶kyÃ¼zÃ¼ GÃ¼nlÃ¼ÄŸÃ¼m',23,true)}
      {txt('BugÃ¼n nasÄ±l hissediyorsun? Notlar yalnÄ±zca bu cihazda saklanÄ±r.',12,false,true)}
      <View style={styles.moodRow}>{['Sakin','NeÅŸeli','DÃ¼ÅŸÃ¼nceli','Yorgun'].map(m=><Pressable accessibilityRole="button" key={m} onPress={()=>setMood(m)} style={[styles.moodChip,{backgroundColor:mood===m?p.accent:p.input}]}><Text style={{color:mood===m?p.button:p.text,fontSize:12}}>{m}</Text></Pressable>)}</View>
      {txt('GÃ¶kyÃ¼zÃ¼nde ne gÃ¶rdÃ¼n? (isteÄŸe baÄŸlÄ±)',13,true)}
      <View style={styles.moodRow}>{['Ay','VenÃ¼s','Mars','JÃ¼piter','SatÃ¼rn','Meteor','DiÄŸer'].map(item=><Pressable accessibilityRole="button" key={item} onPress={()=>setJournalTarget(journalTarget===item?'':item)} style={[styles.moodChip,{backgroundColor:journalTarget===item?p.accent:p.input}]}><Text style={{color:journalTarget===item?p.button:p.text,fontSize:12}}>{item}</Text></Pressable>)}</View>
      <TextInput multiline maxLength={500} value={journalText} onChangeText={setJournalText} placeholder="GÃ¶kyÃ¼zÃ¼ne bakÄ±nca bugÃ¼n neler dÃ¼ÅŸÃ¼ndÃ¼n?" placeholderTextColor={p.sub} style={[styles.journalInput,{backgroundColor:p.input,color:p.text,borderColor:p.line}]}/>
      {button('ğŸ“· GÃ¶kyÃ¼zÃ¼nÃ¼n fotoÄŸrafÄ±nÄ± ekle',()=>void openJournalCamera(),true)}
      {journalPhoto&&<View><Image source={{uri:journalPhoto}} style={{width:'100%',height:180,borderRadius:16,marginTop:12}}/>{button('FotoÄŸrafÄ± kaldÄ±r',()=>{try{new File(journalPhoto).delete();}catch{}setJournalPhoto(null);},true)}</View>}
      {button('âœ¦ GÃ¼nlÃ¼ÄŸÃ¼me kaydet',saveEntry)}
    </>)}
    {journal.map(entry=><View key={entry.id}>{panel(<>
      <View style={styles.sectionHeading}>{txt(entry.date+' Â· '+entry.mood,15,true)}<Pressable accessibilityRole="button" accessibilityLabel="GÃ¼nlÃ¼k kaydÄ±nÄ± sil" onPress={()=>Alert.alert('KaydÄ± sil','Bu gÃ¼nlÃ¼k notunu silmek istiyor musun?', [{text:'VazgeÃ§',style:'cancel'},{text:'Sil',style:'destructive',onPress:()=>{if(entry.photoUri)try{new File(entry.photoUri).delete();}catch{}setJournal(prev=>prev.filter(e=>e.id!==entry.id));}}])}><Text style={{color:p.accent,fontSize:16}}>âœ•</Text></Pressable></View>
      {txt(entry.place+' Â· '+entry.sky+(entry.target?' Â· GÃ¶zlem: '+entry.target:'')+(entry.observedAt?' Â· '+new Date(entry.observedAt).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}):''),12,false,true)}
      {entry.photoUri&&<Image source={{uri:entry.photoUri}} style={{width:'100%',height:210,borderRadius:16,marginTop:10}}/>}
      <View style={{marginTop:8}}>{entry.note?txt(entry.note,14):txt('FotoÄŸraflÄ± gÃ¶zlem',13,false,true)}</View>
    </>,{marginTop:12})}</View>)}
  </>}
  {screen==='settings'&&<>{panel(<>{txt('âŒ– Konum ve ÅŸehir',22,true)}{txt(place?(locationMode==='gps'?'GPS konumu Â· ':'SeÃ§ilen ÅŸehir Â· ')+place.name+' Â· '+place.latitude.toFixed(3)+', '+place.longitude.toFixed(3):'Konum bekleniyor',12,false,true)}<View style={styles.search}><TextInput value={query} onChangeText={value=>{setQuery(value);setCityResults([]);}} onSubmitEditing={()=>void searchCity()} returnKeyType="search" placeholder="Ä°stanbul, Ankara, Ä°zmir..." placeholderTextColor={p.sub} style={[styles.input,{backgroundColor:p.input,color:p.text,borderColor:p.line}]}/><Pressable accessibilityRole="button" style={[styles.go,{backgroundColor:p.accent,opacity:busy?.6:1}]} onPress={()=>void searchCity()} disabled={busy}><Text style={{color:p.button,fontWeight:'800'}}>Ara</Text></Pressable></View>{button('âŒ– GPS konumumu kullan',()=>void locate(true),true)}{!!locationStatus&&txt(locationStatus,12,false,true)}{cityResults.map((result,index)=><Pressable key={result.name+'-'+result.latitude+'-'+index} accessibilityRole="button" onPress={()=>void selectCity(result)} style={[styles.forecast,{borderColor:p.line,paddingHorizontal:8,backgroundColor:p.input,borderRadius:12}]}><Text style={{color:p.text,flex:1,fontWeight:'700'}}>{result.name}{result.admin1&&result.admin1!==result.name?', '+result.admin1:''}{result.country?', '+result.country:''}</Text><Text style={{color:p.accent}}>SeÃ§ â€º</Text></Pressable>)}</>,{marginBottom:15})}{panel(<>
   {txt('â˜† Favori Åehirler',20,true)}
   {txt('SeÃ§ili ÅŸehrin hava durumuna tek dokunuÅŸla dÃ¶n.',12,false,true)}
   {place&&button(favorites.some(x=>Math.abs(x.latitude-place.latitude)<.001&&Math.abs(x.longitude-place.longitude)<.001)?'â˜… Favorilerden Ã§Ä±kar':'â˜† '+place.name+' ÅŸehrini ekle',toggleFavorite,true)}
   {favorites.map(city=><View key={city.latitude+':'+city.longitude} style={[styles.forecast,{borderColor:p.line}]}><Pressable accessibilityRole="button" style={{flex:1}} onPress={()=>{locationActionRef.current++;void load(city,'city').then(ok=>{if(ok){setLocationStatus(city.name+' seÃ§ildi.');setScreen('weather');}});}}>{txt('âŒ– '+city.name,14,true)}{txt('Hava durumunu aÃ§  â€º',11,false,true)}</Pressable><Pressable accessibilityRole="button" accessibilityLabel={city.name+' favorisini kaldÄ±r'} onPress={()=>setFavorites(prev=>prev.filter(x=>x.latitude!==city.latitude||x.longitude!==city.longitude))}><Text style={{color:p.accent,fontSize:18}}>âœ•</Text></Pressable></View>)}
  </>,{marginBottom:15})}{panel(<>{txt('âš™ï¸ GÃ¶rÃ¼nÃ¼m',22,true)}{txt('Otomatik tema, seÃ§ili konumun gÃ¼neÅŸ doÄŸuÅŸ ve batÄ±ÅŸ saatlerini izler.',13,false,true)}<View style={styles.nav}>{(['auto','day','night'] as const).map((v)=><Pressable key={v} onPress={()=>setTheme(v)} style={[styles.navItem,{backgroundColor:theme===v?p.accent:p.input}]}><Text style={{color:theme===v?p.button:p.text,fontWeight:'800'}}>{v==='auto'?'Otomatik':v==='day'?'â˜€ï¸ GÃ¼ndÃ¼z':'ğŸŒ™ Gece'}</Text></Pressable>)}</View></>)}{panel(<>{txt('ğŸ™ï¸ Seslendirme',22,true)}<View style={styles.switchRow}>{txt('Sesli rehber',15)}<Switch value={voiceEnabled} onValueChange={setVoiceEnabled}/></View>{txt('Hava durumu ve astroloji iÃ§in ayrÄ± TÃ¼rkÃ§e ses profilleri kullanÄ±lÄ±r. KadÄ±n ses profili doÄŸrulanamazsa oynatma durur; cihazÄ±n erkek sesine geÃ§ilmez.',12,false,true)}{voiceProfiles&&txt('Hava sesi: '+(voiceProfiles.weather==='female'?'kadÄ±n etiketi doÄŸrulandÄ±':voiceProfiles.weather==='female-description-unverified'?'kadÄ±n ses aÃ§Ä±klamasÄ±; dinleyerek kontrol et':'ses doÄŸrulanamadÄ±')+' Â· Astroloji sesi: '+(voiceProfiles.astrology==='female'?'kadÄ±n etiketi doÄŸrulandÄ±':voiceProfiles.astrology==='female-description-unverified'?'kadÄ±n ses aÃ§Ä±klamasÄ±; dinleyerek kontrol et':'ses doÄŸrulanamadÄ±'),12,false,true)}{txt('AnlatÄ±m uzunluÄŸu',14,true)}<View style={styles.moodRow}>{(['brief','full'] as const).map(v=><Pressable key={v} accessibilityRole="button" onPress={()=>setVoiceDuration(v)} style={[styles.moodChip,{backgroundColor:voiceDuration===v?p.accent:p.input}]}><Text style={{color:voiceDuration===v?p.button:p.text}}>{v==='brief'?'KÄ±sa Ã¶zet':'Tam anlatÄ±m'}</Text></Pressable>)}</View>{txt('Ses temposu',14,true)}<View style={styles.moodRow}>{(['normal','calm'] as const).map(v=><Pressable key={v} accessibilityRole="button" onPress={()=>setVoicePace(v)} style={[styles.moodChip,{backgroundColor:voicePace===v?p.accent:p.input}]}><Text style={{color:voicePace===v?p.button:p.text}}>{v==='calm'?'Sakin, yavaÅŸ':'Normal'}</Text></Pressable>)}</View>{txt('Dinleme saatini aÅŸaÄŸÄ±daki gÃ¼nlÃ¼k hatÄ±rlatma bÃ¶lÃ¼mÃ¼nden seÃ§ebilirsin. Ses yalnÄ±zca dinle dÃ¼ÄŸmesine bastÄ±ÄŸÄ±nda Ã§alar.',12,false,true)}{button(voiceLoading==='weather'?'â³ Ses hazÄ±rlanÄ±yorâ€¦':activeVoice==='weather'?'â–  Hava sesini durdur':'â–¶ Hava sesini dene',()=>void playVoice('weather'))}{button(voiceLoading==='astrology'?'â³ Ses hazÄ±rlanÄ±yorâ€¦':activeVoice==='astrology'?'â–  Astroloji sesini durdur':'â–¶ Astroloji sesini dene',()=>void playVoice('astrology'),true)}</>,{marginTop:15})}{panel(<>{txt('â° HatÄ±rlatma tercihi',22,true)}{txt('SeÃ§tiÄŸin saatte gÃ¼nlÃ¼k yerel hatÄ±rlatma gÃ¶nderilir. Bildirim yeni hava verisi deÄŸil, uygulamayÄ± aÃ§ma hatÄ±rlatmasÄ±dÄ±r.',13,false,true)}<View style={styles.search}><TextInput keyboardType="number-pad" maxLength={2} accessibilityLabel="Saat" value={hour} onChangeText={setHour} style={[styles.timeInput,{backgroundColor:p.input,color:p.text}]}/>{txt(':',24,true)}<TextInput keyboardType="number-pad" maxLength={2} accessibilityLabel="Dakika" value={minute} onChangeText={setMinute} style={[styles.timeInput,{backgroundColor:p.input,color:p.text}]}/></View>{button(notificationActive?'HatÄ±rlatma saatini gÃ¼ncelle':'GÃ¼nlÃ¼k bildirimi aÃ§',()=>{void (async()=>{if(!/^\d{1,2}$/.test(hour)||!/^\d{1,2}$/.test(minute)||Number(hour)>23||Number(minute)>59){Alert.alert('GeÃ§ersiz saat','00:00â€“23:59 arasÄ±nda bir saat gir.');return;}try{await setDailyNotification(Number(hour),Number(minute));setHour(hour.padStart(2,'0'));setMinute(minute.padStart(2,'0'));setNotificationActive(true);Alert.alert('Bildirim kuruldu', 'Her gÃ¼n '+hour.padStart(2,'0')+':'+minute.padStart(2,'0')+' saatinde hatÄ±rlatma planlandÄ±.');}catch(e){Alert.alert('Bildirim aÃ§Ä±lamadÄ±',e instanceof Error?e.message:'Bildirim iznini kontrol et.');}})();})}
  {notificationActive&&button('Bildirimleri kapat',()=>{void stopDailyNotification().then(()=>{setNotificationActive(false);Alert.alert('KapatÄ±ldÄ±','GÃ¼nlÃ¼k hatÄ±rlatma iptal edildi.');}).catch(()=>Alert.alert('Hata','Bildirim kaldÄ±rÄ±lamadÄ±.'));},true)}</>,{marginTop:15})}{panel(<>
   {txt('â‡„ DeÄŸiÅŸen Tahmin Bildirimleri',21,true)}
   {txt('Bu cihazda uygulama aÃ§Ä±ldÄ±ÄŸÄ±nda veya tahmin yenilendiÄŸinde aynÄ± konumun eski ve yeni saatlik verileri karÅŸÄ±laÅŸtÄ±rÄ±lÄ±r. Uygulama kapalÄ±yken sÃ¼rekli tarama yapÄ±lmaz.',12,false,true)}
   {button(changeAlertsEnabled?'DeÄŸiÅŸiklik bildirimlerini kapat':'DeÄŸiÅŸiklik bildirimlerini aÃ§',()=>{void (async()=>{if(changeAlertsEnabled){changeAlertsRef.current=false;setChangeAlertsEnabled(false);return;}try{await enableForecastChangeAlerts();changeAlertsRef.current=true;setChangeAlertsEnabled(true);Alert.alert('AÃ§Ä±ldÄ±','Tahmin deÄŸiÅŸiklikleri uygulamayÄ± aÃ§tÄ±ÄŸÄ±nda veya yenilediÄŸinde bildirilecek.');}catch(e){Alert.alert('Bildirim aÃ§Ä±lamadÄ±',e instanceof Error?e.message:'Ä°zin gerekli.');}})();},true)}
   {txt('â˜‚ AkÄ±llÄ± Hava UyarÄ±larÄ±',21,true)}
   {txt('Uygulama aÃ§Ä±ldÄ±ÄŸÄ±nda gÃ¼ncel tahmine bakÄ±p Ã¶nÃ¼mÃ¼zdeki 36 saat iÃ§in yerel uyarÄ± planlar. Hava deÄŸiÅŸirse uygulamayÄ± yeniden aÃ§man gerekir; sesli bildirim deÄŸildir.',12,false,true)}
   <View style={styles.search}><View style={{flex:1}}>{txt('YaÄŸÄ±ÅŸ â‰¥ %',12,false,true)}<TextInput keyboardType="number-pad" maxLength={3} value={rainThreshold} onChangeText={setRainThreshold} style={[styles.timeInput,{width:'100%',backgroundColor:p.input,color:p.text}]}/></View><View style={{flex:1}}>{txt('SÄ±caklÄ±k â‰¤ Â°C',12,false,true)}<TextInput keyboardType="numbers-and-punctuation" maxLength={3} value={coldThreshold} onChangeText={setColdThreshold} style={[styles.timeInput,{width:'100%',backgroundColor:p.input,color:p.text}]}/></View></View>
   {button(alertEnabled?'UyarÄ±larÄ± yeniden planla':'Hava uyarÄ±larÄ±nÄ± aÃ§',()=>void enableAlerts())}
   {alertEnabled&&button('Hava uyarÄ±larÄ±nÄ± kapat',()=>{void stopWeatherAlerts().then(()=>{setAlertEnabled(false);setAlertStatus('UyarÄ±lar kapatÄ±ldÄ±.');}).catch(e=>Alert.alert('UyarÄ± kapatÄ±lamadÄ±',String(e)));},true)}
   {!!alertStatus&&txt(alertStatus,12,false,true)}
  </>,{marginTop:15})}</>}
  {busy&&<ActivityIndicator color={p.accent} style={{marginTop:16}}/>}
  <Text style={{color:p.sub,textAlign:'center',fontSize:11,marginTop:25}}>Hava verileri: Open-Meteo Â· Astroloji notlarÄ± eÄŸlence amaÃ§lÄ±dÄ±r.</Text>
 </ScrollView>
 <Modal visible={photoCameraOpen} animationType="slide" onRequestClose={()=>setPhotoCameraOpen(false)}>
  <View style={{flex:1,backgroundColor:'#100F2B'}}>
   {CameraComponent&&<CameraComponent ref={cameraRef} style={{flex:1}} facing="back" onCameraReady={()=>setPhotoCameraReady(true)} onMountError={event=>{setPhotoCameraReady(false);Alert.alert('Kamera aÃ§Ä±lamadÄ±',event.message);}}/>}
   <View style={{padding:20,paddingBottom:35,backgroundColor:'#100F2B'}}>
    <Pressable accessibilityRole="button" disabled={!photoCameraReady||photoCapturing} onPress={()=>void takeJournalPhoto()} style={{backgroundColor:'#F5D8A7',borderRadius:16,padding:17,opacity:photoCameraReady&&!photoCapturing?1:.5}}><Text style={{textAlign:'center',color:'#281C44',fontWeight:'800'}}>{photoCapturing?'FotoÄŸraf kaydediliyorâ€¦':photoCameraReady?'ğŸ“· FotoÄŸrafÄ± Ã§ek':'Kamera hazÄ±rlanÄ±yorâ€¦'}</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={()=>setPhotoCameraOpen(false)} style={{padding:16}}><Text style={{textAlign:'center',color:'#FFF2E8'}}>VazgeÃ§</Text></Pressable>
   </View>
  </View>
 </Modal>
 </SafeAreaView>;
}
export default function App(){return <SafeAreaProvider><Root/></SafeAreaProvider>;}
const styles=StyleSheet.create({
 page:{paddingHorizontal:14,paddingTop:8,paddingBottom:44},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,paddingBottom:5},headerAction:{width:38,height:38,borderRadius:24,borderWidth:1,alignItems:'center',justifyContent:'center'},planetStrip:{flexDirection:'row',justifyContent:'space-around',marginTop:12,gap:5,position:'relative'},planetLine:{position:'absolute',top:23,left:25,right:25,height:1},miniPlanet:{flex:1,alignItems:'center',gap:4},planetOrb:{width:47,height:47,borderWidth:1,borderRadius:25,alignItems:'center',justifyContent:'center'},zodiacWheel:{marginTop:15,alignSelf:'center',width:'100%',maxWidth:290,aspectRatio:1,borderWidth:2,borderColor:'#CDA77D',borderRadius:150,padding:18,justifyContent:'center'},wheelGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:7},wheelSign:{width:'29%',height:48,borderRadius:13,alignItems:'center',justifyContent:'center'},nav:{flexDirection:'row',gap:4,marginTop:16,marginBottom:10,borderWidth:1,borderRadius:35,padding:5},navItem:{flex:1,paddingVertical:12,paddingHorizontal:2,borderRadius:28,alignItems:'center'},hero:{borderRadius:20,minHeight:185,flexDirection:'row',justifyContent:'space-between',paddingTop:12,paddingBottom:8},panel:{borderWidth:1,borderRadius:24,padding:15},button:{paddingVertical:15,borderRadius:15,alignItems:'center',marginTop:15},search:{flexDirection:'row',alignItems:'center',gap:9,marginTop:13},input:{flex:1,minWidth:0,borderWidth:1,borderRadius:14,padding:12,fontSize:14},go:{paddingVertical:14,paddingHorizontal:17,borderRadius:14},facts:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:15},fact:{width:'48%',flexGrow:1,borderWidth:1,borderRadius:18,padding:14,gap:3},forecast:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:14,borderBottomWidth:1},signs:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:17},sign:{width:'31%',flexGrow:1,alignItems:'center',borderRadius:15,paddingVertical:14,gap:4},switchRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginVertical:12},sectionHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},heroLeft:{flex:1,alignItems:'flex-start'},heroRight:{width:'37%',alignItems:'flex-start',gap:2},zodiacRow:{flexDirection:'row',gap:9,marginTop:12},wheelPanel:{width:'48%',borderWidth:1,borderRadius:23,alignItems:'center',justifyContent:'center',overflow:'hidden'},zodiacPanel:{flex:1,borderWidth:1,borderRadius:23,padding:12,minHeight:185},voiceBanner:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:24,borderWidth:1,marginTop:12},playIcon:{height:43,width:43,borderRadius:24,alignItems:'center',justifyContent:'center'},bottomRow:{flexDirection:'row',gap:9,marginTop:12},weatherTile:{flex:1,minWidth:0,borderWidth:1,borderRadius:22,padding:12},adviceButton:{borderRadius:16,paddingVertical:9,paddingHorizontal:7,alignItems:'center'},hourTile:{width:76,borderWidth:1,borderRadius:15,padding:9,alignItems:'center'},moodRow:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:15},moodChip:{borderRadius:16,paddingVertical:10,paddingHorizontal:12},journalInput:{borderWidth:1,borderRadius:14,minHeight:100,textAlignVertical:'top',padding:12,marginTop:14,fontSize:14},timeInput:{width:66,textAlign:'center',fontSize:23,fontWeight:'800',borderRadius:12,padding:10}
});

