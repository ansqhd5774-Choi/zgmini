import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {createEarningsE1R3D1Store} from "../lib/market-score/earnings-e1-r3-d1-store.mjs";
import {collectEarningsE1R3ToStore,readEarningsE1R3StoredScore} from "../lib/market-score/sec-earnings-e1-r3-provider.mjs";

function d1(database=new DatabaseSync(":memory:")){
  const wrap=(stmt,bound=[])=>({
    bind(...args){return wrap(stmt,args)},
    async run(){const r=stmt.run(...bound);return{meta:{changes:Number(r.changes??0)}}},
    async first(){return stmt.get(...bound)??null},
    async all(){return{results:stmt.all(...bound)}},
  });
  return {
    database,
    prepare(sql){return wrap(database.prepare(sql))},
    async batch(items){database.exec("BEGIN");try{const out=[];for(const item of items)out.push(await item.run());database.exec("COMMIT");return out}catch(e){database.exec("ROLLBACK");throw e}},
  };
}
function members(n=500){return Array.from({length:n},(_,i)=>({cik:String(1000000+i).padStart(10,"0"),ticker:`T${i}`,name:`Company ${i}`}))}
function rows(from,count,{valueShift=0,withAll=false}={}){return Array.from({length:count},(_,j)=>{const i=from+j;return{cik:String(1000000+i).padStart(10,"0"),ticker:`T${i}`,name:`Company ${i}`,epsGrowth:withAll?.05:null,revenueGrowth:withAll?.03:null,operatingMargin:.10+i/100000+valueShift,provenance:{epsGrowth:{tag:"EPS"},revenueGrowth:{tag:"REV"},operatingMargin:{tag:"OP"}}}})}

test("E1-R3 CURRENT accumulates unique same-period companies without deleting omissions",async()=>{
  const db=d1(),store=createEarningsE1R3D1Store(db,{tokenFactory:()=>"run"});
  await store.putUniverse("2026-06-30",{members:members(),securityCount:500,wikipediaRevisionId:1},"2026-09-24T00:00:00Z");
  const a=await store.upsertIssuerRows({periodEnd:"2026-06-30",frame:"CY2026Q2",priorFrame:"CY2025Q2",issuerRows:rows(0,300),retrievedAt:"2026-09-24T00:00:01Z"});
  assert.equal(a.currentRows,300);assert.equal(a.historyRowsAdded,300);
  const b=await store.upsertIssuerRows({periodEnd:"2026-06-30",frame:"CY2026Q2",priorFrame:"CY2025Q2",issuerRows:rows(10,310),retrievedAt:"2026-09-24T01:00:00Z"});
  assert.equal(b.inserted,20);assert.equal(b.updated,0);assert.equal(b.noop,290);assert.equal(b.currentRows,320);assert.equal(b.historyRowsAdded,20);
  const c=await store.upsertIssuerRows({periodEnd:"2026-06-30",frame:"CY2026Q2",priorFrame:"CY2025Q2",issuerRows:rows(5,305),retrievedAt:"2026-09-24T02:00:00Z"});
  assert.equal(c.currentRows,320);assert.equal(c.historyRowsAdded,0);
  assert.equal(await store.countHistory(),320);
});

test("E1-R3 exact period isolation and null-does-not-overwrite",async()=>{
  const db=d1(),store=createEarningsE1R3D1Store(db);
  const one=rows(0,1)[0];
  await store.upsertIssuerRows({periodEnd:"2026-03-31",frame:"CY2026Q1",priorFrame:"CY2025Q1",issuerRows:[one],retrievedAt:"2026-06-20T00:00:00Z"});
  await store.upsertIssuerRows({periodEnd:"2026-06-30",frame:"CY2026Q2",priorFrame:"CY2025Q2",issuerRows:[{...one,operatingMargin:.25}],retrievedAt:"2026-09-24T00:00:00Z"});
  await store.upsertIssuerRows({periodEnd:"2026-06-30",frame:"CY2026Q2",priorFrame:"CY2025Q2",issuerRows:[{...one,operatingMargin:null}],retrievedAt:"2026-09-24T01:00:00Z"});
  const q1=await store.getCurrentFacts("2026-03-31"),q2=await store.getCurrentFacts("2026-06-30");
  assert.equal(q1.length,1);assert.equal(q2.length,1);assert.equal(q1[0].value,one.operatingMargin);assert.equal(q2[0].value,.25);
});

