import test from 'node:test';
import assert from 'node:assert/strict';
import {usProvisionalSlot} from '../lib/market-breadth/us-provisional-r1.mjs';

// W06 R4 #38 — one-off public GET readback. No provider or DB access/writes.
// Close the diagnostic PR unmerged; do NOT add an ongoing external-network CI gate.
const endpoint='https://zgmini.kr/api/market-breadth?market=usa&phase=provisional';
const percent=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const allowedUnavailable=new Set([
 'PROVISIONAL_NOT_CURRENT','PROVISIONAL_STORED_OUTPUT_UNAVAILABLE',
 'PROVISIONAL_INVALID_STORED_OUTPUT','PROVISIONAL_INVALID_PUBLICATION_TIME'
]);
test('W06 #38 real USA IEX provisional public GET — percentages or documented fail-closed reason',async()=>{
 const at=new Date();
 const activeSlot=usProvisionalSlot(at);
 const response=await fetch(endpoint,{
  method:'GET',headers:{accept:'application/json','cache-control':'no-cache'},
  signal:AbortSignal.timeout(25000)
 });
 const body=await response.json();
 if(response.status===503){
  assert.ok(allowedUnavailable.has(body?.reason),
   'Expected exact approved provisional unavailable reason, not an HTML/provider failure');
  const result={
   httpStatus:503,reason:body.reason,
   nyCashSessionSlot:activeSlot?.slotKey??null,
   provisionalPresented:false,
   publicSnapshotHeader:response.headers.get('x-data-snapshot-at')
  };
  console.log('W06_38_REAL_PUBLIC_IEX',JSON.stringify(result));
  assert.equal(response.headers.get('x-data-snapshot-at'),null);
  return;
 }
 assert.equal(response.status,200,'Unexpected public provisional status');
 assert.ok(activeSlot,'Outside approved NY session, public API must not provide provisional ratios');
 assert.equal(body?.market,'usa');
 assert.equal(body?.phase,'PROVISIONAL');
 assert.equal(body?.status,'PROVISIONAL');
 assert.equal(body?.source,'ALPACA_IEX_15MIN_SPLIT');
 assert.ok(['COMPLETE','INCOMPLETE_PAGINATION'].includes(body?.collectionStatus));
 const shares=['risingPct','unchangedPct','fallingPct','unobservedPct'].map(k=>body?.[k]);
 assert.ok(shares.every(percent),'Four shares must remain real 0-100 percentages');
 assert.ok(Math.abs(shares.reduce((sum,x)=>sum+x,0)-100)<0.2,
  'missing IEX issues must remain a visible unobserved share');
 assert.equal(body.observationDate,activeSlot.observationDate);
 const end=Date.parse(body.slotEndUtc),age=Date.now()-end;
 assert.ok(Number.isFinite(end)&&age>=0&&age<=30*60_000,'no fabricated stale or future live slot');
 assert.ok(typeof response.headers.get('x-data-snapshot-at')==='string');
 for(const forbidden of ['members','currentBars','referenceBars','counts','expectedCount','observedCount','missingCount']){
  assert.ok(!(forbidden in body),'No private raw/constituent data on public GET: '+forbidden);
 }
 console.log('W06_38_REAL_PUBLIC_IEX',JSON.stringify({
  httpStatus:response.status,reason:null,nyCashSessionSlot:activeSlot.slotKey,
  provisionalPresented:true,observationDate:body.observationDate,slotEndUtc:body.slotEndUtc,
  source:body.source,collectionStatus:body.collectionStatus,percentages:{
   rising:shares[0],unchanged:shares[1],falling:shares[2],unobserved:shares[3]
  },publicSnapshotHeader:response.headers.get('x-data-snapshot-at')
 }));
});
