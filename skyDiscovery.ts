import {skyAt} from './astronomy';

export type ViewingForecast={time:string[];cloud_cover:number[];visibility:number[];precipitation_probability:number[]};
export function skyViewingWindows(hourly:ViewingForecast,offsetSeconds:number,nowMs:number,sunset?:string,sunrise?:string){
 const sunsetHour=Number(sunset?.slice(11,13)??19);
 const sunriseHour=Number(sunrise?.slice(11,13)??6);
 const windows=hourly.time.map((time,i)=>{
  const instant=Date.parse(time+'Z')-offsetSeconds*1000;
  const cloud=hourly.cloud_cover[i],visibility=hourly.visibility[i],rain=hourly.precipitation_probability[i];
  const hour=Number(time.slice(11,13));
  const dark=hour>=sunsetHour||hour<sunriseHour;
  if(!Number.isFinite(instant)||instant<nowMs||instant>nowMs+36*3600000||!dark||
     typeof cloud!=='number'||typeof rain!=='number'||typeof visibility!=='number')return null;
  const score=Math.max(0,Math.min(100,Math.round(100-cloud*.6-rain*.25-Math.max(0,12000-visibility)/500)));
  return {time,score,cloud,visibility,rain};
 }).filter((item):item is {time:string;score:number;cloud:number;visibility:number;rain:number}=>item!==null);
 return windows.sort((a,b)=>b.score-a.score||a.time.localeCompare(b.time)).slice(0,3);
}
export function moonCalendar(start:Date,days=21){
 return Array.from({length:days},(_,i)=>{
  const date=new Date(start.getTime());date.setHours(12,0,0,0);date.setDate(date.getDate()+i);
  const phase=skyAt(date);
  return {key:date.toISOString().slice(0,10),date:date.toLocaleDateString('tr-TR',{day:'numeric',month:'short'}),name:phase.phaseName,lit:phase.illuminated};
 });
}
