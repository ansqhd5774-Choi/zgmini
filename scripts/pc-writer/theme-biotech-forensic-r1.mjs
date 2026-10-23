// R1 forensic investigation. Read-only: no provider calls, D1 writes, scheduler
// changes, published history rewrites, or E: output. The CMD redirects stdout
// to a TXT in its own Desktop folder. Do not locate/re-collect the missing R3.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {inspectManifest,containedFile} from './theme-data-inventory.mjs';
import {scoreAll252,regularHour15Rows} from './theme-optional-score-r188.mjs';
import {r158ScorePrices} from '../../lib/market-score/theme-etf-provisional-score.mjs';
import {cloudflareD1} from './theme-optional-cycle.mjs';

const REPO=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const REGISTRY=JSON.parse(fs.readFileSync(path.join(REPO,'config/theme-data-registry.json'),'utf8'));
const BIOTECH=REGISTRY.themes.find(t=>t.id==='biotech');
const AI=REGISTRY.themes.find(t=>t.id==='ai-semiconductor');
const HASH=b=>createHash('sha256').update(b).digest('hex');
const fail=(c)=>{throw Object.assign(new Error(c),{code:c});};
const ensure=(v,c)=>{if(!v)fail(c);};
const ny=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const nyParts=t=>Object.fromEntries(ny.formatToParts(new Date(t)).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
const early=new Set(['2024-07-03','2024-11-29','2024-12-24','2025-07-03','2025-11-28','2025-12-24','2026-11-27','2026-12-24','2027-11-26','2028-07-03','2028-11-24']);
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const std=a=>{const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)));};
const specs={trend:[['m125',.5,false],['r60',.3,false],['r20',.2,false]],relativeStrength:[['rs20',.25,false],['rs60',.45,false],['rs125',.3,false]],volatility:[['rv20',.4,true],['dsv20',.35,true],['dd63',.25,false]]};

export function traceSeries(own,spy){
 ensure(own.length===spy.length&&own.length>=628,'TRACE_NOT_ENOUGH_REAL_PRICES');
 const raw={trend:[],relativeStrength:[],volatility:[]};
 for(let i=0;i<own.length;i++){
  if(i>=124){const c=own[i];raw.trend[i]={m125:c/mean(own.slice(i-124,i+1))-1,r60:c/own[i-60]-1,r20:c/own[i-20]-1};}
  if(i>=125){const rel=j=>(own[i]/own[i-j]-1)-(spy[i]/spy[i-j]-1);raw.relativeStrength[i]={rs20:rel(20),rs60:rel(60),rs125:rel(125)};}
  if(i>=62){const returns=[];for(let j=i-19;j<=i;j++)returns.push(own[j]/own[j-1]-1);
   raw.volatility[i]={rv20:std(returns)*Math.sqrt(252),dsv20:Math.sqrt(252*mean(returns.map(x=>Math.min(x,0)**2))),dd63:own[i]/Math.max(...own.slice(i-62,i+1))-1};}
 }
 const at=i=>{
  ensure(i>=376&&i<own.length,'TRACE_NORMALIZATION_BOUNDARY');
  const axes={},metrics={};
  for(const [axis,spec] of Object.entries(specs)){
   const window=raw[axis].slice(i-251,i+1);ensure(window.length===252&&window.every(Boolean),'TRACE_RANK_WINDOW_INVALID');
   let weighted=0;metrics[axis]={};
   for(const [key,weight,invert] of spec){
    const value=raw[axis][i][key];let less=0,equal=0;
    for(const row of window){if(row[key]<value)less++;else if(row[key]===value)equal++;}
    const midrank=100*(less+0.5*equal)/252,contribution=weight*(invert?100-midrank:midrank);
    metrics[axis][key]={raw:value,rankBelow:less,rankEqual:equal,rankWindow:252,midrank,invert,weight,weightedContribution:contribution};
    weighted+=contribution;
   }
   axes[axis]=weighted;
  }
  return {metrics,axes,score:axes.trend*.4+axes.relativeStrength*.2+axes.volatility*.4};
 };
 const expected=scoreAll252(own,spy);
 const points=Array.from({length:252},(_,j)=>{
  const row=at(own.length-252+j);
  ensure(Math.abs(row.score-expected[j])<1e-10,'TRACE_R188_NOT_NUMERICALLY_IDENTICAL');
  return row;
 });
 return points;
}

