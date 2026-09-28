import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Alert, Pressable, Share, Text, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Palette={text:string;sub:string;accent:string;input:string;line:string;button:string};
type Fortune={message:string;question:string};
const fortunes:Fortune[]=[
 {message:'Bugün küçük bir merak, yeni bir kapı aralayabilir.',question:'Uzun zamandır neyi öğrenmek istiyorsun?'},
 {message:'Yıldızlar kadar çok olasılık, tek bir adımla başlar.',question:'Bugün hangi küçük adımı seçersin?'},
 {message:'Bulutların arasındaki açıklık gibi, dinlenmeye de yer aç.',question:'Kendine nasıl kısa bir mola verebilirsin?'},
 {message:'Sakin bir an, zihnindeki sesleri daha iyi duymanı sağlayabilir.',question:'Şu an en çok neye ihtiyacın var?'},
 {message:'Bir teşekkür, sıradan bir günü aydınlatabilir.',question:'Bugün kime teşekkür etmek istersin?'},
 {message:'Ayın evreleri gibi, değişmek de doğal bir süreç.',question:'Hangi değişimi daha nazik karşılayabilirsin?'},
 {message:'Cevapları ararken güzel bir soruyu da yanında taşı.',question:'Kendine hangi soruyu sormak iyi gelir?'},
 {message:'Ufka bakmak bazen başladığın yeri hatırlatır.',question:'Seni bugüne getiren hangi çabanı takdir ediyorsun?'},
 {message:'Küçük bir iyilik sessizce büyüyebilir.',question:'Bugün kimin gününü kolaylaştırabilirsin?'},
 {message:'Her şeyin aynı anda netleşmesi gerekmiyor.',question:'Bugün hangi belirsizliğe biraz alan açabilirsin?'},
 {message:'Rüzgâr yön değiştirse de kendi ritmini bulabilirsin.',question:'Sana iyi gelen alışkanlık hangisi?'},
 {message:'Gökyüzüne bakmak için bazen bir dakika yeter.',question:'Bugün fark ettiğin güzel bir ayrıntı neydi?'},
 {message:'Yeni bir fikir, alışılmış yola küçük bir sapmayla gelebilir.',question:'Hangi rutini farklı denemek istersin?'},
 {message:'Bazen en cesur adım, yardım istemektir.',question:'Kiminle konuşmak sana iyi gelebilir?'},
 {message:'Bir anı biriktirmek için kusursuz bir gün gerekmez.',question:'Bugün hangi anı hatırlamak istersin?'},
 {message:'Kendi hızında ilerlemek de ilerlemektir.',question:'Bugün kendine nasıl daha anlayışlı davranırsın?'},
 {message:'Güneşin sıcaklığı kadar, serin gölge de değerlidir.',question:'Enerjini korumak için neye hayır diyebilirsin?'},
 {message:'Küçük bir başlangıç, büyük bir planı hafifletebilir.',question:'Ertelediğin şeyin en kolay ilk adımı ne?'},
 {message:'Bazen alışılmadık bir bakış yeni bir yol gösterir.',question:'Bir arkadaşın bu duruma nasıl bakardı?'},
 {message:'İyi bir sohbet, günün en güzel sürprizi olabilir.',question:'Bugün kimin hâlini sormak istersin?'},
 {message:'Gece göğündeki ışıklar gibi, küçük başarıların da görünmeyi hak ediyor.',question:'Bugün hangi başarını kutlarsın?'},
 {message:'Hafiflemek için her şeyi taşımak zorunda değilsin.',question:'Neyi bırakmak sana iyi gelebilir?'},
 {message:'Bir yürüyüş, düşüncelerini yeni bir sıraya koyabilir.',question:'Bugün kendine nasıl hareket alanı açarsın?'},
 {message:'Merakını izlemek, kendini tanımanın bir yolu olabilir.',question:'Şu sıralar en çok ne ilgini çekiyor?'},
];
const key='sky.fortuneCookie.daily.';
const historyKey='sky.fortuneCookie.history';
type Saved={date:string;index:number};

