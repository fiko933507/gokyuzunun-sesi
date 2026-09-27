import React,{useEffect,useMemo,useState} from 'react';
import {Alert,Pressable,StyleSheet,Text,View} from 'react-native';
import {CameraView,useCameraPermissions} from 'expo-camera';
import * as Location from 'expo-location';
import * as Astronomy from 'astronomy-engine';

const OBJECTS=[['Ay',Astronomy.Body.Moon,'☾'],['Venüs',Astronomy.Body.Venus,'♀'],['Mars',Astronomy.Body.Mars,'♂'],['Jüpiter',Astronomy.Body.Jupiter,'♃'],['Satürn',Astronomy.Body.Saturn,'♄']] as const;
const bearing=(degrees:number)=>degrees<22.5||degrees>=337.5?'K':degrees<67.5?'KD':degrees<112.5?'D':degrees<157.5?'GD':degrees<202.5?'G':degrees<247.5?'GB':degrees<292.5?'B':'KB';
export function SkyLens({latitude,longitude,place,dark}:{latitude:number;longitude:number;place:string;dark:boolean}){
 const [permission,requestPermission]=useCameraPermissions();
 const [heading,setHeading]=useState<number|null>(null);
 const [camera,setCamera]=useState(false);
 const [clock,setClock]=useState(Date.now());
 useEffect(()=>{const t=setInterval(()=>setClock(Date.now()),60_000);return()=>clearInterval(t);},[]);
 useEffect(()=>{
  let active=true;let subscription:Location.LocationSubscription|undefined;
  Location.watchHeadingAsync(h=>{if(active)setHeading(h.trueHeading>=0?h.trueHeading:h.magHeading);},()=>{}).then(s=>{if(active)subscription=s;else s.remove();}).catch(()=>{});
  return()=>{active=false;subscription?.remove();};
 },[]);
 const objects=useMemo(()=>{
  const date=new Date(clock),observer=new Astronomy.Observer(latitude,longitude,0);
  return OBJECTS.map(([name,body,icon])=>{
   const eq=Astronomy.Equator(body,date,observer,true,true);
   const horizontal=Astronomy.Horizon(date,observer,eq.ra,eq.dec,'normal');
   return {name,icon,az:horizontal.azimuth,alt:horizontal.altitude};
  }).filter(x=>x.alt>0).sort((a,b)=>b.alt-a.alt);
 },[clock,latitude,longitude]);
 const nearby=heading===null?[]:objects.filter(x=>Math.abs(((x.az-heading+540)%360)-180)<30);
 async function toggleCamera(){
  if(camera){setCamera(false);return;}
  const result=permission?.granted?permission:await requestPermission();
  if(result.granted)setCamera(true);else Alert.alert('Kamera izni gerekli','Gökyüzü görüntüsü için kamera izni ver. Yön listesi kamera olmadan da çalışır.');
 }
 const foreground=dark?'#FFF2E8':'#302446';
 return <View style={{gap:12}}>
  <Text style={{fontSize:20,color:foreground,fontFamily:'serif'}}>✧ Gökyüzüne Tut · {place}</Text>
  <Text style={{color:foreground,fontSize:12}}>Ekran yönü yaklaşık pusula yönüdür. Telefonu dik tut; manyetik alan doğruluğu etkileyebilir.</Text>
  <View style={styles.lens}>
   {camera&&<CameraView style={StyleSheet.absoluteFill} facing="back"/>}
   <View style={[StyleSheet.absoluteFill,{backgroundColor:camera?'rgba(8,8,32,.25)':'rgba(24,18,58,.68)'}]}/>
   <View style={styles.center}><Text style={{color:'#F2D7AC',fontSize:36}}>⊕</Text><Text style={{color:'#FFFFFF',fontSize:18}}>{heading===null?'Pusula bekleniyor':Math.round(heading)+'° · '+bearing(heading)}</Text><Text style={{color:'#F2D7AC',fontSize:12}}>{nearby.length?nearby.map(x=>x.icon+' '+x.name).join('  ·  '):'Bu yönde listelenen gök cismi ufuk üstünde görünmüyor'}</Text></View>
  </View>
  <Pressable accessibilityRole="button" onPress={()=>void toggleCamera()} style={styles.button}><Text style={{color:'#342447',fontWeight:'700'}}>{camera?'Kamerayı kapat':'Kamera görünümünü aç'}</Text></Pressable>
  {objects.length?objects.map(x=><View key={x.name} style={styles.row}><Text style={{color:foreground,flex:1}}>{x.icon} {x.name}</Text><Text style={{color:foreground}}>{bearing(x.az)} · {Math.round(x.az)}° yön · {Math.round(x.alt)}° yükseklik</Text></View>):<Text style={{color:foreground}}>Bu gök cisimleri şu anda ufkun üstünde değil.</Text>}
  <Text style={{color:foreground,fontSize:11}}>Yönler astronomik konumdan hesaplanır; kamera işaretleri artırılmış gerçeklik kalibrasyonu değildir. Bulutlar ve çevre ışıkları görünürlüğü etkiler.</Text>
 </View>;
}
const styles=StyleSheet.create({lens:{height:285,borderRadius:22,overflow:'hidden',borderWidth:1,borderColor:'#CDB68F'},center:{flex:1,alignItems:'center',justifyContent:'center',padding:12,gap:7},button:{borderRadius:16,backgroundColor:'#F3D6A6',padding:13,alignItems:'center'},row:{flexDirection:'row',borderBottomWidth:.5,borderColor:'#A785AB',paddingVertical:12,gap:8}});
