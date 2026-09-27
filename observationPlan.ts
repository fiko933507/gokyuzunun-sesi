import * as Astronomy from 'astronomy-engine';
import {skyViewingWindows,type ViewingForecast} from './skyDiscovery';

const OBJECTS=[['Ay',Astronomy.Body.Moon,'☾'],['Venüs',Astronomy.Body.Venus,'♀'],['Mars',Astronomy.Body.Mars,'♂'],['Jüpiter',Astronomy.Body.Jupiter,'♃'],['Satürn',Astronomy.Body.Saturn,'♄']] as const;
export const bearing=(angle:number)=>angle<22.5||angle>=337.5?'Kuzey':angle<67.5?'Kuzeydoğu':angle<112.5?'Doğu':angle<157.5?'Güneydoğu':angle<202.5?'Güney':angle<247.5?'Güneybatı':angle<292.5?'Batı':'Kuzeybatı';
export type AirForecast={hourly?:{time:string[];european_aqi:(number|null)[];pm2_5:(number|null)[];aerosol_optical_depth:(number|null)[]}};
export function observationPlan(hourly:ViewingForecast,offsetSeconds:number,latitude:number,longitude:number,now:number,sunset?:string,sunrise?:string,air?:AirForecast){
 const available=skyViewingWindows(hourly,offsetSeconds,now,sunset,sunrise);
 const ranked=available.map(window=>{
  const index=air?.hourly?.time?.indexOf(window.time)??-1;
  const optical=index>=0?air?.hourly?.aerosol_optical_depth?.[index]:null;
  return {...window,instant:Date.parse(window.time+'Z')-offsetSeconds*1000,airIndex:index,
   optical:typeof optical==='number'&&Number.isFinite(optical)?optical:null,
   score:Math.max(0,window.score-(typeof optical==='number'&&Number.isFinite(optical)?Math.min(15,Math.round(optical*20)):0))};
 }).sort((a,b)=>b.score-a.score||a.instant-b.instant);
 const best=ranked[0];if(!best)return null;
 const observer=new Astronomy.Observer(latitude,longitude,0),date=new Date(best.instant);
 const targets=OBJECTS.map(([name,body,icon])=>{
  const eq=Astronomy.Equator(body,date,observer,true,true);
  const h=Astronomy.Horizon(date,observer,eq.ra,eq.dec,'normal');
  return {name,icon,azimuth:Math.round(h.azimuth),altitude:Math.round(h.altitude),direction:bearing(h.azimuth)};
 }).filter(x=>x.altitude>=10).sort((a,b)=>b.altitude-a.altitude);
 const aqi=best.airIndex>=0?air?.hourly?.european_aqi?.[best.airIndex]:null;
 const pm25=best.airIndex>=0?air?.hourly?.pm2_5?.[best.airIndex]:null;
 return {...best,targets,aqi:typeof aqi==='number'?aqi:null,pm25:typeof pm25==='number'?pm25:null,
  moonlight:Math.round(Astronomy.Illumination(Astronomy.Body.Moon,date).phase_fraction*100)};
}

export type SkyEvent={id:string;instant:number;title:string;detail:string;source:string};
const METEORS=[
 ['2026-10-21','Orionidler','21–22 Ekim gecesi beklenen meteor yağmuru zirvesi.','American Meteor Society'],
 ['2026-11-04','Güney Tauridler','4–5 Kasım gecesi beklenen zirve.','American Meteor Society'],
 ['2026-11-11','Kuzey Tauridler','11–12 Kasım gecesi beklenen zirve.','American Meteor Society'],
 ['2026-11-16','Leonidler','16–17 Kasım gecesi beklenen zirve.','American Meteor Society'],
 ['2026-12-13','Geminidler','13–14 Aralık gecesi beklenen zirve.','American Meteor Society'],
 ['2026-12-21','Ursidler','21–22 Aralık gecesi beklenen zirve.','American Meteor Society'],
 ['2027-01-03','Quadrantidler','3–4 Ocak gecesi beklenen zirve.','American Meteor Society'],
] as const;
export function skyEvents(now:number):SkyEvent[]{
 const events:SkyEvent[]=METEORS.map(([day,title,detail,source])=>({id:day+title,instant:Date.parse(day+'T20:00:00Z'),title,detail,source}));
 for(const [angle,title] of [[0,'Yeni Ay'],[180,'Dolunay']] as const){
  let cursor=new Date(now-24*3600000);
  for(let i=0;i<4;i++){
   const phase=Astronomy.SearchMoonPhase(angle,cursor,130);
   if(!phase)break;
   const instant=phase.date.getTime();
   events.push({id:title+instant,instant,title,detail:'Astronomik Ay evresi · yerel saatle gösterilir.',source:'Astronomy Engine'});
   cursor=new Date(instant+24*3600000);
  }
 }
 return events.filter(e=>e.instant>=now-12*3600000&&e.instant<now+125*24*3600000).sort((a,b)=>a.instant-b.instant);
}
