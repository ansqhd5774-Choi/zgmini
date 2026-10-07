import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {createQuotaFetch} from "./quota-fetch.mjs";
import {fetchMarketParquetDateSnapshot} from "../../lib/market-score/breadth-b1-r6-marketparquet-provider.mjs";
import {fetchTickerHistory} from "../../lib/market-score/breadth-b1-r3-provider.mjs";
import {previousMarketSession} from "../../lib/market-score/breadth-b1-r6-marketparquet-provider.mjs";
import {save} from "./d1.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const HISTORY_NAME="local-breadth-r6-shadow-history.json";
const REPORT_NAME="local-breadth-r6-shadow-backfill-last-run.json";
const TARGET_SESSIONS=520;
const REQUIRED_PRICE_SESSIONS=512;
const MIN_COVERAGE=.98;
const MAX_DAILY_SNAPSHOTS=12;
const MAX_TICKER_HISTORY_CALLS=80;

const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const memberHash=members=>createHash("sha256").update(JSON.stringify([...members].sort())).digest("hex");
const key=(date,ticker)=>date+"|"+ticker;
export const isMarketParquetTerminalAccessError=error=>/MARKETPARQUET_HTTP_(401|403|404)/.test(String(error?.message??error??""));

export function marketSessionsBack(endDate,count=TARGET_SESSIONS){
  if(!validDate(endDate)||!Number.isInteger(count)||count<1)throw new TypeError("BREADTH_R6_SESSION_RANGE_INVALID");
  const dates=[endDate];
  let cursor=endDate;
  while(dates.length<count){
    cursor=previousMarketSession(cursor);
    if(!cursor)throw new Error("BREADTH_R6_PREVIOUS_SESSION_MISSING");
    dates.push(cursor);
  }
  return dates.reverse();
}

function normalizeSupplementalRows(rows=[]){
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const date=String(row?.tradeDate??row?.date??"");
    const ticker=String(row?.ticker??"").trim();
    const close=Number(row?.currentClose??row?.close);
    const volume=Number(row?.currentVolume??row?.volume??0);
    if(!validDate(date)||!ticker||!finite(close)||close<=0||!finite(volume)||volume<0)continue;
    map.set(key(date,ticker),{tradeDate:date,ticker,currentClose:close,currentVolume:volume,source:String(row?.source??"SHADOW_SUPPLEMENT")});
  }
  return map;
}

function countCoverage(map,members,dateSet){
  const counts=new Map(members.map(ticker=>[ticker,0]));
  for(const row of map.values()){
    if(!dateSet.has(row.tradeDate)||!counts.has(row.ticker))continue;
    counts.set(row.ticker,counts.get(row.ticker)+1);
  }
  const ready=[...counts.entries()].filter(([,count])=>count>=REQUIRED_PRICE_SESSIONS).map(([ticker])=>ticker);
  return {counts,ready,readyCount:ready.length,requiredCount:Math.ceil(members.length*MIN_COVERAGE)};
}

function checkpoint(file,{universeDate,members,rows,attemptedDates,attemptedTickers}){
  save(file,{
    version:1,universeDate,memberCount:members.length,memberHash:memberHash(members),
    targetSessions:TARGET_SESSIONS,requiredPriceSessions:REQUIRED_PRICE_SESSIONS,
    rows:[...rows.values()].sort((a,b)=>a.tradeDate.localeCompare(b.tradeDate)||a.ticker.localeCompare(b.ticker)),
    attemptedDates:[...attemptedDates].sort(),attemptedTickers:[...attemptedTickers].sort(),
    updatedAt:new Date().toISOString(),
  });
}

