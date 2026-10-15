import {INFLATION_PIT_SERIES} from "../inflation-pit-backfill.mjs";
import {INFLATION_PCE_PC1_MODE,INFLATION_PCE_PC1_SERIES} from "../inflation-pce-pc1-store.mjs";
import {
  buildInflationR2StoredHistory,
  calculateInflationR2At,
  snapshotInflationR2Features,
  INFLATION_R2_METHOD_REVISION,
} from "../../lib/diagnostic-layer/inflation-r2-stored.mjs";
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const finite=value=>typeof value==="number"&&Number.isFinite(value);
function monthEnds(asOf,count=12){
  const end=new Date(`${asOf}T00:00:00Z`),out=[];
  for(let offset=count-1;offset>=0;offset-=1){
    const d=new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()-offset+1,0));
    out.push(d.toISOString().slice(0,10));
  }
  return out;
}
function partial(reason,extra={}){
  return {
    status:"PARTIAL",
    score:null,
    missingFactors:[reason],
    indicators:[],
    trend:[],
    freshness:"STORED_INITIAL_RELEASE_HISTORY_ONLY",
    updatedAt:null,
    methodologyVersion:INFLATION_R2_METHOD_REVISION,
    interpretation:"Inflation R2: stored PIT history only; live provider fallback forbidden",
    ...extra,
  };
}
export const INFLATION_R2_READER_CONTRACT=Object.freeze({
  schemaVersion:1,
  scoreSource:"STORED_HISTORY_ONLY",
  pitMode:"INITIAL_RELEASE_ONLY",
  pcePc1Mode:INFLATION_PCE_PC1_MODE,
  liveProviderFallback:false,
  networkRequests:0,
  providerRequests:0,
});
function previousFeatureRow(rows=[],asOf,current){
  let previous=null;
  for(const row of rows){
    if(row.availableAt>asOf)break;
    if(current&&row.observationDate===current.observationDate&&row.availableAt===current.availableAt)break;
    previous=row;
  }
  return previous;
}
function withPreviousFeatures(history,features,asOf){
  return Object.fromEntries(Object.entries(features).map(([feature,row])=>{
    if(!row)return [feature,row];
    const previous=previousFeatureRow(history?.[feature]??[],asOf,row);
    return [feature,{
      ...row,
      previousObservationDate:previous?.observationDate??null,
      previousAvailableAt:previous?.availableAt??null,
      previousValue:finite(previous?.value)?previous.value:null,
    }];
  }));
}
export function buildProjection({pit,pc1,asOf}){
if(pit.status!=="READY_STORED_PIT_HISTORY"){
    return partial("INFLATION_R2_PIT_INCOMPLETE",{storage:{pitStatus:pit.status,pc1Missing:pc1.missing}});
  }
  if(pc1.missing.length||pc1.issues.length){
    return partial("INFLATION_R2_PCE_PC1_INCOMPLETE",{storage:{pitStatus:pit.status,pc1Missing:pc1.missing,pc1Issues:pc1.issues}});
  }

  const history=buildInflationR2StoredHistory({pitSeries:pit.series,pcePc1:pc1.series});
  const current=calculateInflationR2At(history,asOf);
  const features=withPreviousFeatures(history,snapshotInflationR2Features(history,asOf),asOf);
  if(current.status!=="READY"){
    return partial("INFLATION_R2_COMPONENT_MISSING",{missingFactors:current.missing,axes:current.axes});
  }
  const labels=[
    ["목표안정","TARGET_STABILITY"],
    ["기조모멘텀","UNDERLYING_MOMENTUM"],
    ["기대인플레","EXPECTATIONS"],
    ["공급압력","SUPPLY_PIPELINE"],
  ];
  const trend=monthEnds(asOf,12)
    .map(date=>({date,result:calculateInflationR2At(history,date)}))
    .filter(item=>item.result.status==="READY")
    .map(item=>({label:item.date,value:item.result.score}));
  const retrievedAts=[
    ...Object.values(pit.snapshots??{}).map(item=>item?.retrievedAt),
    ...Object.values(pc1.snapshots??{}).map(item=>item?.retrievedAt),
  ].filter(value=>typeof value==="string"&&value).sort();

  return {
    status:"READY",
    score:current.score,
    missingFactors:[],
    indicators:labels.map(([name,axis])=>({
      name,
      status:"READY",
      score:current.axes[axis],
      asOfDate:asOf,
      source:"STORED_PIT_HISTORY",
      freshness:"INITIAL_RELEASE_ONLY",
    })),
    trend,
    freshness:"STORED_INITIAL_RELEASE_HISTORY_ONLY",
    updatedAt:retrievedAts.at(-1)??null,
    asOfDate:asOf,
    methodologyVersion:INFLATION_R2_METHOD_REVISION,
    interpretation:"Inflation R2: 7 validated axes, equal 1/7 robust non-fitted top-level weights; stored PIT history only",
    axes:current.axes,
    features,
    storage:{
      pitStatus:pit.status,
      pitLookAheadSafe:pit.lookAheadSafe===true,
      pcePc1Mode:INFLATION_PCE_PC1_MODE,
    },
  };
}
