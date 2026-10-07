import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {createQuotaFetch} from "./quota-fetch.mjs";
import {previousMarketSession} from "../../lib/market-score/breadth-b1-r6-marketparquet-provider.mjs";
import {save} from "./d1.mjs";
import {
  SP500_PIT_UNIVERSE_METHOD,
  extractSpGlobalArchiveEntries,
  isSp500MembershipHeadline,
  parseSp500ChangeRows,
  reconstructPitUniverses,
} from "../../lib/market-score/sp500-pit-universe-r1.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const OUTPUT_NAME="local-breadth-r7-pit-universe.json";
const REPORT_NAME="local-breadth-r7-pit-universe-last-run.json";
const TARGET_SESSIONS=520;
const ARCHIVE_PAGE_SIZE=100;
const MAX_ARCHIVE_PAGES=5;
const MAX_RELEASE_CALLS=60;
const USER_AGENT="ZGMINI/1.0 (+https://zgmini.kr)";
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const memberHash=members=>createHash("sha256").update(JSON.stringify([...members].sort())).digest("hex");

function addDays(date,n){return new Date(Date.parse(date+"T00:00:00Z")+n*86400000).toISOString().slice(0,10)}
function targetSessions(endDate,count=TARGET_SESSIONS){
  if(!validDate(endDate)||!Number.isInteger(count)||count<2)throw new Error("SP500_PIT_TARGET_WINDOW_INVALID");
  const out=[endDate];let cursor=endDate;
  while(out.length<count){
    cursor=previousMarketSession(cursor);
    if(!cursor)throw new Error("SP500_PIT_PREVIOUS_SESSION_MISSING");
    out.push(cursor);
  }
  return out.reverse();
}
function archiveUrl(offset){
  return `https://press.spglobal.com/index.php?keywords=s%26P+500+index&l=${ARCHIVE_PAGE_SIZE}&o=${offset}&s=2429`;
}
async function fetchText(fetchImpl,url,label){
  const response=await fetchImpl(url,{headers:{accept:"text/html,application/xhtml+xml","user-agent":USER_AGENT},redirect:"follow",signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error(`${label}_HTTP_${response.status??0}`);
  return response.text();
}
function sourceDigest(events){
  return createHash("sha256").update(JSON.stringify(events.map(({effectiveDate,action,ticker,sourceUrl,releaseDate})=>({effectiveDate,action,ticker,sourceUrl,releaseDate})))).digest("hex");
}

export async function buildBreadthR7PitUniverse(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const core=localDatabase(path.join(base,"storage","core.sqlite"));
  const originalFetch=globalThis.fetch;
  const quota=createQuotaFetch({base,originalFetch,mode:"enforce"});
  globalThis.fetch=quota.fetch;
  const report={version:1,status:"RUNNING",methodologyVersion:SP500_PIT_UNIVERSE_METHOD,startedAt:new Date().toISOString(),providerCalls:0,noPublish:true,dbSchemaChanged:false,productionFormulaChanged:false};
  try{
    const universe=await core.prepare(
      "SELECT trade_date,members_json,member_count FROM market_score_breadth_b1_r3_universe_v1 ORDER BY trade_date DESC LIMIT 1"
    ).first();
    const currentDate=String(universe?.trade_date??"");
    const currentMembers=(()=>{try{return JSON.parse(universe?.members_json??"[]")}catch{return[]}})();
    if(!validDate(currentDate)||currentMembers.length<490||currentMembers.length>520)throw new Error("SP500_PIT_CURRENT_UNIVERSE_MISSING");
    const dates=targetSessions(currentDate,TARGET_SESSIONS);
    const archiveStart=addDays(dates[0],-90);

    const archiveEntries=new Map();
    let archiveCovered=false;
    for(let page=0;page<MAX_ARCHIVE_PAGES;page++){
      const url=archiveUrl(page*ARCHIVE_PAGE_SIZE);
      report.providerCalls++;
      const html=await fetchText(globalThis.fetch,url,"SP500_PIT_ARCHIVE");
      const entries=extractSpGlobalArchiveEntries(html);
      for(const item of entries)archiveEntries.set(item.url,item);
      const oldest=entries.map(item=>item.releaseDate).sort()[0]??null;
      if(oldest&&oldest<=archiveStart){archiveCovered=true;break}
      await sleep(250);
    }
    if(!archiveCovered)throw new Error("SP500_PIT_ARCHIVE_WINDOW_SHORT");

    const candidates=[...archiveEntries.values()]
      .filter(item=>item.releaseDate>=archiveStart&&item.releaseDate<=currentDate&&isSp500MembershipHeadline(item.title))
      .sort((a,b)=>a.releaseDate.localeCompare(b.releaseDate)||a.url.localeCompare(b.url));
    if(!candidates.length||candidates.length>MAX_RELEASE_CALLS)throw new Error("SP500_PIT_RELEASE_CANDIDATE_COUNT_INVALID");

    const events=[],releaseAudit=[];
    for(const release of candidates){
      report.providerCalls++;
      const html=await fetchText(globalThis.fetch,release.url,"SP500_PIT_RELEASE");
      const parsed=parseSp500ChangeRows(html,{sourceUrl:release.url,releaseDate:release.releaseDate});
      releaseAudit.push({releaseDate:release.releaseDate,title:release.title,url:release.url,eventRows:parsed.length});
      if(!parsed.length){
        report.failedRelease={releaseDate:release.releaseDate,title:release.title,url:release.url};
        throw new Error("SP500_PIT_RELEASE_PARSE_MISSING");
      }
      events.push(...parsed);
      await sleep(250);
    }
    const uniqueEvents=new Map();
    for(const event of events){
      const key=`${event.effectiveDate}|${event.action}|${event.ticker}`;
      if(!uniqueEvents.has(key))uniqueEvents.set(key,event);
    }
    const relevantEvents=[...uniqueEvents.values()].filter(event=>event.effectiveDate>dates[0]&&event.effectiveDate<=currentDate);
    if(!relevantEvents.length)throw new Error("SP500_PIT_NO_RELEVANT_EVENTS");

    const reconstructed=reconstructPitUniverses({currentMembers,currentDate,targetDates:dates,events:relevantEvents});
    if(reconstructed.anomalies.length)throw new Error("SP500_PIT_EVENT_CONSISTENCY_FAILED");
    const counts=reconstructed.universes.map(item=>item.memberCount);
    const minCount=Math.min(...counts),maxCount=Math.max(...counts);
    if(minCount<490||maxCount>520)throw new Error("SP500_PIT_RECONSTRUCTED_COUNT_INVALID");

    const uniqueMembers=[...new Set(reconstructed.universes.flatMap(item=>item.members))].sort();
    const output={
      version:1,
      status:"READY",
      methodologyVersion:SP500_PIT_UNIVERSE_METHOD,
      sourceAuthority:"S&P Dow Jones Indices / S&P Global Press Releases",
      sourceMode:"OFFICIAL_EFFECTIVE_DATE_CHANGE_HISTORY_REVERSED_FROM_CURRENT_UNIVERSE",
      currentDate,
      currentMemberCount:currentMembers.length,
      currentMemberHash:memberHash(currentMembers),
      targetSessions:dates.length,
      first:dates[0],
      last:dates.at(-1),
      archiveStart,
      releaseAudit,
      events:relevantEvents.sort((a,b)=>a.effectiveDate.localeCompare(b.effectiveDate)||a.action.localeCompare(b.action)||a.ticker.localeCompare(b.ticker)),
      eventDigest:sourceDigest(relevantEvents),
      uniqueHistoricalMembers:uniqueMembers,
      universes:reconstructed.universes,
      membershipLookAheadSafe:true,
      currentUniverseSurvivorshipBiasRemoved:true,
      productionFormulaChanged:false,
      publicMutation:false,
    };
    save(path.join(base,OUTPUT_NAME),output);

    report.status="READY";
    report.currentDate=currentDate;
    report.currentMembers=currentMembers.length;
    report.first=dates[0];
    report.last=dates.at(-1);
    report.archiveEntries=archiveEntries.size;
    report.candidateReleases=candidates.length;
    report.parsedReleases=releaseAudit.filter(item=>item.eventRows>0).length;
    report.relevantEvents=relevantEvents.length;
    report.uniqueHistoricalMembers=uniqueMembers.length;
    report.minMemberCount=minCount;
    report.maxMemberCount=maxCount;
    report.anomalies=0;
    report.output=path.join(base,OUTPUT_NAME);
    report.quota=quota.summary();
    report.completedAt=new Date().toISOString();
    return report;
  }catch(error){
    report.status="FAILED";
    report.error=/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"SP500_PIT_BUILD_FAILED");
    report.quota=quota.summary();
    throw error;
  }finally{
    globalThis.fetch=originalFetch;
    core.close();
    save(path.join(base,REPORT_NAME),report);
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  buildBreadthR7PitUniverse().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"SP500_PIT_BUILD_FAILED")}));
    process.exitCode=1;
  });
}
