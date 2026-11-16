import test from "node:test";
import assert from "node:assert/strict";
import {
  EMPLOYMENT_R4_BED_SERIES_IDS,
  EMPLOYMENT_R4_BED_PROVIDER_CONTRACT,
  parseBlsBedShadowRows,
  createEmploymentR4BedProvider,
} from "../lib/market-score/employment-r4-bed-provider.mjs";
import { EMPLOYMENT_R4_PIT_CLASSES } from "../lib/market-score/employment-r4-shadow-contract.mjs";
import { collectEmploymentR4BedShadow } from "../lib/market-score/employment-r4-bed-collector.mjs";

function payload(ids,year="2025",period="Q04",valueBase=1) {
  return {status:"REQUEST_SUCCEEDED",Results:{series:ids.map((seriesID,i)=>({
    seriesID,data:[
      {year,period,value:String(valueBase+i),footnotes:[]},
      {year:"2025",period:"Q03",value:String(valueBase+i-0.1),footnotes:[]},
    ]
  }))}};
}

test("BED provider universe is frozen to 114 exact series and three v2 requests",()=>{
  assert.equal(EMPLOYMENT_R4_BED_SERIES_IDS.length,114);
  assert.equal(new Set(EMPLOYMENT_R4_BED_SERIES_IDS).size,114);
  assert.equal(EMPLOYMENT_R4_BED_PROVIDER_CONTRACT.requestsPerRun,3);
  assert.equal(EMPLOYMENT_R4_BED_PROVIDER_CONTRACT.seriesPerRequestMax,50);
});

test("parser emits stored-history-class rows only; collector owns forward promotion",async()=>{
  const ids=EMPLOYMENT_R4_BED_SERIES_IDS.slice(0,2);
  const out=await parseBlsBedShadowRows(payload(ids),{
    retrievedAt:"2026-10-28T13:00:00Z",
    requestedSeriesIds:ids,
  });
  assert.equal(out.rows.length,4);
  assert.ok(out.rows.every(x=>x.provider==="BLS_BED"));
  assert.ok(out.rows.every(x=>x.frequency==="QUARTERLY"));
  assert.ok(out.rows.every(x=>x.pitClass===EMPLOYMENT_R4_PIT_CLASSES.historicalCurrentVintage));
  assert.ok(out.rows.every(x=>x.availableAt===null));
});

test("BED parser accepts official Results array and preserves PIT/raw hashes",async()=>{
  const ids=EMPLOYMENT_R4_BED_SERIES_IDS.slice(0,2);
  const response=payload(ids);
  response.Results=[response.Results];
  const parsed=await parseBlsBedShadowRows(response,{
    retrievedAt:"2026-10-28T13:00:00Z",requestedSeriesIds:ids,
    sourceUrl:"https://api.bls.gov/publicAPI/v2/timeseries/data/",
  });
  assert.equal(parsed.rows.length,4);
  assert.equal(parsed.meta.missingSeries.length,0);
  assert.ok(parsed.rows.every(x=>x.provenance.sourceUrl.includes("/v2/")));
  assert.ok(parsed.rows.every(x=>x.provenance.rawRecordHash?.length===64));
  assert.ok(parsed.rows.every(x=>x.pitClass===EMPLOYMENT_R4_PIT_CLASSES.historicalCurrentVintage));
  await assert.rejects(parseBlsBedShadowRows({status:"REQUEST_SUCCEEDED",Results:[{}]},{retrievedAt:"2026-10-28T13:00:00Z",requestedSeriesIds:ids}),/BLS_BED_RESPONSE_MALFORMED/);
  await assert.rejects(parseBlsBedShadowRows({status:"REQUEST_SUCCEEDED",Results:[null]},{retrievedAt:"2026-10-28T13:00:00Z",requestedSeriesIds:ids}),/BLS_BED_RESPONSE_MALFORMED/);
  await assert.rejects(parseBlsBedShadowRows({status:"REQUEST_SUCCEEDED",Results:[{series:42}]},{retrievedAt:"2026-10-28T13:00:00Z",requestedSeriesIds:ids}),/BLS_BED_RESPONSE_MALFORMED/);
});

