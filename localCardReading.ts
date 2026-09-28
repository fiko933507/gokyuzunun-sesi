import type {Card} from './cardDecks';

export function localCardReading(cards:Card[],spread:'daily'|'three'){
 const labels=spread==='daily'?['Bugün']:['Geçmiş','Bugün','Olasılık'];
 const paragraphs=cards.map((card,index)=>`${labels[index]} · ${card.name}: ${card.meaning}`);
 const closing=spread==='daily'?'Bu sembol bugün hangi küçük adımı atmana yardımcı olabilir?':'Bu üç sembol arasında hangi bağ senin durumuna anlamlı geliyor?';
 return paragraphs.join('\n\n')+'\n\n'+closing;
}
