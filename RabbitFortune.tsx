import React, {useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, Animated, Easing, Pressable, Share, Text, View} from 'react-native';

const fortunes=[
 {title:'Cesaret',message:'Küçük bir adım bile kendine verdiğin sözü güçlendirir.',question:'Bugün hangi adımı deneyebilirsin?'},
 {title:'Neşe',message:'Kendine gülümsemek için küçük bir sebep bulmaya izin ver.',question:'Bugün seni ne gülümsetti?'},
 {title:'Merak',message:'Yeni bir soru sormak, alışılmış bir günü renklendirebilir.',question:'Neyi keşfetmek istersin?'},
 {title:'Dinlenme',message:'Mola vermek de yolculuğunun değerli bir parçasıdır.',question:'Kendine nasıl nefes alanı açarsın?'},
 {title:'Dostluk',message:'İçten bir selam, güzel bir sohbetin başlangıcı olabilir.',question:'Bugün kimin hâlini sorabilirsin?'},
 {title:'Umut',message:'Bir sonraki sayfayı yazmak için mükemmel anı beklemek gerekmez.',question:'Yeni bir başlangıcın ilk cümlesi ne olur?'},
 {title:'Şefkat',message:'Kendine bir arkadaşına konuştuğun kadar nazik davran.',question:'Bugün kendine ne söylemek istersin?'},
 {title:'Işık',message:'Gün içindeki güzel ayrıntıları fark etmek iyi gelebilir.',question:'Şimdi gördüğün hoş bir ayrıntı ne?'},
] as const;
const icons=['🐇','🌟','🐰','🌙','🐇','✨','🐰','☀️'];
type Palette={text:string;sub:string;accent:string;input:string;line:string;button:string};
const SIZE=280;

