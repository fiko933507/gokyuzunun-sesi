import type {DeckId,Card} from './cardDecks';
const API='https://gokyuzunun-sesi.onrender.com';
export async function getCardReading(deck:DeckId,spread:'daily'|'three',cards:Card[],question:string):Promise<string>{
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),35000);
 try{
  const response=await fetch(API+'/api/card-reading',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({deck,spread,cards:cards.map(c=>c.id),question:question.trim().slice(0,180)}),signal:controller.signal});
  if(!response.ok){
   const detail=await response.json().catch(()=>({})) as {code?:string};
   if(detail.code==='not_configured')throw new Error('Sunucuda yapay zekâ anahtarı tanımlı değil.');
   if(detail.code==='provider_auth')throw new Error('Yapay zekâ sağlayıcısı anahtarı kabul etmedi; Render anahtarını kontrol et.');
   if(detail.code==='provider_quota')throw new Error('Yapay zekâ sağlayıcısının API bakiyesi tükendi. Yeni bakiye eklenene kadar yapay zekâ yorumları kullanılamıyor.');
   if(detail.code==='daily_limit')throw new Error('Günlük yorum sınırına ulaşıldı. Yarın tekrar dene.');
   if(response.status===429)throw new Error('Çok fazla istek gönderildi. Biraz sonra tekrar dene.');
   throw new Error('Yapay zekâ sunucusu yanıt vermedi ('+response.status+'). Biraz sonra tekrar dene.');
  }
  const data=await response.json() as {reading?:string};
  if(!data.reading||typeof data.reading!=='string')throw new Error('Yorum alınamadı.');
  return data.reading;
 }catch(e){if(controller.signal.aborted)throw new Error('Yorum isteği zaman aşımına uğradı.');if(e instanceof TypeError)throw new Error('Sunucuya bağlanılamadı. İnternet bağlantını ve Render servisini kontrol et.');throw e;}finally{clearTimeout(timeout);}
}
