import {debtRiskSafety} from '../../lib/diagnostic-layer/model.mjs';

const finite=v=>typeof v==='number'&&Number.isFinite(v);
const dated=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const ids=['dsr','debtGdp','rateBurden','creditStress','debtServiceCapacity'];
function latest(rows,date){
 return (rows??[]).filter(r=>dated(r?.observationDate)&&r.observationDate<=date&&finite(r.value)).sort((a,b)=>a.observationDate.localeCompare(b.observationDate)).at(-1)??null;
}
export function debtStoredHistory(series,asOf,publishedScore){
 if(!dated(asOf))return {trend:[],recalculatedScore:null,scoreMatch:false};
 const calculate=date=>debtRiskSafety(Object.fromEntries(ids.map(id=>[id,latest(series[id],date)?.value??null])));
 const current=calculate(asOf);
 const recalculatedScore=current.status==='READY'?current.score:null;
 const scoreMatch=finite(publishedScore)&&finite(recalculatedScore)&&Math.abs(publishedScore-recalculatedScore)<1e-9;
 // Do not attach a reconstructed curve to a score from an incompatible method.
 if(!scoreMatch)return {trend:[],recalculatedScore,scoreMatch};
 const start=new Date(asOf+'T00:00:00Z');start.setUTCFullYear(start.getUTCFullYear()-1);
 const since=start.toISOString().slice(0,10);
 const dates=[...new Set(ids.flatMap(id=>(series[id]??[]).map(r=>r.observationDate)).filter(d=>dated(d)&&d>=since&&d<=asOf))].sort();
 const trend=dates.flatMap(label=>{const r=calculate(label);return r.status==='READY'?[{label,value:r.score}]:[]});
 // This final point is a verified actual published snapshot, not a new raw observation.
 if(trend.at(-1)?.label!==asOf)trend.push({label:asOf,value:publishedScore});
 return {trend,recalculatedScore,scoreMatch};
}
