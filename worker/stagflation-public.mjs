import {STAGFLATION_S21_VERSION} from '../lib/diagnostic-layer/stagflation-s21.mjs';
import {PUBLIC_DISPLAY_MAX_AGE_MS} from './public-display-freshness.mjs';
import {validStagflationInputs,publicStagflationInputs} from '../lib/diagnostic-layer/stagflation-inputs.mjs';
export const STAGFLATION_PUBLIC_KEY='detail:stagflation-risk:s21';
const valid=x=>Number.isFinite(x)&&x>=0&&x<=100;
const month=x=>typeof x==='string'&&/^\d{4}-(0[1-9]|1[0-2])-01$/.test(x);
const next=x=>{const [y,m]=x.split('-').map(Number);return new Date(Date.UTC(y,m,1)).toISOString().slice(0,10)};
const axisKeys=['inflation','realEconomy','labor','expectationsEnergy','slowdown'];
const contractionKeys=['production','consumption','income','employment'];
export function validateStagflationRecord(r){
 if(r?.publicationAuthorized!==true||r.methodVersion!==STAGFLATION_S21_VERSION||r.historyPolicy!=='CURRENT_VINTAGE_RECONSTRUCTION_NOT_PIT'||r.status!=='READY'||!valid(r.score)||!month(r.observationMonth)||!Array.isArray(r.history)||r.history.length!==13)return false;
 if(typeof r.sourceHash!=='string'||!/^[a-f0-9]{64}$/.test(r.sourceHash)||!Number.isFinite(Date.parse(r.sourceStoredAt)))return false;
 return r.history.every((p,i)=>month(p.observationMonth)&&valid(p.score)&&p.status==='READY'&&(!i||next(r.history[i-1].observationMonth)===p.observationMonth))&&r.history.at(-1).observationMonth===r.observationMonth&&Math.abs(r.history.at(-1).score-r.score)<1e-9&&axisKeys.every(k=>valid(r.history.at(-1).axes?.[k]))&&contractionKeys.every(k=>typeof r.history.at(-1).contraction?.[k]==='boolean')&&validStagflationInputs(r);
}
export function stagflationPublicBody(r){
 // Only derived points; private raw arrays, source hashes and audit errors stay private.
 return {status:'READY',score:r.score,methodologyVersion:r.methodVersion,historyPolicy:r.historyPolicy,observationMonth:r.observationMonth,
  trend:r.history.map(p=>({label:p.observationMonth,value:p.score})),
  axes:Object.fromEntries(axisKeys.map(k=>[k,r.history.at(-1).axes[k]])),contraction:Object.fromEntries(contractionKeys.map(k=>[k,r.history.at(-1).contraction[k]])),inputs:publicStagflationInputs(r.inputs)};
}
export async function readStagflation(db,{now=Date.now()}={}){
 const headers={'cache-control':'no-store','x-robots-tag':'noindex','x-content-type-options':'nosniff'};
 const unavailable=reason=>Response.json({status:'UNAVAILABLE',score:null,reason,trend:[]},{status:503,headers});
 let row,r;try{row=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind(STAGFLATION_PUBLIC_KEY).first();if(row)r=JSON.parse(row.body)}catch{return unavailable('STORED_READ_UNAVAILABLE')}
 if(!row)return unavailable('STORED_DATA_PENDING');
 if(!validateStagflationRecord(r))return unavailable('STORED_DATA_NOT_APPROVED');
 const storedAt=Number(row.stored_at),sourceAt=Date.parse(r.sourceStoredAt);
 if(!Number.isFinite(storedAt)||storedAt>now||sourceAt>now||Date.parse(r.observationMonth)>now||now-storedAt>=PUBLIC_DISPLAY_MAX_AGE_MS||now-sourceAt>=PUBLIC_DISPLAY_MAX_AGE_MS)return unavailable('STORED_DATA_STALE');
 return Response.json(stagflationPublicBody(r),{headers:{...headers,'cache-control':'public, max-age=60, must-revalidate','x-data-snapshot-at':new Date(storedAt).toISOString()}});
}
