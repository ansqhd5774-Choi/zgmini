export const EMPLOYMENT_R54_METHOD="EMPLOYMENT_R54_STORED_4FACTOR_R1";
export const EMPLOYMENT_R54_CANDIDATE="EMPLOYMENT_R54_CANDIDATE_R1";

export const EMPLOYMENT_R54_WEIGHTS=Object.freeze({
  unemployment:0.30,
  payrollMomentum:0.30,
  claims4w:0.20,
  stateDiffusion3m:0.20,
});

export const EMPLOYMENT_R54_INDICATORS=Object.freeze([
  Object.freeze({id:"employment-41",name:"실업률",unit:"%"}),
  Object.freeze({id:"employment-42",name:"비농업고용 3M 평균 증감",unit:"천명/월"}),
  Object.freeze({id:"employment-43",name:"신규 실업수당 4W 평균",unit:"건"}),
  Object.freeze({id:"employment-44",name:"주 고용확산 3M",unit:"점"}),
]);

const finite=v=>typeof v==="number"&&Number.isFinite(v);
const clamp100=v=>Math.max(0,Math.min(100,v));
const dateOk=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);

function normalize(rows=[]){
  const map=new Map();
  for(const row of rows??[]){
    const observationDate=row?.observationDate??row?.observation_date??row?.date;
    const value=Number(row?.value);
    if(!dateOk(observationDate)||!finite(value))continue;
    map.set(observationDate,{observationDate,value});
  }
  return [...map.values()].sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
}

function percentile(values,current){
  const xs=(values??[]).filter(finite);
  if(!xs.length||!finite(current))return null;
  let below=0,equal=0;
  for(const value of xs){
    if(value<current)below++;
    else if(value===current)equal++;
  }
  return 100*(below+0.5*equal)/xs.length;
}

function trailingPercentile(rows,currentValue,{limit,minValid,invert=false}={}){
  const xs=(rows??[]).slice(-limit).map(x=>x.value).filter(finite);
  if(xs.length<minValid)return null;
  const p=percentile(xs,currentValue);
  return p==null?null:clamp100(invert?100-p:p);
}

