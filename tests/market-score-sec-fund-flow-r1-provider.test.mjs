import test from "node:test";
import assert from "node:assert/strict";
import {
  fetchSecRegisteredFundFlows,
  parseSecRegisteredFundFlowPayload,
  releaseDateFromSecFlowsUrl,
  resolveSecFundFlowsJsonUrl,
  SEC_REGISTERED_FUND_FLOWS_SERIES,
  SEC_REGISTERED_FUND_FLOWS_SERIES_NAMES,
  SEC_REGISTERED_FUND_FLOWS_TABLE_TITLE,
} from "../lib/market-score/sec-fund-flow-r1-provider.mjs";

const DATA_URL="https://www.sec.gov/files/2026-08/Flows_08-20-2026.json";
const point=(month,value)=>{const [y,m]=month.split("-").map(Number);return {name:month,x:Date.UTC(y,m-1,1),y:value}};
const defaults={
 allNet:[point("2019-04",0.27),point("2019-05",-0.11),point("2019-06",0.17)],
 indexNet:[point("2019-04",0.45),point("2019-05",0.20),point("2019-06",0.33)],
 nonIndexNet:[point("2019-04",-0.08),point("2019-05",-0.31),point("2019-06",-0.12)],
 allOutflow:[point("2019-04",-2.5),point("2019-05",-2.8),point("2019-06",-2.6)],
};
function payload(series={}){
 const s={...defaults,...series};
 return {
  "Section.3_Flows_Table.3.1":{metadata:{title:"Aggregate Inflows, Outflows, and Net Flows of Index and Non-Index Funds (USD)"},data:{"all-data":[]}},
  "Section.3_Flows_Table.3.2":{metadata:{title:SEC_REGISTERED_FUND_FLOWS_TABLE_TITLE},data:{"all-data":[
   {name:"All - Inflow",data:[]},
   {name:SEC_REGISTERED_FUND_FLOWS_SERIES_NAMES.allNet,data:s.allNet},
   {name:SEC_REGISTERED_FUND_FLOWS_SERIES_NAMES.indexNet,data:s.indexNet},
   {name:SEC_REGISTERED_FUND_FLOWS_SERIES_NAMES.nonIndexNet,data:s.nonIndexNet},
   {name:SEC_REGISTERED_FUND_FLOWS_SERIES_NAMES.allOutflow,data:s.allOutflow},
  ]}},
 };
}

test("R54 resolves exactly one official SEC dated Flows JSON link",()=>{
 const html=`<a href="/files/2026-08/Flows_08-20-2026.json">Flows Statistics</a>`;
 assert.equal(resolveSecFundFlowsJsonUrl(html),DATA_URL);
 assert.equal(releaseDateFromSecFlowsUrl(DATA_URL),"2026-08-20");
});
test("R54 parser stores all four approved Table 3.2 percentage series on each month",()=>{
 const out=parseSecRegisteredFundFlowPayload(payload(),{sourceUrl:DATA_URL});
 assert.equal(out.status,"READY_CURRENT_VINTAGE_RAW");
 assert.equal(out.seriesName,SEC_REGISTERED_FUND_FLOWS_SERIES);
 assert.deepEqual(out.rows,[
  {observationDate:"2019-04-01",value:0.27,allNetRatio:0.27,indexNetRatio:0.45,nonIndexNetRatio:-0.08,allOutflowRatio:-2.5},
  {observationDate:"2019-05-01",value:-0.11,allNetRatio:-0.11,indexNetRatio:0.20,nonIndexNetRatio:-0.31,allOutflowRatio:-2.8},
  {observationDate:"2019-06-01",value:0.17,allNetRatio:0.17,indexNetRatio:0.33,nonIndexNetRatio:-0.12,allOutflowRatio:-2.6},
 ]);
});
test("R54 preserves SEC percentage points without dividing by 100",()=>{
 const months=["2026-01","2026-02","2026-03"];
 const mk=values=>months.map((m,i)=>point(m,values[i]));
 const out=parseSecRegisteredFundFlowPayload(payload({allNet:mk([0.30,0.38,0.16]),indexNet:mk([0.41,0.44,0.25]),nonIndexNet:mk([-0.11,-0.06,-0.09]),allOutflow:mk([-2.5,-2.7,-2.6])}),{sourceUrl:DATA_URL});
 assert.equal(out.rows.at(-1).allNetRatio,0.16);
 assert.equal(out.rows.at(-1).indexNetRatio,0.25);
 assert.equal(out.rows.at(-1).nonIndexNetRatio,-0.09);
 assert.equal(out.rows.at(-1).allOutflowRatio,-2.6);
});
test("R54 missing required series or misaligned months fails closed",()=>{
 const missing=payload();missing["Section.3_Flows_Table.3.2"].data["all-data"]=missing["Section.3_Flows_Table.3.2"].data["all-data"].filter(x=>x.name!=="Non-Index - Net");
 const a=parseSecRegisteredFundFlowPayload(missing,{sourceUrl:DATA_URL});
 assert.equal(a.status,"PARTIAL");assert.equal(a.reason,"SEC_FLOWS_REQUIRED_SERIES_NOT_UNIQUE");
 const mismatch=parseSecRegisteredFundFlowPayload(payload({indexNet:defaults.indexNet.slice(0,2)}),{sourceUrl:DATA_URL});
 assert.equal(mismatch.status,"PARTIAL");assert.equal(mismatch.reason,"SEC_FLOWS_SERIES_DATE_MISMATCH");
});
test("R54 duplicate month fails closed",()=>{
 const out=parseSecRegisteredFundFlowPayload(payload({allNet:[point("2026-01",0.1),point("2026-01",0.2)]}),{sourceUrl:DATA_URL});
 assert.equal(out.status,"PARTIAL");assert.equal(out.reason,"SEC_FLOWS_DUPLICATE_MONTH");assert.deepEqual(out.rows,[]);
});
test("R54 fetch pipeline remains page + JSON only and exposes no raw payload",async()=>{
 const calls=[];
 const fetchImpl=async input=>{const url=String(input);calls.push(url);
  if(url.includes("registered-funds-flows"))return new Response(`<a href="/files/2026-08/Flows_08-20-2026.json">Flows Statistics</a>`,{status:200});
  if(url===DATA_URL)return new Response(JSON.stringify(payload()),{status:200,headers:{"content-type":"application/json"}});
  return new Response("not found",{status:404});
 };
 const out=await fetchSecRegisteredFundFlows({fetchImpl});
 assert.equal(out.status,"READY_CURRENT_VINTAGE_RAW");assert.equal(out.requestCount,2);assert.equal(out.rawPayloadExposed,false);
});
