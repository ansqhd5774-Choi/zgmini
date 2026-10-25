// Space/satellite R2: private short-history feasibility on SHA-verified ETF bars.
// No provider access, price rewriting, registry promotion, D1 or public publication.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {regularHour15Rows} from './theme-optional-score-r188.mjs';
import {scoreAdaptiveTimeline} from './theme-optional-adaptive-r2.mjs';
import {adaptivePairWeights,chooseNewThemeRoute} from './theme-optional-pair-weight-r3.mjs';
import {readVerifiedSharedSpy} from './theme-shared-spy-readonly-r1.mjs';

// Research-stage priority only: actual valid-session coverage is not yet proven.
const THEME='space-satellite',SYMBOLS=['UFO','NASA','SPY'];
const PAIRS=[['UFO','NASA']];
const EARLY_CLOSE=new Set(['2024-07-03','2024-11-29','2024-12-24','2025-07-03',
 '2025-11-28','2025-12-24','2026-11-27','2026-12-24','2027-11-26',
 '2028-07-03','2028-11-24']);
const RAW_MODE='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const check=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const isDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const ny=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',
 day:'2-digit',hour:'2-digit',hourCycle:'h23'});

// Same proxy-close selection as R188, but no arbitrary 628-raw-bar entrance gate.
export function selectRealHourlySessions(rows){
 check(Array.isArray(rows),'SPACE_R2_BAD_HOURLY_INPUT');
 const byDay=new Map();let previous='';
 for(const bar of rows){
  check(bar&&typeof bar.timestamp==='string'&&Number.isFinite(Date.parse(bar.timestamp))&&
   typeof bar.close==='number'&&Number.isFinite(bar.close)&&bar.close>0&&
   (!previous||bar.timestamp>previous),'SPACE_R2_BAD_HOURLY_BAR');
  previous=bar.timestamp;
  const p=Object.fromEntries(ny.formatToParts(new Date(bar.timestamp))
   .filter(v=>v.type!=='literal').map(v=>[v.type,v.value]));
  const date=`${p.year}-${p.month}-${p.day}`;
  if(p.hour!==(EARLY_CLOSE.has(date)?'12':'15'))continue;
  const old=byDay.get(date);
  if(!old||bar.timestamp>old.timestamp)byDay.set(date,{date,timestamp:bar.timestamp,close:bar.close});
 }
 return [...byDay.values()].sort((a,b)=>a.date.localeCompare(b.date));
}

