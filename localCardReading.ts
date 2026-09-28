import type {Card} from './cardDecks';

const positions = [
 {title:'Geçmiş',intro:'Geçmiş konumundaki bu kart, bugün taşıdığın bir deneyimi düşünmeye çağırıyor.',prompt:'Bu deneyimden öğrendiğin hangi şey hâlâ işine yarıyor?'},
 {title:'Bugün',intro:'Bugünkü konum, şu anda değiştirebileceğin küçük bir tercihe ışık tutuyor.',prompt:'Bugün hangi somut ve nazik adımı atabilirsin?'},
 {title:'Olasılık',intro:'Olasılık konumu kesin bir gelecek haberi değil; deneyebileceğin bir yönü simgeliyor.',prompt:'Bu yönü denemek için önce neyi netleştirmen gerekir?'}
];
function detail(card:Card){
 const id=card.id;
 if(id.startsWith('i')){
  const suit=Number(id[1]);
  return [
   'Kupa, yakınlık kurma ve duygularını ifade etme ihtiyacını hatırlatır. Hislerini varsaymak yerine konuşabileceğin güvenli bir an seç.',
   'Maça, zihnini meşgul eden düşünceleri ayırt etmeye çağırır. Elindeki bilgiyi yorumlarından ayrı yazmak, konuyu sadeleştirebilir.',
   'Karo, günlük düzenini ve elindeki imkânları temsil eder. Büyük kararlar yerine bugün uygulanabilecek küçük bir düzenleme belirle.',
   'Sinek, hareket ve girişimle ilgilidir. Enerjini her işe dağıtmak yerine tamamlanabilir tek bir adıma yönelt.'
  ][suit]||'';
 }
 if(id.startsWith('k'))return `Bu özgün ilişki sembolü ${card.name.toLocaleLowerCase('tr-TR')} imgesini taşıyor. Bir başkasının düşüncelerini bildiğini varsaymadan, bu imgenin senin ihtiyaçların ve sınırların için ne ifade ettiğine bak.`;
 return `Tarotun ${card.name} imgesi bir sonuç vaat etmez; mevcut duruma farklı açıdan bakmanı sağlar. Kartın çağrıştırdığı temayı gündelik hayatından bir örnekle eşleştirip bunun sana nasıl hissettirdiğini düşün.`;
}
export function localCardReading(cards:Card[],spread:'daily'|'three'){
 const paragraphs=cards.map((card,index)=>{
  const slot=positions[spread==='daily'?1:index];
  return `${slot.title} · ${card.name}
${slot.intro} ${card.meaning} ${detail(card)} ${slot.prompt}`;
 });
 const closing=spread==='daily'
  ?'Kendine kısa bir not bırak: Bu kartın çağrıştırdığı fikirle bugün denemek istediğin tek davranış ne? Akşam olduğunda nasıl hissettiğini tekrar gözden geçirebilirsin.'
  :'Kartları birlikte düşünürken geçmişteki deneyimin, bugünkü ihtiyacın ve olası adımın arasında bir bağ kur. İki kart aynı temaya dokunuyorsa bunu bir tekrar olarak; ayrışıyorsa yeni bir bakış açısı olarak değerlendirebilirsin. Son kararı kendi koşullarına göre ver.';
 return paragraphs.join('\n\n')+'\n\n'+closing;
}
