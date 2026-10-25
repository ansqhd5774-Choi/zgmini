// R18: nine-candidate, unlimited-count, date-local PRIVATE basket shadow.
// All prices stay at approved original NY15/early-close NY12 hourly proxy.
// Proposed R4-A weights are NOT approved for release and never written.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {SPACE_CANDIDATES} from './theme-space-satellite-r12-provider-probe.mjs';
import {auditAllSpaceEtfScores} from './theme-space-satellite-r15-all-etf-score-audit.mjs';
import {selectRealHourlySessions} from './theme-space-satellite-adaptive-r2.mjs';
import {scoreAdaptiveTimeline} from './theme-optional-adaptive-r2.mjs';
import {scoreRelativeThemeBasket} from './theme-optional-relative-weight-r4.mjs';
import {readVerifiedSharedSpy} from './theme-shared-spy-readonly-r1.mjs';

const EXPECT_MANIFEST='1e046a0487548a00231da92da48c6d9fb690e8e95bba64e2071078b02e57f00b';
const EXPECT_SPY='76dfaca72fd0ded5e648ee15cceca5628288c11463214bd14ede01c2b5c4746e';
const sha=b=>createHash('sha256').update(b).digest('hex');
const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const inside=(home,real)=>{const rel=path.relative(home,real);
 return rel!==''&&rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel);};

// A pure reducer: ETFs with no *today* score or actual same-day NY15 price are
// watch candidates, not zeroes, carry-forwards, or permanent exclusions.
export function calculateVariableBasketShadow({dates,etfs,timelines,observed,
 sessionCounts,window=252}={}){
 need(Array.isArray(dates)&&dates.length>0&&dates.every((d,i)=>
  typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&
  (i===0||dates[i-1]<d)),'R18_DATES_INVALID');
 need(Array.isArray(etfs)&&etfs.length>0&&new Set(etfs).size===etfs.length&&
  etfs.every(s=>typeof s==='string'&&/^[A-Z][A-Z0-9.-]{0,15}$/.test(s)&&s!=='SPY')&&
  Number.isInteger(window)&&window>0,'R18_ETFS_OR_WINDOW_INVALID');
 for(const ticker of etfs){
  need(Array.isArray(timelines?.[ticker])&&timelines[ticker].length===dates.length&&
   observed?.[ticker] instanceof Set&&sessionCounts?.[ticker] instanceof Map,
   'R18_MISSING_VERIFIED_TIMELINE');
 }
 const start=Math.max(0,dates.length-window);
 const contributorDays=Object.fromEntries(etfs.map(s=>[s,0]));
 const activeCountDays={};
 const history=[];
 for(let i=start;i<dates.length;i++){
  const date=dates[i];
  const eligible=etfs.flatMap(symbol=>{
   const day=timelines[symbol][i],sessions=sessionCounts[symbol].get(date);
   // Do not re-use a historical score if the same-day price was not observed.
   if(!observed[symbol].has(date)||!Number.isInteger(sessions)||sessions<40||
    !Number.isFinite(day?.score)||![
     'ADAPTIVE_PROVISIONAL','R188_COMPATIBLE'].includes(day?.status))return [];
   return [{symbol,sessions,score:day.score,status:day.status}];
  });
  eligible.forEach(x=>contributorDays[x.symbol]++);
  activeCountDays[eligible.length]=(activeCountDays[eligible.length]??0)+1;
  if(eligible.length<2){
   history.push({date,score:null,weights:null,active:eligible.map(x=>x.symbol),
    status:eligible.length===1?'ONE_REAL_ETF_NO_SINGLE_THEME_APPROVAL':
     'NO_ACTUAL_SCORED_ETF'});
   continue;
  }
  const mix=scoreRelativeThemeBasket({etfs:eligible});
  need(mix&&Number.isFinite(mix.score)&&Object.values(mix.weights).every(w=>
   Number.isFinite(w)&&w>0)&&
   Math.abs(Object.values(mix.weights).reduce((s,w)=>s+w,0)-1)<1e-10,
   'R18_WEIGHT_NORMALIZATION_FAILED');
  history.push({date,score:Number(mix.score.toFixed(5)),
   weights:Object.fromEntries(eligible.map(x=>[x.symbol,
    Number((mix.weights[x.symbol]*100).toFixed(4))])),
   active:eligible.map(x=>x.symbol),status:mix.status});
 }
 const scored=history.filter(x=>x.score!==null);
 return {dates:history.length,actualMixedScoreDays:scored.length,
  missingDays:history.length-scored.length,firstMixedDate:scored[0]?.date??null,
  lastMixedDate:scored.at(-1)?.date??null,activeCountDays,
  contributorDays,latest:history.at(-1),
  shadowHistorySha256:sha(JSON.stringify(history)),history};
}

