import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
 EARNINGS_RISK_PROVISIONAL_PUBLIC_KEY,
 EARNINGS_RISK_PROVISIONAL_PUBLIC_VERSION,
 EARNINGS_RISK_PROVISIONAL_HISTORY_POLICY,
 validateEarningsRiskProvisionalRecord,readEarningsRiskProvisional
} from "../worker/earnings-risk-provisional-public.mjs";
const now=Date.parse("2026-10-21T01:30:00.000Z");
const metrics={epsGrowth:17,revenueGrowth:18,operatingMargin:15,earningsGrowthBreadth:17};
const point=(when="2026-10-20T23:35:51.732Z",id="a".repeat(64))=>({
 observedAt:when,observationId:id,score:77.25,quarterEnd:"2026-09-30",
 filingDate:"2026-10-19",sourceStoredAt:"2026-10-19T21:14:34.000Z",
 observed:{...metrics},coverage:Object.fromEntries(Object.entries(metrics).map(([k,v])=>[k,v/500])),
 factorScores:{eps:72.5,margin:100,revenue:59.375,epsBreadth:75}
});
const record=()=>({
 version:EARNINGS_RISK_PROVISIONAL_PUBLIC_VERSION,status:"PROVISIONAL",publicationAuthorized:true,
 historyPolicy:EARNINGS_RISK_PROVISIONAL_HISTORY_POLICY,methodologyVersion:"E1-R4",
 quarterEnd:"2026-09-30",universeCount:500,sourceStoredAt:"2026-10-19T21:14:34.000Z",
 sourceVersion:"LOCAL_SEC_COMPANYFACTS_CURRENT_VINTAGE",publishedAt:"2026-10-21T01:00:00.000Z",
 history:[point()],latest:{observedAt:point().observedAt,observationId:point().observationId,score:77.25},
});
const dbFor=body=>({prepare:sql=>{
 assert.match(sql,/SELECT body,stored_at FROM market_public_snapshots_v1/);
 return {bind:key=>{
 assert.equal(key,EARNINGS_RISK_PROVISIONAL_PUBLIC_KEY);
 return {first:async()=>body?{body:JSON.stringify(body),stored_at:now-1000}:null};
 }};
 }});
test("actual PIT-only published observations validate without any reconstructed points",()=>{
 assert.equal(validateEarningsRiskProvisionalRecord(record()),true);
 const r=record();r.history.push({...point("2026-10-20T23:40:00.000Z","b".repeat(64)),score:78,factorScores:{eps:74.64285714285714,margin:100,revenue:59.375,epsBreadth:75}});
 r.latest={observedAt:r.history.at(-1).observedAt,observationId:r.history.at(-1).observationId,score:78};
 assert.equal(validateEarningsRiskProvisionalRecord(r),true);
});
test("fail closed on mismatched identities, misleading PIT, coverage and missing approval",()=>{
 const mutations=[
  r=>{r.publicationAuthorized=false},
  r=>{r.historyPolicy="CURRENT_VINTAGE_RECONSTRUCTION_NOT_PIT"},
  r=>{r.history[0].observed.epsGrowth=400},
  r=>{r.history[0].coverage.epsGrowth=0.8},
  r=>{r.history[0].score=88},
  r=>{r.history[0].factorScores.margin=0},
  r=>{r.latest.score=88},
  r=>{r.sourceStoredAt="2026-10-01T00:00:00.000Z"},
  r=>{r.history[0].filingDate="2026-10-22"},
  r=>{r.history[0].observationId="fake"},
  r=>{r.history.push({...r.history[0]})},
 ];
 for(const mutate of mutations){const r=record();mutate(r);assert.equal(validateEarningsRiskProvisionalRecord(r),false);}
});
test("public GET is derived-only and pending/stale records return 503",async()=>{
 const ok=await readEarningsRiskProvisional(dbFor(record()),{now});
 assert.equal(ok.status,200);
 const body=await ok.json();
 assert.equal(body.score,77.25);assert.equal(body.history.length,1);assert.equal(body.phase,"PROVISIONAL");
 assert.equal(body.history[0].observed.epsGrowth,17);
 assert.equal("observationId" in body.history[0],false);
 assert.equal("rawAggregate" in body.history[0],false);
 assert.equal((await readEarningsRiskProvisional(dbFor(null),{now})).status,503);
 assert.equal((await readEarningsRiskProvisional(dbFor(record()),{now:now+40*86400000})).status,503);
});
test("production API is a read-only and isolated result, not the E1-R4 confirmed endpoint",()=>{
 const r=fs.readFileSync("app/api/earnings-risk-provisional/route.ts","utf8");
 assert.match(r,/readEarningsRiskProvisional/);
 assert.doesNotMatch(r,/fetch\(|\bPOST\b|runMarket\(|\bcollect\(|INSERT INTO|UPDATE [A-Z]/);
 assert.equal(r.includes("earnings-recession-detail"),false);
});
