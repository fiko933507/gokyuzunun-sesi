export type DeckId='tarot'|'katina'|'iskambil';
export type Card={id:string;name:string;symbol:string;meaning:string};
const majors=[
 ['Deli','✦','Yeni bir başlangıca açık ol.'],['Büyücü','✧','Elindeki imkânları fark et.'],['Başrahibe','☾','Sezgilerine kulak ver.'],['İmparatoriçe','❀','Kendine özen göster.'],['İmparator','♜','Sınırlarını ve düzenini düşün.'],['Aziz','✛','Bildiklerinden destek al.'],['Âşıklar','♡','Değerlerinle uyumlu seçimleri düşün.'],['Savaş Arabası','⚑','Yönünü kararlılıkla belirle.'],['Güç','♌','Sabır ve şefkati bir arada tut.'],['Ermiş','☄','Kendine sessiz bir alan aç.'],['Kader Çarkı','◎','Değişime uyum sağlamayı düşün.'],['Adalet','⚖','Dengeyi gözet.'],['Asılan Adam','◇','Durumu başka açıdan gör.'],['Ölüm','☥','Eski bir alışkanlığı bırakmayı düşün.'],['Denge','⚗','İki ihtiyacın arasında uyum ara.'],['Şeytan','♄','Seni kısıtlayan kalıpları fark et.'],['Kule','♜','Değişimin ortaya çıkardıklarını gör.'],['Yıldız','✶','Umuda ve iyileşmeye yer aç.'],['Ay','☽','Belirsizlikte acele karar verme.'],['Güneş','☀','İyi gelen şeyleri fark et.'],['Mahkeme','♬','Geçmişten ne öğrendiğini düşün.'],['Dünya','◉','Tamamladıklarını kutla.']
] as const;
// Original symbolic cards for a Katina-inspired relationship reading; no third-party deck art.
const katina=[
 ['Kalp','♡','Yakınlık ve duygu'],['Mektup','✉','İletişim ve söylenmeyenler'],['Anahtar','⚿','Yeni bir kapı'],['Yol','⌁','Seçimler ve yön'],['Ayna','◇','Kendini tanıma'],['Köprü','⌒','Bağ kurma'],['Bahçe','❀','Sosyal çevre'],['Saat','◷','Zaman ve sabır'],['Yıldız','✦','Umut'],['Deniz','〰','Duyguların akışı'],['Ev','⌂','Güvenli alan'],['Kuş','♧','Haber ve hareket'],['Fener','✧','Açıklık'],['Düğüm','∞','Çözülecek mesele'],['Pencere','▣','Yeni bakış açısı'],['Çiçek','✿','Özen'],['Dağ','△','Emek isteyen engel'],['Ay','☾','Sezgi']
] as const;
const suits=[['Kupa','♥','Duygular'],['Maça','♠','Düşünceler'],['Karo','♦','Günlük yaşam'],['Sinek','♣','Eylem']] as const;
const ranks=['As','2','3','4','5','6','7','8','9','10','Vale','Kız','Papaz'] as const;
const rankThemes=['ilk adım','iki seçenek arasındaki denge','paylaşım ve işbirliği','sağlam bir temel','değişim karşısındaki tutum','karşılıklı destek','beklentileri gözden geçirme','sabırla emek verme','bir döngünün olgunlaşması','tamamlanma ve yeni alan açma','merakla haberleşme','özenli bir bakış','sorumluluk alma'] as const;
export const DECKS:Record<DeckId,{title:string;description:string;cards:Card[]}>= {
 tarot:{title:'Tarot',description:'Büyük Arkana · 22 sembolik kart',cards:majors.map(([name,symbol,meaning],i)=>({id:'t'+i,name,symbol,meaning}))},
 katina:{title:'Katina tarzı',description:'İlişkiler üzerine özgün sembolik kartlar',cards:katina.map(([name,symbol,meaning],i)=>({id:'k'+i,name,symbol,meaning}))},
 iskambil:{title:'İskambil',description:'52 kart · dört renk',cards:suits.flatMap(([name,symbol,meaning],s)=>ranks.map((rank,i)=>({id:'i'+s+'-'+i,name:rank+' '+name,symbol,meaning:meaning+' alanında '+rankThemes[i]+' üzerine düşünme'})))}
};
export const deckIds:DeckId[]=['tarot','katina','iskambil'];
export function shuffledCards(deck:DeckId):Card[]{
 const result=[...DECKS[deck].cards];
 for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
 return result;
}
