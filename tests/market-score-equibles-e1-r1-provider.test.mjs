import test from "node:test";
import assert from "node:assert/strict";
import {collectEquiblesEarningsE1R1,parseEquiblesEarningsCsv,SCREENER_COLS} from "../lib/market-score/equibles-e1-r1-provider.mjs";

const observationDate="2026-09-18";
const hdr=(limit=100000,extra={})=>new Headers({"x-ratelimit-limit":String(limit),...extra});
function response(body,{status=200,headers={}}={}){
  return new Response(typeof body==="string"?body:JSON.stringify(body),{status,headers});
}
function member(ticker,weight=1,isLinked=true){return {ticker,weight,isLinked};}
function indexPage({data,hasMore=false,offset=0,total=data.length}){
  return {
    slug:"sp-500",name:"S&P 500",asOfDate:observationDate,source:"fixture",isDaily:true,
    constituentCount:total,unlinkedCount:data.filter(x=>!x.isLinked).length,
    data,meta:{limit:500,offset,count:data.length,hasMore,total},
  };
}
function csv(rows){
  const header="ticker,name,price,marketcap,epsgrowth,opmargin,revgrowth";
  return [header,...rows.map(r=>[
    r.ticker,`"${r.name??r.ticker}"`,100,r.marketcap??100,r.epsgrowth??10,r.opmargin??15,r.revgrowth??5
  ].join(","))].join("\n");
}

test("E1-R1 CSV parser honors stable pinned and metric headers",()=>{
  const out=parseEquiblesEarningsCsv(
    `ticker,name,price,marketcap,epsgrowth,opmargin,revgrowth\nA,"A, Inc.",10,1000,12.50,15.25,4.00`
  );
  assert.deepEqual(out,[{ticker:"A",marketcap:1000,epsgrowth:12.5,opmargin:15.25,revgrowth:4}]);
  assert.equal(SCREENER_COLS,"epsgrowth,opmargin,revgrowth");
});

test("E1-R1 provider missing key makes zero calls",async()=>{
  let calls=0;
  const out=await collectEquiblesEarningsE1R1({fetchImpl:async()=>{calls++}});
  assert.equal(calls,0);
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.missing[0],"EQUIBLES_API_KEY_MISSING");
});

test("E1-R1 Free entitlement stops after first index request before screener fanout",async()=>{
  let calls=0;
  const fetchImpl=async()=>{calls++;return response(indexPage({data:[member("A")]}),{headers:hdr(100)})};
  const out=await collectEquiblesEarningsE1R1({apiKey:"eq_test",fetchImpl});
  assert.equal(calls,1);
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.missing[0],"EQUIBLES_PRO_ENTITLEMENT_REQUIRED");
});

test("E1-R1 Pro adapter returns READY using current index, screener and SPY session clock",async()=>{
  const members=Array.from({length:10},(_,i)=>member(`T${i}`,1,true));
  const fetchImpl=async urlLike=>{
    const u=new URL(String(urlLike));
    if(u.pathname.endsWith("/indexes/sp-500"))return response(indexPage({data:members}),{headers:hdr()});
    if(u.pathname.endsWith("/screener/stocks")){
      return response(csv(members.map((x,i)=>({ticker:x.ticker,marketcap:100+i,epsgrowth:5+i,opmargin:10+i,revgrowth:i}))),{
        headers:{"x-screener-total-pages":"1","x-screener-total-count":"10"}
      });
    }
    if(u.pathname.endsWith("/stocks/SPY/prices")){
      return response({data:[{date:observationDate,close:500},{date:"2026-09-17",close:499}]});
    }
    return response({}, {status:404});
  };
  const out=await collectEquiblesEarningsE1R1({apiKey:"eq_test",fetchImpl,now:()=>new Date("2026-09-18T20:00:00Z")});
  assert.equal(out.status,"READY");
  assert.equal(out.providerRequests,3);
  assert.equal(out.rawRowsExposed,false);
  assert.equal(out.observedDailyLimit,100000);
});

