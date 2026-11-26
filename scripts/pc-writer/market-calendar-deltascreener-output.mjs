// PC Writer: saved November calendar and pinned private CSV -> derived R44.
// No provider calls; no original CSV, market caps or issuer names leave SQLite.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {parseEarningsApiDay} from '../../lib/earnings-api-calendar.mjs';
import {parseDeltaScreenerCsv,gradeCalendarTickersFromDelta,
 DELTASCREENER_UPLOAD_SHA256} from '../../lib/market-calendar-deltascreener-snapshot.mjs';
import {makeDeltaR44Public,DELTA_R44_OUTPUT_KEY} from '../../lib/market-calendar-deltascreener-public.mjs';
import {DELTA_PRIVATE_INPUT_KEY} from './market-calendar-deltascreener-input.mjs';
const PREFIX='release-calendar:earnings-api:';
const MAX_ARCHIVE=2_001_024;
const days=()=>Array.from({length:30},(_,i)=>'2026-11-'+String(i+1).padStart(2,'0'));
const sha=text=>createHash('sha256').update(Buffer.from(text,'utf8')).digest('hex');

function privateArchive(pcHome,day){
 const filename=path.join(pcHome,'er1-input','nov30-forward-days',day+'.json');
 let stat;try{stat=fs.lstatSync(filename)}catch{return null}
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<2||stat.size>MAX_ARCHIVE)
  throw Error('DELTA_ARCHIVE_INVALID');
 const stored=JSON.parse(fs.readFileSync(filename,'utf8'));
 if(stored?.body?.date!==day||!Number.isFinite(Date.parse(stored.storedAt)))
  throw Error('DELTA_ARCHIVE_INVALID');
 return JSON.stringify(stored.body);
}

export async function refreshSavedDeltaR44Output({store,now=Date.now(),
 pcHome=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer')}={}){
 if(!store||typeof store.readInput!=='function'||
    typeof store.readOutput!=='function'||typeof store.writeOutput!=='function'||
    !Number.isSafeInteger(now)||!path.isAbsolute(pcHome))
  throw Error('DELTA_WRITER_INPUT_INVALID');
 const source=await store.readInput(DELTA_PRIVATE_INPUT_KEY);
 if(!source)return {status:'SOURCE_INPUT_MISSING',providerRequests:0};
 const raw=source.body;
 if(typeof raw?.text!=='string'||sha(raw.text)!==DELTASCREENER_UPLOAD_SHA256||
    raw.sha256!==DELTASCREENER_UPLOAD_SHA256)
  return {status:'SOURCE_INPUT_INVALID_PRESERVED',providerRequests:0};
 let parsed;try{parsed=parseDeltaScreenerCsv(raw.text)}
 catch{return {status:'SOURCE_CSV_INVALID_PRESERVED',providerRequests:0}}
 if(parsed.coverage.rawRows!==4894)return {status:'SOURCE_COVERAGE_INVALID',providerRequests:0};
 const tickers=new Set();let sqliteDays=0,privateDays=0;
 for(const day of days()){
  const saved=await store.readInput(PREFIX+day);
  let text=typeof saved?.body?.text==='string'&&saved.body.requestedDate===day?
   saved.body.text:null;
  if(text)sqliteDays++;
  else {
   try{text=privateArchive(pcHome,day)}catch{
    return {status:'SAVED_MONTH_INVALID_PRESERVED',providerRequests:0}
   }
   if(text)privateDays++;
  }
  if(!text)return {status:'SAVED_MONTH_INCOMPLETE',providerRequests:0};
  let entries;try{entries=parseEarningsApiDay(text,day)}
  catch{return {status:'SAVED_MONTH_INVALID_PRESERVED',providerRequests:0}}
  for(const row of entries)tickers.add(row.ticker);
 }
 const result=gradeCalendarTickersFromDelta(parsed,[...tickers]);
 if(!result.coveredTickerCount)
  return {status:'NO_MATCHED_MARKETCAP',providerRequests:0};
 const body=makeDeltaR44Public(result);
 const previous=await store.readOutput(DELTA_R44_OUTPUT_KEY);
 if(previous?.storedAt>now)return {status:'NEWER_OUTPUT_PRESERVED',providerRequests:0};
 if(previous&&JSON.stringify(previous.body)===JSON.stringify(body))
  return {status:'UNCHANGED',providerRequests:0,
   calendarTickers:body.calendarTickerCount,coveredTickers:body.coveredTickerCount,
   counts:body.counts};
 await store.writeOutput(DELTA_R44_OUTPUT_KEY,body,now);
 const check=await store.readOutput(DELTA_R44_OUTPUT_KEY);
 if(check?.storedAt!==now||JSON.stringify(check.body)!==JSON.stringify(body))
  throw Error('DELTA_LOCAL_OUTPUT_READBACK_FAILED');
 return {status:'READY_OUTPUT',providerRequests:0,
  calendarTickers:body.calendarTickerCount,coveredTickers:body.coveredTickerCount,
  sqliteDays,privateDays,counts:body.counts};
}
