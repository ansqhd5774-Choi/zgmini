// R15: no-provider, no-write real-PC scoring audit for EVERY verified candidate.
// Not a two-ETF basket; no aggregate weights, D1, release or scheduler change.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {SPACE_CANDIDATES} from './theme-space-satellite-r12-provider-probe.mjs';
import {auditSpaceUniverse} from './theme-space-satellite-r13-local-universe-audit.mjs';
import {selectRealHourlySessions} from './theme-space-satellite-adaptive-r2.mjs';
import {scoreAdaptiveTimeline} from './theme-optional-adaptive-r2.mjs';
import {readVerifiedSharedSpy} from './theme-shared-spy-readonly-r1.mjs';

const sha=body=>createHash('sha256').update(body).digest('hex');
const check=(yes,code)=>{if(!yes)throw Object.assign(new Error(code),{code});};
const within=(base,real)=>{const rel=path.relative(base,real);
 return rel!==''&&rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel);};

export function auditAllSpaceEtfScores({dataRoot,symbols=SPACE_CANDIDATES,
 spyReader=readVerifiedSharedSpy}={}){
 check(typeof dataRoot==='string'&&fs.existsSync(dataRoot),'R15_DATA_ROOT_MISSING');
 check(Array.isArray(symbols)&&symbols.length>0&&
  symbols.every(s=>typeof s==='string'&&/^[A-Z][A-Z0-9.-]{0,15}$/.test(s)&&s!=='SPY')&&
  new Set(symbols).size===symbols.length,'R15_INVALID_SYMBOLS');
 const r13=auditSpaceUniverse({dataRoot,symbols,spyReader});
 check(r13.candidateCount===symbols.length&&r13.records.length===symbols.length,
  'R15_R13_UNIVERSE_DRIFT');
 const root=fs.realpathSync(dataRoot);
 const home=fs.realpathSync(path.join(root,'themes','space-satellite'));
 check(within(root,home),'R15_HOME_ESCAPE');
 const manifestFile=path.join(home,'raw-manifest.json');
 check(within(home,fs.realpathSync(manifestFile)),'R15_MANIFEST_ESCAPE');
 const manifestBytes=fs.readFileSync(manifestFile);
 check(sha(manifestBytes)===r13.sourceManifestSha256,'R15_MANIFEST_CHANGED_DURING_AUDIT');
 const manifest=JSON.parse(manifestBytes);
 check(manifest.version===1&&manifest.themeId==='space-satellite'&&
  Array.isArray(manifest.files),'R15_MANIFEST_INVALID');
 const target=new Set(symbols);
 const series=new Map(symbols.map(s=>[s,new Map()]));
 const fileCounts=new Map(symbols.map(s=>[s,0]));
 for(const entry of manifest.files){
  check(typeof entry?.path==='string'&&
    /^raw\/[A-Z][A-Z0-9.-]*_[a-f0-9]{64}\.jsonl$/.test(entry.path),
    'R15_MANIFEST_PATH_INVALID');
  const symbol=entry.path.slice(4).split('_')[0];
  if(!target.has(symbol))continue;
  const file=fs.realpathSync(path.join(home,entry.path));
  check(within(home,file)&&fs.statSync(file).size<=6_000_000,'R15_RAW_PATH_OR_SIZE');
  const bytes=fs.readFileSync(file);
  check(sha(bytes)===entry.sha256,'R15_RAW_HASH_CHANGED_DURING_AUDIT');
  fileCounts.set(symbol,fileCounts.get(symbol)+1);
  let prev='';
  for(const line of bytes.toString('utf8').split(/\r?\n/)){
   if(!line)continue;
   const bar=JSON.parse(line);
   check(bar.symbol===symbol&&typeof bar.timestamp==='string'&&
    Number.isFinite(Date.parse(bar.timestamp))&&Number.isFinite(bar.close)&&bar.close>0&&
    (!prev||bar.timestamp>prev),'R15_INVALID_HOURLY_BAR');
   prev=bar.timestamp;
   if(bar.is_gap===true)continue;
   const earlier=series.get(symbol).get(bar.timestamp);
   check(!earlier||earlier.close===bar.close,'R15_OVERLAP_PRICE_CONFLICT');
   series.get(symbol).set(bar.timestamp,bar);
  }
 }
 const shared=spyReader({dataRoot,sourceTheme:'data-center-power'});
 check(shared?.manifestSha256===r13.sharedSpyManifestSha256&&
  Array.isArray(shared.bars),'R15_SHARED_SPY_CHANGED_DURING_AUDIT');
 const spyDays=selectRealHourlySessions(shared.bars);
 check(spyDays.length===r13.sharedSpyNy15Dates&&spyDays.length>0,
  'R15_SHARED_SPY_SESSIONS_CHANGED');
 const benchmark=new Map(spyDays.map(x=>[x.date,x.close]));
 const lastSpyDate=spyDays.at(-1).date;
 const windowDates=spyDays.slice(-252).map(x=>x.date);
 const records=symbols.map(ticker=>{
  const r13Record=r13.records.find(x=>x.ticker===ticker);
  check(r13Record,'R15_R13_TICKER_NOT_FOUND');
  const sorted=[...series.get(ticker).values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
  const days=selectRealHourlySessions(sorted);
  check(days.length===r13Record.ny15ProxyDates&&
    fileCounts.get(ticker)===r13Record.rawFiles,
    'R15_RAW_SESSIONS_CHANGED_DURING_AUDIT');
  const own=new Map(days.map(x=>[x.date,x.close]));
  const common=spyDays.filter(row=>own.has(row.date)).length;
  check(common===r13Record.spyCommonNy15Dates,
    'R15_SPY_COMMON_SESSIONS_CHANGED_DURING_AUDIT');
  // Genuine SPY trading sessions only: never fill prices or use old score as
  // today's proxy. The previously approved adaptive scorer is called intact.
  const rows=spyDays.map(row=>({date:row.date,own:own.get(row.date)??null,
   spy:benchmark.get(row.date)}));
  const scored=scoreAdaptiveTimeline(rows);
  const history=scored.slice(-252).map((r,i)=>({date:windowDates[i],
   score:Number.isFinite(r.score)?Number(r.score.toFixed(5)):null,
   status:r.status}));
  const available=history.filter(x=>x.score!==null);
  const last=available.at(-1)??null;
  const current=scored.at(-1);
  const isCurrent=own.has(lastSpyDate)&&Number.isFinite(current?.score)&&common>=40;
  const status=fileCounts.get(ticker)===0?'NO_LOCAL_RAW':common<40?
   'WATCH_UNDER_40_ACTUAL_COMMON_SESSIONS':!own.has(lastSpyDate)?
   'STALE_PRICE_NO_CURRENT_SCORE':!isCurrent?
   'WATCH_ADAPTIVE_SCORE_INCOMPLETE':'PRIVATE_CURRENT_SCORE_AVAILABLE';
  return {ticker,status,rawFiles:fileCounts.get(ticker),
   actualNy15Sessions:days.length,spyCommonNy15Sessions:common,
   min40ActualSessionsMet:common>=40,meets628Sessions:common>=628,
   lastEtfNy15Date:days.at(-1)?.date??null,
   benchmarkLastNy15Date:lastSpyDate,
   currentScore:isCurrent?Number(current.score.toFixed(5)):null,
   currentScoreMethod:isCurrent?current.status:null,
   lastHistoricalScore:!isCurrent?last?.score??null:null,
   lastHistoricalScoreDate:!isCurrent?last?.date??null:null,
   lastHistoricalIsNotCurrent:!isCurrent&&!!last,
   chartWindowSessions:history.length,chartActualScores:available.length,
   chartMissingScores:history.length-available.length,
   firstScoredDate:available[0]?.date??null,
   lastScoredDate:last?.date??null,
   historySha256:sha(JSON.stringify(history)),
   rightsVerified:false,publicationAuthorized:false};
 });
 check(sha(fs.readFileSync(manifestFile))===r13.sourceManifestSha256,
  'R15_MANIFEST_MUTATED_DURING_AUDIT');
 return {report:'SPACE_SATELLITE_R15_ALL_ETF_REAL_PC_SCORE_AUDIT',
  status:'PRIVATE_INDIVIDUAL_SCORES_ONLY_NOT_WEIGHTED_NOT_PUBLISHED',
  candidateCount:symbols.length,sourceManifestSha256:r13.sourceManifestSha256,
  sharedSpyManifestSha256:r13.sharedSpyManifestSha256,
  benchmarkLastNy15Date:lastSpyDate,
  currentScoreCount:records.filter(x=>x.currentScore!==null).length,
  watchOrStaleCount:records.filter(x=>x.currentScore===null).length,
  records,scoreMethod:'EXISTING_ADAPTIVE_R2_R188_40_20_40',
  aggregateScore:null,aggregateWeights:null,finalBasketSelected:false,
  aumWeightsVerified:false,rightsVerified:false,publicationAuthorized:false,
  rawPriceCopiesWritten:0,providerCalls:0,publicWrites:0,d1Writes:0,
  schedulerWrites:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.slice(2).join(' ')!=='--audit'){
  console.log('READ_ONLY_DEFAULT: run --audit manually; 9 candidates, NO two-ETF cap, NO writes.');
 }else try{
  console.log(JSON.stringify(auditAllSpaceEtfScores({
   dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data'}),null,2));
 }catch(e){
  console.error(JSON.stringify({report:'SPACE_SATELLITE_R15_ALL_ETF_REAL_PC_SCORE_AUDIT',
   status:'BLOCKED',reason:e.code??String(e.message??e).slice(0,90),
   providerCalls:0,publicWrites:0,d1Writes:0,schedulerWrites:0}));
  process.exitCode=1;
 }
}