export async function backfillBreadthR6Shadow(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const core=localDatabase(path.join(base,"storage","core.sqlite"));
  const historyFile=path.join(base,HISTORY_NAME),reportFile=path.join(base,REPORT_NAME);
  const originalFetch=globalThis.fetch;
  const quota=createQuotaFetch({base,originalFetch,mode:"enforce"});
  globalThis.fetch=quota.fetch;
  const report={version:1,status:"RUNNING",startedAt:new Date().toISOString(),noPublish:true,dbSchemaChanged:false,providerCalls:0,dailySnapshotCalls:0,tickerHistoryCalls:0};
  try{
    const universe=await core.prepare(
      "SELECT trade_date,members_json,member_count FROM market_score_breadth_b1_r3_universe_v1 ORDER BY trade_date DESC LIMIT 1"
    ).first();
    const members=(()=>{try{return JSON.parse(universe?.members_json??"[]")}catch{return[]}})()
      .map(x=>String(x??"").trim()).filter(Boolean).sort();
    const universeDate=String(universe?.trade_date??"");
    if(!validDate(universeDate)||members.length<490||members.length>520)throw new Error("BREADTH_R6_CURRENT_UNIVERSE_INVALID");
    if(Number(universe?.member_count)!==members.length)throw new Error("BREADTH_R6_CURRENT_UNIVERSE_COUNT_MISMATCH");

    const targetDates=marketSessionsBack(universeDate,TARGET_SESSIONS),dateSet=new Set(targetDates);
    const rows=normalizeSupplementalRows([]);
    const attemptedDates=new Set(),attemptedTickers=new Set();

    if(fs.existsSync(historyFile)){
      try{
        const prior=JSON.parse(fs.readFileSync(historyFile,"utf8"));
        if(prior?.universeDate===universeDate&&prior?.memberHash===memberHash(members)){
          for(const [k,row] of normalizeSupplementalRows(prior.rows))rows.set(k,row);
          const sameWindow=Number(prior?.targetSessions)===TARGET_SESSIONS&&Number(prior?.requiredPriceSessions)===REQUIRED_PRICE_SESSIONS;
          if(sameWindow){
            for(const date of prior.attemptedDates??[])if(validDate(date))attemptedDates.add(date);
            for(const ticker of prior.attemptedTickers??[])if(members.includes(ticker))attemptedTickers.add(ticker);
          }else report.historyWindowExtended={fromTarget:Number(prior?.targetSessions??0),toTarget:TARGET_SESSIONS};
        }else report.resetReason="CURRENT_UNIVERSE_CHANGED";
      }catch{report.resetReason="SHADOW_HISTORY_CORRUPT"}
    }

    const stored=(await core.prepare(
      "SELECT trade_date,ticker,previous_date,previous_close,current_close,current_volume FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date>=? AND trade_date<=? ORDER BY trade_date,ticker"
    ).bind(targetDates[0],universeDate).all()).results??[];
    const memberSet=new Set(members);
    for(const row of stored){
      const ticker=String(row?.ticker??"").trim();
      if(!memberSet.has(ticker))continue;
      const tradeDate=String(row?.trade_date??""),previousDate=String(row?.previous_date??"");
      const currentClose=Number(row?.current_close),currentVolume=Number(row?.current_volume),previousClose=Number(row?.previous_close);
      if(dateSet.has(tradeDate)&&finite(currentClose)&&currentClose>0&&finite(currentVolume)&&currentVolume>=0){
        rows.set(key(tradeDate,ticker),{tradeDate,ticker,currentClose,currentVolume,source:"B1_R3_STORED"});
      }
      if(dateSet.has(previousDate)&&finite(previousClose)&&previousClose>0&&!rows.has(key(previousDate,ticker))){
        rows.set(key(previousDate,ticker),{tradeDate:previousDate,ticker,currentClose:previousClose,currentVolume:0,source:"B1_R3_PREVIOUS_CLOSE"});
      }
    }

    let coverage=countCoverage(rows,members,dateSet);
    report.before={readyCount:coverage.readyCount,requiredCount:coverage.requiredCount};

    const anyDates=new Set([...rows.values()].map(row=>row.tradeDate));
    const missingGlobalDates=targetDates.filter(date=>!anyDates.has(date)&&!attemptedDates.has(date));
    for(const date of missingGlobalDates.slice(0,MAX_DAILY_SNAPSHOTS)){
      if(coverage.readyCount>=coverage.requiredCount)break;
      report.providerCalls++;
      report.dailySnapshotCalls++;
      try{
        const snap=await fetchMarketParquetDateSnapshot({symbols:members,date,fetchImpl:globalThis.fetch});
        report.providerCalls+=Math.max(0,Number(snap.providerRequests??1)-1);
        attemptedDates.add(date);
        for(const row of snap.rows??[]){
          rows.set(key(date,row.ticker),{tradeDate:date,ticker:row.ticker,currentClose:row.currentClose,currentVolume:row.currentVolume,source:"MARKETPARQUET_SHADOW"});
        }
        checkpoint(historyFile,{universeDate,members,rows,attemptedDates,attemptedTickers});
        coverage=countCoverage(rows,members,dateSet);
      }catch(error){
        if(!isMarketParquetTerminalAccessError(error))throw error;
        report.marketParquetDateStatus="UNAVAILABLE_FALLBACK_IEX";
        report.marketParquetDateError=String(error?.message??error);
        break;
      }
    }

    const deficient=[...coverage.counts.entries()]
      .filter(([,count])=>count<REQUIRED_PRICE_SESSIONS)
      .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
      .map(([ticker])=>ticker)
      .filter(ticker=>!attemptedTickers.has(ticker));
    for(const ticker of deficient.slice(0,MAX_TICKER_HISTORY_CALLS)){
      if(coverage.readyCount>=coverage.requiredCount)break;
      const result=await fetchTickerHistory({ticker,fetchImpl:globalThis.fetch});
      report.providerCalls+=Number(result.providerRequests??1);
      report.tickerHistoryCalls++;
      attemptedTickers.add(ticker);
      for(const bar of result.bars??[]){
        if(!dateSet.has(bar.date))continue;
        const k=key(bar.date,ticker);
        if(!rows.has(k))rows.set(k,{tradeDate:bar.date,ticker,currentClose:bar.close,currentVolume:bar.volume,source:"IEX_HISTORY_SHADOW"});
      }
      checkpoint(historyFile,{universeDate,members,rows,attemptedDates,attemptedTickers});
      coverage=countCoverage(rows,members,dateSet);
      await sleep(125);
    }

    checkpoint(historyFile,{universeDate,members,rows,attemptedDates,attemptedTickers});
    coverage=countCoverage(rows,members,dateSet);
    report.universeDate=universeDate;
    report.targetFirst=targetDates[0];
    report.targetLast=targetDates.at(-1);
    report.memberCount=members.length;
    report.requiredCount=coverage.requiredCount;
    report.readyCount=coverage.readyCount;
    report.remaining=Math.max(0,coverage.requiredCount-coverage.readyCount);
    report.storedRows=rows.size;
    report.quota=quota.summary();
    report.status=coverage.readyCount>=coverage.requiredCount?"COMPLETE":"PARTIAL_HISTORY";
    report.completedAt=new Date().toISOString();
    return report;
  }catch(error){
    report.status="FAILED";
    report.error=/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"BREADTH_R6_SHADOW_BACKFILL_FAILED");
    report.quota=quota.summary();
    throw error;
  }finally{
    globalThis.fetch=originalFetch;
    core.close();
    save(reportFile,report);
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  backfillBreadthR6Shadow().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"BREADTH_R6_SHADOW_BACKFILL_FAILED")}));
    process.exitCode=1;
  });
}
