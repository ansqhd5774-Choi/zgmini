import {createHash} from 'node:crypto';
import {ASSET_R10_B_CONTRACT,pairedBreadthScore} from '../../lib/market-score/asset-r10-breadth-contract.mjs';
import {isMarketSession} from '../../lib/market-score/breadth-b1-r3-calendar.mjs';

// Pure research replay of the *approved* R10 B formula from already-verified
// daily quality and saved SP500 observations. It never accepts an unverified
// PIT/price receipt as publication permission, and never writes the B ledger.
export const R10_B_MONTHLY_REPLAY_METHOD='R10_B_STORED_DAILY_MONTHLY_REPLAY_R1';
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const QUARTER=/^\d{4}-Q[1-4]$/;
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const validDate=value=>typeof value==='string'&&DATE.test(value)&&
  !Number.isNaN(Date.parse(value+'T00:00:00Z'))&&
  new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const stop=(status,extra={})=>({method:R10_B_MONTHLY_REPLAY_METHOD,status,
  readOnly:true,canPromote:false,productionEligible:false,providerRequests:0,
  approvedInputWrites:0,releaseWrites:0,sqliteWrites:0,d1Writes:0,...extra});
const days=(a,b)=>(Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000;
const near=(a,b)=>typeof a==='number'&&typeof b==='number'&&
  Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-8;
const session=d=>d!=='2025-01-09'&&isMarketSession(d);
const quarterOf=m=>m.slice(0,4)+'-Q'+Math.ceil(Number(m.slice(5,7))/3);

function lastSession(month){
 const [year,number]=month.split('-').map(Number);
 let date=new Date(Date.UTC(year,number,0)).toISOString().slice(0,10);
 for(let i=0;i<10;i++){
  if(session(date))return date;
  date=new Date(Date.parse(date+'T00:00:00Z')-86400000).toISOString().slice(0,10);
 }
 throw Error('MONTH_END_SESSION_NOT_FOUND');
}
function monthsBetween(first,last){
 const out=[],cursor=new Date(first+'-01T00:00:00Z');
 for(let i=0;i<61&&cursor.toISOString().slice(0,7)<=last;i++){
  out.push(cursor.toISOString().slice(0,7));
  cursor.setUTCMonth(cursor.getUTCMonth()+1);
 }
 return out;
}
function validDailyQuality(rows,asOfDate,approvedBHistory){
 if(!Array.isArray(rows)||!rows.length||rows.length>1500)return false;
 // An existing, well-formed approved ledger is the only boundary that permits
 // preserving the known 2025-01-09 Carter closure as a non-scored historical
 // source row. The date must precede the first locked quarter. All its other
 // date/order/arithmetic checks still apply, and no future closure is exempt.
 const firstLockedQuarter=approvedBHistory?.[0]?.quarter;
 const firstLockedMonth=QUARTER.test(firstLockedQuarter??'')?
  firstLockedQuarter.slice(0,4)+'-'+
   String((Number(firstLockedQuarter.at(-1))-1)*3+1).padStart(2,'0')+'-01':null;
 const oldClosureAllowed=date=>date==='2025-01-09'&&firstLockedMonth!==null&&
  date<firstLockedMonth;
 let prior='';
 for(const r of rows){
  if(!validDate(r?.observationDate)||r.observationDate<=prior||
     r.observationDate>asOfDate||
     !(session(r.observationDate)||oldClosureAllowed(r.observationDate))||
     !Number.isInteger(r.members)||r.members<490||r.members>520||
     !Number.isInteger(r.valid200)||r.valid200<0||r.valid200>r.members||
     !Number.isInteger(r.above200)||r.above200<0||r.above200>r.valid200||
     !near(r.coverage,r.valid200/r.members))return false;
  const eligible=r.coverage>=ASSET_R10_B_CONTRACT.coverageThreshold;
  // The approved quality writer emits a score exactly when the fixed
  // denominator passes 98%. A missing score above that threshold is not an
  // innocuous null: it would silently remove a real paired observation.
  if(eligible?
    (r.valid200===0||!near(r.participation,r.above200/r.valid200)):
    r.participation!==null)return false;
  prior=r.observationDate;
 }
 return true;
}
function validBenchmark(rows,asOfDate){
 if(!Array.isArray(rows)||!rows.length||rows.length>2200)return false;
 let prior='';
 for(const row of rows){
  if(!validDate(row?.observationDate)||!session(row.observationDate)||
     row.observationDate<=prior||
     row.observationDate>asOfDate||!Number.isFinite(row.value)||row.value<=0)return false;
  prior=row.observationDate;
 }
 return true;
}
function findAtOrBefore(rows,date){
 let lo=0,hi=rows.length;
 while(lo<hi){const mid=(lo+hi)>>1;if(rows[mid].observationDate<=date)lo=mid+1;else hi=mid;}
 return rows[lo-1]??null;
}

/**
 * Input quality rows must already come from independent fixed-denominator
 * PIT/price validation; this function checks their internal 200MA arithmetic
 * but deliberately does not forge that independent evidence.
 */
export function replayStoredR10BMonthly({qualityRows,sp500Rows,asOfDate,
 approvedBHistory=null}={}){
 if(!validDate(asOfDate))return stop('STOP_REPLAY_ASOF_DATE_INVALID');
 if(!validDailyQuality(qualityRows,asOfDate,approvedBHistory))
  return stop('STOP_REPLAY_DAILY_QUALITY_INVALID');
 if(!validBenchmark(sp500Rows,asOfDate))return stop('STOP_REPLAY_SP500_BENCHMARK_INVALID');
 if(approvedBHistory!==null&&(!Array.isArray(approvedBHistory)||
    approvedBHistory.length===0||approvedBHistory.length>40||
    approvedBHistory.some((r,i)=>!QUARTER.test(r?.quarter??'')||
      (i>0&&r.quarter<=approvedBHistory[i-1].quarter)||
      !(r.breadthDivergence===null||Number.isFinite(r.breadthDivergence)))))
  return stop('STOP_APPROVED_B_HISTORY_INVALID');

 const returns=[],participations=[],daily=[];
 for(const row of qualityRows){
  // The original source row remains in qualityRowsSha256; it is never a
  // tradable observation or a 252-pair/B-score input.
  if(row.observationDate==='2025-01-09')continue;
  if(row.participation===null)continue;
  const date=row.observationDate;
  const yearEarlier=String(Number(date.slice(0,4))-1)+date.slice(4);
  const current=findAtOrBefore(sp500Rows,date),previous=findAtOrBefore(sp500Rows,yearEarlier);
  if(!current||!previous||days(current.observationDate,date)>7||
     days(previous.observationDate,yearEarlier)>7)continue;
  const return12m=current.value/previous.value-1;
  returns.push(return12m);participations.push(row.participation);
  const score=pairedBreadthScore(returns,participations);
  daily.push({observationDate:date,return12m,participation:row.participation,
   rankObservations:returns.length,returnRank:score?.returnRank??null,
   participationRank:score?.participationRank??null,
   breadthGap:score?.breadthGap??null,researchSafetyScore:score?.score??null,
   valid200:row.valid200,memberCount:row.members,coverage:row.coverage});
 }
 const finalMonth=asOfDate.slice(0,7);
 const monthNames=monthsBetween(qualityRows[0].observationDate.slice(0,7),finalMonth)
  .filter(m=>m<finalMonth);
 if(!monthNames.length||monthNames.length>60)return stop('STOP_REPLAY_MONTH_WINDOW_INVALID');
 const monthRows=monthNames.map(month=>{
  const expected=lastSession(month);
  const matches=daily.filter(r=>r.observationDate.slice(0,7)===month&&
    r.researchSafetyScore!==null);
  const last=matches.at(-1)??null;
  const complete=last?.observationDate===expected;
  return {month,lastExpectedSession:expected,lastObservedSession:last?.observationDate??null,
   rankObservations:last?.rankObservations??0,
   validPriceWindowMembers:last?.valid200??null,memberCount:last?.memberCount??null,
   coverage:last?.coverage??null,
   researchSafetyScore:complete?last.researchSafetyScore:null,
   status:complete?'READY':'PARTIAL'};
 });
 const quarters=[...new Set(monthRows.map(r=>quarterOf(r.month)))].sort().map(quarter=>{
  const rows=monthRows.filter(r=>quarterOf(r.month)===quarter&&r.status==='READY');
  const value=rows.length===3?rows.reduce((sum,r)=>sum+r.researchSafetyScore,0)/3:null;
  return {quarter,breadthDivergence:value,validMonths:rows.length,status:value===null?'PARTIAL':'READY'};
 });
 if(approvedBHistory!==null){
  const computed=new Map(quarters.map(r=>[r.quarter,r.breadthDivergence]));
  for(const approved of approvedBHistory){
   if(!computed.has(approved.quarter)||
     !(approved.breadthDivergence===null?
       computed.get(approved.quarter)===null:
       near(approved.breadthDivergence,computed.get(approved.quarter))))
    return stop('STOP_APPROVED_B_QUARTER_REPLAY_DRIFT',{
     firstMismatchQuarter:approved.quarter});
  }
 }
 return stop(approvedBHistory===null?
   'RESEARCH_B_REPLAY_NO_APPROVED_BASELINE':'RESEARCH_B_REPLAY_BASELINE_MATCH_NOT_AUTOPROMOTABLE',{
  qualityRowsSha256:digest(qualityRows),benchmarkRowsSha256:digest(sp500Rows),
  scoredObservationCount:daily.filter(r=>r.researchSafetyScore!==null).length,
  pairedObservationCount:daily.length,firstScoredObservationDate:
   daily.find(r=>r.researchSafetyScore!==null)?.observationDate??null,
  months:monthRows,quarters,
  nextGate:'INDEPENDENT_PIT_PRICE_RIGHTS_AND_APPROVED_SCORE_REPLAY_BEFORE_PUBLICATION',
 });
}
