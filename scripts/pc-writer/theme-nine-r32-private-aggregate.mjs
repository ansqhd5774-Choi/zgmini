// R22 stage 5: pure PRIVATE R32 aggregation from already verified R25 scores.
// No API, filesystem write, D1, scheduler, formula mutation or publication.
// AUM snapshots predating the R25 benchmark are NOT authorized as current;
// fail closed instead of silently treating them as fresh or dropping ETFs.
import {inspectNineR32} from './theme-nine-r32-readonly-preflight.mjs';
import {adaptivePairWeights} from './theme-optional-pair-weight-r3.mjs';

const fail=(code,details={})=>{throw Object.assign(new Error(code),{code,details});};
const round=(n,d=5)=>Number(n.toFixed(d));
const valid=(n)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;

function normalize(rows,benchmarkDate){
 const outdated=rows.filter(r=>r.aumAsOf!==benchmarkDate);
 if(outdated.length)fail('AUM_FRESHNESS_UNAPPROVED',{
  benchmarkDate,older:outdated.map(r=>({ticker:r.ticker,aumAsOf:r.aumAsOf}))});
 const total=rows.reduce((s,r)=>s+r.aumUsd,0);
 if(!Number.isFinite(total)||total<=0)fail('AUM_NORMALIZATION_INVALID');
 return Object.fromEntries(rows.map(r=>[r.ticker,r.aumUsd/total]));
}

function pickOne(rows,benchmarkDate){
 const ordered=[...rows].sort((a,b)=>b.sessions-a.sessions);
 const ties=ordered.filter(r=>r.sessions===ordered[0].sessions);
 if(ties.length===1)return ordered[0];
 normalize(ties,benchmarkDate); // Official CURRENT AUM only for genuine session-count ties.
 ties.sort((a,b)=>b.aumUsd-a.aumUsd||a.ticker.localeCompare(b.ticker,'en'));
 return ties[0];
}

// Pure one-day reducer; fully synthetic inputs can be tested without PC data.
export function mixNineR32Date({date,rows,benchmarkDate}={}){
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
  weights=normalize(rows,benchmarkDate);
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
   const chosen=pickOne(rows,benchmarkDate);
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
  issuerAumAsOf:Object.fromEntries(used.map(r=>[r.ticker,r.aumAsOf]))};
}

// Complete read-only 9x252 reducer. Validates the exact R25, R20 and R26
// inputs first. A stale issuer value aborts the WHOLE attempt, not just its ETF.
export function calculateNineR32Private({r25,roster,aum}={}){
 const preflight=inspectNineR32({r25,roster,aum});
 const dates=r25.latest252TradingDates;
 const benchmarkDate=dates.at(-1);
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
   try{hist.push(mixNineR32Date({date:dates[i],rows,benchmarkDate}));}
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
  themes:output,publicationAuthorized:false,
  providerCalls:0,dataRootWrites:0,d1Writes:0,
  schedulerWrites:0,formulaWrites:0,publicationWrites:0};
}
