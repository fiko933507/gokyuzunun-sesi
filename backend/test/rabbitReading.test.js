const {test}=require('node:test');
const assert=require('node:assert/strict');
const {FORTUNES,validate,read}=require('../rabbitReading');

test('rabbit note is chosen by validated index and user question is supplied to AI',async()=>{
 let input;
 const text=await read({index:7,character:'Bilge Tavşan',question:'Yeni işe başlamalı mıyım?'},{key:'test',fetchImpl:async(_url,options)=>{
  input=JSON.parse(options.body).input;
  return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:'Yeni bir iş düşünürken seçeneklerini ve ihtiyaçlarını tart. Bir arkadaşınla artıları ve eksileri gözden geçirebilir misin?'}]}]})};
 }});
 assert.match(input,/Yeni işe başlamalı mıyım/);
 assert.match(input,/Işık/);
 assert.match(text,/seçeneklerini/);
 assert.equal(FORTUNES[7][0],'Işık');
});
test('arbitrary narration and invalid notes are rejected',()=>{
 assert.throws(()=>validate({index:8,character:'Bilge Tavşan',question:'Bir şey soruyorum'}));
 assert.throws(()=>validate({index:0,character:'Başka',question:'Bir şey soruyorum'}));
});
