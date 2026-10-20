import test from "node:test";import assert from "node:assert/strict";
import {selectApprovedDailyScores,readPublicDailyDomainScores,storedPublicDailyHistoryResponse} from "../worker/economic-domain-daily-history.mjs";
const rows=[
 {date:"2026-10-13",storedAt:1791849600000,modelVersion:"CM-R1",domainId:"employment",domainStatus:"READY",score:51.22680995475113,methodologyVersion:null},
 {date:"2026-10-20",storedAt:1792454400000,modelVersion:"CM-R1",domainId:"employment",domainStatus:"READY",score:41.060897435897445,methodologyVersion:null},
 {date:"2026-10-13",storedAt:1791849600000,modelVersion:"CM-R1",domainId:"credit",domainStatus:"READY",score:70.70660014538123,methodologyVersion:"CREDIT_R2_NFCI_4FACTOR_R1"},
 {date:"2026-10-20",storedAt:1792454400000,modelVersion:"CM-R1",domainId:"credit",domainStatus:"READY",score:70.09514425615768,methodologyVersion:"CREDIT_R2_NFCI_4FACTOR_R1"}
];
test("R6 stored daily score observations project only approved public scores, with uncertainty retained",()=>{
 const data=selectApprovedDailyScores(rows,{from:"2026-09-30",to:"2026-10-20"});
 assert.equal(data.credit.length,2);assert.equal(data.employment.length,2);
 assert.equal(data.employment[1].methodologyVersion,null);
 assert.equal(data.credit[1].methodologyVersion,"CREDIT_R2_NFCI_4FACTOR_R1");
 assert.ok(Math.abs((data.credit[1].score-data.credit[0].score)-(-0.6114558892235493))<1e-7);
 assert.ok(Math.abs((data.employment[1].score-data.employment[0].score)-(-10.165912518853688))<1e-7);
 const invalid=[{...rows[0],domainId:"earnings"},{...rows[0],score:Infinity},{...rows[0],domainStatus:"PARTIAL"},{...rows[0],date:"2026-09-01"}];
 assert.deepEqual(selectApprovedDailyScores(invalid,{from:"2026-09-30",to:"2026-10-20"}),{employment:[],credit:[]});
});
test("candidate API executes only bounded SELECT on existing published D1 score data",async()=>{
 let sql="",bound=[];
 const db={prepare(q){sql=q;return {bind(...args){bound=args;return {async all(){return {results:rows}}}}}}};
 const body=await readPublicDailyDomainScores({db,now:Date.parse("2026-10-20T12:00:00Z")});
 assert.match(sql,/^SELECT\b/);assert.match(sql,/market_public_snapshots_v1/);assert.match(sql,/json_each/);
 assert.doesNotMatch(sql,/INSERT|UPDATE|DELETE|CREATE|DROP|ALTER/i);
 assert.ok(body.series.employment.length===2&&body.series.credit.length===2);
 assert.ok(!JSON.stringify(body).includes("rawObservation"));
 assert.equal(bound[1],"2026-10-20");
});
test("request boundaries and read failures are observable without mutation",async()=>{
 const bad=await storedPublicDailyHistoryResponse(new Request("https://zgmini.kr/api/market-score-daily-history",{method:"POST"}),{db:{}});
 assert.equal(bad.status,405);
 const down=await storedPublicDailyHistoryResponse(new Request("https://zgmini.kr/api/market-score-daily-history"),{db:{}});
 assert.equal(down.status,503);
});
