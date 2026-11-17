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
