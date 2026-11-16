import test from 'node:test';
import assert from 'node:assert/strict';
import {DIAGNOSTIC_FRED_SERIES} from '../lib/diagnostic-layer/input-registry.mjs';
import {macroCollectionReadiness,mergeSuccessfulMacroCredit} from '../worker/macro-result-contract-r61.mjs';
import {readStoredMarketInputs,mergeStoredMacro} from '../worker/candidate-market-operational-store.mjs';
import {buildCompositeMarketScore,DOMAIN_WEIGHTS} from '../lib/market-score/composite-model-r1.mjs';

// Synthetic observations only: never copy private PC records into fixtures.
const now=Date.parse('2026-11-16T13:00:00.000Z');
const hour=60*60*1000;
const ten=Object.freeze(['PAYEMS','UNRATE','GDPC1','INDPRO','RRSFS',
 'PCEPILFE','M2SL','DGS2','DGS10','NFCICREDIT']);
const row=(date,value)=>[{observationDate:date,value}];
const original=()=>Object.fromEntries(ten.map((id,i)=>[id,row('2026-10-01',i+1)]));
const previous=(age=hour)=>({
 body:{series:original(),seriesStoredAt:Object.fromEntries(ten.map(id=>[id,now-age])),external:{preserve:true}},
 storedAt:now-age,
});
const credit=(date='2026-11-12',value=42)=>({
 status:'READY_CURRENT_VINTAGE',series:{NFCICREDIT:row(date,value)},
});
const read=async(batch,at=now)=>readStoredMarketInputs({
 readInput:async key=>key==='macro'?{body:batch,storedAt:now}:null,
},at);

test('R4: one changed approved observation reuses the other nine stored valid series',async()=>{
 const prior=previous();
 const merged=mergeSuccessfulMacroCredit(prior,credit(),now);
 const actual=await read(merged);
 assert.deepEqual(Object.keys(actual.series).sort(),[...ten].sort());
 for(const id of ten.filter(id=>id!=='NFCICREDIT')){
  assert.deepEqual(actual.series[id],prior.body.series[id],id);
  assert.equal(merged.seriesStoredAt[id],prior.storedAt,id);
 }
 assert.deepEqual(actual.series.NFCICREDIT,row('2026-11-12',42));
 assert.equal(merged.seriesStoredAt.NFCICREDIT,now);
 assert.deepEqual(merged.external,prior.body.external);
});

test('R4: the next changed input retains the first update instead of reverting it',async()=>{
 const first=mergeSuccessfulMacroCredit(previous(),credit('2026-11-12',42),now);
 const second=mergeSuccessfulMacroCredit({body:first,storedAt:now},credit('2026-11-13',45),now+1000);
 assert.deepEqual(second.series.NFCICREDIT,row('2026-11-13',45));
 for(const id of ten.filter(id=>id!=='NFCICREDIT'))
  assert.deepEqual(second.series[id],original()[id]);
 assert.equal(second.seriesStoredAt.NFCICREDIT,now+1000);
});

test('R4: an official same-date correction is not mistaken for an unchanged value',async()=>{
 const first=mergeSuccessfulMacroCredit(previous(),credit('2026-11-12',42),now);
 const corrected=mergeSuccessfulMacroCredit({body:first,storedAt:now},credit('2026-11-12',43),now+1000);
 assert.equal((await read(corrected,now+1000)).series.NFCICREDIT[0].value,43);
 assert.equal(corrected.seriesStoredAt.PAYEMS,now-hour);
});

test('R4: a legitimate zero observation remains zero',async()=>{
 const actual=await read(mergeSuccessfulMacroCredit(previous(),credit('2026-11-12',0),now));
 assert.equal(actual.series.NFCICREDIT[0].value,0);
});

test('R4: expired former values are not silently refreshed by the new input timestamp',async()=>{
 const stale=mergeSuccessfulMacroCredit(previous(37*hour),credit(),now);
 const actual=await read(stale);
 assert.equal(Object.hasOwn(actual.series,'PAYEMS'),false);
 assert.equal(Object.hasOwn(actual.series,'UNRATE'),false);
 assert.deepEqual(actual.series.NFCICREDIT,row('2026-11-12',42));
});

test('R4: malformed/failed credit-only collection retains last good and does not claim readiness',()=>{
 for(const invalid of [{...credit(),status:'ERROR'},{...credit(),status:'PARTIAL'}])
  assert.throws(()=>mergeSuccessfulMacroCredit(previous(),invalid,now),/MACRO_CREDIT_NOT_READY/);
});

test('R4: full macro collection still requires every registered series before replacing last-good',()=>{
 const full=Object.fromEntries(Object.keys(DIAGNOSTIC_FRED_SERIES).map(id=>[id,row('2026-10-01',0)]));
 const before={series:full,providerSummary:{fred:{failed:[]}}};
 const after={...before,series:{...full,NFCICREDIT:row('2026-11-12',42)}};
 assert.equal(macroCollectionReadiness(after).complete,true);
 for(const id of Object.keys(full).filter(id=>id!=='NFCICREDIT'))
  assert.deepEqual(after.series[id],before.series[id]);
 const partial={...after,series:{...after.series}};delete partial.series.PAYEMS;
 assert.equal(macroCollectionReadiness(partial).complete,false);
 assert.equal(macroCollectionReadiness({...after,providerSummary:{fred:{failed:[{seriesId:'PAYEMS',status:'HTTP_ERROR'}]}}}).complete,false);
});

test('R4: one READY domain input changes actual composite result without reweighting other domains',()=>{
 const base=DOMAIN_WEIGHTS.map(d=>({id:d.id,status:'READY',score:50,trend:[]}));
 const before=buildCompositeMarketScore(base,{updatedAt:'2026-11-16T13:00:00Z'});
 const changed=base.map(d=>d.id==='employment'?{...d,score:60}:d);
 const after=buildCompositeMarketScore(changed,{updatedAt:'2026-11-16T13:05:00Z'});
 assert.equal(before.overall.score,50);
 assert.ok(Math.abs(after.overall.score-50.7)<1e-9);
 assert.equal(after.dataQuality.readyDomains,12);
 assert.equal(after.dataQuality.reweighted,false);
 assert.deepEqual(after.domains.filter(d=>d.id!=='employment').map(d=>d.score),Array(11).fill(50));
 assert.equal(DOMAIN_WEIGHTS.reduce((a,d)=>a+d.weight,0),100);
});

test('R4: missing mandatory domain remains PARTIAL, not fabricated using an unrelated score',()=>{
 const base=DOMAIN_WEIGHTS.map(d=>({id:d.id,status:'READY',score:50}));
 const incomplete=buildCompositeMarketScore(base.map(d=>d.id==='employment'?{...d,status:'PARTIAL',score:null}:d));
 assert.equal(incomplete.overall.status,'PARTIAL');
 assert.equal(incomplete.overall.score,null);
 assert.equal(incomplete.dataQuality.reweighted,false);
});
