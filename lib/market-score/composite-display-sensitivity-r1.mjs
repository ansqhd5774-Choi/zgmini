export const COMPOSITE_DISPLAY_SENSITIVITY_R1=3.5;

const finiteScore=value=>typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=100;
const clamp=value=>Math.max(0,Math.min(100,value));

export function amplifyCompositeDisplayScore(value,factor=COMPOSITE_DISPLAY_SENSITIVITY_R1){
  if(!finiteScore(value))return null;
  if(typeof factor!=="number"||!Number.isFinite(factor)||factor<=0)return value;
  return clamp(50+(value-50)*factor);
}

export function amplifyCompositeDisplayTrend(rows=[],factor=COMPOSITE_DISPLAY_SENSITIVITY_R1){
  return (Array.isArray(rows)?rows:[]).flatMap(point=>{
    const value=amplifyCompositeDisplayScore(point?.value,factor);
    return value===null?[]:[{...point,value}];
  });
}
