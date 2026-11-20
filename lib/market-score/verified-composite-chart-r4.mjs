// W06 #28: display-only provenance. No historic point is assigned a guessed method.
const validScore=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
export function splitVerifiedCompositeChart(points=[],current=null){
 const stamp=current?.updatedAt,version=current?.modelVersion;
 const validCurrent=typeof stamp==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(stamp)
  &&Number.isFinite(Date.parse(stamp))&&new Date(Date.parse(stamp)).toISOString()===stamp
  &&typeof version==='string'&&/^CM-R\d+$/.test(version)&&validScore(current?.displayScore);
 return (Array.isArray(points)?points:[]).map(point=>{
  const calculated=typeof point?.label==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(point.label);
  const verified=calculated&&validCurrent&&point.label===stamp&&validScore(point.value)
    &&Math.abs(point.value-current.displayScore)<1e-7;
  return {...point,reconstructedValue:calculated?null:point.value,
   legacyCalculatedValue:calculated&&!verified?point.value:null,
   verifiedCalculatedValue:verified?point.value:null,
   verifiedModelVersion:verified?version:null};
 });
}
