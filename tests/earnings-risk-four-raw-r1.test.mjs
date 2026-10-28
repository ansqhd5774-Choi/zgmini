import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {validateRiskFourRaw,RISK_R4_RAW_ROUTE,RISK_R4_RAW_KEY,riskFourRawWriter,
  riskFourRawFreshness,readRiskFourRawResponse}
  from '../worker/earnings-risk-four-raw-r1.mjs';
import {buildRiskFourRawPayload} from '../lib/market-score/earnings-risk-four-raw-source-r1.mjs';

const storedAt=Date.parse('2026-10-27T14:00:00Z');
const now=Date.parse('2026-10-28T00:00:00Z');
const evidence={
 status:'READY',methodologyVersion:'E1-R4',historyMode:'CURRENT_VINTAGE_NOT_PIT',
 financialPeriodEnd:'2026-06-30',sourceStoredAt:new Date(storedAt).toISOString(),
 score:84.6875,
 factors:[{id:'epsGrowth',score:80},{id:'margin',score:93.75},
   {id:'revenueGrowth',score:81.25},{id:'earningsGrowthBreadth',score:85}],
 rawFactors:[{id:'epsGrowth',value:12.5,previousValue:10.1},
   {id:'margin',value:18.1,previousValue:17.8},
   {id:'revenueGrowth',value:7.5,previousValue:7.0},
   {id:'earningsGrowthBreadth',value:65.3,previousValue:63.2}],
 rawHistory:[{periodEnd:'2026-03-31',
   values:{epsGrowth:10.1,margin:17.8,revenueGrowth:7.0,earningsGrowthBreadth:63.2}},
  {periodEnd:'2026-06-30',
   values:{epsGrowth:12.5,margin:18.1,revenueGrowth:7.5,earningsGrowthBreadth:65.3}}],
};
const payload=()=>buildRiskFourRawPayload(evidence,{now});
function dbFixture(){
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE market_public_snapshots_v1 (snapshot_key TEXT PRIMARY KEY,body TEXT NOT NULL,stored_at INTEGER NOT NULL)');
 const adapter={prepare(sql){return {bind(...args){return {
  first:async()=>db.prepare(sql).get(...args)??null,
  run:async()=>({meta:{changes:Number(db.prepare(sql).run(...args).changes)}}),
 };}};}};
 return {db,adapter};
}

test('stored four-factor aggregate has raw percentages distinct from percentile scores',()=>{
 const p=validateRiskFourRaw(payload(),{now});
 assert.equal(p.source,'PC_STORED_SEC_EDGAR_E1_R4');
 assert.equal(p.diagnosticScore,84.6875);
 assert.equal(p.factors[0].value,12.5);
 assert.equal(p.factors[0].previousValue,10.1);
 assert.equal(p.factors[0].unit,'PERCENT');
 assert.deepEqual(riskFourRawFreshness(p,{now}),{status:'FRESH',reason:null});
});
test('tamper, invented previous value, and stale source are rejected',()=>{
 const bad=payload();bad.factors[0].previousValue=99;
 assert.throws(()=>validateRiskFourRaw(bad,{now}),/PREVIOUS_MISMATCH/);
 const wrong=payload();wrong.scoreFactors[0].score=0;
 assert.throws(()=>validateRiskFourRaw(wrong,{now}),/SCORE_PARITY_FAILED/);
 assert.equal(riskFourRawFreshness(payload(),{now:now+170*86_400_000}).status,'STALE');
});
test('D1 writer single-key exact readback and stored-only GET',async()=>{
 const {db,adapter}=dbFixture();
 try{
  const url='https://zgmini.kr'+RISK_R4_RAW_ROUTE;
  const miss=await readRiskFourRawResponse(new Request(url),adapter,{now});
  assert.equal(miss.status,503);
  assert.equal((await miss.json()).reason,'STORED_PROJECTION_PENDING');
  const writer=riskFourRawWriter(adapter);
  assert.equal((await writer.write(payload(),{storedAt:now+1000})).status,'READBACK_VERIFIED');
  const result=await readRiskFourRawResponse(new Request(url),adapter,{now:now+2000});
  assert.equal(result.status,200);
  assert.equal((await result.json()).factors[0].value,12.5);
  assert.equal((await writer.write(payload(),{storedAt:now+3000})).status,'ALREADY_STORED');
  const only= db.prepare('SELECT snapshot_key FROM market_public_snapshots_v1').all();
  assert.equal(only.length,1);
  assert.equal(only[0].snapshot_key,RISK_R4_RAW_KEY);
  assert.equal((await readRiskFourRawResponse(new Request(url,{method:'POST'}),adapter)).status,405);
  assert.equal((await readRiskFourRawResponse(new Request(url+'?x=1'),adapter)).status,400);
 }finally{db.close();}
});
