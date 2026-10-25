// R16: forensic explanation for real R15 ETF-score gaps. Strictly read-only.
// Do not fill missing sessions, relax existing scorer, or restrict ETF count.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {SPACE_CANDIDATES} from './theme-space-satellite-r12-provider-probe.mjs';
import {auditSpaceUniverse} from './theme-space-satellite-r13-local-universe-audit.mjs';
import {selectRealHourlySessions} from './theme-space-satellite-adaptive-r2.mjs';
import {scoreAdaptiveTimeline} from './theme-optional-adaptive-r2.mjs';
import {readVerifiedSharedSpy} from './theme-shared-spy-readonly-r1.mjs';

const EXPECT_MANIFEST='1e046a0487548a00231da92da48c6d9fb690e8e95bba64e2071078b02e57f00b';
const EXPECT_SPY='76dfaca72fd0ded5e648ee15cceca5628288c11463214bd14ede01c2b5c4746e';
const sha=b=>createHash('sha256').update(b).digest('hex');
const need=(v,why)=>{if(!v)throw Object.assign(new Error(why),{code:why});};
const ny=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',
 month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});
const parts=timestamp=>{
 const p=Object.fromEntries(ny.formatToParts(new Date(timestamp)).filter(x=>x.type!=='literal')
  .map(x=>[x.type,x.value]));
 return {date:`${p.year}-${p.month}-${p.day}`,hour:p.hour};
};
const contained=(base,real)=>{
 const r=path.relative(base,real);
 return r!==''&&r!=='..'&&!r.startsWith('..'+path.sep)&&!path.isAbsolute(r);
};

