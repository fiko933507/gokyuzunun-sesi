import type * as NotificationTypes from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
const KEY='sky.local.notification.id';
const WEATHER_KEY='sky.weather.notification.ids';
export type AlertHours={time:string[];precipitation_probability:number[];temperature_2m:number[]};
async function notificationModule():Promise<typeof NotificationTypes>{
 try{return await import('expo-notifications');}
 catch{throw new Error('Bu Expo Go sürümü bildirim modülünü desteklemiyor. Expo Go’yu güncelle veya uygulamanın geliştirme derlemesini kullan.');}
}
export async function setDailyNotification(hour:number,minute:number){
 const Notifications=await notificationModule();
 if(Platform.OS==='android') await Notifications.setNotificationChannelAsync('sky-daily',{name:'Gökyüzü Günlük Hatırlatma',importance:Notifications.AndroidImportance.DEFAULT});
 const permission=await Notifications.requestPermissionsAsync();
 if(!permission.granted)throw new Error('Bildirim izni verilmedi. Telefon ayarlarından açabilirsin.');
 const old=await AsyncStorage.getItem(KEY);
 if(old)await Notifications.cancelScheduledNotificationAsync(old).catch(()=>{});
 const id=await Notifications.scheduleNotificationAsync({
  content:{title:'🌙 Gökyüzünün Sesi',body:'Bugünkü hava tahminini ve gerçek gökyüzü konumlarını keşfet.',sound:'default'},
  trigger:{type:Notifications.SchedulableTriggerInputTypes.DAILY,hour,minute,channelId:Platform.OS==='android'?'sky-daily':undefined}
 });
 await AsyncStorage.setItem(KEY,id);
 return id;
}
export async function stopDailyNotification(){
 const Notifications=await notificationModule();
 const id=await AsyncStorage.getItem(KEY);
 if(id){await Notifications.cancelScheduledNotificationAsync(id);await AsyncStorage.removeItem(KEY);}
}
export async function dailyNotificationEnabled(){
 const id=await AsyncStorage.getItem(KEY);
 if(!id)return false;
 const Notifications=await notificationModule();
 const scheduled=await Notifications.getAllScheduledNotificationsAsync();
 return scheduled.some(n=>n.identifier===id);
}
export async function scheduleWeatherAlerts(hourly:AlertHours,offsetSeconds:number,place:string,rainThreshold:number,coldThreshold:number){
 const Notifications=await notificationModule();
 const permission=await Notifications.requestPermissionsAsync();
 if(!permission.granted)throw new Error('Bildirim izni verilmedi. Telefon ayarlarından açabilirsin.');
 if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('sky-weather',{name:'Hava uyarıları',importance:Notifications.AndroidImportance.DEFAULT});
 const old=JSON.parse((await AsyncStorage.getItem(WEATHER_KEY))||'[]') as string[];
 await Promise.all(old.map(id=>Notifications.cancelScheduledNotificationAsync(id).catch(()=>{})));
 const now=Date.now(),events:Array<{kind:'rain'|'cold';date:Date}> = [];
 for(let i=0;i<hourly.time.length;i++){
  const instant=Date.parse(hourly.time[i]+'Z')-offsetSeconds*1000;
  if(!Number.isFinite(instant)||instant<now+60_000||instant>now+36*60*60_000)continue;
  if(!events.some(e=>e.kind==='rain')&&typeof hourly.precipitation_probability[i]==='number'&&hourly.precipitation_probability[i]>=rainThreshold)events.push({kind:'rain',date:new Date(instant)});
  if(!events.some(e=>e.kind==='cold')&&typeof hourly.temperature_2m[i]==='number'&&hourly.temperature_2m[i]<=coldThreshold)events.push({kind:'cold',date:new Date(instant)});
  if(events.length===2)break;
 }
 const ids:string[]=[];
 try{
  for(const event of events){
   ids.push(await Notifications.scheduleNotificationAsync({content:{title:event.kind==='rain'?'☂ Yağış uyarısı':'🧥 Soğuk hava uyarısı',body:event.kind==='rain'?place+' için yağış ihtimali %'+rainThreshold+' eşiğini aşıyor. Şemsiyeni kontrol et.':place+' için sıcaklık '+coldThreshold+'°C altına inebilir.',sound:'default'},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:event.date,channelId:Platform.OS==='android'?'sky-weather':undefined}}));
  }
 }catch(error){await Promise.all(ids.map(id=>Notifications.cancelScheduledNotificationAsync(id).catch(()=>{})));throw error;}
 await AsyncStorage.setItem(WEATHER_KEY,JSON.stringify(ids));
 return events.length;
}
export async function stopWeatherAlerts(){
 const Notifications=await notificationModule();
 const ids=JSON.parse((await AsyncStorage.getItem(WEATHER_KEY))||'[]') as string[];
 await Promise.all(ids.map(id=>Notifications.cancelScheduledNotificationAsync(id).catch(()=>{})));
 await AsyncStorage.removeItem(WEATHER_KEY);
}

