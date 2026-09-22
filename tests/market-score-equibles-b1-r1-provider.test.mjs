import test from "node:test";
import assert from "node:assert/strict";
import {collectEquiblesBreadthB1R1,PRO_DAILY_LIMIT} from "../lib/market-score/equibles-b1-r1-provider.mjs";

function response(body,{status=200,limit=100000}={}){
  return new Response(JSON.stringify(body),{
    status,
    headers:{
      "content-type":"application/json",
      "x-ratelimit-limit":String(limit),
      "x-ratelimit-remaining":"99999",
    },
  });
}

function page({data,hasMore=false,offset=0,total=data.length,asOfDate="2026-09-18",source="IVV daily basket"}){
  return {
    slug:"sp-500",
    name:"S&P 500",
    asOfDate,
    source,
    isDaily:true,
    constituentCount:total,
    unlinkedCount:data.filter(x=>x.isLinked!==true).length,
    data,
    meta:{limit:500,offset,count:data.length,hasMore,total},
  };
}

function member(ticker,weight=1,isLinked=true){return {ticker,weight,isLinked};}
function prices(currentDate="2026-09-18",previousDate="2026-09-17",current=101,previous=100,volume=10,newer=[]){
  return {
    data:[
      ...newer.map((date,i)=>({date,close:102+i,volume:10})),
      {date:currentDate,close:current,volume},
      {date:previousDate,close:previous,volume:8},
      {date:"2026-09-16",close:99,volume:7},
    ],
    meta:{limit:5,offset:0,count:3+newer.length,hasMore:false},
  };
}

test("provider requires a key without making a request",async()=>{
  let calls=0;
  const out=await collectEquiblesBreadthB1R1({fetchImpl:async()=>{calls++;}});
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.equal(out.missing[0],"EQUIBLES_API_KEY_MISSING");
  assert.equal(calls,0);
});

test("Free entitlement fails closed after one index request and never fans out",async()=>{
  let calls=0;
  const fetchImpl=async()=>{calls++;return response(page({data:[member("A")],total:1}),{limit:100});};
  const out=await collectEquiblesBreadthB1R1({apiKey:"eq_test",fetchImpl});
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.equal(out.missing[0],"EQUIBLES_PRO_ENTITLEMENT_REQUIRED");
  assert.equal(out.entitlement,"FREE");
  assert.equal(out.providerRequests,1);
  assert.equal(calls,1);
});

test("Plus entitlement also fails closed before price fanout",async()=>{
  let calls=0;
  const fetchImpl=async()=>{calls++;return response(page({data:[member("A")],total:1}),{limit:10000});};
  const out=await collectEquiblesBreadthB1R1({apiKey:"eq_test",fetchImpl});
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.missing[0],"EQUIBLES_PRO_ENTITLEMENT_REQUIRED");
  assert.equal(out.entitlement,"PLUS");
  assert.equal(calls,1);
});

test("Pro gate is identified from the documented 100000 daily limit",async()=>{
  let calls=0;
  const fetchImpl=async url=>{
    calls++;
    const u=new URL(url);
    if(u.pathname.endsWith("/indexes/sp-500")) return response(page({data:[member("A")],total:1}),{limit:PRO_DAILY_LIMIT});
    return response(prices(),{limit:PRO_DAILY_LIMIT});
  };
  const out=await collectEquiblesBreadthB1R1({apiKey:"eq_test",fetchImpl});
  assert.equal(out.status,"READY");
  assert.equal(out.entitlement,"PRO_OR_HIGHER");
  assert.equal(out.observedDailyLimit,100000);
  assert.equal(out.providerRequests,2);
});

test("provider paginates complete PIT composition and validates provenance",async()=>{
  const linked=Array.from({length:49},(_,i)=>member(`T${i}`,1,true));
  const p1=page({data:linked,hasMore:true,offset:0,total:50});
  p1.constituentCount=50;
  p1.unlinkedCount=1;
  const p2=page({data:[member(null,0.1,false)],hasMore:false,offset:49,total:50});
  p2.constituentCount=50;
  p2.unlinkedCount=1;

  const fetchImpl=async url=>{
    const u=new URL(url);
    if(u.pathname.endsWith("/indexes/sp-500")){
      return response(u.searchParams.get("offset")==="0"?p1:p2);
    }
    return response(prices());
  };
  const out=await collectEquiblesBreadthB1R1({apiKey:"eq_test",fetchImpl,concurrency:8});
  assert.equal(out.status,"READY");
  assert.equal(out.indexPageCount,2);
  assert.equal(out.quality.universeCount,50);
  assert.equal(out.quality.unlinkedRows,1);
  assert.equal(out.quality.returnCoverage,0.98);
  assert.equal(out.quality.tradingValueCoverage,0.98);
  assert.ok(out.quality.linkedWeightCoverage>=0.99);
});

