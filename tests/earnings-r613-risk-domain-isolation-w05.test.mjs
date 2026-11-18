// W05 R6-13: exercise real projections with independent R4/R5/C fixtures.
// No network, operational PC, SQLite/D1 write, scheduler or deployment.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {verifiedEarningsRiskTrend,EARNINGS_RISK_HISTORY_KIND}
  from '../lib/market-score/earnings-recession-history-r1.mjs';
import {selectStoredEarningsProjection,PROJECTION_INPUT_BATCHES}
  from '../worker/projection-source-r52.mjs';
import {earningsCompanionFreshness,EARNINGS_C_FRESHNESS}
  from '../worker/earnings-companion-c-r4.mjs';
import {buildEarningsCostIndicatorView,KNOWN_EARNINGS_COST_INDICATORS}
  from '../app/earnings-recession/earnings-cost-indicator-list.mjs';

function loadTs(path){
 const source=readFileSync(new URL(path,import.meta.url),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
 }}).outputText;
 const mod={exports:{}};
 new Function('exports',compiled)(mod.exports);
 return mod.exports;
}
const build=loadTs('../worker/projection-builders/earningsRecession.ts').buildProjection;
const economicIds=loadTs('../components/market-explorer-catalog.ts').ECONOMIC_CARDS.map(x=>x.id);
const ids=['epsGrowth','margin','revenueGrowth','earningsGrowthBreadth'];
const factorScores=[80,93.75,81.25,85],weights=[0.35,0.25,0.20,0.20];
const asOf='2026-10-20',periodEnd='2026-06-30';
const history=[
 {date:'2026-03-31',score:85.06617038875103},
 {date:periodEnd,score:84.6875},
];
const makeDiagnostic=()=>({
 status:'READY',score:84.6875,methodologyVersion:'EARNINGS_RECESSION_DIAGNOSTIC_R1',
 riskFactorsSource:'E1_R4_STORED_PC_REPLAY',
 riskFactors:ids.map((id,i)=>({id,status:'READY',score:factorScores[i],
  observationDate:periodEnd})),
 financialPeriodEnd:periodEnd,
});
const makeE1=()=>({
 methodologyVersion:'E1-R5',status:'READY',score:73.5,
 asOfDate:asOf,trend:[{label:asOf,value:73.5}],
 indicators:Array.from({length:13},(_,i)=>({id:'S'+(i+1),score:50+i,
  status:'READY',value:i+1})),
});
const makeFixture=()=>{
 const e1=makeE1(),diagnostic=makeDiagnostic();
 const domains=economicIds.map((id,i)=>id==='earnings'
  ?{id,methodologyVersion:'E1-R5',status:'READY',score:e1.score,
    missingFactors:[],indicators:e1.indicators,
    trend:e1.trend}
  :{id,methodologyVersion:'ECONOMIC_DOMAIN',status:'READY',score:i*8,
    trend:[{label:asOf,value:i*8}]});
 const snapshot={body:{asOfDate:asOf,
  diagnostics8:{earningsRecessionDefense:diagnostic},
  domains}};
 return {snapshot,e1,nowIso:'2026-10-20T02:30:00.000Z',
  riskHistory:{kind:'E1_R4_STORED_PERIOD_CURRENT_VINTAGE_NOT_PIT',
   financialPeriodEnd:periodEnd,historyMode:'CURRENT_VINTAGE_NOT_PIT',points:history}};
};
const riskIdentity=x=>({
 status:x.status,score:x.score,methodologyVersion:x.methodologyVersion,
 riskFactorsMethodologyVersion:x.riskFactorsMethodologyVersion,
 riskFactorsSource:x.riskFactorsSource,riskFactors:x.riskFactors,
 riskTrend:x.riskTrend,riskHistoryKind:x.riskHistoryKind,
 riskFinancialPeriodEnd:x.riskFinancialPeriodEnd,riskHistoryMode:x.riskHistoryMode,
});

test('R6-13 exact four-factor weights and stored fiscal risk history remain E1-R4',()=>{
 assert.equal(economicIds.length,12);
 assert.deepEqual([...new Set(economicIds)].sort(),[...economicIds].sort());
 assert.ok(economicIds.includes('earnings'));
 assert.equal(factorScores.reduce((sum,score,i)=>sum+score*weights[i],0),84.6875);
 const value=build(makeFixture());
 assert.equal(value.score,84.6875);
 assert.equal(value.methodologyVersion,'EARNINGS_RECESSION_DIAGNOSTIC_R1');
 assert.equal(value.riskFactorsMethodologyVersion,value.methodologyVersion);
 assert.equal(value.riskFactorsSource,'E1_R4_STORED_PC_REPLAY');
 assert.deepEqual(value.riskFactors.map(x=>x.id),ids);
 assert.deepEqual(value.riskFactors.map(x=>x.score),factorScores);
 assert.deepEqual(value.riskTrend,history);
 assert.equal(value.riskTrend.at(-1).score,value.score);
 assert.equal(value.riskFinancialPeriodEnd,periodEnd);
 assert.equal(value.riskHistoryMode,'CURRENT_VINTAGE_NOT_PIT');
 assert.equal(value.asOfDate,asOf);
 assert.equal(value.storedE1.score,73.5);
 assert.equal(value.storedE1.methodologyVersion,'E1-R5');
 assert.equal(value.storedE1.indicators.length,13);
});

