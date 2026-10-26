// R22 stage 5: pure PRIVATE R32 aggregation from already verified R25 scores.
// No API, D1, scheduler, formula mutation or publication. CLI writes only
// a new shadow JSON beside the user's selected R25 JSON/CMD after validation.
// Approved dated issuer AUM remains visibly dated; never recast as historical AUM.
import {inspectNineR32} from './theme-nine-r32-readonly-preflight.mjs';
import {adaptivePairWeights} from './theme-optional-pair-weight-r3.mjs';
import {findR25} from './theme-nine-r32-readonly-preflight.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const fail=(code,details={})=>{throw Object.assign(new Error(code),{code,details});};
const round=(n,d=5)=>Number(n.toFixed(d));
const valid=(n)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;

const APPROVAL_CONTRACT='THEME_NINE_R32_DATED_AUM_PRIVATE_APPROVAL_V1';
const APPROVAL_POLICY='USE_VERIFIED_OFFICIAL_ISSUER_AUM_WITH_ORIGINAL_AS_OF_DATE';
function approvedPolicy(approval,benchmarkDate,rosterSha){
 if(!approval||approval.contract!==APPROVAL_CONTRACT||
  approval.scope!=='PRIVATE_STAGE5_AND_STAGE6_SHADOW_ONLY'||
  approval.policy!==APPROVAL_POLICY||
  approval.scoreBenchmarkDate!==benchmarkDate||
  approval.candidateRosterSha256!==rosterSha||
  approval.evidenceContract!=='THEME_NINE_R26_OFFICIAL_AUM_RESEARCH_EVIDENCE_V1'||
  approval.doNotInventAum!==true||approval.doNotRelabelAumDates!==true||
  approval.doNotImposeUnapprovedMaximumLag!==true||
  approval.doNotReconstructHistoricalAum!==true||
  approval.publicationAuthorized!==false)fail('AUM_APPROVAL_CONTRACT_INVALID');
 return true;
}

function normalize(rows,benchmarkDate,allowDatedOfficialAum){
 const outdated=rows.filter(r=>r.aumAsOf!==benchmarkDate);
 if(outdated.length&&!allowDatedOfficialAum)fail('AUM_FRESHNESS_UNAPPROVED',{
  benchmarkDate,older:outdated.map(r=>({ticker:r.ticker,aumAsOf:r.aumAsOf}))});
 if(rows.some(r=>r.aumAsOf>benchmarkDate))fail('AUM_FUTURE_LOOKAHEAD');
 const total=rows.reduce((s,r)=>s+r.aumUsd,0);
 if(!Number.isFinite(total)||total<=0)fail('AUM_NORMALIZATION_INVALID');
 return Object.fromEntries(rows.map(r=>[r.ticker,r.aumUsd/total]));
}

function pickOne(rows,benchmarkDate,allowDatedOfficialAum){
 const ordered=[...rows].sort((a,b)=>b.sessions-a.sessions);
 const ties=ordered.filter(r=>r.sessions===ordered[0].sessions);
 if(ties.length===1)return ordered[0];
 normalize(ties,benchmarkDate,allowDatedOfficialAum);
 ties.sort((a,b)=>b.aumUsd-a.aumUsd||a.ticker.localeCompare(b.ticker,'en'));
 return ties[0];
}

