export type Activity='walk'|'photo'|'stars';
export const ACTIVITIES:Record<Activity,{title:string;icon:string;description:string}>={
 walk:{title:'Yürüyüş',icon:'🚶',description:'Yağış, sıcaklık ve rüzgâr'},
 photo:{title:'Gökyüzü fotoğrafı',icon:'📷',description:'Gün ışığı, bulutlar ve yağış'},
 stars:{title:'Yıldız gözlemi',icon:'✦',description:'Karanlık, bulut ve görüş mesafesi'}
};
type Input={time:string[];precipitation_probability:number[];temperature_2m:number[];cloud_cover:number[];visibility:number[];wind_speed_10m:number[];weather_code:number[]};
type Sun={time:string[];sunrise:string[];sunset:string[]};
export type ActivityWindow={instant:number;score:number;rain:number;temp:number;cloud:number;wind:number;visibility:number;reason:string};
const clamp=(x:number)=>Math.max(0,Math.min(100,Math.round(x)));
export function bestActivityWindows(hourly:Input,daily:Sun,offsetSeconds:number,now:number,activity:Activity):ActivityWindow[]{
 if(!ACTIVITIES[activity]||!Array.isArray(hourly.time)||!Array.isArray(daily.time)||!Number.isFinite(offsetSeconds))return [];
 const windows:ActivityWindow[]=[];
 for(let i=0;i<hourly.time.length;i++){
  const local=hourly.time[i];if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(local))continue;
  const instant=Date.parse(local+'Z')-offsetSeconds*1000;
  if(!Number.isFinite(instant)||instant<now+15*60_000||instant>now+36*3600_000)continue;
  const day=daily.time.indexOf(local.slice(0,10));if(day<0)continue;
  const start=Date.parse(daily.sunrise[day]+'Z')-offsetSeconds*1000,end=Date.parse(daily.sunset[day]+'Z')-offsetSeconds*1000;
  if(!Number.isFinite(start)||!Number.isFinite(end))continue;
  const rain=hourly.precipitation_probability[i],temp=hourly.temperature_2m[i],cloud=hourly.cloud_cover[i],wind=hourly.wind_speed_10m[i],visibility=hourly.visibility[i],code=hourly.weather_code[i];
  if(![rain,temp,cloud,wind,visibility,code].every(x=>typeof x==='number'&&Number.isFinite(x))||rain<0||rain>100||cloud<0||cloud>100||visibility<0)continue;
  if(code>=95||rain>=75||wind>=55||temp< -10||temp>40)continue;
  const daylight=instant>=start&&instant<end;
  if(activity==='stars' ? daylight : !daylight)continue;
  let score:number,reason:string;
  if(activity==='walk'){
   score=clamp(100-rain*.65-Math.abs(temp-21)*2-Math.max(0,wind-15)*.65);
   reason=rain>=40?'Yağış ihtimali yüksek; dışarı çıkmadan önce tahmini yenile.':temp<8?'Hava serin; katmanlı giyin.':temp>30?'Hava sıcak; su ve gölge planla.':'Yağış ve sıcaklık yürüyüş için daha elverişli.';
  }else if(activity==='photo'){
   const golden=Math.min(Math.abs(instant-start),Math.abs(instant-end));
   score=clamp(95-rain*.55-Math.abs(cloud-35)*.26-Math.max(0,wind-20)*.4+(golden<=90*60_000?9:0));
   reason=golden<=90*60_000?'Gün doğumu veya batımına yakın ışık.':cloud>70?'Bulutlar gökyüzünü kapatabilir.':'Gün ışığı ve bulutlar fotoğraf için dengeli.';
  }else{
   score=clamp(100-rain*.32-cloud*.55-Math.max(0,12000-visibility)/450-Math.max(0,wind-20)*.25);
   reason=cloud>55?'Bulutluluk gökyüzünü kapatabilir.':visibility<6000?'Görüş mesafesi düşük.':'Daha açık ve karanlık bir gözlem saati.';
  }
  if(score>=25)windows.push({instant,score,rain,temp,cloud,wind,visibility,reason});
 }
 windows.sort((a,b)=>b.score-a.score||a.instant-b.instant);
 const chosen:ActivityWindow[]=[];
 for(const item of windows){if(chosen.every(other=>Math.abs(other.instant-item.instant)>=2*3600_000))chosen.push(item);if(chosen.length===3)break;}
 return chosen;
}
export function activityLocalTime(instant:number,offsetSeconds:number){return new Date(instant+offsetSeconds*1000).toLocaleString('tr-TR',{timeZone:'UTC',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});}
