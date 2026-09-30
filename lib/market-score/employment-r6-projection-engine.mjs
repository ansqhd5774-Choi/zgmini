import { EMPLOYMENT_R6_FORMULA_HASH } from "./employment-r6-formula.mjs";
export const EMPLOYMENT_R6_PROJECTION_REVISION="EMP-R6-PROJECTION-R1";
const finite=v=>Number.isFinite(Number(v));
const DEFS=Object.freeze([
 Object.freeze({id:"UNEMPLOYMENT",label:"실업률",display:"U3_UNEMPLOYMENT_RATE",score:"U3_UNEMPLOYMENT",displayTransform:"RAW",scoreTransform:"U3 inverse 10Y causal percentile"}),
 Object.freeze({id:"PAYROLL",label:"비농업고용",display:"PAYEMS_LEVEL",score:"PAYEMS_3M_AVG",displayTransform:"MONTHLY_DELTA",scoreTransform:"PAYEMS 3M-average 10Y causal percentile"}),
 Object.freeze({id:"CLAIMS",label:"신규 실업수당 청구건수",display:"INITIAL_CLAIMS",score:"INITIAL_CLAIMS_4W",displayTransform:"RAW",scoreTransform:"Initial Claims SA4WK inverse 10Y causal percentile"}),
 Object.freeze({id:"JOB_OPENINGS",label:"구인건수",display:"JOLTS_JOB_OPENINGS_LEVEL",score:"JOLTS_OPENINGS_RATE",displayTransform:"RAW",scoreTransform:"JOLTS Openings Rate 10Y causal percentile"}),
]);
const norm=r=>({
 logicalSeriesId:String(r?.logicalSeriesId??r?.logical_series_id??""),
 provider:String(r?.provider??""),providerSeriesId:String(r?.providerSeriesId??r?.provider_series_id??""),
 observationDate:String(r?.observationDate??r?.observation_date??""),
 value:finite(r?.value)?Number(r.value):null,unit:String(r?.unit??""),sourceHash:String(r?.sourceHash??r?.source_hash??"")
});
function rawRows(obs,id){return (obs??[]).map(norm).filter(x=>x.logicalSeriesId===id&&x.observationDate&&finite(x.value)).sort((a,b)=>a.observationDate.localeCompare(b.observationDate));}
function displayRows(obs,d){const rows=rawRows(obs,d.display);if(d.displayTransform!=="MONTHLY_DELTA")return rows;const out=[];for(let i=1;i<rows.length;i++)out.push({...rows[i],value:rows[i].value-rows[i-1].value,unit:"THOUSANDS_PERSONS_CHANGE"});return out;}
function trend(rows){const a=rows.at(-1),b=rows.at(-2);if(!a)return{direction:null,delta:null,previousValue:null};if(!b)return{direction:"UNKNOWN",delta:null,previousValue:null};const delta=a.value-b.value;return{direction:delta>0?"UP":delta<0?"DOWN":"FLAT",delta,previousValue:b.value};}
export function computeEmploymentR6Projections({observations=[],featurePoints=[]}={}){
 return DEFS.map(d=>{const rows=displayRows(observations,d),cur=rows.at(-1)??null,f=featurePoints.find(x=>x?.featureId===d.score)??null;
  const ready=Boolean(cur&&finite(cur.value)&&f?.status==="READY"&&finite(f?.score)&&Number(f.score)>=0&&Number(f.score)<=100);
  return{id:d.id,label:d.label,status:ready?"READY":"PARTIAL",score:ready?Number(f.score):null,displayValue:cur&&finite(cur.value)?Number(cur.value):null,
   unit:cur?.unit??null,observationDate:cur?.observationDate??null,scoreObservationDate:f?.observationDate??null,trend:trend(rows),
   source:cur?{provider:cur.provider||null,providerSeriesId:cur.providerSeriesId||null,logicalSeriesId:d.display,sourceHash:cur.sourceHash||null}:null,
   formulaMetadata:{methodologyVersion:"EMP-R6",projectionRevision:EMPLOYMENT_R6_PROJECTION_REVISION,formulaHash:EMPLOYMENT_R6_FORMULA_HASH,
    displayTransform:d.displayTransform,scoreFeatureId:d.score,scoreTransform:d.scoreTransform,independentFromEmploymentTotal:true}
  };
 });
}
export const EMPLOYMENT_R6_PROJECTION_DEFINITIONS=DEFS;
export const EMPLOYMENT_R6_PROJECTION_CONTRACT=Object.freeze({revision:EMPLOYMENT_R6_PROJECTION_REVISION,formulaHash:EMPLOYMENT_R6_FORMULA_HASH,
 projectionCount:4,providerCalls:0,storedDataOnly:true,independentFromEmploymentTotal:true,publicOutput:false,readPointerUpdated:false});
