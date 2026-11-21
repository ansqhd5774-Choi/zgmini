// W01 read-only bridge for existing approved PC A-grade SUMMARY_ONLY receipts.
// This evaluates source presence and local storage timestamps, NOT numerical
// PIT/vintages, public release timestamps, statistical validity, or D1 status.
// No provider requests, PC/D1/SQL access, raw values, or score computation.
import {INFLATION_CAUSAL_19} from './inflation-causal-public-catalog.mjs';
import {INFLATION_CANDIDATES_7} from './inflation-causal-candidates-public-7-catalog.mjs';

const IDS19=INFLATION_CAUSAL_19.map(x=>x.id);
const IDS7=INFLATION_CANDIDATES_7.map(x=>x.id);
const ISO=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const OBS=/^\d{4}-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?$/;
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const iso=x=>typeof x==='string'&&ISO.test(x)&&
  Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
const obs=x=>typeof x==='string'&&OBS.test(x)&&
  Number.isFinite(Date.parse(x.length===7?x+'-01':x))&&
  new Date(x.length===7?x+'-01':x).toISOString().slice(0,x.length)===x;
const fail=code=>{throw Object.assign(new Error(code),{code});};
// The approved A-grade seven-candidate PC receipt emits integer IDs, while
// both source catalogs use canonical decimal strings. Normalize ONLY that
// receipt boundary; never coerce old-19 IDs, fractions or unknown identifiers.
const canonicalReceiptId=(id,allowNumericIds)=>
 allowNumericIds&&Number.isSafeInteger(id)?String(id):id;
function verifySet(rows,expected,key,{allowNumericIds=false}={}){
 if(!Array.isArray(rows)||rows.length!==expected.length)
  fail('W01_METADATA_COUNT_STOP');
 const seen=new Set();
 for(const x of rows){
  if(!isObject(x))fail('W01_METADATA_ID_STOP');
  const id=canonicalReceiptId(x[key],allowNumericIds);
  if(typeof id!=='string'||!expected.includes(id)||seen.has(id))
    fail('W01_METADATA_ID_STOP');
  seen.add(id);
 }
 if(seen.size!==expected.length)fail('W01_METADATA_ID_STOP');
}
function normalized(x,kind,now){
 const id=canonicalReceiptId(x.id,kind==='7');
 const rawStatus=x.status;
 if(typeof rawStatus!=='string')fail('W01_METADATA_STATUS_STOP');
 const ready=kind==='19'?rawStatus==='READY':rawStatus==='PRESENT_VALID';
 const allowed=kind==='19'?['READY','PENDING','STALE']:
  ['PRESENT_VALID','INVALID','MISSING'];
 if(!allowed.includes(rawStatus))fail('W01_METADATA_STATUS_STOP');
 const date=kind==='19'?x.observationDate:x.latestObservationDate;
 const storedAt=x.sourceStoredAt;
 if(ready&&(!obs(date)||!iso(storedAt)||
    Date.parse(storedAt)>now||
    (date.length===7?date+'-01':date)>storedAt.slice(0,10)))
  fail('W01_METADATA_PROVENANCE_STOP');
 if(!ready&&(storedAt!==null&&storedAt!==undefined&&!iso(storedAt)))
  fail('W01_METADATA_PROVENANCE_STOP');
 const count=kind==='7'?x.observationCount:null;
 if(kind==='7'&&(!Number.isInteger(count)||count<0||
    (ready&&count===0)||(rawStatus==='MISSING'&&count!==0)))
  fail('W01_METADATA_OBSERVATION_COUNT_STOP');
 return Object.freeze({
  id,status:rawStatus,locallyStored:ready,
  observationDate:ready?date:null,
  sourceStoredAt:ready?storedAt:null,
  historicalRowCount:kind==='7'&&ready?count:null
 });
}
export function auditInflation26RuntimeMetadata({
  nineteenProjection,sevenRuntime,cutoffs,now=Date.now()
}={}){
 if(!Number.isSafeInteger(now)||now<1||
   !Array.isArray(cutoffs)||cutoffs.length<1||cutoffs.length>120||
   !cutoffs.every(iso)||cutoffs.some((c,i)=>Date.parse(c)>now||
     (i>0&&c<=cutoffs[i-1])))
  fail('W01_METADATA_CUTOFF_STOP');
 if(!isObject(nineteenProjection)||!isObject(sevenRuntime))
  fail('W01_METADATA_SOURCE_STOP');
 const a=nineteenProjection.perId,b=sevenRuntime.indicators;
 verifySet(a,IDS19,'id');verifySet(b,IDS7,'id',{allowNumericIds:true});
 const rows=[
  ...a.map(x=>normalized(x,'19',now)),
  ...b.map(x=>normalized(x,'7',now))
 ];
 const ready=rows.filter(x=>x.locallyStored);
 const statusByCutoff=cutoffs.map(c=>{
  const known=ready.filter(x=>x.sourceStoredAt<=c);
  return Object.freeze({
   cutoff:c,knownStoredByCutoff:known.length,
   previousSnapshotNotProven:26-known.length,
   knownIds:Object.freeze(known.map(x=>x.id).sort((a,b)=>Number(a)-Number(b))),
  });
 });
 return Object.freeze({
  schema:'ZGMINI_W01_INFLATION26_RUNTIME_METADATA_AUDIT_R1',
  evidenceLevel:'PC_A_SUMMARY_ONLY_LOCAL_STORAGE',
  provenanceLimit:'NOT_A_PUBLIC_RELEASE_OR_HISTORICAL_VINTAGE_BACKTEST',
  originalCandidates:30,independentRawCandidates:26,
  localReadyCount:ready.length,localMissingCount:26-ready.length,
  old19Ready:a.filter(x=>x.status==='READY').length,
  new7Ready:b.filter(x=>x.status==='PRESENT_VALID').length,
  localMissingIds:Object.freeze(rows.filter(x=>!x.locallyStored).map(x=>x.id).sort((a,b)=>Number(a)-Number(b))),
  sources:Object.freeze(rows),cutoffResults:Object.freeze(statusByCutoff),
  providerCalls:0,sqliteWrites:0,d1Writes:0,rawEgress:0,
  selectedIndicators:0,approvedWeights:0,approvedCompositeFormula:false,
 });
}
