import React, {useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, Alert, Animated, Easing, Pressable, Share, Text, TextInput, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export function RabbitFortune({p,onJournal,playAudio}:{p:Palette;onJournal:(text:string)=>void;playAudio:(index:number)=>Promise<void>}){
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
 const [question,setQuestion]=useState('');
 const [reading,setReading]=useState('');
 const [readingError,setReadingError]=useState('');
 const [readingBusy,setReadingBusy]=useState(false);
 const [character,setCharacter]=useState('Neşeli Tavşan');
 const [daily,setDaily]=useState(false);
 const [openedDates,setOpenedDates]=useState<string[]>([]);
 const date=new Date().toLocaleDateString('sv-SE');
 useEffect(()=>{alive.current=true;void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(alive.current)setReducedMotion(value);}).catch(()=>{});void AsyncStorage.multiGet(['sky.rabbit.daily','sky.rabbit.opened','sky.rabbit.character']).then(([d,o,c])=>{if(d[1]===date)setDaily(true);if(o[1]){try{setOpenedDates(JSON.parse(o[1]));}catch{}}if(c[1])setCharacter(c[1]!);}).catch(()=>{});return()=>{alive.current=false;rotation.stopAnimation();rabbit.stopAnimation();paper.stopAnimation();hops.stopAnimation();};},[rotation,rabbit,paper,hops,date]);
 const spin=()=>{
  if(busy.current)return;
  busy.current=true;setSpinning(true);setChosen(null);setReading('');setReadingError('');setPhase('spin');
  rabbit.setValue(0);paper.setValue(0);hops.setValue(0);
  const choice=Math.floor(Math.random()*fortunes.length);
  const next=Math.ceil(turn.current)+4+((fortunes.length-choice)%fortunes.length)/fortunes.length;
  Animated.timing(rotation,{toValue:next,duration:reducedMotion?250:2800,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start(({finished})=>{
   if(!finished||!alive.current){busy.current=false;return;}
   turn.current=next;setPhase('draw');
   Animated.parallel([
    Animated.timing(rabbit,{toValue:1,duration:reducedMotion?160:850,easing:Easing.out(Easing.quad),useNativeDriver:true}),
    Animated.sequence([Animated.timing(hops,{toValue:1,duration:reducedMotion?80:410,useNativeDriver:true}),Animated.timing(hops,{toValue:0,duration:reducedMotion?80:440,useNativeDriver:true})]),
    Animated.timing(paper,{toValue:1,duration:reducedMotion?160:850,easing:Easing.out(Easing.quad),useNativeDriver:true}),
   ]).start(({finished:drawn})=>{
    if(!drawn||!alive.current){busy.current=false;return;}
   setChosen(choice);setPhase('result');setSpinning(false);busy.current=false;setDaily(true);setOpenedDates(prev=>{const next=[date,...prev.filter(item=>item!==date)].slice(0,30);void AsyncStorage.multiSet([['sky.rabbit.daily',date],['sky.rabbit.opened',JSON.stringify(next)]]);return next;});
   });
  });
 };
 const selected=chosen===null?null:fortunes[chosen];
 const ask=async()=>{
  if(chosen===null||readingBusy||question.trim().length<4){Alert.alert('Sorunu yaz','Yorum için en az dört karakterlik bir soru gir.');return;}
  setReadingBusy(true);setReadingError('');setReading('');
  try{
   const response=await fetch('https://gokyuzunun-sesi.onrender.com/api/rabbit-reading',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({index:chosen,character,question:question.trim().slice(0,240)})});
   const payload=await response.json() as {reading?:string;code?:string};
   if(!response.ok)throw new Error(payload.code==='provider_quota'||payload.code==='provider_unavailable'?'Yapay zekâ servisi şu anda yanıt veremiyor veya bakiyesi tükenmiş. Soruya özel yorum oluşturulmadı.':payload.code==='daily_limit'?'Günlük soru sınırına ulaşıldı.':response.status===404?'Yorum servisi henüz güncellenmedi.':'Soru yorumlanamadı. Biraz sonra tekrar dene.');
   if(!payload.reading)throw new Error('Boş yanıt alındı.');
   setReading(payload.reading);
  }catch(error){setReadingError(error instanceof Error?error.message:'Soru yorumlanamadı.');}
  finally{setReadingBusy(false);}
 };
 const spinDegrees=rotation.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']});
 return <View>
  <Text style={{color:p.text,fontWeight:'800',fontSize:25}}>🐇 Tavşan Falcısı</Text>
  <Text style={{color:p.sub,marginTop:8,lineHeight:21}}>Çarkı çevir; tavşan senin için bir motivasyon notu çeksin.</Text>
  <View style={{flexDirection:'row',gap:8,marginTop:14,flexWrap:'wrap'}}>{['Neşeli Tavşan','Bilge Tavşan','Romantik Tavşan'].map(name=><Pressable key={name} onPress={()=>{setCharacter(name);void AsyncStorage.setItem('sky.rabbit.character',name);}} style={{paddingVertical:8,paddingHorizontal:10,borderRadius:14,backgroundColor:character===name?p.accent:p.input}}><Text style={{color:character===name?p.button:p.text,fontSize:12,fontWeight:'700'}}>{name}</Text></Pressable>)}</View>
  <View style={{marginTop:12,borderWidth:1,borderColor:p.line,borderRadius:14,padding:12,backgroundColor:p.input}}><Text style={{color:p.sub,fontSize:12}}>Bugünün tavşanı · {daily?'Bugün çarkı çevirdin':'Henüz çarkı çevirmedin'} · Açılan gün sayısı: {openedDates.length}</Text></View>
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
  <View style={{height:165,width:280,alignSelf:'center',overflow:'hidden'}}>
   <Animated.View accessibilityLabel={character+' notu yakalıyor'} style={{position:'absolute',left:100,top:43,width:125,height:120,transform:[{translateX:rabbit.interpolate({inputRange:[0,1],outputRange:[32,-10]})},{translateY:hops.interpolate({inputRange:[0,1],outputRange:[0,-18]})}]}}>
    <Text style={{fontSize:95,lineHeight:110}}>🐇</Text>
    <Text style={{position:'absolute',left:39,top:-8,fontSize:39}}>{character==='Bilge Tavşan'?'🎓':character==='Romantik Tavşan'?'🎀':'🎉'}</Text>
   </Animated.View>
   {phase!=='spin'&&<Animated.View style={{position:'absolute',left:112,top:0,transform:[{translateY:paper.interpolate({inputRange:[0,1],outputRange:[-65,85]})},{rotate:paper.interpolate({inputRange:[0,1],outputRange:['-15deg','8deg']})}]}}><Text style={{fontSize:51}}>{phase==='idle'?'✉️':'📜'}</Text></Animated.View>}
  </View>
  {phase==='draw'&&<Text style={{color:p.sub,textAlign:'center',marginBottom:12}}>Not tavşanın patisine iniyor…</Text>}
  <Pressable accessibilityRole="button" accessibilityLabel="Tavşanlı şans çarkını çevir" disabled={spinning} onPress={spin} style={{backgroundColor:p.accent,borderRadius:15,padding:16,alignItems:'center',opacity:spinning?.6:1}}><Text style={{fontSize:16,fontWeight:'800',color:p.button}}>{spinning?'Çark dönüyor…':'✦ Çarkı çevir'}</Text></Pressable>
  <Text style={{color:p.sub,fontSize:13,fontWeight:'700',marginTop:18}}>Tavşana bir soru bırak</Text>
  <TextInput value={question} onChangeText={value=>{setQuestion(value);setReading('');setReadingError('');}} placeholder="Bugün neyi bilmek istersin?" placeholderTextColor={p.sub} multiline style={{minHeight:48,maxHeight:90,borderWidth:1,borderColor:p.line,borderRadius:13,padding:12,color:p.text,backgroundColor:p.input,marginTop:7}} />
  {selected&&question.trim().length>0&&<Pressable accessibilityRole="button" disabled={readingBusy} onPress={()=>void ask()} style={{padding:13,backgroundColor:p.accent,borderRadius:12,marginTop:10}}><Text style={{color:p.button,fontWeight:'700',textAlign:'center'}}>{readingBusy?'Soru yorumlanıyor…':'✦ Sorumu yorumla'}</Text></Pressable>}
  {selected&&<View accessibilityLiveRegion="polite" style={{borderWidth:1,borderColor:p.line,backgroundColor:p.input,borderRadius:16,padding:19,marginTop:18}}>
   <Text style={{color:p.accent,fontWeight:'800',fontSize:16}}>📜 {selected.title}</Text>
   <Text style={{color:p.text,fontWeight:'700',fontSize:19,lineHeight:29,marginTop:8}}>{selected.message}</Text>
   <Text style={{color:p.sub,fontSize:15,marginTop:12,lineHeight:22}}>{selected.question}</Text>
   {!!reading&&<Text style={{color:p.text,fontSize:15,lineHeight:23,marginTop:12}}>{reading}</Text>}
   {!!readingError&&<Text style={{color:p.sub,fontSize:13,marginTop:12}}>{readingError}</Text>}
   <Pressable accessibilityRole="button" onPress={()=>void playAudio(chosen!)} style={{padding:12,marginTop:4}}><Text style={{color:p.accent,fontWeight:'700'}}>🔊 Astroloji sesiyle notu dinle</Text></Pressable>
   <Pressable accessibilityRole="button" onPress={()=>void Share.share({message:`🐇 Tavşan Falcısı: ${selected.title}\n${selected.message}\n${selected.question}\n(Eğlence ve motivasyon amaçlıdır.)`})} style={{padding:12,marginTop:10}}><Text style={{color:p.accent,fontWeight:'700'}}>Paylaş ↗</Text></Pressable>
   <Pressable accessibilityRole="button" onPress={()=>onJournal(`${selected.message}\n${selected.question}`)} style={{padding:12}}><Text style={{color:p.accent,fontWeight:'700'}}>Günlükte düzenle ↗</Text></Pressable>
  </View>}
  <Text style={{color:p.sub,fontSize:12,lineHeight:18,marginTop:18}}>Çarkın mesajları eğlence ve motivasyon içindir; gelecek hakkında kesin bilgi vermez.</Text>
 </View>;
}