test("E1-R3 changed value appends one history revision; identical fetch does not",async()=>{
  const db=d1(),store=createEarningsE1R3D1Store(db);const first=rows(0,1)[0];
  await store.upsertIssuerRows({periodEnd:"2026-06-30",frame:"CY2026Q2",priorFrame:"CY2025Q2",issuerRows:[first],retrievedAt:"2026-09-24T00:00:00Z"});
  const same=await store.upsertIssuerRows({periodEnd:"2026-06-30",frame:"CY2026Q2",priorFrame:"CY2025Q2",issuerRows:[first],retrievedAt:"2026-09-24T01:00:00Z"});
  assert.equal(same.historyRowsAdded,0);
  const changed=await store.upsertIssuerRows({periodEnd:"2026-06-30",frame:"CY2026Q2",priorFrame:"CY2025Q2",issuerRows:[{...first,operatingMargin:first.operatingMargin+.01}],retrievedAt:"2026-09-24T02:00:00Z"});
  assert.equal(changed.updated,1);assert.equal(changed.historyRowsAdded,1);assert.equal(await store.countHistory(),2);
});

function wikiHtml(n=501){const out=[];for(let i=0;i<n;i++){const issuer=i===n-1?0:i,cik=String(1000000+issuer).padStart(10,"0"),ticker=i===n-1?"T0B":`T${i}`;out.push(`<tr><td>${ticker}</td><td>Company ${issuer}</td><td>Sector</td><td>Sub</td><td>NY</td><td>2020-01-01</td><td>${cik}</td><td>2000</td></tr>`)}return`<table><tr><th>Symbol</th><th>Security</th><th>GICS Sector</th><th>GICS Sub-Industry</th><th>Headquarters Location</th><th>Date added</th><th>CIK</th><th>Founded</th></tr>${out.join("")}</table>`}
function frameData({prior=false,kind="revenue",n=500}={}){return Array.from({length:n},(_,i)=>{const base=100+i;let val;if(kind==="eps")val=(prior?1.8:2)+(i%5)*.01;else if(kind==="op")val=20+(i%7);else val=prior?base:base*1.08;return{cik:1000000+i,entityName:`Company ${i}`,start:prior?"2025-04-01":"2026-04-01",end:prior?"2025-06-30":"2026-06-30",val,accn:`acc-${kind}-${i}`,fy:prior?2025:2026,fp:"Q2",form:"10-Q",filed:prior?"2025-08-01":"2026-08-01"}})}
const response=(json,status=200)=>new Response(JSON.stringify(json),{status,headers:{"content-type":"application/json"}});

test("E1-R3 API collection only stores; scoring reads D1 independently",async()=>{
  const db=d1();let calls=0;
  const fetchImpl=async input=>{calls++;const u=new URL(String(input));if(u.hostname==="en.wikipedia.org")return response({parse:{revid:999,text:wikiHtml()}});const parts=u.pathname.split("/"),tag=decodeURIComponent(parts.at(-3)),frame=parts.at(-1).replace(/\.json$/,"");const prior=frame==="CY2025Q2";if(tag==="RevenueFromContractWithCustomerExcludingAssessedTax")return response({data:frameData({prior,kind:"revenue"})});if(tag==="EarningsPerShareDiluted")return response({data:frameData({prior,kind:"eps"})});if(tag==="OperatingIncomeLoss")return response({data:frameData({kind:"op"})});return response({data:[]})};
  const now=()=>new Date("2026-09-24T12:00:00Z");

  const empty=await readEarningsE1R3StoredScore({asOf:"2026-09-24",now,db});
  assert.equal(empty.status,"PARTIAL");assert.equal(empty.missing[0],"NO_STORED_CURRENT_FOR_PERIOD");assert.equal(empty.providerRequests,0);

  const collected=await collectEarningsE1R3ToStore({asOf:"2026-09-24",fetchImpl,now,db,refreshMs:86400000});
  assert.equal(collected.status,"STORED");assert.equal(collected.calculationPerformed,false);assert.equal("score" in collected,false);assert.equal(calls,10);

  const before=calls,score=await readEarningsE1R3StoredScore({asOf:"2026-09-24",now,db});
  assert.equal(calls,before);assert.equal(score.status,"READY");assert.equal(score.providerRequests,0);
  assert.equal(score.persistence.calculationSource,"STORED_CURRENT_ONLY");assert.equal(score.persistence.collectionDecoupled,true);
  assert.equal(score.persistence.collectionMode,"PERSISTED_CURRENT_READ_ONLY");

  const second=await collectEarningsE1R3ToStore({asOf:"2026-09-24",fetchImpl,now,db,refreshMs:86400000});
  assert.equal(second.status,"SKIPPED_FRESH");assert.equal(calls,before);
});