export function forensicSpaceScoreGaps({dataRoot,symbols=SPACE_CANDIDATES,
 spyReader=readVerifiedSharedSpy,auditImpl=auditSpaceUniverse,
 expectedManifestSha=EXPECT_MANIFEST,expectedSpySha=EXPECT_SPY}={}){
 need(typeof dataRoot==='string'&&fs.existsSync(dataRoot),'R16_DATA_ROOT_MISSING');
 need(Array.isArray(symbols)&&symbols.length>0&&
  symbols.every(s=>typeof s==='string'&&/^[A-Z][A-Z0-9.-]{0,15}$/.test(s)&&s!=='SPY')&&
  new Set(symbols).size===symbols.length,'R16_BAD_CANDIDATES');
 const r13=auditImpl({dataRoot,symbols,spyReader});
 need(r13?.report==='SPACE_SATELLITE_R13_EXISTING_PC_UNIVERSE_RAW_AUDIT'&&
  r13.sourceManifestSha256===expectedManifestSha&&
  r13.sharedSpyManifestSha256===expectedSpySha&&
  r13.candidateCount===symbols.length,'R16_R15_SOURCE_SNAPSHOT_CHANGED');
 const root=fs.realpathSync(dataRoot);
 const home=fs.realpathSync(path.join(root,'themes','space-satellite'));
 need(contained(root,home),'R16_HOME_ESCAPE');
 const manifestFile=fs.realpathSync(path.join(home,'raw-manifest.json'));
 need(contained(home,manifestFile),'R16_MANIFEST_ESCAPE');
 const bytes=fs.readFileSync(manifestFile);
 need(sha(bytes)===expectedManifestSha,'R16_MANIFEST_CHANGED');
 const manifest=JSON.parse(bytes);
 need(manifest?.themeId==='space-satellite'&&Array.isArray(manifest.files),
  'R16_MANIFEST_INVALID');
 const series=new Map(symbols.map(s=>[s,new Map()]));
 const hourlyDayInfo=new Map(symbols.map(s=>[s,new Map()]));
 for(const entry of manifest.files){
  need(typeof entry?.path==='string'&&
    /^raw\/[A-Z][A-Z0-9.-]*_[a-f0-9]{64}\.jsonl$/.test(entry.path),
    'R16_INVALID_RAW_PATH');
  const ticker=entry.path.slice(4).split('_')[0];
  if(!series.has(ticker))continue;
  const file=fs.realpathSync(path.join(home,entry.path));
  need(contained(home,file)&&fs.statSync(file).size<=6_000_000,
   'R16_FILE_ESCAPE_OR_SIZE');
  const raw=fs.readFileSync(file);
  need(sha(raw)===entry.sha256,'R16_RAW_CHANGED');
  let previous='';
  for(const line of raw.toString('utf8').split(/\r?\n/)){
   if(!line)continue;
   const b=JSON.parse(line);
   need(b.symbol===ticker&&typeof b.timestamp==='string'&&
    Number.isFinite(Date.parse(b.timestamp))&&Number.isFinite(b.close)&&b.close>0&&
    (!previous||b.timestamp>previous),'R16_BAD_BAR');
   previous=b.timestamp;
   if(b.is_gap===true)continue;
   const old=series.get(ticker).get(b.timestamp);
   need(!old||old.close===b.close,'R16_PRICE_OVERLAP');
   series.get(ticker).set(b.timestamp,b);
   const p=parts(b.timestamp),day=hourlyDayInfo.get(ticker);
   if(!day.has(p.date))day.set(p.date,new Set());
   day.get(p.date).add(p.hour);
  }
 }
 const shared=spyReader({dataRoot,sourceTheme:'data-center-power'});
 need(shared?.manifestSha256===expectedSpySha&&Array.isArray(shared.bars),
  'R16_SHARED_SPY_CHANGED');
 const spyDays=selectRealHourlySessions(shared.bars);
 need(spyDays.length===r13.sharedSpyNy15Dates,'R16_BENCHMARK_DATES_CHANGED');
 const lastSpy=spyDays.at(-1)?.date;
 const rows=symbols.map(ticker=>{
  const sessions=selectRealHourlySessions([...series.get(ticker).values()]
   .sort((a,b)=>a.timestamp.localeCompare(b.timestamp)));
  const own=new Map(sessions.map(x=>[x.date,x.close]));
  const r13Record=r13.records.find(x=>x.ticker===ticker);
  const common=spyDays.filter(x=>own.has(x.date));
  need(r13Record&&r13Record.spyCommonNy15Dates===common.length&&
   r13Record.ny15ProxyDates===sessions.length,'R16_SESSION_DRIFT');
  const timeline=scoreAdaptiveTimeline(spyDays.map(x=>({date:x.date,
   own:own.get(x.date)??null,spy:x.close})));
  const latest=timeline.at(-1),lastScored=timeline.filter(x=>
   Number.isFinite(x.score)).at(-1)??null;
  const first=sessions[0]?.date??null;
  const covered=first?spyDays.filter(x=>x.date>=first):[];
  const missing=covered.filter(x=>!own.has(x.date)).map(x=>x.date);
  const last45=spyDays.slice(-45).filter(x=>!own.has(x.date)).map(x=>x.date);
  const last45OtherHourly=last45.filter(d=>hourlyDayInfo.get(ticker).has(d)).length;
  const lookbacks=Object.fromEntries([21,61,125].map(n=>{
   const dates=spyDays.slice(-n).map(x=>x.date);
   return [String(n),{requiredSessions:n,valid:dates.filter(d=>own.has(d)).length,
    missing:dates.filter(d=>!own.has(d)).length}];
  }));
  const axisMetrics=Object.fromEntries(['trend','relativeStrength','volatility']
   .map(k=>[k,latest?.activeMetrics?.[k]??[]]));
  const current=Number.isFinite(latest?.score)&&own.has(lastSpy);
  const reason=current?'CURRENT_PRIVATE_SCORE_AVAILABLE':common.length<40?
   'UNDER_40_ACTUAL_COMMON_SESSIONS':!own.has(lastSpy)?
   'LATEST_15_NY_OBSERVATION_MISSING':'R2_METRIC_WINDOWS_INCOMPLETE';
  return {ticker,reason,actualNy15Days:sessions.length,commonSpyNy15Days:common.length,
   lastEtfNy15Date:sessions.at(-1)?.date??null,benchmarkLastNy15Date:lastSpy,
   currentScore:current?Number(latest.score.toFixed(5)):null,
   lastHistoricalScore:!current&&lastScored?Number(lastScored.score.toFixed(5)):null,
   lastHistoricalDate:!current?lastScored?.date??null:null,
   firstValidNy15Date:first,
   missingSpyDaysSinceFirstObservation:missing.length,
   latest45MissingNy15Days:last45.length,
   latest45MissingDates:last45.slice(-12),
   latest45Missing15ButOtherHourlyDays:last45OtherHourly,
   metricLookbacks:lookbacks,latestActiveMetricNames:axisMetrics,
   latestMetricSampleCounts:latest?.samples??{},
   gapFillSuggested:false,scoringFormulaChangeSuggested:false};
 });
 need(sha(fs.readFileSync(manifestFile))===expectedManifestSha,
  'R16_MANIFEST_CHANGED_DURING_AUDIT');
 return {report:'SPACE_SATELLITE_R16_PC_READ_ONLY_GAP_FORENSIC',
  status:'PRIVATE_SOURCE_GAP_CAUSES_REPORTED_NO_SCORE_FIXES',
  sourceManifestSha256:expectedManifestSha,sharedSpyManifestSha256:expectedSpySha,
  candidateCount:symbols.length,benchmarkLastNy15Date:lastSpy,
  records:rows,rawFilesWritten:0,providerCalls:0,publicWrites:0,
  d1Writes:0,schedulerWrites:0,finalBasketSelected:false,
  rightsVerified:false,publicationAuthorized:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.slice(2).join(' ')!=='--audit'){
  console.log('READ_ONLY_DEFAULT: run --audit manually; no collection or score formula changes.');
 }else try{
  console.log(JSON.stringify(forensicSpaceScoreGaps({
   dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data'}),null,2));
 }catch(e){
  console.error(JSON.stringify({report:'SPACE_SATELLITE_R16_PC_READ_ONLY_GAP_FORENSIC',
   status:'BLOCKED',reason:e.code??String(e.message??e).slice(0,80),
   providerCalls:0,rawFilesWritten:0,publicWrites:0,d1Writes:0,schedulerWrites:0}));
  process.exitCode=1;
 }
}
