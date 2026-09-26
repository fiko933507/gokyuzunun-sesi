// Server-generated narration. The public API never accepts arbitrary speech text.
const Astronomy = require('astronomy-engine');

const SIGNS = ['Koç','Boğa','İkizler','Yengeç','Aslan','Başak','Terazi','Akrep','Yay','Oğlak','Kova','Balık'];
function finiteCoordinate(n, min, max) {
  return typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
}
function placeLabel(label) {
  // Reject non-place punctuation so the caller cannot smuggle a custom speech script.
  const name = typeof label === 'string' ? label.trim() : '';
  return name.length > 0 && name.length <= 40 && /^[\p{L}\s,.'-]+$/u.test(name) ? name : 'Bulunduğun bölge';
}
function forecastCode(code) {
  if (code >= 95) return 'gök gürültülü yağışlı';
  if (code >= 71 && code <= 77 || code >= 85 && code <= 86) return 'karlı';
  if (code >= 51 && code <= 67 || code >= 80 && code <= 82) return 'yağmurlu';
  if (code >= 45 && code <= 48) return 'sisli';
  if (code >= 3) return 'bulutlu';
  if (code >= 1) return 'parçalı bulutlu';
  return 'açık';
}
function round(n) { return Math.round(Number(n)); }
function sunTime(s) { return typeof s === 'string' ? s.split('T')[1]?.slice(0,5) || 'bilinmiyor' : 'bilinmiyor'; }
function signAt(body, date) {
  const lon = body === Astronomy.Body.Moon
    ? Astronomy.EclipticGeoMoon(date).lon
    : Astronomy.Ecliptic(Astronomy.GeoVector(body,date,true)).elon;
  return SIGNS[Math.floor(((lon % 360) + 360) % 360 / 30)];
}
async function narration(profile, input, now = new Date(), fetchImpl = fetch) {
  const day = now.toISOString().slice(0,10);
  if (profile === 'astrology') {
    const sign = input.sign;
    if (!SIGNS.includes(sign)) throw Object.assign(new Error('Invalid zodiac sign'), {status:400});
    const moonSign = signAt(Astronomy.Body.Moon, now);
    const sunSign = signAt(Astronomy.Body.Sun, now);
    const mercurySign = signAt(Astronomy.Body.Mercury, now);
    const venusSign = signAt(Astronomy.Body.Venus, now);
    const marsSign = signAt(Astronomy.Body.Mars, now);
    const illumination = Math.round(Astronomy.Illumination(Astronomy.Body.Moon,now).phase_fraction*100);
    const phase = Astronomy.MoonPhase(now);
    const moonPhase = phase<22.5||phase>=337.5?'yeni Ay':phase<67.5?'büyüyen hilal':phase<112.5?'ilk dördün':phase<157.5?'büyüyen Ay':phase<202.5?'dolunay':phase<247.5?'küçülen Ay':phase<292.5?'son dördün':'küçülen hilal';
    return {
      cacheKey:'v3:astrology:'+day+':'+sign,
      text:'Gökyüzünün Sesi ile hoş geldin. '+sign+' burcu için bugünün gökyüzüne birlikte bakalım. Güneş '+sunSign+', Ay '+moonSign+' bölümünde. Merkür '+mercurySign+', Venüs '+venusSign+' ve Mars '+marsSign+' bölümünde hesaplandı. Ayın evresi '+moonPhase+', aydınlanma oranı yüzde '+illumination+'. Bu gerçek astronomik konumları astrolojide bir düşünme daveti olarak ele alıyoruz. Bugün kendine nelerin önemli olduğunu, hangi konulara dikkat vermek istediğini sorabilirsin. Bu yorum semboliktir; gezegenler kişisel olayları bilimsel olarak öngörmez.',
    };
  }
  if(profile !== 'weather' || !finiteCoordinate(input.latitude,-90,90) || !finiteCoordinate(input.longitude,-180,180)) {
    throw Object.assign(new Error('Invalid location'),{status:400});
  }
  // Bucketing coordinates and UTC time limits redundant synthesis requests.
  const latitude = Math.round(input.latitude*20)/20;
  const longitude = Math.round(input.longitude*20)/20;
  const bucket = Math.floor(now.getUTCHours()/3);
  const cacheKey = 'v3:weather:'+day+':'+bucket+':'+latitude+':'+longitude;
  const params = new URLSearchParams({
    latitude:String(latitude),longitude:String(longitude),
    current:'temperature_2m,apparent_temperature,wind_speed_10m,weather_code',
    daily:'temperature_2m_min,temperature_2m_max,precipitation_probability_max,sunrise,sunset',
    forecast_days:'1',timezone:'auto',
  });
  const response=await fetchImpl('https://api.open-meteo.com/v1/forecast?'+params,{signal:AbortSignal.timeout(12000)});
  if(!response.ok) { console.error(JSON.stringify({event:'weather_upstream_rejected',providerStatus:response.status})); throw Object.assign(new Error('Weather service unavailable'),{status:503}); }
  const w=await response.json();
  if(!w.current || !w.daily?.time?.length) throw Object.assign(new Error('Forecast unavailable'),{status:503});
  const name=placeLabel(input.place);
  const rain=round(w.daily.precipitation_probability_max[0]);
  const min=round(w.daily.temperature_2m_min[0]);
  const max=round(w.daily.temperature_2m_max[0]);
  const temp=round(w.current.temperature_2m);
  const feels=round(w.current.apparent_temperature);
  const wind=round(w.current.wind_speed_10m);
  const advice=rain>=50?'Şemsiyeni yanına almayı unutma.':wind>=45?'Rüzgâr güçlü olabilir, dışarıda dikkatli ol.':min<=5?'Sabah serinliği için kalın giyin.':max>=32?'Sıcak havada bol su iç.':'Günün tadını çıkar.';
  return {
    cacheKey,
    text:'Merhaba, Gökyüzünün Sesi seninle. '+name+' için hava durumuna birlikte bakalım. Şu anda hava '+forecastCode(w.current.weather_code)+'. Sıcaklık '+temp+' derece, hissedilen '+feels+' derece. Bugün en düşük '+min+', en yüksek '+max+' derece bekleniyor. Yağış olasılığı yüzde '+rain+'. Rüzgâr saatte '+wind+' kilometre. Güneş '+sunTime(w.daily.sunrise[0])+' saatinde doğuyor, '+sunTime(w.daily.sunset[0])+' saatinde batıyor. '+advice,
  };
}
module.exports={narration,placeLabel,forecastCode,SIGNS};