export function runSpaceVariableBasketShadow({dataRoot,
 symbols=SPACE_CANDIDATES,spyReader=readVerifiedSharedSpy,
 r15Audit=auditAllSpaceEtfScores,expectedManifestSha=EXPECT_MANIFEST,
 expectedSpySha=EXPECT_SPY}={}){
 need(typeof dataRoot==='string'&&fs.existsSync(dataRoot),'R18_DATA_ROOT_MISSING');
 need(Array.isArray(symbols)&&symbols.length>0&&new Set(symbols).size===symbols.length&&
  symbols.every(x=>typeof x==='string'&&/^[A-Z][A-Z0-9.-]{0,15}$/.test(x)&&x!=='SPY'),
  'R18_SYMBOLS_INVALID');
 const baseline=r15Audit({dataRoot,symbols,spyReader});
 need(baseline?.report==='SPACE_SATELLITE_R15_ALL_ETF_REAL_PC_SCORE_AUDIT'&&
  baseline.candidateCount===symbols.length&&
  baseline.sourceManifestSha256===expectedManifestSha&&
  baseline.sharedSpyManifestSha256===expectedSpySha,
  'R18_SOURCE_SNAPSHOT_CHANGED');
 const root=fs.realpathSync(dataRoot),home=fs.realpathSync(path.join(root,'themes','space-satellite'));
 need(inside(root,home),'R18_HOME_ESCAPE');
 const filename=fs.realpathSync(path.join(home,'raw-manifest.json'));
 need(inside(home,filename),'R18_MANIFEST_ESCAPE');
 const bytes=fs.readFileSync(filename);
 need(sha(bytes)===expectedManifestSha,'R18_MANIFEST_CHANGED');
 const manifest=JSON.parse(bytes);
 need(manifest.version===1&&manifest.themeId==='space-satellite'&&
  Array.isArray(manifest.files),'R18_MANIFEST_INVALID');
 const raw=new Map(symbols.map(ticker=>[ticker,new Map()]));
 for(const item of manifest.files){
  need(typeof item?.path==='string'&&
   /^raw\/[A-Z][A-Z0-9.-]*_[a-f0-9]{64}\.jsonl$/.test(item.path)&&
   item.path.endsWith(item.sha256+'.jsonl'),'R18_RAW_ENTRY_INVALID');
  const ticker=item.path.slice(4).split('_')[0];
  if(!raw.has(ticker))continue;
  const file=fs.realpathSync(path.join(home,item.path));
  need(inside(home,file)&&fs.statSync(file).size<=6_000_000,'R18_RAW_PATH_INVALID');
  const buf=fs.readFileSync(file);
  need(sha(buf)===item.sha256,'R18_RAW_SHA_CHANGED');
  let previous='';
  for(const line of buf.toString('utf8').split(/\r?\n/)){
   if(!line)continue;
   const b=JSON.parse(line);
   need(b.symbol===ticker&&typeof b.timestamp==='string'&&
    Number.isFinite(Date.parse(b.timestamp))&&(!previous||previous<b.timestamp)&&
    Number.isFinite(b.close)&&b.close>0,'R18_BAD_ETF_BAR');
   previous=b.timestamp;
   if(b.is_gap===true)continue;
   const old=raw.get(ticker).get(b.timestamp);
   need(!old||old.close===b.close,'R18_OVERLAP_CONFLICT');
   raw.get(ticker).set(b.timestamp,b);
  }
 }
 const shared=spyReader({dataRoot,sourceTheme:'data-center-power'});
 need(shared?.manifestSha256===expectedSpySha&&Array.isArray(shared.bars),
  'R18_SHARED_SPY_CHANGED');
 const spy=selectRealHourlySessions(shared.bars),dates=spy.map(row=>row.date);
 need(dates.at(-1)===baseline.benchmarkLastNy15Date,
  'R18_SPY_LAST_DATE_CHANGED');
 const timelines={},observed={},sessionCounts={},last=dates.at(-1);
 for(const ticker of symbols){
  const days=selectRealHourlySessions([...raw.get(ticker).values()]
   .sort((a,b)=>a.timestamp.localeCompare(b.timestamp)));
  const own=new Map(days.map(x=>[x.date,x.close]));
  observed[ticker]=new Set(own.keys());
  let n=0;
  sessionCounts[ticker]=new Map(dates.map(d=>{
   if(own.has(d))n++;
   return [d,n];
  }));
  timelines[ticker]=scoreAdaptiveTimeline(spy.map(s=>({date:s.date,
   own:own.get(s.date)??null,spy:s.close})));
  const r15=baseline.records.find(x=>x.ticker===ticker);
  need(r15&&r15.spyCommonNy15Sessions===n&&r15.actualNy15Sessions===days.length,
   'R18_R15_RAW_COUNT_DRIFT');
  const today=timelines[ticker].at(-1),actual=observed[ticker].has(last)&&
   Number.isFinite(today?.score)&&n>=40;
  const score=actual?Number(today.score.toFixed(5)):null;
  need(score===r15.currentScore,'R18_EXISTING_ETF_SCORE_DRIFT');
 }
 const reduced=calculateVariableBasketShadow({dates,etfs:symbols,
  timelines,observed,sessionCounts});
 need(sha(fs.readFileSync(filename))===expectedManifestSha,
  'R18_MANIFEST_CHANGED_DURING_AUDIT');
 const latest=reduced.latest;
 const expectedLatestInputs=symbols.filter(s=>baseline.records.some(r=>
  r.ticker===s&&r.currentScore!==null));
 need(latest.active.length===expectedLatestInputs.length&&
  expectedLatestInputs.every(s=>latest.active.includes(s)),
  'R18_LATEST_CONTRIBUTORS_MISMATCH_R15');
 return {report:'SPACE_SATELLITE_R18_PC_PRIVATE_VARIABLE_BASKET_SHADOW',
  status:'PRIVATE_R4_A_PROPOSAL_ONLY_NOT_A_BASKET_OR_PUBLIC_SCORE',
  sourceManifestSha256:expectedManifestSha,sharedSpyManifestSha256:expectedSpySha,
  candidateCount:symbols.length,benchmarkLastDate:last,
  independentlyCurrentScored:baseline.currentScoreCount,
  candidateStatus:baseline.records.map(r=>({ticker:r.ticker,
   commonNy15Sessions:r.spyCommonNy15Sessions,
   currentScore:r.currentScore,diagnosis:r.status})),
  last252DisplayDays:reduced.dates,realPrivateMixedDays:reduced.actualMixedScoreDays,
  noMixedScoreDays:reduced.missingDays,firstRealMixedDate:reduced.firstMixedDate,
  contributorsByDayCount:reduced.activeCountDays,
  scoredDatesByTicker:reduced.contributorDays,
  latestPrivateProposal:{date:latest.date,score:latest.score,
   contributingEtfs:latest.active,weightsPercent:latest.weights,status:latest.status},
  shadowHistorySha256:reduced.shadowHistorySha256,
  priceMode:'CANONICAL_UNADJUSTED_NY15_OR_EARLY_CLOSE_12_ONLY',
  weightsMethod:'R4_A_RELATIVE_MATURITY_UNAPPROVED',
  singleEtfDaysSynthesized:false,missingFilled:false,staleUsedAsCurrent:false,
  allCandidateCountPreserved:true,finalBasketSelected:false,
  rightsVerified:false,publicationAuthorized:false,
  providerCalls:0,rawFilesWritten:0,publicWrites:0,d1Writes:0,schedulerWrites:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.slice(2).join(' ')!=='--audit')
  console.log('READ_ONLY_DEFAULT: --audit; dynamic basket is a private unapproved proposal.');
 else try{console.log(JSON.stringify(runSpaceVariableBasketShadow({
  dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data'}),null,2));}
 catch(e){console.error(JSON.stringify({report:'SPACE_SATELLITE_R18_PC_PRIVATE_VARIABLE_BASKET_SHADOW',
  status:'BLOCKED',reason:e.code??String(e.message??e).slice(0,95),
  providerCalls:0,rawFilesWritten:0,publicWrites:0,d1Writes:0,schedulerWrites:0}));
  process.exitCode=1;}
}