test("E1-R1 index pagination and screener pagination are complete before scoring",async()=>{
  const a=[member("A"),member("B")],b=[member("C"),member("D")];
  const p1=indexPage({data:a,hasMore:true,offset:0,total:4});
  p1.unlinkedCount=0;
  const p2=indexPage({data:b,hasMore:false,offset:2,total:4});
  p2.unlinkedCount=0;
  const fetchImpl=async urlLike=>{
    const u=new URL(String(urlLike));
    if(u.pathname.endsWith("/indexes/sp-500"))return response(u.searchParams.get("offset")==="0"?p1:p2,{headers:hdr()});
    if(u.pathname.endsWith("/screener/stocks")){
      const page=Number(u.searchParams.get("page"));
      const rs=page===1?[{ticker:"A"},{ticker:"B"}]:[{ticker:"C"},{ticker:"D"}];
      return response(csv(rs),{headers:{"x-screener-total-pages":"2","x-screener-total-count":"4"}});
    }
    if(u.pathname.endsWith("/stocks/SPY/prices"))return response({data:[{date:observationDate}]});
    return response({}, {status:404});
  };
  const out=await collectEquiblesEarningsE1R1({apiKey:"eq_test",fetchImpl});
  assert.equal(out.status,"READY");
  assert.equal(out.indexPageCount,2);
  assert.equal(out.screenerPageCount,2);
  assert.equal(out.screenerRowsParsed,4);
  assert.equal(out.providerRequests,5);
});

test("E1-R1 missing metric coverage remains PARTIAL/null",async()=>{
  const members=Array.from({length:10},(_,i)=>member(`T${i}`));
  const fetchImpl=async urlLike=>{
    const u=new URL(String(urlLike));
    if(u.pathname.endsWith("/indexes/sp-500"))return response(indexPage({data:members}),{headers:hdr()});
    if(u.pathname.endsWith("/screener/stocks")){
      const rs=members.map((x,i)=>({ticker:x.ticker,epsgrowth:10,opmargin:i<7?15:"",revgrowth:5}));
      const text=["ticker,name,price,marketcap,epsgrowth,opmargin,revgrowth",
        ...rs.map(r=>`${r.ticker},${r.ticker},100,100,${r.epsgrowth},${r.opmargin},${r.revgrowth}`)].join("\n");
      return response(text,{headers:{"x-screener-total-pages":"1","x-screener-total-count":"10"}});
    }
    if(u.pathname.endsWith("/stocks/SPY/prices"))return response({data:[{date:observationDate}]});
  };
  const out=await collectEquiblesEarningsE1R1({apiKey:"eq_test",fetchImpl});
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.match(out.missing[0],/MARGIN_COUNT_COVERAGE/);
});

test("E1-R1 three newer SPY sessions makes the current snapshot STALE",async()=>{
  const members=Array.from({length:10},(_,i)=>member(`T${i}`));
  const fetchImpl=async urlLike=>{
    const u=new URL(String(urlLike));
    if(u.pathname.endsWith("/indexes/sp-500"))return response(indexPage({data:members}),{headers:hdr()});
    if(u.pathname.endsWith("/screener/stocks"))return response(csv(members.map(x=>({ticker:x.ticker}))),{
      headers:{"x-screener-total-pages":"1","x-screener-total-count":"10"}
    });
    if(u.pathname.endsWith("/stocks/SPY/prices"))return response({data:[
      {date:"2026-09-23"},{date:"2026-09-22"},{date:"2026-09-21"},{date:observationDate}
    ]});
  };
  const out=await collectEquiblesEarningsE1R1({apiKey:"eq_test",fetchImpl});
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.missing[0],"STALE");
});

test("E1-R1 duplicate screener ticker fails closed",async()=>{
  const members=[member("A"),member("B")];
  const fetchImpl=async urlLike=>{
    const u=new URL(String(urlLike));
    if(u.pathname.endsWith("/indexes/sp-500"))return response(indexPage({data:members}),{headers:hdr()});
    if(u.pathname.endsWith("/screener/stocks"))return response(csv([{ticker:"A"},{ticker:"A"},{ticker:"B"}]),{
      headers:{"x-screener-total-pages":"1","x-screener-total-count":"3"}
    });
    if(u.pathname.endsWith("/stocks/SPY/prices"))return response({data:[{date:observationDate}]});
  };
  const out=await collectEquiblesEarningsE1R1({apiKey:"eq_test",fetchImpl});
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.missing[0],"DUPLICATE_SCREENER_TICKER");
});
