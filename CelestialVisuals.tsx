import React from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

const SIGNS=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const STAR_POINTS=Array.from({length:55},(_,i)=>({
 x:(i*67+Math.sin(i*13)*29+150)%100,
 y:(i*43+Math.cos(i*9)*23+150)%100,
 size:i%7===0?3:1.4,
}));
export function SkyAtmosphere({night}:{night:boolean}){
 return <ImageBackground pointerEvents="none" source={night?require('./assets/sky-night.jpg'):require('./assets/sky-day.jpg')}
   resizeMode="cover" style={StyleSheet.absoluteFill}>
  <View style={[StyleSheet.absoluteFill,{backgroundColor:night?'rgba(12,8,31,0.18)':'rgba(255,239,244,0.12)'}]}/>
 </ImageBackground>;
}
export function SunDisc({size=158}:{size?:number}){
 return <View accessibilityLabel="Gündüz gökyüzünde güneş ve bulutlar" style={{width:size+52,height:size+38,justifyContent:'center',alignItems:'center',overflow:'hidden'}}>
  <View style={{position:'absolute',width:size+32,height:size+32,borderRadius:size,backgroundColor:'#FFF7CA',opacity:.18}}/>
  <View style={{position:'absolute',width:size+7,height:size+7,borderRadius:size,backgroundColor:'#FFEFAE',opacity:.38}}/>
  <View style={{width:size*.82,height:size*.82,borderRadius:size,backgroundColor:'#FFF6CB',borderWidth:2,borderColor:'#FFF9EC',shadowColor:'#F9BD85',shadowRadius:30,shadowOpacity:.9,elevation:5}}/>
  <View style={{position:'absolute',left:1,bottom:25,width:size*.64,height:size*.26,borderRadius:60,backgroundColor:'#FFF8F2',opacity:.94}}/>
  <View style={{position:'absolute',left:24,bottom:37,width:size*.4,height:size*.3,borderRadius:60,backgroundColor:'#FFF9F5',opacity:.94}}/>
  <View style={{position:'absolute',right:-7,bottom:35,width:size*.6,height:size*.24,borderRadius:60,backgroundColor:'#F8E2F2',opacity:.92}}/>
  <View style={{position:'absolute',right:16,bottom:47,width:size*.35,height:size*.25,borderRadius:60,backgroundColor:'#FFF3F9',opacity:.92}}/>
 </View>;
}
export function MoonDisc({night,phaseName,illuminated,size=160}:{night:boolean;phaseName:string;illuminated:number;size?:number}){
 const phase=phaseName.toLocaleLowerCase('tr-TR');
 const emoji=phase.includes('yeni')?'🌑':phase.includes('hilal')?(phase.includes('küçülen')?'🌘':'🌒'):phase.includes('ilk')?'🌓':phase.includes('son')?'🌗':phase.includes('dolunay')?'🌕':phase.includes('küçülen')?'🌖':'🌔';
 return <View accessibilityLabel={'Ay evresi '+phaseName+', yüzde '+illuminated+' aydınlık'} style={{width:size+30,height:size+30,justifyContent:'center',alignItems:'center'}}>
  <View style={{position:'absolute',width:size+25,height:size+25,borderRadius:size,backgroundColor:night?'#DEBBDF':'#FFCEAD',opacity:.13}}/>
  <View style={{position:'absolute',width:size+11,height:size+11,borderRadius:size,backgroundColor:night?'#D2B8DB':'#FFEACB',opacity:.26}}/>
  <View style={{width:size,height:size,borderRadius:size/2,backgroundColor:night?'#E8D7CB':'#FFE8CA',overflow:'hidden',borderWidth:2,borderColor:night?'#D8BCEB':'#FFFCED',justifyContent:'center',alignItems:'center'}}>
   <View style={{position:'absolute',left:-size*.23,top:-size*.16,width:size*.92,height:size*.95,borderRadius:size,backgroundColor:night?'#555074':'#E9C6B4',opacity:.47,transform:[{rotate:'-17deg'}]}}/>
   {[[.19,.23,.13],[.53,.1,.1],[.63,.52,.16],[.26,.67,.09],[.44,.37,.08],[.75,.22,.05]].map(([x,y,r],i)=><View key={i} style={{position:'absolute',left:size*x,top:size*y,width:size*r,height:size*r,borderRadius:size*r,backgroundColor:night?'#8F88A3':'#D6A8A0',opacity:.18,borderWidth:1,borderColor:'#FFFFFF50'}}/>)}
   <Text style={{fontSize:size*.49,opacity:.9}}>{night?emoji:'🌙'}</Text>
  </View>
 </View>;
}
export function ZodiacWheel({night,active,onSelect}:{night:boolean;active:number;onSelect:(i:number)=>void}){
 const {width}=useWindowDimensions();
 const size=Math.min(Math.max(width-68,240),344);
 const center=size/2,ring=size*.41;
 const gold=night?'#E7BD90':'#976E9D';
 return <View style={{width:size,height:size,alignSelf:'center',justifyContent:'center',alignItems:'center',marginVertical:12}}>
  <View style={[styles.ring,{width:size,height:size,borderColor:gold,opacity:.88}]}/>
  <View style={[styles.ring,{width:size*.67,height:size*.67,borderColor:gold,opacity:.6}]}/>
  <View style={[styles.ring,{width:size*.35,height:size*.35,borderColor:gold,opacity:.53}]}/>
  {Array.from({length:12},(_,i)=><View key={'ray'+i} pointerEvents="none" style={{position:'absolute',width:1,height:size*.15,top:size*.055,left:center,backgroundColor:gold,opacity:.65,transform:[{rotate:i*30+'deg'},{translateY:size*.18}]}}/>)}
  {SIGNS.map((glyph,i)=>{
   const angle=(i*30-90)*Math.PI/180;
   const x=center+ring*Math.cos(angle)-18,y=center+ring*Math.sin(angle)-18;
   return <Pressable accessibilityRole="button" accessibilityLabel={'Burç '+glyph} key={i} onPress={()=>onSelect(i)}
    style={{position:'absolute',left:x,top:y,width:36,height:36,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:i===active?(night?'#F4D3A7':'#684984'):'transparent'}}>
    <Text style={{fontSize:26,color:i===active?(night?'#312447':'#FFF1E8'):gold}}>{glyph}</Text>
   </Pressable>;
  })}
  <Text style={{fontSize:50,color:gold}}>☾</Text>
  <Text style={{color:night?'#D7C5E8':'#8C718F',fontSize:10,letterSpacing:2}}>12 BURÇ</Text>
 </View>;
}
const styles=StyleSheet.create({ring:{position:'absolute',aspectRatio:1,borderWidth:1.1,borderRadius:500}});
