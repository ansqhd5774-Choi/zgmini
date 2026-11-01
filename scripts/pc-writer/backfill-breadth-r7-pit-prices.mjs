import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {createQuotaFetch} from "./quota-fetch.mjs";
import {fetchTickerHistory} from "../../lib/market-score/breadth-b1-r3-provider.mjs";
import {save} from "./d1.mjs";
import {buildBreadthR7PitTrend,deficientPitTickers,monthEndPitDates} from "../../lib/market-score/breadth-r7-pit-shadow.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_NAME="local-breadth-r7-pit-universe.json";
const R6_HISTORY_NAME="local-breadth-r6-shadow-history.json";
const HISTORY_NAME="local-breadth-r7-pit-price-history.json";
const REPORT_NAME="local-breadth-r7-pit-price-backfill-last-run.json";
const MAX_TICKER_HISTORY_CALLS=40;
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const key=(date,ticker)=>date+"|"+ticker;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function addRow(map,row,source){
  const tradeDate=String(row?.tradeDate??row?.trade_date??row?.date??"");
  const ticker=String(row?.ticker??"").trim();
  const currentClose=Number(row?.currentClose??row?.current_close??row?.close);
  const currentVolume=Number(row?.currentVolume??row?.current_volume??row?.volume??0);
  const previousCloseRaw=row?.previousClose??row?.previous_close;
  const previousClose=previousCloseRaw==null?null:Number(previousCloseRaw);
  if(!validDate(tradeDate)||!ticker||!finite(currentClose)||currentClose<=0||!finite(currentVolume)||currentVolume<0)return;
  map.set(key(tradeDate,ticker),{tradeDate,ticker,currentClose,currentVolume,previousClose:finite(previousClose)&&previousClose>0?previousClose:null,source});
}
function loadJson(file){return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,"utf8")):null}
function checkpoint(file,pit,rows,attemptedTickers,unavailableTickers){
  save(file,{
    version:1,methodology:"BREADTH_R7_PIT_PRICE_HISTORY_R1",
    pitEventDigest:pit.eventDigest,currentMemberHash:pit.currentMemberHash,
    first:pit.first,last:pit.last,
    rows:[...rows.values()].sort((a,b)=>a.tradeDate.localeCompare(b.tradeDate)||a.ticker.localeCompare(b.ticker)),
    attemptedTickers:[...attemptedTickers].sort(),
    unavailableTickers:[...unavailableTickers.entries()].sort().map(([ticker,reason])=>({ticker,reason})),
    updatedAt:new Date().toISOString(),
  });
}
export async function backfillBreadthR7PitPrices(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const pitFile=path.join(base,PIT_NAME),historyFile=path.join(base,HISTORY_NAME),reportFile=path.join(base,REPORT_NAME);
  const pit=loadJson(pitFile);
  if(pit?.status!=="READY"||!Array.isArray(pit?.universes)||pit.universes.length<500)throw new Error("BREADTH_R7_PIT_UNIVERSE_NOT_READY");
  const core=localDatabase(path.join(base,"storage","core.sqlite"));
  const originalFetch=globalThis.fetch;
  const quota=createQuotaFetch({base,originalFetch,mode:"enforce"});
  globalThis.fetch=quota.fetch;
  const report={version:1,status:"RUNNING",startedAt:new Date().toISOString(),noPublish:true,dbSchemaChanged:false,productionFormulaChanged:false,providerCalls:0,tickerHistoryCalls:0};
  try{
    const rows=new Map(),attemptedTickers=new Set(),unavailableTickers=new Map();
    const prior=loadJson(historyFile);
    if(prior?.pitEventDigest===pit.eventDigest&&prior?.currentMemberHash===pit.currentMemberHash){
      for(const row of prior.rows??[])addRow(rows,row,row.source??"R7_PRIOR");
      for(const ticker of prior.attemptedTickers??[])attemptedTickers.add(String(ticker));
      for(const item of prior.unavailableTickers??[])unavailableTickers.set(String(item?.ticker??""),String(item?.reason??"UNAVAILABLE"));
    }
    const r6=loadJson(path.join(base,R6_HISTORY_NAME));
    for(const row of r6?.rows??[])if(row?.tradeDate>=pit.first&&row?.tradeDate<=pit.last)addRow(rows,row,row.source??"R6_SHADOW_REUSE");

    const stored=(await core.prepare(
      "SELECT trade_date,ticker,previous_date,previous_close,current_close,current_volume FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date>=? AND trade_date<=? ORDER BY trade_date,ticker"
    ).bind(pit.first,pit.last).all()).results??[];
    for(const row of stored){
      addRow(rows,row,"B1_R3_STORED");
      const pd=String(row?.previous_date??"");
      const pc=Number(row?.previous_close);
      if(validDate(pd)&&pd>=pit.first&&pd<=pit.last&&finite(pc)&&pc>0&&!rows.has(key(pd,String(row.ticker)))){
        addRow(rows,{tradeDate:pd,ticker:row.ticker,currentClose:pc,currentVolume:0},"B1_R3_PREVIOUS_CLOSE");
      }
    }

    const dates=monthEndPitDates(pit.universes,13);
    let deficient=deficientPitTickers({rows:[...rows.values()],universes:pit.universes,dates,minSessions:252});
    report.before={storedRows:rows.size,deficientTickers:deficient.length,targetDates:dates.length};

    const candidates=deficient.filter(item=>!attemptedTickers.has(item.ticker));
    for(const item of candidates.slice(0,MAX_TICKER_HISTORY_CALLS)){
      let result;
      report.providerCalls++;report.tickerHistoryCalls++;
      try{
        result=await fetchTickerHistory({ticker:item.ticker,fetchImpl:globalThis.fetch});
      }catch(error){
        const code=String(error?.message??error?.code??"IEX_HISTORY_ERROR");
        if(/BARS_SYMBOL_HTTP_(404|410)|BARS_HISTORY_EMPTY/.test(code)){
          attemptedTickers.add(item.ticker);unavailableTickers.set(item.ticker,code);
          checkpoint(historyFile,pit,rows,attemptedTickers,unavailableTickers);
          continue;
        }
        throw error;
      }
      attemptedTickers.add(item.ticker);
      for(const bar of result.bars??[]){
        if(bar.date<pit.first||bar.date>pit.last)continue;
        addRow(rows,{tradeDate:bar.date,ticker:item.ticker,currentClose:bar.close,currentVolume:bar.volume},"IEX_HISTORY_PIT_SHADOW");
      }
      checkpoint(historyFile,pit,rows,attemptedTickers,unavailableTickers);
      await sleep(125);
    }

    checkpoint(historyFile,pit,rows,attemptedTickers,unavailableTickers);
    deficient=deficientPitTickers({rows:[...rows.values()],universes:pit.universes,dates,minSessions:252});
    const built=buildBreadthR7PitTrend({rows:[...rows.values()],universes:pit.universes,dates});
    report.targetDates=dates;
    report.storedRows=rows.size;
    report.readyDates=built.readyDates;
    report.requiredDates=dates.length;
    report.deficientTickers=deficient.length;
    report.deficientSample=deficient.slice(0,20);
    report.unavailableTickers=[...unavailableTickers.entries()].sort().map(([ticker,reason])=>({ticker,reason}));
    report.status=built.readyDates===dates.length?"COMPLETE":"PARTIAL_HISTORY";
    report.quota=quota.summary();
    report.completedAt=new Date().toISOString();
    return report;
  }catch(error){
    report.status="FAILED";
    report.error=/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"BREADTH_R7_PIT_PRICE_BACKFILL_FAILED");
    report.quota=quota.summary();
    throw error;
  }finally{
    globalThis.fetch=originalFetch;core.close();save(reportFile,report);
  }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  backfillBreadthR7PitPrices().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"BREADTH_R7_PIT_PRICE_BACKFILL_FAILED")}));
    process.exitCode=1;
  });
}
