import test from "node:test";
import assert from "node:assert/strict";
import {
  collectEarningsE1R2PublicDomain,
  latestMatureFrame,
  parseWikipediaCurrentConstituents,
} from "../lib/market-score/sec-earnings-e1-r2-provider.mjs";

function wikiHtml(n=501){
  const rows=[];
  for(let i=0;i<n;i++){
    const dup=i===n-1;
    const issuer=dup?0:i;
    const cik=String(1000000+issuer).padStart(10,"0");
    const ticker=dup?"T0B":`T${i}`;
    rows.push(`<tr><td>${ticker}</td><td>Company ${issuer}</td><td>Sector</td><td>Sub</td><td>NY</td><td>2020-01-01</td><td>${cik}</td><td>2000</td></tr>`);
  }
  return `<table><tr><th>Symbol</th><th>Security</th><th>GICS Sector</th><th>GICS Sub-Industry</th><th>Headquarters Location</th><th>Date added</th><th>CIK</th><th>Founded</th></tr>${rows.join("")}</table>`;
}
function frameData({prior=false,kind="revenue",n=500}={}){
  return Array.from({length:n},(_,i)=>{
    const base=100+i;
    let val;
    if(kind==="eps")val=(prior?1.8:2)+(i%5)*.01;
    else if(kind==="op")val=20+(i%7);
    else val=(prior?base:base*1.08);
    return {
      cik:1000000+i,
      entityName:`Company ${i}`,
      start:prior?"2025-04-01":"2026-04-01",
      end:prior?"2025-06-30":"2026-06-30",
      val,accn:`acc-${i}`,fy:prior?2025:2026,fp:"Q2",form:"10-Q",
      filed:prior?"2025-08-01":"2026-08-01",
    };
  });
}
function response(json,status=200){return new Response(JSON.stringify(json),{status,headers:{"content-type":"application/json"}})}

test("E1-R2 mature-frame policy resolves 2026-09-23 to CY2026Q2",()=>{
  assert.deepEqual(latestMatureFrame("2026-09-23"),{
    year:2026,quarter:2,end:"2026-06-30",frame:"CY2026Q2",
    priorFrame:"CY2025Q2",priorEnd:"2025-06-30",lagDays:75,
  });
});

test("Wikipedia current parser preserves securities and CIK for issuer dedupe",()=>{
  const out=parseWikipediaCurrentConstituents({parse:{revid:77,text:wikiHtml(3)}});
  assert.equal(out.revisionId,77);
  assert.equal(out.securityCount,3);
  assert.equal(out.members[0].cik,"0001000000");
});

test("E1-R2 public provider uses Wikipedia current universe, SEC frames, and deduplicates share classes by CIK",async()=>{
  let calls=0;
  const fetchImpl=async input=>{
    calls++;
    const u=new URL(String(input));
    if(u.hostname==="en.wikipedia.org")return response({parse:{revid:999,text:wikiHtml()}});
    if(u.hostname!=="data.sec.gov")return response({},404);
    const parts=u.pathname.split("/");
    const tag=decodeURIComponent(parts.at(-3));
    const frame=parts.at(-1).replace(/\.json$/,"");
    const prior=frame==="CY2025Q2";
    if(tag==="RevenueFromContractWithCustomerExcludingAssessedTax")return response({data:frameData({prior,kind:"revenue"})});
    if(tag==="EarningsPerShareDiluted")return response({data:frameData({prior,kind:"eps"})});
    if(tag==="OperatingIncomeLoss")return response({data:frameData({prior:false,kind:"op"})});
    return response({data:[]});
  };
  const out=await collectEarningsE1R2PublicDomain({
    asOf:"2026-09-23",fetchImpl,now:()=>new Date("2026-09-23T12:00:00Z"),
  });
  assert.equal(out.status,"READY");
  assert.equal(out.methodologyVersion,"E1-R2");
  assert.equal(out.financialPeriodEnd,"2026-06-30");
  assert.equal(out.quality.securityCount,501);
  assert.equal(out.quality.issuerCount,500);
  assert.equal(out.providerRequests,10);
  assert.equal(calls,10);
  assert.equal(out.rawRowsExposed,false);
  assert.match(out.source,/SEC EDGAR/);
});

test("E1-R2 provider has no Equibles entitlement or API-key dependency",async()=>{
  let calls=0;
  const out=await collectEarningsE1R2PublicDomain({
    asOf:"2026-09-23",
    fetchImpl:async()=>{calls++;return response({},503)},
  });
  assert.equal(calls,1);
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.missing[0],"WIKIPEDIA_UNIVERSE_REQUEST_FAILED");
  assert.doesNotMatch(JSON.stringify(out),/EQUIBLES/i);
});