// Pure one-day reducer; fully synthetic inputs can be tested without PC data.
export function mixNineR32Date({date,rows,benchmarkDate,allowDatedOfficialAum=false}={}){
 if(typeof date!=='string'||!Array.isArray(rows)||typeof benchmarkDate!=='string')
  fail('R32_DATE_ROWS_INVALID');
 const tickers=new Set();
 for(const r of rows){
  if(!r||typeof r.ticker!=='string'||tickers.has(r.ticker)||!valid(r.score)||
   !Number.isInteger(r.sessions)||r.sessions<40||
   !['ADAPTIVE_PROVISIONAL','R188_COMPATIBLE'].includes(r.status)||
   !(r.aumUsd>0)||!Number.isFinite(r.aumUsd)||
   typeof r.aumAsOf!=='string')fail('R32_ELIGIBLE_ROW_INVALID');
  tickers.add(r.ticker);
 }
 if(!rows.length)return {date,score:null,mode:'NO_REAL_SCORED_ETF',
  contributingETFs:[],weightsPercent:null,issuerAumAsOf:null};
 let weights,mode;
 if(rows.length>=3){
  weights=normalize(rows,benchmarkDate,allowDatedOfficialAum);
  mode='NORMALIZED_DATED_OFFICIAL_AUM_THREE_PLUS';
 }else if(rows.length===2){
  try{
   const p=adaptivePairWeights({firstSessions:rows[0].sessions,
    secondSessions:rows[1].sessions,firstStatus:rows[0].status,
    secondStatus:rows[1].status});
   weights={[rows[0].ticker]:p.first,[rows[1].ticker]:p.second};
   mode=p.method;
  }catch(error){
   if(error.message!=='THEME_R3_UNAPPROVED_PAIR_OR_INCOMPLETE_SOURCE')throw error;
   const chosen=pickOne(rows,benchmarkDate,allowDatedOfficialAum);
   weights={[chosen.ticker]:1};
   mode='R32_APPROVED_SINGLE_FALLBACK_FROM_TWO';
  }
 }else{
  weights={[rows[0].ticker]:1};
  mode='R32_APPROVED_SINGLE_REAL_ETF';
 }
 const used=rows.filter(r=>Object.hasOwn(weights,r.ticker));
 const total=Object.values(weights).reduce((s,w)=>s+w,0);
 if(Math.abs(total-1)>1e-12||Object.values(weights).some(w=>w<=0||w>1))
  fail('R32_WEIGHT_SUM_INVALID');
 const score=used.reduce((s,r)=>s+r.score*weights[r.ticker],0);
 if(!valid(score))fail('R32_MIXED_SCORE_INVALID');
 return {date,score:round(score),mode,
  contributingETFs:used.map(r=>r.ticker),
  weightsPercent:Object.fromEntries(used.map(r=>[r.ticker,round(100*weights[r.ticker],6)])),
  issuerAumAsOf:Object.fromEntries(used.map(r=>[r.ticker,r.aumAsOf])),
  datedOfficialAumUsed:used.some(r=>r.aumAsOf!==benchmarkDate)};
}

// Complete read-only 9x252 reducer. Validates the exact R25, R20 and R26
// inputs first. Explicit versioned private approval allows official earlier
// issuer snapshots, preserving the original source dates in every daily row.
export function calculateNineR32Private({r25,roster,aum,aumApproval=null}={}){
 const preflight=inspectNineR32({r25,roster,aum});
 const dates=r25.latest252TradingDates;
 const benchmarkDate=dates.at(-1);
 const allowDatedOfficialAum=aumApproval!==null?
  approvedPolicy(aumApproval,benchmarkDate,preflight.source.rosterSha256):false;
 const byAum=new Map(aum.rows.map(r=>[r.ticker,r]));
 const output=[];
 for(const g of roster.groups){
  const hist=[];
  for(let i=0;i<dates.length;i++){
   const rows=g.tickers.flatMap(({ticker})=>{
    const h=r25.individual[ticker].history[i];
    if(h.score===null)return [];
    const money=byAum.get(ticker);
    return [{ticker,score:h.score,sessions:h.realSessionCount,
     status:h.status,aumUsd:money.aumUsd,aumAsOf:money.aumAsOf}];
   });
   try{hist.push(mixNineR32Date({date:dates[i],rows,benchmarkDate,
    allowDatedOfficialAum}));}
   catch(err){if(err.code==='AUM_FRESHNESS_UNAPPROVED')err.details={
    ...err.details,theme:g.theme,date:dates[i]};throw err;}
  }
  output.push({theme:g.theme,positions:g.tickers.length,
   scoredDates:hist.filter(r=>r.score!==null).length,
   missingDates:hist.filter(r=>r.score===null).length,
   latest:hist.at(-1),history:hist});
 }
 return {contract:'THEME_NINE_R32_PRIVATE_STAGE5_SHADOW_V1',
  status:'PRIVATE_STAGE5_CALCULATED_NOT_PUBLISHED',
  branch:'codex/theme-fear-greed-integration-20261025',
  priceMode:r25.priceMode,source:preflight.source,
  counts:preflight.counts,benchmarkDate,
  aumPolicy:allowDatedOfficialAum?APPROVAL_POLICY:'BENCHMARK_SAME_DATE_ONLY',
  aumEvidenceAsOf:Object.fromEntries(aum.rows.map(r=>[r.ticker,r.aumAsOf])),
  datedOfficialAumContributorDays:output.reduce((n,t)=>n+
   t.history.filter(d=>d.datedOfficialAumUsed).length,0),
  themes:output,publicationAuthorized:false,
  providerCalls:0,dataRootWrites:0,d1Writes:0,
  schedulerWrites:0,formulaWrites:0,publicationWrites:0};
}

