// R9 private shadow audit: reuses existing SHA-verified UFO/NASA/SPY prices.
// Does not change the R8/R3 calculator or any live theme, source, feed or job.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runR8} from './theme-space-satellite-r8-real-audit.mjs';
import {auditSpaceSatelliteAdaptive,selectRealHourlySessions} from './theme-space-satellite-adaptive-r2.mjs';
import {readVerifiedSharedSpy} from './theme-shared-spy-readonly-r1.mjs';
import {scoreAdaptiveTimeline} from './theme-optional-adaptive-r2.mjs';
import {scoreRelativeThemeBasket} from './theme-optional-relative-weight-r4.mjs';

const SHA=bytes=>createHash('sha256').update(bytes).digest('hex');
const ETF_SYMBOLS=['UFO','NASA']; // Pilot inputs only; relative scorer has no ETF-count cap.
const SOURCE='https://getmarkethistory.com';
const PRICE_MODE='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE';
const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};

function verifiedPrivateDaily({dataRoot,sourceTheme='data-center-power'}={}){
 const root=fs.realpathSync(dataRoot),home=path.join(root,'themes','space-satellite');
 const manifestPath=path.join(home,'raw-manifest.json');
 const manifestBytes=fs.readFileSync(manifestPath);
 const manifest=JSON.parse(manifestBytes);
 need(manifest.version===1&&manifest.themeId==='space-satellite'&&Array.isArray(manifest.files),
  'R9_SPACE_MANIFEST_INVALID');
 const raw=Object.fromEntries(ETF_SYMBOLS.map(symbol=>[symbol,new Map()]));
 for(const entry of manifest.files){
  const match=typeof entry.path==='string'&&
   /^raw\/([A-Z]+)_([a-f0-9]{64})\.jsonl$/.exec(entry.path);
  need(match,'R9_SPACE_MANIFEST_PATH_INVALID');
  const symbol=match[1];
  if(!ETF_SYMBOLS.includes(symbol))continue; // Preserve unrelated exploratory files.
  need(entry.sha256===match[2]&&entry.source===SOURCE&&entry.priceMode===PRICE_MODE,
   'R9_SPACE_SOURCE_CONTRACT_MISMATCH');
  const filepath=fs.realpathSync(path.join(home,entry.path));
  need(filepath.startsWith(home+path.sep),'R9_SPACE_RAW_PATH_ESCAPE');
  const bytes=fs.readFileSync(filepath);
  need(SHA(bytes)===entry.sha256,'R9_SPACE_RAW_SHA_MISMATCH');
  let last='';
  for(const line of bytes.toString('utf8').split(/\r?\n/).filter(Boolean)){
   const bar=JSON.parse(line);
   need(bar.symbol===symbol&&typeof bar.timestamp==='string'&&bar.timestamp>last&&
    typeof bar.close==='number'&&Number.isFinite(bar.close)&&bar.close>0,
    'R9_SPACE_RAW_BAR_INVALID');
   last=bar.timestamp;
   if(bar.is_gap===true)continue;
   const old=raw[symbol].get(bar.timestamp);
   need(!old||old.close===bar.close,'R9_SPACE_PRICE_CONFLICT');
   raw[symbol].set(bar.timestamp,bar);
  }
 }
 const spy=readVerifiedSharedSpy({dataRoot,sourceTheme});
 const daily=Object.fromEntries(ETF_SYMBOLS.map(symbol=>[symbol,new Map(
  selectRealHourlySessions([...raw[symbol].values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp)))
   .map(row=>[row.date,row.close]))]));
 daily.SPY=new Map(selectRealHourlySessions(spy.bars).map(row=>[row.date,row.close]));
 const sourceVersion='GMH_PRIVATE_COMBINED_MANIFEST_SHA256_'+
  SHA(manifestBytes.toString('utf8')+'\n'+spy.sourceTheme+'\n'+spy.manifestSha256);
 return {daily,sourceVersion};
}

