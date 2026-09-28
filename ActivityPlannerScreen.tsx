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
  try{const result=await setActivityReminder(place,ACTIVITIES[activity].title,instant);setReminder(result);Alert.alert('Hat─▒rlatma kuruldu','Plan─▒ndan 30 dakika ├Ânce bildirim alacaks─▒n. O g├╝n hava tahminini yeniden kontrol et.');}
  catch(e){Alert.alert('Hat─▒rlatma kurulamad─▒',e instanceof Error?e.message:'Bildirimleri kontrol et.');}
  finally{setBusy(false);}
 }
 async function share(instant:number,rain:number,temp:number){
  try{await Share.share({message:'G├Âky├╝z├╝n├╝n Sesi ┬À '+place+'\n'+ACTIVITIES[activity].title+' i├ğin uygun g├Âr├╝nen saat: '+activityLocalTime(instant,offsetSeconds)+'\nTahmin: '+Math.round(temp)+'┬░C, ya─ş─▒┼ş ihtimali %'+Math.round(rain)+'. Hava ko┼şullar─▒ de─şi┼şebilir; yola ├ğ─▒kmadan ├Ânce yeniden kontrol et.'});}
  catch{Alert.alert('Payla┼ş─▒lamad─▒','Payla┼ş─▒m bu cihazda a├ğ─▒lamad─▒.');}
 }
 const line={borderColor:p.line};
 return <View style={{gap:14}}>
  <Text style={{color:p.text,fontFamily:'serif',fontSize:24}}>Ô£ğ Bana Uygun Saat</Text>
  <Text style={{color:p.sub,lineHeight:21}}>Nereye, ne zaman ├ğ─▒kaca─ş─▒n─▒ se├ğmek i├ğin konumunun saatlik hava tahminini kullan. Puanlar yaln─▒zca yakla┼ş─▒k kar┼ş─▒la┼şt─▒rmad─▒r; kesin hava veya g├╝venlik garantisi de─şildir.</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{(Object.keys(ACTIVITIES) as Activity[]).map(id=><Pressable key={id} accessibilityRole="button" onPress={()=>setActivity(id)} style={{backgroundColor:activity===id?p.accent:p.input,borderRadius:14,paddingHorizontal:11,paddingVertical:11}}><Text style={{color:activity===id?p.button:p.text,fontWeight:'700'}}>{ACTIVITIES[id].icon} {ACTIVITIES[id].title}</Text></Pressable>)}</View>
  <Text style={{color:p.sub,fontSize:12}}>{ACTIVITIES[activity].description} ┬À {place||'Konum bekleniyor'}{updated?' ┬À G├╝ncelleme '+updated:''} ┬À ├ûn├╝m├╝zdeki 36 saat</Text>
  {!hourly||!daily?<Text style={{color:p.text}}>Konum ve hava tahmini y├╝klenince uygun saatler g├Âsterilecek.</Text>:windows.length===0?<Text style={{color:p.text}}>Bu etkinlik i├ğin yeterince uygun bir saat bulunamad─▒. Tahmin de─şi┼şti─şinde yeniden dene.</Text>:windows.map((slot,index)=><View key={slot.instant} style={{backgroundColor:p.input,borderWidth:1,...line,borderRadius:17,padding:14,gap:7}}>
   <Text style={{color:p.text,fontSize:19,fontWeight:'800'}}>{index===0?'Ô£Ğ En uygun ':'ÔùĞ Alternatif '}{activityLocalTime(slot.instant,offsetSeconds)}</Text>
   <Text style={{color:p.accent,fontWeight:'800'}}>Yakla┼ş─▒k uygunluk: {slot.score}/100</Text>
   <Text style={{color:p.text}}>­şîğ´©Å %{Math.round(slot.rain)} ya─ş─▒┼ş ┬À ­şîí´©Å {Math.round(slot.temp)}┬░C ┬À Ôİü´©Å %{Math.round(slot.cloud)} bulut</Text>
   <Text style={{color:p.sub,lineHeight:20}}>{slot.reason}</Text>
   <View style={{flexDirection:'row',gap:8}}><Pressable accessibilityRole="button" disabled={busy} onPress={()=>void remind(slot.instant)} style={{backgroundColor:p.accent,borderRadius:12,padding:11,flex:1,alignItems:'center'}}><Text style={{color:p.button,fontWeight:'700'}}>ÔÅ░ Hat─▒rlat</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>void share(slot.instant,slot.rain,slot.temp)} style={{backgroundColor:p.panel,borderRadius:12,padding:11,flex:1,alignItems:'center'}}><Text style={{color:p.text,fontWeight:'700'}}>Ôåù Payla┼ş</Text></Pressable></View>
  </View>)}
  {busy&&<ActivityIndicator color={p.accent}/>}
  {reminder&&<View style={{gap:5,borderTopWidth:1,...line,paddingTop:12}}><Text style={{color:p.text,fontWeight:'700'}}>Kurulu hat─▒rlatma: {reminder.activity} ┬À {reminder.place}</Text><Text style={{color:p.sub}}>{new Date(reminder.instant).toLocaleString('tr-TR',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})} ┬À 30 dakika ├Ânce haber verilecek.</Text><Pressable accessibilityRole="button" onPress={()=>void cancelActivityReminder().then(()=>setReminder(null)).catch(()=>Alert.alert('Hata','Hat─▒rlatma iptal edilemedi.'))} style={{paddingVertical:9}}><Text style={{color:p.accent,fontWeight:'700'}}>Hat─▒rlatmay─▒ iptal et</Text></Pressable></View>}
  <Text style={{color:p.sub,fontSize:11}}>Hava tahmini: Open-Meteo. G├Âky├╝z├╝ g├Âzlemi i├ğin ayr─▒ca ─▒┼ş─▒k kirlili─şi ve ├ğevresel g├╝venli─şi yerinde de─şerlendir. Planlar─▒n uygulanabilirli─şi ki┼şisel ko┼şullar─▒na ba─şl─▒d─▒r.</Text>
 </View>;
}

