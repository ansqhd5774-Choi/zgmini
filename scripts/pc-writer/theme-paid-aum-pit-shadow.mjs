// Opt-in, stored-input-only PIT shadow. Never imported by the live paid cycle.
// This helper does not change the approved one-AUM-row registration contract.
import {mixNineR32Date} from './theme-r32-pure.mjs';
const fail=code=>{throw Object.assign(new Error(code),{code});};
const day=s=>typeof s==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(s)&&
 !Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const valid=n=>Number.isFinite(n)&&n>=0&&n<=100;
const METHOD_STATUSES=new Set(['ADAPTIVE_PROVISIONAL','R188_COMPATIBLE']);

// Candidate evidence has two separate dates: AUM measurement and first public filing.
// No old 2025 AUM replaces any approved observed score on or after transitionDate.
export function shadowPaidAumPit({dates,symbols,scoreBySymbol,officialCandidates,
 transitionDate,existingHistory=[],recalculatedExistingHistory=null}={}){
 if(!Array.isArray(dates)||!dates.length||!dates.every((d,i)=>day(d)&&(!i||dates[i-1]<d))||
  !day(transitionDate)||!Array.isArray(symbols)||!symbols.length||
  new Set(symbols).size!==symbols.length||symbols.some(s=>!/^[A-Z][A-Z0-9.-]{0,15}$/.test(s))||
  !Array.isArray(officialCandidates)||!Array.isArray(existingHistory))fail('PIT_SHADOW_INPUT_INVALID');
 const candidates=new Map(symbols.map(s=>[s,[]]));
 for(const a of officialCandidates){
  if(!candidates.has(a?.ticker)||!day(a.aumAsOf)||!day(a.firstAvailableDate)||
   a.aumAsOf>a.firstAvailableDate||!Number.isFinite(a.aumUsd)||a.aumUsd<=0||
   typeof a.sourceUrl!=='string'||!a.sourceUrl.startsWith('https://'))fail('PIT_SHADOW_EVIDENCE_INVALID');
  candidates.get(a.ticker).push(a);
 }
 for(const entries of candidates.values()){
  entries.sort((a,b)=>b.aumAsOf.localeCompare(a.aumAsOf)||b.firstAvailableDate.localeCompare(a.firstAvailableDate));
  for(let i=1;i<entries.length;i++)if(entries[i].aumAsOf===entries[i-1].aumAsOf&&
   entries[i].firstAvailableDate===entries[i-1].firstAvailableDate)fail('PIT_SHADOW_EVIDENCE_AMBIGUOUS');
 }
 const baseline=new Map();
 for(const item of existingHistory){
  if(!day(item?.date)||!valid(item.score)||baseline.has(item.date)||item.date<transitionDate)
   fail('PIT_SHADOW_BASELINE_INVALID');
  baseline.set(item.date,item.score);
 }
 let existingScoreParityVerified=null;
 if(recalculatedExistingHistory!==null){
  if(!Array.isArray(recalculatedExistingHistory)||recalculatedExistingHistory.length!==baseline.size||
   recalculatedExistingHistory.some(p=>!day(p?.date)||!valid(p.score)||baseline.get(p.date)!==p.score))
   fail('PIT_SHADOW_EXISTING_SCORE_DRIFT');
  existingScoreParityVerified=true;
 }
 const candidateHistory=[];
 for(const date of dates.filter(d=>d<transitionDate)){
  const rows=symbols.flatMap(ticker=>{
   const e=candidates.get(ticker).find(c=>c.aumAsOf<=date&&c.firstAvailableDate<=date);
   const item=scoreBySymbol?.[ticker]?.find(p=>p.date===date);
   if(!e||!item||!valid(item.score)||!Number.isInteger(item.realSessionCount)||
    item.realSessionCount<40||!METHOD_STATUSES.has(item.status))return [];
   return [{ticker,score:item.score,sessions:item.realSessionCount,
    status:item.status,aumUsd:e.aumUsd,aumAsOf:e.aumAsOf}];
  });
  const point=mixNineR32Date({date,rows,benchmarkDate:date,allowDatedOfficialAum:true});
  candidateHistory.push({date,score:point.score,mode:point.mode,contributorCount:point.contributingETFs.length});
 }
 const added=candidateHistory.filter(x=>x.score!==null);
 return {status:'SHADOW_ONLY_NOT_APPROVED_FOR_PUBLICATION',
  transitionDate,additionalScoredDates:added.length,
  firstAdditionalDate:added[0]?.date??null,lastAdditionalDate:added.at(-1)?.date??null,
  priorScoredDates:existingHistory.length,existingHistoryCopied:true,existingScoreParityVerified,
  candidateHistory,existingHistory:existingHistory.map(x=>({date:x.date,score:x.score})),
  providerCalls:0,operationalWrites:0,d1Writes:0};
}
