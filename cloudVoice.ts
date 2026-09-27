// Binary MP3 client; the ElevenLabs API key and voice IDs are server-only.
import { File, Paths } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import type { VoiceProfile } from './voiceConfig';

const API = 'https://gokyuzunun-sesi.onrender.com';
export async function getVoiceProfileStatus():Promise<Record<VoiceProfile,string>> {
 const response=await fetch(API+'/api/voice-profiles');
 if(!response.ok)throw new Error('Ses profilleri alınamadı.');
 const data=await response.json() as {profiles:Array<{id:VoiceProfile;genderStatus:string}>};
 return Object.fromEntries(data.profiles.map(p=>[p.id,p.genderStatus])) as Record<VoiceProfile,string>;
}

export type WeatherSnapshot = {temp:number;feels:number;wind:number;code:number;min:number;max:number;rain:number;sunrise:string;sunset:string};
type VoiceOptions={duration?:'brief'|'full';pace?:'calm'|'normal'};
export type VoiceRequest = ({ profile:'weather';latitude:number;longitude:number;place:string;weatherSnapshot:WeatherSnapshot } |
 { profile:'astrology'; sign:string }) & VoiceOptions;
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
export type ObservationAudioRequest={place:string;latitude:number;longitude:number;instant:number;offsetSeconds:number;score:number;cloud:number;rain:number;targets:{name:string;azimuth:number;altitude:number}[]};
export async function getObservationAudio(input:ObservationAudioRequest):Promise<string>{
 const response=await expoFetch(API+'/api/observation-audio',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 if(!response.ok)throw new Error(response.status===409?'Astroloji için kayıtlı ses kadın sesi olarak doğrulanamadı.':response.status===429?'Ses sınırına ulaşıldı.':'Gözlem seslendirmesi şu anda kullanılamıyor (HTTP '+response.status+').');
 if(!(response.headers.get('content-type')||'').includes('audio/mpeg'))throw new Error('Beklenmeyen ses yanıtı.');
 const bytes=await response.bytes();if(bytes.length<128||bytes.length>5_000_000)throw new Error('Ses boyutu geçersiz.');
 const file=new File(Paths.cache,'gokyuzu-gozlem-'+Date.now()+'.mp3');file.create();await file.write(bytes);return file.uri;
}
