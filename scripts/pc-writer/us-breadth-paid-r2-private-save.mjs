/**
 * Optional private, immutable R2 output file. Invoke only from an approved
 * existing PC Writer after its stored-only calculation and installed-source
 * checks. This module never calls MarketParquet, D1 or public endpoints.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {previousMarketSession} from '../../lib/market-score/breadth-b1-r6-marketparquet-provider.mjs';
import {US_PAID_R2_SOURCE} from '../../lib/market-breadth/us-marketparquet-paid-r2-adapter.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const digest=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const day=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)
  &&Number.isFinite(Date.parse(s+'T00:00:00Z'))
  &&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const score=s=>typeof s==='number'&&Number.isFinite(s)&&s>=0&&s<=100;
const no=(status)=>({status,readbackVerified:false,operationalWrites:0,
  d1Writes:0,providerCalls:0});

export function validPrivatePaidUsBreadthR2(r){
  if(r?.status!=='PAID_R2_STORED_PRIVATE_CALCULATED'||r.prepared!==true
      ||r.publicationAllowed!==false
      ||!Number.isInteger(r.comparedSessions)||r.comparedSessions<1
      ||r.comparedSessions>250
      ||r.fullYearHistory!==(r.comparedSessions===250)
      ||!day(r.firstDate)||!day(r.lastDate)
      ||!Array.isArray(r.publicHistoryPreview)
      ||r.publicHistoryPreview.length!==r.comparedSessions
      ||!Array.isArray(r.privateSourceReceipts)
      ||r.privateSourceReceipts.length!==r.comparedSessions+1
      ||r.publicHistoryPreview[0]?.date!==r.firstDate
      ||r.publicHistoryPreview.at(-1)?.date!==r.lastDate
      ||JSON.stringify(r.publicHistoryPreview.at(-1))!==JSON.stringify(r.publicPercentPreview)
      ||r.sourceLatestProviderDateVerified!==false)return false;
  for(let i=0;i<r.privateSourceReceipts.length;i++){
    const item=r.privateSourceReceipts[i];
    if(!day(item?.date)||!digest(item.sha256)||!digest(item.projectionSha256))return false;
    if(i>0){
      const point=r.publicHistoryPreview[i-1];
      if(previousMarketSession(item.date)!==r.privateSourceReceipts[i-1].date
          ||point?.date!==item.date
          ||!score(point.risingPct)||!score(point.unchangedPct)
          ||!score(point.fallingPct)
          ||Math.abs(point.risingPct+point.unchangedPct+point.fallingPct-100)>1e-8)
        return false;
    }
  }
  return true;
}

export function savePrivatePaidUsBreadthR2(base,calculated,{saveEnabled=false}={}){
  if(saveEnabled!==true)return no('PAID_R2_PRIVATE_SAVE_DISABLED');
  if(typeof base!=='string'||!base||!validPrivatePaidUsBreadthR2(calculated))
    return no('PAID_R2_PRIVATE_SAVE_INVALID_INPUT');
  // Serialize only the explicit private provenance and percent-only output.
  const record={
    schema:'ZGMINI_US_PAID_BREADTH_R2_PRIVATE_V1',
    source:US_PAID_R2_SOURCE,
    phase:'CONFIRMED',publicationAllowed:false,
    firstDate:calculated.firstDate,lastDate:calculated.lastDate,
    comparedSessions:calculated.comparedSessions,
    fullYearHistory:calculated.fullYearHistory,
    sourceLatestProviderDateVerified:false,
    points:calculated.publicHistoryPreview,
    sourceReceipts:calculated.privateSourceReceipts,
  };
  const bytes=Buffer.from(JSON.stringify(record)+'\n');
  const fingerprint=sha(bytes);
  const name=calculated.lastDate+'-'+fingerprint+'.json';
  const relative=path.join('marketparquet-paid','derived','us-breadth-r2',name);
  const file=path.join(path.resolve(base),relative);
  let created=false;
  try{
    fs.mkdirSync(path.dirname(file),{recursive:true});
    try{
      fs.writeFileSync(file,bytes,{flag:'wx'});created=true;
    }catch(e){
      if(e?.code!=='EEXIST')throw e;
    }
    const saved=fs.readFileSync(file);
    if(sha(saved)!==fingerprint||!saved.equals(bytes))
      return no('PAID_R2_PRIVATE_CONFLICT_PRESERVED');
    return {status:created?'PAID_R2_PRIVATE_SAVED_READBACK_VERIFIED'
        :'PAID_R2_PRIVATE_UNCHANGED_READBACK_VERIFIED',
      readbackVerified:true,sha256:fingerprint,bytes:bytes.length,
      relativePath:relative,operationalWrites:created?1:0,d1Writes:0,
      providerCalls:0};
  }catch{
    return no('PAID_R2_PRIVATE_WRITE_OUTCOME_UNVERIFIED_NO_RETRY');
  }
}
