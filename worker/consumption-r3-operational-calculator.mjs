const finite=v=>typeof v==="number"&&Number.isFinite(v);
const validDate=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const avg=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const SPARSE=new Set(["TERMCBCCALLNS","TERMCBPER24NS","TERMCBAUTO48NS","DTCTLVENMNM"]);

const qKey=date=>{
  const y=Number(date.slice(0,4)),m=Number(date.slice(5,7));
  return `${y}-Q${Math.floor((m-1)/3)+1}`;
};
const mapDate=rows=>new Map((rows??[]).filter(x=>validDate(x?.date)&&finite(x?.value)).map(x=>[x.date,x.value]));
const qAvg=(rows,q)=>{
  const a=(rows??[]).filter(x=>qKey(x.date)===q&&finite(x.value)).map(x=>x.value);
  return a.length===3?avg(a):null;
};
const latestMonthLE=(rows,date)=>{
  const a=(rows??[]).filter(x=>x.date<=date&&finite(x.value));
  return a.length?a.at(-1):null;
};

function featureSeries(c,raw,cpi,dpi){
  if(!Array.isArray(raw)||!raw.length)return [];
  const p=c.primary_feature,f=c.frequency,D=mapDate(dpi),C=mapDate(cpi),out=[];
  if(p==="level")return raw.filter(x=>finite(x.value)).map(x=>({...x}));
  if(p==="yoy"){
    const lag=f==="Q"?4:f==="W"?52:12;
    for(let i=lag;i<raw.length;i++){
      const a=raw[i-lag],b=raw[i];
      if(finite(a?.value)&&finite(b?.value)&&a.value!==0)out.push({date:b.date,value:100*(b.value/a.value-1)});
    }
    return out;
  }
  if(p==="real_yoy"){
    if(f==="M"){
      for(let i=12;i<raw.length;i++){
        const a=raw[i-12],b=raw[i],ca=C.get(a.date),cb=C.get(b.date);
        if([a?.value,b?.value,ca,cb].every(finite)&&a.value!==0&&ca!==0)out.push({date:b.date,value:100*((b.value/cb)/(a.value/ca)-1)});
      }
    }else if(f==="Q"){
      for(let i=4;i<raw.length;i++){
        const a=raw[i-4],b=raw[i],ca=qAvg(cpi,qKey(a.date)),cb=qAvg(cpi,qKey(b.date));
        if([a?.value,b?.value,ca,cb].every(finite)&&a.value!==0&&ca!==0)out.push({date:b.date,value:100*((b.value/cb)/(a.value/ca)-1)});
      }
    }
    return out;
  }
  if(p==="stock_to_income"){
    if(f==="Q"){
      for(const x of raw){
        const d=qAvg(dpi,qKey(x.date));
        if(finite(x.value)&&finite(d)&&d!==0)out.push({date:x.date,value:x.value/d});
      }
    }else{
      for(const x of raw){
        const d=latestMonthLE(dpi,x.date)?.value;
        if(finite(x.value)&&finite(d)&&d!==0)out.push({date:x.date,value:x.value/d});
      }
    }
    return out;
  }
  if(p==="credit_to_income"){
    for(const x of raw){
      const d=D.get(x.date);
      if(finite(x.value)&&finite(d)&&d!==0)out.push({date:x.date,value:x.value/d});
    }
    return out;
  }
  if(p==="credit_impulse_3m"){
    for(let i=2;i<raw.length;i++){
      const d=D.get(raw[i].date);
      if([raw[i]?.value,raw[i-1]?.value,raw[i-2]?.value,d].every(finite)&&d!==0){
        out.push({date:raw[i].date,value:100*4*(raw[i].value+raw[i-1].value+raw[i-2].value)/d});
      }
    }
    return out;
  }
  throw new Error(`UNSUPPORTED_PRIMARY_FEATURE:${c.candidate_id}:${p}`);
}
function aheSeries(nom,cpi){
  const C=mapDate(cpi),real=[],out=[];
  for(const x of nom){
    const cv=C.get(x.date);
    if(finite(x.value)&&finite(cv)&&cv!==0)real.push({date:x.date,value:100*x.value/cv});
  }
  for(let i=12;i<real.length;i++){
    const a=real[i-12],b=real[i];
    if(a.value!==0)out.push({date:b.date,value:100*(b.value/a.value-1)});
  }
  return out;
}
function quarterize(c,feat){
  const g=new Map();
  const min=c.frequency==="M"?(SPARSE.has(c.series_id)?1:2):c.frequency==="W"?8:1;
  for(const x of feat??[]){
    if(!validDate(x?.date)||!finite(x?.value))continue;
    const q=qKey(x.date);
    if(!g.has(q))g.set(q,[]);
    g.get(q).push(x);
  }
  const out=[];
  for(const [quarter,a] of [...g.entries()].sort(([a],[b])=>a.localeCompare(b))){
    if(a.length>=min)out.push({
      quarter,
      value:avg(a.map(x=>x.value)),
      observationDate:a.map(x=>x.date).sort().at(-1),
    });
  }
  return out;
}
function percentile(hist,x){
  let lt=0,eq=0;
  for(const v of hist){if(v<x)lt++;else if(v===x)eq++}
  return (lt+0.5*eq)/hist.length;
}
function orient(direction,p){
  if(direction==="POSITIVE")return 100*p;
  if(direction==="INVERSE")return 100*(1-p);
  if(direction==="TWO_SIDED"||direction==="NON_MONOTONIC")return 100*(1-2*Math.abs(p-0.5));
  throw new Error(`UNSUPPORTED_DIRECTION:${direction}`);
}
function scoreHistory(c,rows,quarter){
  const h=(rows??[]).filter(x=>x.quarter<=quarter&&finite(x.value)).sort((a,b)=>a.quarter.localeCompare(b.quarter));
  const cur=h.at(-1);
  if(!cur||h.length<20)return null;
  const p=percentile(h.map(x=>x.value),cur.value);
  return {
    candidateId:c.candidate_id,
    score:orient(c.direction,p),
    validHistory:h.length,
    featureValue:cur.value,
    featureQuarter:cur.quarter,
    observationDate:cur.observationDate??null,
  };
}
function nonAlfredCurrentFeature(c,fixture,config){
  const payloads=fixture.payloads??{};
  const cpi=payloads[`ALFRED:${config.helpers.CPI}`]?.rows??[];
  const dpi=payloads[`ALFRED:${config.helpers.DPI}`]?.rows??[];
  if(c.route==="CENSUS_MARTS_ARCHIVE"){
    const z=payloads["CENSUS:MARTS"]?.metrics?.[c.candidate_id];
    if(!z)return null;
    const C=mapDate(cpi),ct=C.get(z.observationDate),cy=C.get(z.priorYearDate);
    if(![z.raw,z.priorYearRaw,ct,cy].every(finite)||z.priorYearRaw===0||cy===0)return null;
    return {quarter:fixture.quarter,value:100*((z.raw/ct)/(z.priorYearRaw/cy)-1),observationDate:z.observationDate};
  }
  if(c.route==="NYFED_HHDC"){
    const z=payloads["NYFED:HHDC"]?.metrics?.[c.candidate_id];
    if(!z)return null;
    let value=null;
    if(c.candidate_id==="C1R2_101"||c.candidate_id==="C1R2_106")value=z.value;
    else{
      const rq=payloads["NYFED:HHDC"]?.reportQuarter??fixture.quarter;
      const d=qAvg(dpi,rq);
      if(!finite(d)||d===0)return null;
      if(c.primary_feature==="balance_to_income")value=z.raw/d;
      else if(c.primary_feature==="origination_to_income")value=4*z.raw/d;
    }
    if(!finite(value))return null;
    const rq=payloads["NYFED:HHDC"]?.reportQuarter??fixture.quarter;
    const year=rq.slice(0,4),q=Number(rq.at(-1));
    return {quarter:fixture.quarter,value,observationDate:`${year}-${String((q-1)*3+1).padStart(2,"0")}-01`};
  }
  if(c.route==="EIA_WPSR_ARCHIVE"){
    const z=payloads["EIA:WPSR"];
    if(!z||!finite(z.current)||!finite(z.priorYear)||z.priorYear===0)return null;
    return {quarter:fixture.quarter,value:100*(z.current/z.priorYear-1),observationDate:z.archiveDate??null};
  }
  return null;
}