export function RabbitFortune({p,onJournal}:{p:Palette;onJournal:(text:string)=>void}){
 const rotation=useRef(new Animated.Value(0)).current;
 const rabbit=useRef(new Animated.Value(0)).current;
 const paper=useRef(new Animated.Value(0)).current;
 const hops=useRef(new Animated.Value(0)).current;
 const turn=useRef(0);
 const busy=useRef(false);
 const alive=useRef(true);
 const [spinning,setSpinning]=useState(false);
 const [phase,setPhase]=useState<'idle'|'spin'|'draw'|'result'>('idle');
 const [chosen,setChosen]=useState<number|null>(null);
 const [reducedMotion,setReducedMotion]=useState(false);
 useEffect(()=>{alive.current=true;void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(alive.current)setReducedMotion(value);}).catch(()=>{});return()=>{alive.current=false;rotation.stopAnimation();rabbit.stopAnimation();paper.stopAnimation();hops.stopAnimation();};},[rotation,rabbit,paper,hops]);
 const spin=()=>{
  if(busy.current)return;
  busy.current=true;setSpinning(true);setChosen(null);setPhase('spin');
  rabbit.setValue(0);paper.setValue(0);hops.setValue(0);
  const choice=Math.floor(Math.random()*fortunes.length);
  const next=turn.current+4+(fortunes.length-choice)/fortunes.length;
  Animated.timing(rotation,{toValue:next,duration:reducedMotion?250:2800,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start(({finished})=>{
   if(!finished||!alive.current){busy.current=false;return;}
   turn.current=next;setPhase('draw');
   Animated.sequence([
    Animated.parallel([
     Animated.timing(rabbit,{toValue:1,duration:reducedMotion?100:650,easing:Easing.out(Easing.quad),useNativeDriver:true}),
     Animated.sequence([Animated.timing(hops,{toValue:1,duration:reducedMotion?50:320,useNativeDriver:true}),Animated.timing(hops,{toValue:0,duration:reducedMotion?50:330,useNativeDriver:true})]),
    ]),
    Animated.timing(paper,{toValue:1,duration:reducedMotion?100:750,easing:Easing.out(Easing.back(1.4)),useNativeDriver:true}),
   ]).start(({finished:drawn})=>{
    if(!drawn||!alive.current){busy.current=false;return;}
    setChosen(choice);setPhase('result');setSpinning(false);busy.current=false;
   });
  });
 };
 const selected=chosen===null?null:fortunes[chosen];
 const spinDegrees=rotation.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']});
 return <View>
  <Text style={{color:p.text,fontWeight:'800',fontSize:25}}>🐇 Tavşan Falcısı</Text>
  <Text style={{color:p.sub,marginTop:8,lineHeight:21}}>Çarkı çevir; tavşan senin için bir motivasyon notu çeksin.</Text>
  <View style={{alignItems:'center',marginTop:20}}>
   <Text style={{color:p.accent,fontSize:32,marginBottom:-8,zIndex:2}}>▼</Text>
   <Animated.View style={{width:SIZE,height:SIZE,borderRadius:SIZE/2,borderWidth:5,borderColor:p.accent,backgroundColor:p.input,transform:[{rotate:spinDegrees}],alignItems:'center',justifyContent:'center'}}>
    <View style={{position:'absolute',width:SIZE-35,height:SIZE-35,borderRadius:SIZE/2,borderWidth:1,borderColor:p.line}}/>
    {fortunes.map((item,i)=>{
     const angle=(i*2*Math.PI/fortunes.length)-Math.PI/2;
     return <View key={item.title} style={{position:'absolute',left:SIZE/2-35+Math.cos(angle)*99,top:SIZE/2-35+Math.sin(angle)*99,width:60,alignItems:'center'}}><Text style={{fontSize:26}}>{icons[i]}</Text><Text numberOfLines={1} style={{fontSize:10,fontWeight:'700',color:p.text}}>{item.title}</Text></View>;
    })}
    <View style={{height:74,width:74,borderRadius:37,backgroundColor:p.accent,alignItems:'center',justifyContent:'center'}}><Text style={{color:p.button,fontSize:28}}>✦</Text></View>
   </Animated.View>
  </View>
  <View style={{height:125,alignItems:'center',justifyContent:'center',flexDirection:'row',overflow:'hidden'}}>
   <Animated.Text style={{fontSize:62,transform:[{translateX:rabbit.interpolate({inputRange:[0,1],outputRange:[-48,6]})},{translateY:hops.interpolate({inputRange:[0,1],outputRange:[0,-20]})}]}}>🐇</Animated.Text>
   <Animated.View style={{marginLeft:8,alignItems:'center',transform:[{translateX:paper.interpolate({inputRange:[0,1],outputRange:[-24,15]})},{rotate:paper.interpolate({inputRange:[0,1],outputRange:['-12deg','0deg']})}]}}><Text style={{fontSize:48}}>{phase==='idle'||phase==='spin'?'✉️':'📜'}</Text></Animated.View>
  </View>
  {phase==='draw'&&<Text style={{color:p.sub,textAlign:'center',marginBottom:12}}>Tavşan kâğıdını çekiyor…</Text>}
  <Pressable accessibilityRole="button" accessibilityLabel="Tavşanlı şans çarkını çevir" disabled={spinning} onPress={spin} style={{backgroundColor:p.accent,borderRadius:15,padding:16,alignItems:'center',opacity:spinning?.6:1}}><Text style={{fontSize:16,fontWeight:'800',color:p.button}}>{spinning?'Çark dönüyor…':'✦ Çarkı çevir'}</Text></Pressable>
  {selected&&<View accessibilityLiveRegion="polite" style={{borderWidth:1,borderColor:p.line,backgroundColor:p.input,borderRadius:16,padding:19,marginTop:18}}>
   <Text style={{color:p.accent,fontWeight:'800',fontSize:16}}>📜 {selected.title}</Text>
   <Text style={{color:p.text,fontWeight:'700',fontSize:19,lineHeight:29,marginTop:8}}>{selected.message}</Text>
   <Text style={{color:p.sub,fontSize:15,marginTop:12,lineHeight:22}}>{selected.question}</Text>
   <Pressable accessibilityRole="button" onPress={()=>void Share.share({message:`🐇 Tavşan Falcısı: ${selected.title}\n${selected.message}\n${selected.question}\n(Eğlence ve motivasyon amaçlıdır.)`})} style={{padding:12,marginTop:10}}><Text style={{color:p.accent,fontWeight:'700'}}>Paylaş ↗</Text></Pressable>
   <Pressable accessibilityRole="button" onPress={()=>onJournal(`${selected.message}\n${selected.question}`)} style={{padding:12}}><Text style={{color:p.accent,fontWeight:'700'}}>Günlükte düzenle ↗</Text></Pressable>
  </View>}
  <Text style={{color:p.sub,fontSize:12,lineHeight:18,marginTop:18}}>Çarkın mesajları eğlence ve motivasyon içindir; gelecek hakkında kesin bilgi vermez.</Text>
 </View>;
}
