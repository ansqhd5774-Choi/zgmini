// Select only an independently validated, published provisional score for a matching
// risk card. Other cards retain their existing stored/confirmed scoring contract.
const validScore=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
const validIso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&/^\\d{4}-\\d\\d-\\d\\dT/.test(value);

export function selectDashboardRiskDisplay({key,confirmed,stagflation,earnings}){
 const fallback={score:validScore(confirmed)?confirmed:null,provisional:false};
 if(key==='stagflationSafety'){
  const p=stagflation;
  if(p?.status==='READY'&&p.phase==='PROVISIONAL'&&
   p.methodologyVersion==='STAGFLATION_LATEST_PUBLISHED_R1'&&
   p.evaluationMode==='LATEST_PUBLISHED_INPUTS_NOT_COMMON_MONTH_OR_FORECAST'&&
   p.inputCount===8&&validScore(p.score)&&validIso(p.observedAt)&&
   Array.isArray(p.history)&&p.history.length>0&&
   p.history.at(-1)?.observedAt===p.observedAt&&p.history.at(-1)?.score===p.score){
   return {score:p.score,provisional:true};
  }
 }
 if(key==='earningsRecessionDefense'){
  const p=earnings,last=Array.isArray(p?.history)?p.history.at(-1):null;
  if(p?.status==='READY'&&p.phase==='PROVISIONAL'&&
   p.methodologyVersion==='E1-R4'&&validScore(p.score)&&validIso(p.observedAt)&&
   /^\\d{4}-\\d\\d-(?:30|31)$/.test(p.quarterEnd??'')&&
   Number.isInteger(p.universeCount)&&p.universeCount>=480&&p.universeCount<=500&&
   last?.observedAt===p.observedAt&&last?.score===p.score&&
   Number.isInteger(last.observed?.epsGrowth)&&
   typeof last.coverage?.epsGrowth==='number'&&Number.isFinite(last.coverage.epsGrowth)&&
   Math.abs(last.coverage.epsGrowth-last.observed.epsGrowth/p.universeCount)<1e-7){
   return {score:p.score,provisional:true};
  }
 }
 return fallback;
}
