const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validate,generateCardReading}=require('../cardReading');

test('card selections are resolved from server deck and cannot be invented',()=>{
 assert.deepEqual(validate({deck:'tarot',spread:'daily',cards:['t19']}).names,['Güneş']);
 assert.deepEqual(validate({deck:'iskambil',spread:'three',cards:['i0-0','i1-7','i3-12']}).names,['As Kupa','8 Maça','Papaz Sinek']);
 assert.throws(()=>validate({deck:'tarot',spread:'daily',cards:['t99']}),{status:400});
 assert.throws(()=>validate({deck:'tarot',spread:'three',cards:['t1','t1','t2']}),{status:400});
 assert.throws(()=>validate({deck:'katina',spread:'daily',cards:['k0'],question:'x'.repeat(181)}),{status:400});
});
test('AI request uses fixed instructions and sends no conversation history',async()=>{
 let request;
 const result=await generateCardReading({deck:'katina',spread:'daily',cards:['k0'],question:'İlişkim üzerine düşünmek istiyorum'}, {key:'test',fetchImpl:async(url,options)=>{
  assert.equal(url,'https://api.openai.com/v1/responses');request=JSON.parse(options.body);
  return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:'Kalp kartı, duyguların üzerine düşünmek için bir davet olabilir.'}]}]})};
 }});
 assert.match(result,/Kalp/);
 assert.equal(request.store,false);
 assert.ok(!JSON.stringify(request).includes('api_key'));
 assert.ok(request.instructions.includes('eğlence'));
 assert.equal(JSON.parse(request.input).kartlar[0],'Kalp');
 await assert.rejects(generateCardReading({deck:'tarot',spread:'daily',cards:['t0']},{key:''}),{status:503});
});
