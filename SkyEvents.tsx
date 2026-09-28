import React,{useEffect,useState} from 'react';
import {Alert,Pressable,Share,Text,View} from 'react-native';
import type {SkyEvent} from './observationPlan';
import {followSkyEvent,getEventReminders,unfollowSkyEvent} from './notifications';

type Palette={panel:string;line:string;text:string;sub:string;accent:string;input:string;button:string};
type Hourly={time:string[];precipitation_probability:number[];cloud_cover:number[];weather_code:number[]};
function weatherAt(instant:number,hourly:Hourly|undefined,offsetSeconds:number){
 if(!hourly?.time?.length)return null;
 let nearest=-1,difference=Infinity;
 for(let i=0;i<hourly.time.length;i++){
  const at=Date.parse(hourly.time[i]+'Z')-offsetSeconds*1000;
  const delta=Math.abs(at-instant);
  if(Number.isFinite(delta)&&delta<difference){nearest=i;difference=delta;}
 }
 if(nearest<0||difference>60*60_000)return null;
 const rain=hourly.precipitation_probability[nearest],cloud=hourly.cloud_cover[nearest];
 if(!Number.isFinite(rain)||!Number.isFinite(cloud))return null;
 return `O saat için tahmin: yağış %${Math.round(rain)}, bulut %${Math.round(cloud)}. Görünürlük garantisi değildir.`;
}
export function SkyEvents({p,events,hourly,offsetSeconds}:{p:Palette;events:SkyEvent[];hourly?:Hourly;offsetSeconds:number}){
 const [followed,setFollowed]=useState<Array<{eventId:string;noticeAt:number}>>([]);
 const [busy,setBusy]=useState('');
 useEffect(()=>{void getEventReminders().then(setFollowed).catch(()=>{});},[]);
 async function toggle(event:SkyEvent){
  setBusy(event.id);
  try{
   const next=followed.some(item=>item.eventId===event.id)?await unfollowSkyEvent(event.id):await followSkyEvent(event.id,event.title,event.instant);
   setFollowed(next);
  }catch(e){Alert.alert('Hatırlatma ayarlanamadı',e instanceof Error?e.message:'Bildirim ayarlarını kontrol et.');}
  finally{setBusy('');}
 }
 async function share(event:SkyEvent){
  try{await Share.share({message:`Gökyüzünün Sesi · ${event.title}\n${new Date(event.instant).toLocaleString('tr-TR',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}\n${event.detail}\nGörünürlük bulunduğun yere ve hava koşullarına bağlı.`});}catch{Alert.alert('Paylaşılamadı','Paylaşım bu cihazda açılamadı.');}
 }
 return <View style={{gap:10}}>
  <Text style={{color:p.text,fontSize:23,fontFamily:'serif'}}>✧ Gök Olayları Takvimi</Text>
  <Text style={{color:p.sub,lineHeight:20}}>Ay evreleri astronomik hesapla belirlenir; meteor geceleri beklenen zirve tarihleridir. Takip ettiğin etkinliğin öncesinde telefonuna yerel hatırlatma planlanır.</Text>
  <Text style={{color:p.accent,fontWeight:'700'}}>Takip edilen: {followed.length}/16</Text>
  {events.slice(0,18).map(event=>{
   const reminder=followed.find(item=>item.eventId===event.id);
   const weather=weatherAt(event.instant,hourly,offsetSeconds);
   return <View key={event.id} style={{borderColor:p.line,borderWidth:1,borderRadius:17,padding:13,backgroundColor:p.input,gap:7}}>
    <Text style={{color:p.text,fontSize:17,fontWeight:'800'}}>{event.title.includes('Ay')?'☾':'✦'} {event.title}</Text>
    <Text style={{color:p.text}}>{new Date(event.instant).toLocaleString('tr-TR',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</Text>
    <Text style={{color:p.sub,lineHeight:20}}>{event.detail} Kaynak: {event.source}.</Text>
    <Text style={{color:p.sub,fontSize:12}}>{weather||'Bu tarih için saatlik hava tahmini henüz yok. Etkinlik yaklaşınca tekrar kontrol et.'}</Text>
    {reminder&&<Text style={{color:p.accent,fontSize:12}}>Hatırlatma: {new Date(reminder.noticeAt).toLocaleString('tr-TR',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})}</Text>}
    <View style={{flexDirection:'row',gap:8}}><Pressable accessibilityRole="button" disabled={!!busy} onPress={()=>void toggle(event)} style={{backgroundColor:p.accent,borderRadius:12,padding:11,flex:1,alignItems:'center'}}><Text style={{color:p.button,fontWeight:'700'}}>{busy===event.id?'Hazırlanıyor…':reminder?'✓ Takibi bırak':'⏰ Takip et'}</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>void share(event)} style={{backgroundColor:p.panel,borderRadius:12,padding:11,alignItems:'center'}}><Text style={{color:p.text,fontWeight:'700'}}>↗ Paylaş</Text></Pressable></View>
   </View>;
  })}
  <Text style={{color:p.sub,fontSize:11,lineHeight:17}}>Meteor saatleri yaklaşık zirve gecesini işaret eder; gerçek gözlem yerel gece saatlerine, ışık kirliliğine ve hava koşullarına bağlıdır. Bildirim geldiğinde tahmini yeniden kontrol et.</Text>
 </View>;
}
