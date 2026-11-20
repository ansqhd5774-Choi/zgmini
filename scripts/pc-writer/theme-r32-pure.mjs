// Exact approved R32 date reducer and helpers; no arithmetic changes.
// Original section SHA256: 2ff010aeb0d45c0665ad7b92134c2c014486ed452138c98d8d82f5e3cd6c5b95
import {adaptivePairWeights} from './theme-optional-pair-weight-r3.mjs';
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

