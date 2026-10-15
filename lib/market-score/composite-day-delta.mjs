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