export function materializeBars(dataRoot,theme){
 const checked=inspectManifest(dataRoot,theme.rawManifest,theme.id);
 ensure(checked.status==='SHA_VERIFIED','MANIFEST_SHA_NOT_VERIFIED_'+theme.id);
 const mf=containedFile(dataRoot,theme.rawManifest),doc=JSON.parse(fs.readFileSync(mf,'utf8'));
 const symbols=[...theme.symbols,theme.benchmark],tables={},details={};
 for(const symbol of symbols){
  const bars=new Map();let rawBars=0,gapBars=0,duplicates=0,overlap=0,otherInterpolationFlags=0;
  const byFile=doc.files.filter(f=>path.basename(f.path).startsWith(symbol+'_'));
  ensure(byFile.length>0,'NO_SAVED_RAW_'+symbol);
  for(const file of byFile){
   const bytes=fs.readFileSync(containedFile(path.dirname(mf),file.path));
   ensure(HASH(bytes)===file.sha256,'RAW_SHA_MISMATCH_'+symbol);
   for(const line of bytes.toString('utf8').split(/\r?\n/).filter(Boolean)){
    const row=JSON.parse(line);rawBars++;
    ensure(row.symbol===symbol,'WRONG_RAW_SYMBOL_'+symbol);
    if(row.is_gap===true){gapBars++;continue;}
    // The currently deployed R188 audit filters only is_gap===true. Record
    // other gap markers without silently changing its historic selection.
    if(row.gap_fill_method||row.is_gap==='true')otherInterpolationFlags++;
    ensure(Number.isFinite(Date.parse(row.timestamp))&&Number.isFinite(row.close)&&row.close>0,'RAW_PRICE_INVALID_'+symbol);
    if(bars.has(row.timestamp)){
     duplicates++;if(Math.abs(bars.get(row.timestamp).close-row.close)>1e-9)fail('PRICE_DUPLICATE_REVISED_'+symbol);
     overlap++;
    }else bars.set(row.timestamp,row);
   }
  }
  const sorted=[...bars.values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
  const daily=regularHour15Rows(sorted);
  tables[symbol]=new Map(daily.map(p=>[p.date,p]));
  const hourStats={ordinary15:0,earlyClose12:0},otherHours=[],nonzeroSelectedMinutes=[],hourlyDuplicates=[];
  const selectedCandidates=new Map();
  for(const bar of sorted){const p=nyParts(bar.timestamp),d=`${p.year}-${p.month}-${p.day}`;
   if(p.hour===(early.has(d)?'12':'15'))selectedCandidates.set(d,(selectedCandidates.get(d)??0)+1);
  }
  for(const p of daily){const parts=nyParts(p.timestamp),hour=early.has(p.date)?'12':'15';
   ensure(parts.hour===hour,'NON_REGULAR_HOUR_SELECTED_'+symbol);
   if(hour==='12')hourStats.earlyClose12++;else hourStats.ordinary15++;
   if(parts.minute!=='00')nonzeroSelectedMinutes.push({date:p.date,timestamp:p.timestamp});
   if((selectedCandidates.get(p.date)??0)>1)hourlyDuplicates.push({date:p.date,candidates:selectedCandidates.get(p.date),chosen:p.timestamp});
  }
  details[symbol]={manifestFiles:byFile.map(f=>({path:f.path,sha256:f.sha256,observationFrom:f.observationFrom,observationThrough:f.observationThrough,priceMode:f.priceMode})),
   rawBars,gapBars,otherInterpolationFlags,duplicates,overlap,nonGapDistinctTimestamps:bars.size,selectedSessions:daily.length,
   selectedFirstDate:daily[0]?.date??null,selectedLastDate:daily.at(-1)?.date??null,hourStats,otherHours};
  details[symbol].nonzeroSelectedMinutes=nonzeroSelectedMinutes;
  details[symbol].sameHourMultipleCandidates=hourlyDuplicates;
 }
 const dates=[...tables[theme.benchmark].keys()].filter(d=>symbols.every(s=>tables[s].has(d))).sort();
 for(const symbol of symbols){
  details[symbol].missingVsBenchmark=[...tables[theme.benchmark].keys()].filter(d=>!tables[symbol].has(d)).sort();
  details[symbol].excludedWithoutCommon=[...tables[symbol].keys()].filter(d=>!dates.includes(d)).sort();
 }
 return {dates,tables,details,manifestSha256:HASH(fs.readFileSync(mf)),manifestFiles:doc.files.length};
}

export function recompute(corpus,through){
 const {dates,tables}=corpus,chosen=dates.filter(d=>d<=through).slice(-628);
 ensure(chosen.length===628&&chosen.at(-1)===through,'ROLLING_628_REQUIRED_'+through);
 const series=Object.fromEntries(['IBB','XBI','SPY'].map(s=>[s,chosen.map(d=>tables[s].get(d).close)]));
 const one=traceSeries(series.IBB,series.SPY),two=traceSeries(series.XBI,series.SPY);
 const history=chosen.slice(-252).map((date,i)=>({date,score:Number(((one[i].score+two[i].score)/2).toFixed(5))}));
 ensure(history.length===252&&history.at(-1).date===through,'HISTORY_252_BOUNDARY');
 return {dates:chosen,firstPriceDate:chosen[0],firstRankDate:chosen.at(-252),lastPriceDate:through,series,trace:{IBB:one,XBI:two},history};
}

export function compareHistory(previous,computed,corpus){
 ensure(previous?.history?.length===252&&previous.observationDate===computed.lastPriceDate,'PRIOR_HISTORY_OR_DATE_INVALID');
 ensure(previous.history.every((r,i)=>r.date===computed.history[i].date),'HISTORICAL_DATES_MISMATCH');
 const diffs=[];
 for(let i=0;i<252;i++){
  const prior=previous.history[i],fresh=computed.history[i];
  if(prior.score===fresh.score)continue;
  const date=prior.date,prices=Object.fromEntries(['IBB','XBI','SPY'].map(s=>[s,{...corpus.tables[s].get(date)}]));
  const inputIndex=corpus.dates.indexOf(date),prior628Start=corpus.dates[inputIndex-627]??null,rank252Start=corpus.dates[inputIndex-251];
  const native=Object.fromEntries(['IBB','XBI'].map(s=>[s,{status:'NOT_RUN_BELOW_R158_500_MINIMUM'}]));
  const nativeInput=corpus.dates.slice(0,inputIndex+1);
  if(nativeInput.length>=500){
   for(const s of ['IBB','XBI']){
    const ours=r158ScorePrices(nativeInput.map(d=>corpus.tables[s].get(d).close),nativeInput.map(d=>corpus.tables.SPY.get(d).close));
    native[s]={status:'R158_NATIVE_SAME_REAL_PRICES',score:ours[nativeInput.length-1]};
    ensure(Math.abs(native[s].score-computed.trace[s][i].score)<1e-10,'R158_R188_CODE_SCORE_MISMATCH_'+s+'_'+date);
   }
  }
  diffs.push({date,priorPublishedScore:prior.score,recomputedR188Score:fresh.score,signedDifference:Number((fresh.score-prior.score).toFixed(5)),
   sourcePriceComparison:'ORIGINAL_R3_PRICE_INPUT_NOT_AVAILABLE_DO_NOT_INFER',
   firstVerifiedMismatchStage:'PUBLISHED_FINAL_SCORE_VS_NEW_RAW',
   normalizedDateWindows:{price628Start:prior628Start,rank252Start,through:date,
    note:prior628Start?'FULL_628_AVAILABLE':'HISTORICAL_POINT_USES_SUBWINDOW_OF_PRIOR_628'},
   chosenHourlyPrice:prices,
   etfStage:{IBB:{...computed.trace.IBB[i],nativeR158:native.IBB},XBI:{...computed.trace.XBI[i],nativeR158:native.XBI}}});
 }
 return {count:diffs.length,firstChanged:diffs[0]?.date??null,maxAbsoluteDifference:Math.max(0,...diffs.map(x=>Math.abs(x.signedDifference))),dates:diffs};
}

function verifyRegistryArtifact(dataRoot,theme){
 const a=theme.privateAuditArtifact;ensure(a?.path&&a?.sha256,'PRIVATE_AUDIT_NOT_REGISTERED_'+theme.id);
 const bytes=fs.readFileSync(containedFile(dataRoot,a.path));const actual=HASH(bytes);
 return {path:a.path,expectedSha256:a.sha256,actualSha256:actual,status:actual===a.sha256?'SHA_VERIFIED':'SHA_MISMATCH'};
}

// The root inventory is intentionally bounded; a daily *.parquet filename does
// not prove that IBB, XBI, or SPY rows are absent. Never query/download provider.
export function inventoryMarketParquet(dataRoot,{maxFiles=1500,maxDirs=120}={}){
 const roots=['theme-market-history-r131/marketparquet-r167','theme-market-history-r131/raw','pc-writer'];
 const result=[];
 for(const root of roots){
  const absolute=path.join(dataRoot,...root.split('/'));
  if(!fs.existsSync(absolute)){result.push({root,status:'NOT_PRESENT'});continue;}
  const queue=[{dir:absolute,depth:0}];let dirs=0,files=0,truncated=false;
  const targetNamed=[],parquetFiles=[],contentEvidence=[],formatCounts={};let inspectedTextFiles=0;
  while(queue.length){
   if(dirs>=maxDirs||files>=maxFiles){truncated=true;break;}
   const next=queue.shift();dirs++;
   let entries;try{entries=fs.readdirSync(next.dir,{withFileTypes:true})}catch{continue;}
   for(const e of entries){
    const f=path.join(next.dir,e.name),rel=path.relative(absolute,f).replaceAll('\\','/');
    if(e.isSymbolicLink())continue;
    if(e.isDirectory()){if(next.depth<3)queue.push({dir:f,depth:next.depth+1});continue;}
    if(!e.isFile())continue;files++;
    const ext=path.extname(e.name).toLowerCase()||'(none)';formatCounts[ext]=(formatCounts[ext]??0)+1;
    if(/\.(parquet|arrow)$/i.test(e.name)&&parquetFiles.length<35)parquetFiles.push(rel);
    if(/(^|[_./-])(IBB|XBI|SPY)([_./-]|$)/i.test(rel)&&targetNamed.length<80)
     targetNamed.push({path:rel,sizeBytes:fs.statSync(f).size,contentInspected:false});
    if(/\.(json|jsonl|ndjson)$/i.test(e.name)&&inspectedTextFiles<40){
     const size=fs.statSync(f).size;if(size<=4_000_000){
      inspectedTextFiles++;
      const source=fs.readFileSync(f,'utf8');
      const symbols=['IBB','XBI','SPY'].filter(s=>new RegExp('"(?:symbol|ticker)"\\s*:\\s*"'+s+'"','i').test(source));
      if(symbols.length)contentEvidence.push({path:rel,symbolKeysSeen:symbols,
       status:'JSON_SYMBOL_KEYS_OBSERVED_PRICES_RIGHTS_DATE_UNVERIFIED'});
     }
    }
    if(files>=maxFiles){truncated=true;break;}
   }
  }
  result.push({root,status:truncated?'BOUNDED_SCAN_TRUNCATED':'NAMES_INSPECTED',directories:dirs,files,formatCounts,targetNamed,
   inspectedSmallJsonFiles:inspectedTextFiles,contentEvidence,parquetFiles,
   presenceConclusion:contentEvidence.length?'SOME_JSON_SYMBOL_CONTENTS_SEEN_PROVENANCE_UNVERIFIED':
    targetNamed.length?'POSSIBLE_TICKER_FILES_REQUIRE_PRICE_AND_RIGHTS_CHECK':'UNKNOWN_CONTENTS_DAILY_PARQUET_MAY_INCLUDE_TICKERS'});
 }
 return result;
}

const publicReader=async()=>{
 const r=await fetch('https://zgmini.kr/api/theme-fear-greed/?biotech_forensic='+Date.now(),{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(25000)});
 ensure(r.ok,'PUBLIC_API_REQUEST_FAILED');const body=await r.json();ensure(body.status==='READY','PUBLIC_API_STATUS_NOT_READY');return body;
};
const taskInfo=(name)=>{
 if(process.platform!=='win32')return {status:'NOT_WINDOWS'};
 const p=spawnSync('schtasks.exe',['/query','/tn',name,'/fo','LIST','/v'],{encoding:'utf8',windowsHide:true,timeout:20000,maxBuffer:8192});
 if(p.status!==0)return {status:'NOT_REGISTERED_OR_QUERY_FAILED',exitCode:p.status};
 const output=p.stdout??'',xml=spawnSync('schtasks.exe',['/query','/tn',name,'/xml'],
  {encoding:'utf8',windowsHide:true,timeout:20000,maxBuffer:65536});
 const body=xml.status===0?xml.stdout??'':'';
 const interval=body.match(/<Interval>(P[^<]+)<\/Interval>/i)?.[1]??null;
 const startBoundary=body.match(/<StartBoundary>([^<]+)<\/StartBoundary>/i)?.[1]??null;
 return {status:'REGISTERED',repetitionInterval:interval,startBoundary,
  scheduleXmlSha256:body?HASH(Buffer.from(body)):null,detailsHash:HASH(Buffer.from(output))};
};

export async function runForensic({dataRoot=REGISTRY.defaultDataRoot,readPublic=publicReader,storage=null}={}){
 const report={report:'ZGMINI_BIOTECH_AUTOMATION_FORENSIC_R1',status:'STARTED',checkedAt:new Date().toISOString(),
  authorization:{providerCalls:0,d1Writes:0,publicWrites:0,schedulerWrites:0,originalR3Searches:0,existingCommonSessionRefetches:0},
  evidence:{originalR3File:'PRIOR_PC_LOCATE_R1_R2_NOT_FOUND_NO_REPEAT'},missingVerification:[]};
 try{
  ensure(fs.existsSync(dataRoot),'E_DATA_ROOT_UNAVAILABLE');
  report.sourceFiles={
   r158:{relative:'lib/market-score/theme-etf-provisional-score.mjs',actualSha256:HASH(fs.readFileSync(path.join(REPO,'lib/market-score/theme-etf-provisional-score.mjs')))},
   r188:{relative:'scripts/pc-writer/theme-optional-score-r188.mjs',actualSha256:HASH(fs.readFileSync(path.join(REPO,'scripts/pc-writer/theme-optional-score-r188.mjs')))},
   audit:{relative:'scripts/pc-writer/theme-optional-audit.mjs',actualSha256:HASH(fs.readFileSync(path.join(REPO,'scripts/pc-writer/theme-optional-audit.mjs')))},
   registry:{relative:'config/theme-data-registry.json',actualSha256:HASH(fs.readFileSync(path.join(REPO,'config/theme-data-registry.json')))},
  };
  ensure(report.sourceFiles.r158.actualSha256==='91d833bb58188b52df069ae71668b98822fa8bd9551f5a05ae999d6007cac38b','R158_REFERENCE_MODULE_SHA_CHANGED');
  report.manifests={};for(const theme of [AI,BIOTECH]){
   report.manifests[theme.id]=inspectManifest(dataRoot,theme.rawManifest,theme.id);
   try{report.manifests[theme.id].privateAudit=verifyRegistryArtifact(dataRoot,theme);}catch(e){
    report.manifests[theme.id].privateAudit={status:'NOT_SHA_VERIFIED',errorCode:e?.code??'FILE_NOT_ACCESSIBLE'};
   }
   if(report.manifests[theme.id].status!=='SHA_VERIFIED'||report.manifests[theme.id].privateAudit.status!=='SHA_VERIFIED')
    report.missingVerification.push('LOCAL_SHA_EVIDENCE_NOT_VERIFIED_'+theme.id);
  }
  ensure(report.manifests.biotech.status==='SHA_VERIFIED','BIOTECH_RAW_MANIFEST_INVALID');
  report.marketParquetSavedRaw=inventoryMarketParquet(dataRoot);
  report.scheduledTasks={originalSeven:taskInfo('ZGMINI-PC-GetMarketHistory-ETF'),
   ai:taskInfo('ZGMINI-PC-Theme-AI-Semiconductor'),biotech:taskInfo('ZGMINI-PC-Theme-Biotech')};
  const published=await readPublic();
  const db=storage??cloudflareD1({dataRoot});
  const biorecord=(await db.read(BIOTECH.public.feedKey)).body;
  const airecord=(await db.read(AI.public.feedKey)).body;
  report.d1={biotech:{feedKey:BIOTECH.public.feedKey,observationDate:biorecord.observationDate,
   lastHistoryDate:biorecord.history?.at(-1)?.date??null,confirmedScore:biorecord.score,phase:biorecord.phase,
   provisionalDates:biorecord.provisional?.points?.map(p=>p.date)??[]},
   ai:{feedKey:AI.public.feedKey,observationDate:airecord.observationDate,phase:airecord.phase,provisionalDates:airecord.provisional?.points?.map(p=>p.date)??[]}};
  report.publicApi={observationDate:published.observationDate,phase:published.phase,
   provisionalDates:published.provisional?.points?.map(p=>p.date)??[],
   themes:published.themes?.map(t=>({theme:t.theme,score:t.score??t.latestScore??null,
    historyLast:t.history?.at(-1)?.date??null}))};
  const corpus=materializeBars(dataRoot,BIOTECH);
  report.corpus={manifestSha256:corpus.manifestSha256,manifestFiles:corpus.manifestFiles,
   commonSessions:corpus.dates.length,firstCommonDate:corpus.dates[0],lastCommonDate:corpus.dates.at(-1),symbols:corpus.details};
  const previous=recompute(corpus,biorecord.observationDate);
  report.historicalWindow={price628:{first:previous.firstPriceDate,last:previous.lastPriceDate,length:628},
   rank252:{first:previous.firstRankDate,last:previous.lastPriceDate,length:252}};
  report.drift=compareHistory(biorecord,previous,corpus);
  report.r4OriginalKnownReference={sourcePriceFileSha256:'a59777c3fe8e009fc76154bcf16e135d7564e61cd9dca4366003fd9ca16b6915',
   date:'2026-10-19',IBB:26.57937,XBI:6.13095,pair:16.35516,
   originalRawNotAvailableForStageComparison:true};
  if(corpus.dates.includes('2026-10-19')){
   const s=recompute(corpus,'2026-10-19');const j=s.history.length-1;
   report.r4OriginalKnownReference.recomputed={IBB:s.trace.IBB[j].score,XBI:s.trace.XBI[j].score,pair:s.history[j].score};
  }
  const today=corpus.dates.at(-1),latest=recompute(corpus,today);
  report.recomputedLatest={date:today,score:latest.history.at(-1).score,
   publicCutoverApproved:false,revision:'SHADOW_CANDIDATE_UNPUBLISHED'};
  const shadowId='BIOTECH_GMH_R1_'+HASH(Buffer.from([corpus.manifestSha256,report.sourceFiles.r188.actualSha256].join(':'))).slice(0,16);
  report.separateShadowRevision={id:shadowId,sourceManifestSha256:corpus.manifestSha256,
   calculationSha256:report.sourceFiles.r188.actualSha256,phase:'PRIVATE_CONFIRMED_ONLY',priceMode:'UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12',
   observationDate:today,history:latest.history,provisional:{points:[]},
   storage:'ONLY_IN_THIS_DESKTOP_TXT_LOG_NOT_D1',publicationAuthorized:false};
  const reference={...published,themes:published.themes.slice(0,7)};
  const expectedDates=reference.phase==='PROVISIONAL'?(reference.provisional?.points??[]).map(p=>p.date):[];
  const aiDates=airecord.provisional?.points?.map(p=>p.date)??[];
  const readerDateReason=airecord.observationDate!==reference.observationDate?'PUBLIC_READER_OBSERVATION_DATE_MISMATCH':
   JSON.stringify(expectedDates)!==JSON.stringify(aiDates)?'PUBLIC_READER_PROVISIONAL_DATES_MISSING':'DATE_GATE_PASS_OTHER_GATES_NOT_AUDITED';
  report.aiPublicReader={dateGateStatus:readerDateReason,baseObservationDate:published.observationDate,
   storedObservationDate:airecord.observationDate,baseProvisionalDates:published.provisional?.points?.map(p=>p.date)??[],
   aiProvisionalDates:airecord.provisional?.points?.map(p=>p.date)??[]};
  report.status=report.drift.count===0?'OLD_HISTORY_PARITY_VERIFIED_NO_PUBLICATION':'SHADOW_REVISION_REVIEW_REQUIRED_NO_PUBLICATION';
  return report;
 }catch(e){report.status='BLOCKED_NO_WRITES';report.errorCode=e?.code??'UNKNOWN_FORENSIC_FAILURE';return report;}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.length>2||args[0]!=='--data-root'||!args[1]){console.log(JSON.stringify({status:'INVALID_ARGUMENTS',usage:'--data-root <E:/ZGmini/data>'}));process.exitCode=2;}
 else {const result=await runForensic({dataRoot:args[1]});console.log(JSON.stringify(result,null,2));
  if(result.status==='BLOCKED_NO_WRITES')process.exitCode=1;
 }
}
