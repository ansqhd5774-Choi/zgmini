import {createHash} from 'node:crypto';
import {SECTOR_FEAR_GREED_R3_SECTORS} from '../market-score/sector-fear-greed-r3-public.mjs';
import {validateSectorFearGreedR3Payload} from '../../worker/sector-fear-greed-r3-public.mjs';

const SHA256=/^[0-9a-f]{64}$/;
const isoDay=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 Number.isFinite(Date.parse(`${x}T00:00:00Z`))&&new Date(`${x}T00:00:00Z`).toISOString().slice(0,10)===x;
const fail=code=>({status:'UNPROVEN',code,sameEventVerified:false,oneYearPitVerified:false});

// Fixed public-derived score digest; dates and source/methodology are part of
// the identity. A future authorized A receipt can compute this from local body
// without disclosing raw input or full 252-day history.
export function sectorR3DisplayDigest(body){
 if(!validateSectorFearGreedR3Payload(body)||!isoDay(body.observationDate))return null;
 const tail=body.history.at(-1);
 if(tail?.date!==body.observationDate||SECTOR_FEAR_GREED_R3_SECTORS.some(({id},i)=>
  body.sectors[i].score!==tail[id]))return null;
 const selected={version:body.version,observationDate:body.observationDate,
  methodologyVersion:body.methodologyVersion,referenceObservations:body.referenceObservations,
  sourceVersion:body.sourceVersion,
  scores:body.sectors.map(({id,score})=>[id,score])};
 return createHash('sha256').update(JSON.stringify(selected)).digest('hex');
}

// Compares one PC dated row, D1 current, and the already-published confirmed
// API response. This is NOT a one-year PIT proof: source vintages need a
// separate same-event verification before any score counts as 1Y complete.
export function compareSectorR3DatedReadbacks({pcDate,d1Current,publicBody}={}){
 if(pcDate?.status!=='READ'||d1Current?.status!=='READ')return fail('STORED_READBACK_MISSING');
 if(!isoDay(pcDate.snapshotKey)||d1Current.snapshotKey!=='current')return fail('SNAPSHOT_KEY_INVALID');
 const at=pcDate.storedAt;
 if(!Number.isSafeInteger(at)||at<=0||!Number.isFinite(new Date(at).getTime())||
    pcDate.snapshotKey!==new Date(at).toISOString().slice(0,10))
  return fail('PC_DATE_KEY_STORED_AT_MISMATCH');
 if(d1Current.storedAt!==at)return fail('D1_STORED_AT_MISMATCH');
 if(!SHA256.test(pcDate.bodySha256??'')||!SHA256.test(d1Current.bodySha256??''))
  return fail('BODY_HASH_MISSING');
 if(pcDate.bodySha256!==d1Current.bodySha256)return fail('BODY_SHA_MISMATCH');
 if(!isoDay(pcDate.observationDate)||pcDate.observationDate!==d1Current.observationDate)
  return fail('STORED_OBSERVATION_DATE_MISMATCH');
 if(pcDate.observationDate>pcDate.snapshotKey)return fail('FUTURE_OBSERVATION_DATE');
 if(publicBody?.phase!=='CONFIRMED'||publicBody?.confirmedObservationDate!==pcDate.observationDate)
  return fail('PUBLIC_NOT_SAME_CONFIRMED_OBSERVATION');
 const digest=sectorR3DisplayDigest(publicBody);
 if(!digest||!SHA256.test(pcDate.displayDigestSha256??'')||
    !SHA256.test(d1Current.displayDigestSha256??'')||
    digest!==pcDate.displayDigestSha256||digest!==d1Current.displayDigestSha256)
  return fail('DISPLAY_DIGEST_MISMATCH');
 return {status:'SAME_EVENT_DISPLAY_READBACK_PASS',sameEventVerified:true,
  oneYearPitVerified:false,snapshotKey:pcDate.snapshotKey,observationDate:pcDate.observationDate,
  storedAt:at,displayDigestSha256:digest};
}
