import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,Text,TextInput,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {DECKS,deckIds,shuffledCards,type Card,type DeckId} from './cardDecks';
import {getCardReading} from './cardReadingApi';

type Palette={panel:string;line:string;text:string;sub:string;accent:string;input:string;button:string};
export function CardReadings({p}:{p:Palette}){
 const [deck,setDeck]=useState<DeckId>('tarot');
 const [spread,setSpread]=useState<'daily'|'three'>('daily');
 const [choices,setChoices]=useState<Card[]>(()=>shuffledCards('tarot').slice(0,7));
 const [selected,setSelected]=useState<Card[]>([]);
 const [question,setQuestion]=useState('');
 const [reading,setReading]=useState('');
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(false);
 const date=new Date().toLocaleDateString('sv-SE');
 const dailyKey='sky.dailyCard.'+deck+'.'+date;
 useEffect(()=>{
  let active=true;
  setChoices(shuffledCards(deck).slice(0,7));setSelected([]);setReading('');setError('');
  if(spread==='daily')AsyncStorage.getItem(dailyKey).then(id=>{
   const card=DECKS[deck].cards.find(item=>item.id===id);
   if(active&&card)setSelected([card]);
  }).catch(()=>{});
  return()=>{active=false;};
 },[deck,spread,date]);
 function pick(card:Card){
  if(selected.length>=(spread==='daily'?1:3))return;
  const next=[...selected,card];setSelected(next);setReading('');setError('');
  if(spread==='daily')AsyncStorage.setItem(dailyKey,card.id).catch(()=>{});
 }
 function restart(){setChoices(shuffledCards(deck).slice(0,7));setSelected([]);setReading('');setError('');}
 async function interpret(){
  setLoading(true);setError('');
  try{setReading(await getCardReading(deck,spread,selected,question));}
  catch(e){setError(e instanceof Error?e.message:'Yorum alınamadı.');}
  finally{setLoading(false);}
 }
 const line={borderColor:p.line},cardBackground={backgroundColor:p.panel};
 return <View style={{gap:14}}>
  <Text style={{color:p.text,fontSize:25,fontFamily:'serif'}}>✧ Kart Yorumları</Text>
  <Text style={{color:p.sub,fontSize:13}}>Kartları kendin seç; yorumları düşünmek ve eğlenmek için oku.</Text>
  <View style={{flexDirection:'row',gap:6}}>{deckIds.map(id=><Pressable key={id} accessibilityRole="button" onPress={()=>setDeck(id)} style={{flex:1,paddingVertical:12,paddingHorizontal:3,borderRadius:16,alignItems:'center',backgroundColor:deck===id?p.accent:p.input}}><Text style={{color:deck===id?p.button:p.text,fontSize:13,fontWeight:'700'}}>{DECKS[id].title}</Text></Pressable>)}</View>
  <Text style={{color:p.sub,fontSize:12}}>{DECKS[deck].description}</Text>
  <View style={{flexDirection:'row',gap:8}}>{(['daily','three'] as const).map(id=><Pressable key={id} accessibilityRole="button" onPress={()=>setSpread(id)} style={{flex:1,borderRadius:14,borderWidth:1,padding:12,...line,backgroundColor:spread===id?p.accent:p.panel}}><Text style={{color:spread===id?p.button:p.text,textAlign:'center',fontWeight:'700'}}>{id==='daily'?'☾ Günün kartı':'✦ Üç kart'}</Text></Pressable>)}</View>
  {spread==='three'&&<TextInput value={question} onChangeText={value=>{setQuestion(value);setReading('');}} maxLength={180} placeholder="İstersen bir soru yaz (isteğe bağlı)" placeholderTextColor={p.sub} style={{color:p.text,backgroundColor:p.input,borderWidth:1,...line,borderRadius:15,padding:13}}/>}
  <Text style={{color:p.text,fontSize:15,fontWeight:'700'}}>{spread==='daily'?'Bugünün sembolünü seç':'Geçmiş · Bugün · Olasılık için üç kart seç'}</Text>
  {selected.length<(spread==='daily'?1:3)?<View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:9}}>{choices.filter(card=>!selected.some(item=>item.id===card.id)).map(card=><Pressable key={card.id} accessibilityRole="button" accessibilityLabel="Kapalı kartı seç" onPress={()=>pick(card)} style={{width:'21%',height:105,borderRadius:13,borderWidth:2,...line,backgroundColor:p.input,alignItems:'center',justifyContent:'center'}}><Text style={{color:p.accent,fontSize:28}}>✧</Text><Text style={{color:p.sub,fontSize:12}}>☾ ✦</Text></Pressable>)}</View>:null}
  {selected.map((card,i)=><View key={card.id} style={{borderWidth:1,...line,...cardBackground,borderRadius:18,padding:14,flexDirection:'row',gap:12,alignItems:'center'}}><Text style={{color:p.accent,fontSize:36}}>{card.symbol}</Text><View style={{flex:1}}><Text style={{color:p.sub,fontSize:11}}>{spread==='daily'?'GÜNÜN KARTI':['GEÇMİŞ','BUGÜN','OLASILIK'][i]}</Text><Text style={{color:p.text,fontSize:19,fontFamily:'serif'}}>{card.name}</Text><Text style={{color:p.sub,fontSize:12}}>{card.meaning}</Text></View></View>)}
  {selected.length===(spread==='daily'?1:3)&&<Pressable accessibilityRole="button" disabled={loading} onPress={()=>void interpret()} style={{backgroundColor:p.accent,padding:16,borderRadius:17,alignItems:'center'}}><Text style={{color:p.button,fontWeight:'800'}}>{loading?'Yorum hazırlanıyor…':'✦ Yapay zekâ ile yorumla'}</Text></Pressable>}
  {loading&&<ActivityIndicator color={p.accent}/>}
  {!!error&&<Text style={{color:p.text,fontSize:13}}>{error}</Text>}
  {!!reading&&<View style={{padding:16,borderRadius:18,borderWidth:1,...line,...cardBackground}}><Text style={{color:p.accent,fontSize:20,fontFamily:'serif',marginBottom:9}}>Gökyüzünden bir yorum</Text><Text style={{color:p.text,fontSize:15,lineHeight:24}}>{reading}</Text></View>}
  {spread==='three'&&selected.length>0&&<Pressable accessibilityRole="button" onPress={restart} style={{padding:12,alignItems:'center'}}><Text style={{color:p.accent,fontWeight:'700'}}>Kartları yeniden karıştır</Text></Pressable>}
  <Text style={{color:p.sub,fontSize:11,lineHeight:17}}>Bu kartlar ve yapay zekâ yorumları yalnızca eğlence amaçlıdır; gelecek hakkında kesin bilgi vermez. Yazdığın soru yorum oluşturmak için sunucuya gönderilir; soru yazmak zorunda değilsin.</Text>
 </View>;
}
