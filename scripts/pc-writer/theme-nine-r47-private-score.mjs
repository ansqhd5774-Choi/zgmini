// R47: read-only merge of SHA-verified original R23 and completed R35 windows.
// Reuses the exact approved R25 individual scorer and space-satellite selector.
// This module deliberately never publishes or replaces the original R32 shadow.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {auditNineR24} from './theme-nine-r24-session-audit.mjs';
import {scoreOneR25} from './theme-nine-r25-individual-score.mjs';
import {selectRealHourlySessions} from './theme-nine-r25-approved-selector.mjs';
import {planNineR47Recurring} from './theme-nine-r47-recurring-private-refresh.mjs';

const fail=code=>{throw Object.assign(new Error('THEME_NINE_R47_'+code),
  {code:'THEME_NINE_R47_'+code});};
const sha=x=>createHash('sha256').update(x).digest('hex');
const allowedPriceMode='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE';
const goodStamp=t=>typeof t==='string'&&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(t)&&
  !Number.isNaN(Date.parse(t));
const ny=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
  year:'numeric',month:'2-digit',day:'2-digit'});
function nyDate(timestamp){
  const p=Object.fromEntries(ny.formatToParts(new Date(timestamp))
    .filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
function read(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function verifiedPage(home,entry){
  if(!entry||typeof entry.path!=='string'||
     !/^raw\/[A-Z][A-Z0-9.]{0,11}_[a-f0-9]{64}\.jsonl$/.test(entry.path)||
     entry.path!==`raw/${entry.symbol}_${entry.sha256}.jsonl`||
     entry.priceMode!==allowedPriceMode)fail('MERGED_RAW_ENTRY_INVALID');
  const filename=fs.realpathSync(path.join(home,entry.path));
  if(!filename.startsWith(home+path.sep)||!fs.statSync(filename).isFile())
    fail('MERGED_RAW_ESCAPE');
  const bytes=fs.readFileSync(filename);
  if(sha(bytes)!==entry.sha256)fail('MERGED_RAW_SHA_CHANGED');
  return bytes;
}

export function mergeNineR47HourlyRows({symbol,existing=[],incoming=[]}={}){
  if(typeof symbol!=='string'||!Array.isArray(existing)||!Array.isArray(incoming))
    fail('MERGED_INPUT_INVALID');
  const byTimestamp=new Map();
  for(const row of [...existing,...incoming]){
    if(row.symbol!==symbol||!goodStamp(row.timestamp)||
       typeof row.is_gap!=='boolean')fail('MERGED_BAR_IDENTITY');
    if(row.is_gap!==true&&(['open','high','low','close'].some(k=>
      !Number.isFinite(row[k])||row[k]<=0)||
      !Number.isFinite(row.volume)||row.volume<0||row.high<row.low||
      row.open<row.low||row.open>row.high||row.close<row.low||row.close>row.high))
      fail('MERGED_OHLCV_INVALID');
    const prior=byTimestamp.get(row.timestamp);
    if(prior){
      if(['is_gap','open','high','low','close','volume'].some(k=>
        (prior[k]??null)!==(row[k]??null)))fail('MERGED_OVERLAP_PRICE_CONFLICT');
    }else byTimestamp.set(row.timestamp,row);
  }
  return [...byTimestamp.values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
}

function parsePage(bytes,symbol,window=null){
  let previous='';
  return bytes.toString('utf8').split(/\r?\n/).filter(Boolean).map(line=>{
    let row;try{row=JSON.parse(line);}catch{fail('MERGED_PAGE_INVALID_JSONL');}
    if(!goodStamp(row.timestamp)||row.symbol!==symbol||
       (previous&&row.timestamp<=previous)||
       (window&&(nyDate(row.timestamp)<window.start||nyDate(row.timestamp)>window.end)))
      fail('MERGED_PAGE_TIMESTAMP');
    previous=row.timestamp;
    return row;
  });
}

export function calculateNineR47PrivateScores({dataRoot,rosterPath,now=new Date()}={}){
  const audit=auditNineR24({dataRoot,rosterPath});
  if(audit.status!=='AUDIT_READ_ONLY_COMPLETE'||audit.spyLast252Sessions!==252||
     audit.symbolsWithValidDatesOutsideSPY.length)fail('BASE_NOT_READY');
  const plan=planNineR47Recurring({dataRoot,rosterPath,now});
  const rosterBytes=fs.readFileSync(rosterPath);
  if(sha(rosterBytes)!==audit.roster.sha256)fail('ROSTER_CHANGED_AFTER_AUDIT');
  const roster=JSON.parse(rosterBytes);
  const symbols=[...new Set(roster.groups.flatMap(g=>g.tickers.map(t=>t.ticker)))].sort();
  if(symbols.length!==63)fail('ROSTER_UNIQUE_COUNT');
  const symbolSet=new Set(['SPY',...symbols]);
  const rows=new Map([...symbolSet].map(s=>[s,[]]));
  const baselineHome=fs.realpathSync(path.join(dataRoot,'themes','legacy-nine-r23'));
  const baseBytes=fs.readFileSync(path.join(baselineHome,'raw-manifest.json'));
  const base=JSON.parse(baseBytes.toString('utf8'));
  for(const e of base.files){
    if(!symbolSet.has(e.symbol))fail('BASE_UNEXPECTED_TICKER');
    rows.get(e.symbol).push(...parsePage(verifiedPage(baselineHome,e),e.symbol));
  }
  const completed=plan.verifiedCompletedWindows??[];
  let deltaManifestSHA=null,deltaPages=0;
  if(completed.length){
    const home=fs.realpathSync(path.join(dataRoot,'themes','legacy-nine-r35-delta'));
    const manifestBytes=fs.readFileSync(path.join(home,'raw-manifest.json'));
    deltaManifestSHA=sha(manifestBytes);
    const manifest=JSON.parse(manifestBytes.toString('utf8'));
    const byPath=new Map(manifest.files.map(e=>[e.path,e]));
    for(const window of completed){
      const state=read(path.join(home,'state',window.stateFile));
      for(const symbol of symbolSet){
        const item=state.symbols[symbol];
        if(!item.complete)fail('INCOMPLETE_SOURCE_IN_SCORE');
        for(const file of item.files){
          const entry=byPath.get(file.path);
          if(entry?.symbol!==symbol||entry.sha256!==file.sha256)
            fail('SOURCE_FILE_REFERENCE');
          rows.get(symbol).push(...parsePage(verifiedPage(home,entry),symbol,window));
          deltaPages++;
        }
      }
    }
  }
  const merged=new Map([...rows].map(([symbol,data])=>{
    const valid=mergeNineR47HourlyRows({symbol,incoming:data})
      .filter(row=>!row.is_gap).map(row=>({timestamp:row.timestamp,close:row.close}));
    return [symbol,valid];
  }));
  const sessions=new Map([...merged].map(([symbol,data])=>
    [symbol,selectRealHourlySessions(data)]));
  const spySessions=sessions.get('SPY');
  if(spySessions.length<252)fail('SPY_252_SESSIONS_MISSING');
  const spyDates=new Set(spySessions.map(s=>s.date));
  const scored=symbols.map(symbol=>{
    const own=sessions.get(symbol);
    if(own.some(row=>!spyDates.has(row.date)))fail('ETF_DATE_NOT_IN_SPY');
    const result=scoreOneR25({symbol,spySessions,ownSessions:own});
    result.realHourlyBars=merged.get(symbol).length;
    return result;
  });
  const latestDate=spySessions.at(-1).date;
  if(completed.length&&latestDate!==completed.at(-1).spyDay)
    fail('LAST_COMPLETED_SPY_PROXY_MISMATCH');
  const source={baselineManifestSha256:sha(baseBytes),
    baselineRawPages:base.files.length,deltaManifestSha256:deltaManifestSHA,
    deltaCompletedWindows:completed.map(({start,end,spyDay})=>({start,end,spyDay})),
    deltaVerifiedPageReferences:deltaPages,
    rosterSha256:audit.roster.sha256,latest252SpySessions:252,
    latestSpySessionDate:latestDate};
  return {contract:'THEME_NINE_R47_PRIVATE_INCREMENTAL_INDIVIDUAL_V1',
    status:completed.length?'PRIVATE_R47_SCORES_CALCULATED_NOT_PUBLISHED':
      'PRIVATE_R47_NO_COMPLETED_DELTA_BASE_ONLY',
    approvedFormula:'EXACT_EXISTING_THEME_OPTIONAL_ADAPTIVE_R2_T40_R20_V40',
    priceSelector:'EXACT_EXISTING_SPACE_SATELLITE_R2_NY_15_EARLY_CLOSE_12',
    priceMode:allowedPriceMode,source,
    latest252TradingDates:spySessions.slice(-252).map(s=>s.date),
    individual:Object.fromEntries(scored.map(r=>[r.symbol,r])),
    counts:{themes:9,approvedETFPositions:64,uniqueApprovedETFs:63,
      withLatestScore:scored.filter(s=>s.latestScore!==null).length},
    candidateRosterUnchanged:true,publicationAuthorized:false,
    providerCalls:0,dataRootWrites:0,d1Writes:0,schedulerWrites:0,publicationWrites:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.length!==3||process.argv[2]!=='--score-private')fail('USAGE');
    const dataRoot=process.env.ZGMINI_DATA_ROOT||'E:/ZGmini/data';
    const rosterPath=process.env.ZGMINI_R47_ROSTER_PATH||path.join(path.dirname(
      fileURLToPath(import.meta.url)),'theme-nine-r20-approved-candidates.json');
    const outputPath=process.env.ZGMINI_R47_SCORE_RESULT;
    if(!outputPath||!path.isAbsolute(outputPath)||!/^THEME_NINE_R47_PRIVATE_SCORES_.*\.json$/.test(
      path.basename(outputPath)))fail('OUTPUT_PATH_INVALID');
    const output=calculateNineR47PrivateScores({dataRoot,rosterPath});
    fs.writeFileSync(outputPath,JSON.stringify(output,null,2)+'\n',{flag:'wx'});
    process.stdout.write(JSON.stringify({status:output.status,source:output.source,
      counts:output.counts,resultPath:outputPath,publicationAuthorized:false,
      d1Writes:0,schedulerWrites:0,publicationWrites:0},null,2)+'\n');
  }catch(e){process.stderr.write(JSON.stringify({status:'STOP_R47_PRIVATE_SCORE',
    error:e.code||'UNEXPECTED_ERROR',message:e.code?undefined:e.message})+'\n');
    process.exitCode=1;}
}