/** Notify only after a successful GPS and forecast refresh; never request permission during automatic refreshes. */
export async function notifyGpsUpdated(place:string,requestPermission=false){
 const Notifications=await notificationModule();
 const permission=requestPermission?await Notifications.requestPermissionsAsync():await Notifications.getPermissionsAsync();
 if(!permission.granted)return false;
 if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('sky-location',{name:'Konum güncellemeleri',importance:Notifications.AndroidImportance.DEFAULT});
 Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:false,shouldSetBadge:false})});
 await Notifications.scheduleNotificationAsync({
  content:{title:'⌖ Konumun güncellendi',body:place+' için GPS konumu ve hava tahmini yenilendi.',sound:false},
  trigger:Platform.OS==='android'?{type:Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,seconds:1,channelId:'sky-location'}:null
 });
 return true;
}

type ActivityReminder={id:string;place:string;activity:string;instant:number};
const ACTIVITY_KEY='sky.activity.reminder';
export async function getActivityReminder():Promise<ActivityReminder|null>{
 try{
  const raw=await AsyncStorage.getItem(ACTIVITY_KEY);
  if(!raw)return null;
  const saved=JSON.parse(raw) as ActivityReminder;
  if(!saved||typeof saved.id!=='string'||!Number.isFinite(saved.instant)||saved.instant<Date.now())return null;
  return saved;
 }catch{return null;}
}
export async function cancelActivityReminder(){
 const old=await getActivityReminder();
 if(old){const Notifications=await notificationModule();await Notifications.cancelScheduledNotificationAsync(old.id).catch(()=>{});}
 await AsyncStorage.removeItem(ACTIVITY_KEY);
}
export async function setActivityReminder(place:string,activity:string,instant:number){
 if(!Number.isFinite(instant)||instant<Date.now()+35*60_000||instant>Date.now()+36*3600_000)throw new Error('Hatırlatma için en az 35 dakika sonrasını seç.');
 const Notifications=await notificationModule();
 const permission=await Notifications.requestPermissionsAsync();
 if(!permission.granted)throw new Error('Bildirim izni verilmedi. Telefon ayarlarından açabilirsin.');
 if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('sky-plan',{name:'Gökyüzü planım',importance:Notifications.AndroidImportance.DEFAULT});
 const id=await Notifications.scheduleNotificationAsync({
  content:{title:'✦ Gökyüzü planın yaklaşıyor',body:place+' için '+activity.toLocaleLowerCase('tr-TR')+' planın yarım saat sonra. Hava tahminini yeniden kontrol et.',sound:'default'},
  trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(instant-30*60_000),channelId:Platform.OS==='android'?'sky-plan':undefined}
 });
 const previous=await getActivityReminder();
 try{await AsyncStorage.setItem(ACTIVITY_KEY,JSON.stringify({id,place,activity,instant}));}
 catch(e){await Notifications.cancelScheduledNotificationAsync(id).catch(()=>{});throw e;}
 if(previous)await Notifications.cancelScheduledNotificationAsync(previous.id).catch(()=>{});
 return {id,place,activity,instant};
}
