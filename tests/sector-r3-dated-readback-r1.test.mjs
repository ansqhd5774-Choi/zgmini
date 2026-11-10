import test from 'node:test';
import assert from 'node:assert/strict';
import {SECTOR_FEAR_GREED_R3_SECTORS,SECTOR_FEAR_GREED_R3_PUBLIC_VERSION}
 from '../lib/market-score/sector-fear-greed-r3-public.mjs';
import {sectorR3DisplayDigest,compareSectorR3DatedReadbacks}
 from '../lib/score-history/sector-r3-dated-readback-r1.mjs';

const SHA='1'.repeat(64);
const DATE='2026-11-09';
const STORED_AT=Date.parse('2026-11-10T00:20:19.790Z');
function fixtures(){
 const sectors=SECTOR_FEAR_GREED_R3_SECTORS.map((item,i)=>({...item,score:i+1}));
 const history=Array.from({length:251},(_,i)=>({date:new Date(Date.UTC(2025,10,1+i)).toISOString().slice(0,10),
  ...Object.fromEntries(sectors.map(s=>[s.id,s.score]))}));
 history.push({date:DATE,...Object.fromEntries(sectors.map(s=>[s.id,s.score]))});
 const publicBody={version:SECTOR_FEAR_GREED_R3_PUBLIC_VERSION,status:'READY',
  observationDate:DATE,confirmedObservationDate:DATE,phase:'CONFIRMED',
  methodologyVersion:'FIVE_AXIS_R3',referenceObservations:756,sourceVersion:'ROLLING_252',sectors,history};
 const digest=sectorR3DisplayDigest(publicBody);
 const pcDate={status:'READ',snapshotKey:'2026-11-10',storedAt:STORED_AT,
  bodySha256:SHA,displayDigestSha256:digest,observationDate:DATE};
 const d1Current={...pcDate,snapshotKey:'current'};
 return {pcDate,d1Current,publicBody};
}

test('one actual dated PC row, D1 current and confirmed API display match without claiming a PIT year',()=>{
 const x=compareSectorR3DatedReadbacks(fixtures());
 assert.equal(x.status,'SAME_EVENT_DISPLAY_READBACK_PASS');
 assert.equal(x.sameEventVerified,true);
 assert.equal(x.oneYearPitVerified,false);
 assert.notEqual(x.snapshotKey,x.observationDate); // UTC execution day is not the market observation day.
});

test('D1 current cannot silently differ from the dated PC source bytes or timestamp',()=>{
 const x=fixtures();x.d1Current.bodySha256='2'.repeat(64);
 assert.equal(compareSectorR3DatedReadbacks(x).code,'BODY_SHA_MISMATCH');
 const y=fixtures();y.d1Current.storedAt++;
 assert.equal(compareSectorR3DatedReadbacks(y).code,'D1_STORED_AT_MISMATCH');
});

test('unpublished and provisional values cannot be accepted as the same confirmed observation',()=>{
 const x=fixtures();x.publicBody.phase='PROVISIONAL';
 assert.equal(compareSectorR3DatedReadbacks(x).code,'PUBLIC_NOT_SAME_CONFIRMED_OBSERVATION');
 const y=fixtures();y.pcDate.status='NOT_FOUND';
 assert.equal(compareSectorR3DatedReadbacks(y).code,'STORED_READBACK_MISSING');
});

test('score, observation date and 252th history point are part of the readback identity',()=>{
 const x=fixtures();x.publicBody.sectors[0].score=99;
 assert.equal(compareSectorR3DatedReadbacks(x).code,'DISPLAY_DIGEST_MISMATCH');
 const y=fixtures();y.pcDate.observationDate='2026-11-08';
 assert.equal(compareSectorR3DatedReadbacks(y).code,'STORED_OBSERVATION_DATE_MISMATCH');
 const z=fixtures();z.publicBody.history.at(-1).technology=99;
 assert.equal(sectorR3DisplayDigest(z.publicBody),null);
});

test('date key must be based on the stored UTC execution day, not an invented backfill date',()=>{
 const x=fixtures();x.pcDate.snapshotKey='2026-11-09';
 assert.equal(compareSectorR3DatedReadbacks(x).code,'PC_DATE_KEY_STORED_AT_MISMATCH');
 const y=fixtures();y.pcDate.storedAt=Number.MAX_SAFE_INTEGER;
 assert.equal(compareSectorR3DatedReadbacks(y).code,'PC_DATE_KEY_STORED_AT_MISMATCH');
 const z=fixtures();z.pcDate.observationDate='2026-11-11';z.d1Current.observationDate='2026-11-11';
 assert.equal(compareSectorR3DatedReadbacks(z).code,'FUTURE_OBSERVATION_DATE');
});
