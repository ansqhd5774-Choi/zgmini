/**
 * Transform only the verified outputs of the already-approved stored-only V9
 * calculator into a small, public display artifact. Never publish source rows,
 * provider inputs, internal formula weights or DB snapshots.
 */
import {projectV9PublicDomain,V9_METHOD} from '../../worker/breadth-v9-public-view.mjs';
const ready=x=>x?.status==='CANDIDATE_READY'&&typeof x.ema3==='number'&&Number.isFinite(x.ema3);
const equal=(a,b)=>Math.abs(a-b)<=1e-6;
export function buildV9PublicRecord({latest,verified}={}){
 if(!latest||!verified||latest.methodologyVersion!==V9_METHOD||verified.methodologyVersion!==V9_METHOD)return null;
 const rows=latest.evaluation?.perDay;
 if(!Array.isArray(rows)||!rows.length||rows.at(-1)?.date!==latest.asOf)return null;
 const valid=rows.filter(ready);
 const last=valid.at(-1);
 const quality=verified.evaluation?.scoreSummary?.latest;
 if(!last||!quality||quality.date!==last.date||quality.status!==undefined||verified.status!=='SHADOW_READY')return null;
 const verifiedScore=verified.display?.score;
 if(typeof verifiedScore!=='number'||!equal(verifiedScore,last.ema3)||!equal(quality.ema3,last.ema3))return null;
 const f=quality.factors;
 if(!f||['F1','F2','F3','F4','F5'].some(k=>typeof f[k]!=='number'||!Number.isFinite(f[k])))return null;
 // Coverage and historical score consistency were enforced by the V9 engine.
 const record={
  version:1,methodologyVersion:V9_METHOD,
  source:'PC_LOCAL_B1_R3_STORED_TIME_LABELED_NOT_OFFICIAL_PIT_ATTESTED',
  asOfDate:latest.asOf,observationDate:last.date,score:last.ema3,
  phase:latest.asOf===last.date?'OBSERVED':'CARRY_FORWARD',
  sourceStoredAt:latest.sourceStoredAt??verified.sourceStoredAt??null,
  factors:Object.fromEntries(['F1','F2','F3','F4','F5'].map(k=>[k,f[k]])),
  trend:valid.slice(-370).map(x=>({label:x.date,value:x.ema3})),
 };
 return projectV9PublicDomain(record)?record:null;
}
