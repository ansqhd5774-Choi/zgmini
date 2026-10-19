import {scoreSectorFearGreedR3,SECTOR_FEAR_GREED_R3_AXIS_KEYS} from './sector-fear-greed-r3-five-axis-complete.mjs';
import {R66_SEC_IDENTITIES,R66_THEME_PAIRS} from './theme-r66-sec-issuer-registry.mjs';

/** R72: use the 2026-10-18 approved sector-R3 weighting for theme ETF R1.
 * Computational adapter only. No approval to invent ETF aggregation ratios.
 * No I/O, scoring of incomplete evidence, public payload, DB or deployment.
 */
export const THEME_R72_VERSION='THEME-R72-APPROVED-FIVE-AXIS-PER-ETF-ONLY-V1';
const isDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const fail=code=>{throw Error('THEME_R72_'+code);};
const validScore=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const req=(yes,code)=>{if(!yes)fail(code);};
const hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function assess(ticker,input){
 const gaps=[],need=(ok,code)=>{if(!ok)gaps.push(code);};
 const axes=input?.axes??{};
 for(const axis of SECTOR_FEAR_GREED_R3_AXIS_KEYS){
  if(hasOwn(axes,axis)&&axes[axis]!==null&&axes[axis]!==undefined&&!validScore(axes[axis]))fail('AXIS_INVALID_'+axis);
  need(validScore(axes[axis]),'MISSING_AXIS_'+axis);
 }
 const stamps=input?.axisProvenance??{};
 for(const axis of SECTOR_FEAR_GREED_R3_AXIS_KEYS){
  const p=stamps[axis];need(p?.storedVerified===true&&p?.observedDate===input.observationDate,'AXIS_NOT_STORED_AND_DATE_MATCHED_'+axis);
 }
 need(input?.priceHistory252Verified===true,'PRICE_252_NOT_VERIFIED');
 need(input?.reference756Verified===true,'REFERENCE_756_NOT_VERIFIED');
 need(input?.dailyMemberPITVerified===true,'HISTORICAL_MEMBER_PIT_NOT_VERIFIED');
 need(input?.memberPriceVolumeAligned===true,'MEMBER_PRICE_VOLUME_NOT_ALIGNED');
 need(input?.volumeRevisionResolved===true,'VOLUME_REVISIONS_UNRESOLVED');
 const score=gaps.length===0?scoreSectorFearGreedR3(axes):null;
 return Object.freeze({ticker,observationDate:input.observationDate,verifiedFiveAxisResearchScore:score,
  missingRequirements:Object.freeze(gaps),status:score===null?'BLOCKED_MISSING_VERIFIED_INPUTS':'RESEARCH_SCORE_VALIDATED_NO_PUBLIC_AGGREGATION',
  publicScore:null,publicationAuthorized:false});
}
export function evaluateThemeR72Etf(ticker,input){
 req(hasOwn(R66_SEC_IDENTITIES,ticker),'ETF_NOT_IN_APPROVED_RESEARCH_REGISTRY');
 req(input&&isDate(input.observationDate),'OBSERVATION_DATE_INVALID');
 return assess(ticker,input);
}
export function evaluateThemeR72Batch({observationDate,etfInputs={}}={}){
 req(isDate(observationDate)&&etfInputs&&typeof etfInputs==='object'&&!Array.isArray(etfInputs),'BATCH_INPUT_INVALID');
 const unique=[...new Set(R66_THEME_PAIRS.flatMap(x=>x.etfs))];
 const byEtf=Object.fromEntries(unique.map(ticker=>{
  const input=etfInputs[ticker];
  return [ticker,input?evaluateThemeR72Etf(ticker,input):Object.freeze({ticker,observationDate,verifiedFiveAxisResearchScore:null,
   missingRequirements:Object.freeze(['ETF_INPUT_NOT_PROVIDED']),status:'BLOCKED_MISSING_VERIFIED_INPUTS',publicScore:null,publicationAuthorized:false})];
 }));
 for(const ticker of unique)req(byEtf[ticker].observationDate===observationDate,'ETF_DATE_DRIFT_'+ticker);
 const themes=R66_THEME_PAIRS.map(({theme,etfs})=>{
  const items=etfs.map(x=>byEtf[x]),ready=items.every(x=>x.verifiedFiveAxisResearchScore!==null);
  return Object.freeze({theme,etfs,etfResearchScores:Object.freeze(items.map(x=>x.verifiedFiveAxisResearchScore)),
   allEtfsFiveAxesVerified:ready,combinedThemeScore:null,publicScore:null,
   blocker:ready?'ETF_COMBINATION_RULE_NOT_CONFIRMED':'MISSING_VERIFIED_ETF_FIVE_AXIS_INPUTS'});
 });
 return Object.freeze({version:THEME_R72_VERSION,observationDate,etfCount:unique.length,themeCount:themes.length,
  etfResearchFiveAxisReady:unique.filter(t=>byEtf[t].verifiedFiveAxisResearchScore!==null).length,
  themeEtfPairsAllReady:themes.filter(x=>x.allEtfsFiveAxesVerified).length,
  finalizedThemeScores:0,publishedThemeScores:0,publicDisclosureAllowed:false,
  etfs:Object.freeze(byEtf),themes:Object.freeze(themes),status:'OFFLINE_RESEARCH_NO_AUTO_AGGREGATION_OR_PUBLICATION'});
}