test('R6-13 mutating each of twelve economic domains and thirteen E1-R5 factors cannot alter risk four score/history',()=>{
 const base=makeFixture(),original=build(base),before=structuredClone(base.snapshot.body.domains);
 const changed=structuredClone(base);
 changed.snapshot.body.domains.forEach((domain,i)=>{
  domain.score=100-i;
  domain.trend=[{label:'2026-10-19',value:100-i}];
  if(domain.id==='earnings')domain.indicators.forEach((x,j)=>{x.value=9000+j;x.score=j;});
 });
 changed.e1.score=12.5;
 changed.e1.trend=[{label:asOf,value:12.5}];
 changed.e1.indicators.forEach((x,j)=>{x.value=9000+j;x.score=j;});
 const next=build(changed);
 assert.deepEqual(riskIdentity(next),riskIdentity(original));
 assert.equal(next.storedE1.score,12.5);
 assert.notDeepEqual(next.storedE1.indicators,original.storedE1.indicators);
 assert.deepEqual(base.snapshot.body.domains,before,'build does not mutate the twelve domain sources');
 assert.deepEqual(changed.snapshot.body.domains.map(d=>d.id),economicIds);
});

test('R6-13 published four-factor mismatch fails detail closed without replacing headline or using E1 score',()=>{
 const baseline=build(makeFixture());
 for(let i=0;i<4;i++){
  const altered=makeFixture();
  altered.snapshot.body.diagnostics8.earningsRecessionDefense.riskFactors[i].score+=0.5;
  const out=build(altered);
  assert.equal(out.score,baseline.score,'stored headline is not recalculated');
  assert.equal(out.riskFactors.length,0,'mismatched factors cannot be shown as verified');
  assert.equal(out.riskFactorsMethodologyVersion,null);
  assert.equal(out.riskFactorsSource,null);
  assert.equal(out.storedE1.score,73.5);
 }
 const wrongMethod=makeFixture();
 wrongMethod.snapshot.body.diagnostics8.earningsRecessionDefense.methodologyVersion='E1-R5';
 assert.deepEqual(build(wrongMethod).riskFactors,[]);
 assert.equal(build(wrongMethod).score,84.6875);
});

test('R6-13 foreign or unverified history cannot become the eight-risk chart',()=>{
 const baseline=makeFixture();
 const foreign=structuredClone(baseline);
 foreign.riskHistory.kind='E1-R5';
 assert.deepEqual(build(foreign).riskTrend,[]);
 const tampered=structuredClone(baseline);
 tampered.riskHistory.points[1].score=73.5;
 assert.deepEqual(build(tampered).riskTrend,[]);
 const noSource=structuredClone(baseline);
 noSource.riskHistory=null;
 assert.deepEqual(build(noSource).riskTrend,[]);
 const current={asOfDate:asOf,score:84.6875,methodologyVersion:'EARNINGS_RECESSION_DIAGNOSTIC_R1'};
 const dated=[{snapshotKey:'2026-10-19',body:{asOfDate:'2026-10-19',
  diagnostics8:{earningsRecessionDefense:{status:'READY',score:74,
   methodologyVersion:'EARNINGS_RECESSION_DIAGNOSTIC_R1'}}}},
  {snapshotKey:asOf,body:{asOfDate:asOf,
   diagnostics8:{earningsRecessionDefense:{status:'READY',score:84.6875,
    methodologyVersion:'EARNINGS_RECESSION_DIAGNOSTIC_R1'}}}}];
 const verified=verifiedEarningsRiskTrend({snapshots:dated,current});
 assert.equal(verified.kind,EARNINGS_RISK_HISTORY_KIND);
 assert.deepEqual(verified.points.map(p=>p.score),[74,84.6875]);
 assert.deepEqual(verifiedEarningsRiskTrend({snapshots:dated,current:{...current,
  methodologyVersion:'E1-R5'}}).points,[]);
});

test('R6-13 twelve-domain selection and C freshness remain independent of risk score',()=>{
 const base=makeFixture(),risk=build(base);
 const economic=selectStoredEarningsProjection(base.snapshot);
 assert.equal(economic.status,'READY');
 assert.equal(economic.methodologyVersion,'E1-R5');
 assert.equal(economic.indicators.length,13);
 assert.deepEqual(base.snapshot.body.domains.map(x=>x.id),economicIds);
 assert.deepEqual(PROJECTION_INPUT_BATCHES.earningsRecession,[]);
 const invalid=structuredClone(base.snapshot);
 invalid.body.domains.find(x=>x.id==='earnings').indicators.pop();
 assert.equal(selectStoredEarningsProjection(invalid),null);
 assert.equal(build({...base,snapshot:invalid}).score,risk.score);
 const now=Date.parse('2026-11-18T00:00:00.000Z');
 const bls={frequency:'MONTHLY',observationPeriod:'2026-07',
  retrievedAt:'2026-07-31T12:00:00.000Z'};
 assert.equal(EARNINGS_C_FRESHNESS.MONTHLY.observationMaxAgeDays,75);
 assert.equal(earningsCompanionFreshness(bls,{now}).status,'STALE');
 const cost=buildEarningsCostIndicatorView({
  schemaVersion:'earnings-companion-c-r4-v1',historicalMode:'CURRENT_RETRIEVAL_NOT_PIT',
  rows:[],
 });
 assert.equal(cost.valid,true);
 assert.equal(cost.indicators.length,KNOWN_EARNINGS_COST_INDICATORS.length);
 assert.equal(cost.rows.length,0);
 assert.deepEqual(riskIdentity(build(base)),riskIdentity(risk));
});
