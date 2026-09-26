import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { getVoiceAudio, getVoiceProfileStatus } from './cloudVoice';
import type { VoiceProfile } from './voiceConfig';
import { skyAt, symbolicReading } from './astronomy';
import { MoonDisc, SkyAtmosphere, SunDisc, ZodiacWheel } from './CelestialVisuals';
import { dailyNotificationEnabled, setDailyNotification, stopDailyNotification } from './notifications';

type Place = { name: string; latitude: number; longitude: number };
type Weather = {
 utc_offset_seconds?: number;
 current: { temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; wind_speed_10m: number; weather_code: number; is_day: number };
 daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[]; sunrise: string[]; sunset: string[]; uv_index_max: number[] };
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
 const [screen,setScreen]=useState<'weather'|'sky'|'zodiac'|'settings'>('weather');
 const [weather,setWeather]=useState<Weather|null>(null);
 const [place,setPlace]=useState<Place|null>(null);
 const [locationMode,setLocationMode]=useState<'gps'|'city'>('gps');
 const [hydrated,setHydrated]=useState(false);
 const bootPlaceRef=useRef<Place|null>(null);
 const lastFetchRef=useRef(0);
 const [query,setQuery]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [speaking,setSpeaking]=useState(false);
 const [voiceLoading,setVoiceLoading]=useState<VoiceProfile|null>(null);
 const [activeVoice,setActiveVoice]=useState<VoiceProfile|null>(null);
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
 const astronomy=useMemo(()=>skyAt(new Date(now)),[now]);
 useEffect(()=>{dailyNotificationEnabled().then(setNotificationActive).catch(()=>{});},[]);
 useEffect(()=>{getVoiceProfileStatus().then(setVoiceProfiles).catch(()=>{});},[]);
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(id);},[]);
 useEffect(()=>{AsyncStorage.multiGet(['sky.place','sky.settings','sky.locationMode']).then(values=>{
  const savedPlace=values[0][1],saved=values[1][1];
  if(savedPlace){const p=JSON.parse(savedPlace) as Place;if(Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)){bootPlaceRef.current=p;setPlace(p);}}
  setLocationMode(values[2][1]==='city'?'city':'gps');
  if(saved){const s=JSON.parse(saved);setVoiceEnabled(s.voiceEnabled??true);setSign(s.sign??'Koç');setHour(s.hour??'08');setMinute(s.minute??'00');setTheme(s.theme??'auto');}
 }).catch(()=>{}).finally(()=>setHydrated(true));},[]);
 useEffect(()=>{if(hydrated)AsyncStorage.setItem('sky.settings',JSON.stringify({voiceEnabled,sign,hour,minute,theme})).catch(()=>{});},[hydrated,voiceEnabled,sign,hour,minute,theme]);
 const load=useCallback(async(p:Place,source:'gps'|'city'='city')=>{
  setBusy(true);setError('');
  try{
   const args=new URLSearchParams({latitude:String(p.latitude),longitude:String(p.longitude),current:'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day',daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max',timezone:'auto',forecast_days:'5'});
   const response=await fetch('https://api.open-meteo.com/v1/forecast?'+args);
   if(!response.ok)throw new Error('Hava servisine bağlanılamadı.');
   const data=await response.json() as Weather;
   if(!data.current||!data.daily?.sunrise?.length)throw new Error('Bu yer için tahmin bulunamadı.');
   setWeather(data);setPlace(p);setLocationMode(source);lastFetchRef.current=Date.now();setUpdated(new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}));await AsyncStorage.multiSet([['sky.place',JSON.stringify(p)],['sky.locationMode',source]]);
  }catch(e){setError(e instanceof Error?e.message:'Hava bilgisi alınamadı.');}
  finally{setBusy(false);}
 },[]);
 const locate=useCallback(async()=>{
  setBusy(true);setError('');
  try{
   const permission=await Location.requestForegroundPermissionsAsync();
   if(permission.status!=='granted'){setError('Konum izni verilmedi; şehir arama alanını kullanabilirsin.');return;}
   const pos=await Promise.race([Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High}),new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('Konum zaman aşımı')),25000))]);
   const {latitude,longitude}=pos.coords;
   let name='Konumum';
   try{const addresses=await Location.reverseGeocodeAsync({latitude,longitude});const a=addresses[0];name=(a?.city?.includes('Köyü')?a?.region:a?.city)||a?.region||a?.subregion||name;}catch{}
   await load({name,latitude,longitude},'gps');
  }catch(e){setError((e instanceof Error?e.message:'Konum belirlenemedi.')+' GPS ve konum iznini kontrol et veya şehir adıyla ara.');}
  finally{setBusy(false);}
 },[load]);
 useEffect(()=>{if(!hydrated)return;if(locationMode==='city'&&bootPlaceRef.current)void load(bootPlaceRef.current,'city');else void locate();},[hydrated]);
 useEffect(()=>{const tick=setInterval(()=>{if(place&&!busy&&Date.now()-lastFetchRef.current>=30*60_000){if(locationMode==='gps')void locate();else void load(place,'city');}},5*60_000);return()=>clearInterval(tick);},[place,busy,locationMode,load,locate]);
 useEffect(()=>{const sub=AppState.addEventListener('change',next=>{if(next==='active'){setNow(Date.now());if(place&&Date.now()-lastFetchRef.current>=15*60_000){if(locationMode==='gps')void locate();else void load(place,'city');}}});return()=>sub.remove();},[place,locationMode,load,locate]);
 async function searchCity(){
  if(!query.trim()){setError('Lütfen bir şehir adı yaz.');return;}
  setBusy(true);setError('');
  try{
   const r=await fetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(query.trim())+'&count=5&language=tr&format=json');
   if(!r.ok)throw new Error('Şehir araması yapılamadı.');
   const data=await r.json();
   const results=(data.results||[]) as Array<{name:string;country?:string;admin1?:string;latitude:number;longitude:number}>;
   const match=results.find(x=>x.country==='Türkiye'||x.country==='Turkey')||results[0];
   if(!match)throw new Error('Şehir bulunamadı; farklı bir ad dene.');
   await load({name:match.name+(match.admin1&&match.admin1!==match.name?', '+match.admin1:''),latitude:match.latitude,longitude:match.longitude},'city');
  }catch(e){setError(e instanceof Error?e.message:'Şehir bulunamadı.');}
  finally{setBusy(false);}
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
     ? {profile:'weather' as const,latitude:place!.latitude,longitude:place!.longitude,place:place!.name,
        weatherSnapshot:{temp:current!.temperature_2m,feels:current!.apparent_temperature,wind:current!.wind_speed_10m,code:current!.weather_code,
          min:daily!.temperature_2m_min[0],max:daily!.temperature_2m_max[0],rain:daily!.precipitation_probability_max[0],sunrise:rise!,sunset:set!}}
     : {profile:'astrology' as const,sign};
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
 useEffect(()=>{if(playback.didJustFinish){setActiveVoice(null);}},[playback.didJustFinish]);
 useEffect(()=>()=>{voiceRequestId.current++;player.pause();void Speech.stop();},[player]);
 const txt=(s:string,size=15,bold=false,muted=false)=> <Text style={{color:muted?p.sub:p.text,fontSize:size,fontWeight:bold?'800':'400',lineHeight:size+7}}>{s}</Text>;
 const panel=(content:React.ReactNode,style:object={})=><View style={[styles.panel,{backgroundColor:p.panel,borderColor:p.line},style]}>{content}</View>;
 const button=(text:string,action:()=>void,secondary=false)=><Pressable accessibilityRole="button" onPress={action} style={[styles.button,{backgroundColor:secondary?p.input:p.accent}]}><Text style={{color:secondary?p.text:p.button,fontWeight:'800'}}>{text}</Text></Pressable>;
 const fact=(icon:string,k:string,v:string)=><View style={[styles.fact,{backgroundColor:p.panel,borderColor:p.line}]}><Text style={{fontSize:25}}>{icon}</Text>{txt(k,12,false,true)}{txt(v,16,true)}</View>;
 return <SafeAreaView style={{flex:1,backgroundColor:p.bg}} edges={['top','bottom']}>
  <SkyAtmosphere night={dark}/>
  <StatusBar style={dark?'light':'dark'}/>
  <ScrollView keyboardShouldPersistTaps="handled"
    refreshControl={<RefreshControl refreshing={busy} onRefresh={()=>locationMode==='gps'?void locate():place?void load(place,'city'):void locate()} tintColor={p.accent}/>}
    contentContainerStyle={styles.page}>
  <View style={styles.header}>
    <Text style={{fontSize:43,color:p.accent,marginRight:8}}>☾</Text>
    <View style={{flex:1,minWidth:0}}>
      <Text style={[{color:p.text,fontSize:25},serif]}>Gökyüzünün Sesi</Text>
      <Text style={{color:p.sub,fontSize:11,fontStyle:'italic'}}>Evren hep seninle konuşuyor…</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Bildirim ayarları" onPress={()=>setScreen('settings')} style={{padding:6}}><Text style={{fontSize:26,color:p.accent}}>♧</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Ayarları aç" onPress={()=>setScreen('settings')} style={[styles.headerAction,{backgroundColor:p.panel,borderColor:p.line}]}><Text style={{color:p.accent,fontSize:22}}>⚙</Text></Pressable>
  </View>
  <View style={[styles.nav,{borderColor:p.line,backgroundColor:p.panel}]}>
    {([['weather','☀  Bugün'],['sky','♄  Gezegenler'],['zodiac','♑  Burcum']] as const).map(([id,title])=>
      <Pressable accessibilityRole="button" key={id} onPress={()=>setScreen(id)} style={[styles.navItem,{backgroundColor:screen===id?p.accent:'transparent'}]}>
       <Text numberOfLines={1} style={[{color:screen===id?p.button:p.text,fontSize:13},serif]}>{title}</Text>
      </Pressable>)}
  </View>
  {!!error&&panel(<>{txt('⚠️ '+error,14)}{button('Konumumu tekrar dene',()=>void locate(),true)}</>,{marginBottom:15})}
  {screen==='weather'&&<>
   <View style={[styles.hero,{backgroundColor:p.hero}]}>
    <View style={styles.heroLeft}>
     <Text style={[{color:p.text,fontSize:22},serif]}>{new Date(now).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'})}</Text>
     <Text style={[{color:p.text,fontSize:16},serif]}>{new Date(now).toLocaleDateString('tr-TR',{weekday:'long'})}</Text>
     <Pressable accessibilityRole="button" accessibilityLabel="Konumu değiştir" onPress={()=>setScreen('settings')} style={{marginTop:12}}><Text numberOfLines={2} style={{color:p.text,fontSize:13}}>⌖  {place?.name||'Konum aranıyor'}</Text></Pressable>
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
     <View style={styles.sectionHeading}><Text style={[{color:p.text,fontSize:19},serif]}>☾ Gökyüzü Takvimi</Text><Pressable onPress={()=>setScreen('sky')} accessibilityRole="button"><Text style={{color:p.sub,fontSize:11}}>Tüm olaylar  ›</Text></Pressable></View>
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
   {current&&daily&&<>
    <View style={styles.bottomRow}>
     <View style={[styles.weatherTile,{backgroundColor:p.panel,borderColor:p.line}]}>
      <Text numberOfLines={1} style={[{color:p.text,fontSize:13},serif]}>☾  Hava Durumu · {place?.name||'Konumum'}</Text>
      <View style={{flexDirection:'row',alignItems:'center',gap:6,marginVertical:7}}><Text style={{fontSize:32}}>{symbol(current.weather_code,dark)}</Text><View><Text style={[{color:p.text,fontSize:29},serif]}>{num(current.temperature_2m)}°</Text><Text style={{color:p.sub,fontSize:11}}>{label(current.weather_code)}</Text></View></View>
      <Pressable accessibilityRole="button" onPress={()=>void playVoice('weather')} style={[styles.adviceButton,{backgroundColor:dark?'#E8E7FC':'#735084'}]}><Text numberOfLines={1} style={{color:dark?'#24204F':'#FFFFFF',fontSize:11,fontWeight:'600'}}>{weatherAdvice}  {activeVoice==='weather'?'■':'▶'}</Text></Pressable>
     </View>
     <View style={[styles.weatherTile,{backgroundColor:p.panel,borderColor:p.line}]}><Text style={[{color:p.text,fontSize:13},serif]}>✦  Günün Gökyüzü</Text><Text style={{color:p.sub,fontSize:11,marginTop:10}}>Ay: {astronomy.phaseName}</Text><Text style={{color:p.sub,fontSize:11,marginTop:8}}>Yağış: %{num(rainChance)}</Text><Text style={{color:p.sub,fontSize:11,marginTop:8}}>Rüzgâr: {num(current.wind_speed_10m)} km/sa</Text><Text style={{color:p.sub,fontSize:10,marginTop:12}}>Son güncelleme {updated}</Text></View>
    </View>
    {panel(<>{txt('Önümüzdeki günler',19,true)}{daily.time.slice(1,5).map((d,i)=><View key={d} style={[styles.forecast,{borderColor:p.line}]}><Text style={{fontSize:23}}>{symbol(daily.weather_code[i+1],dark)}</Text><View style={{flex:1}}>{txt(new Date(d+'T12:00:00').toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'}),13,true)}{txt(label(daily.weather_code[i+1])+' · Yağış %'+num(daily.precipitation_probability_max[i+1]),11,false,true)}</View>{txt(num(daily.temperature_2m_min[i+1])+'° / '+num(daily.temperature_2m_max[i+1])+'°',12,true)}</View>)}</>,{marginTop:15})}
   </>}
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
    </>,{marginTop:15})}
  </>}
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
  {screen==='settings'&&<>{panel(<>{txt('⌖ Konum ve şehir',22,true)}{txt(place?(locationMode==='gps'?'GPS konumu · ':'Seçilen şehir · ')+place.name+' · '+place.latitude.toFixed(3)+', '+place.longitude.toFixed(3):'Konum bekleniyor',12,false,true)}<View style={styles.search}><TextInput value={query} onChangeText={setQuery} onSubmitEditing={()=>void searchCity()} returnKeyType="search" placeholder="İstanbul, Ankara, İzmir..." placeholderTextColor={p.sub} style={[styles.input,{backgroundColor:p.input,color:p.text,borderColor:p.line}]}/><Pressable style={[styles.go,{backgroundColor:p.accent}]} onPress={()=>void searchCity()} disabled={busy}><Text style={{color:p.button,fontWeight:'800'}}>Ara</Text></Pressable></View>{button('⌖ GPS konumumu kullan',()=>void locate(),true)}</>,{marginBottom:15})}{panel(<>{txt('⚙️ Görünüm',22,true)}{txt('Otomatik tema, seçili konumun güneş doğuş ve batış saatlerini izler.',13,false,true)}<View style={styles.nav}>{(['auto','day','night'] as const).map((v)=><Pressable key={v} onPress={()=>setTheme(v)} style={[styles.navItem,{backgroundColor:theme===v?p.accent:p.input}]}><Text style={{color:theme===v?p.button:p.text,fontWeight:'800'}}>{v==='auto'?'Otomatik':v==='day'?'☀️ Gündüz':'🌙 Gece'}</Text></Pressable>)}</View></>)}{panel(<>{txt('🎙️ Seslendirme',22,true)}<View style={styles.switchRow}>{txt('Sesli rehber',15)}<Switch value={voiceEnabled} onValueChange={setVoiceEnabled}/></View>{txt('Hava durumu ve astroloji için ayrı Türkçe ses profilleri kullanılır. Kadın ses profili doğrulanamazsa oynatma durur; cihazın erkek sesine geçilmez.',12,false,true)}{voiceProfiles&&txt('Hava sesi: '+(voiceProfiles.weather==='female'?'kadın etiketi doğrulandı':voiceProfiles.weather==='female-description-unverified'?'kadın ses açıklaması; dinleyerek kontrol et':'ses doğrulanamadı')+' · Astroloji sesi: '+(voiceProfiles.astrology==='female'?'kadın etiketi doğrulandı':voiceProfiles.astrology==='female-description-unverified'?'kadın ses açıklaması; dinleyerek kontrol et':'ses doğrulanamadı'),12,false,true)}{button(voiceLoading==='weather'?'⏳ Ses hazırlanıyor…':activeVoice==='weather'?'■ Hava sesini durdur':'▶ Hava sesini dene',()=>void playVoice('weather'))}{button(voiceLoading==='astrology'?'⏳ Ses hazırlanıyor…':activeVoice==='astrology'?'■ Astroloji sesini durdur':'▶ Astroloji sesini dene',()=>void playVoice('astrology'),true)}</>,{marginTop:15})}{panel(<>{txt('⏰ Hatırlatma tercihi',22,true)}{txt('Seçtiğin saatte günlük yerel hatırlatma gönderilir. Bildirim yeni hava verisi değil, uygulamayı açma hatırlatmasıdır.',13,false,true)}<View style={styles.search}><TextInput keyboardType="number-pad" maxLength={2} accessibilityLabel="Saat" value={hour} onChangeText={setHour} style={[styles.timeInput,{backgroundColor:p.input,color:p.text}]}/>{txt(':',24,true)}<TextInput keyboardType="number-pad" maxLength={2} accessibilityLabel="Dakika" value={minute} onChangeText={setMinute} style={[styles.timeInput,{backgroundColor:p.input,color:p.text}]}/></View>{button(notificationActive?'Hatırlatma saatini güncelle':'Günlük bildirimi aç',()=>{void (async()=>{if(!/^\d{1,2}$/.test(hour)||!/^\d{1,2}$/.test(minute)||Number(hour)>23||Number(minute)>59){Alert.alert('Geçersiz saat','00:00–23:59 arasında bir saat gir.');return;}try{await setDailyNotification(Number(hour),Number(minute));setHour(hour.padStart(2,'0'));setMinute(minute.padStart(2,'0'));setNotificationActive(true);Alert.alert('Bildirim kuruldu', 'Her gün '+hour.padStart(2,'0')+':'+minute.padStart(2,'0')+' saatinde hatırlatma planlandı.');}catch(e){Alert.alert('Bildirim açılamadı',e instanceof Error?e.message:'Bildirim iznini kontrol et.');}})();})}
  {notificationActive&&button('Bildirimleri kapat',()=>{void stopDailyNotification().then(()=>{setNotificationActive(false);Alert.alert('Kapatıldı','Günlük hatırlatma iptal edildi.');}).catch(()=>Alert.alert('Hata','Bildirim kaldırılamadı.'));},true)}</>,{marginTop:15})}</>}
  {busy&&<ActivityIndicator color={p.accent} style={{marginTop:16}}/>}
  <Text style={{color:p.sub,textAlign:'center',fontSize:11,marginTop:25}}>Hava verileri: Open-Meteo · Astroloji notları eğlence amaçlıdır.</Text>
 </ScrollView></SafeAreaView>;
}
export default function App(){return <SafeAreaProvider><Root/></SafeAreaProvider>;}
const styles=StyleSheet.create({
 page:{paddingHorizontal:14,paddingTop:8,paddingBottom:44},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,paddingBottom:5},headerAction:{width:38,height:38,borderRadius:24,borderWidth:1,alignItems:'center',justifyContent:'center'},planetStrip:{flexDirection:'row',justifyContent:'space-around',marginTop:12,gap:5,position:'relative'},planetLine:{position:'absolute',top:23,left:25,right:25,height:1},miniPlanet:{flex:1,alignItems:'center',gap:4},planetOrb:{width:47,height:47,borderWidth:1,borderRadius:25,alignItems:'center',justifyContent:'center'},zodiacWheel:{marginTop:15,alignSelf:'center',width:'100%',maxWidth:290,aspectRatio:1,borderWidth:2,borderColor:'#CDA77D',borderRadius:150,padding:18,justifyContent:'center'},wheelGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:7},wheelSign:{width:'29%',height:48,borderRadius:13,alignItems:'center',justifyContent:'center'},nav:{flexDirection:'row',gap:4,marginTop:16,marginBottom:10,borderWidth:1,borderRadius:35,padding:5},navItem:{flex:1,paddingVertical:12,paddingHorizontal:2,borderRadius:28,alignItems:'center'},hero:{borderRadius:20,minHeight:185,flexDirection:'row',justifyContent:'space-between',paddingTop:12,paddingBottom:8},panel:{borderWidth:1,borderRadius:24,padding:15},button:{paddingVertical:15,borderRadius:15,alignItems:'center',marginTop:15},search:{flexDirection:'row',alignItems:'center',gap:9,marginTop:13},input:{flex:1,minWidth:0,borderWidth:1,borderRadius:14,padding:12,fontSize:14},go:{paddingVertical:14,paddingHorizontal:17,borderRadius:14},facts:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:15},fact:{width:'48%',flexGrow:1,borderWidth:1,borderRadius:18,padding:14,gap:3},forecast:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:14,borderBottomWidth:1},signs:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:17},sign:{width:'31%',flexGrow:1,alignItems:'center',borderRadius:15,paddingVertical:14,gap:4},switchRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginVertical:12},sectionHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},heroLeft:{flex:1,alignItems:'flex-start'},heroRight:{width:'37%',alignItems:'flex-start',gap:2},zodiacRow:{flexDirection:'row',gap:9,marginTop:12},wheelPanel:{width:'48%',borderWidth:1,borderRadius:23,alignItems:'center',justifyContent:'center',overflow:'hidden'},zodiacPanel:{flex:1,borderWidth:1,borderRadius:23,padding:12,minHeight:185},voiceBanner:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:24,borderWidth:1,marginTop:12},playIcon:{height:43,width:43,borderRadius:24,alignItems:'center',justifyContent:'center'},bottomRow:{flexDirection:'row',gap:9,marginTop:12},weatherTile:{flex:1,minWidth:0,borderWidth:1,borderRadius:22,padding:12},adviceButton:{borderRadius:16,paddingVertical:9,paddingHorizontal:7,alignItems:'center'},timeInput:{width:66,textAlign:'center',fontSize:23,fontWeight:'800',borderRadius:12,padding:10}
});
