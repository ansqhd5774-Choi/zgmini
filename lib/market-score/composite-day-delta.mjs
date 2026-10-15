import {domainObservationDelta} from './domain-observation-delta.mjs';
import {amplifyCompositeDisplayScore} from './composite-display-sensitivity-r1.mjs';
export function compositeDayDelta(trend=[],rawScore){
 const score=amplifyCompositeDisplayScore(rawScore);
 const rows=(Array.isArray(trend)?trend:[]).map(point=>({label:point.label??point.date,value:amplifyCompositeDisplayScore(point.value??point.score)}));
 const comparison=domainObservationDelta(rows,score);
 if(!comparison)return null;
 const previous=rows.find(row=>row.label===comparison.previousDate)?.value;
 if(previous===null||previous===undefined||score===null)return null;
 return {...comparison,delta:Number((Number(score.toFixed(1))-Number(previous.toFixed(1))).toFixed(1))};
}
export function compositePeriodDelta(trend=[],rawScore,days=365){
 const current=compositeDayDelta(trend,rawScore);
 if(!current)return null;
 const rows=trend.map(p=>({date:p.label??p.date,value:amplifyCompositeDisplayScore(p.value??p.score)})).filter(p=>typeof p.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&Number.isFinite(Date.parse(p.date))).sort((a,b)=>a.date.localeCompare(b.date));
 const cutoff=Date.parse(current.currentDate??rows.at(-1).date)-days*86400000;
 const baseline=rows.filter(p=>Date.parse(p.date)<=cutoff).at(-1);
 if(!baseline||baseline.value===null)return null;
 const score=amplifyCompositeDisplayScore(rawScore);
 return {previousDate:baseline.date,delta:Number((Number(score.toFixed(1))-Number(baseline.value.toFixed(1))).toFixed(1))};
}
