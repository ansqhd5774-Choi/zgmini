import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {verifiedEarningsRiskTrend,EARNINGS_RISK_HISTORY_KIND} from "../lib/market-score/earnings-recession-history-r1.mjs";

const source=readFileSync("worker/projection-builders/earningsRecession.ts","utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const m={exports:{}};new Function("exports",compiled)(m.exports);
const build=m.exports.buildProjection;
const ids=["epsGrowth","margin","revenueGrowth","earningsGrowthBreadth"];
const factors=[80,93.75,81.25,85].map((score,i)=>({id:ids[i],status:"READY",score,observationDate:null}));
const date="2026-10-20";
const base={
 snapshot:{body:{asOfDate:date,diagnostics8:{earningsRecessionDefense:{
  status:"READY",score:84.6875,methodologyVersion:"EARNINGS_RECESSION_DIAGNOSTIC_R1",
  riskFactorsSource:"E1_R4_LEGACY_COMPATIBILITY",riskFactors:factors,
 }},domains:[{id:"earnings",methodologyVersion:"E1-R5",score:73.5}]}},
 e1:{methodologyVersion:"E1-R5",status:"READY",score:73.5,trend:[{label:"2026-10-20",value:73.5}],
 indicators:Array.from({length:13},(_,i)=>({id:"S"+(i+1),score:50,status:"READY",value:i+1}))},
 nowIso:"2026-10-20T02:30:00.000Z",
};
test("risk projection uses dedicated four component scores and never replaces them with 13 E1-R5 factors",()=>{
 const r=build(base);
 assert.equal(r.score,84.6875);
 assert.equal(r.methodologyVersion,"EARNINGS_RECESSION_DIAGNOSTIC_R1");
 assert.equal(r.riskFactorsMethodologyVersion,r.methodologyVersion);
 assert.deepEqual(r.riskFactors.map(x=>x.id),ids);
 assert.deepEqual(r.riskFactors.map(x=>x.score),[80,93.75,81.25,85]);
 assert.ok(r.riskFactors.every(x=>x.observationDate===null));
 assert.equal(r.riskFactorsSource,"E1_R4_LEGACY_COMPATIBILITY");
 assert.equal(r.storedE1.score,73.5,"retain prior 12-domain compatibility payload until explicit contract cutover");
 assert.equal(r.storedE1.indicators.length,13);
 assert.ok(r.storedE1.indicators.every(x=>x.id.startsWith("S")));
 assert.equal(r.riskTrend.length,0,"unverified historic records cannot be drawn");
});
test("only version-qualified dated diagnostic history can be rendered, and its latest score equals risk hero",()=>{
 const snapshots=[
  {snapshotKey:"2026-10-18",body:{asOfDate:"2026-10-18",diagnostics8:{earningsRecessionDefense:{status:"READY",score:74,methodologyVersion:"EARNINGS_RECESSION_DIAGNOSTIC_R1"}}}},
  {snapshotKey:date,body:{asOfDate:date,diagnostics8:{earningsRecessionDefense:{status:"READY",score:84.6875,methodologyVersion:"EARNINGS_RECESSION_DIAGNOSTIC_R1"}}}},
 ];
 const verified=verifiedEarningsRiskTrend({snapshots,current:{asOfDate:date,score:84.6875,methodologyVersion:"EARNINGS_RECESSION_DIAGNOSTIC_R1"}});
 assert.equal(verified.kind,EARNINGS_RISK_HISTORY_KIND);
 const out=build({...base,riskHistory:verified});
 assert.deepEqual(out.riskTrend,[{date:"2026-10-18",score:74},{date,score:84.6875}]);
 assert.equal(out.riskHistoryKind,EARNINGS_RISK_HISTORY_KIND);
 assert.equal(out.riskTrend.at(-1).score,out.score);
 const old=build({...base,riskHistory:{kind:"UNVERIFIED",points:verified.points}});
 assert.deepEqual(old.riskTrend,[]);
});
test("source-tampered factor or nonmatching method does not become current risk detail; no fake history",()=>{
 const corrupted=structuredClone(base);
 corrupted.snapshot.body.diagnostics8.earningsRecessionDefense.riskFactors[1].score=NaN;
 assert.deepEqual(build(corrupted).riskFactors,[]);
 const mismatch=structuredClone(base);
 mismatch.snapshot.body.diagnostics8.earningsRecessionDefense.methodologyVersion="E1-R5";
 assert.deepEqual(build(mismatch).riskFactors,[]);
 assert.equal(build(mismatch).score,84.6875,"score calculations remain unchanged");
});
test("active 8-risk page, beginner guide and source reader are independently wired; economic domain remains E1-R5",()=>{
 const page=readFileSync("app/earnings-recession/page.tsx","utf8");
 const panel=readFileSync("app/earnings-recession/earnings-risk-only-panel.tsx","utf8");
 const guide=readFileSync("app/beginner-risk-guide.tsx","utf8");
 const source=readFileSync("worker/projection-source-r52.mjs","utf8");
 const composer=readFileSync("worker/market-score-r1.mjs","utf8");
 const economic=readFileSync("app/economic-indicators/earnings/page.tsx","utf8");
 assert.match(page,/EarningsRiskOnlyPanel/);
 assert.doesNotMatch(page,/EarningsRecessionPanel|earnings-recession-panel/);
 assert.match(panel,/riskFactorsMethodologyVersion===payload\?\.methodologyVersion/);
 assert.doesNotMatch(panel,/storedE1|E1-R5|S1.*S13/);
 assert.match(guide,/payload\?\.riskFactors/);
 assert.doesNotMatch(guide,/payload\?\.storedE1/);
 assert.match(source,/verifiedEarningsRiskTrend/);
 assert.match(source,/SELECT snapshot_key,body FROM market_public_snapshots_v1/);
 assert.match(composer,/risk\.riskFactorsSource=validEvidence\?"E1_R4_STORED_PC_REPLAY":"E1_R4_LEGACY_COMPATIBILITY"/);
 assert.match(economic,/EconomicDetailPage id="earnings"/);
});

test("actual R3 FIX1 aggregate replay keeps fiscal observation distinct from October evaluation date and E1-R5",()=>{
 // Aggregate only from PC R3 FIX1 READONLY_COMPLETE, not a live deployed API assertion.
 const nowFrame="2026-06-30";
 const replay=structuredClone(base);
 replay.snapshot.body.diagnostics8.earningsRecessionDefense.riskFactorsSource="E1_R4_STORED_PC_REPLAY";
 replay.snapshot.body.diagnostics8.earningsRecessionDefense.financialPeriodEnd=nowFrame;
 replay.snapshot.body.diagnostics8.earningsRecessionDefense.riskFactors.forEach(x=>{x.observationDate=nowFrame});
 const history={
  kind:"E1_R4_STORED_PERIOD_CURRENT_VINTAGE_NOT_PIT",
  financialPeriodEnd:nowFrame,
  historyMode:"CURRENT_VINTAGE_NOT_PIT",
  points:[{date:"2026-03-31",score:85.06617038875103},{date:nowFrame,score:84.6875}],
 };
 const result=build({...replay,riskHistory:history});
 assert.equal(result.status,"READY");
 assert.equal(result.score,84.6875);
 assert.equal(result.asOfDate,"2026-10-20");
 assert.equal(result.riskFinancialPeriodEnd,nowFrame);
 assert.equal(result.riskHistoryMode,"CURRENT_VINTAGE_NOT_PIT");
 assert.equal(result.riskHistoryKind,history.kind);
 assert.equal(result.riskFactorsSource,"E1_R4_STORED_PC_REPLAY");
 assert.deepEqual(result.riskFactors.map(x=>x.score),[80,93.75,81.25,85]);
 assert.deepEqual(result.riskFactors.map(x=>x.observationDate),[nowFrame,nowFrame,nowFrame,nowFrame]);
 assert.deepEqual(result.riskTrend,history.points);
 assert.ok(result.riskTrend.every(x=>x.date!=="2025-12-31"),"coverage-failed quarter remains missing");
 assert.ok(result.riskTrend.every(x=>x.date!==result.asOfDate),"never fake an October fiscal observation");
 assert.equal(result.riskTrend.at(-1).score,result.score);
 assert.equal(result.storedE1.score,73.5,"E1-R5 domain history remains independent");
 const corrupted=structuredClone(replay);
 corrupted.snapshot.body.diagnostics8.earningsRecessionDefense.riskFactors[1].score=75;
 assert.deepEqual(build({...base,snapshot:corrupted.snapshot,riskHistory:history}).riskFactors,[],
  "mismatched component weights must not leak as legitimate 4-factor values");
});