// Pure date-local and count-independent aggregation; fixtures can supply 2, 3, 4, 5+ ETFs.
export function calculateRelativeShadow({daily,etfs=ETF_SYMBOLS,window=252}={}){
 need(Array.isArray(etfs)&&etfs.length>=2&&new Set(etfs).size===etfs.length&&
  etfs.every(symbol=>symbol!=='SPY'&&daily?.[symbol] instanceof Map)&&
  daily?.SPY instanceof Map&&Number.isInteger(window)&&window>0,
  'R9_INVALID_PRIVATE_BASKET_INPUT');
 const dates=[...new Set([...etfs,'SPY'].flatMap(symbol=>[...daily[symbol].keys()]))].sort();
 need(dates.length>0,'R9_NO_OBSERVED_DATES');
 const counts={},timelines={};
 for(const symbol of etfs){
  let count=0;
  counts[symbol]=new Map(dates.map(date=>{
   if(daily.SPY.has(date)&&daily[symbol].has(date))count++;
   return [date,count];
  }));
  timelines[symbol]=scoreAdaptiveTimeline(dates.map(date=>({
   date,own:daily[symbol].get(date)??null,spy:daily.SPY.get(date)??null
  })));
 }
 const history=dates.slice(-window).map((date,i)=>{
  const offset=dates.length-Math.min(window,dates.length)+i;
  const inputs=etfs.map(symbol=>({symbol,sessions:counts[symbol].get(date),
   score:timelines[symbol][offset].score,status:timelines[symbol][offset].status}));
  if(inputs.some(item=>!Number.isFinite(item.score)))return {
   date,score:null,weights:null,status:'INSUFFICIENT_REAL_OBSERVATIONS'};
  const result=scoreRelativeThemeBasket({etfs:inputs});
  return {date,score:Number(result.score.toFixed(5)),
   weights:Object.fromEntries(etfs.map(symbol=>[symbol,
    Number((result.weights[symbol]*100).toFixed(3))])),status:result.status};
 });
 const scored=history.filter(item=>item.score!==null);
 return {etfs,calendarSessions:history.length,scoredSessions:scored.length,
  missingSessions:history.length-scored.length,
  firstScoredDate:scored[0]?.date??null,lastScoredDate:scored.at(-1)?.date??null,
  latest:history.at(-1),history,
  effectiveSessionsAtLastDate:Object.fromEntries(etfs.map(symbol=>[
   symbol,counts[symbol].get(dates.at(-1))]))};
}

