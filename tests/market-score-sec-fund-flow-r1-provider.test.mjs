import test from "node:test";
import assert from "node:assert/strict";
import {
  fetchSecRegisteredFundFlows,
  parseSecRegisteredFundFlowPayload,
  releaseDateFromSecFlowsUrl,
  resolveSecFundFlowsJsonUrl,
  SEC_REGISTERED_FUND_FLOWS_SERIES,
  SEC_REGISTERED_FUND_FLOWS_TABLE_TITLE,
} from "../lib/market-score/sec-fund-flow-r1-provider.mjs";

const DATA_URL="https://www.sec.gov/files/2026-08/Flows_08-20-2026.json";

function payload(points=[
  {name:"2019-04",x:Date.UTC(2019,3,1),y:0.27},
  {name:"2019-05",x:Date.UTC(2019,4,1),y:-0.11},
  {name:"2019-06",x:Date.UTC(2019,5,1),y:0.17},
]){
  return {
    "Section.3_Flows_Table.3.1":{
      metadata:{title:"Aggregate Inflows, Outflows, and Net Flows of Index and Non-Index Funds (USD)"},
      data:{"all-data":[]},
    },
    "Section.3_Flows_Table.3.2":{
      metadata:{title:SEC_REGISTERED_FUND_FLOWS_TABLE_TITLE},
      data:{
        "all-data":[
          {name:"All - Inflow",data:[]},
          {name:SEC_REGISTERED_FUND_FLOWS_SERIES,data:points},
          {name:"All - Outflow",data:[]},
        ],
      },
    },
  };
}

test("F1-R1 resolves exactly one official SEC dated Flows JSON link",()=>{
  const html=`<a href="/files/2026-08/Flows_08-20-2026.json">Flows Statistics</a>`;
  assert.equal(resolveSecFundFlowsJsonUrl(html),DATA_URL);
  assert.equal(releaseDateFromSecFlowsUrl(DATA_URL),"2026-08-20");
});

test("F1-R1 rejects non-SEC or ambiguous JSON links",()=>{
  assert.equal(resolveSecFundFlowsJsonUrl(`<a href="https://example.com/files/2026-08/Flows_08-20-2026.json">x</a>`),null);
  assert.equal(resolveSecFundFlowsJsonUrl(
    `<a href="/files/2026-08/Flows_08-20-2026.json">a</a><a href="/files/2026-07/Flows_07-20-2026.json">b</a>`
  ),null);
});

test("F1-R1 parses only Table 3.2 All - Net percentage series",()=>{
  const out=parseSecRegisteredFundFlowPayload(payload(),{sourceUrl:DATA_URL});
  assert.equal(out.status,"READY_CURRENT_VINTAGE_RAW");
  assert.equal(out.tableKey,"Section.3_Flows_Table.3.2");
  assert.equal(out.seriesName,"All - Net");
  assert.equal(out.unit,"PERCENT_OF_LAGGED_NET_ASSETS");
  assert.deepEqual(out.rows,[
    {observationDate:"2019-04-01",value:0.27},
    {observationDate:"2019-05-01",value:-0.11},
    {observationDate:"2019-06-01",value:0.17},
  ]);
});

test("F1-R1 preserves SEC percentage points without dividing by 100",()=>{
  const out=parseSecRegisteredFundFlowPayload(payload([
    {name:"2026-01",x:Date.UTC(2026,0,1),y:0.30},
    {name:"2026-02",x:Date.UTC(2026,1,1),y:0.38},
    {name:"2026-03",x:Date.UTC(2026,2,1),y:0.16},
  ]),{sourceUrl:DATA_URL});
  assert.equal(out.status,"READY_CURRENT_VINTAGE_RAW");
  assert.equal(out.rows.at(-1).value,0.16);
});

test("F1-R1 schema drift or duplicate month fails closed",()=>{
  const noPercent={"Section.3_Flows_Table.3.1":payload()["Section.3_Flows_Table.3.1"]};
  assert.equal(parseSecRegisteredFundFlowPayload(noPercent,{sourceUrl:DATA_URL}).status,"PARTIAL");

  const dup=payload([
    {name:"2026-01",x:Date.UTC(2026,0,1),y:0.1},
    {name:"2026-01",x:Date.UTC(2026,0,1),y:0.2},
  ]);
  const out=parseSecRegisteredFundFlowPayload(dup,{sourceUrl:DATA_URL});
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.rows.length,0);
  assert.equal(out.reason,"SEC_FLOWS_DUPLICATE_MONTH");
});

test("F1-R1 fetch pipeline uses exactly page + JSON requests and exposes no raw payload",async()=>{
  const calls=[];
  const fetchImpl=async input=>{
    const url=String(input);
    calls.push(url);
    if(url.includes("registered-funds-flows")){
      return new Response(`<a href="/files/2026-08/Flows_08-20-2026.json">Flows Statistics</a>`,{status:200});
    }
    if(url===DATA_URL){
      return new Response(JSON.stringify(payload()),{status:200,headers:{"content-type":"application/json"}});
    }
    return new Response("not found",{status:404});
  };
  const out=await fetchSecRegisteredFundFlows({fetchImpl});
  assert.equal(out.status,"READY_CURRENT_VINTAGE_RAW");
  assert.equal(out.requestCount,2);
  assert.equal(out.sourceReleaseDate,"2026-08-20");
  assert.equal(out.rawPayloadExposed,false);
  assert.deepEqual(calls,[
    "https://www.sec.gov/data-research/statistics-data-visualizations/registered-fund-statistics/registered-funds-flows",
    DATA_URL,
  ]);
});

test("F1-R1 upstream failure remains PARTIAL/null-input compatible",async()=>{
  const out=await fetchSecRegisteredFundFlows({
    fetchImpl:async()=>new Response("blocked",{status:403}),
  });
  assert.equal(out.status,"PARTIAL");
  assert.deepEqual(out.rows,[]);
  assert.equal(out.reason,"SEC_FLOWS_PAGE_HTTP_ERROR");
});
