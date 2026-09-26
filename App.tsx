import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { getVoiceAudio } from './cloudVoice';
import type { VoiceProfile } from './voiceConfig';
import { skyAt, symbolicReading } from './astronomy';
import { MoonDisc, SkyAtmosphere, ZodiacWheel } from './CelestialVisuals';
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
 day: { bg:'#F8DDE2',panel:'rgba(255,253,250,0.90)',hero:'rgba(255,244,237,0.82)',text:'#403052',sub:'#735D85',accent:'#6F4B89',line:'rgba(255,255,255,0.8)',input:'rgba(255,255,255,0.65)',button:'#FFF9ED' },
 night: { bg:'#100F2B',panel:'rgba(35,30,67,0.83)',hero:'rgba(35,30,67,0.48)',text:'#FFF2E8',sub:'#D5C2E9',accent:'#F5D8A7',line:'rgba(211,171,227,0.43)',input:'rgba(65,48,88,0.78)',button:'#281C44' }
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
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(id);},[]);
 useEffect(()=>{AsyncStorage.multiGet(['sky.place','sky.settings']).then(values=>{
  const savedPlace=values[0][1],saved=values[1][1];
  if(savedPlace){const p=JSON.parse(savedPlace) as Place;if(Number.isFinite(p.latitude)&&Number.isFinite(p.longitude))setPlace(p);}
  if(saved){const s=JSON.parse(saved);setVoiceEnabled(s.voiceEnabled??true);setSign(s.sign??'Koç');setHour(s.hour??'08');setMinute(s.minute??'00');setTheme(s.theme??'auto');}
 }).catch(()=>{});},[]);
 useEffect(()=>{AsyncStorage.setItem('sky.settings',JSON.stringify({voiceEnabled,sign,hour,minute,theme})).catch(()=>{});},[voiceEnabled,sign,hour,minute,theme]);
 const load=useCallback(async(p:Place)=>{
  setBusy(true);setError('');
  try{
   const args=new URLSearchParams({latitude:String(p.latitude),longitude:String(p.longitude),current:'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day',daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max',timezone:'auto',forecast_days:'5'});
   const response=await fetch('https://api.open-meteo.com/v1/forecast?'+args);
   if(!response.ok)throw new Error('Hava servisine bağlanılamadı.');
   const data=await response.json() as Weather;
   if(!data.current||!data.daily?.sunrise?.length)throw new Error('Bu yer için tahmin bulunamadı.');
   setWeather(data);setPlace(p);setUpdated(new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}));await AsyncStorage.setItem('sky.place',JSON.stringify(p));
  }catch(e){setError(e instanceof Error?e.message:'Hava bilgisi alınamadı.');}
  finally{setBusy(false);}
 },[]);
 const locate=useCallback(async()=>{
  setBusy(true);setError('');
  try{
   const permission=await Location.requestForegroundPermissionsAsync();
   if(permission.status!=='granted'){setError('Konum izni verilmedi; şehir arama alanını kullanabilirsin.');return;}
   const last=await Location.getLastKnownPositionAsync({maxAge:5*60*1000,requiredAccuracy:2000}).catch(()=>null);
   const pos=last||await Promise.race([Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced}),new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error('Konum zaman aşımı')),12000))]);
   const {latitude,longitude}=pos.coords;
   let name='Konumum';
   try{const addresses=await Location.reverseGeocodeAsync({latitude,longitude});name=addresses[0]?.city||addresses[0]?.subregion||addresses[0]?.region||name;}catch{}
   await load({name,latitude,longitude});
  }catch{setError('Konum belirlenemedi. Şehir adıyla arama yapabilirsin.');}
  finally{setBusy(false);}
 },[load]);
 useEffect(()=>{if(place)void load(place);else void locate();},[]);
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
   await load({name:match.name+(match.admin1&&match.admin1!==match.name?', '+match.admin1:''),latitude:match.latitude,longitude:match.longitude});
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
 const narration=useMemo(()=>{
  if(!current||!daily)return '';
  const rain=daily.precipitation_probability_max[0]||0;
  const advice=rain>=50?'Şemsiyeni yanına almayı unutma.':current.wind_speed_10m>=45?'Rüzgâr güçlü, dışarıda dikkatli ol.':daily.temperature_2m_min[0]<=5?'Sabah serinliği için kalın giyin.':daily.temperature_2m_max[0]>=32?'Sıcak havada bol su iç.':'Günün tadını çıkar.';
  return 'Merhaba. '+(place?.name||'Bulunduğun yer')+' için gökyüzünün sesine hoş geldin. Şu anda hava '+label(current.weather_code).toLocaleLowerCase('tr-TR')+'. Sıcaklık '+num(current.temperature_2m)+', hissedilen '+num(current.apparent_temperature)+' derece. Günün en düşük sıcaklığı '+num(daily.temperature_2m_min[0])+', en yükseği '+num(daily.temperature_2m_max[0])+' derece. Yağış olasılığı yüzde '+num(rain)+'. Güneş '+time(rise)+' saatinde doğuyor, '+time(set)+' saatinde batıyor. '+advice;
 },[current,daily,place,rise,set]);
 async function speakNative(profile:VoiceProfile){
  if(speaking){await Speech.stop();setSpeaking(false);return;}
  if(!voiceEnabled){Alert.alert('Ses kapalı','Ayarlar bölümünden sesli rehberi aç.');return;}
  const reading=profile==='weather'?narration:symbolicReading(sign,astronomy);
  if(!reading)return;
  try{
   const voices=await Speech.getAvailableVoicesAsync();
   const tr=voices.filter(v=>v.language?.toLowerCase().startsWith('tr'));
   const voice=tr.find(v=>String(v.quality).toLowerCase()==='enhanced')||tr[0];
   await Speech.stop();
   setSpeaking(true);
   Speech.speak(reading,{language:'tr-TR',voice:voice?.identifier,rate:0.91,pitch:1,onDone:()=>setSpeaking(false),onStopped:()=>setSpeaking(false),onError:()=>setSpeaking(false)});
  }catch{setSpeaking(false);Alert.alert('Ses hatası','Cihazın Türkçe ses paketini kontrol et.');}
 }
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
     ? {profile:'weather' as const,latitude:place!.latitude,longitude:place!.longitude,place:place!.name}
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
   Alert.alert('Bulut seslendirmesi açılamadı',reason+' Yerel Türkçe sesle devam etmek ister misin?',[
    {text:'Vazgeç',style:'cancel'},
    {text:'Yerel ses',onPress:()=>{void speakNative(profile);}},
   ]);
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
    refreshControl={<RefreshControl refreshing={busy} onRefresh={()=>place?void load(place):void locate()} tintColor={p.accent}/>}
    contentContainerStyle={styles.page}>
  <View style={styles.header}>
    <View style={{flex:1,minWidth:0}}>
      <Text style={{color:p.accent,fontSize:13,letterSpacing:3,marginBottom:4}}>☾ ✧ ✦</Text>
      {txt('Gökyüzünün Sesi',29,true)}
      {txt(dark?'Evren hep seninle konuşuyor…':'Her yeni gün, yeni bir ihtimal…',13,false,true)}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Ayarları aç" onPress={()=>setScreen('settings')}
      style={[styles.headerAction,{backgroundColor:p.panel,borderColor:p.line}]}>
      <Text style={{color:p.accent,fontSize:25}}>⚙</Text>
    </Pressable>
  </View>
  <View style={[styles.nav,{borderColor:p.line,backgroundColor:p.panel}]}>
    {([['weather','☀  Bugün'],['sky','♄  Gezegenler'],['zodiac','♈  Burcum']] as const).map(([id,title])=>
      <Pressable accessibilityRole="button" key={id} onPress={()=>setScreen(id)}
       style={[styles.navItem,{backgroundColor:screen===id?p.accent:'transparent'}]}>
       <Text numberOfLines={1} style={{color:screen===id?p.button:p.text,fontSize:12,fontWeight:'800'}}>{title}</Text>
      </Pressable>)}
  </View>
   {!!error&&panel(<>{txt('⚠️ '+error,14)}{button('Tekrar dene',()=>place?void load(place):void locate(),true)}</>,{marginBottom:15})}
  {screen==='weather'&&<>
   <View style={[styles.hero,{backgroundColor:p.hero,borderColor:p.line,borderWidth:1}]}>
    <Text style={{textAlign:'center',color:p.accent,letterSpacing:5}}>✦    ·   ✧   ·    ✦</Text>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:12}}>
      <View style={{flex:1,gap:5}}>
       {txt(new Date(now).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'}),18,true)}
       {txt(new Date(now).toLocaleDateString('tr-TR',{weekday:'long'}),12,false,true)}
      </View>
      <Text style={{fontSize:11,color:p.accent,letterSpacing:2}}>{dark?'YILDIZLI GECE':'GÜNE MERHABA'}</Text>
    </View>
    <View style={{alignItems:'center',marginVertical:3}}>
      <MoonDisc night={dark} phaseName={astronomy.phaseName} illuminated={astronomy.illuminated} size={158}/>
    </View>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10}}>
      <View style={{flex:1}}>{txt('📍 '+(place?.name||'Konum belirleniyor'),14,true)}{txt(dark?'Gökyüzüne bir dilek bırak.':'Işığın yolunu takip et.',12,false,true)}</View>
      <View style={{alignItems:'flex-end',flex:1}}>{txt('Ay Fazı',13,false,true)}{txt(astronomy.phaseName,18,true)}{txt('%'+astronomy.illuminated+' aydınlık',13,false,true)}</View>
    </View>
    <Text style={{textAlign:'center',color:p.accent,marginTop:10,fontSize:11}}>✧  ✦  ✧</Text>
   </View>
   {panel(<>{txt('☾ Gökyüzü takvimi',21,true)}{txt('Bugünün hesaplanan gök cisimleri',12,false,true)}<View style={styles.planetStrip}>{astronomy.bodies.slice(1,6).map(body=><Pressable key={body.name} accessibilityRole="button" onPress={()=>{setSelectedPlanet(body.name);setScreen('sky');}} style={styles.miniPlanet}><Text style={{fontSize:24}}>{body.icon}</Text>{txt(body.name,12,true)}{txt(body.sign,11,false,true)}</Pressable>)}</View>{button('Tüm gezegenleri incele ›',()=>setScreen('sky'),true)}</>,{marginTop:15})}
   {panel(<>
     {txt('✧ Senin Burcun',21,true)}
     <ZodiacWheel night={dark} active={Math.max(0,SIGNS.indexOf(sign))} onSelect={i=>setSign(SIGNS[i])}/>
     <View style={{flexDirection:'row',alignItems:'center',gap:12,marginTop:8}}>
       <Text style={{fontSize:38,color:p.accent}}>{ICONS[SIGNS.indexOf(sign)]}</Text>
       <View style={{flex:1}}>{txt(sign,23,true)}{txt('Günün sembolik gökyüzü yorumu',12,false,true)}</View>
     </View>
     <View style={{marginTop:10}}>{txt(symbolicReading(sign,astronomy),14)}</View>
     {button('Burcumun tamamını gör  ›',()=>setScreen('zodiac'),true)}
   </>,{marginTop:15})}
   {panel(<>{txt('🔎 Şehir ara',18,true)}<View style={styles.search}><TextInput value={query} onChangeText={setQuery} onSubmitEditing={()=>void searchCity()} returnKeyType="search" placeholder="İstanbul, Ankara, İzmir..." placeholderTextColor={p.sub} style={[styles.input,{backgroundColor:p.input,color:p.text,borderColor:p.line}]}/><Pressable style={[styles.go,{backgroundColor:p.accent}]} onPress={()=>void searchCity()} disabled={busy}><Text style={{color:p.button,fontWeight:'800'}}>Ara</Text></Pressable></View>{button('📍 Konumumu kullan',()=>void locate(),true)}</>,{marginTop:15})}
   {current&&daily&&<><View style={styles.facts}>{fact('🌡️','Hissedilen',num(current.apparent_temperature)+'°')}{fact('💧','Yağış', '%'+num(daily.precipitation_probability_max[0]))}{fact('🍃','Rüzgâr',num(current.wind_speed_10m)+' km/sa')}{fact('☁️','Nem','%'+num(current.relative_humidity_2m))}</View>
   {panel(<>{txt('🎙️ Günün sesli rehberi',20,true)}<View style={{marginTop:9}}>{txt(narration,14)}</View>{button(voiceLoading==='weather'?'⏳ Ses hazırlanıyor…':activeVoice==='weather'?'■ Durdur':'▶ Doğal sesle dinle',()=>void playVoice('weather'))}{voiceLoading==='weather'&&<ActivityIndicator color={p.accent}/>}</>,{marginTop:16})}
   {panel(<>{txt('Önümüzdeki günler',20,true)}{daily.time.slice(1,5).map((d,i)=><View key={d} style={[styles.forecast,{borderColor:p.line}]}><Text style={{fontSize:23}}>{symbol(daily.weather_code[i+1],dark)}</Text><View style={{flex:1}}>{txt(new Date(d+'T12:00:00').toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'}),13,true)}{txt(label(daily.weather_code[i+1])+' · Yağış %'+num(daily.precipitation_probability_max[i+1]),11,false,true)}</View>{txt(num(daily.temperature_2m_min[i+1])+'° / '+num(daily.temperature_2m_max[i+1])+'°',12,true)}</View>)}</>,{marginTop:16})}</>}
  </>}
  {screen==='sky'&&<>{panel(<>{txt('🌙 Ay fazı · '+astronomy.phaseName,23,true)}{txt('Ay aydınlığı: %'+astronomy.illuminated,16)}{txt('Hesaplanan an: '+new Date(astronomy.date).toLocaleString('tr-TR'),12,false,true)}{daily?<View style={styles.facts}>{fact('🌅','Gün doğumu',time(rise))}{fact('🌇','Gün batımı',time(set))}{fact('☀️','UV endeksi',num(daily.uv_index_max[0]))}{fact(symbol(daily.weather_code[0],dark),'Hava',label(daily.weather_code[0]))}</View>:null}</>)}
  {panel(<>{txt('🪐 Gerçek gezegen konumları',22,true)}{txt('Dünya merkezli ekliptik boylam; tropikal zodyak bölümleri. Bir cisme dokunarak ayrıntısını gör.',12,false,true)}
  {astronomy.bodies.map(body=><Pressable key={body.name} accessibilityRole="button" onPress={()=>setSelectedPlanet(selectedPlanet===body.name?null:body.name)} style={[styles.forecast,{borderColor:p.line}]}><Text style={{fontSize:27}}>{body.icon}</Text><View style={{flex:1}}>{txt(body.name,16,true)}{txt(body.sign+' · '+body.degree.toFixed(1)+'°',13,false,true)}{selectedPlanet===body.name&&txt('Ekliptik boylam: '+body.longitude.toFixed(2)+'°. Bu astronomik koordinattır; gökyüzünde görünürlük hava koşullarına bağlıdır.',12)}</View>{txt('›',23,true)}</Pressable>)}
  {button('🔄 Konumları güncelle',()=>setNow(Date.now()),true)}</>,{marginTop:15})}</>}
  {screen==='zodiac'&&<>{panel(<>{txt('♈ Burç günlüğü',24,true)}{txt('Aşağıdaki konumlar hesaplanmıştır. Astrolojik yorum semboliktir; bilimsel kişisel tahmin değildir.',13,false,true)}<View style={styles.signs}>{SIGNS.map((s,i)=><Pressable accessibilityRole="button" key={s} onPress={()=>setSign(s)} style={[styles.sign,{backgroundColor:s===sign?p.accent:p.input}]}><Text style={{fontSize:26}}>{ICONS[i]}</Text><Text style={{color:s===sign?p.button:p.text,fontWeight:'800'}}>{s}</Text></Pressable>)}</View></>)}{panel(<>{txt(ICONS[SIGNS.indexOf(sign)]+' '+sign+' · Günün gökyüzü',20,true)}{txt(symbolicReading(sign,astronomy),15)}{button(voiceLoading==='astrology'?'⏳ Ses hazırlanıyor…':activeVoice==='astrology'?'■ Durdur':'▶ Astroloji yorumunu dinle',()=>void playVoice('astrology'))}{voiceLoading==='astrology'&&<ActivityIndicator color={p.accent}/>} {button('🪐 Konumları incele',()=>setScreen('sky'),true)}</>,{marginTop:15})}</>}
  {screen==='settings'&&<>{panel(<>{txt('⚙️ Görünüm',22,true)}{txt('Otomatik tema, seçili konumun güneş doğuş ve batış saatlerini izler.',13,false,true)}<View style={styles.nav}>{(['auto','day','night'] as const).map((v)=><Pressable key={v} onPress={()=>setTheme(v)} style={[styles.navItem,{backgroundColor:theme===v?p.accent:p.input}]}><Text style={{color:theme===v?p.button:p.text,fontWeight:'800'}}>{v==='auto'?'Otomatik':v==='day'?'☀️ Gündüz':'🌙 Gece'}</Text></Pressable>)}</View></>)}{panel(<>{txt('🎙️ Seslendirme',22,true)}<View style={styles.switchRow}>{txt('Sesli rehber',15)}<Switch value={voiceEnabled} onValueChange={setVoiceEnabled}/></View>{txt('Hava durumu ve astroloji için ayrı ElevenLabs Türkçe kadın sesleri kullanılır. Bulut servisi kapalıysa yerel ses isteğe bağlı yedektir.',12,false,true)}{button(voiceLoading==='weather'?'⏳ Ses hazırlanıyor…':activeVoice==='weather'?'■ Hava sesini durdur':'▶ Hava sesini dene',()=>void playVoice('weather'))}{button(voiceLoading==='astrology'?'⏳ Ses hazırlanıyor…':activeVoice==='astrology'?'■ Astroloji sesini durdur':'▶ Astroloji sesini dene',()=>void playVoice('astrology'),true)}</>,{marginTop:15})}{panel(<>{txt('⏰ Hatırlatma tercihi',22,true)}{txt('Seçtiğin saatte günlük yerel hatırlatma gönderilir. Bildirim yeni hava verisi değil, uygulamayı açma hatırlatmasıdır.',13,false,true)}<View style={styles.search}><TextInput keyboardType="number-pad" maxLength={2} accessibilityLabel="Saat" value={hour} onChangeText={setHour} style={[styles.timeInput,{backgroundColor:p.input,color:p.text}]}/>{txt(':',24,true)}<TextInput keyboardType="number-pad" maxLength={2} accessibilityLabel="Dakika" value={minute} onChangeText={setMinute} style={[styles.timeInput,{backgroundColor:p.input,color:p.text}]}/></View>{button(notificationActive?'Hatırlatma saatini güncelle':'Günlük bildirimi aç',()=>{void (async()=>{if(!/^\d{1,2}$/.test(hour)||!/^\d{1,2}$/.test(minute)||Number(hour)>23||Number(minute)>59){Alert.alert('Geçersiz saat','00:00–23:59 arasında bir saat gir.');return;}try{await setDailyNotification(Number(hour),Number(minute));setHour(hour.padStart(2,'0'));setMinute(minute.padStart(2,'0'));setNotificationActive(true);Alert.alert('Bildirim kuruldu', 'Her gün '+hour.padStart(2,'0')+':'+minute.padStart(2,'0')+' saatinde hatırlatma planlandı.');}catch(e){Alert.alert('Bildirim açılamadı',e instanceof Error?e.message:'Bildirim iznini kontrol et.');}})();})}
  {notificationActive&&button('Bildirimleri kapat',()=>{void stopDailyNotification().then(()=>{setNotificationActive(false);Alert.alert('Kapatıldı','Günlük hatırlatma iptal edildi.');}).catch(()=>Alert.alert('Hata','Bildirim kaldırılamadı.'));},true)}</>,{marginTop:15})}</>}
  {busy&&<ActivityIndicator color={p.accent} style={{marginTop:16}}/>}
  <Text style={{color:p.sub,textAlign:'center',fontSize:11,marginTop:25}}>Hava verileri: Open-Meteo · Astroloji notları eğlence amaçlıdır.</Text>
 </ScrollView></SafeAreaView>;
}
export default function App(){return <SafeAreaProvider><Root/></SafeAreaProvider>;}
const styles=StyleSheet.create({
 page:{paddingHorizontal:18,paddingTop:22,paddingBottom:40},planetStrip:{flexDirection:'row',justifyContent:'space-around',marginTop:20,gap:5},miniPlanet:{flex:1,alignItems:'center',gap:3},zodiacWheel:{marginTop:15,alignSelf:'center',width:'100%',maxWidth:290,aspectRatio:1,borderWidth:2,borderColor:'#CDA77D',borderRadius:150,padding:18,justifyContent:'center'},wheelGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:7},wheelSign:{width:'29%',height:48,borderRadius:13,alignItems:'center',justifyContent:'center'},nav:{flexDirection:'row',gap:6,marginTop:19,marginBottom:20},navItem:{flex:1,paddingVertical:13,borderRadius:13,alignItems:'center'},hero:{borderRadius:28,padding:22,minHeight:200},panel:{borderWidth:1,borderRadius:23,padding:19},button:{paddingVertical:15,borderRadius:15,alignItems:'center',marginTop:15},search:{flexDirection:'row',alignItems:'center',gap:9,marginTop:13},input:{flex:1,minWidth:0,borderWidth:1,borderRadius:14,padding:12,fontSize:14},go:{paddingVertical:14,paddingHorizontal:17,borderRadius:14},facts:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:15},fact:{width:'48%',flexGrow:1,borderWidth:1,borderRadius:18,padding:14,gap:3},forecast:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:14,borderBottomWidth:1},signs:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:17},sign:{width:'31%',flexGrow:1,alignItems:'center',borderRadius:15,paddingVertical:14,gap:4},switchRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginVertical:12},timeInput:{width:66,textAlign:'center',fontSize:23,fontWeight:'800',borderRadius:12,padding:10}
});