export function summarizeR9({baseline,shadow,provenance,approvedR3History}={}){
 need(baseline?.report==='SPACE_SATELLITE_R8_REAL_DATA_READ_ONLY_AUDIT',
  'R9_BASELINE_MISSING');
 const original=baseline.candidate;
 need(original.etfs.join('|')===shadow.etfs.join('|'),'R9_BASKET_MISMATCH');
 for(const symbol of [...shadow.etfs,'SPY']){
  need(baseline.coverage[symbol]?.dailySessions===provenance.coverage[symbol],
   'R9_R8_DAILY_COVERAGE_DIFFERENCE');
 }
 need(baseline.sourceLastDatesAgree&&baseline.candidate.isCurrent,
  'R9_R8_SOURCE_NOT_CURRENT');
 need(shadow.latest?.date===original.observationDate&&
  shadow.lastScoredDate===shadow.latest.date,'R9_SHADOW_LAST_OBSERVATION_MISMATCH');
 const sameLatest=Math.abs(shadow.latest.score-original.privateScore)<=0.00001;
 need(sameLatest,'R9_R4_R3_LATEST_SCORE_PARITY_FAILED');
 need(shadow.scoredSessions>=original.scoredSessions,'R9_SHADOW_SCORE_REGRESSION');
 need(Array.isArray(approvedR3History)&&approvedR3History.length===shadow.history.length,
  'R9_R3_REFERENCE_HISTORY_MISSING');
 let matchingHistoricalSessions=0;
 for(let i=0;i<approvedR3History.length;i++){
  const older=approvedR3History[i],newer=shadow.history[i];
  need(older.date===newer.date,'R9_R3_HISTORICAL_DATES_DIFFER');
  if(older.score===null)continue;
  need(Number.isFinite(newer.score)&&Math.abs(older.score-newer.score)<=0.00001,
   'R9_R4_R3_HISTORICAL_PARITY_FAILED');
  matchingHistoricalSessions++;
 }
 need(matchingHistoricalSessions===original.scoredSessions,
  'R9_R8_BASELINE_HISTORICAL_COUNT_DIFFERENCE');
 return {report:'SPACE_SATELLITE_R9_PRIVATE_RELATIVE_SHADOW',
  status:'PRIVATE_ONLY_NOT_APPROVED_FOR_PUBLICATION',
  sourceVersion:baseline.sourceVersion,sharedSpySource:baseline.sharedSpySource,
  sourceLastDatesAgree:true,priceMode:baseline.priceMode,
  coverage:baseline.coverage,
  candidate:{etfs:shadow.etfs,displayWindowSessions:252,
   baselineR8ScoredSessions:original.scoredSessions,
   r9RelativeScoredSessions:shadow.scoredSessions,
   gainedHistoricalSessions:shadow.scoredSessions-original.scoredSessions,
   firstR9ScoredDate:shadow.firstScoredDate,latestObservationDate:shadow.latest.date,
   currentPrivateScore:shadow.latest.score,currentRelativeWeights:shadow.latest.weights,
   currentEffectiveSessions:shadow.effectiveSessionsAtLastDate,
   latestScoreMatchesApprovedR3: sameLatest,
   historicalSessionsMatchingApprovedR3:matchingHistoricalSessions,
   proposedWeightRule:'R4_A_RELATIVE_MATURITY_UNAPPROVED',
   earlyMissingScoresKeptNull:true},
  historicalSeriesWritten:false,rightsVerified:false,publicationAuthorized:false,
  finalBasketSelected:false,providerCalls:0,publicWrites:0,d1Writes:0,schedulerWrites:0,
  nextGate:'USER_REVIEW_R4_QUANTITATIVE_WEIGHTS_AND_ETF_SELECTION_RIGHTS'};
}

export function runR9({dataRoot}={}){
 const baseline=runR8({dataRoot});
 const r3=auditSpaceSatelliteAdaptive({dataRoot,sharedSpyThemeId:'data-center-power'});
 const {daily,sourceVersion}=verifiedPrivateDaily({dataRoot});
 need(baseline.sourceVersion===sourceVersion&&r3.sourceVersion===sourceVersion,
  'R9_MANIFEST_PROVENANCE_CHANGED_DURING_AUDIT');
 const shadow=calculateRelativeShadow({daily});
 const coverage=Object.fromEntries(Object.entries(daily).map(([symbol,map])=>[symbol,map.size]));
 return summarizeR9({baseline,shadow,provenance:{coverage},
  approvedR3History:r3.candidates.find(candidate=>candidate.etfs.join('|')===
   shadow.etfs.join('|'))?.history});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--audit'){
  console.error('READ_ONLY_DEFAULT: --audit; no provider or production writes');
  process.exitCode=2;
 }else try{
  console.log(JSON.stringify(runR9({dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data'}),null,2));
 }catch(error){
  console.error(JSON.stringify({report:'SPACE_SATELLITE_R9_PRIVATE_RELATIVE_SHADOW',
   status:'BLOCKED',reason:error.code??error.message??'R9_UNCLASSIFIED',
   providerCalls:0,publicWrites:0,d1Writes:0,schedulerWrites:0}));
  process.exitCode=1;
 }
}
