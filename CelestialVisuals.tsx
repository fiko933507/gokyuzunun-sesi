import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

const SIGNS=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const STAR_POINTS=Array.from({length:55},(_,i)=>({
 x:(i*67+Math.sin(i*13)*29+150)%100,
 y:(i*43+Math.cos(i*9)*23+150)%100,
 size:i%7===0?3:1.4,
}));
export function SkyAtmosphere({night}:{night:boolean}){
 return <View pointerEvents="none" style={[StyleSheet.absoluteFill,{overflow:'hidden',backgroundColor:night?'#100F2B':'#F9DCE1'}]}>
  <View style={{position:'absolute',top:-155,right:-105,width:390,height:520,borderRadius:260,backgroundColor:night?'#37325E':'#F3ABCF',opacity:night?.38:.65}}/>
  <View style={{position:'absolute',top:190,left:-125,width:345,height:430,borderRadius:230,backgroundColor:night?'#64406B':'#FFE6BC',opacity:night?.22:.76}}/>
  <View style={{position:'absolute',bottom:-180,right:-130,width:480,height:400,borderRadius:260,backgroundColor:night?'#363065':'#C4BCEB',opacity:night?.42:.55}}/>
  {STAR_POINTS.map((point,i)=><View key={i} style={{position:'absolute',top:point.y+'%',left:point.x+'%',width:point.size,height:point.size,borderRadius:3,backgroundColor:night?'#FFF0DB':'#FFFFFF',opacity:night?i%4===0?.98:.38:i%5===0?.9:.38}}/>)}
  {night?<><Text style={{position:'absolute',top:120,right:26,color:'#F8DAAD',fontSize:19,opacity:.8}}>✦</Text><Text style={{position:'absolute',top:330,left:20,color:'#D7B9FF',fontSize:14,opacity:.7}}>✧</Text></>:
   <><View style={{position:'absolute',top:120,left:-50,width:210,height:64,borderRadius:65,backgroundColor:'#FFF8F5',opacity:.45}}/><View style={{position:'absolute',top:165,right:-90,width:270,height:75,borderRadius:70,backgroundColor:'#FFF7E9',opacity:.55}}/></>}
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