export function FortuneCookie({p,onJournal}:{p:Palette;onJournal:(text:string)=>void}){
 const date=new Date().toLocaleDateString('sv-SE');
 const [loading,setLoading]=useState(true);
 const [opened,setOpened]=useState(false);
 const [index,setIndex]=useState<number|null>(null);
 const [busy,setBusy]=useState(false);
 const [history,setHistory]=useState<Saved[]>([]);
 const [showHistory,setShowHistory]=useState(false);
 useEffect(()=>{
  let active=true;
  void (async()=>{
   try{
    const [saved,previous]=await Promise.all([AsyncStorage.getItem(key+date),AsyncStorage.getItem(historyKey)]);
    const value=saved===null?null:Number(saved);
    const entries:unknown=previous?JSON.parse(previous):[];
    if(active){setIndex(value!==null&&Number.isInteger(value)&&value>=0&&value<fortunes.length?value:null);setHistory(Array.isArray(entries)?entries.filter((entry):entry is Saved=>typeof entry?.date==='string'&&Number.isInteger(entry?.index)&&entry.index>=0&&entry.index<fortunes.length).slice(0,14):[]);}
   }catch{if(active)Alert.alert('Kurabiye yüklenemedi','Cihazındaki kayıtlar okunamadı. Yeniden deneyebilirsin.');}
   finally{if(active)setLoading(false);}
  })();
  return()=>{active=false;};
 },[date]);
 const open=async()=>{
  if(busy)return;
  if(index!==null){setOpened(true);return;}
  setBusy(true);
  try{
   const choice=Math.floor(Math.random()*fortunes.length);
   const next=[{date,index:choice},...history.filter(item=>item.date!==date)].slice(0,14);
   await AsyncStorage.multiSet([[key+date,String(choice)],[historyKey,JSON.stringify(next)]]);
   setIndex(choice);setHistory(next);setOpened(true);
  }catch{Alert.alert('Mesaj kaydedilemedi','Telefonundaki depolamayı kontrol edip yeniden dene.');}
  finally{setBusy(false);}
 };
 const current=index===null?null:fortunes[index];
 const label=(value:string,size=15,color=p.text)=><Text style={{color,fontSize:size,lineHeight:size+7}}>{value}</Text>;
 const button=(title:string,action:()=>void,secondary=false)=><Pressable accessibilityRole="button" onPress={action} style={{backgroundColor:secondary?p.input:p.accent,padding:14,borderRadius:15,alignItems:'center',marginTop:10}}><Text style={{color:secondary?p.text:p.button,fontWeight:'800',fontSize:15}}>{title}</Text></Pressable>;
 return <View>
  <Text style={{color:p.text,fontSize:26,fontWeight:'800'}}>🥠 Şans Kurabiyesi</Text>
  <View style={{marginTop:8}}>{label('Gökyüzünden ilham alan küçük bir düşünme molası. Her gün bir mesaj açabilirsin.',14,p.sub)}</View>
  <View style={{alignItems:'center',paddingVertical:22}}><Text style={{fontSize:74}}>{opened?'✨':'🥠'}</Text></View>
  {loading?<ActivityIndicator color={p.accent}/>:opened&&current?<View style={{backgroundColor:p.input,borderColor:p.line,borderWidth:1,borderRadius:18,padding:20}}>
   <Text style={{fontSize:15,fontWeight:'700',color:p.accent}}>✦ BUGÜNÜN MESAJI</Text>
   <Text style={{color:p.text,fontSize:21,fontWeight:'700',lineHeight:31,marginTop:12}}>{current.message}</Text>
   <Text style={{color:p.sub,fontSize:15,lineHeight:23,marginTop:17}}>{current.question}</Text>
  </View>:button('🥠 Kurabiyeyi aç',()=>void open())}
  {opened&&current&&<>
   {button('Paylaş',()=>void Share.share({message:`🥠 Gökyüzünün Sesi\n${current.message}\n${current.question}\n(Eğlence ve düşünme amaçlıdır.)`}).catch(()=>Alert.alert('Paylaşılamadı','Cihazın paylaşım menüsü açılamadı.')),true)}
   {button('Günlükte düzenle',()=>onJournal(`${current.message}\n${current.question}`),true)}
  </>}
  {history.length>0&&<>
   {button(`Önceki mesajlarım (${history.length}) ${showHistory?'⌃':'⌄'}`,()=>setShowHistory(!showHistory),true)}
   {showHistory&&history.map(item=><View key={item.date} style={{padding:13,borderBottomWidth:1,borderColor:p.line}}><Text style={{color:p.sub,fontSize:12}}>{item.date}</Text>{label(fortunes[item.index].message,14)}</View>)}
  </>}
  <View style={{marginTop:20}}>{label('Mesajlar rastgele seçilen sembolik düşüncelerdir; geleceği haber vermez. Yalnızca bu cihazda saklanır.',12,p.sub)}</View>
 </View>;
}