test("page provenance mismatch fails closed before any price calls",async()=>{
  let priceCalls=0;
  const p1=page({data:[member("A")],hasMore:true,offset:0,total:2});
  p1.constituentCount=2;
  const p2=page({data:[member("B")],hasMore:false,offset:1,total:2,asOfDate:"2026-09-17"});
  p2.constituentCount=2;
  const fetchImpl=async url=>{
    const u=new URL(url);
    if(u.pathname.endsWith("/indexes/sp-500")) return response(u.searchParams.get("offset")==="0"?p1:p2);
    priceCalls++;
    return response(prices());
  };
  const out=await collectEquiblesBreadthB1R1({apiKey:"eq_test",fetchImpl});
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.missing[0],"EQUIBLES_INDEX_PAGE_PROVENANCE_MISMATCH");
  assert.equal(priceCalls,0);
});

test("price parser uses each ticker's immediately previous actual stored observation",async()=>{
  const members=[member("A",0.5),member("B",0.5)];
  const fetchImpl=async url=>{
    const u=new URL(url);
    if(u.pathname.endsWith("/indexes/sp-500")) return response(page({data:members,total:2}));
    if(u.pathname.includes("/stocks/A/")) return response(prices("2026-09-18","2026-09-17",101,100,10));
    return response(prices("2026-09-18","2026-09-16",99,100,10));
  };
  const out=await collectEquiblesBreadthB1R1({apiKey:"eq_test",fetchImpl});
  assert.equal(out.status,"READY");
  assert.equal(out.quality.previousObservationDateCount,2);
  assert.equal(out.components.advanceRatio,0.5);
});

test("missing price coverage remains PARTIAL/null and never renormalizes",async()=>{
  const members=Array.from({length:100},(_,i)=>member(`T${i}`,1));
  const fetchImpl=async url=>{
    const u=new URL(url);
    if(u.pathname.endsWith("/indexes/sp-500")) return response(page({data:members,total:100}));
    const ticker=decodeURIComponent(u.pathname.split("/")[3]);
    const i=Number(ticker.slice(1));
    if(i>=97) return response({data:[],meta:{limit:5,offset:0,count:0,hasMore:false}});
    return response(prices());
  };
  const out=await collectEquiblesBreadthB1R1({apiKey:"eq_test",fetchImpl,concurrency:8});
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.equal(out.missing[0],"LOW_RETURN_COVERAGE");
  assert.equal(out.quality.returnCoverage,0.97);
});

test("three newer completed price dates make the PIT snapshot stale",async()=>{
  const fetchImpl=async url=>{
    const u=new URL(url);
    if(u.pathname.endsWith("/indexes/sp-500")) return response(page({data:[member("A")],total:1}));
    return response(prices("2026-09-18","2026-09-17",101,100,10,["2026-09-23","2026-09-22","2026-09-21"]));
  };
  const out=await collectEquiblesBreadthB1R1({apiKey:"eq_test",fetchImpl});
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.equal(out.missing[0],"STALE");
  assert.equal(out.quality.lagTradingSessions,3);
});

test("provider output exposes derived result only, not raw constituent or bar arrays",async()=>{
  const fetchImpl=async url=>{
    const u=new URL(url);
    if(u.pathname.endsWith("/indexes/sp-500")) return response(page({data:[member("A")],total:1}));
    return response(prices());
  };
  const out=await collectEquiblesBreadthB1R1({apiKey:"eq_test",fetchImpl});
  assert.equal(out.status,"READY");
  assert.equal(out.rawRowsExposed,false);
  assert.equal("members" in out,false);
  assert.equal("pricePairs" in out,false);
  assert.equal(JSON.stringify(out).includes("previousClose"),false);
});
