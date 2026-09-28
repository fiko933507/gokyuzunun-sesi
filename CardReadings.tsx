import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,Text,TextInput,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {DECKS,deckIds,shuffledCards,type Card,type DeckId} from './cardDecks';
import {getCardReading} from './cardReadingApi';
import {localCardReading} from './localCardReading';

type Palette={panel:string;line:string;text:string;sub:string;accent:string;input:string;button:string};
type HistoryEntry={id:string;date:string;deck:DeckId;spread:'daily'|'three';cards:string[];reading:string};
const HISTORY_KEY='sky.cardHistory';
export function CardReadings({p}:{p:Palette}){
 const [deck,setDeck]=useState<DeckId>('tarot');
 const [spread,setSpread]=useState<'daily'|'three'>('daily');
 const [choices,setChoices]=useState<Card[]>(()=>shuffledCards('tarot').slice(0,7));
 const [selected,setSelected]=useState<Card[]>([]);
 const [question,setQuestion]=useState('');
 const [reading,setReading]=useState('');
 const [readingSource,setReadingSource]=useState<'ai'|'local'>('ai');
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(false);
 const [history,setHistory]=useState<HistoryEntry[]>([]);
 const [historyOpen,setHistoryOpen]=useState(false);
 useEffect(()=>{AsyncStorage.getItem(HISTORY_KEY).then(raw=>{if(raw){const entries=JSON.parse(raw);if(Array.isArray(entries))setHistory(entries.slice(0,30));}}).catch(()=>{});},[]);
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
  try{
   const result=await getCardReading(deck,spread,selected,question);
   setReading(result);setReadingSource('ai');
   const record:HistoryEntry={id:Date.now()+'-'+Math.random(),date:new Date().toLocaleString('tr-TR'),deck,spread,cards:selected.map(card=>card.id),reading:result};
   setHistory(previous=>{const next=[record,...previous].slice(0,30);void AsyncStorage.setItem(HISTORY_KEY,JSON.stringify(next));return next;});
  }
  catch(e){setError((e instanceof Error?e.message:'Yorum alınamadı.')+' Kart anlamlarından hazırlanan yerel yorum aşağıda gösteriliyor.');setReading(localCardReading(selected,spread));setReadingSource('local');}
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
  {!!reading&&<View style={{padding:16,borderRadius:18,borderWidth:1,...line,...cardBackground}}><Text style={{color:p.accent,fontSize:20,fontFamily:'serif',marginBottom:9}}>{readingSource==='ai'?'Gökyüzünden bir yorum':'Yerel sembolik yorum'}</Text><Text style={{color:p.text,fontSize:15,lineHeight:24}}>{reading}</Text>{readingSource==='local'&&<Text style={{color:p.sub,fontSize:11,marginTop:10}}>Bu metin kartların kayıtlı anlamlarından telefonda oluşturuldu; yapay zekâ yanıtı değildir.</Text>}</View>}
  {spread==='three'&&selected.length>0&&<Pressable accessibilityRole="button" onPress={restart} style={{padding:12,alignItems:'center'}}><Text style={{color:p.accent,fontWeight:'700'}}>Kartları yeniden karıştır</Text></Pressable>}
  <Pressable accessibilityRole="button" onPress={()=>setHistoryOpen(!historyOpen)} style={{paddingVertical:12,borderTopWidth:1,...line}}><Text style={{color:p.accent,fontSize:17,fontWeight:'700'}}>☾ Kart geçmişim ({history.length}) {historyOpen?'⌄':'›'}</Text></Pressable>
  {historyOpen&&history.map(item=><View key={item.id} style={{padding:13,borderRadius:17,borderWidth:1,...line,...cardBackground}}><Text style={{color:p.sub,fontSize:11}}>{item.date} · {DECKS[item.deck]?.title} · {item.spread==='daily'?'Günün kartı':'Üç kart'}</Text><Text style={{color:p.text,fontWeight:'700',marginVertical:7}}>{item.cards.map(id=>DECKS[item.deck]?.cards.find(card=>card.id===id)?.name||id).join(' · ')}</Text><Text style={{color:p.text,lineHeight:21}}>{item.reading}</Text><Pressable accessibilityRole="button" onPress={()=>{setHistory(prev=>{const next=prev.filter(entry=>entry.id!==item.id);void AsyncStorage.setItem(HISTORY_KEY,JSON.stringify(next));return next;});}} style={{alignSelf:'flex-end',padding:8}}><Text style={{color:p.accent}}>Kaydı sil</Text></Pressable></View>)}
  <Text style={{color:p.sub,fontSize:11,lineHeight:17}}>Kartlar ve yapay zekâ yorumları yalnızca eğlence amaçlıdır; gelecek hakkında kesin bilgi vermez. Yazdığın soru sunucuya gönderilir; ayrı bir alan olarak geçmişe kaydedilmez. Yorum metninde sorunun geçebileceğini unutma. Başarılı yorumlar yalnızca bu cihazda saklanır.</Text>
 </View>;
}
