/**
 * Whole-US R2 percent-only public contract for purchased MarketParquet data.
 * Distinct from SP500 B1-R5, retired free-R1, old R2 and Alpaca IEX.
 * No provider requests, Node imports, DB accesses or side effects.
 */
import {previousMarketSession} from '../lib/market-score/breadth-b1-r6-marketparquet-provider.mjs';

export const US_PAID_R2_FEED_KEY='us-breadth-paid-r2-v1';
export const US_PAID_R2_VERSION='ZGMINI_US_PAID_BREADTH_R2_PUBLIC_V1';
export const US_PAID_R2_SOURCE='MARKETPARQUET_PAID_SPLIT_ADJUSTED_DAILY';
export const US_PAID_R2_UNIVERSE='US_MARKETPARQUET_ACTIVE_STOCKS';
export const US_PAID_R2_PRICE_MODE='SPLIT_ADJUSTED_DAILY_CLOSE';
export const US_PAID_R2_METHOD='ISSUE_DIRECTION_COUNTS_MISSING_AS_UNCHANGED_R2';
const recordFields=['finalizedAt','firstDate','historyComplete','lastDate',
  'market','methodologyVersion','observationDate','phase','plan','points',
  'priceMode','publicationStage','source','sourceFileSha256','status',
  'universe','version'].sort().join(',');
const pointFields='date,fallingPct,risingPct,unchangedPct';
const exact=(x,fields)=>x&&typeof x==='object'&&!Array.isArray(x)
  &&Object.keys(x).sort().join(',')===fields;
const day=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)
  &&Number.isFinite(Date.parse(s+'T00:00:00Z'))
  &&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const pct=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const iso=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))
  &&new Date(s).toISOString()===s;

export function validPaidUsR2Record(r){
  if(!exact(r,recordFields)||r.version!==US_PAID_R2_VERSION
     ||r.status!=='READY'||r.phase!=='CONFIRMED'
     ||r.publicationStage!=='PUBLIC_FINAL'
     ||r.market!=='usa'||r.plan!=='full'
     ||r.source!==US_PAID_R2_SOURCE||r.universe!==US_PAID_R2_UNIVERSE
     ||r.priceMode!==US_PAID_R2_PRICE_MODE
     ||r.methodologyVersion!==US_PAID_R2_METHOD
     ||!iso(r.finalizedAt)||!sha(r.sourceFileSha256)
     ||!day(r.firstDate)||!day(r.lastDate)
     ||r.observationDate!==r.lastDate
     ||!Array.isArray(r.points)||r.points.length!==250
     ||r.historyComplete!==true
     ||r.points[0]?.date!==r.firstDate
     ||r.points.at(-1)?.date!==r.lastDate)return false;
  for(let i=0;i<r.points.length;i++){
    const p=r.points[i];
    if(!exact(p,pointFields)||!day(p.date)
       ||!pct(p.risingPct)||!pct(p.fallingPct)||!pct(p.unchangedPct)
       ||Math.abs(p.risingPct+p.fallingPct+p.unchangedPct-100)>1e-7
       ||i>0&&previousMarketSession(p.date)!==r.points[i-1].date)
      return false;
  }
  return true;
}

export function paidUsR2PublicProjection(r,{history=true}={}){
  if(!validPaidUsR2Record(r))return null;
  const project=p=>({date:p.date,risingPct:p.risingPct,
    unchangedPct:p.unchangedPct,fallingPct:p.fallingPct});
  return {
    version:r.version,status:r.status,market:r.market,phase:r.phase,
    source:r.source,universe:r.universe,
    methodologyVersion:r.methodologyVersion,priceMode:r.priceMode,
    observationDate:r.observationDate,finalizedAt:r.finalizedAt,
    firstDate:r.firstDate,lastDate:r.lastDate,
    historyComplete:r.historyComplete,
    current:project(r.points.at(-1)),
    ...(history?{points:r.points.map(project)}:{}),
  };
}
