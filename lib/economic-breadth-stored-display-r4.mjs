// W06 R4 #58: read-only verification of the ACTIVE four-factor B1-R5 score.
// The separate V9/V11 five-factor artifacts have retired public projections.
// Do not reconstruct, reweight or expose their formulas in the visitor UI.
import {B1_R5_METHOD,B1_R5_MAX_STALE_SESSIONS} from './market-score/breadth-b1-r5-contract.mjs';
import {isMarketSession,latestCompletedSession,countCompletedSessionsSince} from './market-score/breadth-b1-r3-calendar.mjs';

const IDS=Object.freeze(['breadth-41','breadth-42','breadth-43','breadth-44']);
const NAMES=Object.freeze(['상승종목비율','상승거래대금비율','5일 수급 EMA','20일 수급 EMA']);
const finiteScore=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
 Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const close=(a,b)=>Math.abs(a-b)<=1e-6;

/** @param {any} domain @param {string|null|undefined} snapshotDate */
export function economicBreadthSourceDate(domain,snapshotDate){
 if(domain?.id!=='breadth'||domain.methodologyVersion!==B1_R5_METHOD
   ||!validDate(snapshotDate)||!validDate(domain?.asOfDate)
   ||domain.asOfDate!==snapshotDate)return null;
 const indicators=domain.indicators;
 if(!Array.isArray(indicators)||indicators.length!==4)return null;
 const fromRows=indicators.map(row=>row?.observationDate);
 if(fromRows.some(day=>!validDate(day))||new Set(fromRows).size!==1)return null;
 const observation=domain.observationDate??fromRows[0];
 // Historical CM-R1 breadth snapshots omitted the top-level date. Their
 // four stored B1-R5 detail rows already had the genuine trade date.
 if(!validDate(observation)||!isMarketSession(observation)
  ||observation>snapshotDate||observation!==fromRows[0])return null;
 const updated=Date.parse(domain?.updatedAt??'');
 if(!Number.isFinite(updated)||new Date(updated).toISOString()!==domain.updatedAt)return null;
 const lastComplete=latestCompletedSession(new Date(updated));
 if(observation>lastComplete)return null; // NY 16:15 settlement gate
 const lag=countCompletedSessionsSince(observation,new Date(updated));
 if(!Number.isInteger(lag)||lag<0||lag>B1_R5_MAX_STALE_SESSIONS)return null;
 if(domain.freshness!==(lag===0?'CURRENT':`LAG_${lag}_SESSIONS`))return null;
 return observation;
}

function savedBreadthChart(domain,observation){
 const first=new Date(observation+'T00:00:00Z');
 first.setUTCFullYear(first.getUTCFullYear()-1);
 const since=first.toISOString().slice(0,10),points=new Map();
 let conflict=false;
 for(const point of Array.isArray(domain?.trend)?domain.trend:[]){
  const day=point?.date??point?.label;
  if(!validDate(day)||day<since||day>observation||!isMarketSession(day))continue;
  if(point?.status&&point.status!=='READY'&&point.status!=='PARTIAL')continue;
  const raw=point?.score===null?null:point?.score??point?.value;
  const value=point?.status==='PARTIAL'||raw===null?null:finiteScore(raw)?raw:null;
  if(points.has(day)&&points.get(day)!==value)conflict=true;
  points.set(day,value);
 }
 if(conflict)return [];
 return [...points].sort(([a],[b])=>a.localeCompare(b)).map(([date,score])=>({date,score}));
}

/** @param {any} domain @param {string|null|undefined} snapshotDate */
export function verifiedEconomicBreadthScore(domain,snapshotDate){
 if(domain?.status!=='READY'||!finiteScore(domain.score)
  ||!Array.isArray(domain.missingFactors)||domain.missingFactors.length!==0)return null;
 const date=economicBreadthSourceDate(domain,snapshotDate);
 if(!date)return null;
 const observed=new Set(),sources=new Set();
 for(let i=0;i<IDS.length;i++){
  const row=domain.indicators[i];
  if(row?.id!==IDS[i]||row?.name!==NAMES[i]||row?.status!=='READY'
    ||!finiteScore(row.score)||!finiteScore(row.value)
    ||!close(row.score,row.value)||row.observationDate!==date
    ||typeof row.source!=='string'||!row.source.trim())return null;
  observed.add(row.observationDate);sources.add(row.source);
 }
 if(observed.size!==1||sources.size!==1)return null;
 // The approved R5 server Reader owns the four-factor aggregation + EMA3.
 // Verify its stored last point, never invent a fresh client-side point.
 const chart=savedBreadthChart(domain,date),last=chart.at(-1);
 if(!last||last.date!==date||!finiteScore(last.score)||!close(last.score,domain.score))return null;
 return domain.score;
}

/** @param {any} domain @param {string|null|undefined} snapshotDate @param {number|null|undefined} headline */
export function verifiedEconomicBreadthChart(domain,snapshotDate,headline){
 if(!finiteScore(headline)||verifiedEconomicBreadthScore(domain,snapshotDate)!==headline)return [];
 return savedBreadthChart(domain,economicBreadthSourceDate(domain,snapshotDate));
}

/** @param {any[]} chart @param {any} domain @param {string|null|undefined} snapshotDate @param {number|null|undefined} headline */
export function isEconomicBreadthChartCurrent(chart,domain,snapshotDate,headline){
 if(!finiteScore(headline)||verifiedEconomicBreadthScore(domain,snapshotDate)!==headline)return false;
 const latest=Array.isArray(chart)?chart.at(-1):null;
 return Boolean(latest&&latest.date===economicBreadthSourceDate(domain,snapshotDate)
  &&finiteScore(latest.score)&&close(latest.score,headline));
}
