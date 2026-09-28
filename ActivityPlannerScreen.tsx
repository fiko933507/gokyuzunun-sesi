import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Alert,Pressable,Share,Text,View} from 'react-native';
import {ACTIVITIES,bestActivityWindows,activityLocalTime,type Activity} from './activityPlannerLogic';
import {cancelActivityReminder,getActivityReminder,setActivityReminder} from './notifications';

type Palette={panel:string;line:string;text:string;sub:string;accent:string;input:string;button:string};
type Forecast={time:string[];precipitation_probability:number[];temperature_2m:number[];cloud_cover:number[];visibility:number[];wind_speed_10m:number[];weather_code:number[]};
type Sun={time:string[];sunrise:string[];sunset:string[]};
export function ActivityPlanner({p,place,hourly,daily,offsetSeconds,updated}:{p:Palette;place:string;hourly?:Forecast;daily?:Sun;offsetSeconds:number;updated:string}){
 const [activity,setActivity]=useState<Activity>('walk');
 const [reminder,setReminder]=useState<{id:string;place:string;activity:string;instant:number}|null>(null);
 const [busy,setBusy]=useState(false);
 useEffect(()=>{void getActivityReminder().then(setReminder);},[]);
 const windows=hourly&&daily?bestActivityWindows(hourly,daily,offsetSeconds,Date.now(),activity):[];
 async function remind(instant:number){
  setBusy(true);
  try{const result=await setActivityReminder(place,ACTIVITIES[activity].title,instant);setReminder(result);Alert.alert('Hatırlatma kuruldu','Planından 30 dakika önce bildirim alacaksın. O gün hava tahminini yeniden kontrol et.');}
  catch(e){Alert.alert('Hatırlatma kurulamadı',e instanceof Error?e.message:'Bildirimleri kontrol et.');}
  finally{setBusy(false);}
 }
 async function share(instant:number,rain:number,temp:number){
  try{await Share.share({message:'Gökyüzünün Sesi · '+place+'\n'+ACTIVITIES[activity].title+' için uygun görünen saat: '+activityLocalTime(instant,offsetSeconds)+'\nTahmin: '+Math.round(temp)+'°C, yağış ihtimali %'+Math.round(rain)+'. Hava koşulları değişebilir; yola çıkmadan önce yeniden kontrol et.'});}
  catch{Alert.alert('Paylaşılamadı','Paylaşım bu cihazda açılamadı.');}
 }
 const line={borderColor:p.line};
 return <View style={{gap:14}}>
  <Text style={{color:p.text,fontFamily:'serif',fontSize:24}}>✧ Bana Uygun Saat</Text>
  <Text style={{color:p.sub,lineHeight:21}}>Nereye, ne zaman çıkacağını seçmek için konumunun saatlik hava tahminini kullan. Puanlar yalnızca yaklaşık karşılaştırmadır; kesin hava veya güvenlik garantisi değildir.</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{(Object.keys(ACTIVITIES) as Activity[]).map(id=><Pressable key={id} accessibilityRole="button" onPress={()=>setActivity(id)} style={{backgroundColor:activity===id?p.accent:p.input,borderRadius:14,paddingHorizontal:11,paddingVertical:11}}><Text style={{color:activity===id?p.button:p.text,fontWeight:'700'}}>{ACTIVITIES[id].icon} {ACTIVITIES[id].title}</Text></Pressable>)}</View>
  <Text style={{color:p.sub,fontSize:12}}>{ACTIVITIES[activity].description} · {place||'Konum bekleniyor'}{updated?' · Güncelleme '+updated:''} · Önümüzdeki 36 saat</Text>
  {!hourly||!daily?<Text style={{color:p.text}}>Konum ve hava tahmini yüklenince uygun saatler gösterilecek.</Text>:windows.length===0?<Text style={{color:p.text}}>Bu etkinlik için yeterince uygun bir saat bulunamadı. Tahmin değiştiğinde yeniden dene.</Text>:windows.map((slot,index)=><View key={slot.instant} style={{backgroundColor:p.input,borderWidth:1,...line,borderRadius:17,padding:14,gap:7}}>
   <Text style={{color:p.text,fontSize:19,fontWeight:'800'}}>{index===0?'✦ En uygun ':'◦ Alternatif '}{activityLocalTime(slot.instant,offsetSeconds)}</Text>
   <Text style={{color:p.accent,fontWeight:'800'}}>Yaklaşık uygunluk: {slot.score}/100</Text>
   <Text style={{color:p.text}}>🌧️ %{Math.round(slot.rain)} yağış · 🌡️ {Math.round(slot.temp)}°C · ☁️ %{Math.round(slot.cloud)} bulut</Text>
   <Text style={{color:p.sub,lineHeight:20}}>{slot.reason}</Text>
   <View style={{flexDirection:'row',gap:8}}><Pressable accessibilityRole="button" disabled={busy} onPress={()=>void remind(slot.instant)} style={{backgroundColor:p.accent,borderRadius:12,padding:11,flex:1,alignItems:'center'}}><Text style={{color:p.button,fontWeight:'700'}}>⏰ Hatırlat</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>void share(slot.instant,slot.rain,slot.temp)} style={{backgroundColor:p.panel,borderRadius:12,padding:11,flex:1,alignItems:'center'}}><Text style={{color:p.text,fontWeight:'700'}}>↗ Paylaş</Text></Pressable></View>
  </View>)}
  {busy&&<ActivityIndicator color={p.accent}/>}
  {reminder&&<View style={{gap:5,borderTopWidth:1,...line,paddingTop:12}}><Text style={{color:p.text,fontWeight:'700'}}>Kurulu hatırlatma: {reminder.activity} · {reminder.place}</Text><Text style={{color:p.sub}}>{new Date(reminder.instant).toLocaleString('tr-TR',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})} · 30 dakika önce haber verilecek.</Text><Pressable accessibilityRole="button" onPress={()=>void cancelActivityReminder().then(()=>setReminder(null)).catch(()=>Alert.alert('Hata','Hatırlatma iptal edilemedi.'))} style={{paddingVertical:9}}><Text style={{color:p.accent,fontWeight:'700'}}>Hatırlatmayı iptal et</Text></Pressable></View>}
  <Text style={{color:p.sub,fontSize:11}}>Hava tahmini: Open-Meteo. Gökyüzü gözlemi için ayrıca ışık kirliliği ve çevresel güvenliği yerinde değerlendir. Planların uygulanabilirliği kişisel koşullarına bağlıdır.</Text>
 </View>;
}
