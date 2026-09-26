import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Place = { name: string; latitude: number; longitude: number };
type Weather = {
 current: { temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; wind_speed_10m: number; weather_code: number; is_day: number };
 daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[]; sunrise: string[]; sunset: string[]; uv_index_max: number[] };
};
const SIGNS = ['Koç','Boğa','İkizler','Yengeç','Aslan','Başak','Terazi','Akrep','Yay','Oğlak','Kova','Balık'];
const ICONS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const NOTES = ['Bugün önceliklerini sakinlikle seç.','Küçük bir adım için kendine alan aç.','Merak ettiğin bir konuya zaman ayır.','Sevdiklerinle bağ kur.','Yaratıcı fikrini paylaş.','Detaylarla uğraşırken dinlenmeyi unutma.','Kararlarında dengeyi gözet.','Düşüncelerini yazıya dök.','Yeni bir şey öğren.','Hedeflerin için küçük bir plan yap.','Farklı bir fikre kulak ver.','Hayal gücünü somut bir adımla birleştir.'];
const PALETTE = {
 day: { bg:'#F1F8FF',panel:'#FFFFFF',hero:'#DBEFFF',text:'#1B3963',sub:'#607B9A',accent:'#2A67BF',line:'#D6E4F4',input:'#EAF4FF',button:'#FFFFFF' },
 night: { bg:'#080F28',panel:'#162347',hero:'#1C3164',text:'#F5F4FF',sub:'#B9C7E7',accent:'#A7C0FF',line:'#344874',input:'#243760',button:'#0B1836' }
};
function label(code:number) { if(code>=95)return 'Gök gürültülü yağış'; if(code>=71&&code<=77||code>=85&&code<=86)return 'Karlı'; if(code>=51&&code<=67||code>=80&&code<=82)return 'Yağmurlu'; if(code>=45&&code<=48)return 'Sisli'; if(code>=3)return 'Bulutlu'; if(code>=1)return 'Parçalı bulutlu'; return 'Açık'; }
function symbol(code:number,dark:boolean){ if(code>=95)return '⛈️'; if(code>=71&&code<=77||code>=85&&code<=86)return '❄️'; if(code>=51&&code<=67||code>=80&&code<=82)return '🌧️'; if(code>=45&&code<=48)return '🌫️'; if(code>=1&&code<=3)return '☁️'; return dark?'🌙':'☀️'; }
const time=(s?:string)=>s?.split('T')[1]?.slice(0,5)||'—';
const num=(n?:number)=>Number.isFinite(n)?String(Math.round(n!)):'—';
function Root(){
 const [screen,setScreen]=useState<'weather'|'sky'|'zodiac'|'settings'>('weather');
 const [weather,setWeather]=useState<Weather|null>(null);
 const [place,setPlace]=useState<Place|null>(null);
 const [query,setQuery]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [speaking,setSpeaking]=useState(false);
 const [voiceEnabled,setVoiceEnabled]=useState(true);
 const [sign,setSign]=useState('Koç');
 const [theme,setTheme]=useState<'auto'|'day'|'night'>('auto');
 const [now,setNow]=useState(Date.now());
 const [updated,setUpdated]=useState('');
 const [hour,setHour]=useState('08');
 const [minute,setMinute]=useState('00');
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
   const pos=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});
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
 const nightBySun=rise&&set?now<new Date(rise).getTime()||now>=new Date(set).getTime():new Date(now).getHours()<6||new Date(now).getHours()>=19;
 const dark=theme==='night'||theme==='auto'&&nightBySun;
 const p=dark?PALETTE.night:PALETTE.day;
 const current=weather?.current,daily=weather?.daily;
 const narration=useMemo(()=>{
  if(!current||!daily)return '';
  const rain=daily.precipitation_probability_max[0]||0;
  const advice=rain>=50?'Şemsiyeni yanına almayı unutma.':current.wind_speed_10m>=45?'Rüzgâr güçlü, dışarıda dikkatli ol.':daily.temperature_2m_min[0]<=5?'Sabah serinliği için kalın giyin.':daily.temperature_2m_max[0]>=32?'Sıcak havada bol su iç.':'Günün tadını çıkar.';
  return 'Merhaba. '+(place?.name||'Bulunduğun yer')+' için gökyüzünün sesine hoş geldin. Şu anda hava '+label(current.weather_code).toLocaleLowerCase('tr-TR')+'. Sıcaklık '+num(current.temperature_2m)+', hissedilen '+num(current.apparent_temperature)+' derece. Günün en düşük sıcaklığı '+num(daily.temperature_2m_min[0])+', en yükseği '+num(daily.temperature_2m_max[0])+' derece. Yağış olasılığı yüzde '+num(rain)+'. Güneş '+time(rise)+' saatinde doğuyor, '+time(set)+' saatinde batıyor. '+advice;
 },[current,daily,place,rise,set]);
 async function speak(){
  if(speaking){await Speech.stop();setSpeaking(false);return;}
  if(!voiceEnabled){Alert.alert('Ses kapalı','Ayarlar bölümünden sesli rehberi aç.');return;}
  if(!narration)return;
  try{
   const voices=await Speech.getAvailableVoicesAsync();
   const tr=voices.filter(v=>v.language?.toLowerCase().startsWith('tr'));
   const voice=tr.find(v=>String(v.quality).toLowerCase()==='enhanced')||tr[0];
   await Speech.stop();
   setSpeaking(true);
   Speech.speak(narration,{language:'tr-TR',voice:voice?.identifier,rate:0.91,pitch:1,onDone:()=>setSpeaking(false),onStopped:()=>setSpeaking(false),onError:()=>setSpeaking(false)});
  }catch{setSpeaking(false);Alert.alert('Ses hatası','Cihazın Türkçe ses paketini kontrol et.');}
 }
 useEffect(()=>()=>{void Speech.stop();},[]);
 const txt=(s:string,size=15,bold=false,muted=false)=> <Text style={{color:muted?p.sub:p.text,fontSize:size,fontWeight:bold?'800':'400',lineHeight:size+7}}>{s}</Text>;
 const panel=(content:React.ReactNode,style:object={})=><View style={[styles.panel,{backgroundColor:p.panel,borderColor:p.line},style]}>{content}</View>;
 const button=(text:string,action:()=>void,secondary=false)=><Pressable accessibilityRole="button" onPress={action} style={[styles.button,{backgroundColor:secondary?p.input:p.accent}]}><Text style={{color:secondary?p.text:p.button,fontWeight:'800'}}>{text}</Text></Pressable>;
 const fact=(icon:string,k:string,v:string)=><View style={[styles.fact,{backgroundColor:p.panel,borderColor:p.line}]}><Text style={{fontSize:25}}>{icon}</Text>{txt(k,12,false,true)}{txt(v,16,true)}</View>;
 return <SafeAreaView style={{flex:1,backgroundColor:p.bg}} edges={['top','bottom']}><StatusBar style={dark?'light':'dark'}/><ScrollView keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={busy} onRefresh={()=>place?void load(place):void locate()} tintColor={p.accent}/>} contentContainerStyle={styles.page}>
  <Text style={{color:p.accent,fontSize:11,fontWeight:'900',letterSpacing:2}}>GÜNÜN SESLİ REHBERİ</Text>
  {txt('Gökyüzünün Sesi',30,true)}
  {txt(dark?'🌙 Yıldızların altında bir yolculuk':'☀️ Gökyüzüyle güne başla',14,false,true)}
  <View style={styles.nav}>{([['weather','☁️ Hava'],['sky','✨ Gök'],['zodiac','♈ Burç'],['settings','⚙️ Ayar']] as const).map(([id,title])=><Pressable accessibilityRole="button" key={id} onPress={()=>setScreen(id)} style={[styles.navItem,{backgroundColor:screen===id?p.accent:p.input}]}><Text style={{color:screen===id?p.button:p.text,fontSize:12,fontWeight:'800'}}>{title}</Text></Pressable>)}</View>
  {!!error&&panel(<>{txt('⚠️ '+error,14)}{button('Tekrar dene',()=>place?void load(place):void locate(),true)}</>,{marginBottom:15})}
  {screen==='weather'&&<>
   <View style={[styles.hero,{backgroundColor:p.hero}]}>{txt('📍 '+(place?.name||'Konum belirleniyor'),15,true)}{current&&daily?<><Text style={{fontSize:68,textAlign:'center',marginTop:13}}>{symbol(current.weather_code,dark)}</Text><Text style={{fontSize:70,textAlign:'center',color:p.text,fontWeight:'800'}}>{num(current.temperature_2m)}°</Text><Text style={{fontSize:22,textAlign:'center',color:p.text,fontWeight:'800'}}>{label(current.weather_code)}</Text><Text style={{textAlign:'center',color:p.sub,marginTop:8}}>En düşük {num(daily.temperature_2m_min[0])}° · En yüksek {num(daily.temperature_2m_max[0])}°</Text><Text style={{textAlign:'center',color:p.sub,fontSize:11,marginTop:14}}>Güncelleme: {updated}</Text></>:<View style={{padding:35}}>{busy?<ActivityIndicator color={p.accent}/>:txt('Şehir arayarak başlayabilirsin.')}</View>}</View>
   {panel(<>{txt('🔎 Şehir ara',18,true)}<View style={styles.search}><TextInput value={query} onChangeText={setQuery} onSubmitEditing={()=>void searchCity()} returnKeyType="search" placeholder="İstanbul, Ankara, İzmir..." placeholderTextColor={p.sub} style={[styles.input,{backgroundColor:p.input,color:p.text,borderColor:p.line}]}/><Pressable style={[styles.go,{backgroundColor:p.accent}]} onPress={()=>void searchCity()} disabled={busy}><Text style={{color:p.button,fontWeight:'800'}}>Ara</Text></Pressable></View>{button('📍 Konumumu kullan',()=>void locate(),true)}</>,{marginTop:15})}
   {current&&daily&&<><View style={styles.facts}>{fact('🌡️','Hissedilen',num(current.apparent_temperature)+'°')}{fact('💧','Yağış', '%'+num(daily.precipitation_probability_max[0]))}{fact('🍃','Rüzgâr',num(current.wind_speed_10m)+' km/sa')}{fact('☁️','Nem','%'+num(current.relative_humidity_2m))}</View>
   {panel(<>{txt('🎙️ Günün sesli rehberi',20,true)}<View style={{marginTop:9}}>{txt(narration,14)}</View>{button(speaking?'■ Durdur':'▶ Sesli dinle',()=>void speak())}</>,{marginTop:16})}
   {panel(<>{txt('Önümüzdeki günler',20,true)}{daily.time.slice(1,5).map((d,i)=><View key={d} style={[styles.forecast,{borderColor:p.line}]}><Text style={{fontSize:23}}>{symbol(daily.weather_code[i+1],dark)}</Text><View style={{flex:1}}>{txt(new Date(d+'T12:00:00').toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long'}),13,true)}{txt(label(daily.weather_code[i+1])+' · Yağış %'+num(daily.precipitation_probability_max[i+1]),11,false,true)}</View>{txt(num(daily.temperature_2m_min[i+1])+'° / '+num(daily.temperature_2m_max[i+1])+'°',12,true)}</View>)}</>,{marginTop:16})}</>}
  </>}
  {screen==='sky'&&<>{panel(<>{txt('✨ Bugünün gökyüzü',24,true)}{txt('Bu veriler seçili konuma göre gerçek hava tahmininden gelir.',13,false,true)}{daily?<View style={styles.facts}>{fact('🌅','Gün doğumu',time(rise))}{fact('🌇','Gün batımı',time(set))}{fact('☀️','UV endeksi',num(daily.uv_index_max[0]))}{fact(symbol(daily.weather_code[0],dark),'Gökyüzü',label(daily.weather_code[0]))}</View>:txt('Hava verisi yüklenince görünür.',14)}</>)}{panel(<>{txt('🌌 Gökyüzüne bakış',20,true)}{txt(current?(current.weather_code>=45?'Bulutlar ve yağış gözlemi zorlaştırabilir.':dark?'Kent ışıklarından uzak bir yerde yıldızlar daha iyi görünür.':'Güneş’e doğrudan bakmadan gökyüzünün renklerini gözlemle.'): 'Önce hava tahminini yükle.',15)}{txt('Canlı gezegen ve yıldız konumu hesabı bu sürümde bulunmuyor.',12,false,true)}</>,{marginTop:15})}</>}
  {screen==='zodiac'&&<>{panel(<>{txt('♈ Burç günlüğü',24,true)}{txt('Eğlence ve kişisel düşünme amaçlı genel notlar; bilimsel öngörü değildir.',13,false,true)}<View style={styles.signs}>{SIGNS.map((s,i)=><Pressable accessibilityRole="button" key={s} onPress={()=>setSign(s)} style={[styles.sign,{backgroundColor:s===sign?p.accent:p.input}]}><Text style={{fontSize:26}}>{ICONS[i]}</Text><Text style={{color:s===sign?p.button:p.text,fontWeight:'800'}}>{s}</Text></Pressable>)}</View></>)}{panel(<>{txt(ICONS[SIGNS.indexOf(sign)]+' '+sign+' · Günün notu',20,true)}{txt(NOTES[SIGNS.indexOf(sign)],17)}</>,{marginTop:15})}</>}
  {screen==='settings'&&<>{panel(<>{txt('⚙️ Görünüm',22,true)}{txt('Otomatik tema, seçili konumun güneş doğuş ve batış saatlerini izler.',13,false,true)}<View style={styles.nav}>{(['auto','day','night'] as const).map((v)=><Pressable key={v} onPress={()=>setTheme(v)} style={[styles.navItem,{backgroundColor:theme===v?p.accent:p.input}]}><Text style={{color:theme===v?p.button:p.text,fontWeight:'800'}}>{v==='auto'?'Otomatik':v==='day'?'☀️ Gündüz':'🌙 Gece'}</Text></Pressable>)}</View></>)}{panel(<>{txt('🎙️ Seslendirme',22,true)}<View style={styles.switchRow}>{txt('Sesli rehber',15)}<Switch value={voiceEnabled} onValueChange={setVoiceEnabled}/></View>{txt('Cihazdaki Türkçe ses motoru kullanılır. Ses kalitesi cihazdan cihaza değişebilir.',12,false,true)}{button(speaking?'■ Durdur':'▶ Sesi dene',()=>void speak())}</>,{marginTop:15})}{panel(<>{txt('⏰ Hatırlatma tercihi',22,true)}{txt('Saat tercihi kaydedilir; arka planda otomatik bildirim bu sürümde etkin değildir.',13,false,true)}<View style={styles.search}><TextInput keyboardType="number-pad" maxLength={2} accessibilityLabel="Saat" value={hour} onChangeText={setHour} style={[styles.timeInput,{backgroundColor:p.input,color:p.text}]}/>{txt(':',24,true)}<TextInput keyboardType="number-pad" maxLength={2} accessibilityLabel="Dakika" value={minute} onChangeText={setMinute} style={[styles.timeInput,{backgroundColor:p.input,color:p.text}]}/></View>{button('Saati kaydet',()=>{if(!/^\d{1,2}$/.test(hour)||!/^\d{1,2}$/.test(minute)||Number(hour)>23||Number(minute)>59){Alert.alert('Geçersiz saat','00:00–23:59 arasında bir saat gir.');return;}setHour(hour.padStart(2,'0'));setMinute(minute.padStart(2,'0'));Alert.alert('Kaydedildi','Saat tercihi saklandı. Otomatik bildirim henüz etkin değil.');})}</>,{marginTop:15})}</>}
  {busy&&<ActivityIndicator color={p.accent} style={{marginTop:16}}/>}
  <Text style={{color:p.sub,textAlign:'center',fontSize:11,marginTop:25}}>Hava verileri: Open-Meteo · Astroloji notları eğlence amaçlıdır.</Text>
 </ScrollView></SafeAreaView>;
}
export default function App(){return <SafeAreaProvider><Root/></SafeAreaProvider>;}
const styles=StyleSheet.create({
 page:{paddingHorizontal:18,paddingTop:22,paddingBottom:40},nav:{flexDirection:'row',gap:6,marginTop:19,marginBottom:20},navItem:{flex:1,paddingVertical:13,borderRadius:13,alignItems:'center'},hero:{borderRadius:28,padding:22,minHeight:200},panel:{borderWidth:1,borderRadius:23,padding:19},button:{paddingVertical:15,borderRadius:15,alignItems:'center',marginTop:15},search:{flexDirection:'row',alignItems:'center',gap:9,marginTop:13},input:{flex:1,minWidth:0,borderWidth:1,borderRadius:14,padding:12,fontSize:14},go:{paddingVertical:14,paddingHorizontal:17,borderRadius:14},facts:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:15},fact:{width:'48%',flexGrow:1,borderWidth:1,borderRadius:18,padding:14,gap:3},forecast:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:14,borderBottomWidth:1},signs:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:17},sign:{width:'31%',flexGrow:1,alignItems:'center',borderRadius:15,paddingVertical:14,gap:4},switchRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginVertical:12},timeInput:{width:66,textAlign:'center',fontSize:23,fontWeight:'800',borderRadius:12,padding:10}
});