function monthKeyShift(date,delta){
  const [y,m]=String(date).slice(0,7).split("-").map(Number);
  if(!Number.isInteger(y)||!Number.isInteger(m))return null;
  const d=new Date(Date.UTC(y,m-1+delta,1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-01`;
}

function payrollMomentumRows(payrollRows=[]){
  const rows=normalize(payrollRows);
  const map=new Map(rows.map(x=>[x.observationDate,x.value]));
  const out=[];
  for(const row of rows){
    const lag=map.get(monthKeyShift(row.observationDate,-3));
    if(!finite(lag))continue;
    out.push({observationDate:row.observationDate,value:(row.value-lag)/3});
  }
  return out;
}

function claims4wRows(rows=[]){
  const byDate=new Map();
  for(const row of rows??[]){
    const id=String(row?.logicalSeriesId??row?.logical_series_id??"");
    if(id!=="STATE_INITIAL_CLAIMS")continue;
    const observationDate=row?.observationDate??row?.observation_date;
    const geography=String(row?.geographyCode??row?.geography_code??"");
    const value=Number(row?.value);
    if(!dateOk(observationDate)||!geography||!finite(value)||value<0)continue;
    const bucket=byDate.get(observationDate)??new Map();
    bucket.set(geography,value);
    byDate.set(observationDate,bucket);
  }
  const weekly=[...byDate.entries()]
    .map(([observationDate,bucket])=>({
      observationDate,
      value:[...bucket.values()].reduce((a,b)=>a+b,0),
      geographyCount:bucket.size,
    }))
    .filter(x=>x.geographyCount>=51)
    .sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
  const out=[];
  for(let i=3;i<weekly.length;i++){
    const window=weekly.slice(i-3,i+1);
    out.push({
      observationDate:weekly[i].observationDate,
      value:window.reduce((s,x)=>s+x.value,0)/4,
    });
  }
  return out;
}

function diffusion3mRows(rows=[]){
  return (rows??[])
    .filter(row=>String(row?.logicalSeriesId??row?.logical_series_id??"")==="STATE_EMP_DIFFUSION_3M")
    .map(row=>({
      observationDate:row?.observationDate??row?.observation_date,
      value:Number(row?.value),
    }))
    .filter(row=>dateOk(row.observationDate)&&finite(row.value))
    .sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
}

function indicator(def,{score=null,value=null,observationDate=null,source=null,status=null}={}){
  const ready=finite(score)&&score>=0&&score<=100&&finite(value)&&dateOk(observationDate);
  return {
    id:def.id,name:def.name,label:def.name,
    status:status??(ready?"READY":"PARTIAL"),
    score:ready?score:null,
    value:ready?value:null,
    unit:def.unit,
    observationDate:ready?observationDate:null,
    asOfDate:ready?observationDate:null,
    source:ready?source:null,
    sourceKey:def.id,
    missing:ready?[]:["EMPLOYMENT_R54_FACTOR_MISSING"],
  };
}

export function buildEmploymentR54Candidate({
  unemploymentRows=[],
  payrollLevelRows=[],
  shadowRows=[],
  asOfDate="9999-12-31",
}={}){
  const unemployment=normalize(unemploymentRows).filter(x=>x.observationDate<=asOfDate);
  const payrollMomentum=payrollMomentumRows(payrollLevelRows).filter(x=>x.observationDate<=asOfDate);
  const claims4w=claims4wRows(shadowRows).filter(x=>x.observationDate<=asOfDate);
  const diffusion3m=diffusion3mRows(shadowRows).filter(x=>x.observationDate<=asOfDate);

  const u=unemployment.at(-1)??null;
  const p=payrollMomentum.at(-1)??null;
  const c=claims4w.at(-1)??null;
  const d=diffusion3m.at(-1)??null;

  const uScore=u?trailingPercentile(unemployment,u.value,{limit:120,minValid:60,invert:true}):null;
  const pScore=p?trailingPercentile(payrollMomentum,p.value,{limit:120,minValid:60,invert:false}):null;
  const cScore=c?trailingPercentile(claims4w,c.value,{limit:52,minValid:26,invert:true}):null;
  const dScore=d?clamp100(d.value):null;

  const indicators=[
    indicator(EMPLOYMENT_R54_INDICATORS[0],{score:uScore,value:u?.value,observationDate:u?.observationDate,source:"BLS / UNRATE"}),
    indicator(EMPLOYMENT_R54_INDICATORS[1],{score:pScore,value:p?.value,observationDate:p?.observationDate,source:"BLS / PAYEMS"}),
    indicator(EMPLOYMENT_R54_INDICATORS[2],{score:cScore,value:c?.value,observationDate:c?.observationDate,source:"DOL ETA 539 / stored state claims"}),
    indicator(EMPLOYMENT_R54_INDICATORS[3],{score:dScore,value:d?.value,observationDate:d?.observationDate,source:"BLS CES SAE / STATE_EMP_DIFFUSION_3M"}),
  ];

  const scores=indicators.map(x=>x.score);
  const ready=scores.every(finite);
  const score=ready?clamp100(
    EMPLOYMENT_R54_WEIGHTS.unemployment*scores[0]+
    EMPLOYMENT_R54_WEIGHTS.payrollMomentum*scores[1]+
    EMPLOYMENT_R54_WEIGHTS.claims4w*scores[2]+
    EMPLOYMENT_R54_WEIGHTS.stateDiffusion3m*scores[3]
  ):null;

  return {
    id:"employment",
    name:"고용",
    methodologyVersion:EMPLOYMENT_R54_METHOD,
    status:ready?"READY":"PARTIAL",
    score,
    indicators,
    missingFactors:ready?[]:indicators.filter(x=>x.status!=="READY").map(x=>x.id),
    interpretation:"Employment R54 candidate: 실업률 30% + 비농업고용 3M 평균 증감 30% + 신규 실업수당 4W 평균 20% + 주 고용확산 3M 20%. 백분위 산식은 저장된 과거 데이터만 사용하며 결측 가중치 재배분은 하지 않습니다.",
    asOfDate,
    calculationMode:"STORED_DATA_ONLY",
  };
}

export async function loadEmploymentR54CandidateFromStored(db,{
  unemploymentRows=[],
  payrollLevelRows=[],
  asOfDate="9999-12-31",
}={}){
  if(!db||typeof db.prepare!=="function")throw new TypeError("D1_DATABASE_REQUIRED");
  const table="market_score_employment_r4_shadow_current_v1";
  const result=await db.prepare(`SELECT * FROM ${table} WHERE logical_series_id IN ('STATE_INITIAL_CLAIMS','STATE_EMP_DIFFUSION_3M') AND observation_date<=? ORDER BY observation_date,geography_code`).bind(asOfDate).all();
  const shadowRows=Array.isArray(result?.results)?result.results:Array.isArray(result)?result:[];
  return buildEmploymentR54Candidate({unemploymentRows,payrollLevelRows,shadowRows,asOfDate});
}
