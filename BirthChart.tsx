import React,{useEffect,useState} from 'react';
import {Alert,Pressable,Text,TextInput,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {birthInstant,computeBirthChart,type BirthCity} from './birthChart';
import {ZodiacWheel} from './CelestialVisuals';
import {SIGNS} from './astronomy';

type Palette={panel:string;line:string;text:string;sub:string;accent:string;input:string;button:string};
const KEY='sky.birthChart';
export function BirthChart({p,night}:{p:Palette;night:boolean}){
 const [date,setDate]=useState('');const [hour,setHour]=useState('');const [query,setQuery]=useState('');
 const [city,setCity]=useState<BirthCity|null>(null);const [options,setOptions]=useState<BirthCity[]>([]);
 const [saved,setSaved]=useState(false);const [hasStored,setHasStored]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const [focusedSign,setFocusedSign]=useState<typeof SIGNS[number]|null>(null);
 useEffect(()=>{AsyncStorage.getItem(KEY).then(raw=>{if(raw){const data=JSON.parse(raw);if(data?.city&&typeof data.date==='string'&&typeof data.hour==='string'){setDate(data.date);setHour(data.hour);setCity(data.city);setQuery(data.city.name);setSaved(true);setHasStored(true);}}}).catch(()=>{});},[]);
 let chart:ReturnType<typeof computeBirthChart>|null=null;
 try{if(city&&date&&hour)chart=computeBirthChart(date,hour,city);}catch{}
 async function search(){
  if(query.trim().length<2){setError('Şehir adı yaz.');return;}
  setBusy(true);setError('');setOptions([]);setCity(null);setSaved(false);
  try{
   const params=new URLSearchParams({name:query.trim().slice(0,60),count:'6',language:'tr'});
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
   let response:Response;
   try{response=await fetch('https://geocoding-api.open-meteo.com/v1/search?'+params,{signal:controller.signal});}
   finally{clearTimeout(timer);}
   if(!response.ok)throw new Error('Şehir araması kullanılamıyor.');
   const data=await response.json() as {results?:Array<{name:string;country?:string;latitude:number;longitude:number;timezone?:string}>};
   const results=(data.results||[]).filter(item=>Number.isFinite(item.latitude)&&Number.isFinite(item.longitude)&&!!item.timezone).map(item=>({name:item.name,country:item.country,latitude:item.latitude,longitude:item.longitude,timezone:item.timezone!}));
   if(!results.length)throw new Error('Saat dilimi olan bir şehir bulunamadı.');
   setOptions(results);
  }catch(e){setError(e instanceof Error?e.message:'Şehir bulunamadı.');}finally{setBusy(false);}
 }
 async function save(){
  try{if(!city)throw new Error('Listeden bir doğum şehri seç.');birthInstant(date,hour,city.timezone);await AsyncStorage.setItem(KEY,JSON.stringify({date,hour,city}));setSaved(true);setHasStored(true);setError('');}
  catch(e){setError(e instanceof Error?e.message:'Harita kaydedilemedi.');}
 }
 async function erase(){await AsyncStorage.removeItem(KEY);setDate('');setHour('');setCity(null);setQuery('');setOptions([]);setSaved(false);setHasStored(false);setError('');}
 const input={borderColor:p.line,borderWidth:1,borderRadius:12,backgroundColor:p.input,color:p.text,padding:12};
 return <View style={{gap:12}}>
  <Text style={{color:p.text,fontFamily:'serif',fontSize:23}}>✦ Doğum Anı Haritam</Text>
  <Text style={{color:p.sub,lineHeight:20}}>Doğum tarihi, saati ve şehrini gir. Gezegen konumları ve yükselen astronomik olarak hesaplanır; yorumlar semboliktir. Bilgilerin yalnızca bu telefonda saklanır.</Text>
  <View style={{flexDirection:'row',gap:8}}><TextInput accessibilityLabel="Doğum tarihi" value={date} onChangeText={v=>{setDate(v);setSaved(false);}} placeholder="1993-05-17" placeholderTextColor={p.sub} keyboardType="numbers-and-punctuation" style={[input,{flex:1}]}/><TextInput accessibilityLabel="Doğum saati" value={hour} onChangeText={v=>{setHour(v);setSaved(false);}} placeholder="14:30" placeholderTextColor={p.sub} keyboardType="numbers-and-punctuation" style={[input,{width:98}]}/></View>
  <View style={{flexDirection:'row',gap:8}}><TextInput accessibilityLabel="Doğum şehri" value={query} onChangeText={v=>{setQuery(v);setCity(null);setSaved(false);}} placeholder="Doğum şehri" placeholderTextColor={p.sub} style={[input,{flex:1}]}/><Pressable accessibilityRole="button" onPress={()=>void search()} style={{backgroundColor:p.accent,padding:13,borderRadius:12}}><Text style={{color:p.button,fontWeight:'800'}}>Ara</Text></Pressable></View>
  {busy&&<Text style={{color:p.sub}}>Şehir aranıyor…</Text>}
  {options.map((item,i)=><Pressable key={item.name+item.latitude+i} accessibilityRole="button" onPress={()=>{setCity(item);setQuery(item.name+(item.country?', '+item.country:''));setOptions([]);setError('');}} style={{borderColor:p.line,borderWidth:1,borderRadius:12,padding:11}}><Text style={{color:p.text}}>{item.name}, {item.country} · {item.timezone}</Text></Pressable>)}
  {city&&<Text style={{color:p.sub}}>Seçilen yer: {city.name} · {city.timezone}</Text>}
  {!!error&&<Text style={{color:p.text}}>⚠ {error}</Text>}
  {chart&&<>
   <ZodiacWheel night={night} active={focusedSign?SIGNS.indexOf(focusedSign):chart.asc?SIGNS.indexOf(chart.asc.sign):0} onSelect={i=>setFocusedSign(SIGNS[i])}/>
   {focusedSign&&<Text style={{color:p.sub}}>{focusedSign} bölümündeki cisimler: {chart.sky.bodies.filter(body=>body.sign===focusedSign).map(body=>body.name).join(', ')||'listelenen gezegen yok'}.</Text>}
   <Text style={{color:p.text,fontWeight:'800'}}>Yükselen: {chart.asc?chart.asc.sign+' '+chart.asc.degree.toFixed(1)+'°':'Bu enlem için yükselen hesaplanamadı.'}</Text>
   <Text style={{color:p.sub,fontSize:12}}>Doğum anı (UTC): {new Date(chart.instant).toISOString().replace('T',' ').slice(0,16)}</Text>
   {chart.sky.bodies.map(body=><View key={body.name} style={{flexDirection:'row',justifyContent:'space-between',borderBottomWidth:1,borderColor:p.line,paddingVertical:7}}><Text style={{color:p.text}}>{body.icon} {body.name}</Text><Text style={{color:p.text,fontWeight:'700'}}>{body.sign} {body.degree.toFixed(1)}°</Text></View>)}
   {chart.houses.length>0&&<Text style={{color:p.sub,fontSize:12}}>Eşit evler: {chart.houses.map(h=>h.number+'. '+h.sign).join(' · ')}. Bu, kullanılan ev sistemidir; farklı sistemler farklı evler verir.</Text>}
   <Pressable accessibilityRole="button" onPress={()=>void save()} style={{backgroundColor:p.accent,padding:15,borderRadius:15,alignItems:'center'}}><Text style={{color:p.button,fontWeight:'800'}}>{saved?'✓ Kaydedildi':'Haritamı bu cihazda kaydet'}</Text></Pressable>
  </>}
  {hasStored&&<Pressable accessibilityRole="button" onPress={()=>Alert.alert('Haritayı sil','Doğum bilgilerini cihazdan silmek istiyor musun?', [{text:'Vazgeç',style:'cancel'},{text:'Sil',style:'destructive',onPress:()=>void erase()}])} style={{padding:12,alignItems:'center'}}><Text style={{color:p.accent,fontWeight:'700'}}>Doğum bilgilerimi sil</Text></Pressable>}
  <Text style={{color:p.sub,fontSize:11,lineHeight:17}}>Saat dilimi ve yaz saati uygulaması seçtiğin şehrin kayıtlarına göre uygulanır. Saat belirsizse yükselenin doğruluğu azalır. Astrolojik yorum bilimsel kişisel öngörü değildir.</Text>
 </View>;
}