export function auditSpaceSatelliteAdaptive({dataRoot,sharedSpyThemeId=null}={}){
 check(typeof dataRoot==='string'&&fs.existsSync(dataRoot),'SPACE_R2_DATA_ROOT_MISSING');
 const root=fs.realpathSync(dataRoot),home=path.join(root,'themes',THEME);
 check(fs.existsSync(home)&&fs.realpathSync(home)===home,'SPACE_R2_HOME_MISSING');
 const manifestPath=path.join(home,'raw-manifest.json');
 check(fs.existsSync(manifestPath),'SPACE_R2_MANIFEST_MISSING');
 const manifestBytes=fs.readFileSync(manifestPath),manifest=JSON.parse(manifestBytes);
 check(manifest.version===1&&manifest.themeId===THEME&&Array.isArray(manifest.files),
  'SPACE_R2_MANIFEST_INVALID');
 const bars=Object.fromEntries(SYMBOLS.map(symbol=>[symbol,new Map()]));
 const fileCounts=Object.fromEntries(SYMBOLS.map(symbol=>[symbol,0]));
 let ignoredExistingRawEntries=0;
 for(const entry of manifest.files){
  check(typeof entry.path==='string'&&
   /^raw\/[A-Z]+_[a-f0-9]{64}\.jsonl$/.test(entry.path)&&
   /^[a-f0-9]{64}$/.test(entry.sha256??'')&&entry.path.endsWith(entry.sha256+'.jsonl'),
   'SPACE_R2_RAW_PATH_INVALID');
  const symbol=path.basename(entry.path).split('_')[0];
  // Earlier exploratory ROKT/ARKX files may share this manifest; preserve them
  // without letting irrelevant coverage block the approved UFO+NASA audit.
  if(!SYMBOLS.includes(symbol)){ignoredExistingRawEntries++;continue;}
  check(!(sharedSpyThemeId&&symbol==='SPY'),'SPACE_R2_AMBIGUOUS_SPY_SOURCE');
  check(entry.source==='https://getmarkethistory.com'&&entry.priceMode===RAW_MODE&&
   Number.isFinite(Date.parse(entry.collectedAt))&&isDate(entry.observationThrough),
   'SPACE_R2_SOURCE_INVALID');
  const filename=path.join(home,entry.path),real=fs.realpathSync(filename);
  check(real.startsWith(home+path.sep),'SPACE_R2_RAW_PATH_ESCAPE');
  const bytes=fs.readFileSync(real);
  check(sha(bytes)===entry.sha256,'SPACE_R2_RAW_HASH_MISMATCH');
  fileCounts[symbol]++;
  let previous='';
  for(const line of bytes.toString('utf8').split(/\r?\n/).filter(Boolean)){
   const row=JSON.parse(line);
   check(row.symbol===symbol&&typeof row.timestamp==='string'&&
    Number.isFinite(Date.parse(row.timestamp))&&typeof row.close==='number'&&
    Number.isFinite(row.close)&&row.close>0&&(!previous||row.timestamp>previous),
    'SPACE_R2_BAR_INVALID');
   previous=row.timestamp;
   if(row.is_gap===true)continue;
   const old=bars[symbol].get(row.timestamp);
   check(!old||old.close===row.close,'SPACE_R2_OVERLAP_PRICE_CONFLICT');
   bars[symbol].set(row.timestamp,row);
  }
 }
 const sharedSpy=sharedSpyThemeId?
  readVerifiedSharedSpy({dataRoot,sourceTheme:sharedSpyThemeId}):null;
 if(sharedSpy){
  for(const row of sharedSpy.bars)bars.SPY.set(row.timestamp,row);
  fileCounts.SPY=sharedSpy.rawFiles.length;
 }
 const daily={},coverage={};
 for(const symbol of SYMBOLS){
  const sorted=[...bars[symbol].values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
  const selected=selectRealHourlySessions(sorted);
  daily[symbol]=new Map(selected.map(v=>[v.date,v.close]));
  coverage[symbol]={rawFiles:fileCounts[symbol],dailySessions:selected.length,
   lastObservationDate:selected.at(-1)?.date??null};
 }
 const allDates=[...new Set(SYMBOLS.flatMap(symbol=>[...daily[symbol].keys()]))].sort();
 const observedSessions=Object.fromEntries(SYMBOLS.filter(symbol=>symbol!=='SPY').map(symbol=>{
  let count=0;
  const byDate=new Map(allDates.map(date=>{
   if(daily.SPY.has(date)&&daily[symbol].has(date))count++;
   return [date,count];
  }));
  return [symbol,byDate];
 }));
 const fullTimelines=Object.fromEntries(PAIRS.flatMap(pair=>pair.map(symbol=>{
  const rows=allDates.map(date=>({date,own:daily[symbol].get(date)??null,spy:daily.SPY.get(date)??null}));
  return [symbol,scoreAdaptiveTimeline(rows)];
 })));
 const candidates=PAIRS.map(etfs=>{
  const [first,second]=etfs,firstValues=fullTimelines[first],secondValues=fullTimelines[second];
  const history=allDates.slice(-252).map((date,j)=>{
   const i=allDates.length-Math.min(252,allDates.length)+j;
   const a=firstValues[i],b=secondValues[i];
   const actual=Number.isFinite(a.score)&&Number.isFinite(b.score);
   let weights=null;
   if(actual)try{weights=adaptivePairWeights({
    firstSessions:observedSessions[first].get(date),secondSessions:observedSessions[second].get(date),
    firstStatus:a.status,secondStatus:b.status});}
   catch(error){if(error.message!=='THEME_R3_UNAPPROVED_PAIR_OR_INCOMPLETE_SOURCE')throw error;}
   const scored=actual&&weights!==null;
   return {date,score:scored?Number((a.score*weights.first+b.score*weights.second).toFixed(5)):null,
    weights:weights?{[first]:Number((weights.first*100).toFixed(3)),
     [second]:Number((weights.second*100).toFixed(3))}:null,
    status:!actual?'INSUFFICIENT_REAL_OBSERVATIONS':!weights?
     'PAIR_APPROVAL_REQUIRED_OR_SOURCE_INCOMPLETE':
     a.status==='R188_COMPATIBLE'&&b.status==='R188_COMPATIBLE'?'R188_COMPATIBLE':'ADAPTIVE_PROVISIONAL'};
  });
  const existing=history.filter(row=>row.score!==null),last=existing.at(-1);
  const eligible=chooseNewThemeRoute({
   legacyQualified:history.length===252&&history.every(row=>row.status==='R188_COMPATIBLE'),
   adaptiveQualified:last?.date===history.at(-1)?.date});
  const commonSessions=allDates.filter(date=>
   daily.SPY.has(date)&&daily[first].has(date)&&daily[second].has(date)).length;
  const isCurrent=last?.date===history.at(-1)?.date;
  return {etfs,status:isCurrent?'PRIVATE_ADAPTIVE_CANDIDATE_ONLY':last?
   'PRIVATE_HISTORICAL_CANDIDATE_STALE':commonSessions?
   'PRIVATE_WATCH_PENDING_REAL_HISTORY':'PRIVATE_SOURCE_COVERAGE_MISSING',
   commonSessions,calendarSessions:history.length,scoredSessions:existing.length,
   missingSessions:history.length-existing.length,observationDate:last?.date??null,
   score:last?.score??null,latestStatus:last?.status??null,latestWeights:last?.weights??null,
   eligibility:eligible,isCurrent,history,
   normalization:'EXPANDING_REAL_MIDRANK_CAP_252_MIN_20_PER_METRIC',
   weights:'ORIGINAL_R188_AXES_40_20_40_WITH_APPROVED_MIXED_LONG_SHORT_ONLY'};
 });
 const ready=candidates.filter(c=>c.isCurrent).length;
 return {themeId:THEME,theme:'우주·위성',methodologyVersion:'ADAPTIVE_R2_OR_PAIR_R3_PRIVATE_UFO_NASA_SCREEN',
  status:ready===1?'PRIVATE_PRIORITY_PAIR_READY':'PRIVATE_PRIORITY_PAIR_NOT_READY',
  source:'GETMARKETHISTORY_LOCAL_SHA_VERIFIED',
  sourceVersion:sharedSpy?'GMH_PRIVATE_COMBINED_MANIFEST_SHA256_'+
   sha(manifestBytes.toString('utf8')+'\n'+sharedSpy.sourceTheme+'\n'+sharedSpy.manifestSha256):
   'GMH_MANIFEST_SHA256_'+sha(manifestBytes),
  sharedSpySource:sharedSpy?{themeId:sharedSpy.sourceTheme,
   manifestSha256:sharedSpy.manifestSha256,verifiedHourlyBars:sharedSpy.actualHourlyBars,
   rightsVerified:false,publicationAuthorized:false}:null,
  priceMode:'UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12',
  coverage,ignoredExistingRawEntries,benchmark:'SPY',candidates,finalPairSelected:false,publicationAuthorized:false,
  derivedLicenseVerified:false,individualStocksUsed:0,providerCalls:0,
  publicWrites:0,d1Writes:0,schedulerWrites:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.slice(2).join(' ')!=='--audit'){
  console.error('Usage: node theme-space-satellite-adaptive-r2.mjs --audit');
  process.exitCode=2;
 }else try{
  const result=auditSpaceSatelliteAdaptive({dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data'});
  console.log(JSON.stringify({status:result.status,theme:result.theme,methodologyVersion:result.methodologyVersion,
   coverage:result.coverage,candidates:result.candidates.map(c=>({etfs:c.etfs,status:c.status,
    commonSessions:c.commonSessions,calendarSessions:c.calendarSessions,
    scoredSessions:c.scoredSessions,missingSessions:c.missingSessions,
    observationDate:c.observationDate,score:c.score,latestStatus:c.latestStatus,
    latestWeights:c.latestWeights,eligibility:c.eligibility,
    isCurrent:c.isCurrent})),
   finalPairSelected:false,publicationAuthorized:false,providerCalls:0,publicWrites:0,
   d1Writes:0,schedulerWrites:0}));
 }catch(error){console.error(JSON.stringify({status:'BLOCKED',reason:error.code??'SPACE_R2_UNCLASSIFIED'}));process.exitCode=1;}
}
