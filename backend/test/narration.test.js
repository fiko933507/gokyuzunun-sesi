const {test}=require('node:test');
const assert=require('node:assert/strict');
const {narration,placeLabel}=require('../narration');

test('rejects arbitrary client text and invalid coordinates',async()=>{
 await assert.rejects(narration('weather',{text:'Read whatever I type',latitude:'41',longitude:29}),{status:400});
 await assert.rejects(narration('astrology',{sign:'read my injected speech'}),{status:400});
 assert.equal(placeLabel('hello; script <x>'),'Bulunduğun bölge');
});
test('astrology uses actual ephemeris instead of the old one-line placeholder',async()=>{
 const output=await narration('astrology',{sign:'Koç'},new Date('2026-09-26T12:00:00Z'));
 assert.match(output.text,/Ay/);
 assert.match(output.text,/Güneş/);
 assert.match(output.text,/bilimsel olarak öngörmez/);
 assert.match(output.cacheKey,/Koç/);
});
test('weather narration uses fetched values and only a constrained label',async()=>{
 let calls=0;
 const output=await narration('weather',{latitude:41.02,longitude:29.01,place:'İstanbul'},
 new Date('2026-09-26T12:00:00Z'),async()=>{calls++;return {
 ok:true,json:async()=>({
 current:{temperature_2m:22,apparent_temperature:24,weather_code:3,wind_speed_10m:12},
 daily:{time:['2026-09-26'],temperature_2m_min:[14],temperature_2m_max:[25],precipitation_probability_max:[62],sunrise:['2026-09-26T07:01'],sunset:['2026-09-26T18:58']},
 })};});
 assert.equal(calls,1);
 assert.match(output.text,/İstanbul/);
 assert.match(output.text,/yüzde 62/);
 assert.match(output.text,/Şemsiyeni/);
});
test('uses bounded on-device forecast when upstream rate limits the server',async()=>{
 const input={latitude:36.9,longitude:30.7,place:'Antalya',weatherSnapshot:{temp:22,feels:23,wind:12,code:61,min:18,max:25,rain:70,sunrise:'2026-09-27T06:50',sunset:'2026-09-27T18:52'}};
 const output=await narration('weather',input,new Date('2026-09-27T07:00:00Z'),async()=>({ok:false,status:429}));
 assert.match(output.text,/Antalya/);
 assert.match(output.text,/yüzde 70/);
 assert.match(output.text,/Şemsiyeni/);
 await assert.rejects(narration('weather',{...input,weatherSnapshot:{...input.weatherSnapshot,temp:'injected'}},new Date(),async()=>({ok:false,status:429})),{status:503});
});
