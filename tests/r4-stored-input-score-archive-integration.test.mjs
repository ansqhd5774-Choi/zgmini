import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';
import {marketOperationalStore,readStoredMarketInputs} from '../worker/market-operational-store.mjs';
import {runMarketOperationalRefresh} from '../worker/market-operational-refresh.mjs';
import {DIAGNOSTIC_FRED_SERIES} from '../lib/diagnostic-layer/input-registry.mjs';
import {DOMAIN_WEIGHTS,buildCompositeMarketScore} from '../lib/market-score/composite-model-r1.mjs';
import {appendCompositeObservedFromCurrent} from '../scripts/pc-writer/composite-observed-archive-r1.mjs';
import {fullMarket} from './helpers/validated-market-fixtures.mjs';

const at0=Date.parse('2026-11-16T12:00:00Z');
const at1=at0+16*60*1000;
const seriesIds=Object.keys(DIAGNOSTIC_FRED_SERIES);
const prevMacro=()=>({
 series:Object.fromEntries(seriesIds.map(id=>[id,[{observationDate:'2026-11-12',value:id==='NFCICREDIT'?50:1}]])),
 providerSummary:{fred:{failed:[]}},
});
function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'zg-r4-saved-calc-'));
 const db=localDatabase(join(dir,'core.sqlite'));
 t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});
 return {db,store:marketOperationalStore(db)};
}
test('R4: actual shared collector lane reads 1 new series and 9+ last-good series before a score/archive write',async t=>{
 const {db,store}=fixture(t);
 const before=prevMacro();
 await store.writeInput('macro',before,at0);
 await store.writeScore(fullMarket(50,'2026-11-16'),at0);
 assert.equal((await appendCompositeObservedFromCurrent(db,at0)).status,'LOCAL_STORED');
 let collectorCalls=0,calculatorCalls=0,networkCalls=0;
 const result=await runMarketOperationalRefresh({
  env:{DB:db},store,job:'macroCredit',now:at1,
  fetchImpl:async()=>{networkCalls++;throw Error('NO_NETWORK_ALLOWED');},
  collectors:{macroCredit:async()=>{collectorCalls++;return {
   status:'READY_CURRENT_VINTAGE',series:{NFCICREDIT:[{observationDate:'2026-11-16',value:60}]},
  };}},
  calculate:async(_env,s,time)=>{
   calculatorCalls++;
   // This is a TEST-ONLY adapter from a stored raw value to a scored CM-R1
   // domain. It is not the production credit scoring formula.
   const inputs=await readStoredMarketInputs(s,time);
   for(const id of seriesIds.filter(id=>id!=='NFCICREDIT'))
    assert.deepEqual(inputs.series[id],before.series[id],id);
   assert.equal(inputs.series.NFCICREDIT[0].value,60);
   const domains=DOMAIN_WEIGHTS.map(spec=>({
    id:spec.id,status:'READY',score:spec.id==='credit'?inputs.series.NFCICREDIT[0].value:50,
    trend:[{label:'2026-11-16',value:spec.id==='credit'?60:50}],
   }));
   const actual=buildCompositeMarketScore(domains,{updatedAt:new Date(time).toISOString()});
   assert.equal(actual.overall.status,'READY');
   assert.equal(actual.overall.score,51);
   await s.writeScore({status:'SUCCESS',asOfDate:'2026-11-16',...actual},time);
   return {readyDomains:12};
  },
 });
 assert.equal(result.status,'COMPLETE');
 assert.equal(result.job,'macroCredit');
 assert.equal(collectorCalls,1);
 assert.equal(calculatorCalls,1);
 assert.equal(networkCalls,0);
 const latest=await store.readScore();
 assert.equal(latest.storedAt,at1);
 assert.equal(latest.body.overall.score,51);
 const input=await store.readInput('macro');
 assert.equal(input.storedAt,at1);
 assert.equal(input.body.seriesStoredAt.PAYEMS,at0);
 assert.equal(input.body.seriesStoredAt.NFCICREDIT,at1);
 const archive=await appendCompositeObservedFromCurrent(db,at1);
 assert.equal(archive.status,'LOCAL_STORED');
 assert.equal(archive.points,2);
 const row=await db.prepare("SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key='composite-observed:2026-11-16'").first();
 const points=JSON.parse(row.body).points;
 assert.deepEqual(points.map(p=>p.score),[50,51]);
 assert.deepEqual(points.map(p=>p.calculatedAt),[new Date(at0).toISOString(),new Date(at1).toISOString()]);
});
