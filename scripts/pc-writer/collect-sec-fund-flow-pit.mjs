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
const USER_AGENT="ZGMINI/1.0 (+https://zgmini.kr)";
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

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
      const response=await globalThis.fetch(item.supportingDataUrl,{
        headers:{accept:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream;q=0.9,*/*;q=0.1","user-agent":USER_AGENT},
        redirect:"follow",
        signal:AbortSignal.timeout(30000),
      });
      report.providerCalls++;
      if(!response.ok)throw new Error("SEC_FUND_FLOW_XLSX_HTTP_"+String(response.status??0));
      const hinted=Number(response.headers?.get?.("content-length")??0);
      if(Number.isFinite(hinted)&&hinted>MAX_XLSX_BYTES)throw new Error("SEC_FUND_FLOW_XLSX_BODY_LIMIT");
      const bytes=Buffer.from(await response.arrayBuffer());
      if(bytes.length<100||bytes.length>MAX_XLSX_BYTES||bytes[0]!==0x50||bytes[1]!==0x4b)throw new Error("SEC_FUND_FLOW_XLSX_BODY_INVALID");
      const parsed=parseSecFundFlowSupportingXlsx(bytes,{periodEnd:item.periodEnd});
      vintages.push(normalizedVintage(item,parsed,bytes));
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
