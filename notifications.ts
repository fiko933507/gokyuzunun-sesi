import type * as NotificationTypes from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
const KEY='sky.local.notification.id';
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
