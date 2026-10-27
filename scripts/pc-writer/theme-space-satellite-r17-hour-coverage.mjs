// R17: test the feasibility of same-hour *observed* ETF+SPY data without
// substituting prices, recomputing scores or changing the NY15 contract.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {SPACE_CANDIDATES} from './theme-space-satellite-r12-provider-probe.mjs';
import {auditSpaceUniverse} from './theme-space-satellite-r13-local-universe-audit.mjs';
import {selectRealHourlySessions} from './theme-space-satellite-adaptive-r2.mjs';
import {readVerifiedSharedSpy} from './theme-shared-spy-readonly-r1.mjs';

const EXPECT_MANIFEST='1e046a0487548a00231da92da48c6d9fb690e8e95bba64e2071078b02e57f00b';
const EXPECT_SPY='76dfaca72fd0ded5e648ee15cceca5628288c11463214bd14ede01c2b5c4746e';
const sha=b=>createHash('sha256').update(b).digest('hex');
const check=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const inDir=(base,real)=>{const r=path.relative(base,real);
 return r!==''&&r!=='..'&&!r.startsWith('..'+path.sep)&&!path.isAbsolute(r);};
const nyFormat=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
 year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});
function nyParts(timestamp){
 const fields=Object.fromEntries(nyFormat.formatToParts(new Date(timestamp))
  .filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return {date:`${fields.year}-${fields.month}-${fields.day}`,hour:fields.hour};
}
function groupHours(rows){
 const groups=new Map();let last='';
 for(const b of rows){
  check(b&&typeof b.timestamp==='string'&&Number.isFinite(Date.parse(b.timestamp))&&
   Number.isFinite(b.close)&&b.close>0&&(!last||b.timestamp>last),
  'R17_INVALID_BAR_ORDER_OR_PRICE');
  last=b.timestamp;
  if(b.is_gap===true)continue;
  const {date,hour}=nyParts(b.timestamp);
  if(!groups.has(date))groups.set(date,new Map());
  const byHour=groups.get(date),old=byHour.get(hour);
  if(!old||old.timestamp<b.timestamp)byHour.set(hour,b);
 }
 return groups;
}
const quantile=(v,q)=>v.length?Number(v[Math.floor((v.length-1)*q)].toFixed(5)):null;
function distribution(values){
 const sorted=values.slice().sort((a,b)=>a-b);
 return {pairs:sorted.length,medianPercent:quantile(sorted,.5),
  p90Percent:quantile(sorted,.9),maxPercent:quantile(sorted,1)};
}
function candidateAltHours(target){return target==='12'?['11','10']:['14','13','12','11','10'];}

// A row records observed same-hour feasibility, NOT an alternate priced series.
export function inspectSpaceHourCoverage({dataRoot,symbols=SPACE_CANDIDATES,
 auditImpl=auditSpaceUniverse,spyReader=readVerifiedSharedSpy,
 expectedManifestSha=EXPECT_MANIFEST,expectedSpySha=EXPECT_SPY}={}){
 check(typeof dataRoot==='string'&&fs.existsSync(dataRoot),'R17_DATA_ROOT_MISSING');
 check(Array.isArray(symbols)&&symbols.length>0&&symbols.every(s=>
  typeof s==='string'&&/^[A-Z][A-Z0-9.-]{0,15}$/.test(s)&&s!=='SPY')&&
  new Set(symbols).size===symbols.length,'R17_CANDIDATES_INVALID');
 const audit=auditImpl({dataRoot,symbols,spyReader});
 check(audit?.report==='SPACE_SATELLITE_R13_EXISTING_PC_UNIVERSE_RAW_AUDIT'&&
  audit.candidateCount===symbols.length&&audit.sourceManifestSha256===expectedManifestSha&&
  audit.sharedSpyManifestSha256===expectedSpySha,
  'R17_SOURCE_SNAPSHOT_CHANGED');
 const root=fs.realpathSync(dataRoot),home=fs.realpathSync(path.join(root,'themes','space-satellite'));
 check(inDir(root,home),'R17_HOME_ESCAPE');
 const manifestFile=fs.realpathSync(path.join(home,'raw-manifest.json'));
 check(inDir(home,manifestFile),'R17_MANIFEST_ESCAPE');
 const rawManifest=fs.readFileSync(manifestFile);
 check(sha(rawManifest)===expectedManifestSha,'R17_MANIFEST_CHANGED');
 const manifest=JSON.parse(rawManifest);
 check(manifest.version===1&&manifest.themeId==='space-satellite'&&
  Array.isArray(manifest.files),'R17_MANIFEST_INVALID');
 const bySymbol=new Map(symbols.map(s=>[s,new Map()]));
 for(const entry of manifest.files){
  check(typeof entry?.path==='string'&&
   /^raw\/[A-Z][A-Z0-9.-]*_[a-f0-9]{64}\.jsonl$/.test(entry.path)&&
   entry.path.endsWith(entry.sha256+'.jsonl'),'R17_RAW_ENTRY_INVALID');
  const ticker=entry.path.slice(4).split('_')[0];
  if(!bySymbol.has(ticker))continue;
  const file=fs.realpathSync(path.join(home,entry.path));
  check(inDir(home,file)&&fs.statSync(file).size<=6_000_000,'R17_RAW_PATH_OR_SIZE');
  const raw=fs.readFileSync(file);
  check(sha(raw)===entry.sha256,'R17_RAW_SHA_CHANGED');
  let prev='';
  for(const line of raw.toString('utf8').split(/\r?\n/)){
   if(!line)continue;
   const b=JSON.parse(line);
   check(b.symbol===ticker&&typeof b.timestamp==='string'&&
    Number.isFinite(Date.parse(b.timestamp))&&Number.isFinite(b.close)&&b.close>0&&
    (!prev||prev<b.timestamp),'R17_INVALID_OR_UNSORTED_ETF_BAR');
   prev=b.timestamp;
   if(b.is_gap===true)continue;
   const old=bySymbol.get(ticker).get(b.timestamp);
   check(!old||old.close===b.close,'R17_RAW_OVERLAP_CONFLICT');
   bySymbol.get(ticker).set(b.timestamp,b);
  }
 }
 const spy=spyReader({dataRoot,sourceTheme:'data-center-power'});
 check(spy?.manifestSha256===expectedSpySha&&Array.isArray(spy.bars),
  'R17_SHARED_SPY_CHANGED');
 const spyBars=spy.bars.slice().sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
 const spyHours=groupHours(spyBars),spySessions=selectRealHourlySessions(spyBars);
 check(spySessions.length===audit.sharedSpyNy15Dates,'R17_SPY_DATES_CHANGED');
 const dates=spySessions.map(s=>s.date),last=dates.at(-1),dateSet=new Set(dates);
 const spyTargetHours=new Map(spySessions.map(s=>[s.date,nyParts(s.timestamp).hour]));
 const records=symbols.map(ticker=>{
  const bars=[...bySymbol.get(ticker).values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
  const hours=groupHours(bars),sessions=selectRealHourlySessions(bars),
   canonical=new Set(sessions.map(s=>s.date)),sparse=hours.size>0;
  const original=audit.records.find(r=>r.ticker===ticker);
  check(original&&original.spyCommonNy15Dates===dates.filter(d=>canonical.has(d)).length&&
   original.ny15ProxyDates===sessions.length,'R17_R13_COUNT_DRIFT');
  const firstAny=sparse?[...hours.keys()].filter(d=>dateSet.has(d)&&
   ['10','11','12','13','14','15'].some(h=>hours.get(d).has(h))).sort()[0]??null:null;
  const comparisonDays=firstAny?dates.filter(d=>d>=firstAny):[];
  const recoverable=[],unresolved=[],alternatives={};
  const paired14Etf=[],paired14Ratio=[];
  for(const date of comparisonDays){
   const own=hours.get(date),ref=spyHours.get(date),target=spyTargetHours.get(date);
   check(target&&ref.has(target),'R17_SPY_CANONICAL_HOUR_MISSING');
   if(target==='15'&&own?.has('15')&&own?.has('14')&&ref.has('14')){
    const a=own.get('14').close,b=own.get('15').close;
    const ar=ref.get('14').close,br=ref.get('15').close;
    paired14Etf.push(Math.abs(a/b-1)*100);
    paired14Ratio.push(Math.abs((a/ar)/(b/br)-1)*100);
   }
   if(canonical.has(date))continue;
   const alternative=candidateAltHours(target).find(h=>own?.has(h)&&ref.has(h));
   if(alternative){
    recoverable.push(date);
    alternatives[alternative]=(alternatives[alternative]??0)+1;
   }else unresolved.push(date);
  }
  const recentDates=dates.slice(-45),after=recentDates.filter(d=>!canonical.has(d)),
   recentRecoverable=after.filter(d=>recoverable.includes(d));
  const recentUnresolved=after.filter(d=>!recoverable.includes(d));
  const proxyPotential=new Set([...canonical,...recoverable]);
  const lookbacks=Object.fromEntries([21,61,125].map(n=>{
   const window=dates.slice(-n);
   return [n,{observedCanonical:window.filter(d=>canonical.has(d)).length,
    potentiallyObservedWithSameHour:window.filter(d=>proxyPotential.has(d)).length,
    unresolved:window.filter(d=>!proxyPotential.has(d)).length}];
  }));
  return {ticker,firstAnyObservedHourDate:firstAny,lastBenchmarkDate:last,
   actualCanonicalSessions:original.spyCommonNy15Dates,
   onlyDiagnosticPotentialSessions:dates.filter(d=>proxyPotential.has(d)).length,
   potentialMeets40:dates.filter(d=>proxyPotential.has(d)).length>=40,
   missingSinceFirstAny:comparisonDays.filter(d=>!canonical.has(d)).length,
   actualSameHourAlternateDays:recoverable.length,
   alternateHourBreakdown:alternatives,
   stillUnresolvedDays:unresolved.length,
   latest45MissingCanonical:after.length,
   latest45RecoverableSameHour:recentRecoverable.length,
   latest45Unresolved:recentUnresolved.length,
   latest45RecoverableDates:recentRecoverable.slice(-12),
   latest45UnresolvedDates:recentUnresolved.slice(-12),
   benchmarkLastDayMissingCanonical:!canonical.has(last),
   benchmarkLastDaySameHourAlternative:recoverable.includes(last),
   recentLookbackFeasibility:lookbacks,
   observedPaired14Vs15EtfCloseDriftPercent:distribution(paired14Etf),
   observedPaired14Vs15EtfSpyRatioDriftPercent:distribution(paired14Ratio),
   scoreRecomputed:false,missingFilled:false,alternateApplied:false};
 });
 check(sha(fs.readFileSync(manifestFile))===expectedManifestSha,
  'R17_MANIFEST_CHANGED_DURING_AUDIT');
 return {report:'SPACE_SATELLITE_R17_PC_READ_ONLY_SAME_HOUR_FEASIBILITY',
  status:'PRIVATE_HOURLY_FEASIBILITY_DIAGNOSIS_ONLY_NO_SCORE_OR_PRICE_CHANGE',
  sourceManifestSha256:expectedManifestSha,sharedSpyManifestSha256:expectedSpySha,
  benchmarkLastDate:last,candidateCount:symbols.length,records,
  warning:'An observed earlier-hour pair is not a canonical 15h price or permission to substitute it.',
  sameHourFallbackApproved:false,scoreFormulaUnchanged:true,
  providerCalls:0,rawFilesWritten:0,publicWrites:0,d1Writes:0,
  schedulerWrites:0,rightsVerified:false,finalBasketSelected:false,
  publicationAuthorized:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.slice(2).join(' ')!=='--audit')
  console.log('READ_ONLY_DEFAULT: manually run --audit; no gap substitution or publication.');
 else try{
  console.log(JSON.stringify(inspectSpaceHourCoverage({
   dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data'}),null,2));
 }catch(e){
  console.error(JSON.stringify({report:'SPACE_SATELLITE_R17_PC_READ_ONLY_SAME_HOUR_FEASIBILITY',
   status:'BLOCKED',reason:e.code??String(e.message??e).slice(0,100),
   providerCalls:0,rawFilesWritten:0,publicWrites:0,d1Writes:0,schedulerWrites:0}));
  process.exitCode=1;
 }
}
