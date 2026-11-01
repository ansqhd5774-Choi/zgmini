// AI-only private provisional calculator; consumes the seven-theme VERIFIED
// daily archive and the AI SHA-verified GetMarketHistory confirmed price tables.
// Does not fetch, write, or publish; no new scoring formula is defined here.
import {scoreAll252} from './theme-optional-score-r188.mjs';
import {inspectExistingSevenAiSource} from './theme-ai-marketparquet-readonly-r1.mjs';

const SYMBOLS=['SMH','SOXX','SPY'];
const SOURCE='MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED';
const price=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
  Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const requireTrue=(value,code)=>{if(!value)throw Object.assign(new Error(code),{code});};

export function calculateAiProvisionalWithRealPrices({confirmedDate,privateGmh,verifiedParquet,pendingDates,now=Date.now()}={}){
 requireTrue(date(confirmedDate)&&Array.isArray(pendingDates)&&pendingDates.length>=1&&pendingDates.length<=2&&
  pendingDates.every((d,i)=>date(d)&&d>confirmedDate&&(i===0||d>pendingDates[i-1])&&
   Date.parse(d+'T00:00:00Z')<=now),'AI_PROVISIONAL_DATES_INVALID');
 requireTrue(privateGmh?.tables&&Array.isArray(privateGmh?.dates)&&
  SYMBOLS.every(s=>privateGmh.tables[s] instanceof Map),'AI_PRIVATE_GMH_VERIFICATION_MISSING');
 requireTrue(verifiedParquet?.status==='ACTUAL_TARGET_AND_OVERLAP_ROWS_VERIFIED'&&
  verifiedParquet.source===SOURCE&&verifiedParquet.overlapDate===confirmedDate&&
  verifiedParquet.targetDate===pendingDates.at(-1)&&
  verifiedParquet.dates?.length===pendingDates.length+1&&
  verifiedParquet.dates.every((d,i)=>d.date===[confirmedDate,...pendingDates][i]&&d.shaVerified&&d.complete&&
   SYMBOLS.every(s=>d.coverage?.[s]===true)), 'AI_MARKETPARQUET_PROVENANCE_MISSING');
 const rows=verifiedParquet.privateVerifiedPrices;
 requireTrue(rows&&[confirmedDate,...pendingDates].every(d=>SYMBOLS.every(s=>price(rows[d]?.[s]))),
  'AI_PRIVATE_PARQUET_PRICES_MISSING');
 const common=privateGmh.dates.filter(d=>d<=confirmedDate&&SYMBOLS.every(s=>price(privateGmh.tables[s].get(d)))).slice(-628);
 requireTrue(common.length===628&&common.at(-1)===confirmedDate,'AI_GMH_CONFIRMED_WARMUP_MISSING');
 const overlap={};
 for(const symbol of SYMBOLS){
  overlap[symbol]=Math.abs(rows[confirmedDate][symbol]/privateGmh.tables[symbol].get(confirmedDate)-1);
 }
 // The seven-theme EOD file is split adjusted, while GMH hourly proxies are
 // unadjusted; a large mode discontinuity must never be spliced silently.
 requireTrue(SYMBOLS.every(s=>Number.isFinite(overlap[s])&&overlap[s]<=0.05),
  'AI_CONFIRMED_TO_PROVISIONAL_PRICE_MODE_DRIFT');
 const data={};
 for(const symbol of SYMBOLS){
  data[symbol]=[...common.map(d=>privateGmh.tables[symbol].get(d)),...pendingDates.map(d=>rows[d][symbol])];
 }
 const smh=scoreAll252(data.SMH,data.SPY),soxx=scoreAll252(data.SOXX,data.SPY);
 const points=pendingDates.map((d,i)=>({date:d,score:Number(((smh[252-pendingDates.length+i]+soxx[252-pendingDates.length+i])/2).toFixed(5))}));
 requireTrue(points.every(p=>Number.isFinite(p.score)&&p.score>=0&&p.score<=100),
  'AI_PROVISIONAL_SCORE_INVALID');
 const lineage={source:SOURCE,sourcePriceMode:'SPLIT_ADJUSTED_EOD_NON_DIVIDEND_ADJUSTED',
  confirmedPriceMode:'GMH_UNADJUSTED_15_NY_HOURLY_PROXY',
  maxOverlapDifference:Number(Math.max(...Object.values(overlap)).toFixed(8)),
  sourceStoredAt:verifiedParquet.dates.at(-1).sourceStoredAt,
  files:verifiedParquet.dates.map(({date,sha256})=>({date,sha256})),
  confirmedDate,pendingDates};
 return {status:'PRIVATE_PROVISIONAL_SCORES_VERIFIED',points,lineage,providerCalls:0,d1Writes:0};
}

export async function buildAiProvisionalFromExistingSeven({dataRoot,checked,reference,now=Date.now(),parquetReader}={}){
 const confirmedDate=checked?.observationDate;
 requireTrue(checked?.status==='PRIVATE_CANDIDATE_PARITY_VERIFIED'&&checked.audit?.maxDifference===0&&
  confirmedDate===reference?.observationDate,'AI_CONFIRMED_REFERENCE_NOT_ALIGNED');
 const pendingDates=(reference.phase==='PROVISIONAL'?reference.provisional?.points??[]:[]).map(p=>p.date);
 requireTrue(pendingDates.length>=1&&pendingDates.length<=2,'AI_REFERENCE_PENDING_DATES_MISSING');
 const archived=await inspectExistingSevenAiSource({dataRoot,overlapDate:confirmedDate,
  pendingDates,targetDate:pendingDates.at(-1),includePrivatePrices:true,...(parquetReader?{reader:parquetReader}:{})});
 requireTrue(archived.status==='ACTUAL_TARGET_AND_OVERLAP_ROWS_VERIFIED',
  'AI_SEVEN_SOURCE_'+archived.status);
 return calculateAiProvisionalWithRealPrices({confirmedDate,privateGmh:checked.privateVerifiedPrices,
  verifiedParquet:archived,pendingDates,now});
}
