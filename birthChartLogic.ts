import * as Astronomy from 'astronomy-engine';
import {SIGNS,skyAt} from './astronomy';
export type BirthCity={name:string;country?:string;latitude:number;longitude:number;timezone:string};
function formatParts(instant:number,timezone:string){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant));
 const obj=Object.fromEntries(parts.map(p=>[p.type,p.value]));
 return `${obj.year}-${obj.month}-${obj.day}T${obj.hour}:${obj.minute}`;
}
export function birthInstant(day:string,clock:string,timezone:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock))throw new Error('Tarihi YYYY-AA-GG, saati SS:DD olarak gir.');
 const local=Date.parse(day+'T'+clock+':00Z');
 if(!Number.isFinite(local)||new Date(local).toISOString().slice(0,10)!==day||local<Date.parse('1900-01-01T00:00:00Z')||local>Date.now())throw new Error('Ge├ğerli bir ge├ğmi┼ş tarih gir.');
 try{new Intl.DateTimeFormat('en-GB',{timeZone:timezone});}catch{throw new Error('┼Şehrin saat dilimi bulunamad─▒.');}
 let guess=local;
 for(let i=0;i<5;i++){
  const displayed=Date.parse(formatParts(guess,timezone)+':00Z');
  guess+=local-displayed;
 }
 if(formatParts(guess,timezone)!==day+'T'+clock)throw new Error('Bu saat, se├ğilen yerde saat de─şi┼şimi nedeniyle mevcut de─şil. Ba┼şka bir saat gir.');
 return guess;
}
/** Apparent ecliptic/equator horizon intersection on the eastern side. */
export function ascendantAt(instant:number,latitude:number,longitude:number){
 if(!Number.isFinite(latitude)||Math.abs(latitude)>=66||!Number.isFinite(longitude)||Math.abs(longitude)>180)return null;
 const rad=Math.PI/180,phi=latitude*rad,theta=((Astronomy.SiderealTime(new Date(instant))*15+longitude)%360)*rad;
 const epsilon=Astronomy.e_tilt(Astronomy.MakeTime(new Date(instant))).tobl*rad;
 const altitude=(degree:number)=>Math.cos(phi)*Math.cos(theta)*Math.cos(degree*rad)+(Math.sin(phi)*Math.sin(epsilon)+Math.cos(phi)*Math.cos(epsilon)*Math.sin(theta))*Math.sin(degree*rad);
 for(let degree=0;degree<360;degree++){
  const a=altitude(degree),b=altitude(degree+1);
  if(a*b>0)continue;
  let low=degree,high=degree+1;
  for(let i=0;i<15;i++){const mid=(low+high)/2;if(altitude(low)*altitude(mid)<=0)high=mid;else low=mid;}
  const lon=((low+high)/2)%360;
  const east=-Math.sin(theta)*Math.cos(lon*rad)+Math.cos(theta)*Math.sin(lon*rad)*Math.cos(epsilon);
  if(east>0)return {longitude:lon,sign:SIGNS[Math.floor(lon/30)],degree:Number((lon%30).toFixed(1))};
 }
 return null;
}
export function computeBirthChart(day:string,clock:string,city:BirthCity){
 const instant=birthInstant(day,clock,city.timezone);
 const sky=skyAt(new Date(instant));
 const asc=ascendantAt(instant,city.latitude,city.longitude);
 const houses=asc?Array.from({length:12},(_,i)=>({number:i+1,sign:SIGNS[Math.floor(((asc.longitude+i*30)%360)/30)]})):[];
 return {instant,sky,asc,houses};
}
