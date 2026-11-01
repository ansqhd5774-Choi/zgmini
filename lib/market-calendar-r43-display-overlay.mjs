// Optional, independent market-importance badge. This does not replace the
// annual manual FHS-R3 financial-health grade or its existing star filter.
import {R43_METHOD,r43ImportanceIndex,r43IssuerKey,
 R43_REVIEWED_EXCEPTION_POLICY,R43_REVIEWED_EXCEPTION_ISSUERS} from './market-calendar-r43-issuer-rank.mjs';

export const R43_MARKET_IMPORTANCE_PUBLIC_KEY='market-calendar:market-importance-r43-public';
export const R43_MARKET_IMPORTANCE_DISPLAY_VERSION='ZGMINI-R43-MARKET-IMPORTANCE';

const SYMBOL=/^[A-Z0-9][A-Z0-9.\-]{0,11}$/;
const DAY=/^20\d\d-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const safeDay=s=>typeof s==='string'&&DAY.test(s)&&
  new Date(`${s}T00:00:00Z`).toISOString().slice(0,10)===s;

// Produces a compact, public-safe output from a *full-universe*, prevalidated
// local ranking. Never contains quotes, prices, volumes or vendor payloads.
// This does not perform a D1 write or any network/PC Core operation.
export function makeR43MarketImportanceDisplay(ranked,{now=Date.now()}={}){
  if(!r43ImportanceIndex(ranked,{now}))throw Error('R43_PUBLIC_NOT_VERIFIED');
  // Reviewed exceptions occupy existing 5% slots, so ★★★ flags need not be
  // contiguous in the model-score ranking.
  const selected=ranked.rankings.filter(row=>row.importance===3);
  if(selected.length!==ranked.topCount)throw Error('R43_PUBLIC_TOP_QUOTA_MISMATCH');
  return {
    status:'READY_MARKET_IMPORTANCE',version:R43_MARKET_IMPORTANCE_DISPLAY_VERSION,
    method:R43_METHOD,asOf:ranked.asOf,eligibleIssuers:ranked.coverage.eligibleIssuers,
    expectedEligibleIssuers:ranked.coverage.expectedEligibleIssuers,
    priceVolumeCoverage:ranked.coverage.priceVolume,
    relativeVolumeCoverage:ranked.coverage.relativeVolume,
    topCount:ranked.topCount,
    selectionPolicy:ranked.selectionPolicy??null,
    reviewedExceptionsApplied:ranked.reviewedExceptionsApplied??[],
    selected:selected.map(row=>({
      issuerId:row.issuerId,tickers:[...row.tickers],
      ...(ranked.selectionPolicy?{selectionReason:row.selectionReason}:{}),
    })),
  };
}

// Read-side validator: treat malformed, stale or unavailable snapshots as
// absent, leaving the existing FHS-R3 and calendar presentation untouched.
export function r43MarketImportanceDisplayIndex(snapshot,{now=Date.now(),maxAgeDays=7}={}){
  if(!snapshot||snapshot.status!=='READY_MARKET_IMPORTANCE'||
    snapshot.version!==R43_MARKET_IMPORTANCE_DISPLAY_VERSION||
    snapshot.method!==R43_METHOD||!safeDay(snapshot.asOf)||
    !Number.isInteger(snapshot.eligibleIssuers)||snapshot.eligibleIssuers<100||
    !Number.isInteger(snapshot.expectedEligibleIssuers)||snapshot.expectedEligibleIssuers<100||
    snapshot.eligibleIssuers<Math.ceil(snapshot.expectedEligibleIssuers*.98)||
    snapshot.eligibleIssuers>snapshot.expectedEligibleIssuers*1.05||
    !(snapshot.priceVolumeCoverage>=.98&&snapshot.priceVolumeCoverage<=1)||
    !(snapshot.relativeVolumeCoverage>=.90&&snapshot.relativeVolumeCoverage<=1)||
    !Number.isInteger(snapshot.topCount)||
    snapshot.topCount!==Math.round(snapshot.eligibleIssuers*.05)||
    !Array.isArray(snapshot.selected)||snapshot.selected.length!==snapshot.topCount||
    !Number.isFinite(now)||!Number.isFinite(maxAgeDays)||maxAgeDays<0)return null;
  const reviewed=snapshot.selectionPolicy===R43_REVIEWED_EXCEPTION_POLICY;
  if(snapshot.selectionPolicy!==null&&!reviewed ||
    !Array.isArray(snapshot.reviewedExceptionsApplied)||
    (!reviewed&&snapshot.reviewedExceptionsApplied.length!==0))return null;
  const at=Date.parse(snapshot.asOf+'T00:00:00Z');
  if(at>now+86400000||now-at>maxAgeDays*86400000)return null;
  const index=new Map(),issuers=new Set();
  const observedReviewed=new Set();
  for(const row of snapshot.selected){
    if(!row||typeof row.issuerId!=='string'||
      !/^[A-Z0-9_.:\-]{1,80}$/.test(row.issuerId)||issuers.has(row.issuerId)||
      !Array.isArray(row.tickers)||!row.tickers.length||row.tickers.length>20)return null;
    if(reviewed&&!['REVIEWED_EXCEPTION','MODEL_SCORE'].includes(row.selectionReason)||
      !reviewed&&Object.hasOwn(row,'selectionReason'))return null;
    issuers.add(row.issuerId);
    let isReviewed=false;
    for(const ticker of row.tickers){
      if(typeof ticker!=='string'||!SYMBOL.test(ticker)||index.has(ticker))return null;
      index.set(ticker,3);
      const canonical=r43IssuerKey(ticker);
      if(R43_REVIEWED_EXCEPTION_ISSUERS.includes(canonical)){
        observedReviewed.add(canonical);isReviewed=true;
      }
    }
    if(reviewed&&row.selectionReason!==(isReviewed?'REVIEWED_EXCEPTION':'MODEL_SCORE'))return null;
  }
  const applied=R43_REVIEWED_EXCEPTION_ISSUERS.filter(key=>observedReviewed.has(key));
  if(reviewed&&(snapshot.reviewedExceptionsApplied.length!==applied.length||
    snapshot.reviewedExceptionsApplied.some((key,i)=>key!==applied[i])))return null;
  return index;
}

// Pure render composition: preserve existing FHS stars and append an explicitly
// labelled, separate market-importance badge only for verified R43 ★★★ issuers.
export function withR43MarketImportanceBadge(html,aliases,index,{asOf}={}){
  if(typeof html!=='string'||!Array.isArray(aliases)||!(index instanceof Map)||
    !safeDay(asOf)||!aliases.some(t=>index.get(t)===3))return html;
  if(html.includes('class="mc-market-importance-r43 '))return html;
  return html.replace(/(<div class=mc-event><span>[^<]*<\/span>)/,
    `$1<span class="mc-market-importance-r43 mc-tag-major" aria-label="시장 중요도 별 3개" title="ZGMINI 시장 중요도 R43 · ${asOf} 기준">시장 중요도 ★★★</span>`);
}