export function calculateConsumptionR3Operational({
  config,
  axisMembership,
  sourceFixture,
  priorSourceFixtures=[],
  nonAlfredFeatureHistory,
}={}){
  if(!config||!axisMembership||!sourceFixture||!nonAlfredFeatureHistory)throw new Error("C1_R3_OPERATIONAL_INPUTS_REQUIRED");
  const core=new Set(config.core95Ids??[]);
  if(core.size!==95)throw new Error(`C1_R3_CORE95_COUNT:${core.size}`);
  const quarter=sourceFixture.quarter,scoreDate=sourceFixture.scoreDate;
  if(typeof quarter!=="string"||!validDate(scoreDate))throw new Error("C1_R3_SCORE_PERIOD_INVALID");

  const candidates=(config.base99??[]).filter(c=>core.has(c.candidate_id));
  const byId=new Map(candidates.map(c=>[c.candidate_id,c]));
  const payloads=sourceFixture.payloads??{};
  const cpi=payloads[`ALFRED:${config.helpers.CPI}`]?.rows??[];
  const dpi=payloads[`ALFRED:${config.helpers.DPI}`]?.rows??[];
  const nom=payloads[`ALFRED:${config.helpers.AHE_NOMINAL}`]?.rows??[];
  const histById=new Map();
  for(const row of nonAlfredFeatureHistory.rows??[]){
    if(!histById.has(row.candidateId))histById.set(row.candidateId,[]);
    histById.get(row.candidateId).push({
      quarter:row.quarter,value:row.featureValue,observationDate:row.observationDate??null,
    });
  }

  const rows=[],missing=[];
  for(const c of candidates){
    let scored=null;
    if(c.route==="ALFRED"){
      const raw=payloads[`ALFRED:${c.series_id}`]?.rows;
      if(Array.isArray(raw)){
        const qrows=quarterize(c,featureSeries(c,raw,cpi,dpi));
        scored=scoreHistory(c,qrows,quarter);
      }
    }else if(c.route==="ALFRED_DERIVED_REAL_AHE"){
      if(nom.length&&cpi.length)scored=scoreHistory(c,quarterize(c,aheSeries(nom,cpi)),quarter);
    }else{
      const history=(histById.get(c.candidate_id)??[]).filter(x=>x.quarter<=quarter).sort((a,b)=>a.quarter.localeCompare(b.quarter));
      const fixtures=[...(priorSourceFixtures??[]),sourceFixture]
        .filter(x=>x&&typeof x.quarter==="string"&&x.quarter<=quarter)
        .sort((a,b)=>a.quarter.localeCompare(b.quarter));
      for(const fx of fixtures){
        const cur=nonAlfredCurrentFeature(c,fx,config);
        if(!cur)continue;
        const existing=history.find(x=>x.quarter===fx.quarter);
        if(existing){
          if(Math.abs(existing.value-cur.value)>1e-12)throw new Error(`C1_R3_CURRENT_FEATURE_MISMATCH:${c.candidate_id}:${fx.quarter}`);
        }else{
          history.push(cur);history.sort((a,b)=>a.quarter.localeCompare(b.quarter));
        }
      }
      scored=scoreHistory(c,history,quarter);
    }
    if(!scored)missing.push(c.candidate_id); else rows.push(scored);
  }

  if(rows.length!==95||missing.length){
    return {status:"PARTIAL",revision:"R3.45P",quarter,scoreDate,rows,missing,axisScores:null,flat7:null};
  }

  const scoreBy=new Map(rows.map(x=>[x.candidateId,x.score]));
  const axisScores={};
  for(const [axis,spec] of Object.entries(axisMembership.axes??{})){
    const ids=(spec.ids??[]).filter(id=>core.has(id));
    const values=ids.map(id=>scoreBy.get(id));
    if(!ids.length||!values.every(finite))throw new Error(`C1_R3_AXIS_INCOMPLETE:${axis}`);
    axisScores[axis]=avg(values);
  }
  if(Object.keys(axisScores).length!==7)throw new Error(`C1_R3_AXIS_COUNT:${Object.keys(axisScores).length}`);
  const flat7=avg(Object.values(axisScores));
  return {status:"READY",revision:"R3.45P",quarter,scoreDate,rows,missing:[],axisScores,flat7};
}

export const C1_R3_OPERATIONAL_CALCULATOR_CONTRACT=Object.freeze({
  revision:"R3.45P",
  source:"STORED_NORMALIZED_SOURCE_ONLY",
  liveProviderFallback:false,
  networkRequests:0,
  requiredCandidateCount:95,
  normalization:"TIME_CAUSAL_EXPANDING_PERCENTILE_MIN20",
  tieRule:"(lt+0.5*eq)/N",
  missingPolicy:"PARTIAL_NULL_NO_REWEIGHT",
  aggregation:"EQUAL_WITHIN_AXIS_THEN_EQUAL_7_AXES",
});
