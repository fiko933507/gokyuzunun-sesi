import {skyAt} from './astronomy';

export type RainWindow={start:number;end:number;peak:number};
export function rainWindows(time:string[],probability:number[],offsetSeconds:number,now:number,threshold=50):RainWindow[]{
 if(!Array.isArray(time)||!Array.isArray(probability)||!Number.isFinite(offsetSeconds))return [];
 const result:RainWindow[]=[];
 let current:RainWindow|null=null;
 for(let i=0;i<time.length;i++){
  const at=Date.parse(time[i]+'Z')-offsetSeconds*1000;
  if(!Number.isFinite(at)||at<now-3600_000||at>now+36*3600_000)continue;
  const chance=probability[i];
  if(typeof chance!=='number'||!Number.isFinite(chance)||chance<0||chance>100){if(current){result.push(current);current=null;}continue;}
  if(chance>=threshold){
   if(current&&at<=current.end){current.end=at+3600_000;current.peak=Math.max(current.peak,chance);}
   else{if(current)result.push(current);current={start:at,end:at+3600_000,peak:chance};}
  }else if(current){result.push(current);current=null;}
 }
 if(current)result.push(current);
 return result.slice(0,3);
}
export type SignTransition={name:string;icon:string;from:string;to:string;instant:number};
/** Computed tropical geocentric zodiac boundaries; no claim of personal effects. */
export function upcomingSignTransitions(now:number,days=14):SignTransition[]{
 const selected=['Güneş','Ay','Merkür','Venüs','Mars','Jüpiter','Satürn'];
 const result:SignTransition[]=[];
 const interval=6*3600_000;
 let previous=skyAt(new Date(now)).bodies;
 for(let instant=now+interval;instant<=now+days*24*3600_000;instant+=interval){
  const next=skyAt(new Date(instant)).bodies;
  for(const name of selected){
   const before=previous.find(body=>body.name===name),after=next.find(body=>body.name===name);
   if(!before||!after||before.sign===after.sign)continue;
   let low=instant-interval,high=instant;
   for(let step=0;step<8;step++){
    const middle=(low+high)/2;
    const sign=skyAt(new Date(middle)).bodies.find(body=>body.name===name)?.sign;
    if(sign===before.sign)low=middle;else high=middle;
   }
   result.push({name,icon:after.icon,from:before.sign,to:after.sign,instant:Math.round(high/60_000)*60_000});
  }
  previous=next;
 }
 return result.sort((a,b)=>a.instant-b.instant).slice(0,8);
}
export function localForecastTime(instant:number,offsetSeconds:number){return new Date(instant+offsetSeconds*1000).toLocaleString('tr-TR',{timeZone:'UTC',weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}
