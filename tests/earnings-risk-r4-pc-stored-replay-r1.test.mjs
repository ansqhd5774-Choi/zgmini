import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {readStoredEarningsRiskFourFactor,RISK_R4_PERIOD_RECONSTRUCTION} from "../lib/market-score/earnings-recession-stored-r4-pc-r1.mjs";
import {buildEarningsE1R4} from "../lib/market-score/earnings-e1-r4.mjs";

const issuerIds=Array.from({length:500},(_,i)=>String(i+1).padStart(10,"0"));
const periods=["2025-06-30","2025-09-30","2025-12-31","2026-03-31","2026-06-30"];
const validRows=period=>issuerIds.flatMap((cik,i)=>[
 {cik,metric:"epsGrowth",value:0.06+(period==="2026-06-30"?0.01:0)+(i%5)*0.003},
 {cik,metric:"revenueGrowth",value:0.04+(period==="2026-03-31"?0.005:0)+(i%5)*0.002},
 {cik,metric:"operatingMargin",value:0.12+(i%5)*0.002},
]);
function mockDb(){
 let writes=0;
 const prepare=sql=>{
  if(/\b(CREATE|INSERT|UPDATE|DELETE|DROP|ALTER)\b/i.test(sql)) { writes++;throw Error("NO_WRITES"); }
  return {
   bind(...args){
    return {
     async all(){
      if(sql.includes("FROM market_score_earnings_e1_r3_universe_v1 u"))return {results:periods.map(p=>({period_end:p,retrieved_at:"2026-10-02T00:00:00Z",security_count:500,issuer_count:500,completed_at:"2026-10-02T00:00:00Z"})).reverse()};
      if(sql.includes("FROM market_score_earnings_e1_r3_current_v1"))return {results:validRows(args[0]).filter((_,i)=>args[0]!=="2025-12-31"||i%5===0).map(row=>({...row,period_end:args[0]}))};
      throw Error("UNKNOWN_ALL_QUERY");
     },
     async first(){
      if(sql.includes("FROM market_score_earnings_e1_r3_universe_v1 WHERE period_end="))return {
       body_json:JSON.stringify({members:issuerIds.map(cik=>({cik}))}),
       security_count:500,issuer_count:500,retrieved_at:"2026-10-02T00:00:00Z"
      };
      if(sql.includes("FROM market_score_earnings_e1_r3_runs_v1"))return {run_id:"fixture",status:"SUCCESS",completed_at:"2026-10-02T00:00:00Z"};
      throw Error("UNKNOWN_FIRST_QUERY");
     }
    };
   },
  };
 };
 return {prepare,getWrites:()=>writes};
}
test("PC-only bridge reuses original R4 scorer, emits aggregate four factors and never writes",async()=>{
 const db=mockDb();
 const replay=await readStoredEarningsRiskFourFactor({db,asOf:"2026-10-20"});
 assert.equal(db.getWrites(),0);
 assert.equal(replay.status,"READY",replay.reason);
 assert.equal(replay.financialPeriodEnd,"2026-06-30");
 assert.equal(replay.methodologyVersion,"E1-R4");
 assert.equal(replay.factors.length,4);
 assert.equal(replay.historyKind,RISK_R4_PERIOD_RECONSTRUCTION);
 assert.equal(replay.historyMode,"CURRENT_VINTAGE_NOT_PIT");
 assert.deepEqual(replay.periodTrend.map(x=>x.date),["2025-06-30","2025-09-30","2026-03-31","2026-06-30"],"one year ending at mature frame includes valid points and excludes the coverage-failed Q4");
 const expected=buildEarningsE1R4({
  asOfDate:"2026-10-20",financialPeriodEnd:"2026-06-30",
  issuerRows:issuerIds.map((cik,i)=>({
    cik,epsGrowth:0.07+(i%5)*0.003,
    revenueGrowth:0.04+(i%5)*0.002,
    operatingMargin:0.12+(i%5)*0.002,
  }))
 });
 assert.equal(expected.status,"READY");
 assert.equal(replay.score,expected.score);
 for(const row of replay.factors)assert.equal(row.score,expected.components[row.id].score);
 assert.ok(Object.keys(replay).every(key=>!["issuerRows","rawFacts","privateProvenance"].includes(key)),"no raw data leave PC calculation");
});
test("PC bridge blocks absent or invalid source and never substitutes a legacy score",async()=>{
 const missing=await readStoredEarningsRiskFourFactor({db:null,asOf:"2026-10-20"});
 assert.equal(missing.status,"PARTIAL");
 assert.equal(missing.score,null);
 assert.deepEqual(missing.periodTrend,[]);
 const db=mockDb();
 const tooEarly=await readStoredEarningsRiskFourFactor({db,asOf:"2025-06-20"});
 assert.equal(tooEarly.status,"PARTIAL");
 assert.equal(tooEarly.score,null);
 assert.equal(db.getWrites(),0);
});
test("actual eight-risk PC bridge is used before diagnostics without affecting twelve-domain E1-R5",()=>{
 const pc=readFileSync("scripts/pc-writer/market.mjs","utf8");
 const build=readFileSync("worker/market-score-r1.mjs","utf8");
 const source=readFileSync("worker/projection-source-r52.mjs","utf8");
 const panel=readFileSync("app/earnings-recession/earnings-risk-only-panel.tsx","utf8");
 assert.match(pc,/readStoredEarningsRiskFourFactor/);
 assert.match(build,/scoringExternal\.earningsScores=riskEvidence/);
 assert.match(build,/risk\.riskFactorsSource=validEvidence\?"E1_R4_STORED_PC_REPLAY"/);
 assert.match(source,/diag\?\.riskHistoryKind==='E1_R4_STORED_PERIOD_CURRENT_VINTAGE_NOT_PIT'/);
 assert.match(panel,/fiscalReconstruction/);
 assert.match(panel,/사후 재구성/);
 assert.match(panel,/week:null,month:null/);
 assert.doesNotMatch(panel,/storedE1/);
});

test("mature quarter chart makes missing Q4 explicit without inventing a score",()=>{
 const panel=readFileSync("app/earnings-recession/earnings-risk-only-panel.tsx","utf8");
 const chart=readFileSync("app/market-fear-greed-chart.tsx","utf8");
 const bridge=readFileSync("lib/market-score/earnings-recession-stored-r4-pc-r1.mjs","utf8");
 assert.match(bridge,/Date\.parse\(frame\.end\+"T00:00:00Z"\)/);
 assert.match(bridge,/periodEnd<=frame\.end/);
 assert.match(panel,/present\.get\(date\)\?\?null/);
 assert.match(panel,/gapGuides=\{gapGuides\}/);
 assert.match(panel,/점선은 결측 연결/);
 assert.match(panel,/trend\.filter\(point=>validScore\(point\.score\)\)\.length/);
 assert.match(chart,/gapGuides\.map\(guide=>/);
 assert.match(chart,/strokeDasharray="4 5"/);
 assert.match(chart,/connectNulls=\{false\}/);
});