test("provider batches 114 series into three keyed v2 POSTs and never scores",async()=>{
  const calls=[];
  const fetchImpl=async(url,init)=>{
    const body=JSON.parse(init.body);
    calls.push({url,method:init.method,body});
    const response=payload(body.seriesid);
    response.Results=[response.Results];
    return {ok:true,status:200,async json(){return response;}};
  };
  const p=createEmploymentR4BedProvider({fetchImpl,now:()=>new Date("2026-10-28T13:00:00Z"),env:{BLS_API_KEY:"fixture-key"}});
  const out=await p.fetchBedQuarterly({startyear:"2024",endyear:"2026"});
  assert.equal(out.requestCount,3);
  assert.equal(calls.length,3);
  assert.ok(calls.every(x=>x.body.seriesid.length<=50));
  assert.equal(calls.reduce((s,x)=>s+x.body.seriesid.length,0),114);
  assert.ok(calls.every(x=>x.url.includes("/v2/")&&x.method==="POST"));
  assert.ok(calls.every(x=>x.body.registrationkey==="fixture-key"));
  assert.deepEqual(out.meta.missingSeries,[]);
  assert.ok(out.rows.every(x=>x.provenance.sourceUrl.includes("/v2/")));
  assert.equal(EMPLOYMENT_R4_BED_PROVIDER_CONTRACT.scoreComputed,false);
});

test("BED without a registered key fails closed before any network request",async()=>{
  let calls=0;
  const p=createEmploymentR4BedProvider({fetchImpl:async()=>{calls++;throw new Error("should not fetch");}});
  await assert.rejects(p.fetchBedQuarterly(),error=>{
    assert.match(error.message,/BLS_REGISTRATION_KEY_MISSING/);
    assert.equal(error.requestCount,0);
    return true;
  });
  assert.equal(calls,0);
});

test("BED 429 and malformed responses never retry or overwrite with fabricated zeros",async()=>{
  let calls=0;
  const opts={env:{BLS_REGISTRATION_KEY:"fixture-key"}};
  const rateLimited=createEmploymentR4BedProvider({...opts,fetchImpl:async()=>{calls++;return {ok:false,status:429};}});
  await assert.rejects(rateLimited.fetchBedQuarterly(),error=>{
    assert.match(error.message,/BLS_BED_HTTP_429/);
    assert.equal(error.requestCount,1);
    return true;
  });
  assert.equal(calls,1);
  calls=0;
  const malformed=createEmploymentR4BedProvider({...opts,fetchImpl:async()=>{calls++;return {ok:true,status:200,json:async()=>({status:"REQUEST_SUCCEEDED",Results:null})};}});
  await assert.rejects(malformed.fetchBedQuarterly(),error=>{
    assert.match(error.message,/BLS_BED_RESPONSE_MALFORMED/);
    assert.equal(error.requestCount,1);
    return true;
  });
  assert.equal(calls,1);
});

test("BED second-batch HTTP 429 records two attempts through collector failure ledger",async()=>{
  let calls=0;
  const provider=createEmploymentR4BedProvider({
    env:{BLS_API_KEY:"fixture-key"},
    fetchImpl:async(_url,{body})=>{
      calls++;
      return calls===1
        ?{ok:true,status:200,json:async()=>payload(JSON.parse(body).seriesid)}
        :{ok:false,status:429};
    },
  });
  const records=[];
  const store={
    async initialize(){},
    async acquire(){return{acquired:true};},
    async getCurrentRows(){return[];},
    async recordRun(row){records.push(row);},
    async release(){},
  };
  await assert.rejects(collectEmploymentR4BedShadow({db:{prepare(){}},provider,storeFactory:()=>store}),error=>{
    assert.match(error.message,/BLS_BED_HTTP_429/);
    assert.equal(error.requestCount,2);
    return true;
  });
  assert.equal(calls,2);
  assert.equal(records.at(-1).providerRequests,2);
  assert.equal(records.at(-1).status,"FAIL");
});
