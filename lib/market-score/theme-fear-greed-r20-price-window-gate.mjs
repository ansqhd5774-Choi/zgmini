/**
 * R20 pure price-input DATE availability only for existing sector R3 warmups.
 * Does not compute any market scores or authorize publication.
 * NOTE: 756 reference, ETF historical identity, PIT, breadth and demand are
 * independent preconditions, never implied by a date-window count.
 */
export const R20_PRICE_WINDOW_VERSION='THEME-R20-PRICE-WINDOW-DATES-ONLY-V1';
const fail=message=>{throw Error('R20_'+message);};
const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export function checkedR20Rows(rows){
  if(!Array.isArray(rows))fail('PRICE_ROWS_INVALID');
  let previous='';
  return rows.map(row=>{
    const date=String(row?.date??row?.tradeDate??row?.t??'').slice(0,10);
    const close=Number(row?.close??row?.currentClose??row?.c);
    const volume=Number(row?.volume??row?.currentVolume??row?.v??0);
    if(!validDate(date)||date<=previous||!finite(close)||close<=0||!finite(volume)||volume<0)fail('PRICE_ROW_INVALID_OR_UNSORTED');
    previous=date;
    return {date,close,volume};
  });
}
/**
 * Exact input *date offsets* observed in R3 rolling source:
 * trend index 124; volatility index 62; relativeStrength aligned index 125;
 * each normalized metric needs 252 raw samples, so add 251 date offsets.
 * This is only an availability UPPER BOUND, not an axis score or a claim
 * that R3 normalization/reference/stock constituent inputs are complete.
 */
export function auditR20ThreeAxisDatePotential(ticker,etfRows,spyRows,cutoverDate=null){
  if(typeof ticker!=='string'||!ticker)fail('TICKER_INVALID');
  const etf=checkedR20Rows(etfRows),spy=checkedR20Rows(spyRows);
  if(cutoverDate!==null&&!validDate(cutoverDate))fail('CUTOVER_INVALID');
  const eligible=cutoverDate?etf.filter(row=>row.date>=cutoverDate):etf;
  const spyDates=new Set(spy.map(row=>row.date));
  const aligned=eligible.filter(row=>spyDates.has(row.date));
  const trendDates=new Set(eligible.slice(124+251).map(row=>row.date));
  const volDates=new Set(eligible.slice(62+251).map(row=>row.date));
  const relativeDates=new Set(aligned.slice(125+251).map(row=>row.date));
  const common=[...relativeDates].filter(date=>trendDates.has(date)&&volDates.has(date)).sort();
  return {ticker,cutoverDate,storedBars:etf.length,postKnownBoundaryBars:eligible.length,
    benchmarkAlignedBars:aligned.length,benchmarkFirstDate:spy[0]?.date??null,
    benchmarkLastDate:spy.at(-1)?.date??null,
    trendPercentilePossibleDates:trendDates.size,
    volatilityPercentilePossibleDates:volDates.size,
    relativeStrengthPercentilePossibleDates:relativeDates.size,
    threeAxisCommonDates:common.length,
    last252ThreeAxisDatePotential:common.length>=252?{first:common.at(-252),last:common.at(-1)}:null,
    threeAxis252DatePotential:common.length>=252,
    reference756Verified:false,securityContinuityVerified:false,
    threeAxesActuallyScored:false,breadthVerified:false,demandVerified:false,
    fiveAxisScoreReady:false,publicationApproved:false,
    _dates:common};
}
