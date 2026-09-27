const {placeLabel}=require('./narration');
const ALLOWED=new Set(['Ay','Venüs','Mars','Jüpiter','Satürn']);
function observationNarration(input,now=new Date()){
 const {place,latitude,longitude,instant,offsetSeconds,score,cloud,rain,targets}=input||{};
 if(typeof latitude!=='number'||latitude< -90||latitude>90||typeof longitude!=='number'||longitude< -180||longitude>180||
    typeof instant!=='number'||instant<now.getTime()-3600000||instant>now.getTime()+37*3600000||!Number.isInteger(offsetSeconds)||offsetSeconds< -43200||offsetSeconds>50400||
    !Number.isInteger(score)||score<0||score>100||!Number.isInteger(cloud)||cloud<0||cloud>100||
    !Number.isInteger(rain)||rain<0||rain>100||!Array.isArray(targets)||targets.length>5||
    targets.some(t=>!t||!ALLOWED.has(t.name)||!Number.isInteger(t.azimuth)||t.azimuth<0||t.azimuth>359||!Number.isInteger(t.altitude)||t.altitude<10||t.altitude>90))
  throw Object.assign(new Error('Invalid observation plan'),{status:400});
 const hour=new Date(instant+offsetSeconds*1000).toISOString().slice(11,16);
 const objects=targets.slice(0,3).map(t=>t.name+' için pusulanda yaklaşık '+t.azimuth+' derece yönüne bak. Ufkun '+t.altitude+' derece üzerinde hesaplandı.').join(' ');
 return {cacheKey:'v1:observe:'+Math.round(latitude*20)/20+':'+Math.round(longitude*20)/20+':'+Math.floor(instant/3600000)+':'+score+':'+cloud+':'+rain+':'+targets.map(t=>t.name+t.azimuth).join(','),
  text:'Gökyüzünün Sesi ile '+placeLabel(place)+' için kısa gece rehberine hoş geldin. Saat '+hour+' civarında gökyüzü gözlem puanı yüzde '+score+'. Bulutluluk yüzde '+cloud+', yağış olasılığı yüzde '+rain+'. '+(objects||'Bu saatte listelenen parlak gök cisimleri ufkun yeterince üzerinde görünmüyor.')+' Telefonunun pusulası ve gökyüzünün görünürlüğü değişebilir. Güvenli, açık bir yer seç; gözlerin karanlığa alışsın.'};
}
module.exports={observationNarration};
