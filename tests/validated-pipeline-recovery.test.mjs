import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';
import {marketOperationalStore,readStoredMarketInputs,storedMarketResponse} from '../worker/market-operational-store.mjs';
import {marketOperationalStore as selectedStore} from '../worker/candidate-market-operational-store.mjs';
import {VALIDATED_INPUT_KEYS} from '../worker/market-input-validation.mjs';
import {BIS_DEBT_SELECTORS} from '../lib/diagnostic-layer/bis-debt-components.mjs';
import {RATE_R2_PROVIDER_CONTRACT} from '../lib/market-score/rate-r2-provider.mjs';
import {fullMacro,fullMarket} from './helpers/validated-market-fixtures.mjs';
import {attemptOutput} from '../scripts/pc-writer/independent-publication.mjs';
import {PUBLIC_DISPLAY_MAX_AGE_MS} from '../worker/public-display-freshness.mjs';
import {collectionDisposition} from '../worker/collection-result-contract.mjs';
const at=Date.parse('2026-10-24T12:00:00Z');
const row={observationDate:'2026-10-23',value:0};
const valid={macro:fullMacro('2026-10-23'),credit:{external:{dvpRepoRows:[row],triPartyRepoRows:[row],cmdiRows:[{observationDate:'2026-09-25',market:0,ig:0,hy:0}]}},supply:{external:{gscpiRows:[row],copperRows:[row]}},fundFlows:{external:{registeredFundFlowRows:[row]}},rates:{rateR2:{status:'READY',series:Object.fromEntries(RATE_R2_PROVIDER_CONTRACT.requiredSeries.map(id=>[id,[row]]))}}};
for(const [key,selector] of Object.entries({bisDsr:BIS_DEBT_SELECTORS.dsr,bisTc:BIS_DEBT_SELECTORS.debtGdp}))valid[key]={external:{[key==='bisDsr'?'bisDsrParsed':'bisDebtGdpParsed']:{series:[{metadata:selector,rows:Array.from({length:24},(_,i)=>({observationDate:`${2000+i}-01-01`,value:i}))}]}}};
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'validated-pipeline-')),db=localDatabase(path.join(dir,'core.sqlite'));t.after(()=>{db.close();fs.rmSync(dir,{recursive:true,force:true});});return {db,store:marketOperationalStore(db)};}
test('all seven batch boundaries reject empty and partial replacement before changing either values or clocks',async t=>{
 for(const key of VALIDATED_INPUT_KEYS){
  const {db,store}=fixture(t);await store.writeInput(key,valid[key],at);
  for(const bad of [{},{series:{}},{external:{}},{rateR2:{status:'READY',series:{}}}])await assert.rejects(store.writeInput(key,bad,at+1000),/INPUT_NOT_VALID/);
  assert.deepEqual((await store.readInput(key)).body,valid[key]);assert.equal((await store.readInput(key)).storedAt,at);
  // Historic invalid rows created before this fix cannot mask a good batch.
  await db.prepare('INSERT INTO market_input_batches_v1 VALUES(?,?,?)').bind(key+':2026-10-25',JSON.stringify({}),at+86400000).run();
  assert.equal((await store.readInput(key)).storedAt,at);assert.equal((await selectedStore(db).readInput(key)).storedAt,at);
 }
});
test('empty acquisition, repeated failures, expiry and recovery preserve public value and timestamp',async t=>{
 const {store}=fixture(t),body=fullMarket(0,'2026-10-24');await store.writeInput('credit',valid.credit,at);await store.writeScore(body,at);
 for(let i=1;i<=3;i++){
  await assert.rejects(store.writeInput('credit',{external:{}},at+i*1000));
  await assert.rejects(store.writeScore({...body,overall:{status:'PARTIAL',score:null,trend:[]}},at+i*1000));
  const saved=await store.readScore();assert.deepEqual(saved.body,body);assert.equal(saved.storedAt,at);
 }
 assert.deepEqual((await readStoredMarketInputs(store,at+36*3600000)).external,{});
 const expired=await storedMarketResponse(new Request('https://zgmini.kr/api/market-score'),{store,now:at+PUBLIC_DISPLAY_MAX_AGE_MS});assert.equal(expired.status,503);assert.equal((await expired.json()).overall.score,null);
 await store.writeInput('credit',valid.credit,at+3600000);await store.writeScore(fullMarket(1,'2026-10-24'),at+3600000);
 assert.equal((await store.readScore()).body.overall.score,1);assert.equal((await store.readInput('credit')).storedAt,at+3600000);
});
test('failed multi-row score commit rolls back day/current/liquidity together',async t=>{
 const {db,store}=fixture(t);await store.writeScore(fullMarket(0,'2026-10-24'),at);
 await db.exec("CREATE TRIGGER fail_current BEFORE INSERT ON market_public_snapshots_v1 WHEN NEW.snapshot_key='current' BEGIN SELECT RAISE(ABORT,'fixture storage failure'); END;");
 await assert.rejects(store.writeScore(fullMarket(1,'2026-10-25'),at+86400000));
 assert.equal((await store.readScore()).storedAt,at);assert.equal((await store.readScore()).body.overall.score,0);
 assert.equal(await db.prepare("SELECT snapshot_key FROM market_public_snapshots_v1 WHERE snapshot_key='2026-10-25'").first(),null);
 assert.equal(await db.prepare("SELECT as_of_date FROM market_liquidity_active_history_v1 WHERE as_of_date='2026-10-25'").first(),null);
});
test('market failure does not veto an independently validated output or become overall success',async()=>{
 const report={},published=[];
 assert.equal(await attemptOutput(report,'market',async()=>{throw Error('MARKET_REQUIRED_SCORE_MISSING');}),false);
 assert.equal(await attemptOutput(report,'korea',async()=>{published.push('validated-korea');}),true);
 assert.deepEqual(published,['validated-korea']);assert.deepEqual(report.failures,[{id:'market',reason:'MARKET_REQUIRED_SCORE_MISSING'}]);
});
test('partial, skipped and unknown collectors are never promoted to complete',()=>{
 for(const status of ['PARTIAL','NOT_READY','PENDING','PARTIAL_PIT_STORE','SKIPPED_FRED_KEY_MISSING','SKIPPED_RETRY_THROTTLE','MYSTERY'])assert.notEqual(collectionDisposition('inflation',status),'COMPLETE');
 assert.equal(collectionDisposition('growth','STORED'),'COMPLETE');
});
