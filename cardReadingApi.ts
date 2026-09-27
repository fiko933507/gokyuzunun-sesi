import type {DeckId,Card} from './cardDecks';
const API='https://gokyuzunun-sesi.onrender.com';
export async function getCardReading(deck:DeckId,spread:'daily'|'three',cards:Card[],question:string):Promise<string>{
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),35000);
 try{
  const response=await fetch(API+'/api/card-reading',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({deck,spread,cards:cards.map(c=>c.id),question:question.trim().slice(0,180)}),signal:controller.signal});
  if(response.status===503)throw new Error('Yapay zekâ yorumları için sunucuda OPENAI_API_KEY ayarlanmalı. Kartların temel anlamlarını yine görebilirsin.');
  if(response.status===429)throw new Error('Yorum sınırına ulaşıldı. Biraz sonra tekrar dene.');
  if(!response.ok)throw new Error('Yapay zekâ yorumu şu anda alınamıyor. Daha sonra tekrar dene.');
  const data=await response.json() as {reading?:string};
  if(!data.reading||typeof data.reading!=='string')throw new Error('Yorum alınamadı.');
  return data.reading;
 }catch(e){if(controller.signal.aborted)throw new Error('Yorum isteği zaman aşımına uğradı.');throw e;}finally{clearTimeout(timeout);}
}
