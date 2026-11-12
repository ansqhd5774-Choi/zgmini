import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const E1_R5_FORWARD_VALIDATION_INSPECT_R1_VERSION="E1-R5-FORWARD-VALIDATION-INSPECT-R1";
export const E1_R5_FORWARD_VALIDATION_INSPECT_R1_CONTRACT=Object.freeze({
  researchOnly:true,
  productionActivation:false,
  networkCalls:0,
  dbWrites:0,
  formulaChanged:false,
  weightChanged:false,
  normalizationChanged:false,
  productionBaseline:"E1-R4",
  gatePassThresholdsDefined:false,
});

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const clean=value=>String(value??"").trim();
const isoMs=value=>{const ms=Date.parse(clean(value));return Number.isFinite(ms)?ms:null;};

function rank(values){
  const indexed=values.map((value,index)=>({value,index})).sort((a,b)=>a.value-b.value);
  const out=new Array(values.length);
  for(let i=0;i<indexed.length;){
    let j=i+1;
    while(j<indexed.length&&indexed[j].value===indexed[i].value)j++;
    const averageRank=(i+1+j)/2;
    for(let k=i;k<j;k++)out[indexed[k].index]=averageRank;
    i=j;
  }
  return out;
}
function pearson(a,b){
  if(a.length!==b.length||a.length<2)return null;
  const ma=a.reduce((sum,x)=>sum+x,0)/a.length;
  const mb=b.reduce((sum,x)=>sum+x,0)/b.length;
  let numerator=0,da=0,db=0;
  for(let i=0;i<a.length;i++){
    const x=a[i]-ma,y=b[i]-mb;
    numerator+=x*y;da+=x*x;db+=y*y;
  }
  return da>0&&db>0?numerator/Math.sqrt(da*db):null;
}
export function spearmanCorrelation(a,b){
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return null;
  if(a.some(x=>!finite(x))||b.some(x=>!finite(x)))return null;
  return pearson(rank(a),rank(b));
}

export function analyzeForwardShadowLedger(ledger){
  const snapshots=Array.isArray(ledger?.snapshots)?ledger.snapshots:[];
  const pairs=snapshots.filter(row=>finite(row?.state?.raw?.s12a)&&finite(row?.state?.raw?.s13));
  const rho=spearmanCorrelation(pairs.map(row=>row.state.raw.s12a),pairs.map(row=>row.state.raw.s13));
  const dates=new Set(snapshots.map(row=>clean(row?.snapshotDate)).filter(Boolean));
  const checkpoints=new Set();
  let duplicateCheckpointCount=0,timeViolationCount=0,orderViolationCount=0,priorRecordedAt=null;
  for(const row of snapshots){
    const checkpoint=clean(row?.checkpoint);
    if(checkpoint){if(checkpoints.has(checkpoint))duplicateCheckpointCount++;else checkpoints.add(checkpoint);}
    const recordedAt=isoMs(row?.recordedAt),sourceStoredAt=isoMs(row?.sourceStoredAt),sourceAsOf=isoMs(row?.sourceAsOf);
    if(recordedAt===null||sourceStoredAt===null||sourceAsOf===null||sourceStoredAt>recordedAt||sourceAsOf>recordedAt)timeViolationCount++;
    if(priorRecordedAt!==null&&recordedAt!==null&&recordedAt<priorRecordedAt)orderViolationCount++;
    if(recordedAt!==null)priorRecordedAt=recordedAt;
  }
  const integrity=timeViolationCount===0&&orderViolationCount===0&&duplicateCheckpointCount===0;
  return {
    snapshotCount:snapshots.length,
    distinctSnapshotDateCount:dates.size,
    g3:{
      pairCount:pairs.length,
      spearman:rho,
      status:pairs.length<2?"NOT_EVALUABLE_NO_MULTI_PERIOD":"DESCRIPTIVE_ONLY_THRESHOLD_NOT_APPROVED",
      productionGatePass:false,
    },
    g6:{
      pitLedgerIntegrity:integrity?"PASS":"FAIL",
      timeViolationCount,
      orderViolationCount,
      duplicateCheckpointCount,
      status:"NOT_EVALUABLE_UNTIL_PROSPECTIVE_HISTORY_AND_OUTCOMES_ACCUMULATE",
      productionGatePass:false,
    },
  };
}

export function buildCfoRevisions(releases){
  const ready=(Array.isArray(releases)?releases:[]).filter(row=>row?.status==="READY")
    .filter(row=>finite(Number(row?.rollingForwardRevenueGrowth)))
    .sort((a,b)=>Date.parse(a.releaseAt)-Date.parse(b.releaseAt));
  const revisions=[];
  for(let i=1;i<ready.length;i++){
    const previous=Number(ready[i-1].rollingForwardRevenueGrowth),current=Number(ready[i].rollingForwardRevenueGrowth);
    revisions.push({
      from:`${ready[i-1].surveyYear}Q${ready[i-1].surveyQuarter}`,
      to:`${ready[i].surveyYear}Q${ready[i].surveyQuarter}`,
      releaseAt:ready[i].releaseAt,
      s12bRaw:current-previous,
    });
  }
  return {readyPeriodCount:ready.length,readyRevisionCount:revisions.length,revisions};
}

