import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {loadLocalProviders} from "./local-env.mjs";
import {createQuotaFetch} from "./quota-fetch.mjs";
import {marketOperationalStore} from "../../worker/market-operational-store.mjs";
import {dollarPitFredUrl,parseDollarPitFredPage,pointInTimeDollarRows} from "./collect-dollar-r21-pit-shadow.mjs";
import {save} from "./d1.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const REPORT_NAME="local-dollar-r24-final-pit-collection-last-run.json";
const BATCH_KEY="shadowDollarFxR24FinalPit";
const FINAL_HOLDOUT_SIGNALS=500;
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function minusYears(date,years){
  const [y,m,d]=date.split("-").map(Number);
  return new Date(Date.UTC(y-years,m-1,d)).toISOString().slice(0,10);
}
function minusDays(date,days){
  return new Date(Date.parse(date+"T00:00:00Z")-days*86400000).toISOString().slice(0,10);
}

export function selectFinalHoldoutDates(benchmarkRows,externalStart,{count=FINAL_HOLDOUT_SIGNALS}={}){
  if(!validDate(externalStart)||!Number.isInteger(count)||count!==FINAL_HOLDOUT_SIGNALS)throw new Error("DOLLAR_R24_FINAL_RANGE_INVALID");
  const dates=[...new Set((Array.isArray(benchmarkRows)?benchmarkRows:[])
    .map(row=>String(row?.observationDate??row?.label??"").slice(0,10))
    .filter(date=>validDate(date)&&date<externalStart))]
    .sort()
    .slice(-count);
  if(dates.length!==count)throw new Error("DOLLAR_R24_FINAL_BENCHMARK_SHORT");
  if(dates.at(-1)>=externalStart)throw new Error("DOLLAR_R24_FINAL_OVERLAP");
  return dates;
}

export async function collectDollarR24FinalPit(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const core=localDatabase(path.join(base,"storage","core.sqlite"));
  const store=marketOperationalStore(core);
  const originalFetch=globalThis.fetch;
  const quota=createQuotaFetch({base,originalFetch,mode:"enforce"});
  globalThis.fetch=quota.fetch;
  const report={version:1,status:"RUNNING",at:new Date().toISOString(),noPublish:true,dbSchemaChanged:false,providerCalls:0,finalHoldoutSignals:FINAL_HOLDOUT_SIGNALS};
  try{
    const [externalBatch,benchmarkBatch]=await Promise.all([
      store.readInput("shadowDollarFxR23ExternalPit"),
      store.readInput("shadowSp500Benchmark"),
    ]);
    const externalStart=externalBatch?.body?.signalDates?.[0]??null;
    const benchmark=benchmarkBatch?.body?.series?.SP500??[];
    if(!externalBatch?.body?.lookAheadSafe||!externalBatch?.body?.independentOfDesignSample||!validDate(externalStart)||benchmark.length<1500)throw new Error("DOLLAR_R24_FINAL_INPUT_MISSING");

    const signalDates=selectFinalHoldoutDates(benchmark,externalStart);
    const signalVintagePairs=signalDates.map(signalDate=>({signalDate,vintageDate:minusDays(signalDate,1)}));
    const vintageDates=[...new Set(signalVintagePairs.map(item=>item.vintageDate))].sort();
    const observationStart=minusYears(signalDates[0],3);
    const observationEnd=signalDates.at(-1);

    const env=loadLocalProviders(base);
    const key=String(env?.FRED_API_KEY??"").trim();
    if(!key)throw new Error("FRED_API_KEY_MISSING");

    const revisions=new Map();
    let totalCount=null;
    const PAGE_LIMIT=100000;
    for(let page=0;page<4;page++){
      const offset=page*PAGE_LIMIT;
      const response=await globalThis.fetch(dollarPitFredUrl({key,vintageDates,observationStart,observationEnd,offset}),{headers:{accept:"application/json"}});
      report.providerCalls++;
      if(!response.ok)throw new Error(response.status===429?"DOLLAR_R24_FINAL_FRED_QUOTA":"DOLLAR_R24_FINAL_FRED_HTTP");
      const parsed=parseDollarPitFredPage(await response.json(),{expectedOffset:offset,observationStart,observationEnd});
      if(totalCount===null)totalCount=parsed.count;
      if(parsed.count!==totalCount)throw new Error("DOLLAR_R24_FINAL_COUNT_CHANGED");
      for(const row of parsed.rows){
        const k=[row.observationDate,row.realtimeStart,row.realtimeEnd].join("|");
        const prior=revisions.get(k);
        if(prior&&prior.value!==row.value)throw new Error("DOLLAR_R24_FINAL_DUPLICATE_CONFLICT");
        revisions.set(k,row);
      }
      if(offset+parsed.received>=totalCount)break;
      if(page===3)throw new Error("DOLLAR_R24_FINAL_PAGE_CAP_EXCEEDED");
      await sleep(550);
    }

    const rows=[...revisions.values()].sort((a,b)=>a.observationDate.localeCompare(b.observationDate)||a.realtimeStart.localeCompare(b.realtimeStart));
    if(rows.length<252)throw new Error("DOLLAR_R24_FINAL_HISTORY_SHORT");
    const firstRows=pointInTimeDollarRows(rows,signalVintagePairs[0].vintageDate);
    const lastRows=pointInTimeDollarRows(rows,signalVintagePairs.at(-1).vintageDate);
    if(firstRows.length<252||lastRows.length<252)throw new Error("DOLLAR_R24_FINAL_VINTAGE_COVERAGE_SHORT");

    await store.writeInput(BATCH_KEY,{
      series:{DTWEXBGS_PIT_REVISIONS:rows},
      signalDates,
      signalVintagePairs,
      source:"FRED/ALFRED DTWEXBGS",
      historyMode:"ALFRED_PRIOR_DAY_PIT_OUTPUT_TYPE_1",
      informationCutoffPolicy:"PRIOR_CALENDAR_DAY",
      lookAheadSafe:true,
      storedForShadowOnly:true,
      independentOfDesignSample:true,
      independentOfExternalSample:true,
      finalHoldout:true,
      externalStart,
      observationStart,
      observationEnd,
    },Date.now());

    report.status="STORED";
    report.externalStart=externalStart;
    report.firstSignal=signalDates[0];
    report.lastSignal=signalDates.at(-1);
    report.revisionRows=rows.length;
    report.firstVintageRows=firstRows.length;
    report.lastVintageRows=lastRows.length;
    report.quota=quota.summary();
    return report;
  }catch(error){
    report.status="FAILED";
    report.error=/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"DOLLAR_R24_FINAL_COLLECTION_FAILED");
    report.quota=quota.summary();
    throw error;
  }finally{
    globalThis.fetch=originalFetch;
    core.close();
    save(path.join(base,REPORT_NAME),report);
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  collectDollarR24FinalPit().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"DOLLAR_R24_FINAL_COLLECTION_FAILED")}));
    process.exitCode=1;
  });
}
