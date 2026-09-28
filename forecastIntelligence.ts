export type WeatherForecast={hourly:{time:string[];precipitation_probability:number[];temperature_2m:number[]};utc_offset_seconds?:number};
export type ForecastSnapshot={lat:number;lon:number;capturedAt:number;hours:Array<{instant:number;rain:number;temp:number}>};
export function snapshotForecast(forecast:WeatherForecast,lat:number,lon:number,now:number):ForecastSnapshot{
 const hours=forecast.hourly.time.map((time,i)=>({instant:Date.parse(time+'Z')-(forecast.utc_offset_seconds??0)*1000,rain:forecast.hourly.precipitation_probability[i],temp:forecast.hourly.temperature_2m[i]}))
  .filter(hour=>[hour.instant,hour.rain,hour.temp].every(Number.isFinite)&&hour.instant>now&&hour.instant<now+24*3600_000);
 return {lat,lon,capturedAt:now,hours};
}
export function forecastChanges(before:ForecastSnapshot|null,after:ForecastSnapshot):string[]{
 if(!before||!Array.isArray(before.hours)||!Number.isFinite(before.capturedAt)||!Number.isFinite(before.lat)||!Number.isFinite(before.lon)||after.capturedAt-before.capturedAt>48*3600_000||Math.abs(after.lat-before.lat)>.01||Math.abs(after.lon-before.lon)>.01)return [];
 const previous=new Map(before.hours.map(hour=>[hour.instant,hour]));
 const changes:string[]=[];
 for(const hour of after.hours){
  const old=previous.get(hour.instant);if(!old)continue;
  if(old.rain<40&&hour.rain>=65&&hour.rain-old.rain>=30){changes.push('☂ '+new Date(hour.instant).toLocaleString('tr-TR',{hour:'2-digit',minute:'2-digit'})+' civarında yağış olasılığı %'+Math.round(old.rain)+' → %'+Math.round(hour.rain)+'.');break;}
 }
 for(const hour of after.hours){
  const old=previous.get(hour.instant);if(!old)continue;
  if(Math.abs(hour.temp-old.temp)>=5){changes.push('🌡 '+new Date(hour.instant).toLocaleString('tr-TR',{hour:'2-digit',minute:'2-digit'})+' sıcaklık tahmini '+Math.round(old.temp)+'° → '+Math.round(hour.temp)+'°.');break;}
 }
 return changes;
}
export type EnsembleSpread={time:string[];temperature:number[];precipitation:number[];model:string};
export async function fetchEnsembleSpread(lat:number,lon:number):Promise<EnsembleSpread>{
 const params=new URLSearchParams({latitude:String(lat),longitude:String(lon),hourly:'temperature_2m_spread,precipitation_spread',forecast_hours:'24',timezone:'GMT',models:'dwd_icon_eps_ensemble_mean_seamless'});
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),14000);
 let response:Response;
 try{response=await fetch('https://ensemble-api.open-meteo.com/v1/ensemble?'+params,{signal:controller.signal});}
 finally{clearTimeout(timer);}
 if(!response.ok)throw new Error('Model yayılımı servisi yanıt vermedi ('+response.status+').');
 const data=await response.json() as {hourly?:Record<string,unknown>;model?:string};
 const hourly=data.hourly;
 const column=(name:string)=>hourly?.[name]??Object.entries(hourly||{}).find(([key])=>key.startsWith(name+'_'))?.[1];
 const temperature=column('temperature_2m_spread'),precipitation=column('precipitation_spread');
 if(!Array.isArray(hourly?.time)||!Array.isArray(temperature)||!Array.isArray(precipitation))throw new Error('Bu bölge için model yayılımı verisi sağlanmıyor.');
 return {time:hourly.time as string[],temperature:temperature as number[],precipitation:precipitation as number[],model:data.model||'Open-Meteo ensemble'};
}
