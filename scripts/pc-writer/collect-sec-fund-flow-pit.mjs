import path from "node:path";
import os from "node:os";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {createQuotaFetch} from "./quota-fetch.mjs";
import {marketOperationalStore} from "../../worker/market-operational-store.mjs";
import {save} from "./d1.mjs";
import {SEC_FUND_FLOW_VINTAGE_CATALOG_R1,validateSecFundFlowVintageCatalogR1} from "../../lib/market-score/sec-fund-flow-vintage-catalog-r1.mjs";
import {parseSecFundFlowSupportingXlsx,SEC_FUND_FLOW_XLSX_PARSER_R1} from "../../lib/market-score/sec-fund-flow-xlsx-r1.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const BATCH_KEY="shadowSecFundFlowPit";
const REPORT_NAME="local-sec-fund-flow-pit-collection-last-run.json";
const MAX_XLSX_BYTES=20_000_000;
const SEC_STATS_PAGE="https://www.sec.gov/data-research/investment-management-data/division-investment-management-registered-fund-statistics";
const USER_AGENT="ZGMINI/1.0 (+https://zgmini.kr)";
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const SEC_HEADERS=Object.freeze({
  "user-agent":USER_AGENT,
  "accept-encoding":"gzip, deflate",
  "referer":SEC_STATS_PAGE,
});


