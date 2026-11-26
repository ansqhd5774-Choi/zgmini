// W06 R4 #28 display-only provenance split. No score, source or archive mutation.
// A YYYY-MM-DD point comes from the current-vintage reconstructed daily trend;
// a time-stamped point is an actual published calculation-time observation.
// This classification cannot prove that two saved calculations used the same
// methodology: that separate per-point version is not present in the GET body.
export function splitCompositeChartProvenance(points=[]){
 return (Array.isArray(points)?points:[]).map(point=>{
  const calculated=typeof point?.label==='string'
   &&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(point.label);
  return {
   ...point,
   reconstructedValue:calculated?null:point.value,
   calculatedValue:calculated?point.value:null,
  };
 });
}


// A current, READY published card has its own modelVersion. This can identify
// exactly that calculation instant, not any earlier archive/history point.
// Never backfill method versions into prior point records or infer an era.
/**
 * @param {{label?:string,value?:number,calculatedValue?:number|null}|null} point
 * @param {{updatedAt?:string,displayScore?:number,modelVersion?:string}|null} current
 */
export function publishedCompositeMethodLabel(point,current){
 const stamp=current?.updatedAt;
 const label=point?.label;
 const version=current?.modelVersion;
 if(typeof stamp!=='string'||typeof label!=='string'
   ||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(stamp)
   ||!/^CM-R\d+$/.test(version??'')||stamp!==label)return null;
 const at=Date.parse(stamp);
 if(!Number.isFinite(at)||new Date(at).toISOString()!==stamp)return null;
 if(typeof point?.calculatedValue!=='number'||!Number.isFinite(point.calculatedValue)
   ||typeof point?.value!=='number'||!Number.isFinite(point.value)
   ||typeof current?.displayScore!=='number'||!Number.isFinite(current.displayScore)
   ||current.displayScore<0||current.displayScore>100
   ||point.value<0||point.value>100
   ||Math.abs(point.value-current.displayScore)>1e-7
   ||Math.abs(point.calculatedValue-current.displayScore)>1e-7)return null;
 return version;
}