export function alignCfoRevisionsToGrowth(revisions,growthSnapshots){
  const growth=(Array.isArray(growthSnapshots)?growthSnapshots:[])
    .filter(row=>finite(row?.score)&&Number.isFinite(Number(row?.storedAt)))
    .sort((a,b)=>Number(a.storedAt)-Number(b.storedAt));
  const rows=(Array.isArray(revisions)?revisions:[]).map(revision=>{
    const releaseMs=isoMs(revision?.releaseAt);
    if(releaseMs===null)return {...revision,growthScore:null,growthSnapshotKey:null};
    const after=growth.find(row=>Number(row.storedAt)>=releaseMs);
    const before=[...growth].reverse().find(row=>Number(row.storedAt)<releaseMs);
    const selected=after??before??null;
    return {...revision,growthScore:selected?.score??null,growthSnapshotKey:selected?.snapshotKey??null};
  });
  return {
    rows,
    alignedCount:rows.filter(row=>finite(row.growthScore)).length,
    status:rows.length<2?"NOT_EVALUABLE_INSUFFICIENT_CFO_REVISIONS":"DESCRIPTIVE_ALIGNMENT_READY",
    productionGatePass:false,
  };
}

export function aggregateEarningsOutcomes(facts){
  const rows=Array.isArray(facts)?facts:[];
  const periods=new Map();
  for(const row of rows){
    const periodEnd=clean(row?.periodEnd??row?.period_end),metric=clean(row?.metric),value=Number(row?.value);
    if(!periodEnd||!metric||!Number.isFinite(value))continue;
    if(!periods.has(periodEnd))periods.set(periodEnd,{epsGrowth:[],revenueGrowth:[],operatingMargin:[]});
    const bucket=periods.get(periodEnd);
    if(metric in bucket)bucket[metric].push(value);
  }
  const median=values=>{const x=values.slice().sort((a,b)=>a-b);if(!x.length)return null;const i=Math.floor(x.length/2);return x.length%2?x[i]:(x[i-1]+x[i])/2;};
  return [...periods.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([periodEnd,bucket])=>({
    periodEnd,
    epsMedian:median(bucket.epsGrowth),
    revenueMedian:median(bucket.revenueGrowth),
    operatingMarginMedian:median(bucket.operatingMargin),
    epsImprovementBreadth:bucket.epsGrowth.length?bucket.epsGrowth.filter(value=>value>0).length/bucket.epsGrowth.length:null,
    epsCount:bucket.epsGrowth.length,
    revenueCount:bucket.revenueGrowth.length,
    marginCount:bucket.operatingMargin.length,
  }));
}

export function alignForwardOutcomes(snapshots,outcomes){
  const periods=(Array.isArray(outcomes)?outcomes:[]).filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(clean(row?.periodEnd))).sort((a,b)=>a.periodEnd.localeCompare(b.periodEnd));
  const rows=(Array.isArray(snapshots)?snapshots:[]).map(snapshot=>{
    const recordedMs=isoMs(snapshot?.recordedAt);
    const future=recordedMs===null?[]:periods.filter(row=>Date.parse(`${row.periodEnd}T23:59:59Z`)>recordedMs);
    return {
      snapshotDate:snapshot?.snapshotDate??null,
      recordedAt:snapshot?.recordedAt??null,
      s12a:snapshot?.state?.raw?.s12a??null,
      s12b:snapshot?.state?.raw?.s12b??null,
      s13:snapshot?.state?.raw?.s13??null,
      next1Q:future[0]??null,
      next2Q:future[1]??null,
    };
  });
  return {
    rows,
    next1QAlignedCount:rows.filter(row=>row.next1Q).length,
    next2QAlignedCount:rows.filter(row=>row.next2Q).length,
    status:rows.some(row=>row.next1Q&&row.next2Q)?"DESCRIPTIVE_OUTCOME_ALIGNMENT_PRESENT":"NOT_EVALUABLE_NO_REALIZED_NEXT_1Q_2Q_WINDOW",
    productionGatePass:false,
  };
}

function parseArgs(argv=process.argv.slice(2)){const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const cli=parseArgs();
  try{
    if(!cli.ledger)throw Error("LEDGER_REQUIRED");
    const ledger=JSON.parse(fs.readFileSync(path.resolve(cli.ledger),"utf8"));
    const report={version:E1_R5_FORWARD_VALIDATION_INSPECT_R1_VERSION,contract:E1_R5_FORWARD_VALIDATION_INSPECT_R1_CONTRACT,shadow:analyzeForwardShadowLedger(ledger)};
    console.log(JSON.stringify(report));
  }catch(error){
    console.log(JSON.stringify({status:"FAILED",code:String(error?.message??"VALIDATION_INSPECT_FAILED"),networkCalls:0,dbWrites:0,productionActivation:false}));
    process.exitCode=1;
  }
}