function normalizedVintage(item,parsed,bytes){
  return {
    periodEnd:item.periodEnd,
    availableAt:item.availableAt,
    filingsThrough:item.filingsThrough,
    supportingDataUrl:item.supportingDataUrl,
    parserVersion:SEC_FUND_FLOW_XLSX_PARSER_R1,
    sourceSha256:createHash("sha256").update(bytes).digest("hex"),
    byteLength:bytes.length,
    sheetName:parsed.sheetName,
    rows:parsed.rows,
  };
}
function sameContract(a,b){
  return a?.periodEnd===b?.periodEnd&&a?.availableAt===b?.availableAt&&a?.filingsThrough===b?.filingsThrough&&a?.supportingDataUrl===b?.supportingDataUrl&&a?.parserVersion===SEC_FUND_FLOW_XLSX_PARSER_R1&&Array.isArray(a?.rows)&&a.rows.length===12;
}
function periodLabel(periodEnd){
  const [y,m]=periodEnd.split("-").map(Number);
  const month=new Intl.DateTimeFormat("en-US",{month:"long",timeZone:"UTC"}).format(new Date(Date.UTC(y,m-1,1)));
  return "Period Ending "+month+" "+y;
}
export function resolveSecSupportingDataUrlFromPage(html,periodEnd,{pageUrl=SEC_STATS_PAGE}={}){
  const wanted=periodLabel(periodEnd).toLowerCase();
  for(const match of String(html??"").matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)){
    const text=match[1].replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim().toLowerCase();
    if(!text.includes(wanted))continue;
    for(const href of match[1].matchAll(/href\s*=\s*["']([^"']+\.xlsx(?:\?[^"']*)?)["']/gi)){
      try{
        const url=new URL(href[1],pageUrl);
        if(url.protocol==="https:"&&url.hostname==="www.sec.gov")return url.href;
      }catch{}
    }
  }
  return null;
}
async function fetchSecSupportingData(item,{fetchImpl=globalThis.fetch,report}={}){
  const request=async url=>{
    report.providerCalls++;
    report.currentPeriod=item.periodEnd;
    report.currentUrl=url;
    return fetchImpl(url,{
      headers:{...SEC_HEADERS,accept:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream;q=0.9,*/*;q=0.1"},
      redirect:"follow",
      signal:AbortSignal.timeout(30000),
    });
  };
  let response=await request(item.supportingDataUrl);
  if(response.status!==404)return {response,resolvedUrl:item.supportingDataUrl,discovered:false,retried:false};

  await sleep(1100);
  report.providerCalls++;
  const page=await fetchImpl(SEC_STATS_PAGE,{
    headers:{...SEC_HEADERS,accept:"text/html,application/xhtml+xml"},
    redirect:"follow",
    signal:AbortSignal.timeout(30000),
  });
  if(!page.ok)throw new Error("SEC_FUND_FLOW_INDEX_HTTP_"+String(page.status??0));
  const discovered=resolveSecSupportingDataUrlFromPage(await page.text(),item.periodEnd);
  if(!discovered)throw new Error("SEC_FUND_FLOW_SUPPORTING_LINK_NOT_FOUND");

  await sleep(1100);
  response=await request(discovered);
  return {response,resolvedUrl:discovered,discovered:true,retried:true};
}

export async function collectSecFundFlowPit(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const catalogCheck=validateSecFundFlowVintageCatalogR1();
  if(catalogCheck.status!=="PASS")throw new Error("SEC_FUND_FLOW_VINTAGE_CATALOG_INVALID");
  const core=localDatabase(path.join(base,"storage","core.sqlite"));
  const store=marketOperationalStore(core);
  const originalFetch=globalThis.fetch;
  const quota=createQuotaFetch({base,originalFetch,mode:"enforce"});
  globalThis.fetch=quota.fetch;
  const report={version:1,status:"RUNNING",at:new Date().toISOString(),noPublish:true,dbSchemaChanged:false,providerCalls:0,reused:0,fetched:0,stored:false};
  try{
    const prior=await store.readInput(BATCH_KEY);
    const priorByPeriod=new Map((prior?.body?.vintages??[]).map(item=>[item?.periodEnd,item]));
    const vintages=[];
    for(const item of SEC_FUND_FLOW_VINTAGE_CATALOG_R1){
      const existing=priorByPeriod.get(item.periodEnd);
      if(sameContract(existing,item)){
        vintages.push(existing);
        report.reused++;
        continue;
      }
      const fetched=await fetchSecSupportingData(item,{fetchImpl:globalThis.fetch,report});
      const response=fetched.response;
      report.resolvedUrl=fetched.resolvedUrl;
      report.discoveryFallbackUsed=Boolean(fetched.discovered);
      report.retryUsed=Boolean(fetched.retried);
      if(!response.ok)throw new Error("SEC_FUND_FLOW_XLSX_HTTP_"+String(response.status??0));
      const hinted=Number(response.headers?.get?.("content-length")??0);
      if(Number.isFinite(hinted)&&hinted>MAX_XLSX_BYTES)throw new Error("SEC_FUND_FLOW_XLSX_BODY_LIMIT");
      const bytes=Buffer.from(await response.arrayBuffer());
      if(bytes.length<100||bytes.length>MAX_XLSX_BYTES||bytes[0]!==0x50||bytes[1]!==0x4b)throw new Error("SEC_FUND_FLOW_XLSX_BODY_INVALID");
      const parsed=parseSecFundFlowSupportingXlsx(bytes,{periodEnd:item.periodEnd});
      const normalized=normalizedVintage({...item,supportingDataUrl:fetched.resolvedUrl},parsed,bytes);
      vintages.push(normalized);
      report.fetched++;
      await store.writeInput(BATCH_KEY,{
        vintages:[...vintages].sort((a,b)=>a.availableAt.localeCompare(b.availableAt)),
        source:"U.S. SEC Registered Fund Statistics Supporting Data",
        historyMode:"SEC_RELEASE_VINTAGE_PIT",
        lookAheadSafe:true,
        storedForShadowOnly:true,
        parserVersion:SEC_FUND_FLOW_XLSX_PARSER_R1,
      },Date.now());
      await sleep(175);
    }
    const sorted=vintages.sort((a,b)=>a.availableAt.localeCompare(b.availableAt));
    if(sorted.length!==SEC_FUND_FLOW_VINTAGE_CATALOG_R1.length)throw new Error("SEC_FUND_FLOW_PIT_COLLECTION_INCOMPLETE");
    report.status="STORED";
    report.stored=true;
    report.currentPeriod=null;
    report.currentUrl=null;
    report.vintages=sorted.length;
    report.first=sorted[0].periodEnd;
    report.last=sorted.at(-1).periodEnd;
    report.firstAvailableAt=sorted[0].availableAt;
    report.lastAvailableAt=sorted.at(-1).availableAt;
    report.quota=quota.summary();
    return report;
  }catch(error){
    report.status="FAILED";
    report.error=/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"SEC_FUND_FLOW_PIT_COLLECTION_FAILED");
    if(Array.isArray(error?.candidateSheets))report.candidateSheets=error.candidateSheets;
    report.quota=quota.summary();
    throw error;
  }finally{
    globalThis.fetch=originalFetch;
    core.close();
    save(path.join(base,REPORT_NAME),report);
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  collectSecFundFlowPit().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"SEC_FUND_FLOW_PIT_COLLECTION_FAILED")}));
    process.exitCode=1;
  });
}
