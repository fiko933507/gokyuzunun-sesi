// Binary MP3 client; the ElevenLabs API key and voice IDs are server-only.
import { File, Paths } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import type { VoiceProfile } from './voiceConfig';

const API = 'https://gokyuzunun-sesi.onrender.com';
export type VoiceRequest = { profile:'weather';latitude:number;longitude:number;place:string } |
 { profile:'astrology'; sign:string };
function filename(input:VoiceRequest):string {
 const date=new Date().toISOString().slice(0,10);
 if(input.profile==='astrology'){
  const sign=encodeURIComponent(input.sign).replace(/%/g,'_');
  return 'gokyuzu-v3-astro-'+date+'-'+sign+'.mp3';
 }
 const latitude=Math.round(input.latitude*20)/20;
 const longitude=Math.round(input.longitude*20)/20;
 const bucket=Math.floor(new Date().getUTCHours()/3);
 return 'gokyuzu-v3-weather-'+date+'-'+bucket+'-'+String(latitude).replace(/-/g,'m')+'-'+String(longitude).replace(/-/g,'m')+'.mp3';
}
export async function getVoiceAudio(input:VoiceRequest):Promise<string>{
 // Do not reuse a device MP3 after the voice profile changes on the server.
 // Previously cached male recordings must never bypass server-side validation.
 const file=new File(Paths.cache,filename(input).replace('.mp3','-'+Date.now()+'.mp3'));
 const response=await expoFetch(API+'/api/narration',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify(input),
 });
 if(!response.ok){
  if(response.status===409)throw new Error('Seçili sunucu sesi kadın sesi olarak doğrulanamadı. Render ayarlarında kayıtlı kadın ses kimliğini güncelle.');
  if(response.status===402)throw new Error('ElevenLabs planı veya kredisi bu sesi kullanmaya izin vermiyor.');
  if(response.status===429)throw new Error('Günlük ses üretim sınırına ulaşıldı. Daha sonra dene.');
  if(response.status===503)throw new Error('Ses veya hava durumu servisi şu anda kullanılamıyor.');
  throw new Error('Bulut seslendirmesi alınamadı (HTTP '+response.status+').');
 }
 if(!(response.headers.get('content-type')||'').includes('audio/mpeg'))throw new Error('Ses dosyası yerine beklenmeyen yanıt alındı.');
 const bytes=await response.bytes();
 if(bytes.length<128 || bytes.length>5_000_000)throw new Error('Ses dosyasının boyutu geçersiz.');
 if(!file.exists)file.create();
 await file.write(bytes);
 return file.uri;
}
