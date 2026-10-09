// No price rewriting. Windows spanning a known entity/action discontinuity
// remain missing, with the ticker still counted in the membership denominator.
export const R10_PRICE_DISCONTINUITIES=Object.freeze([
 {ticker:'HON',date:'2026-06-29',reason:'REVERSE_SPLIT_AND_SPIN_OFF_SOURCE_DIFFERENCE'},
 {ticker:'DD',date:'2025-11-03',reason:'QNITY_SPIN_OFF'},
 {ticker:'CTVA',date:'2026-10-01',reason:'VYLOR_SPIN_OFF'},
 {ticker:'DOC',date:'2024-03-04',reason:'ENTITY_CHANGE_AT_MERGER'},
]);
export function priceWindowQuarantined(ticker,dates){
 if(ticker==='HON')return true;
 return R10_PRICE_DISCONTINUITIES.some(event=>event.ticker===ticker&&dates[0]<event.date&&dates.at(-1)>=event.date);
}
