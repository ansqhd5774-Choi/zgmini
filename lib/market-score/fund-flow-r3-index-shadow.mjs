export const FUND_FLOW_R3_INDEX_SHADOW_METHOD="FUND_FLOW_R3_INDEX_ONLY_SHADOW_R1";
export const FUND_FLOW_R3_INDEX_WEIGHT=1;
export const FUND_FLOW_R3_MIN_VALID=12;

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);

function normalize(rows=[]){
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const observationDate=String(row?.observationDate??row?.date??row?.label??"").slice(0,10);
    const value=Number(row?.value??row?.indexNetRatio??row?.indexNetFlow3mToCurrentAssetsPct);
    if(validDate(observationDate)&&finite(value))map.set(observationDate,{observationDate,value});
  }
  return [...map.values()].sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
}
export function empiricalPercentileR3(values,current){
  const history=(Array.isArray(values)?values:[]).filter(finite);
  if(!history.length||!finite(current))return null;
  let below=0,equal=0;
  for(const value of history){
    if(value<current)below++;
    else if(value===current)equal++;
  }
  return 100*(below+0.5*equal)/history.length;
}
export function buildFundFlowR3IndexShadow(rows=[],{asOfDate="9999-12-31",minValid=FUND_FLOW_R3_MIN_VALID}={}){
  if(!Number.isInteger(minValid)||minValid<3)throw new Error("FUND_FLOW_R3_MIN_VALID_INVALID");
  const normalized=normalize(rows).filter(row=>row.observationDate<=asOfDate);
  if(!normalized.length)return {
    status:"PARTIAL",score:null,reason:"FUND_FLOW_R3_INDEX_MISSING",
    methodologyVersion:FUND_FLOW_R3_INDEX_SHADOW_METHOD,mode:"SHADOW_ONLY",
  };
  const seen=[],trend=[];
  for(const row of normalized){
    seen.push(row.value);
    if(seen.length<minValid)continue;
    const score=empiricalPercentileR3(seen,row.value);
    if(finite(score))trend.push({label:row.observationDate,value:score,rawValue:row.value});
  }
  const latest=trend.at(-1)??null;
  if(!latest)return {
    status:"PARTIAL",score:null,reason:"FUND_FLOW_R3_INDEX_WARMUP",trend:[],
    methodologyVersion:FUND_FLOW_R3_INDEX_SHADOW_METHOD,mode:"SHADOW_ONLY",
  };
  return {
    status:"READY",
    score:latest.value,
    observationDate:latest.label,
    rawIndexFlow:latest.rawValue,
    trend,
    weight:{indexFlow:FUND_FLOW_R3_INDEX_WEIGHT},
    scoring:"EXPANDING_EMPIRICAL_PERCENTILE_PIT",
    methodologyVersion:FUND_FLOW_R3_INDEX_SHADOW_METHOD,
    interpretation:"Higher index-fund net flow receives a higher score. No non-index, redemption, all-fund, or momentum factor is mixed into the candidate.",
    mode:"SHADOW_ONLY",
    productionFormulaChanged:false,
  };
}
