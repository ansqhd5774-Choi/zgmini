/**
 * R81: dated-listing constraints for 13 R78 semiconductor missing symbols.
 * Observational research gate ONLY: no membership/PIT, OHLCV, provider, DB,
 * change to approved 756-observation axis window, score or publication.
 * 756 is an AXIS reference count, not a per-constituent listing requirement.
 */
export const R81_VERSION = 'THEME-R81-DATED-IPO-HISTORY-BOUND-V1';
export const R81_RESEARCH_ASOF = '2026-10-16';
export const R81_MISSING_SYMBOLS = Object.freeze([
  'TSM','ASML','SKHY','ALAB','ARM','STM','CRDO','ENTG','TSEM','MTSI','ASX','CBRS','UMC',
]);
// Source links are official listing-date evidence, not market-data licences.
export const R81_VERIFIED_FIRST_US_TRADES = Object.freeze({
  SKHY: Object.freeze({date:'2026-07-10',regularWay:'2026-07-13',priorTemporaryTicker:'SKHYV',source:'https://www.nasdaqtrader.com/TraderNews.aspx?id=DTN2026-11'}),
  CBRS: Object.freeze({date:'2026-05-14',source:'https://www.cerebras.ai/press-release/cerebras-systems-announces-closing-of-initial-public-offering'}),
  ALAB: Object.freeze({date:'2024-03-20',source:'https://ir.asteralabs.com/static-files/72301d16-1396-4171-be97-17ddb4c100e9'}),
});
const validDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s+'T00:00:00Z')) && new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const fail = code=>{throw Error('R81_'+code);};
const requireIt=(condition,code)=>{if(!condition)fail(code);};
/** Weekdays are an UPPER bound on possible US exchange sessions.
 * It does not infer that a bar existed or a symbol was held.
 */
export function upperBoundWeekdaysInclusive(firstTrade,asof=R81_RESEARCH_ASOF){
  requireIt(validDate(firstTrade)&&validDate(asof)&&firstTrade<=asof,'INVALID_DATE_RANGE');
  const from=Date.parse(firstTrade+'T00:00:00Z'),to=Date.parse(asof+'T00:00:00Z');
  requireIt((to-from)/86400000<=36525,'UNBOUNDED_DATE_RANGE');
  let weekdays=0;
  for(let day=from;day<=to;day+=86400000){const w=new Date(day).getUTCDay();if(w!==0&&w!==6)weekdays++;}
  return weekdays;
}
export function auditR81ShortListedEquities({asof=R81_RESEARCH_ASOF,missing=R81_MISSING_SYMBOLS}={}){
  requireIt(asof===R81_RESEARCH_ASOF,'RESEARCH_ASOF_DRIFT');
  requireIt(Array.isArray(missing)&&missing.length===13&&new Set(missing).size===13&&missing.every(t=>R81_MISSING_SYMBOLS.includes(t)),'R78_MISSING_UNIVERSE_DRIFT');
  const known=Object.entries(R81_VERIFIED_FIRST_US_TRADES).map(([ticker,x])=>{
    requireIt(missing.includes(ticker),'IPO_NOT_IN_MISSING_UNIVERSE');
    const maxPossibleWeekdays=upperBoundWeekdaysInclusive(x.date,asof);
    return Object.freeze({ticker,firstUsTrade:x.date,maxPossibleWeekdays,lessThan252:maxPossibleWeekdays<252,lessThan756:maxPossibleWeekdays<756,
      source:x.source,observedBars:0,individual756RequiredByR3:false,priorTickerReviewRequired:!!x.priorTemporaryTicker});
  });
  return Object.freeze({version:R81_VERSION,asof,missingSymbols:missing.length,knownShortListings:known.length,
    provablyFewerThan252PossibleSessions:known.filter(x=>x.lessThan252).length,
    provablyFewerThan756PossibleSessions:known.filter(x=>x.lessThan756).length,
    remainingSymbolsWithoutVerifiedUSStart:missing.length-known.length,
    listingChecks:Object.freeze(known),historicalPITMemberDatesVerified:false,
    actualMarketBarsRecovered:0,axisReference756Verified:false,memberAdjustedDataVerified:false,
    perMember756IsNOTTheApprovedRule:true,publicScoreComputed:false,
    verdict:'OFFICIAL_LISTING_DATE_UPPER_BOUNDS_ONLY_NO_PIT_OR_DATA_BACKFILL'});
}
export function isR81PossiblePostListingTradeDate(ticker,tradeDate){
  const x=R81_VERIFIED_FIRST_US_TRADES[ticker];
  requireIt(!!x&&validDate(tradeDate),'UNKNOWN_SYMBOL_OR_DATE');
  return tradeDate>=x.date&&tradeDate<=R81_RESEARCH_ASOF;
}