const HERE=path.dirname(fileURLToPath(import.meta.url));
const readJSON=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==3||process.argv[2]!=='--private-aggregate')fail('R32_USAGE');
  const folder=process.env.R32_FOLDER;
  if(!folder)fail('R32_FOLDER_NOT_SET');
  const selected=findR25(path.resolve(folder),process.env.R32_SELECTED||'');
  const outputFile=process.env.R32_SHADOW_RESULT;
  if(!outputFile||!path.isAbsolute(outputFile)||
   path.dirname(path.resolve(outputFile))!==path.resolve(folder)||
   !/^THEME_NINE_R32_PRIVATE_SHADOW_[0-9]+_[0-9]+\.json$/i.test(path.basename(outputFile)))
   fail('R32_OUTPUT_PATH_INVALID');
  if(fs.existsSync(outputFile))fail('R32_OUTPUT_COLLISION');
  const r25Bytes=fs.readFileSync(selected);
  const result=calculateNineR32Private({r25:JSON.parse(r25Bytes),
   roster:readJSON(path.join(HERE,'theme-nine-r20-approved-candidates.json')),
   aum:readJSON(path.join(HERE,'theme-nine-r26-official-aum-evidence.json')),
   aumApproval:readJSON(path.join(HERE,'theme-nine-r32-dated-aum-approval.json'))});
  const bytes=Buffer.from(JSON.stringify(result,null,2)+'\n');
  fs.writeFileSync(outputFile,bytes,{flag:'wx'});
  process.stdout.write(JSON.stringify({report:result.contract,status:result.status,
   source:result.source,counts:result.counts,aumPolicy:result.aumPolicy,
   datedOfficialAumContributorDays:result.datedOfficialAumContributorDays,
   resultName:path.basename(outputFile),resultSha256:sha256(bytes),
   inputR25Sha256:sha256(r25Bytes),
   themeSummaries:result.themes.map(t=>({theme:t.theme,
    scoredDates:t.scoredDates,missingDates:t.missingDates,
    latestScore:t.latest?.score??null,
    latestMode:t.latest?.mode??null,latestETFs:t.latest?.contributingETFs??[]})),
   publicationAuthorized:false,providerCalls:0,dataRootWrites:0,
   d1Writes:0,schedulerWrites:0,formulaWrites:0,publicationWrites:0},null,2)+'\n');
 }catch(error){
  process.stderr.write(JSON.stringify({status:'STOP_R32_PRIVATE_AGGREGATE',
   error:error.code||'UNEXPECTED_FAILURE',
   details:error.details||undefined,
   message:error.code?undefined:error.message})+'\n');
  process.exitCode=1;
 }
}
