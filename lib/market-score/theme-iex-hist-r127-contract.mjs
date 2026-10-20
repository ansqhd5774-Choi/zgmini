/** User-authorized IEX HIST direct source candidate for ETF-theme 5-axis scores.
 * Research-only source gate; this file deliberately does not modify any active
 * price collectors, market formulas, score contracts, schedules, D1 or APIs.
 */
export const THEME_IEX_R127_SOURCE='IEX_HIST_DIRECT';
export const THEME_IEX_R127_FEED='TOPS1.6';
export const THEME_IEX_R127_TERMS='https://www.iex.io/legal/hist-data-terms';
export const THEME_IEX_R127_ATTRIBUTION='Data provided for free by IEX. By accessing or using IEX Historical Data, you agree to the IEX Historical Data Terms of Use.';
export const THEME_IEX_R127_ETFS=Object.freeze(['BOTZ','ROBO','SKYY','CLOU','DRIV','IBB','GNOM','HERO','ESPO','NLR','URA','ITA','SHLD','FINX','ARKF','CIBR','BUG']);
export const THEME_IEX_R127_REFERENCE_SESSIONS=756;
const exactDay=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
/** Validates research-only IEX-direct rows, never returns an operational PASS.
 * OBSERVED_IEX_ONLY is a raw trade-derived close, not an adjusted ETF close.
 */
export function auditThemeIexDirectHistory({days=[]}={}){
 if(!Array.isArray(days))throw Error('R127_DAYS_ARRAY_REQUIRED');
 const seen=new Set(),counts=Object.fromEntries(THEME_IEX_R127_ETFS.map(t=>[t,0]));
 for(const day of days){
  if(!exactDay(day?.date)||seen.has(day.date))throw Error('R127_DAY_DUPLICATE_OR_INVALID');
  if(day.provider!==THEME_IEX_R127_SOURCE||day.feed!==THEME_IEX_R127_FEED||day.adjustment!=='none'||day.venue!=='IEX_EXCHANGE_ONLY')throw Error('R127_PROVENANCE_MISMATCH');
  seen.add(day.date);
  for(const ticker of THEME_IEX_R127_ETFS){
   const v=day.bars?.[ticker];
   if(v?.status==='OBSERVED_IEX_ONLY'&&Number.isFinite(v.close)&&v.close>0&&Number.isSafeInteger(v.volume)&&v.volume>0)counts[ticker]++;
  }
 }
 const missing=THEME_IEX_R127_ETFS.filter(t=>counts[t]<THEME_IEX_R127_REFERENCE_SESSIONS);
 return {status:'RESEARCH_ONLY_SOURCE_GATE',source:THEME_IEX_R127_SOURCE,feed:THEME_IEX_R127_FEED,
  referenceSessions:THEME_IEX_R127_REFERENCE_SESSIONS,observedDates:seen.size,etfCount:THEME_IEX_R127_ETFS.length,
  completeETFs:THEME_IEX_R127_ETFS.length-missing.length,missingETFs:missing,counts,
  sourceHas756Days:seen.size>=THEME_IEX_R127_REFERENCE_SESSIONS,
  readyToReplaceAlpaca:false,readyForPublicScore:false,
  blockers:['LIVE_IEX_COVERAGE_NOT_VERIFIED','IEX_LAST_SALE_NOT_SPLIT_ADJUSTED_OR_CONSOLIDATED','UNCHANGED_FORMULA_REQUIRES_COMPATIBLE_OHLCV','EXACT_PUBLICATION_GATE_NOT_RUN'],
  attribution:THEME_IEX_R127_ATTRIBUTION,termsUrl:THEME_IEX_R127_TERMS};
}
