import {
  EMPLOYMENT_R6_FEATURES,
  EMPLOYMENT_R6_FORMULA_HASH,
  canonicalNumber,
  directionScore,
  percentileMeanStrictWeak,
  sha256HexSync,
} from "./employment-r6-formula.mjs";

const DAY=86400000;
const finite=v=>Number.isFinite(Number(v));
const byDate=(a,b)=>String(a.observationDate).localeCompare(String(b.observationDate));

function series(rows,id,filter=()=>true){
  return (rows??[]).filter(r=>r.logicalSeriesId===id&&finite(r.value)&&filter(r))
    .map(r=>({...r,value:Number(r.value)})).sort(byDate);
}
function simple(rows,id){return series(rows,id).map(r=>({date:r.observationDate,value:r.value,sourceHashes:[r.sourceHash]}));}
function byDateMap(points){return new Map(points.map(x=>[x.date,x]));}
function monthlyDelta(points){
  const out=[];for(let i=1;i<points.length;i++)out.push({date:points[i].date,value:points[i].value-points[i-1].value,sourceHashes:[...points[i-1].sourceHashes,...points[i].sourceHashes]});return out;
}
function rollingMean(points,n){
  const out=[];for(let i=n-1;i<points.length;i++){const w=points.slice(i-n+1,i+1);out.push({date:points[i].date,value:w.reduce((a,x)=>a+x.value,0)/n,sourceHashes:w.flatMap(x=>x.sourceHashes)});}return out;
}
function yoy12(points){
  const out=[];for(let i=12;i<points.length;i++){const p=points[i-12].value;if(p!==0)out.push({date:points[i].date,value:100*(points[i].value/p-1),sourceHashes:[...points[i-12].sourceHashes,...points[i].sourceHashes]});}return out;
}
function pairDiff(rows,a,b){
  const A=byDateMap(simple(rows,a)),B=byDateMap(simple(rows,b)),out=[];
  for(const [d,x] of A){const y=B.get(d);if(y)out.push({date:d,value:x.value-y.value,sourceHashes:[...x.sourceHashes,...y.sourceHashes]});}
  return out.sort((x,y)=>x.date.localeCompare(y.date));
}
function smallFirmNet(rows){
  const gains=series(rows,"BED_SMALL_FIRM_GAINS_LEVEL"),loss=series(rows,"BED_SMALL_FIRM_LOSSES_LEVEL");
  const dates=[...new Set(gains.map(x=>x.observationDate))].sort(),out=[];
  for(const d of dates){
    const g=gains.filter(x=>x.observationDate===d),l=loss.filter(x=>x.observationDate===d);
    const gc=new Set(g.map(x=>x.geographyCode)),lc=new Set(l.map(x=>x.geographyCode));
    if(gc.size!==4||lc.size!==4)continue;
    out.push({date:d,value:g.reduce((a,x)=>a+x.value,0)-l.reduce((a,x)=>a+x.value,0),sourceHashes:[...g,...l].map(x=>x.sourceHash)});
  }
  return out;
}
function bedStateBreadth(rows){
  const gains=series(rows,"BED_STATE_GAINS_LEVEL"),loss=series(rows,"BED_STATE_LOSSES_LEVEL"),out=[];
  for(const d of [...new Set(gains.map(x=>x.observationDate))].sort()){
    const g=new Map(gains.filter(x=>x.observationDate===d).map(x=>[x.geographyCode,x]));
    const l=new Map(loss.filter(x=>x.observationDate===d).map(x=>[x.geographyCode,x]));
    const codes=[...g.keys()].filter(x=>l.has(x)).sort();
    if(codes.length!==51)continue;
    let positive=0;for(const c of codes)if(g.get(c).value>l.get(c).value)positive++;
    out.push({date:d,value:100*positive/51,sourceHashes:codes.flatMap(c=>[g.get(c).sourceHash,l.get(c).sourceHash])});
  }
  return out;
}
function stateClaimsBreadth(rows){
  const all=series(rows,"STATE_INITIAL_CLAIMS"),out=[];
  const states=[...new Set(all.map(x=>x.geographyCode))].sort();
  if(states.length!==51)return out;
  const byState=new Map(states.map(s=>[s,all.filter(x=>x.geographyCode===s)]));
  const allDates=[...new Set(all.map(x=>x.observationDate))].sort();
  const idx=new Map(allDates.map((d,i)=>[d,i]));
  for(const d of allDates){
    const i=idx.get(d);if(i<55)continue;
    const priorDate=allDates[i-52];
    let positive=0,hashes=[],ok=true;
    for(const s of states){
      const pts=byState.get(s),m=new Map(pts.map(x=>[x.observationDate,x]));
      const curDates=allDates.slice(i-3,i+1),priorIdx=i-52,priorDates=allDates.slice(priorIdx-3,priorIdx+1);
      const cur=curDates.map(x=>m.get(x)),prev=priorDates.map(x=>m.get(x));
      if(cur.some(x=>!x)||prev.some(x=>!x)){ok=false;break;}
      const ca=cur.reduce((a,x)=>a+x.value,0)/4,pa=prev.reduce((a,x)=>a+x.value,0)/4;
      if(pa===0){ok=false;break;}
      if(100*(ca/pa-1)>0)positive++;
      hashes.push(...cur.map(x=>x.sourceHash),...prev.map(x=>x.sourceHash));
    }
    if(ok)out.push({date:d,value:100*positive/51,sourceHashes:hashes});
  }
  return out;
}
function transform(feature,rows){
  switch(feature.n){
    case 5:return monthlyDelta(simple(rows,"PAYEMS_LEVEL"));
    case 6:return rollingMean(monthlyDelta(simple(rows,"PAYEMS_LEVEL")),3);
    case 7:return monthlyDelta(rollingMean(monthlyDelta(simple(rows,"PAYEMS_LEVEL")),3));
    case 14:return stateClaimsBreadth(rows);
    case 19:return yoy12(simple(rows,"AHE_TOTAL_PRIVATE"));
    case 26:return pairDiff(rows,"BED_GROSS_GAINS_RATE","BED_GROSS_LOSSES_RATE");
    case 27:return smallFirmNet(rows);
    case 28:return bedStateBreadth(rows);
    case 29:return pairDiff(rows,"BED_ESTABLISHMENT_BIRTH_RATE","BED_ESTABLISHMENT_DEATH_RATE");
    default:return simple(rows,feature.logical[0]);
  }
}
function subYears(date,years){const d=new Date(`${date}T00:00:00Z`),m=d.getUTCMonth(),day=d.getUTCDate();d.setUTCFullYear(d.getUTCFullYear()-years);if(m===1&&day===29&&d.getUTCMonth()!==1)d.setUTCDate(28);return d.toISOString().slice(0,10);}
function expectedDates(currentDate,freq){
  const current=new Date(`${currentDate}T00:00:00Z`),out=[];
  if(freq==="MONTHLY"){for(let i=1;i<=120;i++){const d=new Date(Date.UTC(current.getUTCFullYear(),current.getUTCMonth()-i+1,0));out.push(d.toISOString().slice(0,10));}return out.sort();}
  if(freq==="QUARTERLY"){for(let i=1;i<=40;i++){const d=new Date(Date.UTC(current.getUTCFullYear(),current.getUTCMonth()+1-3*i,0));out.push(d.toISOString().slice(0,10));}return out.sort();}
  const start=new Date(`${subYears(currentDate,10)}T00:00:00Z`);
  for(let t=current.getTime()-7*DAY;t>=start.getTime();t-=7*DAY)out.push(new Date(t).toISOString().slice(0,10));
  return out.sort();
}
export function computeFeaturePoint(feature,observations){
  const points=transform(feature,observations).filter(x=>finite(x.value)).sort((a,b)=>a.date.localeCompare(b.date));
  const current=points.at(-1);
  if(!current)return {featureId:feature.id,status:"PARTIAL_MISSING",score:null,rawValue:null};
  const expected=expectedDates(current.date,feature.freq),map=byDateMap(points),reference=[];
  for(const d of expected){const p=map.get(d);if(!p)return {featureId:feature.id,status:"PARTIAL_HISTORY",score:null,rawValue:current.value,observationDate:current.date,missingExpectedDate:d};reference.push(p.value);}
  const pct=percentileMeanStrictWeak(reference,current.value),score=directionScore(pct,feature.direction);
  const inputHashes=[...new Set([...(current.sourceHashes??[]),...expected.flatMap(d=>map.get(d)?.sourceHashes??[])].filter(Boolean))].sort();
  return {
    featureId:feature.id,status:"READY",score,rawValue:current.value,percentile:pct,observationDate:current.date,
    sourceHash:sha256HexSync({featureId:feature.id,formulaHash:EMPLOYMENT_R6_FORMULA_HASH,inputHashes}),
    inputHashCount:inputHashes.length,
  };
}
export function computeAllFeaturePoints(observations){
  return EMPLOYMENT_R6_FEATURES.map(f=>computeFeaturePoint(f,observations));
}
export function computeFamilyScores(featurePoints){
  const byId=new Map(featurePoints.map(x=>[x.featureId,x])),out={};
  for(const fam of [...new Set(EMPLOYMENT_R6_FEATURES.map(x=>x.family))]){
    const defs=EMPLOYMENT_R6_FEATURES.filter(x=>x.family===fam),fw=defs.reduce((a,x)=>a+x.w,0);
    const pts=defs.map(d=>({d,p:byId.get(d.id)}));
    if(pts.some(x=>x.p?.status!=="READY"||!finite(x.p?.score))){out[fam]={status:"PARTIAL",score:null};continue;}
    out[fam]={status:"READY",score:pts.reduce((a,x)=>a+(x.d.w/fw)*x.p.score,0)};
  }
  return out;
}
export function computeEmploymentScore(featurePoints,families){
  if(Object.values(families).some(x=>x.status!=="READY"||!finite(x.score)))return {status:"PARTIAL",score:null};
  const direct=EMPLOYMENT_R6_FEATURES.reduce((a,d)=>a+d.w/100*featurePoints.find(x=>x.featureId===d.id).score,0);
  const family=Object.entries({Slack:20,Payroll:20,Claims:20,Demand:15,Wage:5,Breadth:15,BED:5}).reduce((a,[f,w])=>a+w/100*families[f].score,0);
  if(Math.abs(direct-family)>1e-9)throw new Error(`FAMILY_DIRECT_MISMATCH:${direct}:${family}`);
  return {status:"READY",score:direct};
}
export const EMPLOYMENT_R6_FEATURE_ENGINE_CONTRACT=Object.freeze({
  formulaHash:EMPLOYMENT_R6_FORMULA_HASH,featureCount:29,familyCount:7,storedInputOnly:true,providerCalls:0,survivorReweight:false,all29Required:true,
});
