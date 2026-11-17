// W06 R4 #60: display-only validation of the ACTIVE K1-R2 commodity
// producer. The approved monthly source score, weighting, lag and carry-forward
// decisions remain in public-domain-producers-r2.mjs; never recompute prices here.
import {K1_R2_METHOD,K1_R2_MAX_LAG_MONTHS,K1_R2_WEIGHTS} from './market-score/public-domain-producers-r2.mjs';

const FACTORS=Object.freeze([
 Object.freeze({name:'WTI',source:'FRED/EIA MCOILWTICO',weight:K1_R2_WEIGHTS.wti}),
 Object.freeze({name:'Brent',source:'FRED/EIA MCOILBRENTEU',weight:K1_R2_WEIGHTS.brent}),
 Object.freeze({name:'구리',source:'World Bank Pink Sheet',weight:K1_R2_WEIGHTS.copper}),
 Object.freeze({name:'휘발유',source:'FRED/EIA GASREGCOVM',weight:K1_R2_WEIGHTS.gasoline}),
]);
const score=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
 Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const validMonth=value=>validDate(value)&&value.endsWith('-01');
const monthNumber=date=>Number(date.slice(0,4))*12+Number(date.slice(5,7))-1;
const close=(a,b)=>Math.abs(a-b)<=1e-6;

/** @param {any} domain @param {string|null|undefined} snapshotDate */
export function economicCommoditySourceDate(domain,snapshotDate){
 if(domain?.id!=='commodities'||domain.methodologyVersion!==K1_R2_METHOD
  ||!validDate(snapshotDate)||!Array.isArray(domain.indicators)||domain.indicators.length!==FACTORS.length)return null;
 const dates=domain.indicators.map(row=>row?.observationDate??row?.asOfDate);
 if(dates.some(date=>!validMonth(date)||date>snapshotDate))return null;
 const newest=dates.slice().sort().at(-1);
 // Historic CM-R1 composites omitted the metadata, but their K1-R2
 // updatedAt was already the newest component's true scored month.
 const observation=domain.observationDate??domain.updatedAt;
 if(!validMonth(observation)||observation!==newest||domain.updatedAt!==newest)return null;
 return observation;
}

/** @param {any} domain @param {string|null|undefined} snapshotDate */
export function verifiedEconomicCommodityScore(domain,snapshotDate){
 if(domain?.status!=='READY'||!score(domain.score)
   ||!Array.isArray(domain.missingFactors)||domain.missingFactors.length!==0
   ||domain.freshness!==`INDEPENDENT_LATEST_MAX_${K1_R2_MAX_LAG_MONTHS}_MONTHS`)return null;
 const latest=economicCommoditySourceDate(domain,snapshotDate);
 if(!latest)return null;
 const asOfMonth=monthNumber(snapshotDate);
 let weighted=0;
 for(let i=0;i<FACTORS.length;i++){
  const spec=FACTORS[i],row=domain.indicators[i];
  const date=row?.observationDate??row?.asOfDate;
  if(row?.name!==spec.name||row?.source!==spec.source||row?.status!=='READY'
   ||!score(row.score)||!validMonth(date)||row.asOfDate!==date
   ||row.observationDate!==date)return null;
  const lag=asOfMonth-monthNumber(date);
  if(!Number.isInteger(lag)||lag<0||lag>K1_R2_MAX_LAG_MONTHS
   ||row.lagMonths!==lag||row.freshness!==(lag===0?'CURRENT_MONTH':`LAG_${lag}_MONTHS`))return null;
  weighted+=spec.weight*row.score;
 }
 if(!close(weighted,domain.score))return null;
 // A public current card cannot replace the server's last saved R2
 // historical point with an invented query-date point.
 const last=storedCommodityTrend(domain,latest).at(-1);
 if(!last||last.date!==latest||!score(last.score)||!close(last.score,domain.score))return null;
 return domain.score;
}

/** @param {any} domain @param {string} latest */
function storedCommodityTrend(domain,latest){
 const from=new Date(latest+'T00:00:00Z');
 from.setUTCFullYear(from.getUTCFullYear()-1);
 const earliest=from.toISOString().slice(0,10),seen=new Map();
 let conflict=false;
 for(const row of Array.isArray(domain?.trend)?domain.trend:[]){
  const date=row?.date??row?.label;
  if(!validMonth(date)||date<earliest||date>latest)continue;
  if(row?.status!==undefined&&row.status!=='READY'&&row.status!=='PARTIAL')continue;
  const raw=row?.score===null?null:row?.score??row?.value;
  const value=row?.status==='PARTIAL'||raw===null?null:score(raw)?raw:null;
  if(seen.has(date)&&seen.get(date)!==value)conflict=true;
  seen.set(date,value);
 }
 if(conflict)return [];
 return [...seen].sort(([a],[b])=>a.localeCompare(b)).map(([date,value])=>({date,score:value}));
}

/** @param {any} domain @param {string|null|undefined} snapshotDate @param {number|null|undefined} headline */
export function verifiedEconomicCommodityChart(domain,snapshotDate,headline){
 if(!score(headline)||verifiedEconomicCommodityScore(domain,snapshotDate)!==headline)return [];
 return storedCommodityTrend(domain,economicCommoditySourceDate(domain,snapshotDate));
}

/** @param {any[]} chart @param {any} domain @param {string|null|undefined} snapshotDate @param {number|null|undefined} headline */
export function isEconomicCommodityChartCurrent(chart,domain,snapshotDate,headline){
 if(!score(headline)||verifiedEconomicCommodityScore(domain,snapshotDate)!==headline)return false;
 const last=Array.isArray(chart)?chart.at(-1):null;
 return Boolean(last?.date===economicCommoditySourceDate(domain,snapshotDate)&&score(last.score)&&close(last.score,headline));
}
