import React,{useEffect,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import * as Location from 'expo-location';
import {bearing} from './observationPlan';

type Target={name:string;icon:string;azimuth:number;altitude:number};
type Palette={panel:string;line:string;text:string;sub:string;accent:string;input:string;button:string};
const difference=(target:number,heading:number)=>((target-heading+540)%360)-180;

export function Compass({p,targets=[]}:{p:Palette;targets?:Target[]}){
 const [heading,setHeading]=useState<number|null>(null);
 const [accuracy,setAccuracy]=useState<number|null>(null);
 const [message,setMessage]=useState('Pusula sensörü bekleniyor…');
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let active=true;let subscription:Location.LocationSubscription|undefined;
  (async()=>{
   try{
    const permission=await Location.requestForegroundPermissionsAsync();
    if(!permission.granted){if(active)setMessage('Pusula için konum izni gerekli. Ayarlardan izin verip tekrar dene.');return;}
    const sub=await Location.watchHeadingAsync(value=>{
     if(!active)return;
     const angle=value.trueHeading>=0?value.trueHeading:value.magHeading;
     if(Number.isFinite(angle)&&angle>=0){setHeading(angle);setAccuracy(value.accuracy);setMessage('');}
    });
    if(active)subscription=sub;else sub.remove();
   }catch{if(active)setMessage('Bu cihazda yön sensörüne ulaşılamadı. Konum iznini ve sensörü kontrol et.');}
  })();
  return()=>{active=false;subscription?.remove();};
 },[attempt]);
 const face=heading===null?0:-heading;
 const points=[['K',0],['D',90],['G',180],['B',270]] as const;
 return <View style={{gap:15}}>
  <Text style={{fontSize:25,fontFamily:'serif',color:p.text}}>⊕ Gökyüzü Pusulası</Text>
  <Text style={{color:p.sub,lineHeight:21}}>Telefonun üst kenarını bakmak istediğin yöne tut. Yön göstergesi telefonun sensöründen gelir.</Text>
  <View style={{height:275,alignItems:'center',justifyContent:'center'}}>
   <View style={{position:'absolute',top:0,zIndex:2,alignItems:'center'}}><Text style={{fontSize:30,color:p.accent}}>▼</Text><Text style={{color:p.sub,fontSize:11}}>BAKTIĞIN YÖN</Text></View>
   <View style={{width:225,height:225,borderRadius:113,borderWidth:2,borderColor:p.accent,backgroundColor:p.input,alignItems:'center',justifyContent:'center',transform:[{rotate:face+'deg'}]}}>
    {points.map(([label,angle])=><Text key={label} style={{position:'absolute',fontSize:23,fontWeight:'800',color:label==='K'?p.accent:p.text,transform:[{rotate:heading===null?'0deg':heading+'deg'}],top:angle===0?13:angle===180?180:91,left:angle===270?21:angle===90?181:101}}>{label}</Text>)}
    <View style={{width:125,height:125,borderRadius:65,borderWidth:1,borderColor:p.line,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:32,color:p.accent}}>☾</Text></View>
   </View>
  </View>
  <Text accessibilityLiveRegion="polite" style={{fontSize:22,color:p.text,textAlign:'center',fontWeight:'800'}}>{heading===null?message:Math.round(heading)+'° · '+bearing(heading)}</Text>
  {heading===null?<Pressable accessibilityRole="button" onPress={()=>setAttempt(v=>v+1)} style={{padding:12,backgroundColor:p.accent,borderRadius:13}}><Text style={{color:p.button,textAlign:'center',fontWeight:'800'}}>Sensörü yeniden dene</Text></Pressable>:<Text style={{color:p.sub,textAlign:'center',fontSize:12}}>Sensör doğruluğu: {accuracy===3?'yüksek':accuracy===2?'orta':'düşük / kalibrasyon gerekebilir'} · Manyetik nesneler yönü etkileyebilir.</Text>}
  {targets.length>0&&<><Text style={{color:p.text,fontSize:17,fontWeight:'700'}}>Gözlem planındaki gök cisimleri</Text>{targets.map(t=>{
   const delta=heading===null?null:difference(t.azimuth,heading);
   return <View key={t.name} style={{padding:12,borderWidth:1,borderColor:p.line,borderRadius:13,backgroundColor:p.input,flexDirection:'row',alignItems:'center',gap:12}}><Text style={{fontSize:25,color:p.accent}}>{t.icon}</Text><View style={{flex:1}}><Text style={{color:p.text,fontWeight:'700'}}>{t.name}</Text><Text style={{color:p.sub,fontSize:12}}>{bearing(t.azimuth)} {t.azimuth}° · ufuktan {t.altitude}° yukarı</Text></View><Text style={{color:p.accent,fontWeight:'700'}}>{delta===null?'—':Math.abs(delta)<12?'Karşında':Math.round(Math.abs(delta))+'° '+(delta>0?'sağa':'sola')}</Text></View>;
  })}</>}
  <Text style={{color:p.sub,fontSize:11,lineHeight:17}}>Yönler yaklaşık değerdir. Sensör bulunmayan cihazlarda pusula çalışmayabilir; hedeflerin sayısal yönleri yine görüntülenir.</Text>
 </View>;
}
