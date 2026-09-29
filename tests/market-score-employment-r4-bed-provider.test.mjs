import test from "node:test";
import assert from "node:assert/strict";
import {
  EMPLOYMENT_R4_BED_SERIES_IDS,
  EMPLOYMENT_R4_BED_PROVIDER_CONTRACT,
  parseBlsBedShadowRows,
  createEmploymentR4BedProvider,
} from "../lib/market-score/employment-r4-bed-provider.mjs";
import { EMPLOYMENT_R4_PIT_CLASSES } from "../lib/market-score/employment-r4-shadow-contract.mjs";

function payload(ids,year="2025",period="Q04",valueBase=1) {
  return {status:"REQUEST_SUCCEEDED",Results:{series:ids.map((seriesID,i)=>({
    seriesID,data:[
      {year,period,value:String(valueBase+i),footnotes:[]},
      {year:"2025",period:"Q03",value:String(valueBase+i-0.1),footnotes:[]},
    ]
  }))}};
}

test("BED provider universe is frozen to 114 exact series and five requests",()=>{
  assert.equal(EMPLOYMENT_R4_BED_SERIES_IDS.length,114);
  assert.equal(new Set(EMPLOYMENT_R4_BED_SERIES_IDS).size,114);
  assert.equal(EMPLOYMENT_R4_BED_PROVIDER_CONTRACT.requestsPerRun,5);
  assert.equal(EMPLOYMENT_R4_BED_PROVIDER_CONTRACT.seriesPerRequestMax,25);
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

test("provider batches 114 series into five sequential API requests and never scores",async()=>{
  const calls=[];
  const fetchImpl=async(url,init)=>{
    const body=JSON.parse(init.body);
    calls.push(body);
    return {ok:true,status:200,async json(){return payload(body.seriesid);}};
  };
  const p=createEmploymentR4BedProvider({fetchImpl,now:()=>new Date("2026-10-28T13:00:00Z")});
  const out=await p.fetchBedQuarterly({startyear:"2024",endyear:"2026"});
  assert.equal(out.requestCount,5);
  assert.equal(calls.length,5);
  assert.ok(calls.every(x=>x.seriesid.length<=25));
  assert.equal(calls.reduce((s,x)=>s+x.seriesid.length,0),114);
  assert.deepEqual(out.meta.missingSeries,[]);
  assert.equal(EMPLOYMENT_R4_BED_PROVIDER_CONTRACT.scoreComputed,false);
});
