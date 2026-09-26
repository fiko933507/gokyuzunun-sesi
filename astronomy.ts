import * as Astronomy from 'astronomy-engine';

export const SIGNS = ['Koç','Boğa','İkizler','Yengeç','Aslan','Başak','Terazi','Akrep','Yay','Oğlak','Kova','Balık'] as const;
const PLANETS = [
 ['Güneş',Astronomy.Body.Sun,'☀️'],['Ay',Astronomy.Body.Moon,'🌙'],
 ['Merkür',Astronomy.Body.Mercury,'☿'],['Venüs',Astronomy.Body.Venus,'♀'],
 ['Mars',Astronomy.Body.Mars,'♂'],['Jüpiter',Astronomy.Body.Jupiter,'♃'],
 ['Satürn',Astronomy.Body.Saturn,'♄'],['Uranüs',Astronomy.Body.Uranus,'♅'],
 ['Neptün',Astronomy.Body.Neptune,'♆']
] as const;
export type PlanetPosition={name:string;icon:string;longitude:number;sign:string;degree:number};
export function skyAt(date:Date){
 const bodies:PlanetPosition[]=PLANETS.map(([name,body,icon])=>{
  const longitude=((body===Astronomy.Body.Moon?Astronomy.EclipticGeoMoon(date).lon:Astronomy.Ecliptic(Astronomy.GeoVector(body,date,true)).elon)%360+360)%360;
  return {name,icon,longitude,sign:SIGNS[Math.floor(longitude/30)],degree:Math.round((longitude%30)*10)/10};
 });
 const phase=Astronomy.MoonPhase(date);
 const illuminated=Math.round(Astronomy.Illumination(Astronomy.Body.Moon,date).phase_fraction*100);
 const phaseName=phase<22.5||phase>=337.5?'Yeni Ay':phase<67.5?'Büyüyen Hilal':phase<112.5?'İlk Dördün':phase<157.5?'Büyüyen Şişkin Ay':phase<202.5?'Dolunay':phase<247.5?'Küçülen Şişkin Ay':phase<292.5?'Son Dördün':'Küçülen Hilal';
 return {bodies,phaseName,illuminated,date:date.toISOString()};
}
export function symbolicReading(sign:string,sky:ReturnType<typeof skyAt>){
 const sun=sky.bodies[0],moon=sky.bodies[1],mercury=sky.bodies[2],venus=sky.bodies[3],mars=sky.bodies[4];
 const matches=sky.bodies.filter(b=>b.sign===sign).map(b=>b.name);
 const opening=matches.length?sign+' burcunun tropikal zodyak bölümünde şu cisimler hesaplandı: '+matches.join(', ')+'.':'Bugün seçilen burcun tropikal zodyak bölümünde listelenen bir gezegen bulunmuyor.';
 return opening+' Ay '+moon.sign+', Güneş '+sun.sign+', Merkür '+mercury.sign+', Venüs '+venus.sign+' ve Mars '+mars.sign+' konumunda. '+sky.phaseName+' döneminde '+(sky.illuminated)+'% aydınlık hesaplandı. Bu sembolik yorum, günlük planlarını ve ilişkilerini düşünmen için bir hatırlatmadır; gezegen konumları kişisel olayları öngörmez.';
}
